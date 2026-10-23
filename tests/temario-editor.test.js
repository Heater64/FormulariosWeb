import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const editorFuente = read('js/vistas/vista-examen-editor.js');
const componenteFuente = read('js/componentes/editor-temario.js');
const examenesFuente = read('js/vistas/vista-examenes.js');
const cssFuente = read('js/core/css-secciones.js');
const coreFuente = read('js/core/index.js');
const featuresFuente = read('js/core/features.js');

const CATALOGO = [
  { id: 1, nombre: 'Génesis', abreviatura: 'Gén', num_capitulos: 50 },
  { id: 19, nombre: 'Salmos', abreviatura: 'Sal', num_capitulos: 150 },
  { id: 23, nombre: 'Isaías', abreviatura: 'Is', num_capitulos: 66 },
  { id: 43, nombre: 'Juan', abreviatura: 'Jn', num_capitulos: 21 }
];

describe('temario — la bandera gobierna todas las entradas', () => {
  test('el editor solo pinta el bloque con features.activa("temario")', () => {
    expect(editorFuente).toContain("window.features.activa('temario')");
    expect(editorFuente).toContain('temarioContenedor');
    expect(editorFuente).toContain('window.editorTemario.montar');
    expect(editorFuente).toContain('window.editorTemario.desmontar()');
  });

  test('el temario entra en los dos guardados (manual y autoguardado)', () => {
    const enGuardado = (editorFuente.match(/temario: ex\.temario \|\| null/g) || []).length;
    expect(enGuardado).toBe(2);
    // Carga: servidor, examen nuevo y restauración de borrador local.
    expect(editorFuente).toContain('temario: (examen.temario && typeof examen.temario === \'object\')');
    expect(editorFuente).toContain('temario: null');
    expect(editorFuente).toContain('guardado.temario');
  });

  test('la tarjeta de /examenes oculta indicador y acción sin la bandera', () => {
    expect(examenesFuente).toContain("window.features.activa('temario')");
    expect(examenesFuente).toContain('data-accion="temario"');
    expect(examenesFuente).toContain('?temario=1');
    expect(examenesFuente).not.toContain('onclick=');
  });

  test('la ruta del editor carga el componente de temario de forma perezosa', () => {
    expect(coreFuente).toContain("'./js/componentes/editor-temario.js'");
    // Regresión: sin estos dos scripts en la ruta, «Interpretar» fallaba
    // porque window.temarioParser/temarioRepository no existían.
    expect(coreFuente).toContain("'./js/dominio/temario-parser.js'");
    expect(coreFuente).toContain("'./js/datos/temario-repository.js'");
  });

  test('el CSS del temario está registrado en el grupo editor', () => {
    const inicio = cssFuente.indexOf('editor: [');
    const fin = cssFuente.indexOf('],', inicio);
    expect(inicio).toBeGreaterThanOrEqual(0);
    const grupoEditor = cssFuente.slice(inicio, fin);
    expect(grupoEditor).toContain("'_temario.css'");
  });

  test('sin onclick inline en el componente ni en el editor', () => {
    expect(componenteFuente).not.toContain('onclick=');
    expect(editorFuente).not.toContain('onclick=');
    expect(componenteFuente).toContain('addEventListener');
    expect(componenteFuente).toContain('panelUI.esc');
  });

  test('alta rápida y publicación como botón claro; Configuración en tres tarjetas', () => {
    // Alta rápida: campo con delegación de Enter + botón.
    expect(componenteFuente).toContain('data-tem="alta-campo"');
    expect(componenteFuente).toContain('_alTecla = (evento)');
    expect(componenteFuente).toContain('_altaRapida()');
    // Publicar es un botón con etiqueta de estado, no un checkbox suelto.
    expect(componenteFuente).toContain('Publicar a la clase');
    expect(componenteFuente).toContain('Ocultar de la clase');
    expect(componenteFuente).not.toContain('temarioPublicado');
    // El panel Configuración son tres secciones con título propio.
    expect(editorFuente).toContain('id="titSeccionExamen"');
    expect(editorFuente).toContain('id="titSeccionEvaluacion"');
    expect(editorFuente).toContain('>Examen</h2>');
    expect(editorFuente).toContain('>Evaluación</h2>');
  });
});

describe('temario — comportamiento del runtime de banderas', () => {
  function crearFeatures({ rpc } = {}) {
    const window = { supabaseClient: rpc ? { rpc } : null, console };
    new Function('window', 'console', featuresFuente)(window, console);
    return window.features;
  }

  test('una RPC correcta activa solo las claves con activa=true', async () => {
    const features = crearFeatures({
      rpc: async (nombre) => {
        expect(nombre).toBe('fb_funciones');
        return { data: [{ clave: 'temario', activa: true }, { clave: 'estudio', activa: false }], error: null };
      }
    });
    expect(await features.cargar()).toBe(true);
    expect(features.activa('temario')).toBe(true);
    expect(features.activa('estudio')).toBe(false);
    expect(features.activa('inventada')).toBe(false);
  });

  test('si la RPC falla, todo queda oculto y cargar() no lanza', async () => {
    const features = crearFeatures({ rpc: async () => ({ data: null, error: new Error('red caída') }) });
    expect(await features.cargar()).toBe(false);
    expect(features.activa('temario')).toBe(false);
    expect(features._estado().cargado).toBe(false);
  });

  test('sin cliente Supabase (arranque en frío) todo vale false', async () => {
    const features = crearFeatures({});
    expect(await features.cargar()).toBe(false);
    expect(features.activa('temario')).toBe(false);
  });
});

// ── Bloque en el DOM (jsdom, patrón de tests/examen-flujo-completo) ────────

function crearEntorno() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="temarioContenedor"></div></body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  const ctx = dom.getInternalVMContext();

  w.helpers = {
    escapeHtml: (v) => String(v == null ? '' : String(v))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    confirmar: async () => true,
    mostrarAlerta: () => {}
  };
  w.temarioRepository = { async catalogoLibros() { return CATALOGO; } };

  ['js/componentes/panel-ui.js', 'js/dominio/temario-parser.js', 'js/componentes/editor-temario.js']
    .forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));

  return w;
}

/** Espera (con techo) a que la condición sea verdadera tras un clic async. */
async function esperar(condicion, maxMs = 500) {
  const inicio = Date.now();
  while (Date.now() - inicio < maxMs) {
    if (condicion()) return;
    await new Promise((resolver) => setTimeout(resolver, 10));
  }
  throw new Error('Condición no alcanzada en ' + maxMs + ' ms');
}

describe('temario — bloque en el DOM', () => {
  test('sin temario muestra el estado «Sin temario» con el alta rápida y pegar como secundario', () => {
    const w = crearEntorno();
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), { temario: null, onCambio() {} });
    const html = w.document.getElementById('temarioContenedor').innerHTML;
    expect(html).toContain('Sin temario');
    expect(html).toContain('Pegar mensaje completo');
    expect(w.document.getElementById('temarioAltaRapida')).toBeTruthy();
    expect(w.document.getElementById('temarioLista').hidden).toBe(true);
    // Sin elementos no hay acción de publicar.
    expect(w.document.querySelector('[data-tem="publicar"]')).toBeNull();
  });

  test('pegar e interpretar crea los elementos y notifica al editor', async () => {
    const w = crearEntorno();
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), {
      temario: null,
      onCambio: (t) => cambios.push(t)
    });

    w.document.querySelector('[data-tem="pegar"]').click();
    const modal = w.document.querySelector('.adm-modal');
    expect(modal).toBeTruthy();
    modal.querySelector('#temarioTextoPegado').value =
      'Génesis 17:17\nSalmos 107, fijarse si es un salmo corto o largo\nFijarse cuántos capítulos tiene el libro de Isaías';
    modal.querySelector('[data-tem="interpretar"]').click();

    await esperar(() => w.document.querySelectorAll('.temario-item').length === 3);
    expect(cambios).toHaveLength(1);
    const temario = cambios[0];
    expect(temario.publicado).toBe(false);
    expect(temario.texto_original).toContain('Génesis 17:17');
    expect(temario.items.map((i) => i.tipo)).toEqual(['referencia', 'observacion', 'tarea']);
    expect(temario.avisos).toHaveLength(0);
    expect(w.document.querySelector('[data-tem="publicar"]').textContent).toContain('Publicar a la clase');
    // El panel de revisión queda desplegado tras interpretar.
    expect(w.document.getElementById('temarioLista').hidden).toBe(false);
  });

  test('publicar con todo revisado: el botón conmuta a «Ocultar de la clase»', async () => {
    const w = crearEntorno();
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), {
      temario: {
        publicado: false,
        texto_original: 'Juan 1:47',
        items: [{ id: 't1', tipo: 'referencia', texto: 'Juan 1:47', refs: [{ libro: 'Juan', capitulo: 1, versiculos: '47' }], nota: '', orden: 0, estado: 'ok' }],
        avisos: []
      },
      onCambio: (t) => cambios.push(t)
    });

    w.document.querySelector('[data-tem="publicar"]').click();
    await esperar(() => cambios.length > 0);
    expect(cambios[cambios.length - 1].publicado).toBe(true);
    expect(w.document.querySelector('[data-tem="publicar"]').textContent).toContain('Ocultar de la clase');
    expect(w.document.querySelector('.temario__badge').textContent).toContain('Publicado');
  });

  test('publicar con elementos sin revisar exige confirmación y se puede negar', async () => {
    const w = crearEntorno();
    let confirmaciones = 0;
    w.helpers.confirmar = async () => { confirmaciones += 1; return false; };
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), {
      temario: {
        publicado: false,
        texto_original: 'Linea rara 30',
        items: [{ id: 't1', tipo: 'texto', texto: 'Linea rara 30', refs: [], nota: '', orden: 0, estado: 'revisar' }],
        avisos: [{ id: 't1', linea: 1, tipo: 'libro_desconocido', mensaje: 'No reconozco «Rara»' }]
      },
      onCambio: (t) => cambios.push(t)
    });

    w.document.querySelector('[data-tem="publicar"]').click();
    // Espera a que la negativa se aplique (el «no» llega en un microtask
    // posterior al propio confirmar).
    await esperar(() => confirmaciones > 0);
    expect(cambios).toHaveLength(0);
    expect(w.document.querySelector('[data-tem="publicar"]').textContent).toContain('Publicar a la clase');
  });

  test('editar el texto de un elemento vuelve a interpretar sus referencias', async () => {
    const w = crearEntorno();
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), {
      temario: {
        publicado: false,
        texto_original: 'XXX',
        items: [{ id: 't1', tipo: 'texto', texto: 'XXX', refs: [], nota: '', orden: 0, estado: 'revisar' }],
        avisos: []
      },
      onCambio: (t) => cambios.push(t)
    });
    w.document.querySelector('[data-tem="revisar"]').click();

    const campo = w.document.querySelector('.temario-item__texto');
    campo.value = 'Juan 1:47';
    campo.dispatchEvent(new w.Event('change', { bubbles: true }));
    await esperar(() => cambios.length > 0);

    const item = cambios[cambios.length - 1].items[0];
    expect(item.refs).toEqual([{ libro: 'Juan', capitulo: 1, versiculos: '47' }]);
    expect(item.tipo).toBe('referencia');
    expect(item.estado).toBe('ok');
  });

  test('alta rápida: Enter añade la línea interpretada al final, conservando lo previo', async () => {
    const w = crearEntorno();
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), {
      temario: {
        publicado: false,
        texto_original: 'Génesis 17:17',
        items: [{ id: 't1', tipo: 'referencia', texto: 'Génesis 17:17', refs: [{ libro: 'Génesis', capitulo: 17, versiculos: '17' }], nota: '', orden: 0, estado: 'ok' }],
        avisos: []
      },
      onCambio: (t) => cambios.push(t)
    });

    const campo = w.document.getElementById('temarioAltaRapida');
    campo.value = 'Juan 1:47';
    campo.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    await esperar(() => cambios.length > 0);
    const temario = cambios[cambios.length - 1];
    expect(temario.items).toHaveLength(2);
    expect(temario.items[1]).toMatchObject({ texto: 'Juan 1:47', tipo: 'referencia', estado: 'ok', orden: 1 });
    expect(temario.items[1].refs).toEqual([{ libro: 'Juan', capitulo: 1, versiculos: '47' }]);
    // Ids frescos: no pisan los elementos ni los avisos anteriores.
    expect(temario.items[1].id).not.toBe('t1');
    expect(temario.avisos).toHaveLength(0);
    expect(temario.texto_original).toContain('Juan 1:47');
    // El campo queda vacío y con foco para seguir añadiendo líneas.
    await esperar(() => w.document.getElementById('temarioAltaRapida').value === '');
    expect(w.document.activeElement).toBe(w.document.getElementById('temarioAltaRapida'));
  });

  test('alta rápida desde «Sin temario» crea el temario y su botón de publicar', async () => {
    const w = crearEntorno();
    const cambios = [];
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), { temario: null, onCambio: (t) => cambios.push(t) });

    w.document.getElementById('temarioAltaRapida').value = 'Salmos 107';
    w.document.querySelector('[data-tem="alta"]').click();

    await esperar(() => cambios.length > 0);
    const temario = cambios[cambios.length - 1];
    expect(temario.publicado).toBe(false);
    expect(temario.items).toHaveLength(1);
    expect(temario.items[0]).toMatchObject({ tipo: 'referencia', estado: 'ok' });
    expect(temario.items[0].refs).toEqual([{ libro: 'Salmos', capitulo: 107 }]);
    expect(w.document.querySelector('[data-tem="publicar"]')).toBeTruthy();
  });

  test('desmontar cierra el modal de pegado abierto', () => {
    const w = crearEntorno();
    w.editorTemario.montar(w.document.getElementById('temarioContenedor'), { temario: null, onCambio() {} });
    w.document.querySelector('[data-tem="pegar"]').click();
    expect(w.document.querySelector('.adm-modal')).toBeTruthy();
    w.editorTemario.desmontar();
    expect(w.document.querySelector('.adm-modal')).toBeNull();
  });
});
