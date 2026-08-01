(function() {
  'use strict';
  window.vistaExamenCorregir = {
    _alumnoAbierto: null,

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      if (!params || !params.id) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no especificado</p></div>'; return; }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando intentos...</p></div>';
      try {
        const examen = await window.examenesRepository.obtener(params.id);
        const intentos = await window.examenesRepository.obtenerIntentos(params.id);
        const preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : (examen.preguntas || []);
        this._examen = examen;
        this._preguntas = preguntas;
        this._usuario = usuario;
        this._intentos = intentos;
        this._correcciones = {};
        this._alumnoAbierto = null;
        intentos.forEach(int => { this._correcciones[int.id] = this._inicializar(int, preguntas); });
        this._renderizar(raiz, examen, preguntas, intentos, usuario);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    _inicializar(intento, preguntas) {
      const resp = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      const guardado = (intento.correccion && typeof intento.correccion === 'string') ? JSON.parse(intento.correccion) : (intento.correccion || {});
      const map = {};
      preguntas.forEach(p => {
        const pts = window.puntuacionExamen.puntosPregunta(p);
        const auto = window.puntuacionExamen.esCorrectaPregunta(resp[p.id], p);
        const prev = guardado[p.id] || {};
        if (prev.es_correcta !== undefined && prev.es_correcta !== null) {
          map[p.id] = { es_correcta: prev.es_correcta, puntos: prev.puntos != null ? prev.puntos : (prev.es_correcta ? pts : 0), comentario: prev.comentario || '' };
        } else if (p.tipo === 'respuesta_corta' || p.tipo === 'texto_largo') {
          // Texto libre: siempre corrección manual (nunca auto)
          map[p.id] = { es_correcta: null, puntos: 0, comentario: '' };
        } else {
          map[p.id] = { es_correcta: auto, puntos: auto ? pts : 0, comentario: '' };
        }
      });
      return map;
    },

    _renderizar(raiz, examen, preguntas, intentos, usuario) {
      const corregidos = intentos.filter(i => i.corregido).length;
      const total = intentos.length;
      const pct = total > 0 ? Math.round((corregidos / total) * 100) : 0;

      // Statistics
      const notas = intentos.filter(i => i.corregido && i.nota != null).map(i => i.nota);
      const promedio = notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length) : null;
      const maxNota = notas.length > 0 ? Math.max(...notas) : null;
      const minNota = notas.length > 0 ? Math.min(...notas) : null;
      const distribucion = notas.length > 0
        ? [
            { label: '0-4', min: 0, max: 4, count: notas.filter(n => n < 4).length },
            { label: '4-7', min: 4, max: 7, count: notas.filter(n => n >= 4 && n < 7).length },
            { label: '7-10', min: 7, max: 10, count: notas.filter(n => n >= 7).length },
          ].map(d => ({ ...d, height: Math.max(1, Math.round((d.count / notas.length) * 100)) }))
        : [];

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
            <div>
              <button class="btn-secundario u-fs-xs" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
              <h3 class="u-mt-1">Corregir: ${window.helpers.escapeHtml(examen.titulo)}</h3>
            </div>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              <button class="btn-secundario" id="btnCalificarLote" style="font-size:var(--texto-xs)">${window.Iconos.render('zap')} Auto</button>
              <button class="btn-secundario" id="btnExportar" style="font-size:var(--texto-xs)">${window.Iconos.render('download')} CSV</button>
            </div>
          </div>

          ${notas.length > 0 ? `
          <div class="corregir-estadisticas" style="display:flex;gap:var(--espaciado-sm);flex-wrap:wrap">
            <div class="tarjeta-estadistica" style="flex:1;min-width:90px">
              <div class="tarjeta-estadistica__info">
                <p class="tarjeta-estadistica__valor" style="font-size:var(--texto-lg)">${promedio != null ? promedio.toFixed(1) : '—'}</p>
                <p class="tarjeta-estadistica__etiqueta">Promedio</p>
              </div>
            </div>
            <div class="tarjeta-estadistica" style="flex:1;min-width:90px">
              <div class="tarjeta-estadistica__info">
                <p class="tarjeta-estadistica__valor" style="font-size:var(--texto-lg);color:var(--color-exito)">${maxNota != null ? maxNota.toFixed(1) : '—'}</p>
                <p class="tarjeta-estadistica__etiqueta">Máxima</p>
              </div>
            </div>
            <div class="tarjeta-estadistica" style="flex:1;min-width:90px">
              <div class="tarjeta-estadistica__info">
                <p class="tarjeta-estadistica__valor" style="font-size:var(--texto-lg);color:var(--color-error)">${minNota != null ? minNota.toFixed(1) : '—'}</p>
                <p class="tarjeta-estadistica__etiqueta">Mínima</p>
              </div>
            </div>
            <div class="tarjeta-estadistica" style="flex:1;min-width:90px">
              <div class="tarjeta-estadistica__info">
                <p class="tarjeta-estadistica__valor" style="font-size:var(--texto-lg)">${notas.length}</p>
                <p class="tarjeta-estadistica__etiqueta">Calificados</p>
              </div>
            </div>
            ${distribucion.length > 0 ? `<div class="tarjeta-estadistica" style="flex:2;min-width:150px">
              <div class="tarjeta-estadistica__info">
              <p class="tarjeta-estadistica__etiqueta">Distribución</p>
              <div style="display:flex;gap:4px;align-items:flex-end;height:48px;padding-top:var(--espaciado-xs)">
                ${distribucion.map(d => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="height:${d.height}%;width:100%;border-radius:var(--radio-sm) var(--radio-sm) 0 0;background:${d.min >= 7 ? 'var(--color-exito)' : d.min >= 4 ? 'var(--color-aviso)' : 'var(--color-error)'};opacity:${d.count > 0 ? 1 : 0.3};min-height:4px"></div>
                  <span style="font-size:9px;color:var(--color-texto-terciario)">${d.count}</span>
                </div>`).join('')}
              </div>
              </div>
            </div>` : ''}
          </div>` : ''}

          <div class="corregir-progreso">
            <div class="corregir-progreso__barra">
              <div class="corregir-progreso__lleno" style="width:${pct}%"></div>
            </div>
            <span class="corregir-progreso__texto">${corregidos}/${total} calificados</span>
          </div>

          <div class="corregir-bulk u-fs-xs u-color-texto-secundario">
            ${window.Iconos.render('info')} ${preguntas.length} preguntas · Haz clic en un alumno para calificar
          </div>

          <div id="intentosLista" class="o-pila" style="gap:var(--espaciado-sm)"></div>
        </div>`;

      const cont = raiz.querySelector('#intentosLista');
      if (intentos.length === 0) {
        cont.innerHTML = '<p class="u-color-texto-terciario">No hay intentos para corregir</p>';
        return;
      }

      // Render all accordion headers, but only detail for the open one
      cont.innerHTML = intentos.map(int => this._tarjetaAccordion(int, preguntas)).join('');

      // If one was open, render its detail
      if (this._alumnoAbierto) {
        this._renderDetalle(raiz, this._alumnoAbierto, preguntas);
      }

      this._conectarEventos(raiz, intentos, preguntas);
      window.Iconos.actualizar();
    },

    _tarjetaAccordion(int, preguntas) {
      const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
      const map = this._correcciones[int.id];
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, resp, map);
      const abierto = this._alumnoAbierto === int.id;

      return `
        <div class="corregir-alumno ${abierto ? 'corregir-alumno--abierto' : ''}" data-intento="${int.id}">
          <div class="corregir-alumno__header" data-toggle="${int.id}">
            <span class="corregir-alumno__nombre">${window.helpers.nombreAlumno(int.perfiles)}</span>
            <div class="corregir-alumno__meta">
              <span class="u-fs-xs" id="preview_${int.id}">${calculo.nota}/10</span>
              <span class="corregir-alumno__badge ${int.corregido ? 'corregir-alumno__badge--corregido' : 'corregir-alumno__badge--pendiente'}">
                ${int.corregido ? 'Corregido' : 'Pendiente'}
              </span>
              <span class="u-fs-xs u-color-texto-terciario">${abierto ? window.Iconos.render('chevron-up') : window.Iconos.render('chevron-down')}</span>
            </div>
          </div>
          <div class="corregir-alumno__detalle ${abierto ? 'corregir-alumno__detalle--visible' : ''}" id="detalle_${int.id}">
          </div>
        </div>`;
    },

    _renderDetalle(raiz, intentoId, preguntas) {
      const det = raiz.querySelector('#detalle_' + intentoId);
      if (!det) return;
      const int = this._intentos.find(i => i.id === intentoId);
      if (!int) return;
      const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
      const map = this._correcciones[intentoId];

      det.innerHTML = `
        ${preguntas.map((p, pi) => this._preguntaCorreccion(p, pi, resp[p.id], map[p.id])).join('')}
        <textarea class="corregir-comentario" id="obs_${intentoId}" rows="2" placeholder="Observaciones generales para el alumno...">${int.observaciones || ''}</textarea>
        <div class="corregir-nota-final">
          <span class="u-fs-sm u-fw-600">Nota final:</span>
          <input type="number" id="nota_${intentoId}" value="${int.corregido && int.nota != null ? int.nota : window.puntuacionExamen.calcularConCorreccion(preguntas, resp, map).nota}" min="0" max="10" step="0.01" style="width:72px">
          <span class="u-fs-sm">/ 10</span>
          <button class="btn-primario btn-calificar" data-intento="${intentoId}" style="margin-left:auto">${window.Iconos.render('check')} Guardar</button>
          <button class="btn-secundario btn-exportar-texto" data-intento="${intentoId}" style="font-size:var(--texto-xs)">${window.Iconos.render('file-text')} TXT</button>
        </div>`;

      this._conectarDetalle(int, raiz);
      window.Iconos.actualizar();
    },

    _preguntaCorreccion(p, idx, rUser, corr) {
      const pts = window.puntuacionExamen.puntosPregunta(p);
      let rUserHtml;
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && p.huecos.length > 0) {
        rUserHtml = this._renderCompletarCorreccion(p, rUser);
      } else {
        rUserHtml = window.helpers.escapeHtml(this._formatearRespuesta(p, rUser));
      }
      let correctaHtml = '';
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && p.huecos.length > 0) {
        correctaHtml = `<p class="u-fs-xs u-color-texto-terciario">Respuestas: ${p.huecos.map(h => window.helpers.escapeHtml(h.respuesta_correcta)).join(', ')}</p>`;
      } else if (p.tipo === 'respuesta_corta' || p.tipo === 'completar') {
        correctaHtml = `<p class="u-fs-xs u-color-texto-terciario">Correcta sugerida: ${window.helpers.escapeHtml(p.respuesta_correcta)}</p>`;
      }

      const clase = corr.es_correcta === true ? 'corregir-pregunta--correcta' : corr.es_correcta === false ? 'corregir-pregunta--incorrecta' : '';

      // Toggle buttons for correction state
      const toggleAuto = corr.es_correcta === null ? 'corregir-toggle__btn--activo' : '';
      const toggleCorrecta = corr.es_correcta === true ? 'corregir-toggle__btn--correcta' : '';
      const toggleIncorrecta = corr.es_correcta === false ? 'corregir-toggle__btn--incorrecta' : '';

      return `
        <div class="corregir-pregunta ${clase}" data-pid="${p.id}">
          <p class="corregir-pregunta__texto">${idx + 1}. ${window.helpers.escapeHtml(p.texto)}</p>
          <div class="corregir-pregunta__respuesta">Respuesta: <strong>${rUserHtml}</strong></div>
          ${correctaHtml}
          <div class="corregir-pregunta__acciones">
            <div class="corregir-toggle" data-pid="${p.id}">
              <button class="corregir-toggle__btn ${toggleAuto}" data-campo="estado" data-valor="auto" data-pid="${p.id}">Auto</button>
              <button class="corregir-toggle__btn ${toggleCorrecta}" data-campo="estado" data-valor="si" data-pid="${p.id}">${window.Iconos.render('check')} Correcta</button>
              <button class="corregir-toggle__btn ${toggleIncorrecta}" data-campo="estado" data-valor="no" data-pid="${p.id}">${window.Iconos.render('x')} Incorrecta</button>
            </div>
            <div class="corregir-pregunta__puntos">
              <button class="corregir-pregunta__puntos-btn" data-puntos-minus="${p.id}">−</button>
              <span class="corregir-pregunta__puntos-valor" data-puntos-valor="${p.id}">${corr.puntos}</span>
              <button class="corregir-pregunta__puntos-btn" data-puntos-plus="${p.id}">+</button>
              <span class="u-fs-xs u-color-texto-terciario">/ ${pts}</span>
            </div>
          </div>
          <input type="text" class="corregir-comentario" data-campo="comentario" data-pid="${p.id}" value="${window.helpers.escapeHtml(corr.comentario || '')}" placeholder="Comentario...">
        </div>`;
    },

    _renderCompletarCorreccion(pregunta, respuesta) {
      const MARCADOR_RE = /\{\{HUECO_(\d+)\}\}/g;
      const respArr = Array.isArray(respuesta) ? respuesta : [];
      const detalle = window.puntuacionExamen.detalleCompletar(respuesta, pregunta);
      const partes = pregunta.texto.split(MARCADOR_RE);
      return '<span class="u-fs-sm">' + partes.map((parte, i) => {
        if (i % 2 === 0) return window.helpers.escapeHtml(parte);
        const hid = parseInt(parte);
        const hIdx = pregunta.huecos.findIndex(h => h.id === hid);
        if (hIdx === -1) return '';
        const d = detalle ? detalle[hIdx] : null;
        const clase = d && d.esCorrecta ? 'color:var(--color-exito)' : 'color:var(--color-error)';
        const valor = d ? d.respuestaUsuario : (respArr[hIdx] || '');
        return `<span style="${clase};font-weight:600;border-bottom:2px solid ${d && d.esCorrecta ? 'var(--color-exito)' : 'var(--color-error)'};padding:0 2px">[${window.helpers.escapeHtml(valor || '…')}]</span>`;
      }).join('') + '</span>';
    },

    _conectarEventos(raiz, intentos, preguntas) {
      raiz.querySelector('#btnVolver').onclick = () => router.irAtras();

      raiz.querySelector('#btnExportar').onclick = () => this._exportarCSV(intentos, preguntas);

      // Bulk auto-grade
      raiz.querySelector('#btnCalificarLote').onclick = async () => {
        const ok = await window.helpers.confirmar(
          'Se calificarán automáticamente todos los intentos que solo tengan preguntas auto-graduables. Los intentos con texto libre quedarán pendientes.',
          { titulo: 'Calificación masiva', textoConfirmar: 'Calificar todos' }
        );
        if (!ok) return;
        let calificados = 0;
        for (const int of intentos) {
          const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
          const tieneTextoLibre = preguntas.some(p => p.tipo === 'respuesta_corta' || p.tipo === 'texto_largo');
          if (!tieneTextoLibre && !int.corregido) {
            const calculo = window.puntuacionExamen.calcularPuntuacion(resp, preguntas);
            try {
              await window.examenesRepository.calificar(int.id, calculo.nota, '', this._usuario.id, this._correcciones[int.id]);
              calificados++;
            } catch (e) { /* skip */ }
          }
        }
        window.helpers.mostrarAlerta(`${calificados} intento(s) calificado(s) automáticamente.`, 'exito');
        router._ejecutar();
      };

      // Accordion toggles
      raiz.querySelectorAll('[data-toggle]').forEach(header => {
        header.onclick = () => {
          const id = header.getAttribute('data-toggle');
          if (this._alumnoAbierto === id) {
            this._alumnoAbierto = null;
          } else {
            this._alumnoAbierto = id;
          }
          this._renderizar(raiz, this._examen, this._preguntas, this._intentos, this._usuario);
        };
      });
    },

    _conectarDetalle(int, raiz) {
      const id = int.id;

      // Toggle buttons for correction state
      raiz.querySelectorAll(`.corregir-toggle[data-pid] .corregir-toggle__btn`).forEach(btn => {
        btn.onclick = () => {
          const pid = btn.dataset.pid;
          const valor = btn.dataset.valor;
          if (valor === 'auto') this._correcciones[id][pid].es_correcta = null;
          else if (valor === 'si') this._correcciones[id][pid].es_correcta = true;
          else if (valor === 'no') this._correcciones[id][pid].es_correcta = false;
          this._recalcular(id, raiz);
          // Update toggle visual state
          const toggle = btn.closest('.corregir-toggle');
          toggle.querySelectorAll('.corregir-toggle__btn').forEach(b => {
            b.classList.remove('corregir-toggle__btn--activo', 'corregir-toggle__btn--correcta', 'corregir-toggle__btn--incorrecta');
          });
          if (valor === 'auto') btn.classList.add('corregir-toggle__btn--activo');
          else if (valor === 'si') btn.classList.add('corregir-toggle__btn--correcta');
          else if (valor === 'no') btn.classList.add('corregir-toggle__btn--incorrecta');
          // Update question border color
          const card = btn.closest('.corregir-pregunta');
          if (card) {
            card.classList.remove('corregir-pregunta--correcta', 'corregir-pregunta--incorrecta');
            if (valor === 'si') card.classList.add('corregir-pregunta--correcta');
            else if (valor === 'no') card.classList.add('corregir-pregunta--incorrecta');
          }
        };
      });

      // Points stepper
      raiz.querySelectorAll('[data-puntos-minus]').forEach(btn => {
        btn.onclick = () => {
          const pid = btn.dataset.puntosMinus;
          const pts = window.puntuacionExamen.puntosPregunta(this._preguntas.find(p => p.id === pid));
          this._correcciones[id][pid].puntos = Math.max(0, (this._correcciones[id][pid].puntos || 0) - 1);
          const display = raiz.querySelector(`[data-puntos-valor="${pid}"]`);
          if (display) display.textContent = this._correcciones[id][pid].puntos;
          this._recalcular(id, raiz);
        };
      });
      raiz.querySelectorAll('[data-puntos-plus]').forEach(btn => {
        btn.onclick = () => {
          const pid = btn.dataset.puntosPlus;
          const pts = window.puntuacionExamen.puntosPregunta(this._preguntas.find(p => p.id === pid));
          this._correcciones[id][pid].puntos = Math.min(pts, (this._correcciones[id][pid].puntos || 0) + 1);
          const display = raiz.querySelector(`[data-puntos-valor="${pid}"]`);
          if (display) display.textContent = this._correcciones[id][pid].puntos;
          this._recalcular(id, raiz);
        };
      });

      // Comment changes
      raiz.querySelectorAll(`.corregir-comentario[data-campo="comentario"]`).forEach(input => {
        input.addEventListener('change', (e) => {
          const pid = e.target.dataset.pid;
          this._correcciones[id][pid].comentario = e.target.value;
        });
      });

      // Export text
      const btnExportar = raiz.querySelector('.btn-exportar-texto[data-intento="' + id + '"]');
      if (btnExportar) btnExportar.onclick = () => this._exportarTexto(int, this._preguntas);

      // Save
      raiz.querySelector('.btn-calificar[data-intento="' + id + '"]').onclick = async () => {
        const nota = parseFloat(raiz.querySelector('#nota_' + id)?.value || 0);
        const obs = raiz.querySelector('#obs_' + id)?.value || '';
        try {
          await window.examenesRepository.calificar(id, Math.min(10, Math.max(0, nota)), obs, this._usuario.id, this._correcciones[id]);
          await window.adminRepository.registrarAuditoria('examen:calificar', `Examen "${this._examen.titulo}" nota: ${nota}`, this._usuario.id, this._usuario.grupo_id);
          window.helpers.mostrarAlerta('Calificación guardada.', 'exito');
          router._ejecutar();
        } catch (e) { window.helpers.mostrarAlerta('Error al calificar: ' + e.message, 'error'); }
      };
    },

    _recalcular(id, raiz) {
      const preguntas = this._preguntas;
      const respuestas = this._respuestasDe(id);
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, respuestas, this._correcciones[id]);
      const prev = raiz.querySelector('#preview_' + id);
      if (prev) prev.innerHTML = `${calculo.nota}/10`;
      const notaInput = raiz.querySelector('#nota_' + id);
      if (notaInput && document.activeElement !== notaInput) notaInput.value = calculo.nota;
    },

    _respuestasDe(id) {
      const intento = (this._intentos || []).find(i => i.id === id);
      if (intento) return typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      return {};
    },

    _exportarCSV(intentos, preguntas) {
      const cabeceras = ['alumno', 'nombre_usuario', 'estado', 'nota', 'aciertos', 'total_preguntas', 'corregido'];
      const filas = intentos.map(int => {
        const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
        const calculo = window.puntuacionExamen.calcularPuntuacion(resp, preguntas);
        return {
          alumno: window.helpers.nombreAlumno(int.perfiles),
          nombre_usuario: int.perfiles?.username || '',
          estado: int.estado,
          nota: int.corregido && int.nota != null ? int.nota : '',
          aciertos: calculo.aciertos,
          total_preguntas: preguntas.length,
          corregido: int.corregido ? 'sí' : 'no'
        };
      });
      window.helpers.descargarCSV('notas_' + this._examen.titulo.replace(/[^\w]+/g, '_'), cabeceras, filas);
    },

    _exportarTexto(int, preguntas) {
      const texto = this._textoCorreccion(int, preguntas);
      const nombre = (int.perfiles?.nombre_completo || int.perfiles?.username || 'alumno').replace(/[^\w]+/g, '_');
      window.helpers.descargarTexto('correccion_' + this._examen.titulo.replace(/[^\w]+/g, '_') + '_' + nombre, texto);
    },

    _textoCorreccion(int, preguntas) {
      const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
      const corrMap = (int.correccion && typeof int.correccion === 'string') ? JSON.parse(int.correccion) : (int.correccion || {});
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, resp, corrMap);
      const nota10 = calculo.totalPuntos > 0 ? (calculo.puntosObtenidos / calculo.totalPuntos) * 10 : 0;
      const etiqueta = this._etiquetaNota(nota10);
      const fecha = this._formatearFecha(int.fecha_corregido || int.fecha_completado || int.fecha_inicio);
      const nombre = window.helpers.nombreAlumno(int.perfiles);
      let t = '';
      t += '=== CORRECCIÓN DE EXAMEN ===\n\n';
      t += '📚 Formulario: ' + this._examen.titulo + '\n';
      t += '👤 Estudiante: ' + nombre + '\n';
      t += '📅 Fecha: ' + fecha + '\n\n';
      t += '--- RESULTADOS ---\n';
      t += '📊 Nota: ' + nota10.toFixed(2) + ' / 10\n';
      t += '📊 Calificación: ' + etiqueta + '\n\n';
      t += '--- RESPUESTAS ---\n\n';
      preguntas.forEach((p, i) => {
        const rUser = resp[p.id];
        const rTxt = this._textoRespuesta(p, rUser);
        const c = corrMap[p.id] || {};
        const esCorrecta = c.es_correcta !== undefined && c.es_correcta !== null
          ? !!c.es_correcta
          : window.puntuacionExamen.esCorrectaPregunta(resp[p.id], p);
        const pts = c.puntos != null ? Number(c.puntos) : (esCorrecta ? window.puntuacionExamen.puntosPregunta(p) : 0);
        const ptsTotal = window.puntuacionExamen.puntosPregunta(p);
        t += (i + 1) + '. ' + p.texto + '\n';
        t += '   Respuesta: ' + (rTxt || '(sin respuesta)') + '\n';
        t += '   Puntuación: ' + pts.toFixed(2) + ' / ' + ptsTotal.toFixed(2) + '\n';
        t += '   Estado: ' + (esCorrecta ? '✅ CORRECTA' : '❌ INCORRECTA') + '\n\n';
      });
      t += '--- COMENTARIO ---\n';
      if (int.observaciones) t += int.observaciones + '\n';
      t += 'Corrección manual. Nota: ' + nota10.toFixed(2) + '/10 - ' + etiqueta + '.';
      return t;
    },

    _etiquetaNota(nota10) {
      if (nota10 >= 9) return 'Sobresaliente';
      if (nota10 >= 7) return 'Notable';
      if (nota10 >= 5) return 'Suficiente';
      return 'Insuficiente';
    },

    _formatearFecha(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const dd = d.getDate();
      const mes = meses[d.getMonth()];
      const aa = String(d.getFullYear()).slice(2);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return dd + ' ' + mes + ' ' + aa + ', ' + hh + ':' + mm;
    },

    _formatearRespuesta(p, rUser) {
      if (rUser === undefined || rUser === null || rUser === '') return '(sin respuesta)';
      if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
        const idx = parseInt(rUser, 10);
        return (p.opciones && p.opciones[idx] !== undefined) ? p.opciones[idx] : String(rUser);
      }
      if (p.tipo === 'verdadero_falso') return rUser === 'true' ? 'Verdadero' : rUser === 'false' ? 'Falso' : String(rUser);
      if (p.tipo === 'varias_opciones') {
        try {
          const arr = JSON.parse(rUser);
          if (Array.isArray(arr)) return arr.map(i => p.opciones && p.opciones[i] !== undefined ? p.opciones[i] : i).join(', ');
        } catch (e) {}
        return String(rUser);
      }
      if (p.tipo === 'relacionar') {
        try {
          const rel = JSON.parse(rUser);
          const mit = Math.ceil((p.opciones || []).length / 2);
          return Object.entries(rel).map(([k, v]) => `${p.opciones[Number(k)] || k} → ${p.opciones[mit + Number(v)] || v}`).join(' | ');
        } catch (e) {}
        return String(rUser);
      }
      if (p.tipo === 'ordenar') {
        try {
          const arr = JSON.parse(rUser);
          if (Array.isArray(arr)) return arr.map(i => p.opciones && p.opciones[i] !== undefined ? p.opciones[i] : i).join(' → ');
        } catch (e) {}
        return String(rUser);
      }
      return String(rUser);
    },

    _textoRespuesta(p, rUser) {
      if (rUser === undefined || rUser === null || rUser === '') return '';
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && Array.isArray(rUser)) {
        return p.huecos.map((h, i) => (rUser[i] || '…') + ' → ' + h.respuesta_correcta).join(', ');
      }
      const txt = this._formatearRespuesta(p, rUser);
      return txt === '(sin respuesta)' ? '' : txt;
    }
  };
})();
