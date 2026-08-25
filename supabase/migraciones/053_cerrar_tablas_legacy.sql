-- ============================================================================
-- MIGRACION 053: cerrar tablas legacy no utilizadas
-- ============================================================================
-- audit_logs y editor_requests no forman parte del esquema actual ni tienen
-- referencias en el cliente. Se conservan los datos por si hicieran falta en
-- una auditoría histórica, pero no se exponen a roles de aplicación.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
  END IF;

  IF to_regclass('public.editor_requests') IS NOT NULL THEN
    ALTER TABLE public.editor_requests ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.editor_requests FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

SELECT '053 aplicada: tablas legacy cerradas sin borrar datos' AS mensaje;
