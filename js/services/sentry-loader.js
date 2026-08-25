// Cargador opcional de Sentry. No se ejecuta ninguna red si no hay DSN y URL.
(function (root) {
  'use strict';
  function iniciar() {
    const dsn = root.FB_SENTRY_DSN_PUBLIC || root.__FB_SENTRY_DSN_PUBLIC__ || (root.ENV && root.ENV.SENTRY_DSN_PUBLIC);
    const sdkUrl = root.FB_SENTRY_SDK_URL || root.__FB_SENTRY_SDK_URL__ || (root.ENV && root.ENV.SENTRY_SDK_URL);
    if (!dsn || !sdkUrl || root.Sentry) return;
    let parsed;
    try { parsed = new URL(String(sdkUrl)); } catch { return; }
    if (parsed.protocol !== 'https:' || !/(^|\.)browser\.sentry-cdn\.com$/i.test(parsed.hostname)) return;
    const script = document.createElement('script');
    script.src = String(sdkUrl);
    script.async = true;
    script.onload = () => root.__fbIniciarSentry?.();
    script.onerror = () => {};
    document.head.appendChild(script);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})(typeof window !== 'undefined' ? window : globalThis);
