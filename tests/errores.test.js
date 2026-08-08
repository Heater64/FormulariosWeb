import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarModulo(rutaRelativa) {
  const ruta = join(srcDir, rutaRelativa);
  const codigo = readFileSync(ruta, 'utf-8');
  new Function(codigo)();
}

beforeAll(() => {
  global.window = global;
  cargarModulo('js/core/errores.js');
});

beforeEach(() => {
  window.__fbLogsTecnicos = [];
});

describe('errores.clasificar()', () => {
  test.each([
    [{ message: 'Failed to fetch' }, 'NETWORK'],
    [{ message: 'network error' }, 'NETWORK'],
    [{ message: 'Invalid login credentials' }, 'AUTH'],
    [{ message: 'JWT expired' }, 'AUTH'],
    [{ message: 'Usuario o contraseña incorrectos' }, 'AUTH'],
    [{ message: 'new row violates row-level security policy' }, 'PERMISSION'],
    [{ message: 'permission denied for table perfiles' }, 'PERMISSION'],
    [{ message: 'No autorizado: solo el owner puede gestionar usuarios' }, 'PERMISSION'],
    [{ message: 'Not Found', status: 404 }, 'NOT_FOUND'],
    [{ message: 'duplicate key value violates unique constraint', code: '23505' }, 'CONFLICT'],
    [{ message: 'Could not find the table', code: 'PGRST205' }, 'DATABASE'],
    [{ message: 'division by zero', code: 'P0001' }, 'DATABASE'],
    [{ message: 'algo raro completamente' }, 'UNKNOWN'],
  ])('clasifica %o → %s', (err, esperado) => {
    expect(window.errores.clasificar(err)).toBe(esperado);
  });

  test('sin conexión explícita → OFFLINE', () => {
    expect(window.errores.clasificar({ message: 'Sin conexión con el servidor' })).toBe('OFFLINE');
  });

  test('errores SQL de PostgREST se clasifican como DATABASE', () => {
    const err = { message: 'PostgRESTError: Could not find the table', code: 'PGRST205' };
    expect(window.errores.clasificar(err)).toBe('DATABASE');
  });

  test('error sin propiedades → UNKNOWN', () => {
    expect(window.errores.clasificar(null)).toBe('UNKNOWN');
  });
});

describe('errores.mensajeUsuario()', () => {
  test('devuelve mensaje amigable y nunca el texto técnico', () => {
    const err = { message: 'new row violates row-level security policy for relation "perfiles"' };
    const msj = window.errores.mensajeUsuario(err);
    expect(msj).not.toContain('row-level security');
    expect(msj).toContain('permiso');
  });

  test('permite sobrescribir por contexto', () => {
    const err = { message: 'Failed to fetch' };
    const msj = window.errores.mensajeUsuario(err, { mensajes: { NETWORK: 'Revisa tu conexión' } });
    expect(msj).toBe('Revisa tu conexión');
  });

  test('respeta mensajes de dominio en español (no técnicos)', () => {
    const msj = window.errores.mensajeUsuario({ message: 'Ese nombre de usuario ya existe.' });
    expect(msj).toBe('Ese nombre de usuario ya existe.');
  });

  test('error técnico sin dominio → genérico, nunca el crudo', () => {
    const msj = window.errores.mensajeUsuario({ message: 'new row violates row-level security policy for relation "perfiles"' });
    expect(msj).not.toContain('relation');
  });
});

describe('errores.registrar()', () => {
  test('registra errores relevantes en el buffer técnico', () => {
    window.errores.registrar({ message: 'permission denied for table perfiles' }, { operacion: 'select perfiles' });
    expect(window.__fbLogsTecnicos.length).toBe(1);
    expect(window.__fbLogsTecnicos[0].tipo).toBe('PERMISSION');
    expect(window.__fbLogsTecnicos[0].contexto.operacion).toBe('select perfiles');
  });

  test('no registra ruido de red (sin conexión) para no llenar logs', () => {
    window.errores.registrar({ message: 'Failed to fetch' }, 'load');
    expect(window.__fbLogsTecnicos.length).toBe(0);
  });

  test('acota el buffer a 50 entradas', () => {
    for (let i = 0; i < 60; i++) window.errores.registrar({ message: 'database error ' + i }, 'x');
    expect(window.__fbLogsTecnicos.length).toBeLessThanOrEqual(50);
  });
});