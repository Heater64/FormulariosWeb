-- ============================================================================
-- MIGRACIÓN 041 — Alcance de administración por clase
-- ============================================================================
-- Owner: acceso global.
-- Admin: solo su clase asignada (perfiles.grupo_id), sus alumnos/profesores y
-- los exámenes de esa clase. Nunca puede crear admins, cambiar de clase,
-- consultar métricas globales ni gestionar memorización.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers de alcance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin_de_clase()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles p
    WHERE p.id = auth.uid()
      AND p.rol = 'admin'
      AND p.activo = true
      AND p.grupo_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.grupo_del_admin_actual()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.grupo_id
  FROM public.perfiles p
  WHERE p.id = auth.uid()
    AND p.rol = 'admin'
    AND p.activo = true;
$$;

CREATE OR REPLACE FUNCTION public.perfil_visible_para_actor(p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_grupo UUID;
BEGIN
  IF public.es_owner() OR p_usuario_id = auth.uid() THEN
    RETURN true;
  END IF;

  SELECT grupo_id INTO v_actor_grupo
  FROM public.perfiles
  WHERE id = auth.uid();

  IF v_actor_grupo IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.perfiles objetivo
    WHERE objetivo.id = p_usuario_id
      AND objetivo.grupo_id = v_actor_grupo
  ) OR EXISTS (
    SELECT 1
    FROM public.miembros_grupo propio
    JOIN public.miembros_grupo objetivo
      ON objetivo.grupo_id = propio.grupo_id
     AND objetivo.usuario_id = p_usuario_id
    WHERE propio.usuario_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.es_admin_de_clase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grupo_del_admin_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_visible_para_actor(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Perfiles: eliminar la lectura global para autenticados.
-- ----------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_lectura_alcance" ON public.perfiles;
CREATE POLICY "perfiles_lectura_alcance"
  ON public.perfiles FOR SELECT TO authenticated
  USING (public.perfil_visible_para_actor(id));

-- ----------------------------------------------------------------------------
-- RPCs de consulta para el panel de un admin. No exponen password/email.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios_clase()
RETURNS TABLE (
  id UUID,
  username TEXT,
  nombre_completo TEXT,
  rol TEXT,
  activo BOOLEAN,
  grupo_id UUID,
  foto_perfil TEXT,
  preferencias JSONB,
  ultimo_acceso TIMESTAMPTZ,
  creado_en TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo UUID;
BEGIN
  IF NOT public.es_admin_de_clase() THEN
    RAISE EXCEPTION 'No autorizado: solo un admin con clase asignada';
  END IF;
  v_grupo := public.grupo_del_admin_actual();
  RETURN QUERY
  SELECT p.id, p.username, p.nombre_completo, p.rol, p.activo, p.grupo_id,
         p.foto_perfil, p.preferencias, p.ultimo_acceso, p.creado_en
  FROM public.perfiles p
  WHERE p.id = auth.uid() OR p.grupo_id = v_grupo
  ORDER BY p.creado_en DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_grupos_clase()
RETURNS SETOF public.grupos
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo UUID;
BEGIN
  IF NOT public.es_admin_de_clase() THEN
    RAISE EXCEPTION 'No autorizado: solo un admin con clase asignada';
  END IF;
  v_grupo := public.grupo_del_admin_actual();
  RETURN QUERY SELECT g.* FROM public.grupos g WHERE g.id = v_grupo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_examenes_clase()
RETURNS SETOF public.examenes_personalizados
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo UUID;
BEGIN
  IF NOT public.es_admin_de_clase() THEN
    RAISE EXCEPTION 'No autorizado: solo un admin con clase asignada';
  END IF;
  v_grupo := public.grupo_del_admin_actual();
  RETURN QUERY
  SELECT e.* FROM public.examenes_personalizados e
  WHERE e.grupo_id = v_grupo
  ORDER BY e.creado_en DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_stats_clase()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_grupo UUID;
  v_usuarios INTEGER;
  v_examenes INTEGER;
  v_lecturas INTEGER;
  v_alumnos INTEGER;
  v_profesores INTEGER;
BEGIN
  IF NOT public.es_admin_de_clase() THEN
    RAISE EXCEPTION 'No autorizado: solo un admin con clase asignada';
  END IF;
  v_grupo := public.grupo_del_admin_actual();
  SELECT count(*)::INTEGER INTO v_usuarios FROM public.perfiles WHERE grupo_id = v_grupo;
  SELECT count(*)::INTEGER INTO v_examenes FROM public.examenes_personalizados WHERE grupo_id = v_grupo;
  SELECT count(*)::INTEGER INTO v_lecturas
  FROM public.progreso_lectura pl
  JOIN public.perfiles p ON p.id = pl.usuario_id
  WHERE p.grupo_id = v_grupo;
  SELECT count(*)::INTEGER INTO v_alumnos FROM public.perfiles WHERE grupo_id = v_grupo AND rol = 'usuario';
  SELECT count(*)::INTEGER INTO v_profesores FROM public.perfiles WHERE grupo_id = v_grupo AND rol = 'editor';
  RETURN jsonb_build_object(
    'usuarios', v_usuarios,
    'examenes', v_examenes,
    'lecturas', v_lecturas,
    'tarjetas', 0,
    'porRol', jsonb_build_object('owner', 0, 'admin', 1, 'editor', v_profesores, 'usuario', v_alumnos)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios_clase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_grupos_clase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_examenes_clase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats_clase() TO authenticated;

-- Los admins solo pueden descubrir la institución vinculada a su clase.
DROP POLICY IF EXISTS "instituciones_select" ON public.instituciones;
DROP POLICY IF EXISTS "instituciones_select_alcance" ON public.instituciones;
CREATE POLICY "instituciones_select_alcance"
  ON public.instituciones FOR SELECT TO authenticated
  USING (
    public.es_owner()
    OR admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.grupos g
      WHERE g.institucion_id = instituciones.id
        AND public.es_miembro_del_grupo(g.id)
    )
  );

-- La configuración global solo se expone al owner; los demás usuarios
-- únicamente necesitan el nombre/logo público para la cabecera.
DROP POLICY IF EXISTS "configuracion_lectura" ON public.configuracion;
DROP POLICY IF EXISTS "configuracion_lectura_alcance" ON public.configuracion;
CREATE POLICY "configuracion_lectura_alcance"
  ON public.configuracion FOR SELECT TO authenticated
  USING (public.es_owner() OR clave IN ('marca_nombre', 'marca_logo'));

-- Un admin administra su clase existente, pero solo el owner crea/elimina
-- clases e instituciones desde el panel global.
DROP POLICY IF EXISTS "grupos_insert_propio" ON public.grupos;
DROP POLICY IF EXISTS "grupos_insert_owner" ON public.grupos;
CREATE POLICY "grupos_insert_owner"
  ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (public.es_owner());
DROP POLICY IF EXISTS "grupos_admin_gestiona" ON public.grupos;
DROP POLICY IF EXISTS "grupos_admin_borra" ON public.grupos;
DROP POLICY IF EXISTS "grupos_owner_gestiona" ON public.grupos;
CREATE POLICY "grupos_owner_gestiona"
  ON public.grupos FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());
DROP POLICY IF EXISTS "grupos_owner_borra" ON public.grupos;
CREATE POLICY "grupos_owner_borra"
  ON public.grupos FOR DELETE TO authenticated
  USING (public.es_owner());

DROP POLICY IF EXISTS "instituciones_insert" ON public.instituciones;
DROP POLICY IF EXISTS "instituciones_insert_owner" ON public.instituciones;
CREATE POLICY "instituciones_insert_owner"
  ON public.instituciones FOR INSERT TO authenticated
  WITH CHECK (public.es_owner());
DROP POLICY IF EXISTS "instituciones_update" ON public.instituciones;
DROP POLICY IF EXISTS "instituciones_update_owner" ON public.instituciones;
CREATE POLICY "instituciones_update_owner"
  ON public.instituciones FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());
DROP POLICY IF EXISTS "instituciones_delete" ON public.instituciones;
DROP POLICY IF EXISTS "instituciones_delete_owner" ON public.instituciones;
CREATE POLICY "instituciones_delete_owner"
  ON public.instituciones FOR DELETE TO authenticated
  USING (public.es_owner());

-- ----------------------------------------------------------------------------
-- RPCs de escritura: owner global o admin limitado a su propia clase.
-- ----------------------------------------------------------------------------
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
BEGIN
  v_owner := public.es_owner();
  SELECT rol, grupo_id INTO v_actor_rol, v_actor_grupo FROM public.perfiles WHERE id = auth.uid();
  IF NOT v_owner AND NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL) THEN
    RAISE EXCEPTION 'No autorizado: solo el owner o el admin de una clase';
  END IF;
  IF btrim(p_username) = '' OR btrim(p_password) = '' THEN
    RAISE EXCEPTION 'El nombre de usuario y la contraseña son obligatorios';
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
  BEGIN
    v_uid := auth.admin_create_user(
      email := v_email,
      password := p_password,
      email_confirm := true,
      user_metadata := jsonb_build_object(
        'username', btrim(p_username),
        'nombre_completo', btrim(p_nombre_completo),
        'rol', p_rol
      )
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END;

  UPDATE public.perfiles
     SET rol = p_rol, grupo_id = p_grupo_id, activo = true,
         nombre_completo = btrim(p_nombre_completo)
   WHERE id = v_uid;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('usuario_creado', 'Usuario ' || btrim(p_username) || ' (rol ' || p_rol || ')', auth.uid(),
          CASE WHEN v_owner THEN p_grupo_id ELSE v_actor_grupo END);
  RETURN v_uid;
END;
$$;

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
    IF EXISTS (SELECT 1 FROM public.perfiles WHERE username = btrim(p_username) AND id <> p_usuario_id) THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END IF;
    BEGIN
      UPDATE auth.users SET email = public.email_sintetico(p_username), updated_at = now()
       WHERE id = p_usuario_id;
      UPDATE auth.identities
         SET identity_data = identity_data || jsonb_build_object('email', public.email_sintetico(p_username))
       WHERE user_id = p_usuario_id AND provider = 'email';
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END;
  END IF;

  IF p_password IS NOT NULL AND p_password <> '' THEN
    PERFORM auth.admin_update_user_by_id(p_usuario_id, jsonb_build_object('password', p_password));
    UPDATE public.perfiles SET password = NULL WHERE id = p_usuario_id;
  END IF;

  UPDATE public.perfiles SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    username = COALESCE(p_username, username),
    rol = COALESCE(p_rol, rol),
    -- El cliente envía siempre el grupo actual; NULL significa quitar la
    -- asignación y dejar al usuario disponible para que el owner lo reasigne.
    grupo_id = p_grupo_id
  WHERE id = p_usuario_id;

  IF NOT v_owner AND p_grupo_id IS NULL THEN
    DELETE FROM public.miembros_grupo
    WHERE usuario_id = p_usuario_id AND grupo_id = v_actor_grupo;
  END IF;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('usuario_actualizado', 'Perfil ' || p_usuario_id::text, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

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
  IF NOT v_owner THEN
    IF NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL AND v_objetivo_grupo = v_actor_grupo
            AND v_objetivo_rol IN ('editor', 'usuario') AND p_rol IN ('editor', 'usuario')) THEN
      RAISE EXCEPTION 'Un admin solo puede cambiar el rol de usuarios de su clase';
    END IF;
  ELSE
    IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN RAISE EXCEPTION 'Rol inválido'; END IF;
    IF v_objetivo_rol = 'owner' AND p_rol <> 'owner'
       AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
      RAISE EXCEPTION 'No puedes quitar el rol owner al último owner';
    END IF;
  END IF;
  UPDATE public.perfiles SET rol = p_rol WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('rol_cambiado', 'Perfil ' || p_usuario_id::text || ' → ' || p_rol, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_activo(p_usuario_id UUID, p_activo BOOLEAN)
RETURNS VOID
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
  IF NOT v_owner AND NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL
                          AND v_objetivo_grupo = v_actor_grupo
                          AND v_objetivo_rol IN ('editor', 'usuario')) THEN
    RAISE EXCEPTION 'Un admin solo puede activar usuarios de su clase';
  END IF;
  IF NOT p_activo AND v_objetivo_rol = 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes desactivar al último owner';
  END IF;
  UPDATE public.perfiles SET activo = p_activo WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES (CASE WHEN p_activo THEN 'usuario_activado' ELSE 'usuario_desactivado' END,
          'Perfil ' || p_usuario_id::text, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_eliminar_usuario(p_usuario_id UUID)
RETURNS VOID
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
  IF p_usuario_id = auth.uid() THEN RAISE EXCEPTION 'No puedes eliminarte a ti mismo'; END IF;
  IF NOT v_owner AND NOT (v_actor_rol = 'admin' AND v_actor_grupo IS NOT NULL
                          AND v_objetivo_grupo = v_actor_grupo
                          AND v_objetivo_rol IN ('editor', 'usuario')) THEN
    RAISE EXCEPTION 'Un admin solo puede eliminar usuarios de su clase';
  END IF;
  IF v_owner AND v_objetivo_rol = 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes eliminar al último owner';
  END IF;

  DELETE FROM public.intentos_examen_personalizado WHERE alumno_id = p_usuario_id;
  UPDATE public.auditoria SET actor_id = NULL WHERE actor_id = p_usuario_id;
  UPDATE public.intentos_examen_personalizado SET corregido_por = NULL WHERE corregido_por = p_usuario_id;
  UPDATE public.preguntas_sistema SET creado_por = NULL WHERE creado_por = p_usuario_id;
  UPDATE public.evaluaciones SET creado_por = NULL WHERE creado_por = p_usuario_id;
  UPDATE public.examenes_personalizados SET creado_por = auth.uid() WHERE creado_por = p_usuario_id;
  UPDATE public.grupos SET admin_id = NULL WHERE admin_id = p_usuario_id;
  UPDATE public.mazos_memorizacion SET creado_por = NULL WHERE creado_por = p_usuario_id;
  UPDATE public.tarjetas_memorizacion SET creado_por = NULL WHERE creado_por = p_usuario_id;
  UPDATE public.notificaciones SET emisor_id = NULL WHERE emisor_id = p_usuario_id;

  DELETE FROM public.perfiles WHERE id = p_usuario_id;
  PERFORM auth.admin_delete_user(p_usuario_id, true);

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES ('usuario_eliminado', 'Perfil ' || p_usuario_id::text, auth.uid(),
          CASE WHEN v_owner THEN v_objetivo_grupo ELSE v_actor_grupo END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_activo(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_usuario(UUID) TO authenticated;

SELECT '✅ Migración 041 aplicada: panel admin limitado por clase; owner global' AS mensaje;
