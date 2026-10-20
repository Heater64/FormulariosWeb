-- ============================================================
-- MIGRACIÓN 066: avisar al creador del examen cuando alguien entrega
-- por enlace (individual o comunitario).
--
-- Las entregas por enlace las hace un alumno anónimo (sin sesión),
-- así que el cliente no puede emitir la notificación. El trigger
-- la escribe en el servidor, con privilegios de la función, y el
-- profesor la ve en su centro de notificaciones.
-- Las entregas desde la app (sin enlace) ya notifican desde el cliente:
-- por eso el trigger solo actúa cuando intentos.enlace_id no es nulo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fb_notificar_entrega_enlace()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creador UUID;
  v_titulo TEXT;
BEGIN
  IF NEW.enlace_id IS NULL OR NEW.estado IS DISTINCT FROM 'completado' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado = 'completado' THEN
    RETURN NEW;
  END IF;

  SELECT e.creado_por, e.titulo INTO v_creador, v_titulo
    FROM public.examenes_personalizados e
   WHERE e.id = NEW.examen_id;

  IF v_creador IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos, categoria, prioridad)
  VALUES (
    v_creador,
    'examen_entregado',
    'Examen entregado',
    coalesce(NULLIF(btrim(NEW.alumno_nombre), ''), 'Un alumno') || ' ha entregado «' || coalesce(v_titulo, 'Examen') || '». Está listo para corregir.',
    jsonb_build_object('examen_id', NEW.examen_id, 'intento_id', NEW.id),
    'examenes',
    'alta'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fb_notificar_entrega_enlace ON public.intentos_examen_personalizado;
CREATE TRIGGER trg_fb_notificar_entrega_enlace
  AFTER INSERT OR UPDATE OF estado ON public.intentos_examen_personalizado
  FOR EACH ROW
  EXECUTE FUNCTION public.fb_notificar_entrega_enlace();

REVOKE ALL ON FUNCTION public.fb_notificar_entrega_enlace() FROM PUBLIC;
