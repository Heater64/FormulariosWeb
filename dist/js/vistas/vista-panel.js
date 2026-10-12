(function(){"use strict";const _=["admin","editor","owner"];function w(){const a=store.obtener("usuario");return a&&_.includes((a.rol||"").toLowerCase())}function i(a,o,n,s){return`<div class="adm-stat${n?" "+n:""}">
      <span class="adm-stat__icono" aria-hidden="true">${window.Iconos.render(s)}</span>
      <span class="adm-stat__valor">${window.panelUI.esc(a)}</span>
      <span class="adm-stat__etiqueta">${window.panelUI.esc(o)}</span>
    </div>`}function l(a,o){const n=Number(a.por_corregir)||0,s=[(Number(a.num_preguntas)||0)+" preguntas",(Number(a.num_enlaces)||0)+" enlaces",(Number(a.num_entregas)||0)+" entregas"];n>0?s.push(n+" por corregir"):a.nota_media!=null&&s.push("media "+window.panelUI.numero(a.nota_media));const d=n>0?'<span class="adm-badge adm-badge--aviso">Por corregir</span>':a.estado==="publicado"?'<span class="adm-badge adm-badge--publicado">Publicado</span>':a.estado==="cerrado"?'<span class="adm-badge adm-badge--cerrado">Cerrado</span>':'<span class="adm-badge adm-badge--borrador">Borrador</span>';return`<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${window.panelUI.esc(a.titulo)} ${d}</div>
        <div class="adm-fila__meta">${s.map(r=>`<span>${window.panelUI.esc(r)}</span>`).join("")}</div>
      </div>
      <div class="adm-fila__acciones">
        ${o==="pendientes"?`<button class="adm-btn adm-btn--principal adm-btn--pequeno" data-ir="/corregir/${t(a.id)}">${window.Iconos.render("clipboard-check")} Corregir</button>`:`<button class="adm-btn adm-btn--pequeno" data-ir="/corregir/${t(a.id)}">${window.Iconos.render("inbox")} Entregas</button>`}
        <button class="adm-btn adm-btn--pequeno" data-ir="/editor/${t(a.id)}">${window.Iconos.render("edit-3")} Editar</button>
      </div>
    </div>`}window.vistaPanel={async montar(a){if(!w()){a.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}const o=store.obtener("usuario");a.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <p class="adm-cabecera__sub">Cargando tu panel\u2026</p>
      </div>`;let n;try{n=await window.plataformaRepository.resumen()}catch(e){a.innerHTML=`<div class="o-contenedor u-mt-4">
          <div class="adm-aviso adm-aviso--error">No se pudo cargar el panel: ${window.panelUI.esc(e.message)}</div>
          <button class="adm-btn" id="btnReintentar">Reintentar</button>
        </div>`,a.querySelector("#btnReintentar").addEventListener("click",()=>router._ejecutar());return}const s=n&&n.examenes||[],d=s.filter(e=>e.estado==="publicado").length,r=s.reduce((e,c)=>e+(Number(c.num_entregas)||0),0),m=s.reduce((e,c)=>e+(Number(c.por_corregir)||0),0),u=s.filter(e=>Number(e.por_corregir)>0),p=(o.nombre_completo||o.username||"").split(" ")[0];a.innerHTML=`
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera">
            <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render("house")}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Hola${p?", "+window.panelUI.esc(p):""}</h1>
              <p class="adm-cabecera__sub">Crea ex\xE1menes, comparte un enlace con cada alumno y corrige las respuestas escritas.</p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn adm-btn--principal" id="btnNuevo">${window.Iconos.render("plus")} Nuevo examen</button>
            </div>
          </header>

          <div class="adm-rejilla">
            ${i(s.length,"Ex\xE1menes","adm-stat--acento","clipboard-list")}
            ${i(d,"Publicados","adm-stat--exito","check-circle")}
            ${i(r,"Entregas recibidas","","inbox")}
            ${i(m,"Respuestas por corregir",m>0?"adm-stat--aviso":"","alert-triangle")}
          </div>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Pendientes de correcci\xF3n</h2>
            <div id="listaPendientes"></div>
          </section>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Tus ex\xE1menes</h2>
            <div id="listaTodos"></div>
          </section>
        </div>`;const v=a.querySelector("#listaPendientes");v&&(v.innerHTML=u.length?`<div class="adm-lista">${u.map(e=>l(e,"pendientes")).join("")}</div>`:'<div class="adm-aviso adm-aviso--exito adm-aviso--destacado">Todo corregido. No hay respuestas pendientes.</div>');const b=a.querySelector("#listaTodos");b&&(b.innerHTML=s.length?`<div class="adm-lista">${s.slice(0,6).map(e=>l(e,"todos")).join("")}</div>`:`<div class="adm-vacio">
              <p class="adm-vacio__titulo">Todav\xEDa no hay ex\xE1menes</p>
              <p>Crea tu primer examen y comparte los enlaces con tus alumnos.</p>
            </div>`);const g=a.querySelector("#btnNuevo");g&&g.addEventListener("click",()=>router.navegar("/editor/nuevo")),a.querySelectorAll("[data-ir]").forEach(e=>{e.addEventListener("click",()=>router.navegar(e.dataset.ir))}),window.Iconos&&window.Iconos.actualizar()}};function t(a){return window.panelUI.esc(a)}})();
