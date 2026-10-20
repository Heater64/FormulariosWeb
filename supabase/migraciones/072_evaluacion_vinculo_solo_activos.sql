-- ============================================================================
-- 072_evaluacion_vinculo_solo_activos.sql
-- ----------------------------------------------------------------------------
-- Igual que la asignación de intentos de examen (069): solo se puede asignar
-- una fila de evaluación a una cuenta de alumno ACTIVA. Una cuenta desactivada
-- no recibe vínculos nuevos. Los vínculos ya existentes no se tocan.
-- Requiere la 067. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fb_evaluacion_vincular(
  p_id UUID,
  p_clave TEXT,
  p_alumno UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clave TEXT := lower(btrim(coalesce(p_clave, '')));
BEGIN
  PERFORM public.fb_evaluacion_validar(p_id);
  IF v_clave = '' THEN
    RAISE EXCEPTION 'Fila de alumno no válida';
  END IF;

  -- Quita cualquier vínculo previo de esta fila y de esta cuenta: una cuenta
  -- solo puede corresponder a una fila dentro de la misma evaluación.
  DELETE FROM public.evaluaciones_vinculos
  WHERE evaluacion_id = p_id
    AND (clave = v_clave OR alumno_id = p_alumno);

  IF p_alumno IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = p_alumno AND p.rol = 'usuario' AND coalesce(p.activo, FALSE) = TRUE
    ) THEN
      RAISE EXCEPTION 'La cuenta indicada no es de un alumno activo';
    END IF;
    INSERT INTO public.evaluaciones_vinculos (evaluacion_id, clave, alumno_id)
    VALUES (p_id, v_clave, p_alumno);
  END IF;

  RETURN public.fb_evaluacion_vinculos(p_id);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_vincular(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_vincular(UUID, TEXT, UUID) TO authenticated;

SELECT '072 aplicada: solo se asignan filas de evaluación a cuentas de alumno activas' AS mensaje;
