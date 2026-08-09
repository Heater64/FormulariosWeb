-- ============================================================================
-- MIGRACIÓN 035: el editor/admin con grupo asignado por PERFIL gestiona su grupo
-- ----------------------------------------------------------------------------
-- Problema verificado en PRODUCCIÓN (2026-08-09, reproducción con editor1 y
-- rebeca en la vista Notas):
--
-- El panel de administración asigna la clase principal con
-- perfiles.grupo_id (admin_actualizar_usuario / asegurar_grupo) y NO crea
-- fila en miembros_grupo. La migración 032 ya trataba esa asignación como
-- MEMBRESÍA en es_miembro_del_grupo(), pero es_editor_del_grupo() y
-- es_admin_del_grupo() solo miraban miembros_grupo y grupos.admin_id.
--
-- Consecuencia: un usuario con rol 'editor'/'admin' en perfiles y grupo
-- asignado por el panel (p.ej. rebeca, editora del grupo real) NO podía:
--   * crear evaluaciones        → 42501 "new row violates row-level security
--                                  policy for table evaluaciones"
--   * crear/editar exámenes personalizados
--   * calificar intentos        → mismas políticas basadas en el helper
--
-- El INSERT de evaluaciones exige `es_owner() OR (creado_por = auth.uid()
-- AND es_editor_del_grupo(grupo_id))`; con el helper corregido, el editor de
-- perfil pasa el check y puede gestionar SU grupo. Los permisos no se
-- amplían a grupos ajenos: el editor sigue limitado a su perfiles.grupo_id.
--
-- Además se corrige en el cliente (vista-calificaciones.js): asegurarGrupo
-- devuelve el usuario ACTUALIZADO (con grupo_id recién creado) y el código
-- lo descartaba, mandando grupo_id null al INSERT.
--
-- NOTA de compilación (PL/pgSQL): el parámetro se llama grupo_id y TODAS
-- las referencias van calificadas con alias de tabla, igual que en 032.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) es_admin_del_grupo: + rol 'admin'/'owner' con perfiles.grupo_id = grupo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo mg
    WHERE mg.usuario_id = auth.uid()
      AND mg.grupo_id = es_admin_del_grupo.grupo_id
      AND mg.rol_en_grupo = 'admin'
  ) OR public.es_owner()
     OR EXISTS (
       SELECT 1 FROM public.grupos g
       WHERE g.id = es_admin_del_grupo.grupo_id AND g.admin_id = auth.uid()
     )
     -- El admin de PERFIL (panel admin) con grupo asignado por perfiles.grupo_id
     -- gestiona ese grupo aunque no tenga fila en miembros_grupo.
     OR EXISTS (
       SELECT 1 FROM public.perfiles p
       WHERE p.id = auth.uid()
         AND p.rol IN ('admin', 'owner')
         AND p.grupo_id = es_admin_del_grupo.grupo_id
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2) es_editor_del_grupo: + rol 'admin'/'editor' con perfiles.grupo_id = grupo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_editor_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo mg
    WHERE mg.usuario_id = auth.uid()
      AND mg.grupo_id = es_editor_del_grupo.grupo_id
      AND mg.rol_en_grupo IN ('admin', 'editor')
  ) OR public.es_owner()
     OR EXISTS (
       SELECT 1 FROM public.grupos g
       WHERE g.id = es_editor_del_grupo.grupo_id AND g.admin_id = auth.uid()
     )
     -- El editor/admin de PERFIL con grupo asignado por el panel gestiona su
     -- grupo (crear evaluaciones/exámenes, calificar, publicar).
     OR EXISTS (
       SELECT 1 FROM public.perfiles p
       WHERE p.id = auth.uid()
         AND p.rol IN ('admin', 'editor')
         AND p.grupo_id = es_editor_del_grupo.grupo_id
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Los GRANT EXECUTE de 028/032 persisten con CREATE OR REPLACE FUNCTION; se
-- reafirman por si alguna se aplicó parcialmente.
GRANT EXECUTE ON FUNCTION public.es_admin_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_editor_del_grupo(UUID) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) Reafirmar las políticas de escritura que usan los helpers corregidos
--    (idempotente; DROP + CREATE con el mismo nombre que 028)
-- ----------------------------------------------------------------------------

-- EVALUACIONES: el editor de perfil (rebeca) ya puede crear en su grupo
DROP POLICY IF EXISTS "evaluaciones_insert" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert"
  ON public.evaluaciones FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

DROP POLICY IF EXISTS "evaluaciones_update" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update"
  ON public.evaluaciones FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner())
  WITH CHECK (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

DROP POLICY IF EXISTS "evaluaciones_delete" ON public.evaluaciones;
CREATE POLICY "evaluaciones_delete"
  ON public.evaluaciones FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- EXAMENES_PERSONALIZADOS: mismo patrón (crear, editar, borrar)
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor"
  ON public.examenes_personalizados FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

DROP POLICY IF EXISTS "examenes_edicion_profesor_upd" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_upd"
  ON public.examenes_personalizados FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

DROP POLICY IF EXISTS "examenes_edicion_profesor_del" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_del"
  ON public.examenes_personalizados FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- INTENTOS_EXAMEN_PERSONALIZADO: el editor de perfil puede calificar
DROP POLICY IF EXISTS "intentos_profesor_ve" ON public.intentos_examen_personalizado;
CREATE POLICY "intentos_profesor_ve"
  ON public.intentos_examen_personalizado FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

DROP POLICY IF EXISTS "intentos_profesor_califica" ON public.intentos_examen_personalizado;
CREATE POLICY "intentos_profesor_califica"
  ON public.intentos_examen_personalizado FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN
-- ----------------------------------------------------------------------------
SELECT '✅ 035 aplicada: es_editor_del_grupo/es_admin_del_grupo contemplan el rol del perfil' AS mensaje;
