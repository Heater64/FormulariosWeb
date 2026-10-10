(function(){"use strict";window.vistaExamenCorregir={_alumnoAbierto:null,async montar(e,o){const r=store.obtener("usuario");if(!r||!["admin","editor","owner"].includes(r.rol)){e.innerHTML='<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>';return}if(!o||!o.id){e.innerHTML='<div class="o-contenedor u-mt-4"><p>Examen no especificado</p></div>';return}e.innerHTML=window.skeleton?`<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8,{ancho:"100%"})}</div>`:'<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando intentos...</p></div>';try{const t=await window.examenesRepository.obtener(o.id),a=await window.examenesRepository.obtenerIntentos(o.id),n=typeof t.preguntas=="string"?JSON.parse(t.preguntas):t.preguntas||[];this._examen=t,this._preguntas=n,this._usuario=r,this._intentos=a,this._correcciones={},this._alumnoAbierto=null,a.forEach(s=>{this._correcciones[s.id]=this._inicializar(s,n)}),this._renderizar(e)}catch(t){e.innerHTML=`<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${t.message}</p></div>`}},_inicializar(e,o){const r=typeof e.respuestas=="string"?JSON.parse(e.respuestas||"{}"):e.respuestas||{},t=e.correccion&&typeof e.correccion=="string"?JSON.parse(e.correccion):e.correccion||{},a={};return o.forEach(n=>{const s=window.puntuacionExamen.puntosPregunta(n),i=window.puntuacionExamen.esCorrectaPregunta(r[n.id],n),c=t[n.id]||{};c.es_correcta!==void 0&&c.es_correcta!==null?a[n.id]={es_correcta:c.es_correcta,puntos:c.puntos!=null?c.puntos:c.es_correcta?s:0,comentario:c.comentario||""}:n.tipo==="respuesta_corta"||n.tipo==="texto_largo"?a[n.id]={es_correcta:null,puntos:0,comentario:""}:a[n.id]={es_correcta:i,puntos:i?s:0,comentario:""}}),a},_renderizar(e){const o=this._examen,r=this._preguntas,t=this._intentos,a=t.filter(c=>c.corregido).length,n=t.length,s=n>0?Math.round(a/n*100):0;e.innerHTML=`
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="vista-cabecera corregir-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono" id="btnVolver" aria-label="Volver a ex\xE1menes">${window.Iconos.render("arrow-left")}</button>
              <div>
                <h1>${window.Iconos.render("clipboard-check")} Corregir: ${window.helpers.escapeHtml(o.titulo)} <button class="info-ayuda" data-guia="corregir" aria-label="Gu\xEDa de correcci\xF3n">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>

          <div class="corregir-progreso">
            <div class="corregir-progreso__barra"><div class="corregir-progreso__lleno" style="transform:scaleX(${Math.max(0,Math.min(1,s/100))})"></div></div>
            <span class="corregir-progreso__texto">${a}/${n}</span>
          </div>

          <p class="u-fs-xs u-color-texto-secundario" style="margin-bottom:var(--espaciado-md)">${window.Iconos.render("info")} ${r.length} preguntas \xB7 Toca un alumno para corregir</p>

          <div id="intentosLista" class="o-pila" style="gap:var(--espaciado-sm)"></div>
        </div>`;const i=e.querySelector("#intentosLista");t.length===0?i.innerHTML='<p class="u-color-texto-terciario">No hay intentos para corregir</p>':(i.innerHTML=t.map(c=>this._tarjetaAlumno(c,r)).join(""),this._alumnoAbierto&&this._renderDetalle(e,this._alumnoAbierto,r)),this._conectarEventos(e),window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(e),window.helpers.registrarGuias(e,{corregir:["Correcci\xF3n","Revisa las respuestas de cada alumno y asigna las puntuaciones pendientes.","Abre un alumno para corregir sus respuestas y guarda los cambios al terminar."]})},_tarjetaAlumno(e,o){const r=typeof e.respuestas=="string"?JSON.parse(e.respuestas||"{}"):e.respuestas||{},t=this._correcciones[e.id],a=window.puntuacionExamen.calcularConCorreccion(o,r,t),n=this._alumnoAbierto===e.id,s=window.helpers.nombreAlumno(e.perfiles),i=s.charAt(0).toUpperCase(),c=this._fmtFecha(e.fecha_completado||e.fecha_inicio),d=e.corregido&&e.nota!=null?parseFloat(e.nota):a.nota,l=d>=7?"corregir-card__nota--alta":d>=5?"corregir-card__nota--media":"corregir-card__nota--baja",u=e.perfiles?.foto_perfil||"",p=e.corregido&&!!e.corregido_por;return`
        <div class="corregir-card ${n?"corregir-card--abierta":""}" data-intento="${e.id}">
          <div class="corregir-card__header" data-toggle="${e.id}">
            <div class="corregir-card__avatar">${u?`<img src="${window.helpers.escapeHtml(u)}" alt="" width="40" height="40" loading="lazy" decoding="async">`:i}</div>
            <div class="corregir-card__info">
              <span class="corregir-card__nombre">${window.helpers.escapeHtml(s)}</span>
              <span class="corregir-card__fecha">${c}</span>
            </div>
            <span class="corregir-card__nota ${l}" id="preview_${e.id}">${d.toFixed(1)}</span>
            <span class="corregir-card__badge ${p?"corregir-card__badge--corregido":"corregir-card__badge--pendiente"}">${p?"Corregido":"Pendiente"}</span>
            <span class="corregir-card__chevron">${window.Iconos.render("chevron-down")}</span>
          </div>
          <div class="corregir-card__detalle" id="detalle_${e.id}"></div>
        </div>`},_renderDetalle(e,o,r){const t=e.querySelector("#detalle_"+o);if(!t)return;const a=this._intentos.find(i=>i.id===o);if(!a)return;const n=typeof a.respuestas=="string"?JSON.parse(a.respuestas||"{}"):a.respuestas||{},s=this._correcciones[o];t.innerHTML=`
        ${r.map((i,c)=>this._preguntaCorreccion(i,c,n[i.id],s[i.id],o)).join("")}
        <div class="corregir-final">
          <div>
            <p class="corregir-final__label">Comentario general</p>
            <textarea class="corregir-final__comentario" id="obs_${o}" rows="2" placeholder="Observaciones para el alumno...">${window.helpers.escapeHtml(a.observaciones||"")}</textarea>
          </div>
          <div class="corregir-final__nota-row">
            <span class="u-fs-sm u-fw-600">Nota final:</span>
            <input type="number" class="corregir-final__nota-input" id="nota_${o}" value="${a.corregido&&a.nota!=null?a.nota:window.puntuacionExamen.calcularConCorreccion(r,n,s).nota}" min="0" max="10" step="0.25" readonly aria-label="Nota calculada por el servidor" title="La nota final se calcula y valida en el servidor">
            <span class="u-fs-sm u-color-texto-terciario">/ 10</span>
            <button class="corregir-final__btn-enviar btn-calificar" data-intento="${o}">${window.Iconos.render("send")} Enviar correcci\xF3n</button>
          </div>
        </div>`,this._conectarDetalle(a,e),window.Iconos.actualizar()},_preguntaCorreccion(e,o,r,t,a){const n=window.puntuacionExamen.puntosPregunta(e);let s;e.tipo==="completar"&&e.huecos&&Array.isArray(e.huecos)&&e.huecos.length>0?s=this._renderCompletarCorreccion(e,r):s=window.helpers.escapeHtml(this._formatearRespuesta(e,r));let i="";e.tipo==="completar"&&e.huecos&&Array.isArray(e.huecos)&&e.huecos.length>0?i=`<p class="corregir-pregunta__correcta">Correctas: ${e.huecos.map(p=>window.helpers.escapeHtml(p.respuesta_correcta)).join(", ")}</p>`:(e.tipo==="respuesta_corta"||e.tipo==="completar")&&(i=`<p class="corregir-pregunta__correcta">Correcta: ${window.helpers.escapeHtml(e.respuesta_correcta)}</p>`);const c=t.es_correcta===null?"corregir-toggle__btn--auto":"",d=t.es_correcta===!0?"corregir-toggle__btn--correcta":"",l=t.es_correcta===!1?"corregir-toggle__btn--incorrecta":"",u=e.tipo==="completar"?"Completa la frase:":window.helpers.escapeHtml(e.texto);return`
        <div class="corregir-pregunta" data-pid="${e.id}">
          <div class="corregir-pregunta__numero">
            <span class="corregir-pregunta__num">${o+1}</span>
            <p class="corregir-pregunta__texto">${u}</p>
          </div>
          <div class="corregir-pregunta__respuesta">${s||'<em style="color:var(--color-texto-terciario)">Sin respuesta</em>'}</div>
          ${i}
          <div class="corregir-pregunta__acciones">
            <div class="corregir-toggle" data-pid="${e.id}">
              <button class="corregir-toggle__btn ${c}" data-campo="estado" data-valor="auto" data-pid="${e.id}">Auto</button>
              <button class="corregir-toggle__btn ${d}" data-campo="estado" data-valor="si" data-pid="${e.id}">${window.Iconos.render("check")} Correcta</button>
              <button class="corregir-toggle__btn ${l}" data-campo="estado" data-valor="no" data-pid="${e.id}">${window.Iconos.render("x")} Incorrecta</button>
            </div>
            <div class="corregir-puntos">
              <button class="corregir-puntos__btn" data-puntos-minus="${e.id}">\u2212</button>
              <span class="corregir-puntos__valor" data-puntos-valor="${e.id}">${t.puntos}</span>
              <button class="corregir-puntos__btn" data-puntos-plus="${e.id}">+</button>
              <span class="corregir-puntos__total">/ ${n}</span>
            </div>
          </div>
          <input type="text" class="corregir-pregunta__comentario" data-campo="comentario" data-pid="${e.id}" value="${window.helpers.escapeHtml(t.comentario||"")}" placeholder="Comentario para esta pregunta...">
        </div>`},_renderCompletarCorreccion(e,o){const r=/\{\{HUECO_(\d+)\}\}/g,t=Array.isArray(o)?o:[],a=window.puntuacionExamen.detalleCompletar(o,e);return'<span class="u-fs-sm">'+e.texto.split(r).map((s,i)=>{if(i%2===0)return window.helpers.escapeHtml(s);const c=parseInt(s),d=e.huecos.findIndex(_=>_.id===c);if(d===-1)return"";const l=a?a[d]:null,u=l&&l.esCorrecta?"color:var(--color-exito)":"color:var(--color-error)",p=l?l.respuestaUsuario:t[d]||"";return`<span style="${u};font-weight:600;border-bottom:2px solid ${l&&l.esCorrecta?"var(--color-exito)":"var(--color-error)"};padding:0 2px">[${window.helpers.escapeHtml(p||"\u2026")}]</span>`}).join("")+"</span>"},_conectarEventos(e){e.querySelector("#btnVolver").onclick=()=>router.irAtras(),e.querySelectorAll("[data-toggle]").forEach(o=>{o.onclick=()=>{const r=o.getAttribute("data-toggle");this._alumnoAbierto===r?this._alumnoAbierto=null:this._alumnoAbierto=r,this._renderizar(e)}})},_conectarDetalle(e,o){const r=e.id;o.querySelectorAll(".corregir-toggle[data-pid] .corregir-toggle__btn").forEach(t=>{t.onclick=()=>{const a=t.dataset.pid,n=t.dataset.valor;n==="auto"?this._correcciones[r][a].es_correcta=null:n==="si"?this._correcciones[r][a].es_correcta=!0:n==="no"&&(this._correcciones[r][a].es_correcta=!1),this._recalcular(r,o),t.closest(".corregir-toggle").querySelectorAll(".corregir-toggle__btn").forEach(i=>{i.classList.remove("corregir-toggle__btn--auto","corregir-toggle__btn--correcta","corregir-toggle__btn--incorrecta")}),n==="auto"?t.classList.add("corregir-toggle__btn--auto"):n==="si"?t.classList.add("corregir-toggle__btn--correcta"):n==="no"&&t.classList.add("corregir-toggle__btn--incorrecta")}}),o.querySelectorAll("[data-puntos-minus]").forEach(t=>{t.onclick=()=>{const a=t.dataset.puntosMinus,n=window.puntuacionExamen.puntosPregunta(this._preguntas.find(i=>i.id===a));this._correcciones[r][a].puntos=Math.max(0,(this._correcciones[r][a].puntos||0)-1);const s=o.querySelector(`[data-puntos-valor="${a}"]`);s&&(s.textContent=this._correcciones[r][a].puntos),this._recalcular(r,o)}}),o.querySelectorAll("[data-puntos-plus]").forEach(t=>{t.onclick=()=>{const a=t.dataset.puntosPlus,n=window.puntuacionExamen.puntosPregunta(this._preguntas.find(i=>i.id===a));this._correcciones[r][a].puntos=Math.min(n,(this._correcciones[r][a].puntos||0)+1);const s=o.querySelector(`[data-puntos-valor="${a}"]`);s&&(s.textContent=this._correcciones[r][a].puntos),this._recalcular(r,o)}}),o.querySelectorAll('.corregir-pregunta__comentario[data-campo="comentario"]').forEach(t=>{t.addEventListener("change",a=>{const n=a.target.dataset.pid;this._correcciones[r][n].comentario=a.target.value})}),o.querySelector('.btn-calificar[data-intento="'+r+'"]').onclick=async()=>{const t=o.querySelector('.btn-calificar[data-intento="'+r+'"]');t&&(t.disabled=!0);const a=parseFloat(o.querySelector("#nota_"+r)?.value||0),n=o.querySelector("#obs_"+r)?.value||"";try{const s=await window.examenesRepository.calificar(r,Math.min(10,Math.max(0,a)),n,this._usuario.id,this._correcciones[r]),i=Number(s?.nota??a);await window.adminRepository?.registrarAuditoria("examen:calificar",`Examen "${this._examen.titulo}" nota: ${i}`,this._usuario.id,this._usuario.grupo_id);const c=window.helpers.nombreAlumno(e.perfiles);try{await window.notasRepository?.crearPersonal(this._usuario.id,{titulo:`\u{1F4DD} ${c} \u2014 ${this._examen.titulo}`,contenido:`Nota: ${i}/10

${n?"Observaciones: "+n+`

`:""}Examen: ${this._examen.titulo}
Alumno: ${c}
Fecha: ${new Date().toLocaleDateString("es-ES")}`})}catch{}const d=(this._intentos||[]).find(l=>l.id===r);d&&d.alumno_id&&window.notificationService&&window.notificationService.emitir("examen.corregido",{examenId:this._examen.id,titulo:this._examen.titulo,nota:i,destinatarios:[d.alumno_id],datos:{examen_id:this._examen.id,alumno_id:d.alumno_id}}).catch(l=>console.warn("[Notif] calificaci\xF3n:",l.message)),window.helpers.mostrarAlerta(`Correcci\xF3n enviada. Nota validada por el servidor: ${i.toFixed(2)}/10.`,"exito"),router._ejecutar()}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error"),t&&(t.disabled=!1)}}},_recalcular(e,o){const r=this._preguntas,t=this._respuestasDe(e),a=window.puntuacionExamen.calcularConCorreccion(r,t,this._correcciones[e]),n=o.querySelector("#preview_"+e);n&&(n.textContent=a.nota.toFixed(1),n.className="corregir-card__nota "+(a.nota>=7?"corregir-card__nota--alta":a.nota>=5?"corregir-card__nota--media":"corregir-card__nota--baja"));const s=o.querySelector("#nota_"+e);s&&document.activeElement!==s&&(s.value=a.nota)},_respuestasDe(e){const o=(this._intentos||[]).find(r=>r.id===e);return o?typeof o.respuestas=="string"?JSON.parse(o.respuestas||"{}"):o.respuestas||{}:{}},_fmtFecha(e){if(!e)return"";const o=new Date(e),r=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],t=String(o.getHours()).padStart(2,"0"),a=String(o.getMinutes()).padStart(2,"0");return o.getDate()+" "+r[o.getMonth()]+" "+String(o.getFullYear()).slice(2)+", "+t+":"+a},_formatearRespuesta(e,o){if(o==null||o==="")return"(sin respuesta)";if(e.tipo==="multiple"||e.tipo==="opcion_unica"){const r=parseInt(o,10);return e.opciones&&e.opciones[r]!==void 0?e.opciones[r]:String(o)}if(e.tipo==="verdadero_falso")return o==="true"?"Verdadero":o==="false"?"Falso":String(o);if(e.tipo==="varias_opciones"){try{const r=JSON.parse(o);if(Array.isArray(r))return r.map(t=>e.opciones?.[t]||t).join(", ")}catch{}return String(o)}if(e.tipo==="relacionar"){try{const r=JSON.parse(o),t=Math.ceil((e.opciones||[]).length/2);return Object.entries(r).map(([a,n])=>`${e.opciones[Number(a)]||a} \u2192 ${e.opciones[t+Number(n)]||n}`).join(" | ")}catch{}return String(o)}if(e.tipo==="ordenar"){try{const r=JSON.parse(o);if(Array.isArray(r))return r.map(t=>e.opciones?.[t]||t).join(" \u2192 ")}catch{}return String(o)}return String(o)}}})();
