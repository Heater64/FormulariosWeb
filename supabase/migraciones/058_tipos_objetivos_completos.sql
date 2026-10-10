-- ============================================================================
-- 058_tipos_objetivos_completos.sql
-- ----------------------------------------------------------------------------
-- fb_tipo_objetivo decidía qué preguntas puntúa el servidor solo, pero solo
-- conocía los tres tipos de test clásicos (multiple, opcion_unica,
-- verdadero_falso). Con el editor habilitando varias_opciones, completar,
-- relacionar y ordenar, fb_preguntas_pendientes contaba esas entregas como
-- "pendientes de corrección" aunque fb_respuesta_correcta ya las puntúa sola.
--
-- Se amplía la lista al mismo conjunto que puntúan fb_calcular_puntuacion /
-- fb_respuesta_correcta. Solo la usa fb_preguntas_pendientes, así que el único
-- efecto es que pendientes_correccion cuenta únicamente las preguntas que
-- realmente decide el profesor (respuesta_corta y texto_largo).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fb_tipo_objetivo(p_tipo TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT lower(coalesce(p_tipo, '')) IN (
    'multiple', 'opcion_unica', 'verdadero_falso',
    'varias_opciones', 'completar', 'relacionar', 'ordenar'
  );
$$;
REVOKE ALL ON FUNCTION public.fb_tipo_objetivo(TEXT) FROM PUBLIC, anon, authenticated;
