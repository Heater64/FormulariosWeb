import { defineConfig } from 'vite';
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { transform } from 'esbuild';
import {
  calcularIdentidad,
  contenidoVersionJs,
  estamparManifiesto,
  estamparServiceWorker,
  etiquetaVersion,
  leerVersionCode
} from './scripts/lib/build-identity.mjs';

function listarArchivos(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) out.push(...listarArchivos(ruta));
    else out.push(ruta);
  }
  return out;
}

async function minificarJs(ruta) {
  const code = readFileSync(ruta, 'utf8');
  try {
    const res = await transform(code, { minify: true, target: 'es2020', loader: 'js' });
    writeFileSync(ruta, res.code);
  } catch (error) {
    console.warn(`[build] No se pudo minificar ${ruta}: ${error.message}`);
  }
}

// Las hojas por sección ya no las empaqueta Vite (no están en el <head>): el
// router las pide en tiempo de ejecución desde dist/css/. Sin esto viajarían
// sin minificar, que es justo lo que la división pretendía evitar.
async function minificarCss(ruta) {
  const code = readFileSync(ruta, 'utf8');
  try {
    const res = await transform(code, { minify: true, loader: 'css' });
    writeFileSync(ruta, res.code);
  } catch (error) {
    console.warn(`[build] No se pudo minificar ${ruta}: ${error.message}`);
  }
}

function readAndroidVersionCode() {
  const source = join(process.cwd(), 'android/version-code.properties');
  return leerVersionCode(readFileSync(source, 'utf8'));
}

// Identidad del build: versión de release + buildId único. Si el proceso
// padre ya la calculó (build:public, build de Sites), la reutiliza vía
// entorno para que todos los artefactos de un despliegue coincidan.
function identidadDelBuild() {
  const packageData = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  return calcularIdentidad({ packageJson: packageData, versionCode: readAndroidVersionCode() });
}

// Estampa la identidad del build en el service worker y en el manifiesto
// público de versión: así cada despliegue deja obsoleta la caché anterior
// (nombre de caché único) y el cliente ve qué build está sirviendo.
function estamparArtefactosDeVersion(distRoot, identidad) {
  const swPath = join(distRoot, 'sw.js');
  if (existsSync(swPath)) {
    writeFileSync(swPath, estamparServiceWorker(readFileSync(swPath, 'utf8'), identidad), 'utf8');
  }
  const manifestPath = join(distRoot, 'version.json');
  if (existsSync(manifestPath)) {
    const manifiesto = JSON.parse(readFileSync(manifestPath, 'utf8'));
    writeFileSync(manifestPath, `${JSON.stringify(estamparManifiesto(manifiesto, identidad), null, 2)}\n`, 'utf8');
  }
}

function injectRuntimeVersion() {
  return {
    name: 'inject-runtime-version',
    transformIndexHtml(html) {
      // APK pausada: la variable se conserva por compatibilidad, pero ya no
      // hay guard de build que la exija. La versión vive en un archivo EXTERNO
      // (js/core/version.js, generado en closeBundle): la CSP de producción no
      // permite scripts inline, así que un <script> incrustado sería bloqueado.
      const runtime = `<script src="./js/vendor/capacitor.js" defer></script><script src="./js/core/version.js" defer></script>`;
      // IMPORTANTE: el runtime de Capacitor debe ser el PRIMER script defer del
      // documento. Los scripts defer se ejecutan en orden de aparición, y
      // update-installer.js/push-notification-service.js leen root.Capacitor
      // al cargar: si el runtime va después, esas lecturas ven undefined y la
      // instalación de APK falla con "solo disponible en Android" en la app.
      return html.replace('<head>', `<head>\n    ${runtime}`);
    }
  };
}

function copyAppStaticFiles() {      const dirs = ['js', 'css', 'data', 'assets/iconos', 'assets/capturas', 'assets/fuentes', 'paginas'];      // manifest.json, sw.js y offline.html viven en public/ (publicDir de Vite)
      // y se copian a dist/ sin hash: el manifiesto PWA necesita una URL estable.
      const files = ['version.json'];

  return {
    name: 'copy-app-static-files',
    async closeBundle() {
      for (const dir of dirs) {
        const from = join(process.cwd(), dir);
        const to = join(process.cwd(), 'dist', dir);
        if (!existsSync(from)) continue;
        rmSync(to, { recursive: true, force: true });
        cpSync(from, to, { recursive: true });
      }

      for (const file of files) {
        const from = join(process.cwd(), file);
        const to = join(process.cwd(), 'dist', file);
        if (!existsSync(from)) continue;
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }

      const distRoot = join(process.cwd(), 'dist');
      const capacitorRuntimeSource = join(process.cwd(), 'node_modules/@capacitor/core/dist/capacitor.js');
      const capacitorRuntimeDestination = join(distRoot, 'js/vendor/capacitor.js');
      if (existsSync(capacitorRuntimeSource)) {
        mkdirSync(dirname(capacitorRuntimeDestination), { recursive: true });
        copyFileSync(capacitorRuntimeSource, capacitorRuntimeDestination);
      }

      // Versión de runtime en archivo externo (CSP-safe): window.__FB_APP_VERSION__
      // y window.__FB_UPDATE_MANIFEST_URL__ son scripts EXTERNOS, no inline.
      const versionJsDestino = join(distRoot, 'js/core/version.js');
      mkdirSync(dirname(versionJsDestino), { recursive: true });
      const identidad = identidadDelBuild();
      const versionJs = contenidoVersionJs(identidad, {
        __FB_UPDATE_MANIFEST_URL__: process.env.VITE_UPDATE_MANIFEST_URL || '',
        __FB_SENTRY_DSN_PUBLIC__: process.env.VITE_SENTRY_DSN_PUBLIC || '',
        __FB_SENTRY_SDK_URL__: process.env.VITE_SENTRY_SDK_URL || '',
        __FB_SENTRY_ENVIRONMENT__: process.env.VITE_SENTRY_ENVIRONMENT || 'production'
      });
      writeFileSync(versionJsDestino, versionJs, 'utf8');
      estamparArtefactosDeVersion(distRoot, identidad);
      console.log(`[build] build ${identidad.buildId} · ${identidad.versionFull}`);

      const distIndexPath = join(distRoot, 'index.html');
      if (!existsSync(distIndexPath)) return;

      for (const file of listarArchivos(join(distRoot, 'js'))) {
        if (file.endsWith('.js')) await minificarJs(file);
      }

      for (const file of listarArchivos(join(distRoot, 'css'))) {
        if (file.endsWith('.css')) await minificarCss(file);
      }

      const html = readFileSync(distIndexPath, 'utf8');
      const scripts = [
        ...[...html.matchAll(/<script[^>]*src="(\.\/)?(js\/[^"]+\.js)"[^>]*>/g)].map((match) => './' + match[2]),
        ...[...html.matchAll(/<script[^>]*src="(\.\/assets\/[^"]+\.js)"[^>]*>/g)].map((match) => match[1])
      ];

      console.log(`[build] OK · app web (PWA) · ${scripts.length} JS · manifest + Service Worker`);
    }
  };
}

// Las páginas legales (privacidad/terminos/licencias/contacto) y su JS viven
// SOLO en public-site/ (fuente única compartida por el login, la landing y el
// perfil de la app). En producción build:public las copia a la raíz de
// dist-public. En desarrollo la app (raíz del proyecto) no las despliega, así
// que este middleware las sirve desde public-site/ para que login.html y el
// SPA usen exactamente los mismos archivos que el preview de producción.
function servirPublicSite() {
  const rootDir = process.cwd();
  return {
    name: 'servir-public-site-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const pathname = url.split('?')[0];
        // Enlace individual /e/:token → página pública del examen.
        // El rewrite se aplica al HTML; examen.html y examen.js usan rutas
        // absolutas, así que los siguientes peticiones del navegador siguen
        // siendo /examen.js, /theme.js, /js/config/entorno.js, etc.
        if (/^\/e\/[^?\/]+$/.test(pathname)) {
          const file = join(rootDir, 'public-site', 'examen.html');
          if (existsSync(file)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(readFileSync(file));
            return;
          }
        }
        // El enlace también puede usarse con ?volver= para volver al SPA
        // tras entregar; ignoramos query al decidir el archivo.
        const m = /^\/(examen|privacidad|terminos|licencias|contacto|recuperar|registro|onboarding)\.html$/.exec(pathname);
        if (m) {
          const file = join(rootDir, 'public-site', m[1] + '.html');
          if (existsSync(file)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(readFileSync(file));
            return;
          }
        }
        // En desarrollo, el runtime de versión también debe existir: en
        // producción lo genera closeBundle, pero el index.html lo solicita
        // igualmente durante la auditoría y la navegación local.
        if (pathname === '/js/core/version.js') {
          const identidad = identidadDelBuild();
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(contenidoVersionJs({
            ...identidad,
            buildId: 'dev',
            buildCorto: 'dev',
            label: etiquetaVersion(identidad.version, 'dev')
          }, {
            __FB_UPDATE_MANIFEST_URL__: process.env.VITE_UPDATE_MANIFEST_URL || '',
            __FB_SENTRY_DSN_PUBLIC__: process.env.VITE_SENTRY_DSN_PUBLIC || '',
            __FB_SENTRY_SDK_URL__: process.env.VITE_SENTRY_SDK_URL || '',
            __FB_SENTRY_ENVIRONMENT__: process.env.VITE_SENTRY_ENVIRONMENT || 'development'
          }));
          return;
        }
        // JS que cargan esas páginas y el examen (theme, legal, login, examen)
        if (/^\/(theme|legal|contacto|login|examen|recuperar|registro|onboarding)\.js$/.test(pathname)) {
          const file = join(rootDir, 'public-site', url.replace(/^\//, ''));
          if (existsSync(file)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.end(readFileSync(file));
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 3000
  },
  plugins: [injectRuntimeVersion(), copyAppStaticFiles(), servirPublicSite()]
});
