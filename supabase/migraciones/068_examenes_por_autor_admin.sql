-- ============================================================================
-- 068_examenes_por_autor_admin.sql
-- ----------------------------------------------------------------------------
-- Problema: admin_listar_examenes_clase devolvía TODOS los exámenes de la
-- clase del admin, incluidos los de otros editores/admins. Ahora cada admin
-- ve solo los exámenes que él creó (creado_por = auth.uid()). El owner no
-- usa esta RPC: sigue viendo todo desde el panel, agrupado por clase.
-- Las estadísticas del admin (admin_stats_clase) cuentan lo mismo que lista.
-- ============================================================================

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
    AND e.creado_por = auth.uid()
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
  SELECT count(*)::INTEGER INTO v_examenes FROM public.examenes_personalizados
    WHERE grupo_id = v_grupo AND creado_por = auth.uid();
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

GRANT EXECUTE ON FUNCTION public.admin_listar_examenes_clase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats_clase() TO authenticated;

SELECT '068 aplicada: admin ve solo sus exámenes' AS mensaje;
