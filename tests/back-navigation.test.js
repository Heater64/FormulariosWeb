import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarBackNav() {
  const codigo = readFileSync(join(srcDir, 'js/core/back-navigation.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

let ventanaListeners = {};
let documentoListeners = {};
let capListeners = {};

function prepararEntorno({ conCapacitor = false, historial = 5 } = {}) {
  ventanaListeners = {};
  documentoListeners = {};
  capListeners = {};

  global.window = global;
  global.window.addEventListener = (ev, fn) => {
    (ventanaListeners[ev] = ventanaListeners[ev] || []).push(fn);
  };
  global.window.Capacitor = conCapacitor
    ? { Plugins: { App: { addListener: (ev, fn) => { capListeners[ev] = fn; } } } }
    : undefined;
  global.document = {
    addEventListener: (ev, fn) => { (documentoListeners[ev] = documentoListeners[ev] || []).push(fn); }
  };
  global.history = {
    pushState: vi.fn(),
    back: vi.fn(),
    length: historial
  };
  global.location = { href: 'http://localhost:5173/#!/perfil' };
}

function iniciar() {
  // El IIFE registra el DOMContentLoaded; lo disparamos para arrancar backNav.
  const fn = (documentoListeners['DOMContentLoaded'] || [])[0];
  if (fn) fn();
  return global.window.backNav;
}

describe('backNav (coordinador de navegación atrás)', () => {
  beforeEach(() => {
    prepararEntorno();
    global.window.backNav = null;
    cargarBackNav();
  });

  test('registrar/desregistrar con pila LIFO (el modal se desregistra al cerrarse)', () => {
    const backNav = iniciar();
    let desA, desB;
    // Como en producción: el cierre del modal desregistra SU handler.
    const a = vi.fn(() => desA());
    const b = vi.fn(() => desB());
    desA = backNav.registrar(a);
    desB = backNav.registrar(b);
    expect(backNav.tienePendientes()).toBe(true);

    // El último registrado es el primero en cerrarse (LIFO)
    const pop = (ventanaListeners['popstate'] || [])[0];
    pop();
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    expect(backNav.tienePendientes()).toBe(true); // a sigue abierto

    desA();
    expect(backNav.tienePendientes()).toBe(false);
  });

  test('popstate con modal abierto: lo cierra y NO re-empuja (el pop ya restauró la URL)', () => {
    const backNav = iniciar();
    const cerrar = vi.fn();
    backNav.registrar(cerrar);
    // Al abrir, registrar empuja UNA entrada con la misma URL
    expect(global.history.pushState).toHaveBeenCalledTimes(1);
    global.history.pushState.mockClear();

    const pop = (ventanaListeners['popstate'] || [])[0];
    pop();

    expect(cerrar).toHaveBeenCalledTimes(1);
    // Crítico: NO re-empujar location.href (ya cambió con el pop); si se
    // empujara, la ruta quedaría en la vista equivocada.
    expect(global.history.pushState).not.toHaveBeenCalled();
  });

  test('abrir un modal empuja una entrada de historial (para que back la deshaga)', () => {
    const backNav = iniciar();
    backNav.registrar(() => {});
    expect(global.history.pushState).toHaveBeenCalledTimes(1);
    expect(global.history.pushState.mock.calls[0][0]).toEqual({ fb_modal: true });
    expect(global.history.pushState.mock.calls[0][2]).toBe('http://localhost:5173/#!/perfil');
  });

  test('popstate sin modales: historial normal (nada que cerrar)', () => {
    iniciar();
    global.history.pushState.mockClear();

    const pop = (ventanaListeners['popstate'] || [])[0];
    pop();

    expect(global.history.pushState).not.toHaveBeenCalled();
  });

  test('cerrarSuperior cierra solo el último modal', () => {
    const backNav = iniciar();
    const a = vi.fn();
    const b = vi.fn();
    backNav.registrar(a);
    backNav.registrar(b);

    backNav.cerrarSuperior();
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });

  test('Capacitor backButton con modal: cierra el modal y no navega', () => {
    prepararEntorno({ conCapacitor: true });
    cargarBackNav();
    const backNav = iniciar();
    const cerrar = vi.fn();
    backNav.registrar(cerrar);

    capListeners['backButton']();
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(global.history.back).not.toHaveBeenCalled();
  });

  test('Capacitor backButton sin modal: delega en el historial', () => {
    prepararEntorno({ conCapacitor: true });
    cargarBackNav();
    iniciar();

    capListeners['backButton']();
    expect(global.history.back).toHaveBeenCalledTimes(1);
  });
});
