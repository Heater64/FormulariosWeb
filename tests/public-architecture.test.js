import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicHtml = read('public-site/index.html');
const appHtml = read('index.html');
const capacitor = JSON.parse(read('capacitor.config.json'));
const vercel = read('vercel.json');

describe('arquitectura pública y Android', () => {
  test('la landing pública ofrece la APK estable y no implementa instalación web', () => {
    expect(publicHtml).toContain('https://github.com/Heater64/FormulariosWeb/releases/latest/download/formsbiblicos.apk');
    expect(publicHtml).toContain('Descarga la aplicación Android para una experiencia completa.');
    expect(publicHtml).not.toMatch(/serviceWorker|beforeinstallprompt|rel=["']manifest|display-mode|standalone/i);
  });

  test('Capacitor carga la aplicación local desde dist', () => {
    expect(capacitor.webDir).toBe('dist');
    expect(capacitor.server).toBeUndefined();
    expect(appHtml).not.toMatch(/rel=["']manifest|serviceWorker\.register|beforeinstallprompt/i);
  });

  test('Vercel publica únicamente el build público separado', () => {
    expect(vercel).toContain('npm run build:public');
    expect(vercel).toContain('dist-public');
  });
});
