-- ============================================================================
-- MIGRACIÓN 071: Web Push para la PWA — suscripciones de navegador
-- ============================================================================
-- Objetivo: guardar la suscripción Web Push (endpoint + claves) de cada
-- navegador en el que el usuario, con sesión iniciada y de forma voluntaria,
-- ha activado los avisos. La Edge Function `enviar-push` lee esta tabla con
-- service_role y entrega el aviso aunque la PWA esté cerrada.
--
-- Es un canal ADICIONAL a dispositivos_notificacion (FCM, Android nativo):
-- la PWA no tiene token FCM, así que no encaja en esa tabla.
--
-- RLS: mismo estilo que la migración 029 (authenticated, solo filas propias
-- o el owner). Nunca se expone a anon.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla de suscripciones web
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suscripciones_web_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Usuario dueño de la suscripción (cascade: al borrar el perfil se borra).
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  -- Endpoint del servicio push del navegador: único por suscripción. Si el
  -- mismo navegador se vuelve a suscribir, el upsert actualiza la fila.
  endpoint TEXT NOT NULL UNIQUE,
  -- Claves de cifrado de la suscripción (RFC 8291).
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  -- Último error de entrega (p.ej. 410 Gone → la suscripción caducó).
  ultimo_error TEXT DEFAULT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_web_usuario_activo
  ON public.suscripciones_web_push(usuario_id, activo);

-- ----------------------------------------------------------------------------
-- 2) RLS (estilo 029: authenticated, solo lo propio; el owner puede todo)
-- ----------------------------------------------------------------------------
ALTER TABLE public.suscripciones_web_push ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suscripciones_web_lectura_propias" ON public.suscripciones_web_push;
CREATE POLICY "suscripciones_web_lectura_propias"
  ON public.suscripciones_web_push FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "suscripciones_web_insert_propias" ON public.suscripciones_web_push;
CREATE POLICY "suscripciones_web_insert_propias"
  ON public.suscripciones_web_push FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "suscripciones_web_actualiza_propias" ON public.suscripciones_web_push;
CREATE POLICY "suscripciones_web_actualiza_propias"
  ON public.suscripciones_web_push FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "suscripciones_web_borrado_propias" ON public.suscripciones_web_push;
CREATE POLICY "suscripciones_web_borrado_propias"
  ON public.suscripciones_web_push FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suscripciones_web_push TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) RPC de registro. Un mismo navegador puede cambiar de cuenta: el endpoint
--    ya existe con otro usuario (que la app desactivó al cerrar sesión). Con
--    el upsert normal, RLS impediría reasignarlo; por eso la reasignación va
--    en esta función, que solo puede asignar la suscripción al usuario actual.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_suscripcion_web(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida'; END IF;
  IF p_endpoint IS NULL OR length(p_endpoint) = 0 OR length(p_endpoint) > 2048 THEN
    RAISE EXCEPTION 'Endpoint no válido';
  END IF;
  IF p_p256dh IS NULL OR p_auth IS NULL THEN RAISE EXCEPTION 'Claves no válidas'; END IF;

  INSERT INTO public.suscripciones_web_push (usuario_id, endpoint, p256dh, auth, activo, ultimo_error, ultima_actividad)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, true, NULL, now())
  ON CONFLICT (endpoint) DO UPDATE SET
    usuario_id = EXCLUDED.usuario_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    activo = true,
    ultimo_error = NULL,
    ultima_actividad = now();
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_suscripcion_web(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_suscripcion_web(TEXT, TEXT, TEXT) TO authenticated;

SELECT '✅ Migración 071 aplicada: suscripciones_web_push (Web Push PWA)' AS mensaje;
