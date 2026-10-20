-- ============================================================================
-- 074_evaluaciones_una_sola_lista.sql
-- ----------------------------------------------------------------------------
-- Había dos listas de evaluaciones sobre la misma tabla:
--   · La sección «Evaluaciones» (fb_evaluaciones_listar, 064) solo mostraba
--     filas con grupo_id IS NULL.
--   · El editor de exámenes y Calificaciones leen por grupo_id (RLS de 028/035).
-- Resultado: lo creado en una vista no aparecía en la otra.
--
-- Esta migración deja una sola lista:
--
-- 1) BACKFILL: las evaluaciones propias sin grupo pasan al grupo de su creador
--    (perfiles.grupo_id), que es el mismo criterio que usa el editor.
--
-- 2) ALTA: fb_evaluacion_crear asigna el grupo del perfil del autor, siempre
--    que sea editor de ese grupo. Así una evaluación creada en cualquiera de
--    las dos vistas aparece en ambas.
--
-- 3) LISTADO Y ACCESO: se muestran (y se pueden abrir) las evaluaciones del
--    propio autor, las de los grupos donde el usuario es editor y, para el
--    propietario, todas. Es el mismo criterio que la RLS de la tabla
--    (es_editor_del_grupo ya incluye al propietario).
--
-- Las huérfanas (creado_por NULL) siguen siendo solo del propietario.
-- Idempotente.
-- ============================================================================

-- ── 1) Backfill ──────────────────────────────────────────────────────────────
UPDATE public.evaluaciones e
SET grupo_id = p.grupo_id
FROM public.perfiles p
WHERE p.id = e.creado_por
  AND e.grupo_id IS NULL
  AND p.grupo_id IS NOT NULL;

-- ── 2) Validación de acceso (la usan todas las RPC de la rejilla) ───────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_validar(p_id UUID)
RETURNS public.evaluaciones
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
BEGIN
  SELECT * INTO ev FROM public.evaluaciones WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evaluación no encontrada';
  END IF;
  -- coalesce: una fila con creado_por NULL no debe producir un NULL que
  -- evalúe como falso (ver 062). es_editor_del_grupo nunca devuelve NULL.
  IF NOT (
    coalesce(ev.creado_por = auth.uid(), false)
    OR public.es_editor_del_grupo(ev.grupo_id)
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN ev;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_validar(UUID) FROM PUBLIC, anon, authenticated;

-- ── 3) Listado único ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluaciones_listar()
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'descripcion', e.descripcion,
      'fecha', e.fecha,
      'grupo_id', e.grupo_id,
      'orden', e.orden,
      'creado_en', e.creado_en,
      'actualizado_en', e.actualizado_en,
      'nota_max', e.nota_max,
      'num_columnas', (SELECT count(*) FROM public.evaluaciones_columnas c WHERE c.evaluacion_id = e.id),
      'num_alumnos', (
        SELECT count(DISTINCT k) FROM (
          SELECT a.clave AS k FROM public.evaluaciones_alumnos a
          WHERE a.evaluacion_id = e.id AND NOT a.oculto
          UNION
          SELECT lower(btrim(n.alumno))
          FROM public.evaluaciones_notas n
          WHERE n.evaluacion_id = e.id
            AND NOT EXISTS (
              SELECT 1 FROM public.evaluaciones_alumnos a2
              WHERE a2.evaluacion_id = e.id
                AND a2.clave = lower(btrim(n.alumno))
            )
        ) t
      )
    )
    FROM public.evaluaciones e
    WHERE (e.creado_por IS NOT NULL AND e.creado_por = auth.uid())
       OR public.es_editor_del_grupo(e.grupo_id)
    ORDER BY e.fecha DESC NULLS LAST, e.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluaciones_listar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluaciones_listar() TO authenticated;

-- ── 4) Alta con el grupo del autor ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_crear(
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT '',
  p_fecha DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  v_nombre TEXT := btrim(coalesce(p_nombre, ''));
  v_grupo UUID;
BEGIN
  IF v_nombre = '' THEN
    RAISE EXCEPTION 'La evaluación necesita nombre';
  END IF;
  -- Mismo grupo que el editor de exámenes. Solo si el autor es editor de él.
  SELECT p.grupo_id INTO v_grupo FROM public.perfiles p WHERE p.id = auth.uid();
  IF v_grupo IS NOT NULL AND NOT public.es_editor_del_grupo(v_grupo) THEN
    v_grupo := NULL;
  END IF;
  INSERT INTO public.evaluaciones (titulo, descripcion, fecha, creado_por, grupo_id)
  VALUES (left(v_nombre, 160), left(coalesce(p_descripcion, ''), 2000), p_fecha, auth.uid(), v_grupo)
  RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) TO authenticated;

SELECT '074 aplicada: una sola lista de evaluaciones (grupo del autor + acceso por editor)' AS mensaje;
