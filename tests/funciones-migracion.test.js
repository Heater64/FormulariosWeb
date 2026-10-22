import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/076_funciones.sql');

describe('funciones (feature flags) — migración 076', () => {
  test('la tabla se puede crear y replantear sin errores', () => {
    expect(migracion).toContain('CREATE TABLE IF NOT EXISTS public.funciones');
    expect(migracion).toContain('DROP POLICY IF EXISTS "funciones_owner" ON public.funciones');
    expect(migracion).toContain('CREATE POLICY "funciones_owner"');
    expect(migracion).toContain('ALTER TABLE public.funciones ENABLE ROW LEVEL SECURITY');
  });

  test('el owner gestiona la tabla y el resto solo pasa por la RPC', () => {
    expect(migracion).toContain('USING (public.es_owner())');
    expect(migracion).toContain('WITH CHECK (public.es_owner())');
    expect(migracion).toContain('REVOKE ALL ON TABLE public.funciones FROM anon');
    expect(migracion).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funciones TO authenticated');
  });

  test('siembra estudio en oculta sin pisar un estado ya cambiado', () => {
    expect(migracion).toContain("VALUES ('estudio', 'oculta')");
    expect(migracion).toContain('ON CONFLICT (clave) DO NOTHING');
  });

  test('la RPC se recrea limpiamente y no filtra los testers', () => {
    expect(migracion).toContain('DROP FUNCTION IF EXISTS public.fb_funciones()');
    expect(migracion).not.toContain('CREATE OR REPLACE FUNCTION public.fb_funciones()');
    expect(migracion).toContain('RETURNS TABLE (clave TEXT, activa BOOLEAN)');
    expect(migracion).toContain('SECURITY DEFINER');
    expect(migracion).toContain('SET search_path = public');
    expect(migracion).toContain('REVOKE ALL ON FUNCTION public.fb_funciones() FROM PUBLIC');
    expect(migracion).toContain('GRANT EXECUTE ON FUNCTION public.fb_funciones() TO authenticated');
  });

  test('resuelve activa, beta por usuario y beta por clase', () => {
    expect(migracion).toContain("f.estado = 'activa'");
    expect(migracion).toContain('auth.uid() = ANY (f.usuarios)');
    expect(migracion).toContain('m.grupo_id = ANY (f.grupos)');
    expect(migracion).toContain('FROM public.miembros_grupo m');
    expect(migracion).toContain("f.estado = 'beta'");
  });

  test('avisa si falta el helper de owner en vez de fallar a mitad', () => {
    expect(migracion).toContain("to_regprocedure('public.es_owner()') IS NULL");
    expect(migracion).toContain('RAISE EXCEPTION');
  });
});
