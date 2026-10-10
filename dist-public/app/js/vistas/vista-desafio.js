(function(){"use strict";const d=e=>window.helpers.escapeHtml(e),u=e=>window.Iconos.render(e),c=(e,a)=>a===void 0?document.querySelector(e):e.querySelector(a),_=(e,a)=>a===void 0?document.querySelectorAll(e):e.querySelectorAll(a),$=()=>window.ejerciciosMemorizacion,h={completar:"Completar palabras",ordenar:"Ordenar palabras",elegir_versiculo:"Elegir el vers\xEDculo",verdadero_falso:"Verdadero o falso",relacionar:"Relacionar",escrita:"Respuesta escrita"},b={completar:"edit-3",ordenar:"list-ordered",elegir_versiculo:"book-open",verdadero_falso:"check-circle",relacionar:"link-2",escrita:"pen-line"};function g(e){if(e&&e.foto_perfil)return`<img src="${d(e.foto_perfil)}" alt="" width="36" height="36" loading="lazy" decoding="async">`;const a=(e&&(e.nombre_completo||e.username)||"?").charAt(0).toUpperCase();return`<span>${d(a)}</span>`}function w(e){if(e==null)return"\u2014";const a=Math.max(0,Math.round(e/1e3)),s=Math.floor(a/60),o=a%60;return s>0?`${s}m ${String(o).padStart(2,"0")}s`:`${o}s`}window.vistaDesafio={_pollTimer:null,_juegoTimer:null,_enJuego:!1,_montada:!1,_salidaConfirmada:!1,async montar(e,a){const s=store.obtener("usuario");if(!s){router.navegar("/login");return}if(this._usuario=s,this._raiz=e,this._desafioId=a&&a.id,!this._desafioId){router.navegar("/grupos");return}this._detenerLoops(),this._desmontado=!1,this._montada=!0,this._salidaConfirmada=!1,this._enJuego=!1,e.innerHTML=`<div class="o-contenedor u-mt-3">${window.skeleton?window.skeleton.tarjetas(3):'<p class="u-color-texto-terciario">Cargando desaf\xEDo...</p>'}</div>`,await this._loop()},desmontar(){this._desmontado=!0,this._montada=!1,this._detenerLoops()},_hayPartidaActiva(){if(!this._montada)return!1;if(this._enJuego)return!0;if(!this._desafio)return!1;const e=this._desafio;if(e.estado!=="en_curso")return!1;const a=(e.participantes||[]).find(s=>s.usuario_id===(this._usuario&&this._usuario.id));return!(a&&["terminado","abandonado","rechazado"].includes(a.estado))},async _abandonarPartida(){if(!(!this._desafio||!this._usuario)){this._detenerLoops();try{await window.desafiosRepository.abandonar(this._desafio.id,this._usuario.id)}catch(e){console.warn("[Desaf\xEDo] Abandono:",e)}}},_detenerLoops(){this._pollTimer&&clearTimeout(this._pollTimer),this._juegoTimer&&clearInterval(this._juegoTimer),this._cuentaTimer&&(clearInterval(this._cuentaTimer),this._cuentaTimer=null),this._cuentaTimeout&&(clearTimeout(this._cuentaTimeout),this._cuentaTimeout=null),this._carreraTimer&&(clearInterval(this._carreraTimer),this._carreraTimer=null),this._pollTimer=null,this._juegoTimer=null},async _loop(){if(this._enJuego)return;let e;try{e=await window.desafiosRepository.obtenerDesafio(this._desafioId)}catch(o){if(this._desmontado)return;this._renderError(o.message);return}if(this._desmontado||!this._raiz||!this._raiz.isConnected)return;if(!e){this._renderError("El desaf\xEDo no existe.");return}this._desafio=e;const a=(e.participantes||[]).find(o=>o.usuario_id===this._usuario.id);if(!a&&e.estado!=="finalizado"){this._renderMensaje("Sin acceso","No participas en este desaf\xEDo.","lock");return}const s=Date.now();if(e.estado==="finalizado"){this._renderResultados(e);return}if(e.estado==="expirado"){this._renderMensaje("Invitaci\xF3n expirada","El desaf\xEDo no se acept\xF3 a tiempo. Puedes crear uno nuevo desde Grupos.","timer");return}if(e.estado==="cancelado"){this._renderCancelado(e);return}if(a&&a.estado==="eliminado"){this._renderMensaje("Fuiste eliminado del desaf\xEDo","El creador empez\xF3 con los que estaban listos.","user-x");return}if(e.estado==="invitacion"){a&&a.estado==="invitado"?this._renderInvitacion(e):this._renderEsperando(e,"Esperando a que todos acepten la invitaci\xF3n..."),this._pollTimer=setTimeout(()=>this._loop(),2500);return}if(e.estado==="en_curso"){if(a&&a.estado==="terminado"){this._renderEsperando(e,"Has terminado tu desaf\xEDo. Estamos esperando a que los dem\xE1s finalicen."),this._pollTimer=setTimeout(()=>this._loop(),2500);return}if(a&&["abandonado","rechazado"].includes(a.estado)){this._renderEsperando(e,"Has salido de este desaf\xEDo."),this._pollTimer=setTimeout(()=>this._loop(),2500);return}if(a&&a.estado==="invitado"){this._renderEsperando(e,"El desaf\xEDo ya ha comenzado. Puedes ver los resultados al finalizar."),this._pollTimer=setTimeout(()=>this._loop(),2500);return}const o=new Date(e.iniciado_en).getTime();if(!o||s<o){this._renderCuentaAtras(e,o),this._pollTimer=setTimeout(()=>this._loop(),400);return}if(a&&["aceptado","en_juego"].includes(a.estado)){const t=e.tiempo_limite_seg?e.tiempo_limite_seg*1e3:null;if(t&&s-o>=t){this._renderEsperando(e,"Se acab\xF3 el tiempo. Has terminado tu desaf\xEDo \u2014 esperando a los dem\xE1s."),this._pollTimer=setTimeout(()=>this._loop(),2500);return}this._empezarJuego(e);return}this._pollTimer=setTimeout(()=>this._loop(),2500);return}this._pollTimer=setTimeout(()=>this._loop(),2500)},_renderInvitacion(e){const a=(e.perfiles||{}).nombre_completo||"Alguien";this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-invitacion">
            <span class="desafio-invitacion__icono">${u("sword")}</span>
            <h2>\xA1Te han desafiado!</h2>
            <p class="desafio-invitacion__texto">${d(a)} te ha desafiado al mazo <strong>${d(e.mazo_nombre||"Memorizaci\xF3n")}</strong>.</p>
            <p class="u-fs-xs u-color-texto-terciario">Todos responder\xE9is las mismas preguntas, en el mismo orden y con el mismo tiempo.</p>
            <div class="desafio-invitacion__acciones">
              <button class="btn-primario" id="btnAceptar" style="justify-content:center">${u("check")} Aceptar</button>
              <button class="btn-secundario" id="btnRechazar" style="justify-content:center">${u("x")} Rechazar</button>
            </div>
          </div>
        </div>`,window.Iconos.actualizar();const s=c("#btnAceptar"),o=c("#btnRechazar");s.onclick=async()=>{s.disabled=!0,o.disabled=!0;try{(await window.desafiosRepository.responderInvitacion(e.id,this._usuario.id,!0)).empezado?this._loop():(window.helpers.mostrarAlerta("Has aceptado. Esperando a los dem\xE1s...","exito"),this._loop())}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error"),s.disabled=!1,o.disabled=!1}},o.onclick=async()=>{s.disabled=!0,o.disabled=!0;try{await window.desafiosRepository.responderInvitacion(e.id,this._usuario.id,!1),window.helpers.mostrarAlerta("Has rechazado el desaf\xEDo.","info"),router.navegar("/grupos")}catch(t){window.helpers.mostrarAlerta("Error: "+t.message,"error"),s.disabled=!1,o.disabled=!1}}},_renderEsperando(e,a){const s=this._usuario.id,o=e.creador_id===s,t=(e.participantes||[]).filter(n=>n.estado!=="eliminado"),i=o&&e.estado==="invitacion"&&t.length>=3,r=t.map(n=>{const f=n.estado==="terminado"?"--ok":n.estado==="aceptado"||n.estado==="en_juego"?"--activo":"--espera";return`
          <div class="desafio-espera__jugador">
            <span class="desafio-espera__avatar">${g(n.perfil||{})}</span>
            <span class="desafio-espera__nombre">${d(n.perfil&&(n.perfil.nombre_completo||n.perfil.username)||"Jugador")}${n.usuario_id===s?" (t\xFA)":""}</span>
            <span class="desafio-espera__jugador-der">
              <span class="desafio-estado desafio-estado${f}">
                ${n.estado==="terminado"?u("check")+" Terminado":n.estado==="aceptado"?u("user-check")+" Listo":n.estado==="en_juego"?u("activity")+" Jugando":u("clock")+" Pendiente"}
              </span>
              ${n.estado==="invitado"&&i?`<button class="desafio-espera__eliminar" data-eliminar="${n.usuario_id}" title="Eliminar del desaf\xEDo">${u("user-x")} Eliminar</button>`:""}
            </span>
          </div>`}).join("");this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-espera">
            <div class="desafio-espera__anim">
              <span class="desafio-espera__punto"></span><span class="desafio-espera__punto"></span><span class="desafio-espera__punto"></span>
            </div>
            <h2>${u("sword")} ${d(e.mazo_nombre||"Desaf\xEDo")}</h2>
            <p class="desafio-espera__msg">${d(a)}</p>
            <div class="desafio-espera__jugadores">${r}</div>
            <button class="btn-secundario" id="btnSalirDesafio" style="justify-content:center">${u("log-out")} Salir</button>
          </div>
        </div>`,window.Iconos.actualizar(),c("#btnSalirDesafio").onclick=async()=>{await window.helpers.confirmar("\xBFSalir del desaf\xEDo?",{titulo:"Salir",textoConfirmar:"Salir"})&&(this._salidaConfirmada=!0,await window.desafiosRepository.abandonar(e.id,this._usuario.id).catch(()=>{}),router.navegar("/grupos"))},this._raiz.querySelectorAll("[data-eliminar]").forEach(n=>{n.onclick=async()=>{const f=n.dataset.eliminar;await window.helpers.confirmar("\xBFEliminar a este jugador del desaf\xEDo? No podr\xE1 aceptar el reto y podr\xE1s empezar con los que est\xE9n listos.",{titulo:"Eliminar jugador",textoConfirmar:"Eliminar"})&&(n.disabled=!0,await window.desafiosRepository.eliminarInvitado(e.id,f).catch(()=>{}),window.helpers.mostrarAlerta("Jugador eliminado. Puedes empezar con los que est\xE9n listos.","exito"),this._loop())}})},_renderCuentaAtras(e,a){this._cuentaTimer&&(clearInterval(this._cuentaTimer),this._cuentaTimer=null),this._cuentaTimeout&&(clearTimeout(this._cuentaTimeout),this._cuentaTimeout=null),this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-cuenta">
            <p class="desafio-cuenta__mazo">${u("layers")} ${d(e.mazo_nombre||"Desaf\xEDo")}</p>
            <p class="desafio-cuenta__label">Empieza en</p>
            <div class="desafio-cuenta__numero" id="cuentaNumero">3</div>
            <p class="desafio-cuenta__sub" id="cuentaSub">Prepara tu mente...</p>
          </div>
        </div>`,window.Iconos.actualizar();const s=c("#cuentaNumero"),o=c("#cuentaSub");Number.isFinite(a)||(a=Date.now());const t=()=>{if(this._enJuego){clearInterval(this._cuentaTimer),this._cuentaTimer=null;return}const i=a-Date.now();if(i<=0){clearInterval(this._cuentaTimer),this._cuentaTimer=null,s.textContent="\xA1Ya!",o.textContent="Comienza...",this._cuentaTimeout=setTimeout(()=>{this._cuentaTimeout=null,this._enJuego||this._empezarJuego(this._desafio)},400);return}const r=Math.ceil(i/1e3);s.textContent=String(Math.min(3,r)),r<=1&&(o.textContent="\xA1Prep\xE1rate!")};t(),this._cuentaTimer=setInterval(t,200)},_empezarJuego(e){if(this._enJuego)return;this._enJuego=!0,this._detenerLoops(),window.desafiosRepository.marcarEnJuego(e.id).catch(()=>{});let a=new Date(e.iniciado_en).getTime();(!Number.isFinite(a)||a<=0)&&(a=Date.now()),this._estado={desafio:e,ejercicios:e.sesion||[],idx:0,correctas:0,incorrectas:0,respuestas:{},inicioMs:a,tiempoLimiteMs:e.tiempo_limite_seg?e.tiempo_limite_seg*1e3:null},e.finaliza_primer_terminado&&!this._carreraTimer&&(this._carreraTimer=setInterval(()=>this._chequearFinCarrera(),5e3));const s=(e.participantes||[]).find(t=>t.usuario_id===this._usuario.id),o=s&&s.progreso;o&&Number.isInteger(o.idx)&&o.idx>0&&o.idx<=this._estado.ejercicios.length&&(this._estado.idx=o.idx,this._estado.correctas=Math.min(Number(o.correctas)||0,this._estado.ejercicios.length),this._estado.incorrectas=Math.min(Number(o.incorrectas)||0,this._estado.ejercicios.length)),this._pintarJuego()},_pintarJuego(){const e=this._estado;this._raiz.innerHTML=`
        <div class="o-contenedor mem-juego-sesion desafio-juego">
          <div class="mem-juego-sesion__barra desafio-juego__barra">
            <span class="desafio-timer${e.tiempoLimiteMs?"":" desafio-timer--ilimitado"}" id="desafioTimer">${w(e.tiempoLimiteMs?Math.max(0,e.tiempoLimiteMs-(Date.now()-e.inicioMs)):Date.now()-e.inicioMs)}</span>
            <div class="mem-juego-sesion__track" aria-hidden="true"><div class="mem-juego-sesion__fill" id="fill" style="transform:scaleX(${e.ejercicios.length?1/e.ejercicios.length:0})"></div></div>
            <span class="desafio-progreso" id="desafioProgreso">1/${e.ejercicios.length}</span>
          </div>
          <p class="desafio-juego__vs">${u("sword")} Contra ${d(e.desafio.participantes.filter(a=>a.usuario_id!==this._usuario.id).map(a=>a.perfil&&(a.perfil.nombre_completo||a.perfil.username)||"Jugador").join(", "))}</p>
          <div id="slot" class="o-pila" style="flex:1;min-height:300px"></div>
          <button class="btn-secundario desafio-juego__salir" id="btnSalirJuego" style="justify-content:center">${u("log-out")} Salir del desaf\xEDo</button>
        </div>`,window.Iconos.actualizar(),c("#btnSalirJuego").onclick=async()=>{await window.helpers.confirmar("\xBFSalir del desaf\xEDo? Se contar\xE1 como abandono.",{titulo:"Salir",textoConfirmar:"Salir"})&&(this._salidaConfirmada=!0,this._detenerLoops(),await window.desafiosRepository.abandonar(e.desafio.id,this._usuario.id).catch(()=>{}),router.navegar("/grupos"))},this._juegoTimer=setInterval(()=>{const a=c("#desafioTimer");if(e.tiempoLimiteMs){const s=e.tiempoLimiteMs-(Date.now()-e.inicioMs);a&&(a.textContent=w(s),a.classList.toggle("desafio-timer--peligro",s<15e3)),s<=0&&this._finJuego(!0)}else a&&(a.textContent=w(Date.now()-e.inicioMs))},250),this._ejercicio()},_ejercicio(){const e=this._estado,a=c("#slot");if(!a)return;const s=e.ejercicios[e.idx];if(!s){this._finJuego(!1);return}const o=c("#fill");o&&(o.style.transform=`scaleX(${e.ejercicios.length?(e.idx+1)/e.ejercicios.length:0})`);const t=c("#desafioProgreso");t&&(t.textContent=`${e.idx+1}/${e.ejercicios.length}`);const i=this._renderers[s.tipo];i?i.call(this,a,s):(e.idx++,this._ejercicio())},async _feedback(e,a,s,o=null){const t=this._estado;let i=o;try{i=await window.desafiosRepository.comprobarRespuesta(t.desafio.id,a.id,s)}catch{window.helpers.mostrarAlerta("No se pudo comprobar la respuesta. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.","advertencia"),this._ejercicio();return}t.respuestas[a.id]=s,i?t.correctas++:t.incorrectas++,this._guardarProgreso(),window.haptica&&(i?window.haptica.logro():window.haptica.fallo());const r=i?"":"La respuesta no coincide con la soluci\xF3n.",p=document.createElement("div");p.className=`mem-juego-feedback mem-juego-feedback--${i?"ok":"ko"}`,p.innerHTML=`
        <p class="mem-juego-feedback__titulo">${i?u("check-circle")+" \xA1Correcto!":u("x-circle")+" Casi..."}</p>
        <p class="mem-juego-feedback__respuesta"><strong>${i?"":"Respuesta: "}</strong>${i?"":d(String(r||""))}</p>
        ${a.referencia?`<p class="mem-juego-feedback__ref">${u("book-open")} ${d(a.referencia)}</p>`:""}
        ${a.explicacion?`<p class="mem-juego-feedback__expl">${d(a.explicacion)}</p>`:""}`,window.Iconos.actualizar();const n=document.createElement("button");n.className="mem-juego-continuar",n.innerHTML=`${u("arrow-right")} Continuar`,n.onclick=()=>{t.idx++,this._ejercicio()},e.appendChild(p),e.appendChild(n),n.scrollIntoView({behavior:"smooth",block:"nearest"})},_guardarProgreso(){const e=this._estado;if(!e)return;const a=Math.min(e.idx+1,e.ejercicios.length);window.desafiosRepository.guardarProgreso(e.desafio.id,this._usuario.id,{idx:a,correctas:e.correctas,incorrectas:e.incorrectas}).catch(()=>{})},_finJuego(e){if(!this._enJuego)return;this._enJuego=!1,this._detenerLoops();const a=this._estado,s=a.ejercicios.length,o=a.correctas,t=Date.now()-a.inicioMs,i=!!(this._desafio&&this._desafio.finaliza_primer_terminado);this._renderEsperando(this._desafio,e?"Se acab\xF3 el tiempo. Has terminado tu desaf\xEDo \u2014 esperando a los dem\xE1s.":i?"\xA1Has terminado! Mostrando resultados...":"Has terminado tu desaf\xEDo. Estamos esperando a que los dem\xE1s finalicen."),window.desafiosRepository.terminarJugador(a.desafio.id,this._usuario.id,{respuestas:a.respuestas,tiempoMs:t}).then(()=>{this._pollTimer=setTimeout(()=>this._loop(),1500)}).catch(()=>{this._pollTimer=setTimeout(()=>this._loop(),1500)})},async _chequearFinCarrera(){if(!(!this._enJuego||!this._desafioId))try{const e=await window.desafiosRepository.obtenerDesafio(this._desafioId);if(!e||this._desmontado||!this._enJuego)return;if(e.estado==="finalizado"){this._enJuego=!1,this._detenerLoops(),this._renderResultados(e);return}if(e.estado==="en_curso"&&(e.participantes||[]).some(s=>s.usuario_id!==this._usuario.id&&s.estado==="terminado")){this._enJuego=!1,this._detenerLoops();const s=this._estado,o=Date.now()-s.inicioMs;this._renderEsperando(this._desafio,"Tu rival ha terminado. Mostrando resultados..."),window.desafiosRepository.terminarJugador(this._desafioId,this._usuario.id,{respuestas:s.respuestas,tiempoMs:o}).then(()=>{this._pollTimer=setTimeout(()=>this._loop(),1200)}).catch(()=>{this._pollTimer=setTimeout(()=>this._loop(),1200)})}}catch{}},_renderResultados(e){const a=(e.participantes||[]).map(l=>({...l,perfil:l.perfil||{},abandonado:l.estado==="abandonado"||l.estado==="rechazado"||l.estado==="eliminado"})),s=a.filter(l=>!l.abandonado),o=e.finaliza_primer_terminado===!0,t=[...s].sort((l,m)=>o?(l.tiempo_ms||1/0)!==(m.tiempo_ms||1/0)?(l.tiempo_ms||1/0)-(m.tiempo_ms||1/0):(m.correctas||0)-(l.correctas||0):(m.correctas||0)!==(l.correctas||0)?(m.correctas||0)-(l.correctas||0):(l.tiempo_ms||1/0)-(m.tiempo_ms||1/0)),i=t.length?t[0]:null,r=s.length>=2&&s.every(l=>(l.correctas||0)===(s[0].correctas||0)),p=r&&(s[0].correctas||0)===(s[0].total||0)&&(s[0].total||0)>0,n=a.find(l=>l.usuario_id===this._usuario.id),f=a.map(l=>{const m=t.indexOf(l),j=!r&&m===0&&!l.abandonado?'<span class="desafio-medalla">\u{1F947}</span>':"";return`
          <div class="desafio-resultado__fila${l.abandonado?" desafio-resultado__fila--abandonado":""}">
            <span class="desafio-resultado__avatar">${g(l.perfil)}</span>
            <span class="desafio-resultado__nombre">${d(l.perfil.nombre_completo||l.perfil.username||"Jugador")}${l.usuario_id===this._usuario.id?' <span class="grupos-miembro__tu">(t\xFA)</span>':""} ${j}</span>
            <span class="desafio-resultado__puntos">${l.estado==="eliminado"?"Eliminado":l.abandonado?"Abandon\xF3":`${l.correctas||0}/${l.total||0}`}</span>
            <span class="desafio-resultado__tiempo">${l.abandonado?"\u2014":w(l.tiempo_ms)}</span>
          </div>`}).join("");this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-resultado">
            <span class="desafio-resultado__trofeo">${u("trophy")}</span>
            <h2>Resultado</h2>
            <p class="desafio-resultado__mazo">${d(e.mazo_nombre||"Desaf\xEDo")}</p>

            ${r?`
            <div class="desafio-resultado__ganador desafio-resultado__empate ${p?"desafio-resultado__empate--verde":"desafio-resultado__empate--naranja"}">
              <div class="desafio-resultado__empate-avatares">
                ${s.map(l=>`<span class="desafio-resultado__ganador-avatar">${g(l.perfil)}</span>`).join("")}
              </div>
              <p class="desafio-resultado__ganador-nombre">${u("handshake")} Empate</p>
              <p class="desafio-resultado__ganador-meta">${s.map(l=>d(l.perfil.nombre_completo||l.perfil.username||"Jugador")).join(" \xB7 ")} \xB7 ${s[0].correctas||0}/${s[0].total||0}</p>
            </div>`:i?`
            <div class="desafio-resultado__ganador">
              <span class="desafio-resultado__ganador-avatar">${g(i.perfil)}</span>
              <p class="desafio-resultado__ganador-nombre">Ganador \xB7 ${d(i.perfil.nombre_completo||i.perfil.username||"Jugador")}</p>
              <p class="desafio-resultado__ganador-meta">${i.correctas||0}/${i.total||0} \xB7 ${w(i.tiempo_ms)}</p>
            </div>`:""}

            <div class="desafio-resultado__tabla">${f}</div>

            <div class="desafio-resultado__acciones">
              <button class="btn-primario" id="btnVolverJugar" style="justify-content:center">${u("rotate-ccw")} Volver a jugar</button>
              <button class="btn-secundario" id="btnRevancha" style="justify-content:center">${u("sword")} Revancha</button>
              <button class="btn-secundario" id="btnOtroMazo" style="justify-content:center">${u("layers")} Elegir otro mazo</button>
              <button class="btn-secundario" id="btnSalirResultado" style="justify-content:center">${u("log-out")} Salir</button>
            </div>
          </div>
        </div>`,window.Iconos.actualizar();const v=a.filter(l=>l.usuario_id!==this._usuario.id&&!l.abandonado),y=async l=>{try{if(!v.length){window.helpers.mostrarAlerta("No hay rivales disponibles para volver a jugar.","advertencia");return}const m=await window.desafiosRepository.listarMazosDesafio(),j=m.find(k=>k.id===e.mazo_id)||m[0];if(!j){window.helpers.mostrarAlerta("El mazo ya no est\xE1 disponible.","advertencia");return}const T=await window.memorizacionRepository.listarTarjetas(null,j.id),z=$().construirSesion(T,T,{maxTarjetas:10}),x=await window.desafiosRepository.crearDesafio({creador:this._usuario,participantes:v,mazo:j,sesion:z,iniciarInmediato:l,tiempoLimiteSeg:e.tiempo_limite_seg,finalizaPrimerTerminado:e.finaliza_primer_terminado===!0});window.helpers.mostrarAlerta(l?"\xA1Nuevo desaf\xEDo en marcha!":"Revancha enviada. Esperando aceptaci\xF3n...","exito"),this._desafioId=x.id,this._detenerLoops(),await this._loop()}catch(m){window.helpers.mostrarAlerta("Error: "+m.message,"error")}};c("#btnVolverJugar").onclick=()=>y(!0),c("#btnRevancha").onclick=()=>y(!1),c("#btnOtroMazo").onclick=()=>router.navegar("/grupos"),c("#btnSalirResultado").onclick=()=>router.navegar("/grupos")},_renderCancelado(e){const a=this._usuario.id,s=e.participantes||[],o=s.find(n=>n.estado==="rechazado"),t=o&&o.usuario_id===a,i=o&&o.perfil?o.perfil.nombre_completo||o.perfil.username:null,r=s.filter(n=>n.usuario_id!==a&&n.estado!=="rechazado"&&n.estado!=="eliminado");this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-cancelado">
            <span class="desafio-cancelado__icono">${u(t?"x":"x-circle")}</span>
            <h2>${t?"Rechazaste el desaf\xEDo":"Desaf\xEDo cancelado"}</h2>
            <p class="desafio-cancelado__mazo">${d(e.mazo_nombre||"Desaf\xEDo")}</p>
            ${o?`
            <p class="desafio-cancelado__quien">
              <span class="desafio-cancelado__avatar">${g(o.perfil||{})}</span>
              <span>${t?"T\xFA rechazaste la invitaci\xF3n.":`${d(i||"Un participante")} rechaz\xF3 la invitaci\xF3n.`}</span>
            </p>`:""}
            ${!t&&r.length?`
            <div class="desafio-cancelado__rivales">
              <p class="desafio-cancelado__rivales-titulo">Estos jugadores s\xED estaban listos:</p>
              <div class="desafio-cancelado__chips">
                ${r.map(n=>`
                  <span class="desafio-cancelado__chip">${g(n.perfil||{})} ${d(n.perfil&&(n.perfil.nombre_completo||n.perfil.username)||"Jugador")}</span>`).join("")}
              </div>
            </div>`:""}
            <div class="desafio-cancelado__acciones">
              ${!t&&r.length?`<button class="btn-primario" id="btnRetoListos" style="justify-content:center">${u("sword")} Retar a los listos</button>`:""}
              <button class="btn-secundario" id="btnCanceladoGrupos" style="justify-content:center">${u("users")} Ir a Grupos</button>
            </div>
          </div>
        </div>`,window.Iconos.actualizar(),c("#btnCanceladoGrupos").onclick=()=>router.navegar("/grupos");const p=c("#btnRetoListos");p&&(p.onclick=async()=>{p.disabled=!0;try{const n=await window.desafiosRepository.listarMazosDesafio(),f=n.find(m=>m.id===e.mazo_id)||n[0];if(!f){window.helpers.mostrarAlerta("El mazo ya no est\xE1 disponible.","advertencia");return}const v=await window.memorizacionRepository.listarTarjetas(null,f.id),y=$().construirSesion(v,v,{maxTarjetas:10}),l=await window.desafiosRepository.crearDesafio({creador:this._usuario,participantes:r,mazo:f,sesion:y,tiempoLimiteSeg:e.tiempo_limite_seg,finalizaPrimerTerminado:e.finaliza_primer_terminado===!0});window.helpers.mostrarAlerta("Nuevo desaf\xEDo enviado a los que estaban listos.","exito"),this._desafioId=l.id,this._detenerLoops(),await this._loop()}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}})},_renderMensaje(e,a,s){this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-mensaje">
            <span class="desafio-mensaje__icono">${u(s||"info")}</span>
            <h2>${d(e)}</h2>
            <p>${d(a)}</p>
            <button class="btn-primario" id="btnIrGrupos" style="justify-content:center">${u("users")} Ir a Grupos</button>
          </div>
        </div>`,window.Iconos.actualizar(),c("#btnIrGrupos").onclick=()=>router.navegar("/grupos")},_renderError(e){this._raiz.innerHTML=`
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-mensaje">
            <span class="desafio-mensaje__icono">${u("alert-triangle")}</span>
            <h2>No se pudo cargar el desaf\xEDo</h2>
            <p>${d(e)}</p>
            <button class="btn-primario" id="btnReintentar" style="justify-content:center">Reintentar</button>
          </div>
        </div>`,window.Iconos.actualizar(),c("#btnReintentar").onclick=()=>this._loop()},_renderers:{completar(e,a){const s=this._estado,o={};(()=>{e.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
              ${a.referencia?`<p class="mem-juego-tarjeta__ref">${d(a.referencia)}</p>`:""}
              <div class="mem-juego-completar">
                ${a.enunciado.split(" ").map((i,r)=>{if(i!=="_____")return`<span>${d(i)}</span>`;const p=Object.keys(o).length;return`<input type="text" class="mem-juego-hueco" data-hueco="${p}" placeholder="..." value="${d(o[p]||"")}" autocomplete="off">`}).join(" ")}
              </div>
              ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`,window.Iconos.actualizar(),_(e,".mem-juego-hueco").forEach(i=>{i.addEventListener("input",()=>{o[i.dataset.hueco]=i.value})}),c(e,"[data-pista]")?.addEventListener("click",()=>{const i=c(e,"[data-pista-box]");i&&(i.style.display=i.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{const i=[..._(e,".mem-juego-hueco")].map(r=>r.value||"");_(e,".mem-juego-hueco").forEach(r=>{r.disabled=!0}),c(e,"#btnResp").remove(),this._feedback(e,a,i)}})()},ordenar(e,a){const s=[...a.palabras],o=[],t=()=>{e.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
              ${a.referencia?`<p class="mem-juego-tarjeta__ref">${d(a.referencia)}</p>`:""}
              <div class="mem-juego-ordenar">
                <div class="mem-juego-frase" id="frase"></div>
                <div class="mem-juego-palabras" id="palabras">
                  ${s.map((r,p)=>`<button class="mem-juego-palabra" data-idx="${p}">${d(r)}</button>`).join("")}
                </div>
              </div>
              ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${o.length===0?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar();const i=c(e,"#frase");i.innerHTML=o.map((r,p)=>`<span class="mem-juego-frase__palabra" data-pos="${p}">${d(r)}</span>`).join("")+(o.length===0?'<span class="mem-juego-sub">Toca las palabras aqu\xED...</span>':""),_(e,".mem-juego-palabra").forEach(r=>{r.onclick=()=>{const p=parseInt(r.dataset.idx,10),n=s.splice(p,1)[0];o.push(n),t()}}),_(e,".mem-juego-frase__palabra").forEach(r=>{r.onclick=()=>{const p=parseInt(r.dataset.pos,10),n=o.splice(p,1)[0];s.push(n),t()}}),c(e,"[data-pista]")?.addEventListener("click",()=>{const r=c(e,"[data-pista-box]");r&&(r.style.display=r.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{i.innerHTML=a.palabras.map(r=>`<span class="mem-juego-frase__palabra">${d(r)}</span>`).join(""),c(e,"#btnResp").remove(),this._feedback(e,a,o)}};t()},elegir_versiculo(e,a){let s=null;const o=()=>{e.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${d(a.enunciado)}</p>
              <div class="mem-juego-opciones">
                ${a.opciones.map((t,i)=>`
                  <button class="mem-juego-opcion ${s===i?"mem-juego-opcion--sel":""}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${String.fromCharCode(65+i)}</span>
                    <span>${d(t)}</span>
                  </button>`).join("")}
              </div>
              ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${s===null?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar(),_(e,".mem-juego-opcion").forEach(t=>{t.onclick=()=>{s=parseInt(t.dataset.opt,10),o()}}),c(e,"[data-pista]")?.addEventListener("click",()=>{const t=c(e,"[data-pista-box]");t&&(t.style.display=t.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{_(e,".mem-juego-opcion").forEach(t=>{t.disabled=!0}),c(e,"#btnResp").remove(),this._feedback(e,a,a.opciones[s])}};o()},verdadero_falso(e,a){let s=null;const o=["Verdadero","Falso"],t=()=>{e.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${d(a.enunciado)}</p>
              ${a.referencia?`<p class="mem-juego-tarjeta__ref">${d(a.referencia)}</p>`:""}
              <div class="mem-juego-opciones">
                ${o.map((i,r)=>`
                  <button class="mem-juego-opcion ${s===r?"mem-juego-opcion--sel":""}" data-opt="${r}">
                    <span class="mem-juego-opcion__letra">${u(r===0?"check":"x")}</span>
                    <span>${i}</span>
                  </button>`).join("")}
              </div>
              ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${s===null?"disabled":""}>Comprobar</button>
            </div>`,window.Iconos.actualizar(),_(e,".mem-juego-opcion").forEach(i=>{i.onclick=()=>{s=parseInt(i.dataset.opt,10),t()}}),c(e,"[data-pista]")?.addEventListener("click",()=>{const i=c(e,"[data-pista-box]");i&&(i.style.display=i.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{_(e,".mem-juego-opcion").forEach(i=>{i.disabled=!0}),c(e,"#btnResp").remove(),this._feedback(e,a,o[s])}};t()},relacionar(e,a){const s={};let o=null;const t=()=>{e.innerHTML=`
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
              <div class="mem-juego-relacionar">
                <div class="mem-juego-rel-col">
                  ${a.izquierda.map((i,r)=>{const p=$().limpiar(i),n=s[p];return`<button class="mem-juego-rel-item ${o===r?"mem-juego-rel-item--sel":""}${n?" mem-juego-rel-item--disabled":""}" data-izq="${r}">${d(i)}</button>`}).join("")}
                </div>
                <div class="mem-juego-rel-col">
                  ${a.derecha.map((i,r)=>`<button class="mem-juego-rel-item ${Object.keys(s).some(n=>s[n]===i)?"mem-juego-rel-item--disabled":""}" data-der="${r}">${d(i)}</button>`).join("")}
                </div>
              </div>
              ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`,window.Iconos.actualizar(),_(e,".mem-juego-rel-item[data-izq]").forEach(i=>{i.onclick=()=>{const r=parseInt(i.dataset.izq,10);s[$().limpiar(a.izquierda[r])]||(o=o===r?null:r,t())}}),_(e,".mem-juego-rel-item[data-der]").forEach(i=>{i.onclick=()=>{const r=parseInt(i.dataset.der,10);if(o===null)return;const p=$().limpiar(a.izquierda[o]);s[p]||(s[p]=a.derecha[r],o=null,t())}}),c(e,"[data-pista]")?.addEventListener("click",()=>{const i=c(e,"[data-pista-box]");i&&(i.style.display=i.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{_(e,".mem-juego-rel-item").forEach(i=>{i.disabled=!0}),c(e,"#btnResp").remove(),this._feedback(e,a,s)}};t()},escrita(e,a){let s="";const o=()=>{const t=c(e,"#btnResp");if(!t)return;const i=s.trim().length>0;t.disabled=!i,i?t.classList.remove("btn-desactivado"):t.classList.add("btn-desactivado")};e.innerHTML=`
          <div class="mem-juego-tarjeta">
            <span class="mem-juego-tipo">${u(b[a.tipo])} ${h[a.tipo]}</span>
            <p class="mem-juego-tarjeta__instruccion">${d(a.instruccion)}</p>
            <p class="mem-juego-tarjeta__enunciado">${d(a.enunciado)}</p>
            <div class="mem-juego-escrita">
              <input type="text" class="mem-juego-input" id="txtResp" value="" placeholder="Escribe aqu\xED..." autocomplete="off">
            </div>
            ${a.referencia?`<p class="mem-juego-tarjeta__ref">${d(a.referencia)}</p>`:""}
            ${a.pista?`<button class="mem-juego-pista" data-pista>${u("lightbulb")} Pista</button>`:""}
            <div class="mem-juego-pista__box" data-pista-box style="display:none">${d(a.pista)}</div>
            <button class="mem-juego-continuar btn-desactivado" id="btnResp" disabled>Comprobar</button>
          </div>`,window.Iconos.actualizar(),c(e,"#txtResp").addEventListener("input",t=>{s=t.target.value,o()}),c(e,"[data-pista]")?.addEventListener("click",()=>{const t=c(e,"[data-pista-box]");t&&(t.style.display=t.style.display==="none"?"block":"none")}),c(e,"#btnResp").onclick=()=>{const t=c(e,"#txtResp");t.disabled=!0,c(e,"#btnResp").remove(),this._feedback(e,a,s)}}}}})();
