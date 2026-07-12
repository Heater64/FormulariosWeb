-- ============================================================
--  REPARAR + MIGRAR ESTRUCTURA (pegar en Supabase → SQL Editor → Run)
--  Incluye: columnas faltantes, nuevas tablas, RLS, triggers.
--  Idempotente: se puede ejecutar varias veces.
-- ============================================================

-- 1) Añadir columnas a forms si no existen
ALTER TABLE forms ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'libre' CHECK (exam_type IN ('oficial', 'libre'));
ALTER TABLE forms ADD COLUMN IF NOT EXISTS evaluation_id UUID;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'preparado', 'publicado', 'cerrado', 'archivado'));

-- 2) Añadir columna progress a users si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{"studiedChapters":[]}'::jsonb;

-- 3) Crear tabla evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clase_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluations_clase ON evaluations (clase_id);

-- 4) Crear tabla evaluation_grades
CREATE TABLE IF NOT EXISTS evaluation_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    student_id TEXT,
    grade NUMERIC(4,2) NOT NULL CHECK (grade >= 0 AND grade <= 10),
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_grades_evaluation ON evaluation_grades (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_grades_student ON evaluation_grades (student_id);

-- 5) RLS en tablas existentes
ALTER TABLE forms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms_anon_all"     ON forms;
DROP POLICY IF EXISTS "responses_anon_all" ON responses;
DROP POLICY IF EXISTS "users_anon_all"     ON users;

CREATE POLICY "forms_anon_all"     ON forms     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "responses_anon_all" ON responses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "users_anon_all"     ON users     FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6) RLS en nuevas tablas
ALTER TABLE evaluations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evaluations_anon_all" ON evaluations;
CREATE POLICY "evaluations_anon_all" ON evaluations FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "eval_grades_anon_all" ON evaluation_grades;
CREATE POLICY "eval_grades_anon_all" ON evaluation_grades FOR ALL TO anon USING (true) WITH CHECK (true);

-- 7) Trigger para updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evaluation_grades_updated_at ON evaluation_grades;
CREATE TRIGGER trg_evaluation_grades_updated_at
    BEFORE UPDATE ON evaluation_grades
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 8) Garantizar privilegios del rol anon
GRANT SELECT, INSERT, UPDATE, DELETE ON forms             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON responses         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON evaluations       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON evaluation_grades TO anon;

-- 9) Crear tabla study_history
CREATE TABLE IF NOT EXISTS study_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    capitulo_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    respuestas JSONB DEFAULT NULL,
    aciertos INTEGER DEFAULT 0,
    total_preguntas INTEGER DEFAULT 0,
    tiempo_segundos INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_history_user ON study_history (user_id);
CREATE INDEX IF NOT EXISTS idx_study_history_fecha ON study_history (created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON study_history TO anon;
