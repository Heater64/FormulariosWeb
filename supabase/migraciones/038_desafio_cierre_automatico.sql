-- ============================================================
-- 038: cierre automático de desafíos abiertos/vencidos
-- ============================================================
-- Los desafíos quedaban abiertos con el reloj contando para siempre porque
-- el cierre solo corría cuando un cliente abría la vista del desafío. Si
-- nadie la abría (o en desafíos SIN límite de tiempo, que no tienen tope),
-- quedaban en 'en_curso' indefinidamente.
--
-- Esta migración:
--   1) Crea la función SECURITY DEFINER `desafio_cerrar_vencidos()` que
--      cierra TODO lo que esté vencido:
--        • invitaciones expiradas            → 'expirado'
--        • participantes con límite vencido (+30s de margen) → 'abandonado'
--        • desafíos SIN límite abiertos hace >24h  → participantes 'abandonado'
--        • desafíos 'en_curso' donde todos quedaron terminales → 'finalizado'
--   2) Programa un job pg_cron cada minuto (best-effort: solo si la
--      extensión pg_cron ya está habilitada en el proyecto).
--
-- La app también llama a esta función desde el poller de notificaciones
-- (~cada minuto, con la app abierta), así el cierre funciona aunque el job
-- no esté activo.
--
-- Aplicar en el SQL Editor de Supabase:
--   1. (Opcional, para el job) Activar pg_cron: Database → Extensions → pg_cron
--   2. Ejecutar este archivo completo.

CREATE OR REPLACE FUNCTION public.desafio_cerrar_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_afectados INTEGER := 0;
  v_nuevos INTEGER := 0;
  v_id UUID;
BEGIN
  -- 1) Invitaciones que nadie aceptó a tiempo → 'expirado'
  UPDATE public.desafios
     SET estado = 'expirado'
   WHERE estado = 'invitacion'
     AND expira_en IS NOT NULL
     AND now() > expira_en;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;

  -- 2) Desafíos CON límite: quien no terminó dentro del límite + 30s de
  --    margen pasa a 'abandonado' (misma regla que la RPC antigua).
  UPDATE public.desafio_participantes dp
     SET estado = 'abandonado'
    FROM public.desafios d
   WHERE dp.desafio_id = d.id
     AND d.estado = 'en_curso'
     AND dp.estado IN ('aceptado', 'en_juego')
     AND d.tiempo_limite_seg IS NOT NULL
     AND d.iniciado_en IS NOT NULL
     AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second';
  GET DIAGNOSTICS v_nuevos = ROW_COUNT;
  v_afectados := v_afectados + v_nuevos;

  -- 3) Desafíos SIN límite: tampoco pueden quedar abiertos para siempre.
  --    Máximo 24h desde el inicio (respuesta a "se quedan contando tiempo
  --    infinito"): quien no haya terminado pasa a 'abandonado'.
  UPDATE public.desafio_participantes dp
     SET estado = 'abandonado'
    FROM public.desafios d
   WHERE dp.desafio_id = d.id
     AND d.estado = 'en_curso'
     AND dp.estado IN ('aceptado', 'en_juego')
     AND d.tiempo_limite_seg IS NULL
     AND d.iniciado_en IS NOT NULL
     AND now() > d.iniciado_en + interval '24 hours';
  GET DIAGNOSTICS v_nuevos = ROW_COUNT;
  v_afectados := v_afectados + v_nuevos;

  -- 4) Cerrar los desafíos 'en_curso' donde nadie queda activo
  --    (todos terminado/abandonado/rechazado/eliminado). Si alguien terminó
  --    hay resultado (finalizado); si no, se cierra igualmente.
  FOR v_id IN
    SELECT d.id
      FROM public.desafios d
     WHERE d.estado = 'en_curso'
       AND NOT EXISTS (
             SELECT 1 FROM public.desafio_participantes dp
              WHERE dp.desafio_id = d.id
                AND dp.estado IN ('invitado', 'aceptado', 'en_juego')
           )
  LOOP
    UPDATE public.desafios
       SET estado = 'finalizado', finalizado_en = now()
     WHERE id = v_id;
    v_afectados := v_afectados + 1;
  END LOOP;

  RETURN v_afectados;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desafio_cerrar_vencidos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desafio_cerrar_vencidos() TO authenticated;

-- Job cada minuto (solo si pg_cron está habilitado en el proyecto).
-- Para activarlo: Dashboard Supabase → Database → Extensions → pg_cron.
-- OJO: el DO usa la etiqueta $do$ para que el $$ interno (comando del job)
-- no cierre el cuerpo del bloque (los delimitadores idénticos no anidan).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Re-aplicable: si el job ya existe se reprograma sin duplicarlo
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'desafios-cerrar-vencidos') THEN
      PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'desafios-cerrar-vencidos';
    END IF;
    PERFORM cron.schedule('desafios-cerrar-vencidos', '* * * * *',
                          $$SELECT public.desafio_cerrar_vencidos()$$);
  END IF;
END $do$;
