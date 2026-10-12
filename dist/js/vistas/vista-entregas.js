(function(){"use strict";const b=["admin","editor","owner"],i=r=>window.panelUI.esc(r);function v(){const r=store.obtener("usuario");return r&&b.includes((r.rol||"").toLowerCase())}function g(r){return r.corregido?'<span class="adm-badge adm-badge--exito">Calificada</span>':r.estado==="en_progreso"?'<span class="adm-badge adm-badge--borrador">Sin entregar</span>':Number(r.pendientes_correccion)>0?`<span class="adm-badge adm-badge--aviso">${Number(r.pendientes_correccion)} por corregir</span>`:'<span class="adm-badge adm-badge--publicado">Entregada</span>'}window.vistaEntregas={_examenId:null,_entregas:[],_examenTitulo:"",async montar(r,e){if(!v()){r.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}this._examenId=e&&e.id||null,this._examenTitulo="",this._examenId?await this._pintarExamen(r):await this._pintarListado(r)},async _pintarListado(r){r.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render("inbox")}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Entregas</h1>
            <p class="adm-cabecera__sub">Elige un examen para ver qui\xE9n ha respondido y corregir lo que falta.</p>
          </div>
        </header>
        <div id="contenido"><p class="adm-cabecera__sub">Cargando\u2026</p></div>
      </div>`;const e=r.querySelector("#contenido");let n=[];try{const t=await window.plataformaRepository.resumen();n=t&&t.examenes||[]}catch(t){e.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${i(t.message)}</div>`;return}const d=n.filter(t=>Number(t.num_entregas)>0);if(!d.length){e.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">Todav\xEDa no hay entregas</p>
          <p>Publica un examen y comparte los enlaces con tus alumnos.</p>
        </div>`;return}e.innerHTML=`<div class="adm-lista">${d.map(t=>{const c=Number(t.por_corregir)||0,o=[(Number(t.num_entregas)||0)+" entregas",(Number(t.enlaces_usados)||0)+" de "+(Number(t.num_enlaces)||0)+" enlaces usados"];return t.nota_media!=null&&o.push("media "+window.panelUI.numero(t.nota_media)),`<div class="adm-fila">
          <div class="adm-fila__principal">
            <div class="adm-fila__titulo">${i(t.titulo)}
              ${c>0?`<span class="adm-badge adm-badge--aviso">${c} por corregir</span>`:'<span class="adm-badge adm-badge--exito">Todo corregido</span>'}
            </div>
            <div class="adm-fila__meta">${o.map(s=>`<span>${i(s)}</span>`).join("")}</div>
          </div>
          <div class="adm-fila__acciones">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" data-ir="/corregir/${i(t.id)}">${window.Iconos.render("eye")} Ver entregas</button>
          </div>
        </div>`}).join("")}</div>`,e.querySelectorAll("[data-ir]").forEach(t=>{t.addEventListener("click",()=>router.navegar(t.dataset.ir))}),window.Iconos&&window.Iconos.actualizar()},async _pintarExamen(r){r.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render("clipboard-check")}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo" id="tituloExamen">Entregas</h1>
            <p class="adm-cabecera__sub" id="subExamen">Cargando\u2026</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn" id="btnVolver">${window.Iconos.render("arrow-left")} Volver</button>
            <button class="adm-btn" id="btnEditar">${window.Iconos.render("edit-3")} Editar examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`,r.querySelector("#btnVolver").addEventListener("click",()=>router.navegar("/entregas")),r.querySelector("#btnEditar").addEventListener("click",()=>router.navegar("/editor/"+this._examenId));const e=r.querySelector("#contenido");try{const[c,o]=await Promise.all([window.plataformaRepository.listarEntregas(this._examenId),window.plataformaRepository.resumen().catch(()=>null)]);this._entregas=c||[];const s=o&&(o.examenes||[]).find(a=>a.id===this._examenId);this._examenTitulo=s?s.titulo:"Examen"}catch(c){e.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${i(c.message)}</div>`;return}const n=this._entregas.filter(c=>!c.corregido&&c.estado==="completado").length,d=r.querySelector("#tituloExamen"),t=r.querySelector("#subExamen");!d||!t||!e.isConnected||(d.textContent=this._examenTitulo,t.textContent=this._entregas.length?`${this._entregas.length} entrega(s) \xB7 ${n} sin corregir`:"Sin entregas todav\xEDa",this._pintarEntregas(e))},_pintarEntregas(r){if(!this._entregas.length){r.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">Nadie ha entregado este examen</p>
          <p>Cuando un alumno use su enlace, aparecer\xE1 aqu\xED.</p>
        </div>`;return}r.innerHTML=`<div class="adm-lista">${this._entregas.map(e=>{const n=e.alumno_nombre||"Sin nombre",d=[];e.alumno_grupo&&d.push(e.alumno_grupo),e.fecha_completado?d.push("Entregado "+window.panelUI.tiempoRelativo(e.fecha_completado)):d.push("Empezado "+window.panelUI.tiempoRelativo(e.fecha_inicio)),e.corregido?d.push("Nota "+window.panelUI.numero(e.nota)+"/10"):e.puntuacion!=null&&d.push("Test "+window.panelUI.numero(e.puntuacion)+" %");const t=e.estado==="en_progreso"?"Sin entregar":e.corregido?"Revisar":"Corregir";return`<div class="adm-fila${e.estado==="en_progreso"?" adm-fila--inactiva":e.corregido?" adm-fila--exito":" adm-fila--aviso"}">
          <div class="adm-fila__principal">
            <div class="adm-fila__titulo">${i(n)} ${g(e)}</div>
            <div class="adm-fila__meta">${d.map(o=>`<span>${i(o)}</span>`).join("")}</div>
          </div>
          <div class="adm-fila__acciones">
            ${e.estado==="en_progreso"?'<span class="adm-cabecera__sub">A\xFAn no ha entregado</span>':`<button class="adm-btn adm-btn--principal adm-btn--pequeno" data-abrir="${i(e.intento_id)}">${window.Iconos.render(e.corregido?"eye":"clipboard-check")} ${t}</button>`}
          </div>
        </div>`}).join("")}</div>`,r.querySelectorAll("[data-abrir]").forEach(e=>{e.addEventListener("click",()=>this._abrirCorreccion(e.dataset.abrir))}),window.Iconos&&window.Iconos.actualizar()},async _abrirCorreccion(r){let e;try{e=await window.plataformaRepository.obtenerEntrega(r)}catch(o){window.helpers.mostrarAlerta("No se pudo abrir la entrega: "+o.message,"error");return}const n={};(e.preguntas||[]).forEach(o=>{if(!this._esTest(o.tipo))return;const s=e.respuestas||{};if(o.tipo==="completar"&&Array.isArray(o.huecos)&&o.huecos.length){const a=Array.isArray(s[o.id])?s[o.id]:[],l=window.puntuacionExamen._calcularHuecos(a,o.huecos),m=l.total>0?l.correctos/l.total:0;n[o.id]={es_correcta:m===1,puntos:Math.round(m*(Number(o.puntos)||0)*100)/100}}else{const a=window.puntuacionExamen.esCorrectaPregunta(s[o.id],o);n[o.id]={es_correcta:a,puntos:window.puntuacionExamen.evaluarPregunta(a,Number(o.puntos)||0)}}}),Object.keys(e.correccion||{}).forEach(o=>{n[o]=Object.assign({},e.correccion[o])});const d=window.panelUI.modal({titulo:(e.alumno_nombre||"Alumno")+(e.alumno_grupo?" \xB7 "+e.alumno_grupo:""),cuerpoHtml:this._htmlCorreccion(e,n),pieHtml:`<button class="adm-btn" type="button" data-rol="cerrar">Cerrar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarCorreccion">Guardar correcci\xF3n</button>`,ancho:"760px"});d.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",d.cerrar);const t=d.cuerpo;t.querySelectorAll("[data-decision]").forEach(o=>{o.addEventListener("click",()=>{const s=o.dataset.pregunta,a=o.dataset.decision==="correcta",l=e.preguntas.find(u=>u.id===s),m=Number(l.puntos)||0;n[s]=Object.assign({},n[s],{es_correcta:a,puntos:a?m:0});const p=t.querySelector(`[data-bloque="${s}"]`);if(p){p.classList.toggle("adm-respuesta--correcta",a),p.classList.toggle("adm-respuesta--incorrecta",!a),p.querySelectorAll("[data-decision]").forEach(_=>{_.classList.toggle("adm-btn--principal",_===o)});const u=p.querySelector("[data-puntos]");u&&(u.value=String(n[s].puntos))}this._actualizarResumen(t,e,n)})}),t.querySelectorAll("[data-puntos]").forEach(o=>{o.addEventListener("input",()=>{const s=o.dataset.puntos,a=Math.max(0,Number(o.value)||0);n[s]=Object.assign({},n[s],{puntos:a}),this._actualizarResumen(t,e,n)})}),t.querySelectorAll("[data-comentario]").forEach(o=>{o.addEventListener("input",()=>{const s=o.dataset.comentario;n[s]=Object.assign({},n[s],{comentario:o.value})})});const c=d.pie.querySelector("#btnGuardarCorreccion");c.addEventListener("click",async()=>{const o=e.preguntas.filter(a=>!this._esTest(a.tipo)&&!(n[a.id]&&n[a.id].es_correcta!=null)),s=t.querySelector("#errorCorreccion");if(o.length){s.textContent="Faltan "+o.length+" respuesta(s) escrita(s) por decidir.",s.hidden=!1;return}s.hidden=!0,c.disabled=!0,c.textContent="Guardando\u2026";try{const a=(t.querySelector("#observaciones")||{}).value||"";await window.plataformaRepository.corregirEntrega(r,n,a),d.cerrar(),window.helpers.mostrarAlerta("Correcci\xF3n guardada: la nota ya es definitiva.","exito");const l=document.querySelector("#app-root");l&&router.pathActual()==="/corregir/"+this._examenId&&await this._pintarExamen(l)}catch(a){s.textContent=a.message,s.hidden=!1,c.disabled=!1,c.textContent="Guardar correcci\xF3n"}}),this._actualizarResumen(t,e,n)},_esTest(r){return["multiple","opcion_unica","verdadero_falso","varias_opciones","completar","relacionar","ordenar"].includes(r)},_puntosAuto(r,e){if(!this._esTest(r.tipo))return 0;const n=e.respuestas||{};if(r.tipo==="completar"&&Array.isArray(r.huecos)&&r.huecos.length){const t=Array.isArray(n[r.id])?n[r.id]:[],c=window.puntuacionExamen._calcularHuecos(t,r.huecos),o=c.total>0?c.correctos/c.total:0;return Math.round(o*(Number(r.puntos)||0)*100)/100}const d=window.puntuacionExamen.esCorrectaPregunta(n[r.id],r);return window.puntuacionExamen.evaluarPregunta(d,Number(r.puntos)||0)},_actualizarResumen(r,e,n){const d=r.querySelector("#resumenNota");if(!d)return;const t=e.preguntas.reduce((s,a)=>s+(Number(a.puntos)||0),0);if(t<=0){d.textContent="";return}let c=0;e.preguntas.forEach(s=>{const a=n[s.id];this._esTest(s.tipo)?c+=this._puntosAuto(s,e):a&&a.es_correcta!=null&&(c+=Number(a.puntos)||0)});const o=e.preguntas.filter(s=>!this._esTest(s.tipo)&&!(n[s.id]&&n[s.id].es_correcta!=null)).length;d.textContent="Nota provisional: "+window.panelUI.numero(c/t*10)+" / 10"+(o?" \xB7 faltan "+o+" por decidir":" \xB7 lista para guardar"),d.classList.toggle("correccion-resumen--lista",o===0)},_formatearAuto(r,e){const n=Array.isArray(r.opciones)?r.opciones:[],d=a=>String.fromCharCode(65+a),t=a=>n[a]!=null?d(a)+". "+n[a]:String(a),c=a=>n[a]!=null?n[a]:String(a),o=(a,l)=>{if(Array.isArray(a)||a&&typeof a=="object")return a;try{return JSON.parse(a)}catch{return l}},s=a=>a==null||a===""||Array.isArray(a)&&!a.length||a&&typeof a=="object"&&!Object.keys(a).length;if(["multiple","opcion_unica","verdadero_falso"].includes(r.tipo)){const a=e==null||e===""?null:Number(e),l=Number(r.respuesta_correcta);return{alumno:a!=null&&n[a]!=null?t(a):"Sin responder",correcta:n[l]!=null?t(l):""}}if(r.tipo==="varias_opciones"){const a=o(e,[]),l=o(r.respuesta_correcta,[]);return{alumno:s(a)||!Array.isArray(a)?"Sin responder":a.length?a.map(t).join(" \xB7 "):"Sin responder",correcta:Array.isArray(l)?l.map(t).join(" \xB7 "):""}}if(r.tipo==="completar"){if(Array.isArray(r.huecos)&&r.huecos.length){const l=window.puntuacionExamen.detalleCompletar(e,r)||[];return{alumno:s(e)?"Sin responder":l.map((m,p)=>"Hueco "+(p+1)+": "+(m.respuestaUsuario||"\u2014")+(m.esCorrecta?" \u2713":" \u2717")).join(" \xB7 "),correcta:l.map(m=>m.respuestaCorrecta).join(" \xB7 ")}}const a=String(r.respuesta_correcta||"").split("|").map(l=>l.trim()).filter(Boolean);return{alumno:s(e)?"Sin responder":String(e),correcta:a.join(" o ")}}if(r.tipo==="relacionar"){const a=o(e,{})||{},l=Math.floor(n.length/2),m=(u,_)=>(n[u]||u)+" \u2192 "+(n[l+_]!=null?n[l+_]:_),p=typeof a=="object"&&!Array.isArray(a)?Object.keys(a).filter(u=>Number.isInteger(Number(a[u]))&&Number(a[u])>=0&&Number(a[u])<l):[];return{alumno:p.length?p.map(u=>m(u,Number(a[u]))).join(" \xB7 "):"Sin responder",correcta:Array.from({length:l},(u,_)=>m(_,_)).join(" \xB7 ")}}if(r.tipo==="ordenar"){const a=o(e,[]);return{alumno:s(a)||!Array.isArray(a)?"Sin responder":a.map(c).join(" \u2192 "),correcta:n.join(" \u2192 ")}}return{alumno:e==null||e===""?"Sin responder":String(e),correcta:""}},_htmlComentarioPregunta(r,e){const n=e[r.id]||{};return`<div class="adm-respuesta__comentario">
        <label class="adm-campo__etiqueta" for="comentario_${i(r.id)}">Comentario para esta pregunta (opcional)</label>
        <input class="adm-entrada" id="comentario_${i(r.id)}" type="text" maxlength="500"
          data-comentario="${i(r.id)}" value="${i(n.comentario||"")}"
          placeholder="Ej.: Buen razonamiento; repasa el vers\xEDculo">
      </div>`},_htmlCorreccion(r,e){const n=r.preguntas.map((t,c)=>{const o=r.respuestas?r.respuestas[t.id]:void 0;if(this._esTest(t.tipo)){const p=window.puntuacionExamen.esCorrectaPregunta(o,t),u=this._formatearAuto(t,o),_=this._puntosAuto(t,r);return`<div class="adm-respuesta ${p?"adm-respuesta--correcta":"adm-respuesta--incorrecta"}" data-bloque="${i(t.id)}">
            <div class="adm-respuesta__letra">Pregunta ${c+1} \xB7 autom\xE1tica \xB7 ${i(window.panelUI.numero(_))} de ${i(window.panelUI.numero(t.puntos))} pt</div>
            <p class="adm-respuesta__enunciado">${i(t.texto)}</p>
            <div class="adm-respuesta__alumno">${i(u.alumno)}</div>
            <p class="adm-campo__ayuda">
              ${p?"\u2713 Correcta":"\u2717 Incorrecta"}
              ${u.correcta?" \xB7 Respuesta correcta: "+i(u.correcta):""}
              \xB7 la califica el servidor
            </p>
            ${this._htmlComentarioPregunta(t,e)}
          </div>`}const s=e[t.id]||{},a=o==null||o===""?"Sin responder":String(o),l=t.tipo==="respuesta_corta"&&t.respuesta_correcta?`<p class="adm-campo__ayuda">Respuesta de referencia: ${i(t.respuesta_correcta)}</p>`:"";return`<div class="adm-respuesta${s.es_correcta===!0?" adm-respuesta--correcta":s.es_correcta===!1?" adm-respuesta--incorrecta":""}" data-bloque="${i(t.id)}">
          <div class="adm-respuesta__letra">Pregunta ${c+1} \xB7 escrita \xB7 ${i(window.panelUI.numero(t.puntos))} pt</div>
          <p class="adm-respuesta__enunciado">${i(t.texto)}</p>
          ${l}
          <div class="adm-respuesta__alumno">${i(a)}</div>
          <div class="adm-respuesta__controles">
            <button class="adm-btn adm-btn--pequeno${s.es_correcta===!0?" adm-btn--principal":""}" type="button"
              data-decision="correcta" data-pregunta="${i(t.id)}">Correcta</button>
            <button class="adm-btn adm-btn--pequeno${s.es_correcta===!1?" adm-btn--principal":""}" type="button"
              data-decision="incorrecta" data-pregunta="${i(t.id)}">Incorrecta</button>
            <label class="adm-campo__etiqueta" style="margin:0" for="puntos_${i(t.id)}">Puntos</label>
            <input class="adm-entrada adm-entrada--corta" id="puntos_${i(t.id)}" type="number" min="0" step="0.5"
              data-puntos="${i(t.id)}" value="${i(s.puntos!=null?s.puntos:"")}">
          </div>
          ${this._htmlComentarioPregunta(t,e)}
        </div>`}).join("");return`${r.corregido?`<div class="adm-aviso adm-aviso--exito">Entrega calificada con nota ${i(window.panelUI.numero(r.nota))}/10. Puedes reajustar la correcci\xF3n.</div>`:""}
        <div id="errorCorreccion" class="adm-aviso adm-aviso--error" hidden></div>
        <p class="adm-cabecera__sub correccion-resumen" id="resumenNota"></p>
        ${n}
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="observaciones">Comentario para el alumno (opcional)</label>
          <textarea class="adm-entrada" id="observaciones" maxlength="2000">${i(r.observaciones||"")}</textarea>
        </div>`}}})();
