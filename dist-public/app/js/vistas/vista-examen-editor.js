(function(){"use strict";const q=["admin","editor","owner"],E=["multiple","varias_opciones","verdadero_falso","completar","relacionar","ordenar"],g=[{valor:"multiple",nombre:"Opci\xF3n m\xFAltiple",automatica:!0,descripcion:"Varias opciones y una sola respuesta correcta.",ejemplo:"\xBFQui\xE9n construy\xF3 el arca? \u2014 No\xE9"},{valor:"verdadero_falso",nombre:"Verdadero o falso",automatica:!0,descripcion:"El alumno califica una afirmaci\xF3n como verdadera o falsa.",ejemplo:"\xABJon\xE1s huy\xF3 de Dios\xBB \u2014 Falso"},{valor:"completar",nombre:"Completar una frase",automatica:!0,descripcion:"Una palabra o expresi\xF3n que falta; aceptas todas las variantes posibles.",ejemplo:"El Se\xF1or es mi ___; nada me faltar\xE1."},{valor:"respuesta_corta",nombre:"Respuesta corta",automatica:!1,descripcion:"Una palabra, nombre o frase breve. Correcci\xF3n manual con respuesta de referencia opcional.",ejemplo:"\xBFEn qu\xE9 ciudad naci\xF3 Jes\xFAs? \u2014 Bel\xE9n"},{valor:"texto_largo",nombre:"Respuesta desarrollada",automatica:!1,descripcion:"Explicar, justificar o resumir. Correcci\xF3n manual.",ejemplo:"Explica qu\xE9 ense\xF1anza transmite la par\xE1bola del buen samaritano."},{valor:"varias_opciones",nombre:"Varias respuestas",automatica:!0,descripcion:"El alumno marca todas las opciones correctas.",ejemplo:"Elige los dones del Esp\xEDritu: sabidur\xEDa, poder, consejo\u2026"},{valor:"relacionar",nombre:"Relacionar columnas",automatica:!0,descripcion:"Une cada elemento de la izquierda con su pareja de la derecha.",ejemplo:"Mois\xE9s \u2192 \xC9xodo \xB7 No\xE9 \u2192 arca"},{valor:"ordenar",nombre:"Ordenar elementos",automatica:!0,descripcion:"Coloca los elementos en la secuencia correcta.",ejemplo:"Ordena acontecimientos: nacimiento, bautismo, crucifixi\xF3n\u2026"}],u=e=>window.panelUI.esc(e);function h(){return"p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}function f(e){return/\{\{HUECO_\d+\}\}/.test(String(e||""))}function d(e){const a={};for(let s=0;s<e;s++)a[s]=s;return JSON.stringify(a)}function _(e){const a={id:h(),texto:"",tipo:e,opciones:[],respuesta_correcta:null,huecos:[],puntos:1,obligatoria:!0};switch(e){case"multiple":case"varias_opciones":a.opciones=["",""],a.respuesta_correcta=e==="multiple"?"0":"[]";break;case"verdadero_falso":a.opciones=["Verdadero","Falso"],a.respuesta_correcta="0";break;case"completar":a.huecos=[{respuesta_correcta:"",variantes:[]}];break;case"respuesta_corta":a.respuesta_correcta="";break;case"relacionar":a.opciones=["","","",""],a.respuesta_correcta=d(2);break;case"ordenar":a.opciones=["",""],a.respuesta_correcta=JSON.stringify([0,1]);break;default:break}return a}function $(){return Object.assign(_("multiple"),{opciones:["",""]})}function p(e,a){try{const s=JSON.parse(e);return s??a}catch{return a}}function x(e){return(Array.isArray(e)?e:[]).map(a=>{a=a||{};let s=String(a.tipo||"multiple");s==="opcion_unica"&&(s="multiple"),g.some(o=>o.valor===s)||(s="texto_largo");const n={id:a.id||h(),texto:a.texto||"",tipo:s,puntos:Math.max(0,Number(a.puntos)||1),obligatoria:a.obligatoria!==!1},r=(Array.isArray(a.opciones)?a.opciones:[]).map(o=>String(o??""));if(s==="multiple")return Object.assign(n,{opciones:r.length>=2?r:["",""],respuesta_correcta:r.length>0&&Number.isInteger(Number(a.respuesta_correcta))&&Number(a.respuesta_correcta)>=0&&Number(a.respuesta_correcta)<r.length?String(Number(a.respuesta_correcta)):"0",huecos:[]});if(s==="varias_opciones"){const o=(Array.isArray(a.respuesta_correcta)?a.respuesta_correcta:p(a.respuesta_correcta,[])).map(Number).filter(t=>Number.isInteger(t)&&t>=0&&t<r.length);return Object.assign(n,{opciones:r.length>=2?r:["",""],respuesta_correcta:JSON.stringify([...new Set(o)].sort((t,i)=>t-i)),huecos:[]})}if(s==="verdadero_falso"){const o=String(a.respuesta_correcta==null?"0":a.respuesta_correcta);let t="0";return o==="true"||o==="0"?t="0":(o==="false"||o==="1")&&(t="1"),Object.assign(n,{opciones:["Verdadero","Falso"],respuesta_correcta:t,huecos:[]})}if(s==="completar"){if(f(a.texto)){const t=(Array.isArray(a.huecos)?a.huecos:[]).map((i,c)=>({id:i&&Number(i.id)||c+1,respuesta_correcta:String(i&&i.respuesta_correcta||"").trim(),variantes:Array.isArray(i&&i.variantes)?i.variantes.map(l=>String(l||"").trim()).filter(Boolean):[]}));return Object.assign(n,{huecos:t,respuesta_correcta:null,opciones:[]})}let o=(Array.isArray(a.huecos)?a.huecos:[]).map(t=>String(t&&t.respuesta_correcta||"").trim()).filter(Boolean);return!o.length&&typeof a.respuesta_correcta=="string"&&(o=a.respuesta_correcta.split("|").map(t=>t.trim()).filter(Boolean)),Object.assign(n,{huecos:o.map(t=>({respuesta_correcta:t,variantes:[]})),respuesta_correcta:o.join("|"),opciones:[]})}if(s==="respuesta_corta")return Object.assign(n,{respuesta_correcta:String(a.respuesta_correcta||"").trim()||null,opciones:[],huecos:[]});if(s==="relacionar"){let o=r;o.length%2!==0&&(o=o.slice(0,o.length-1));const t=o.length/2,i=o.slice(0,t),c=o.slice(t),l=p(a.respuesta_correcta,{}),b=t>0&&i.every((w,v)=>{const y=Number(l[v]);return Number.isInteger(y)&&y>=0&&y<t})?i.map((w,v)=>c[Number(l[v])]):c;return Object.assign(n,{opciones:i.concat(b),respuesta_correcta:d(t||1),huecos:[]})}if(s==="ordenar"){const o=(Array.isArray(a.respuesta_correcta)?a.respuesta_correcta:p(a.respuesta_correcta,[])).map(Number),i=o.length===r.length&&o.length>0&&o.every((c,l)=>c===l)===!1&&[...o].sort((c,l)=>c-l).every((c,l)=>c===l)?o.map(c=>r[c]):r;return Object.assign(n,{opciones:i,respuesta_correcta:JSON.stringify(i.map((c,l)=>l)),huecos:[]})}return Object.assign(n,{opciones:[],respuesta_correcta:null,huecos:[]})})}window.vistaExamenEditor={_examen:null,_guardando:!1,tipos:g,async montar(e,a){const s=store.obtener("usuario");if(!s||!q.includes((s.rol||"").toLowerCase())){e.innerHTML='<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta secci\xF3n es solo para el administrador.</div></div>';return}const n=a&&a.id,r=n&&n!=="nuevo";e.innerHTML='<div class="o-contenedor u-mt-4"><p class="adm-cabecera__sub">Cargando\u2026</p></div>';let o;if(r){try{o=await window.examenesRepository.obtener(n)}catch{o=null}if(!o){e.innerHTML=`<div class="o-contenedor u-mt-4">
            <div class="adm-aviso adm-aviso--error">No se encontr\xF3 el examen.</div>
            <button class="adm-btn" id="btnVolver">Volver a mis ex\xE1menes</button></div>`,e.querySelector("#btnVolver").addEventListener("click",()=>router.navegar("/examenes"));return}let t=o.preguntas;if(typeof t=="string")try{t=JSON.parse(t)}catch{t=[]}o={id:o.id,grupo_id:o.grupo_id,creado_por:o.creado_por,titulo:o.titulo||"",descripcion:o.descripcion||"",estado:o.estado||"borrador",publicado:!!o.publicado,config:o.config||{},preguntas:x(t)},o.preguntas.length||(o.preguntas=[$()])}else o={grupo_id:s.grupo_id||null,creado_por:s.id,titulo:"",descripcion:"",estado:"borrador",publicado:!1,config:{},preguntas:[$()]};this._examen=o,this._pintar(e)},desmontar(){this._examen=null,this._guardando=!1},_pintar(e){const a=this._examen,s=a.estado==="publicado"?'<span class="adm-badge adm-badge--publicado">Publicado</span>':a.estado==="cerrado"?'<span class="adm-badge adm-badge--cerrado">Cerrado</span>':'<span class="adm-badge adm-badge--borrador">Borrador</span>';e.innerHTML=`
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(120px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera">
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">${a.id?"Editar examen":"Nuevo examen"} ${s}</h1>
              <p class="adm-cabecera__sub" id="subTotal"></p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn" id="btnVolver">Volver</button>
              <button class="adm-btn" id="btnGuardar">Guardar borrador</button>
              <button class="adm-btn adm-btn--principal" id="btnPublicarEditor">${a.publicado?"Guardar y cerrar":"Guardar y publicar"}</button>
            </div>
          </header>

          <div id="aviso" class="adm-aviso adm-aviso--error" hidden></div>

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Datos del examen</h2>
            <div class="adm-campo">
              <label class="adm-campo__etiqueta" for="titulo">T\xEDtulo</label>
              <input class="adm-entrada" id="titulo" type="text" maxlength="160" value="${u(a.titulo)}" placeholder="Ej.: Examen de matem\xE1ticas \u2014 Tema 4">
            </div>
            <div class="adm-campo">
              <label class="adm-campo__etiqueta" for="descripcion">Descripci\xF3n o instrucciones (opcional)</label>
              <textarea class="adm-entrada" id="descripcion" maxlength="1200" placeholder="Instrucciones para el alumno\u2026">${u(a.descripcion)}</textarea>
            </div>
          </section>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Preguntas</h2>
            <div id="preguntas"></div>
            <div style="display:flex;gap:var(--espaciado-xs);flex-wrap:wrap;margin-top:var(--espaciado-sm)">
              <button class="adm-btn adm-btn--principal" id="btnAddPregunta">\uFF0B A\xF1adir pregunta</button>
            </div>
          </section>
        </div>`,e.querySelector("#btnVolver").addEventListener("click",()=>router.navegar("/examenes")),e.querySelector("#titulo").addEventListener("input",n=>{this._examen.titulo=n.target.value}),e.querySelector("#descripcion").addEventListener("input",n=>{this._examen.descripcion=n.target.value}),e.querySelector("#btnAddPregunta").addEventListener("click",()=>{this._sincronizarCampos(),this._mostrarSelectorTipo()}),e.querySelector("#btnGuardar").addEventListener("click",()=>this._guardar(!1)),e.querySelector("#btnPublicarEditor").addEventListener("click",()=>this._guardar(!0)),this._pintarPreguntas()},_mostrarSelectorTipo(){const e=window.panelUI.modal({titulo:"A\xF1adir pregunta",cuerpoHtml:`
          <p class="adm-campo__ayuda" style="margin-top:0">
            Elige un tipo. Despu\xE9s podr\xE1s cambiar de tipo en cualquier momento y
            asignar puntuaci\xF3n, posici\xF3n y si es obligatoria.
          </p>
          <div class="selector-tipo-grid">
            ${g.map(a=>`
              <button type="button" class="selector-tipo" data-tipo="${a.valor}">
                <span class="selector-tipo__nombre">${u(a.nombre)}</span>
                <span class="selector-tipo__descripcion">${u(a.descripcion)}</span>
                <span class="selector-tipo__ejemplo">Ej.: ${u(a.ejemplo)}</span>
                <span class="selector-tipo__correccion ${a.automatica?"selector-tipo__correccion--auto":""}">
                  ${a.automatica?"Correcci\xF3n autom\xE1tica":"Correcci\xF3n manual"}
                </span>
              </button>`).join("")}
          </div>`,pieHtml:'<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>',ancho:"680px"});e.pie.querySelector('[data-rol="cerrar"]').addEventListener("click",e.cerrar),e.cuerpo.querySelectorAll(".selector-tipo").forEach(a=>{a.addEventListener("click",()=>{this._sincronizarCampos(),this._examen.preguntas.push(_(a.dataset.tipo)),e.cerrar(),this._pintarPreguntas();const s=document.querySelectorAll("#preguntas .adm-pregunta");s.length&&s[s.length-1].scrollIntoView({behavior:"smooth",block:"center"})})})},_pintarPreguntas(){const e=document.querySelector("#preguntas");if(e){if(!this._examen.preguntas.length){e.innerHTML=`<div class="adm-vacio">
          <p class="adm-vacio__titulo">Sin preguntas</p>
          <p>A\xF1ade al menos una pregunta para poder guardar el examen.</p>
        </div>`,this._actualizarTotal();return}e.innerHTML=this._examen.preguntas.map((a,s)=>this._htmlPregunta(a,s)).join(""),e.querySelectorAll("[data-q]").forEach(a=>{const s=Number(a.dataset.q),n=a.dataset.qAccion;n&&a.addEventListener("click",()=>this._accionPregunta(n,s,a))}),e.querySelectorAll("[data-campo]").forEach(a=>{const s=Number(a.dataset.q),n=a.dataset.campo,r=a.tagName==="SELECT"||a.type==="checkbox"||a.type==="radio"?"change":"input";a.addEventListener(r,()=>{const o=this._examen.preguntas[s];o&&(this._aplicarCampo(o,n,a),this._actualizarTotal())})}),this._actualizarTotal()}},_aplicarCampo(e,a,s){if(a==="texto")e.texto=s.value;else if(a==="puntos")e.puntos=Math.max(0,Number(s.value)||0);else if(a==="obligatoria")e.obligatoria=s.checked;else if(a==="tipo")this._cambiarTipo(this._examen.preguntas.indexOf(e),s.value);else if(a==="opcion"){const n=Math.floor(e.opciones.length/2);s.dataset.par!==void 0?e.opciones[Number(s.dataset.pidx)]=s.value:s.dataset.parDer!==void 0?e.opciones[n+Number(s.dataset.pidx)]=s.value:s.dataset.eidx!==void 0?e.opciones[Number(s.dataset.eidx)]=s.value:e.opciones[Number(s.dataset.opcion)]=s.value}else if(a==="correcta")e.respuesta_correcta=s.value;else if(a==="correctaVar"){const n=[];document.querySelectorAll(`[data-campo="correctaVar"][data-q="${this._examen.preguntas.indexOf(e)}"]:checked`).forEach(r=>n.push(Number(r.dataset.opcion))),e.respuesta_correcta=JSON.stringify(n.sort((r,o)=>r-o))}else if(a==="respuestaCorrecta")e.respuesta_correcta=s.value;else if(a==="palabra"){Array.isArray(e.huecos)||(e.huecos=[]);const n=Number(s.dataset.hidx);e.huecos[n]&&(e.huecos[n].respuesta_correcta=s.value),e.respuesta_correcta=e.huecos.map(r=>String(r.respuesta_correcta||"").trim()).filter(Boolean).join("|")}else if(a==="hueco"){Array.isArray(e.huecos)||(e.huecos=[]);const n=Number(s.dataset.hidx);e.huecos[n]&&(e.huecos[n].respuesta_correcta=s.value)}},_htmlPregunta(e,a){const s=Math.floor((e.opciones||[]).length/2);let n="";if(e.tipo==="multiple"||e.tipo==="varias_opciones"){const r=e.tipo==="varias_opciones";let o=[];r&&(o=p(e.respuesta_correcta,[]).map(Number)),n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">${r?"Opciones (marca las correctas)":"Opciones (marca la correcta)"}</span>
            ${(e.opciones||[]).map((t,i)=>`
              <div class="adm-opcion">
                <input class="adm-opcion__radio" type="${r?"checkbox":"radio"}" name="correcta_${a}" value="${i}"
                  data-q="${a}" data-campo="${r?"correctaVar":"correcta"}" data-opcion="${i}"
                  ${(r?o.includes(i):String(e.respuesta_correcta)===String(i))?"checked":""}
                  aria-label="Marcar opci\xF3n ${i+1} como ${r?"correcta":"la correcta"}">
                <input class="adm-entrada" type="text" value="${u(t)}" placeholder="Opci\xF3n ${i+1}"
                  data-q="${a}" data-campo="opcion" data-opcion="${i}" data-opcion-val="${i}" aria-label="Texto de la opci\xF3n ${i+1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${a}" data-q-accion="quitarOpcion" data-opcion="${i}"
                  ${(e.opciones||[]).length<=2?"disabled":""} aria-label="Quitar opci\xF3n ${i+1}">\u2715</button>
              </div>`).join("")}
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="anadirOpcion">A\xF1adir opci\xF3n</button>
            ${r&&!o.length?'<p class="adm-campo__ayuda">Marca al menos una opci\xF3n como correcta.</p>':""}
          </div>`}else if(e.tipo==="verdadero_falso")n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Respuesta correcta</span>
            <div style="display:flex;gap:var(--espaciado-xs)">
              ${[0,1].map(r=>`
                <label class="adm-opcion">
                  <input type="radio" name="correcta_${a}" value="${r}"
                    data-q="${a}" data-campo="correcta" ${String(e.respuesta_correcta)===String(r)?"checked":""}
                    aria-label="Marcar como ${r===0?"Verdadero":"Falso"}">
                  ${r===0?"Verdadero":"Falso"}
                </label>`).join("")}
            </div>
          </div>`;else if(e.tipo==="completar"){const r=Array.isArray(e.huecos)?e.huecos:[],o=f(e.texto);n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">${o?"Respuesta de cada hueco del enunciado":"Palabras que el alumno puede escribir (todas se aceptan como correctas)"}</span>
            ${r.length===0?'<p class="adm-campo__ayuda">A\xF1ade al menos una palabra o expresi\xF3n aceptada.</p>':r.map((t,i)=>`
                <div style="display:flex;gap:var(--espaciado-xs);margin-bottom:var(--espaciado-xs);align-items:center">
                  ${o?`<span class="adm-campo__etiqueta" style="margin:0;flex:0 0 auto">Hueco ${t&&t.id||i+1}</span>`:""}
                  <input class="adm-entrada adm-entrada--corta" type="text" value="${u(t.respuesta_correcta||"")}"
                    data-q="${a}" data-campo="${o?"hueco":"palabra"}" data-hidx="${i}"
                    placeholder="${o?"Respuesta del hueco":"Ej.: verdad"}"
                    aria-label="${o?"Respuesta del hueco "+(i+1):"Palabra aceptada "+(i+1)}">
                  ${o?"":`
                  <button class="adm-btn adm-btn--pequeno adm-btn--peligro"
                    data-q="${a}" data-q-accion="quitarPalabra" data-hidx="${i}"
                    ${r.length<=1?"disabled":""} aria-label="Quitar palabra ${i+1}">\u2715</button>`}
                </div>`).join("")}
            <div style="display:flex;gap:var(--espaciado-xs)">
              ${o?`<p class="adm-campo__ayuda">Este enunciado tiene ${r.length} hueco(s) marcados con \xAB___\xBB convertidos en huecos; edita sus respuestas arriba.</p>`:`<button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="anadirPalabra">A\xF1adir palabra aceptada</button>`}
            </div>
          </div>`}else if(e.tipo==="respuesta_corta")n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Respuesta de referencia (para que puedas corregir m\xE1s r\xE1pido)</span>
            <input class="adm-entrada adm-entrada--corta" type="text"
              data-q="${a}" data-campo="respuestaCorrecta" value="${u(String(e.respuesta_correcta||""))}"
              placeholder="Ej.: Bel\xE9n" aria-label="Respuesta de referencia">
            <p class="adm-campo__ayuda">Puedes corregir manualmente desde \xABEntregas\xBB; este texto es solo una ayuda.</p>
          </div>`;else if(e.tipo==="relacionar"){const r=Math.floor((e.opciones||[]).length/2);n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Parejas correctas (izquierda \u2192 derecha)</span>
            ${Array.from({length:r},(o,t)=>`
              <div class="adm-opcion" style="align-items:center">
                <input class="adm-entrada" type="text" value="${u(e.opciones[t]||"")}"
                  data-q="${a}" data-campo="opcion" data-pidx="${t}" data-par="1"
                  placeholder="Izquierda ${t+1}" aria-label="Elemento de la izquierda ${t+1}">
                <span aria-hidden="true">\u2192</span>
                <input class="adm-entrada" type="text" value="${u(e.opciones[s+t]||"")}"
                  data-q="${a}" data-campo="opcion" data-pidx="${t}" data-par-der="1"
                  placeholder="Derecha ${t+1}" aria-label="Elemento de la derecha ${t+1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${a}" data-q-accion="quitarPar" data-pidx="${t}"
                  ${r<=2?"disabled":""} aria-label="Quitar par ${t+1}">\u2715</button>
              </div>`).join("")}
            <p class="adm-campo__ayuda">El alumno ver\xE1 la columna derecha desordenada: debe unir cada elemento con su pareja.</p>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="anadirPar">A\xF1adir par</button>
          </div>`}else if(e.tipo==="ordenar"){const r=(e.opciones||[]).length;n=`
          <div style="margin-top:var(--espaciado-sm)">
            <span class="adm-campo__etiqueta">Elementos en su orden correcto</span>
            ${(e.opciones||[]).map((o,t)=>`
              <div class="adm-opcion" style="align-items:center">
                <span class="adm-campo__etiqueta" style="margin:0;flex:0 0 auto">${t+1}.</span>
                <input class="adm-entrada" type="text" value="${u(o)}"
                  data-q="${a}" data-campo="opcion" data-eidx="${t}"
                  placeholder="Elemento ${t+1}" aria-label="Elemento en posici\xF3n ${t+1}">
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button"
                  data-q="${a}" data-q-accion="quitarElemento" data-eidx="${t}"
                  ${r<=2?"disabled":""} aria-label="Quitar elemento ${t+1}">\u2715</button>
              </div>`).join("")}
            <p class="adm-campo__ayuda">El alumno los recibir\xE1 desordenados y deber\xE1 reordenarlos as\xED.</p>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="anadirElemento">A\xF1adir elemento</button>
          </div>`}else n=`
          <p class="adm-campo__ayuda" style="margin-top:var(--espaciado-sm)">
            El alumno escribir\xE1 su respuesta. La corregir\xE1s t\xFA desde \xABEntregas\xBB.
          </p>`;return`<article class="adm-pregunta">
        <div class="adm-pregunta__cabecera">
          <span class="adm-pregunta__numero">Pregunta ${a+1}</span>
          <div class="adm-pregunta__acciones">
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="subir" ${a===0?"disabled":""} aria-label="Subir pregunta">\u2191</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="bajar" ${a===this._examen.preguntas.length-1?"disabled":""} aria-label="Bajar pregunta">\u2193</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-q="${a}" data-q-accion="duplicar">Duplicar</button>
            <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-q="${a}" data-q-accion="eliminar">Eliminar</button>
          </div>
        </div>

        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="tipo_${a}">Tipo</label>
          <select class="adm-entrada" id="tipo_${a}" data-q="${a}" data-campo="tipo">
            ${g.map(r=>`<option value="${r.valor}" ${e.tipo===r.valor?"selected":""}>${u(r.nombre)}</option>`).join("")}
          </select>
        </div>

        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="texto_${a}">Enunciado</label>
          <textarea class="adm-entrada" id="texto_${a}" data-q="${a}" data-campo="texto" data-campo-pregunta="texto"
            placeholder="${e.tipo==="completar"?"Ej.: El Se\xF1or es mi ___; nada me faltar\xE1.":"Escribe la pregunta\u2026"}">${u(e.texto)}</textarea>
        </div>

        <div style="display:flex;gap:var(--espaciado-md);flex-wrap:wrap;align-items:flex-end">
          <div class="adm-campo" style="margin-bottom:0">
            <label class="adm-campo__etiqueta" for="puntos_${a}">Puntos</label>
            <input class="adm-entrada adm-entrada--corta" id="puntos_${a}" type="number" min="0" step="0.5"
              value="${u(e.puntos)}" data-q="${a}" data-campo="puntos">
          </div>
          <div class="adm-campo" style="margin-bottom:0">
            <label class="adm-campo__etiqueta" for="obligatoria_${a}">
              <input type="checkbox" id="obligatoria_${a}" data-q="${a}" data-campo="obligatoria" ${e.obligatoria?"checked":""}>
              Obligatoria
            </label>
          </div>
        </div>

        ${n}
      </article>`},_cambiarTipo(e,a){const s=this._examen.preguntas[e];if(!s||s.tipo===a)return;const n=_(a);n.id=s.id,n.texto=s.texto,n.puntos=s.puntos,n.obligatoria=s.obligatoria,a==="multiple"||a==="varias_opciones"?n.opciones=(s.opciones||[]).length>=2?s.opciones.slice():["",""]:a==="completar"&&s.tipo==="respuesta_corta"&&s.respuesta_correcta&&(n.huecos=String(s.respuesta_correcta).split("|").map(r=>r.trim()).filter(Boolean).map(r=>({respuesta_correcta:r,variantes:[]})),n.huecos.length||(n.huecos=[{respuesta_correcta:"",variantes:[]}]),n.respuesta_correcta=n.huecos.map(r=>r.respuesta_correcta).join("|")),this._examen.preguntas[e]=n,this._sincronizarCampos(),this._pintarPreguntas()},_accionPregunta(e,a,s){const n=this._examen.preguntas;if(this._sincronizarCampos(),e==="subir"&&a>0)[n[a-1],n[a]]=[n[a],n[a-1]];else if(e==="bajar"&&a<n.length-1)[n[a+1],n[a]]=[n[a],n[a+1]];else if(e==="duplicar"){const r=JSON.parse(JSON.stringify(n[a]));r.id=h(),n.splice(a+1,0,r)}else if(e==="eliminar"){if(n.length<=1){window.helpers.mostrarAlerta("El examen necesita al menos una pregunta.","aviso");return}n.splice(a,1)}else if(e==="anadirOpcion"){const r=n[a];if(r.opciones.length>=8){window.helpers.mostrarAlerta("M\xE1ximo 8 opciones por pregunta.","aviso");return}r.opciones.push("")}else if(e==="quitarOpcion"){const r=n[a],o=Number(s&&s.dataset?s.dataset.opcion:-1);if(r.opciones.length<=2){window.helpers.mostrarAlerta("Un test necesita al menos dos opciones.","aviso");return}if(r.opciones.splice(o,1),r.tipo==="multiple"){const t=Number(r.respuesta_correcta);!Number.isInteger(t)||t>=r.opciones.length?r.respuesta_correcta="0":t>o&&(r.respuesta_correcta=String(t-1))}else r.tipo==="varias_opciones"&&(r.respuesta_correcta=JSON.stringify(p(r.respuesta_correcta,[]).map(t=>Number(t)>o?Number(t)-1:Number(t)).filter(t=>t!==o).sort((t,i)=>t-i)))}else if(e==="anadirPalabra"){const r=n[a];if(Array.isArray(r.huecos)||(r.huecos=[]),r.huecos.length>=8){window.helpers.mostrarAlerta("M\xE1ximo 8 palabras aceptadas.","aviso");return}r.huecos.push({respuesta_correcta:"",variantes:[]})}else if(e==="quitarPalabra"){const r=n[a],o=Number(s&&s.dataset?s.dataset.hidx:-1);if(Array.isArray(r.huecos)&&r.huecos.length>1&&Number.isInteger(o)&&r.huecos[o])r.huecos.splice(o,1),r.respuesta_correcta=r.huecos.map(t=>String(t.respuesta_correcta||"").trim()).filter(Boolean).join("|");else{window.helpers.mostrarAlerta("Una pregunta de completar necesita al menos una palabra aceptada.","aviso");return}}else if(e==="anadirPar"){const r=n[a];if(Math.floor(r.opciones.length/2)>=6){window.helpers.mostrarAlerta("M\xE1ximo 6 parejas por pregunta.","aviso");return}r.opciones.push(""),r.opciones.splice(Math.floor(r.opciones.length/2),0,""),r.respuesta_correcta=d(Math.floor(r.opciones.length/2))}else if(e==="quitarPar"){const r=n[a],o=Number(s&&s.dataset?s.dataset.pidx:-1),t=Math.floor(r.opciones.length/2);if(t<=2){window.helpers.mostrarAlerta("Relacionar necesita al menos dos parejas.","aviso");return}r.opciones.splice(o,1),r.opciones.splice(t-1+o,1),r.respuesta_correcta=d(t-1)}else if(e==="anadirElemento"){const r=n[a];if(r.opciones.length>=10){window.helpers.mostrarAlerta("M\xE1ximo 10 elementos por pregunta.","aviso");return}r.opciones.push(""),r.respuesta_correcta=JSON.stringify(r.opciones.map((o,t)=>t))}else if(e==="quitarElemento"){const r=n[a],o=Number(s&&s.dataset?s.dataset.eidx:-1);if(r.opciones.length<=2){window.helpers.mostrarAlerta("Ordenar necesita al menos dos elementos.","aviso");return}r.opciones.splice(o,1),r.respuesta_correcta=JSON.stringify(r.opciones.map((t,i)=>i))}this._pintarPreguntas()},_sincronizarCampos(){const e=document.querySelector("#preguntas");e&&e.querySelectorAll("[data-campo]").forEach(n=>{const r=this._examen.preguntas[Number(n.dataset.q)];if(!r)return;const o=n.dataset.campo;o!=="tipo"&&((o==="correcta"||o==="correctaVar")&&!n.checked||this._aplicarCampo(r,o,n))});const a=document.querySelector("#titulo");a&&(this._examen.titulo=a.value);const s=document.querySelector("#descripcion");s&&(this._examen.descripcion=s.value)},_actualizarTotal(){const e=document.querySelector("#subTotal");if(!e)return;const a=this._examen.preguntas.reduce((r,o)=>r+(Number(o.puntos)||0),0),s=this._examen.preguntas.filter(r=>E.includes(r.tipo)).length,n=this._examen.preguntas.length-s;e.textContent=`${this._examen.preguntas.length} preguntas \xB7 ${a} puntos \xB7 ${s} con correcci\xF3n autom\xE1tica \xB7 ${n} a correcci\xF3n manual`},_construirPreguntas(){return this._examen.preguntas.map((e,a)=>{const s=String(e.texto||"").trim();if(!s)throw new Error("La pregunta "+(a+1)+" est\xE1 sin enunciado.");const n=Math.max(0,Number(e.puntos)||0),r=e.obligatoria!==!1,o={id:e.id,texto:s,tipo:e.tipo,puntos:n,obligatoria:r};if(e.tipo==="multiple"){const t=(e.opciones||[]).map(c=>String(c||"").trim());if(t.length<2)throw new Error("La pregunta "+(a+1)+" necesita al menos dos opciones.");if(t.some(c=>!c))throw new Error("La pregunta "+(a+1)+" tiene una opci\xF3n vac\xEDa.");const i=Number(e.respuesta_correcta);if(!Number.isInteger(i)||i<0||i>=t.length)throw new Error("Marca la respuesta correcta de la pregunta "+(a+1)+".");return Object.assign(o,{tipo:"multiple",opciones:t,respuesta_correcta:String(i)})}if(e.tipo==="varias_opciones"){const t=(e.opciones||[]).map(c=>String(c||"").trim());if(t.length<2)throw new Error("La pregunta "+(a+1)+" necesita al menos dos opciones.");if(t.some(c=>!c))throw new Error("La pregunta "+(a+1)+" tiene una opci\xF3n vac\xEDa.");const i=p(e.respuesta_correcta,[]).map(Number).filter(c=>Number.isInteger(c)&&c>=0&&c<t.length);if(!i.length)throw new Error("Marca al menos una opci\xF3n correcta en la pregunta "+(a+1)+".");return Object.assign(o,{tipo:"varias_opciones",opciones:t,respuesta_correcta:JSON.stringify([...new Set(i)].sort((c,l)=>c-l))})}if(e.tipo==="verdadero_falso"){const t=Number(e.respuesta_correcta);if(!Number.isInteger(t)||t<0||t>1)throw new Error("Marca la respuesta correcta de la pregunta "+(a+1)+".");return Object.assign(o,{tipo:"verdadero_falso",opciones:["Verdadero","Falso"],respuesta_correcta:String(t)})}if(e.tipo==="completar"){if(f(e.texto)){const i=(Array.isArray(e.huecos)?e.huecos:[]).map((l,m)=>({id:l&&Number(l.id)||m+1,respuesta_correcta:String(l&&l.respuesta_correcta||"").trim(),variantes:Array.isArray(l&&l.variantes)?l.variantes.map(b=>String(b||"").trim()).filter(Boolean):[]}));if(!i.length||i.some(l=>!l.respuesta_correcta))throw new Error("La pregunta "+(a+1)+" necesita una respuesta para cada hueco del enunciado.");const c=(String(e.texto).match(/\{\{HUECO_\d+\}\}/g)||[]).length;if(c!==i.length)throw new Error("La pregunta "+(a+1)+" tiene "+c+" hueco(s) en el texto y "+i.length+" respuesta(s) configurada(s).");return Object.assign(o,{tipo:"completar",huecos:i,respuesta_correcta:null})}const t=(Array.isArray(e.huecos)?e.huecos:[]).map(i=>String(i&&i.respuesta_correcta||"").trim()).filter(Boolean);if(!t.length)throw new Error("A\xF1ade al menos una palabra aceptada en la pregunta "+(a+1)+".");return Object.assign(o,{tipo:"completar",respuesta_correcta:[...new Set(t)].join("|")})}if(e.tipo==="respuesta_corta")return Object.assign(o,{tipo:"respuesta_corta",respuesta_correcta:String(e.respuesta_correcta||"").trim()||null});if(e.tipo==="relacionar"){const t=(e.opciones||[]).map(i=>String(i||"").trim());if(t.length<4||t.length%2!==0)throw new Error("La pregunta "+(a+1)+" necesita al menos dos parejas completas.");if(t.some(i=>!i))throw new Error("La pregunta "+(a+1)+" tiene una pareja incompleta o vac\xEDa.");return Object.assign(o,{tipo:"relacionar",opciones:t,respuesta_correcta:d(t.length/2)})}if(e.tipo==="ordenar"){const t=(e.opciones||[]).map(i=>String(i||"").trim());if(t.length<2)throw new Error("La pregunta "+(a+1)+" necesita al menos dos elementos.");if(t.some(i=>!i))throw new Error("La pregunta "+(a+1)+" tiene un elemento vac\xEDo.");return Object.assign(o,{tipo:"ordenar",opciones:t,respuesta_correcta:JSON.stringify(t.map((i,c)=>c))})}return Object.assign(o,{tipo:"texto_largo",opciones:[],respuesta_correcta:null})})},_mostrarError(e){const a=document.querySelector("#aviso");a&&(a.textContent=e,a.hidden=!e,e&&(a.classList.remove("adm-aviso--exito"),a.classList.add("adm-aviso--error")))},async _guardar(e){if(this._guardando)return;this._sincronizarCampos(),this._mostrarError("");const a=this._examen;if(String(a.titulo||"").trim().length<3){this._mostrarError("Escribe un t\xEDtulo para el examen.");return}let s;try{s=this._construirPreguntas()}catch(t){this._mostrarError(t.message);return}const n=s.reduce((t,i)=>t+i.puntos,0);if(n<=0){this._mostrarError("El examen necesita puntuaci\xF3n: asigna puntos a las preguntas.");return}this._guardando=!0;const r=document.querySelector("#btnGuardar"),o=document.querySelector("#btnPublicarEditor");[r,o].forEach(t=>{t&&(t.disabled=!0)});try{const t=store.obtener("usuario");let i=a.grupo_id,c=t;if(!i)try{c=await window.authRepository.asegurarGrupo(c),i=c.grupo_id}catch{throw new Error("No se pudo preparar tu espacio de trabajo. Int\xE9ntalo de nuevo.")}if(!i)throw new Error("No se pudo preparar tu espacio de trabajo. Int\xE9ntalo de nuevo.");const l=await window.examenesRepository.guardar({id:a.id,grupo_id:i,creado_por:a.creado_por||t.id,titulo:String(a.titulo).trim(),descripcion:String(a.descripcion||"").trim(),preguntas:s,puntos_totales:n,estado:a.estado||"borrador",publicado:!!a.publicado,config:a.config||{}});if(a.id=l.id,a.grupo_id=l.grupo_id,a.creado_por=l.creado_por,a.estado=l.estado,a.publicado=l.publicado,e){a.estado==="publicado"?(await window.plataformaRepository.cambiarEstado(a.id,"cerrado"),window.helpers.mostrarAlerta("Examen guardado y cerrado.","exito")):(await window.plataformaRepository.cambiarEstado(a.id,"publicado"),window.helpers.mostrarAlerta("Examen publicado. Ya puedes enviar los enlaces.","exito")),router.navegar("/examenes");return}window.helpers.mostrarAlerta("Borrador guardado.","exito");const m=document.querySelector("#app-root");m&&this._pintar(m)}catch(t){this._mostrarError(t.message),window.helpers.mostrarAlerta("No se pudo guardar: "+t.message,"error")}finally{this._guardando=!1,[r,o].forEach(t=>{t&&(t.disabled=!1)})}},_normalizar:x,_nuevaPregunta:_}})();
