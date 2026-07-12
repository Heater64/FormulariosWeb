// ============================================================
// ESTADISTICAS-ADMIN - Estadísticas para administradores
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando EstadisticasAdmin System...');
    
    // Esta función se llama desde estadisticas.html si el usuario es admin
    window.renderEstadisticasAdmin = async function() {
        const container = document.getElementById('estadisticasUsuarios');
        if (!container) return;
        
        const user = window.getCurrentUser();
        if (!user || !window.isAdmin()) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        try {
            const users = window.getUsers ? await window.getUsers() : [];
            const responses = window.responsesManager?.cache || [];
            
            const usuariosFiltrados = users.filter(u => u.id !== user.id && u.role !== 'owner');
            
            if (usuariosFiltrados.length === 0) {
                container.innerHTML = `
                    <h3 class="estadisticas-section-title"><i data-lucide="users" class="w-5 h-5"></i> Estadísticas por Usuario</h3>
                    <p class="text-gray-400">No hay otros usuarios en tu clase</p>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            const statsUsuarios = usuariosFiltrados.map(u => {
                const respuestasUsuario = responses.filter(r => {
                    const nameAnswer = r.answers?.find(a => a.question === 'respondent_name');
                    return nameAnswer?.value === u.fullName || nameAnswer?.value === u.username;
                });
                const completadas = respuestasUsuario.filter(r => r.correction?.completed);
                let notaMedia = 0;
                completadas.forEach(r => {
                    notaMedia += r.correction?.score || 0;
                });
                notaMedia = completadas.length > 0 ? notaMedia / completadas.length : 0;
                return { ...u, totalRespuestas: respuestasUsuario.length, completadas: completadas.length, notaMedia };
            });
            
            statsUsuarios.sort((a, b) => b.notaMedia - a.notaMedia);
            
            let html = `
                <h3 class="estadisticas-section-title"><i data-lucide="users" class="w-5 h-5"></i> Estadísticas por Usuario</h3>
                <div class="usuarios-estadisticas-grid">
            `;
            
            statsUsuarios.forEach(u => {
                html += `
                    <div class="usuario-estadistica-card">
                        <div class="usuario-estadistica-header">
                            <span class="usuario-avatar">${u.fullName?.charAt(0) || '?'}</span>
                            <span class="usuario-nombre">${window.escapeHtml(u.fullName || u.username)}</span>
                            <span class="role-badge role-${u.role}">${u.role}</span>
                        </div>
                        <div class="usuario-estadistica-stats">
                            <div><span class="usuario-stat-number">${u.completadas}</span><span class="usuario-stat-label">Completados</span></div>
                            <div><span class="usuario-stat-number">${u.notaMedia.toFixed(2)}</span><span class="usuario-stat-label">Nota media</span></div>
                            <div><span class="usuario-stat-number">${u.totalRespuestas}</span><span class="usuario-stat-label">Total</span></div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;

            if (typeof lucide !== 'undefined') lucide.createIcons();
            
        } catch (error) {
            console.error('Error en estadísticas admin:', error);
        }
    };
    
    console.log('EstadisticasAdmin System cargado');
    
})();