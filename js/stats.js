// ============================================================
// STATS - Estadísticas avanzadas
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // ESTADÍSTICAS DE FORMULARIO
    // ============================================================
    
    window.getFormStats = async function(formId) {
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) return null;
        
        const responses = await window.responsesManager.getByForm(formId);
        const questions = form.questions || [];
        const totalQuestions = questions.length;
        
        // Respuestas corregidas
        const corrected = responses.filter(r => r.correction?.completed);
        const correctedCount = corrected.length;
        const totalResponses = responses.length;
        
        // Calcular notas
        const grades = corrected.map(r => {
            const score = r.correction?.score || 0;
            const total = r.correction?.total || totalQuestions;
            return total > 0 ? (score / total) * 10 : 0;
        });
        
        // Estadísticas de notas
        const stats = {
            total: totalResponses,
            corrected: correctedCount,
            pending: totalResponses - correctedCount,
            
            // Notas
            grades: grades,
            average: grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length * 100) / 100 : 0,
            max: grades.length > 0 ? Math.max(...grades) : 0,
            min: grades.length > 0 ? Math.min(...grades) : 0,
            
            // Desviación estándar
            standardDeviation: grades.length > 0 ? calculateStdDev(grades) : 0,
            
            // Porcentaje de aprobados (>= 5)
            passRate: grades.length > 0 ? Math.round((grades.filter(g => g >= 5).length / grades.length) * 100) : 0,
            
            // Análisis por pregunta
            questionStats: analyzeQuestions(questions, responses),
            
            // Tiempo medio (si hay timestamps)
            averageTime: calculateAverageTime(responses),
            
            // Evolución
            evolution: calculateEvolution(responses)
        };
        
        return stats;
    };
    
    // ============================================================
    // FUNCIONES DE CÁLCULO
    // ============================================================
    
    function calculateStdDev(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.round(Math.sqrt(variance) * 100) / 100;
    }
    
    function analyzeQuestions(questions, responses) {
        return questions.map((q, index) => {
            let correct = 0;
            let incorrect = 0;
            let partial = 0;
            let total = 0;
            
            responses.forEach(r => {
                const correction = r.correction;
                if (correction?.answers && correction.answers[index] !== undefined) {
                    total++;
                    if (correction.answers[index] === true) correct++;
                    else if (correction.answers[index] === false) incorrect++;
                    else partial++;
                }
            });
            
            return {
                question: q.title || `Pregunta ${index + 1}`,
                type: q.type || 'text',
                correct: correct,
                incorrect: incorrect,
                partial: partial,
                total: total,
                successRate: total > 0 ? Math.round((correct / total) * 100) : 0,
                // Identificar pregunta más fallada/acertada
                isMostFailed: false,
                isMostPassed: false
            };
        });
    }
    
    function calculateAverageTime(responses) {
        // Si las respuestas tienen timestamps de inicio y fin
        const times = responses
            .filter(r => r.started_at && r.completed_at)
            .map(r => {
                const start = new Date(r.started_at);
                const end = new Date(r.completed_at);
                return (end - start) / 1000; // segundos
            });
        
        if (times.length === 0) return 0;
        return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }
    
    function calculateEvolution(responses) {
        // Agrupar por fecha
        const grouped = {};
        responses.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString('es-ES');
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(r);
        });
        
        const evolution = Object.entries(grouped).map(([date, items]) => {
            const corrected = items.filter(i => i.correction?.completed);
            const grades = corrected.map(c => {
                const score = c.correction?.score || 0;
                const total = c.correction?.total || 1;
                return total > 0 ? (score / total) * 10 : 0;
            });
            const avg = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length * 100) / 100 : 0;
            
            return {
                date: date,
                count: items.length,
                averageGrade: avg,
                corrected: corrected.length
            };
        });
        
        return evolution.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // ============================================================
    // RENDER ESTADÍSTICAS
    // ============================================================
    
    window.renderStats = async function(formId) {
        const stats = await window.getFormStats(formId);
        if (!stats) return '<p class="text-gray-400">No hay datos suficientes</p>';
        
        const form = window.formsManager.cache.find(f => f.id === formId);
        
        // Identificar pregunta más fallada y más acertada
        const qStats = stats.questionStats || [];
        if (qStats.length > 0) {
            const maxSuccess = Math.max(...qStats.map(q => q.successRate));
            const minSuccess = Math.min(...qStats.map(q => q.successRate));
            qStats.forEach(q => {
                q.isMostPassed = q.successRate === maxSuccess && maxSuccess > 0;
                q.isMostFailed = q.successRate === minSuccess && minSuccess < 100;
            });
        }
        
        let html = `
            <div class="stats-dashboard">
                <!-- Resumen -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${stats.total}</span>
                        <span class="stat-label">Total respuestas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number ${stats.pending > 0 ? 'text-orange-500' : 'text-green-500'}">${stats.pending}</span>
                        <span class="stat-label">Pendientes</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number text-green-500">${stats.corrected}</span>
                        <span class="stat-label">Corregidas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number ${stats.passRate >= 70 ? 'text-green-500' : stats.passRate >= 40 ? 'text-orange-500' : 'text-red-500'}">${stats.passRate}%</span>
                        <span class="stat-label">Aprobados</span>
                    </div>
                </div>
                
                <!-- Notas -->
                <div class="stats-section">
                    <h3 class="stats-section-title">📊 Estadísticas de notas</h3>
                    <div class="stats-grid-4">
                        <div class="stat-card-sm">
                            <span class="stat-label">Nota media</span>
                            <span class="stat-number text-blue-500">${stats.average.toFixed(2)}</span>
                        </div>
                        <div class="stat-card-sm">
                            <span class="stat-label">Nota máxima</span>
                            <span class="stat-number text-green-500">${stats.max.toFixed(2)}</span>
                        </div>
                        <div class="stat-card-sm">
                            <span class="stat-label">Nota mínima</span>
                            <span class="stat-number text-red-500">${stats.min.toFixed(2)}</span>
                        </div>
                        <div class="stat-card-sm">
                            <span class="stat-label">Desviación</span>
                            <span class="stat-number text-purple-500">${stats.standardDeviation.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Evolución -->
                ${stats.evolution && stats.evolution.length > 0 ? `
                    <div class="stats-section">
                        <h3 class="stats-section-title">📈 Evolución de resultados</h3>
                        <div class="evolution-chart">
                            ${stats.evolution.map((e, i) => `
                                <div class="evolution-bar-container">
                                    <div class="evolution-bar-label">${e.date}</div>
                                    <div class="evolution-bar">
                                        <div class="evolution-bar-fill" style="width: ${Math.min(e.averageGrade * 10, 100)}%; background: ${e.averageGrade >= 5 ? '#10B981' : '#EF4444'}"></div>
                                    </div>
                                    <div class="evolution-bar-value">${e.averageGrade.toFixed(1)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Análisis por pregunta -->
                <div class="stats-section">
                    <h3 class="stats-section-title">📝 Análisis por pregunta</h3>
                    <div class="question-stats-list">
                        ${qStats.map((q, i) => `
                            <div class="question-stat-item ${q.isMostPassed ? 'most-passed' : q.isMostFailed ? 'most-failed' : ''}">
                                <div class="question-stat-info">
                                    <span class="question-stat-number">${i + 1}.</span>
                                    <span class="question-stat-title">${Utils.escapeHtml(q.question)}</span>
                                    ${q.isMostPassed ? '<span class="badge badge-green">🏆 Más acertada</span>' : ''}
                                    ${q.isMostFailed ? '<span class="badge badge-red">📉 Más fallada</span>' : ''}
                                </div>
                                <div class="question-stat-bars">
                                    <span class="question-stat-bar correct" style="width: ${q.successRate}%">${q.correct} ✅</span>
                                    <span class="question-stat-bar incorrect" style="width: ${100 - q.successRate}%">${q.incorrect} ❌</span>
                                </div>
                                <div class="question-stat-rate">${q.successRate}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        return html;
    };
    
    // ============================================================
    // GRÁFICOS CON CANVAS (simple)
    // ============================================================
    
    window.renderGradeChart = function(canvasId, grades) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width || 400;
        const height = canvas.height || 200;
        
        ctx.clearRect(0, 0, width, height);
        
        if (grades.length === 0) {
            ctx.fillStyle = '#94A3B8';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No hay datos suficientes', width/2, height/2);
            return;
        }
        
        // Dibujar histograma
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = Math.min(chartWidth / grades.length, 20);
        const maxGrade = Math.max(10, ...grades);
        
        grades.forEach((grade, i) => {
            const x = padding + i * (chartWidth / grades.length) + (chartWidth / grades.length - barWidth) / 2;
            const barHeight = (grade / maxGrade) * chartHeight;
            const y = padding + chartHeight - barHeight;
            
            ctx.fillStyle = grade >= 5 ? '#10B981' : '#EF4444';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Etiqueta
            ctx.fillStyle = '#94A3B8';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(grade.toFixed(1), x + barWidth/2, padding + chartHeight + 16);
        });
    };
    
    console.log('✅ Stats System cargado');
    
})();