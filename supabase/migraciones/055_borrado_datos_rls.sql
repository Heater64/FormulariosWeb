-- ============================================================================
-- MIGRACIÓN 055: "Eliminar todos mis datos" vía RPC + políticas de categorías
-- ============================================================================
-- Síntoma: authRepository.eliminarMisDatos() falla en producción con
--   "Error al eliminar intentos_examen_personalizado: No tienes permiso
--   para realizar esta acción." (42501: permission denied).
--
-- Causa raíz: la 047 (seguridad de exámenes) revocó a `authenticated` el
--   DELETE de intentos_examen_personalizado para que el alumno no pueda
--   borrar su historial de exámenes por la API. Ese REVOKE era intencional,
--   así que NO se restaura el permiso directo: el borrado total de datos
--   (privacidad/RGPD) se hace ahora con una RPC SECURITY DEFINER que ejecuta
--   las 9 eliminaciones como el dueño de la tabla (mismo patrón que
--   iniciar_intento_examen y enviar_notificacion), una sola transacción:
--   o se borra todo o no se borra nada (el bucle anterior dejaba el borrado
--   a medias si una tabla fallaba).
--
-- Además se reparan las políticas de categorias_memorizacion / categorias_tarjetas:
--   la 013 las DROPeó y desactivó (RLS OFF); la 028 (§3b) re-habilitó el RLS
--   pero NO recreó las políticas (asumió que las de la 012 seguían) → en el
--   esquema actual esas tablas quedaron con RLS ON y CERO políticas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) RPC de borrado total de datos del usuario (reemplaza el DELETE directo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eliminar_datos_usuario(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida. Vuelve a iniciar sesión.';
  END IF;
  -- Solo el propio usuario (o el owner) puede eliminar sus datos.
  IF p_usuario_id IS DISTINCT FROM v_uid AND NOT public.es_owner() THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar estos datos';
  END IF;

  DELETE FROM public.notas_capitulo              WHERE usuario_id = p_usuario_id;
  DELETE FROM public.categorias_tarjetas         WHERE usuario_id = p_usuario_id;
  DELETE FROM public.categorias_memorizacion     WHERE usuario_id = p_usuario_id;
  DELETE FROM public.mazos_memorizacion          WHERE usuario_id = p_usuario_id;
  DELETE FROM public.miembros_grupo              WHERE usuario_id = p_usuario_id;
  DELETE FROM public.logros_usuario              WHERE usuario_id = p_usuario_id;
  DELETE FROM public.progreso_lectura            WHERE usuario_id = p_usuario_id;
  DELETE FROM public.tarjetas_memorizacion       WHERE usuario_id = p_usuario_id;
  -- Otras tablas dependientes caen en cascada por FK (repasos, progreso de
  -- tarjetas, asignaciones de categoría); intentos usa `alumno_id`.
  DELETE FROM public.intentos_examen_personalizado WHERE alumno_id = p_usuario_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_datos_usuario(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) Categorias_memorizacion: RLS ya ON (028 §3b) pero SIN políticas (013 las
--    borró; la 028 no las recreó). Se recrean con es_owner, estilo 028.
-- ----------------------------------------------------------------------------
ALTER TABLE public.categorias_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_memorizacion_propias" ON public.categorias_memorizacion;
CREATE POLICY "categorias_memorizacion_propias"
  ON public.categorias_memorizacion FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_memorizacion TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) Categorias_tarjetas: idem
-- ----------------------------------------------------------------------------
ALTER TABLE public.categorias_tarjetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_tarjetas_propias" ON public.categorias_tarjetas;
CREATE POLICY "categorias_tarjetas_propias"
  ON public.categorias_tarjetas FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_tarjetas TO authenticated;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ----------------------------------------------------------------------------
SELECT '✅ 055 aplicada: RPC eliminar_datos_usuario + políticas de categorías' AS mensaje;