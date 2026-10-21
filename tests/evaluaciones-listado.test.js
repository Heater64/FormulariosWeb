/**
 * Listado de Evaluaciones (vista-evaluaciones): la hoja de notas se pinta con
 * la misma ficha que la cola de exámenes, pero sus datos son otros (columnas,
 * alumnos, fecha) y su jerarquía también: lo que aún no tiene columnas se
 * separa arriba porque es lo único que pide trabajo.
 *
 * Se ejecuta contra el código REAL (jsdom + vm), sin sustituir la capa de UI.
 */
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const FUENTES = [
  'js/utilidades/iconos.js',
  'js/utilidades/dom-helpers.js',
  'js/componentes/panel-ui.js',
  'js/vistas/vista-evaluaciones.js'
];

const BASE = {
  fecha: '2026-03-12',
  descripcion: 'Primera parte del curso',
  actualizado_en: '2026-10-18T10:00:00Z'
};

const EVALUACIONES = [
  { ...BASE, id: 'ev-1', titulo: 'Primer trimestre', num_columnas: 3, num_alumnos: 24 },
  { ...BASE, id: 'ev-2', titulo: 'Segundo trimestre', num_columnas: 2, num_alumnos: 0, descripcion: '' },
  { ...BASE, id: 'ev-3', titulo: 'Recuperación', num_columnas: 0, num_alumnos: 0, descripcion: '' }
];

function crearEntorno(evaluaciones = EVALUACIONES) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app-root"></div></body></html>',
    { url: 'http://localhost/#!/evaluaciones', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  w.Element.prototype.scrollIntoView = function () {};

  const ctx = dom.getInternalVMContext();
  FUENTES.forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));

  const navegar = vi.fn();
  w.store = { obtener: (clave) => (clave === 'usuario' ? { id: 'u-1', rol: 'admin', username: 'profe' } : null) };
  w.router = { navegar, pathActual: () => '/evaluaciones' };
  w.plataformaRepository = {
    listarEvaluaciones: async () => evaluaciones,
    eliminarEvaluacion: vi.fn(async () => {}),
    actualizarEvaluacion: vi.fn(async () => {})
  };
  // dom-helpers ya cargó el resto (escapeHtml, etc.): se amplía, no se sustituye.
  w.helpers = Object.assign(w.helpers || {}, {
    mostrarAlerta: vi.fn(),
    confirmar: vi.fn(async () => false)
  });

  return { w, dom, navegar, vista: w.vistaEvaluaciones };
}

const reposar = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Evaluaciones · ficha de la hoja de notas', () => {
  let entorno;
  let raiz;

  beforeEach(async () => {
    entorno = crearEntorno();
    raiz = entorno.w.document.getElementById('app-root');
    await entorno.vista.montar(raiz);
  });

  afterEach(() => {
    entorno.dom.window.close();
  });

  test('la hoja sin columnas se separa arriba y ninguna ficha se repite', () => {
    const grupos = raiz.querySelectorAll('.ex-grupo');
    expect(grupos).toHaveLength(2);
    expect(grupos[0].classList.contains('ex-grupo--sin-configurar')).toBe(true);
    expect(grupos[0].querySelector('.ex-grupo__titulo').textContent).toContain('Sin configurar');
    // Sin columnas = lo único que exige acción, así que lleva el franco ámbar.
    expect(grupos[0].classList.contains('ex-grupo--atencion')).toBe(true);

    const fichas = [...raiz.querySelectorAll('.adm-evaluacion')];
    expect(fichas).toHaveLength(3);
    expect(new Set(fichas.map((f) => f.getAttribute('aria-label'))).size).toBe(3);
    expect(raiz.querySelectorAll('[data-atencion]')).toHaveLength(1);
  });

  test('estado, columnas, alumnos y fecha se leen en la ficha', () => {
    const ficha = raiz.querySelector('.adm-evaluacion[aria-label="Primer trimestre"]');

    expect(ficha.dataset.estado).toBe('con-notas');
    expect(ficha.querySelector('.adm-badge').textContent).toBe('Con notas');
    expect(ficha.querySelector('.ex-ficha__marca [data-lucide="table-2"]')).toBeTruthy();

    const meta = ficha.querySelector('.ex-ficha__meta').textContent;
    expect(meta).toContain('3 columnas');
    expect(meta).toContain('24 alumnos');
    expect(meta).toContain('2026');

    expect(ficha.querySelector('.ex-ficha__descripcion').textContent).toContain('Primera parte');
    expect(ficha.querySelector('.ex-ficha__pie').textContent).toContain('Actualizada');
  });

  test('las hojas preparadas pero sin notas no alarman: badge neutro y sin franco', () => {
    const ficha = raiz.querySelector('.adm-evaluacion[aria-label="Segundo trimestre"]');

    expect(ficha.dataset.estado).toBe('sin-notas');
    expect(ficha.querySelector('.adm-badge--borrador').textContent).toBe('Sin notas');
    expect(ficha.hasAttribute('data-atencion')).toBe(false);
    // Sin descripción no se deja un párrafo vacío.
    expect(ficha.querySelector('.ex-ficha__descripcion')).toBeNull();
  });

  test('concordancia: 1 columna y 1 alumno', async () => {
    entorno.dom.window.close();
    entorno = crearEntorno([{ ...BASE, id: 'ev-uno', titulo: 'Única', num_columnas: 1, num_alumnos: 1 }]);
    raiz = entorno.w.document.getElementById('app-root');
    await entorno.vista.montar(raiz);

    const meta = raiz.querySelector('.ex-ficha__meta').textContent;
    expect(meta).toContain('1 columna');
    expect(meta).not.toContain('1 columnas');
    expect(meta).toContain('1 alumno');
    expect(meta).not.toContain('1 alumnos');
    expect(meta).not.toContain('(s)');
  });
});

describe('Evaluaciones · acciones del listado', () => {
  let entorno;
  let raiz;

  beforeEach(async () => {
    entorno = crearEntorno();
    raiz = entorno.w.document.getElementById('app-root');
    await entorno.vista.montar(raiz);
  });

  afterEach(() => {
    if (entorno.dom.window && !entorno.dom.window.closed) entorno.dom.window.close();
  });

  test('Abrir es la acción visible y navega a la rejilla', () => {
    const abrir = raiz.querySelector('[data-abrir="ev-1"]');
    expect(abrir).toBeTruthy();
    expect(abrir.classList.contains('ex-boton-suave')).toBe(true);
    expect(abrir.classList.contains('adm-btn--principal')).toBe(false);

    abrir.click();
    expect(entorno.navegar).toHaveBeenCalledWith('/evaluaciones/ev-1');
  });

  test('eliminar vive en el menú, no como botón rojo suelto en cada fila', () => {
    const ficha = raiz.querySelector('.adm-evaluacion[aria-label="Primer trimestre"]');
    const menu = ficha.querySelector('details.adm-examen__mas');

    expect(menu).toBeTruthy();
    expect(menu.querySelector('[data-eliminar="ev-1"]').classList.contains('adm-btn--peligro')).toBe(true);
    expect(ficha.querySelector('[data-editar="ev-1"]')).toBeTruthy();
    // Nada destructivo fuera del desplegable.
    expect(ficha.querySelector('.ex-ficha__acciones > .adm-btn--peligro')).toBeNull();
    expect(ficha.querySelectorAll('.ex-ficha__acciones > .adm-examen__acciones-principales .adm-btn')).toHaveLength(1);
  });

  test('Editar datos abre el modal compartido con el nombre ya cargado', async () => {
    raiz.querySelector('[data-editar="ev-1"]').click();
    await reposar();

    const modal = entorno.w.document.querySelector('.adm-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Editar datos de la evaluación');
    expect(modal.querySelector('#evNombre').value).toBe('Primer trimestre');
  });
});

describe('Evaluaciones · búsqueda y estados vacíos', () => {
  let entorno;
  let raiz;

  beforeEach(async () => {
    entorno = crearEntorno();
    raiz = entorno.w.document.getElementById('app-root');
    await entorno.vista.montar(raiz);
  });

  afterEach(() => {
    if (entorno.dom.window && !entorno.dom.window.closed) entorno.dom.window.close();
  });

  test('la búsqueda cuenta los resultados y no agrupa', async () => {
    const buscar = raiz.querySelector('#buscar');
    buscar.value = 'trimestre';
    buscar.dispatchEvent(new entorno.w.Event('input', { bubbles: true }));
    await reposar(240);

    expect(raiz.querySelectorAll('.adm-evaluacion')).toHaveLength(2);
    expect(raiz.querySelectorAll('.ex-grupo')).toHaveLength(0);
    expect(raiz.querySelector('.ex-barra__resumen').textContent).toContain('2');
    expect(raiz.querySelector('.ex-barra__resumen').textContent).toContain('de 3');
  });

  test('sin resultados ofrece limpiar la búsqueda y la deja vacía', async () => {
    const buscar = raiz.querySelector('#buscar');
    buscar.value = 'no existe';
    buscar.dispatchEvent(new entorno.w.Event('input', { bubbles: true }));
    await reposar(240);

    const vacio = raiz.querySelector('.ex-vacio');
    expect(vacio).toBeTruthy();
    expect(vacio.textContent).toContain('Sin resultados');
    vacio.querySelector('[data-limpiar]').click();

    expect(raiz.querySelectorAll('.adm-evaluacion')).toHaveLength(3);
    expect(raiz.querySelector('#buscar').value).toBe('');
  });

  test('sin evaluaciones ofrece crear la primera', async () => {
    entorno.dom.window.close();
    entorno = crearEntorno([]);
    raiz = entorno.w.document.getElementById('app-root');
    await entorno.vista.montar(raiz);

    const vacio = raiz.querySelector('.ex-vacio');
    expect(vacio).toBeTruthy();
    expect(vacio.querySelector('.ex-vacio__icono [data-lucide="table-2"]')).toBeTruthy();
    expect(vacio.querySelector('[data-crear]')).toBeTruthy();
  });
});
