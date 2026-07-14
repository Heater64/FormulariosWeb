-- ============================================================
-- MIGRACIÓN 011: Agregar columna foto_perfil a perfiles
-- ============================================================
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
