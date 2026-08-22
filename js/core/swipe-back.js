// ============================================================
// js/core/swipe-back.js — Gesto global de retroceso (swipe derecha)
// ============================================================
// Similar a iOS/Android: deslizar desde el borde izquierdo hacia
// la derecha retrocede a la vista anterior. Incluye feedback visual
// con opacidad y escala durante el arrastre.
// ============================================================
(function () {
  'use strict';

  const UMBRAL = 80;          // px necesarios para disparar retroceso
  const MAX_VERTICAL = 60;    // tolerancia de movimiento vertical
  const EDGE_ZONE = 24;       // px desde el borde izquierdo para activar
  const MAX_PROGRESO = 1;     // progreso máximo de la animación (1 = 100%)

  let startX = 0, startY = 0, activo = false, enHorizontal = false, cancelado = false;
  let raiz = null, overlay = null;

  function crearOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'swipe-back-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0);pointer-events:none;z-index:9998;transition:background 150ms ease;';
    document.body.appendChild(overlay);
  }

  function actualizarVisual(progreso) {
    if (!raiz) raiz = document.getElementById('app-root');
    if (!raiz) return;

    const p = Math.min(progreso, MAX_PROGRESO);
    const translateX = p * 40;  // mover vista 40px max
    const escala = 1 - p * 0.03; // escalar ligeramente
    const opacidad = 1 - p * 0.3;

    raiz.style.transform = `translateX(${translateX}px) scale(${escala})`;
    raiz.style.opacity = opacidad;
    raiz.style.transition = 'none';

    // Overlay oscurece el borde izquierdo
    if (overlay) {
      overlay.style.background = `rgba(0,0,0,${p * 0.15})`;
    }
  }

  function resetVisual() {
    if (raiz) {
      raiz.style.transform = '';
      raiz.style.opacity = '';
      raiz.style.transition = 'transform 200ms var(--easing-apple), opacity 200ms var(--easing-apple)';
      requestAnimationFrame(() => {
        if (raiz) raiz.style.transition = '';
      });
    }
    if (overlay) {
      overlay.style.background = 'rgba(0,0,0,0)';
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
      }, 200);
    }
  }

  function start(x, y) {
    // Solo activar desde el borde izquierdo
    if (x > EDGE_ZONE) return;
    // No activar si hay un modal abierto (el back-navigation se encarga)
    if (window.backNav && window.backNav.tienePendientes()) return;
    // No activar si hay poco historial
    if (!window.router || window.router._historial.length < 2) return;

    startX = x;
    startY = y;
    activo = true;
    cancelado = false;
    enHorizontal = false;
    crearOverlay();
  }

  function move(x, y) {
    if (!activo) return;
    const dx = x - startX;
    const dy = y - startY;

    if (!enHorizontal && !cancelado) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) + 4) {
        enHorizontal = true;
      } else if (Math.abs(dy) > Math.abs(dx) + 4) {
        cancelado = true;
      }
    }

    if (!enHorizontal || cancelado) return;

    // Solo permitir swipe hacia la derecha (retroceso)
    const progreso = Math.max(0, dx) / UMBRAL;
    actualizarVisual(progreso);
  }

  function end(x) {
    if (!activo) return;
    const dx = x - startX;
    const disparo = enHorizontal && !cancelado && dx >= UMBRAL;

    activo = false;

    if (disparo) {
      // Retroceder con animación completa
      actualizarVisual(MAX_PROGRESO);
      setTimeout(() => {
        resetVisual();
        window.router.irAtras();
      }, 50);
    } else {
      resetVisual();
    }
  }

  function initSwipeBack() {
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!activo) return;
      const touch = e.touches[0];
      move(touch.clientX, touch.clientY);
      if (enHorizontal && !cancelado && e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!activo) return;
      const touch = e.changedTouches[0];
      end(touch.clientX);
    });

    document.addEventListener('touchcancel', () => {
      activo = false;
      resetVisual();
    });
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwipeBack);
  } else {
    initSwipeBack();
  }

  window.swipeBack = { init: initSwipeBack };
})();
