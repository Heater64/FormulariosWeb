-- ============================================================
--  FormsBiblicos - Esquema de base de datos (Supabase / PostgreSQL)
--  Aplica este script en el SQL Editor de tu proyecto Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- ELIMINAR TABLAS SI EXISTEN (para empezar de cero)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS evaluation_grades CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS editor_requests CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- TABLA: users (roles demo: owner / admin / editor / usuario)
-- ------------------------------------------------------------
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'usuario',
    clase_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    configuracion JSONB DEFAULT '{}'::jsonb,
    organization JSONB DEFAULT '{"favorites":[],"archived":[],"deleted":[]}'::jsonb,
    progress JSONB DEFAULT '{"studiedChapters":[]}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ultimo_acceso TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- TABLA: forms
-- ------------------------------------------------------------
CREATE TABLE forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    allowmultiple BOOLEAN DEFAULT FALSE,
    showanswers BOOLEAN DEFAULT FALSE,
    config JSONB DEFAULT '{}'::jsonb,
    exam_type TEXT DEFAULT 'libre' CHECK (exam_type IN ('oficial', 'libre')),
    evaluation_id UUID,
    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'preparado', 'publicado', 'cerrado', 'archivado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: responses
-- ------------------------------------------------------------
CREATE TABLE responses (
    id TEXT PRIMARY KEY,
    form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    correction JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: audit_logs (registro de acciones del Owner)
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion TEXT NOT NULL,
    detalle TEXT,
    actor TEXT,
    clase_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: editor_requests (solicitudes para ser Editor)
-- ------------------------------------------------------------
CREATE TABLE editor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id TEXT NOT NULL,
    usuario_nombre TEXT,
    clase_id TEXT,
    motivo TEXT,
    experiencia TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: notificaciones (mensajes a usuarios/admins)
-- ------------------------------------------------------------
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario TEXT NOT NULL,
    titulo TEXT,
    mensaje TEXT,
    tipo TEXT DEFAULT 'info',
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: evaluations (evaluaciones/trimestres)
-- ------------------------------------------------------------
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clase_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: evaluation_grades (notas manuales del admin)
-- ------------------------------------------------------------
CREATE TABLE evaluation_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    grade NUMERIC(4,2) NOT NULL CHECK (grade >= 0 AND grade <= 10),
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms (slug);
CREATE INDEX IF NOT EXISTS idx_forms_evaluation_id ON forms (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses (form_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_clase ON users (clase_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_clase ON audit_logs (clase_id);
CREATE INDEX IF NOT EXISTS idx_editor_requests_estado ON editor_requests (estado);
CREATE INDEX IF NOT EXISTS idx_editor_requests_clase ON editor_requests (clase_id);
CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones (destinatario);
CREATE INDEX IF NOT EXISTS idx_notif_leida ON notificaciones (leida);
CREATE INDEX IF NOT EXISTS idx_evaluations_clase ON evaluations (clase_id);
CREATE INDEX IF NOT EXISTS idx_eval_grades_evaluation ON evaluation_grades (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_grades_student ON evaluation_grades (student_id);

-- ------------------------------------------------------------
-- TABLA: study_history (historial de estudio bíblico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id),
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

-- ------------------------------------------------------------
-- FUNCIÓN Y TRIGGER: actualizar updated_at automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forms_updated_at ON forms;
CREATE TRIGGER trg_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_responses_updated_at ON responses;
CREATE TRIGGER trg_responses_updated_at
    BEFORE UPDATE ON responses
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_evaluation_grades_updated_at ON evaluation_grades;
CREATE TRIGGER trg_evaluation_grades_updated_at
    BEFORE UPDATE ON evaluation_grades
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - DESHABILITADO PARA DESARROLLO
-- ------------------------------------------------------------
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE editor_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_grades DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- DATOS INICIALES: USUARIOS POR DEFECTO
-- ------------------------------------------------------------
INSERT INTO users (id, username, full_name, password, role, clase_id) VALUES
('owner', 'owner', 'Propietario', 'owner123', 'owner', NULL),
('admin1', 'admin1', 'Admin Central', 'admin123', 'admin', 'clase_central'),
('alumno', 'alumno', 'Alumno Demo', 'alumno123', 'usuario', 'clase_central')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ------------------------------------------------------------
SELECT '✅ Base de datos creada correctamente' as mensaje;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT id, username, full_name, role FROM users;