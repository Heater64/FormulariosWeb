-- Migración 009: Evaluaciones (períodos académicos) que agrupan exámenes
-- Una evaluación contiene varios exámenes; la nota media se calcula por alumno
-- a partir de las notas registradas en los exámenes de esa evaluación.

CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  creado_por UUID REFERENCES perfiles(id),
  titulo TEXT NOT NULL,
  asignatura TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE examenes_personalizados
  ADD COLUMN IF NOT EXISTS evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_examenes_evaluacion ON examenes_personalizados(evaluacion_id);

-- El proyecto NO usa RLS en las demás tablas: funcionan con los privilegios
-- que Supabase otorga por defecto al rol anon. Para que evaluaciones se comporte
-- igual, nos aseguramos de que RLS esté desactivado y de otorgar acceso al rol anon
-- (necesario si la tabla se creó desde el editor visual de Supabase, que no lo hace).
ALTER TABLE evaluaciones DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_anon_evaluaciones" ON evaluaciones;

GRANT ALL ON TABLE evaluaciones TO anon;
GRANT ALL ON TABLE evaluaciones TO authenticated;
