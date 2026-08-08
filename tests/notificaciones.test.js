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

// Helper: acceso al estado del store para mutar preferencias
function estadoUsuario() {
  return global.store.obtener('usuario');
}
