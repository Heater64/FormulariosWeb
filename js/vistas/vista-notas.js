(function () {
  'use strict';

  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  window.vistaNotas = {

    _conectarGestoVolver(raiz, alVolver) {
      if (this._gestoDestruir) { this._gestoDestruir(); this._gestoDestruir = null; }
      if (!window.gestosNavegacion) return;
      const cont = raiz.firstElementChild || raiz;
      this._gestoDestruir = window.gestosNavegacion.initGestosNavegacion(cont, {
        onDerecha: () => { if (typeof alVolver === 'function') alVolver(); },
      });
    },

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? window.skeleton.notas() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        const [notas, libros] = await Promise.all([
          window.notasRepository.listar(usuario.id, 'personal'),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
        ]);
        this._pintar(raiz, { notas, libros: libros.data || [], usuario });
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar notas</p></div>';
      }

    },

    desmontar() {
      if (this._gestoDestruir) { this._gestoDestruir(); this._gestoDestruir = null; }
    },

    /* ── Vista principal: lista de libros ── */
    _pintar(raiz, d) {
      if (this._gestoDestruir) { this._gestoDestruir(); this._gestoDestruir = null; }
      const { notas } = d;

      if (notas.length === 0) {
        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <h2>${I('file-text')} Notas personales</h2>
            <button class="btn-primario" id="btnNueva" style="width:100%;justify-content:center">${I('plus')} Nueva nota</button>
            <div class="u-texto-centrado o-pila u-mt-4" style="align-items:center">
              <p style="font-size:3rem;color:var(--color-texto-terciario);display:flex;justify-content:center">${I('file-text')}</p>
              <p class="u-color-texto-secundario">Aún no tienes notas personales.</p>
              <p class="u-fs-xs u-color-texto-terciario">Escribe notas mientras estudias o crea una desde aquí.</p>
            </div>
          </div>`;
        raiz.querySelector('#btnNueva').onclick = () => this._nuevaNota(raiz, d);
        return;
      }

      const porLibro = {};
      notas.forEach((n) => {
        if (!porLibro[n.libro_nombre]) porLibro[n.libro_nombre] = [];
        porLibro[n.libro_nombre].push(n);
      });

      const todasNotasFlat = notas;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
            <h2>${I('file-text')} Notas personales</h2>
          </div>
          <div class="notas-buscar" style="position:relative">
            <span style="position:absolute;left:var(--espaciado-sm);top:50%;transform:translateY(-50%);color:var(--color-texto-terciario);display:flex">${I('search')}</span>
            <input type="text" id="buscarNotas" placeholder="Buscar en todas las notas..." style="width:100%;padding-left:2.2rem">
          </div>
          <div id="resultadosBusqueda" class="o-pila" style="display:none"></div>
          <button class="btn-primario" id="btnNueva" style="width:100%;justify-content:center">${I('plus')} Nueva nota</button>
          <div class="o-pila" id="listaNotasLibros">
            ${Object.entries(porLibro).map(([libro, items]) => `
              <div class="tarjeta-capitulo" style="cursor:pointer" data-libro="${E(libro)}" title="Ver notas guardadas para ${E(libro)}">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">${I('book-open')} ${E(libro)}</span>
                  <span class="u-fs-xs u-color-texto-terciario" title="Número de notas en este libro">${items.length} nota${items.length === 1 ? '' : 's'}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;

      window.Iconos.actualizar();
      raiz.querySelector('#btnNueva').onclick = () => this._nuevaNota(raiz, d);
      $$(raiz, '[data-libro]').forEach((el) => {
        el.onclick = () => this._listaCapitulos(raiz, el.dataset.libro, d);
      });

      // Search handler
      const buscarInput = raiz.querySelector('#buscarNotas');
      const resultadosDiv = raiz.querySelector('#resultadosBusqueda');
      const listaLibrosDiv = raiz.querySelector('#listaNotasLibros');
      buscarInput.addEventListener('input', () => {
        const q = buscarInput.value.toLowerCase().trim();
        if (q.length < 2) {
          resultadosDiv.style.display = 'none';
          listaLibrosDiv.style.display = '';
          return;
        }
        const resultados = todasNotasFlat.filter(n =>
          (n.contenido && n.contenido.toLowerCase().includes(q)) ||
          (n.titulo && n.titulo.toLowerCase().includes(q)) ||
          (n.libro_nombre && n.libro_nombre.toLowerCase().includes(q))
        );
        if (resultados.length === 0) {
          resultadosDiv.innerHTML = '<p class="u-color-texto-terciario u-fs-sm u-mt-2">Sin resultados</p>';
        } else {
          resultadosDiv.innerHTML = resultados.slice(0, 20).map(n => `
            <div class="tarjeta-capitulo" style="cursor:pointer;padding:var(--espaciado-sm)" data-id="${n.id}">
              <div class="o-flecha o-flecha--between" style="gap:var(--espaciado-xs);flex-wrap:wrap">
                <span class="u-fw-600 u-fs-sm">${I('file-text')} ${E(n.titulo || 'Nota')}</span>
                <span class="u-fs-xs u-color-texto-terciario">${E(n.libro_nombre)} ${n.capitulo_numero || ''}</span>
              </div>
              <p class="u-fs-xs u-color-texto-secundario u-mt-1 truncar-2">${E((n.contenido || '').slice(0, 120))}${(n.contenido || '').length > 120 ? '...' : ''}</p>
            </div>
          `).join('');
          resultadosDiv.querySelectorAll('[data-id]').forEach(el => {
            el.onclick = () => {
              const n = todasNotasFlat.find(x => x.id === el.dataset.id);
              if (n) this._verNota(raiz, n, d);
            };
          });
        }
        resultadosDiv.style.display = '';
        listaLibrosDiv.style.display = 'none';
        window.Iconos?.actualizar?.();
      });
    },

    /* ── Lista de capítulos ── */
    _listaCapitulos(raiz, libro, d) {
      const delLibro = d.notas.filter((n) => n.libro_nombre === libro);
      const porCap = {};
      delLibro.forEach((n) => {
        const c = String(n.capitulo_numero);
        if (!porCap[c]) porCap[c] = [];
        porCap[c].push(n);
      });
      const orden = Object.keys(porCap).sort((a, b) => parseInt(a) - parseInt(b));

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('book-open')} ${E(libro)}</h2>
          <div class="o-pila">
            ${orden.map((cap) => `
              <div class="tarjeta-capitulo" style="cursor:pointer" data-cap="${cap}" title="Ver notas del capítulo ${cap}">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">Capítulo ${cap}</span>
                  <span class="u-fs-xs u-color-texto-terciario" title="Número de notas en este capítulo">${porCap[cap].length} nota${porCap[cap].length === 1 ? '' : 's'}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._pintar(raiz, d);
      this._conectarGestoVolver(raiz, () => this._pintar(raiz, d));
      $$(raiz, '[data-cap]').forEach((el) => {
        el.onclick = () => this._listaNotasCap(raiz, libro, parseInt(el.dataset.cap, 10), d);
      });
    },

    /* ── Lista de notas de un capítulo (puede haber varias) ── */
    _listaNotasCap(raiz, libro, capitulo, d) {
      const notasCap = d.notas
        .filter((n) => n.libro_nombre === libro && String(n.capitulo_numero) === String(capitulo))
        .sort((a, b) => new Date(a.creado_en || 0) - new Date(b.creado_en || 0));

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I('book-open')} ${E(libro)} ${capitulo}</h2>
            <button class="btn-primario u-fs-xs" id="btnNuevaAqui">${I('plus')} Otra nota</button>
          </div>
          <div class="o-pila" id="listaNotasCap">
            ${notasCap.map((n, i) => this._tarjetaNota(n, i, libro, capitulo, d)).join('')}
          </div>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._listaCapitulos(raiz, libro, d);
      this._conectarGestoVolver(raiz, () => this._listaCapitulos(raiz, libro, d));
      raiz.querySelector('#btnNuevaAqui').onclick = () => this._nuevaNota(raiz, d, libro, capitulo);
      this._engancharNotas(raiz, libro, capitulo, d);
    },

    _tarjetaNota(n, i, libro, capitulo, d) {
      const titulo = n.titulo || `Nota ${i + 1}`;
      return `
        <div class="tarjeta-capitulo o-pila" data-id="${n.id}" style="gap:var(--espaciado-sm);cursor:pointer" title="Leer esta nota">
          <div class="o-flecha o-flecha--between">
            <span class="u-fw-600">${E(titulo)}</span>
            <div class="o-flecha" style="gap:4px" onclick="event.stopPropagation()">
              <button class="btn-icono" data-edit="${n.id}" aria-label="Editar nota" title="Editar nota">${I('pencil')}<span class="u-fs-xs u-fw-600" style="margin-left:2px">Editar</span></button>
              <button class="btn-icono btn-icono--peligro" data-del="${n.id}" aria-label="Eliminar nota" title="Eliminar nota">${I('trash-2')}<span class="u-fs-xs u-fw-600" style="margin-left:2px">Eliminar</span></button>
            </div>
          </div>
          <div class="nota-contenido" style="font-size:var(--texto-sm);line-height:1.7;color:var(--color-texto)">${n.contenido}</div>
          <p class="u-fs-xs u-color-texto-terciario" title="Fecha de última edición">Última edición: ${window.helpers.formatearFecha(n.actualizado_en || n.creado_en)}</p>
        </div>`;
    },

    _engancharNotas(raiz, libro, capitulo, d) {
      const cont = raiz.querySelector('#listaNotasCap');
      if (!cont) return;
      cont.querySelectorAll('[data-id]').forEach((el) => {
        const id = el.dataset.id;
        el.onclick = () => { const n = d.notas.find(x => x.id === id); if (n) this._verNota(raiz, n, d); };
      });
      cont.querySelectorAll('[data-edit]').forEach((b) => {
        b.onclick = () => { const n = d.notas.find(x => x.id === b.dataset.edit); if (n) this._editarNota(raiz, n, d); };
      });
      cont.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = async () => {
          const id = b.dataset.del;
          const ok = await window.helpers.confirmar('¿Eliminar esta nota personal?', { titulo: 'Eliminar nota', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.notasRepository.eliminar(id);
            window.helpers.mostrarAlerta('Nota eliminada.', 'exito');
            d.notas = d.notas.filter((x) => x.id !== id);
            const quedan = d.notas.filter((x) => x.libro_nombre === libro && String(x.capitulo_numero) === String(capitulo));
            if (quedan.length === 0) this._listaCapitulos(raiz, libro, d);
            else this._listaNotasCap(raiz, libro, capitulo, d);
          } catch {
            window.helpers.mostrarAlerta('Error al eliminar.', 'error');
          }
        };
      });
    },

    /* ── Ver nota individual ── */
    _verNota(raiz, nota, d) {
      const libro = nota.libro_nombre, capitulo = nota.capitulo_numero;
      const notasCap = d.notas.filter((n) => n.libro_nombre === libro && String(n.capitulo_numero) === String(capitulo));
      const idx = Math.max(0, notasCap.findIndex(n => n.id === nota.id));
      const titulo = nota.titulo || `Nota ${idx + 1}`;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('book-open')} ${E(libro)} ${capitulo}</h2>
          <div class="tarjeta-capitulo o-pila" style="gap:var(--espaciado-sm)">
            <div class="o-flecha o-flecha--between">
              <span class="u-fw-600">${E(titulo)}</span>
              <div class="o-flecha" style="gap:4px">
                <button class="btn-icono" id="btnEdit" aria-label="Editar nota">${I('pencil')}<span class="u-fs-xs u-fw-600" style="margin-left:2px">Editar</span></button>
                <button class="btn-icono btn-icono--peligro" id="btnDel" aria-label="Eliminar nota">${I('trash-2')}<span class="u-fs-xs u-fw-600" style="margin-left:2px">Eliminar</span></button>
              </div>
            </div>
            <div class="nota-contenido" style="font-size:var(--texto-sm);line-height:1.7;color:var(--color-texto)">${nota.contenido}</div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario">Última edición: ${window.helpers.formatearFecha(nota.actualizado_en || nota.creado_en)}</p>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._listaNotasCap(raiz, libro, capitulo, d);
      this._conectarGestoVolver(raiz, () => this._listaNotasCap(raiz, libro, capitulo, d));
      raiz.querySelector('#btnEdit').onclick = () => this._editarNota(raiz, nota, d);
      raiz.querySelector('#btnDel').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Eliminar esta nota personal?', { titulo: 'Eliminar nota', textoConfirmar: 'Eliminar' });
        if (!ok) return;
        try {
          await window.notasRepository.eliminar(nota.id);
          window.helpers.mostrarAlerta('Nota eliminada.', 'exito');
          d.notas = d.notas.filter((n) => n.id !== nota.id);
          const quedan = d.notas.filter((n) => n.libro_nombre === libro && String(n.capitulo_numero) === String(capitulo));
          if (quedan.length === 0) this._listaCapitulos(raiz, libro, d);
          else this._listaNotasCap(raiz, libro, capitulo, d);
        } catch {
          window.helpers.mostrarAlerta('Error al eliminar.', 'error');
        }
      };
    },

    /* ── Editar nota existente (por id) ── */
    _editarNota(raiz, nota, d) {
      const libro = nota.libro_nombre, capitulo = nota.capitulo_numero;
      let _tiptapEditor = null;
      let _autoSave = null;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('pencil')} Editar nota — ${E(libro)} ${capitulo}</h2>
          <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap;padding:var(--espaciado-xs) 0">
            <button type="button" class="btn-icono" id="tip-bold" title="Negrita" aria-label="Negrita">${I('bold')}</button>
            <button type="button" class="btn-icono" id="tip-italic" title="Cursiva" aria-label="Cursiva">${I('italic')}</button>
            <button type="button" class="btn-icono" id="tip-underline" title="Subrayado" aria-label="Subrayado">${I('underline')}</button>
            <span style="width:1px;background:var(--color-borde);margin:0 4px"></span>
            <button type="button" class="btn-icono" id="tip-list" title="Lista" aria-label="Lista">${I('list')}</button>
            <button type="button" class="btn-icono" id="tip-heading" title="Título" aria-label="Título">${I('heading')}</button>
            <span style="width:1px;background:var(--color-borde);margin:0 4px"></span>
            <button type="button" class="btn-icono" id="tip-undo" title="Deshacer" aria-label="Deshacer">${I('undo')}</button>
            <button type="button" class="btn-icono" id="tip-redo" title="Rehacer" aria-label="Rehacer">${I('redo')}</button>
            <span style="width:1px;background:var(--color-borde);margin:0 4px"></span>
            <button type="button" class="btn-icono" id="btnVersiones" title="Historial de versiones" aria-label="Historial de versiones" style="font-size:var(--texto-xs)">${I('clock')} Versiones</button>
          </div>
          <div id="fContenido" style="width:100%;min-height:200px;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)"></div>
          <div class="o-flecha o-flecha--between u-mt-1">
            <span class="u-fs-xs u-color-texto-terciario" id="versionStatus"></span>
            <button class="btn-primario" id="btnGuardar" style="width:auto;justify-content:center">Guardar cambios</button>
          </div>
          <div id="versionesPanel" style="display:none" class="o-pila u-mt-2"></div>
        </div>`;

      raiz.querySelector('#btnV').onclick = async () => {
        if (_tiptapEditor) { window.editorTiptap.destruir(_tiptapEditor); _tiptapEditor = null; }
        if (_autoSave) _autoSave.detener();
        this._verNota(raiz, nota, d);
      };
      this._conectarGestoVolver(raiz, async () => {
        if (_tiptapEditor) { window.editorTiptap.destruir(_tiptapEditor); _tiptapEditor = null; }
        if (_autoSave) _autoSave.detener();
        this._verNota(raiz, nota, d);
      });

      // Initialize TipTap editor
      const editorEl = raiz.querySelector('#fContenido');
      window.editorTiptap.crear(editorEl, nota.contenido, {
        ariaLabel: 'Editor de nota',
        onUpdate: (html) => {
          if (_autoSave) _autoSave.trigger();
        }
      }).then(editor => {
        _tiptapEditor = editor;
        window.Iconos.actualizar();

        // Toolbar
        const exec = (cmd, attr) => { editor.chain().focus()[cmd](attr).run(); };
        raiz.querySelector('#tip-bold').onclick = () => exec('toggleBold');
        raiz.querySelector('#tip-italic').onclick = () => exec('toggleItalic');
        raiz.querySelector('#tip-underline').onclick = () => exec('toggleUnderline');
        raiz.querySelector('#tip-list').onclick = () => exec('toggleBulletList');
        raiz.querySelector('#tip-heading').onclick = () => exec('toggleHeading', { level: 3 });
        raiz.querySelector('#tip-undo').onclick = () => exec('undo');
        raiz.querySelector('#tip-redo').onclick = () => exec('redo');

        // Version history auto-save
        _autoSave = window.versionHistory.iniciarAutoSave(
          nota.id,
          () => editor.getHTML(),
          () => {
            const status = raiz.querySelector('#versionStatus');
            if (status) status.textContent = 'Versión guardada ' + new Date().toLocaleTimeString();
          }
        );
        editor.on('update', () => { if (_autoSave) _autoSave.trigger(); });

        // View versions
        raiz.querySelector('#btnVersiones').onclick = async () => {
          const panel = raiz.querySelector('#versionesPanel');
          if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
          const versiones = await window.versionHistory.listar(nota.id);
          if (!versiones.length) {
            panel.innerHTML = '<p class="u-fs-xs u-color-texto-terciario">Sin versiones anteriores.</p>';
          } else {
            panel.innerHTML = '<p class="u-fs-xs u-fw-600">Versiones anteriores:</p>' +
              versiones.slice(0, 20).map(v => `
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-xs);cursor:pointer" data-version-id="${v.id}">
                  <div class="o-flecha o-flecha--between u-fs-xs">
                    <span>${new Date(v.creado).toLocaleString()}</span>
                    <button class="btn-enlace u-fs-xs restaurar-version" data-vid="${v.id}">Restaurar</button>
                  </div>
                </div>
              `).join('');
            panel.querySelectorAll('.restaurar-version').forEach(btn => {
              btn.onclick = async (e) => {
                e.stopPropagation();
                const v = await window.versionHistory.obtener(btn.dataset.vid);
                if (v && v.contenido && _tiptapEditor) {
                  _tiptapEditor.commands.setContent(v.contenido);
                  window.helpers.mostrarAlerta('Versión restaurada.', 'exito');
                  panel.style.display = 'none';
                }
              };
            });
          }
          panel.style.display = '';
        };
      });

      raiz.querySelector('#btnGuardar').onclick = async () => {
        if (!_tiptapEditor) return;
        const contenido = _tiptapEditor.getHTML().trim();
        if (!contenido || contenido === '<p></p>') { window.helpers.mostrarAlerta('La nota no puede estar vacía.', 'advertencia'); return; }
        try {
          await window.notasRepository.guardar(d.usuario.id, libro, capitulo, contenido, { id: nota.id, tipo: 'personal', titulo: nota.titulo });
          nota.contenido = contenido;
          nota.actualizado_en = new Date().toISOString();
          if (_autoSave) await _autoSave.guardarAhora();
          if (window.haptica) window.haptica.exito();
          window.helpers.mostrarAlerta('Nota actualizada.', 'exito');
          if (_tiptapEditor) { window.editorTiptap.destruir(_tiptapEditor); _tiptapEditor = null; }
          if (_autoSave) _autoSave.detener();
          this._verNota(raiz, nota, d);
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
        }
      };
    },

    /* ── Nueva nota ── */
    _nuevaNota(raiz, d, libroPre, capPre) {
      const opts = (d.libros || []).map((l) => l.nombre);
      let _tiptapEditor = null;
      let _autoSave = null;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('plus')} Nueva nota</h2>
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm u-fw-600">Libro</label>
            <select id="fLibro" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
              ${opts.map((l) => `<option value="${E(l)}" ${libroPre === l ? 'selected' : ''}>${E(l)}</option>`).join('')}
            </select>
            <label class="u-fs-sm u-fw-600">Capítulo</label>
            <input type="number" id="fCap" min="1" placeholder="Ej: 3" value="${capPre || ''}" style="width:100%">
            <label class="u-fs-sm u-fw-600">Contenido de la nota *</label>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap;padding:var(--espaciado-xs) 0">
              <button type="button" class="btn-icono" id="tip-bold" title="Negrita" aria-label="Negrita">${I('bold')}</button>
              <button type="button" class="btn-icono" id="tip-italic" title="Cursiva" aria-label="Cursiva">${I('italic')}</button>
              <button type="button" class="btn-icono" id="tip-underline" title="Subrayado" aria-label="Subrayado">${I('underline')}</button>
              <span style="width:1px;background:var(--color-borde);margin:0 4px"></span>
              <button type="button" class="btn-icono" id="tip-list" title="Lista" aria-label="Lista">${I('list')}</button>
              <button type="button" class="btn-icono" id="tip-heading" title="Título" aria-label="Título">${I('heading')}</button>
              <span style="width:1px;background:var(--color-borde);margin:0 4px"></span>
              <button type="button" class="btn-icono" id="tip-undo" title="Deshacer" aria-label="Deshacer">${I('undo')}</button>
              <button type="button" class="btn-icono" id="tip-redo" title="Rehacer" aria-label="Rehacer">${I('redo')}</button>
            </div>
            <div id="fContenido" style="width:100%;min-height:200px;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)"></div>
          </div>
          <div class="o-flecha o-flecha--between u-mt-1">
            <span class="u-fs-xs u-color-texto-terciario" id="versionStatus"></span>
            <button class="btn-primario" id="btnGuardar" style="width:auto;justify-content:center">Guardar</button>
          </div>
        </div>`;

      const volver = () => {
        if (_tiptapEditor) { window.editorTiptap.destruir(_tiptapEditor); _tiptapEditor = null; }
        if (_autoSave) _autoSave.detener();
        if (libroPre && capPre) this._listaNotasCap(raiz, libroPre, capPre, d);
        else this._pintar(raiz, d);
      };
      raiz.querySelector('#btnV').onclick = volver;
      this._conectarGestoVolver(raiz, volver);

      // Initialize TipTap
      const editorEl = raiz.querySelector('#fContenido');
      window.editorTiptap.crear(editorEl, '<p></p>', {
        ariaLabel: 'Editor de nota',
        onUpdate: () => { if (_autoSave) _autoSave.trigger(); }
      }).then(editor => {
        _tiptapEditor = editor;
        window.Iconos.actualizar();
        const exec = (cmd, attr) => { editor.chain().focus()[cmd](attr).run(); };
        raiz.querySelector('#tip-bold').onclick = () => exec('toggleBold');
        raiz.querySelector('#tip-italic').onclick = () => exec('toggleItalic');
        raiz.querySelector('#tip-underline').onclick = () => exec('toggleUnderline');
        raiz.querySelector('#tip-list').onclick = () => exec('toggleBulletList');
        raiz.querySelector('#tip-heading').onclick = () => exec('toggleHeading', { level: 3 });
        raiz.querySelector('#tip-undo').onclick = () => exec('undo');
        raiz.querySelector('#tip-redo').onclick = () => exec('redo');
      });

      raiz.querySelector('#btnGuardar').onclick = async () => {
        const libro = raiz.querySelector('#fLibro').value;
        const cap = raiz.querySelector('#fCap').value.trim();
        const contenido = _tiptapEditor ? _tiptapEditor.getHTML().trim() : '';

        if (!libro) { window.helpers.mostrarAlerta('Selecciona un libro.', 'advertencia'); return; }
        if (!cap) { window.helpers.mostrarAlerta('Escribe el capítulo.', 'advertencia'); return; }
        if (!contenido || contenido === '<p></p>') { window.helpers.mostrarAlerta('Escribe el contenido de la nota.', 'advertencia'); return; }

        const capitulo = parseInt(cap, 10);
        const num = await window.notasRepository.contarPorCapitulo(d.usuario.id, libro, capitulo) + 1;

        try {
          await window.notasRepository.guardar(d.usuario.id, libro, capitulo, contenido, { tipo: 'personal', titulo: `Nota ${num}` });
          if (window.haptica) window.haptica.exito();
          window.helpers.mostrarAlerta('Nota guardada.', 'exito');
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
          return;
        }

        if (_tiptapEditor) { window.editorTiptap.destruir(_tiptapEditor); _tiptapEditor = null; }
        if (_autoSave) _autoSave.detener();
        d.notas = await window.notasRepository.listar(d.usuario.id, 'personal');
        this._listaNotasCap(raiz, libro, capitulo, d);
      };
    },
  };
})();
