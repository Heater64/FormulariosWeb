// ============================================================
// SYSTEM - Orquestador central de la plataforma
// ------------------------------------------------------------
// Unifica la conexión con Supabase, la inicialización de los
// managers (FormsManager / ResponsesManager), la navegación
// entre secciones y la carcasa de la app (topbar + bottom nav).
//
// Debe cargarse COMO ÚLTIMO SCRIPT de cada página, después de
// config.js, utils.js, app.js, users.js, auth.js, forms.js,
// responses.js y organization.js.
// ============================================================

(function () {
    'use strict';

    const System = {
        supabase: null,
        booted: false,

        // --------------------------------------------------------
        // RUTAS RELATIVAS
        // --------------------------------------------------------
        inPages: function () {
            return /(^|\/)pages(\/|$)/.test(window.location.pathname);
        },
        // URL de una página interna respetando la carpeta actual
        page: function (name) {
            return this.inPages() ? name : 'pages/' + name;
        },
        // Ruta de un asset (css/js) respecto a la carpeta actual
        asset: function (path) {
            return this.inPages() ? path : '../' + path;
        },
        loginUrl: function () {
            return this.inPages() ? '../index.html' : 'index.html';
        },

        // --------------------------------------------------------
        // ARRANQUE
        // --------------------------------------------------------
        boot: function () {
            if (this.booted) return;
            this.booted = true;

            this.supabase = window.supabaseClient || null;
            if (this.supabase) {
                console.log('✅ System: cliente Supabase conectado');
            } else {
                console.warn('⚠️ System: Supabase NO disponible');
            }

            // Inicializar managers con las clases reales (disponibles
            // porque system.js se carga al final). Reemplaza los
            // placeholders que pudiera haber creado app.js.
            this.initManagers();

            // Navegación declarativa vía [data-nav="pagina.html"]
            this.bindNav();

            console.log('🧩 System: orquestador central listo');
        },

        // --------------------------------------------------------
        // MANAGERS
        // --------------------------------------------------------
        initManagers: function () {
            const sb = this.supabase;

            if (typeof window.FormsManager === 'function') {
                if (!window.formsManager || !window.formsManager.__real) {
                    window.formsManager = new window.FormsManager(sb);
                    window.formsManager.__real = true;
                    console.log('✅ System: FormsManager (real) inicializado');
                }
            } else if (!window.formsManager) {
                console.warn('⚠️ System: FormsManager no definido');
            }

            if (typeof window.ResponsesManager === 'function') {
                if (!window.responsesManager || !window.responsesManager.__real) {
                    window.responsesManager = new window.ResponsesManager(sb);
                    window.responsesManager.__real = true;
                    console.log('✅ System: ResponsesManager (real) inicializado');
                }
            } else if (!window.responsesManager) {
                console.warn('⚠️ System: ResponsesManager no definido');
            }
        },

        // --------------------------------------------------------
        // NAVEGACIÓN
        // --------------------------------------------------------
        // Cualquier elemento con data-nav dispara navegación interna.
        bindNav: function () {
            document.addEventListener('click', function (e) {
                const el = e.target.closest && e.target.closest('[data-nav]');
                if (!el) return;
                e.preventDefault();
                window.location.href = System.page(el.getAttribute('data-nav'));
            });
        },

        go: function (name) {
            window.location.href = this.page(name);
        },

        // --------------------------------------------------------
        // AUTENTICACIÓN
        // --------------------------------------------------------
        // Protege una página interna. Si no hay sesión, redirige al login.
        requireAuth: function () {
            const user = (typeof window.getCurrentUser === 'function')
                ? window.getCurrentUser()
                : null;
            if (!user) {
                console.warn('🔒 System: sesión requerida, redirigiendo a login');
                window.location.href = this.loginUrl();
                return null;
            }
            return user;
        },

        // --------------------------------------------------------
        // CARCASA (topbar + bottom nav + notificaciones)
        // Migrada de auth.js para centralizarla en un único punto.
        // --------------------------------------------------------
        BOTTOM_ITEMS: [
            { href: 'dashboard.html',    icon: 'home',           label: 'Inicio' },
            { href: 'estudio.html',      icon: 'book-open',      label: 'Estudio' },
            { href: 'examenes.html',     icon: 'clipboard-list', label: 'Exámenes' },
            { href: 'actividad.html',    icon: 'bell',           label: 'Actividad' },
            { href: 'ajustes.html',      icon: 'settings',       label: 'Ajustes' }
        ],

        ensureIllustrations: function () {
            if (!window.getIllustration) {
                const s = document.createElement('script');
                s.src = this.asset('js/core/illustrations.js');
                s.onload = function () {
                    if (window.renderIllustrations) window.renderIllustrations(document);
                    const bm = document.querySelector('#appTopbar .brand-mark');
                    if (bm && window.getIllustration) bm.innerHTML = window.getIllustration('door');
                };
                document.head.appendChild(s);
            } else if (window.renderIllustrations) {
                window.renderIllustrations(document);
            }
        },

        _closeNotifOnOutside: function (e) {
            if (!e.target.closest('#notifPanel') && !e.target.closest('#topbarBell')) {
                const p = document.getElementById('notifPanel');
                if (p) p.remove();
                document.removeEventListener('click', System._closeNotifOnOutside);
            }
        },

        toggleNotifPanel: function () {
            const existing = document.getElementById('notifPanel');
            if (existing) { existing.remove(); return; }
            const panel = document.createElement('div');
            panel.id = 'notifPanel';
            panel.className = 'notif-panel';
            const items = window.__notificaciones || [];
            panel.innerHTML = items.length
                ? items.map(function (n) {
                    return `<div class="notif-panel-item">
                        <span class="notif-panel-dot"></span>
                        <div>
                            <div class="notif-panel-title">${window.escapeHtml(n.titulo || 'Aviso')}</div>
                            <div class="notif-panel-sub">${window.escapeHtml(n.mensaje || '')}</div>
                        </div></div>`;
                  }).join('')
                : `<div class="notif-panel-empty">No tienes notificaciones</div>`;
            const bar = document.getElementById('appTopbar');
            if (bar) bar.appendChild(panel);
            setTimeout(function () { document.addEventListener('click', System._closeNotifOnOutside); }, 0);
        },

        renderTopbar: function (user) {
            let bar = document.getElementById('appTopbar');
            if (!bar) {
                bar = document.createElement('header');
                bar.id = 'appTopbar';
                bar.className = 'topbar';
                document.body.insertBefore(bar, document.body.firstChild);
            }
            const name = user.fullName || user.username || 'Usuario';
            const initial = name.trim().charAt(0).toUpperCase();
            const mark = '<i data-lucide="book-open"></i>';
            bar.innerHTML =
                `<a href="${this.page('dashboard.html')}" class="topbar-brand">
                    <span class="brand-mark">${mark}</span>
                    <span>Estudio Bíblico</span>
                </a>
                <div class="topbar-actions">
                    <button class="topbar-icon-btn" id="topbarBell" aria-label="Notificaciones">
                        <i data-lucide="bell"></i>
                    </button>
                    <a href="${this.page('profile.html')}" class="topbar-profile">
                        <span class="avatar">${initial}</span>
                        <span>${window.escapeHtml(name)}</span>
                    </a>
                </div>`;
            const bell = bar.querySelector('#topbarBell');
            if (bell) bell.addEventListener('click', this.toggleNotifPanel.bind(this));
        },

        actualizarCampana: async function (user) {
            const sb = this.supabase;
            if (!sb) return;
            try {
                const { data, error } = await sb.from('notificaciones')
                    .select('*').eq('destinatario', user.username).eq('leida', false)
                    .order('created_at', { ascending: false }).limit(12);
                if (error || !data) return;
                window.__notificaciones = data;
                const bell = document.getElementById('topbarBell');
                if (!bell) return;
                let b = bell.querySelector('.badge-count');
                if (data.length > 0) {
                    if (!b) { b = document.createElement('span'); b.className = 'badge-count'; bell.appendChild(b); }
                    b.textContent = data.length;
                } else if (b) { b.remove(); }
            } catch (e) { /* secundario */ }
        },

        renderBottomNav: function (user) {
            let nav = document.getElementById('appBottomnav');
            if (!nav) {
                nav = document.createElement('nav');
                nav.id = 'appBottomnav';
                nav.className = 'bottomnav';
                document.body.appendChild(nav);
            }
            const path = window.location.pathname;
            nav.innerHTML = this.BOTTOM_ITEMS.map(function (it) {
                const active = path.includes(it.href);
                return `<a href="${System.page(it.href)}" class="bottomnav-item${active ? ' active' : ''}">
                    <i data-lucide="${it.icon}"></i><span>${it.label}</span></a>`;
            }).join('');
        },

        // Punto único que dibuja la carcasa completa para el usuario.
        renderShell: function (user) {
            if (!user) {
                console.warn('⚠️ System: no hay usuario para la carcasa');
                return;
            }
            // Aplicar preferencias del usuario en toda la web.
            this.applyUserPreferences();
            this.ensureIllustrations();
            this.renderTopbar(user);
            this.renderBottomNav(user);
            this.actualizarCampana(user);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        // ========================================================
        // PREFERENCIAS DE USUARIO (tamaño de texto, contraste, etc.)
        // Se aplican en cada página para que persistan al navegar.
        // ========================================================
        applyUserPreferences: function () {
            const user = (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
            if (!user) return;
            const c = user.configuracion || {};
            this.applyTamanoTexto(c.tamano_texto || 'medio');
            this.applyAltoContraste(!!c.alto_contraste);
            document.documentElement.setAttribute('data-sonidos', c.sonidos ? 'true' : 'false');
            document.documentElement.setAttribute('data-solo-texto', c.solo_texto ? 'true' : 'false');
        },

        applyTamanoTexto: function (tamano) {
            const sizes = { pequeno: '14px', medio: '18px', grande: '24px' };
            document.documentElement.style.fontSize = sizes[tamano] || '18px';
            document.documentElement.setAttribute('data-tamano-texto', tamano);
        },

        applyAltoContraste: function (activado) {
            document.documentElement.setAttribute('data-alto-contraste', activado ? 'true' : 'false');
        }
    };

    window.System = System;

    // Arranque síncrono: en este punto (último script) las clases de
    // manager ya están definidas, por lo que los managers reales se
    // instancian de inmediato, antes de cualquier DOMContentLoaded.
    System.boot();

})();
