-- ============================================================
-- Migración 006: Seguimiento de estudio completado (Modo Estudio)
-- ============================================================
-- Marca cuándo un capítulo ha superado TODO el proceso de estudio
-- (responder todas las preguntas, ver el resumen y corregir los
-- errores en el repaso), no solo haberse leído.

ALTER TABLE progreso_lectura ADD COLUMN IF NOT EXISTS estudio_completado BOOLEAN DEFAULT FALSE;
