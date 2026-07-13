(function() {
  'use strict';
  function preguntaVacia() { return { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), texto: '', tipo: 'multiple', opciones: ['', ''], respuesta_correcta: '', explicacion: '' }; }
  window.vistaExamenEditor = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      const editando = params && params.id && params.id !== 'nuevo';
      let examen = { titulo: '', descripcion: '', grupo_id: usuario.grupo_id, creado_por: usuario.id, preguntas: [preguntaVacia()], publicado: false, estado: 'borrador', puntos_totales: 0 };
      if (editando) {
        const existente = await window.examenesRepository.obtener(params.id);
        if (existente) examen = existente;
      }
      this._examen = examen;
      this._renderizar(raiz, examen, editando);
    },
    _renderizar(raiz, examen, editando) {
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
          </div>
          <div class="o-pila">
            <div class="o-flecha o-flecha--between">
              <h4>Preguntas (${examen.preguntas.length})</h4>
              <button class="btn-primario" id="btnAgregarPregunta">+ Agregar</button>
            </div>
            <div id="preguntasContainer" class="o-pila"></div>
          </div>
          <div class="o-flecha" style="position:fixed;bottom:80px;left:0;right:0;justify-content:center;gap:var(--espaciado-md);padding:var(--espaciado-sm);background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-top:1px solid var(--color-borde)">
            <button class="btn-secundario" id="btnGuardarBorrador">Guardar borrador</button>
            <button class="btn-primario" id="btnPublicar">Publicar</button>
          </div>
        </div>`;
      this._renderizarPreguntas(raiz, examen.preguntas);
      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');
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
            <button class="btn-eliminar-preg" data-idx="${i}" style="background:none;border:none;color:var(--color-error);cursor:pointer;font-size:1.2rem">✕</button>
          </div>
          <textarea class="u-mb-1" data-campo="texto" data-idx="${i}" rows="2" placeholder="Escribe la pregunta...">${window.helpers.escapeHtml(p.texto)}</textarea>
          <div class="o-flecha o-flecha--between u-mb-1">
            <select data-campo="tipo" data-idx="${i}">
              <option value="multiple" ${p.tipo === 'multiple' ? 'selected' : ''}>Opción múltiple</option>
              <option value="verdadero_falso" ${p.tipo === 'verdadero_falso' ? 'selected' : ''}>Verdadero/Falso</option>
              <option value="respuesta_corta" ${p.tipo === 'respuesta_corta' ? 'selected' : ''}>Respuesta corta</option>
              <option value="completar" ${p.tipo === 'completar' ? 'selected' : ''}>Completar</option>
            </select>
          </div>
          <div class="opciones-container" data-idx="${i}">
            ${p.tipo === 'multiple' ? this._renderOpciones(p.opciones, i) : ''}
            ${p.tipo === 'verdadero_falso' ? this._renderVF(p.respuesta_correcta, i) : ''}
          </div>
          <div class="u-mt-1">
            <label class="u-fs-xs u-color-texto-terciario">Respuesta correcta</label>
            ${p.tipo === 'multiple' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Índice de opción correcta (0, 1, 2...)">` : ''}
            ${p.tipo === 'respuesta_corta' || p.tipo === 'completar' ? `<input type="text" data-campo="respuesta_correcta" data-idx="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta)}" placeholder="Respuesta exacta">` : ''}
            ${p.tipo === 'verdadero_falso' ? '' : ''}
            <input type="text" data-campo="explicacion" data-idx="${i}" value="${window.helpers.escapeHtml(p.explicacion || '')}" placeholder="Explicación (opcional)" class="u-mt-1">
          </div>
        </div>
      `).join('');
      cont.querySelectorAll('textarea, input, select').forEach(el => {
        el.addEventListener('change', () => this._sincronizarPreguntas(raiz));
        el.addEventListener('input', () => this._sincronizarPreguntas(raiz));
      });
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
          <button class="btn-quitar-opcion" data-idx="${idx}" data-oidx="${oi}" style="background:none;border:none;color:var(--color-error);cursor:pointer">✕</button>
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
    },
    async _guardar(raiz, publicar) {
      this._sincronizarPreguntas(raiz);
      const examen = this._examen;
      const titulo = raiz.querySelector('#examenTitulo')?.value || examen.titulo;
      const descripcion = raiz.querySelector('#examenDescripcion')?.value || examen.descripcion;
      if (!titulo.trim()) { alert('El título es obligatorio'); return; }
      const preguntasValidas = examen.preguntas.filter(p => p.texto.trim());
      if (preguntasValidas.length === 0) { alert('Agrega al menos una pregunta'); return; }
      try {
        const datos = {
          id: examen.id || undefined,
          grupo_id: examen.grupo_id,
          creado_por: examen.creado_por,
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
        await window.examenesRepository.guardar(datos);
        await window.adminRepository.registrarAuditoria(
          publicar ? 'examen:publicar' : 'examen:guardar',
          `Examen "${titulo.trim()}" (${preguntasValidas.length} preguntas)`,
          examen.creado_por, examen.grupo_id
        );
        router.navegar('/examenes');
      } catch (e) { alert('Error al guardar: ' + e.message); }
    }
  };
})();
