-- ==============================================================================
-- MIGRACIÓN 073: el intento hecho dentro de la app guarda el nombre del alumno
-- ==============================================================================
-- MOTIVO
--   Los exámenes rendidos desde dentro de la app (iniciar_intento_examen, 047)
--   fijan alumno_id = auth.uid() pero dejan alumno_nombre vacío: esa columna
--   la rellenan solo los enlaces (056/063). Resultado: en «Entregas» esos
--   intentos salen como «Sin nombre», sin registro visible de qué cuenta hizo
--   el examen (aunque alumno_id esté fijado, el nombre mostrado está vacío).
--
-- MODELO
--   · iniciar_intento_examen rellena alumno_nombre y alumno_grupo con el
--     perfil (nombre_completo o username) y el nombre de su grupo. Al retomar
--     un intento con el nombre vacío también lo rellena.
--   · Backfill: los intentos ya existentes con cuenta pero sin nombre se
--     rellenan desde perfiles/grupos.
--   · fb_listar_entregas y fb_obtener_entrega devuelven el nombre del perfil
--     como respaldo cuando la fila aún no tiene alumno_nombre (filas
--     anteriores a esta migración), y pasan a incluir alumno_id y
--     alumno_asignado para que la lista siempre muestre la cuenta.
--
-- SEGURIDAD
--   · Sin cambios de permisos: las funciones siguen siendo SECURITY DEFINER
--     con los mismos GRANT/REVOKE que ya tenían (047/069).
--
-- IDEMPOTENTE Y NO DESTRUCTIVA: solo CREATE OR REPLACE, ADD COLUMN IF EXISTS
-- y un UPDATE de celdas vacías; no borra filas ni cambia tipos.
--
-- COMO APLICAR: pegar en el SQL editor de Supabase y ejecutar. Requiere la
-- 056 (columnas alumno_nombre/alumno_grupo) aplicada antes.
-- ==============================================================================

-- Columnas por si la 056 aún no pasó (no hace nada si ya existen).
ALTER TABLE public.intentos_examen_personalizado
  ADD COLUMN IF NOT EXISTS alumno_nombre TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alumno_grupo TEXT NOT NULL DEFAULT '';

-- ------------------------------------------------------------------------------
-- 1. El intento de la app nace con el nombre de la cuenta que lo hace
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iniciar_intento_examen(p_examen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  c JSONB;
  limite INTEGER;
  completados INTEGER;
  v_nombre TEXT;
  v_grupo TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() <> 'usuario' THEN RAISE EXCEPTION 'Solo un alumno puede iniciar este examen'; END IF;
  -- Serializa dos pestañas/dispositivos del mismo alumno para el mismo examen.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_examen_id::text || ':' || auth.uid()::text, 0));
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id AND publicado = TRUE AND estado = 'publicado';
  IF NOT FOUND OR NOT public.es_miembro_del_grupo(e.grupo_id) THEN RAISE EXCEPTION 'Examen no disponible'; END IF;
  c := coalesce(e.config, '{}'::jsonb);
  IF nullif(c->>'fecha_inicio', '') IS NOT NULL AND now() < (c->>'fecha_inicio')::timestamptz THEN RAISE EXCEPTION 'El examen aun no esta disponible'; END IF;
  IF nullif(c->>'fecha_fin', '') IS NOT NULL AND now() > (c->>'fecha_fin')::timestamptz THEN RAISE EXCEPTION 'El plazo del examen ha finalizado'; END IF;
  limite := CASE WHEN c->>'intentos' = 'ilimitados' THEN NULL ELSE greatest(1, coalesce((c->>'intentos')::integer, 1)) END;

  -- Nombre visible en «Entregas»: el perfil de la cuenta que rinde.
  SELECT nullif(btrim(coalesce(p.nombre_completo, p.username, '')), '') INTO v_nombre
    FROM public.perfiles p WHERE p.id = auth.uid();
  SELECT coalesce(g.nombre, '') INTO v_grupo
    FROM public.perfiles p LEFT JOIN public.grupos g ON g.id = p.grupo_id
    WHERE p.id = auth.uid();
  IF v_nombre IS NULL THEN v_nombre := ''; END IF;
  IF v_grupo IS NULL THEN v_grupo := ''; END IF;

  SELECT * INTO i FROM public.intentos_examen_personalizado
  WHERE examen_id = p_examen_id AND alumno_id = auth.uid() AND estado IN ('pendiente', 'en_progreso')
  ORDER BY creado_en LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF i.estado = 'pendiente' THEN
      UPDATE public.intentos_examen_personalizado
      SET estado = 'en_progreso', fecha_inicio = coalesce(i.fecha_inicio, now())
      WHERE id = i.id;
      i.estado := 'en_progreso';
    END IF;
    -- Retoma un intento anterior a esta migración: rellena el nombre vacío.
    IF coalesce(btrim(i.alumno_nombre), '') = '' AND v_nombre <> '' THEN
      UPDATE public.intentos_examen_personalizado
      SET alumno_nombre = v_nombre, alumno_grupo = v_grupo
      WHERE id = i.id;
      i.alumno_nombre := v_nombre;
      i.alumno_grupo := v_grupo;
    END IF;
    RETURN to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
  END IF;
  SELECT count(*) INTO completados FROM public.intentos_examen_personalizado
  WHERE examen_id = p_examen_id AND alumno_id = auth.uid() AND estado IN ('completado', 'calificado');
  IF limite IS NOT NULL AND completados >= limite THEN RAISE EXCEPTION 'Has alcanzado el limite de intentos'; END IF;

  INSERT INTO public.intentos_examen_personalizado (
    examen_id, alumno_id, alumno_nombre, alumno_grupo,
    respuestas, estado, fecha_inicio, preguntas_snapshot,
    config_snapshot, version_examen
  ) VALUES (
    e.id, auth.uid(), v_nombre, v_grupo,
    '{}'::jsonb, 'en_progreso', now(), e.preguntas,
    c, e.version
  ) RETURNING * INTO i;
  RETURN to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Backfill: intentos con cuenta pero sin nombre (anteriores a esta migración)
-- ------------------------------------------------------------------------------
UPDATE public.intentos_examen_personalizado i
SET alumno_nombre = nullif(btrim(coalesce(p.nombre_completo, p.username, '')), ''),
    alumno_grupo = coalesce(g.nombre, '')
FROM public.perfiles p
LEFT JOIN public.grupos g ON g.id = p.grupo_id
WHERE i.alumno_id = p.id
  AND i.alumno_id IS NOT NULL
  AND coalesce(btrim(i.alumno_nombre), '') = ''
  AND nullif(btrim(coalesce(p.nombre_completo, p.username, '')), '') IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Entregas: respaldo al nombre del perfil + cuenta asignada siempre visible
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_listar_entregas(p_examen_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT;
  v_grupo TEXT;
  v_asignado TEXT;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  FOR i IN SELECT * FROM public.intentos_examen_personalizado
           WHERE examen_id = p_examen_id
           ORDER BY fecha_completado DESC NULLS LAST, fecha_inicio DESC LOOP
    -- Nombre de la fila (enlace) o, si está vacío, el de la cuenta del intento:
    -- así un intento de la app anterior a esta migración nunca sale «Sin nombre».
    v_nombre := nullif(btrim(coalesce(i.alumno_nombre, '')), '');
    v_grupo := nullif(btrim(coalesce(i.alumno_grupo, '')), '');
    IF i.alumno_id IS NOT NULL THEN
      IF v_nombre IS NULL THEN
        SELECT nullif(btrim(coalesce(p.nombre_completo, p.username, '')), '') INTO v_nombre
          FROM public.perfiles p WHERE p.id = i.alumno_id;
      END IF;
      IF v_grupo IS NULL THEN
        SELECT nullif(btrim(coalesce(g.nombre, '')), '') INTO v_grupo
          FROM public.perfiles p LEFT JOIN public.grupos g ON g.id = p.grupo_id
          WHERE p.id = i.alumno_id;
      END IF;
      SELECT coalesce(p.nombre_completo, p.username) INTO v_asignado
        FROM public.perfiles p WHERE p.id = i.alumno_id;
    ELSE
      v_asignado := NULL;
    END IF;
    RETURN NEXT jsonb_build_object(
      'intento_id', i.id,
      'enlace_id', i.enlace_id,
      'alumno_nombre', coalesce(v_nombre, ''),
      'alumno_grupo', coalesce(v_grupo, ''),
      'alumno_id', i.alumno_id,
      'alumno_asignado', v_asignado,
      'estado', i.estado,
      'corregido', i.corregido,
      'nota', i.nota,
      'puntuacion', i.puntuacion,
      'pendientes_correccion', i.pendientes_correccion,
      'fecha_inicio', i.fecha_inicio,
      'fecha_completado', i.fecha_completado
    );
  END LOOP;
END;
$$;

-- Detalle para corregir: mismo respaldo + cuenta asignada.
CREATE OR REPLACE FUNCTION public.fb_obtener_entrega(p_intento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT;
  v_grupo TEXT;
  v_asignado TEXT;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = p_intento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega no encontrada'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
  IF NOT FOUND OR NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  v_nombre := nullif(btrim(coalesce(i.alumno_nombre, '')), '');
  v_grupo := nullif(btrim(coalesce(i.alumno_grupo, '')), '');
  IF i.alumno_id IS NOT NULL THEN
    IF v_nombre IS NULL THEN
      SELECT nullif(btrim(coalesce(p.nombre_completo, p.username, '')), '') INTO v_nombre
        FROM public.perfiles p WHERE p.id = i.alumno_id;
    END IF;
    IF v_grupo IS NULL THEN
      SELECT nullif(btrim(coalesce(g.nombre, '')), '') INTO v_grupo
        FROM public.perfiles p LEFT JOIN public.grupos g ON g.id = p.grupo_id
        WHERE p.id = i.alumno_id;
    END IF;
    SELECT coalesce(p.nombre_completo, p.username) INTO v_asignado
      FROM public.perfiles p WHERE p.id = i.alumno_id;
  ELSE
    v_asignado := NULL;
  END IF;
  RETURN jsonb_build_object(
    'intento_id', i.id,
    'examen_id', e.id,
    'examen_titulo', e.titulo,
    'alumno_nombre', coalesce(v_nombre, ''),
    'alumno_grupo', coalesce(v_grupo, ''),
    'alumno_id', i.alumno_id,
    'alumno_asignado', v_asignado,
    'estado', i.estado,
    'corregido', i.corregido,
    'nota', i.nota,
    'puntuacion', i.puntuacion,
    'observaciones', coalesce(i.observaciones, ''),
    'correccion', coalesce(i.correccion, '{}'::jsonb),
    'pendientes_correccion', i.pendientes_correccion,
    'respuestas', coalesce(i.respuestas, '{}'::jsonb),
    'preguntas', coalesce(i.preguntas_snapshot, e.preguntas, '[]'::jsonb),
    'fecha_completado', i.fecha_completado,
    'fecha_corregido', i.fecha_corregido
  );
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_intento_examen(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_intento_examen(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.fb_listar_entregas(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_listar_entregas(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.fb_obtener_entrega(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_obtener_entrega(UUID) TO authenticated;

SELECT '073 aplicada: el intento de la app guarda el nombre de la cuenta y Entregas lo muestra' AS mensaje;
