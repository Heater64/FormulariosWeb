-- ============================================================================
-- MIGRACION 049: integridad server-side de Desafios
-- ============================================================================
-- El snapshot publico solo contiene preguntas y opciones. Las claves quedan en
-- desafio_claves, sin SELECT para authenticated. Todas las transiciones y la
-- puntuacion pasan por RPCs SECURITY DEFINER.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Snapshots y respuestas privadas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.desafio_claves (
  desafio_id UUID PRIMARY KEY REFERENCES public.desafios(id) ON DELETE CASCADE,
  sesion JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.desafio_respuestas (
  desafio_id UUID NOT NULL REFERENCES public.desafios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  ejercicio_id TEXT NOT NULL,
  respuesta JSONB NOT NULL DEFAULT 'null'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (desafio_id, usuario_id, ejercicio_id)
);

ALTER TABLE public.desafio_claves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafio_respuestas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_claves_sin_acceso" ON public.desafio_claves;
DROP POLICY IF EXISTS "desafio_respuestas_sin_acceso" ON public.desafio_respuestas;
REVOKE ALL ON public.desafio_claves FROM anon, authenticated;
REVOKE ALL ON public.desafio_respuestas FROM anon, authenticated;

-- Backfill antes de limpiar la columna publica. Los desafios antiguos quedan
-- puntuables con la copia que ya estaba almacenada.
INSERT INTO public.desafio_claves (desafio_id, sesion)
SELECT d.id, d.sesion
FROM public.desafios d
WHERE d.sesion IS NOT NULL
  AND jsonb_typeof(d.sesion) = 'array'
ON CONFLICT (desafio_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. IDs estables y funcion de sanitizacion publica
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_desafio_sesion_con_ids(p_sesion JSONB)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e JSONB;
  salida JSONB := '[]'::jsonb;
  indice INTEGER := 0;
  id_texto TEXT;
BEGIN
  IF jsonb_typeof(coalesce(p_sesion, '[]'::jsonb)) <> 'array' THEN
    RETURN salida;
  END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p_sesion) LOOP
    id_texto := nullif(coalesce(e->>'id', e->>'tarjetaId'), '');
    IF id_texto IS NULL THEN id_texto := indice::text; END IF;
    salida := salida || jsonb_build_array(jsonb_set(e, '{id}', to_jsonb(id_texto), true));
    indice := indice + 1;
  END LOOP;
  RETURN salida;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_desafio_sanitizar_sesion(p_sesion JSONB)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  e JSONB;
  limpio JSONB;
  salida JSONB := '[]'::jsonb;
  indice INTEGER := 0;
BEGIN
  p_sesion := public.fb_desafio_sesion_con_ids(p_sesion);
  IF jsonb_typeof(coalesce(p_sesion, '[]'::jsonb)) <> 'array' THEN
    RETURN salida;
  END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p_sesion) LOOP
    -- El id estable permite guardar respuestas sin exponer la clave.
    limpio := e
      - 'respuestaCorrecta'
      - 'respuestas'
      - 'esVerdadero'
      - 'falsas'
      - 'pares'
      - 'respuesta_correcta';
    IF jsonb_typeof(limpio->'huecos') = 'array' THEN
      limpio := jsonb_set(limpio, '{huecos}', (
        SELECT coalesce(jsonb_agg(h - 'palabra'), '[]'::jsonb)
        FROM jsonb_array_elements(limpio->'huecos') AS hueco(h)
      ), true);
    END IF;
    IF NOT (limpio ? 'id') THEN
      limpio := jsonb_set(limpio, '{id}', to_jsonb(indice::text), true);
    END IF;
    indice := indice + 1;
    salida := salida || jsonb_build_array(limpio);
  END LOOP;
  RETURN salida;
END;
$$;

-- Los desafios existentes dejan de devolver claves en `desafios.sesion`.
UPDATE public.desafio_claves c
SET sesion = public.fb_desafio_sesion_con_ids(c.sesion);

UPDATE public.desafios d
SET sesion = public.fb_desafio_sanitizar_sesion(c.sesion)
FROM public.desafio_claves c
WHERE c.desafio_id = d.id;

-- ----------------------------------------------------------------------------
-- 3. Helpers de correccion privados
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_desafio_texto(p_valor JSONB)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT lower(regexp_replace(btrim(coalesce(p_valor #>> '{}', '')), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.fb_desafio_respuesta_correcta(
  p_ejercicio JSONB,
  p_respuesta JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tipo TEXT := coalesce(p_ejercicio->>'tipo', '');
  i INTEGER;
  clave TEXT;
  correcta JSONB;
  respuesta_texto TEXT;
  correcta_texto TEXT;
  palabras_total INTEGER;
  palabras_coinciden INTEGER;
BEGIN
  IF p_respuesta IS NULL OR p_respuesta = 'null'::jsonb THEN RETURN false; END IF;
  IF tipo = 'completar' THEN
    IF jsonb_typeof(p_respuesta) <> 'array' OR jsonb_typeof(p_ejercicio->'respuestas') <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(p_respuesta) <> jsonb_array_length(p_ejercicio->'respuestas') THEN RETURN false; END IF;
    FOR i IN 0..jsonb_array_length(p_ejercicio->'respuestas') - 1 LOOP
      IF public.fb_desafio_texto(p_respuesta->i) <> public.fb_desafio_texto(p_ejercicio->'respuestas'->i) THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
  ELSIF tipo = 'ordenar' THEN
    IF jsonb_typeof(p_respuesta) <> 'array' OR jsonb_typeof(p_ejercicio->'respuestaCorrecta') <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(p_respuesta) <> jsonb_array_length(p_ejercicio->'respuestaCorrecta') THEN RETURN false; END IF;
    FOR i IN 0..jsonb_array_length(p_respuesta) - 1 LOOP
      IF public.fb_desafio_texto(p_respuesta->i) <> public.fb_desafio_texto(p_ejercicio->'respuestaCorrecta'->i) THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
  ELSIF tipo = 'elegir_versiculo' THEN
    RETURN public.fb_desafio_texto(p_respuesta) = public.fb_desafio_texto(p_ejercicio->'respuestaCorrecta');
  ELSIF tipo = 'escrita' THEN
    respuesta_texto := public.fb_desafio_texto(p_respuesta);
    correcta_texto := public.fb_desafio_texto(p_ejercicio->'respuestaCorrecta');
    IF respuesta_texto = '' OR correcta_texto = '' THEN RETURN false; END IF;
    IF respuesta_texto = correcta_texto THEN RETURN true; END IF;
    SELECT count(*) INTO palabras_total
    FROM regexp_split_to_table(correcta_texto, '\s+') AS palabra
    WHERE palabra <> '';
    IF palabras_total >= 4 THEN
      SELECT count(*) INTO palabras_coinciden
      FROM regexp_split_to_table(correcta_texto, '\s+') AS palabra
      WHERE palabra <> '' AND respuesta_texto LIKE '%' || palabra || '%';
      RETURN palabras_coinciden::numeric / palabras_total >= 0.6;
    END IF;
    RETURN false;
  ELSIF tipo = 'verdadero_falso' THEN
    RETURN (p_respuesta #>> '{}') = CASE WHEN coalesce((p_ejercicio->>'esVerdadero')::boolean, false) THEN 'Verdadero' ELSE 'Falso' END;
  ELSIF tipo = 'relacionar' THEN
    correcta := p_ejercicio->'respuestaCorrecta';
    IF jsonb_typeof(p_respuesta) <> 'object' OR jsonb_typeof(correcta) <> 'object' THEN RETURN false; END IF;
    IF (SELECT count(*) FROM jsonb_object_keys(p_respuesta)) <> (SELECT count(*) FROM jsonb_object_keys(correcta)) THEN RETURN false; END IF;
    FOR clave IN SELECT key FROM jsonb_each(correcta) LOOP
      IF NOT (p_respuesta ? clave) OR public.fb_desafio_texto(p_respuesta->clave) <> public.fb_desafio_texto(correcta->clave) THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.fb_desafio_sesion_privada(p_desafio_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT sesion FROM public.desafio_claves WHERE desafio_id = p_desafio_id
$$;

-- ----------------------------------------------------------------------------
-- 4. Crear desafio: insercion atomica del desafio, claves y participantes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_desafio_seguro(
  p_mazo_id UUID,
  p_mazo_nombre TEXT,
  p_sesion JSONB,
  p_participantes UUID[] DEFAULT ARRAY[]::UUID[],
  p_tiempo_limite_seg INTEGER DEFAULT 120,
  p_expira_en TIMESTAMPTZ DEFAULT NULL,
  p_iniciar_inmediato BOOLEAN DEFAULT false,
  p_finaliza_primer_terminado BOOLEAN DEFAULT false
) RETURNS public.desafios
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d public.desafios;
  uid UUID;
  limite INTEGER;
  inicio TIMESTAMPTZ;
  sesion_normalizada JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF jsonb_typeof(coalesce(p_sesion, '[]'::jsonb)) <> 'array' OR jsonb_array_length(p_sesion) = 0 THEN
    RAISE EXCEPTION 'La sesion del desafio esta vacia';
  END IF;
  IF jsonb_array_length(p_sesion) > 50 THEN RAISE EXCEPTION 'La sesion del desafio es demasiado larga'; END IF;
  IF coalesce(cardinality(p_participantes), 0) < 1 THEN RAISE EXCEPTION 'El desafio necesita al menos un rival'; END IF;
  IF cardinality(p_participantes) <> (SELECT count(DISTINCT uid) FROM unnest(p_participantes) AS uid) THEN RAISE EXCEPTION 'Participantes duplicados'; END IF;
  IF NOT public.es_owner() AND EXISTS (
    SELECT 1 FROM unnest(p_participantes) AS rival
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.miembros_grupo propio
      JOIN public.miembros_grupo compartido ON compartido.grupo_id = propio.grupo_id
      WHERE propio.usuario_id = auth.uid() AND compartido.usuario_id = rival
    )
  ) THEN RAISE EXCEPTION 'Todos los participantes deben pertenecer a una clase compartida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mazos_memorizacion WHERE id = p_mazo_id AND es_global = true) THEN
    RAISE EXCEPTION 'El mazo no esta disponible para desafios';
  END IF;
  limite := CASE WHEN p_finaliza_primer_terminado THEN NULL ELSE CASE WHEN p_tiempo_limite_seg IS NULL THEN NULL ELSE greatest(60, p_tiempo_limite_seg) END END;
  inicio := CASE WHEN p_iniciar_inmediato THEN now() + interval '5 seconds' ELSE NULL END;
  sesion_normalizada := public.fb_desafio_sesion_con_ids(p_sesion);

  INSERT INTO public.desafios (creador_id, mazo_id, mazo_nombre, estado, sesion, tiempo_limite_seg, expira_en, iniciado_en, finaliza_primer_terminado)
  VALUES (auth.uid(), p_mazo_id, left(coalesce(p_mazo_nombre, ''), 200), CASE WHEN p_iniciar_inmediato THEN 'en_curso' ELSE 'invitacion' END,
          public.fb_desafio_sanitizar_sesion(sesion_normalizada), limite,
          now() + interval '15 minutes', inicio, coalesce(p_finaliza_primer_terminado, false))
  RETURNING * INTO d;

  INSERT INTO public.desafio_claves (desafio_id, sesion) VALUES (d.id, sesion_normalizada);
  INSERT INTO public.desafio_participantes (desafio_id, usuario_id, estado, orden)
  SELECT d.id, x.uid, CASE WHEN p_iniciar_inmediato OR x.uid = auth.uid() THEN 'aceptado' ELSE 'invitado' END,
         x.orden
  FROM (
    SELECT auth.uid() AS uid, 0 AS orden
    UNION ALL
    SELECT uid, row_number() OVER (ORDER BY uid)::integer
    FROM unnest(coalesce(p_participantes, ARRAY[]::UUID[])) AS uid
    WHERE uid <> auth.uid()
  ) x;
  RETURN d;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPCs de estado y respuestas
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.desafio_responder_invitacion(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.desafio_responder_invitacion(p_desafio_id UUID, p_aceptar BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  d public.desafios;
  activos INTEGER;
  todos BOOLEAN;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = d.id AND usuario_id = auth.uid()) THEN RAISE EXCEPTION 'No participas en este desafio'; END IF;
  IF d.estado <> 'invitacion' THEN
    RETURN jsonb_build_object('empezado', d.estado = 'en_curso', 'iniciado_ahora', false);
  END IF;
  IF d.expira_en IS NOT NULL AND now() > d.expira_en THEN
    UPDATE public.desafios SET estado = 'expirado', finalizado_en = now() WHERE id = d.id AND estado = 'invitacion';
    RAISE EXCEPTION 'La invitacion ha expirado';
  END IF;
  IF p_aceptar THEN
    UPDATE public.desafio_participantes SET estado = 'aceptado' WHERE desafio_id = d.id AND usuario_id = auth.uid() AND estado = 'invitado';
    SELECT count(*) INTO activos FROM public.desafio_participantes WHERE desafio_id = d.id AND estado <> 'eliminado';
    SELECT count(*) = activos INTO todos FROM public.desafio_participantes WHERE desafio_id = d.id AND estado = 'aceptado';
    IF activos >= 2 AND todos THEN
      UPDATE public.desafios SET estado = 'en_curso', iniciado_en = now() + interval '5 seconds' WHERE id = d.id AND estado = 'invitacion';
      RETURN jsonb_build_object('empezado', true, 'iniciado_ahora', true);
    END IF;
    RETURN jsonb_build_object('empezado', false, 'iniciado_ahora', false);
  END IF;
  UPDATE public.desafio_participantes SET estado = 'rechazado' WHERE desafio_id = d.id AND usuario_id = auth.uid() AND estado = 'invitado';
  UPDATE public.desafios SET estado = 'cancelado', finalizado_en = now() WHERE id = d.id AND estado = 'invitacion';
  RETURN jsonb_build_object('empezado', false, 'iniciado_ahora', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_cerrar_vencido(p_desafio_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.desafios;
  afectados INTEGER := 0;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id FOR UPDATE;
  IF d.id IS NULL OR NOT (
    d.creador_id = auth.uid()
    OR public.es_owner()
    OR EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = d.id AND usuario_id = auth.uid())
  ) THEN RAISE EXCEPTION 'No participas en este desafio'; END IF;
  IF d.estado = 'invitacion' AND d.expira_en IS NOT NULL AND now() > d.expira_en THEN
    UPDATE public.desafios SET estado = 'expirado', finalizado_en = now() WHERE id = d.id AND estado = 'invitacion';
    RETURN 1;
  END IF;
  IF d.estado = 'en_curso' AND d.iniciado_en IS NOT NULL AND (
    (d.tiempo_limite_seg IS NOT NULL AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second')
    OR (d.tiempo_limite_seg IS NULL AND now() > d.iniciado_en + interval '24 hours')
  ) THEN
    UPDATE public.desafio_participantes SET estado = 'abandonado', progreso = NULL
    WHERE desafio_id = d.id AND estado IN ('aceptado', 'en_juego');
    GET DIAGNOSTICS afectados = ROW_COUNT;
    IF NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = d.id AND estado IN ('invitado', 'aceptado', 'en_juego')) THEN
      UPDATE public.desafios SET estado = 'finalizado', finalizado_en = now() WHERE id = d.id AND estado = 'en_curso';
      afectados := afectados + 1;
    END IF;
  END IF;
  RETURN afectados;
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_marcar_en_juego(p_desafio_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.desafios;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id;
  IF d.id IS NULL OR d.estado <> 'en_curso' OR d.iniciado_en IS NULL OR now() < d.iniciado_en THEN RETURN false; END IF;
  IF d.tiempo_limite_seg IS NOT NULL AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second' THEN RETURN false; END IF;
  UPDATE public.desafio_participantes SET estado = 'en_juego'
  WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid() AND estado = 'aceptado';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_guardar_progreso(p_desafio_id UUID, p_progreso JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE idx INTEGER;
DECLARE maximo INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.desafios WHERE id = p_desafio_id AND estado = 'en_curso') THEN RAISE EXCEPTION 'Desafio no activo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid() AND estado IN ('aceptado', 'en_juego')) THEN RAISE EXCEPTION 'Participante no activo'; END IF;
  maximo := jsonb_array_length(coalesce(public.fb_desafio_sesion_privada(p_desafio_id), '[]'::jsonb));
  idx := greatest(0, least(maximo, coalesce((p_progreso->>'idx')::integer, 0)));
  UPDATE public.desafio_participantes SET progreso = jsonb_build_object(
    'idx', idx,
    'correctas', greatest(0, least(idx, coalesce((p_progreso->>'correctas')::integer, 0))),
    'incorrectas', greatest(0, least(idx, coalesce((p_progreso->>'incorrectas')::integer, 0)))
  ) WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid();
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_comprobar_respuesta(p_desafio_id UUID, p_ejercicio_id TEXT, p_respuesta JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  sesion JSONB;
  ejercicio JSONB;
  correcta BOOLEAN;
  d public.desafios;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id;
  IF d.estado <> 'en_curso' OR d.iniciado_en IS NULL OR now() < d.iniciado_en THEN RAISE EXCEPTION 'Desafio no activo'; END IF;
  IF d.tiempo_limite_seg IS NOT NULL AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second' THEN RAISE EXCEPTION 'El tiempo del desafio ha terminado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid() AND estado IN ('aceptado', 'en_juego')) THEN RAISE EXCEPTION 'Participante no activo'; END IF;
  sesion := public.fb_desafio_sesion_privada(p_desafio_id);
  SELECT value INTO ejercicio FROM jsonb_array_elements(coalesce(sesion, '[]'::jsonb)) WHERE value->>'id' = p_ejercicio_id LIMIT 1;
  IF ejercicio IS NULL THEN RAISE EXCEPTION 'Ejercicio no valido'; END IF;
  correcta := public.fb_desafio_respuesta_correcta(ejercicio, p_respuesta);
  INSERT INTO public.desafio_respuestas (desafio_id, usuario_id, ejercicio_id, respuesta, actualizado_en)
  VALUES (p_desafio_id, auth.uid(), p_ejercicio_id, coalesce(p_respuesta, 'null'::jsonb), now())
  ON CONFLICT (desafio_id, usuario_id, ejercicio_id) DO NOTHING;
  SELECT public.fb_desafio_respuesta_correcta(ejercicio, dr.respuesta) INTO correcta
  FROM public.desafio_respuestas dr
  WHERE dr.desafio_id = p_desafio_id AND dr.usuario_id = auth.uid() AND dr.ejercicio_id = p_ejercicio_id;
  RETURN jsonb_build_object('correcta', coalesce(correcta, false));
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_terminar_jugador(p_desafio_id UUID, p_respuestas JSONB, p_tiempo_ms INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.desafios;
  sesion JSONB;
  e JSONB;
  r JSONB;
  v_total INTEGER;
  v_correctas INTEGER := 0;
  idx TEXT;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio no encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = d.id AND usuario_id = auth.uid() AND estado IN ('aceptado', 'en_juego')) THEN
    RETURN (SELECT jsonb_build_object('estado', estado, 'correctas', correctas, 'total', total) FROM public.desafio_participantes WHERE desafio_id = d.id AND usuario_id = auth.uid());
  END IF;
  sesion := public.fb_desafio_sesion_privada(d.id);
  v_total := jsonb_array_length(coalesce(sesion, '[]'::jsonb));
  -- El payload solo completa respuestas ya verificables por el snapshot privado.
  -- Se persisten aquí las respuestas pendientes del último envío para que un
  -- cierre inmediato no dependa de que el cliente haya llamado antes a
  -- desafio_comprobar_respuesta. La nota siempre se recalcula con las claves
  -- privadas del servidor.
  IF jsonb_typeof(coalesce(p_respuestas, '{}'::jsonb)) = 'object' THEN
    FOR idx, r IN SELECT key, value FROM jsonb_each(p_respuestas) LOOP
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(sesion, '[]'::jsonb)) AS candidato(value) WHERE candidato.value->>'id' = idx) THEN
        INSERT INTO public.desafio_respuestas (desafio_id, usuario_id, ejercicio_id, respuesta, actualizado_en)
        VALUES (d.id, auth.uid(), idx, coalesce(r, 'null'::jsonb), now())
        ON CONFLICT (desafio_id, usuario_id, ejercicio_id) DO UPDATE
          SET respuesta = EXCLUDED.respuesta, actualizado_en = now();
      END IF;
    END LOOP;
  END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(sesion, '[]'::jsonb)) LOOP
    idx := e->>'id';
    SELECT respuesta INTO r FROM public.desafio_respuestas
    WHERE desafio_id = d.id AND usuario_id = auth.uid() AND ejercicio_id = idx;
    IF public.fb_desafio_respuesta_correcta(e, r) THEN v_correctas := v_correctas + 1; END IF;
  END LOOP;
  IF d.iniciado_en IS NULL OR now() < d.iniciado_en THEN RAISE EXCEPTION 'El desafio aun no ha comenzado'; END IF;
  IF d.tiempo_limite_seg IS NOT NULL AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second' THEN
    UPDATE public.desafio_participantes SET estado = 'abandonado', progreso = NULL
    WHERE desafio_id = d.id AND usuario_id = auth.uid() AND estado IN ('aceptado', 'en_juego');
    RAISE EXCEPTION 'El tiempo del desafio ha terminado';
  END IF;
  UPDATE public.desafio_participantes SET estado = 'terminado', correctas = v_correctas, total = v_total,
    tiempo_ms = least(greatest(0, coalesce(p_tiempo_ms, 0)), greatest(0, extract(epoch FROM (now() - d.iniciado_en)) * 1000)::integer),
    progreso = NULL WHERE desafio_id = d.id AND usuario_id = auth.uid();
  IF d.finaliza_primer_terminado THEN
    UPDATE public.desafio_participantes p SET estado = 'terminado',
      correctas = coalesce((SELECT count(*) FROM public.desafio_respuestas dr
        JOIN LATERAL jsonb_array_elements(sesion) AS ejercicio(value) ON ejercicio.value->>'id' = dr.ejercicio_id
        WHERE dr.desafio_id = d.id AND dr.usuario_id = p.usuario_id
          AND public.fb_desafio_respuesta_correcta(ejercicio.value, dr.respuesta)), 0)::integer,
      total = v_total,
      tiempo_ms = greatest(0, extract(epoch FROM (now() - coalesce(d.iniciado_en, now()))) * 1000)::integer,
      progreso = NULL
    WHERE p.desafio_id = d.id AND p.estado IN ('aceptado', 'en_juego');
  END IF;
  IF d.finaliza_primer_terminado OR NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = d.id AND estado IN ('invitado', 'aceptado', 'en_juego')) THEN
    UPDATE public.desafios SET estado = 'finalizado', finalizado_en = now() WHERE id = d.id AND estado = 'en_curso';
  END IF;
  RETURN jsonb_build_object('estado', 'terminado', 'correctas', v_correctas, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_abandonar_jugador(p_desafio_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.desafios;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id FOR UPDATE;
  IF d.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid()) THEN RAISE EXCEPTION 'No participas en este desafio'; END IF;
  UPDATE public.desafio_participantes SET estado = 'abandonado', progreso = NULL WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid() AND estado NOT IN ('terminado', 'abandonado', 'rechazado', 'eliminado');
  IF d.estado = 'en_curso' AND NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND estado IN ('invitado', 'aceptado', 'en_juego')) THEN
    UPDATE public.desafios SET estado = 'finalizado', finalizado_en = now() WHERE id = p_desafio_id;
  END IF;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.desafio_eliminar_invitado(p_desafio_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.desafios;
BEGIN
  SELECT * INTO d FROM public.desafios WHERE id = p_desafio_id;
  IF d.id IS NULL OR d.estado <> 'invitacion' OR NOT (d.creador_id = auth.uid() OR public.es_owner()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.desafio_participantes SET estado = 'eliminado' WHERE desafio_id = p_desafio_id AND usuario_id = p_usuario_id AND estado = 'invitado';
  IF FOUND AND (SELECT count(*) FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND estado <> 'eliminado') >= 2
     AND NOT EXISTS (SELECT 1 FROM public.desafio_participantes WHERE desafio_id = p_desafio_id AND estado NOT IN ('aceptado', 'eliminado')) THEN
    UPDATE public.desafios SET estado = 'en_curso', iniciado_en = now() + interval '5 seconds'
    WHERE id = p_desafio_id AND estado = 'invitacion';
  END IF;
  RETURN FOUND;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Cerrar escrituras directas y exponer solo el snapshot publico
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "desafios_edicion_creador" ON public.desafios;
DROP POLICY IF EXISTS "desafios_edicion_participante" ON public.desafios;
DROP POLICY IF EXISTS "desafios_insert_propios" ON public.desafios;
DROP POLICY IF EXISTS "desafios_lectura" ON public.desafios;
DROP POLICY IF EXISTS "desafios_borrado_creador" ON public.desafios;
DROP POLICY IF EXISTS "desafios_solo_lectura" ON public.desafios;
DROP POLICY IF EXISTS "desafio_participantes_solo_lectura" ON public.desafio_participantes;
DROP POLICY IF EXISTS "desafio_participantes_update" ON public.desafio_participantes;
DROP POLICY IF EXISTS "desafio_participantes_insert" ON public.desafio_participantes;
DROP POLICY IF EXISTS "desafio_participantes_delete" ON public.desafio_participantes;
DROP POLICY IF EXISTS "desafio_participantes_lectura" ON public.desafio_participantes;
CREATE POLICY "desafios_solo_lectura" ON public.desafios FOR SELECT TO authenticated USING (creador_id = auth.uid() OR public.es_owner() OR public.es_participante_del_desafio(id));
CREATE POLICY "desafio_participantes_solo_lectura" ON public.desafio_participantes FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.es_owner() OR public.es_participante_del_desafio(desafio_id));
REVOKE INSERT, UPDATE, DELETE ON public.desafios FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.desafio_participantes FROM authenticated;
GRANT SELECT ON public.desafios, public.desafio_participantes TO authenticated;

REVOKE ALL ON FUNCTION public.fb_desafio_sesion_con_ids(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_desafio_sanitizar_sesion(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_desafio_texto(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_desafio_respuesta_correcta(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fb_desafio_sesion_privada(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.desafio_iniciar(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.desafio_abandonar_vencidos(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.desafio_cerrar_vencidos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_cerrar_vencido(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_desafio_seguro(UUID, TEXT, JSONB, UUID[], INTEGER, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_responder_invitacion(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_marcar_en_juego(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_guardar_progreso(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_comprobar_respuesta(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_terminar_jugador(UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_abandonar_jugador(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desafio_eliminar_invitado(UUID, UUID) TO authenticated;

SELECT 'Migracion 049 aplicada: desafios con integridad server-side' AS mensaje;
