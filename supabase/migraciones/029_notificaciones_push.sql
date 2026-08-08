-- ============================================================================
-- MIGRACIÓN 029: Notificaciones push Android — dispositivos y tokens FCM
-- ============================================================================
-- Objetivo: registrar los dispositivos Android (token FCM) de cada usuario
-- para que la Edge Function `enviar-push` (supabase/functions/enviar-push)
-- pueda entregar notificaciones nativas cuando la app está cerrada o en
-- segundo plano.
--
-- ARQUITECTURA (capa adicional sobre el historial `notificaciones`):
--
--   app (Capacitor) ── registra token ──▶ dispositivos_notificacion
--   app ── emite evento ──▶ notificaciones (historial in-app, ya existente)
--   app ── invoca enviar-push (JWT) ──▶ Edge Function ──▶ FCM ──▶ Android
--
-- La notificación push y la fila del historial representan el MISMO evento:
-- el payload de FCM lleva tipo/categoria/titulo/cuerpo/datos/url/notifId.
--
-- RLS: mismo estilo que la migración 028 (authenticated, solo filas propias
-- o el owner). La Edge Function lee con service_role (bypassa RLS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla de dispositivos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispositivos_notificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Usuario dueño del dispositivo (cascade: al borrar el perfil se borran
  -- sus tokens y deja de recibir push).
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  -- Token FCM único: si el mismo dispositivo se registra dos veces (p.ej.
  -- reinstalación), el upsert por token_fcm actualiza la fila en lugar de
  -- duplicarla.
  token_fcm TEXT NOT NULL UNIQUE,
  plataforma TEXT NOT NULL DEFAULT 'android' CHECK (plataforma IN ('android', 'ios', 'web')),
  activo BOOLEAN NOT NULL DEFAULT true,
  -- Último error FCM (p.ej. UNREGISTERED → el token dejó de ser válido).
  ultimo_error TEXT DEFAULT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultas habituales: tokens activos de un usuario / limpieza por usuario.
CREATE INDEX IF NOT EXISTS idx_dispositivos_usuario_activo
  ON public.dispositivos_notificacion(usuario_id, activo);

-- ----------------------------------------------------------------------------
-- 2) RLS (estilo 028: authenticated, solo lo propio; el owner puede todo)
-- ----------------------------------------------------------------------------
ALTER TABLE public.dispositivos_notificacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispositivos_lectura_propios" ON public.dispositivos_notificacion;
CREATE POLICY "dispositivos_lectura_propios"
  ON public.dispositivos_notificacion FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "dispositivos_insert_propios" ON public.dispositivos_notificacion;
CREATE POLICY "dispositivos_insert_propios"
  ON public.dispositivos_notificacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "dispositivos_actualiza_propios" ON public.dispositivos_notificacion;
CREATE POLICY "dispositivos_actualiza_propios"
  ON public.dispositivos_notificacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "dispositivos_borrado_propios" ON public.dispositivos_notificacion;
CREATE POLICY "dispositivos_borrado_propios"
  ON public.dispositivos_notificacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispositivos_notificacion TO authenticated;

SELECT '✅ Migración 029 aplicada: dispositivos_notificacion (tokens FCM)' AS mensaje;
