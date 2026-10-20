/* ============================================================================
 * js/vistas/vista-evaluacion-editar.js — Hoja de cálculo de una evaluación
 * ----------------------------------------------------------------------------
 * Tabla tipo Excel/Canva: filas = alumnos, columnas = exámenes (o manuales) y
 * última columna fija = resultado final (media de las columnas, con anulación
 * manual). Reutiliza la rejilla anterior y añade la manipulación de filas y
 * columnas como hoja de cálculo:
 *
 * · Filas: «+» al final y menú «⋯» contextual (añadir encima/debajo, eliminar
 *   con confirmación si hay datos). El orden y las filas vacías se guardan en
 *   el servidor (fb_evaluacion_alumnos_guardar, migración 064); mientras la
 *   tabla no se toca, las filas se derivan como siempre de los intentos.
 * · Columnas: «+» junto a la columna final y menú «⋯» (izquierda/derecha,
 *   renombrar en línea, eliminar con confirmación si hay datos).
 * · Celdas: escribir manualmente dentro del rango configurado; vacío =
 *   pendiente (no cuenta en la media), 0 = nota de cero (sí cuenta).
 * · Guardado: cola con debounce (lo último gana por celda), estado visible en
 *   la cabecera (Guardando…/Guardado/Error) y botón «Reintentar»; nunca se
 *   pierde el valor escrito si el servidor falla.
 * · Resultado final: media aritmética, o ponderada si las columnas llevan
 *   peso (mismo criterio que el servidor: Σ(nota×peso)/Σ(peso) solo de las
 *   celdas con nota). El criterio vive en «⋯ → Configuración», con el rango
 *   de notas y los pesos por columna.
 * · Importa Excel/CSV (parser .xlsx propio: ZIP + XML) y exporta CSV/JSON.
 *
 * Datos: RPCs fb_evaluacion_* de las migraciones 060-064 vía
 * plataformaRepository. Con guion bajo se exponen al test los que son lógica
 * pura.
 * =========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const esc = (v) => window.panelUI.esc(v);
  const num = (v) => window.panelUI.numero(v);

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  /** Misma normalización que el servidor (lower(btrim(...))). */
  function clave(alumno) {
    return String(alumno == null ? '' : alumno).trim().toLowerCase();
  }

  function notaDe(texto) {
    const t = String(texto == null ? '' : texto).trim().replace(/\s/g, '').replace(',', '.');
    if (!t) return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
  }

  function desentizar(xml) {
    return String(xml == null ? '' : xml)
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, '&');
  }

  /** Índice de columna de una referencia de celda: A→0, B→1, AA→26. */
  function indiceColumna(ref) {
    let n = 0;
    for (const ch of String(ref || '')) {
      const v = ch.charCodeAt(0) - 64;
      if (v < 1 || v > 26) return -1;
      n = n * 26 + v;
    }
    return n - 1;
  }

  // ── CSV propio (sin dependencias) ────────────────────────────────────────
  function parseCSV(texto) {
    const limpia = String(texto || '').replace(/^\uFEFF/, '');
    const primera = limpia.split(/\r\n|\n|\r/, 1)[0] || '';
    let separador = ',';
    [';', ',', '\t'].forEach((s) => {
      if (primera.split(s).length > primera.split(separador).length) separador = s;
    });
    const filas = [];
    let fila = [];
    let campo = '';
    let dentro = false;
    for (let i = 0; i < limpia.length; i++) {
      const c = limpia[i];
      if (dentro) {
        if (c === '"') {
          if (limpia[i + 1] === '"') { campo += '"'; i++; } else dentro = false;
        } else campo += c;
      } else if (c === '"') {
        dentro = true;
      } else if (c === separador) {
        fila.push(campo); campo = '';
      } else if (c === '\n') {
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else if (c !== '\r') {
        campo += c;
      }
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((c) => String(c).trim() !== ''));
  }

  // ── .xlsx propio: ZIP central + hoja 1 + cadenas compartidas ─────────────
  async function abrirZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const vista = new DataView(buffer);
    let eocd = -1;
    const desde = Math.max(0, bytes.length - 65558);
    for (let i = bytes.length - 22; i >= desde; i--) {
      if (vista.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('El archivo .xlsx no es un ZIP válido.');
    const total = vista.getUint16(eocd + 10, true);
    let offset = vista.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    const entradas = new Map();
    for (let n = 0; n < total; n++) {
      if (vista.getUint32(offset, true) !== 0x02014b50) break;
      const metodo = vista.getUint16(offset + 10, true);
      const comprimido = vista.getUint32(offset + 20, true);
      const nombreLen = vista.getUint16(offset + 28, true);
      const extraLen = vista.getUint16(offset + 30, true);
      const comentarioLen = vista.getUint16(offset + 32, true);
      const inicioLocal = vista.getUint32(offset + 42, true);
      const nombre = dec.decode(bytes.subarray(offset + 46, offset + 46 + nombreLen));
      entradas.set(nombre, { metodo, comprimido, inicioLocal });
      offset += 46 + nombreLen + extraLen + comentarioLen;
    }
    return {
      nombres: Array.from(entradas.keys()),
      async leer(nombre) {
        const e = entradas.get(nombre);
        if (!e) return null;
        const nombreLen = vista.getUint16(e.inicioLocal + 26, true);
        const extraLen = vista.getUint16(e.inicioLocal + 28, true);
        const inicio = e.inicioLocal + 30 + nombreLen + extraLen;
        const datos = bytes.subarray(inicio, inicio + e.comprimido);
        if (e.metodo === 0) return datos;
        if (e.metodo === 8) {
          if (typeof DecompressionStream === 'undefined') {
            throw new Error('Este navegador no puede leer .xlsx. Guarda el archivo como CSV e inténtalo de nuevo.');
          }
          const stream = new Blob([datos]).stream()
            .pipeThrough(new DecompressionStream('deflate-raw'));
          return new Uint8Array(await new Response(stream).arrayBuffer());
        }
        throw new Error('Compresión ZIP no soportada en el archivo.');
      }
    };
  }

  async function parseXLSX(buffer) {
    const zip = await abrirZip(buffer);
    const dec = new TextDecoder();

    let compartidas = [];
    const ss = await zip.leer('xl/sharedStrings.xml');
    if (ss) {
      const xml = dec.decode(ss);
      compartidas = xml.split(/<si[\s>]/).slice(1).map((bloque) => {
        const trozos = [];
        for (const m of bloque.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) trozos.push(m[1]);
        return desentizar(trozos.join(''));
      });
    }

    const hojas = zip.nombres.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
    if (!hojas.length) throw new Error('El archivo .xlsx no contiene ninguna hoja.');
    const xml = dec.decode(await zip.leer(hojas[0]));

    const filas = [];
    for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const fila = [];
      for (const cm of rm[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1] || '';
        const cuerpo = cm[2] || '';
        const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1] || '';
        const t = (attrs.match(/t="(\w+)"/) || [])[1] || 'n';
        let valor = '';
        if (t === 'inlineStr') {
          valor = desentizar((cuerpo.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '');
        } else {
          const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/);
          if (v) valor = t === 's' ? (compartidas[Number(v[1])] || '') : v[1];
        }
        const col = indiceColumna(ref);
        if (col >= 0) fila[col] = valor;
      }
      if (fila.some((c) => String(c == null ? '' : c).trim() !== '')) filas.push(fila);
    }
    return filas.map((f) => {
      const max = f.length;
      const completa = [];
      for (let i = 0; i < max; i++) completa[i] = f[i] == null ? '' : f[i];
      return completa;
    });
  }

  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function baseNombre(evaluacion) {
    const n = clave(evaluacion && evaluacion.titulo).replace(/[^\wáéíóúüñ-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'evaluacion';
    return 'evaluacion-' + n;
  }

  // ── Menús contextuales (ratón y táctil) ─────────────────────────────────
  // Se registran los listeners del documento en el primer uso: el fichero se
  // evalúa también en los tests (Node), donde no hay `document`.
  let menuActual = null;
  let documentoPreparado = false;

  function cerrarMenu() {
    if (menuActual && menuActual.elemento && menuActual.elemento.parentNode) {
      menuActual.elemento.remove();
    }
    menuActual = null;
  }

  function prepararDocumento() {
    if (documentoPreparado || typeof document === 'undefined') return;
    documentoPreparado = true;
    document.addEventListener('click', (evento) => {
      if (!menuActual) return;
      if (menuActual.elemento.contains(evento.target)) return;
      if (menuActual.origen && menuActual.origen.contains(evento.target)) return;
      cerrarMenu();
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && menuActual) cerrarMenu();
    });
    window.addEventListener('resize', cerrarMenu);
  }

  window.vistaEvaluacionEditar = {
    _id: null,
    _datos: null,
    _examenes: [],
    _columnasEdicion: null,
    // Hoja de cálculo: estado de la edición en línea y del guardado.
    _filaNueva: null,        // índice donde se está creando una fila de alumno
    _colEditando: null,      // id de la columna que se está renombrando
    _editando: false,        // hay un editor en línea abierto (no repintar)
    _enfocarTrasPintar: null,
    _cola: new Map(),        // 'alumno|colId' → { alumno, colId, nota }
    _temporizador: 0,
    _volcarPromesa: null,
    _estado: 'ok',           // 'ok' | 'guardando' | 'error'
    _errorGuardado: null,
    _desmontado: false,      // al salir se anula el pintado para no pisar la vista siguiente

    async montar(raiz, params) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }
      this._desmontado = false;
      this._id = (params && params.id) || null;
      this._datos = null;
      this._examenes = [];
      this._filaNueva = null;
      this._colEditando = null;
      this._editando = false;
      this._cola = new Map();
      this._estado = 'ok';
      this._errorGuardado = null;

      raiz.innerHTML = `<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('table-2')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo" id="tituloEvaluacion" title="Pulsa para cambiar el nombre">Evaluación</h1>
            <p class="adm-cabecera__sub" id="subEvaluacion">Cargando…</p>
          </div>
          <div class="adm-cabecera__acciones">
            <span class="eval-estado" id="estadoGuardado" role="status" aria-live="polite"></span>
            <button class="adm-btn adm-btn--principal" id="btnAnadir" type="button" aria-haspopup="menu">${window.Iconos.render('plus')} Añadir</button>
            <button class="adm-btn" id="btnMas" type="button" aria-haspopup="menu" aria-label="Más acciones" title="Más acciones">${window.Iconos.render('ellipsis-vertical')}</button>
            <button class="adm-btn" id="btnVolver" type="button">${window.Iconos.render('arrow-left')} Volver</button>
          </div>
        </header>
        <div id="contenido"><p class="adm-cabecera__sub">Cargando…</p></div>
      </div>`;

      raiz.querySelector('#tituloEvaluacion').addEventListener('click', () => this._editarTitulo());
      raiz.querySelector('#btnVolver').addEventListener('click', async () => {
        // Los cambios pendientes se intentan volcar antes de salir.
        try { await this._volcar(); } catch (e) { /* el estado de error queda visible */ }
        router.navegar('/evaluaciones');
      });
      raiz.querySelector('#btnAnadir').addEventListener('click', () => {
        const alumnos = (this._datos && this._datos.alumnos) || [];
        const columnas = (this._datos && this._datos.columnas) || [];
        this._abrirMenu(raiz.querySelector('#btnAnadir'), [
          { texto: 'Añadir alumno', icono: 'user-plus', accion: () => this._anadirFila(alumnos.length) },
          { texto: 'Añadir columna', icono: 'columns-3', accion: () => this._anadirColumna(columnas.length) }
        ]);
      });
      raiz.querySelector('#btnMas').addEventListener('click', () => {
        this._abrirMenu(raiz.querySelector('#btnMas'), [
          { texto: 'Configuración (rango y pesos)', icono: 'settings', accion: () => this._modalConfiguracion() },
          { texto: 'Gestionar columnas', icono: 'columns-3', accion: () => this._modalColumnas() },
          { texto: 'Importar Excel/CSV', icono: 'upload', accion: () => this._modalImportar() },
          { separador: true },
          { texto: 'Descargar CSV', icono: 'file-down', accion: () => this._exportarCSV() },
          { texto: 'Descargar JSON (copia)', icono: 'download', accion: () => this._exportarJSON() }
        ]);
      });
      this._pintarEstado();

      await this._cargar(raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    /** El router avisa al salir: si queda algo pendiente de guardar, se
     *  intenta volcar ya (no se pierde nada). _desmontado anula todo pintado
     *  posterior para no pisar la vista siguiente, aunque el vuelco siga su
     *  curso en segundo plano. */
    desmontar() {
      this._desmontado = true;
      if (this._temporizador) {
        // El debounce no debe disparar un vuelco contra un DOM ya desmontado.
        clearTimeout(this._temporizador);
        this._temporizador = 0;
      }
      if (this._cola && this._cola.size && !this._volcarPromesa) {
        try { this._volcar(); } catch (e) { /* el estado de error queda visible */ }
      }
    },

    async _cargar(raiz) {
      const contenido = raiz.querySelector('#contenido');
      try {
        const datos = this._normalizarDatos(
          await window.plataformaRepository.obtenerEvaluacion(this._id)
        );
        this._datos = datos;
        // El resumen da los exámenes (títulos, borradores) para las cabeceras
        // y para el selector de columnas. No bloquea: si falla, sigue sin él.
        try {
          const resumen = await window.plataformaRepository.resumen();
          this._examenes = (resumen && resumen.examenes) || [];
        } catch (e) { this._examenes = []; }
        // Cuentas de alumno ya vinculadas a filas (migración 067). Sin ellas, la rejilla sigue.
        try {
          this._vinculos = (await window.plataformaRepository.vinculosEvaluacion(this._id)) || [];
        } catch (e) { this._vinculos = []; }
      } catch (e) {
        if (!contenido.isConnected) return;
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudo cargar la evaluación: ${esc(e.message)}</div>`;
        return;
      }
      if (!contenido.isConnected) return;
      this._pintar();
    },

    /**
     * Tras guardar se vuelve a leer el servidor: él fusiona lo automático con
     * lo manual. Lo que sigue en la cola de guardado se solapa encima para
     * que una respuesta vieja no pise una edición reciente.
     */
    async _refrescar() {
      try {
        const datos = this._normalizarDatos(
          await window.plataformaRepository.obtenerEvaluacion(this._id)
        );
        this._datos = datos;
        for (const pendiente of this._cola.values()) {
          this._actualizarLocal(pendiente.alumno, pendiente.colId, pendiente.nota);
        }
      } catch (e) { /* sin red: se mantiene el estado local ya actualizado */ }
      this._repintar();
    },

    /** Repinta salvo que haya un editor en línea abierto (no lo pisa). */
    _repintar() {
      if (this._editando) return;
      this._pintar();
    },

    // ── Datos derivados ───────────────────────────────────────────────────
    _celdasMap() {
      const mapa = new Map();
      ((this._datos && this._datos.celdas) || []).forEach((c) => {
        mapa.set(clave(c.alumno) + '|' + c.columna_id, c);
      });
      return mapa;
    },

    _finalesMap() {
      const mapa = new Map();
      ((this._datos && this._datos.finales) || []).forEach((f) => {
        mapa.set(clave(f.alumno), f);
      });
      return mapa;
    },

    /** Rango configurado de la evaluación (por defecto 0-10). */
    _rangoNota() {
      const ev = (this._datos && this._datos.evaluacion) || {};
      const max = Number(ev.nota_max);
      return isFinite(max) && max > 0 ? max : 10;
    },

    /** Peso de una columna: NULL = mismo peso que las demás (= 1). */
    _pesoColumna(colId) {
      const columnas = (this._datos && this._datos.columnas) || [];
      const col = columnas.find((c) => c.id === colId);
      const p = col ? Number(col.peso) : NaN;
      return isFinite(p) && p > 0 ? p : 1;
    },

    /** Misma regla que el servidor: Σ(nota×peso) ÷ Σ(peso) de las celdas con nota. */
    _mediaAlumno(alumno) {
      const k = clave(alumno);
      let suma = 0;
      let pesos = 0;
      let hay = false;
      ((this._datos && this._datos.celdas) || []).forEach((c) => {
        if (clave(c.alumno) !== k || c.nota == null) return;
        const peso = this._pesoColumna(c.columna_id);
        suma += Number(c.nota) * peso;
        pesos += peso;
        hay = true;
      });
      if (!hay || pesos <= 0) return null;
      return Math.round((suma / pesos) * 100) / 100;
    },

    /** Criterio de cálculo mostrado en la leyenda y en Configuración. */
    _formulaTexto() {
      const columnas = (this._datos && this._datos.columnas) || [];
      const conPeso = columnas.some((c) => c.peso != null && Number(c.peso) > 0);
      return conPeso
        ? 'Resultado final = media ponderada: Σ(nota × peso) ÷ Σ(peso), solo de las columnas con nota.'
        : 'Resultado final = media aritmética de las columnas con nota (las vacías no cuentan).';
    },

    _examenDe(columna) {
      return this._examenes.find((e) => e.id === columna.examen_id) || null;
    },

    // ── Menús contextuales ────────────────────────────────────────────────
    _abrirMenu(origen, items) {
      if (typeof document === 'undefined' || !origen) return;
      prepararDocumento();
      cerrarMenu();
      const el = document.createElement('div');
      el.className = 'eval-menu';
      el.setAttribute('role', 'menu');
      el.innerHTML = items.map((it, i) => (it.separador
        ? '<div class="eval-menu__sep" role="separator"></div>'
        : `<button type="button" role="menuitem" class="eval-menu__item${it.peligro ? ' eval-menu__item--peligro' : ''}" data-item="${i}">${it.icono ? window.Iconos.render(it.icono) : ''}<span>${esc(it.texto)}</span></button>`
      )).join('');
      document.body.appendChild(el);

      const recta = origen.getBoundingClientRect();
      const ancho = el.offsetWidth;
      const alto = el.offsetHeight;
      const izq = Math.max(8, Math.min(recta.left, window.innerWidth - ancho - 8));
      let arr = recta.bottom + 6;
      if (arr + alto > window.innerHeight - 8) arr = Math.max(8, recta.top - alto - 6);
      el.style.left = izq + 'px';
      el.style.top = arr + 'px';

      el.querySelectorAll('[data-item]').forEach((boton) => {
        boton.addEventListener('click', () => {
          const it = items[Number(boton.dataset.item)];
          cerrarMenu();
          if (it && it.accion) it.accion();
        });
      });
      menuActual = { elemento: el, origen };
      const primero = el.querySelector('[data-item]');
      if (primero) primero.focus();
      if (window.Iconos) window.Iconos.actualizar();
    },

    /**
     * Defensa contra servidores antiguos: la 060-064 traía las columnas solo
     * con el alias `columna_id`; la vista trabaja con `id`. Se completan ambos
     * para que las celdas y los menús funcionen igual.
     */
    _normalizarDatos(datos) {
      if (datos && Array.isArray(datos.columnas)) {
        datos.columnas.forEach((c) => {
          if (!c.id && c.columna_id) c.id = c.columna_id;
          if (!c.columna_id && c.id) c.columna_id = c.id;
        });
      }
      return datos;
    },

    // ── Pintado de la hoja ────────────────────────────────────────────────
    _pintar() {
      if (this._desmontado) return; // la vista ya no es la nuestra: no pisar
      const d = this._datos;
      const contenido = document.querySelector('#app-root #contenido');
      if (!contenido) return;
      cerrarMenu();
      const ev = d.evaluacion || {};
      const titulo = document.querySelector('#tituloEvaluacion');
      const sub = document.querySelector('#subEvaluacion');
      if (titulo) titulo.textContent = ev.titulo || 'Evaluación';
      const columnas = d.columnas || [];
      const alumnos = d.alumnos || [];
      if (sub) {
        sub.textContent = (ev.fecha ? window.panelUI.fechaCorta(ev.fecha) + ' · ' : '')
          + columnas.length + ' columna(s) · ' + alumnos.length + ' alumno(s)'
          + ' · rango 0-' + this._rangoNota()
          + (ev.descripcion ? ' · ' + ev.descripcion : '');
      }
      this._pintarEstado();

      if (!columnas.length) {
        contenido.innerHTML = `<div class="adm-vacio">
          <p class="adm-vacio__titulo">Esta evaluación todavía no tiene columnas</p>
          <p>Añade tus exámenes (también borradores) o una columna manual… o importa tu Excel/CSV y las columnas se crean solas con sus notas.</p>
          <button class="adm-btn adm-btn--principal" id="btnVacioColumnas">${window.Iconos.render('plus')} Añadir columnas</button>
        </div>`;
        const b = contenido.querySelector('#btnVacioColumnas');
        if (b) b.addEventListener('click', () => this._modalColumnas());
        if (window.Iconos) window.Iconos.actualizar();
        return;
      }

      const celdasMap = this._celdasMap();
      const finalesMap = this._finalesMap();
      const indiceNuevaFila = this._filaNueva;

      // Cabeceras: nombre editable en línea cuando _colEditando coincide.
      const cabeceras = columnas.map((c) => {
        const examen = this._examenDe(c);
        const borrador = c.tipo === 'examen' && examen && examen.estado !== 'publicado';
        const renombrando = this._colEditando === c.id;
        const nombreHtml = renombrando
          ? `<input class="eval-col__input" value="${esc(c.nombre)}" maxlength="160" aria-label="Nombre de la columna ${esc(c.nombre)}">`
          : `<span class="eval-tabla__col-nombre">${esc(c.nombre)}</span>`;
        return `<th scope="col" class="eval-tabla__col" data-col="${esc(c.id)}">
          ${nombreHtml}
          <span class="eval-tabla__col-badges">
            <span class="adm-badge adm-badge--borrador">${c.tipo === 'examen' ? 'Examen' : 'Manual'}</span>
            ${borrador ? '<span class="adm-badge adm-badge--aviso">Borrador</span>' : ''}
          </span>
          <span class="eval-acciones eval-acciones--col">
            <button type="button" class="eval-acciones__btn" data-menu-col="${esc(c.id)}" aria-haspopup="menu" aria-label="Opciones de la columna ${esc(c.nombre)}" title="Opciones de la columna">${window.Iconos.render('ellipsis-vertical')}</button>
          </span>
        </th>`;
      }).join('');

      const filas = alumnos.map((alumno, indice) => {
        const celdasHtml = columnas.map((c) => {
          const celda = celdasMap.get(clave(alumno) + '|' + c.id);
          const nota = celda && celda.nota != null ? Number(celda.nota) : null;
          const manual = !!(celda && celda.manual);
          return `<td data-alumno="${esc(alumno)}" data-col="${esc(c.id)}">${this._htmlCelda(nota, manual, alumno, c.nombre)}</td>`;
        }).join('');
        const final = finalesMap.get(clave(alumno));
        const media = this._mediaAlumno(alumno);
        const notaFinal = final && final.nota != null ? Number(final.nota) : media;
        const manualFinal = !!(final && final.manual);
        // Solo lo manual es editable: el resultado calculado no se tacha.
        const finalHtml = manualFinal
          ? this._htmlCelda(notaFinal, true, alumno, 'Resultado final', media != null ? media : null)
          : this._htmlFinalCalculado(alumno, notaFinal);
        return `<tr>
          <th scope="row" class="eval-tabla__alumno">
            <span class="eval-tabla__alumno-txt">${esc(alumno)}</span>
            ${this._htmlCuentaFila(alumno)}
            <span class="eval-acciones eval-acciones--fila">
              <button type="button" class="eval-acciones__btn" data-menu-fila="${indice}" aria-haspopup="menu" aria-label="Opciones de ${esc(alumno)}" title="Opciones de la fila">${window.Iconos.render('ellipsis-vertical')}</button>
            </span>
          </th>
          ${celdasHtml}
          <td class="eval-tabla__col--anadir eval-tabla__relleno"></td>
          <td class="eval-tabla__espaciador" aria-hidden="true"></td>
          <td class="eval-tabla__final" data-alumno="${esc(alumno)}" data-col="">${finalHtml}</td>
        </tr>`;
      });

      // Fila en creación («+ Añadir alumno» → nombre en línea).
      if (indiceNuevaFila != null) {
        filas.splice(Math.max(0, Math.min(indiceNuevaFila, filas.length)), 0, `<tr class="eval-fila--nueva">
          <th scope="row" class="eval-tabla__alumno">
            <input class="eval-alumno-input" type="text" placeholder="Nombre y apellidos" maxlength="200" autocomplete="off" aria-label="Nombre del nuevo alumno">
          </th>
          ${columnas.map(() => '<td class="eval-tabla__col eval-tabla__relleno"></td>').join('')}
          <td class="eval-tabla__col--anadir eval-tabla__relleno"></td>
          <td class="eval-tabla__espaciador" aria-hidden="true"></td>
          <td class="eval-tabla__final eval-tabla__relleno"></td>
        </tr>`);
      }

      const contenedorAntes = contenido.querySelector('.eval-rejilla');
      const scrollIzq = contenedorAntes ? contenedorAntes.scrollLeft : 0;
      const scrollArr = contenedorAntes ? contenedorAntes.scrollTop : 0;

      contenido.innerHTML = `<div class="eval-rejilla">
        <table class="eval-tabla">
          <caption class="eval-tabla__caption">Hoja de notas: pulsa una celda para escribir la nota; cada fila y columna tiene un menú «⋯» para añadir o eliminar. Desliza la hoja en horizontal para ver todas las columnas.</caption>
          <thead><tr>
            <th scope="col" class="eval-tabla__alumno">Alumno</th>
            ${cabeceras}
            <th scope="col" class="eval-tabla__col eval-tabla__col--anadir">
              <button type="button" class="eval-mas" data-anadir-col="${columnas.length}" aria-label="Añadir columna" title="Añadir columna">+</button>
            </th>
            <th scope="col" class="eval-tabla__espaciador" aria-hidden="true"></th>
            <th scope="col" class="eval-tabla__final">Resultado final</th>
          </tr></thead>
          <tbody>
            ${filas.join('')}
            <tr class="eval-fila--anadir">
              <th scope="row" class="eval-tabla__alumno">
                <button type="button" class="eval-mas eval-mas--fila" data-anadir-fila="${alumnos.length}">${window.Iconos.render('plus')} Añadir alumno</button>
              </th>
              <td class="eval-tabla__relleno" colspan="${columnas.length + 1}"></td>
              <td class="eval-tabla__espaciador" aria-hidden="true"></td>
              <td class="eval-tabla__final eval-tabla__relleno"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="eval-leyenda">
        <span class="eval-leyenda__grupo"><span class="eval-leyenda__punto eval-leyenda__punto--auto"></span> valor automático del examen</span>
        <span class="eval-leyenda__grupo"><span class="eval-leyenda__punto eval-leyenda__punto--manual"></span> escrita a mano (no se recalcula)</span>
        <span class="eval-leyenda__grupo"><span class="eval-leyenda__punto eval-leyenda__punto--cero"></span> 0 = nota de cero: sí cuenta</span>
        <span class="eval-leyenda__grupo"><span class="eval-leyenda__punto eval-leyenda__punto--pendiente"></span> — = pendiente: no cuenta</span>
        <span class="eval-leyenda__grupo">${esc(this._formulaTexto())}</span>
      </p>`;

      const contenedor = contenido.querySelector('.eval-rejilla');
      if (contenedor) {
        contenedor.addEventListener('click', (evento) => {
          const celda = evento.target.closest('.eval-celda');
          if (celda) { this._editarCelda(celda); return; }
          const restauro = evento.target.closest('.eval-restaurar');
          if (restauro) { this._restaurarCelda(restauro); return; }
          const menuFila = evento.target.closest('[data-menu-fila]');
          if (menuFila) { this._menuFila(menuFila); return; }
          const menuCol = evento.target.closest('[data-menu-col]');
          if (menuCol) { this._menuColumna(menuCol); return; }
          const masCol = evento.target.closest('[data-anadir-col]');
          if (masCol) { this._anadirColumna(Number(masCol.dataset.anadirCol)); return; }
          const masFila = evento.target.closest('[data-anadir-fila]');
          if (masFila) { this._anadirFila(Number(masFila.dataset.anadirFila)); }
        });
        contenedor.scrollLeft = scrollIzq;
        contenedor.scrollTop = scrollArr;
      }

      // Renombrar columna en línea.
      const inpCol = contenido.querySelector('.eval-col__input');
      if (inpCol) {
        inpCol.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter') { evento.preventDefault(); this._confirmarNombreColumna(inpCol); }
          if (evento.key === 'Escape') { evento.preventDefault(); this._cancelarNombreColumna(); }
        });
        inpCol.addEventListener('blur', () => this._confirmarNombreColumna(inpCol));
        inpCol.focus();
        inpCol.select();
      }

      // Fila nueva en línea.
      const inpFila = contenido.querySelector('.eval-alumno-input');
      if (inpFila) {
        inpFila.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter') { evento.preventDefault(); this._confirmarFilaNueva(inpFila); }
          if (evento.key === 'Escape') { evento.preventDefault(); this._cancelarFilaNueva(); }
        });
        inpFila.addEventListener('blur', () => this._confirmarFilaNueva(inpFila));
        inpFila.focus();
      }

      // Enter en una celda: guardar y bajar a la de debajo.
      if (this._enfocarTrasPintar) {
        const objetivo = this._enfocarTrasPintar;
        this._enfocarTrasPintar = null;
        const tds = contenido.querySelectorAll('.eval-rejilla td[data-alumno]');
        for (const td of tds) {
          if (td.dataset.alumno === objetivo.alumno && (td.dataset.col || '') === objetivo.colId) {
            const boton = td.querySelector('.eval-celda');
            if (boton && boton.tagName === 'BUTTON') boton.focus();
            break;
          }
        }
      }

      if (window.Iconos) window.Iconos.actualizar();
    },

    /** Estado de guardado en la cabecera (visible, con reintento). */
    _pintarEstado() {
      if (typeof document === 'undefined' || this._desmontado) return;
      const caja = document.querySelector('#estadoGuardado');
      if (!caja) return;
      if (this._estado === 'guardando') {
        caja.innerHTML = '<span class="eval-estado__txt eval-estado__txt--guardando">Guardando…</span>';
      } else if (this._estado === 'error') {
        caja.innerHTML = '<span class="eval-estado__txt eval-estado__txt--error">Sin guardar</span>'
          + '<button type="button" class="adm-btn adm-btn--pequeno" id="btnReintentar">Reintentar</button>';
        const b = caja.querySelector('#btnReintentar');
        if (b) b.addEventListener('click', () => { this._volcar(); });
      } else {
        caja.innerHTML = '<span class="eval-estado__txt eval-estado__txt--ok">Guardado</span>';
      }
    },

    _htmlCelda(nota, manual, alumno, etiqueta, mediaDebajo) {
      const texto = nota == null ? '—' : num(nota);
      const clases = ['eval-celda'];
      if (manual) clases.push('eval-celda--manual');
      if (nota == null) clases.push('eval-celda--vacia');
      const titulo = manual
        ? 'Modificada manualmente. Pulsa para cambiar; déjala vacía para volver al valor automático.'
        : 'Pulsa para escribir la nota a mano.';
      return `<button type="button" class="${clases.join(' ')}" title="${esc(titulo)}"
          aria-label="Nota de ${esc(alumno)} en ${esc(etiqueta)}: ${esc(texto)}">${esc(texto)}</button>`
        + (manual ? `<button type="button" class="eval-restaurar" title="Volver al valor calculado" aria-label="Restaurar valor automático de ${esc(alumno)}">${window.Iconos.render('rotate-ccw')}</button>` : '')
        + (manual && mediaDebajo != null ? `<span class="eval-debajo">media ${esc(num(mediaDebajo))}</span>` : '');
    },

    /** Resultado calculado: NO se edita (es un resultado, no una entrada). */
    _htmlFinalCalculado(alumno, nota) {
      const texto = nota == null ? '—' : num(nota);
      const clases = ['eval-celda', 'eval-celda--calculada'];
      if (nota == null) clases.push('eval-celda--vacia');
      const titulo = nota == null
        ? 'Resultado pendiente: aparecerá cuando haya columnas con nota.'
        : 'Resultado calculado (no editable). ' + this._formulaTexto();
      return `<span class="${clases.join(' ')}" title="${esc(titulo)}"
          aria-label="Resultado de ${esc(alumno)}: ${esc(texto)} (calculado)">${esc(texto)}</span>`;
    },

    // ── Edición de celdas ─────────────────────────────────────────────────
    _valorCelda(alumno, colId) {
      if (colId) {
        const c = this._celdasMap().get(clave(alumno) + '|' + colId);
        return { nota: c && c.nota != null ? Number(c.nota) : null, manual: !!(c && c.manual) };
      }
      const f = this._finalesMap().get(clave(alumno));
      if (f && f.nota != null) return { nota: Number(f.nota), manual: !!f.manual };
      return { nota: this._mediaAlumno(alumno), manual: false };
    },

    /**
     * Valida el texto de una celda: vacío = pendiente (null), número dentro
     * del rango configurado. Devuelve { ok, nota, error }.
     */
    _validarNotaTexto(texto) {
      const t = String(texto == null ? '' : texto).trim();
      if (!t) return { ok: true, nota: null };
      const n = notaDe(t);
      if (n == null) return { ok: false, nota: null, error: 'Escribe un número, por ejemplo 7,5 (o vacío para pendiente).' };
      const max = this._rangoNota();
      if (n < 0 || n > max) {
        return { ok: false, nota: null, error: 'La nota debe estar entre 0 y ' + max + ' (o vacía).' };
      }
      return { ok: true, nota: n };
    },

    _editarCelda(boton) {
      const td = boton.closest('td');
      if (!td || td.querySelector('input') || this._editando) return;
      const alumno = td.dataset.alumno;
      const colId = td.dataset.col || '';
      const previo = this._valorCelda(alumno, colId);
      const etiqueta = colId
        ? ((this._datos.columnas.find((c) => c.id === colId) || {}).nombre || 'la columna')
        : 'la nota final';
      const max = this._rangoNota();

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = String(max);
      input.step = '0.25';
      input.className = 'eval-celda__input';
      input.value = previo.nota == null ? '' : String(previo.nota);
      input.setAttribute('aria-label', 'Nota de ' + alumno + ' en ' + etiqueta);
      boton.replaceWith(input);
      this._editando = true;
      td.classList.add('eval-td--editando');
      input.focus();
      input.select();

      let cerrado = false;
      const marcarError = (texto) => {
        input.setAttribute('aria-invalid', 'true');
        let aviso = td.querySelector('.eval-celda__error');
        if (!aviso) {
          aviso = document.createElement('span');
          aviso.className = 'eval-celda__error';
          aviso.setAttribute('role', 'alert');
          td.appendChild(aviso);
        }
        aviso.textContent = texto;
      };
      const cerrar = async (guardar) => {
        if (cerrado) return;
        if (guardar) {
          // Un <input type=number> con texto no numérico expone value='' (no el
          // texto); sin este check se leería como «vacío» y se BORRARÍA la celda.
          if (input.validity && input.validity.badInput) {
            marcarError('Escribe un número, por ejemplo 7,5.');
            input.focus();
            return;
          }
          // Como Excel: un valor fuera de rango no se cierra; se corrige o se
          // cancela con Escape (así no se pierde lo que se escribió).
          const r = this._validarNotaTexto(input.value);
          if (!r.ok) { marcarError(r.error); input.focus(); return; }
        }
        cerrado = true;
        this._editando = false;
        td.classList.remove('eval-td--editando');
        if (!guardar) { this._pintar(); return; }
        await this._guardarCelda(alumno, colId, input.value);
      };

      input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          // Avanzar a la celda de abajo (sensación de hoja de cálculo).
          const alumnos = (this._datos && this._datos.alumnos) || [];
          const i = alumnos.findIndex((a) => clave(a) === clave(alumno));
          if (i >= 0 && i < alumnos.length - 1) {
            this._enfocarTrasPintar = { alumno: alumnos[i + 1], colId };
          }
          cerrar(true);
        }
        if (evento.key === 'Escape') { evento.preventDefault(); cerrar(false); }
      });
      input.addEventListener('blur', () => { cerrar(true); });
    },

    async _guardarCelda(alumno, colId, crudo) {
      const validada = this._validarNotaTexto(crudo);
      if (!validada.ok) {
        window.helpers.mostrarAlerta(validada.error, 'error');
        this._repintar();
        return false;
      }
      const nota = validada.nota;
      const previo = this._valorCelda(alumno, colId);
      const sinCambio = nota === previo.nota && (nota == null ? !previo.manual : previo.manual);
      if (sinCambio) { this._repintar(); return true; }

      this._programarGuardado(alumno, colId, nota);
      await this._volcar();
      return true;
    },

    // ── Cola de guardado (automático, con estados y reintento) ────────────
    _claveCola(alumno, colId) {
      return clave(alumno) + '|' + (colId || '');
    },

    /**
     * Encola el cambio con debounce. Último valor gana por celda: una
     * respuesta vieja no puede pisar una edición posterior, porque las
     * peticiones salen en orden y lo pendiente se solapa tras cada refresco.
     */
    _programarGuardado(alumno, colId, nota) {
      this._cola.set(this._claveCola(alumno, colId), { alumno, colId, nota });
      // Optimista: la celda muestra ya el valor escrito aunque falle la red.
      this._actualizarLocal(alumno, colId, nota);
      this._estado = 'guardando';
      this._pintarEstado();
      if (this._temporizador) clearTimeout(this._temporizador);
      this._temporizador = setTimeout(() => { this._temporizador = 0; this._volcar(); }, 400);
    },

    _volcar() {
      if (this._volcarPromesa) {
        // Ya hay un vuelco en marcha: el siguiente se encadena a su final.
        return this._volcarPromesa.then(() => this._volcar());
      }
      if (!this._cola.size) return Promise.resolve();
      this._volcarPromesa = this._volcarInterno()
        .finally(() => { this._volcarPromesa = null; });
      return this._volcarPromesa;
    },

    async _volcarInterno() {
      this._estado = 'guardando';
      this._pintarEstado();
      let fallo = null;
      while (this._cola.size && !fallo) {
        const lote = Array.from(this._cola.entries());
        this._cola.clear();
        for (let i = 0; i < lote.length; i++) {
          const [k, p] = lote[i];
          if (fallo) {
            // Falló una anterior: el resto vuelve a la cola sin perderse.
            if (!this._cola.has(k)) this._cola.set(k, p);
            continue;
          }
          try {
            await window.plataformaRepository.guardarCeldaEvaluacion(
              this._id, p.colId === '' ? null : p.colId, p.alumno, p.nota
            );
            this._actualizarLocal(p.alumno, p.colId, p.nota);
          } catch (e) {
            fallo = e;
            if (!this._cola.has(k)) this._cola.set(k, p);
          }
        }
      }
      if (fallo) {
        // El valor escrito sigue en la cola y en la rejilla: nada se pierde.
        this._estado = 'error';
        this._errorGuardado = fallo.message;
        this._pintarEstado();
        window.helpers.mostrarAlerta('No se pudo guardar: ' + fallo.message + ' Pulsa «Reintentar».', 'error');
        this._repintar();
        return;
      }
      this._estado = 'ok';
      this._errorGuardado = null;
      await this._refrescar();
      this._pintarEstado();
    },

    /** Actualiza el estado en memoria tras guardar una celda. */
    _actualizarLocal(alumno, colId, nota) {
      const k = clave(alumno);
      if (colId) {
        const lista = this._datos.celdas || (this._datos.celdas = []);
        const i = lista.findIndex((c) => c.columna_id === colId && clave(c.alumno) === k);
        if (nota == null) {
          if (i >= 0) lista.splice(i, 1);
        } else if (i >= 0) {
          lista[i] = { alumno: lista[i].alumno, columna_id: colId, nota, manual: true };
        } else {
          lista.push({ alumno, columna_id: colId, nota, manual: true });
        }
      } else {
        const finales = this._datos.finales || (this._datos.finales = []);
        const i = finales.findIndex((f) => clave(f.alumno) === k);
        const media = this._mediaAlumno(alumno);
        if (nota == null) {
          if (i >= 0) finales[i] = { alumno: finales[i].alumno, nota: media, manual: false, media };
        } else if (i >= 0) {
          finales[i] = { alumno: finales[i].alumno, nota, manual: true, media };
        } else {
          finales.push({ alumno, nota, manual: true, media });
        }
      }
    },

    /** Quita la marca manual: la celda vuelve al valor automático. */
    async _restaurarCelda(boton) {
      const td = boton.closest('td');
      if (!td) return;
      const alumno = td.dataset.alumno;
      const colId = td.dataset.col || '';
      // Cualquier cambio pendiente de esta celda queda obsoleto.
      this._cola.delete(this._claveCola(alumno, colId));
      try {
        await window.plataformaRepository.guardarCeldaEvaluacion(this._id, colId === '' ? null : colId, alumno, null);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudo restaurar: ' + e.message, 'error');
        return;
      }
      // El servidor recombina automático + manual: se relee la rejilla entera.
      await this._refrescar();
    },

    // ── Filas (alumnos) ───────────────────────────────────────────────────
    _menuFila(boton) {
      const indice = Number(boton.dataset.menuFila);
      const alumnos = (this._datos && this._datos.alumnos) || [];
      const alumno = alumnos[indice];
      this._abrirMenu(boton, [
        { texto: 'Añadir alumno encima', icono: 'user-plus', accion: () => this._anadirFila(indice) },
        { texto: 'Añadir alumno debajo', icono: 'user-plus', accion: () => this._anadirFila(indice + 1) },
        { separador: true },
        { texto: this._vinculoDe(alumno) ? 'Cambiar usuario asignado' : 'Asignar a usuario', icono: 'link', accion: () => this._vincularAlumno(alumno) },
        { separador: true },
        { texto: 'Eliminar fila', icono: 'trash-2', peligro: true, accion: () => this._eliminarFila(alumno) }
      ]);
    },

    /** Vínculo de la fila con una cuenta de alumno, o null. */
    _vinculoDe(alumno) {
      const k = clave(alumno);
      return (this._vinculos || []).find((v) => v.clave === k) || null;
    },

    /** Estado visible bajo el nombre de la fila: a qué cuenta está asignada. */
    _htmlCuentaFila(alumno) {
      const vinculo = this._vinculoDe(alumno);
      if (!vinculo) {
        return '<span class="eval-tabla__alumno-cuenta">Sin asignar</span>';
      }
      return `<span class="eval-tabla__alumno-cuenta eval-tabla__alumno-cuenta--asignada" title="Cuenta asignada">Asignado a ${esc(vinculo.nombre || 'cuenta sin nombre')}</span>`;
    },

    /**
     * Elige la cuenta de alumno que ve la nota de esta fila. «Sin asignar»
     * quita la asignación. El alumno solo verá su propia nota final.
     */
    async _vincularAlumno(alumno) {
      let usuarios = [];
      try {
        usuarios = ((await window.adminRepository.listarUsuarios()) || [])
          .filter((u) => u.rol === 'usuario' && u.activo !== false);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudieron cargar las cuentas: ' + e.message, 'error');
        return;
      }
      const actual = this._vinculoDe(alumno);
      // Sugerencia: si la fila no tiene cuenta y su nombre coincide con una cuenta,
      // se preselecciona (igual que en Entregas).
      const normalizar = (v) => String(v || '').trim().toLowerCase();
      const nombreFila = normalizar(alumno);
      const sugerido = actual ? null
        : usuarios.find((u) => normalizar(u.nombre_completo) === nombreFila || normalizar(u.username) === nombreFila) || null;
      const opciones = ['<option value="">Sin asignar</option>'].concat(usuarios.map((u) => {
        const seleccionada = actual ? actual.alumno_id === u.id : (sugerido && sugerido.id === u.id);
        return `<option value="${esc(u.id)}"${seleccionada ? ' selected' : ''}>${esc(u.nombre_completo || u.username || u.id)}</option>`;
      })).join('');
      const avisoSugerencia = sugerido
        ? `<p class="adm-campo__ayuda">${window.Iconos.render('info')} El nombre de la fila coincide con esta cuenta, así que aparece preseleccionada.</p>`
        : '';
      const modal = window.panelUI.modal({
        titulo: 'Asignar a usuario',
        cuerpoHtml: `<p>Fila <strong>${esc(alumno)}</strong>. La cuenta elegida verá su nota final de esta evaluación al iniciar sesión; nadie más.</p>
          ${avisoSugerencia}
          <p id="avisoMover" class="adm-campo__ayuda" hidden></p>
          <label>Cuenta de alumno<select id="vinculoAlumno">${opciones}</select></label>`,
        pieHtml: `<button class="adm-btn" type="button" id="vinculoCancelar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="vinculoGuardar">Guardar</button>`
      });
      // Una cuenta ocupa una sola fila: si ya está en otra, se avisa antes de guardar.
      const select = modal.contenido.querySelector('#vinculoAlumno');
      const avisoMover = modal.contenido.querySelector('#avisoMover');
      const actualizarAvisoMover = () => {
        const id = select.value || null;
        const otra = id ? (this._vinculos || []).find((v) => v.alumno_id === id && v.clave !== clave(alumno)) : null;
        const nombreOtra = otra ? (((this._datos && this._datos.alumnos) || []).find((a) => clave(a) === otra.clave) || otra.clave) : '';
        avisoMover.hidden = !otra;
        avisoMover.textContent = otra
          ? `Esta cuenta ya está asignada a la fila «${nombreOtra}». Al guardar, pasará a esta fila y se quitará de la otra.`
          : '';
      };
      select.addEventListener('change', actualizarAvisoMover);
      actualizarAvisoMover();
      modal.contenido.querySelector('#vinculoCancelar').addEventListener('click', modal.cerrar);
      modal.contenido.querySelector('#vinculoGuardar').addEventListener('click', async () => {
        const id = modal.contenido.querySelector('#vinculoAlumno').value || null;
        try {
          this._vinculos = (await window.plataformaRepository.vincularAlumnoEvaluacion(this._id, clave(alumno), id)) || [];
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo guardar el vínculo: ' + e.message, 'error');
          return;
        }
        modal.cerrar();
        window.helpers.mostrarAlerta(id ? 'Usuario asignado.' : 'Asignación quitada.', 'exito');
        this._repintar();
      });
    },

    _anadirFila(indice) {
      if (this._editando || !this._datos) return;
      cerrarMenu();
      const alumnos = this._datos.alumnos || [];
      this._filaNueva = Math.max(0, Math.min(indice || 0, alumnos.length));
      this._editando = true;
      this._pintar();
    },

    _confirmarFilaNueva(input) {
      if (this._filaNueva == null) return;
      const nombre = String(input.value == null ? '' : input.value).trim();
      if (!nombre) { this._cancelarFilaNueva(); return; }
      const alumnos = ((this._datos && this._datos.alumnos) || []).slice();
      if (alumnos.some((a) => clave(a) === clave(nombre))) {
        window.helpers.mostrarAlerta('Ese alumno ya está en la rejilla.', 'error');
        input.focus();
        return;
      }
      const indice = this._filaNueva;
      this._filaNueva = null;
      this._editando = false;
      alumnos.splice(indice, 0, nombre);
      this._sincronizarAlumnos(alumnos);
    },

    _cancelarFilaNueva() {
      if (this._filaNueva == null) return;
      this._filaNueva = null;
      this._editando = false;
      this._pintar();
    },

    async _eliminarFila(alumno) {
      if (alumno == null || !this._datos) return;
      const k = clave(alumno);
      const conCeldas = (this._datos.celdas || []).some((c) => clave(c.alumno) === k && c.nota != null);
      const final = this._finalesMap().get(k);
      const conFinal = !!(final && final.nota != null);
      if (conCeldas || conFinal) {
        const ok = await window.helpers.confirmar(
          `La fila de ${alumno} tiene notas guardadas. ¿Eliminarla? Se borrarán sus notas manuales; los intentos de examen no se tocan.`,
          { titulo: 'Eliminar alumno', textoConfirmar: 'Eliminar' }
        );
        if (!ok) return;
      }
      const lista = ((this._datos && this._datos.alumnos) || []).filter((a) => clave(a) !== k);
      await this._sincronizarAlumnos(lista);
    },

    /** Guarda la lista visible y ordenada (mismo contrato que las columnas). */
    async _sincronizarAlumnos(lista) {
      this._datos.alumnos = lista;
      this._pintar();
      try {
        await window.plataformaRepository.guardarAlumnosEvaluacion(this._id, lista);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudo guardar la lista de alumnos: ' + e.message, 'error');
      }
      await this._refrescar();
    },

    // ── Columnas ──────────────────────────────────────────────────────────
    _menuColumna(boton) {
      const colId = boton.dataset.menuCol;
      const columnas = (this._datos && this._datos.columnas) || [];
      const indice = columnas.findIndex((c) => c.id === colId);
      const nombre = indice >= 0 ? columnas[indice].nombre : '';
      this._abrirMenu(boton, [
        { texto: 'Añadir columna a la izquierda', icono: 'plus', accion: () => this._anadirColumna(indice) },
        { texto: 'Añadir columna a la derecha', icono: 'plus', accion: () => this._anadirColumna(indice + 1) },
        { texto: 'Cambiar nombre', icono: 'edit-3', accion: () => this._renombrarColumna(colId) },
        { separador: true },
        { texto: 'Eliminar columna', icono: 'trash-2', peligro: true, accion: () => this._eliminarColumna(colId) }
      ]);
    },

    _anadirColumna(indice) {
      if (this._editando || !this._datos) return;
      cerrarMenu();
      const opcionesExamen = this._examenes.map((e) =>
        `<option value="${esc(e.id)}">${esc(e.titulo)}${e.estado !== 'publicado' ? ' (borrador)' : ''}</option>`
      ).join('') || '<option value="" disabled>No hay exámenes todavía</option>';

      const modal = window.panelUI.modal({
        titulo: 'Añadir columna',
        cuerpoHtml: `<div class="adm-aviso adm-aviso--error" id="errAnadirCol" hidden></div>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="anadirTipo">Tipo de columna</label>
            <select class="adm-entrada" id="anadirTipo">
              <option value="examen">Un examen existente (también borradores)</option>
              <option value="manual">Una columna manual</option>
            </select>
          </div>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="anadirExamen">Examen</label>
            <select class="adm-entrada" id="anadirExamen">${opcionesExamen}</select>
          </div>
          <div class="adm-campo" id="cajaNombreManual" hidden>
            <label class="adm-campo__etiqueta" for="anadirNombre">Nombre</label>
            <input class="adm-entrada" id="anadirNombre" maxlength="160" placeholder="Nombre de la columna manual">
          </div>`,
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnOkAnadirCol">Añadir</button>`,
        ancho: '560px'
      });

      const cuerpo = modal.cuerpo;
      const selTipo = cuerpo.querySelector('#anadirTipo');
      const selExamen = cuerpo.querySelector('#anadirExamen');
      const inpNombre = cuerpo.querySelector('#anadirNombre');
      const cajaNombre = cuerpo.querySelector('#cajaNombreManual');
      const sincronizar = () => {
        const manual = selTipo.value === 'manual';
        selExamen.hidden = manual;
        cajaNombre.hidden = !manual;
      };
      selTipo.addEventListener('change', sincronizar);
      sincronizar();

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.pie.querySelector('#btnOkAnadirCol').addEventListener('click', async () => {
        const error = cuerpo.querySelector('#errAnadirCol');
        const existentes = (this._datos && this._datos.columnas) || [];
        let columna = null;
        if (selTipo.value === 'examen') {
          const examen = this._examenes.find((e) => e.id === selExamen.value);
          if (!examen) { error.textContent = 'Elige un examen.'; error.hidden = false; return; }
          if (existentes.some((c) => c.examen_id === examen.id)) {
            error.textContent = 'Ese examen ya es una columna de esta evaluación.'; error.hidden = false; return;
          }
          columna = { tipo: 'examen', examen_id: examen.id, nombre: examen.titulo };
        } else {
          const nombre = String(inpNombre.value || '').trim();
          if (!nombre) { error.textContent = 'La columna necesita nombre.'; error.hidden = false; return; }
          if (existentes.some((c) => clave(c.nombre) === clave(nombre))) {
            error.textContent = 'Ya existe una columna con ese nombre.'; error.hidden = false; return;
          }
          columna = { tipo: 'manual', examen_id: null, nombre };
        }
        const lista = existentes.slice();
        lista.splice(Math.max(0, Math.min(indice, lista.length)), 0, columna);
        modal.cerrar();
        await this._sincronizarColumnas(lista);
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    _renombrarColumna(colId) {
      if (this._editando || !this._datos) return;
      cerrarMenu();
      const col = (this._datos.columnas || []).find((c) => c.id === colId);
      if (!col) return;
      this._colEditando = colId;
      this._editando = true;
      this._pintar();
    },

    _confirmarNombreColumna(input) {
      if (this._colEditando == null) return;
      const colId = this._colEditando;
      const nombre = String(input.value == null ? '' : input.value).trim();
      const columnas = (this._datos && this._datos.columnas) || [];
      const col = columnas.find((c) => c.id === colId);
      if (!col) { this._cancelarNombreColumna(); return; }
      if (!nombre) {
        window.helpers.mostrarAlerta('La columna necesita nombre.', 'error');
        input.focus();
        return;
      }
      if (columnas.some((c) => c.id !== colId && clave(c.nombre) === clave(nombre))) {
        window.helpers.mostrarAlerta('Ya existe una columna con ese nombre.', 'error');
        input.focus();
        return;
      }
      this._colEditando = null;
      this._editando = false;
      if (nombre === col.nombre) { this._pintar(); return; }
      const lista = columnas.map((c) => (c.id === colId ? { ...c, nombre } : c));
      this._sincronizarColumnas(lista);
    },

    _cancelarNombreColumna() {
      if (this._colEditando == null) return;
      this._colEditando = null;
      this._editando = false;
      this._pintar();
    },

    async _eliminarColumna(colId) {
      if (!this._datos) return;
      const columnas = (this._datos.columnas || []);
      const col = columnas.find((c) => c.id === colId);
      if (!col) return;
      const conDatos = (this._datos.celdas || []).some((c) => c.columna_id === colId && c.nota != null);
      if (conDatos) {
        const ok = await window.helpers.confirmar(
          `La columna «${col.nombre}» tiene notas guardadas. ¿Eliminarla?`,
          { titulo: 'Eliminar columna', textoConfirmar: 'Eliminar' }
        );
        if (!ok) return;
      }
      const lista = columnas.filter((c) => c.id !== colId);
      await this._sincronizarColumnas(lista);
    },

    /**
     * Sincroniza la lista completa de columnas con el servidor (el RPC borra
     * lo que no se envíe). Sin la clave «peso»: así un reordenamiento o
     * renombrado no pisa las ponderaciones guardadas en Configuración.
     */
    async _sincronizarColumnas(columnas) {
      const payload = columnas.map((c, i) => ({
        id: c.id || null, tipo: c.tipo, examen_id: c.examen_id || null, nombre: c.nombre, posicion: i
      }));
      this._datos.columnas = payload;
      try {
        const guardadas = await window.plataformaRepository.guardarColumnasEvaluacion(this._id, payload);
        if (guardadas && guardadas.columnas) this._datos.columnas = guardadas.columnas;
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudieron guardar las columnas: ' + e.message, 'error');
      }
      await this._refrescar();
    },

    // ── Configuración (rango, pesos y criterio) ───────────────────────────
    _modalConfiguracion() {
      if (!this._datos) return;
      const ev = this._datos.evaluacion || {};
      const columnas = this._datos.columnas || [];
      const max = this._rangoNota();
      const pesosHtml = columnas.map((c) => `
        <div class="eval-cfg__peso">
          <span class="eval-cfg__peso-nombre">${esc(c.nombre)}</span>
          <input class="adm-entrada eval-cfg__peso-input" type="number" inputmode="decimal" min="0" step="0.25"
            data-peso="${esc(c.id)}" value="${c.peso != null ? esc(String(c.peso)) : ''}"
            placeholder="igual peso" aria-label="Peso de ${esc(c.nombre)}">
        </div>`).join('');

      const modal = window.panelUI.modal({
        titulo: 'Configuración de la evaluación',
        cuerpoHtml: `<div class="adm-aviso adm-aviso--error" id="errCfg" hidden></div>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="cfgRango">Rango de la nota (0 a…)</label>
            <input class="adm-entrada" id="cfgRango" type="number" min="0.5" step="0.5" value="${esc(String(max))}">
            <p class="adm-cabecera__sub">Las celdas y la importación solo admiten valores entre 0 y este máximo.</p>
          </div>
          <div class="adm-campo">
            <span class="adm-campo__etiqueta">Peso de cada columna en el resultado final</span>
            <p class="adm-cabecera__sub">Vacío = mismo peso que las demás. Con números (por ejemplo 30) el resultado pasa a media ponderada. Solo se aceptan valores mayores que 0.</p>
            ${pesosHtml || '<p class="adm-cabecera__sub">Sin columnas todavía.</p>'}
          </div>
          <div class="eval-cfg__formula">
            <p class="adm-campo__etiqueta">Criterio de cálculo</p>
            <p class="eval-cfg__formula-texto">${esc(this._formulaTexto())}</p>
            <p class="adm-cabecera__sub">Las celdas vacías o pendientes no cuentan y nunca se convierten en 0; una nota 0 escrita sí cuenta. Una nota final escrita a mano anula el cálculo hasta que la restaures.</p>
          </div>`,
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarCfg">Guardar</button>`,
        ancho: '640px'
      });

      const cuerpo = modal.cuerpo;
      const error = cuerpo.querySelector('#errCfg');
      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.pie.querySelector('#btnGuardarCfg').addEventListener('click', async () => {
        const rango = Number(cuerpo.querySelector('#cfgRango').value);
        if (!isFinite(rango) || rango <= 0) {
          error.textContent = 'El rango debe ser un número mayor que 0.';
          error.hidden = false;
          return;
        }
        const columnasActuales = (this._datos && this._datos.columnas) || [];
        const pesos = [];
        let invalido = null;
        cuerpo.querySelectorAll('[data-peso]').forEach((inp) => {
          const texto = String(inp.value || '').trim();
          if (texto === '' || invalido) return;
          const n = Number(texto.replace(',', '.'));
          if (!isFinite(n) || n <= 0) {
            invalido = 'El peso debe ser un número mayor que 0 (o vacío para «igual peso»).';
            return;
          }
          pesos.push({ id: inp.dataset.peso, peso: n });
        });
        if (invalido) { error.textContent = invalido; error.hidden = false; return; }
        const pesoDe = (colId) => {
          const p = pesos.find((x) => x.id === colId);
          return p ? p.peso : null;
        };
        // Los pesos se envían SIEMPRE (con su clave) porque es lo que toca
        // aquí; rango y pesos van juntos en la misma pasada.
        const payload = columnasActuales.map((c, i) => ({
          id: c.id || null, tipo: c.tipo, examen_id: c.examen_id || null, nombre: c.nombre,
          posicion: i, peso: pesoDe(c.id)
        }));
        const boton = modal.pie.querySelector('#btnGuardarCfg');
        boton.disabled = true;
        try {
          await window.plataformaRepository.actualizarEvaluacion(
            this._id, ev.titulo || '', ev.descripcion || '', ev.fecha || null, rango
          );
          await window.plataformaRepository.guardarColumnasEvaluacion(this._id, payload);
          modal.cerrar();
          window.helpers.mostrarAlerta('Configuración guardada.', 'exito');
          await this._refrescar();
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
        }
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    /** El nombre de la evaluación se edita pulsándolo en la cabecera. */
    _editarTitulo() {
      if (typeof document === 'undefined' || this._editando || !this._datos) return;
      const h1 = document.querySelector('#tituloEvaluacion');
      if (!h1 || h1.querySelector('input')) return;
      const ev = this._datos.evaluacion || {};
      const actual = String(ev.titulo || '');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'eval-titulo-input';
      input.maxLength = 160;
      input.value = actual;
      input.setAttribute('aria-label', 'Nombre de la evaluación');
      h1.textContent = '';
      h1.appendChild(input);
      input.focus();
      input.select();
      this._editando = true;

      let cerrado = false;
      const cerrar = async (guardar) => {
        if (cerrado) return;
        const valor = String(input.value || '').trim();
        if (guardar && !valor) {
          window.helpers.mostrarAlerta('La evaluación necesita nombre.', 'error');
          input.focus();
          return;
        }
        cerrado = true;
        this._editando = false;
        if (!guardar || valor === actual) { this._pintar(); return; }
        try {
          const r = await window.plataformaRepository.actualizarEvaluacion(
            this._id, valor, ev.descripcion || '', ev.fecha || null
          );
          if (r && this._datos) this._datos.evaluacion = r;
          window.helpers.mostrarAlerta('Nombre actualizado.', 'exito');
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo guardar el nombre: ' + e.message, 'error');
        }
        this._pintar();
      };
      input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') { evento.preventDefault(); cerrar(true); }
        if (evento.key === 'Escape') { evento.preventDefault(); cerrar(false); }
      });
      input.addEventListener('blur', () => cerrar(true));
    },

    // ── Columnas (modal clásico: reordenar y gestionar) ───────────────────
    _modalColumnas() {
      this._columnasEdicion = ((this._datos.columnas) || []).map((c, i) => ({
        id: c.id, tipo: c.tipo, examen_id: c.examen_id, nombre: c.nombre, posicion: i
      }));
      const opcionesExamen = this._examenes.map((e) =>
        `<option value="${esc(e.id)}">${esc(e.titulo)}${e.estado !== 'publicado' ? ' (borrador)' : ''}</option>`
      ).join('') || '<option value="" disabled>No hay exámenes todavía</option>';

      const modal = window.panelUI.modal({
        titulo: 'Columnas de la evaluación',
        cuerpoHtml: `<div class="adm-aviso adm-aviso--error" id="errorColumnas" hidden></div>
          <div id="listaColumnas"></div>
          <div class="eval-anadir">
            <label class="adm-campo__etiqueta" for="colTipo">Añadir columna</label>
            <div class="eval-anadir__fila">
              <select class="adm-entrada" id="colTipo">
                <option value="examen">Un examen existente (también borradores)</option>
                <option value="manual">Una columna manual (datos antiguos)</option>
              </select>
              <select class="adm-entrada" id="colExamen">${opcionesExamen}</select>
              <input class="adm-entrada" id="colNombre" placeholder="Nombre de la columna manual" hidden>
              <button class="adm-btn" type="button" id="btnAnadirColumna">${window.Iconos.render('plus')} Añadir</button>
            </div>
          </div>`,
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarColumnas">Guardar columnas</button>`,
        ancho: '640px'
      });

      const cuerpo = modal.cuerpo;
      const pintarLista = () => {
        const caja = cuerpo.querySelector('#listaColumnas');
        if (!this._columnasEdicion.length) {
          caja.innerHTML = '<p class="adm-cabecera__sub">Sin columnas todavía.</p>';
        } else {
          caja.innerHTML = `<ol class="eval-collista">${this._columnasEdicion.map((c, i) => `
            <li class="eval-collista__item">
              <span class="eval-collista__nombre">${esc(c.nombre)}
                <span class="adm-badge adm-badge--borrador">${c.tipo === 'examen' ? 'Examen' : 'Manual'}</span>
              </span>
              <span class="eval-collista__acciones">
                <button class="adm-btn adm-btn--pequeno" type="button" data-subir="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(c.nombre)}">${window.Iconos.render('chevron-up')}</button>
                <button class="adm-btn adm-btn--pequeno" type="button" data-bajar="${i}" ${i === this._columnasEdicion.length - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(c.nombre)}">${window.Iconos.render('chevron-down')}</button>
                <button class="adm-btn adm-btn--peligro adm-btn--pequeno" type="button" data-quitar="${i}" aria-label="Quitar ${esc(c.nombre)}">${window.Iconos.render('trash-2')}</button>
              </span>
            </li>`).join('')}</ol>`;
        }
        caja.querySelectorAll('[data-subir]').forEach((b) => b.addEventListener('click', () => {
          const i = Number(b.dataset.subir);
          const t = this._columnasEdicion[i - 1];
          this._columnasEdicion[i - 1] = this._columnasEdicion[i];
          this._columnasEdicion[i] = t;
          pintarLista();
        }));
        caja.querySelectorAll('[data-bajar]').forEach((b) => b.addEventListener('click', () => {
          const i = Number(b.dataset.bajar);
          const t = this._columnasEdicion[i + 1];
          this._columnasEdicion[i + 1] = this._columnasEdicion[i];
          this._columnasEdicion[i] = t;
          pintarLista();
        }));
        caja.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => {
          this._columnasEdicion.splice(Number(b.dataset.quitar), 1);
          pintarLista();
        }));
        if (window.Iconos) window.Iconos.actualizar();
      };
      pintarLista();

      const selTipo = cuerpo.querySelector('#colTipo');
      const selExamen = cuerpo.querySelector('#colExamen');
      const inpNombre = cuerpo.querySelector('#colNombre');
      const sincronizar = () => {
        const manual = selTipo.value === 'manual';
        selExamen.hidden = manual;
        inpNombre.hidden = !manual;
      };
      selTipo.addEventListener('change', sincronizar);
      sincronizar();

      cuerpo.querySelector('#btnAnadirColumna').addEventListener('click', () => {
        const error = cuerpo.querySelector('#errorColumnas');
        if (selTipo.value === 'examen') {
          const examen = this._examenes.find((e) => e.id === selExamen.value);
          if (!examen) { error.textContent = 'Elige un examen.'; error.hidden = false; return; }
          if (this._columnasEdicion.some((c) => c.examen_id === examen.id)) {
            error.textContent = 'Ese examen ya es una columna.'; error.hidden = false; return;
          }
          this._columnasEdicion.push({ tipo: 'examen', examen_id: examen.id, nombre: examen.titulo });
        } else {
          const nombre = (inpNombre.value || '').trim();
          if (!nombre) { error.textContent = 'La columna manual necesita nombre.'; error.hidden = false; return; }
          this._columnasEdicion.push({ tipo: 'manual', examen_id: null, nombre });
          inpNombre.value = '';
        }
        error.hidden = true;
        pintarLista();
      });

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.pie.querySelector('#btnGuardarColumnas').addEventListener('click', async () => {
        const error = cuerpo.querySelector('#errorColumnas');
        const boton = modal.pie.querySelector('#btnGuardarColumnas');
        boton.disabled = true;
        try {
          const guardadas = await window.plataformaRepository.guardarColumnasEvaluacion(
            this._id,
            this._columnasEdicion.map((c, i) => ({
              id: c.id || null, tipo: c.tipo, examen_id: c.examen_id, nombre: c.nombre, posicion: i
            }))
          );
          this._datos.columnas = (guardadas && guardadas.columnas) || this._datos.columnas;
          modal.cerrar();
          window.helpers.mostrarAlerta('Columnas guardadas.', 'exito');
          const raiz = document.querySelector('#app-root');
          if (raiz) await this._cargar(raiz);
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
        }
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    // ── Importar CSV / Excel ──────────────────────────────────────────────
    _modalImportar() {
      const modal = window.panelUI.modal({
        titulo: 'Importar notas desde Excel o CSV',
        cuerpoHtml: `<p class="adm-cabecera__sub">Formato esperado: primera fila con los nombres de los exámenes, primera columna con los nombres de los alumnos y última columna con la nota final. La tabla se copia tal cual: las columnas que aún no existan en la evaluación se crean automáticamente.</p>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="importarArchivo">Archivo (.csv, .xlsx, .xls)</label>
            <input class="adm-entrada" id="importarArchivo" type="file" accept=".csv,.txt,.xlsx,.xls">
          </div>
          <div id="previewImportar"></div>
          <div class="adm-aviso adm-aviso--error" id="errorImportar" hidden></div>`,
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnConfirmarImportar" disabled>Importar</button>`,
        ancho: '640px'
      });
      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      const cuerpo = modal.cuerpo;
      const preview = cuerpo.querySelector('#previewImportar');
      const error = cuerpo.querySelector('#errorImportar');
      const boton = modal.pie.querySelector('#btnConfirmarImportar');
      let preparado = null;

      cuerpo.querySelector('#importarArchivo').addEventListener('change', async (evento) => {
        const archivo = evento.target.files && evento.target.files[0];
        if (!archivo) return;
        error.hidden = true;
        boton.disabled = true;
        preparado = null;
        preview.innerHTML = '<p class="adm-cabecera__sub">Leyendo el archivo…</p>';
        try {
          let filas;
          if (/\.xlsx?$/i.test(archivo.name)) {
            filas = await parseXLSX(await archivo.arrayBuffer());
          } else {
            filas = parseCSV(await archivo.text());
          }
          preparado = this._prepararImportacion(filas);
          const nuevas = preparado.columnasNuevas.length
            ? `<p class="adm-cabecera__sub">Se crearán ${preparado.columnasNuevas.length} columna(s) nuevas en esta evaluación: ${preparado.columnasNuevas.map(esc).join(', ')}</p>`
            : '';
          const sinDatos = preparado.columnasSinDatos.length
            ? `<p class="adm-cabecera__sub">Columnas de la evaluación sin datos en el archivo (quedan vacías): ${preparado.columnasSinDatos.map(esc).join(', ')}</p>`
            : '';
          const fueraRango = preparado.descartadas
            ? `<p class="adm-aviso adm-aviso--error">${preparado.descartadas} celda(s) con nota fuera del rango 0-${this._rangoNota()} se ignorarán.</p>`
            : '';
          preview.innerHTML = `<div class="adm-aviso adm-aviso--exito">
              <strong>${esc(archivo.name)}</strong> · ${preparado.alumnos} alumno(s) ·
              ${preparado.columnas + preparado.columnasNuevas.length} columna(s) del archivo${preparado.columnasNuevas.length ? ` (${preparado.columnasNuevas.length} nueva(s))` : ''} · ${preparado.finales.length} nota(s) final(es).
            </div>${nuevas}${sinDatos}${fueraRango}`;
          boton.disabled = !preparado.alumnos;
        } catch (e) {
          preview.innerHTML = '';
          error.textContent = 'No se pudo leer el archivo: ' + e.message;
          error.hidden = false;
        }
      });

      boton.addEventListener('click', async () => {
        if (!preparado) return;
        boton.disabled = true;
        try {
          // 1) Primero las columnas que el archivo trae y la evaluación no:
          //    la rejilla acaba siendo una copia de la hoja de cálculo.
          //    Se reenvían TODAS las columnas (las existentes conservan su id
          //    y su orden; el RPC borra lo que no se liste).
          const columnas = await this._crearColumnasImportadas(preparado);
          // 2) Con las columnas ya creadas (ids reales), se copian las notas.
          const celdas = this._resolverCeldasImportadas(preparado, columnas);
          const r = await window.plataformaRepository.importarEvaluacion(
            this._id, celdas, preparado.finales
          );
          modal.cerrar();
          window.helpers.mostrarAlerta(
            'Importadas ' + ((r && r.celdas) || 0) + ' celda(s) y ' + ((r && r.finales) || 0) + ' nota(s) final(es).',
            'exito'
          );
          const raiz = document.querySelector('#app-root');
          if (raiz) await this._cargar(raiz);
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
        }
      });
    },

    /**
     * Crea en la evaluación las columnas que el archivo trae y aún no existen.
     * Devuelve la lista real de columnas del servidor (las existentes conservan
     * id y orden; las nuevas se añaden al final en el orden del archivo), que
     * es lo que permite resolver los ids provisorios de las celdas.
     */
    async _crearColumnasImportadas(preparado) {
      if (!preparado.columnasNuevas.length) return this._datos.columnas || [];
      // El RPC sincroniza la lista completa: lo que no se envíe se borra,
      // así que se reenvían las existentes (con su id) y se añaden las nuevas.
      // Sin la clave «peso»: el servidor conserva las ponderaciones.
      const existentes = (this._datos.columnas || []).map((c) => ({
        id: c.id || null, tipo: c.tipo || 'manual', examen_id: c.examen_id || null, nombre: c.nombre
      }));
      // Un reintento tras fallo parcial puede encontrar ya creadas algunas de
      // las «nuevas» (el nombre ya está en la evaluación): no se duplican.
      const nombres = new Set(existentes.map((c) => clave(c.nombre)));
      const faltantes = preparado.columnasNuevas.filter((n) => !nombres.has(clave(n)));
      if (!faltantes.length) return this._datos.columnas || [];
      const lista = existentes.concat(
        faltantes.map((nombre) => ({ id: null, tipo: 'manual', examen_id: null, nombre }))
      );
      const guardadas = await window.plataformaRepository.guardarColumnasEvaluacion(this._id, lista);
      const columnas = (guardadas && guardadas.columnas) || [];
      if (!columnas.length) {
        // Sin ids reales no se puede escribir ninguna nota: se avisa y se
        // pide repetir la importación (las columnas ya existirán entonces).
        throw new Error('No se pudo confirmar la creación de columnas. Vuelve a importar el mismo archivo.');
      }
      this._datos.columnas = columnas;
      return columnas;
    },

    /**
     * Reescribe las celdas provisionales (columnas recién creadas) con los ids
     * reales del servidor. El emparejamiento es por nombre normalizado, igual
     * que al preparar la importación.
     */
    _resolverCeldasImportadas(preparado, columnas) {
      const porNombre = new Map((columnas || []).map((c) => [clave(c.nombre), c.id]));
      return (preparado.celdas || []).map((celda) => {
        if (!celda.columna_id || String(celda.columna_id).indexOf('nueva:') !== 0) return celda;
        const nombre = preparado.columnasNuevas[Number(String(celda.columna_id).slice(6))];
        const id = nombre == null ? null : porNombre.get(clave(nombre));
        return id ? { alumno: celda.alumno, columna_id: id, nota: celda.nota } : null;
      }).filter(Boolean);
    },

    /** Convierte las filas parseadas en celdas/finales con las columnas reales.
     *
     * La tabla se copia del archivo: las cabeceras que no coinciden con una
     * columna existente se devuelven en `columnasNuevas` (en el orden del
     * archivo) para que se creen antes de escribir las notas. Los identificadores
     * provisorios de esas columnas son «nueva:<índice>» y se resuelven con
     * _resolverCeldasImportadas una vez que el servidor les ha dado id. */
    _prepararImportacion(filas) {
      if (!filas || filas.length < 2) {
        throw new Error('El archivo necesita una fila de encabezados y al menos un alumno.');
      }
      const max = this._rangoNota();
      const cabecera = filas[0].map((c) => String(c == null ? '' : c).trim());
      const ultima = cabecera.length - 1;
      const porIndice = {};
      const columnasNuevas = [];
      const existentes = new Map((this._datos.columnas || []).map((c) => [clave(c.nombre), c]));
      const indiceDeNueva = new Map(); // nombre normalizado → posición en columnasNuevas
      cabecera.forEach((nombre, i) => {
        if (i === 0 || i === ultima || !nombre) return;
        const k = clave(nombre);
        const existente = existentes.get(k);
        if (existente) { porIndice[i] = existente; return; }
        // Cabecera repetida en el archivo: se suman sus celdas a la misma
        // columna (manda la última nota) en vez de duplicarla.
        if (indiceDeNueva.has(k)) { porIndice[i] = { id: 'nueva:' + indiceDeNueva.get(k) }; return; }
        // Columna nueva: se crea al importar, con el nombre del archivo.
        indiceDeNueva.set(k, columnasNuevas.length);
        columnasNuevas.push(nombre);
        porIndice[i] = { id: 'nueva:' + (columnasNuevas.length - 1) };
      });
      // Columnas de la evaluación que el archivo no trae: se avisa antes de
      // importar para que no haya celdas vacías por sorpresa.
      const usadas = new Set(Object.keys(porIndice).map((i) => {
        const c = porIndice[i];
        return String(c.id).indexOf('nueva:') === 0 ? null : c.id;
      }).filter(Boolean));
      const columnasSinDatos = (this._datos.columnas || [])
        .filter((c) => !usadas.has(c.id))
        .map((c) => c.nombre);

      const celdas = [];
      const finales = [];
      const alumnos = new Set();
      const indiceCelda = new Map(); // alumno|columna → posición en celdas
      let descartadas = 0;           // celdas/finales con nota fuera de rango
      for (let f = 1; f < filas.length; f++) {
        const fila = filas[f] || [];
        const alumno = String(fila[0] == null ? '' : fila[0]).trim();
        if (!alumno) continue;
        alumnos.add(alumno);
        Object.keys(porIndice).forEach((i) => {
          const nota = notaDe(fila[Number(i)]);
          if (nota == null) return;
          if (nota < 0 || nota > max) { descartadas++; return; }
          const columnaId = porIndice[i].id;
          const previa = indiceCelda.get(alumno + '|' + columnaId);
          // Con columnas repetidas en el archivo manda la última nota.
          if (previa == null) {
            indiceCelda.set(alumno + '|' + columnaId, celdas.length);
            celdas.push({ alumno, columna_id: columnaId, nota });
          } else {
            celdas[previa] = { alumno, columna_id: columnaId, nota };
          }
        });
        const final = notaDe(fila[ultima]);
        if (final != null && (final < 0 || final > max)) descartadas++;
        else if (final != null) finales.push({ alumno, nota: final });
      }
      if (!alumnos.size) throw new Error('No se reconoció ningún alumno en la primera columna.');
      return {
        celdas, finales, alumnos: alumnos.size,
        columnas: usadas.size, columnasNuevas, columnasSinDatos, descartadas
      };
    },

    // ── Exportar ──────────────────────────────────────────────────────────
    /** Texto del CSV: separador «;» y coma decimal, el formato que Excel en español espera. */
    _csvContenido() {
      const d = this._datos;
      const columnas = d.columnas || [];
      const alumnos = d.alumnos || [];
      const celdasMap = this._celdasMap();
      const finalesMap = this._finalesMap();
      const coma = (v) => (v == null ? '' : String(v).replace('.', ','));
      // Escapa un campo CSV: si lleva «;», comilla o salto de línea va entre
      // comillas dobles (RFC 4180), si no Excel lo partiría en trozos.
      const campo = (v) => {
        const s = v == null ? '' : String(v);
        return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };

      const lineas = [['Alumno'].concat(columnas.map((c) => campo(c.nombre))).concat(['Nota final']).join(';')];
      alumnos.forEach((alumno) => {
        const fila = [campo(alumno)];
        columnas.forEach((c) => {
          const celda = celdasMap.get(clave(alumno) + '|' + c.id);
          fila.push(coma(celda && celda.nota != null ? Number(celda.nota) : null));
        });
        const final = finalesMap.get(clave(alumno));
        const valor = final && final.nota != null ? Number(final.nota) : this._mediaAlumno(alumno);
        fila.push(coma(valor));
        lineas.push(fila.join(';'));
      });
      return lineas.join('\r\n') + '\r\n';
    },

    _exportarCSV() {
      descargar(baseNombre(this._datos.evaluacion) + '.csv', '\uFEFF' + this._csvContenido(), 'text/csv;charset=utf-8');
      window.helpers.mostrarAlerta('CSV descargado.', 'exito');
    },

    _exportarJSON() {
      const d = this._datos;
      const copia = {
        formato: 'formsbiblicos-evaluacion-v1',
        exportado_en: new Date().toISOString(),
        evaluacion: d.evaluacion,
        columnas: d.columnas,
        alumnos: d.alumnos,
        celdas: d.celdas,
        finales: d.finales
      };
      descargar(baseNombre(d.evaluacion) + '.json', JSON.stringify(copia, null, 2), 'application/json;charset=utf-8');
      window.helpers.mostrarAlerta('Copia de seguridad (JSON) descargada.', 'exito');
    }
  };

  // Con guion bajo para los tests (mismo criterio que _formatearAuto en
  // vista-entregas): los parsers de CSV y XLSX son lógica pura y se prueban
  // directamente.
  window.vistaEvaluacionEditar._parseCSV = parseCSV;
  window.vistaEvaluacionEditar._parseXLSX = parseXLSX;
})();
