// Artefacto temporal: decodifica dos PNG de Chrome headless y reporta DÓNDE
// cambian los píxeles (bandas horizontales), para verificar que el retoque
// visual se ve y que se limita a las zonas previstas.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function decodificarPNG(ruta) {
  const buf = fs.readFileSync(ruta);
  let pos = 8; // firma
  let ancho = 0, alto = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tipo = buf.toString('ascii', pos + 4, pos + 8);
    const datos = buf.subarray(pos + 8, pos + 8 + len);
    if (tipo === 'IHDR') {
      ancho = datos.readUInt32BE(0); alto = datos.readUInt32BE(4);
      bitDepth = datos[8]; colorType = datos[9];
    } else if (tipo === 'IDAT') idat.push(datos);
    else if (tipo === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('Se esperaba 8 bits por canal, no ' + bitDepth);
  const canales = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!canales) throw new Error('Tipo de color no soportado: ' + colorType);

  const crudo = zlib.inflateSync(Buffer.concat(idat));
  const anchoFila = ancho * canales;
  const salida = Buffer.alloc(alto * anchoFila);
  let p = 0;
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[p++];
    const fila = crudo.subarray(p, p + anchoFila); p += anchoFila;
    const previa = y === 0 ? Buffer.alloc(anchoFila) : salida.subarray((y - 1) * anchoFila, y * anchoFila);
    const destino = salida.subarray(y * anchoFila, (y + 1) * anchoFila);
    for (let x = 0; x < anchoFila; x++) {
      const a = x >= canales ? destino[x - canales] : 0;
      const b = previa[x];
      const c = x >= canales ? previa[x - canales] : 0;
      let v = fila[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += Math.floor((a + b) / 2);
      else if (filtro === 4) {
        const pp = a + b - c;
        const da = Math.abs(pp - a), db = Math.abs(pp - b), dc = Math.abs(pp - c);
        v += (da <= db && da <= dc) ? a : (db <= dc ? b : c);
      }
      destino[x] = v & 0xff;
    }
  }
  return { ancho, alto, canales, pixeles: salida };
}

const a = decodificarPNG(path.join(__dirname, 'antes.png'));
const b = decodificarPNG(path.join(__dirname, 'despues.png'));
if (a.ancho !== b.ancho || a.alto !== b.alto) throw new Error('Tamaños distintos');

const filas = [];
let totalDistintos = 0;
let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
for (let y = 0; y < a.alto; y++) {
  let distintos = 0;
  for (let x = 0; x < a.ancho; x++) {
    const i = (y * a.ancho + x) * a.canales;
    if (a.pixeles[i] !== b.pixeles[i] || a.pixeles[i + 1] !== b.pixeles[i + 1] || a.pixeles[i + 2] !== b.pixeles[i + 2]) {
      distintos++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  totalDistintos += distintos;
  if (distintos > 0) filas.push({ y, distintos });
}

// Agrupa las filas con cambios en bandas contiguas.
const bandas = [];
for (const f of filas) {
  const ultima = bandas[bandas.length - 1];
  if (ultima && f.y <= ultima.hasta + 2) { ultima.hasta = f.y; ultima.max = Math.max(ultima.max, f.distintos); }
  else bandas.push({ desde: f.y, hasta: f.y, max: f.distintos });
}

console.log(`Imagen: ${a.ancho}x${a.alto} · píxeles distintos: ${totalDistintos} (${(totalDistintos / (a.ancho * a.alto) * 100).toFixed(2)}%)`);
console.log(`Caja de los cambios: x ${minX}-${maxX} · y ${minY}-${maxY}`);
console.log('Bandas con cambios (y · máx píxeles por fila):');
for (const banda of bandas) console.log(`  y ${banda.desde}-${banda.hasta} · ${banda.max}`);
