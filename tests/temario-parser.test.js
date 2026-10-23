import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const parserFuente = read('js/dominio/temario-parser.js');

function cargar() {
  const window = {};
  new Function('window', parserFuente)(window);
  return window.temarioParser;
}

/** Catálogo real de libros leído de la semilla 002 (misma fuente que la BD). */
function catalogoReal() {
  const sql = read('supabase/migraciones/002_seed_data.sql');
  const re = /\((\d+),\s*'([^']+)',\s*'(antiguo|nuevo)',\s*(\d+),\s*'([^']*)'\)/g;
  const libros = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    libros.push({
      id: parseInt(m[1], 10),
      nombre: m[2],
      testamento: m[3],
      num_capitulos: parseInt(m[4], 10),
      abreviatura: m[5]
    });
  }
  return libros;
}

// ── Mensajes reales del profesor (fixtures, tal cual los envía) ─────────────

const EXAMEN_39 = [
  'Efesios 5:4',
  'Lucas 6:45',
  'Colosenses 3:8',
  'Efesios 4:29',
  'Santiago 3:16',
  'Efesios 5:11',
  'Mateo 12:36',
  'Colosenses 4:6',
  'Salmos 141:3',
  '1 Timoteo 4:12'
].join('\n');

const EXAMEN_37 = [
  'Génesis 17:17',
  '2 Crónicas 18:3; 18:29 y 1 Reyes 22:30',
  'Salmos 107, fijarse si es un salmo corto o largo',
  'Mateo 1:2',
  'Fijarse cuántos capítulos tiene el libro de Isaías',
  'Hechos 21:10-11',
  'Génesis 49:33; y 50:3',
  'Juan 1:47',
  'Hechos 10:5-13'
].join('\n');

describe('temario-parser: Examen 39 (lista simple de referencias)', () => {
  test('interpreta las 10 líneas como referencias válidas sin avisos', () => {
    const parser = cargar();
    const { items, avisos, resumen } = parser.parse(EXAMEN_39, catalogoReal());

    expect(items).toHaveLength(10);
    expect(avisos).toHaveLength(0);
    expect(resumen.referencia).toBe(10);
    expect(resumen.avisos).toBe(0);
    for (const item of items) {
      expect(item.tipo).toBe('referencia');
      expect(item.estado).toBe('ok');
      expect(item.refs).toHaveLength(1);
    }
  });

  test('primera y última referencia con sus coordenadas exactas', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_39, catalogoReal());

    expect(items[0].texto).toBe('Efesios 5:4');
    expect(items[0].refs[0]).toEqual({ libro: 'Efesios', capitulo: 5, versiculos: '4' });
    expect(items[9].texto).toBe('1 Timoteo 4:12');
    expect(items[9].refs[0]).toEqual({ libro: '1 Timoteo', capitulo: 4, versiculos: '12' });
  });
});

describe('temario-parser: Examen 37 (formato mixto real)', () => {
  const cat = catalogoReal();

  test('interpreta las 9 líneas sin perder ninguna', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse(EXAMEN_37, cat);
    expect(items).toHaveLength(9);
    expect(avisos).toHaveLength(0);
    for (const item of items) expect(item.estado).toBe('ok');
  });

  test('referencia simple', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[0].refs).toEqual([{ libro: 'Génesis', capitulo: 17, versiculos: '17' }]);
  });

  test('varias referencias en una línea: hereda el libro y cambia al nuevo', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[1].tipo).toBe('referencia');
    expect(items[1].refs).toEqual([
      { libro: '2 Crónicas', capitulo: 18, versiculos: '3' },
      { libro: '2 Crónicas', capitulo: 18, versiculos: '29' },
      { libro: '1 Reyes', capitulo: 22, versiculos: '30' }
    ]);
  });

  test('«fijarse si es un salmo corto o largo» → observación con su referencia', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[2].tipo).toBe('observacion');
    expect(items[2].refs).toEqual([{ libro: 'Salmos', capitulo: 107 }]);
    expect(items[2].texto).toContain('fijarse');
  });

  test('«cuántos capítulos tiene el libro de Isaías» → tarea a nivel de libro', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[4].tipo).toBe('tarea');
    expect(items[4].refs).toEqual([{ libro: 'Isaías' }]);
    expect(items[4].refs[0].capitulo).toBeUndefined();
  });

  test('rangos de versículos en ambos sentidos', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[5].refs[0]).toEqual({ libro: 'Hechos', capitulo: 21, versiculos: '10-11' });
    expect(items[8].refs[0]).toEqual({ libro: 'Hechos', capitulo: 10, versiculos: '5-13' });
  });

  test('«Génesis 49:33; y 50:3» → dos referencias del mismo libro', () => {
    const parser = cargar();
    const { items } = parser.parse(EXAMEN_37, cat);
    expect(items[6].refs).toEqual([
      { libro: 'Génesis', capitulo: 49, versiculos: '33' },
      { libro: 'Génesis', capitulo: 50, versiculos: '3' }
    ]);
  });
});

describe('temario-parser: avisos y estados de revisión', () => {
  const cat = catalogoReal();

  test('capítulo fuera del rango del libro marca el elemento para revisión', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Salmos 200:1', cat);
    expect(items[0].estado).toBe('revisar');
    expect(avisos).toHaveLength(1);
    expect(avisos[0].tipo).toBe('capitulo_fuera_rango');
    expect(avisos[0].id).toBe('t1');
    expect(avisos[0].linea).toBe(1);
  });

  test('libro desconocido avisa pero conserva la línea', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Baruc 3:1', cat);
    expect(items).toHaveLength(1);
    expect(items[0].texto).toBe('Baruc 3:1');
    expect(items[0].estado).toBe('revisar');
    expect(avisos.map((a) => a.tipo)).toContain('libro_desconocido');
    expect(avisos.find((a) => a.tipo === 'libro_desconocido').mensaje).toContain('No reconozco «Baruc»');
  });

  test('«Examen 39» no genera falso aviso de libro desconocido', () => {
    const parser = cargar();
    const { avisos } = parser.parse('Examen 39', cat);
    expect(avisos.map((a) => a.tipo)).not.toContain('libro_desconocido');
    expect(avisos.map((a) => a.tipo)).toContain('linea_sin_interpretar');
  });

  test('línea instructiva sin referencia queda en revisión con aviso', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Fijarse en la parte final del relato', cat);
    expect(items[0].tipo).toBe('observacion');
    expect(items[0].refs).toHaveLength(0);
    expect(items[0].estado).toBe('revisar');
    expect(avisos.map((a) => a.tipo)).toContain('sin_referencia');
  });

  test('texto no interpretado cae en tipo «texto» sin descartarse', () => {
    const parser = cargar();
    const { items } = parser.parse('Estudiar el relato de la creación', cat);
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe('texto');
    expect(items[0].estado).toBe('revisar');
  });

  test('entrada vacía devuelve estructura vacía', () => {
    const parser = cargar();
    const { items, avisos, resumen } = parser.parse('   \n  ', cat);
    expect(items).toEqual([]);
    expect(avisos).toEqual([]);
    expect(resumen.referencia).toBe(0);
  });
});

describe('temario-parser: libros numerados sin el 1./2.º (familias)', () => {
  const cat = catalogoReal();

  test('«Crónicas 30:2» se resuelve en 2 Crónicas sin ningún aviso', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Crónicas 30:2', cat);
    // Ni «No reconozco…» ni «No he reconocido esta línea»: cero avisos.
    expect(avisos).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe('referencia');
    expect(items[0].estado).toBe('ok');
    expect(items[0].refs).toEqual([{ libro: '2 Crónicas', capitulo: 30, versiculos: '2' }]);
  });

  test('con y sin acento se resuelven igual', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse(['Crónicas 30:2', 'Cronicas 35:1'].join('\n'), cat);
    expect(avisos).toEqual([]);
    expect(items[0].refs).toEqual([{ libro: '2 Crónicas', capitulo: 30, versiculos: '2' }]);
    expect(items[1].refs).toEqual([{ libro: '2 Crónicas', capitulo: 35, versiculos: '1' }]);
    expect(items.every((i) => i.estado === 'ok')).toBe(true);
  });

  test('si el capítulo cabe en ambos, manda el primero («Corintios 13:1»)', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Corintios 13:1', cat);
    expect(avisos).toEqual([]);
    expect(items[0].refs).toEqual([{ libro: '1 Corintios', capitulo: 13, versiculos: '1' }]);
  });

  test('rango que solo cabe en el libro 2 («Crónicas 34-36»)', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Crónicas 34-36', cat);
    expect(avisos).toEqual([]);
    expect(items[0].refs).toEqual([{ libro: '2 Crónicas', capitulo: 34, capitulo_fin: 36 }]);
  });

  test('capítulo imposible en ambos: avisa de rango contra el libro mayor', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Crónicas 40:1', cat);
    expect(items[0].estado).toBe('revisar');
    expect(avisos.map((a) => a.tipo)).not.toContain('libro_desconocido');
    expect(avisos.map((a) => a.tipo)).toContain('capitulo_fuera_rango');
    expect(avisos.find((a) => a.tipo === 'capitulo_fuera_rango').mensaje).toContain('2 Crónicas');
  });

  test('la herencia sigue el libro resuelto («Crónicas 34:1; 35:1»)', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Crónicas 34:1; 35:1', cat);
    expect(avisos).toEqual([]);
    expect(items[0].refs).toEqual([
      { libro: '2 Crónicas', capitulo: 34, versiculos: '1' },
      { libro: '2 Crónicas', capitulo: 35, versiculos: '1' }
    ]);
  });
});

describe('temario-parser: abreviaturas y formatos tolerados', () => {
  const cat = catalogoReal();

  test('abreviatura pegada al número («Sal107»)', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Sal107', cat);
    expect(avisos).toHaveLength(0);
    expect(items[0].refs).toEqual([{ libro: 'Salmos', capitulo: 107 }]);
  });

  test('abreviatura con punto («1 S. 22:30»)', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('1 S. 22:30', cat);
    expect(avisos).toHaveLength(0);
    expect(items[0].refs).toEqual([{ libro: '1 Samuel', capitulo: 22, versiculos: '30' }]);
  });

  test('rango de capítulos («Génesis 49-50»)', () => {
    const parser = cargar();
    const { items } = parser.parse('Génesis 49-50', cat);
    expect(items[0].refs).toEqual([{ libro: 'Génesis', capitulo: 49, capitulo_fin: 50 }]);
  });

  test('rango entre capítulos («Génesis 49:33-50:3»)', () => {
    const parser = cargar();
    const { items } = parser.parse('Génesis 49:33-50:3', cat);
    expect(items[0].refs).toEqual([
      { libro: 'Génesis', capitulo: 49, versiculos: '33', capitulo_fin: 50, versiculos_fin: '3' }
    ]);
  });

  test('«cap» explícito («Hechos cap 21»)', () => {
    const parser = cargar();
    const { items } = parser.parse('Hechos cap 21', cat);
    expect(items[0].refs).toEqual([{ libro: 'Hechos', capitulo: 21 }]);
  });

  test('el catálogo vacío no rompe: todo queda para revisión', () => {
    const parser = cargar();
    const { items, avisos } = parser.parse('Efesios 5:4', []);
    expect(items).toHaveLength(1);
    expect(items[0].refs).toHaveLength(0);
    expect(items[0].estado).toBe('revisar');
    expect(avisos.length).toBeGreaterThan(0);
  });
});
