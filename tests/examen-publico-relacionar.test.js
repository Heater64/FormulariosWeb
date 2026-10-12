/**
 * Fallo reportado: en la página pública /e/<token> la pregunta «Relacionar
 * columnas» sigue apareciendo como SIN RESPONDER aunque el alumno elija todas
 * las parejas; al ser obligatoria, el botón de entrega queda bloqueado.
 *
 * Este test ejecuta public-site/examen.js TAL CUAL (IIFE incluido) sobre un DOM
 * jsdom, con la URL /e/<token> y el flujo comunitario (identidad por nombre).
 * Solo se sustituye supabaseClient.rpc, con el mismo contrato que las RPC de
 * supabase/migraciones/056 y 063 (fb_estado_enlace, fb_comunitario_iniciar,
 * fb_comunitario_borrador, fb_comunitario_entregar).
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const paginaJs = readFileSync(new URL('../public-site/examen.js', import.meta.url), 'utf8');

const PREGUNTAS = [
  {
    id: 'p-multiple', texto: '¿Cuál es el primer libro?', tipo: 'multiple',
    puntos: 1, obligatoria: true, opciones: ['Génesis', 'Éxodo']
  },
  {
    id: 'p-relacionar', texto: 'Relaciona el autor con su libro', tipo: 'relacionar',
    puntos: 1, obligatoria: true,
    // Formato plano del editor: primera mitad = izquierda, segunda = derecha.
    opciones: ['Moisés', 'Noé', 'Éxodo', 'Génesis'],
    respuesta_correcta: '{"0":0,"1":1}'
  }
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

async function abrirPagina() {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <header>
        <span id="cabTitulo"></span>
        <span id="cabSub"></span>
        <span id="cabEstado"></span>
      </header>
      <div class="progreso"><div id="progresoBarra"></div></div>
      <main id="lienzo"></main>
      <div id="estadoSr" role="status"></div>
    </body></html>`,
    { url: 'https://example.test/e/TOKEN1234567890', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;

  // jsdom no implementa <dialog> completo en todos los entornos: la página usa
  // showModal/close para la confirmación de entrega.
  const proto = w.HTMLDialogElement && w.HTMLDialogElement.prototype;
  if (proto && typeof proto.showModal !== 'function') {
    proto.showModal = function () { this.open = true; };
    proto.close = function () { this.open = false; };
  }

  const llamadas = [];
  const rpc = async (nombre, args) => {
    llamadas.push({ nombre, args });
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
        return { data: { intento_id: 'int-1', estado: 'completado', nota: 5 }, error: null };
      default:
        return { data: {}, error: null };
    }
  };
  w.supabaseClient = { rpc: (nombre, args) => Promise.resolve(rpc(nombre, args || {})) };

  vm.runInContext(paginaJs, dom.getInternalVMContext(), { filename: 'public-site/examen.js' });

  // 1. Introducción: el alumno escribe su nombre y entra.
  await esperar(() => w.document.querySelector('#nombreAlumno'));
  const nombre = w.document.querySelector('#nombreAlumno');
  nombre.value = 'Ana Alumna';
  const form = w.document.querySelector('#lienzo form');
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

  // 2. Preguntas pintadas.
  await esperar(() => w.document.querySelectorAll('#lienzo .pregunta').length === PREGUNTAS.length);
  return { w, llamadas };
}

function articuloDe(w, preguntaId) {
  return w.document.querySelector(`[data-pregunta-id="${preguntaId}"]`);
}

describe('página pública: «Relacionar columnas» se cuenta como respondida', () => {
  test('al elegir todas las parejas deja de estar «sin responder» y no bloquea la entrega', async () => {
    const { w } = await abrirPagina();

    const artRel = articuloDe(w, 'p-relacionar');
    expect(artRel, 'la pregunta de relacionar se pinta').toBeTruthy();
    const selects = artRel.querySelectorAll('select');
    expect(selects, 'una fila por elemento de la izquierda').toHaveLength(2);
    expect(artRel.className).toContain('pregunta--sin-responder');

    // Responder la multiple
    const radio = articuloDe(w, 'p-multiple').querySelector('input[type="radio"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));

    // Responder TODAS las parejas (identidad: Moisés→Éxodo, Noé→Génesis)
    selects.forEach((s, i) => {
      s.value = String(i);
      s.dispatchEvent(new w.Event('change', { bubbles: true }));
    });

    await esperar(() => !artRel.className.includes('sin-responder'));

    // El progreso cuenta la pregunta…
    expect(w.document.getElementById('textoProgreso').textContent).toBe('2 de 2 respondidas');
    expect(w.document.getElementById('cabEstado').textContent).toBe('2/2');
    // …y la tarjeta no queda marcada como pendiente.
    expect(artRel.className).not.toContain('pregunta--sin-responder');

    // La entrega no puede quedar bloqueada por una obligatoria ya respondida.
    w.document.getElementById('btnEntregar').click();
    const dialogo = w.document.querySelector('dialog');
    expect(dialogo, 'se abre la confirmación').toBeTruthy();
    expect(dialogo.textContent).toContain('Has respondido todas las preguntas');
    expect(dialogo.textContent).not.toContain('Debes responder las preguntas obligatorias');
    const enviar = Array.from(dialogo.querySelectorAll('button'))
      .find((b) => b.textContent === 'Sí, entregar');
    expect(enviar, 'el botón de enviar existe').toBeTruthy();
    expect(enviar.disabled, 'el botón de enviar NO está bloqueado').toBe(false);
  });
});
