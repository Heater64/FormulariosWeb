-- ============================================================================
-- MIGRACIÓN 043 — Emails internos válidos para Supabase Auth
-- ============================================================================
-- GoTrue puede rechazar o no resolver correctamente direcciones con el dominio
-- reservado .local durante signInWithPassword. Las cuentas creadas por el
-- panel usan un email interno que no se muestra al usuario, así que las
-- movemos a un subdominio válido de FormsBiblicos sin cambiar contraseñas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.email_sintetico(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_base TEXT;
  v_email TEXT;
  v_norm TEXT;
BEGIN
  v_norm := lower(btrim(p_username));
  v_base := lower(regexp_replace(v_norm, '[^a-z0-9._-]', '', 'g'));
  IF v_base = '' THEN v_base := 'usuario'; END IF;

  v_email := v_base || '@accounts.formsbiblicos.com';

  -- Evitar colisiones después de normalizar mayúsculas o caracteres.
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = v_email
      AND coalesce(raw_user_meta_data->>'username', '') <> btrim(p_username)
  ) THEN
    v_email := v_base || '-' || substr(encode(extensions.digest(v_norm::bytea, 'sha256'), 'hex'), 1, 6)
               || '@accounts.formsbiblicos.com';
  END IF;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.email_sintetico(TEXT) TO anon, authenticated;

-- Primero se sincroniza el perfil público; auth_login devuelve este email.
UPDATE public.perfiles
SET email = public.email_sintetico(username)
WHERE email LIKE '%@formsbiblicos.local';

-- Después se sincronizan Auth y la identidad email, conservando el hash y la
-- sesión de cada usuario. El owner con email real no se modifica.
UPDATE auth.users u
SET email = public.email_sintetico(p.username),
    updated_at = now()
FROM public.perfiles p
WHERE p.id = u.id
  AND u.email LIKE '%@formsbiblicos.local';

UPDATE auth.identities i
SET identity_data = i.identity_data
  || jsonb_build_object('email', public.email_sintetico(p.username)),
    updated_at = now()
FROM public.perfiles p
WHERE i.user_id = p.id
  AND i.provider = 'email'
  AND i.identity_data->>'email' LIKE '%@formsbiblicos.local';

SELECT '✅ Migración 043 aplicada: emails internos Auth migrados a accounts.formsbiblicos.com' AS mensaje;
