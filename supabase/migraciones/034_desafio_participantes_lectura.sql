-- ============================================================================
-- MIGRACIÓN 034: los participantes de un desafío deben ver TODAS sus filas
-- ============================================================================
-- Problema verificado en PRODUCCIÓN (2026-08-08, prueba E2E de dos cuentas):
--
-- La política 028 `desafio_participantes_lectura` permitía a un participante
-- NO-creador ver SOLO su propia fila (usuario_id = auth.uid()), mientras que
-- el creador veía todas. Consecuencias:
--
--   1. `responderInvitacion()` consulta todas las filas del desafío para
--      decidir si "todos aceptaron" (ps.length >= 2 && every aceptado). El
--      último en aceptar es SIEMPRE un no-creador → ve 1 fila → la condición
--      nunca se cumple → el desafío se queda en 'invitacion' para siempre y
--      NUNCA arranca. El flujo completo (aceptar → jugar → resultados) queda
--      roto para desafíos multi-jugador.
--   2. La pantalla de espera solo mostraba al propio jugador, no el estado
--      del resto (UX rota: "Esperando a que todos acepten" sin ver a nadie).
--
-- FIX: cualquier participante del desafío (helper SECURITY DEFINER
-- es_participante_del_desafio, migración 033) puede leer TODAS las filas de
-- ese desafío. Es un juego compartido: ver el estado de los demás es
-- requisito funcional, no fuga de datos (las filas solo contienen ids de
-- usuario, estado, puntuación y progreso del desafío en curso).
--
-- UPDATE/INSERT/DELETE se mantienen como en 028 (cada uno su propia fila o
-- el creador), así que nadie puede alterar puntuaciones ajenas.
-- ============================================================================

DROP POLICY IF EXISTS "desafio_participantes_lectura" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_lectura"
  ON public.desafio_participantes FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR public.es_participante_del_desafio(desafio_id));

GRANT SELECT ON public.desafio_participantes TO authenticated;

SELECT '✅ 034 aplicada: participantes ven todas las filas de su desafío' AS mensaje;
