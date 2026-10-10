(function(){"use strict";window.vistaEstudio={async montar(t){t.innerHTML=window.skeleton?window.skeleton.estudio():'<div class="o-contenedor o-pila o-pila--lg u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';const y=store.obtener("usuario"),l=window.supabaseClient;if(!(!l||!y))try{const[b,E]=await Promise.all([l.from("libros_biblicos").select("*").order("id"),l.from("progreso_lectura").select("*, capitulos!capitulo_id(libro_id)").eq("usuario_id",y.id).eq("completado",!0)]),c=b.data,m=E.data||[],$={};m.forEach(e=>{const o=e.capitulos?.libro_id;o&&($[o]=($[o]||0)+1)});const T=(c||[]).filter(e=>e.testamento==="antiguo"),h=(c||[]).filter(e=>e.testamento==="nuevo"),_=m.sort((e,o)=>new Date(o.fecha_lectura)-new Date(e.fecha_lectura))[0];let r=null,d=null;if(_?.capitulos){r=(c||[]).find(o=>o.id===_.capitulos.libro_id);const{data:e}=await l.from("capitulos").select("numero").eq("id",_.capitulo_id).single();d=e?.numero}let s=null,n=null;if(r&&d)if(d<r.num_capitulos)s=r,n=d+1;else{const e=(c||[]).slice().sort((i,w)=>i.id-w.id),o=e.findIndex(i=>i.id===r.id),a=e[o+1];a&&(s=a,n=1)}if(t.innerHTML=`
          <div class="o-contenedor o-contenedor--ancho o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <div class="estudio-cabecera vista-cabecera">
              <div class="vista-cabecera__principal">
                <h1>${window.Iconos.render("book-open")} <span class="estudio-cabecera__titulo-texto">Estudio Guiado</span> <button class="info-ayuda" data-guia="estudio" aria-label="Resumen y gu\xEDa de Estudio">i</button></h1>
              </div>
              <div class="vista-cabecera__acciones">
                ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
              </div>
            </div>
            ${s?`<div class="tarjeta-capitulo tarjeta-capitulo--en-progreso estudio-continuar" id="continuarLectura" role="button" tabindex="0" aria-label="Continuar leyendo ${s.nombre} ${n}">
              <div class="estudio-continuar__icono">${window.Iconos.render("book-open")}</div>
              <div class="estudio-continuar__info">
                <span class="estudio-continuar__etiqueta">Continuar leyendo</span>
                <p class="estudio-continuar__titulo">${s.nombre} ${n}</p>
                <span class="estudio-continuar__capitulo">Cap\xEDtulo ${n} de ${s.num_capitulos}</span>
              </div>
              <span class="estudio-continuar__flecha">${window.Iconos.render("chevron-right")}</span>
            </div>`:""}
            <section class="o-pila o-pila--sm">
              <div class="estudio-testamento estudio-testamento--at" id="toggleAT" role="button" tabindex="0" aria-expanded="true" aria-controls="listaAT">
                <div class="estudio-testamento__titulo">
                  <h3>Antiguo Testamento</h3>
                  <span class="estudio-testamento__count">${T.length} libros</span>
                </div>
                <span class="estudio-testamento__icono" id="iconAT">${window.Iconos.render("chevron-down")}</span>
              </div>
              <div id="listaAT" class="estudio-lista"></div>
            </section>
            <section class="o-pila o-pila--sm">
              <div class="estudio-testamento estudio-testamento--nt" id="toggleNT" role="button" tabindex="0" aria-expanded="true" aria-controls="listaNT">
                <div class="estudio-testamento__titulo">
                  <h3>Nuevo Testamento</h3>
                  <span class="estudio-testamento__count">${h.length} libros</span>
                </div>
                <span class="estudio-testamento__icono" id="iconNT">${window.Iconos.render("chevron-down")}</span>
              </div>
              <div id="listaNT" class="estudio-lista"></div>
            </section>
          </div>`,window.campanaNotificaciones&&window.campanaNotificaciones.conectar(t),t.querySelectorAll("[data-ruta]").forEach(e=>{e.addEventListener("click",()=>router.navegar(e.dataset.ruta))}),s){const e=()=>router.navegar(`/estudio/sesion/${s.id}/${n}`),o=t.querySelector("#continuarLectura");o.onclick=e,o.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),e())})}const j=e=>{const o=m.filter(N=>N.capitulos?.libro_id===e.id).length,a=Math.round(o/e.num_capitulos*100),i=a===100,w=a===0,A=i?window.Iconos.render("check-circle"):window.Iconos.render("book-open");return`<div class="tarjeta-libro${i?" tarjeta-libro--completado":""}${w?" tarjeta-libro--vacio":""}" data-libro="${e.id}" role="button" tabindex="0" aria-label="Estudiar ${e.nombre}: ${o} de ${e.num_capitulos} cap\xEDtulos le\xEDdos" title="Estudiar ${e.nombre}: progreso ${a}%">
            <span class="tarjeta-libro__icono">${A}</span>
            <div class="tarjeta-libro__info">
              <span class="tarjeta-libro__nombre">${e.nombre}</span>
              <span class="tarjeta-libro__progreso">${o}/${e.num_capitulos} le\xEDdos \xB7 ${a}%</span>
              <div class="tarjeta-libro__barra"><div class="tarjeta-libro__barra--lleno" style="transform:scaleX(${a/100})"></div></div>
            </div>
            <span class="tarjeta-libro__flecha">${window.Iconos.render("chevron-right")}</span>
          </div>`};t.querySelector("#listaAT").innerHTML=T.map(j).join(""),t.querySelector("#listaNT").innerHTML=h.map(j).join(""),t.querySelectorAll("[data-libro]").forEach(e=>{e.addEventListener("click",()=>router.navegar(`/estudio/libro/${e.dataset.libro}`))}),window.animaciones&&(window.animaciones.animarHijos(t.querySelector("#listaAT"),".tarjeta-libro","anim-tarjeta",35),window.animaciones.animarHijos(t.querySelector("#listaNT"),".tarjeta-libro","anim-tarjeta",35));const L=localStorage.getItem("fb_collapse_at")!=="false",k=localStorage.getItem("fb_collapse_nt")!=="false",v=t.querySelector("#listaAT"),g=t.querySelector("#listaNT");L||(v.style.display="none",t.querySelector("#toggleAT").setAttribute("aria-expanded","false")),k||(g.style.display="none",t.querySelector("#toggleNT").setAttribute("aria-expanded","false"));const f=(e,o,a)=>{const i=o.style.display==="none";o.style.display=i?"":"none",e.setAttribute("aria-expanded",String(i)),localStorage.setItem(a,String(i))},u=t.querySelector("#toggleAT"),p=t.querySelector("#toggleNT");u.onclick=()=>f(u,v,"fb_collapse_at"),p.onclick=()=>f(p,g,"fb_collapse_nt");const S=(e,o,a)=>i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),f(e,o,a))};u.addEventListener("keydown",S(u,v,"fb_collapse_at")),p.addEventListener("keydown",S(p,g,"fb_collapse_nt"));const q={estudio:["Estudio Guiado","Aqu\xED navegas por todos los libros de la Biblia. Cada libro contiene cap\xEDtulos; al seleccionar uno accedes al plan de lectura con preguntas de comprensi\xF3n. El progreso se guarda autom\xE1ticamente.",'Ej: Selecciona "G\xE9nesis" \u2192 "Cap\xEDtulo 1" para comenzar a leer y responder preguntas.']};window.helpers.registrarGuias(t,q)}catch(b){t.innerHTML=`<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${b.message}</p></div>`}},desmontar(){}}})();
