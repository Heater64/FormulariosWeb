(function () {
  'use strict';

  /* ─── Helpers internos ─── */
  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  const J = window.ejerciciosMemorizacion;
  const SM = () => window.repeticionEspaciada;

  const COLORES = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
  function colorMazo(color, idx) {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return COLORES[(idx >= 0 ? idx : 0) % COLORES.length];
  }

  const TIPOS_NOMBRE = {
    completar: 'Completar palabras',
    ordenar: 'Ordenar palabras',
    elegir_versiculo: 'Elegir el versículo',
    verdadero_falso: 'Verdadero o falso',
    relacionar: 'Relacionar',
    escrita: 'Respuesta escrita'
  };

  const TIPOS_ICONO = {
    completar: 'edit-3',
    ordenar: 'list-ordered',
    elegir_versiculo: 'book-open',
    verdadero_falso: 'check-circle',
    relacionar: 'link-2',
    escrita: 'pen-line'
  };

  // Tipos de tarjeta disponibles al crear/editar (igual que en el panel admin)
  const TIPOS_TARJETA = [
    { valor: 'versiculo', texto: 'Versículo', icono: 'book-open' },
    { valor: 'completar', texto: 'Completar palabras', icono: 'edit-3' },
    { valor: 'ordenar', texto: 'Ordenar palabras', icono: 'list-ordered' },
    { valor: 'elegir_versiculo', texto: 'Elegir el versículo', icono: 'check-circle' },
    { valor: 'verdadero_falso', texto: 'Verdadero o falso', icono: 'help-circle' },
    { valor: 'relacionar', texto: 'Relacionar', icono: 'link-2' },
    { valor: 'escrita', texto: 'Respuesta escrita', icono: 'pen-line' },
    { valor: 'libre', texto: 'Tarjeta libre (legacy)', icono: 'layers' }
  ];

  /* ════════════════════════════════════════════════════════════
     VISTA — Memorización modo juego
     ════════════════════════════════════════════════════════════ */
  window.vistaMemorizacion = {

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? window.skeleton.memorizacion() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        await this._cargarDatos();
        // Volver a la pestaña de mazos al entrar desde la navegación
        this._tabMem = 'mazos';
        this._mazoGestion = null;
        this._pintar(raiz);
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar</p></div>';
      }
    },

    async _cargarDatos() {
      const usuario = store.obtener('usuario');
      const [mazos, tarjetas, repasos, libros] = await Promise.all([
        window.memorizacionRepository.listarMazos(usuario.id),
        window.memorizacionRepository.listarTarjetas(usuario.id),
        window.memorizacionRepository.totalRepasos(usuario.id).catch(() => 0),
        window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
      ]);
      const progreso = await window.memorizacionRepository.listarProgreso(usuario.id).catch(() => ({}));
      this._datos = { mazos, tarjetas, progreso, repasos, libros: libros.data || [], usuario };
    },

    desmontar() {},

    /* ═══ Barra de pestañas (estilo Exámenes) ═══ */
    _tabsBar(esAdmin, activo) {
      return `
        <div class="examen-tabs" role="tablist" aria-label="Secciones de Memorización">
          <button class="examen-tab${activo === 'mazos' ? ' examen-tab--activo' : ''}" data-mem-tab="mazos" role="tab" aria-selected="${activo === 'mazos'}">Mazos</button>
          ${esAdmin ? `<button class="examen-tab${activo === 'gestionar' ? ' examen-tab--activo' : ''}" data-mem-tab="gestionar" role="tab" aria-selected="${activo === 'gestionar'}">${I('settings-2')} Gestionar</button>` : ''}
        </div>`;
    },

    /* ═══ HOME: grid de mazos ═══ */
    _pintar(raiz) {
      const d = this._datos;
      const esAdmin = this._puedeEditar();
      // Pestaña Gestionar: solo visible para admin/owner
      if (esAdmin && this._tabMem === 'gestionar') { this._pintarGestion(raiz); return; }
      const totalPendientes = d.mazos.reduce((acc, m) => acc + this._pendientesMazo(m.id).length, 0);
      const tarjetasTotales = d.tarjetas.length;
      const dominadasTotales = d.tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;
      const pctGlobal = tarjetasTotales ? Math.round((dominadasTotales / tarjetasTotales) * 100) : 0;

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-home">
          <!-- CABECERA -->
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Guía de Memorización">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>

          <!-- PESTAÑAS: Mazos / Gestionar (solo admin/owner) -->
          ${esAdmin ? this._tabsBar(true, 'mazos') : ''}

          <!-- RESUMEN -->
          <div class="mem-gizmo-resumen">
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${pctGlobal}%</span>
              <span class="mem-gizmo-metrica__label">Dominado</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${totalPendientes}</span>
              <span class="mem-gizmo-metrica__label">Para hoy</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${d.mazos.length}</span>
              <span class="mem-gizmo-metrica__label">Mazos</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${tarjetasTotales}</span>
              <span class="mem-gizmo-metrica__label">Tarjetas</span>
            </div>
          </div>

          <!-- GRID DE MAZOS -->
          <div class="mem-gizmo-grid">
            ${d.mazos.length === 0
              ? `<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${I('layers')}</span><h3>Sin mazos todavía</h3><p class="mem-juego-sub">El administrador publicará mazos de contenido bíblico. ¡Vuelve pronto!</p></div>`
              : d.mazos.map((m, i) => this._tarjetaMazo(m, i)).join('')}
          </div>
        </div>`;

      this._bindHome(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Aprende la Biblia jugando: cada mazo combina completar palabras, ordenar, relacionar y más. Sin exámenes: solo práctica divertida.', 'Elige un mazo y pulsa Repasar. Cada sesión mezcla tipos de ejercicios automáticamente. Las tarjetas que fallas aparecen más veces hasta que las dominas.']
      });

      // Pestañas Mazos / Gestionar
      $$(raiz, '[data-mem-tab]').forEach(btn => {
        btn.onclick = () => {
          this._tabMem = btn.dataset.memTab;
          this._mazoGestion = null;
          this._pintar(raiz);
        };
      });
    },

    _tarjetaMazo(m, idx) {
      const d = this._datos;
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === m.id);
      const pendientes = this._pendientesMazo(m.id);
      const dominadas = tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;
      const pct = tarjetas.length ? Math.round((dominadas / tarjetas.length) * 100) : 0;
      const color = colorMazo(m.color, idx);
      const completado = tarjetas.length > 0 && pct === 100;
      const radio = 19;
      const circ = 2 * Math.PI * radio; // ≈ 119.38

      const menuHtml = this._puedeEditar() ? `
        <div class="mem-juego-mazo__menu-wrap">
          <button class="mem-juego-mazo__menu-btn mem-menu-toggle" aria-label="Más opciones" aria-expanded="false">⋮</button>
          <div class="mem-juego-mazo__menu">
            <button class="mem-juego-mazo__menu-item btn-editar-mazo" data-id="${m.id}">${I('edit-3')} Editar</button>
            <button class="mem-juego-mazo__menu-item btn-duplicar-mazo" data-id="${m.id}" data-nombre="${E(m.nombre)}">${I('copy')} Duplicar</button>
            <hr class="mem-juego-mazo__menu-sep">
            <button class="mem-juego-mazo__menu-item mem-juego-mazo__menu-item--peligro btn-eliminar-mazo" data-id="${m.id}" data-nombre="${E(m.nombre)}">${I('trash-2')} Eliminar</button>
          </div>
        </div>` : '';

      return `
        <article class="mem-juego-mazo" data-mazo="${m.id}" style="--mazo-color:${color}">
          <div class="mem-gizmo-mazo__banner">
            <span class="mem-gizmo-mazo__icono">${I(m.icono || 'layers')}</span>
            ${pendientes.length > 0 ? `<span class="mem-gizmo-mazo__due">${I('clock')} ${pendientes.length} hoy</span>` : ''}
            ${completado ? `<span class="mem-gizmo-mazo__done">${I('check')}</span>` : ''}
          </div>
          <div class="mem-gizmo-mazo__cuerpo">
            <div class="mem-gizmo-mazo__titulo">
              <h3 class="mem-gizmo-mazo__nombre">${E(m.nombre)}</h3>
              ${menuHtml}
            </div>
            ${m.descripcion ? `<p class="mem-gizmo-mazo__desc">${E(m.descripcion)}</p>` : ''}
            <div class="mem-gizmo-mazo__fila">
              <div class="mem-gizmo-mazo__meta">
                <span class="mem-gizmo-mazo__meta-item">${tarjetas.length} tarjetas</span>
                <span class="mem-gizmo-mazo__meta-item">${dominadas} dominadas</span>
              </div>
              <div class="mem-gizmo-mazo__anillo" role="img" aria-label="${pct}% dominado" title="${pct}% dominado">
                <svg viewBox="0 0 44 44" aria-hidden="true">
                  <circle class="mem-gizmo-mazo__anillo-bg" cx="22" cy="22" r="${radio}"></circle>
                  <circle class="mem-gizmo-mazo__anillo-fg" cx="22" cy="22" r="${radio}" style="stroke-dasharray:${circ.toFixed(2)};stroke-dashoffset:${(circ * (1 - pct / 100)).toFixed(2)}"></circle>
                </svg>
                <span class="mem-gizmo-mazo__anillo-pct">${pct}%</span>
              </div>
            </div>
          </div>
          <button class="mem-juego-mazo__btn ${completado ? 'mem-juego-mazo__btn--completado' : ''}" data-mazo="${m.id}">
            ${completado ? I('check') : I('play')} ${completado ? 'Completado' : 'Repasar'} ${String.fromCharCode(8594)}
          </button>
        </article>`;
    },

    _pendientesMazo(mazoId) {
      const d = this._datos;
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === mazoId);
      const ahora = Date.now();
      return tarjetas.filter(t => {
        const p = d.progreso[t.id];
        if (!p) return true;
        if (!p.proximo_repaso) return true;
        return new Date(p.proximo_repaso).getTime() <= ahora;
      });
    },

    _bindHome(raiz) {
      // Click en tarjeta
      $$(raiz, '.mem-juego-mazo').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.mem-juego-mazo__menu-wrap')) return;
          this._verMazo(raiz, el.dataset.mazo);
        };
      });
      // Click en boton Empezar
      $$(raiz, '.mem-juego-mazo__btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this._verMazo(raiz, btn.dataset.mazo);
        };
      });

      // Menu 3-puntitos toggle
      $$(raiz, '.mem-menu-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const menu = btn.nextElementSibling;
          const abierto = menu.classList.contains('mem-juego-mazo__menu--abierto');
          raiz.querySelectorAll('.mem-juego-mazo__menu--abierto').forEach(m => m.classList.remove('mem-juego-mazo__menu--abierto'));
          raiz.querySelectorAll('.mem-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
          if (!abierto) {
            menu.classList.add('mem-juego-mazo__menu--abierto');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });
      // Cerrar menus al click fuera
      const closeMenus = (e) => {
        if (!e.target.closest('.mem-juego-mazo__menu-wrap')) {
          raiz.querySelectorAll('.mem-juego-mazo__menu--abierto').forEach(m => m.classList.remove('mem-juego-mazo__menu--abierto'));
          raiz.querySelectorAll('.mem-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
        }
      };
      raiz.addEventListener('click', closeMenus);

      // Admin: Editar mazo → abre la gestión del mazo en esta misma vista
      $$(raiz, '.btn-editar-mazo').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this._tabMem = 'gestionar';
          this._mazoGestion = btn.dataset.id;
          this._pintar(raiz);
        };
      });
      // Admin: Duplicar mazo
      $$(raiz, '.btn-duplicar-mazo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar(
            'Se creara una copia del mazo "' + btn.dataset.nombre + '".',
            { titulo: 'Duplicar mazo', textoConfirmar: 'Duplicar' }
          );
          if (!ok) return;
          try {
            const json = await window.memorizacionRepository.exportarMazo(btn.dataset.id);
            const usuario = store.obtener('usuario');
            await window.memorizacionRepository.importarMazo(usuario.id, json, { nombre: 'Copia de ' + btn.dataset.nombre });
            window.helpers.mostrarAlerta('Mazo duplicado.', 'exito');
            this.montar(raiz);
          } catch (err) {
            window.helpers.mostrarAlerta('Error: ' + err.message, 'error');
          }
        };
      });
      // Admin: Eliminar mazo
      $$(raiz, '.btn-eliminar-mazo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar(
            'Se eliminara el mazo "' + btn.dataset.nombre + '" y todo su contenido. Esta accion no se puede deshacer.',
            { titulo: 'Eliminar mazo', textoConfirmar: 'Eliminar' }
          );
          if (!ok) return;
          try {
            await window.memorizacionRepository.eliminarMazo(btn.dataset.id);
            window.helpers.mostrarAlerta('Mazo eliminado.', 'exito');
            this.montar(raiz);
          } catch (err) {
            window.helpers.mostrarAlerta('Error: ' + err.message, 'error');
          }
        };
      });
    },

    /* ═══ DETALLE DE MAZO ═══ */
    _verMazo(raiz, mazoId) {
      const d = this._datos;
      const mazo = d.mazos.find(m => m.id === mazoId);
      if (!mazo) { this._pintar(raiz); return; }
      const color = colorMazo(mazo.color, d.mazos.indexOf(mazo));
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === mazoId);
      const pendientes = this._pendientesMazo(mazoId);
      const dominadas = tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-detalle">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">← Mazos</button>
            <span class="mem-juego-nivel" style="--nivel-color:${color}">${E(mazo.nombre)}</span>
          </div>

          <div class="mem-juego-detalle__hero" style="--mazo-color:${color}">
            <span class="mem-juego-detalle__icono">${I(mazo.icono || 'layers')}</span>
            <h2>${E(mazo.nombre)}</h2>
            <p class="mem-juego-detalle__desc">${E(mazo.descripcion || '')}</p>
            <div class="mem-juego-detalle__stats">
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${tarjetas.length}</p><p class="mem-juego-detalle__stat-etiqueta">Tarjetas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${dominadas}</p><p class="mem-juego-detalle__stat-etiqueta">Dominadas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${pendientes.length}</p><p class="mem-juego-detalle__stat-etiqueta">Pendientes</p></div>
            </div>
            <div class="mem-juego-detalle__acciones">
              <button class="mem-juego-empezar" id="btnEmpezar" ${pendientes.length === 0 ? 'disabled' : ''}>
                ${I('play')} Empezar sesión ${pendientes.length ? `(${pendientes.length})` : ''}
              </button>
              ${this._puedeEditar() ? `<button class="btn-secundario" id="btnEditarMazo">${I('edit-3')} Editar mazo</button>` : ''}
            </div>
            ${pendientes.length === 0 && dominadas > 0 ? `<p class="mem-juego-sub">¡Mazo dominado! ${I('party-popper')} Vuelve mañana para consolidar.</p>` : ''}
          </div>
        </div>`;

      $(raiz, '#btnVolver').onclick = () => this._pintar(raiz);
      $(raiz, '#btnEmpezar').onclick = () => this._sesion(raiz, mazoId);
      const btnEditar = $(raiz, '#btnEditarMazo');
      if (btnEditar) btnEditar.onclick = () => {
        this._tabMem = 'gestionar';
        this._mazoGestion = mazoId;
        this._pintarGestion(raiz);
      };
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Gestiona los mazos y tarjetas de práctica bíblica.', 'Usa Gestionar para crear contenido y Mazos para practicar.']
      });
    },

    _puedeEditar() {
      // Crear/editar mazos: solo admin/owner (pestaña Gestionar).
      const rol = ((this._datos.usuario && this._datos.usuario.rol) || '').toString().toLowerCase();
      return rol === 'owner' || rol === 'admin';
    },

    _esOwner() {
      const rol = ((this._datos.usuario && this._datos.usuario.rol) || '').toString().toLowerCase();
      return rol === 'owner';
    },

    /* ════════════════════════════════════════════════════════
       PESTAÑA GESTIONAR — crear y editar mazos y tarjetas
       (antes esto vivía solo en el panel de administración)
       ════════════════════════════════════════════════════════ */
    _pintarGestion(raiz) {
      const d = this._datos;
      if (this._mazoGestion) return this._pintarGestionMazo(raiz);
      const esOwner = this._esOwner();
      const tarjetas = d.tarjetas;

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-home">
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Guía de Memorización">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>

          ${this._tabsBar(true, 'gestionar')}

          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">Mazos <span class="u-fs-xs u-color-texto-terciario">(${d.mazos.length})</span></h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              ${esOwner ? `<button class="btn-secundario u-fs-xs" id="btnSembrarMazosMem">${I('sparkles')} Sembrar contenido</button>` : ''}
              ${esOwner ? `<button class="btn-secundario u-fs-xs" id="btnImportarMazoMem">${I('upload')} Importar</button>` : ''}
              <button class="btn-primario u-fs-xs" id="btnCrearMazoMem">${I('plus')} Crear mazo</button>
            </div>
          </div>

          ${d.mazos.length === 0
            ? `<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${I('layers')}</span><h3>Sin mazos todavía</h3><p class="mem-juego-sub">Pulsa "Crear mazo" para empezar, o "Sembrar contenido" si eres el propietario.</p></div>`
            : `<div class="mem-gestion-grid">${d.mazos.map((m, i) => this._tarjetaGestion(m, i, tarjetas)).join('')}</div>`}
        </div>`;

      this._bindTabs(raiz);
      this._bindGestion(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Gestiona los mazos y tarjetas de práctica bíblica.', 'Usa Gestionar para crear contenido y Mazos para practicar.']
      });
    },

    _tarjetaGestion(m, idx, tarjetas) {
      const nTarjetas = tarjetas.filter(t => t.mazo_id === m.id).length;
      const color = colorMazo(m.color, idx);
      return `
        <article class="mem-gestion-card" data-mazoid="${m.id}" style="--mazo-color:${color}">
          <div class="mem-gestion-card__banner">
            <span class="mem-gestion-card__icono">${I(m.icono || 'layers')}</span>
            <p class="mem-gestion-card__nombre">${E(m.nombre)}</p>
            ${m.es_global ? `<span class="mem-gestion-card__global">${I('globe')} Global</span>` : ''}
          </div>
          <div class="mem-gestion-card__cuerpo">
            <p class="mem-gestion-card__desc">${E(m.descripcion || 'Sin descripción')}</p>
            <div class="mem-gestion-card__meta">${I('layers')} ${nTarjetas} tarjetas</div>
          </div>
          <div class="mem-gestion-card__acciones">
            <button class="mem-gestion-card__btn btn-gestion-mazo" data-mazoid="${m.id}">${I('eye')} Gestionar</button>
            <div class="mem-gestion-card__acciones-grupo">
              <button class="mem-gestion-card__btn btn-editar-mazo-gestion" data-mazoid="${m.id}" title="Editar" aria-label="Editar ${E(m.nombre)}">${I('edit-3')}</button>
              <button class="mem-gestion-card__btn btn-exportar-mazo" data-mazoid="${m.id}" title="Exportar JSON" aria-label="Exportar ${E(m.nombre)}">${I('download')}</button>
              <button class="mem-gestion-card__btn mem-gestion-card__btn--peligro btn-eliminar-mazo-gestion" data-mazoid="${m.id}" data-nombre="${E(m.nombre)}" title="Eliminar" aria-label="Eliminar ${E(m.nombre)}">${I('trash-2')}</button>
            </div>
          </div>
        </article>`;
    },

    /* Detalle de un mazo dentro de Gestionar: lista de tarjetas */
    _pintarGestionMazo(raiz) {
      const d = this._datos;
      const mazo = d.mazos.find(m => m.id === this._mazoGestion);
      if (!mazo) { this._mazoGestion = null; this._pintarGestion(raiz); return; }
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === mazo.id);
      const color = colorMazo(mazo.color, d.mazos.indexOf(mazo));

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-home">
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Guía de Memorización">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>

          ${this._tabsBar(true, 'gestionar')}

          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario u-fs-xs" id="btnVolverMazosMem">${I('arrow-left')} Mazos</button>
            <h3 style="margin:0;display:flex;align-items:center;gap:var(--espaciado-xs)">
              <span style="color:${color}">${I(mazo.icono || 'layers')}</span> ${E(mazo.nombre)}
              <span class="u-fs-xs u-color-texto-terciario">(${tarjetas.length})</span>
            </h3>
            <button class="btn-primario u-fs-xs" id="btnCrearTarjetaMem">${I('plus')} Nueva tarjeta</button>
          </div>

          ${tarjetas.length === 0
            ? `<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${I('layers')}</span><h3>Sin tarjetas</h3><p class="mem-juego-sub">Añade la primera tarjeta para que los usuarios puedan practicar.</p></div>`
            : `<div class="o-pila">${tarjetas.map(t => this._tarjetaGestionItem(t)).join('')}</div>`}
        </div>`;

      this._bindTabs(raiz);
      this._bindGestion(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Gestiona las tarjetas del mazo seleccionado.', 'Usa Nueva tarjeta para añadir contenido y las acciones de cada fila para editarlo o duplicarlo.']
      });
    },

    _tarjetaGestionItem(t) {
      const tipoInfo = TIPOS_TARJETA.find(x => x.valor === t.tipo) || { texto: t.tipo || 'versiculo', icono: 'layers' };
      const frente = t.pregunta || t.referencia || t.texto || '(sin contenido)';
      const corto = String(frente).substring(0, 100) + (String(frente).length > 100 ? '…' : '');
      return `
        <div class="mem-gestion-fila" data-tid="${t.id}">
          <span class="mem-gestion-fila__tipo" title="${E(tipoInfo.texto)}">${I(tipoInfo.icono)}</span>
          <div class="mem-gestion-fila__info">
            <p class="mem-gestion-fila__texto">${E(corto)}</p>
            <span class="mem-gestion-fila__subtipo">${E(tipoInfo.texto)}</span>
          </div>
          <div class="mem-gestion-fila__acciones">
            <button class="btn-icono btn-tarjeta-duplicar" data-tid="${t.id}" title="Duplicar" aria-label="Duplicar tarjeta">${I('copy')}</button>
            <button class="btn-icono btn-tarjeta-editar" data-tid="${t.id}" title="Editar" aria-label="Editar tarjeta">${I('edit-3')}</button>
            <button class="btn-icono btn-icono--peligro btn-tarjeta-eliminar" data-tid="${t.id}" title="Eliminar" aria-label="Eliminar tarjeta">${I('trash-2')}</button>
          </div>
        </div>`;
    },

    _bindTabs(raiz) {
      $$(raiz, '[data-mem-tab]').forEach(btn => {
        btn.onclick = () => {
          this._tabMem = btn.dataset.memTab;
          this._mazoGestion = null;
          this._pintar(raiz);
        };
      });
    },

    _bindGestion(raiz) {
      const r = raiz;
      const reRender = async () => {
        await this._cargarDatos();
        this._tabMem = 'gestionar';
        this._pintar(raiz);
      };

      $(r, '#btnCrearMazoMem')?.addEventListener('click', () => this._formMazo(null, raiz));
      $(r, '#btnVolverMazosMem')?.addEventListener('click', () => { this._mazoGestion = null; this._pintarGestion(raiz); });
      $(r, '#btnCrearTarjetaMem')?.addEventListener('click', () => this._formTarjeta(null, raiz));
      $(r, '#btnSembrarMazosMem')?.addEventListener('click', () => this._sembrarMazos(raiz));
      $(r, '#btnImportarMazoMem')?.addEventListener('click', () => this._importarMazo(raiz));

      $$(r, '.btn-gestion-mazo').forEach(btn => { btn.onclick = () => { this._mazoGestion = btn.dataset.mazoid; this._pintarGestion(raiz); }; });
      $$(r, '.btn-editar-mazo-gestion').forEach(btn => { btn.onclick = () => this._formMazo(btn.dataset.mazoid, raiz); });
      $$(r, '.btn-exportar-mazo').forEach(btn => {
        btn.onclick = async () => {
          try {
            const json = await window.memorizacionRepository.exportarMazo(btn.dataset.mazoid);
            window.helpers.descargarTexto('mazo-memorizacion.json', json);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
      $$(r, '.btn-eliminar-mazo-gestion').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar el mazo "${btn.dataset.nombre}"? Las tarjetas se borrarán con él.`, { titulo: 'Eliminar mazo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.eliminarMazo(btn.dataset.mazoid);
            window.helpers.mostrarAlerta('Mazo eliminado.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      $$(r, '.btn-tarjeta-editar').forEach(btn => { btn.onclick = () => this._formTarjeta(btn.dataset.tid, raiz); });
      $$(r, '.btn-tarjeta-duplicar').forEach(btn => {
        btn.onclick = async () => {
          try {
            await window.memorizacionRepository.duplicarTarjeta(btn.dataset.tid);
            window.helpers.mostrarAlerta('Tarjeta duplicada.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
      $$(r, '.btn-tarjeta-eliminar').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Eliminar esta tarjeta?', { titulo: 'Eliminar tarjeta', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.desactivarTarjeta(btn.dataset.tid);
            window.helpers.mostrarAlerta('Tarjeta eliminada.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    },

    /* Formulario crear/editar mazo (mismo formato que el panel admin) */
    async _formMazo(mazoId, raiz) {
      const d = this._datos;
      const mazo = mazoId ? (d.mazos.find(m => m.id === mazoId) || null) : null;
      const iconos = ['layers', 'book-open', 'users', 'map-pin', 'calendar', 'zap', 'message-square', 'sparkles', 'archive', 'eye', 'heart', 'shield'];
      const datos = await window.helpers.formulario({
        titulo: mazo ? 'Editar mazo' : 'Crear mazo',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, valor: mazo ? mazo.nombre : '' },
          { nombre: 'descripcion', etiqueta: 'Descripción corta', valor: mazo ? (mazo.descripcion || '') : '' },
          { nombre: 'color', etiqueta: 'Color', tipo: 'color', valor: mazo ? colorMazo(mazo.color, 0) : COLORES[0], opciones: COLORES.map(c => ({ valor: c, texto: c })) },
          { nombre: 'icono', etiqueta: 'Icono', tipo: 'iconos', valor: mazo ? (mazo.icono || 'layers') : 'layers', opciones: iconos.map(ic => ({ valor: ic, texto: ic })) }
        ],
        textoConfirmar: mazo ? 'Guardar' : 'Crear'
      });
      if (!datos || !datos.nombre.trim()) return;
      const usuario = d.usuario;
      try {
        if (mazo) {
          await window.memorizacionRepository.actualizarMazo(mazo.id, { nombre: datos.nombre.trim(), descripcion: datos.descripcion, color: datos.color, icono: datos.icono });
          window.helpers.mostrarAlerta('Mazo actualizado.', 'exito');
        } else {
          await window.memorizacionRepository.crearMazo(usuario.id, { nombre: datos.nombre.trim(), descripcion: datos.descripcion, color: datos.color, icono: datos.icono, es_global: true });
          window.helpers.mostrarAlerta('Mazo creado.', 'exito');
        }
        await this._recargarGestion(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    /* Formulario crear/editar tarjeta */
    async _formTarjeta(tarjetaId, raiz) {
      const d = this._datos;
      const t = tarjetaId ? (d.tarjetas.find(x => x.id === tarjetaId) || null) : null;
      const mazo = d.mazos.find(m => m.id === this._mazoGestion);
      const datos = await window.helpers.formulario({
        titulo: t ? 'Editar tarjeta' : 'Nueva tarjeta',
        mensaje: `Mazo: ${mazo ? mazo.nombre : ''}`,
        campos: [
          { nombre: 'tipo', etiqueta: 'Tipo de ejercicio', tipo: 'select', valor: t ? (t.tipo || 'versiculo') : 'versiculo', opciones: TIPOS_TARJETA.map(x => ({ valor: x.valor, texto: x.texto })) },
          { nombre: 'pregunta', etiqueta: 'Pregunta / Referencia', requerido: true, valor: t ? (t.pregunta || t.referencia || '') : '' },
          { nombre: 'respuesta', etiqueta: 'Respuesta / Texto', requerido: true, valor: t ? (t.respuesta || t.texto || '') : '' },
          { nombre: 'referencia', etiqueta: 'Referencia bíblica (opcional)', valor: t ? (t.referencia || '') : '' },
          { nombre: 'explicacion', etiqueta: 'Explicación breve (opcional)', valor: t ? (t.explicacion || '') : '' },
          { nombre: 'pista', etiqueta: 'Pista (opcional)', valor: t ? (t.pista || '') : '' }
        ],
        textoConfirmar: t ? 'Guardar' : 'Crear'
      });
      if (!datos || !datos.pregunta.trim() || !datos.respuesta.trim()) {
        if (datos) window.helpers.mostrarAlerta('Pregunta y respuesta son obligatorias.', 'advertencia');
        return;
      }
      const usuario = d.usuario;
      try {
        if (t) {
          await window.memorizacionRepository.actualizarContenido(t.id, {
            tipo: datos.tipo, pregunta: datos.pregunta.trim(), respuesta: datos.respuesta.trim(),
            referencia: datos.referencia, explicacion: datos.explicacion, pista: datos.pista
          });
          window.helpers.mostrarAlerta('Tarjeta actualizada.', 'exito');
        } else {
          await window.memorizacionRepository.crearTarjetaGlobal({
            mazo_id: this._mazoGestion, tipo: datos.tipo, pregunta: datos.pregunta.trim(),
            respuesta: datos.respuesta.trim(), referencia: datos.referencia, explicacion: datos.explicacion,
            pista: datos.pista, creado_por: usuario.id
          });
          window.helpers.mostrarAlerta('Tarjeta creada.', 'exito');
        }
        await this._recargarGestion(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _recargarGestion(raiz) {
      await this._cargarDatos();
      this._tabMem = 'gestionar';
      this._pintar(raiz);
    },

    async _sembrarMazos(raiz) {
      const ok = await window.helpers.confirmar('Se crearán los mazos de contenido bíblico por defecto (si no existen). ¿Continuar?', { titulo: 'Sembrar contenido', textoConfirmar: 'Sembrar' });
      if (!ok) return;
      try {
        await window.memorizacionRepository.sembrarMazos(this._datos.usuario.id);
        window.helpers.mostrarAlerta('Contenido sembrado.', 'exito');
        await this._recargarGestion(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _importarMazo(raiz) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const archivo = input.files && input.files[0];
        if (!archivo) return;
        try {
          const texto = await archivo.text();
          await window.memorizacionRepository.importarMazo(this._datos.usuario.id, texto);
          window.helpers.mostrarAlerta('Mazo importado.', 'exito');
          await this._recargarGestion(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
      input.click();
    },

    /* ═══ SESIÓN DE JUEGO ═══ */
    _sesion(raiz, mazoId) {
      const d = this._datos;
      const mazo = d.mazos.find(m => m.id === mazoId);
      const color = colorMazo(mazo.color, d.mazos.indexOf(mazo));
      const pendientes = this._pendientesMazo(mazoId);

      // Construir la mezcla de ejercicios (rotando tipos)
      const sesion = J.construirSesion(pendientes, d.tarjetas, { maxTarjetas: 10 });
      const estado = {
        mazoId,
        color,
        ejercicios: sesion,
        idx: 0,
        correctas: 0,
        incorrectas: 0,
        dominadas: 0,
        racha: 0,
        mejorRacha: 0
      };
      // estados de niveles al inicio
      this._estadoNiveles = {};

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-sesion">
          <div class="mem-juego-sesion__barra">
            <button class="btn-secundario u-fs-xs" id="btnSalir" style="padding:6px 10px">${I('x')}</button>
            <div class="mem-juego-sesion__track" aria-hidden="true"><div class="mem-juego-sesion__fill" style="width:${sesion.length ? Math.round((1 / sesion.length) * 100) : 0}%"></div></div>
            <span class="mem-juego-sesion__corazones" id="corazones" title="Fallos permitidos"></span>
          </div>
          <div id="slot" class="o-pila" style="flex:1;min-height:300px"></div>
        </div>`;

      $(raiz, '#btnSalir').onclick = () => this._verMazo(raiz, mazoId);
      this._pintarCorazones(raiz, estado);
      this._ejercicio(raiz, estado);
    },

    _pintarCorazones(raiz, estado) {
      const max = 5;
      const restantes = max - Math.min(estado.incorrectas, max);
      const el = $(raiz, '#corazones');
      if (el) {
        el.innerHTML = Array.from({ length: max }, (_, i) => `<span style="opacity:${i < restantes ? 1 : 0.25}">${I('heart')}</span>`).join('');
        window.Iconos.actualizar();
      }
    },

    /* Render del ejercicio actual */
    _ejercicio(raiz, estado) {
      const slot = $(raiz, '#slot');
      const ejercicio = estado.ejercicios[estado.idx];
      if (!ejercicio) { this._finSesion(raiz, estado); return; }

      const avance = Math.round(((estado.idx + 1) / estado.ejercicios.length) * 100);
      const fill = $(raiz, '.mem-juego-sesion__fill');
      if (fill) fill.style.width = avance + '%';

      const renderer = this._renderers[ejercicio.tipo];
      if (renderer) renderer.call(this, slot, ejercicio, estado, raiz);
    },

    /* ── Renderers por tipo de ejercicio ── */
    _renderers: {
      /* COMPLETAR */
      completar(slot, ej, estado, raiz) {
        const valores = {};
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-completar">
                ${ej.enunciado.split(' ').map((palabra, i) => {
                  if (palabra !== '_____') return `<span>${E(palabra)}</span>`;
                  const n = Object.keys(valores).length;
                  return `<input type="text" class="mem-juego-hueco" data-hueco="${n}" placeholder="..." value="${E(valores[n] || '')}" autocomplete="off">`;
                }).join(' ')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-hueco').forEach(inp => {
            inp.addEventListener('input', () => { valores[inp.dataset.hueco] = inp.value; });
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const vals = [...$$(slot, '.mem-juego-hueco')].map(inp => inp.value || '');
            const aciertos = ej.verificar(vals);
            const todasBien = aciertos.every(Boolean);
            // Marcar visualmente
            $$(slot, '.mem-juego-hueco').forEach((inp, i) => {
              inp.classList.add(aciertos[i] ? 'mem-juego-hueco--ok' : 'mem-juego-hueco--ko');
              if (!aciertos[i]) inp.value = ej.respuestas[i] || '';
              inp.disabled = true;
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, todasBien, estado, raiz);
          };
        };
        render();
      },

      /* ORDENAR */
      ordenar(slot, ej, estado, raiz) {
        const restantes = [...ej.palabras];
        const elegidas = [];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-ordenar">
                <div class="mem-juego-frase" id="frase"></div>
                <div class="mem-juego-palabras" id="palabras">
                  ${restantes.map((p, i) => `<button class="mem-juego-palabra" data-idx="${i}">${E(p)}</button>`).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${elegidas.length === 0 ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          const frase = $(slot, '#frase');
          frase.innerHTML = elegidas.map((p, i) => `<span class="mem-juego-frase__palabra" data-pos="${i}">${E(p)}</span>`).join('') + (elegidas.length === 0 ? '<span class="mem-juego-sub">Toca las palabras aquí...</span>' : '');

          $$(slot, '.mem-juego-palabra').forEach(btn => {
            btn.onclick = () => {
              const idx = parseInt(btn.dataset.idx, 10);
              const palabra = restantes.splice(idx, 1)[0];
              elegidas.push(palabra);
              render();
            };
          });
          $$(slot, '.mem-juego-frase__palabra').forEach(el => {
            el.onclick = () => {
              const pos = parseInt(el.dataset.pos, 10);
              const palabra = elegidas.splice(pos, 1)[0];
              restantes.push(palabra);
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(elegidas);
            // Mostrar la frase correcta
            frase.innerHTML = ej.palabras.map((p, i) => `<span class="mem-juego-frase__palabra mem-juego-frase__palabra--${bien ? 'ok' : 'ko'}">${E(p)}</span>`).join('');
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* ELEGIR EL VERSÍCULO */
      elegir_versiculo(slot, ej, estado, raiz) {
        let sel = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              <div class="mem-juego-opciones">
                ${ej.opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${String.fromCharCode(65 + i)}</span>
                    <span>${E(o)}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(ej.opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.opciones[i] === ej.respuestaCorrecta) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel && !bien) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* VERDADERO O FALSO */
      verdadero_falso(slot, ej, estado, raiz) {
        let sel = null;
        const opciones = ['Verdadero', 'Falso'];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-opciones">
                ${opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${i === 0 ? I('check') : I('x')}</span>
                    <span>${o}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.verificar(opciones[i])) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* RELACIONAR */
      relacionar(slot, ej, estado, raiz) {
        const asociaciones = {}; // izqLimpia → der
        let selIzq = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <div class="mem-juego-relacionar">
                <div class="mem-juego-rel-col">
                  ${ej.izquierda.map((item, i) => {
                    const clave = J.limpiar(item);
                    const yaAsignada = asociaciones[clave];
                    return `<button class="mem-juego-rel-item ${selIzq === i ? 'mem-juego-rel-item--sel' : ''}${yaAsignada ? ' mem-juego-rel-item--disabled' : ''}" data-izq="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
                <div class="mem-juego-rel-col">
                  ${ej.derecha.map((item, i) => {
                    const usado = Object.keys(asociaciones).some(k => asociaciones[k] === item);
                    return `<button class="mem-juego-rel-item ${usado ? 'mem-juego-rel-item--disabled' : ''}" data-der="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();

          $$(slot, '.mem-juego-rel-item[data-izq]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.izq, 10);
              if (asociaciones[J.limpiar(ej.izquierda[i])]) return;
              selIzq = selIzq === i ? null : i;
              render();
            };
          });
          $$(slot, '.mem-juego-rel-item[data-der]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.der, 10);
              if (selIzq === null) return;
              const itemIzq = ej.izquierda[selIzq];
              const clave = J.limpiar(itemIzq);
              if (asociaciones[clave]) return;
              asociaciones[clave] = ej.derecha[i];
              selIzq = null;
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(asociaciones);
            // marcar pares correctos
            $$(slot, '.mem-juego-rel-item').forEach(btn => {
              btn.disabled = true;
              if (btn.dataset.izq !== undefined) {
                const item = ej.izquierda[parseInt(btn.dataset.izq, 10)];
                if (asociaciones[J.limpiar(item)]) btn.classList.add('mem-juego-rel-item--ok');
              } else {
                const der = ej.derecha[parseInt(btn.dataset.der, 10)];
                if (Object.values(asociaciones).includes(der)) btn.classList.add('mem-juego-rel-item--ok');
              }
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* ESCRITA */
      escrita(slot, ej, estado, raiz) {
        let valor = '';
        // Render inicial: pinta la tarjeta completa una sola vez.
        // Las actualizaciones posteriores (tecleo) solo modifican el botón,
        // sin destruir el input ni perder el foco.
        const _actualizarBoton = () => {
          const btn = $(slot, '#btnResp');
          if (!btn) return;
          const hayTexto = valor.trim().length > 0;
          btn.disabled = !hayTexto;
          if (hayTexto) btn.classList.remove('btn-desactivado');
          else btn.classList.add('btn-desactivado');
        };

        slot.innerHTML = `
          <div class="mem-juego-tarjeta">
            <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
            <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
            <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
            <div class="mem-juego-escrita">
              <input type="text" class="mem-juego-input" id="txtResp" value="" placeholder="Escribe aquí..." autocomplete="off">
            </div>
            ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
            ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
            <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
            <button class="mem-juego-continuar btn-desactivado" id="btnResp" disabled>Comprobar</button>
          </div>`;
        window.Iconos.actualizar();

        $(slot, '#txtResp').addEventListener('input', (e) => {
          valor = e.target.value;
          _actualizarBoton();
        });
        $(slot, '[data-pista]')?.addEventListener('click', () => {
          const b = $(slot, '[data-pista-box]');
          if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
        });
        $(slot, '#btnResp').onclick = () => {
          const bien = ej.verificar(valor);
          const inp = $(slot, '#txtResp');
          inp.disabled = true;
          inp.classList.add(bien ? 'mem-juego-input--ok' : 'mem-juego-input--ko');
          if (!bien) inp.value = ej.respuestaCorrecta;
          $(slot, '#btnResp').remove();
          this._feedback(slot, ej, bien, estado, raiz);
        };
      }
    },

    /* ── Feedback de corrección ──
       Nunca decir solo "Incorrecto": mostrar la respuesta
       correcta, la referencia y una explicación breve. */
    _feedback(slot, ej, bien, estado, raiz) {
      const tarjetaId = ej.tarjetaId;
      if (bien) { estado.correctas++; estado.racha++; if (estado.racha > estado.mejorRacha) estado.mejorRacha = estado.racha; }
      else { estado.incorrectas++; estado.racha = 0; }

      if (window.haptica) bien ? window.haptica.logro() : window.haptica.fallo();

      const respuestaTexto = ej.respuestaCorrecta || (ej.tipo === 'verdadero_falso' ? (ej.esVerdadero ? 'Verdadero' : 'Falso') : '');

      // Registrar progreso (async, sin bloquear)
      window.memorizacionRepository.registrarResultado(this._datos.usuario.id, tarjetaId, bien)
        .then(({ progreso }) => {
          const t = this._datos.tarjetas.find(x => x.id === tarjetaId);
          if (t && progreso) this._datos.progreso[tarjetaId] = { ...this._datos.progreso[tarjetaId], ...progreso };
          if (progreso && ['dominada', 'perfecta'].includes(progreso.nivel)) estado.dominadas++;
        })
        .catch(() => {});

      const feedback = document.createElement('div');
      feedback.className = `mem-juego-feedback mem-juego-feedback--${bien ? 'ok' : 'ko'}`;
      feedback.innerHTML = `
        <p class="mem-juego-feedback__titulo">${bien ? I('check-circle') + ' ¡Correcto!' : I('x-circle') + ' Casi...'}</p>
        <p class="mem-juego-feedback__respuesta"><strong>${bien ? '' : 'Respuesta: '}</strong>${bien ? '' : E(String(respuestaTexto || ''))}</p>
        ${ej.referencia ? `<p class="mem-juego-feedback__ref">${I('book-open')} ${E(ej.referencia)}</p>` : ''}
        ${ej.explicacion ? `<p class="mem-juego-feedback__expl">${E(ej.explicacion)}</p>` : ''}
      `;
      window.Iconos.actualizar();

      const btn = document.createElement('button');
      btn.className = 'mem-juego-continuar';
      btn.innerHTML = `${I('arrow-right')} Continuar`;
      btn.onclick = () => {
        estado.idx++;
        this._pintarCorazones(raiz, estado);
        this._ejercicio(raiz, estado);
      };

      slot.appendChild(feedback);
      slot.appendChild(btn);
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /* ═══ FIN DE SESIÓN ═══ */
    _finSesion(raiz, estado) {
      const slot = $(raiz, '#slot');
      const total = estado.correctas + estado.incorrectas;
      const precision = total ? Math.round((estado.correctas / total) * 100) : 0;
      const perfecto = total > 0 && estado.incorrectas === 0;

      slot.innerHTML = `
        <div class="mem-juego-fin">
          <span class="mem-juego-fin__icono">${perfecto ? I('trophy') : I('party-popper')}</span>
          <h2>${perfecto ? '¡Sesión perfecta!' : '¡Sesión completada!'}</h2>
          <p class="mem-juego-fin__sub">${estado.dominadas ? `Dominaste ${estado.dominadas} tarjeta${estado.dominadas === 1 ? '' : 's'} nuevas.` : '¡Sigue así! Las tarjetas difíciles volverán pronto.'}</p>

          <div class="mem-juego-fin__anillo" style="--precision:${precision}">
            <div class="mem-juego-fin__anillo-inner">
              <span class="mem-juego-fin__anillo-valor">${precision}%</span>
              <span class="mem-juego-fin__stat-etiqueta">Precisión</span>
            </div>
          </div>

          <div class="mem-juego-fin__stats">
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ok"><p class="mem-juego-fin__stat-valor">${estado.correctas}</p><p class="mem-juego-fin__stat-etiqueta">Correctas</p></div>
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ko"><p class="mem-juego-fin__stat-valor">${estado.incorrectas}</p><p class="mem-juego-fin__stat-etiqueta">Incorrectas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${estado.dominadas}</p><p class="mem-juego-fin__stat-etiqueta">Dominadas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${estado.mejorRacha}</p><p class="mem-juego-fin__stat-etiqueta">Mejor racha</p></div>
          </div>

          <div class="mem-juego-fin__acciones">
            <button class="mem-juego-empezar" id="btnRepetir" style="background:var(--color-exito)">${I('rotate-ccw')} Continuar practicando</button>
            <button class="btn-secundario" id="btnVolverMazos" style="justify-content:center">Volver a los mazos</button>
          </div>
        </div>`;
      window.Iconos.actualizar();

      $(slot, '#btnRepetir').onclick = async () => {
        try {
          await this._recargar(raiz);
          this._sesion(raiz, estado.mazoId);
        } catch (e) { this._sesion(raiz, estado.mazoId); }
      };
      $(slot, '#btnVolverMazos').onclick = async () => {
        try { await this._recargar(raiz); } catch (e) {}
        this._pintar(raiz);
      };
    },

    /* ── Recargar datos ── */
    async _recargar(raiz) {
      const d = this._datos;
      const [mazos, tarjetas, repasos] = await Promise.all([
        window.memorizacionRepository.listarMazos(d.usuario.id),
        window.memorizacionRepository.listarTarjetas(d.usuario.id),
        window.memorizacionRepository.totalRepasos(d.usuario.id).catch(() => d.repasos || 0),
      ]);
      const progreso = await window.memorizacionRepository.listarProgreso(d.usuario.id).catch(() => d.progreso || {});
      d.mazos = mazos;
      d.tarjetas = tarjetas;
      d.progreso = progreso;
      d.repasos = repasos;
    }
  };
})();
