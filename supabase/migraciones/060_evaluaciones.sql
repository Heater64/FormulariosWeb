-- ============================================================================
-- 060_evaluaciones.sql
-- ---------------------------------------------------------------------------
-- NOTA (rep. por la 061): esta migración asumió que `evaluaciones` era una
-- tabla nueva, pero existe desde la 009 (titulo, grupo_id, orden). El CREATE
-- TABLE IF NOT EXISTS se saltó la creación y las funciones quedaron apuntando
-- a columnas inexistentes (e.nombre). La 061_evaluaciones_reparar_modelo_009.sql
-- redeclara las RPCs contra el modelo real y añade fecha/actualizado_en.
-- ----------------------------------------------------------------------------
-- Sección Evaluaciones: el profesor agrupa varios exámenes en una evaluación
-- ("1ª Evaluación"), ve las notas de cada alumno en una rejilla tipo Excel y
-- obtiene la nota final (media de las columnas, con anulación manual).
--
-- Modelo
--   evaluaciones        → una evaluación (nombre, descripción, fecha).
--   evaluaciones_columnas → columnas de la rejilla: un examen existente
--                         (tipo 'examen', admite borradores) o una columna
--                         manual (tipo 'manual') para datos antiguos.
--   evaluaciones_notas  → SOLO lo que se escribió a mano. Una celda con fila
--                         aquí está marcada como "modificada manualmente" y
--                         por eso no se recalcula sola; si no hay fila, el
--                         valor es automático. columna_id NULL = nota final
--                         anulada a mano para ese alumno.
--
-- Automático sin tocar al alumno: la nota de una columna de examen se lee en
-- consulta desde intentos_examen_personalizado (último intento corregido de
-- cada alumno). No hay triggers sobre el flujo público: entregar un examen
-- rellena su celda en la siguiente carga de la rejilla, y un examen en
-- borrador o sin corregir simplemente aparece vacío.
--
-- Autorización: las tablas no exponen políticas RLS (todo pasa por RPCs
-- SECURITY DEFINER, igual que el resto del panel). Cada RPC comprueba
-- evaluaciones.creado_por = auth.uid() OR es_owner().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por    UUID NOT NULL DEFAULT auth.uid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT NOT NULL DEFAULT '',
  fecha         DATE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.evaluaciones_columnas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('examen', 'manual')),
  examen_id     UUID REFERENCES public.examenes_personalizados(id) ON DELETE SET NULL,
  nombre        TEXT NOT NULL,
  posicion      INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.evaluaciones_columnas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_evaluaciones_columnas_evaluacion
  ON public.evaluaciones_columnas(evaluacion_id, posicion);

CREATE TABLE IF NOT EXISTS public.evaluaciones_notas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  columna_id    UUID REFERENCES public.evaluaciones_columnas(id) ON DELETE CASCADE,
  alumno        TEXT NOT NULL,
  nota          NUMERIC(5,2),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluaciones_notas ENABLE ROW LEVEL SECURITY;
-- Una celda manual por alumno y columna; y una sola nota final anulada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluaciones_notas_celda
  ON public.evaluaciones_notas(evaluacion_id, columna_id, alumno) WHERE columna_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluaciones_notas_final
  ON public.evaluaciones_notas(evaluacion_id, alumno) WHERE columna_id IS NULL;

-- Ningún cliente toca estas tablas directamente: solo las RPC.
REVOKE ALL ON public.evaluaciones FROM anon, authenticated;
REVOKE ALL ON public.evaluaciones_columnas FROM anon, authenticated;
REVOKE ALL ON public.evaluaciones_notas FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- Comprobación de propiedad compartida por todas las RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_evaluacion_validar(p_id UUID)
RETURNS public.evaluaciones
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
BEGIN
  SELECT * INTO ev FROM public.evaluaciones WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evaluación no encontrada';
  END IF;
  IF NOT (ev.creado_por = auth.uid() OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN ev;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_validar(UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Listado y alta
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_evaluaciones_listar()
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', e.id,
      'nombre', e.nombre,
      'descripcion', e.descripcion,
      'fecha', e.fecha,
      'creado_en', e.creado_en,
      'actualizado_en', e.actualizado_en,
      'num_columnas', (SELECT count(*) FROM public.evaluaciones_columnas c WHERE c.evaluacion_id = e.id),
      'num_alumnos', (SELECT count(DISTINCT n.alumno) FROM public.evaluaciones_notas n WHERE n.evaluacion_id = e.id)
    )
    FROM public.evaluaciones e
    WHERE e.creado_por = auth.uid() OR public.es_owner()
    ORDER BY e.fecha DESC NULLS LAST, e.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluaciones_listar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluaciones_listar() TO authenticated;

CREATE OR REPLACE FUNCTION public.fb_evaluacion_crear(
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT '',
  p_fecha DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  v_nombre TEXT := btrim(coalesce(p_nombre, ''));
BEGIN
  IF v_nombre = '' THEN
    RAISE EXCEPTION 'La evaluación necesita nombre';
  END IF;
  INSERT INTO public.evaluaciones (nombre, descripcion, fecha)
  VALUES (left(v_nombre, 160), left(coalesce(p_descripcion, ''), 2000), p_fecha)
  RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_crear(TEXT, TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.fb_evaluacion_actualizar(
  p_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT '',
  p_fecha DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  UPDATE public.evaluaciones
     SET nombre = left(btrim(coalesce(p_nombre, ev.nombre)), 160),
         descripcion = left(coalesce(p_descripcion, ''), 2000),
         fecha = p_fecha,
         actualizado_en = now()
   WHERE id = p_id
   RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_actualizar(UUID, TEXT, TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.fb_evaluacion_eliminar(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
BEGIN
  ev := public.fb_evaluacion_validar(p_id);
  DELETE FROM public.evaluaciones WHERE id = p_id;
  RETURN jsonb_build_object('eliminada', true, 'id', p_id, 'nombre', ev.nombre);
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_eliminar(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_eliminar(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Columnas: se sincronizan con la lista que manda el cliente
-- [{ id opcional, tipo: 'examen'|'manual', examen_id, nombre }]
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_evaluacion_columnas_guardar(p_id UUID, p_columnas JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ev public.evaluaciones%ROWTYPE;
  elem JSONB;
  v_id UUID;
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
    IF elem ->> 'id' IS NOT NULL THEN
      UPDATE public.evaluaciones_columnas
         SET nombre = left(btrim(elem ->> 'nombre'), 160),
             tipo = elem ->> 'tipo',
             examen_id = nullif(elem ->> 'examen_id', '')::uuid,
             posicion = k
       WHERE id = (elem ->> 'id')::uuid AND evaluacion_id = p_id
       RETURNING id INTO v_id;
    END IF;
    IF v_id IS NULL THEN
      INSERT INTO public.evaluaciones_columnas (evaluacion_id, tipo, examen_id, nombre, posicion)
      VALUES (p_id, elem ->> 'tipo', nullif(elem ->> 'examen_id', '')::uuid,
              left(btrim(elem ->> 'nombre'), 160), k)
      RETURNING id INTO v_id;
    END IF;
    v_ids := v_ids || v_id;
    v_id := NULL;
  END LOOP;

  -- Lo que ya no está en la lista se borra (sus notas manuales caen en cascada).
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

-- ----------------------------------------------------------------------------
-- Celda manual: nota a mano (o NULL para volver al valor automático)
-- ----------------------------------------------------------------------------
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
  v_alumno TEXT := btrim(coalesce(p_alumno, ''));
BEGIN
  PERFORM public.fb_evaluacion_validar(p_id);
  IF v_alumno = '' THEN
    RAISE EXCEPTION 'La celda necesita alumno';
  END IF;
  IF p_columna_id IS NOT NULL THEN
    PERFORM 1 FROM public.evaluaciones_columnas WHERE id = p_columna_id AND evaluacion_id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La columna no pertenece a esta evaluación';
    END IF;
  END IF;
  IF p_nota IS NOT NULL AND (p_nota < 0 OR p_nota > 10) THEN
    RAISE EXCEPTION 'La nota debe estar entre 0 y 10';
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

-- ----------------------------------------------------------------------------
-- Rejilla: automático (último intento corregido de cada alumno) + manual
-- ----------------------------------------------------------------------------
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
    SELECT c.id AS columna_id, c.tipo, c.examen_id, c.nombre, c.posicion,
           lower(btrim(c.nombre)) AS clave_nombre
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
  alumnos AS (
    SELECT lower(btrim(a.clave_alumno)) AS clave, min(a.alumno) AS alumno
    FROM (
      SELECT i.alumno_nombre AS alumno, lower(btrim(i.alumno_nombre)) AS clave_alumno
      FROM columnas cx
      JOIN public.intentos_examen_personalizado i
        ON cx.tipo = 'examen' AND cx.examen_id IS NOT NULL AND i.examen_id = cx.examen_id
      WHERE btrim(coalesce(i.alumno_nombre, '')) <> ''
      UNION
      SELECT n.alumno, lower(btrim(n.alumno))
      FROM public.evaluaciones_notas n WHERE n.evaluacion_id = p_id
    ) a
    GROUP BY lower(btrim(a.clave_alumno))
  ),
  valores AS (
    SELECT al.alumno, cx.columna_id,
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
    SELECT al.alumno, round(avg(v.nota), 2) AS media
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
      SELECT coalesce(jsonb_agg(al.alumno ORDER BY al.alumno), '[]'::jsonb)
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
       AND lower(btrim(mn.alumno)) = lower(btrim(f.alumno))
    )
  ) INTO salida;

  RETURN salida;
END;
$$;
REVOKE ALL ON FUNCTION public.fb_evaluacion_obtener(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_evaluacion_obtener(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Importación (el cliente parsea el CSV/Excel y manda celdas ya estructuradas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_evaluacion_importar(
  p_id UUID,
  p_celdas JSONB DEFAULT '[]'::jsonb,
  p_finales JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  elem JSONB;
  k INTEGER;
  v_insertadas INTEGER := 0;
  v_finales INTEGER := 0;
BEGIN
  PERFORM public.fb_evaluacion_validar(p_id);

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
              least(10, greatest(0, (elem ->> 'nota')::numeric)))
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
              least(10, greatest(0, (elem ->> 'nota')::numeric)))
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

SELECT '060 aplicada: evaluaciones con columnas de examen/manuales, rejilla de notas y anulación manual' AS mensaje;
