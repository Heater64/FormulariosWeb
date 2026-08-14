// ============================================================================
// scripts/build-public.mjs — Despliegue público de Vercel (vercel.json)
// ============================================================================
// Produce dist-public/ con DOS productos:
//   1. Login + landing (public-site → dist-public/) — página de login con
//      auth real vía Supabase + secciones informativas.
//   2. La aplicación web (vite build, base /app/) copiada en dist-public/app/
//      para que tras el login funcione: /app → la app completa.
//
// Uso: npm run build:public   (buildCommand de vercel.json)
// ============================================================================
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distPublic = join(root, 'dist-public');
const distApp = join(root, 'dist');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  if (res.error) {
    console.error('[build-public] No se pudo ejecutar:', res.error.message);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status || 1);
}

// 1) Login + landing → dist-public/ (vite.public.config.js vacía el directorio)
console.log('[build-public] 1/4 Login + landing…');
run(process.execPath, [viteBin, 'build', '--config', 'vite.public.config.js']);

// 2) Copiar archivos estáticos necesarios para el login:
//    - JS de auth (entorno, store, eventBus, errores, supabase-client, auth-repository)
//    - Páginas legales (privacidad, terminos, contacto)
console.log('[build-public] 2/4 Archivos estáticos…');
const jsDirs = [
  { src: join(root, 'js', 'config'), dest: join(distPublic, 'js', 'config') },
  { src: join(root, 'js', 'core'), dest: join(distPublic, 'js', 'core') },
  { src: join(root, 'js', 'datos'), dest: join(distPublic, 'js', 'datos') },
];
const jsFiles = [
  join(root, 'js', 'config', 'entorno.js'),
  join(root, 'js', 'core', 'store.js'),
  join(root, 'js', 'core', 'eventBus.js'),
  join(root, 'js', 'core', 'errores.js'),
  join(root, 'js', 'datos', 'supabase-client.js'),
  join(root, 'js', 'datos', 'auth-repository.js'),
];
for (const dir of jsDirs) {
  mkdirSync(dir.dest, { recursive: true });
}
for (const file of jsFiles) {
  if (existsSync(file)) {
    const dest = file.replace(root, distPublic);
    cpSync(file, dest);
  }
}

// Copiar páginas legales
const legalPages = ['privacidad.html', 'terminos.html', 'contacto.html'];
for (const page of legalPages) {
  const src = join(root, 'public-site', page);
  if (existsSync(src)) cpSync(src, join(distPublic, page));
}

// 3) App para navegador con base /app/
console.log('[build-public] 3/4 App (base /app/)…');
run(process.execPath, [viteBin, 'build', '--base', '/app/'], {
  VITE_UPDATE_MANIFEST_URL: '/version.json',
  FB_PUBLIC_BUILD: '1'
});

// 4) Copiar la app dentro del despliegue público
console.log('[build-public] 4/4 Copiando dist → dist-public/app…');
const destino = join(distPublic, 'app');
rmSync(destino, { recursive: true, force: true });
if (existsSync(distApp)) cpSync(distApp, destino, { recursive: true });

console.log('[build-public] OK · login en dist-public/ + app en dist-public/app/');
