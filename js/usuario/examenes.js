// ============================================================
// EXAMENES - Gestión de exámenes para usuarios
// ============================================================

(function() {
    'use strict';
    
    let filtroActual = 'todos';
    
    // ============================================================
    // INICIALIZAR VISTA DE EXÁMENES
    // ============================================================
    
    window.renderExamenes = async function() {
        const container = document.getElementById('examenesGrid');
        if (!container) {
            console.warn('⚠️ Contenedor de exámenes no encontrado');
            return;
        }
        
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
            // Verificar que formsManager existe
            if (!window.formsManager) {
                throw new Error('FormsManager no disponible');
            }
            
            let forms = await window.formsManager.getAll();
            console.log('📦 Formularios cargados:', forms?.length || 0);
            
            if (!forms || forms.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="pen-line"></i></div>
                    <h3 class="empty-state-title">No hay exámenes</h3>
                        <p class="empty-state-subtitle">${window.isEditor() ? 'Crea tu primer examen usando el botón "Nuevo Examen"' : 'No hay exámenes disponibles'}</p>
                        ${window.isEditor() ? `<a href="editor.html" class="btn-primary mt-4">+ Crear examen</a>` : ''}
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            // Filtrar exámenes por clase si es usuario normal
            let examenesFiltrados = forms;
            
            // Filtrar por estado: los usuarios solo ven publicados
            if (user.role === 'usuario') {
                examenesFiltrados = forms.filter(function(f) {
                    return f.status === 'publicado' || f.status === 'cerrado';
                });
            }
            
            // Si es usuario normal, solo ver exámenes de su clase
            if (user.role === 'usuario' || user.role === 'editor') {
                examenesFiltrados = examenesFiltrados.filter(f => f.clase_id === user.clase_id || !f.clase_id);
            }
            
            // Si no hay exámenes para este usuario
            if (examenesFiltrados.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i data-lucide="clipboard"></i></div>
                        <h3 class="empty-state-title">No hay exámenes disponibles</h3>
                        <p class="empty-state-subtitle">No hay exámenes disponibles para tu clase</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            // Obtener respuestas del usuario
            const responses = window.responsesManager?.cache || [];
            
            switch(filtroActual) {
                case 'completados':
                    examenesFiltrados = examenesFiltrados.filter(f => {
                        const userResponse = responses.find(r => {
                            if (r.form_id !== f.id) return false;
                            const nameAnswer = r.answers?.find(a => a.question === 'respondent_name');
                            return nameAnswer?.value === user.fullName || nameAnswer?.value === user.username;
                        });
                        return userResponse && userResponse.correction?.completed;
                    });
                    break;
                case 'pendientes':
                    examenesFiltrados = examenesFiltrados.filter(f => {
                        const userResponse = responses.find(r => {
                            if (r.form_id !== f.id) return false;
                            const nameAnswer = r.answers?.find(a => a.question === 'respondent_name');
                            return nameAnswer?.value === user.fullName || nameAnswer?.value === user.username;
                        });
                        return !userResponse || !userResponse.correction?.completed;
                    });
                    break;
                // 'todos' - no filtro adicional
            }
            
            if (examenesFiltrados.length === 0) {
                var mensajes = {
                    'todos': 'No hay exámenes disponibles',
                    'completados': 'No has completado ningún examen',
                    'pendientes': 'No hay exámenes pendientes'
                };
                container.innerHTML =
                    '<div class="empty-state">' +
                    '  <div class="empty-state-icon"><i data-lucide="clipboard"></i></div>' +
                    '  <h3 class="empty-state-title">' + (mensajes[filtroActual] || 'No hay exámenes') + '</h3>' +
                    (filtroActual === 'completados' ? '<p class="empty-state-subtitle">Completa un examen para verlo aquí</p>' : '') +
                    '</div>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            // Generar HTML de exámenes
            container.innerHTML = examenesFiltrados.map(form => {
                const respuestasForm = responses.filter(r => r.form_id === form.id);
                const userResponse = respuestasForm.find(r => {
                    const name = r.answers?.find(a => a.question === 'respondent_name');
                    return name?.value === user.fullName || name?.value === user.username;
                });
                
                const completado = userResponse?.correction?.completed || false;
                const nota = completado ? userResponse.correction?.score || 0 : 0;
                const totalPreguntas = form.questions?.length || 0;
                const totalRespuestas = respuestasForm.length;
                const isAdmin = window.isAdmin();
                const isEditor = window.isEditor();
                
                let estado = '<i data-lucide="pen-line"></i> Disponible';
                let estadoColor = 'badge-green';
                if (completado) {
                    const notaFinal = userResponse.correction?.total > 0 ? (nota / userResponse.correction.total) * 10 : 0;
                    estado = `<i data-lucide="check-circle"></i> Completado (${notaFinal.toFixed(2)}/10)`;
                    estadoColor = 'badge-blue';
                } else if (userResponse) {
                    estado = '<i data-lucide="hourglass"></i> Pendiente de corregir';
                    estadoColor = 'badge-orange';
                }
                
                var statusInfo = window.getExamStatusInfo ? window.getExamStatusInfo(form.status || 'borrador') : null;
                
                return `
                    <div class="examen-card">
                        <div class="examen-card-header">
                            <h3 class="examen-card-title">${window.escapeHtml(form.title || 'Sin título')}</h3>
                            <div class="examen-card-badges">
                                ${statusInfo ? '<span class="badge ' + statusInfo.badgeClass + '"><i data-lucide="' + statusInfo.icon + '" class="w-3 h-3"></i> ' + statusInfo.label + '</span>' : ''}
                                <span class="badge ${estadoColor}">${estado}</span>
                            </div>
                        </div>
                        <div class="examen-card-meta">
                            <span><i data-lucide="file-text"></i> ${totalPreguntas} preguntas</span>
                            <span><i data-lucide="users"></i> ${totalRespuestas} respuestas</span>
                            ${form.config?.timeLimit > 0 ? `<span><i data-lucide="timer"></i> ${form.config.timeLimit} min</span>` : ''}
                            ${form.config?.maxAttempts > 1 ? `<span><i data-lucide="refresh-cw"></i> ${form.config.maxAttempts} intentos</span>` : ''}
                        </div>
                        <div class="examen-card-actions">
                            ${!completado ? `
                                <a href="form-view.html?id=${form.id}" class="btn-primary">
                                    <i data-lucide="play" class="w-4 h-4"></i>
                                    Realizar
                                </a>
                            ` : `
                                <a href="form-view.html?id=${form.id}" class="btn-secondary">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                    Ver
                                </a>
                            `}
                            ${isAdmin ? `
                                <a href="responses.html?form=${form.id}" class="btn-secondary">
                                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                                    Respuestas
                                </a>
                            ` : ''}
                            ${isEditor ? `
                                <a href="editor.html?id=${form.id}" class="btn-secondary">
                                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                                    Editar
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Actualizar iconos
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('❌ Error cargando exámenes:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3 class="empty-state-title">Error al cargar exámenes</h3>
                    <p class="empty-state-subtitle">${error.message || 'Error desconocido'}</p>
                    <button onclick="window.renderExamenes()" class="btn-primary mt-4"><i data-lucide="refresh-cw"></i> Reintentar</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };
    
    // ============================================================
    // FILTRAR EXÁMENES
    // ============================================================
    
    window.filtrarExamenes = function(filtro) {
        console.log('🔍 Filtrando exámenes:', filtro);
        filtroActual = filtro;
        
        document.querySelectorAll('.exam-filtro').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter') === filtro);
        });
        
        // Recargar
        window.renderExamenes();
    };
    
    console.log('✅ Examenes System cargado');
    
})();