-- ============================================================================
-- 079: Temario de examen para el ALUMNO (fase 2)
-- ----------------------------------------------------------------------------
-- Hasta ahora la columna `temario` (077) solo se usaba en el editor del
-- profesor: las RPCs del alumno no la devolvían. Esta migración añade la
-- clave `temario` a las dos RPCs que el alumno usa para abrir un examen:
--   * obtener_examen_alumno  → vista autenticada /tomar/:id
--   * fb_contexto_enlace     → página pública /e/<token>
--
-- Exposición mínima y segura (helper interna fb_temario_publicado):
--   * solo si el temario está PUBLICADO por el profesor;
--   * solo si la bandera 'temario' está activa para el usuario actual
--     (se reutiliza fb_funciones(): si el owner la vuelve a 'oculta' o
--     'beta', el servidor deja de entregar temario — interruptor de
--     emergencia también en el lado del alumno);
--   * saneado: items { tipo, texto, refs, orden } en orden; NUNCA salen
--     avisos, estado de revisión, notas ni texto_original.
--
-- El tipo de retorno de ambas RPCs sigue siendo JSONB: CREATE OR REPLACE
-- conserva también sus GRANT existentes.
--
-- Idempotente: se puede ejecutar varias veces sin errores.
-- Requiere 047, 063, 076 y 077 aplicadas.
-- ============================================================================

-- Auxiliar interna: no se concede a ningún rol; solo la usan las RPC
-- SECURITY DEFINER de esta migración.
DROP FUNCTION IF EXISTS public.fb_temario_publicado(JSONB);
CREATE FUNCTION public.fb_temario_publicado(p_temario JSONB)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    -- Sin temario, sin publicar o con la bandera apagada: nada que exponer.
    WHEN jsonb_typeof(coalesce(p_temario, 'null'::jsonb)) <> 'object' THEN NULL
    WHEN coalesce(p_temario->>'publicado', 'false') <> 'true' THEN NULL
    WHEN NOT EXISTS (
      SELECT 1 FROM public.fb_funciones() f WHERE f.clave = 'temario' AND f.activa
    ) THEN NULL
    WHEN jsonb_typeof(coalesce(p_temario->'items', '[]'::jsonb)) <> 'array' THEN NULL
    WHEN coalesce(p_temario->'items', '[]'::jsonb) = '[]'::jsonb THEN NULL
    ELSE jsonb_build_object(
      'items',
      (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'tipo',
              CASE it->>'tipo'
                WHEN 'referencia' THEN 'referencia'
                WHEN 'observacion' THEN 'observacion'
                WHEN 'tarea'      THEN 'tarea'
                ELSE 'texto'
              END,
              'texto', left(coalesce(it->>'texto', ''), 500),
              'refs', CASE WHEN jsonb_typeof(it->'refs') = 'array'
                           THEN it->'refs'
                           ELSE '[]'::jsonb END
            )
            ORDER BY CASE WHEN (it->>'orden') ~ '^[0-9]+$'
                          THEN (it->>'orden')::integer ELSE 0 END
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(p_temario->'items') AS it
      )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.fb_temario_publicado(JSONB) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. Vista autenticada del alumno (/tomar/:id): cuerpo idéntico al de 047
--    con la única añadurura de la clave `temario`.
-- ----------------------------------------------------------------------------
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
    'portada', e.portada, 'config', e.config, 'version', e.version,
    'temario', public.fb_temario_publicado(e.temario)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Página pública /e/<token>: cuerpo idéntico al de 063 con la clave
--    `temario` (el token ya da acceso al examen, y el servidor solo entrega
--    el temario publicado y con la bandera activa).
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
    'puntos_totales', coalesce(e.puntos_totales, 0),
    'temario', public.fb_temario_publicado(e.temario)
  );
END;
$$;

SELECT '✅ Migración 079 aplicada: temario publicado visible para el alumno' AS mensaje;
