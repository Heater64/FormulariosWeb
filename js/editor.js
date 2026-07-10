// ============================================================
// EDITOR - 10 TIPOS PRIORITARIOS + CONFIGURACIÓN EN MODAL
// ============================================================

(function() {
    'use strict';
    
    if (typeof window.editingId === 'undefined') {
        window.editingId = null;
    }
    if (typeof window.tempQuestions === 'undefined') {
        window.tempQuestions = [];
    }
    
    // ============================================================
    // CONFIGURACIÓN - 10 TIPOS PRIORITARIOS
    // ============================================================
    
    const QUESTION_TYPES = {
        'text': {
            label: 'Completar',
            icon: 'type',
            description: 'Completar versículo o frase',
            category: 'texto',
            color: 'blue'
        },
        'textarea': {
            label: 'Respuesta abierta',
            icon: 'file-text',
            description: 'Respuesta desarrollada',
            category: 'texto',
            color: 'blue'
        },
        'radio': {
            label: 'Opción múltiple',
            icon: 'circle',
            description: 'Seleccionar una opción',
            category: 'opciones',
            color: 'purple'
        },
        'checkbox': {
            label: 'Seleccionar varias',
            icon: 'square',
            description: 'Seleccionar varias opciones',
            category: 'opciones',
            color: 'purple'
        },
        'truefalse': {
            label: 'Verdadero/Falso',
            icon: 'check-circle',
            description: 'Decidir si es verdadero o falso',
            category: 'opciones',
            color: 'purple'
        },
        'match': {
            label: 'Relacionar columnas',
            icon: 'link-2',
            description: 'Relacionar elementos de dos columnas',
            category: 'relacionar',
            color: 'orange'
        },
        'order': {
            label: 'Ordenar',
            icon: 'list-ordered',
            description: 'Ordenar elementos en secuencia',
            category: 'relacionar',
            color: 'orange'
        },
        'identify': {
            label: 'Identificar personaje',
            icon: 'user-search',
            description: 'Identificar un personaje bíblico',
            category: 'identificar',
            color: 'green'
        },
        'number': {
            label: 'Número',
            icon: 'hash',
            description: 'Respuesta numérica',
            category: 'identificar',
            color: 'green'
        },
        'image': {
            label: 'Imagen',
            icon: 'image',
            description: 'Pregunta con imagen',
            category: 'identificar',
            color: 'green'
        }
    };
    
    const CATEGORY_LABELS = {
        'texto': '📝 Texto',
        'opciones': '🎯 Opciones',
        'relacionar': '🔗 Relacionar',
        'identificar': '👤 Identificar'
    };
    
    function getTypeLabel(type) {
        return QUESTION_TYPES[type]?.label || type;
    }
    
    function getTypeIcon(type) {
        return QUESTION_TYPES[type]?.icon || 'help-circle';
    }
    
    // ============================================================
    // PREGUNTAS POR DEFECTO
    // ============================================================
    
    function createDefaultQuestion(type) {
        const base = {
            id: Utils.generateId(),
            type: type,
            title: '',
            required: false
        };
        
        switch(type) {
            case 'radio':
                return { ...base, options: ['Opción A', 'Opción B', 'Opción C'], correctAnswer: '' };
            case 'checkbox':
                return { ...base, options: ['Opción A', 'Opción B', 'Opción C'], correctAnswers: '' };
            case 'truefalse':
                return { ...base, correctAnswer: 'true' };
            case 'match':
                return { 
                    ...base, 
                    leftItems: ['Elemento 1', 'Elemento 2'], 
                    rightItems: ['Correspondencia 1', 'Correspondencia 2'],
                    matchPairs: '0-0,1-1'
                };
            case 'order':
                return { 
                    ...base, 
                    orderItems: ['Evento 1', 'Evento 2', 'Evento 3'],
                    correctOrder: '0,1,2'
                };
            case 'identify':
                return { 
                    ...base, 
                    clues: 'Escribe pistas sobre el personaje...', 
                    correctAnswer: '' 
                };
            case 'image':
                return { 
                    ...base, 
                    imageUrl: '', 
                    correctAnswer: '' 
                };
            case 'text':
            case 'textarea':
            case 'number':
            default:
                return { ...base };
        }
    }
    
    // ============================================================
    // VERIFICAR PERMISOS
    // ============================================================
    
    function checkAdminPermission() {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede acceder al editor', 'warning');
            window.showView('dashboard');
            return false;
        }
        return true;
    }
    
    // ============================================================
    // VARIABLES DE CONFIGURACIÓN
    // ============================================================
    
    let examConfig = {
        timeLimit: 0,
        maxAttempts: 1,
        openDate: null,
        closeDate: null,
        shuffleQuestions: false,
        shuffleOptions: false,
        onePerPage: false,
        showProgress: false,
        allowBack: false,
        showGradeAutomatically: false,
        showAnswersOnFinish: false,
        showOnlyScore: false
    };
    
    // ============================================================
    // RENDER EDITOR
    // ============================================================
    
    window.renderEditor = function() {
        // Verificar permisos
        if (!checkAdminPermission()) return;
        
        const titleEl = document.getElementById('editorTitle');
        titleEl.textContent = window.editingId ? '✏️ Editar Formulario' : '📝 Nuevo Formulario';
        
        const titleInput = document.getElementById('formTitle');
        const allowMultipleCheckbox = document.getElementById('allowMultiple');
        const showAnswersCheckbox = document.getElementById('showAnswers');
        const toggleMultiple = document.getElementById('allowMultipleToggle');
        const toggleAnswers = document.getElementById('showAnswersToggle');
        
        // Resetear configuración
        examConfig = {
            timeLimit: 0,
            maxAttempts: 1,
            openDate: null,
            closeDate: null,
            shuffleQuestions: false,
            shuffleOptions: false,
            onePerPage: false,
            showProgress: false,
            allowBack: false,
            showGradeAutomatically: false,
            showAnswersOnFinish: false,
            showOnlyScore: false
        };
        
        if (window.editingId) {
            const form = window.formsManager.cache.find(f => f.id === window.editingId);
            if (form) {
                titleInput.value = form.title || '';
                window.tempQuestions = JSON.parse(JSON.stringify(form.questions || []));
                
                const allowMultiple = form.allowmultiple === true;
                const showAnswers = form.showanswers === true;
                
                allowMultipleCheckbox.checked = allowMultiple;
                toggleMultiple.classList.toggle('active', allowMultiple);
                
                showAnswersCheckbox.checked = showAnswers;
                toggleAnswers.classList.toggle('active', showAnswers);
                
                // Cargar configuración del examen
                if (form.config) {
                    examConfig = { ...examConfig, ...form.config };
                }
            }
        } else {
            titleInput.value = 'Mi formulario';
            window.tempQuestions = [];
            allowMultipleCheckbox.checked = false;
            toggleMultiple.classList.remove('active');
            showAnswersCheckbox.checked = false;
            toggleAnswers.classList.remove('active');
        }
        
        setupToggleListeners();
        window.renderQuestions();
        updateConfigUI();
    };
    
    // ============================================================
    // CONFIGURACIÓN - MODAL
    // ============================================================
    
    window.openExamConfig = function() {
        // Actualizar UI del modal con los valores actuales
        updateConfigUI();
        
        const modal = document.getElementById('examConfigModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };
    
    window.closeExamConfig = function() {
        const modal = document.getElementById('examConfigModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeExamConfig();
        }
    });
    
    // Cerrar modal al hacer clic fuera
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('examConfigModal');
        if (modal && modal.classList.contains('active')) {
            if (e.target === modal) {
                window.closeExamConfig();
            }
        }
    });
    
    function updateConfigUI() {
        // Actualizar campos del modal
        const fields = ['timeLimit', 'maxAttempts', 'openDate', 'closeDate'];
        fields.forEach(field => {
            const el = document.getElementById('config_' + field);
            if (el) {
                el.value = examConfig[field] || '';
            }
        });
        
        const toggles = ['shuffleQuestions', 'shuffleOptions', 'onePerPage', 'showProgress', 
                         'allowBack', 'showGradeAutomatically', 'showAnswersOnFinish', 'showOnlyScore'];
        toggles.forEach(id => {
            const el = document.getElementById('config_' + id);
            const toggle = document.getElementById('config_toggle_' + id);
            if (el) {
                el.checked = examConfig[id] || false;
                if (toggle) {
                    toggle.classList.toggle('active', examConfig[id] || false);
                }
            }
        });
    }
    
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
    
    function saveConfigFromModal() {
        examConfig = getExamConfig();
        if (typeof window.onFormChange === 'function') {
            window.onFormChange();
        }
        Utils.showNotification('⚙️ Configuración actualizada', 'success', 1500);
        window.closeExamConfig();
    }
    
    window.saveConfigFromModal = saveConfigFromModal;
    
    // ============================================================
    // TOGGLES
    // ============================================================
    
    function setupToggleListeners() {
        const multipleCheckbox = document.getElementById('allowMultiple');
        const multipleToggle = document.getElementById('allowMultipleToggle');
        const answersCheckbox = document.getElementById('showAnswers');
        const answersToggle = document.getElementById('showAnswersToggle');
        
        if (multipleCheckbox && multipleToggle) {
            const newMultipleCheckbox = multipleCheckbox.cloneNode(true);
            multipleCheckbox.parentNode.replaceChild(newMultipleCheckbox, multipleCheckbox);
            newMultipleCheckbox.addEventListener('change', function() {
                multipleToggle.classList.toggle('active', this.checked);
                if (typeof window.onFormChange === 'function') {
                    window.onFormChange();
                }
            });
        }
        
        if (answersCheckbox && answersToggle) {
            const newAnswersCheckbox = answersCheckbox.cloneNode(true);
            answersCheckbox.parentNode.replaceChild(newAnswersCheckbox, answersCheckbox);
            newAnswersCheckbox.addEventListener('change', function() {
                answersToggle.classList.toggle('active', this.checked);
                if (typeof window.onFormChange === 'function') {
                    window.onFormChange();
                }
            });
        }
    }
    
    // ============================================================
    // RENDER PREGUNTAS
    // ============================================================
    
    window.renderQuestions = function() {
        if (!window.isAdmin && !window.isAdmin()) return;
        
        const container = document.getElementById('questionsContainer');
        const counter = document.getElementById('questionCounter');
        const questions = window.tempQuestions || [];
        counter.textContent = `${questions.length} preguntas`;
        
        if (questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">📋</div>
                    <h3 class="empty-state-title">No hay preguntas</h3>
                    <p class="empty-state-subtitle">Añade tu primera pregunta usando los botones de abajo</p>
                </div>
            `;
            return;
        }
        
        const typeLabels = {
            'text': 'Completar',
            'textarea': 'Respuesta abierta',
            'radio': 'Opción múltiple',
            'checkbox': 'Seleccionar varias',
            'truefalse': 'Verdadero/Falso',
            'match': 'Relacionar columnas',
            'order': 'Ordenar',
            'identify': 'Identificar personaje',
            'number': 'Número',
            'image': 'Imagen'
        };
        
        let html = '';
        questions.forEach((q, index) => {
            const num = index + 1;
            const hasTitle = q.title?.trim();
            
            html += `
                <div class="question-card question-card-enter" data-index="${index}">
                    <div class="question-card-header">
                        <div class="question-drag-handle" title="Arrastrar para reordenar">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                        <span class="question-number">${num}.</span>
                        <div class="question-content">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="badge badge-purple">
                                    <i data-lucide="${getTypeIcon(q.type)}" class="w-3 h-3 inline"></i>
                                    ${typeLabels[q.type] || q.type}
                                </span>
                                ${hasTitle ? `<span class="text-xs text-green-500">✅</span>` : `<span class="text-xs text-red-400">⚠️ Sin título</span>`}
                            </div>
                            <input class="question-title-input" 
                                   value="${Utils.escapeHtml(q.title || '')}" 
                                   placeholder="Escribe la pregunta..." 
                                   oninput="updateQuestionTitle(${index}, this.value)" />
                            <div class="question-preview">${getQuestionPreview(q, index)}</div>
                        </div>
                        <div class="question-controls">
                            <div class="question-actions-row">
                                <button onclick="copyQuestion(${index})" class="btn-ghost btn-sm" title="Copiar pregunta (Ctrl+C)">
                                    <i data-lucide="copy" class="w-3 h-3"></i>
                                </button>
                                <button onclick="pasteQuestion(${index})" class="btn-ghost btn-sm" title="Pegar pregunta (Ctrl+V)">
                                    <i data-lucide="clipboard-paste" class="w-3 h-3"></i>
                                </button>
                                <button onclick="duplicateQuestion(${index})" class="btn-ghost btn-sm" title="Duplicar pregunta">
                                    <i data-lucide="copy-plus" class="w-3 h-3"></i>
                                </button>
                            </div>
                            <select class="text-sm border rounded-lg px-2 py-1 bg-white text-gray-600" 
                                    onchange="changeQuestionType(${index}, this.value)">
                                ${Object.keys(typeLabels).map(key => 
                                    `<option value="${key}" ${q.type === key ? 'selected' : ''}>${typeLabels[key]}</option>`
                                ).join('')}
                            </select>
                            <label class="toggle-container ${q.required ? 'active' : ''}">
                                <span class="toggle-switch ${q.required ? 'active' : ''}"></span>
                                <span>Obligatorio</span>
                                <input type="checkbox" ${q.required ? 'checked' : ''} 
                                       onchange="updateQuestion(${index}, 'required', this.checked); renderQuestions()" 
                                       style="display:none" />
                            </label>
                            <button onclick="removeQuestion(${index})" class="btn-danger">
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
        }, 50);
    };
    
    function getTypeIcon(type) {
        const icons = {
            'text': 'type', 'textarea': 'file-text', 'radio': 'circle',
            'checkbox': 'square', 'truefalse': 'check-circle', 'match': 'link-2',
            'order': 'list-ordered', 'identify': 'user-search', 'number': 'hash', 'image': 'image'
        };
        return icons[type] || 'help-circle';
    }
    
    // ============================================================
    // PREVIEW DE PREGUNTAS
    // ============================================================
    
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
                        <label class="flex items-center gap-2"><input type="radio" disabled /> Verdadero</label>
                        <label class="flex items-center gap-2"><input type="radio" disabled /> Falso</label>
                    </div>
                    <div class="mt-2">
                        <label class="text-sm text-gray-500">Respuesta correcta: 
                            <select class="text-sm border rounded-lg px-2 py-1 bg-white" 
                                    onchange="updateQuestion(${index}, 'correctAnswer', this.value)">
                                <option value="true" ${q.correctAnswer === 'true' ? 'selected' : ''}>Verdadero</option>
                                <option value="false" ${q.correctAnswer === 'false' ? 'selected' : ''}>Falso</option>
                            </select>
                        </label>
                    </div>
                `;
            case 'radio': {
                const opts = q.options || ['Opción A', 'Opción B', 'Opción C'];
                return `
                    <div class="space-y-1 mt-2">
                        ${opts.map((opt, i) => `
                            <div class="question-option">
                                <input type="radio" disabled />
                                <input type="text" value="${Utils.escapeHtml(opt)}" 
                                       onchange="updateOption(${index}, ${i}, this.value)" />
                                <button onclick="removeOption(${index}, ${i})" class="remove-btn">✕</button>
                            </div>
                        `).join('')}
                        <button onclick="addOption(${index})" class="text-xs text-blue-500 mt-1">+ Añadir opción</button>
                        <div class="mt-2">
                            <label class="text-sm text-gray-500">Respuesta correcta: 
                                <select class="text-sm border rounded-lg px-2 py-1 bg-white" 
                                        onchange="updateQuestion(${index}, 'correctAnswer', this.value)">
                                    <option value="">Selecciona...</option>
                                    ${opts.map((opt, i) => `<option value="${i}" ${q.correctAnswer == i ? 'selected' : ''}>${Utils.escapeHtml(opt)}</option>`).join('')}
                                </select>
                            </label>
                        </div>
                    </div>
                `;
            }
            case 'checkbox': {
                const opts = q.options || ['Opción A', 'Opción B', 'Opción C'];
                return `
                    <div class="space-y-1 mt-2">
                        ${opts.map((opt, i) => `
                            <div class="question-option">
                                <input type="checkbox" disabled />
                                <input type="text" value="${Utils.escapeHtml(opt)}" 
                                       onchange="updateOption(${index}, ${i}, this.value)" />
                                <button onclick="removeOption(${index}, ${i})" class="remove-btn">✕</button>
                            </div>
                        `).join('')}
                        <button onclick="addOption(${index})" class="text-xs text-blue-500 mt-1">+ Añadir opción</button>
                        <div class="mt-2">
                            <label class="text-sm text-gray-500">Respuestas correctas: 
                                <input type="text" class="form-input text-sm" value="${q.correctAnswers || ''}" 
                                       placeholder="Ej: 0,2" onchange="updateQuestion(${index}, 'correctAnswers', this.value)" />
                            </label>
                        </div>
                    </div>
                `;
            }
            case 'match': {
                const left = q.leftItems || ['Elemento 1', 'Elemento 2'];
                const right = q.rightItems || ['Correspondencia 1', 'Correspondencia 2'];
                return `
                    <div class="match-container">
                        <div class="match-column">
                            <p class="match-column-title">Columna A</p>
                            ${left.map((item, i) => `
                                <div class="match-item">
                                    <input type="text" value="${Utils.escapeHtml(item)}" 
                                           onchange="updateMatchItem(${index}, 'left', ${i}, this.value)" />
                                    <button onclick="removeMatchItem(${index}, 'left', ${i})" class="remove-btn">✕</button>
                                </div>
                            `).join('')}
                            <button onclick="addMatchItem(${index}, 'left')" class="text-xs text-blue-500 mt-1">+ Añadir</button>
                        </div>
                        <div class="match-column">
                            <p class="match-column-title">Columna B</p>
                            ${right.map((item, i) => `
                                <div class="match-item">
                                    <input type="text" value="${Utils.escapeHtml(item)}" 
                                           onchange="updateMatchItem(${index}, 'right', ${i}, this.value)" />
                                    <button onclick="removeMatchItem(${index}, 'right', ${i})" class="remove-btn">✕</button>
                                </div>
                            `).join('')}
                            <button onclick="addMatchItem(${index}, 'right')" class="text-xs text-blue-500 mt-1">+ Añadir</button>
                        </div>
                    </div>
                    <div class="match-pairs-input mt-2">
                        <label class="text-sm text-gray-500">Correspondencias: 
                            <input type="text" class="form-input text-sm" value="${q.matchPairs || ''}" 
                                   placeholder="0-1,1-0,2-2" onchange="updateQuestion(${index}, 'matchPairs', this.value)" />
                        </label>
                    </div>
                `;
            }
            case 'order': {
                const items = q.orderItems || ['Evento 1', 'Evento 2', 'Evento 3'];
                return `
                    <div class="mt-2">
                        ${items.map((item, i) => `
                            <div class="order-item">
                                <span class="order-number">${i+1}.</span>
                                <input type="text" value="${Utils.escapeHtml(item)}" 
                                       onchange="updateOrderItem(${index}, ${i}, this.value)" />
                                <button onclick="removeOrderItem(${index}, ${i})" class="remove-btn">✕</button>
                            </div>
                        `).join('')}
                        <button onclick="addOrderItem(${index})" class="text-xs text-blue-500 mt-1">+ Añadir</button>
                        <div class="mt-2">
                            <label class="text-sm text-gray-500">Orden correcto: 
                                <input type="text" class="form-input text-sm" value="${q.correctOrder || ''}" 
                                       placeholder="Ej: 2,0,1" onchange="updateQuestion(${index}, 'correctOrder', this.value)" />
                            </label>
                        </div>
                    </div>
                `;
            }
            case 'identify':
                return `
                    <div class="identify-clues">
                        <textarea rows="2" placeholder="Pistas sobre el personaje..." 
                                  onchange="updateQuestion(${index}, 'clues', this.value)">${q.clues || ''}</textarea>
                    </div>
                    <div class="identify-answer-input">
                        <label class="text-sm text-gray-500">Personaje correcto: 
                            <input type="text" class="form-input text-sm" value="${q.correctAnswer || ''}" 
                                   placeholder="Nombre del personaje" onchange="updateQuestion(${index}, 'correctAnswer', this.value)" />
                        </label>
                    </div>
                `;
            case 'image':
                return `
                    <div class="image-preview mt-2">
                        ${q.imageUrl ? `<img src="${Utils.escapeHtml(q.imageUrl)}" class="preview-image" />` : 
                            `<div class="image-placeholder"><i data-lucide="image" class="w-8 h-8 text-gray-300"></i><p class="text-xs text-gray-400">Sin imagen</p></div>`}
                        <input type="text" class="form-input text-sm mt-2" value="${q.imageUrl || ''}" 
                               placeholder="URL de la imagen" onchange="updateQuestion(${index}, 'imageUrl', this.value)" />
                        <div class="mt-2">
                            <label class="text-sm text-gray-500">Respuesta correcta: 
                                <input type="text" class="form-input text-sm" value="${q.correctAnswer || ''}" 
                                       placeholder="Respuesta esperada" onchange="updateQuestion(${index}, 'correctAnswer', this.value)" />
                            </label>
                        </div>
                    </div>
                `;
            default:
                return `<input class="form-input bg-gray-50" placeholder="Respuesta" disabled />`;
        }
    }
    
    // ============================================================
    // FUNCIONES DE PREGUNTAS (CON PERMISOS)
    // ============================================================
    
    window.updateQuestionTitle = function(index, value) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[index]) {
            window.tempQuestions[index].title = value;
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.changeQuestionType = function(index, newType) {
        if (!window.isAdmin || !window.isAdmin()) return;
        const questions = window.tempQuestions;
        if (!questions || !questions[index]) return;
        
        const oldType = questions[index].type;
        if (oldType === newType) return;
        
        const title = questions[index].title;
        const required = questions[index].required;
        const id = questions[index].id;
        
        const newQ = createDefaultQuestion(newType);
        newQ.id = id;
        newQ.title = title;
        newQ.required = required;
        
        if (['radio', 'checkbox'].includes(newType) && ['radio', 'checkbox'].includes(oldType)) {
            newQ.options = questions[index].options || ['Opción A', 'Opción B', 'Opción C'];
        }
        
        questions[index] = newQ;
        window.renderQuestions();
        if (typeof window.onFormChange === 'function') window.onFormChange();
    };
    
    window.addQuestion = function(type) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede añadir preguntas', 'warning');
            return;
        }
        const newQ = createDefaultQuestion(type);
        window.tempQuestions.push(newQ);
        window.renderQuestions();
        if (typeof window.onFormChange === 'function') window.onFormChange();
    };
    
    window.updateQuestion = function(index, field, value) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[index]) {
            window.tempQuestions[index][field] = value;
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.updateOption = function(qIndex, optIndex, value) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]?.options) {
            window.tempQuestions[qIndex].options[optIndex] = value;
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.addOption = function(index) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[index]) {
            if (!window.tempQuestions[index].options) window.tempQuestions[index].options = [];
            const letter = String.fromCharCode(65 + window.tempQuestions[index].options.length);
            window.tempQuestions[index].options.push(`Opción ${letter}`);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.removeOption = function(qIndex, optIndex) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]?.options) {
            window.tempQuestions[qIndex].options.splice(optIndex, 1);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.updateMatchItem = function(qIndex, side, itemIndex, value) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]) {
            const key = side === 'left' ? 'leftItems' : 'rightItems';
            if (window.tempQuestions[qIndex][key]) {
                window.tempQuestions[qIndex][key][itemIndex] = value;
                if (typeof window.onFormChange === 'function') window.onFormChange();
            }
        }
    };
    
    window.addMatchItem = function(qIndex, side) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]) {
            const key = side === 'left' ? 'leftItems' : 'rightItems';
            if (!window.tempQuestions[qIndex][key]) window.tempQuestions[qIndex][key] = [];
            window.tempQuestions[qIndex][key].push(`Elemento ${window.tempQuestions[qIndex][key].length + 1}`);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.removeMatchItem = function(qIndex, side, itemIndex) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]) {
            const key = side === 'left' ? 'leftItems' : 'rightItems';
            if (window.tempQuestions[qIndex][key]) {
                window.tempQuestions[qIndex][key].splice(itemIndex, 1);
                window.renderQuestions();
                if (typeof window.onFormChange === 'function') window.onFormChange();
            }
        }
    };
    
    window.updateOrderItem = function(qIndex, itemIndex, value) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]?.orderItems) {
            window.tempQuestions[qIndex].orderItems[itemIndex] = value;
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.addOrderItem = function(qIndex) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]) {
            if (!window.tempQuestions[qIndex].orderItems) window.tempQuestions[qIndex].orderItems = [];
            window.tempQuestions[qIndex].orderItems.push(`Evento ${window.tempQuestions[qIndex].orderItems.length + 1}`);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.removeOrderItem = function(qIndex, itemIndex) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.tempQuestions && window.tempQuestions[qIndex]?.orderItems) {
            window.tempQuestions[qIndex].orderItems.splice(itemIndex, 1);
            window.renderQuestions();
            if (typeof window.onFormChange === 'function') window.onFormChange();
        }
    };
    
    window.removeQuestion = function(index) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede eliminar preguntas', 'warning');
            return;
        }
        if (!confirm('¿Eliminar esta pregunta?')) return;
        window.tempQuestions.splice(index, 1);
        window.renderQuestions();
        if (typeof window.onFormChange === 'function') window.onFormChange();
    };
    
    // ============================================================
    // COPIA Y PEGA DE PREGUNTAS
    // ============================================================
    
    let copiedQuestion = null;
    
    window.copyQuestion = function(index) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!window.tempQuestions || !window.tempQuestions[index]) return;
        copiedQuestion = JSON.parse(JSON.stringify(window.tempQuestions[index]));
        Utils.showNotification('📋 Pregunta copiada', 'info', 1500);
    };
    
    window.pasteQuestion = function(index) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!copiedQuestion) {
            Utils.showNotification('⚠️ No hay pregunta copiada', 'warning');
            return;
        }
        const paste = JSON.parse(JSON.stringify(copiedQuestion));
        paste.id = Utils.generateId();
        paste.title = paste.title + ' (pegado)';
        window.tempQuestions.splice(index + 1, 0, paste);
        if (typeof window.onFormChange === 'function') window.onFormChange();
        window.renderQuestions();
        Utils.showNotification('📋 Pregunta pegada', 'success', 1500);
    };
    
    window.duplicateQuestion = function(index) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!window.tempQuestions || !window.tempQuestions[index]) return;
        const original = window.tempQuestions[index];
        const copy = JSON.parse(JSON.stringify(original));
        copy.id = Utils.generateId();
        copy.title = original.title + ' (copia)';
        window.tempQuestions.splice(index + 1, 0, copy);
        if (typeof window.onFormChange === 'function') window.onFormChange();
        window.renderQuestions();
        Utils.showNotification('📋 Pregunta duplicada', 'success', 1500);
    };
    
    // ============================================================
    // GUARDAR FORMULARIO
    // ============================================================
    
    window.saveForm = async function(showNotification = true) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede guardar formularios', 'warning');
            return;
        }
        
        const title = document.getElementById('formTitle').value.trim();
        if (!title) {
            Utils.showNotification('Por favor, escribe un título para el formulario', 'warning');
            document.getElementById('formTitle').focus();
            return;
        }
        
        const questions = window.tempQuestions || [];
        if (questions.length === 0) {
            Utils.showNotification('Añade al menos una pregunta', 'warning');
            return;
        }
        
        if (questions.some(q => !q.title?.trim())) {
            Utils.showNotification('Todas las preguntas deben tener título', 'warning');
            return;
        }
        
        if (questions.some(q => ['radio', 'checkbox'].includes(q.type) && (!q.options || q.options.length < 2))) {
            Utils.showNotification('Las preguntas de opciones deben tener al menos 2 opciones', 'warning');
            return;
        }
        
        try {
            const allowMultiple = document.getElementById('allowMultiple').checked;
            const showAnswers = document.getElementById('showAnswers').checked;
            const slug = Utils.generateSlug(title);
            const config = getExamConfig();
            
            const formData = await window.formsManager.save(window.editingId, title, questions, slug);
            
            await window.formsManager.updateMeta(formData.id, {
                allowMultiple: allowMultiple,
                showAnswers: showAnswers
            });
            
            await window.formsManager.updateConfig(formData.id, config);
            
            if (showNotification) {
                Utils.showNotification('Formulario guardado correctamente ✅', 'success');
            }
            
            window.editingId = null;
            window.tempQuestions = [];
            if (typeof window.isFormChanged !== 'undefined') window.isFormChanged = false;
            
            window.showView('dashboard');
        } catch (error) {
            Utils.showNotification('Error al guardar: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // ON FORM CHANGE (exportar para UX)
    // ============================================================
    
    window.onFormChange = function() {
        if (typeof window._onFormChange === 'function') {
            window._onFormChange();
        }
    };
    
    console.log('✅ Editor con modal de configuración cargado');
    
})();