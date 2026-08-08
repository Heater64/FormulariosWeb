-- ============================================================================
-- 032 — GRUPOS: el admin creador (admin_id) puede ver y gestionar su grupo
-- ----------------------------------------------------------------------------
-- La política INSERT (grupos_insert_propio) permite crear un grupo con
-- admin_id = auth.uid(), pero es_miembro_del_grupo/es_admin_del_grupo/
-- es_editor_del_grupo NO contemplaban grupos.admin_id: un admin (no owner)
-- creaba el grupo y luego no podía verlo (SELECT), gestionarlo (UPDATE/DELETE)
-- ni publicar exámenes en él. Con esta migración, el admin_id del grupo se
-- considera miembro, admin y editor de pleno derecho.
--
-- NOTA IMPORTANTE (compilación PL/pgSQL): el parámetro se llama grupo_id y
-- TODAS las columnas van calificadas con alias de tabla. Con el parámetro
-- llamado grupo_id y referencias sin calificar, PL/pgSQL lanza 42702 ("column
-- reference grupo_id is ambiguous") al compilar el RETURN.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.es_miembro_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo mg
    WHERE mg.usuario_id = auth.uid()
      AND mg.grupo_id = es_miembro_del_grupo.grupo_id
  ) OR public.es_owner()
     -- La "clase principal" se asigna con perfiles.grupo_id (asegurar_grupo /
     -- admin_actualizar_usuario) y NO crea fila en miembros_grupo; el helper
     -- también la considera membresía o los alumnos no verían sus exámenes.
     OR EXISTS (
       SELECT 1 FROM public.perfiles p
       WHERE p.id = auth.uid() AND p.grupo_id = es_miembro_del_grupo.grupo_id
     )
     -- El administrador del grupo (admin_id) es miembro de pleno derecho:
     -- sin esto, un admin no-owner no ve el grupo que acaba de crear.
     OR EXISTS (
       SELECT 1 FROM public.grupos g
       WHERE g.id = es_miembro_del_grupo.grupo_id AND g.admin_id = auth.uid()
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

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
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

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
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Los GRANT EXECUTE de 028 persisten con CREATE OR REPLACE FUNCTION; se
-- reafirman por si la 028 se aplicó parcialmente (mismos roles que la 028).
GRANT EXECUTE ON FUNCTION public.es_miembro_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_editor_del_grupo(UUID) TO anon, authenticated;
