-- ============================================================
-- Migración 018: Sugerencias de los usuarios
-- Los usuarios pueden enviar comentarios (errores, ideas de
-- contenido, mejoras) desde su perfil y ver el estado de cada
-- una. Solo el Owner gestiona el estado y puede responder.
-- ============================================================

CREATE TABLE IF NOT EXISTS sugerencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('error', 'idea', 'mejora', 'contenido', 'otro')),
  texto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'enviada'
    CHECK (estado IN ('enviada', 'en_revision', 'aceptada', 'implementada', 'rechazada')),
  respuesta TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_usuario ON sugerencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado ON sugerencias(estado);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON sugerencias;
CREATE POLICY "sugerencias_anon_all" ON sugerencias FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE sugerencias TO anon;
GRANT ALL ON TABLE sugerencias TO authenticated;
