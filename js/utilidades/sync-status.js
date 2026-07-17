(function() {
  'use strict';

  // Indicador de sincronización inteligente.
  // Muestra estado (🟢 Todo sincronizado / 🟠 Pendientes) y "Última sincronización"
  // solo cuando hay algo que avisar, y desaparece solo tras unos segundos.

  const CLAVE_ULTIMA = 'fb_ultima_sync';
  let el = null;
  let hideTimer = null;
  let tickTimer = null;

  function crear() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'syncIndicator';
    el.className = 'sync-indicator u-oculto';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function fmtHace(ts) {
    if (!ts) return 'nunca';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'ahora mismo';
    if (s < 60) return `hace ${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }

  function setUltima(ts) {
    try { localStorage.setItem(CLAVE_ULTIMA, String(ts)); } catch (e) {}
  }

  function getUltima() {
    try { return parseInt(localStorage.getItem(CLAVE_ULTIMA) || '0', 10) || 0; } catch (e) { return 0; }
  }

  function mostrar({ texto, estado, duracion = 3500, unaVez = false }) {
    const node = crear();
    // Si unaVez y ya está visible con el mismo texto, no re-muestra (evita permanencia/parpadeo)
    if (unaVez && node.classList.contains('sync-indicator--visible') && node.dataset.msg === texto) {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => ocultar(), duracion);
      return;
    }
    const icono = estado === 'ok' ? '🟢' : (estado === 'pendiente' ? '🟠' : '🔄');
    node.dataset.msg = texto;
    node.innerHTML = `
      <span class="sync-indicator__icon" aria-hidden="true">${icono}</span>
      <span class="sync-indicator__text">${texto}</span>`;
    node.classList.remove('u-oculto');
    node.classList.add('sync-indicator--visible');

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => ocultar(), duracion);
  }

  function ocultar() {
    if (!el) return;
    el.classList.remove('sync-indicator--visible');
    el.classList.add('u-oculto');
  }

  function iniciar() {
    crear();

    window.eventBus.suscribir('sincronizacion:inicio', () => {
      mostrar({ texto: 'Sincronizando…', estado: 'cargando', duracion: 3000 });
    });

    window.eventBus.suscribir('sincronizacion:progreso', (e) => {
      const cats = Object.keys(e.completadas || {});
      if (cats.length) {
        const lista = cats.map(c => `✓ ${c}`).join('  ');
        mostrar({ texto: lista, estado: 'cargando', duracion: 2500 });
      }
    });

    window.eventBus.suscribir('sincronizacion:fin', (e) => {
      const pend = e.pendientes || 0;
      if (pend === 0) {
        setUltima(Date.now());
        // "Conectado": aparece una vez y desaparece solo (no permanente)
        mostrar({ texto: '🟢 Conectado', estado: 'ok', duracion: 2500, unaVez: true });
      } else {
        mostrar({ texto: `🟠 Pendientes: ${pend} cambios`, estado: 'pendiente', duracion: 4000 });
      }
    });

    window.eventBus.suscribir('sincronizacion:estado', (e) => {
      const pend = e.pendientes || 0;
      // Solo avisar si hay pendientes; si no hay, no mostrar nada (el estado "ok" ya se avisó en fin)
      if (pend > 0) {
        mostrar({ texto: `🟠 Pendientes: ${pend} cambios`, estado: 'pendiente', duracion: 4000 });
      }
    });

    // Actualizar "Hace X" periódicamente si está visible
    if (!tickTimer) {
      tickTimer = setInterval(() => {
        if (el && el.classList.contains('sync-indicator--visible') && !el.dataset.fijo) {
          // Solo refresca si está mostrando última sync estática (no durante sync)
        }
      }, 15000);
    }
  }

  window.syncStatus = { iniciar, mostrar, ocultar, getUltima, fmtHace };
})();
