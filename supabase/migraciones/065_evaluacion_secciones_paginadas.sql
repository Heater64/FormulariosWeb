-- ============================================================================
-- 065_evaluacion_secciones_paginadas.sql
-- ----------------------------------------------------------------------------
-- La rejilla pasa a mostrarse POR SECCIONES: cada sección es un grupo
-- contiguo de columnas y la hoja muestra una sección a la vez (swipe o
-- mini-mapa para cambiar). El servidor agrupa las columnas ordenadas y
-- devuelve el resultado ya paginado para que todas las vistas (móvil y
-- escritorio) vean exactamente lo mismo.
--
-- Contrato de fb_evaluacion_obtener:
--   · Se mantiene intacto lo que ya devolvía la 064 —
--     evaluacion, columnas, alumnos, celdas y finales — con la misma
--     estructura: una evaluación antigua se abre igual que antes.
--   · Añade `secciones`: [{ indice, columna_ids }] con los grupos en el
--     orden de las columnas. Vacío si la evaluación no tiene columnas.
--   · Pará opcional p_columnas_por_seccion (por defecto 3, limitado a 1..12):
--     el cliente pasa el número de columnas que caben en su pantalla y el
--     servidor trocea igual. La firma antigua de un argumento se elimina para
--     que PostgREST no vea dos candidatas ambiguas (mismo patrón que la 064
--     con fb_evaluacion_actualizar); una llamada solo con p_id sigue
--     funcionando porque el parámetro tiene DEFAULT.
--
-- Sin cambios de tablas ni permisos nuevos: RLS y EXECUTE igual que en
-- 060-064 (solo authenticated, ninguna tabla directa). Idempotente: se puede
-- aplicar sobre una BD con la 060-064 puestas.
-- ============================================================================

DROP FUNCTION IF EXISTS public.fb_evaluacion_obtener(UUID);

CREATE OR REPLACE FUNCTION public.fb_evaluacion_obtener(
  p_id UUID,
  p_columnas_por_seccion INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  salida JSONB;
  -- Troceado solicitado por el cliente: 3 por defecto, siempre 1..12.
  v_tam INTEGER := greatest(1, least(coalesce(p_columnas_por_seccion, 3), 12));
BEGIN
  ev := public.fb_evaluacion_validar(p_id);

  WITH columnas AS (
    -- `id` es lo que usa la vista (y `columna_id` se mantiene por compatibilidad
    -- con lo que la 060-064 devolvían en las celdas).
    SELECT c.id, c.id AS columna_id, c.tipo, c.examen_id, c.nombre, c.posicion, c.peso
    FROM public.evaluaciones_columnas c
    WHERE c.evaluacion_id = p_id
  ),
  automaticas AS (
    -- Último intento corregido de cada alumno en cada examen de la rejilla.
    SELECT DISTINCT ON (cx.columna_id, lower(btrim(i.alumno_nombre)))
           cx.columna_id,
           lower(btrim(i.alumno_nombre)) AS clave_alumno,
           i.nota
    FROM columnas cx
    JOIN public.intentos_examen_personalizado i
      ON cx.tipo = 'examen' AND cx.examen_id IS NOT NULL
     AND i.examen_id = cx.examen_id
     AND i.corregido AND i.nota IS NOT NULL
     AND btrim(coalesce(i.alumno_nombre, '')) <> ''
    ORDER BY cx.columna_id, lower(btrim(i.alumno_nombre)), i.fecha_completado DESC NULLS LAST
  ),
  explicitos AS (
    -- Filas que el profesor ha gestionado (ordenadas por posición).
    SELECT a.clave, a.alumno, a.posicion
    FROM public.evaluaciones_alumnos a
    WHERE a.evaluacion_id = p_id AND NOT a.oculto
  ),
  derivados AS (
    -- Aparecidas solas y todavía no materializadas (ni tumbadas: la función
    -- excluye toda clave presente en la tabla, visible u oculta).
    SELECT d.c_alumno AS clave, d.n_alumno AS alumno
    FROM public.fb_evaluacion_alumnos_derivados(p_id) d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.evaluaciones_alumnos a
      WHERE a.evaluacion_id = p_id AND a.clave = d.c_alumno
    )
  ),
  alumnos AS (
    SELECT clave, alumno, 0 AS grupo, posicion AS orden FROM explicitos
    UNION ALL
    SELECT clave, alumno, 1, 0 FROM derivados
  ),
  valores AS (
    SELECT al.alumno, cx.columna_id, cx.peso,
           coalesce(mn.nota, au.nota) AS nota,
           (mn.id IS NOT NULL) AS manual
    FROM alumnos al
    CROSS JOIN columnas cx
    LEFT JOIN public.evaluaciones_notas mn
      ON mn.evaluacion_id = p_id AND mn.columna_id = cx.columna_id
     AND lower(btrim(mn.alumno)) = al.clave
    LEFT JOIN automaticas au
      ON au.columna_id = cx.columna_id AND au.clave_alumno = al.clave
  ),
  finales AS (
    -- Media ponderada sobre las celdas CON nota (peso NULL = 1): si ningún
    -- peso está configurado, esto ES la media aritmética de siempre. Celdas
    -- vacías/pendientes no cuentan y nunca se convierten en 0. Sin filas con
    -- nota, sum devuelve NULL → media NULL (resultado pendiente, no cero).
    SELECT al.alumno,
           round(sum(v.nota * coalesce(v.peso, 1)) / sum(coalesce(v.peso, 1)), 2) AS media
    FROM alumnos al
    LEFT JOIN valores v ON v.alumno = al.alumno AND v.nota IS NOT NULL
    GROUP BY al.alumno
  )
  SELECT jsonb_build_object(
    'evaluacion', to_jsonb(ev),
    'columnas', (
      SELECT coalesce(jsonb_agg(to_jsonb(cx) ORDER BY cx.posicion), '[]'::jsonb)
      FROM columnas cx
    ),
    'alumnos', (
      SELECT coalesce(jsonb_agg(al.alumno ORDER BY al.grupo, al.orden NULLS LAST, al.alumno), '[]'::jsonb)
      FROM alumnos al
    ),
    'celdas', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object('alumno', v.alumno, 'columna_id', v.columna_id,
                           'nota', v.nota, 'manual', v.manual)
      ), '[]'::jsonb)
      FROM valores v WHERE v.nota IS NOT NULL
    ),
    'finales', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'alumno', f.alumno,
          'nota', coalesce(mn.nota, f.media),
          'manual', mn.id IS NOT NULL,
          'media', f.media
        ) ORDER BY f.alumno
      ), '[]'::jsonb)
      FROM finales f
      LEFT JOIN public.evaluaciones_notas mn
        ON mn.evaluacion_id = p_id AND mn.columna_id IS NULL
       AND lower(btrim(mn.alumno)) = lower(f.alumno)
    ),
    -- NUEVO en 065: columnas troceadas en grupos de v_tam para la paginación
    -- de la rejilla. `indice` es 0-based y sigue el orden de `columnas`.
    'secciones', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object('indice', g.idx, 'columna_ids', g.ids)
        ORDER BY g.idx
      ), '[]'::jsonb)
      FROM (
        SELECT (o.rn - 1) / v_tam AS idx,
               jsonb_agg(o.columna_id ORDER BY o.rn) AS ids
        FROM (
          SELECT c.columna_id,
                 row_number() OVER (ORDER BY c.posicion, c.columna_id) AS rn
          FROM columnas c
        ) o
        GROUP BY (o.rn - 1) / v_tam
      ) g
    )
  ) INTO salida;

  RETURN salida;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_obtener(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_obtener(UUID, INTEGER) TO authenticated;

SELECT '065 aplicada: fb_evaluacion_obtener devuelve secciones paginadas (misma estructura que antes)' AS mensaje;
