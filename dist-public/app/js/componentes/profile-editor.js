(function(){"use strict";const r=t=>window.Iconos.render(t),s=t=>window.helpers.escapeHtml(t);window.ProfileEditor={abrir(t,m={}){const{onGuardar:l,onEliminar:c}=m,o=document.createElement("div");o.className="admin-user-detail__backdrop";const a=document.createElement("div");a.className="admin-user-detail";let d="general";const p=[{id:"general",texto:"General",icono:"user"},{id:"seguridad",texto:"Seguridad",icono:"lock"}];function u(){a.innerHTML=`
          <div class="admin-user-detail__header">
            <h3>Editar Usuario</h3>
            <button class="admin-user-detail__close" id="btnCloseEditor">${r("x")}</button>
          </div>
          <div class="admin-tabs">
            ${p.map(e=>`<button class="admin-tab${d===e.id?" admin-tab--activo":""}" data-tab="${e.id}">${r(e.icono)} ${e.texto}</button>`).join("")}
          </div>
          <div class="admin-user-detail__content" id="editorContent">
            ${d==="general"?b():v()}
          </div>
          <div class="admin-user-detail__footer">
            <button class="btn-secundario" id="btnDeleteUser">${r("trash-2")} Eliminar</button>
            <button class="btn-primario" id="btnSaveUser">Guardar Cambios</button>
          </div>
        `,y()}function b(){return`
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label>Nombre Completo</label>
            <input type="text" id="editNombre" value="${s(t.nombre_completo||"")}">
            <label>Username</label>
            <input type="text" id="editUsername" value="${s(t.username||"")}">
          </div>
        `}function v(){return`
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label>Nueva Contrase\xF1a</label>
            <input type="password" id="editPassword" placeholder="Dejar vac\xEDo para mantener">
          </div>
        `}function y(){a.querySelectorAll(".admin-tab").forEach(e=>{e.onclick=i=>{i.stopPropagation(),d=e.dataset.tab,u()}}),a.querySelector("#btnCloseEditor").onclick=e=>{e.stopPropagation(),n()},a.querySelector("#btnSaveUser").onclick=async e=>{e.stopPropagation();const i=a.querySelector("#editPassword"),g={nombre_completo:a.querySelector("#editNombre").value,username:a.querySelector("#editUsername").value,password:i?i.value:""};l&&await l(g),n()},a.querySelector("#btnDeleteUser").onclick=async e=>{e.stopPropagation(),c&&await c(),n()},a.onclick=e=>e.stopPropagation()}function n(){a.remove(),o.remove()}document.body.appendChild(o),document.body.appendChild(a),o.onclick=n,u()}}})();
