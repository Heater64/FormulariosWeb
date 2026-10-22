import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const accountView = read('js/vistas/vista-cuenta.js');
const appShell = read('js/core/index.js');

function crearEntornoTutorial(usuario) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/#!/inicio', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window;
  const estado = { usuario };
  const actualizaciones = [];
  const navegaciones = [];
  const timers = [];
  w.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  w.store = {
    obtener: (clave) => estado[clave],
    actualizar: (clave, valor) => { estado[clave] = valor; }
  };
  w.router = { reemplazar: (ruta) => navegaciones.push(ruta) };
  w.Iconos = { render: (nombre) => `<i data-icono="${nombre}"></i>`, actualizar: vi.fn() };
  w.helpers = { mostrarAlerta: vi.fn() };
  w.cssSecciones = { cargarGrupo: vi.fn(async () => {}) };
  w.supabaseClient = {
    from: (tabla) => ({
      update: (cambios) => ({
        eq: async (campo, id) => {
          actualizaciones.push({ tabla, cambios, campo, id });
          return { error: null };
        }
      })
    })
  };
  vm.runInContext(appShell, dom.getInternalVMContext(), { filename: 'js/core/index.js' });
  return { dom, w, estado, actualizaciones, navegaciones, timers };
}

describe('acceso y ajustes de cuenta', () => {
  test('la ruta Cuenta carga su vista bajo demanda en vez de registrar undefined', () => {
    expect(appShell).toContain("router.registrar('/cuenta', this._vistaLazy(['./js/vistas/vista-cuenta.js'], () => window.vistaCuenta))");
  });

  test('el acceso al nombre de la barra lateral lleva a Mi cuenta', () => {
    expect(appShell).toContain('href="#!${destinoCuenta}" data-nav aria-label="Ir a Mi cuenta"');
    expect(appShell).toContain("const destinoCuenta = '/cuenta'");
  });

  test('Editar perfil abre el formulario y no enlaza a la ruta retirada /perfil', () => {
    expect(accountView).not.toContain('href="#!/perfil"');
    expect(accountView).toContain('id="btnEditarPerfil"');
    expect(appShell).toContain("router.registrar('/perfil', { montar: () => router.reemplazar('/cuenta') })");
  });

  test('Mi cuenta incluye la gestión de notificaciones por categoría y dispositivo', () => {
    expect(accountView).toContain("cabeceraBloque('bell', 'Notificaciones'");
    expect(accountView).toContain('data-notif="${clave}"');
    ['notif_examenes', 'notif_sistema', 'notif_sonidos', 'notif_vibracion', 'notif_nativas']
      .forEach((clave) => expect(accountView).toContain(`clave: '${clave}'`));
    expect(accountView).toContain('id="btnPermisoNotif"');
  });

  test('Desafíos, Estudio, Grupos y Logros siguen ocultos mientras no existan en la web', () => {
    ['notif_desafios', 'notif_estudio', 'notif_grupos', 'notif_logros'].forEach((clave) => {
      expect(accountView).toMatch(new RegExp(`clave: '${clave}'[^\\n]*disponible: false`));
    });
    expect(accountView).toContain('filter((categoria) => categoria.disponible !== false)');
  });

  test('Mi cuenta ofrece controles de tema, contraste y tamaño de texto', () => {
    expect(accountView).toContain('Apariencia');
    expect(accountView).toContain('data-tema="light"');
    expect(accountView).toContain('data-tema="auto"');
    expect(accountView).toContain('data-tema="dark"');
    expect(accountView).toContain('id="chkContraste"');
    expect(accountView).toContain('id="chkLetra"');
  });
});

describe('interacción de apariencia de Cuenta', () => {
  let previousWindow;
  let previousStore;
  let previousLocalStorage;

  beforeEach(() => {
    previousWindow = global.window;
    previousStore = global.store;
    previousLocalStorage = global.localStorage;
  });

  afterEach(() => {
    global.window = previousWindow;
    global.store = previousStore;
    global.localStorage = previousLocalStorage;
  });

  test('al elegir Oscuro aplica el tema y persiste las preferencias locales', async () => {
    const estado = { usuario: { id: 'u-1', username: 'rebeca', rol: 'admin', preferencias: { tema: 'light' } } };
    const storage = new Map();
    const listeners = new Map();
    const radioButtons = ['light', 'auto', 'dark'].map((tema) => ({
      dataset: { tema },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {},
      getAttribute() { return null; },
      click() {
        const handler = listeners.get(`tema-${tema}-click`);
        if (handler) handler();
      },
      addEventListener: (nombre, callback) => listeners.set(`tema-${tema}-${nombre}`, callback)
    }));
    const createControlStub = (listenersPrefix, checkedValue = false) => ({
      dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      getAttribute() { return null; },
      addEventListener: (nombre, callback) => listeners.set(`${listenersPrefix}-${nombre}`, callback),
      checked: checkedValue,
      click() {
        const handler = listeners.get(`${listenersPrefix}-click`);
        if (handler) handler();
      },
    });

    const controles = new Map([
      ['#btnSalir', { addEventListener() {} }],
      ['#formPassword', null],
      ['#chkContraste', { checked: false, addEventListener: (nombre, callback) => listeners.set(`contraste-${nombre}`, callback) }],
      ['#chkLetra', { checked: false, addEventListener: (nombre, callback) => listeners.set(`letra-${nombre}`, callback) }],
      ['[data-control="altoContraste"]', createControlStub('altoContraste')],
      ['[data-control="letraGrande"]', createControlStub('letraGrande')],
    ]);

    const raiz = {
      innerHTML: '',
      querySelector: (selector) => controles.get(selector) ?? null,
      querySelectorAll: (selector) => {
        if (selector === '[data-tema]') return radioButtons;
        if (selector.startsWith('[data-control=')) {
          const clave = selector.slice(selector.indexOf('=') + 1).replace(/"/g, '');
          return controles.get(`[data-control="${clave}"]`) ? [controles.get(`[data-control="${clave}"]`)] : [];
        }
        if (selector.startsWith('#chkLetra') || selector.startsWith('#chkContraste') || selector.startsWith('#btn')) {
          const control = controles.get(selector);
          return control ? [control] : [];
        }
        return [];
      }
    };
    let preferenciasGuardadas;
    let temaAplicado = false;
    global.localStorage = {
      setItem: (key, value) => storage.set(key, value),
      getItem: (key) => storage.get(key) || null
    };
    global.store = {
      obtener: (key) => estado[key],
      actualizar: (key, value) => { estado[key] = value; }
    };
    global.window = {
      panelUI: { esc: (value) => String(value ?? '') },
      // La vista pinta iconos Lucide en la cabecera; el stub devuelve el mismo
      // marcado que usa el sistema real de iconos.
      Iconos: { render: (nombre) => `<i data-lucide="${nombre}"></i>`, actualizar() {} },
      preferencias: {
        guardar: (value) => { preferenciasGuardadas = value; },
        aplicar: () => { temaAplicado = true; }
      },
      helpers: { confirmar: async () => false, mostrarAlerta() {} },
      router: { navegar() {} },
      authRepository: null,
      supabaseClient: null
    };

    new Function(accountView)();
    await global.window.vistaCuenta.montar(raiz);
    await listeners.get('tema-dark-click')();
    controles.get('[data-control="altoContraste"]').click();
    controles.get('[data-control="letraGrande"]').click();

    expect(raiz.innerHTML).toContain('Apariencia');
    expect(preferenciasGuardadas).toMatchObject({ tema: 'dark', alto_contraste: true, letra_grande: true });
    expect(temaAplicado).toBe(true);
    expect(JSON.parse(storage.get('fb_usuario')).preferencias).toMatchObject({ tema: 'dark', alto_contraste: true, letra_grande: true });
  });
});
