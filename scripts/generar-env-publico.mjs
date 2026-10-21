// ============================================================================
// scripts/generar-env-publico.mjs — configuración pública en tiempo de build
// ============================================================================
// La PWA lee su configuración de `window.ENV` (ver js/config/entorno.js). Hasta
// ahora nadie la definía en producción, así que la clave pública VAPID llegaba
// siempre vacía y el panel nunca ofrecía activar los avisos del navegador.
//
// Este script traduce variables de entorno del despliegue (Vercel) a
// js/config/env-publico.js, que index.html carga justo antes de entorno.js.
//
// Solo claves PÚBLICAS por diseño: lo que se escriba aquí acaba en el
// navegador de cualquier visitante. Nunca añadir secretos (service_role,
// VAPID_PRIVATE_KEY, cuentas de servicio de FCM...).
//
// Se ejecuta desde los hooks de npm (predev, prebuild, prebuild:public).
// ============================================================================
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(root, 'js', 'config', 'env-publico.js');

const CLAVES = ['VAPID_PUBLIC_KEY', 'SENTRY_DSN_PUBLIC', 'SENTRY_ENVIRONMENT'];

const publico = {};
for (const clave of CLAVES) {
  const valor = process.env[clave];
  if (typeof valor === 'string' && valor.trim()) publico[clave] = valor.trim();
}

const cabecera = [
  '// GENERADO por scripts/generar-env-publico.mjs — no editar a mano.',
  '//',
  '// Valores públicos del despliegue (VAPID, Sentry...). Se sobrescribe en cada',
  '// build a partir de las variables de entorno; sin variables queda vacío y la',
  '// app usa los valores por defecto de js/config/entorno.js.',
].join('\n');

const cuerpo = Object.keys(publico).length
  ? `window.ENV = Object.assign(window.ENV || {}, ${JSON.stringify(publico, null, 2)});`
  : 'window.ENV = window.ENV || {};';

writeFileSync(destino, `${cabecera}\n${cuerpo}\n`, 'utf8');

const listado = Object.keys(publico);
console.log(`[env-publico] js/config/env-publico.js ← ${listado.length ? listado.join(', ') : 'sin valores públicos'}`);
