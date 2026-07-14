-- ============================================================
-- FormsBiblicos — Migración 001: Esquema Inicial
-- ============================================================

-- Extender UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: perfiles (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('owner', 'admin', 'editor', 'usuario')),
    activo BOOLEAN DEFAULT TRUE,
    grupo_id UUID,
    foto_perfil TEXT,
    preferencias JSONB DEFAULT '{"alto_contraste": false, "letra_grande": false}'::jsonb,
    ultimo_acceso TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: grupos (clases)
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    admin_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ADD CONSTRAINT fk_perfil_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL;

-- ============================================================
-- TABLA: miembros_grupo (relación muchos-a-muchos)
-- ============================================================
CREATE TABLE IF NOT EXISTS miembros_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    rol_en_grupo TEXT NOT NULL DEFAULT 'miembro' CHECK (rol_en_grupo IN ('admin', 'editor', 'miembro')),
    UNIQUE(grupo_id, usuario_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: libros_biblicos (catálogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS libros_biblicos (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    testamento TEXT NOT NULL CHECK (testamento IN ('antiguo', 'nuevo')),
    num_capitulos INTEGER NOT NULL,
    abreviatura TEXT
);

-- ============================================================
-- TABLA: capitulos
-- ============================================================
CREATE TABLE IF NOT EXISTS capitulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libro_id INTEGER NOT NULL REFERENCES libros_biblicos(id),
    numero INTEGER NOT NULL,
    UNIQUE(libro_id, numero)
);

-- ============================================================
-- TABLA: versiculos (texto bíblico)
-- ============================================================
CREATE TABLE IF NOT EXISTS versiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    texto TEXT NOT NULL,
    UNIQUE(capitulo_id, numero)
);

-- ============================================================
-- TABLA: progreso_lectura
-- ============================================================
CREATE TABLE IF NOT EXISTS progreso_lectura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    leido BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMPTZ,
    tiempo_segundos INTEGER DEFAULT 0,
    completado BOOLEAN DEFAULT FALSE,
    UNIQUE(usuario_id, capitulo_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: preguntas_sistema (Mundo 1: Estudio Guiado)
-- ============================================================
CREATE TABLE IF NOT EXISTS preguntas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    creado_por UUID REFERENCES perfiles(id),
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('multiple', 'verdadero_falso', 'respuesta_corta', 'completar')),
    opciones JSONB,
    respuesta_correcta TEXT NOT NULL,
    explicacion TEXT DEFAULT '',
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: examenes_personalizados (Mundo 2: Exámenes del Profesor)
-- ============================================================
CREATE TABLE IF NOT EXISTS examenes_personalizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    creado_por UUID NOT NULL REFERENCES perfiles(id),
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    referencia_biblica JSONB,
    preguntas JSONB NOT NULL,
    puntos_totales INTEGER DEFAULT 0,
    fecha_limite TIMESTAMPTZ,
    estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'cerrado', 'archivado')),
    publicado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: intentos_examen_personalizado
-- ============================================================
CREATE TABLE IF NOT EXISTS intentos_examen_personalizado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID NOT NULL REFERENCES examenes_personalizados(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES perfiles(id),
    respuestas JSONB,
    puntuacion DECIMAL(5,2),
    nota DECIMAL(5,2),
    corregido BOOLEAN DEFAULT FALSE,
    corregido_por UUID REFERENCES perfiles(id),
    observaciones TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'calificado')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_completado TIMESTAMPTZ,
    fecha_corregido TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: tarjetas_memorizacion
-- ============================================================
CREATE TABLE IF NOT EXISTS tarjetas_memorizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    versiculo_id UUID NOT NULL REFERENCES versiculos(id),
    repeticiones INTEGER DEFAULT 0,
    factor_facilidad DECIMAL(4,2) DEFAULT 2.50,
    intervalo INTEGER DEFAULT 0,
    proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: repasos_memorizacion (historial)
-- ============================================================
CREATE TABLE IF NOT EXISTS repasos_memorizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
    calidad INTEGER NOT NULL CHECK (calidad >= 0 AND calidad <= 5),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: logros
-- ============================================================
CREATE TABLE IF NOT EXISTS logros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    icono TEXT DEFAULT '🏆'
);

-- ============================================================
-- TABLA: logros_usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS logros_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    logro_id UUID NOT NULL REFERENCES logros(id),
    UNIQUE(usuario_id, logro_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: auditoria
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion TEXT NOT NULL,
    detalle TEXT DEFAULT '',
    actor_id UUID REFERENCES perfiles(id),
    grupo_id UUID REFERENCES grupos(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);
