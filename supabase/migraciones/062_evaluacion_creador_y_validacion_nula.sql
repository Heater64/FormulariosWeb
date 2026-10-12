-- ============================================================================
-- 062_evaluacion_creador_y_validacion_nula.sql
-- ----------------------------------------------------------------------------
-- Tres arreglos a las RPC de la sección Evaluaciones, detectados probando la
-- 061 en vivo contra Supabase:
--
-- 1) CREADOR: la tabla `evaluaciones` de la 009 no tiene DEFAULT en
--    creado_por, así que fb_evaluacion_crear dejaba la fila con creado_por
--    NULL. Se asigna explícitamente auth.uid().
--
-- 2) AUTORIZACIÓN CON TRES VALORES: la comprobación
--      IF NOT (ev.creado_por = auth.uid() OR public.es_owner())
--    con creado_por NULL evaluaba NOT(NULL OR false) = NOT NULL = NULL, y
--    plpgsql trata IF NULL como falso: la función NO lanzaba el error y
--    cualquier usuario autenticado podía leer/editar/borrar una evaluación
--    huérfana. Se cambia por IS DISTINCT FROM, que no tiene puntos ciegos.
--
-- 3) LISTADO: con el mismo predicado, las filas con creado_por NULL no
--    aparecían en fb_evaluaciones_listar (NULL OR false → NULL → fuera). El
--    listado ahora muestra las propias (creado_por = auth.uid()) y el
--    propietario ve todas; las huérfanas solo las ve el propietario, que
--    puede así limpiarlas.
--
-- Idempotente: solo redeclara funciones.
-- ============================================================================

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
  -- IS DISTINCT FROM evita el hueco de tres valores SQL cuando creado_por es
  -- NULL (una evaluación huérfana no es de nadie: solo el propietario).
  IF ev.creado_por IS DISTINCT FROM auth.uid() AND NOT coalesce(public.es_owner(), false) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN ev;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_validar(UUID) FROM PUBLIC, anon, authenticated;

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
      'num_columnas', (SELECT count(*) FROM public.evaluaciones_columnas c WHERE c.evaluacion_id = e.id),
      'num_alumnos', (SELECT count(DISTINCT n.alumno) FROM public.evaluaciones_notas n WHERE n.evaluacion_id = e.id)
    )
    FROM public.evaluaciones e
    WHERE ((e.creado_por IS NOT NULL AND e.creado_por = auth.uid()) OR public.es_owner())
      -- La rejilla solo gestiona evaluaciones sin grupo asignado: las de un
      -- grupo siguen siendo responsabilidad de la vista de grupos.
      AND e.grupo_id IS NULL
    ORDER BY e.fecha DESC NULLS LAST, e.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluaciones_listar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluaciones_listar() TO authenticated;

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
BEGIN
  IF v_nombre = '' THEN
    RAISE EXCEPTION 'La evaluación necesita nombre';
  END IF;
  -- creado_por explícito: la tabla de la 009 no trae DEFAULT auth.uid().
  INSERT INTO public.evaluaciones (titulo, descripcion, fecha, creado_por)
  VALUES (left(v_nombre, 160), left(coalesce(p_descripcion, ''), 2000), p_fecha, auth.uid())
  RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) TO authenticated;

SELECT '062 aplicada: creado_por explícito y autorización sin huecos de tres valores SQL' AS mensaje;
