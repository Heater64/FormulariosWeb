(function(){"use strict";const v=["#0F172A","#3B82F6","#EF4444","#F59E0B","#10B981","#8B5CF6","#EC4899","#FFFFFF"];function F(n){n=n||{},_(n)}function _(n){const t=document.createElement("div");t.className="modal-overlay editor-dibujo-overlay",t.innerHTML=`
      <div class="editor-dibujo" role="dialog" aria-modal="true" aria-label="Dibujar a mano">
        <div class="editor-dibujo__cabecera">
          <h3>${window.Iconos?.render("pen-tool")||"\u270F\uFE0F"} Dibujar</h3>
        </div>
        <div class="editor-dibujo__lienzo-wrap">
          <canvas id="dibujoCanvas" class="editor-dibujo__lienzo" width="600" height="400"
            aria-label="Lienzo de dibujo"></canvas>
        </div>
        <div class="editor-dibujo__barra">
          <div class="editor-dibujo__colores" role="group" aria-label="Colores">
            ${v.map((o,e)=>`
              <button type="button" class="editor-dibujo__color${e===0?" editor-dibujo__color--activo":""}"
                data-color="${o}" style="--c:${o}" aria-label="Color ${o}" title="Color ${o}"></button>`).join("")}
          </div>
          <div class="editor-dibujo__herramientas" role="group" aria-label="Herramientas">
            <input type="range" id="dibujoGrosor" min="1" max="24" value="5" aria-label="Grosor del trazo" title="Grosor">
            <button type="button" class="btn-icono" id="dibujoBorrador" title="Borrador" aria-label="Borrador">${window.Iconos?.render("eraser")||"\u{1F9FD}"}</button>
            <button type="button" class="btn-icono" id="dibujoLimpiar" title="Limpiar lienzo" aria-label="Limpiar lienzo">${window.Iconos?.render("trash-2")||"\u{1F5D1}\uFE0F"}</button>
          </div>
        </div>
        <div class="editor-dibujo__acciones">
          <button class="btn-secundario" id="dibujoCancelar">Cancelar</button>
          <button class="btn-primario" id="dibujoGuardar">A\xF1adir</button>
        </div>
      </div>`,document.body.appendChild(t),window.Iconos?.actualizar&&window.Iconos.actualizar();const i=t.querySelector("#dibujoCanvas"),r=i.getContext("2d");function c(){const o=i.getBoundingClientRect(),e=window.devicePixelRatio||1;i.width=Math.max(300,Math.round(o.width*e)),i.height=Math.max(200,Math.round(o.height*e)),r.setTransform(1,0,0,1,0,0),r.fillStyle="#FFFFFF",r.fillRect(0,0,i.width,i.height),r.lineCap="round",r.lineJoin="round"}c(),window.addEventListener("resize",c);let m=v[0],u=5,a=!1,l=!1,d=null;function f(o){const e=i.getBoundingClientRect(),w=window.devicePixelRatio||1,p=(o.clientX-e.left)*w,y=(o.clientY-e.top)*w;return{x:p,y}}function h(o){l=!0,d=f(o)}function j(o){if(!l)return;const e=f(o);r.strokeStyle=a?"#FFFFFF":m,r.lineWidth=a?Math.max(u*3,16):u,r.beginPath(),r.moveTo(d.x,d.y),r.lineTo(e.x,e.y),r.stroke(),d=e}function s(){l=!1,d=null}i.addEventListener("mousedown",o=>{o.preventDefault(),h(o)}),i.addEventListener("mousemove",o=>{l&&(o.preventDefault(),j(o))}),window.addEventListener("mouseup",s),i.addEventListener("touchstart",o=>{o.preventDefault();const e=o.touches[0];h({clientX:e.clientX,clientY:e.clientY})},{passive:!1}),i.addEventListener("touchmove",o=>{if(!l)return;o.preventDefault();const e=o.touches[0];j({clientX:e.clientX,clientY:e.clientY})},{passive:!1}),i.addEventListener("touchend",s,{passive:!1}),t.querySelectorAll(".editor-dibujo__color").forEach(o=>{o.onclick=()=>{t.querySelectorAll(".editor-dibujo__color").forEach(e=>e.classList.remove("editor-dibujo__color--activo")),o.classList.add("editor-dibujo__color--activo"),m=o.dataset.color,a=!1}}),t.querySelector("#dibujoGrosor").oninput=o=>{u=parseInt(o.target.value,10)},t.querySelector("#dibujoBorrador").onclick=()=>{a=!a},t.querySelector("#dibujoLimpiar").onclick=()=>{r.fillStyle="#FFFFFF",r.fillRect(0,0,i.width,i.height)};function b(){window.removeEventListener("resize",c),window.removeEventListener("mouseup",s),t.remove()}t.querySelector("#dibujoCancelar").onclick=()=>{b(),n.onCancel&&n.onCancel()},t.querySelector("#dibujoGuardar").onclick=()=>{const o=i.toDataURL("image/png");b(),n.onConfirm&&n.onConfirm(o)},t.addEventListener("click",o=>{o.target===t&&(b(),n.onCancel&&n.onCancel())})}window.editorDibujo={abrir:F}})();
