(function(){"use strict";window.vistaCapitulos={async montar(e,b){const i=parseInt(b.libro);e.innerHTML=window.skeleton?`<div class="o-contenedor o-pila u-mt-3">${window.skeleton.tarjetas(20,{ancho:"100%"})}</div>`:'<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando cap\xEDtulos...</p></div>';const r=window.supabaseClient,l=store.obtener("usuario");if(!(!r||!l))try{const{data:a}=await r.from("libros_biblicos").select("*").eq("id",i).single();if(!a){e.innerHTML=`<div class="o-contenedor o-pila o-pila--lg u-mt-4">
            <p class="u-fs-lg">Libro no encontrado.</p>
            <p class="u-color-texto-secundario">Puede que el enlace sea incorrecto.</p>
            <button class="btn-primario" style="max-width:240px" id="btnVolverEstudio">Volver al estudio</button>
          </div>`;const o=e.querySelector("#btnVolverEstudio");o&&(o.onclick=()=>router.navegar("/estudio"));return}const{data:v}=await r.from("progreso_lectura").select("capitulo_id").eq("usuario_id",l.id).eq("completado",!0),{data:m}=await r.from("capitulos").select("id, numero").eq("libro_id",i),w=new Set((v||[]).map(o=>o.capitulo_id)),n={};(m||[]).forEach(o=>{n[o.numero]=w.has(o.id)});const t=a.num_capitulos,s=Object.values(n).filter(Boolean).length,d=Math.round(s/t*100),u=(()=>{for(let o=1;o<=t;o++)if(!n[o])return o;return 1})();e.innerHTML=`
          <div class="o-contenedor o-pila o-pila--lg u-app-shell">
            <header class="vista-cabecera capitulos-vista-cabecera">
              <div class="vista-cabecera__principal">
                <button class="btn-icono" id="btnCabeceraVolverEstudio" aria-label="Volver al estudio">${window.Iconos.render("arrow-left")}</button>
                <div>
                  <h1>${window.Iconos.render("book-open")} ${a.nombre} <button class="info-ayuda" data-guia="capitulos" aria-label="Gu\xEDa de cap\xEDtulos">i</button></h1>
                </div>
              </div>
              <div class="vista-cabecera__acciones">
                ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
              </div>
            </header>
            <div class="capitulos-cabecera">
              <div class="capitulos-cabecera__icono">${window.Iconos.render("book-open")}</div>
              <div class="capitulos-cabecera__info">
                <h2>Tu progreso</h2>
                <p class="capitulos-cabecera__meta">${s} de ${t} cap\xEDtulos le\xEDdos \xB7 ${d}%</p>
                <div class="capitulos-cabecera__barra"><div class="capitulos-cabecera__barra--lleno" style="transform:scaleX(${d/100})"></div></div>
              </div>
            </div>
            <button class="btn-primario u-btn-full" id="btnEmpezar" style="min-height:52px;font-size:var(--texto-lg)">
              ${window.Iconos.render("play")} Empezar${s>0&&s<t?" (cap. "+u+")":""}
            </button>
            <div class="o-pila"><h3>Cap\xEDtulos</h3>
              <div id="gridCaps" class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(64px,1fr))"></div>
            </div>
          </div>`,e.querySelector("#btnCabeceraVolverEstudio")?.addEventListener("click",()=>router.navegar("/estudio")),e.querySelector("#btnEmpezar").addEventListener("click",()=>router.navegar(`/estudio/sesion/${i}/${u}`)),window.Iconos&&window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(e),window.helpers.registrarGuias(e,{capitulos:["Cap\xEDtulos","Consulta el progreso de este libro y entra directamente en el cap\xEDtulo que quieras estudiar.","Usa Empezar para continuar por el primer cap\xEDtulo pendiente o elige un n\xFAmero concreto."]});const p=e.querySelector("#gridCaps");p.innerHTML=Array.from({length:t},(o,c)=>c+1).map(o=>{const c=n[o];return`<button class="btn-capitulo${c?" btn-capitulo--hecho":""}" data-cap="${o}" style="position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:var(--texto-sm);border:1px solid var(--color-borde);border-radius:var(--radio-lg);background:var(--color-fondo-tarjeta);cursor:pointer;transition:transform var(--transicion-rapida),border-color var(--transicion-rapida),background var(--transicion-rapida)" >
            ${o}
            ${c?`<span class="btn-capitulo__check">${window.Iconos.render("check")}</span>`:""}
          </button>`}).join(""),p.querySelectorAll("[data-cap]").forEach(o=>{o.addEventListener("click",()=>router.navegar(`/estudio/sesion/${i}/${o.dataset.cap}`))})}catch(a){e.innerHTML=`<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${a.message}</p></div>`}}}})();
