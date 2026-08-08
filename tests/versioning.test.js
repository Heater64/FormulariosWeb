import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const packageData = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const androidVersionProperties = readFileSync(new URL('../android/version-code.properties', import.meta.url), 'utf8');
const androidBuild = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');

function androidVersionCode() {
  const match = androidVersionProperties.match(/^versionCode=(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

describe('versionado de la aplicación', () => {
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
