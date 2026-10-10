(function(){"use strict";const q=["admin","editor","owner"],k={owner:"Propietario",admin:"Administrador",editor:"Profesor"},l=e=>window.panelUI.esc(e);function v(e){let t=e.preferencias||{};if(typeof t=="string")try{t=JSON.parse(t)}catch{t={}}return{...t,tema:t.tema==="claro"?"light":t.tema==="oscuro"?"dark":t.tema??null,alto_contraste:!!t.alto_contraste,letra_grande:!!t.letra_grande}}function _(e,t){const r={...v(e),...t};e.preferencias=r,store.actualizar("usuario",{...e});try{localStorage.setItem("fb_usuario",JSON.stringify(e))}catch{}return window.preferencias&&(window.preferencias.guardar({tema:r.tema,alto_contraste:r.alto_contraste,letra_grande:r.letra_grande}),window.preferencias.aplicar()),window.supabaseClient&&window.supabaseClient.from("perfiles").update({preferencias:JSON.stringify(r)}).eq("id",e.id).then(({error:n})=>{n&&console.warn("[Cuenta] No se pudieron sincronizar preferencias:",n.message)}).catch(n=>console.warn("[Cuenta] No se pudieron sincronizar preferencias:",n.message)),r}window.vistaCuenta={async montar(e){const t=store.obtener("usuario");if(!t){router.navegar("/login");return}const r=(t.rol||"").toLowerCase(),n=t.nombre_completo||t.username||"Cuenta",C=n.charAt(0).toUpperCase();e.innerHTML=`
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom));max-width:680px">
          <header class="adm-cabecera">
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Mi cuenta</h1>
              <p class="adm-cabecera__sub">Los alumnos no necesitan cuenta: solo usan el enlace que les env\xEDas.</p>
            </div>
          </header>

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Identidad</h2>
            <div class="adm-fila" style="border:0;padding:0;background:transparent">
              <div style="flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:var(--color-acento-soft);color:var(--color-acento-fuerte);display:grid;place-items:center;font-family:var(--fuente-display);font-size:var(--texto-xl);font-weight:var(--texto-peso-semibold)">${l(C)}</div>
              <div class="adm-fila__principal">
                <div class="adm-fila__titulo">${l(n)}</div>
                <div class="adm-fila__meta">
                  ${t.username?`<span>@${l(t.username)}</span>`:""}
                  <span>${l(k[r]||t.rol||"")}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="adm-bloque" aria-labelledby="tituloApariencia">
            <h2 class="adm-bloque__titulo" id="tituloApariencia">Apariencia</h2>
            <p class="adm-cabecera__sub" style="margin:calc(-1 * var(--espaciado-xs)) 0 var(--espaciado-sm)">Personaliza c\xF3mo se ve el panel en este dispositivo.</p>
            <span class="adm-campo__etiqueta" id="etiquetaAccesibilidad" style="display:block;margin-top:var(--espaciado-md)">Accesibilidad</span>
            <div class="adm-campo" style="margin-top:var(--espaciado-md)">
              <span class="adm-campo__etiqueta" id="etiquetaTema">Tema</span>
              <div class="adm-tabs" role="group" aria-labelledby="etiquetaTema">
                <button class="adm-tab" type="button" data-tema="light" aria-pressed="false">Claro</button>
                <button class="adm-tab" type="button" data-tema="auto" aria-pressed="false">Autom\xE1tico</button>
                <button class="adm-tab" type="button" data-tema="dark" aria-pressed="false">Oscuro</button>
              </div>
            </div>
            <div class="adm-campo--toggles" role="group" aria-labelledby="etiquetaAccesibilidad">
              <div class="adm-opcion" role="switch" aria-checked="false" tabindex="0" data-control="altoContraste">
                <span><span class="adm-opcion__titulo">Alto contraste</span><span class="adm-opcion__ayuda">Aumenta la separaci\xF3n entre texto, fondos y bordes.</span></span>
                <div class="adm-opcion__controles">
                  <input class="adm-switch" type="checkbox" id="chkContraste" role="presentation" aria-hidden="true">
                </div>
              </div>
              <div class="adm-opcion" role="switch" aria-checked="false" tabindex="0" data-control="letraGrande">
                <span><span class="adm-opcion__titulo">Texto grande</span><span class="adm-opcion__ayuda">Aumenta el tama\xF1o del texto del panel.</span></span>
                <div class="adm-opcion__controles">
                  <input class="adm-switch" type="checkbox" id="chkLetra" role="presentation" aria-hidden="true">
                </div>
              </div>
            </div>
            <p id="estadoApariencia" class="adm-campo__ayuda" role="status" aria-live="polite"></p>
          </section>

          ${q.includes(r)?`<section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Cambiar contrase\xF1a</h2>
            <div id="avisoPassword" class="adm-aviso adm-aviso--error" hidden role="alert"></div>
            <form id="formPassword" novalidate>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="actual">Contrase\xF1a actual</label>
                <input class="adm-entrada" id="actual" type="password" autocomplete="current-password" required>
              </div>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="nueva">Contrase\xF1a nueva</label>
                <input class="adm-entrada" id="nueva" type="password" autocomplete="new-password" required>
                <p class="adm-campo__ayuda">M\xEDnimo 8 caracteres, con letras y n\xFAmeros.</p>
              </div>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="confirmar">Repite la contrase\xF1a nueva</label>
                <input class="adm-entrada" id="confirmar" type="password" autocomplete="new-password" required>
              </div>
              <button class="adm-btn adm-btn--principal" type="submit" id="btnPassword">Guardar contrase\xF1a</button>
            </form>
          </section>`:""}

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Sesi\xF3n</h2>
            <p class="adm-cabecera__sub" style="margin-bottom:var(--espaciado-sm)">Al cerrar sesi\xF3n volver\xE1s a la pantalla de acceso.</p>
            <button class="adm-btn adm-btn--peligro" id="btnSalir" type="button">Cerrar sesi\xF3n</button>
          </section>
        </div>`;const s=v(t),u=e.querySelector("#estadoApariencia"),y=[...e.querySelectorAll("[data-tema]")],h=()=>{y.forEach(a=>{const o=a.dataset.tema==="auto"&&!s.tema||a.dataset.tema===s.tema;a.classList.toggle("adm-tab--activo",o),a.setAttribute("aria-pressed",String(o))})};h();const c=e.querySelector('[data-control="altoContraste"]'),d=e.querySelector('[data-control="letraGrande"]'),w=()=>{c&&c.setAttribute("aria-checked",String(s.alto_contraste)),d&&d.setAttribute("aria-checked",String(s.letra_grande));const a=e.querySelector("#chkContraste"),o=e.querySelector("#chkLetra");a&&(a.checked=s.alto_contraste),o&&(o.checked=s.letra_grande)};w(),y.forEach(a=>a.addEventListener("click",()=>{const o=a.dataset.tema==="auto"?null:a.dataset.tema;Object.assign(s,_(t,{tema:o})),h(),u&&(u.textContent="Tema actualizado.")}));const i=(a,o)=>{Object.assign(s,_(t,a)),w(),u&&(u.textContent=o)};c&&(c.addEventListener("click",()=>{i({alto_contraste:!s.alto_contraste},"Preferencia de contraste actualizada.")}),c.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),a.stopPropagation(),i({alto_contraste:!s.alto_contraste},"Preferencia de contraste actualizada."))})),d&&(d.addEventListener("click",()=>{i({letra_grande:!s.letra_grande},"Tama\xF1o de texto actualizado.")}),d.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),a.stopPropagation(),i({letra_grande:!s.letra_grande},"Tama\xF1o de texto actualizado."))}));const m=e.querySelector("#chkContraste");m&&m.addEventListener("change",()=>{i({alto_contraste:m.checked},"Preferencia de contraste actualizada.")});const f=e.querySelector("#chkLetra");f&&f.addEventListener("change",()=>{i({letra_grande:f.checked},"Tama\xF1o de texto actualizado.")}),e.querySelector("#btnSalir").addEventListener("click",async()=>{await window.helpers.confirmar("\xBFSeguro que quieres cerrar sesi\xF3n?",{titulo:"Cerrar sesi\xF3n",textoConfirmar:"Cerrar sesi\xF3n"})&&window.authRepository&&window.authRepository.cerrarSesion()});const b=e.querySelector("#formPassword");if(b){const a=e.querySelector("#avisoPassword");b.addEventListener("submit",async o=>{o.preventDefault(),a.hidden=!0;const x=e.querySelector("#actual").value,g=e.querySelector("#nueva").value,S=e.querySelector("#confirmar").value,p=e.querySelector("#btnPassword");if(g!==S){a.textContent="Las contrase\xF1as nuevas no coinciden.",a.hidden=!1;return}p.disabled=!0,p.textContent="Guardando\u2026";try{await window.authRepository.cambiarPassword(x,g),b.reset(),window.helpers.mostrarAlerta("Contrase\xF1a actualizada.","exito")}catch(A){a.textContent=A.message,a.hidden=!1}finally{p.disabled=!1,p.textContent="Guardar contrase\xF1a"}})}}}})();
