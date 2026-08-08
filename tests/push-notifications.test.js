import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

// Carga el script clásico en un contexto con `module`/`exports` para poder
// acceder a las funciones puras y a la clase del servicio.
function cargarConExports(rutaRelativa) {
  const codigo = readFileSync(join(srcDir, rutaRelativa), 'utf-8');
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', codigo);
  fn(mod, mod.exports);
  return mod.exports;
}

let mod;
let PushService;

beforeAll(() => {
  global.window = global;
  mod = cargarConExports('js/services/push-notification-service.js');
  PushService = mod.PushNotificationService;
  // NotificationService para probar la integración emitir → enviarPush
  cargarConExports('js/core/notification-service.js');
});

beforeEach(() => {
  // Store aislado por test
  const estado = { usuario: { id: 'u1', rol: 'usuario', preferencias: {} } };
  global.store = {
    obtener: (clave) => estado[clave],
    actualizar: (clave, valor) => { estado[clave] = valor; }
  };
  global.router = { navegar: () => {} };
  global.notificacionesRepository = {
    actualizarEstado: async () => {}
  };
  global.supabaseClient = null;
  global.Capacitor = undefined;
});

// Token FCM realista (Android ~152 caracteres alfanuméricos con - y _)
const TOKEN_OK = 'cXz7kR2mQ9vL4nP8sT1wY5uA0dF6gH3jB' +
  'eI2oK7lM4nO9pQ1rS5tU8vW0xY3zA6bC' +
  'dE4fG7hJ1kL5mN8pQ2rT6vX0yZ3aB4cD' +
  'eF5gH8jK1lM3nP6qR9sT2uV5wX8yZ0aB';

// ============================================================
// Validación de tokens FCM
// ============================================================
describe('tokenValido()', () => {
  test('acepta un token FCM de Android realista', () => {
    expect(mod.tokenValido(TOKEN_OK)).toBe(true);
  });

  test('rechaza valores vacíos o no string', () => {
    expect(mod.tokenValido('')).toBe(false);
    expect(mod.tokenValido(null)).toBe(false);
    expect(mod.tokenValido(undefined)).toBe(false);
    expect(mod.tokenValido(12345)).toBe(false);
  });

  test('rechaza tokens demasiado cortos', () => {
    expect(mod.tokenValido('abc')).toBe(false);
    expect(mod.tokenValido('a'.repeat(39))).toBe(false);
    expect(mod.tokenValido('a'.repeat(40))).toBe(true);
  });

  test('rechaza caracteres no permitidos (espacios, símbolos raros)', () => {
    expect(mod.tokenValido('abc def ghi jkl mno pqr stu vwx yz 123 456 789 012 345 678')).toBe(false);
    expect(mod.tokenValido('a!b@c#d$e%f^g&h*i(j)k_l-m+n=o'.repeat(3))).toBe(false);
  });
});

// ============================================================
// Mapeo categoría → canal Android
// ============================================================
describe('canalDe()', () => {
  test('mapea cada categoría al canal correcto', () => {
    expect(mod.canalDe('desafios')).toBe('desafios');
    expect(mod.canalDe('examenes')).toBe('examenes');
    expect(mod.canalDe('estudio')).toBe('recordatorios');
    expect(mod.canalDe('grupos')).toBe('general');
    expect(mod.canalDe('logros')).toBe('general');
    expect(mod.canalDe('sistema')).toBe('sistema');
    expect(mod.canalDe('anuncios')).toBe('sistema');
  });

  test('categoría desconocida cae en el canal general', () => {
    expect(mod.canalDe('otra')).toBe('general');
    expect(mod.canalDe(undefined)).toBe('general');
    expect(mod.canalDe(null)).toBe('general');
  });
});

// ============================================================
// Navegación desde el payload de la notificación
// ============================================================
describe('urlDe()', () => {
  test('usa la url directa del payload', () => {
    expect(mod.urlDe({ url: '/desafio/7', tipo: 'desafio.creado' })).toBe('/desafio/7');
  });

  test('deriva la ruta de un desafío desde d.desafio_id', () => {
    expect(mod.urlDe({ tipo: 'desafio.creado', 'd.desafio_id': '42' })).toBe('/desafio/42');
  });

  test('deriva la ruta de un examen corregido', () => {
    expect(mod.urlDe({ tipo: 'examen_corregido', 'd.examen_id': '9' })).toBe('/tomar/9');
  });

  test('deriva la ruta de un examen entregado (a corregir)', () => {
    expect(mod.urlDe({ tipo: 'examen_entregado', 'd.examen_id': '9' })).toBe('/corregir/9');
  });

  test('mazos y recordatorios apuntan a memorización', () => {
    expect(mod.urlDe({ tipo: 'mazo_nuevo' })).toBe('/memorizacion');
    expect(mod.urlDe({ tipo: 'recordatorio.repasos' })).toBe('/memorizacion');
  });

  test('sin url ni tipo reconocido devuelve null (no navega)', () => {
    expect(mod.urlDe({})).toBe(null);
    expect(mod.urlDe(null)).toBe(null);
    expect(mod.urlDe({ tipo: 'anuncio' })).toBe(null);
  });
});

// ============================================================
// Conversión fila del historial → payload de la Edge Function
// ============================================================
describe('aPayloadPush()', () => {
  test('mapea los campos de la fila al payload FCM', () => {
    const fila = {
      id: 'n1',
      usuario_id: 'u2',
      tipo: 'desafio.creado',
      categoria: 'desafios',
      titulo: 'Ana te ha desafiado',
      cuerpo: 'Mazo: Salmos 23',
      datos: { desafio_id: 42, url: '/desafio/42' }
    };
    expect(mod.aPayloadPush(fila)).toEqual({
      usuario_id: 'u2',
      tipo: 'desafio.creado',
      categoria: 'desafios',
      titulo: 'Ana te ha desafiado',
      cuerpo: 'Mazo: Salmos 23',
      datos: { desafio_id: 42, url: '/desafio/42' },
      url: '/desafio/42',
      id: 'n1'
    });
  });

  test('fila inválida o sin usuario devuelve null', () => {
    expect(mod.aPayloadPush(null)).toBe(null);
    expect(mod.aPayloadPush({})).toBe(null);
    expect(mod.aPayloadPush({ titulo: 'sin usuario' })).toBe(null);
  });

  test('soporta filas sin datos (payload mínimo)', () => {
    const payload = mod.aPayloadPush({ usuario_id: 'u2', tipo: 'x', titulo: 'Hola' });
    expect(payload.datos).toEqual({});
    expect(payload.url).toBe(null);
    expect(payload.categoria).toBe('sistema');
  });
});

// ============================================================
// Detección de runtime nativo
// ============================================================
describe('esCapacitor()', () => {
  test('true cuando Capacitor declara plataforma nativa', () => {
    global.Capacitor = { isNativePlatform: () => true };
    expect(mod.esCapacitor()).toBe(true);
  });

  test('false en navegador web o sin Capacitor', () => {
    global.Capacitor = undefined;
    expect(mod.esCapacitor()).toBe(false);
    global.Capacitor = { isNativePlatform: () => false };
    expect(mod.esCapacitor()).toBe(false);
    global.Capacitor = {};
    expect(mod.esCapacitor()).toBe(false);
  });
});

// ============================================================
// Envío a destinatarios ajenos (integrado desde notification-service)
// ============================================================
describe('PushNotificationService.enviarPush()', () => {
  test('es no-op en web (sin Capacitor)', async () => {
    const invocado = [];
    global.supabaseClient = { functions: { invoke: async (n, o) => { invocado.push([n, o]); return { error: null }; } } };
    const s = new PushService();
    await s.enviarPush([{ usuario_id: 'u2', tipo: 'x' }]);
    expect(invocado.length).toBe(0);
  });

  test('invoca la Edge Function con el payload de las filas ajenas', async () => {
    let invocado = null;
    global.supabaseClient = {
      functions: {
        invoke: async (nombre, opciones) => { invocado = { nombre, opciones }; return { error: null }; }
      }
    };
    const s = new PushService();
    s._capacitor = true;
    const filas = [
      { id: 'n1', usuario_id: 'u2', tipo: 'desafio.creado', categoria: 'desafios', titulo: 'Reto', cuerpo: 'Mazo', datos: { url: '/desafio/1' } },
      { id: 'n2', usuario_id: 'u3', tipo: 'examen.publicado', categoria: 'examenes', titulo: 'Examen', cuerpo: '', datos: {} }
    ];
    await s.enviarPush(filas);
    expect(invocado.nombre).toBe('enviar-push');
    const notificaciones = invocado.opciones.body.notificaciones;
    expect(notificaciones.length).toBe(2);
    expect(notificaciones[0].usuario_id).toBe('u2');
    expect(notificaciones[0].url).toBe('/desafio/1');
    expect(notificaciones[1].usuario_id).toBe('u3');
  });

  test('descarta filas sin usuario_id y no llama si no queda ninguna', async () => {
    let llamadas = 0;
    global.supabaseClient = { functions: { invoke: async () => { llamadas += 1; return { error: null }; } } };
    const s = new PushService();
    s._capacitor = true;
    await s.enviarPush([{ titulo: 'sin usuario' }, null, undefined]);
    expect(llamadas).toBe(0);
  });

  test('no lanza si la Edge Function no está desplegada', async () => {
    global.supabaseClient = { functions: { invoke: async () => { throw new Error('functionsHttpError 404'); } } };
    const s = new PushService();
    s._capacitor = true;
    await expect(s.enviarPush([{ usuario_id: 'u2', tipo: 'x' }])).resolves.toBeUndefined();
  });
});

// ============================================================
// Registro del token en Supabase
// ============================================================
describe('registro y guardado del token', () => {
  test('un token válido se guarda con upsert por token_fcm', async () => {
    let upsertLlamada = null;
    global.supabaseClient = {
      from: () => ({
        upsert: async (fila, opciones) => { upsertLlamada = { fila, opciones }; return { error: null }; }
      })
    };
    const s = new PushService();
    await s._alRecibirToken(TOKEN_OK);
    expect(upsertLlamada).not.toBe(null);
    expect(upsertLlamada.opciones.onConflict).toBe('token_fcm');
    expect(upsertLlamada.fila.token_fcm).toBe(TOKEN_OK);
    expect(upsertLlamada.fila.usuario_id).toBe('u1');
    expect(upsertLlamada.fila.plataforma).toBe('android');
    expect(upsertLlamada.fila.activo).toBe(true);
    expect(s._token).toBe(TOKEN_OK);
  });

  test('un token inválido se ignora sin tocar Supabase', async () => {
    let llamadas = 0;
    global.supabaseClient = { from: () => ({ upsert: async () => { llamadas += 1; return { error: null }; } }) };
    const s = new PushService();
    await s._alRecibirToken('token-corto');
    expect(llamadas).toBe(0);
    expect(s._token).toBe(null);
  });

  test('sin sesión no se guarda el token', async () => {
    let llamadas = 0;
    global.store = { obtener: () => null };
    global.supabaseClient = { from: () => ({ upsert: async () => { llamadas += 1; return { error: null }; } }) };
    const s = new PushService();
    await s._alRecibirToken(TOKEN_OK);
    expect(llamadas).toBe(0);
  });
});

// ============================================================
// Navegación al pulsar la notificación
// ============================================================
describe('_alPulsar()', () => {
  test('navega al destino cuando hay sesión', () => {
    const navegadas = [];
    global.router = { navegar: (r) => navegadas.push(r) };
    const s = new PushService();
    s._alPulsar({ notification: { data: { url: '/desafio/3', notifId: 'n9' } } });
    expect(navegadas).toEqual(['/desafio/3']);
    expect(s._accionPendiente).toBe(null);
  });

  test('marca la fila como completada cuando el payload trae notifId', async () => {
    const estados = [];
    global.notificacionesRepository = { actualizarEstado: async (id, est) => estados.push([id, est]) };
    const s = new PushService();
    s._alPulsar({ notification: { data: { url: '/examenes', notifId: 'n9' } } });
    await Promise.resolve();
    expect(estados).toEqual([['n9', 'completada']]);
  });

  test('guarda acción pendiente si aún no hay sesión (arranque en frío)', () => {
    global.store = { obtener: () => null };
    const s = new PushService();
    s._alPulsar({ notification: { data: { url: '/desafio/3' } } });
    expect(s._accionPendiente).toEqual({ url: '/desafio/3' });
  });

  test('sin url no navega ni guarda pendiente', () => {
    const navegadas = [];
    global.router = { navegar: (r) => navegadas.push(r) };
    const s = new PushService();
    s._alPulsar({ notification: { data: { tipo: 'anuncio' } } });
    expect(navegadas).toEqual([]);
    expect(s._accionPendiente).toBe(null);
  });

  test('_procesarAccionPendiente navega cuando llega la sesión', async () => {
    const navegadas = [];
    global.router = { navegar: (r) => navegadas.push(r) };
    const s = new PushService();
    s._accionPendiente = { url: '/memorizacion' };
    s._procesarAccionPendiente();
    expect(s._accionPendiente).toBe(null);
    await new Promise((r) => setTimeout(r, 700));
    expect(navegadas).toEqual(['/memorizacion']);
  });
});

// ============================================================
// Logout: desactivación de tokens
// ============================================================
describe('desactivarTokens()', () => {
  test('desactiva todos los tokens del usuario y limpia el token local', async () => {
    const llamadas = [];
    const encadenable = (promesa) => ({
      then: (onOk, onErr) => promesa.then(onOk, onErr),
      catch: (onErr) => promesa.catch(onErr)
    });
    global.supabaseClient = {
      from: () => ({
        update: (obj) => {
          llamadas.push(['update', obj]);
          const promesa = Promise.resolve({ error: null });
          return {
            eq: (col, val) => { llamadas.push(['eq', col, val]); return encadenable(promesa); }
          };
        }
      })
    };
    const s = new PushService();
    s._usuarioId = 'u1';
    s._token = TOKEN_OK;
    await s.desactivarTokens();
    expect(llamadas).toContainEqual(['update', { activo: false, ultima_actividad: expect.any(String) }]);
    expect(llamadas).toContainEqual(['eq', 'usuario_id', 'u1']);
    expect(s._token).toBe(null);
  });

  test('sin usuarioId registrado es no-op', async () => {
    let llamadas = 0;
    global.supabaseClient = { from: () => ({ update: () => ({ eq: () => { llamadas += 1; return Promise.resolve({}); } }) }) };
    const s = new PushService();
    await s.desactivarTokens();
    expect(llamadas).toBe(0);
  });
});

// ============================================================
// Integración con NotificationService.emitir()
// ============================================================
describe('integración emitir() → enviarPush()', () => {
  test('tras persistir, envía push solo a los destinatarios ajenos', async () => {
    let invocado = null;
    global.supabaseClient = {
      functions: { invoke: async (nombre, opciones) => { invocado = { nombre, opciones }; return { error: null }; } }
    };
    global.notificacionesRepository = {
      insertarFilas: async (filas) => filas,
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const push = new PushService();
    push._capacitor = true;
    global.pushNotificationService = push;

    await window.notificationService.emitir('desafio.creado', {
      creador: 'Ana', mazo: 'Salmos', desafioId: 5,
      destinatarios: ['u2'],
      datos: { desafio_id: 5 }
    });

    expect(invocado).not.toBe(null);
    expect(invocado.nombre).toBe('enviar-push');
    const notificaciones = invocado.opciones.body.notificaciones;
    expect(notificaciones.length).toBe(1);
    expect(notificaciones[0].usuario_id).toBe('u2');
  });

  test('los eventos propios no generan push (el dispositivo ya los muestra in-app)', async () => {
    let llamadas = 0;
    global.supabaseClient = { functions: { invoke: async () => { llamadas += 1; return { error: null }; } } };
    global.notificacionesRepository = {
      insertarFilas: async (filas) => filas,
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const push = new PushService();
    push._capacitor = true;
    global.pushNotificationService = push;

    await window.notificationService.emitir('estudio.completado', { libro: 'Juan', capitulo: 3 });
    expect(llamadas).toBe(0);
  });

  test('no lanza si la persistencia falla (el push no puede romper emitir)', async () => {
    let invocado = null;
    global.supabaseClient = {
      functions: { invoke: async (nombre, opciones) => { invocado = { nombre, opciones }; return { error: null }; } }
    };
    global.notificacionesRepository = {
      insertarFilas: async () => { throw new Error('fallo de red'); },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const push = new PushService();
    push._capacitor = true;
    global.pushNotificationService = push;

    await expect(window.notificationService.emitir('desafio.creado', {
      creador: 'Ana', mazo: 'Salmos', desafioId: 6,
      destinatarios: ['u2'],
      datos: { desafio_id: 6 }
    })).resolves.toBe(null);
    expect(invocado).toBe(null);
  });
});

// ============================================================
// Canales Android
// ============================================================
describe('canales Android', () => {
  test('existen los 5 canales requeridos con nombre y descripción', () => {
    const ids = mod.CANALES.map((c) => c.id);
    expect(ids).toEqual(['general', 'desafios', 'examenes', 'recordatorios', 'sistema']);
    for (const canal of mod.CANALES) {
      expect(canal.nombre).toBeTruthy();
      expect(canal.descripcion).toBeTruthy();
      expect(Number.isInteger(canal.importancia)).toBe(true);
    }
  });
});
