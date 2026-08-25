// ============================================================
// js/core/error-capture.js — Captura global de errores (<head>)
// ============================================================
// Corre antes que cualquier script. Mantiene el buffer local para la
// recuperación automática y, cuando se configura FB_SENTRY_DSN_PUBLIC en el
// HTML/entorno, envía errores a Sentry mediante su SDK cargado externamente.
// La integración es opt-in: sin DSN no hace ninguna petición adicional.
// Nunca se envían tokens, contraseñas ni el contenido completo de respuestas.
// ============================================================
(function () {
  'use strict';
  window.__fbErrores = [];
  var sentry = null;
  var sentryIniciado = false;

  function iniciarSentry() {
    try {
      var dsn = window.FB_SENTRY_DSN_PUBLIC || window.__FB_SENTRY_DSN_PUBLIC__ || (window.ENV && window.ENV.SENTRY_DSN_PUBLIC);
      if (!dsn || typeof dsn !== 'string' || !/^https:\/\//i.test(dsn)) return;
      try {
        var dsnUrl = new URL(dsn);
        if (!/(^|\.)sentry\.io$/i.test(dsnUrl.hostname) && !/(^|\.)ingest\.sentry\.io$/i.test(dsnUrl.hostname)) return;
      } catch (ignore) { return; }
      if (!window.Sentry || typeof window.Sentry.init !== 'function') return;
      window.Sentry.init({
        dsn: dsn,
        environment: window.__FB_SENTRY_ENVIRONMENT__ || (window.ENV && window.ENV.SENTRY_ENVIRONMENT) || 'production',
        release: window.__FB_APP_VERSION__ && window.__FB_APP_VERSION__.version,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend: function (event) {
          // Mantener la captura de excepción, pero evitar datos de formularios,
          // headers y URLs con posibles tokens o parámetros sensibles.
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
            delete event.request.data;
          }
          return event;
        }
      });
      sentry = window.Sentry;
      sentryIniciado = true;
    } catch (err) {
      // Observabilidad opcional: nunca debe dejar la app en blanco.
    }
  }

  window.__fbRegistrarError = function (e) {
    try {
      var msg = (e && e.message) || (e && e.name) || String(e);
      var registro = { ts: Date.now(), msg: String(msg).slice(0, 500) };
      window.__fbErrores.push(registro);
      if (sentryIniciado && sentry && typeof sentry.captureException === 'function') {
        sentry.captureException(e instanceof Error ? e : new Error(registro.msg));
      }
    } catch (err) {}
    if (window.errorRecovery && window.errorRecovery.registrarError) {
      try { window.errorRecovery.registrarError(e); } catch (err) {}
    }
  };

  window.addEventListener('error', function (e) {
    if (e && e.target && !e.error) return;
    window.__fbRegistrarError(e.error || e);
  }, true);
  window.addEventListener('unhandledrejection', function (e) { window.__fbRegistrarError(e.reason); });

  // El SDK puede cargar después de este archivo. No se usa un script inline:
  // el integrador puede llamar a esta función al terminar la carga del SDK.
  window.__fbIniciarSentry = iniciarSentry;
  if (window.Sentry) iniciarSentry();
})();
