-- ============================================================================
-- 059_detalle_resultado_alumno.sql
-- ----------------------------------------------------------------------------
-- El resultado del alumno (public-site/examen.js → pantallaResultado) ya sabe
-- pintar el detalle por pregunta (enunciado, tu respuesta, respuesta correcta,
-- puntos y comentario del profesor), pero fb_consultar_entrega solo devolvía
-- estado + nota: ni el snapshot de preguntas ni el desglose, así que esa
-- pantalla nunca podía renderizarse en producción.
--
-- Se amplía la rama "calificado" con:
--   * "preguntas": snapshot del examen sanitizado (sin respuesta_correcta ni
--     variantes, igual que fb_iniciar_por_token) para poder pintar enunciado,
--     tipo y opciones.
--   * "detalle.por_pregunta": por id, es_correcta, puntos, respuesta del
--     alumno, respuesta correcta en forma visible y comentario del profesor.
--
-- Seguridad: los dos campos NUEVOS solo viajan cuando i.corregido es TRUE.
-- Antes de que el profesor cierre la corrección, la respuesta correcta sigue
-- sin salir del servidor en ningún formato (la rama "entregado" no cambia y
-- sigue sin incluirlos), así que el contrato del resultado pendiente se
-- mantiene: nota oculta, sin "Respuesta correcta".
-- ============================================================================

-- Forma "visible" de la respuesta correcta de una pregunta: el snapshot guarda
-- arrays/objetos JSON como texto (varias_opciones, ordenar, relacionar) y los
-- huecos de completar como "a|b|c". El alumno necesita el mismo tipo que su
-- propia respuesta (array / objeto / texto) para poder compararlas en pantalla.
CREATE OR REPLACE FUNCTION public.fb_respuesta_correcta_visible(
  p_valor TEXT,
  p_tipo TEXT,
  p_huecos JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_texto TEXT := p_valor;
BEGIN
  IF v_texto IS NULL AND jsonb_typeof(p_huecos) = 'array' THEN
    SELECT string_agg(h ->> 'respuesta_correcta', ' / ' ORDER BY o)
      INTO v_texto
      FROM jsonb_array_elements(p_huecos) WITH ORDINALITY AS t(h, o);
  END IF;
  IF v_texto IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_tipo IN ('varias_opciones', 'ordenar', 'relacionar') THEN
    BEGIN
      RETURN v_texto::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN to_jsonb(v_texto);
    END;
  END IF;

  IF p_tipo = 'completar' THEN
    RETURN to_jsonb(
      coalesce(
        (SELECT string_agg(trim(x), ' / ')
           FROM unnest(string_to_array(v_texto, '|')) AS x
          WHERE btrim(x) <> ''),
        ''
      )
    );
  END IF;

  RETURN to_jsonb(v_texto);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_respuesta_correcta_visible(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fb_consultar_entrega(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l public.examen_enlaces%ROWTYPE;
  e public.examenes_personalizados%ROWTYPE;
  i public.intentos_examen_personalizado%ROWTYPE;
  p JSONB;
  v_id TEXT;
  v_calculo JSONB;
  v_fila JSONB;
  v_preguntas JSONB := '[]'::jsonb;
  v_detalle JSONB := '{}'::jsonb;
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
    -- Ya está cerrada la corrección: es el único momento en que viajan el
    -- snapshot y la respuesta correcta, y siempre calculados en servidor.
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
      'preguntas', v_preguntas,
      'detalle', jsonb_build_object('por_pregunta', v_detalle)
    );
  END IF;

  RETURN jsonb_build_object(
    'estado', 'entregado', 'titulo', e.titulo, 'intento_id', i.id,
    'pendiente_correccion', i.pendientes_correccion,
    'fecha_completado', i.fecha_completado
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fb_consultar_entrega(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fb_consultar_entrega(TEXT) TO anon, authenticated;

SELECT '059 aplicada: el resultado del alumno trae preguntas y detalle por pregunta solo tras corregir' AS mensaje;
