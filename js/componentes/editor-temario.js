/* ============================================================================
 * js/componentes/editor-temario.js — bloque «Temario de estudio»
 * ----------------------------------------------------------------------------
 * Se monta dentro de vista-examen-editor.js (detrás de la bandera 'temario').
 * Flujo del profesor:
 *   1. Alta rápida: escribes (o pegas) una línea y pulsas Enter; se
 *      interpreta al momento y se añade a la lista.
 *   2. «Pegar mensaje completo» → para volcados largos, pega su mensaje
 *      tal cual de una vez.
 *   3. Revisión: lista de elementos con tipo editable, texto editable (las
 *      referencias se vuelven a interpretar al cambiarlo), reordenar,
 *      eliminar y añadir a mano; los avisos del parser quedan visibles.
 *   4. «Publicar a la clase» → interruptor propio, independiente del estado
 *      del examen (el temario suele darse antes de tener las preguntas).
 *
 * Reglas de proyecto: sin onclick inline (delegación de eventos), texto
 * dinámico siempre escapado, mínimo táctil 48 px y limpieza en desmontar().
 * =========================================================================*/
(function () {
  'use strict';

  const esc = (v) => window.panelUI.esc(v);

  const TIPOS = [
    { valor: 'referencia', nombre: 'Referencia' },
    { valor: 'observacion', nombre: 'Observación' },
    { valor: 'tarea', nombre: 'Tarea' },
    { valor: 'texto', nombre: 'Texto libre' }
  ];

  /** «Génesis 49:33-50:3», «Isaías», «Hechos 21:10-11»… a partir del ref. */
  function refATexto(ref) {
    if (!ref || !ref.libro) return '';
    let salida = ref.libro;
    if (ref.capitulo != null) salida += ` ${ref.capitulo}`;
    if (ref.versiculos) salida += `:${ref.versiculos}`;
    if (ref.capitulo_fin != null) {
      salida += `-${ref.capitulo_fin}`;
      if (ref.versiculos_fin) salida += `:${ref.versiculos_fin}`;
    }
    return salida;
  }

  function esTemario(valor) {
    return !!valor && typeof valor === 'object' && Array.isArray(valor.items);
  }

  function contar(items) {
    const resumen = { referencia: 0, observacion: 0, tarea: 0, texto: 0, revisar: 0 };
    for (const item of items) {
      resumen[item.tipo] = (resumen[item.tipo] || 0) + 1;
      if (item.estado === 'revisar') resumen.revisar += 1;
    }
    return resumen;
  }

  window.editorTemario = {
    _contenedor: null,
    _temario: null,
    _onCambio: null,
    _catalogo: null,
    _catalogoPromesa: null,
    _abierto: false,
    _modal: null,
    _contadorIds: 1,
    _alClick: null,
    _alCambio: null,
    _alTecla: null,

    // ── Ciclo de vida ─────────────────────────────────────────────────────

    montar(contenedor, opciones) {
      this._desconectar();
      this._contenedor = contenedor;
      this._temario = esTemario(opciones && opciones.temario) ? opciones.temario : null;
      this._onCambio = (opciones && opciones.onCambio) || null;
      if (opciones && opciones.abierto) this._abierto = true;
      this._contadorIds = this._sembrarContador();
      this._conectar();
      this._render();
    },

    desmontar() {
      this._desconectar();
      if (this._modal) {
        try { this._modal.cerrar(); } catch (e) { /* ya cerrado */ }
        this._modal = null;
      }
      this._contenedor = null;
      this._temario = null;
      this._onCambio = null;
      this._abierto = false;
    },

    _conectar() {
      const cont = this._contenedor;
      if (!cont) return;
      // Un solo par de listeners por contenedor (delegación).
      this._alClick = (evento) => {
        const boton = evento.target.closest('[data-tem]');
        if (!boton || !cont.contains(boton)) return;
        if (boton.tagName === 'BUTTON') evento.preventDefault();
        const accion = boton.dataset.tem;
        if (accion === 'pegar') this._abrirPegar();
        if (accion === 'revisar') this._alternarLista();
        if (accion === 'subir') this._mover(boton.dataset.id, -1);
        if (accion === 'bajar') this._mover(boton.dataset.id, 1);
        if (accion === 'eliminar') this._eliminar(boton.dataset.id);
        if (accion === 'anadir') this._anadir();
        if (accion === 'alta') this._altaRapida();
        if (accion === 'publicar') this._alternarPublicacion();
      };
      this._alCambio = (evento) => {
        const campo = evento.target.closest('[data-tem]');
        if (!campo || !cont.contains(campo)) return;
        const accion = campo.dataset.tem;
        if (accion === 'tipo') this._cambiarTipo(campo.dataset.id, campo.value);
        if (accion === 'texto') this._revisarTexto(campo.dataset.id, campo.value);
      };
      this._alTecla = (evento) => {
        if (evento.key !== 'Enter') return;
        const campo = evento.target.closest('[data-tem="alta-campo"]');
        if (!campo || !cont.contains(campo)) return;
        evento.preventDefault();
        this._altaRapida();
      };
      cont.addEventListener('click', this._alClick);
      cont.addEventListener('change', this._alCambio);
      cont.addEventListener('keydown', this._alTecla);
    },

    _desconectar() {
      const cont = this._contenedor;
      if (cont && this._alClick) cont.removeEventListener('click', this._alClick);
      if (cont && this._alCambio) cont.removeEventListener('change', this._alCambio);
      if (cont && this._alTecla) cont.removeEventListener('keydown', this._alTecla);
      this._alClick = null;
      this._alCambio = null;
      this._alTecla = null;
    },

    // ── Pintado ───────────────────────────────────────────────────────────

    _raiz() {
      // El editor repinta su árbol completo: si el nodo cambió, se localiza
      // de nuevo por id para no escribir en un nodo huérfano.
      const nodo = (this._contenedor && this._contenedor.isConnected)
        ? this._contenedor
        : document.getElementById('temarioContenedor');
      if (nodo) this._contenedor = nodo;
      return nodo;
    },

    _render() {
      const cont = this._raiz();
      if (!cont) return;
      const t = this._temario;
      const items = t ? t.items : [];
      const avisos = (t && Array.isArray(t.avisos)) ? t.avisos : [];
      const resumen = contar(items);
      const hayItems = items.length > 0;
      const publicado = !!(t && t.publicado);

      const estadoBadge = !hayItems
        ? '<span class="adm-badge adm-badge--borrador temario__badge">Sin temario</span>'
        : (publicado
          ? '<span class="adm-badge adm-badge--publicado temario__badge">Publicado</span>'
          : '<span class="adm-badge adm-badge--borrador temario__badge">Borrador</span>');

      const chips = [];
      if (resumen.referencia) chips.push(`${resumen.referencia} referencia${resumen.referencia === 1 ? '' : 's'}`);
      if (resumen.observacion) chips.push(`${resumen.observacion} observación${resumen.observacion === 1 ? '' : 'es'}`);
      if (resumen.tarea) chips.push(`${resumen.tarea} tarea${resumen.tarea === 1 ? '' : 's'}`);
      if (resumen.texto) chips.push(`${resumen.texto} línea${resumen.texto === 1 ? '' : 's'} libre${resumen.texto === 1 ? '' : 's'}`);
      const chipsHtml = chips.length
        ? `<div class="temario__resumen" aria-live="polite">${chips.map((c) => `<span class="temario__chip">${esc(c)}</span>`).join('')}${resumen.revisar ? `<span class="temario__chip temario__chip--aviso">${resumen.revisar} por revisar</span>` : ''}</div>`
        : '';

      const acciones = hayItems
        ? `
          <div class="temario__acciones">
            <button type="button" class="adm-btn adm-btn--principal" data-tem="publicar">${publicado ? 'Ocultar de la clase' : 'Publicar a la clase'}</button>
            <button type="button" class="adm-btn" data-tem="revisar" aria-expanded="${this._abierto ? 'true' : 'false'}">${this._abierto ? 'Ocultar revisión' : 'Revisar y editar'}</button>
            <button type="button" class="adm-btn adm-btn--pequeno" data-tem="pegar">Reemplazar texto</button>
          </div>
          <p class="adm-campo__ayuda">El temario se publica por separado del examen: los alumnos lo verán aunque las preguntas aún no estén listas.</p>`
        : `
          <div class="temario__acciones">
            <button type="button" class="adm-btn" data-tem="pegar">Pegar mensaje completo</button>
          </div>
          <p class="adm-campo__ayuda">Si prefieres volcar el mensaje entero de una vez, pégalo aquí y revisa todo junto.</p>`;

      cont.innerHTML = `
        <section class="adm-bloque temario" aria-labelledby="temarioTitulo">
          <div class="temario__cabecera">
            <h2 class="adm-bloque__titulo" id="temarioTitulo">Temario de estudio</h2>
            ${estadoBadge}
          </div>
          <p class="adm-campo__ayuda">Qué deben estudiar los alumnos antes del examen: referencias, observaciones y tareas. Es contenido de estudio, no preguntas de la evaluación.</p>
          <div class="temario__alta">
            <input class="adm-entrada temario__alta-campo" id="temarioAltaRapida" type="text" maxlength="300"
              data-tem="alta-campo" placeholder="Escribe una referencia y pulsa Enter (p. ej. Efesios 5:4)"
              aria-label="Añadir una línea de temario">
            <button type="button" class="adm-btn adm-btn--principal" data-tem="alta">Añadir</button>
          </div>
          ${chipsHtml}
          ${acciones}
          <div class="temario__lista" id="temarioLista" ${this._abierto && hayItems ? '' : 'hidden'}>
            <p class="adm-campo__ayuda">Edita un elemento y sus referencias se vuelven a interpretar. Los elementos en ámbar necesitan tu revisión.</p>
            <ol class="temario__elementos">
              ${items.map((item) => this._htmlItem(item, avisos)).join('')}
            </ol>
            <button type="button" class="adm-btn adm-btn--pequeno temario__anadir" data-tem="anadir">＋ Añadir elemento</button>
          </div>
        </section>`;
    },

    _htmlItem(item, avisos) {
      const suyos = avisos.filter((a) => a.id === item.id);
      const refs = (item.refs || []).map(refATexto).filter(Boolean);
      const opciones = TIPOS.map((tipo) =>
        `<option value="${tipo.valor}" ${item.tipo === tipo.valor ? 'selected' : ''}>${tipo.nombre}</option>`
      ).join('');
      return `
        <li class="temario-item ${item.estado === 'revisar' ? 'temario-item--revisar' : ''}" data-id="${esc(item.id)}">
          <div class="temario-item__fila">
            <select class="adm-entrada temario-item__tipo" data-tem="tipo" data-id="${esc(item.id)}" aria-label="Tipo de elemento">
              ${opciones}
            </select>
            <input class="adm-entrada temario-item__texto" data-tem="texto" data-id="${esc(item.id)}" type="text"
              maxlength="300" value="${esc(item.texto)}" aria-label="Texto del elemento" placeholder="Ej.: Efesios 5:4">
            <div class="temario-item__botones">
              <button type="button" class="adm-btn adm-btn--pequeno temario-item__btn" data-tem="subir" data-id="${esc(item.id)}" aria-label="Subir elemento">↑</button>
              <button type="button" class="adm-btn adm-btn--pequeno temario-item__btn" data-tem="bajar" data-id="${esc(item.id)}" aria-label="Bajar elemento">↓</button>
              <button type="button" class="adm-btn adm-btn--pequeno temario-item__btn" data-tem="eliminar" data-id="${esc(item.id)}" aria-label="Eliminar elemento">✕</button>
            </div>
          </div>
          <div class="temario-item__refs">
            ${refs.length
              ? refs.map((r) => `<span class="temario-item__ref">${esc(r)}</span>`).join('')
              : '<span class="temario-item__ref temario-item__ref--vacia">Sin referencia</span>'}
          </div>
          ${suyos.map((a) => `<p class="temario-item__aviso">${esc(a.mensaje)}</p>`).join('')}
        </li>`;
    },

    // ── Modal de pegado ───────────────────────────────────────────────────

    _abrirPegar() {
      if (this._modal) return;
      const actual = (this._temario && this._temario.texto_original) || '';
      const conItems = esTemario(this._temario) && this._temario.items.length > 0;
      const modal = window.panelUI.modal({
        titulo: conItems ? 'Reemplazar el temario' : 'Pegar el temario',
        cuerpoHtml: `
          <p class="adm-campo__ayuda">Pega el mensaje tal cual: una línea por referencia, instrucción o tarea. Después lo revisas; no se publica nada todavía.</p>
          <label class="adm-campo__etiqueta" for="temarioTextoPegado">Mensaje del temario</label>
          <textarea class="adm-entrada" id="temarioTextoPegado" rows="10" maxlength="4000"
            placeholder="Efesios 5:4&#10;Salmos 107, fijarse si es un salmo corto o largo&#10;Fijarse cuántos capítulos tiene el libro de Isaías">${esc(actual)}</textarea>`,
        pieHtml: `
          <button type="button" class="adm-btn" data-tem="cancelar">Cancelar</button>
          <button type="button" class="adm-btn adm-btn--principal" data-tem="interpretar">Interpretar</button>`,
        ancho: '560px'
      });
      this._modal = modal;

      modal.pie.addEventListener('click', async (evento) => {
        const boton = evento.target.closest('[data-tem]');
        if (!boton) return;
        if (boton.dataset.tem === 'cancelar') {
          modal.cerrar();
          this._modal = null;
          return;
        }
        if (boton.dataset.tem !== 'interpretar') return;
        const campo = modal.cuerpo.querySelector('#temarioTextoPegado');
        const texto = campo ? String(campo.value || '').trim() : '';
        if (!texto) {
          window.helpers.mostrarAlerta('Pega al menos una línea de temario.', 'error');
          return;
        }
        boton.disabled = true;
        try {
          await this._interpretar(texto);
          modal.cerrar();
          this._modal = null;
          this._abierto = true;
          this._render();
          const revisar = contar(this._temario.items).revisar;
          window.helpers.mostrarAlerta(
            revisar
              ? `Interpretado: ${this._temario.items.length} elementos (${revisar} para revisar).`
              : `Interpretado: ${this._temario.items.length} elementos listos para publicar.`,
            'exito'
          );
        } catch (e) {
          boton.disabled = false;
          window.helpers.mostrarAlerta('No se pudo interpretar: ' + (e.message || 'error inesperado'), 'error');
        }
      });
    },

    // ── Lógica ────────────────────────────────────────────────────────────

    async _obtenerCatalogo() {
      if (Array.isArray(this._catalogo)) return this._catalogo;
      if (!this._catalogoPromesa && window.temarioRepository) {
        this._catalogoPromesa = window.temarioRepository.catalogoLibros()
          .then((libros) => { this._catalogo = Array.isArray(libros) ? libros : []; return this._catalogo; })
          .catch(() => { this._catalogo = []; return this._catalogo; });
      }
      if (this._catalogoPromesa) return this._catalogoPromesa;
      return [];
    },

    async _interpretar(texto) {
      if (!window.temarioParser) {
        throw new Error('El interpretador de temario no está cargado. Recarga la página e inténtalo de nuevo.');
      }
      const catalogo = await this._obtenerCatalogo();
      const resultado = window.temarioParser.parse(texto, catalogo);
      const previo = esTemario(this._temario) ? this._temario : {};
      this._temario = {
        publicado: !!previo.publicado,
        texto_original: texto,
        items: resultado.items,
        avisos: resultado.avisos
      };
      this._contadorIds = this._sembrarContador();
      this._notificar();
    },

    _sembrarContador() {
      const items = (esTemario(this._temario) && this._temario.items) || [];
      let max = 0;
      for (const item of items) {
        const n = Number(String(item.id || '').replace(/^t/, ''));
        if (Number.isFinite(n) && n > max) max = n;
      }
      return max + 1;
    },

    _nuevoId() {
      let id = `t${this._contadorIds}`;
      const existentes = new Set(((this._temario && this._temario.items) || []).map((i) => i.id));
      while (existentes.has(id)) { this._contadorIds += 1; id = `t${this._contadorIds}`; }
      this._contadorIds += 1;
      return id;
    },

    /**
     * Alta rápida: interpreta lo que haya en el campo (una o varias
     * líneas) y lo añade AL FINAL del temario actual, conservando lo
     * anterior. Los elementos nuevos reciben ids frescos para no pisar los
     * avisos de los que ya existían.
     */
    async _altaRapida() {
      const raiz = this._raiz();
      const campo = raiz && raiz.querySelector('#temarioAltaRapida');
      if (!campo) return;
      const texto = String(campo.value || '').trim();
      if (!texto) return;
      if (!window.temarioParser) {
        window.helpers.mostrarAlerta('El interpretador de temario no está cargado. Recarga la página e inténtalo de nuevo.', 'error');
        return;
      }

      const catalogo = await this._obtenerCatalogo();
      const resultado = window.temarioParser.parse(texto, catalogo);
      if (!resultado.items.length) return;

      const previo = esTemario(this._temario)
        ? this._temario
        : { publicado: false, texto_original: '', items: [], avisos: [] };
      this._temario = previo;

      const base = previo.items.length;
      const remapeo = new Map();
      const nuevos = resultado.items.map((item, n) => {
        const id = this._nuevoId();
        remapeo.set(item.id, id);
        return Object.assign({}, item, { id, orden: base + n });
      });
      previo.items = previo.items.concat(nuevos);
      previo.avisos = (previo.avisos || []).concat(
        resultado.avisos.filter((a) => remapeo.has(a.id)).map((a) => Object.assign({}, a, { id: remapeo.get(a.id) }))
      );
      previo.texto_original = [previo.texto_original, texto].filter(Boolean).join('\n');

      this._abierto = true;
      this._notificar();
      this._render();

      // Se reenfoca el campo para poder añadir varias líneas seguidas.
      const nuevoCampo = this._raiz() && this._raiz().querySelector('#temarioAltaRapida');
      if (nuevoCampo) nuevoCampo.focus();

      const total = nuevos.length;
      const revisar = nuevos.filter((i) => i.estado === 'revisar').length;
      window.helpers.mostrarAlerta(
        revisar
          ? `Añadidos ${total} elemento${total === 1 ? '' : 's'} (${revisar} para revisar).`
          : `Añadido${total === 1 ? '' : 's'} ${total} elemento${total === 1 ? '' : 's'} listo${total === 1 ? '' : 's'} para publicar.`,
        revisar ? 'advertencia' : 'exito'
      );
    },

    _notificar() {
      if (typeof this._onCambio === 'function') this._onCambio(this._temario);
    },

    _item(id) {
      return ((this._temario && this._temario.items) || []).find((i) => i.id === id) || null;
    },

    _ponerAvisos(id, nuevos) {
      const t = this._temario;
      if (!t) return;
      const resto = (t.avisos || []).filter((a) => a.id !== id);
      t.avisos = resto.concat(nuevos.map((a) => Object.assign({}, a, { id })));
    },

    _alternarLista() {
      this._abierto = !this._abierto;
      this._render();
    },

    _cambiarTipo(id, tipo) {
      const item = this._item(id);
      if (!item || !TIPOS.some((t) => t.valor === tipo)) return;
      item.tipo = tipo;
      this._notificar();
      this._render();
    },

    /** Texto editado a mano: se vuelven a interpretar SOLO sus referencias. */
    async _revisarTexto(id, valor) {
      const item = this._item(id);
      if (!item) return;
      const texto = String(valor || '').replace(/\s*\n+\s*/g, ' ').trim();
      if (texto === item.texto) return;
      item.texto = texto;

      if (!texto) {
        item.refs = [];
        item.estado = 'revisar';
        this._ponerAvisos(id, []);
        this._notificar();
        this._render();
        return;
      }

      const catalogo = await this._obtenerCatalogo();
      const resultado = window.temarioParser.parse(texto, catalogo);
      const primero = resultado.items[0] || { refs: [] };
      item.refs = primero.refs || [];
      // El tipo solo lo cambia el parser si el profesor no lo había elegido.
      if (item.tipo === 'texto' && primero.tipo && primero.tipo !== 'texto') item.tipo = primero.tipo;
      this._ponerAvisos(id, resultado.avisos);
      item.estado = item.refs.length && !resultado.avisos.length ? 'ok' : 'revisar';
      this._notificar();
      this._render();
    },

    _mover(id, delta) {
      const items = (this._temario && this._temario.items) || [];
      const indice = items.findIndex((i) => i.id === id);
      const destino = indice + delta;
      if (indice < 0 || destino < 0 || destino >= items.length) return;
      const [item] = items.splice(indice, 1);
      items.splice(destino, 0, item);
      items.forEach((i, n) => { i.orden = n; });
      this._notificar();
      this._render();
    },

    async _eliminar(id) {
      const item = this._item(id);
      if (!item) return;
      if (String(item.texto || '').trim()) {
        const ok = await window.helpers.confirmar('¿Eliminar este elemento del temario?', {
          titulo: 'Eliminar elemento',
          textoConfirmar: 'Eliminar'
        });
        if (!ok) return;
      }
      const items = this._temario.items;
      this._temario.items = items.filter((i) => i.id !== id);
      this._temario.items.forEach((i, n) => { i.orden = n; });
      this._ponerAvisos(id, []);
      if (!this._temario.items.length) this._abierto = false;
      this._notificar();
      this._render();
    },

    _anadir() {
      if (!esTemario(this._temario)) return;
      this._temario.items.push({
        id: this._nuevoId(),
        tipo: 'texto',
        texto: '',
        refs: [],
        nota: '',
        orden: this._temario.items.length,
        estado: 'revisar'
      });
      this._abierto = true;
      this._notificar();
      this._render();
    },

    async _alternarPublicacion() {
      const items = (esTemario(this._temario) && this._temario.items) || [];
      if (!items.length) return;
      const activar = !this._temario.publicado;
      if (activar) {
        const porRevisar = items.filter((i) => i.estado === 'revisar').length;
        if (porRevisar) {
          const ok = await window.helpers.confirmar(
            `${porRevisar} elemento${porRevisar === 1 ? '' : 's'} todavía necesita${porRevisar === 1 ? '' : 'n'} revisión. ¿Publicar el temario de todos modos?`,
            { titulo: 'Temario con elementos sin revisar', textoConfirmar: 'Publicar' }
          );
          if (!ok) return;
        }
      }
      this._temario.publicado = activar;
      this._notificar();
      this._render();
      window.helpers.mostrarAlerta(activar ? 'Temario publicado.' : 'Temario oculto de nuevo.', 'exito');
    }
  };
})();
