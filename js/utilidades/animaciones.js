(function() {
  'use strict';

  // Helper de animaciones unificadas (150-250ms).
  // Aplica clases CSS y devuelve Promises para encadenar en vistas.

  function prefiereReducido() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Añade una clase de animación y resuelve cuando termina.
  function animar(elemento, clase, duracionMs = 200) {
    return new Promise((resolve) => {
      if (!elemento) { resolve(); return; }
      if (prefiereReducido()) { resolve(); return; }
      elemento.classList.remove(clase);
      // Forzar reflow para reiniciar la animación
      void elemento.offsetWidth;
      elemento.classList.add(clase);
      let done = false;
      const fin = () => { if (done) return; done = true; elemento.classList.remove(clase); resolve(); };
      elemento.addEventListener('animationend', fin, { once: true });
      setTimeout(fin, duracionMs + 60);
    });
  }

  // Transición de salida + entrada (útil para cambiar pregunta / tab).
  async function transicion(elSalida, elEntrada, claseSalida, claseEntrada, ms = 200) {
    if (elSalida) await animar(elSalida, claseSalida, ms);
    if (elEntrada) await animar(elEntrada, claseEntrada, ms);
  }

  // Aplica animación de entrada a múltiples hijos con pequeño stagger.
  function animarHijos(contenedor, selector, clase, paso = 40) {
    if (!contenedor || prefiereReducido()) return;
    const hijos = contenedor.querySelectorAll(selector);
    hijos.forEach((hijo, i) => {
      setTimeout(() => hijo.classList.add(clase), i * paso);
    });
  }

  window.animaciones = { animar, transicion, animarHijos, prefiereReducido };
})();
