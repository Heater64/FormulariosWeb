/**
 * Inicio del panel (vista-panel): el botón «Editar» de cada examen abre el
 * editor, y como un clic sin querer saca al usuario de Inicio, primero pide
 * confirmación con el diálogo real de window.helpers.confirmar.
 *
 * Las demás acciones de la fila (Entregas / Corregir) solo navegan: no deben
 * quedar detrás de un diálogo.
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
  'js/vistas/vista-panel.js'
];

const EXAMEN = {
  id: 'ex-1', titulo: 'Evaluación inicial', estado: 'publicado',
  num_preguntas: 8, num_enlaces: 2, num_entregas: 3, por_corregir: 1
};

function crearEntorno(examenes = [EXAMEN]) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app-root"></div></body></html>',
    { url: 'http://localhost/#!/inicio', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  w.Element.prototype.scrollIntoView = function () {};

  const ctx = dom.getInternalVMContext();
  FUENTES.forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));

  const navegar = vi.fn();
  w.store = {
    obtener: (clave) => (clave === 'usuario'
      ? { id: 'u-1', rol: 'admin', nombre_completo: 'Rebeca Profe', username: 'rebeca' }
      : null)
  };
  w.router = { navegar, irAtras() {}, _ejecutar() {}, pathActual: () => '' };
  w.plataformaRepository = { resumen: async () => ({ examenes }) };

  return { w, dom, navegar, vista: w.vistaPanel };
}

/** Deja correr las microtareas/timers pendientes del handler asíncrono. */
const reposar = () => new Promise((resolve) => setTimeout(resolve, 0));

const botonEditar = (raiz) => raiz.querySelector('button[data-confirmar-edicion]');

describe('Inicio · botón Editar pide confirmación', () => {
  let entorno;

  beforeEach(async () => {
    entorno = crearEntorno();
    await entorno.vista.montar(entorno.w.document.getElementById('app-root'));
  });

  afterEach(() => {
    entorno.dom.window.close();
  });

  test('el botón Editar se marca para confirmar y no navega al primer clic', async () => {
    const { raiz, navegar } = { raiz: entorno.w.document.getElementById('app-root'), navegar: entorno.navegar };
    const btn = botonEditar(raiz);
    expect(btn).toBeTruthy();
    expect(btn.dataset.ir).toBe('/editor/ex-1');

    btn.click();
    await reposar();

    // El diálogo real (window.helpers.confirmar) está en pantalla con el texto pedido.
    const dialogo = entorno.w.document.querySelector('.modal-confirm');
    expect(dialogo).toBeTruthy();
    expect(dialogo.querySelector('.modal-confirm__mensaje').textContent).toBe('¿Segura que quieres editar?');
    expect(dialogo.querySelector('.modal-confirm__titulo').textContent).toContain('Editar examen');
    expect(dialogo.querySelector('[data-cancelar]').textContent).toBe('No');

    // Editar no es destructivo: ni el botón, ni el contorno de la tarjeta, ni
    // el título van en rojo.
    expect(dialogo.classList.contains('modal-confirm--seguro')).toBe(true);
    const btnConfirmar = dialogo.querySelector('[data-confirmar]');
    expect(btnConfirmar.textContent).toBe('Sí');
    expect(btnConfirmar.classList.contains('btn-primario')).toBe(true);
    expect(btnConfirmar.classList.contains('btn-peligro')).toBe(false);

    // Mientras no se confirme, no se ha salido de Inicio.
    expect(navegar).not.toHaveBeenCalled();
  });

  test('cancelar deja al usuario en Inicio y cierra el diálogo', async () => {
    const raiz = entorno.w.document.getElementById('app-root');
    botonEditar(raiz).click();
    await reposar();

    entorno.w.document.querySelector('.modal-confirm [data-cancelar]').click();
    await reposar();

    expect(entorno.navegar).not.toHaveBeenCalled();
    expect(entorno.w.document.querySelector('.modal-confirm')).toBeNull();
    // El panel sigue montado tal cual.
    expect(botonEditar(raiz)).toBeTruthy();
  });

  test('confirmar abre el editor de ese examen', async () => {
    const raiz = entorno.w.document.getElementById('app-root');
    botonEditar(raiz).click();
    await reposar();

    entorno.w.document.querySelector('.modal-confirm [data-confirmar]').click();
    await reposar();

    expect(entorno.navegar).toHaveBeenCalledTimes(1);
    expect(entorno.navegar).toHaveBeenCalledWith('/editor/ex-1');
  });

  test('Entregas/Corregir siguen siendo un solo clic, sin diálogo', async () => {
    const raiz = entorno.w.document.getElementById('app-root');
    const btnEntregas = raiz.querySelector('button[data-ir="/corregir/ex-1"]');
    expect(btnEntregas).toBeTruthy();
    expect(btnEntregas.hasAttribute('data-confirmar-edicion')).toBe(false);

    btnEntregas.click();
    await reposar();

    expect(entorno.w.document.querySelector('.modal-confirm')).toBeNull();
    expect(entorno.navegar).toHaveBeenCalledWith('/corregir/ex-1');
  });
});

describe('Inicio · jerarquía visual del resumen', () => {
  const montar = async (examenes) => {
    const entorno = crearEntorno(examenes);
    await entorno.vista.montar(entorno.w.document.getElementById('app-root'));
    return { ...entorno, raiz: entorno.w.document.getElementById('app-root') };
  };

  test('agrupa las cuatro métricas en una sola tira y ofrece «Ver todos»', async () => {
    const { raiz, dom } = await montar([EXAMEN, { ...EXAMEN, id: 'ex-2' }]);

    expect(raiz.querySelectorAll('.adm-rejilla--agrupada .adm-stat')).toHaveLength(4);
    expect(raiz.querySelectorAll('.adm-stat__cifra')).toHaveLength(4);
    expect(raiz.querySelector('[data-ir="/examenes"]')).toBeTruthy();
    // La lista de Inicio son fichas de la misma cola de trabajo, no filas sueltas.
    expect(raiz.querySelectorAll('.adm-lista .adm-examen')).toHaveLength(2);

    dom.window.close();
  });

  test('sin pendientes deja un aviso fino en vez de una sección vacía', async () => {
    const { raiz, dom } = await montar([{ ...EXAMEN, por_corregir: 0 }]);

    expect(raiz.querySelector('.adm-aviso--fino')).toBeTruthy();
    expect(raiz.textContent).toContain('Todo corregido. No hay respuestas pendientes.');
    expect(raiz.querySelector('#listaPendientes')).toBeNull();
    expect(raiz.textContent).not.toContain('Pendientes de corrección');

    dom.window.close();
  });

  test('con pendientes conserva el estado publicado y marca la tarea en ámbar', async () => {
    const { raiz, dom } = await montar([EXAMEN]);
    const fila = raiz.querySelector('.adm-lista .adm-fila');

    expect(fila.querySelector('.adm-badge--publicado')).toBeTruthy();
    expect(fila.querySelector('.adm-badge--aviso').textContent).toContain('1 por corregir');
    // La tarea no sustituye al estado: la ficha suma el franco ámbar.
    expect(fila.hasAttribute('data-atencion')).toBe(true);
    expect(raiz.textContent).toContain('Por corregir');

    dom.window.close();
  });

  test('la lista no repite el azul sólido: el relleno queda en la cabecera', async () => {
    const { raiz, dom } = await montar([EXAMEN, { ...EXAMEN, id: 'ex-2', por_corregir: 0 }]);

    expect(raiz.querySelectorAll('.adm-examen .adm-btn--principal')).toHaveLength(0);
    expect(raiz.querySelector('#btnNuevo').classList.contains('adm-btn--principal')).toBe(true);

    dom.window.close();
  });
});

describe('Inicio · cola de trabajo sin duplicados', () => {
  const montar = async (examenes) => {
    const entorno = crearEntorno(examenes);
    await entorno.vista.montar(entorno.w.document.getElementById('app-root'));
    return { ...entorno, raiz: entorno.w.document.getElementById('app-root') };
  };

  test('separa «Por corregir» del archivo sin repetir la misma ficha', async () => {
    const pendiente = { ...EXAMEN, id: 'ex-a', titulo: 'Con pendientes', por_corregir: 2 };
    const otro = { ...EXAMEN, id: 'ex-b', titulo: 'También pendiente', por_corregir: 1 };
    const alDia = { ...EXAMEN, id: 'ex-c', titulo: 'Al día', por_corregir: 0 };
    const { raiz, dom } = await montar([pendiente, otro, alDia]);

    const grupos = raiz.querySelectorAll('.ex-grupo');
    expect(grupos).toHaveLength(2);
    expect(grupos[0].classList.contains('ex-grupo--atencion')).toBe(true);
    expect(grupos[0].querySelector('.ex-grupo__titulo').textContent).toContain('Por corregir');
    expect(grupos[1].querySelector('.ex-grupo__titulo').textContent).toContain('Todos los exámenes');

    const fichas = [...raiz.querySelectorAll('.adm-examen')];
    expect(fichas).toHaveLength(3);
    const etiquetas = fichas.map((nodo) => nodo.getAttribute('aria-label'));
    expect(etiquetas).toEqual([...new Set(etiquetas)]);

    dom.window.close();
  });

  test('el medallón y el pie describen el estado sin leer el badge', async () => {
    const { raiz, dom } = await montar([EXAMEN]);
    const ficha = raiz.querySelector('.adm-examen');

    expect(ficha.dataset.estado).toBe('publicado');
    expect(ficha.querySelector('.ex-ficha__marca [data-lucide="send"]')).toBeTruthy();
    // 2 enlaces en el resumen, ninguno usado todavía.
    expect(ficha.querySelector('.ex-ficha__pie').textContent).toContain('0 de 2 enlaces usados');
    expect(ficha.querySelector('.ex-ficha__pie').textContent).toContain('Actualizado');

    dom.window.close();
  });

  test('concordancia: 1 pregunta, 1 punto y 1 entrega', async () => {
    const uno = {
      ...EXAMEN,
      num_preguntas: 1, puntos_totales: 1, num_entregas: 1,
      num_enlaces: 1, enlaces_usados: 0, por_corregir: 0, nota_media: null
    };
    const { raiz, dom } = await montar([uno]);
    const meta = raiz.querySelector('.ex-ficha__meta').textContent;

    expect(meta).toContain('1 pregunta');
    expect(meta).not.toContain('1 preguntas');
    expect(meta).toContain('1 punto');
    expect(meta).not.toContain('1 puntos');
    expect(meta).toContain('1 entrega');
    expect(meta).not.toContain('1 entregas');

    dom.window.close();
  });

  test('una ficha lleva una sola acción de entrega, según su estado', async () => {
    const { raiz, dom } = await montar([
      { ...EXAMEN, id: 'ex-pend', por_corregir: 2 },
      { ...EXAMEN, id: 'ex-al-dia', por_corregir: 0 }
    ]);

    const pendiente = raiz.querySelector('.adm-examen[aria-label="Evaluación inicial"]');
    const alDia = [...raiz.querySelectorAll('.adm-examen')].find((nodo) => nodo !== pendiente);

    const accionPendiente = pendiente.querySelectorAll('button[data-ir="/corregir/ex-pend"]');
    expect(accionPendiente).toHaveLength(1);
    expect(accionPendiente[0].textContent).toContain('Corregir');

    const accionAlDia = alDia.querySelectorAll('button[data-ir="/corregir/ex-al-dia"]');
    expect(accionAlDia).toHaveLength(1);
    expect(accionAlDia[0].textContent).toContain('Entregas');

    dom.window.close();
  });

  test('sin exámenes ofrece crear el primero en lugar de una lista vacía', async () => {
    const { raiz, dom } = await montar([]);

    expect(raiz.querySelector('.ex-vacio')).toBeTruthy();
    expect(raiz.querySelector('.ex-vacio [data-ir="/editor/nuevo"]')).toBeTruthy();

    dom.window.close();
  });
});

describe('helpers.confirmar · tono del botón de confirmar', () => {
  let entorno;

  beforeEach(() => {
    entorno = crearEntorno();
  });

  afterEach(() => {
    entorno.dom.window.close();
  });

  /** Abre el diálogo real y devuelve la tarjeta y su botón de confirmar. */
  async function abrir(opciones) {
    const { w } = entorno;
    w.helpers.confirmar('¿Continuar?', opciones);
    await reposar();
    const tarjeta = w.document.querySelector('.modal-confirm');
    return { tarjeta, btn: tarjeta.querySelector('[data-confirmar]') };
  }

  test('por defecto sigue en rojo (acciones destructivas)', async () => {
    const { tarjeta, btn } = await abrir({});
    expect(btn.classList.contains('btn-peligro')).toBe(true);
    expect(btn.classList.contains('btn-primario')).toBe(false);
    expect(tarjeta.className).toBe('modal-confirm');
  });

  test('con peligroso:false la tarjeta lleva la variante segura y el botón azul', async () => {
    const { tarjeta, btn } = await abrir({ peligroso: false });
    expect(tarjeta.classList.contains('modal-confirm--seguro')).toBe(true);
    expect(btn.classList.contains('btn-primario')).toBe(true);
    expect(btn.classList.contains('btn-peligro')).toBe(false);
  });

  test('confirmarEdicion usa esa misma tarjeta para todas las vistas', async () => {
    const { w } = entorno;
    const promesa = w.helpers.confirmarEdicion();
    await reposar();

    const tarjeta = w.document.querySelector('.modal-confirm');
    expect(tarjeta.querySelector('.modal-confirm__mensaje').textContent).toBe('¿Segura que quieres editar?');
    expect(tarjeta.querySelector('.modal-confirm__titulo').textContent).toContain('Editar examen');
    expect(tarjeta.classList.contains('modal-confirm--seguro')).toBe(true);
    expect(tarjeta.querySelector('[data-confirmar]').classList.contains('btn-primario')).toBe(true);
    expect(tarjeta.querySelector('[data-cancelar]').textContent).toBe('No');

    // «No» resuelve a false: ninguna vista debe navegar con eso.
    tarjeta.querySelector('[data-cancelar]').click();
    await expect(promesa).resolves.toBe(false);
  });

  test('la variante no destructiva tiene sus reglas CSS en el tema', () => {
    const css = read('css/05-componentes/_zona-peligro.css');
    const seguro = css.slice(css.indexOf('.modal-confirm.modal-confirm--seguro'));
    expect(seguro).toContain('border-top-color: var(--color-acento)');
    expect(seguro).toContain('.modal-confirm--seguro .modal-confirm__titulo');
    expect(seguro).toContain('color: var(--color-acento)');
  });
});
