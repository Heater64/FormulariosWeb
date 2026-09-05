// ============================================================
// js/core/theme-init.js — Tema inicial (bloqueante, en <head>)
// ============================================================
// Aplica el tema ANTES de que el CSS renderice para evitar el
// flash de tema incorrecto. Se carga SIN defer (bloqueante) justo
// antes de los <link rel="stylesheet">. Es un archivo externo
// porque la CSP de producción no permite scripts inline.
//
// Importante: solo aplica estilos INLINE sobre el propio elemento
// <html>, NO sobre variables CSS (eso pisaría el sistema de tokens
// y rompería los cambios de tema vía UI). También sincroniza la
// meta theme-color para que la statusbar coincida con el tema.
// ============================================================
(function () {
  'use strict';
  try {
    var raw = localStorage.getItem('fb_preferencias');
    var p = null;
    try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
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
    var id = normalizarTema((p && p.tema) || localStorage.getItem('fb_tema'));
    var root = document.documentElement;
    if (!id) {
      // Auto: sin elección guardada, no fijar atributos; el CSS usa el modo del SO.
      delete root.dataset.theme; delete root.dataset.tema;
      return;
    }
    aplicarTema(root, id);
    var hc = p && p.alto_contraste === true;
    var isDark = /-oscuro$/.test(id);
    var bg = id === 'umbra-oscuro' ? '#0a0a0c' : id === 'clasico-oscuro' ? '#0B1020'
      : id === 'umbra-claro' ? '#faf6f8' : '#FFFFFF';
    if (hc) bg = isDark ? '#000000' : '#FFFFFF';
    var txt = isDark ? '#FFFFFF' : (id === 'umbra-claro' ? '#321020' : '#0F172A');
    // Color de fondo inmediato solo en el propio elemento root.
    // Los tokens (--color-fondo) se definen luego desde CSS y
    // se aplican a <body>, así que no hay conflicto de cascada.
    root.style.backgroundColor = bg;
    root.style.color = txt;
    root.style.colorScheme = isDark ? 'dark' : 'light';
    // Sincroniza la meta theme-color con el tema + HC
    var meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bg);
  } catch (e) { /* offline / no localStorage -> defaults del navegador */ }
})();
