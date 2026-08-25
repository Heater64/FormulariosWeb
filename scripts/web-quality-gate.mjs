#!/usr/bin/env node
/**
 * Gate de calidad web sobre dist-public. No sustituye Lighthouse ni una
 * revisión manual con lector de pantalla/dispositivos reales.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist-public');
const failures = [];
const checks = [];
const check = (condition, label) => {
  const passed = Boolean(condition);
  checks.push(passed);
  if (!passed) failures.push(label);
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
};

function filesUnder(relative = '') {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) return [];
  const output = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(path));
    else output.push(path);
  }
  return output;
}

check(existsSync(root), 'dist-public existe');
if (!existsSync(root)) process.exit(1);

const htmlFiles = filesUnder().filter((path) => path.endsWith('.html'));
check(htmlFiles.length >= 8, `Build publico contiene paginas HTML (${htmlFiles.length})`);
for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  check(/<html[^>]+lang=["']es/i.test(html), `${file}: idioma declarado`);
  check(/<title>[^<]+<\/title>/i.test(html), `${file}: title presente`);
  check(/<meta[^>]+name=["']viewport["']/i.test(html), `${file}: viewport presente`);
  // Vite puede insertar runtime inline en `app/index.html`; la CSP se valida
  // sobre el HTML fuente en release-gate.mjs. En el artefacto comprobamos que
  // no haya handlers inline ni scripts inline en las paginas publicas.
  const esIndiceApp = file.replaceAll(String.fromCharCode(92), '/').startsWith('app/');
  if (!esIndiceApp) {
    check(!/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(html), `${file}: sin scripts inline`);
  }
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    check(/\balt\s*=/.test(image[0]), `${file}: imagen con alt`);
  }
  for (const button of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const attrs = button[0];
    const text = button[1].replace(/<[^>]+>/g, '').trim();
    check(Boolean(text || /aria-label\s*=|title\s*=/.test(attrs)), `${file}: boton con nombre accesible`);
  }
}

const manifestPath = join(root, 'manifest.json');
const swPath = join(root, 'sw.js');
check(existsSync(manifestPath), 'Manifest publico generado');
check(existsSync(swPath), 'Service Worker publico generado');
if (existsSync(manifestPath)) {
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
  check(manifest?.display === 'standalone', 'Manifest usa display standalone');
  check(manifest?.start_url === '/' && manifest?.scope === '/', 'Manifest conserva scope raiz');
}

const assets = filesUnder('assets');
for (const file of assets) {
  const bytes = statSync(join(root, file)).size;
  check(bytes <= 1024 * 1024, `${file}: asset menor de 1 MB (${Math.round(bytes / 1024)} KB)`);
}

for (const file of filesUnder('app/assets').filter((path) => /\.(css|js)$/i.test(path))) {
  const bytes = statSync(join(root, file)).size;
  const limit = file.endsWith('.css') ? 450 * 1024 : 650 * 1024;
  check(bytes <= limit, `${file}: dentro del presupuesto (${Math.round(bytes / 1024)} KB / ${Math.round(limit / 1024)} KB)`);
}

const total = checks.length;
console.log(`=== Web quality gate: ${total - failures.length}/${total} ===`);
if (failures.length) {
  console.error('Problemas encontrados:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
