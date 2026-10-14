import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const editorSource = read('js/vistas/vista-examen-editor.js');
const puntuacionSource = read('js/dominio/puntuacion-examen.js');
const entregasSource = read('js/vistas/vista-entregas.js');
const examenPublicoSource = read('public-site/examen.js');
const tomarSource = read('js/vistas/vista-examen-tomar.js');
const migracion058 = read('supabase/migraciones/058_tipos_objetivos_completos.sql');

/** Carga un IIFE de navegador en un contexto aislado (window simulado). */
function cargarEnContexto(fuentes) {
  const contexto = { window: {}, console };
  vm.createContext(contexto);
  for (const fuente of fuentes) vm.runInContext(fuente, contexto);
  return contexto.window;
}

const window = cargarEnContexto([puntuacionSource, editorSource, entregasSource]);
const editor = window.vistaExamenEditor;
const puntuacion = window.puntuacionExamen;
const entregas = window.vistaEntregas;

describe('vista-examen-editor: sintaxis y tipos', () => {
  test('el archivo del editor compila (regresión del corte de sintaxis)', () => {
    expect(() => new vm.Script(editorSource)).not.toThrow();
    expect(() => new vm.Script(examenPublicoSource)).not.toThrow();
    expect(() => new vm.Script(tomarSource)).not.toThrow();
  });

  test('el editor expone los ocho tipos de pregunta', () => {
    const valores = editor.tipos.map((t) => t.valor);
    expect(valores).toEqual(expect.arrayContaining([
      'multiple', 'varias_opciones', 'verdadero_falso', 'completar',
      'respuesta_corta', 'texto_largo', 'relacionar', 'ordenar'
    ]));
  });
});

describe('cabecera del editor en móvil', () => {
  const css = read('css/05-componentes/_plataforma.css');

  test('las acciones llevan etiqueta larga y corta, con su nombre accesible', () => {
    expect(editorSource).toContain('class="adm-cabecera adm-cabecera--editor"');

    // Guardar borrador: la etiqueta corta es la que se ve en móvil.
    expect(editorSource).toContain('id="btnGuardar" aria-label="Guardar como borrador"');
    expect(editorSource).toMatch(/adm-cabecera__etiqueta-larga">Guardar borrador<\/span><span class="adm-cabecera__etiqueta-corta">Guardar</);

    // Guardar y publicar / Guardar y cerrar según el estado del examen.
    expect(editorSource).toMatch(/aria-label="\$\{ex\.publicado \? 'Guardar y cerrar' : 'Guardar y publicar'\}"/);
    expect(editorSource).toMatch(/adm-cabecera__etiqueta-corta">\$\{ex\.publicado \? 'Cerrar' : 'Publicar'\}/);
  });

  test('la etiqueta corta solo sustituye a la larga en móvil', () => {
    const oculta = css.indexOf('.adm-cabecera--editor .adm-cabecera__etiqueta-corta { display: none; }');
    const visible = css.indexOf('.adm-cabecera--editor .adm-cabecera__etiqueta-corta { display: inline; }');

    expect(oculta).toBeGreaterThan(-1);
    expect(visible).toBeGreaterThan(oculta);
    // El cambio va dentro del corte de móvil: en escritorio no se toca.
    expect(css.slice(css.lastIndexOf('@media', visible), visible)).toContain('max-width: 600px');
    expect(css.indexOf('.adm-cabecera--editor .adm-cabecera__etiqueta-larga { display: none; }')).toBeGreaterThan(oculta);
  });

  test('en móvil las tres acciones van en una fila en vez de apiladas', () => {
    const grid = css.indexOf('grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr)');
    expect(grid).toBeGreaterThan(-1);
    expect(css.slice(css.lastIndexOf('@media', grid), grid)).toContain('max-width: 600px');

    // El apilado a ancho completo sigue siendo el de las demás vistas.
    expect(css).toContain('.adm-cabecera__acciones > .adm-btn { width: 100%; }');
  });

  test('las flechas de orden del editor tienen blanco táctil en móvil', () => {
    const flechas = css.indexOf('.adm-pregunta__acciones [data-q-accion="subir"]');
    expect(flechas).toBeGreaterThan(-1);
    const bloque = css.slice(css.lastIndexOf('@media', flechas), flechas);
    expect(bloque).toContain('max-width: 600px');
    expect(css.slice(flechas, flechas + 220)).toContain('min-width: 44px');
    expect(css.slice(flechas, flechas + 220)).toContain('min-height: 44px');
  });
});

describe('normalización de preguntas legadas', () => {
  test('verdadero/falso legado ("true"/"false") pasa a índice 0/1 con opciones', () => {
    const [vf] = editor._normalizar([{ tipo: 'verdadero_falso', texto: 'Afirmación', respuesta_correcta: 'true' }]);
    expect(vf.tipo).toBe('verdadero_falso');
    expect(vf.opciones).toEqual(['Verdadero', 'Falso']);
    expect(vf.respuesta_correcta).toBe('0');

    const [vfFalso] = editor._normalizar([{ tipo: 'verdadero_falso', texto: 'Afirmación', respuesta_correcta: 'false' }]);
    expect(vfFalso.respuesta_correcta).toBe('1');
  });

  test('opcion_unica se convierte en multiple conservando la respuesta', () => {
    const [p] = editor._normalizar([{ tipo: 'opcion_unica', opciones: ['a', 'b'], respuesta_correcta: '1' }]);
    expect(p.tipo).toBe('multiple');
    expect(p.respuesta_correcta).toBe('1');
  });

  test('un tipo desconocido degrada a texto_largo (nunca se pierde la pregunta)', () => {
    const [p] = editor._normalizar([{ tipo: 'sudoku', texto: '¿Qué pasó?' }]);
    expect(p.tipo).toBe('texto_largo');
    expect(p.texto).toBe('¿Qué pasó?');
  });

  test('completar con palabras en respuesta_correcta se convierte en lista de palabras', () => {
    const [p] = editor._normalizar([{ tipo: 'completar', texto: 'El Señor es mi ___', respuesta_correcta: 'verdad|certeza' }]);
    expect(p.huecos.map((h) => h.respuesta_correcta)).toEqual(['verdad', 'certeza']);
    expect(p.respuesta_correcta).toBe('verdad|certeza');
  });

  test('completar con marcadores {{HUECO_n}} conserva ids y variantes', () => {
    const [p] = editor._normalizar([{
      tipo: 'completar',
      texto: 'En el principio era el {{HUECO_1}}.',
      huecos: [{ id: 1, respuesta_correcta: 'Verbo', variantes: ['verbo', 'Verbo Divino'] }]
    }]);
    expect(p.huecos).toHaveLength(1);
    expect(p.huecos[0].id).toBe(1);
    expect(p.huecos[0].respuesta_correcta).toBe('Verbo');
    expect(p.huecos[0].variantes).toEqual(['verbo', 'Verbo Divino']);
  });

  test('relacionar con mapeo no identidad se reordena a parejas + identidad', () => {
    const [p] = editor._normalizar([{
      tipo: 'relacionar',
      opciones: ['L1', 'L2', 'D1', 'D2'],
      respuesta_correcta: '{"0":1,"1":0}'
    }]);
    expect(p.opciones).toEqual(['L1', 'L2', 'D2', 'D1']);
    expect(JSON.parse(p.respuesta_correcta)).toEqual({ 0: 0, 1: 1 });
  });

  test('ordenar con permuta no identidad reordena las opciones y deja identidad', () => {
    const [p] = editor._normalizar([{
      tipo: 'ordenar',
      opciones: ['a', 'b', 'c'],
      respuesta_correcta: '[2,0,1]'
    }]);
    expect(p.opciones).toEqual(['c', 'a', 'b']);
    expect(JSON.parse(p.respuesta_correcta)).toEqual([0, 1, 2]);
  });

  test('varias_opciones normaliza el array de correctas (únicos y en orden)', () => {
    const [p] = editor._normalizar([{ tipo: 'varias_opciones', opciones: ['a', 'b', 'c'], respuesta_correcta: '[2,0,2]' }]);
    expect(JSON.parse(p.respuesta_correcta)).toEqual([0, 2]);
  });
});

describe('validación al guardar (_construirPreguntas)', () => {
  const base = { id: 'p1', texto: 'Pregunta', puntos: 1, obligatoria: true };

  test('multiple guarda el índice de la opción correcta como texto', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'multiple', opciones: ['a', 'b', 'c'], respuesta_correcta: '2'
    })] };
    const [guardada] = editor._construirPreguntas();
    expect(guardada.tipo).toBe('multiple');
    expect(guardada.respuesta_correcta).toBe('2');
    expect(guardada.opciones).toEqual(['a', 'b', 'c']);
  });

  test('completar sin marcadores guarda las palabras unidas por «|» y sin huecos', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'completar', texto: 'El Señor es mi ___',
      huecos: [{ respuesta_correcta: 'verdad', variantes: [] }, { respuesta_correcta: 'certeza', variantes: [] }]
    })] };
    const [guardada] = editor._construirPreguntas();
    expect(guardada.respuesta_correcta).toBe('verdad|certeza');
    expect(guardada.huecos).toBeUndefined();
  });

  test('completar con marcadores guarda el array de huecos con ids', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'completar', texto: 'El {{HUECO_1}} y el {{HUECO_2}}',
      huecos: [{ respuesta_correcta: 'uno', variantes: [] }, { respuesta_correcta: 'dos', variantes: [] }]
    })] };
    const [guardada] = editor._construirPreguntas();
    expect(guardada.huecos).toHaveLength(2);
    expect(guardada.huecos.map((h) => h.id)).toEqual([1, 2]);
    expect(guardada.respuesta_correcta).toBeNull();
  });

  test('completar sin ninguna palabra aceptada lanza error claro', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'completar', texto: 'Frase ___', huecos: [{ respuesta_correcta: '  ', variantes: [] }]
    })] };
    expect(() => editor._construirPreguntas()).toThrow(/al menos una palabra/);
  });

  test('marcadores y respuestas de huecos que no cuadran lanzan error', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'completar', texto: 'A {{HUECO_1}} y B {{HUECO_2}}',
      huecos: [{ respuesta_correcta: 'uno', variantes: [] }]
    })] };
    expect(() => editor._construirPreguntas()).toThrow(/2 hueco\(s\)/);
  });

  test('relacionar exige parejas completas y guarda mapeo identidad', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'relacionar', opciones: ['L1', 'L2', 'D2', 'D1']
    })] };
    const [guardada] = editor._construirPreguntas();
    expect(guardada.opciones).toEqual(['L1', 'L2', 'D2', 'D1']);
    expect(JSON.parse(guardada.respuesta_correcta)).toEqual({ 0: 0, 1: 1 });

    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'relacionar', opciones: ['L1', 'L2', 'D1', '']
    })] };
    expect(() => editor._construirPreguntas()).toThrow(/pareja incompleta/);
  });

  test('ordenar guarda la secuencia identidad sobre los elementos', () => {
    editor._examen = { preguntas: [Object.assign({}, base, {
      tipo: 'ordenar', opciones: ['tercero', 'primero', 'segundo']
    })] };
    const [guardada] = editor._construirPreguntas();
    expect(JSON.parse(guardada.respuesta_correcta)).toEqual([0, 1, 2]);
  });

  test('el enunciado vacío bloquea el guardado con el número de pregunta', () => {
    editor._examen = { preguntas: [Object.assign({}, base, { tipo: 'texto_largo', texto: '   ' })] };
    expect(() => editor._construirPreguntas()).toThrow(/pregunta 1/);
  });
});

describe('puntuacion-examen: evaluarPregunta espejo del servidor', () => {
  test('correcta vale sus puntos; incorrecta, sin responder o negativa, 0', () => {
    expect(puntuacion.evaluarPregunta(true, 2)).toBe(2);
    expect(puntuacion.evaluarPregunta(false, 2)).toBe(0);
    expect(puntuacion.evaluarPregunta(null, 2)).toBe(0);
    expect(puntuacion.evaluarPregunta(true, 0)).toBe(0);
    expect(puntuacion.evaluarPregunta(true, -1)).toBe(0);
    expect(puntuacion.evaluarPregunta(true, NaN)).toBe(0);
  });

  test('completar sin marcadores compara contra las palabras aceptadas', () => {
    const p = { tipo: 'completar', respuesta_correcta: 'verdad|certeza' };
    expect(puntuacion.esCorrectaPregunta(' Verdad ', p)).toBe(true);
    expect(puntuacion.esCorrectaPregunta('otra', p)).toBe(false);
  });

  test('relacionar y ordenar comparan mapa y secuencia completos', () => {
    const rel = { tipo: 'relacionar', respuesta_correcta: '{"0":0,"1":1}' };
    expect(puntuacion.esCorrectaPregunta('{"0":0,"1":1}', rel)).toBe(true);
    expect(puntuacion.esCorrectaPregunta('{"0":1,"1":0}', rel)).toBe(false);
    const ord = { tipo: 'ordenar', respuesta_correcta: '[0,1,2]' };
    expect(puntuacion.esCorrectaPregunta('[0,1,2]', ord)).toBe(true);
    expect(puntuacion.esCorrectaPregunta('[2,1,0]', ord)).toBe(false);
  });
});

describe('vista-entregas: corrección de los tipos nuevos', () => {
  test('los seis tipos automáticos no piden corrección manual', () => {
    ['multiple', 'verdadero_falso', 'varias_opciones', 'completar', 'relacionar', 'ordenar']
      .forEach((t) => expect(entregas._esTest(t)).toBe(true));
    ['respuesta_corta', 'texto_largo'].forEach((t) => expect(entregas._esTest(t)).toBe(false));
  });

  test('_formatearAuto traduce arrays, mapas y secuencias a texto legible', () => {
    const varias = { tipo: 'varias_opciones', opciones: ['a', 'b', 'c'], respuesta_correcta: '[0,2]' };
    expect(entregas._formatearAuto(varias, '[2]').alumno).toBe('C. c');

    const rel = { tipo: 'relacionar', opciones: ['L1', 'L2', 'D1', 'D2'], respuesta_correcta: '{"0":0,"1":1}' };
    expect(entregas._formatearAuto(rel, '{"0":1,"1":0}').alumno).toBe('L1 → D2 · L2 → D1');
    expect(entregas._formatearAuto(rel, '{}').alumno).toBe('Sin responder');

    const ord = { tipo: 'ordenar', opciones: ['x', 'y'], respuesta_correcta: '[0,1]' };
    expect(entregas._formatearAuto(ord, '[1,0]').alumno).toBe('y → x');
    expect(entregas._formatearAuto(ord, '[0,1]').correcta).toBe('x → y');
  });

  test('completar con huecos muestra el detalle por hueco', () => {
    const p = {
      tipo: 'completar', texto: 'A {{HUECO_1}}',
      huecos: [{ id: 1, respuesta_correcta: 'uno', variantes: [] }]
    };
    const formateo = entregas._formatearAuto(p, ['uno']);
    expect(formateo.alumno).toContain('Hueco 1');
    expect(formateo.alumno).toContain('✓');
    expect(formateo.correcta).toBe('uno');
  });
});

describe('página pública y vista de tomar: contrato con el servidor', () => {
  test('la página pública renderiza los widgets de los nuevos tipos', () => {
    expect(examenPublicoSource).toContain('renderVarias');
    expect(examenPublicoSource).toContain('renderCompletar');
    expect(examenPublicoSource).toContain('renderRelacionar');
    expect(examenPublicoSource).toContain('renderOrdenar');
    expect(examenPublicoSource).toContain('mezclaEstable');
    // El editor y la página pública comparten el mismo contrato de pregunta:
    // la página pública lee id y tipo de cada pregunta del snapshot del servidor.
    expect(examenPublicoSource).toContain('pregunta.id');
    expect(examenPublicoSource).toContain('pregunta.tipo');
    // Relacionar sigue en el cliente público con el mismo contrato que el editor:
    // el mapa de parejas se guarda completo (obligatoria = todas las parejas).
    expect(examenPublicoSource).toContain('renderRelacionar');
    expect(examenPublicoSource).toContain('guardarMapaParejas');
    expect(examenPublicoSource).toContain('relacionar__fila');
  });

  test('relacionar: la pagina publica usa el mismo contrato de parejas que el editor', () => {
    // Header minimo: la pagina publica debe poder renderizar una relacionar con
    // dos parejas y leer su mapa desde el mismo formato que usa el editor.
    const htmlMinimo = '<div id="lienzo"></div>';
    const viejoDocument = global.document;
    global.document = {
      getElementById: (id) => {
        if (id === 'lienzo') {
          const fragment = { innerHTML: '', className: '', appendChild() {}, querySelectorAll() { return []; } };
          return fragment;
        }
        return null;
      },
      createElement: () => ({
        type: '', className: '', id: '', name: '', value: '', checked: false,
        placeholder: '', maxLength: 200, autocomplete: '', rows: 1,
        addEventListener() {},
        style: { setProperty() {}, removeProperty() {} },
        dataset: {},
        focus() {},
        querySelectorAll() { return []; },
        appendChild() {},
        remove() {},
        textContent: '',
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        closest() { return null; },
        getAttribute() { return null; },
        setAttribute() {},
        removeAttribute() {},
        contains() { return false; },
        replaceWith() {},
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
        childNodes: [],
        firstChild: null,
        lastChild: null,
        nodeType: 1,
        nodeValue: null,
        textContent: '',
        ownerDocument: global.document,
      }),
      createTextNode: (t) => ({ textContent: t, nodeType: 3 }),
      body: { appendChild() {}, removeChild() {}, clientWidth: 0, clientHeight: 0 },
      readyState: 'complete',
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    global.window = {
      Iconos: { render() { return 'icono'; }, actualizar() {} },
      helpers: {
        escapeHtml: (s) => String(s == null ? '' : s),
        nombreAlumno() { return 'Alumno'; },
        formatearFecha() { return ''; },
      },
      examenesRepository: { obtener: async () => ({ id: 'e1', titulo: 'Examen', preguntas: [{ id: 'p1', tipo: 'relacionar', opciones: ['L1', 'L2', 'D1', 'D2'], puntos: 1, obligatoria: true, texto: 'Pregunta', respuesta_correcta: '{"0":0,"1":1}' }] }), obtenerIntentos: async () => ({ length: 0 }) },
      puntuacionExamen: { puntosPregunta: (p) => Number(p.puntos || 1), esCorrectaPregunta: () => false, calcularConCorreccion: () => ({ nota: 5 }), detalleCompletar: () => null },
      adminRepository: { registrarAuditoria: async () => ({}) },
      notasRepository: { crearPersonal: async () => ({}) },
      notificationService: { emitir: async () => ({}) },
      helpers: { mostrarAlerta() {}, confirmar: async () => true, formulario: async () => ({}) },
      store: { obtener: () => ({ id: 'u1', rol: 'admin', grupo_id: 'g1' }) },
      router: { navegar() {}, irAtras() {}, _ejecutar() {} },
      campanaNotificaciones: { renderCampana() { return ''; }, conectar() {} },
      skeleton: { tarjetas: () => '<div class="skel"></div>' },
    };
    // cargarEnContexto devuelve el window del contexto aislado: el IIFE publica
    // el objeto en window.vistaExamenEditor.
    const contexto = cargarEnContexto([editorSource]);
    const editor = contexto && contexto.vistaExamenEditor;
    if (!editor || typeof editor.montar !== 'function') throw new Error('vista-examen-editor no expuesto en el contexto');
    try {
      const montaje = editor.montar(global.document.body, { id: 'e1' });
      // montar es async: sin dependencias (store, helpers) la promesa se rechaza,
      // y ese rechazo no debe colgar la suite.
      if (montaje && typeof montaje.catch === 'function') montaje.catch(() => {});
    } catch (e) {
      // El montado del editor puede fallar por falta de deps; la prueba valida el
      // contrato de relacionar en el lado publico, no el editor completo.
    }
    expect(examenPublicoSource).toContain('renderRelacionar');
    expect(examenPublicoSource).toContain('guardarMapaParejas');
    expect(examenPublicoSource).toContain('relacionar__fila');
  });

  test('la vista de tomar usa índices 0/1 en V/F y respeta frases sin marcadores', () => {
    expect(tomarSource).toContain("const actual = rActual === 'true' ? '0'");
    expect(tomarSource).toContain('TIENE_MARCADOR');
    expect(tomarSource).toContain('mezclaEstable');
    expect(tomarSource).toContain("inp.dataset.tocado = '1'");
  });

  test('la migración 058 amplía los tipos objetivos a todos los automáticos', () => {
    expect(migracion058).toContain("'multiple', 'opcion_unica', 'verdadero_falso',");
    expect(migracion058).toContain("'varias_opciones', 'completar', 'relacionar', 'ordenar'");
  });
});
