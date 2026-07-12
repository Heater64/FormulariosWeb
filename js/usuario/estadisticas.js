// ============================================================
// ESTADISTICAS - Estadísticas personales del usuario
// ============================================================

(function() {
    'use strict';
    
    console.log('📦 Inicializando Estadisticas System...');
    
    window.renderEstadisticas = async function() {
        const container = document.getElementById('estadisticasContent');
        if (!container) return;
        
        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="lock"></i></div>
                    <h3 class="empty-state-title">Debes iniciar sesión</h3>
                    <a href="../index.html" class="btn-primary mt-4">← Volver al login</a>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        try {
            const forms = window.formsManager?.cache || [];
            const responses = window.responsesManager?.cache || [];
            
            // Verificar si hay datos
            if (forms.length === 0 && responses.length === 0) {
                container.innerHTML = `
                    <div class="estadisticas-container">
                        <div class="empty-state">
                            <div class="empty-state-icon"><i data-lucide="bar-chart-3"></i></div>
                            <h3 class="empty-state-title">No hay estadísticas disponibles</h3>
                            <p class="empty-state-subtitle">Comienza a estudiar y realizar exámenes para ver tu progreso aquí</p>
                                <a href="examenes.html" class="btn-primary mt-4"><i data-lucide="pen-line"></i> Ver exámenes disponibles</a>
                        </div>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            const totalExamenes = forms.length;
            const totalPreguntas = forms.reduce((acc, f) => acc + (f.questions?.length || 0), 0);
            const totalRespuestas = responses.length;
            
            const completadas = responses.filter(r => r.correction?.completed);
            let notaMedia = 0;
            completadas.forEach(r => {
                const score = r.correction?.score || 0;
                const total = r.correction?.total || 0;
                notaMedia += total > 0 ? (score / total) * 10 : score;
            });
            notaMedia = completadas.length > 0 ? notaMedia / completadas.length : 0;
            
            const tasaAcierto = completadas.length > 0 ? Math.round((completadas.filter(r => (r.correction?.score || 0) === (r.correction?.total || 0) && (r.correction?.total || 0) > 0).length / completadas.length) * 100) : 0;
            
            let html = `
                <div class="estadisticas-container">
                    <div class="estadisticas-resumen">
                        <div class="estadisticas-card">
                            <span class="estadisticas-number" id="estTotalExamenes">${totalExamenes}</span>
                            <span class="estadisticas-label">Exámenes</span>
                        </div>
                        <div class="estadisticas-card">
                            <span class="estadisticas-number" id="estTotalPreguntas">${totalPreguntas}</span>
                            <span class="estadisticas-label">Preguntas</span>
                        </div>
                        <div class="estadisticas-card">
                            <span class="estadisticas-number" id="estNotaMedia">${notaMedia.toFixed(2)}</span>
                            <span class="estadisticas-label">Nota media</span>
                        </div>
                        <div class="estadisticas-card">
                            <span class="estadisticas-number" id="estTasaAcierto">${tasaAcierto}%</span>
                            <span class="estadisticas-label">Tasa de acierto</span>
                        </div>
                    </div>
            `;
            
            // Análisis por examen
            const examenStats = forms.map(f => {
                const respuestasForm = responses.filter(r => r.form_id === f.id);
                const completadasForm = respuestasForm.filter(r => r.correction?.completed);
                let media = 0;
                completadasForm.forEach(r => {
                    media += r.correction?.score || 0;
                });
                media = completadasForm.length > 0 ? media / completadasForm.length : 0;
                return { ...f, respuestas: respuestasForm.length, completadas: completadasForm.length, media };
            });
            
            const examenesConDatos = examenStats.filter(e => e.respuestas > 0);
            
            if (examenesConDatos.length > 0) {
                html += `
                    <div class="estadisticas-examenes">
                        <h3 class="estadisticas-section-title"><i data-lucide="pen-line"></i> Análisis por Examen</h3>
                        <div class="examenes-estadisticas-grid">
                            ${examenesConDatos.map(e => `
                                <div class="examen-estadistica-card">
                                    <div class="examen-estadistica-header">
                                        <span class="examen-titulo">${window.escapeHtml(e.title || 'Sin título')}</span>
                                        <span class="badge badge-blue">${e.questions?.length || 0} preguntas</span>
                                    </div>
                                    <div class="examen-estadistica-stats">
                                        <div><span class="examen-stat-number">${e.completadas}</span><span class="examen-stat-label">Completados</span></div>
                                        <div><span class="examen-stat-number">${e.media.toFixed(2)}</span><span class="examen-stat-label">Nota media</span></div>
                                        <div><span class="examen-stat-number">${e.respuestas}</span><span class="examen-stat-label">Total</span></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3 class="empty-state-title">Error al cargar estadísticas</h3>
                    <p class="empty-state-subtitle">${error.message || 'Error desconocido'}</p>
                    <button onclick="window.renderEstadisticas()" class="btn-primary mt-4"><i data-lucide="refresh-cw"></i> Reintentar</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };
    
    window.exportarEstadisticas = function() {
        const user = window.getCurrentUser();
        if (!user) {
            window.showNotification('Debes iniciar sesión', 'warning');
            return;
        }
        
        let text = '=== ESTADÍSTICAS DE ESTUDIO ===\n\n';
        text += `Generado: ${new Date().toLocaleString()}\n`;
        text += `Usuario: ${user.fullName || user.username}\n\n`;
        text += `Total exámenes: ${document.getElementById('estTotalExamenes')?.textContent || '0'}\n`;
        text += `Total preguntas: ${document.getElementById('estTotalPreguntas')?.textContent || '0'}\n`;
        text += `Nota media: ${document.getElementById('estNotaMedia')?.textContent || '0'}\n`;
        text += `Tasa de acierto: ${document.getElementById('estTasaAcierto')?.textContent || '0%'}\n`;
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estadisticas-${user.username}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.showNotification('Estadísticas exportadas', 'success');
    };
    
    console.log('✅ Estadisticas System cargado');
    
})();