(function() {
  'use strict';
  
  const APP = {
    async init() {
      // Aplicar preferencias primero
      if (window.preferencias) window.preferencias.aplicar();
      
      // Controlar splash screen
      this._controlarSplash();
      
      // Push nativas Android: instalar las escuchas lo antes posible para
      // capturar la apertura por notificación en arranque en frío. Si ya hay
      // sesión restaurada, registra el token; si no, lo hará tras el login.
      if (window.pushNotificationService) await window.pushNotificationService.iniciar();
      
      // Recuperar sesión (async: valida el JWT de Supabase Auth, 028)
      await this._recuperarSesion();
      
      // Tras restaurar la sesión, completar el registro push si quedó
      // pendiente (el arranque en frío puede haber llegado sin usuario).
      if (window.pushNotificationService) await window.pushNotificationService.iniciar();

      // Aplicar la marca configurada por el propietario (nombre del centro)
      this._aplicarMarca();
      
      // Inicializar rutas
      this._inicializarRutas();
      
      // Renderizar barra de navegación
      this._renderizarBarraNavegacion();
      
      // Aplicar preferencias del usuario
      this._aplicarPreferencias();
      
      // Iniciar sincronización local pendiente
      if (window.colaSync) {
        this.splashEstado('Sincronizando...');
        window.colaSync.iniciar();
      }
      
      // Verificar sesión
      this._verificarSesion();

      // Re-validar la sesión contra el servidor: evita que un rol forjado en
      // localStorage (o una cuenta desactivada) se mantenga tras recargar.
      this._revalidarSesion();
      window.addEventListener('online', () => this._revalidarSesion());

      // Sistema de notificaciones centralizado: poller + realtime + recordatorios
      // (todo delegado a notification-service; ver js/core/notification-service.js)
      if (window.notificationService) window.notificationService.iniciar();

      // Heartbeat: actualizar ultimo_acceso periódicamente
      this._iniciarHeartbeat();

      // Precarga inteligente: descarga en segundo plano (idle) las vistas
      // pesadas que el rol del usuario probablemente usará.
      this._precargarPorRol();

      // ============================================================
      // Eventos de autenticación
      // ============================================================
      window.eventBus.suscribir('auth:login', async (payload) => {
        const usuario = payload.usuario || payload;
        const recordar = payload.recordar !== false;
        
        if (!usuario.foto_perfil) {
          try {
            const prev = JSON.parse(localStorage.getItem('fb_usuario'));
            if (prev?.foto_perfil) usuario.foto_perfil = prev.foto_perfil;
          } catch (e) {}
        }
        
        if (recordar) {
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          localStorage.setItem('fb_recordar_sesion', 'true');
        } else {
          localStorage.removeItem('fb_usuario');
          localStorage.removeItem('fb_recordar_sesion');
          sessionStorage.setItem('fb_usuario', JSON.stringify(usuario));
        }
        
        this._renderizarBarraNavegacion();

        // Marca del centro: configuracion ya no es legible sin sesión (028)
        this._aplicarMarca();

        // Navegar a /estudio ANTES de esperar el welcome (1200ms): evita que un
        // cambio de ruta del usuario durante el arranque sea sobrescrito.
        const esPrimeraVez = !localStorage.getItem('fb_setup_completado') &&
          (!usuario.preferencias || (usuario.preferencias.tema !== null && !usuario.preferencias.tema));
                            
        if (esPrimeraVez) {
          router.reemplazar('/estudio');
          setTimeout(() => this._mostrarSetupInicial(usuario), 400);
        } else {
          router.reemplazar('/estudio');
        }

        if (window._loginUI) {
          await window._loginUI.crearWelcome(usuario.nombre_completo || usuario.username);
        }

        // Notificaciones: arranca poller/realtime/recordatorios tras el login
        if (window.notificationService) window.notificationService.iniciar();

        // Push nativas Android: registrar el token del dispositivo y, si la
        // app se abrió pulsando una notificación, navegar al destino.
        if (window.pushNotificationService) await window.pushNotificationService.iniciar();
      });

      window.eventBus.suscribir('auth:logout', () => {
        localStorage.removeItem('fb_usuario');
        localStorage.removeItem('fb_recordar_sesion');
        sessionStorage.removeItem('fb_usuario');
        if (window.preferencias) window.preferencias.aplicar();
        this._renderizarBarraNavegacion();
        if (window.notificationService) window.notificationService.detener();
        // Push nativas: limpiar temporizadores y token local (los tokens de
        // Supabase ya se desactivaron en authRepository.cerrarSesion).
        if (window.pushNotificationService) window.pushNotificationService.detener();
        router.reemplazar('/login');
      });

      window.eventBus.suscribir('route:change', () => {
        this._renderizarBarraNavegacion();
        // Cancelar watchdog: la app ya cargó correctamente
        if (this._watchdogTimer) { clearTimeout(this._watchdogTimer); this._watchdogTimer = null; }
        // Ocultar splash tras montar la primera vista
        if (this._splash && !this._splashOculto) {
          this.splashEstado('Cargando datos...');
          setTimeout(() => this.ocultarSplash(), 400);
        }
      });
    },

    // ============================================================
    // NUEVO: Control de Splash Screen
    // ============================================================
    _controlarSplash() {
      const splash = document.getElementById('splashScreen');
      const status = document.getElementById('splashStatus');

      if (!splash) return;

      this._splash = splash;
      this._splashStatus = status;
      this._splashOculto = false;
      // Protección: nunca dejar el splash bloqueando la app más de 6s.
      this._splashTimeout = setTimeout(() => this.ocultarSplash(), 6000);

      const actualizarEstado = (texto) => {
        if (this._splashStatus) this._splashStatus.textContent = texto;
      };
      this._splashEstado = actualizarEstado;

      // Watchdog: si en 15s la app no ha cargado, limpiar caché y recargar
      this._watchdogTimer = setTimeout(() => this._watchdogRecargar(), 15000);

      // Secuencia inicial de carga
      actualizarEstado('Cargando usuario...');

      const usuario = store?.obtener('usuario');
      if (usuario) {
        actualizarEstado(`Hola, ${usuario.nombre_completo || usuario.username}`);
      } else {
        actualizarEstado('Cargando...');
      }
    },

    // Llamar en cada paso para reflejar progreso real
    splashEstado(texto) {
      if (this._splashEstado) this._splashEstado(texto);
    },

    ocultarSplash() {
      if (this._splashOculto || !this._splash) return;
      this._splashOculto = true;
      clearTimeout(this._splashTimeout);
      if (this._splashEstado) this._splashEstado('Listo');
      this._splash.classList.add('splash-screen--loaded');
      setTimeout(() => {
        if (this._splash && this._splash.parentNode) this._splash.remove();
      }, 600);
    },

    // Watchdog: si la app no carga en 15s, reparar la caché y recargar.
    // Usa error-recovery para respetar las guardas anti-bucle.
    async _watchdogRecargar() {
      if (this._splashOculto) return;
      if (window.errorRecovery) {
        await window.errorRecovery.recuperarCacheYRecargar('watchdog de arranque', true);
        return;
      }
      if (this._splashStatus) this._splashStatus.textContent = 'Reiniciando por tiempo de espera...';
      try { await window.cacheDatos?.limpiarTodo(); } catch (e) {}
      setTimeout(() => window.location.reload(), 1500);
    },

    _mostrarSetupInicial(usuario) {
      const I = (n) => { try { return window.Iconos.render(n); } catch(e) { return ''; } };
      let temaSel = null;

      const overlay = document.createElement('div');
      overlay.className = 'login-setup';
      overlay.innerHTML = `
        <div class="login-setup__card">
          <h2 class="login-setup__titulo">${I('sparkles')} ¡Bienvenido!</h2>
          <p class="login-setup__sub">Antes de comenzar, elige tu tema visual.</p>
          <div class="login-setup__temas">
            <button class="login-setup__tema" data-tema="light">
              <span class="login-setup__tema-radio"></span>
              <span class="login-setup__tema-label">${I('sun')} Claro</span>
            </button>
            <button class="login-setup__tema" data-tema="dark">
              <span class="login-setup__tema-radio"></span>
              <span class="login-setup__tema-label">${I('moon')} Oscuro</span>
            </button>
            <button class="login-setup__tema" data-tema="auto">
              <span class="login-setup__tema-radio"></span>
              <span class="login-setup__tema-label">${I('settings')} Automático</span>
            </button>
          </div>
          <button class="btn-primario u-mt-2" id="btnSetupContinuar" style="width:100%;justify-content:center" disabled>Continuar</button>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();

      overlay.querySelectorAll('.login-setup__tema').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('.login-setup__tema').forEach(b => b.classList.remove('login-setup__tema--sel'));
          btn.classList.add('login-setup__tema--sel');
          temaSel = btn.dataset.tema;
          overlay.querySelector('#btnSetupContinuar').disabled = false;
        });
      });

      overlay.querySelector('#btnSetupContinuar').onclick = async () => {
        if (!temaSel) return;
        const temaValor = temaSel === 'auto' ? null : temaSel;
        const prefs = { tema: temaValor, alto_contraste: false, letra_grande: false };
        if (window.preferencias) window.preferencias.guardar(prefs);
        if (temaSel !== 'auto') document.documentElement.dataset.theme = temaSel;
        else delete document.documentElement.dataset.theme;
        usuario.preferencias = prefs;
        store.actualizar('usuario', { ...usuario });
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        try { 
          await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefs) }).eq('id', usuario.id); 
        } catch (e) {}
        localStorage.setItem('fb_setup_completado', 'true');
        overlay.remove();
        window.helpers.mostrarAlerta('Preferencias guardadas.', 'exito');
      };
    },

    // FASE 2 (028): con el RLS cerrado la sesión solo es válida si el SDK de
    // Supabase Auth tiene un JWT activo para el mismo usuario. Si el token
    // expiró o no existe, se limpia la sesión local y se pide login de nuevo.
    async _recuperarSesion() {
      try {
        const guardado = localStorage.getItem('fb_usuario') || sessionStorage.getItem('fb_usuario');
        if (!guardado) return;
        const usuario = JSON.parse(guardado);
        const sb = window.supabaseClient;
        if (sb) {
          const { data } = await sb.auth.getSession();
          if (!data || !data.session || data.session.user.id !== usuario.id) {
            localStorage.removeItem('fb_usuario');
            localStorage.removeItem('fb_recordar_sesion');
            sessionStorage.removeItem('fb_usuario');
            return;
          }
        }
        store.asignar({ usuario, sesion: { autenticado: true, inicio: Date.now() } });
      } catch (e) {
        localStorage.removeItem('fb_usuario');
        sessionStorage.removeItem('fb_usuario');
      }
    },

    _aplicarPreferencias() {
      this.splashEstado('Aplicando preferencias...');
      const usuario = store.obtener('usuario');
      let prefs = usuario?.preferencias;
      if (prefs) {
        if (typeof prefs === 'string') {
          try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
        }
        if (window.preferencias) {
          let tema = prefs.tema;
          if (tema === 'claro') tema = 'light';
          else if (tema === 'oscuro') tema = 'dark';
          window.preferencias.guardar({
            tema: (tema === 'light' || tema === 'dark') ? tema : null,
            alto_contraste: !!prefs.alto_contraste,
            letra_grande: !!prefs.letra_grande
          });
          prefs.tema = tema;
        }
        const actualizado = { ...usuario, preferencias: prefs };
        localStorage.setItem('fb_usuario', JSON.stringify(actualizado));
        store.actualizar('usuario', actualizado);
      }
      if (window.preferencias) window.preferencias.aplicar();
    },

    _verificarSesion() {
      const usuario = store.obtener('usuario');
      const ruta = router.pathActual();
      const esLogin = ruta === '/login' || ruta === '/';
      if (!usuario && !esLogin) { 
        router.reemplazar('/login'); 
        return; 
      }
      if (usuario && esLogin) {
        if (window._loginUI) {
          const loading = window._loginUI.crearLoading('Cargando tu progreso...');
          setTimeout(() => { 
            loading.remove(); 
            router.reemplazar('/estudio'); 
          }, 600);
        } else {
          router.reemplazar('/estudio');
        }
        return;
      }
      router._ejecutar();
    },

    // ============================================================
    // Revalidación de sesión: los datos del servidor mandan
    // ============================================================
    async _revalidarSesion() {
      const usuario = store.obtener('usuario');
      if (!usuario || !usuario.id) return;
      const sb = window.supabaseClient;
      if (!sb || !navigator.onLine) return;
      try {
        const { data, error } = await sb.from('perfiles')
          .select('id, activo, rol, grupo_id, nombre_completo, username, foto_perfil, preferencias')
          .eq('id', usuario.id)
          .limit(1);
        if (error || !data || !data.length) {
          // El usuario ya no existe (o la tabla no permite leerlo): cerrar sesión
          if (window.authRepository) await window.authRepository.cerrarSesion();
          return;
        }
        const servidor = data[0];
        if (servidor.activo === false) {
          if (window.authRepository) await window.authRepository.cerrarSesion();
          if (window.helpers) window.helpers.mostrarAlerta('Tu cuenta ha sido desactivada.', 'error');
          return;
        }
        // Fusionar: el servidor gana en rol/activo/grupo_id y datos de perfil.
        // Así un `rol` forjado en localStorage se corrige en cuanto hay conexión.
        // Los campos que el servidor devuelve null NO pisan los locales (p.ej.
        // preferencias/foto_perfil pueden estar vacíos en BD y no deben borrar
        // lo que el usuario ya eligió en el dispositivo).
        let preferencias = servidor.preferencias;
        if (typeof preferencias === 'string') {
          try { preferencias = JSON.parse(preferencias); }
          catch (e) { preferencias = {}; }
        }
        if (preferencias == null) preferencias = usuario.preferencias || {};
        const actualizado = {
          ...usuario,
          ...servidor,
          preferencias,
          foto_perfil: servidor.foto_perfil != null ? servidor.foto_perfil : (usuario.foto_perfil || null)
        };
        // Solo tocar localStorage si el usuario eligió "recordar sesión"
        const recordar = localStorage.getItem('fb_recordar_sesion') === 'true';
        if (recordar) {
          try {
            localStorage.setItem('fb_usuario', JSON.stringify(actualizado));
          } catch (e) {}
        }
        store.actualizar('usuario', actualizado);
        this._renderizarBarraNavegacion();
      } catch (e) {
        // Sin conexión o error de red: mantener la sesión local sin cambios
      }
    },

    // Nota: los repasos y recordatorios ahora los genera el Notification
    // Service (generarRecordatorios) con datos reales del usuario.

    /* ═══ Heartbeat: actualiza ultimo_acceso cada 3 min ═══ */
    _iniciarHeartbeat() {
      const tick = () => {
        const usuario = store.obtener('usuario');
        if (usuario && usuario.id && window.adminRepository) {
          window.adminRepository.actualizarUltimoAcceso(usuario.id);
        }
      };
      // Primer tick a los 30s, luego cada 3 min
      setTimeout(() => { tick(); setInterval(tick, 180000); }, 30000);
    },

    /* ═══ Notificaciones: poller, banner y realtime delegados al
       Notification Service (js/core/notification-service.js) ═══ */

    _renderizarBarraNavegacion() {
      const nav = document.getElementById('barra-navegacion');
      if (!nav) return;
      const usuario = store.obtener('usuario');
      if (!usuario) { 
        nav.innerHTML = ''; 
        nav.style.display = 'none'; 
        this._renderizarFabNotificaciones();
        return; 
      }
      nav.style.display = '';
      nav.setAttribute('role', 'tablist');
      const items = [
        { ruta: '/examenes', icono: 'clipboard-check', texto: 'Exámenes' },
        { ruta: '/memorizacion', icono: 'brain', texto: 'Memoria' },
        { ruta: '/estudio', icono: 'book-open', texto: 'Estudio', centro: true },
        { ruta: '/explorar', icono: 'compass', texto: 'Explorar' },
        { ruta: '/perfil', icono: 'user', texto: 'Perfil' }
      ];
      const rutaActual = router.pathActual();
      const esActivo = (r) => rutaActual === r || (r !== '/perfil' && rutaActual.startsWith(r + '/')) || (r === '/perfil' && (rutaActual === '/grupos' || rutaActual.startsWith('/perfil/config/') || rutaActual.startsWith('/perfil/acerca/')));

      // Persistir sección activa en localStorage — fuente única de verdad
      const itemActivo = items.find(i => esActivo(i.ruta));
      if (itemActivo) {
        try { localStorage.setItem("fb_nav_activo", itemActivo.ruta); } catch (e) {}
      }
      nav.innerHTML = items.map(i => `
        <a href="#!${i.ruta}" class="barra-nav-inferior__item${esActivo(i.ruta) ? ' barra-nav-inferior__item--activo' : ''}${i.centro ? ' barra-nav-inferior__item--centro' : ''}" data-nav role="tab" aria-selected="${esActivo(i.ruta)}" aria-label="${i.texto}">
          <span>${window.Iconos.render(i.icono)}</span>
          <span>${i.texto}</span>
        </a>
      `).join('');
      window.Iconos.actualizar();
      nav.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', e => { 
          e.preventDefault(); 
          router.navegar(el.getAttribute('href').replace('#!', '')); 
        });
      });
      this._renderizarFabNotificaciones();
    },

    // Botón flotante de campana con badge de no leídas (acceso al centro)
    _renderizarFabNotificaciones() {
      const usuario = store.obtener('usuario');
      let fab = document.getElementById('notif-fab');
      if (!usuario) {
        if (fab) fab.remove();
        return;
      }
      if (!fab) {
        fab = document.createElement('button');
        fab.id = 'notif-fab';
        fab.className = 'notif-fab';
        fab.setAttribute('aria-label', 'Centro de notificaciones');
        fab.innerHTML = '<span class="notif-fab__icono"></span><span class="notif-fab__badge" id="notifFabBadge" hidden>0</span>';
        document.body.appendChild(fab);
        fab.addEventListener('click', () => router.navegar('/notificaciones'));
      }
      const icono = fab.querySelector('.notif-fab__icono');
      if (icono) icono.innerHTML = window.Iconos.render('bell');
      if (window.Iconos) window.Iconos.actualizar();
      if (window.notificationService) window.notificationService.actualizarBadge();
    },

    // ============================================================
    // Marca del centro: nombre/logo configurados por el propietario
    // ============================================================
    async _aplicarMarca() {
      // Usar la caché local para arrancar rápido y refrescar en segundo plano
      try {
        const cache = localStorage.getItem('fb_marca');
        if (cache) {
          const c = JSON.parse(cache);
          if (c.marca_nombre) document.title = c.marca_nombre;
        }
      } catch (e) {}
      try {
        if (!window.adminRepository) return;
        const c = await window.adminRepository.listarConfiguracion();
        if (!c) return;
        if (c.marca_nombre) document.title = c.marca_nombre;
        try { localStorage.setItem('fb_marca', JSON.stringify({ marca_nombre: c.marca_nombre || '', marca_logo: c.marca_logo || '' })); } catch (e) {}
      } catch (e) { /* sin conexión o sin permisos: mantener el título por defecto */ }
    },

    // Carga perezosa de vistas pesadas: muestra un esqueleto mientras se
    // descargan los módulos. Solo ocurre la primera vez (después el
    // import() queda en la caché de módulos del navegador).
    // NOTA: en scripts clásicos, import() resuelve rutas relativas contra la
    // URL del script (js/core/), no contra el documento. Se resuelve contra
    // document.baseURI para que funcione en raíz y en subdirectorios.
    _vistaLazy(archivos, obtener) {
      const resolver = (ruta) => new URL(ruta, document.baseURI).href;
      return {
        montar: async (raiz, params) => {
          if (raiz && !raiz.children.length && window.skeleton) {
            raiz.innerHTML = `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(6, { ancho: '100%' })}</div>`;
          }
          await Promise.all(archivos.map((a) => import(resolver(a))));
          const vista = obtener();
          if (!vista || typeof vista.montar !== 'function') {
            throw new Error('No se pudo cargar esta sección.');
          }
          return vista.montar(raiz, params);
        }
      };
    },

    _inicializarRutas() {
      router.registrar('/', { 
        montar: () => { 
          const u = store.obtener('usuario'); 
          u ? router.reemplazar('/estudio') : router.reemplazar('/login'); 
        } 
      });
      router.registrar('/login', window.vistaLogin);
      router.registrar('/estudio', window.vistaEstudio);
      router.registrar('/estudio/libro/:libro', window.vistaCapitulos);
      router.registrar('/estudio/sesion/:libro/:capitulo', window.vistaSesionEstudio);
      router.registrar('/leer/:libro/:capitulo', window.vistaSesionEstudio);
      router.registrar('/examenes', window.vistaExamenes);
      router.registrar('/memorizacion', window.vistaMemorizacion);
      router.registrar('/explorar', window.vistaExplorar);
      router.registrar('/perfil', window.vistaPerfil);
      router.registrar('/notificaciones', window.vistaNotificaciones);
      router.registrar('/perfil/config/:seccion', window.vistaPerfil);
      router.registrar('/perfil/acerca/:seccion', window.vistaPerfil);
      router.registrar('/perfil/config', { montar: () => router.navegar('/perfil') });
      router.registrar('/perfil/acerca', { montar: () => router.navegar('/perfil') });

      // ── Vistas pesadas: carga perezosa bajo demanda ──
      // Nota: /editor/nuevo se registra ANTES de /editor/:id para que la ruta
      // exacta no quede capturada por el parámetro (el router usa orden de registro).
      router.registrar('/mapa', this._vistaLazy(['./js/vistas/vista-mapa.js'], () => window.vistaMapa));
      router.registrar('/tomar/:id', this._vistaLazy(['./js/vistas/vista-examen-tomar.js'], () => window.vistaExamenTomar));
      router.registrar('/editor/nuevo', this._vistaLazy(['./js/vistas/vista-examen-editor.js'], () => window.vistaExamenEditor));
      router.registrar('/editor/:id', this._vistaLazy(['./js/vistas/vista-examen-editor.js'], () => window.vistaExamenEditor));
      router.registrar('/corregir/:id', this._vistaLazy(['./js/vistas/vista-examen-corregir.js'], () => window.vistaExamenCorregir));
      router.registrar('/calificaciones', this._vistaLazy(['./js/vistas/vista-calificaciones.js'], () => window.vistaCalificaciones));
      router.registrar('/progreso', this._vistaLazy(['./js/vistas/vista-progreso.js'], () => window.vistaProgreso));
      router.registrar('/grupos', this._vistaLazy(['./js/vistas/vista-grupos.js'], () => window.vistaGrupos));
      router.registrar('/grupos/:id', this._vistaLazy(['./js/vistas/vista-grupos.js'], () => window.vistaGrupos));
      router.registrar('/desafio/:id', this._vistaLazy(['./js/vistas/vista-desafio.js'], () => window.vistaDesafio));
      router.registrar('/admin', this._vistaLazy(['./js/vistas/admin/admin-comunes.js', './js/vistas/admin/vista-panel-admin.js'], () => window.vistaPanelAdmin));
    },

    // Precarga inteligente: cuando el dispositivo queda inactivo tras el
    // arranque, descarga en segundo plano las vistas pesadas que el rol del
    // usuario probablemente usará. La primera navegación a esas secciones
    // será instantánea.
    _precargarPorRol() {
      const usuario = store.obtener('usuario');
      if (!usuario) return;
      const rol = usuario.rol;
      const archivos = [];
      if (rol === 'owner' || rol === 'admin') {
        archivos.push('./js/vistas/admin/admin-comunes.js', './js/vistas/admin/vista-panel-admin.js');
      }
      if (rol === 'owner' || rol === 'admin' || rol === 'editor') {
        archivos.push('./js/vistas/vista-examen-editor.js', './js/vistas/vista-examen-corregir.js', './js/vistas/vista-calificaciones.js');
      }
      if (!archivos.length) return;
      const cargar = () => {
        archivos.forEach((a) => { try { import(new URL(a, document.baseURI).href).catch(() => {}); } catch (e) {} });
      };
      if ('requestIdleCallback' in window) {
        setTimeout(() => window.requestIdleCallback(cargar, { timeout: 5000 }), 10000);
      } else {
        setTimeout(cargar, 15000);
      }
    },
  };

  // ============================================================
  // Inicializar la aplicación
  // ============================================================
  
  document.addEventListener('DOMContentLoaded', () => {
    APP.init();
  });
  
  window.appShell = APP;
})();