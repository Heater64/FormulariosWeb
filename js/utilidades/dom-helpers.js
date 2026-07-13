(function() {
  'use strict';

  window.helpers = {
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    formatearFecha(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    },

    generarUUID() {
      return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },

    delegar(contenedor, selector, evento, handler) {
      contenedor.addEventListener(evento, e => {
        const el = e.target.closest(selector);
        if (el && contenedor.contains(el)) handler(e, el);
      });
    },

    $ (selector, ctx) { return (ctx || document).querySelector(selector); },
    $$ (selector, ctx) { return Array.from((ctx || document).querySelectorAll(selector)); }
  };
})();
