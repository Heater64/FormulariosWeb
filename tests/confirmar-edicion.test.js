/**
 * «Editar examen» desde un listado saca al profesor de la pantalla en la que
 * está, así que TODAS las vistas que ofrecen entrar al editor preguntan antes
 * con la misma tarjeta (window.helpers.confirmarEdicion).
 *
 * Las vistas pesadas (Entregas, Evaluaciones, panel del admin) se comprueban
 * sobre su fuente: la guarda tiene que ir pegada a la navegación hacia
 * `/editor/<id>`. Es la única forma de que borrar la confirmación en una sola
 * pantalla —el fallo real que se quiere evitar— rompa un test.
 *
 * Ojo: `/editor/nuevo` (crear) NO lleva confirmación; solo la edición de un
 * examen que ya existe.
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Vistas que abren el editor de un examen existente. Solo las alcanzables: la
 * sección «Evaluaciones» (/evaluaciones → vista-evaluaciones.js y
 * vista-evaluacion-editar.js) no ofrece editar un examen, y vista-calificaciones
 * .js es código huérfano (ninguna ruta, página ni import lo carga).
 */
const VISTAS = [
  'js/vistas/vista-panel.js',
  'js/vistas/vista-examenes.js',
  'js/vistas/vista-entregas.js',
  'js/vistas/admin/vista-panel-admin.js'
];

/** Navegaciones a `/editor/` + id dinámico (crear es `/editor/nuevo`, literal). */
const navegacionesAEditor = (fuente) => [...fuente.matchAll(/'\/editor\/'\s*\+/g)].map((m) => m.index);

describe('confirmación al editar un examen', () => {
  test('el helper vive en dom-helpers y devuelve la tarjeta compartida', () => {
    const helpers = read('js/utilidades/dom-helpers.js');
    const fn = helpers.slice(helpers.indexOf('confirmarEdicion()'), helpers.indexOf('mostrarGuia('));
    expect(fn).toContain("'¿Segura que quieres editar?'");
    expect(fn).toContain("titulo: 'Editar examen'");
    expect(fn).toContain('peligroso: false');
  });

  test.each(VISTAS)('%s llama al helper compartido', (archivo) => {
    expect(read(archivo)).toContain('window.helpers.confirmarEdicion()');
  });

  test.each(VISTAS.filter((f) => f !== 'js/vistas/vista-panel.js'))(
    '%s no navega al editor sin confirmar',
    (archivo) => {
      const fuente = read(archivo);
      const destinos = navegacionesAEditor(fuente);
      expect(destinos.length).toBeGreaterThan(0);

      for (const indice of destinos) {
        const antes = fuente.slice(Math.max(0, indice - 400), indice);
        expect(antes).toContain('confirmarEdicion()');
      }
    }
  );

  test('en Inicio la guarda depende de la marca del botón, no del orden', () => {
    const fuente = read('js/vistas/vista-panel.js');
    // El botón se marca al pintarlo…
    expect(fuente).toContain('data-ir="/editor/${esc(ex.id)}" data-confirmar-edicion');
    // …y el handler solo confirma cuando esa marca está.
    expect(fuente).toMatch(/if \(btn\.hasAttribute\('data-confirmar-edicion'\)\) \{[\s\S]{0,300}?const ok = await window\.helpers\.confirmarEdicion\(\);/);
  });

  test('crear un examen nuevo sigue siendo un clic, sin diálogo', () => {
    const sinConfirmar = VISTAS.map(read).join('\n');
    // Ninguna navegación a `/editor/nuevo` queda detrás de confirmarEdicion.
    for (const m of sinConfirmar.matchAll(/'\/editor\/nuevo[^']*'/g)) {
      const antes = sinConfirmar.slice(Math.max(0, m.index - 200), m.index);
      expect(antes).not.toContain('confirmarEdicion()');
    }
  });
});
