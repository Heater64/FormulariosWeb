// ============================================================
// js/utilidades/error-recovery.js - Autorrecuperación de errores
// ============================================================
// Detecta errores no controlados de la app. Si ocurren durante el
// ARRANQUE, limpia datos locales temporales (IndexedDB + localStorage,
// conservando la sesión) y recarga solo, con protección anti-bucle.
// Durante el USO normal muestra un banner discreto para que el
// usuario decida si reparar. El captor global vive en index.html
// (window.__fbRegistrarError) y alimenta registrarError().
// ============================================================

(function () {
  'use strict';

  const CLAVE_RECUPERACION = 'fb_recuperacion_hecha';
  const CLAVE_RELOAD_FINAL = 'fb_reload_final';
  const VENTANA_MS = 15000;
  const MAX_ARRAQUE = 2;   // errores en el arranque → auto-recuperar
  const MAX_RUNTIME = 5;   // errores en uso (15s) → banner (tolerante a bugs aislados)

  let errores = [];
  let recuperando = false;
  let banner = null;
  let inicioApp = Date.now();
  let autoHecho = false;

  // ============================================================
  // Ruido conocido que NO debe disparar la recuperación
  // ============================================================
  function esRuido(e) {
    const msg = (e && (e.message || e.name)) || String(e);
    if (!msg) return true;
    return (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('network error') ||
      msg.includes('offline') ||
      msg.includes('Script error') ||
      msg.includes('ResizeObserver') ||
      msg.includes('QuotaExceededError') ||
      msg.includes('Load failed') ||
      msg.includes('A node was moved')
    );
  }

  function splashOculto() {
    const s = document.getElementById('splashScreen');
    return !s || s.classList.contains('splash-screen--loaded');
  }

  // ============================================================
  // Punto de entrada (lo llama el captor global de index.html)
  // ============================================================
  function registrarError(e) {
    if (recuperando) return;
    if (esRuido(e)) return;

    errores.push({ ts: Date.now(), msg: (e && e.message) || String(e) });
    // Podar errores fuera de la ventana de observación
    errores = errores.filter((x) => Date.now() - x.ts < VENTANA_MS);

    const esArranque = Date.now() - inicioApp < 20000 && !splashOculto();
    const umbral = esArranque ? MAX_ARRAQUE : MAX_RUNTIME;

    if (errores.length >= umbral) {
      errores = [];
      if (esArranque && !autoHecho) {
        autoHecho = true;
        recuperarCacheYRecargar('errores en el arranque', true);
      } else if (!esArranque) {
        mostrarBanner();
      }
    }
  }

  // ============================================================
  // Reparación: limpiar caché + recargar (con guardas anti-bucle)
  // ============================================================
  async function recuperarCacheYRecargar(razon, auto) {
    if (recuperando) return;
    recuperando = true;

    // Anti-bucle: máximo 2 recuperaciones por sesión; después, una
    // única recarga simple y se abandona (evita el ciclo infinito).
    try {
      const intentos = parseInt(sessionStorage.getItem(CLAVE_RECUPERACION) || '0', 10) || 0;
      if (intentos >= 2) {
        recuperando = false;
        if (!sessionStorage.getItem(CLAVE_RELOAD_FINAL)) {
          sessionStorage.setItem(CLAVE_RELOAD_FINAL, '1');
          window.location.reload();
        }
        return;
      }
      sessionStorage.setItem(CLAVE_RECUPERACION, String(intentos + 1));
    } catch (e) {}

    // Aviso en la UI (splash o banner)
    const status = document.getElementById('splashStatus');
    if (status) status.textContent = 'Reparando caché…';
    ocultarBanner();

    // Limpiar IndexedDB + localStorage temporal (conserva sesión)
    try { if (window.cacheDatos) await window.cacheDatos.limpiarTodo(); } catch (e) {}

    // Recargar tras un instante para que se complete la limpieza
    setTimeout(() => window.location.reload(), 800);
  }

  // ============================================================
  // Banner discreto durante el uso normal
  // ============================================================
  function mostrarBanner() {
    if (banner || document.getElementById('errorBanner')) return;
    const b = document.createElement('div');
    b.id = 'errorBanner';
    b.className = 'error-banner';
    b.setAttribute('role', 'alert');
    b.innerHTML = `
      <span class="error-banner__icono" aria-hidden="true">⚠️</span>
      <div class="error-banner__cuerpo">
        <p class="error-banner__titulo">Algo salió mal</p>
        <p class="error-banner__texto">Puede haber datos dañados en la caché.</p>
      </div>
      <div class="error-banner__acciones">
        <button class="error-banner__btn error-banner__btn--reparar" type="button">Reparar</button>
        <button class="error-banner__btn error-banner__btn--recargar" type="button">Recargar</button>
      </div>`;
    document.body.appendChild(b);
    banner = b;

    b.querySelector('.error-banner__btn--reparar').addEventListener('click', () => recuperarCacheYRecargar('banner'));
    b.querySelector('.error-banner__btn--recargar').addEventListener('click', () => window.location.reload());

    // Desaparece solo a los 25s
    setTimeout(() => ocultarBanner(), 25000);
  }

  function ocultarBanner() {
    if (banner && banner.parentNode) banner.remove();
    banner = null;
  }

  // Estilos (auto-contenidos, usan las variables del tema)
  if (!document.getElementById('errorBannerStyles')) {
    const style = document.createElement('style');
    style.id = 'errorBannerStyles';
    style.textContent = `
      .error-banner {
        position: fixed; top: calc(12px + env(safe-area-inset-top)); left: 50%;
        transform: translateX(-50%); z-index: 1600;
        display: flex; align-items: center; gap: 12px;
        width: min(92vw, 520px); padding: 12px 16px;
        background: var(--color-fondo-tarjeta, #fff); color: var(--color-texto, #0f172a);
        border: 1px solid var(--color-borde, #e2e8f0); border-left: 4px solid var(--color-error, #dc2626);
        border-radius: var(--radio-lg, 14px);
        box-shadow: var(--sombra-xl, 0 12px 32px rgba(0,0,0,.15));
        animation: error-banner-in .3s var(--easing-apple, ease) both;
      }
      .error-banner__icono { font-size: 1.25rem; }
      .error-banner__cuerpo { flex: 1; min-width: 0; }
      .error-banner__titulo { margin: 0; font-weight: 700; font-size: var(--texto-sm, .875rem); }
      .error-banner__texto { margin: 2px 0 0; font-size: var(--texto-xs, .75rem); color: var(--color-texto-secundario, #64748b); }
      .error-banner__acciones { display: flex; gap: 8px; flex-shrink: 0; }
      .error-banner__btn {
        border: none; cursor: pointer; border-radius: 999px;
        padding: 8px 14px; font-size: var(--texto-xs, .75rem); font-weight: 700;
        -webkit-tap-highlight-color: transparent;
      }
      .error-banner__btn--reparar { background: var(--color-error, #dc2626); color: #fff; }
      .error-banner__btn--recargar { background: var(--color-fondo-alt, #f1f5f9); color: var(--color-texto, #0f172a); }
      @keyframes error-banner-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @media (max-width: 480px) {
        .error-banner { flex-wrap: wrap; }
        .error-banner__acciones { width: 100%; justify-content: flex-end; }
      }
    `;
    document.head.appendChild(style);
  }

  // Consumir errores ocurridos ANTES de que este script cargara
  function procesarBufferInicial() {
    const buffer = window.__fbErrores || [];
    if (!buffer.length) return;
    buffer.forEach((x) => registrarError({ message: x.msg }));
    window.__fbErrores = [];
  }

  // ============================================================
  // API pública
  // ============================================================
  window.errorRecovery = {
    registrarError,
    recuperarCacheYRecargar,
    procesarBufferInicial
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Retrasar el procesamiento inicial: los errores de arranque se
    // acumulan durante los primeros segundos (scripts diferidos).
    setTimeout(() => procesarBufferInicial(), 4000);
  });
})();
