import { describe, expect, test } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicHtml = read('public-site/index.html');
const appHtml = read('index.html');
const manifest = JSON.parse(read('public/manifest.json'));
const sw = read('public/sw.js');

describe('arquitectura pública y PWA (APK en pausa)', () => {
  test('la app es instalable como PWA (manifest + service worker)', () => {
    expect(appHtml).toContain('rel="manifest"');
    expect(appHtml).toContain('serviceWorker.register');
    expect(appHtml).toContain('apple-mobile-web-app-capable');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('fetch'");
  });

  test('la app no carga el sistema de actualización de APK (pausado)', () => {
    expect(appHtml).not.toContain('js/services/update-service.js');
    expect(appHtml).not.toContain('js/componentes/update-installer.js');
    expect(appHtml).not.toContain('js/componentes/update-dialog.js');
  });

  test('la landing pública ya no ofrece descarga de APK', () => {
    expect(publicHtml).not.toMatch(/\.apk/i);
    expect(publicHtml).not.toContain('Descargar aplicación Android');
    expect(publicHtml).toContain('/app');
  });

  test('el manifiesto referencia iconos existentes', () => {
    for (const icono of manifest.icons) {
      expect(existsSync(new URL(`../${icono.src}`, import.meta.url))).toBe(true);
    }
  });

  test('Vercel publica el build público separado (landing + app bajo /app)', () => {
    const vercel = read('vercel.json');
    expect(vercel).toContain('npm run build:public');
    expect(vercel).toContain('dist-public');
  });
});
