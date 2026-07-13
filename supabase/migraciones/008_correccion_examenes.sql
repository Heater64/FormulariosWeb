-- ============================================================
-- FormsBiblicos — Migración 008: Corrección por pregunta
-- Soporte para corrección manual detallada de cada respuesta
-- (preguntas de respuesta libre, puntos parciales y comentarios
-- por pregunta). Se almacena como JSONB en el intento.
-- ============================================================

ALTER TABLE intentos_examen_personalizado
  ADD COLUMN IF NOT EXISTS correccion JSONB DEFAULT '{}'::jsonb;
