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
    var tema = (p && p.tema) || localStorage.getItem('fb_tema') || 'light';
    if (tema === 'claro') tema = 'light';
    else if (tema === 'oscuro') tema = 'dark';
    var root = document.documentElement;
    var isDark = tema === 'dark';
    var isLight = tema === 'light';
    if (isLight || isDark) root.setAttribute('data-theme', tema);
    var hc = p && p.alto_contraste === true;
    var bg = isDark ? (hc ? '#000000' : '#0B1020') : '#FFFFFF';
    var txt = isDark ? '#FFFFFF' : '#0F172A';
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
