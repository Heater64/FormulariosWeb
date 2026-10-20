-- ============================================================================
-- 067_evaluacion_vinculo_alumno.sql
-- ----------------------------------------------------------------------------
-- Las filas de la rejilla de Evaluaciones se guardan por NOMBRE (texto), no
-- por cuenta. Para que un alumno con sesión vea su nota final, el administrador
-- vincula a mano una fila (clave normalizada) con una cuenta de tipo 'usuario'.
--
--   · evaluaciones_vinculos: una cuenta por fila y una fila por cuenta dentro
--     de cada evaluación. Ninguna tabla es accesible directamente (solo RPC).
--   · fb_evaluacion_vincular: el propietario de la evaluación asigna o quita
--     la cuenta de una fila.
--   · fb_evaluacion_vinculos: lista los vínculos de una evaluación (admin).
--   · fb_mis_notas_evaluaciones: el alumno ve SOLO su nota final de cada
--     evaluación vinculada a su cuenta (nunca las notas de otros).
--
-- La nota final del alumno replica la de fb_evaluacion_obtener (065): nota
-- manual final si existe; si no, media ponderada de sus celdas con nota
-- (manual o automática de examen). Sin notas → NULL (pendiente, no cero).
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.evaluaciones_vinculos (
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  -- clave normalizada igual que el resto de joins: lower(btrim(alumno))
  clave         TEXT NOT NULL,
  alumno_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evaluacion_id, clave),
  UNIQUE (evaluacion_id, alumno_id)
);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_vinculos_alumno
  ON public.evaluaciones_vinculos(alumno_id);
ALTER TABLE public.evaluaciones_vinculos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evaluaciones_vinculos FROM anon, authenticated;

-- ── Nota final de un alumno (uso interno, sin validar sesión) ──────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_nota_alumno(p_id UUID, p_clave TEXT)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH valores AS (
    SELECT cx.peso,
           coalesce(mn.nota, au.nota) AS nota
    FROM public.evaluaciones_columnas cx
    LEFT JOIN public.evaluaciones_notas mn
      ON mn.evaluacion_id = p_id AND mn.columna_id = cx.id
     AND lower(btrim(mn.alumno)) = p_clave
    LEFT JOIN LATERAL (
      SELECT i.nota
      FROM public.intentos_examen_personalizado i
      WHERE cx.tipo = 'examen' AND cx.examen_id IS NOT NULL
        AND i.examen_id = cx.examen_id
        AND i.corregido AND i.nota IS NOT NULL
        AND lower(btrim(coalesce(i.alumno_nombre, ''))) = p_clave
      ORDER BY i.fecha_completado DESC NULLS LAST
      LIMIT 1
    ) au ON true
    WHERE cx.evaluacion_id = p_id
  ),
  media AS (
    SELECT round(sum(v.nota * coalesce(v.peso, 1)) / sum(coalesce(v.peso, 1)), 2) AS m
    FROM valores v
    WHERE v.nota IS NOT NULL
  )
  SELECT coalesce(
    (SELECT mn.nota FROM public.evaluaciones_notas mn
      WHERE mn.evaluacion_id = p_id AND mn.columna_id IS NULL
        AND lower(btrim(mn.alumno)) = p_clave),
    (SELECT m FROM media)
  );
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_nota_alumno(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ── Asignar o quitar la cuenta de una fila (solo propietario de la evaluación)
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
    IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = p_alumno AND rol = 'usuario') THEN
      RAISE EXCEPTION 'La cuenta indicada no es de un alumno';
    END IF;
    INSERT INTO public.evaluaciones_vinculos (evaluacion_id, clave, alumno_id)
    VALUES (p_id, v_clave, p_alumno);
  END IF;

  RETURN public.fb_evaluacion_vinculos(p_id);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_vincular(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_vincular(UUID, TEXT, UUID) TO authenticated;

-- ── Vínculos de una evaluación (solo propietario) ──────────────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_vinculos(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.fb_evaluacion_validar(p_id);
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'clave', v.clave,
             'alumno_id', v.alumno_id,
             'nombre', coalesce(p.nombre_completo, p.username, '')
           ) ORDER BY v.clave), '[]'::jsonb)
    FROM public.evaluaciones_vinculos v
    LEFT JOIN public.perfiles p ON p.id = v.alumno_id
    WHERE v.evaluacion_id = p_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_vinculos(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_vinculos(UUID) TO authenticated;

-- ── Mis notas finales (alumno con sesión) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fb_mis_notas_evaluaciones()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'evaluacion_id', e.id,
           'nombre', e.titulo,
           'fecha', e.fecha,
           'nota_max', e.nota_max,
           'nota', public.fb_evaluacion_nota_alumno(e.id, v.clave)
         ) ORDER BY e.fecha DESC NULLS LAST, e.titulo), '[]'::jsonb)
  FROM public.evaluaciones_vinculos v
  JOIN public.evaluaciones e ON e.id = v.evaluacion_id
  WHERE v.alumno_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.fb_mis_notas_evaluaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_mis_notas_evaluaciones() TO authenticated;

SELECT '067 aplicada: vínculos fila↔cuenta de alumno y notas finales propias' AS mensaje;
