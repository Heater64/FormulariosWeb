-- ==============================================================================
-- MIGRACIÓN 075: el examen vinculado a una evaluación aparece solo en la rejilla
-- ==============================================================================
-- MOTIVO
--   En el editor hay un desplegable «Evaluación» («pertenece a la evaluación
--   1») que guarda examenes_personalizados.evaluacion_id. Pero la rejilla de
--   Evaluaciones (el excel: evaluaciones_columnas + fb_evaluacion_obtener)
--   IGNORA esa columna: solo muestra columnas creadas a mano dentro de cada
--   evaluación. Resultado: el profesor vincula el examen, corrige, la nota
--   sale en la cuenta del alumno… y la evaluación 1 sigue sin columna.
--
-- MODELO
--   · evaluaciones_columnas.auto (BOOLEAN, por defecto FALSE): marca las
--     columnas creadas automáticamente por este sistema. Las manuales no se
--     tocan nunca (ni se borran ni se renombran solas).
--   · Backfill: por cada examen con evaluacion_id que apunte a una evaluación
--     existente, crea la columna tipo='examen' si aún no existe (sin duplicar
--     la que el profesor ya añadió a mano).
--   · Trigger en examenes_personalizados: al vincular/desvincular/renombrar
--     un examen se crea, borra o renombra SU columna automática. Solo actúa
--     cuando evaluacion_id o titulo cambian de verdad (el autoguardado del
--     editor no genera trabajo inútil).
--   · Refuerzo de nombres (idempotente, igual que la 073): los intentos con
--     cuenta pero sin alumno_nombre se rellenan desde perfiles. La rejilla
--     empareja por NOMBRE (lower(btrim(alumno_nombre)) = clave de la fila),
--     así que sin nombre la celda automática nunca se llena aunque haya nota.
--
-- SEGURIDAD
--   · La función del trigger es SECURITY DEFINER (las tablas de la rejilla
--     tienen REVOKE ALL + RLS sin políticas: solo las RPC las tocan).
--   · Sin cambios de permisos ni GRANT nuevos a anon/authenticated.
--
-- IDEMPOTENTE Y NO DESTRUCTIVA: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE,
-- DROP TRIGGER IF EXISTS, INSERT con NOT EXISTS y UPDATE solo de celdas
-- vacías; no borra columnas manuales ni notas.
--
-- COMO APLICAR: pegar en el SQL editor de Supabase y ejecutar. Requiere la
-- 060 (tabla evaluaciones_columnas) y la 056 (columnas alumno_nombre).
-- ==============================================================================

-- ── 1. Marca de columna automática ───────────────────────────────────────────
ALTER TABLE public.evaluaciones_columnas
  ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Backfill: columnas automáticas para los exámenes ya vinculados ────────
-- (la fila numera dentro de cada evaluación para no repetir posicion entre
-- las columnas nuevas de la misma sentencia).
WITH nuevas AS (
  SELECT ex.evaluacion_id, ex.id, ex.titulo,
         ROW_NUMBER() OVER (PARTITION BY ex.evaluacion_id ORDER BY ex.titulo, ex.id) AS fila
  FROM public.examenes_personalizados ex
  JOIN public.evaluaciones ev ON ev.id = ex.evaluacion_id
  WHERE ex.evaluacion_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.evaluaciones_columnas c
      WHERE c.evaluacion_id = ex.evaluacion_id
        AND c.tipo = 'examen'
        AND c.examen_id = ex.id
    )
)
INSERT INTO public.evaluaciones_columnas (evaluacion_id, tipo, examen_id, nombre, posicion, auto)
SELECT n.evaluacion_id, 'examen', n.id, n.titulo,
       coalesce((SELECT max(c.posicion) FROM public.evaluaciones_columnas c
                  WHERE c.evaluacion_id = n.evaluacion_id), -1) + n.fila,
       TRUE
FROM nuevas n;

-- ── 3. Trigger: vincular/desvincular/renombrar mantiene la columna ───────────
CREATE OR REPLACE FUNCTION public.fb_examen_sincronizar_columna_rejilla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  -- Borrado del examen: se van sus columnas automáticas (las manuales quedan
  -- como estaban; el examen_id pasa a NULL por el ON DELETE SET NULL).
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.evaluaciones_columnas
    WHERE examen_id = OLD.id AND auto = TRUE;
    RETURN OLD;
  END IF;

  -- Desvinculado (antes en una evaluación, ahora en otra o en ninguna):
  -- se retira la columna automática de la evaluación anterior.
  IF TG_OP = 'UPDATE'
    AND OLD.evaluacion_id IS NOT NULL
    AND OLD.evaluacion_id IS DISTINCT FROM NEW.evaluacion_id THEN
    DELETE FROM public.evaluaciones_columnas
    WHERE evaluacion_id = OLD.evaluacion_id
      AND examen_id = OLD.id
      AND auto = TRUE;
  END IF;

  -- Vinculado: la evaluación gana la columna si no la tiene ya (ni manual
  -- ni automática). Sin la evaluación, no hay nada que sincronizar.
  IF NEW.evaluacion_id IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.evaluacion_id IS DISTINCT FROM NEW.evaluacion_id)
    AND EXISTS (SELECT 1 FROM public.evaluaciones WHERE id = NEW.evaluacion_id) THEN
    SELECT coalesce(max(posicion), -1) + 1 INTO v_max
      FROM public.evaluaciones_columnas
      WHERE evaluacion_id = NEW.evaluacion_id;
    INSERT INTO public.evaluaciones_columnas (evaluacion_id, tipo, examen_id, nombre, posicion, auto)
    SELECT NEW.evaluacion_id, 'examen', NEW.id, NEW.titulo, v_max, TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM public.evaluaciones_columnas c
      WHERE c.evaluacion_id = NEW.evaluacion_id
        AND c.tipo = 'examen'
        AND c.examen_id = NEW.id
    );
  END IF;

  -- Renombrado: la columna automática sigue el título del examen.
  IF TG_OP = 'UPDATE'
    AND NEW.evaluacion_id IS NOT NULL
    AND OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    UPDATE public.evaluaciones_columnas
    SET nombre = NEW.titulo
    WHERE evaluacion_id = NEW.evaluacion_id
      AND examen_id = NEW.id
      AND auto = TRUE;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_examen_sincronizar_columna_rejilla() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_examen_columna_rejilla ON public.examenes_personalizados;
CREATE TRIGGER trg_examen_columna_rejilla
AFTER INSERT OR UPDATE OF evaluacion_id, titulo OR DELETE ON public.examenes_personalizados
FOR EACH ROW EXECUTE FUNCTION public.fb_examen_sincronizar_columna_rejilla();

-- ── 4. Refuerzo de nombres: sin alumno_nombre la celda automática no empareja ─
UPDATE public.intentos_examen_personalizado i
SET alumno_nombre = nullif(btrim(coalesce(p.nombre_completo, p.username, '')), ''),
    alumno_grupo = coalesce(g.nombre, '')
FROM public.perfiles p
LEFT JOIN public.grupos g ON g.id = p.grupo_id
WHERE i.alumno_id = p.id
  AND i.alumno_id IS NOT NULL
  AND coalesce(btrim(i.alumno_nombre), '') = ''
  AND nullif(btrim(coalesce(p.nombre_completo, p.username, '')), '') IS NOT NULL;

SELECT '075 aplicada: el examen vinculado crea su columna en la rejilla (con trigger) y se refuerzan nombres' AS mensaje;
