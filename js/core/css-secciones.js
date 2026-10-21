(function () {
  'use strict';

  /* ==========================================================================
   * css-secciones.js — CSS crítico vs. CSS por sección
   * --------------------------------------------------------------------------
   * Antes el <head> de index.html encadenaba 73 hojas: TODAS las vistas pagaban
   * los 425 KB de CSS (incluido el editor o la rejilla de evaluaciones) antes
   * del primer pintado. Ahora el <head> lleva solo lo crítico (tokens, reset,
   * objetos, utilidades y el chasis de la app) y este módulo añade las hojas de
   * la sección que se va a montar, en paralelo con la carga de la vista.
   *
   * Reglas:
   *  - Cada grupo se descarga una sola vez (se cachea el <link>).
   *  - La navegación nunca espera más de ESPERA_MAXIMA_MS: si la red va lenta,
   *    la vista monta con el CSS crítico y la hoja llega enseguida.
   *  - Funciona igual en dev (sirve /css/... suelto) y en producción (el build
   *    copia y minifica la carpeta css/).
   * ========================================================================== */

  const CARPETA = 'css/05-componentes/';
  const ESPERA_MAXIMA_MS = 300;

  // Un grupo = hojas que una sección necesita para verse bien.
  const GRUPOS = {
    panel: [
      '_plataforma.css', '_examenes-panel.css', '_entregas-panel.css',
      '_evaluaciones-panel.css', '_examen-lista.css',
      '_corregir-examen.css',
      '_calificaciones.css', '_tarjeta-estadistica.css', '_tarjeta-crear.css',
      '_zona-peligro.css', '_seccion-admin.css', '_btn-calidad.css',
      '_pull-to-refresh.css'
    ],
    editor: [
      // Primitivas compartidas: cabecera, botones, avisos, modales y campos.
      '_plataforma.css',
      '_editor-examenes.css', '_editor-preguntas.css', '_editor-tiptap.css',
      '_editor-dibujo.css', '_editor-huecos.css', '_editor-imagen.css',
      '_tarjeta-pregunta.css', '_pregunta-examen.css', '_sugerencias.css'
    ],
    estudio: [
      '_plataforma.css', '_estudio.css', '_tarjeta-libro.css', '_tarjeta-capitulo.css',
      '_tarjeta-memorizacion.css', '_memorizacion-juego.css', '_versiculo.css',
      '_explorar.css', '_grupos.css', '_desafios.css', '_notas.css',
      '_celebracion.css'
    ],
    cuenta: ['_plataforma.css', '_perfil.css', '_cuenta-panel.css', '_login.css'],
    alumno: ['_plataforma.css', '_examen-tomar.css', '_pregunta-examen.css']
  };

  // Ruta → grupos. El orden importa: la primera coincidencia gana.
  const RUTAS = [
    { patron: /^\/editor(\/|$)/, grupos: ['editor'] },
    { patron: /^\/tomar(\/|$)/, grupos: ['alumno'] },
    { patron: /^\/(cuenta|perfil)(\/|$)/, grupos: ['cuenta'] },
    { patron: /^\/(inicio|examenes|entregas|corregir|evaluaciones)(\/|$)/, grupos: ['panel'] },
    {
      patron: /^\/(estudio|estudiar|memorizacion|notas|mis-notas|grupos|explorar|desafio|mapa|capitulos|calificaciones|notificaciones|desafios|sesion-estudio)(\/|$)/,
      grupos: ['estudio']
    }
  ];

  const enlaces = new Map(); // archivo → Promise del <link>

  function url(archivo) {
    return new URL(CARPETA + archivo, document.baseURI).href;
  }

  function enlazar(archivo) {
    if (enlaces.has(archivo)) return enlaces.get(archivo);

    // Si la hoja ya viene en el HTML (p. ej. una página standalone), no se
    // vuelve a pedir: el navegador la tiene en caché y el <link> ya existe.
    const yaEsta = document.querySelector(`link[rel="stylesheet"][href$="${archivo}"]`);
    if (yaEsta) {
      const listo = Promise.resolve();
      enlaces.set(archivo, listo);
      return listo;
    }

    const promesa = new Promise((resolver) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url(archivo);
      link.dataset.seccion = archivo.replace(/_|\.css/g, '');
      // Nunca dejamos la navegación colgada por una hoja lenta.
      const tope = setTimeout(resolver, ESPERA_MAXIMA_MS);
      link.addEventListener('load', () => { clearTimeout(tope); resolver(); }, { once: true });
      link.addEventListener('error', () => { clearTimeout(tope); resolver(); }, { once: true });
      document.head.appendChild(link);
    });

    enlaces.set(archivo, promesa);
    return promesa;
  }

  function gruposDe(ruta) {
    const limpia = String(ruta || '/').split('?')[0];
    for (const entrada of RUTAS) {
      if (entrada.patron.test(limpia)) return entrada.grupos;
    }
    return [];
  }

  /** Carga (en paralelo) el CSS de la ruta y resuelve al terminar o al tope. */
  function cargar(ruta) {
    const grupos = gruposDe(ruta);
    if (!grupos.length) return Promise.resolve();
    const pendientes = [];
    for (const grupo of grupos) {
      for (const archivo of (GRUPOS[grupo] || [])) pendientes.push(enlazar(archivo));
    }
    return Promise.race([
      Promise.all(pendientes),
      new Promise((resolver) => setTimeout(resolver, ESPERA_MAXIMA_MS))
    ]);
  }

  /** Carga un grupo concreto por nombre (lo usan modales fuera de ruta). */
  function cargarGrupo(nombre) {
    const archivos = GRUPOS[nombre] || [];
    return Promise.all(archivos.map(enlazar));
  }

  /** Precarga en reposo las hojas de las secciones probables del rol. */
  function precargar(rutas) {
    const lista = rutas && rutas.length ? rutas : ['/inicio', '/examenes', '/entregas'];
    const tarea = () => lista.forEach((ruta) => cargar(ruta).catch(() => {}));
    if ('requestIdleCallback' in window) window.requestIdleCallback(tarea, { timeout: 4000 });
    else setTimeout(tarea, 2500);
  }

  window.cssSecciones = { cargar, cargarGrupo, precargar, gruposDe, GRUPOS, RUTAS };
})();
