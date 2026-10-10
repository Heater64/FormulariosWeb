(function(){"use strict";const d=a=>window.Iconos.render(a),s=a=>window.helpers.escapeHtml(a);window.adminComunes={rolBonito(a){return{owner:"Propietario",admin:"Administrador",editor:"Profesor",usuario:"Alumno"}[a]||a},tiempoRelativo(a){if(!a)return"\u2014";const e=Date.now()-new Date(a).getTime();if(e<0)return"Ahora mismo";const n=Math.floor(e/6e4);if(n<1)return"Ahora mismo";if(n<60)return`Hace ${n} min${n!==1?"s":""}`;const t=Math.floor(n/60);if(t<24)return`Hace ${t}h`;const o=Math.floor(t/24);return o<7?`Hace ${o} d\xEDa${o>1?"s":""}`:window.helpers.formatearFecha(a)},tiempoRelativoPreciso(a){if(!a)return"";const e=new Date(a);return e.toLocaleDateString()+" "+e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})},iconoAuditoria(a){const e=String(a||"");return e.startsWith("usuario")?"user":e.startsWith("grupo")?"layout":e.startsWith("batch")?"check-square":e.startsWith("config")?"settings":e.startsWith("backup")?"database":e.startsWith("examen")?"file-text":"clipboard-list"},irSpa(a){if(window.location.pathname.includes("/paginas/admin/")){window.location.href="../../index.html#!/"+a.replace(/^\//,"");return}window.router.navegar(a)},tiempoActivo(a){const e=Math.floor((Date.now()-(a||Date.now()))/6e4);return e<1?"Menos de 1 min":e<60?e+" min":Math.floor(e/60)+"h "+e%60+"m"},mediaGlobal(a){const e=a||{},n=[];return Object.values(e).forEach(t=>{t.media!=null&&n.push(t.media)}),n.length?n.reduce((t,o)=>t+o,0)/n.length:null},volver(a){if(a._volverAlSpa){a._volverAlSpa();return}router.navegar("/perfil")},bindTabs(a,e){e.querySelectorAll(".admin-tab").forEach(n=>{n.onclick=()=>{a._tabActivo=n.dataset.tab,a._renderizar(e)}})},cabeceraPanel(a,e,n,t){const r=t&&(t.nombre||t.logo)&&t.nombre?t.nombre:a;return`
        <header class="admin-panel-cabecera">
          <div class="admin-panel-cabecera__brand">
            ${t&&t.logo?`<img class="admin-panel-cabecera__logo" src="${t.logo}" alt="Logotipo del centro" width="44" height="44" decoding="async">`:`<span class="admin-panel-cabecera__logo-fallback">${d("command")}</span>`}
            <div>
              <h1 class="admin-panel-cabecera__titulo">${s(r)}</h1>
              <p class="admin-panel-cabecera__subtitulo">${e}</p>
            </div>
          </div>
          <div class="admin-panel-cabecera__acciones">
            ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            <button class="btn-secundario admin-panel-cabecera__volver" data-admin-volver>${d("arrow-left")} <span>Volver</span></button>
          </div>
        </header>`},estadoBadge(a){const e={publicado:["admin-tabla-badge--publicado","Publicado"],borrador:["admin-tabla-badge--borrador","Borrador"],archivado:["admin-tabla-badge--archivado","Archivado"],cerrado:["admin-tabla-badge--archivado","Cerrado"]},[n,t]=e[a]||["admin-tabla-badge--borrador",a||"\u2014"];return`<span class="admin-tabla-badge ${n}">${s(t)}</span>`},estadoUsuario(a,e){return a===!1?'<span class="admin-tabla-badge admin-tabla-badge--inactivo">Bloqueado</span>':e&&Date.now()-new Date(e).getTime()<3e5?'<span class="admin-tabla-badge admin-tabla-badge--online">En l\xEDnea</span>':'<span class="admin-tabla-badge admin-tabla-badge--offline">Desconectado</span>'},abrirModal({titulo:a,icono:e="info",contenido:n,ancho:t="480px"}){const o=document.createElement("div");o.className="modal-overlay",o.innerHTML=`
        <div class="modal" style="max-width:${t}">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${d(e)} ${s(a)}</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${d("x")}</button>
            </div>
            <div class="modal-contenido">${n}</div>
          </div>
        </div>`,document.body.appendChild(o),window.Iconos?.actualizar();const r=()=>o.remove();return o.querySelector("[data-cerrar]").onclick=r,o.addEventListener("click",c=>{c.target===o&&r()}),document.addEventListener("keydown",function c(m){m.key==="Escape"&&(r(),document.removeEventListener("keydown",c))}),{overlay:o,cerrar:r}},bindFiltros(a,e,n){a.querySelectorAll(e).forEach(t=>{t.onclick=()=>n(t)})},async abrirModalGrupo(a,e={}){const{examenes:n=[],mostrarExamenes:t=!1,onEditarUsuario:o=null}=e;try{const{data:r}=await window.supabaseClient.from("perfiles").select("id, nombre_completo, username, rol, foto_perfil").eq("grupo_id",a.id).order("nombre_completo"),c=(r||[]).filter(i=>i.rol==="admin"),m=(r||[]).filter(i=>i.rol==="editor"),u=(r||[]).filter(i=>i.rol==="usuario"),h=i=>{const b=(i.nombre_completo||i.username||"?").charAt(0).toUpperCase();return i.foto_perfil?`<img src="${s(i.foto_perfil)}" alt="" class="admin-miembro__foto" width="40" height="40" loading="lazy" decoding="async">`:`<span class="admin-miembro__inicial">${b}</span>`},p=i=>{const b=s(i.nombre_completo||i.username),v=s(i.username||""),f=`
            <div class="admin-miembro">
              <div class="admin-miembro__avatar">${h(i)}</div>
              <div class="admin-miembro__info">
                <span class="admin-miembro__nombre">${b}</span>
                ${v&&v!==i.nombre_completo?`<span class="admin-miembro__username">@${v}</span>`:""}
              </div>`;return o?f+`
              <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${i.id}">${d("edit-3")} Editar</button>
            </div>`:f+"</div>"},l=document.createElement("div");l.className="modal-overlay",l.innerHTML=`
          <div class="modal">
            <div class="o-pila" style="gap:var(--espaciado-md)">
              <h3>${s(a.nombre)}</h3>
              <div class="perfil-fila"><span class="perfil-fila__label">Total miembros</span><span class="perfil-fila__valor">${(r||[]).length}</span></div>
              <div class="o-pila">
                <h4>Administradores (${c.length})</h4>${c.length?c.map(p).join(""):'<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>'}
              </div>
              <div class="o-pila">
                <h4>Profesores (${m.length})</h4>${m.length?m.map(p).join(""):'<p class="u-fs-sm u-color-texto-terciario">Sin profesores</p>'}
              </div>
              <div class="o-pila">
                <h4>Alumnos (${u.length})</h4>${u.length?u.map(p).join(""):'<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>'}
              </div>
              ${t?`<div class="o-pila">
                <h4>Ex\xE1menes (${n.length})</h4>${n.length?n.map(i=>`<div class="tarjeta-capitulo u-fs-sm">${s(i.titulo)} <span class="u-color-texto-terciario">(${i.estado})</span></div>`).join(""):'<p class="u-fs-sm u-color-texto-terciario">Sin ex\xE1menes</p>'}
              </div>`:""}
            </div>
            <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
          </div>`,document.body.appendChild(l),window.Iconos?.actualizar(),o&&l.querySelectorAll(".btn-editar-usuario").forEach(i=>{i.onclick=async()=>o(i.dataset.id)}),l.querySelector("#btnCerrarDetalle").onclick=()=>l.remove(),l.addEventListener("click",i=>{i.target===l&&l.remove()})}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}},descargarCSVTexto(a,e){const n=new Blob([e],{type:"text/csv;charset=utf-8;"}),t=URL.createObjectURL(n),o=document.createElement("a");o.href=t,o.download=a.endsWith(".csv")?a:a+".csv",o.click(),URL.revokeObjectURL(t)},descargarJSON(a,e){const n=new Blob([JSON.stringify(e,null,2)],{type:"application/json;charset=utf-8;"}),t=URL.createObjectURL(n),o=document.createElement("a");o.href=t,o.download=a.endsWith(".json")?a:a+".json",o.click(),URL.revokeObjectURL(t)},elegirArchivo(a=".csv,text/csv"){return new Promise(e=>{const n=document.createElement("input");n.type="file",n.accept=a,n.style.display="none",document.body.appendChild(n);const t=()=>{n.remove(),window.removeEventListener("focus",t,!0)};n.onchange=()=>{t();const o=n.files&&n.files[0];if(!o)return e(null);const r=new FileReader;r.onload=()=>e({nombre:o.name,texto:String(r.result||"")}),r.onerror=()=>e(null),r.readAsText(o)},window.addEventListener("focus",t,!0),n.click()})},sistemaFila(a,e,n,t="admin-indicador--ok",o=""){return`
        <div class="admin-sistema__fila" ${o?`title="${s(o)}"`:""}>
          <span class="admin-sistema__label">${d(a)} ${s(e)}</span>
          <span class="admin-sistema__valor"><span class="admin-indicador ${t}"></span>${s(n)}</span>
        </div>`},seccion({icono:a,iconoClase:e="",titulo:n,desc:t="",contador:o="",contenido:r,anchoCompleto:c=!1}){return`
        <section class="admin-seccion${c?" admin-seccion--ancho-completo":""}">
          <div class="admin-seccion__cabecera">
            <div class="admin-seccion__icono ${e}">${d(a)}</div>
            <div class="admin-seccion__info">
              <h2 class="admin-seccion__titulo">${s(n)}</h2>
              ${t?`<p class="admin-seccion__desc">${s(t)}</p>`:""}
            </div>
            ${o?`<span class="admin-seccion__contador">${o}</span>`:""}
          </div>
          ${r}
        </section>`},vacio(a,e,n=""){return`
        <div class="empty-state empty-state--compacto">
          <div class="empty-state__icono">${d(a)}</div>
          <h3 class="empty-state__titulo">${s(e)}</h3>
          ${n?`<p class="empty-state__descripcion">${s(n)}</p>`:""}
        </div>`}}})();
