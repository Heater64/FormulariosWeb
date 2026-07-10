// ============================================================
// RESPONSES-VIEW - Sistema de corrección manual simplificado
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // CONFIGURACIÓN DE NOTAS ESPAÑOLAS
    // ============================================================
    
    const GRADE_CONFIG = {
        thresholds: [
            { min: 9.0, label: 'Sobresaliente', emoji: '🌟', color: '#10B981' },
            { min: 7.0, label: 'Notable', emoji: '📘', color: '#3B82F6' },
            { min: 5.0, label: 'Bien', emoji: '📗', color: '#F59E0B' },
            { min: 4.0, label: 'Suficiente', emoji: '📙', color: '#F97316' },
            { min: 0.0, label: 'Insuficiente', emoji: '📕', color: '#EF4444' }
        ],
        decimals: 2,
        defaultQuestionScore: 1.0
    };
    
    function getGradeInfo(score, total) {
        if (total === 0) return { label: 'Sin evaluar', emoji: '⏳', color: '#94A3B8' };
        const grade = Math.round(((score / total) * 10) * 100) / 100;
        let info = GRADE_CONFIG.thresholds.find(t => grade >= t.min);
        if (!info) info = GRADE_CONFIG.thresholds[GRADE_CONFIG.thresholds.length - 1];
        return {
            ...info,
            grade: grade,
            percentage: Math.round((score / total) * 100),
            score: score,
            total: total
        };
    }
    
    function formatGrade(grade) {
        return grade.toFixed(GRADE_CONFIG.decimals);
    }
    
    // ============================================================
    // RENDER RESPUESTAS - VERSIÓN SIMPLIFICADA
    // ============================================================
    
    let currentFormId = null;
    let currentForm = null;
    
    window.renderResponses = async function(formId) {
        currentFormId = formId;
        const form = window.formsManager.cache.find(f => f.id === formId);
        currentForm = form;
        
        if (!form) {
            document.getElementById('responsesContent').innerHTML = `
                <div class="card text-center py-12 text-red-400">
                    <p>⚠️ Formulario no encontrado</p>
                </div>
            `;
            return;
        }
        
        const responses = await window.responsesManager.getByForm(formId);
        const questions = form.questions || [];
        const totalQuestions = questions.length;
        const config = form.config || {};
        
        const correctedCount = responses.filter(r => r.correction?.completed).length;
        const pendingCount = responses.length - correctedCount;
        
        // Calcular promedio de notas
        let avgGrade = 0;
        let passRate = 0;
        if (correctedCount > 0) {
            const grades = responses
                .filter(r => r.correction?.completed)
                .map(r => {
                    const total = r.correction?.total || totalQuestions;
                    const score = r.correction?.score || 0;
                    return total > 0 ? (score / total) * 10 : 0;
                });
            avgGrade = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length * 100) / 100;
            passRate = Math.round((grades.filter(g => g >= 5).length / grades.length) * 100);
        }
        
        let html = `
            <!-- HEADER - SIN BOTÓN EXPORTAR -->
            <div class="responses-header">
                <h1 class="page-title" style="font-size:24px;">
                    <i data-lucide="clipboard-list" class="w-6 h-6 text-purple-500"></i>
                    Corrección de Exámenes - ${Utils.escapeHtml(form.title)}
                </h1>
            </div>
            
            <!-- ESTADÍSTICAS -->
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${responses.length}</span>
                    <span class="stat-label">Total respuestas</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number ${pendingCount > 0 ? 'text-orange-500' : 'text-green-500'}">${pendingCount}</span>
                    <span class="stat-label">Pendientes</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number text-green-500">${correctedCount}</span>
                    <span class="stat-label">Corregidas</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number ${passRate >= 70 ? 'text-green-500' : passRate >= 40 ? 'text-orange-500' : 'text-red-500'}">${passRate}%</span>
                    <span class="stat-label">Aprobados</span>
                </div>
            </div>
            
            <!-- CONFIGURACIÓN DEL EXAMEN -->
            <div class="exam-info-banner">
                <div class="exam-info-grid">
                    ${config.timeLimit > 0 ? `<span class="exam-info-item">⏱️ ${config.timeLimit} min</span>` : ''}
                    ${config.maxAttempts > 1 ? `<span class="exam-info-item">🔄 ${config.maxAttempts} intentos</span>` : ''}
                    ${config.shuffleQuestions ? `<span class="exam-info-item">🎲 Preguntas aleatorias</span>` : ''}
                    ${config.shuffleOptions ? `<span class="exam-info-item">🎲 Opciones aleatorias</span>` : ''}
                    ${config.onePerPage ? `<span class="exam-info-item">📄 Una por página</span>` : ''}
                    ${config.showProgress ? `<span class="exam-info-item">📊 Progreso visible</span>` : ''}
                </div>
            </div>
        `;
        
        if (responses.length === 0) {
            html += `<div class="empty-state-card">📭 Aún no hay respuestas para este formulario</div>`;
        } else {
            html += `<div class="responses-list">`;
            
            responses.forEach((response, responseIndex) => {
                const nameAnswer = response.answers.find(a => a.question === 'respondent_name');
                const displayName = nameAnswer ? nameAnswer.value : 'Anónimo';
                const isCorrected = response.correction?.completed || false;
                const correction = response.correction || {};
                
                let gradeInfo = null;
                let scoreDisplay = '⏳ Pendiente';
                let scoreClass = 'badge-orange';
                
                if (isCorrected) {
                    const total = correction.total || totalQuestions;
                    const score = correction.score || 0;
                    gradeInfo = getGradeInfo(score, total);
                    scoreDisplay = `${formatGrade(gradeInfo.grade)} / 10`;
                    scoreClass = gradeInfo.grade >= 5 ? 'badge-green' : 'badge-red';
                }
                
                html += `
                    <div class="response-card ${isCorrected ? 'corrected' : 'pending'}" id="response-${response.id}">
                        <!-- CABECERA -->
                        <div class="response-card-header">
                            <div class="response-user-info">
                                <div class="response-avatar">${displayName.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="response-card-name">${Utils.escapeHtml(displayName)}</div>
                                    <div class="response-card-date">${Utils.formatDate(response.created_at)}</div>
                                </div>
                            </div>
                            <div class="response-status">
                                ${isCorrected ? `
                                    <span class="badge ${scoreClass}">${scoreDisplay}</span>
                                    <span class="badge ${scoreClass}">${gradeInfo?.emoji || ''} ${gradeInfo?.label || ''}</span>
                                    <span class="badge badge-green">✅ Corregido</span>
                                ` : `
                                    <span class="badge badge-orange">⏳ Pendiente</span>
                                `}
                            </div>
                        </div>
                        
                        <!-- RESPUESTAS -->
                        <div class="response-answers-grid">
                            ${response.answers.filter(a => a.question !== 'respondent_name').map((a, i) => {
                                const q = questions[i] || { title: `Pregunta ${i + 1}` };
                                const isCorrect = correction?.answers && correction.answers[i] !== undefined 
                                    ? correction.answers[i] 
                                    : null;
                                const score = correction?.scores && correction.scores[i] !== undefined
                                    ? correction.scores[i]
                                    : null;
                                
                                let statusIcon = '';
                                let statusClass = '';
                                let scoreText = '';
                                
                                if (isCorrect === true) {
                                    statusIcon = '✅';
                                    statusClass = 'correct-answer';
                                    scoreText = score !== null ? `${score.toFixed(2)}` : '1.00';
                                } else if (isCorrect === false) {
                                    statusIcon = '❌';
                                    statusClass = 'incorrect-answer';
                                    scoreText = '0.00';
                                } else if (score !== null && score > 0 && score < 1) {
                                    statusIcon = '🟡';
                                    statusClass = 'partial-answer';
                                    scoreText = `${score.toFixed(2)}`;
                                } else {
                                    statusIcon = '⬜';
                                    statusClass = 'pending-answer';
                                    scoreText = '—';
                                }
                                
                                return `
                                    <div class="response-answer-item ${statusClass}">
                                        <div class="response-answer-question">
                                            <span class="response-q-number">${i + 1}.</span>
                                            ${Utils.escapeHtml(q.title || 'Sin título')}
                                        </div>
                                        <div class="response-answer-value">
                                            <span class="response-status-icon">${statusIcon}</span>
                                            ${Utils.escapeHtml(a.value) || '␣ (sin respuesta)'}
                                            <span class="response-score">${scoreText}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <!-- COMENTARIO DE CORRECCIÓN -->
                        ${isCorrected && correction.comment ? `
                            <div class="response-correction-comment">
                                <span class="comment-icon">💬</span>
                                <span>${Utils.escapeHtml(correction.comment)}</span>
                            </div>
                        ` : ''}
                        
                        <!-- ACCIONES - SOLO CORREGIR Y EXPORTAR -->
                        <div class="response-actions">
                            <button onclick="openCorrectionModal('${response.id}', '${formId}')" class="btn-primary">
                                <i data-lucide="${isCorrected ? 'eye' : 'edit-3'}" class="w-4 h-4"></i>
                                ${isCorrected ? 'Ver corrección' : 'Corregir examen'}
                            </button>
                            ${isCorrected ? `
                                <button onclick="exportCorrection('${response.id}')" class="btn-secondary">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                    Exportar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        document.getElementById('responsesContent').innerHTML = html;
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    };
    
    // ============================================================
    // MODAL DE CORRECCIÓN MANUAL
    // ============================================================
    
    window.openCorrectionModal = function(responseId, formId) {
        const response = window.responsesManager.cache.find(r => r.id === responseId);
        if (!response) {
            Utils.showNotification('Error: Respuesta no encontrada', 'error');
            return;
        }
        
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) {
            Utils.showNotification('Error: Formulario no encontrado', 'error');
            return;
        }
        
        const questions = form.questions || [];
        const answers = response.answers.filter(a => a.question !== 'respondent_name');
        const nameAnswer = response.answers.find(a => a.question === 'respondent_name');
        const studentName = nameAnswer ? nameAnswer.value : 'Anónimo';
        const isExisting = response.correction?.completed || false;
        const existingCorrection = response.correction || {};
        
        const overlay = document.createElement('div');
        overlay.id = 'correctionModalOverlay';
        overlay.className = 'correction-modal-overlay';
        
        const scoreOptions = [0, 0.25, 0.5, 0.75, 1];
        
        overlay.innerHTML = `
            <div class="correction-modal">
                <div class="correction-modal-header">
                    <div>
                        <h2>${isExisting ? '📋 Ver corrección' : '✏️ Corregir examen'}</h2>
                        <p class="correction-student-name">
                            <strong>${Utils.escapeHtml(studentName)}</strong>
                            <span class="correction-date">${Utils.formatDate(response.created_at)}</span>
                        </p>
                    </div>
                    <button onclick="closeCorrectionModal()" class="correction-modal-close">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                
                <div class="correction-modal-body">
                    <form id="correctionForm" onsubmit="saveCorrection(event, '${responseId}', '${formId}')">
                        <input type="hidden" name="responseId" value="${responseId}" />
                        <input type="hidden" name="formId" value="${formId}" />
                        
                        <!-- PREGUNTAS -->
                        <div class="correction-questions-list">
                            ${answers.map((answer, index) => {
                                const q = questions[index] || { title: `Pregunta ${index + 1}`, type: 'text' };
                                const existingCorrect = isExisting && existingCorrection.answers && existingCorrection.answers[index] !== undefined 
                                    ? existingCorrection.answers[index] 
                                    : null;
                                const existingScore = isExisting && existingCorrection.scores && existingCorrection.scores[index] !== undefined
                                    ? existingCorrection.scores[index]
                                    : null;
                                
                                return `
                                    <div class="correction-question-item">
                                        <div class="correction-question-header">
                                            <span class="correction-q-number">${index + 1}.</span>
                                            <span class="correction-q-title">${Utils.escapeHtml(q.title || 'Sin título')}</span>
                                            ${q.required ? '<span class="badge badge-red">Obligatoria</span>' : ''}
                                        </div>
                                        
                                        <div class="correction-student-answer">
                                            <span class="answer-label">Respuesta del estudiante:</span>
                                            <span class="answer-text">${Utils.escapeHtml(answer.value) || '␣ Sin respuesta'}</span>
                                        </div>
                                        
                                        <!-- Puntuación -->
                                        <div class="correction-score-selector">
                                            <label class="score-label">Puntuación:</label>
                                            <div class="score-options">
                                                ${scoreOptions.map(opt => `
                                                    <label class="score-option ${existingScore === opt ? 'selected' : ''}">
                                                        <input type="radio" name="score_${index}" value="${opt}" ${existingScore === opt ? 'checked' : ''} />
                                                        <span>${opt.toFixed(2)}</span>
                                                    </label>
                                                `).join('')}
                                                <label class="score-option ${existingScore !== null && !scoreOptions.includes(existingScore) ? 'selected' : ''}">
                                                    <input type="radio" name="score_${index}" value="custom" ${existingScore !== null && !scoreOptions.includes(existingScore) ? 'checked' : ''} />
                                                    <input type="number" class="score-custom-input" 
                                                           value="${existingScore !== null && !scoreOptions.includes(existingScore) ? existingScore : ''}" 
                                                           placeholder="0.00" 
                                                           min="0" max="1" step="0.01"
                                                           onchange="updateCustomScore(this, ${index})" />
                                                </label>
                                            </div>
                                        </div>
                                        
                                        <!-- Estado de corrección -->
                                        <div class="correction-status">
                                            <label class="correction-option correct ${existingCorrect === true ? 'selected' : ''}">
                                                <input type="radio" name="status_${index}" value="true" ${existingCorrect === true ? 'checked' : ''} />
                                                <span class="option-indicator">✅</span>
                                                <span class="option-label">Correcta</span>
                                            </label>
                                            <label class="correction-option incorrect ${existingCorrect === false ? 'selected' : ''}">
                                                <input type="radio" name="status_${index}" value="false" ${existingCorrect === false ? 'checked' : ''} />
                                                <span class="option-indicator">❌</span>
                                                <span class="option-label">Incorrecta</span>
                                            </label>
                                            <label class="correction-option partial ${existingCorrect === null && existingScore !== null && existingScore > 0 ? 'selected' : ''}">
                                                <input type="radio" name="status_${index}" value="partial" ${existingCorrect === null && existingScore !== null && existingScore > 0 ? 'checked' : ''} />
                                                <span class="option-indicator">🟡</span>
                                                <span class="option-label">Parcial</span>
                                            </label>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <!-- RESUMEN DE PUNTUACIÓN -->
                        <div class="correction-score-summary">
                            <div class="score-summary-header">
                                <span class="score-summary-title">📊 Resumen</span>
                            </div>
                            <div class="score-summary-grid">
                                <div class="score-summary-item">
                                    <span class="score-summary-label">Total obtenido</span>
                                    <span class="score-summary-value" id="totalObtained">0.00</span>
                                </div>
                                <div class="score-summary-item">
                                    <span class="score-summary-label">Total posible</span>
                                    <span class="score-summary-value" id="totalPossible">${answers.length}.00</span>
                                </div>
                                <div class="score-summary-item">
                                    <span class="score-summary-label">Nota final</span>
                                    <span class="score-summary-value" id="finalGrade">0.00 / 10</span>
                                </div>
                                <div class="score-summary-item">
                                    <span class="score-summary-label">Calificación</span>
                                    <span class="score-summary-value" id="gradeLabel">⏳ Pendiente</span>
                                </div>
                            </div>
                            <div class="score-summary-bar">
                                <div class="score-summary-bar-fill" id="scoreBarFill" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <!-- COMENTARIO -->
                        <div class="correction-comment-section">
                            <label for="correctionComment">💬 Comentario</label>
                            <textarea id="correctionComment" 
                                      name="comment" 
                                      class="comment-textarea" 
                                      rows="3" 
                                      placeholder="Escribe aquí tu retroalimentación...">${isExisting ? existingCorrection.comment || '' : ''}</textarea>
                        </div>
                        
                        <!-- ACCIONES -->
                        <div class="correction-actions">
                            <button type="button" onclick="closeCorrectionModal()" class="btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-primary">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                ${isExisting ? 'Actualizar corrección' : 'Guardar corrección'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
        
        // Actualizar resumen en tiempo real
        const formElement = document.getElementById('correctionForm');
        const inputs = formElement.querySelectorAll('input[type="radio"], input.score-custom-input');
        inputs.forEach(input => {
            input.addEventListener('change', updateScoreSummary);
            input.addEventListener('input', updateScoreSummary);
        });
        
        function updateScoreSummary() {
            const totalQuestions = answers.length;
            let totalObtained = 0;
            
            document.querySelectorAll('.correction-question-item').forEach((item, idx) => {
                const statusRadios = item.querySelectorAll('input[name^="status_"]');
                const scoreRadios = item.querySelectorAll('input[name^="score_"]');
                const customInput = item.querySelector('.score-custom-input');
                
                let status = null;
                statusRadios.forEach(r => {
                    if (r.checked) status = r.value;
                });
                
                let score = 0;
                scoreRadios.forEach(r => {
                    if (r.checked) {
                        if (r.value === 'custom' && customInput) {
                            score = parseFloat(customInput.value) || 0;
                        } else {
                            score = parseFloat(r.value) || 0;
                        }
                    }
                });
                
                if (status === 'true') score = 1;
                if (status === 'false') score = 0;
                
                totalObtained += Math.min(Math.max(score, 0), 1);
            });
            
            totalObtained = Math.round(totalObtained * 100) / 100;
            const totalPossible = totalQuestions;
            const grade = totalPossible > 0 ? (totalObtained / totalPossible) * 10 : 0;
            const gradeInfo = getGradeInfo(totalObtained, totalPossible);
            
            document.getElementById('totalObtained').textContent = totalObtained.toFixed(2);
            document.getElementById('totalPossible').textContent = totalPossible.toFixed(2);
            document.getElementById('finalGrade').textContent = `${grade.toFixed(2)} / 10`;
            document.getElementById('gradeLabel').textContent = `${gradeInfo.emoji} ${gradeInfo.label}`;
            document.getElementById('gradeLabel').style.color = gradeInfo.color;
            document.getElementById('scoreBarFill').style.width = `${Math.min(grade * 10, 100)}%`;
            document.getElementById('scoreBarFill').style.background = gradeInfo.color;
        }
        
        setTimeout(updateScoreSummary, 100);
    };
    
    // ============================================================
    // GUARDAR CORRECCIÓN
    // ============================================================
    
    window.saveCorrection = async function(event, responseId, formId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const formObj = window.formsManager.cache.find(f => f.id === formId);
        const totalQuestions = formObj ? formObj.questions.length : 0;
        
        const answers = [];
        const scores = [];
        const details = [];
        let totalScore = 0;
        
        const questionItems = form.querySelectorAll('.correction-question-item');
        questionItems.forEach((item, idx) => {
            const statusRadios = item.querySelectorAll('input[name^="status_"]');
            const scoreRadios = item.querySelectorAll('input[name^="score_"]');
            const customInput = item.querySelector('.score-custom-input');
            
            let status = null;
            statusRadios.forEach(r => {
                if (r.checked) status = r.value;
            });
            
            let score = 0;
            scoreRadios.forEach(r => {
                if (r.checked) {
                    if (r.value === 'custom' && customInput) {
                        score = parseFloat(customInput.value) || 0;
                    } else {
                        score = parseFloat(r.value) || 0;
                    }
                }
            });
            
            if (status === 'true') {
                score = 1;
                answers.push(true);
            } else if (status === 'false') {
                score = 0;
                answers.push(false);
            } else if (status === 'partial') {
                score = Math.min(Math.max(score, 0.01), 0.99);
                answers.push(null);
            } else {
                score = 0;
                answers.push(null);
            }
            
            scores.push(Math.round(score * 100) / 100);
            totalScore += score;
            details.push(`P${idx+1}: ${score.toFixed(2)}`);
        });
        
        const comment = formData.get('comment') || '';
        const gradeInfo = getGradeInfo(totalScore, totalQuestions);
        
        // Asegurar que los valores null se conviertan a false para JSON
        const cleanAnswers = answers.map(a => a === null ? false : a);
        
        const correction = {
            answers: cleanAnswers,
            scores: scores,
            details: details,
            score: Math.round(totalScore * 100) / 100,
            total: totalQuestions,
            comment: comment.trim() || `Nota: ${formatGrade(gradeInfo.grade)}/10 - ${gradeInfo.emoji} ${gradeInfo.label}`,
            completed: true,
            correctedAt: new Date().toISOString()
        };
        
        try {
            await window.responsesManager.correct(responseId, correction);
            Utils.showNotification(`✅ Corrección guardada. Nota: ${formatGrade(gradeInfo.grade)}/10 - ${gradeInfo.emoji} ${gradeInfo.label}`, 'success');
            closeCorrectionModal();
            window.renderResponses(formId);
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('❌ Error al guardar: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // FUNCIONES AUXILIARES
    // ============================================================
    
    window.updateCustomScore = function(input, index) {
        setTimeout(() => {
            const event = new Event('change');
            document.getElementById('correctionForm')?.dispatchEvent(event);
        }, 50);
    };
    
    window.closeCorrectionModal = function() {
        const overlay = document.getElementById('correctionModalOverlay');
        if (overlay) {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    };
    
    window.goBack = function() {
        window.showView('dashboard');
    };
    
    // ============================================================
// EXPORTAR CORRECCIÓN INDIVIDUAL - FORMATO LIMPIO
// ============================================================

window.exportCorrection = function(responseId) {
    const response = window.responsesManager.cache.find(r => r.id === responseId);
    if (!response) {
        Utils.showNotification('Error: Respuesta no encontrada', 'error');
        return;
    }
    
    const form = window.formsManager.cache.find(f => f.id === response.form_id);
    if (!form) return;
    
    const nameAnswer = response.answers.find(a => a.question === 'respondent_name');
    const studentName = nameAnswer ? nameAnswer.value : 'Anónimo';
    const correction = response.correction || {};
    const gradeInfo = getGradeInfo(correction.score || 0, correction.total || 0);
    
    let text = `=== CORRECCIÓN DE EXAMEN ===\n\n`;
    text += `📚 Formulario: ${form.title}\n`;
    text += `👤 Estudiante: ${studentName}\n`;
    text += `📅 Fecha: ${Utils.formatDate(response.created_at)}\n`;
    text += `\n--- RESULTADOS ---\n`;
    text += `📊 Nota: ${gradeInfo.grade.toFixed(2)} / 10\n`;
    text += `📊 Calificación: ${gradeInfo.emoji} ${gradeInfo.label}\n\n`;
    text += `--- RESPUESTAS ---\n\n`;
    
    const questions = form.questions || [];
    const answers = response.answers.filter(a => a.question !== 'respondent_name');
    const scores = correction.scores || [];
    
    answers.forEach((a, i) => {
        const q = questions[i] || { title: `Pregunta ${i + 1}` };
        const score = scores[i] !== undefined ? scores[i] : 0;
        const isCorrect = correction.answers && correction.answers[i] !== undefined ? correction.answers[i] : null;
        let status = '⬜ PENDIENTE';
        if (isCorrect === true) status = '✅ CORRECTA';
        else if (isCorrect === false) status = '❌ INCORRECTA';
        else if (score > 0 && score < 1) status = `🟡 PARCIAL (${score.toFixed(2)})`;
        
        text += `${i + 1}. ${q.title}\n`;
        text += `   Respuesta: ${a.value || '(sin respuesta)'}\n`;
        text += `   Puntuación: ${score.toFixed(2)} / 1.00\n`;
        text += `   Estado: ${status}\n\n`;
    });
    
    if (correction.comment) {
        text += `--- COMENTARIO ---\n${correction.comment}\n\n`;
    }
    
    // Crear y descargar archivo
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correccion-${studentName}-${form.slug || 'examen'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    Utils.showNotification('📄 Corrección exportada', 'success');
};
    
    // ============================================================
    // CERRAR MODAL CON ESC
    // ============================================================
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeCorrectionModal();
        }
    });
    
    console.log('✅ Responses View simplificado cargado');
    
})();