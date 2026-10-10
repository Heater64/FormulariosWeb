(function(){"use strict";const l=a=>window.helpers.escapeHtml(a),m=a=>window.Iconos.render(a),d=(a,e)=>a.querySelector(e),u=(a,e)=>a.querySelectorAll(e),v=window.ejerciciosMemorizacion,y=()=>window.repeticionEspaciada,f=["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#84CC16"];function b(a,e){return a&&/^#[0-9a-fA-F]{6}$/.test(a)?a:f[(e>=0?e:0)%f.length]}const g={completar:"Completar palabras",ordenar:"Ordenar palabras",elegir_versiculo:"Elegir el vers\xEDculo",verdadero_falso:"Verdadero o falso",relacionar:"Relacionar",escrita:"Respuesta escrita"},h={completar:"edit-3",ordenar:"list-ordered",elegir_versiculo:"book-open",verdadero_falso:"check-circle",relacionar:"link-2",escrita:"pen-line"},j=[{valor:"versiculo",texto:"Vers\xEDculo",icono:"book-open"},{valor:"completar",texto:"Completar palabras",icono:"edit-3"},{valor:"ordenar",texto:"Ordenar palabras",icono:"list-ordered"},{valor:"elegir_versiculo",texto:"Elegir el vers\xEDculo",icono:"check-circle"},{valor:"verdadero_falso",texto:"Verdadero o falso",icono:"help-circle"},{valor:"relacionar",texto:"Relacionar",icono:"link-2"},{valor:"escrita",texto:"Respuesta escrita",icono:"pen-line"},{valor:"libre",texto:"Tarjeta libre (legacy)",icono:"layers"}];window.vistaMemorizacion={async montar(a){if(!store.obtener("usuario")){router.navegar("/login");return}a.innerHTML=window.skeleton?window.skeleton.memorizacion():'<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';try{await this._cargarDatos(),this._tabMem="mazos",this._mazoGestion=null,this._pintar(a)}catch{a.innerHTML='<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar</p></div>'}},async _cargarDatos(){const a=store.obtener("usuario"),[e,i,o,r]=await Promise.all([window.memorizacionRepository.listarMazos(a.id),window.memorizacionRepository.listarTarjetas(a.id),window.memorizacionRepository.totalRepasos(a.id).catch(()=>0),window.supabaseClient.from("libros_biblicos").select("id, nombre").order("id")]),t=await window.memorizacionRepository.listarProgreso(a.id).catch(()=>({}));this._datos={mazos:e,tarjetas:i,progreso:t,repasos:o,libros:r.data||[],usuario:a}},desmontar(){},_tabsBar(a,e){return`
        <div class="examen-tabs" role="tablist" aria-label="Secciones de Memorizaci\xF3n">
          <button class="examen-tab${e==="mazos"?" examen-tab--activo":""}" data-mem-tab="mazos" role="tab" aria-selected="${e==="mazos"}">Mazos</button>
          ${a?`<button class="examen-tab${e==="gestionar"?" examen-tab--activo":""}" data-mem-tab="gestionar" role="tab" aria-selected="${e==="gestionar"}">${m("settings-2")} Gestionar</button>`:""}
        </div>`},_pintar(a){const e=this._datos,i=this._puedeEditar();if(i&&this._tabMem==="gestionar"){this._pintarGestion(a);return}const o=e.mazos.reduce((s,c)=>s+this._pendientesMazo(c.id).length,0),r=e.tarjetas.length,t=e.tarjetas.filter(s=>{const c=e.progreso[s.id];return c&&["dominada","perfecta"].includes(c.nivel)}).length,n=r?Math.round(t/r*100):0;a.innerHTML=`
        <div class="o-contenedor mem-juego-home">
          <!-- CABECERA -->
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${m("brain")} Memorizaci\xF3n <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Gu\xEDa de Memorizaci\xF3n">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>

          <!-- PESTA\xD1AS: Mazos / Gestionar (solo admin/owner) -->
          ${i?this._tabsBar(!0,"mazos"):""}

          <!-- RESUMEN -->
          <div class="mem-gizmo-resumen">
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${n}%</span>
              <span class="mem-gizmo-metrica__label">Dominado</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${o}</span>
              <span class="mem-gizmo-metrica__label">Para hoy</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${e.mazos.length}</span>
              <span class="mem-gizmo-metrica__label">Mazos</span>
            </div>
            <div class="mem-gizmo-metrica">
              <span class="mem-gizmo-metrica__valor">${r}</span>
              <span class="mem-gizmo-metrica__label">Tarjetas</span>
            </div>
          </div>

          <!-- GRID DE MAZOS -->
          <div class="mem-gizmo-grid">
            ${e.mazos.length===0?`<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${m("layers")}</span><h3>Sin mazos todav\xEDa</h3><p class="mem-juego-sub">El administrador publicar\xE1 mazos de contenido b\xEDblico. \xA1Vuelve pronto!</p></div>`:e.mazos.map((s,c)=>this._tarjetaMazo(s,c)).join("")}
          </div>
        </div>`,this._bindHome(a),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),window.Iconos.actualizar(),window.helpers.registrarGuias(a,{"memorizacion-juego":["Memorizaci\xF3n","Aprende la Biblia jugando: cada mazo combina completar palabras, ordenar, relacionar y m\xE1s. Sin ex\xE1menes: solo pr\xE1ctica divertida.","Elige un mazo y pulsa Repasar. Cada sesi\xF3n mezcla tipos de ejercicios autom\xE1ticamente. Las tarjetas que fallas aparecen m\xE1s veces hasta que las dominas."]}),u(a,"[data-mem-tab]").forEach(s=>{s.onclick=()=>{this._tabMem=s.dataset.memTab,this._mazoGestion=null,this._pintar(a)}})},_tarjetaMazo(a,e){const i=this._datos,o=i.tarjetas.filter(w=>w.mazo_id===a.id),r=this._pendientesMazo(a.id),t=o.filter(w=>{const $=i.progreso[w.id];return $&&["dominada","perfecta"].includes($.nivel)}).length,n=o.length?Math.round(t/o.length*100):0,s=b(a.color,e),c=o.length>0&&n===100,p=19,_=2*Math.PI*p,z=this._puedeEditar()?`
        <div class="mem-juego-mazo__menu-wrap">
          <button class="mem-juego-mazo__menu-btn mem-menu-toggle" aria-label="M\xE1s opciones" aria-expanded="false">\u22EE</button>
          <div class="mem-juego-mazo__menu">
            <button class="mem-juego-mazo__menu-item btn-editar-mazo" data-id="${a.id}">${m("edit-3")} Editar</button>
            <button class="mem-juego-mazo__menu-item btn-duplicar-mazo" data-id="${a.id}" data-nombre="${l(a.nombre)}">${m("copy")} Duplicar</button>
            <hr class="mem-juego-mazo__menu-sep">
            <button class="mem-juego-mazo__menu-item mem-juego-mazo__menu-item--peligro btn-eliminar-mazo" data-id="${a.id}" data-nombre="${l(a.nombre)}">${m("trash-2")} Eliminar</button>
          </div>
        </div>`:"";return`
        <article class="mem-juego-mazo" data-mazo="${a.id}" style="--mazo-color:${s}">
          <div class="mem-gizmo-mazo__banner">
            <span class="mem-gizmo-mazo__icono">${m(a.icono||"layers")}</span>
            ${r.length>0?`<span class="mem-gizmo-mazo__due">${m("clock")} ${r.length} hoy</span>`:""}
            ${c?`<span class="mem-gizmo-mazo__done">${m("check")}</span>`:""}
          </div>
          <div class="mem-gizmo-mazo__cuerpo">
            <div class="mem-gizmo-mazo__titulo">
              <h3 class="mem-gizmo-mazo__nombre">${l(a.nombre)}</h3>
              ${z}
            </div>
            ${a.descripcion?`<p class="mem-gizmo-mazo__desc">${l(a.descripcion)}</p>`:""}
            <div class="mem-gizmo-mazo__fila">
              <div class="mem-gizmo-mazo__meta">
                <span class="mem-gizmo-mazo__meta-item">${o.length} tarjetas</span>
                <span class="mem-gizmo-mazo__meta-item">${t} dominadas</span>
              </div>
              <div class="mem-gizmo-mazo__anillo" role="img" aria-label="${n}% dominado" title="${n}% dominado">
                <svg viewBox="0 0 44 44" aria-hidden="true">
                  <circle class="mem-gizmo-mazo__anillo-bg" cx="22" cy="22" r="${p}"></circle>
                  <circle class="mem-gizmo-mazo__anillo-fg" cx="22" cy="22" r="${p}" style="stroke-dasharray:${_.toFixed(2)};stroke-dashoffset:${(_*(1-n/100)).toFixed(2)}"></circle>
                </svg>
                <span class="mem-gizmo-mazo__anillo-pct">${n}%</span>
              </div>
            </div>
          </div>
          <button class="mem-juego-mazo__btn ${c?"mem-juego-mazo__btn--completado":""}" data-mazo="${a.id}">
            ${m(c?"check":"play")} ${c?"Completado":"Repasar"} \u2192
          </button>
        </article>`},_pendientesMazo(a){const e=this._datos,i=e.tarjetas.filter(r=>r.mazo_id===a),o=Date.now();return i.filter(r=>{const t=e.progreso[r.id];return!t||!t.proximo_repaso?!0:new Date(t.proximo_repaso).getTime()<=o})},_bindHome(a){u(a,".mem-juego-mazo").forEach(i=>{i.onclick=o=>{o.target.closest(".mem-juego-mazo__menu-wrap")||this._verMazo(a,i.dataset.mazo)}}),u(a,".mem-juego-mazo__btn").forEach(i=>{i.onclick=o=>{o.stopPropagation(),this._verMazo(a,i.dataset.mazo)}}),u(a,".mem-menu-toggle").forEach(i=>{i.addEventListener("click",o=>{o.stopPropagation();const r=i.nextElementSibling,t=r.classList.contains("mem-juego-mazo__menu--abierto");a.querySelectorAll(".mem-juego-mazo__menu--abierto").forEach(n=>n.classList.remove("mem-juego-mazo__menu--abierto")),a.querySelectorAll(".mem-menu-toggle").forEach(n=>n.setAttribute("aria-expanded","false")),t||(r.classList.add("mem-juego-mazo__menu--abierto"),i.setAttribute("aria-expanded","true"))})});const e=i=>{i.target.closest(".mem-juego-mazo__menu-wrap")||(a.querySelectorAll(".mem-juego-mazo__menu--abierto").forEach(o=>o.classList.remove("mem-juego-mazo__menu--abierto")),a.querySelectorAll(".mem-menu-toggle").forEach(o=>o.setAttribute("aria-expanded","false")))};a.addEventListener("click",e),u(a,".btn-editar-mazo").forEach(i=>{i.onclick=o=>{o.stopPropagation(),this._tabMem="gestionar",this._mazoGestion=i.dataset.id,this._pintar(a)}}),u(a,".btn-duplicar-mazo").forEach(i=>{i.onclick=async o=>{if(o.stopPropagation(),!!await window.helpers.confirmar('Se creara una copia del mazo "'+i.dataset.nombre+'".',{titulo:"Duplicar mazo",textoConfirmar:"Duplicar"}))try{const t=await window.memorizacionRepository.exportarMazo(i.dataset.id),n=store.obtener("usuario");await window.memorizacionRepository.importarMazo(n.id,t,{nombre:"Copia de "+i.dataset.nombre}),window.helpers.mostrarAlerta("Mazo duplicado.","exito"),this.montar(a)}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error")}}}),u(a,".btn-eliminar-mazo").forEach(i=>{i.onclick=async o=>{if(o.stopPropagation(),!!await window.helpers.confirmar('Se eliminara el mazo "'+i.dataset.nombre+'" y todo su contenido. Esta accion no se puede deshacer.',{titulo:"Eliminar mazo",textoConfirmar:"Eliminar"}))try{await window.memorizacionRepository.eliminarMazo(i.dataset.id),window.helpers.mostrarAlerta("Mazo eliminado.","exito"),this.montar(a)}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error")}}})},_verMazo(a,e){const i=this._datos,o=i.mazos.find(p=>p.id===e);if(!o){this._pintar(a);return}const r=b(o.color,i.mazos.indexOf(o)),t=i.tarjetas.filter(p=>p.mazo_id===e),n=this._pendientesMazo(e),s=t.filter(p=>{const _=i.progreso[p.id];return _&&["dominada","perfecta"].includes(_.nivel)}).length;a.innerHTML=`
        <div class="o-contenedor mem-juego-detalle">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">\u2190 Mazos</button>
            <span class="mem-juego-nivel" style="--nivel-color:${r}">${l(o.nombre)}</span>
          </div>

          <div class="mem-juego-detalle__hero" style="--mazo-color:${r}">
            <span class="mem-juego-detalle__icono">${m(o.icono||"layers")}</span>
            <h2>${l(o.nombre)}</h2>
            <p class="mem-juego-detalle__desc">${l(o.descripcion||"")}</p>
            <div class="mem-juego-detalle__stats">
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${t.length}</p><p class="mem-juego-detalle__stat-etiqueta">Tarjetas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${s}</p><p class="mem-juego-detalle__stat-etiqueta">Dominadas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${n.length}</p><p class="mem-juego-detalle__stat-etiqueta">Pendientes</p></div>
            </div>
            <div class="mem-juego-detalle__acciones">
              <button class="mem-juego-empezar" id="btnEmpezar" ${n.length===0?"disabled":""}>
                ${m("play")} Empezar sesi\xF3n ${n.length?`(${n.length})`:""}
              </button>
              ${this._puedeEditar()?`<button class="btn-secundario" id="btnEditarMazo">${m("edit-3")} Editar mazo</button>`:""}
            </div>
            ${n.length===0&&s>0?`<p class="mem-juego-sub">\xA1Mazo dominado! ${m("party-popper")} Vuelve ma\xF1ana para consolidar.</p>`:""}
          </div>
        </div>`,d(a,"#btnVolver").onclick=()=>this._pintar(a),d(a,"#btnEmpezar").onclick=()=>this._sesion(a,e);const c=d(a,"#btnEditarMazo");c&&(c.onclick=()=>{this._tabMem="gestionar",this._mazoGestion=e,this._pintarGestion(a)}),window.Iconos.actualizar(),window.helpers.registrarGuias(a,{"memorizacion-juego":["Memorizaci\xF3n","Gestiona los mazos y tarjetas de pr\xE1ctica b\xEDblica.","Usa Gestionar para crear contenido y Mazos para practicar."]})},_puedeEditar(){const a=(this._datos.usuario&&this._datos.usuario.rol||"").toString().toLowerCase();return a==="owner"||a==="admin"},_esOwner(){return(this._datos.usuario&&this._datos.usuario.rol||"").toString().toLowerCase()==="owner"},_pintarGestion(a){const e=this._datos;if(this._mazoGestion)return this._pintarGestionMazo(a);const i=this._esOwner(),o=e.tarjetas;a.innerHTML=`
        <div class="o-contenedor mem-juego-home">
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${m("brain")} Memorizaci\xF3n <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Gu\xEDa de Memorizaci\xF3n">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>

          ${this._tabsBar(!0,"gestionar")}

          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">Mazos <span class="u-fs-xs u-color-texto-terciario">(${e.mazos.length})</span></h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              ${i?`<button class="btn-secundario u-fs-xs" id="btnSembrarMazosMem">${m("sparkles")} Sembrar contenido</button>`:""}
              ${i?`<button class="btn-secundario u-fs-xs" id="btnImportarMazoMem">${m("upload")} Importar</button>`:""}
              <button class="btn-primario u-fs-xs" id="btnCrearMazoMem">${m("plus")} Crear mazo</button>
            </div>
          </div>

          ${e.mazos.length===0?`<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${m("layers")}</span><h3>Sin mazos todav\xEDa</h3><p class="mem-juego-sub">Pulsa "Crear mazo" para empezar, o "Sembrar contenido" si eres el propietario.</p></div>`:`<div class="mem-gestion-grid">${e.mazos.map((r,t)=>this._tarjetaGestion(r,t,o)).join("")}</div>`}
        </div>`,this._bindTabs(a),this._bindGestion(a),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),window.Iconos.actualizar(),window.helpers.registrarGuias(a,{"memorizacion-juego":["Memorizaci\xF3n","Gestiona los mazos y tarjetas de pr\xE1ctica b\xEDblica.","Usa Gestionar para crear contenido y Mazos para practicar."]})},_tarjetaGestion(a,e,i){const o=i.filter(t=>t.mazo_id===a.id).length,r=b(a.color,e);return`
        <article class="mem-gestion-card" data-mazoid="${a.id}" style="--mazo-color:${r}">
          <div class="mem-gestion-card__banner">
            <span class="mem-gestion-card__icono">${m(a.icono||"layers")}</span>
            <p class="mem-gestion-card__nombre">${l(a.nombre)}</p>
            ${a.es_global?`<span class="mem-gestion-card__global">${m("globe")} Global</span>`:""}
          </div>
          <div class="mem-gestion-card__cuerpo">
            <p class="mem-gestion-card__desc">${l(a.descripcion||"Sin descripci\xF3n")}</p>
            <div class="mem-gestion-card__meta">${m("layers")} ${o} tarjetas</div>
          </div>
          <div class="mem-gestion-card__acciones">
            <button class="mem-gestion-card__btn btn-gestion-mazo" data-mazoid="${a.id}">${m("eye")} Gestionar</button>
            <div class="mem-gestion-card__acciones-grupo">
              <button class="mem-gestion-card__btn btn-editar-mazo-gestion" data-mazoid="${a.id}" title="Editar" aria-label="Editar ${l(a.nombre)}">${m("edit-3")}</button>
              <button class="mem-gestion-card__btn btn-exportar-mazo" data-mazoid="${a.id}" title="Exportar JSON" aria-label="Exportar ${l(a.nombre)}">${m("download")}</button>
              <button class="mem-gestion-card__btn mem-gestion-card__btn--peligro btn-eliminar-mazo-gestion" data-mazoid="${a.id}" data-nombre="${l(a.nombre)}" title="Eliminar" aria-label="Eliminar ${l(a.nombre)}">${m("trash-2")}</button>
            </div>
          </div>
        </article>`},_pintarGestionMazo(a){const e=this._datos,i=e.mazos.find(t=>t.id===this._mazoGestion);if(!i){this._mazoGestion=null,this._pintarGestion(a);return}const o=e.tarjetas.filter(t=>t.mazo_id===i.id),r=b(i.color,e.mazos.indexOf(i));a.innerHTML=`
        <div class="o-contenedor mem-juego-home">
          <header class="mem-gizmo-cabecera vista-cabecera">
            <div class="mem-gizmo-cabecera__titulo vista-cabecera__principal">
              <h1>${m("brain")} Memorizaci\xF3n <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Gu\xEDa de Memorizaci\xF3n">i</button></h1>
            </div>
            <div class="mem-gizmo-cabecera__acciones vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>

          ${this._tabsBar(!0,"gestionar")}

          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario u-fs-xs" id="btnVolverMazosMem">${m("arrow-left")} Mazos</button>
            <h3 style="margin:0;display:flex;align-items:center;gap:var(--espaciado-xs)">
              <span style="color:${r}">${m(i.icono||"layers")}</span> ${l(i.nombre)}
              <span class="u-fs-xs u-color-texto-terciario">(${o.length})</span>
            </h3>
            <button class="btn-primario u-fs-xs" id="btnCrearTarjetaMem">${m("plus")} Nueva tarjeta</button>
          </div>

          ${o.length===0?`<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${m("layers")}</span><h3>Sin tarjetas</h3><p class="mem-juego-sub">A\xF1ade la primera tarjeta para que los usuarios puedan practicar.</p></div>`:`<div class="o-pila">${o.map(t=>this._tarjetaGestionItem(t)).join("")}</div>`}
        </div>`,this._bindTabs(a),this._bindGestion(a),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),window.Iconos.actualizar(),window.helpers.registrarGuias(a,{"memorizacion-juego":["Memorizaci\xF3n","Gestiona las tarjetas del mazo seleccionado.","Usa Nueva tarjeta para a\xF1adir contenido y las acciones de cada fila para editarlo o duplicarlo."]})},_tarjetaGestionItem(a){const e=j.find(r=>r.valor===a.tipo)||{texto:a.tipo||"versiculo",icono:"layers"},i=a.pregunta||a.referencia||a.texto||"(sin contenido)",o=String(i).substring(0,100)+(String(i).length>100?"\u2026":"");return`
        <div class="mem-gestion-fila" data-tid="${a.id}">
          <span class="mem-gestion-fila__tipo" title="${l(e.texto)}">${m(e.icono)}</span>
          <div class="mem-gestion-fila__info">
            <p class="mem-gestion-fila__texto">${l(o)}</p>
            <span class="mem-gestion-fila__subtipo">${l(e.texto)}</span>
          </div>
          <div class="mem-gestion-fila__acciones">
            <button class="btn-icono btn-tarjeta-duplicar" data-tid="${a.id}" title="Duplicar" aria-label="Duplicar tarjeta">${m("copy")}</button>
            <button class="btn-icono btn-tarjeta-editar" data-tid="${a.id}" title="Editar" aria-label="Editar tarjeta">${m("edit-3")}</button>
            <button class="btn-icono btn-icono--peligro btn-tarjeta-eliminar" data-tid="${a.id}" title="Eliminar" aria-label="Eliminar tarjeta">${m("trash-2")}</button>
          </div>
        </div>`},_bindTabs(a){u(a,"[data-mem-tab]").forEach(e=>{e.onclick=()=>{this._tabMem=e.dataset.memTab,this._mazoGestion=null,this._pintar(a)}})},_bindGestion(a){const e=a,i=async()=>{await this._cargarDatos(),this._tabMem="gestionar",this._pintar(a)};d(e,"#btnCrearMazoMem")?.addEventListener("click",()=>this._formMazo(null,a)),d(e,"#btnVolverMazosMem")?.addEventListener("click",()=>{this._mazoGestion=null,this._pintarGestion(a)}),d(e,"#btnCrearTarjetaMem")?.addEventListener("click",()=>this._formTarjeta(null,a)),d(e,"#btnSembrarMazosMem")?.addEventListener("click",()=>this._sembrarMazos(a)),d(e,"#btnImportarMazoMem")?.addEventListener("click",()=>this._importarMazo(a)),u(e,".btn-gestion-mazo").forEach(o=>{o.onclick=()=>{this._mazoGestion=o.dataset.mazoid,this._pintarGestion(a)}}),u(e,".btn-editar-mazo-gestion").forEach(o=>{o.onclick=()=>this._formMazo(o.dataset.mazoid,a)}),u(e,".btn-exportar-mazo").forEach(o=>{o.onclick=async()=>{try{const r=await window.memorizacionRepository.exportarMazo(o.dataset.mazoid);window.helpers.descargarTexto("mazo-memorizacion.json",r)}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}}),u(e,".btn-eliminar-mazo-gestion").forEach(o=>{o.onclick=async()=>{if(await window.helpers.confirmar(`\xBFEliminar el mazo "${o.dataset.nombre}"? Las tarjetas se borrar\xE1n con \xE9l.`,{titulo:"Eliminar mazo",textoConfirmar:"Eliminar"}))try{await window.memorizacionRepository.eliminarMazo(o.dataset.mazoid),window.helpers.mostrarAlerta("Mazo eliminado.","exito"),await i()}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error")}}}),u(e,".btn-tarjeta-editar").forEach(o=>{o.onclick=()=>this._formTarjeta(o.dataset.tid,a)}),u(e,".btn-tarjeta-duplicar").forEach(o=>{o.onclick=async()=>{try{await window.memorizacionRepository.duplicarTarjeta(o.dataset.tid),window.helpers.mostrarAlerta("Tarjeta duplicada.","exito"),await i()}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}}),u(e,".btn-tarjeta-eliminar").forEach(o=>{o.onclick=async()=>{if(await window.helpers.confirmar("\xBFEliminar esta tarjeta?",{titulo:"Eliminar tarjeta",textoConfirmar:"Eliminar"}))try{await window.memorizacionRepository.desactivarTarjeta(o.dataset.tid),window.helpers.mostrarAlerta("Tarjeta eliminada.","exito"),await i()}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error")}}})},async _formMazo(a,e){const i=this._datos,o=a&&i.mazos.find(s=>s.id===a)||null,r=["layers","book-open","users","map-pin","calendar","zap","message-square","sparkles","archive","eye","heart","shield"],t=await window.helpers.formulario({titulo:o?"Editar mazo":"Crear mazo",campos:[{nombre:"nombre",etiqueta:"Nombre",requerido:!0,valor:o?o.nombre:""},{nombre:"descripcion",etiqueta:"Descripci\xF3n corta",valor:o&&o.descripcion||""},{nombre:"color",etiqueta:"Color",tipo:"color",valor:o?b(o.color,0):f[0],opciones:f.map(s=>({valor:s,texto:s}))},{nombre:"icono",etiqueta:"Icono",tipo:"iconos",valor:o&&o.icono||"layers",opciones:r.map(s=>({valor:s,texto:s}))}],textoConfirmar:o?"Guardar":"Crear"});if(!t||!t.nombre.trim())return;const n=i.usuario;try{o?(await window.memorizacionRepository.actualizarMazo(o.id,{nombre:t.nombre.trim(),descripcion:t.descripcion,color:t.color,icono:t.icono}),window.helpers.mostrarAlerta("Mazo actualizado.","exito")):(await window.memorizacionRepository.crearMazo(n.id,{nombre:t.nombre.trim(),descripcion:t.descripcion,color:t.color,icono:t.icono,es_global:!0}),window.helpers.mostrarAlerta("Mazo creado.","exito")),await this._recargarGestion(e)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}},async _formTarjeta(a,e){const i=this._datos,o=a&&i.tarjetas.find(s=>s.id===a)||null,r=i.mazos.find(s=>s.id===this._mazoGestion),t=await window.helpers.formulario({titulo:o?"Editar tarjeta":"Nueva tarjeta",mensaje:`Mazo: ${r?r.nombre:""}`,campos:[{nombre:"tipo",etiqueta:"Tipo de ejercicio",tipo:"select",valor:o&&o.tipo||"versiculo",opciones:j.map(s=>({valor:s.valor,texto:s.texto}))},{nombre:"pregunta",etiqueta:"Pregunta / Referencia",requerido:!0,valor:o&&(o.pregunta||o.referencia)||""},{nombre:"respuesta",etiqueta:"Respuesta / Texto",requerido:!0,valor:o&&(o.respuesta||o.texto)||""},{nombre:"referencia",etiqueta:"Referencia b\xEDblica (opcional)",valor:o&&o.referencia||""},{nombre:"explicacion",etiqueta:"Explicaci\xF3n breve (opcional)",valor:o&&o.explicacion||""},{nombre:"pista",etiqueta:"Pista (opcional)",valor:o&&o.pista||""}],textoConfirmar:o?"Guardar":"Crear"});if(!t||!t.pregunta.trim()||!t.respuesta.trim()){t&&window.helpers.mostrarAlerta("Pregunta y respuesta son obligatorias.","advertencia");return}const n=i.usuario;try{o?(await window.memorizacionRepository.actualizarContenido(o.id,{tipo:t.tipo,pregunta:t.pregunta.trim(),respuesta:t.respuesta.trim(),referencia:t.referencia,explicacion:t.explicacion,pista:t.pista}),window.helpers.mostrarAlerta("Tarjeta actualizada.","exito")):(await window.memorizacionRepository.crearTarjetaGlobal({mazo_id:this._mazoGestion,tipo:t.tipo,pregunta:t.pregunta.trim(),respuesta:t.respuesta.trim(),referencia:t.referencia,explicacion:t.explicacion,pista:t.pista,creado_por:n.id}),window.helpers.mostrarAlerta("Tarjeta creada.","exito")),await this._recargarGestion(e)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}},async _recargarGestion(a){await this._cargarDatos(),this._tabMem="gestionar",this._pintar(a)},async _sembrarMazos(a){if(await window.helpers.confirmar("Se crear\xE1n los mazos de contenido b\xEDblico por defecto (si no existen). \xBFContinuar?",{titulo:"Sembrar contenido",textoConfirmar:"Sembrar"}))try{await window.memorizacionRepository.sembrarMazos(this._datos.usuario.id),window.helpers.mostrarAlerta("Contenido sembrado.","exito"),await this._recargarGestion(a)}catch(i){window.helpers.mostrarAlerta("Error: "+i.message,"error")}},async _importarMazo(a){const e=document.createElement("input");e.type="file",e.accept=".json,application/json",e.onchange=async()=>{const i=e.files&&e.files[0];if(i)try{const o=await i.text();await window.memorizacionRepository.importarMazo(this._datos.usuario.id,o),window.helpers.mostrarAlerta("Mazo importado.","exito"),await this._recargarGestion(a)}catch(o){window.helpers.mostrarAlerta("Error: "+o.message,"error")}},e.click()},_sesion(a,e){const i=this._datos,o=i.mazos.find(c=>c.id===e),r=b(o.color,i.mazos.indexOf(o)),t=this._pendientesMazo(e),n=v.construirSesion(t,i.tarjetas,{maxTarjetas:10}),s={mazoId:e,color:r,ejercicios:n,idx:0,correctas:0,incorrectas:0,dominadas:0,racha:0,mejorRacha:0};this._estadoNiveles={},a.innerHTML=`
        <div class="o-contenedor mem-juego-sesion">
          <div class="mem-juego-sesion__barra">
            <button class="btn-secundario u-fs-xs" id="btnSalir" style="padding:6px 10px">${m("x")}</button>
            <div class="mem-juego-sesion__track" aria-hidden="true"><div class="mem-juego-sesion__fill" style="transform:scaleX(${n.length?1/n.length:0})"></div></div>
            <span class="mem-juego-sesion__corazones" id="corazones" title="Fallos permitidos"></span>
          </div>
          <div id="slot" class="o-pila" style="flex:1;min-height:300px"></div>
        </div>`,d(a,"#btnSalir").onclick=()=>this._verMazo(a,e),this._pintarCorazones(a,s),this._ejercicio(a,s)},_pintarCorazones(a,e){const o=5-Math.min(e.incorrectas,5),r=d(a,"#corazones");r&&(r.innerHTML=Array.from({length:5},(t,n)=>`<span style="opacity:${n<o?1:.25}">${m("heart")}</span>`).join(""),window.Iconos.actualizar())},_ejercicio(a,e){const i=d(a,"#slot"),o=e.ejercicios[e.idx];if(!o){this._finSesion(a,e);return}const r=Math.round((e.idx+1)/e.ejercicios.length*100),t=d(a,".mem-juego-sesion__fill");t&&(t.style.transform=`scaleX(${r/100})`);const n=this._renderers[o.tipo];n&&n.call(this,i,o,e,a)},_renderers:{completar(a,e,i,o){const r={};(()=>{a.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
              ${e.referencia?`<p class="mem-juego-tarjeta__ref">${l(e.referencia)}</p>`:""}
              <div class="mem-juego-completar">
                ${e.enunciado.split(" ").map((n,s)=>{if(n!=="_____")return`<span>${l(n)}</span>`;const c=Object.keys(r).length;return`<input type="text" class="mem-juego-hueco" data-hueco="${c}" placeholder="..." value="${l(r[c]||"")}" autocomplete="off">`}).join(" ")}
              </div>
              ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`,window.Iconos.actualizar(),u(a,".mem-juego-hueco").forEach(n=>{n.addEventListener("input",()=>{r[n.dataset.hueco]=n.value})}),d(a,"[data-pista]")?.addEventListener("click",()=>{const n=d(a,"[data-pista-box]");n&&(n.style.display=n.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const n=[...u(a,".mem-juego-hueco")].map(p=>p.value||""),s=e.verificar(n),c=s.every(Boolean);u(a,".mem-juego-hueco").forEach((p,_)=>{p.classList.add(s[_]?"mem-juego-hueco--ok":"mem-juego-hueco--ko"),s[_]||(p.value=e.respuestas[_]||""),p.disabled=!0}),d(a,"#btnResp").remove(),this._feedback(a,e,c,i,o)}})()},ordenar(a,e,i,o){const r=[...e.palabras],t=[],n=()=>{a.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
              ${e.referencia?`<p class="mem-juego-tarjeta__ref">${l(e.referencia)}</p>`:""}
              <div class="mem-juego-ordenar">
                <div class="mem-juego-frase" id="frase"></div>
                <div class="mem-juego-palabras" id="palabras">
                  ${r.map((c,p)=>`<button class="mem-juego-palabra" data-idx="${p}">${l(c)}</button>`).join("")}
                </div>
              </div>
              ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${t.length===0?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar();const s=d(a,"#frase");s.innerHTML=t.map((c,p)=>`<span class="mem-juego-frase__palabra" data-pos="${p}">${l(c)}</span>`).join("")+(t.length===0?'<span class="mem-juego-sub">Toca las palabras aqu\xED...</span>':""),u(a,".mem-juego-palabra").forEach(c=>{c.onclick=()=>{const p=parseInt(c.dataset.idx,10),_=r.splice(p,1)[0];t.push(_),n()}}),u(a,".mem-juego-frase__palabra").forEach(c=>{c.onclick=()=>{const p=parseInt(c.dataset.pos,10),_=t.splice(p,1)[0];r.push(_),n()}}),d(a,"[data-pista]")?.addEventListener("click",()=>{const c=d(a,"[data-pista-box]");c&&(c.style.display=c.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const c=e.verificar(t);s.innerHTML=e.palabras.map((p,_)=>`<span class="mem-juego-frase__palabra mem-juego-frase__palabra--${c?"ok":"ko"}">${l(p)}</span>`).join(""),d(a,"#btnResp").remove(),this._feedback(a,e,c,i,o)}};n()},elegir_versiculo(a,e,i,o){let r=null;const t=()=>{a.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${l(e.enunciado)}</p>
              <div class="mem-juego-opciones">
                ${e.opciones.map((n,s)=>`
                  <button class="mem-juego-opcion ${r===s?"mem-juego-opcion--sel":""}" data-opt="${s}">
                    <span class="mem-juego-opcion__letra">${String.fromCharCode(65+s)}</span>
                    <span>${l(n)}</span>
                  </button>`).join("")}
              </div>
              ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${r===null?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar(),u(a,".mem-juego-opcion").forEach(n=>{n.onclick=()=>{r=parseInt(n.dataset.opt,10),t()}}),d(a,"[data-pista]")?.addEventListener("click",()=>{const n=d(a,"[data-pista-box]");n&&(n.style.display=n.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const n=e.verificar(e.opciones[r]);u(a,".mem-juego-opcion").forEach((s,c)=>{s.disabled=!0,e.opciones[c]===e.respuestaCorrecta?s.classList.add("mem-juego-opcion--ok"):c===r&&!n&&s.classList.add("mem-juego-opcion--ko")}),d(a,"#btnResp").remove(),this._feedback(a,e,n,i,o)}};t()},verdadero_falso(a,e,i,o){let r=null;const t=["Verdadero","Falso"],n=()=>{a.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${l(e.enunciado)}</p>
              ${e.referencia?`<p class="mem-juego-tarjeta__ref">${l(e.referencia)}</p>`:""}
              <div class="mem-juego-opciones">
                ${t.map((s,c)=>`
                  <button class="mem-juego-opcion ${r===c?"mem-juego-opcion--sel":""}" data-opt="${c}">
                    <span class="mem-juego-opcion__letra">${m(c===0?"check":"x")}</span>
                    <span>${s}</span>
                  </button>`).join("")}
              </div>
              ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${r===null?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar(),u(a,".mem-juego-opcion").forEach(s=>{s.onclick=()=>{r=parseInt(s.dataset.opt,10),n()}}),d(a,"[data-pista]")?.addEventListener("click",()=>{const s=d(a,"[data-pista-box]");s&&(s.style.display=s.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const s=e.verificar(t[r]);u(a,".mem-juego-opcion").forEach((c,p)=>{c.disabled=!0,e.verificar(t[p])?c.classList.add("mem-juego-opcion--ok"):p===r&&c.classList.add("mem-juego-opcion--ko")}),d(a,"#btnResp").remove(),this._feedback(a,e,s,i,o)}};n()},relacionar(a,e,i,o){const r={};let t=null;const n=()=>{a.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
              <div class="mem-juego-relacionar">
                <div class="mem-juego-rel-col">
                  ${e.izquierda.map((s,c)=>{const p=v.limpiar(s),_=r[p];return`<button class="mem-juego-rel-item ${t===c?"mem-juego-rel-item--sel":""}${_?" mem-juego-rel-item--disabled":""}" data-izq="${c}">${l(s)}</button>`}).join("")}
                </div>
                <div class="mem-juego-rel-col">
                  ${e.derecha.map((s,c)=>`<button class="mem-juego-rel-item ${Object.keys(r).some(_=>r[_]===s)?"mem-juego-rel-item--disabled":""}" data-der="${c}">${l(s)}</button>`).join("")}
                </div>
              </div>
              ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`,window.Iconos.actualizar(),u(a,".mem-juego-rel-item[data-izq]").forEach(s=>{s.onclick=()=>{const c=parseInt(s.dataset.izq,10);r[v.limpiar(e.izquierda[c])]||(t=t===c?null:c,n())}}),u(a,".mem-juego-rel-item[data-der]").forEach(s=>{s.onclick=()=>{const c=parseInt(s.dataset.der,10);if(t===null)return;const p=e.izquierda[t],_=v.limpiar(p);r[_]||(r[_]=e.derecha[c],t=null,n())}}),d(a,"[data-pista]")?.addEventListener("click",()=>{const s=d(a,"[data-pista-box]");s&&(s.style.display=s.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const s=e.verificar(r);u(a,".mem-juego-rel-item").forEach(c=>{if(c.disabled=!0,c.dataset.izq!==void 0){const p=e.izquierda[parseInt(c.dataset.izq,10)];r[v.limpiar(p)]&&c.classList.add("mem-juego-rel-item--ok")}else{const p=e.derecha[parseInt(c.dataset.der,10)];Object.values(r).includes(p)&&c.classList.add("mem-juego-rel-item--ok")}}),d(a,"#btnResp").remove(),this._feedback(a,e,s,i,o)}};n()},escrita(a,e,i,o){let r="";const t=()=>{const n=d(a,"#btnResp");if(!n)return;const s=r.trim().length>0;n.disabled=!s,s?n.classList.remove("btn-desactivado"):n.classList.add("btn-desactivado")};a.innerHTML=`
          <div class="mem-juego-tarjeta">
            <span class="mem-juego-tipo">${m(h[e.tipo])} ${g[e.tipo]}</span>
            <p class="mem-juego-tarjeta__instruccion">${l(e.instruccion)}</p>
            <p class="mem-juego-tarjeta__enunciado">${l(e.enunciado)}</p>
            <div class="mem-juego-escrita">
              <input type="text" class="mem-juego-input" id="txtResp" value="" placeholder="Escribe aqu\xED..." autocomplete="off">
            </div>
            ${e.referencia?`<p class="mem-juego-tarjeta__ref">${l(e.referencia)}</p>`:""}
            ${e.pista?`<button class="mem-juego-pista" data-pista>${m("lightbulb")} Pista</button>`:""}
            <div class="mem-juego-pista__box" data-pista-box style="display:none">${l(e.pista)}</div>
            <button class="mem-juego-continuar btn-desactivado" id="btnResp" disabled>Comprobar</button>
          </div>`,window.Iconos.actualizar(),d(a,"#txtResp").addEventListener("input",n=>{r=n.target.value,t()}),d(a,"[data-pista]")?.addEventListener("click",()=>{const n=d(a,"[data-pista-box]");n&&(n.style.display=n.style.display==="none"?"block":"none")}),d(a,"#btnResp").onclick=()=>{const n=e.verificar(r),s=d(a,"#txtResp");s.disabled=!0,s.classList.add(n?"mem-juego-input--ok":"mem-juego-input--ko"),n||(s.value=e.respuestaCorrecta),d(a,"#btnResp").remove(),this._feedback(a,e,n,i,o)}}},_feedback(a,e,i,o,r){const t=e.tarjetaId;i?(o.correctas++,o.racha++,o.racha>o.mejorRacha&&(o.mejorRacha=o.racha)):(o.incorrectas++,o.racha=0),window.haptica&&(i?window.haptica.logro():window.haptica.fallo());const n=e.respuestaCorrecta||(e.tipo==="verdadero_falso"?e.esVerdadero?"Verdadero":"Falso":"");window.memorizacionRepository.registrarResultado(this._datos.usuario.id,t,i).then(({progreso:p})=>{this._datos.tarjetas.find(z=>z.id===t)&&p&&(this._datos.progreso[t]={...this._datos.progreso[t],...p}),p&&["dominada","perfecta"].includes(p.nivel)&&o.dominadas++}).catch(()=>{});const s=document.createElement("div");s.className=`mem-juego-feedback mem-juego-feedback--${i?"ok":"ko"}`,s.innerHTML=`
        <p class="mem-juego-feedback__titulo">${i?m("check-circle")+" \xA1Correcto!":m("x-circle")+" Casi..."}</p>
        <p class="mem-juego-feedback__respuesta"><strong>${i?"":"Respuesta: "}</strong>${i?"":l(String(n||""))}</p>
        ${e.referencia?`<p class="mem-juego-feedback__ref">${m("book-open")} ${l(e.referencia)}</p>`:""}
        ${e.explicacion?`<p class="mem-juego-feedback__expl">${l(e.explicacion)}</p>`:""}
      `,window.Iconos.actualizar();const c=document.createElement("button");c.className="mem-juego-continuar",c.innerHTML=`${m("arrow-right")} Continuar`,c.onclick=()=>{o.idx++,this._pintarCorazones(r,o),this._ejercicio(r,o)},a.appendChild(s),a.appendChild(c),c.scrollIntoView({behavior:"smooth",block:"nearest"})},_finSesion(a,e){const i=d(a,"#slot"),o=e.correctas+e.incorrectas,r=o?Math.round(e.correctas/o*100):0,t=o>0&&e.incorrectas===0;i.innerHTML=`
        <div class="mem-juego-fin">
          <span class="mem-juego-fin__icono">${m(t?"trophy":"party-popper")}</span>
          <h2>${t?"\xA1Sesi\xF3n perfecta!":"\xA1Sesi\xF3n completada!"}</h2>
          <p class="mem-juego-fin__sub">${e.dominadas?`Dominaste ${e.dominadas} tarjeta${e.dominadas===1?"":"s"} nuevas.`:"\xA1Sigue as\xED! Las tarjetas dif\xEDciles volver\xE1n pronto."}</p>

          <div class="mem-juego-fin__anillo" style="--precision:${r}">
            <div class="mem-juego-fin__anillo-inner">
              <span class="mem-juego-fin__anillo-valor">${r}%</span>
              <span class="mem-juego-fin__stat-etiqueta">Precisi\xF3n</span>
            </div>
          </div>

          <div class="mem-juego-fin__stats">
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ok"><p class="mem-juego-fin__stat-valor">${e.correctas}</p><p class="mem-juego-fin__stat-etiqueta">Correctas</p></div>
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ko"><p class="mem-juego-fin__stat-valor">${e.incorrectas}</p><p class="mem-juego-fin__stat-etiqueta">Incorrectas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${e.dominadas}</p><p class="mem-juego-fin__stat-etiqueta">Dominadas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${e.mejorRacha}</p><p class="mem-juego-fin__stat-etiqueta">Mejor racha</p></div>
          </div>

          <div class="mem-juego-fin__acciones">
            <button class="mem-juego-empezar" id="btnRepetir" style="background:var(--color-exito)">${m("rotate-ccw")} Continuar practicando</button>
            <button class="btn-secundario" id="btnVolverMazos" style="justify-content:center">Volver a los mazos</button>
          </div>
        </div>`,window.Iconos.actualizar(),d(i,"#btnRepetir").onclick=async()=>{try{await this._recargar(a),this._sesion(a,e.mazoId)}catch{this._sesion(a,e.mazoId)}},d(i,"#btnVolverMazos").onclick=async()=>{try{await this._recargar(a)}catch{}this._pintar(a)}},async _recargar(a){const e=this._datos,[i,o,r]=await Promise.all([window.memorizacionRepository.listarMazos(e.usuario.id),window.memorizacionRepository.listarTarjetas(e.usuario.id),window.memorizacionRepository.totalRepasos(e.usuario.id).catch(()=>e.repasos||0)]),t=await window.memorizacionRepository.listarProgreso(e.usuario.id).catch(()=>e.progreso||{});e.mazos=i,e.tarjetas=o,e.progreso=t,e.repasos=r}}})();
