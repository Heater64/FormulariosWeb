-- ============================================================
-- Migración 027: Notificaciones v2 — Centro de comunicaciones
-- ------------------------------------------------------------
-- Evoluciona la tabla `notificaciones` (creada en 024) hacia un
-- modelo con:
--   • categoría  (desafios, examenes, estudio, grupos, logros,
--                 sistema, anuncios) para filtros e iconografía
--   • prioridad  (critica, alta, media, baja)
--   • estado     ciclo de vida: nueva → vista → completada → archivada
--   • agrupación (agrupacion_clave + contador) para fusionar
--                 notificaciones similares (p.ej. "4 jugadores aceptaron")
--   • acciones   JSONB con acciones rápidas serializables
--   • emisor_id  quién originó el evento (opcional)
--
-- Todo el ALTER es idempotente (ADD COLUMN IF NOT EXISTS) para
-- poder aplicarse sobre bases que ya existen con el esquema 024.
-- ============================================================

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'sistema';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'media';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'nueva';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS agrupacion_clave TEXT DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS contador INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS acciones JSONB DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS emisor_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- Sincronizar filas legacy: marcar como 'vista' las que ya estaban leídas.
UPDATE notificaciones SET estado = 'vista' WHERE leida = TRUE AND estado = 'nueva';

-- Backfill de categoría y prioridad según el tipo legacy, para que las
-- filas preexistentes (creadas con el esquema 024) se clasifiquen bien
-- y no queden todas como 'sistema'/'media'.
UPDATE notificaciones SET
  categoria = CASE tipo
    WHEN 'desafio'          THEN 'desafios'
    WHEN 'desafio_aceptado' THEN 'desafios'
    WHEN 'grupo'            THEN 'grupos'
    WHEN 'examen_publicado' THEN 'examenes'
    WHEN 'examen_entregado' THEN 'examenes'
    WHEN 'examen_corregido' THEN 'examenes'
    WHEN 'mazo_nuevo'       THEN 'estudio'
    WHEN 'recordatorio'     THEN 'estudio'
    WHEN 'anuncio'          THEN 'anuncios'
    ELSE categoria
  END,
  prioridad = CASE tipo
    WHEN 'desafio'          THEN 'alta'
    WHEN 'desafio_aceptado' THEN 'media'
    WHEN 'grupo'            THEN 'media'
    WHEN 'examen_publicado' THEN 'alta'
    WHEN 'examen_entregado' THEN 'alta'
    WHEN 'examen_corregido' THEN 'alta'
    WHEN 'mazo_nuevo'       THEN 'media'
    WHEN 'recordatorio'     THEN 'media'
    WHEN 'anuncio'          THEN 'critica'
    ELSE prioridad
  END
WHERE tipo IS NOT NULL;

-- Constraints de dominio (idempotentes: se eliminan los CHECK previos
-- que restrinjan estas columnas y se crean los nuevos).
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%categoria%'
        OR pg_get_constraintdef(oid) ILIKE '%prioridad%'
        OR pg_get_constraintdef(oid) ILIKE '%estado%')
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_categoria_check
  CHECK (categoria IN ('desafios', 'examenes', 'estudio', 'grupos', 'logros', 'sistema', 'anuncios'));
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_prioridad_check
  CHECK (prioridad IN ('critica', 'alta', 'media', 'baja'));
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_estado_check
  CHECK (estado IN ('nueva', 'vista', 'completada', 'archivada'));

-- Índices de lectura del centro de notificaciones
CREATE INDEX IF NOT EXISTS idx_notif_usuario_estado ON notificaciones(usuario_id, estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notif_agrupacion ON notificaciones(agrupacion_clave) WHERE agrupacion_clave IS NOT NULL;
DROP INDEX IF EXISTS idx_notificaciones_no_leidas;
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(usuario_id) WHERE leida = FALSE;

-- RLS: mismas políticas abiertas que el resto del proyecto (auth custom anon)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON notificaciones;
CREATE POLICY "notificaciones_anon_all" ON notificaciones FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones TO anon;

SELECT '✅ Migración 027 aplicada: notificaciones v2 (categorías, prioridades, estado, agrupación)' AS mensaje;
