import { defineConfig } from 'vite';
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { transform } from 'esbuild';

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

function readAndroidVersionCode() {
  const source = join(process.cwd(), 'android/version-code.properties');
  const contents = readFileSync(source, 'utf8');
  const match = contents.match(/^versionCode=(\d+)\s*$/m);
  if (!match || Number(match[1]) < 1) {
    throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
  }
  return Number(match[1]);
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

function copyAppStaticFiles() {
  const dirs = ['js', 'css', 'data', 'assets/iconos', 'assets/capturas'];      // manifest.json, sw.js y offline.html viven en public/ (publicDir de Vite)
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
      const pkgVersion = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).version || '0.0.0';
      const versionCode = readAndroidVersionCode();
      const versionJs = `window.__FB_APP_VERSION__=${JSON.stringify({ version: pkgVersion, versionCode })};window.__FB_UPDATE_MANIFEST_URL__=${JSON.stringify(process.env.VITE_UPDATE_MANIFEST_URL || '')};`;
      writeFileSync(versionJsDestino, versionJs, 'utf8');

      const distIndexPath = join(distRoot, 'index.html');
      if (!existsSync(distIndexPath)) return;

      for (const file of listarArchivos(join(distRoot, 'js'))) {
        if (file.endsWith('.js')) await minificarJs(file);
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
function servirLegalesDev() {
  const rootDir = process.cwd();
  return {
    name: 'servir-legales-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Las páginas legales se abren con ?volver=<ruta> (p. ej. desde el
        // perfil de la app): hay que ignorar la query al identificar el archivo.
        const pathname = url.split('?')[0];
        const m = /^\/(privacidad|terminos|licencias|contacto|recuperar|registro|onboarding)\.html$/.exec(pathname);
        if (m) {
          const file = join(rootDir, 'public-site', m[1] + '.html');
          if (existsSync(file)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(readFileSync(file));
            return;
          }
        }
        // JS que cargan esas páginas (theme, contacto, legal y login)
        if (/^\/(theme|legal|contacto|login|recuperar|registro|onboarding)\.js$/.test(pathname)) {
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
  plugins: [injectRuntimeVersion(), copyAppStaticFiles(), servirLegalesDev()]
});
