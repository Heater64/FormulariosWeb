-- ============================================================
-- 037: estado 'eliminado' en desafio_participantes
-- ============================================================
-- El creador puede expulsar a un invitado que NO responde desde la pantalla
-- de espera (botón "Eliminar") y empezar con los que estén listos. El estado
-- 'eliminado' (en lugar de borrar la fila) permite al expulsado ver un aviso
-- claro ("Fuiste eliminado del desafío") y no rompe la finalización.
--
-- Hasta que esta migración se aplique, la app usa un fallback: borra la fila
-- del expulsado (la política RLS desafio_participantes_delete ya lo permite
-- al creador). Al aplicar esta migración, pasa al estado 'eliminado'.
--
-- Aplicar en el SQL Editor de Supabase:
--   ALTER TABLE public.desafio_participantes
--     DROP CONSTRAINT IF EXISTS desafio_participantes_estado_check;
--   ALTER TABLE public.desafio_participantes
--     ADD CONSTRAINT desafio_participantes_estado_check
--     CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'en_juego',
--                       'terminado', 'abandonado', 'eliminado'));

ALTER TABLE public.desafio_participantes
  DROP CONSTRAINT IF EXISTS desafio_participantes_estado_check;

ALTER TABLE public.desafio_participantes
  ADD CONSTRAINT desafio_participantes_estado_check
  CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'en_juego',
                    'terminado', 'abandonado', 'eliminado'));
