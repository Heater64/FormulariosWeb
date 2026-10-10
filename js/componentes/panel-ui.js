/* ============================================================================
 * js/componentes/panel-ui.js
 * ----------------------------------------------------------------------------
 * Ayudas de interfaz compartidas por las vistas del panel (inicio, exámenes,
 * entregas, editor y cuenta). Evita repetir el mismo modal y los mismos
 * formateos en cinco archivos distintos.
 * ==========================================================================*/
(function () {
  'use strict';

  const esc = (valor) => window.helpers.escapeHtml(valor == null ? '' : String(valor));

  function tiempoRelativo(fecha) {
    if (!fecha) return '—';
    const diff = Date.now() - new Date(fecha).getTime();
    if (!isFinite(diff)) return '—';
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return 'hace ' + min + ' min';
    const horas = Math.floor(min / 60);
    if (horas < 24) return 'hace ' + horas + ' h';
    const dias = Math.floor(horas / 24);
    if (dias < 30) return 'hace ' + dias + ' d';
    return window.helpers.formatearFecha(fecha);
  }

  function fechaCorta(fecha) {
    if (!fecha) return '—';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return window.helpers.formatearFecha(fecha);
    }
  }

  function numero(valor) {
    const n = Number(valor);
    if (!isFinite(n)) return '—';
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  /**
   * Modal accesible. Devuelve { raiz, cuerpo, pie, cerrar }.
   * - Cierra con Escape, con el botón ✕ y al pulsar el fondo.
   * - Atrapa el foco dentro del diálogo mientras está abierto.
   */
  function modal({ titulo, cuerpoHtml, pieHtml, ancho }) {
    const previoFoco = document.activeElement;
    const raiz = document.createElement('div');
    raiz.className = 'adm-modal';
    const contenido = document.createElement('div');
    contenido.className = 'adm-modal__contenido';
    contenido.setAttribute('role', 'dialog');
    contenido.setAttribute('aria-modal', 'true');
    if (ancho) contenido.style.maxWidth = ancho;

    contenido.innerHTML = `
      <div class="adm-modal__cabecera">
        <h2 class="adm-modal__titulo" id="admModalTitulo">${esc(titulo)}</h2>
        <button class="adm-modal__cerrar" type="button" aria-label="Cerrar">✕</button>
      </div>
      <div class="adm-modal__cuerpo"></div>
      <div class="adm-modal__pie"></div>`;
    contenido.setAttribute('aria-labelledby', 'admModalTitulo');

    const cuerpo = contenido.querySelector('.adm-modal__cuerpo');
    const pie = contenido.querySelector('.adm-modal__pie');
    if (cuerpoHtml) cuerpo.innerHTML = cuerpoHtml;
    if (pieHtml) pie.innerHTML = pieHtml;

    raiz.appendChild(contenido);
    document.body.appendChild(raiz);

    let cerrado = false;
    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      document.removeEventListener('keydown', alTeclado, true);
      raiz.remove();
      if (previoFoco && typeof previoFoco.focus === 'function') previoFoco.focus();
    }

    function alTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        cerrar();
        return;
      }
      if (evento.key !== 'Tab') return;
      const enfocables = contenido.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const lista = Array.prototype.filter.call(enfocables, (n) => !n.disabled && n.offsetParent !== null);
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    contenido.querySelector('.adm-modal__cerrar').addEventListener('click', cerrar);
    raiz.addEventListener('click', (evento) => { if (evento.target === raiz) cerrar(); });
    document.addEventListener('keydown', alTeclado, true);

    const primerCampo = contenido.querySelector('input, textarea, select, button:not(.adm-modal__cerrar)');
    if (primerCampo) primerCampo.focus();

    return { raiz, contenido, cuerpo, pie, cerrar };
  }

  window.panelUI = { esc, tiempoRelativo, fechaCorta, numero, modal };
})();
