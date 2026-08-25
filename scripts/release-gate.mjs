#!/usr/bin/env node
/** Gate estatico de release: no requiere red ni credenciales. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, label) => {
  checks.push(Boolean(condition));
  if (!condition) failures.push(label);
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
};

function filesUnder(relative) {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) return [];
  const result = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(path));
    else result.push(path);
  }
  return result;
}

const read = (path) => existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';
const publicManifestText = read('public-site/manifest.json');
const appManifestText = read('public/manifest.json');
let publicManifest = null;
let appManifest = null;
try { publicManifest = JSON.parse(publicManifestText); } catch {}
try { appManifest = JSON.parse(appManifestText); } catch {}

ok(Boolean(publicManifest && publicManifest.start_url === '/' && publicManifest.scope === '/' && publicManifest.display === 'standalone'), 'Manifest publico preparado para PWA standalone');
ok(Boolean(appManifest && appManifest.start_url === '/' && appManifest.scope === '/' && appManifest.display === 'standalone'), 'Manifest de app preparado para PWA standalone');
ok(existsSync(join(root, 'public/sw.js')), 'Service Worker presente');
ok(existsSync(join(root, 'public/offline.html')), 'Fallback offline presente');
ok(existsSync(join(root, 'vercel.json')), 'Configuracion Vercel presente');

for (const [name, manifest] of [['publico', publicManifest], ['app', appManifest]]) {
  for (const icon of manifest?.icons || []) ok(existsSync(join(root, icon.src)), `Icono ${name} presente: ${icon.src}`);
}

for (const file of filesUnder('public-site').filter((path) => path.endsWith('.html'))) {
  const html = read(file);
  ok(!/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(html), `${file}: sin scripts inline`);
  ok(!/\son(?:click|submit|load|error)\s*=/i.test(html), `${file}: sin handlers inline`);
}

const source = [...filesUnder('js'), ...filesUnder('public-site'), ...filesUnder('api'), ...filesUnder('supabase/functions')]
  .filter((path) => /\.(js|ts|html|sql)$/.test(path))
  .map(read)
  .join('\n');
for (const forbidden of [
  /service_role\s*[:=]\s*['\"](?:eyJ|sb_secret_|.+secret.+)['\"]/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"](?:eyJ|sb_secret_)/i,
  /admin123/i,
  /owner123/i,
  /editor123/i,
  /alumno123/i
]) {
  ok(!forbidden.test(source), `Codigo sin secreto o credencial demo: ${forbidden}`);
}

const vercel = read('vercel.json');
for (const header of ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Strict-Transport-Security', 'Content-Security-Policy']) {
  ok(vercel.includes(header), `Vercel define ${header}`);
}
ok(/build:public/.test(vercel) && /dist-public/.test(vercel), 'Vercel publica el artefacto publico separado');

const packageText = read('package.json');
ok(packageText.includes('"build:public"'), 'Script build:public declarado');
ok(packageText.includes('"test"'), 'Script test declarado');
ok(existsSync(join(root, 'scripts/generate-study-content.mjs')), 'Generador de contenido de estudio presente');
ok(existsSync(join(root, '.github/workflows/backup.yml')), 'Workflow de backup presente');
ok(existsSync(join(root, '.github/workflows/release-android-tag.yml')), 'Workflow Android por tag presente');

const total = checks.length;
console.log(`=== Release gate: ${total - failures.length}/${total} ===`);
if (failures.length) {
  console.error('Bloqueadores encontrados:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
