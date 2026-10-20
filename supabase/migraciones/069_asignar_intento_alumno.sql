-- ==============================================================================
-- MIGRACIÓN 069: asignar un intento hecho por enlace a la cuenta de un alumno
-- ==============================================================================
-- MOTIVO
--   Los exámenes rendidos por enlace (individual 056 o comunitario 063) se
--   identifican solo por nombre escrito: el intento queda con alumno_id NULL
--   y el alumno con cuenta NUNCA ve esa nota en «Mis notas», porque
--   listar_mis_intentos_examen filtra por alumno_id = auth.uid().
--   Las evaluaciones ya resolvieron esto en la 067 (evaluacion_vincular);
--   aquí se trae el mismo concepto a los exámenes: el profesor, al corregir,
--   asigna el examen a una cuenta de alumno.
--
-- MODELO
--   · fb_asignar_intento_alumno(p_intento_id, p_alumno): el editor del grupo
--     (o el owner) fija intentos_examen_personalizado.alumno_id a una cuenta
--     de tipo 'usuario' activa. Con p_alumno NULL se desasigna.
--   · No bloquea si la cuenta ya tenía otro intento del mismo examen: el
--     profesor es quien decide. Solo devuelve el aviso ya_tenia_intento.
--   · En cuanto alumno_id está fijado, listar_mis_intentos_examen devuelve
--     ese intento al alumno (con su nota si ya está corregido): no hace
--     falta tocar la vista «Mis notas».
--   · fb_listar_entregas pasa a devolver alumno_id y alumno_asignado, para
--     que la lista de entregas muestre a quién está asignada cada entrega.
--
-- SEGURIDAD
--   · La RPC exige sesión y permiso de editor del grupo del examen (o
--     owner), igual que fb_corregir_entrega. anon no la ejecuta.
--   · Solo admite cuentas con rol 'usuario' y activas: un examen no puede
--     «asignarse» a un profesor ni a una cuenta desactivada.
--
-- IDEMPOTENTE Y NO DESTRUCTIVA: no borra filas ni cambia tipos; reasignar la
-- misma cuenta dos veces es un no-op.
--
-- COMO APLICAR: pegar en el SQL editor de Supabase y ejecutar.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Asignar (o quitar) la cuenta de un intento
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_asignar_intento_alumno(
  p_intento_id UUID,
  p_alumno UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  p public.perfiles%ROWTYPE;
  v_ya_tiene BOOLEAN := FALSE;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado
   WHERE id = p_intento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega no encontrada'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
  IF NOT FOUND OR NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Desasignar: el intento vuelve a ser solo del enlace (visible en la
  -- lista de entregas del profesor, invisible para cualquier cuenta).
  IF p_alumno IS NULL THEN
    UPDATE public.intentos_examen_personalizado SET alumno_id = NULL WHERE id = i.id;
    RETURN jsonb_build_object('intento_id', i.id, 'alumno_id', NULL, 'ya_tenia_intento', FALSE);
  END IF;

  SELECT * INTO p FROM public.perfiles WHERE id = p_alumno;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta indicada no existe'; END IF;
  IF coalesce(p.rol, '') <> 'usuario' THEN
    RAISE EXCEPTION 'Solo se pueden asignar cuentas de alumno (rol usuario)';
  END IF;
  IF coalesce(p.activo, FALSE) = FALSE THEN
    RAISE EXCEPTION 'Esa cuenta de alumno está desactivada';
  END IF;

  -- Aviso NO bloqueante: si esa cuenta ya tiene otro intento de este examen,
  -- Mis notas mostrará ambos. El profesor decide si le importa.
  SELECT EXISTS (
    SELECT 1 FROM public.intentos_examen_personalizado
     WHERE examen_id = e.id AND alumno_id = p.id AND id <> i.id
  ) INTO v_ya_tiene;

  UPDATE public.intentos_examen_personalizado SET alumno_id = p.id WHERE id = i.id;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'alumno_id', p.id,
    'alumno_asignado', coalesce(p.nombre_completo, p.username, ''),
    'ya_tenia_intento', v_ya_tiene
  );
END;
$$;

COMMENT ON FUNCTION public.fb_asignar_intento_alumno(UUID, UUID) IS
'Asigna (o con NULL desasigna) la cuenta de alumno que verá en "Mis notas" este intento hecho por enlace. Editor del grupo o owner; solo cuentas rol usuario activas.';

REVOKE ALL ON FUNCTION public.fb_asignar_intento_alumno(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_asignar_intento_alumno(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. La lista de entregas muestra a qué cuenta está asignada cada intento
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_listar_entregas(p_examen_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
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
    -- Nombre de la cuenta asignada (si la hay) para la lista del panel.
    v_asignado := NULL;
    IF i.alumno_id IS NOT NULL THEN
      SELECT coalesce(p.nombre_completo, p.username) INTO v_asignado
        FROM public.perfiles p WHERE p.id = i.alumno_id;
    END IF;
    RETURN NEXT jsonb_build_object(
      'intento_id', i.id,
      'enlace_id', i.enlace_id,
      'alumno_nombre', i.alumno_nombre,
      'alumno_grupo', i.alumno_grupo,
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

SELECT '069 aplicada: asignar un intento por enlace a la cuenta de un alumno (aparece en Mis notas)' AS mensaje;
