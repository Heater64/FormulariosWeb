(function() {
  'use strict';
  window.vistaMapa = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(12, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando mapa bíblico...</p></div>';
      try {
        const sb = window.supabaseClient;
        if (!sb) return;
        const { data: libros } = await sb.from('libros_biblicos').select('*').order('id');
        const progreso = usuario ? await window.progresoRepository.obtenerProgresoPorLibro(usuario.id) : {};
        this._renderizar(raiz, libros || [], progreso);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, libros, progreso) {
      const antiguos = libros.filter(l => l.testamento === 'antiguo');
      const nuevos = libros.filter(l => l.testamento === 'nuevo');
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-app-shell">
          <header class="vista-cabecera">
            <div class="vista-cabecera__principal">
              <h1>${window.Iconos.render('map')} Mapa Bíblico <button class="info-ayuda" data-guia="mapa" aria-label="Guía del Mapa Bíblico">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>
          <div class="o-pila" id="mapaAT">
            <h4 class="u-color-texto-secundario mapa__titulo-seccion mapa__titulo-seccion--at">Antiguo Testamento</h4>
            <div class="o-grid-tarjetas">${antiguos.map(l => this._renderLibro(l, progreso)).join('')}</div>
          </div>
          <div class="o-pila u-mt-4" id="mapaNT">
            <h4 class="u-color-texto-secundario mapa__titulo-seccion mapa__titulo-seccion--nt">Nuevo Testamento</h4>
            <div class="o-grid-tarjetas">${nuevos.map(l => this._renderLibro(l, progreso)).join('')}</div>
          </div>
        </div>`;
      if (window.Iconos) window.Iconos.actualizar();
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.helpers.registrarGuias(raiz, {
        mapa: ['Mapa Bíblico', 'El mapa resume cuánto has leído de cada libro y te permite entrar directamente en un capítulo.', 'Pulsa un libro para comenzar desde su primer capítulo.']
      });
      raiz.querySelectorAll('[data-libro-id]').forEach(el => {
        el.addEventListener('click', () => router.navegar(`/estudio/sesion/${el.dataset.libroId}/1`));
      });
    },
    _renderLibro(libro, progreso) {
      const caps = progreso[libro.id] || [];
      const leidos = caps.filter(Boolean).length;
      const total = libro.num_capitulos;
      const pct = total > 0 ? Math.round((leidos / total) * 100) : 0;
      return `
        <div class="tarjeta-libro ${pct === 100 ? 'tarjeta-libro--completado' : ''}" data-libro-id="${libro.id}">
          <div class="tarjeta-libro__nombre">${libro.nombre}</div>
          <div class="tarjeta-libro__progreso">${leidos}/${total}</div>
          <div class="tarjeta-libro__barra"><div class="tarjeta-libro__barra--lleno" style="transform:scaleX(${pct / 100})"></div></div>
          <div class="tarjeta-libro__detalle u-pila-gap-xs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(6px,1fr));gap:2px;margin-top:var(--espaciado-sm)">
            ${caps.map(c => `<span class="mapa__dot${c ? ' mapa__dot--leido' : ''}" title="${caps.indexOf(c)+1}"></span>`).join('')}
          </div>
        </div>`;
    }
  };
})();
