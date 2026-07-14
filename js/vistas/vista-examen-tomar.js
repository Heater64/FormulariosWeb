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
        if (terminado) { this._renderResultados(raiz, examen, preguntas, terminado, usuario); return; }
        let intento = misIntentos.find(i => i.examen_id === params.id && i.estado === 'en_progreso');
        if (!intento) {
          intento = await window.examenesRepository.guardarIntento({ examen_id: params.id, alumno_id: usuario.id, respuestas: '{}', estado: 'en_progreso' });
        }
        const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        if (intento.estado === 'completado' || intento.estado === 'calificado') {
          this._renderResultados(raiz, examen, preguntas, intento, respuestas, usuario);
        } else {
          this._renderizar(raiz, examen, preguntas, intento, respuestas, usuario);
        }
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`;
      }
    },
    _renderizar(raiz, examen, preguntas, intento, respuestas, usuario) {
      const respondidas = preguntas.filter(p => respuestas[p.id] !== undefined && respuestas[p.id] !== '').length;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-pila">
            <div class="o-flecha o-flecha--between o-flecha--centro">
              <div>
                <h2 class="u-mb-0">${window.helpers.escapeHtml(examen.titulo)}</h2>
                ${examen.descripcion ? `<p class="u-color-texto-secundario u-fs-sm u-mt-1">${window.helpers.escapeHtml(examen.descripcion)}</p>` : ''}
              </div>
              <span class="u-fs-xs u-color-texto-terciario" style="white-space:nowrap">${preguntas.length} preguntas</span>
            </div>
            <div class="u-mt-2" style="height:6px;background:var(--color-fondo-alt);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${Math.round((respondidas / preguntas.length) * 100)}%;background:var(--color-exito);border-radius:99px;transition:width 0.3s ease" id="barraProgresoExamen"></div>
            </div>
            <p class="u-fs-xs u-color-texto-terciario" id="contadorProgreso">${respondidas}/${preguntas.length} respondidas</p>
          </div>
          <div id="preguntasExamen" class="o-pila"></div>
          <div class="o-flecha" style="position:fixed;bottom:calc(76px + env(safe-area-inset-bottom));left:0;right:0;justify-content:center;gap:var(--espaciado-md);padding:var(--espaciado-sm);background:var(--color-vidrio);-webkit-backdrop-filter:var(--desenfoque-vidrio);backdrop-filter:var(--desenfoque-vidrio);border-top:1px solid var(--color-vidrio-borde)">
            <button class="btn-primario" id="btnEntregar" style="width:80%;justify-content:center">Entregar examen</button>
          </div>
        </div>`;
      const cont = raiz.querySelector('#preguntasExamen');
      cont.innerHTML = preguntas.map((p, i) => {
        const rActual = respuestas[p.id] !== undefined ? respuestas[p.id] : '';
        return `
          <div class="pregunta-examen" data-pid="${p.id}">
            <p class="pregunta-examen__texto"><span class="pregunta-examen__numero">${i + 1}</span> ${window.helpers.escapeHtml(p.texto)}</p>
            <div class="pregunta-examen__opciones">${this._renderRespuesta(p, rActual, i)}</div>
          </div>`;
      }).join('');
      const actualizarBarra = () => {
        const nuevasResp = {};
        preguntas.forEach(p => {
          const val = this._obtenerValorRespuesta(cont, p);
          if (val !== undefined) nuevasResp[p.id] = val;
        });
        const count = preguntas.filter(p => nuevasResp[p.id] !== undefined && nuevasResp[p.id] !== '').length;
        const barra = raiz.querySelector('#barraProgresoExamen');
        const texto = raiz.querySelector('#contadorProgreso');
        if (barra) barra.style.width = `${Math.round((count / preguntas.length) * 100)}%`;
        if (texto) texto.textContent = `${count}/${preguntas.length} respondidas`;
      };
      const guardarYActualizarBarra = () => {
        this._guardarRespuesta(cont, intento, preguntas, usuario);
        actualizarBarra();
      };
      cont.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', guardarYActualizarBarra);
        if (el.tagName === 'INPUT' && el.type !== 'hidden') {
          el.addEventListener('input', actualizarBarra);
        }
      });
      cont.querySelectorAll('.btn-ordenar-up').forEach(btn => {
        btn.addEventListener('click', () => {
          const preguntaId = btn.dataset.orden;
          const pos = parseInt(btn.dataset.pos);
          if (pos === 0) return;
          const inputs = Array.from(cont.querySelectorAll(`input[data-orden="${preguntaId}"]`)).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos));
          const temp = inputs[pos].value;
          inputs[pos].value = inputs[pos - 1].value;
          inputs[pos - 1].value = temp;
          inputs[pos].dataset.pos = pos - 1;
          inputs[pos - 1].dataset.pos = pos;
          guardarYActualizarBarra();
        });
      });
      cont.querySelectorAll('.btn-ordenar-down').forEach(btn => {
        btn.addEventListener('click', () => {
          const preguntaId = btn.dataset.orden;
          const pos = parseInt(btn.dataset.pos);
          const inputs = Array.from(cont.querySelectorAll(`input[data-orden="${preguntaId}"]`)).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos));
          if (pos < inputs.length - 1) {
            const temp = inputs[pos].value;
            inputs[pos].value = inputs[pos + 1].value;
            inputs[pos + 1].value = temp;
            inputs[pos].dataset.pos = pos + 1;
            inputs[pos + 1].dataset.pos = pos;
            guardarYActualizarBarra();
          }
        });
      });
      raiz.querySelector('#btnEntregar').onclick = async () => {
        if (!window.confirm('¿Estás seguro de entregar el examen? No podrás cambiar las respuestas después.')) return;
        try {
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
          try { await window.adminRepository.registrarAuditoria('examen:entregar', `Examen "${examen.titulo}"`, usuario.id, usuario.grupo_id); } catch (e) {}
          window.helpers.mostrarAlerta('Examen entregado correctamente.', 'exito');
          router.navegar('/examenes');
        } catch (e) {
          window.helpers.mostrarAlerta('Error al entregar: ' + e.message, 'error');
        }
      };
    },
    _renderResultados(raiz, examen, preguntas, intento, usuario) {
      const usuarioEsProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      if (!usuarioEsProfesor && examen.publicado === false && intento.corregido === false) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
      }
      const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      const esLibre = preguntas.some(p => p.tipo === 'respuesta_corta' || p.tipo === 'completar');
      const correccionVisible = intento.corregido || !esLibre;
      let aciertos = 0;
      preguntas.forEach(p => { if (window.puntuacionExamen.esCorrecta(respuestas[p.id], p.respuesta_correcta, p.tipo)) aciertos++; });
      const nota = intento.corregido && intento.nota != null
        ? `<p class="u-fw-700" style="font-size:1.25rem;color:${intento.nota >= 7 ? 'var(--color-exito)' : 'var(--color-error)'}">Nota: ${intento.nota}</p>`
        : `<p class="u-fw-600">Aciertos: ${aciertos}/${preguntas.length} (${Math.round((aciertos / preguntas.length) * 100)}%)</p>`;
      const estadoTexto = intento.corregido ? 'Corregido' : (esLibre ? 'Pendiente de calificación' : 'Calificado automáticamente');
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-mt-3" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between">
            <button class="btn-secundario" id="btnVolver">← Volver</button>
            <span class="u-fs-xs u-color-texto-terciario">${estadoTexto}</span>
          </div>
          <div class="tarjeta-capitulo tarjeta-capitulo--completado">
            <div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(examen.titulo)}</span><span class="u-fs-xs u-color-texto-secundario">Resultados</span></div>
            ${nota}
            ${intento.observaciones ? `<div class="u-mt-2 u-p-2" style="background:var(--color-acento-soft);border-radius:var(--radio-sm)"><p class="u-fs-xs u-color-texto-secundario">Observación del profesor:</p><p class="u-fs-sm">${window.helpers.escapeHtml(intento.observaciones)}</p></div>` : ''}
          </div>
          ${correccionVisible ? `<div class="o-pila" id="desgloseResultados"></div>` : '<p class="u-color-texto-terciario u-fs-sm">La corrección estará disponible cuando el profesor califique el examen.</p>'}
        </div>`;
      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');
      if (!correccionVisible) return;
      const correccionMap = (intento.correccion && typeof intento.correccion === 'string') ? JSON.parse(intento.correccion) : (intento.correccion || {});
      const cont = raiz.querySelector('#desgloseResultados');
      cont.innerHTML = preguntas.map((p, i) => {
        const rUser = respuestas[p.id] !== undefined ? respuestas[p.id] : '(sin respuesta)';
        const corr = correccionMap[p.id];
        const correcta = window.puntuacionExamen.esCorrecta(respuestas[p.id], p.respuesta_correcta, p.tipo);
        const mostrarCheck = p.tipo !== 'respuesta_corta' && p.tipo !== 'completar' ? (correcta ? window.Iconos.render('check') : window.Iconos.render('x')) : '';
          const necesitaFormateo = ['multiple', 'verdadero_falso', 'varias_opciones', 'opcion_unica', 'relacionar', 'ordenar'].includes(p.tipo);
          const respuestaUsuarioHtml = necesitaFormateo ? this._textoOpcion(p, rUser) : window.helpers.escapeHtml(rUser);
        return `<div class="pregunta-examen" style="border-left:4px solid ${correcta ? 'var(--color-exito)' : 'var(--color-error)'}">
          <p class="pregunta-examen__texto"><span class="pregunta-examen__numero">${i + 1}</span> ${window.helpers.escapeHtml(p.texto)}</p>
          <div class="u-fs-sm u-mt-1">Tu respuesta: <strong>${respuestaUsuarioHtml}</strong> ${mostrarCheck}</div>
          ${!correcta ? `<div class="u-fs-sm u-color-texto-secundario u-mt-1">Correcta: ${window.helpers.escapeHtml(this._textoOpcion(p, p.respuesta_correcta))}</div>` : ''}
          ${p.explicacion ? `<div class="u-fs-xs u-color-texto-terciario u-mt-1" style="padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">${window.helpers.escapeHtml(p.explicacion)}</div>` : ''}
          ${corr && corr.comentario ? `<div class="u-fs-xs u-color-acento u-mt-1">${window.Iconos.render('message-square')} Profesor: ${window.helpers.escapeHtml(corr.comentario)}</div>` : ''}
        </div>`;
      }).join('');
      window.Iconos.actualizar();
    },
    _textoOpcion(pregunta, valor) {
      if (pregunta.tipo === 'verdadero_falso') return valor === 'true' ? 'Verdadero' : 'Falso';
      if (pregunta.tipo === 'varias_opciones' || pregunta.tipo === 'ordenar') {
        try {
          const arr = JSON.parse(valor);
          if (Array.isArray(arr)) {
            if (pregunta.tipo === 'ordenar') return arr.map(i => pregunta.opciones[i] || i).join(' → ');
            return arr.map(i => pregunta.opciones[i] || i).join(', ');
          }
        } catch (e) {}
        return valor;
      }
      if (pregunta.tipo === 'relacionar') {
        try {
          const rel = JSON.parse(valor);
          const izq = pregunta.opciones.slice(0, Math.ceil(pregunta.opciones.length / 2));
          const der = pregunta.opciones.slice(Math.ceil(pregunta.opciones.length / 2));
          return Object.entries(rel).map(([k, v]) => (izq[k] || k) + ' → ' + (der[v] || v)).join(' | ');
        } catch (e) {}
        return valor;
      }
      const idx = parseInt(valor, 10);
      if (!isNaN(idx) && pregunta.opciones && pregunta.opciones[idx] !== undefined) return pregunta.opciones[idx];
      return valor;
    },
    _renderRespuesta(pregunta, rActual, idx) {
      if (pregunta.tipo === 'multiple' || pregunta.tipo === 'opcion_unica') {
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="o-flecha u-mb-1" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde);${String(oi) === rActual ? 'background:var(--color-acento-soft);border-color:var(--color-acento)' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${oi}" ${String(oi) === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'varias_opciones') {
        const seleccionadas = rActual ? (() => { try { return JSON.parse(rActual); } catch(e) { return []; } })() : [];
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="o-flecha u-mb-1" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde);${seleccionadas.includes(oi) ? 'background:var(--color-acento-soft);border-color:var(--color-acento)' : ''}">
            <input type="checkbox" data-multi="${pregunta.id}" value="${oi}" ${seleccionadas.includes(oi) ? 'checked' : ''}>
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
      if (pregunta.tipo === 'respuesta_corta' || pregunta.tipo === 'texto_corto') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe tu respuesta..." style="width:100%">`;
      }
      if (pregunta.tipo === 'texto_largo') {
        return `<textarea data-pid="${pregunta.id}" rows="4" placeholder="Escribe tu respuesta detallada..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${window.helpers.escapeHtml(rActual)}</textarea>`;
      }
      if (pregunta.tipo === 'completar') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Completa la frase..." style="width:100%">`;
      }
      if (pregunta.tipo === 'solo_numero') {
        return `<input type="number" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe solo el número..." style="width:100%">`;
      }
      if (pregunta.tipo === 'relacionar') {
        const pares = pregunta.opciones || [];
        const mit = Math.ceil(pares.length / 2);
        const izq = pares.slice(0, mit);
        const der = pares.slice(mit);
        const relacion = rActual ? (() => { try { return JSON.parse(rActual); } catch(e) { return {}; } })() : {};
        return '<div class="o-pila"><p class="u-fs-xs u-color-texto-terciario u-mb-1">Relaciona cada elemento de la izquierda con su par de la derecha:</p>' +
          izq.map((item, ri) => `
            <div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs)">
              <span style="flex:1;padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">${window.helpers.escapeHtml(item)}</span>
              <span class="u-color-texto-terciario">→</span>
              <select data-relacion="${pregunta.id}" data-idx="${ri}" style="flex:1">
                <option value="">— Seleccionar —</option>
                ${der.map((d, di) => `<option value="${di}" ${relacion[ri] === di ? 'selected' : ''}>${window.helpers.escapeHtml(d)}</option>`).join('')}
              </select>
            </div>
          `).join('') + '</div>';
      }
      if (pregunta.tipo === 'ordenar') {
        const items = pregunta.opciones || [];
        const orden = rActual ? (() => { try { return JSON.parse(rActual); } catch(e) { return items.map((_, i) => i); } })() : items.map((_, i) => i);
        return '<div class="o-pila"><p class="u-fs-xs u-color-texto-terciario u-mb-1">Ordena los elementos (usa las flechas para mover):</p>' +
          orden.map((oi, pos) => `
            <div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs);padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">
              <span style="min-width:24px;font-weight:600">${pos + 1}.</span>
              <span style="flex:1">${window.helpers.escapeHtml(items[oi] || '')}</span>
              <input type="hidden" data-orden="${pregunta.id}" data-pos="${pos}" value="${oi}">
              <button type="button" class="btn-ordenar-up" data-orden="${pregunta.id}" data-pos="${pos}" style="background:none;border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px">↑</button>
              <button type="button" class="btn-ordenar-down" data-orden="${pregunta.id}" data-pos="${pos}" style="background:none;border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px">↓</button>
            </div>
          `).join('') + '</div>';
      }
      return '';
    },
    _obtenerValorRespuesta(cont, pregunta) {
      if (pregunta.tipo === 'multiple' || pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'verdadero_falso') {
        const sel = cont.querySelector(`input[name="p_${pregunta.id}"]:checked`);
        return sel ? sel.value : undefined;
      }
      if (pregunta.tipo === 'varias_opciones') {
        const checks = cont.querySelectorAll(`input[data-multi="${pregunta.id}"]:checked`);
        return checks.length > 0 ? JSON.stringify(Array.from(checks).map(c => parseInt(c.value))) : undefined;
      }
      if (pregunta.tipo === 'relacionar') {
        const selects = cont.querySelectorAll(`select[data-relacion="${pregunta.id}"]`);
        const rel = {};
        selects.forEach(s => { if (s.value) rel[parseInt(s.dataset.idx)] = parseInt(s.value); });
        return Object.keys(rel).length > 0 ? JSON.stringify(rel) : undefined;
      }
      if (pregunta.tipo === 'ordenar') {
        const hiddens = cont.querySelectorAll(`input[data-orden="${pregunta.id}"]`);
        if (hiddens.length === 0) return undefined;
        return JSON.stringify(Array.from(hiddens).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos)).map(h => parseInt(h.value)));
      }
      const inp = cont.querySelector(`[data-pid="${pregunta.id}"]`);
      return inp ? inp.value : undefined;
    },
    _guardarRespuesta(cont, intento, preguntas) {
      const respuestas = {};
      preguntas.forEach(p => {
        if (p.tipo === 'multiple' || p.tipo === 'opcion_unica' || p.tipo === 'verdadero_falso') {
          const sel = cont.querySelector(`input[name="p_${p.id}"]:checked`);
          if (sel) respuestas[p.id] = sel.value;
        } else if (p.tipo === 'varias_opciones') {
          const checks = cont.querySelectorAll(`input[data-multi="${p.id}"]:checked`);
          respuestas[p.id] = JSON.stringify(Array.from(checks).map(c => parseInt(c.value)));
        } else if (p.tipo === 'relacionar') {
          const selects = cont.querySelectorAll(`select[data-relacion="${p.id}"]`);
          const rel = {};
          selects.forEach(s => {
            if (s.value) rel[parseInt(s.dataset.idx)] = parseInt(s.value);
          });
          respuestas[p.id] = JSON.stringify(rel);
        } else if (p.tipo === 'ordenar') {
          const hiddens = cont.querySelectorAll(`input[data-orden="${p.id}"]`);
          const orden = Array.from(hiddens).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos)).map(h => parseInt(h.value));
          respuestas[p.id] = JSON.stringify(orden);
        } else {
          const inp = cont.querySelector(`[data-pid="${p.id}"]`);
          if (inp) respuestas[p.id] = inp.value;
        }
      });
      intento.respuestas = JSON.stringify(respuestas);
      window.examenesRepository.guardarIntento({ id: intento.id, respuestas: intento.respuestas });
    }
  };
})();
