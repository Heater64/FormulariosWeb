import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('migración 044 — grupos profesionales', () => {
  const sql = readFileSync(join(root, 'supabase/migraciones/044_grupos_profesionales.sql'), 'utf8');

  test('unifica la membresía con es_principal y backfill desde perfiles.grupo_id', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT false');
    expect(sql).toContain('ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET es_principal = true');
    expect(sql).toContain("rol_en_grupo IN ('admin', 'editor', 'ayudante', 'miembro')");
  });

  test('define solicitudes_grupo, avisos_grupo y actividad_grupo', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.solicitudes_grupo');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.avisos_grupo');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.actividad_grupo');
    expect(sql).toContain('UNIQUE (grupo_id, usuario_id)');
  });

  test('define las RPCs de admisión, avisos y estadísticas', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.solicitar_ingreso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.resolver_solicitud');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crear_aviso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.eliminar_aviso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.estadisticas_clase');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.progreso_miembros');
  });

  test('unirse por código exige aprobación salvo el owner (que entra directo)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.unirse_con_codigo');
    expect(sql).toContain("jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id)");
    expect(sql).toContain("jsonb_build_object('resultado', 'solicitud', 'grupo_id', v_grupo_id)");
    expect(sql).toContain('IF public.es_owner() THEN');
    expect(sql).toContain("'solicitud_clase'");
    expect(sql).toContain('actividad_grupo');
  });
});
