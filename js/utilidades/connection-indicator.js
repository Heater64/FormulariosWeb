(function() {
  'use strict';

  // Indicador de conexión: Conectado / Sin conexión.
  // Aparece al cambiar de estado y desaparece solo tras unos segundos.

  let el = null;
  let hideTimer = null;

  function crear() {
    if (el) return el;
    el = document.getElementById('connectionIndicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'connectionIndicator';
      el.className = 'connection-indicator u-oculto';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function mostrar(conectado) {
    const node = crear();
    node.innerHTML = `
      <span class="connection-indicator__dot" aria-hidden="true"></span>
      <span class="connection-indicator__text">${conectado ? 'Conectado' : 'Sin conexión · Trabajando sin Internet'}</span>`;
    node.classList.toggle('connection-indicator--offline', !conectado);
    node.classList.remove('u-oculto');
    node.classList.add('connection-indicator--visible');

    if (hideTimer) clearTimeout(hideTimer);
    // El aviso de "Conectado" desaparece pronto; "Sin conexión" permanece un poco más.
    hideTimer = setTimeout(() => ocultar(), conectado ? 2500 : 4000);
  }

  function ocultar() {
    if (!el) return;
    el.classList.remove('connection-indicator--visible');
    el.classList.add('u-oculto');
  }

  function iniciar() {
    crear();
    window.addEventListener('online', () => mostrar(true));
    window.addEventListener('offline', () => mostrar(false));

    // Estado inicial: si arranca sin conexión, avisar. Si hay conexión, no molestar.
    if (!navigator.onLine) mostrar(false);
  }

  window.connectionIndicator = { iniciar, mostrar, ocultar };

  // Auto-inicio (antes era un script inline en index.html; la CSP de
  // producción no permite inline). El módulo se carga con defer, así que
  // DOMContentLoaded aún no ha ocurrido y el listener se dispara a tiempo.
  document.addEventListener('DOMContentLoaded', () => iniciar());
})();
