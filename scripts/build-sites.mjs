// ============================================================================
// scripts/build-sites.mjs — build del sitio para Freebuff Sites
// ============================================================================
// Genera `freebuff-sites-build/` con lo que necesita `sites_deploy`:
//
//   manifest.json  descripción del bundle (entrypoint, assets, SPA)
//   worker.js      sirve los assets y fija las cabeceras de caché
//   assets/        el sitio construido (dist/)
//
// Todo el build lleva la MISMA identidad (scripts/lib/build-identity.mjs):
// el service worker va con un CACHE_VERSION único por build, así que al
// desplegar, los clientes limpian la caché anterior y no sirven el bundle
// viejo. El worker añade además las cabeceras de caché que evita que el
// CDN/navegador guarden JS, CSS, HTML o el service worker.
//
// Uso: npm run build:sites
// ============================================================================
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calcularIdentidad,
  entornoIdentidad,
  estamparManifiesto,
  estamparServiceWorker,
  leerVersionCode
} from './lib/build-identity.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const salida = join(root, 'freebuff-sites-build');
const assets = join(salida, 'assets');
const dist = join(root, 'dist');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const packageData = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const versionCode = leerVersionCode(readFileSync(join(root, 'android/version-code.properties'), 'utf8'));
const identidad = calcularIdentidad({ packageJson: packageData, versionCode });

// El worker sirve los assets y decide la caché:
//   · /assets/... con hash en el nombre → inmutable (el nombre ya cambia).
//   · el resto (HTML, JS, CSS, sw.js, version.json) → must-revalidate: el
//     navegador siempre pregunta al servidor y recibe la versión nueva.
const WORKER = `// Worker de Freebuff Sites para FormsBiblicos.
// Generado por scripts/build-sites.mjs: no editar a mano.
const HASHED = /\\/assets\\/[^/]+-[A-Za-z0-9_-]{6,}\\.(js|css|png|svg|woff2?|jpg|jpeg|gif|webp|ico)$/;

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    // Respuestas sin cuerpo (304, 204) y redirecciones se devuelven tal cual.
    if (response.status === 304 || response.status === 204 || (response.status >= 300 && response.status < 400)) {
      return response;
    }
    const headers = new Headers(response.headers);
    const pathname = new URL(request.url).pathname;
    if (HASHED.test(pathname)) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
`;

// 1) Build de la app con la identidad propagada por entorno.
console.log(`[build-sites] 1/3 Build de la app · ${identidad.buildId}…`);
const res = spawnSync(process.execPath, [viteBin, 'build'], {
  stdio: 'inherit',
  env: entornoIdentidad(identidad)
});
if (res.error) {
  console.error('[build-sites] No se pudo ejecutar el build:', res.error.message);
  process.exit(1);
}
if (res.status !== 0) process.exit(res.status || 1);

// 2) Copia de los assets.
console.log('[build-sites] 2/3 Copiando dist → freebuff-sites-build/assets…');
rmSync(assets, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
cpSync(dist, assets, { recursive: true });

// El service worker y el manifiesto de versión se estamparían en el build de
// Vite, pero se vuelven a estampar aquí: el worker de Sites es el que se
// despliega y no debe quedarse con la caché anterior.
const swDestino = join(assets, 'sw.js');
if (existsSync(swDestino)) {
  writeFileSync(swDestino, estamparServiceWorker(readFileSync(swDestino, 'utf8'), identidad), 'utf8');
}
const manifiestoDestino = join(assets, 'version.json');
if (existsSync(manifiestoDestino)) {
  const manifiesto = JSON.parse(readFileSync(manifiestoDestino, 'utf8'));
  writeFileSync(manifiestoDestino, `${JSON.stringify(estamparManifiesto(manifiesto, identidad), null, 2)}\n`, 'utf8');
}

// 3) Worker + manifest para sites_deploy.
console.log('[build-sites] 3/3 Escribiendo worker.js y manifest.json…');
writeFileSync(join(salida, 'worker.js'), WORKER, 'utf8');
writeFileSync(join(salida, 'manifest.json'), `${JSON.stringify({
  entrypoint: 'worker.js',
  compatibilityDate: '2026-10-01',
  compatibilityFlags: [],
  modules: [{ name: 'worker.js', type: 'esm', path: 'worker.js' }],
  assetsDirectory: 'assets',
  spa: true
}, null, 2)}\n`, 'utf8');
writeFileSync(join(salida, '.freebuff-generated'), 'Freebuff Sites build output\n', 'utf8');

console.log(`[build-sites] OK · freebuff-sites-build/ listo · build ${identidad.buildId} · ${identidad.versionFull}`);
