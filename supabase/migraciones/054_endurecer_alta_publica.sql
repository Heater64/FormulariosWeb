-- ============================================================================
-- MIGRACION 054: alta pública sin control de privilegios desde metadata
-- ============================================================================
-- El registro público solo puede crear un perfil de alumno activo. Los roles
-- administrativos y cualquier bloqueo se asignan mediante RPCs autorizadas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_username TEXT;
  v_nombre TEXT;
BEGIN
  v_username := left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'username'), ''), split_part(NEW.email, '@', 1)), 80);
  v_nombre := left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'nombre_completo'), ''), v_username), 120);

  INSERT INTO public.perfiles (
    id, username, email, nombre_completo, rol, activo
  )
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    v_nombre,
    'usuario',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

SELECT '054 aplicada: alta pública fija rol usuario y activo=true' AS mensaje;
