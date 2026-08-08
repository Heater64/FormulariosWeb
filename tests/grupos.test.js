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

  test('inserta el grupo con nombre y admin_id y devuelve la fila', async () => {
    const fila = { id: 'g1', nombre: 'Clase 1º ESO A', admin_id: 'u1' };
    const sb = crearSupabase({ grupos: { data: fila, error: null } });
    global.window.supabaseClient = sb;

    const resultado = await global.window.gruposRepository.crearGrupo('Clase 1º ESO A', 'u1');

    expect(resultado).toEqual(fila);
    const llamada = sb.llamadas.find(l => l.op === 'insert');
    expect(llamada.tabla).toBe('grupos');
    expect(llamada.valor).toEqual({ nombre: 'Clase 1º ESO A', admin_id: 'u1' });
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
