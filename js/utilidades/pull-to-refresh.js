(function () {
  'use strict';

  const UMBRAL = 70;
  const MAX_PULL = 110;

  function initPullToRefresh(scrollEl, onRefresh) {
    if (!scrollEl || typeof scrollEl.addEventListener !== 'function') return () => {};

    const cs = getComputedStyle(scrollEl);
    if (cs.position === 'static') scrollEl.style.position = 'relative';

    const indicador = document.createElement('div');
    indicador.className = 'ptr-indicador';
    indicador.innerHTML = `
      <span class="ptr-spinner" aria-hidden="true"></span>
      <span class="ptr-texto">Actualizando...</span>`;
    scrollEl.insertBefore(indicador, scrollEl.firstChild);

    let startY = 0, arrastrando = false, activo = false, refrescando = false;

    function limpiar() {
      arrastrando = false;
      activo = false;
      scrollEl.style.transform = '';
      indicador.classList.remove('ptr-indicador--visible');
      scrollEl.classList.remove('ptr-contenido--arrastrando');
    }

    function mostrarRefrescando() {
      refrescando = true;
      indicador.classList.add('ptr-indicador--refrescando');
      scrollEl.style.transform = `translateY(${UMBRAL}px)`;
    }

    function ocultarRefrescando() {
      refrescando = false;
      indicador.classList.remove('ptr-indicador--refrescando');
      scrollEl.style.transform = '';
      scrollEl.classList.add('ptr-contenido--transicion');
      setTimeout(() => scrollEl.classList.remove('ptr-contenido--transicion'), 260);
    }

    const tStart = (e) => {
      if (refrescando) return;
      if (scrollEl.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      arrastrando = true;
      activo = false;
    };

    const tMove = (e) => {
      if (!arrastrando || refrescando) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { limpiar(); return; }
      if (scrollEl.scrollTop > 0) { limpiar(); return; }
      activo = true;
      const pull = Math.min(dy * 0.5, MAX_PULL);
      scrollEl.style.transform = `translateY(${pull}px)`;
      scrollEl.classList.add('ptr-contenido--arrastrando');
      indicador.classList.toggle('ptr-indicador--visible', pull >= UMBRAL);
      if (e.cancelable) e.preventDefault();
    };

    const tEnd = () => {
      if (!arrastrando) return;
      const estabaActivo = activo;
      arrastrando = false;
      if (refrescando) return;
      if (estabaActivo) {
        const pull = parseInt((scrollEl.style.transform.match(/translateY\((\d+)/) || [])[1] || '0', 10);
        if (pull >= UMBRAL) {
          mostrarRefrescando();
          Promise.resolve(onRefresh && onRefresh())
            .catch(() => {})
            .then(() => ocultarRefrescando());
        } else {
          limpiar();
        }
      } else {
        limpiar();
      }
    };

    scrollEl.addEventListener('touchstart', tStart, { passive: true });
    scrollEl.addEventListener('touchmove', tMove, { passive: false });
    scrollEl.addEventListener('touchend', tEnd);
    scrollEl.addEventListener('touchcancel', tEnd);

    return function destruir() {
      scrollEl.removeEventListener('touchstart', tStart);
      scrollEl.removeEventListener('touchmove', tMove);
      scrollEl.removeEventListener('touchend', tEnd);
      scrollEl.removeEventListener('touchcancel', tEnd);
      if (indicador.parentNode) indicador.parentNode.removeChild(indicador);
      if (cs.position === 'static') scrollEl.style.position = '';
      scrollEl.style.transform = '';
    };
  }

  window.pullToRefresh = { initPullToRefresh };
})();
