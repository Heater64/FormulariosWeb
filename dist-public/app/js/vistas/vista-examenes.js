(function(){"use strict";const u=["admin","editor","owner"],l={borrador:{texto:"Borrador",clase:"adm-badge--borrador"},publicado:{texto:"Publicado",clase:"adm-badge--publicado"},cerrado:{texto:"Cerrado",clase:"adm-badge--cerrado"}},n=a=>window.panelUI.esc(a);window.vistaExamenes={_examenes:[],_filtro:"todos",_busqueda:"",_timer:null,async montar(a){const o=store.obtener("usuario");if(!o||!u.includes((o.rol||"").toLowerCase())){a.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}a.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Mis ex\xE1menes</h1>
            <p class="adm-cabecera__sub">Crea un examen, gen\xE9rale un enlace a cada alumno y corrige las respuestas escritas.</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn adm-btn--principal" id="btnNuevo">Nuevo examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`,a.querySelector("#btnNuevo").addEventListener("click",()=>router.navegar("/editor/nuevo"));const e=a.querySelector("#contenido");e.innerHTML='<p class="adm-cabecera__sub">Cargando\u2026</p>';try{const t=await window.plataformaRepository.resumen();this._examenes=t&&t.examenes||[]}catch(t){e.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar los ex\xE1menes: ${n(t.message)}</div>`;return}e.innerHTML=`
        <div class="adm-tabs" id="tabs" role="tablist">
          ${[["todos","Todos"],["borrador","Borradores"],["publicado","Publicados"],["cerrado","Cerrados"]].map(([t,s])=>`<button class="adm-tab${this._filtro===t?" adm-tab--activo":""}" data-filtro="${t}" role="tab" aria-selected="${this._filtro===t}">${s}</button>`).join("")}
        </div>
        <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por t\xEDtulo\u2026" value="${n(this._busqueda)}" aria-label="Buscar ex\xE1menes">
        <div id="lista" class="adm-lista"></div>`,e.querySelectorAll("#tabs .adm-tab").forEach(t=>{t.addEventListener("click",()=>{this._filtro=t.dataset.filtro,e.querySelectorAll("#tabs .adm-tab").forEach(s=>{s.classList.toggle("adm-tab--activo",s===t),s.setAttribute("aria-selected",String(s===t))}),this._pintarLista()})});const r=e.querySelector("#buscar");r.addEventListener("input",()=>{clearTimeout(this._timer),this._timer=setTimeout(()=>{this._busqueda=r.value.trim().toLowerCase(),this._pintarLista()},180)}),this._pintarLista()},desmontar(){clearTimeout(this._timer),this._timer=null},_pintarLista(){const a=document.querySelector("#lista");if(!a)return;const o=this._examenes.filter(e=>!(this._filtro!=="todos"&&e.estado!==this._filtro||this._busqueda&&!String(e.titulo||"").toLowerCase().includes(this._busqueda)));if(!o.length){a.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">${this._examenes.length?"Sin resultados":"Todav\xEDa no hay ex\xE1menes"}</p>
          <p>${this._examenes.length?"Prueba otro filtro o borra la b\xFAsqueda.":"Crea tu primer examen para empezar."}</p>
        </div>`;return}a.innerHTML=o.map(e=>this._tarjeta(e)).join(""),a.querySelectorAll("[data-accion]").forEach(e=>{e.addEventListener("click",()=>{const r=e.closest("details");r&&(r.open=!1),this._accion(e.dataset.accion,e.dataset.id,e.dataset.titulo)})})},_tarjeta(a){const o=l[a.estado]||l.borrador,e=Number(a.por_corregir)||0,r=Number(a.num_enlaces)||0,t=Number(a.enlaces_usados)||0,s=[(Number(a.num_preguntas)||0)+" preguntas",(Number(a.puntos_totales)||0)+" puntos",r+" compartidos \xB7 "+t+" usados",(Number(a.num_entregas)||0)+" entregas"];a.nota_media!=null&&s.push("media "+window.panelUI.numero(a.nota_media));const i=n(a.titulo),d=a.estado==="publicado"?`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="cerrar" data-id="${n(a.id)}">Cerrar examen</button>`:a.estado==="cerrado"?`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${n(a.id)}">Reabrir examen</button>`:`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${n(a.id)}">Publicar</button>`;return`<article class="adm-fila adm-examen" aria-label="${i}">
        <div class="adm-fila__principal adm-examen__principal">
          <div class="adm-fila__titulo adm-examen__titulo">
            <h2>${i}</h2>
            <span class="adm-badge ${o.clase}">${o.texto}</span>
            ${e>0?`<span class="adm-badge adm-badge--aviso">${e} por corregir</span>`:""}
          </div>
          <div class="adm-fila__meta adm-examen__meta">
            ${s.map(c=>`<span>${n(c)}</span>`).join("")}
            <span>Actualizado ${n(window.panelUI.tiempoRelativo(a.actualizado_en||a.creado_en))}</span>
          </div>
        </div>
        <div class="adm-fila__acciones adm-examen__acciones" aria-label="Acciones de ${i}">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-accion="compartir" data-id="${n(a.id)}" data-titulo="${i}">Gestionar enlaces</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="editar" data-id="${n(a.id)}">Editar</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="entregas" data-id="${n(a.id)}">Entregas${e>0?` \xB7 ${e} por corregir`:""}</button>
            ${d}
          </div>
          <details class="adm-examen__mas">
            <summary class="adm-btn adm-btn--pequeno" aria-label="M\xE1s opciones para ${i}">M\xE1s opciones <span aria-hidden="true">\u25BE</span></summary>
            <div class="adm-examen__menu" aria-label="Acciones adicionales">
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="duplicar" data-id="${n(a.id)}" data-titulo="${i}">Duplicar como borrador</button>
              <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-accion="eliminar" data-id="${n(a.id)}" data-titulo="${i}">Eliminar examen</button>
            </div>
          </details>
        </div>
      </article>`},async _accion(a,o,e){if(a==="editar"){router.navegar("/editor/"+o);return}if(a==="entregas"){router.navegar("/corregir/"+o);return}if(a==="compartir"||a==="compartir-individual"){await this._modalEnlaces(o,e);return}if(a==="publicar"){const r=this._examenes.find(d=>String(d.id)===String(o)),t=r&&r.estado==="cerrado";if(!await window.helpers.confirmar(t?"El examen volver\xE1 a admitir entregas. Las respuestas y calificaciones anteriores se conservar\xE1n.":"Podr\xE1s enviar enlaces individuales y los alumnos podr\xE1n responder.",{titulo:t?"\xBFReabrir este examen?":"\xBFPublicar este examen?",textoConfirmar:t?"Reabrir":"Publicar"}))return;await this._ejecutar(()=>window.plataformaRepository.cambiarEstado(o,"publicado"),t?"Examen reabierto.":"Examen publicado.")&&!t&&this._modalEnlaces(o,e);return}if(a==="cerrar"){if(!await window.helpers.confirmar("Los alumnos ya no podr\xE1n entregar el examen. Las entregas recibidas se conservan.",{titulo:"\xBFCerrar este examen?",textoConfirmar:"Cerrar examen"}))return;await this._ejecutar(()=>window.plataformaRepository.cambiarEstado(o,"cerrado"),"Examen cerrado.");return}if(a==="duplicar"){if(!await window.helpers.confirmar(`Se crear\xE1 una copia de \xAB${e}\xBB como borrador. No se copian los enlaces ni las entregas.`,{titulo:"\xBFDuplicar examen?",textoConfirmar:"Duplicar"}))return;await this._ejecutar(async()=>{const t=await window.examenesRepository.obtener(o);if(!t)throw new Error("No se pudo cargar el examen original.");const s={grupo_id:t.grupo_id,creado_por:t.creado_por,titulo:"Copia de "+(t.titulo||"examen"),descripcion:t.descripcion||"",preguntas:t.preguntas||[],puntos_totales:t.puntos_totales||0,estado:"borrador",publicado:!1,config:t.config||{}};await window.examenesRepository.guardar(s)},"Examen duplicado como borrador.");return}if(a==="eliminar"){if(!await window.helpers.confirmar(`Se eliminar\xE1 \xAB${e}\xBB, sus enlaces y todas sus entregas. Esta acci\xF3n no se puede deshacer.`,{titulo:"\xBFEliminar examen?",textoConfirmar:"Eliminar"}))return;await this._ejecutar(()=>window.examenesRepository.eliminar(o),"Examen eliminado.")}},async _ejecutar(a,o){try{return await a(),window.helpers.mostrarAlerta(o,"exito"),router._ejecutar(),!0}catch(e){return window.helpers.mostrarAlerta("Error: "+e.message,"error"),!1}},async _modalEnlaces(a,o){const e=window.panelUI.modal({titulo:"Enlaces de \xAB"+o+"\xBB",cuerpoHtml:`<p class="adm-cabecera__sub">Cada enlace es individual y de un solo uso.</p>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="listaAlumnos">A\xF1adir alumnos</label>
            <textarea class="adm-entrada" id="listaAlumnos" placeholder="Un alumno por l\xEDnea&#10;Ana P\xE9rez&#10;Luis G\xF3mez, 3\xBA B"></textarea>
            <p class="adm-campo__ayuda">Puedes escribir \xABNombre, Grupo\xBB. El grupo es opcional.</p>
          </div>
          <div id="errorEnlaces" class="adm-aviso adm-aviso--error" hidden></div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces\u2026</p></div>`,pieHtml:`<button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>
          <button class="adm-btn adm-btn--principal" id="btnGenerar" type="button">Generar enlaces</button>`});e.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",e.cerrar);const r=e.cuerpo.querySelector("#errorEnlaces"),t=e.pie.querySelector("#btnGenerar"),s=async()=>{const i=e.cuerpo.querySelector("#listaEnlaces");try{const d=await window.plataformaRepository.listarEnlaces(a);i.innerHTML=this._htmlEnlaces(d,o),i.querySelectorAll("[data-enlace-accion]").forEach(c=>{c.addEventListener("click",()=>this._accionEnlace(c,d,a,o,s))})}catch(d){i.innerHTML=`<div class="adm-aviso adm-aviso--error">${n(d.message)}</div>`}};t.addEventListener("click",async()=>{const i=e.cuerpo.querySelector("#listaAlumnos"),d=i.value.split(`
`).map(c=>c.trim()).filter(Boolean).map(c=>{const[m,...p]=c.split(",");return{nombre:m.trim(),grupo:p.join(",").trim()}}).filter(c=>c.nombre);if(r.hidden=!0,!d.length){r.textContent="Escribe al menos un nombre (uno por l\xEDnea).",r.hidden=!1;return}t.disabled=!0,t.textContent="Generando\u2026";try{await window.plataformaRepository.crearEnlaces(a,d),i.value="",await s(),window.helpers.mostrarAlerta(d.length+" enlace(s) generado(s).","exito")}catch(c){r.textContent=c.message,r.hidden=!1}finally{t.disabled=!1,t.textContent="Generar enlaces"}}),await s()},_htmlEnlaces(a,o){if(!a||!a.length)return`<div class="adm-vacio"><p class="adm-vacio__titulo">Sin enlaces todav\xEDa</p>
          <p>Escribe los nombres arriba y pulsa \xABGenerar enlaces\xBB.</p></div>`;const e=a.filter(r=>r.usado).length;return`<div class="adm-seccion__titulo">${a.length} enlace(s) \xB7 ${e} usado(s)</div>
        <div class="adm-bloque" style="margin-bottom:0">
          ${a.map(r=>`
            <div class="adm-enlace">
              <span class="adm-enlace__nombre">${n(r.nombre_alumno)}
                ${r.grupo_alumno?`<span class="adm-enlace__grupo">\xB7 ${n(r.grupo_alumno)}</span>`:""}
                ${r.usado?'<span class="adm-badge adm-badge--exito">Entregado</span>':'<span class="adm-badge adm-badge--borrador">Pendiente</span>'}
              </span>
              <span class="adm-enlace__url" title="${n(window.plataformaRepository.urlEnlace(r.token))}">${n(window.plataformaRepository.urlEnlace(r.token))}</span>
              <span class="adm-enlace__acciones">
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="copiar" data-token="${n(r.token)}">Copiar</button>
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="whatsapp" data-token="${n(r.token)}" data-nombre="${n(r.nombre_alumno)}">WhatsApp</button>
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-enlace-accion="borrar" data-id="${n(r.id)}">Borrar</button>
              </span>
            </div>`).join("")}
        </div>`},async _accionEnlace(a,o,e,r,t){const s=a.dataset.enlaceAccion,i=o.find(d=>d.token===a.dataset.token||d.id===a.dataset.id);if(s==="copiar"){const d=window.plataformaRepository.urlEnlace(a.dataset.token),c=await window.plataformaRepository.copiar(d);window.helpers.mostrarAlerta(c?"Enlace copiado.":"No se pudo copiar. Selecciona la URL manualmente.",c?"exito":"error");return}if(s==="whatsapp"&&i){window.plataformaRepository.abrirWhatsApp(window.plataformaRepository.mensajeWhatsApp(i,r));return}if(s==="borrar"){if(!await window.helpers.confirmar("Se eliminar\xE1 este enlace. Si ya tiene una entrega, el servidor lo impedir\xE1.",{titulo:"\xBFBorrar enlace?",textoConfirmar:"Borrar"}))return;try{await window.plataformaRepository.eliminarEnlace(a.dataset.id),await t(),window.helpers.mostrarAlerta("Enlace eliminado.","exito")}catch(c){window.helpers.mostrarAlerta(c.message,"error")}}}}})();
