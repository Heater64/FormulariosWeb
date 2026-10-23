import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/078_temario_activa.sql');
const features = read('js/core/features.js');
const editorFuente = read('js/vistas/vista-examen-editor.js');
const examenesFuente = read('js/vistas/vista-examenes.js');

describe('temario — migración 078 (activa para todos)', () => {
  test('convierte la bandera a activa de forma idempotente', () => {
    expect(migracion).toContain("VALUES ('temario', 'activa')");
    expect(migracion).toContain('ON CONFLICT (clave) DO UPDATE');
    expect(migracion).toContain("SET estado = 'activa'");
    expect(migracion).toContain('actualizado_en = now()');
  });

  test('se omite con aviso si la 076 no está aplicada', () => {
    expect(migracion).toContain("to_regclass('public.funciones')");
    expect(migracion).toContain('RAISE NOTICE');
  });

  test('solo cambia la bandera: no toca RPCs, columnas ni permisos', () => {
    expect(migracion).not.toMatch(/CREATE (OR REPLACE )?FUNCTION/);
    expect(migracion).not.toContain('GRANT');
    expect(migracion).not.toContain('ALTER TABLE');
    expect(migracion).not.toMatch(/\bDROP\b/);
  });
});

describe('temario — el cliente se gobierna solo por la bandera', () => {
  test('features.js no comprueba roles: la RPC ya resuelve quién ve qué', () => {
    expect(features).toContain('fb_funciones');
    expect(features).not.toMatch(/\.rol\s*==/);
  });

  test('editor y lista de exámenes usan la misma bandera sin filtros de rol', () => {
    expect(editorFuente).toContain("window.features.activa('temario')");
    expect(examenesFuente).toContain("window.features.activa('temario')");
    // El bloque del temario cuelga SOLO de la bandera: nada como
    // features.activa(...) && usuario.rol === ... en el mismo condicional.
    expect(editorFuente).not.toMatch(/features\.activa\('temario'\)[^\n]*\.rol/);
    expect(examenesFuente).not.toMatch(/features\.activa\('temario'\)[^\n]*\.rol/);
  });
});
