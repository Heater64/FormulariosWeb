-- ============================================================================
-- MIGRACIÓN 063: enlace comunitario (un solo enlace para toda la clase)
-- ============================================================================
-- MOTIVO
--   El profesor quiere UN solo enlace para toda la clase: cada alumno lo
--   abre, se identifica con su nombre, responde su examen y puede volver
--   después a REVISAR su propio examen. Sin cuentas y sin un token por
--   alumno. La página pública ya tenía el aviso «Este enlace es público»
--   (ctx.comunitario) pero nada lo activaba: faltaba el modelo y las RPCs.
--
-- MODELO
--   · examen_enlaces.es_comunitario = TRUE marca el enlace de la clase:
--     NO es de un solo uso, no pertenece a ningún alumno y su
--     nombre_alumno/grupo_alumno quedan vacíos. Solo puede existir uno por
--     examen (fb_crear_enlace_comunitario lo reutiliza si ya existe).
--   · Cada alumno genera SU intento identificándose por nombre. El nombre es
--     la identidad dentro del enlace, igual que en la rejilla de
--     evaluaciones, que ya empareja por lower(btrim(alumno)).
--   · Un nombre = un intento (índice único parcial). Reabrir el enlace con
--     el mismo nombre retoma el borrador o muestra la entrega: el alumno
--     siempre ve SU examen, nunca el de nadie más.
--
-- PRIVACIDAD Y COMPROMISO
--   · Cada RPC comunitaria devuelve SOLO el intento de ese nombre; no
--     existe ninguna función que liste nombres ni entregas de otros.
--   · Quien conozca el enlace y el nombre de un compañero podría abrir su
--     intento: es el compromiso que pide el profesor (el enlace es un
--     secreto compartido con la clase) y queda documentado aquí. Para
--     exámenes sensibles siguen existiendo los enlaces individuales 056.
--   · La corrección y la nota final se calculan SOLO en el servidor, con
--     los mismos helpers que el flujo individual (fb_filtrar_respuestas,
--     fb_calcular_puntuacion, fb_preguntas_pendientes).
--
-- SEGURIDAD
--   · anon solo ejecuta las RPCs públicas comunitarias, que validan token,
--     examen publicado y plazo antes de tocar nada.
--   · Las funciones auxiliares privadas no se conceden a ningún rol.
--
-- IDEMPOTENTE Y NO DESTRUCTIVA: no borra filas ni datos de negocio. El
-- índice único de «un intento por enlace» se rehace más estrecho para que
-- los enlaces individuales conserven su invariante y el comunitario admita
-- un intento por alumno.
--
-- COMO APLICAR: pegar en el SQL editor de Supabase y ejecutar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas de marca
-- ----------------------------------------------------------------------------
ALTER TABLE public.examen_enlaces
  ADD COLUMN IF NOT EXISTS es_comunitario BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.examen_enlaces.es_comunitario IS
  'TRUE = enlace unico para toda la clase: no es de un solo uso y cada alumno responde identificandose por nombre.';

ALTER TABLE public.intentos_examen_personalizado
  ADD COLUMN IF NOT EXISTS enlace_comunitario BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.intentos_examen_personalizado.enlace_comunitario IS
  'TRUE = intento creado desde un enlace comunitario (identidad = alumno_nombre).';

-- ----------------------------------------------------------------------------
-- 2. Un intento por enlace individual; un intento por alumno en el comunitario
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_intento_enlace_unico;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intento_enlace_unico
  ON public.intentos_examen_personalizado (enlace_id)
  WHERE enlace_id IS NOT NULL AND NOT enlace_comunitario;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intento_comunitario_unico
  ON public.intentos_examen_personalizado (enlace_id, lower(btrim(alumno_nombre)))
  WHERE enlace_id IS NOT NULL AND enlace_comunitario;

-- ----------------------------------------------------------------------------
-- 3. El contexto del enlace ya dice si es comunitario
--    (la página del alumno decide el flujo con esa bandera)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_contexto_enlace(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(btrim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Enlace no valido';
  END IF;
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token);
  IF NOT FOUND THEN RAISE EXCEPTION 'Enlace no valido'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enlace no valido'; END IF;

  RETURN jsonb_build_object(
    'enlace_id', l.id,
    'examen_id', e.id,
    'titulo', e.titulo,
    'descripcion', coalesce(e.descripcion, ''),
    'materia', coalesce(e.materia, ''),
    'profesor', coalesce(e.profesor, ''),
    'estado', e.estado,
    'publicado', e.publicado,
    'cerrado', coalesce(e.estado, '') <> 'publicado' OR coalesce(e.publicado, FALSE) = FALSE,
    'usado', l.usado,
    'comunitario', l.es_comunitario,
    'nombre_alumno', coalesce(l.nombre_alumno, ''),
    'grupo_alumno', coalesce(l.grupo_alumno, ''),
    'preguntas', public.fb_sanitizar_preguntas(e.preguntas),
    'total_preguntas', jsonb_array_length(coalesce(e.preguntas, '[]'::jsonb)),
    'puntos_totales', coalesce(e.puntos_totales, 0)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. El listado del panel distingue el enlace de la clase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_listar_enlaces(p_examen_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  l public.examen_enlaces%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- El enlace de la clase primero: es el que el profesor comparte.
  FOR l IN SELECT * FROM public.examen_enlaces
           WHERE examen_id = p_examen_id
           ORDER BY es_comunitario DESC, creado_en, nombre_alumno LOOP
    RETURN NEXT jsonb_build_object(
      'id', l.id, 'token', l.token,
      'nombre_alumno', l.nombre_alumno, 'grupo_alumno', l.grupo_alumno,
      'usado', l.usado, 'intento_id', l.intento_id,
      'comunitario', l.es_comunitario,
      'creado_en', l.creado_en, 'usado_en', l.usado_en
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Auxiliares privados (sin concesiones: solo las RPC de esta migración)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_comunitario_enlace(p_token TEXT)
RETURNS public.examen_enlaces
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(btrim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Enlace no valido';
  END IF;
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token);
  IF NOT FOUND OR NOT l.es_comunitario THEN RAISE EXCEPTION 'Enlace no valido'; END IF;
  RETURN l;
END;
$$;

-- El nombre tal como se usa como identidad: recortado y sin diferenciar
-- mayúsculas ni espacios sobrantes (mismo criterio que la rejilla).
CREATE OR REPLACE FUNCTION public.fb_nombre_comun(p_nombre TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN nullif(btrim(left(coalesce(p_nombre, ''), 120)), '');
END;
$$;

REVOKE ALL ON FUNCTION public.fb_comunitario_enlace(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_nombre_comun(TEXT) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Crear (o reutilizar) el enlace de la clase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_crear_enlace_comunitario(p_examen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  v_row public.examen_enlaces%ROWTYPE;
  v_intento INTEGER := 0;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_row FROM public.examen_enlaces
   WHERE examen_id = p_examen_id AND es_comunitario
   ORDER BY creado_en LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('id', v_row.id, 'token', v_row.token, 'comunitario', TRUE);
  END IF;

  v_intento := 0;
  LOOP
    BEGIN
      INSERT INTO public.examen_enlaces (examen_id, token, es_comunitario, creado_por)
      VALUES (p_examen_id, public.fb_nuevo_token(), TRUE, auth.uid())
      RETURNING * INTO v_row;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_intento := v_intento + 1;
      IF v_intento > 5 THEN RAISE EXCEPTION 'No se pudo generar un enlace unico'; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('id', v_row.id, 'token', v_row.token, 'comunitario', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.fb_crear_enlace_comunitario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_crear_enlace_comunitario(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPCs públicas del enlace comunitario (rol anon)
-- ----------------------------------------------------------------------------

-- Abre (o retoma) el examen del ALUMNO identificado por su nombre. Crea su
-- intento si no existe; si ya entregó, devuelve `entregado` para que la
-- página muestre su revisión en vez de un examen nuevo.
CREATE OR REPLACE FUNCTION public.fb_comunitario_iniciar(
  p_token TEXT,
  p_nombre TEXT,
  p_grupo TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT := public.fb_nombre_comun(p_nombre);
  v_grupo TEXT;
  ctx JSONB;
  v_reanudado BOOLEAN := FALSE;
BEGIN
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'Escribe tu nombre para continuar'; END IF;
  v_grupo := btrim(left(coalesce(p_grupo, ''), 80));

  l := public.fb_comunitario_enlace(p_token);
  ctx := public.fb_contexto_enlace(p_token);
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;

  -- Mismas condiciones que el flujo individual: examen publicado y en plazo.
  IF coalesce(e.estado, '') <> 'publicado' OR coalesce(e.publicado, FALSE) = FALSE THEN
    RAISE EXCEPTION 'El examen no esta disponible';
  END IF;
  IF nullif(coalesce(e.config, '{}'::jsonb)->>'fecha_inicio', '') IS NOT NULL
     AND now() < (e.config->>'fecha_inicio')::timestamptz THEN
    RAISE EXCEPTION 'El examen aun no esta disponible';
  END IF;
  IF nullif(coalesce(e.config, '{}'::jsonb)->>'fecha_fin', '') IS NOT NULL
     AND now() > (e.config->>'fecha_fin')::timestamptz THEN
    RAISE EXCEPTION 'El plazo del examen ha finalizado';
  END IF;

  SELECT * INTO i FROM public.intentos_examen_personalizado
   WHERE enlace_id = l.id AND enlace_comunitario
     AND lower(btrim(alumno_nombre)) = lower(v_nombre)
   FOR UPDATE;
  IF FOUND THEN v_reanudado := TRUE; END IF;

  IF NOT v_reanudado THEN
    BEGIN
      INSERT INTO public.intentos_examen_personalizado (
        examen_id, alumno_id, enlace_id, enlace_comunitario,
        alumno_nombre, alumno_grupo,
        respuestas, estado, fecha_inicio, preguntas_snapshot, config_snapshot, version_examen
      ) VALUES (
        e.id, NULL, l.id, TRUE, v_nombre, v_grupo,
        '{}'::jsonb, 'en_progreso', now(), e.preguntas,
        coalesce(e.config, '{}'::jsonb), coalesce(e.version, 1)
      ) RETURNING * INTO i;
    EXCEPTION WHEN unique_violation THEN
      -- Dos dispositivos a la vez con el mismo nombre: se retoma el mismo intento.
      SELECT * INTO i FROM public.intentos_examen_personalizado
       WHERE enlace_id = l.id AND enlace_comunitario
         AND lower(btrim(alumno_nombre)) = lower(v_nombre);
      v_reanudado := TRUE;
    END;
  END IF;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'reanudado', v_reanudado,
    'entregado', i.estado IN ('completado', 'calificado'),
    'respuestas', coalesce(i.respuestas, '{}'::jsonb),
    'alumno_nombre', i.alumno_nombre,
    'alumno_grupo', i.alumno_grupo
  ) || ctx;
END;
$$;

-- Borrador del alumno identificado por nombre (autoguardado de la página).
CREATE OR REPLACE FUNCTION public.fb_comunitario_borrador(
  p_token TEXT,
  p_nombre TEXT,
  p_respuestas JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT := public.fb_nombre_comun(p_nombre);
  v_respuestas JSONB;
BEGIN
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'Escribe tu nombre para continuar'; END IF;
  l := public.fb_comunitario_enlace(p_token);
  SELECT * INTO i FROM public.intentos_examen_personalizado
   WHERE enlace_id = l.id AND enlace_comunitario
     AND lower(btrim(alumno_nombre)) = lower(v_nombre)
     AND estado = 'en_progreso'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay ningun examen en curso con ese nombre'; END IF;

  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);
  UPDATE public.intentos_examen_personalizado AS intento_db
     SET respuestas = v_respuestas
   WHERE intento_db.id = i.id;
  RETURN jsonb_build_object('intento_id', i.id, 'respuestas', v_respuestas);
END;
$$;

-- Entrega del alumno identificado por nombre. Califica en el servidor lo
-- objetivo y deja lo escrito pendiente de corrección, igual que el flujo
-- individual (fb_entregar_por_token).
CREATE OR REPLACE FUNCTION public.fb_comunitario_entregar(
  p_token TEXT,
  p_nombre TEXT,
  p_respuestas JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT := public.fb_nombre_comun(p_nombre);
  v_respuestas JSONB;
  p JSONB;
  v_id TEXT;
  resultado JSONB;
  v_pendientes TEXT[];
  minutos INTEGER;
BEGIN
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'Escribe tu nombre para continuar'; END IF;
  l := public.fb_comunitario_enlace(p_token);
  SELECT * INTO i FROM public.intentos_examen_personalizado
   WHERE enlace_id = l.id AND enlace_comunitario
     AND lower(btrim(alumno_nombre)) = lower(v_nombre)
     AND estado = 'en_progreso'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ya entregaste este examen'; END IF;

  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);

  -- Las preguntas obligatorias se validan en el servidor, no en la interfaz.
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(i.preguntas_snapshot, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    IF coalesce((p->>'obligatoria')::boolean, FALSE) AND NOT (v_respuestas ? v_id) THEN
      RAISE EXCEPTION 'Falta responder una pregunta obligatoria';
    END IF;
  END LOOP;

  -- El temporizador (si el examen lo define) también se valida aquí.
  minutos := CASE
    WHEN i.config_snapshot->>'temporizador_global' = 'personalizado'
      THEN greatest(0, coalesce((i.config_snapshot->>'temporizador_personalizado')::integer, 0))
    WHEN coalesce(i.config_snapshot->>'temporizador_global', 'sin_limite') = 'sin_limite' THEN 0
    ELSE greatest(0, coalesce((i.config_snapshot->>'temporizador_global')::integer, 0))
  END;
  IF minutos > 0 AND i.fecha_inicio IS NOT NULL
     AND now() > i.fecha_inicio + make_interval(mins => minutos) THEN
    RAISE EXCEPTION 'El tiempo del examen ha terminado';
  END IF;

  v_pendientes := public.fb_preguntas_pendientes(i.preguntas_snapshot, '{}'::jsonb);
  resultado := public.fb_calcular_puntuacion(i.preguntas_snapshot, v_respuestas, '{}'::jsonb);

  UPDATE public.intentos_examen_personalizado AS intento_db SET
    respuestas = v_respuestas,
    puntuacion = (resultado->>'porcentaje')::numeric,
    nota = NULL,
    corregido = FALSE,
    correccion = '{}'::jsonb,
    estado = 'completado',
    requiere_correccion = (array_length(v_pendientes, 1) IS NOT NULL),
    pendientes_correccion = coalesce(array_length(v_pendientes, 1), 0),
    fecha_completado = now(),
    entregado_en = now()
  WHERE intento_db.id = i.id;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'estado', 'completado',
    'pendientes_correccion', coalesce(array_length(v_pendientes, 1), 0),
    'puntos_test', resultado->>'puntos_obtenidos',
    'total_puntos', resultado->>'total_puntos'
  );
END;
$$;

-- Estado/resultado DEL ALUMNO NOMBRADO: su nota, su corrección y su fecha.
-- Nunca devuelve datos de otros alumnos ni permite listarlos.
CREATE OR REPLACE FUNCTION public.fb_comunitario_consultar(
  p_token TEXT,
  p_nombre TEXT
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_nombre TEXT := public.fb_nombre_comun(p_nombre);
  p JSONB;
  v_id TEXT;
  v_calculo JSONB;
  v_fila JSONB;
  v_preguntas JSONB := '[]'::jsonb;
  v_detalle JSONB := '{}'::jsonb;
BEGIN
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'Escribe tu nombre para continuar'; END IF;
  l := public.fb_comunitario_enlace(p_token);
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;

  SELECT * INTO i FROM public.intentos_examen_personalizado
   WHERE enlace_id = l.id AND enlace_comunitario
     AND lower(btrim(alumno_nombre)) = lower(v_nombre);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('estado', 'sin_comenzar', 'titulo', e.titulo, 'comunitario', TRUE);
  END IF;

  IF i.estado = 'en_progreso' THEN
    RETURN jsonb_build_object(
      'estado', 'en_progreso', 'titulo', e.titulo, 'intento_id', i.id,
      'comunitario', TRUE, 'alumno_nombre', i.alumno_nombre,
      'alumno_grupo', i.alumno_grupo,
      'respuestas', coalesce(i.respuestas, '{}'::jsonb)
    );
  END IF;

  IF i.corregido THEN
    -- Mismo contrato que fb_consultar_entrega (059): el snapshot sanitizado y
    -- el desglose por pregunta viajan SOLO cuando la corrección está cerrada.
    v_preguntas := public.fb_sanitizar_preguntas(i.preguntas_snapshot);
    v_calculo := coalesce(
      public.fb_calcular_puntuacion(
        i.preguntas_snapshot,
        i.respuestas,
        coalesce(i.correccion, '{}'::jsonb)
      ) -> 'correccion',
      '{}'::jsonb
    );

    FOR p IN SELECT value FROM jsonb_array_elements(coalesce(i.preguntas_snapshot, '[]'::jsonb)) LOOP
      v_id := p ->> 'id';
      CONTINUE WHEN v_id IS NULL;
      v_fila := jsonb_build_object(
        'es_correcta', v_calculo -> v_id -> 'es_correcta',
        'puntos', coalesce((v_calculo -> v_id ->> 'puntos')::numeric, 0),
        'respuesta_alumno', i.respuestas -> v_id,
        'comentario', left(coalesce(i.correccion -> v_id ->> 'comentario', ''), 1000),
        'respuesta_correcta', public.fb_respuesta_correcta_visible(
          p ->> 'respuesta_correcta', p ->> 'tipo', p -> 'huecos'
        )
      );
      v_detalle := v_detalle || jsonb_build_object(v_id, v_fila);
    END LOOP;

    RETURN jsonb_build_object(
      'estado', 'calificado', 'titulo', e.titulo, 'intento_id', i.id,
      'nota', i.nota, 'puntuacion', i.puntuacion,
      'observaciones', coalesce(i.observaciones, ''),
      'fecha_corregido', i.fecha_corregido,
      'comunitario', TRUE, 'alumno_nombre', i.alumno_nombre,
      'preguntas', v_preguntas,
      'detalle', jsonb_build_object('por_pregunta', v_detalle)
    );
  END IF;

  RETURN jsonb_build_object(
    'estado', 'entregado', 'titulo', e.titulo, 'intento_id', i.id,
    'pendiente_correccion', i.pendientes_correccion,
    'fecha_completado', i.fecha_completado,
    'comunitario', TRUE, 'alumno_nombre', i.alumno_nombre
  );
END;
$$;

-- Las públicas se ejecutan como anon; las auxiliares quedan privadas.
REVOKE ALL ON FUNCTION public.fb_comunitario_iniciar(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_comunitario_borrador(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_comunitario_entregar(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_comunitario_consultar(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fb_comunitario_iniciar(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_comunitario_borrador(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_comunitario_entregar(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_comunitario_consultar(TEXT, TEXT) TO anon, authenticated;

SELECT '063 aplicada: enlace comunitario (un enlace para toda la clase, identidad por nombre)' AS mensaje;
