(function(){"use strict";const c=a=>window.Iconos.render(a),u=a=>window.helpers.escapeHtml(a),z=a=>window.adminComunes.rolBonito(a),k=a=>window.adminComunes.tiempoRelativo(a),M=a=>window.adminComunes.tiempoRelativoPreciso(a),B=[{id:"centro",icono:"command",texto:"Mi clase"},{id:"usuarios",icono:"users",texto:"Usuarios"},{id:"examenes",icono:"file-text",texto:"Ex\xE1menes"}],N=[{id:"centro",icono:"command",texto:"Centro"},{id:"usuarios",icono:"users",texto:"Usuarios"},{id:"grupos",icono:"layout",texto:"Grupos"},{id:"examenes",icono:"file-text",texto:"Ex\xE1menes"},{id:"memorizacion",icono:"brain",texto:"Memorizaci\xF3n"},{id:"sugerencias",icono:"message-square",texto:"Sugerencias"},{id:"contacto",icono:"mail",texto:"Contacto"},{id:"auditoria",icono:"clipboard-list",texto:"Auditor\xEDa"},{id:"admins",icono:"shield",texto:"Administradores"},{id:"marca",icono:"palette",texto:"Marca"},{id:"notificaciones",icono:"bell",texto:"Notificaciones"},{id:"sistema",icono:"database",texto:"Sistema"}],T=[{valor:"versiculo",texto:"Vers\xEDculo",icono:"book-open"},{valor:"completar",texto:"Completar palabras",icono:"edit-3"},{valor:"ordenar",texto:"Ordenar palabras",icono:"list-ordered"},{valor:"elegir_versiculo",texto:"Elegir el vers\xEDculo",icono:"check-circle"},{valor:"verdadero_falso",texto:"Verdadero o falso",icono:"help-circle"},{valor:"relacionar",texto:"Relacionar",icono:"link-2"},{valor:"escrita",texto:"Respuesta escrita",icono:"pen-line"},{valor:"libre",texto:"Tarjeta libre (legacy)",icono:"layers"}],R=["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#84CC16"];function j(a,o){return a&&/^#[0-9a-fA-F]{6}$/.test(a)?a:R[(o>=0?o:0)%R.length]}function L(a,o){const t=new Date;if(o==="hoy"){const e=t.toISOString().slice(0,10);return a.filter(i=>i.creado_en&&i.creado_en.slice(0,10)===e)}if(o==="semana"){const e=new Date(t.getTime()-6048e5);return a.filter(i=>i.creado_en&&new Date(i.creado_en)>=e)}if(o==="mes"){const e=new Date(t.getTime()-2592e6);return a.filter(i=>i.creado_en&&new Date(i.creado_en)>=e)}return a}window.vistaPanelAdmin={_rangoRol(a){switch((a||"").toString().trim().toLowerCase()){case"owner":return 4;case"admin":return 3;case"editor":return 2;default:return 1}},_esOwnerActor(a){return(a&&a.rol||"").toString().trim().toLowerCase()==="owner"},_puedeEliminar(a,o){return!(!a||!o||a.id===o.id||this._rangoRol(a.rol)<=this._rangoRol(o.rol)||!this._esOwnerActor(a)&&a.grupo_id&&o.grupo_id!==a.grupo_id)},_puedeEditar(a,o){return!(!a||!o||this._rangoRol(a.rol)<=this._rangoRol(o.rol)||!this._esOwnerActor(a)&&a.grupo_id&&o.grupo_id!==a.grupo_id)},_opcionesRolPermitidas(a){return[{valor:"usuario",texto:"Alumno"},{valor:"editor",texto:"Profesor (editor)"},{valor:"admin",texto:"Administrador"},{valor:"owner",texto:"Propietario"}].filter(o=>this._rangoRol(o.valor)<this._rangoRol(a.rol))},_esOwner(){return(this._datos&&this._datos.usuario&&this._datos.usuario.rol||"").toString().toLowerCase()==="owner"},_volver(){window.adminComunes.volver(this)},async montar(a,o){const t=store.obtener("usuario");if(!t||!["admin","owner"].includes((t.rol||"").toString().trim().toLowerCase())){a.innerHTML='<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" data-admin-volver>Volver</button></div>',a.querySelector("[data-admin-volver]")?.addEventListener("click",()=>this._volver());return}a.innerHTML=window.skeleton?`<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8,{ancho:"100%"})}</div>`:'<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel...</p></div>',this._inicioSesion=Date.now();try{const e=(t.rol||"").toString().trim().toLowerCase()==="owner",[i,r,n,s,d,l,m,_,f,y]=await Promise.all(e?[window.adminRepository.listarUsuarios(t),window.adminRepository.listarGrupos(t),window.adminRepository.listarExamenes(t),window.adminRepository.statsGenerales(t),window.adminRepository.obtenerAuditoria(),window.adminRepository.obtenerResumenExamenes(),window.adminRepository.listarBackups(),window.adminRepository.listarConfiguracion(),window.sugerenciasRepository?window.sugerenciasRepository.listarTodas():Promise.resolve([]),window.adminRepository.listarMensajesContacto().catch(()=>[])]:[window.adminRepository.listarUsuarios(t),window.adminRepository.listarGrupos(t),window.adminRepository.listarExamenes(t),window.adminRepository.statsGenerales(t),Promise.resolve([]),window.adminRepository.obtenerResumenExamenes(),Promise.resolve([]),Promise.resolve({}),Promise.resolve([]),Promise.resolve([])]);let b=i,E=r,A=n;if(!e)if(t.grupo_id){const w=t.grupo_id;b=i.filter(g=>g.id===t.id||g.grupo_id===w),E=r.filter(g=>g.id===w),A=n.filter(g=>g.grupo_id===w)}else b=[],E=[],A=[];this._datos={usuarios:b,grupos:E,examenes:A,stats:s,auditoria:d,resumenExamenes:l,backups:m,config:_,sugerencias:f,contacto:y,usuario:t},this._nivelActivo=e?"owner":"admin",this._tabActivo="centro";const h=o&&o.query,C=w=>h&&typeof h.get=="function"?h.get(w):h?h[w]:null,S=C("tab");if(S){this._tabActivo=S,e&&(this._nivelActivo="owner");const w=C("mazo");w&&this._tabActivo==="memorizacion"&&e&&(this._mazoDeepLink=w)}this._pagUsuarios=1,this._porPagina=50,this._buscarUsuarios="",this._filtroRol="todos",this._filtroGrupo="todos",this._filtroEstado="todos",this._ordenUsuarios="actividad",this._buscarExamenes="",this._filtroExamenEstado="todos",this._filtroExamenGrupo="todos",this._filtroAuditoria="todos",this._busquedaAuditoria="",this._filtroSugerencias="todas",this._seleccion=new Set,this._logoPendiente=null,_&&_.marca_nombre&&(document.title=_.marca_nombre),this._renderizar(a)}catch(e){a.innerHTML=`<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`}},_renderNivelSwitch(){return`
        <div class="admin-nivel" role="tablist" aria-label="Nivel de administraci\xF3n">
          ${[{id:"owner",icono:"globe",texto:"Administraci\xF3n general",rol:"Owner"},{id:"admin",icono:"layout",texto:"Gesti\xF3n del centro",rol:"Admin"}].map(o=>`
            <button class="admin-nivel__btn${this._nivelActivo===o.id?" admin-nivel__btn--activo":""}" data-nivel="${o.id}" role="tab" aria-selected="${this._nivelActivo===o.id}">
              ${c(o.icono)} ${o.texto} <span class="admin-nivel__rol">${o.rol}</span>
            </button>`).join("")}
        </div>`},_renderizar(a){const o=this._esOwner(),t=this._nivelActivo==="owner"?N:B;t.some(n=>n.id===this._tabActivo)||(this._tabActivo="centro");const e=this._datos.config||{},i={nombre:e.marca_nombre||"",logo:e.marca_logo||""},r=o?"Gestiona toda la plataforma: usuarios, clases, ex\xE1menes, contenido y sistema.":"Gestiona \xFAnicamente los usuarios y ex\xE1menes de tu clase.";a.innerHTML=`
        <div class="o-contenedor o-pila o-pila--lg admin-panel" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${window.adminComunes.cabeceraPanel("Centro de Administraci\xF3n",r,"vistaPanelAdmin",i)}
          ${o?this._renderNivelSwitch():""}
          <div class="admin-tabs" role="tablist" aria-label="Secciones">${t.map(n=>`
            <button class="admin-tab${this._tabActivo===n.id?" admin-tab--activo":""}" data-tab="${n.id}" role="tab" aria-selected="${this._tabActivo===n.id}">${c(n.icono)} ${n.texto}</button>`).join("")}</div>
          <div id="adminContenido">${this._renderTabContent(a)}</div>
        </div>`,window.adminComunes.bindTabs(this,a),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(a),a.querySelector("[data-admin-volver]")?.addEventListener("click",()=>this._volver()),a.querySelectorAll("[data-nivel]").forEach(n=>{n.onclick=()=>{this._nivelActivo=n.dataset.nivel,this._tabActivo="centro",this._renderizar(a)}}),this._bindTabContent(a),window.Iconos&&window.Iconos.actualizar()},_renderTabContent(a){const{usuarios:o,grupos:t,examenes:e,usuario:i}=this._datos;if(this._nivelActivo==="owner")switch(this._tabActivo){case"centro":return this._renderCentro();case"usuarios":return this._renderUsuarios(o,i);case"grupos":return this._renderGrupos(t,e,o);case"examenes":return this._renderExamenes(e);case"memorizacion":return this._renderMemorizacion();case"sugerencias":return this._renderSugerencias();case"contacto":return this._renderContacto();case"auditoria":return this._renderAuditoria();case"admins":return this._renderAdmins(o,i);case"marca":return this._renderMarca();case"notificaciones":return this._renderNotificaciones();case"sistema":return this._renderSistema();default:return""}switch(this._tabActivo){case"centro":return this._renderCentro();case"usuarios":return this._renderUsuarios(o,i);case"examenes":return this._renderExamenes(e);default:return""}},_renderCentro(){const{usuarios:a,grupos:o,examenes:t,stats:e}=this._datos,i=this._esOwner(),{porRol:r}=e,n=this._datos.resumenExamenes||{},s=a.filter(p=>p.activo!==!1).length,d=a.filter(p=>p.activo===!1).length,l=a.filter(p=>p.activo!==!1&&p.ultimo_acceso&&Date.now()-new Date(p.ultimo_acceso).getTime()<3e5).length,m=r.usuario||0,_=r.editor||0,f=t.filter(p=>p.estado==="publicado").length,y=t.filter(p=>p.estado==="borrador").length,b=this._mediaGlobal(),E=Object.values(n).reduce((p,v)=>p+(v.pendientes||0),0),A=s+d,h=A?Math.round(s*100/A):0,C=a.filter(p=>p.activo===!1),S=a.filter(p=>p.rol==="editor"&&!p.grupo_id),w=a.filter(p=>p.rol==="usuario"&&!p.grupo_id),g=t.filter(p=>p.estado!=="publicado"),U=o.filter(p=>!t.some(v=>v.grupo_id===p.id)),$=[],q=(p,v,G,P,V)=>({tipo:p,icono:v,titulo:G,meta:P,accion:V});C.length&&$.push(q("aviso","user-x",`${C.length} usuario${C.length!==1?"s":""} pendiente${C.length!==1?"s":""} de activar`,"Usuarios sin acceso a la plataforma",{tab:"usuarios",rol:"todos",grupo:"todos",estado:"inactivos"})),S.length&&$.push(q("info","book-open",`${S.length} profesor${S.length!==1?"es":""} sin grupo`,"Sin asignaci\xF3n a una clase",{tab:"usuarios",rol:"editor",grupo:"sin-grupo",estado:"todos"})),g.length&&$.push(q("info","file-text",`${g.length} examen${g.length!==1?"es":""} sin publicar`,"Quedaron en borrador",{tab:"examenes",estado:"borrador"})),this._esOwner()&&U.length&&$.push(q("info","layout",`${U.length} grupo${U.length!==1?"s":""} sin ex\xE1menes`,"Clases a\xFAn sin evaluaciones",{tab:"grupos"})),w.length&&$.push(q("aviso","user",`${w.length} alumno${w.length!==1?"s":""} sin grupo`,"Sin asignaci\xF3n a una clase",{tab:"usuarios",rol:"usuario",grupo:"sin-grupo",estado:"todos"}));const D=$.length===0?`<div class="admin-todo-al-dia">
            <span class="admin-todo-al-dia__icono">${c("check-circle")}</span>
            <div>
              <p class="admin-todo-al-dia__titulo">Todo al d\xEDa</p>
              <p class="admin-todo-al-dia__meta">No hay alertas ni tareas que requieran tu atenci\xF3n</p>
            </div>
          </div>`:`<div class="admin-pendiente">${$.map(p=>`
            <div class="admin-pendiente__item">
              <span class="admin-pendiente__icono admin-pendiente__icono--${p.tipo}">${c(p.icono)}</span>
              <div class="admin-pendiente__info">
                <p class="admin-pendiente__titulo">${u(p.titulo)}</p>
                <p class="admin-pendiente__meta">${u(p.meta)}</p>
              </div>
              <button class="btn-secundario u-fs-xs admin-pendiente__btn" data-pendiente="${encodeURIComponent(JSON.stringify(p.accion))}">${c("check")} Resolver</button>
            </div>`).join("")}</div>`,x=(p,v,G,P="")=>`
        <div class="tarjeta-estadistica">
          <div class="tarjeta-estadistica__icono ${P}">${c(p)}</div>
          <div class="tarjeta-estadistica__info">
            <p class="tarjeta-estadistica__valor">${v}</p>
            <p class="tarjeta-estadistica__etiqueta">${G}</p>
          </div>
        </div>`,F=`
        <div class="admin-vista-general">
          <div class="admin-vista-general__stats">
            ${x("user-check",s,"Usuarios activos","admin-stat--ok")}
            ${x("wifi",l,"En l\xEDnea ahora","admin-stat--ok")}
            ${x("user-x",d,"Bloqueados","admin-stat--error")}
            ${x("layout",o.length,i?"Grupos":"Clase")}
            ${x("check-circle",f,"Ex\xE1menes publicados","admin-stat--ok")}
            ${x("graduation-cap",m,"Alumnos")}
            ${x("book-open",_,"Profesores")}
            ${x("clipboard-check",b!==null?b.toFixed(1):"\u2014","Nota media")}
            ${x("clock",E,"Por corregir","admin-stat--aviso")}
          </div>
          <div class="admin-vista-general__chart">
            <div class="admin-donut" style="background:conic-gradient(var(--color-exito) 0% ${h}%, var(--color-error) ${h}% 100%)" role="img" aria-label="Estado de los alumnos: ${s} activos, ${d} bloqueados">
              <div class="admin-donut__centro">
                <span class="admin-donut__valor">${A}</span>
                <span class="admin-donut__etiqueta">alumnos</span>
              </div>
            </div>
            <div class="admin-donut-leyenda">
              <p class="admin-donut-leyenda__titulo">Estado de los alumnos</p>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--ok"></span>Activos \xB7 ${s}</span>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--error"></span>Bloqueados \xB7 ${d}</span>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--neutro"></span>Borradores \xB7 ${y}</span>
            </div>
          </div>
        </div>`,O=[{id:"usuarios",icono:"users",color:"azul",titulo:"Usuarios",sub:`${a.length} registrados`,mini:[{id:"crear-alumno",icono:"user-plus",texto:"Crear alumno"},{id:"crear-profesor",icono:"book-open",texto:"Crear profesor"},{id:"importar-csv",icono:"upload",texto:"Importar CSV"}]},{id:"grupos",icono:"layout",color:"verde",titulo:"Grupos",sub:`${o.length} clases`,mini:[{id:"crear-grupo",icono:"plus",texto:"Crear grupo"},{id:"ver-grupos",icono:"eye",texto:"Ver todos"},{id:"ver-examenes",icono:"file-text",texto:"Ver ex\xE1menes"}]},{id:"examenes",icono:"file-text",color:"violeta",titulo:"Ex\xE1menes",sub:`${f} publicados`,mini:[{id:"crear-examen",icono:"plus",texto:"Crear examen"},{id:"ver-publicados",icono:"check-circle",texto:"Publicados"},{id:"ver-borradores",icono:"edit-3",texto:"Borradores"}]},{id:"memorizacion",icono:"brain",color:"naranja",titulo:"Memorizaci\xF3n",sub:"Mazos y tarjetas",mini:[{id:"crear-mazo",icono:"plus",texto:"Crear mazo"},{id:"sembrar-mazos",icono:"sparkles",texto:"Sembrar contenido"},{id:"importar-mazo",icono:"upload",texto:"Importar mazo"}]}],I=`
        <div class="admin-herramientas">
          ${(this._esOwner()?O:O.filter(p=>p.id==="usuarios"||p.id==="examenes")).map(p=>`
            <div class="admin-herramienta admin-herramienta--${p.color}" data-herramienta-tab="${p.id}" role="button" tabindex="0" aria-label="Abrir ${p.titulo}">
              <div class="admin-herramienta__cabecera">
                <span class="admin-herramienta__icono">${c(p.icono)}</span>
                <div class="admin-herramienta__info">
                  <p class="admin-herramienta__titulo">${p.titulo}</p>
                  <p class="admin-herramienta__sub">${p.sub}</p>
                </div>
                <span class="admin-herramienta__flecha">${c("chevron-right")}</span>
              </div>
              <div class="admin-herramienta__mini">
                ${p.mini.map(v=>`<button class="admin-herramienta__mini-btn" data-mini="${v.id}">${c(v.icono)} ${v.texto}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>`;return`
        <div class="admin-centro">
          ${window.adminComunes.seccion({icono:"bar-chart-2",iconoClase:"admin-seccion__icono--acento",titulo:i?"Vista General del Centro":"Vista General de tu Clase",desc:i?"Estado actual de toda la plataforma":"Estado actual de tu clase",contenido:F})}
          ${window.adminComunes.seccion({icono:"list-todo",iconoClase:$.length?"admin-seccion__icono--aviso":"admin-seccion__icono--exito",titulo:"Tareas Pendientes",desc:"Alertas y acciones que requieren tu atenci\xF3n",contador:$.length?String($.length):"",contenido:D})}
          ${window.adminComunes.seccion({icono:"zap",iconoClase:"admin-seccion__icono--acento",titulo:"Acceso a Herramientas",desc:"Toca una tarjeta para abrir su lista completa",contenido:I})}
        </div>`},_tiempoActivo(){return window.adminComunes.tiempoActivo(this._inicioSesion)},_mediaGlobal(){return window.adminComunes.mediaGlobal(this._datos.resumenExamenes)},_usuariosFiltrados(){const{usuarios:a}=this._datos,o=this._buscarUsuarios.toLowerCase().trim();let t=a;switch(o&&(t=t.filter(e=>(e.nombre_completo||"").toLowerCase().includes(o)||(e.username||"").toLowerCase().includes(o)||(e.rol||"").toLowerCase().includes(o))),this._filtroRol!=="todos"&&(t=t.filter(e=>e.rol===this._filtroRol)),this._filtroGrupo==="sin-grupo"?t=t.filter(e=>!e.grupo_id):this._filtroGrupo!=="todos"&&(t=t.filter(e=>e.grupo_id===this._filtroGrupo)),this._filtroEstado==="activos"?t=t.filter(e=>e.activo!==!1):this._filtroEstado==="inactivos"&&(t=t.filter(e=>e.activo===!1)),this._ordenUsuarios){case"nombre":t=[...t].sort((e,i)=>(e.nombre_completo||"").localeCompare(i.nombre_completo||""));break;case"fecha":t=[...t].sort((e,i)=>new Date(i.creado_en||0)-new Date(e.creado_en||0));break;default:t=[...t].sort((e,i)=>new Date(i.ultimo_acceso||i.creado_en||0)-new Date(e.ultimo_acceso||e.creado_en||0))}return t},_renderUsuarios(a,o){const t=this._usuariosFiltrados(),e=Math.max(1,Math.ceil(t.length/this._porPagina)),i=Math.min(this._pagUsuarios,e),r=(i-1)*this._porPagina,n=t.slice(r,r+this._porPagina),s=this._seleccion.size,{grupos:d}=this._datos,l=[{valor:"todos",texto:"Todos los grupos"},{valor:"sin-grupo",texto:"Sin grupo"}].concat((d||[]).map(m=>({valor:m.id,texto:m.nombre})));return`
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${c("users")} Usuarios <span class="admin-lista-cabecera__contador">(${a.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-secundario u-fs-xs" id="btnImportarCSV">${c("upload")} Importar</button>
              <button class="btn-secundario u-fs-xs" id="btnExportCSV">${c("download")} CSV</button>
              <button class="btn-primario u-fs-xs" id="btnCrearUsuario">${c("user-plus")} Crear usuario</button>
            </div>
          </div>

          <div class="admin-filtros-pill">
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${c("search")}</span>
              <input type="text" id="buscarUsuarios" placeholder="Buscar por nombre, username o rol..." value="${u(this._buscarUsuarios)}" aria-label="Buscar usuarios">
            </div>
            <select class="admin-filtro-pill" id="filtroRolUsuarios" aria-label="Filtrar por rol">
              <option value="todos">Todos los roles</option>
              ${this._opcionesRolPermitidas(o).map(m=>`<option value="${m.valor}" ${this._filtroRol===m.valor?"selected":""}>${m.texto}</option>`).join("")}
            </select>
            <select class="admin-filtro-pill" id="filtroGrupoUsuarios" aria-label="Filtrar por grupo">
              ${l.map(m=>`<option value="${m.valor}" ${this._filtroGrupo===m.valor?"selected":""}>${m.texto}</option>`).join("")}
            </select>
            <select class="admin-filtro-pill" id="filtroEstadoUsuarios" aria-label="Filtrar por estado">
              <option value="todos" ${this._filtroEstado==="todos"?"selected":""}>Estado: todos</option>
              <option value="activos" ${this._filtroEstado==="activos"?"selected":""}>Activos</option>
              <option value="inactivos" ${this._filtroEstado==="inactivos"?"selected":""}>Bloqueados</option>
            </select>
            <select class="admin-filtro-pill" id="ordenUsuarios" aria-label="Ordenar usuarios">
              <option value="actividad" ${this._ordenUsuarios==="actividad"?"selected":""}>\xDAltima actividad</option>
              <option value="nombre" ${this._ordenUsuarios==="nombre"?"selected":""}>Nombre</option>
              <option value="fecha" ${this._ordenUsuarios==="fecha"?"selected":""}>Fecha de alta</option>
            </select>
          </div>

          ${s>0?`
          <div class="admin-batch-bar">
            <span>${s} seleccionado${s!==1?"s":""}</span>
            <select id="batchRol"><option value="">Cambiar rol\u2026</option>
              ${this._opcionesRolPermitidas(o).map(m=>`<option value="${m.valor}">${m.texto}</option>`).join("")}
            </select>
            <button class="btn-primario" id="btnBatchRol">Aplicar rol</button>
            <button class="btn-secundario" id="btnBatchLimpiar">Limpiar</button>
          </div>`:""}

          ${t.length>this._porPagina?this._renderPaginacion(i,e,"pagUsuarios"):""}

          ${n.length===0?window.adminComunes.vacio("users","Sin usuarios para mostrar","Ajusta la b\xFAsqueda o los filtros."):`<div class="admin-grid-tarjetas">
                ${n.map(m=>this._renderUsuarioFicha(m,o)).join("")}
              </div>`}

          ${t.length>this._porPagina?this._renderPaginacion(i,e,"pagUsuarios"):""}
        </div>`},_renderUsuarioFicha(a,o){const t=(a.nombre_completo||a.username||"?").charAt(0).toUpperCase(),e=a.foto_perfil,i=a.activo!==!1,r=this._puedeEditar(o,a),n=this._puedeEliminar(o,a),s=this._seleccion.has(a.id),d=a.grupo_id&&this._datos.grupos.find(f=>f.id===a.grupo_id)?.nombre||"",l=a.ultimo_acceso||a.creado_en,m=a.ultimo_acceso&&Date.now()-new Date(a.ultimo_acceso).getTime()<3e5,_=i?m?'<span class="admin-tabla-badge admin-tabla-badge--online">En l\xEDnea</span>':'<span class="admin-tabla-badge admin-tabla-badge--offline">Desconectado</span>':'<span class="admin-tabla-badge admin-tabla-badge--inactivo">Bloqueado</span>';return`
        <article class="admin-ficha${i?"":" admin-ficha--inactiva"}" data-id="${a.id}" data-nombre="${u(a.nombre_completo)}" data-username="${u(a.username)}" data-rol="${a.rol}">
          <div class="admin-ficha__cabecera">
            <label class="admin-select-all-wrap" style="margin-right:2px" aria-label="Seleccionar a ${u(a.nombre_completo)}">
              <input type="checkbox" class="admin-select-cb" data-sel-id="${a.id}" ${s?"checked":""}>
            </label>
            <span class="admin-ficha__avatar" data-ver-detalle="${a.id}" title="Ver detalle">${e?`<img src="${u(e)}" alt="" width="44" height="44" loading="lazy" decoding="async">`:t}</span>
            <div class="admin-ficha__info" data-ver-detalle="${a.id}">
              <p class="admin-ficha__nombre">${u(a.nombre_completo)}</p>
              <p class="admin-ficha__username">@${u(a.username)} \xB7 ${z(a.rol)}</p>
            </div>
            ${_}
            <div class="admin-ficha__menu">
              <button class="btn-icono btn-ficha-menu" data-menu="${a.id}" aria-label="M\xE1s opciones de ${u(a.nombre_completo)}" aria-expanded="false">${c("more-horizontal")}</button>
              <div class="admin-ficha__menu-pop" data-menupop="${a.id}" hidden>
                ${r?`<button class="admin-ficha__menu-item btn-cambiar-rol" data-id="${a.id}" data-rol="${a.rol}">${c("shield")} Cambiar rol</button>`:""}
                ${r?`<button class="admin-ficha__menu-item btn-cambiar-grupo" data-id="${a.id}">${c("layout")} Cambiar grupo</button>`:""}
                <button class="admin-ficha__menu-item btn-toggle-activo" data-id="${a.id}" data-activo="${i?"1":"0"}">${i?c("pause-circle")+" Suspender":c("play-circle")+" Reactivar"}</button>
              </div>
            </div>
          </div>
          <div class="admin-ficha__fila">
            <span class="admin-ficha__fila-item">${c("layout")} ${u(d||"Sin grupo")}</span>
            <span class="admin-ficha__fila-item">${c("clock")} \xDAlt. conexi\xF3n: ${k(l)}</span>
          </div>
          <div class="admin-ficha__acciones">
            ${r?`<button class="btn-primario u-fs-xs btn-editar-usuario" data-id="${a.id}">${c("edit-3")} Editar</button>`:""}
            <button class="btn-secundario u-fs-xs btn-ver-detalle" data-id="${a.id}">${c("eye")} Ver detalles</button>
            ${n?`<button class="btn-icono btn-icono--peligro btn-eliminar-usuario" data-id="${a.id}" data-nombre="${u(a.nombre_completo)}" title="Eliminar" aria-label="Eliminar a ${u(a.nombre_completo)}">${c("trash-2")}</button>`:""}
          </div>
        </article>`},_renderPaginacion(a,o,t){const e=[];for(let i=Math.max(1,a-2);i<=Math.min(o,a+2);i++)e.push(i);return`<div class="admin-paginacion">
        <button class="admin-paginacion__btn" data-pag="${t}" data-val="${Math.max(1,a-1)}" ${a<=1?'disabled style="opacity:0.4"':""}>${c("chevron-left")}</button>
        ${e.map(i=>`<button class="admin-paginacion__btn${i===a?" admin-paginacion__btn--activo":""}" data-pag="${t}" data-val="${i}">${i}</button>`).join("")}
        <span class="admin-paginacion__info">${a} / ${o}</span>
        <button class="admin-paginacion__btn" data-pag="${t}" data-val="${Math.min(o,a+1)}" ${a>=o?'disabled style="opacity:0.4"':""}>${c("chevron-right")}</button>
      </div>`},_renderGrupos(a,o,t){return`
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${c("layout")} Grupos <span class="admin-lista-cabecera__contador">(${a.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-primario u-fs-xs" id="btnCrearGrupo">${c("plus")} Crear grupo</button>
            </div>
          </div>
          ${a.length===0?window.adminComunes.vacio("layout","Sin grupos","Crea el primer grupo para organizar a tus usuarios."):`<div class="admin-grid-tarjetas">
                ${a.map(e=>this._renderGrupoCard(e,o,t)).join("")}
              </div>`}
        </div>`},_renderGrupoCard(a,o,t){const e=t.filter(d=>d.grupo_id===a.id),i=e.filter(d=>d.rol==="usuario").length,r=e.filter(d=>d.rol==="editor").length,n=(o||[]).filter(d=>d.grupo_id===a.id),s=n.filter(d=>d.estado==="publicado").length;return`
        <article class="admin-grupo-card" data-gid="${a.id}">
          <div class="admin-grupo-card__cabecera">
            <span class="admin-grupo-card__icono">${c("layout")}</span>
            <div class="admin-grupo-card__info">
              <p class="admin-grupo-card__nombre">${u(a.nombre)}</p>
              <p class="admin-grupo-card__admin">${c("user")} ${u(a.perfiles?.nombre_completo||a.perfiles?.username||"Sin admin")}</p>
            </div>
          </div>
          <div class="admin-grupo-card__stats">
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${i}</p><p class="admin-grupo-card__stat-etiqueta">Alumnos</p></div>
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${r}</p><p class="admin-grupo-card__stat-etiqueta">Profesores</p></div>
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${s}</p><p class="admin-grupo-card__stat-etiqueta">Publicados</p></div>
          </div>
          <p class="admin-grupo-card__actividad">${c("activity")} ${n.length} examen${n.length!==1?"es":""} en total \xB7 creado ${k(a.creado_en)}</p>
          <div class="admin-grupo-card__acciones">
            <button class="btn-icono btn-gestionar-grupo" data-gid="${a.id}" title="Gestionar miembros" aria-label="Gestionar miembros de ${u(a.nombre)}">${c("users")}</button>
            <button class="btn-icono btn-ver-examenes-grupo" data-gid="${a.id}" title="Ver ex\xE1menes" aria-label="Ver ex\xE1menes de ${u(a.nombre)}">${c("file-text")}</button>
            <button class="btn-icono btn-icono--peligro btn-eliminar-grupo" data-id="${a.id}" title="Eliminar grupo" aria-label="Eliminar grupo ${u(a.nombre)}">${c("trash-2")}</button>
            <button class="admin-grupo-card__ver btn-ver-grupo-admin" data-gid="${a.id}">${c("eye")} Ver miembros</button>
          </div>
        </article>`},_examenesFiltrados(){const{examenes:a,grupos:o}=this._datos,t=this._buscarExamenes.toLowerCase().trim();let e=a;return t&&(e=e.filter(i=>(i.titulo||"").toLowerCase().includes(t)||(i.materia||"").toLowerCase().includes(t))),this._filtroExamenEstado!=="todos"&&(e=e.filter(i=>i.estado===this._filtroExamenEstado)),this._filtroExamenGrupo!=="todos"&&(e=e.filter(i=>i.grupo_id===this._filtroExamenGrupo)),e},_renderExamenes(a){const o=this._datos.resumenExamenes||{},{grupos:t}=this._datos,e=this._examenesFiltrados(),i=a.filter(s=>s.estado==="publicado").length,r=a.filter(s=>s.estado==="borrador").length,n=[{valor:"todos",texto:"Todos los grupos"}].concat((t||[]).map(s=>({valor:s.id,texto:s.nombre})));return`
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${c("file-text")} Ex\xE1menes <span class="admin-lista-cabecera__contador">(${a.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <span class="u-fs-xs u-color-texto-terciario">${i} publicados \xB7 ${r} borradores</span>
              <button class="btn-primario u-fs-xs" id="btnCrearExamen">${c("plus")} Crear examen</button>
            </div>
          </div>

          <div class="admin-filtros-pill">
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${c("search")}</span>
              <input type="text" id="buscarExamenes" placeholder="Buscar por t\xEDtulo o materia..." value="${u(this._buscarExamenes)}" aria-label="Buscar ex\xE1menes">
            </div>
            <select class="admin-filtro-pill" id="filtroExamenEstado" aria-label="Filtrar por estado">
              <option value="todos" ${this._filtroExamenEstado==="todos"?"selected":""}>Estado: todos</option>
              <option value="publicado" ${this._filtroExamenEstado==="publicado"?"selected":""}>Publicados</option>
              <option value="borrador" ${this._filtroExamenEstado==="borrador"?"selected":""}>Borradores</option>
            </select>
            <select class="admin-filtro-pill" id="filtroExamenGrupo" aria-label="Filtrar por grupo">
              ${n.map(s=>`<option value="${s.valor}" ${this._filtroExamenGrupo===s.valor?"selected":""}>${s.texto}</option>`).join("")}
            </select>
          </div>

          ${e.length===0?window.adminComunes.vacio("file-text","Sin ex\xE1menes para mostrar","Crea un examen desde el editor o ajusta los filtros."):`<div class="admin-grid-tarjetas">
                ${e.map(s=>this._renderExamenFicha(s,o[s.id])).join("")}
              </div>`}
        </div>`},_renderExamenFicha(a,o){const t=a.perfiles?.nombre_completo||this._datos.usuarios.find(d=>d.id===a.creado_por)?.nombre_completo||"Autor desconocido",e=a.grupos?.nombre||this._datos.grupos.find(d=>d.id===a.grupo_id)?.nombre||"Sin grupo",i=Array.isArray(a.preguntas)?a.preguntas.length:0,r=o&&o.media!=null?o.media.toFixed(1):"\u2014",n=o?o.pendientes:0,s=window.helpers.formatearFecha(a.creado_en)||"\u2014";return`
        <article class="admin-examen-card" data-id="${a.id}">
          <div class="admin-examen-card__cabecera">
            <div class="admin-examen-card__info">
              <p class="admin-examen-card__titulo">${u(a.icono||"")||c("file-text")} ${u(a.titulo)}</p>
              <p class="admin-examen-card__meta">${c("user")} ${u(t)} \xB7 ${c("layout")} ${u(e)}</p>
            </div>
            ${window.adminComunes.estadoBadge(a.estado)}
          </div>
          <div class="admin-examen-card__metrica">
            <span>${c("edit-3")} ${i} pregunta${i!==1?"s":""}</span>
            <span>${c("bar-chart-2")} Nota media: ${r}</span>
            <span>${c("calendar")} ${s}</span>
            ${n>0?`<span class="admin-examen-card__pendientes">${c("clock")} ${n} por corregir</span>`:""}
          </div>
          <div class="admin-examen-card__acciones">
            <button class="btn-primario u-fs-xs btn-ver-resultados" data-id="${a.id}">${c("eye")} Ver respuestas</button>
            <button class="btn-icono btn-editar-examen" data-id="${a.id}" title="Editar" aria-label="Editar ${u(a.titulo)}">${c("edit-3")}</button>
            <button class="btn-icono btn-duplicar-examen" data-id="${a.id}" title="Duplicar" aria-label="Duplicar ${u(a.titulo)}">${c("copy")}</button>
            ${a.estado!=="publicado"?`<button class="btn-icono btn-icono--exito btn-publicar-examen" data-id="${a.id}" title="Publicar" aria-label="Publicar ${u(a.titulo)}">${c("send")}</button>`:""}
            <button class="btn-icono btn-icono--peligro btn-eliminar-examen" data-id="${a.id}" data-titulo="${u(a.titulo)}" title="Eliminar" aria-label="Eliminar ${u(a.titulo)}">${c("trash-2")}</button>
          </div>
        </article>`},async _cargarMemorizacion(){const{usuario:a}=this._datos,[o,t]=await Promise.all([window.memorizacionRepository.listarMazos(a.id),window.memorizacionRepository.listarTarjetas(a.id)]);this._datos.mazosMem=o,this._datos.tarjetasMem=t,this._mazoDeepLink?(this._mazoMemActivo=this._mazoDeepLink,this._mazoDeepLink=null):this._mazoMemActivo=null},_renderMemorizacion(){const a=this._datos;if(this._mazoMemActivo)return this._renderMemorizacionMazo();const o=a.mazosMem||[],t=a.tarjetasMem||[];return`
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${c("brain")} Mazos de memorizaci\xF3n <span class="u-fs-xs u-color-texto-terciario">(${o.length})</span></h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              <button class="btn-secundario u-fs-xs" id="btnSembrarMazos">${c("sparkles")} Sembrar contenido</button>
              <button class="btn-secundario u-fs-xs" id="btnImportarMazo">${c("upload")} Importar</button>
              <button class="btn-primario u-fs-xs" id="btnCrearMazo">${c("plus")} Crear mazo</button>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Los mazos globales se muestran a todos los usuarios en la secci\xF3n Memorizaci\xF3n. Crea el contenido aqu\xED: cada tarjeta puede tener un tipo de ejercicio distinto.</p>
          ${o.length===0?window.adminComunes.vacio("brain","Sin mazos de memorizaci\xF3n",'Pulsa "Sembrar contenido" para crear mazos con datos b\xEDblicos, o crea uno desde cero.'):`<div class="admin-grid-tarjetas">
                ${o.map((e,i)=>this._renderMazoMemCard(e,i,t)).join("")}
              </div>`}
        </div>`},_renderMazoMemCard(a,o,t){const e=t.filter(r=>r.mazo_id===a.id).length,i=j(a.color,o);return`
        <article class="admin-grupo-card" data-mazoid="${a.id}" style="border-top:4px solid ${i}">
          <div class="admin-grupo-card__cabecera">
            <span class="admin-grupo-card__icono" style="color:${i}">${c(a.icono||"layers")}</span>
            <div class="admin-grupo-card__info">
              <p class="admin-grupo-card__nombre">${u(a.nombre)}</p>
              <p class="admin-grupo-card__admin">${a.es_global?c("globe")+" Global":c("user")+" Personal"} \xB7 ${e} tarjetas</p>
            </div>
          </div>
          <p class="admin-grupo-card__actividad">${u(a.descripcion||"Sin descripci\xF3n")}</p>
          <div class="admin-grupo-card__acciones">
            <button class="btn-icono btn-mazo-ver" data-mazoid="${a.id}" title="Ver tarjetas" aria-label="Ver tarjetas de ${u(a.nombre)}">${c("eye")}</button>
            <button class="btn-icono btn-mazo-editar" data-mazoid="${a.id}" title="Editar" aria-label="Editar ${u(a.nombre)}">${c("edit-3")}</button>
            <button class="btn-icono btn-mazo-exportar" data-mazoid="${a.id}" title="Exportar JSON" aria-label="Exportar ${u(a.nombre)}">${c("download")}</button>
            <button class="btn-icono btn-icono--peligro btn-mazo-eliminar" data-mazoid="${a.id}" data-nombre="${u(a.nombre)}" title="Eliminar" aria-label="Eliminar ${u(a.nombre)}">${c("trash-2")}</button>
          </div>
        </article>`},_renderMemorizacionMazo(){const a=this._datos,o=a.mazosMem.find(i=>i.id===this._mazoMemActivo);if(!o)return this._mazoMemActivo=null,this._renderMemorizacion();const t=(a.tarjetasMem||[]).filter(i=>i.mazo_id===o.id),e=j(o.color,a.mazosMem.indexOf(o));return`
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario u-fs-xs" id="btnVolverMazosMem">${c("arrow-left")} Mazos</button>
            <h3 style="margin:0">${c(o.icono||"layers")} ${u(o.nombre)} <span class="u-fs-xs u-color-texto-terciario">(${t.length})</span></h3>
            <button class="btn-primario u-fs-xs" id="btnCrearTarjetaMem">${c("plus")} Nueva tarjeta</button>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">${u(o.descripcion||"")} \xB7 Cada tarjeta tiene un tipo de ejercicio. Duplica o edita con los botones.</p>
          ${t.length===0?window.adminComunes.vacio("layers","Sin tarjetas","A\xF1ade la primera tarjeta para que los usuarios puedan practicar."):`<div class="o-pila">${t.map((i,r)=>this._renderTarjetaMemItem(i,r)).join("")}</div>`}
        </div>`},_renderTarjetaMemItem(a,o){const t=T.find(r=>r.valor===a.tipo)||{texto:a.tipo||"versiculo",icono:"layers"},e=a.pregunta||a.referencia||a.texto||"(sin contenido)",i=String(e).substring(0,100)+(String(e).length>100?"\u2026":"");return`
        <div class="tarjeta-capitulo" data-tid="${a.id}">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;flex:1;min-width:0">
              <span class="mem-tipo-badge" title="${u(t.texto)}">${c(t.icono)}</span>
              <span class="u-fw-600 u-fs-sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u(i)}</span>
            </div>
            <div class="o-flecha" style="gap:4px">
              <button class="btn-icono btn-tarjeta-duplicar" data-tid="${a.id}" title="Duplicar" aria-label="Duplicar tarjeta">${c("copy")}</button>
              <button class="btn-icono btn-tarjeta-editar" data-tid="${a.id}" title="Editar" aria-label="Editar tarjeta">${c("edit-3")}</button>
              <button class="btn-icono btn-icono--peligro btn-tarjeta-eliminar" data-tid="${a.id}" title="Eliminar" aria-label="Eliminar tarjeta">${c("trash-2")}</button>
            </div>
          </div>
        </div>`},_renderSugerencias(){const a=this._datos.sugerencias||[],o={enviada:0,en_revision:0,aceptada:0,implementada:0,rechazada:0};a.forEach(i=>{o[i.estado]!==void 0&&o[i.estado]++});const t=this._filtroSugerencias==="todas"?a:a.filter(i=>i.estado===this._filtroSugerencias),e=[["todas","Todas"],["enviada","Enviadas"],["en_revision","En revisi\xF3n"],["aceptada","Aceptadas"],["implementada","Implementadas"],["rechazada","Rechazadas"]];return`
        <div class="o-pila">
          <h3 style="margin:0">${c("message-square")} Sugerencias (${a.length})</h3>
          <div class="owner-sug-resumen">
            ${Object.entries(o).map(([i,r])=>{const n=window.sugerenciasRepository?window.sugerenciasRepository.estadoInfo(i):{texto:i,clase:""};return`<div class="owner-sug-resumen__card owner-sug-resumen__card--${i}"><div class="owner-sug-resumen__valor">${r}</div><div class="owner-sug-resumen__etiqueta">${n.texto}</div></div>`}).join("")}
          </div>
          <div class="owner-filtros">
            ${e.map(i=>`<button class="owner-filtros__btn ${this._filtroSugerencias===i[0]?"owner-filtros__btn--activo":""}" data-sug-filtro="${i[0]}">${i[1]}</button>`).join("")}
          </div>
          <div class="admin-tabla-wrapper">
            <table class="admin-tabla">
              <thead>
                <tr>
                  <th>Autor</th>
                  <th>Categor\xEDa</th>
                  <th>Sugerencia</th>
                  <th>Estado</th>
                  <th style="width:56px"></th>
                </tr>
              </thead>
              <tbody id="listaSugerenciasOwner">
                ${t.length===0?'<tr><td colspan="5" class="u-color-texto-terciario u-fs-sm">Sin sugerencias para este filtro.</td></tr>':""}
                ${t.map(i=>this._filaSugerenciaOwner(i)).join("")}
              </tbody>
            </table>
          </div>
        </div>`},_filaSugerenciaOwner(a){const o=window.sugerenciasRepository,t=o?o.estadoInfo(a.estado):{texto:a.estado,clase:""},e=o?o.CATEGORIAS.find(s=>s.valor===a.categoria)||o.CATEGORIAS[o.CATEGORIAS.length-1]:{texto:a.categoria},i=o?o.ESTADOS.map(s=>`<option value="${s.valor}" ${s.valor===a.estado?"selected":""}>${s.texto}</option>`).join(""):"",r=a.texto||"",n=r.length>90?r.slice(0,90)+"\u2026":r;return`
        <tr class="admin-tabla-sug-fila" data-sug="${a.id}" data-sug-fila="${a.id}" style="cursor:pointer" title="Gestionar sugerencia">
          <td>
            <span class="admin-tabla__nombre">${u(a.perfiles?.nombre_completo||a.perfiles?.username||"Usuario")}</span><br>
            <span class="admin-tabla__meta">${window.helpers.formatearFecha(a.creado_en)}</span>
          </td>
          <td class="u-fs-xs">${e.texto}</td>
          <td class="u-fs-xs" style="max-width:280px">${u(n)}</td>
          <td><span class="sug-estado ${t.clase}">${t.texto}</span></td>
          <td><button type="button" class="admin-tabla__expandir" data-sug-toggle="${a.id}" aria-expanded="false" aria-label="Gestionar sugerencia" title="Gestionar sugerencia">${c("chevron-down")}</button></td>
        </tr>
        <tr class="admin-tabla-detalle" data-sug-detalle="${a.id}" hidden>
          <td colspan="5">
            <div class="o-pila" style="gap:var(--espaciado-xs)">
              <p class="owner-sug-card__texto">${u(r)}</p>
              <textarea class="owner-sug-card__respuesta" data-sug-respuesta="${a.id}" placeholder="Respuesta para el usuario (opcional)">${u(a.respuesta||"")}</textarea>
              <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
                <select data-sug-estado="${a.id}">${i}</select>
                <button class="btn-primario u-fs-xs btn-guardar-sug" data-id="${a.id}">${c("check")} Guardar</button>
                <button class="btn-peligro u-fs-xs btn-eliminar-sug" data-id="${a.id}" title="Eliminar sugerencia">${c("trash-2")}</button>
              </div>
            </div>
          </td>
        </tr>`},_renderContacto(){const a=this._datos.contacto||[],o=a.filter(e=>e.estado==="nuevo").length,t=e=>e.estado==="nuevo"?"Nuevo":e.estado==="en_proceso"?"En proceso":e.estado==="resuelto"?"Resuelto":"Spam";return`<div class="o-pila">
        <div class="o-flecha o-flecha--between" style="align-items:center;gap:var(--espaciado-sm);flex-wrap:wrap">
          <div><h3 style="margin:0">${c("mail")} Contacto</h3><p class="u-fs-xs u-color-texto-terciario">Bandeja operativa \xB7 ${o} nuevos \xB7 ${a.length} total</p></div>
          <span class="u-fs-xs u-color-texto-terciario">Responde desde cada direcci\xF3n de correo del mensaje.</span>
        </div>
        ${a.length?`<div class="o-pila" style="gap:var(--espaciado-xs)">${a.map(e=>`<article class="admin-setting-row" data-contacto-id="${u(e.id)}" style="align-items:flex-start;gap:var(--espaciado-sm)">
          <div style="flex:1;min-width:220px"><strong>${u(e.nombre)}</strong> <a href="mailto:${u(e.email)}">&lt;${u(e.email)}&gt;</a><p class="u-fs-xs u-color-texto-secundario" style="white-space:pre-wrap;margin:6px 0">${u(e.mensaje)}</p><span class="u-fs-xxs u-color-texto-terciario">${k(e.creado_en)}</span></div>
          <select class="contacto-estado" data-id="${u(e.id)}" aria-label="Estado de mensaje de ${u(e.nombre)}"><option value="nuevo" ${e.estado==="nuevo"?"selected":""}>Nuevo</option><option value="en_proceso" ${e.estado==="en_proceso"?"selected":""}>En proceso</option><option value="resuelto" ${e.estado==="resuelto"?"selected":""}>Resuelto</option><option value="spam" ${e.estado==="spam"?"selected":""}>Spam</option></select>
        </article>`).join("")}</div>`:window.adminComunes.vacio("mail","Sin mensajes de contacto","Las nuevas solicitudes aparecer\xE1n aqu\xED.")}
      </div>`},_renderAuditoria(){const a=this._datos.auditoria||[],o=L(a,this._filtroAuditoria),t=this._busquedaAuditoria?o.filter(e=>((e.accion||"")+" "+(e.detalle||"")+" "+(e.perfiles?.nombre_completo||"")).toLowerCase().includes(this._busquedaAuditoria.toLowerCase())):o;return`
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${c("clipboard-list")} Auditor\xEDa</h3>
            <span class="u-fs-xs u-color-texto-terciario" id="contadorAuditoria">${t.length} registros</span>
          </div>
          <div class="owner-filtros">
            <button class="owner-filtros__btn ${this._filtroAuditoria==="todos"?"owner-filtros__btn--activo":""}" data-filtro="todos">Todos</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria==="hoy"?"owner-filtros__btn--activo":""}" data-filtro="hoy">Hoy</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria==="semana"?"owner-filtros__btn--activo":""}" data-filtro="semana">Esta semana</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria==="mes"?"owner-filtros__btn--activo":""}" data-filtro="mes">Este mes</button>
            <button class="btn-secundario u-fs-xs" id="btnExportAuditoria" style="margin-left:auto">${c("download")} Exportar</button>
          </div>
          <div class="admin-buscar">
            <span class="admin-buscar__icono">${c("search")}</span>
            <input type="text" id="buscarAuditoria" placeholder="Buscar en auditor\xEDa..." value="${u(this._busquedaAuditoria)}">
          </div>
          ${t.length===0?window.adminComunes.vacio("clipboard-list","Sin registros","No hay auditor\xEDa para este filtro."):`<div class="owner-auditoria" id="listaAuditoria">
                ${t.map(e=>this._itemAuditoria(e)).join("")}
              </div>`}
        </div>`},_itemAuditoria(a){return`
        <article class="owner-auditoria-item" data-audit-id="${a.id}">
          <span class="owner-auditoria-item__icono">${c(window.adminComunes.iconoAuditoria(a.accion))}</span>
          <div class="owner-auditoria-item__cuerpo">
            <p class="owner-auditoria-item__accion">${u(a.accion)}</p>
            <p class="owner-auditoria-item__detalle">${u(a.detalle)}</p>
            <p class="owner-auditoria-item__meta">${c("user")} ${u(a.perfiles?.nombre_completo||a.perfiles?.username||"Sistema")} \xB7 ${k(a.creado_en)} <span title="${M(a.creado_en)}">(${M(a.creado_en)})</span></p>
          </div>
        </article>`},_renderAdmins(a,o){const t=a.filter(e=>e.rol==="admin");return`
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${c("shield")} Administradores <span class="admin-lista-cabecera__contador">(${t.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-primario u-fs-xs" id="btnCrearAdmin">${c("user-plus")} Crear administrador</button>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Los administradores pueden gestionar usuarios, grupos y ex\xE1menes del centro. Puedes cambiarlos de rol o suspenderlos desde aqu\xED.</p>
          ${t.length===0?window.adminComunes.vacio("shield","Sin administradores","Crea un administrador para ayudarte a gestionar el centro."):`<div class="admin-grid-tarjetas">${t.map(e=>this._renderUsuarioFicha(e,o)).join("")}</div>`}
        </div>`},_renderMarca(){const a=this._datos.config||{},o=a.marca_nombre||"",t=a.marca_logo||"";return`
        <div class="o-pila">
          <h3 style="margin:0">${c("palette")} Marca del centro</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Personaliza el nombre y el logotipo que se muestran en la aplicaci\xF3n (t\xEDtulo y cabecera del panel).</p>
          <div class="admin-setting-row">
            <div>
              <div class="admin-setting-row__label">${c("tag")} Nombre del centro</div>
              <div class="admin-setting-row__desc">Aparece como t\xEDtulo de la aplicaci\xF3n</div>
            </div>
          </div>
          <input type="text" id="marcaNombre" value="${u(o)}" placeholder="Ej: FormsBiblicos" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md)">
          <div class="admin-setting-row u-mt-2">
            <div>
              <div class="admin-setting-row__label">${c("image")} Logotipo</div>
              <div class="admin-setting-row__desc">Imagen cuadrada que se muestra en la cabecera del panel</div>
            </div>
          </div>
          <div class="admin-marca__logo">
            <img id="marcaLogoPreview" src="${t}" alt="Logotipo actual" width="160" height="80" decoding="async" ${t?"":"hidden"}>
            <button class="btn-secundario u-fs-xs" id="btnSubirLogo">${c("upload")} ${t?"Cambiar logo":"Subir logo"}</button>
            ${t?`<button class="btn-secundario u-fs-xs" id="btnQuitarLogo" style="color:var(--color-error)">${c("trash-2")} Quitar</button>`:""}
          </div>
          <button class="btn-primario u-mt-2" id="btnGuardarMarca" style="justify-content:center">${c("check")} Guardar marca</button>
        </div>`},_renderNotificaciones(){return`
        <div class="o-pila">
          <h3 style="margin:0">${c("bell")} Notificaciones personalizadas</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Env\xEDa un anuncio a todos los usuarios de la plataforma. Recibir\xE1n una notificaci\xF3n nativa en sus dispositivos.</p>
          <div class="admin-seccion">
            <div class="admin-form o-pila" style="gap:var(--espaciado-sm)">
              <div>
                <label class="u-fs-xs u-fw-600" for="anuncioTitulo">${c("edit-3")} T\xEDtulo del anuncio</label>
                <input type="text" id="anuncioTitulo" class="admin-input-full" placeholder="Ej: \xA1Nuevo contenido disponible!" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md);margin-top:4px;border:1px solid var(--color-borde);border-radius:var(--radio-md)">
              </div>
              <div>
                <label class="u-fs-xs u-fw-600" for="anuncioCuerpo">${c("message-square")} Mensaje</label>
                <textarea id="anuncioCuerpo" class="admin-input-full" placeholder="Escribe el mensaje que ver\xE1n todos los usuarios..." rows="4" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md);margin-top:4px;border:1px solid var(--color-borde);border-radius:var(--radio-md);resize:vertical"></textarea>
              </div>
              <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap;align-items:center">
                <button class="btn-primario" id="btnEnviarAnuncio" style="justify-content:center">${c("send")} Enviar a todos los usuarios</button>
                <span class="u-fs-xxs u-color-texto-terciario" id="anuncioEstado"></span>
              </div>
            </div>
          </div>
          <div class="admin-setting-row u-mt-2">
            <div>
              <div class="admin-setting-row__label">${c("info")} \xBFC\xF3mo funciona?</div>
              <div class="admin-setting-row__desc">El anuncio se inserta en la tabla de notificaciones de cada usuario. Cuando abran la app (o est\xE9n en cualquier secci\xF3n), el poller lo detecta y dispara una notificaci\xF3n nativa con sonido y vibraci\xF3n. El anuncio aparece aunque el usuario tenga las notificaciones silenciadas.</div>
            </div>
          </div>
        </div>`},_renderSistema(){const{backups:a}=this._datos,o=this._datos.config.modo_mantenimiento==="1",t=(a||[]).slice(0,8);return`
        <div class="owner-sistema">
          <h3 style="margin:0">${c("database")} Sistema</h3>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-top:-12px">Herramientas exclusivas del propietario.</p>

          ${window.adminComunes.seccion({icono:"cloud",iconoClase:"admin-seccion__icono--exito",titulo:"Estado de Supabase",desc:"Infraestructura en tiempo real",contenido:`
              <div class="admin-sistema">
                ${window.adminComunes.sistemaFila("server","Servidor","Operativo","admin-indicador--ok")}
                ${window.adminComunes.sistemaFila("database","Base de datos","Conectada","admin-indicador--ok")}
                ${window.adminComunes.sistemaFila("lock","Autenticaci\xF3n","Activa","admin-indicador--ok")}
                ${window.adminComunes.sistemaFila("tag","Versi\xF3n",window.__FB_APP_VERSION__?.version||"\u2014","admin-indicador--ok")}
                ${window.adminComunes.sistemaFila("hard-drive","Variables del sistema","v"+(window.__FB_APP_VERSION__?.version||"\u2014")+" \xB7 Supabase","admin-indicador--ok")}
              </div>`})}

          ${window.adminComunes.seccion({icono:"database-backup",titulo:"Copias de seguridad",desc:"Snapshots completos de la base de datos",contenido:`
              <div class="o-pila" style="gap:var(--espaciado-sm)">
                <div class="owner-sistema__grid">
                  <button class="owner-tool" data-herramienta="backup-crear">
                    <span class="owner-tool__icono">${c("database-backup")}</span>
                    <span class="owner-tool__info"><span class="owner-tool__titulo">Crear backup</span><span class="owner-tool__desc">Snapshot completo ahora</span></span>
                    <span class="owner-tool__flecha">${c("chevron-right")}</span>
                  </button>
                  <button class="owner-tool owner-tool--peligro" data-herramienta="backup-restaurar">
                    <span class="owner-tool__icono">${c("rotate-ccw")}</span>
                    <span class="owner-tool__info"><span class="owner-tool__titulo">Restaurar copia</span><span class="owner-tool__desc">Recuperar desde un backup</span></span>
                    <span class="owner-tool__flecha">${c("chevron-right")}</span>
                  </button>
                </div>
                ${t.length?`<div class="o-pila" style="gap:var(--espaciado-xs)">
                  ${t.map(e=>`
                    <div class="admin-backup-item" data-backup-id="${e.id}">
                      <span class="admin-backup-item__icono">${c("database-backup")}</span>
                      <div class="admin-backup-item__info">
                        <p class="admin-backup-item__nombre">${u(e.nombre)}</p>
                        <p class="admin-backup-item__meta">${Math.round((e.tamano_bytes||0)/1024)} KB \xB7 ${k(e.creado_en)}</p>
                      </div>
                      <button class="btn-icono btn-restaurar-backup" data-id="${e.id}" title="Restaurar" aria-label="Restaurar ${u(e.nombre)}">${c("rotate-ccw")}</button>
                      <button class="btn-icono btn-icono--peligro btn-eliminar-backup" data-id="${e.id}" title="Eliminar" aria-label="Eliminar ${u(e.nombre)}">${c("trash-2")}</button>
                    </div>`).join("")}
                </div>`:`<div class="admin-panel-aviso">${c("info")} A\xFAn no hay copias de seguridad. Crea la primera con "Crear backup".</div>`}
              </div>`})}

          ${window.adminComunes.seccion({icono:"settings",titulo:"Configuraci\xF3n global y mantenimiento",desc:"Opciones de plataforma",contenido:`
              <div class="o-pila" style="gap:var(--espaciado-sm)">
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${c("wrench")} Modo mantenimiento</div>
                    <div class="admin-setting-row__desc">Bloquea temporalmente los accesos mientras trabajas en la plataforma</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnModoMantenimiento" data-activo="${o?"1":"0"}" style="${o?"color:var(--color-aviso)":""}">${o?"Desactivar":"Activar"}</button>
                </div>
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${c("shield")} Permisos</div>
                    <div class="admin-setting-row__desc">Jerarqu\xEDa de roles: Propietario \u2192 Administrador \u2192 Profesor \u2192 Alumno</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnVerPermisos">${c("shield")} Ver jerarqu\xEDa</button>
                </div>
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${c("database")} Base de datos</div>
                    <div class="admin-setting-row__desc">Acciones sobre datos de producci\xF3n</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnExportarJSON">${c("download")} Exportar JSON</button>
                </div>
              </div>`})}

          ${window.adminComunes.seccion({icono:"trash-2",iconoClase:"admin-seccion__icono--error",titulo:"Zona de limpieza",desc:"Acciones destructivas, requieren confirmaci\xF3n",contenido:`
              <div class="owner-sistema__grid">
                <button class="owner-tool owner-tool--peligro" data-herramienta="limpiar-sugerencias">
                  <span class="owner-tool__icono">${c("message-square")}</span>
                  <span class="owner-tool__info"><span class="owner-tool__titulo">Sugerencias rechazadas</span><span class="owner-tool__desc">Elimina las sugerencias rechazadas</span></span>
                </button>
                <button class="owner-tool owner-tool--peligro" data-herramienta="limpiar-intentos">
                  <span class="owner-tool__icono">${c("clipboard-list")}</span>
                  <span class="owner-tool__info"><span class="owner-tool__titulo">Intentos viejos</span><span class="owner-tool__desc">Ex\xE1menes pendientes de hace +90 d\xEDas</span></span>
                </button>
              </div>`})}
        </div>`},_bindTabContent(a){this._bindCentro(a),this._bindUsuarios(a),this._bindAdmins(a),this._bindGrupos(a),this._bindExamenes(a),this._bindMemorizacion(a),this._bindComun(a),this._bindSugerencias(a),this._bindContacto(a),this._bindAuditoria(a),this._bindMarca(a),this._bindNotificaciones(a),this._bindSistema(a)},_bindCentro(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos,e=i=>{i&&(this._nivelActivo=this._esOwner()?"owner":"admin",i.tab==="examenes"?(this._filtroExamenEstado=i.estado||"todos",this._tabActivo="examenes"):i.tab==="grupos"?this._tabActivo="grupos":(this._filtroRol=i.rol||"todos",this._filtroGrupo=i.grupo||"todos",this._filtroEstado=i.estado||"todos",this._buscarUsuarios="",this._tabActivo="usuarios"),this._renderizar(a))};o.querySelectorAll("[data-pendiente]").forEach(i=>{i.onclick=()=>{let r=null;try{const n=decodeURIComponent(i.dataset.pendiente||"");r=JSON.parse(n)}catch{window.helpers.mostrarAlerta("No se pudo procesar esta acci\xF3n (datos corruptos).","error");return}e(r)}}),o.querySelectorAll("[data-herramienta-tab]").forEach(i=>{const r=()=>{this._nivelActivo="admin",this._tabActivo=i.dataset.herramientaTab,this._renderizar(a)};i.addEventListener("click",n=>{n.target.closest(".admin-herramienta__mini-btn")||r()}),i.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),r())})}),o.querySelectorAll("[data-mini]").forEach(i=>{i.onclick=async r=>{r.stopPropagation();const n=i.dataset.mini;n==="crear-alumno"||n==="crear-profesor"?await this._abrirCrearUsuario(n==="crear-profesor"?"editor":"usuario",a):n==="importar-csv"?await this._importarCSV(a):n==="crear-grupo"?await this._crearGrupoForm(a):n==="ver-grupos"?(this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="grupos",this._renderizar(a)):n==="ver-examenes"?(this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="examenes",this._filtroExamenEstado="todos",this._renderizar(a)):n==="crear-examen"?window.adminComunes.irSpa("/editor/nuevo"):n==="ver-publicados"||n==="ver-borradores"?(this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="examenes",this._filtroExamenEstado=n==="ver-publicados"?"publicado":"borrador",this._renderizar(a)):n==="crear-mazo"?(await this._cargarMemorizacion(),this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="memorizacion",this._renderizar(a),await this._formMazoMem(null,a)):n==="sembrar-mazos"?(await this._cargarMemorizacion(),await this._sembrarMazos(a)):n==="importar-mazo"&&(await this._cargarMemorizacion(),await this._importarMazo(a))}})},async _crearGrupoForm(a){const{usuario:o}=this._datos,t=await window.helpers.formulario({titulo:"Crear grupo",campos:[{nombre:"nombre",etiqueta:"Nombre del grupo",requerido:!0,placeholder:"Ej: Clase 1\xBA ESO A"}],textoConfirmar:"Crear"});if(!(!t||!t.nombre.trim()))try{await window.adminRepository.crearGrupo(t.nombre.trim(),o.id),await window.adminRepository.registrarAuditoria("grupo:crear",`Grupo "${t.nombre.trim()}" creado`,o.id),window.helpers.mostrarAlerta("Grupo creado.","exito");const e=await window.adminRepository.listarGrupos();this._datos.grupos=e,this._renderizar(a)}catch(e){window.helpers.mostrarAlerta("Error: "+e.message,"error")}},async _importarCSV(a){const{usuario:o}=this._datos,t=await window.adminComunes.elegirArchivo(".csv,text/csv");if(!(!t||!await window.helpers.confirmar("Se crear\xE1n usuarios a partir del CSV (Nombre,Username,Contrase\xF1a,Rol,Grupo). \xBFContinuar?",{titulo:"Importar CSV",textoConfirmar:"Importar"})))try{const i=await window.adminRepository.importarUsuariosCSV(t.texto,o.id),r=(i.creados||[]).length,n=(i.errores||[]).length;n?window.helpers.mostrarAlerta(`${r} importados, ${n} con error.`,r?"advertencia":"error"):window.helpers.mostrarAlerta(`${r} usuarios importados.`,"exito");const s=await window.adminRepository.listarUsuarios();this._datos.usuarios=s,this._renderizar(a)}catch(i){window.helpers.mostrarAlerta("Error: "+i.message,"error")}},async _crearBackup(a){const{usuario:o}=this._datos;if(await window.helpers.confirmar("Se crear\xE1 una copia de seguridad completa de la base de datos. \xBFContinuar?",{titulo:"Crear backup",textoConfirmar:"Crear copia"}))try{await window.adminRepository.crearBackup(o.id),window.helpers.mostrarAlerta("Copia de seguridad creada.","exito");const e=await window.adminRepository.listarBackups();this._datos.backups=e,this._renderizar(a)}catch(e){window.helpers.mostrarAlerta("Error: "+e.message,"error")}},async _abrirCrearUsuario(a,o){const{usuario:t}=this._datos,e=this._datos.grupos,i=[{valor:"",texto:"Sin grupo"}].concat((e||[]).map(s=>({valor:s.id,texto:s.nombre}))),r=this._opcionesRolPermitidas(t),n=await window.helpers.formulario({titulo:a==="editor"?"Crear profesor":a==="usuario"?"Crear alumno":a==="admin"?"Crear administrador":"Crear usuario",campos:[{nombre:"nombre_completo",etiqueta:"Nombre completo",requerido:!0},{nombre:"username",etiqueta:"Username (\xFAnico)",requerido:!0,placeholder:"ej: ana.2024"},{nombre:"password",etiqueta:"Contrase\xF1a",tipo:"password",requerido:!0},{nombre:"rol",etiqueta:"Rol",tipo:"select",valor:a||"usuario",opciones:r},{nombre:"grupo_id",etiqueta:"Grupo",tipo:"select",valor:"",opciones:i}],textoConfirmar:"Crear"});if(n){if(!n.username.trim()||!n.password){window.helpers.mostrarAlerta("Usuario y contrase\xF1a son obligatorios.","advertencia");return}try{await window.adminRepository.crearUsuario({nombre_completo:n.nombre_completo.trim(),username:n.username.trim(),password:n.password,rol:n.rol,grupo_id:n.grupo_id||null}),await window.adminRepository.registrarAuditoria("usuario:crear",`Usuario "${n.nombre_completo}" creado`,t.id),window.helpers.mostrarAlerta("Usuario creado correctamente.","exito");const s=await window.adminRepository.listarUsuarios();this._datos.usuarios=s,this._renderizar(o)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}}},_bindUsuarios(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuarios:t,usuario:e}=this._datos,i=o.querySelector("#buscarUsuarios");i&&i.addEventListener("input",s=>{this._buscarUsuarios=s.target.value,this._pagUsuarios=1,this._seleccion.clear(),this._renderizar(a)}),o.querySelector("#filtroRolUsuarios")?.addEventListener("change",s=>{this._filtroRol=s.target.value,this._pagUsuarios=1,this._renderizar(a)}),o.querySelector("#filtroGrupoUsuarios")?.addEventListener("change",s=>{this._filtroGrupo=s.target.value,this._pagUsuarios=1,this._renderizar(a)}),o.querySelector("#filtroEstadoUsuarios")?.addEventListener("change",s=>{this._filtroEstado=s.target.value,this._pagUsuarios=1,this._renderizar(a)}),o.querySelector("#ordenUsuarios")?.addEventListener("change",s=>{this._ordenUsuarios=s.target.value,this._renderizar(a)}),o.querySelectorAll('[data-pag="pagUsuarios"]').forEach(s=>{s.onclick=()=>{this._pagUsuarios=parseInt(s.dataset.val,10),this._renderizar(a)}}),o.querySelectorAll(".admin-select-cb").forEach(s=>{s.onchange=()=>{s.checked?this._seleccion.add(s.dataset.selId):this._seleccion.delete(s.dataset.selId),this._renderizar(a)}});const r=()=>o.querySelectorAll("[data-menupop]").forEach(s=>{s.hidden=!0});o.querySelectorAll(".btn-ficha-menu").forEach(s=>{s.onclick=d=>{d.stopPropagation();const l=o.querySelector(`[data-menupop="${s.dataset.menu}"]`),m=l&&!l.hidden;r(),l&&(l.hidden=m),s.setAttribute("aria-expanded",String(!m))}}),window.__adminMenuListener||(window.__adminMenuListener=!0,document.addEventListener("click",s=>{s.target.closest(".admin-ficha__menu")||document.querySelectorAll("[data-menupop]").forEach(d=>{d.hidden=!0})})),o.querySelector("#btnBatchRol")?.addEventListener("click",async()=>{const s=o.querySelector("#batchRol")?.value;if(!(!s||this._seleccion.size===0||!await window.helpers.confirmar(`\xBFCambiar rol a ${this._seleccion.size} usuario${this._seleccion.size!==1?"s":""}?`,{titulo:"Cambio masivo",textoConfirmar:"Aplicar"})))try{await window.adminRepository.batchCambiarRol([...this._seleccion],s),await window.adminRepository.registrarAuditoria("batch:rol",`Rol cambiado a "${s}" para ${this._seleccion.size} usuarios`,e.id),window.helpers.mostrarAlerta(`Rol aplicado a ${this._seleccion.size} usuarios.`,"exito"),this._seleccion.clear();const l=await window.adminRepository.listarUsuarios();this._datos.usuarios=l,this._renderizar(a)}catch(l){window.helpers.mostrarAlerta("Error: "+l.message,"error")}}),o.querySelector("#btnBatchLimpiar")?.addEventListener("click",()=>{this._seleccion.clear(),this._renderizar(a)}),o.querySelector("#btnCrearUsuario")?.addEventListener("click",async()=>{await this._abrirCrearUsuario(null,a)}),o.querySelectorAll(".btn-editar-usuario").forEach(s=>{s.onclick=async()=>{const d=t.find(l=>l.id===s.dataset.id);if(d){if(!this._puedeEditar(e,d)){window.helpers.mostrarAlerta("No tienes permiso para editar a este usuario.","error");return}window.ProfileEditor.abrir(d,{onGuardar:async l=>{try{await window.adminRepository.actualizarUsuario(d.id,{nombre_completo:l.nombre_completo.trim(),username:l.username.trim(),rol:d.rol,grupo_id:d.grupo_id||null,password:l.password||null}),await window.adminRepository.registrarAuditoria("usuario:editar",`Usuario "${l.nombre_completo}" editado`,e.id),window.helpers.mostrarAlerta("Usuario actualizado.","exito");const m=await window.adminRepository.listarUsuarios();this._datos.usuarios=m,this._renderizar(a)}catch(m){window.helpers.mostrarAlerta("Error: "+m.message,"error")}},onEliminar:async()=>{if(await window.helpers.confirmar(`\xBFEliminar al usuario "${d.nombre_completo}"? Esta acci\xF3n no se puede deshacer.`,{titulo:"Eliminar usuario",textoConfirmar:"Eliminar"}))try{await window.adminRepository.eliminarUsuario(d.id,e.id),await window.adminRepository.registrarAuditoria("usuario:eliminar",`Usuario "${d.nombre_completo}" eliminado`,e.id),window.helpers.mostrarAlerta("Usuario eliminado.","exito");const m=await window.adminRepository.listarUsuarios();this._datos.usuarios=m.filter(_=>_.id!==d.id),this._seleccion.delete(d.id),this._renderizar(a)}catch(m){window.helpers.mostrarAlerta("Error: "+m.message,"error")}}})}}}),o.querySelectorAll(".btn-cambiar-grupo").forEach(s=>{s.onclick=async()=>{const d=t.find(_=>_.id===s.dataset.id);if(!d)return;const l=[{valor:"",texto:"Sin grupo"}].concat((this._datos.grupos||[]).map(_=>({valor:_.id,texto:_.nombre}))),m=await window.helpers.formulario({titulo:"Cambiar grupo",mensaje:`Selecciona el nuevo grupo para ${d.nombre_completo}.`,campos:[{nombre:"grupo_id",etiqueta:"Grupo",tipo:"select",valor:d.grupo_id||"",opciones:l}],textoConfirmar:"Guardar"});if(m)try{await window.adminRepository.actualizarUsuario(d.id,{nombre_completo:d.nombre_completo,username:d.username,rol:d.rol,grupo_id:m.grupo_id||null}),await window.adminRepository.registrarAuditoria("usuario:grupo",`Grupo de "${d.nombre_completo}" actualizado`,e.id),window.helpers.mostrarAlerta("Grupo actualizado.","exito");const _=await window.adminRepository.listarUsuarios();this._datos.usuarios=_,this._renderizar(a)}catch(_){window.helpers.mostrarAlerta("Error: "+_.message,"error")}}}),o.querySelectorAll(".btn-cambiar-rol").forEach(s=>{s.onclick=async()=>{const d=t.find(_=>_.id===s.dataset.id);if(!d)return;const l=this._opcionesRolPermitidas(e),m=await window.helpers.formulario({titulo:"Cambiar permisos",mensaje:`Selecciona el nuevo rol para ${d.nombre_completo}.`,campos:[{nombre:"rol",etiqueta:"Rol",tipo:"select",valor:d.rol,opciones:l}],textoConfirmar:"Guardar"});if(!(!m||m.rol===d.rol))try{await window.adminRepository.cambiarRol(d.id,m.rol),await window.adminRepository.registrarAuditoria("usuario:rol",`Rol de "${d.nombre_completo}" cambiado a "${m.rol}"`,e.id),window.helpers.mostrarAlerta("Rol actualizado.","exito");const _=await window.adminRepository.listarUsuarios();this._datos.usuarios=_,this._renderizar(a)}catch(_){window.helpers.mostrarAlerta("Error: "+_.message,"error")}}}),o.querySelectorAll(".btn-toggle-activo").forEach(s=>{s.onclick=async()=>{const d=t.find(_=>_.id===s.dataset.id);if(!d)return;const l=s.dataset.activo!=="1";if(await window.helpers.confirmar(l?`\xBFReactivar a "${d.nombre_completo}"?`:`\xBFSuspender a "${d.nombre_completo}"? Dejar\xE1 de poder acceder.`,{titulo:l?"Reactivar usuario":"Suspender usuario",textoConfirmar:l?"Reactivar":"Suspender"}))try{await window.adminRepository.toggleActivo(d.id,l),await window.adminRepository.registrarAuditoria(l?"usuario:activar":"usuario:suspender",`Usuario "${d.nombre_completo}" ${l?"reactivado":"suspendido"}`,e.id),window.helpers.mostrarAlerta(l?"Usuario reactivado.":"Usuario suspendido.","exito");const _=await window.adminRepository.listarUsuarios();this._datos.usuarios=_,this._renderizar(a)}catch(_){window.helpers.mostrarAlerta("Error: "+_.message,"error")}}}),o.querySelectorAll(".btn-eliminar-usuario").forEach(s=>{s.onclick=async()=>{if(await window.helpers.confirmar(`\xBFEliminar al usuario "${s.dataset.nombre}"? Esta acci\xF3n no se puede deshacer.`,{titulo:"Eliminar usuario",textoConfirmar:"Eliminar"}))try{await window.adminRepository.eliminarUsuario(s.dataset.id,e.id),await window.adminRepository.registrarAuditoria("usuario:eliminar",`Usuario "${s.dataset.nombre}" eliminado`,e.id),window.helpers.mostrarAlerta("Usuario eliminado.","exito");const l=await window.adminRepository.listarUsuarios();this._datos.usuarios=l.filter(m=>m.id!==s.dataset.id),this._seleccion.delete(s.dataset.id),this._renderizar(a)}catch(l){window.helpers.mostrarAlerta("Error: "+l.message,"error")}}});const n=async s=>{const d=t.find(l=>l.id===s);if(d)try{const l=await window.adminRepository.obtenerActividadUsuario(s),m=document.createElement("div");m.className="admin-user-detail__backdrop";const _=document.createElement("div");_.className="admin-user-detail";const f=(d.nombre_completo||d.username||"?").charAt(0).toUpperCase();_.innerHTML=`
            <div class="admin-user-detail__header">
              <div class="admin-user-detail__avatar">${d.foto_perfil?`<img src="${u(d.foto_perfil)}" alt="" width="44" height="44" loading="lazy" decoding="async">`:f}</div>
              <div class="admin-user-detail__info">
                <p class="admin-user-detail__nombre">${u(d.nombre_completo)}</p>
                <p class="admin-user-detail__meta">@${u(d.username)} \xB7 ${z(d.rol)}</p>
              </div>
              <button class="admin-user-detail__close" id="btnCerrarDetalle">${c("x")}</button>
            </div>
            <div class="admin-user-detail__section">
              <h4>Actividad</h4>
              <div class="o-grid-tarjetas" style="grid-template-columns:repeat(3,1fr);gap:var(--espaciado-xs)">
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${l.examenes||0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Ex\xE1menes</p>
                </div>
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${l.lecturas||0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Lecturas</p>
                </div>
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${l.repasos||0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Repasos</p>
                </div>
              </div>
            </div>
            <div class="admin-user-detail__section">
              <h4>Informaci\xF3n</h4>
              <div class="perfil-fila"><span class="perfil-fila__label">ID</span><span class="perfil-fila__valor u-fs-xs">${d.id}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Rol</span><span class="perfil-fila__valor">${z(d.rol)}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Estado</span><span class="perfil-fila__valor">${d.activo!==!1?"Activo":"Inactivo"}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Grupo</span><span class="perfil-fila__valor">${this._datos.grupos.find(b=>b.id===d.grupo_id)?.nombre||"Sin grupo"}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">\xDAltima conexi\xF3n</span><span class="perfil-fila__valor u-fs-xs">${d.ultimo_acceso?M(d.ultimo_acceso):"\u2014"}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Creado</span><span class="perfil-fila__valor u-fs-xs">${d.creado_en?new Date(d.creado_en).toLocaleDateString():"\u2014"}</span></div>
            </div>`,document.body.appendChild(m),document.body.appendChild(_),window.Iconos?.actualizar();const y=()=>{_.remove(),m.remove()};_.querySelector("#btnCerrarDetalle").onclick=y,m.onclick=y}catch{window.helpers.mostrarAlerta("Error al cargar detalle","error")}};o.querySelectorAll("[data-ver-detalle]").forEach(s=>{s.onclick=()=>n(s.dataset.verDetalle)}),o.querySelectorAll(".btn-ver-detalle").forEach(s=>{s.onclick=()=>n(s.dataset.id)})},_bindAdmins(a){const o=a.querySelector("#adminContenido");o&&o.querySelector("#btnCrearAdmin")?.addEventListener("click",async()=>{await this._abrirCrearUsuario("admin",a)})},_bindGrupos(a){const o=a.querySelector("#adminContenido");if(!o)return;const{grupos:t,usuario:e}=this._datos;o.querySelector("#btnCrearGrupo")?.addEventListener("click",()=>this._crearGrupoForm(a)),o.querySelectorAll(".btn-eliminar-grupo").forEach(r=>{r.onclick=async n=>{if(n.stopPropagation(),!!await window.helpers.confirmar("\xBFEliminar este grupo? Los usuarios quedar\xE1n sin grupo.",{titulo:"Eliminar grupo",textoConfirmar:"Eliminar"}))try{await window.adminRepository.eliminarGrupo(r.dataset.id),await window.adminRepository.registrarAuditoria("grupo:eliminar","Grupo eliminado",e.id);const d=await window.adminRepository.listarGrupos();this._datos.grupos=d,this._renderizar(a)}catch(d){window.helpers.mostrarAlerta("Error: "+d.message,"error")}}});const i=async r=>{const n=t.find(s=>s.id===r);n&&await window.adminComunes.abrirModalGrupo(n)};o.querySelectorAll(".btn-ver-grupo-admin, .btn-gestionar-grupo").forEach(r=>{r.onclick=async n=>{n.stopPropagation(),await i(r.dataset.gid)}}),o.querySelectorAll(".btn-ver-examenes-grupo").forEach(r=>{r.onclick=async n=>{n.stopPropagation();const s=t.find(l=>l.id===r.dataset.gid);if(!s)return;const d=this._datos.examenes.filter(l=>l.grupo_id===s.id);window.adminComunes.abrirModal({titulo:`Ex\xE1menes de ${s.nombre}`,icono:"file-text",ancho:"520px",contenido:d.length?`<div class="o-pila">${d.map(l=>`<div class="admin-grupo-card__actividad" style="justify-content:space-between"><span>${u(l.titulo)}</span>${window.adminComunes.estadoBadge(l.estado)}</div>`).join("")}</div>`:window.adminComunes.vacio("file-text","Sin ex\xE1menes","Este grupo a\xFAn no tiene ex\xE1menes.")})}})},_bindExamenes(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos,e=()=>this._datos.examenes;o.querySelector("#btnCrearExamen")?.addEventListener("click",()=>window.adminComunes.irSpa("/editor/nuevo"));const i=o.querySelector("#buscarExamenes");i&&i.addEventListener("input",r=>{this._buscarExamenes=r.target.value,this._renderizar(a)}),o.querySelector("#filtroExamenEstado")?.addEventListener("change",r=>{this._filtroExamenEstado=r.target.value,this._renderizar(a)}),o.querySelector("#filtroExamenGrupo")?.addEventListener("change",r=>{this._filtroExamenGrupo=r.target.value,this._renderizar(a)}),o.querySelectorAll(".btn-editar-examen").forEach(r=>{r.onclick=()=>window.adminComunes.irSpa("/editor/"+r.dataset.id)}),o.querySelectorAll(".btn-duplicar-examen").forEach(r=>{r.onclick=async()=>{const n=e().find(d=>d.id===r.dataset.id);if(await window.helpers.confirmar(`\xBFDuplicar "${n?.titulo}"? Se crear\xE1 una copia en borrador.`,{titulo:"Duplicar examen",textoConfirmar:"Duplicar"}))try{await window.adminRepository.duplicarExamen(r.dataset.id),await window.adminRepository.registrarAuditoria("examen:duplicar",`Examen "${n?.titulo}" duplicado`,t.id),window.helpers.mostrarAlerta("Examen duplicado.","exito");const d=await window.adminRepository.listarExamenes();this._datos.examenes=d,this._renderizar(a)}catch(d){window.helpers.mostrarAlerta("Error: "+d.message,"error")}}}),o.querySelectorAll(".btn-publicar-examen").forEach(r=>{r.onclick=async()=>{const n=e().find(d=>d.id===r.dataset.id);if(await window.helpers.confirmar(`\xBFPublicar "${n?.titulo}"? Los alumnos del grupo podr\xE1n verlo.`,{titulo:"Publicar examen",textoConfirmar:"Publicar"}))try{await window.adminRepository.publicarExamen(r.dataset.id),await window.adminRepository.registrarAuditoria("examen:publicar",`Examen "${n?.titulo}" publicado`,t.id),window.helpers.mostrarAlerta("Examen publicado.","exito");const d=await window.adminRepository.listarExamenes();this._datos.examenes=d,this._renderizar(a)}catch(d){window.helpers.mostrarAlerta("Error: "+d.message,"error")}}}),o.querySelectorAll(".btn-ver-resultados").forEach(r=>{r.onclick=()=>window.adminComunes.irSpa("/calificaciones")}),o.querySelectorAll(".btn-eliminar-examen").forEach(r=>{r.onclick=async()=>{if(await window.helpers.confirmar(`\xBFEliminar el examen "${r.dataset.titulo}"? Se borrar\xE1n tambi\xE9n sus respuestas.`,{titulo:"Eliminar examen",textoConfirmar:"Eliminar"}))try{await window.adminRepository.eliminarExamen(r.dataset.id),await window.adminRepository.registrarAuditoria("examen:eliminar",`Examen "${r.dataset.titulo}" eliminado`,t.id),window.helpers.mostrarAlerta("Examen eliminado.","exito");const s=await window.adminRepository.listarExamenes();this._datos.examenes=s,this._renderizar(a)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}}})},_bindComun(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos;o.querySelector("#btnExportCSV")?.addEventListener("click",async()=>{try{const e=await window.adminRepository.exportarUsuariosCSV(t);window.adminComunes.descargarCSVTexto("usuarios.csv",e)}catch{window.helpers.mostrarAlerta("Error al exportar","error")}}),o.querySelector("#btnImportarCSV")?.addEventListener("click",()=>this._importarCSV(a))},async _sembrarMazos(a){const{usuario:o}=this._datos;if(await window.helpers.confirmar("Se crear\xE1n mazos con contenido b\xEDblico curado (Vers\xEDculos, Personajes, Lugares, Cronolog\xEDa, Milagros, Par\xE1bolas, Curiosidades, Objetos, Profec\xEDas). Los mazos ya existentes no se duplicar\xE1n. \xBFContinuar?",{titulo:"Sembrar contenido",textoConfirmar:"Sembrar"}))try{const e=await window.memorizacionRepository.sembrarMazos(o.id);window.helpers.mostrarAlerta(`Sembrados ${e.mazos} mazos y ${e.tarjetas} tarjetas. ${e.omitidos.length?"Omitidos: "+e.omitidos.join(", "):""}`,"exito"),await this._cargarMemorizacion(),this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="memorizacion",this._renderizar(a)}catch(e){window.helpers.mostrarAlerta("Error: "+e.message,"error")}},async _importarMazo(a){const{usuario:o}=this._datos,t=await window.adminComunes.elegirArchivo(".json,application/json");if(t)try{const e=await window.memorizacionRepository.importarMazo(o.id,t.texto);window.helpers.mostrarAlerta(`Mazo "${e.mazo.nombre}" importado con ${e.tarjetas} tarjetas.`,"exito"),await this._cargarMemorizacion(),this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="memorizacion",this._renderizar(a)}catch(e){window.helpers.mostrarAlerta("Error: "+e.message,"error")}},async _formMazoMem(a,o){const t=this._datos,e=a&&t.mazosMem.find(s=>s.id===a)||null,i=["layers","book-open","users","map-pin","calendar","zap","message-square","sparkles","archive","eye","heart","shield"],r=await window.helpers.formulario({titulo:e?"Editar mazo":"Crear mazo",campos:[{nombre:"nombre",etiqueta:"Nombre",requerido:!0,valor:e?e.nombre:""},{nombre:"descripcion",etiqueta:"Descripci\xF3n corta",valor:e&&e.descripcion||""},{nombre:"color",etiqueta:"Color",tipo:"select",valor:e?j(e.color,0):R[0],opciones:R.map(s=>({valor:s,texto:s}))},{nombre:"icono",etiqueta:"Icono",tipo:"select",valor:e&&e.icono||"layers",opciones:i.map(s=>({valor:s,texto:s}))}],textoConfirmar:e?"Guardar":"Crear"});if(!r||!r.nombre.trim())return;const{usuario:n}=this._datos;try{e?(await window.memorizacionRepository.actualizarMazo(e.id,{nombre:r.nombre.trim(),descripcion:r.descripcion,color:r.color,icono:r.icono}),window.helpers.mostrarAlerta("Mazo actualizado.","exito")):(await window.memorizacionRepository.crearMazo(n.id,{nombre:r.nombre.trim(),descripcion:r.descripcion,color:r.color,icono:r.icono,es_global:!0}),window.helpers.mostrarAlerta("Mazo creado.","exito")),await window.adminRepository.registrarAuditoria("memorizacion:mazo",`${e?"Editado":"Creado"} mazo "${r.nombre.trim()}"`,n.id).catch(()=>{}),await this._cargarMemorizacion(),this._nivelActivo=this._esOwner()?"owner":"admin",this._tabActivo="memorizacion",this._renderizar(o||document.querySelector("#app-root")||document.body)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}},async _formTarjetaMem(a,o){const t=this._datos,e=a&&(t.tarjetasMem||[]).find(s=>s.id===a)||null,i=t.mazosMem.find(s=>s.id===this._mazoMemActivo),r=await window.helpers.formulario({titulo:e?"Editar tarjeta":"Nueva tarjeta",mensaje:`Mazo: ${i?i.nombre:""}`,campos:[{nombre:"tipo",etiqueta:"Tipo de ejercicio",tipo:"select",valor:e&&e.tipo||"versiculo",opciones:T.map(s=>({valor:s.valor,texto:s.texto}))},{nombre:"pregunta",etiqueta:"Pregunta / Referencia",requerido:!0,valor:e&&(e.pregunta||e.referencia)||""},{nombre:"respuesta",etiqueta:"Respuesta / Texto",requerido:!0,valor:e&&(e.respuesta||e.texto)||""},{nombre:"referencia",etiqueta:"Referencia b\xEDblica (opcional)",valor:e&&e.referencia||""},{nombre:"explicacion",etiqueta:"Explicaci\xF3n breve (opcional)",valor:e&&e.explicacion||""},{nombre:"pista",etiqueta:"Pista (opcional)",valor:e&&e.pista||""}],textoConfirmar:e?"Guardar":"Crear"});if(!r||!r.pregunta.trim()||!r.respuesta.trim()){r&&window.helpers.mostrarAlerta("Pregunta y respuesta son obligatorias.","advertencia");return}const{usuario:n}=this._datos;try{e?(await window.memorizacionRepository.actualizarContenido(e.id,{tipo:r.tipo,pregunta:r.pregunta.trim(),respuesta:r.respuesta.trim(),referencia:r.referencia,explicacion:r.explicacion,pista:r.pista}),window.helpers.mostrarAlerta("Tarjeta actualizada.","exito")):(await window.memorizacionRepository.crearTarjetaGlobal({mazo_id:this._mazoMemActivo,tipo:r.tipo,pregunta:r.pregunta.trim(),respuesta:r.respuesta.trim(),referencia:r.referencia,explicacion:r.explicacion,pista:r.pista,creado_por:n.id}),window.helpers.mostrarAlerta("Tarjeta creada.","exito")),await window.adminRepository.registrarAuditoria("memorizacion:tarjeta",`${e?"Editada":"Creada"} tarjeta en mazo`,n.id).catch(()=>{}),await this._cargarMemorizacion(),this._renderizar(o||document.querySelector("#app-root")||document.body)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}},_bindMemorizacion(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos,e=async()=>{await this._cargarMemorizacion(),this._renderizar(a)};this._tabActivo==="memorizacion"&&!this._datos.mazosMem&&this._cargarMemorizacion().then(()=>this._renderizar(a)),o.querySelector("#btnCrearMazo")?.addEventListener("click",()=>this._formMazoMem(null,a)),o.querySelector("#btnVolverMazosMem")?.addEventListener("click",()=>{this._mazoMemActivo=null,this._renderizar(a)}),o.querySelector("#btnCrearTarjetaMem")?.addEventListener("click",()=>this._formTarjetaMem(null,a)),o.querySelector("#btnSembrarMazos")?.addEventListener("click",()=>this._sembrarMazos(a)),o.querySelector("#btnImportarMazo")?.addEventListener("click",()=>this._importarMazo(a)),o.querySelectorAll(".btn-mazo-ver").forEach(i=>{i.onclick=()=>{this._mazoMemActivo=i.dataset.mazoid,this._renderizar(a)}}),o.querySelectorAll(".btn-mazo-editar").forEach(i=>{i.onclick=()=>this._formMazoMem(i.dataset.mazoid,a)}),o.querySelectorAll(".btn-mazo-exportar").forEach(i=>{i.onclick=async()=>{try{const r=await window.memorizacionRepository.exportarMazo(i.dataset.mazoid);window.adminComunes.descargarCSVTexto("mazo-memorizacion.json",r)}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}}),o.querySelectorAll(".btn-mazo-eliminar").forEach(i=>{i.onclick=async()=>{if(await window.helpers.confirmar(`\xBFEliminar el mazo "${i.dataset.nombre}"? Las tarjetas se borrar\xE1n con \xE9l.`,{titulo:"Eliminar mazo",textoConfirmar:"Eliminar"}))try{await window.memorizacionRepository.eliminarMazo(i.dataset.mazoid),window.helpers.mostrarAlerta("Mazo eliminado.","exito"),await e()}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}}}),o.querySelectorAll(".btn-tarjeta-editar").forEach(i=>{i.onclick=()=>this._formTarjetaMem(i.dataset.tid,a)}),o.querySelectorAll(".btn-tarjeta-duplicar").forEach(i=>{i.onclick=async()=>{try{await window.memorizacionRepository.duplicarTarjeta(i.dataset.tid),window.helpers.mostrarAlerta("Tarjeta duplicada.","exito"),await e()}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}}),o.querySelectorAll(".btn-tarjeta-eliminar").forEach(i=>{i.onclick=async()=>{if(await window.helpers.confirmar("\xBFEliminar esta tarjeta?",{titulo:"Eliminar tarjeta",textoConfirmar:"Eliminar"}))try{await window.memorizacionRepository.desactivarTarjeta(i.dataset.tid),window.helpers.mostrarAlerta("Tarjeta eliminada.","exito"),await e()}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}}})},_bindSugerencias(a){const o=a.querySelector("#adminContenido");if(!o||!window.sugerenciasRepository)return;window.adminComunes.bindFiltros(o,"[data-sug-filtro]",e=>{this._filtroSugerencias=e.dataset.sugFiltro,this._renderizar(a)});const t=e=>{const i=o.querySelector(`[data-sug-fila="${e}"]`),r=o.querySelector(`[data-sug-detalle="${e}"]`),n=o.querySelector(`[data-sug-toggle="${e}"]`);if(!i||!r)return;const s=!r.hidden;r.hidden=s,i.classList.toggle("admin-tabla-fila--expandida",!s),n&&(n.classList.toggle("admin-tabla__expandir--abierto",!s),n.setAttribute("aria-expanded",String(!s)))};o.querySelectorAll("[data-sug-toggle]").forEach(e=>{e.addEventListener("click",i=>{i.stopPropagation(),t(e.dataset.sugToggle)})}),o.querySelectorAll("[data-sug-fila]").forEach(e=>{e.addEventListener("click",i=>{i.target.closest("[data-sug-toggle]")||t(e.dataset.sugFila)})}),o.querySelectorAll(".btn-guardar-sug").forEach(e=>{e.onclick=async()=>{const i=e.dataset.id,r=o.querySelector(`[data-sug-estado="${i}"]`)?.value,n=o.querySelector(`[data-sug-respuesta="${i}"]`)?.value||"";try{await window.sugerenciasRepository.actualizar(i,{estado:r,respuesta:n}),window.helpers.mostrarAlerta("Sugerencia actualizada.","exito");const s=await window.sugerenciasRepository.listarTodas();this._datos.sugerencias=s,this._renderizar(a)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}}}),o.querySelectorAll(".btn-eliminar-sug").forEach(e=>{e.onclick=async()=>{if(await window.helpers.confirmar("\xBFEliminar esta sugerencia? Esta acci\xF3n no se puede deshacer.",{titulo:"Eliminar sugerencia",textoConfirmar:"Eliminar"}))try{await window.sugerenciasRepository.eliminar(e.dataset.id),window.helpers.mostrarAlerta("Sugerencia eliminada.","exito");const r=await window.sugerenciasRepository.listarTodas();this._datos.sugerencias=r,this._renderizar(a)}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}})},_bindContacto(a){const o=a.querySelector("#adminContenido");!o||this._tabActivo!=="contacto"||o.querySelectorAll(".contacto-estado").forEach(t=>{t.addEventListener("change",async()=>{t.disabled=!0;try{await window.adminRepository.actualizarMensajeContacto(t.dataset.id,t.value),this._datos.contacto=await window.adminRepository.listarMensajesContacto(),this._renderizar(a)}catch(e){t.disabled=!1,window.helpers.mostrarAlerta("No se pudo actualizar el mensaje: "+e.message,"error")}})})},_bindAuditoria(a){const o=a.querySelector("#adminContenido");if(!o)return;const{auditoria:t}=this._datos;window.adminComunes.bindFiltros(o,"[data-filtro]",e=>{this._filtroAuditoria=e.dataset.filtro,this._renderizar(a)}),o.querySelector("#buscarAuditoria")?.addEventListener("input",e=>{this._busquedaAuditoria=e.target.value;const i=this._busquedaAuditoria.toLowerCase(),r=L(t,this._filtroAuditoria),n=i?r.filter(l=>((l.accion||"")+" "+(l.detalle||"")+" "+(l.perfiles?.nombre_completo||"")).toLowerCase().includes(i)):r,s=o.querySelector("#listaAuditoria");if(!s)return;if(n.length===0){s.innerHTML=window.adminComunes.vacio("clipboard-list","Sin registros","No hay auditor\xEDa para esta b\xFAsqueda.");return}s.innerHTML=n.map(l=>this._itemAuditoria(l)).join("");const d=o.querySelector("#contadorAuditoria");d&&(d.textContent=n.length+" registros")}),o.querySelector("#btnExportAuditoria")?.addEventListener("click",()=>{const e=this._busquedaAuditoria.toLowerCase(),i=L(t,this._filtroAuditoria),r=e?i.filter(l=>((l.accion||"")+" "+(l.detalle||"")+" "+(l.perfiles?.nombre_completo||"")).toLowerCase().includes(e)):i,n="Acci\xF3n,Detalle,Actor,Fecha",s=r.map(l=>`"${l.accion||""}","${(l.detalle||"").replace(/"/g,'""')}","${l.perfiles?.nombre_completo||l.perfiles?.username||"Sistema"}","${l.creado_en||""}"`),d=n+`
`+s.join(`
`);window.adminComunes.descargarCSVTexto("auditoria.csv",d)})},_bindMarca(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos,e=o.querySelector("#marcaLogoPreview"),i=()=>{const r=document.createElement("input");r.type="file",r.accept="image/*",r.onchange=()=>{const n=r.files&&r.files[0];if(!n)return;const s=new FileReader;s.onload=()=>{const d=new Image;d.src=s.result,d.onload=()=>{const l=Math.min(128,d.width,d.height),m=document.createElement("canvas");m.width=l,m.height=l;const _=m.getContext("2d"),f=(d.width-l)/2,y=(d.height-l)/2;_.drawImage(d,f,y,l,l,0,0,l,l);const b=m.toDataURL("image/png");this._logoPendiente=b,e&&(e.src=b,e.hidden=!1);const E=o.querySelector("#btnSubirLogo");if(E&&(E.textContent="Cambiar logo"),!o.querySelector("#btnQuitarLogo")&&o.querySelector(".admin-marca__logo")){const h=document.createElement("button");h.className="btn-secundario u-fs-xs",h.id="btnQuitarLogo",h.style.color="var(--color-error)",h.innerHTML=`${c("trash-2")} Quitar`,o.querySelector(".admin-marca__logo").appendChild(h),h.onclick=()=>{this._logoPendiente="",e&&(e.hidden=!0,e.src=""),h.remove()}}}},s.readAsDataURL(n)},r.click()};o.querySelector("#btnSubirLogo")?.addEventListener("click",i),o.querySelector("#btnQuitarLogo")?.addEventListener("click",()=>{this._logoPendiente="",e&&(e.hidden=!0,e.src="")}),o.querySelector("#btnGuardarMarca")?.addEventListener("click",async()=>{const r=(o.querySelector("#marcaNombre")?.value||"").trim(),n=this._logoPendiente!==null?this._logoPendiente:e&&!e.hidden?e.src:"";try{await window.adminRepository.guardarConfiguracion("marca_nombre",r),await window.adminRepository.guardarConfiguracion("marca_logo",n),await window.adminRepository.registrarAuditoria("config:marca",`Marca actualizada: ${r||"FormsBiblicos"}`,t.id).catch(()=>{}),document.title=r||"FormsBiblicos",this._logoPendiente=null,window.helpers.mostrarAlerta("Marca guardada.","exito");const s=await window.adminRepository.listarConfiguracion();this._datos.config=s,this._renderizar(a)}catch(s){window.helpers.mostrarAlerta("Error: "+s.message,"error")}})},_bindSistema(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos;o.querySelector("#btnModoMantenimiento")?.addEventListener("click",async()=>{const i=o.querySelector("#btnModoMantenimiento").dataset.activo!=="1";if(await window.helpers.confirmar(i?"\xBFActivar el modo mantenimiento? Los usuarios no podr\xE1n acceder.":"\xBFDesactivar el modo mantenimiento?",{titulo:"Modo mantenimiento",textoConfirmar:i?"Activar":"Desactivar"}))try{await window.adminRepository.establecerModoMantenimiento(i,t.id),window.helpers.mostrarAlerta(i?"Modo mantenimiento activado.":"Modo mantenimiento desactivado.","exito");const n=await window.adminRepository.listarConfiguracion();this._datos.config=n,this._renderizar(a)}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}}),o.querySelector("#btnVerPermisos")?.addEventListener("click",()=>{window.adminComunes.abrirModal({titulo:"Jerarqu\xEDa de permisos",icono:"shield",contenido:`
            <div class="admin-jerarquia">
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--owner">${c("crown")} Propietario \u2014 Control total del sistema</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--admin">${c("settings")} Administrador \u2014 Gestiona usuarios y grupos</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--editor">${c("book-open")} Profesor \u2014 Crea ex\xE1menes y corrige</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--usuario">${c("user")} Alumno \u2014 Lee, estudia y responde</div>
            </div>
            <p class="u-fs-xs u-color-texto-terciario u-mt-2">Cada rol solo puede gestionar usuarios de rango inferior.</p>`})}),o.querySelector("#btnExportarJSON")?.addEventListener("click",async()=>{try{const e=await window.adminRepository.exportarDatosJSON();window.adminComunes.descargarJSON("formsbiblicos-export-"+new Date().toISOString().slice(0,10)+".json",e),window.helpers.mostrarAlerta("Exportaci\xF3n descargada.","exito")}catch(e){window.helpers.mostrarAlerta("Error: "+e.message,"error")}}),o.querySelectorAll("[data-herramienta]").forEach(e=>{e.onclick=async()=>{const i=e.dataset.herramienta;if(i==="backup-crear"){await this._crearBackup(a);return}if(i==="backup-restaurar"){const r=await window.adminComunes.elegirArchivo(".json,application/json");if(!r)return;try{const n=JSON.parse(r.texto);if(!await window.helpers.confirmar("Se restaurar\xE1n los datos del archivo seleccionado. Esta acci\xF3n puede sobrescribir datos existentes. \xBFContinuar?",{titulo:"Restaurar copia",textoConfirmar:"Restaurar"}))return;const d={app:"FormsBiblicos",version:window.__FB_APP_VERSION__?.version||"\u2014",creado_en:new Date().toISOString(),perfiles:n.perfiles||[],grupos:n.grupos||[],examenes:n.examenes||[],configuracion:n.configuracion||[],sugerencias:n.sugerencias||[]},l="restaurar-"+new Date().toISOString().slice(0,16).replace(/[T:]/g,"-"),{data:m}=await window.supabaseClient.from("backups").insert({creado_por:t.id,nombre:l,tamano_bytes:new Blob([JSON.stringify(d)]).size,snapshot:d,estado:"ok"}).select().single();if(!m)throw new Error("No se pudo guardar la copia temporal");await window.adminRepository.restaurarBackup(m.id,t.id),window.helpers.mostrarAlerta("Datos restaurados correctamente.","exito");const _=await window.adminRepository.listarBackups();this._datos.backups=_,this._renderizar(a)}catch(n){window.helpers.mostrarAlerta("Archivo inv\xE1lido o error: "+n.message,"error")}return}if(i==="limpiar-sugerencias"){if(!await window.helpers.confirmar("\xBFEliminar todas las sugerencias rechazadas?",{titulo:"Limpiar sugerencias",textoConfirmar:"Limpiar"}))return;try{const n=await window.adminRepository.limpiarSugerenciasRechazadas(t.id);window.helpers.mostrarAlerta(`${n} sugerencias eliminadas.`,"exito");const s=await window.sugerenciasRepository.listarTodas();this._datos.sugerencias=s}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}return}if(i==="limpiar-intentos"){if(!await window.helpers.confirmar("\xBFEliminar intentos de examen pendientes con m\xE1s de 90 d\xEDas?",{titulo:"Limpiar intentos",textoConfirmar:"Limpiar"}))return;try{const n=await window.adminRepository.limpiarIntentosViejos(t.id);window.helpers.mostrarAlerta(`${n} intentos eliminados.`,"exito")}catch(n){window.helpers.mostrarAlerta("Error: "+n.message,"error")}return}}}),o.querySelectorAll(".btn-restaurar-backup").forEach(e=>{e.onclick=async()=>{if(await window.helpers.confirmar("\xBFRestaurar esta copia? Sobrescribir\xE1 los datos actuales con los del backup.",{titulo:"Restaurar copia",textoConfirmar:"Restaurar"}))try{await window.adminRepository.restaurarBackup(e.dataset.id,t.id),window.helpers.mostrarAlerta("Copia restaurada.","exito");const r=await window.adminRepository.listarBackups();this._datos.backups=r,this._renderizar(a)}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}}),o.querySelectorAll(".btn-eliminar-backup").forEach(e=>{e.onclick=async()=>{if(await window.helpers.confirmar("\xBFEliminar esta copia de seguridad?",{titulo:"Eliminar backup",textoConfirmar:"Eliminar"}))try{await window.adminRepository.eliminarBackup(e.dataset.id,t.id),window.helpers.mostrarAlerta("Copia eliminada.","exito");const r=await window.adminRepository.listarBackups();this._datos.backups=r,this._renderizar(a)}catch(r){window.helpers.mostrarAlerta("Error: "+r.message,"error")}}})},_bindNotificaciones(a){const o=a.querySelector("#adminContenido");if(!o)return;const{usuario:t}=this._datos;o.querySelector("#btnEnviarAnuncio")?.addEventListener("click",async()=>{const e=o.querySelector("#btnEnviarAnuncio"),i=o.querySelector("#anuncioEstado"),r=o.querySelector("#anuncioTitulo")?.value?.trim()||"",n=o.querySelector("#anuncioCuerpo")?.value?.trim()||"";if(!r&&!n){window.helpers.mostrarAlerta("Escribe al menos un t\xEDtulo o un mensaje.","error");return}if(await window.helpers.confirmar(`\xBFEnviar el anuncio a todos los usuarios?

"${r||"Sin t\xEDtulo"}"

Recibir\xE1n una notificaci\xF3n nativa en sus dispositivos.`,{titulo:"Enviar anuncio",textoConfirmar:"Enviar"})){e.disabled=!0,i&&(i.textContent="Enviando...");try{const d=await window.adminRepository.enviarAnuncioGlobal({titulo:r,cuerpo:n},t.id);i&&(i.textContent=`Enviado a ${d.enviados} usuarios.`),window.helpers.mostrarAlerta(`Anuncio enviado a ${d.enviados} usuarios.`,"exito");const l=o.querySelector("#anuncioTitulo"),m=o.querySelector("#anuncioCuerpo");l&&(l.value=""),m&&(m.value="")}catch(d){window.helpers.mostrarAlerta("Error: "+d.message,"error"),i&&(i.textContent="Error al enviar.")}finally{e.disabled=!1}}})}}})();
