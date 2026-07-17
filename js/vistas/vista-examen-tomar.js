(function() {
  'use strict';
  const MARCADOR_RE = /\{\{HUECO_(\d+)\}\}/g;
  function renderizarTextoConHuecos(texto, huecos, respuestas, opciones) {
    if (!huecos || huecos.length === 0) return window.helpers.escapeHtml(texto);
    const huecoMap = {};
    huecos.forEach(h => { huecoMap[h.id] = h; });
    const partes = texto.split(MARCADOR_RE);
    return partes.map((parte, i) => {
      if (i % 2 === 0) return window.helpers.escapeHtml(parte);
      const hid = parseInt(parte);
      const hIdx = huecos.findIndex(h => h.id === hid);
      if (hIdx === -1) return window.helpers.escapeHtml('{{HUECO_' + hid + '}}');
      const valor = (respuestas && respuestas[hIdx]) || '';
      const attrs = opciones && opciones.soloLectura ? 'readonly' : '';
      const claseExtra = opciones && opciones.clases ? ' ' + opciones.clases : '';
      return `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input${claseExtra}" data-hidx="${hIdx}" value="${window.helpers.escapeHtml(valor)}" placeholder="…" ${attrs}></span>`;
    }).join('');
  }

  let _cleanup = null;

  window.vistaExamenTomar = {
    async montar(raiz, params) {
      if (_cleanup) { _cleanup(); _cleanup = null; }
      if (!params || !params.id) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor o-pila u-mt-3">${window.skeleton.tarjetas(3, { ancho: '100%' })}</div>` : '<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando examen...</p></div>';
      try {
        const examen = await window.examenesRepository.obtener(params.id);
        if (!examen) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
        const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
        if (!examen.publicado && !esProfesor) {
          raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
        }
        const preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : examen.preguntas;
        preguntas.forEach(p => {
          if (p.tipo === 'completar' && !Array.isArray(p.huecos)) p.huecos = [];
        });
        const misIntentos = await window.examenesRepository.misIntentos(usuario.id);
        const terminado = misIntentos.find(i => i.examen_id === params.id && (i.estado === 'completado' || i.estado === 'calificado'));
        if (terminado) { this._renderResultados(raiz, examen, preguntas, terminado, usuario); return; }
        let intento = misIntentos.find(i => i.examen_id === params.id && i.estado === 'en_progreso');
        if (!intento) {
          intento = await window.examenesRepository.guardarIntento({ examen_id: params.id, alumno_id: usuario.id, respuestas: '{}', estado: 'en_progreso' });
        }
        const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        if (intento.estado === 'completado' || intento.estado === 'calificado') {
          this._renderResultados(raiz, examen, preguntas, intento, usuario);
        } else {
          this._renderizar(raiz, examen, preguntas, intento, respuestas, usuario);
        }
      } catch (e) {
        console.error('Error cargando examen:', e);
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">No se pudo cargar el examen. Revisa tu conexión.</p><button class="btn-primario" onclick="router.navegar('/examenes')">← Volver</button></div>`;
      }
    },

    _renderizar(raiz, examen, preguntas, intento, respuestas, usuario) {
      const respondidas = preguntas.filter(p => this._tieneRespuesta(respuestas, p)).length;
      const porcentaje = Math.round((respondidas / preguntas.length) * 100);

      raiz.innerHTML = `
        <div class="examen-page o-contenedor o-pila o-pila--lg">
          <div class="o-pila">
            <div class="o-flecha o-flecha--between o-flecha--centro">
              <div>
                <h2 class="u-mb-0">${window.helpers.escapeHtml(examen.titulo)}</h2>
                ${examen.descripcion ? `<p class="u-color-texto-secundario u-fs-sm u-mt-1">${window.helpers.escapeHtml(examen.descripcion)}</p>` : ''}
              </div>
              <span class="u-fs-xs u-color-texto-terciario" style="white-space:nowrap">${preguntas.length} preguntas</span>
            </div>
            <div class="examen-progreso u-mt-2">
              <div class="examen-progreso__lleno" id="barraProgresoExamen" style="width:${porcentaje}%"></div>
            </div>
            <p class="u-fs-xs u-color-texto-terciario" id="contadorProgreso">${respondidas}/${preguntas.length} respondidas</p>
          </div>
          <div id="preguntasExamen" class="o-pila examen-sin-paginar"></div>
          <div class="examen-paginado" id="examenPaginado">
            <div class="examen-dots" id="examenDots"></div>
            <div id="preguntasPagina"></div>
            <div class="examen-nav">
              <button class="btn-secundario examen-nav__btn" id="btnAnterior">${window.Iconos.render('chevron-left')} Anterior</button>
              <span class="u-fs-xs u-color-texto-terciario" id="paginacionInfo">1/${preguntas.length}</span>
              <button class="btn-secundario examen-nav__btn" id="btnSiguiente">Siguiente ${window.Iconos.render('chevron-right')}</button>
            </div>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnEntregar">Entregar examen</button>
          </div>
        </div>`;

      const cont = raiz.querySelector('#preguntasExamen');
      cont.innerHTML = preguntas.map((p, i) => this._renderPregunta(p, respuestas[p.id], i)).join('');

      const paginaCont = raiz.querySelector('#preguntasPagina');
      const dotsCont = raiz.querySelector('#examenDots');
      let pagActual = 0;
      let _autoTimer = null;

      const _actualizarDots = () => {
        dotsCont.querySelectorAll('.examen-dot').forEach((d, di) => {
          const p = preguntas[di];
          d.classList.toggle('examen-dot--respondida', this._tieneRespuesta(respuestas, p));
        });
      };

      const _syncPaginaRespuestas = () => {
        if (!paginaCont) return;
        preguntas.forEach(p => {
          const val = this._obtenerValorRespuesta(paginaCont, p);
          if (val !== undefined) respuestas[p.id] = val;
        });
        preguntas.forEach(p => {
          const val = this._obtenerValorRespuesta(cont, p);
          if (val !== undefined) respuestas[p.id] = val;
        });
        _actualizarDots();
      };

      const actualizarBarra = () => {
        preguntas.forEach(p => {
          const valP = this._obtenerValorRespuesta(paginaCont, p);
          const valD = this._obtenerValorRespuesta(cont, p);
          if (valP !== undefined) respuestas[p.id] = valP;
          if (valD !== undefined) respuestas[p.id] = valD;
        });
        const count = preguntas.filter(p => this._tieneRespuesta(respuestas, p)).length;
        const barra = raiz.querySelector('#barraProgresoExamen');
        const texto = raiz.querySelector('#contadorProgreso');
        if (barra) barra.style.width = `${Math.round((count / preguntas.length) * 100)}%`;
        if (texto) texto.textContent = `${count}/${preguntas.length} respondidas`;
        _actualizarDots();
      };

      const guardarYActualizarBarra = () => {
        _syncPaginaRespuestas();
        this._guardarRespuesta(cont, intento, preguntas, usuario);
        actualizarBarra();
      };

      const renderPagina = (idx) => {
        pagActual = idx;
        const p = preguntas[idx];
        const rActual = respuestas[p.id] !== undefined ? respuestas[p.id] : '';
        paginaCont.innerHTML = `<div class="pregunta-examen" data-pid="${p.id}">${this._renderPreguntaInner(p, rActual, idx)}</div>`;
        const nuevaPreg = paginaCont.firstElementChild;
        if (nuevaPreg && window.animaciones) window.animaciones.animar(nuevaPreg, 'anim-pregunta-entrar', 200);
        if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
        paginaCont.querySelectorAll('input[type="radio"]').forEach(el => {
          el.addEventListener('change', () => {
            guardarYActualizarBarra();
            if (idx < preguntas.length - 1) {
              _autoTimer = setTimeout(() => { renderPagina(idx + 1); }, 1200);
            }
          });
        });
        paginaCont.querySelectorAll('input, select, textarea').forEach(el => {
          el.addEventListener('change', guardarYActualizarBarra);
          if (el.tagName === 'INPUT' && el.type !== 'hidden') el.addEventListener('input', actualizarBarra);
        });
        paginaCont.querySelectorAll('.btn-ordenar-up').forEach(btn => this._setupOrdenar(btn, paginaCont, guardarYActualizarBarra));
        paginaCont.querySelectorAll('.btn-ordenar-down').forEach(btn => this._setupOrdenar(btn, paginaCont, guardarYActualizarBarra));
        dotsCont.querySelectorAll('.examen-dot').forEach((d, di) => {
          d.classList.toggle('examen-dot--activa', di === idx);
        });
        raiz.querySelector('#btnAnterior').disabled = idx === 0;
        raiz.querySelector('#btnSiguiente').textContent = idx === preguntas.length - 1 ? 'Entregar' : 'Siguiente →';
        raiz.querySelector('#paginacionInfo').textContent = `${idx + 1}/${preguntas.length}`;
        window.Iconos?.actualizar?.();
      };

      preguntas.forEach((p, i) => {
        const dot = document.createElement('button');
        dot.className = 'examen-dot';
        dot.setAttribute('aria-label', `Pregunta ${i + 1}`);
        if (this._tieneRespuesta(respuestas, p)) dot.classList.add('examen-dot--respondida');
        dot.addEventListener('click', () => {
          _syncPaginaRespuestas();
          renderPagina(i);
        });
        dotsCont.appendChild(dot);
      });

      raiz.querySelector('#btnAnterior').addEventListener('click', () => {
        if (pagActual > 0) { _syncPaginaRespuestas(); renderPagina(pagActual - 1); }
      });
      raiz.querySelector('#btnSiguiente').addEventListener('click', () => {
        _syncPaginaRespuestas();
        if (pagActual < preguntas.length - 1) {
          renderPagina(pagActual + 1);
        } else {
          raiz.querySelector('#btnEntregar').click();
        }
      });

      if (window.gestosNavegacion) {
        window.gestosNavegacion.initGestosNavegacion(raiz, {
          onIzquierda: () => {
            _syncPaginaRespuestas();
            if (pagActual < preguntas.length - 1) renderPagina(pagActual + 1);
            else raiz.querySelector('#btnEntregar').click();
          },
          onDerecha: () => {
            if (pagActual > 0) { _syncPaginaRespuestas(); renderPagina(pagActual - 1); }
          },
        });
      }

      renderPagina(0);

      cont.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', guardarYActualizarBarra);
        if (el.tagName === 'INPUT' && el.type !== 'hidden') el.addEventListener('input', actualizarBarra);
      });
      cont.querySelectorAll('.btn-ordenar-up').forEach(btn => this._setupOrdenar(btn, cont, guardarYActualizarBarra));
      cont.querySelectorAll('.btn-ordenar-down').forEach(btn => this._setupOrdenar(btn, cont, guardarYActualizarBarra));

      raiz.querySelector('#btnEntregar').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Estás seguro de entregar el examen? No podrás cambiar las respuestas después.', { titulo: 'Entregar examen', textoConfirmar: 'Entregar' });
        if (!ok) return;
        try {
          this._guardarRespuesta(cont, intento, preguntas, usuario);
          const respuestasFinales = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
          const resultado = window.puntuacionExamen.calcularPuntuacion(respuestasFinales, preguntas);
          const esLibre = preguntas.some(p => p.tipo === 'texto_largo');
          await window.examenesRepository.guardarIntento({
            id: intento.id, examen_id: examen.id, alumno_id: usuario.id,
            respuestas: JSON.stringify(respuestasFinales),
            puntuacion: resultado.porcentaje,
            estado: esLibre ? 'completado' : 'calificado',
            nota: esLibre ? null : resultado.nota,
            corregido: !esLibre,
            fecha_completado: new Date().toISOString()
          });
          try { await window.adminRepository.registrarAuditoria('examen:entregar', `Examen "${examen.titulo}"`, usuario.id, usuario.grupo_id); } catch (e) { console.warn('Auditoría no registrada:', e.message); }
          if (window.haptica) window.haptica.logro();
          window.helpers.mostrarAlerta('Examen entregado correctamente.', 'exito');
          router.navegar('/examenes');
        } catch (e) {
          window.helpers.mostrarAlerta('Error al entregar: ' + e.message, 'error');
        }
      };

      _cleanup = () => {
        if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
        raiz.querySelector('#btnEntregar').onclick = null;
      };
    },

    _renderPregunta(p, rActual, i) {
      return `<div class="pregunta-examen" data-pid="${p.id}">
        <p class="pregunta-examen__texto"><span class="pregunta-examen__numero">${i + 1}</span> ${window.helpers.escapeHtml(p.texto)}</p>
        <div class="pregunta-examen__opciones">${this._renderRespuesta(p, rActual, i)}</div>
      </div>`;
    },

    _renderPreguntaInner(p, rActual, i) {
      return `<p class="pregunta-examen__texto"><span class="pregunta-examen__numero">${i + 1}</span> ${window.helpers.escapeHtml(p.texto)}</p>
        <div class="pregunta-examen__opciones">${this._renderRespuesta(p, rActual, i)}</div>`;
    },

    _tieneRespuesta(respuestas, pregunta) {
      const r = respuestas[pregunta.id];
      if (r === undefined || r === '') return false;
      if (Array.isArray(r)) return r.some(v => v !== '' && v !== undefined);
      return true;
    },

    _renderResultados(raiz, examen, preguntas, intento, usuario) {
      const usuarioEsProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      if (!usuarioEsProfesor && intento.corregido) {
        try {
          const key = 'fb_examen_corregido_' + intento.id;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            if (window.notifications) {
              window.notifications.notificarCalificacion(examen.titulo, intento.nota != null ? intento.nota : null);
            }
          }
        } catch (e) {}
      }
      if (!usuarioEsProfesor && examen.publicado === false && intento.corregido === false) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
      }
      const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      const correccionMap = (intento.correccion && typeof intento.correccion === 'string') ? JSON.parse(intento.correccion) : (intento.correccion || {});
      const esLibre = preguntas.some(p => p.tipo === 'texto_largo');
      const correccionVisible = intento.corregido || !esLibre;
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, respuestas, correccionMap);
      if (window.haptica && correccionVisible && calculo.aciertos < preguntas.length) {
        window.haptica.fallo();
      }
      const nota = intento.corregido && intento.nota != null
        ? `<p class="u-fw-700" style="font-size:1.25rem;color:${intento.nota >= 7 ? 'var(--color-exito)' : 'var(--color-error)'}">Nota: ${intento.nota}/10</p>`
        : `<p class="u-fw-600">Aciertos: ${calculo.aciertos}/${preguntas.length} (${calculo.porcentaje}%)</p>`;
      const estadoTexto = intento.corregido ? 'Corregido' : (esLibre ? 'Pendiente de calificación' : 'Calificado automáticamente');
      raiz.innerHTML = `
        <div class="examen-page o-contenedor o-pila o-pila--lg anim-exito">
          <div class="o-flecha o-flecha--between">
            <button class="btn-secundario" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
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
      const cont = raiz.querySelector('#desgloseResultados');
      cont.innerHTML = preguntas.map((p, i) => {
        const rUser = respuestas[p.id] !== undefined ? respuestas[p.id] : '(sin respuesta)';
        const corr = correccionMap[p.id];
        let esCorrecta;
        if (corr && corr.es_correcta !== undefined && corr.es_correcta !== null) {
          esCorrecta = !!corr.es_correcta;
        } else {
          esCorrecta = window.puntuacionExamen.esCorrectaPregunta(respuestas[p.id], p);
        }
        const mostrarCheck = p.tipo !== 'texto_largo' ? (esCorrecta ? window.Iconos.render('check') : window.Iconos.render('x')) : '';
        let respuestaUsuarioHtml;
        if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos)) {
          respuestaUsuarioHtml = this._renderResultadoCompletar(p, respuestas[p.id]);
        } else if (['multiple', 'verdadero_falso', 'varias_opciones', 'opcion_unica', 'relacionar', 'ordenar'].includes(p.tipo)) {
          respuestaUsuarioHtml = this._textoOpcion(p, rUser);
        } else {
          respuestaUsuarioHtml = window.helpers.escapeHtml(String(rUser));
        }
        let correctaHtml = '';
        if (!esCorrecta) {
          if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos)) {
            correctaHtml = this._renderRespuestaCorrectaCompletar(p);
          } else {
            correctaHtml = window.helpers.escapeHtml(this._textoOpcion(p, p.respuesta_correcta));
          }
        }
        const pts = corr && corr.puntos != null ? corr.puntos : (esCorrecta ? window.puntuacionExamen.puntosPregunta(p) : 0);
        const ptsTotal = window.puntuacionExamen.puntosPregunta(p);
        return `<div class="pregunta-examen examen-resultado examen-resultado--${esCorrecta ? 'correcta' : 'incorrecta'}">
          <p class="pregunta-examen__texto"><span class="pregunta-examen__numero">${i + 1}</span> ${window.helpers.escapeHtml(p.texto)}</p>
          <div class="u-fs-sm u-mt-1">Tu respuesta: <strong>${respuestaUsuarioHtml}</strong> ${mostrarCheck}</div>
          ${!esCorrecta ? `<div class="u-fs-sm u-color-texto-secundario u-mt-1">Correcta: ${correctaHtml}</div>` : ''}
          ${p.explicacion ? `<div class="u-fs-xs u-color-texto-terciario u-mt-1" style="padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">${window.helpers.escapeHtml(p.explicacion)}</div>` : ''}
          ${corr && corr.comentario ? `<div class="u-fs-xs u-color-acento u-mt-1">${window.Iconos.render('message-square')} Profesor: ${window.helpers.escapeHtml(corr.comentario)}</div>` : ''}
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">${pts}/${ptsTotal} puntos</p>
        </div>`;
      }).join('');
      window.Iconos.actualizar();
    },

    _renderResultadoCompletar(pregunta, respuesta) {
      const detalle = window.puntuacionExamen.detalleCompletar(respuesta, pregunta);
      if (!detalle) return window.helpers.escapeHtml(String(respuesta || ''));
      const partes = pregunta.texto.split(MARCADOR_RE);
      return partes.map((parte, i) => {
        if (i % 2 === 0) return window.helpers.escapeHtml(parte);
        const hid = parseInt(parte);
        const hIdx = pregunta.huecos.findIndex(h => h.id === hid);
        if (hIdx === -1) return '';
        const d = detalle[hIdx];
        if (!d) return '';
        const clase = d.esCorrecta ? 'pregunta-examen__hueco-input--correcta' : 'pregunta-examen__hueco-input--incorrecta';
        return `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input ${clase}" value="${window.helpers.escapeHtml(d.respuestaUsuario)}" readonly></span>`;
      }).join('');
    },

    _renderRespuestaCorrectaCompletar(pregunta) {
      if (!pregunta.huecos) return '';
      return pregunta.huecos.map((h, i) =>
        `<span class="u-fw-600">${window.helpers.escapeHtml(h.respuesta_correcta)}</span>${i < pregunta.huecos.length - 1 ? ', ' : ''}`
      ).join('');
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
          <label class="examen-opcion${String(oi) === rActual ? ' examen-opcion--seleccionada' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${oi}" ${String(oi) === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'varias_opciones') {
        const seleccionadas = rActual ? (() => { try { return JSON.parse(rActual); } catch(e) { return []; } })() : [];
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="examen-opcion${seleccionadas.includes(oi) ? ' examen-opcion--seleccionada' : ''}">
            <input type="checkbox" data-multi="${pregunta.id}" value="${oi}" ${seleccionadas.includes(oi) ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'verdadero_falso') {
        return ['true', 'false'].map(v => `
          <label class="examen-opcion${v === rActual ? ' examen-opcion--seleccionada' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${v}" ${v === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${v === 'true' ? 'Verdadero' : 'Falso'}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'respuesta_corta') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe tu respuesta..." style="width:100%">`;
      }
      if (pregunta.tipo === 'texto_largo') {
        return `<textarea data-pid="${pregunta.id}" rows="4" placeholder="Escribe tu respuesta detallada..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${window.helpers.escapeHtml(rActual)}</textarea>`;
      }
      if (pregunta.tipo === 'completar') {
        if (pregunta.huecos && Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0) {
          const respArr = Array.isArray(rActual) ? rActual : [];
          return renderizarTextoConHuecos(pregunta.texto, pregunta.huecos, respArr);
        }
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
                ${der.map((d, di) => `<option value="${di}" ${relacion[ri] == di ? 'selected' : ''}>${window.helpers.escapeHtml(d)}</option>`).join('')}
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
              <button type="button" class="btn-ordenar-up examen-ordenar-btn" data-orden="${pregunta.id}" data-pos="${pos}">↑</button>
              <button type="button" class="btn-ordenar-down examen-ordenar-btn" data-orden="${pregunta.id}" data-pos="${pos}">↓</button>
            </div>
          `).join('') + '</div>';
      }
      return '';
    },

    _setupOrdenar(btn, cont, guardarYActualizarBarra) {
      btn.addEventListener('click', () => {
        const preguntaId = btn.dataset.orden;
        const pos = parseInt(btn.dataset.pos);
        const isUp = btn.classList.contains('btn-ordenar-up');
        const inputs = Array.from(cont.querySelectorAll(`input[data-orden="${preguntaId}"]`)).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos));
        const newPos = isUp ? pos - 1 : pos + 1;
        if (newPos < 0 || newPos >= inputs.length) return;
        const temp = inputs[pos].value;
        inputs[pos].value = inputs[newPos].value;
        inputs[newPos].value = temp;
        inputs[pos].dataset.pos = newPos;
        inputs[newPos].dataset.pos = pos;
        guardarYActualizarBarra();
      });
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
      if (pregunta.tipo === 'completar' && pregunta.huecos && Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0) {
        const inputs = cont.querySelectorAll('.pregunta-examen__hueco-input[data-hidx]');
        if (inputs.length === 0) return undefined;
        const arr = new Array(pregunta.huecos.length).fill('');
        inputs.forEach(inp => {
          const hidx = parseInt(inp.dataset.hidx);
          if (!isNaN(hidx) && hidx < arr.length) arr[hidx] = inp.value;
        });
        return arr.some(v => v !== '') ? arr : undefined;
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
          selects.forEach(s => { if (s.value) rel[parseInt(s.dataset.idx)] = parseInt(s.value); });
          respuestas[p.id] = JSON.stringify(rel);
        } else if (p.tipo === 'ordenar') {
          const hiddens = cont.querySelectorAll(`input[data-orden="${p.id}"]`);
          const orden = Array.from(hiddens).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos)).map(h => parseInt(h.value));
          respuestas[p.id] = JSON.stringify(orden);
        } else if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && p.huecos.length > 0) {
          const inputs = cont.querySelectorAll('.pregunta-examen__hueco-input[data-hidx]');
          const arr = new Array(p.huecos.length).fill('');
          inputs.forEach(inp => {
            const hidx = parseInt(inp.dataset.hidx);
            if (!isNaN(hidx) && hidx < arr.length) arr[hidx] = inp.value;
          });
          if (arr.some(v => v !== '')) respuestas[p.id] = arr;
        } else {
          const inp = cont.querySelector(`[data-pid="${p.id}"]`);
          if (inp) respuestas[p.id] = inp.value;
        }
      });
      intento.respuestas = JSON.stringify(respuestas);
      window.examenesRepository.guardarIntento({ id: intento.id, respuestas: intento.respuestas });
    },

    desmontar() {
      if (_cleanup) { _cleanup(); _cleanup = null; }
    }
  };
})();
