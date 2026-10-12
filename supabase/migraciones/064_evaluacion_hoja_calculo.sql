-- ============================================================================
-- 064_evaluacion_hoja_calculo.sql
-- ----------------------------------------------------------------------------
-- Rediseño de la rejilla de Evaluaciones como hoja de cálculo. Reutiliza el
-- modelo 060/061/062 (evaluaciones, evaluaciones_columnas, evaluaciones_notas)
-- y añade SOLO lo que la interfaz nueva necesita y no cabe en el modelo actual:
--
--  1) FILAS DE ALUMNOS PERSISTENTES Y ORDENADAS. Hoy las filas se derivan de
--     los intentos y de las notas manuales: no se puede añadir un alumno sin
--     datos (desaparecería al recargar) ni ordenarlas («Añadir alumno
--     encima/debajo» exige posición). Tabla `evaluaciones_alumnos` con
--     `posicion` y `oculto` (tumba para eliminar una fila derivada sin borrar
--     los intentos del examen, que son datos del alumno y no se tocan).
--     Una evaluación que nunca ha tocado sus filas tiene la tabla vacía y la
--     rejilla se deriva igual que antes → las evaluaciones existentes no
--     cambian ni se migran.
--
--  2) PONDERACIONES. `evaluaciones_columnas.peso` (NULL = mismo peso que las
--     demás). La media final pasa a SUM(nota*peso)/SUM(peso) sobre las celdas
--     CON nota; con todos los pesos NULL esa expresión es exactamente la media
--     aritmética de siempre, así que el resultado de las evaluaciones
--     actuales no cambia. Las celdas vacías/pendientes siguen sin contar (no
--     se convierten en ceros).
--
--  3) RANGO CONFIGURADO. `evaluaciones.nota_max` (por defecto 10). El servidor
--     valida y limita con ese valor en lugar del 10 fijo.
--
-- No se crea ningún otro motor de cálculo ni tabla de notas: celdas siguen
-- siendo evaluaciones_notas y el valor automático sigue viniendo del último
-- intento corregido. Sin triggers sobre el flujo del alumno.
--
-- Autorización: igual que 060-062 — RLS activa, sin acceso directo a tablas,
-- todo por RPC SECURITY DEFINER con fb_evaluacion_validar (IS DISTINCT FROM,
-- ver 062). Idempotente: se puede aplicar sobre una BD con la 060-062 puestas.
-- ============================================================================

-- ── 1) Columnas nuevas ─────────────────────────────────────────────────────
ALTER TABLE public.evaluaciones ADD COLUMN IF NOT EXISTS nota_max NUMERIC NOT NULL DEFAULT 10;
ALTER TABLE public.evaluaciones_columnas ADD COLUMN IF NOT EXISTS peso NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_nota_max_positiva'
  ) THEN
    ALTER TABLE public.evaluaciones
      ADD CONSTRAINT evaluaciones_nota_max_positiva CHECK (nota_max > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_columnas_peso_positivo'
  ) THEN
    ALTER TABLE public.evaluaciones_columnas
      ADD CONSTRAINT evaluaciones_columnas_peso_positivo CHECK (peso IS NULL OR peso > 0);
  END IF;
END $$;

-- ── 2) Filas de alumnos (orden + visibilidad) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluaciones_alumnos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  -- clave normalizada igual que el resto de joins: lower(btrim(alumno))
  clave         TEXT NOT NULL,
  alumno        TEXT NOT NULL,
  posicion      INTEGER,               -- NULL = tumba (fila eliminada)
  oculto        BOOLEAN NOT NULL DEFAULT false,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluaciones_alumnos ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluaciones_alumnos_clave
  ON public.evaluaciones_alumnos(evaluacion_id, clave);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_alumnos_orden
  ON public.evaluaciones_alumnos(evaluacion_id, posicion);

-- Ningún cliente toca la tabla directamente: solo la RPC.
REVOKE ALL ON public.evaluaciones_alumnos FROM anon, authenticated;

-- ── 3) Alumnos derivados (intentos ∪ notas), función interna ────────────────
-- La misma derivación que ya usaba fb_evaluacion_obtener: los nombres que
-- aparecen solos por los intentos de los exámenes de la rejilla y por las
-- notas manuales. Solo la llaman las RPC SECURITY DEFINER de esta migración,
-- por eso se revoca el EXECUTE al público.
CREATE OR REPLACE FUNCTION public.fb_evaluacion_alumnos_derivados(p_id UUID)
RETURNS TABLE (c_alumno TEXT, n_alumno TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT clave, min(nombre) FROM (
      SELECT lower(btrim(i.alumno_nombre)) AS clave, i.alumno_nombre AS nombre
      FROM public.evaluaciones_columnas cx
      JOIN public.intentos_examen_personalizado i
        ON cx.tipo = 'examen' AND cx.examen_id IS NOT NULL
       AND i.examen_id = cx.examen_id
       AND btrim(coalesce(i.alumno_nombre, '')) <> ''
      WHERE cx.evaluacion_id = p_id
      UNION
      SELECT lower(btrim(n.alumno)), n.alumno
      FROM public.evaluaciones_notas n
      WHERE n.evaluacion_id = p_id AND btrim(coalesce(n.alumno, '')) <> ''
    ) a
    GROUP BY clave;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_alumnos_derivados(UUID) FROM PUBLIC, anon, authenticated;

-- ── 4) Sincronización de filas (añadir encima/debajo, eliminar) ─────────────
-- El cliente manda SIEMPRE la lista completa y visible en su orden (mismo
-- contrato que fb_evaluacion_columnas_guardar). El servidor:
--   · materializa cada nombre con su posicion (lo que estaba derivado pasa a
--     fila explícita, así el orden se conserva al recargar),
--   · marca como oculto lo que estaba visible y ya no viene en la lista (la
--     fila desaparece pero sus intentos siguen intactos),
--   · borra las notas manuales de las filas eliminadas (el diálogo de la
--     interfaz avisa antes y pide confirmación si había datos).
-- Importante: enviar una lista incompleta oculta filas —el editor siempre
-- envía lo que ve, igual que ya hacía con las columnas.
CREATE OR REPLACE FUNCTION public.fb_evaluacion_alumnos_guardar(
  p_id UUID,
  p_alumnos JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  k INTEGER;
  v_alumno TEXT;
  v_clave TEXT;
  v_lista TEXT[] := ARRAY[]::TEXT[];
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  IF jsonb_typeof(coalesce(p_alumnos, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Formato de alumnos no válido';
  END IF;

  FOR k IN 0 .. jsonb_array_length(p_alumnos) - 1 LOOP
    v_alumno := left(btrim(coalesce(p_alumnos ->> k, '')), 200);
    CONTINUE WHEN v_alumno = '';
    v_clave := lower(v_alumno);
    -- Duplicado en la lista: manda la primera aparición (conserva su posición)
    CONTINUE WHEN v_clave = ANY (v_lista);
    v_lista := v_lista || v_clave;
    INSERT INTO public.evaluaciones_alumnos (evaluacion_id, clave, alumno, posicion, oculto)
    VALUES (p_id, v_clave, v_alumno, k, false)
    ON CONFLICT (evaluacion_id, clave)
    DO UPDATE SET alumno = EXCLUDED.alumno,
                  posicion = EXCLUDED.posicion,
                  oculto = false,
                  actualizado_en = now();
  END LOOP;

  -- Lo que hoy se veía y ya no viene en la lista queda oculto.
  UPDATE public.evaluaciones_alumnos
     SET oculto = true, actualizado_en = now()
   WHERE evaluacion_id = p_id AND NOT oculto
     AND NOT (clave = ANY (v_lista));

  -- Los alumnos derivados (intentos) que no se listan se tumban también:
  -- si no, volverían a aparecer en la siguiente carga.
  INSERT INTO public.evaluaciones_alumnos (evaluacion_id, clave, alumno, posicion, oculto)
  SELECT p_id, d.c_alumno, left(d.n_alumno, 200), NULL, true
  FROM public.fb_evaluacion_alumnos_derivados(p_id) d
  WHERE NOT (d.c_alumno = ANY (v_lista))
  ON CONFLICT (evaluacion_id, clave)
  DO UPDATE SET oculto = true, actualizado_en = now();

  -- Notas manuales (y anulaciones de nota final) de las filas eliminadas.
  DELETE FROM public.evaluaciones_notas n
  USING public.evaluaciones_alumnos a
  WHERE a.evaluacion_id = p_id AND a.oculto
    AND n.evaluacion_id = p_id
    AND lower(btrim(n.alumno)) = a.clave;

  UPDATE public.evaluaciones SET actualizado_en = now() WHERE id = p_id;

  RETURN jsonb_build_object(
    'alumnos', coalesce(array_length(v_lista, 1), 0),
    'ocultos', (SELECT count(*) FROM public.evaluaciones_alumnos
                 WHERE evaluacion_id = p_id AND oculto)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_alumnos_guardar(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_alumnos_guardar(UUID, JSONB) TO authenticated;

-- ── 5) Listado: num_alumnos cuenta también las filas manuales ───────────────
CREATE OR REPLACE FUNCTION public.fb_evaluaciones_listar()
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'descripcion', e.descripcion,
      'fecha', e.fecha,
      'grupo_id', e.grupo_id,
      'orden', e.orden,
      'creado_en', e.creado_en,
      'actualizado_en', e.actualizado_en,
      'nota_max', e.nota_max,
      'num_columnas', (SELECT count(*) FROM public.evaluaciones_columnas c WHERE c.evaluacion_id = e.id),
      'num_alumnos', (
        SELECT count(DISTINCT k) FROM (
          SELECT a.clave AS k
          FROM public.evaluaciones_alumnos a
          WHERE a.evaluacion_id = e.id AND NOT a.oculto
          UNION
          SELECT lower(btrim(n.alumno))
          FROM public.evaluaciones_notas n
          WHERE n.evaluacion_id = e.id
            AND NOT EXISTS (
              SELECT 1 FROM public.evaluaciones_alumnos a2
              WHERE a2.evaluacion_id = e.id
                AND a2.clave = lower(btrim(n.alumno))
            )
        ) t
      )
    )
    FROM public.evaluaciones e
    WHERE ((e.creado_por IS NOT NULL AND e.creado_por = auth.uid()) OR public.es_owner())
      -- La rejilla solo gestiona evaluaciones sin grupo asignado: las de un
      -- grupo siguen siendo responsabilidad de la vista de grupos.
      AND e.grupo_id IS NULL
    ORDER BY e.fecha DESC NULLS LAST, e.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluaciones_listar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluaciones_listar() TO authenticated;

-- ── 6) Alta con rango configurable ──────────────────────────────────────────
-- Cambia la firma (añade p_nota_max): se elimina la versión de 4 argumentos
-- para que no queden dos sobrecargas ambiguas.
DROP FUNCTION IF EXISTS public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.fb_evaluacion_actualizar(
  p_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT '',
  p_fecha DATE DEFAULT NULL,
  p_nota_max NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  IF p_nota_max IS NOT NULL AND p_nota_max <= 0 THEN
    RAISE EXCEPTION 'El rango de la evaluación debe ser mayor que 0';
  END IF;
  UPDATE public.evaluaciones
     SET titulo = left(btrim(coalesce(p_nombre, ev.titulo)), 160),
         descripcion = left(coalesce(p_descripcion, ''), 2000),
         fecha = p_fecha,
         nota_max = coalesce(p_nota_max, ev.nota_max),
         actualizado_en = now()
   WHERE id = p_id
   RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE, NUMERIC) TO authenticated;

-- ── 7) Columnas con peso ────────────────────────────────────────────────────
-- Igual que la 061, más el peso. Si el elemento no trae la clave «peso»
-- (cliente anterior sin esa clave), se conserva el peso que ya tenía la columna.
CREATE OR REPLACE FUNCTION public.fb_evaluacion_columnas_guardar(p_id UUID, p_columnas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  elem JSONB;
  v_id UUID;
  v_examen UUID;
  v_peso NUMERIC;
  v_peso_txt TEXT;
  v_ids UUID[] := ARRAY[]::UUID[];
  k INTEGER;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  IF jsonb_typeof(coalesce(p_columnas, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Formato de columnas no válido';
  END IF;

  FOR k IN 0 .. jsonb_array_length(p_columnas) - 1 LOOP
    elem := p_columnas -> k;
    IF coalesce(elem ->> 'nombre', '') = '' THEN
      RAISE EXCEPTION 'Cada columna necesita nombre';
    END IF;
    v_examen := nullif(elem ->> 'examen_id', '')::uuid;

    -- Peso: NULL (mismo peso que las demás) o número > 0.
    v_peso_txt := nullif(btrim(coalesce(elem ->> 'peso', '')), '');
    IF v_peso_txt IS NULL THEN
      v_peso := NULL;
    ELSIF v_peso_txt !~ '^[0-9]+([.,][0-9]+)?$' THEN
      RAISE EXCEPTION 'El peso de «%» no es un número válido', elem ->> 'nombre';
    ELSE
      v_peso := replace(v_peso_txt, ',', '.')::numeric;
      IF v_peso <= 0 THEN
        RAISE EXCEPTION 'El peso de «%» debe ser mayor que 0', elem ->> 'nombre';
      END IF;
    END IF;

    v_id := NULL;
    IF elem ->> 'id' IS NOT NULL THEN
      UPDATE public.evaluaciones_columnas
         SET nombre = left(btrim(elem ->> 'nombre'), 160),
             tipo = elem ->> 'tipo',
             examen_id = v_examen,
             posicion = k,
             -- Sin clave «peso» en el elemento se conserva el valor actual.
             peso = CASE WHEN elem ? 'peso' THEN v_peso ELSE evaluaciones_columnas.peso END
       WHERE id = (elem ->> 'id')::uuid AND evaluacion_id = p_id
       RETURNING id INTO v_id;
    END IF;
    IF v_id IS NULL THEN
      INSERT INTO public.evaluaciones_columnas (evaluacion_id, tipo, examen_id, nombre, posicion, peso)
      VALUES (p_id, elem ->> 'tipo', v_examen, left(btrim(elem ->> 'nombre'), 160), k,
              CASE WHEN elem ? 'peso' THEN v_peso ELSE NULL END)
      RETURNING id INTO v_id;
    END IF;
    -- Enlace clásico 009: el examen pasa a pertenecer a esta evaluación.
    IF v_examen IS NOT NULL THEN
      UPDATE public.examenes_personalizados SET evaluacion_id = p_id WHERE id = v_examen;
    END IF;
    v_ids := v_ids || v_id;
  END LOOP;

  -- Lo que ya no está en la lista se borra (sus notas manuales caen en cascada)
  -- y su examen deja de estar vinculado a esta evaluación.
  FOR v_examen IN
    SELECT c.examen_id FROM public.evaluaciones_columnas c
    WHERE c.evaluacion_id = p_id AND c.examen_id IS NOT NULL
      AND NOT (c.id = ANY (v_ids))
  LOOP
    UPDATE public.examenes_personalizados
       SET evaluacion_id = NULL
     WHERE id = v_examen AND evaluacion_id = p_id;
  END LOOP;

  DELETE FROM public.evaluaciones_columnas
   WHERE evaluacion_id = p_id AND NOT (id = ANY (v_ids));

  UPDATE public.evaluaciones SET actualizado_en = now() WHERE id = p_id;

  RETURN jsonb_build_object(
    'columnas', (
      SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.posicion), '[]'::jsonb)
      FROM public.evaluaciones_columnas c WHERE c.evaluacion_id = p_id
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_columnas_guardar(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_columnas_guardar(UUID, JSONB) TO authenticated;

-- ── 8) Celda validada contra el rango configurado ───────────────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_celda_guardar(
  p_id UUID,
  p_columna_id UUID,
  p_alumno TEXT,
  p_nota NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  v_alumno TEXT := btrim(coalesce(p_alumno, ''));
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  IF v_alumno = '' THEN
    RAISE EXCEPTION 'La celda necesita alumno';
  END IF;
  IF p_columna_id IS NOT NULL THEN
    PERFORM 1 FROM public.evaluaciones_columnas WHERE id = p_columna_id AND evaluacion_id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La columna no pertenece a esta evaluación';
    END IF;
  END IF;
  IF p_nota IS NOT NULL AND (p_nota < 0 OR p_nota > ev.nota_max) THEN
    RAISE EXCEPTION 'La nota debe estar entre 0 y %', ev.nota_max;
  END IF;

  IF p_nota IS NULL THEN
    -- Se libera la celda: vuelve al valor automático del examen.
    DELETE FROM public.evaluaciones_notas
     WHERE evaluacion_id = p_id AND columna_id IS NOT DISTINCT FROM p_columna_id
       AND lower(btrim(alumno)) = lower(v_alumno);
  ELSIF p_columna_id IS NULL THEN
    -- Nota final anulada: restricción única distinta (columna_id NULL).
    INSERT INTO public.evaluaciones_notas (evaluacion_id, columna_id, alumno, nota)
    VALUES (p_id, NULL, v_alumno, p_nota)
    ON CONFLICT (evaluacion_id, alumno) WHERE columna_id IS NULL
    DO UPDATE SET nota = EXCLUDED.nota, actualizado_en = now();
  ELSE
    INSERT INTO public.evaluaciones_notas (evaluacion_id, columna_id, alumno, nota)
    VALUES (p_id, p_columna_id, v_alumno, p_nota)
    ON CONFLICT (evaluacion_id, columna_id, alumno) WHERE columna_id IS NOT NULL
    DO UPDATE SET nota = EXCLUDED.nota, actualizado_en = now();
  END IF;

  UPDATE public.evaluaciones SET actualizado_en = now() WHERE id = p_id;

  RETURN jsonb_build_object(
    'alumno', v_alumno,
    'columna_id', p_columna_id,
    'nota', p_nota,
    'manual', p_nota IS NOT NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_celda_guardar(UUID, UUID, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_celda_guardar(UUID, UUID, TEXT, NUMERIC) TO authenticated;

-- ── 9) Rejilla: filas ordenadas + media ponderada + rango ───────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_obtener(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  salida JSONB;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);

  WITH columnas AS (
    SELECT c.id AS columna_id, c.tipo, c.examen_id, c.nombre, c.posicion, c.peso
    FROM public.evaluaciones_columnas c
    WHERE c.evaluacion_id = p_id
  ),
  automaticas AS (
    -- Último intento corregido de cada alumno en cada examen de la rejilla.
    SELECT DISTINCT ON (cx.columna_id, lower(btrim(i.alumno_nombre)))
           cx.columna_id,
           lower(btrim(i.alumno_nombre)) AS clave_alumno,
           i.nota
    FROM columnas cx
    JOIN public.intentos_examen_personalizado i
      ON cx.tipo = 'examen' AND cx.examen_id IS NOT NULL
     AND i.examen_id = cx.examen_id
     AND i.corregido AND i.nota IS NOT NULL
     AND btrim(coalesce(i.alumno_nombre, '')) <> ''
    ORDER BY cx.columna_id, lower(btrim(i.alumno_nombre)), i.fecha_completado DESC NULLS LAST
  ),
  explicitos AS (
    -- Filas que el profesor ha gestionado (ordenadas por posición).
    SELECT a.clave, a.alumno, a.posicion
    FROM public.evaluaciones_alumnos a
    WHERE a.evaluacion_id = p_id AND NOT a.oculto
  ),
  derivados AS (
    -- Aparecidas solas y todavía no materializadas (ni tumbadas: la función
    -- excluye toda clave presente en la tabla, visible u oculta).
    SELECT d.c_alumno AS clave, d.n_alumno AS alumno
    FROM public.fb_evaluacion_alumnos_derivados(p_id) d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.evaluaciones_alumnos a
      WHERE a.evaluacion_id = p_id AND a.clave = d.c_alumno
    )
  ),
  alumnos AS (
    SELECT clave, alumno, 0 AS grupo, posicion AS orden FROM explicitos
    UNION ALL
    SELECT clave, alumno, 1, 0 FROM derivados
  ),
  valores AS (
    SELECT al.alumno, cx.columna_id, cx.peso,
           coalesce(mn.nota, au.nota) AS nota,
           (mn.id IS NOT NULL) AS manual
    FROM alumnos al
    CROSS JOIN columnas cx
    LEFT JOIN public.evaluaciones_notas mn
      ON mn.evaluacion_id = p_id AND mn.columna_id = cx.columna_id
     AND lower(btrim(mn.alumno)) = al.clave
    LEFT JOIN automaticas au
      ON au.columna_id = cx.columna_id AND au.clave_alumno = al.clave
  ),
  finales AS (
    -- Media ponderada sobre las celdas CON nota (peso NULL = 1): si ningún
    -- peso está configurado, esto ES la media aritmética de siempre. Celdas
    -- vacías/pendientes no cuentan y nunca se convierten en 0. Sin filas con
    -- nota, sum devuelve NULL → media NULL (resultado pendiente, no cero).
    SELECT al.alumno,
           round(sum(v.nota * coalesce(v.peso, 1)) / sum(coalesce(v.peso, 1)), 2) AS media
    FROM alumnos al
    LEFT JOIN valores v ON v.alumno = al.alumno AND v.nota IS NOT NULL
    GROUP BY al.alumno
  )
  SELECT jsonb_build_object(
    'evaluacion', to_jsonb(ev),
    'columnas', (
      SELECT coalesce(jsonb_agg(to_jsonb(cx) ORDER BY cx.posicion), '[]'::jsonb)
      FROM columnas cx
    ),
    'alumnos', (
      SELECT coalesce(jsonb_agg(al.alumno ORDER BY al.grupo, al.orden NULLS LAST, al.alumno), '[]'::jsonb)
      FROM alumnos al
    ),
    'celdas', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object('alumno', v.alumno, 'columna_id', v.columna_id,
                           'nota', v.nota, 'manual', v.manual)
      ), '[]'::jsonb)
      FROM valores v WHERE v.nota IS NOT NULL
    ),
    'finales', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'alumno', f.alumno,
          'nota', coalesce(mn.nota, f.media),
          'manual', mn.id IS NOT NULL,
          'media', f.media
        ) ORDER BY f.alumno
      ), '[]'::jsonb)
      FROM finales f
      LEFT JOIN public.evaluaciones_notas mn
        ON mn.evaluacion_id = p_id AND mn.columna_id IS NULL
       AND lower(btrim(mn.alumno)) = lower(f.alumno)
    )
  ) INTO salida;

  RETURN salida;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_obtener(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_obtener(UUID) TO authenticated;

-- ── 10) Importación limitada al rango configurado ───────────────────────────
CREATE OR REPLACE FUNCTION public.fb_evaluacion_importar(
  p_id UUID,
  p_celdas JSONB DEFAULT '[]'::jsonb,
  p_finales JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  elem JSONB;
  k INTEGER;
  v_insertadas INTEGER := 0;
  v_finales INTEGER := 0;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);

  IF jsonb_typeof(coalesce(p_celdas, '[]'::jsonb)) = 'array' THEN
    FOR k IN 0 .. jsonb_array_length(p_celdas) - 1 LOOP
      elem := p_celdas -> k;
      IF btrim(coalesce(elem ->> 'alumno', '')) = '' OR elem ->> 'columna_id' IS NULL THEN
        CONTINUE;
      END IF;
      IF nullif(elem ->> 'nota', '') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.evaluaciones_notas (evaluacion_id, columna_id, alumno, nota)
      VALUES (p_id, (elem ->> 'columna_id')::uuid, btrim(elem ->> 'alumno'),
              least(ev.nota_max, greatest(0, (elem ->> 'nota')::numeric)))
      ON CONFLICT (evaluacion_id, columna_id, alumno) WHERE columna_id IS NOT NULL
      DO UPDATE SET nota = EXCLUDED.nota, actualizado_en = now();
      v_insertadas := v_insertadas + 1;
    END LOOP;
  END IF;

  IF jsonb_typeof(coalesce(p_finales, '[]'::jsonb)) = 'array' THEN
    FOR k IN 0 .. jsonb_array_length(p_finales) - 1 LOOP
      elem := p_finales -> k;
      IF btrim(coalesce(elem ->> 'alumno', '')) = '' OR nullif(elem ->> 'nota', '') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.evaluaciones_notas (evaluacion_id, columna_id, alumno, nota)
      VALUES (p_id, NULL, btrim(elem ->> 'alumno'),
              least(ev.nota_max, greatest(0, (elem ->> 'nota')::numeric)))
      ON CONFLICT (evaluacion_id, alumno) WHERE columna_id IS NULL
      DO UPDATE SET nota = EXCLUDED.nota, actualizado_en = now();
      v_finales := v_finales + 1;
    END LOOP;
  END IF;

  UPDATE public.evaluaciones SET actualizado_en = now() WHERE id = p_id;

  RETURN jsonb_build_object('celdas', v_insertadas, 'finales', v_finales);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_importar(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_importar(UUID, JSONB, JSONB) TO authenticated;

SELECT '064 aplicada: filas de alumnos ordenadas, pesos, nota_max y media ponderada en la rejilla' AS mensaje;
