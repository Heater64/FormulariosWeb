-- ============================================================
-- FormsBiblicos — Migración 040
-- Sistema de clases estilo Classroom: instituciones + código de clase
-- ------------------------------------------------------------
-- Qué cambia:
--   1. Nueva tabla `instituciones`: cada organización (iglesia, colegio,
--      seminario...) vive en la plataforma con su propio administrador.
--   2. `grupos.institucion_id`: las clases pertenecen a una institución.
--   3. `grupos.codigo`: código de clase único (p. ej. "BIB123") para
--      unirse, como el código de clase de Google Classroom. Se acaba el
--      directorio abierto: se entra con el código que comparte el profesor.
--   4. RPC `unirse_con_codigo`: busca la clase por código e inserta la
--      membresía (SECURITY DEFINER: el código no se expone por RLS).
--
-- RLS: la app usa Supabase Auth (políticas para authenticated, ver 028).
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLA instituciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instituciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  admin_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instituciones_admin ON public.instituciones(admin_id);

-- ------------------------------------------------------------
-- 2. grupos: institución + código de clase
-- ------------------------------------------------------------
ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS institucion_id UUID REFERENCES public.instituciones(id) ON DELETE SET NULL;
ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Código único, sin caracteres ambiguos (0/O/1/I)
CREATE UNIQUE INDEX IF NOT EXISTS idx_grupos_codigo ON public.grupos(codigo) WHERE codigo IS NOT NULL;

-- Asignar un código a las clases existentes (para que el flujo de
-- unirse por código funcione desde el primer día).
DO $$
DECLARE
  r RECORD;
  v_codigo TEXT;
  v_intentos INTEGER;
  v_alfabeto TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 32 chars, sin ambiguos
BEGIN
  FOR r IN SELECT id FROM public.grupos WHERE codigo IS NULL LOOP
    v_intentos := 0;
    LOOP
      v_intentos := v_intentos + 1;
      v_codigo := '';
      FOR i IN 1..6 LOOP
        v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * 32)::int, 1);
      END LOOP;
      EXIT WHEN v_intentos > 20 OR NOT EXISTS (
        SELECT 1 FROM public.grupos WHERE codigo = v_codigo
      );
    END LOOP;
    UPDATE public.grupos SET codigo = v_codigo WHERE id = r.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. RLS instituciones
-- ------------------------------------------------------------
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver las instituciones (nombres,
-- para las tarjetas de clase). Los datos internos de cada institución
-- siguen aislados por las políticas de grupos/miembros existentes.
DROP POLICY IF EXISTS "instituciones_select" ON public.instituciones;
CREATE POLICY "instituciones_select"
  ON public.instituciones FOR SELECT TO authenticated USING (true);

-- Crear una institución: el creador pasa a ser su administrador (o el owner)
DROP POLICY IF EXISTS "instituciones_insert" ON public.instituciones;
CREATE POLICY "instituciones_insert"
  ON public.instituciones FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() OR public.es_owner());

-- Gestionar: solo el admin de la institución o el owner
DROP POLICY IF EXISTS "instituciones_update" ON public.instituciones;
CREATE POLICY "instituciones_update"
  ON public.instituciones FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() OR public.es_owner())
  WITH CHECK (admin_id = auth.uid() OR public.es_owner());

DROP POLICY IF EXISTS "instituciones_delete" ON public.instituciones;
CREATE POLICY "instituciones_delete"
  ON public.instituciones FOR DELETE TO authenticated
  USING (admin_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instituciones TO authenticated;

-- ------------------------------------------------------------
-- 4. RPC unirse_con_codigo
-- ------------------------------------------------------------
-- Busca la clase por su código e inserta la membresía como 'miembro'.
-- SECURITY DEFINER: permite leer grupos por código sin exponerlo en el
-- SELECT de grupos (que solo ven los miembros), igual que el flujo admin.
CREATE OR REPLACE FUNCTION public.unirse_con_codigo(p_codigo TEXT)
RETURNS UUID AS $$
DECLARE
  v_grupo_id UUID;
BEGIN
  SELECT g.id INTO v_grupo_id
  FROM public.grupos g
  WHERE g.codigo = upper(btrim(p_codigo));

  IF v_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Código de clase no válido';
  END IF;

  -- No duplicar membresía (UNIQUE grupo_id+usuario_id)
  INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo)
  VALUES (v_grupo_id, auth.uid(), 'miembro')
  ON CONFLICT (grupo_id, usuario_id) DO NOTHING;

  RETURN v_grupo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.unirse_con_codigo(TEXT) TO authenticated, anon;

SELECT '✅ Migración 040 aplicada: clases + instituciones + código' AS mensaje;
