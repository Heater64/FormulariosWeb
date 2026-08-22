import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

// ============================================================
// update-installer.js — bridge del plugin nativo UpdateInstaller.
//
// Regresión clave: los scripts defer se ejecutan en orden de
// aparición y el runtime de Capacitor se inyecta en el <head>.
// Si update-installer.js corre antes que el runtime UMD,
// root.Capacitor todavía no tiene registerPlugin. El bridge debe
// resolver Capacitor de forma PERZOSA para funcionar en ambos
// órdenes (y en la app real de Android).
// ============================================================

function baseWindow() {
  const window = {
    console,
    setTimeout,
    clearTimeout,
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36' },
    location: { href: 'https://localhost/index.html' }
  };
  window.window = window;
  window.globalThis = window;
  window.self = window;
  window.top = window;
  window.parent = window;
  return window;
}

// Estado que deja la inyección nativa de Android al inicio del documento
// (globalJS + native-bridge.js + pluginJS): window.Capacitor existe con
// Plugins y PluginHeaders, y window.androidBridge permite detectar la
// plataforma nativa. Aún SIN registerPlugin (lo añade el runtime UMD).
// `llamadas` acumula las invocaciones al puente nativo para poder
// espiarlas en los tests.
function estadoTrasInyeccionNativa(window, llamadas = []) {
  window.androidBridge = { postMessage: () => {} };
  window.Capacitor = {
    Plugins: { UpdateInstaller: {} },
    PluginHeaders: [{
      name: 'UpdateInstaller',
      methods: [
        { name: 'addListener', rtype: 'callback' },
        { name: 'removeListener', rtype: 'callback' },
        { name: 'downloadAndInstall', rtype: 'promise' },
        { name: 'cancelDownload', rtype: 'promise' },
        { name: 'openInstallSettings', rtype: 'promise' }
      ]
    }],
    nativePromise: async (plugin, method, options) => {
      llamadas.push(['promise', plugin, method, options]);
      return { status: 'ok' };
    },
    nativeCallback: (plugin, method, options, callback) => {
      llamadas.push(['callback', plugin, method, options]);
      callback && callback({});
    },
    addListener: () => ({ remove: async () => {} }),
    logJs: () => {},
    triggerEvent: () => {}
  };
  return window;
}

function cargar(ruta, window) {
  const codigo = readFileSync(join(srcDir, ruta), 'utf8');
  const ctx = vm.createContext(window);
  vm.runInContext(codigo, ctx);
  return window;
}

// Carga el runtime UMD real de @capacitor/core como lo haría el <script>
// inyectado en el head del build.
function cargarRuntime(window) {
  const codigo = readFileSync(join(srcDir, 'node_modules/@capacitor/core/dist/capacitor.js'), 'utf8');
  const ctx = vm.createContext(window);
  vm.runInContext(codigo, ctx);
  return window;
}

describe('updateInstaller.disponible()', () => {
  test('false en navegador web (sin Capacitor ni bridge nativo)', () => {
    const window = cargar('js/componentes/update-installer.js', baseWindow());
    expect(window.updateInstaller.disponible()).toBe(false);
  });

  test('false con runtime UMD pero sin bridge nativo (web)', () => {
    const window = baseWindow();
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);
    expect(window.Capacitor).toBeTruthy();
    expect(window.Capacitor.isNativePlatform()).toBe(false);
    expect(window.updateInstaller.disponible()).toBe(false);
  });

  test('true en Android con el runtime cargado ANTES que el bridge (orden correcto)', () => {
    const window = estadoTrasInyeccionNativa(baseWindow());
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);
    expect(window.updateInstaller.disponible()).toBe(true);
  });

  test('true en Android aunque el bridge corra ANTES que el runtime (regresión 1.0.2)', () => {
    // Escenario real del bug: update-installer.js se ejecuta antes que el
    // runtime UMD (scripts defer en orden de aparición) y solo ve el objeto
    // del bridge nativo, sin registerPlugin. Al resolver de forma perezosa,
    // el primer uso (después de cargar el runtime) debe funcionar.
    const window = estadoTrasInyeccionNativa(baseWindow());
    cargar('js/componentes/update-installer.js', window); // sin runtime todavía
    expect(window.updateInstaller.disponible()).toBe(false); // aún no hay runtime
    cargarRuntime(window); // el runtime termina de cargar después
    expect(window.updateInstaller.disponible()).toBe(true);
  });

  test('true sin PluginHeaders pero con registro nativo del plugin', () => {
    const window = baseWindow();
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      Plugins: { UpdateInstaller: {} },
      nativePromise: async () => ({ status: 'ok' }),
      nativeCallback: () => {},
      addListener: () => ({ remove: async () => {} }),
      logJs: () => {},
      triggerEvent: () => {}
    };
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);
    expect(window.updateInstaller.disponible()).toBe(true);
  });
});

describe('updateInstaller.descargarEInstalar()', () => {
  test('lanza NATIVE_UNAVAILABLE fuera de Android', async () => {
    const window = cargar('js/componentes/update-installer.js', baseWindow());
    await expect(window.updateInstaller.descargarEInstalar({ apkUrl: 'https://github.com/x/y.apk' }))
      .rejects.toMatchObject({ code: 'NATIVE_UNAVAILABLE' });
  });

  test('llama al plugin nativo downloadAndInstall en Android', async () => {
    const llamadas = [];
    const window = estadoTrasInyeccionNativa(baseWindow(), llamadas);
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);

    const resultado = await window.updateInstaller.descargarEInstalar(
      { apkUrl: 'https://github.com/Heater64/FormulariosWeb/releases/download/v1.0.4/x.apk' },
      () => {}
    );
    expect(resultado).toEqual({ status: 'ok' });
    const descarga = llamadas.find(([tipo]) => tipo === 'promise');
    expect(descarga).toBeTruthy();
    expect(descarga[1]).toBe('UpdateInstaller');
    expect(descarga[2]).toBe('downloadAndInstall');
    expect(descarga[3]).toMatchObject({ apkUrl: 'https://github.com/Heater64/FormulariosWeb/releases/download/v1.0.4/x.apk' });
  });

  test('un fallo al suscribirse al progreso NO bloquea la descarga (regresión error genérico)', async () => {
    // Nota: el runtime real de Capacitor, ante un nativeCallback que lanza,
    // deja el promise de addListener PENDIENTE para siempre (no se rechaza),
    // por lo que el rechazo no es reproducible a través del runtime proxy.
    // Se prueba la guardia directamente con un plugin fake que rechaza.
    const llamadas = [];
    const window = baseWindow();
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      isNativePlatform: () => true,
      registerPlugin: () => ({
        addListener: async () => { throw new Error('suscripción falló'); },
        downloadAndInstall: async () => { llamadas.push('downloadAndInstall'); return { status: 'ok' }; }
      })
    };
    cargar('js/componentes/update-installer.js', window);

    const resultado = await window.updateInstaller.descargarEInstalar(
      { apkUrl: 'https://github.com/Heater64/FormulariosWeb/releases/download/v1.0.11/x.apk' },
      () => {}
    );
    expect(resultado).toEqual({ status: 'ok' });
    expect(llamadas).toContain('downloadAndInstall');
  });

  test('propaga el código de error del plugin nativo (para que el diálogo lo muestre)', async () => {
    const window = baseWindow();
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      isNativePlatform: () => true,
      registerPlugin: () => ({
        downloadAndInstall: async () => {
          const e = new Error('No se pudo preparar el almacenamiento temporal.');
          e.code = 'STORAGE_ERROR';
          throw e;
        }
      })
    };
    cargar('js/componentes/update-installer.js', window);

    await expect(window.updateInstaller.descargarEInstalar({ apkUrl: 'https://github.com/x/y.apk' }, () => {}))
      .rejects.toMatchObject({ code: 'STORAGE_ERROR' });
  });
});

describe('updateInstaller.obtenerVersionInstalada()', () => {
  test('devuelve null fuera de Android (sin puente nativo)', async () => {
    const window = cargar('js/componentes/update-installer.js', baseWindow());
    expect(await window.updateInstaller.obtenerVersionInstalada()).toBe(null);
  });

  test('devuelve la versión REAL del sistema en Android', async () => {
    const window = baseWindow();
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      Plugins: { UpdateInstaller: {} },
      PluginHeaders: [{
        name: 'UpdateInstaller',
        methods: [{ name: 'getInstalledVersion', rtype: 'promise' }]
      }],
      nativePromise: async (plugin, method) => {
        if (method === 'getInstalledVersion') return { versionName: '1.0.9', versionCode: 9 };
        return { status: 'ok' };
      },
      nativeCallback: () => {},
      addListener: () => ({ remove: async () => {} }),
      logJs: () => {},
      triggerEvent: () => {}
    };
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);
    expect(await window.updateInstaller.obtenerVersionInstalada()).toEqual({ version: '1.0.9', versionCode: 9 });
  });

  test('devuelve null si la respuesta del sistema no es válida', async () => {
    const window = baseWindow();
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      Plugins: { UpdateInstaller: {} },
      PluginHeaders: [{
        name: 'UpdateInstaller',
        methods: [{ name: 'getInstalledVersion', rtype: 'promise' }]
      }],
      nativePromise: async () => ({ status: 'ok' }),
      nativeCallback: () => {},
      addListener: () => ({ remove: async () => {} }),
      logJs: () => {},
      triggerEvent: () => {}
    };
    cargarRuntime(window);
    cargar('js/componentes/update-installer.js', window);
    expect(await window.updateInstaller.obtenerVersionInstalada()).toBe(null);
  });
});

describe('orden de scripts en el build (dist/index.html)', () => {
  const distIndex = join(srcDir, 'dist/index.html');
  const skip = !existsSync(distIndex)
    ? 'dist/index.html no existe (ejecuta npm run build)'
    : false;

  test('el build ya no carga update-installer.js (APK en pausa)', { skip }, () => {
    const html = readFileSync(distIndex, 'utf8');
    expect(html.indexOf('js/vendor/capacitor.js')).toBeGreaterThanOrEqual(0);
    expect(html).not.toContain('js/componentes/update-installer.js');
  });

  test('el runtime va dentro del <head> como primer script defer', { skip }, () => {
    const html = readFileSync(distIndex, 'utf8');
    const headClose = html.indexOf('</head>');
    const capPos = html.indexOf('js/vendor/capacitor.js');
    expect(capPos).toBeGreaterThanOrEqual(0);
    expect(capPos).toBeLessThan(headClose);
  });

  test('el build genera la versión para la UI como archivo externo, sin exigir URL de actualización de APK', { skip }, () => {
    // La versión vive en js/core/version.js (archivo externo): la CSP de
    // producción no permite scripts inline, así que inyectarla como <script>
    // incrustado haría que __FB_APP_VERSION__ quedara undefined.
    const html = readFileSync(distIndex, 'utf8');
    expect(html).toContain('js/core/version.js');
    expect(html).not.toContain('<script>window.__FB_APP_VERSION__');
    const versionJsPath = join(srcDir, 'dist/js/core/version.js');
    if (existsSync(versionJsPath)) {
      const versionJs = readFileSync(versionJsPath, 'utf8');
      expect(versionJs).toContain('__FB_APP_VERSION__');
      expect(versionJs).not.toMatch(/__FB_UPDATE_MANIFEST_URL__="https?:\/\//);
    }
  });
});
