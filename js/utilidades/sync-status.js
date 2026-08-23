(function() {
  'use strict';

  // Indicador de sincronización inteligente.
  // Muestra estado (Todo sincronizado / Pendientes) y "Última sincronización"
  // solo cuando hay algo que avisar, y desaparece solo tras unos segundos.

  const CLAVE_ULTIMA = 'fb_ultima_sync';
  let el = null;
  const RETRASO_MOSTRAR_MS = 650;
  const DURACION_SALIDA_MS = 700;
  let hideTimer = null;
  let showTimer = null;
  let hideCleanupTimer = null;
  let tickTimer = null;
  let sincronizacionActiva = false;
  let sincronizacionInicial = false;

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

  function mostrar({ texto, estado, duracion = 3500, unaVez = false, pantalla = false }) {
    const node = crear();
    const yaVisible = node.classList.contains('sync-indicator--visible');
    const pantallaAnterior = node.classList.contains('sync-indicator--pantalla');
    // Si unaVez y ya está visible con el mismo texto, no re-muestra (evita permanencia/parpadeo)
    if (unaVez && node.classList.contains('sync-indicator--visible') && node.dataset.msg === texto) {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => ocultar(), duracion);
      return;
    }
    const icono = estado === 'ok' ? 'check-circle' : (estado === 'pendiente' ? 'alert-triangle' : 'refresh-cw');
    node.dataset.msg = texto;
    node.classList.remove('sync-indicator--ok', 'sync-indicator--pendiente', 'sync-indicator--cargando');
    node.classList.add(`sync-indicator--${estado}`);
    node.innerHTML = `
      <span class="sync-indicator__icon" aria-hidden="true">${window.Iconos?.render(icono) || ''}</span>
      <span class="sync-indicator__text">${texto}</span>`;
    window.Iconos?.actualizar?.();
    if (hideTimer) clearTimeout(hideTimer);
    if (hideCleanupTimer) clearTimeout(hideCleanupTimer);
    node.classList.toggle('sync-indicator--pantalla', pantalla);

    if (!yaVisible || pantallaAnterior !== pantalla) {
      node.classList.remove('u-oculto', 'sync-indicator--visible');
      // Separar la retirada de display:none de la activación de opacity para
      // permitir una entrada suave incluso después de una salida reciente.
      requestAnimationFrame(() => {
        if (node) node.classList.add('sync-indicator--visible');
      });
    } else {
      node.classList.remove('u-oculto');
    }

    if (duracion !== Infinity) hideTimer = setTimeout(() => ocultar(), duracion);
  }

  function ocultar() {
    if (!el) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    el.classList.remove('sync-indicator--visible');
    if (hideCleanupTimer) clearTimeout(hideCleanupTimer);
    hideCleanupTimer = setTimeout(() => {
      if (el && !el.classList.contains('sync-indicator--visible')) {
        el.classList.add('u-oculto');
        el.classList.remove('sync-indicator--pantalla');
      }
    }, DURACION_SALIDA_MS);
  }

  function iniciar() {
    crear();

    window.eventBus.suscribir('sincronizacion:inicio', (e = {}) => {
      sincronizacionActiva = true;
      sincronizacionInicial = e.inicial === true;
      if (showTimer) clearTimeout(showTimer);
      // Una sincronización rápida no interrumpe la entrada. Solo mostramos
      // la pantalla si después de 650 ms todavía queda trabajo pendiente.
      showTimer = setTimeout(() => {
        if (!sincronizacionActiva) return;
        mostrar({
          texto: 'Sincronizando datos…',
          estado: 'cargando',
          duracion: Infinity,
          pantalla: sincronizacionInicial
        });
      }, RETRASO_MOSTRAR_MS);
    });

    window.eventBus.suscribir('sincronizacion:progreso', (e = {}) => {
      if (!sincronizacionActiva) return;
      const cats = Object.keys(e.completadas || {});
      if (cats.length && el?.classList.contains('sync-indicator--visible')) {
        const lista = cats.map(c => `✓ ${c}`).join('  ');
        mostrar({ texto: lista, estado: 'cargando', duracion: Infinity, pantalla: sincronizacionInicial });
      }
    });

    window.eventBus.suscribir('sincronizacion:fin', (e = {}) => {
      sincronizacionActiva = false;
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
      const pend = e.pendientes || 0;
      if (pend === 0) {
        setUltima(Date.now());
        ocultar();
      } else {
        mostrar({ texto: `Pendientes: ${pend} cambios`, estado: 'pendiente', duracion: 4000, pantalla: false });
      }
    });

    window.eventBus.suscribir('sincronizacion:estado', (e) => {
      const pend = e.pendientes || 0;
      // Solo avisar si hay pendientes; si no hay, no mostrar nada.
      if (pend > 0 && !sincronizacionActiva) {
        mostrar({ texto: `Pendientes: ${pend} cambios`, estado: 'pendiente', duracion: 4000 });
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

  // Auto-inicio (antes era un script inline en index.html; la CSP de
  // producción no permite inline). El módulo se carga con defer, así que
  // DOMContentLoaded aún no ha ocurrido y el listener se dispara a tiempo.
  document.addEventListener('DOMContentLoaded', () => iniciar());
})();
