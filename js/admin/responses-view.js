// ============================================================
// RESPONSES-VIEW - Corrección de exámenes (admin)
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando ResponsesView System...');
    
    window.renderResponses = async function(formId) {
        const container = document.getElementById('responsesContent');
        if (!container) return;
        
        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesión</p>';
            return;
        }
        
        if (!window.isAdmin()) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="lock"></i></div>
                    <h3 class="empty-state-title">Acceso restringido</h3>
                    <p class="empty-state-subtitle">Solo administradores pueden ver correcciones</p>
                    <a href="dashboard.html" class="btn-primary mt-4">← Volver</a>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        try {
            const form = await window.formsManager.getById(formId);
            if (!form) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                        <h3 class="empty-state-title">Formulario no encontrado</h3>
                        <a href="admin.html" class="btn-primary mt-4">← Volver</a>
                    </div>
                `;
                return;
            }
            
            const responses = await window.responsesManager.getByForm(formId);
            
            if (responses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
                        <h3 class="empty-state-title">No hay respuestas</h3>
                        <p class="empty-state-subtitle">Aún no hay respuestas para este examen</p>
                        <a href="admin.html" class="btn-primary mt-4">← Volver</a>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            const questions = form.questions || [];
            
            let html = `
                <div class="responses-header">
                    <a href="admin.html" class="btn-ghost">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        Volver
                    </a>
                    <h1 class="page-title">
                        <i data-lucide="bar-chart-2" class="w-6 h-6" style="color:var(--accent)"></i>
                        Respuestas - ${window.escapeHtml(form.title)}
                    </h1>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${responses.length}</span>
                        <span class="stat-label">Total respuestas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${responses.filter(r => r.correction?.completed).length}</span>
                        <span class="stat-label">Corregidas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${responses.filter(r => !r.correction?.completed).length}</span>
                        <span class="stat-label">Pendientes</span>
                    </div>
                </div>
                
                <div class="responses-list">
            `;
            
            responses.forEach(response => {
                const nameAnswer = response.answers.find(a => a.question === 'respondent_name');
                const displayName = nameAnswer ? nameAnswer.value : 'Anónimo';
                const isCorrected = response.correction?.completed || false;
                const correction = response.correction || {};
                
                let notaDisplay = 'Pendiente';
                if (isCorrected) {
                    const score = correction.score || 0;
                    const total = correction.total || 0;
                    const nota = total > 0 ? (score / total) * 10 : 0;
                    notaDisplay = `${nota.toFixed(2)} / 10`;
                }
                
                html += `
                    <div class="response-card ${isCorrected ? 'corrected' : 'pending'}">
                        <div class="response-card-header">
                            <div class="response-user-info">
                                <div class="response-avatar">${displayName.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="response-card-name">${window.escapeHtml(displayName)}</div>
                                    <div class="response-card-date">${window.formatDate(response.created_at)}</div>
                                </div>
                            </div>
                            <div class="response-status">
                                <span class="badge ${isCorrected ? 'badge-green' : 'badge-orange'}">
                                    ${isCorrected ? notaDisplay : 'Pendiente'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="response-answers-grid">
                            ${response.answers.filter(a => a.question !== 'respondent_name').map((a, i) => {
                                const q = questions[i] || { title: `Pregunta ${i + 1}` };
                                const isCorrect = correction?.answers && correction.answers[i] !== undefined 
                                    ? correction.answers[i] : null;
                                const score = correction?.scores && correction.scores[i] !== undefined
                                    ? correction.scores[i] : null;
                                
                                let statusClass = 'pending-answer';
                                let statusIcon = '<i data-lucide="circle" class="w-4 h-4"></i>';
                                if (isCorrect === true) {
                                    statusClass = 'correct-answer';
                                    statusIcon = '<i data-lucide="check-circle" class="w-4 h-4"></i>';
                                } else if (isCorrect === false) {
                                    statusClass = 'incorrect-answer';
                                    statusIcon = '<i data-lucide="x-circle" class="w-4 h-4"></i>';
                                }
                                
                                return `
                                    <div class="response-answer-item ${statusClass}">
                                        <span class="response-answer-question">
                                            <span class="response-q-number">${i + 1}.</span>
                                            ${window.escapeHtml(q.title || 'Sin título')}
                                        </span>
                                        <span class="response-answer-value">
                                            <span class="response-status-icon">${statusIcon}</span>
                                            ${window.escapeHtml(a.value) || '(sin respuesta)'}
                                            ${score !== null ? `<span class="response-score">${score.toFixed(2)}</span>` : ''}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <div class="response-actions">
                            <button onclick="window.corregirRespuesta('${response.id}', '${formId}')" class="btn-primary">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                                ${isCorrected ? 'Ver corrección' : 'Corregir'}
                            </button>
                            ${isCorrected ? `<button onclick="window.exportarRespuesta('${response.id}', '${formId}')" class="btn-secondary">
                                <i data-lucide="download" class="w-4 h-4"></i>
                                Exportar
                            </button>` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
            container.innerHTML = html;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('Error cargando respuestas:', error);
        }
    };
    
    window.corregirRespuesta = async function(responseId, formId) {
        if (typeof window.abrirPanelCorreccion === 'function') {
            await window.abrirPanelCorreccion(responseId, formId);
        } else {
            window.showNotification('El panel de correcci\u00f3n no est\u00e1 disponible', 'error');
        }
    };

    // Mantener compatibilidad con funciones antiguas
    window.guardarCorreccion = function() {
        window.showNotification('Usa el panel de correcci\u00f3n moderno', 'info');
    };

    window.cerrarCorreccionModal = function() {
        if (typeof window.cerrarPanelCorreccion === 'function') {
            window.cerrarPanelCorreccion();
        }
    };

    console.log('ResponsesView System cargado');

})();