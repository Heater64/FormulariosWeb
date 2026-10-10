(function(){"use strict";const t=e=>window.Iconos.render(e),d=e=>window.helpers.escapeHtml(e);function C(e,a){const i=new FileReader;i.onload=o=>{const r=o.target.result,s=new Image;s.src=r,s.onload=()=>{const n=Math.min(s.width,s.height,400),p=document.createElement("canvas");p.width=n,p.height=n;const l=p.getContext("2d"),f=(s.width-n)/2,c=(s.height-n)/2;l.drawImage(s,f,c,n,n,0,0,n,n),a(p.toDataURL("image/jpeg",.85))},s.onerror=()=>a(r)},i.readAsDataURL(e)}function E(e){return{owner:"Propietario",admin:"Administrador",editor:"Profesor",usuario:"Alumno"}[e]||e}function v(e,a,i,o,r){return`
      <a class="perfil-fila-nav" href="${r?o:`#!${o}`}">
        <span class="perfil-fila-nav__icono">${t(e)}</span>
        <span class="perfil-fila-nav__texto">
          <span class="perfil-fila-nav__label">${d(a)}</span>
          ${i?`<span class="perfil-fila-nav__desc">${d(i)}</span>`:""}
        </span>
        <span class="perfil-fila-nav__flecha">${t("chevron-right")}</span>
      </a>`}function g(e){const a=location.pathname.startsWith("/app");return`${a?"../":"./"}${e}.html?volver=${encodeURIComponent(a?"../app/#!/perfil":"./index.html#!/perfil")}`}function w(e,a,i="perfil-config",o="settings"){return`
      <header class="perfil-subcabecera vista-cabecera">
        <div class="vista-cabecera__principal">
          <button class="btn-icono perfil-subcabecera__volver" data-volver aria-label="Volver al perfil">${t("arrow-left")}</button>
          <div class="perfil-subcabecera__texto">
            <h1 class="perfil-subcabecera__titulo">${t(o)} ${d(e)} <button class="info-ayuda" data-guia="${i}" aria-label="Gu\xEDa de ${d(e)}">i</button></h1>
          </div>
        </div>
        <div class="vista-cabecera__acciones">
          ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
        </div>
      </header>`}async function _(e,a,i){if(!e)return;const o={...e.preferencias||{},[a]:i};if(e.preferencias=o,store.actualizar("usuario",{...e}),localStorage.setItem("fb_usuario",JSON.stringify(e)),window.preferencias&&["tema","alto_contraste","letra_grande"].includes(a)&&window.preferencias.guardar(o),window.supabaseClient)try{await window.supabaseClient.from("perfiles").update({preferencias:JSON.stringify(o)}).eq("id",e.id)}catch{}}const y={apariencia:{icono:"palette",titulo:"Apariencia",desc:"Modo, contraste y tama\xF1o de texto"},notificaciones:{icono:"bell",titulo:"Notificaciones",desc:"Avisos y sonidos de la app"},privacidad:{icono:"eye-off",titulo:"Privacidad",desc:"Qu\xE9 puede verse de tu perfil"},almacenamiento:{icono:"database",titulo:"Almacenamiento",desc:"Cach\xE9, datos temporales y sincronizaci\xF3n"},seguridad:{icono:"lock",titulo:"Seguridad",desc:"Contrase\xF1a, sesi\xF3n y zona de peligro"}};window.vistaPerfil={montar(e,a={}){const i=store.obtener("usuario");if(!i){router.navegar("/login");return}const o=router.pathActual(),r=a.seccion;o.startsWith("/perfil/config/")?this._montarConfig(e,i,r):o.startsWith("/perfil/acerca/")?this._montarAcerca(e,i,r):this._montarPrincipal(e,i)},desmontar(){},_montarPrincipal(e,a){const i=(a.rol||"").trim().toLowerCase(),o=i==="admin"||i==="owner",r=a.preferencias||{},s=(r.descripcion||r.frase||"").trim(),n=window.__FB_APP_VERSION__?.version||"\u2014";if(e.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg perfil-root" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">

          <header class="vista-cabecera perfil-cabecera">
            <div class="vista-cabecera__principal">
              <h1>${t("user")} Perfil <button class="info-ayuda" data-guia="perfil" aria-label="Gu\xEDa de Perfil">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>

          <!-- HERO -->
          <header class="perfil-hero">
            <div class="perfil-hero__fondo" aria-hidden="true"></div>
            <div class="perfil-hero__avatar">
              <div class="perfil-avatar perfil-avatar--hero" id="avatarPerfil" title="Cambiar foto de perfil">
                <span id="avatarLetra">${d(a.nombre_completo.charAt(0).toUpperCase())}</span>
                <input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil">
              </div>
            </div>
            <div class="perfil-hero__identidad">
              <div class="perfil-hero__meta">
                <span class="perfil-rol-badge perfil-rol-badge--${i}">${E(a.rol)}</span>
              </div>
              <h1 class="perfil-hero__nombre" id="nombrePerfil">${d(a.nombre_completo)}</h1>
              ${s?`<p class="perfil-hero__bio">${d(s)}</p>`:""}
              <div class="perfil-hero__acciones">
                <button class="perfil-hero__btn" id="btnEditarPerfil">${t("user")} <span>Editar perfil</span></button>
              </div>
            </div>
          </header>

          <div class="o-pila o-pila--md">

            <!-- CONFIGURACI\xD3N -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${t("settings")}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Configuraci\xF3n</h4>
                  <p class="perfil-seccion__desc">Personaliza tu experiencia</p>
                </div>
              </div>
              <div class="o-pila" style="gap:var(--espaciado-xxs)">
                ${v("palette","Apariencia","Modo claro, oscuro o autom\xE1tico","/perfil/config/apariencia")}
                ${v("bell","Notificaciones","Avisos y sonidos de la app","/perfil/config/notificaciones")}
                ${v("eye-off","Privacidad","Qu\xE9 puede verse de tu perfil","/perfil/config/privacidad")}
                ${v("database","Almacenamiento","Cach\xE9, datos temporales y sincronizaci\xF3n","/perfil/config/almacenamiento")}
                ${v("lock","Seguridad","Contrase\xF1a, sesi\xF3n y zona de peligro","/perfil/config/seguridad")}
              </div>
            </section>

            <!-- GRUPOS -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${t("users")}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Grupos</h4>
                  <p class="perfil-seccion__desc">Tu clase y los grupos a los que perteneces</p>
                </div>
              </div>
              <a class="btn-secundario perfil-btn-full" href="#!/grupos">${t("layout")} Ver todos los grupos</a>
            </section>

            <!-- SUGERENCIAS -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono" style="background:var(--color-info-soft);color:var(--color-info)">${t("message-square")}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Sugerencias</h4>
                  <p class="perfil-seccion__desc">Reporta errores, comparte ideas o prop\xF3n mejoras</p>
                </div>
              </div>
              <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
                \xBFEncontraste un error o tienes una idea? Escr\xEDbela aqu\xED. El equipo la revisar\xE1 y podr\xE1s seguir su estado.
              </p>
              <div class="sug-form">
                <select id="sugCategoria" aria-label="Categor\xEDa de la sugerencia" style="width:100%">
                  ${window.sugerenciasRepository?window.sugerenciasRepository.CATEGORIAS.map(c=>`<option value="${c.valor}">${c.texto}</option>`).join(""):""}
                </select>
                <textarea id="sugTexto" rows="3" maxlength="1000" placeholder="Ej: En la secci\xF3n de ex\xE1menes, al publicar uno con varias preguntas..." aria-label="Texto de la sugerencia"></textarea>
                <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center">
                  <span class="u-fs-xxs u-color-texto-terciario" id="sugContador">0/1000</span>
                  <button class="btn-primario" id="btnEnviarSugerencia" style="margin-left:auto">${t("send")} Enviar</button>
                </div>
              </div>
              <div class="o-pila" id="listaMisSugerencias" style="gap:var(--espaciado-xs);margin-top:var(--espaciado-sm)"></div>
            </section>

            <!-- PANEL DE ADMINISTRACI\xD3N (acceso r\xE1pido) -->
            ${o?`
            <a class="perfil-boton-seccion" id="btnAdmin" href="#!/admin">
              <div class="perfil-boton-seccion__icono">${t("settings")}</div>
              <div class="perfil-boton-seccion__texto">
                <p class="perfil-boton-seccion__label">Centro de Administraci\xF3n</p>
                <p class="perfil-boton-seccion__desc">Gestionar usuarios, grupos, ex\xE1menes y configuraci\xF3n</p>
              </div>
              <span class="perfil-boton-seccion__flecha">${t("chevron-right")}</span>
            </a>`:""}

            <!-- SESI\xD3N -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${t("log-out")}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Sesi\xF3n</h4>
                  <p class="perfil-seccion__desc">Cierra la sesi\xF3n en este dispositivo</p>
                </div>
              </div>
              <button class="perfil-btn-cerrar" id="btnLogout">${t("log-out")} Cerrar sesi\xF3n</button>
            </section>

            <!-- INFORMACI\xD3N -->
            <section class="perfil-seccion">
              <div class="perfil-info-card">
                <div class="perfil-info-card__texto">
                  <p class="perfil-info-card__nombre">FormsBiblicos</p>
                  <p class="perfil-info-card__version">Versi\xF3n ${d(n)}</p>
                </div>
                <div class="o-flecha" style="gap:var(--espaciado-xxs);justify-content:flex-end;flex-wrap:wrap">
                  <button class="btn-secundario u-fs-xs" id="btnMasInfo">M\xE1s informaci\xF3n</button>
                  ${window.pwaInstall?.yaInstalada()?"":`<button class="btn-secundario u-fs-xs" id="btnDescargarPWA">${t("download")} Descargar app</button>`}
                </div>
              </div>
              <div class="o-pila" style="gap:var(--espaciado-xxs);margin-top:var(--espaciado-xs)">
                ${v("file-text","T\xE9rminos de uso","Condiciones del servicio",g("terminos"),!0)}
                ${v("shield","Pol\xEDtica de privacidad","C\xF3mo tratamos tus datos",g("privacidad"),!0)}
                ${v("copyright","Licencias","Tecnolog\xEDas y atribuciones",g("licencias"),!0)}
              </div>
            </section>
          </div>
        </div>`,window.Iconos&&window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(e),window.helpers.registrarGuias(e,{perfil:["Perfil","Gestiona tu identidad, preferencias, grupos y accesos personales desde esta pantalla.","Usa Configuraci\xF3n para adaptar la app y Grupos para entrar a tus clases."]}),a.foto_perfil){const c=e.querySelector("#avatarPerfil");c&&(c.innerHTML=`<img src="${d(a.foto_perfil)}" alt="Foto de perfil" width="88" height="88" decoding="async"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`)}const p=async()=>{const c=await window.helpers.formulario({titulo:"Editar perfil",mensaje:"Puedes modificar tu nombre y tu descripci\xF3n. El usuario @"+a.username+" no se puede cambiar.",campos:[{nombre:"nombre_completo",etiqueta:"Nombre",valor:a.nombre_completo||"",requerido:!0},{nombre:"descripcion",etiqueta:"Descripci\xF3n",tipo:"textarea",filas:2,valor:a.preferencias&&(a.preferencias.descripcion||a.preferencias.frase)||"",placeholder:"Ej: Amante del estudio b\xEDblico"}],textoConfirmar:"Guardar"});if(c)try{await window.supabaseClient.from("perfiles").update({nombre_completo:c.nombre_completo.trim()}).eq("id",a.id);const u={...a.preferencias||{},descripcion:c.descripcion.trim()};delete u.frase,a.nombre_completo=c.nombre_completo.trim(),a.preferencias=u,store.actualizar("usuario",{...a}),localStorage.setItem("fb_usuario",JSON.stringify(a));try{await window.supabaseClient.from("perfiles").update({preferencias:JSON.stringify(u)}).eq("id",a.id)}catch{}window.helpers.mostrarAlerta("Perfil actualizado.","exito"),router.pathActual()==="/perfil"?this.montar(e,{}):router.navegar("/perfil")}catch(u){window.helpers.mostrarAlerta("Error: "+u.message,"error")}};e.querySelector("#btnEditarPerfil").onclick=p,e.querySelector("#btnMasInfo").onclick=()=>router.navegar("/perfil/acerca/que-es"),e.querySelector("#btnDescargarPWA")?.addEventListener("click",()=>window.pwaInstall?.mostrar()),e.querySelector("#btnLogout").onclick=async()=>{await window.helpers.confirmar("\xBFEst\xE1s seguro de cerrar sesi\xF3n?",{titulo:"Cerrar sesi\xF3n",textoConfirmar:"Cerrar sesi\xF3n"})&&authRepository.cerrarSesion()};const l=async c=>{window.helpers.mostrarAlerta("Subiendo foto...","info",2e3);try{const m=await(await fetch(c)).blob(),b=m.type==="image/png"?"png":m.type==="image/webp"?"webp":"jpg",$=`${a.id}/avatar.${b}`,{error:S}=await window.supabaseClient.storage.from("avatars").upload($,m,{upsert:!0,contentType:m.type});if(S)throw S;const{data:{publicUrl:h}}=window.supabaseClient.storage.from("avatars").getPublicUrl($);a.foto_perfil=h,store.actualizar("usuario",{...a}),localStorage.setItem("fb_usuario",JSON.stringify(a));const x=e.querySelector("#avatarPerfil");x&&(x.innerHTML=`<img src="${d(h)}" alt="Foto de perfil" width="88" height="88" decoding="async"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`);const A=e.querySelector("#inputFotoPerfil");A&&(A.onchange=f),await window.supabaseClient.from("perfiles").update({foto_perfil:h}).eq("id",a.id),window.helpers.mostrarAlerta("Foto de perfil actualizada.","exito")}catch(u){console.error("Error al subir foto:",u),window.helpers.mostrarAlerta("No se pudo subir la foto. Intenta de nuevo.","error")}};function f(c){const u=c.target.files[0];c.target.value="",u&&(window.editorImagen?window.editorImagen.abrir(u,{onConfirm:l}):C(u,l))}e.querySelector("#inputFotoPerfil").onchange=f,this._bindSugerencias(e,a),e.querySelector("#btnAdmin")?.addEventListener("click",c=>{c.preventDefault(),router.navegar("/admin")})},_bindSugerencias(e,a){const i=window.sugerenciasRepository,o=e.querySelector("#sugContador"),r=e.querySelector("#sugTexto"),s=e.querySelector("#listaMisSugerencias"),n=async()=>{if(!s||!i)return;s.innerHTML='<p class="u-fs-xs u-color-texto-terciario">Cargando...</p>';let l=[];try{l=await i.listarMias(a.id)}catch{l=[]}if(!l.length){s.innerHTML='<p class="u-fs-xs u-color-texto-terciario">A\xFAn no has enviado sugerencias.</p>';return}s.innerHTML=l.slice(0,8).map(f=>{const c=i.estadoInfo(f.estado),u=i.CATEGORIAS.find(m=>m.valor===f.categoria)||i.CATEGORIAS[i.CATEGORIAS.length-1];return`
            <div class="sug-item">
              <div class="sug-item__cabecera">
                <span class="sug-item__categoria">${u?u.texto:"\u{1F4DD}"}</span>
                <span class="sug-estado ${c.clase}">${c.texto}</span>
              </div>
              <p class="sug-item__texto">${d(f.texto)}</p>
              ${f.respuesta?`<p class="sug-item__respuesta"><strong>Respuesta:</strong> ${d(f.respuesta)}</p>`:""}
              <span class="sug-item__fecha">${window.helpers.formatearFecha(f.creado_en)}</span>
            </div>`}).join("")};r&&o&&r.addEventListener("input",()=>{o.textContent=r.value.length+"/1000"});const p=e.querySelector("#btnEnviarSugerencia");p&&i&&(p.onclick=async()=>{const l=r?r.value.trim():"";if(!l){window.helpers.mostrarAlerta("Escribe tu sugerencia antes de enviar.","advertencia");return}const f=e.querySelector("#sugCategoria")?.value||"otro";p.disabled=!0;try{await i.crear(a.id,f,l),window.helpers.mostrarAlerta("Sugerencia enviada. \xA1Gracias por tu aporte!","exito"),r&&(r.value=""),o&&(o.textContent="0/1000"),await n()}catch(c){window.helpers.mostrarAlerta(c.message||"No se pudo enviar.","error")}finally{p.disabled=!1}}),n()},_montarConfig(e,a,i){const o=y[i]||y.apariencia,r=a.preferencias||{};e.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${w(o.titulo,o.desc)}
          <div id="configContenido" class="o-pila" style="gap:var(--espaciado-md)">
            <div class="skel" style="height:160px;border-radius:var(--card-radius)"></div>
          </div>
        </div>`,window.campanaNotificaciones&&window.campanaNotificaciones.conectar(e),window.helpers.registrarGuias(e,{"perfil-config":["Configuraci\xF3n","Ajusta la apariencia, notificaciones, privacidad, almacenamiento y seguridad de tu cuenta.","Elige la secci\xF3n que quieres modificar y los cambios se guardar\xE1n en tu perfil."]}),e.querySelector("[data-volver]").onclick=()=>router.navegar("/perfil");const s=e.querySelector("#configContenido");i==="apariencia"?this._configApariencia(s,a,r):i==="notificaciones"?this._configNotificaciones(s,a,r):i==="privacidad"?this._configPrivacidad(s,a,r):i==="almacenamiento"?this._configAlmacenamiento(s,a):i==="seguridad"&&this._configSeguridad(s,a),window.Iconos&&window.Iconos.actualizar()},_configApariencia(e,a,i){e.innerHTML=`
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("palette")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Modo</h4>
              <p class="perfil-seccion__desc">Elige el aspecto visual de la app</p>
            </div>
          </div>
          <div class="perfil-segmented" role="radiogroup" aria-label="Seleccionar modo">
            <button class="perfil-segmented__btn ${i.tema==="light"?"perfil-segmented__btn--activo":""}" data-tema="light" role="radio" aria-checked="${i.tema==="light"}">${t("sun")} Claro</button>
            <button class="perfil-segmented__btn ${i.tema?"":"perfil-segmented__btn--activo"}" data-tema="auto" role="radio" aria-checked="${!i.tema}">${t("settings")} Autom\xE1tico</button>
            <button class="perfil-segmented__btn ${i.tema==="dark"?"perfil-segmented__btn--activo":""}" data-tema="dark" role="radio" aria-checked="${i.tema==="dark"}">${t("moon")} Oscuro</button>
          </div>

          <div class="perfil-opcion" style="margin-top:var(--espaciado-sm)">
            <div class="perfil-opcion__info">
              <p class="perfil-opcion__label">Alto contraste</p>
              <p class="perfil-opcion__desc">Colores m\xE1s vivos y bordes marcados</p>
            </div>
            <label class="switch"><input type="checkbox" id="chkContraste" ${i.alto_contraste?"checked":""}><span class="slider"></span></label>
          </div>
          <div class="perfil-opcion">
            <div class="perfil-opcion__info">
              <p class="perfil-opcion__label">Texto grande</p>
              <p class="perfil-opcion__desc">Aumenta el tama\xF1o del texto</p>
            </div>
            <label class="switch"><input type="checkbox" id="chkLetra" ${i.letra_grande?"checked":""}><span class="slider"></span></label>
          </div>
          <button class="btn-secundario u-mt-2 perfil-btn-full" id="btnResetPrefs">Restablecer preferencias</button>
        </div>`,e.querySelector("#chkContraste").addEventListener("change",function(){document.documentElement.dataset.hc=this.checked?"true":"false",_(a,"alto_contraste",this.checked)});const o=e.querySelector("#chkLetra");o&&o.addEventListener("change",function(){document.documentElement.dataset.lg=this.checked?"true":"false",_(a,"letra_grande",this.checked)}),e.querySelectorAll(".perfil-segmented__btn").forEach(r=>{r.addEventListener("click",()=>{const s=r.dataset.tema,n=s==="auto"?null:s;e.querySelectorAll(".perfil-segmented__btn").forEach(p=>{p.classList.remove("perfil-segmented__btn--activo"),p.setAttribute("aria-checked","false")}),r.classList.add("perfil-segmented__btn--activo"),r.setAttribute("aria-checked","true"),s==="auto"?delete document.documentElement.dataset.theme:document.documentElement.dataset.theme=s,_(a,"tema",n)})}),e.querySelector("#btnResetPrefs").onclick=async()=>{if(!await window.helpers.confirmar("Se restaurar\xE1n las preferencias a sus valores por defecto.",{titulo:"\xBFRestablecer preferencias?",textoConfirmar:"Restablecer"}))return;delete document.documentElement.dataset.theme,document.documentElement.dataset.hc="false",document.documentElement.dataset.lg="false",window.preferencias&&window.preferencias.guardar({tema:null,alto_contraste:!1,letra_grande:!1});const s={...a.preferencias||{}};s.tema=null,s.alto_contraste=!1,s.letra_grande=!1,a.preferencias=s,store.actualizar("usuario",{...a}),localStorage.setItem("fb_usuario",JSON.stringify(a));try{await window.supabaseClient.from("perfiles").update({preferencias:JSON.stringify(s)}).eq("id",a.id)}catch{}window.helpers.mostrarAlerta("Preferencias restablecidas.","exito"),router.navegar("/perfil/config/apariencia")}},_configNotificaciones(e,a,i){const o="Notification"in window?Notification.permission:"unsupported",r={granted:"Permitidas por el navegador",denied:"Bloqueadas en el navegador",default:"A\xFAn no has decidido",unsupported:"No soportadas en este dispositivo"},s={notif_estudio:"notif_recordatorios",notif_estudio2:"notif_repasos",notif_desafios:"notif_logros",notif_grupos:"notif_invitaciones"},n=(l,f,c,u)=>{const m=s[l],b=i[l]!==!1&&!(m&&i[m]===!1);return`
        <div class="perfil-opcion">
          <div class="perfil-opcion__info">
            <p class="perfil-opcion__label">${t(f)} ${d(c)}</p>
            <p class="perfil-opcion__desc">${d(u)}</p>
          </div>
          <label class="switch"><input type="checkbox" data-notif="${l}" ${b?"checked":""}><span class="slider"></span></label>
        </div>`};e.innerHTML=`
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("bell")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Permiso del navegador</h4>
              <p class="perfil-seccion__desc">${d(r[o]||r.unsupported)}</p>
            </div>
          </div>
          ${o==="default"?`<button class="btn-primario perfil-btn-full" id="btnPedirPermiso">${t("bell-plus")} Activar notificaciones</button>`:""}
          ${o==="denied"?'<p class="u-fs-xs u-color-texto-terciario" style="line-height:1.5">Para activarlas, permite las notificaciones de FormsBiblicos en los ajustes de tu navegador.</p>':""}
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("settings")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Categor\xEDas</h4>
              <p class="perfil-seccion__desc">Activa o desactiva cada tipo de aviso</p>
            </div>
          </div>
          ${n("notif_desafios","sword","Desaf\xEDos","Invitaciones y resultados de desaf\xEDos")}
          ${n("notif_examenes","clipboard-check","Ex\xE1menes","Publicaci\xF3n, entregas y correcciones")}
          ${n("notif_estudio","book-open","Estudio","Cap\xEDtulos completados y nuevos mazos")}
          ${n("notif_grupos","users","Grupos","Invitaciones y novedades de tu grupo")}
          ${n("notif_logros","trophy","Logros","Logros desbloqueados")}
          ${n("notif_sistema","settings","Sistema","Actualizaciones y avisos de la plataforma")}
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("volume-2")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Sonido y dispositivo</h4>
              <p class="perfil-seccion__desc">C\xF3mo te avisa la app</p>
            </div>
          </div>
          ${n("notif_sonidos","volume-2","Sonidos","Sonido al recibir un aviso")}
          ${n("notif_vibracion","vibrate","Vibraci\xF3n","Vibra al recibir un aviso")}
          ${n("notif_nativas","smartphone","Notificaciones del dispositivo","Mostrar en la bandeja del sistema (si no, avisos internos)")}
        </div>
`,window.Iconos&&window.Iconos.actualizar(),e.querySelectorAll("[data-notif]").forEach(l=>{l.addEventListener("change",()=>{if(l.checked&&a.preferencias){const f={...a.preferencias},c=s[l.dataset.notif];c&&delete f[c],a.preferencias=f}_(a,l.dataset.notif,l.checked)})});const p=e.querySelector("#btnPedirPermiso");p&&(p.onclick=async()=>{try{const l=await Notification.requestPermission();window.helpers.mostrarAlerta(l==="granted"?"Notificaciones activadas.":"No se concedi\xF3 el permiso.",l==="granted"?"exito":"advertencia"),window.notifications&&window.notifications.setPermiso(l),window.vistaPerfil._configNotificaciones(e,a,{...a.preferencias||{}})}catch{window.helpers.mostrarAlerta("No se pudo solicitar el permiso.","error")}})},_configPrivacidad(e,a,i){const o=i.priv_visibilidad||"todos",r=(s,n,p,l)=>`
        <div class="perfil-opcion">
          <div class="perfil-opcion__info">
            <p class="perfil-opcion__label">${t(n)} ${d(p)}</p>
            <p class="perfil-opcion__desc">${d(l)}</p>
          </div>
          <label class="switch"><input type="checkbox" data-priv="${s}" ${i[s]!==!1?"checked":""}><span class="slider"></span></label>
        </div>`;e.innerHTML=`
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("eye-off")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Visibilidad del perfil</h4>
              <p class="perfil-seccion__desc">Qu\xE9 pueden ver otros usuarios</p>
            </div>
          </div>
          ${r("priv_mostrar_foto","camera","Mostrar foto","Permite que otros vean tu foto de perfil")}
          ${r("priv_mostrar_descripcion","align-left","Mostrar descripci\xF3n","Permite que otros vean tu descripci\xF3n")}
          ${r("priv_recibir_desafios","trophy","Recibir desaf\xEDos","Acepta desaf\xEDos enviados por otros usuarios")}
          ${r("priv_aparecer_busquedas","search","Aparecer en b\xFAsquedas","Permite que otros usuarios te encuentren")}
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("globe")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Perfil visible para</h4>
              <p class="perfil-seccion__desc">Qui\xE9n puede consultar tu perfil</p>
            </div>
          </div>
          <div class="perfil-segmented perfil-segmented--3" role="radiogroup" aria-label="Visibilidad del perfil">
            <button class="perfil-segmented__btn ${o==="todos"?"perfil-segmented__btn--activo":""}" data-vis="todos" role="radio" aria-checked="${o==="todos"}">Todos</button>
            <button class="perfil-segmented__btn ${o==="registrados"?"perfil-segmented__btn--activo":""}" data-vis="registrados" role="radio" aria-checked="${o==="registrados"}">Registrados</button>
            <button class="perfil-segmented__btn ${o==="grupos"?"perfil-segmented__btn--activo":""}" data-vis="grupos" role="radio" aria-checked="${o==="grupos"}">Mis grupos</button>
          </div>
        </div>`,window.Iconos&&window.Iconos.actualizar(),e.querySelectorAll("[data-priv]").forEach(s=>{s.addEventListener("change",()=>_(a,s.dataset.priv,s.checked))}),e.querySelectorAll("[data-vis]").forEach(s=>{s.addEventListener("click",()=>{e.querySelectorAll("[data-vis]").forEach(n=>{n.classList.remove("perfil-segmented__btn--activo"),n.setAttribute("aria-checked","false")}),s.classList.add("perfil-segmented__btn--activo"),s.setAttribute("aria-checked","true"),_(a,"priv_visibilidad",s.dataset.vis)})})},_configAlmacenamiento(e,a){e.innerHTML=`
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono" style="background:var(--color-aviso-soft);color:var(--color-aviso)">${t("database")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Almacenamiento</h4>
              <p class="perfil-seccion__desc">Gesti\xF3n de cach\xE9 y datos temporales</p>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
            Elimina los datos guardados localmente (cach\xE9 de Supabase, im\xE1genes en memoria, etc.). La app se recargar\xE1 y volver\xE1 a descargar todo desde el servidor. <strong>Tu progreso y cuenta no se perder\xE1n.</strong>
          </p>
          <div class="perfil-info-card">
            <div class="perfil-info-card__texto">
              <p class="perfil-info-card__nombre">\xDAltima sincronizaci\xF3n</p>
              <p class="perfil-info-card__sync" id="perfilUltimaSync"></p>
            </div>
          </div>
          <button class="btn-secundario perfil-btn-full u-mt-2" id="btnLimpiarCache">${t("trash-2")} Limpiar cach\xE9</button>
        </div>`;const i=e.querySelector("#perfilUltimaSync");if(i&&window.syncStatus){const o=window.syncStatus.getUltima();i.textContent=o?window.syncStatus.fmtHace(o):"Sin sincronizar a\xFAn"}e.querySelector("#btnLimpiarCache").onclick=async()=>{if(await window.helpers.confirmar("Esto eliminar\xE1 la cach\xE9 local (datos de Supabase, im\xE1genes temporales, etc.). La app se recargar\xE1 autom\xE1ticamente. Tu cuenta y progreso en l\xEDnea NO se perder\xE1n.",{titulo:"\xBFLimpiar cach\xE9 de la app?",textoConfirmar:"Limpiar y recargar"})){window.helpers.mostrarAlerta("Limpiando cach\xE9...","info",1500);try{await window.cacheDatos.limpiarTodo()}catch{}setTimeout(()=>window.location.reload(),1200)}}},_configSeguridad(e,a){e.innerHTML=`
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${t("lock")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Contrase\xF1a</h4>
              <p class="perfil-seccion__desc">Actualiza tu contrase\xF1a de acceso</p>
            </div>
          </div>
          <button class="perfil-btn-full btn-secundario" id="btnCambiarPassword">${t("key")} Cambiar contrase\xF1a</button>
        </div>

        <div class="perfil-seccion perfil-seccion--peligro">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono" style="background:var(--color-error-soft);color:var(--color-error)">${t("alert-triangle")}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Zona de peligro</h4>
              <p class="perfil-seccion__desc">Acciones irreversibles</p>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
            <strong>Eliminar todos mis datos</strong> borrar\xE1 permanentemente tu progreso de lectura, tarjetas de memorizaci\xF3n, historial de repasos, logros e intentos de ex\xE1menes. Tu cuenta seguir\xE1 existiendo.
          </p>
          <button class="btn-peligro" id="btnEliminarDatos">${t("trash-2")} Eliminar todos mis datos</button>
        </div>`,e.querySelector("#btnCambiarPassword").onclick=async()=>{const i=await window.helpers.formulario({titulo:"Cambiar contrase\xF1a",mensaje:"Verificaremos tu contrase\xF1a actual antes de cambiarla.",campos:[{nombre:"actual",etiqueta:"Contrase\xF1a actual",tipo:"password",requerido:!0},{nombre:"nueva",etiqueta:"Contrase\xF1a nueva",tipo:"password",requerido:!0,placeholder:"M\xEDnimo 8 caracteres, letras y n\xFAmeros"},{nombre:"confirmar",etiqueta:"Confirmar contrase\xF1a nueva",tipo:"password",requerido:!0}],textoConfirmar:"Cambiar contrase\xF1a"});if(i){if(i.nueva.length<8||!/[A-Za-z]/.test(i.nueva)||!/[0-9]/.test(i.nueva)){window.helpers.mostrarAlerta("La contrase\xF1a debe tener al menos 8 caracteres e incluir letras y n\xFAmeros.","advertencia");return}if(i.nueva!==i.confirmar){window.helpers.mostrarAlerta("Las contrase\xF1as no coinciden.","advertencia");return}try{await authRepository.cambiarPassword(i.actual,i.nueva);try{await window.adminRepository.registrarAuditoria("config:password","Contrase\xF1a cambiada",a.id,a.grupo_id)}catch{}window.helpers.mostrarAlerta("Contrase\xF1a actualizada.","exito")}catch(o){window.helpers.mostrarAlerta("Error: "+o.message,"error")}}},e.querySelector("#btnEliminarDatos").onclick=async()=>{if(!(!await window.helpers.confirmar("Se borrar\xE1n tu progreso, tarjetas, repasos, logros e intentos de ex\xE1menes. Esta acci\xF3n no se puede deshacer.",{titulo:"\xBFEliminar TODOS tus datos?",textoConfirmar:"S\xED, eliminar"})||!await window.helpers.confirmar("CONFIRMACI\xD3N FINAL: \xBFEliminar permanentemente todos tus datos?",{titulo:"\xDAltima confirmaci\xF3n",textoConfirmar:"Eliminar permanentemente"})))try{await authRepository.eliminarMisDatos(a.id),window.helpers.mostrarAlerta("Todos tus datos han sido eliminados.","exito"),router._ejecutar()}catch(r){window.helpers.mostrarAlerta("Error al eliminar: "+r.message,"error")}}},_montarAcerca(e,a,i){if(["terminos","privacidad","licencias"].includes(i)){window.location.href=g(i);return}const o=window.__FB_APP_VERSION__?.version||"\u2014",r={"que-es":`
          <div class="perfil-seccion">
            <div class="perfil-info-card">
              <div class="perfil-info-card__texto">
                <p class="perfil-info-card__nombre">FormsBiblicos</p>
                <p class="perfil-info-card__version">Versi\xF3n ${d(o)}</p>
                <p class="perfil-info-card__sync">Estudio b\xEDblico guiado</p>
              </div>
            </div>
            <p class="u-fs-sm u-color-texto-secundario" style="line-height:1.7;margin-top:var(--espaciado-sm)">
              <strong>FormsBiblicos</strong> es una plataforma de estudio b\xEDblico guiado. Lee cap\xEDtulos, responde preguntas, memoriza vers\xEDculos y sigue tu progreso a trav\xE9s de toda la Biblia. Profesores y administradores pueden crear ex\xE1menes, gestionar grupos y seguir el avance de sus alumnos.
            </p>
            <div class="o-pila" style="gap:var(--espaciado-xxs);margin-top:var(--espaciado-sm)">
              <div class="perfil-fila"><span class="perfil-fila__label">Objetivo</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">Estudio b\xEDblico sistem\xE1tico</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Versi\xF3n</span><span class="perfil-fila__valor">${d(o)}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Plataforma</span><span class="perfil-fila__valor">Web (PWA)</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Tecnolog\xEDas</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">HTML, CSS, JS, Supabase</span></div>
            </div>
          </div>`},s={"que-es":{titulo:"Qu\xE9 es FormsBiblicos",sub:"Informaci\xF3n de la aplicaci\xF3n"}}[i]||{titulo:"Acerca de",sub:""};e.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${w(s.titulo,s.sub)}
          <div id="acercaContenido" class="o-pila" style="gap:var(--espaciado-md)">
            ${r[i]||r["que-es"]}
          </div>
        </div>`,window.campanaNotificaciones&&window.campanaNotificaciones.conectar(e),window.helpers.registrarGuias(e,{"perfil-acerca":["Informaci\xF3n de FormsBiblicos","Consulta el prop\xF3sito, la versi\xF3n y las tecnolog\xEDas de la plataforma.","Desde aqu\xED tambi\xE9n puedes volver al perfil cuando termines."]}),e.querySelector("[data-volver]").onclick=()=>router.navegar("/perfil"),window.Iconos&&window.Iconos.actualizar()}}})();
