(function() {
  'use strict';
  
  const APP = {
    init() {
      // Aplicar preferencias primero
      if (window.preferencias) window.preferencias.aplicar();
      
      // Controlar splash screen
      this._controlarSplash();
      
      // Recuperar sesión
      this._recuperarSesion();

      // Aplicar la marca configurada por el propietario (nombre del centro)
      this._aplicarMarca();
      
      // Inicializar rutas
      this._inicializarRutas();
      
      // Renderizar barra de navegación
      this._renderizarBarraNavegacion();
      
      // Aplicar preferencias del usuario
      this._aplicarPreferencias();
      
      // Iniciar sincronización offline
      if (window.colaSync) {
        this.splashEstado('Sincronizando...');
        window.colaSync.iniciar();
      }
      
      // Verificar sesión
      this._verificarSesion();

      // Poller de invitaciones a desafíos (banner global donde sea que estés)
      this._iniciarPollInvitaciones();

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

        // Navegar a /estudio ANTES de esperar el welcome (1200ms): evita que un
        // cambio de ruta del usuario durante el arranque sea sobrescrito.
        const esPrimeraVez = !localStorage.getItem('fb_setup_completado') && 
                            !usuario.preferencias?.tema && 
                            usuario.preferencias?.tema !== null;
                            
        if (esPrimeraVez) {
          router.reemplazar('/estudio');
          setTimeout(() => this._mostrarSetupInicial(usuario), 400);
        } else {
          router.reemplazar('/estudio');
        }

        if (window._loginUI) {
          await window._loginUI.crearWelcome(usuario.nombre_completo || usuario.username);
        }

        this._notificarRepasos();
      });

      window.eventBus.suscribir('auth:logout', () => {
        localStorage.removeItem('fb_usuario');
        localStorage.removeItem('fb_recordar_sesion');
        sessionStorage.removeItem('fb_usuario');
        if (window.preferencias) window.preferencias.aplicar();
        this._renderizarBarraNavegacion();
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

    // Watchdog: si la app no carga en 15s, limpiar caché y recargar
    async _watchdogRecargar() {
      if (this._splashOculto) return;
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

    _recuperarSesion() {
      try {
        const recordar = localStorage.getItem('fb_recordar_sesion');
        const guardado = localStorage.getItem('fb_usuario') || sessionStorage.getItem('fb_usuario');
        if (guardado) {
          const usuario = JSON.parse(guardado);
          store.asignar({ usuario, sesion: { autenticado: true, inicio: Date.now() } });
        }
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
      const ruta = router._rutaActual();
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

    async _notificarRepasos() {
      const usuario = store.obtener('usuario');
      if (!usuario) return;
      // Respetar la preferencia de recordatorios de estudio (por defecto activada)
      if ((usuario.preferencias || {}).notif_recordatorios === false) return;
      const hoy = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('fb_toast_repaso') === hoy) return;
      try {
        const pendientes = await window.memorizacionRepository.tarjetasPendientes(usuario.id);
        if (pendientes && pendientes.length > 0) {
          this._mostrarToastRepaso(pendientes.length);
          
          // NUEVO: Notificación push si está disponible
          if (window.notifications) {
            await window.notifications.notificarRepasos(pendientes.length);
          }
        }
      } catch (e) {}
    },

    _mostrarToastRepaso(n) {
      if (document.getElementById('toast-repaso')) return;
      const t = document.createElement('div');
      t.id = 'toast-repaso';
      t.className = 'toast-repaso';
      t.innerHTML = `
        <span class="toast-repaso__icono">${window.Iconos.render('brain')}</span>
        <div class="toast-repaso__cuerpo">
          <p class="toast-repaso__titulo">Hoy tienes</p>
          <p class="toast-repaso__texto">${n} versículo${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}.</p>
        </div>
        <button class="toast-repaso__cerrar" aria-label="Cerrar">×</button>
      `;
      t.addEventListener('click', (ev) => {
        if (ev.target.closest('.toast-repaso__cerrar')) { 
          t.remove(); 
          return; 
        }
        router.navegar('/memorizacion');
        t.remove();
      });
      document.body.appendChild(t);
      localStorage.setItem('fb_toast_repaso', new Date().toISOString().slice(0, 10));
      setTimeout(() => { if (t) t.remove(); }, 9000);
    },

    /* ═══ Invitaciones a desafíos: banner global ═══ */
    _iniciarPollInvitaciones() {
      this._desafioNotifsVistas = new Set();
      this._desafioBannerVisible = false;
      setInterval(() => this._verificarInvitacionesDesafio(), 12000);
      setTimeout(() => this._verificarInvitacionesDesafio(), 4000);
    },

    async _verificarInvitacionesDesafio() {
      const usuario = store.obtener('usuario');
      if (!usuario || !window.desafiosRepository) return;
      // No molestar mientras se está en un desafío o en la pantalla de grupos
      const ruta = router._rutaActual();
      if (ruta && (ruta.startsWith('/desafio/') || ruta === '/grupos')) return;
      if (this._desafioBannerVisible) return;
      try {
        const pendientes = await window.desafiosRepository.notificacionesPendientes(usuario.id);
        const nuevo = (pendientes || []).find(n => n && n.datos && n.datos.desafio_id && !this._desafioNotifsVistas.has(n.id));
        if (nuevo) {
          this._desafioNotifsVistas.add(nuevo.id);
          this._mostrarBannerDesafio(nuevo, usuario);
          // Notificación nativa del dispositivo
          if (window.notifications) {
            const datos = nuevo.datos || {};
            const creador = (nuevo.titulo || '').includes('te ha desafiado')
              ? nuevo.titulo.replace(' te ha desafiado', '')
              : (nuevo.titulo || 'Alguien');
            window.notifications.notificarDesafio(
              creador,
              datos.mazo_nombre || 'Memorización',
              datos.desafio_id
            );
          }
        }
      } catch (e) {}
    },

    _mostrarBannerDesafio(notif, usuario) {
      if (document.getElementById('desafio-banner')) return;
      const esc = (t) => window.helpers.escapeHtml(t);
      this._desafioBannerVisible = true;
      const datos = notif.datos || {};
      const b = document.createElement('div');
      b.id = 'desafio-banner';
      b.className = 'desafio-banner';
      b.innerHTML = `
        <span class="desafio-banner__icono">${window.Iconos.render('sword')}</span>
        <div class="desafio-banner__cuerpo">
          <p class="desafio-banner__titulo">${esc(notif.titulo || 'Desafío recibido')}</p>
          <p class="desafio-banner__texto">${esc(notif.cuerpo || '')}</p>
        </div>
        <div class="desafio-banner__acciones">
          <button class="btn-primario" data-banner-accion="aceptar">${window.Iconos.render('check')} Aceptar</button>
          <button class="btn-secundario" data-banner-accion="rechazar">${window.Iconos.render('x')} Rechazar</button>
        </div>
        <button class="desafio-banner__cerrar" data-banner-accion="cerrar" aria-label="Cerrar">×</button>
      `;
      document.body.appendChild(b);
      window.Iconos.actualizar();

      const cerrar = () => {
        b.remove();
        this._desafioBannerVisible = false;
        window.desafiosRepository.marcarNotificacionLeida(notif.id).catch(() => {});
      };

      b.querySelector('[data-banner-accion="cerrar"]').onclick = cerrar;
      b.querySelector('[data-banner-accion="rechazar"]').onclick = async () => {
        try { await window.desafiosRepository.responderInvitacion(datos.desafio_id, usuario.id, false); } catch (e) {}
        cerrar();
        window.helpers.mostrarAlerta('Has rechazado el desafío.', 'info');
      };
      b.querySelector('[data-banner-accion="aceptar"]').onclick = async () => {
        try {
          const r = await window.desafiosRepository.responderInvitacion(datos.desafio_id, usuario.id, true);
          cerrar();
          router.navegar('/desafio/' + datos.desafio_id);
          if (!r.empezado) window.helpers.mostrarAlerta('Has aceptado. Esperando a los demás...', 'exito');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
      setTimeout(() => { if (b && b.parentNode) { b.remove(); this._desafioBannerVisible = false; } }, 30000);
    },

    _renderizarBarraNavegacion() {
      const nav = document.getElementById('barra-navegacion');
      if (!nav) return;
      const usuario = store.obtener('usuario');
      if (!usuario) { 
        nav.innerHTML = ''; 
        nav.style.display = 'none'; 
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
      const rutaActual = router._rutaActual();
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
      router.registrar('/mapa', window.vistaMapa);
      router.registrar('/examenes', window.vistaExamenes);
      router.registrar('/tomar/:id', window.vistaExamenTomar);
      router.registrar('/editor/:id', window.vistaExamenEditor);
      router.registrar('/editor/nuevo', window.vistaExamenEditor);
      router.registrar('/corregir/:id', window.vistaExamenCorregir);
      router.registrar('/calificaciones', window.vistaCalificaciones);
      router.registrar('/memorizacion', window.vistaMemorizacion);
      router.registrar('/progreso', window.vistaProgreso);
      router.registrar('/explorar', window.vistaExplorar);
      router.registrar('/perfil', window.vistaPerfil);
      router.registrar('/perfil/config/:seccion', window.vistaPerfil);
      router.registrar('/perfil/acerca/:seccion', window.vistaPerfil);
      router.registrar('/perfil/config', { montar: () => router.navegar('/perfil') });
      router.registrar('/perfil/acerca', { montar: () => router.navegar('/perfil') });
      router.registrar('/grupos', window.vistaGrupos);
      router.registrar('/grupos/:id', window.vistaGrupos);
      router.registrar('/desafio/:id', window.vistaDesafio);
      router.registrar('/admin', window.vistaPanelAdmin);
    }
  };

  // ============================================================
  // Inicializar la aplicación
  // ============================================================
  
  document.addEventListener('DOMContentLoaded', () => {
    APP.init();
  });
  
  window.appShell = APP;
})();