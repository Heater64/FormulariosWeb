-- ============================================================
-- Migración 020: Tabla de configuración global (clave-valor)
-- Almacena ajustes del sistema gestionados desde el panel de
-- propietario (configuracion global). Con esta tabla creada,
-- admin-repository puede dejar de usar try/catch defensivos.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON configuracion;
CREATE POLICY "configuracion_anon_all" ON configuracion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE configuracion TO anon;
GRANT ALL ON TABLE configuracion TO authenticated;
