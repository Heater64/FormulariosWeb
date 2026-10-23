/**
 * Píldora «Instala la app» en el enlace público /e/<token>.
 *
 * Dos niveles:
 *  1. Componente (js/componentes/pwa-pill.js): solo se pinta si el navegador
 *     ofrece instalación (beforeinstallprompt) y la app no está instalada;
 *     la × descarta y el descarte caduca al abrir OTRO examen.
 *  2. Integración (public-site/examen.html + examen.js): la píldora vive en
 *     #zonaPill, FUERA de #lienzo, porque cada pantalla hace
 *     `lienzo.innerHTML = ''` y la borraba nada más cargar (bug original).
 *     Se ve al entrar y al terminar; queda oculta mientras se responde.
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const pillJs = readFileSync(new URL('../js/componentes/pwa-pill.js', import.meta.url), 'utf8');
const paginaJs = readFileSync(new URL('../public-site/examen.js', import.meta.url), 'utf8');
const paginaHtml = readFileSync(new URL('../public-site/examen.html', import.meta.url), 'utf8');

const PREGUNTAS = [
  { id: 'p1', texto: '¿Cuál es el primer libro?', tipo: 'multiple', puntos: 1, obligatoria: true, opciones: ['Génesis', 'Éxodo'] },
  { id: 'p2', texto: '¿Quién construyó el arca?', tipo: 'multiple', puntos: 1, obligatoria: true, opciones: ['Noé', 'Moisés'] }
];

const esperar = async (fn, ms = 2000) => {
  const inicio = Date.now();
  for (;;) {
    let valor;
    try { valor = await fn(); } catch (e) { valor = false; }
    if (valor) return valor;
    if (Date.now() - inicio > ms) throw new Error('timeout esperando condición');
    await new Promise((r) => setTimeout(r, 10));
  }
};

/** DOM + componente de la píldora aislado (sin examen). */
function crearComponente({ instalada = false, conEvento = true } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="contenedor"></div></body></html>',
    { url: 'https://example.test/e/TOKEN1234567890', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  if (instalada) {
    // La app ya está instalada: display-mode standalone.
    w.matchMedia = (q) => ({ matches: /standalone/.test(q), media: q, addListener() {}, removeListener() {} });
  }
  vm.runInContext(pillJs, dom.getInternalVMContext(), { filename: 'js/componentes/pwa-pill.js' });
  if (conEvento) {
    w.dispatchEvent(new w.Event('beforeinstallprompt', { cancelable: true }));
  }
  const montar = (id = 'TOKEN1234567890') => w.PwaPill.montar({
    contenedor: w.document.getElementById('contenedor'), id, esExamen: true
  });
  return { w, montar, contenedor: w.document.getElementById('contenedor') };
}

describe('pwa-pill: componente', () => {
  test('se pinta si el navegador ofrece instalación y la app no está instalada', () => {
    // Montaje ANTES del evento: el componente debe refrescar al llegar.
    const antes = crearComponente({ conEvento: false });
    antes.montar();
    expect(antes.contenedor.querySelector('.pwa-pill'), 'sin evento no hay píldora').toBeNull();
    antes.w.dispatchEvent(new antes.w.Event('beforeinstallprompt', { cancelable: true }));
    expect(antes.contenedor.querySelector('.pwa-pill'), 'llega el evento y aparece').toBeTruthy();

    // Montaje con el evento ya capturado.
    const conEvento = crearComponente();
    conEvento.montar();
    expect(conEvento.contenedor.querySelector('.pwa-pill')).toBeTruthy();
    expect(conEvento.contenedor.querySelector('.pwa-pill__instalar').textContent).toBe('Instalar');
    expect(conEvento.contenedor.querySelector('.pwa-pill__cerrar').getAttribute('aria-label')).toBe('Ahora no');
  });

  test('no se pinta si la app ya está instalada', () => {
    const { montar, contenedor } = crearComponente({ instalada: true });
    montar();
    expect(contenedor.querySelector('.pwa-pill')).toBeNull();
  });

  test('la × la oculta y el descarte caduca al abrir otro examen', () => {
    const { w, montar, contenedor } = crearComponente();
    montar('TOKEN-A');
    contenedor.querySelector('.pwa-pill__cerrar').click();
    expect(contenedor.querySelector('.pwa-pill'), 'la × la elimina').toBeNull();

    // Mismo examen: sigue oculta (nuevo montaje, p.ej. al repintar).
    montar('TOKEN-A');
    expect(contenedor.querySelector('.pwa-pill'), 'oculta en el mismo examen').toBeNull();

    // Otro examen: vuelve a aparecer y el descarte anterior queda borrado.
    montar('TOKEN-B');
    expect(contenedor.querySelector('.pwa-pill'), 'el descarte caduca en otro examen').toBeTruthy();
    expect(JSON.parse(w.localStorage.getItem('fb_pwa_pill')).descartadoPara, 'descarte caducado').toBeUndefined();

    // Cerrar en el examen nuevo anota el descarte ahí.
    contenedor.querySelector('.pwa-pill__cerrar').click();
    expect(JSON.parse(w.localStorage.getItem('fb_pwa_pill')).descartadoPara).toBe('TOKEN-B');
  });
});

/** Página pública /e/<token> con el componente real + examen.js. */
async function abrirExamen() {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <header>
        <span id="cabTitulo"></span>
        <span id="cabSub"></span>
        <span id="cabEstado"></span>
      </header>
      <div class="progreso"><div id="progresoBarra"></div></div>
      <div id="zonaPill" hidden></div>
      <main id="lienzo"></main>
      <div id="estadoSr" role="status"></div>
    </body></html>`,
    { url: 'https://example.test/e/TOKEN1234567890', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  const proto = w.HTMLDialogElement && w.HTMLDialogElement.prototype;
  if (proto && typeof proto.showModal !== 'function') {
    proto.showModal = function () { this.open = true; };
    proto.close = function () { this.open = false; };
  }

  const rpc = async (nombre, args) => {
    switch (nombre) {
      case 'fb_estado_enlace':
        return {
          data: {
            titulo: 'Examen de prueba', profesor: 'Profesora', comunitario: true,
            usado: false, cerrado: false, total_preguntas: PREGUNTAS.length, puntos_totales: 2
          }, error: null
        };
      case 'fb_comunitario_iniciar':
        return {
          data: {
            intento_id: 'int-1', preguntas: PREGUNTAS, respuestas: {},
            titulo: 'Examen de prueba', alumno_nombre: args.p_nombre
          }, error: null
        };
      case 'fb_comunitario_borrador':
        return { data: { intento_id: 'int-1', respuestas: args.p_respuestas }, error: null };
      case 'fb_comunitario_entregar':
        return { data: { intento_id: 'int-1', estado: 'completado', nota: 5, pendientes_correccion: 0 }, error: null };
      default:
        return { data: {}, error: null };
    }
  };
  w.supabaseClient = { rpc: (nombre, args) => Promise.resolve(rpc(nombre, args || {})) };

  vm.runInContext(pillJs, dom.getInternalVMContext(), { filename: 'js/componentes/pwa-pill.js' });
  vm.runInContext(paginaJs, dom.getInternalVMContext(), { filename: 'public-site/examen.js' });

  await esperar(() => w.document.querySelector('#nombreAlumno'));
  // El navegador ofrece instalar mientras el alumno lee la introducción.
  w.dispatchEvent(new w.Event('beforeinstallprompt', { cancelable: true }));
  return { w, dom };
}

describe('enlace público /e/: la píldora acompaña la entrada y el resultado', () => {
  test('examen.html monta la píldora en #zonaPill, fuera de #lienzo', () => {
    expect(paginaHtml).toContain('id="zonaPill"');
    const zona = paginaHtml.indexOf('id="zonaPill"');
    const main = paginaHtml.indexOf('<main');
    expect(zona, 'la zona está declarada antes de <main> (no se repinta)').toBeGreaterThan(-1);
    expect(zona).toBeLessThan(main);
    expect(paginaHtml).not.toContain('onclick=');
  });

  test('se ve al entrar, desaparece al responder y vuelve al terminar', async () => {
    const { w } = await abrirExamen();
    const zona = w.document.getElementById('zonaPill');

    // 1. Entrada: visible y con la píldora montada.
    expect(zona.hidden, 'visible en la introducción').toBe(false);
    expect(zona.querySelector('.pwa-pill'), 'la píldora se monta en la zona estable').toBeTruthy();
    // Fuera de #lienzo: cualquier repintado de #lienzo la respeta.
    expect(zona.closest('main'), 'no está dentro de #lienzo').toBeNull();

    // 2. Responder: se oculta para no molestar.
    const nombre = w.document.querySelector('#nombreAlumno');
    nombre.value = 'Ana Alumna';
    w.document.querySelector('#lienzo form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await esperar(() => w.document.querySelectorAll('#lienzo .pregunta').length === PREGUNTAS.length);
    expect(zona.hidden, 'oculta mientras se responde').toBe(true);

    // 3. Entregar: vuelve a aparecer en la pantalla de resultado.
    PREGUNTAS.forEach((p) => {
      const radio = w.document.querySelector(`[data-pregunta-id="${p.id}"] input[type="radio"]`);
      radio.checked = true;
      radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    });
    w.document.getElementById('btnEntregar').click();
    const dialogo = w.document.querySelector('dialog');
    const enviar = Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent === 'Sí, entregar');
    expect(enviar, 'el botón de enviar existe').toBeTruthy();
    enviar.click();
    await esperar(() => /entregado/i.test(w.document.querySelector('#lienzo').textContent));
    expect(zona.hidden, 'visible al terminar').toBe(false);
    expect(zona.querySelector('.pwa-pill'), 'sigue montada tras repintar').toBeTruthy();

    // 4. La × la cierra también en la página del examen.
    zona.querySelector('.pwa-pill__cerrar').click();
    expect(zona.querySelector('.pwa-pill'), 'la × la elimina').toBeNull();
  });
});
