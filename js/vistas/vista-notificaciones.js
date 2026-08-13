(function() {
  'use strict';
  // ============================================================
  // js/vistas/vista-notificaciones.js
  // Centro de notificaciones SIMPLIFICADO: un título y cada tarjeta
  // de notificación pendiente. Sin pestañas, sin chips de categoría,
  // sin subsecciones. Los datos vienen del store (alimentado por
  // notification-service) y se actualizan en tiempo real
  // (realtime + polling).
  // ============================================================
  const I = (n) => window.Iconos ? window.Iconos.render(n) : '';
  const E = (s) => window.helpers ? window.helpers.escapeHtml(s || '') : s;

  const CATEGORIAS = () => (window.notificationService && window.notificationService.CATEGORIAS) || {};

  function _tiempoRelativo(iso) {
    if (!iso) return '';
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Ahora';
      if (mins < 60) return `Hace ${mins} min`;
      const horas = Math.floor(mins / 60);
      if (horas < 24) return `Hace ${horas}h`;
      const dias = Math.floor(horas / 24);
      if (dias < 7) return `Hace ${dias}d`;
      return window.helpers.formatearFecha(iso);
    } catch (e) { return ''; }
  }

  window.vistaNotificaciones = {
    _desuscribir: null,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }

      raiz.innerHTML = `
        <div class="o-contenedor o-contenedor--ancho" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="notif-centro__cabecera">
            <button class="btn-icono" data-volver aria-label="Volver">${I('arrow-left')}</button>
            <h1 class="notif-centro__titulo">Notificaciones</h1>
            <div class="notif-centro__acciones">
              <button class="btn-secundario u-fs-xs" id="btnMarcarTodas" title="Marcar todas como leídas">${I('check')} <span>Marcar leídas</span></button>
            </div>
          </div>
          <div class="notif-filtros" id="notifFiltros" role="tablist" aria-label="Filtrar notificaciones"></div>
          <div id="notifLista" aria-live="polite"></div>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      raiz.querySelector('[data-volver]').onclick = () => router.irAtras();

      const btnMarcar = raiz.querySelector('#btnMarcarTodas');
      if (btnMarcar) btnMarcar.onclick = async () => {
        btnMarcar.disabled = true;
        if (window.notificationService) await window.notificationService.marcarTodasVistas();
        btnMarcar.disabled = false;
      };

      // Sincronizar con el servicio (store + realtime + polling)
      this._desuscribir = store.suscribir('notificaciones', () => this._render(raiz));

      this._render(raiz);

      // Refrescar datos al entrar
      if (window.notificationService) window.notificationService.refrescar();
      // Marcar como vistas las que están visibles (ciclo de vida)
      setTimeout(() => this._marcarVisiblesVistas(raiz), 600);
    },

    desmontar() {
      if (this._desuscribir) { this._desuscribir(); this._desuscribir = null; }
    },

    _estadoStore() {
      const st = store.obtener('notificaciones');
      return (st && st.items) ? st : { items: [], noLeidas: 0, porCategoria: {}, cargando: false, error: null };
    },

    // Pendientes = todo lo que no está archivado, respetando el filtro activo
    _filtrar(items) {
      const base = (items || []).filter(f => f.estado !== 'archivada');
      const filtro = this._filtro || 'todas';
      if (filtro === 'todas') return base;
      if (filtro === 'no_leidas') return base.filter(f => f.estado === 'nueva');
      return base.filter(f => f.categoria === filtro);
    },

    _filtrosDisponibles(items) {
      const cats = new Set();
      (items || []).forEach(f => { if (f.categoria && f.estado !== 'archivada') cats.add(f.categoria); });
      return ['todas', 'no_leidas', ...Array.from(cats)];
    },

    _render(raiz) {
      this._renderFiltros(raiz);
      this._renderLista(raiz);
    },

    _renderFiltros(raiz) {
      const cont = raiz.querySelector('#notifFiltros');
      if (!cont) return;
      const st = this._estadoStore();
      const cats = CATEGORIAS();
      const disponibles = this._filtrosDisponibles(st.items);
      const filtro = this._filtro || 'todas';
      const etiqueta = (f) => f === 'todas' ? 'Todas' : (f === 'no_leidas' ? 'No leídas' : ((cats[f] && cats[f].etiqueta) || f));
      cont.innerHTML = disponibles.map(f =>
        `<button class="notif-filtro${filtro === f ? ' notif-filtro--activo' : ''}" data-filtro="${E(f)}" role="tab" aria-selected="${filtro === f}">${E(etiqueta(f))}</button>`
      ).join('');
      cont.querySelectorAll('[data-filtro]').forEach(btn => {
        btn.onclick = () => {
          this._filtro = btn.dataset.filtro;
          this._renderFiltros(raiz);
          this._renderLista(raiz);
        };
      });
    },

    _renderLista(raiz) {
      const lista = raiz.querySelector('#notifLista');
      if (!lista) return;
      const st = this._estadoStore();

      if (st.error) {
        lista.innerHTML = `<div class="empty-state">
          <div class="empty-state__icono">${I('alert-triangle')}</div>
          <h3 class="empty-state__titulo">No se pudieron cargar</h3>
          <p class="empty-state__descripcion">Revisa tu conexión y vuelve a intentarlo.</p>
          <button class="btn-primario" id="btnReintentar" style="justify-content:center">Reintentar</button>
        </div>`;
        const btn = lista.querySelector('#btnReintentar');
        if (btn) btn.onclick = () => window.notificationService && window.notificationService.refrescar();
        return;
      }

      const items = this._filtrar(st.items);

      if (!items.length) {
        lista.innerHTML = `<div class="empty-state">
          <div class="empty-state__icono">${I('bell')}</div>
          <h3 class="empty-state__titulo">Todo al día</h3>
          <p class="empty-state__descripcion">No tienes notificaciones pendientes. Aquí llegarán tus avisos de desafíos, exámenes, estudio y más.</p>
        </div>`;
        return;
      }

      lista.innerHTML = items.map(f => this._tarjeta(f)).join('');
      this._conectar(raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    _tarjeta(f) {
      const cats = CATEGORIAS();
      const meta = cats[f.categoria] || cats.sistema;
      const accs = Array.isArray(f.acciones) ? f.acciones.filter(a => a && a.id) : [];
      // Una tarjeta ya respondida (aceptada/rechazada/completada) no debe
      // volver a ofrecer Aceptar/Rechazar: el reto ya está resuelto.
      const accsVisibles = f.estado === 'completada' ? [] : accs;
      const agrupado = (f.contador || 1) > 1;

      return `
      <article class="notif-card notif-card--${f.estado || 'vista'} notif-card--${f.categoria || 'sistema'}" data-id="${f.id}">
        <div class="notif-card__icono">${I(meta.icono)}</div>
        <div class="notif-card__cuerpo">
          <div class="notif-card__fila">
            <h4 class="notif-card__titulo">${E(f.titulo)}${agrupado ? ` <span class="notif-card__contador" title="${f.contador} notificaciones">×${f.contador}</span>` : ''}</h4>
            <span class="notif-card__fecha">${E(_tiempoRelativo(f.creado_en))}</span>
          </div>
          ${f.cuerpo ? `<p class="notif-card__desc">${E(f.cuerpo)}</p>` : ''}
          ${accsVisibles.length ? `
            <div class="notif-card__acciones">
              ${accsVisibles.map(a => `<button class="notif-card__accion${a.id === 'rechazar' ? ' notif-card__accion--peligro' : ''}" data-accion="${a.id}" data-id="${f.id}">${I(a.icono)} ${E(a.etiqueta)}</button>`).join('')}
            </div>` : ''}
        </div>
        <div class="notif-card__marca"><span class="notif-card__punto"></span></div>
      </article>`;
    },

    _conectar(raiz) {
      // Clic en el cuerpo de la tarjeta → navegar (si hay destino)
      raiz.querySelectorAll('.notif-card__cuerpo').forEach(cuerpo => {
        cuerpo.onclick = (ev) => {
          if (ev.target.closest('[data-accion]')) return;
          const card = cuerpo.closest('.notif-card');
          const f = this._porId(card.dataset.id);
          if (!f) return;
          const url = f.url || (f.datos && f.datos.url);
          if (url) {
            router.navegar(url);
            if (window.notificationService) window.notificationService.marcarCompletada(f.id);
          } else {
            // Sin destino: solo cerrarla del pendiente
            if (window.notificationService) window.notificationService.marcarCompletada(f.id);
          }
        };
      });

      // Acciones rápidas (desafíos: aceptar / rechazar / ver)
      raiz.querySelectorAll('[data-accion]').forEach(btn => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          btn.disabled = true;
          const f = this._porId(btn.dataset.id);
          if (window.notificationService && f) {
            await window.notificationService.ejecutarAccion(f.id, btn.dataset.accion, f);
          }
        };
      });
    },

    _porId(id) {
      return (this._estadoStore().items || []).find(f => f.id === id) || null;
    },

    _marcarVisiblesVistas(raiz) {
      const ids = [];
      raiz.querySelectorAll('.notif-card--nueva').forEach(card => {
        if (card.dataset.id) ids.push(card.dataset.id);
      });
      if (ids.length && window.notificationService) {
        window.notificationService.marcarVistasEnCentro(ids);
      }
    }
  };
})();
