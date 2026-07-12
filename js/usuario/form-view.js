// ============================================================
// FORM-VIEW - Ver y responder exámenes
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando FormView System...');
    
    var _examenFormId = null;
    var _examenIniciado = false;

    window.renderFormView = async function(formId) {
        const container = document.getElementById('formViewContent');
        if (!container) return;
        
        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesión</p>';
            return;
        }
        
        try {
            const form = await window.formsManager.getById(formId);
            if (!form) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                        <h3 class="empty-state-title">Formulario no encontrado</h3>
                        <a href="examenes.html" class="btn-primary mt-4">← Volver</a>
                    </div>
                `;
                return;
            }
            
            _examenFormId = formId;
            _examenIniciado = false;
            
            // Mostrar pantalla previa
            mostrarPantallaPrevia(form, user);
            
        } catch (error) {
            console.error('Error cargando formulario:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3 class="empty-state-title">Error al cargar el formulario</h3>
                    <p class="empty-state-subtitle">Revisa tu conexión e inténtalo de nuevo.</p>
                    <a href="examenes.html" class="btn-primary mt-4">← Volver</a>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };
    
    function mostrarPantallaPrevia(form, user) {
        var container = document.getElementById('formViewContent');
        if (!container) return;
        
        var questions = form.questions || [];
        var config = form.config || {};
        var timeLimit = config.timeLimit || 0;
        var maxAttempts = config.maxAttempts || 1;
        
        container.innerHTML = ''
            + '<div class="exam-pre-screen">'
            + '  <div class="exam-pre-card">'
            + '    <div class="exam-pre-icon"><i data-lucide="clipboard-list"></i></div>'
            + '    <h1 class="exam-pre-title">' + window.escapeHtml(form.title) + '</h1>'
            + '    <div class="exam-pre-status">' + window.renderStatusBadge(form.status || 'publicado') + '</div>'
            + (form.description ? '<p class="exam-pre-desc">' + window.escapeHtml(form.description) + '</p>' : '')
            + '    <div class="exam-pre-info">'
            + '      <div class="exam-pre-info-item"><i data-lucide="file-text"></i><span>' + questions.length + ' preguntas</span></div>'
            + (timeLimit > 0 ? '<div class="exam-pre-info-item"><i data-lucide="timer"></i><span>' + timeLimit + ' minutos</span></div>' : '')
            + (maxAttempts > 1 ? '<div class="exam-pre-info-item"><i data-lucide="refresh-cw"></i><span>' + maxAttempts + ' intentos</span></div>' : '')
            + '      <div class="exam-pre-info-item"><i data-lucide="user"></i><span>' + window.escapeHtml(user.fullName || user.username) + '</span></div>'
            + (config.onePerPage ? '<div class="exam-pre-info-item"><i data-lucide="layout"></i><span>Una pregunta por p\u00e1gina</span></div>' : '')
            + (form.showanswers ? '<div class="exam-pre-info-item"><i data-lucide="book-open"></i><span>Modo Estudio (respuestas visibles)</span></div>' : '')
            + (form.allowmultiple ? '<div class="exam-pre-info-item"><i data-lucide="recycle"></i><span>Permite m\u00faltiples respuestas</span></div>' : '')
            + '    </div>'
            + '    <button onclick="window.iniciarExamen()" class="btn-primary btn-lg btn-full">'
            + '      <i data-lucide="play" class="w-5 h-5"></i>'
            + '      ' + (form.showanswers ? 'Comenzar estudio' : 'Comenzar examen')
            + '    </button>'
            + '    <a href="examenes.html" class="btn-ghost btn-full mt-2">← Volver a ex\u00e1menes</a>'
            + '  </div>'
            + '</div>';
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    window.iniciarExamen = function() {
        _examenIniciado = true;
        mostrarFormularioReal();
    };
    
    function mostrarFormularioReal() {
        var container = document.getElementById('formViewContent');
        if (!container) return;
        
        (async function() {
            var form = await window.formsManager.getById(_examenFormId);
            if (!form) return;
            
            var questions = form.questions || [];
            var isStudyMode = form.showanswers || false;
            
            var html = ''
                + '<div class="form-view-container">'
                + '  <div class="form-view-header">'
                + '    <div class="form-view-header-top">'
                + '      <a href="examenes.html" class="btn-ghost"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver</a>'
                + '    </div>'
                + '    <h1 class="form-view-title">' + window.escapeHtml(form.title) + '</h1>'
                + (form.description ? '<p class="form-view-subtitle">' + window.escapeHtml(form.description) + '</p>' : '')
                + '    <div class="form-view-meta">'
                + '      <span><i data-lucide="list" class="w-4 h-4"></i> ' + questions.length + ' preguntas</span>'
                + (isStudyMode ? '<span class="badge badge-blue"><i data-lucide="book-open" class="w-3 h-3"></i> Modo Estudio</span>' : '')
                + '    </div>'
                + '  </div>'
                + '  <form id="responseForm" onsubmit="submitResponse(event)">'
                + '    <input type="hidden" name="formId" value="' + form.id + '" />'
                + '    <div class="form-view-name-field">'
                + '      <label class="form-view-label">Tu nombre <span class="text-red-500">*</span></label>'
                + '      <input type="text" name="respondent_name" class="form-input" placeholder="Escribe tu nombre completo" required />'
                + '    </div>';
            
            questions.forEach(function(q, index) {
                var num = index + 1;
                var isRequired = q.required ? 'required' : '';
                var name = 'q' + index;
                
                html += ''
                    + '    <div class="form-view-question">'
                    + '      <div class="form-view-question-header">'
                    + '        <span class="form-view-question-number">Pregunta ' + num + '</span>'
                    + (q.required ? '<span class="badge badge-red">Obligatoria</span>' : '')
                    + '        <span class="badge badge-purple">' + (q.type || 'text') + '</span>'
                    + '      </div>'
                    + '      <label class="form-view-label">' + window.escapeHtml(q.title || 'Pregunta sin t\u00edtulo') + (q.required ? ' <span class="text-red-500">*</span>' : '') + '</label>'
                    + window.getQuestionInput(q, name, isRequired, isStudyMode)
                    + (isStudyMode && q.correctAnswer ? '<div class="form-view-hint">Respuesta correcta: ' + window.escapeHtml(q.correctAnswer) + '</div>' : '')
                    + '    </div>';
            });
            
            html += ''
                + '    <div class="form-view-actions">'
                + '      <button type="submit" class="btn-primary btn-full btn-lg">'
                + '        <i data-lucide="send" class="w-5 h-5"></i>'
                + '        ' + (isStudyMode ? 'Ver resultados' : 'Enviar respuestas')
                + '      </button>'
                + '    </div>'
                + '  </form>'
                + '</div>';
            
            container.innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        })();
    }
    
    window.getQuestionInput = function(q, name, isRequired, isStudyMode) {
        switch(q.type) {
            case 'text':
                return `<input name="${name}" class="form-input" placeholder="Escribe tu respuesta..." ${isRequired} />`;
            case 'textarea':
                return `<textarea name="${name}" class="form-input" rows="3" placeholder="Desarrolla tu respuesta..." ${isRequired}></textarea>`;
            case 'number':
                return `<input name="${name}" class="form-input" type="number" placeholder="Número" ${isRequired} />`;
            case 'truefalse':
                return `
                    <div class="tf-options">
                        <label><input type="radio" name="${name}" value="true" ${isRequired} /> Verdadero</label>
                        <label><input type="radio" name="${name}" value="false" ${isRequired} /> Falso</label>
                    </div>
                `;
            case 'radio':
                const opts = q.options || ['Opción A', 'Opción B'];
                return opts.map((opt, i) => `
                    <div class="form-view-option">
                        <input type="radio" name="${name}" value="${i}" ${isRequired} />
                        <span>${window.escapeHtml(opt)}</span>
                    </div>
                `).join('');
            case 'checkbox':
                const checkOpts = q.options || ['Opción A', 'Opción B'];
                return checkOpts.map((opt, i) => `
                    <div class="form-view-option">
                        <input type="checkbox" name="${name}" value="${i}" />
                        <span>${window.escapeHtml(opt)}</span>
                    </div>
                `).join('');
            default:
                return `<input name="${name}" class="form-input" placeholder="Escribe tu respuesta..." ${isRequired} />`;
        }
    }
    
    window.submitResponse = async function(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const formId = formData.get('formId');
        const respondentName = formData.get('respondent_name');

        if (!respondentName || !respondentName.trim()) {
            window.showNotification('Por favor, introduce tu nombre', 'warning');
            return;
        }

        const entries = Array.from(formData.entries());
        const tempMap = {};
        for (const [key, value] of entries) {
            if (key === 'formId' || key === 'respondent_name') continue;
            if (tempMap[key] === undefined) {
                tempMap[key] = value;
            } else {
                if (Array.isArray(tempMap[key])) {
                    tempMap[key].push(value);
                } else {
                    tempMap[key] = [tempMap[key], value];
                }
            }
        }

        const answers = [];
        for (let i = 0; i < 9999; i++) {
            const key = 'q' + i;
            if (!(key in tempMap)) break;
            let v = tempMap[key];
            if (Array.isArray(v)) v = v.join(',');
            answers.push({
                question: key,
                value: v != null ? String(v) : ''
            });
        }
        answers.unshift({
            question: 'respondent_name',
            value: respondentName.trim()
        });

        if (answers.length <= 1) {
            window.showNotification('Responde al menos una pregunta', 'warning');
            return;
        }

        try {
            await window.responsesManager.save(formId, answers);
            mostrarEnviado();
        } catch (error) {
            window.showNotification('No pudimos enviar tu examen. Revisa tu conexión e inténtalo de nuevo.', 'error');
        }
    };

    function mostrarEnviado() {
        var container = document.getElementById('formViewContent');
        if (!container) return;
        
        var user = window.getCurrentUser();
        var now = new Date();
        var fechaStr = now.toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        container.innerHTML = ''
            + '<div class="exam-success-screen">'
            + '  <div class="exam-success-card">'
            + '    <div class="exam-success-icon"><i data-lucide="check-circle"></i></div>'
            + '    <h1 class="exam-success-title">Examen recibido</h1>'
            + '    <p class="exam-success-subtitle">Tu examen se ha enviado correctamente.</p>'
            + '    <div class="exam-success-details">'
            + '      <div class="exam-success-detail"><span class="exam-success-label">Nombre</span><span>' + window.escapeHtml(user ? user.fullName || user.username : '—') + '</span></div>'
            + '      <div class="exam-success-detail"><span class="exam-success-label">Fecha</span><span>' + window.escapeHtml(fechaStr) + '</span></div>'
            + '      <div class="exam-success-detail"><span class="exam-success-label">Estado</span><span class="badge badge-orange"><i data-lucide="hourglass" class="w-3 h-3"></i> Pendiente de correcci\u00f3n</span></div>'
            + '    </div>'
            + '    <p class="exam-success-msg">Espera a que el administrador revise tu examen para ver la nota.</p>'
            + '    <a href="examenes.html" class="btn-primary btn-lg btn-full"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver a ex\u00e1menes</a>'
            + '  </div>'
            + '</div>';
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    console.log('FormView System cargado');

})();