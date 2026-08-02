-- ============================================================
-- Migración 022: Panel de Administración — Backups y sistema
-- Añade la tabla `backups` (snapshots JSON de la base de datos
-- creados desde el Centro de Administración) y utilidades de
-- soporte para las herramientas del Owner.
-- ============================================================

-- ============================================================
-- TABLA: backups (copias de seguridad del Owner)
-- Cada fila es un snapshot JSONB de perfiles/grupos/exámenes/
-- configuracion. Permite exportar, listar, eliminar y restaurar
-- copias desde la pestaña Sistema del panel de propietario.
-- ============================================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tamano_bytes INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'fallido')),
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_creado ON backups(creado_en DESC);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON backups;
CREATE POLICY "backups_anon_all" ON backups FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE backups TO anon;
GRANT ALL ON TABLE backups TO authenticated;

-- ============================================================
-- NOTA sobre modo mantenimiento:
-- Se guarda como clave-valor en la tabla `configuracion`
-- (clave 'modo_mantenimiento' = '1'/'0'), creada en la
-- migración 020. No requiere columnas nuevas.
-- ============================================================
