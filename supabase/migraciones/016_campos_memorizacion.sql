-- ============================================================
-- FormsBiblicos — Migración 016: Campos de seguimiento memorización
-- Añade campos de progreso y reemplaza cálculo de nivel por
-- derivación automática desde el intervalo.
-- ============================================================

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mejor_racha INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS veces_olvidado INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultima_calificacion INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultimo_repaso TIMESTAMPTZ;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS racha_actual INTEGER DEFAULT 0;
