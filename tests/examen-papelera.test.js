import { beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const repoFuente = read('js/datos/examenes-repository.js');
const plataformaFuente = read('js/datos/plataforma-repository.js');
const vistaFuente = read('js/vistas/vista-examenes.js');

const UUID_1 = '11111111-1111-1111-1111-111111111111';
const UUID_2 = '22222222-2222-2222-2222-222222222222';

const clonar = (valor) => (valor == null ? valor : JSON.parse(JSON.stringify(valor)));

/**
 * Cliente Supabase mínimo sobre un array en memoria. Imita solo las cadenas
 * que usa el repositorio: select/eq/neq/in/order/single, update y delete.
 */
function crearCliente(estado) {
  const crearQuery = () => {
    const q = {
      tipo: null,
      filtros: [],
      inFiltro: null,
      valores: null,
      columnas: '*',
      singleFila: false,
      select(columnas) {
        if (!q.tipo) q.tipo = 'select';
        if (typeof columnas === 'string') q.columnas = columnas;
        return q;
      },
      update(valores) { q.tipo = 'update'; q.valores = valores; return q; },
      upsert(valores) { q.tipo = 'upsert'; q.valores = valores; return q; },
      delete() { q.tipo = 'delete'; return q; },
      eq(columna, valor) { q.filtros.push({ op: 'eq', columna, valor }); return q; },
      neq(columna, valor) { q.filtros.push({ op: 'neq', columna, valor }); return q; },
      in(columna, valores) { q.inFiltro = { columna, valores }; return q; },
      is() { return q; },
      order() { return q; },
      limit() { return q; },
      single() { q.singleFila = true; return q.ejecutar(); },
      then(resolver, rechazar) { return q.ejecutar().then(resolver, rechazar); },
      ejecutar() {
        const coincide = (fila) => q.filtros.every(({ op, columna, valor }) => (
          op === 'neq'
            ? String(fila[columna]) !== String(valor)
            : String(fila[columna]) === String(valor)
        )) && (!q.inFiltro || q.inFiltro.valores.map(String).includes(String(fila[q.inFiltro.columna])));

        estado.llamadas.push({ tipo: q.tipo, filtros: q.filtros, valores: q.valores, inFiltro: q.inFiltro });

        if (q.tipo === 'update') {
          const actualizadas = estado.filas.filter(coincide);
          actualizadas.forEach((fila) => Object.assign(fila, q.valores));
          return Promise.resolve({
            data: q.singleFila ? clonar(actualizadas[0] || null) : clonar(actualizadas),
            error: null
          });
        }

        if (q.tipo === 'delete') {
          const borradas = estado.filas.filter(coincide);
          estado.filas = estado.filas.filter((fila) => !coincide(fila));
          return Promise.resolve({ data: clonar(borradas), error: null });
        }

        if (q.tipo === 'upsert') {
          const indice = estado.filas.findIndex((fila) => String(fila.id) === String(q.valores.id));
          if (indice >= 0) estado.filas[indice] = Object.assign({}, estado.filas[indice], q.valores);
          else estado.filas.push(clonar(q.valores));
          const fila = estado.filas.find((f) => String(f.id) === String(q.valores.id));
          return Promise.resolve({ data: clonar(fila), error: null });
        }

        const encontradas = estado.filas.filter(coincide);
        const datos = q.columnas === 'id'
          ? encontradas.map((fila) => ({ id: fila.id }))
          : clonar(encontradas);
        return Promise.resolve({ data: q.singleFila ? (datos[0] || null) : datos, error: null });
      }
    };
    return q;
  };

  return { from: () => crearQuery(), rpc: vi.fn() };
}

/** Carga un IIFE de navegador dentro de un objeto `window` simulado. */
function cargar(fuente, window) {
  new Function('window', 'console', fuente)(window, console);
  return window;
}

function crearRepo(filas = []) {
  const estado = { filas, llamadas: [] };
  const cliente = crearCliente(estado);
  const cache = new Map();
  const window = {
    supabaseClient: cliente,
    store: { obtener: (clave) => (clave === 'usuario' ? { id: 'prof-1' } : null) },
    cacheDatos: {
      set: async (clave, valor) => { cache.set(clave, valor); cache.set('ts:' + clave, Date.now()); return true; },
      get: async (clave) => (cache.has(clave) ? cache.get(clave) : null),
      // Devuelve también las entradas caducadas: es lo que permite recuperar.
      list: async (prefijo) => [...cache.entries()]
        .filter(([clave]) => clave.startsWith(prefijo))
        .map(([clave, valor]) => ({ clave, valor, ts: cache.get('ts:' + clave) || Date.now() }))
    }
  };
  cargar(repoFuente, window);
  return { repo: window.examenesRepository, estado, cache, window, cliente };
}

const examenBase = (extra = {}) => Object.assign({
  id: UUID_1,
  grupo_id: 'grupo-1',
  creado_por: 'prof-1',
  titulo: 'Examen de prueba',
  preguntas: [{ id: 'p1', texto: 'Pregunta', tipo: 'texto_largo' }],
  puntos_totales: 10,
  estado: 'publicado',
  publicado: true,
  config: {},
  actualizado_en: '2026-10-18T10:00:00.000Z'
}, extra);

describe('papelera de exámenes: repositorio', () => {
  test('mover a la papelera archiva sin borrar y guarda el estado anterior', async () => {
    const { repo, estado } = crearRepo([examenBase()]);

    const guardado = await repo.moverAPapelera(UUID_1);

    expect(estado.filas).toHaveLength(1);
    expect(estado.filas[0].estado).toBe('archivado');
    expect(estado.filas[0].publicado).toBe(false);
    expect(estado.filas[0].config.papelera.estado_previo).toBe('publicado');
    expect(estado.filas[0].config.papelera.publicado_previo).toBe(true);
    expect(estado.filas[0].config.papelera.eliminado_por).toBe('prof-1');
    expect(Number.isNaN(Date.parse(estado.filas[0].config.papelera.eliminado_en))).toBe(false);
    expect(guardado.estado).toBe('archivado');
  });

  test('mover dos veces no pisa el estado original guardado', async () => {
    const { repo, estado } = crearRepo([examenBase({ estado: 'cerrado', publicado: false })]);

    await repo.moverAPapelera(UUID_1);
    await repo.moverAPapelera(UUID_1);

    expect(estado.filas[0].config.papelera.estado_previo).toBe('cerrado');
    expect(estado.filas[0].config.papelera.publicado_previo).toBe(false);
  });

  test('restaurar devuelve el estado previo y limpia la marca de papelera', async () => {
    const { repo, estado } = crearRepo([
      examenBase({
        estado: 'archivado',
        publicado: false,
        config: { papelera: { estado_previo: 'cerrado', publicado_previo: false, eliminado_en: '2026-10-18T11:00:00.000Z' }, tema: 'x' }
      })
    ]);

    const restaurado = await repo.restaurar(UUID_1);

    expect(estado.filas[0].estado).toBe('cerrado');
    expect(estado.filas[0].publicado).toBe(false);
    expect(estado.filas[0].config.papelera).toBeUndefined();
    // El resto de la configuración del examen se conserva.
    expect(estado.filas[0].config.tema).toBe('x');
    expect(restaurado.estado).toBe('cerrado');
  });

  test('restaurar un examen publicado lo deja publicado y accesible', async () => {
    const { repo, estado } = crearRepo([
      examenBase({
        estado: 'archivado',
        publicado: false,
        config: { papelera: { estado_previo: 'publicado', publicado_previo: true } }
      })
    ]);

    await repo.restaurar(UUID_1);

    expect(estado.filas[0].estado).toBe('publicado');
    expect(estado.filas[0].publicado).toBe(true);
  });

  test('restaurar exige que el examen esté en la papelera', async () => {
    const { repo } = crearRepo([examenBase()]);
    await expect(repo.restaurar(UUID_1)).rejects.toThrow('no está en la papelera');
  });

  test('la papelera solo lista exámenes archivados', async () => {
    const { repo } = crearRepo([
      examenBase({ id: UUID_1, estado: 'archivado' }),
      examenBase({ id: UUID_2, estado: 'borrador' })
    ]);

    const lista = await repo.listarPapelera();

    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(UUID_1);
  });

  test('la papelera se limita al grupo activo del profesor', async () => {
    // RLS deja ver exámenes de cualquier grupo donde el profesor sea editor;
    // la papelera solo debe enseñar los del grupo con el que trabaja.
    const { repo, estado, window } = crearRepo([examenBase({ estado: 'archivado' })]);
    window.store = { obtener: (clave) => (clave === 'usuario' ? { id: 'prof-1', grupo_id: 'grupo-1' } : null) };

    await repo.listarPapelera();
    await repo.idsEnPapelera();

    for (const llamada of estado.llamadas) {
      expect(llamada.filtros).toEqual(expect.arrayContaining([
        { op: 'eq', columna: 'grupo_id', valor: 'grupo-1' }
      ]));
    }
  });

  test('eliminar definitivamente solo borra exámenes archivados', async () => {
    const { repo, estado } = crearRepo([
      examenBase({ id: UUID_1, estado: 'archivado' }),
      examenBase({ id: UUID_2, estado: 'borrador' })
    ]);

    await repo.eliminarDefinitivo(UUID_1);
    expect(estado.filas.map((fila) => fila.id)).toEqual([UUID_2]);

    // Un examen fuera de la papelera no se puede borrar por esta vía.
    await repo.eliminarDefinitivo(UUID_2);
    expect(estado.filas.map((fila) => fila.id)).toEqual([UUID_2]);
  });

  test('vaciar la papelera borra solo lo archivado y devuelve cuántos eran', async () => {
    const { repo, estado } = crearRepo([
      examenBase({ id: UUID_1, estado: 'archivado' }),
      examenBase({ id: UUID_2, estado: 'cerrado' })
    ]);

    const borrados = await repo.vaciarPapelera();

    expect(borrados).toBe(1);
    expect(estado.filas.map((fila) => fila.id)).toEqual([UUID_2]);
  });

  test('vaciar una papelera vacía no lanza ni borra nada', async () => {
    const { repo, estado } = crearRepo([examenBase({ estado: 'borrador' })]);
    await expect(repo.vaciarPapelera()).resolves.toBe(0);
    expect(estado.filas).toHaveLength(1);
  });

  test('las copias locales se limitan a exámenes que ya no están en el servidor', async () => {
    const { repo, cache } = crearRepo([examenBase({ id: UUID_2, estado: 'publicado' })]);
    cache.set(`examen:${UUID_1}`, examenBase({ id: UUID_1, titulo: 'Perdido' }));
    cache.set(`examen:${UUID_2}`, examenBase({ id: UUID_2, titulo: 'Vivo' }));

    const copias = await repo.copiasLocales();

    expect(copias.map((copia) => copia.examen.id)).toEqual([UUID_1]);
    expect(copias[0].guardadoEn).toBeTruthy();
  });

  test('recuperar una copia la recrea como borrador con sus preguntas', async () => {
    const { repo, estado } = crearRepo([]);
    const copia = examenBase({
      id: UUID_1,
      estado: 'publicado',
      publicado: true,
      config: { papelera: { estado_previo: 'publicado' }, tema: 'x' }
    });

    const recuperado = await repo.recuperarCopia(copia);

    expect(estado.filas).toHaveLength(1);
    expect(estado.filas[0].estado).toBe('borrador');
    // Un examen recuperado no reabre sus enlaces antiguos por sorpresa.
    expect(estado.filas[0].publicado).toBe(false);
    expect(estado.filas[0].preguntas).toHaveLength(1);
    expect(estado.filas[0].config.papelera).toBeUndefined();
    expect(estado.filas[0].config.tema).toBe('x');
    expect(recuperado.id).toBe(UUID_1);
  });
});

describe('papelera de exámenes: resumen del panel', () => {
  function crearPlataforma(examenes, idsPapelera) {
    const llamadas = [];
    const window = {
      errores: null,
      examenesRepository: { idsEnPapelera: async () => idsPapelera },
      supabaseClient: {
        rpc: async (nombre) => {
          llamadas.push(nombre);
          return { data: { examenes }, error: null };
        }
      }
    };
    cargar(plataformaFuente, window);
    return { plataforma: window.plataformaRepository, llamadas };
  }

  test('oculta los exámenes archivados de las listas y contadores del panel', async () => {
    const { plataforma } = crearPlataforma(
      [{ id: UUID_1, titulo: 'En papelera', estado: 'borrador' }, { id: UUID_2, titulo: 'Vivo', estado: 'publicado' }],
      [UUID_1]
    );

    const resumen = await plataforma.resumen();

    expect(resumen.examenes.map((examen) => examen.id)).toEqual([UUID_2]);
  });

  test('sin papelera devuelve el resumen intacto', async () => {
    const { plataforma } = crearPlataforma([{ id: UUID_2, titulo: 'Vivo' }], []);
    const resumen = await plataforma.resumen();
    expect(resumen.examenes).toHaveLength(1);
  });
});

function crearVista(window = {}, router = { navegar: vi.fn(), _ejecutar: vi.fn() }) {
  window.panelUI = {
    esc: (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]),
    numero: (value) => String(value),
    tiempoRelativo: () => 'hace 5 min'
  };
  window.Iconos = { render: (nombre) => `<i data-lucide="${nombre}"></i>`, actualizar() {} };
  // Las acciones pasan por _ejecutar(), que avisa con helpers.mostrarAlerta.
  window.helpers = Object.assign({ confirmar: async () => true, mostrarAlerta() {} }, window.helpers || {});
  return new Function('window', 'router', `${vistaFuente}\nreturn window.vistaExamenes;`)(window, router);
}

describe('papelera de exámenes: vista Mis exámenes', () => {
  let vista;

  beforeEach(() => {
    vista = crearVista();
  });

  test('la papelera es una pestaña de la sección de exámenes, no de la barra lateral', () => {
    expect(vistaFuente).toContain("['papelera', this._papelera.length ? `Papelera (${this._papelera.length})` : 'Papelera']");
    expect(vistaFuente).toContain("if (this._filtro === 'papelera')");
    // La navegación lateral no registra ninguna entrada para la papelera.
    const navigation = read('js/core/navigation.js');
    expect(navigation).not.toContain('papelera');
  });

  test('la tarjeta de papelera ofrece restaurar y borrar definitivamente', () => {
    const html = vista._tarjetaPapelera(examenBase({
      estado: 'archivado',
      publicado: false,
      config: { papelera: { estado_previo: 'cerrado', publicado_previo: false, eliminado_en: '2026-10-18T11:00:00.000Z' } }
    }));

    expect(html).toContain('En papelera');
    expect(html).toContain('Antes: Cerrado');
    expect(html).toContain('Eliminado hace 5 min');
    expect(html).toContain('data-papelera-accion="restaurar"');
    expect(html).toContain('data-papelera-accion="borrar"');
    expect(html).toContain('Restaurar');
    expect(html).toContain('Eliminar definitivamente');
    expect(html).toContain('data-lucide="trash-2"');
  });

  test('borrar desde la lista mueve a la papelera en vez de eliminar la fila', async () => {
    const moverAPapelera = vi.fn().mockResolvedValue({});
    const eliminar = vi.fn().mockResolvedValue(undefined);
    vista = crearVista({
      helpers: { confirmar: async () => true },
      examenesRepository: { moverAPapelera, eliminar, listarPapelera: async () => [] }
    });

    await vista._accion('eliminar', UUID_1, 'Repaso');

    expect(moverAPapelera).toHaveBeenCalledWith(UUID_1);
    expect(eliminar).not.toHaveBeenCalled();
  });

  test('el aviso de borrar explica que se puede restaurar', async () => {
    const mensajes = [];
    vista = crearVista({
      helpers: {
        confirmar: async (mensaje, opciones) => { mensajes.push({ mensaje, opciones }); return false; }
      },
      examenesRepository: { moverAPapelera: vi.fn(), listarPapelera: async () => [] }
    });

    await vista._accion('eliminar', UUID_1, 'Repaso');

    expect(mensajes[0].mensaje).toContain('papelera');
    expect(mensajes[0].mensaje).toContain('restaurarlo');
    expect(mensajes[0].opciones.titulo).toBe('¿Mover a la papelera?');
  });

  test('restaurar llama al repositorio tras confirmar', async () => {
    const restaurar = vi.fn().mockResolvedValue({});
    vista = crearVista({
      helpers: { confirmar: async () => true },
      examenesRepository: { restaurar, listarPapelera: async () => [] }
    });
    vista._papelera = [examenBase({ estado: 'archivado' })];

    await vista._accionPapelera('restaurar', UUID_1);

    expect(restaurar).toHaveBeenCalledWith(UUID_1);
  });

  test('vaciar la papelera confirma y elimina todo lo archivado', async () => {
    const vaciarPapelera = vi.fn().mockResolvedValue(2);
    const confirmaciones = [];
    vista = crearVista({
      helpers: {
        confirmar: async (mensaje, opciones) => { confirmaciones.push({ mensaje, opciones }); return true; }
      },
      examenesRepository: { vaciarPapelera, listarPapelera: async () => [] }
    });
    vista._papelera = [examenBase({ id: UUID_1, estado: 'archivado' }), examenBase({ id: UUID_2, estado: 'archivado' })];

    await vista._accionPapelera('vaciar');

    expect(confirmaciones[0].mensaje).toContain('para siempre');
    expect(confirmaciones[0].mensaje).toContain('2 exámenes');
    expect(vaciarPapelera).toHaveBeenCalledTimes(1);
    expect(vista._papelera).toEqual([]);
  });

  test('el HTML de copias locales explica de dónde salen y ofrece recuperarlas', () => {
    vista._copias = [{
      examen: examenBase({ id: UUID_1, estado: 'publicado', publicado: true }),
      guardadoEn: '2026-10-14T09:00:00.000Z'
    }];

    const html = vista._htmlCopias();

    expect(html).toContain('Copias en este dispositivo');
    expect(html).toContain('Copia local');
    expect(html).toContain('Antes: Publicado');
    expect(html).toContain('data-copia-accion="recuperar"');
    expect(html).toContain('Recuperar como borrador');
  });

  test('recuperar una copia pide confirmación y llama al repositorio', async () => {
    const recuperarCopia = vi.fn().mockResolvedValue({});
    const confirmaciones = [];
    vista = crearVista({
      helpers: {
        confirmar: async (mensaje, opciones) => { confirmaciones.push({ mensaje, opciones }); return true; }
      },
      examenesRepository: { recuperarCopia, listarPapelera: async () => [] }
    });
    vista._copias = [{ examen: examenBase({ id: UUID_1, titulo: 'Perdido' }), guardadoEn: null }];

    await vista._accionCopia(UUID_1);

    expect(confirmaciones[0].opciones.titulo).toBe('¿Recuperar esta copia?');
    expect(recuperarCopia).toHaveBeenCalledWith(expect.objectContaining({ id: UUID_1 }));
  });

  test('cancelar el vaciado no borra nada', async () => {
    const vaciarPapelera = vi.fn();
    vista = crearVista({
      helpers: { confirmar: async () => false },
      examenesRepository: { vaciarPapelera, listarPapelera: async () => [] }
    });
    vista._papelera = [examenBase({ estado: 'archivado' })];

    await vista._accionPapelera('vaciar');

    expect(vaciarPapelera).not.toHaveBeenCalled();
  });
});

describe('papelera de exámenes: alumnos', () => {
  test('las RPC del alumno siguen exigiendo un examen publicado', () => {
    const enlaces = read('supabase/migraciones/056_enlaces_examen_alumnos.sql');
    const seguridad = read('supabase/migraciones/047_seguridad_examenes_y_soporte.sql');

    // Con estado 'archivado' + publicado=false ninguna vía pública sirve el examen.
    expect(enlaces).toContain("IF coalesce(e.estado, '') <> 'publicado' OR coalesce(e.publicado, FALSE) = FALSE THEN");
    expect(seguridad).toContain("WHERE id = p_examen_id AND publicado = TRUE AND estado = 'publicado'");
    expect(seguridad).toContain("WHERE grupo_id = p_grupo_id AND publicado = TRUE AND estado = 'publicado'");
  });
});
