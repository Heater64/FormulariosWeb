import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

// Carga el script clásico del repositorio en un contexto con `window`.
function cargarRepositorio() {
  const codigo = readFileSync(join(srcDir, 'js/datos/desafios-repository.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

// Mock encadenable de supabase-js: registra llamadas y resuelve según tabla/op.
function crearSupabase(config) {
  const llamadas = [];
  const client = {
    llamadas,
    from(tabla) {
      let op = 'select';
      const q = {};
      q._filtros = [];
      q._valor = null;
      q._columnas = '*';
      q.eq = (c, v) => { q._filtros.push([c, v]); return q; };
      q.in = (c, v) => { q._filtros.push([c, v]); return q; };
      q.order = () => q;
      q.limit = () => q;
      q.select = (cols) => { q._columnas = cols || '*'; return q; };
      q.insert = (val) => { op = 'insert'; q._valor = val; return q; };
      q.update = (val) => { op = 'update'; q._valor = val; return q; };
      q.delete = () => { op = 'delete'; return q; };
      q.single = () => {
        llamadas.push({ tabla, op, modo: 'single', filtros: q._filtros, valor: q._valor, columnas: q._columnas });
        return Promise.resolve(config.respuesta(tabla, op, 'single', q));
      };
      q.then = (res, rej) => {
        llamadas.push({ tabla, op, modo: 'lista', filtros: q._filtros, valor: q._valor, columnas: q._columnas });
        return Promise.resolve(config.respuesta(tabla, op, 'lista', q)).then(res, rej);
      };
      return q;
    },
    rpc(nombre, params) {
      llamadas.push({ rpc: nombre, params });
      const fn = config.rpc && config.rpc[nombre];
      return Promise.resolve(fn ? fn(params, llamadas) : { data: null, error: null });
    }
  };
  return client;
}

let supabase;
const emitidos = [];

// Crea el mock y lo engancha a la vez (beforeEach corre antes de que el
// test asigne `supabase`, así que hay que sincronizar aquí).
function usarSupabase(config) {
  supabase = crearSupabase(config);
  global.supabaseClient = supabase;
  return supabase;
}

beforeAll(() => {
  global.window = global;
  cargarRepositorio();
});

beforeEach(() => {
  emitidos.length = 0;
  global.window = global;
  global.supabaseClient = supabase;
  global.ejerciciosMemorizacion = {
    serializarSesion: (s) => s,
    hidratarSesion: (l) => l
  };
  global.memorizacionRepository = {
    listarMazos: async () => [{ id: 'm1', nombre: 'Salmos', es_global: true }]
  };
  global.notificationService = {
    emitir: async (nombre, payload) => { emitidos.push({ nombre, payload }); return null; }
  };
});

describe('crearDesafio', () => {
  test('crea el desafío, inserta participantes únicos (creador incluido) y notifica solo a invitados', async () => {
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'insert') {
          return { data: { id: 'd1', estado: 'invitacion', creado_en: '2026-08-08T10:00:00Z' }, error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'insert') {
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }
    });
    const creador = { id: 'u1', nombre_completo: 'Ana' };
    const rivales = [{ usuario_id: 'u2' }, { id: 'u3' }]; // mezcla de formatos
    const resultado = await window.desafiosRepository.crearDesafio({
      creador,
      participantes: rivales,
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [{ tipo: 'escrita', enunciado: 'x' }]
    });

    expect(resultado.id).toBe('d1');
    const insertPart = supabase.llamadas.find(l => l.tabla === 'desafio_participantes' && l.op === 'insert');
    const filas = insertPart.valor;
    const ids = filas.map(f => f.usuario_id).sort();
    expect(ids).toEqual(['u1', 'u2', 'u3']);
    expect(new Set(ids).size).toBe(3); // sin duplicados
    // Creador aceptado; invitados en 'invitado'
    expect(filas.find(f => f.usuario_id === 'u1').estado).toBe('aceptado');
    expect(filas.find(f => f.usuario_id === 'u2').estado).toBe('invitado');
    // Notificación solo a invitados (no al creador)
    const notif = emitidos.find(e => e.nombre === 'desafio.creado');
    expect(notif).toBeTruthy();
    expect(notif.payload.destinatarios).toEqual(['u2', 'u3']);
    expect(notif.payload.datos.desafio_id).toBe('d1');
  });

  test('con iniciarInmediato todos los participantes entran como aceptados', async () => {
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd2', estado: 'en_curso' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [],
      iniciarInmediato: true
    });
    const insertPart = supabase.llamadas.find(l => l.tabla === 'desafio_participantes' && l.op === 'insert');
    expect(insertPart.valor.every(f => f.estado === 'aceptado')).toBe(true);
  });

  test('sin invitados no emite notificación', async () => {
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd3', estado: 'en_curso' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [],
      iniciarInmediato: true
    });
    expect(emitidos.length).toBe(0);
  });

  test('tiempoLimiteSeg null → desafío SIN límite de tiempo (INSERT con NULL)', async () => {
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd4', estado: 'invitacion' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [],
      tiempoLimiteSeg: null
    });
    const ins = supabase.llamadas.find(l => l.tabla === 'desafios' && l.op === 'insert');
    expect(ins.valor.tiempo_limite_seg).toBeNull();
  });

  test('el límite de tiempo nunca baja de 1 minuto (mínimo 60 s)', async () => {
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd5', estado: 'invitacion' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [],
      tiempoLimiteSeg: 30 // por debajo del mínimo → se eleva a 60
    });
    const ins = supabase.llamadas.filter(l => l.tabla === 'desafios' && l.op === 'insert').pop();
    expect(ins.valor.tiempo_limite_seg).toBe(60);
  });
});

describe('terminarJugador (idempotencia y doble envío)', () => {
  test('dos llamadas seguidas producen un único resultado: una sola finalización y una sola notificación', async () => {
    // Modela el estado real de la BD: tras el primer UPDATE a 'finalizado',
    // las lecturas devuelven 'finalizado' (el segundo envío no re-finaliza).
    let estadoDesafio = 'en_curso';
    let updatesFinalizado = 0;
    let updatesTerminado = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: estadoDesafio, iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, mazo_nombre: 'Salmos' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'terminado', correctas: 8, total: 10, tiempo_ms: 60000 },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'terminado', correctas: 7, total: 10, tiempo_ms: 70000 }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') {
          updatesFinalizado++;
          estadoDesafio = 'finalizado';
        }
        if (tabla === 'desafio_participantes' && op === 'update' && q._valor.estado === 'terminado') updatesTerminado++;
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    const args = { correctas: 8, total: 10, tiempoMs: 60000 };
    await window.desafiosRepository.terminarJugador('d1', 'u1', args);
    await window.desafiosRepository.terminarJugador('d1', 'u1', args);

    const updates = supabase.llamadas.filter(l => l.tabla === 'desafio_participantes' && l.op === 'update' && l.valor && l.valor.estado === 'terminado');
    expect(updates.length).toBe(2); // ambas llamadas persisten el mismo estado (idempotente)
    expect(updates[0].valor.progreso).toBeNull(); // al terminar se limpia el progreso
    // El doble envío NO debe duplicar la finalización ni la notificación:
    expect(updatesFinalizado).toBe(1);
    expect(updatesTerminado).toBe(2);
    const finalizados = emitidos.filter(e => e.nombre === 'desafio.finalizado');
    expect(finalizados.length).toBe(1); // una sola notificación, no dos
    expect(finalizados[0].payload.destinatarios).toEqual(['u1', 'u2']);
  });

  test('si todos abandonan sin que nadie termine, el desafío se cierra igual (no queda colgado)', async () => {
    let updatesFinalizado = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, mazo_nombre: 'Salmos' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'abandonado', correctas: 0, total: 10 },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'abandonado', correctas: 0, total: 10 }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') updatesFinalizado++;
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.abandonar('d1', 'u1');
    expect(updatesFinalizado).toBe(1); // se cerró en 'finalizado' pese a no haber ganador
    const emitidosFinal = emitidos.filter(e => ['desafio.finalizado', 'desafio.cancelado'].includes(e.nombre));
    expect(emitidosFinal.length).toBe(1);
    expect(emitidosFinal[0].nombre).toBe('desafio.cancelado'); // sin resultado → cancelado
  });

  test('si un participante aún no ha terminado no se finaliza', async () => {
    let updatesFinalizado = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, mazo_nombre: 'Salmos' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'terminado', correctas: 8, total: 10, tiempo_ms: 60000 },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'en_juego', correctas: 2, total: 10, tiempo_ms: 30000 }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') updatesFinalizado++;
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.terminarJugador('d1', 'u1', { correctas: 8, total: 10, tiempoMs: 60000 });
    expect(updatesFinalizado).toBe(0);
    expect(emitidos.filter(e => e.nombre === 'desafio.finalizado').length).toBe(0);
  });
});

describe('marcarEnJuego (regresión: nunca sobrescribe un estado terminal)', () => {
  test('solo transiciona desde "aceptado" (filtro estado IN aceptado)', async () => {
    usarSupabase({
      respuesta: () => ({ data: null, error: null })
    });
    await window.desafiosRepository.marcarEnJuego('d1', 'u1');
    const update = supabase.llamadas.find(l => l.tabla === 'desafio_participantes' && l.op === 'update');
    expect(update).toBeTruthy();
    expect(update.valor).toEqual({ estado: 'en_juego' });
    // El filtro estado IN ['aceptado'] impide que una re-entrada tardía
    // revierta 'terminado'/'abandonado' → 'en_juego' (bucle de re-entrada
    // que machacaba los aciertos a 0 y dejaba el desafío sin cerrar).
    expect(update.filtros).toContainEqual(['estado', ['aceptado']]);
  });
});

describe('obtenerDesafio + RPC abandonar_vencidos', () => {
  test('invoca la RPC cuando hay candidatos vencidos y relee participantes si afectó', async () => {
    const rpcLlamadas = [];
    let relecturas = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, mazo_nombre: 'Salmos', sesion: [] }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          relecturas++;
          if (relecturas === 1) {
            return { data: [
              { usuario_id: 'u1', estado: 'terminado', correctas: 8, total: 10 },
              { usuario_id: 'u2', estado: 'en_juego', correctas: 0, total: 0 }
            ], error: null };
          }
          return { data: [
            { usuario_id: 'u1', estado: 'terminado', correctas: 8, total: 10 },
            { usuario_id: 'u2', estado: 'abandonado', correctas: 0, total: 0 }
          ], error: null };
        }
        return { data: null, error: null };
      },
      rpc: {
        desafio_abandonar_vencidos: (params) => { rpcLlamadas.push(params); return { data: 1 }; }
      }
    });
    const desafio = await window.desafiosRepository.obtenerDesafio('d1');
    expect(rpcLlamadas.length).toBe(1);
    expect(rpcLlamadas[0]).toEqual({ p_desafio_id: 'd1' });
    expect(relecturas).toBe(2); // releyó tras afectar
    const u2 = desafio.participantes.find(p => p.usuario_id === 'u2');
    expect(u2.estado).toBe('abandonado');
  });

  test('no invoca la RPC si nadie está en juego/aceptado', async () => {
    let rpcLlamadas = 0;
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, sesion: [] }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'terminado' },
            { usuario_id: 'u2', estado: 'terminado' }
          ], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => { rpcLlamadas++; return { data: 0 }; } }
    });
    await window.desafiosRepository.obtenerDesafio('d1');
    expect(rpcLlamadas).toBe(0);
  });
});

describe('notificacionesPendientes', () => {
  test('consulta los tipos nuevos y legacy de desafío', async () => {
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'notificaciones' && op === 'select') {
          return { data: [{ id: 'n1', tipo: 'desafio.creado', leida: false }], error: null };
        }
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.notificacionesPendientes('u1');
    const sel = supabase.llamadas.find(l => l.tabla === 'notificaciones' && l.op === 'select');
    expect(sel).toBeTruthy();
    const tipoFiltro = sel.filtros.find(([c]) => c === 'tipo');
    expect(tipoFiltro).toBeTruthy();
    expect(tipoFiltro[1]).toContain('desafio.creado');
    expect(tipoFiltro[1]).toContain('desafio.aceptado');
    expect(tipoFiltro[1]).toContain('desafio'); // legacy
    expect(sel.filtros).toContainEqual(['leida', false]);
  });

  test('sin sesión o sin supabase devuelve lista vacía', async () => {
    global.supabaseClient = null;
    await expect(window.desafiosRepository.notificacionesPendientes('u1')).resolves.toEqual([]);
  });
});

describe('guardarProgreso', () => {
  test('persiste el progreso en la fila del participante (idempotente)', async () => {
    let valorUpdate = null;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafio_participantes' && op === 'update') valorUpdate = q._valor;
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.guardarProgreso('d1', 'u1', { idx: 5, correctas: 4, incorrectas: 1 });
    expect(valorUpdate).toEqual({ progreso: { idx: 5, correctas: 4, incorrectas: 1 } });
  });
});

describe('responderInvitacion (idempotencia y reloj del servidor)', () => {
  test('si la RPC desafio_iniciar existe, el inicio se fija en el servidor (no con el reloj local)', async () => {
    let rpcIniciar = null;
    let updatesEnCurso = 0;
    const rpcLlamadas = [];
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'select') {
          // Un participante más (el rival) ya aceptó; este usuario es el último
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos', creador_id: 'u2' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' }
          ], error: null };
        }
        if (tabla === 'desafios' && op === 'update') updatesEnCurso++;
        return { data: null, error: null };
      },
      rpc: {
        desafio_iniciar: (params) => { rpcIniciar = params; rpcLlamadas.push(params); return { data: '2026-08-08T12:00:05.000Z' }; }
      }
    });
    const r = await window.desafiosRepository.responderInvitacion('d1', 'u1', true);
    expect(r.empezado).toBe(true);
    expect(rpcIniciar).toEqual({ p_desafio_id: 'd1' });
    // El cliente NO hace el update local de estado/iniciado_en (lo hace la RPC)
    const updates = supabase.llamadas.filter(l => l.tabla === 'desafios' && l.op === 'update');
    expect(updates.length).toBe(0);
    // Notificación de inicio emitida una sola vez
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(1);
  });

  test('doble clic en Aceptar no re-fija el inicio ni duplica la notificación', async () => {
    const iniciados = [];
    let estadoDesafio = 'en_curso'; // el primer clic ya inició
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: estadoDesafio, mazo_nombre: 'Salmos', creador_id: 'u2' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' }
          ], error: null };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'en_curso') {
          iniciados.push(q._valor.iniciado_en);
          estadoDesafio = 'en_curso';
        }
        return { data: null, error: null };
      },
      rpc: {
        // La RPC real fija el estado en el servidor: el mock lo refleja
        desafio_iniciar: () => { estadoDesafio = 'en_curso'; return { data: '2026-08-08T12:00:05.000Z' }; }
      }
    });
    // Primer clic (estado invitacion) → inicia
    estadoDesafio = 'invitacion';
    await window.desafiosRepository.responderInvitacion('d1', 'u1', true);
    // Segundo clic (estado ya en_curso) → no debe volver a iniciar ni avisar
    await window.desafiosRepository.responderInvitacion('d1', 'u1', true);

    const inicios = emitidos.filter(e => e.nombre === 'desafio.iniciado');
    expect(inicios.length).toBe(1); // UNA sola notificación de inicio
    expect(iniciados.length).toBe(0); // con RPC, el cliente no hace updates locales
  });

  test('sin la RPC desafio_iniciar (BD sin 031) usa el flujo antiguo con reloj local', async () => {
    let updates = 0;
    let rpcIntentos = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos', creador_id: 'u2' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' }
          ], error: null };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'en_curso') updates++;
        return { data: null, error: null };
      },
      rpc: {
        desafio_iniciar: () => { rpcIntentos++; throw new Error('PGRST202: no such function'); }
      }
    });
    const r = await window.desafiosRepository.responderInvitacion('d1', 'u1', true);
    expect(r.empezado).toBe(true);
    expect(updates).toBe(1); // fallback: update local de estado
    expect(rpcIntentos).toBe(1);
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(1);
  });

  test('si el desafío ya está en_curso al aceptar (llegó tarde), no avisa de inicio', async () => {
    const rpcLlamadas = [];
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', mazo_nombre: 'Salmos', creador_id: 'u2' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' }
          ], error: null };
        }
        return { data: null, error: null };
      },
      rpc: {
        desafio_iniciar: (params) => { rpcLlamadas.push(params); return { data: '2026-08-08T12:00:05.000Z' }; }
      }
    });
    const r = await window.desafiosRepository.responderInvitacion('d1', 'u1', true);
    expect(r.empezado).toBe(true);
    expect(rpcLlamadas.length).toBe(0); // no se intenta iniciar: ya está en curso
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(0);
  });
});

describe('revancha', () => {
  test('crea un desafío nuevo con el mismo mazo y participantes', async () => {
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd4', estado: 'invitacion' }, error: null };
        return { data: null, error: null };
      }
    });
    const creador = { id: 'u1', nombre_completo: 'Ana' };
    const resultado = await window.desafiosRepository.revancha({
      creador,
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: []
    });
    expect(resultado.id).toBe('d4');
    // Los invitados vuelven a ser invitados (no aceptados)
    const insertPart = supabase.llamadas.find(l => l.tabla === 'desafio_participantes' && l.op === 'insert');
    expect(insertPart.valor.find(f => f.usuario_id === 'u2').estado).toBe('invitado');
  });
});

// ============================================================
// abandonar: notificación al rival (desafio.abandonado)
// ============================================================
describe('abandonar (notificación al rival)', () => {
  test('abandonar a mitad de partida avisa al rival con un toast', async () => {
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: 120, mazo_nombre: 'Salmos' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'en_juego' },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'en_juego' }
            ],
            error: null
          };
        }
        if (tabla === 'perfiles' && op === 'select') {
          return { data: [{ id: 'u1', nombre_completo: 'Ana', username: 'ana' }], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.abandonar('d1', 'u1');
    const abandonos = emitidos.filter(e => e.nombre === 'desafio.abandonado');
    expect(abandonos.length).toBe(1);
    // Solo el rival recibe el aviso (nunca el que abandona)
    expect(abandonos[0].payload.destinatarios).toEqual(['u2']);
    expect(abandonos[0].payload.jugador).toBe('Ana');
    expect(abandonos[0].payload.mazo).toBe('Salmos');
  });

  test('abandonar desde la pantalla de espera (invitación) NO notifica', async () => {
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos' }], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.abandonar('d1', 'u1');
    expect(emitidos.filter(e => e.nombre === 'desafio.abandonado').length).toBe(0);
  });
});

// ============================================================
// eliminarInvitado: expulsar a quien no responde y empezar con los listos
// ============================================================
describe('eliminarInvitado (expulsar a quien no responde)', () => {
  test('marca eliminado (solo desde invitado), completa su notificación y arranca con los listos', async () => {
    const notifUpdates = [];
    let rpcIniciar = null;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'notificaciones' && op === 'select') {
          return { data: [{ id: 'n3' }], error: null };
        }
        if (tabla === 'notificaciones' && op === 'update') notifUpdates.push(q._valor);
        if (tabla === 'desafio_participantes' && op === 'select') {
          // Tras la expulsión: creador + rival listos + el eliminado
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' },
            { usuario_id: 'u3', estado: 'eliminado' }
          ], error: null };
        }
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos' }], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_iniciar: (params) => { rpcIniciar = params; return { data: '2026-08-08T12:00:00Z' }; } }
    });
    await window.desafiosRepository.eliminarInvitado('d1', 'u3');
    // Expulsado con filtro de estado 'invitado' (nunca a quien ya aceptó/jugó)
    const expulsiones = supabase.llamadas.filter(l => l.tabla === 'desafio_participantes' && l.op === 'update' && l.valor && l.valor.estado === 'eliminado');
    expect(expulsiones.length).toBe(1);
    expect(expulsiones[0].filtros).toEqual([['desafio_id', 'd1'], ['usuario_id', 'u3'], ['estado', 'invitado']]);
    // Notificación del expulsado completada (ya no puede aceptar)
    expect(notifUpdates).toEqual([{ estado: 'completada' }]);
    // Arrancó con los que estaban listos
    expect(rpcIniciar).toEqual({ p_desafio_id: 'd1' });
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(1);
    expect(emitidos.find(e => e.nombre === 'desafio.iniciado').payload.destinatarios).toEqual(['u1', 'u2']);
  });

  test('si la BD no tiene la migración 037 (CHECK sin eliminado), borra la fila y arranca igual', async () => {
    let rpcIniciar = null;
    const deletes = [];
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafio_participantes' && op === 'update') {
          // CHECK constraint aún sin 'eliminado' (migración 037 no aplicada)
          return { error: { code: '23514', message: 'violates check constraint' } };
        }
        if (tabla === 'desafio_participantes' && op === 'delete') {
          deletes.push(q._filtros);
          return { data: null, error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' }
          ], error: null };
        }
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos' }], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_iniciar: (params) => { rpcIniciar = params; return { data: '2026-08-08T12:00:00Z' }; } }
    });
    await window.desafiosRepository.eliminarInvitado('d1', 'u3');
    // Borrado con filtro de estado 'invitado'
    expect(deletes.length).toBe(1);
    expect(deletes[0]).toEqual([['desafio_id', 'd1'], ['usuario_id', 'u3'], ['estado', 'invitado']]);
    // Arrancó con los que quedaron listos
    expect(rpcIniciar).toEqual({ p_desafio_id: 'd1' });
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(1);
  });

  test('si tras la expulsión solo queda el creador NO arranca', async () => {
    let rpcIniciar = null;
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'eliminado' }
          ], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_iniciar: (params) => { rpcIniciar = params; return { data: 'x' }; } }
    });
    await window.desafiosRepository.eliminarInvitado('d1', 'u2');
    expect(rpcIniciar).toBe(null);
    expect(emitidos.filter(e => e.nombre === 'desafio.iniciado').length).toBe(0);
  });

  test('responderInvitacion ignora a los eliminados: basta con que los activos acepten', async () => {
    let rpcIniciar = null;
    usarSupabase({
      respuesta(tabla, op, modo) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'invitacion', mazo_nombre: 'Salmos', creador_id: 'u1' }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [
            { usuario_id: 'u1', estado: 'aceptado' },
            { usuario_id: 'u2', estado: 'aceptado' },
            { usuario_id: 'u3', estado: 'eliminado' }
          ], error: null };
        }
        return { data: null, error: null };
      },
      rpc: { desafio_iniciar: (params) => { rpcIniciar = params; return { data: '2026-08-08T12:00:00Z' }; } }
    });
    const r = await window.desafiosRepository.responderInvitacion('d1', 'u2', true);
    expect(r.empezado).toBe(true);
    expect(rpcIniciar).toEqual({ p_desafio_id: 'd1' });
  });

  test('_verificarFinalizado trata eliminado como estado terminal (el desafío se cierra)', async () => {
    let finalizado = false;
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'update') finalizado = true;
        return { data: null, error: null };
      }
    });
    const ok = await window.desafiosRepository._verificarFinalizado(
      { id: 'd1', estado: 'en_curso', mazo_nombre: 'Salmos', finaliza_primer_terminado: false },
      [
        { usuario_id: 'u1', estado: 'terminado', correctas: 8, total: 10 },
        { usuario_id: 'u2', estado: 'eliminado' }
      ]
    );
    expect(ok).toBe(true);
    expect(finalizado).toBe(true);
  });

// ============================================================
// sweepVencidos: cierre automático de desafíos abiertos
// ============================================================
describe('sweepVencidos (ningún desafío queda abierto para siempre)', () => {
  test('con la migración 038 llama una sola RPC global y devuelve el conteo', async () => {
    let abandonarLlamadas = 0;
    usarSupabase({
      rpc: {
        desafio_cerrar_vencidos: () => ({ data: 7, error: null }),
        desafio_abandonar_vencidos: () => { abandonarLlamadas += 1; return { data: 0 }; }
      }
    });
    const total = await window.desafiosRepository.sweepVencidos();
    expect(total).toBe(7);
    expect(abandonarLlamadas).toBe(0);
    const rpcs = supabase.llamadas.filter(l => l.rpc).map(l => l.rpc);
    expect(rpcs).toEqual(['desafio_cerrar_vencidos']);
  });

  test('sin la migración 038 (RPC no existe) barre los desafíos en_curso del usuario con la RPC antigua', async () => {
    const abandonados = [];
    global.store = { obtener: (c) => c === 'usuario' ? { id: 'u1' } : null };
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [{ desafio_id: 'd1' }, { desafio_id: 'd2' }], error: null };
        }
        return { data: null, error: null };
      },
      rpc: {
        desafio_cerrar_vencidos: () => ({ error: { message: 'PGRST202: function not found' } }),
        desafio_abandonar_vencidos: (params) => { abandonados.push(params); return { data: 0 }; }
      }
    });
    const total = await window.desafiosRepository.sweepVencidos();
    expect(total).toBe(0);
    // Solo los desafíos del usuario, con la RPC antigua por cada uno
    expect(abandonados).toEqual([{ p_desafio_id: 'd1' }, { p_desafio_id: 'd2' }]);
  });

  test('si la RPC antigua marcó a alguien, relee el desafío para finalizarlo', async () => {
    let releido = 0;
    global.store = { obtener: (c) => c === 'usuario' ? { id: 'u1' } : null };
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafio_participantes' && op === 'select') {
          return { data: [{ desafio_id: 'd1' }], error: null };
        }
        if (tabla === 'desafios' && op === 'select') { releido += 1; return { data: null, error: null }; }
        return { data: null, error: null };
      },
      rpc: {
        desafio_cerrar_vencidos: () => ({ error: { message: 'PGRST202: function not found' } }),
        desafio_abandonar_vencidos: () => ({ data: 2 })
      }
    });
    const total = await window.desafiosRepository.sweepVencidos();
    expect(total).toBe(2);
    expect(releido).toBeGreaterThan(0);
  });

  test('sin sesión no barre nada', async () => {
    global.store = { obtener: () => null };
    const rpcs = [];
    usarSupabase({
      rpc: {
        desafio_cerrar_vencidos: () => ({ error: { message: 'x' } }),
        desafio_abandonar_vencidos: (params) => { rpcs.push(params); return { data: 1 }; }
      }
    });
    const total = await window.desafiosRepository.sweepVencidos();
    expect(total).toBe(0);
    expect(rpcs.length).toBe(0);
  });
});

  test('_verificarFinalizado NO cierra si un activo sigue en juego y hay un eliminado', async () => {
    let finalizado = false;
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'update') finalizado = true;
        return { data: null, error: null };
      }
    });
    const ok = await window.desafiosRepository._verificarFinalizado(
      { id: 'd1', estado: 'en_curso', mazo_nombre: 'Salmos', finaliza_primer_terminado: false },
      [
        { usuario_id: 'u1', estado: 'terminado' },
        { usuario_id: 'u2', estado: 'en_juego' },
        { usuario_id: 'u3', estado: 'eliminado' }
      ]
    );
    expect(ok).toBe(false);
    expect(finalizado).toBe(false);
  });
});

// ============================================================
// Modo carrera: "El primero que acabe" (migración 036)
// ============================================================
describe('modo carrera (finaliza_primer_terminado)', () => {
  test('crearDesafio con finalizaPrimerTerminado=true persiste la columna', async () => {
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd5', estado: 'invitacion' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: [],
      finalizaPrimerTerminado: true
    });
    const insert = supabase.llamadas.find(l => l.tabla === 'desafios' && l.op === 'insert');
    expect(insert.valor.finaliza_primer_terminado).toBe(true);
    // Sin límite de tiempo: la carrera no tiene reloj
    expect(insert.valor.tiempo_limite_seg).toBeNull();
  });

  test('crearDesafio por defecto NO incluye la columna (compatible con BD sin migrar)', async () => {
    usarSupabase({
      respuesta(tabla, op) {
        if (tabla === 'desafios' && op === 'insert') return { data: { id: 'd6', estado: 'invitacion' }, error: null };
        return { data: null, error: null };
      }
    });
    await window.desafiosRepository.crearDesafio({
      creador: { id: 'u1' },
      participantes: [{ usuario_id: 'u2' }],
      mazo: { id: 'm1', nombre: 'Salmos' },
      sesion: []
    });
    const insert = supabase.llamadas.find(l => l.tabla === 'desafios' && l.op === 'insert');
    expect('finaliza_primer_terminado' in insert.valor).toBe(false);
  });

  test('si alguien termina en modo carrera, se finaliza y el rival se cierra con su progreso', async () => {
    let updatesFinalizado = 0;
    const updatesTerminados = [];
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: null, mazo_nombre: 'Salmos', finaliza_primer_terminado: true }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'terminado', correctas: 9, total: 10, tiempo_ms: 50000, progreso: null },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'en_juego', correctas: 0, total: null, tiempo_ms: null, progreso: { idx: 5, correctas: 3, incorrectas: 1 } }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') updatesFinalizado++;
        if (tabla === 'desafio_participantes' && op === 'update') updatesTerminados.push(q._valor);
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    // u1 termina su turno → en carrera eso cierra el desafío al instante
    await window.desafiosRepository.terminarJugador('d1', 'u1', { correctas: 9, total: 10, tiempoMs: 50000 });

    expect(updatesFinalizado).toBe(1);
    // El rival (u2, aún en_juego) se fuerza a 'terminado' con su progreso REAL
    const cierre = updatesTerminados.find(u => u && u.correctas === 3 && u.estado === 'terminado');
    expect(cierre).toBeTruthy();
    expect(cierre.total).toBe(10); // hereda el total del que terminó
    expect(cierre.tiempo_ms).toBeGreaterThan(0); // tiempo transcurrido al cerrar
    expect(cierre.progreso).toBeNull();
    const finalizados = emitidos.filter(e => e.nombre === 'desafio.finalizado');
    expect(finalizados.length).toBe(1);
  });

  test('en modo carrera, si NADIE ha terminado aún NO se finaliza', async () => {
    let updatesFinalizado = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: null, mazo_nombre: 'Salmos', finaliza_primer_terminado: true }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'en_juego', correctas: 0, total: null, progreso: { idx: 3, correctas: 2 } },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'en_juego', correctas: 0, total: null, progreso: { idx: 1, correctas: 0 } }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') updatesFinalizado++;
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.abandonar('d1', 'u1');
    // u1 abandonó pero u2 sigue jugando → la carrera continúa (no se cierra)
    expect(updatesFinalizado).toBe(0);
    expect(emitidos.filter(e => e.nombre === 'desafio.finalizado').length).toBe(0);
  });

  test('si todos abandonan en carrera sin que nadie termine, se cierra como cancelado', async () => {
    let updatesFinalizado = 0;
    usarSupabase({
      respuesta(tabla, op, modo, q) {
        if (tabla === 'desafios' && op === 'select') {
          return { data: [{ id: 'd1', estado: 'en_curso', iniciado_en: '2026-08-08T10:00:00Z', tiempo_limite_seg: null, mazo_nombre: 'Salmos', finaliza_primer_terminado: true }], error: null };
        }
        if (tabla === 'desafio_participantes' && op === 'select') {
          return {
            data: [
              { id: 'p1', desafio_id: 'd1', usuario_id: 'u1', estado: 'abandonado', correctas: 0, total: null },
              { id: 'p2', desafio_id: 'd1', usuario_id: 'u2', estado: 'abandonado', correctas: 0, total: null }
            ],
            error: null
          };
        }
        if (tabla === 'desafios' && op === 'update' && q._valor.estado === 'finalizado') updatesFinalizado++;
        return { data: null, error: null };
      },
      rpc: { desafio_abandonar_vencidos: () => ({ data: 0 }) }
    });
    await window.desafiosRepository.abandonar('d1', 'u1');
    expect(updatesFinalizado).toBe(1);
    const cerrados = emitidos.filter(e => ['desafio.finalizado', 'desafio.cancelado'].includes(e.nombre));
    expect(cerrados[0].nombre).toBe('desafio.cancelado');
  });
});
