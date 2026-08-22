// ============================================================
// js/utilidades/sanitizacion.js — Saneamiento de HTML generado
// por el usuario para contextos de riesgo (ventanas de impresión
// o exportación). Los contextos normales ya escapan con
// window.helpers.escapeHtml; este sanitizador es para cuando el
// contenido RICO debe conservarse (p.ej. notas al exportar PDF).
// ============================================================
(function () {
  'use strict';

  // URLs que no deben llegar a href/src en ningún caso.
  const URL_PELIGROSA = /^\s*(javascript|vbscript|data:text\/html|file):/i;
  // Elementos que pueden ejecutar código o escapar el documento.
  const NODOS_PELIGROSOS = 'script, iframe, object, embed, link, meta, base, form, style, svg, math, template';

  function sanitizarHtml(html) {
    if (typeof html !== 'string' || !html) return html || '';
    let doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      // Sin DOMParser (entorno raro): devolver texto plano sin HTML.
      const div = document.createElement('div');
      div.textContent = html;
      return div.innerHTML;
    }
    // Eliminar nodos que ejecutan código o alteran el documento.
    doc.body.querySelectorAll(NODOS_PELIGROSOS).forEach((n) => n.remove());

    // Limpiar atributos peligrosos en todo lo que queda.
    doc.body.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const nombre = attr.name.toLowerCase();
        const valor = attr.value;
        // Manejadores de eventos (onclick, onerror…), srcdoc, formaction.
        if (nombre.startsWith('on') || nombre === 'srcdoc' || nombre === 'formaction' || nombre === 'xlink:href') {
          el.removeAttribute(attr.name);
          return;
        }
        // URLs peligrosas en enlaces e imágenes.
        if ((nombre === 'href' || nombre === 'src') && URL_PELIGROSA.test(valor)) {
          el.removeAttribute(attr.name);
          return;
        }
        // style con url() o expression() (CSS injection).
        if (nombre === 'style' && /url\s*\(|expression\s*\(/i.test(valor)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  }

  window.sanitizacion = { sanitizarHtml };
})();
