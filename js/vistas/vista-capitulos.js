(function() {
  'use strict';
  window.vistaCapitulos = {
    async montar(raiz, params) {
      const libroId = parseInt(params.libro);
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor o-pila u-mt-3">${window.skeleton.tarjetas(20, { ancho: '100%' })}</div>` : '<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando capítulos...</p></div>';
      const sb = window.supabaseClient;
      const usuario = store.obtener('usuario');
      if (!sb || !usuario) return;
      try {
        const { data: libro } = await sb.from('libros_biblicos').select('*').eq('id', libroId).single();
        const { data: progreso } = await sb.from('progreso_lectura')
          .select('capitulo_id').eq('usuario_id', usuario.id).eq('completado', true);
        const { data: capitulos } = await sb.from('capitulos').select('id, numero').eq('libro_id', libroId);
        const completados = new Set((progreso || []).map(p => p.capitulo_id));
        const leidosPorNum = {};
        (capitulos || []).forEach(c => { leidosPorNum[c.numero] = completados.has(c.id); });
        const total = libro.num_capitulos;
        const leidos = Object.values(leidosPorNum).filter(Boolean).length;
        const pct = Math.round((leidos / total) * 100);
        const primerPendiente = (() => { for (let n = 1; n <= total; n++) if (!leidosPorNum[n]) return n; return 1; })();

        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg u-app-shell">
            <div class="o-flecha o-flecha--between u-mb-2">
              <button class="btn-secundario" onclick="router.navegar('/estudio')">${window.Iconos.render('arrow-left')}</button>
              <span class="u-fs-xs u-color-texto-terciario">${libro.testamento === 'antiguo' ? 'Antiguo Testamento' : 'Nuevo Testamento'}</span>
            </div>
            <div class="capitulos-cabecera">
              <div class="capitulos-cabecera__icono">${window.Iconos.render('book-open')}</div>
              <div class="capitulos-cabecera__info">
                <h2>${libro.nombre}</h2>
                <p class="capitulos-cabecera__meta">${leidos} de ${total} capítulos leídos · ${pct}%</p>
                <div class="capitulos-cabecera__barra"><div class="capitulos-cabecera__barra--lleno" style="width:${pct}%"></div></div>
              </div>
            </div>
            <button class="btn-primario u-btn-full" id="btnEmpezar" style="min-height:52px;font-size:var(--texto-lg)">
              ${window.Iconos.render('play')} Empezar${leidos > 0 && leidos < total ? ' (cap. ' + primerPendiente + ')' : ''}
            </button>
            <div class="o-pila"><h3>Capítulos</h3>
              <div id="gridCaps" class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(64px,1fr))"></div>
            </div>
          </div>`;

        raiz.querySelector('#btnEmpezar').onclick = () => router.navegar(`/estudio/sesion/${libroId}/${primerPendiente}`);

        const grid = raiz.querySelector('#gridCaps');
        grid.innerHTML = Array.from({ length: total }, (_, i) => i + 1).map(n => {
          const hecho = leidosPorNum[n];
          return `<button class="btn-capitulo${hecho ? ' btn-capitulo--hecho' : ''}" data-cap="${n}" style="position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:var(--texto-sm);border:1px solid var(--color-borde);border-radius:var(--radio-lg);background:var(--color-fondo-tarjeta);cursor:pointer;transition:transform var(--transicion-rapida),border-color var(--transicion-rapida),background var(--transicion-rapida)" >
            ${n}
            ${hecho ? `<span class="btn-capitulo__check">${window.Iconos.render('check')}</span>` : ''}
          </button>`;
        }).join('');
        grid.querySelectorAll('[data-cap]').forEach(el => {
          el.addEventListener('click', () => router.navegar(`/estudio/sesion/${libroId}/${el.dataset.cap}`));
        });
        window.Iconos.actualizar();
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`;
      }
    }
  };
})();
