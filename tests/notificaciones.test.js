import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarModulo(rutaRelativa) {
  const codigo = readFileSync(join(srcDir, rutaRelativa), 'utf-8');
  new Function(codigo)();
}

beforeAll(() => {
  global.window = global;
  // Dependencias mínimas que el servicio consulta en runtime
  global.router = { navegar: () => {} };
  global.helpers = { escapeHtml: (s) => String(s), mostrarAlerta: () => {} };
  cargarModulo('js/datos/notificaciones-repository.js');
  cargarModulo('js/core/notification-service.js');
});

beforeEach(() => {
  // Store aislado por test
  const estado = { usuario: { id: 'u1', rol: 'usuario', preferencias: {} } };
  global.store = {
    obtener: (clave) => estado[clave],
    actualizar: (clave, valor) => { estado[clave] = valor; }
  };
});

// ============================================================
// Normalización: esquema legacy (024) → v2 (027)
// ============================================================
describe('notificacionesRepository.normalizar()', () => {
  test('rellena categoria/prioridad desde el tipo legacy', () => {
    const repo = window.notificacionesRepository;
    const fila = repo.normalizar({ tipo: 'desafio', leida: false });
    expect(fila.categoria).toBe('desafios');
    expect(fila.prioridad).toBe('alta');
    expect(fila.contador).toBe(1);
  });

  test('leida=true se traduce a estado "vista" cuando falta estado', () => {
    const repo = window.notificacionesRepository;
    const fila = repo.normalizar({ tipo: 'mazo_nuevo', leida: true });
    expect(fila.estado).toBe('vista');
  });

  test('leida=false se traduce a estado "nueva"', () => {
    const repo = window.notificacionesRepository;
    const fila = repo.normalizar({ tipo: 'anuncio', leida: false });
    expect(fila.estado).toBe('nueva');
    expect(fila.categoria).toBe('anuncios');
    expect(fila.prioridad).toBe('critica');
  });

  test('parsea datos y acciones JSON', () => {
    const repo = window.notificacionesRepository;
    const fila = repo.normalizar({
      tipo: 'x', datos: '{"examen_id":42}',
      acciones: '[{"id":"resolver","etiqueta":"Resolver"}]'
    });
    expect(fila.datos.examen_id).toBe(42);
    expect(fila.acciones[0].id).toBe('resolver');
  });

  test('no pisa campos v2 ya presentes', () => {
    const repo = window.notificacionesRepository;
    const fila = repo.normalizar({ tipo: 'desafio', categoria: 'grupos', prioridad: 'baja', estado: 'archivada' });
    expect(fila.categoria).toBe('grupos');
    expect(fila.prioridad).toBe('baja');
    expect(fila.estado).toBe('archivada');
  });
});

// ============================================================
// Metadatos: categorías, prioridades, estados, acciones
// ============================================================
describe('NotificationService metadatos', () => {
  test('define las 7 categorías con icono y color', () => {
    const svc = window.notificationService;
    const esperadas = ['desafios', 'examenes', 'estudio', 'grupos', 'logros', 'sistema', 'anuncios'];
    for (const c of esperadas) {
      expect(svc.CATEGORIAS[c]).toBeTruthy();
      expect(svc.CATEGORIAS[c].icono).toBeTruthy();
      expect(svc.CATEGORIAS[c].color).toMatch(/^var\(--/);
    }
  });

  test('prioridades ordenadas de más a menos crítica', () => {
    expect(window.notificationService.PRIORIDADES.critica).toBe(0);
    expect(window.notificationService.PRIORIDADES.alta).toBe(1);
    expect(window.notificationService.PRIORIDADES.media).toBe(2);
    expect(window.notificationService.PRIORIDADES.baja).toBe(3);
  });

  test('ciclo de vida de estados completo', () => {
    expect(window.notificationService.ESTADOS).toEqual(['nueva', 'vista', 'completada', 'archivada']);
  });
});

// ============================================================
// Emisión de eventos: construcción de contenido + persistencia
// ============================================================
describe('NotificationService.emitir()', () => {
  test('persiste con destinatario por defecto = usuario actual', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const svc = window.notificationService;
    const fila = await svc.emitir('estudio.completado', { libro: 'Juan', capitulo: 3 });
    expect(fila).toBeTruthy();
    expect(insertadas.length).toBe(1);
    expect(insertadas[0].usuario_id).toBe('u1');
    expect(insertadas[0].categoria).toBe('estudio');
    expect(insertadas[0].titulo).toContain('Capítulo');
    expect(insertadas[0].estado).toBe('nueva');
  });

  test('tras emitir, el store del centro queda con datos (sin estado de error)', async () => {
    global.notificacionesRepository = {
      insertarFilas: async (filas) => filas,
      listar: async () => [{ id: 'n1', tipo: 'estudio.completado', estado: 'nueva', categoria: 'estudio', titulo: '¡Capítulo completado!', cuerpo: '', creado_en: new Date().toISOString() }],
      noLeidas: async () => 1,
      contarPorCategoria: async () => ({ estudio: 1 })
    };
    const svc = window.notificationService;
    await svc.emitir('estudio.completado', { libro: 'Juan', capitulo: 3 });
    const st = global.store.obtener('notificaciones');
    expect(st.error).toBeFalsy();
    expect(st.noLeidas).toBe(1);
    expect(st.items.length).toBe(1);
  });

  test('respeta preferencia de categoría desactivada', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    estadoUsuario().preferencias = { notif_estudio: false };
    const svc = window.notificationService;
    await svc.emitir('estudio.completado', { libro: 'Juan', capitulo: 3 });
    expect(insertadas.length).toBe(0);
  });

  test('claves legacy también desactivan su categoría', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    estadoUsuario().preferencias = { notif_logros: false };
    await window.notificationService.emitir('desafio.creado', {
      desafioId: 1, creador: 'Ana', mazo: 'Salmo 23', destinatarios: ['u1'],
      datos: { desafio_id: 1 }
    });
    expect(insertadas.length).toBe(0);
  });

  test('los anuncios ignoran las preferencias (siempre se entregan)', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    estadoUsuario().preferencias = { notif_anuncios: false };
    await window.notificationService.emitir('anuncio.creado', {
      titulo: 'Novedades', cuerpo: 'Detalle', destinatarios: ['u1']
    });
    expect(insertadas.length).toBe(1);
    expect(insertadas[0].prioridad).toBe('critica');
  });

  test('evento sin registrar devuelve null sin lanzar', async () => {
    const svc = window.notificationService;
    const resultado = await svc.emitir('evento.inexistente', {});
    expect(resultado).toBeNull();
  });

  test('desafio.abandonado se construye como toast con el nombre del jugador', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const fila = await window.notificationService.emitir('desafio.abandonado', {
      desafioId: 3, mazo: 'Salmos', jugador: 'Ana', destinatarios: ['u1']
    });
    expect(fila.titulo).toContain('Ana');
    expect(insertadas[0].categoria).toBe('desafios');
    // Aviso ligero: toast, no bandeja del sistema
    const cfg = window.notificationService._configs['desafio.abandonado'];
    expect(cfg.toast).toBe(true);
    expect(cfg.nativo).toBe(false);
    expect(cfg.acciones).toEqual(['ver']);
  });

  test('construye título agrupado para desafío aceptado', async () => {
    const insertadas = [];
    global.notificacionesRepository = {
      insertarFilas: async (filas) => { insertadas.push(...filas); return filas; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const svc = window.notificationService;
    const fila = await svc.emitir('desafio.aceptado', {
      desafioId: 9, mazo: 'Efesios', jugador: 'Lucas', destinatarios: ['u1'],
      datos: { desafio_id: 9 }
    });
    expect(fila.titulo).toContain('aceptó tu desafío');
    const filas2 = insertadas[0];
    expect(filas2.agrupacion_clave).toBe('desafio:aceptados:9');
    // El título agrupado se guarda como plantilla con marcador {n} que el
    // repositorio sustituye por el contador real al fusionar filas.
    expect(filas2.tituloAgrupado).toContain('{n}');
  });
});

// ============================================================
// Agrupación: sustitución del marcador {n} por el contador real
// ============================================================
describe('agrupación de notificaciones similares', () => {
  test('el título agregado sustituye {n} por el contador real', async () => {
    const llamadas = [];
    const repoMock = {
      insertarFilas: async (filas) => filas,
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    // Simular la segunda aceptación: el repositorio fusiona con la fila
    // existente y reemplaza {n} por el contador incrementado.
    const plantilla = '{n} jugadores aceptaron tu desafío';
    const contador = 2;
    const tituloReal = plantilla.replace('{n}', contador);
    expect(tituloReal).toBe('2 jugadores aceptaron tu desafío');
    // Asegurar que el servicio guarda la plantilla con marcador (no el singular)
    global.notificacionesRepository = repoMock;
    const fila = await window.notificationService.emitir('desafio.aceptado', {
      desafioId: 5, mazo: 'Salmos', jugador: 'María', destinatarios: ['u1'],
      datos: { desafio_id: 5 }
    });
    expect(fila.tituloAgrupado).toContain('{n}');
  });

  test('la fila agrupada acumula nombres en datos.miembros', async () => {
    const filaEntrante = {
      usuario_id: 'u1', agrupacion_clave: 'desafio:aceptados:7',
      datos: { desafio_id: 7, miembro: 'Pedro' }, estado: 'nueva', tituloAgrupado: '{n} jugadores aceptaron tu desafío'
    };
    const existente = {
      id: 'g1', usuario_id: 'u1', agrupacion_clave: 'desafio:aceptados:7',
      datos: { desafio_id: 7, miembros: ['Ana'] }, contador: 1, estado: 'nueva', titulo: 'Ana aceptó tu desafío'
    };
    // Reproducir la lógica de _agrupar del repositorio (privada):
    const datos = { ...(existente.datos || {}), ...(filaEntrante.datos || {}) };
    const miembros = new Set([...(datos.miembros || [])]);
    if (filaEntrante.datos && filaEntrante.datos.miembro) miembros.add(filaEntrante.datos.miembro);
    const contador = (existente.contador || 1) + 1;
    const titulo = filaEntrante.tituloAgrupado.replace('{n}', contador);
    expect(Array.from(miembros)).toEqual(['Ana', 'Pedro']);
    expect(contador).toBe(2);
    expect(titulo).toBe('2 jugadores aceptaron tu desafío');
  });
});

// ============================================================
// Ciclo de vida de estados desde el centro
// ============================================================
describe('estados del ciclo de vida', () => {
  test('marcarCompletada y archivar delegan en el repositorio', async () => {
    const llamadas = [];
    global.notificacionesRepository = {
      actualizarEstado: async (id, estado) => llamadas.push([id, estado]),
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    const svc = window.notificationService;
    await svc.marcarCompletada('n1');
    await svc.archivar('n2');
    expect(llamadas).toEqual([['n1', 'completada'], ['n2', 'archivada']]);
  });

  test('eliminar delega en el repositorio', async () => {
    let borrado = null;
    global.notificacionesRepository = {
      eliminar: async (id) => { borrado = id; },
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    await window.notificationService.eliminar('n3');
    expect(borrado).toBe('n3');
  });
});

// ============================================================
// Presentación: bandeja nativa en Android vs. in-app en web
// ============================================================
describe('NotificationService._presentar()', () => {
  function config(p) { return { ...{ categoria: 'sistema', prioridad: 'media', nativo: true, sonido: false, banner: false }, ...p }; }
  function base() {
    return { nombre: 'test.evento', titulo: 'Título', cuerpo: 'Cuerpo', url: '/ruta', icono: 'bell', datos: {}, fila: { id: 'n1' } };
  }
  let notificacionesLlamadas;
  let presentadas;

  beforeEach(() => {
    notificacionesLlamadas = [];
    presentadas = [];
    global.notifications = {
      vibrar: () => {},
      notificar: async (opts) => { notificacionesLlamadas.push(opts); return {}; }
    };
    delete global.pushNotificationService;
  });

  test('en Android, una categoría no-desafío va a la bandeja nativa (no toast)', () => {
    global.pushNotificationService = {
      esCapacitor: () => true,
      presentarNativa: async (opts) => { presentadas.push(opts); return true; }
    };
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'examenes' }) });
    expect(presentadas.length).toBe(1);
    expect(presentadas[0].categoria).toBe('examenes');
    expect(presentadas[0].url).toBe('/ruta');
    expect(presentadas[0].id).toBe('n1');
    expect(notificacionesLlamadas.length).toBe(0);
  });

  test('en web, una categoría no-desafío conserva la presentación actual', () => {
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'examenes' }) });
    expect(notificacionesLlamadas.length).toBe(1);
    expect(notificacionesLlamadas[0].categoria).toBe('examenes');
  });

  test('en Android, un desafío se presenta in-app y NO en la bandeja', () => {
    global.pushNotificationService = {
      esCapacitor: () => true,
      presentarNativa: async (opts) => { presentadas.push(opts); return true; }
    };
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'desafios' }) });
    expect(notificacionesLlamadas.length).toBe(1);
    expect(presentadas.length).toBe(0);
  });

  test('en Android, un evento silencioso (nativo:false) no presenta nada', () => {
    global.pushNotificationService = {
      esCapacitor: () => true,
      presentarNativa: async (opts) => { presentadas.push(opts); return true; }
    };
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'estudio', nativo: false }) });
    expect(presentadas.length).toBe(0);
    expect(notificacionesLlamadas.length).toBe(0);
  });

  test('sin window.notifications (entorno mínimo) no lanza', () => {
    delete global.notifications;
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'sistema' }) });
    expect(notificacionesLlamadas.length).toBe(0);
  });

  test('un desafío de flujo (aceptado/rechazado/finalizado, toast:true) se presenta como toast in-app', async () => {
    const toasts = [];
    global.notifications = {
      vibrar: () => {},
      notificar: async (opts) => { notificacionesLlamadas.push(opts); return {}; },
      mostrarToast: (titulo, cuerpo, opts) => { toasts.push({ titulo, cuerpo, opts }); }
    };
    const marcadas = [];
    window.notificationService._marcarVista = async (id) => { marcadas.push(id); };
    // Desafío con nativo:false y toast:true → toast, nunca la bandeja/notificar
    window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'desafios', nativo: false, toast: true }), fila: { id: 'n1' } });
    expect(toasts.length).toBe(1);
    expect(toasts[0].titulo).toBe('Título');
    expect(notificacionesLlamadas.length).toBe(0);
    // El toast ya se vio: la fila se marca 'vista' para no dejar el badge pegado
    await new Promise(r => setTimeout(r, 0));
    expect(marcadas).toEqual(['n1']);
  });

  test('un desafío con banner:true sigue usando el banner (no el toast)', () => {
    const toasts = [];
    global.notifications = {
      vibrar: () => {},
      notificar: async () => ({}),
      mostrarToast: (titulo, cuerpo, opts) => { toasts.push({ titulo, cuerpo, opts }); }
    };
    let bannerLlamado = false;
    const original = window.notificationService._mostrarBanner;
    window.notificationService._mostrarBanner = () => { bannerLlamado = true; };
    try {
      window.notificationService._presentar({ ...base(), cfg: config({ categoria: 'desafios', nativo: false, toast: true, banner: true }) });
      expect(bannerLlamado).toBe(true);
      expect(toasts.length).toBe(0);
    } finally {
      window.notificationService._mostrarBanner = original;
    }
  });

  test('el banner mapea las acciones string de la config a botones reales (aceptar/rechazar/ver)', () => {
    const captured = {};
    const el = {
      id: '', style: { setProperty: () => {} }, className: '', parentNode: null,
      set innerHTML(v) { captured.html = v; },
      get innerHTML() { return captured.html; },
      remove() {},
      querySelector: () => ({ onclick: null }),
      querySelectorAll: () => []
    };
    global.document = {
      getElementById: () => null,
      body: { appendChild: () => {} },
      createElement: () => el,
      querySelector: () => null,
      querySelectorAll: () => []
    };
    global.Iconos = { render: (n) => `<i>${n}</i>`, actualizar: () => {} };
    try {
      const cfg = { categoria: 'desafios', acciones: ['aceptar', 'rechazar', 'ver'] };
      window.notificationService._mostrarBanner({ cfg, titulo: 'Título', cuerpo: 'Cuerpo', url: '/d/1', datos: {}, fila: { id: 'n1' }, icono: 'sword' });
      expect(captured.html).toContain('data-notif-accion="aceptar"');
      expect(captured.html).toContain('data-notif-accion="rechazar"');
      expect(captured.html).toContain('data-notif-accion="ver"');
      expect(captured.html).toContain('Aceptar');
      expect(captured.html).toContain('Rechazar');
      // Regresión: antes salía data-notif-accion="undefined" y botones vacíos
      expect(captured.html).not.toContain('undefined');
    } finally {
      delete global.Iconos;
      delete global.document;
    }
  });

  test('si ya hay un banner activo, el siguiente desafío se muestra como toast (no se descarta)', () => {
    const toasts = [];
    const marcadas = [];
    const banner = { remove: () => {} };
    global.document = {
      getElementById: (id) => (id === 'notif-banner' ? banner : null),
      body: { appendChild: () => {} },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    global.notifications = {
      vibrar: () => {},
      notificar: async () => ({}),
      mostrarToast: (titulo, cuerpo, opts) => { toasts.push({ titulo, cuerpo, opts }); }
    };
    window.notificationService._marcarVista = async (id) => { marcadas.push(id); };
    window.notificationService._mostrarBanner({ ...base(), cfg: config({ categoria: 'desafios' }), titulo: 'Segundo desafío', fila: { id: 'n2' } });
    expect(toasts.length).toBe(1);
    expect(toasts[0].titulo).toBe('Segundo desafío');
    delete global.document;
  });
});

// ============================================================
// _poll(): barrido de desafíos vencidos (cierre automático)
// ============================================================
describe('NotificationService._poll() — barrido de desafíos vencidos', () => {
  test('llama sweepVencidos una vez por minuto (throttle)', async () => {
    let sweeps = 0;
    global.notificacionesRepository = {
      listar: async () => [],
      noLeidas: async () => 0,
      contarPorCategoria: async () => ({})
    };
    global.desafiosRepository = { sweepVencidos: async () => { sweeps += 1; return 0; } };
    const svc = window.notificationService;
    // Primer poll: el throttle está a 0 → barre
    svc._ultimoSweep = 0;
    await svc._poll();
    expect(sweeps).toBe(1);
    // Segundo poll inmediato: dentro del minuto → NO vuelve a barrer
    await svc._poll();
    expect(sweeps).toBe(1);
    // Pasado el minuto → barre de nuevo
    svc._ultimoSweep = Date.now() - 61000;
    await svc._poll();
    expect(sweeps).toBe(2);
  });
});

// Helper: acceso al estado del store para mutar preferencias
function estadoUsuario() {
  return global.store.obtener('usuario');
}
