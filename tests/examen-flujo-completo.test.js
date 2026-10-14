/**
 * Flujo completo de exámenes con LOS OCHO TIPOS DE PREGUNTA:
 *
 *   1. CREAR     — vista-examen-editor (UI real: selector de tipo, campos, publicar)
 *   2. RESPONDER — vista-examen-tomar (radios, checks, huecos, selects, flechas)
 *   3. PENDIENTE — tras entregar, la alumna aún no ve resultados (gate del servidor)
 *   4. CORREGIR  — vista-examen-corregir (auto + decisión manual + envío)
 *   5. REVISAR   — resultados de la alumna (vista-examen-tomar._renderResultados)
 *
 * Se ejecuta contra el código REAL de las vistas, cargado en un DOM jsdom aislado
 * (patrón vm de tests/examen-editor-tipos.test.js). Solo se sustituye la capa de
 * red: examenesRepository imita a las RPC de Supabase (iniciar / borrador /
 * entregar / calificar / resultado) con el mismo contrato que
 * supabase/migraciones/047_seguridad_examenes_y_soporte.sql:
 *   · obtener() de alumno → preguntas SIN respuesta_correcta (fb_sanitizar_preguntas)
 *   · entregar → estado 'completado', corregido=false, nota=NULL
 *   · obtenerResultado → preguntas completas (solo tras estar corregido)
 *   · calificar → nota recalculada con fb_calcular_puntuacion (espejo cliente)
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const FUENTES = [
  'js/utilidades/iconos.js',
  'js/utilidades/dom-helpers.js',
  'js/componentes/panel-ui.js',
  'js/dominio/puntuacion-examen.js',
  'js/vistas/vista-examen-editor.js',
  'js/vistas/vista-examen-tomar.js',
  'js/vistas/vista-examen-corregir.js',
  'js/vistas/vista-entregas.js'
];

const ADMIN = { id: 'u-admin', rol: 'admin', grupo_id: 'g1', nombre_completo: 'Profesora' };
const ALUMNA = { id: 'u-al1', rol: 'usuario', grupo_id: 'g1', nombre_completo: 'Ana Alumna', username: 'ana' };

const TIPOS = ['multiple', 'varias_opciones', 'verdadero_falso', 'completar',
  'respuesta_corta', 'texto_largo', 'relacionar', 'ordenar'];

/** Réplica de fb_sanitizar_preguntas: quita claves de corrección. */
function sanitizar(preguntas) {
  return preguntas.map((p) => {
    const limpia = Object.assign({}, p);
    delete limpia.respuesta_correcta;
    if (Array.isArray(limpia.huecos)) {
      limpia.huecos = limpia.huecos.map((h) => {
        const c = Object.assign({}, h);
        delete c.respuesta_correcta;
        delete c.variantes;
        return c;
      });
    }
    return limpia;
  });
}

function crearEntorno() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app-root"></div></body></html>',
    { url: 'http://localhost/#!/examenes', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  w.Element.prototype.scrollIntoView = function () {};

  const ctx = dom.getInternalVMContext();
  FUENTES.forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));

  const store = { actual: null, obtener(k) { return k === 'usuario' ? this.actual : null; } };
  const BD = { examen: null, intentos: [], llamadas: { entregar: [], calificar: [], corregir: [], resultado: 0 } };
  const esAlumno = () => (store.actual && store.actual.rol || '').toLowerCase() === 'usuario';
  const preguntasCompletas = () => {
    const p = BD.examen && BD.examen.preguntas;
    if (!p) return [];
    return typeof p === 'string' ? JSON.parse(p) : p;
  };

  w.store = store;
  w.router = { navegar() {}, irAtras() {}, _ejecutar() {}, pathActual() { return ''; } };
  w.authRepository = { async asegurarGrupo(u) { return u; } };
  w.plataformaRepository = {
    async cambiarEstado(id, estado) {
      if (BD.examen && BD.examen.id === id) {
        BD.examen.estado = estado;
        BD.examen.publicado = estado === 'publicado';
      }
    },
    // fb_obtener_entrega
    async obtenerEntrega(intentoId) {
      const it = BD.intentos.find((i) => i.id === intentoId);
      if (!it) throw new Error('Entrega no encontrada');
      return {
        intento_id: it.id, examen_id: it.examen_id, examen_titulo: BD.examen.titulo,
        alumno_nombre: it.perfiles.nombre_completo, alumno_grupo: '',
        estado: it.estado, corregido: it.corregido, nota: it.nota, puntuacion: it.puntuacion,
        observaciones: it.observaciones || '', correccion: it.correccion || {},
        pendientes_correccion: 0,
        respuestas: JSON.parse(it.respuestas), preguntas: preguntasCompletas()
      };
    },
    // fb_corregir_entrega: recalcula con p_correccion como hace el servidor
    async corregirEntrega(intentoId, correccion, observaciones) {
      const it = BD.intentos.find((i) => i.id === intentoId);
      if (!it) throw new Error('Entrega no encontrada');
      const calc = w.puntuacionExamen.calcularConCorreccion(
        preguntasCompletas(), JSON.parse(it.respuestas), correccion || {}
      );
      it.correccion = correccion || {};
      it.observaciones = observaciones || '';
      it.corregido = true;
      it.corregido_por = ADMIN.id;
      it.estado = 'calificado';
      it.nota = Math.min(10, Math.max(0, calc.nota));
      BD.llamadas.corregir.push({
        intentoId, correccion: correccion || {}, observaciones: observaciones || '', nota: it.nota
      });
      return { intento_id: it.id, nota: it.nota, puntuacion: calc.porcentaje, aciertos: calc.aciertos, total: calc.total };
    }
  };
  w.adminRepository = { async registrarAuditoria() {} };
  w.notasRepository = { async crearPersonal() {} };
  w.notificationService = { async emitir() {} };
  w.examenesRepository = {
    async guardar(examen) {
      BD.examen = Object.assign({}, examen, { id: examen.id || 'ex-1' });
      return BD.examen;
    },
    async obtener(id) {
      if (!BD.examen || BD.examen.id !== id) return null;
      const copia = JSON.parse(JSON.stringify(BD.examen));
      if (esAlumno()) copia.preguntas = sanitizar(
        typeof copia.preguntas === 'string' ? JSON.parse(copia.preguntas) : copia.preguntas
      );
      return copia;
    },
    async misIntentos(usuarioId) {
      return BD.intentos.filter((i) => i.alumno_id === usuarioId);
    },
    async guardarIntento(intento) {
      if (intento.id) {
        const previo = BD.intentos.find((i) => i.id === intento.id);
        if (!previo) throw new Error('intento inexistente: ' + intento.id);
        previo.respuestas = intento.respuestas;
        return previo;
      }
      const nuevo = {
        id: 'int-1', examen_id: intento.examen_id, alumno_id: intento.alumno_id,
        estado: intento.estado || 'en_progreso',
        respuestas: intento.respuestas || '{}',
        fecha_inicio: intento.fecha_inicio || new Date().toISOString(),
        fecha_completado: null, nota: null, puntuacion: null,
        corregido: false, corregido_por: null, correccion: {}, observaciones: '',
        perfiles: { id: ALUMNA.id, nombre_completo: ALUMNA.nombre_completo, username: ALUMNA.username }
      };
      BD.intentos.push(nuevo);
      return nuevo;
    },
    async entregarIntento(intentoId, respuestas) {
      const it = BD.intentos.find((i) => i.id === intentoId);
      if (!it) throw new Error('intento no encontrado');
      const crudas = typeof respuestas === 'string' ? JSON.parse(respuestas || '{}') : (respuestas || {});
      const preguntas = preguntasCompletas();
      //(fb_filtrar_respuestas + obligatorias, como hace la RPC del servidor)
      preguntas.forEach((p) => {
        if (p.obligatoria !== false && crudas[p.id] === undefined) {
          throw new Error('Falta responder una pregunta obligatoria');
        }
      });
      const calculo = w.puntuacionExamen.calcularPuntuacion(crudas, preguntas);
      it.respuestas = JSON.stringify(crudas);
      it.estado = 'completado';
      it.corregido = false;   // entregar NO corrige: nota=NULL y corregido=FALSE
      it.corregido_por = null;
      it.correccion = {};
      it.nota = null;
      it.puntuacion = calculo.porcentaje;
      it.fecha_completado = new Date().toISOString();
      BD.llamadas.entregar.push({ intentoId, respuestas: crudas, aciertos: calculo.aciertos });
      return it;
    },
    async obtenerIntentos() { return BD.intentos; },
    async obtenerResultado() {
      BD.llamadas.resultado++;
      return JSON.parse(JSON.stringify(BD.examen));
    },
    async calificar(intentoId, nota, observaciones, corregidoPor, correccion) {
      const it = BD.intentos.find((i) => i.id === intentoId);
      if (!it) throw new Error('intento no encontrado');
      // Espejo de calificar_intento_examen → fb_calcular_puntuacion(preguntas, respuestas, correccion)
      const calculo = w.puntuacionExamen.calcularConCorreccion(
        preguntasCompletas(), JSON.parse(it.respuestas), correccion || {}
      );
      it.correccion = correccion || {};
      it.observaciones = observaciones || '';
      it.corregido = true;
      it.corregido_por = corregidoPor;
      it.estado = 'calificado';
      it.nota = Math.min(10, Math.max(0, calculo.nota));
      it.puntuacion = calculo.porcentaje;
      BD.llamadas.calificar.push({ intentoId, notaServidor: it.nota, correccion: correccion || {}, observaciones: observaciones || '' });
      return { id: it.id, nota: it.nota, estado: 'calificado', corregido: true };
    }
  };

  return { w, raiz: w.document.getElementById('app-root'), store, BD, preguntasCompletas };
}

const esperar = async (fn, ms = 2000) => {
  const inicio = Date.now();
  for (;;) {
    let valor;
    try { valor = await fn(); } catch (e) { valor = false; }
    if (valor) return valor;
    if (Date.now() - inicio > ms) throw new Error('timeout esperando condición');
    await new Promise((r) => setTimeout(r, 10));
  }
};

function claseToggle(bloquePregunta, valor) {
  const btn = bloquePregunta.querySelector(`[data-valor="${valor}"]`);
  return btn ? btn.className : '';
}

/** Ordena la pregunta «ordenar» pulsando las flechas hasta el orden correcto. */
function ordenar(lista, pid, objetivo) {
  const filas = () => Array.from(lista.querySelectorAll('.o-flecha'))
    .filter((f) => f.querySelector(`input[data-orden="${pid}"]`));
  const seq = () => filas().map((f) => Number(f.querySelector(`input[data-orden="${pid}"]`).value));
  for (let guard = 0; guard < 40 && JSON.stringify(seq()) !== JSON.stringify(objetivo); guard++) {
    const actual = seq();
    const pos = actual.findIndex((v, i) => v !== objetivo[i]);
    if (pos === -1) break;
    const origen = actual.indexOf(objetivo[pos], pos);
    filas()[origen].querySelector('.btn-ordenar-up').click();
  }
  return seq();
}

describe('examen completo: crear (8 tipos) → responder → corregir → revisar', () => {
  const E = crearEntorno();
  const { w, raiz, store, BD } = E;
  let preguntasGuardadas = [];

  const porTipo = () => Object.fromEntries(preguntasGuardadas.map((p) => [p.tipo, p]));
  /** El router desmonta la vista anterior antes de montar la nueva (js/core/router.js). */
  let vistaPrevia = null;
  const montarEn = async (vista, params) => {
    if (vistaPrevia && typeof vistaPrevia.desmontar === 'function') vistaPrevia.desmontar();
    vistaPrevia = vista;
    await vista.montar(raiz, params);
  };
  const disparar = (nodo, tipo) => nodo.dispatchEvent(new w.Event(tipo, { bubbles: true }));
  const escribir = (nodo, valor) => { nodo.value = valor; disparar(nodo, 'input'); disparar(nodo, 'change'); };
  const marcar = (nodo) => { nodo.checked = true; disparar(nodo, 'change'); };

  test('1. crear un examen con cada tipo de pregunta y publicarlo', async () => {
    store.actual = ADMIN;
    await montarEn(w.vistaExamenEditor, { id: 'nuevo' });

    const anadir = (tipo) => {
      raiz.querySelector('#btnAddPregunta').click();
      const modal = w.document.querySelector('.adm-modal');
      expect(modal, `selector de tipo abierto para ${tipo}`).toBeTruthy();
      const tarjeta = modal.querySelector(`.selector-tipo[data-tipo="${tipo}"]`);
      expect(tarjeta, `tarjeta del tipo ${tipo}`).toBeTruthy();
      // La tarjeta muestra solo el nombre del tipo y su tipo de corrección.
      expect(tarjeta.querySelector('.selector-tipo__nombre').textContent.trim().length, `nombre del tipo ${tipo}`).toBeGreaterThan(0);
      expect(tarjeta.querySelector('.selector-tipo__ejemplo'), `sin ejemplo en ${tipo}`).toBeNull();
      expect(tarjeta.querySelector('.selector-tipo__descripcion'), `sin descripción en ${tipo}`).toBeNull();
      expect(tarjeta.textContent, `sin ejemplo en ${tipo}`).not.toContain('Ej.:');
      expect(['Corrección automática', 'Corrección manual'], `corrección indicada en ${tipo}`).toContain(tarjeta.querySelector('.selector-tipo__correccion').textContent.trim());
      tarjeta.click();
      expect(w.document.querySelector('.adm-modal'), 'el modal se cierra').toBeNull();
    };

    // El examen arranca con una pregunta «multiple»; añadimos las otras siete.
    raiz.querySelector('[data-q="0"][data-q-accion="anadirOpcion"]').click();
    TIPOS.slice(1).forEach(anadir);
    expect(raiz.querySelectorAll('#preguntas .adm-pregunta')).toHaveLength(8);
    TIPOS.forEach((t, i) => expect(raiz.querySelector(`#tipo_${i}`).value).toBe(t));
    // «varias_opciones» necesita una tercera opción
    raiz.querySelector('[data-q="1"][data-q-accion="anadirOpcion"]').click();

    // ── Enunciados y respuestas tecleando en los campos reales ──
    escribir(raiz.querySelector('#texto_0'), '¿Cuál es el primer libro de la Biblia?');
    ['Génesis', 'Salmos', 'Evangelio de Juan'].forEach((o, j) =>
      escribir(raiz.querySelector(`input[data-campo="opcion"][data-q="0"][data-opcion-val="${j}"]`), o));
    marcar(raiz.querySelector('input[name="correcta_0"][value="0"]'));

    escribir(raiz.querySelector('#texto_1'), 'Elige los dones del Espíritu:');
    ['Sabiduría', 'Poder', 'Consejo'].forEach((o, j) =>
      escribir(raiz.querySelector(`input[data-campo="opcion"][data-q="1"][data-opcion-val="${j}"]`), o));
    marcar(raiz.querySelector('input[name="correcta_1"][value="0"]'));
    marcar(raiz.querySelector('input[name="correcta_1"][value="2"]'));

    escribir(raiz.querySelector('#texto_2'), 'Jonás huyó de Dios.');
    marcar(raiz.querySelector('input[name="correcta_2"][value="1"]')); // Falso

    escribir(raiz.querySelector('#texto_3'), 'El Señor es mi ___; nada me faltará.');
    escribir(raiz.querySelector('input[data-campo="palabra"][data-q="3"][data-hidx="0"]'), 'verdad');
    raiz.querySelector('[data-q="3"][data-q-accion="anadirPalabra"]').click();
    escribir(raiz.querySelector('input[data-campo="palabra"][data-q="3"][data-hidx="1"]'), 'certeza');

    escribir(raiz.querySelector('#texto_4'), '¿En qué ciudad nació Jesús?');
    escribir(raiz.querySelector('input[data-campo="respuestaCorrecta"][data-q="4"]'), 'Belén');

    escribir(raiz.querySelector('#texto_5'), 'Explica qué enseña la parábola del buen samaritano.');

    escribir(raiz.querySelector('#texto_6'), 'Relaciona cada personaje con su libro:');
    [['Moisés', 'Éxodo'], ['Noé', 'Génesis']].forEach(([izq, der], k) => {
      escribir(raiz.querySelector(`input[data-campo="opcion"][data-q="6"][data-pidx="${k}"][data-par]`), izq);
      escribir(raiz.querySelector(`input[data-campo="opcion"][data-q="6"][data-pidx="${k}"][data-par-der]`), der);
    });

    raiz.querySelector('[data-q="7"][data-q-accion="anadirElemento"]').click();
    escribir(raiz.querySelector('#texto_7'), 'Ordena la salida del Éxodo:');
    ['Génesis', 'Éxodo', 'Levítico'].forEach((o, j) =>
      escribir(raiz.querySelector(`input[data-campo="opcion"][data-q="7"][data-eidx="${j}"]`), o));

    raiz.querySelector('#titulo').value = 'Examen de todos los tipos';
    raiz.querySelector('#btnPublicarEditor').click();
    await esperar(() => BD.examen && BD.examen.publicado);

    const aviso = raiz.querySelector('#aviso');
    expect(aviso.hidden, `sin errores de validación: "${aviso.textContent}"`).toBe(true);
    expect(BD.examen.titulo).toBe('Examen de todos los tipos');
    expect(w.document.getElementById('contenedorAlertas').textContent).toContain('Examen publicado');

    preguntasGuardadas = E.preguntasCompletas();
    expect(preguntasGuardadas).toHaveLength(8);
    expect(preguntasGuardadas.map((p) => p.tipo)).toEqual(TIPOS);

    // Cada tipo guarda el contrato que espera fb_respuesta_correcta
    const pt = porTipo();
    expect(pt.multiple.respuesta_correcta).toBe('0');
    expect(pt.multiple.opciones).toEqual(['Génesis', 'Salmos', 'Evangelio de Juan']);
    expect(JSON.parse(pt.varias_opciones.respuesta_correcta)).toEqual([0, 2]);
    expect(pt.verdadero_falso.respuesta_correcta).toBe('1');
    expect(pt.verdadero_falso.opciones).toEqual(['Verdadero', 'Falso']);
    expect(pt.completar.respuesta_correcta).toBe('verdad|certeza');
    expect(pt.respuesta_corta.respuesta_correcta).toBe('Belén');
    expect(pt.texto_largo.respuesta_correcta).toBeNull();
    expect(JSON.parse(pt.relacionar.respuesta_correcta)).toEqual({ 0: 0, 1: 1 });
    expect(pt.relacionar.opciones).toEqual(['Moisés', 'Noé', 'Éxodo', 'Génesis']);
    expect(JSON.parse(pt.ordenar.respuesta_correcta)).toEqual([0, 1, 2]);
    preguntasGuardadas.forEach((p) => expect(p.puntos).toBeGreaterThan(0));
  });

  test('2. la alumna responde las ocho preguntas y entrega el examen', async () => {
    store.actual = ALUMNA;
    await montarEn(w.vistaExamenTomar, { id: BD.examen.id });

    expect(BD.intentos).toHaveLength(1);
    expect(BD.intentos[0].estado).toBe('en_progreso');
    expect(raiz.querySelector('#btnEntregar')).toBeTruthy();
    expect(raiz.querySelectorAll('#preguntasExamen .pregunta-examen')).toHaveLength(8);

    const lista = raiz.querySelector('#preguntasExamen');
    const pt = porTipo();
    const bloque = (p) => lista.querySelector(`.pregunta-examen[data-pid="${p.id}"]`);

    // multiple → opción correcta
    marcar(bloque(pt.multiple).querySelector('input[type="radio"][value="0"]'));
    // varias_opciones → solo la primera (INTENCIONMENTE incorrecta: hay que revisar la corrección)
    marcar(bloque(pt.varias_opciones).querySelector('input[type="checkbox"][value="0"]'));
    // verdadero_falso → Falso (índice 1)
    marcar(bloque(pt.verdadero_falso).querySelector('input[type="radio"][value="1"]'));
    // completar → una de las palabras aceptadas
    escribir(bloque(pt.completar).querySelector('[data-pid]'), 'verdad');
    // respuesta_corta
    escribir(bloque(pt.respuesta_corta).querySelector('[data-pid]'), 'Belén');
    // texto_largo
    escribir(bloque(pt.texto_largo).querySelector('[data-pid]'), 'Ayuda al prójimo sin esperar recompensa.');
    // relacionar → parejas identidad
    const selects = bloque(pt.relacionar).querySelectorAll('select[data-relacion]');
    expect(selects).toHaveLength(2);
    selects.forEach((s, i) => { s.value = String(i); disparar(s, 'change'); });
    // ordenar → secuencia correcta con las flechas
    expect(ordenar(lista, pt.ordenar.id, [0, 1, 2])).toEqual([0, 1, 2]);

    // Vista paginada (la del móvil): al sincronizar manda ella. Cambiamos una
    // pareja desde #preguntasPagina para comprobar que su desplegable se guarda
    // y que el contador sigue contando la pregunta como respondida.
    const idxRel = preguntasGuardadas.findIndex((p) => p.tipo === 'relacionar');
    raiz.querySelectorAll('#examenDots .examen-dot')[idxRel].click();
    const enPagina = raiz.querySelectorAll('#preguntasPagina select[data-relacion]');
    expect(enPagina).toHaveLength(2);
    const borrador = () => JSON.parse(BD.intentos[0].respuestas || '{}');
    // La app guarda «relacionar» como mapa JSON en texto: {"0":1,"1":1}
    const pareja = (fila) => {
      const valor = borrador()[pt.relacionar.id];
      return valor == null ? undefined : JSON.parse(valor)[fila];
    };
    escribir(enPagina[0], '1');
    await esperar(() => pareja(0) === 1);
    expect(pareja(1), 'la otra pareja sigue leyéndose de la página').toBe(1);
    escribir(enPagina[0], '0');
    await esperar(() => pareja(0) === 0);
    expect(pareja(1)).toBe(1);

    await esperar(() => /8\/8 respondidas/.test(raiz.querySelector('#contadorProgreso').textContent));

    raiz.querySelector('#btnEntregar').click();
    const confirmar = await esperar(() => w.document.querySelector('.modal-overlay [data-confirmar]'));
    confirmar.click();
    await esperar(() => BD.intentos[0].estado === 'completado');

    const entregadas = BD.llamadas.entregar[0].respuestas;
    expect(entregadas[pt.multiple.id]).toBe('0');
    expect(JSON.parse(entregadas[pt.varias_opciones.id])).toEqual([0]);
    expect(entregadas[pt.verdadero_falso.id]).toBe('1');
    expect(entregadas[pt.completar.id]).toBe('verdad');
    expect(entregadas[pt.respuesta_corta.id]).toBe('Belén');
    expect(entregadas[pt.texto_largo.id]).toContain('prójimo');
    expect(JSON.parse(entregadas[pt.relacionar.id])).toEqual({ 0: 0, 1: 1 });
    expect(JSON.parse(entregadas[pt.ordenar.id])).toEqual([0, 1, 2]);
    expect(Object.keys(entregadas)).toHaveLength(8);
    // 6 correctas: solo varias_opciones y texto_largo quedan mal
    expect(BD.llamadas.entregar[0].aciertos).toBe(6);
    expect(w.document.getElementById('contenedorAlertas').textContent).toContain('Examen entregado correctamente');
  });

  test('3. antes de corregir, la alumna ve «resultados pendientes»', async () => {
    store.actual = ALUMNA;
    await montarEn(w.vistaExamenTomar, { id: BD.examen.id });
    expect(raiz.querySelector('.resultado-espera')).toBeTruthy();
    expect(raiz.querySelector('.resultado-hero__nota').textContent).toBe('—');
    expect(BD.llamadas.resultado, 'no se pide el resultado sin corregir').toBe(0);
  });

  test('4. la profesora corrige: automáticas, decisión manual y envío', async () => {
    store.actual = ADMIN;
    await montarEn(w.vistaExamenCorregir, { id: BD.examen.id });

    const intento = BD.intentos[0];
    expect(raiz.querySelector(`[data-intento="${intento.id}"]`)).toBeTruthy();
    expect(raiz.querySelector(`[data-intento="${intento.id}"] .corregir-card__badge`).textContent).toContain('Pendiente');
    // Provisional: 5 automáticas + respuesta_corta que coincide con la referencia = 6/8 → 7.5
    expect(raiz.querySelector(`#preview_${intento.id}`).textContent).toBe('7.5');

    raiz.querySelector(`[data-toggle="${intento.id}"]`).click();
    const detalle = raiz.querySelector(`#detalle_${intento.id}`);
    expect(detalle, 'detalle abierto').toBeTruthy();
    expect(detalle.querySelectorAll('.corregir-pregunta')).toHaveLength(8);

    const pt = porTipo();
    const bloque = (p) => detalle.querySelector(`.corregir-pregunta[data-pid="${p.id}"]`);
    const respuesta = (p) => bloque(p).querySelector('.corregir-pregunta__respuesta').textContent.trim();

    // Cada tipo muestra la respuesta del alumno en legible…
    expect(respuesta(pt.multiple)).toBe('Génesis');
    expect(respuesta(pt.varias_opciones)).toBe('Sabiduría');
    expect(respuesta(pt.verdadero_falso)).toBe('Falso');
    expect(respuesta(pt.completar)).toContain('verdad');
    expect(respuesta(pt.respuesta_corta)).toBe('Belén');
    expect(respuesta(pt.texto_largo)).toContain('prójimo');
    expect(respuesta(pt.relacionar)).toContain('Moisés → Éxodo');
    expect(respuesta(pt.ordenar)).toContain('Génesis → Éxodo → Levítico');

    // …y la referencia de los tipos manuales
    expect(bloque(pt.respuesta_corta).querySelector('.corregir-pregunta__correcta').textContent).toContain('Belén');

    // Las automáticas vienen decididas; las manuales, en «Auto»
    expect(claseToggle(bloque(pt.multiple), 'si')).toContain('corregir-toggle__btn--correcta');
    expect(claseToggle(bloque(pt.varias_opciones), 'no')).toContain('corregir-toggle__btn--incorrecta');
    expect(claseToggle(bloque(pt.respuesta_corta), 'auto')).toContain('corregir-toggle__btn--auto');
    expect(claseToggle(bloque(pt.texto_largo), 'auto')).toContain('corregir-toggle__btn--auto');

    // Decisión manual 1: respuesta_corta correcta → debe conservar SUS puntos
    bloque(pt.respuesta_corta).querySelector('[data-valor="si"]').click();
    expect(bloque(pt.respuesta_corta).querySelector('[data-puntos-valor]').textContent).toBe('1');
    expect(raiz.querySelector(`#nota_${intento.id}`).value).toBe('7.5');

    // Decisión manual 2: texto_largo correcta → debe OTORGAR su punto (7.5 → 8.75)
    bloque(pt.texto_largo).querySelector('[data-valor="si"]').click();
    expect(bloque(pt.texto_largo).querySelector('[data-puntos-valor]').textContent).toBe('1');
    expect(raiz.querySelector(`#nota_${intento.id}`).value).toBe('8.75');
    expect(raiz.querySelector(`#preview_${intento.id}`).textContent).toBe('8.8');

    // Decisión manual 3: varias_opciones incorrecta (ya lo estaba) → 0 puntos
    bloque(pt.varias_opciones).querySelector('[data-valor="no"]').click();
    expect(bloque(pt.varias_opciones).querySelector('[data-puntos-valor]').textContent).toBe('0');
    expect(raiz.querySelector(`#nota_${intento.id}`).value).toBe('8.75');

    // Comentario en cada pregunta: uno en una automática y otro en una escrita
    escribir(bloque(pt.varias_opciones).querySelector('.corregir-pregunta__comentario'),
      'Había dos opciones correctas: lee bien la consigna.');
    escribir(bloque(pt.texto_largo).querySelector('.corregir-pregunta__comentario'),
      'Buen desarrollo; amplía el ejemplo con un versículo.');

    // Comentario final del profesor
    escribir(raiz.querySelector(`#obs_${intento.id}`), 'Has mejorado respecto a la entrega anterior.');

    raiz.querySelector(`.btn-calificar[data-intento="${intento.id}"]`).click();
    await esperar(() => BD.llamadas.calificar.length === 1 &&
      w.document.getElementById('contenedorAlertas').textContent.includes('Corrección enviada'));

    const correccion = BD.llamadas.calificar[0].correccion;
    expect(BD.llamadas.calificar[0].notaServidor).toBe(8.75);
    // Los comentarios viajan con la corrección (p_correccion) y el final, en p_observaciones
    expect(BD.llamadas.calificar[0].observaciones).toBe('Has mejorado respecto a la entrega anterior.');
    expect(correccion[pt.varias_opciones.id]).toMatchObject({ es_correcta: false, puntos: 0, comentario: 'Había dos opciones correctas: lee bien la consigna.' });
    expect(correccion[pt.texto_largo.id]).toMatchObject({ es_correcta: true, puntos: 1, comentario: 'Buen desarrollo; amplía el ejemplo con un versículo.' });
    expect(correccion[pt.respuesta_corta.id]).toMatchObject({ es_correcta: true, puntos: 1 });
    expect(correccion[pt.multiple.id]).toMatchObject({ es_correcta: true, puntos: 1 });
    expect(BD.intentos[0].corregido).toBe(true);
    expect(BD.intentos[0].corregido_por).toBe(ADMIN.id);
    expect(BD.intentos[0].nota).toBe(8.75);
    expect(w.document.getElementById('contenedorAlertas').textContent).toContain('Corrección enviada');
  });

  test('5. la alumna revisa su corrección', async () => {
    store.actual = ALUMNA;
    await montarEn(w.vistaExamenTomar, { id: BD.examen.id });

    expect(BD.llamadas.resultado, 'el resultado se pide al servidor tras corregir').toBe(1);
    expect(raiz.querySelector('.resultado-hero__nota').textContent).toBe('8.8');

    const stats = raiz.querySelectorAll('.resultado-stat__valor');
    expect(stats[0].textContent).toBe('7');    // correctas
    expect(stats[1].textContent).toBe('1');    // incorrectas
    expect(stats[2].textContent).toBe('88%');  // precisión

    const tarjetas = raiz.querySelectorAll('.resultado-pregunta');
    expect(tarjetas).toHaveLength(8);
    expect(Array.from(tarjetas).filter((t) => t.className.includes('--ok'))).toHaveLength(7);
    expect(Array.from(tarjetas).filter((t) => t.className.includes('--ko'))).toHaveLength(1);

    const idx = (tipo) => preguntasGuardadas.findIndex((p) => p.tipo === tipo);

    // La incorrecta (varias_opciones) muestra la respuesta del alumno Y la correcta
    const varias = tarjetas[idx('varias_opciones')];
    expect(varias.className).toContain('resultado-pregunta--ko');
    expect(varias.textContent).toContain('Sabiduría');
    expect(varias.textContent).toContain('Respuesta correcta');
    expect(varias.textContent).toContain('Sabiduría, Consejo');

    // Cada tipo se lee en formato legible
    expect(tarjetas[idx('verdadero_falso')].textContent).toContain('Falso');
    expect(tarjetas[idx('verdadero_falso')].className).toContain('--ok');
    expect(tarjetas[idx('multiple')].textContent).toContain('Génesis');
    expect(tarjetas[idx('relacionar')].textContent).toContain('Moisés → Éxodo');
    expect(tarjetas[idx('ordenar')].textContent).toContain('Génesis → Éxodo → Levítico');
    expect(tarjetas[idx('ordenar')].textContent).toContain('1/1 pts');
    expect(tarjetas[idx('completar')].textContent).toContain('verdad');
    expect(tarjetas[idx('respuesta_corta')].textContent).toContain('Belén');
    expect(tarjetas[idx('texto_largo')].textContent).toContain('prójimo');

    // Los comentarios del profesor se ven: el general y el de cada pregunta
    expect(raiz.querySelector('.resultado-obs__texto').textContent)
      .toContain('Has mejorado respecto a la entrega anterior.');
    expect(tarjetas[idx('varias_opciones')].querySelector('.resultado-pregunta__comentario').textContent)
      .toContain('Había dos opciones correctas');
    expect(tarjetas[idx('texto_largo')].querySelector('.resultado-pregunta__comentario').textContent)
      .toContain('Buen desarrollo');
    expect(tarjetas[idx('multiple')].querySelector('.resultado-pregunta__comentario'), 'sin comentario no se pinta')
      .toBeNull();
  });

  test('6. la corrección de la entrega admite comentario por pregunta y comentario final', async () => {
    store.actual = ADMIN;
    const intento = BD.intentos[0];
    const pt = porTipo();

    await w.vistaEntregas._abrirCorreccion(intento.id);
    const modal = w.document.querySelector('.adm-modal');
    expect(modal, 'se abre el modal de corrección').toBeTruthy();
    const cuerpo = modal.querySelector('.adm-modal__cuerpo');

    // Un campo de comentario para CADA pregunta (automáticas y escritas)
    expect(cuerpo.querySelectorAll('[data-comentario]')).toHaveLength(8);
    expect(modal.querySelector('#observaciones'), 'el comentario final ya existía').toBeTruthy();

    // Comentario en una pregunta automática…
    const auto = cuerpo.querySelector(`[data-comentario="${pt.varias_opciones.id}"]`);
    auto.value = 'Revisa la consigna: había dos opciones correctas.';
    auto.dispatchEvent(new w.Event('input', { bubbles: true }));

    // …y en una escrita, ANTES de decidir (la decisión no debe pisarlo)
    const escrita = cuerpo.querySelector(`[data-comentario="${pt.texto_largo.id}"]`);
    escrita.value = 'Buena idea; amplía el ejemplo con un versículo.';
    escrita.dispatchEvent(new w.Event('input', { bubbles: true }));

    // Las dos escritas se deciden (obligatorio para poder guardar)
    cuerpo.querySelector(`[data-bloque="${pt.respuesta_corta.id}"] [data-decision="correcta"]`).click();
    cuerpo.querySelector(`[data-bloque="${pt.texto_largo.id}"] [data-decision="correcta"]`).click();
    expect(cuerpo.querySelector(`[data-comentario="${pt.texto_largo.id}"]`).value)
      .toContain('amplía el ejemplo');

    // Nota provisional: 5 automáticas + 2 escritas = 7 de 8 → 8,75
    expect(cuerpo.querySelector('#resumenNota').textContent).toContain('8,75');

    // Comentario final del profesor
    cuerpo.querySelector('#observaciones').value = 'Has mejorado respecto a la entrega anterior.';

    modal.querySelector('#btnGuardarCorreccion').click();
    await esperar(() => BD.llamadas.corregir.length === 1);

    const guardado = BD.llamadas.corregir[0];
    expect(guardado.observaciones).toBe('Has mejorado respecto a la entrega anterior.');
    expect(guardado.nota, 'el comentario no altera la puntuación').toBe(8.75);
    expect(guardado.correccion[pt.varias_opciones.id].comentario)
      .toBe('Revisa la consigna: había dos opciones correctas.');
    expect(guardado.correccion[pt.texto_largo.id]).toMatchObject({
      es_correcta: true, puntos: 1, comentario: 'Buena idea; amplía el ejemplo con un versículo.'
    });
    expect(guardado.correccion[pt.respuesta_corta.id]).toMatchObject({ es_correcta: true, puntos: 1 });
    // El cierre del modal y el aviso se pintan en el turno siguiente a la RPC
    await esperar(() => w.document.getElementById('contenedorAlertas').textContent.includes('Corrección guardada'));
    expect(w.document.getElementById('contenedorAlertas').textContent).toContain('Corrección guardada');

    // Reabrir: comentario por pregunta y comentario final siguen ahí
    await w.vistaEntregas._abrirCorreccion(intento.id);
    const cuerpo2 = w.document.querySelector('.adm-modal__cuerpo');
    expect(cuerpo2.querySelector(`[data-comentario="${pt.varias_opciones.id}"]`).value)
      .toBe('Revisa la consigna: había dos opciones correctas.');
    expect(cuerpo2.querySelector(`[data-comentario="${pt.multiple.id}"]`).value).toBe('');
    expect(cuerpo2.querySelector('#observaciones').value)
      .toBe('Has mejorado respecto a la entrega anterior.');
    w.document.querySelector('.adm-modal').remove();
  });
});
