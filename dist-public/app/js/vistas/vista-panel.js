(function(){"use strict";const g=["admin","editor","owner"];function _(){const a=store.obtener("usuario");return a&&g.includes((a.rol||"").toLowerCase())}function o(a,n,s){return`<div class="adm-stat${s?" "+s:""}">
      <span class="adm-stat__valor">${window.panelUI.esc(a)}</span>
      <span class="adm-stat__etiqueta">${window.panelUI.esc(n)}</span>
    </div>`}function c(a){const n=Number(a.por_corregir)||0,s=[(Number(a.num_preguntas)||0)+" preguntas",(Number(a.num_enlaces)||0)+" enlaces",(Number(a.num_entregas)||0)+" entregas"];n>0?s.push(n+" por corregir"):a.nota_media!=null&&s.push("media "+window.panelUI.numero(a.nota_media));const t=n>0?'<span class="adm-badge adm-badge--aviso">Por corregir</span>':a.estado==="publicado"?'<span class="adm-badge adm-badge--publicado">Publicado</span>':a.estado==="cerrado"?'<span class="adm-badge adm-badge--cerrado">Cerrado</span>':'<span class="adm-badge adm-badge--borrador">Borrador</span>';return`<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${window.panelUI.esc(a.titulo)} ${t}</div>
        <div class="adm-fila__meta">${s.map(d=>`<span>${window.panelUI.esc(d)}</span>`).join("")}</div>
      </div>
      <div class="adm-fila__acciones">
        ${n>0?`<button class="adm-btn adm-btn--principal adm-btn--pequeno" data-ir="/corregir/${i(a.id)}">Corregir</button>`:""}
        <button class="adm-btn adm-btn--pequeno" data-ir="/corregir/${i(a.id)}">Entregas</button>
        <button class="adm-btn adm-btn--pequeno" data-ir="/editor/${i(a.id)}">Editar</button>
      </div>
    </div>`}window.vistaPanel={async montar(a){if(!_()){a.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}const n=store.obtener("usuario");a.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <p class="adm-cabecera__sub">Cargando tu panel\u2026</p>
      </div>`;let s;try{s=await window.plataformaRepository.resumen()}catch(e){a.innerHTML=`<div class="o-contenedor u-mt-4">
          <div class="adm-aviso adm-aviso--error">No se pudo cargar el panel: ${window.panelUI.esc(e.message)}</div>
          <button class="adm-btn" id="btnReintentar">Reintentar</button>
        </div>`,a.querySelector("#btnReintentar").addEventListener("click",()=>router._ejecutar());return}const t=s&&s.examenes||[],d=t.filter(e=>e.estado==="publicado").length,f=t.reduce((e,r)=>e+(Number(r.num_entregas)||0),0),l=t.reduce((e,r)=>e+(Number(r.por_corregir)||0),0),m=t.filter(e=>Number(e.por_corregir)>0),u=(n.nombre_completo||n.username||"").split(" ")[0];a.innerHTML=`
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera">
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Hola${u?", "+window.panelUI.esc(u):""}</h1>
              <p class="adm-cabecera__sub">Crea ex\xE1menes, comparte un enlace con cada alumno y corrige las respuestas escritas.</p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn adm-btn--principal" id="btnNuevo">Nuevo examen</button>
            </div>
          </header>

          <div class="adm-rejilla">
            ${o(t.length,"Ex\xE1menes","adm-stat--acento")}
            ${o(d,"Publicados","adm-stat--exito")}
            ${o(f,"Entregas recibidas")}
            ${o(l,"Respuestas por corregir",l>0?"adm-stat--aviso":"")}
          </div>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Pendientes de correcci\xF3n</h2>
            <div id="listaPendientes"></div>
          </section>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Tus ex\xE1menes</h2>
            <div id="listaTodos"></div>
          </section>
        </div>`;const p=a.querySelector("#listaPendientes");p&&(p.innerHTML=m.length?`<div class="adm-lista">${m.map(c).join("")}</div>`:'<div class="adm-aviso adm-aviso--exito">Todo corregido. No hay respuestas pendientes.</div>');const v=a.querySelector("#listaTodos");v&&(v.innerHTML=t.length?`<div class="adm-lista">${t.slice(0,6).map(c).join("")}</div>`:`<div class="adm-vacio">
              <p class="adm-vacio__titulo">Todav\xEDa no hay ex\xE1menes</p>
              <p>Crea tu primer examen y comparte los enlaces con tus alumnos.</p>
            </div>`);const b=a.querySelector("#btnNuevo");b&&b.addEventListener("click",()=>router.navegar("/editor/nuevo")),a.querySelectorAll("[data-ir]").forEach(e=>{e.addEventListener("click",()=>router.navegar(e.dataset.ir))})}};function i(a){return window.panelUI.esc(a)}})();
