import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

// Carga el script clásico del repositorio en un contexto con `window`.
function cargarRepositorio() {
  const codigo = readFileSync(join(srcDir, 'js/datos/grupos-repository.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

// Mock encadenable mínimo de supabase-js para grupos.
function crearSupabase(respuestas) {
  const llamadas = [];
  const client = {
    llamadas,
    from(tabla) {
      let op = 'select';
      const q = {};
      q.select = (cols) => { q._columnas = cols || '*'; return q; };
      q.insert = (val) => { op = 'insert'; q._valor = val; return q; };
      q.single = () => {
        llamadas.push({ tabla, op, valor: q._valor });
        return Promise.resolve(respuestas[tabla] || { data: null, error: null });
      };
      q.then = (res, rej) => {
        llamadas.push({ tabla, op, valor: q._valor });
        return Promise.resolve(respuestas[tabla] || { data: null, error: null }).then(res, rej);
      };
      q.eq = () => q;
      q.in = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.update = (val) => { op = 'update'; q._valor = val; return q; };
      q.delete = () => { op = 'delete'; return q; };
      q.upsert = (val) => { op = 'upsert'; q._valor = val; return q; };
      q.rpc = (nombre, args) => { op = 'rpc'; q._rpc = nombre; q._args = args; return q; };
      return q;
    }
  };
  return client;
}

describe('gruposRepository.crearGrupo', () => {
  beforeEach(() => {
    global.window = global;
    global.window.supabaseClient = null;
    global.window.gruposRepository = null;
    cargarRepositorio();
  });

  test('inserta la clase con nombre, admin_id y un código de 6 caracteres, y devuelve la fila', async () => {
    const fila = { id: 'g1', nombre: 'Clase 1º ESO A', admin_id: 'u1', codigo: 'ABC123' };
    const sb = crearSupabase({ grupos: { data: fila, error: null } });
    global.window.supabaseClient = sb;

    const resultado = await global.window.gruposRepository.crearGrupo('Clase 1º ESO A', 'u1');

    expect(resultado).toEqual(fila);
    const llamada = sb.llamadas.find(l => l.op === 'insert');
    expect(llamada.tabla).toBe('grupos');
    expect(llamada.valor.nombre).toBe('Clase 1º ESO A');
    expect(llamada.valor.admin_id).toBe('u1');
    // Código de clase: 6 caracteres del alfabeto sin ambiguos (0/O/1/I)
    expect(llamada.valor.codigo).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  test('asigna la institución si se pasa institucionId', async () => {
    const fila = { id: 'g1', nombre: 'Clase A', admin_id: 'u1', codigo: 'ABC123' };
    const sb = crearSupabase({ grupos: { data: fila, error: null } });
    global.window.supabaseClient = sb;

    await global.window.gruposRepository.crearGrupo('Clase A', 'u1', 'inst-1');

    const llamada = sb.llamadas.find(l => l.op === 'insert');
    expect(llamada.valor.institucion_id).toBe('inst-1');
  });

  test('lanza error si la BD rechaza el insert (p.ej. RLS)', async () => {
    const sb = crearSupabase({ grupos: { data: null, error: { message: 'permission denied' } } });
    global.window.supabaseClient = sb;

    await expect(global.window.gruposRepository.crearGrupo('Grupo X', 'u2')).rejects.toThrow();
  });

  test('lanza error sin conexión', async () => {
    global.window.supabaseClient = null;
    await expect(global.window.gruposRepository.crearGrupo('Grupo X', 'u2')).rejects.toThrow('Sin conexión');
  });
});

describe('gruposRepository.generarCodigo', () => {
  beforeEach(() => {
    global.window = global;
    global.window.gruposRepository = null;
    cargarRepositorio();
  });

  test('genera códigos de 6 caracteres sin caracteres ambiguos', () => {
    for (let i = 0; i < 50; i++) {
      const c = global.window.gruposRepository.generarCodigo();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  test('genera códigos distintos en llamadas sucesivas', () => {
    const vistos = new Set();
    for (let i = 0; i < 50; i++) vistos.add(global.window.gruposRepository.generarCodigo());
    expect(vistos.size).toBeGreaterThan(40);
  });
});

describe('gruposRepository.unirseConCodigo', () => {
  beforeEach(() => {
    global.window = global;
    global.window.supabaseClient = null;
    global.window.gruposRepository = null;
    cargarRepositorio();
  });

  test('llama al RPC unirse_con_codigo y devuelve el id de la clase', async () => {
    const sb = crearSupabase({});
    sb.rpc = async (nombre, args) => {
      sb.llamadas.push({ op: 'rpc', rpc: nombre, args });
      return { data: 'g1', error: null };
    };
    global.window.supabaseClient = sb;

    const resultado = await global.window.gruposRepository.unirseConCodigo(' abc123 ');

    expect(resultado).toBe('g1');
    const llamada = sb.llamadas.find(l => l.op === 'rpc');
    expect(llamada.rpc).toBe('unirse_con_codigo');
    expect(llamada.args.p_codigo).toBe('abc123');
  });

  test('lanza error si el código no es válido (RPC rechaza)', async () => {
    const sb = crearSupabase({});
    sb.rpc = async () => ({ data: null, error: { message: 'Código de clase no válido' } });
    global.window.supabaseClient = sb;

    await expect(global.window.gruposRepository.unirseConCodigo('XXXXXX')).rejects.toThrow();
  });

  test('lanza error sin conexión', async () => {
    global.window.supabaseClient = null;
    await expect(global.window.gruposRepository.unirseConCodigo('ABC123')).rejects.toThrow('Sin conexión');
  });
});
