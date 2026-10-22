-- ============================================================================
-- 076: Funciones (feature flags) para publicar secciones por etapas
-- ----------------------------------------------------------------------------
-- Cada sección nueva nace en 'oculta' y solo la ve el owner. Después puede
-- pasar a 'beta' (usuarios o clases concretas) y, por último, a 'activa'
-- (todos). El cliente pregunta por la RPC fb_funciones(), que devuelve
-- únicamente qué puede ver el usuario actual; no expone listas de testers.
--
-- Idempotente: se puede ejecutar varias veces sin errores.
--
-- Activación manual (mientras no exista el panel de administración):
--   UPDATE public.funciones SET estado = 'activa' WHERE clave = 'estudio';
-- ============================================================================

-- public.es_owner() lo define 028_auth_esquema.sql. Si falta, mejor un error
-- claro que un "function does not exist" a mitad de la migración.
DO $$
BEGIN
  IF to_regprocedure('public.es_owner()') IS NULL THEN
    RAISE EXCEPTION 'Falta public.es_owner(). Aplica primero 028_auth_esquema.sql.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.funciones (
  clave          TEXT PRIMARY KEY,
  estado         TEXT NOT NULL DEFAULT 'oculta',
  grupos         UUID[] NOT NULL DEFAULT '{}',
  usuarios       UUID[] NOT NULL DEFAULT '{}',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La tabla pudo crearse en un intento anterior sin la restricción de estado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'funciones_estado_check'
      AND conrelid = 'public.funciones'::regclass
  ) THEN
    ALTER TABLE public.funciones
      ADD CONSTRAINT funciones_estado_check
      CHECK (estado IN ('oculta', 'beta', 'activa'));
  END IF;
END;
$$;

ALTER TABLE public.funciones ENABLE ROW LEVEL SECURITY;

-- Solo el owner gestiona la tabla. El resto de usuarios no la lee directo:
-- usa la RPC, que ya resuelve beta y permisos por clase.
DROP POLICY IF EXISTS "funciones_owner" ON public.funciones;
CREATE POLICY "funciones_owner"
  ON public.funciones
  FOR ALL
  TO authenticated
  USING (public.es_owner())
  WITH CHECK (public.es_owner());

REVOKE ALL ON TABLE public.funciones FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funciones TO authenticated;

-- Semilla: el estudio guiado empieza oculto para todos salvo el owner.
INSERT INTO public.funciones (clave, estado)
VALUES ('estudio', 'oculta')
ON CONFLICT (clave) DO NOTHING;

-- RPC de consulta. Devuelve solo clave + activa (booleano), nunca el estado
-- ni los arrays de testers. El owner ve todo para poder probar en producción.
DROP FUNCTION IF EXISTS public.fb_funciones();
CREATE FUNCTION public.fb_funciones()
RETURNS TABLE (clave TEXT, activa BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.clave,
         f.estado = 'activa'
         OR public.es_owner()
         OR (
           f.estado = 'beta' AND (
             auth.uid() = ANY (f.usuarios)
             OR EXISTS (
               SELECT 1
               FROM public.miembros_grupo m
               WHERE m.usuario_id = auth.uid()
                 AND m.grupo_id = ANY (f.grupos)
             )
           )
         )
  FROM public.funciones f;
$$;

REVOKE ALL ON FUNCTION public.fb_funciones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fb_funciones() TO authenticated;

SELECT '✅ Migración 076 aplicada: funciones (feature flags)' AS mensaje;
