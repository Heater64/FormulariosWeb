-- ============================================================================
-- FormsBiblicos — Migración 036: modo desafío "El primero que acabe"
-- ============================================================================
-- Nuevo modo de juego (tercera opción al enviar un desafío): el desafío se
-- cierra en cuanto el PRIMER participante termina sus 10 preguntas; el resto
-- ve la pantalla final con el resultado de los dos.
--
-- Representación: columna booleana en `desafios` (false = comportamiento
-- actual). Es ortogonal a `tiempo_limite_seg` (un desafío carrera no tiene
-- límite de tiempo: null).
--
-- Idempotente: se puede ejecutar tantas veces como se quiera.
-- ============================================================================

ALTER TABLE public.desafios
  ADD COLUMN IF NOT EXISTS finaliza_primer_terminado BOOLEAN DEFAULT false;

SELECT '✅ Migración 036 aplicada: modo "el primero que acabe"' AS mensaje;
