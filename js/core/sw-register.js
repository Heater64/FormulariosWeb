// ============================================================
// js/core/sw-register.js — Registro del Service Worker (PWA)
// ============================================================
// En producción (https) activa la instalación y el modo offline;
// en desarrollo local (http) se omite para no interferir con el
// HMR de Vite. Archivo externo porque la CSP de producción no
// permite scripts inline (el registro inline estaba bloqueado y
// la PWA quedaba rota).
// ============================================================
(function () {
  'use strict';
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
