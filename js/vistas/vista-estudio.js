(function() {
  'use strict';
  window.vistaEstudio = {
    async montar(raiz) {
      raiz.innerHTML = '<div class="o-contenedor o-pila o-pila--lg u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      const usuario = store.obtener('usuario');
      const sb = window.supabaseClient;
      if (!sb || !usuario) return;
      try {
        const [librosResult, progresoResult, pendientesMemoriaResult] = await Promise.all([
          sb.from('libros_biblicos').select('*').order('id'),
          sb.from('progreso_lectura').select('*, capitulos!capitulo_id(libro_id)').eq('usuario_id', usuario.id).eq('completado', true),
          window.memorizacionRepository.tarjetasPendientes(usuario.id).catch(() => [])
        ]);
        const libros = librosResult.data;
        const completados = progresoResult.data || [];
        const pendientesMemoria = pendientesMemoriaResult.length;
        const leidosPorLibro = {};
        completados.forEach(p => {
          const lid = p.capitulos?.libro_id;
          if (lid) leidosPorLibro[lid] = (leidosPorLibro[lid] || 0) + 1;
        });
        const librosCompletados = (libros || []).filter(l => l.num_capitulos > 0 && (leidosPorLibro[l.id] || 0) >= l.num_capitulos).length;
        const antiguos = (libros || []).filter(l => l.testamento === 'antiguo');
        const nuevos = (libros || []).filter(l => l.testamento === 'nuevo');
        const totalCapitulosBiblia = (libros || []).reduce((sum, l) => sum + (l.num_capitulos || 0), 0);
        const racha = window.progresoLectura.calcularRacha(completados);
        try { localStorage.setItem('fb_racha', String(racha)); } catch (e) {}
        const pctGeneral = totalCapitulosBiblia ? Math.round((completados.length / totalCapitulosBiblia) * 100) : 0;
        const ultimo = completados.sort((a, b) => new Date(b.fecha_lectura) - new Date(a.fecha_lectura))[0];
        let ultimoLibro = null, ultimoCap = null;
        if (ultimo?.capitulos) {
          ultimoLibro = (libros || []).find(l => l.id === ultimo.capitulos.libro_id);
          const { data: cap } = await sb.from('capitulos').select('numero').eq('id', ultimo.capitulo_id).single();
          ultimoCap = cap?.numero;
        }
        let siguienteLibro = null, siguienteCap = null;
        if (ultimoLibro && ultimoCap) {
          if (ultimoCap < ultimoLibro.num_capitulos) {
            siguienteLibro = ultimoLibro;
            siguienteCap = ultimoCap + 1;
          } else {
            const ordenLibros = (libros || []).slice().sort((a, b) => a.id - b.id);
            const idx = ordenLibros.findIndex(l => l.id === ultimoLibro.id);
            const next = ordenLibros[idx + 1];
            if (next) { siguienteLibro = next; siguienteCap = 1; }
          }
        }
        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            ${pendientesMemoria > 0 ? `<div class="banner-repaso" onclick="router.navegar('/memorizacion')" role="button" tabindex="0">${window.Iconos.render('brain')} <span>Tienes ${pendientesMemoria} versículo${pendientesMemoria === 1 ? '' : 's'} para repasar hoy</span> <span class="banner-repaso__flecha">→</span></div>` : ''}
            <div class="o-flecha o-flecha--between"><h2>${window.Iconos.render('book-open')} Estudio Guiado</h2><div class="o-flecha" style="gap:var(--espaciado-xs)"><button class="info-ayuda" data-guia="estudio" aria-label="Guía de Estudio">i</button><span class="u-fs-sm u-color-texto-terciario">${usuario.nombre_completo}</span></div></div>
              <div class="o-grid-tarjetas o-grid-tarjetas--estadisticas">
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos leídos <button class="info-ayuda" data-guia="estudio-caps" aria-label="Info capítulos">i</button></p><p class="u-texto-2xl u-fw-700">${completados.length}</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Libros <button class="info-ayuda" data-guia="estudio-libros" aria-label="Info libros">i</button></p><p class="u-texto-2xl u-fw-700">${librosCompletados}/${(libros||[]).length}</p></div>
              <div class="tarjeta-racha"><div class="tarjeta-racha__llama">${window.Iconos.render('flame')}</div><div class="tarjeta-racha__info"><p class="u-fs-xs u-color-texto-terciario">Racha <button class="info-ayuda" data-guia="estudio-racha" aria-label="Info racha">i</button></p><p class="u-texto-2xl u-fw-700">${racha} días</p></div></div>
              <div class="tarjeta-porcentaje"><div class="tarjeta-porcentaje__info"><p class="u-fs-xs u-color-texto-terciario">% General <button class="info-ayuda" data-guia="estudio-pct" aria-label="Info porcentaje">i</button></p><p class="u-texto-2xl u-fw-700">${pctGeneral}%</p></div><div class="tarjeta-porcentaje__barra"><div class="tarjeta-porcentaje__lleno" style="width:${pctGeneral}%"></div></div></div>
            </div>
            ${siguienteLibro ? `<div class="tarjeta-capitulo tarjeta-capitulo--en-progreso" style="cursor:pointer" id="continuarLectura"><div class="o-flecha o-flecha--between"><div><span class="u-fs-sm u-color-texto-secundario">Continuar leyendo</span><p class="u-fw-600">${siguienteLibro.nombre} ${siguienteCap}</p></div><span>→</span></div></div>` : ''}
            <div class="o-pila">
              <div class="o-flecha o-flecha--between" style="cursor:pointer" id="toggleAT">
                <h3>Antiguo Testamento</h3>
                <span id="iconAT" style="transition:transform var(--transicion-normal)">${window.Iconos.render('chevron-down')}</span>
              </div>
              <div id="listaAT" class="o-grid-tarjetas"></div>
            </div>
            <div class="o-pila">
              <div class="o-flecha o-flecha--between" style="cursor:pointer" id="toggleNT">
                <h3>Nuevo Testamento</h3>
                <span id="iconNT" style="transition:transform var(--transicion-normal)">${window.Iconos.render('chevron-down')}</span>
              </div>
              <div id="listaNT" class="o-grid-tarjetas"></div>
            </div>
          </div>`;
        if (siguienteLibro) {
          raiz.querySelector('#continuarLectura').onclick = () => router.navegar(`/estudio/sesion/${siguienteLibro.id}/${siguienteCap}`);
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
          el.addEventListener('click', () => router.navegar(`/estudio/libro/${el.dataset.libro}`));
        });
        const atStorage = localStorage.getItem('fb_collapse_at') !== 'false';
        const ntStorage = localStorage.getItem('fb_collapse_nt') !== 'false';
        const listaAT = raiz.querySelector('#listaAT');
        const listaNT = raiz.querySelector('#listaNT');
        if (!atStorage) { listaAT.style.display = 'none'; raiz.querySelector('#iconAT').style.transform = 'rotate(-90deg)'; }
        if (!ntStorage) { listaNT.style.display = 'none'; raiz.querySelector('#iconNT').style.transform = 'rotate(-90deg)'; }
        raiz.querySelector('#toggleAT').onclick = () => {
          const vis = listaAT.style.display !== 'none';
          listaAT.style.display = vis ? 'none' : '';
          raiz.querySelector('#iconAT').style.transform = vis ? 'rotate(-90deg)' : '';
          localStorage.setItem('fb_collapse_at', String(!vis));
        };
        raiz.querySelector('#toggleNT').onclick = () => {
          const vis = listaNT.style.display !== 'none';
          listaNT.style.display = vis ? 'none' : '';
          raiz.querySelector('#iconNT').style.transform = vis ? 'rotate(-90deg)' : '';
          localStorage.setItem('fb_collapse_nt', String(!vis));
        };
        const guias = {
          'estudio': ['Estudio Guiado', 'Aquí navegas por todos los libros de la Biblia. Cada libro contiene capítulos; al seleccionar uno accedes al plan de lectura con preguntas de comprensión. El progreso se guarda automáticamente.', 'Ej: Selecciona "Génesis" → "Capítulo 1" para comenzar a leer y responder preguntas.'],
          'estudio-caps': ['Capítulos leídos', 'Muestra el total de capítulos que has completado. Un capítulo se marca como leído cuando terminas la sesión de estudio (lees el texto y respondes las preguntas).', 'Cuantos más capítulos completes, mayor será tu porcentaje general de la Biblia.'],
          'estudio-libros': ['Libros completados', 'Indica cuántos libros de la Biblia has terminado por completo (todos sus capítulos leídos) frente al total de libros disponibles.', 'Ej: 5/66 significa que has completado 5 libros de los 66 que tiene la Biblia.'],
          'estudio-racha': ['Racha de lectura', 'Días consecutivos en los que has estudiado al menos un capítulo. Si dejas pasar un día sin estudiar, la racha se reinicia a cero.', '¡Mantén la racha encendida estudiando al menos un capítulo cada día! 🔥'],
          'estudio-pct': ['Porcentaje general', 'Porcentaje total de la Biblia que has leído. Se calcula dividiendo los capítulos completados entre el total de capítulos de toda la Biblia.', 'Ej: 25% significa que has leído una cuarta parte de la Biblia.']
        };
        window.helpers.registrarGuias(raiz, guias);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    }
  };
})();
