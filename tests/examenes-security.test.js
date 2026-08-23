import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migraciones/047_seguridad_examenes_y_soporte.sql');
const repository = read('js/datos/examenes-repository.js');
const takeView = read('js/vistas/vista-examen-tomar.js');
const gradeView = read('js/vistas/vista-examen-corregir.js');

describe('contrato de seguridad de exámenes', () => {
  test('la migración crea snapshot, RPC de entrega y RPC de corrección', () => {
    expect(migration).toContain('preguntas_snapshot JSONB');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.entregar_intento_examen');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.calificar_intento_examen');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.intentos_examen_personalizado FROM authenticated');
  });

  test('las respuestas correctas no se sirven al alumno durante el examen activo', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.fb_sanitizar_preguntas');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.obtener_resultado_examen');
    expect(migration).toContain("'preguntas', public.fb_sanitizar_preguntas(e.preguntas)");
  });

  test('el cliente entrega y corrige mediante RPCs', () => {
    expect(repository).toContain("rpc('entregar_intento_examen'");
    expect(repository).toContain("rpc('calificar_intento_examen'");
    expect(repository).not.toContain("from('intentos_examen_personalizado').upsert");
    expect(takeView).toContain('entregarIntento(intento.id, respuestasFinales)');
    expect(gradeView).toContain('examenesRepository.calificar');
    expect(gradeView).not.toContain(".from('intentos_examen_personalizado').update");
  });
});
