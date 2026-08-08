-- ============================================================================
-- MIGRACIÓN 031: Anclar el inicio del desafío en el servidor
-- ============================================================================
-- Problema verificado en la 2ª auditoría:
--
--   `desafios.iniciado_en` lo fabricaba el CLIENTE con su reloj
--   (Date.now() + 5s) y `desafio_abandonar_vencidos` lo comparaba con
--   now() del SERVIDOR. Con el reloj del creador atrasado, el servidor
--   abandona a todos los participantes ANTES de que puedan jugar; con el
--   reloj adelantado, el desafío queda colgado para siempre (nadie se
--   abandona nunca). El ranking y la cuenta atrás también se desfasaban.
--
-- Solución: RPC `desafio_iniciar` SECURITY DEFINER que fija
--   estado='en_curso' e iniciado_en = now() + 5s EN EL SERVIDOR, de forma
--   idempotente (si ya está en_curso, devuelve el inicio existente sin
--   tocarlo). El cliente la usa con fallback al flujo antiguo para
--   versiones viejas de la BD (la APK 1.0.4 instalada sigue funcionando).
--
-- Todo es idempotente y sin pérdida de datos.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.desafio_iniciar(p_desafio_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Solo un participante, el creador u owner del propio desafío
  IF NOT EXISTS (
    SELECT 1 FROM public.desafio_participantes
    WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid()
  ) AND NOT public.es_owner() AND NOT EXISTS (
    SELECT 1 FROM public.desafios WHERE id = p_desafio_id AND creador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No participas en este desafío';
  END IF;

  -- Fijar el inicio UNA sola vez: solo si aún está en 'invitacion'.
  -- Un segundo llamador (doble clic / última aceptación concurrente)
  -- encuentra el estado ya en 'en_curso' y no toca nada.
  UPDATE public.desafios
     SET estado = 'en_curso',
         iniciado_en = now() + interval '5 seconds'
   WHERE id = p_desafio_id AND estado = 'invitacion'
   RETURNING iniciado_en INTO v_inicio;

  IF v_inicio IS NULL THEN
    SELECT iniciado_en INTO v_inicio
      FROM public.desafios WHERE id = p_desafio_id;
  END IF;

  RETURN v_inicio;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desafio_iniciar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desafio_iniciar(UUID) TO authenticated;

SELECT '✅ Migración 031 aplicada: desafio_iniciar (inicio anclado al servidor)' AS mensaje;
