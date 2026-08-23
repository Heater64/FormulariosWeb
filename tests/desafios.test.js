import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function cargarRepositorio() {
  const codigo = readFileSync(join(root, 'js/datos/desafios-repository.js'), 'utf8');
  new Function(codigo)();
}

function crearSupabase({ rpc = {}, tablas = {} } = {}) {
  const llamadas = [];
  const client = {
    llamadas,
    from(tabla) {
      let op = 'select';
      const q = { filtros: [], valor: null };
      q.select = () => q;
      q.insert = valor => { op = 'insert'; q.valor = valor; return q; };
      q.update = valor => { op = 'update'; q.valor = valor; return q; };
      q.delete = () => { op = 'delete'; return q; };
      q.eq = (campo, valor) => { q.filtros.push([campo, valor]); return q; };
      q.in = (campo, valor) => { q.filtros.push([campo, valor]); return q; };
      q.order = () => q;
      q.limit = () => q;
      q.single = () => {
        llamadas.push({ tabla, op, filtros: q.filtros, valor: q.valor });
        return Promise.resolve(tablas[tabla] || { data: null, error: null });
      };
      q.then = (resolve, reject) => {
        llamadas.push({ tabla, op, filtros: q.filtros, valor: q.valor });
        return Promise.resolve(tablas[tabla] || { data: [], error: null }).then(resolve, reject);
      };
      return q;
    },
    rpc(nombre, params) {
      llamadas.push({ rpc: nombre, params });
      const resultado = rpc[nombre];
      if (typeof resultado === 'function') return Promise.resolve(resultado(params));
      return Promise.resolve(resultado || { data: null, error: null });
    }
  };
  return client;
}

let emitidos;

beforeAll(() => {
  global.window = global;
  cargarRepositorio();
});

beforeEach(() => {
  emitidos = [];
  global.window = global;
  global.window.ejerciciosMemorizacion = {
    serializarSesion: sesion => sesion.map((ej, i) => ({ ...ej, id: String(ej.id || `ej-${i}`) })),
    hidratarSesion: sesion => sesion
  };
  global.window.memorizacionRepository = {
    listarMazos: async () => [{ id: 'm1', nombre: 'Salmos', es_global: true }]
  };
  global.window.notificationService = {
    emitir: async (nombre, payload) => { emitidos.push({ nombre, payload }); }
  };
});

describe('crearDesafio seguro', () => {
  test('crea mediante RPC, deduplica participantes y solo notifica a invitados', async () => {
    const sb = crearSupabase({
      rpc: {
        crear_desafio_seguro: { data: { id: 'd1', estado: 'invitacion' }, error: null }
      }
    });
    global.window.supabaseClient = sb;

    const resultado = await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1', nombre_completo: 'Ana' },
      participantes: [{ usuario_id: 'u2' }, { id: 'u2' }, { usuario_id: 'u3' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [{ id: 'ej-1', tipo: 'escrita', enunciado: 'x', respuestaCorrecta: 'y' }]
    });

    expect(resultado.id).toBe('d1');
    const llamada = sb.llamadas.find(x => x.rpc === 'crear_desafio_seguro');
    expect(llamada).toBeTruthy();
    expect(llamada.params.p_participantes.sort()).toEqual(['u2', 'u3']);
    expect(llamada.params.p_sesion[0].id).toBe('ej-1');
    expect(emitidos[0].payload.destinatarios.sort()).toEqual(['u2', 'u3']);
    expect(sb.llamadas.some(x => x.tabla === 'desafios' && ['insert', 'update', 'delete'].includes(x.op))).toBe(false);
  });

  test('acepta la respuesta de PostgREST como fila única o lista de una fila', async () => {
    global.window.supabaseClient = crearSupabase({ rpc: {
      crear_desafio_seguro: { data: [{ id: 'd-array', estado: 'invitacion' }], error: null }
    } });
    const resultado = await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' }, participantes: [{ id: 'u2' }], mazo: { id: 'm1', nombre: 'M' }, sesion: [{ id: 'e1' }]
    });
    expect(resultado.id).toBe('d-array');
  });

  test('rechaza una respuesta RPC no disponible', async () => {
    global.window.supabaseClient = crearSupabase({ rpc: { crear_desafio_seguro: { data: null, error: { message: 'RPC missing' } } } });
    await expect(window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' }, participantes: [{ id: 'u2' }], mazo: { id: 'm1', nombre: 'M' }, sesion: [{ id: 'e1' }]
    })).rejects.toThrow('RPC missing');
  });
});

describe('transiciones server-side', () => {
  test('aceptar, jugar, progreso, respuesta, terminar y abandonar usan sus RPC', async () => {
    const sb = crearSupabase({
      rpc: {
        desafio_responder_invitacion: { data: true, error: null },
        desafio_marcar_en_juego: { data: true, error: null },
        desafio_guardar_progreso: { data: true, error: null },
        desafio_comprobar_respuesta: { data: { correcta: false }, error: null },
        desafio_terminar_jugador: { data: { estado: 'terminado', correctas: 0, total: 1 }, error: null },
        desafio_abandonar_jugador: { data: true, error: null }
      },
      tablas: { desafios: { data: [], error: null }, desafio_participantes: { data: [], error: null } }
    });
    global.window.supabaseClient = sb;

    expect((await window.desafiosRepository.responderInvitacion('d1', 'u2', true)).empezado).toBe(true);
    await window.desafiosRepository.marcarEnJuego('d1');
    await window.desafiosRepository.guardarProgreso('d1', 'u2', { idx: 1, correctas: 1, incorrectas: 0 });
    expect(await window.desafiosRepository.comprobarRespuesta('d1', 'e1', 'respuesta')).toBe(false);
    await window.desafiosRepository.terminarJugador('d1', 'u2', { respuestas: { e1: 'respuesta' }, tiempoMs: 9000 });
    await window.desafiosRepository.abandonar('d1', 'u2');

    const nombres = sb.llamadas.filter(x => x.rpc).map(x => x.rpc);
    expect(nombres).toEqual(expect.arrayContaining([
      'desafio_responder_invitacion', 'desafio_marcar_en_juego',
      'desafio_guardar_progreso', 'desafio_comprobar_respuesta',
      'desafio_terminar_jugador', 'desafio_abandonar_jugador'
    ]));
    expect(sb.llamadas.some(x => x.tabla === 'desafio_participantes' && ['insert', 'update', 'delete'].includes(x.op))).toBe(false);
  });

  test('expulsar invitado usa RPC y no intenta borrar la fila desde el navegador', async () => {
    const sb = crearSupabase({ rpc: { desafio_eliminar_invitado: { data: true, error: null } } });
    global.window.supabaseClient = sb;
    await window.desafiosRepository.eliminarInvitado('d1', 'u3');
    expect(sb.llamadas.find(x => x.rpc === 'desafio_eliminar_invitado')).toBeTruthy();
    expect(sb.llamadas.some(x => x.tabla === 'desafio_participantes' && ['insert', 'update', 'delete'].includes(x.op))).toBe(false);
  });
});

describe('seguridad estática de Desafíos', () => {
  test('la migración revoca escrituras directas y no expone las claves', () => {
    const sql = readFileSync(join(root, 'supabase/migraciones/049_desafios_integridad_servidor.sql'), 'utf8');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.desafios FROM authenticated');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.desafio_participantes FROM authenticated');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.desafio_claves');
    expect(sql).toContain('REVOKE ALL ON public.desafio_claves FROM anon, authenticated');
    expect(sql).toContain('desafio_comprobar_respuesta');
    expect(sql).toContain('desafio_terminar_jugador');
  });

  test('el repositorio no contiene updates directos ni RPCs revocadas', () => {
    const src = readFileSync(join(root, 'js/datos/desafios-repository.js'), 'utf8');
    expect(src).not.toMatch(/from\(['"]desafios['"]\)\s*\.update/);
    expect(src).not.toMatch(/from\(['"]desafio_participantes['"]\)\s*\.(insert|update|delete)/);
    expect(src).not.toContain("rpc('desafio_cerrar_vencidos'");
    expect(src).not.toContain("rpc('desafio_abandonar_vencidos'");
  });
});

describe('fallos de entrada', () => {
  test('sin conexión devuelve error para acciones mutables', async () => {
    global.window.supabaseClient = null;
    await expect(window.desafiosRepository.comprobarRespuesta('d1', 'e1', 'x')).rejects.toThrow('Sin conexión');
    await expect(window.desafiosRepository.terminarJugador('d1', 'u1', { respuestas: {}, tiempoMs: 1 })).rejects.toThrow('Sin conexión');
  });

  test('un error RPC no se oculta', async () => {
    global.window.supabaseClient = crearSupabase({ rpc: { desafio_guardar_progreso: { data: null, error: { message: 'No autorizado' } } } });
    await expect(window.desafiosRepository.guardarProgreso('d1', 'u1', { idx: 1 })).rejects.toThrow('No autorizado');
  });
});
