-- ============================================================================
-- MIGRACIÓN 033: Recursión infinita de RLS en desafíos + mazos para admins
-- ============================================================================
-- Problemas verificados en PRODUCCIÓN (josxcvncescqqlajahkh) el 2026-08-08:
--
-- 1. RECURSIÓN INFINITA en `desafios` (error 42P17 "infinite recursion
--    detected in policy for relation \"desafios\""):
--       desafios_lectura            → subconsulta sobre desafio_participantes
--       desafio_participantes_*     → subconsulta sobre desafios
--    La evaluación de una política dispara la otra sin fin. Rompe TODO el
--    flujo de Retar (leer desafíos, insertar participantes, unirse, jugar).
--    FIX: helper SECURITY DEFINER `es_participante_del_desafio` (consulta
--    desafio_participantes SIN RLS, como ya hacen es_owner/es_miembro_...)
--    y las políticas de `desafios` pasan a usarlo. El lado de
--    desafio_participantes (subconsulta sobre desafios) queda seguro porque
--    `desafios_lectura` ya no re-entra en RLS sobre participantes.
--
-- 2. MAZOS/TARJETAS GLOBALES para ADMINS: 028 permite INSERT/UPDATE/DELETE
--    con `usuario_id = auth.uid() OR es_owner()`, pero un mazo global tiene
--    usuario_id NULL → solo el owner podía crear/gestionar contenido global.
--    El panel de administración (nivel ADMIN) mostraba "Crear mazo" y fallaba
--    con 401/403 para admins no-owner. FIX: helper `es_admin()` (owner/admin,
--    el mismo acceso que otorga el panel) + creador del contenido
--    (creado_por = auth.uid()) en las políticas de escritura.
--
-- Todo es idempotente y sin pérdida de datos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) DESAFIOS: romper la recursión con un helper SECURITY DEFINER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_participante_del_desafio(p_desafio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.desafio_participantes dp
    WHERE dp.desafio_id = p_desafio_id AND dp.usuario_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.es_participante_del_desafio(UUID) TO anon, authenticated;

-- Lectura: creador, participante u owner
DROP POLICY IF EXISTS "desafios_lectura" ON public.desafios;
CREATE POLICY "desafios_lectura"
  ON public.desafios FOR SELECT TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR public.es_participante_del_desafio(desafios.id));

-- Editar: creador, PARTICIPANTE u owner (el participante transiciona estado)
DROP POLICY IF EXISTS "desafios_edicion_creador" ON public.desafios;
CREATE POLICY "desafios_edicion_creador"
  ON public.desafios FOR UPDATE TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR public.es_participante_del_desafio(desafios.id))
  WITH CHECK (creador_id = auth.uid()
              OR public.es_owner()
              OR public.es_participante_del_desafio(desafios.id));

-- ----------------------------------------------------------------------------
-- 2) MAZOS/TARJETAS: helper es_admin + escritura para admins y creadores
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('owner', 'admin') AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;

-- --- mazos_memorizacion ---
DROP POLICY IF EXISTS "mazos_insert_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_insert_propios"
  ON public.mazos_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "mazos_edicion_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_edicion_propios"
  ON public.mazos_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid())
  WITH CHECK (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid());

DROP POLICY IF EXISTS "mazos_borrado_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_borrado_propios"
  ON public.mazos_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid());

-- --- tarjetas_memorizacion ---
DROP POLICY IF EXISTS "tarjetas_insert_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_insert_propias"
  ON public.tarjetas_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "tarjetas_edicion_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_edicion_propias"
  ON public.tarjetas_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid())
  WITH CHECK (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid());

DROP POLICY IF EXISTS "tarjetas_borrado_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_borrado_propias"
  ON public.tarjetas_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin() OR creado_por = auth.uid());
