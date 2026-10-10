(function(){"use strict";const b=["admin","editor","owner"],d=e=>window.panelUI.esc(e);function v(){const e=store.obtener("usuario");return e&&b.includes((e.rol||"").toLowerCase())}function g(e){return e.corregido?'<span class="adm-badge adm-badge--exito">Calificada</span>':e.estado==="en_progreso"?'<span class="adm-badge adm-badge--borrador">Sin entregar</span>':Number(e.pendientes_correccion)>0?`<span class="adm-badge adm-badge--aviso">${Number(e.pendientes_correccion)} por corregir</span>`:'<span class="adm-badge adm-badge--publicado">Entregada</span>'}window.vistaEntregas={_examenId:null,_entregas:[],_examenTitulo:"",async montar(e,r){if(!v()){e.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}this._examenId=r&&r.id||null,this._examenTitulo="",this._examenId?await this._pintarExamen(e):await this._pintarListado(e)},async _pintarListado(e){e.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Entregas</h1>
            <p class="adm-cabecera__sub">Elige un examen para ver qui\xE9n ha respondido y corregir lo que falta.</p>
          </div>
        </header>
        <div id="contenido"><p class="adm-cabecera__sub">Cargando\u2026</p></div>
      </div>`;const r=e.querySelector("#contenido");let s=[];try{const t=await window.plataformaRepository.resumen();s=t&&t.examenes||[]}catch(t){r.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${d(t.message)}</div>`;return}const l=s.filter(t=>Number(t.num_entregas)>0);if(!l.length){r.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">Todav\xEDa no hay entregas</p>
          <p>Publica un examen y comparte los enlaces con tus alumnos.</p>
        </div>`;return}r.innerHTML=`<div class="adm-lista">${l.map(t=>{const i=Number(t.por_corregir)||0,o=[(Number(t.num_entregas)||0)+" entregas",(Number(t.enlaces_usados)||0)+" de "+(Number(t.num_enlaces)||0)+" enlaces usados"];return t.nota_media!=null&&o.push("media "+window.panelUI.numero(t.nota_media)),`<div class="adm-fila">
          <div class="adm-fila__principal">
            <div class="adm-fila__titulo">${d(t.titulo)}
              ${i>0?`<span class="adm-badge adm-badge--aviso">${i} por corregir</span>`:'<span class="adm-badge adm-badge--exito">Todo corregido</span>'}
            </div>
            <div class="adm-fila__meta">${o.map(n=>`<span>${d(n)}</span>`).join("")}</div>
          </div>
          <div class="adm-fila__acciones">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" data-ir="/corregir/${d(t.id)}">Ver entregas</button>
          </div>
        </div>`}).join("")}</div>`,r.querySelectorAll("[data-ir]").forEach(t=>{t.addEventListener("click",()=>router.navegar(t.dataset.ir))})},async _pintarExamen(e){e.innerHTML=`<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo" id="tituloExamen">Entregas</h1>
            <p class="adm-cabecera__sub" id="subExamen">Cargando\u2026</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn" id="btnVolver">Volver</button>
            <button class="adm-btn" id="btnEditar">Editar examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`,e.querySelector("#btnVolver").addEventListener("click",()=>router.navegar("/entregas")),e.querySelector("#btnEditar").addEventListener("click",()=>router.navegar("/editor/"+this._examenId));const r=e.querySelector("#contenido");try{const[i,o]=await Promise.all([window.plataformaRepository.listarEntregas(this._examenId),window.plataformaRepository.resumen().catch(()=>null)]);this._entregas=i||[];const n=o&&(o.examenes||[]).find(a=>a.id===this._examenId);this._examenTitulo=n?n.titulo:"Examen"}catch(i){r.innerHTML=`<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${d(i.message)}</div>`;return}const s=this._entregas.filter(i=>!i.corregido&&i.estado==="completado").length,l=e.querySelector("#tituloExamen"),t=e.querySelector("#subExamen");!l||!t||!r.isConnected||(l.textContent=this._examenTitulo,t.textContent=this._entregas.length?`${this._entregas.length} entrega(s) \xB7 ${s} sin corregir`:"Sin entregas todav\xEDa",this._pintarEntregas(r))},_pintarEntregas(e){if(!this._entregas.length){e.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">Nadie ha entregado este examen</p>
          <p>Cuando un alumno use su enlace, aparecer\xE1 aqu\xED.</p>
        </div>`;return}e.innerHTML=`<div class="adm-lista">${this._entregas.map(r=>{const s=r.alumno_nombre||"Sin nombre",l=[];r.alumno_grupo&&l.push(r.alumno_grupo),r.fecha_completado?l.push("Entregado "+window.panelUI.tiempoRelativo(r.fecha_completado)):l.push("Empezado "+window.panelUI.tiempoRelativo(r.fecha_inicio)),r.corregido?l.push("Nota "+window.panelUI.numero(r.nota)+"/10"):r.puntuacion!=null&&l.push("Test "+window.panelUI.numero(r.puntuacion)+" %");const t=r.estado==="en_progreso"?"Sin entregar":r.corregido?"Revisar":"Corregir";return`<div class="adm-fila">
          <div class="adm-fila__principal">
            <div class="adm-fila__titulo">${d(s)} ${g(r)}</div>
            <div class="adm-fila__meta">${l.map(i=>`<span>${d(i)}</span>`).join("")}</div>
          </div>
          <div class="adm-fila__acciones">
            ${r.estado==="en_progreso"?'<span class="adm-cabecera__sub">A\xFAn no ha entregado</span>':`<button class="adm-btn adm-btn--principal adm-btn--pequeno" data-abrir="${d(r.intento_id)}">${t}</button>`}
          </div>
        </div>`}).join("")}</div>`,e.querySelectorAll("[data-abrir]").forEach(r=>{r.addEventListener("click",()=>this._abrirCorreccion(r.dataset.abrir))})},async _abrirCorreccion(e){let r;try{r=await window.plataformaRepository.obtenerEntrega(e)}catch(o){window.helpers.mostrarAlerta("No se pudo abrir la entrega: "+o.message,"error");return}const s={};(r.preguntas||[]).forEach(o=>{if(!this._esTest(o.tipo))return;const n=r.respuestas||{};if(o.tipo==="completar"&&Array.isArray(o.huecos)&&o.huecos.length){const a=Array.isArray(n[o.id])?n[o.id]:[],c=window.puntuacionExamen._calcularHuecos(a,o.huecos),m=c.total>0?c.correctos/c.total:0;s[o.id]={es_correcta:m===1,puntos:Math.round(m*(Number(o.puntos)||0)*100)/100}}else{const a=window.puntuacionExamen.esCorrectaPregunta(n[o.id],o);s[o.id]={es_correcta:a,puntos:window.puntuacionExamen.evaluarPregunta(a,Number(o.puntos)||0)}}}),Object.keys(r.correccion||{}).forEach(o=>{s[o]=Object.assign({},r.correccion[o])});const l=window.panelUI.modal({titulo:(r.alumno_nombre||"Alumno")+(r.alumno_grupo?" \xB7 "+r.alumno_grupo:""),cuerpoHtml:this._htmlCorreccion(r,s),pieHtml:`<button class="adm-btn" type="button" data-rol="cerrar">Cerrar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarCorreccion">Guardar correcci\xF3n</button>`,ancho:"760px"});l.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",l.cerrar);const t=l.cuerpo;t.querySelectorAll("[data-decision]").forEach(o=>{o.addEventListener("click",()=>{const n=o.dataset.pregunta,a=o.dataset.decision==="correcta",c=r.preguntas.find(u=>u.id===n),m=Number(c.puntos)||0;s[n]={es_correcta:a,puntos:a?m:0};const p=t.querySelector(`[data-bloque="${n}"]`);if(p){p.classList.toggle("adm-respuesta--correcta",a),p.classList.toggle("adm-respuesta--incorrecta",!a),p.querySelectorAll("[data-decision]").forEach(_=>{_.classList.toggle("adm-btn--principal",_===o)});const u=p.querySelector("[data-puntos]");u&&(u.value=String(s[n].puntos))}this._actualizarResumen(t,r,s)})}),t.querySelectorAll("[data-puntos]").forEach(o=>{o.addEventListener("input",()=>{const n=o.dataset.puntos,a=Math.max(0,Number(o.value)||0);s[n]=Object.assign({},s[n],{puntos:a}),this._actualizarResumen(t,r,s)})});const i=l.pie.querySelector("#btnGuardarCorreccion");i.addEventListener("click",async()=>{const o=r.preguntas.filter(a=>!this._esTest(a.tipo)&&!(s[a.id]&&s[a.id].es_correcta!=null)),n=t.querySelector("#errorCorreccion");if(o.length){n.textContent="Faltan "+o.length+" respuesta(s) escrita(s) por decidir.",n.hidden=!1;return}n.hidden=!0,i.disabled=!0,i.textContent="Guardando\u2026";try{const a=(t.querySelector("#observaciones")||{}).value||"";await window.plataformaRepository.corregirEntrega(e,s,a),l.cerrar(),window.helpers.mostrarAlerta("Correcci\xF3n guardada: la nota ya es definitiva.","exito");const c=document.querySelector("#app-root");c&&router.pathActual()==="/corregir/"+this._examenId&&await this._pintarExamen(c)}catch(a){n.textContent=a.message,n.hidden=!1,i.disabled=!1,i.textContent="Guardar correcci\xF3n"}}),this._actualizarResumen(t,r,s)},_esTest(e){return["multiple","opcion_unica","verdadero_falso","varias_opciones","completar","relacionar","ordenar"].includes(e)},_puntosAuto(e,r){if(!this._esTest(e.tipo))return 0;const s=r.respuestas||{};if(e.tipo==="completar"&&Array.isArray(e.huecos)&&e.huecos.length){const t=Array.isArray(s[e.id])?s[e.id]:[],i=window.puntuacionExamen._calcularHuecos(t,e.huecos),o=i.total>0?i.correctos/i.total:0;return Math.round(o*(Number(e.puntos)||0)*100)/100}const l=window.puntuacionExamen.esCorrectaPregunta(s[e.id],e);return window.puntuacionExamen.evaluarPregunta(l,Number(e.puntos)||0)},_actualizarResumen(e,r,s){const l=e.querySelector("#resumenNota");if(!l)return;const t=r.preguntas.reduce((n,a)=>n+(Number(a.puntos)||0),0);if(t<=0){l.textContent="";return}let i=0;r.preguntas.forEach(n=>{const a=s[n.id];this._esTest(n.tipo)?i+=this._puntosAuto(n,r):a&&a.es_correcta!=null&&(i+=Number(a.puntos)||0)});const o=r.preguntas.filter(n=>!this._esTest(n.tipo)&&!(s[n.id]&&s[n.id].es_correcta!=null)).length;l.textContent="Nota provisional: "+window.panelUI.numero(i/t*10)+" / 10"+(o?" \xB7 faltan "+o+" por decidir":" \xB7 lista para guardar")},_formatearAuto(e,r){const s=Array.isArray(e.opciones)?e.opciones:[],l=a=>String.fromCharCode(65+a),t=a=>s[a]!=null?l(a)+". "+s[a]:String(a),i=a=>s[a]!=null?s[a]:String(a),o=(a,c)=>{if(Array.isArray(a)||a&&typeof a=="object")return a;try{return JSON.parse(a)}catch{return c}},n=a=>a==null||a===""||Array.isArray(a)&&!a.length||a&&typeof a=="object"&&!Object.keys(a).length;if(["multiple","opcion_unica","verdadero_falso"].includes(e.tipo)){const a=r==null||r===""?null:Number(r),c=Number(e.respuesta_correcta);return{alumno:a!=null&&s[a]!=null?t(a):"Sin responder",correcta:s[c]!=null?t(c):""}}if(e.tipo==="varias_opciones"){const a=o(r,[]),c=o(e.respuesta_correcta,[]);return{alumno:n(a)||!Array.isArray(a)?"Sin responder":a.length?a.map(t).join(" \xB7 "):"Sin responder",correcta:Array.isArray(c)?c.map(t).join(" \xB7 "):""}}if(e.tipo==="completar"){if(Array.isArray(e.huecos)&&e.huecos.length){const c=window.puntuacionExamen.detalleCompletar(r,e)||[];return{alumno:n(r)?"Sin responder":c.map((m,p)=>"Hueco "+(p+1)+": "+(m.respuestaUsuario||"\u2014")+(m.esCorrecta?" \u2713":" \u2717")).join(" \xB7 "),correcta:c.map(m=>m.respuestaCorrecta).join(" \xB7 ")}}const a=String(e.respuesta_correcta||"").split("|").map(c=>c.trim()).filter(Boolean);return{alumno:n(r)?"Sin responder":String(r),correcta:a.join(" o ")}}if(e.tipo==="relacionar"){const a=o(r,{})||{},c=Math.floor(s.length/2),m=(u,_)=>(s[u]||u)+" \u2192 "+(s[c+_]!=null?s[c+_]:_),p=typeof a=="object"&&!Array.isArray(a)?Object.keys(a).filter(u=>Number.isInteger(Number(a[u]))&&Number(a[u])>=0&&Number(a[u])<c):[];return{alumno:p.length?p.map(u=>m(u,Number(a[u]))).join(" \xB7 "):"Sin responder",correcta:Array.from({length:c},(u,_)=>m(_,_)).join(" \xB7 ")}}if(e.tipo==="ordenar"){const a=o(r,[]);return{alumno:n(a)||!Array.isArray(a)?"Sin responder":a.map(i).join(" \u2192 "),correcta:s.join(" \u2192 ")}}return{alumno:r==null||r===""?"Sin responder":String(r),correcta:""}},_htmlCorreccion(e,r){const s=e.preguntas.map((t,i)=>{const o=e.respuestas?e.respuestas[t.id]:void 0;if(this._esTest(t.tipo)){const p=window.puntuacionExamen.esCorrectaPregunta(o,t),u=this._formatearAuto(t,o),_=this._puntosAuto(t,e);return`<div class="adm-respuesta ${p?"adm-respuesta--correcta":"adm-respuesta--incorrecta"}" data-bloque="${d(t.id)}">
            <div class="adm-respuesta__letra">Pregunta ${i+1} \xB7 autom\xE1tica \xB7 ${d(window.panelUI.numero(_))} de ${d(window.panelUI.numero(t.puntos))} pt</div>
            <p class="adm-respuesta__enunciado">${d(t.texto)}</p>
            <div class="adm-respuesta__alumno">${d(u.alumno)}</div>
            <p class="adm-campo__ayuda">
              ${p?"\u2713 Correcta":"\u2717 Incorrecta"}
              ${u.correcta?" \xB7 Respuesta correcta: "+d(u.correcta):""}
              \xB7 la califica el servidor
            </p>
          </div>`}const n=r[t.id]||{},a=o==null||o===""?"Sin responder":String(o),c=t.tipo==="respuesta_corta"&&t.respuesta_correcta?`<p class="adm-campo__ayuda">Respuesta de referencia: ${d(t.respuesta_correcta)}</p>`:"";return`<div class="adm-respuesta${n.es_correcta===!0?" adm-respuesta--correcta":n.es_correcta===!1?" adm-respuesta--incorrecta":""}" data-bloque="${d(t.id)}">
          <div class="adm-respuesta__letra">Pregunta ${i+1} \xB7 escrita \xB7 ${d(window.panelUI.numero(t.puntos))} pt</div>
          <p class="adm-respuesta__enunciado">${d(t.texto)}</p>
          ${c}
          <div class="adm-respuesta__alumno">${d(a)}</div>
          <div class="adm-respuesta__controles">
            <button class="adm-btn adm-btn--pequeno${n.es_correcta===!0?" adm-btn--principal":""}" type="button"
              data-decision="correcta" data-pregunta="${d(t.id)}">Correcta</button>
            <button class="adm-btn adm-btn--pequeno${n.es_correcta===!1?" adm-btn--principal":""}" type="button"
              data-decision="incorrecta" data-pregunta="${d(t.id)}">Incorrecta</button>
            <label class="adm-campo__etiqueta" style="margin:0" for="puntos_${d(t.id)}">Puntos</label>
            <input class="adm-entrada adm-entrada--corta" id="puntos_${d(t.id)}" type="number" min="0" step="0.5"
              data-puntos="${d(t.id)}" value="${d(n.puntos!=null?n.puntos:"")}">
          </div>
        </div>`}).join("");return`${e.corregido?`<div class="adm-aviso adm-aviso--exito">Entrega calificada con nota ${d(window.panelUI.numero(e.nota))}/10. Puedes reajustar la correcci\xF3n.</div>`:""}
        <div id="errorCorreccion" class="adm-aviso adm-aviso--error" hidden></div>
        <p class="adm-cabecera__sub" id="resumenNota"></p>
        ${s}
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="observaciones">Comentario para el alumno (opcional)</label>
          <textarea class="adm-entrada" id="observaciones" maxlength="2000">${d(e.observaciones||"")}</textarea>
        </div>`}}})();
