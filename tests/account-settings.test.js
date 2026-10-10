import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const accountView = read('js/vistas/vista-cuenta.js');
const appShell = read('js/core/index.js');

describe('acceso y ajustes de cuenta', () => {
  test('la ruta Cuenta carga su vista bajo demanda en vez de registrar undefined', () => {
    expect(appShell).toContain("router.registrar('/cuenta', this._vistaLazy(['./js/vistas/vista-cuenta.js'], () => window.vistaCuenta))");
  });

  test('el acceso al nombre de la barra lateral lleva a Mi cuenta', () => {
    expect(appShell).toContain('href="#!${destinoCuenta}" data-nav aria-label="Ir a Mi cuenta"');
    expect(appShell).toContain("const destinoCuenta = '/cuenta'");
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
