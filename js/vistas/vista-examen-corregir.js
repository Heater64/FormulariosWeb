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
        this._renderizar(raiz);
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
          map[p.id] = { es_correcta: null, puntos: 0, comentario: '' };
        } else {
          map[p.id] = { es_correcta: auto, puntos: auto ? pts : 0, comentario: '' };
        }
      });
      return map;
    },

    _renderizar(raiz) {
      const examen = this._examen;
      const preguntas = this._preguntas;
      const intentos = this._intentos;
      const corregidos = intentos.filter(i => i.corregido).length;
      const total = intentos.length;
      const pct = total > 0 ? Math.round((corregidos / total) * 100) : 0;

      raiz.innerHTML = `
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="vista-cabecera corregir-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono" id="btnVolver" aria-label="Volver a exámenes">${window.Iconos.render('arrow-left')}</button>
              <div>
                <h1>${window.Iconos.render('clipboard-check')} Corregir: ${window.helpers.escapeHtml(examen.titulo)} <button class="info-ayuda" data-guia="corregir" aria-label="Guía de corrección">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>

          <div class="corregir-progreso">
            <div class="corregir-progreso__barra"><div class="corregir-progreso__lleno" style="width:${pct}%"></div></div>
            <span class="corregir-progreso__texto">${corregidos}/${total}</span>
          </div>

          <p class="u-fs-xs u-color-texto-secundario" style="margin-bottom:var(--espaciado-md)">${window.Iconos.render('info')} ${preguntas.length} preguntas · Toca un alumno para corregir</p>

          <div id="intentosLista" class="o-pila" style="gap:var(--espaciado-sm)"></div>
        </div>`;

      const cont = raiz.querySelector('#intentosLista');
      if (intentos.length === 0) {
        cont.innerHTML = '<p class="u-color-texto-terciario">No hay intentos para corregir</p>';
      } else {
        cont.innerHTML = intentos.map(int => this._tarjetaAlumno(int, preguntas)).join('');
        if (this._alumnoAbierto) this._renderDetalle(raiz, this._alumnoAbierto, preguntas);
      }

      this._conectarEventos(raiz);
      window.Iconos.actualizar();
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.helpers.registrarGuias(raiz, {
        corregir: ['Corrección', 'Revisa las respuestas de cada alumno y asigna las puntuaciones pendientes.', 'Abre un alumno para corregir sus respuestas y guarda los cambios al terminar.']
      });
    },

    _tarjetaAlumno(int, preguntas) {
      const resp = typeof int.respuestas === 'string' ? JSON.parse(int.respuestas || '{}') : (int.respuestas || {});
      const map = this._correcciones[int.id];
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, resp, map);
      const abierto = this._alumnoAbierto === int.id;
      const nombre = window.helpers.nombreAlumno(int.perfiles);
      const inicial = nombre.charAt(0).toUpperCase();
      const fecha = this._fmtFecha(int.fecha_completado || int.fecha_inicio);
      const nota = int.corregido && int.nota != null ? parseFloat(int.nota) : calculo.nota;
      const notaClase = nota >= 7 ? 'corregir-card__nota--alta' : nota >= 5 ? 'corregir-card__nota--media' : 'corregir-card__nota--baja';
      const foto = int.perfiles?.foto_perfil || '';
      // Solo cuenta como "Corregido" cuando un profesor ha publicado la corrección
      // (intentos antiguos auto-corregidos con corregido_por null siguen pendientes)
      const corregidoPorProfesor = int.corregido && !!int.corregido_por;

      return `
        <div class="corregir-card ${abierto ? 'corregir-card--abierta' : ''}" data-intento="${int.id}">
          <div class="corregir-card__header" data-toggle="${int.id}">
            <div class="corregir-card__avatar">${foto ? `<img src="${window.helpers.escapeHtml(foto)}" alt="">` : inicial}</div>
            <div class="corregir-card__info">
              <span class="corregir-card__nombre">${window.helpers.escapeHtml(nombre)}</span>
              <span class="corregir-card__fecha">${fecha}</span>
            </div>
            <span class="corregir-card__nota ${notaClase}" id="preview_${int.id}">${nota.toFixed(1)}</span>
            <span class="corregir-card__badge ${corregidoPorProfesor ? 'corregir-card__badge--corregido' : 'corregir-card__badge--pendiente'}">${corregidoPorProfesor ? 'Corregido' : 'Pendiente'}</span>
            <span class="corregir-card__chevron">${window.Iconos.render('chevron-down')}</span>
          </div>
          <div class="corregir-card__detalle" id="detalle_${int.id}"></div>
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
        ${preguntas.map((p, pi) => this._preguntaCorreccion(p, pi, resp[p.id], map[p.id], intentoId)).join('')}
        <div class="corregir-final">
          <div>
            <p class="corregir-final__label">Comentario general</p>
            <textarea class="corregir-final__comentario" id="obs_${intentoId}" rows="2" placeholder="Observaciones para el alumno...">${window.helpers.escapeHtml(int.observaciones || '')}</textarea>
          </div>
          <div class="corregir-final__nota-row">
            <span class="u-fs-sm u-fw-600">Nota final:</span>
            <input type="number" class="corregir-final__nota-input" id="nota_${intentoId}" value="${int.corregido && int.nota != null ? int.nota : window.puntuacionExamen.calcularConCorreccion(preguntas, resp, map).nota}" min="0" max="10" step="0.25">
            <span class="u-fs-sm u-color-texto-terciario">/ 10</span>
            <button class="corregir-final__btn-enviar btn-calificar" data-intento="${intentoId}">${window.Iconos.render('send')} Enviar corrección</button>
          </div>
        </div>`;

      this._conectarDetalle(int, raiz);
      window.Iconos.actualizar();
    },

    _preguntaCorreccion(p, idx, rUser, corr, intentoId) {
      const pts = window.puntuacionExamen.puntosPregunta(p);
      let rUserHtml;
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && p.huecos.length > 0) {
        rUserHtml = this._renderCompletarCorreccion(p, rUser);
      } else {
        rUserHtml = window.helpers.escapeHtml(this._formatearRespuesta(p, rUser));
      }
      let correctaHtml = '';
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos) && p.huecos.length > 0) {
        correctaHtml = `<p class="corregir-pregunta__correcta">Correctas: ${p.huecos.map(h => window.helpers.escapeHtml(h.respuesta_correcta)).join(', ')}</p>`;
      } else if (p.tipo === 'respuesta_corta' || p.tipo === 'completar') {
        correctaHtml = `<p class="corregir-pregunta__correcta">Correcta: ${window.helpers.escapeHtml(p.respuesta_correcta)}</p>`;
      }

      const toggleAuto = corr.es_correcta === null ? 'corregir-toggle__btn--auto' : '';
      const toggleCorrecta = corr.es_correcta === true ? 'corregir-toggle__btn--correcta' : '';
      const toggleIncorrecta = corr.es_correcta === false ? 'corregir-toggle__btn--incorrecta' : '';

      const titulo = p.tipo === 'completar' ? 'Completa la frase:' : window.helpers.escapeHtml(p.texto);
      return `
        <div class="corregir-pregunta" data-pid="${p.id}">
          <div class="corregir-pregunta__numero">
            <span class="corregir-pregunta__num">${idx + 1}</span>
            <p class="corregir-pregunta__texto">${titulo}</p>
          </div>
          <div class="corregir-pregunta__respuesta">${rUserHtml || '<em style="color:var(--color-texto-terciario)">Sin respuesta</em>'}</div>
          ${correctaHtml}
          <div class="corregir-pregunta__acciones">
            <div class="corregir-toggle" data-pid="${p.id}">
              <button class="corregir-toggle__btn ${toggleAuto}" data-campo="estado" data-valor="auto" data-pid="${p.id}">Auto</button>
              <button class="corregir-toggle__btn ${toggleCorrecta}" data-campo="estado" data-valor="si" data-pid="${p.id}">${window.Iconos.render('check')} Correcta</button>
              <button class="corregir-toggle__btn ${toggleIncorrecta}" data-campo="estado" data-valor="no" data-pid="${p.id}">${window.Iconos.render('x')} Incorrecta</button>
            </div>
            <div class="corregir-puntos">
              <button class="corregir-puntos__btn" data-puntos-minus="${p.id}">−</button>
              <span class="corregir-puntos__valor" data-puntos-valor="${p.id}">${corr.puntos}</span>
              <button class="corregir-puntos__btn" data-puntos-plus="${p.id}">+</button>
              <span class="corregir-puntos__total">/ ${pts}</span>
            </div>
          </div>
          <input type="text" class="corregir-pregunta__comentario" data-campo="comentario" data-pid="${p.id}" value="${window.helpers.escapeHtml(corr.comentario || '')}" placeholder="Comentario para esta pregunta...">
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

    _conectarEventos(raiz) {
      raiz.querySelector('#btnVolver').onclick = () => router.irAtras();

      raiz.querySelectorAll('[data-toggle]').forEach(header => {
        header.onclick = () => {
          const id = header.getAttribute('data-toggle');
          if (this._alumnoAbierto === id) {
            this._alumnoAbierto = null;
          } else {
            this._alumnoAbierto = id;
          }
          this._renderizar(raiz);
        };
      });
    },

    _conectarDetalle(int, raiz) {
      const id = int.id;

      raiz.querySelectorAll(`.corregir-toggle[data-pid] .corregir-toggle__btn`).forEach(btn => {
        btn.onclick = () => {
          const pid = btn.dataset.pid;
          const valor = btn.dataset.valor;
          if (valor === 'auto') this._correcciones[id][pid].es_correcta = null;
          else if (valor === 'si') this._correcciones[id][pid].es_correcta = true;
          else if (valor === 'no') this._correcciones[id][pid].es_correcta = false;
          this._recalcular(id, raiz);
          const toggle = btn.closest('.corregir-toggle');
          toggle.querySelectorAll('.corregir-toggle__btn').forEach(b => {
            b.classList.remove('corregir-toggle__btn--auto', 'corregir-toggle__btn--correcta', 'corregir-toggle__btn--incorrecta');
          });
          if (valor === 'auto') btn.classList.add('corregir-toggle__btn--auto');
          else if (valor === 'si') btn.classList.add('corregir-toggle__btn--correcta');
          else if (valor === 'no') btn.classList.add('corregir-toggle__btn--incorrecta');
        };
      });

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

      raiz.querySelectorAll(`.corregir-pregunta__comentario[data-campo="comentario"]`).forEach(input => {
        input.addEventListener('change', (e) => {
          const pid = e.target.dataset.pid;
          this._correcciones[id][pid].comentario = e.target.value;
        });
      });

      raiz.querySelector('.btn-calificar[data-intento="' + id + '"]').onclick = async () => {
        const btn = raiz.querySelector('.btn-calificar[data-intento="' + id + '"]');
        if (btn) btn.disabled = true;
        const nota = parseFloat(raiz.querySelector('#nota_' + id)?.value || 0);
        const obs = raiz.querySelector('#obs_' + id)?.value || '';
        try {
          await window.examenesRepository.calificar(id, Math.min(10, Math.max(0, nota)), obs, this._usuario.id, this._correcciones[id]);
          await window.adminRepository?.registrarAuditoria('examen:calificar', `Examen "${this._examen.titulo}" nota: ${nota}`, this._usuario.id, this._usuario.grupo_id);

          // Guardar nota del alumno en notas del profesor
          const nombreAlumno = window.helpers.nombreAlumno(int.perfiles);
          try {
            await window.notasRepository?.crearPersonal(this._usuario.id, {
              titulo: `📝 ${nombreAlumno} — ${this._examen.titulo}`,
              contenido: `Nota: ${nota}/10\n\n${obs ? 'Observaciones: ' + obs + '\n\n' : ''}Examen: ${this._examen.titulo}\nAlumno: ${nombreAlumno}\nFecha: ${new Date().toLocaleDateString('es-ES')}`
            });
          } catch (noteErr) { /* notas offline o no disponible */ }

          // Notificar al alumno vía Notification Service (persiste + entrega)
          const intentoNotif = (this._intentos || []).find(i => i.id === id);
          if (intentoNotif && intentoNotif.alumno_id && window.notificationService) {
            window.notificationService.emitir('examen.corregido', {
              examenId: this._examen.id,
              titulo: this._examen.titulo,
              nota,
              destinatarios: [intentoNotif.alumno_id],
              datos: { examen_id: this._examen.id, alumno_id: intentoNotif.alumno_id }
            }).catch(e => console.warn('[Notif] calificación:', e.message));
          }

          window.helpers.mostrarAlerta('Corrección enviada. El alumno puede ver sus resultados.', 'exito');
          router._ejecutar();
        } catch (e) {
          window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
          if (btn) btn.disabled = false;
        }
      };
    },

    _recalcular(id, raiz) {
      const preguntas = this._preguntas;
      const respuestas = this._respuestasDe(id);
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, respuestas, this._correcciones[id]);
      const prev = raiz.querySelector('#preview_' + id);
      if (prev) {
        prev.textContent = calculo.nota.toFixed(1);
        prev.className = 'corregir-card__nota ' + (calculo.nota >= 7 ? 'corregir-card__nota--alta' : calculo.nota >= 5 ? 'corregir-card__nota--media' : 'corregir-card__nota--baja');
      }
      const notaInput = raiz.querySelector('#nota_' + id);
      if (notaInput && document.activeElement !== notaInput) notaInput.value = calculo.nota;
    },

    _respuestasDe(id) {
      const intento = (this._intentos || []).find(i => i.id === id);
      if (intento) return typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      return {};
    },

    _fmtFecha(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) + ', ' + hh + ':' + mm;
    },

    _formatearRespuesta(p, rUser) {
      if (rUser === undefined || rUser === null || rUser === '') return '(sin respuesta)';
      if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
        const idx = parseInt(rUser, 10);
        return (p.opciones && p.opciones[idx] !== undefined) ? p.opciones[idx] : String(rUser);
      }
      if (p.tipo === 'verdadero_falso') return rUser === 'true' ? 'Verdadero' : rUser === 'false' ? 'Falso' : String(rUser);
      if (p.tipo === 'varias_opciones') {
        try { const arr = JSON.parse(rUser); if (Array.isArray(arr)) return arr.map(i => p.opciones?.[i] || i).join(', '); } catch (e) {}
        return String(rUser);
      }
      if (p.tipo === 'relacionar') {
        try { const rel = JSON.parse(rUser); const mit = Math.ceil((p.opciones || []).length / 2); return Object.entries(rel).map(([k, v]) => `${p.opciones[Number(k)] || k} → ${p.opciones[mit + Number(v)] || v}`).join(' | '); } catch (e) {}
        return String(rUser);
      }
      if (p.tipo === 'ordenar') {
        try { const arr = JSON.parse(rUser); if (Array.isArray(arr)) return arr.map(i => p.opciones?.[i] || i).join(' → '); } catch (e) {}
        return String(rUser);
      }
      return String(rUser);
    }
  };
})();
