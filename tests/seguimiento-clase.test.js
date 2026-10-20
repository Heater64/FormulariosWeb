import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const vista = read('js/vistas/vista-entregas.js');

// La vista es un script clásico (IIFE sobre window): se carga en un contexto
// aislado (patrón de tests/examen-flujo-completo.test.js) y se ejercita su
// lógica real con stubs mínimos de presentación.
const entorno = { window: {} };
vm.createContext(entorno);
vm.runInContext(vista, entorno, { filename: 'vista-entregas.js' });
entorno.window.helpers = { nombreAlumno: (p) => (p && (p.nombre_completo || p.username)) || 'Alumno' };
entorno.window.Iconos = { render: () => '', actualizar: () => {} };
entorno.window.panelUI = { esc: (v) => String(v == null ? '' : v) };
const seguimiento = entorno.window.vistaEntregas;

const ALUMNOS = [
  { id: 'a1', rol: 'usuario', activo: true, nombre_completo: 'Ana Pérez', username: 'ana' },
  { id: 'a2', rol: 'usuario', activo: true, nombre_completo: 'Luis Gómez', username: 'luis' },
  { id: 'a3', rol: 'usuario', activo: true, nombre_completo: 'María Ruiz', username: 'maria' }
];

describe('seguimiento de la clase: quién hizo cada examen y quién falta', () => {
  test('el detalle carga los alumnos de la clase (cuentas activas)', () => {
    expect(vista).toContain('window.adminRepository.listarUsuarios()');
    expect(vista).toContain("u.rol === 'usuario' && u.activo !== false");
  });

  test('una entrega cuenta si trae la cuenta o si el nombre coincide', () => {
    expect(vista).toContain('_alumnoHaEntregado(alumno)');
    expect(vista).toContain('t.alumno_id === alumno.id');
    expect(vista).toContain('t.alumno_nombre');
  });

  test('el detalle muestra «Faltan por entregar» con los nombres', () => {
    expect(vista).toContain('Faltan por entregar (');
    expect(vista).toContain('_htmlFaltan()');
    expect(vista).toContain('window.helpers.nombreAlumno(a)');
  });

  test('si toda la clase entregó, lo dice en vez de lista vacía', () => {
    expect(vista).toContain('Toda la clase ha entregado este examen.');
  });

  test('avisa cuando hay entregas sin asignar a una cuenta', () => {
    expect(vista).toContain('sin asignar a una cuenta');
  });

  test('el subtítulo cuenta cuántos faltan', () => {
    expect(vista).toContain('sin entregar');
  });

  test('el listado muestra los exámenes ofrecidos sin entregas', () => {
    expect(vista).toContain('Sin entregas todavía (');
    expect(vista).toContain('Ver seguimiento');
    // Solo ofrecidos: un borrador nunca se ofreció, así que no «falta».
    expect(vista).toContain("ex.estado === 'publicado' || ex.estado === 'cerrado'");
  });

  test('reasignar una cuenta repinta también el seguimiento', () => {
    // _repintarLista repinta _pintarEntregas, que incluye _htmlFaltan.
    expect(vista).toContain('_repintarLista()');
    expect(vista).toContain("insertAdjacentHTML('beforeend', this._htmlFaltan())");
  });
});

describe('seguimiento de la clase: lógica real de faltantes', () => {
  test('faltan los alumnos sin entrega (por cuenta o por nombre)', () => {
    seguimiento._alumnos = ALUMNOS;
    seguimiento._entregas = [
      // Ana entregó desde la app (con cuenta).
      { intento_id: 'i1', alumno_id: 'a1', alumno_nombre: 'Ana Pérez', estado: 'calificado', corregido: true, nota: 8 },
      // Luis entregó por enlace sin asignar (solo su nombre escrito).
      { intento_id: 'i2', alumno_id: null, alumno_nombre: 'Luis Gómez', estado: 'completado', corregido: false }
    ];
    const faltan = seguimiento._faltan();
    // Luis no se reclama: ya respondió (queda asignar su entrega a su cuenta).
    expect(faltan.map((a) => a.id)).toEqual(['a3']);
  });

  test('el nombre coincide sin importar mayúsculas ni espacios', () => {
    seguimiento._alumnos = ALUMNOS;
    seguimiento._entregas = [
      { intento_id: 'i1', alumno_id: null, alumno_nombre: '  ana pérez ', estado: 'completado', corregido: false }
    ];
    expect(seguimiento._faltan().map((a) => a.id).sort()).toEqual(['a2', 'a3']);
  });

  test('un nombre que no es de nadie no tapa a ningún alumno', () => {
    seguimiento._alumnos = ALUMNOS;
    seguimiento._entregas = [
      { intento_id: 'i1', alumno_id: null, alumno_nombre: 'Invitado Externo', estado: 'completado', corregido: false }
    ];
    expect(seguimiento._faltan()).toHaveLength(3);
  });

  test('si nadie falta, lo celebra y avisa de las sin asignar', () => {
    seguimiento._alumnos = ALUMNOS.slice(0, 1);
    seguimiento._entregas = [
      { intento_id: 'i1', alumno_id: null, alumno_nombre: 'Ana Pérez', estado: 'completado', corregido: false }
    ];
    const html = seguimiento._htmlFaltan();
    expect(html).toContain('Toda la clase ha entregado este examen.');
    expect(html).toContain('sin asignar a una cuenta');
  });

  test('sin alumnos en clase no pinta la sección', () => {
    seguimiento._alumnos = [];
    seguimiento._entregas = [];
    expect(seguimiento._htmlFaltan()).toBe('');
  });
});
