(function() {
  'use strict';
  const TIPOS_PREGUNTA = [
    { valor: 'multiple', nombre: 'Opción múltiple', icono: 'list' },
    { valor: 'varias_opciones', nombre: 'Varias opciones', icono: 'check-square' },
    { valor: 'verdadero_falso', nombre: 'Verdadero / Falso', icono: 'toggle-left' },
    { valor: 'respuesta_corta', nombre: 'Respuesta corta', icono: 'type' },
    { valor: 'texto_largo', nombre: 'Párrafo', icono: 'align-left' },
    { valor: 'completar', nombre: 'Completar huecos', icono: 'minus-square' },
    { valor: 'relacionar', nombre: 'Relacionar', icono: 'link' },
    { valor: 'ordenar', nombre: 'Ordenar', icono: 'arrow-up-down' },
    { valor: 'solo_numero', nombre: 'Número', icono: 'hash' }
  ];

  function preguntaVacia() {
    return {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      texto: '', tipo: 'multiple', opciones: ['', ''],
      respuesta_correcta: '', explicacion: '', huecos: []
    };
  }

  window.vistaExamenEditor = {
    _arrastreIdx: null,

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      const raw = (window.location.hash || '').replace(/^#!\/?/, '');
      const [pathPart, queryPart] = raw.split('?');
      const idParam = (pathPart.split('/')[1] || 'nuevo').split('?')[0];
      const q = new URLSearchParams(queryPart || '');
      const evaluacionParam = q.get('evaluacion');
      const editando = idParam && idParam !== 'nuevo';

      let examen = {
        titulo: '', descripcion: '', grupo_id: usuario.grupo_id,
        creado_por: usuario.id, preguntas: [preguntaVacia()],
        publicado: false, estado: 'borrador', puntos_totales: 0,
        evaluacion_id: evaluacionParam || null
      };

      if (editando) {
        const existente = await window.examenesRepository.obtener(idParam);
        if (existente) {
          examen = existente;
          if (typeof examen.preguntas === 'string') {
            try { examen.preguntas = JSON.parse(examen.preguntas); } catch (e) { examen.preguntas = []; }
          }
          if (!Array.isArray(examen.preguntas)) examen.preguntas = [];
          examen.preguntas.forEach(p => {
            if (p.tipo === 'completar' && !Array.isArray(p.huecos)) p.huecos = [];
          });
        }
      }

      // Check for local draft
      const draftKey = 'editor_examen_' + (examen.id || 'nuevo') + '_borrador';
      const draft = localStorage.getItem(draftKey);
      if (draft && editando) {
        try {
          const draftData = JSON.parse(draft);
          if (draftData && draftData.preguntas && draftData.preguntas.length > 0) {
            const recuperar = await window.helpers.confirmar(
              'Se encontró un borrador no guardado. ¿Deseas recuperarlo?',
              { titulo: 'Borrador encontrado', textoConfirmar: 'Recuperar', textoCancelar: 'Descartar' }
            );
            if (recuperar) examen = draftData;
          }
        } catch (e) { /* ignore corrupt draft */ }
      }

      let evaluaciones = [];
      try { evaluaciones = await window.examenesRepository.listarEvaluaciones(usuario.grupo_id); } catch (e) { evaluaciones = []; }

      this._examen = examen;
      this._evaluaciones = evaluaciones;
      this._editando = editando;
      this._editoresHueco = {};
      this._draftKey = draftKey;
      this._renderizar(raiz, examen, editando, evaluaciones);
    },

    desmontar() {
      // Auto-save draft on navigation away
      if (this._examen && this._examen.preguntas && this._examen.preguntas.length > 0) {
        try {
          localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
        } catch (e) { /* ignore */ }
      }
    },

    _renderizar(raiz, examen, editando, evaluaciones) {
      const evalSeleccionada = examen.evaluacion_id || '';
      const opcionesEval = (evaluaciones || []).map(e =>
        `<option value="${e.id}" ${e.id === evalSeleccionada ? 'selected' : ''}>${window.helpers.escapeHtml(e.titulo)}</option>`
      ).join('');

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
            <button class="btn-secundario" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
            <h3>${editando ? 'Editar' : 'Nuevo'} Examen</h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              <button class="btn-secundario" id="btnPreview" style="font-size:var(--texto-xs)">${window.Iconos.render('eye')} Vista previa</button>
              <span class="editor-draft-indicator" id="draftIndicator">${window.Iconos.render('save')} Borrador local</span>
            </div>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Título</label>
            <input type="text" id="examenTitulo" value="${window.helpers.escapeHtml(examen.titulo)}" placeholder="Ej: Examen Levítico 1-10">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Descripción</label>
            <textarea id="examenDescripcion" rows="2" placeholder="Instrucciones para los alumnos">${window.helpers.escapeHtml(examen.descripcion || '')}</textarea>
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Evaluación</label>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              <select id="examenEvaluacion" style="flex:1">
                <option value="">— Sin evaluación —</option>
                ${opcionesEval}
              </select>
              ${editando ? '' : '<button class="btn-secundario" id="btnCrearEval">+ Nueva</button>'}
            </div>
          </div>

          <div class="o-pila">
            <div class="o-flecha o-flecha--between">
              <h4>Preguntas (${examen.preguntas.length})</h4>
            </div>
            <div id="preguntasContainer" class="o-pila"></div>
            <button class="btn-primario" id="btnAgregarPregunta" style="align-self:flex-start">${window.Iconos.render('plus')} Añadir pregunta</button>
          </div>

          <div class="o-flecha" style="justify-content:center;gap:var(--espaciado-md);margin-top:var(--espaciado-lg)">
            <button class="btn-secundario" id="btnGuardarBorrador">Guardar borrador</button>
            <button class="btn-primario" id="btnPublicar">Publicar</button>
          </div>
        </div>`;

      this._renderizarPreguntas(raiz, examen.preguntas);

      raiz.querySelector('#btnVolver').onclick = () => {
        localStorage.removeItem(this._draftKey);
        router.navegar('/examenes');
      };

      // Preview
      raiz.querySelector('#btnPreview').onclick = async () => {
        this._sincronizarPreguntas(raiz);
        // Save draft before preview
        localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
        if (this._examen.id) {
          router.navegar('/preview/' + this._examen.id);
        } else {
          window.helpers.mostrarAlerta('Guarda el examen primero para previsualizarlo.', 'advertencia');
        }
      };

      const btnCrearEval = raiz.querySelector('#btnCrearEval');
      if (btnCrearEval) {
        btnCrearEval.onclick = async () => {
          const datos = await window.helpers.formulario({
            titulo: 'Crear evaluación',
            mensaje: 'Define el período de evaluación.',
            campos: [
              { nombre: 'titulo', etiqueta: 'Nombre', valor: 'Nueva evaluación', requerido: true, placeholder: '1.ª Evaluación' },
              { nombre: 'asignatura', etiqueta: 'Asignatura (opcional)', valor: '', placeholder: 'Génesis' }
            ],
            textoConfirmar: 'Crear'
          });
          if (!datos) return;
          try {
            const u = await window.authRepository.asegurarGrupo(store.obtener('usuario'));
            const ev = await window.examenesRepository.crearEvaluacion({
              grupoId: u.grupo_id, creadoPor: u.id,
              titulo: datos.titulo.trim() || 'Nueva evaluación', asignatura: (datos.asignatura || '').trim()
            });
            router.navegar('/editor/nuevo?evaluacion=' + ev.id);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      }

      raiz.querySelector('#btnAgregarPregunta').onclick = () => {
        examen.preguntas.push(preguntaVacia());
        this._renderizarPreguntas(raiz, examen.preguntas);
      };

      raiz.querySelector('#btnGuardarBorrador').onclick = () => this._guardar(raiz, false);
      raiz.querySelector('#btnPublicar').onclick = () => this._guardar(raiz, true);

      // Auto-save draft periodically
      this._autoSaveInterval = setInterval(() => {
        if (this._examen && this._examen.preguntas) {
          try {
            this._sincronizarPreguntas(raiz);
            localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
            const indicator = raiz.querySelector('#draftIndicator');
            if (indicator) {
              indicator.classList.add('editor-draft-indicator--saved');
              indicator.innerHTML = window.Iconos.render('check') + ' Guardado';
              setTimeout(() => {
                indicator.classList.remove('editor-draft-indicator--saved');
                indicator.innerHTML = window.Iconos.render('save') + ' Borrador local';
              }, 2000);
            }
          } catch (e) { /* ignore */ }
        }
      }, 30000);
    },

    _renderizarPreguntas(raiz, preguntas) {
      const cont = raiz.querySelector('#preguntasContainer');
      this._editoresHueco = {};

      cont.innerHTML = preguntas.map((p, i) => `
        <div class="editor-pregunta tarjeta-capitulo" data-pregidx="${i}" style="border-left:3px solid var(--color-acento)" draggable="true">
          <div class="o-flecha o-flecha--between u-mb-1">
            <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center">
              <div class="editor-pregunta__drag-handle" title="Arrastrar para reordenar">${window.Iconos.render('grip-vertical')}</div>
              <span class="u-fw-600 u-fs-sm">Pregunta ${i + 1}</span>
            </div>
            <div class="editor-pregunta__acciones">
              <button class="editor-pregunta__accion-btn editor-pregunta__accion-btn--duplicar btn-duplicar-preg" data-idx="${i}" title="Duplicar">${window.Iconos.render('copy')}</button>
              <button class="editor-pregunta__accion-btn editor-pregunta__accion-btn--mover btn-subir-preg" data-idx="${i}" title="Mover arriba" ${i === 0 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>${window.Iconos.render('chevron-up')}</button>
              <button class="editor-pregunta__accion-btn editor-pregunta__accion-btn--mover btn-bajar-preg" data-idx="${i}" title="Mover abajo" ${i === preguntas.length - 1 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>${window.Iconos.render('chevron-down')}</button>
              <button class="editor-pregunta__accion-btn editor-pregunta__accion-btn--eliminar btn-eliminar-preg" data-idx="${i}" title="Eliminar">${window.Iconos.render('trash-2')}</button>
            </div>
          </div>
          ${this._renderSelectorTipo(p, i)}
          <div class="o-pila u-mt-1" data-cuerpo-pregunta="${i}">
            ${this._renderCuerpoPregunta(p, i)}
          </div>
          <div class="u-mt-1">
            <label class="u-fs-xs u-color-texto-terciario">Explicación (opcional)</label>
            <input type="text" data-campo="explicacion" data-idx="${i}" value="${window.helpers.escapeHtml(p.explicacion || '')}" placeholder="Explicación que verá el alumno al revisar">
          </div>
        </div>
      `).join('');

      // Sync events
      cont.querySelectorAll('[data-campo]').forEach(el => {
        el.addEventListener('change', () => this._sincronizarPreguntas(raiz));
        el.addEventListener('input', () => this._sincronizarPreguntas(raiz));
      });

      // Delete
      cont.querySelectorAll('.btn-eliminar-preg').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (this._examen.preguntas.length > 1) {
            this._examen.preguntas.splice(idx, 1);
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Duplicate
      cont.querySelectorAll('.btn-duplicar-preg').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const original = this._examen.preguntas[idx];
          const copia = JSON.parse(JSON.stringify(original));
          copia.id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          if (copia.huecos) copia.huecos.forEach(h => { h.id = Date.now() + Math.random(); });
          this._examen.preguntas.splice(idx + 1, 0, copia);
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        };
      });

      // Move up
      cont.querySelectorAll('.btn-subir-preg').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          if (idx > 0) {
            [this._examen.preguntas[idx], this._examen.preguntas[idx - 1]] = [this._examen.preguntas[idx - 1], this._examen.preguntas[idx]];
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Move down
      cont.querySelectorAll('.btn-bajar-preg').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          if (idx < this._examen.preguntas.length - 1) {
            [this._examen.preguntas[idx], this._examen.preguntas[idx + 1]] = [this._examen.preguntas[idx + 1], this._examen.preguntas[idx]];
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Type selector
      cont.querySelectorAll('.selector-tipo-opcion').forEach(opcion => {
        opcion.addEventListener('click', () => {
          const radio = opcion.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            const idx = parseInt(radio.dataset.idx);
            const nuevoTipo = radio.value;
            this._examen.preguntas[idx].tipo = nuevoTipo;
            if (nuevoTipo === 'completar' && !Array.isArray(this._examen.preguntas[idx].huecos)) {
              this._examen.preguntas[idx].huecos = [];
            }
            if (nuevoTipo === 'multiple' || nuevoTipo === 'varias_opciones' || nuevoTipo === 'opcion_unica') {
              if (!Array.isArray(this._examen.preguntas[idx].opciones) || this._examen.preguntas[idx].opciones.length < 2) {
                this._examen.preguntas[idx].opciones = ['', ''];
              }
            }
            if (nuevoTipo === 'relacionar' || nuevoTipo === 'ordenar') {
              if (!Array.isArray(this._examen.preguntas[idx].opciones) || this._examen.preguntas[idx].opciones.length < 3) {
                this._examen.preguntas[idx].opciones = ['', '', ''];
              }
              // Auto-generate respuesta_correcta for new relation/order questions
              this._autoGenerarRespuestaCorrecta(this._examen.preguntas[idx]);
            }
            this._renderizarCuerpoPorTipo(raiz, idx, nuevoTipo);
          }
        });
      });

      // Drag-and-drop
      this._conectarDragDrop(cont, raiz);

      this._conectarOpciones(raiz, preguntas);
      window.Iconos.actualizar();

      preguntas.forEach((p, i) => {
        if (p.tipo === 'completar') {
          this._montarEditorHuecos(raiz, i, p);
        }
      });
    },

    _conectarDragDrop(cont, raiz) {
      cont.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.editor-pregunta');
        if (!card) return;
        this._arrastreIdx = parseInt(card.dataset.pregidx);
        card.classList.add('editor-pregunta--dragging');
        e.dataTransfer.setData('text/plain', String(this._arrastreIdx));
        e.dataTransfer.effectAllowed = 'move';
      });

      cont.addEventListener('dragend', (e) => {
        const card = e.target.closest('.editor-pregunta');
        if (card) card.classList.remove('editor-pregunta--dragging');
        cont.querySelectorAll('.editor-pregunta--drop').forEach(el => el.classList.remove('editor-pregunta--drop'));
        this._arrastreIdx = null;
      });

      cont.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const card = e.target.closest('.editor-pregunta');
        if (!card) return;
        cont.querySelectorAll('.editor-pregunta--drop').forEach(el => el.classList.remove('editor-pregunta--drop'));
        card.classList.add('editor-pregunta--drop');
      });

      cont.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toCard = e.target.closest('.editor-pregunta');
        if (!toCard || isNaN(fromIdx)) return;
        const toIdx = parseInt(toCard.dataset.pregidx);
        if (fromIdx === toIdx) return;
        const [moved] = this._examen.preguntas.splice(fromIdx, 1);
        this._examen.preguntas.splice(toIdx, 0, moved);
        this._renderizarPreguntas(raiz, this._examen.preguntas);
      });
    },

    _autoGenerarRespuestaCorrecta(pregunta) {
      if (pregunta.tipo === 'relacionar') {
        // Build correct pairs: each left matches the right at the same index
        const mitad = Math.ceil((pregunta.opciones || []).length / 2);
        const pares = {};
        for (let i = 0; i < mitad; i++) {
          if (pregunta.opciones[i] && pregunta.opciones[mitad + i]) {
            pares[String(i)] = String(mitad + i);
          }
        }
        pregunta.respuesta_correcta = JSON.stringify(pares);
      } else if (pregunta.tipo === 'ordenar') {
        // Default order: [0, 1, 2, ...]
        pregunta.respuesta_correcta = JSON.stringify((pregunta.opciones || []).map((_, i) => i));
      }
    },

    _renderSelectorTipo(pregunta, idx) {
      return `
        <div class="selector-tipo-grid u-mt-1">
          ${TIPOS_PREGUNTA.map(t => `
            <label class="selector-tipo-opcion ${pregunta.tipo === t.valor ? 'selector-tipo-opcion--activo' : ''}">
              <input type="radio" name="tipo_${idx}" value="${t.valor}" data-idx="${idx}" ${pregunta.tipo === t.valor ? 'checked' : ''}>
              <span class="selector-tipo-opcion__icono">${window.Iconos.render(t.icono)}</span>
              <span class="selector-tipo-opcion__nombre">${t.nombre}</span>
            </label>
          `).join('')}
        </div>`;
    },

    _renderCuerpoPregunta(p, i) {
      let html = `<textarea class="u-mb-1" data-campo="texto" data-idx="${i}" rows="2" placeholder="Escribe la pregunta...">${window.helpers.escapeHtml(p.texto)}</textarea>`;
      if (p.tipo === 'completar') {
        html += `<div id="editorHuecos_${i}"></div>`;
      } else {
        html += this._renderCamposTipo(p, i);
      }
      return html;
    },

    _renderCamposTipo(p, i) {
      let html = '';
      if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
        html += this._renderOpcionesLista(p.opciones, i);
        html += `<label class="u-fs-xs u-color-texto-terciario">Respuesta correcta</label>`;
        html += `<select data-campo="respuesta_correcta" data-idx="${i}"><option value="">— Seleccionar —</option>${(p.opciones || []).map((o, oi) => `<option value="${oi}" ${String(p.respuesta_correcta) === String(oi) ? 'selected' : ''}>${window.helpers.escapeHtml(o || 'Opción ' + (oi + 1))}</option>`).join('')}</select>`;
      } else if (p.tipo === 'varias_opciones') {
        html += this._renderOpcionesLista(p.opciones, i);
        html += `<label class="u-fs-xs u-color-texto-terciario">Respuestas correctas</label>`;
        html += `<div class="o-pila" style="gap:var(--espaciado-xxs)">${(p.opciones || []).map((o, oi) => `<label class="o-flecha" style="gap:var(--espaciado-xxs);cursor:pointer;font-size:var(--texto-xs)"><input type="checkbox" data-campo="respuesta_correcta_multi" data-idx="${i}" data-val="${oi}" ${(() => { try { return JSON.parse(p.respuesta_correcta).includes(oi); } catch(e) { return false; } })() ? 'checked' : ''}> ${window.helpers.escapeHtml(o || 'Opción ' + (oi + 1))}</label>`).join('')}</div>`;
      } else if (p.tipo === 'verdadero_falso') {
        html += `
          <div class="o-flecha" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm"><input type="radio" name="vf_${i}" value="true" ${p.respuesta_correcta === 'true' ? 'checked' : ''} data-vf="${i}" data-campo="respuesta_correcta"> Verdadero</label>
            <label class="u-fs-sm"><input type="radio" name="vf_${i}" value="false" ${p.respuesta_correcta === 'false' ? 'checked' : ''} data-vf="${i}" data-campo="respuesta_correcta"> Falso</label>
          </div>`;
      } else if (p.tipo === 'respuesta_corta') {
        html += `<label class="u-fs-xs u-color-texto-terciario">Respuesta correcta</label>`;
        html += `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Respuesta exacta (variantes separadas por |)">`;
      } else if (p.tipo === 'texto_largo') {
        html += `<label class="u-fs-xs u-color-texto-terciario">Respuesta orientativa (opcional)</label>`;
        html += `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Palabras clave separadas por |">`;
      } else if (p.tipo === 'solo_numero') {
        html += `<label class="u-fs-xs u-color-texto-terciario">Respuesta numérica</label>`;
        html += `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Ej: 42">`;
      } else if (p.tipo === 'relacionar') {
        html += this._renderRelacionar(p, i);
      } else if (p.tipo === 'ordenar') {
        html += this._renderOrdenar(p, i);
      }
      return html;
    },

    _renderizarCuerpoPorTipo(raiz, idx, tipo) {
      const pregunta = this._examen.preguntas[idx];
      const cont = raiz.querySelector(`[data-cuerpo-pregunta="${idx}"]`);
      if (!cont) return;
      let html = `<textarea class="u-mb-1" data-campo="texto" data-idx="${idx}" rows="2" placeholder="Escribe la pregunta...">${window.helpers.escapeHtml(pregunta.texto)}</textarea>`;
      if (tipo === 'completar') {
        html += `<div id="editorHuecos_${idx}"></div>`;
      } else {
        html += this._renderCamposTipo(pregunta, idx);
      }
      cont.innerHTML = html;
      cont.querySelectorAll('[data-campo]').forEach(el => {
        el.addEventListener('change', () => this._sincronizarPreguntas(raiz));
        el.addEventListener('input', () => this._sincronizarPreguntas(raiz));
      });
      this._conectarOpciones(raiz, this._examen.preguntas);
      window.Iconos?.actualizar?.();
      if (tipo === 'completar') {
        this._montarEditorHuecos(raiz, idx, pregunta);
      }
    },

    _montarEditorHuecos(raiz, idx, pregunta) {
      const contenedor = raiz.querySelector(`#editorHuecos_${idx}`);
      if (!contenedor) return;
      const editor = window.editorHuecos.montar(contenedor, {
        texto: pregunta.texto || '',
        huecos: pregunta.huecos || [],
        onChange: (datos) => {
          pregunta.texto = datos.texto;
          pregunta.huecos = datos.huecos;
          if (datos.huecos.length > 0) {
            pregunta.respuesta_correcta = '';
          }
        }
      });
      this._editoresHueco[idx] = editor;
    },

    _renderOpcionesLista(opciones, idx) {
      return (opciones || ['', '']).map((o, oi) => `
        <div class="o-flecha o-flecha--between u-mb-1" style="gap:var(--espaciado-xs)">
          <span class="u-fs-xs u-color-texto-terciario" style="min-width:20px">${String.fromCharCode(65 + oi)}.</span>
          <input type="text" data-opcion="${idx}" data-oidx="${oi}" value="${window.helpers.escapeHtml(o)}" placeholder="Opción ${String.fromCharCode(65 + oi)}" style="flex:1">
          <button class="btn-quitar-opcion" data-idx="${idx}" data-oidx="${oi}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex">${window.Iconos.render('x')}</button>
        </div>
      `).join('') + `<button class="btn-agregar-opcion" data-idx="${idx}" style="background:none;border:none;color:var(--color-acento);cursor:pointer;font-size:var(--texto-xs)">+ Agregar opción</button>`;
    },

    _renderRelacionar(p, idx) {
      const opciones = p.opciones || ['', '', ''];
      const mitad = Math.ceil(opciones.length / 2);

      // Build visual pairs with auto-generated correct pairs
      let html = '<div class="editor-relacionar__pares">';
      html += `<p class="u-fs-xs u-color-texto-terciario u-mb-1">Pares izquierda → derecha (la respuesta correcta se genera automáticamente):</p>`;

      for (let pi = 0; pi < mitad; pi++) {
        html += `<div class="editor-relacionar__par">
          <input type="text" data-relizq="${idx}" data-idx="${pi}" value="${window.helpers.escapeHtml(opciones[pi] || '')}" placeholder="Izq ${pi + 1}">
          <span class="editor-relacionar__flecha">${window.Iconos.render('arrow-right')}</span>
          <input type="text" data-relder="${idx}" data-idx="${pi}" value="${window.helpers.escapeHtml(opciones[mitad + pi] || '')}" placeholder="Der ${pi + 1}">
        </div>`;
      }

      html += `<div class="o-flecha" style="gap:var(--espaciado-xs)">
        <button class="btn-secundario u-fs-xs btn-add-pair" data-idx="${idx}">${window.Iconos.render('plus')} Par</button>
        <button class="btn-secundario u-fs-xs btn-remove-pair" data-idx="${idx}" ${(mitad <= 2) ? 'disabled style="opacity:0.3"' : ''}>${window.Iconos.render('minus')} Par</button>
      </div>`;

      html += '</div>';
      return html;
    },

    _renderOrdenar(p, idx) {
      const opciones = p.opciones || ['', '', ''];
      let html = '<div class="editor-ordenar__elementos">';
      html += `<p class="u-fs-xs u-color-texto-terciario u-mb-1">Elementos en el orden correcto (arrastra para reordenar):</p>`;

      for (let oi = 0; oi < opciones.length; oi++) {
        html += `<div class="editor-ordenar__elemento" draggable="true" data-orden-idx="${idx}" data-pos="${oi}">
          <div class="editor-ordenar__drag-handle" title="Arrastrar">${window.Iconos.render('grip-vertical')}</div>
          <span class="editor-ordenar__numero">${oi + 1}</span>
          <input type="text" data-orden="${idx}" data-idx="${oi}" value="${window.helpers.escapeHtml(opciones[oi] || '')}" placeholder="Elemento ${oi + 1}">
        </div>`;
      }

      html += `<div class="o-flecha" style="gap:var(--espaciado-xs)">
        <button class="btn-secundario u-fs-xs btn-add-order" data-idx="${idx}">${window.Iconos.render('plus')} Elemento</button>
        <button class="btn-secundario u-fs-xs btn-remove-order" data-idx="${idx}" ${(opciones.length <= 2) ? 'disabled style="opacity:0.3"' : ''}>${window.Iconos.render('minus')} Elemento</button>
      </div>`;

      html += '</div>';
      return html;
    },

    _conectarOpciones(raiz, preguntas) {
      // Add option
      raiz.querySelectorAll('.btn-agregar-opcion').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          this._examen.preguntas[idx].opciones.push('');
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        };
      });

      // Remove option
      raiz.querySelectorAll('.btn-quitar-opcion').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const oidx = parseInt(btn.dataset.oidx);
          const p = this._examen.preguntas[idx];
          if (p.opciones.length > 2) {
            p.opciones.splice(oidx, 1);
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Add pair (relacionar)
      raiz.querySelectorAll('.btn-add-pair').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          const mitad = Math.ceil((p.opciones || []).length / 2);
          p.opciones.push('');
          p.opciones.push('');
          this._autoGenerarRespuestaCorrecta(p);
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        };
      });

      // Remove pair (relacionar)
      raiz.querySelectorAll('.btn-remove-pair').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          const mitad = Math.ceil((p.opciones || []).length / 2);
          if (mitad > 2) {
            p.opciones.splice(mitad - 1, 1);
            p.opciones.splice(mitad - 1, 1);
            this._autoGenerarRespuestaCorrecta(p);
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Add element (ordenar)
      raiz.querySelectorAll('.btn-add-order').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          p.opciones.push('');
          this._autoGenerarRespuestaCorrecta(p);
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        };
      });

      // Remove element (ordenar)
      raiz.querySelectorAll('.btn-remove-order').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          if (p.opciones.length > 2) {
            p.opciones.pop();
            this._autoGenerarRespuestaCorrecta(p);
            this._renderizarPreguntas(raiz, this._examen.preguntas);
          }
        };
      });

      // Drag-and-drop for ordenar elements
      this._conectarDragOrdenar(raiz);
    },

    _conectarDragOrdenar(raiz) {
      const elementos = raiz.querySelectorAll('.editor-ordenar__elemento[draggable]');
      elementos.forEach(el => {
        el.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          el.classList.add('editor-ordenar__elemento--dragging');
          e.dataTransfer.setData('text/plain', el.dataset.pos);
          e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragend', (e) => {
          el.classList.remove('editor-ordenar__elemento--dragging');
          raiz.querySelectorAll('.editor-ordenar__elemento--drop').forEach(x => x.classList.remove('editor-ordenar__elemento--drop'));
        });

        el.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          raiz.querySelectorAll('.editor-ordenar__elemento--drop').forEach(x => x.classList.remove('editor-ordenar__elemento--drop'));
          el.classList.add('editor-ordenar__elemento--drop');
        });

        el.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fromPos = parseInt(e.dataTransfer.getData('text/plain'));
          const toPos = parseInt(el.dataset.pos);
          const ordenIdx = parseInt(el.dataset.ordenIdx);
          if (fromPos === toPos || isNaN(fromPos) || isNaN(toPos)) return;
          const p = this._examen.preguntas[ordenIdx];
          const [moved] = p.opciones.splice(fromPos, 1);
          p.opciones.splice(toPos, 0, moved);
          this._autoGenerarRespuestaCorrecta(p);
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        });
      });
    },

    _sincronizarPreguntas(raiz) {
      const cont = raiz.querySelector('#preguntasContainer');
      if (!cont) return;
      const preguntas = this._examen.preguntas;
      cont.querySelectorAll('[data-idx]').forEach(el => {
        const idx = parseInt(el.dataset.idx);
        if (idx >= preguntas.length) return;
        const campo = el.dataset.campo;
        if (campo === 'respuesta_correcta_multi') {
          const checks = cont.querySelectorAll(`input[data-campo="respuesta_correcta_multi"][data-idx="${idx}"]:checked`);
          preguntas[idx].respuesta_correcta = JSON.stringify(Array.from(checks).map(c => parseInt(c.dataset.val)));
          return;
        }
        if (campo && el.value !== undefined) {
          if (campo === 'opciones') {
            const oidx = parseInt(el.dataset.oidx);
            if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
            preguntas[idx].opciones[oidx] = el.value;
          } else {
            preguntas[idx][campo] = el.value;
          }
        }
        const oidx = parseInt(el.dataset.oidx);
        if (!isNaN(oidx) && el.dataset.opcion !== undefined) {
          if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
          preguntas[idx].opciones[oidx] = el.value;
        }
        if (el.dataset.vf !== undefined) {
          if (el.checked) preguntas[idx].respuesta_correcta = el.value;
        }
      });

      // Sync relational pairs (auto-generate correct answer)
      cont.querySelectorAll('[data-relizq]').forEach(el => {
        const idx = parseInt(el.dataset.relizq);
        if (idx >= preguntas.length) return;
        if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
        preguntas[idx].opciones[parseInt(el.dataset.idx)] = el.value;
        this._autoGenerarRespuestaCorrecta(preguntas[idx]);
      });
      cont.querySelectorAll('[data-relder]').forEach(el => {
        const idx = parseInt(el.dataset.relder);
        if (idx >= preguntas.length) return;
        if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
        const mitad = Math.ceil(preguntas[idx].opciones.length / 2);
        preguntas[idx].opciones[mitad + parseInt(el.dataset.idx)] = el.value;
        this._autoGenerarRespuestaCorrecta(preguntas[idx]);
      });

      // Sync order elements (auto-generate correct answer)
      cont.querySelectorAll('[data-orden]').forEach(el => {
        const idx = parseInt(el.dataset.orden);
        if (idx >= preguntas.length) return;
        if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
        preguntas[idx].opciones[parseInt(el.dataset.idx)] = el.value;
        this._autoGenerarRespuestaCorrecta(preguntas[idx]);
      });
    },

    async _guardar(raiz, publicar) {
      this._sincronizarPreguntas(raiz);
      const examen = this._examen;
      const titulo = raiz.querySelector('#examenTitulo')?.value || examen.titulo;
      const descripcion = raiz.querySelector('#examenDescripcion')?.value || examen.descripcion;
      if (!titulo.trim()) { window.helpers.mostrarAlerta('El título es obligatorio', 'advertencia'); return; }
      const preguntasValidas = examen.preguntas.filter(p => p.texto.trim());
      if (preguntasValidas.length === 0) { window.helpers.mostrarAlerta('Agrega al menos una pregunta', 'advertencia'); return; }
      for (const p of preguntasValidas) {
        if (p.tipo === 'completar' && p.huecos && p.huecos.length > 0) {
          const sinRespuesta = p.huecos.find(h => !h.respuesta_correcta || !h.respuesta_correcta.trim());
          if (sinRespuesta) {
            window.helpers.mostrarAlerta('Todos los huecos deben tener una respuesta correcta', 'advertencia');
            return;
          }
        }
      }
      try {
        const usuario = await window.authRepository.asegurarGrupo(store.obtener('usuario'));
        examen.grupo_id = usuario.grupo_id;
        examen.creado_por = usuario.id;
        const evaluacion_id = raiz.querySelector('#examenEvaluacion')?.value || null;
        examen.evaluacion_id = evaluacion_id;
        const datos = {
          id: examen.id || undefined,
          grupo_id: examen.grupo_id,
          creado_por: examen.creado_por,
          evaluacion_id: examen.evaluacion_id,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          preguntas: JSON.stringify(preguntasValidas.map(p => ({
            id: p.id, texto: p.texto.trim(), tipo: p.tipo, opciones: p.opciones,
            respuesta_correcta: p.respuesta_correcta, explicacion: p.explicacion || '',
            huecos: p.tipo === 'completar' && Array.isArray(p.huecos) ? p.huecos : undefined
          }))),
          puntos_totales: preguntasValidas.length,
          publicado: publicar,
          estado: publicar ? 'publicado' : 'borrador'
        };
        const guardado = await window.examenesRepository.guardar(datos);
        if (publicar && guardado && guardado.id) {
          await window.examenesRepository.publicar(guardado.id);
        }
        await window.adminRepository.registrarAuditoria(
          publicar ? 'examen:publicar' : 'examen:guardar',
          `Examen "${titulo.trim()}" (${preguntasValidas.length} preguntas)`,
          examen.creado_por, examen.grupo_id
        );
        // Clear draft on successful save
        localStorage.removeItem(this._draftKey);
        if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
        router.navegar('/examenes');
      } catch (e) { window.helpers.mostrarAlerta('Error al guardar: ' + e.message, 'error'); }
    }
  };
})();
