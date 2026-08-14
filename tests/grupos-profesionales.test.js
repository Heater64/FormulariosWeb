import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarRepositorio() {
  const codigo = readFileSync(join(srcDir, 'js/datos/grupos-repository.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

function crearSupabase(respuestas) {
  const llamadas = [];
  const client = {
    llamadas,
    from(tabla) {
      let op = 'select';
      const q = {};
      q.select = (cols) => { q._columnas = cols || '*'; return q; };
      q.insert = (val) => { op = 'insert'; q._valor = val; return q; };
      q.single = () => { llamadas.push({ tabla, op, valor: q._valor }); return Promise.resolve(respuestas[tabla] || { data: null, error: null }); };
      q.then = (res, rej) => { llamadas.push({ tabla, op, valor: q._valor }); return Promise.resolve(respuestas[tabla] || { data: null, error: null }).then(res, rej); };
      q.eq = () => q; q.in = () => q; q.order = () => q; q.limit = () => q;
      q.update = (val) => { op = 'update'; q._valor = val; return q; };
      q.delete = () => { op = 'delete'; return q; };
      q.upsert = (val) => { op = 'upsert'; q._valor = val; return q; };
      q.rpc = (nombre, args) => { op = 'rpc'; q._rpc = nombre; q._args = args; return q; };
      return q;
    },
    rpc(nombre, args) {
      llamadas.push({ op: 'rpc', _rpc: nombre, _args: args });
      const out = respuestas.rpc || { data: null, error: null };
      return { then: (res, rej) => Promise.resolve(out).then(res, rej) };
    }
  };
  return client;
}

describe('gruposRepository profesional', () => {
  beforeEach(() => {
    global.window = global;
    global.window.supabaseClient = null;
    global.window.gruposRepository = null;
    cargarRepositorio();
  });

  test('solicitarIngreso llama a la RPC solicitar_ingreso', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    await global.window.gruposRepository.solicitarIngreso('g1');
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc).toBeTruthy();
    expect(rpc._rpc).toBe('solicitar_ingreso');
    expect(rpc._args).toEqual({ p_grupo_id: 'g1' });
  });

  test('solicitudesDeClase embebe el perfil del solicitante', async () => {
    const pendiente = { id: 's1', grupo_id: 'g1', estado: 'pendiente', perfiles: { id: 'u1', nombre_completo: 'Ana' } };
    const sb = crearSupabase({ solicitudes_grupo: { data: [pendiente], error: null } });
    global.window.supabaseClient = sb;
    const filas = await global.window.gruposRepository.solicitudesDeClase('g1');
    expect(filas).toHaveLength(1);
    expect(filas[0].perfiles.nombre_completo).toBe('Ana');
    expect(sb.llamadas.some(l => l.tabla === 'solicitudes_grupo' && l.op === 'select')).toBe(true);
  });

  test('resolverSolicitud llama a la RPC con aceptar booleano', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    await global.window.gruposRepository.resolverSolicitud('s1', true);
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc._rpc).toBe('resolver_solicitud');
    expect(rpc._args).toEqual({ p_solicitud_id: 's1', p_aceptar: true });
  });

  test('crearAviso llama a la RPC crear_aviso con el contenido', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    await global.window.gruposRepository.crearAviso('g1', 'Bienvenidos al nuevo trimestre');
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc._rpc).toBe('crear_aviso');
    expect(rpc._args).toEqual({ p_grupo_id: 'g1', p_contenido: 'Bienvenidos al nuevo trimestre' });
  });

  test('estadisticasClase devuelve el JSONB de la RPC', async () => {
    const stats = { miembros: 5, profesores: 1, alumnos: 4, examenes: 2, avisos: 3, solicitudes_pendientes: 1, activos_7d: 4 };
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    sb.rpc = (nombre) => ({ then: (res) => Promise.resolve({ data: stats, error: null }).then(res) });
    const out = await global.window.gruposRepository.estadisticasClase('g1');
    expect(out).toEqual(stats);
  });

  test('obtenerMiembrosDe lee SOLO miembros_grupo y devuelve perfil + rol + es_principal', async () => {
    const fila = {
      usuario_id: 'u1', rol_en_grupo: 'editor', es_principal: true, creado_en: '2026-01-01',
      perfiles: { id: 'u1', nombre_completo: 'Ana', username: 'ana', rol: 'editor' }
    };
    const sb = crearSupabase({ miembros_grupo: { data: [fila], error: null } });
    global.window.supabaseClient = sb;
    const miembros = await global.window.gruposRepository.obtenerMiembrosDe('g1');
    expect(miembros).toHaveLength(1);
    expect(miembros[0].rol_en_grupo).toBe('editor');
    expect(miembros[0].es_principal).toBe(true);
    expect(sb.llamadas.some(l => l.tabla === 'perfiles')).toBe(false);
  });
});
