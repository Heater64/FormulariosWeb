(function() {
    'use strict';

    var filtroActual = 'todo';

    window.cargarActividad = async function() {
        var container = document.getElementById('actividadContent');
        if (!container) return;

        container.innerHTML =
            '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando actividad...</p></div>';

        var sb = window.supabaseClient;
        var user = window.getCurrentUser();
        if (!sb || !user) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="wifi-off"></i></div><h3 class="empty-state-title">Sin conexión</h3><p class="empty-state-subtitle">No se pudo cargar la actividad</p></div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        try {
            var items = [];
            var notifs = [];

            // Notificaciones
            var { data: notifData } = await sb.from('notificaciones')
                .select('*').eq('destinatario', user.username)
                .order('created_at', { ascending: false }).limit(30);
            if (notifData) {
                notifs = notifData;
                notifData.forEach(function(n) {
                    var tipo = n.tipo || 'info';
                    var iconMap = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'bell' };
                    var colorMap = { success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)', info: 'var(--primary)' };
                    items.push({
                        tipo: 'notificacion',
                        icon: iconMap[tipo] || 'bell',
                        color: colorMap[tipo] || 'var(--primary)',
                        title: n.titulo || 'Notificación',
                        desc: n.mensaje || '',
                        date: n.created_at,
                        leida: n.leida,
                        id: n.id
                    });
                });
            }

            // Logs de auditoría (admin/owner)
            if (window.isAdmin && window.isAdmin()) {
                var { data: logs } = await sb.from('audit_logs')
                    .select('*')
                    .order('created_at', { ascending: false }).limit(30);
                if (logs) {
                    logs.forEach(function(l) {
                        items.push({
                            tipo: 'log',
                            icon: 'clipboard-list',
                            color: 'var(--text-faint)',
                            title: l.accion || 'Acción',
                            desc: l.detalle ? l.detalle : (l.actor ? 'Por ' + l.actor : ''),
                            date: l.created_at,
                            leida: true,
                            id: l.id
                        });
                    });
                }
            }

            // Ordenar por fecha descendente
            items.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
            items = items.slice(0, 60);

            // Render
            renderizarActividad(container, items, notifs);

        } catch (e) {
            console.error('Error cargando actividad:', e);
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div><h3 class="empty-state-title">Error al cargar</h3><p class="empty-state-subtitle">' + (e.message || 'Error desconocido') + '</p><button onclick="window.cargarActividad()" class="btn-primary mt-4"><i data-lucide="refresh-cw"></i> Reintentar</button></div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };

    window.filtrarActividad = function(filtro) {
        filtroActual = filtro;
        document.querySelectorAll('.act-filtro').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter') === filtro);
        });
        window.cargarActividad();
    };

    function renderizarActividad(container, items, notifs) {
        // Aplicar filtro
        if (filtroActual === 'notificaciones') {
            items = items.filter(function(i) { return i.tipo === 'notificacion'; });
        } else if (filtroActual === 'logs') {
            items = items.filter(function(i) { return i.tipo === 'log'; });
        }

        if (items.length === 0) {
            var msg = filtroActual === 'notificaciones' ? 'No hay notificaciones' :
                      filtroActual === 'logs' ? 'No hay registros de auditoría' :
                      'Sin actividad reciente';
            container.innerHTML =
                '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="bell-off"></i></div><h3 class="empty-state-title">' + msg + '</h3><p class="empty-state-subtitle">No hay actividad reciente para mostrar.</p></div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Group by date
        var groups = {};
        items.forEach(function(it) {
            var d = new Date(it.date);
            var key = d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(it);
        });

        var html = '<div class="act-filtros-bar">';
        html += '<button class="act-filtro active" data-filter="todo" onclick="window.filtrarActividad(\'todo\')"><i data-lucide="list"></i> Todo</button>';
        html += '<button class="act-filtro" data-filter="notificaciones" onclick="window.filtrarActividad(\'notificaciones\')"><i data-lucide="bell"></i> Notificaciones</button>';
        if (window.isAdmin && window.isAdmin()) {
            html += '<button class="act-filtro" data-filter="logs" onclick="window.filtrarActividad(\'logs\')"><i data-lucide="clipboard-list"></i> Auditoría</button>';
        }
        html += '</div>';

        var groupKeys = Object.keys(groups);
        groupKeys.sort(function(a, b) { return new Date(b) - new Date(a); });

        groupKeys.forEach(function(key) {
            var isToday = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) === key;
            var label = isToday ? 'Hoy' : key;
            html += '<div class="act-group">';
            html += '  <div class="act-group-label">' + label + '</div>';
            html += '  <div class="act-list">';
            groups[key].forEach(function(it) {
                html +=
                    '<div class="act-item' + (!it.leida ? ' act-no-leida' : '') + '">' +
                    '  <div class="act-item-icon" style="color:' + it.color + '"><i data-lucide="' + it.icon + '"></i></div>' +
                    '  <div class="act-item-body">' +
                    '    <div class="act-item-title">' + window.escapeHtml(it.title) + '</div>' +
                    (it.desc ? '<div class="act-item-desc">' + window.escapeHtml(it.desc) + '</div>' : '') +
                    '    <div class="act-item-date">' + formatHora(it.date) + '</div>' +
                    '  </div>' +
                    (!it.leida ? '<span class="act-item-dot"></span>' : '') +
                    '</div>';
            });
            html += '  </div>';
            html += '</div>';
        });

        container.innerHTML = html;

        // Mark notifications as read
        if (notifs && notifs.length > 0) {
            var unreadIds = notifs.filter(function(n) { return !n.leida; });
            if (unreadIds.length > 0) {
                var sb = window.supabaseClient;
                unreadIds.forEach(function(n) {
                    sb.from('notificaciones').update({ leida: true }).eq('id', n.id).then(function() {});
                });
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function formatHora(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    console.log('✅ Actividad System cargado');

})();
