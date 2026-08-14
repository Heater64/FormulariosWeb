(function () {
  'use strict';

  try {
    var raw = localStorage.getItem('fb_preferencias');
    var preferencias = null;
    try { preferencias = raw ? JSON.parse(raw) : null; } catch (e) {}

    var tema = (preferencias && preferencias.tema) || localStorage.getItem('fb_tema') || 'light';
    if (tema === 'claro') tema = 'light';
    else if (tema === 'oscuro') tema = 'dark';

    var root = document.documentElement;
    if (tema === 'dark') {
      root.setAttribute('data-theme', 'dark');
      var metaClaro = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
      if (metaClaro) metaClaro.content = '#0C0A09';
    } else if (tema === 'light') {
      root.setAttribute('data-theme', 'light');
      var metaOscuro = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
      if (metaOscuro) metaOscuro.content = '#FAFAF9';
    }
  } catch (e) {}
})();
