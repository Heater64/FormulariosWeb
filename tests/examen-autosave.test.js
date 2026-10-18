import { beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dominioFuente = read('js/dominio/borrador-examen.js');
const almacenFuente = read('js/datos/borradores-editor.js');
const editorFuente = read('js/vistas/vista-examen-editor.js');

/** localStorage de mentira con la misma interfaz que usa el módulo. */
function crearLocalStorage() {
  const datos = new Map();
  return {
    datos,
    get length() { return datos.size; },
    key(indice) { return Array.from(datos.keys())[indice] ?? null; },
    getItem(clave) { return datos.has(clave) ? datos.get(clave) : null; },
    setItem(clave, valor) {
      if (this.fallar) throw new Error('QuotaExceededError');
      datos.set(clave, String(valor));
    },
    removeItem(clave) { datos.delete(clave); }
  };
}

function cargar({ almacen = crearLocalStorage() } = {}) {
  const window = { localStorage: almacen };
  new Function('window', 'console', dominioFuente)(window, console);
  new Function('window', 'console', almacenFuente)(window, console);
  return { window, dominio: window.borradorExamen, store: window.borradoresEditor, almacen };
}

const examen = (extra = {}) => Object.assign({
  id: 'ex-1',
  titulo: 'Examen de prueba',
  estado: 'borrador',
  preguntas: [{ id: 'p1', texto: '¿Pregunta?', tipo: 'texto_largo' }]
}, extra);

describe('dominio del borrador del editor', () => {
  test('crea una instantánea independiente del examen en memoria', () => {
    const { dominio } = cargar();
    const original = examen();

    const borrador = dominio.crearInstantanea(original, { baseEn: '2026-10-18T10:00:00Z', rev: 3 });

    original.titulo = 'Cambiado después';
    expect(borrador.examen.titulo).toBe('Examen de prueba');
    expect(borrador.clave).toBe('fb_editor_borrador:ex-1');
    expect(borrador.baseEn).toBe('2026-10-18T10:00:00Z');
    expect(borrador.rev).toBe(3);
    expect(borrador.pendiente).toBe(true);
    expect(borrador.version).toBe(dominio.VERSION);
  });

  test('un examen nuevo usa la clave "nuevo"', () => {
    const { dominio } = cargar();
    expect(dominio.clave(null)).toBe('fb_editor_borrador:nuevo');
    expect(dominio.crearInstantanea({ titulo: 'Sin id' }).clave).toBe('fb_editor_borrador:nuevo');
  });

  test('solo cuenta como contenido real lo que escribió el usuario', () => {
    const { dominio } = cargar();

    expect(dominio.tieneContenidoReal({ titulo: '', preguntas: [{ texto: '', opciones: ['', ''] }] })).toBe(false);
    expect(dominio.tieneContenidoReal({ titulo: 'Examen' })).toBe(true);
    expect(dominio.tieneContenidoReal({ preguntas: [{ texto: 'Algo' }] })).toBe(true);
    expect(dominio.tieneContenidoReal({ preguntas: [{ texto: '', opciones: ['', 'Noé'] }] })).toBe(true);
    expect(dominio.tieneContenidoReal({ preguntas: [{ texto: '', huecos: [{ respuesta_correcta: 'fe' }] }] })).toBe(true);
    expect(dominio.tieneContenidoReal(null)).toBe(false);
  });

  test('se restaura solo lo pendiente y con contenido', () => {
    const { dominio } = cargar();
    const pendiente = dominio.crearInstantanea(examen(), { rev: 2 });

    expect(dominio.necesitaRestauracion(pendiente)).toBe(true);
    expect(dominio.necesitaRestauracion(Object.assign({}, pendiente, { pendiente: false }))).toBe(false);
    expect(dominio.necesitaRestauracion(dominio.crearInstantanea({ titulo: '', preguntas: [{ texto: '' }] }))).toBe(false);
    expect(dominio.necesitaRestauracion(null)).toBe(false);
    expect(dominio.necesitaRestauracion({ version: 99, pendiente: true, examen: examen() })).toBe(false);
  });

  test('resume título, preguntas y fecha para la tarjeta de recuperación', () => {
    const { dominio } = cargar();
    const borrador = dominio.crearInstantanea(examen({ titulo: '  Repaso  ' }), { ahora: '2026-10-18T12:00:00Z' });

    expect(dominio.resumenBorrador(borrador)).toEqual({
      id: 'ex-1',
      titulo: 'Repaso',
      preguntas: 1,
      guardadoEn: '2026-10-18T12:00:00Z'
    });
  });
});

describe('almacenamiento local de borradores', () => {
  let entorno;

  beforeEach(() => {
    entorno = cargar();
  });

  test('guarda y recupera una instantánea', () => {
    const { dominio, store } = entorno;
    const borrador = dominio.crearInstantanea(examen(), { rev: 1 });

    expect(store.guardar(borrador)).toBe(true);
    expect(store.obtener('ex-1').rev).toBe(1);
  });

  test('ignora entradas corruptas o de otra versión', () => {
    const { store, almacen } = entorno;
    almacen.setItem('fb_editor_borrador:roto', '{no-json');
    almacen.setItem('fb_editor_borrador:viejo', JSON.stringify({ version: 0, examen: {} }));

    expect(store.obtener('roto')).toBeNull();
    expect(store.obtener('viejo')).toBeNull();
    expect(store.listar()).toEqual([]);
  });

  test('lista pendientes con contenido y descarta los vacíos', () => {
    const { dominio, store } = entorno;

    store.guardar(dominio.crearInstantanea(examen({ id: 'a' }), { rev: 1 }));
    store.guardar(dominio.crearInstantanea({ id: 'b', titulo: '', preguntas: [{ texto: '' }] }, { rev: 1 }));
    store.guardar(dominio.crearInstantanea(examen({ id: 'c' }), { rev: 1, pendiente: false }));

    expect(store.listarPendientes().map((borrador) => borrador.examen.id)).toEqual(['a']);
  });

  test('migra la clave de un examen nuevo al id que devuelve el servidor', () => {
    const { dominio, store } = entorno;
    store.guardar(dominio.crearInstantanea({ titulo: 'Nuevo', preguntas: [] }, { rev: 1 }));

    expect(store.migrar('nuevo', 'uuid-real')).toBe(true);
    expect(store.obtener('nuevo')).toBeNull();
    expect(store.obtener('uuid-real').examen.id).toBe('uuid-real');
  });

  test('elimina un borrador concreto', () => {
    const { dominio, store } = entorno;
    store.guardar(dominio.crearInstantanea(examen(), { rev: 1 }));

    store.eliminar('ex-1');

    expect(store.obtener('ex-1')).toBeNull();
    expect(store.listar()).toEqual([]);
  });

  test('poda los borradores más antiguos y conserva los más recientes', () => {
    const { dominio, store } = entorno;
    for (let i = 0; i < dominio.MAX_BORRADORES + 3; i++) {
      store.guardar(dominio.crearInstantanea(
        examen({ id: `ex-${i}` }),
        { rev: 1, ahora: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z` }
      ));
    }

    const ids = store.listar().map((borrador) => borrador.examen.id);
    expect(ids).toHaveLength(dominio.MAX_BORRADORES);
    expect(ids).not.toContain('ex-0');
    expect(ids).not.toContain('ex-2');
    expect(ids).toContain('ex-3');
  });

  test('si el almacenamiento falla, no lanza y devuelve false', () => {
    const { dominio, store, almacen } = entorno;
    const borrador = dominio.crearInstantanea(examen(), { rev: 1 });
    almacen.fallar = true;

    expect(() => store.guardar(borrador)).not.toThrow();
    expect(store.guardar(borrador)).toBe(false);
  });

  test('sin localStorage disponible degrada a lista vacía', () => {
    const { window } = cargar();
    delete window.localStorage;
    const dominio = window.borradorExamen;
    const store = window.borradoresEditor;

    expect(store.listar()).toEqual([]);
    expect(store.guardar(dominio.crearInstantanea(examen()))).toBe(false);
    expect(store.obtener('ex-1')).toBeNull();
  });
});

/** Carga el editor con un window simulado; no necesita DOM salvo querySelector. */
function crearEditor(opciones = {}) {
  const window = opciones.window || {};
  window.panelUI = window.panelUI || {
    esc: (valor) => String(valor ?? ''),
    numero: (valor) => String(valor),
    tiempoRelativo: () => 'hace 1 min'
  };
  window.Iconos = window.Iconos || { render: (nombre) => `<i data-lucide="${nombre}"></i>`, actualizar() {} };
  window.helpers = Object.assign({
    confirmar: async () => true,
    mostrarAlerta() {},
    escapeHtml: (valor) => String(valor ?? '')
  }, window.helpers || {});
  const documentFake = {
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
    visibilityState: 'visible'
  };
  const store = opciones.store || { obtener: () => ({ id: 'u1', grupo_id: 'g', rol: 'admin' }) };
  const router = opciones.router || {
    navegar: vi.fn(),
    _ejecutar: vi.fn(),
    registrarGuardia: vi.fn(() => () => {}),
    revertirNavegacion: vi.fn()
  };
  new Function('window', 'store', 'router', 'document', editorFuente)(window, store, router, documentFake);
  return { editor: window.vistaExamenEditor, window, store, router };
}

const examenValido = (extra = {}) => Object.assign({
  id: undefined,
  grupo_id: 'g',
  creado_por: 'u1',
  titulo: 'Examen completo',
  descripcion: '',
  estado: 'borrador',
  publicado: false,
  config: {},
  preguntas: [{
    id: 'p1',
    texto: '¿Quién construyó el arca?',
    tipo: 'multiple',
    opciones: ['Noé', 'Moisés'],
    respuesta_correcta: '0',
    puntos: 1,
    obligatoria: true,
    huecos: []
  }]
}, extra);

describe('editor de exámenes: validación compartida y restauración', () => {
  test('el autoguardado usa las mismas reglas que el guardado manual', () => {
    const { editor } = crearEditor();
    editor._examen = examenValido();

    const datos = editor._datosParaGuardar();
    expect(datos.preguntas).toHaveLength(1);
    expect(datos.total).toBe(1);

    editor._examen.titulo = '';
    expect(() => editor._datosParaGuardar()).toThrow('título');

    editor._examen = examenValido({
      preguntas: [{ id: 'p1', texto: 'Pregunta', tipo: 'multiple', opciones: ['A', ''], respuesta_correcta: '0', puntos: 1 }]
    });
    expect(() => editor._datosParaGuardar()).toThrow('opción vacía');

    editor._examen = examenValido({
      preguntas: [{ id: 'p1', texto: 'Pregunta', tipo: 'multiple', opciones: ['A', 'B'], respuesta_correcta: '0', puntos: 0 }]
    });
    expect(() => editor._datosParaGuardar()).toThrow('puntuación');
  });

  test('reconstruye el examen desde el borrador y normaliza sus preguntas', () => {
    const { editor } = crearEditor();
    const borrador = {
      version: 1,
      examen: {
        titulo: 'Recuperado',
        estado: 'borrador',
        preguntas: [{ tipo: 'opcion_unica', texto: 'Heredada', opciones: ['Sí', 'No'], respuesta_correcta: '1' }]
      }
    };
    const servidor = { id: 'ex-9', grupo_id: 'g', creado_por: 'u1', actualizado_en: '2026-10-18T10:00:00Z' };

    const examen = editor._examenDesdeBorrador(borrador, servidor);

    expect(examen.id).toBe('ex-9');
    expect(examen.titulo).toBe('Recuperado');
    expect(examen.grupo_id).toBe('g');
    expect(examen.preguntas[0].tipo).toBe('multiple');
    expect(examen.preguntas[0].respuesta_correcta).toBe('1');
  });
});

describe('editor de exámenes: autoguardado en nube', () => {
  function crearEntornoNube() {
    const guardar = vi.fn();
    const window = {
      supabaseClient: {},
      examenesRepository: { guardar },
      borradoresEditor: {
        guardar: vi.fn(() => true),
        obtener: vi.fn(() => null),
        eliminar: vi.fn(),
        migrar: vi.fn(() => true),
        listarPendientes: vi.fn(() => [])
      },
      borradorExamen: {
        clave: (id) => `fb_editor_borrador:${id || 'nuevo'}`,
        crearInstantanea: vi.fn(() => ({ clave: 'x' }))
      }
    };
    const { editor, router } = crearEditor({ window });
    return { editor, window, router, guardar };
  }

  test('guarda en nube, migra la clave local y marca el examen como guardado', async () => {
    const { editor, window, guardar } = crearEntornoNube();
    guardar.mockResolvedValue({
      id: 'uuid-nuevo',
      grupo_id: 'g',
      creado_por: 'u1',
      estado: 'borrador',
      publicado: false,
      actualizado_en: '2026-10-18T12:00:00Z'
    });
    editor._examen = examenValido();
    editor._claveBorrador = 'nuevo';
    editor._sucio = true;
    editor._rev = 2;

    await editor._autoguardar();

    expect(guardar).toHaveBeenCalledTimes(1);
    const payload = guardar.mock.calls[0][0];
    expect(payload.titulo).toBe('Examen completo');
    expect(payload.id).toBeUndefined();
    expect(payload.preguntas).toHaveLength(1);
    expect(payload.puntos_totales).toBe(1);
    expect(editor._claveBorrador).toBe('uuid-nuevo');
    expect(window.borradoresEditor.migrar).toHaveBeenCalledWith('nuevo', 'uuid-nuevo');
    expect(editor._estadoGuardado).toBe('guardado');
    expect(editor._sucio).toBe(false);
    expect(editor._baseEn).toBe('2026-10-18T12:00:00Z');
  });

  test('un examen incompleto se queda en local y no crea filas en la nube', async () => {
    const { editor, guardar } = crearEntornoNube();
    editor._examen = examenValido({ titulo: '' });
    editor._sucio = true;

    await editor._autoguardar();

    expect(guardar).not.toHaveBeenCalled();
    expect(editor._estadoGuardado).toBe('local');
    expect(editor._sucio).toBe(true);
  });

  test('no lanza dos guardados a la vez: la segunda llamada espera a la primera', async () => {
    const { editor, guardar } = crearEntornoNube();
    let resolver;
    const pendiente = new Promise((resolverPromesa) => { resolver = resolverPromesa; });
    guardar.mockReturnValue(pendiente);
    editor._examen = examenValido();
    editor._sucio = true;

    const primera = editor._autoguardar();
    const segunda = editor._autoguardar();
    // _autoguardar es async: deja pasar los microtasks antes de contar llamadas.
    await new Promise((resolverTick) => setTimeout(resolverTick, 0));

    expect(guardar).toHaveBeenCalledTimes(1);
    expect(segunda).toBeInstanceOf(Promise);

    resolver({ id: 'uuid-1', grupo_id: 'g', creado_por: 'u1', estado: 'borrador', publicado: false, actualizado_en: '2026-10-18T12:00:00Z' });
    await primera;
    expect(editor._estadoGuardado).toBe('guardado');
  });

  test('si la nube falla, conserva el trabajo y muestra el error con reintento', async () => {
    const { editor, guardar } = crearEntornoNube();
    guardar.mockRejectedValue(new Error('Sin conexión'));
    editor._examen = examenValido();
    editor._sucio = true;

    await editor._autoguardar();

    expect(editor._estadoGuardado).toBe('error');
    expect(editor._ultimoErrorGuardado).toBe('Sin conexión');
    expect(editor._sucio).toBe(true);
  });
});

describe('editor de exámenes: salida con confirmación', () => {
  test('cancelar deja al usuario en el editor', async () => {
    const confirmar = vi.fn(async () => false);
    const { editor } = crearEditor({ window: { helpers: { confirmar } } });
    editor._examen = examenValido();

    await expect(editor._confirmarSalida()).resolves.toBe(false);
    expect(editor._salidaAutorizada).toBe(false);
  });

  test('confirmar autoriza la salida y guarda antes de irse', async () => {
    const guardarLocal = vi.fn();
    const { editor } = crearEditor({ window: { helpers: { confirmar: async () => true } } });
    editor._examen = examenValido();
    editor._sucio = true;
    editor._guardarBorradorLocal = guardarLocal;
    // Sin cliente de Supabase: no intenta la nube y no bloquea.
    editor._puedeGuardarEnNube = () => false;

    await expect(editor._confirmarSalida()).resolves.toBe(true);
    expect(editor._salidaAutorizada).toBe(true);
    expect(guardarLocal).toHaveBeenCalled();
  });

  test('la guardia del router revierte la navegación cuando el usuario cancela', async () => {
    let guardia;
    const router = {
      navegar: vi.fn(),
      _ejecutar: vi.fn(),
      registrarGuardia: vi.fn((fn) => { guardia = fn; return vi.fn(); }),
      revertirNavegacion: vi.fn()
    };
    const { editor } = crearEditor({
      window: { helpers: { confirmar: async () => false } },
      router
    });
    editor._claveBorrador = 'ex-1';
    editor._registrarGuardia();

    await expect(guardia('/inicio')).resolves.toBe(false);
    expect(router.revertirNavegacion).toHaveBeenCalledWith('/editor/ex-1');
  });

  test('la guardia deja remontar la misma ruta sin preguntar', async () => {
    let guardia;
    const router = {
      navegar: vi.fn(),
      _ejecutar: vi.fn(),
      registrarGuardia: vi.fn((fn) => { guardia = fn; return vi.fn(); }),
      revertirNavegacion: vi.fn()
    };
    const confirmar = vi.fn(async () => true);
    const { editor } = crearEditor({ window: { helpers: { confirmar } }, router });
    editor._claveBorrador = 'ex-1';
    editor._registrarGuardia();

    await expect(guardia('/editor/ex-1')).resolves.toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });
});
