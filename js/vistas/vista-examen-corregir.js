(function() {
  'use strict';
  window.vistaExamenCorregir = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      if (!params || !params.id) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no especificado</p></div>'; return; }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando intentos...</p></div>';
      try {
        const examen = await window.examenesRepository.obtener(params.id);
        const intentos = await window.examenesRepository.obtenerIntentos(params.id);
        const preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : (examen.preguntas || []);
        this._renderizar(raiz, examen, preguntas, intentos, usuario);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, examen, preguntas, intentos, usuario) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <div class="o-flecha o-flecha--between">
            <button class="btn-secundario" onclick="router.irAtras()">← Volver</button>
            <h3>Corregir: ${window.helpers.escapeHtml(examen.titulo)}</h3>
            <div></div>
          </div>
          <p class="u-fs-sm u-color-texto-secundario">${intentos.length} intento(s) · ${preguntas.length} preguntas</p>
          <div id="intentosLista" class="o-pila"></div>
        </div>`;
      const cont = raiz.querySelector('#intentosLista');
      if (intentos.length === 0) {
        cont.innerHTML = '<p class="u-color-texto-terciario">No hay intentos para corregir</p>'; return;
      }
      cont.innerHTML = intentos.map((int, i) => {
        const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
        let aciertos = 0;
        preguntas.forEach(p => {
          if (window.puntuacionExamen.esCorrecta(resp[p.id], p.respuesta_correcta, p.tipo)) aciertos++;
        });
        const parcial = int.nota !== null && int.nota !== undefined;
        return `
          <div class="tarjeta-capitulo ${int.corregido ? 'tarjeta-capitulo--completado' : ''}" data-intento="${int.id}">
            <div class="o-flecha o-flecha--between">
              <span class="u-fw-600">${int.perfiles?.nombre_completo || 'Alumno'}</span>
              <span class="u-fs-sm ${int.corregido ? 'u-color-exito' : 'u-color-acento'}">${int.corregido ? window.Iconos.render('check-check') + ' Corregido' : window.Iconos.render('clock') + ' Pendiente'}</span>
            </div>
            <p class="u-fs-sm u-color-texto-secundario">Estado: ${int.estado} · ${parcial ? 'Nota: ' + int.nota + '%' : aciertos + '/' + preguntas.length + ' automáticas'}</p>
            <div class="o-pila u-mt-2" id="detalle_${int.id}" style="${int.corregido ? '' : 'display:none'}">
              ${preguntas.map((p, pi) => {
                const rUser = resp[p.id] || '(sin respuesta)';
                const correcta = window.puntuacionExamen.esCorrecta(resp[p.id], p.respuesta_correcta, p.tipo);
                return `<div class="u-fs-sm u-mb-1" style="padding:var(--espaciado-xs);background:var(--color-fondo);border-radius:var(--radio-sm)">
                  <p class="u-fw-600">${pi+1}. ${window.helpers.escapeHtml(p.texto)}</p>
                  <p>Respuesta: <strong>${window.helpers.escapeHtml(rUser)}</strong> ${p.tipo !== 'respuesta_corta' && p.tipo !== 'completar' ? (correcta ? window.Iconos.render('check') : window.Iconos.render('x')) : ''}</p>
                  ${p.tipo === 'respuesta_corta' || p.tipo === 'completar' ? `<p class="u-color-texto-terciario">Correcta: ${window.helpers.escapeHtml(p.respuesta_correcta)}</p>` : ''}
                  ${p.explicacion ? `<p class="u-fs-xs u-color-texto-terciario">${window.helpers.escapeHtml(p.explicacion)}</p>` : ''}
                </div>`;
              }).join('')}
              <textarea id="obs_${int.id}" rows="2" placeholder="Observaciones...">${int.observaciones || ''}</textarea>
              <div class="o-flecha" style="gap:var(--espaciado-sm)">
                <input type="number" id="nota_${int.id}" value="${int.nota || aciertos * 100 / preguntas.length || 0}" min="0" max="100" step="0.01" style="width:80px">
                <span class="u-fs-sm">%</span>
                <button class="btn-primario btn-calificar" data-intento="${int.id}">Guardar calificación</button>
              </div>
            </div>
            ${!int.corregido ? `<button class="btn-secundario u-mt-1 btn-ver-detalle" data-intento="${int.id}" style="width:100%">Ver y corregir</button>` : ''}
          </div>`;
      }).join('');
      cont.querySelectorAll('.btn-ver-detalle').forEach(btn => {
        btn.onclick = () => {
          const det = raiz.querySelector('#detalle_' + btn.dataset.intento);
          if (det) det.style.display = det.style.display === 'none' ? 'block' : 'none';
        };
      });
      cont.querySelectorAll('.btn-calificar').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.intento;
          const nota = parseFloat(raiz.querySelector('#nota_' + id)?.value || 0);
          const obs = raiz.querySelector('#obs_' + id)?.value || '';
          await window.examenesRepository.calificar(id, Math.min(100, Math.max(0, nota)), obs, usuario.id);
          await window.adminRepository.registrarAuditoria('examen:calificar', `Examen "${examen.titulo}" nota: ${nota}%`, usuario.id, usuario.grupo_id);
          router.navegar('/corregir/' + params.id);
        };
      });
    }
  };
})();
