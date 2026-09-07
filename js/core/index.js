(function() {
  'use strict';

  // Sin sesión (arranque, logout, guardia): fuera de la SPA, al login normal.
  // En producción la app vive en /app/ y el login normal es la landing de la
  // raíz (su tarjeta de acceso). En desarrollo la app vive en la raíz y el
  // login normal es login.html, junto a ella.
  function irAlLogin() {
    const enApp = window.location.pathname.startsWith('/app');
    window.location.href = enApp ? '../' : 'login.html';
  }

  const SPLASH_MINIMO_MS = 2000;
  const SPLASH_SALIDA_MS = 900;

  const APP = {
    async init() {
      // Aplicar preferencias primero
      if (window.preferencias) window.preferencias.aplicar();
    
      // Controlar splash screen
      this._controlarSplash();
    
      // Recuperar sesión (async: valida el JWT de Supabase Auth, 028)
      await this._recuperarSesion();
    
      // Tras restaurar la sesión, registrar push en segundo plano. No bloquea
      // el montaje de la primera vista y el listener de login cubre el resto.
      if (window.pushNotificationService) {
        window.pushNotificationService.iniciar().catch(() => {});
      }

      // Aplicar la marca configurada por el propietario (nombre del centro)
      this._aplicarMarca();
    
      // Inicializar rutas
      this._inicializarRutas();
    
      // Renderizar barra de navegación
      this._renderizarBarraNavegacion();
    
      // Aplicar preferencias del usuario
      this._aplicarPreferencias();
    
      // Verificar sesión y montar la primera vista antes de iniciar tareas
      // secundarias. La sincronización no debe convertir el splash en un
      // bloqueo; si tarda, su propia pantalla aparecerá de forma diferida.
      this._verificarSesion();

      // Iniciar sincronización local pendiente en segundo plano. Solo tiene
      // sentido con una sesión restaurada; la pantalla de sincronización se
      // muestra únicamente si el trabajo sigue activo tras un breve margen.
      if (window.colaSync && store.obtener('usuario')) {
        window.colaSync.iniciar({ inicial: true });
      }

      // Re-validar la sesión contra el servidor: evita que un rol forjado en
      // localStorage (o una cuenta desactivada) se mantenga tras recargar.
      this._revalidarSesion();
      window.addEventListener('online', () => this._revalidarSesion());

      // Sync con Supabase Auth: cuando el token se refresca, mantener el
      // store actualizado. Si Supabase cierra sesión, limpiar local.
      this._escucharAuthState();

      // Refrescar sesión al volver a la pestaña (tokens que expiraron mientras
      // el usuario estaba en otra app).
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this._refrescarSesionSilenciosa();
      });

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
      
        if (!usuario.foto_perfil) {
          try {
            const prev = JSON.parse(localStorage.getItem('fb_usuario'));
            if (prev?.foto_perfil) usuario.foto_perfil = prev.foto_perfil;
          } catch (e) {}
        }
      
        // Siempre persistir en localStorage para que la sesión sobreviva
        // recargas y cierres de navegador.
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        localStorage.setItem('fb_recordar_sesion', 'true');
      
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
        if (window.pushNotificationService) {
          window.pushNotificationService.iniciar().catch(() => {});
        }
      });

      window.eventBus.suscribir('auth:logout', () => {
        localStorage.removeItem('fb_usuario');
        localStorage.removeItem('fb_recordar_sesion');
        sessionStorage.removeItem('fb_usuario');
        if (window.preferencias) window.preferencias.aplicar();
        if (window.notificationService) window.notificationService.detener();
        if (window.pushNotificationService) window.pushNotificationService.detener();
        irAlLogin();
      });

      window.eventBus.suscribir('route:change', () => {
        this._renderizarBarraNavegacion();
        // Cancelar watchdog: la app ya cargó correctamente
        if (this._watchdogTimer) { clearTimeout(this._watchdogTimer); this._watchdogTimer = null; }
        // La primera vista ya puede ser interactiva. El splash mantiene una
        // entrada mínima de 2 s y después se desvanece sin cortar el render.
        if (this._splash && !this._splashOculto) {
          this.splashEstado('Listo');
          this._programarOcultarSplash();
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
      this._splashEsInicial = true;
      this._splashInicio = Date.now();
      this._splashOcultarTimer = null;
      // Protección: nunca dejar el splash bloqueando la app más de 10 s.
      this._splashTimeout = setTimeout(() => this.ocultarSplash(), 10000);

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

    _programarOcultarSplash() {
      if (this._splashOculto || !this._splash) return;
      if (this._splashOcultarTimer) clearTimeout(this._splashOcultarTimer);
      const transcurrido = Date.now() - (this._splashInicio || Date.now());
      const espera = Math.max(0, SPLASH_MINIMO_MS - transcurrido);
      this._splashOcultarTimer = setTimeout(() => this.ocultarSplash(), espera);
    },

    mostrarSplashSeccion() {
      if (this._splash && !this._splashOculto) return;
      const splash = document.createElement('div');
      splash.id = 'splashScreen';
      splash.className = 'splash-screen splash-screen--seccion';
      splash.setAttribute('role', 'status');
      splash.setAttribute('aria-label', 'Cargando sección');
      splash.innerHTML = '<div class="splash-screen__logo" aria-hidden="true"><img src="assets/iconos/icono.svg" alt="" class="splash-screen__logo-img"></div>';
      document.body.appendChild(splash);
      this._splash = splash;
      this._splashOculto = false;
      this._splashEsInicial = false;
      requestAnimationFrame(() => splash.classList.add('splash-screen--visible'));
      setTimeout(() => this.ocultarSplash(), 450);
    },

    ocultarSplash() {
      if (this._splashOculto || !this._splash) return;
      this._splashOculto = true;
      clearTimeout(this._splashTimeout);
      if (this._splashOcultarTimer) clearTimeout(this._splashOcultarTimer);
      if (this._splashEstado) this._splashEstado('Listo');
      this._splash.classList.add('splash-screen--loaded');
      const reducida = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const esperaSalida = reducida ? 0 : SPLASH_SALIDA_MS + 80;
      setTimeout(() => {
        if (this._splash && this._splash.parentNode) this._splash.remove();
      }, esperaSalida);
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

    // Restaura la sesión desde localStorage y revalida con Supabase Auth.
    // Si hay usuario guardado, se restaura INMEDIATAMENTE para que la app
    // sea usable offline. La revalidación contra Supabase corre en background
    // y solo cierra sesión si el refresh token expiró (no por errores de red).
    async _recuperarSesion() {
      try {
        const guardado = localStorage.getItem('fb_usuario');
        if (!guardado) return;
        const usuario = JSON.parse(guardado);

        // Restaurar inmediatamente: la app puede funcionar offline
        store.asignar({ usuario, sesion: { autenticado: true, inicio: Date.now() } });

        // Revalidar con Supabase en background (no bloquea el arranque)
        const sb = window.supabaseClient;
        if (sb) {
          const { data, error } = await sb.auth.getSession();
          if (error) {
            // Error de red u otro problema transitorio: mantener sesión local
            return;
          }
          if (!data.session) {
            // Sin sesión en Supabase: el refresh token pudo expirar.
            // Intentar refrescar una vez más antes de cerrar.
            const { data: refreshData, error: refreshErr } = await sb.auth.refreshSession();
            if (refreshErr || !refreshData.session) {
              // Refresh falló: el token expiró definitivamente
              store.asignar({ usuario: null, sesion: null });
              localStorage.removeItem('fb_usuario');
              localStorage.removeItem('fb_recordar_sesion');
              return;
            }
            // Refresh exitoso: actualizar la sesión con los nuevos tokens
            if (refreshData.session.user.id !== usuario.id) {
              store.asignar({ usuario: null, sesion: null });
              localStorage.removeItem('fb_usuario');
              localStorage.removeItem('fb_recordar_sesion');
              return;
            }
          } else if (data.session.user.id !== usuario.id) {
            // Sesión de otro usuario: limpiar
            store.asignar({ usuario: null, sesion: null });
            localStorage.removeItem('fb_usuario');
            localStorage.removeItem('fb_recordar_sesion');
          }
        }
      } catch (e) {
        // Error inesperado: mantener sesión si existe (modo offline-friendly)
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
      if (!usuario) {
        // Sin sesión: fuera del SPA, al login normal (landing / login.html).
        irAlLogin();
        return;
      }
      if (esLogin) {
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
        // Persistir la actualización en localStorage
        try {
          localStorage.setItem('fb_usuario', JSON.stringify(actualizado));
        } catch (e) {}
        store.actualizar('usuario', actualizado);
        this._renderizarBarraNavegacion();
      } catch (e) {
        // Sin conexión o error de red: mantener la sesión local sin cambios
      }
    },

    // Escucha cambios de estado de Supabase Auth para mantener la sesión local
    // sincronizada (token refresh, logout desde otra pestaña, etc.).
    _escucharAuthState() {
      const sb = window.supabaseClient;
      if (!sb?.auth?.onAuthStateChange) return;
      sb.auth.onAuthStateChange((evento, session) => {
        if (evento === 'SIGNED_OUT' || evento === 'USER_DELETED') {
          store.asignar({ usuario: null, sesion: null });
          localStorage.removeItem('fb_usuario');
          localStorage.removeItem('fb_recordar_sesion');
          irAlLogin();
        } else if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
          // Actualizar el usuario en store si tenemos sesión activa
          const usuario = store.obtener('usuario');
          if (usuario && session?.user?.id === usuario.id) {
            // Token refrescado: la sesión sigue válida, no tocar nada
          }
        }
      });
    },

    // Refresca la sesión de Supabase cuando el usuario vuelve a la pestaña.
    // Si el refresh token sigue válido, el nuevo JWT se guarda automáticamente.
    // Si expiró, la sesión local se mantiene (el revalidarSesion la validará).
    async _refrescarSesionSilenciosa() {
      const sb = window.supabaseClient;
      const usuario = store.obtener('usuario');
      if (!sb || !usuario) return;
      try {
        const { data } = await sb.auth.getSession();
        if (!data.session) {
          // Token expiró: intentar refresh silencioso
          const { data: refreshData } = await sb.auth.refreshSession();
          if (!refreshData.session) {
            // Refresh falló: mantener sesión local para modo offline
          }
        }
      } catch (e) { /* no bloquea la UI */ }
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
        // Sin sesión (p. ej. la pantalla de login) la sidebar no se dibuja:
        // el contenido debe ocupar toda la pantalla sin el margen lateral.
        document.body.classList.add('fb-sin-nav');
        return;
      }
      nav.style.display = '';
      document.body.classList.remove('fb-sin-nav');

      const E = (v) => window.helpers.escapeHtml(v == null ? '' : String(v));

      // Marca del centro (nombre configurado por el propietario), desde la
      // caché local para no depender de red en cada render.
      let marcaNombre = 'FormsBiblicos';
      try {
        const cache = localStorage.getItem('fb_marca');
        if (cache) {
          const c = JSON.parse(cache);
          if (c.marca_nombre) marcaNombre = c.marca_nombre;
        }
      } catch (e) { /* caché corrupta: usar nombre por defecto */ }

      // DEV: 'Memoria' y 'Explorar' ocultas en la navegación hasta su lanzamiento — quitar el filtro para restaurarlas.
      const items = [
        { ruta: '/examenes', icono: 'clipboard-check', texto: 'Exámenes' },
        { ruta: '/memorizacion', icono: 'brain', texto: 'Memoria' },
        { ruta: '/estudio', icono: 'book-open', texto: 'Estudio', centro: true },
        { ruta: '/explorar', icono: 'compass', texto: 'Explorar' },
        { ruta: '/perfil', icono: 'user', texto: 'Perfil' }
      ].filter(i => !['/memorizacion', '/explorar'].includes(i.ruta));
      const rutaActual = router.pathActual();
      const esActivo = (r) => rutaActual === r || (r !== '/perfil' && rutaActual.startsWith(r + '/')) || (r === '/perfil' && (rutaActual === '/grupos' || rutaActual.startsWith('/perfil/config/') || rutaActual.startsWith('/perfil/acerca/')));

      // Persistir sección activa en localStorage — fuente única de verdad
      const itemActivo = items.find(i => esActivo(i.ruta));
      if (itemActivo) {
        try { localStorage.setItem("fb_nav_activo", itemActivo.ruta); } catch (e) {}
      }

      // Identidad del usuario para el pie de la sidebar (solo escritorio)
      const nombre = usuario.nombre_completo || usuario.username || 'Usuario';
      const inicial = (nombre || '?').charAt(0).toUpperCase();
      const rol = (usuario.rol || '').trim().toLowerCase();
      const rolEtiqueta = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' }[rol] || rol;
      // Evita duplicar "Propietario / Propietario" cuando el nombre coincide
      // con el rol: en ese caso se muestra el @username como línea secundaria.
      const secundario = rolEtiqueta && rolEtiqueta.toLowerCase() !== nombre.toLowerCase()
        ? rolEtiqueta
        : (usuario.username ? '@' + usuario.username : rolEtiqueta);
      const avatarHtml = usuario.foto_perfil
        ? `<img class="barra-nav-inferior__avatar-foto" src="${E(usuario.foto_perfil)}" alt="">`
        : `<span class="barra-nav-inferior__avatar">${E(inicial)}</span>`;

      nav.innerHTML = `
        <div class="barra-nav-inferior__marca">
          <span class="barra-nav-inferior__logo" aria-hidden="true"><img src="assets/iconos/icono.svg" alt="" class="barra-nav-inferior__logo-img"></span>
          <span class="barra-nav-inferior__marca-nombre">${E(marcaNombre)}</span>
        </div>
        <div class="barra-nav-inferior__items" role="tablist" aria-label="Navegación principal">
          ${items.map(i => `
            <a href="#!${i.ruta}" class="barra-nav-inferior__item${esActivo(i.ruta) ? ' barra-nav-inferior__item--activo' : ''}${i.centro ? ' barra-nav-inferior__item--centro' : ''}" data-nav role="tab" aria-selected="${esActivo(i.ruta)}" aria-label="${i.texto}">
              <span class="barra-nav-inferior__icono">${window.Iconos.render(i.icono)}</span>
              <span class="barra-nav-inferior__texto">${E(i.texto)}</span>
            </a>
          `).join('')}
        </div>
        <div class="barra-nav-inferior__usuario">
          <a class="barra-nav-inferior__usuario-perfil" href="#!/perfil" data-nav aria-label="Ir a mi perfil">
            ${avatarHtml}
            <span class="barra-nav-inferior__usuario-info">
              <span class="barra-nav-inferior__usuario-nombre">${E(nombre)}</span>
              <span class="barra-nav-inferior__usuario-rol">${E(secundario)}</span>
            </span>
          </a>
          <button class="barra-nav-inferior__salir" id="btnLogoutSidebar" type="button" aria-label="Cerrar sesión" title="Cerrar sesión">${window.Iconos.render('log-out')}</button>
        </div>
      `;

      window.Iconos.actualizar();

      nav.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          router.navegar(el.getAttribute('href').replace('#!', ''));
        });
      });

      const btnSalir = nav.querySelector('#btnLogoutSidebar');
      if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
          const ok = await window.helpers.confirmar('¿Estás seguro de cerrar sesión?', { titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión' });
          if (ok && window.authRepository) window.authRepository.cerrarSesion();
        });
      }
    },

    // La campana de notificaciones ya NO vive en la barra inferior: cada
    // sección principal la renderiza en su cabecera vía el componente
    // campana-notificaciones (js/componentes/campana-notificaciones.js).

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
        },
        // El router solo conoce este wrapper (no la vista real): sin reenviar
        // desmontar, la vista real nunca se desmontaba → la vista del desafío
        // seguía con su bucle de polling y re-renderizaba la pantalla de
        // espera sobre cualquier vista a la que se navegara ("no me deja
        // salir del desafío hasta recargar").
        desmontar: (ruta) => {
          const vista = obtener();
          if (vista && typeof vista.desmontar === 'function') return vista.desmontar(ruta);
          return undefined;
        }
      };
    },

    _inicializarRutas() {
      router.registrar('/', { 
        montar: () => { 
          const u = store.obtener('usuario'); 
          u ? router.reemplazar('/estudio') : irAlLogin();
        } 
      });
      // /login ya no es una pantalla del SPA: cualquier navegación a esa ruta
      // (logout, guardia, enlace antiguo guardado) redirige al login normal.
      router.registrar('/login', { montar: () => irAlLogin() });
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
      router.registrar('/grupos', this._vistaLazy(['./js/vistas/vista-grupos.js'], () => window.vistaGrupos));
      router.registrar('/grupos/:id', this._vistaLazy(['./js/vistas/vista-grupos.js'], () => window.vistaGrupos));
      router.registrar('/desafio/:id', this._vistaLazy(['./js/vistas/vista-desafio.js'], () => window.vistaDesafio));
      router.registrar('/admin', this._vistaLazy(['./js/vistas/admin/admin-comunes.js', './js/vistas/admin/vista-panel-admin.js'], () => window.vistaPanelAdmin));

      // Guardia global: confirmar antes de salir de un desafío ACTIVO (en
      // juego, cuenta atrás o esperando con el desafío en marcha). Cubre TODAS
      // las salidas — barra inferior, botón atrás, notificaciones, enlaces —
      // no solo el botón "Salir" de la vista. La vista marca _salidaConfirmada
      // cuando su propio diálogo ya confirmó, para no preguntar dos veces.
      router.registrarGuardia(async (ruta) => {
        const v = window.vistaDesafio;
        if (!v || typeof v._hayPartidaActiva !== 'function' || !v._hayPartidaActiva()) return true;
        if (v._salidaConfirmada) return true;
        if (ruta === '/desafio/' + v._desafioId) return true;
        const ok = await window.helpers.confirmar(
          '¿Seguro que quieres salir? Si sales ahora se contará como abandono.',
          { titulo: 'Salir del desafío', textoConfirmar: 'Salir' }
        );
        if (!ok) {
          // El hash YA cambió (evento hashchange). Revertirlo SIN disparar otro
          // hashchange (history.replaceState no emite eventos) para que la
          // partida siga exactamente donde estaba, sin re-montar la vista.
          window.history.replaceState(null, '', '#!/desafio/' + v._desafioId);
          return false;
        }
        v._salidaConfirmada = true;
        // El diálogo promete "se contará como abandono": cumplirlo, igual que
        // el botón Salir de la vista (si no, el rival quedaría esperando para
        // siempre, sobre todo en desafíos sin límite de tiempo). Fire-and-forget:
        // el router navega en paralelo.
        if (typeof v._abandonarPartida === 'function') v._abandonarPartida();
        return true;
      });
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