-- ============================================================
-- FormsBiblicos — Migración 007: Memorización manual de versículos
-- Permite crear tarjetas de memorización sin depender de un
-- versículo del catálogo (el usuario estudia en Biblia física).
-- ============================================================

ALTER TABLE tarjetas_memorizacion ALTER COLUMN versiculo_id DROP NOT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS referencia TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS texto TEXT DEFAULT '';
