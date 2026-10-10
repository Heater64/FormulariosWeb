(function(){"use strict";const t=o=>window.Iconos.render(o),l=o=>window.helpers.escapeHtml(o),k=()=>window.ejerciciosMemorizacion;function $(o,s=!1){if(o&&o.foto_perfil)return`<img src="${l(o.foto_perfil)}" alt="" width="40" height="40" loading="lazy" decoding="async">`;const e=(o&&(o.nombre_completo||o.username)||"?").charAt(0).toUpperCase();return`<span class="${s?"grupos-avatar__letra--lg":""}">${l(e)}</span>`}function S(o){return window.adminComunes&&window.adminComunes.rolBonito?window.adminComunes.rolBonito(o):o}function I(o){return o?window.helpers.formatearFecha(o):"\u2014"}const E=["linear-gradient(135deg, var(--color-azul-700) 0%, var(--color-acento-fuerte) 60%, #172554 100%)","linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)","linear-gradient(135deg, #0D9488 0%, #134E4A 100%)","linear-gradient(135deg, #DB2777 0%, #831843 100%)","linear-gradient(135deg, #D97706 0%, #78350F 100%)","linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)"];function x(o){let s=0;const e=String(o||"");for(let n=0;n<e.length;n++)s=s*31+e.charCodeAt(n)>>>0;return E[s%E.length]}window.vistaGrupos={async montar(o,s){const e=store.obtener("usuario");if(!e){router.navegar("/login");return}return this._usuario=e,this._seleccion=new Set,s&&s.id?this._montarGrupo(o,s.id):this._montarDirectorio(o)},desmontar(){this._seleccion=null,this._usuario=null,this._miembros=null,this._grupo=null},async _montarDirectorio(o){const s=this._usuario;o.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono grupos-cabecera__volver" id="btnVolverGrupos" aria-label="Volver al perfil">${t("arrow-left")}</button>
              <div class="grupos-cabecera__texto">
                <h1 class="grupos-cabecera__titulo">${t("users")} Mis clases <button class="info-ayuda" data-guia="grupos" aria-label="Gu\xEDa de Mis clases">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </div>
          <div class="grupos-acciones">
            <button class="btn-primario grupos-acciones__unir" id="btnUnirseCodigo">${t("key")} Unirme con c\xF3digo</button>
            ${["admin","owner","editor"].includes(s.rol)?`
            <button class="btn-secundario" id="btnCrearGrupo">${t("plus")} Nueva clase</button>`:""}
            ${["admin","owner"].includes(s.rol)?`
            <button class="btn-secundario" id="btnCrearInstitucion">${t("building")} Nueva instituci\xF3n</button>`:""}
          </div>
          <div id="gruposContenido">
            ${window.skeleton?window.skeleton.tarjetas(2,{ancho:"100%"}):'<div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:150px;border-radius:var(--card-radius)"></div><div class="skel" style="height:150px;border-radius:var(--card-radius)"></div></div>'}
          </div>
        </div>`,window.campanaNotificaciones&&window.campanaNotificaciones.conectar(o),window.helpers.registrarGuias(o,{grupos:["Mis clases","Aqu\xED puedes unirte a tus clases, consultar invitaciones y participar en desaf\xEDos de memorizaci\xF3n con tu grupo.","Pide el c\xF3digo a tu profesor para unirte a una clase."]}),o.querySelector("#btnVolverGrupos").onclick=()=>router.navegar("/perfil"),o.querySelector("#btnUnirseCodigo").onclick=()=>this._modalUnirseCodigo(o);const e=o.querySelector("#btnCrearGrupo");e&&(e.onclick=()=>this._modalNuevaClase(o));const n=o.querySelector("#btnCrearInstitucion");n&&(n.onclick=()=>this._modalNuevaInstitucion(o));const[r,d,a,i]=await Promise.all([window.gruposRepository.listarMisClases(s.id),window.desafiosRepository.misInvitaciones(s.id),window.gruposRepository.listarInstituciones(s.id),window.gruposRepository.misSolicitudes(s.id)]),m=o.querySelector("#gruposContenido");if(!m)return;const v=d.length?`
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${t("sword")}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Invitaciones a desaf\xEDos</h3>
              <p class="grupos-seccion__desc">Acepta y empieza cuando todos est\xE9n listos</p>
            </div>
            <span class="grupos-otros__contador">${d.length}</span>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${d.map(c=>this._tarjetaInvitacion(c)).join("")}
          </div>
        </section>`:"",u=new Map,g=[];(r||[]).forEach(c=>{const p=c.instituciones&&c.instituciones.id?c.instituciones:null;p?(u.has(p.id)||u.set(p.id,{institucion:p,clases:[]}),u.get(p.id).clases.push(c)):g.push(c)});const _=([,c])=>`
        <section class="grupos-institucion">
          <div class="grupos-institucion__cabecera">
            <span class="grupos-institucion__icono">${t("building")}</span>
            <div class="grupos-institucion__info">
              <h3 class="grupos-institucion__nombre">${l(c.institucion.nombre)}</h3>
              <p class="grupos-institucion__desc">${l((c.institucion.descripcion||"").slice(0,80))||"Instituci\xF3n"}</p>
            </div>
            <span class="grupos-institucion__contador">${c.clases.length} clase${c.clases.length!==1?"s":""}</span>
          </div>
          <div class="grupos-directorio">
            ${c.clases.map(p=>this._tarjetaClase(p,s)).join("")}
          </div>
        </section>`,b=g.length?`
        <section class="grupos-institucion">
          <div class="grupos-institucion__cabecera">
            <span class="grupos-institucion__icono">${t("layers")}</span>
            <div class="grupos-institucion__info">
              <h3 class="grupos-institucion__nombre">Mis clases</h3>
              <p class="grupos-institucion__desc">Clases sin instituci\xF3n asignada</p>
            </div>
          </div>
          <div class="grupos-directorio">
            ${g.map(c=>this._tarjetaClase(c,s)).join("")}
          </div>
        </section>`:"",C=["admin","owner"].includes(s.rol)&&a.length?`
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${t("building")}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Instituciones del centro</h3>
              <p class="grupos-seccion__desc">Crea clases dentro de cada instituci\xF3n</p>
            </div>
          </div>
          <div class="grupos-instituciones-lista">
            ${a.map(c=>`
              <div class="grupos-instituciones-item">
                <span class="grupos-instituciones-item__icono">${t("building")}</span>
                <div class="grupos-instituciones-item__info">
                  <p class="grupos-instituciones-item__nombre">${l(c.nombre)}</p>
                  <p class="grupos-instituciones-item__desc">${l((c.descripcion||"").slice(0,60))||"Administrada por ti"}</p>
                </div>
              </div>`).join("")}
          </div>
        </section>`:"",w=(i||[]).filter(c=>c.estado==="pendiente"),A=w.length?`
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${t("clock")}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Tus solicitudes de ingreso</h3>
              <p class="grupos-seccion__desc">Est\xE1s esperando aprobaci\xF3n en ${w.length} clase${w.length!==1?"s":""}</p>
            </div>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${w.map(c=>`
              <div class="grupos-solicitud">
                <div class="grupos-solicitud__info">
                  <p class="grupos-solicitud__nombre">${l(c.grupos&&c.grupos.nombre||"Clase")}</p>
                  <p class="grupos-solicitud__username">Pendiente de aprobaci\xF3n</p>
                </div>
                <span class="grupos-solicitud__estado">${t("clock")} En espera</span>
              </div>`).join("")}
          </div>
        </section>`:"",h=(r||[]).length===0&&!d.length,y=u.size||g.length?`${[...u.entries()].map(_).join("")}${b}`:h?`<div class="empty-state"><div class="empty-state__icono">${t("key")}</div>
                <h3 class="empty-state__titulo">A\xFAn no est\xE1s en ninguna clase</h3>
                <p class="empty-state__descripcion">Pide el c\xF3digo de tu clase a tu profesor y \xFAnete con el bot\xF3n \xABUnirme con c\xF3digo\xBB.</p></div>`:"";m.innerHTML=`
        ${A}
        ${v}
        ${y}
        ${C}`,window.Iconos&&window.Iconos.actualizar(),m.querySelectorAll("[data-invitacion]").forEach(c=>{c.onclick=async()=>{const p=d.find(f=>f.id===c.dataset.invitacion);if(p)if(c.disabled=!0,c.dataset.accion==="aceptar")try{const f=await window.desafiosRepository.responderInvitacion(p.id,s.id,!0);p._notifId&&window.notificationService?window.notificationService.marcarCompletada(p._notifId).catch(()=>{}):await window.desafiosRepository.marcarNotificacionLeida(p._notifId||null),f.empezado?router.navegar("/desafio/"+p.id):(window.helpers.mostrarAlerta("Has aceptado. Esperando a los dem\xE1s...","exito"),this._montarDirectorio(o))}catch(f){c.disabled=!1,window.helpers.mostrarAlerta("Error: "+f.message,"error")}else try{await window.desafiosRepository.responderInvitacion(p.id,s.id,!1),window.helpers.mostrarAlerta("Has rechazado el desaf\xEDo.","info"),this._montarDirectorio(o)}catch(f){c.disabled=!1,window.helpers.mostrarAlerta("Error: "+f.message,"error")}}}),m.querySelectorAll("[data-grupo]").forEach(c=>{c.onclick=()=>router.navegar("/grupos/"+c.dataset.grupo)})},_tarjetaInvitacion(o){const s=o.perfiles&&o.perfiles[0]||o.perfiles||{};return`
        <div class="grupos-invitacion">
          <div class="grupos-invitacion__avatar">${$(s)}</div>
          <div class="grupos-invitacion__info">
            <p class="grupos-invitacion__titulo">${l(s.nombre_completo||s.username||"Alguien")} te ha desafiado</p>
            <p class="grupos-invitacion__desc">${t("layers")} ${l(o.mazo_nombre||"Mazo de memorizaci\xF3n")}</p>
          </div>
          <div class="grupos-invitacion__acciones">
            <button class="btn-primario u-fs-xs" data-invitacion="${o.id}" data-accion="aceptar">${t("check")} Aceptar</button>
            <button class="btn-secundario u-fs-xs" data-invitacion="${o.id}" data-accion="rechazar">${t("x")} Rechazar</button>
          </div>
        </div>`},_tarjetaClase(o,s){const e=o.rol_en_grupo==="admin"||o.rol_en_grupo==="editor",n=o.instituciones&&o.instituciones.id?x(o.instituciones.id):x(o.id),r=o.admin_id===s.id;return`
        <article class="grupos-clase-card" data-grupo="${o.id}">
          <div class="grupos-clase-card__portada" style="background:${n}">
            <div class="grupos-clase-card__portada-icono">${t("book-open")}</div>
            <div class="grupos-clase-card__portada-info">
              <h3 class="grupos-clase-card__nombre">${l(o.nombre)}</h3>
              ${o.instituciones&&o.instituciones.nombre?`<p class="grupos-clase-card__inst">${l(o.instituciones.nombre)}</p>`:""}
            </div>
          </div>
          <div class="grupos-clase-card__cuerpo">
            <div class="grupos-clase-card__meta">
              <span>${t("users")} ${o.num_miembros}</span>
              ${e?`<span class="grupos-clase-card__rol">${t("graduation-cap")} Profesor</span>`:""}
            </div>
            ${r&&o.codigo?`
            <div class="grupos-clase-card__codigo">
              <span>C\xF3digo:</span>
              <strong>${l(o.codigo)}</strong>
            </div>`:""}
            <button class="btn-primario grupos-clase-card__btn" data-grupo="${o.id}">
              ${t("eye")} Ver clase
            </button>
          </div>
        </article>`},_modalUnirseCodigo(o){const s=document.createElement("div");s.className="modal-overlay",s.innerHTML=`
        <div class="modal grupos-modal">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${t("key")} Unirme con c\xF3digo</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${t("x")}</button>
            </div>
            <p class="u-fs-xs u-color-texto-terciario">Introduce el c\xF3digo que te ha compartido tu profesor. Si la clase existe, entrar\xE1s directamente.</p>
            <label class="grupos-codigo-label" for="codigoClase">C\xF3digo de la clase</label>
            <input class="grupos-codigo-input" id="codigoClase" maxlength="6" placeholder="ABC123"
                   autocomplete="off" autocapitalize="characters" spellcheck="false"
                   aria-describedby="ayudaCodigo">
            <p class="u-fs-xxs u-color-texto-terciario" id="ayudaCodigo">6 caracteres (letras y n\xFAmeros). No hace falta distinguir may\xFAsculas.</p>
            <button class="btn-primario grupos-modal__confirmar" data-unirse>${t("log-in")} Unirme</button>
          </div>
        </div>`,document.body.appendChild(s),window.Iconos&&window.Iconos.actualizar();const e=()=>s.remove();s.querySelector("[data-cerrar]").onclick=e,s.addEventListener("click",d=>{d.target===s&&e()});const n=s.querySelector("#codigoClase");n.addEventListener("input",()=>{n.value=n.value.toUpperCase().replace(/[^A-Z0-9]/g,"")});const r=async()=>{const d=n.value.trim();if(d.length<4){window.helpers.mostrarAlerta("Escribe el c\xF3digo de la clase.","advertencia");return}const a=s.querySelector("[data-unirse]");a.disabled=!0,a.textContent="Uni\xE9ndote\u2026";try{const i=await window.gruposRepository.unirseConCodigo(d);e(),window.helpers.mostrarAlerta("\xA1Bienvenido a tu nueva clase!","exito"),router.navegar("/grupos/"+i)}catch(i){a.disabled=!1,a.innerHTML=`${t("log-in")} Unirme`;const m=i&&i.message||"";window.helpers.mostrarAlerta(/c[oó]digo/i.test(m)?"No existe ninguna clase con ese c\xF3digo.":"Error: "+m,"error")}};s.querySelector("[data-unirse]").onclick=r,n.addEventListener("keydown",d=>{d.key==="Enter"&&r()}),setTimeout(()=>n.focus(),50)},async _modalNuevaClase(o){const s=this._usuario;let e=[];try{e=(await window.gruposRepository.listarInstituciones(s.id)).filter(a=>a.admin_id===s.id)}catch{}const n=[{valor:"",texto:"Sin instituci\xF3n"}].concat(e.map(d=>({valor:d.id,texto:d.nombre}))),r=await window.helpers.formulario({titulo:"Nueva clase",campos:[{nombre:"nombre",etiqueta:"Nombre de la clase",requerido:!0,placeholder:"Ej: Clase 1\xBA ESO A"},{nombre:"descripcion",etiqueta:"Descripci\xF3n",tipo:"textarea",requerido:!1,placeholder:"\xBFQu\xE9 se estudia en esta clase?"},{nombre:"institucion_id",etiqueta:"Instituci\xF3n",tipo:"select",valor:"",opciones:n}],textoConfirmar:"Crear clase"});if(!(!r||!r.nombre.trim()))try{const d=await window.gruposRepository.crearGrupo(r.nombre.trim(),s.id,r.institucion_id||null);try{await window.adminRepository.registrarAuditoria("grupo:crear",`Clase "${r.nombre.trim()}" creada (c\xF3digo ${d.codigo})`,s.id)}catch{}window.helpers.mostrarAlerta(`Clase creada. Comparte el c\xF3digo ${d.codigo} para que se unan.`,"exito"),this._montarDirectorio(o)}catch(d){window.helpers.mostrarAlerta("Error: "+d.message,"error")}},async _modalNuevaInstitucion(o){const s=this._usuario,e=await window.helpers.formulario({titulo:"Nueva instituci\xF3n",campos:[{nombre:"nombre",etiqueta:"Nombre de la instituci\xF3n",requerido:!0,placeholder:"Ej: Iglesia Central, Colegio Bet-el\u2026"},{nombre:"descripcion",etiqueta:"Descripci\xF3n",tipo:"textarea",requerido:!1,placeholder:"Breve descripci\xF3n de la instituci\xF3n"}],textoConfirmar:"Crear instituci\xF3n"});if(!(!e||!e.nombre.trim()))try{await window.gruposRepository.crearInstitucion(e.nombre.trim(),s.id,(e.descripcion||"").trim()),window.helpers.mostrarAlerta("Instituci\xF3n creada. Ya puedes crear clases dentro de ella.","exito"),this._montarDirectorio(o)}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}},async _montarGrupo(o,s){const e=this._usuario;o.innerHTML='<div class="o-contenedor u-mt-3"><div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:150px;border-radius:var(--card-radius)"></div><div class="skel" style="height:200px;border-radius:var(--card-radius)"></div></div></div>';const n=async c=>{const p=c?"*, instituciones(id, nombre, descripcion)":"*";return window.supabaseClient.from("grupos").select(p).eq("id",s).limit(1)};let r=await n(!0);r.error&&/instituciones/i.test(r.error.message||"")&&(r=await n(!1));const[d,a]=await Promise.all([window.gruposRepository.obtenerMiembrosDe(s),window.gruposRepository.listarInstituciones(e.id)]),i=r.data&&r.data[0];if(!i){o.innerHTML=window.adminComunes.vacio("key","Clase no encontrada","Pide el c\xF3digo de la clase a tu profesor y \xFAnete desde Mis clases.");return}const m=d.some(c=>c.id===e.id),v=m&&["admin","editor"].includes(d.find(c=>c.id===e.id)?.rol_en_grupo),u=e.rol==="owner";this._miembros=d,this._grupo=i,this._esOwner=u;const g=i.instituciones&&i.instituciones.id?x(i.instituciones.id):x(i.id),_=i.instituciones&&i.instituciones.nombre||"Sin instituci\xF3n",b=v||["admin","owner"].includes(e.rol);o.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(110px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono grupos-cabecera__volver" id="btnVolverDirectorio" aria-label="Volver a mis clases">${t("arrow-left")}</button>
              <div class="grupos-cabecera__texto">
                <h1 class="grupos-cabecera__titulo">${t("users")} ${l(i.nombre)} <button class="info-ayuda" data-guia="clase" aria-label="Gu\xEDa de esta clase">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </div>

          <div class="grupos-clase-banner" style="background:${g}">
            <div class="grupos-clase-banner__icono">${t("book-open")}</div>
            <div class="grupos-clase-banner__info">
              <h2 class="grupos-clase-banner__nombre">${l(i.nombre)}</h2>
              <p class="grupos-clase-banner__inst">${l(_)}${i.descripcion?` \xB7 ${l(i.descripcion.slice(0,70))}`:""}</p>
            </div>
            ${b&&i.codigo?`
            <button class="grupos-clase-banner__codigo" id="btnCopiarCodigo" aria-label="Copiar c\xF3digo de la clase" title="Copiar c\xF3digo">
              <span>C\xF3digo</span>
              <strong>${l(i.codigo)}</strong>
              ${t("copy")}
            </button>`:""}
            ${m?`
            <button class="grupos-clase-banner__compartir" id="btnCompartirClase" aria-label="Compartir esta clase" title="Compartir enlace de la clase">
              ${t("share-2")}<span>Compartir</span>
            </button>`:""}
          </div>

          ${m?"":`
          <div class="grupos-entrar">
            <p>${t("key")} A\xFAn no formas parte de esta clase.</p>
            <button class="btn-primario" id="btnIrCodigo" style="justify-content:center">${t("key")} Unirme con c\xF3digo</button>
            <button class="btn-secundario" id="btnSolicitarIngreso" style="justify-content:center">${t("user-plus")} Solicitar ingreso</button>
          </div>`}

          ${m?`
          <nav class="grupos-tabs" role="tablist" aria-label="Secciones de la clase">
            <button class="grupos-tabs__tab is-activo" role="tab" aria-selected="true" data-tab="personas">${t("users")} Personas</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="avisos">${t("megaphone")} Avisos</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="trabajo">${t("clipboard-check")} Trabajo</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="stats">${t("bar-chart-3")} Estad\xEDsticas</button>
          </nav>
          <div id="gruposTabContenido"></div>`:""}

          ${m&&d.length>1?`
          <div class="grupos-desafio-clase">
            <button class="btn-secundario" id="btnDesafiarClase">${t("sword")} Desafiar a toda la clase</button>
          </div>`:""}
        </div>`,window.Iconos&&window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(o),window.helpers.registrarGuias(o,{clase:["Clase","Consulta las personas, avisos, trabajo y estad\xEDsticas de esta clase desde las pesta\xF1as.","En Trabajo encontrar\xE1s los ex\xE1menes y actividades publicados por tu profesor."]}),o.querySelector("#btnVolverDirectorio").onclick=()=>router.navegar("/grupos");const C=o.querySelector("#btnCopiarCodigo");C&&(C.onclick=async()=>{try{await navigator.clipboard.writeText(i.codigo),window.helpers.mostrarAlerta(`C\xF3digo ${i.codigo} copiado.`,"exito")}catch{window.helpers.mostrarAlerta("No se pudo copiar: "+i.codigo,"info")}});const w=o.querySelector("#btnIrCodigo");w&&(w.onclick=()=>this._modalUnirseCodigo(o));const A=o.querySelector("#btnCompartirClase");A&&(A.onclick=async()=>{const c=window.location.origin+"/o/grupo/"+encodeURIComponent(i.id)+"?t="+encodeURIComponent(i.nombre||"Clase"),p="\u{1F3EB} "+(i.nombre||"Clase")+`

\xDAnete a esta clase en FormsBiblicos:
`+c;try{if(navigator.share){await navigator.share({title:i.nombre||"Clase",text:p,url:c});return}}catch{}const f="https://wa.me/?text="+encodeURIComponent(p);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(c).then(()=>{window.helpers.mostrarAlerta("Enlace copiado. Se abre WhatsApp.","info"),window.open(f,"_blank")}).catch(()=>{window.open(f,"_blank")}):window.open(f,"_blank")});const h=o.querySelector("#btnSolicitarIngreso");h&&(h.onclick=async()=>{h.disabled=!0;try{const c=await window.gruposRepository.solicitarIngreso(i.id);(c&&c.resultado)==="unido"?(window.helpers.mostrarAlerta("\xA1Bienvenido a tu nueva clase!","exito"),this._montarGrupo(o,i.id)):(window.helpers.mostrarAlerta("Solicitud enviada. Espera a que un responsable la apruebe.","exito"),h.textContent="Solicitud enviada")}catch(c){h.disabled=!1;const p=c&&c.message||"";window.helpers.mostrarAlerta(/ya eres miembro/i.test(p)?"Ya formas parte de esta clase.":"Error: "+p,"error"),/ya eres miembro/i.test(p)&&this._montarGrupo(o,i.id)}}),o.querySelectorAll(".grupos-tabs__tab").forEach(c=>{c.onclick=()=>{o.querySelectorAll(".grupos-tabs__tab").forEach(p=>{p.classList.toggle("is-activo",p===c),p.setAttribute("aria-selected",String(p===c))}),this._renderTab(o,i,e,c.dataset.tab)}}),m&&this._renderTab(o,i,e,"personas");const y=o.querySelector("#btnDesafiarClase");y&&(y.onclick=async()=>{const c=d.filter(p=>p.id!==e.id);if(!c.length){window.helpers.mostrarAlerta("No hay otros miembros en la clase.","info");return}y.disabled=!0;try{await this._flujoDesafio(c)}catch(p){window.helpers.mostrarAlerta("Error: "+p.message,"error")}finally{y.disabled=!1}}),this._miembrosActuales=d},_fichaMiembro(o,s,e){const n=o.id===s.id,r=o.ultimo_acceso&&Date.now()-new Date(o.ultimo_acceso).getTime()<3e5,d=o.rol_en_grupo==="admin"?'<span class="grupos-miembro__badge grupos-miembro__badge--admin">Administrador</span>':o.rol_en_grupo==="editor"?'<span class="grupos-miembro__badge grupos-miembro__badge--editor">Profesor</span>':"",a=o.rol_en_grupo==="miembro"||!o.rol_en_grupo&&o.rol==="usuario",i=e&&!n&&a?`<button class="grupos-miembro__editar" data-editar-miembro="${o.id}" aria-label="Editar a ${l(o.nombre_completo||o.username)}" title="Editar alumno">${t("settings")}</button>`:"";return`
        <div class="grupos-miembro" data-miembro="${o.id}" role="button" tabindex="0" aria-label="Ver perfil de ${l(o.nombre_completo||o.username)}">
          <div class="grupos-miembro__avatar">${$(o)}</div>
          <div class="grupos-miembro__info">
            <p class="grupos-miembro__nombre">${l(o.nombre_completo||o.username)}${n?' <span class="grupos-miembro__tu">(t\xFA)</span>':""}</p>
            <p class="grupos-miembro__username">@${l(o.username)}</p>
          </div>
          ${d}
          ${i}
          ${r?'<span class="grupos-miembro__online" title="En l\xEDnea"></span>':""}
        </div>`},_renderTab(o,s,e,n){const r=o.querySelector("#gruposTabContenido");r&&(r.innerHTML='<div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:90px;border-radius:var(--card-radius)"></div></div>',n==="personas"?this._tabPersonas(r,s,e):n==="avisos"?this._tabAvisos(r,s,e):n==="trabajo"?this._tabTrabajo(r,s,e):n==="stats"&&this._tabEstadisticas(r,s,e))},async _tabPersonas(o,s,e){const n=e.rol==="owner"||(this._miembros||[]).some(u=>u.id===e.id&&u.rol_en_grupo==="admin"),[r,d]=await Promise.all([window.gruposRepository.obtenerMiembrosDe(s.id),n?window.gruposRepository.solicitudesDeClase(s.id):[]]),a=r.filter(u=>["admin","editor","ayudante"].includes(u.rol_en_grupo)),i=r.filter(u=>!["admin","editor","ayudante"].includes(u.rol_en_grupo)),m=(u,g,_)=>g.length?`
        <div class="grupos-rolgrupo">
          <h4 class="grupos-rolgrupo__titulo">${t(_)} ${u} <span>${g.length}</span></h4>
          <div class="grupos-miembros">${g.map(b=>this._fichaMiembro(b,e,this._esOwner)).join("")}</div>
        </div>`:"",v=d.length?`
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${t("user-plus")}</div>
            <div><h3 class="grupos-seccion__titulo">Solicitudes de ingreso</h3>
            <p class="grupos-seccion__desc">${d.length} espera${d.length!==1?"n":""} tu aprobaci\xF3n</p></div>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${d.map(u=>`
              <div class="grupos-solicitud" data-solicitud="${u.id}">
                <div class="grupos-miembro__avatar">${$(u.perfiles)}</div>
                <div class="grupos-solicitud__info">
                  <p class="grupos-solicitud__nombre">${l(u.perfiles.nombre_completo||u.perfiles.username)}</p>
                  <p class="grupos-solicitud__username">@${l(u.perfiles.username)} \xB7 quiere unirse</p>
                </div>
                <div class="grupos-solicitud__acciones">
                  <button class="btn-primario u-fs-xs" data-solicitud-accion="aceptar">${t("check")} Aprobar</button>
                  <button class="btn-secundario u-fs-xs" data-solicitud-accion="rechazar">${t("x")} Rechazar</button>
                </div>
              </div>`).join("")}
          </div>
        </section>`:"";o.innerHTML=`
        ${v}
        ${m("Profesores",a,"graduation-cap")}
        ${m("Alumnos",i,"users")}
        ${r.length===0?'<p class="u-color-texto-terciario u-fs-sm">Todav\xEDa no hay miembros. Comparte el c\xF3digo de la clase para que se unan.</p>':""}`,window.Iconos&&window.Iconos.actualizar(),o.querySelectorAll("[data-solicitud-accion]").forEach(u=>{u.onclick=async()=>{const g=u.closest("[data-solicitud]"),_=d.find(b=>b.id===g.dataset.solicitud);if(_){u.disabled=!0;try{await window.gruposRepository.resolverSolicitud(_.id,u.dataset.solicitudAccion==="aceptar"),window.helpers.mostrarAlerta(u.dataset.solicitudAccion==="aceptar"?`${_.perfiles.nombre_completo||_.perfiles.username} ahora es miembro.`:"Solicitud rechazada.","exito"),this._tabPersonas(o,s,e)}catch(b){u.disabled=!1,window.helpers.mostrarAlerta("Error: "+b.message,"error")}}}}),o.querySelectorAll("[data-miembro]").forEach(u=>{u.onclick=g=>{if(g.target.closest(".grupos-miembro__editar"))return;const _=r.find(b=>b.id===u.dataset.miembro);_&&this._perfilRapido(_)}}),o.querySelectorAll("[data-editar-miembro]").forEach(u=>{u.onclick=async g=>{g.stopPropagation();const _=r.find(b=>b.id===u.dataset.editarMiembro);_&&this._gestionarAlumno(_,s,document.getElementById("app-root"))}})},async _tabAvisos(o,s,e){const n=["admin","editor","owner"].includes(e.rol)||(this._miembros||[]).some(a=>a.id===e.id&&["admin","editor","ayudante"].includes(a.rol_en_grupo)),r=await window.gruposRepository.listarAvisos(s.id);o.innerHTML=`
        ${n?`
        <form class="grupos-aviso-form" id="avisoForm">
          <div class="grupos-aviso-form__avatar">${$(e)}</div>
          <div class="grupos-aviso-form__caja">
            <textarea id="avisoTexto" rows="2" maxlength="2000" placeholder="Anuncia algo a la clase\u2026" aria-label="Contenido del aviso"></textarea>
            <div class="grupos-aviso-form__pie">
              <span class="u-fs-xxs u-color-texto-terciario" id="avisoContador">0/2000</span>
              <button class="btn-primario u-fs-xs" type="submit" id="avisoEnviar">${t("send")} Publicar</button>
            </div>
          </div>
        </form>`:""}
        <div class="o-pila" style="gap:var(--espaciado-sm)" id="avisosLista">
          ${r.length?r.map(a=>this._tarjetaAviso(a,e,n)).join(""):'<p class="u-color-texto-terciario u-fs-sm">A\xFAn no hay avisos en esta clase.</p>'}
        </div>`,window.Iconos&&window.Iconos.actualizar();const d=o.querySelector("#avisoForm");if(d){const a=o.querySelector("#avisoTexto"),i=o.querySelector("#avisoContador");a.addEventListener("input",()=>{i&&(i.textContent=`${a.value.length}/2000`)}),d.addEventListener("submit",async m=>{m.preventDefault();const v=a.value.trim();if(!v){window.helpers.mostrarAlerta("Escribe el contenido del aviso.","advertencia");return}const u=o.querySelector("#avisoEnviar");u.disabled=!0;try{await window.gruposRepository.crearAviso(s.id,v),window.helpers.mostrarAlerta("Aviso publicado.","exito"),this._tabAvisos(o,s,e)}catch(g){u.disabled=!1,window.helpers.mostrarAlerta("Error: "+g.message,"error")}})}o.querySelectorAll("[data-eliminar-aviso]").forEach(a=>{a.onclick=async()=>{if(await window.helpers.confirmar("\xBFEliminar este aviso?",{titulo:"Eliminar aviso",textoConfirmar:"Eliminar"}))try{await window.gruposRepository.eliminarAviso(a.dataset.eliminarAviso),this._tabAvisos(o,s,e)}catch(m){window.helpers.mostrarAlerta("Error: "+m.message,"error")}}})},_tarjetaAviso(o,s,e){const n=o.perfiles&&o.perfiles[0]||o.perfiles||{},r=e||n.id===s.id;return`
        <article class="grupos-aviso">
          <div class="grupos-miembro__avatar">${$(n)}</div>
          <div class="grupos-aviso__cuerpo">
            <div class="grupos-aviso__meta">
              <strong>${l(n.nombre_completo||n.username)}</strong>
              <span>${l(window.helpers.formatearFecha(o.creado_en))}</span>
              ${r?`<button class="grupos-aviso__borrar" data-eliminar-aviso="${o.id}" aria-label="Eliminar aviso">${t("trash-2")}</button>`:""}
            </div>
            <p class="grupos-aviso__contenido">${l(o.contenido)}</p>
          </div>
        </article>`},async _tabTrabajo(o,s,e){const n=["admin","editor","owner"].includes(e.rol)||(this._miembros||[]).some(i=>i.id===e.id&&["admin","editor","ayudante"].includes(i.rol_en_grupo)),[r,d]=await Promise.all([window.examenesRepository.listarExamenesSueltos(s.id).catch(()=>[]),window.examenesRepository.listarEvaluaciones(s.id).catch(()=>[])]),a=[...r,...d.flatMap(i=>i.examenes||[])].filter(Boolean);o.innerHTML=a.length?`
        <div class="o-pila" style="gap:var(--espaciado-xs)">
          ${a.map(i=>`
            <div class="grupos-trabajo-item">
              <span class="grupos-trabajo-item__icono">${t("clipboard-check")}</span>
              <div class="grupos-trabajo-item__info">
                <p class="grupos-trabajo-item__titulo">${l(i.titulo||"Examen")}</p>
                <p class="grupos-trabajo-item__sub">${l(i.asignatura||"")}${n?` \xB7 ${i.intentos||0} entrega${i.intentos===1?"":"s"}`:""}</p>
              </div>
              <a class="btn-secundario u-fs-xs" href="#!/tomar/${encodeURIComponent(i.id)}">${t("eye")} Ver</a>
            </div>`).join("")}
        </div>`:'<p class="u-color-texto-terciario u-fs-sm">A\xFAn no hay ex\xE1menes en esta clase.</p>',window.Iconos&&window.Iconos.actualizar()},async _tabEstadisticas(o,s,e){const[n,r,d]=await Promise.all([window.gruposRepository.estadisticasClase(s.id),window.gruposRepository.progresoMiembros(s.id),window.gruposRepository.actividadClase(s.id,15)]),a=n||{},i=(u,g,_)=>`
        <div class="grupos-stats-card">
          <span class="grupos-stats-card__icono">${t(u)}</span>
          <p class="grupos-stats-card__valor">${_}</p>
          <p class="grupos-stats-card__etiqueta">${g}</p>
        </div>`,m=r.length?`
        <div class="grupos-stats-seccion">
          <h4 class="grupos-rolgrupo__titulo">${t("book-open")} Progreso de estudio</h4>
          <div class="grupos-progreso-lista">
            ${r.map(u=>`
              <div class="grupos-progreso-item">
                <span class="grupos-miembro__avatar">${$(u)}</span>
                <div class="grupos-progreso-item__info">
                  <p class="grupos-progreso-item__nombre">${l(u.nombre_completo||u.username)}</p>
                  <div class="grupos-progreso-item__barra"><span style="transform:scaleX(${Math.min(1,(u.capitulos_estudiados||0)/50)});transform-origin:left center"></span></div>
                </div>
                <strong class="grupos-progreso-item__num">${u.capitulos_estudiados||0}</strong>
              </div>`).join("")}
          </div>
        </div>`:"",v=d.length?`
        <div class="grupos-stats-seccion">
          <h4 class="grupos-rolgrupo__titulo">${t("activity")} Actividad reciente</h4>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${d.map(u=>`
              <div class="grupos-actividad">
                <span class="grupos-actividad__icono">${t(this._iconoActividad(u.tipo))}</span>
                <p class="grupos-actividad__texto">${l(this._textoActividad(u))}</p>
                <span class="grupos-actividad__fecha">${l(window.helpers.formatearFecha(u.creado_en))}</span>
              </div>`).join("")}
          </div>
        </div>`:"";o.innerHTML=`
        <div class="grupos-stats-grid">
          ${i("users","Miembros",a.miembros??"\u2014")}
          ${i("graduation-cap","Profesores",a.profesores??"\u2014")}
          ${i("clipboard-check","Ex\xE1menes",a.examenes??"\u2014")}
          ${i("megaphone","Avisos",a.avisos??"\u2014")}
          ${i("user-plus","Solicitudes pendientes",a.solicitudes_pendientes??"\u2014")}
          ${i("zap","Activos (7 d\xEDas)",a.activos_7d??"\u2014")}
        </div>
        ${m}
        ${v}`,window.Iconos&&window.Iconos.actualizar()},_iconoActividad(o){return o==="solicitud_ingreso"?"user-plus":o==="solicitud_aceptada"?"user-check":o==="solicitud_rechazada"?"user-x":o==="aviso_creado"?"megaphone":o==="ingreso_codigo"?"log-in":"activity"},_textoActividad(o){const s=o.perfiles&&o.perfiles[0]||o.perfiles||{},e=s.nombre_completo||s.username||"Alguien";return o.tipo==="solicitud_ingreso"?`${e} solicit\xF3 unirse a la clase`:o.tipo==="solicitud_aceptada"?`Solicitud de ${e} aprobada`:o.tipo==="solicitud_rechazada"?`Solicitud de ${e} rechazada`:o.tipo==="aviso_creado"?`${e} public\xF3 un aviso`:o.tipo==="ingreso_codigo"?`${e} se uni\xF3 con el c\xF3digo`:`${e} \xB7 ${o.tipo}`},async _perfilRapido(o){let s=o;try{const a=await window.supabaseClient.from("perfiles").select("id, nombre_completo, username, rol, foto_perfil, biografia, creado_en").eq("id",o.id).limit(1);!a.error&&a.data&&a.data[0]&&(s=a.data[0])}catch{}const e=s.id===this._usuario.id,n=document.createElement("div");n.className="modal-overlay",n.innerHTML=`
        <div class="modal grupos-perfil">
          <div class="grupos-perfil__avatar">${$(s,!0)}</div>
          <h3 class="grupos-perfil__nombre">${l(s.nombre_completo||s.username)}</h3>
          <p class="grupos-perfil__username">@${l(s.username)}</p>
          <span class="perfil-rol-badge">${S(s.rol)}</span>
          <div class="grupos-perfil__meta">
            <span>${t("calendar")} Miembro desde ${l(I(s.creado_en))}</span>
          </div>
          ${s.biografia?`<p class="grupos-perfil__bio">${l(s.biografia)}</p>`:""}
          <div class="grupos-perfil__acciones">
            ${e?"":`<button class="btn-primario grupos-perfil__desafiar" data-perfil-desafio="${s.id}">${t("sword")} Desafiar</button>`}
            <button class="btn-secundario grupos-perfil__cerrar">${t("x")} Cerrar</button>
          </div>
        </div>`,document.body.appendChild(n),window.Iconos&&window.Iconos.actualizar();const r=()=>n.remove();n.querySelector(".grupos-perfil__cerrar").onclick=r,n.addEventListener("click",a=>{a.target===n&&r()});const d=n.querySelector("[data-perfil-desafio]");d&&(d.onclick=async()=>{d.disabled=!0;try{await this._flujoDesafio([s]),r()}catch(a){d.disabled=!1,window.helpers.mostrarAlerta("Error: "+a.message,"error")}})},async _gestionarAlumno(o,s,e){const n=this._usuario,r=o.nombre_completo||o.username||"el alumno",d=()=>{e&&e.isConnected&&this._montarGrupo(e,s.id)},a=document.createElement("div");a.className="modal-overlay",a.innerHTML=`
        <div class="modal grupos-gestion">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${t("settings")} Editar alumno</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${t("x")}</button>
            </div>
            <div class="grupos-gestion__usuario">
              <div class="grupos-gestion__avatar">${$(o)}</div>
              <div>
                <p class="grupos-gestion__nombre">${l(r)}</p>
                <p class="grupos-gestion__username">@${l(o.username)} \xB7 ${l(s.nombre)}</p>
              </div>
            </div>
            <div class="grupos-gestion__acciones">
              <button class="grupos-gestion__accion" data-accion="cambiar">
                <span class="grupos-gestion__accion-icono">${t("arrow-left-right")}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Cambiar de grupo</span>
                  <span class="grupos-gestion__accion-desc">Asignar ${l(r)} a otra clase</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${t("chevron-right")}</span>
              </button>
              <button class="grupos-gestion__accion" data-accion="eliminar">
                <span class="grupos-gestion__accion-icono">${t("user-minus")}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Eliminar de este grupo</span>
                  <span class="grupos-gestion__accion-desc">Sacar a ${l(r)} de \xAB${l(s.nombre)}\xBB</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${t("chevron-right")}</span>
              </button>
              <button class="grupos-gestion__accion" data-accion="sinsgrupo">
                <span class="grupos-gestion__accion-icono">${t("user-x")}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Dejar sin grupo</span>
                  <span class="grupos-gestion__accion-desc">Quitar la clase principal a ${l(r)}</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${t("chevron-right")}</span>
              </button>
            </div>
          </div>
        </div>`,document.body.appendChild(a),window.Iconos&&window.Iconos.actualizar();const i=()=>a.remove();a.querySelector("[data-cerrar]").onclick=i,a.addEventListener("click",m=>{m.target===a&&i()}),a.querySelectorAll("[data-accion]").forEach(m=>{m.onclick=async()=>{m.disabled=!0;const v=m.dataset.accion;try{if(v==="cambiar")i(),await this._cambiarGrupoAlumno(o,s,e);else if(v==="eliminar"){if(!await window.helpers.confirmar(`\xBFEliminar a ${l(r)} de \xAB${l(s.nombre)}\xBB? Podr\xE1s volver a a\xF1adirlo con el c\xF3digo de la clase.`,{titulo:"Eliminar del grupo",textoConfirmar:"Eliminar"})){i();return}await window.gruposRepository.salirDeGrupo(s.id,o.id),o.grupo_id===s.id&&await window.adminRepository.actualizarUsuario(o.id,{nombre_completo:o.nombre_completo,username:o.username,rol:o.rol,grupo_id:null}),await window.adminRepository.registrarAuditoria("usuario:grupo",`${l(r)} eliminado de \xAB${l(s.nombre)}\xBB`,n.id),window.helpers.mostrarAlerta(`${l(r)} ya no est\xE1 en \xAB${l(s.nombre)}\xBB.`,"exito"),d()}else if(v==="sinsgrupo"){if(!await window.helpers.confirmar(`\xBFDejar a ${l(r)} sin grupo? Se le quitar\xE1 su clase principal y podr\xE1s asignarle otra despu\xE9s.`,{titulo:"Dejar sin grupo",textoConfirmar:"Dejar sin grupo"})){i();return}await window.adminRepository.actualizarUsuario(o.id,{nombre_completo:o.nombre_completo,username:o.username,rol:o.rol,grupo_id:null}),await window.gruposRepository.salirDeGrupo(s.id,o.id),await window.adminRepository.registrarAuditoria("usuario:grupo",`${l(r)} dejado sin grupo`,n.id),window.helpers.mostrarAlerta(`${l(r)} qued\xF3 sin grupo.`,"exito"),d()}}catch(u){m.disabled=!1,window.helpers.mostrarAlerta("Error: "+u.message,"error")}}})},async _cambiarGrupoAlumno(o,s,e){const n=this._usuario,r=await window.adminRepository.listarGrupos(),d=(r||[]).map(m=>({valor:m.id,texto:m.nombre})),a=await window.helpers.formulario({titulo:"Cambiar de grupo",mensaje:`Selecciona la nueva clase para ${l(o.nombre_completo||o.username)}.`,campos:[{nombre:"grupo_id",etiqueta:"Grupo",tipo:"select",valor:o.grupo_id||s.id||"",opciones:d}],textoConfirmar:"Guardar"});if(!a)return;const i=a.grupo_id||null;if(i===(o.grupo_id||null)&&i!==null){window.helpers.mostrarAlerta("Ya est\xE1 en ese grupo.","info");return}try{await window.adminRepository.actualizarUsuario(o.id,{nombre_completo:o.nombre_completo,username:o.username,rol:o.rol,grupo_id:i}),i!==s.id&&await window.gruposRepository.salirDeGrupo(s.id,o.id),await window.adminRepository.registrarAuditoria("usuario:grupo",`${l(o.nombre_completo||o.username)} movido a ${i?"nuevo grupo":"sin grupo"}`,n.id);const m=i?r.find(v=>v.id===i)?.nombre||"nuevo grupo":"sin grupo";window.helpers.mostrarAlerta(`${l(o.nombre_completo||o.username)} ahora est\xE1 en ${m}.`,"exito"),e&&e.isConnected&&this._montarGrupo(e,s.id)}catch(m){window.helpers.mostrarAlerta("Error: "+m.message,"error")}},async _flujoDesafio(o){if(this._flujoEnCurso)return;this._flujoEnCurso=!0;const s=()=>{this._flujoEnCurso=!1},e=this._usuario,n=await window.desafiosRepository.listarMazosDesafio();if(!n.length){window.helpers.mostrarAlerta("A\xFAn no hay mazos de memorizaci\xF3n para desafiar.","info"),s();return}const r=await window.memorizacionRepository.listarTarjetas(null),d=g=>(r||[]).filter(_=>_.mazo_id===g).length,a=document.createElement("div");a.className="modal-overlay",a.innerHTML=`
        <div class="modal">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${t("sword")} Elegir mazo</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${t("x")}</button>
            </div>
            <p class="u-fs-xs u-color-texto-terciario">Desafiar\xE1s a ${o.length} participante${o.length!==1?"s":""}. Todos responder\xE9is las mismas preguntas.</p>
            <div class="grupos-tiempo">
              <p class="grupos-tiempo__titulo">Tiempo por desaf\xEDo</p>
              <div class="grupos-tiempo__opciones" role="radiogroup" aria-label="Tiempo del desaf\xEDo">
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="limitado" checked>
                  <span>Con tiempo</span>
                </label>
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="ilimitado">
                  <span>Sin l\xEDmite</span>
                </label>
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="carrera">
                  <span>El primero que acabe</span>
                </label>
              </div>
              <div class="grupos-tiempo__minutos" id="gruposTiempoMinutos">
                <label class="grupos-tiempo__campo">
                  <span>Minutos</span>
                  <input type="number" id="tiempoMinutos" min="1" step="1" value="2" inputmode="numeric">
                </label>
                <p class="grupos-tiempo__ayuda">M\xEDnimo 1 minuto</p>
              </div>
            </div>
            <div class="grupos-mazos">
              ${n.length===0?'<p class="u-color-texto-terciario u-fs-sm">Sin mazos disponibles.</p>':n.map(g=>`
                  <button class="grupos-mazo" data-mazo="${g.id}" data-nombre="${l(g.nombre)}">
                    <span class="grupos-mazo__icono">${t(g.icono||"layers")}</span>
                    <span class="grupos-mazo__info">
                      <span class="grupos-mazo__nombre">${l(g.nombre)}</span>
                      <span class="grupos-mazo__desc">${l(g.descripcion||"Mazo de memorizaci\xF3n")} \xB7 ${d(g.id)} tarjetas</span>
                    </span>
                    <span class="grupos-mazo__flecha">${t("chevron-right")}</span>
                  </button>`).join("")}
            </div>
          </div>
        </div>`,document.body.appendChild(a),window.Iconos&&window.Iconos.actualizar();let i=null;const m=()=>{a.remove(),i&&i(null),s()};a.querySelector("[data-cerrar]").onclick=m,a.addEventListener("click",g=>{g.target===a&&m()});const v=a.querySelector("#gruposTiempoMinutos"),u=()=>{const g=a.querySelector('input[name="tiempoDesafio"]:checked');v&&g&&(v.hidden=g.value!=="limitado")};return a.querySelectorAll('input[name="tiempoDesafio"]').forEach(g=>g.addEventListener("change",u)),new Promise(g=>{i=g,a.querySelectorAll("[data-mazo]").forEach(_=>{_.onclick=async()=>{const b=n.find(p=>p.id===_.dataset.mazo);if(!b)return;const C=(r||[]).filter(p=>p.mazo_id===b.id);if(!C.length){window.helpers.mostrarAlerta("Ese mazo no tiene tarjetas todav\xEDa.","advertencia");return}const w=a.querySelector('input[name="tiempoDesafio"]:checked'),A=w&&w.value==="ilimitado",h=w&&w.value==="carrera",y=Math.max(1,parseInt(a.querySelector("#tiempoMinutos")?.value,10)||2),c=k().construirSesion(C,r||[],{maxTarjetas:10});a.remove(),_.disabled=!0;try{const p=await window.desafiosRepository.crearDesafio({creador:e,participantes:o,mazo:b,sesion:c,tiempoLimiteSeg:A||h?null:y*60,finalizaPrimerTerminado:h});window.helpers.mostrarAlerta(`Desaf\xEDo enviado a ${o.length} participante${o.length!==1?"s":""}.`,"exito"),g(p),s(),router.navegar("/desafio/"+p.id)}catch(p){_.disabled=!1;const f=p&&p.message||"";/finaliza_primer_terminado.*does not exist/i.test(f)?window.helpers.mostrarAlerta('El modo "El primero que acabe" requiere aplicar la migraci\xF3n 036 en la base de datos.',"advertencia"):window.helpers.mostrarAlerta("Error: "+f,"error"),g(null),s()}}})})}}})();
