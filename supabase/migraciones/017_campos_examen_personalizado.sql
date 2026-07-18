-- ============================================================================
-- FormsBiblicos — Migración 017: Campos del Editor de Exámenes
-- ============================================================================
--
-- MOTIVO: el editor de exámenes (`vista-examen-editor.js`) envía al upsert de
-- `examenes_personalizados` los campos `materia`, `tema`, `profesor`, `color`,
-- `icono`, `portada` y `config` (objeto JSON con modo/fechas/intentos, etc).
-- Estos campos pertenecen al editor avanzado estilo Google Forms pero NUNCA
-- fueron añadidos al schema inicial (001), por lo que PostgREST responde con:
--   "Could not find the 'color' column of 'examenes_personalizados' in the schema cache"
--
-- Esta migración añade TODAS las columnas faltantes usando `ADD COLUMN IF NOT
-- EXISTS` (operación idempotente: aplicar varias veces no rompe nada).
--
-- CÓMO APLICAR: pegar el contenido de este archivo en el SQL editor del
-- dashboard de Supabase y ejecutar. La operación es segura porque todas las
-- columnas tienen DEFAULT, así que las filas existentes reciben valores
-- sensatos sin tocar nada.
-- ============================================================================

ALTER TABLE examenes_personalizados
  ADD COLUMN IF NOT EXISTS materia   TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS tema      TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS profesor  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS color     TEXT    DEFAULT '#673ab7',
  ADD COLUMN IF NOT EXISTS icono     TEXT    DEFAULT '📘',
  ADD COLUMN IF NOT EXISTS portada   TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS config    JSONB   DEFAULT '{}'::jsonb;

-- Documentación inline de cada nuevo campo (visible en psql \d+ y en el
-- dashboard de Supabase como comentario de columna).
COMMENT ON COLUMN examenes_personalizados.materia  IS 'Materia o asignatura del examen (ej: Historia de la Iglesia)';
COMMENT ON COLUMN examenes_personalizados.tema     IS 'Tema específico dentro de la materia (ej: Hechos 1-12)';
COMMENT ON COLUMN examenes_personalizados.profesor IS 'Nombre del profesor que crea el examen (mostrado al alumno)';
COMMENT ON COLUMN examenes_personalizados.color    IS 'Color hex del tema en formato #RRGGBB (editor visual)';
COMMENT ON COLUMN examenes_personalizados.icono    IS 'Emoji representativo del examen (selector en info general)';
COMMENT ON COLUMN examenes_personalizados.portada  IS 'URL opcional de imagen de portada del examen';
COMMENT ON COLUMN examenes_personalizados.config   IS 'Configuración JSON del examen (modo, fechas inicio/fin, intentos, temporizador, navegación, corrección, resultados visibles, seguridad, etc)';

COMMENT ON TABLE examenes_personalizados IS
  'Exámenes personalizados creados por profesores/admin/owner. Incluye metadatos del editor (materia, tema, profesor, color, icono, portada) y configuración JSON. Esquema original 001 + extensión 009 (evaluacion_id) + extensión 017 (editor avanzado).';

-- ============================================================================
-- Notas operativas
-- ============================================================================
-- 1. ¿Por qué no uso una migración con CREATE TABLE nueva y renombrar?
--    Sería invasivo: obligaría a copiar datos existentes y a actualizar todas
--    las referencias (FK, RLS, índices, triggers). Con ALTER ADD COLUMN IF NOT
--    EXISTS preservamos todo y añadimos sin riesgo.
--
-- 2. ¿Por qué config como JSONB y no como columnas separadas?
--    El editor construye el objeto `config` con UNKNOWN shape en cada pestaña
--    (modo, fechas, intentos, temporizador, navegación, corrección, etc).
--    Convertirlo a columnas requeriría una migración por cada nuevo toggle de
--    la app. JSONB es forward-compatible.
--
-- 3. Después de aplicar esta migración, los datos antiguos siguen completamente
--    accesibles: las nuevas columnas tienen defaults que no rompen lecturas
--    existentes (materia='', tema='', color='#673ab7', icono='📘', portada='',
--    config='{}').
-- ============================================================================
