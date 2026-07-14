(function() {
  'use strict';
  const CLAVE = 'fb_preferencias';
  const DEFAULTS = { tema: null, alto_contraste: false, letra_grande: false };

  function leer() {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (!raw) return { ...DEFAULTS };
      const p = JSON.parse(raw);
      let tema = p.tema;
      if (tema === 'claro') tema = 'light';
      else if (tema === 'oscuro') tema = 'dark';
      return {
        tema: (tema === 'light' || tema === 'dark') ? tema : null,
        alto_contraste: !!p.alto_contraste,
        letra_grande: !!p.letra_grande
      };
    } catch (e) { return { ...DEFAULTS }; }
  }

  function guardar(pref) {
    try {
      const actual = leer();
      const nuevo = {
        tema: pref && pref.tema !== undefined
          ? (pref.tema === 'light' || pref.tema === 'dark' ? pref.tema : null)
          : actual.tema,
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
    if (p.tema === 'light' || p.tema === 'dark') root.dataset.theme = p.tema;
    else delete root.dataset.theme;
    root.dataset.hc = p.alto_contraste ? 'true' : 'false';
    root.dataset.lg = p.letra_grande ? 'true' : 'false';
  }

  window.preferencias = { leer, guardar, aplicar, CLAVE };
})();
