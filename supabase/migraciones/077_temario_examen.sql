-- ============================================================================
-- 077: Temario de preparación del examen
-- ----------------------------------------------------------------------------
-- El profesor pega su mensaje de temario (referencias, observaciones y tareas)
-- y el cliente lo interpreta con js/dominio/temario-parser.js. El resultado
-- vive en una columna JSONB propia, NO en `config`:
--   * `config` lo devuelven las RPCs del alumno tal cual: la columna propia
--     evita exponer el temario antes de la fase 2;
--   * el trigger de versionado (048) solo cuenta cambios de preguntas,
--     config y titulo: guardar el temario no debe incrementar `version`
--     (versiona los snapshots de los intentos).
--
-- Estructura:
--   {
--     "publicado": false,
--     "texto_original": "Efesios 5:4\nGénesis 49:33; y 50:3",
--     "items": [
--       { "id": "t1", "tipo": "referencia|observacion|tarea|texto",
--         "texto": "...", "refs": [{ "libro": "...", "capitulo": 49,
--         "versiculos": "33" }], "nota": "", "orden": 0, "estado": "ok|revisar" }
--     ]
--   }
--
-- Permisos: la tabla ya tiene GRANT a nivel de tabla y RLS de fila
-- (examenes_edicion_profesor_*): quien puede editar el examen edita su
-- temario. Las RPCs del alumno NO se tocan en la v1.
--
-- Idempotente: se puede ejecutar varias veces sin errores.
-- ============================================================================

ALTER TABLE public.examenes_personalizados
  ADD COLUMN IF NOT EXISTS temario JSONB DEFAULT NULL;

COMMENT ON COLUMN public.examenes_personalizados.temario IS
  'Temario de preparación (parser de texto del profesor). NULL = sin temario. No se expone a alumnos hasta la fase 2.';

-- Semilla de la bandera (AGENTS.md §Procedimiento 1). Se omite con aviso si
-- la 076 (tabla funciones) todavía no está aplicada: mejor un NOTICE claro
-- que un error a mitad de la migración.
DO $$
BEGIN
  IF to_regclass('public.funciones') IS NULL THEN
    RAISE NOTICE '076 no aplicada: se omite la semilla de la bandera temario';
    RETURN;
  END IF;

  INSERT INTO public.funciones (clave, estado)
  VALUES ('temario', 'oculta')
  ON CONFLICT (clave) DO NOTHING;
END;
$$;

SELECT '✅ Migración 077 aplicada: temario de examen (columna + bandera)' AS mensaje;
