-- ============================================================================
-- MIGRACION 046: canal persistente de contacto
-- ============================================================================
-- La RPC permite recibir solicitudes desde la landing sin abrir la tabla a
-- anon. La lectura queda reservada a authenticated; el panel/soporte debe
-- consultar esta tabla desde un rol autorizado o una vista de administración.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contacto_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'en_proceso', 'resuelto', 'spam')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  atendido_en TIMESTAMPTZ,
  atendido_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contacto_mensajes_estado_fecha
  ON public.contacto_mensajes (estado, creado_en DESC);

ALTER TABLE public.contacto_mensajes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacto_lectura_owner" ON public.contacto_mensajes;
CREATE POLICY "contacto_lectura_owner"
  ON public.contacto_mensajes FOR SELECT TO authenticated
  USING (public.es_owner());

REVOKE ALL ON public.contacto_mensajes FROM anon, authenticated;
GRANT SELECT ON public.contacto_mensajes TO authenticated;

CREATE OR REPLACE FUNCTION public.enviar_contacto(
  p_nombre TEXT,
  p_email TEXT,
  p_mensaje TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre TEXT := btrim(coalesce(p_nombre, ''));
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_mensaje TEXT := btrim(coalesce(p_mensaje, ''));
BEGIN
  IF length(v_nombre) < 2 OR length(v_nombre) > 120 THEN
    RAISE EXCEPTION 'El nombre no es válido';
  END IF;
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'El correo no es válido';
  END IF;
  IF length(v_mensaje) < 10 OR length(v_mensaje) > 4000 THEN
    RAISE EXCEPTION 'El mensaje debe tener entre 10 y 4000 caracteres';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.contacto_mensajes
    WHERE email = v_email AND creado_en > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'Ya hemos recibido un mensaje reciente con ese correo';
  END IF;

  INSERT INTO public.contacto_mensajes (nombre, email, mensaje)
  VALUES (v_nombre, v_email, v_mensaje);
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_contacto(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_contacto(TEXT, TEXT, TEXT) TO anon, authenticated;

SELECT '046 preparada: canal persistente de contacto' AS mensaje;
