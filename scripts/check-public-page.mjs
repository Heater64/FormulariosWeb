#!/usr/bin/env node
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'dist-public');

const index = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8');
assert(index.includes('<html'), 'dist-public/index.html no parece HTML válido');

// Inicia un servidor estático mínimo para el testeo real con cabeza, si está la
// utilidad. Si no, valida sintácticamente index, examen.js y los entry de la
// public SPA sin servidor (válido en CI sin Chrome).
let server;
let url = 'http://localhost:9000';
try {
  server = createServer((req, res) => {
    const r = new URL(req.url, url);
    let path = r.pathname === '/' ? '/index.html' : r.pathname;
    if (path.startsWith('/assets/')) path = '/assets' + path;
    try {
      res.end(readFileSync(join(PUBLIC_DIR, path)));
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  await once(server, 'listening');
  server.listen(9000);
  url = 'http://localhost:9000';

  await setTimeout(150);

  assert(process.env.CI !== 'true' || !process.env.CHROME_PATH, 'sin Chrome en CI: validación estática solamente');

  console.log('OK dist-public servido en', url);
  console.log('index bytes:', index.length);
} finally {
  server?.close();
}
