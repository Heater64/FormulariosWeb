// ============================================================
// ADMIN - Panel de administración
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando Admin System...');

    async function logAuditoria(accion, detalle) {
        const sb = window.supabaseClient;
        if (!sb) return;
        const u = window.getCurrentUser();
        try {
            await sb.from('audit_logs').insert({
                accion,
                detalle: detalle || '',
                actor: u ? u.username : 'sistema',
                clase: u ? (u.clase_id || null) : null
            });
        } catch (e) {
            console.warn('No se pudo registrar auditoría:', e.message);
        }
    }

    window.initAdmin = async function() {
        const container = document.getElementById('adminContent');
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
                    <p class="empty-state-subtitle">Solo administradores pueden acceder</p>
                    <a href="dashboard.html" class="btn-primary mt-4">← Volver</a>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        try {
            const forms = window.formsManager?.cache || [];
            const users = window.getUsers ? await window.getUsers() : [];
            const responses = window.responsesManager?.cache || [];
            
            // Guardar usuarios para use en evaluaciones
            window.__adminUsers = users;
            
            const alumnos = users.filter(u => u.role === 'usuario' || u.role === 'editor');
            const editores = users.filter(u => u.role === 'editor');
            
            // Resumen
            document.getElementById('adminTotalAlumnos').textContent = alumnos.length;
            document.getElementById('adminTotalExamenes').textContent = forms.length;
            document.getElementById('adminTotalEditores').textContent = editores.length;
            
            // Nota media
            const completadas = responses.filter(r => r.correction?.completed);
            let notaMedia = 0;
            completadas.forEach(r => {
                notaMedia += r.correction?.score || 0;
            });
            notaMedia = completadas.length > 0 ? notaMedia / completadas.length : 0;
            document.getElementById('adminNotaMedia').textContent = notaMedia.toFixed(2);
            
            // Alumnos
            const alumnosGrid = document.getElementById('adminAlumnosGrid');
            if (alumnosGrid) {
                if (alumnos.length === 0) {
                    alumnosGrid.innerHTML = '<p class="text-gray-400">No hay alumnos</p>';
                } else {
                    alumnosGrid.innerHTML = alumnos.map(a => `
                        <div class="admin-alumno-card">
                            <div class="admin-alumno-header">
                                <span class="admin-alumno-avatar">${a.fullName?.charAt(0) || '?'}</span>
                                <div>
                                    <div class="admin-alumno-nombre">${window.escapeHtml(a.fullName || a.username)}</div>
                                    <div class="admin-alumno-username">@${window.escapeHtml(a.username)}</div>
                                </div>
                                <span class="role-badge role-${a.role}">${a.role}</span>
                            </div>
                            <div class="admin-alumno-stats">
                                <div><span class="admin-alumno-stat-number">0</span><span class="admin-alumno-stat-label">Exámenes</span></div>
                                <div><span class="admin-alumno-stat-number">0.00</span><span class="admin-alumno-stat-label">Nota media</span></div>
                            </div>
                        </div>
                    `).join('');
                }
            }
            
            // Solicitudes
            const solicitudesContainer = document.getElementById('adminSolicitudesContainer');
            if (solicitudesContainer) {
                await renderSolicitudes(user, solicitudesContainer);
            }

            // Logs de clase
            const logsContainer = document.getElementById('adminLogsContainer');
            if (logsContainer) {
                await renderLogsClase(user, logsContainer);
            }
            
            // Evaluaciones y libro de calificaciones
            if (typeof window.loadEvaluationsAndRender === 'function') {
                await window.loadEvaluationsAndRender();
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error('Error en admin:', error);
        }
    };
    
    async function renderSolicitudes(user, container) {
        const sb = window.supabaseClient;
        if (!sb) {
            container.innerHTML = '<p class="text-gray-400">Sin conexión</p>';
            return;
        }
        try {
            let query = sb.from('editor_requests').select('*').eq('estado', 'pendiente');
            if (user.role === 'admin') query = query.eq('clase', user.clase_id);
            const { data, error } = await query.order('fecha', { ascending: true });
            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-gray-400">No hay solicitudes pendientes</p>';
                return;
            }

            container.innerHTML = data.map(s => `
                <div class="admin-solicitud-card">
                    <div class="admin-solicitud-header">
                        <span class="admin-solicitud-nombre">${window.escapeHtml(s.usuario_nombre || s.usuario_id)}</span>
                        <span class="role-badge role-usuario">${window.escapeHtml(s.clase || 'sin clase')}</span>
                    </div>
                    <div class="admin-solicitud-body">
                        <p><strong>Motivo:</strong> ${window.escapeHtml(s.motivo || '—')}</p>
                        <p><strong>Experiencia:</strong> ${window.escapeHtml(s.experiencia || '—')}</p>
                    </div>
                    <div class="admin-solicitud-actions">
                        <button onclick="window.aprobarSolicitud('${s.id}')" class="btn-success btn-sm">
                            <i data-lucide="check" class="w-4 h-4"></i> Aprobar
                        </button>
                        <button onclick="window.rechazarSolicitud('${s.id}')" class="btn-danger btn-sm">
                            <i data-lucide="x" class="w-4 h-4"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (e) {
            container.innerHTML = '<p class="text-gray-400">Error al cargar solicitudes</p>';
        }
    }

    async function renderLogsClase(user, container) {
        const sb = window.supabaseClient;
        if (!sb) {
            container.innerHTML = '<p class="text-gray-400">Sin conexión</p>';
            return;
        }
        try {
            let query = sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (user.role === 'admin') query = query.eq('clase', user.clase_id);
            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-gray-400">Sin registros de actividad</p>';
                return;
            }

            container.innerHTML = '<div class="owner-audit-list">' + data.map(e => `
                <div class="owner-audit-item">
                    <span class="owner-audit-fecha">${e.created_at ? window.formatDate(e.created_at) : ''}</span>
                    <span class="owner-audit-texto"><strong>${window.escapeHtml(e.actor || 'sistema')}</strong> · ${window.escapeHtml(e.accion)}${e.detalle ? ': ' + window.escapeHtml(e.detalle) : ''}</span>
                </div>
            `).join('') + '</div>';
        } catch (e) {
            container.innerHTML = '<p class="text-gray-400">Error al cargar logs</p>';
        }
    }

    window.aprobarSolicitud = async function(id) {
        const sb = window.supabaseClient;
        if (!sb) return;
        try {
            const { data: req, error } = await sb.from('editor_requests').select('*').eq('id', id).single();
            if (error || !req) throw new Error('Solicitud no encontrada');

            await window.setUserRole(req.usuario_id, 'editor');
            await sb.from('editor_requests').update({ estado: 'aprobada' }).eq('id', id);
            await sb.from('notificaciones').insert({
                destinatario: req.usuario_id,
                titulo: 'Has sido aprobado como Editor',
                mensaje: 'Ya puedes crear exámenes en tu clase.',
                tipo: 'success'
            });
            await logAuditoria('Aprobar solicitud de Editor', req.usuario_nombre || req.usuario_id);
            window.showNotification('Solicitud aprobada', 'success');
            if (typeof window.initAdmin === 'function') window.initAdmin();
        } catch (err) {
            console.error(err);
            window.showNotification((err.message || 'No se pudo aprobar'), 'error');
        }
    };

    window.rechazarSolicitud = async function(id) {
        const sb = window.supabaseClient;
        if (!sb) return;
        window.showConfirmDialog(
            'Rechazar solicitud',
            'El usuario podrá volver a solicitarlo tras 30 días.',
            'Rechazar',
            'Cancelar',
            async function() {
                try {
                    const { data: req, error } = await sb.from('editor_requests').select('*').eq('id', id).single();
                    if (error || !req) throw new Error('Solicitud no encontrada');
                    await sb.from('editor_requests').update({ estado: 'rechazada' }).eq('id', id);
                    await sb.from('notificaciones').insert({
                        destinatario: req.usuario_id,
                        titulo: 'Tu solicitud ha sido rechazada',
                        mensaje: 'Podrás volver a solicitarlo pasados 30 días.',
                        tipo: 'error'
                    });
                    await logAuditoria('Rechazar solicitud de Editor', req.usuario_nombre || req.usuario_id);
                    window.showNotification('Solicitud rechazada', 'info');
                    if (typeof window.initAdmin === 'function') window.initAdmin();
                } catch (err) {
                    window.showNotification((err.message || 'No se pudo rechazar'), 'error');
                }
            }
        );
    };

    console.log('Admin System cargado');
    
})();