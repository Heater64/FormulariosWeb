import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/077_temario_examen.sql');

describe('temario — migración 077', () => {
  test('añade la columna temario de forma aditiva e idempotente', () => {
    expect(migracion).toContain('ADD COLUMN IF NOT EXISTS temario JSONB');
    expect(migracion).toContain('DEFAULT NULL');
    expect(migracion).not.toContain('DROP COLUMN');
    expect(migracion).not.toContain('ALTER TABLE public.examenes_personalizados\n  DROP');
  });

  test('siembra la bandera temario en oculta sin pisar un estado ya cambiado', () => {
    expect(migracion).toContain("VALUES ('temario', 'oculta')");
    expect(migracion).toContain('ON CONFLICT (clave) DO NOTHING');
  });

  test('la semilla se omite con aviso si la 076 no está aplicada', () => {
    expect(migracion).toContain("to_regclass('public.funciones')");
    expect(migracion).toContain('RAISE NOTICE');
  });

  test('la columna vive fuera de config: no roza el versionado 048 ni las RPCs', () => {
    expect(migracion).toContain('048');
    expect(migracion).toContain('config');
    // La v1 no expone el temario a los alumnos: ninguna RPC se toca aquí.
    expect(migracion).not.toContain('CREATE OR REPLACE FUNCTION');
    expect(migracion).not.toContain('obtener_examen_alumno');
    expect(migracion).not.toContain('fb_estado_enlace');
  });
});

describe('temario — runtime de banderas (AGENTS.md §Regla principal)', () => {
  const features = read('js/core/features.js');
  const indexJs = read('js/core/index.js');
  const indexHtml = read('index.html');

  test('window.features cumple el contrato cargar/activa', () => {
    expect(features).toContain('async cargar');
    expect(features).toContain('fb_funciones');
    expect(features).toContain('activa(clave)');
  });

  test('si la RPC falla, todas las funciones valen false (nada a medias)', () => {
    expect(features).toMatch(/catch\s*\(e\)/);
    expect(features).toContain('cargado = false');
    expect(features).toContain('mapa.clear()');
  });

  test('se carga en APP.init tras la sesión y antes de registrar rutas', () => {
    const carga = indexJs.indexOf('await window.features.cargar()');
    const rutas = indexJs.indexOf('_inicializarRutas()');
    const sesion = indexJs.indexOf('await this._recuperarSesion()');
    expect(sesion).toBeGreaterThanOrEqual(0);
    expect(carga).toBeGreaterThan(sesion);
    expect(rutas).toBeGreaterThan(carga);
  });

  test('index.html carga features.js como script clásico', () => {
    expect(indexHtml).toContain('js/core/features.js');
  });
});
