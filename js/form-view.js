// ============================================================
// FORM-VIEW - 10 TIPOS PRIORITARIOS + VALIDACIÓN DE PERMISOS
// ============================================================

(function() {
    'use strict';
    
    let currentFormId = null;
    let currentForm = null;
    let startTime = null;
    
    // ============================================================
    // Mapeo de tipos a funciones de renderizado
    // ============================================================
    
    const QUESTION_RENDERERS = {
        'text': (q, name, isRequired, isStudyMode) => 
            `<input name="${name}" class="form-input" placeholder="Escribe tu respuesta..." ${isRequired} />`,
        
        'textarea': (q, name, isRequired, isStudyMode) => 
            `<textarea name="${name}" class="form-input" rows="3" placeholder="Desarrolla tu respuesta..." ${isRequired}></textarea>`,
        
        'number': (q, name, isRequired, isStudyMode) => 
            `<input name="${name}" class="form-input" type="number" placeholder="Número" ${isRequired} />`,
        
        'truefalse': (q, name, isRequired, isStudyMode) => 
            `<div class="tf-options">
                <label><input type="radio" name="${name}" value="true" ${isRequired} /> Verdadero</label>
                <label><input type="radio" name="${name}" value="false" ${isRequired} /> Falso</label>
            </div>`,
        
        'radio': (q, name, isRequired, isStudyMode) => {
            const options = q.options || ['Opción A', 'Opción B', 'Opción C'];
            return options.map((opt, i) => 
                `<div class="form-view-option">
                    <input type="radio" name="${name}" value="${i}" ${isRequired} /> 
                    ${Utils.escapeHtml(opt)}
                </div>`
            ).join('');
        },
        
        'checkbox': (q, name, isRequired, isStudyMode) => {
            const options = q.options || ['Opción A', 'Opción B', 'Opción C'];
            return options.map((opt, i) => 
                `<div class="form-view-option">
                    <input type="checkbox" name="${name}" value="${i}" /> 
                    ${Utils.escapeHtml(opt)}
                </div>`
            ).join('');
        },
        
        'match': (q, name, isRequired, isStudyMode) => {
            const leftItems = q.leftItems || ['Elemento 1', 'Elemento 2'];
            const rightItems = q.rightItems || ['Correspondencia 1', 'Correspondencia 2'];
            
            // En modo estudio, mostrar las correspondencias correctas
            let matchPairs = [];
            if (q.matchPairs) {
                matchPairs = q.matchPairs.split(',').map(p => p.trim().split('-'));
            }
            
            return `
                <div class="match-container">
                    <div class="match-column">
                        <p class="match-column-title">Columna A</p>
                        ${leftItems.map(item => `<div class="match-item">${Utils.escapeHtml(item)}</div>`).join('')}
                    </div>
                    <div class="match-column">
                        <p class="match-column-title">Columna B</p>
                        ${rightItems.map((item, i) => `
                            <div class="match-item">
                                ${isStudyMode && matchPairs[i] ? 
                                    `<span class="match-answer-correct">✅ ${Utils.escapeHtml(leftItems[parseInt(matchPairs[i][1])] || '')}</span>` :
                                    `<select name="${name}_${i}" class="match-select" ${isRequired}>
                                        <option value="">Selecciona...</option>
                                        ${leftItems.map((_, j) => `<option value="${j}">${Utils.escapeHtml(leftItems[j])}</option>`).join('')}
                                    </select>`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },
        
        'order': (q, name, isRequired, isStudyMode) => {
            const orderItems = q.orderItems || ['Evento 1', 'Evento 2', 'Evento 3'];
            const correctOrder = q.correctOrder ? q.correctOrder.split(',').map(s => s.trim()) : [];
            
            return `
                <div class="mt-2">
                    <p class="text-xs text-gray-400 mb-2">Ordena los eventos (1 = primero, ${orderItems.length} = último)</p>
                    ${orderItems.map((item, i) => `
                        <div class="order-input-group">
                            ${isStudyMode && correctOrder[i] ? 
                                `<span class="order-correct-value">✅ ${parseInt(correctOrder[i]) + 1}</span>` :
                                `<input type="number" name="${name}_${i}" class="form-input" min="1" max="${orderItems.length}" placeholder="${i+1}" ${isRequired} />`
                            }
                            <span class="order-label">${Utils.escapeHtml(item)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        },
        
        'identify': (q, name, isRequired, isStudyMode) => `
            <div class="mt-2">
                <p class="text-sm text-gray-500 mb-2">${Utils.escapeHtml(q.clues || 'Pistas sobre el personaje...')}</p>
                ${isStudyMode && q.correctAnswer ? 
                    `<div class="identify-answer-correct">✅ Respuesta correcta: <strong>${Utils.escapeHtml(q.correctAnswer)}</strong></div>` :
                    `<input name="${name}" class="form-input" placeholder="¿Quién es?" ${isRequired} />`
                }
            </div>
        `,
        
        'image': (q, name, isRequired, isStudyMode) => {
            const imgHtml = q.imageUrl ? 
                `<img src="${Utils.escapeHtml(q.imageUrl)}" alt="Imagen de la pregunta" class="form-view-image" />` :
                `<div class="form-view-image-placeholder">🖼 Sin imagen</div>`;
            return `
                <div class="mt-2">
                    ${imgHtml}
                    ${isStudyMode && q.correctAnswer ? 
                        `<div class="image-answer-correct mt-2">✅ Respuesta correcta: <strong>${Utils.escapeHtml(q.correctAnswer)}</strong></div>` :
                        `<input name="${name}" class="form-input mt-2" placeholder="Tu respuesta..." ${isRequired} />`
                    }
                </div>
            `;
        }
    };
    
    // ============================================================
    // FUNCIONES AUXILIARES
    // ============================================================
    
    function getAnswerHint(q) {
        switch(q.type) {
            case 'radio':
                const idx = parseInt(q.correctAnswer);
                if (q.options && !isNaN(idx) && q.options[idx]) return q.options[idx];
                return 'No definida';
            case 'truefalse': 
                return q.correctAnswer === 'true' ? 'Verdadero' : 'Falso';
            case 'number': 
                return q.correctNumber || q.correctAnswer || 'No definida';
            case 'text': 
                return q.correctText || q.correctAnswer || 'No definida';
            case 'identify': 
                return q.correctAnswer || 'No definido';
            case 'match': 
                return q.matchPairs || 'No definido';
            case 'order': 
                return q.correctOrder || 'No definido';
            case 'image': 
                return q.correctAnswer || 'No definida';
            case 'checkbox':
                const indices = (q.correctAnswers || '').split(',').map(s => s.trim()).filter(s => s !== '');
                if (indices.length > 0 && q.options) {
                    return indices.map(i => q.options[parseInt(i)] || '').filter(s => s).join(', ');
                }
                return 'No definida';
            default: 
                return 'No definida';
        }
    }
    
    function getQuestionInput(q, index, isRequired, isStudyMode) {
        const name = `q${index}`;
        const renderer = QUESTION_RENDERERS[q.type] || QUESTION_RENDERERS['text'];
        return renderer(q, name, isRequired, isStudyMode);
    }
    
    // ============================================================
    // VALIDAR ACCESO DEL ALUMNO
    // ============================================================
    
    function canAccessForm(form) {
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) {
            return { allowed: false, message: 'Debes iniciar sesión para acceder al formulario' };
        }
        
        // Los alumnos siempre pueden acceder a formularios públicos
        // Los admin también pueden acceder
        return { allowed: true };
    }
    
    function canSubmitForm(form) {
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) {
            return { allowed: false, message: 'Debes iniciar sesión para enviar respuestas' };
        }
        
        // Verificar si el formulario está configurado para permitir múltiples respuestas
        const allowMultiple = form.allowmultiple || false;
        
        // Si no permite múltiples, verificar si el usuario ya respondió
        if (!allowMultiple) {
            // Esta verificación se hace en el renderFormView con una llamada async
            return { allowed: true };
        }
        
        return { allowed: true };
    }
    
    // ============================================================
    // RENDER FORMULARIO
    // ============================================================
    
    window.renderFormView = async function(formId) {
        currentFormId = formId;
        const container = document.getElementById('formViewContent');
        
        // Verificar autenticación
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) {
            container.innerHTML = `
                <div class="form-view-error">
                    <div class="form-view-error-icon">🔒</div>
                    <h2 class="form-view-error-title">Acceso restringido</h2>
                    <p class="form-view-error-text">Debes iniciar sesión para acceder a este formulario</p>
                    <button onclick="showView('dashboard')" class="btn-primary mt-4">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        Volver al inicio
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        // Obtener formulario
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) {
            container.innerHTML = `
                <div class="card text-center py-12 text-red-400">
                    <div class="text-4xl mb-4">⚠️</div>
                    <p>Formulario no encontrado</p>
                    <p class="text-sm text-gray-400 mt-2">El enlace puede ser incorrecto o el formulario ha sido eliminado</p>
                    <button onclick="showView('dashboard')" class="btn-primary mt-4">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        Volver
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        currentForm = form;
        
        // Verificar acceso
        const access = canAccessForm(form);
        if (!access.allowed) {
            container.innerHTML = `
                <div class="form-view-error">
                    <div class="form-view-error-icon">🔒</div>
                    <h2 class="form-view-error-title">Acceso denegado</h2>
                    <p class="form-view-error-text">${access.message}</p>
                    <button onclick="showView('dashboard')" class="btn-primary mt-4">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        Volver
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        // Verificar si es admin o alumno
        const isAdmin = user?.role === 'admin';
        const isAlumno = user?.role === 'alumno' || user?.role === 'student';
        
        // Verificar límite de intentos para alumnos
        if (isAlumno) {
            const config = form.config || {};
            const maxAttempts = config.maxAttempts || 1;
            
            if (maxAttempts > 0) {
                const existingResponses = await window.responsesManager.getByForm(formId);
                // Buscar respuestas de este alumno por nombre
                // Como no tenemos sistema de login con nombres, usamos un identificador simple
                // En una implementación real, se usaría el ID del usuario
                const userResponses = existingResponses.filter(r => {
                    // Si el alumno tiene nombre guardado en sesión
                    const userName = sessionStorage.getItem('formpro_username') || user.name;
                    const nameAnswer = r.answers.find(a => a.question === 'respondent_name');
                    return nameAnswer?.value === userName;
                });
                
                if (userResponses.length >= maxAttempts) {
                    container.innerHTML = `
                        <div class="form-view-success">
                            <div class="form-view-success-icon">🔒</div>
                            <h2 class="form-view-success-title">Límite de intentos alcanzado</h2>
                            <p class="form-view-success-text">Ya has completado este formulario ${maxAttempts} vez/veces</p>
                            <p class="form-view-success-hint">El administrador ha establecido un límite de ${maxAttempts} intento(s)</p>
                            <button onclick="showView('dashboard')" class="btn-primary mt-4">
                                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                Volver
                            </button>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    return;
                }
            }
            
            // Verificar si ya respondió (si no permite múltiples)
            if (!form.allowmultiple) {
                const existingResponses = await window.responsesManager.getByForm(formId);
                const userName = sessionStorage.getItem('formpro_username') || user.name;
                const userResponses = existingResponses.filter(r => {
                    const nameAnswer = r.answers.find(a => a.question === 'respondent_name');
                    return nameAnswer?.value === userName;
                });
                
                if (userResponses.length > 0) {
                    container.innerHTML = `
                        <div class="form-view-success">
                            <div class="form-view-success-icon">🔒</div>
                            <h2 class="form-view-success-title">Ya has completado este formulario</h2>
                            <p class="form-view-success-text">Este formulario solo permite una respuesta por persona</p>
                            <p class="form-view-success-hint">El administrador ha desactivado las respuestas múltiples</p>
                            <button onclick="showView('dashboard')" class="btn-primary mt-4">
                                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                                Volver
                            </button>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    return;
                }
            }
        }
        
        // Verificar fechas (para todos)
        const config = form.config || {};
        const now = new Date();
        
        if (config.openDate) {
            const openDate = new Date(config.openDate);
            if (now < openDate) {
                container.innerHTML = `
                    <div class="form-view-error">
                        <div class="form-view-error-icon">📅</div>
                        <h2 class="form-view-error-title">Formulario no disponible</h2>
                        <p class="form-view-error-text">Este formulario estará disponible a partir del ${openDate.toLocaleString()}</p>
                        <button onclick="showView('dashboard')" class="btn-primary mt-4">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            Volver
                        </button>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
        }
        
        if (config.closeDate) {
            const closeDate = new Date(config.closeDate);
            if (now > closeDate) {
                container.innerHTML = `
                    <div class="form-view-error">
                        <div class="form-view-error-icon">📅</div>
                        <h2 class="form-view-error-title">Formulario cerrado</h2>
                        <p class="form-view-error-text">Este formulario ya no está disponible (cerró el ${closeDate.toLocaleString()})</p>
                        <button onclick="showView('dashboard')" class="btn-primary mt-4">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            Volver
                        </button>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
        }
        
        // Guardar tiempo de inicio para medir duración
        startTime = new Date().toISOString();
        sessionStorage.setItem('formpro_start_time', startTime);
        
        // Renderizar formulario
        const questions = form.questions || [];
        const allowMultiple = form.allowmultiple || false;
        const showAnswers = form.showanswers || false;
        const isStudyMode = showAnswers && isAlumno;
        const onePerPage = config.onePerPage || false;
        const showProgress = config.showProgress || false;
        
        let html = `
            <div class="form-view-container">
                <div class="form-view-header">
                    <div class="form-view-header-top">
                        <button onclick="showView('dashboard')" class="btn-ghost">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            Volver
                        </button>
                        ${isAdmin ? `
                        <button onclick="editForm('${form.id}')" class="btn-secondary btn-sm">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                            Editar
                        </button>
                        ` : ''}
                    </div>
                    <h1 class="form-view-title">${Utils.escapeHtml(form.title)}</h1>
                    ${form.description ? `<p class="form-view-subtitle">${Utils.escapeHtml(form.description)}</p>` : ''}
                    <div class="form-view-meta">
                        <span class="form-view-meta-item">${questions.length} preguntas</span>
                        ${allowMultiple ? '<span class="badge badge-green">♻️ Múltiple</span>' : '<span class="badge badge-orange">🔒 Una vez</span>'}
                        ${isStudyMode ? '<span class="badge badge-blue">📖 Modo Estudio</span>' : ''}
                        ${config.timeLimit > 0 ? `<span class="badge badge-purple">⏱️ ${config.timeLimit} min</span>` : ''}
                        ${showProgress ? '<span class="badge badge-purple">📊 Progreso</span>' : ''}
                    </div>
                </div>
                
                ${showProgress ? `
                <div class="form-view-progress">
                    <div class="form-view-progress-bar" id="progressBar" style="width: 0%"></div>
                    <span class="form-view-progress-text" id="progressText">0%</span>
                </div>
                ` : ''}
                
                <form id="responseForm" class="form-view-form" onsubmit="submitResponse(event)">
                    <input type="hidden" name="formId" value="${form.id}" />
                    <div class="form-view-name-field">
                        <label class="form-view-label">👤 Tu nombre <span class="text-red-500">*</span></label>
                        <input type="text" name="respondent_name" id="respondentName" class="form-input" 
                               placeholder="Escribe tu nombre completo" 
                               value="${sessionStorage.getItem('formpro_username') || ''}" 
                               required />
                    </div>
        `;
        
        // Renderizar preguntas
        questions.forEach((q, index) => {
            const num = index + 1;
            const isRequired = q.required ? 'required' : '';
            const questionLabel = `Pregunta ${num}`;
            
            html += `
                <div class="form-view-question" data-index="${index}">
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span class="text-sm font-medium text-gray-400">${questionLabel}</span>
                        ${q.required ? '<span class="badge badge-red">Obligatoria</span>' : ''}
                        <span class="badge badge-purple">${getTypeLabel(q.type)}</span>
                    </div>
                    <label class="form-view-label">${Utils.escapeHtml(q.title || 'Pregunta sin título')}${q.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    ${getQuestionInput(q, index, isRequired, isStudyMode)}
                    ${isStudyMode && !['match', 'order', 'identify', 'image'].includes(q.type) ? 
                        `<div class="form-view-hint mt-2 text-blue-500">📖 Respuesta correcta: ${getAnswerHint(q)}</div>` : ''
                    }
                </div>
            `;
        });
        
        // Botón de enviar
        html += `
                    <div class="form-view-actions">
                        <button type="submit" class="btn-primary btn-full btn-lg" id="submitFormBtn">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            ${isStudyMode ? 'Ver resultados' : 'Enviar respuestas'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Actualizar progreso en tiempo real
        if (showProgress) {
            const inputs = container.querySelectorAll('.form-view-question input, .form-view-question textarea, .form-view-question select');
            inputs.forEach(input => {
                input.addEventListener('change', updateProgress);
                input.addEventListener('input', updateProgress);
            });
            updateProgress();
        }
        
        // Verificar si hay tiempo límite
        if (config.timeLimit > 0 && isAlumno) {
            startTimer(config.timeLimit);
        }
        
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    };
    
    // ============================================================
    // FUNCIONES AUXILIARES
    // ============================================================
    
    function getTypeLabel(type) {
        const labels = {
            'text': 'Completar',
            'textarea': 'Desarrollo',
            'radio': 'Opción única',
            'checkbox': 'Múltiple',
            'truefalse': 'V/F',
            'match': 'Relacionar',
            'order': 'Ordenar',
            'identify': 'Identificar',
            'number': 'Número',
            'image': 'Imagen'
        };
        return labels[type] || type;
    }
    
    function updateProgress() {
        const questions = document.querySelectorAll('.form-view-question');
        const total = questions.length;
        if (total === 0) return;
        
        let answered = 0;
        questions.forEach(q => {
            const inputs = q.querySelectorAll('input:not([type="hidden"]):not([name="formId"]), textarea, select');
            let hasAnswer = false;
            inputs.forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) hasAnswer = true;
                } else if (input.tagName === 'SELECT') {
                    if (input.value !== '') hasAnswer = true;
                } else {
                    if (input.value.trim() !== '') hasAnswer = true;
                }
            });
            if (hasAnswer) answered++;
        });
        
        const percentage = Math.round((answered / total) * 100);
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressText) progressText.textContent = percentage + '%';
    }
    
    function startTimer(minutes) {
        const totalSeconds = minutes * 60;
        let remaining = totalSeconds;
        
        const timerDiv = document.createElement('div');
        timerDiv.className = 'form-view-timer';
        timerDiv.id = 'formTimer';
        timerDiv.innerHTML = `
            <span class="timer-icon">⏱️</span>
            <span class="timer-text" id="timerDisplay">${formatTime(remaining)}</span>
            <span class="timer-warning" id="timerWarning" style="display:none;">⚠️ Tiempo casi agotado</span>
        `;
        
        const header = document.querySelector('.form-view-header');
        if (header) {
            header.insertBefore(timerDiv, header.querySelector('.form-view-meta'));
        }
        
        const timerInterval = setInterval(() => {
            remaining--;
            const display = document.getElementById('timerDisplay');
            const warning = document.getElementById('timerWarning');
            
            if (display) display.textContent = formatTime(remaining);
            
            if (remaining <= 60 && warning) {
                warning.style.display = 'inline';
                if (remaining % 10 === 0) {
                    Utils.showNotification(`⏱️ Tiempo restante: ${formatTime(remaining)}`, 'warning');
                }
            }
            
            if (remaining <= 0) {
                clearInterval(timerInterval);
                Utils.showNotification('⏱️ Tiempo agotado. El formulario se enviará automáticamente.', 'error');
                document.getElementById('responseForm')?.submit();
            }
        }, 1000);
        
        // Guardar intervalo para limpiar si es necesario
        window._formTimerInterval = timerInterval;
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // ============================================================
    // ENVIAR RESPUESTA
    // ============================================================
    
    window.submitResponse = async function(event) {
        event.preventDefault();
        
        const form = event.target;
        const formId = form.querySelector('[name="formId"]').value;
        const formData = new FormData(form);
        
        // Limpiar timer si existe
        if (window._formTimerInterval) {
            clearInterval(window._formTimerInterval);
            window._formTimerInterval = null;
        }
        
        const respondentName = formData.get('respondent_name');
        if (!respondentName || respondentName.trim() === '') {
            Utils.showNotification('Por favor, introduce tu nombre', 'warning');
            document.getElementById('respondentName')?.focus();
            return;
        }
        
        // Guardar nombre en sesión para futuras respuestas
        sessionStorage.setItem('formpro_username', respondentName.trim());
        
        // Verificar si el usuario es alumno y tiene límite de intentos
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        const isAlumno = user?.role === 'alumno' || user?.role === 'student';
        const formObj = window.formsManager.cache.find(f => f.id === formId);
        
        if (isAlumno && formObj) {
            const config = formObj.config || {};
            const maxAttempts = config.maxAttempts || 1;
            
            if (maxAttempts > 0) {
                const existingResponses = await window.responsesManager.getByForm(formId);
                const userResponses = existingResponses.filter(r => {
                    const nameAnswer = r.answers.find(a => a.question === 'respondent_name');
                    return nameAnswer?.value === respondentName.trim();
                });
                
                if (userResponses.length >= maxAttempts) {
                    Utils.showNotification(`Has alcanzado el límite de ${maxAttempts} intentos`, 'error');
                    return;
                }
            }
            
            // Verificar si ya respondió (si no permite múltiples)
            if (!formObj.allowmultiple) {
                const existingResponses = await window.responsesManager.getByForm(formId);
                const userResponses = existingResponses.filter(r => {
                    const nameAnswer = r.answers.find(a => a.question === 'respondent_name');
                    return nameAnswer?.value === respondentName.trim();
                });
                
                if (userResponses.length > 0) {
                    Utils.showNotification('Ya has completado este formulario', 'error');
                    return;
                }
            }
        }
        
        // Recoger respuestas
        const answers = [];
        let hasAnswers = false;
        
        for (let [key, value] of formData.entries()) {
            if (key !== 'formId' && key !== 'respondent_name' && value) {
                answers.push({ question: key, value: value });
                hasAnswers = true;
            }
        }
        
        // Verificar preguntas obligatorias
        const questions = formObj?.questions || [];
        let missingRequired = false;
        
        questions.forEach((q, index) => {
            if (q.required) {
                const answer = answers.find(a => a.question === `q${index}`);
                if (!answer || !answer.value) {
                    missingRequired = true;
                    // Resaltar pregunta
                    const questionEl = document.querySelector(`.form-view-question[data-index="${index}"]`);
                    if (questionEl) {
                        questionEl.classList.add('form-view-question-error');
                        setTimeout(() => {
                            questionEl.classList.remove('form-view-question-error');
                        }, 3000);
                    }
                }
            }
        });
        
        if (missingRequired) {
            Utils.showNotification('Por favor, responde todas las preguntas obligatorias', 'warning');
            return;
        }
        
        if (!hasAnswers) {
            Utils.showNotification('Responde al menos una pregunta', 'warning');
            return;
        }
        
        // Añadir nombre al inicio
        answers.unshift({ question: 'respondent_name', value: respondentName.trim() });
        
        // Mostrar loading
        const submitBtn = document.getElementById('submitFormBtn');
        const originalText = submitBtn?.innerHTML || 'Enviar';
        if (submitBtn) {
            submitBtn.innerHTML = '<div class="loading-spinner-sm"></div> Enviando...';
            submitBtn.disabled = true;
        }
        
        try {
            await window.responsesManager.save(formId, answers);
            
            // Mostrar éxito
            const container = document.getElementById('formViewContent');
            container.innerHTML = `
                <div class="form-view-success">
                    <div class="form-view-success-icon">✅</div>
                    <h2 class="form-view-success-title">¡Formulario completado!</h2>
                    <p class="form-view-success-text">Gracias por completar el formulario, <strong>${Utils.escapeHtml(respondentName.trim())}</strong></p>
                    <p class="form-view-success-hint">Tus respuestas han sido guardadas correctamente</p>
                    ${isAlumno ? `
                    <div class="form-view-success-actions">
                        <button onclick="showView('student')" class="btn-primary mt-4">
                            <i data-lucide="graduation-cap" class="w-4 h-4"></i>
                            Ver mi panel
                        </button>
                    </div>
                    ` : `
                    <button onclick="showView('dashboard')" class="btn-primary mt-4">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        Volver
                    </button>
                    `}
                </div>
            `;
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            Utils.showNotification('Formulario completado correctamente', 'success');
            
        } catch (error) {
            console.error('Error al enviar:', error);
            Utils.showNotification('Error al enviar: ' + error.message, 'error');
            
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    };
    
    // ============================================================
    // LIMPIAR TIMER AL CAMBIAR DE VISTA
    // ============================================================
    
    // Observar cambios de vista para limpiar timer
    const originalShowView = window.showView;
    if (originalShowView) {
        window.showView = function(view, data) {
            // Limpiar timer si existe
            if (window._formTimerInterval) {
                clearInterval(window._formTimerInterval);
                window._formTimerInterval = null;
            }
            originalShowView(view, data);
        };
    }
    
    console.log('✅ Form View con permisos cargado');
    
})();