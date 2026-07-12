// ============================================================
// EDITOR - Editor de exámenes
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando Editor System...');
    
    window.editingId = null;
    window.tempQuestions = [];
    
    // ============================================================
    // RENDER EDITOR
    // ============================================================
    
    window.renderEditor = async function() {
        const user = window.getCurrentUser();
        if (!user || !window.isEditor()) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        
        if (id) {
            window.editingId = id;
            document.getElementById('editorTitle').innerHTML = '<i data-lucide="pencil" class="w-6 h-6"></i> Editar Examen';
            
            try {
                const form = await window.formsManager.getById(id);
                if (form) {
                    document.getElementById('formTitle').value = form.title || '';
                    window.tempQuestions = JSON.parse(JSON.stringify(form.questions || []));
                    document.getElementById('allowMultiple').checked = form.allowmultiple || false;
                    document.getElementById('showAnswers').checked = form.showanswers || false;
                    toggleSwitch('allowMultipleToggle', form.allowmultiple || false);
                    toggleSwitch('showAnswersToggle', form.showanswers || false);
                } else {
                    window.showNotification('Examen no encontrado', 'warning');
                    window.location.href = 'dashboard.html';
                    return;
                }
            } catch (error) {
                console.error('Error cargando examen:', error);
                window.showNotification('Error al cargar el examen', 'error');
                window.location.href = 'dashboard.html';
                return;
            }
        } else {
            window.editingId = null;
            document.getElementById('editorTitle').innerHTML = '<i data-lucide="pen-line" class="w-6 h-6"></i> Nuevo Examen';
            document.getElementById('formTitle').value = 'Mi examen';
            window.tempQuestions = [];
            document.getElementById('allowMultiple').checked = false;
            document.getElementById('showAnswers').checked = false;
            toggleSwitch('allowMultipleToggle', false);
            toggleSwitch('showAnswersToggle', false);
            
            // Recuperación de borrador (solo para nuevo examen)
            recuperarBorrador();
        }
        
        window.renderQuestions();
        initConfigToggles();

        // Cargar evaluaciones y seleccionar la actual
        const evalSelect = document.getElementById('evaluationSelect');
        if (evalSelect) {
            const sb = window.supabaseClient;
            if (sb && user.clase_id) {
                sb.from('evaluations').select('id, nombre').eq('clase_id', user.clase_id).order('created_at', { ascending: false })
                    .then(function(resp) {
                        if (resp.data) {
                            resp.data.forEach(function(ev) {
                                var opt = document.createElement('option');
                                opt.value = ev.id;
                                opt.textContent = ev.nombre;
                                evalSelect.appendChild(opt);
                            });
                        }
                    });
            }
            // Si editamos, seleccionar la evaluación actual
            if (window.editingId) {
                (async function() {
                    var form = await window.formsManager.getById(window.editingId);
                    if (form) {
                        if (form.evaluation_id) evalSelect.value = form.evaluation_id;
                        var typeSelect = document.getElementById('examTypeSelect');
                        if (typeSelect && form.exam_type) typeSelect.value = form.exam_type;
                    }
                })();
            }
        }
        
        // Renderizar badge de estado
        renderStatusBadgeExamen();
        
        document.title = window.editingId ? 'Editar Examen' : 'Nuevo Examen';
    };
    
    function renderStatusBadgeExamen() {
        var container = document.getElementById('editorStatusBadge');
        if (!container) return;
        if (!window.editingId) {
            container.innerHTML = window.renderStatusBadge('borrador');
            return;
        }
        (async function() {
            var form = await window.formsManager.getById(window.editingId);
            if (form) {
                container.innerHTML = window.renderStatusBadge(form.status || 'borrador');
            }
        })();
    }
    
    function toggleSwitch(id, active) {
        const el = document.getElementById(id);
        if (el) {
            if (active) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    }

    // Sincronizar el estado visual de los interruptores del modal de configuración
    function initConfigToggles() {
        document.querySelectorAll('.modal-toggle-container').forEach(container => {
            const checkbox = container.querySelector('input[type="checkbox"]');
            const switchEl = container.querySelector('.toggle-switch');
            if (!checkbox || !switchEl) return;
            const sync = () => switchEl.classList.toggle('active', checkbox.checked);
            sync();
            // El <label> ya alterna el checkbox nativamente; solo sincronizamos el visual
            checkbox.addEventListener('change', sync);
        });
    }
    
    // ============================================================
    // RENDER PREGUNTAS
    // ============================================================
    
    window.renderQuestions = function() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        
        const questions = window.tempQuestions || [];
        const counter = document.getElementById('questionCounter');
        if (counter) counter.textContent = `${questions.length} preguntas`;
        
        if (questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div>
                    <h3 class="empty-state-title">No hay preguntas</h3>
                    <p class="empty-state-subtitle">Añade tu primera pregunta usando la barra de herramientas</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        questions.forEach((q, index) => {
            const num = index + 1;
            const typeLabels = {
                text: 'Completar',
                textarea: 'Respuesta abierta',
                radio: 'Opción única',
                checkbox: 'Varias opciones',
                truefalse: 'Verdadero/Falso',
                match: 'Relacionar',
                order: 'Ordenar',
                identify: 'Identificar',
                number: 'Número',
                image: 'Imagen'
            };
            
            html += `
                <div class="question-card" data-index="${index}">
                    <div class="question-card-header">
                        <span class="question-drag-handle"><i data-lucide="grip-vertical" class="w-5 h-5"></i></span>
                        <span class="question-number">${num}.</span>
                        <div class="question-content">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="badge badge-purple">${typeLabels[q.type] || q.type || 'text'}</span>
                                ${q.title ? '<span class="text-xs text-green-500"><i data-lucide="check-circle" class="w-4 h-4"></i></span>' : '<span class="text-xs text-red-400"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Sin título</span>'}
                            </div>
                            <input class="question-title-input" value="${window.escapeHtml(q.title || '')}" 
                                   placeholder="Escribe la pregunta..." 
                                   oninput="window.updateQuestionTitle(${index}, this.value)" />
                            <div class="question-preview">${getQuestionPreview(q, index)}</div>
                        </div>
                        <div class="question-controls">
                            <button onclick="window.removeQuestion(${index})" class="btn-danger btn-sm" title="Eliminar pregunta">
                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            if (typeof window.initDragDrop === 'function') {
                window.initDragDrop();
            }
        }, 100);
    };
    
    function getQuestionPreview(q, index) {
        switch(q.type) {
            case 'text':
                return `<input class="form-input bg-gray-50" placeholder="Escribe tu respuesta..." disabled />`;
            case 'textarea':
                return `<textarea class="form-input bg-gray-50" rows="3" placeholder="Desarrolla tu respuesta..." disabled></textarea>`;
            case 'number':
                return `<input class="form-input bg-gray-50" type="number" placeholder="Número" disabled />`;
            case 'truefalse':
                return `
                    <div class="flex gap-4 mt-2">
                        <label><input type="radio" disabled /> Verdadero</label>
                        <label><input type="radio" disabled /> Falso</label>
                    </div>
                `;
            case 'radio':
                const opts = q.options || ['Opción A', 'Opción B'];
                return opts.map((opt, i) => `
                    <div class="question-option">
                        <input type="radio" disabled />
                        <input type="text" value="${window.escapeHtml(opt)}" 
                               onchange="window.updateOption(${index}, ${i}, this.value)" />
                        <button onclick="window.removeOption(${index}, ${i})" class="remove-btn"><i data-lucide="x" class="w-3 h-3"></i></button>
                    </div>
                `).join('');
            case 'checkbox':
                const checkOpts = q.options || ['Opción A', 'Opción B'];
                return checkOpts.map((opt, i) => `
                    <div class="question-option">
                        <input type="checkbox" disabled />
                        <input type="text" value="${window.escapeHtml(opt)}" 
                               onchange="window.updateOption(${index}, ${i}, this.value)" />
                        <button onclick="window.removeOption(${index}, ${i})" class="remove-btn"><i data-lucide="x" class="w-3 h-3"></i></button>
                    </div>
                `).join('');
            default:
                return `<input class="form-input bg-gray-50" placeholder="Respuesta" disabled />`;
        }
    }
    
    // ============================================================
    // FUNCIONES DE PREGUNTAS
    // ============================================================
    
    window.addQuestion = function(type) {
        const newQ = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            type: type || 'text',
            title: '',
            required: false
        };
        
        if (type === 'radio' || type === 'checkbox') {
            newQ.options = ['Opción A', 'Opción B'];
        }
        if (type === 'truefalse') {
            newQ.correctAnswer = 'true';
        }
        if (type === 'match') {
            newQ.leftItems = ['Elemento 1', 'Elemento 2'];
            newQ.rightItems = ['Correspondencia 1', 'Correspondencia 2'];
            newQ.matchPairs = '0-0,1-1';
        }
        if (type === 'order') {
            newQ.orderItems = ['Evento 1', 'Evento 2', 'Evento 3'];
            newQ.correctOrder = '0,1,2';
        }
        if (type === 'identify') {
            newQ.clues = 'Escribe pistas sobre el personaje...';
            newQ.correctAnswer = '';
        }
        if (type === 'image') {
            newQ.imageUrl = '';
            newQ.correctAnswer = '';
        }
        
        window.tempQuestions.push(newQ);
        window.renderQuestions();
        if (typeof window.onFormChange === 'function') {
            window.onFormChange();
        }
    };
    
    window.updateQuestionTitle = function(index, value) {
        if (window.tempQuestions && window.tempQuestions[index]) {
            window.tempQuestions[index].title = value;
            if (typeof window.onFormChange === 'function') {
                window.onFormChange();
            }
        }
    };
    
    window.updateOption = function(qIndex, optIndex, value) {
        if (window.tempQuestions && window.tempQuestions[qIndex]?.options) {
            window.tempQuestions[qIndex].options[optIndex] = value;
            if (typeof window.onFormChange === 'function') {
                window.onFormChange();
            }
        }
    };
    
    window.removeOption = function(qIndex, optIndex) {
        if (window.tempQuestions && window.tempQuestions[qIndex]?.options) {
            window.tempQuestions[qIndex].options.splice(optIndex, 1);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') {
                window.onFormChange();
            }
        }
    };
    
    window.removeQuestion = function(index) {
        if (window.tempQuestions && window.tempQuestions[index]) {
            const title = window.tempQuestions[index].title || 'Pregunta sin título';
            const truncatedTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;
            
            window.showConfirmDialog(
                'Eliminar pregunta',
                `¿Estás seguro de que quieres eliminar la pregunta "<strong>${window.escapeHtml(truncatedTitle)}</strong>"?<br><br>Esta acción no se puede deshacer.`,
                'Eliminar',
                'Cancelar',
                function() {
                    window.tempQuestions.splice(index, 1);
                    window.renderQuestions();
                    if (typeof window.onFormChange === 'function') {
                        window.onFormChange();
                    }
                    window.showNotification('Pregunta eliminada', 'success', 1500);
                }
            );
        }
    };
    
    // ============================================================
    // GUARDAR FORMULARIO
    // ============================================================
    
    window.saveForm = async function(status, showNotification = true) {
        const title = document.getElementById('formTitle').value.trim();
        if (!title) {
            window.showNotification('Por favor, escribe un título', 'warning');
            document.getElementById('formTitle').focus();
            return;
        }
        
        if (window.tempQuestions.length === 0) {
            window.showNotification('Añade al menos una pregunta', 'warning');
            return;
        }
        
        // Verificar que las preguntas tienen título
        const emptyTitles = window.tempQuestions.filter(q => !q.title?.trim());
        if (emptyTitles.length > 0) {
            window.showNotification('Todas las preguntas deben tener título', 'warning');
            return;
        }
        
        try {
            const allowMultiple = document.getElementById('allowMultiple').checked;
            const showAnswers = document.getElementById('showAnswers').checked;
            const config = getExamConfig();
            
            // Añadir evaluación y tipo
            config.evaluationId = document.getElementById('evaluationSelect')?.value || null;
            config.examType = document.getElementById('examTypeSelect')?.value || 'libre';
            config.status = status || 'borrador';
            
            var actionLabel = status === 'publicado' ? 'Publicando' : 'Guardando';
            window.showNotification(actionLabel + ' examen...', 'info');
            
            // Guardar el formulario
            const formData = await window.formsManager.save(
                window.editingId,
                title,
                window.tempQuestions,
                null,
                config
            );
            
            if (!formData || !formData.id) {
                throw new Error('No se pudo guardar el formulario');
            }
            
            // Actualizar metadatos
            await window.formsManager.updateMeta(formData.id, {
                allowMultiple: allowMultiple,
                showAnswers: showAnswers
            });
            
            var msg = status === 'publicado' ? 'Examen publicado correctamente' : 'Borrador guardado';
            if (showNotification) {
                window.showNotification(msg, 'success');
            }
            
            // No limpiar estado si es guardado de borrador (permanece en editor)
            if (status === 'publicado') {
                window.editingId = null;
                window.tempQuestions = [];
                
                if (window.formsManager && typeof window.formsManager.refresh === 'function') {
                    await window.formsManager.refresh();
                }
                
                setTimeout(function() {
                    window.location.href = 'dashboard.html';
                }, 500);
            } else {
                // Actualizar editingId para futuros saves
                window.editingId = formData.id;
                renderStatusBadgeExamen();
                if (window.isFormChanged !== undefined) window.isFormChanged = false;
                updateAutoSaveIndicator('Guardado', '#10B981');
                var saveBtn = document.getElementById('saveDraftButton');
                if (saveBtn) saveBtn.classList.remove('btn-warning');
            }
            
        } catch (error) {
            console.error('Error guardando:', error);
            window.showNotification('No pudimos guardar el examen. Revisa tu conexión e inténtalo de nuevo.', 'error');
        }
    };
    
    // ============================================================
    // CONFIGURACIÓN
    // ============================================================
    
    function getExamConfig() {
        return {
            timeLimit: parseInt(document.getElementById('config_timeLimit')?.value) || 0,
            maxAttempts: parseInt(document.getElementById('config_maxAttempts')?.value) || 1,
            openDate: document.getElementById('config_openDate')?.value || null,
            closeDate: document.getElementById('config_closeDate')?.value || null,
            shuffleQuestions: document.getElementById('config_shuffleQuestions')?.checked || false,
            shuffleOptions: document.getElementById('config_shuffleOptions')?.checked || false,
            onePerPage: document.getElementById('config_onePerPage')?.checked || false,
            showProgress: document.getElementById('config_showProgress')?.checked || false,
            allowBack: document.getElementById('config_allowBack')?.checked || false,
            showGradeAutomatically: document.getElementById('config_showGradeAutomatically')?.checked || false,
            showAnswersOnFinish: document.getElementById('config_showAnswersOnFinish')?.checked || false,
            showOnlyScore: document.getElementById('config_showOnlyScore')?.checked || false
        };
    }
    
    window.openExamConfig = function() {
        const modal = document.getElementById('examConfigModal');
        if (modal) modal.classList.add('active');
    };
    
    window.closeExamConfig = function() {
        const modal = document.getElementById('examConfigModal');
        if (modal) modal.classList.remove('active');
    };
    
    window.saveConfigFromModal = function() {
        window.closeExamConfig();
        window.showNotification('Configuración actualizada', 'success');
    };
    
    // ============================================================
    // DRAFT RECOVERY (localStorage)
    // ============================================================
    
    var DRAFT_KEY = 'editor_draft';
    
    function guardarBorradorLocal() {
        try {
            var draft = {
                title: document.getElementById('formTitle')?.value || '',
                questions: JSON.parse(JSON.stringify(window.tempQuestions || [])),
                allowMultiple: document.getElementById('allowMultiple')?.checked || false,
                showAnswers: document.getElementById('showAnswers')?.checked || false,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) { /* localStorage puede fallar */ }
    }
    
    function limpiarBorradorLocal() {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* silencioso */ }
    }
    
    function recuperarBorrador() {
        var raw;
        try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
        if (!raw) return;
        
        var draft;
        try { draft = JSON.parse(raw); } catch (e) { return; }
        if (!draft || !draft.questions || draft.questions.length === 0) return;
        
        window.showConfirmDialog(
            'Borrador encontrado',
            'Se encontr\u00f3 un borrador sin guardar del d\u00eda '
                + new Date(draft.savedAt).toLocaleDateString('es-ES')
                + '.<br><br>\u00bfDeseas recuperarlo o descartarlo?',
            'Recuperar',
            'Descartar',
            function() {
                document.getElementById('formTitle').value = draft.title || 'Mi examen';
                window.tempQuestions = draft.questions || [];
                if (draft.allowMultiple !== undefined) {
                    document.getElementById('allowMultiple').checked = draft.allowMultiple;
                    toggleSwitch('allowMultipleToggle', draft.allowMultiple);
                }
                if (draft.showAnswers !== undefined) {
                    document.getElementById('showAnswers').checked = draft.showAnswers;
                    toggleSwitch('showAnswersToggle', draft.showAnswers);
                }
                window.renderQuestions();
                if (typeof window.onFormChange === 'function') window.onFormChange();
                window.showNotification('Borrador recuperado', 'success');
            },
            function() {
                limpiarBorradorLocal();
                window.showNotification('Borrador descartado', 'info');
            }
        );
    }
    
    // Auto-guardar borrador en localStorage cada 15 segundos si hay cambios
    setInterval(function() {
        if (window.tempQuestions && window.tempQuestions.length > 0) {
            guardarBorradorLocal();
        }
    }, 15000);
    
    // Limpiar borrador al publicar exitosamente (se sobreescribe en saveForm)
    var _origSaveForm = window.saveForm;
    window.saveForm = function(status, showNotification) {
        limpiarBorradorLocal();
        return _origSaveForm.call(window, status, showNotification);
    };
    
    console.log('Editor System cargado');
    
})();