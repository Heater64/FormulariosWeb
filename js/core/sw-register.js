// ============================================================
// js/core/sw-register.js — Registro del Service Worker (PWA)
// ============================================================
// En producción (https) activa la instalación y el modo offline;
// en desarrollo local (http) se omite para no interferir con el
// HMR de Vite. Archivo externo porque la CSP de producción no
// permite scripts inline (el registro inline estaba bloqueado y
// la PWA quedaba rota).
//
// Cuando hay un SW nuevo esperando, muestra una tarjeta discreta
// para que el usuario pueda actualizar sin hard-refresh.
// ============================================================
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') return;

  function _cerrarAvisoActualizar() {
    var banner = document.getElementById('sw-update-banner');
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    var style = document.getElementById('sw-update-banner-style');
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }

  function _mostrarAvisoActualizar(reg) {
    if (document.getElementById('sw-update-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'z-index:10000;background:var(--color-fondo-tarjeta,#fff);color:var(--color-texto,#0f172a);' +
      'border:1px solid var(--color-borde,#e2e8f0);border-radius:var(--radio-xl,16px);' +
      'padding:12px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);' +
      'font-family:var(--fuente-body,system-ui);font-size:14px;max-width:min(380px,90vw);' +
      'animation:banner-in .3s ease forwards;opacity:0;transform:translateX(-50%) translateY(12px)';

    var style = document.createElement('style');
    style.id = 'sw-update-banner-style';
    style.textContent = '@keyframes banner-in{to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);

    var texto = document.createElement('span');
    texto.style.flex = '1';
    texto.textContent = 'Nueva versión disponible';
    banner.appendChild(texto);

    var btn = document.createElement('button');
    btn.textContent = 'Actualizar';
    btn.style.cssText = 'background:var(--color-acento,#2563eb);color:#fff;border:none;' +
      'border-radius:var(--radio-lg,12px);padding:8px 16px;font-weight:600;cursor:pointer;white-space:nowrap';
    btn.onclick = function () {
      // El SKIP_WAITING va al SW que ESTÁ ESPERANDO (reg.waiting), no al
      // controller: el controller es el SW viejo que controla la página y
      // puede no entender este mensaje (fue instalado con código anterior).
      if (!reg.waiting) {
        window.location.reload();
        return;
      }
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Red de seguridad: si ese SW no implementa SKIP_WAITING nunca llegará
      // controllerchange y el aviso se quedaría pegado para siempre. A los
      // 3s, si el banner sigue en pantalla, lo quitamos y recargamos.
      setTimeout(function () {
        if (document.getElementById('sw-update-banner')) {
          _cerrarAvisoActualizar();
          window.location.reload();
        }
      }, 3000);
    };
    banner.appendChild(btn);

    var cerrar = document.createElement('button');
    cerrar.textContent = '\u00d7';
    cerrar.setAttribute('aria-label', 'Cerrar aviso de actualización');
    cerrar.style.cssText = 'background:none;border:none;color:var(--color-texto-secundario,#64748b);' +
      'font-size:18px;line-height:1;cursor:pointer;padding:4px 4px 4px 8px;';
    cerrar.onclick = _cerrarAvisoActualizar;
    banner.appendChild(cerrar);

    document.body.appendChild(banner);
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
      // SW ya esperando al cargar la página
      if (reg.waiting) _mostrarAvisoActualizar(reg);

      // SW nuevo instalándose
      reg.addEventListener('updatefound', function () {
        if (reg.installing) {
          reg.installing.addEventListener('statechange', function (e) {
            if (e.target.state === 'installed' && reg.waiting) _mostrarAvisoActualizar(reg);
          });
        }
      });
    }).catch(function () {});

    // Cuando el SW nuevo toma el control, recargar para obtener la versión limpia
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
})();
