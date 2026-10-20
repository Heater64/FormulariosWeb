-- ============================================================================
-- 073_evaluaciones_permisos_authenticated.sql
-- ----------------------------------------------------------------------------
-- La 060 hizo REVOKE ALL sobre public.evaluaciones para anon y authenticated.
-- Después, el cliente (examenes-repository.js) lee, crea, edita y borra
-- evaluaciones directamente en esa tabla, así que PostgREST responde
-- "permission denied for table evaluaciones": el editor no ve ninguna
-- evaluación del grupo y no puede crear una nueva.
--
-- Esta migración devuelve solo los privilegios de tabla a authenticated.
-- Las políticas RLS de la 028/035 siguen decidiendo qué filas puede tocar
-- cada usuario. anon sigue sin acceso. Las tablas evaluaciones_columnas,
-- evaluaciones_notas y evaluaciones_alumnos siguen cerradas: solo las RPC.
-- Idempotente.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluaciones TO authenticated;
