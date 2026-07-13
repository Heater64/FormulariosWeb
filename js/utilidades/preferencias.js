(function() {
  'use strict';
  const CLAVE = 'fb_preferencias';
  const DEFAULTS = { tema: null, alto_contraste: false, letra_grande: false };

  function leer() {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (!raw) return { ...DEFAULTS };
      const p = JSON.parse(raw);
      return {
        tema: (p.tema === 'claro' || p.tema === 'oscuro') ? p.tema : null,
        alto_contraste: !!p.alto_contraste,
        letra_grande: !!p.letra_grande
      };
    } catch (e) { return { ...DEFAULTS }; }
  }

  function guardar(pref) {
    try {
      const actual = leer();
      const nuevo = {
        tema: pref && (pref.tema === 'claro' || pref.tema === 'oscuro') ? pref.tema : actual.tema,
        alto_contraste: !!(pref && pref.alto_contraste !== undefined ? pref.alto_contraste : actual.alto_contraste),
        letra_grande: !!(pref && pref.letra_grande !== undefined ? pref.letra_grande : actual.letra_grande)
      };
      localStorage.setItem(CLAVE, JSON.stringify(nuevo));
      return nuevo;
    } catch (e) { return leer(); }
  }

  function aplicar() {
    const p = leer();
    const root = document.documentElement;
    root.classList.toggle('alto-contraste', p.alto_contraste);
    root.classList.toggle('letra-grande', p.letra_grande);
    if (p.tema === 'claro' || p.tema === 'oscuro') root.dataset.tema = p.tema;
    else delete root.dataset.tema;
  }

  window.preferencias = { leer, guardar, aplicar, CLAVE };
})();
