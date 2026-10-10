(function(){"use strict";const t=a=>{try{return window.Iconos.render(a)}catch{return""}};function o(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const b=[{id:"general",icono:"compass",texto:"General"},{id:"reyes",icono:"crown",texto:"Reyes"},{id:"personajes",icono:"users",texto:"Personajes"},{id:"mas",icono:"grid",texto:"M\xE1s",_desktopOculta:!0},{id:"genealogia",icono:"git-branch",texto:"Genealog\xEDa",_soloDesktop:!0},{id:"lugares",icono:"map-pin",texto:"Lugares",_soloDesktop:!0},{id:"objetos",icono:"gem",texto:"Objetos",_soloDesktop:!0},{id:"milagros",icono:"sparkles",texto:"Milagros",_soloDesktop:!0},{id:"parabolas",icono:"book-open",texto:"Par\xE1bolas",_soloDesktop:!0},{id:"profecias",icono:"target",texto:"Profec\xEDas",_soloDesktop:!0},{id:"curiosidades",icono:"lightbulb",texto:"Curiosidades",_soloDesktop:!0}],h=[{id:"genealogia",icono:"git-branch",texto:"Genealog\xEDa",desc:"Desde Ad\xE1n hasta Jes\xFAs"},{id:"lugares",icono:"map-pin",texto:"Lugares",desc:"Geograf\xEDa b\xEDblica"},{id:"objetos",icono:"gem",texto:"Objetos",desc:"Artefactos sagrados"},{id:"milagros",icono:"sparkles",texto:"Milagros",desc:"Obras sobrenaturales"},{id:"parabolas",icono:"book-open",texto:"Par\xE1bolas",desc:"Ense\xF1anzas de Jes\xFAs"},{id:"profecias",icono:"target",texto:"Profec\xEDas",desc:"Anuncios y cumplimientos"},{id:"curiosidades",icono:"lightbulb",texto:"Curiosidades",desc:"Datos sorprendentes"}];let c={},d="general",_="";async function m(){const a=window._explorarCache;if(a){c=a;return}const r=["reyes","genealogia","curiosidades","personajes","lugares","objetos","milagros","parabolas","profecias"],e=await Promise.all(r.map(s=>fetch(`data/${s}.json`).then(i=>i.json()).catch(()=>[])));c={},r.forEach((s,i)=>c[s]=e[i]),window._explorarCache=c}function $(a,r){if(!_)return!0;const e=_.toLowerCase();return r?r.some(s=>a[s]!=null&&String(a[s]).toLowerCase().includes(e)):JSON.stringify(a).toLowerCase().includes(e)}function v(a,r){return _?a.filter(e=>$(e,r)):a}function p(a){return`<div class="empty-state"><div class="empty-state__icono">${t("search")}</div><p class="empty-state__descripcion">${o(a)}</p></div>`}function u(a){const r=Array.isArray(a)?a:a?[a]:[];return r.length?`<div class="explorar__refs"><span class="explorar__refs-label">${t("book-open")} Referencias</span><div class="explorar__refs-chips">${r.map(e=>`<span class="explorar__ref-chip">${o(e)}</span>`).join("")}</div></div>`:""}function y(){return`
      <div class="explorar-general">
        <div class="explorar-general__hero">
          <span class="explorar-general__icono">${t("compass")}</span>
          <div>
            <h3 class="explorar-general__titulo">Explorar la Biblia</h3>
            <p class="explorar-general__desc">Un recurso de consulta para profundizar en el conocimiento de las Escrituras. Aqu\xED encontrar\xE1s informaci\xF3n detallada sobre reyes, personajes, lugares, objetos y mucho m\xE1s.</p>
          </div>
        </div>
        <div class="explorar-general__fuente">
          <span class="explorar-general__fuente-icono">${t("book-open")}</span>
          <div>
            <h4 class="explorar-general__fuente-titulo">Fuente de informaci\xF3n</h4>
            <p class="explorar-general__fuente-texto">Toda la informaci\xF3n presentada en esta secci\xF3n est\xE1 basada en la <strong>Biblia Reina Valera 1960</strong> (RV60), complementada con estudios hist\xF3ricos, arqueol\xF3gicos y teol\xF3gicos de fuentes reconocidas.</p>
          </div>
        </div>
        <div class="explorar-general__tabs-info">
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${t("crown")}</span>
            <div>
              <h4>Reyes</h4>
              <p>Perfiles detallados de los reyes de Israel y Jud\xE1 con calificaci\xF3n, eventos clave y referencias b\xEDblicas.</p>
            </div>
          </div>
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${t("users")}</span>
            <div>
              <h4>Personajes</h4>
              <p>Personajes b\xEDblicos diversos: profetas, jueces, ap\xF3stoles y m\xE1s, con datos biogr\xE1ficos y referencias.</p>
            </div>
          </div>
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${t("grid")}</span>
            <div>
              <h4>M\xE1s</h4>
              <p>Explora genealog\xEDa, lugares, objetos, milagros, par\xE1bolas, profec\xEDas y curiosidades.</p>
            </div>
          </div>
        </div>
      </div>`}function j(a,r){const e=Number(r)||0;return`<span class="explorar__rey-badge explorar__rey-badge--${e>=4?"fiel":e<=2?"infiel":"mixto"}">${o(a||"")}</span>`}function w(a){const r=Math.max(1,Math.min(5,Number(a)||0));let e="";for(let s=1;s<=5;s++)e+=`<span class="explorar__rey-estrella${s<=r?" explorar__rey-estrella--activa":""}">${s<=r?"\u2605":"\u2606"}</span>`;return e}function k(){let a=c.reyes||[];const r=_.toLowerCase().trim();return r&&(a=a.map(s=>({...s,reyes:(s.reyes||[]).filter(i=>$(i,["nombre","reinado","etiqueta","detalle"])||String(s.periodo||"").toLowerCase().includes(r))})).filter(s=>(s.reyes||[]).length>0)),a=a.map(s=>({...s,reyes:(s.reyes||[]).filter(i=>/^(saúl|saul|david)$/i.test(i.nombre))})).filter(s=>(s.reyes||[]).length>0),a.reduce((s,i)=>s+(i.reyes||[]).length,0)?a.map(s=>`
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${t("flag")} ${o(s.periodo)}<span class="explorar__seccion-count">${(s.reyes||[]).length}</span></h4>
        <div class="explorar__grid">
          ${(s.reyes||[]).map(i=>`
            <div class="explorar__card explorar__card--expandible" data-expandible role="button" tabindex="0" aria-expanded="false">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${t("crown")}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${o(i.nombre)}</div>
                  <div class="explorar__card-sub">${o(i.reinado)}</div>
                </div>
                ${j(i.etiqueta,i.calificacion)}
              </div>
              <div class="explorar__card-estrellas">${w(i.calificacion)}</div>
              <p class="explorar__card-desc">${o(i.detalle)}</p>
              <div class="explorar__card-expand">
                ${i.eventos&&i.eventos.length?`
                  <div class="explorar__eventos">
                    <span class="explorar__eventos-label">${t("list")} Eventos clave</span>
                    ${i.eventos.map(n=>`<span class="explorar__evento">${o(n)}</span>`).join("")}
                  </div>`:""}
                ${i.personajes&&i.personajes.length?`
                  <div class="explorar__personajes-rel">
                    <span class="explorar__personajes-label">${t("users")} Personajes relacionados</span>
                    <span class="explorar__personajes-lista">${i.personajes.map(n=>o(n)).join(", ")}</span>
                  </div>`:""}
                ${u(i.refs)}
              </div>
              <div class="explorar__card-toggle">
                <span class="explorar__card-toggle-text">Ver m\xE1s</span>
                <span class="explorar__card-toggle-icon">${t("chevron-down")}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join(""):p("No se encontraron reyes.")}function E(){const r=v(c.personajes||[],["nombre","epoca","detalle"]).filter(e=>/^(abraham|moisés|moises)$/i.test(e.nombre));return r.length?`
      <div class="explorar__grid">
        ${r.map(e=>`
          <div class="explorar__card explorar__card--expandible" data-expandible role="button" tabindex="0" aria-expanded="false">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${t("user")}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${o(e.nombre)}</div>
                <div class="explorar__card-sub">${o(e.epoca||"")}</div>
              </div>
            </div>
            <p class="explorar__card-desc">${o(e.detalle)}</p>
            <div class="explorar__card-expand">
              <div class="explorar__card-datos">
                ${e.nacimiento?`<span class="explorar__card-dato">${t("map-pin")} <strong>Nacimiento:</strong> ${o(e.nacimiento)}</span>`:""}
                ${e.muerte&&!/desconocido/i.test(e.muerte)?`<span class="explorar__card-dato">${t("flag")} <strong>Muerte:</strong> ${o(e.muerte)}</span>`:""}
                ${e.padre&&!/desconocido/i.test(e.padre)?`<span class="explorar__card-dato">${t("users")} <strong>Padre:</strong> ${o(e.padre)}</span>`:""}
                ${e.hijos&&e.hijos.length?`<span class="explorar__card-dato">${t("heart")} <strong>Hijos:</strong> ${o(e.hijos.slice(0,3).join(", "))}${e.hijos.length>3?"\u2026":""}</span>`:""}
              </div>
              ${e.eventos&&e.eventos.length?`
                <div class="explorar__eventos">
                  <span class="explorar__eventos-label">${t("list")} Eventos clave</span>
                  ${e.eventos.slice(0,5).map(s=>`<span class="explorar__evento">${o(s)}</span>`).join("")}
                  ${e.eventos.length>5?`<span class="explorar__evento">+${e.eventos.length-5} m\xE1s</span>`:""}
                </div>`:""}
              ${u(e.libros)}
            </div>
            <div class="explorar__card-toggle">
              <span class="explorar__card-toggle-text">Ver m\xE1s</span>
              <span class="explorar__card-toggle-icon">${t("chevron-down")}</span>
            </div>
          </div>
        `).join("")}
      </div>`:p("No se encontraron personajes.")}function M(){return`
      <p class="explorar-mas__intro">Selecciona un tema para explorar m\xE1s contenido b\xEDblico:</p>
      <div class="explorar__cat-grid">
        ${h.map(a=>`
          <div class="explorar__cat-card" data-mas="${a.id}" role="button" tabindex="0">
            <div class="explorar__cat-icono">${t(a.icono)}</div>
            <div class="explorar__cat-nombre">${o(a.texto)}</div>
            <div class="explorar__cat-desc">${o(a.desc)}</div>
          </div>
        `).join("")}
      </div>`}function S(){const a=v(c.genealogia||[],["nombre","detalle","ref"]);return a.length?`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      <p class="explorar-mas__intro">Desde Ad\xE1n hasta Jes\xFAs \u2014 60 generaciones seg\xFAn Mateo 1 y Lucas 3.</p>
      <div class="explorar__timeline">
        ${a.map(r=>`
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot${r.destacado?" explorar__timeline-dot--destacado":""}"></div>
            <div class="explorar__timeline-periodo">${r.nivel===0?"Origen":"Generaci\xF3n "+r.nivel}</div>
            <div class="explorar__timeline-nombre${r.destacado?" explorar__timeline-nombre--destacado":""}">${r.destacado?t("star")+" ":""}${o(r.nombre)}</div>
            ${r.detalle?`<div class="explorar__timeline-detalle">${o(r.detalle)}</div>`:""}
            ${u(r.ref)}
          </div>
        `).join("")}
      </div>`:p("No se encontraron personas.")}function L(){const a=v(c.lugares||[],["nombre","region","detalle"]);if(!a.length)return p("No se encontraron lugares.");const r=a.slice(0,1);return`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      <div class="explorar__grid">
        ${r.map(e=>`
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${t("map-pin")}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${o(e.nombre)}</div>
                <div class="explorar__card-sub">${o(e.region||"")}</div>
              </div>
            </div>
            <p class="explorar__card-desc">${o(e.detalle)}</p>
            ${e.eventos&&e.eventos.length?`
              <div class="explorar__eventos">
                ${e.eventos.slice(0,3).map(s=>`<span class="explorar__evento">${o(s)}</span>`).join("")}
                ${e.eventos.length>3?`<span class="explorar__tag">+${e.eventos.length-3} m\xE1s</span>`:""}
              </div>`:""}
            ${u(e.refs)}
          </div>
        `).join("")}
      </div>`}function A(){const a=v(c.objetos||[],["nombre","epoca","detalle"]);if(!a.length)return p("No se encontraron objetos.");const r=a.slice(0,1);return`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      <div class="explorar__grid">
        ${r.map(e=>`
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${t("gem")}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${o(e.nombre)}</div>
                <div class="explorar__card-sub">${o(e.epoca||"")}</div>
              </div>
            </div>
            ${e.descripcion?`<p class="explorar__card-desc">${o(e.descripcion)}</p>`:""}
            ${u(e.refs)}
          </div>
        `).join("")}
      </div>`}function N(){const a=c.milagros||{},r=[];if(a.antiguo_testamento){const e=v(a.antiguo_testamento,["nombre","detalle"]);e.length&&r.push({titulo:"Antiguo Testamento",items:e.slice(0,1)})}if(a.nuevo_testamento){const e=v(a.nuevo_testamento,["nombre","detalle"]);e.length&&r.push({titulo:"Nuevo Testamento",items:e.slice(0,1)})}return r.length?`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      ${r.map(e=>`
        <div class="explorar__seccion">
          <h4 class="explorar__seccion-titulo">${t("sparkles")} ${o(e.titulo)}<span class="explorar__seccion-count">${e.items.length}</span></h4>
          <div class="explorar__grid">
            ${e.items.map(s=>`
              <div class="explorar__card">
                <div class="explorar__card-header">
                  <div class="explorar__card-icon">${t("sparkles")}</div>
                  <div class="explorar__card-head-body">
                    <div class="explorar__card-titulo">${o(s.nombre)}</div>
                    ${s.personajes&&s.personajes.length?`<div class="explorar__card-sub">${o(s.personajes.join(", "))}</div>`:""}
                  </div>
                </div>
                <p class="explorar__card-desc">${o(s.detalle)}</p>
                ${u(s.ref)}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}`:p("No se encontraron milagros.")}function q(){const a=v(c.parabolas||[],["nombre","tema","detalle","leccion"]);if(!a.length)return p("No se encontraron par\xE1bolas.");const r=a.slice(0,1);return`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      <div class="explorar__grid">
        ${r.map(e=>`
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${t("book-open")}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${o(e.nombre)}</div>
                <div class="explorar__card-sub">${o(e.tema)}</div>
              </div>
            </div>
            <p class="explorar__card-desc">${o(e.detalle)}</p>
            ${e.leccion?`
              <div class="explorar__detail-card">
                <p class="explorar__detail-card-label">${t("info")} Lecci\xF3n:</p>
                <p class="explorar__detail-card-text">${o(e.leccion)}</p>
              </div>`:""}
            ${u(e.ref)}
          </div>
        `).join("")}
      </div>`}function C(){const a=c.profecias||{},r=[];if(a.cumplidas){const e=v(a.cumplidas,["nombre","detalle"]);e.length&&r.push({titulo:"Cumplidas",items:e.slice(0,1)})}if(a.futuras){const e=v(a.futuras,["nombre","detalle"]);e.length&&r.push({titulo:"Futuras",items:e.slice(0,1)})}return r.length?`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      ${r.map(e=>`
        <div class="explorar__seccion">
          <h4 class="explorar__seccion-titulo">${t("target")} ${o(e.titulo)}<span class="explorar__seccion-count">${e.items.length}</span></h4>
          <div class="explorar__grid">
            ${e.items.map(s=>`
              <div class="explorar__card">
                <div class="explorar__card-header">
                  <div class="explorar__card-icon">${t("target")}</div>
                  <div class="explorar__card-head-body">
                    <div class="explorar__card-titulo">${o(s.nombre)}</div>
                  </div>
                </div>
                <p class="explorar__card-desc">${o(s.detalle)}</p>
                ${u(s.profecia||s.cumplimiento)}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}`:p("No se encontraron profec\xEDas.")}function D(){const a=c.curiosidades||[];if(!a.length)return p("No hay datos curiosos.");let r=null;return a.forEach(e=>{(e.items||[]).forEach(s=>{s.texto&&(!r||s.texto.length<r.texto.length)&&(r={...s,_emoji:e.emoji||"\u2728",_categoria:e.categoria})})}),r?`
      <button class="explorar__back-btn" data-volver="mas">${t("arrow-left")} Volver a M\xE1s</button>
      <section class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">
          <span class="curiosidades-seccion__emoji">${o(r._emoji)}</span>
          ${o(r._categoria)}
        </h4>
        <div class="explorar__grid">
          <div class="explorar__card">
            <div class="explorar__card-header">
              <span class="curiosidades-item__emoji">${o(r._emoji)}</span>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${o(r.titulo)}</div>
              </div>
            </div>
            <p class="explorar__card-desc">${o(r.texto)}</p>
            ${u(r.ref)}
          </div>
        </div>
      </section>`:p("No hay datos curiosos.")}const f={genealogia:S,lugares:L,objetos:A,milagros:N,parabolas:q,profecias:C,curiosidades:D},P={general:y,reyes:k,personajes:E,mas:M};function g(a){const r=a.querySelector("#explorarContent");if(!r)return;const e=P[d]||f[d];if(r.innerHTML=e?e():"",window.Iconos.actualizar(),_&&d!=="general"&&d!=="mas"){const s=r.querySelectorAll(".explorar__card, .explorar__timeline-item").length;if(s>0){const i=document.createElement("div");i.className="explorar__resultados",i.innerHTML=`${t("search")} <strong>${s}</strong> resultado${s===1?"":"s"} para \xAB${o(_)}\xBB`,r.prepend(i),window.Iconos.actualizar()}}r.querySelectorAll("[data-expandible]").forEach(s=>{const i=s.querySelector(".explorar__card-toggle"),n=()=>{const l=s.getAttribute("aria-expanded")==="true";s.setAttribute("aria-expanded",String(!l));const x=i?.querySelector(".explorar__card-toggle-text");x&&(x.textContent=l?"Ver m\xE1s":"Ver menos")};i&&i.addEventListener("click",l=>{l.stopPropagation(),n()}),s.addEventListener("click",n),s.addEventListener("keydown",l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),n())})}),r.querySelectorAll("[data-mas]").forEach(s=>{const i=()=>{const n=s.dataset.mas;if(!n||!f[n])return;d=n,g(a),a.querySelectorAll(".explorar__tab").forEach(R=>R.classList.remove("explorar__tab--activo"));const x=a.querySelector('[data-tab="mas"]');x&&x.classList.add("explorar__tab--activo")};s.addEventListener("click",i),s.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),i())})}),r.querySelectorAll('[data-volver="mas"]').forEach(s=>{s.addEventListener("click",()=>{d="mas",g(a)})})}function V(){return`<div class="explorar__skeleton" aria-hidden="true">${Array.from({length:4}).map(()=>'<div class="explorar__skeleton-card"></div>').join("")}</div>`}window.vistaExplorar={async montar(a){if(!store.obtener("usuario")){router.navegar("/login");return}if(window._explorarCache){await m(),this._renderizar(a);return}this._renderizar(a,!0),await m(),this._renderizar(a)},_renderizar(a,r){const e=b.find(n=>n.id===d)||b[0],s=d!=="general";a.innerHTML=`
        <div class="o-contenedor explorar">
          <div class="explorar__titulo vista-cabecera">
            <div class="vista-cabecera__principal">
              <h1>${t("compass")} Explorar <button class="info-ayuda" data-guia="explorar" aria-label="Gu\xEDa de Explorar">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </div>
          ${s?`
          <div class="explorar__search">
            <span class="explorar__search-icon">${t("search")}</span>
            <input type="search" id="explorarSearch" placeholder="Buscar en ${o(e.texto)}..." value="${o(_)}" aria-label="Buscar en ${o(e.texto)}">
          </div>`:""}
          <div class="explorar__tabs-bar" id="explorarTabsBar" role="tablist" aria-label="Categor\xEDas">
            ${b.map(n=>{const l=["explorar__tab"];return n.id===d&&l.push("explorar__tab--activo"),n._soloDesktop&&l.push("explorar__tab--desktop"),n._desktopOculta&&l.push("explorar__tab--mobile-only"),`<button class="${l.join(" ")}" data-tab="${n.id}" role="tab" aria-selected="${n.id===d}">${t(n.icono)} ${o(n.texto)}</button>`}).join("")}
          </div>
          <div id="explorarContent" class="explorar__contenido">${r?V():""}</div>
        </div>`,window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),a.querySelectorAll("[data-tab]").forEach(n=>{n.addEventListener("click",()=>{if(d===n.dataset.tab)return;d=n.dataset.tab,_="",this._renderizar(a);const l=a.querySelector(".explorar__tab--activo");l&&l.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})})});const i=a.querySelector("#explorarSearch");i&&i.addEventListener("input",n=>{_=n.target.value,g(a)}),r||g(a),window.Iconos.actualizar(),window.helpers.registrarGuias(a,{explorar:["Explorar","Consulta reyes, personajes, lugares, par\xE1bolas, profec\xEDas y otros contenidos relacionados con la Biblia.","Usa las pesta\xF1as y el buscador para encontrar un tema concreto."]})}}})();
