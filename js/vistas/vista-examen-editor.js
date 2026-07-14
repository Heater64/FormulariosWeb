(function() {
  'use strict';
  function preguntaVacia() { return { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), texto: '', tipo: 'multiple', opciones: ['', ''], respuesta_correcta: '', explicacion: '' }; }
  window.vistaExamenEditor = {
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
      let examen = { titulo: '', descripcion: '', grupo_id: usuario.grupo_id, creado_por: usuario.id, preguntas: [preguntaVacia()], publicado: false, estado: 'borrador', puntos_totales: 0, evaluacion_id: evaluacionParam || null };
      if (editando) {
        const existente = await window.examenesRepository.obtener(idParam);
        if (existente) {
          examen = existente;
          if (typeof examen.preguntas === 'string') {
            try { examen.preguntas = JSON.parse(examen.preguntas); } catch (e) { examen.preguntas = []; }
          }
          if (!Array.isArray(examen.preguntas)) examen.preguntas = [];
        }
      }
      let evaluaciones = [];
      try { evaluaciones = await window.examenesRepository.listarEvaluaciones(usuario.grupo_id); } catch (e) { evaluaciones = []; }
      this._examen = examen;
      this._evaluaciones = evaluaciones;
      this._editando = editando;
      this._renderizar(raiz, examen, editando, evaluaciones);
    },
    _renderizar(raiz, examen, editando, evaluaciones) {
      const evalSeleccionada = examen.evaluacion_id || '';
      const opcionesEval = (evaluaciones || []).map(e =>
        `<option value="${e.id}" ${e.id === evalSeleccionada ? 'selected' : ''}>${window.helpers.escapeHtml(e.titulo)}</option>`
      ).join('');
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <div class="o-flecha o-flecha--between">
            <button class="btn-secundario" id="btnVolver">← Volver</button>
            <h3>${editando ? 'Editar' : 'Nuevo'} Examen</h3>
            <div></div>
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
              <button class="btn-primario" id="btnAgregarPregunta">+ Agregar</button>
            </div>
            <div id="preguntasContainer" class="o-pila"></div>
          </div>
          <div class="o-flecha" style="justify-content:center;gap:var(--espaciado-md);margin-top:var(--espaciado-lg);padding-bottom:120px">
            <button class="btn-secundario" id="btnGuardarBorrador">Guardar borrador</button>
            <button class="btn-primario" id="btnPublicar">Publicar</button>
          </div>
        </div>`;
      this._renderizarPreguntas(raiz, examen.preguntas);
      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');
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
    },
    _renderizarPreguntas(raiz, preguntas) {
      const cont = raiz.querySelector('#preguntasContainer');
      cont.innerHTML = preguntas.map((p, i) => `
        <div class="tarjeta-capitulo" data-pregidx="${i}" style="border-left:3px solid var(--color-acento)">
          <div class="o-flecha o-flecha--between u-mb-1">
            <span class="u-fw-600 u-fs-sm">Pregunta ${i + 1}</span>
            <button class="btn-eliminar-preg" data-idx="${i}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex">${window.Iconos.render('x')}</button>
          </div>
          <textarea class="u-mb-1" data-campo="texto" data-idx="${i}" rows="2" placeholder="Escribe la pregunta...">${window.helpers.escapeHtml(p.texto)}</textarea>
          <div class="o-flecha o-flecha--between u-mb-1">
            <select data-campo="tipo" data-idx="${i}">
              <option value="multiple" ${p.tipo === 'multiple' ? 'selected' : ''}>Opción múltiple</option>
              <option value="verdadero_falso" ${p.tipo === 'verdadero_falso' ? 'selected' : ''}>Verdadero/Falso</option>
              <option value="respuesta_corta" ${p.tipo === 'respuesta_corta' ? 'selected' : ''}>Respuesta corta</option>
              <option value="texto_corto" ${p.tipo === 'texto_corto' ? 'selected' : ''}>Texto corto</option>
              <option value="texto_largo" ${p.tipo === 'texto_largo' ? 'selected' : ''}>Texto largo</option>
              <option value="completar" ${p.tipo === 'completar' ? 'selected' : ''}>Completar oración</option>
              <option value="opcion_unica" ${p.tipo === 'opcion_unica' ? 'selected' : ''}>Opción única</option>
              <option value="varias_opciones" ${p.tipo === 'varias_opciones' ? 'selected' : ''}>Varias opciones</option>
              <option value="relacionar" ${p.tipo === 'relacionar' ? 'selected' : ''}>Relacionar</option>
              <option value="ordenar" ${p.tipo === 'ordenar' ? 'selected' : ''}>Ordenar</option>
              <option value="solo_numero" ${p.tipo === 'solo_numero' ? 'selected' : ''}>Solo un número</option>
            </select>
          </div>
          <div class="opciones-container" data-idx="${i}">
            ${p.tipo === 'multiple' ? this._renderOpciones(p.opciones, i) : ''}
            ${p.tipo === 'verdadero_falso' ? this._renderVF(p.respuesta_correcta, i) : ''}
            ${p.tipo === 'varias_opciones' ? this._renderOpciones(p.opciones, i) : ''}
            ${p.tipo === 'opcion_unica' ? this._renderOpciones(p.opciones, i) : ''}
            ${p.tipo === 'relacionar' ? this._renderRelacionar(p.opciones || ['','','','','',''], i) : ''}
            ${p.tipo === 'ordenar' ? this._renderOrdenar(p.opciones || ['','','','','',''], i) : ''}
          </div>
          <div class="u-mt-1 respuesta-correcta-container">
            <label class="u-fs-xs u-color-texto-terciario">Respuesta correcta</label>
            ${p.tipo === 'multiple' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Índice de opción correcta (0, 1, 2...)">` : ''}
            ${p.tipo === 'opcion_unica' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Índice de opción correcta (0, 1, 2...)">` : ''}
            ${p.tipo === 'varias_opciones' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Ej: [0,2,3] (índices separados por coma)">` : ''}
            ${p.tipo === 'respuesta_corta' || p.tipo === 'texto_corto' || p.tipo === 'completar' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Respuesta exacta">` : ''}
            ${p.tipo === 'texto_largo' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Palabras clave separadas por |">` : ''}
            ${p.tipo === 'solo_numero' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Ej: 42">` : ''}
            ${p.tipo === 'relacionar' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder='Ej: {"0":"1","2":"3"} (pares izquierda:derecha)'>` : ''}
            ${p.tipo === 'ordenar' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder='Ej: [3,0,1,2] (orden correcto por índice)'>` : ''}
            ${p.tipo === 'verdadero_falso' ? '' : ''}
            <input type="text" data-campo="explicacion" data-idx="${i}" value="${window.helpers.escapeHtml(p.explicacion || '')}" placeholder="Explicación (opcional)" class="u-mt-1">
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('textarea, input, select').forEach(el => {
        el.addEventListener('change', () => this._sincronizarPreguntas(raiz));
        el.addEventListener('input', () => this._sincronizarPreguntas(raiz));
      });
      window.Iconos.actualizar();
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
      cont.querySelectorAll('.btn-agregar-opcion').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          this._examen.preguntas[idx].opciones.push('');
          this._renderizarPreguntas(raiz, this._examen.preguntas);
        };
      });
      cont.querySelectorAll('.btn-quitar-opcion').forEach(btn => {
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
    },
    _renderOpciones(opciones, idx) {
      return (opciones || ['', '']).map((o, oi) => `
        <div class="o-flecha o-flecha--between u-mb-1" style="gap:var(--espaciado-xs)">
          <span class="u-fs-xs u-color-texto-terciario" style="min-width:20px">${String.fromCharCode(65 + oi)}.</span>
          <input type="text" data-opcion="${idx}" data-oidx="${oi}" value="${window.helpers.escapeHtml(o)}" placeholder="Opción ${String.fromCharCode(65 + oi)}" style="flex:1">
          <button class="btn-quitar-opcion" data-idx="${idx}" data-oidx="${oi}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex">${window.Iconos.render('x')}</button>
        </div>
      `).join('') + `<button class="btn-agregar-opcion" data-idx="${idx}" style="background:none;border:none;color:var(--color-acento);cursor:pointer;font-size:var(--texto-xs)">+ Agregar opción</button>`;
    },
    _renderVF(respuesta, idx) {
      return `
        <div class="o-flecha" style="gap:var(--espaciado-sm)">
          <label class="u-fs-sm"><input type="radio" name="vf_${idx}" value="true" ${respuesta === 'true' ? 'checked' : ''} data-vf="${idx}" data-campo="respuesta_correcta"> Verdadero</label>
          <label class="u-fs-sm"><input type="radio" name="vf_${idx}" value="false" ${respuesta === 'false' ? 'checked' : ''} data-vf="${idx}" data-campo="respuesta_correcta"> Falso</label>
        </div>`;
    },
    _renderRelacionar(opciones, idx) {
      let html = '<div class="o-pila u-mb-1"><p class="u-fs-xs u-color-texto-terciario">Pares izquierda → derecha (rellena ambos lados):</p>';
      const pares = opciones.length || 3;
      for (let pi = 0; pi < pares; pi++) {
        html += `<div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs)">
          <input type="text" data-relizq="${idx}" data-idx="${pi}" value="${window.helpers.escapeHtml(opciones[pi] || '')}" placeholder="Izquierda ${pi + 1}" style="flex:1">
          <span class="u-color-texto-terciario">→</span>
          <input type="text" data-relder="${idx}" data-idx="${pi}" value="" placeholder="Derecha ${pi + 1}" style="flex:1">
        </div>`;
      }
      html += '</div>';
      return html;
    },
    _renderOrdenar(opciones, idx) {
      let html = '<div class="o-pila u-mb-1"><p class="u-fs-xs u-color-texto-terciario">Elementos en el orden correcto:</p>';
      const items = opciones.length || 3;
      for (let oi = 0; oi < items; oi++) {
        html += `<div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs)">
          <span class="u-fs-xs u-color-texto-terciario" style="min-width:24px">${oi + 1}.</span>
          <input type="text" data-orden="${idx}" data-idx="${oi}" value="${window.helpers.escapeHtml(opciones[oi] || '')}" placeholder="Elemento ${oi + 1}" style="flex:1">
        </div>`;
      }
      html += '</div>';
      return html;
    },
    _sincronizarPreguntas(raiz) {
      const cont = raiz.querySelector('#preguntasContainer');
      if (!cont) return;
      const preguntas = this._examen.preguntas;
      cont.querySelectorAll('[data-idx]').forEach(el => {
        const idx = parseInt(el.dataset.idx);
        if (idx >= preguntas.length) return;
        const campo = el.dataset.campoo || el.dataset.campo;
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
      cont.querySelectorAll('[data-relizq]').forEach(el => {
        const idx = parseInt(el.dataset.relizq);
        if (idx >= preguntas.length) return;
        if (!preguntas[idx].opciones) preguntas[idx].opciones = [];
        const pi = parseInt(el.dataset.idx);
        preguntas[idx].opciones[pi] = el.value;
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
            respuesta_correcta: p.respuesta_correcta, explicacion: p.explicacion || ''
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
        router.navegar('/examenes');
      } catch (e) { window.helpers.mostrarAlerta('Error al guardar: ' + e.message, 'error'); }
    }
  };
})();
