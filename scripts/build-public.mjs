// ============================================================================
// scripts/build-public.mjs — Despliegue público de Vercel (vercel.json)
// ============================================================================
// Produce dist-public/ con DOS productos:
//   1. Landing (public-site → dist-public/) — presentación + descarga de la
//      APK + botón "Usar en el navegador" que enlaza a /app.
//   2. La aplicación web (vite build, base /app/) copiada en dist-public/app/
//      para que el botón del navegador funcione: /app → login (y misma app
//      que la APK, con la misma cuenta y datos de Supabase).
//
// Uso: npm run build:public   (buildCommand de vercel.json)
// ============================================================================
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
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

// 1) Landing → dist-public/ (vite.public.config.js vacía el directorio)
console.log('[build-public] 1/3 Landing…');
run(process.execPath, [viteBin, 'build', '--config', 'vite.public.config.js']);

// 2) App para navegador con base /app/ (la APK la compila el workflow de
//    release con su propia base './'; aquí se sirve bajo /app en Vercel).
//    VITE_UPDATE_MANIFEST_URL relativo a la raíz: en la web la comprobación
//    automática de actualización está desactivada (solo Android); el botón
//    manual de Perfil consulta version.json y muestra el diálogo si procede.
console.log('[build-public] 2/3 App (base /app/)…');
run(process.execPath, [viteBin, 'build', '--base', '/app/'], {
  VITE_UPDATE_MANIFEST_URL: '/version.json'
});

// 3) Copiar la app dentro del despliegue público
console.log('[build-public] 3/3 Copiando dist → dist-public/app…');
const destino = join(distPublic, 'app');
rmSync(destino, { recursive: true, force: true });
if (existsSync(distApp)) cpSync(distApp, destino, { recursive: true });

console.log('[build-public] OK · landing en dist-public/ + app en dist-public/app/');
