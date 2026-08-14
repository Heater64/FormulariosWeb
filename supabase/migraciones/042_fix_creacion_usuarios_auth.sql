-- ============================================================================
-- MIGRACIÓN 042 — Reparar creación de usuarios desde el panel
-- ============================================================================
-- Algunas instalaciones no exponen auth.admin_create_user() como función SQL.
-- La RPC anterior fallaba con 42883 aunque el owner tuviera permisos.
-- Esta variante crea auth.users + auth.identities con el esquema real de Auth;
-- el trigger on_auth_user_created crea el perfil público y después se asigna
-- el rol y la clase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_crear_usuario(
  p_nombre_completo TEXT,
  p_username TEXT,
  p_password TEXT,
  p_rol TEXT DEFAULT 'usuario',
  p_grupo_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_uid UUID;
  v_actor_rol TEXT;
  v_actor_grupo UUID;
  v_owner BOOLEAN;
  v_ahora TIMESTAMPTZ := now();
BEGIN
  v_owner := public.es_owner();
  SELECT rol, grupo_id INTO v_actor_rol, v_actor_grupo
  FROM public.perfiles WHERE id = auth.uid();

  IF NOT v_owner AND NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL) THEN
    RAISE EXCEPTION 'No autorizado: solo el owner o el admin de una clase';
  END IF;
  IF btrim(p_nombre_completo) = '' OR btrim(p_username) = '' OR btrim(p_password) = '' THEN
    RAISE EXCEPTION 'Nombre, usuario y contraseña son obligatorios';
  END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  IF NOT v_owner THEN
    IF p_rol NOT IN ('editor', 'usuario') THEN
      RAISE EXCEPTION 'Un admin de clase solo puede crear alumnos o profesores';
    END IF;
    IF p_grupo_id IS NOT NULL AND p_grupo_id <> v_actor_grupo THEN
      RAISE EXCEPTION 'Un admin de clase no puede asignar otra clase';
    END IF;
    p_grupo_id := v_actor_grupo;
  END IF;

  v_email := public.email_sintetico(p_username);
  IF EXISTS (SELECT 1 FROM public.perfiles WHERE lower(username) = lower(btrim(p_username)))
     OR EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END IF;

  v_uid := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      email_change_token_current,
      reauthentication_token,
      email_change_confirm_status,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_uid,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      v_ahora,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      0,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'username', btrim(p_username),
        'nombre_completo', btrim(p_nombre_completo),
        'rol', p_rol,
        'activo', true,
        'email_verified', true
      ),
      v_ahora,
      v_ahora,
      false,
      false
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      v_uid::text,
      v_uid,
      jsonb_build_object(
        'sub', v_uid::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_ahora,
      v_ahora
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END;

  -- handle_new_user() ya creó la fila en perfiles.
  UPDATE public.perfiles
  SET rol = p_rol,
      grupo_id = p_grupo_id,
      activo = true,
      nombre_completo = btrim(p_nombre_completo)
  WHERE id = v_uid;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES (
    'usuario_creado',
    'Usuario ' || btrim(p_username) || ' (rol ' || p_rol || ')',
    auth.uid(),
    CASE WHEN v_owner THEN p_grupo_id ELSE v_actor_grupo END
  );

  RETURN v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

SELECT '✅ Migración 042 aplicada: creación de usuarios compatible con Supabase Auth' AS mensaje;
