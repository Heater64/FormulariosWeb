import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/069_asignar_intento_alumno.sql');
const repositorio = read('js/datos/plataforma-repository.js');
const vista = read('js/vistas/vista-entregas.js');
const misNotas = read('js/vistas/vista-mis-notas.js');

describe('asignar un intento por enlace a la cuenta de un alumno (069)', () => {
  test('la RPC asigna y desasigna alumno_id sobre el intento', () => {
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.fb_asignar_intento_alumno');
    expect(migracion).toContain('p_intento_id UUID');
    expect(migracion).toContain('p_alumno UUID DEFAULT NULL');
    // Asignar: fija el id del perfil en el intento.
    expect(migracion).toContain('UPDATE public.intentos_examen_personalizado SET alumno_id = p.id WHERE id = i.id;');
    // Desasignar: p_alumno NULL vuelve a dejar el intento solo en el enlace.
    expect(migracion).toContain('UPDATE public.intentos_examen_personalizado SET alumno_id = NULL WHERE id = i.id;');
  });

  test('exige permiso de editor del grupo o owner, como fb_corregir_entrega', () => {
    expect(migracion).toContain("public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()");
    expect(migracion).toContain("RAISE EXCEPTION 'No autorizado'");
    expect(migracion).toContain("RAISE EXCEPTION 'Entrega no encontrada'");
  });

  test('solo admite cuentas de alumno (rol usuario) activas', () => {
    expect(migracion).toContain("coalesce(p.rol, '') <> 'usuario'");
    expect(migracion).toContain('Solo se pueden asignar cuentas de alumno (rol usuario)');
    expect(migracion).toContain('Esa cuenta de alumno está desactivada');
  });

  test('el duplicado (la cuenta ya tenía otro intento) es un aviso, no un bloqueo', () => {
    // El plan decidido con el usuario: no se bloquea; se informa.
    expect(migracion).toContain('ya_tenia_intento');
    expect(migracion).toContain('v_ya_tiene');
    expect(migracion).not.toMatch(/RAISE EXCEPTION[^;]*ya_tenia/i);
  });

  test('anon no puede ejecutar la RPC; authenticated sí', () => {
    expect(migracion).toContain('REVOKE ALL ON FUNCTION public.fb_asignar_intento_alumno(UUID, UUID) FROM PUBLIC, anon;');
    expect(migracion).toContain('GRANT EXECUTE ON FUNCTION public.fb_asignar_intento_alumno(UUID, UUID) TO authenticated;');
    // Ninguna concesión de esta migración a anon.
    const concesionesAAnon = migracion.split('\n').filter((l) => /GRANT/.test(l) && /TO anon/.test(l));
    expect(concesionesAAnon).toEqual([]);
  });

  test('fb_listar_entregas devuelve alumno_id y el nombre de la cuenta asignada', () => {
    const listar = migracion.slice(migracion.indexOf('FUNCTION public.fb_listar_entregas'));
    expect(listar).toContain("'alumno_id', i.alumno_id");
    expect(listar).toContain("'alumno_asignado', v_asignado");
    // Sigue exigiendo permiso de editor: la lista no se abre a cualquiera.
    expect(listar).toContain("public.es_editor_del_grupo(e.grupo_id) OR public.es_owner()");
  });

  test('el repositorio expone asignarIntentoAlumno con los parámetros de la RPC', () => {
    expect(repositorio).toContain('asignarIntentoAlumno(intentoId, alumnoId)');
    expect(repositorio).toContain("rpc('fb_asignar_intento_alumno'");
    expect(repositorio).toContain('p_intento_id: intentoId');
    expect(repositorio).toContain('p_alumno: alumnoId || null');
  });

  test('la lista de entregas ofrece «Asignar cuenta» por entrega', () => {
    expect(vista).toContain('data-asignar=');
    expect(vista).toContain('Asignar cuenta');
    expect(vista).toContain('Cambiar cuenta');
    // La acción abre el modal de asignación con la entrega concreta.
    expect(vista).toContain('_abrirAsignacion(entrega)');
    // El estado de asignación se muestra en la ficha (nombre de la cuenta) y,
    // si no la tiene, se dice para que el profesor sepa qué falta.
    expect(vista).toContain('Asignada a ${esc(entrega.alumno_asignado)}');
    expect(vista).toContain('Sin asignar a una cuenta');
  });

  test('el modal sugiere la cuenta cuyo nombre coincide con el del enlace', () => {
    // Auto-sugerencia pedida por el usuario: lower+trim contra nombre_completo/username.
    expect(vista).toContain("const normalizar = (v) => String(v || '').trim().toLowerCase();");
    expect(vista).toContain('normalizar(u.nombre_completo) === nombre || normalizar(u.username) === nombre');
    // Solo cuentas de alumno activas entran en el desplegable.
    expect(vista).toContain("u.rol === 'usuario' && u.activo !== false");
    // «Sin asignar» es la primera opción y permite desvincular.
    expect(vista).toContain('Sin asignar (solo el enlace)');
  });

  test('tras guardar, el aviso distingue el duplicado y se repinta la lista', () => {
    expect(vista).toContain('asignarIntentoAlumno(entrega.intento_id, id)');
    expect(vista).toContain('ya_tenia_intento');
    expect(vista).toContain('_repintarLista()');
    // El error del servidor se muestra dentro del modal, sin cerrarlo.
    expect(vista).toContain('avisoAsignacion');
  });

  test('Mis notas no cambia: sigue filtrando por alumno_id = auth.uid()', () => {
    // La magia es del servidor: al fijar alumno_id, listar_mis_intentos_examen
    // (migración 047) devuelve el intento. La vista no necesita tocar nada.
    expect(misNotas).toContain('window.examenesRepository.misIntentos(usuario.id)');
  });
});
