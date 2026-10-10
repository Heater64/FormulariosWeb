-- ============================================================================
-- MIGRACION 056: enlaces individuales de un solo uso para alumnos sin cuenta
-- ============================================================================
-- MOTIVO
--   El modelo anterior exigia que cada alumno tuviera una cuenta (perfiles) y
--   perteneciera a un grupo para poder rendir un examen. El nuevo proposito de
--   la plataforma es que el alumno NO se registre: recibe un enlace individual
--   por WhatsApp, abre el examen, escribe su nombre y su grupo y responde.
--
-- DISENO
--   * Tabla nueva `examen_enlaces`: un registro por alumno invitado. El `token`
--     es el secreto del enlace y es de UN SOLO USO.
--   * El token se marca como usado al ENTREGAR, y `intento_id` liga el enlace a
--     su unico intento. Asi un refresco a mitad del examen retoma el mismo
--     intento en lugar de crear otro, y no se pueden hacer entregas adicionales
--     cambiando el nombre (el vinculo enlace->intento lo impone el servidor).
--   * `intentos_examen_personalizado.alumno_id` pasa a ser NULLABLE: los
--     intentos por enlace no tienen perfil. Se guardan `alumno_nombre` y
--     `alumno_grupo` denormalizados para que el panel los muestre sin joins.
--
-- SEGURIDAD
--   * `anon` NO recibe ningun privilegio sobre tablas (la 047 ya lo cerro).
--     Todo el acceso publico pasa por RPCs SECURITY DEFINER que validan el
--     token y nunca devuelven `respuesta_correcta` ni notas de otros alumnos.
--   * La correccion (puntos y nota final) se calcula SIEMPRE en el servidor.
--
-- IDEMPOTENTE Y NO DESTRUCTIVA: solo CREATE/ALTER ADD/DROP NOT NULL. No borra
-- filas, no renombra columnas, no cambia tipos y no toca datos de negocio.
--
-- COMO APLICAR: pegar en el SQL editor de Supabase y ejecutar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enlaces individuales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.examen_enlaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id     UUID NOT NULL REFERENCES public.examenes_personalizados(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  nombre_alumno TEXT NOT NULL DEFAULT '',
  grupo_alumno  TEXT NOT NULL DEFAULT '',
  usado         BOOLEAN NOT NULL DEFAULT FALSE,
  intento_id    UUID REFERENCES public.intentos_examen_personalizado(id) ON DELETE SET NULL,
  creado_por    UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usado_en      TIMESTAMPTZ
);

COMMENT ON TABLE public.examen_enlaces IS
  'Enlaces individuales de un solo uso para que un alumno sin cuenta rinda un examen. El token es el secreto del enlace.';
COMMENT ON COLUMN public.examen_enlaces.token IS
  'Secreto del enlace (40 hex, UUIDv4 x2). Nunca se expone en listados publicos.';
COMMENT ON COLUMN public.examen_enlaces.intento_id IS
  'Intento unico creado desde este enlace. Impide entregas adicionales cambiando el nombre.';

CREATE INDEX IF NOT EXISTS idx_examen_enlaces_examen
  ON public.examen_enlaces (examen_id, creado_en);

-- ----------------------------------------------------------------------------
-- 2. Intentos sin cuenta de alumno
-- ----------------------------------------------------------------------------
ALTER TABLE public.intentos_examen_personalizado
  ALTER COLUMN alumno_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS enlace_id UUID REFERENCES public.examen_enlaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alumno_nombre TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alumno_grupo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requiere_correccion BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pendientes_correccion INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.intentos_examen_personalizado.alumno_nombre IS
  'Nombre que el alumno escribio al abrir el enlace (intentos sin cuenta).';
COMMENT ON COLUMN public.intentos_examen_personalizado.pendientes_correccion IS
  'Preguntas escritas aun sin corregir. Mientras sea > 0 no hay nota definitiva.';

-- Un intento por enlace, siempre. Evita dobles entregas desde el mismo enlace.
CREATE UNIQUE INDEX IF NOT EXISTS idx_intento_enlace_unico
  ON public.intentos_examen_personalizado (enlace_id)
  WHERE enlace_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. RLS de la tabla nueva
-- ----------------------------------------------------------------------------
ALTER TABLE public.examen_enlaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enlaces_editor_ve" ON public.examen_enlaces;
CREATE POLICY "enlaces_editor_ve" ON public.examen_enlaces
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner())
  ));

DROP POLICY IF EXISTS "enlaces_editor_crea" ON public.examen_enlaces;
CREATE POLICY "enlaces_editor_crea" ON public.examen_enlaces
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner())
  ));

DROP POLICY IF EXISTS "enlaces_editor_borra" ON public.examen_enlaces;
CREATE POLICY "enlaces_editor_borra" ON public.examen_enlaces
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner())
  ));

-- El rol anon no toca la tabla: solo las RPCs SECURITY DEFINER.
REVOKE ALL ON public.examen_enlaces FROM anon;
GRANT SELECT, INSERT, DELETE ON public.examen_enlaces TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Helpers privados
-- ----------------------------------------------------------------------------

-- Tipos de pregunta que el servidor puede corregir solo (test de una sola
-- respuesta y verdadero/falso). Todo lo demas requiere correccion manual.
CREATE OR REPLACE FUNCTION public.fb_tipo_objetivo(p_tipo TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT lower(coalesce(p_tipo, '')) IN ('multiple', 'opcion_unica', 'verdadero_falso');
$$;

-- Token opaco de 40 hex (~160 bits) sin depender de pgcrypto en el search_path.
CREATE OR REPLACE FUNCTION public.fb_nuevo_token()
RETURNS TEXT
LANGUAGE sql VOLATILE
SET search_path = public, pg_temp
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '')
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

-- Ids de preguntas escritas que aun no tienen un override de correccion.
CREATE OR REPLACE FUNCTION public.fb_preguntas_pendientes(
  p_preguntas JSONB,
  p_correccion JSONB
) RETURNS TEXT[]
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  p JSONB;
  v_id TEXT;
  v_override JSONB;
  salida TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(p_preguntas, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    CONTINUE WHEN v_id IS NULL;
    CONTINUE WHEN public.fb_tipo_objetivo(p->>'tipo');
    v_override := coalesce(p_correccion, '{}'::jsonb)->v_id;
    -- Sin override, o con un override que no decide nada, la pregunta sigue
    -- pendiente: el servidor no inventa la nota de una respuesta escrita.
    IF v_override IS NULL
       OR NOT (v_override ? 'es_correcta')
       OR v_override->>'es_correcta' IS NULL THEN
      salida := array_append(salida, v_id);
    END IF;
  END LOOP;
  RETURN salida;
END;
$$;

-- Contexto del enlace + examen, ya sanitizado (sin respuestas correctas).
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
    'nombre_alumno', coalesce(l.nombre_alumno, ''),
    'grupo_alumno', coalesce(l.grupo_alumno, ''),
    'preguntas', public.fb_sanitizar_preguntas(e.preguntas),
    'total_preguntas', jsonb_array_length(coalesce(e.preguntas, '[]'::jsonb)),
    'puntos_totales', coalesce(e.puntos_totales, 0)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPCs del administrador (crear, listar y borrar enlaces)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_crear_enlaces(
  p_examen_id UUID,
  p_alumnos JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  a JSONB;
  v_nombre TEXT;
  v_grupo TEXT;
  v_token TEXT;
  v_intento INTEGER := 0;
  v_creados JSONB := '[]'::jsonb;
  v_row public.examen_enlaces%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF jsonb_typeof(coalesce(p_alumnos, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Lista de alumnos invalida';
  END IF;
  IF jsonb_array_length(p_alumnos) > 300 THEN
    RAISE EXCEPTION 'Maximo 300 enlaces por operacion';
  END IF;

  FOR a IN SELECT value FROM jsonb_array_elements(p_alumnos) LOOP
    v_nombre := btrim(left(coalesce(a->>'nombre', ''), 120));
    v_grupo := btrim(left(coalesce(a->>'grupo', ''), 80));
    IF v_nombre = '' THEN
      RAISE EXCEPTION 'Cada alumno necesita un nombre';
    END IF;

    v_intento := 0;
    LOOP
      v_token := public.fb_nuevo_token();
      BEGIN
        INSERT INTO public.examen_enlaces (examen_id, token, nombre_alumno, grupo_alumno, creado_por)
        VALUES (e.id, v_token, v_nombre, v_grupo, auth.uid())
        RETURNING * INTO v_row;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_intento := v_intento + 1;
        IF v_intento > 5 THEN RAISE EXCEPTION 'No se pudo generar un enlace unico'; END IF;
      END;
    END LOOP;

    v_creados := v_creados || jsonb_build_array(jsonb_build_object(
      'id', v_row.id, 'token', v_row.token,
      'nombre_alumno', v_row.nombre_alumno, 'grupo_alumno', v_row.grupo_alumno,
      'usado', v_row.usado
    ));
  END LOOP;

  RETURN v_creados;
END;
$$;

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
  FOR l IN SELECT * FROM public.examen_enlaces WHERE examen_id = p_examen_id ORDER BY creado_en, nombre_alumno LOOP
    RETURN NEXT jsonb_build_object(
      'id', l.id, 'token', l.token,
      'nombre_alumno', l.nombre_alumno, 'grupo_alumno', l.grupo_alumno,
      'usado', l.usado, 'intento_id', l.intento_id,
      'creado_en', l.creado_en, 'usado_en', l.usado_en
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_eliminar_enlace(p_enlace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.examen_enlaces WHERE id = p_enlace_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;
  IF NOT FOUND OR NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF l.intento_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede borrar un enlace que ya tiene una entrega';
  END IF;
  DELETE FROM public.examen_enlaces WHERE id = l.id;
  RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPCs publicas por token (rol anon)
-- ----------------------------------------------------------------------------

-- Solo estado: lo que la pagina del alumno necesita ANTES de empezar.
CREATE OR REPLACE FUNCTION public.fb_estado_enlace(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ctx JSONB;
BEGIN
  ctx := public.fb_contexto_enlace(p_token);
  RETURN ctx - 'preguntas';
END;
$$;

-- Crea (o retoma) el unico intento de este enlace. Devuelve el examen sin
-- respuestas correctas y sin puntuaciones de nadie.
CREATE OR REPLACE FUNCTION public.fb_iniciar_por_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ctx JSONB;
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
BEGIN
  ctx := public.fb_contexto_enlace(p_token);
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token) FOR UPDATE;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;

  IF coalesce(e.estado, '') <> 'publicado' OR coalesce(e.publicado, FALSE) = FALSE THEN
    RAISE EXCEPTION 'El examen no esta disponible';
  END IF;
  -- Plazo opcional del examen (config.fecha_fin y config.fecha_inicio).
  IF nullif(coalesce(e.config, '{}'::jsonb)->>'fecha_inicio', '') IS NOT NULL
     AND now() < (e.config->>'fecha_inicio')::timestamptz THEN
    RAISE EXCEPTION 'El examen aun no esta disponible';
  END IF;
  IF nullif(coalesce(e.config, '{}'::jsonb)->>'fecha_fin', '') IS NOT NULL
     AND now() > (e.config->>'fecha_fin')::timestamptz THEN
    RAISE EXCEPTION 'El plazo del examen ha finalizado';
  END IF;

  IF l.intento_id IS NOT NULL THEN
    SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = l.intento_id;
    IF FOUND AND i.estado IN ('completado', 'calificado') THEN
      RAISE EXCEPTION 'Ya entregaste este examen';
    END IF;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'intento_id', i.id,
        'reanudado', TRUE,
        'respuestas', coalesce(i.respuestas, '{}'::jsonb),
        'alumno_nombre', i.alumno_nombre,
        'alumno_grupo', i.alumno_grupo
      ) || (ctx - 'usado');
    END IF;
  END IF;

  INSERT INTO public.intentos_examen_personalizado (
    examen_id, alumno_id, enlace_id, alumno_nombre, alumno_grupo,
    respuestas, estado, fecha_inicio, preguntas_snapshot, config_snapshot, version_examen
  ) VALUES (
    e.id, NULL, l.id, l.nombre_alumno, l.grupo_alumno,
    '{}'::jsonb, 'en_progreso', now(), e.preguntas,
    coalesce(e.config, '{}'::jsonb), coalesce(e.version, 1)
  ) RETURNING * INTO i;

  UPDATE public.examen_enlaces SET intento_id = i.id WHERE id = l.id;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'reanudado', FALSE,
    'respuestas', '{}'::jsonb,
    'alumno_nombre', i.alumno_nombre,
    'alumno_grupo', i.alumno_grupo
  ) || (ctx - 'usado');
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_guardar_borrador_token(p_token TEXT, p_respuestas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_respuestas JSONB;
BEGIN
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token);
  IF NOT FOUND OR l.intento_id IS NULL THEN RAISE EXCEPTION 'Enlace no valido'; END IF;
  SELECT * INTO i FROM public.intentos_examen_personalizado
    WHERE id = l.intento_id AND estado = 'en_progreso' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El intento ya fue entregado'; END IF;
  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);
  UPDATE public.intentos_examen_personalizado AS intento_db
    SET respuestas = v_respuestas WHERE intento_db.id = i.id;
  RETURN jsonb_build_object('intento_id', i.id, 'respuestas', v_respuestas);
END;
$$;

-- Califica SOLO lo objetivo en el servidor y deja lo escrito pendiente.
CREATE OR REPLACE FUNCTION public.fb_entregar_por_token(p_token TEXT, p_respuestas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  v_respuestas JSONB;
  p JSONB;
  v_id TEXT;
  resultado JSONB;
  v_pendientes TEXT[];
  minutos INTEGER;
BEGIN
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enlace no valido'; END IF;
  IF l.intento_id IS NULL THEN RAISE EXCEPTION 'Todavia no has comenzado el examen'; END IF;

  SELECT * INTO i FROM public.intentos_examen_personalizado
    WHERE id = l.intento_id AND estado = 'en_progreso' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ya entregaste este examen'; END IF;

  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);

  -- Las preguntas obligatorias se validan en el servidor, no en la interfaz.
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(i.preguntas_snapshot, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    IF coalesce((p->>'obligatoria')::boolean, FALSE) AND NOT (v_respuestas ? v_id) THEN
      RAISE EXCEPTION 'Falta responder una pregunta obligatoria';
    END IF;
  END LOOP;

  -- El temporizador (si el examen lo define) se valida en el servidor: la
  -- interfaz no decide si una entrega llega a tiempo.
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

  UPDATE public.examen_enlaces
    SET usado = TRUE, usado_en = now()
    WHERE id = l.id;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'estado', 'completado',
    'pendientes_correccion', coalesce(array_length(v_pendientes, 1), 0),
    'puntos_test', resultado->>'puntos_obtenidos',
    'total_puntos', resultado->>'total_puntos'
  );
END;
$$;

-- Estado/resultado del enlace. La nota final solo aparece cuando el
-- administrador ya corrigio todas las respuestas escritas.
CREATE OR REPLACE FUNCTION public.fb_consultar_entrega(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.examen_enlaces WHERE token = btrim(p_token);
  IF NOT FOUND THEN RAISE EXCEPTION 'Enlace no valido'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = l.examen_id;
  IF l.intento_id IS NULL THEN
    RETURN jsonb_build_object('estado', 'sin_comenzar', 'titulo', e.titulo);
  END IF;
  SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = l.intento_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('estado', 'sin_comenzar', 'titulo', e.titulo);
  END IF;
  IF i.estado = 'en_progreso' THEN
    RETURN jsonb_build_object('estado', 'en_progreso', 'titulo', e.titulo, 'intento_id', i.id);
  END IF;

  IF i.corregido THEN
    RETURN jsonb_build_object(
      'estado', 'calificado', 'titulo', e.titulo, 'intento_id', i.id,
      'nota', i.nota, 'puntuacion', i.puntuacion,
      'observaciones', coalesce(i.observaciones, ''),
      'fecha_corregido', i.fecha_corregido
    );
  END IF;

  RETURN jsonb_build_object(
    'estado', 'entregado', 'titulo', e.titulo, 'intento_id', i.id,
    'pendiente_correccion', i.pendientes_correccion,
    'fecha_completado', i.fecha_completado
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPCs del administrador: entregas y correccion
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_listar_entregas(p_examen_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  FOR i IN SELECT * FROM public.intentos_examen_personalizado
           WHERE examen_id = p_examen_id
           ORDER BY fecha_completado DESC NULLS LAST, fecha_inicio DESC LOOP
    RETURN NEXT jsonb_build_object(
      'intento_id', i.id,
      'enlace_id', i.enlace_id,
      'alumno_nombre', i.alumno_nombre,
      'alumno_grupo', i.alumno_grupo,
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

-- Detalle completo para corregir: aqui SI viajan las respuestas correctas y las
-- respuestas del alumno, porque el acceso esta limitado al editor del examen.
CREATE OR REPLACE FUNCTION public.fb_obtener_entrega(p_intento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = p_intento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega no encontrada'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
  IF NOT FOUND OR NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN jsonb_build_object(
    'intento_id', i.id,
    'examen_id', e.id,
    'examen_titulo', e.titulo,
    'alumno_nombre', i.alumno_nombre,
    'alumno_grupo', i.alumno_grupo,
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

-- Corrige las respuestas escritas y sella la nota final. Rechaza cerrar la
-- correccion mientras quede alguna pregunta escrita sin decidir.
CREATE OR REPLACE FUNCTION public.fb_corregir_entrega(
  p_intento_id UUID,
  p_correccion JSONB DEFAULT '{}'::jsonb,
  p_observaciones TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  v_pendientes TEXT[];
  resultado JSONB;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = p_intento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega no encontrada'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
  IF NOT FOUND OR NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF i.estado NOT IN ('completado', 'calificado') THEN
    RAISE EXCEPTION 'La entrega aun no se puede corregir';
  END IF;

  v_pendientes := public.fb_preguntas_pendientes(i.preguntas_snapshot, coalesce(p_correccion, '{}'::jsonb));
  IF array_length(v_pendientes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Quedan % respuesta(s) escrita(s) sin corregir', array_length(v_pendientes, 1);
  END IF;

  resultado := public.fb_calcular_puntuacion(i.preguntas_snapshot, i.respuestas, coalesce(p_correccion, '{}'::jsonb));

  UPDATE public.intentos_examen_personalizado SET
    puntuacion = (resultado->>'porcentaje')::numeric,
    nota = (resultado->>'nota')::numeric,
    corregido = TRUE,
    corregido_por = auth.uid(),
    observaciones = left(coalesce(p_observaciones, ''), 4000),
    correccion = coalesce(p_correccion, '{}'::jsonb),
    estado = 'calificado',
    pendientes_correccion = 0,
    fecha_corregido = now()
  WHERE id = i.id;

  RETURN jsonb_build_object(
    'intento_id', i.id,
    'nota', (resultado->>'nota')::numeric,
    'puntuacion', (resultado->>'porcentaje')::numeric,
    'aciertos', (resultado->>'aciertos')::integer,
    'total', (resultado->>'total')::integer,
    'detalle', resultado->'correccion'
  );
END;
$$;

-- Abrir / cerrar el examen (cerrado = no admite nuevas entregas).
CREATE OR REPLACE FUNCTION public.fb_cambiar_estado_examen(p_examen_id UUID, p_estado TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
BEGIN
  IF p_estado NOT IN ('borrador', 'publicado', 'cerrado') THEN
    RAISE EXCEPTION 'Estado invalido';
  END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Examen no encontrado'; END IF;
  IF NOT (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.examenes_personalizados SET
    estado = p_estado,
    publicado = (p_estado = 'publicado'),
    publicado_en = CASE WHEN p_estado = 'publicado' THEN coalesce(publicado_en, now()) ELSE publicado_en END,
    actualizado_en = now()
  WHERE id = e.id;
  RETURN jsonb_build_object('id', e.id, 'estado', p_estado, 'publicado', (p_estado = 'publicado'));
END;
$$;

-- Resumen del panel privado: una sola llamada para el inicio y la lista de
-- examenes (evita N+1 desde el navegador).
CREATE OR REPLACE FUNCTION public.fb_resumen_admin()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_examenes JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'creado_en' DESC), '[]'::jsonb) INTO v_examenes
  FROM (
    SELECT jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'descripcion', coalesce(e.descripcion, ''),
      'estado', CASE WHEN e.estado NOT IN ('borrador','publicado','cerrado') THEN 'borrador' ELSE e.estado END,
      'publicado', coalesce(e.publicado, FALSE),
      'creado_en', e.creado_en,
      'actualizado_en', e.actualizado_en,
      'num_preguntas', jsonb_array_length(coalesce(e.preguntas, '[]'::jsonb)),
      'puntos_totales', coalesce(e.puntos_totales, 0),
      'num_enlaces', (SELECT count(*) FROM public.examen_enlaces l WHERE l.examen_id = e.id),
      'enlaces_usados', (SELECT count(*) FROM public.examen_enlaces l WHERE l.examen_id = e.id AND l.usado),
      'num_entregas', (SELECT count(*) FROM public.intentos_examen_personalizado i
                       WHERE i.examen_id = e.id AND i.estado IN ('completado', 'calificado')),
      'por_corregir', (SELECT count(*) FROM public.intentos_examen_personalizado i
                       WHERE i.examen_id = e.id AND i.estado = 'completado'),
      'nota_media', (SELECT round(avg(i.nota), 2) FROM public.intentos_examen_personalizado i
                     WHERE i.examen_id = e.id AND i.corregido AND i.nota IS NOT NULL)
    ) AS x
    FROM public.examenes_personalizados e
    WHERE public.es_owner() OR public.es_editor_del_grupo(e.grupo_id)
  ) sub;
  RETURN jsonb_build_object('examenes', v_examenes);
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Permisos: los helpers privados no se exponen
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.fb_tipo_objetivo(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_nuevo_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_preguntas_pendientes(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_contexto_enlace(TEXT) FROM PUBLIC, anon, authenticated;

-- Publicas (solo por token): alcanzables sin sesion.
REVOKE ALL ON FUNCTION public.fb_estado_enlace(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_iniciar_por_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_guardar_borrador_token(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_entregar_por_token(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fb_consultar_entrega(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fb_estado_enlace(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_iniciar_por_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_guardar_borrador_token(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_entregar_por_token(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fb_consultar_entrega(TEXT) TO anon, authenticated;

-- Del administrador: requieren sesion.
REVOKE ALL ON FUNCTION public.fb_crear_enlaces(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_listar_enlaces(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_eliminar_enlace(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_listar_entregas(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_obtener_entrega(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_corregir_entrega(UUID, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_cambiar_estado_examen(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fb_resumen_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_resumen_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_crear_enlaces(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_listar_enlaces(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_eliminar_enlace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_listar_entregas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_obtener_entrega(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_corregir_entrega(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fb_cambiar_estado_examen(UUID, TEXT) TO authenticated;

SELECT '056 aplicada: enlaces individuales de un solo uso, correccion objetiva en servidor y nota final solo tras corregir lo escrito' AS mensaje;
