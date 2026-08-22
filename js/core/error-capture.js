// ============================================================
// js/core/error-capture.js — Captura global de errores (<head>)
// ============================================================
// Corre antes que cualquier script: alimenta el buffer que procesa
// error-recovery.js (primer script diferido). Sin esto, un error en
// el arranque pasaría desapercibido y la app podría quedarse en
// blanco. Archivo externo porque la CSP de producción no permite
// scripts inline.
// ============================================================
(function () {
  'use strict';
  window.__fbErrores = [];
  window.__fbRegistrarError = function (e) {
    try {
      var msg = (e && e.message) || (e && e.name) || String(e);
      window.__fbErrores.push({ ts: Date.now(), msg: msg });
    } catch (err) {}
    if (window.errorRecovery && window.errorRecovery.registrarError) {
      try { window.errorRecovery.registrarError(e); } catch (err) {}
    }
  };
  window.addEventListener('error', function (e) {
    // Los errores de recursos (img, link, audio, vídeo...) no son errores
    // de código: no cuentan para la autorrecuperación (si no, cualquier
    // imagen rota dispararía una reparación de caché falsa).
    if (e && e.target && !e.error) return;
    window.__fbRegistrarError(e.error || e);
  }, true);
  window.addEventListener('unhandledrejection', function (e) { window.__fbRegistrarError(e.reason); });
})();
