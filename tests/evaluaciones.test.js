import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migracion060 = read('supabase/migraciones/060_evaluaciones.sql');
const migracion061 = read('supabase/migraciones/061_evaluaciones_reparar_modelo_009.sql');
const migracion062 = read('supabase/migraciones/062_evaluacion_creador_y_validacion_nula.sql');
const migracion064 = read('supabase/migraciones/064_evaluacion_hoja_calculo.sql');
const migracion065 = read('supabase/migraciones/065_evaluacion_secciones_paginadas.sql');
// Estado final de la feature: la 060 declaró el modelo, la 061 lo reparó sobre
// la tabla `evaluaciones` de la 009, la 062 cerró el hueco de autorización
// con creado_por NULL detectado en pruebas en vivo, la 064 convirtió la
// rejilla en hoja de cálculo (filas ordenadas, pesos y rango configurable) y
// la 065 la pagina por secciones de columnas sin romper lo anterior.
const migracion = migracion060 + '\n' + migracion061 + '\n' + migracion062 + '\n' + migracion064 + '\n' + migracion065;
const repositorio = read('js/datos/plataforma-repository.js');
const vistaListado = read('js/vistas/vista-evaluaciones.js');
const vistaRejilla = read('js/vistas/vista-evaluacion-editar.js');
const coreIndex = read('js/core/index.js');
const routerJs = read('js/core/router.js');

const RPC_EVALUACIONES = [
  'fb_evaluaciones_listar',
  'fb_evaluacion_crear',
  'fb_evaluacion_actualizar',
  'fb_evaluacion_eliminar',
  'fb_evaluacion_columnas_guardar',
  'fb_evaluacion_celda_guardar',
  'fb_evaluacion_obtener',
  'fb_evaluacion_importar',
  'fb_evaluacion_alumnos_guardar'
];

function crearWindowBase() {
  return {
    panelUI: {
      esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c])),
      // Réplica del panelUI.numero real: coma decimal en español.
      numero: (v) => {
        const n = Number(v);
        if (!isFinite(n)) return '—';
        return (Math.round(n * 100) / 100).toString().replace('.', ',');
      },
      fechaCorta: () => '01 oct',
      tiempoRelativo: () => 'ahora',
      modal: () => ({ cerrar: vi.fn(), cuerpo: {}, pie: { querySelector: () => ({ addEventListener: vi.fn() }) } })
    },
    Iconos: { render: (n) => `<i data-lucide="${n}"></i>`, actualizar: vi.fn() },
    helpers: { mostrarAlerta: vi.fn(), confirmar: vi.fn() }
  };
}

function cargarRejilla(window) {
  return new Function('window', 'store', 'router',
    `${vistaRejilla}\nreturn window.vistaEvaluacionEditar;`
  )(window, { obtener: () => ({ rol: 'admin' }) }, { navegar: vi.fn(), pathActual: () => '/evaluaciones/x' });
}

/**
 * Construye un .xlsx mínimo con método STORE (sin comprimir): el parser no
 * verifica CRC, así que basta con la estructura ZIP correcta.
 */
async function crearXLSX(entradas) {
  const enc = new TextEncoder();
  const locales = [];
  const centrales = [];
  let offset = 0;
  entradas.forEach(({ nombre, contenido }) => {
    const nombreBytes = enc.encode(nombre);
    const datos = enc.encode(contenido);
    const local = new Uint8Array(30 + nombreBytes.length + datos.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(18, datos.length, true);
    lv.setUint32(22, datos.length, true);
    lv.setUint16(26, nombreBytes.length, true);
    local.set(nombreBytes, 30);
    local.set(datos, 30 + nombreBytes.length);
    locales.push(local);

    const central = new Uint8Array(46 + nombreBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(20, datos.length, true);
    cv.setUint32(24, datos.length, true);
    cv.setUint16(28, nombreBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nombreBytes, 46);
    centrales.push(central);
    offset += local.length;
  });
  const tamCentral = centrales.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entradas.length, true);
  ev.setUint16(10, entradas.length, true);
  ev.setUint32(12, tamCentral, true);
  ev.setUint32(16, offset, true);
  return new Blob([...locales, ...centrales, eocd]).arrayBuffer();
}

describe('migraciones 060/061: modelo de evaluaciones', () => {
  test('apoya la rejilla en la tabla evaluaciones de la 009 y le añade fecha', () => {
    // La tabla evaluaciones NO se crea: existe desde la 009 (titulo, grupo_id).
    expect(migracion061).not.toContain('CREATE TABLE IF NOT EXISTS public.evaluaciones (');
    expect(migracion061).toContain('ALTER TABLE public.evaluaciones ADD COLUMN IF NOT EXISTS fecha DATE');
    // El nombre del formulario se mapea a titulo, la columna real.
    expect(migracion061).toContain("VALUES (left(v_nombre, 160), left(coalesce(p_descripcion, ''), 2000), p_fecha)");
    expect(migracion061).toMatch(/INSERT INTO public\.evaluaciones \(titulo, descripcion, fecha\)/);
    expect(migracion061).toContain("'titulo', e.titulo");
    // La 060 documenta su error para quien lea la historia de migraciones.
    expect(migracion060).toContain('061_evaluaciones_reparar_modelo_009.sql');
  });

  test('crea columnas (examen o manual) y notas solo manuales', () => {
    expect(migracion).toContain('CREATE TABLE IF NOT EXISTS public.evaluaciones_columnas');
    expect(migracion).toContain('CREATE TABLE IF NOT EXISTS public.evaluaciones_notas');
    // El tipo de columna distingue examen de columna manual.
    expect(migracion).toMatch(/CHECK \(tipo IN \('examen', 'manual'\)\)/);
    // Las columnas apuntan a examenes_personalizados sin exigir publicación:
    // un examen en borrador también puede formar parte de una evaluación.
    expect(migracion).toContain('REFERENCES public.examenes_personalizados(id) ON DELETE SET NULL');
    expect(migracion).not.toMatch(/examen_id[\s\S]{0,200}estado\s*=\s*'publicado'/);
    // Al guardar columnas se mantiene el enlace clásico examen→evaluación (009).
    expect(migracion061).toContain('UPDATE public.examenes_personalizados SET evaluacion_id = p_id WHERE id = v_examen;');
  });

  test('el alta registra creador y la autorización no tiene hueco de tres valores SQL', () => {
    // La tabla 009 no trae DEFAULT: el alta asigna el creador explícitamente.
    expect(migracion062).toMatch(/INSERT INTO public\.evaluaciones \(titulo, descripcion, fecha, creado_por\)/);
    expect(migracion062).toContain('p_fecha, auth.uid())');
    // IS DISTINCT FROM: con creado_por NULL, IF NOT (NULL OR false) no lanza
    // el error y cualquier usuario podría tocar la evaluación huérfana.
    expect(migracion062).toContain('IF ev.creado_por IS DISTINCT FROM auth.uid() AND NOT coalesce(public.es_owner(), false) THEN');
    // Regresión: la forma anterior (con el agujero) no debe volver.
    expect(migracion062).not.toContain('IF NOT (ev.creado_por = auth.uid() OR public.es_owner()) THEN');
    // El listado también es NULL-safe y solo el propietario ve las huérfanas.
    expect(migracion062).toContain("WHERE ((e.creado_por IS NOT NULL AND e.creado_por = auth.uid()) OR public.es_owner())");
  });

  test('una celda manual vive en evaluaciones_notas y la final usa columna_id NULL', () => {
    // Índice único parcial: una nota manual por alumno y columna…
    expect(migracion).toContain('ON public.evaluaciones_notas(evaluacion_id, columna_id, alumno) WHERE columna_id IS NOT NULL');
    // …y una sola nota final anulada por alumno.
    expect(migracion).toContain('ON public.evaluaciones_notas(evaluacion_id, alumno) WHERE columna_id IS NULL');
  });

  test('el relleno automático lee el último intento corregido, sin triggers sobre el flujo del alumno', () => {
    expect(migracion).toMatch(/JOIN public\.intentos_examen_personalizado/);
    expect(migracion).toContain('i.corregido AND i.nota IS NOT NULL');
    // Último intento de cada alumno: DISTINCT ON + orden por fecha de entrega.
    expect(migracion).toContain('ORDER BY cx.columna_id, lower(btrim(i.alumno_nombre)), i.fecha_completado DESC NULLS LAST');
    // Nada que se ejecute dentro de la entrega del alumno.
    expect(migracion).not.toContain('CREATE TRIGGER');
    expect(migracion).not.toMatch(/(INSERT|UPDATE|DELETE)\s+(INTO\s+)?public\.intentos_examen_personalizado/i);
  });

  test('el servidor manda: autorización por creador o propietario y sin acceso directo a tablas', () => {
    expect(migracion).toMatch(/ev\.creado_por = auth\.uid\(\) OR public\.es_owner\(\)/);
    // El listado solo muestra evaluaciones sin grupo (las de grupo siguen en su vista).
    expect(migracion061).toContain('AND e.grupo_id IS NULL');
    // La 009 concedía GRANT ALL a anon: la 061 lo revoca (todo pasa por RPC).
    expect(migracion061).toContain('REVOKE ALL ON public.evaluaciones FROM anon');
    expect(migracion).toContain('REVOKE ALL ON public.evaluaciones_columnas FROM anon, authenticated');
    expect(migracion).toContain('REVOKE ALL ON public.evaluaciones_notas FROM anon, authenticated');
    for (const rpc of RPC_EVALUACIONES) {
      expect(migracion).toContain(`FUNCTION public.${rpc}(`);
      expect(migracion).toContain(`GRANT EXECUTE ON FUNCTION public.${rpc}`);
      // Ninguna RPC de evaluaciones se concede a anon.
      const concesiones = migracion.split('\n')
        .filter((l) => l.includes(rpc) && /TO anon/.test(l));
      expect(concesiones).toEqual([]);
    }
  });

  test('editar una celda no la pisa sola: la nota manual solo cambia con profesor, y vacío la restaura', () => {
    expect(migracion).toContain('IF p_nota IS NULL THEN');
    // Vaciar la celda elimina la marca manual (vuelve al automático).
    expect(migracion).toMatch(/IF p_nota IS NULL THEN\s*\n\s*-- Se libera la celda[\s\S]{0,200}DELETE FROM public\.evaluaciones_notas/);
    // Rango de nota validado en servidor.
    expect(migracion).toContain('p_nota < 0 OR p_nota > 10');
    // La rejilla combina manual sobre automático sin sobrescribir el automático.
    expect(migracion).toContain('coalesce(mn.nota, au.nota) AS nota');
    expect(migracion).toContain('(mn.id IS NOT NULL) AS manual');
    // La nota final: anulación manual si existe, si no la media de columnas.
    expect(migracion).toContain('coalesce(mn.nota, f.media)');
  });
});

describe('migración 064: la rejilla pasa a hoja de cálculo', () => {
  test('las filas de alumnos se guardan ordenadas sin tocar los intentos del alumno', () => {
    expect(migracion064).toContain('CREATE TABLE IF NOT EXISTS public.evaluaciones_alumnos');
    expect(migracion064).toContain('ALTER TABLE public.evaluaciones_alumnos ENABLE ROW LEVEL SECURITY');
    // Sin acceso directo a la tabla: se toca solo por RPC.
    expect(migracion064).toContain('REVOKE ALL ON public.evaluaciones_alumnos FROM anon, authenticated');
    expect(migracion064).toContain('GRANT EXECUTE ON FUNCTION public.fb_evaluacion_alumnos_guardar(UUID, JSONB) TO authenticated');
    // El cliente manda SIEMPRE la lista completa y visible (lo que ve, se guarda).
    expect(migracion064).toContain('DO UPDATE SET alumno = EXCLUDED.alumno');
    // Lo que desaparece de la lista se oculta y se materializa con su posición.
    expect(migracion064).toContain('SELECT clave, alumno, 0 AS grupo, posicion AS orden FROM explicitos');
    // Eliminar una fila borra sus notas manuales… pero jamás los intentos.
    expect(migracion064).toMatch(/DELETE FROM public\.evaluaciones_notas[\s\S]{0,200}oculto/);
    expect(migracion064).not.toMatch(/DELETE\s+FROM\s+public\.intentos_examen_personalizado/i);
    // Una evaluación que nunca ha tocado sus filas sigue derivándose como antes.
    expect(migracion064).toContain("WHERE NOT EXISTS (\n      SELECT 1 FROM public.evaluaciones_alumnos a\n      WHERE a.evaluacion_id = p_id AND a.clave = d.c_alumno\n    )");
  });

  test('la derivación de alumnos es una función interna, fuera del alcance del cliente', () => {
    expect(migracion064).toContain('REVOKE ALL ON FUNCTION public.fb_evaluacion_alumnos_derivados(UUID) FROM PUBLIC, anon, authenticated');
    expect(migracion064).not.toContain('GRANT EXECUTE ON FUNCTION public.fb_evaluacion_alumnos_derivados');
    // Sigue leyendo de los mismos sitios de siempre: intentos ∪ notas manuales.
    expect(migracion064).toMatch(/JOIN public\.intentos_examen_personalizado/);
    expect(migracion064).toContain('FROM public.evaluaciones_notas n');
  });

  test('el resultado final es la media ponderada y con pesos iguales no cambia', () => {
    expect(migracion064).toContain('ADD COLUMN IF NOT EXISTS peso NUMERIC');
    expect(migracion064).toContain('CHECK (peso IS NULL OR peso > 0)');
    expect(migracion064).toContain('sum(v.nota * coalesce(v.peso, 1)) / sum(coalesce(v.peso, 1))');
    // Las celdas sin nota no entran en el sumatorio: pendiente ≠ 0.
    expect(migracion064).toContain('LEFT JOIN valores v ON v.alumno = al.alumno AND v.nota IS NOT NULL');
    // La anulación manual sigue mandando sobre la media calculada.
    expect(migracion064).toContain('coalesce(mn.nota, f.media)');
    // Reordenar o importar no borra los pesos: sin clave «peso» se conservan.
    expect(migracion064).toContain("WHEN elem ? 'peso' THEN v_peso ELSE evaluaciones_columnas.peso END");
    // La interfaz usa exactamente la misma fórmula que el servidor.
    expect(vistaRejilla).toContain('suma += Number(c.nota) * peso');
    expect(vistaRejilla).toContain('Σ(nota × peso) ÷ Σ(peso)');
  });

  test('el rango de notas es configurable y el servidor lo valida en celda e importación', () => {
    expect(migracion064).toContain('ADD COLUMN IF NOT EXISTS nota_max NUMERIC NOT NULL DEFAULT 10');
    expect(migracion064).toContain('CHECK (nota_max > 0)');
    expect(migracion064).toContain('p_nota < 0 OR p_nota > ev.nota_max');
    expect(migracion064).toContain('least(ev.nota_max, greatest(0,');
    // Cambiar el rango no duplica la función: se elimina la firma antigua.
    expect(migracion064).toContain('DROP FUNCTION IF EXISTS public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE);');
    expect(migracion064).toContain('p_nota_max NUMERIC DEFAULT NULL');
    // El cliente valida con ese mismo rango (no con el 10 fijo).
    expect(vistaRejilla).toContain('_rangoNota()');
  });

  test('la última columna fija y los menús contextuales están en la vista y en el CSS', () => {
    expect(vistaRejilla).toContain('Resultado final');
    expect(vistaRejilla).toContain('Añadir alumno');
    expect(vistaRejilla).toContain('data-menu-fila');
    expect(vistaRejilla).toContain('data-menu-col');
    // El resultado calculado no se edita a mano.
    expect(vistaRejilla).toContain('eval-celda--calculada');
    // Estado de guardado visible con reintento.
    expect(vistaRejilla).toContain('btnReintentar');
    const css = read('css/05-componentes/_plataforma.css');
    expect(css).toMatch(/\.eval-tabla \.eval-tabla__final \{[\s\S]*?position: sticky/);
    expect(css).toContain('right: 0;');
    // Controles contextuales también en pantallas táctiles (sin hover).
    expect(css).toContain('@media (hover: none)');
  });
});

describe('migración 065: la rejilla se pagina por secciones', () => {
  test('obtener añade `secciones` sin tocar la estructura que ya se usaba', () => {
    // La firma de un argumento se elimina para que PostgREST no vea dos
    // candidatas ambiguas; la llamada solo con p_id sigue funcionando.
    expect(migracion065).toContain('DROP FUNCTION IF EXISTS public.fb_evaluacion_obtener(UUID);');
    expect(migracion065).toContain('p_columnas_por_seccion INTEGER DEFAULT NULL');
    // Misma estructura que antes: una evaluación antigua se abre igual.
    for (const clave of ['evaluacion', 'columnas', 'alumnos', 'celdas', 'finales']) {
      expect(migracion065).toContain(`'${clave}'`);
    }
    expect(migracion065).toContain("'secciones'");
    // Las columnas traen `id` (lo que usa la vista): con el alias solo de la
    // 060-064 (`columna_id`) las celdas no se podían identificar.
    expect(migracion065).toContain('SELECT c.id, c.id AS columna_id, c.tipo, c.examen_id, c.nombre, c.posicion, c.peso');
    // Grupos en el orden de las columnas: índice 0-based + ids de cada grupo.
    expect(migracion065).toContain("'indice', g.idx");
    expect(migracion065).toContain("'columna_ids', g.ids");
    expect(migracion065).toContain('row_number() OVER (ORDER BY c.posicion, c.columna_id)');
    // El tamaño pedido por el cliente se recorta a un rango seguro.
    expect(migracion065).toContain('greatest(1, least(coalesce(p_columnas_por_seccion, 3), 12))');
    // Los cálculos de la 064 siguen intactos (regresión de la hoja de cálculo).
    expect(migracion065).toContain('sum(v.nota * coalesce(v.peso, 1)) / sum(coalesce(v.peso, 1))');
    expect(migracion065).toContain('coalesce(mn.nota, f.media)');
    expect(migracion065).toContain('NOT a.oculto');
  });

  test('las secciones se sirven solo por RPC autenticada, sin acceso directo', () => {
    expect(migracion065).toContain('GRANT EXECUTE ON FUNCTION public.fb_evaluacion_obtener(UUID, INTEGER) TO authenticated');
    const concesiones = migracion065.split('\n')
      .filter((l) => l.includes('fb_evaluacion_obtener') && /TO anon/.test(l));
    expect(concesiones).toEqual([]);
    // La vista mantiene el mismo contrato de visibilidad con una sola sección.
    expect(vistaRejilla).toContain('_aplicarSeccion()');
    expect(vistaRejilla).toContain('_calcularSecciones');
  });
});

describe('capa de datos de evaluaciones', () => {
  function cargarRepositorio(llamadas) {
    const window = {
      supabaseClient: {
        rpc: async (nombre, args) => { llamadas.push({ nombre, args }); return { data: null, error: null }; }
      }
    };
    new Function('window', repositorio)(window);
    return window.plataformaRepository;
  }

  test('transporta las ocho RPC con los argumentos que espera el servidor', async () => {
    const llamadas = [];
    const repo = cargarRepositorio(llamadas);

    await repo.listarEvaluaciones();
    await repo.crearEvaluacion('1ª Evaluación', 'Parcial', '2026-10-01');
    await repo.actualizarEvaluacion('ev1', '1ª Ev.', '', null);
    await repo.eliminarEvaluacion('ev1');
    await repo.guardarColumnasEvaluacion('ev1', [{ tipo: 'examen', examen_id: 'ex1', nombre: 'Test' }]);
    await repo.guardarCeldaEvaluacion('ev1', 'col1', 'Ana', 7.5);
    await repo.obtenerEvaluacion('ev1');
    await repo.importarEvaluacion('ev1', [{ alumno: 'Ana', columna_id: 'col1', nota: 6 }], [{ alumno: 'Ana', nota: 6 }]);

    expect(llamadas.map((l) => l.nombre)).toEqual([
      'fb_evaluaciones_listar',
      'fb_evaluacion_crear',
      'fb_evaluacion_actualizar',
      'fb_evaluacion_eliminar',
      'fb_evaluacion_columnas_guardar',
      'fb_evaluacion_celda_guardar',
      'fb_evaluacion_obtener',
      'fb_evaluacion_importar'
    ]);
    expect(llamadas[1].args).toEqual({ p_nombre: '1ª Evaluación', p_descripcion: 'Parcial', p_fecha: '2026-10-01' });
    expect(llamadas[5].args).toEqual({ p_id: 'ev1', p_columna_id: 'col1', p_alumno: 'Ana', p_nota: 7.5 });
    expect(llamadas[7].args).toEqual({
      p_id: 'ev1',
      p_celdas: [{ alumno: 'Ana', columna_id: 'col1', nota: 6 }],
      p_finales: [{ alumno: 'Ana', nota: 6 }]
    });
  });

  test('si falta la migración 060, el error lo dice con claridad', async () => {
    const window = {
      supabaseClient: {
        rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
      }
    };
    new Function('window', repositorio)(window);
    await expect(window.plataformaRepository.listarEvaluaciones())
      .rejects.toThrow('060_evaluaciones.sql');
  });

  test('la sincronización de filas lleva la lista completa y reclama la 064 si falta', async () => {
    const llamadas = [];
    const repo = cargarRepositorio(llamadas);
    await repo.guardarAlumnosEvaluacion('ev1', ['Ana', 'Luis']);
    expect(llamadas[0].nombre).toBe('fb_evaluacion_alumnos_guardar');
    expect(llamadas[0].args).toEqual({ p_id: 'ev1', p_alumnos: ['Ana', 'Luis'] });

    // El rango va como argumento opcional: sin él, el servidor lo conserva.
    await repo.actualizarEvaluacion('ev1', '1ª Ev.', '', null);
    expect(llamadas[1].args).not.toHaveProperty('p_nota_max');
    await repo.actualizarEvaluacion('ev1', '1ª Ev.', '', null, 20);
    expect(llamadas[2].args.p_nota_max).toBe(20);

    const window = {
      supabaseClient: {
        rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
      }
    };
    new Function('window', repositorio)(window);
    await expect(window.plataformaRepository.guardarAlumnosEvaluacion('ev1', []))
      .rejects.toThrow('064_evaluacion_hoja_calculo.sql');
  });

  test('obtenerEvaluacion pide el troceado en secciones y si no lo entiende, reintenta', async () => {
    // Con tamaño: lleva el parámetro de la 065.
    const llamadas = [];
    const repo = cargarRepositorio(llamadas);
    await repo.obtenerEvaluacion('ev1', 4);
    expect(llamadas[0]).toEqual({
      nombre: 'fb_evaluacion_obtener',
      args: { p_id: 'ev1', p_columnas_por_seccion: 4 }
    });

    // Sin tamaño (otros llamadores): igual que siempre, solo p_id.
    await repo.obtenerEvaluacion('ev1');
    expect(llamadas[1].args).toEqual({ p_id: 'ev1' });

    // Servidor sin la 065: el primer intento falla y se repite con la firma
    // antigua; la vista calcula las secciones por su cuenta.
    let intentos = 0;
    const antiguo = {
      supabaseClient: {
        rpc: async () => {
          intentos++;
          if (intentos === 1) {
            return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.fb_evaluacion_obtener' } };
          }
          return { data: { evaluacion: { titulo: 'Ev' }, secciones: [] }, error: null };
        }
      }
    };
    new Function('window', repositorio)(antiguo);
    const datos = await antiguo.plataformaRepository.obtenerEvaluacion('ev1', 2);
    expect(intentos).toBe(2);
    expect(datos.evaluacion.titulo).toBe('Ev');
  });
});

describe('rutas, sidebar y títulos', () => {
  test('el listado y la rejilla se registran como rutas perezosas del panel', () => {
    expect(coreIndex).toContain("router.registrar('/evaluaciones', this._vistaLazy(['./js/vistas/vista-evaluaciones.js'], () => window.vistaEvaluaciones))");
    expect(coreIndex).toContain("router.registrar('/evaluaciones/:id', this._vistaLazy(['./js/vistas/vista-evaluacion-editar.js'], () => window.vistaEvaluacionEditar))");
    // El listado se registra antes que el detalle (el router usa orden).
    expect(coreIndex.indexOf("'/evaluaciones'")).toBeLessThan(coreIndex.indexOf("'/evaluaciones/:id'"));
  });

  test('la sección aparece en la barra lateral y nombra su propia pestaña', () => {
    expect(coreIndex).toMatch(/\{\s*ruta: '\/evaluaciones',\s*icono: 'clipboard-list',\s*texto: 'Evaluaciones'\s*\}/);
    expect(routerJs).toContain("'/evaluaciones': 'Evaluaciones'");
    expect(routerJs).toContain("'/evaluaciones/:id': 'Evaluación'");
  });
});

describe('vista de la rejilla', () => {
  const window = crearWindowBase();
  const vista = cargarRejilla(window);

  test('las vistas solo se abren con rol de administrador, editor o propietario', () => {
    expect(vistaListado).toMatch(/ROLES = \['admin', 'editor', 'owner'\]/);
    expect(vistaRejilla).toMatch(/ROLES = \['admin', 'editor', 'owner'\]/);
    expect(vistaListado).toContain('Esta sección es solo para el administrador.');
    expect(vistaRejilla).toContain('Esta sección es solo para el administrador.');
  });

  test('una celda manual se distingue, ofrece restaurar y muestra la media debajo', () => {
    const manual = vista._htmlCelda(8.5, true, 'Ana', 'Test', 7.25);
    expect(manual).toContain('eval-celda--manual');
    expect(manual).toContain('eval-restaurar');
    expect(manual).toContain('media 7,25');

    const automatica = vista._htmlCelda(6, false, 'Ana', 'Test');
    expect(automatica).not.toContain('eval-celda--manual');
    expect(automatica).not.toContain('eval-restaurar');

    const vacia = vista._htmlCelda(null, false, 'Ana', 'Test');
    expect(vacia).toContain('eval-celda--vacia');
    expect(vacia).toContain('—');
  });

  test('la nota final es la media de columnas salvo anulación manual', () => {
    vista._datos = {
      columnas: [{ id: 'c1' }, { id: 'c2' }],
      alumnos: ['Ana'],
      celdas: [
        { alumno: 'Ana', columna_id: 'c1', nota: 8, manual: false },
        { alumno: 'Ana', columna_id: 'c2', nota: 6, manual: true }
      ],
      finales: []
    };
    expect(vista._mediaAlumno('Ana')).toBe(7);
    expect(vista._valorCelda('Ana', '')).toEqual({ nota: 7, manual: false });

    vista._datos.finales = [{ alumno: 'Ana', nota: 9, manual: true, media: 7 }];
    expect(vista._valorCelda('Ana', '')).toEqual({ nota: 9, manual: true });
  });

  test('editar una celda la marca manual; vaciarla la devuelve al valor automático', () => {
    vista._datos = {
      columnas: [{ id: 'c1' }],
      alumnos: ['Ana'],
      celdas: [{ alumno: 'Ana', columna_id: 'c1', nota: 8, manual: false }],
      finales: []
    };
    vista._actualizarLocal('Ana', 'c1', 9);
    expect(vista._datos.celdas[0]).toEqual({ alumno: 'Ana', columna_id: 'c1', nota: 9, manual: true });

    // Limpiar la celda elimina la marca: vuelve a leerse del examen.
    vista._actualizarLocal('Ana', 'c1', null);
    expect(vista._datos.celdas).toEqual([]);

    // Una celda vacía que se rellena a mano también queda marcada.
    vista._actualizarLocal('Ana', 'c1', 5);
    expect(vista._datos.celdas[0].manual).toBe(true);

    // La nota final anulada convive con la media calculada.
    vista._actualizarLocal('Ana', '', 10);
    expect(vista._datos.finales[0]).toMatchObject({ nota: 10, manual: true });
    vista._actualizarLocal('Ana', '', null);
    expect(vista._datos.finales[0]).toMatchObject({ manual: false });
    expect(vista._datos.finales[0].nota).toBe(5);
  });

  test('importa el formato del Excel del profesor: nombres de examen arriba, alumno a la izquierda, nota final a la derecha', () => {
    vista._datos = {
      columnas: [
        { id: 'c1', nombre: 'Test Biblico 1' },
        { id: 'c2', nombre: 'Examen final' }
      ]
    };
    const filas = [
      ['Alumno', ' test biblico 1 ', 'Examen Final', 'Parcial antiguo', 'Nota final'],
      ['Ana', '8,5', '7', '9', '8,2'],
      ['Luis', '', '4', '6', '5'],
      ['', '3', '3', '3', '3']
    ];
    const r = vista._prepararImportacion(filas);

    expect(r.alumnos).toBe(2);
    expect(r.columnas).toBe(2);
    // La columna que la evaluación no tiene ya no se ignora: se crea al importar
    // (id provisorio «nueva:n» que se resuelve con los ids del servidor).
    expect(r.columnasNuevas).toEqual(['Parcial antiguo']);
    expect(r.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'nueva:0', nota: 9 });
    expect(r.celdas).toContainEqual({ alumno: 'Luis', columna_id: 'nueva:0', nota: 6 });
    // Coma decimal y mayúsculas normalizadas al emparejar.
    expect(r.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'c1', nota: 8.5 });
    expect(r.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'c2', nota: 7 });
    expect(r.celdas).toContainEqual({ alumno: 'Luis', columna_id: 'c2', nota: 4 });
    // Las celdas vacías no generan nota.
    expect(r.celdas.filter((c) => c.alumno === 'Luis' && c.columna_id === 'c1')).toEqual([]);
    // La última columna son notas finales.
    expect(r.finales).toContainEqual({ alumno: 'Ana', nota: 8.2 });
    expect(r.finales).toContainEqual({ alumno: 'Luis', nota: 5 });

    // Un archivo sin filas de datos no importa nada.
    expect(() => vista._prepararImportacion([['Alumno', 'Nota final']])).toThrow(/alumno/);
  });

  test('tras editar o restaurar una celda se relee el servidor (no se adivina lo automático)', async () => {
    const window = crearWindowBase();
    const guardar = vi.fn(async () => ({}));
    const obtener = vi.fn(async () => ({
      evaluacion: { titulo: 'Ev' }, columnas: [{ id: 'c1', nombre: 'Test' }],
      alumnos: ['Ana'], celdas: [{ alumno: 'Ana', columna_id: 'c1', nota: 8.5, manual: false }], finales: []
    }));
    window.plataformaRepository = { guardarCeldaEvaluacion: guardar, obtenerEvaluacion: obtener };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = { columnas: [{ id: 'c1', nombre: 'Test' }], alumnos: ['Ana'], celdas: [], finales: [] };
    // Pintar exige DOM; se sustituye por un espía para concentrar la prueba en el refresco.
    vista._pintar = vi.fn();

    await vista._guardarCelda('Ana', 'c1', '7');
    expect(guardar).toHaveBeenCalledWith('ev1', 'c1', 'Ana', 7);
    expect(obtener).toHaveBeenCalledTimes(1);
    // Lo pintado tras guardar viene del servidor (nota 8,5 del fixture).
    expect(vista._datos.celdas[0].nota).toBe(8.5);

    await vista._restaurarCelda({ closest: () => ({ dataset: { alumno: 'Ana', col: 'c1' } }) });
    expect(guardar).toHaveBeenLastCalledWith('ev1', 'c1', 'Ana', null);
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  test('el parser XLSX lee un .xlsx real (ZIP propio, cadenas compartidas y refs de celda)', async () => {
    const buffer = await crearXLSX([
      {
        nombre: 'xl/sharedStrings.xml',
        contenido: '<?xml version="1.0"?><sst><si><t>Alumno</t></si><si><t>Test Biblico 1</t></si><si><t>Nota final</t></si><si><t>Pepe Luque</t></si></sst>'
      },
      {
        nombre: 'xl/worksheets/sheet1.xml',
        contenido: '<?xml version="1.0"?><worksheet><sheetData>'
          + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>'
          + '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>7.5</v></c><c r="C2"><v>8</v></c></row>'
          + '<row r="3"><c r="A3" t="inlineStr"><is><t>Nuria</t></is></c><c r="B3"><v>6</v></c></row>'
          + '</sheetData></worksheet>'
      }
    ]);

    const filas = await vista._parseXLSX(buffer);
    // El parser devuelve lo que la hoja declara: una celda final ausente
    // queda como hueco (lo tolera _prepararImportacion, ver más abajo).
    expect(filas).toEqual([
      ['Alumno', 'Test Biblico 1', 'Nota final'],
      ['Pepe Luque', '7.5', '8'],
      ['Nuria', '6']
    ]);

    // Y ese resultado entra por el mismo camino que un CSV: cabeceras
    // emparejadas por nombre, coma decimal aceptada y nota final extraída.
    vista._datos = { columnas: [{ id: 'c1', nombre: 'Test Biblico 1' }] };
    const r = vista._prepararImportacion(filas);
    expect(r.alumnos).toBe(2);
    expect(r.celdas).toContainEqual({ alumno: 'Pepe Luque', columna_id: 'c1', nota: 7.5 });
    expect(r.celdas).toContainEqual({ alumno: 'Nuria', columna_id: 'c1', nota: 6 });
    expect(r.finales).toContainEqual({ alumno: 'Pepe Luque', nota: 8 });
    // Nuria no lleva nota final en la hoja: no se genera ninguna.
    expect(r.finales.filter((f) => f.alumno === 'Nuria')).toEqual([]);
  });

  test('soporta el formato real de las evaluaciones del profesor (NOMBRE / EXAMEN n / NOTA FINAL)', async () => {
    // Réplica del archivo real «Evaluación 5.xlsx» que usa la profesora:
    // cabeceras y nombres de alumno con ESPACIO FINAL, notas numéricas con
    // decimal (incluido 0.0) y una sola hoja. Nombres inventados.
    const buffer = await crearXLSX([
      {
        nombre: 'xl/sharedStrings.xml',
        contenido: '<?xml version="1.0"?><sst>'
          + '<si><t xml:space="preserve">NOMBRE </t></si>'
          + '<si><t>EXAMEN 29</t></si><si><t>EXAMEN 30</t></si><si><t>EXAMEN 31</t></si>'
          + '<si><t xml:space="preserve">NOTA FINAL </t></si>'
          + '<si><t xml:space="preserve">Ana </t></si><si><t>Luis</t></si><si><t xml:space="preserve">María </t></si>'
          + '</sst>'
      },
      {
        nombre: 'xl/worksheets/sheet1.xml',
        contenido: '<?xml version="1.0"?><worksheet><sheetData>'
          + '<row r="1"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" s="1" t="s"><v>1</v></c>'
          + '<c r="C1" s="1" t="s"><v>2</v></c><c r="D1" s="1" t="s"><v>3</v></c><c r="E1" s="1" t="s"><v>4</v></c></row>'
          + '<row r="2"><c r="A2" s="1" t="s"><v>5</v></c><c r="B2" s="1"><v>7.5</v></c>'
          + '<c r="C2" s="1"><v>10.0</v></c><c r="D2" s="1"><v>0.0</v></c><c r="E2" s="1"><v>8.7</v></c></row>'
          + '<row r="3"><c r="A3" s="1" t="s"><v>6</v></c><c r="B3" s="1"><v>6.0</v></c>'
          + '<c r="C3" s="1"><v>5.0</v></c><c r="D3" s="1"><v>4.0</v></c><c r="E3" s="1"><v>5.0</v></c></row>'
          + '<row r="4"><c r="A4" s="1" t="s"><v>7</v></c><c r="B4" s="1"><v>9.0</v></c>'
          + '<c r="C4" s="1"><v>9.0</v></c><c r="D4" s="1"><v>9.0</v></c><c r="E4" s="1"><v>9.0</v></c></row>'
          + '</sheetData></worksheet>'
      }
    ]);

    const filas = await vista._parseXLSX(buffer);
    // El parser devuelve los textos tal cual; el importador recorta espacios.
    expect(filas[0]).toEqual(['NOMBRE ', 'EXAMEN 29', 'EXAMEN 30', 'EXAMEN 31', 'NOTA FINAL ']);

    vista._datos = {
      columnas: [
        { id: 'c1', nombre: 'EXAMEN 29' },
        { id: 'c2', nombre: 'EXAMEN 30' },
        { id: 'c3', nombre: 'EXAMEN 31' },
        { id: 'c4', nombre: 'Trabajo antiguo' }
      ]
    };
    const r = vista._prepararImportacion(filas);

    expect(r.alumnos).toBe(3);
    expect(r.columnas).toBe(3);
    expect(r.celdas.length).toBe(9);
    expect(r.finales.length).toBe(3);
    // Ni «NOMBRE » ni «NOTA FINAL » se cuelan como columna de examen, y
    // ninguna cabecera del archivo exige crear columna.
    expect(r.columnasNuevas).toEqual([]);
    // Se avisa de la columna de la evaluación que el archivo no trae.
    expect(r.columnasSinDatos).toEqual(['Trabajo antiguo']);
    // Espacios finales recortados, 0.0 importado como nota válida.
    expect(r.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'c1', nota: 7.5 });
    expect(r.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'c3', nota: 0 });
    expect(r.celdas).toContainEqual({ alumno: 'María', columna_id: 'c2', nota: 9 });
    expect(r.finales).toContainEqual({ alumno: 'Ana', nota: 8.7 });
  });

  test('una evaluación vacía copia la tabla del archivo: las columnas se crean solas', async () => {
    const window = crearWindowBase();
    const guardadas = vi.fn(async (id, columnas) => ({
      columnas: columnas.map((c, i) => ({ ...c, id: 'id' + i }))
    }));
    window.plataformaRepository = { guardarColumnasEvaluacion: guardadas };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = { columnas: [] };

    const preparado = vista._prepararImportacion([
      ['NOMBRE', 'EXAMEN 29', 'EXAMEN 30', 'NOTA FINAL'],
      ['Ana', '7,5', '8', '7,75'],
      ['Luis', '5', '6', '5,5']
    ]);

    // Sin columnas previas, todas las del archivo se crean en su orden.
    expect(preparado.columnas).toBe(0);
    expect(preparado.columnasNuevas).toEqual(['EXAMEN 29', 'EXAMEN 30']);
    expect(preparado.celdas).toContainEqual({ alumno: 'Ana', columna_id: 'nueva:0', nota: 7.5 });

    const columnas = await vista._crearColumnasImportadas(preparado);
    // Se crean como columnas manuales, sin tocar nada más a mano.
    expect(guardadas).toHaveBeenCalledWith('ev1', [
      { id: null, tipo: 'manual', examen_id: null, nombre: 'EXAMEN 29' },
      { id: null, tipo: 'manual', examen_id: null, nombre: 'EXAMEN 30' }
    ]);
    expect(columnas.map((c) => c.id)).toEqual(['id0', 'id1']);

    // Las celdas provisionales quedan resueltas con los ids reales del servidor.
    const celdas = vista._resolverCeldasImportadas(preparado, columnas);
    expect(celdas).toContainEqual({ alumno: 'Ana', columna_id: 'id0', nota: 7.5 });
    expect(celdas).toContainEqual({ alumno: 'Ana', columna_id: 'id1', nota: 8 });
    expect(celdas.every((c) => String(c.columna_id).indexOf('nueva:') !== 0)).toBe(true);

    // Si el servidor no confirma las columnas, se avisa en vez de importar a ciegas.
    window.plataformaRepository.guardarColumnasEvaluacion = vi.fn(async () => ({}));
    await expect(vista._crearColumnasImportadas(preparado)).rejects.toThrow(/Vuelve a importar/);
  });

  test('al importar sobre columnas existentes se conservan id y orden y se añaden las nuevas', async () => {
    const window = crearWindowBase();
    const guardadas = vi.fn(async (id, columnas) => ({
      columnas: columnas.map((c, i) => ({ ...c, id: c.id || 'nue' + i }))
    }));
    window.plataformaRepository = { guardarColumnasEvaluacion: guardadas };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = {
      columnas: [
        { id: 'c1', nombre: 'Test Biblico 1', tipo: 'manual', examen_id: null },
        { id: 'c2', nombre: 'Trabajo', tipo: 'examen', examen_id: 'x9' }
      ]
    };

    const preparado = vista._prepararImportacion([
      ['Alumno', 'TEST BIBLICO 1', 'Parcial', 'Nota final'],
      ['Ana', '8', '6', '7']
    ]);

    // La existente se empareja por nombre normalizado (no se duplica).
    expect(preparado.columnas).toBe(1);
    expect(preparado.columnasNuevas).toEqual(['Parcial']);
    // La que el archivo no trae se conserva y se avisa de que queda vacía.
    expect(preparado.columnasSinDatos).toEqual(['Trabajo']);

    const columnas = await vista._crearColumnasImportadas(preparado);
    // El RPC recibe la lista completa: existentes con su id/tipo/examen y la nueva.
    expect(guardadas).toHaveBeenCalledWith('ev1', [
      { id: 'c1', tipo: 'manual', examen_id: null, nombre: 'Test Biblico 1' },
      { id: 'c2', tipo: 'examen', examen_id: 'x9', nombre: 'Trabajo' },
      { id: null, tipo: 'manual', examen_id: null, nombre: 'Parcial' }
    ]);
    // La celda de la columna existente conserva su id original.
    expect(vista._resolverCeldasImportadas(preparado, columnas)).toContainEqual({
      alumno: 'Ana', columna_id: 'c1', nota: 8
    });
  });

  test('una cabecera repetida en el archivo no crea dos columnas (manda la última nota)', () => {
    const window = crearWindowBase();
    const vista = cargarRejilla(window);
    vista._datos = { columnas: [] };

    const preparado = vista._prepararImportacion([
      ['Alumno', 'Examen 1', 'Examen 1', 'Nota final'],
      ['Ana', '5', '7', '6']
    ]);

    expect(preparado.columnasNuevas).toEqual(['Examen 1']);
    expect(preparado.celdas).toEqual([{ alumno: 'Ana', columna_id: 'nueva:0', nota: 7 }]);
  });

  test('el parser CSV admite «;», comillas y coma decimal', () => {
    const filas = vista._parseCSV('Alumno;Nota final\r\n"Pepez, hijo";7,25\r\n');
    expect(filas).toEqual([
      ['Alumno', 'Nota final'],
      ['Pepez, hijo', '7,25']
    ]);
    // También con coma como separador y saltos de línea entre comillas.
    const simple = vista._parseCSV('A,B\n1,2\n');
    expect(simple).toEqual([['A', 'B'], ['1', '2']]);
  });

  test('el CSV de exportación usa «;», coma decimal y la nota final calculada', () => {
    vista._datos = {
      evaluacion: { nombre: '1ª Evaluación' },
      columnas: [{ id: 'c1', nombre: 'Test 1' }],
      alumnos: ['Ana', 'Luis'],
      celdas: [
        { alumno: 'Ana', columna_id: 'c1', nota: 8.5, manual: true },
        { alumno: 'Luis', columna_id: 'c1', nota: 6, manual: false }
      ],
      finales: [{ alumno: 'Ana', nota: 9, manual: true, media: 8.5 }]
    };
    const csv = vista._csvContenido();
    const lineas = csv.trim().split('\r\n');
    expect(lineas[0]).toBe('Alumno;Test 1;Nota final');
    expect(lineas[1]).toBe('Ana;8,5;9');
    // Luis no tiene nota final escrita: exporta su media de columnas.
    expect(lineas[2]).toBe('Luis;6;6');
  });

  test('la nota se valida contra el rango configurado y distingue vacío de cero', () => {
    vista._datos = { evaluacion: { nota_max: 20 }, columnas: [{ id: 'c1' }], alumnos: ['Ana'], celdas: [], finales: [] };
    expect(vista._validarNotaTexto('')).toEqual({ ok: true, nota: null }); // pendiente
    expect(vista._validarNotaTexto('0')).toEqual({ ok: true, nota: 0 });   // sí es una nota
    expect(vista._validarNotaTexto('7,5')).toEqual({ ok: true, nota: 7.5 });
    expect(vista._validarNotaTexto('15').ok).toBe(true);      // dentro del rango 0-20
    const fuera = vista._validarNotaTexto('21');
    expect(fuera.ok).toBe(false);
    expect(fuera.error).toContain('0 y 20');
    expect(vista._validarNotaTexto('siete').ok).toBe(false);

    // Sin rango configurado sigue valiendo el tope clásico de 10.
    vista._datos = { columnas: [], alumnos: [] };
    expect(vista._validarNotaTexto('10,5').ok).toBe(false);
    expect(vista._rangoNota()).toBe(10);
  });

  test('el resultado final pondera los pesos y sin pesos es la media de siempre', () => {
    vista._datos = {
      evaluacion: { nota_max: 10 },
      columnas: [{ id: 'c1', peso: 3 }, { id: 'c2', peso: 1 }],
      alumnos: ['Ana'],
      celdas: [
        { alumno: 'Ana', columna_id: 'c1', nota: 4, manual: false },
        { alumno: 'Ana', columna_id: 'c2', nota: 8, manual: false }
      ],
      finales: []
    };
    // (4×3 + 8×1) ÷ 4 = 5: misma fórmula que la del servidor.
    expect(vista._mediaAlumno('Ana')).toBe(5);
    expect(vista._formulaTexto()).toContain('ponderada');

    // Una celda pendiente no cuenta: nunca se convierte en cero.
    vista._datos.celdas = [{ alumno: 'Ana', columna_id: 'c1', nota: 6, manual: false }];
    expect(vista._mediaAlumno('Ana')).toBe(6);

    // Sin pesos configurados, media aritmética (regresión de las evaluaciones antiguas).
    vista._datos.columnas = [{ id: 'c1', peso: null }, { id: 'c2', peso: null }];
    vista._datos.celdas = [
      { alumno: 'Ana', columna_id: 'c1', nota: 8, manual: false },
      { alumno: 'Ana', columna_id: 'c2', nota: 6, manual: false }
    ];
    expect(vista._mediaAlumno('Ana')).toBe(7);
    expect(vista._formulaTexto()).toContain('aritmética');
  });

  test('el resultado calculado no se edita a mano; el manual sigue restaurándose', () => {
    vista._datos = { columnas: [{ id: 'c1' }], alumnos: ['Ana'], celdas: [], finales: [] };
    const calculado = vista._htmlFinalCalculado('Ana', 8);
    expect(calculado).toContain('eval-celda--calculada');
    expect(calculado).not.toContain('<button');
    // El criterio queda a mano en el título de la celda y en Configuración.
    expect(calculado).toContain('media aritmética');
    // Regresión: una final anulada a mano sigue editable con su restauración.
    const manual = vista._htmlCelda(9, true, 'Ana', 'Resultado final', 8);
    expect(manual).toContain('eval-restaurar');
    expect(manual).toContain('media 8');
  });

  test('la cola de guardado: lo último gana por celda y un fallo no pierde el valor', async () => {
    const window = crearWindowBase();
    const guardar = vi.fn(async () => ({}));
    const obtener = vi.fn(async () => ({
      evaluacion: { titulo: 'Ev' }, columnas: [{ id: 'c1' }],
      alumnos: ['Ana'], celdas: [], finales: []
    }));
    window.plataformaRepository = { guardarCeldaEvaluacion: guardar, obtenerEvaluacion: obtener };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = { evaluacion: {}, columnas: [{ id: 'c1' }], alumnos: ['Ana'], celdas: [], finales: [] };
    vista._pintar = vi.fn();

    // Tres ediciones rápidas en la misma celda: solo viaja la última.
    vista._programarGuardado('Ana', 'c1', 5);
    vista._programarGuardado('Ana', 'c1', 6);
    vista._programarGuardado('Ana', 'c1', 7);
    expect(vista._cola.size).toBe(1);
    await vista._volcar();
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(guardar).toHaveBeenCalledWith('ev1', 'c1', 'Ana', 7);
    expect(vista._estado).toBe('ok');

    // Fallo de red: el valor escrito se queda en la rejilla y en la cola.
    guardar.mockRejectedValueOnce(new Error('sin red'));
    vista._programarGuardado('Ana', 'c1', 9);
    await vista._volcar();
    expect(vista._estado).toBe('error');
    expect(vista._cola.size).toBe(1);
    expect(vista._datos.celdas[0].nota).toBe(9);

    // Reintentar vuelve a enviar y el estado vuelve a «guardado».
    await vista._volcar();
    expect(guardar).toHaveBeenLastCalledWith('ev1', 'c1', 'Ana', 9);
    expect(vista._estado).toBe('ok');
    expect(vista._cola.size).toBe(0);
  });

  test('la lista de alumnos se sincroniza completa (lo que ve el cliente, lo guarda el servidor)', async () => {
    const window = crearWindowBase();
    const guardarAlumnos = vi.fn(async () => ({ alumnos: 3 }));
    const obtener = vi.fn(async () => ({
      evaluacion: {}, columnas: [{ id: 'c1' }],
      alumnos: ['Ana', 'Luis', 'María'], celdas: [], finales: []
    }));
    window.plataformaRepository = { guardarAlumnosEvaluacion: guardarAlumnos, obtenerEvaluacion: obtener };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = { evaluacion: {}, columnas: [{ id: 'c1' }], alumnos: ['Ana', 'Luis'], celdas: [], finales: [] };
    vista._pintar = vi.fn();

    await vista._sincronizarAlumnos(['Ana', 'Luis', 'María']);
    expect(guardarAlumnos).toHaveBeenCalledWith('ev1', ['Ana', 'Luis', 'María']);
    expect(obtener).toHaveBeenCalledTimes(1);
    expect(vista._datos.alumnos).toEqual(['Ana', 'Luis', 'María']);
  });

  test('eliminar una fila con datos pide confirmación; sin datos no', async () => {
    const window = crearWindowBase();
    window.helpers.confirmar = vi.fn(async () => true);
    const guardarAlumnos = vi.fn(async () => ({}));
    const obtener = vi.fn(async () => ({
      evaluacion: {}, columnas: [{ id: 'c1' }],
      alumnos: ['Luis'], celdas: [], finales: []
    }));
    window.plataformaRepository = { guardarAlumnosEvaluacion: guardarAlumnos, obtenerEvaluacion: obtener };
    const vista = cargarRejilla(window);
    vista._id = 'ev1';
    vista._datos = {
      evaluacion: {}, columnas: [{ id: 'c1' }], alumnos: ['Ana', 'Luis'],
      celdas: [{ alumno: 'Ana', columna_id: 'c1', nota: 7, manual: false }], finales: []
    };
    vista._pintar = vi.fn();

    await vista._eliminarFila('Ana');
    expect(window.helpers.confirmar).toHaveBeenCalledTimes(1);
    expect(guardarAlumnos).toHaveBeenCalledWith('ev1', ['Luis']);

    // Sin notas no se interrumpe: se elimina directamente.
    await vista._eliminarFila('Luis');
    expect(window.helpers.confirmar).toHaveBeenCalledTimes(1);
    expect(guardarAlumnos).toHaveBeenLastCalledWith('ev1', []);
  });

  test('la importación respeta el rango configurado de la evaluación', () => {
    vista._datos = { evaluacion: { nota_max: 20 }, columnas: [{ id: 'c1', nombre: 'Examen' }] };
    const r = vista._prepararImportacion([
      ['Alumno', 'Examen', 'Nota final'],
      ['Ana', '15', '18'],
      ['Luis', '25', '30']
    ]);
    // 15 y 18 caben en el rango 0-20; 25 y 30 se descartan.
    expect(r.celdas).toEqual([{ alumno: 'Ana', columna_id: 'c1', nota: 15 }]);
    expect(r.finales).toEqual([{ alumno: 'Ana', nota: 18 }]);
  });
});
