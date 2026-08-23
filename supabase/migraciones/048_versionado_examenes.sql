-- ============================================================================
-- MIGRACION 048: versionado automatico de examenes
-- ============================================================================
-- Los intentos guardan preguntas_snapshot. Esta migracion incrementa la version
-- cuando cambia el contenido/configuracion y registra la publicacion inicial.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fb_versionar_examen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.preguntas IS DISTINCT FROM OLD.preguntas
       OR NEW.config IS DISTINCT FROM OLD.config
       OR NEW.titulo IS DISTINCT FROM OLD.titulo THEN
      NEW.version := coalesce(OLD.version, 1) + 1;
    ELSE
      NEW.version := coalesce(OLD.version, 1);
    END IF;
    IF NEW.publicado = TRUE AND coalesce(OLD.publicado, FALSE) = FALSE THEN
      NEW.publicado_en := coalesce(NEW.publicado_en, now());
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.publicado = TRUE THEN
    NEW.publicado_en := coalesce(NEW.publicado_en, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fb_versionar_examen ON public.examenes_personalizados;
CREATE TRIGGER trg_fb_versionar_examen
  BEFORE INSERT OR UPDATE ON public.examenes_personalizados
  FOR EACH ROW EXECUTE FUNCTION public.fb_versionar_examen();

REVOKE EXECUTE ON FUNCTION public.fb_versionar_examen() FROM PUBLIC, anon, authenticated;

SELECT '048 aplicada: versionado automatico de examenes activo' AS mensaje;
