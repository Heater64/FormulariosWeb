-- ============================================================================
-- MIGRACIÓN 070 — Aislamiento de cuentas y administración por clase
--
-- Un administrador solo puede administrar la clase a la que está asignado.
-- Las notas (personales y de sesión) son privadas incluso frente al owner.
-- Esta migración no adivina ni cambia la clase de administradores existentes:
-- el owner debe asignarla explícitamente mediante la RPC de reparación.
-- ============================================================================

-- ── Notas privadas: solo la persona propietaria puede leerlas o escribirlas.
ALTER TABLE public.notas_capitulo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_capitulo_propias" ON public.notas_capitulo;
CREATE POLICY "notas_capitulo_propias"
  ON public.notas_capitulo FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

ALTER TABLE public.notas_personales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_personales_propias" ON public.notas_personales;
CREATE POLICY "notas_personales_propias"
  ON public.notas_personales FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ── Alta: un admin debe nacer con una clase concreta.
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
  IF p_rol = 'admin' AND p_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Un administrador debe tener una clase asignada';
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

  IF p_grupo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.grupos WHERE id = p_grupo_id) THEN
    RAISE EXCEPTION 'La clase seleccionada no existe';
  END IF;

  v_email := public.email_sintetico(p_username);
  IF EXISTS (SELECT 1 FROM public.perfiles WHERE lower(username) = lower(btrim(p_username)))
     OR EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END IF;

  v_uid := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current,
      reauthentication_token, email_change_confirm_status, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, v_uid, 'authenticated',
      'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      v_ahora, '', '', '', '', '', '', '', '', 0,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('username', btrim(p_username), 'nombre_completo', btrim(p_nombre_completo),
                         'rol', p_rol, 'activo', true, 'email_verified', true),
      v_ahora, v_ahora, false, false
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', v_email,
                               'email_verified', true, 'phone_verified', false),
            'email', v_ahora, v_ahora);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END;

  UPDATE public.perfiles
  SET rol = p_rol, grupo_id = p_grupo_id, activo = true, nombre_completo = btrim(p_nombre_completo)
  WHERE id = v_uid;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('usuario_creado', 'Usuario ' || btrim(p_username) || ' (rol ' || p_rol || ')',
          auth.uid(), CASE WHEN v_owner THEN p_grupo_id ELSE v_actor_grupo END);
  RETURN v_uid;
END;
$$;

-- ── Edición: no se puede conservar ni convertir en admin una cuenta sin clase.
CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario(
  p_usuario_id UUID,
  p_nombre_completo TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_password TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_owner BOOLEAN;
  v_actor_rol TEXT;
  v_actor_grupo UUID;
  v_objetivo_rol TEXT;
  v_objetivo_grupo UUID;
BEGIN
  v_owner := public.es_owner();
  SELECT rol, grupo_id INTO v_actor_rol, v_actor_grupo FROM public.perfiles WHERE id = auth.uid();
  SELECT rol, grupo_id INTO v_objetivo_rol, v_objetivo_grupo FROM public.perfiles WHERE id = p_usuario_id;
  IF v_objetivo_rol IS NULL THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

  IF NOT v_owner THEN
    IF NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL
            AND v_objetivo_grupo = v_actor_grupo AND v_objetivo_rol IN ('editor', 'usuario')) THEN
      RAISE EXCEPTION 'Un admin solo puede editar usuarios de su clase';
    END IF;
    IF p_rol IS NOT NULL AND p_rol NOT IN ('editor', 'usuario') THEN
      RAISE EXCEPTION 'Un admin de clase no puede asignar ese rol';
    END IF;
    IF p_grupo_id IS NOT NULL AND p_grupo_id <> v_actor_grupo THEN
      RAISE EXCEPTION 'Un admin de clase no puede mover usuarios a otra clase';
    END IF;
  END IF;

  IF COALESCE(p_rol, v_objetivo_rol) = 'admin' AND p_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Un administrador debe tener una clase asignada';
  END IF;
  IF p_grupo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.grupos WHERE id = p_grupo_id) THEN
    RAISE EXCEPTION 'La clase seleccionada no existe';
  END IF;

  IF p_username IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.perfiles WHERE username = btrim(p_username) AND id <> p_usuario_id) THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END IF;
    BEGIN
      UPDATE auth.users SET email = public.email_sintetico(p_username), updated_at = now() WHERE id = p_usuario_id;
      UPDATE auth.identities
      SET identity_data = identity_data || jsonb_build_object('email', public.email_sintetico(p_username))
      WHERE user_id = p_usuario_id AND provider = 'email';
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END;
  END IF;

  IF p_password IS NOT NULL AND p_password <> '' THEN
    PERFORM auth.admin_update_user_by_id(p_usuario_id, jsonb_build_object('password', p_password));
  END IF;

  UPDATE public.perfiles SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    username = COALESCE(p_username, username),
    rol = COALESCE(p_rol, rol),
    grupo_id = p_grupo_id
  WHERE id = p_usuario_id;

  IF NOT v_owner AND p_grupo_id IS NULL THEN
    DELETE FROM public.miembros_grupo WHERE usuario_id = p_usuario_id AND grupo_id = v_actor_grupo;
  END IF;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('usuario_actualizado', 'Perfil ' || p_usuario_id::text, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

-- ── Cambio rápido de rol: tampoco permite promover una cuenta sin clase.
CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(p_usuario_id UUID, p_rol TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner BOOLEAN;
  v_actor_rol TEXT;
  v_actor_grupo UUID;
  v_objetivo_rol TEXT;
  v_objetivo_grupo UUID;
BEGIN
  v_owner := public.es_owner();
  SELECT rol, grupo_id INTO v_actor_rol, v_actor_grupo FROM public.perfiles WHERE id = auth.uid();
  SELECT rol, grupo_id INTO v_objetivo_rol, v_objetivo_grupo FROM public.perfiles WHERE id = p_usuario_id;
  IF v_objetivo_rol IS NULL THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN RAISE EXCEPTION 'Rol inválido'; END IF;

  IF NOT v_owner THEN
    IF NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL AND v_objetivo_grupo = v_actor_grupo
            AND v_objetivo_rol IN ('editor', 'usuario') AND p_rol IN ('editor', 'usuario')) THEN
      RAISE EXCEPTION 'Un admin solo puede cambiar el rol de usuarios de su clase';
    END IF;
  ELSIF v_objetivo_rol = 'owner' AND p_rol <> 'owner'
        AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes quitar el rol owner al último owner';
  END IF;

  IF p_rol = 'admin' AND v_objetivo_grupo IS NULL THEN
    RAISE EXCEPTION 'Asigna primero una clase antes de convertir la cuenta en administradora';
  END IF;

  UPDATE public.perfiles SET rol = p_rol WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('rol_cambiado', 'Perfil ' || p_usuario_id::text || ' → ' || p_rol, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

-- Reparación explícita para un admin que ya existía sin clase. Solo el owner
-- puede elegir la clase; no se asigna una por heurística.
CREATE OR REPLACE FUNCTION public.admin_asignar_clase_a_admin(p_admin_id UUID, p_grupo_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  IF NOT public.es_owner() THEN RAISE EXCEPTION 'Solo el owner puede asignar una clase a un administrador'; END IF;
  SELECT nombre_completo INTO v_nombre FROM public.perfiles
  WHERE id = p_admin_id AND rol = 'admin' AND activo = true;
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'El usuario indicado no es un administrador activo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.grupos WHERE id = p_grupo_id) THEN
    RAISE EXCEPTION 'La clase seleccionada no existe';
  END IF;

  UPDATE public.perfiles SET grupo_id = p_grupo_id WHERE id = p_admin_id;
  INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo)
  VALUES (p_grupo_id, p_admin_id, 'admin')
  ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET rol_en_grupo = 'admin';
  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('admin_clase_asignada', 'Administrador ' || p_admin_id::text || ' asignado a clase', auth.uid(), p_grupo_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_asignar_clase_a_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_asignar_clase_a_admin(UUID, UUID) TO authenticated;

SELECT '070 aplicada: cuentas aisladas y administradores vinculados a una clase' AS mensaje;
