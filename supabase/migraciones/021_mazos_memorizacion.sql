-- ============================================================
-- Migración 021: Mazos de memorización (flashcards tipo Anki)
-- Organiza las tarjetas en mazos. Cada tarjeta pertenece a un
-- solo mazo (mazo_id). Soporta versículos bíblicos y tarjetas
-- libres (pregunta/respuesta) mediante el campo tipo.
-- ============================================================

CREATE TABLE IF NOT EXISTS mazos_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mazos_usuario ON mazos_memorizacion(usuario_id);

-- Cada tarjeta pertenece a un mazo. Si el mazo se borra, la
-- tarjeta pasa a "Sin mazo" (ON DELETE SET NULL) en lugar de
-- perderse.
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'versiculo' CHECK (tipo IN ('versiculo', 'libre'));
CREATE INDEX IF NOT EXISTS idx_tarjetas_mazo ON tarjetas_memorizacion(mazo_id);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON mazos_memorizacion;
CREATE POLICY "mazos_anon_all" ON mazos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE mazos_memorizacion TO anon;
GRANT ALL ON TABLE mazos_memorizacion TO authenticated;
