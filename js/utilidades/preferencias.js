(function() {
  'use strict';
  const CLAVE = 'fb_preferencias';
  const DEFAULTS = { tema: null, alto_contraste: false, letra_grande: false };

  var TEMAS = ['umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro'];
  function normalizarTema(t) {
    if (t === 'claro') return 'clasico-claro';
    if (t === 'oscuro') return 'clasico-oscuro';
    if (t === 'light') return 'clasico-claro';
    if (t === 'dark') return 'clasico-oscuro';
    return (TEMAS.indexOf(t) !== -1) ? t : null;
  }
  function aplicarTema(root, id) {
    if (!id) { delete root.dataset.theme; delete root.dataset.tema; return; }
    root.dataset.theme = /-oscuro$/.test(id) ? 'dark' : 'light';
    root.dataset.tema = id;
  }

  // ponytail: mapa mínimo de fondos; si crece, mover a tokens compartidos.
  function _bgDe(id, darkOS) {
    if (id === 'umbra-oscuro') return '#0a0a0c';
    if (id === 'clasico-oscuro') return '#0B1020';
    if (id === 'umbra-claro') return '#faf6f8';
    if (id === 'clasico-claro') return '#FFFFFF';
    return darkOS ? '#0B1020' : '#FFFFFF';
  }

  function leer() {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (!raw) return { ...DEFAULTS };
      const p = JSON.parse(raw);
      return {
        tema: normalizarTema(p.tema),
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
          ? normalizarTema(pref.tema)
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
    var darkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var oscuro = /-oscuro$/.test(p.tema || '') || (!p.tema && darkOS);
    if (p.alto_contraste) return oscuro ? '#000000' : '#FFFFFF';
    return _bgDe(p.tema, darkOS);
  }

  // Sincroniza meta theme-color y color-scheme con el tema actual
  function _sincronizarNotch(p) {
    var bg = _bgActual(p);
    var meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bg);
    // color-scheme en el root
    var id = p.tema;
    var isDark = /-oscuro$/.test(id || '') || (!id && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }

  function aplicar() {
    const p = leer();
    const root = document.documentElement;
    aplicarTema(root, p.tema);
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
