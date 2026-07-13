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
        this._examen = examen;
        this._preguntas = preguntas;
        this._usuario = usuario;
        this._intentos = intentos;
        this._correcciones = {};
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
        const auto = window.puntuacionExamen.esCorrecta(resp[p.id], p.respuesta_correcta, p.tipo);
        const prev = guardado[p.id] || {};
        if (prev.es_correcta !== undefined && prev.es_correcta !== null) {
          map[p.id] = { es_correcta: prev.es_correcta, puntos: prev.puntos != null ? prev.puntos : (prev.es_correcta ? pts : 0), comentario: prev.comentario || '' };
        } else if (p.tipo === 'respuesta_corta' || p.tipo === 'completar') {
          map[p.id] = { es_correcta: null, puntos: 0, comentario: '' };
        } else {
          map[p.id] = { es_correcta: auto, puntos: auto ? pts : 0, comentario: '' };
        }
      });
      return map;
    },
    _renderizar(raiz, examen, preguntas, intentos, usuario) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <div class="o-flecha o-flecha--between">
            <button class="btn-secundario" onclick="router.irAtras()">← Volver</button>
            <h3>Corregir: ${window.helpers.escapeHtml(examen.titulo)}</h3>
            <button class="btn-secundario" id="btnExportar" style="font-size:var(--texto-xs)">${window.Iconos.render('download')} CSV</button>
          </div>
          <p class="u-fs-sm u-color-texto-secundario">${intentos.length} intento(s) · ${preguntas.length} preguntas</p>
          <div id="intentosLista" class="o-pila"></div>
        </div>`;
      const cont = raiz.querySelector('#intentosLista');
      if (intentos.length === 0) { cont.innerHTML = '<p class="u-color-texto-terciario">No hay intentos para corregir</p>'; return; }
      cont.innerHTML = intentos.map(int => this._tarjetaIntento(int, preguntas)).join('');
      intentos.forEach(int => this._conectar(int, raiz));
      raiz.querySelector('#btnExportar').onclick = () => this._exportarCSV(intentos, preguntas);
      window.Iconos.actualizar();
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
          : window.puntuacionExamen.esCorrecta(resp[p.id], p.respuesta_correcta, p.tipo);
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
    _textoRespuesta(p, rUser) {
      if (rUser === undefined || rUser === null || rUser === '') return '';
      if (p.tipo === 'multiple') {
        const idx = parseInt(rUser, 10);
        return (p.opciones && p.opciones[idx] !== undefined) ? p.opciones[idx] : String(rUser);
      }
      if (p.tipo === 'verdadero_falso') return rUser === 'true' ? 'Verdadero' : 'Falso';
      return String(rUser);
    },
    _tarjetaIntento(int, preguntas) {
      const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
      const map = this._correcciones[int.id];
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, resp, map);
      return `
        <div class="tarjeta-capitulo ${int.corregido ? 'tarjeta-capitulo--completado' : ''}" data-intento="${int.id}">
            <div class="o-flecha o-flecha--between">
            <span class="u-fw-600">${window.helpers.nombreAlumno(int.perfiles)}</span>
            <span class="u-fs-sm ${int.corregido ? 'u-color-exito' : 'u-color-acento'}">${int.corregido ? window.Iconos.render('check-check') + ' Corregido' : window.Iconos.render('clock') + ' Pendiente'}</span>
          </div>
            <div class="o-flecha o-flecha--between u-mt-1">
            <span class="u-fs-xs u-color-texto-secundario" id="preview_${int.id}">Nota calculada: <strong>${calculo.nota}</strong> (${calculo.aciertos}/${preguntas.length} aciertos)</span>
            <div style="display:flex;gap:var(--espaciado-xs)">
              <button class="btn-secundario btn-exportar-texto" data-intento="${int.id}" style="font-size:var(--texto-xs)">${window.Iconos.render('file-text')} Exportar</button>
              <button class="btn-secundario btn-ver-detalle" data-intento="${int.id}" style="font-size:var(--texto-xs)">${int.corregido ? 'Ver / editar' : 'Corregir'}</button>
            </div>
          </div>
          <div class="o-pila u-mt-2" id="detalle_${int.id}" style="${int.corregido ? 'display:none' : ''}">
            ${preguntas.map((p, pi) => this._preguntaCorreccion(p, pi, resp[p.id], map[p.id])).join('')}
            <textarea id="obs_${int.id}" rows="2" placeholder="Observaciones generales...">${int.observaciones || ''}</textarea>
            <div class="o-flecha" style="gap:var(--espaciado-sm)">
              <label class="u-fs-sm u-color-texto-secundario">Nota final:
                <input type="number" id="nota_${int.id}" value="${int.corregido && int.nota != null ? int.nota : calculo.nota}" min="0" max="10" step="0.01" style="width:80px">
              </label>
              <span class="u-fs-sm">/ 10</span>
              <button class="btn-primario btn-calificar" data-intento="${int.id}" style="margin-left:auto">Guardar calificación</button>
            </div>
          </div>
        </div>`;
    },
    _preguntaCorreccion(p, idx, rUser, corr) {
      const pts = window.puntuacionExamen.puntosPregunta(p);
      const rUserTxt = p.tipo === 'multiple'
        ? (rUser !== undefined && p.opciones && p.opciones[parseInt(rUser, 10)] !== undefined ? p.opciones[parseInt(rUser, 10)] : '(sin respuesta)')
        : p.tipo === 'verdadero_falso' ? (rUser === 'true' ? 'Verdadero' : rUser === 'false' ? 'Falso' : '(sin respuesta)')
        : (rUser !== undefined ? rUser : '(sin respuesta)');
      const sel = (v) => (String(corr.es_correcta) === v ? 'selected' : '');
      return `
        <div class="u-fs-sm u-mb-1" style="padding:var(--espaciado-xs);background:var(--color-fondo);border-radius:var(--radio-sm);border-left:3px solid ${corr.es_correcta === true ? 'var(--color-exito)' : corr.es_correcta === false ? 'var(--color-error)' : 'var(--color-borde)'}">
          <p class="u-fw-600">${idx + 1}. ${window.helpers.escapeHtml(p.texto)}</p>
          <p>Respuesta: <strong>${window.helpers.escapeHtml(String(rUserTxt))}</strong></p>
          ${(p.tipo === 'respuesta_corta' || p.tipo === 'completar') ? `<p class="u-fs-xs u-color-texto-terciario">Correcta sugerida: ${window.helpers.escapeHtml(p.respuesta_correcta)}</p>` : ''}
          <div class="o-flecha" style="gap:var(--espaciado-sm);flex-wrap:wrap;margin-top:4px">
            <label class="u-fs-xs">Corrección:
              <select data-campo="estado" data-pid="${p.id}">
                <option value="" ${sel('null')}>Automática</option>
                <option value="si" ${sel('true')}>Correcta</option>
                <option value="no" ${sel('false')}>Incorrecta</option>
              </select>
            </label>
            <label class="u-fs-xs">Puntos:
              <input type="number" data-campo="puntos" data-pid="${p.id}" min="0" max="${pts}" step="0.01" value="${corr.puntos}" style="width:64px">
            </label>
          </div>
          <input type="text" data-campo="comentario" data-pid="${p.id}" value="${window.helpers.escapeHtml(corr.comentario || '')}" placeholder="Comentario para el alumno..." style="width:100%;margin-top:4px">
        </div>`;
    },
    _conectar(int, raiz) {
      const id = int.id;
      const det = raiz.querySelector('#detalle_' + id);
      raiz.querySelector('.btn-ver-detalle[data-intento="' + id + '"]').onclick = () => {
        det.style.display = det.style.display === 'none' ? 'block' : 'none';
      };
      const btnExportar = raiz.querySelector('.btn-exportar-texto[data-intento="' + id + '"]');
      if (btnExportar) btnExportar.onclick = () => this._exportarTexto(int, this._preguntas);
      det.addEventListener('change', (e) => {
        const el = e.target.closest('[data-campo]');
        if (!el) return;
        const pid = el.dataset.pid;
        const campo = el.dataset.campo;
        if (campo === 'estado') {
          const v = el.value;
          this._correcciones[id][pid].es_correcta = v === '' ? null : (v === 'si');
        } else if (campo === 'puntos') {
          this._correcciones[id][pid].puntos = parseFloat(el.value) || 0;
        } else if (campo === 'comentario') {
          this._correcciones[id][pid].comentario = el.value;
        }
        this._recalcular(id, raiz);
      });
      raiz.querySelector('.btn-calificar[data-intento="' + id + '"]').onclick = async () => {
        const nota = parseFloat(raiz.querySelector('#nota_' + id)?.value || 0);
        const obs = raiz.querySelector('#obs_' + id)?.value || '';
        await window.examenesRepository.calificar(id, Math.min(10, Math.max(0, nota)), obs, this._usuario.id, this._correcciones[id]);
        await window.adminRepository.registrarAuditoria('examen:calificar', `Examen "${this._examen.titulo}" nota: ${nota}`, this._usuario.id, this._usuario.grupo_id);
        router._ejecutar();
      };
    },
    _recalcular(id, raiz) {
      const preguntas = this._preguntas;
      const respuestas = this._respuestasDe(id);
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, respuestas, this._correcciones[id]);
      const prev = raiz.querySelector('#preview_' + id);
      if (prev) prev.innerHTML = `Nota calculada: <strong>${calculo.nota}</strong> (${calculo.aciertos}/${preguntas.length} aciertos)`;
      const notaInput = raiz.querySelector('#nota_' + id);
      if (notaInput && document.activeElement !== notaInput) notaInput.value = calculo.nota;
    },
    _respuestasDe(id) {
      const intento = (this._intentos || []).find(i => i.id === id);
      if (intento) return typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      return {};
    }
  };
})();
