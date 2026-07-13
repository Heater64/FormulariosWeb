(function() {
  'use strict';
  window.vistaLeer = {
    async montar(raiz, params) {
      const libroId = parseInt(params.libro);
      const capituloNum = parseInt(params.capitulo);
      raiz.innerHTML = '<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando capítulo...</p></div>';
      const sb = window.supabaseClient;
      const usuario = store.obtener('usuario');
      if (!sb) return;
      try {
        const { data: libro } = await sb.from('libros_biblicos').select('*').eq('id', libroId).single();
        const { data: cap } = await sb.from('capitulos').select('id').eq('libro_id', libroId).eq('numero', capituloNum).single();
        const { data: versiculos } = await sb.from('versiculos').select('*').eq('capitulo_id', cap.id).order('numero');
        const { data: progreso } = usuario ? await sb.from('progreso_lectura').select('*').eq('usuario_id', usuario.id).eq('capitulo_id', cap.id).single() : { data: null };
        const yaLeido = progreso?.completado || false;
        let { data: tarjetas } = usuario ? await sb.from('tarjetas_memorizacion').select('versiculo_id').eq('usuario_id', usuario.id) : { data: [] };
        const tarjetasSet = new Set((tarjetas || []).map(t => t.versiculo_id));
        this._renderizar(raiz, { libro, capituloNum, versiculos, capId: cap.id, libroId, yaLeido, usuario, tarjetasSet, numCaps: libro.num_capitulos });
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor o-pila u-mt-4 u-texto-centrado"><h2 style="color:var(--color-acento);display:flex;justify-content:center">${window.Iconos.render('book-open')}</h2><p class="u-color-texto-secundario">Capítulo no disponible aún</p><button class="btn-primario" onclick="router.navegar('/estudio')">← Volver</button></div>`;
      }
    },
    _renderizar(raiz, { libro, capituloNum, versiculos, capId, libroId, yaLeido, usuario, tarjetasSet, numCaps }) {
      const tieneTexto = versiculos && versiculos.length > 0;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila" style="padding-top:var(--espaciado-lg);padding-bottom:140px">
          <div class="o-flecha o-flecha--between u-mb-2">
            <button class="btn-secundario" onclick="router.navegar('/estudio')">←</button>
            <div class="u-texto-centrado">
              <h3 style="margin:0">${libro.nombre} ${capituloNum}</h3>
              <span class="u-fs-xs u-color-texto-terciario">${capituloNum} de ${numCaps}</span>
            </div>
            <div style="display:flex;gap:var(--espaciado-xs)">
              <button id="btnFontDown" class="btn-secundario" style="padding:2px 8px" title="Reducir fuente">A−</button>
              <button id="btnFontUp" class="btn-secundario" style="padding:2px 8px" title="Aumentar fuente">A+</button>
            </div>
          </div>
          ${!tieneTexto ? `<div class="u-texto-centrado o-pila u-mt-4" style="align-items:center"><p style="font-size:3rem;color:var(--color-texto-terciario);display:flex;justify-content:center">${window.Iconos.render('book-open')}</p><p class="u-color-texto-secundario">Este capítulo se cargará próximamente</p></div>` : ''}
          <div id="lecturaTexto" class="o-pila" style="font-size:var(--texto-md, 1rem);line-height:var(--altura-linea-lectura, 1.8);max-width:680px;margin:0 auto">
            ${(versiculos || []).map(v => `
              <div class="versiculo-linea" data-vid="${v.id}" style="display:flex;gap:var(--espaciado-sm);padding:var(--espaciado-xs) 0;border-bottom:1px solid var(--color-borde, #e5e7eb);align-items:flex-start">
                <sup class="versiculo-num" style="color:var(--color-texto-terciario);font-size:var(--texto-xs);min-width:24px;text-align:right;flex-shrink:0;padding-top:2px">${v.numero}</sup>
                <span class="versiculo-texto" style="flex:1">${window.helpers.escapeHtml(v.texto)}</span>
                ${usuario ? `<button class="btn-memorizar" data-vid="${v.id}" style="background:none;border:none;cursor:pointer;font-size:var(--texto-sm);padding:2px 4px;flex-shrink:0;${tarjetasSet.has(v.id) ? 'opacity:0.5' : ''}" title="${tarjetasSet.has(v.id) ? 'Ya memorizado' : 'Memorizar este versículo'}">${tarjetasSet.has(v.id) ? window.Iconos.render('brain') : window.Iconos.render('pin')}</button>` : ''}
              </div>
            `).join('')}
          </div>
          <div style="position:fixed;bottom:80px;left:0;right:0;display:flex;flex-direction:column;gap:var(--espaciado-xs);padding:var(--espaciado-sm);background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-top:1px solid var(--color-borde)">
            <div style="display:flex;justify-content:center;gap:var(--espaciado-md)">
              <button class="btn-secundario" id="btnAnterior" ${capituloNum <= 1 ? 'disabled' : ''} style="${capituloNum <= 1 ? 'opacity:0.4' : ''}">← Anterior</button>
              <button class="btn-primario" id="btnCompletar" style="justify-content:center;min-width:120px">${yaLeido ? window.Iconos.render('check') + ' Completado' : 'Marcar como leído ' + window.Iconos.render('check')}</button>
              <button class="btn-secundario" id="btnSiguiente" ${capituloNum >= numCaps ? 'disabled' : ''} style="${capituloNum >= numCaps ? 'opacity:0.4' : ''}">Siguiente →</button>
            </div>
            <div style="display:flex;justify-content:center;gap:var(--espaciado-sm)">
              <span class="u-fs-xs u-color-texto-terciario">Capítulo</span>
              <select id="selectorCapitulo" style="font-size:var(--texto-xs);padding:2px 4px">
                ${Array.from({length: numCaps}, (_, i) => i + 1).map(n => `<option value="${n}" ${n === capituloNum ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>`;
      raiz.querySelector('#btnAnterior')?.addEventListener('click', () => router.navegar(`/leer/${libroId}/${capituloNum - 1}`));
      raiz.querySelector('#btnSiguiente')?.addEventListener('click', () => router.navegar(`/leer/${libroId}/${capituloNum + 1}`));
      raiz.querySelector('#selectorCapitulo')?.addEventListener('change', function() { router.navegar(`/leer/${libroId}/${this.value}`); });
      let tamFuente = 16;
      raiz.querySelector('#btnFontUp')?.addEventListener('click', () => { tamFuente = Math.min(28, tamFuente + 2); raiz.querySelector('#lecturaTexto').style.fontSize = tamFuente + 'px'; });
      raiz.querySelector('#btnFontDown')?.addEventListener('click', () => { tamFuente = Math.max(12, tamFuente - 2); raiz.querySelector('#lecturaTexto').style.fontSize = tamFuente + 'px'; });
      const btnComp = raiz.querySelector('#btnCompletar');
      if (btnComp) {
        btnComp.addEventListener('click', async () => {
          if (yaLeido) return;
          btnComp.disabled = true; btnComp.innerHTML = window.Iconos.render('check') + ' Guardando...';
          if (usuario) await window.progresoRepository.marcarLeido(usuario.id, capId);
          btnComp.innerHTML = window.Iconos.render('check') + ' Completado';
          window.Iconos.actualizar();
          setTimeout(() => router.navegar(`/leer/${libroId}/${capituloNum + 1 > numCaps ? capituloNum : capituloNum + 1}`), 600);
        });
      }
      if (usuario) {
        raiz.querySelectorAll('.btn-memorizar').forEach(btn => {
          btn.addEventListener('click', async () => {
            const vid = btn.dataset.vid;
            try {
              await window.memorizacionRepository.agregarTarjeta(usuario.id, vid);
               btn.innerHTML = window.Iconos.render('brain'); btn.style.opacity = '0.5'; btn.title = 'Agregado a memorización';
               window.Iconos.actualizar();
            } catch (e) { console.warn(e); }
          });
        });
      }
    }
  };
})();
