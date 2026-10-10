(function(){"use strict";window.vistaSesionEstudio={async montar(o,a){const e=parseInt(a.libro),t=parseInt(a.capitulo);o.innerHTML=window.skeleton?window.skeleton.tarjetas(2,{ancho:"100%"}):'<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';const r=window.supabaseClient,i=store.obtener("usuario");if(!(!r||!i))try{const{data:s}=await r.from("libros_biblicos").select("*").eq("id",e).single();if(!s)throw new Error("Libro no encontrado");let{data:n}=await r.from("capitulos").select("id").eq("libro_id",e).eq("numero",t).single();if(!n){const{data:d}=await r.from("capitulos").insert({libro_id:e,numero:t}).select("id").single();n=d}if(!n)throw new Error("No se pudo crear el cap\xEDtulo");const{data:c}=await r.from("progreso_lectura").select("*").eq("usuario_id",i.id).eq("capitulo_id",n.id).single(),l=await window.progresoRepository.obtenerPreguntasSistema(n.id);this.estado={raiz:o,libro:s,libroId:e,capituloNum:t,capId:n.id,numCaps:s.num_capitulos,yaLeido:c?.completado||!1,estudioCompletado:c?.estudio_completado||!1,preguntas:l,correctasId:new Set,ronda:"inicial",cola:[],idx:0,respondido:!1,falladasRonda:[],resInicial:{aciertos:0,fallos:0,falladas:[]},fsm:window.maquinaEstudio.estados.NO_INICIADO},this._renderInicio(),this._onClickRaiz=async d=>{if(d.target.closest("#btnRetroceder")){if(this.estado&&!this.estado.respondido&&!await window.helpers.confirmar("\xBFSeguro que quieres salir? Perder\xE1s el progreso de esta sesi\xF3n.",{titulo:"Salir de la sesi\xF3n",textoConfirmar:"Salir"}))return;router.navegar("/estudio/libro/"+this.estado.libroId)}},o.addEventListener("click",this._onClickRaiz)}catch{o.innerHTML=`<div class="o-contenedor o-pila u-mt-4 u-texto-centrado"><h2 style="color:var(--color-acento);display:flex;justify-content:center">${window.Iconos.render("book-open")}</h2><p class="u-color-texto-secundario">Cap\xEDtulo no disponible</p><button class="btn-primario" id="btnErrorEstudioVolver">\u2190 Volver</button></div>`,o.querySelector("#btnErrorEstudioVolver")?.addEventListener("click",()=>router.navegar("/estudio"))}},desmontar(){this._onClickRaiz&&this.estado&&this.estado.raiz&&(this.estado.raiz.removeEventListener("click",this._onClickRaiz),this._onClickRaiz=null)},_cabecera(o,a){return`
        <div class="o-flecha o-flecha--between u-mb-3">
          <button class="btn-secundario" id="btnRetroceder">${window.Iconos.render("arrow-left")}</button>
          <div class="u-texto-centrado u-flex-1">
            <h3 style="margin:0">${o}</h3>
            ${a?`<span class="u-fs-xs u-color-texto-terciario">${a}</span>`:""}
          </div>
          <span class="u-min-ancho-40"></span>
        </div>`},_renderInicio(){const{raiz:o,libro:a,capituloNum:e,numCaps:t}=this.estado;o.innerHTML=`
        <div class="o-contenedor o-pila u-app-shell--comfort">
          ${this._cabecera(a.nombre,`Cap\xEDtulo ${e} de ${t}`)}
          <div class="u-texto-centrado o-pila" style="align-items:center;margin-top:var(--espaciado-3xl)">
            <div class="u-icono-circular u-icono-circular--lg">${window.Iconos.render("book-open")}</div>
            <h2 class="u-mt-3">${a.nombre} ${e}</h2>
            <p class="u-color-texto-secundario u-fs-sm u-max-ancho-320">Vamos a leer este cap\xEDtulo y luego responder algunas preguntas para repasar lo aprendido.</p>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnEmpezar">${window.Iconos.render("play")} Empezar</button>
          </div>
        </div>`,o.querySelector("#btnEmpezar").onclick=()=>{this._transicion("INICIAR"),this._renderLeer()},window.Iconos.actualizar()},_renderLeer(){const{raiz:o,libro:a,capituloNum:e}=this.estado,t=window.Iconos.render;o.innerHTML=`
        <div class="o-contenedor o-pila u-app-shell--comfort">
          ${this._cabecera(a.nombre,`Cap\xEDtulo ${e}`)}
          <div class="u-texto-centrado o-pila" style="align-items:center;margin-top:var(--espaciado-2xl)">
            <div class="u-icono-circular u-icono-circular--lg">${t("book-open")}</div>
            <h2 class="u-mt-3">Lee en tu Biblia</h2>
            <p class="u-color-texto-secundario u-fs-base u-max-ancho-340" style="line-height:var(--altura-linea-cuerpo)">Toma tu <strong>Biblia f\xEDsica</strong> y lee <strong>${a.nombre} ${e}</strong>. Cuando termines de leerlo, pulsa el bot\xF3n de abajo.</p>
          </div>
          <div class="o-pila u-w-full">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">${t("edit-3")} Notas de la sesi\xF3n (no se guardan como nota personal)</label>
            <textarea id="notasLectura" rows="3" placeholder="Escribe aqu\xED tus notas, reflexiones o vers\xEDculos destacados..." class="u-w-full u-input-textarea"></textarea>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnLeido">${t("check")} Ya lo he le\xEDdo</button>
          </div>
        </div>`;const r=store.obtener("usuario");r&&window.notasRepository&&window.notasRepository.obtener(r.id,a.nombre,parseInt(e),"sesion").then(i=>{if(i&&i.contenido){const s=o.querySelector("#notasLectura");s&&(s.value=i.contenido)}}).catch(()=>{}),o.querySelector("#btnLeido").onclick=async i=>{const s=i.currentTarget;s.disabled=!0,s.innerHTML=t("check")+" Guardando...",this._transicion("LEER");const n=store.obtener("usuario");try{await window.progresoRepository.marcarLeido(n.id,this.estado.capId)}catch{window.helpers.mostrarAlerta("No se pudo guardar el progreso.","advertencia")}const c=o.querySelector("#notasLectura")?.value.trim();c&&window.notasRepository&&await window.notasRepository.guardar(n.id,a.nombre,parseInt(e),c,{tipo:"sesion"}).catch(()=>{}),window.Iconos.actualizar(),this._iniciarEstudio()},window.Iconos.actualizar()},_iniciarEstudio(){const o=this.estado;if(o.ronda="inicial",o.cola=this._barajar(o.preguntas),o.idx=0,o.falladasRonda=[],o.resInicial={aciertos:0,fallos:0,falladas:[]},o.correctasId=new Set,o.respondido=!1,!o.preguntas.length){this._completar();return}this._renderPregunta()},_iniciarRepaso(){const o=this.estado;o.ronda="repaso";const a=new Map;o.falladasRonda.forEach(e=>{const t=o.preguntas.find(r=>r.id===e);t&&a.set(t.id,t)}),o.cola=this._barajar(Array.from(a.values())),o.idx=0,o.falladasRonda=[],o.respondido=!1,this._renderPregunta()},_renderPregunta(){const o=this.estado;o.respondido=!1;const a=o.cola[o.idx],e=o.cola.length,t=o.idx+1,r=o.ronda==="repaso",{raiz:i}=o;i.innerHTML=`
        <div class="o-contenedor o-pila u-app-shell--compact">
          ${this._cabecera(o.libro.nombre,`Cap\xEDtulo ${o.capituloNum}`)}
          <div class="u-mt-2">
            <div class="o-flecha o-flecha--between u-mb-1">
              <span class="u-texto-etiqueta u-color-texto-terciario">${r?"Repaso":"Pregunta"} ${t} de ${e}</span>
              ${r?'<span class="u-fs-xs u-fw-600 u-color-aviso">Corrige para avanzar</span>':""}
            </div>
            <div class="barra-progreso"><div class="barra-progreso__lleno" style="transform:scaleX(${e?t/e:0})"></div></div>
          </div>
          <div class="cuestion">
            <p class="cuestion__texto">${window.helpers.escapeHtml(a.texto)}</p>
            <div class="cuestion__opciones" id="opciones">${this._renderOpciones(a)}</div>
            <div class="cuestion__feedback u-oculto" id="feedback"></div>
          </div>
          <div class="barra-accion" id="accion"></div>
        </div>`,this._bindPregunta(a),window.Iconos.actualizar()},_renderOpciones(o){return o.tipo==="multiple"?(o.opciones||[]).map((a,e)=>`
          <label class="cuestion__opcion" data-oi="${e}">
            <input type="radio" name="resp" value="${e}" class="u-oculto">
            <span class="cuestion__marcador"></span>
            <span class="cuestion__texto-op">${window.helpers.escapeHtml(a)}</span>
          </label>`).join(""):o.tipo==="verdadero_falso"?["true","false"].map(a=>`
          <label class="cuestion__opcion" data-oi="${a}">
            <input type="radio" name="resp" value="${a}" class="u-oculto">
            <span class="cuestion__marcador"></span>
            <span class="cuestion__texto-op">${a==="true"?"Verdadero":"Falso"}</span>
          </label>`).join(""):`<input type="text" id="respTexto" class="cuestion__input" placeholder="${o.tipo==="completar"?"Completa la frase...":"Escribe tu respuesta..."}">`},_bindPregunta(o){const a=this.estado,e=a.raiz;if(o.tipo==="multiple"||o.tipo==="verdadero_falso"){const t=e.querySelector("#accion");let r=null;e.querySelectorAll('input[name="resp"]').forEach(i=>{i.addEventListener("change",()=>{a.respondido||(e.querySelectorAll(".cuestion__opcion").forEach(s=>s.classList.remove("cuestion__opcion--seleccionada")),i.closest(".cuestion__opcion").classList.add("cuestion__opcion--seleccionada"),r=i.value,t.innerHTML=`<button class="btn-primario cuestion__btn-confirmar" id="btnConfirmar">${window.Iconos.render("check")} Confirmar</button>`,e.querySelector("#btnConfirmar").onclick=()=>{a.respondido||r===null||this._corregir(o,r)},window.Iconos.actualizar())})})}else{const t=e.querySelector("#accion");t.innerHTML=`<button class="btn-primario" id="btnComprobar">${window.Iconos.render("check")} Comprobar</button>`;const r=()=>{if(a.respondido)return;const i=e.querySelector("#respTexto");if(!i.value.trim()){i.focus();return}this._corregir(o,i.value)};e.querySelector("#btnComprobar").onclick=r,e.querySelector("#respTexto").addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),r())})}},_corregir(o,a){const e=this.estado;e.respondido=!0;const t=window.puntuacionExamen.esCorrecta(a,o.respuesta_correcta,o.tipo);t?(e.correctasId.add(o.id),e.ronda==="inicial"&&e.resInicial.aciertos++):(e.ronda==="inicial"&&e.resInicial.fallos++,e.falladasRonda.includes(o.id)||e.falladasRonda.push(o.id)),this._renderCorreccion(o,a,t)},_renderCorreccion(o,a,e){const r=this.estado.raiz;if(o.tipo==="multiple"||o.tipo==="verdadero_falso")r.querySelectorAll(".cuestion__opcion").forEach(c=>{const l=c.querySelector("input");l.disabled=!0,c.classList.remove("cuestion__opcion--seleccionada"),window.puntuacionExamen.esCorrecta(l.value,o.respuesta_correcta,o.tipo)&&c.classList.add("cuestion__opcion--correcta"),l.value===a&&!e&&c.classList.add("cuestion__opcion--incorrecta")});else{const c=r.querySelector("#respTexto");c&&(c.disabled=!0)}const i=r.querySelector("#feedback");i.classList.remove("u-oculto");let s=`<div class="cuestion__resultado ${e?"cuestion__resultado--ok":"cuestion__resultado--mal"}">${e?window.Iconos.render("check")+" Correcto":window.Iconos.render("x")+" Incorrecto"}</div>`;e||(s+=`<p class="cuestion__explicacion"><strong>Respuesta correcta:</strong> ${window.helpers.escapeHtml(this._textoRespuestaCorrecta(o))}</p>`),o.explicacion&&(s+=`<p class="cuestion__explicacion">${window.helpers.escapeHtml(o.explicacion)}</p>`),i.innerHTML=s;const n=r.querySelector("#accion");n.innerHTML=`<button class="btn-primario" id="btnContinuar">${window.Iconos.render("arrow-right")} Continuar</button>`,r.querySelector("#btnContinuar").onclick=()=>this._continuar(),window.Iconos.actualizar()},_textoRespuestaCorrecta(o){if(o.tipo==="multiple"){const a=parseInt(o.respuesta_correcta,10);return o.opciones&&o.opciones[a]?o.opciones[a]:o.respuesta_correcta}return o.tipo==="verdadero_falso"?o.respuesta_correcta==="true"?"Verdadero":"Falso":o.tipo==="completar"?o.respuesta_correcta.split("|").map(a=>a.trim()).join(" / "):o.respuesta_correcta},_continuar(){const o=this.estado;o.idx++,o.idx<o.cola.length?this._renderPregunta():this._finRonda()},_finRonda(){const o=this.estado;o.ronda==="inicial"?(this._transicion("EVALUAR"),this._renderResumen()):o.falladasRonda.length===0?this._completar():this._renderResumenRepaso()},_renderResumen(){const o=this.estado,{aciertos:a,fallos:e}=o.resInicial,t=[...new Set(o.falladasRonda)],r=t.length>0,i=o.preguntas.length,s=this._mensajeCompletar(a,i),n=a/i<.5?"error":a/i>=.75?"ok":"mal",c=t.map(d=>{const u=o.preguntas.find(p=>p.id===d);return u?`<div class="cuestion-resumen__item">
          <p class="cuestion-resumen__pregunta">${window.helpers.escapeHtml(u.texto)}</p>
          <p class="cuestion-resumen__resp"><span class="u-color-exito u-fw-600">Correcta:</span> ${window.helpers.escapeHtml(this._textoRespuestaCorrecta(u))}</p>
          ${u.explicacion?`<p class="cuestion-resumen__exp u-color-texto-terciario u-fs-xs">${window.helpers.escapeHtml(u.explicacion)}</p>`:""}
        </div>`:""}).join(""),{raiz:l}=o;l.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg u-app-shell--compact">
          ${this._cabecera(o.libro.nombre,`Cap\xEDtulo ${o.capituloNum} \xB7 Resumen`)}
          <div class="cuestion-resumen">
            <div class="cuestion-resumen__icono cuestion-resumen__icono--${n}">${window.Iconos.render(n==="ok"?"check-circle":"alert-triangle")}</div>
            <h2 class="u-texto-centrado">${s}</h2>
            <div class="cuestion-resumen__stats">
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Acertadas</p><p class="u-texto-2xl u-fw-700 u-color-exito">${a}</p></div>
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Falladas</p><p class="u-texto-2xl u-fw-700 ${r?"u-color-error":"u-color-texto-terciario"}">${e}</p></div>
            </div>
            ${r?`<div class="o-pila u-w-full"><h3>Repaso de errores</h3><div class="o-pila">${c}</div></div>`:""}
          </div>
          <div class="barra-accion">
            ${r?`<button class="btn-primario" id="btnRepasar">${window.Iconos.render("refresh-cw")} Repasar errores (${e})</button>`:`<button class="btn-primario" id="btnFinalizar">${window.Iconos.render("check")} Finalizar cap\xEDtulo</button>`}
          </div>
        </div>`,r?l.querySelector("#btnRepasar").onclick=()=>{this._transicion("REPASAR"),this._iniciarRepaso()}:l.querySelector("#btnFinalizar").onclick=()=>this._completar(),window.Iconos.actualizar()},_renderResumenRepaso(){const o=this.estado,a=o.falladasRonda.length,e=o.cola.length-a,{raiz:t}=o;t.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg u-app-shell--compact">
          ${this._cabecera(o.libro.nombre,`Cap\xEDtulo ${o.capituloNum} \xB7 Repaso`)}
          <div class="cuestion-resumen">
            <div class="cuestion-resumen__icono cuestion-resumen__icono--mal">${window.Iconos.render("alert-triangle")}</div>
            <h2 class="u-texto-centrado">A\xFAn quedan por corregir</h2>
            <p class="u-texto-centrado u-color-texto-secundario u-max-ancho-320">${a} ${a===1?"pregunta sin acertar":"preguntas sin acertar"}. Rep\xEDtelas hasta responderlas bien.</p>
            <div class="cuestion-resumen__stats">
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Corregidas</p><p class="u-texto-2xl u-fw-700 u-color-exito">${e}</p></div>
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Pendientes</p><p class="u-texto-2xl u-fw-700 u-color-error">${a}</p></div>
            </div>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnRepetir">${window.Iconos.render("refresh-cw")} Repetir repaso (${a})</button>
          </div>
        </div>`,t.querySelector("#btnRepetir").onclick=()=>{this._transicion("REPETIR"),this._iniciarRepaso()},window.Iconos.actualizar()},_barajar(o){const a=o.slice();for(let e=a.length-1;e>0;e--){const t=Math.floor(Math.random()*(e+1));[a[e],a[t]]=[a[t],a[e]]}return a},_mensajeCompletar(o,a){const e=a>0?o/a:0;return e<.5?"Repasa el cap\xEDtulo":e<.75?"Por los pelos...":e<1?"Bien hecho":"Eres incre\xEDble!!"},_transicion(o){try{this.estado.fsm=window.maquinaEstudio.siguiente(this.estado.fsm,o)}catch{window.helpers.mostrarAlerta("Error de estado del estudio.","advertencia")}},async _completar(){const o=this.estado;o.estudioCompletado=!0,window.haptica&&window.haptica.logro(),this._transicion("COMPLETAR");const a=store.obtener("usuario");try{await window.progresoRepository.marcarEstudioCompletado(a.id,o.capId)}catch{window.helpers.mostrarAlerta("No se pudo guardar el progreso de estudio.","advertencia")}const e=o.capituloNum<o.numCaps,{raiz:t}=o,r=window.Iconos.render;t.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg u-texto-centrado u-app-shell--ceremony">
          <div class="cuestion-resumen__icono cuestion-resumen__icono--ok u-icono-circular u-icono-circular--lg">${r("check-circle")}</div>
          <h2>\xA1Cap\xEDtulo completado!</h2>
          <p class="u-color-texto-secundario u-max-ancho-320">Has completado el estudio de ${o.libro.nombre} ${o.capituloNum}.</p>
          <div class="barra-accion">
            ${e?`<button class="btn-primario" id="btnSig">${r("arrow-right")} Siguiente cap\xEDtulo</button>`:`<button class="btn-primario" id="btnLibro">${r("book-open")} Volver al libro</button>`}
          </div>
        </div>`,e?t.querySelector("#btnSig").onclick=()=>router.navegar(`/estudio/sesion/${o.libroId}/${o.capituloNum+1}`):t.querySelector("#btnLibro").onclick=()=>router.navegar(`/estudio/libro/${o.libroId}`),window.Iconos.actualizar(),window.notificationService&&window.notificationService.emitir("estudio.completado",{libro:o.libro.nombre,capitulo:o.capituloNum,datos:{libro:o.libro.nombre,capitulo:o.capituloNum}}).catch(()=>{});try{const[i,s]=await Promise.all([window.supabaseClient.from("progreso_lectura").select("fecha_lectura, capitulos(libro_id)").eq("usuario_id",a.id).eq("completado",!0),window.supabaseClient.from("progreso_lectura").select("*",{count:"exact",head:!0}).eq("usuario_id",a.id).eq("completado",!0)]),n=i.data||[],c=s.count||0,l=new Set;n.forEach(p=>{p.capitulos?.libro_id&&l.add(p.capitulos.libro_id)});const d=window.progresoLectura.calcularRacha(n),u=parseInt(localStorage.getItem("fb_racha")||"0",10);if(window.logrosDominio){const p={capitulosLeidos:c,librosCompletados:l.size,racha:Math.max(d,u),examenesCompletados:0,examenPerfecto:!1,tarjetasCreadas:0,totalRepasos:0,ntCompleto:!1,atCompleto:!1};await window.logrosDominio.verificarYOtorgar(a.id,p).catch(()=>{})}d>u?(localStorage.setItem("fb_racha",String(d)),e?this._celebrar("flame","\xA1Racha de "+d+" d\xEDas!"):this._celebrar("trophy","\xA1Libro completado!")):e||this._celebrar("trophy","\xA1Libro completado!")}catch{e||this._celebrar("trophy","\xA1Libro completado!")}},_celebrar(o,a){const e=document.createElement("div");e.className="celebracion";const t=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let r="";if(!t){const i=["#FB923C","#EF4444","#F59E0B","#10B981","#3B82F6","#8B5CF6","#EC4899"];for(let s=0;s<70;s++){const n=Math.random()*100,c=i[Math.floor(Math.random()*i.length)],l=1.8+Math.random()*1.8,d=Math.random()*.6,u=7+Math.random()*6,p=12+Math.random()*8;r+=`<span class="celebracion__confeti" style="left:${n}%;width:${u}px;height:${p}px;background:${c};animation-duration:${l}s;animation-delay:${d}s"></span>`}}e.innerHTML=`
        <div class="celebracion__emblema anim-exito">
          <div class="celebracion__icono">${window.Iconos.render(o)}</div>
          <div class="celebracion__titulo">${a}</div>
        </div>
        ${r}`,e.classList.add("u-overlay-tap"),e.onclick=()=>e.remove(),document.body.appendChild(e),setTimeout(()=>{e.parentNode&&e.remove()},t?2e3:2800)}}})();
