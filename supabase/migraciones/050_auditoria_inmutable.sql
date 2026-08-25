-- ============================================================================
-- MIGRACION 050: auditoria inmutable y escritura autenticada acotada
-- ============================================================================
-- Las RPC SECURITY DEFINER existentes siguen insertando eventos del sistema.
-- El cliente solo puede solicitar un evento con actor_id = auth.uid(); nunca
-- puede elegir otro actor ni editar/borrar el historial.
-- ============================================================================

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_insert_sistema" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_update_owner" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_borrado_owner" ON public.auditoria;

REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM anon, authenticated;
GRANT SELECT ON public.auditoria TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_accion TEXT,
  p_detalle TEXT DEFAULT '',
  p_grupo_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_accion TEXT := btrim(coalesce(p_accion, ''));
  v_detalle TEXT := btrim(coalesce(p_detalle, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF length(v_accion) < 1 OR length(v_accion) > 120
     OR v_accion !~ '^[a-zA-Z0-9:_-]+$' THEN
    RAISE EXCEPTION 'Acción de auditoría no válida';
  END IF;
  IF length(v_detalle) > 2000 OR v_detalle ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Detalle de auditoría no válido';
  END IF;
  IF p_grupo_id IS NOT NULL
     AND NOT (public.es_owner() OR public.es_miembro_del_grupo(p_grupo_id)) THEN
    RAISE EXCEPTION 'Grupo de auditoría no autorizado';
  END IF;

  INSERT INTO public.auditoria (accion, detalle, actor_id, grupo_id)
  VALUES (v_accion, v_detalle, auth.uid(), p_grupo_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_auditoria(TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(TEXT, TEXT, UUID) TO authenticated;

SELECT '050 aplicada: auditoría inmutable y actor forzado a auth.uid()' AS mensaje;
