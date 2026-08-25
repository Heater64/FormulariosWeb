-- ============================================================================
-- MIGRACION 052: eliminar contraseñas legacy de perfiles
-- ============================================================================
-- Requisito: todas las cuentas deben haber migrado a auth.users.
-- La migración falla si queda algún hash legacy para evitar pérdida de acceso.
-- ============================================================================

-- El trigger de alta ya no escribe ninguna credencial en perfiles. El rol y el
-- estado se fijan en servidor; nunca se aceptan desde raw_user_meta_data del
-- registro público para evitar escalada de privilegios.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.perfiles (
    id, username, email, nombre_completo, rol, activo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo',
             NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1)),
    'usuario',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- La RPC de actualización conserva sus controles de alcance, pero delega la
-- contraseña exclusivamente a Supabase Auth y no toca perfiles.password.
CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario(
  p_usuario_id UUID,
  p_nombre_completo TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_password TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_owner BOOLEAN;
  v_actor_rol TEXT;
  v_actor_grupo UUID;
  v_objetivo_rol TEXT;
  v_objetivo_grupo UUID;
BEGIN
  v_owner := public.es_owner();
  SELECT rol, grupo_id INTO v_actor_rol, v_actor_grupo
  FROM public.perfiles WHERE id = auth.uid();
  SELECT rol, grupo_id INTO v_objetivo_rol, v_objetivo_grupo
  FROM public.perfiles WHERE id = p_usuario_id;

  IF v_objetivo_rol IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF NOT v_owner THEN
    IF NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL
            AND v_objetivo_grupo = v_actor_grupo
            AND v_objetivo_rol IN ('editor', 'usuario')) THEN
      RAISE EXCEPTION 'Un admin solo puede editar usuarios de su clase';
    END IF;
    IF p_rol IS NOT NULL AND p_rol NOT IN ('editor', 'usuario') THEN
      RAISE EXCEPTION 'Un admin de clase no puede asignar ese rol';
    END IF;
    IF p_grupo_id IS NOT NULL AND p_grupo_id <> v_actor_grupo THEN
      RAISE EXCEPTION 'Un admin de clase no puede mover usuarios a otra clase';
    END IF;
  END IF;

  IF p_username IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE username = btrim(p_username) AND id <> p_usuario_id
    ) THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END IF;
    BEGIN
      UPDATE auth.users
      SET email = public.email_sintetico(p_username), updated_at = now()
      WHERE id = p_usuario_id;
      UPDATE auth.identities
      SET identity_data = identity_data || jsonb_build_object(
        'email', public.email_sintetico(p_username)
      )
      WHERE user_id = p_usuario_id AND provider = 'email';
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END;
  END IF;

  IF p_password IS NOT NULL AND p_password <> '' THEN
    PERFORM auth.admin_update_user_by_id(
      p_usuario_id, jsonb_build_object('password', p_password)
    );
  END IF;

  UPDATE public.perfiles SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    username = COALESCE(p_username, username),
    rol = COALESCE(p_rol, rol),
    grupo_id = p_grupo_id
  WHERE id = p_usuario_id;

  IF NOT v_owner AND p_grupo_id IS NULL THEN
    DELETE FROM public.miembros_grupo
    WHERE usuario_id = p_usuario_id AND grupo_id = v_actor_grupo;
  END IF;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES (
    'usuario_actualizado',
    'Perfil ' || p_usuario_id::text,
    auth.uid(),
    CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.perfiles WHERE password IS NOT NULL LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar perfiles.password: quedan cuentas legacy';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.auth_login(p_username TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_username TEXT;
  v_email TEXT;
  v_activo BOOLEAN;
  v_valido BOOLEAN;
  v_intentos INT;
BEGIN
  SELECT p.id, p.username, p.email, p.activo
    INTO v_id, v_username, v_email, v_activo
  FROM public.perfiles p
  WHERE p.username = btrim(p_username);

  IF v_id IS NULL THEN
    SELECT p.id, p.username, p.email, p.activo
      INTO v_id, v_username, v_email, v_activo
    FROM public.perfiles p
    WHERE lower(p.username) = lower(btrim(p_username))
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    PERFORM pg_sleep(0.5);
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;

  IF NOT v_activo THEN
    RAISE EXCEPTION 'Cuenta desactivada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'Cuenta no migrada a Supabase Auth. Contacta al administrador.';
  END IF;

  v_email := COALESCE(v_email, public.email_sintetico(v_username));

  DELETE FROM public.login_intentos
  WHERE creado_en < now() - interval '10 minutes';

  SELECT count(*) INTO v_intentos
  FROM public.login_intentos
  WHERE username = v_username;

  IF v_intentos >= 5 THEN
    RAISE EXCEPTION 'Demasiados intentos fallidos. Espera unos minutos.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = v_id
      AND encrypted_password = extensions.crypt(p_password, encrypted_password)
  ) INTO v_valido;

  IF v_valido THEN
    RETURN v_email;
  END IF;

  INSERT INTO public.login_intentos (username) VALUES (v_username);
  PERFORM pg_sleep(0.5);
  RAISE EXCEPTION 'Usuario o contraseña incorrectos';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) TO anon, authenticated;

ALTER TABLE public.perfiles DROP COLUMN IF EXISTS password;

SELECT '052 aplicada: Supabase Auth es la única fuente de contraseñas' AS mensaje;
