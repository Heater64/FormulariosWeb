import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/075_examen_columna_auto_en_rejilla.sql');

describe('el examen vinculado aparece solo en la rejilla (075)', () => {
  test('las columnas automáticas se marcan sin tocar las manuales', () => {
    expect(migracion).toContain('ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT FALSE');
  });

  test('backfill: crea la columna examen si la evaluación aún no la tiene', () => {
    expect(migracion).toContain("tipo, examen_id, nombre, posicion, auto");
    expect(migracion).toContain("c.tipo = 'examen'");
    expect(migracion).toContain('AND c.examen_id = ex.id');
    // Sin duplicar la que el profesor ya añadió a mano.
    expect(migracion).toContain('NOT EXISTS');
  });

  test('trigger: vincular, desvincular, renombrar y borrar mantienen la columna', () => {
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.fb_examen_sincronizar_columna_rejilla()');
    expect(migracion).toContain('CREATE TRIGGER trg_examen_columna_rejilla');
    expect(migracion).toContain('AFTER INSERT OR UPDATE OF evaluacion_id, titulo OR DELETE ON public.examenes_personalizados');
    // Solo columnas automáticas: las manuales no se borran ni renombran solas.
    expect(migracion).toContain('AND auto = TRUE');
    // Solo trabaja cuando el vínculo o el título cambian de verdad.
    expect(migracion).toContain('IS DISTINCT FROM');
  });

  test('la función del trigger no abre permisos nuevos', () => {
    expect(migracion).toContain('SECURITY DEFINER');
    expect(migracion).toContain('SET search_path = public, pg_temp');
    expect(migracion).toContain('REVOKE ALL ON FUNCTION public.fb_examen_sincronizar_columna_rejilla() FROM PUBLIC, anon, authenticated');
    const concesiones = migracion.split('\n').filter((l) => /^GRANT/.test(l.trim()));
    expect(concesiones).toEqual([]);
  });

  test('refuerzo de nombres: sin alumno_nombre la celda automática no empareja', () => {
    expect(migracion).toContain('UPDATE public.intentos_examen_personalizado i');
    expect(migracion).toContain('WHERE i.alumno_id = p.id');
    expect(migracion).toContain("coalesce(btrim(i.alumno_nombre), '') = ''");
  });
});
