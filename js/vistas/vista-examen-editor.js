/* ============================================================================
 * js/vistas/vista-examen-editor.js — editor de exámenes
 * ----------------------------------------------------------------------------
 * Ocho tipos de pregunta, todos ellos con el MISMO contrato de datos
 * ({ id, texto, tipo, opciones, respuesta_correcta, huecos, puntos,
 *   obligatoria }) que ya entienden las RPCs del servidor
 * (fb_respuesta_correcta / fb_calcular_puntuacion), la vista de entrega
 * (public-site/examen.js) y la corrección (vista-entregas.js):
 *
 *   · multiple        → test de respuesta única (índice como respuesta)
 *   · varias_opciones → varias respuestas correctas (array JSON de índices)
 *   · verdadero_falso → afirmación V/F (índice 0/1 con opciones [Verdadero, Falso])
 *   · completar       → frase con hueco(s); variantes aceptadas por «|»
 *                       (o multi-hueco legado con marcadores {{HUECO_n}})
 *   · respuesta_corta → palabra o frase breve; corrección manual
 *   · texto_largo     → desarrollo; corrección manual
 *   · relacionar      → parejas izquierda/derecha (mapeo identidad)
 *   · ordenar         → secuencia correcta (opciones en orden correcto)
 *
 * `respuesta_correcta` de un test es el ÍNDICE (texto) de la opción marcada,
 * tal como lo compara fb_respuesta_correcta en la BD.
 *
 * El botón «Añadir pregunta» abre un selector visual (panelUI.modal) con el
 * nombre de cada formato y si se corrige sola.
 * =========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];

  /** Tipos que el servidor puntúa solo (y que la corrección pre-rellena). */
  const AUTOMATICOS = ['multiple', 'varias_opciones', 'verdadero_falso', 'completar', 'relacionar', 'ordenar'];

  const TIPOS = [
    {
      valor: 'multiple', nombre: 'Opción múltiple', automatica: true,
      descripcion: 'Varias opciones y una sola respuesta correcta.',
      ejemplo: '¿Quién construyó el arca? — Noé'
    },
    {
      valor: 'verdadero_falso', nombre: 'Verdadero o falso', automatica: true,
      descripcion: 'El alumno califica una afirmación como verdadera o falsa.',
      ejemplo: '«Jonás huyó de Dios» — Falso'
    },
    {
      valor: 'completar', nombre: 'Completar una frase', automatica: true,
      descripcion: 'Una palabra o expresión que falta; aceptas todas las variantes posibles.',
      ejemplo: 'El Señor es mi ___; nada me faltará.'
    },
    {
      valor: 'respuesta_corta', nombre: 'Respuesta corta', automatica: false,
      descripcion: 'Una palabra, nombre o frase breve. Corrección manual con respuesta de referencia opcional.',
      ejemplo: '¿En qué ciudad nació Jesús? — Belén'
    },
    {
      valor: 'texto_largo', nombre: 'Respuesta desarrollada', automatica: false,
      descripcion: 'Explicar, justificar o resumir. Corrección manual.',
      ejemplo: 'Explica qué enseñanza transmite la parábola del buen samaritano.'
    },
    {
      valor: 'varias_opciones', nombre: 'Varias respuestas', automatica: true,
      descripcion: 'El alumno marca todas las opciones correctas.',
      ejemplo: 'Elige los dones del Espíritu: sabiduría, poder, consejo…'
    },
    {
      valor: 'relacionar', nombre: 'Relacionar columnas', automatica: true,
      descripcion: 'Une cada elemento de la izquierda con su pareja de la derecha.',
      ejemplo: 'Moisés → Éxodo · Noé → arca'
    },
    {
      valor: 'ordenar', nombre: 'Ordenar elementos', automatica: true,
      descripcion: 'Coloca los elementos en la secuencia correcta.',
      ejemplo: 'Ordena acontecimientos: nacimiento, bautismo, crucifixión…'
    }
  ];

  const esc = (v) => window.panelUI.esc(v);

  function nuevoId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /** ¿El enunciado usa marcadores {{HUECO_n}} de multi-hueco (formato legado)? */
  function conMarcadores(texto) {
    return /\{\{HUECO_\d+\}\}/.test(String(texto || ''));
  }

  function identidad(n) {
    const mapa = {};
    for (let k = 0; k < n; k++) mapa[k] = k;
    return JSON.stringify(mapa);
  }

  function preguntaPorTipo(tipo) {
    const base = {
      id: nuevoId(),
      texto: '',
      tipo,
      opciones: [],
      respuesta_correcta: null,
      huecos: [],
      puntos: 1,
      obligatoria: true
    };
    switch (tipo) {
      case 'multiple':
      case 'varias_opciones':
        base.opciones = ['', ''];
        base.respuesta_correcta = tipo === 'multiple' ? '0' : '[]';
        break;
      case 'verdadero_falso':
        base.opciones = ['Verdadero', 'Falso'];
        base.respuesta_correcta = '0';
        break;
      case 'completar':
        base.huecos = [{ respuesta_correcta: '', variantes: [] }];
        break;
      case 'respuesta_corta':
        base.respuesta_correcta = '';
        break;
      case 'relacionar':
        base.opciones = ['', '', '', ''];
        base.respuesta_correcta = identidad(2);
        break;
      case 'ordenar':
        base.opciones = ['', ''];
        base.respuesta_correcta = JSON.stringify([0, 1]);
        break;
      default:
        break;
    }
    return base;
  }

  function preguntaTest() {
    return Object.assign(preguntaPorTipo('multiple'), { opciones: ['', ''] });
  }

  function intentarJSON(valor, defecto) {
    try {
      const dato = JSON.parse(valor);
      return dato == null ? defecto : dato;
    } catch (e) {
      return defecto;
    }
  }

  /**
   * Normaliza lo que llega de la BD al formato interno del editor.
   * Conserva SIEMPRE el tipo de pregunta conocido (nunca degrada un test a
   * «desarrollada») y normaliza los formatos legados:
   *   · V/F legado ('true'/'false' sin opciones) → índice 0/1 con ['Verdadero','Falso']
   *   · opcion_unica → multiple
   *   · relacionar con mapeo no identidad → parejas reordenadas + identidad
   *   · ordenar con permuta no identidad → opciones reordenadas + identidad
   *   · completar legado (palabras en huecos, sin marcadores) → «a|b|c»
   */
  function normalizar(preguntas) {
    return (Array.isArray(preguntas) ? preguntas : []).map((p) => {
      p = p || {};
      let tipo = String(p.tipo || 'multiple');
      if (tipo === 'opcion_unica') tipo = 'multiple';
      if (!TIPOS.some((t) => t.valor === tipo)) tipo = 'texto_largo';

      const comun = {
        id: p.id || nuevoId(),
        texto: p.texto || '',
        tipo,
        puntos: Math.max(0, Number(p.puntos) || 1),
        obligatoria: p.obligatoria !== false
      };
      const opciones = (Array.isArray(p.opciones) ? p.opciones : [])
        .map((o) => String(o == null ? '' : o));

      if (tipo === 'multiple') {
        return Object.assign(comun, {
          opciones: opciones.length >= 2 ? opciones : ['', ''],
          respuesta_correcta: opciones.length > 0 &&
            Number.isInteger(Number(p.respuesta_correcta)) &&
            Number(p.respuesta_correcta) >= 0 &&
            Number(p.respuesta_correcta) < opciones.length
            ? String(Number(p.respuesta_correcta))
            : '0',
          huecos: []
        });
      }

      if (tipo === 'varias_opciones') {
        const marcadas = (Array.isArray(p.respuesta_correcta)
          ? p.respuesta_correcta
          : intentarJSON(p.respuesta_correcta, []))
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 0 && n < opciones.length);
        return Object.assign(comun, {
          opciones: opciones.length >= 2 ? opciones : ['', ''],
          respuesta_correcta: JSON.stringify([...new Set(marcadas)].sort((a, b) => a - b)),
          huecos: []
        });
      }

      if (tipo === 'verdadero_falso') {
        const crudo = String(p.respuesta_correcta == null ? '0' : p.respuesta_correcta);
        let indice = '0';
        if (crudo === 'true' || crudo === '0') indice = '0';
        else if (crudo === 'false' || crudo === '1') indice = '1';
        return Object.assign(comun, {
          opciones: ['Verdadero', 'Falso'],
          respuesta_correcta: indice,
          huecos: []
        });
      }

      if (tipo === 'completar') {
        if (conMarcadores(p.texto)) {
          // Multi-hueco legado: se conservan id, respuestas y variantes.
          const huecos = (Array.isArray(p.huecos) ? p.huecos : []).map((h, i) => ({
            id: (h && Number(h.id)) || i + 1,
            respuesta_correcta: String((h && h.respuesta_correcta) || '').trim(),
            variantes: Array.isArray(h && h.variantes)
              ? h.variantes.map((v) => String(v || '').trim()).filter(Boolean)
              : []
          }));
          return Object.assign(comun, { huecos, respuesta_correcta: null, opciones: [] });
        }
        // Frase con un hueco: todas las palabras aceptadas van en «huecos»
        // (para la interfaz) y se guardan unidas por «|» (para el servidor).
        let palabras = (Array.isArray(p.huecos) ? p.huecos : [])
          .map((h) => String((h && h.respuesta_correcta) || '').trim())
          .filter(Boolean);
        if (!palabras.length && typeof p.respuesta_correcta === 'string') {
          palabras = p.respuesta_correcta.split('|').map((s) => s.trim()).filter(Boolean);
        }
        return Object.assign(comun, {
          huecos: palabras.map((w) => ({ respuesta_correcta: w, variantes: [] })),
          respuesta_correcta: palabras.join('|'),
          opciones: []
        });
      }

      if (tipo === 'respuesta_corta') {
        return Object.assign(comun, {
          respuesta_correcta: String(p.respuesta_correcta || '').trim() || null,
          opciones: [],
          huecos: []
        });
      }

      if (tipo === 'relacionar') {
        // El mapeo legado (izquierda → índice de la derecha) se reescribe como
        // parejas en orden + identidad, para que las filas del editor muestren
        // la pareja correcta y la corrección siga significando lo mismo.
        let limpias = opciones;
        if (limpias.length % 2 !== 0) limpias = limpias.slice(0, limpias.length - 1);
        const mitad = limpias.length / 2;
        const izq = limpias.slice(0, mitad);
        const der = limpias.slice(mitad);
        const correcta = intentarJSON(p.respuesta_correcta, {});
        const valido = mitad > 0 && izq.every((_, i) => {
          const d = Number(correcta[i]);
          return Number.isInteger(d) && d >= 0 && d < mitad;
        });
        const derFinal = valido ? izq.map((_, i) => der[Number(correcta[i])]) : der;
        return Object.assign(comun, {
          opciones: izq.concat(derFinal),
          respuesta_correcta: identidad(mitad || 1),
          huecos: []
        });
      }

      if (tipo === 'ordenar') {
        // La secuencia correcta se reordena encima de las opciones para que la
        // lista numerada del editor sea siempre la respuesta correcta.
        const permuta = (Array.isArray(p.respuesta_correcta)
          ? p.respuesta_correcta
          : intentarJSON(p.respuesta_correcta, []))
          .map(Number);
        const esPermuta = permuta.length === opciones.length &&
          permuta.length > 0 &&
          permuta.every((n, i) => n === i) === false &&
          [...permuta].sort((a, b) => a - b).every((n, i) => n === i);
        const ordenadas = esPermuta ? permuta.map((i) => opciones[i]) : opciones;
        return Object.assign(comun, {
          opciones: ordenadas,
          respuesta_correcta: JSON.stringify(ordenadas.map((_, i) => i)),
          huecos: []
        });
      }

      // texto_largo (y cualquier tipo legado no reconocido, ya convertido).
      return Object.assign(comun, { opciones: [], respuesta_correcta: null, huecos: [] });
    });
  }

  window.vistaExamenEditor = {
    _examen: null,
    _guardando: false,
    tipos: TIPOS,

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !ROLES.includes((usuario.rol || '').toLowerCase())) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }

      const id = params && params.id;
      const editando = id && id !== 'nuevo';
      raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="adm-cabecera__sub">Cargando…</p></div>`;

      let examen;
      if (editando) {
        try {
          examen = await window.examenesRepository.obtener(id);
        } catch (e) {
          examen = null;
        }
        if (!examen) {
          raiz.innerHTML = `<div class="o-contenedor u-mt-4">
            <div class="adm-aviso adm-aviso--error">No se encontró el examen.</div>
            <button class="adm-btn" id="btnVolver">Volver a mis exámenes</button></div>`;
          raiz.querySelector('#btnVolver').addEventListener('click', () => router.navegar('/examenes'));
          return;
        }
        let preguntas = examen.preguntas;
        if (typeof preguntas === 'string') {
          try { preguntas = JSON.parse(preguntas); } catch (e) { preguntas = []; }
        }
        examen = {
          id: examen.id,
          grupo_id: examen.grupo_id,
          creado_por: examen.creado_por,
          titulo: examen.titulo || '',
          descripcion: examen.descripcion || '',
          estado: examen.estado || 'borrador',
          publicado: !!examen.publicado,
          config: examen.config || {},
          preguntas: normalizar(preguntas)
        };
        if (!examen.preguntas.length) examen.preguntas = [preguntaTest()];
      } else {
        examen = {
          grupo_id: usuario.grupo_id || null,
          creado_por: usuario.id,
          titulo: '',
          descripcion: '',
          estado: 'borrador',
          publicado: false,
          config: {},
          preguntas: [preguntaTest()]
        };
      }
      this._examen = examen;

      this._pintar(raiz);
    },

    desmontar() {
      this._examen = null;
      this._guardando = false;
    },

    // ── Pintado ───────────────────────────────────────────────────────────
    _pintar(raiz) {
      const ex = this._examen;
      const estado = ex.estado === 'publicado'
        ? '<span class="adm-badge adm-badge--publicado">Publicado</span>'
        : (ex.estado === 'cerrado' ? '<span class="adm-badge adm-badge--cerrado">Cerrado</span>' : '<span class="adm-badge adm-badge--borrador">Borrador</span>');

      raiz.innerHTML = `
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(120px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera adm-cabecera--editor">
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">${ex.id ? 'Editar examen' : 'Nuevo examen'} ${estado}</h1>
              <p class="adm-cabecera__sub" id="subTotal"></p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn" id="btnVolver">Volver</button>
              <button class="adm-btn" id="btnGuardar" aria-label="Guardar como borrador">
                <span class="adm-cabecera__etiqueta-larga">Guardar borrador</span><span class="adm-cabecera__etiqueta-corta">Guardar</span>
              </button>
              <button class="adm-btn adm-btn--principal" id="btnPublicarEditor" aria-label="${ex.publicado ? 'Guardar y cerrar' : 'Guardar y publicar'}">
                <span class="adm-cabecera__etiqueta-larga">${ex.publicado ? 'Guardar y cerrar' : 'Guardar y publicar'}</span><span class="adm-cabecera__etiqueta-corta">${ex.publicado ? 'Cerrar' : 'Publicar'}</span>
              </button>
            </div>
          </header>

          <div id="aviso" class="adm-aviso adm-aviso--error" hidden></div>

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Datos del examen</h2>
            <div class="adm-campo">
              <label class="adm-campo__etiqueta" for="titulo">Título</label>
              <input class="adm-entrada" id="titulo" type="text" maxlength="160" value="${esc(ex.titulo)}" placeholder="Ej.: Examen de matemáticas — Tema 4">
            </div>
            <div class="adm-campo">
              <label class="adm-campo__etiqueta" for="descripcion">Descripción o instrucciones (opcional)</label>
              <textarea class="adm-entrada" id="descripcion" maxlength="1200" placeholder="Instrucciones para el alumno…">${esc(ex.descripcion)}</textarea>
            </div>
          </section>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Preguntas</h2>
            <div id="preguntas"></div>
            <div style="display:flex;gap:var(--espaciado-xs);flex-wrap:wrap;margin-top:var(--espaciado-sm)">
              <button class="adm-btn adm-btn--principal" id="btnAddPregunta">＋ Añadir pregunta</button>
            </div>
          </section>
        </div>`;

      raiz.querySelector('#btnVolver').addEventListener('click', () => router.navegar('/examenes'));
      raiz.querySelector('#titulo').addEventListener('input', (e) => { this._examen.titulo = e.target.value; });
      raiz.querySelector('#descripcion').addEventListener('input', (e) => { this._examen.descripcion = e.target.value; });
      raiz.querySelector('#btnAddPregunta').addEventListener('click', () => {
        this._sincronizarCampos();
        this._mostrarSelectorTipo();
      });
      raiz.querySelector('#btnGuardar').addEventListener('click', () => this._guardar(false));
      raiz.querySelector('#btnPublicarEditor').addEventListener('click', () => this._guardar(true));

      this._pintarPreguntas();
    },

    /**
     * Selector visual de tipos: cada tarjeta es el nombre del formato y una
     * etiqueta con su tipo de corrección (patrón .selector-tipo de CSS).
     * Sin descripción ni ejemplo: el nombre ya identifica el tipo y así la
     * lista se lee de un vistazo (el catálogo TIPOS conserva ambos por si se
     * muestran en otro sitio).
     */
    _mostrarSelectorTipo() {
      const modal = window.panelUI.modal({
        titulo: 'Añadir pregunta',
        cuerpoHtml: `
          <p class="adm-campo__ayuda" style="margin-top:0">
            Elige un tipo. Después podrás cambiar de tipo en cualquier momento y
            asignar puntuación, posición y si es obligatoria.
          </p>
          <div class="selector-tipo-grid">
            ${TIPOS.map((t) => `
              <button type="button" class="selector-tipo" data-tipo="${t.valor}">
                <span class="selector-tipo__nombre">${esc(t.nombre)}</span>
                <span class="selector-tipo__correccion ${t.automatica ? 'selector-tipo__correccion--auto' : ''}">
                  ${t.automatica ? 'Corrección automática' : 'Corrección manual'}
                </span>
              </button>`).join('')}
          </div>`,
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>`,
        ancho: '680px'
      });

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.cuerpo.querySelectorAll('.selector-tipo').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._sincronizarCampos();
          this._examen.preguntas.push(preguntaPorTipo(btn.dataset.tipo));
          modal.cerrar();
          this._pintarPreguntas();
          const tarjetas = document.querySelectorAll('#preguntas .adm-pregunta');
          if (tarjetas.length) {
            tarjetas[tarjetas.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    },

    _pintarPreguntas() {
      const contenedor = document.querySelector('#preguntas');
      if (!contenedor) return;

      if (!this._examen.preguntas.length) {
        contenedor.innerHTML = `<div class="adm-vacio">
          <p class="adm-vacio__titulo">Sin preguntas</p>
          <p>Añade al menos una pregunta para poder guardar el examen.</p>
        </div>`;
        this._actualizarTotal();
        return;
      }

      contenedor.innerHTML = this._examen.preguntas.map((p, i) => this._htmlPregunta(p, i)).join('');

      contenedor.querySelectorAll('[data-q]').forEach((nodo) => {
        const idx = Number(nodo.dataset.q);
        const accion = nodo.dataset.qAccion;
        if (!accion) return;
        nodo.addEventListener('click', () => this._accionPregunta(accion, idx, nodo));
      });

      contenedor.querySelectorAll('[data-campo]').forEach((nodo) => {
        const idx = Number(nodo.dataset.q);
        const campo = nodo.dataset.campo;
        const evento = (nodo.tagName === 'SELECT' || nodo.type === 'checkbox' || nodo.type === 'radio') ? 'change' : 'input';
        nodo.addEventListener(evento, () => {
          const p = this._examen.preguntas[idx];
          if (!p) return;
          this._aplicarCampo(p, campo, nodo);
          this._actualizarTotal();
        });
      });

      this._actualizarTotal();
    },

    /** Escribe el valor de un campo del DOM en la pregunta en memoria. */
    _aplicarCampo(p, campo, nodo) {
      if (campo === 'texto') p.texto = nodo.value;
      else if (campo === 'puntos') p.puntos = Math.max(0, Number(nodo.value) || 0);
      else if (campo === 'obligatoria') p.obligatoria = nodo.checked;
      else if (campo === 'tipo') this._cambiarTipo(this._examen.preguntas.indexOf(p), nodo.value);
      else if (campo === 'opcion') {
        const mitad = Math.floor(p.opciones.length / 2);
        if (nodo.dataset.par !== undefined) p.opciones[Number(nodo.dataset.pidx)] = nodo.value;
        else if (nodo.dataset.parDer !== undefined) p.opciones[mitad + Number(nodo.dataset.pidx)] = nodo.value;
        else if (nodo.dataset.eidx !== undefined) p.opciones[Number(nodo.dataset.eidx)] = nodo.value;
        else p.opciones[Number(nodo.dataset.opcion)] = nodo.value;
      } else if (campo === 'correcta') p.respuesta_correcta = nodo.value;
      else if (campo === 'correctaVar') {
        const marcadas = [];
        document.querySelectorAll(`[data-campo="correctaVar"][data-q="${this._examen.preguntas.indexOf(p)}"]:checked`)
          .forEach((c) => marcadas.push(Number(c.dataset.opcion)));
        p.respuesta_correcta = JSON.stringify(marcadas.sort((a, b) => a - b));
      } else if (campo === 'respuestaCorrecta') p.respuesta_correcta = nodo.value;
      else if (campo === 'palabra') {
        if (!Array.isArray(p.huecos)) p.huecos = [];
        const idxH = Number(nodo.dataset.hidx);
        if (p.huecos[idxH]) p.huecos[idxH].respuesta_correcta = nodo.value;
        p.respuesta_correcta = p.huecos.map((h) => String(h.respuesta_correcta || '').trim()).filter(Boolean).join('|');
      } else if (campo === 'hueco') {
        if (!Array.isArray(p.huecos)) p.huecos = [];
        const idxH = Number(nodo.dataset.hidx);
        if (p.huecos[idxH]) p.huecos[idxH].respuesta_correcta = nodo.value;
      }
    },

    _htmlPregunta(p, i) {
      const mitad = Math.floor((p.opciones || []).length / 2);
      let cuerpoExtra = '';

      if (p.tipo === 'multiple' || p.tipo === 'varias_opciones') {
        const esMultiple = p.tipo === 'varias_opciones';
        let correctas = [];
        if (esMultiple) correctas = intentarJSON(p.respuesta_correcta, []).map(Number);
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">${esMultiple ? 'Opciones (marca las correctas)' : 'Opciones (marca la correcta)'}</span>
            ${(p.opciones || []).map((opcion, j) => `
              <div class="adm-opcion">
                <input class="adm-opcion__radio" type="${esMultiple ? 'checkbox' : 'radio'}" name="correcta_${i}" value="${j}"
                  data-q="${i}" data-campo="${esMultiple ? 'correctaVar' : 'correcta'}" data-opcion="${j}"
                  ${(esMultiple ? correctas.includes(j) : String(p.respuesta_correcta) === String(j)) ? 'checked' : ''}
                  aria-label="Marcar opción ${j + 1} como ${esMultiple ? 'correcta' : 'la correcta'}">
                <input class="adm-entrada" type="text" value="${esc(opcion)}" placeholder="Opción ${j + 1}"
                  data-q="${i}" data-campo="opcion" data-opcion="${j}" data-opcion-val="${j}" aria-label="Texto de la opción ${j + 1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${i}" data-q-accion="quitarOpcion" data-opcion="${j}"
                  ${(p.opciones || []).length <= 2 ? 'disabled' : ''} aria-label="Quitar opción ${j + 1}">✕</button>
              </div>`).join('')}
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="anadirOpcion">Añadir opción</button>
            ${esMultiple && !correctas.length ? '<p class="adm-campo__ayuda">Marca al menos una opción como correcta.</p>' : ''}
          </div>`;
      } else if (p.tipo === 'verdadero_falso') {
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Respuesta correcta</span>
            <div style="display:flex;gap:var(--espaciado-xs)">
              ${[0, 1].map((j) => `
                <label class="adm-opcion">
                  <input type="radio" name="correcta_${i}" value="${j}"
                    data-q="${i}" data-campo="correcta" ${String(p.respuesta_correcta) === String(j) ? 'checked' : ''}
                    aria-label="Marcar como ${j === 0 ? 'Verdadero' : 'Falso'}">
                  ${j === 0 ? 'Verdadero' : 'Falso'}
                </label>`).join('')}
            </div>
          </div>`;
      } else if (p.tipo === 'completar') {
        const huecos = Array.isArray(p.huecos) ? p.huecos : [];
        const marcado = conMarcadores(p.texto);
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">${marcado ? 'Respuesta de cada hueco del enunciado' : 'Palabras que el alumno puede escribir (todas se aceptan como correctas)'}</span>
            ${huecos.length === 0
              ? `<p class="adm-campo__ayuda">Añade al menos una palabra o expresión aceptada.</p>`
              : huecos.map((h, hidx) => `
                <div style="display:flex;gap:var(--espaciado-xs);margin-bottom:var(--espaciado-xs);align-items:center">
                  ${marcado ? `<span class="adm-campo__etiqueta" style="margin:0;flex:0 0 auto">Hueco ${(h && h.id) || hidx + 1}</span>` : ''}
                  <input class="adm-entrada adm-entrada--corta" type="text" value="${esc(h.respuesta_correcta || '')}"
                    data-q="${i}" data-campo="${marcado ? 'hueco' : 'palabra'}" data-hidx="${hidx}"
                    placeholder="${marcado ? 'Respuesta del hueco' : 'Ej.: verdad'}"
                    aria-label="${marcado ? 'Respuesta del hueco ' + (hidx + 1) : 'Palabra aceptada ' + (hidx + 1)}">
                  ${marcado ? '' : `
                  <button class="adm-btn adm-btn--pequeno adm-btn--peligro"
                    data-q="${i}" data-q-accion="quitarPalabra" data-hidx="${hidx}"
                    ${huecos.length <= 1 ? 'disabled' : ''} aria-label="Quitar palabra ${hidx + 1}">✕</button>`}
                </div>`).join('')}
            <div style="display:flex;gap:var(--espaciado-xs)">
              ${marcado
                ? `<p class="adm-campo__ayuda">Este enunciado tiene ${huecos.length} hueco(s) marcados con «___» convertidos en huecos; edita sus respuestas arriba.</p>`
                : `<button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="anadirPalabra">Añadir palabra aceptada</button>`}
            </div>
          </div>`;
      } else if (p.tipo === 'respuesta_corta') {
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Respuesta de referencia (para que puedas corregir más rápido)</span>
            <input class="adm-entrada adm-entrada--corta" type="text"
              data-q="${i}" data-campo="respuestaCorrecta" value="${esc(String(p.respuesta_correcta || ''))}"
              placeholder="Ej.: Belén" aria-label="Respuesta de referencia">
            <p class="adm-campo__ayuda">Puedes corregir manualmente desde «Entregas»; este texto es solo una ayuda.</p>
          </div>`;
      } else if (p.tipo === 'relacionar') {
        const parejas = Math.floor((p.opciones || []).length / 2);
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Parejas correctas (izquierda → derecha)</span>
            ${Array.from({ length: parejas }, (_, k) => `
              <div class="adm-opcion" style="align-items:center">
                <input class="adm-entrada" type="text" value="${esc(p.opciones[k] || '')}"
                  data-q="${i}" data-campo="opcion" data-pidx="${k}" data-par="1"
                  placeholder="Izquierda ${k + 1}" aria-label="Elemento de la izquierda ${k + 1}">
                <span aria-hidden="true">→</span>
                <input class="adm-entrada" type="text" value="${esc(p.opciones[mitad + k] || '')}"
                  data-q="${i}" data-campo="opcion" data-pidx="${k}" data-par-der="1"
                  placeholder="Derecha ${k + 1}" aria-label="Elemento de la derecha ${k + 1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${i}" data-q-accion="quitarPar" data-pidx="${k}"
                  ${parejas <= 2 ? 'disabled' : ''} aria-label="Quitar par ${k + 1}">✕</button>
              </div>`).join('')}
            <p class="adm-campo__ayuda">El alumno verá la columna derecha desordenada: debe unir cada elemento con su pareja.</p>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="anadirPar">Añadir par</button>
          </div>`;
      } else if (p.tipo === 'ordenar') {
        const items = (p.opciones || []).length;
        cuerpoExtra = `
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Elementos en su orden correcto</span>
            ${(p.opciones || []).map((o, j) => `
              <div class="adm-opcion" style="align-items:center">
                <span class="adm-campo__etiqueta" style="margin:0;flex:0 0 auto">${j + 1}.</span>
                <input class="adm-entrada" type="text" value="${esc(o)}"
                  data-q="${i}" data-campo="opcion" data-eidx="${j}"
                  placeholder="Elemento ${j + 1}" aria-label="Elemento en posición ${j + 1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${i}" data-q-accion="quitarElemento" data-eidx="${j}"
                  ${items <= 2 ? 'disabled' : ''} aria-label="Quitar elemento ${j + 1}">✕</button>
              </div>`).join('')}
            <p class="adm-campo__ayuda">El alumno los recibirá desordenados y deberá reordenarlos así.</p>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="anadirElemento">Añadir elemento</button>
          </div>`;
      } else {
        cuerpoExtra = `
          <p class="adm-campo__ayuda" style="margin-top:var(--espaciado-sm)">
            El alumno escribirá su respuesta. La corregirás tú desde «Entregas».
          </p>`;
      }

      return `<article class="adm-pregunta">
        <div class="adm-pregunta__cabecera">
          <span class="adm-pregunta__numero">Pregunta ${i + 1}</span>
          <div class="adm-pregunta__acciones">
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="subir" ${i === 0 ? 'disabled' : ''} aria-label="Subir pregunta">↑</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="bajar" ${i === this._examen.preguntas.length - 1 ? 'disabled' : ''} aria-label="Bajar pregunta">↓</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${i}" data-q-accion="duplicar">Duplicar</button>
            <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-q="${i}" data-q-accion="eliminar">Eliminar</button>
          </div>
        </div>

        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="tipo_${i}">Tipo</label>
          <select class="adm-entrada" id="tipo_${i}" data-q="${i}" data-campo="tipo">
            ${TIPOS.map((t) => `<option value="${t.valor}" ${p.tipo === t.valor ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
          </select>
        </div>

        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="texto_${i}">Enunciado</label>
          <textarea class="adm-entrada" id="texto_${i}" data-q="${i}" data-campo="texto" data-campo-pregunta="texto"
            placeholder="${p.tipo === 'completar' ? 'Ej.: El Señor es mi ___; nada me faltará.' : 'Escribe la pregunta…'}">${esc(p.texto)}</textarea>
        </div>

        <div style="display:flex;gap:var(--espaciado-md);flex-wrap:wrap;align-items:flex-end">
          <div class="adm-campo" style="margin-bottom:0">
            <label class="adm-campo__etiqueta" for="puntos_${i}">Puntos</label>
            <input class="adm-entrada adm-entrada--corta" id="puntos_${i}" type="number" min="0" step="0.5"
              value="${esc(p.puntos)}" data-q="${i}" data-campo="puntos">
          </div>
          <div class="adm-campo" style="margin-bottom:0">
            <label class="adm-campo__etiqueta" for="obligatoria_${i}">
              <input type="checkbox" id="obligatoria_${i}" data-q="${i}" data-campo="obligatoria" ${p.obligatoria ? 'checked' : ''}>
              Obligatoria
            </label>
          </div>
        </div>

        ${cuerpoExtra}
      </article>`;
    },

    _cambiarTipo(idx, tipo) {
      const p = this._examen.preguntas[idx];
      if (!p || p.tipo === tipo) return;
      const reemplazo = preguntaPorTipo(tipo);
      // El enunciado y la puntuación se conservan al cambiar de tipo.
      reemplazo.id = p.id;
      reemplazo.texto = p.texto;
      reemplazo.puntos = p.puntos;
      reemplazo.obligatoria = p.obligatoria;
      if (tipo === 'multiple' || tipo === 'varias_opciones') {
        reemplazo.opciones = (p.opciones || []).length >= 2 ? p.opciones.slice() : ['', ''];
      } else if (tipo === 'completar' && p.tipo === 'respuesta_corta' && p.respuesta_correcta) {
        reemplazo.huecos = String(p.respuesta_correcta).split('|')
          .map((w) => w.trim()).filter(Boolean)
          .map((w) => ({ respuesta_correcta: w, variantes: [] }));
        if (!reemplazo.huecos.length) reemplazo.huecos = [{ respuesta_correcta: '', variantes: [] }];
        reemplazo.respuesta_correcta = reemplazo.huecos.map((h) => h.respuesta_correcta).join('|');
      }
      this._examen.preguntas[idx] = reemplazo;
      this._sincronizarCampos();
      this._pintarPreguntas();
    },

    _accionPregunta(accion, idx, nodo) {
      const lista = this._examen.preguntas;
      this._sincronizarCampos();

      if (accion === 'subir' && idx > 0) {
        [lista[idx - 1], lista[idx]] = [lista[idx], lista[idx - 1]];
      } else if (accion === 'bajar' && idx < lista.length - 1) {
        [lista[idx + 1], lista[idx]] = [lista[idx], lista[idx + 1]];
      } else if (accion === 'duplicar') {
        const copia = JSON.parse(JSON.stringify(lista[idx]));
        copia.id = nuevoId();
        lista.splice(idx + 1, 0, copia);
      } else if (accion === 'eliminar') {
        if (lista.length <= 1) {
          window.helpers.mostrarAlerta('El examen necesita al menos una pregunta.', 'aviso');
          return;
        }
        lista.splice(idx, 1);
      } else if (accion === 'anadirOpcion') {
        const p = lista[idx];
        if (p.opciones.length >= 8) {
          window.helpers.mostrarAlerta('Máximo 8 opciones por pregunta.', 'aviso');
          return;
        }
        p.opciones.push('');
      } else if (accion === 'quitarOpcion') {
        const p = lista[idx];
        const j = Number(nodo && nodo.dataset ? nodo.dataset.opcion : -1);
        if (p.opciones.length <= 2) {
          window.helpers.mostrarAlerta('Un test necesita al menos dos opciones.', 'aviso');
          return;
        }
        p.opciones.splice(j, 1);
        if (p.tipo === 'multiple') {
          const actual = Number(p.respuesta_correcta);
          if (!Number.isInteger(actual) || actual >= p.opciones.length) p.respuesta_correcta = '0';
          else if (actual > j) p.respuesta_correcta = String(actual - 1);
        } else if (p.tipo === 'varias_opciones') {
          p.respuesta_correcta = JSON.stringify(
            intentarJSON(p.respuesta_correcta, [])
              .map((n) => (Number(n) > j ? Number(n) - 1 : Number(n)))
              .filter((n) => n !== j)
              .sort((a, b) => a - b)
          );
        }
      } else if (accion === 'anadirPalabra') {
        const p = lista[idx];
        if (!Array.isArray(p.huecos)) p.huecos = [];
        if (p.huecos.length >= 8) {
          window.helpers.mostrarAlerta('Máximo 8 palabras aceptadas.', 'aviso');
          return;
        }
        p.huecos.push({ respuesta_correcta: '', variantes: [] });
      } else if (accion === 'quitarPalabra') {
        const p = lista[idx];
        const hidx = Number(nodo && nodo.dataset ? nodo.dataset.hidx : -1);
        if (Array.isArray(p.huecos) && p.huecos.length > 1 && Number.isInteger(hidx) && p.huecos[hidx]) {
          p.huecos.splice(hidx, 1);
          p.respuesta_correcta = p.huecos.map((h) => String(h.respuesta_correcta || '').trim()).filter(Boolean).join('|');
        } else {
          window.helpers.mostrarAlerta('Una pregunta de completar necesita al menos una palabra aceptada.', 'aviso');
          return;
        }
      } else if (accion === 'anadirPar') {
        const p = lista[idx];
        if (Math.floor(p.opciones.length / 2) >= 6) {
          window.helpers.mostrarAlerta('Máximo 6 parejas por pregunta.', 'aviso');
          return;
        }
        p.opciones.push('');
        p.opciones.splice(Math.floor(p.opciones.length / 2), 0, '');
        p.respuesta_correcta = identidad(Math.floor(p.opciones.length / 2));
      } else if (accion === 'quitarPar') {
        const p = lista[idx];
        const k = Number(nodo && nodo.dataset ? nodo.dataset.pidx : -1);
        const parejas = Math.floor(p.opciones.length / 2);
        if (parejas <= 2) {
          window.helpers.mostrarAlerta('Relacionar necesita al menos dos parejas.', 'aviso');
          return;
        }
        // Tras quitar la izquierda k, la derecha que quedaba en k se desplaza
        // a la posición (parejas - 1 + k): ahí está la pareja que hay que borrar.
        p.opciones.splice(k, 1);
        p.opciones.splice(parejas - 1 + k, 1);
        p.respuesta_correcta = identidad(parejas - 1);
      } else if (accion === 'anadirElemento') {
        const p = lista[idx];
        if (p.opciones.length >= 10) {
          window.helpers.mostrarAlerta('Máximo 10 elementos por pregunta.', 'aviso');
          return;
        }
        p.opciones.push('');
        p.respuesta_correcta = JSON.stringify(p.opciones.map((_, n) => n));
      } else if (accion === 'quitarElemento') {
        const p = lista[idx];
        const j = Number(nodo && nodo.dataset ? nodo.dataset.eidx : -1);
        if (p.opciones.length <= 2) {
          window.helpers.mostrarAlerta('Ordenar necesita al menos dos elementos.', 'aviso');
          return;
        }
        p.opciones.splice(j, 1);
        p.respuesta_correcta = JSON.stringify(p.opciones.map((_, n) => n));
      }

      this._pintarPreguntas();
    },

    /**
     * Los inputs del DOM son la fuente inmediata: antes de reordenar, duplicar o
     * guardar hay que volcar lo escrito a memoria, porque repintar reconstruye
     * el HTML desde el estado.
     */
    _sincronizarCampos() {
      const raiz = document.querySelector('#preguntas');
      if (raiz) {
        raiz.querySelectorAll('[data-campo]').forEach((nodo) => {
          const p = this._examen.preguntas[Number(nodo.dataset.q)];
          if (!p) return;
          const campo = nodo.dataset.campo;
          if (campo === 'tipo') return;
          if ((campo === 'correcta' || campo === 'correctaVar') && !nodo.checked) return;
          this._aplicarCampo(p, campo, nodo);
        });
      }
      const titulo = document.querySelector('#titulo');
      if (titulo) this._examen.titulo = titulo.value;
      const descripcion = document.querySelector('#descripcion');
      if (descripcion) this._examen.descripcion = descripcion.value;
    },

    _actualizarTotal() {
      const sub = document.querySelector('#subTotal');
      if (!sub) return;
      const total = this._examen.preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0);
      const auto = this._examen.preguntas.filter((p) => AUTOMATICOS.includes(p.tipo)).length;
      const manual = this._examen.preguntas.length - auto;
      sub.textContent = `${this._examen.preguntas.length} preguntas · ${total} puntos · ${auto} con corrección automática · ${manual} a corrección manual`;
    },

    // ── Validación y guardado ─────────────────────────────────────────────
    _construirPreguntas() {
      return this._examen.preguntas.map((p, i) => {
        const texto = String(p.texto || '').trim();
        if (!texto) throw new Error('La pregunta ' + (i + 1) + ' está sin enunciado.');
        const puntos = Math.max(0, Number(p.puntos) || 0);
        const obligatoria = p.obligatoria !== false;
        const base = { id: p.id, texto, tipo: p.tipo, puntos, obligatoria };

        if (p.tipo === 'multiple') {
          const opciones = (p.opciones || []).map((o) => String(o || '').trim());
          if (opciones.length < 2) throw new Error('La pregunta ' + (i + 1) + ' necesita al menos dos opciones.');
          if (opciones.some((o) => !o)) throw new Error('La pregunta ' + (i + 1) + ' tiene una opción vacía.');
          const correcta = Number(p.respuesta_correcta);
          if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) {
            throw new Error('Marca la respuesta correcta de la pregunta ' + (i + 1) + '.');
          }
          return Object.assign(base, { tipo: 'multiple', opciones, respuesta_correcta: String(correcta) });
        }

        if (p.tipo === 'varias_opciones') {
          const opciones = (p.opciones || []).map((o) => String(o || '').trim());
          if (opciones.length < 2) throw new Error('La pregunta ' + (i + 1) + ' necesita al menos dos opciones.');
          if (opciones.some((o) => !o)) throw new Error('La pregunta ' + (i + 1) + ' tiene una opción vacía.');
          const marcadas = intentarJSON(p.respuesta_correcta, [])
            .map(Number)
            .filter((n) => Number.isInteger(n) && n >= 0 && n < opciones.length);
          if (!marcadas.length) throw new Error('Marca al menos una opción correcta en la pregunta ' + (i + 1) + '.');
          return Object.assign(base, {
            tipo: 'varias_opciones',
            opciones,
            respuesta_correcta: JSON.stringify([...new Set(marcadas)].sort((a, b) => a - b))
          });
        }

        if (p.tipo === 'verdadero_falso') {
          const correcta = Number(p.respuesta_correcta);
          if (!Number.isInteger(correcta) || correcta < 0 || correcta > 1) {
            throw new Error('Marca la respuesta correcta de la pregunta ' + (i + 1) + '.');
          }
          return Object.assign(base, { tipo: 'verdadero_falso', opciones: ['Verdadero', 'Falso'], respuesta_correcta: String(correcta) });
        }

        if (p.tipo === 'completar') {
          if (conMarcadores(p.texto)) {
            const huecos = (Array.isArray(p.huecos) ? p.huecos : []).map((h, idx) => ({
              id: (h && Number(h.id)) || idx + 1,
              respuesta_correcta: String((h && h.respuesta_correcta) || '').trim(),
              variantes: Array.isArray(h && h.variantes) ? h.variantes.map((v) => String(v || '').trim()).filter(Boolean) : []
            }));
            if (!huecos.length || huecos.some((h) => !h.respuesta_correcta)) {
              throw new Error('La pregunta ' + (i + 1) + ' necesita una respuesta para cada hueco del enunciado.');
            }
            const marcadores = (String(p.texto).match(/\{\{HUECO_\d+\}\}/g) || []).length;
            if (marcadores !== huecos.length) {
              throw new Error('La pregunta ' + (i + 1) + ' tiene ' + marcadores + ' hueco(s) en el texto y ' + huecos.length + ' respuesta(s) configurada(s).');
            }
            return Object.assign(base, { tipo: 'completar', huecos, respuesta_correcta: null });
          }
          const palabras = (Array.isArray(p.huecos) ? p.huecos : [])
            .map((h) => String((h && h.respuesta_correcta) || '').trim())
            .filter(Boolean);
          if (!palabras.length) throw new Error('Añade al menos una palabra aceptada en la pregunta ' + (i + 1) + '.');
          return Object.assign(base, { tipo: 'completar', respuesta_correcta: [...new Set(palabras)].join('|') });
        }

        if (p.tipo === 'respuesta_corta') {
          return Object.assign(base, {
            tipo: 'respuesta_corta',
            respuesta_correcta: String(p.respuesta_correcta || '').trim() || null
          });
        }

        if (p.tipo === 'relacionar') {
          const opciones = (p.opciones || []).map((o) => String(o || '').trim());
          if (opciones.length < 4 || opciones.length % 2 !== 0) {
            throw new Error('La pregunta ' + (i + 1) + ' necesita al menos dos parejas completas.');
          }
          if (opciones.some((o) => !o)) {
            throw new Error('La pregunta ' + (i + 1) + ' tiene una pareja incompleta o vacía.');
          }
          return Object.assign(base, { tipo: 'relacionar', opciones, respuesta_correcta: identidad(opciones.length / 2) });
        }

        if (p.tipo === 'ordenar') {
          const opciones = (p.opciones || []).map((o) => String(o || '').trim());
          if (opciones.length < 2) throw new Error('La pregunta ' + (i + 1) + ' necesita al menos dos elementos.');
          if (opciones.some((o) => !o)) throw new Error('La pregunta ' + (i + 1) + ' tiene un elemento vacío.');
          return Object.assign(base, { tipo: 'ordenar', opciones, respuesta_correcta: JSON.stringify(opciones.map((_, n) => n)) });
        }

        return Object.assign(base, { tipo: 'texto_largo', opciones: [], respuesta_correcta: null });
      });
    },

    _mostrarError(mensaje) {
      const aviso = document.querySelector('#aviso');
      if (!aviso) return;
      aviso.textContent = mensaje;
      aviso.hidden = !mensaje;
      if (mensaje) {
        aviso.classList.remove('adm-aviso--exito');
        aviso.classList.add('adm-aviso--error');
      }
    },

    async _guardar(publicar) {
      if (this._guardando) return;
      this._sincronizarCampos();
      this._mostrarError('');

      const ex = this._examen;
      if (String(ex.titulo || '').trim().length < 3) {
        this._mostrarError('Escribe un título para el examen.');
        return;
      }

      let preguntas;
      try {
        preguntas = this._construirPreguntas();
      } catch (e) {
        this._mostrarError(e.message);
        return;
      }

      const total = preguntas.reduce((s, p) => s + p.puntos, 0);
      if (total <= 0) {
        this._mostrarError('El examen necesita puntuación: asigna puntos a las preguntas.');
        return;
      }

      this._guardando = true;
      const btnGuardar = document.querySelector('#btnGuardar');
      const btnPublicar = document.querySelector('#btnPublicarEditor');
      [btnGuardar, btnPublicar].forEach((b) => { if (b) b.disabled = true; });

      try {
        // El examen siempre pertenece a una clase propia del administrador.
        const usuarioActual = store.obtener('usuario');
        let grupoId = ex.grupo_id;
        let usuario = usuarioActual;

        if (!grupoId) {
          try {
            const actualizado = await window.authRepository.asegurarGrupo(usuario);
            usuario = actualizado;
            grupoId = usuario.grupo_id;
          } catch (e) {
            throw new Error('No se pudo preparar tu espacio de trabajo. Inténtalo de nuevo.');
          }
        }

        if (!grupoId) {
          throw new Error('No se pudo preparar tu espacio de trabajo. Inténtalo de nuevo.');
        }

        const guardado = await window.examenesRepository.guardar({
          id: ex.id,
          grupo_id: grupoId,
          creado_por: ex.creado_por || usuarioActual.id,
          titulo: String(ex.titulo).trim(),
          descripcion: String(ex.descripcion || '').trim(),
          preguntas,
          puntos_totales: total,
          estado: ex.estado || 'borrador',
          publicado: !!ex.publicado,
          config: ex.config || {}
        });

        ex.id = guardado.id;
        ex.grupo_id = guardado.grupo_id;
        ex.creado_por = guardado.creado_por;
        ex.estado = guardado.estado;
        ex.publicado = guardado.publicado;

        if (publicar) {
          if (ex.estado === 'publicado') {
            await window.plataformaRepository.cambiarEstado(ex.id, 'cerrado');
            window.helpers.mostrarAlerta('Examen guardado y cerrado.', 'exito');
          } else {
            await window.plataformaRepository.cambiarEstado(ex.id, 'publicado');
            window.helpers.mostrarAlerta('Examen publicado. Ya puedes enviar los enlaces.', 'exito');
          }
          router.navegar('/examenes');
          return;
        }

        window.helpers.mostrarAlerta('Borrador guardado.', 'exito');
        const raiz = document.querySelector('#app-root');
        if (raiz) this._pintar(raiz);
      } catch (e) {
        this._mostrarError(e.message);
        window.helpers.mostrarAlerta('No se pudo guardar: ' + e.message, 'error');
      } finally {
        this._guardando = false;
        [btnGuardar, btnPublicar].forEach((b) => { if (b) b.disabled = false; });
      }
    },

    // Expuesto para pruebas unitarias (tests/examen-editor-tipos.test.js).
    _normalizar: normalizar,
    _nuevaPregunta: preguntaPorTipo
  };
})();

/**
 * Fin del editor de exámenes (vista-examen-editor.js).
 *
 * Tipos habilitados:
 *   · multiple        — opción múltiple con corrección automática
 *   · verdadero_falso — afirmación verdadera o falsa, corrección automática
 *   · completar       — frase con hueco(s) y variantes aceptadas, automática
 *   · respuesta_corta — palabra o frase breve, corrección manual
 *   · texto_largo     — desarrollo / justificación, corrección manual
 *   · varias_opciones — selección múltiple con varias correctas, automática
 *   · relacionar      — parejas de columnas, corrección automática
 *   · ordenar         — secuencia de elementos, corrección automática
 *
 * El botón «Añadir pregunta» abre el selector visual con el nombre de cada
 * tipo y si se corrige sola (panelUI.modal + tarjetas .selector-tipo).
 */
