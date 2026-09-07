(function() {
  'use strict';
  const CLAVE = 'fb_preferencias';
  const DEFAULTS = { tema: 'light', alto_contraste: false, letra_grande: false };

  function leer() {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (!raw) return { ...DEFAULTS };
      const p = JSON.parse(raw);
      let tema = p.tema;
      if (tema === undefined) tema = 'light'; // Sin elección guardada → claro por defecto
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

  // Calcula el fondo del tema actual (para theme-color del notch)
  function _bgActual(p) {
    var hc = p.alto_contraste;
    if (p.tema === 'dark') return hc ? '#000000' : '#0B1020';
    if (p.tema === 'light') return hc ? '#FFFFFF' : '#FFFFFF';
    // Auto: usar prefers-color-scheme del sistema
    var darkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return darkOS ? (hc ? '#000000' : '#0B1020') : '#FFFFFF';
  }

  // Sincroniza meta theme-color y color-scheme con el tema actual
  function _sincronizarNotch(p) {
    var bg = _bgActual(p);
    var meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bg);
    // color-scheme en el root
    var isDark = p.tema === 'dark' || (!p.tema && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }

  function aplicar() {
    const p = leer();
    const root = document.documentElement;
    if (p.tema === 'light' || p.tema === 'dark') root.dataset.theme = p.tema;
    else delete root.dataset.theme;
    root.dataset.hc = p.alto_contraste ? 'true' : 'false';
    root.dataset.lg = p.letra_grande ? 'true' : 'false';
    _sincronizarNotch(p);
  }

  // Escuchar cambios del sistema cuando el usuario eligió "Auto"
  var _mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  _mqDark.addEventListener('change', function () {
    var p = leer();
    if (!p.tema) {
      // Solo reaccionar en modo Auto (tema === null)
      aplicar();
    }
  });

  window.preferencias = { guardar, aplicar };
})();
