import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function cargarServicio() {
  global.window = global;
  const codigo = readFileSync(join(rootDir, 'js/services/update-service.js'), 'utf8');
  new Function(codigo)();
}

const manifiesto = (overrides = {}) => ({
  schemaVersion: 1,
  version: '1.1.0',
  versionCode: 2,
  minimumVersion: '1.0.0',
  minimumVersionCode: 1,
  mandatory: false,
  apkUrl: 'https://github.com/Heater64/FormulariosWeb/releases/download/v1.1.0/formsbiblicos-1.1.0.apk',
  releaseUrl: 'https://github.com/Heater64/FormulariosWeb/releases/tag/v1.1.0',
  releaseNotes: ['Nueva funcionalidad'],
  sizeBytes: 12000000,
  sha256: 'a'.repeat(64),
  publishedAt: '2026-08-08T00:00:00Z',
  ...overrides,
});

beforeAll(() => cargarServicio());

describe('updateService.compareVersions', () => {
  test('compara SemVer numéricamente y no lexicográficamente', () => {
    expect(window.updateService.compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(window.updateService.compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
  });

  test('ordena versiones prerelease antes de la versión estable', () => {
    expect(window.updateService.compareVersions('1.2.0-beta.1', '1.2.0')).toBeLessThan(0);
  });
});

describe('updateService.validateManifest', () => {
  test('acepta un manifiesto completo y normaliza sus campos', () => {
    const result = window.updateService.validateManifest(manifiesto());
    expect(result.ok).toBe(true);
    expect(result.value.releaseNotes).toEqual(['Nueva funcionalidad']);
  });

  test('acepta el version.json inicial real del proyecto', () => {
    const actual = JSON.parse(readFileSync(join(rootDir, 'version.json'), 'utf8'));
    expect(window.updateService.validateManifest(actual).ok).toBe(true);
  });

  test('rechaza JSON corrupto o campos obligatorios ausentes', () => {
    expect(window.updateService.validateManifest(null).ok).toBe(false);
    expect(window.updateService.validateManifest(manifiesto({ version: '1.0' })).ok).toBe(false);
    expect(window.updateService.validateManifest(manifiesto({ versionCode: '2' })).ok).toBe(false);
  });

  test('rechaza APK fuera de GitHub Releases o sin HTTPS', () => {
    expect(window.updateService.validateManifest(manifiesto({ apkUrl: 'https://evil.example/app.apk' })).ok).toBe(false);
    expect(window.updateService.validateManifest(manifiesto({ apkUrl: 'http://github.com/x/releases/download/v1/app.apk' })).ok).toBe(false);
    expect(window.updateService.validateManifest(manifiesto({ apkUrl: 'https://github.com/x/releases/download/v1/app.zip' })).ok).toBe(false);
    expect(window.updateService.validateManifest(manifiesto({ sha256: 'not-a-checksum' })).ok).toBe(false);
  });

  test('permite manifiesto inicial sin APK, pero no lo trata como actualización instalable', async () => {
    const result = await window.updateService.checkForUpdate({
      currentVersion: '1.0.0',
      currentVersionCode: 1,
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => new Response(JSON.stringify(manifiesto({ version: '1.1.0', versionCode: 2, apkUrl: null })), { status: 200 }),
    });
    expect(result.status).toBe('error');
    expect(result.error.code).toBe('MISSING_APK_URL');
  });

  test('verifica SHA-256 cuando Web Crypto está disponible', async () => {
    expect(await window.updateService.verifySha256('hello', '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')).toBe(true);
    expect(await window.updateService.verifySha256('hello', '0'.repeat(64))).toBe(false);
  });
});

describe('updateService.checkForUpdate', () => {
  test('no muestra actualización cuando la versión es igual', async () => {
    const result = await window.updateService.checkForUpdate({
      currentVersion: '1.1.0',
      currentVersionCode: 2,
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => new Response(JSON.stringify(manifiesto()), { status: 200 }),
    });
    expect(result.status).toBe('up_to_date');
    expect(result.updateAvailable).toBe(false);
  });

  test('detecta 1.10.0 como superior a 1.9.0', async () => {
    const result = await window.updateService.checkForUpdate({
      currentVersion: '1.9.0',
      currentVersionCode: 9,
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => new Response(JSON.stringify(manifiesto({ version: '1.10.0', versionCode: 10 })), { status: 200 }),
    });
    expect(result.status).toBe('available');
    expect(result.updateAvailable).toBe(true);
  });

  test('marca como obligatoria una versión que supera el mínimo', async () => {
    const result = await window.updateService.checkForUpdate({
      currentVersion: '1.0.0',
      currentVersionCode: 1,
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => new Response(JSON.stringify(manifiesto({ mandatory: true })), { status: 200 }),
    });
    expect(result.mandatory).toBe(true);
  });

  test('devuelve error no bloqueante si falla la red o el JSON', async () => {
    const network = await window.updateService.checkForUpdate({
      currentVersion: '1.0.0',
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => { throw new Error('offline'); },
    });
    const corrupt = await window.updateService.checkForUpdate({
      currentVersion: '1.0.0',
      manifestUrl: 'https://formsbiblicos.example/version.json',
      fetchImpl: async () => new Response('{corrupto', { status: 200 }),
    });
    expect(network.status).toBe('error');
    expect(corrupt.status).toBe('error');
    expect(network.updateAvailable).toBe(false);
  });
});
