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
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
      const version = pkg.version || '0.0.0';
      const versionCode = readAndroidVersionCode();
      const updateManifestUrl = process.env.VITE_UPDATE_MANIFEST_URL || '';
      const runtime = `<script src="./js/vendor/capacitor.js" defer></script><script>window.__FB_APP_VERSION__=${JSON.stringify({ version, versionCode })};window.__FB_UPDATE_MANIFEST_URL__=${JSON.stringify(updateManifestUrl)};</script>`;
      return html.replace('</head>', `${runtime}\n</head>`);
    }
  };
}

function copyAppStaticFiles() {
  const dirs = ['js', 'css', 'data', 'assets/iconos'];
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

      console.log(`[build] OK · app Android local · ${scripts.length} JS · sin Service Worker`);
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 3000
  },
  plugins: [injectRuntimeVersion(), copyAppStaticFiles()]
});
