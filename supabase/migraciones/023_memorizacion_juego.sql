-- ============================================================
-- Migración 023: Memorización tipo juego (estilo Duolingo)
-- ------------------------------------------------------------
-- Cambios:
--  1. mazos_memorizacion pasa a ser contenido GLOBAL (usuario_id
--     NULL = visible para todos; creado por admin). Se añaden
--     icono, orden, activo y es_global.
--  2. tarjetas_memorizacion pasa a ser contenido global: se quita
--     la obligación de usuario_id (NULL = tarjeta global) y se
--     amplía 'tipo' a los tipos de ejercicio del juego.
--     Se añaden: explicacion, categoria, libro, capitulo,
--     versiculo, opciones (JSONB), orden y creado_por.
--  3. Nueva tabla progreso_tarjetas_memorizacion: el progreso
--     (SM-2 + nivel) es INDIVIDUAL por usuario, separado del
--     contenido compartido.
--  4. repasos_memorizacion: se añade usuario_id para registrar
--     quién hizo cada repaso.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MAZOS: contenido global
-- ------------------------------------------------------------
ALTER TABLE mazos_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'layers';
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 2. TARJETAS: contenido global + tipos de ejercicio
-- ------------------------------------------------------------
-- usuario_id pasa a ser opcional (NULL = tarjeta global)
ALTER TABLE tarjetas_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

-- Nuevos campos de contenido enriquecido
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS explicacion TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS libro TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS capitulo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS versiculo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS opciones JSONB DEFAULT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- Ampliar el tipo de tarjeta (reemplazar el CHECK anterior)
ALTER TABLE tarjetas_memorizacion DROP CONSTRAINT IF EXISTS tarjetas_memorizacion_tipo_check;
ALTER TABLE tarjetas_memorizacion ADD CONSTRAINT tarjetas_memorizacion_tipo_check
  CHECK (tipo IN (
    'versiculo',          -- contenido bíblico: se juega como completar/ordenar/elegir
    'libre',              -- tarjeta libre pregunta/respuesta (legacy)
    'completar',          -- completar palabras
    'ordenar',            -- ordenar palabras
    'elegir_versiculo',   -- elegir el versículo correcto dada la referencia
    'verdadero_falso',    -- verdadero o falso
    'relacionar',         -- emparejar pares
    'escrita',            -- respuesta escrita
    'personaje',          -- ¿quién...?
    'lugar',              -- ¿dónde...?
    'libro',              -- ¿en qué libro...?
    'cronologia',         -- ordenar acontecimientos
    'multirrespuesta'     -- seleccionar varias respuestas
  ));

CREATE INDEX IF NOT EXISTS idx_tarjetas_orden ON tarjetas_memorizacion(mazo_id, orden);

-- ------------------------------------------------------------
-- 3. PROGRESO INDIVIDUAL (SM-2 + nivel por usuario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progreso_tarjetas_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
  repeticiones INTEGER DEFAULT 0,
  factor_facilidad DECIMAL(4,2) DEFAULT 2.50,
  intervalo INTEGER DEFAULT 0,
  proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
  ultimo_repaso TIMESTAMPTZ,
  racha_actual INTEGER DEFAULT 0,
  mejor_racha INTEGER DEFAULT 0,
  veces_olvidado INTEGER DEFAULT 0,
  ultima_calificacion INTEGER,
  nivel TEXT DEFAULT 'nueva' CHECK (nivel IN ('nueva', 'aprendiendo', 'dominada', 'perfecta')),
  UNIQUE(usuario_id, tarjeta_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progreso_tarjeta ON progreso_tarjetas_memorizacion(tarjeta_id);
CREATE INDEX IF NOT EXISTS idx_progreso_usuario ON progreso_tarjetas_memorizacion(usuario_id);

-- ------------------------------------------------------------
-- 4. REPASOS: registrar quién repasa
-- ------------------------------------------------------------
ALTER TABLE repasos_memorizacion ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_repasos_usuario ON repasos_memorizacion(usuario_id);

-- ------------------------------------------------------------
-- RLS: el proyecto usa autenticación custom (anon). Políticas
-- abiertas para anon, siguiendo el patrón de 002_anon_custom_auth.sql
-- ------------------------------------------------------------
ALTER TABLE progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_anon_all" ON progreso_tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO anon;
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO authenticated;

-- Migrar datos existentes: las tarjetas personales de los usuarios
-- pasan a tener mazo_id NULL (Sin mazo) para no mezclarlas con los
-- mazos globales. Su progreso SM-2 se conserva en las propias filas
-- (legacy); el nuevo progreso se creará bajo demanda.
