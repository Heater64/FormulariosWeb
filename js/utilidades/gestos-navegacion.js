(function () {
  'use strict';

  const UMBRAL = 70;
  const MAX_VERTICAL = 60;

  function initGestosNavegacion(el, handlers) {
    if (!el || typeof el.addEventListener !== 'function') return () => {};
    const onIzquierda = handlers.onIzquierda;
    const onDerecha = handlers.onDerecha;
    const soloTouch = handlers.soloTouch !== false;

    let startX = 0, startY = 0, activo = false, enHorizontal = false, cancelado = false;

    function limpiar() {
      activo = false;
      enHorizontal = false;
      cancelado = false;
    }

    function start(x, y) {
      startX = x;
      startY = y;
      activo = true;
      cancelado = false;
      enHorizontal = false;
    }

    function move(x, y) {
      if (!activo) return null;
      const dx = x - startX;
      const dy = y - startY;
      if (!enHorizontal && !cancelado) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) + 4) {
          enHorizontal = true;
        } else if (Math.abs(dy) > Math.abs(dx) + 4) {
          cancelado = true;
        }
      }
      return { dx, dy, enHorizontal: enHorizontal && !cancelado };
    }

    function end(x) {
      if (!activo) return;
      const dx = x - startX;
      const disparo = enHorizontal && !cancelado && Math.abs(dx) >= UMBRAL;
      const dir = disparo ? (dx < 0 ? 'izquierda' : 'derecha') : null;
      limpiar();
      if (dir === 'izquierda' && typeof onIzquierda === 'function') onIzquierda();
      else if (dir === 'derecha' && typeof onDerecha === 'function') onDerecha();
    }

    const tStart = (e) => start(e.touches[0].clientX, e.touches[0].clientY);
    const tMove = (e) => {
      const m = move(e.touches[0].clientX, e.touches[0].clientY);
      if (m && m.enHorizontal && e.cancelable) e.preventDefault();
    };
    const tEnd = (e) => end(e.changedTouches[0].clientX);

    let mM = null, mU = null;
    const mDown = (e) => {
      if (soloTouch) return;
      start(e.clientX, e.clientY);
      mM = (ev) => move(ev.clientX, ev.clientY);
      mU = (ev) => { end(ev.clientX); document.removeEventListener('mousemove', mM); document.removeEventListener('mouseup', mU); };
      document.addEventListener('mousemove', mM);
      document.addEventListener('mouseup', mU);
    };

    el.addEventListener('touchstart', tStart, { passive: true });
    el.addEventListener('touchmove', tMove, { passive: false });
    el.addEventListener('touchend', tEnd);
    if (!soloTouch) el.addEventListener('mousedown', mDown);

    return function destruir() {
      el.removeEventListener('touchstart', tStart);
      el.removeEventListener('touchmove', tMove);
      el.removeEventListener('touchend', tEnd);
      if (!soloTouch) el.removeEventListener('mousedown', mDown);
      if (mM) { document.removeEventListener('mousemove', mM); document.removeEventListener('mouseup', mU); }
    };
  }

  window.gestosNavegacion = { initGestosNavegacion };
})();
