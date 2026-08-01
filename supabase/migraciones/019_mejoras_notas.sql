-- ============================================================
-- Migración 019: Mejoras de notas
-- 1) Columnas que el repositorio (js/datos/notas-repository.js)
--    ya usa pero no existían: tipo, titulo, pendiente_sync.
--    Sin ellas, el guardado online de notas falla y cae al caché.
-- 2) Nueva columna fijada: notas fijadas/pinned arriba de la lista.
-- ============================================================

ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'personal';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS pendiente_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS fijada BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notas_usuario_tipo ON notas_capitulo(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notas_usuario_fijada ON notas_capitulo(usuario_id, fijada);
