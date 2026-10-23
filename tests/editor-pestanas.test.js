import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const editorFuente = read('js/vistas/vista-examen-editor.js');
const cssFuente = read('js/core/css-secciones.js');

describe('editor con pestañas — estructura', () => {
  test('el editor define el tablist con sus dos pestañas y paneles', () => {
    expect(editorFuente).toContain('role="tablist"');
    expect(editorFuente).toContain('data-pestana="config"');
    expect(editorFuente).toContain('data-pestana="contenido"');
    expect(editorFuente).toContain('id="panelConfig"');
    expect(editorFuente).toContain('aria-selected');
    // El panel de contenido arranca oculto; la pestaña inicial lo decide.
    expect(editorFuente).toContain('<div id="panelContenido" role="tabpanel" aria-labelledby="pestanaContenido" hidden>');
  });

  test('Configuración son tres tarjetas (Examen, Evaluación, Temario); Contenido solo las preguntas', () => {
    const cfg = editorFuente.slice(editorFuente.indexOf('<div id="panelConfig"'), editorFuente.indexOf('<div id="panelContenido"'));
    expect(cfg).toContain('id="titulo"');
    expect(cfg).toContain('id="descripcion"');
    expect(cfg).toContain('id="evaluacion"');
    // Cada sección es su propia tarjeta con título y aria-labelledby.
    expect((cfg.match(/class="adm-bloque"/g) || []).length).toBe(2);
    expect(cfg).toContain('>Examen</h2>');
    expect(cfg).toContain('>Evaluación</h2>');
    expect(cfg).toContain('id="titSeccionExamen"');
    expect(cfg).toContain('id="titSeccionEvaluacion"');
    // La tercera (Temario) la monta el componente detrás de la bandera.
    expect(cfg).toContain('temarioContenedor');
    // Solo la plantilla HTML del panel: el resto del archivo contiene
    // _montarTemario(), que legítimamente menciona el contenedor.
    const finPlantilla = editorFuente.indexOf('`;', editorFuente.indexOf('<div id="panelContenido"'));
    const contenido = editorFuente.slice(editorFuente.indexOf('<div id="panelContenido"'), finPlantilla);
    expect(contenido).toContain('id="preguntas"');
    expect(contenido).not.toContain('temarioContenedor');
  });

  test('examen nuevo y ?temario=1 abren Configuración; el existente abre Contenido', () => {
    expect(editorFuente).toContain("(!editando || this._abrirTemario) ? 'config' : 'contenido'");
  });

  test('el cambio de pestaña no repinta (no pierde campos a medio escribir)', () => {
    expect(editorFuente).toContain('_mostrarPestana(clave)');
    expect(editorFuente).not.toMatch(/_mostrarPestana\([^)]*\)[^}]*_pintar\(/);
    expect(editorFuente).not.toContain('onclick=');
  });

  test('la hoja de pestañas está en el grupo editor', () => {
    const inicio = cssFuente.indexOf('editor: [');
    const fin = cssFuente.indexOf('],', inicio);
    expect(cssFuente.slice(inicio, fin)).toContain("'_editor-pestanas.css'");
  });

  test('roving tabindex y teclado: solo la activa es tabulable y hay flechas', () => {
    expect(editorFuente).toMatch(/id="pestanaConfig"[\s\S]{0,80}tabindex="0"/);
    expect(editorFuente).toMatch(/id="pestanaContenido"[\s\S]{0,80}tabindex="-1"/);
    expect(editorFuente).toContain('boton.tabIndex = seleccionada ? 0 : -1');
    expect(editorFuente).toContain('_alPulsarTeclaPestana(evento)');
    expect(editorFuente).toContain("addEventListener('keydown', (e) => this._alPulsarTeclaPestana(e))");
    expect(editorFuente).toContain("evento.key === 'ArrowRight'");
    expect(editorFuente).toContain("evento.key === 'Home'");
    expect(editorFuente).toContain("evento.key === 'End'");
  });

  test('el CSS es un control segmentado con tokens (sin colores crudos)', () => {
    const css = read('css/05-componentes/_editor-pestanas.css');
    expect(css).toContain('--radio-pill');
    expect(css).toContain('background: var(--color-fondo-alt)');
    expect(css).toContain('box-shadow: var(--sombra-xs)');
    expect(css).toMatch(/\.adm-pestanas__boton--activo[^{]*\{[^}]*--color-fondo-tarjeta/);
    expect(css).toContain('prefers-reduced-motion');
    // Solo tokens: nada de hexadecimales ni rgb() literales.
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
  });
});

describe('editor con pestañas — comportamiento en el DOM', () => {
  function crearEntorno() {
    const dom = new JSDOM(
      '<!doctype html><html><body>' +
        '<div class="adm-pestanas" role="tablist">' +
          '<button type="button" class="adm-pestanas__boton" role="tab" id="pestanaConfig" aria-selected="false" data-pestana="config">Configuración</button>' +
          '<button type="button" class="adm-pestanas__boton" role="tab" id="pestanaContenido" aria-selected="false" data-pestana="contenido">Contenido del examen</button>' +
        '</div>' +
        '<section id="panelConfig" role="tabpanel"></section>' +
        '<div id="panelContenido" role="tabpanel" hidden></div>' +
      '</body></html>',
      { url: 'http://localhost/', runScripts: 'outside-only' }
    );
    const w = dom.window;
    const ctx = dom.getInternalVMContext();
    w.helpers = { escapeHtml: (v) => String(v == null ? '' : String(v)) };
    ['js/componentes/panel-ui.js', 'js/vistas/vista-examen-editor.js']
      .forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));
    return w;
  }

  test('por defecto se ve Configuración y el otro panel queda oculto', () => {
    const w = crearEntorno();
    w.vistaExamenEditor._pestana = 'config';
    w.vistaExamenEditor._aplicarPestana();
    expect(w.document.getElementById('panelConfig').hidden).toBe(false);
    expect(w.document.getElementById('panelContenido').hidden).toBe(true);
    expect(w.document.getElementById('pestanaConfig').getAttribute('aria-selected')).toBe('true');
    expect(w.document.getElementById('pestanaConfig').classList.contains('adm-pestanas__boton--activo')).toBe(true);
  });

  test('cambiar de pestaña alterna paneles, aria-selected y clase activa', () => {
    const w = crearEntorno();
    w.vistaExamenEditor._pestana = 'config';
    w.vistaExamenEditor._aplicarPestana();
    w.vistaExamenEditor._mostrarPestana('contenido');

    expect(w.document.getElementById('panelConfig').hidden).toBe(true);
    expect(w.document.getElementById('panelContenido').hidden).toBe(false);
    expect(w.document.getElementById('pestanaContenido').getAttribute('aria-selected')).toBe('true');
    expect(w.document.getElementById('pestanaConfig').getAttribute('aria-selected')).toBe('false');
    expect(w.document.getElementById('pestanaConfig').classList.contains('adm-pestanas__boton--activo')).toBe(false);
    expect(w.document.getElementById('pestanaContenido').classList.contains('adm-pestanas__boton--activo')).toBe(true);
  });

  test('una clave desconocida no cambia la pestaña', () => {
    const w = crearEntorno();
    w.vistaExamenEditor._pestana = 'contenido';
    w.vistaExamenEditor._aplicarPestana();
    w.vistaExamenEditor._mostrarPestana('inventada');
    expect(w.vistaExamenEditor._pestana).toBe('contenido');
    expect(w.document.getElementById('panelContenido').hidden).toBe(false);
  });

  test('roving tabindex en el DOM: solo la pestaña activa es tabulable', () => {
    const w = crearEntorno();
    w.vistaExamenEditor._pestana = 'config';
    w.vistaExamenEditor._aplicarPestana();
    expect(w.document.getElementById('pestanaConfig').tabIndex).toBe(0);
    expect(w.document.getElementById('pestanaContenido').tabIndex).toBe(-1);

    w.vistaExamenEditor._mostrarPestana('contenido');
    expect(w.document.getElementById('pestanaConfig').tabIndex).toBe(-1);
    expect(w.document.getElementById('pestanaContenido').tabIndex).toBe(0);
  });

  test('las flechas circulan pestañas con foco; Home/End van a los extremos', () => {
    const w = crearEntorno();
    w.vistaExamenEditor._pestana = 'config';
    w.vistaExamenEditor._aplicarPestana();
    const tecla = (key) => new w.KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });

    w.vistaExamenEditor._alPulsarTeclaPestana(tecla('ArrowRight'));
    expect(w.vistaExamenEditor._pestana).toBe('contenido');
    expect(w.document.activeElement).toBe(w.document.getElementById('pestanaContenido'));

    // Envuelve al dar la vuelta.
    w.vistaExamenEditor._alPulsarTeclaPestana(tecla('ArrowRight'));
    expect(w.vistaExamenEditor._pestana).toBe('config');
    expect(w.document.activeElement).toBe(w.document.getElementById('pestanaConfig'));

    w.vistaExamenEditor._alPulsarTeclaPestana(tecla('End'));
    expect(w.vistaExamenEditor._pestana).toBe('contenido');
    w.vistaExamenEditor._alPulsarTeclaPestana(tecla('Home'));
    expect(w.vistaExamenEditor._pestana).toBe('config');

    // Teclas ajenas no tocan nada.
    w.vistaExamenEditor._alPulsarTeclaPestana(tecla('a'));
    expect(w.vistaExamenEditor._pestana).toBe('config');
  });
});
