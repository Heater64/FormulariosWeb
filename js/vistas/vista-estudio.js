(function() {
  'use strict';
  window.vistaEstudio = {
    async montar(raiz) {
      raiz.innerHTML = '<div class="o-contenedor o-pila o-pila--lg u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      const usuario = store.obtener('usuario');
      const sb = window.supabaseClient;
      if (!sb || !usuario) return;
      try {
        const { data: libros } = await sb.from('libros_biblicos').select('*').order('id');
        const { data: progreso } = await sb.from('progreso_lectura').select('*, capitulos!capitulo_id(libro_id)').eq('usuario_id', usuario.id).eq('completado', true);
        const completados = progreso || [];
        const librosCompletados = new Set();
        completados.forEach(p => { if (p.capitulos?.libro_id) librosCompletados.add(p.capitulos.libro_id); });
        const antiguos = (libros || []).filter(l => l.testamento === 'antiguo');
        const nuevos = (libros || []).filter(l => l.testamento === 'nuevo');
        const racha = window.progresoLectura.calcularRacha(completados);
        const ultimo = completados.sort((a, b) => new Date(b.fecha_lectura) - new Date(a.fecha_lectura))[0];
        let ultimoLibro = null, ultimoCap = null;
        if (ultimo?.capitulos) {
          ultimoLibro = (libros || []).find(l => l.id === ultimo.capitulos.libro_id);
          const { data: cap } = await sb.from('capitulos').select('numero').eq('id', ultimo.capitulo_id).single();
          ultimoCap = cap?.numero;
        }
        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
            <div class="o-flecha o-flecha--between"><h2>${window.Iconos.render('book-open')} Estudio Guiado</h2><span class="u-fs-sm u-color-texto-terciario">${usuario.nombre_completo}</span></div>
            <div class="o-grid-tarjetas" style="grid-template-columns:repeat(4,1fr)">
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Leídos</p><p class="u-texto-lg u-fw-700">${completados.length}</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Libros</p><p class="u-texto-lg u-fw-700">${librosCompletados.size}/${(libros||[]).length}</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Racha</p><p class="u-texto-lg u-fw-700">${racha} días</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">% General</p><p class="u-texto-lg u-fw-700">${Math.round((completados.length / 1189) * 100)}%</p></div>
            </div>
            ${ultimoLibro ? `<div class="tarjeta-capitulo tarjeta-capitulo--en-progreso" style="cursor:pointer" id="continuarLectura"><div class="o-flecha o-flecha--between"><div><span class="u-fs-sm u-color-texto-secundario">Continuar leyendo</span><p class="u-fw-600">${ultimoLibro.nombre} ${ultimoCap}</p></div><span>→</span></div></div>` : ''}
            <div class="o-pila"><h3>Antiguo Testamento</h3><div id="listaAT" class="o-grid-tarjetas"></div></div>
            <div class="o-pila"><h3>Nuevo Testamento</h3><div id="listaNT" class="o-grid-tarjetas"></div></div>
          </div>`;
        if (ultimoLibro) {
          raiz.querySelector('#continuarLectura').onclick = () => router.navegar(`/leer/${ultimoLibro.id}/${ultimoCap}`);
        }
        const renderLibro = (l) => {
          const leidos = completados.filter(p => p.capitulos?.libro_id === l.id).length;
          const pct = Math.round((leidos / l.num_capitulos) * 100);
          return `<div class="tarjeta-libro${pct === 100 ? ' tarjeta-libro--completado' : ''}" data-libro="${l.id}" style="cursor:pointer">
            <div class="tarjeta-libro__nombre">${l.nombre}</div>
            <div class="tarjeta-libro__progreso">${leidos}/${l.num_capitulos}</div>
            <div class="tarjeta-libro__barra${pct > 0 ? ' tarjeta-libro__barra--progreso' : ''}"><div class="tarjeta-libro__barra--lleno" style="width:${pct}%"></div></div>
          </div>`;
        };
        raiz.querySelector('#listaAT').innerHTML = antiguos.map(renderLibro).join('');
        raiz.querySelector('#listaNT').innerHTML = nuevos.map(renderLibro).join('');
        raiz.querySelectorAll('[data-libro]').forEach(el => {
          el.addEventListener('click', () => router.navegar(`/leer/${el.dataset.libro}/1`));
        });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    }
  };
})();
