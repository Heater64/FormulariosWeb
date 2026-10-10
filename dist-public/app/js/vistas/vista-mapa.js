(function(){"use strict";window.vistaMapa={async montar(a){const e=store.obtener("usuario");a.innerHTML=window.skeleton?`<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(12,{ancho:"100%"})}</div>`:'<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando mapa b\xEDblico...</p></div>';try{const i=window.supabaseClient;if(!i)return;const{data:s}=await i.from("libros_biblicos").select("*").order("id"),t=e?await window.progresoRepository.obtenerProgresoPorLibro(e.id):{};this._renderizar(a,s||[],t)}catch(i){a.innerHTML=`<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${i.message}</p></div>`}},_renderizar(a,e,i){const s=e.filter(o=>o.testamento==="antiguo"),t=e.filter(o=>o.testamento==="nuevo");a.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg u-app-shell">
          <header class="vista-cabecera">
            <div class="vista-cabecera__principal">
              <h1>${window.Iconos.render("map")} Mapa B\xEDblico <button class="info-ayuda" data-guia="mapa" aria-label="Gu\xEDa del Mapa B\xEDblico">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>
          <div class="o-pila" id="mapaAT">
            <h4 class="u-color-texto-secundario mapa__titulo-seccion mapa__titulo-seccion--at">Antiguo Testamento</h4>
            <div class="o-grid-tarjetas">${s.map(o=>this._renderLibro(o,i)).join("")}</div>
          </div>
          <div class="o-pila u-mt-4" id="mapaNT">
            <h4 class="u-color-texto-secundario mapa__titulo-seccion mapa__titulo-seccion--nt">Nuevo Testamento</h4>
            <div class="o-grid-tarjetas">${t.map(o=>this._renderLibro(o,i)).join("")}</div>
          </div>
        </div>`,window.Iconos&&window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),window.helpers.registrarGuias(a,{mapa:["Mapa B\xEDblico","El mapa resume cu\xE1nto has le\xEDdo de cada libro y te permite entrar directamente en un cap\xEDtulo.","Pulsa un libro para comenzar desde su primer cap\xEDtulo."]}),a.querySelectorAll("[data-libro-id]").forEach(o=>{o.addEventListener("click",()=>router.navegar(`/estudio/sesion/${o.dataset.libroId}/1`))})},_renderLibro(a,e){const i=e[a.id]||[],s=i.filter(Boolean).length,t=a.num_capitulos,o=t>0?Math.round(s/t*100):0;return`
        <div class="tarjeta-libro ${o===100?"tarjeta-libro--completado":""}" data-libro-id="${a.id}">
          <div class="tarjeta-libro__nombre">${a.nombre}</div>
          <div class="tarjeta-libro__progreso">${s}/${t}</div>
          <div class="tarjeta-libro__barra"><div class="tarjeta-libro__barra--lleno" style="transform:scaleX(${o/100})"></div></div>
          <div class="tarjeta-libro__detalle u-pila-gap-xs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(6px,1fr));gap:2px;margin-top:var(--espaciado-sm)">
            ${i.map(r=>`<span class="mapa__dot${r?" mapa__dot--leido":""}" title="${i.indexOf(r)+1}"></span>`).join("")}
          </div>
        </div>`}}})();
