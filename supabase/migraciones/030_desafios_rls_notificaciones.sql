-- ============================================================================
-- MIGRACIÓN 030: Corregir RLS de desafíos + reparar notificaciones
-- ============================================================================
-- Problemas verificados en PRODUCCIÓN (josxcvncescqqlajahkh) el 2026-08-08:
--
-- 1. 028-C (RLS cerrado) se aplicó ANTES de que existieran las tablas
--    `desafios`/`desafio_participantes` (o sin sus secciones 17-18):
--    ambas quedaron con RLS habilitado y CERO políticas → todas las
--    operaciones denegadas para authenticated → Retar totalmente roto.
--    (Verificado: pg_policy devuelve 0 filas para esas tablas.)
--
-- 2. `notificaciones.destinatario` (columna legacy) es NOT NULL sin
--    default: cualquier INSERT del cliente falla con 23502 → el centro
--    de notificaciones no persiste nada. (Verificado: 23502.)
--
-- 3. `notificaciones_tipo_check` (024) solo admite tipos legacy:
--    los eventos del servicio ('desafio.creado', 'grupo.invitacion',
--    'anuncio.creado', ...) fallan con 23514. (Verificado: 23514.)
--
-- 4. `perfiles.biografia` (024) no tiene grant de SELECT (028-C no la
--    incluyó): los joins que la piden (desafíos, perfil rápido) fallan.
--
-- 5. Las políticas UPDATE de 028-C para desafíos solo permiten al
--    creador, pero el flujo del cliente transiciona estado como
--    participante (aceptar/rechazar/finalizar) → se amplían a
--    participantes (solo los del propio desafío; el owner siempre).
--
-- 6. El "auto-abandono de vencidos" lo ejecutaba cada cliente
--    actualizando filas AJENAS → con RLS quedaría denegado y los
--    desafíos colgarían para siempre → se mueve a una RPC
--    SECURITY DEFINER `desafio_abandonar_vencidos`.
--
-- Todo es idempotente y sin pérdida de datos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PERFILES: conceder lectura de `biografia` (añadida en 024, olvidada en 028-C)
-- ----------------------------------------------------------------------------
GRANT SELECT (biografia) ON public.perfiles TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) DESAFIOS: políticas para authenticated (secciones 17 de 028-C + UPDATE ampliado)
-- ----------------------------------------------------------------------------
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON public.desafios;

-- Lectura: creador, participante u owner
DROP POLICY IF EXISTS "desafios_lectura" ON public.desafios;
CREATE POLICY "desafios_lectura"
  ON public.desafios FOR SELECT TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafio_participantes dp
                    WHERE dp.desafio_id = desafios.id AND dp.usuario_id = auth.uid()));

-- Crear: solo el propio creador (u owner)
DROP POLICY IF EXISTS "desafios_insert_propios" ON public.desafios;
CREATE POLICY "desafios_insert_propios"
  ON public.desafios FOR INSERT TO authenticated
  WITH CHECK (creador_id = auth.uid() OR public.es_owner());

-- Editar: creador, PARTICIPANTE (acepta/rechaza/finaliza) u owner.
-- El participante solo transiciona estado de desafíos en los que está
-- (la sesión/puntuación ya se consideran controladas por el cliente, igual
-- que en el resto de la app; el RLS cierra el acceso a ajenos).
DROP POLICY IF EXISTS "desafios_edicion_creador" ON public.desafios;
CREATE POLICY "desafios_edicion_creador"
  ON public.desafios FOR UPDATE TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafio_participantes dp
                    WHERE dp.desafio_id = desafios.id AND dp.usuario_id = auth.uid()))
  WITH CHECK (creador_id = auth.uid()
              OR public.es_owner()
              OR EXISTS (SELECT 1 FROM public.desafio_participantes dp
                         WHERE dp.desafio_id = desafios.id AND dp.usuario_id = auth.uid()));

-- Borrar: solo el creador (u owner)
DROP POLICY IF EXISTS "desafios_borrado_creador" ON public.desafios;
CREATE POLICY "desafios_borrado_creador"
  ON public.desafios FOR DELETE TO authenticated
  USING (creador_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafios TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) DESAFIO_PARTICIPANTES: políticas (secciones 18 de 028-C)
-- ----------------------------------------------------------------------------
ALTER TABLE public.desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON public.desafio_participantes;

-- Lectura: el propio participante, el creador del desafío u owner
DROP POLICY IF EXISTS "desafio_participantes_lectura" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_lectura"
  ON public.desafio_participantes FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Insert: el creador invita (inserta rivales) y cada usuario solo puede
-- unirse como él mismo
DROP POLICY IF EXISTS "desafio_participantes_insert" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_insert"
  ON public.desafio_participantes FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Update: el propio participante (acepta/juega/termina/abandona), el creador
-- u owner. El auto-abandono de vencidos va por RPC (ver más abajo).
DROP POLICY IF EXISTS "desafio_participantes_update" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_update"
  ON public.desafio_participantes FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()))
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Delete: el propio participante, el creador u owner
DROP POLICY IF EXISTS "desafio_participantes_delete" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_delete"
  ON public.desafio_participantes FOR DELETE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafio_participantes TO authenticated;

-- ----------------------------------------------------------------------------
-- 4) RPC desafio_abandonar_vencidos: abandona en servidor a quien no terminó
--    dentro del límite + margen (30 s). Solo un participante/creador/owner del
--    propio desafío puede invocarla.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desafio_abandonar_vencidos(p_desafio_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_afectados INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.desafio_participantes
    WHERE desafio_id = p_desafio_id AND usuario_id = auth.uid()
  ) AND NOT public.es_owner() AND NOT EXISTS (
    SELECT 1 FROM public.desafios WHERE id = p_desafio_id AND creador_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No participas en este desafío';
  END IF;

  UPDATE public.desafio_participantes dp
     SET estado = 'abandonado'
    FROM public.desafios d
   WHERE dp.desafio_id = p_desafio_id
     AND d.id = p_desafio_id
     AND d.estado = 'en_curso'
     AND dp.estado IN ('aceptado', 'en_juego')
     AND d.iniciado_en IS NOT NULL
     AND now() > d.iniciado_en + (d.tiempo_limite_seg + 30) * interval '1 second';
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RETURN v_afectados;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desafio_abandonar_vencidos(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desafio_abandonar_vencidos(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5) NOTIFICACIONES: reparar el INSERT
-- ----------------------------------------------------------------------------
-- 5.1 `destinatario` legacy es NOT NULL sin default → el cliente nunca lo
--     rellena y todo INSERT falla. Lo dejamos nullable (la app usa
--     usuario_id). Idempotente y sin pérdida de datos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notificaciones'
               AND column_name = 'destinatario'
               AND is_nullable = 'NO') THEN
    ALTER TABLE public.notificaciones ALTER COLUMN destinatario DROP NOT NULL;
  END IF;
END $$;

-- 5.2 El CHECK de `tipo` (024) solo admite tipos legacy y bloquea los eventos
--     del servicio ('desafio.creado', 'grupo.invitacion', ...). El servicio
--     trata `tipo` como nombre de evento libre (registrar()), así que el
--     CHECK no aporta dominio: se elimina. Se conservan los CHECKs de
--     categoria/prioridad/estado (sí son dominio).
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- 5.3 Ampliar la RPC enviar_notificacion para conservar categoria/prioridad/
--     estado (hasta ahora las notificaciones ajenas caían en 'sistema').
DROP FUNCTION IF EXISTS public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.enviar_notificacion(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_cuerpo TEXT DEFAULT '',
  p_datos JSONB DEFAULT NULL,
  p_categoria TEXT DEFAULT 'sistema',
  p_prioridad TEXT DEFAULT 'media',
  p_estado TEXT DEFAULT 'nueva'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos,
                                     categoria, prioridad, estado)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_cuerpo, p_datos,
          p_categoria, p_prioridad, p_estado)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6) DESAFIO_PARTICIPANTES: columna de progreso (persistencia al recargar)
-- ----------------------------------------------------------------------------
ALTER TABLE public.desafio_participantes ADD COLUMN IF NOT EXISTS progreso JSONB DEFAULT NULL;

SELECT '✅ Migración 030 aplicada: RLS desafíos + RPC abandonar_vencidos + notificaciones reparadas' AS mensaje;
