(function () {
  'use strict';

  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  const COLORES = [
    { id: 'blanco', nombre: 'Blanco', css: 'var(--color-fondo-tarjeta)' },
    { id: 'crema', nombre: 'Crema', css: '#FFF8E1' },
    { id: 'amarillo', nombre: 'Amarillo', css: '#FFF9C4' },
    { id: 'verde', nombre: 'Verde', css: '#E8F5E9' },
    { id: 'azul', nombre: 'Azul', css: '#E3F2FD' },
    { id: 'rosa', nombre: 'Rosa', css: '#FCE4EC' },
    { id: 'morado', nombre: 'Morado', css: '#F3E5F5' },
    { id: 'gris', nombre: 'Gris', css: '#ECEFF1' },
  ];

  /* ── Utilidades ── */

  function tiempoRelativo(iso) {
    if (!iso) return '';
    const fecha = new Date(iso);
    const diff = Date.now() - fecha.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Ahora mismo';
    if (min < 60) return `Hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  function extraerPreview(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    const txt = div.textContent || '';
    const lineas = txt.split('\n').map(l => l.trim()).filter(Boolean);
    return lineas.slice(0, 2).join(' ').slice(0, 140);
  }

  function extraerMiniatura(html) {
    if (!html) return null;
    const div = document.createElement('div');
    div.innerHTML = html;
    const img = div.querySelector('img');
    return img ? (img.getAttribute('src') || null) : null;
  }

  function textoPlano(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').trim();
  }

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
      this._raiz = raiz;
      this._usuario = usuario;
      this._limpiarEditor();

      raiz.innerHTML = window.skeleton ? window.skeleton.notas() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        const notas = await window.notasRepository.listarPersonales(usuario.id);
        this._pintarHome(raiz, notas);
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar notas</p></div>';
      }
    },

    desmontar() {
      // No perder los últimos cambios si el usuario navega (back del navegador,
      // cambio de hash o deep-link) mientras edita: el autosave con debounce de
      // 900ms podría no haber llegado a guardar aún.
      if (this._sucia && this._notaActual) {
        this._guardarAhora(); // fire-and-forget: la vista ya se está yendo
      }
      this._limpiarEditor();
      if (this._gestoDestruir) { this._gestoDestruir(); this._gestoDestruir = null; }
      if (this._navOculta) {
        const nav = document.getElementById('barra-navegacion');
        if (nav) nav.style.display = '';
        this._navOculta = false;
      }
      this._raiz = null;
    },

    _limpiarEditor() {
      if (this._tiptapEditor) {
        try { window.editorTiptap.destruir(this._tiptapEditor); } catch (e) {}
        this._tiptapEditor = null;
      }
      if (this._autosaveTimer) { clearTimeout(this._autosaveTimer); this._autosaveTimer = null; }
    },

    /* ═══════════════════════ PANTALLA PRINCIPAL ═══════════════════════ */

    async _pintarHome(raiz, notas) {
      this._limpiarEditor();
      this._notas = notas || [];
      if (this._navOculta) {
        const nav = document.getElementById('barra-navegacion');
        if (nav) nav.style.display = '';
        this._navOculta = false;
      }

      const pinIcon = (n) => n.fijada ? `<span class="nota-item__pin" title="Nota fijada">${I('pin')}</span>` : '';

      raiz.innerHTML = `
        <div class="notas-home">
          <header class="notas-cabecera">
            <h1 class="notas-cabecera__titulo">Notas</h1>
            <button class="btn-icono notas-cabecera__papelera" id="btnPapelera" aria-label="Papelera" title="Papelera">${I('trash-2')}</button>
          </header>

          <div class="notas-buscar">
            <span class="notas-buscar__icono">${I('search')}</span>
            <input type="text" id="buscarNotas" placeholder="Buscar notas…" autocomplete="off" aria-label="Buscar notas">
            <button class="notas-buscar__limpiar" id="btnLimpiarBusqueda" aria-label="Limpiar búsqueda" style="display:none">×</button>
          </div>

          <div class="notas-lista" id="listaNotas">
            ${this._renderizarLista(this._notas, '')}
          </div>

          <div class="notas-fab" id="btnNueva" role="button" tabindex="0" aria-label="Nueva nota" title="Nueva nota">${I('plus')}</div>
        </div>`;

      window.Iconos.actualizar();

      raiz.querySelector('#btnPapelera').onclick = () => this._pintarPapelera(raiz);
      raiz.querySelector('#btnNueva').onclick = () => this._nuevaNota(raiz);
      raiz.querySelector('#btnNueva').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._nuevaNota(raiz); }
      });

      const buscarInput = raiz.querySelector('#buscarNotas');
      const limpiarBtn = raiz.querySelector('#btnLimpiarBusqueda');
      buscarInput.addEventListener('input', () => {
        const q = buscarInput.value.toLowerCase().trim();
        limpiarBtn.style.display = q ? '' : 'none';
        const cont = raiz.querySelector('#listaNotas');
        cont.innerHTML = this._renderizarLista(this._notas, q);
        this._engancharLista(raiz, cont);
        if (q && cont.querySelectorAll('.nota-item').length === 0) {
          cont.innerHTML = `<div class="notas-vacio">
            <span class="notas-vacio__icono">${I('search')}</span>
            <p>Sin resultados para «${E(q)}»</p>
            <span class="notas-vacio__sub">Prueba con otras palabras.</span>
          </div>`;
          window.Iconos.actualizar();
        }
        window.Iconos.actualizar();
      });
      limpiarBtn.onclick = () => {
        buscarInput.value = '';
        limpiarBtn.style.display = 'none';
        buscarInput.dispatchEvent(new Event('input'));
        buscarInput.focus();
      };

      this._engancharLista(raiz, raiz.querySelector('#listaNotas'));
      this._conectarGestoVolver(raiz, () => { if (this._papeleraActiva) this._pintarHome(raiz, this._notas); });
    },

    _renderizarLista(notas, q) {
      const filtradas = this._filtrar(notas, q);
      if (filtradas.length === 0 && !q) {
        return `<div class="notas-vacio">
          <span class="notas-vacio__icono">${I('file-text')}</span>
          <p class="notas-vacio__titulo">Aún no tienes notas</p>
          <span class="notas-vacio__sub">Pulsa + para crear tu primera nota.</span>
        </div>`;
      }
      return filtradas.map(n => this._itemNota(n)).join('');
    },

    _filtrar(notas, q) {
      if (!q) return notas;
      return notas.filter(n => {
        const enTitulo = (n.titulo || '').toLowerCase().includes(q);
        const enContenido = (textoPlano(n.contenido) || '').toLowerCase().includes(q);
        return enTitulo || enContenido;
      });
    },

    _itemNota(n) {
      const mini = extraerMiniatura(n.contenido);
      const color = COLORES.find(c => c.id === n.color_fondo) || COLORES[0];
      return `
        <button class="nota-item" data-id="${n.id}" data-color="${E(n.color_fondo || 'blanco')}" style="--nota-color:${color.css}" aria-label="Abrir ${E(n.titulo || 'nota')}">
          ${mini
            ? `<span class="nota-item__miniatura"><img src="${mini}" alt="" loading="lazy"></span>`
            : `<span class="nota-item__icono">${I('file-text')}</span>`}
          <span class="nota-item__cuerpo">
            <span class="nota-item__fila">
              <span class="nota-item__titulo">${E(n.titulo || 'Sin título')}</span>
              ${n.fijada ? `<span class="nota-item__pin" title="Nota fijada">${I('pin')}</span>` : ''}
            </span>
            ${n.contenido ? `<span class="nota-item__preview">${E(extraerPreview(n.contenido))}</span>` : ''}
            <span class="nota-item__fecha">${tiempoRelativo(n.actualizado_en || n.creado_en)}</span>
          </span>
        </button>`;
    },

    _engancharLista(raiz, cont) {
      $$(cont, '.nota-item').forEach((el) => {
        el.onclick = () => {
          const n = this._notas.find(x => x.id === el.dataset.id);
          if (n) this._pintarEditor(raiz, n);
        };
      });
    },

    /* ═══════════════════════ PAPELERA ═══════════════════════ */

    async _pintarPapelera(raiz) {
      this._papeleraActiva = true;
      this._limpiarEditor();
      raiz.innerHTML = `
        <div class="notas-home">
          <header class="notas-cabecera">
            <button class="btn-icono" id="btnVolverPapelera" aria-label="Volver a notas" title="Volver">${I('chevron-left')}</button>
            <h1 class="notas-cabecera__titulo">Papelera</h1>
            <span class="notas-cabecera__spacer"></span>
          </header>
          <div class="notas-lista" id="listaPapelera">
            <div class="o-pila u-mt-3" style="align-items:center;gap:var(--espaciado-sm)"><span class="u-color-texto-terciario">Cargando…</span></div>
          </div>
        </div>`;
      const volverHome = async () => {
        this._papeleraActiva = false;
        try { this._notas = await window.notasRepository.listarPersonales(this._usuario.id); } catch (e) {}
        this._pintarHome(raiz, this._notas);
      };
      raiz.querySelector('#btnVolverPapelera').onclick = volverHome;
      this._conectarGestoVolver(raiz, volverHome);

      let papelera = [];
      try {
        papelera = await window.notasRepository.listarPapelera(this._usuario.id);
      } catch (e) { papelera = []; }
      const cont = raiz.querySelector('#listaPapelera');
      if (papelera.length === 0) {
        cont.innerHTML = `<div class="notas-vacio">
          <span class="notas-vacio__icono">${I('trash-2')}</span>
          <p class="notas-vacio__titulo">La papelera está vacía</p>
          <span class="notas-vacio__sub">Las notas que elimines aparecerán aquí.</span>
        </div>`;
        window.Iconos.actualizar();
        return;
      }
      cont.innerHTML = papelera.map(n => `
        <div class="nota-item nota-item--papelera" data-id="${n.id}">
          <span class="nota-item__icono">${I('file-text')}</span>
          <span class="nota-item__cuerpo">
            <span class="nota-item__fila">
              <span class="nota-item__titulo">${E(n.titulo || 'Sin título')}</span>
            </span>
            <span class="nota-item__fecha">${tiempoRelativo(n.eliminada_en || n.actualizado_en)}</span>
          </span>
          <span class="nota-item__acciones">
            <button class="btn-icono" data-restaurar="${n.id}" aria-label="Restaurar nota" title="Restaurar">${I('rotate-ccw')}</button>
            <button class="btn-icono btn-icono--peligro" data-eliminar="${n.id}" aria-label="Eliminar definitivamente" title="Eliminar definitivamente">${I('trash-2')}</button>
          </span>
        </div>`).join('');
      window.Iconos.actualizar();

      $$(cont, '[data-restaurar]').forEach(btn => {
        btn.onclick = async () => {
          try {
            await window.notasRepository.restaurarPersonal(btn.dataset.restaurar, this._usuario.id);
            this._notas = await window.notasRepository.listarPersonales(this._usuario.id);
            window.helpers.mostrarAlerta('Nota restaurada.', 'exito');
            this._pintarPapelera(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error al restaurar.', 'error'); }
        };
      });
      $$(cont, '[data-eliminar]').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('Esta nota se eliminará para siempre. Esta acción no se puede deshacer.', {
            titulo: 'Eliminar definitivamente', textoConfirmar: 'Eliminar'
          });
          if (!ok) return;
          try {
            await window.notasRepository.eliminarDefinitivo(btn.dataset.eliminar, this._usuario.id);
            window.helpers.mostrarAlerta('Nota eliminada.', 'exito');
            this._pintarPapelera(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error al eliminar.', 'error'); }
        };
      });
    },

    /* ═══════════════════════ EDITOR ═══════════════════════ */

    _nuevaNota(raiz) {
      this._pintarEditor(raiz, null);
    },

    async _pintarEditor(raiz, nota) {
      this._limpiarEditor();
      this._papeleraActiva = false;

      // Ocultar la barra de navegación para una experiencia inmersiva
      const nav = document.getElementById('barra-navegacion');
      if (nav) { nav.style.display = 'none'; this._navOculta = true; }

      const esNueva = !nota;
      const notaTmp = esNueva
        ? { id: null, titulo: '', contenido: '', color_fondo: 'blanco', fijada: false, creado_en: null }
        : { ...nota };
      this._notaActual = notaTmp;
      this._esNueva = esNueva;
      this._sucia = false;
      this._guardando = false;

      const color = COLORES.find(c => c.id === notaTmp.color_fondo) || COLORES[0];

      raiz.innerHTML = `
        <div class="notas-editor" data-color="${E(notaTmp.color_fondo)}" style="--nota-color:${color.css}">
          <header class="notas-editor__cabecera">
            <button class="btn-icono notas-editor__btn" id="btnVolver" aria-label="Volver a notas" title="Volver">${I('chevron-left')}</button>
            <span class="notas-editor__estado" id="estadoGuardado" aria-live="polite"></span>
            <span class="notas-editor__acciones">
              <button class="btn-icono notas-editor__btn" id="btnUndo" aria-label="Deshacer" title="Deshacer" disabled>${I('undo-2')}</button>
              <button class="btn-icono notas-editor__btn" id="btnRedo" aria-label="Rehacer" title="Rehacer" disabled>${I('redo-2')}</button>
              <button class="btn-icono notas-editor__btn" id="btnMenu" aria-label="Más opciones" title="Más opciones">${I('more-vertical')}</button>
            </span>
          </header>

          <div class="notas-editor__cuerpo" id="cuerpoEditor">
            <input type="text" class="notas-editor__titulo" id="tituloNota" placeholder="Título" value="${E(notaTmp.titulo || '')}" autocomplete="off" aria-label="Título de la nota">
            <p class="notas-editor__fecha" id="fechaNota">${notaTmp.actualizado_en ? this._fechaCompleta(notaTmp.actualizado_en) : 'Nueva nota'}</p>
            <div class="tiptap-editor notas-editor__texto" id="editorContenido"></div>
          </div>

          <div class="notas-editor__barra" id="barraFormato" role="toolbar" aria-label="Formato de texto">
            <button type="button" class="notas-editor__fmt" data-cmd="bold" title="Negrita" aria-label="Negrita">${I('bold')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="italic" title="Cursiva" aria-label="Cursiva">${I('italic')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="underline" title="Subrayado" aria-label="Subrayado">${I('underline')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="strike" title="Tachado" aria-label="Tachado">${I('strikethrough')}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="h1" title="Título 1" aria-label="Título 1">${I('heading-1')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="h2" title="Título 2" aria-label="Título 2">${I('heading-2')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="h3" title="Título 3" aria-label="Título 3">${I('heading-3')}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="bulletList" title="Lista" aria-label="Lista de viñetas">${I('list')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="orderedList" title="Lista numerada" aria-label="Lista numerada">${I('list-ordered')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="taskList" title="Casillas" aria-label="Lista de tareas">${I('list-checks')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="blockquote" title="Cita" aria-label="Cita">${I('quote')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="hr" title="Separador" aria-label="Separador">${I('minus')}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="image" title="Insertar imagen" aria-label="Insertar imagen">${I('image')}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="draw" title="Dibujar" aria-label="Dibujar a mano">${I('pen-tool')}</button>
          </div>
        </div>`;

      window.Iconos.actualizar();
      const exec = (cmd, attr) => { if (this._tiptapEditor) this._tiptapEditor.chain().focus()[cmd](attr).run(); };

      // ── Barra de formato ──
      $$(raiz, '.notas-editor__fmt').forEach(btn => {
        btn.onclick = () => {
          const cmd = btn.dataset.cmd;
          if (cmd === 'image') { this._insertarImagen(); return; }
          if (cmd === 'draw') { this._insertarDibujo(); return; }
          if (cmd === 'h1') return exec('toggleHeading', { level: 1 });
          if (cmd === 'h2') return exec('toggleHeading', { level: 2 });
          if (cmd === 'h3') return exec('toggleHeading', { level: 3 });
          if (cmd === 'hr') return exec('setHorizontalRule');
          exec('toggle' + cmd.charAt(0).toUpperCase() + cmd.slice(1));
        };
      });

      raiz.querySelector('#btnVolver').onclick = () => this._volverDeEditor(raiz);
      this._conectarGestoVolver(raiz, () => this._volverDeEditor(raiz));
      raiz.querySelector('#btnUndo').onclick = () => exec('undo');
      raiz.querySelector('#btnRedo').onclick = () => exec('redo');
      raiz.querySelector('#btnMenu').onclick = () => this._menuOpciones(raiz);

      // Título → autosave
      const tituloInput = raiz.querySelector('#tituloNota');
      tituloInput.addEventListener('input', () => {
        this._notaActual.titulo = tituloInput.value;
        this._marcarSucia();
        this._programarAutosave();
      });

      // ── Editor TipTap ──
      const editorEl = raiz.querySelector('#editorContenido');
      window.editorTiptap.crear(editorEl, notaTmp.contenido || '', {
        ariaLabel: 'Editor de la nota',
        placeholder: 'Escribe tu nota…',
        onUpdate: (html) => {
          this._notaActual.contenido = html;
          this._marcarSucia();
          this._programarAutosave();
          this._actualizarEstadosFormato();
        }
      }).then(editor => {
        this._tiptapEditor = editor;
        this._actualizarEstadosFormato();
        editor.on('selectionUpdate', () => this._actualizarEstadosFormato());
        editor.on('transaction', () => this._actualizarUndoRedo());
        this._actualizarUndoRedo();
        tituloInput.focus();
      });
    },

    _marcarSucia() {
      if (!this._sucia) {
        this._sucia = true;
        const est = this._raiz && this._raiz.querySelector('#estadoGuardado');
        if (est) est.textContent = 'Guardando…';
      }
    },

    _programarAutosave() {
      if (this._autosaveTimer) clearTimeout(this._autosaveTimer);
      this._autosaveTimer = setTimeout(() => this._guardarAhora(), 900);
    },

    async _guardarAhora() {
      if (this._guardando) return;
      const nota = this._notaActual;
      if (!nota) return;
      // No crear notas vacías
      const contenidoVacio = !(nota.contenido || '').trim() || nota.contenido === '<p></p>';
      const tituloVacio = !(nota.titulo || '').trim();
      if (this._esNueva && contenidoVacio && tituloVacio) {
        const est = this._raiz && this._raiz.querySelector('#estadoGuardado');
        if (est) est.textContent = '';
        this._sucia = false;
        return;
      }
      this._guardando = true;
      const est = this._raiz && this._raiz.querySelector('#estadoGuardado');
      if (est) est.textContent = 'Guardando…';
      try {
        const repo = window.notasRepository;
        let notaGuardada;
        if (this._esNueva) {
          notaGuardada = await repo.crearPersonal(this._usuario.id, {
            titulo: nota.titulo, contenido: nota.contenido, color_fondo: nota.color_fondo
          });
          this._esNueva = false;
          this._notaActual.id = notaGuardada.id;
          this._notaActual.creado_en = notaGuardada.creado_en;
        } else {
          await repo.actualizarPersonal(nota.id, {
            titulo: nota.titulo, contenido: nota.contenido, color_fondo: nota.color_fondo
          }, this._usuario.id);
          this._notaActual.actualizado_en = new Date().toISOString();
        }
        this._sucia = false;
        this._recargarListaSilenciosa();
        if (est) {
          est.textContent = 'Guardado';
          setTimeout(() => { if (est && est.textContent === 'Guardado') est.textContent = ''; }, 1800);
        }
      } catch (e) {
        if (est) est.textContent = 'Error al guardar';
      } finally {
        this._guardando = false;
      }
    },

    async _recargarListaSilenciosa() {
      try {
        const notas = await window.notasRepository.listarPersonales(this._usuario.id);
        this._notas = notas;
      } catch (e) {}
    },

    _volverDeEditor(raiz) {
      const salir = async () => {
        // Guardar siempre si hay cambios (nota existente sucia o nota nueva con contenido)
        if (this._sucia) await this._guardarAhora();
        this._limpiarEditor();
        try {
          const notas = await window.notasRepository.listarPersonales(this._usuario.id);
          this._notas = notas;
        } catch (e) {}
        if (this._raiz) this._pintarHome(raiz, this._notas);
      };
      salir();
    },

    _fechaCompleta(iso) {
      return new Date(iso).toLocaleString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    _actualizarEstadosFormato() {
      const ed = this._tiptapEditor;
      if (!ed || !this._raiz) return;
      const activo = (cmd) => {
        if (!ed) return false;
        if (cmd === 'bold') return ed.isActive('bold');
        if (cmd === 'italic') return ed.isActive('italic');
        if (cmd === 'underline') return ed.isActive('underline');
        if (cmd === 'strike') return ed.isActive('strike');
        if (cmd === 'h1') return ed.isActive('heading', { level: 1 });
        if (cmd === 'h2') return ed.isActive('heading', { level: 2 });
        if (cmd === 'h3') return ed.isActive('heading', { level: 3 });
        if (cmd === 'bulletList') return ed.isActive('bulletList');
        if (cmd === 'orderedList') return ed.isActive('orderedList');
        if (cmd === 'taskList') return ed.isActive('taskList');
        if (cmd === 'blockquote') return ed.isActive('blockquote');
        return false;
      };
      $$(this._raiz, '.notas-editor__fmt').forEach(btn => {
        btn.classList.toggle('notas-editor__fmt--activo', activo(btn.dataset.cmd));
      });
    },

    _actualizarUndoRedo() {
      const ed = this._tiptapEditor;
      if (!ed || !this._raiz) return;
      const undoBtn = this._raiz.querySelector('#btnUndo');
      const redoBtn = this._raiz.querySelector('#btnRedo');
      if (undoBtn) undoBtn.disabled = !ed.can().undo();
      if (redoBtn) redoBtn.disabled = !ed.can().redo();
    },

    _insertarImagen() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = await this._comprimirImagen(reader.result, file.type);
          if (this._tiptapEditor) {
            this._tiptapEditor.chain().focus().setImage({ src: dataUrl }).run();
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },

    // Comprime imágenes grandes a base64 más ligero (máx 1200px, JPEG 0.82).
    // Espera al evento load: sin onload, img.width es 0 y drawImage dibuja en blanco.
    _comprimirImagen(dataUrl, mime) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          const canvas = document.createElement('canvas');
          let ratio = 1;
          if (img.width > MAX) ratio = MAX / img.width;
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext('2d');
          try {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const esJpeg = (mime || '').includes('jpeg') || (mime || '').includes('jpg');
            resolve(canvas.toDataURL(esJpeg ? 'image/jpeg' : 'image/png', 0.82));
          } catch (e) {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },

    _insertarDibujo() {
      if (!window.editorDibujo) { window.helpers.mostrarAlerta('El dibujo no está disponible.', 'advertencia'); return; }
      window.editorDibujo.abrir({
        onConfirm: (dataUrl) => {
          if (this._tiptapEditor) {
            this._tiptapEditor.chain().focus().setImage({ src: dataUrl }).run();
          }
        }
      });
    },

    /* ═══════════════════════ MENÚ DE OPCIONES ═══════════════════════ */

    async _menuOpciones(raiz) {
      const nota = this._notaActual;
      if (!nota) return;
      const esNueva = this._esNueva;

      const overlay = document.createElement('div');
      overlay.className = 'notas-menu-overlay';
      overlay.innerHTML = `
        <div class="notas-menu" role="dialog" aria-modal="true" aria-label="Opciones de la nota">
          <p class="notas-menu__titulo">Opciones</p>
          <div class="notas-menu__colores" role="group" aria-label="Color de fondo">
            <span class="notas-menu__etiqueta">Color</span>
            <div class="notas-menu__paleta">
              ${COLORES.map(c => `
                <button type="button" class="notas-menu__color${c.id === nota.color_fondo ? ' notas-menu__color--activo' : ''}"
                  data-color="${c.id}" style="--c:${c.css}" aria-label="${c.nombre}" title="${c.nombre}"></button>`).join('')}
            </div>
          </div>
          <div class="notas-menu__opciones">
            <button type="button" data-accion="fijar">${I('pin')} ${nota.fijada ? 'Quitar fijación' : 'Fijar nota'}</button>
            <button type="button" data-accion="duplicar">${I('copy')} Duplicar</button>
            <button type="button" data-accion="compartir">${I('share-2')} Compartir</button>
            <button type="button" data-accion="pdf">${I('file-down')} Exportar PDF</button>
            <button type="button" data-accion="txt">${I('file-text')} Exportar TXT</button>
            <button type="button" data-accion="eliminar" class="notas-menu__peligro">${I('trash-2')} Eliminar nota</button>
          </div>
          <button type="button" class="notas-menu__cancelar" data-cerrar>Cancelar</button>
        </div>`;
      document.body.appendChild(overlay);
      window.Iconos.actualizar();

      const cerrar = () => overlay.remove();

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrar();
      });
      overlay.querySelector('[data-cerrar]').onclick = cerrar;

      // Color de fondo
      $$(overlay, '.notas-menu__color').forEach(btn => {
        btn.onclick = async () => {
          const nuevoColor = btn.dataset.color;
          nota.color_fondo = nuevoColor;
          const editorEl = raiz.querySelector('.notas-editor');
          if (editorEl) {
            editorEl.dataset.color = nuevoColor;
            const c = COLORES.find(x => x.id === nuevoColor) || COLORES[0];
            editorEl.style.setProperty('--nota-color', c.css);
          }
          $$(overlay, '.notas-menu__color').forEach(b => b.classList.toggle('notas-menu__color--activo', b.dataset.color === nuevoColor));
          this._marcarSucia();
          this._programarAutosave();
          if (nota.id) {
            await window.notasRepository.actualizarPersonal(nota.id, { color_fondo: nuevoColor }, this._usuario.id).catch(() => {});
          }
        };
      });

      overlay.querySelector('[data-accion="fijar"]').onclick = async () => {
        cerrar();
        if (esNueva && !nota.id) {
          // Asegurar que exista antes de fijar
          if (this._sucia) await this._guardarAhora();
          if (!nota.id) { window.helpers.mostrarAlerta('Escribe algo primero para fijar.', 'advertencia'); return; }
        }
        const nueva = !nota.fijada;
        await window.notasRepository.fijarPersonal(nota.id, nueva, this._usuario.id).catch(() => {});
        nota.fijada = nueva;
        window.helpers.mostrarAlerta(nueva ? 'Nota fijada.' : 'Fijación quitada.', 'exito');
      };

      overlay.querySelector('[data-accion="duplicar"]').onclick = async () => {
        cerrar();
        try {
          if (this._sucia) await this._guardarAhora();
          const fuente = this._notaActual;
          await window.notasRepository.duplicarPersonal(this._usuario.id, fuente);
          window.helpers.mostrarAlerta('Nota duplicada.', 'exito');
          const notas = await window.notasRepository.listarPersonales(this._usuario.id);
          this._notas = notas;
        } catch (e) { window.helpers.mostrarAlerta('Error al duplicar.', 'error'); }
      };

      overlay.querySelector('[data-accion="compartir"]').onclick = async () => {
        cerrar();
        if (this._sucia) await this._guardarAhora();
        const texto = (nota.titulo ? nota.titulo + '\n\n' : '') + textoPlano(nota.contenido);
        if (navigator.share) {
          try { await navigator.share({ title: nota.titulo || 'Nota', text: texto }); return; } catch (e) {}
        }
        try {
          await navigator.clipboard.writeText(texto);
          window.helpers.mostrarAlerta('Nota copiada al portapapeles.', 'exito');
        } catch (e) { window.helpers.mostrarAlerta('No se pudo compartir.', 'error'); }
      };

      overlay.querySelector('[data-accion="pdf"]').onclick = async () => {
        cerrar();
        if (this._sucia) await this._guardarAhora();
        this._exportarPDF(nota);
      };

      overlay.querySelector('[data-accion="txt"]').onclick = async () => {
        cerrar();
        if (this._sucia) await this._guardarAhora();
        const titulo = (nota.titulo || 'nota').replace(/[^\w\dáéíóúñÑü -]/gi, '').trim() || 'nota';
        window.helpers.descargarTexto(titulo, (nota.titulo ? nota.titulo + '\n\n' : '') + textoPlano(nota.contenido));
      };

      overlay.querySelector('[data-accion="eliminar"]').onclick = async () => {
        cerrar();
        const ok = await window.helpers.confirmar('La nota se moverá a la papelera. Podrás restaurarla desde allí.', {
          titulo: 'Eliminar nota', textoConfirmar: 'Mover a papelera'
        });
        if (!ok) return;
        try {
          if (esNueva && !nota.id) {
            // Nota nunca guardada: simplemente descartar
            this._limpiarEditor();
            const notas = await window.notasRepository.listarPersonales(this._usuario.id);
            if (this._raiz) this._pintarHome(this._raiz, notas);
            window.helpers.mostrarAlerta('Nota descartada.', 'exito');
            return;
          }
          if (this._sucia) { this._sucia = false; }
          await window.notasRepository.moverAPapelera(nota.id, this._usuario.id);
          window.helpers.mostrarAlerta('Nota movida a la papelera.', 'exito');
          const notas = await window.notasRepository.listarPersonales(this._usuario.id);
          this._notas = notas;
          this._limpiarEditor();
          if (this._raiz) this._pintarHome(this._raiz, notas);
        } catch (e) { window.helpers.mostrarAlerta('Error al eliminar.', 'error'); }
      };
    },

    /* ── Exportar PDF (ventana de impresión) ── */
    _exportarPDF(nota) {
      const win = window.open('', '_blank', 'width=800,height=900');
      if (!win) { window.helpers.mostrarAlerta('Permite ventanas emergentes para exportar.', 'advertencia'); return; }
      const color = COLORES.find(c => c.id === nota.color_fondo) || COLORES[0];
      win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${E(nota.titulo || 'Nota')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #0F172A; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .fecha { color: #64748B; font-size: 13px; margin-bottom: 28px; }
  .contenido { line-height: 1.75; font-size: 15px; }
  .contenido h1 { font-size: 24px; } .contenido h2 { font-size: 20px; } .contenido h3 { font-size: 17px; }
  .contenido ul, .contenido ol { padding-left: 24px; }
  .contenido blockquote { border-left: 3px solid #3B82F6; margin: 12px 0; padding: 4px 16px; color: #334155; }
  .contenido hr { border: none; border-top: 1px solid #CBD5E1; margin: 20px 0; }
  .contenido img { max-width: 100%; border-radius: 8px; }
  .contenido ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  .contenido ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: baseline; }
  @media print { body { margin: 24px; } }
</style>
</head>
<body>
  <h1>${E(nota.titulo || 'Sin título')}</h1>
  <div class="fecha">${nota.actualizado_en ? new Date(nota.actualizado_en).toLocaleString('es-ES') : ''}</div>
  <div class="contenido">${nota.contenido || '<p></p>'}</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 300); }<\/script>
</body>
</html>`);
      win.document.close();
    },
  };
})();
