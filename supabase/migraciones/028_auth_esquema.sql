-- ============================================================================
-- MIGRACIÓN 028-A: Supabase Auth — Esquema (funciones, trigger, RPCs)
-- ============================================================================
-- Objetivo: preparar la infraestructura de Supabase Auth sin cambiar el
-- comportamiento actual de la app (que sigue con auth custom hasta el cutover).
--
-- CONTENIDO:
--   1. perfiles.password pasa a nullable (lo gestiona Supabase Auth)
--   2. Helpers de autorización (es_owner, es_admin_del_grupo, ...) → SECURITY
--      DEFINER para que las políticas RLS no entren en recursión infinita
--   3. email_sintetico(): email falso e invisible (username@formsbiblicos.local)
--   4. Trigger handle_new_user: crea el perfil al crearse un auth.users
--   5. RPC auth_login(username, password): valida y MIGRA la contraseña legacy
--      al vuelo (primera vez que entra cada usuario, sin pedirle nada)
--   6. RPCs de administración (solo owner): crear/actualizar/rol/activo/eliminar
--   7. RPC enviar_notificacion (los INSERT de notificaciones ajenas dejarán de
--      poder hacerse por RLS con el cutover)
--
-- ORDEN DE APLICACIÓN (importante):
--   1. 028_auth_esquema.sql        (este archivo — inocuo, no cambia nada aún)
--   2. 028_auth_migracion_datos.sql (crea los auth.users de las cuentas actuales)
--   3. 028_auth_politicas.sql      (CIERRA el RLS abierto — SOLO en el cutover)
--
-- ROLLBACK: ninguna de las tres borra datos. Para revertir, basta restaurar
-- las políticas abiertas de 002_anon_custom_auth.sql y seguir con auth custom.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) perfiles.password pasa a nullable (lo gestiona Supabase Auth)
-- ----------------------------------------------------------------------------
ALTER TABLE public.perfiles ALTER COLUMN password DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2) Helpers de autorización → SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Motivo: las políticas RLS que llaman a estos helpers disparan consultas a
-- miembros_grupo/perfiles; si los helpers fueran SECURITY INVOKER, la consulta
-- interna pasaría por RLS de nuevo → recursión infinita (stack depth exceeded).
-- Como SECURITY DEFINER (owner = postgres) consultan sin RLS y devuelven la
-- respuesta correcta. SET search_path evita la inyección de search_path.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'owner' AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_admin_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_admin_del_grupo.grupo_id
      AND rol_en_grupo = 'admin'
  ) OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_editor_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_editor_del_grupo.grupo_id
      AND rol_en_grupo IN ('admin', 'editor')
  ) OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_miembro_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_miembro_del_grupo.grupo_id
  ) OR public.es_owner()
     -- La "clase principal" se asigna con perfiles.grupo_id (asegurar_grupo /
     -- admin_actualizar_usuario) y NO crea fila en miembros_grupo; el helper
     -- también la considera membresía o los alumnos no verían sus exámenes.
     OR EXISTS (
       SELECT 1 FROM public.perfiles
       WHERE id = auth.uid() AND grupo_id = es_miembro_del_grupo.grupo_id
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_propio_usuario(usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = usuario_id OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.perfiles WHERE id = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.es_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_editor_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_miembro_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_propio_usuario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) email_sintetico(): email falso y determinista por username
-- ----------------------------------------------------------------------------
-- Supabase Auth solo sabe identificar por email; el email sintético nunca se
-- muestra al usuario y no requiere verificación. Si dos usernames colisionan
-- tras sanitizar (p.ej. "Ana" y "ana"), se desambigua con un hash corto.
CREATE OR REPLACE FUNCTION public.email_sintetico(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_base TEXT;
  v_email TEXT;
  v_norm TEXT;
BEGIN
  v_norm := lower(btrim(p_username));
  v_base := lower(regexp_replace(v_norm, '[^a-z0-9._-]', '', 'g'));
  IF v_base = '' THEN v_base := 'usuario'; END IF;
  v_email := v_base || '@formsbiblicos.local';
  -- Si ese email ya pertenece a OTRO usuario (colisión por sanitización o por
  -- usernames que solo difieren en mayúsculas, p.ej. 'Ana' vs 'ana'), añadir un
  -- sufijo determinista derivado del username. La comparación es EXACTA
  -- (case-sensitive) sobre el username canónico para que la decisión sea la
  -- misma aquí, en la migración 028-B y en cada login.
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = v_email
      AND coalesce(raw_user_meta_data->>'username', '') <> btrim(p_username)
  ) THEN
    v_email := v_base || '-' || substr(encode(digest(v_norm, 'sha256'), 'hex'), 1, 6)
               || '@formsbiblicos.local';
  END IF;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

GRANT EXECUTE ON FUNCTION public.email_sintetico(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) Trigger: crear perfil al crear auth.users
-- ----------------------------------------------------------------------------
-- El perfil se crea con id = auth.users.id (Opción B: un solo id por usuario).
-- El trigger recibe username/nombre/rol desde raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id, username, email, password, nombre_completo, rol, activo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo',
             NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario'),
    COALESCE((NEW.raw_user_meta_data->>'activo')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5) RPC auth_login: validar credenciales y MIGRAR la contraseña al vuelo
-- ----------------------------------------------------------------------------
-- FLUJO: la app llama a auth_login(username, password) ANTES de
-- signInWithPassword. auth_login:
--   1. busca el perfil por username y comprueba activo
--   2. si la contraseña ya es la de Supabase Auth (bcrypt) → devuelve el email
--   3. si NO, compara con el hash legacy SHA-256 (o texto plano legacy) y, si
--      coincide, convierte la contraseña a bcrypt en auth.users en el acto
--   4. nunca pide al usuario ni correo ni reset de contraseña
-- Devuelve el email sintético (solo en caso de éxito) para que el cliente
-- llame a signInWithPassword. En caso de fallo lanza excepción genérica
-- (evita enumerar usuarios) y aplica rate-limit + pg_sleep.
--
-- ⚠️ bcrypt: pgcrypto ya NO está en public ni en auth en Supabase reciente;
-- vive en el esquema extensions. Calificamos con extensions. y garantizamos
-- la extensión ahí mismo. gen_salt('bf', 10) produce $2a$ cost 10,
-- compatible con GoTrue.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS public.login_intentos (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_intentos_username ON public.login_intentos(username, creado_en);
-- Tabla interna solo accesible por RPC (SECURITY DEFINER): RLS activa y SIN
-- políticas → ni anon ni authenticated pueden leerla/escribirla directamente.
ALTER TABLE public.login_intentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.auth_login(p_username TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_perfil public.perfiles%ROWTYPE;
  v_email TEXT;
  v_valido BOOLEAN;
  v_intentos INT;
BEGIN
  -- 1) Perfil por username (exacto y, si no, case-insensitive)
  SELECT * INTO v_perfil FROM public.perfiles
   WHERE username = btrim(p_username);
  IF NOT FOUND THEN
    SELECT * INTO v_perfil FROM public.perfiles
     WHERE lower(username) = lower(btrim(p_username)) LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    PERFORM pg_sleep(0.5);
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;

  -- 2) Cuenta desactivada
  IF NOT v_perfil.activo THEN
    RAISE EXCEPTION 'Cuenta desactivada';
  END IF;

  -- 3) El email SIEMPRE es el real de la cuenta (perfiles.email, poblado por el
  --    trigger handle_new_user). Solo se cae al sintético si el perfil no tiene
  --    email (cuentas pre-028 sin migrar).
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_perfil.id) THEN
    RAISE EXCEPTION 'Cuenta no migrada a Supabase Auth. Contacta al administrador.';
  END IF;
  v_email := COALESCE(v_perfil.email, public.email_sintetico(v_perfil.username));

  -- 4) Rate-limit: máx 5 fallos por username en 10 minutos
  DELETE FROM public.login_intentos WHERE creado_en < now() - interval '10 minutes';
  SELECT count(*) INTO v_intentos FROM public.login_intentos WHERE username = v_perfil.username;
  IF v_intentos >= 5 THEN
    RAISE EXCEPTION 'Demasiados intentos fallidos. Espera unos minutos.';
  END IF;

  -- 5) ¿La contraseña ya es la de Supabase Auth? (comparación bcrypt portable)
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_perfil.id
      AND encrypted_password = extensions.crypt(p_password, encrypted_password)
  ) INTO v_valido;

  IF v_valido THEN
    RETURN v_email;
  END IF;

  -- 6) Migración perezosa: ¿coincide con el hash legacy (SHA-256 hex) o texto plano?
  IF v_perfil.password IS NOT NULL
     AND (v_perfil.password = encode(sha256(p_password::bytea), 'hex')
          OR v_perfil.password = p_password) THEN
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      updated_at          = now()
    WHERE id = v_perfil.id;
    -- Invalida el hash legacy: de ahora en adelante solo vale la contraseña de Auth
    UPDATE public.perfiles SET password = NULL WHERE id = v_perfil.id;
    RETURN v_email;
  END IF;

  -- 7) Fallo: registrar, esperar y responder genérico
  INSERT INTO public.login_intentos (username) VALUES (v_perfil.username);
  PERFORM pg_sleep(0.5);
  RAISE EXCEPTION 'Usuario o contraseña incorrectos';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) RPCs de administración — SOLO OWNER (es_owner())
-- ----------------------------------------------------------------------------
-- IMPORTANTE: con el RLS cerrado (cutover), el panel admin deja de poder
-- INSERT/UPDATE/DELETE directo sobre perfiles de otros (y sobre columnas
-- sensibles). Todo lo sensible pasa por estas RPCs, que validan el llamante.

-- 6.1 Crear usuario (solo owner). Crea el auth.users + perfil vía trigger.
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
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede crear usuarios';
  END IF;
  IF btrim(p_username) = '' OR btrim(p_password) = '' THEN
    RAISE EXCEPTION 'El nombre de usuario y la contraseña son obligatorios';
  END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  v_email := public.email_sintetico(p_username);

  BEGIN
    -- Nota: verificar la firma exacta de auth.admin_create_user en la versión
    -- instalada de Supabase (la clásica es (email, password, email_confirm,
    -- user_metadata)). En versiones recientes también existe una variante que
    -- recibe un solo jsonb.
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

  -- El trigger handle_new_user ya creó perfiles; completamos los campos de negocio
  UPDATE public.perfiles
     SET rol = p_rol,
         grupo_id = p_grupo_id,
         activo = true,
         nombre_completo = btrim(p_nombre_completo)
   WHERE id = v_uid;

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_creado', 'Usuario ' || btrim(p_username) || ' (rol ' || p_rol || ')', auth.uid());

  RETURN v_uid;
END;
$$;

-- 6.2 Actualizar perfil / cambiar contraseña (solo owner)
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
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede gestionar usuarios';
  END IF;

  IF p_rol IS NOT NULL AND p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  -- Cambio de username → sincronizar el email sintético en auth
  IF p_username IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.perfiles
               WHERE username = btrim(p_username) AND id <> p_usuario_id) THEN
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

  -- Cambio de contraseña → se aplica en Supabase Auth e invalida el hash legacy
  IF p_password IS NOT NULL AND p_password <> '' THEN
    PERFORM auth.admin_update_user_by_id(p_usuario_id, jsonb_build_object('password', p_password));
    UPDATE public.perfiles SET password = NULL WHERE id = p_usuario_id;
  END IF;

  -- CONTRATO con el cliente (Fase 2): el panel debe enviar SIEMPRE el
  -- grupo_id actual del usuario (o NULL si se le quiere desasignar la clase).
  UPDATE public.perfiles SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    username        = COALESCE(p_username, username),
    rol             = COALESCE(p_rol, rol),
    grupo_id        = p_grupo_id
  WHERE id = p_usuario_id;

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_actualizado', 'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.3 Cambiar rol (solo owner; protege al último owner)
CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(p_usuario_id UUID, p_rol TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede cambiar roles';
  END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;
  -- Evitar quedarse sin owner
  IF (SELECT rol FROM public.perfiles WHERE id = p_usuario_id) = 'owner'
     AND p_rol <> 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes quitar el rol owner al último owner';
  END IF;
  UPDATE public.perfiles SET rol = p_rol WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('rol_cambiado', 'Perfil ' || p_usuario_id::text || ' → ' || p_rol, auth.uid());
END;
$$;

-- 6.4 Activar/desactivar (solo owner; protege al owner)
CREATE OR REPLACE FUNCTION public.admin_toggle_activo(p_usuario_id UUID, p_activo BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede activar/desactivar cuentas';
  END IF;
  IF NOT p_activo
     AND (SELECT rol FROM public.perfiles WHERE id = p_usuario_id) = 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes desactivar al último owner';
  END IF;
  UPDATE public.perfiles SET activo = p_activo WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES (CASE WHEN p_activo THEN 'usuario_activado' ELSE 'usuario_desactivado' END,
          'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.5 Eliminar usuario (solo owner). Limpia FKs no-cascada, borra el perfil
-- (con sus cascadas) y elimina el auth.users/identities.
CREATE OR REPLACE FUNCTION public.admin_eliminar_usuario(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede eliminar usuarios';
  END IF;
  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
  END IF;
  IF (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1
     AND EXISTS (SELECT 1 FROM public.perfiles
                 WHERE id = p_usuario_id AND rol = 'owner') THEN
    RAISE EXCEPTION 'No puedes eliminar al último owner';
  END IF;

  -- FKs sin CASCADE: reasignar o anular antes de borrar
  -- Los intentos del alumno se ELIMINAN (alumno_id es NOT NULL sin cascada)
  DELETE FROM public.intentos_examen_personalizado WHERE alumno_id = p_usuario_id;
  UPDATE public.auditoria                      SET actor_id = NULL                WHERE actor_id = p_usuario_id;
  UPDATE public.intentos_examen_personalizado  SET corregido_por = NULL           WHERE corregido_por = p_usuario_id;
  UPDATE public.preguntas_sistema              SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.evaluaciones                   SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.examenes_personalizados        SET creado_por = auth.uid()        WHERE creado_por = p_usuario_id;
  UPDATE public.grupos                         SET admin_id = NULL                WHERE admin_id = p_usuario_id;
  UPDATE public.mazos_memorizacion             SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.tarjetas_memorizacion          SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.notificaciones                 SET emisor_id = NULL               WHERE emisor_id = p_usuario_id;
  -- (miembros, progreso, tarjetas, repasos, logros, notas, sugerencias, mazos,
  --  notificaciones, desafios, participantes, categorias, backups → CASCADE)

  DELETE FROM public.perfiles WHERE id = p_usuario_id;  -- cascadas
  PERFORM auth.admin_delete_user(p_usuario_id, true);   -- auth.users + identities

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_eliminado', 'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.6 RPC asegurar_grupo: replica al cliente asegurarGrupo() (Fase 2). Crea la
-- clase principal del usuario (si no tiene) y la registra en miembros_grupo,
-- porque con el RLS cerrado ya NO se permite al usuario UPDATE su propio grupo_id.
CREATE OR REPLACE FUNCTION public.asegurar_grupo()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_perfil public.perfiles%ROWTYPE;
  v_grupo_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO v_perfil FROM public.perfiles WHERE id = auth.uid();
  IF v_perfil.grupo_id IS NOT NULL THEN
    RETURN v_perfil.grupo_id;
  END IF;
  INSERT INTO public.grupos (nombre, admin_id)
  VALUES ('Grupo de ' || COALESCE(v_perfil.nombre_completo, v_perfil.username), auth.uid())
  RETURNING id INTO v_grupo_id;
  INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo)
  VALUES (v_grupo_id, auth.uid(), 'admin');
  UPDATE public.perfiles SET grupo_id = v_grupo_id WHERE id = auth.uid();
  RETURN v_grupo_id;
END;
$$;

-- 6.7 RPC de notificación (los INSERT de notificaciones ajenas dejan de poder
-- hacerse por RLS con el cutover; el cliente llamará a esta RPC)
CREATE OR REPLACE FUNCTION public.enviar_notificacion(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_cuerpo TEXT DEFAULT '',
  p_datos JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_cuerpo, p_datos)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Grants de ejecución de las RPCs
REVOKE EXECUTE ON FUNCTION public.asegurar_grupo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_activo(UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_eliminar_usuario(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asegurar_grupo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_activo(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ⚠️ RESIDUO DOCUMENTADO (no se cierra en esta fase): la app calcula la nota de
-- los exámenes objetivos en el cliente y la escribe al entregar, y los desafíos
-- envían la puntuación del participante. El RLS no lo empeora (solo afecta a las
-- propias filas), pero "auto-calificarse" sigue siendo posible por diseño de la
-- app. Cerrarlo del todo requiere una RPC de entrega/corrección que calcule la
-- puntuación en el servidor (Fase 3, pendiente).

SELECT '✅ 028-A aplicada: esquema de Supabase Auth listo (trigger, auth_login, asegurar_grupo, RPCs de admin)' AS mensaje;
