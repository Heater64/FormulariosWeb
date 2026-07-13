(function() {
  'use strict';
  window.vistaExamenTomar = {
    async montar(raiz, params) {
      if (!params || !params.id) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = '<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando examen...</p></div>';
      try {
        const examen = await window.examenesRepository.obtener(params.id);
        if (!examen) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
        const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
        if (!examen.publicado && !esProfesor) {
          raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
        }
        const preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : examen.preguntas;
        const misIntentos = await window.examenesRepository.misIntentos(usuario.id);
        const terminado = misIntentos.find(i => i.examen_id === params.id && (i.estado === 'completado' || i.estado === 'calificado'));
        if (terminado) { this._renderYaCompletado(raiz, examen, terminado); return; }
        let intento = misIntentos.find(i => i.examen_id === params.id && i.estado === 'en_progreso');
        if (!intento) {
          intento = await window.examenesRepository.guardarIntento({ examen_id: params.id, alumno_id: usuario.id, respuestas: '{}', estado: 'en_progreso' });
        }
        const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        this._renderizar(raiz, examen, preguntas, intento, respuestas, usuario);
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`;
      }
    },
    _renderizar(raiz, examen, preguntas, intento, respuestas, usuario) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <div class="o-pila">
            <h2>${window.helpers.escapeHtml(examen.titulo)}</h2>
            ${examen.descripcion ? `<p class="u-color-texto-secundario u-fs-sm">${window.helpers.escapeHtml(examen.descripcion)}</p>` : ''}
            <p class="u-fs-xs u-color-texto-terciario">${preguntas.length} preguntas</p>
          </div>
          <div id="preguntasExamen" class="o-pila"></div>
          <div class="o-flecha" style="position:fixed;bottom:80px;left:0;right:0;justify-content:center;gap:var(--espaciado-md);padding:var(--espaciado-sm);background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-top:1px solid var(--color-borde)">
            <button class="btn-primario" id="btnEntregar" style="width:80%;justify-content:center">Entregar examen</button>
          </div>
        </div>`;
      const cont = raiz.querySelector('#preguntasExamen');
      cont.innerHTML = preguntas.map((p, i) => {
        const rActual = respuestas[p.id] !== undefined ? respuestas[p.id] : '';
        return `
          <div class="tarjeta-capitulo" data-pid="${p.id}" style="border-left:3px solid var(--color-acento)">
            <p class="u-fw-600 u-fs-sm u-mb-1">${i + 1}. ${window.helpers.escapeHtml(p.texto)}</p>
            ${this._renderRespuesta(p, rActual, i)}
          </div>`;
      }).join('');
      cont.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', () => this._guardarRespuesta(cont, intento, preguntas, usuario));
      });
      raiz.querySelector('#btnEntregar').onclick = async () => {
        if (!confirm('¿Estás seguro de entregar el examen? No podrás cambiar las respuestas después.')) return;
        this._guardarRespuesta(cont, intento, preguntas, usuario);
        const respuestasFinales = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        const resultado = window.puntuacionExamen.calcularPuntuacion(respuestasFinales, preguntas);
        const esLibre = preguntas.some(p => p.tipo === 'respuesta_corta' || p.tipo === 'completar');
        await window.examenesRepository.guardarIntento({
          id: intento.id, respuestas: JSON.stringify(respuestasFinales),
          puntuacion: resultado.porcentaje,
          estado: esLibre ? 'completado' : 'calificado',
          nota: esLibre ? null : resultado.nota,
          corregido: !esLibre,
          fecha_completado: new Date().toISOString()
        });
        await window.adminRepository.registrarAuditoria('examen:entregar', `Examen "${examen.titulo}"`, usuario.id, usuario.grupo_id);
        router.navegar('/examenes');
      };
    },
    _renderYaCompletado(raiz, examen, intento) {
      const nota = intento.corregido && intento.nota != null
        ? `<p class="u-fw-700" style="color:${intento.nota >= 70 ? 'var(--color-exito)' : 'var(--color-error)'}">Nota: ${intento.nota}%</p>`
        : '<p class="u-color-texto-secundario">Pendiente de calificación</p>';
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-mt-3" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
          <div class="tarjeta-capitulo tarjeta-capitulo--completado">
            <div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(examen.titulo)}</span><span class="u-fs-xs u-color-texto-secundario">Completado</span></div>
            ${nota}
          </div>
          <button class="btn-secundario" id="btnVolver">Volver a exámenes</button>
        </div>`;
      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');
    },
    _renderRespuesta(pregunta, rActual, idx) {
      if (pregunta.tipo === 'multiple') {
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="o-flecha u-mb-1" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde);${String(oi) === rActual ? 'background:var(--color-acento-soft);border-color:var(--color-acento)' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${oi}" ${String(oi) === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'verdadero_falso') {
        return ['true', 'false'].map(v => `
          <label class="o-flecha u-mb-1" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde);${v === rActual ? 'background:var(--color-acento-soft);border-color:var(--color-acento)' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${v}" ${v === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${v === 'true' ? 'Verdadero' : 'Falso'}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'respuesta_corta') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe tu respuesta...">`;
      }
      if (pregunta.tipo === 'completar') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Completa la frase...">`;
      }
      return '';
    },
    _guardarRespuesta(cont, intento, preguntas) {
      const respuestas = {};
      preguntas.forEach(p => {
        if (p.tipo === 'multiple' || p.tipo === 'verdadero_falso') {
          const sel = cont.querySelector(`input[name="p_${p.id}"]:checked`);
          if (sel) respuestas[p.id] = sel.value;
        } else {
          const inp = cont.querySelector(`input[data-pid="${p.id}"]`);
          if (inp) respuestas[p.id] = inp.value;
        }
      });
      intento.respuestas = JSON.stringify(respuestas);
      window.examenesRepository.guardarIntento({ id: intento.id, respuestas: intento.respuestas });
    }
  };
})();
