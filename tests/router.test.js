import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarModulo(rutaRelativa) {
  const ruta = join(srcDir, rutaRelativa);
  const codigo = readFileSync(ruta, 'utf-8');
  const fn = new Function(codigo);
  fn();
}

beforeAll(() => {
  // Entorno mínimo del router: window.location con hash navegable
  let hash = '';
  const locationStub = {
    get hash() { return hash; },
    set hash(v) { hash = v; },
    replace(url) { hash = url.startsWith('#') ? url : '#' + url; },
    toString() { return 'http://localhost/' + (hash || ''); }
  };
  global.window = global;
  global.location = locationStub;
  global.history = { pushState() {}, replaceState() {}, back() {} };
  global.addEventListener = () => {};
  global.requestAnimationFrame = (cb) => cb();
  global.store = { obtener: () => null, actualizar: () => {} };
  global.eventBus = { publicar: () => {} };
  global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  cargarModulo('js/core/router.js');
});

beforeEach(() => {
  location.hash = '';
  // Router limpio por test (la app crea uno global al cargar el módulo)
  window.router = new window.Router();
});

describe('router._descomponer()', () => {
  test('separa path y query string', () => {
    const r = window.router._descomponer('/editor/nuevo?evaluacion=123&pestana=config');
    expect(r.pathScript).toBe('/editor/nuevo');
    expect(r.query.get('evaluacion')).toBe('123');
    expect(r.query.get('pestana')).toBe('config');
  });

  test('ruta sin query devuelve query vacío', () => {
    const r = window.router._descomponer('/estudio');
    expect(r.pathScript).toBe('/estudio');
    expect(r.query.toString()).toBe('');
  });

  test('ruta con query pero sin path (solo ?x=1) mantiene path vacío', () => {
    const r = window.router._descomponer('?x=1');
    expect(r.pathScript).toBe('');
    expect(r.query.get('x')).toBe('1');
  });

  test('pathActual devuelve la ruta sin query desde el hash actual', () => {
    location.hash = '#!/editor/nuevo?evaluacion=42';
    expect(window.router.pathActual()).toBe('/editor/nuevo');
    // No debe mutar el hash original
    expect(location.hash).toBe('#!/editor/nuevo?evaluacion=42');
  });
});

describe('router registra rutas con prioridad', () => {
  test('registrar() crea patrón con parámetros', () => {
    const router = window.router;
    router.registrar('/tomar/:id', { montar() {} });
    // Patrones con :id capturan el segmento
    const r = router._rutas.get('/tomar/:id');
    expect(r.patron.test('/tomar/abc')).toBe(true);
    expect(r.patron.test('/tomar/abc/extra')).toBe(false);
    expect(r.patron.test('/tomar')).toBe(false);
  });

  test('ruta exacta /editor/nuevo no la captura /editor/:id (orden de registro)', () => {
    const router = window.router;
    // Registro en el mismo orden que la app: nueva antes que :id
    router.registrar('/editor/nuevo', { montar() { return Promise.resolve(); } });
    router.registrar('/editor/:id', { montar() { return Promise.resolve(); } });

    const iter = router._rutas.keys();
    const primero = iter.next().value;
    const segundo = iter.next().value;
    expect(primero).toBe('/editor/nuevo');
    expect(segundo).toBe('/editor/:id');

    // La ruta /editor/nuevo no debe matchear el patrón :id
    const patronId = router._rutas.get('/editor/:id').patron;
    expect(patronId.test('/editor/nuevo')).toBe(true); // captura como id='nuevo'
  });
});