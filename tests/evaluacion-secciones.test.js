/**
 * Pruebas de la rejilla paginada por SECCIONES (migración 065):
 *  · solo una sección visible a la vez, al pintar y al cambiar,
 *  · el gesto horizontal (deslizar) cambia de sección y el vertical no,
 *  · la sección activa y la cola de guardado atraviesan los cambios,
 *  · los avisos de guardado (Guardando…/Sin guardar/Reintentar) siguen visibles.
 *
 * Requiere DOM: se ejecuta con entorno jsdom (el resto de la suite es Node).
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Con entorno jsdom, import.meta.url no es de esquema file: se lee por ruta.
const vistaRejilla = readFileSync(
  path.resolve(process.cwd(), 'js/vistas/vista-evaluacion-editar.js'),
  'utf8'
);

function crearWindowBase() {
  return {
    panelUI: {
      esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c])),
      numero: (v) => {
        const n = Number(v);
        if (!isFinite(n)) return '—';
        return (Math.round(n * 100) / 100).toString().replace('.', ',');
      },
      fechaCorta: () => '01 oct',
      modal: () => ({ cerrar: vi.fn(), cuerpo: {}, pie: { querySelector: () => ({ addEventListener: vi.fn() }) } })
    },
    Iconos: { render: (n) => `<i data-lucide="${n}"></i>`, actualizar: vi.fn() },
    helpers: { mostrarAlerta: vi.fn(), confirmar: vi.fn(async () => true) }
  };
}

function cargarVista(window) {
  return new Function('window', 'store', 'router',
    `${vistaRejilla}\nreturn window.vistaEvaluacionEditar;`
  )(window, { obtener: () => ({ rol: 'admin' }) }, { navegar: vi.fn(), pathActual: () => '/evaluaciones/x' });
}

/** Evaluación con 7 columnas: con tamaño 3 da secciones 3 + 3 + 1. */
function fixture() {
  return {
    evaluacion: { titulo: '1ª Evaluación', nota_max: 10 },
    columnas: Array.from({ length: 7 }, (_, i) => ({
      id: 'c' + (i + 1), tipo: 'manual', examen_id: null,
      nombre: 'Examen ' + (i + 1), posicion: i, peso: null
    })),
    alumnos: ['Ana', 'Luis'],
    celdas: [{ alumno: 'Ana', columna_id: 'c1', nota: 7, manual: false }],
    finales: []
  };
}

/** Secciones con alguna celda visible (todas las que no están ocultas). */
function seccionesVisibles() {
  const vistas = new Set();
  document.querySelectorAll('.eval-tabla [data-seccion]').forEach((el) => {
    if (!el.hasAttribute('hidden')) vistas.add(el.dataset.seccion);
  });
  return [...vistas];
}

function montarDom() {
  document.body.innerHTML = '<div id="app-root"><div id="contenido"></div><span id="estadoGuardado"></span></div>';
}

function estadoTexto() {
  const caja = document.querySelector('#estadoGuardado');
  return caja ? caja.textContent : '';
}

describe('rejilla por secciones (una visible a la vez)', () => {
  beforeEach(() => {
    montarDom();
    try { localStorage.clear(); } catch (e) { /* sin almacenamiento */ }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('las columnas se trocean en secciones de N en su orden', () => {
    const vista = cargarVista(crearWindowBase());
    const columnas = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
    expect(vista._calcularSecciones(columnas, 2)).toEqual([
      { indice: 0, columna_ids: ['a', 'b'] },
      { indice: 1, columna_ids: ['c', 'd'] },
      { indice: 2, columna_ids: ['e'] }
    ]);
    // Una sola sección si todo cabe.
    expect(vista._calcularSecciones(columnas, 9)).toEqual([
      { indice: 0, columna_ids: ['a', 'b', 'c', 'd', 'e'] }
    ]);
    expect(vista._calcularSecciones([], 3)).toEqual([]);
    // Tamaño inválido → 3, el mismo criterio que el servidor (065).
    expect(vista._calcularSecciones(columnas, 0).map((s) => s.columna_ids.length)).toEqual([3, 2]);
  });

  test('al pintar y al cambiar de sección solo hay UNA sección visible', () => {
    const window = crearWindowBase();
    const vista = cargarVista(window);
    vista._id = 'evUna';
    vista._tam = 3;
    vista._datos = fixture();
    vista._pintar();

    // 7 columnas en 3 grupos (3 + 3 + 1); todas están en el DOM…
    expect(vista._secciones.map((s) => s.columna_ids.length)).toEqual([3, 3, 1]);
    expect(document.querySelectorAll('.eval-tabla th[data-seccion]').length).toBe(7);
    // …pero solo se ve la primera.
    expect(seccionesVisibles()).toEqual(['0']);
    expect(document.querySelectorAll('.eval-tabla th[data-seccion][hidden]').length).toBe(4);

    // El mini-mapa tiene un punto por sección y refleja la activa.
    const puntos = document.querySelectorAll('.eval-minimapa__punto');
    expect(puntos.length).toBe(3);
    expect(document.querySelector('.eval-minimapa__punto--activo').dataset.seccionI).toBe('0');
    expect(document.querySelector('[data-seccion-anterior]').disabled).toBe(true);
    expect(document.querySelector('[data-seccion-siguiente]').disabled).toBe(false);

    // Cambiar de sección (mini-mapa, flechas o deslizar) alterna exactamente un grupo.
    vista._irSeccion(1);
    expect(seccionesVisibles()).toEqual(['1']);
    expect(document.querySelector('.eval-minimapa__punto--activo').dataset.seccionI).toBe('1');
    expect(document.querySelector('.eval-minimapa__texto').textContent).toBe('Sección 2 de 3');
    expect(document.querySelector('[data-seccion-anterior]').disabled).toBe(false);

    vista._irSeccion(2);
    expect(seccionesVisibles()).toEqual(['2']);
    expect(document.querySelector('[data-seccion-siguiente]').disabled).toBe(true);

    // Límites: no se sale de las secciones existentes.
    vista._irSeccion(99);
    expect(vista._seccion).toBe(2);
    vista._irSeccion(-99);
    expect(vista._seccion).toBe(0);

    // Repintar (por ejemplo, tras guardar) sigue dejando una sola visible.
    vista._pintar();
    expect(seccionesVisibles()).toEqual(['0']);
    // Y el «+» de columnas apunta al final de la sección visible (3).
    expect(document.querySelector('[data-anadir-col]').dataset.anadirCol).toBe('3');
  });

  test('el gesto desliza en horizontal y respeta límites; el vertical no cambia', () => {
    const vista = cargarVista(crearWindowBase());
    vista._id = 'evGesto';
    vista._tam = 3;
    vista._datos = fixture();
    vista._pintar();

    expect(vista._seccion).toBe(0);
    expect(vista._gesto(-80, 12)).toBe(true);   // ← deslizar a la izquierda
    expect(vista._seccion).toBe(1);
    expect(seccionesVisibles()).toEqual(['1']);
    expect(vista._gesto(80, 12)).toBe(true);    // → deslizar a la derecha
    expect(vista._seccion).toBe(0);

    // Recorrido demasiado corto o sobre todo vertical: no cambia.
    expect(vista._gesto(-30, 8)).toBe(false);
    expect(vista._gesto(-40, 160)).toBe(false);
    expect(vista._seccion).toBe(0);

    // En el último punto no se pasa de la última sección.
    vista._irSeccion(99);
    expect(vista._gesto(-80, 0)).toBe(true);
    expect(vista._seccion).toBe(2);
  });

  test('la sección activa se recuerda y el troceado del servidor se respeta', () => {
    const vista = cargarVista(crearWindowBase());
    vista._id = 'evRecuerdo';
    vista._tam = 3;
    vista._datos = fixture();
    vista._pintar();

    vista._irSeccion(2);
    expect(localStorage.getItem('fb_evaluacion_seccion_evRecuerdo')).toBe('2');

    // Un repinto (tras guardar o refrescar) mantiene la sección abierta.
    vista._pintar();
    expect(vista._seccion).toBe(2);
    expect(seccionesVisibles()).toEqual(['2']);

    // Si el servidor trae sus secciones con el mismo troceado (065), se usan tal cual.
    const delServidor = fixture();
    delServidor.secciones = [
      { indice: 0, columna_ids: ['c1', 'c2', 'c3'] },
      { indice: 1, columna_ids: ['c4', 'c5', 'c6'] },
      { indice: 2, columna_ids: ['c7'] }
    ];
    vista._datos = delServidor;
    vista._pintar();
    expect(vista._secciones).toBe(delServidor.secciones);
    expect(seccionesVisibles()).toEqual(['2']);

    // Una sección guardada que ya no existe se recorta a la primera.
    localStorage.setItem('fb_evaluacion_seccion_evRecuerdo', '7');
    vista._pintar();
    expect(vista._seccion).toBe(0);
    expect(seccionesVisibles()).toEqual(['0']);
  });

  test('la cola de guardado y el aviso de error atraviesan el cambio de sección', async () => {
    const window = crearWindowBase();
    const guardar = vi.fn(async () => ({}));
    const obtener = vi.fn(async () => fixture());
    window.plataformaRepository = {
      guardarCeldaEvaluacion: guardar,
      obtenerEvaluacion: obtener
    };
    const vista = cargarVista(window);
    vista._id = 'evCola';
    vista._tam = 3;
    vista._datos = fixture();
    vista._pintar();

    vi.useFakeTimers();
    try {
      // Cambio pendiente de guardar (sin vuelco todavía).
      vista._programarGuardado('Ana', 'c1', 9);
      expect(vista._cola.size).toBe(1);
      expect(estadoTexto()).toContain('Guardando');

      // Cambiar de sección no toca la cola ni su estado.
      vista._irSeccion(1);
      expect(seccionesVisibles()).toEqual(['1']);
      expect(vista._cola.size).toBe(1);
      expect(estadoTexto()).toContain('Guardando');

      // El servidor falla: el valor escrito sigue en la cola y el aviso, visible.
      guardar.mockRejectedValueOnce(new Error('sin red'));
      await vista._volcar();
      expect(vista._estado).toBe('error');
      expect(estadoTexto()).toContain('Sin guardar');
      expect(document.querySelector('#btnReintentar')).toBeTruthy();
      expect(vista._datos.celdas[0].nota).toBe(9);

      // Seguir navegando no esconde el error ni pierde el valor.
      vista._irSeccion(2);
      expect(seccionesVisibles()).toEqual(['2']);
      expect(estadoTexto()).toContain('Sin guardar');
      expect(vista._cola.size).toBe(1);

      // Reintentar (botón o vuelco manual) lo envía y vuelve a «Guardado».
      await vista._volcar();
      expect(guardar).toHaveBeenLastCalledWith('evCola', 'c1', 'Ana', 9);
      expect(vista._estado).toBe('ok');
      expect(vista._cola.size).toBe(0);
      expect(estadoTexto()).toContain('Guardado');
      expect(document.querySelector('#btnReintentar')).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  test('las columnas de servidores antiguos (solo columna_id) se normalizan a id', () => {
    const vista = cargarVista(crearWindowBase());
    const datos = {
      columnas: [
        { columna_id: 'aa', nombre: 'Uno', tipo: 'manual' },
        { id: 'bb', nombre: 'Dos', tipo: 'manual' }
      ]
    };
    vista._normalizarDatos(datos);
    expect(datos.columnas[0].id).toBe('aa');
    expect(datos.columnas[0].columna_id).toBe('aa');
    expect(datos.columnas[1].columna_id).toBe('bb');
    // Con `id` correcto, las secciones se calculan con ids reales.
    expect(vista._calcularSecciones(datos.columnas, 1)[0].columna_ids).toEqual(['aa']);
  });

  test('el cableado de deslizar y el mini-mapa están en la vista', () => {
    expect(vistaRejilla).toContain("addEventListener('touchstart'");
    expect(vistaRejilla).toContain("addEventListener('touchend'");
    expect(vistaRejilla).toContain('this._gesto(t.clientX - toqueX, t.clientY - toqueY)');
    expect(vistaRejilla).toContain('eval-minimapa');
    expect(vistaRejilla).toContain('data-seccion-i');
    // Al salir de la vista se suelta el listener de tamaño y no se pierde cola.
    expect(vistaRejilla).toContain('desmontar()');
  });
});
