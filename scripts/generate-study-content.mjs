#!/usr/bin/env node
/**
 * Generador determinista de contenido de estudio.
 *
 * Lee data/*.json, convierte registros compatibles en tarjetas del motor
 * ejercicios-memorizacion.js y valida que cada tarjeta tenga identidad,
 * pregunta, respuesta y una explicación/referencia razonable.
 *
 * Uso:
 *   node scripts/generate-study-content.mjs
 *   node scripts/generate-study-content.mjs --out /tmp/mazos.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const dataDir = join(root, 'data');
const outArg = process.argv.indexOf('--out');
const outPath = outArg >= 0 ? resolve(process.argv[outArg + 1] || '') : null;
const errores = [];
const avisos = [];
const mazos = [];

const texto = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const slug = (value) => texto(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const firstRef = (value) => Array.isArray(value) ? texto(value[0]) : texto(value);

function tarjeta({ id, tipo = 'escrita', pregunta, respuesta, referencia = '', explicacion = '', opciones = undefined }) {
  return {
    id,
    tipo,
    pregunta: texto(pregunta),
    respuesta: texto(respuesta),
    texto: tipo === 'versiculo' ? texto(respuesta) : '',
    referencia: texto(referencia),
    explicacion: texto(explicacion),
    ...(opciones ? { opciones } : {})
  };
}

function validarTarjeta(t, origen) {
  if (!t.id || !t.pregunta || !t.respuesta) errores.push(`${origen}: tarjeta incompleta (${t.id || 'sin id'})`);
  if (!t.explicacion && !t.referencia) avisos.push(`${origen}: ${t.id} no tiene explicación ni referencia`);
  if (!['versiculo', 'escrita', 'verdadero_falso'].includes(t.tipo)) errores.push(`${origen}: tipo no soportado por el generador (${t.tipo})`);
}

function generarDesdeArchivo(file, datos) {
  const base = slug(file.replace(/\.json$/i, ''));
  const tarjetas = [];
  const arr = Array.isArray(datos) ? datos : [];
  for (const [index, item] of arr.entries()) {
    if (!item || typeof item !== 'object') continue;
    const nombre = texto(item.nombre || item.evento || item.titulo);
    const detalle = texto(item.detalle || item.descripcion || item.texto);
    const ref = firstRef(item.refs || item.ref || item.libros);
    if (Array.isArray(item.items)) {
      for (const [itemIndex, child] of item.items.entries()) {
        const q = texto(child?.titulo);
        const r = texto(child?.texto || child?.detalle || child?.nombre);
        if (q && r) tarjetas.push(tarjeta({ id: `${base}-${index}-${itemIndex}`, pregunta: `¿Qué sabes sobre ${q}?`, respuesta: r.split('.')[0] || r, referencia: child.ref, explicacion: r }));
      }
    } else if (Array.isArray(item.eventos) && nombre) {
      for (const [eventIndex, evento] of item.eventos.slice(0, 4).entries()) {
        tarjetas.push(tarjeta({ id: `${base}-${index}-evento-${eventIndex}`, pregunta: `¿Quién protagonizó ${evento}?`, respuesta: nombre, referencia: ref, explicacion: detalle }));
      }
    } else if (nombre && detalle) {
      tarjetas.push(tarjeta({ id: `${base}-${index}`, pregunta: `¿Qué es ${nombre}?`, respuesta: detalle.split('.')[0] || detalle, referencia: ref, explicacion: detalle }));
    }
  }
  return tarjetas;
}

for (const file of readdirSync(dataDir).filter((name) => name.endsWith('.json')).sort()) {
  let datos;
  try { datos = JSON.parse(readFileSync(join(dataDir, file), 'utf8')); }
  catch (error) { errores.push(`${file}: JSON inválido (${error.message})`); continue; }
  const tarjetas = generarDesdeArchivo(file, datos);
  tarjetas.forEach((t) => validarTarjeta(t, file));
  if (tarjetas.length) mazos.push({ nombre: `Contenido · ${file.replace(/\.json$/i, '')}`, origen: `data/${file}`, tarjetas });
}

const resultado = { generado_en: new Date().toISOString(), mazos, resumen: { archivos: mazos.length, tarjetas: mazos.reduce((n, m) => n + m.tarjetas.length, 0), avisos: avisos.length, errores: errores.length } };
console.log(JSON.stringify(resultado.resumen));
avisos.forEach((aviso) => console.warn(`WARN ${aviso}`));
errores.forEach((error) => console.error(`ERROR ${error}`));
if (outPath) {
  if (!outPath || outPath === root) throw new Error('--out requiere una ruta de archivo');
  writeFileSync(outPath, JSON.stringify(resultado, null, 2) + '\n');
  console.log(`Contenido escrito en ${outPath}`);
}
if (errores.length) process.exit(1);
