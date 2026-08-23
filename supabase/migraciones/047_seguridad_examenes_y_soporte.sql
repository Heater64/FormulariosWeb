-- ============================================================================
-- MIGRACION 047: seguridad de produccion, entrega de examenes y soporte
-- ============================================================================
-- Esta migracion elimina el acceso legacy de anon, mueve la integridad de los
-- intentos al servidor y deja el contacto operativo para el owner.
-- Es idempotente y no elimina datos de negocio.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Retirar politicas legacy abiertas a anon
-- ----------------------------------------------------------------------------
-- Las paginas publicas usan Auth y RPCs SECURITY DEFINER; no necesitan acceso
-- directo de anon a tablas publicas. Se eliminan solo politicas que incluyan
-- anon y se revocan sus privilegios de tabla/secuencia.
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles @> ARRAY['anon']::name[]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'forms', 'responses', 'evaluations', 'evaluation_grades',
    'study_history', 'notas_personales', 'notas_capitulo'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Snapshot y versionado de examenes
-- ----------------------------------------------------------------------------
ALTER TABLE public.examenes_personalizados
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS publicado_en TIMESTAMPTZ;

ALTER TABLE public.intentos_examen_personalizado
  ADD COLUMN IF NOT EXISTS preguntas_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS config_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS version_examen INTEGER,
  ADD COLUMN IF NOT EXISTS entregado_en TIMESTAMPTZ;

UPDATE public.examenes_personalizados
SET version = 1
WHERE version IS NULL;

-- Compatibilidad para intentos previos a esta migración: se toma una copia del
-- examen actual. Los nuevos intentos siempre reciben snapshot en iniciar_intento.
UPDATE public.intentos_examen_personalizado i
SET preguntas_snapshot = e.preguntas,
    config_snapshot = coalesce(e.config, '{}'::jsonb),
    version_examen = coalesce(e.version, 1)
FROM public.examenes_personalizados e
WHERE i.examen_id = e.id
  AND i.preguntas_snapshot IS NULL;

-- Un intento activo por alumno y examen. Si una base antigua tiene duplicados,
-- se conserva el mas antiguo y no se borra ninguna fila.
CREATE INDEX IF NOT EXISTS idx_intento_activo_alumno_examen
  ON public.intentos_examen_personalizado (examen_id, alumno_id)
  WHERE estado IN ('pendiente', 'en_progreso');

-- ----------------------------------------------------------------------------
-- 3. Helpers privados de validacion y calculo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_respuesta_correcta(
  p_respuesta JSONB,
  p_pregunta JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tipo TEXT := coalesce(p_pregunta->>'tipo', '');
  v_correcta TEXT := p_pregunta->>'respuesta_correcta';
  v_respuesta TEXT;
  v_huecos JSONB;
  v_variantes JSONB;
  i INTEGER;
  h JSONB;
  ok BOOLEAN;
BEGIN
  IF p_respuesta IS NULL OR p_respuesta = 'null'::jsonb THEN
    RETURN FALSE;
  END IF;

  IF v_tipo IN ('multiple', 'opcion_unica', 'verdadero_falso') THEN
    RETURN (p_respuesta #>> '{}') = v_correcta;
  ELSIF v_tipo IN ('varias_opciones', 'ordenar') THEN
    RETURN p_respuesta = coalesce(v_correcta, '[]')::jsonb;
  ELSIF v_tipo = 'relacionar' THEN
    RETURN p_respuesta = coalesce(v_correcta, '{}')::jsonb;
  ELSIF v_tipo IN ('respuesta_corta', 'texto_corto', 'texto_largo') THEN
    RETURN lower(regexp_replace(btrim(p_respuesta #>> '{}'), '\s+', ' ', 'g')) =
           lower(regexp_replace(btrim(v_correcta), '\s+', ' ', 'g'));
  ELSIF v_tipo = 'completar' AND jsonb_typeof(p_pregunta->'huecos') = 'array' THEN
    IF jsonb_typeof(p_respuesta) <> 'array' THEN RETURN FALSE; END IF;
    v_huecos := p_pregunta->'huecos';
    FOR i IN 0..jsonb_array_length(v_huecos) - 1 LOOP
      h := v_huecos->i;
      v_respuesta := lower(regexp_replace(btrim(coalesce(p_respuesta->i #>> '{}', '')), '\s+', ' ', 'g'));
      ok := v_respuesta = lower(regexp_replace(btrim(coalesce(h->>'respuesta_correcta', '')), '\s+', ' ', 'g'));
      IF NOT ok AND jsonb_typeof(h->'variantes') = 'array' THEN
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(h->'variantes') AS variante
          WHERE lower(regexp_replace(btrim(variante), '\s+', ' ', 'g')) = v_respuesta
        ) INTO ok;
      END IF;
      IF NOT ok THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
  ELSIF v_tipo = 'completar' THEN
    RETURN EXISTS (
      SELECT 1 FROM unnest(string_to_array(coalesce(v_correcta, ''), '|')) variante
      WHERE lower(regexp_replace(btrim(variante), '\\s+', ' ', 'g')) =
            lower(regexp_replace(btrim(p_respuesta #>> '{}'), '\\s+', ' ', 'g'))
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_filtrar_respuestas(
  p_preguntas JSONB,
  p_respuestas JSONB
) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p JSONB;
  v_id TEXT;
  salida JSONB := '{}'::jsonb;
BEGIN
  IF jsonb_typeof(coalesce(p_respuestas, '{}'::jsonb)) <> 'object' THEN
    RETURN salida;
  END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(p_preguntas, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    IF v_id IS NOT NULL AND p_respuestas ? v_id THEN
      salida := jsonb_set(salida, ARRAY[v_id], p_respuestas->v_id, TRUE);
    END IF;
  END LOOP;
  RETURN salida;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_sanitizar_preguntas(
  p_preguntas JSONB
) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p JSONB;
  h JSONB;
  huecos JSONB;
  salida JSONB := '[]'::jsonb;
  limpia JSONB;
BEGIN
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(p_preguntas, '[]'::jsonb)) LOOP
    limpia := p - 'respuesta_correcta';
    IF jsonb_typeof(p->'huecos') = 'array' THEN
      huecos := '[]'::jsonb;
      FOR h IN SELECT value FROM jsonb_array_elements(p->'huecos') LOOP
        huecos := huecos || jsonb_build_array(h - 'respuesta_correcta' - 'variantes');
      END LOOP;
      limpia := jsonb_set(limpia, '{huecos}', huecos, TRUE);
    END IF;
    salida := salida || jsonb_build_array(limpia);
  END LOOP;
  RETURN salida;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_calcular_puntuacion(
  p_preguntas JSONB,
  p_respuestas JSONB,
  p_correccion JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p JSONB;
  v_id TEXT;
  v_pts NUMERIC;
  v_obtenidos NUMERIC := 0;
  v_total NUMERIC := 0;
  v_aciertos INTEGER := 0;
  v_ok BOOLEAN;
  v_override JSONB;
  v_puntos NUMERIC;
  v_detalle JSONB := '{}'::jsonb;
  v_huecos JSONB;
  h JSONB;
  i INTEGER;
  v_resp JSONB;
  v_correctos INTEGER;
  v_total_huecos INTEGER;
  v_respuesta TEXT;
  v_hueco_ok BOOLEAN;
BEGIN
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(p_preguntas, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    v_pts := greatest(0, coalesce((p->>'puntos')::numeric, 1));
    v_total := v_total + v_pts;
    v_resp := coalesce(p_respuestas->v_id, 'null'::jsonb);
    v_ok := public.fb_respuesta_correcta(v_resp, p);
    v_puntos := CASE WHEN v_ok THEN v_pts ELSE 0 END;

    IF p->>'tipo' = 'completar' AND jsonb_typeof(p->'huecos') = 'array'
       AND jsonb_typeof(v_resp) = 'array' THEN
      v_huecos := p->'huecos';
      v_total_huecos := jsonb_array_length(v_huecos);
      v_correctos := 0;
      IF v_total_huecos > 0 THEN
        FOR i IN 0..v_total_huecos - 1 LOOP
          h := v_huecos->i;
          v_respuesta := lower(regexp_replace(btrim(coalesce(v_resp->i #>> '{}', '')), '\s+', ' ', 'g'));
          v_hueco_ok := v_respuesta = lower(regexp_replace(btrim(coalesce(h->>'respuesta_correcta', '')), '\s+', ' ', 'g'));
          IF NOT v_hueco_ok AND jsonb_typeof(h->'variantes') = 'array' THEN
            SELECT EXISTS (SELECT 1 FROM jsonb_array_elements_text(h->'variantes') x
              WHERE lower(regexp_replace(btrim(x), '\s+', ' ', 'g')) = v_respuesta) INTO v_hueco_ok;
          END IF;
          IF v_hueco_ok THEN v_correctos := v_correctos + 1; END IF;
        END LOOP;
        v_puntos := round((v_correctos::numeric / v_total_huecos::numeric) * v_pts, 2);
        v_ok := v_correctos = v_total_huecos;
      END IF;
    END IF;

    v_override := coalesce(p_correccion->v_id, '{}'::jsonb);
    IF v_override ? 'es_correcta' AND v_override->>'es_correcta' IS NOT NULL THEN
      v_ok := (v_override->>'es_correcta')::boolean;
      v_puntos := least(v_pts, greatest(0, coalesce((v_override->>'puntos')::numeric, CASE WHEN v_ok THEN v_pts ELSE 0 END)));
    END IF;
    IF v_ok THEN v_aciertos := v_aciertos + 1; END IF;
    v_obtenidos := v_obtenidos + v_puntos;
    v_detalle := v_detalle || jsonb_build_object(v_id, jsonb_build_object('es_correcta', v_ok, 'puntos', v_puntos));
  END LOOP;

  RETURN jsonb_build_object(
    'aciertos', v_aciertos,
    'total', jsonb_array_length(coalesce(p_preguntas, '[]'::jsonb)),
    'puntos_obtenidos', round(v_obtenidos, 2),
    'total_puntos', round(v_total, 2),
    'porcentaje', CASE WHEN v_total > 0 THEN round((v_obtenidos / v_total) * 100, 2) ELSE 0 END,
    'nota', CASE WHEN v_total > 0 THEN round((v_obtenidos / v_total) * 10, 2) ELSE 0 END,
    'correccion', v_detalle
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPCs de examen: inicio, borrador, entrega y correccion
-- ----------------------------------------------------------------------------
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
    RETURN to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
  END IF;
  SELECT count(*) INTO completados FROM public.intentos_examen_personalizado
  WHERE examen_id = p_examen_id AND alumno_id = auth.uid() AND estado IN ('completado', 'calificado');
  IF limite IS NOT NULL AND completados >= limite THEN RAISE EXCEPTION 'Has alcanzado el limite de intentos'; END IF;

  INSERT INTO public.intentos_examen_personalizado (
    examen_id, alumno_id, respuestas, estado, fecha_inicio, preguntas_snapshot,
    config_snapshot, version_examen
  ) VALUES (
    e.id, auth.uid(), '{}'::jsonb, 'en_progreso', now(), e.preguntas,
    c, e.version
  ) RETURNING * INTO i;
  RETURN to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_borrador_examen(p_intento_id UUID, p_respuestas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  v_respuestas JSONB;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado
  WHERE id = p_intento_id AND alumno_id = auth.uid() AND estado = 'en_progreso' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intento no disponible'; END IF;
  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);
  UPDATE public.intentos_examen_personalizado AS intento_db
    SET respuestas = v_respuestas
    WHERE intento_db.id = i.id;
  i.respuestas := v_respuestas;
  RETURN to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
END;
$$;

CREATE OR REPLACE FUNCTION public.entregar_intento_examen(p_intento_id UUID, p_respuestas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  v_respuestas JSONB;
  p JSONB;
  v_id TEXT;
  resultado JSONB;
  minutos INTEGER;
  inicio TIMESTAMPTZ;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado
  WHERE id = p_intento_id AND alumno_id = auth.uid() AND estado = 'en_progreso' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El intento ya fue entregado o no esta disponible'; END IF;
  v_respuestas := public.fb_filtrar_respuestas(i.preguntas_snapshot, p_respuestas);

  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(i.preguntas_snapshot, '[]'::jsonb)) LOOP
    v_id := p->>'id';
    IF coalesce((p->>'obligatoria')::boolean, FALSE) AND NOT (v_respuestas ? v_id) THEN
      RAISE EXCEPTION 'Falta responder una pregunta obligatoria';
    END IF;
  END LOOP;

  inicio := i.fecha_inicio;
  minutos := CASE
    WHEN i.config_snapshot->>'temporizador_global' = 'personalizado' THEN greatest(0, coalesce((i.config_snapshot->>'temporizador_personalizado')::integer, 0))
    WHEN coalesce(i.config_snapshot->>'temporizador_global', 'sin_limite') = 'sin_limite' THEN 0
    ELSE greatest(0, coalesce((i.config_snapshot->>'temporizador_global')::integer, 0))
  END;
  IF minutos > 0 AND now() > inicio + make_interval(mins => minutos) THEN
    RAISE EXCEPTION 'El tiempo del examen ha terminado';
  END IF;
  resultado := public.fb_calcular_puntuacion(i.preguntas_snapshot, v_respuestas);

  UPDATE public.intentos_examen_personalizado AS intento_db SET
    respuestas = v_respuestas,
    puntuacion = (resultado->>'porcentaje')::numeric,
    nota = NULL,
    corregido = FALSE,
    correccion = '{}'::jsonb,
    estado = 'completado',
    fecha_completado = now(),
    entregado_en = now()
  WHERE id = i.id;

  RETURN jsonb_build_object(
    'id', i.id, 'examen_id', i.examen_id, 'alumno_id', i.alumno_id,
    'estado', 'completado', 'fecha_inicio', i.fecha_inicio,
    'fecha_completado', now(), 'entregado_en', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_mis_intentos_examen()
RETURNS SETOF JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  dato JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  FOR i IN SELECT * FROM public.intentos_examen_personalizado WHERE alumno_id = auth.uid() ORDER BY fecha_inicio DESC LOOP
    SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
    dato := to_jsonb(i) - 'preguntas_snapshot' - 'config_snapshot' - 'puntuacion' - 'nota' - 'correccion';
    IF i.corregido THEN
      dato := dato || jsonb_build_object('nota', i.nota, 'puntuacion', i.puntuacion, 'correccion', i.correccion);
    END IF;
    dato := dato || jsonb_build_object('examenes_personalizados', jsonb_build_object(
      'id', e.id, 'grupo_id', e.grupo_id, 'creado_por', e.creado_por,
      'titulo', e.titulo, 'descripcion', e.descripcion, 'estado', e.estado,
      'publicado', e.publicado, 'config', e.config, 'materia', e.materia,
      'tema', e.tema, 'profesor', e.profesor, 'color', e.color, 'icono', e.icono,
      'portada', e.portada, 'version', e.version,
      'preguntas', public.fb_sanitizar_preguntas(e.preguntas)
    ));
    RETURN NEXT dato;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_examen_alumno(p_examen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  v_preguntas JSONB;
BEGIN
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id AND publicado = TRUE AND estado = 'publicado';
  IF NOT FOUND OR NOT public.es_miembro_del_grupo(e.grupo_id) THEN RAISE EXCEPTION 'Examen no disponible'; END IF;
  SELECT coalesce(i.preguntas_snapshot, e.preguntas) INTO v_preguntas
  FROM public.intentos_examen_personalizado i
  WHERE i.examen_id = e.id AND i.alumno_id = auth.uid() AND i.corregido = TRUE
  ORDER BY i.fecha_completado DESC NULLS LAST LIMIT 1;
  -- La vista de examen activo nunca devuelve claves de corrección. El resultado
  -- ya corregido se entrega únicamente mediante obtener_resultado_examen.
  v_preguntas := public.fb_sanitizar_preguntas(e.preguntas);
  RETURN jsonb_build_object(
    'id', e.id, 'grupo_id', e.grupo_id, 'creado_por', e.creado_por, 'titulo', e.titulo,
    'descripcion', e.descripcion, 'referencia_biblica', e.referencia_biblica,
    'preguntas', v_preguntas, 'puntos_totales', e.puntos_totales,
    'fecha_limite', e.fecha_limite, 'estado', e.estado, 'publicado', e.publicado,
    'creado_en', e.creado_en, 'actualizado_en', e.actualizado_en, 'materia', e.materia,
    'tema', e.tema, 'profesor', e.profesor, 'color', e.color, 'icono', e.icono,
    'portada', e.portada, 'config', e.config, 'version', e.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_resultado_examen(p_examen_id UUID, p_intento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado
  WHERE id = p_intento_id AND examen_id = p_examen_id AND alumno_id = auth.uid()
    AND corregido = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resultado no disponible'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = p_examen_id;
  IF NOT FOUND OR NOT public.es_miembro_del_grupo(e.grupo_id) THEN RAISE EXCEPTION 'Resultado no disponible'; END IF;
  RETURN jsonb_build_object(
    'id', e.id, 'grupo_id', e.grupo_id, 'creado_por', e.creado_por, 'titulo', e.titulo,
    'descripcion', e.descripcion, 'referencia_biblica', e.referencia_biblica,
    'preguntas', CASE WHEN coalesce(e.config->>'resultados_visibles', 'al_publicar') <> 'nunca' THEN coalesce(i.preguntas_snapshot, e.preguntas) ELSE public.fb_sanitizar_preguntas(e.preguntas) END,
    'puntos_totales', e.puntos_totales, 'fecha_limite', e.fecha_limite, 'estado', e.estado,
    'publicado', e.publicado, 'creado_en', e.creado_en, 'actualizado_en', e.actualizado_en,
    'materia', e.materia, 'tema', e.tema, 'profesor', e.profesor, 'color', e.color,
    'icono', e.icono, 'portada', e.portada, 'config', e.config, 'version', e.version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_examenes_alumno(p_grupo_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE e public.examenes_personalizados%ROWTYPE;
BEGIN
  IF NOT public.es_miembro_del_grupo(p_grupo_id) THEN RAISE EXCEPTION 'Grupo no disponible'; END IF;
  FOR e IN SELECT * FROM public.examenes_personalizados WHERE grupo_id = p_grupo_id AND publicado = TRUE AND estado = 'publicado' ORDER BY creado_en DESC LOOP
    RETURN NEXT public.obtener_examen_alumno(e.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.calificar_intento_examen(
  p_intento_id UUID,
  p_nota NUMERIC DEFAULT NULL, -- se conserva por compatibilidad; el servidor no confia en este valor
  p_observaciones TEXT DEFAULT '',
  p_correccion JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i public.intentos_examen_personalizado%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  resultado JSONB;
BEGIN
  SELECT * INTO i FROM public.intentos_examen_personalizado WHERE id = p_intento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intento no encontrado'; END IF;
  SELECT * INTO e FROM public.examenes_personalizados WHERE id = i.examen_id;
  IF NOT public.es_editor_del_grupo(e.grupo_id) THEN RAISE EXCEPTION 'No autorizado para corregir este intento'; END IF;
  IF i.estado NOT IN ('completado', 'calificado') THEN RAISE EXCEPTION 'El intento aun no se puede corregir'; END IF;
  resultado := public.fb_calcular_puntuacion(i.preguntas_snapshot, i.respuestas, coalesce(p_correccion, '{}'::jsonb));
  UPDATE public.intentos_examen_personalizado SET
    puntuacion = (resultado->>'porcentaje')::numeric,
    nota = (resultado->>'nota')::numeric,
    corregido = TRUE,
    corregido_por = auth.uid(),
    observaciones = left(coalesce(p_observaciones, ''), 4000),
    correccion = coalesce(p_correccion, '{}'::jsonb),
    estado = 'calificado',
    fecha_corregido = now()
  WHERE id = i.id;
  RETURN jsonb_build_object('id', i.id, 'nota', (resultado->>'nota')::numeric, 'puntuacion', (resultado->>'porcentaje')::numeric, 'estado', 'calificado', 'corregido', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RLS: el alumno solo puede entrar por las RPCs; el profesor solo lee y
-- corrige por calificar_intento_examen. No hay UPDATE directo de intentos.
-- ----------------------------------------------------------------------------
ALTER TABLE public.examenes_personalizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examenes_lectura_grupo" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_lectura_profesor" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON public.examenes_personALIZADOS;
DROP POLICY IF EXISTS "examenes_edicion_profesor_upd" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor_del" ON public.examenes_personalizados;
CREATE POLICY "examenes_lectura_profesor" ON public.examenes_personalizados
  FOR SELECT TO authenticated USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());
CREATE POLICY "examenes_edicion_profesor" ON public.examenes_personalizados
  FOR INSERT TO authenticated WITH CHECK (public.es_owner() OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));
CREATE POLICY "examenes_edicion_profesor_upd" ON public.examenes_personalizados
  FOR UPDATE TO authenticated USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner()) WITH CHECK (public.es_editor_del_grupo(grupo_id) OR public.es_owner());
CREATE POLICY "examenes_edicion_profesor_del" ON public.examenes_personalizados
  FOR DELETE TO authenticated USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

ALTER TABLE public.intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intentos_alumno_propio" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_ve" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_califica" ON public.intentos_examen_personalizado;
CREATE POLICY "intentos_profesor_ve" ON public.intentos_examen_personalizado
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.examenes_personalizados e WHERE e.id = examen_id AND (public.es_editor_del_grupo(e.grupo_id) OR public.es_owner())));

REVOKE INSERT, UPDATE, DELETE ON public.intentos_examen_personalizado FROM authenticated;
GRANT SELECT ON public.intentos_examen_personalizado TO authenticated;

-- Solo las funciones SECURITY DEFINER ejecutan los helpers privados.
REVOKE ALL ON FUNCTION public.fb_respuesta_correcta(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_filtrar_respuestas(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_sanitizar_preguntas(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_calcular_puntuacion(JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.iniciar_intento_examen(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guardar_borrador_examen(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.entregar_intento_examen(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.listar_mis_intentos_examen() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obtener_examen_alumno(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.listar_examenes_alumno(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obtener_resultado_examen(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calificar_intento_examen(UUID, NUMERIC, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_intento_examen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_borrador_examen(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.entregar_intento_examen(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_mis_intentos_examen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_examen_alumno(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_examenes_alumno(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_resultado_examen(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calificar_intento_examen(UUID, NUMERIC, TEXT, JSONB) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Contacto: bandeja owner y actualizacion de estado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_contacto_mensajes()
RETURNS SETOF public.contacto_mensajes
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY SELECT * FROM public.contacto_mensajes ORDER BY creado_en DESC LIMIT 300;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_contacto_mensaje(
  p_id UUID, p_estado TEXT
) RETURNS public.contacto_mensajes
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r public.contacto_mensajes;
BEGIN
  IF NOT public.es_owner() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_estado NOT IN ('nuevo', 'en_proceso', 'resuelto', 'spam') THEN RAISE EXCEPTION 'Estado invalido'; END IF;
  UPDATE public.contacto_mensajes SET estado = p_estado, atendido_en = CASE WHEN p_estado IN ('resuelto', 'spam') THEN now() ELSE NULL END, atendido_por = CASE WHEN p_estado IN ('resuelto', 'spam') THEN auth.uid() ELSE NULL END WHERE id = p_id RETURNING * INTO r;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Mensaje no encontrado'; END IF;
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.listar_contacto_mensajes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.actualizar_contacto_mensaje(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_contacto_mensajes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_contacto_mensaje(UUID, TEXT) TO authenticated;

SELECT '047 aplicada: anon cerrado, examenes entregados/calificados en servidor y bandeja de contacto disponible' AS mensaje;
