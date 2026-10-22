import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildIdCorto,
  calcularIdentidad,
  crearBuildId,
  estamparManifiesto,
  estamparServiceWorker,
  leerVersionCode,
  versionFull
} from '../scripts/lib/build-identity.mjs';

const packageData = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const swText = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const versionCodeProperties = readFileSync(new URL('../android/version-code.properties', import.meta.url), 'utf8');

const leer = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function identidadDePrueba(overrides = {}) {
  return calcularIdentidad({
    packageJson: { version: '1.2.3' },
    versionCode: 7,
    env: { FB_COMMIT: 'abc1234' },
    fecha: new Date('2026-10-22T11:46:12.000Z'),
    ...overrides
  });
}

describe('identidad de build', () => {
  test('cada build tiene un identificador propio y con formato válido', () => {
    const uno = crearBuildId({ commit: 'abc1234', fecha: new Date('2026-10-22T11:46:12.000Z') });
    const otro = crearBuildId({ commit: 'abc1234', fecha: new Date('2026-10-22T11:46:12.000Z') });
    expect(uno).not.toBe(otro); // el sufijo aleatorio evita colisiones
    expect(uno).toMatch(/^abc1234-20261022-114612-[0-9a-f]{4}$/);
    expect(otro).toMatch(/^[0-9A-Za-z.-]{1,64}$/);
  });

  test('la versión completa es SemVer con metadatos de build', () => {
    const identidad = identidadDePrueba();
    expect(identidad.version).toBe('1.2.3');
    expect(identidad.versionFull).toBe(versionFull('1.2.3', identidad.buildId));
    expect(identidad.versionFull).toMatch(/^1\.2\.3\+[0-9A-Za-z.-]+$/);
    expect(identidad.buildCorto).toBe(buildIdCorto(identidad.buildId));
    expect(identidad.buildCorto).toBe('abc1234-1146');
    expect(identidad.label).toBe('1.2.3 · abc1234-1146');
  });

  test('reutiliza la identidad si el proceso padre ya la calculó', () => {
    const identidad = identidadDePrueba({
      env: {
        FB_COMMIT: 'abc1234',
        FB_BUILD_ID: 'abc1234-20260101-000000-0000',
        FB_BUILT_AT: '2026-01-01T00:00:00.000Z'
      }
    });
    expect(identidad.buildId).toBe('abc1234-20260101-000000-0000');
    expect(identidad.builtAt).toBe('2026-01-01T00:00:00.000Z');
  });

  test('rechaza una versión que no es SemVer', () => {
    expect(() => identidadDePrueba({ packageJson: { version: '1.2' } })).toThrow();
  });

  test('lee el versionCode de android/version-code.properties', () => {
    expect(leerVersionCode(versionCodeProperties)).toBeGreaterThan(0);
    expect(() => leerVersionCode('versionCode=0\n')).toThrow();
  });
});

describe('estampado de los artefactos', () => {
  test('el service worker recibe una caché única por build', () => {
    const identidad = identidadDePrueba();
    const estampado = estamparServiceWorker(swText, identidad);
    expect(estampado).toContain(`const CACHE_VERSION = 'v${identidad.versionFull}';`);
    // Estampar dos veces no cambia nada (idempotente).
    expect(estamparServiceWorker(estampado, identidad)).toBe(estampado);
  });

  test('dos builds distintos producen nombres de caché distintos', () => {
    const uno = estamparServiceWorker(swText, identidadDePrueba());
    const otro = estamparServiceWorker(swText, identidadDePrueba({
      env: { FB_COMMIT: 'abc1234', FB_BUILD_ID: 'abc1234-20261022-114612-ffff' }
    }));
    expect(uno).not.toBe(otro);
  });

  test('el estampado no toca el resto del service worker', () => {
    const estampado = estamparServiceWorker(swText, identidadDePrueba());
    expect(estampado).toContain('self.addEventListener(\'activate\'');
    expect(estampado.replace(/const CACHE_VERSION = [^\n]+\n/, '')).toBe(swText.replace(/const CACHE_VERSION = [^\n]+\n/, ''));
  });

  test('el service worker sin estampar declara CACHE_VERSION', () => {
    expect(swText).toMatch(/const CACHE_VERSION = 'v[^']+'/);
    expect(() => estamparServiceWorker('sin cache version', identidadDePrueba())).toThrow();
  });

  test('el manifiesto público conserva las notas y añade la identidad del build', () => {
    const identidad = identidadDePrueba();
    const estampado = estamparManifiesto(manifest, identidad);
    expect(estampado.version).toBe('1.2.3');
    expect(estampado.buildId).toBe(identidad.buildId);
    expect(estampado.builtAt).toBe(identidad.builtAt);
    expect(estampado.releaseNotes).toEqual(manifest.releaseNotes);
  });
});

describe('invariantes del repositorio (sin deriva de versión)', () => {
  test('el CACHE_VERSION del repo coincide con la versión de package.json', () => {
    const match = swText.match(/const CACHE_VERSION = 'v([^'+]+)/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe(packageData.version);
  });

  test('el manifiesto público de versión coincide con package.json', () => {
    expect(manifest.version).toBe(packageData.version);
  });

  test('Vercel obliga a revalidar JS y CSS (no se quedan cacheados)', () => {
    const reglas = vercel.headers || [];
    const cacheDe = (source) => {
      const regla = reglas.find((item) => item.source === source);
      return regla?.headers?.find((header) => header.key === 'Cache-Control')?.value || '';
    };
    for (const source of ['/js/(.*)', '/css/(.*)', '/app/js/(.*)', '/app/css/(.*)']) {
      expect(cacheDe(source)).toContain('must-revalidate');
    }
    // El service worker y el manifiesto de versión tampoco se cachean.
    expect(cacheDe('/sw.js')).toContain('no-cache');
    expect(cacheDe('/version.json')).toContain('no-cache');
  });

  test('todos los caminos de build estantan la identidad', () => {
    for (const archivo of ['vite.config.js', 'scripts/build-public.mjs', 'scripts/build-sites.mjs']) {
      const texto = leer(archivo);
      expect(texto).toContain('estamparServiceWorker');
      expect(texto).toContain('estamparManifiesto');
    }
  });
});
