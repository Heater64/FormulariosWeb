-- ============================================================
-- Migración 024: Notas personales (bloc de notas estilo Xiaomi/Apple Notes)
-- ============================================================
-- Crea una tabla independiente para las notas personales de cada usuario:
-- sin estructura de libro/capítulo, con soporte de papelera, color de
-- fondo, fijación y ordenación por última modificación.
--
-- La tabla legacy `notas_capitulo` se mantiene para las notas de sesión
-- de estudio (tipo='sesion') que usa vista-sesion-estudio.

CREATE TABLE IF NOT EXISTS notas_personales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  fijada BOOLEAN NOT NULL DEFAULT FALSE,
  en_papelera BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada_en TIMESTAMPTZ,
  color_fondo TEXT NOT NULL DEFAULT 'blanco',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_personales_usuario ON notas_personales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notas_personales_papelera ON notas_personales(usuario_id, en_papelera);
CREATE INDEX IF NOT EXISTS idx_notas_personales_actualizado ON notas_personales(usuario_id, actualizado_en DESC);

-- La tabla notas_capitulo tiene RLS deshabilitado (migración 015) y la app
-- usa autenticación custom (anon). Mantenemos el mismo criterio para que la
-- capa de datos funcione igual en toda la app.
ALTER TABLE notas_personales DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE notas_personales TO anon;
GRANT ALL ON TABLE notas_personales TO authenticated;
