-- ============================================================
-- FormsBiblicos — Migración 044
-- Grupos profesionales: membresía unificada + admisión + avisos
-- + actividad + estadísticas de clase.
-- ------------------------------------------------------------
-- Qué cambia:
--   1. miembros_grupo.es_principal: la membresía vive SOLO en
--      miembros_grupo (perfiles.grupo_id se sincroniza desde aquí).
--   2. Rol 'ayudante' (co-profesor).
--   3. solicitudes_grupo: entrar (por código o desde la tarjeta)
--      requiere APROBACIÓN del admin de la clase. El owner entra
--      directo sin solicitud.
--   4. avisos_grupo: muro de anuncios de la clase (estilo Classroom);
--      solo los responsables (admin/editor/ayudante) publican.
--   5. actividad_grupo: historial (ingresos, solicitudes, avisos...).
--   6. Notificación tipo 'solicitud_clase' para el admin de la clase.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MEMBRESÍA UNIFICADA
-- ------------------------------------------------------------
ALTER TABLE public.miembros_grupo ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT false;

-- Backfill: cada perfil con clase principal (perfiles.grupo_id) pasa a
-- tener fila en miembros_grupo con es_principal = true. Tras esto, la
-- fuente de verdad ÚNICA es miembros_grupo.
INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
SELECT p.grupo_id, p.id,
       CASE WHEN p.rol IN ('owner', 'admin') THEN 'admin'
            WHEN p.rol = 'editor' THEN 'editor'
            ELSE 'miembro' END,
       true
FROM public.perfiles p
WHERE p.grupo_id IS NOT NULL
ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET es_principal = true;

-- Rol 'ayudante' (co-profesor): recrear el CHECK de rol_en_grupo.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.miembros_grupo'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%rol_en_grupo%'
  LOOP
    EXECUTE format('ALTER TABLE public.miembros_grupo DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.miembros_grupo ADD CONSTRAINT miembros_grupo_rol_check
  CHECK (rol_en_grupo IN ('admin', 'editor', 'ayudante', 'miembro'));

-- ------------------------------------------------------------
-- 2. SOLICITUDES DE ADMISIÓN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitudes_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  resuelto_en TIMESTAMPTZ,
  resuelto_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  UNIQUE (grupo_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_pendientes ON public.solicitudes_grupo(grupo_id) WHERE estado = 'pendiente';

-- ------------------------------------------------------------
-- 3. AVISOS DE CLASE (muro)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  editado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_avisos_grupo ON public.avisos_grupo(grupo_id, creado_en DESC);

-- ------------------------------------------------------------
-- 4. ACTIVIDAD DE CLASE (historial)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.actividad_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  detalle TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividad_grupo ON public.actividad_grupo(grupo_id, creado_en DESC);

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
ALTER TABLE public.solicitudes_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solicitudes_select" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_select" ON public.solicitudes_grupo FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "solicitudes_insert" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_insert" ON public.solicitudes_grupo FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
DROP POLICY IF EXISTS "solicitudes_update" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_update" ON public.solicitudes_grupo FOR UPDATE TO authenticated
  USING (public.es_admin_del_grupo(grupo_id) OR public.es_owner())
  WITH CHECK (public.es_admin_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "solicitudes_delete" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_delete" ON public.solicitudes_grupo FOR DELETE TO authenticated
  USING (public.es_admin_del_grupo(grupo_id) OR public.es_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_grupo TO authenticated;

ALTER TABLE public.avisos_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avisos_select" ON public.avisos_grupo;
CREATE POLICY "avisos_select" ON public.avisos_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "avisos_insert" ON public.avisos_grupo;
CREATE POLICY "avisos_insert" ON public.avisos_grupo FOR INSERT TO authenticated
  WITH CHECK (public.es_miembro_del_grupo(grupo_id));
DROP POLICY IF EXISTS "avisos_delete" ON public.avisos_grupo;
CREATE POLICY "avisos_delete" ON public.avisos_grupo FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
GRANT SELECT, INSERT, DELETE ON public.avisos_grupo TO authenticated;

-- actividad_grupo: SOLO lectura desde el cliente; las escrituras ocurren
-- dentro de las RPCs SECURITY DEFINER (bypass de RLS), nunca desde la app.
ALTER TABLE public.actividad_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actividad_select" ON public.actividad_grupo;
CREATE POLICY "actividad_select" ON public.actividad_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());
REVOKE ALL ON public.actividad_grupo FROM authenticated;
GRANT SELECT ON public.actividad_grupo TO authenticated;

-- ------------------------------------------------------------
-- 6. RPC: solicitar ingreso (owner entra directo; el resto solicita)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.solicitar_ingreso(p_grupo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_solicitud_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  -- El owner entra directo, sin aprobación
  IF public.es_owner() THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (p_grupo_id, auth.uid(), 'admin', true)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
    VALUES (p_grupo_id, auth.uid(), 'ingreso_codigo', auth.uid()::text);
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', p_grupo_id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.miembros_grupo WHERE grupo_id = p_grupo_id AND usuario_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND grupo_id = p_grupo_id) THEN
    RAISE EXCEPTION 'Ya eres miembro de esta clase';
  END IF;
  INSERT INTO public.solicitudes_grupo (grupo_id, usuario_id)
  VALUES (p_grupo_id, auth.uid())
  ON CONFLICT (grupo_id, usuario_id)
    DO UPDATE SET estado = 'pendiente', resuelto_en = NULL, resuelto_por = NULL
  RETURNING id INTO v_solicitud_id;

  -- Avisar SOLO al admin de la clase (aprobación del admin)
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  SELECT m.usuario_id, 'solicitud_clase', 'Nueva solicitud de ingreso',
         (SELECT p.nombre_completo FROM public.perfiles p WHERE p.id = auth.uid()) || ' quiere unirse a tu clase',
         jsonb_build_object('grupo_id', p_grupo_id, 'url', '/grupos/' || p_grupo_id)
  FROM public.miembros_grupo m
  WHERE m.grupo_id = p_grupo_id AND m.rol_en_grupo = 'admin';

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (p_grupo_id, auth.uid(), 'solicitud_ingreso', auth.uid()::text);
  RETURN jsonb_build_object('resultado', 'solicitud', 'grupo_id', p_grupo_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 7. RPC: resolver solicitud (aprobar / rechazar) — solo admin de clase
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolver_solicitud(p_solicitud_id UUID, p_aceptar BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  v_sol public.solicitudes_grupo%ROWTYPE;
  v_nombre TEXT;
BEGIN
  SELECT * INTO v_sol FROM public.solicitudes_grupo WHERE id = p_solicitud_id;
  IF v_sol.id IS NULL THEN RAISE EXCEPTION 'Solicitud no válida'; END IF;
  IF NOT (public.es_admin_del_grupo(v_sol.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF v_sol.estado <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;

  SELECT nombre_completo INTO v_nombre FROM public.perfiles WHERE id = v_sol.usuario_id;
  v_nombre := COALESCE(v_nombre, 'Un alumno');

  IF p_aceptar THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (v_sol.grupo_id, v_sol.usuario_id, 'miembro', false)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (v_sol.usuario_id, 'grupo', 'Solicitud aceptada', 'Te has unido a la clase. ¡Bienvenido!',
            jsonb_build_object('grupo_id', v_sol.grupo_id, 'url', '/grupos/' || v_sol.grupo_id));
  ELSE
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (v_sol.usuario_id, 'grupo', 'Solicitud rechazada', 'Tu solicitud para unirte a la clase no fue aprobada.',
            jsonb_build_object('grupo_id', v_sol.grupo_id));
  END IF;

  UPDATE public.solicitudes_grupo
  SET estado = CASE WHEN p_aceptar THEN 'aceptada' ELSE 'rechazada' END,
      resuelto_en = NOW(), resuelto_por = auth.uid()
  WHERE id = p_solicitud_id;

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (v_sol.grupo_id, auth.uid(), CASE WHEN p_aceptar THEN 'solicitud_aceptada' ELSE 'solicitud_rechazada' END, v_sol.usuario_id::text);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 8. RPC: avisos (crear / eliminar) — solo responsables publican
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_aviso(p_grupo_id UUID, p_contenido TEXT)
RETURNS UUID AS $$
DECLARE
  v_aviso_id UUID;
BEGIN
  -- Solo los responsables (admin/editor/ayudante) u owner pueden publicar
  IF NOT (public.es_editor_del_grupo(p_grupo_id) OR public.es_owner()
          OR EXISTS (SELECT 1 FROM public.miembros_grupo
                     WHERE grupo_id = p_grupo_id AND usuario_id = auth.uid() AND rol_en_grupo = 'ayudante')) THEN
    RAISE EXCEPTION 'Solo los responsables de la clase pueden publicar avisos';
  END IF;
  IF length(btrim(p_contenido)) = 0 OR length(p_contenido) > 2000 THEN
    RAISE EXCEPTION 'Aviso inválido';
  END IF;
  INSERT INTO public.avisos_grupo (grupo_id, autor_id, contenido)
  VALUES (p_grupo_id, auth.uid(), btrim(p_contenido))
  RETURNING id INTO v_aviso_id;
  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (p_grupo_id, auth.uid(), 'aviso_creado', v_aviso_id::text);
  RETURN v_aviso_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.eliminar_aviso(p_aviso_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.avisos_grupo
  WHERE id = p_aviso_id
    AND (autor_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 9. RPC: estadísticas y progreso de clase
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estadisticas_clase(p_grupo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INT; v_profes INT; v_examenes INT; v_avisos INT; v_solicitudes INT; v_activos INT;
BEGIN
  IF NOT public.es_miembro_del_grupo(p_grupo_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_total FROM public.miembros_grupo WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_profes FROM public.miembros_grupo
    WHERE grupo_id = p_grupo_id AND rol_en_grupo IN ('admin', 'editor', 'ayudante');
  SELECT count(*) INTO v_examenes FROM public.examenes_personalizados WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_avisos FROM public.avisos_grupo WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_solicitudes FROM public.solicitudes_grupo
    WHERE grupo_id = p_grupo_id AND estado = 'pendiente';
  SELECT count(*) INTO v_activos FROM public.perfiles p
    JOIN public.miembros_grupo m ON m.usuario_id = p.id AND m.grupo_id = p_grupo_id
    WHERE p.ultimo_acceso > NOW() - interval '7 days';
  RETURN jsonb_build_object(
    'miembros', v_total,
    'profesores', v_profes,
    'alumnos', v_total - v_profes,
    'examenes', v_examenes,
    'avisos', v_avisos,
    'solicitudes_pendientes', v_solicitudes,
    'activos_7d', v_activos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.progreso_miembros(p_grupo_id UUID)
RETURNS TABLE(usuario_id UUID, nombre_completo TEXT, username TEXT, capitulos_estudiados BIGINT) AS $$
BEGIN
  IF NOT public.es_miembro_del_grupo(p_grupo_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
    SELECT p.id, p.nombre_completo, p.username, count(pl.id)::BIGINT
    FROM public.miembros_grupo m
    JOIN public.perfiles p ON p.id = m.usuario_id
    LEFT JOIN public.progreso_lectura pl ON pl.usuario_id = p.id AND pl.completado = true
    WHERE m.grupo_id = p_grupo_id
    GROUP BY p.id
    ORDER BY p.nombre_completo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 10. unirse_con_codigo: entrada POR CÓDIGO con aprobación del admin.
--     El owner entra directo (sin solicitud); el resto crea una
--     solicitud que el admin de la clase aprueba o rechaza.
-- ------------------------------------------------------------
-- Cambia el tipo de retorno (UUID → JSONB): hay que DROP la función
-- existente de la migración 040 antes de redefinirla.
DROP FUNCTION IF EXISTS public.unirse_con_codigo(TEXT);
CREATE OR REPLACE FUNCTION public.unirse_con_codigo(p_codigo TEXT)
RETURNS JSONB AS $$
DECLARE
  v_grupo_id UUID;
  v_nombre TEXT;
BEGIN
  SELECT g.id INTO v_grupo_id
  FROM public.grupos g
  WHERE g.codigo = upper(btrim(p_codigo));
  IF v_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Código de clase no válido';
  END IF;

  -- Owner: entra directo como admin de la clase
  IF public.es_owner() THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (v_grupo_id, auth.uid(), 'admin', true)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
    VALUES (v_grupo_id, auth.uid(), 'ingreso_codigo', auth.uid()::text);
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id);
  END IF;

  -- Ya miembro: entrar directo (idempotente)
  IF EXISTS (SELECT 1 FROM public.miembros_grupo WHERE grupo_id = v_grupo_id AND usuario_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND grupo_id = v_grupo_id) THEN
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id);
  END IF;

  -- El resto: solicitud pendiente de aprobación del admin de la clase
  INSERT INTO public.solicitudes_grupo (grupo_id, usuario_id)
  VALUES (v_grupo_id, auth.uid())
  ON CONFLICT (grupo_id, usuario_id)
    DO UPDATE SET estado = 'pendiente', resuelto_en = NULL, resuelto_por = NULL;

  SELECT nombre_completo INTO v_nombre FROM public.perfiles WHERE id = auth.uid();
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  SELECT m.usuario_id, 'solicitud_clase', 'Nueva solicitud de ingreso',
         COALESCE(v_nombre, 'Un alumno') || ' quiere unirse a tu clase',
         jsonb_build_object('grupo_id', v_grupo_id, 'url', '/grupos/' || v_grupo_id)
  FROM public.miembros_grupo m
  WHERE m.grupo_id = v_grupo_id AND m.rol_en_grupo = 'admin';

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (v_grupo_id, auth.uid(), 'solicitud_ingreso', auth.uid()::text);
  RETURN jsonb_build_object('resultado', 'solicitud', 'grupo_id', v_grupo_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 11. Notificaciones: NO se añade CHECK de tipo. El esquema v2 (027)
--     usa tipos libres (nombres de evento: 'desafio.aceptado',
--     'solicitud_clase', 'grupo'...) y notification-service los mapea
--     con MAPA_TIPO/_configLegacy. Un CHECK restrictivo rompería
--     inserciones v2 existentes.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.solicitar_ingreso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_solicitud(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_aviso(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_aviso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_clase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.progreso_miembros(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unirse_con_codigo(TEXT) TO authenticated, anon;

SELECT '✅ Migración 044 aplicada: grupos profesionales' AS mensaje;
