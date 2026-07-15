CREATE TABLE IF NOT EXISTS notas_capitulo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  libro_nombre TEXT NOT NULL,
  capitulo_numero INTEGER NOT NULL,
  contenido TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notas_capitulo DISABLE ROW LEVEL SECURITY;
