(function(){"use strict";const c="fb_recuperacion_hecha",l="fb_reload_final";let o=[],a=!1,n=null,b=Date.now(),d=!1;function _(r){const e=r&&(r.message||r.name)||String(r);return e?e.includes("Failed to fetch")||e.includes("NetworkError")||e.includes("network error")||e.includes("offline")||e.includes("Script error")||e.includes("ResizeObserver")||e.includes("QuotaExceededError")||e.includes("Load failed")||e.includes("A node was moved"):!0}function m(){const r=document.getElementById("splashScreen");return!r||r.classList.contains("splash-screen--loaded")}function u(r){if(a||_(r))return;o.push({ts:Date.now(),msg:r&&r.message||String(r)}),o=o.filter(t=>Date.now()-t.ts<15e3);const e=Date.now()-b<2e4&&!m(),s=e?2:5;o.length>=s&&(o=[],e&&!d?(d=!0,i("errores en el arranque",!0)):e||g())}async function i(r,e){if(a)return;a=!0;try{const t=parseInt(sessionStorage.getItem(c)||"0",10)||0;if(t>=2){a=!1,sessionStorage.getItem(l)||(sessionStorage.setItem(l,"1"),window.location.reload());return}sessionStorage.setItem(c,String(t+1))}catch{}const s=document.getElementById("splashStatus");s&&(s.textContent="Reparando cach\xE9\u2026"),f();try{window.cacheDatos&&await window.cacheDatos.limpiarTodo()}catch{}setTimeout(()=>window.location.reload(),800)}function g(){if(n||document.getElementById("errorBanner"))return;const r=document.createElement("div");r.id="errorBanner",r.className="error-banner",r.setAttribute("role","alert"),r.innerHTML=`
      <span class="error-banner__icono" aria-hidden="true">\u26A0\uFE0F</span>
      <div class="error-banner__cuerpo">
        <p class="error-banner__titulo">Algo sali\xF3 mal</p>
        <p class="error-banner__texto">Puede haber datos da\xF1ados en la cach\xE9.</p>
      </div>
      <div class="error-banner__acciones">
        <button class="error-banner__btn error-banner__btn--reparar" type="button">Reparar</button>
        <button class="error-banner__btn error-banner__btn--recargar" type="button">Recargar</button>
      </div>`,document.body.appendChild(r),n=r,r.querySelector(".error-banner__btn--reparar").addEventListener("click",()=>i("banner")),r.querySelector(".error-banner__btn--recargar").addEventListener("click",()=>window.location.reload()),setTimeout(()=>f(),25e3)}function f(){n&&n.parentNode&&n.remove(),n=null}if(!document.getElementById("errorBannerStyles")){const r=document.createElement("style");r.id="errorBannerStyles",r.textContent=`
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
    `,document.head.appendChild(r)}function p(){const r=window.__fbErrores||[];r.length&&(r.forEach(e=>u({message:e.msg})),window.__fbErrores=[])}window.errorRecovery={registrarError:u,recuperarCacheYRecargar:i,procesarBufferInicial:p},document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>p(),4e3)})})();
