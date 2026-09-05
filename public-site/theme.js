(function () {
  'use strict';

  try {
    var raw = localStorage.getItem('fb_preferencias');
    var preferencias = null;
    try { preferencias = raw ? JSON.parse(raw) : null; } catch (e) {}

    var TEMAS = ['umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro'];
    function normalizarTema(t) {
      if (t === 'claro') return 'clasico-claro';
      if (t === 'oscuro') return 'clasico-oscuro';
      if (t === 'light') return 'clasico-claro';
      if (t === 'dark') return 'clasico-oscuro';
      return (TEMAS.indexOf(t) !== -1) ? t : null;
    }
    function aplicarTema(root, id) {
      // dual: modo light/dark + id de 4 temas sobre el root
      if (!id) { delete root.dataset.theme; delete root.dataset.tema; return; }
      root.dataset.theme = /-oscuro$/.test(id) ? 'dark' : 'light';
      root.dataset.tema = id;
    }
    // ponytail: mapa mínimo de fondos; si crece, mover a tokens compartidos.
    function bgDe(id) {
      if (id === 'umbra-oscuro') return '#0a0a0c';
      if (id === 'clasico-oscuro') return '#0B1020';
      if (id === 'umbra-claro') return '#faf6f8';
      return '#FAFAF9';
    }

    var id = normalizarTema((preferencias && preferencias.tema) || localStorage.getItem('fb_tema'));

    var root = document.documentElement;

    // PWA instalada (display-mode: standalone / iOS): marca <html class="fb-pwa">
    // para que la landing se muestre como pantalla de acceso limpia, sin las
    // secciones de marketing (hero, cómo funciona, FAQ, footer).
    try {
      if ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
          (window.navigator && window.navigator.standalone === true)) {
        root.classList.add('fb-pwa');
      }
    } catch (e) {}

    aplicarTema(root, id);
    if (id) {
      var bg = bgDe(id);
      var isDark = /-oscuro$/.test(id);
      var metaClaro = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
      if (!isDark && metaClaro) metaClaro.content = bg;
      var metaOscuro = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
      if (isDark && metaOscuro) metaOscuro.content = bg;
    }
  } catch (e) {}
})();
