(function() {
  'use strict';
  // ============================================================
  // js/vistas/vista-notificaciones.js
  // Centro de notificaciones: historial persistente con ciclo de
  // vida (nueva → vista → completada → archivada), filtros por
  // categoría, agrupación inteligente y acciones rápidas.
  // Los datos vienen del store (alimentado por notification-service)
  // y se actualizan en tiempo real (realtime + polling).
  // ============================================================
  const I = (n) => window.Iconos ? window.Iconos.render(n) : '';
  const E = (s) => window.helpers ? window.helpers.escapeHtml(s || '') : s;

  const CATEGORIAS = () => (window.notificationService && window.notificationService.CATEGORIAS) || {};
  const ORDEN_CATEGORIAS = ['desafios', 'examenes', 'estudio', 'grupos', 'logros', 'sistema', 'anuncios'];

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

  function _seccionDe(iso) {
    if (!iso) return 'Antes';
    const t = new Date(iso).getTime();
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const unDia = 86400000;
    if (t >= hoy) return 'Hoy';
    if (t >= hoy - unDia) return 'Ayer';
    const lunes = hoy - (((ahora.getDay() + 6) % 7) * unDia);
    if (t >= lunes) return 'Esta semana';
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    if (t >= inicioMes) return 'Este mes';
    return 'Antes';
  }

  const SECCIONES = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Antes'];

  window.vistaNotificaciones = {
    _desuscribir: null,
    _tab: 'notificaciones',
    _categoria: 'todas',
    _filtroActivo: true, // estado archivo: en 'notificaciones' se ocultan archivadas

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }

      raiz.innerHTML = `
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="notif-centro__cabecera">
            <button class="btn-icono" data-volver aria-label="Volver">${I('arrow-left')}</button>
            <h1 class="notif-centro__titulo">Notificaciones</h1>
            <div class="notif-centro__acciones">
              <button class="notif-btn-tool" id="btnMarcarTodas">${I('check-check')} Marcar leídas</button>
              <button class="notif-btn-tool" id="btnRefrescar" aria-label="Actualizar">${I('refresh-cw')}</button>
            </div>
          </div>
          <div class="notif-tabs" role="tablist" aria-label="Secciones">
            <button class="notif-tab notif-tab--activo" data-tab="notificaciones" role="tab" aria-selected="true">Notificaciones</button>
            <button class="notif-tab" data-tab="actividad" role="tab" aria-selected="false">Actividad</button>
          </div>
          <div class="notif-chips" id="notifChips" role="tablist" aria-label="Filtrar por categoría"></div>
          <div id="notifLista" aria-live="polite"></div>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      raiz.querySelector('[data-volver]').onclick = () => router.irAtras();
      raiz.querySelector('#btnMarcarTodas').onclick = () => {
        if (window.notificationService) window.notificationService.marcarTodasVistas();
      };
      raiz.querySelector('#btnRefrescar').onclick = () => {
        if (window.notificationService && window.notificationService.refrescar) window.notificationService.refrescar();
      };

      raiz.querySelectorAll('.notif-tab').forEach(btn => {
        btn.onclick = () => {
          this._tab = btn.dataset.tab;
          raiz.querySelectorAll('.notif-tab').forEach(b => {
            b.classList.toggle('notif-tab--activo', b === btn);
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          this._renderLista(raiz);
        };
      });

      // Sincronizar con el servicio (store + realtime + polling)
      this._desuscribir = store.suscribir('notificaciones', () => this._renderLista(raiz));

      this._renderChips(raiz);
      this._renderLista(raiz);

      // Marcar como vistas las que están visibles (ciclo de vida)
      if (window.notificationService) window.notificationService.refrescar();
      setTimeout(() => this._marcarVisiblesVistas(raiz), 600);
    },

    desmontar() {
      if (this._desuscribir) { this._desuscribir(); this._desuscribir = null; }
    },

    _estadoStore() {
      const st = store.obtener('notificaciones');
      return (st && st.items) ? st : { items: [], noLeidas: 0, porCategoria: {}, cargando: false, error: null };
    },

    _filtrar(items) {
      return items.filter(f => {
        if (this._tab === 'notificaciones' && f.estado === 'archivada') return false;
        if (this._categoria !== 'todas' && f.categoria !== this._categoria) return false;
        return true;
      });
    },

    _renderChips(raiz) {
      const cats = CATEGORIAS();
      const st = this._estadoStore();
      const porCategoria = st.porCategoria || {};
      const cont = raiz.querySelector('#notifChips');
      if (!cont) return;
      const total = Object.values(porCategoria).reduce((a, b) => a + (b || 0), 0);
      const chip = (id, etiqueta, icono, contador) => `
        <button class="notif-chip${this._categoria === id ? ' notif-chip--activo' : ''}" data-chip="${id}" role="tab" aria-selected="${this._categoria === id}">
          ${icono ? I(icono) : ''}${E(etiqueta)}${contador > 0 ? ` <span class="notif-chip__contador">${contador}</span>` : ''}
        </button>`;
      cont.innerHTML = chip('todas', 'Todas', '', total) + ORDEN_CATEGORIAS.map(c => {
        const meta = cats[c];
        return meta ? chip(c, meta.etiqueta, meta.icono, porCategoria[c] || 0) : '';
      }).join('');
      cont.querySelectorAll('[data-chip]').forEach(btn => {
        btn.onclick = () => {
          this._categoria = btn.dataset.chip;
          cont.querySelectorAll('[data-chip]').forEach(b => {
            b.classList.toggle('notif-chip--activo', b === btn);
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          this._renderLista(raiz);
        };
      });
      if (window.Iconos) window.Iconos.actualizar();
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

      const items = this._filtrar(st.items || []);

      if (!items.length) {
        const esNotif = this._tab === 'notificaciones';
        lista.innerHTML = `<div class="empty-state">
          <div class="empty-state__icono">${I(esNotif ? 'bell' : 'activity')}</div>
          <h3 class="empty-state__titulo">${esNotif ? 'Todo al día' : 'Sin actividad todavía'}</h3>
          <p class="empty-state__descripcion">${esNotif ? 'No tienes notificaciones pendientes. Aquí llegarán tus avisos de desafíos, exámenes, estudio y más.' : 'Cuando ocurra algo (un logro, un desafío, una corrección), aparecerá aquí.'}</p>
        </div>`;
        return;
      }

      // Agrupar por sección de fecha
      const porSeccion = {};
      items.forEach(f => {
        const s = _seccionDe(f.creado_en);
        if (!porSeccion[s]) porSeccion[s] = [];
        porSeccion[s].push(f);
      });

      const noLeidas = st.noLeidas || 0;
      const html = SECCIONES.filter(s => porSeccion[s]).map(s => `
        <section class="notif-seccion">
          <h3 class="notif-seccion__titulo">${s}</h3>
          ${porSeccion[s].map(f => this._tarjeta(f)).join('')}
        </section>`).join('');

      lista.innerHTML = `
        ${noLeidas > 0 && this._tab === 'notificaciones' ? `<div class="notif-cabecera-resumen u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm)">${noLeidas} sin leer</div>` : ''}
        ${html}`;

      this._conectar(raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    _tarjeta(f) {
      const cats = CATEGORIAS();
      const meta = cats[f.categoria] || cats.sistema;
      const accs = Array.isArray(f.acciones) ? f.acciones.filter(a => a && a.id) : [];
      const contador = f.contador || 1;
      const agrupado = contador > 1;
      const archivada = f.estado === 'archivada';

      return `
      <article class="notif-card notif-card--${f.estado || 'vista'} notif-card--${f.categoria || 'sistema'}" data-id="${f.id}">
        <div class="notif-card__icono">${I(meta.icono)}</div>
        <div class="notif-card__cuerpo">
          <div class="notif-card__fila">
            <h4 class="notif-card__titulo">${E(f.titulo)}</h4>
            <span class="notif-card__fecha">${E(_tiempoRelativo(f.creado_en))}</span>
          </div>
          ${f.cuerpo ? `<p class="notif-card__desc">${E(f.cuerpo)}</p>` : ''}
          ${agrupado ? `
            <button class="notif-card__grupo" data-grupo="${f.id}" aria-expanded="false">${I('layers')} ${contador} elemento${contador !== 1 ? 's' : ''} ${I('chevron-down')}</button>
            <div class="notif-card__detalle" data-detalle="${f.id}" hidden></div>` : ''}
          ${accs.length && !archivada ? `
            <div class="notif-card__acciones">
              ${accs.map(a => `<button class="notif-card__accion${a.id === 'rechazar' ? ' notif-card__accion--peligro' : ''}" data-accion="${a.id}" data-id="${f.id}">${I(a.icono)} ${E(a.etiqueta)}</button>`).join('')}
            </div>` : ''}
          <div class="notif-card__herramientas" style="display:flex;gap:var(--espaciado-xs);margin-top:var(--espaciado-2xs)">
            ${!archivada ? `<button class="notif-btn-tool" data-archivar="${f.id}">${I('archive')} Archivar</button>` : ''}
            <button class="notif-btn-tool" data-eliminar="${f.id}" aria-label="Eliminar">${I('trash-2')}</button>
          </div>
        </div>
        <div class="notif-card__marca"><span class="notif-card__punto"></span></div>
      </article>`;
    },

    _conectar(raiz) {
      // Clic en el cuerpo de la tarjeta → navegar (si hay destino)
      raiz.querySelectorAll('.notif-card__cuerpo').forEach(cuerpo => {
        cuerpo.onclick = (ev) => {
          if (ev.target.closest('[data-accion], [data-archivar], [data-eliminar], [data-grupo]')) return;
          const card = cuerpo.closest('.notif-card');
          const f = this._porId(card.dataset.id);
          if (!f) return;
          const url = f.url || (f.datos && f.datos.url);
          if (url) {
            router.navegar(url);
            if (window.notificationService) window.notificationService.marcarCompletada(f.id);
          }
        };
      });

      // Acciones rápidas
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

      // Archivar / eliminar
      raiz.querySelectorAll('[data-archivar]').forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          if (window.notificationService) window.notificationService.archivar(btn.dataset.archivar);
        };
      });
      raiz.querySelectorAll('[data-eliminar]').forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          if (window.notificationService) window.notificationService.eliminar(btn.dataset.eliminar);
        };
      });

      // Desplegar detalles de agrupaciones
      raiz.querySelectorAll('[data-grupo]').forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const id = btn.dataset.grupo;
          const det = raiz.querySelector(`[data-detalle="${id}"]`);
          if (!det) return;
          const abierto = det.hidden === false;
          det.hidden = abierto;
          btn.setAttribute('aria-expanded', String(!abierto));
          if (!abierto && !det.dataset.cargado) {
            const f = this._porId(id);
            const miembros = (f && f.datos && f.datos.miembros) || [];
            det.dataset.cargado = '1';
            det.innerHTML = miembros.length
              ? miembros.map(m => `<div class="notif-card__detalle-fila">${I('user')} ${E(m)}</div>`).join('')
              : `<div class="notif-card__detalle-fila">${I('users')} Varios participantes</div>`;
          }
        };
      });
    },

    _porId(id) {
      return (this._estadoStore().items || []).find(f => f.id === id) || null;
    },

    _marcarVisiblesVistas(raiz) {
      if (this._tab !== 'notificaciones') return;
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
