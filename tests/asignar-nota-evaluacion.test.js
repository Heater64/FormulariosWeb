import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion067 = read('supabase/migraciones/067_evaluacion_vinculo_alumno.sql');
const migracion072 = read('supabase/migraciones/072_evaluacion_vinculo_solo_activos.sql');
const repositorio = read('js/datos/plataforma-repository.js');
const vista = read('js/vistas/vista-evaluacion-editar.js');
const css = read('css/05-componentes/_plataforma.css');

describe('asignar notas de evaluaciones a cada usuario (067 + 072)', () => {
  test('cada fila muestra a qué cuenta está asignada, como en exámenes', () => {
    expect(vista).toContain('_htmlCuentaFila(alumno)');
    expect(vista).toContain('Sin asignar</span>');
    expect(vista).toContain('Asignado a ${esc(vinculo.nombre');
    expect(css).toContain('.eval-tabla__alumno-cuenta');
    expect(css).toContain('.eval-tabla__alumno-cuenta--asignada');
  });

  test('el menú de la fila usa el lenguaje de asignación', () => {
    expect(vista).toContain("'Asignar a usuario'");
    expect(vista).toContain("'Cambiar usuario asignado'");
    expect(vista).not.toContain('Vincular cuenta de alumno');
  });

  test('el modal sugiere la cuenta cuyo nombre coincide con la fila, solo si la fila no tiene cuenta', () => {
    expect(vista).toContain('const normalizar = (v) => String(v || \'\').trim().toLowerCase();');
    expect(vista).toContain('normalizar(u.nombre_completo) === nombreFila || normalizar(u.username) === nombreFila');
    expect(vista).toContain('const sugerido = actual ? null');
    expect(vista).toContain('aparece preseleccionada');
  });

  test('el modal avisa si la cuenta elegida ya está en otra fila, antes de guardar', () => {
    expect(vista).toContain('avisoMover');
    expect(vista).toContain('v.alumno_id === id && v.clave !== clave(alumno)');
    expect(vista).toContain('Al guardar, pasará a esta fila');
    // El aviso se calcula al abrir y en cada cambio del desplegable.
    expect(vista).toContain("select.addEventListener('change', actualizarAvisoMover);");
    expect(vista).toContain('actualizarAvisoMover();');
  });

  test('solo se ofrecen cuentas de alumno activas', () => {
    expect(vista).toContain("u.rol === 'usuario' && u.activo !== false");
  });

  test('la migración 072 rechaza cuentas de alumno desactivadas', () => {
    expect(migracion072).toContain("p.rol = 'usuario' AND coalesce(p.activo, FALSE) = TRUE");
    expect(migracion072).toContain('La cuenta indicada no es de un alumno activo');
    expect(migracion072).toContain('CREATE OR REPLACE FUNCTION public.fb_evaluacion_vincular(');
    expect(migracion072).toContain('GRANT EXECUTE ON FUNCTION public.fb_evaluacion_vincular(UUID, TEXT, UUID) TO authenticated;');
    const concesionesAAnon = migracion072.split('\n').filter((l) => /GRANT/.test(l) && /TO anon/.test(l));
    expect(concesionesAAnon).toEqual([]);
  });

  test('la 067 sigue definiendo la RPC de vínculo que usa la 072', () => {
    expect(migracion067).toContain('CREATE OR REPLACE FUNCTION public.fb_evaluacion_vincular(');
    expect(migracion067).toContain('CREATE OR REPLACE FUNCTION public.fb_mis_notas_evaluaciones()');
  });

  test('si falta la 067, el repositorio lo dice en lugar de citar la 060', () => {
    expect(repositorio).toContain("['fb_evaluacion_vinculos', 'fb_evaluacion_vincular', 'fb_mis_notas_evaluaciones'].includes(nombre)");
    expect(repositorio).toContain('Falta aplicar la migración 067_evaluacion_vinculo_alumno.sql');
    // La comprobación de 067 va antes que la genérica de 060.
    expect(repositorio.indexOf('067_evaluacion_vinculo_alumno.sql')).toBeLessThan(repositorio.indexOf('060_evaluaciones.sql'));
  });
});
