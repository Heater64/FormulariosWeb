import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargar() {
  const codigo = readFileSync(join(srcDir, 'js/componentes/pwa-install.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

let ventanaListeners = {};
let documentoListeners = {};
let almacen = {};
let consultados = [];
let modoStandalone = false;
let usuarioAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
let conCapacitorNativo = false;
let conSesion = false;
let suscriptores = [];

function crearNodo(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    className: '',
    innerHTML: '',
    isConnected: true,
    _listeners: {},
    _selector: null,
    appendChild(hijo) { hijo._padre = this; return hijo; },
    remove() { this.isConnected = false; },
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener(ev, fn) {
      this._listeners[ev] = (this._listeners[ev] || []).filter((f) => f !== fn);
    },
    disparar(ev, arg) { (this._listeners[ev] || []).forEach((fn) => fn(arg)); },
    focus() { global.document.activeElement = this; },
    // Busca el atributo data-* en el HTML asignado: devuelve null si no está
    // (p.ej. [data-instalar] no existe en la variante iOS).
    querySelector(sel) {
      const m = String(sel).match(/\[data-([a-z-]+)\]/);
      if (!m || !this.innerHTML.includes(`data-${m[1]}`)) return null;
      const el = crearNodo('button');
      el._selector = sel;
      consultados.push(el);
      return el;
    },
    // Igual que querySelector pero devuelve tantos nodos como ocurrencias
    // del atributo haya en el HTML (el componente enlaza TODOS los [data-cerrar]).
    querySelectorAll(sel) {
      const m = String(sel).match(/\[data-([a-z-]+)\]/);
      if (!m) return [];
      const n = (this.innerHTML.match(new RegExp(`data-${m[1]}`, 'g')) || []).length;
      const out = [];
      for (let i = 0; i < n; i++) {
        const el = crearNodo('button');
        el._selector = sel;
        consultados.push(el);
        out.push(el);
      }
      return out;
    }
  };
}

function prepararEntorno({ conEvento = true, ios = false } = {}) {
  ventanaListeners = {};
  documentoListeners = {};
  consultados = [];
  suscriptores = [];
  modoStandalone = false;
  conCapacitorNativo = false;
  conSesion = false;
  usuarioAgent = ios
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

  global.window = global;
  global.addEventListener = (ev, fn) => {
    (ventanaListeners[ev] = ventanaListeners[ev] || []).push(fn);
  };
  global.removeEventListener = (ev, fn) => {
    ventanaListeners[ev] = (ventanaListeners[ev] || []).filter((f) => f !== fn);
  };

  const documento = {
    _listeners: documentoListeners,
    activeElement: null,
    body: null,
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener(ev, fn) {
      this._listeners[ev] = (this._listeners[ev] || []).filter((f) => f !== fn);
    },
    createElement: (tag) => crearNodo(tag)
  };
  documento.body = crearNodo('body');
  global.document = documento;

  global.localStorage = {
    getItem: (k) => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: (k) => { delete almacen[k]; }
  };

  global.matchMedia = () => ({ matches: modoStandalone });
  vi.stubGlobal('navigator', {
    userAgent: usuarioAgent,
    standalone: false
  });
  global.Capacitor = conCapacitorNativo
    ? { isNativePlatform: () => true }
    : undefined;
  global.store = {
    obtener: () => (conSesion ? { id: 'u1' } : null),
    suscribir: (clave, cb) => { suscriptores.push(cb); return () => {}; }
  };
  global.backNav = undefined;

  if (conEvento) global.onbeforeinstallprompt = undefined;
  else delete global.onbeforeinstallprompt;
}

function iniciar() {
  const fn = (documentoListeners['DOMContentLoaded'] || [])[0];
  if (fn) fn();
  return global.pwaInstall;
}

describe('pwaInstall (modal de instalación PWA)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    almacen = {};
    prepararEntorno();
    global.PwaInstall = null;
    global.pwaInstall = null;
    cargar();
  });

  // ── Detección de instalación ────────────────────────────
  describe('yaInstalada()', () => {
    test('false en un navegador normal', () => {
      const pwa = iniciar();
      expect(pwa.yaInstalada()).toBe(false);
    });

    test('true cuando corre en modo standalone (app instalada)', () => {
      modoStandalone = true;
      const pwa = iniciar();
      expect(pwa.yaInstalada()).toBe(true);
    });

    test('true en iOS con navigator.standalone', () => {
      global.navigator.standalone = true;
      const pwa = iniciar();
      expect(pwa.yaInstalada()).toBe(true);
    });

    test('true en la APK nativa de Capacitor', () => {
      global.Capacitor = { isNativePlatform: () => true };
      const pwa = iniciar();
      expect(pwa.yaInstalada()).toBe(true);
    });
  });

  // ── Detección iOS ───────────────────────────────────────
  describe('esIOS()', () => {
    test('true con un iPhone/iPad', () => {
      const pwa = iniciar();
      expect(pwa.esIOS()).toBe(false);
      prepararEntorno({ ios: true });
      const pwaIOS = new global.PwaInstall();
      expect(pwaIOS.esIOS()).toBe(true);
    });
  });

  // ── Flujo con beforeinstallprompt ───────────────────────
  describe('beforeinstallprompt', () => {
    test('captura el evento, evita el diálogo nativo y muestra el modal', () => {
      const pwa = iniciar();
      const evento = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) };
      ventanaListeners['beforeinstallprompt'].forEach((fn) => fn(evento));

      expect(evento.preventDefault).toHaveBeenCalledTimes(1);
      expect(pwa._deferred).toBe(evento);
      expect(pwa._overlay).not.toBe(null);
      expect(pwa._overlay.className).toContain('pwa-install');
      expect(pwa._overlay.innerHTML).toContain('Instala FormsBiblicos');
      expect(pwa._overlay.innerHTML).toContain('data-instalar');
    });

    test('«Ahora no» guarda el descarte y el cooldown impide re-mostrar', () => {
      const pwa = iniciar();
      const evento = { preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
      ventanaListeners['beforeinstallprompt'][0](evento);
      expect(pwa._overlay).not.toBe(null);

      // El segundo [data-cerrar] es «Ahora no» (el primero es la ×):
      // ambos deben cerrar el modal.
      const cerrar = consultados.filter((b) => b._selector === '[data-cerrar]')[1];
      expect(cerrar).toBeTruthy();
      cerrar.disparar('click');
      expect(pwa._overlay).toBe(null);

      const estado = JSON.parse(almacen['fb_pwa_estado']);
      expect(estado.descartadoEn).toBeTruthy();

      // Un nuevo evento no vuelve a abrir el modal (cooldown activo)
      consultados.length = 0;
      const evento2 = { preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
      ventanaListeners['beforeinstallprompt'][0](evento2);
      expect(pwa._overlay).toBe(null);
    });

    test('la × de cerrar también descarta y guarda el cooldown', () => {
      const pwa = iniciar();
      ventanaListeners['beforeinstallprompt'][0]({ preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });

      const cerrarX = consultados.filter((b) => b._selector === '[data-cerrar]')[0];
      cerrarX.disparar('click');
      expect(pwa._overlay).toBe(null);
      expect(JSON.parse(almacen['fb_pwa_estado']).descartadoEn).toBeTruthy();
    });

    test('pasados 14 días el cooldown expira y vuelve a ofrecer', () => {
      const pwa = iniciar();
      pwa._guardarEstado({ descartadoEn: Date.now() - 15 * 86400000 });
      const evento = { preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
      ventanaListeners['beforeinstallprompt'][0](evento);
      expect(pwa._overlay).not.toBe(null);
    });

    test('Escape descarta igual que «Ahora no»', () => {
      const pwa = iniciar();
      ventanaListeners['beforeinstallprompt'][0]({ preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
      const docKey = documentoListeners['keydown'][0];
      docKey({ key: 'Escape', preventDefault: vi.fn() });
      expect(pwa._overlay).toBe(null);
      expect(JSON.parse(almacen['fb_pwa_estado']).descartadoEn).toBeTruthy();
    });

    test('Instalar llama a prompt(); aceptado marca instalada y cierra', async () => {
      const pwa = iniciar();
      const evento = { preventDefault: () => {}, prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
      ventanaListeners['beforeinstallprompt'][0](evento);

      const instalar = consultados.find((b) => b._selector === '[data-instalar]');
      expect(instalar).toBeTruthy();
      instalar.disparar('click');
      await new Promise((r) => setTimeout(r, 0));

      expect(evento.prompt).toHaveBeenCalledTimes(1);
      expect(pwa._overlay).toBe(null);
      expect(JSON.parse(almacen['fb_pwa_estado']).instalada).toBe(true);
    });

    test('Instalar con prompt rechazado cierra sin guardar descarte', async () => {
      const pwa = iniciar();
      const evento = { preventDefault: () => {}, prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) };
      ventanaListeners['beforeinstallprompt'][0](evento);

      consultados.find((b) => b._selector === '[data-instalar]').disparar('click');
      await new Promise((r) => setTimeout(r, 0));

      expect(pwa._overlay).toBe(null);
      const estado = JSON.parse(almacen['fb_pwa_estado'] || '{}');
      expect(estado.instalada).toBeUndefined();
      expect(estado.descartadoEn).toBeUndefined();
    });

    test('appinstalled marca instalada y cierra cualquier modal abierto', () => {
      const pwa = iniciar();
      ventanaListeners['beforeinstallprompt'][0]({ preventDefault: () => {}, prompt: () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
      expect(pwa._overlay).not.toBe(null);

      ventanaListeners['appinstalled'].forEach((fn) => fn());
      expect(pwa._overlay).toBe(null);
      expect(JSON.parse(almacen['fb_pwa_estado']).instalada).toBe(true);
    });
  });

  // ── iOS (sin beforeinstallprompt) ───────────────────────
  describe('iOS: guía de añadir a pantalla de inicio', () => {
    const setTimeoutOriginal = global.setTimeout;

    beforeEach(() => {
      // El componente programa el auto-mostrado con un setTimeout de 5s:
      // en los tests lo ejecutamos de inmediato para no dejar timers reales.
      global.setTimeout = (fn) => { fn(); return 0; };
    });

    afterEach(() => {
      global.setTimeout = setTimeoutOriginal;
    });

    test('no muestra el modal en la primera visita', () => {
      prepararEntorno({ conEvento: false, ios: true });
      const pwa = new global.PwaInstall();
      pwa.iniciar();
      expect(pwa._overlay).toBe(null);
      expect(JSON.parse(almacen['fb_pwa_estado']).visitas).toBe(1);
    });

    test('muestra la guía al 2º arranque con sesión iniciada', () => {
      prepararEntorno({ conEvento: false, ios: true });
      const primera = new global.PwaInstall();
      primera.iniciar(); // 1ª visita, sin sesión → no muestra

      conSesion = true;
      const segunda = new global.PwaInstall();
      segunda.iniciar(); // 2ª visita
      // Al iniciar sesión, el store notifica → auto-mostrar
      suscriptores.forEach((cb) => cb());

      expect(segunda._overlay).not.toBe(null);
      expect(segunda._overlay.innerHTML).toContain('Añade FormsBiblicos a tu pantalla');
      expect(segunda._overlay.innerHTML).toContain('data-cerrar');
      expect(segunda._overlay.innerHTML).not.toContain('data-instalar');

      // «Entendido» (segundo [data-cerrar]) cierra el modal de la guía
      const entendido = consultados.filter((b) => b._selector === '[data-cerrar]')[1];
      entendido.disparar('click');
      expect(segunda._overlay).toBe(null);
    });

    test('sin sesión no muestra la guía aunque haya visitas', () => {
      prepararEntorno({ conEvento: false, ios: true });
      const pwa = new global.PwaInstall();
      pwa.iniciar();
      suscriptores.forEach((cb) => cb());
      expect(pwa._overlay).toBe(null);
    });
  });

  // ── Inicio con la app ya instalada ──────────────────────
  test('iniciar() no hace nada si la app ya está instalada', () => {
    modoStandalone = true;
    const pwa = iniciar();
    expect(pwa._overlay).toBe(null);
    expect(ventanaListeners['beforeinstallprompt'] || []).toHaveLength(0);
  });
});
