#!/usr/bin/env node
/**
 * FormsBiblicos: aislamiento multiinstitucion contra Supabase staging.
 *
 * Solo hace lecturas por defecto. Requiere dos usuarios pertenecientes a
 * instituciones distintas y un JSON de recursos creado expresamente para
 * staging. No usar tokens de produccion.
 *
 * Variables requeridas:
 *   FB_STAGING_SUPABASE_URL
 *   FB_STAGING_SUPABASE_ANON_KEY
 *   FB_STAGING_A_TOKEN
 *   FB_STAGING_B_TOKEN
 *   FB_STAGING_RESOURCES_JSON (JSON o ruta a un .json)
 *
 * Ejemplo de recursos:
 * {
 *   "A": {"grupos":["uuid"],"notas_personales":["uuid"],"progreso_lectura":["uuid"],"notificaciones":["uuid"],"examenes_personalizados":["uuid"],"intentos_examen_personalizado":["uuid"],"desafios":["uuid"],"desafio_participantes":["uuid"]},
 *   "B": {"grupos":["uuid"]},
 *   "storage": {"bucket":"avatars","A":["user-a/file.png"],"B":["user-b/file.png"]}
 * }
 */
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'FB_STAGING_SUPABASE_URL',
  'FB_STAGING_SUPABASE_ANON_KEY',
  'FB_STAGING_A_TOKEN',
  'FB_STAGING_B_TOKEN',
  'FB_STAGING_RESOURCES_JSON'
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Faltan variables de aislamiento staging: ${missing.join(', ')}`);
  process.exit(2);
}

const base = process.env.FB_STAGING_SUPABASE_URL.replace(/\/$/, '');
if (!/staging|stage|127\.0\.0\.1|localhost/i.test(base) && process.env.ALLOW_NON_STAGING !== 'true') {
  console.error('El endpoint no parece staging. Usa un host de staging o ALLOW_NON_STAGING=true de forma consciente.');
  process.exit(2);
}

function parseJson(value) {
  if (existsSync(value)) return JSON.parse(readFileSync(value, 'utf8'));
  return JSON.parse(value);
}

let resources;
try {
  resources = parseJson(process.env.FB_STAGING_RESOURCES_JSON);
} catch (error) {
  console.error('FB_STAGING_RESOURCES_JSON no es JSON valido:', error.message);
  process.exit(2);
}

const headers = (token) => ({
  apikey: process.env.FB_STAGING_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const checks = [];
function check(ok, label, detail = '') {
  checks.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` - ${detail}` : ''}`);
}

async function request(path, token, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers(token), ...(options.headers || {}) } });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

const TABLAS_PERMITIDAS = new Set([
  'grupos', 'miembros_grupo', 'notas_personales', 'progreso_lectura',
  'notificaciones', 'examenes_personalizados', 'intentos_examen_personalizado',
  'desafios', 'desafio_participantes', 'desafio_respuestas'
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectedDenied(status, rows) {
  return [401, 403, 404, 406].includes(status) || (Array.isArray(rows) && rows.length === 0);
}

async function checkTable(table, owner, id, tokenOwner, tokenOther) {
  if (!TABLAS_PERMITIDAS.has(table)) {
    check(false, `Fixture no usa una tabla permitida: ${table}`);
    return;
  }
  if (!UUID_RE.test(String(id))) {
    check(false, `Fixture contiene un UUID inválido para ${table}: ${id}`);
    return;
  }
  const filter = encodeURIComponent(id);
  const own = await request(`/rest/v1/${encodeURIComponent(table)}?id=eq.${filter}&select=id`, tokenOwner);
  check(own.response.ok && Array.isArray(own.body) && own.body.length > 0, `${owner} puede leer su recurso ${table}/${id}`, `HTTP ${own.response.status}`);

  const other = await request(`/rest/v1/${encodeURIComponent(table)}?id=eq.${filter}&select=id`, tokenOther);
  check(expectedDenied(other.response.status, other.body), `La otra institucion no puede leer ${table}/${id}`, `HTTP ${other.response.status}, filas=${Array.isArray(other.body) ? other.body.length : 'n/a'}`);
}

async function checkStorage(bucket, owner, path, tokenOwner, tokenOther) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const own = await request(`/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encoded}`, tokenOwner);
  check(own.response.ok, `${owner} puede leer su archivo ${bucket}/${path}`, `HTTP ${own.response.status}`);

  const other = await request(`/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encoded}`, tokenOther);
  check([401, 403, 404].includes(other.response.status), `La otra institucion no puede leer Storage ${bucket}/${path}`, `HTTP ${other.response.status}`);
}

async function main() {
  console.log('=== Aislamiento multiinstitucion: staging ===');
  console.log(`Endpoint: ${base}`);
  check(Boolean(resources?.A && resources?.B), 'Fixture contiene recursos de A y B');
  if (!resources?.A || !resources?.B) process.exit(1);

  const meA = await request('/auth/v1/user', process.env.FB_STAGING_A_TOKEN);
  const meB = await request('/auth/v1/user', process.env.FB_STAGING_B_TOKEN);
  check(meA.response.ok && Boolean(meA.body?.id), 'JWT A es valido', `HTTP ${meA.response.status}`);
  check(meB.response.ok && Boolean(meB.body?.id), 'JWT B es valido', `HTTP ${meB.response.status}`);
  check(meA.body?.id && meB.body?.id && meA.body.id !== meB.body.id, 'Los usuarios de staging son distintos');

  for (const [table, ids] of Object.entries(resources.A || {})) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) await checkTable(table, 'A', id, process.env.FB_STAGING_A_TOKEN, process.env.FB_STAGING_B_TOKEN);
  }
  for (const [table, ids] of Object.entries(resources.B || {})) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) await checkTable(table, 'B', id, process.env.FB_STAGING_B_TOKEN, process.env.FB_STAGING_A_TOKEN);
  }

  const storage = resources.storage;
  if (storage?.bucket) {
    for (const path of storage.A || []) await checkStorage(storage.bucket, 'A', path, process.env.FB_STAGING_A_TOKEN, process.env.FB_STAGING_B_TOKEN);
    for (const path of storage.B || []) await checkStorage(storage.bucket, 'B', path, process.env.FB_STAGING_B_TOKEN, process.env.FB_STAGING_A_TOKEN);
  } else {
    console.log('INFO  No hay fixture Storage; se omite la comprobacion de archivos.');
  }

  const passed = checks.filter(Boolean).length;
  console.log(`=== Resultado: ${passed}/${checks.length} checks ===`);
  process.exit(checks.every(Boolean) ? 0 : 1);
}

main().catch((error) => {
  console.error('ERROR FATAL:', error.message);
  process.exit(1);
});
