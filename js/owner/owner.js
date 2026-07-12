// ============================================================
// OWNER - Panel de control global
// ============================================================

(function() {
    'use strict';

    console.log('Inicializando Owner System...');

    // Colores para los puntos de clase (paleta tierra)
    const CLASE_COLORES = ['var(--secondary)', 'var(--warning)', 'var(--error)', 'var(--primary)', 'var(--accent)', 'var(--primary-hover)'];

    // ============================================================
    // UTILIDADES DE DATOS
    // ============================================================

    async function fetchResponses() {
        const sb = window.supabaseClient;
        if (!sb) return [];
        try {
            const { data, error } = await sb.from('responses').select('*');
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    }

    async function fetchAuditLogs() {
        const sb = window.supabaseClient;
        if (!sb) return [];
        try {
            const { data, error } = await sb
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    }

    async function logAudit(accion, detalle) {
        const sb = window.supabaseClient;
        const user = window.getCurrentUser();
        if (!sb) return;
        try {
            await sb.from('audit_logs').insert({
                accion,
                detalle: detalle || '',
                actor: user ? user.username : 'sistema'
            });
        } catch (e) {
            console.warn('No se pudo registrar auditoría:', e.message);
        }
    }

    function calcularMediaGlobal(responses) {
        const completadas = responses.filter(r => r.correction && r.correction.completed);
        if (completadas.length === 0) return 0;
        let total = 0;
        completadas.forEach(r => {
            const score = r.correction?.score || 0;
            const max = r.correction?.total || 0;
            total += max > 0 ? (score / max) * 10 : score;
        });
        return total / completadas.length;
    }

    // ============================================================
    // INIT
    // ============================================================

    window.initOwner = async function() {
        const container = document.getElementById('ownerContent');
        if (!container) return;

        const user = window.getCurrentUser();
        if (!user || user.role !== 'owner') {
            container.innerHTML = '<p class="text-center text-gray-400">Acceso restringido al Owner</p>';
            return;
        }

        try {
            const [users, forms, responses, audit] = await Promise.all([
                window.getUsers ? await window.getUsers() : [],
                window.formsManager ? await window.formsManager.refresh() : [],
                fetchResponses(),
                fetchAuditLogs()
            ]);

            const alumnos = users.filter(u => u.role === 'usuario');
            const editores = users.filter(u => u.role === 'editor');
            const admins = users.filter(u => u.role === 'admin');
            const clases = users.filter(u => u.clase_id);
            const claseIds = [...new Set(clases.map(u => u.clase_id))];

            const preguntasBanco = (forms || []).reduce((acc, f) => acc + (f.questions?.length || 0), 0);
            const mediaGlobal = calcularMediaGlobal(responses);

            // ---- Resumen Global ----
            document.getElementById('statClases').textContent = claseIds.length;
            document.getElementById('statAlumnos').textContent = alumnos.length;
            document.getElementById('statExamenes').textContent = (forms || []).length;
            document.getElementById('statEditores').textContent = editores.length;
            document.getElementById('statAdmins').textContent = admins.length;
            document.getElementById('statMedia').textContent = mediaGlobal.toFixed(2);
            document.getElementById('statPreguntas').textContent = preguntasBanco;

            // ---- Clases ----
            renderClases(claseIds, users);

            // ---- Estadísticas Globales ----
            renderEstadisticas(claseIds, users, alumnos);

            // ---- Admins Activos ----
            renderAdmins(admins);

            // ---- Auditoría ----
            renderAuditoria(audit);

            // ---- Lista de admins en modal ----
            window.__ownerAdmins = admins;
            renderAdminModalList(admins);

        } catch (error) {
            console.error('Error en panel Owner:', error);
            container.insertAdjacentHTML('afterbegin',
                '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div><h3 class="empty-state-title">Error al cargar</h3></div>');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };

    // ============================================================
    // RENDER: CLASES
    // ============================================================

    function renderClases(claseIds, users) {
        const el = document.getElementById('ownerClases');
        if (!el) return;

        if (claseIds.length === 0) {
            el.innerHTML = '<p class="text-gray-400">No hay clases registradas</p>';
            return;
        }

        el.innerHTML = '<div class="owner-clases-grid">' + claseIds.map((cid, i) => {
            const miembros = users.filter(u => u.clase_id === cid);
            const alumnosClase = miembros.filter(u => u.role === 'usuario').length;
            const editoresClase = miembros.filter(u => u.role === 'editor').length;
            const adminClase = miembros.find(u => u.role === 'admin');
            const color = CLASE_COLORES[i % CLASE_COLORES.length];
            const ultimo = miembros
                .map(u => u.ultimo_acceso)
                .filter(Boolean)
                .sort()
                .slice(-1)[0];

            return `
                <div class="owner-clase-card">
                    <div class="owner-clase-header">
                        <span class="owner-clase-dot" style="background:${color}"></span>
                        <div>
                            <div class="owner-clase-nombre">${window.escapeHtml(cid)}</div>
                            <div class="owner-clase-admin">Admin: ${window.escapeHtml(adminClase?.fullName || adminClase?.username || 'Sin admin')}</div>
                        </div>
                    </div>
                    <div class="owner-clase-stats">
                        <div><span class="owner-clase-stat-number">${alumnosClase}</span><span class="owner-clase-stat-label">Alumnos</span></div>
                        <div><span class="owner-clase-stat-number">${editoresClase}</span><span class="owner-clase-stat-label">Editores</span></div>
                        <div><span class="owner-clase-stat-number">${miembros.length}</span><span class="owner-clase-stat-label">Miembros</span></div>
                    </div>
                    <div class="owner-clase-actividad">Última actividad: ${ultimo ? window.formatDate(ultimo) : '—'}</div>
                </div>
            `;
        }).join('') + '</div>';
    }

    // ============================================================
    // RENDER: ESTADÍSTICAS GLOBALES
    // ============================================================

    function renderEstadisticas(claseIds, users, alumnos) {
        const el = document.getElementById('ownerEstadisticas');
        if (!el) return;

        const claseConMasAlumnos = claseIds
            .map(cid => ({ cid, n: users.filter(u => u.clase_id === cid && u.role === 'usuario').length }))
            .sort((a, b) => b.n - a.n)[0];

        const filas = [
            { icon: 'award', label: 'Clase con más alumnos', value: claseConMasAlumnos ? `${claseConMasAlumnos.cid} (${claseConMasAlumnos.n})` : '—' },
            { icon: 'users', label: 'Total de alumnos', value: alumnos.length },
            { icon: 'book-open', label: 'Libro más estudiado', value: 'Próximamente' },
            { icon: 'book', label: 'Libro menos estudiado', value: 'Próximamente' }
        ];

        el.innerHTML = '<div class="owner-stats-list">' + filas.map(f => `
            <div class="owner-stat-row">
                <span class="label"><i data-lucide="${f.icon}" class="w-4 h-4"></i> ${f.label}</span>
                <span class="value">${window.escapeHtml(String(f.value))}</span>
            </div>
        `).join('') + '</div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ============================================================
    // RENDER: ADMINS ACTIVOS
    // ============================================================

    function renderAdmins(admins) {
        const el = document.getElementById('ownerAdmins');
        if (!el) return;

        if (admins.length === 0) {
            el.innerHTML = '<p class="text-gray-400">No hay admins</p>';
            return;
        }

        el.innerHTML = '<div class="owner-admins-list">' + admins.map(a => `
            <div class="owner-admin-item">
                <span class="owner-admin-avatar">${window.escapeHtml((a.fullName || a.username || '?').charAt(0))}</span>
                <div class="owner-admin-info">
                    <div class="owner-admin-nombre">${window.escapeHtml(a.fullName || a.username)}</div>
                    <div class="owner-admin-meta">@${window.escapeHtml(a.username)} · Clase: ${window.escapeHtml(a.clase_id || '—')} · desde ${a.created_at ? window.formatDate(a.created_at) : '—'}</div>
                </div>
            </div>
        `).join('') + '</div>';
    }

    // ============================================================
    // RENDER: AUDITORÍA
    // ============================================================

    function renderAuditoria(audit) {
        const el = document.getElementById('ownerAuditoria');
        if (!el) return;

        if (!audit || audit.length === 0) {
            el.innerHTML = '<p class="text-gray-400">Sin registros de auditoría</p>';
            return;
        }

        el.innerHTML = '<div class="owner-audit-list">' + audit.map(e => `
            <div class="owner-audit-item">
                <span class="owner-audit-fecha">${e.created_at ? window.formatDate(e.created_at) : ''}</span>
                <span class="owner-audit-texto"><strong>${window.escapeHtml(e.actor || 'sistema')}</strong> · ${window.escapeHtml(e.accion)}${e.detalle ? ': ' + window.escapeHtml(e.detalle) : ''}</span>
            </div>
        `).join('') + '</div>';
    }

    // ============================================================
    // MODAL GESTIÓN DE ADMINS
    // ============================================================

    window.openAdminModal = function() {
        const modal = document.getElementById('adminModal');
        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => modal.classList.add('active'));
        }
        renderAdminModalList(window.__ownerAdmins || []);
    };

    window.closeAdminModal = function() {
        const modal = document.getElementById('adminModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    function renderAdminModalList(admins) {
        const el = document.getElementById('adminModalList');
        if (!el) return;

        if (!admins || admins.length === 0) {
            el.innerHTML = '<p class="text-gray-400">No hay admins</p>';
            return;
        }

        el.innerHTML = '<div class="owner-admins-list">' + admins.map(a => `
            <div class="owner-admin-item">
                <span class="owner-admin-avatar">${window.escapeHtml((a.fullName || a.username || '?').charAt(0))}</span>
                <div class="owner-admin-info">
                    <div class="owner-admin-nombre">${window.escapeHtml(a.fullName || a.username)}</div>
                    <div class="owner-admin-meta">@${window.escapeHtml(a.username)} · ${window.escapeHtml(a.clase_id || 'sin clase')}</div>
                </div>
                <button onclick="window.removeAdmin('${window.escapeHtml(a.id)}')" class="btn-danger btn-sm">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Quitar
                </button>
            </div>
        `).join('') + '</div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    window.createAdminFromModal = async function() {
        const name = document.getElementById('newAdminName').value.trim();
        const username = document.getElementById('newAdminUser').value.trim();
        const pass = document.getElementById('newAdminPass').value.trim();
        const clase = document.getElementById('newAdminClase').value.trim();

        if (!name || !username || !pass || !clase) {
            window.showNotification('Completa todos los campos', 'warning');
            return;
        }
        if (pass.length < 4) {
            window.showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
            return;
        }

        try {
            const created = await window.createUser(name, username, pass, 'admin', clase);
            await logAudit('Crear admin', `${username} (${clase})`);
            window.showNotification('Admin creado correctamente', 'success');
            document.getElementById('newAdminName').value = '';
            document.getElementById('newAdminUser').value = '';
            document.getElementById('newAdminPass').value = '';
            document.getElementById('newAdminClase').value = '';
            window.initOwner();
        } catch (err) {
            console.error(err);
            window.showNotification((err.message || 'No se pudo crear'), 'error');
        }
    };

    window.removeAdmin = function(adminId) {
        window.showConfirmDialog(
            'Quitar Admin',
            '¿Seguro que quieres eliminar este admin? Sus alumnos quedarán sin admin asignado.',
            'Quitar',
            'Cancelar',
            async function() {
                try {
                    await window.deleteUser(adminId);
                    await logAudit('Eliminar admin', adminId);
                    window.showNotification('Admin eliminado', 'success');
                    window.initOwner();
                } catch (err) {
                    window.showNotification((err.message || 'No se pudo eliminar'), 'error');
                }
            }
        );
    };

    console.log('Owner System cargado');

})();
