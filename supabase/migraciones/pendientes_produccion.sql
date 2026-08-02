-- ============================================================================
-- FormsBiblicos — MIGRACIONES PENDIENTES DE PRODUCCIÓN (script consolidado)
-- ============================================================================
--
-- CÓMO USAR:
--   1. Abre el SQL Editor del dashboard de Supabase (proyecto josxcvncescqqlajahkh).
--   2. Pega TODO este archivo y ejecuta (Run).
--   3. Opcional: vuelve a ejecutarlo — es 100% idempotente gracias a
--      IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- QUÉ INCLUYE (verificado contra la BD de producción el 2026-08-02):
--   • 016  Campos de seguimiento de memorización  → respaldo (ya aplicada, inofensiva)
--   • 018  Tabla `sugerencias` (perfil + panel owner) → aplicada
--   • 019  Columnas `fijada` y `pendiente_sync` en notas_capitulo → aplicada
--   • 020  Tabla `configuracion` (clave-valor, panel owner) → aplicada
--   • 021  Tablas/columnas de mazos de memorización → aplicada
--   • 022  Tabla `backups` (panel Owner, Sistema) → NUEVA
--   • 023  Memorización tipo juego (mazos globales + progreso individual) → NUEVA
--   • 024  Tabla `notas_personales` (bloc de notas) → NUEVA
--
-- NOTA: las columnas `estado`, `proxima_revision` y `efectividad` de
-- tarjetas_memorizacion NO se incluyen porque la app no las usa (la derivación
-- del estado de aprendizaje se hace en cliente con estadoAprendizaje()).
--
-- ============================================================================
-- MIGRACIÓN 016 — Campos de seguimiento de memorización (respaldo idempotente)
-- ============================================================================

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mejor_racha INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS veces_olvidado INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultima_calificacion INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultimo_repaso TIMESTAMPTZ;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS racha_actual INTEGER DEFAULT 0;

-- ============================================================================
-- MIGRACIÓN 018 — Sugerencias de los usuarios
-- Los usuarios envían comentarios (errores, ideas, mejoras) desde su perfil y
-- ven el estado de cada una. Solo el Owner las gestiona en su panel.
-- ============================================================================

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

-- RLS: el proyecto usa autenticación custom (anon). Políticas abiertas para anon.
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON sugerencias;
CREATE POLICY "sugerencias_anon_all" ON sugerencias FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE sugerencias TO anon;
GRANT ALL ON TABLE sugerencias TO authenticated;

-- ============================================================================
-- MIGRACIÓN 019 — Mejoras de notas (columnas que faltan en producción)
-- El repositorio (js/datos/notas-repository.js) ya usa `tipo`, `titulo` y
-- `pendiente_sync`; `tipo` y `titulo` ya existen, faltan `fijada` y
-- `pendiente_sync`. Sin ellas: listar() fallaba (42703) y guardar() caía al caché.
-- ============================================================================

ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'personal';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS pendiente_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS fijada BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notas_usuario_tipo ON notas_capitulo(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notas_usuario_fijada ON notas_capitulo(usuario_id, fijada);

-- ============================================================================
-- MIGRACIÓN 020 — Configuración global (clave-valor)
-- Almacena ajustes del sistema gestionados desde el panel de propietario.
-- Con esta tabla, admin-repository deja de usar try/catch defensivos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- RLS: abierta para anon (autenticación custom).
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON configuracion;
CREATE POLICY "configuracion_anon_all" ON configuracion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE configuracion TO anon;
GRANT ALL ON TABLE configuracion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 021 — Mazos de memorización (flashcards tipo Anki)
-- Organiza las tarjetas en mazos. Cada tarjeta pertenece a un solo mazo
-- (mazo_id). Soporta versículos bíblicos y tarjetas libres (tipo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS mazos_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mazos_usuario ON mazos_memorizacion(usuario_id);

-- Cada tarjeta pertenece a un mazo. Si el mazo se borra, la tarjeta pasa a
-- "Sin mazo" (ON DELETE SET NULL) en lugar de perderse.
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'versiculo' CHECK (tipo IN ('versiculo', 'libre'));
CREATE INDEX IF NOT EXISTS idx_tarjetas_mazo ON tarjetas_memorizacion(mazo_id);

-- RLS: abierta para anon (autenticación custom).
ALTER TABLE mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON mazos_memorizacion;
CREATE POLICY "mazos_anon_all" ON mazos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE mazos_memorizacion TO anon;
GRANT ALL ON TABLE mazos_memorizacion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 022 — Panel de Administración: tabla backups
-- Snapshots JSON de la base creados desde la pestaña Sistema del panel Owner.
-- ============================================================================

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tamano_bytes INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'fallido')),
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_creado ON backups(creado_en DESC);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON backups;
CREATE POLICY "backups_anon_all" ON backups FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE backups TO anon;
GRANT ALL ON TABLE backups TO authenticated;

-- ============================================================================
-- MIGRACIÓN 023 — Memorización tipo juego (estilo Duolingo)
-- Mazos/tarjetas GLOBALES + progreso individual (SM-2) + tipos de ejercicio.
-- ============================================================================

-- 1. MAZOS: contenido global
ALTER TABLE mazos_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'layers';
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- 2. TARJETAS: contenido global + tipos de ejercicio
ALTER TABLE tarjetas_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS explicacion TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS libro TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS capitulo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS versiculo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS opciones JSONB DEFAULT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

ALTER TABLE tarjetas_memorizacion DROP CONSTRAINT IF EXISTS tarjetas_memorizacion_tipo_check;
ALTER TABLE tarjetas_memorizacion ADD CONSTRAINT tarjetas_memorizacion_tipo_check
  CHECK (tipo IN (
    'versiculo', 'libre', 'completar', 'ordenar', 'elegir_versiculo',
    'verdadero_falso', 'relacionar', 'escrita', 'personaje', 'lugar',
    'libro', 'cronologia', 'multirrespuesta'
  ));

CREATE INDEX IF NOT EXISTS idx_tarjetas_orden ON tarjetas_memorizacion(mazo_id, orden);

-- 3. PROGRESO INDIVIDUAL (SM-2 + nivel por usuario)
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

-- 4. REPASOS: registrar quién repasa
ALTER TABLE repasos_memorizacion ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_repasos_usuario ON repasos_memorizacion(usuario_id);

ALTER TABLE progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_anon_all" ON progreso_tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO anon;
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 024 — Notas personales (bloc de notas estilo Xiaomi/Apple Notes)
-- Tabla independiente de libro/capítulo con papelera, color de fondo y fijación.
-- La tabla legacy `notas_capitulo` se mantiene para las notas de sesión de estudio.
-- ============================================================================

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

ALTER TABLE notas_personales DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE notas_personales TO anon;
GRANT ALL ON TABLE notas_personales TO authenticated;

-- ============================================================================
-- VERIFICACIÓN OPCIONAL (descomenta para comprobar que todo quedó aplicado):
-- ============================================================================
-- SELECT 'sugerencias' AS tabla, count(*) FROM sugerencias
-- UNION ALL SELECT 'configuracion', count(*) FROM configuracion
-- UNION ALL SELECT 'mazos_memorizacion', count(*) FROM mazos_memorizacion
-- UNION ALL SELECT 'backups', count(*) FROM backups
-- UNION ALL SELECT 'progreso_tarjetas_memorizacion', count(*) FROM progreso_tarjetas_memorizacion
-- UNION ALL SELECT 'notas_personales', count(*) FROM notas_personales;
