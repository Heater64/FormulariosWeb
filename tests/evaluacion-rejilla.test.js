/**
 * Pruebas de la rejilla ÚNICA con scroll (sin paginación por secciones):
 *  · todas las columnas se pintan juntas, sin ocultas ni troceado,
 *  · el «+» de añadir columna se queda al final de TODAS las columnas,
 *  · el scroll se restaura al repintar (guardar no mueve la hoja),
 *  · la cola de guardado y sus avisos sobreviven a los repintados,
 *  · el código de paginación (gesto, mini-mapa, «Sección X de Y») desapareció.
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

/** Evaluación con 7 columnas: en la rejilla única caben todas de golpe. */
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

function pintar(vista, datos) {
  vista._datos = datos || fixture();
  vista._pintar();
}

function montarDom() {
  document.body.innerHTML = '<span id="tituloEvaluacion"></span><span id="subEvaluacion"></span>'
    + '<div id="app-root"><div id="contenido"></div><span id="estadoGuardado"></span></div>';
}

function estadoTexto() {
  const caja = document.querySelector('#estadoGuardado');
  return caja ? caja.textContent : '';
}

describe('rejilla única con scroll (todas las columnas a la vez)', () => {
  beforeEach(() => {
    montarDom();
    try { localStorage.clear(); } catch (e) { /* sin almacenamiento */ }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('las 7 columnas se pintan juntas, sin ocultas ni troceado', () => {
    const vista = cargarVista(crearWindowBase());
    vista._id = 'evUna';
    pintar(vista);

    // Las siete cabeceras están en el DOM y NINGUNA está oculta.
    expect(document.querySelectorAll('.eval-tabla th[data-col]').length).toBe(7);
    expect(document.querySelectorAll('.eval-tabla [hidden]').length).toBe(0);
    expect(document.querySelectorAll('[data-seccion]').length).toBe(0);
    // Cada alumno tiene las 7 celdas visibles (2 alumnos × 7); el «Resultado
    // final» lleva data-col vacío y no cuenta.
    expect(document.querySelectorAll('.eval-tabla td[data-alumno][data-col]:not([data-col=""])').length).toBe(14);

    // Sin mini-mapa ni paginación en el HTML pintado.
    const html = document.querySelector('#contenido').innerHTML;
    expect(document.querySelector('.eval-minimapa')).toBeNull();
    expect(html).not.toContain('Sección 1');
    expect(html).not.toContain('data-seccion-i');

    // Un repintado (por ejemplo, tras guardar) sigue dejando las 7 visibles.
    pintar(vista);
    expect(document.querySelectorAll('.eval-tabla th[data-col]').length).toBe(7);
    expect(document.querySelectorAll('.eval-tabla [hidden]').length).toBe(0);
  });

  test('el «+» apunta al final de TODAS las columnas y el caption pide deslizar', () => {
    const vista = cargarVista(crearWindowBase());
    vista._id = 'evMas';
    pintar(vista);

    // El «+» se queda al final de la lista completa, no de una sección.
    expect(document.querySelector('[data-anadir-col]').dataset.anadirCol).toBe('7');
    // La fila de «Añadir alumno» abarca todas las columnas (más la propia).
    const relleno = document.querySelector('tr.eval-fila--anadir td[colspan]');
    expect(relleno.getAttribute('colspan')).toBe('8');

    // El caption explica el scroll nativo en vez de «Sección X de Y».
    const caption = document.querySelector('.eval-tabla__caption').textContent;
    expect(caption).toContain('Desliza la hoja en horizontal para ver todas las columnas');
    expect(caption).not.toContain('Sección');
    expect(document.querySelector('#subEvaluacion').textContent).toContain('7 columna(s)');
    expect(document.querySelector('#subEvaluacion').textContent).not.toContain('sección');
  });

  test('el scroll horizontal y vertical se restauran al repintar', () => {
    const vista = cargarVista(crearWindowBase());
    vista._id = 'evScroll';
    pintar(vista);

    // El usuario desplaza la hoja… (jsdom almacena el valor del contenedor).
    const rejilla = document.querySelector('.eval-rejilla');
    rejilla.scrollLeft = 140;
    rejilla.scrollTop = 60;

    // …y un repintado (guardar una celda, refrescar) no le devuelve al inicio.
    pintar(vista);
    const despues = document.querySelector('.eval-rejilla');
    expect(despues.scrollLeft).toBe(140);
    expect(despues.scrollTop).toBe(60);
  });

  test('la cola de guardado y el aviso de error atraviesan los repintados', async () => {
    const window = crearWindowBase();
    const guardar = vi.fn(async () => ({}));
    window.plataformaRepository = {
      guardarCeldaEvaluacion: guardar,
      obtenerEvaluacion: vi.fn(async () => fixture())
    };
    const vista = cargarVista(window);
    vista._id = 'evCola';
    // Un SOLO objeto de datos para todo el test: los repintados no lo sustituyen
    // (así funciona en producción; el optimista vive dentro de _datos).
    const datos = fixture();
    pintar(vista, datos);

    vi.useFakeTimers();
    try {
      // Cambio pendiente de guardar (sin vuelco todavía; el optimista ya escribe).
      vista._programarGuardado('Ana', 'c1', 9);
      expect(vista._cola.size).toBe(1);
      expect(estadoTexto()).toContain('Guardando');
      expect(vista._datos.celdas[0].nota).toBe(9);

      // Un repintado no toca la cola ni su estado.
      pintar(vista, datos);
      expect(vista._cola.size).toBe(1);
      expect(estadoTexto()).toContain('Guardando');

      // El servidor falla: el valor escrito sigue en la cola y el aviso, visible.
      guardar.mockRejectedValueOnce(new Error('sin red'));
      await vista._volcar();
      expect(vista._estado).toBe('error');
      expect(estadoTexto()).toContain('Sin guardar');
      expect(document.querySelector('#btnReintentar')).toBeTruthy();
      expect(vista._datos.celdas[0].nota).toBe(9);

      // Seguir pintando no esconde el error ni pierde el valor.
      pintar(vista, datos);
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
  });

  test('el código de paginación desapareció: scroll nativo en su lugar', () => {
    // Sin gesto táctil, mini-mapa ni navegación por secciones.
    expect(vistaRejilla).not.toContain("addEventListener('touchstart'");
    expect(vistaRejilla).not.toContain("addEventListener('touchend'");
    expect(vistaRejilla).not.toContain('_gesto(');
    expect(vistaRejilla).not.toContain('_irSeccion(');
    expect(vistaRejilla).not.toContain('_aplicarSeccion(');
    expect(vistaRejilla).not.toContain('_calcularSecciones');
    expect(vistaRejilla).not.toContain('eval-minimapa');
    expect(vistaRejilla).not.toContain('data-seccion');
    expect(vistaRejilla).not.toContain('fb_evaluacion_seccion_');

    // En su lugar: el contenedor scrollea y se restaura el desplazamiento.
    expect(vistaRejilla).toContain('contenedor.scrollLeft = scrollIzq');
    expect(vistaRejilla).toContain('contenedor.scrollTop = scrollArr');
    // La vista se desmonta sin listeners huérfanos de ventana.
    expect(vistaRejilla).toContain('desmontar()');
  });
});
