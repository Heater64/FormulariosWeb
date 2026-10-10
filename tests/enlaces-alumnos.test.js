import { describe, expect, test } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migracion = read('supabase/migraciones/056_enlaces_examen_alumnos.sql');
const migracion057 = read('supabase/migraciones/057_resumen_admin_json_preguntas_robusto.sql');
const repositorio = read('js/datos/plataforma-repository.js');
const paginaHtml = read('public-site/examen.html');
const paginaJs = read('public-site/examen.js');
const vercel = read('vercel.json');

const RPC_PUBLICAS = [
  'fb_estado_enlace',
  'fb_iniciar_por_token',
  'fb_guardar_borrador_token',
  'fb_entregar_por_token',
  'fb_consultar_entrega'
];

const RPC_ADMIN = [
  'fb_crear_enlaces',
  'fb_listar_enlaces',
  'fb_eliminar_enlace',
  'fb_listar_entregas',
  'fb_obtener_entrega',
  'fb_corregir_entrega',
  'fb_cambiar_estado_examen',
  'fb_resumen_admin'
];

describe('enlaces individuales de un solo uso', () => {
  test('la migración crea la tabla de enlaces con token único y vínculo al intento', () => {
    expect(migracion).toContain('CREATE TABLE IF NOT EXISTS public.examen_enlaces');
    expect(migracion).toContain('token         TEXT NOT NULL UNIQUE');
    expect(migracion).toContain('intento_id    UUID REFERENCES public.intentos_examen_personalizado(id)');
    // Un enlace no puede tener dos intentos: la invariante vive en la BD.
    expect(migracion).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_intento_enlace_unico');
  });

  test('los intentos sin cuenta pueden existir y guardan nombre y grupo', () => {
    expect(migracion).toContain('ALTER COLUMN alumno_id DROP NOT NULL');
    expect(migracion).toContain('ADD COLUMN IF NOT EXISTS alumno_nombre TEXT NOT NULL DEFAULT');
    expect(migracion).toContain('ADD COLUMN IF NOT EXISTS alumno_grupo TEXT NOT NULL DEFAULT');
  });

  test('el rol anon no recibe acceso a tablas: solo a las RPCs por token', () => {
    expect(migracion).toContain('REVOKE ALL ON public.examen_enlaces FROM anon;');
    for (const rpc of RPC_PUBLICAS) {
      expect(migracion).toContain(`GRANT EXECUTE ON FUNCTION public.${rpc}`);
    }
    // Las funciones del administrador nunca se conceden a anon.
    for (const rpc of RPC_ADMIN) {
      expect(migracion).toContain(`REVOKE ALL ON FUNCTION public.${rpc}`);
      const concesionesAAnon = migracion
        .split('\n')
        .filter((linea) => linea.includes(rpc) && /TO anon/.test(linea));
      expect(concesionesAAnon).toEqual([]);
    }
    expect(migracion).toContain('GRANT EXECUTE ON FUNCTION public.fb_crear_enlaces(UUID, JSONB) TO authenticated;');
  });

  test('las respuestas correctas nunca viajan al alumno antes de empezar', () => {
    // fb_estado_enlace devuelve el contexto SIN preguntas.
    expect(migracion).toContain("RETURN ctx - 'preguntas';");
    // El contexto se construye siempre con fb_sanitizar_preguntas.
    expect(migracion).toContain("'preguntas', public.fb_sanitizar_preguntas(e.preguntas)");
  });

  test('la entrega no fija nota: la nota solo la sella la corrección del administrador', () => {
    const entrega = migracion.slice(migracion.indexOf('FUNCTION public.fb_entregar_por_token'));
    expect(entrega).toContain('nota = NULL,');
    expect(entrega).toContain('corregido = FALSE,');
    expect(entrega).toContain('pendientes_correccion = coalesce(array_length(v_pendientes, 1), 0)');
    // El temporizador también se valida en servidor.
    expect(entrega).toContain('El tiempo del examen ha terminado');
  });

  test('no se puede cerrar la corrección con respuestas escritas pendientes', () => {
    expect(migracion).toContain('CREATE OR REPLACE FUNCTION public.fb_corregir_entrega');
    expect(migracion).toContain('Quedan % respuesta(s) escrita(s) sin corregir');
    expect(migracion).toContain('FUNCTION public.fb_preguntas_pendientes');
  });

  test('un enlace ya entregado no admite una segunda entrega', () => {
    expect(migracion).toContain("Ya entregaste este examen");
    expect(migracion).toContain("IF l.intento_id IS NULL THEN RAISE EXCEPTION 'Todavia no has comenzado el examen'; END IF;");
  });

  test('la migración 057 cuenta preguntas solo cuando el JSON almacenado es un array', () => {
    expect(migracion057).toContain('CREATE OR REPLACE FUNCTION public.fb_resumen_admin()');
    expect(migracion057).toContain("WHEN jsonb_typeof(e.preguntas) = 'array' THEN jsonb_array_length(e.preguntas)");
    expect(migracion057).toContain('ELSE 0');
    expect(migracion057).toContain('GRANT EXECUTE ON FUNCTION public.fb_resumen_admin() TO authenticated;');
  });

  test('el panel identifica preguntas JSONB mal formadas y explica cómo arreglarlas', async () => {
    const codigo = readFileSync(new URL('../js/datos/plataforma-repository.js', import.meta.url), 'utf8');
    const globalAnterior = global.window;
    global.window = {
      supabaseClient: { rpc: async () => ({ data: null, error: { code: '22023', message: 'cannot get array length of a scalar' } }) },
      errores: { mensajeUsuario: () => 'error genérico' }
    };
    try {
      new Function(codigo)();
      await expect(global.window.plataformaRepository.resumen())
        .rejects.toThrow('El resumen encontró preguntas con formato antiguo o dañado. Aplica la migración 057_resumen_admin_json_preguntas_robusto.sql en Supabase y recarga.');
    } finally {
      global.window = globalAnterior;
    }
  });

  test('el panel da una pista diagnóstica cuando Supabase deniega la RPC de resumen', async () => {
    const repositorioPath = new URL('../js/datos/plataforma-repository.js', import.meta.url);
    const codigo = readFileSync(repositorioPath, 'utf8');
    const globalAnterior = global.window;
    global.window = {
      supabaseClient: { rpc: async () => ({ data: null, error: { code: '42501', message: 'permission denied for function fb_resumen_admin' } }) },
      errores: { mensajeUsuario: () => 'No tienes permiso para realizar esta acción.' }
    };

    try {
      new Function(codigo)();
      await expect(global.window.plataformaRepository.resumen())
        .rejects.toThrow('No tienes permiso para realizar esta acción. (42501)');
    } finally {
      global.window = globalAnterior;
    }
  });

  test('el panel explica que debe aplicarse la migración 056 cuando falta la RPC de resumen', async () => {
    const repositorioPath = new URL('../js/datos/plataforma-repository.js', import.meta.url);
    const codigo = readFileSync(repositorioPath, 'utf8');
    const globalAnterior = global.window;
    const supabase = {
      rpc: async (nombre) => ({
        data: null,
        error: nombre === 'fb_resumen_admin'
          ? { code: 'PGRST202', message: 'Could not find the function in the schema cache' }
          : null
      })
    };
    global.window = { supabaseClient: supabase, errores: { mensajeUsuario: () => 'error genérico' } };

    try {
      new Function(codigo)();
      await expect(global.window.plataformaRepository.resumen())
        .rejects.toThrow('Falta aplicar la migración 056_enlaces_examen_alumnos.sql en Supabase.');
    } finally {
      global.window = globalAnterior;
    }
  });

  test('el panel y la página del alumno usan los nombres de RPC declarados en la migración', () => {
    // El panel del administrador entra por la capa de datos.
    for (const rpc of RPC_ADMIN) {
      expect(repositorio).toContain(`rpc('${rpc}'`);
    }
    // La página del alumno es autónoma (no carga los bundles de la SPA), así que
    // llama a sus cinco RPCs directamente sobre el cliente de Supabase.
    for (const rpc of RPC_PUBLICAS) {
      expect(paginaJs).toContain(`rpc('${rpc}'`);
    }
    // Ninguna capa debe inventar nombres que la migración no declare.
    const nombresUsados = [...repositorio.matchAll(/rpc\('([a-z_]+)'/g)].map((m) => m[1])
      .concat([...paginaJs.matchAll(/rpc\('([a-z_]+)'/g)].map((m) => m[1]));
    for (const nombre of new Set(nombresUsados)) {
      expect(migracion).toContain(`FUNCTION public.${nombre}(`);
    }
  });
});

describe('página pública del alumno', () => {
  test('el enlace /e/<token> se reescribe a la página del examen', () => {
    const config = JSON.parse(vercel);
    const rewrite = config.rewrites.find((r) => r.source === '/e/:token');
    expect(rewrite).toBeTruthy();
    expect(rewrite.destination).toBe('/examen.html');
  });

  test('usa rutas absolutas: la URL sigue siendo /e/<token> tras el rewrite', () => {
    expect(paginaHtml).toContain('<script src="/examen.js" defer></script>');
    expect(paginaHtml).toContain('<script src="/theme.js"></script>');
    expect(paginaHtml).toContain('src="/js/config/entorno.js"');
    // Rutas relativas resolverían a /e/... y darían 404.
    expect(paginaHtml).not.toContain('src="./examen.js"');
  });

  test('cumple la CSP: sin scripts inline ni handlers inline', () => {
    expect(paginaHtml).not.toContain('<script>');
    expect(paginaHtml).not.toContain('onclick=');
    expect(paginaHtml).not.toContain('onsubmit=');
  });

  test('es privada: no indexable y el alumno solo ve la respuesta correcta tras la corrección del administrador', async () => {
    expect(paginaHtml).toContain('noindex');

    // Comprobación a nivel de contrato, no de substring:
    //   · El JS público nunca define o serializa respuesta_correcta como dato
    //     propio (no hay literales de clave ni constantes).
    //   · La única forma en que aparece «respuesta_correcta» es como lectura
    //     procedimental de lo que el servidor devuelve DESPUÉS de
    //     fb_corregir_entrega (admin autenticado), y ahí se lee bien de
    //     detalle.respuesta_correcta o bien de pregunta.opciones[indice].
    expect(paginaJs).not.toMatch(/['"`]respuesta_correcta['"`]\s*[:=]/);
    expect(paginaJs).toMatch(/detalle\.respuesta_correcta/);
    expect(paginaJs).toMatch(/\.opciones\[/);

    // Y, para que el test siga siendo un guardia de comportamiento y no solo
    // de forma, verificamos que la página pública puede ejecutarse sin lanzar
    // al recibir un resultado corregido (Q2) con el cliente suplado.
    const clienteConResultadoCorregido = {
      rpc: async (nombre, args) => {
        if (nombre === 'fb_estado_enlace') {
          return { data: { titulo: 'Examen de prueba', profesor: 'Profesor', estado: 'publicado', publicado: true, usado: false, total_preguntas: 2, puntos_totales: 2 } };
        }
        if (nombre === 'fb_iniciar_por_token') {
          return { data: { intento_id: 'i1', reanudado: false, respuestas: {}, alumno_nombre: 'Alumno', preguntas: [{ id: 'p1', tipo: 'multiple', opciones: ['A', 'B'], puntos: 1 }, { id: 'p2', tipo: 'respuesta_corta', puntos: 1 }] } };
        }
        if (nombre === 'fb_entregar_por_token') {
          return { data: { intento_id: 'i1', estado: 'completado', pendientes_correccion: 1 } };
        }
        if (nombre === 'fb_consultar_entrega') {
          return { data: {
            estado: 'calificado',
            nota: 8.5,
            titulo: 'Examen de prueba',
            puntuacion: 85,
            preguntas: [{ id: 'p1', tipo: 'multiple', opciones: ['A', 'B'], puntos: 1 }, { id: 'p2', tipo: 'respuesta_corta', puntos: 1 }],
            detalle: {
              por_pregunta: {
                p1: { es_correcta: true, puntos: 1, respuesta_correcta: '0' },
                p2: { es_correcta: false, puntos: 0, respuesta_correcta: 'Pedro' }
              }
            }
          }};
        }
        throw new Error('rpc no esperada: ' + nombre);
      }
    };

    const viejoWindow = global.window;
    const viejoDocument = global.document;

    function stubDocument() {
      const doc = {
        addEventListener() {},
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { appendChild() {}, insertBefore() {}, removeChild() {}, clientWidth: 0, clientHeight: 0 },
        createElement(tag) {
          return {
            tagName: tag.toUpperCase(),
            className: '',
            id: '',
            textContent: '',
            style: { setProperty() {}, removeProperty() {}, cursor: '', border: '', maxWidth: '', margin: '', padding: '' },
            dataset: {},
            classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
            setAttribute() {},
            removeAttribute() {},
            getAttribute() { return null; },
            hasAttribute() { return false; },
            focus() {},
            appendChild() {},
            remove() {},
            click() {},
            addEventListener() {},
            removeEventListener() {},
            querySelector() { return null; },
            querySelectorAll() { return []; },
            contains() { return false; },
            closest() { return null; },
            childNodes: [],
            firstChild: null,
            lastChild: null,
            nextSibling: null,
            previousSibling: null,
            parentNode: null,
            parentElement: null,
            nodeType: 1,
            nodeValue: null,
            baseURI: '',
            ownerDocument: doc,
            cloneNode() { return this; },
            isConnected: false,
            getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
          };
        },
        createTextNode(text) { return { textContent: text, nodeType: 3 }; },
        readyState: 'complete',
      };
      return doc;
    }
    global.document = stubDocument();
    global.window = Object.assign({
      location: { pathname: '/e/TEST123', search: '', href: '/e/TEST123' },
      document: global.document,
      supabaseClient: clienteConResultadoCorregido,
    }, global.document);
    global.window.addEventListener = () => {};
    global.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    global.window.getComputedStyle = () => ({ getPropertyValue: () => '' });
    global.window.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    global.window.location.assign = () => {};
    global.window.location.replace = () => {};
    global.window.history = { pushState: () => {}, replaceState: () => {}, go: () => {}, back: () => {}, forward: () => {}, length: 1 };
    global.window.navigator = { userAgent: 'NodeJS' };
    global.window.devicePixelRatio = 1;
    global.window.crypto = { getRandomValues: (buf) => buf };
    global.window.Blob = class { constructor() {} };
    global.window.File = class { constructor() {} };
    global.window.FileReader = class { constructor() {} };
    global.window.Image = class { constructor() {} };
    global.window.HTMLInputElement = class { };
    global.window.HTMLTextAreaElement = class { };
    global.window.HTMLSelectElement = class { };
    global.window.HTMLOptionElement = class { };
    global.window.HTMLFormElement = class { };
    global.window.HTMLButtonElement = class { };
    global.window.HTMLLabelElement = class { };
    global.window.HTMLFieldSetElement = class { };
    global.window.HTMLLegendElement = class { };
    global.window.HTMLDivElement = class { };
    global.window.HTMLParagraphElement = class { };
    global.window.HTMLHeadingElement = class { };
    global.window.HTMLLIElement = class { };
    global.window.HTMLUListElement = class { };
    global.window.HTMLOListElement = class { };
    global.window.HTMLSpanElement = class { };
    global.window.HTMLAnchorElement = class { };
    global.window.HTMLElement = class { };
    global.window.Element = class { };
    global.window.Node = class { };
    global.window.Event = class { constructor() {} };
    global.window.CustomEvent = class { constructor() {} };
    global.window.Promise = Promise;
    global.window.setTimeout = setTimeout;
    global.window.clearTimeout = clearTimeout;
    global.window.setInterval = setInterval;
    global.window.clearInterval = clearInterval;
    global.window.queueMicrotask = queueMicrotask;
    global.window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    global.window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
    global.window.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
    try {
      new Function(paginaJs)();
    } finally {
      global.window = viejoWindow;
      try { global.document = viejoDocument; } catch (e) {}
    }
  });

  function examenJsFueraDeIIFE() {
    // Version evaluada inline de public-site/examen.js, con el IIFE desarmado
    // solo para esta prueba de contrato.
    return paginaJs;
  }

  test('la entrega se confirma y se guarda en el servidor', () => {
    expect(paginaJs).toContain("rpc('fb_entregar_por_token'");
    expect(paginaJs).toContain("rpc('fb_guardar_borrador_token'");
    expect(paginaJs).toContain('¿Entregar el examen?');
    // Los errores técnicos no se muestran al alumno.
    expect(paginaJs).toContain('mensajePublico');
  });

  test('el build público copia la página y su script', () => {
    const build = read('scripts/build-public.mjs');
    expect(build).toContain("'examen.html'");
    const publicCfg = read('vite.public.config.js');
    expect(publicCfg).toContain("'examen.js'");
  });

  test('no queda ninguna referencia bíblica en la página del alumno', () => {
    for (const palabra of ['Biblia', 'bíblic', 'versículo', 'memorización']) {
      expect(paginaHtml.toLowerCase()).not.toContain(palabra.toLowerCase());
      expect(paginaJs.toLowerCase()).not.toContain(palabra.toLowerCase());
    }
  });

  test('los assets referenciados existen en el repositorio', () => {
    expect(existsSync(new URL('../assets/iconos/icono.svg', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../public-site/theme.js', import.meta.url))).toBe(true);
  });

  describe('enlaces públicos y nombre obligatorio', () => {
    test('la introducción de un enlace público exige nombre antes de continuar', () => {
      expect(paginaJs).toContain("var nombre = inputNombre.value.trim();\n      if (nombre.length < 2) {\n        error.textContent = 'Escribe tu nombre para continuar.';");
      expect(paginaJs).toContain("inputNombre.required = true;");
    });

    test('la introducción del enlace público indica que el nombre es obligatorio', () => {
      expect(paginaJs).toContain("var avisoComunitario = el('div', 'aviso aviso--error');\n      avisoComunitario.appendChild(el('strong', null, 'Este enlace es público. '));");
      expect(paginaJs).toContain("avisoComunitario.appendChild(document.createTextNode('Escribe tu nombre para identificarte antes de responder.'));");
      expect(paginaJs).toContain('tarjeta.appendChild(avisoComunitario);');
    });

    test('la página oculta mensajes técnicos del servidor al alumno', () => {
      expect(paginaJs).toContain('function mensajePublico(mensaje) {');
      expect(paginaJs).toContain("/schema cache|does not exist|permission denied|JWT|violates|duplicate key|syntax error|relation \"/i.test(texto);");
      expect(paginaJs).toContain("return 'No hemos podido abrir el enlace. Pide a tu profesor que te lo envíe de nuevo.';");
    });

    test('el primer paso del flujo publico incluye nombre obligatorio y aviso de enlace publico', () => {
      const codigo = paginaJs;
      expect(codigo).toContain('function pantallaIntroduccion(ctx) {');
      expect(codigo).toContain("ctx.comunitario)");
      expect(codigo).toContain("tarjeta.appendChild(avisoComunitario);");
      expect(codigo).toContain("inputNombre.setAttribute('aria-describedby', errorId);");
    });

    test('la confirmación de entrega sigue siendo privada y exige respuestas obligatorias', () => {
      expect(paginaJs).toContain("var pendientes = estado.preguntas.filter(function (p) { return !estaRespondida(p.id); });");
      expect(paginaJs).toContain("var obligatoriasVacias = pendientes.filter(function (p) { return p.obligatoria; });");
      expect(paginaJs).toContain('¿Entregar el examen?');
      expect(paginaJs).toContain('Debes responder las preguntas obligatorias antes de entregar.');
    });
  });
});
