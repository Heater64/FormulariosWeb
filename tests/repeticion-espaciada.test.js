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
  cargarModulo('js/dominio/repeticion-espaciada.js');
});

const sm2 = () => window.repeticionEspaciada;

describe('repeticionEspaciada.crearTarjeta()', () => {
  test('crea una tarjeta con valores iniciales correctos', () => {
    const tarjeta = sm2().crearTarjeta();
    expect(tarjeta.repeticiones).toBe(0);
    expect(tarjeta.intervalo).toBe(0);
    expect(tarjeta.factorFacilidad).toBe(2.5);
    expect(tarjeta.rachaActual).toBe(0);
    expect(tarjeta.mejorRacha).toBe(0);
    expect(tarjeta.vecesOlvidado).toBe(0);
    expect(tarjeta.ultimaCalificacion).toBeNull();
    expect(tarjeta.proximoRepaso).toBeDefined();
  });
});

describe('repeticionEspaciada.calcularProximoRepaso()', () => {
  test('calidad 0 (fallo total) resetea progreso', () => {
    const tarjeta = {
      repeticiones: 5, intervalo: 30, factorFacilidad: 2.5,
      rachaActual: 5, mejorRacha: 5, vecesOlvidado: 0, ultimaCalificacion: 4
    };
    const result = sm2().calcularProximoRepaso(tarjeta, 0);
    expect(result.repeticiones).toBe(0);
    expect(result.intervalo).toBe(1);
    expect(result.rachaActual).toBe(0);
    expect(result.vecesOlvidado).toBe(1);
  });

  test('calidad 1 (fallo) resetea progreso sin contar olvidado extra', () => {
    const tarjeta = sm2().crearTarjeta();
    const result = sm2().calcularProximoRepaso(tarjeta, 1);
    expect(result.repeticiones).toBe(0);
    expect(result.intervalo).toBe(1);
    expect(result.rachaActual).toBe(0);
  });

  test('calidad 3 (correcto con dificultad) inicia racha', () => {
    const tarjeta = sm2().crearTarjeta();
    const result = sm2().calcularProximoRepaso(tarjeta, 3);
    expect(result.repeticiones).toBe(1);
    expect(result.intervalo).toBe(1);
    expect(result.rachaActual).toBe(1);
  });

  test('segunda repetición correcta da intervalo 6', () => {
    const tarjeta = { repeticiones: 1, intervalo: 1, factorFacilidad: 2.5, rachaActual: 1, mejorRacha: 1, vecesOlvidado: 0, ultimaCalificacion: 4 };
    const result = sm2().calcularProximoRepaso(tarjeta, 4);
    expect(result.repeticiones).toBe(2);
    expect(result.intervalo).toBe(6);
    expect(result.rachaActual).toBe(2);
  });

  test('calidad 5 produce intervalo mayor usando factor de facilidad', () => {
    const tarjeta = { repeticiones: 2, intervalo: 6, factorFacilidad: 2.5, rachaActual: 2, mejorRacha: 2, vecesOlvidado: 0, ultimaCalificacion: 5 };
    const result = sm2().calcularProximoRepaso(tarjeta, 5);
    expect(result.repeticiones).toBe(3);
    expect(result.intervalo).toBeGreaterThan(10);
    expect(result.rachaActual).toBe(3);
  });

  test('factor de facilidad baja con fallos pero nunca < 1.3', () => {
    const tarjeta = sm2().crearTarjeta();
    let t = { ...tarjeta };
    for (let i = 0; i < 20; i++) {
      t = sm2().calcularProximoRepaso(t, 0);
    }
    expect(t.factorFacilidad).toBeGreaterThanOrEqual(1.3);
  });

  test('intervalo nunca supera 365 días', () => {
    const tarjeta = sm2().crearTarjeta();
    let t = { ...tarjeta };
    for (let i = 0; i < 50; i++) {
      t = sm2().calcularProximoRepaso(t, 5);
    }
    expect(t.intervalo).toBeLessThanOrEqual(365);
  });

  test('proximoRepaso es una fecha futura (mínimo hoy)', () => {
    const tarjeta = sm2().crearTarjeta();
    const result = sm2().calcularProximoRepaso(tarjeta, 3);
    const fecha = new Date(result.proximoRepaso);
    expect(fecha.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });
});

describe('repeticionEspaciada.calcularNivel()', () => {
  test.each([
    [0, 0], [1, 1], [2, 2], [7, 3], [14, 4], [30, 5], [60, 6], [120, 7], [180, 8], [365, 9]
  ])('intervalo %i → nivel %i', (intervalo, esperado) => {
    expect(sm2().calcularNivel(intervalo)).toBe(esperado);
  });
});

describe('repeticionEspaciada.estadoAprendizaje()', () => {
  test('racha >=5 e intervalo >=21 es consolidado', () => {
    expect(sm2().estadoAprendizaje(5, 21)).toBe('consolidado');
  });
  test('racha >=3 e intervalo >=7 es aprendido', () => {
    expect(sm2().estadoAprendizaje(3, 7)).toBe('aprendido');
  });
  test('intervalo <=1 es nuevo', () => {
    expect(sm2().estadoAprendizaje(0, 1)).toBe('nuevo');
  });
  test('caso intermedio es repasando', () => {
    expect(sm2().estadoAprendizaje(2, 3)).toBe('repasando');
  });
});

describe('repeticionEspaciada.nivelJuego()', () => {
  test('nuevo → nueva', () => {
    expect(sm2().nivelJuego(0, 0)).toBe('nueva');
    expect(sm2().nivelJuego(0, 1)).toBe('nueva');
  });
  test('racha baja o intervalo corto → aprendiendo', () => {
    expect(sm2().nivelJuego(1, 1)).toBe('aprendiendo');
    expect(sm2().nivelJuego(2, 3)).toBe('aprendiendo');
  });
  test('racha >=3 e intervalo >=7 → dominada', () => {
    expect(sm2().nivelJuego(3, 7)).toBe('dominada');
    expect(sm2().nivelJuego(4, 14)).toBe('dominada');
  });
  test('racha >=5 e intervalo >=21 → perfecta', () => {
    expect(sm2().nivelJuego(5, 21)).toBe('perfecta');
    expect(sm2().nivelJuego(8, 60)).toBe('perfecta');
  });
  test('infoNivel devuelve texto y color', () => {
    const info = sm2().infoNivel('dominada');
    expect(info.texto).toBe('Dominada');
    expect(info.color).toBeTruthy();
  });
});

describe('repeticionEspaciada.programarRepasos()', () => {
  test('ordena tarjetas por fecha de próximo repaso', () => {
    const tarjetas = [
      { proximoRepaso: new Date(Date.now() + 86400000 * 10).toISOString() },
      { proximoRepaso: new Date(Date.now() + 86400000 * 2).toISOString() },
      { proximoRepaso: new Date(Date.now() + 86400000 * 5).toISOString() }
    ];
    const ordenadas = sm2().programarRepasos(tarjetas);
    expect(ordenadas[0].diasRestantes).toBeLessThanOrEqual(ordenadas[1].diasRestantes);
    expect(ordenadas[1].diasRestantes).toBeLessThanOrEqual(ordenadas[2].diasRestantes);
  });
});
