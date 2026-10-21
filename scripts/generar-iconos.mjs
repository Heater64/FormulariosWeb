#!/usr/bin/env node
/**
 * scripts/generar-iconos.mjs — subconjunto de Lucide
 * ----------------------------------------------------------------------------
 * El bundle completo (js/vendor/lucide.min.js) pesa ~411 KB por 1991 iconos;
 * la interfaz usa ~120. Este script lee el bundle local, extrae solo los que
 * aparecen en el código y escribe js/vendor/lucide-subset.js con la MISMA API
 * que consumen las páginas (window.lucide.createIcons + <i data-lucide="…">).
 *
 * No necesita red ni dependencias: el bundle es UMD y se evalúa en un `vm`.
 *
 * Uso:  node scripts/generar-iconos.mjs
 *       node scripts/generar-iconos.mjs --listar   (solo informa, no escribe)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(root, 'js', 'vendor', 'lucide.min.js');
const salidaPath = join(root, 'js', 'vendor', 'lucide-subset.js');

/* Iconos que se usan en plantillas construidas con nombres no literales.
   Se mantienen aquí para que un render dinámico nunca se quede sin icono. */
const RESPALDO = [
  'house', 'user', 'settings', 'check', 'x', 'trash-2', 'pencil', 'edit-3',
  'plus', 'search', 'inbox', 'clipboard-list', 'clipboard-check', 'alert-triangle',
  'arrow-left', 'arrow-right', 'chevron-down', 'chevron-left', 'chevron-right',
  'refresh-cw', 'log-out', 'bell', 'link', 'copy', 'upload', 'lock', 'unlock'
];

function listarArchivos(dir, salida = []) {
  let entradas;
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return salida; }
  for (const entrada of entradas) {
    if (['node_modules', 'dist', 'dist-public', 'android', '.git', '.freebuff', 'test-results', 'freebuff-sites-build'].includes(entrada.name)) continue;
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) listarArchivos(ruta, salida);
    else if (/\.(js|html|mjs|cjs|json)$/.test(entrada.name)) salida.push(ruta);
  }
  return salida;
}

/* ── 1. Registro de iconos del bundle UMD ──────────────────────────────────── */
function cargarRegistro() {
  const codigo = readFileSync(bundlePath, 'utf8');
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox, { filename: bundlePath });
  const lucide = sandbox.lucide;
  if (!lucide || !lucide.icons) throw new Error('El bundle de Lucide no expone lucide.icons');
  return lucide.icons;
}

/* ── 2. Nombres usados en el código ────────────────────────────────────────── */
const PATRONES = [
  /Iconos\.render\(\s*['"]([a-z0-9-]+)['"]/g,
  /\bI\(\s*['"]([a-z0-9-]+)['"]/g,
  /\bicono\s*:\s*['"]([a-z0-9-]+)['"]/g,
  /data-lucide=["']([a-z0-9-]+)["']/g,
  /\bicono\s*=\s*['"]([a-z0-9-]+)['"]/g
];

function recolectarNombres() {
  const nombres = new Set(RESPALDO);
  for (const archivo of listarArchivos(join(root, 'js')).concat(
    listarArchivos(join(root, 'public-site')),
    listarArchivos(join(root, 'paginas')),
    listarArchivos(join(root, 'data'))
  )) {
    if (/lucide(\.min|-subset)?\.js$/.test(archivo)) continue;
    let texto;
    try { texto = readFileSync(archivo, 'utf8'); } catch { continue; }
    for (const patron of PATRONES) {
      patron.lastIndex = 0;
      let m;
      while ((m = patron.exec(texto))) nombres.add(m[1]);
    }
  }
  return [...nombres].sort();
}

/* kebab-case → PascalCase (la clave del registro de Lucide). */
function aPascal(nombre) {
  return nombre.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
}

/* ── 3. Generación del archivo ─────────────────────────────────────────────── */
const registro = cargarRegistro();
const nombres = recolectarNombres();
const iconos = {};
const faltantes = [];

for (const nombre of nombres) {
  const clave = aPascal(nombre);
  if (registro[clave]) iconos[clave] = registro[clave];
  else faltantes.push(nombre);
}

if (process.argv.includes('--listar')) {
  console.log(`Iconos usados: ${nombres.length}`);
  console.log(nombres.join(', '));
  if (faltantes.length) console.log(`No existen en el bundle: ${faltantes.join(', ')}`);
  process.exit(0);
}

const cuerpo = `/**
 * lucide-subset.js — GENERADO por scripts/generar-iconos.mjs
 * ---------------------------------------------------------------------------
 * Subconjunto de Lucide v1.24 (ISC, https://lucide.dev) con los ${Object.keys(iconos).length} iconos
 * que usa la interfaz. Misma API que el bundle completo: expone
 * window.lucide.createIcons() y reemplaza los <i data-lucide="nombre">.
 *
 * No editar a mano: ejecuta \`node scripts/generar-iconos.mjs\`.
 */
(function (root) {
  'use strict';

  var ICONS = ${JSON.stringify(iconos)};

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BASE = {
    xmlns: SVG_NS,
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  };

  function aPascal(nombre) {
    return String(nombre || '').replace(/(^|-)([a-z0-9])/g, function (_, __, c) { return c.toUpperCase(); });
  }

  function aKebab(nombre) {
    return String(nombre || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  function aplicar(el, atributos) {
    for (var clave in atributos) {
      if (!Object.prototype.hasOwnProperty.call(atributos, clave)) continue;
      el.setAttribute(clave, String(atributos[clave]));
    }
    return el;
  }

  /** Crea el <svg> de un icono con los atributos base de Lucide. */
  function createElement(nodo, atributos) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    aplicar(svg, Object.assign({}, BASE, atributos || {}));
    (nodo || []).forEach(function (hijo) {
      var el = document.createElementNS(SVG_NS, hijo[0]);
      aplicar(el, hijo[1] || {});
      svg.appendChild(el);
    });
    return svg;
  }

  /**
   * Sustituye cada [data-lucide] por su <svg>. Conserva las clases y el resto
   * de atributos del marcador (aria-label, title, role…) para no perder
   * información accesible; si no hay ninguna, lo marca como decorativo.
   */
  function createIcons(opciones) {
    var opcionesAttrs = (opciones && opciones.attrs) || {};
    var marcadores = document.querySelectorAll('[data-lucide]');
    Array.prototype.forEach.call(marcadores, function (marcador) {
      var nombre = marcador.getAttribute('data-lucide');
      var clave = aPascal(nombre);
      var nodo = ICONS[clave];
      if (!nodo) return; // icono no incluido en el subconjunto: se deja el marcador

      var clases = ['lucide', 'lucide-' + aKebab(clave)];
      if (marcador.getAttribute('class')) clases.push(marcador.getAttribute('class'));
      if (opcionesAttrs.class) clases.push(opcionesAttrs.class);

      var atributos = { class: clases.join(' ') };
      for (var i = 0; i < marcador.attributes.length; i++) {
        var attr = marcador.attributes[i];
        if (attr.name === 'data-lucide' || attr.name === 'class') continue;
        atributos[attr.name] = attr.value;
      }
      if (!atributos['aria-label'] && !atributos.role && !atributos.title && !atributos['aria-hidden']) {
        atributos['aria-hidden'] = 'true';
      }

      var svg = createElement(nodo, Object.assign({}, opcionesAttrs, atributos));
      if (marcador.parentNode) marcador.parentNode.replaceChild(svg, marcador);
    });
    return marcadores.length;
  }

  root.lucide = { icons: ICONS, createElement: createElement, createIcons: createIcons };
})(typeof window !== 'undefined' ? window : this);
`;

writeFileSync(salidaPath, cuerpo, 'utf8');

const bytesOriginal = statSync(bundlePath).size;
const bytesNuevo = statSync(salidaPath).size;
console.log(`[iconos] ${Object.keys(iconos).length} iconos · ${(bytesNuevo / 1024).toFixed(1)} KB (antes ${(bytesOriginal / 1024).toFixed(0)} KB)`);
console.log(`[iconos] ahorro: ${(100 - (bytesNuevo / bytesOriginal) * 100).toFixed(1)}%`);
if (faltantes.length) {
  // Aviso, no fallo: un nombre desconocido solo deja ese marcador sin SVG.
  console.warn(`[iconos] nombres sin icono en el bundle (revisar): ${faltantes.join(', ')}`);
}
