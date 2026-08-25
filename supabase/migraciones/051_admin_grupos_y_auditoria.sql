-- ============================================================================
-- MIGRACION 051: eliminación segura de grupos y auditoría append-only
-- ============================================================================
-- La auditoría no se edita ni se borra desde sesiones de usuario. Al eliminar
-- una clase, sus referencias históricas se conservan con grupo_id = NULL.
-- ============================================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  FOR v_constraint IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.auditoria'::regclass
      AND c.confrelid = 'public.grupos'::regclass
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.auditoria DROP CONSTRAINT %I', v_constraint);
  END LOOP;
END $$;

ALTER TABLE public.auditoria
  DROP CONSTRAINT IF EXISTS auditoria_grupo_id_fkey;

ALTER TABLE public.auditoria
  ADD CONSTRAINT auditoria_grupo_id_fkey
  FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_eliminar_grupo(p_grupo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede eliminar grupos';
  END IF;

  SELECT nombre INTO v_nombre
  FROM public.grupos
  WHERE id = p_grupo_id
  FOR UPDATE;

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'Grupo no encontrado';
  END IF;

  DELETE FROM public.grupos WHERE id = p_grupo_id;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES (
    'grupo:eliminar',
    format('Grupo "%s" eliminado (%s)', left(v_nombre, 180), p_grupo_id::text),
    auth.uid(),
    NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_eliminar_grupo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_grupo(UUID) TO authenticated;

SELECT '051 aplicada: eliminación de grupos controlada y auditoría append-only' AS mensaje;
