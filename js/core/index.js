(function() {
  'use strict';
  const APP = {
    init() {
      if (window.preferencias) window.preferencias.aplicar();
      this._recuperarSesion();
      this._inicializarRutas();
      this._renderizarBarraNavegacion();
      this._aplicarPreferencias();
      if (window.colaSync) window.colaSync.iniciar();
      this._verificarSesion();
      window.eventBus.suscribir('auth:login', (usuario) => {
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        this._renderizarBarraNavegacion();
        this._notificarRepasos();
        router.reemplazar('/estudio');
      });
      window.eventBus.suscribir('auth:logout', () => {
        localStorage.removeItem('fb_usuario');
        if (window.preferencias) window.preferencias.aplicar();
        this._renderizarBarraNavegacion();
        router.reemplazar('/login');
      });
    },
    _recuperarSesion() {
      try {
        const guardado = localStorage.getItem('fb_usuario');
        if (guardado) {
          const usuario = JSON.parse(guardado);
          store.asignar({ usuario, sesion: { autenticado: true, inicio: Date.now() } });
        }
      } catch (e) { localStorage.removeItem('fb_usuario'); }
    },
    _aplicarPreferencias() {
      const usuario = store.obtener('usuario');
      const prefs = usuario?.preferencias;
      if (prefs) {
        if (window.preferencias) {
          window.preferencias.guardar({
            tema: (prefs.tema === 'claro' || prefs.tema === 'oscuro') ? prefs.tema : null,
            alto_contraste: !!prefs.alto_contraste,
            letra_grande: !!prefs.letra_grande
          });
        }
      }
      if (window.preferencias) window.preferencias.aplicar();
    },
    _verificarSesion() {
      const usuario = store.obtener('usuario');
      const ruta = router._rutaActual();
      const esLogin = ruta === '/login' || ruta === '/';
      if (!usuario && !esLogin) { router.reemplazar('/login'); return; }
      if (usuario && esLogin) { router.reemplazar('/estudio'); return; }
      router._ejecutar();
    },
    async _notificarRepasos() {
      const usuario = store.obtener('usuario');
      if (!usuario) return;
      const hoy = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('fb_toast_repaso') === hoy) return;
      try {
        const pendientes = await window.memorizacionRepository.tarjetasPendientes(usuario.id);
        if (pendientes && pendientes.length > 0) this._mostrarToastRepaso(pendientes.length);
      } catch (e) {}
    },
    _mostrarToastRepaso(n) {
      if (document.getElementById('toast-repaso')) return;
      const t = document.createElement('div');
      t.id = 'toast-repaso';
      t.className = 'toast-repaso';
      t.innerHTML = `<span class="toast-repaso__icono">${window.Iconos.render('brain')}</span>
        <div class="toast-repaso__cuerpo">
          <p class="toast-repaso__titulo">Repaso de memorización</p>
          <p class="toast-repaso__texto">Tienes ${n} versículo${n === 1 ? '' : 's'} para repasar hoy.</p>
        </div>
        <button class="toast-repaso__cerrar" aria-label="Cerrar">×</button>`;
      t.addEventListener('click', (ev) => {
        if (ev.target.closest('.toast-repaso__cerrar')) { t.remove(); return; }
        router.navegar('/memorizacion');
        t.remove();
      });
      document.body.appendChild(t);
      localStorage.setItem('fb_toast_repaso', new Date().toISOString().slice(0, 10));
      setTimeout(() => { if (t) t.remove(); }, 9000);
    },
    _renderizarBarraNavegacion() {
      const nav = document.getElementById('barra-navegacion');
      if (!nav) return;
      const usuario = store.obtener('usuario');
      if (!usuario) { nav.innerHTML = ''; return; }
      const items = [
        { ruta: '/estudio', icono: 'book-open', texto: 'Estudio' },
        { ruta: '/examenes', icono: 'clipboard-check', texto: 'Exámenes' },
        { ruta: '/memorizacion', icono: 'brain', texto: 'Memoria' },
        { ruta: '/progreso', icono: 'pie-chart', texto: 'Progreso' },
        { ruta: '/perfil', icono: 'user', texto: 'Perfil' }
      ];
      const rutaActual = router._rutaActual();
      const esActivo = (r) => rutaActual === r || (r !== '/perfil' && rutaActual.startsWith(r + '/'));
      nav.innerHTML = items.map(i => `<a href="#!${i.ruta}" class="barra-nav-inferior__item${esActivo(i.ruta) ? ' barra-nav-inferior__item--activo' : ''}" data-nav><span>${window.Iconos.render(i.icono)}</span><span>${i.texto}</span></a>`).join('');
      window.Iconos.actualizar();
      nav.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); router.navegar(el.getAttribute('href').replace('#!', '')); });
      });
    },
    _inicializarRutas() {
      router.registrar('/', { montar: () => { const u = store.obtener('usuario'); u ? router.reemplazar('/estudio') : router.reemplazar('/login'); } });
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
      router.registrar('/perfil', window.vistaPerfil);
      router.registrar('/admin', window.vistaPanelAdmin);
      router.registrar('/owner', window.vistaOwner);
    }
  };
  document.addEventListener('DOMContentLoaded', () => APP.init());
  window.appShell = APP;
})();
