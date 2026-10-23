/**
 * Fase 2 del temario: el temario PUBLICADO llega al alumno.
 *   · supabase/migraciones/079_temario_alumno.sql — helper interna
 *     fb_temario_publicado + clave `temario` en obtener_examen_alumno y
 *     fb_contexto_enlace (fb_estado_enlace la hereda: ctx - 'preguntas').
 *   · /tomar/:id — bloque desplegable detrás de la bandera 'temario'.
 *   · /e/<token> — bloque en la pantalla de introducción (lo pinta el
 *     servidor decidido; la página solo muestra lo que llega saneado).
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migracion = read('supabase/migraciones/079_temario_alumno.sql');
const estadoEnlace56 = read('supabase/migraciones/056_enlaces_examen_alumnos.sql');
const vistaTomar = read('js/vistas/vista-examen-tomar.js');
const paginaJs = read('public-site/examen.js');
const paginaHtml = read('public-site/examen.html');

// ── Migración 079 ──────────────────────────────────────────────────────────

describe('temario alumno — migración 079', () => {
  test('la helper interna solo expone temario PUBLICADO y con la bandera activa', () => {
    expect(migracion).toContain('CREATE FUNCTION public.fb_temario_publicado(p_temario JSONB)');
    expect(migracion).toContain("coalesce(p_temario->>'publicado', 'false') <> 'true'");
    // Interruptor de emergencia también en el lado del alumno: reutiliza la
    // misma resolución de banderas que el cliente (fb_funciones).
    expect(migracion).toContain('FROM public.fb_funciones() f');
    expect(migracion).toContain("f.clave = 'temario' AND f.activa");
  });

  test('la helper sanea: tipos whitelist, texto acotado y refs solo-array', () => {
    expect(migracion).toContain("WHEN 'referencia' THEN 'referencia'");
    expect(migracion).toContain("ELSE 'texto'");
    expect(migracion).toContain('left(coalesce(it->>\'texto\', \'\'), 500)');
    expect(migracion).toContain("jsonb_typeof(it->'refs') = 'array'");
    // El alumno nunca ve avisos, estado de revisión ni texto_original.
    expect(migracion).not.toMatch(/'avisos'/);
    expect(migracion).not.toMatch(/'texto_original'/);
    expect(migracion).not.toMatch(/'estado', it/);
  });

  test('la helper está revoked y las RPC conservan su tipo y sus permisos', () => {
    expect(migracion).toContain('DROP FUNCTION IF EXISTS public.fb_temario_publicado(JSONB)');
    expect(migracion).toContain('REVOKE ALL ON FUNCTION public.fb_temario_publicado(JSONB) FROM PUBLIC, anon, authenticated');
    // Mismo tipo de retorno (JSONB): CREATE OR REPLACE conserva los GRANT.
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.obtener_examen_alumno(p_examen_id UUID)\nRETURNS JSONB');
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.fb_contexto_enlace(p_token TEXT)\nRETURNS JSONB');
    // No se recrean ni se revocan las RPC del alumno.
    expect(migracion).not.toMatch(/DROP FUNCTION IF EXISTS public\.(obtener_examen_alumno|fb_contexto_enlace)/);
    expect(migracion).not.toMatch(/REVOKE EXECUTE ON FUNCTION public\.(obtener_examen_alumno|fb_contexto_enlace)/);
  });

  test('ambas RPC entregan la clave temario', () => {
    const veces = (migracion.match(/'temario', public\.fb_temario_publicado\(e\.temario\)/g) || []).length;
    expect(veces).toBe(2);
    // Los cuerpos son los de 047/063 con esa única añadidura.
    expect(migracion).toContain("IF NOT FOUND OR NOT public.es_miembro_del_grupo(e.grupo_id) THEN RAISE EXCEPTION 'Examen no disponible'");
    expect(migracion).toContain("RAISE EXCEPTION 'Enlace no valido'");
  });

  test('fb_estado_enlace hereda el temario (devuelve el contexto menos preguntas)', () => {
    expect(estadoEnlace56).toContain("ctx := public.fb_contexto_enlace(p_token)");
    expect(estadoEnlace56).toContain("RETURN ctx - 'preguntas'");
  });
});

// ── Vista /tomar/:id ───────────────────────────────────────────────────────

describe('temario alumno — bloque en /tomar/:id', () => {
  test('la vista lo pinta detrás de la bandera y dentro de examen-lista', () => {
    expect(vistaTomar).toContain("window.features.activa('temario')");
    expect(vistaTomar).toContain('_htmlTemarioAlumno(examen.temario)');
    // El bloque va en <main> antes de las preguntas.
    const main = vistaTomar.slice(
      vistaTomar.indexOf('<main class="o-contenedor examen-lista">'),
      vistaTomar.indexOf('</main>')
    );
    expect(main).toContain('${temarioHtml}');
    expect(main.indexOf('temarioHtml')).toBeLessThan(main.indexOf('preguntasExamen'));
    expect(vistaTomar).not.toContain('onclick=');
  });

  test('_htmlTemarioAlumno: orden, tipos, chips y escape', () => {
    const esc = (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = { helpers: { escapeHtml: esc } };
    new Function('window', 'store', 'router', `${vistaTomar}\nreturn window.vistaExamenTomar;`)(w, {}, {});
    const vista = w.vistaExamenTomar;

    const html = vista._htmlTemarioAlumno({
      items: [
        { tipo: 'texto', texto: 'ZZZ <script>', orden: 9, refs: [] },
        { tipo: 'referencia', texto: 'Efesios 5:4', orden: 0, refs: [{ libro: 'Efesios', capitulo: 5, versiculos: '4' }] },
        { tipo: 'tarea', texto: 'Cuántos capítulos', orden: 3, refs: [] }
      ]
    });

    expect(html).toContain('<details class="examen-temario">');
    expect(html).toContain('3 elementos');
    // Orden por `orden`, no por posición del array.
    expect(html.indexOf('Efesios 5:4')).toBeLessThan(html.indexOf('Cuántos capítulos'));
    expect(html.indexOf('Cuántos capítulos')).toBeLessThan(html.indexOf('ZZZ'));
    // Escape: el texto del profesor nunca inyecta marcado.
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    // Tipos etiquetados.
    expect(html).toContain('Referencia');
    expect(html).toContain('Tarea');
    expect(html).toContain('Texto libre');
    // Sin items no se pinta nada (evita el bloque vacío).
    expect(vista._htmlTemarioAlumno({ items: [] })).toBe('');
    expect(vista._htmlTemarioAlumno(null)).toBe('');
    expect(vista._htmlTemarioAlumno({})).toBe('');
  });
});

// ── Página pública /e/<token> ──────────────────────────────────────────────

describe('temario alumno — página pública /e/<token>', () => {
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

  /** Introducción con el contexto que devuelve fb_estado_enlace. */
  async function abrirIntro(ctx) {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <header><span id="cabTitulo"></span><span id="cabSub"></span><span id="cabEstado"></span></header>
        <div class="progreso"><div id="progresoBarra"></div></div>
        <main id="lienzo"></main>
        <div id="estadoSr" role="status"></div>
      </body></html>`,
      { url: 'https://example.test/e/TOKEN1234567890', runScripts: 'outside-only', pretendToBeVisual: true }
    );
    const w = dom.window;
    w.supabaseClient = {
      rpc: async (nombre) => {
        if (nombre === 'fb_estado_enlace') return { data: ctx, error: null };
        return { data: {}, error: null };
      }
    };
    vm.runInContext(paginaJs, dom.getInternalVMContext(), { filename: 'public-site/examen.js' });
    await esperar(() => w.document.querySelector('#nombreAlumno'));
    return w;
  }

  const CTX_BASE = {
    titulo: 'Examen 39', profesor: 'Profesora', comunitario: true,
    usado: false, cerrado: false, total_preguntas: 2, puntos_totales: 2,
    descripcion: 'Suerte'
  };

  test('con temario publicado aparece el bloque con sus chips de referencia', async () => {
    const w = await abrirIntro(Object.assign({}, CTX_BASE, {
      temario: {
        items: [
          { tipo: 'referencia', texto: 'Efesios 5:4', orden: 0, refs: [{ libro: 'Efesios', capitulo: 5, versiculos: '4' }] },
          { tipo: 'observacion', texto: 'Salmos 107, fijarse si es corto', orden: 1, refs: [{ libro: 'Salmos', capitulo: 107 }] }
        ]
      }
    }));

    const temario = w.document.querySelector('#lienzo details.temario');
    expect(temario, 'el bloque de temario se pinta en la introducción').toBeTruthy();
    expect(temario.querySelector('summary').textContent).toContain('Temario de estudio (2 elementos)');
    expect(temario.querySelector('.temario__ref').textContent).toBe('Efesios 5:4');
    expect(temario.textContent).toContain('Salmos 107, fijarse si es corto');
    // El nombre y el botón de empezar siguen intactos.
    expect(w.document.querySelector('#nombreAlumno')).toBeTruthy();
  });

  test('sin temario (o sin publicar: el servidor no lo entrega) no hay bloque', async () => {
    const w = await abrirIntro(CTX_BASE);
    expect(w.document.querySelector('#lienzo details.temario')).toBeNull();
    expect(w.document.querySelector('#nombreAlumno')).toBeTruthy();
  });

  test('el texto del temario se escapa (nunca inyecta marcado)', async () => {
    const w = await abrirIntro(Object.assign({}, CTX_BASE, {
      temario: { items: [{ tipo: 'texto', texto: '<img src=x onerror=alert(1)>', orden: 0, refs: [] }] }
    }));
    const temario = w.document.querySelector('#lienzo details.temario');
    expect(temario).toBeTruthy();
    expect(temario.querySelector('img')).toBeNull();
    expect(temario.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  test('la hoja de la página pública estiliza el bloque .temario', () => {
    expect(paginaHtml).toContain('.temario__cabecera');
    expect(paginaHtml).toContain('.temario__ref');
  });
});
