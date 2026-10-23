-- ============================================================================
-- 078: El temario pasa a 'activa' (visible para todos los usuarios)
-- ----------------------------------------------------------------------------
-- La bandera 'temario' nació en 'oculta' (077) para probarla solo como
-- owner. Validado el flujo completo, se habilita para todos los usuarios
-- autenticados: la RPC fb_funciones() devolverá activa = true sin mirar
-- usuarios ni grupos de prueba.
--
-- El cliente no cambia: la visibilidad sigue gobiernándose únicamente por
-- la bandera (features.activa('temario')), sin comprobaciones de rol.
--
-- Idempotente: se puede ejecutar varias veces sin errores.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.funciones') IS NULL THEN
    RAISE NOTICE '076 no aplicada: no existe public.funciones, se omite la activación de temario';
    RETURN;
  END IF;

  -- Crea la fila si faltara y, en cualquier caso, la deja en 'activa'.
  INSERT INTO public.funciones (clave, estado)
  VALUES ('temario', 'activa')
  ON CONFLICT (clave) DO UPDATE
    SET estado = 'activa',
        actualizado_en = now();
END;
$$;

SELECT '✅ Migración 078 aplicada: temario activo para todos los usuarios' AS mensaje;
