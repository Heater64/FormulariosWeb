(function () {
  'use strict';

  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  window.vistaNotas = {

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        const [notas, libros] = await Promise.all([
          window.notasRepository.listar(usuario.id),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
        ]);
        this._pintar(raiz, { notas, libros: libros.data || [], usuario });
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar notas</p></div>';
      }
    },

    /* ── Vista principal: lista de libros ── */
    _pintar(raiz, d) {
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

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <h2>${I('file-text')} Notas personales</h2>
          <button class="btn-primario" id="btnNueva" style="width:100%;justify-content:center">${I('plus')} Nueva nota</button>
          <div class="o-pila">
            ${Object.entries(porLibro).map(([libro, items]) => `
              <div class="tarjeta-capitulo" style="cursor:pointer" data-libro="${E(libro)}">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">${I('book-open')} ${E(libro)}</span>
                  <span class="u-fs-xs u-color-texto-terciario">${items.length} nota${items.length === 1 ? '' : 's'}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;

      window.Iconos.actualizar();
      raiz.querySelector('#btnNueva').onclick = () => this._nuevaNota(raiz, d);
      $$(raiz, '[data-libro]').forEach((el) => {
        el.onclick = () => this._listaCapitulos(raiz, el.dataset.libro, d);
      });
    },

    /* ── Lista de capítulos ── */
    _listaCapitulos(raiz, libro, d) {
      const delLibro = d.notas.filter((n) => n.libro_nombre === libro);
      const porCap = {};
      delLibro.forEach((n) => {
        if (!porCap[n.capitulo_numero]) porCap[n.capitulo_numero] = [];
        porCap[n.capitulo_numero].push(n);
      });
      const orden = Object.keys(porCap).sort((a, b) => parseInt(a) - parseInt(b));

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('book-open')} ${E(libro)}</h2>
          <div class="o-pila">
            ${orden.map((cap) => `
              <div class="tarjeta-capitulo" style="cursor:pointer" data-cap="${cap}">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">Capítulo ${cap}</span>
                  <span class="u-fs-xs u-color-texto-terciario">${porCap[cap].length} nota${porCap[cap].length === 1 ? '' : 's'}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._pintar(raiz, d);
      $$(raiz, '[data-cap]').forEach((el) => {
        el.onclick = () => this._verNota(raiz, libro, parseInt(el.dataset.cap, 10), d);
      });
    },

    /* ── Ver nota ── */
    _verNota(raiz, libro, capitulo, d) {
      const nota = d.notas.find((n) => n.libro_nombre === libro && n.capitulo_numero === capitulo);
      if (!nota) { this._listaCapitulos(raiz, libro, d); return; }

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('book-open')} ${E(libro)} ${capitulo}</h2>
          <div class="tarjeta-capitulo o-pila" style="gap:var(--espaciado-sm)">
            <div class="o-flecha o-flecha--between">
              <span class="u-fs-xs u-color-texto-terciario">Nota personal</span>
              <div class="o-flecha" style="gap:4px">
                <button class="btn-icono" id="btnEdit" title="Editar">${I('edit-3')}</button>
                <button class="btn-icono btn-icono--peligro" id="btnDel" title="Eliminar">${I('trash-2')}</button>
              </div>
            </div>
            <div style="white-space:pre-wrap;font-size:var(--texto-sm);line-height:1.7;color:var(--color-texto)">${E(nota.contenido)}</div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario">Última edición: ${window.helpers.formatearFecha(nota.actualizado_en || nota.creado_en)}</p>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._listaCapitulos(raiz, libro, d);
      raiz.querySelector('#btnEdit').onclick = () => this._editarNota(raiz, libro, capitulo, nota, d);
      raiz.querySelector('#btnDel').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Eliminar esta nota personal?', { titulo: 'Eliminar nota', textoConfirmar: 'Eliminar' });
        if (!ok) return;
        try {
          await window.notasRepository.eliminar(nota.id);
          window.helpers.mostrarAlerta('Nota eliminada.', 'exito');
          d.notas = d.notas.filter((n) => n.id !== nota.id);
          if (d.notas.length === 0) this._pintar(raiz, d);
          else this._listaCapitulos(raiz, libro, d);
        } catch {
          window.helpers.mostrarAlerta('Error al eliminar.', 'error');
        }
      };
    },

    /* ── Editar nota ── */
    _editarNota(raiz, libro, capitulo, nota, d) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('edit-3')} Editar nota — ${E(libro)} ${capitulo}</h2>
          <textarea id="fContenido" rows="8" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${E(nota.contenido)}</textarea>
          <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">Guardar cambios</button>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._verNota(raiz, libro, capitulo, d);
      raiz.querySelector('#btnGuardar').onclick = async () => {
        const contenido = raiz.querySelector('#fContenido').value.trim();
        if (!contenido) { window.helpers.mostrarAlerta('La nota no puede estar vacía.', 'advertencia'); return; }
        try {
          await window.notasRepository.guardar(d.usuario.id, libro, capitulo, contenido);
          nota.contenido = contenido;
          window.helpers.mostrarAlerta('Nota actualizada.', 'exito');
          this._verNota(raiz, libro, capitulo, d);
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
        }
      };
    },

    /* ── Nueva nota ── */
    _nuevaNota(raiz, d) {
      const opts = (d.libros || []).map((l) => l.nombre);

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h2>${I('plus')} Nueva nota</h2>
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm u-fw-600">Libro</label>
            <select id="fLibro" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
              <option value="">Seleccionar libro...</option>
              ${opts.map((l) => `<option value="${E(l)}">${E(l)}</option>`).join('')}
            </select>
            <label class="u-fs-sm u-fw-600">Capítulo</label>
            <input type="number" id="fCap" min="1" placeholder="Ej: 3" style="width:100%">
            <label class="u-fs-sm u-fw-600">Contenido de la nota *</label>
            <textarea id="fContenido" rows="8" placeholder="Escribe tu nota aquí..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit"></textarea>
          </div>
          <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">Guardar</button>
        </div>`;

      raiz.querySelector('#btnV').onclick = () => this._pintar(raiz, d);
      raiz.querySelector('#btnGuardar').onclick = async () => {
        const libro = raiz.querySelector('#fLibro').value;
        const cap = raiz.querySelector('#fCap').value.trim();
        const contenido = raiz.querySelector('#fContenido').value.trim();

        if (!libro) { window.helpers.mostrarAlerta('Selecciona un libro.', 'advertencia'); return; }
        if (!cap) { window.helpers.mostrarAlerta('Escribe el capítulo.', 'advertencia'); return; }
        if (!contenido) { window.helpers.mostrarAlerta('Escribe el contenido de la nota.', 'advertencia'); return; }

        try {
          await window.notasRepository.guardar(d.usuario.id, libro, parseInt(cap, 10), contenido);
          window.helpers.mostrarAlerta('Nota guardada.', 'exito');
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
          return;
        }

        d.notas = await window.notasRepository.listar(d.usuario.id);
        this._pintar(raiz, d);
      };
    },
  };
})();
