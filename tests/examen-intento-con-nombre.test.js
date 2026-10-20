import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/073_examen_intento_con_nombre.sql');
const vistaEntregas = read('js/vistas/vista-entregas.js');
const vistaTomar = read('js/vistas/vista-examen-tomar.js');

describe('el intento hecho en la app guarda el nombre de la cuenta (073)', () => {
  test('iniciar_intento_examen rellena alumno_nombre/grupo desde el perfil', () => {
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.iniciar_intento_examen(p_examen_id UUID)');
    // El nombre visible sale del perfil: nombre_completo o, si falta, username.
    expect(migracion).toContain('p.nombre_completo, p.username');
    // El grupo visible es el nombre del grupo del perfil.
    expect(migracion).toContain('g.nombre');
    // El INSERT del intento nuevo incluye ambas columnas.
    expect(migracion).toContain('alumno_id, alumno_nombre, alumno_grupo');
  });

  test('al retomar un intento con el nombre vacío también lo rellena', () => {
    expect(migracion).toContain("coalesce(btrim(i.alumno_nombre), '') = ''");
    expect(migracion).toContain('i.alumno_nombre := v_nombre;');
  });

  test('backfill: intentos con cuenta pero sin nombre se rellenan desde perfiles', () => {
    expect(migracion).toContain('UPDATE public.intentos_examen_personalizado i');
    expect(migracion).toContain('WHERE i.alumno_id = p.id');
  });

  test('fb_listar_entregas respalda al perfil y siempre trae la cuenta', () => {
    const listar = migracion.slice(migracion.indexOf('FUNCTION public.fb_listar_entregas'));
    expect(listar).toContain("'alumno_id', i.alumno_id");
    expect(listar).toContain("'alumno_asignado', v_asignado");
    expect(listar).toContain("'alumno_nombre', coalesce(v_nombre, '')");
    // Sin abrir permisos: sigue exigiendo editor del grupo u owner.
    expect(listar).toContain("public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()");
    const concesionesAAnon = migracion.split('\n').filter((l) => /GRANT/.test(l) && /TO anon/.test(l));
    expect(concesionesAAnon).toEqual([]);
  });

  test('fb_obtener_entrega trae el mismo respaldo y la cuenta', () => {
    const detalle = migracion.slice(migracion.indexOf('FUNCTION public.fb_obtener_entrega'));
    expect(detalle).toContain("'alumno_id', i.alumno_id");
    expect(detalle).toContain("'alumno_asignado', v_asignado");
    expect(detalle).toContain("'alumno_nombre', coalesce(v_nombre, '')");
  });

  test('Entregas muestra la cuenta cuando la fila no tiene nombre escrito', () => {
    expect(vistaEntregas).toContain("entrega.alumno_nombre || entrega.alumno_asignado || 'Sin nombre'");
    // Sin duplicar: si el nombre ya ES el de la cuenta, no se añade «Asignado a».
    expect(vistaEntregas).toContain('entrega.alumno_asignado !== nombre');
  });

  test('el examen en la app indica a nombre de quién se entrega', () => {
    expect(vistaTomar).toContain('Lo realizas como');
    expect(vistaTomar).toContain('usuario.nombre_completo || usuario.username');
  });
});
