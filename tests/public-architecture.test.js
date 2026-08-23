import { describe, expect, test } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicHtml = read('public-site/index.html');
const publicLoginJs = read('public-site/login.js');
const publicRecoveryHtml = read('public-site/recuperar.html');
const publicRegistrationHtml = read('public-site/registro.html');
const publicRegistrationJs = read('public-site/registro.js');
const publicOnboardingHtml = read('public-site/onboarding.html');
const publicOnboardingJs = read('public-site/onboarding.js');
const publicRecoveryJs = read('public-site/recuperar.js');
const authRepository = read('js/datos/auth-repository.js');
const publicThemeJs = read('public-site/theme.js');
const appHtml = read('index.html');
const manifest = JSON.parse(read('public/manifest.json'));
const publicManifest = JSON.parse(read('public-site/manifest.json'));
const sw = read('public/sw.js');
const swRegister = read('js/core/sw-register.js');

describe('arquitectura pública y PWA (APK en pausa)', () => {
  test('las cabeceras de sección conservan título y campana en una sola fila', () => {
    const headerCss = read('css/06-utilidades/_estilos-inline.css');
    const memCss = read('css/05-componentes/_memorizacion-juego.css');
    const adminCss = read('css/05-componentes/_admin-panel.css');
    const memView = read('js/vistas/vista-memorizacion.js');
    const adminCommon = read('js/vistas/admin/admin-comunes.js');
    expect(headerCss).toContain('flex-wrap: nowrap;');
    expect(headerCss).toContain('flex-direction: column;');
    expect(headerCss).not.toContain('.vista-cabecera {\n    align-items: stretch;');
    expect(headerCss).toContain('text-overflow: ellipsis;');
    expect(memCss).toContain('.mem-gizmo-cabecera');
    expect(memView).toContain('mem-gizmo-cabecera__acciones vista-cabecera__acciones');
    expect(adminCss).toContain('.admin-panel-cabecera__acciones');
    expect(adminCommon).toContain('campanaNotificaciones.renderCampana()');
  });

  test('la app es instalable como PWA (manifest + service worker)', () => {
    expect(appHtml).toContain('rel="manifest"');
    expect(appHtml).toContain('apple-mobile-web-app-capable');
    // El registro del SW vive en un archivo EXTERNO (js/core/sw-register.js):
    // la CSP de producción no permite scripts inline, así que no puede estar
    // incrustado en index.html (antes se bloqueaba y la PWA quedaba rota).
    expect(appHtml).toContain('js/core/sw-register.js');
    expect(read('js/core/sw-register.js')).toContain('serviceWorker.register');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('fetch'");
    expect(swRegister).toContain("serviceWorker.register('/sw.js', { scope: '/' })");
  });

  test('el login público queda dentro del mismo scope standalone que /app', () => {
    expect(publicHtml).toContain('<link rel="manifest" href="/manifest.json">');
    expect(publicManifest.start_url).toBe('/');
    expect(publicManifest.scope).toBe('/');
    expect(publicManifest.display).toBe('standalone');
    expect(publicManifest.icons.length).toBeGreaterThan(0);
  });

  test('la app no carga el sistema de actualización de APK (pausado)', () => {
    expect(appHtml).not.toContain('js/services/update-service.js');
    expect(appHtml).not.toContain('js/componentes/update-installer.js');
    expect(appHtml).not.toContain('js/componentes/update-dialog.js');
  });

  test('la landing pública ya no ofrece descarga de APK', () => {
    expect(publicHtml).not.toMatch(/\.apk/i);
    expect(publicHtml).not.toContain('Descargar aplicación Android');
    expect(publicLoginJs).toContain("window.location.href = '/app/'");
  });

  test('la landing cumple la CSP sin handlers inline', () => {
    expect(publicHtml).not.toContain('<script>');
    expect(publicHtml).not.toContain('onclick=');
    expect(publicHtml).not.toContain('onsubmit=');
    expect(publicHtml).toContain('./login.js');
    expect(publicHtml).toContain('recuperar.html');
    expect(publicHtml).toContain('registro.html');
    expect(publicRegistrationHtml).toContain('./registro.js');
    expect(publicRegistrationHtml).not.toContain('<script>');
    expect(publicRegistrationJs).toContain('registrarResponsable');
    expect(publicOnboardingHtml).toContain('./onboarding.js');
    expect(publicOnboardingHtml).not.toContain('<script>');
    expect(publicOnboardingJs).toContain('crearInstitucionYClase');
    expect(publicRecoveryHtml).toContain('./recuperar.js');
    expect(publicRecoveryHtml).not.toContain('<script>');
    expect(publicRecoveryHtml).not.toContain('onsubmit=');
    expect(publicRecoveryJs).toContain('PASSWORD_RECOVERY');
    expect(authRepository).toContain('resetPasswordForEmail');
    expect(publicThemeJs).toContain('localStorage');
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

  test('existe una página 404 personalizada, CSP-safe y con enlace de vuelta', () => {
    const p404 = read('public-site/404.html');
    expect(p404).toContain('404');
    expect(p404).not.toContain('<script>');
    expect(p404).not.toContain('onclick=');
    expect(p404).toContain('./theme.js');
    expect(p404).toContain('href="/"');
    expect(p404).toContain('noindex');
  });

  test('robots.txt permite la landing y bloquea app y tarjetas OG', () => {
    const robots = read('public-site/robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /app/');
    expect(robots).toContain('Disallow: /o/');
    expect(robots).toContain('Sitemap: https://formularios-web-flax.vercel.app/sitemap.xml');
  });

  test('sitemap.xml lista todas las páginas públicas indexables', () => {
    const sitemap = read('public-site/sitemap.xml');
    expect(sitemap).toContain('https://formularios-web-flax.vercel.app/');
    expect(sitemap).toContain('privacidad.html');
    expect(sitemap).toContain('terminos.html');
    expect(sitemap).toContain('licencias.html');
    expect(sitemap).toContain('contacto.html');
  });

  test('las páginas legales cumplen la CSP (sin scripts inline) y enlazan bien', () => {
    for (const pagina of ['privacidad.html', 'terminos.html', 'licencias.html', 'contacto.html', 'recuperar.html', 'registro.html', 'onboarding.html']) {
      const html = read(`public-site/${pagina}`);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onclick=');
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('name="robots"');
      expect(html).toContain('href="index.html"');
      expect(html).toContain('src="./theme.js"');
    }
    expect(read('public-site/contacto.html')).toContain('src="./contacto.js"');
    expect(read('public-site/contacto.html')).toContain('supabase-client.js');
    expect(read('public-site/contacto.js')).toContain("rpc('enviar_contacto'");
    expect(read('public-site/privacidad.html')).toContain('Documento pendiente de revisión jurídica');
    expect(read('public-site/terminos.html')).toContain('no admite cuentas autónomas de menores');
    expect(read('js/core/router.js')).not.toContain('onclick=');
    expect(read('js/vistas/vista-sesion-estudio.js')).not.toContain('onclick=');
    expect(read('js/vistas/vista-examen-tomar.js')).not.toContain('onclick=');
    expect(read('js/vistas/vista-capitulos.js')).not.toContain('onclick=');
    expect(read('js/vistas/vista-memorizacion.js')).not.toContain('onclick=');
    expect(read('js/vistas/admin/vista-panel-admin.js')).not.toContain('onclick=');
    expect(read('js/vistas/admin/admin-comunes.js')).not.toContain('onclick=');
  });

  test('la landing tiene canonical, meta robots y sin enlaces muertos', () => {
    expect(publicHtml).toContain('rel="canonical"');
    expect(publicHtml).toContain('name="robots"');
    expect(publicHtml).not.toContain('href="#"');
    expect(publicHtml).toContain('href="contacto.html"');
  });

  test('el router del SPA define títulos únicos por ruta', () => {
    const router = read('js/core/router.js');
    expect(router).toContain('_titulos()');
    expect(router).toContain("'/examenes': 'Exámenes — FormsBiblicos'");
    expect(router).toContain('_aplicarTitulo(rutaConfig, params)');
    expect(router).toContain('document.title = plantilla.replace');
  });

  test('el login normal está fuera del SPA: sin sesión se sale a la landing', () => {
    expect(appHtml).not.toContain('js/vistas/vista-login.js');
    const index = read('js/core/index.js');
    // Sin sesión / logout → redirige fuera de la SPA (landing en /app, login.html en dev).
    expect(index).toContain("window.location.href = enApp ? '../' : 'login.html'");
    // /login ya no es una vista propia: navegar ahí redirige al login normal.
    expect(index).toContain("router.registrar('/login', { montar: () => irAlLogin() })");
    expect(index).not.toContain("router.registrar('/login', window.vistaLogin)");
  });

  test('la landing se adapta al modo PWA instalado (pantalla de acceso limpia)', () => {
    expect(publicHtml).toContain('html.fb-pwa .hero');
    expect(publicHtml).toContain('html.fb-pwa .header { display: none; }');
    expect(publicHtml).toContain('html.fb-pwa .login-section');
    expect(publicHtml).toContain('min-height: 100dvh');
    expect(publicThemeJs).toContain('display-mode: standalone');
    expect(publicThemeJs).toContain('fb-pwa');
    expect(manifest.display_override).toEqual(['standalone']);
  });

  test('Vercel aplica caching por tipo de recurso', () => {
    const config = JSON.parse(read('vercel.json'));
    const reglas = config.headers;
    const valores = reglas.flatMap((r) => r.headers.map((h) => h.value));
    expect(valores.some((v) => v.includes('max-age=31536000, immutable'))).toBe(true);
    expect(valores.some((v) => v.includes('no-cache, must-revalidate'))).toBe(true);
    expect(valores.some((v) => v.includes('s-maxage=3600, must-revalidate'))).toBe(true);
    expect(reglas.some((r) => r.source.includes('/app/assets/'))).toBe(true);
    expect(reglas.some((r) => r.source.includes('.html'))).toBe(true);
    expect(reglas.some((r) => r.source.includes('sw.js'))).toBe(true);
    expect(reglas.some((r) => r.source.includes('og-1200x630.png'))).toBe(true);
  });
});
