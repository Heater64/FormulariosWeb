(function() {
  'use strict';
  window.vistaMapa = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando mapa bíblico...</p></div>';
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
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
          <h2>${window.Iconos.render('map')} Mapa Bíblico</h2>
          <p class="u-fs-sm u-color-texto-secundario u-mb-3">Visualiza tu progreso a través de toda la Biblia</p>
          <div class="o-pila" id="mapaAT">
            <h4 class="u-color-texto-secundario" style="border-bottom:2px solid #8B4513;padding-bottom:var(--espaciado-xs)">Antiguo Testamento</h4>
            <div class="o-grid-tarjetas">${antiguos.map(l => this._renderLibro(l, progreso)).join('')}</div>
          </div>
          <div class="o-pila u-mt-4" id="mapaNT">
            <h4 class="u-color-texto-secundario" style="border-bottom:2px solid #2563EB;padding-bottom:var(--espaciado-xs)">Nuevo Testamento</h4>
            <div class="o-grid-tarjetas">${nuevos.map(l => this._renderLibro(l, progreso)).join('')}</div>
          </div>
        </div>`;
      raiz.querySelectorAll('[data-libro-id]').forEach(el => {
        el.addEventListener('click', () => router.navegar(`/leer/${el.dataset.libroId}/1`));
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
          <div class="tarjeta-libro__barra"><div class="tarjeta-libro__barra--lleno" style="width:${pct}%"></div></div>
          <div class="tarjeta-libro__detalle" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(6px,1fr));gap:2px;margin-top:var(--espaciado-sm)">
            ${caps.map(c => `<span style="width:6px;height:6px;border-radius:1px;background:${c ? 'var(--color-exito)' : 'var(--color-borde)'};display:inline-block" title="${caps.indexOf(c)+1}"></span>`).join('')}
          </div>
        </div>`;
    }
  };
})();
