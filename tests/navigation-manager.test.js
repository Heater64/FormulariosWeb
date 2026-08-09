import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarNavigation() {
  const codigo = readFileSync(join(srcDir, 'js/core/navigation.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

let documentoListeners = {};
let navElActual = null;

function prepararEntorno() {
  documentoListeners = {};

  const navEl = {
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  navElActual = navEl;

  global.window = global;
  global.window.addEventListener = vi.fn();
  global.window.eventBus = { publicar: vi.fn() };
  global.document = {
    addEventListener: (ev, fn) => { (documentoListeners[ev] = documentoListeners[ev] || []).push(fn); },
    removeEventListener: vi.fn(),
    getElementById: (id) => (id === 'barra-navegacion' ? navEl : null)
  };

  // Evitar que un manager del test anterior (con su navEl viejo) siga
  // resuelto: el poll de iniciar() solo debe ver el manager del test actual.
  global.window.navigationManager = null;
  global.navigationManager = null;

  return navEl;
}

function iniciar() {
  // El módulo registra DOMContentLoaded; lo disparamos. El NavigationManager
  // se crea dentro con setTimeout(500), así que hay que esperar a que exista.
  const fn = (documentoListeners['DOMContentLoaded'] || [])[0];
  if (!fn) { return Promise.resolve(null); }
  fn();
  return new Promise((resolve) => {
    const t0 = Date.now();
    const poll = () => {
      if (global.window.navigationManager) { resolve(global.window.navigationManager); return; }
      if (Date.now() - t0 > 3000) { resolve(null); return; }
      setTimeout(poll, 25);
    };
    poll();
  });
}

describe('NavigationManager (barra inferior)', () => {
  beforeEach(() => {
    // El módulo usa `document` al cargarse (registra DOMContentLoaded), así
    // que el entorno debe estar preparado ANTES de cargarlo.
    prepararEntorno();
    cargarNavigation();
  });

  test('la barra arranca visible (nunca oculta por scroll)', async () => {
    const nm = await iniciar();
    const navEl = navElActual;

    expect(nm.isHidden()).toBe(false);
    expect(navEl.style.transform).toBe('');
  });

  test('no existe lógica de hide-on-scroll (sin listener de scroll ni _handleScroll)', async () => {
    await iniciar();
    const codigo = readFileSync(join(srcDir, 'js/core/navigation.js'), 'utf8');
    expect(codigo).not.toMatch(/_handleScroll|_attachScrollListener|hideTemporarily/);
  });

  test('_hide() oculta la barra y _show() la restaura', async () => {
    const navEl = navElActual;
    const nm = await iniciar();

    nm._hide();
    expect(nm.isHidden()).toBe(true);
    expect(navEl.style.transform).toBe('translateY(100%)');

    nm._show();
    expect(nm.isHidden()).toBe(false);
    expect(navEl.style.transform).toBe('translateY(0)');
  });

  test('teclado: ocultarPorTeclado(true) oculta y (false) restaura', async () => {
    const nm = await iniciar();

    nm.ocultarPorTeclado(true);
    expect(nm.isHidden()).toBe(true);

    nm.ocultarPorTeclado(false);
    expect(nm.isHidden()).toBe(false);
  });

  test('con el teclado abierto _show() no fuerza la barra (no tapa el campo)', async () => {
    const nm = await iniciar();

    nm.ocultarPorTeclado(true);
    nm._show();
    expect(nm.isHidden()).toBe(true);
  });

  test('showPermanent() restaura la barra si el teclado está cerrado', async () => {
    const nm = await iniciar();

    nm._hide();
    nm.showPermanent();
    expect(nm.isHidden()).toBe(false);
  });
});
