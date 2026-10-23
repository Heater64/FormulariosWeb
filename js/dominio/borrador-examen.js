/* ============================================================================
 * js/dominio/borrador-examen.js — reglas del borrador local del editor
 * ----------------------------------------------------------------------------
 * Lógica pura (sin DOM ni localStorage) para que el editor pueda guardar
 * mientras se escribe y recuperar el trabajo tras un cierre o una recarga.
 *
 * Un borrador es una instantánea del examen en memoria + dos datos de control:
 *   · baseEn     — versión del servidor sobre la que se empezó a editar
 *   · pendiente  — hay cambios locales que aún no han llegado a la nube
 *
 * `pendiente` es la única autoridad para decidir si se restaura: un borrador
 * recién guardado en la nube se conserva como red de seguridad (pendiente
 * false), pero no se vuelve a ofrecer al abrir el editor.
 * ==========================================================================*/
(function () {
  'use strict';

  const PREFIJO = 'fb_editor_borrador:';
  const MAX_BORRADORES = 10;
  const VERSION = 1;

  const texto = (valor) => String(valor == null ? '' : valor);
  const esObjeto = (valor) => !!valor && typeof valor === 'object' && !Array.isArray(valor);

  /** Clave estable: 'nuevo' mientras el examen no tiene id de servidor. */
  function clave(id) {
    return PREFIJO + (id ? String(id) : 'nuevo');
  }

  /** Copia profunda del examen apta para JSON (evita referencias al estado vivo). */
  function crearInstantanea(examen, opciones) {
    const opciones2 = opciones || {};
    const copia = esObjeto(examen) ? JSON.parse(JSON.stringify(examen)) : {};
    return {
      version: VERSION,
      clave: clave(copia.id),
      examen: copia,
      baseEn: opciones2.baseEn || null,
      guardadoEn: opciones2.ahora || new Date().toISOString(),
      pendiente: opciones2.pendiente !== false,
      rev: Math.max(0, Number(opciones2.rev) || 0)
    };
  }

  /**
   * ¿Merece la pena ofrecer este borrador? Un examen recién abierto tiene una
   * pregunta vacía: eso no es contenido del usuario y no debe ensuciar la
   * lista de «borradores sin terminar».
   */
  function tieneContenidoReal(examen) {
    if (!esObjeto(examen)) return false;
    if (texto(examen.titulo).trim()) return true;
    // Un temario pegado también es trabajo del profesor: sin esto, un
    // dispositivo sin título y solo temario perdería la recuperación local.
    if (esObjeto(examen.temario) && Array.isArray(examen.temario.items) && examen.temario.items.length) return true;
    const preguntas = Array.isArray(examen.preguntas) ? examen.preguntas : [];
    return preguntas.some((pregunta) => {
      if (!esObjeto(pregunta)) return false;
      if (texto(pregunta.texto).trim()) return true;
      if (Array.isArray(pregunta.opciones) && pregunta.opciones.some((opcion) => texto(opcion).trim())) return true;
      if (Array.isArray(pregunta.huecos) && pregunta.huecos.some((hueco) => texto(hueco && hueco.respuesta_correcta).trim())) return true;
      return false;
    });
  }

  function instantaneaValida(borrador) {
    return esObjeto(borrador) && borrador.version === VERSION && esObjeto(borrador.examen);
  }

  /** Solo se restaura lo que tiene cambios locales pendientes y contenido. */
  function necesitaRestauracion(borrador) {
    if (!instantaneaValida(borrador) || !borrador.pendiente) return false;
    return tieneContenidoReal(borrador.examen);
  }

  /** Datos mínimos para pintar la tarjeta de «borradores sin terminar». */
  function resumenBorrador(borrador) {
    const examen = (instantaneaValida(borrador) && borrador.examen) || {};
    const preguntas = Array.isArray(examen.preguntas) ? examen.preguntas.length : 0;
    return {
      id: examen.id || null,
      titulo: texto(examen.titulo).trim(),
      preguntas,
      guardadoEn: borrador && borrador.guardadoEn ? borrador.guardadoEn : null
    };
  }

  window.borradorExamen = {
    PREFIJO,
    MAX_BORRADORES,
    VERSION,
    clave,
    crearInstantanea,
    tieneContenidoReal,
    instantaneaValida,
    necesitaRestauracion,
    resumenBorrador
  };
})();
