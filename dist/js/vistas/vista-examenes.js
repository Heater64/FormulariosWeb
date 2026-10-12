(function(){"use strict";const v=["admin","editor","owner"],_={borrador:{texto:"Borrador",clase:"adm-badge--borrador"},publicado:{texto:"Publicado",clase:"adm-badge--publicado"},cerrado:{texto:"Cerrado",clase:"adm-badge--cerrado"}},i=a=>window.panelUI.esc(a);window.vistaExamenes={_examenes:[],_filtro:"todos",_busqueda:"",_timer:null,async montar(a){const r=store.obtener("usuario");if(!r||!v.includes((r.rol||"").toLowerCase())){a.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}a.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render("clipboard-list")}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Mis ex\xE1menes</h1>
            <p class="adm-cabecera__sub">Crea un examen, gen\xE9rale un enlace a cada alumno y corrige las respuestas escritas.</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn adm-btn--principal" id="btnNuevo">${window.Iconos.render("plus")} Nuevo examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`,a.querySelector("#btnNuevo").addEventListener("click",()=>router.navegar("/editor/nuevo"));const e=a.querySelector("#contenido");e.innerHTML='<p class="adm-cabecera__sub">Cargando\u2026</p>';try{const o=await window.plataformaRepository.resumen();this._examenes=o&&o.examenes||[]}catch(o){e.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar los ex\xE1menes: ${i(o.message)}</div>`;return}e.innerHTML=`
        <div class="adm-tabs" id="tabs" role="tablist">
          ${[["todos","Todos"],["borrador","Borradores"],["publicado","Publicados"],["cerrado","Cerrados"]].map(([o,n])=>`<button class="adm-tab${this._filtro===o?" adm-tab--activo":""}" data-filtro="${o}" role="tab" aria-selected="${this._filtro===o}">${n}</button>`).join("")}
        </div>
        <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por t\xEDtulo\u2026" value="${i(this._busqueda)}" aria-label="Buscar ex\xE1menes">
        <div id="lista" class="adm-lista"></div>`,e.querySelectorAll("#tabs .adm-tab").forEach(o=>{o.addEventListener("click",()=>{this._filtro=o.dataset.filtro,e.querySelectorAll("#tabs .adm-tab").forEach(n=>{n.classList.toggle("adm-tab--activo",n===o),n.setAttribute("aria-selected",String(n===o))}),this._pintarLista()})});const t=e.querySelector("#buscar");t.addEventListener("input",()=>{clearTimeout(this._timer),this._timer=setTimeout(()=>{this._busqueda=t.value.trim().toLowerCase(),this._pintarLista()},180)}),this._pintarLista()},desmontar(){clearTimeout(this._timer),this._timer=null},_pintarLista(){const a=document.querySelector("#lista");if(!a)return;const r=this._examenes.filter(e=>!(this._filtro!=="todos"&&e.estado!==this._filtro||this._busqueda&&!String(e.titulo||"").toLowerCase().includes(this._busqueda)));if(!r.length){a.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">${this._examenes.length?"Sin resultados":"Todav\xEDa no hay ex\xE1menes"}</p>
          <p>${this._examenes.length?"Prueba otro filtro o borra la b\xFAsqueda.":"Crea tu primer examen para empezar."}</p>
        </div>`;return}a.innerHTML=r.map(e=>this._tarjeta(e)).join(""),a.querySelectorAll("[data-accion]").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest("details");t&&(t.open=!1),this._accion(e.dataset.accion,e.dataset.id,e.dataset.titulo)})}),window.Iconos&&window.Iconos.actualizar()},_tarjeta(a){const r=_[a.estado]||_.borrador,e=Number(a.por_corregir)||0,t=Number(a.num_enlaces)||0,o=Number(a.enlaces_usados)||0,n=[(Number(a.num_preguntas)||0)+" preguntas",(Number(a.puntos_totales)||0)+" puntos",t+" compartidos \xB7 "+o+" usados",(Number(a.num_entregas)||0)+" entregas"];a.nota_media!=null&&n.push("media "+window.panelUI.numero(a.nota_media));const s=i(a.titulo),d=a.estado==="publicado"?`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="cerrar" data-id="${i(a.id)}">${window.Iconos.render("lock")} Cerrar examen</button>`:a.estado==="cerrado"?`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${i(a.id)}">${window.Iconos.render("unlock")} Reabrir examen</button>`:`<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${i(a.id)}">${window.Iconos.render("upload")} Publicar</button>`;return`<article class="adm-fila adm-examen" aria-label="${s}">
        <div class="adm-fila__principal adm-examen__principal">
          <div class="adm-fila__titulo adm-examen__titulo">
            <h2>${s}</h2>
            <span class="adm-badge ${r.clase}">${r.texto}</span>
            ${e>0?`<span class="adm-badge adm-badge--aviso">${e} por corregir</span>`:""}
          </div>
          <div class="adm-fila__meta adm-examen__meta">
            ${n.map(c=>`<span>${i(c)}</span>`).join("")}
            <span>Actualizado ${i(window.panelUI.tiempoRelativo(a.actualizado_en||a.creado_en))}</span>
          </div>
        </div>
        <div class="adm-fila__acciones adm-examen__acciones" aria-label="Acciones de ${s}">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-accion="compartir" data-id="${i(a.id)}" data-titulo="${s}">${window.Iconos.render("link")} Gestionar enlaces</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="editar" data-id="${i(a.id)}">${window.Iconos.render("edit-3")} Editar</button>
          </div>
          <details class="adm-examen__mas">
            <summary class="adm-btn adm-btn--pequeno" aria-label="M\xE1s opciones para ${s}">${window.Iconos.render("more-horizontal")} M\xE1s opciones ${window.Iconos.render("chevron-down")}</summary>
            <div class="adm-examen__menu" aria-label="Acciones adicionales">
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="entregas" data-id="${i(a.id)}">${window.Iconos.render("inbox")} Entregas${e>0?` \xB7 ${e} por corregir`:""}</button>
              ${d}
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="duplicar" data-id="${i(a.id)}" data-titulo="${s}">${window.Iconos.render("copy")} Duplicar como borrador</button>
              <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-accion="eliminar" data-id="${i(a.id)}" data-titulo="${s}">${window.Iconos.render("trash-2")} Eliminar examen</button>
            </div>
          </details>
        </div>
      </article>`},async _accion(a,r,e){if(a==="editar"){router.navegar("/editor/"+r);return}if(a==="entregas"){router.navegar("/corregir/"+r);return}if(a==="compartir"){await this._modalEnlaceComunitario(r,e);return}if(a==="compartir-individual"){await this._modalEnlaces(r,e);return}if(a==="publicar"){const t=this._examenes.find(d=>String(d.id)===String(r)),o=t&&t.estado==="cerrado";if(!await window.helpers.confirmar(o?"El examen volver\xE1 a admitir entregas. Las respuestas y calificaciones anteriores se conservar\xE1n.":"Se generar\xE1 un enlace para toda la clase: cada alumno lo abre, escribe su nombre y responde.",{titulo:o?"\xBFReabrir este examen?":"\xBFPublicar este examen?",textoConfirmar:o?"Reabrir":"Publicar"}))return;await this._ejecutar(()=>window.plataformaRepository.cambiarEstado(r,"publicado"),o?"Examen reabierto.":"Examen publicado.")&&!o&&this._modalEnlaceComunitario(r,e);return}if(a==="cerrar"){if(!await window.helpers.confirmar("Los alumnos ya no podr\xE1n entregar el examen. Las entregas recibidas se conservan.",{titulo:"\xBFCerrar este examen?",textoConfirmar:"Cerrar examen"}))return;await this._ejecutar(()=>window.plataformaRepository.cambiarEstado(r,"cerrado"),"Examen cerrado.");return}if(a==="duplicar"){if(!await window.helpers.confirmar(`Se crear\xE1 una copia de \xAB${e}\xBB como borrador. No se copian los enlaces ni las entregas.`,{titulo:"\xBFDuplicar examen?",textoConfirmar:"Duplicar"}))return;await this._ejecutar(async()=>{const o=await window.examenesRepository.obtener(r);if(!o)throw new Error("No se pudo cargar el examen original.");const n={grupo_id:o.grupo_id,creado_por:o.creado_por,titulo:"Copia de "+(o.titulo||"examen"),descripcion:o.descripcion||"",preguntas:o.preguntas||[],puntos_totales:o.puntos_totales||0,estado:"borrador",publicado:!1,config:o.config||{}};await window.examenesRepository.guardar(n)},"Examen duplicado como borrador.");return}if(a==="eliminar"){if(!await window.helpers.confirmar(`Se eliminar\xE1 \xAB${e}\xBB, sus enlaces y todas sus entregas. Esta acci\xF3n no se puede deshacer.`,{titulo:"\xBFEliminar examen?",textoConfirmar:"Eliminar"}))return;await this._ejecutar(()=>window.examenesRepository.eliminar(r),"Examen eliminado.")}},async _ejecutar(a,r){try{return await a(),window.helpers.mostrarAlerta(r,"exito"),router._ejecutar(),!0}catch(e){return window.helpers.mostrarAlerta("Error: "+e.message,"error"),!1}},async _modalEnlaceComunitario(a,r){const e=window.panelUI.modal({titulo:"Enlace para toda la clase",cuerpoHtml:`<p class="adm-cabecera__sub adm-modal__info">Un solo enlace para la clase: cada alumno se identifica con su nombre, responde el examen y, despu\xE9s de entregado, puede revisar su propio examen en este mismo enlace. Para ver su nota tendr\xE1 que escribir exactamente el mismo nombre con el que respondi\xF3.</p>
          <div class="adm-edicion" id="enlaceComunitario">
            <p class="adm-cabecera__sub">
              <span class="adm-edicion__clave">Enlace de la clase</span> <code id="claveComunitario"></code>
            </p>
            <div class="adm-edicion__acciones">
              <button class="adm-btn adm-btn--principal adm-btn--pequeno" id="btnCopiarComunitario" type="button">Copiar enlace</button>
              <button class="adm-btn adm-btn--primario adm-btn--pequeno" id="btnWhatsAppComunitario" type="button">Compartir en WhatsApp</button>
              <button class="adm-btn adm-btn--peligro adm-btn--pequeno" id="btnVaciarComunitario" type="button">Limpiar campos</button>
            </div>
            <p class="adm-cabecera__sub adm-edicion__nota" id="textoComunitario">
              No hay enlace de la clase creado todav\xEDa. El bot\xF3n de abajo genera un enlace para toda la clase.
            </p>
            <div class="adm-edicion__acciones">
              <button class="adm-btn adm-btn--principal adm-btn--pequeno" id="btnCrearEnlaceComunitario" type="button">Generar enlace de la clase</button>
            </div>
          </div>
          <div id="errorComunitario" class="adm-aviso adm-aviso--error" hidden></div>
          <div class="adm-seccion__cabecera">
            <span class="adm-seccion__titulo">Enlaces individuales existentes</span>
          </div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces\u2026</p></div>`,pieHtml:`<button class="adm-btn" id="btnIndividuales" type="button">Enlaces individuales\u2026</button>
          <button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>`});e.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",e.cerrar);const t=e.cuerpo.querySelector("#errorComunitario"),o=e.cuerpo.querySelector("#claveComunitario"),n={copiar:e.cuerpo.querySelector("#btnCopiarComunitario"),whatsapp:e.cuerpo.querySelector("#btnWhatsAppComunitario"),vaciar:e.cuerpo.querySelector("#btnVaciarComunitario")},s=(l,u,w)=>{const m=e.cuerpo.querySelector(l);if(!(!m||m.children.length)){if(w==="aviso"){const b=el("div","aviso "+(w.includes("error")?"aviso--error":"aviso--ok"),u);e.cuerpo.querySelector("#textoComunitario").insertAdjacentElement("afterend",b);return}m.textContent=u,u?m.dataset.estado=w==="error"?"error":"ok":delete m.dataset.estado}},d=l=>{o.textContent=l?window.plataformaRepository.urlEnlace(l):"Generar enlace de la clase\u2026",l?(n.copiar.disabled=!1,n.whatsapp.disabled=!1,n.vaciar.disabled=!1,s("#textoComunitario","Copia el enlace y p\xE1salo a toda la clase. Que cada alumno lo abra en su tel\xE9fono, escriba su nombre y responder\xE1. Despu\xE9s de entregar, en el mismo enlace puede revisar su examen; para ver la nota tendr\xE1 que repetir exactamente el mismo nombre.","exito")):(n.copiar.disabled=!0,n.whatsapp.disabled=!0,n.vaciar.disabled=!0,s("#textoComunitario","No hay enlace de la clase creado todav\xEDa. El bot\xF3n de abajo genera un enlace para toda la clase.","error"))},c=async()=>{const l=e.cuerpo.querySelector("#listaEnlaces");try{const u=await window.plataformaRepository.listarEnlaces(a),w=u.find(b=>b.comunitario);d(w?w.token:null);const m=u.filter(b=>!b.comunitario);m.length?l.innerHTML=this._htmlEnlaces(m,r):l.innerHTML='<p class="adm-cabecera__sub">Sin enlaces individuales a\xFAn.</p>',l.querySelectorAll("[data-enlace-accion]").forEach(b=>{b.addEventListener("click",()=>this._accionEnlace(b,m,a,r,c))})}catch(u){t.textContent=u.message,t.hidden=!1,l.innerHTML=`<div class="adm-aviso adm-aviso--error">${i(u.message)}</div>`}};n.copiar.addEventListener("click",async()=>{if(!o.textContent.includes("/e/")){t.textContent="Primero genera el enlace de la clase.",t.hidden=!1;return}await window.plataformaRepository.copiar(o.textContent)?window.helpers.mostrarAlerta("Enlace copiado al portapapeles.","exito"):window.helpers.mostrarAlerta("No se pudo copiar. Selecciona la URL manualmente.","error")}),n.whatsapp.addEventListener("click",async()=>{if(!o.textContent.includes("/e/")){t.textContent="Primero genera el enlace de la clase.",t.hidden=!1;return}const l="Hola, este es el enlace de la clase para "+r+`:
`+o.textContent;await window.plataformaRepository.abrirWhatsApp(l)}),n.vaciar.addEventListener("click",()=>{o.textContent="",n.copiar.disabled=!0,n.whatsapp.disabled=!0,n.vaciar.disabled=!0,t.hidden=!0,s("#textoComunitario","","error")});const p=async()=>{t.hidden=!0,d(null);try{const l=await window.plataformaRepository.crearEnlaceComunitario(a);d(l.token),window.helpers.mostrarAlerta("Enlace de la clase creado.","exito"),await c()}catch(l){t.textContent=l.message,t.hidden=!1}};e.cuerpo.querySelector("#btnCrearEnlaceComunitario").addEventListener("click",p),e.pie.querySelector("#btnIndividuales").addEventListener("click",()=>{e.cerrar(),this._modalEnlaces(a,r)}),await c()},async _modalEnlaces(a,r){const e=window.panelUI.modal({titulo:"Enlaces de \xAB"+r+"\xBB",cuerpoHtml:`<p class="adm-cabecera__sub adm-modal__info">Cada enlace es individual y de un solo uso.</p>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="listaAlumnos">A\xF1adir alumnos</label>
            <textarea class="adm-entrada" id="listaAlumnos" placeholder="Un alumno por l\xEDnea&#10;Ana P\xE9rez&#10;Luis G\xF3mez, 3\xBA B"></textarea>
            <p class="adm-campo__ayuda">Puedes escribir \xABNombre, Grupo\xBB. El grupo es opcional.</p>
          </div>
          <div id="errorEnlaces" class="adm-aviso adm-aviso--error" hidden></div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces\u2026</p></div>`,pieHtml:`<button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>
          <button class="adm-btn adm-btn--principal" id="btnGenerar" type="button">Generar enlaces</button>`});e.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",e.cerrar);const t=e.cuerpo.querySelector("#errorEnlaces"),o=e.pie.querySelector("#btnGenerar"),n=async()=>{const s=e.cuerpo.querySelector("#listaEnlaces");try{const c=(await window.plataformaRepository.listarEnlaces(a)).filter(p=>!p.comunitario);s.innerHTML=this._htmlEnlaces(c,r),s.querySelectorAll("[data-enlace-accion]").forEach(p=>{p.addEventListener("click",()=>this._accionEnlace(p,c,a,r,n))})}catch(d){s.innerHTML=`<div class="adm-aviso adm-aviso--error">${i(d.message)}</div>`}};o.addEventListener("click",async()=>{const s=e.cuerpo.querySelector("#listaAlumnos"),d=s.value.split(`
`).map(c=>c.trim()).filter(Boolean).map(c=>{const[p,...l]=c.split(",");return{nombre:p.trim(),grupo:l.join(",").trim()}}).filter(c=>c.nombre);if(t.hidden=!0,!d.length){t.textContent="Escribe al menos un nombre (uno por l\xEDnea).",t.hidden=!1;return}o.disabled=!0,o.textContent="Generando\u2026";try{await window.plataformaRepository.crearEnlaces(a,d),s.value="",await n(),window.helpers.mostrarAlerta(d.length+" enlace(s) generado(s).","exito")}catch(c){t.textContent=c.message,t.hidden=!1}finally{o.disabled=!1,o.textContent="Generar enlaces"}}),await n()},_htmlEnlaces(a,r){if(!a||!a.length)return`<div class="adm-vacio"><p class="adm-vacio__titulo">Sin enlaces todav\xEDa</p>
          <p>Escribe los nombres arriba y pulsa \xABGenerar enlaces\xBB.</p></div>`;const e=a.filter(t=>t.usado).length;return`<div class="adm-seccion__conteo">${a.length} enlace(s) \xB7 ${e} usado(s)</div>
        <div class="adm-bloque" style="margin-bottom:0">
          ${a.map(t=>`
            <div class="adm-enlace">
              <span class="adm-enlace__nombre">${i(t.nombre_alumno)}
                ${t.grupo_alumno?`<span class="adm-enlace__grupo">\xB7 ${i(t.grupo_alumno)}</span>`:""}
                ${t.usado?'<span class="adm-badge adm-badge--exito">Entregado</span>':'<span class="adm-badge adm-badge--borrador">Pendiente</span>'}
              </span>
              <span class="adm-enlace__url" title="${i(window.plataformaRepository.urlEnlace(t.token))}">${i(window.plataformaRepository.urlEnlace(t.token))}</span>
              <span class="adm-enlace__acciones">
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="copiar" data-token="${i(t.token)}">Copiar</button>
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="whatsapp" data-token="${i(t.token)}" data-nombre="${i(t.nombre_alumno)}">WhatsApp</button>
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-enlace-accion="borrar" data-id="${i(t.id)}">Borrar</button>
              </span>
            </div>`).join("")}
        </div>`},async _accionEnlace(a,r,e,t,o){const n=a.dataset.enlaceAccion,s=r.find(d=>d.token===a.dataset.token||d.id===a.dataset.id);if(n==="copiar"){const d=window.plataformaRepository.urlEnlace(a.dataset.token),c=await window.plataformaRepository.copiar(d);window.helpers.mostrarAlerta(c?"Enlace copiado.":"No se pudo copiar. Selecciona la URL manualmente.",c?"exito":"error");return}if(n==="whatsapp"&&s){window.plataformaRepository.abrirWhatsApp(window.plataformaRepository.mensajeWhatsApp(s,t));return}if(n==="borrar"){if(!await window.helpers.confirmar("Se eliminar\xE1 este enlace. Si ya tiene una entrega, el servidor lo impedir\xE1.",{titulo:"\xBFBorrar enlace?",textoConfirmar:"Borrar"}))return;try{await window.plataformaRepository.eliminarEnlace(a.dataset.id),await o(),window.helpers.mostrarAlerta("Enlace eliminado.","exito")}catch(c){window.helpers.mostrarAlerta(c.message,"error")}}}}})();
