(function() {
  'use strict';

  const accesibilidad = {
    _teclaActiva: false,
    _inicializado: false,

    iniciar() {
      if (this._inicializado) return;
      this._inicializado = true;

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          this._teclaActiva = true;
          document.body.classList.add('navegacion-teclado');
          document.body.classList.remove('navegacion-raton');
        }
      });

      document.addEventListener('mousedown', () => {
        this._teclaActiva = false;
        document.body.classList.remove('navegacion-teclado');
        document.body.classList.add('navegacion-raton');
      });

      this._mejorarNavegacion();
      this._anuncios();
    },

    _mejorarNavegacion() {
      document.querySelectorAll('[tabindex]').forEach(el => {
        if (el.tabIndex === 0) return;
        if (el.matches('button, a, input, select, textarea, [role="button"]')) return;
      });

      document.addEventListener('focusin', (e) => {
        if (this._teclaActiva && e.target.matches('[data-nav], button, a, input, select, textarea, [tabindex]')) {
          e.target.classList.add('foco-visible');
        }
      });

      document.addEventListener('focusout', (e) => {
        e.target.classList.remove('foco-visible');
      });
    },

    _anuncios() {
      let announcer = document.getElementById('fb-announcer');
      if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'fb-announcer';
        announcer.className = 'u-solo-lectores-pantalla';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
      }

      window.eventBus.suscribir('route:change', ({ ruta }) => {
        this._anunciar(`Navegaste a ${ruta}`);
      });

      window.eventBus.suscribir('sincronizacion:estado', ({ pendientes }) => {
        if (pendientes > 0) {
          this._anunciar(`${pendientes} cambios pendientes de sincronizar`);
        } else {
          this._anunciar('Sincronización completada');
        }
      });

      window.anunciador = this;
    },

    _anunciar(texto) {
      const announcer = document.getElementById('fb-announcer');
      if (!announcer) return;
      announcer.textContent = '';
      requestAnimationFrame(() => {
        announcer.textContent = texto;
      });
    },

    anunciar(texto) {
      this._anunciar(texto);
    },

    skipToMain() {
      const main = document.getElementById('app-root');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
        main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
      }
    },

    crearSkipLink() {
      if (document.getElementById('skip-link')) return;
      const skip = document.createElement('a');
      skip.id = 'skip-link';
      skip.href = '#app-root';
      skip.className = 'skip-link u-solo-lectores-pantalla';
      skip.textContent = 'Saltar al contenido principal';
      skip.addEventListener('click', (e) => {
        e.preventDefault();
        this.skipToMain();
      });
      document.body.prepend(skip);
    },

    toggleModoAltoContraste() {
      const hc = document.documentElement.dataset.hc === 'true' ? 'false' : 'true';
      document.documentElement.dataset.hc = hc;
      store.actualizar('modoAltoContraste', hc === 'true');
      localStorage.setItem('fb_preferencias', JSON.stringify({
        ...JSON.parse(localStorage.getItem('fb_preferencias') || '{}'),
        altoContraste: hc === 'true'
      }));
      this.anunciar(hc === 'true' ? 'Modo alto contraste activado' : 'Modo alto contraste desactivado');
    },

    toggleLetraGrande() {
      const lg = document.documentElement.dataset.lg === 'true' ? 'false' : 'true';
      document.documentElement.dataset.lg = lg;
      store.actualizar('modoLetraGrande', lg === 'true');
      localStorage.setItem('fb_preferencias', JSON.stringify({
        ...JSON.parse(localStorage.getItem('fb_preferencias') || '{}'),
        letraGrande: lg === 'true'
      }));
      this.anunciar(lg === 'true' ? 'Modo letra grande activado' : 'Modo letra grande desactivado');
    }
  };

  window.accesibilidad = accesibilidad;

  document.addEventListener('DOMContentLoaded', () => {
    accesibilidad.iniciar();
    accesibilidad.crearSkipLink();
  });
})();
