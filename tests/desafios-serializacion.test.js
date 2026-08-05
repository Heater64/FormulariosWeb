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

/* Tarjetas variadas para cubrir todos los tipos de ejercicio */
const tarjetas = [
  {
    id: 'v1',
    tipo: 'versiculo',
    referencia: 'Juan 3:16',
    texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
    respuesta: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
    explicacion: 'El amor de Dios al mundo.'
  },
  {
    id: 'p1',
    tipo: 'libre',
    pregunta: '¿Quién fue el primer rey de Israel?',
    respuesta: 'Saúl',
    referencia: '1 Samuel 10'
  },
  {
    id: 'vf1',
    tipo: 'verdadero_falso',
    pregunta: 'Moisés abrió el Mar Rojo.',
    respuesta: 'Verdadero',
    referencia: 'Éxodo 14'
  },
  {
    id: 'rel1',
    tipo: 'relacionar',
    pregunta: 'David',
    respuesta: 'Goliat',
    referencia: '1 Samuel 17'
  }
];

function construirSesionCompleta() {
  // Construir una sesión de 12 ejercicios mezclando todos los tipos
  const sesion = J().construirSesion(tarjetas, tarjetas, { maxTarjetas: 12 });
  expect(sesion.length).toBeGreaterThan(0);
  return sesion;
}

describe('serializarSesion()', () => {
  test('elimina las funciones verificar (closures no serializables)', () => {
    const sesion = construirSesionCompleta();
    const serializada = J().serializarSesion(sesion);
    expect(serializada.length).toBe(sesion.length);
    for (const ej of serializada) {
      expect(ej.verificar).toBeUndefined();
      expect(typeof ej).toBe('object');
    }
    // JSON.stringify no debe fallar (la sesión es totalmente serializable)
    expect(() => JSON.stringify(serializada)).not.toThrow();
  });

  test('conserva todos los campos de datos', () => {
    const sesion = construirSesionCompleta();
    const serializada = J().serializarSesion(sesion);
    sesion.forEach((original, i) => {
      const copia = serializada[i];
      expect(copia.tipo).toBe(original.tipo);
      expect(copia.enunciado).toBe(original.enunciado);
      expect(copia.instruccion).toBe(original.instruccion);
      expect(copia.referencia).toBe(original.referencia);
      expect(copia.explicacion).toBe(original.explicacion);
      expect(copia.tarjetaId).toBe(original.tarjetaId);
    });
  });
});

describe('hidratarSesion()', () => {
  test('re-engancha verificar según el tipo y devuelve el mismo resultado', () => {
    const sesion = construirSesionCompleta();
    const serializada = JSON.parse(JSON.stringify(J().serializarSesion(sesion))); // simular viaje por BD
    const hidratada = J().hidratarSesion(serializada);
    expect(hidratada.length).toBe(sesion.length);

    for (let i = 0; i < sesion.length; i++) {
      const original = sesion[i];
      const copia = hidratada[i];
      expect(typeof copia.verificar).toBe('function');
      expect(copia.tipo).toBe(original.tipo);

      // Las respuestas correctas deben verificarse igual que en la original
      switch (original.tipo) {
        case 'completar':
          expect(copia.verificar(copia.respuestas).every(Boolean)).toBe(true);
          expect(copia.verificar(copia.respuestas.map(() => 'xxx')).some(f => !f)).toBe(true);
          break;
        case 'ordenar':
          expect(copia.verificar(copia.respuestaCorrecta)).toBe(true);
          expect(copia.verificar([...copia.respuestaCorrecta].reverse())).toBe(false);
          break;
        case 'elegir_versiculo':
          expect(copia.verificar(copia.respuestaCorrecta)).toBe(true);
          break;
        case 'verdadero_falso':
          expect(copia.verificar(copia.respuestaCorrecta)).toBe(true);
          expect(copia.verificar(copia.respuestaCorrecta === 'Verdadero' ? 'Falso' : 'Verdadero')).toBe(false);
          break;
        case 'relacionar': {
          const pares = copia.pares || [];
          const mapa = {};
          pares.forEach(([i, d]) => { mapa[J().limpiar(i)] = d; });
          expect(copia.verificar(mapa)).toBe(true);
          break;
        }
        case 'escrita':
          expect(copia.verificar(copia.respuestaCorrecta)).toBe(true);
          break;
      }
    }
  });

  test('es determinista: dos hidrataciones del mismo JSON verifican igual', () => {
    const sesion = construirSesionCompleta();
    const serializada = JSON.stringify(J().serializarSesion(sesion));
    const a = J().hidratarSesion(JSON.parse(serializada));
    const b = J().hidratarSesion(JSON.parse(serializada));
    for (let i = 0; i < a.length; i++) {
      expect(a[i].tipo).toBe(b[i].tipo);
      expect(JSON.stringify(a[i].respuestas || a[i].respuestaCorrecta || null))
        .toBe(JSON.stringify(b[i].respuestas || b[i].respuestaCorrecta || null));
    }
  });

  test('tolera entradas vacías o malformadas', () => {
    expect(J().hidratarSesion([])).toEqual([]);
    expect(J().hidratarSesion(null)).toEqual([]);
    expect(J().serializarSesion(null)).toEqual([]);
  });
});

describe('roundtrip completo (construir → serializar → BD → hidratar)', () => {
  test('el ganador se decide con la misma sesión en ambos jugadores', () => {
    // Simular dos jugadores que reciben la misma sesión serializada
    const sesion = construirSesionCompleta();
    const payload = JSON.stringify(J().serializarSesion(sesion));

    const jugadorA = J().hidratarSesion(JSON.parse(payload));
    const jugadorB = J().hidratarSesion(JSON.parse(payload));

    // Ambos deben enfrentarse a enunciados idénticos en el mismo orden
    expect(jugadorA.map(e => e.enunciado)).toEqual(jugadorB.map(e => e.enunciado));
    expect(jugadorA.map(e => e.tipo)).toEqual(jugadorB.map(e => e.tipo));

    // Si el jugador A responde todo bien y el B todo mal, A gana
    let aciertosA = 0;
    let aciertosB = 0;
    for (let i = 0; i < jugadorA.length; i++) {
      const ejA = jugadorA[i];
      const respA = ejA.respuestas || ejA.respuestaCorrecta;
      const resA = ejA.tipo === 'ordenar'
        ? ejA.verificar(ejA.respuestaCorrecta)
        : ejA.verificar(respA);
      if (Array.isArray(resA)) { if (resA.every(Boolean)) aciertosA++; }
      else if (resA) aciertosA++;

      const ejB = jugadorB[i];
      const resB = ejB.verificar('respuesta_incorrecta_xyz');
      if (Array.isArray(resB)) { if (resB.every(Boolean)) aciertosB++; }
      else if (resB) aciertosB++;
    }
    expect(aciertosA).toBe(jugadorA.length);
    expect(aciertosB).toBeLessThan(aciertosA);
  });
});
