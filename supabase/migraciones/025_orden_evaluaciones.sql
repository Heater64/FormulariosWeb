-- Migración 025: Orden manual de evaluaciones
-- Permite reordenar las evaluaciones (cuál aparece primero) desde la vista Notas.

ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_orden ON evaluaciones(grupo_id, orden);
