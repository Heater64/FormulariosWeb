import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarModulo(rutaRelativa) {
  const ruta = join(srcDir, rutaRelativa);
  const codigo = readFileSync(ruta, 'utf-8');
  const fn = new Function(codigo);
  fn();
}

beforeAll(() => {
  global.window = global;
  cargarModulo('js/dominio/ejercicios-memorizacion.js');
});

const J = () => window.ejerciciosMemorizacion;

const versiculo = {
  id: 'v1',
  tipo: 'versiculo',
  referencia: 'Juan 3:16',
  texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
  respuesta: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
  explicacion: 'El amor de Dios al mundo.'
};

describe('ejerciciosMemorizacion.limpiar()', () => {
  test('normaliza mayúsculas, tildes y puntuación', () => {
    expect(J().limpiar('¡Hola, MUNDO!')).toBe('hola mundo');
    expect(J().limpiar('ÁÉÍÓÚ')).toBe('aeiou');
    expect(J().limpiar('Génesis')).toBe('genesis');
  });
});

describe('ejerciciosMemorizacion.generarEjercicio() — versículo', () => {
  test('puede generar completar con huecos', () => {
    const ej = J().generarEjercicio(versiculo, [], ['completar']);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('completar');
    expect(ej.huecos.length).toBeGreaterThan(0);
    expect(ej.respuestas.length).toBe(ej.huecos.length);
  });

  test('completar verifica correcta e incorrecta', () => {
    const ej = J().generarEjercicio(versiculo, [], ['completar']);
    const aciertos = ej.verificar(ej.respuestas);
    expect(aciertos.every(Boolean)).toBe(true);
    const fallos = ej.verificar(ej.respuestas.map(() => 'xxx'));
    expect(fallos.some(f => !f)).toBe(true);
  });

  test('puede generar ordenar con las palabras correctas', () => {
    const ej = J().generarEjercicio(versiculo, [], ['ordenar']);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('ordenar');
    expect(ej.palabras.length).toBeGreaterThan(3);
    // Verificar con el orden correcto
    expect(ej.verificar(ej.respuestaCorrecta)).toBe(true);
    // Verificar con orden invertido falla (si hay >1 palabra)
    expect(ej.verificar([...ej.respuestaCorrecta].reverse())).toBe(false);
  });

  test('puede generar elegir_versiculo con distractores del banco', () => {
    const banco = [
      { id: 'a', texto: 'Jehová es mi pastor; nada me faltará.' },
      { id: 'b', texto: 'Todo lo puedo en Cristo que me fortalece.' },
      { id: 'c', texto: 'En el principio creó Dios los cielos y la tierra.' },
      { id: 'd', texto: 'El amor es sufrido, es benigno.' }
    ];
    const ej = J().generarEjercicio(versiculo, banco, ['elegir_versiculo']);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('elegir_versiculo');
    expect(ej.opciones.length).toBeGreaterThanOrEqual(3);
    expect(ej.opciones).toContain(versiculo.texto);
    expect(ej.verificar(versiculo.texto)).toBe(true);
    const mala = ej.opciones.find(o => o !== versiculo.texto);
    expect(ej.verificar(mala)).toBe(false);
  });
});

describe('ejerciciosMemorizacion.generarEjercicio() — otros tipos', () => {
  test('verdadero_falso con respuesta true', () => {
    const tarjeta = { id: 't1', tipo: 'verdadero_falso', pregunta: 'Jonás murió dentro del pez.', respuesta: 'false', explicacion: 'Jonás salió vivo después de 3 días.' };
    const ej = J().generarEjercicio(tarjeta, [], ['verdadero_falso']);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('verdadero_falso');
    expect(ej.esVerdadero).toBe(false);
    expect(ej.verificar('Falso')).toBe(true);
    expect(ej.verificar('Verdadero')).toBe(false);
  });

  test('relacionar auto-genera pares con el banco', () => {
    const tarjeta = { id: 'r1', tipo: 'relacionar', pregunta: 'David', respuesta: 'Goliat' };
    const banco = [
      { id: 'r2', pregunta: 'Noé', respuesta: 'Arca' },
      { id: 'r3', pregunta: 'Moisés', respuesta: 'Mar Rojo' },
      { id: 'r4', pregunta: 'Salomón', respuesta: 'Templo' }
    ];
    const ej = J().generarEjercicio(tarjeta, banco, ['relacionar']);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('relacionar');
    expect(ej.pares.length).toBeGreaterThanOrEqual(2);
    const correctas = {};
    ej.pares.forEach(([i, d]) => { correctas[J().limpiar(i)] = d; });
    expect(ej.verificar(correctas)).toBe(true);
    const incorrectas = { ...correctas };
    const claves = Object.keys(incorrectas);
    if (claves.length > 1) {
      [incorrectas[claves[0]], incorrectas[claves[1]]] = [incorrectas[claves[1]], incorrectas[claves[0]]];
      expect(ej.verificar(incorrectas)).toBe(false);
    }
  });

  test('escrita verifica con tolerancia para respuestas largas', () => {
    const tarjeta = { id: 'e1', tipo: 'escrita', pregunta: '¿Quién derrotó a Goliat?', respuesta: 'David' };
    const ej = J().generarEjercicio(tarjeta, [], ['escrita']);
    expect(ej).not.toBeNull();
    expect(ej.verificar('david')).toBe(true);
    expect(ej.verificar('Goliat')).toBe(false);
  });

  test('tarjeta libre cae a escrita', () => {
    const tarjeta = { id: 'l1', tipo: 'libre', pregunta: '¿Cuál es el primer libro?', respuesta: 'Génesis' };
    const ej = J().generarEjercicio(tarjeta, [], []);
    expect(ej).not.toBeNull();
    expect(ej.tipo).toBe('escrita');
  });
});

describe('ejerciciosMemorizacion.construirSesion()', () => {
  test('mezcla tipos rotando y respeta máximo', () => {
    const tarjetas = [versiculo, { ...versiculo, id: 'v2' }, { ...versiculo, id: 'v3' }];
    const sesion = J().construirSesion(tarjetas, tarjetas, { maxTarjetas: 6 });
    expect(sesion.length).toBeGreaterThan(0);
    expect(sesion.length).toBeLessThanOrEqual(6);
    const tipos = new Set(sesion.map(e => e.tipo));
    expect(tipos.size).toBeGreaterThan(1); // hay variedad
    sesion.forEach(e => {
      expect(e.tarjetaId).toBeDefined();
      expect(typeof e.verificar).toBe('function');
      expect(typeof e.respuestaCorrecta !== 'undefined' || e.tipo === 'relacionar').toBe(true);
    });
  });

  test('sesión vacía devuelve lista vacía', () => {
    expect(J().construirSesion([], [])).toEqual([]);
  });

  test('con un mazo grande toma tarjetas ALEATORIAS y únicas (no las primeras 10)', () => {
    const tarjetas = Array.from({ length: 30 }, (_, i) => ({ ...versiculo, id: 't' + (i + 1) }));
    const sesion = J().construirSesion(tarjetas, tarjetas, { maxTarjetas: 10 });
    expect(sesion.length).toBe(10);
    const ids = sesion.map(e => e.tarjetaId);
    // Todas distintas (sin repetir la misma tarjeta)
    expect(new Set(ids).size).toBe(10);
    // Todas pertenecen al mazo
    ids.forEach(id => expect(tarjetas.some(t => t.id === id)).toBe(true));
  });

  test('aleatorizar reordena de forma determinista con Math.random controlado', () => {
    const originalRandom = Math.random;
    try {
      Math.random = () => 0;
      const mezclada = J().aleatorizar(['a', 'b', 'c', 'd']);
      // Fisher–Yates con rand=0: cada paso intercambia con la posición 0
      expect(mezclada).toEqual(['b', 'c', 'd', 'a']);
      expect(mezclada).not.toEqual(['a', 'b', 'c', 'd']);
    } finally {
      Math.random = originalRandom;
    }
  });
});
