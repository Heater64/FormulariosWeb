-- ============================================================================
-- MIGRACION 045: onboarding autonomo de instituciones
-- ============================================================================
-- Requiere 028_auth_esquema, 028_auth_politicas, 040_clases_instituciones y
-- 044_grupos_profesionales aplicadas previamente en el mismo proyecto.
-- No aplicar a produccion sin probar antes en staging.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crear_institucion_y_clase(
  p_institucion_nombre TEXT,
  p_clase_nombre TEXT,
  p_descripcion TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario UUID := auth.uid();
  v_institucion UUID;
  v_grupo UUID;
  v_codigo TEXT;
  v_nombre TEXT := btrim(coalesce(p_institucion_nombre, ''));
  v_clase TEXT := btrim(coalesce(p_clase_nombre, ''));
  v_descripcion TEXT := btrim(coalesce(p_descripcion, ''));
  v_rol TEXT;
  v_intentos INTEGER := 0;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear una institución';
  END IF;
  IF length(v_nombre) < 2 OR length(v_nombre) > 120 THEN
    RAISE EXCEPTION 'El nombre de la institución debe tener entre 2 y 120 caracteres';
  END IF;
  IF length(v_clase) < 2 OR length(v_clase) > 120 THEN
    RAISE EXCEPTION 'El nombre de la clase debe tener entre 2 y 120 caracteres';
  END IF;
  IF length(v_descripcion) > 500 THEN
    RAISE EXCEPTION 'La descripción no puede superar 500 caracteres';
  END IF;

  SELECT rol INTO v_rol FROM public.perfiles WHERE id = v_usuario AND activo = true;
  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'Tu perfil aún no está listo. Espera unos segundos y vuelve a intentarlo';
  END IF;
  IF EXISTS (SELECT 1 FROM public.perfiles WHERE id = v_usuario AND grupo_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Tu cuenta ya tiene una clase principal asignada';
  END IF;

  INSERT INTO public.instituciones (nombre, descripcion, admin_id)
  VALUES (v_nombre, v_descripcion, v_usuario)
  RETURNING id INTO v_institucion;

  LOOP
    v_intentos := v_intentos + 1;
    v_codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    BEGIN
      INSERT INTO public.grupos (nombre, descripcion, admin_id, institucion_id, codigo)
      VALUES (v_clase, v_descripcion, v_usuario, v_institucion, v_codigo)
      RETURNING id INTO v_grupo;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_intentos >= 8 THEN
        RAISE EXCEPTION 'No se pudo generar un código de clase único';
      END IF;
    END;
  END LOOP;

  UPDATE public.perfiles
  SET rol = CASE WHEN rol = 'owner' THEN rol ELSE 'admin' END,
      grupo_id = v_grupo
  WHERE id = v_usuario;

  INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
  VALUES (v_grupo, v_usuario, 'admin', true)
  ON CONFLICT (grupo_id, usuario_id)
  DO UPDATE SET rol_en_grupo = 'admin', es_principal = true;

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (v_grupo, v_usuario, 'institucion_creada', v_institucion::text);

  RETURN jsonb_build_object(
    'institucion_id', v_institucion,
    'grupo_id', v_grupo,
    'codigo', v_codigo
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_institucion_y_clase(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_institucion_y_clase(TEXT, TEXT, TEXT) TO authenticated;

SELECT '045 preparada: onboarding de institucion y primera clase' AS mensaje;
