-- ============================================================
-- Migración 024: Grupos públicos + Desafíos de memorización
-- ------------------------------------------------------------
-- Cambios:
--  1. grupos: imagen del grupo (opcional) para el directorio público.
--  2. perfiles: biografia (opcional) para el perfil rápido.
--  3. Nueva tabla notificaciones: feed in-app (invitaciones a desafíos).
--  4. Nueva tabla desafios: sesión de desafío (snapshot idéntico para
--     todos los participantes) + estado y sincronización por polling.
--  5. Nueva tabla desafio_participantes: estado por jugador, puntuación
--     y tiempo.
--
-- RLS: el proyecto usa autenticación custom (anon). Políticas abiertas
-- para anon, igual que el resto de tablas (ver 002_anon_custom_auth.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 1. GRUPOS: imagen opcional
-- ------------------------------------------------------------
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS imagen TEXT DEFAULT NULL;

-- ------------------------------------------------------------
-- 2. PERFILES: biografía opcional
-- ------------------------------------------------------------
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS biografia TEXT DEFAULT '';

-- ------------------------------------------------------------
-- 3. NOTIFICACIONES (feed in-app)
-- ------------------------------------------------------------
-- La tabla puede EXISTIR YA en producción con un esquema antiguo
-- (mensaje/created_at en vez de cuerpo/creado_en y sin usuario_id).
-- Por eso no basta con CREATE TABLE IF NOT EXISTS: además se añaden
-- con ALTER TABLE las columnas que falten para que la migración sea
-- idempotente y no falle con 'column usuario_id does not exist'.
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'info'  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo')),
  titulo TEXT NOT NULL DEFAULT '',
  cuerpo TEXT DEFAULT '',
  datos JSONB DEFAULT NULL,
  leida BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas en tablas preexistentes (idempotente)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'info';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS cuerpo TEXT DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida BOOLEAN DEFAULT FALSE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

-- Asegurar que el CHECK de tipo acepta 'desafio' (una tabla antigua
-- podría tener un CHECK con otro nombre o más restrictivo que
-- bloquearía las inserciones). Eliminamos cualquier CHECK que haga
-- referencia a la columna tipo y creamos el nuestro.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check 
  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo', 'anuncio'));

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(usuario_id) WHERE leida = FALSE;

-- ------------------------------------------------------------
-- 4. DESAFIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creador_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL,
  mazo_nombre TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'invitacion'
    CHECK (estado IN ('invitacion', 'en_curso', 'finalizado', 'expirado', 'cancelado')),
  sesion JSONB DEFAULT NULL,
  tiempo_limite_seg INTEGER DEFAULT 120,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  iniciado_en TIMESTAMPTZ,
  finalizado_en TIMESTAMPTZ,
  expira_en TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_desafios_estado ON desafios(estado, expira_en);

-- ------------------------------------------------------------
-- 5. DESAFIO_PARTICIPANTES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desafio_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id UUID NOT NULL REFERENCES desafios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'invitado'
    CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'en_juego', 'terminado', 'abandonado')),
  correctas INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  tiempo_ms INTEGER DEFAULT NULL,
  orden INTEGER DEFAULT 0,
  UNIQUE(desafio_id, usuario_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dp_desafio ON desafio_participantes(desafio_id);
CREATE INDEX IF NOT EXISTS idx_dp_usuario ON desafio_participantes(usuario_id);

-- ------------------------------------------------------------
-- RLS (auth custom → políticas abiertas para anon)
-- ------------------------------------------------------------
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON notificaciones;
CREATE POLICY "notificaciones_anon_all" ON notificaciones FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON desafios;
CREATE POLICY "desafios_anon_all" ON desafios FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON desafio_participantes;
CREATE POLICY "desafio_participantes_anon_all" ON desafio_participantes FOR ALL TO anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- Grants explícitos (las tablas nuevas no heredan GRANT ON ALL TABLES
-- emitido en migraciones anteriores)
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones, desafios, desafio_participantes TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

SELECT '✅ Migración 024 aplicada: grupos públicos + desafíos' AS mensaje;
