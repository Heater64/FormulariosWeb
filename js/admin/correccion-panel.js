(function() {
    'use strict';

    console.log('Inicializando Panel de Correcci\u00f3n...');

    var state = null;
    var panelEl = null;
    var isDirty = false;
    var autoSaveTimerId = null;
    var qSelectorOpen = false;
    var saveInProgress = false;

    var ESC = window.escapeHtml || function(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    };

    function currentFormattedDate() {
        var d = new Date();
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    window.abrirPanelCorreccion = async function(responseId, formId) {
        try {
            var form = await window.formsManager.getById(formId);
            var responses = await window.responsesManager.getByForm(formId);
            var response = responses.find(function(r) { return r.id === responseId; });
            if (!form || !response) {
                window.showNotification('Error al cargar los datos del examen', 'error');
                return;
            }

            var questions = form.questions || [];
            var nameAnswer = response.answers.find(function(a) { return a.question === 'respondent_name'; });

            var details = questions.map(function(q, i) {
                var answer = response.answers.find(function(a) { return a.question === 'q' + i; });
                return {
                    question: q.title || 'Pregunta ' + (i + 1),
                    userAnswer: answer ? answer.value : '\u2014',
                    correctAnswer: q.correctAnswer || '\u2014',
                    correct: false,
                    comment: ''
                };
            });

            var base = {
                answers: questions.map(function() { return false; }),
                scores: questions.map(function() { return 0; }),
                details: details,
                score: 0,
                total: questions.length,
                comment: '',
                completed: false
            };

            // Cargar correcci\u00f3n existente (incluso si no est\u00e1 completada)
            if (response.correction) {
                base.answers = response.correction.answers || base.answers;
                base.scores = response.correction.scores || base.scores;
                base.score = response.correction.score || base.score;
                base.comment = response.correction.comment || '';
                base.completed = response.correction.completed || false;
                if (response.correction.details) {
                    response.correction.details.forEach(function(d, i) {
                        if (d && base.details[i]) {
                            base.details[i].comment = d.comment || '';
                        }
                    });
                }
            }

            state = {
                responseId: responseId,
                formId: formId,
                form: form,
                response: response,
                questions: questions,
                correction: base,
                displayName: nameAnswer ? nameAnswer.value : 'An\u00f3nimo',
                created_at: response.created_at || '',
                currentIndex: 0,
                autoAdvance: true,
                changesPending: false,
                lastSaved: null,
                lastSaveStatus: ''
            };

            isDirty = false;
            renderPanel();
            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error('Error abriendo panel de correcci\u00f3n:', error);
            window.showNotification('Error al abrir la correcci\u00f3n. Revisa tu conexi\u00f3n e int\u00e9ntalo de nuevo.', 'error');
        }
    };

    function cerrarPanel() {
        if (autoSaveTimerId) { clearInterval(autoSaveTimerId); autoSaveTimerId = null; }
        if (panelEl) {
            document.body.style.overflow = '';
            panelEl.remove();
            panelEl = null;
        }
        state = null;
        isDirty = false;
    }

    function renderPanel() {
        if (panelEl) { panelEl.remove(); }
        document.body.style.overflow = 'hidden';

        panelEl = document.createElement('div');
        panelEl.className = 'panel-overlay';
        panelEl.innerHTML = buildPanelHTML();

        document.body.appendChild(panelEl);

        renderPregunta(state.currentIndex);
        actualizarCabecera();

        var closeBtn = panelEl.querySelector('.panel-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', window.cerrarPanelCorreccion);

        var prevBtn = panelEl.querySelector('.panel-nav-prev');
        if (prevBtn) prevBtn.addEventListener('click', navigatePrev);

        var nextBtn = panelEl.querySelector('.panel-nav-next');
        if (nextBtn) nextBtn.addEventListener('click', navigateNext);

        var selectorToggle = panelEl.querySelector('.panel-q-selector-btn');
        if (selectorToggle) selectorToggle.addEventListener('click', toggleQSelector);

        var autoAdvanceCheck = panelEl.querySelector('.panel-auto-advance-cb');
        if (autoAdvanceCheck) autoAdvanceCheck.addEventListener('change', function(e) {
            state.autoAdvance = e.target.checked;
        });

        var saveBtn = panelEl.querySelector('.panel-save-btn');
        if (saveBtn) {
            if (state.correction.completed) {
                saveBtn.textContent = 'Guardado';
                saveBtn.disabled = true;
            } else {
                saveBtn.addEventListener('click', function() { mostrarResumen(); });
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        // Auto-guardado peri\u00f3dico cada 30s
        autoSaveTimerId = setInterval(function() {
            if (isDirty) { autoGuardar(); }
        }, 30000);
    }

    function buildPanelHTML() {
        var c = state.correction;
        var total = c.total;
        var currentPct = total > 0 ? Math.round((c.score / total) * 100) : 0;
        var currentFmt = total > 0 ? (c.score / total * 10).toFixed(2) : '0.00';

        var dateStr = state.created_at ? (function(d) {
            try { return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); }
            catch(e) { return d; }
        })(state.created_at) : currentFormattedDate();

        return ''
            + '<div class="panel-header">'
            + '  <div class="panel-header-top">'
            + '    <div class="panel-exam-name">'
            + '      <i data-lucide="edit-3" class="w-5 h-5"></i>'
            + '      ' + ESC(state.form.title || 'Examen')
            + '    </div>'
            + '    <button class="panel-close-btn" aria-label="Cerrar correcci\u00f3n" title="Cerrar (Esc)">'
            + '      <i data-lucide="x" class="w-5 h-5"></i>'
            + '    </button>'
            + '  </div>'
            + '  <div class="panel-header-info">'
            + '    <span>Alumno: <strong>' + ESC(state.displayName) + '</strong></span>'
            + '    <span>Fecha: <strong>' + ESC(dateStr) + '</strong></span>'
            + '    <span id="panelCorrStatus"></span>'
            + '  </div>'
            + '  <div class="panel-header-stats">'
            + '    <span class="panel-q-counter">Pregunta <strong id="panelCurrentQ">1</strong> de <strong>' + total + '</strong></span>'
            + '    <span class="panel-score-display">Nota provisional: <strong id="panelScoreDisplay">' + currentFmt + '</strong></span>'
            + '    <div class="panel-progress-bar">'
            + '      <div class="panel-progress-fill" id="panelProgressFill" style="width:' + (total > 0 ? (c.score / total * 100) : 0) + '%"></div>'
            + '    </div>'
            + '    <span class="panel-header-progress-info" id="panelProgressInfo">'
            + '      <strong id="panelCorrectasCount">' + c.answers.filter(function(a) { return a; }).length + '</strong> correctas'
            + '      \u00b7 <strong id="panelRestantesCount">' + (total - c.answers.filter(function(a) { return a !== undefined; }).length) + '</strong> restantes'
            + '    </span>'
            + '  </div>'
            + '</div>'
            + '<div class="panel-body">'
            + '  <div class="panel-body-inner" id="panelBodyInner"></div>'
            + '</div>'
            + '<div class="panel-bottom-bar">'
            + '  <button class="panel-nav-btn panel-nav-prev" aria-label="Pregunta anterior">'
            + '    <i data-lucide="chevron-left" class="w-4 h-4"></i>'
            + '    <span>Anterior</span>'
            + '  </button>'
            + '  <div class="panel-q-selector-wrapper">'
            + '    <button class="panel-q-selector-btn" aria-label="Selector de preguntas">'
            + '      <i data-lucide="grid-3x3" class="w-4 h-4"></i>'
            + '      <span id="panelQSelectorLabel">1/' + total + '</span>'
            + '    </button>'
            + '    <div class="panel-q-selector-grid" id="panelQSelectorGrid"></div>'
            + '  </div>'
            + '  <button class="panel-nav-btn panel-nav-next" aria-label="Siguiente pregunta">'
            + '    <span>Siguiente</span>'
            + '    <i data-lucide="chevron-right" class="w-4 h-4"></i>'
            + '  </button>'
            + '  <div class="panel-bottom-spacer"></div>'
            + '  <label class="panel-auto-advance">'
            + '    <input type="checkbox" class="panel-auto-advance-cb" checked />'
            + '    <span>Auto</span>'
            + '  </label>'
            + '  <div class="panel-save-indicator" id="panelSaveIndicator"></div>'
            + '  <button class="panel-save-btn btn-primary" id="panelSaveBtn">Finalizar correcci\u00f3n</button>'
            + '</div>';
    }

    function renderPregunta(index) {
        if (!panelEl || !state) return;
        var container = panelEl.querySelector('#panelBodyInner');
        if (!container) return;

        var q = state.questions[index];
        if (!q) return;

        var d = state.correction.details[index] || {};
        var isCorrect = state.correction.answers[index] === true;
        var isIncorrect = state.correction.answers[index] === false;
        var scoreVal = state.correction.scores[index] !== undefined ? state.correction.scores[index] : 0;

        var statusHtml = isCorrect
            ? '<span class="panel-q-status-badge correcta"><i data-lucide="check-circle" class="w-4 h-4"></i> Correcta</span>'
            : (isIncorrect
                ? '<span class="panel-q-status-badge incorrecta"><i data-lucide="x-circle" class="w-4 h-4"></i> Incorrecta</span>'
                : '<span class="panel-q-status-badge pendiente"><i data-lucide="circle" class="w-4 h-4"></i> Pendiente</span>');

        var mediaHtml = '';
        if (q.image) {
            mediaHtml += '<img src="' + ESC(q.image) + '" alt="Imagen de la pregunta" class="panel-q-image" onclick="window.open(\'' + ESC(q.image) + '\',\'_blank\')" />';
        }
        if (q.files && q.files.length) {
            q.files.forEach(function(f) {
                mediaHtml += '<a href="' + ESC(f.url || f) + '" target="_blank" class="panel-q-file"><i data-lucide="paperclip" class="w-4 h-4"></i> ' + ESC(f.name || 'Archivo') + '</a>';
            });
        }

        // Respuesta del alumno
        var userAnswer = d.userAnswer || '\u2014';
        var answerContent = ESC(String(userAnswer));
        var isLong = String(userAnswer).length > 200;
        var longClass = isLong ? ' collapsible' : '';

        // Respuesta correcta
        var correctAnswer = q.correctAnswer || d.correctAnswer || '';
        var correctHtml = correctAnswer && correctAnswer !== '\u2014' ? ''
            + '<div class="panel-correct-answer">'
            + '  <div class="panel-answer-header"><i data-lucide="check-circle" class="w-4 h-4"></i> Respuesta esperada</div>'
            + '  <div class="panel-answer-content">' + ESC(correctAnswer) + '</div>'
            + '</div>' : '';

        container.innerHTML = ''
            + '<div class="panel-question-card">'
            + '  <div class="panel-q-header">'
            + '    <span class="panel-q-number">Pregunta ' + (index + 1) + '</span>'
            + '    <span class="panel-q-badge">' + (q.type || 'texto') + '</span>'
            + '    ' + statusHtml
            + '  </div>'
            + '  <div class="panel-q-text">' + ESC(q.title || 'Pregunta sin t\u00edtulo') + '</div>'
            + (q.description ? '<div class="panel-q-text" style="padding-top:0;font-size:14px;color:var(--text-soft);font-weight:400">' + ESC(q.description) + '</div>' : '')
            + (mediaHtml ? '<div class="panel-q-media">' + mediaHtml + '</div>' : '')
            + '  <div class="panel-student-answer">'
            + '    <div class="panel-answer-header"><i data-lucide="user" class="w-4 h-4"></i> Respuesta del alumno</div>'
            + '    <div class="panel-answer-content' + longClass + '" id="panelAnswerContent">' + answerContent + '</div>'
            + (isLong ? '<button class="panel-answer-expand" onclick="this.previousElementSibling.classList.toggle(\'collapsible\');this.textContent=this.previousElementSibling.classList.contains(\'collapsible\')?\'(Ver completo)\':\'(Mostrar menos)\'">(Ver completo)</button>' : '')
            + '  </div>'
            + correctHtml
            + '  <div class="panel-correction-actions" id="panelCorrActions">'
            + '    <button class="btn-correct' + (isCorrect ? ' active' : '') + '" id="btnCorrect" aria-label="Marcar como correcta">'
            + '      <i data-lucide="check-circle"></i> Correcta'
            + '    </button>'
            + '    <button class="btn-incorrect' + (isIncorrect ? ' active' : '') + '" id="btnIncorrect" aria-label="Marcar como incorrecta">'
            + '      <i data-lucide="x-circle"></i> Incorrecta'
            + '    </button>'
            + '  </div>'
            + '  <div class="panel-score">'
            + '    <span class="panel-score-label">Puntuaci\u00f3n</span>'
            + '    <span class="panel-score-value" id="panelScoreValue">' + scoreVal.toFixed(1) + '</span>'
            + '    <span class="panel-score-max">/ 1.0</span>'
            + '    <div class="panel-score-input">'
            + '      <input type="number" id="panelScoreInput" min="0" max="1" step="0.1" value="' + scoreVal.toFixed(1) + '" aria-label="Puntuaci\u00f3n manual" />'
            + '    </div>'
            + '  </div>'
            + '  <div class="panel-comment' + (d.comment ? ' panel-comment-has-content' : '') + '">'
            + '    <textarea id="panelCommentInput" placeholder="Comentario del profesor (opcional)" rows="2">' + ESC(d.comment || '') + '</textarea>'
            + '  </div>'
            + '</div>';

        // Event listeners para esta pregunta
        var btnCorrect = container.querySelector('#btnCorrect');
        var btnIncorrect = container.querySelector('#btnIncorrect');
        if (btnCorrect) btnCorrect.addEventListener('click', handleCorrectClick);
        if (btnIncorrect) btnIncorrect.addEventListener('click', handleIncorrectClick);

        var scoreInput = container.querySelector('#panelScoreInput');
        if (scoreInput) {
            scoreInput.addEventListener('change', function(e) {
                var val = parseFloat(e.target.value);
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                if (val > 1) val = 1;
                e.target.value = val.toFixed(1);
                handleScoreChange(state.currentIndex, val);
            });
            scoreInput.addEventListener('focus', function() { this.select(); });
        }

        var commentInput = container.querySelector('#panelCommentInput');
        if (commentInput) {
            commentInput.addEventListener('input', function(e) {
                handleCommentChange(state.currentIndex, e.target.value);
            });
        }

        // Focus primer bot\u00f3n para teclado
        setTimeout(function() {
            if (btnCorrect) btnCorrect.focus();
        }, 100);

        actualizarCabecera();
        actualizarSelector();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function renderSummary() {
        if (!panelEl || !state) return;
        var container = panelEl.querySelector('#panelBodyInner');
        if (!container) return;

        var c = state.correction;
        var total = c.total;
        // Recolectar estado actual
        var answers = [];
        var totalScore = 0;
        state.questions.forEach(function(q, i) {
            var ans = state.correction.answers[i] || false;
            var scr = state.correction.scores[i] || 0;
            answers[i] = ans;
            totalScore += scr;
        });
        state.correction.answers = answers;
        state.correction.score = totalScore;

        var correctas = answers.filter(function(a) { return a; }).length;
        var incorrectas = total - correctas;
        var pct = total > 0 ? (totalScore / total * 100) : 0;
        var notaFinal = total > 0 ? (totalScore / total * 10) : 0;
        var notaColor = notaFinal >= 5 ? '#10B981' : '#EF4444';

        var questionsHtml = state.questions.map(function(q, i) {
            var ans = state.correction.answers[i] || false;
            var scr = state.correction.scores[i] || 0;
            return '<div class="summary-q-item ' + (ans ? 'correcta' : 'incorrecta') + '">'
                + '<span class="q-status-icon">' + (ans ? '\u2705' : '\u274c') + '</span>'
                + '<span class="q-num">' + (i + 1) + '.</span>'
                + '<span class="q-text">' + ESC(q.title || '') + '</span>'
                + '<span class="q-score">' + scr.toFixed(1) + '/1.0</span>'
                + '</div>';
        }).join('');

        container.innerHTML = ''
            + '<div class="panel-summary">'
            + '  <div class="panel-summary-header">'
            + '    <div class="panel-summary-icon">\u2705</div>'
            + '    <h2 class="panel-summary-title">Correcci\u00f3n completada</h2>'
            + '    <p class="panel-summary-subtitle">Revisa el resumen antes de guardar definitivamente</p>'
            + '  </div>'
            + '  <div class="panel-summary-body">'
            + '    <div class="panel-summary-info">'
            + '      <div class="summary-info-item"><span class="label">Alumno</span><span class="value">' + ESC(state.displayName) + '</span></div>'
            + '      <div class="summary-info-item"><span class="label">Examen</span><span class="value">' + ESC(state.form.title || '') + '</span></div>'
            + '      <div class="summary-info-item"><span class="label">Fecha</span><span class="value">' + currentFormattedDate() + '</span></div>'
            + '    </div>'
            + '    <div class="panel-summary-stats">'
            + '      <div class="summary-stat-card"><div class="number green">' + correctas + '</div><div class="label">Correctas</div></div>'
            + '      <div class="summary-stat-card"><div class="number red">' + incorrectas + '</div><div class="label">Incorrectas</div></div>'
            + '      <div class="summary-stat-card"><div class="number primary">' + totalScore.toFixed(1) + '</div><div class="label">Puntuaci\u00f3n</div></div>'
            + '      <div class="summary-stat-card"><div class="number gray">' + total + '</div><div class="label">Total preguntas</div></div>'
            + '    </div>'
            + '    <div class="panel-summary-note">'
            + '      <div class="nota-final" style="color:' + notaColor + '">' + notaFinal.toFixed(2) + '</div>'
            + '      <div class="nota-label">Nota final sobre 10</div>'
            + '      <div class="nota-porcentaje">' + pct.toFixed(1) + '% de aciertos</div>'
            + '    </div>'
            + '    <div class="panel-summary-questions">'
            + '      <div class="summary-questions-header" onclick="this.nextElementSibling.classList.toggle(\'hidden\')">'
            + '        <span>Detalle por pregunta</span>'
            + '        <i data-lucide="chevron-down" class="w-4 h-4"></i>'
            + '      </div>'
            + '      <div class="summary-questions-list hidden" id="summaryQList">' + questionsHtml + '</div>'
            + '    </div>'
            + '    <div class="panel-summary-comment">'
            + '      <label for="summaryGeneralComment">Comentario general (opcional)</label>'
            + '      <textarea id="summaryGeneralComment" placeholder="Escribe un comentario general sobre este examen...">' + ESC(state.correction.comment || '') + '</textarea>'
            + '    </div>'
            + '    <div class="panel-summary-actions">'
            + '      <button class="btn-primary" id="summarySaveBtn"><i data-lucide="save" class="w-4 h-4"></i> Guardar correcci\u00f3n</button>'
            + '      <button class="btn-secondary" id="summaryEditBtn"><i data-lucide="edit-3" class="w-4 h-4"></i> Seguir editando</button>'
            + '      <button class="btn-ghost" id="summaryCancelBtn">Cancelar</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';

        var saveBtn = container.querySelector('#summarySaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', confirmarGuardar);

        var editBtn = container.querySelector('#summaryEditBtn');
        if (editBtn) editBtn.addEventListener('click', function() { renderPregunta(state.currentIndex); });

        var cancelBtn = container.querySelector('#summaryCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', window.cerrarPanelCorreccion);

        var genComment = container.querySelector('#summaryGeneralComment');
        if (genComment) {
            genComment.addEventListener('input', function(e) {
                state.correction.comment = e.target.value;
                markDirty();
            });
        }

        // Ocultar bot\u00f3n "Finalizar" y cambiar save indicator
        var saveBtn2 = panelEl.querySelector('.panel-save-btn');
        if (saveBtn2) saveBtn2.style.display = 'none';
        setAutoSaveStatus('', '');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function actualizarCabecera() {
        if (!panelEl || !state) return;
        var c = state.correction;
        var total = c.total;
        var current = state.currentIndex;

        var currentQ = panelEl.querySelector('#panelCurrentQ');
        if (currentQ) currentQ.textContent = current + 1;

        var scoreVal = 0;
        state.questions.forEach(function(q, i) {
            scoreVal += (c.scores[i] || 0);
        });
        c.score = scoreVal;

        var pct = total > 0 ? (c.score / total * 100) : 0;
        var notaFmt = total > 0 ? (c.score / total * 10).toFixed(2) : '0.00';

        var scoreDisplay = panelEl.querySelector('#panelScoreDisplay');
        if (scoreDisplay) scoreDisplay.textContent = notaFmt;

        var fill = panelEl.querySelector('#panelProgressFill');
        if (fill) {
            fill.style.width = pct + '%';
            fill.classList.toggle('complete', pct >= 100);
        }

        var correctas = c.answers.filter(function(a) { return a; }).length;
        var restantes = total - correctas;
        var info = panelEl.querySelector('#panelProgressInfo');
        if (info) {
            info.innerHTML = '<strong>' + correctas + '</strong> correctas \u00b7 <strong>' + restantes + '</strong> restantes';
        }

        var label = panelEl.querySelector('#panelQSelectorLabel');
        if (label) label.textContent = (current + 1) + '/' + total;

        // Estado (corregido o no)
        var statusEl = panelEl.querySelector('#panelCorrStatus');
        if (statusEl) {
            var allDone = c.answers.every(function(a) { return a !== undefined; });
            statusEl.innerHTML = allDone
                ? '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Completo</span>'
                : '<span class="badge badge-orange"><i data-lucide="clock" class="w-3 h-3"></i> En correcci\u00f3n</span>';
        }
    }

    function actualizarSelector() {
        var grid = panelEl && panelEl.querySelector('#panelQSelectorGrid');
        if (!grid || !state) return;
        grid.innerHTML = state.questions.map(function(q, i) {
            var ans = state.correction.answers[i];
            var statusClass = ans === true ? 'correcta' : (ans === false ? 'incorrecta' : 'pendiente');
            var currentClass = i === state.currentIndex ? ' current' : '';
            return '<button class="panel-q-dot ' + statusClass + currentClass + '" data-q="' + i + '" aria-label="Ir a pregunta ' + (i + 1) + '">' + (i + 1) + '</button>';
        }).join('');

        Array.from(grid.querySelectorAll('.panel-q-dot')).forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(this.getAttribute('data-q'));
                selectQ(idx);
            });
        });
    }

    function navigatePrev() {
        if (state.currentIndex > 0) {
            selectQ(state.currentIndex - 1);
        }
    }

    function navigateNext() {
        if (state.currentIndex < state.questions.length - 1) {
            selectQ(state.currentIndex + 1);
        } else {
            // Todas las preguntas vistas, ir al resumen
            mostrarResumen();
        }
    }

    function selectQ(index) {
        if (index === state.currentIndex) return;
        state.currentIndex = index;
        renderPregunta(index);
        cerrarSelector();
    }

    function toggleQSelector() {
        var grid = panelEl && panelEl.querySelector('#panelQSelectorGrid');
        if (!grid) return;
        qSelectorOpen = !qSelectorOpen;
        grid.classList.toggle('open', qSelectorOpen);
        actualizarSelector();
    }

    function cerrarSelector() {
        var grid = panelEl && panelEl.querySelector('#panelQSelectorGrid');
        if (grid) { grid.classList.remove('open'); qSelectorOpen = false; }
    }

    function handleCorrectClick() {
        var i = state.currentIndex;
        state.correction.answers[i] = true;
        state.correction.scores[i] = 1.0;
        updateQuestionUI(i, true, false);
        markDirty();
        if (state.autoAdvance) { setTimeout(navigateNext, 200); }
    }

    function handleIncorrectClick() {
        var i = state.currentIndex;
        state.correction.answers[i] = false;
        state.correction.scores[i] = 0;
        updateQuestionUI(i, false, true);
        markDirty();
        if (state.autoAdvance) { setTimeout(navigateNext, 200); }
    }

    function handleScoreChange(i, val) {
        state.correction.scores[i] = val;
        if (val > 0) {
            state.correction.answers[i] = true;
        } else {
            state.correction.answers[i] = false;
        }
        updateQuestionUI(i, state.correction.answers[i], !state.correction.answers[i]);
        markDirty();
    }

    function handleCommentChange(i, text) {
        if (state.correction.details[i]) {
            state.correction.details[i].comment = text;
        }
        markDirty();
    }

    function updateQuestionUI(i, isCorrect, isIncorrect) {
        // Actualizar botones
        var container = panelEl && panelEl.querySelector('#panelBodyInner');
        if (container) {
            var btnC = container.querySelector('#btnCorrect');
            var btnI = container.querySelector('#btnIncorrect');
            if (btnC) btnC.classList.toggle('active', isCorrect);
            if (btnI) btnI.classList.toggle('active', isIncorrect);

            var scoreValEl = container.querySelector('#panelScoreValue');
            var scoreInpEl = container.querySelector('#panelScoreInput');
            var scoreVal = state.correction.scores[i] || 0;
            if (scoreValEl) scoreValEl.textContent = scoreVal.toFixed(1);
            if (scoreInpEl) scoreInpEl.value = scoreVal.toFixed(1);

            // Actualizar badge de estado en cabecera de tarjeta
            var badgeEl = container.querySelector('.panel-q-status-badge');
            if (badgeEl) {
                var html = isCorrect
                    ? '<i data-lucide="check-circle" class="w-4 h-4"></i> Correcta'
                    : (isIncorrect ? '<i data-lucide="x-circle" class="w-4 h-4"></i> Incorrecta' : '<i data-lucide="circle" class="w-4 h-4"></i> Pendiente');
                badgeEl.className = 'panel-q-status-badge ' + (isCorrect ? 'correcta' : (isIncorrect ? 'incorrecta' : 'pendiente'));
                badgeEl.innerHTML = html;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
        actualizarCabecera();
        actualizarSelector();
    }

    function markDirty() {
        isDirty = true;
        state.changesPending = true;
        setAutoSaveStatus('saving', 'Guardando...');
        // Auto-guardar con debounce de 1s
        if (autoSaveTimerId) { clearTimeout(autoSaveTimerId); }
        autoSaveTimerId = setTimeout(function() {
            autoGuardar();
        }, 1000);
    }

    function setAutoSaveStatus(cls, msg) {
        var ind = panelEl && panelEl.querySelector('#panelSaveIndicator');
        if (ind) {
            ind.className = 'panel-save-indicator' + (cls ? ' ' + cls : '');
            ind.innerHTML = msg || '';
        }
    }

    async function autoGuardar() {
        if (!state || !isDirty || saveInProgress) return;
        saveInProgress = true;

        try {
            setAutoSaveStatus('saving', 'Guardando...');
            await guardarCorreccionEnBd(false);
            isDirty = false;
            state.changesPending = false;
            setAutoSaveStatus('saved', '\u2713 Cambios guardados');
        } catch (e) {
            console.error('Error en autoguardado:', e);
            setAutoSaveStatus('error', 'Error al guardar');
        } finally {
            saveInProgress = false;
        }
    }

    async function guardarCorreccionEnBd(completed) {
        var c = state.correction;
        // Actualizar arrays
        var answers = [];
        var scores = [];
        var totalScore = 0;
        state.questions.forEach(function(q, i) {
            var ans = c.answers[i] || false;
            var scr = c.scores[i] || 0;
            answers[i] = ans;
            scores[i] = scr;
            totalScore += scr;
        });
        c.answers = answers;
        c.scores = scores;
        c.score = totalScore;
        c.completed = completed || false;

        // Asegurar que los detalles tengan comentarios actualizados
        c.details = state.questions.map(function(q, i) {
            var d = c.details[i] || {};
            return {
                question: q.title || 'Pregunta ' + (i + 1),
                userAnswer: d.userAnswer || '\u2014',
                correctAnswer: q.correctAnswer || d.correctAnswer || '\u2014',
                correct: c.answers[i] || false,
                comment: d.comment || ''
            };
        });

        await window.responsesManager.correct(state.responseId, JSON.parse(JSON.stringify(c)));
        state.lastSaved = new Date();
    }

    function mostrarResumen() {
        renderSummary();
    }

    async function confirmarGuardar() {
        if (!state) return;

        var saveBtn = panelEl && panelEl.querySelector('#summarySaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4"></i> Guardando...';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        try {
            await guardarCorreccionEnBd(true);
            window.showNotification('Correcci\u00f3n guardada correctamente', 'success');
            cerrarPanel();
            if (typeof window.renderResponses === 'function') {
                window.renderResponses(state.formId);
            }
        } catch (error) {
            console.error('Error guardando correcci\u00f3n:', error);
            window.showNotification('Error al guardar la correcci\u00f3n. Revisa tu conexi\u00f3n e int\u00e9ntalo de nuevo.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Guardar correcci\u00f3n';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    }

    function handleKeyDown(e) {
        if (!panelEl || !state) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === 'Escape') {
            e.preventDefault();
            window.cerrarPanelCorreccion();
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigatePrev();
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            var isSummary = panelEl.querySelector('#summarySaveBtn') !== null;
            if (isSummary) return;
            navigateNext();
            return;
        }

        // Ctrl+S = guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            autoGuardar();
            return;
        }

        // 1-9: ir a pregunta
        var num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= state.questions.length) {
            e.preventDefault();
            selectQ(num - 1);
        }
    }

    window.cerrarPanelCorreccion = function() {
        if (isDirty) {
            window.showConfirmDialog(
                'Cambios sin guardar',
                'Tienes cambios sin guardar. \u00bfSeguro que quieres salir?',
                'Salir sin guardar',
                'Cancelar',
                function() { cerrarPanel(); },
                function() {}
            );
        } else {
            cerrarPanel();
        }
    };

    document.addEventListener('click', function(e) {
        if (qSelectorOpen && panelEl) {
            var wrapper = panelEl.querySelector('.panel-q-selector-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                cerrarSelector();
            }
        }
    });

    // Prevenir cierre de pesta\u00f1a con cambios sin guardar
    window.addEventListener('beforeunload', function(e) {
        if (state && isDirty) {
            e.preventDefault();
            e.returnValue = 'Tienes cambios sin guardar en la correcci\u00f3n.';
            return e.returnValue;
        }
    });

    console.log('Panel de Correcci\u00f3n cargado');

})();
