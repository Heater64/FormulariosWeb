(function() {
  'use strict';
  window.vistaEstudio = {
    async montar(raiz) {
      raiz.innerHTML = window.skeleton ? window.skeleton.estudio() : '<div class="o-contenedor o-pila o-pila--lg u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      const usuario = store.obtener('usuario');
      const sb = window.supabaseClient;
      if (!sb || !usuario) return;
      try {
        const [librosResult, progresoResult] = await Promise.all([
          sb.from('libros_biblicos').select('*').order('id'),
          sb.from('progreso_lectura').select('*, capitulos!capitulo_id(libro_id)').eq('usuario_id', usuario.id).eq('completado', true)
        ]);
        const libros = librosResult.data;
        const completados = progresoResult.data || [];
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
        const statsResumen = `
          <div class="guia-popup__stat"><p class="guia-popup__stat-valor">${completados.length}</p><p class="guia-popup__stat-etiqueta">Capítulos leídos</p></div>
          <div class="guia-popup__stat"><p class="guia-popup__stat-valor">${librosCompletados}/${(libros || []).length}</p><p class="guia-popup__stat-etiqueta">Libros completados</p></div>
          <div class="guia-popup__stat"><p class="guia-popup__stat-valor">${pctGeneral}%</p><p class="guia-popup__stat-etiqueta">Progreso general</p></div>
        `;
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
          <div class="o-contenedor o-contenedor--ancho o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <div class="estudio-cabecera">
              <div class="estudio-cabecera__fila">
                <h2>${window.Iconos.render('book-open')} <span class="estudio-cabecera__titulo-texto">Estudio Guiado</span> <button class="info-ayuda" data-guia="estudio" aria-label="Resumen y guía de Estudio">i</button></h2>
                <div class="estudio-cabecera__derecha">
                  ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
                  <span class="estudio-usuario">${usuario.foto_perfil ? `<img src="${window.helpers.escapeHtml(usuario.foto_perfil)}" alt="" class="estudio-usuario__foto">` : `<span class="estudio-usuario__inicial">${(usuario.nombre_completo || '?').charAt(0).toUpperCase()}</span>`}</span>
                </div>
              </div>
              <p class="estudio-cabecera__sub">Lee la Biblia capítulo a capítulo con preguntas de repaso.</p>
            </div>
            ${siguienteLibro ? `<div class="tarjeta-capitulo tarjeta-capitulo--en-progreso estudio-continuar" id="continuarLectura" role="button" tabindex="0" aria-label="Continuar leyendo ${siguienteLibro.nombre} ${siguienteCap}">
              <div class="estudio-continuar__icono">${window.Iconos.render('book-open')}</div>
              <div class="estudio-continuar__info">
                <span class="estudio-continuar__etiqueta">Continuar leyendo</span>
                <p class="estudio-continuar__titulo">${siguienteLibro.nombre} ${siguienteCap}</p>
                <span class="estudio-continuar__capitulo">Capítulo ${siguienteCap} de ${siguienteLibro.num_capitulos}</span>
              </div>
              <span class="estudio-continuar__flecha">${window.Iconos.render('chevron-right')}</span>
            </div>` : ''}
            <section class="o-pila o-pila--sm">
              <div class="estudio-testamento estudio-testamento--at" id="toggleAT" role="button" tabindex="0" aria-expanded="true" aria-controls="listaAT">
                <div class="estudio-testamento__titulo">
                  <h3>Antiguo Testamento</h3>
                  <span class="estudio-testamento__count">${antiguos.length} libros</span>
                </div>
                <span class="estudio-testamento__icono" id="iconAT">${window.Iconos.render('chevron-down')}</span>
              </div>
              <div id="listaAT" class="estudio-lista"></div>
            </section>
            <section class="o-pila o-pila--sm">
              <div class="estudio-testamento estudio-testamento--nt" id="toggleNT" role="button" tabindex="0" aria-expanded="true" aria-controls="listaNT">
                <div class="estudio-testamento__titulo">
                  <h3>Nuevo Testamento</h3>
                  <span class="estudio-testamento__count">${nuevos.length} libros</span>
                </div>
                <span class="estudio-testamento__icono" id="iconNT">${window.Iconos.render('chevron-down')}</span>
              </div>
              <div id="listaNT" class="estudio-lista"></div>
            </section>
          </div>`;
        if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
        if (siguienteLibro) {
          const irLectura = () => router.navegar(`/estudio/sesion/${siguienteLibro.id}/${siguienteCap}`);
          const elContinuar = raiz.querySelector('#continuarLectura');
          elContinuar.onclick = irLectura;
          elContinuar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irLectura(); }
          });
        }
        const renderLibro = (l) => {
          const leidos = completados.filter(p => p.capitulos?.libro_id === l.id).length;
          const pct = Math.round((leidos / l.num_capitulos) * 100);
          const esCompletado = pct === 100;
          const esVacio = pct === 0;
          const iconoLibro = esCompletado ? window.Iconos.render('check-circle') : window.Iconos.render('book-open');
          return `<div class="tarjeta-libro${esCompletado ? ' tarjeta-libro--completado' : ''}${esVacio ? ' tarjeta-libro--vacio' : ''}" data-libro="${l.id}" role="button" tabindex="0" aria-label="Estudiar ${l.nombre}: ${leidos} de ${l.num_capitulos} capítulos leídos" title="Estudiar ${l.nombre}: progreso ${pct}%">
            <span class="tarjeta-libro__icono">${iconoLibro}</span>
            <div class="tarjeta-libro__info">
              <span class="tarjeta-libro__nombre">${l.nombre}</span>
              <span class="tarjeta-libro__progreso">${leidos}/${l.num_capitulos} leídos · ${pct}%</span>
              <div class="tarjeta-libro__barra"><div class="tarjeta-libro__barra--lleno" style="width:${pct}%"></div></div>
            </div>
            <span class="tarjeta-libro__flecha">${window.Iconos.render('chevron-right')}</span>
          </div>`;
        };
        raiz.querySelector('#listaAT').innerHTML = antiguos.map(renderLibro).join('');
        raiz.querySelector('#listaNT').innerHTML = nuevos.map(renderLibro).join('');
        raiz.querySelectorAll('[data-libro]').forEach(el => {
          el.addEventListener('click', () => router.navegar(`/estudio/libro/${el.dataset.libro}`));
        });
        // Animación unificada de entrada (stagger) para las tarjetas
        if (window.animaciones) {
          window.animaciones.animarHijos(raiz.querySelector('#listaAT'), '.tarjeta-libro', 'anim-tarjeta', 35);
          window.animaciones.animarHijos(raiz.querySelector('#listaNT'), '.tarjeta-libro', 'anim-tarjeta', 35);
        }
        const atStorage = localStorage.getItem('fb_collapse_at') !== 'false';
        const ntStorage = localStorage.getItem('fb_collapse_nt') !== 'false';
        const listaAT = raiz.querySelector('#listaAT');
        const listaNT = raiz.querySelector('#listaNT');
        if (!atStorage) { listaAT.style.display = 'none'; raiz.querySelector('#toggleAT').setAttribute('aria-expanded', 'false'); }
        if (!ntStorage) { listaNT.style.display = 'none'; raiz.querySelector('#toggleNT').setAttribute('aria-expanded', 'false'); }
        const alternarTestamento = (btn, lista, key) => {
          const colapsado = lista.style.display === 'none';
          lista.style.display = colapsado ? '' : 'none';
          btn.setAttribute('aria-expanded', String(colapsado));
          localStorage.setItem(key, String(colapsado));
        };
        const toggleAT = raiz.querySelector('#toggleAT');
        const toggleNT = raiz.querySelector('#toggleNT');
        toggleAT.onclick = () => alternarTestamento(toggleAT, listaAT, 'fb_collapse_at');
        toggleNT.onclick = () => alternarTestamento(toggleNT, listaNT, 'fb_collapse_nt');
        const tecladoTestamento = (btn, lista, key) => (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarTestamento(btn, lista, key); }
        };
        toggleAT.addEventListener('keydown', tecladoTestamento(toggleAT, listaAT, 'fb_collapse_at'));
        toggleNT.addEventListener('keydown', tecladoTestamento(toggleNT, listaNT, 'fb_collapse_nt'));
        const guias = {
          'estudio': ['Estudio Guiado', 'Aquí navegas por todos los libros de la Biblia. Cada libro contiene capítulos; al seleccionar uno accedes al plan de lectura con preguntas de comprensión. El progreso se guarda automáticamente.', 'Ej: Selecciona "Génesis" → "Capítulo 1" para comenzar a leer y responder preguntas.', statsResumen]
        };
        window.helpers.registrarGuias(raiz, guias);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }

    },

    desmontar() {}
  };
})();
