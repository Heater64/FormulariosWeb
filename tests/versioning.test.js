import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { construirManifest, parsearNotas } from '../scripts/generate-version-manifest.mjs';

const packageData = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const androidVersionProperties = readFileSync(new URL('../android/version-code.properties', import.meta.url), 'utf8');
const androidBuild = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');

function androidVersionCode() {
  const match = androidVersionProperties.match(/^versionCode=(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

const base = {
  packageJson: { version: '1.0.10' },
  versionCodeProperties: 'versionCode=10\n',
  manifestActual: { minimumVersion: '1.0.4', minimumVersionCode: 4, mandatory: true },
  repo: 'Heater64/FormulariosWeb',
  sha256: 'ab'.repeat(32),
  sizeBytes: 5152868,
  notasTexto: '# comentario\n- Nota uno\n* Nota dos\n\nOtra nota'
};

describe('versionado de la aplicación', () => {
  describe('generarManifest (workflow Android Release)', () => {
    test('genera un manifiesto completo con URLs derivadas del repo', () => {
      const m = construirManifest(base);
      expect(m.version).toBe('1.0.10');
      expect(m.versionCode).toBe(10);
      expect(m.apkUrl).toBe('https://github.com/Heater64/FormulariosWeb/releases/download/v1.0.10/formsbiblicos.apk');
      expect(m.releaseUrl).toBe('https://github.com/Heater64/FormulariosWeb/releases/tag/v1.0.10');
      expect(m.sha256).toBe('ab'.repeat(32));
      expect(m.sizeBytes).toBe(5152868);
      expect(Number.isNaN(Date.parse(m.publishedAt))).toBe(false);
    });

    test('conserva minimumVersion/minimumVersionCode/mandatory del manifiesto actual', () => {
      const m = construirManifest(base);
      expect(m.minimumVersion).toBe('1.0.4');
      expect(m.minimumVersionCode).toBe(4);
      expect(m.mandatory).toBe(true);
    });

    test('parsea solo líneas de lista; ignora comentarios, prosa y líneas vacías', () => {
      const m = construirManifest(base);
      // 'Otra nota' es prosa (sin prefijo de lista) y debe ignorarse.
      expect(m.releaseNotes).toEqual(['Nota uno', 'Nota dos']);
      expect(parsearNotas('# solo comentarios\n\n')).toEqual([]);
      expect(parsearNotas('Prosa sin prefijo\n- Válida')).toEqual(['Válida']);
    });

    test('rechaza entradas inválidas (no publica un manifiesto roto)', () => {
      expect(() => construirManifest({ ...base, sha256: 'no-hex' })).toThrow();
      expect(() => construirManifest({ ...base, sizeBytes: 0 })).toThrow();
      expect(() => construirManifest({ ...base, packageJson: { version: '1.0' } })).toThrow();
      expect(() => construirManifest({ ...base, notasTexto: '# nada\n' })).toThrow();
      expect(() => construirManifest({ ...base, manifestActual: { minimumVersion: 'x', minimumVersionCode: 4, mandatory: true } })).toThrow();
      expect(() => construirManifest({ ...base, repo: 'mal' })).toThrow();
    });

    test('el manifiesto generado pasa el validador real de updateService', () => {
      const m = construirManifest(base);
      global.window = global;
      new Function(readFileSync(new URL('../js/services/update-service.js', import.meta.url), 'utf8'))();
      try {
        const resultado = window.updateService.validateManifest(m);
        expect(resultado.ok).toBe(true);
      } finally {
        delete global.window;
      }
    });
  });

  test('package.json contiene únicamente el SemVer estándar', () => {
    expect(packageData.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.hasOwn(packageData, 'versionCode')).toBe(false);
  });

  test('version-code.properties contiene un entero Android positivo', () => {
    expect(androidVersionCode()).toBeGreaterThan(0);
  });

  test('Gradle usa las dos fuentes separadas', () => {
    expect(androidBuild).toContain('file("../../package.json")');
    expect(androidBuild).toContain('file("../version-code.properties")');
    expect(androidBuild).toContain('versionName packageJson.version');
    expect(androidBuild).toContain('versionCode androidVersionCode');
  });
});
