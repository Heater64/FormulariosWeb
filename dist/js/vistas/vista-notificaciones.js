(function(){"use strict";const r=i=>window.Iconos?window.Iconos.render(i):"",d=i=>window.helpers?window.helpers.escapeHtml(i||""):i,l=()=>window.notificationService&&window.notificationService.CATEGORIAS||{};function f(i){if(!i)return"";try{const t=Date.now()-new Date(i).getTime(),o=Math.floor(t/6e4);if(o<1)return"Ahora";if(o<60)return`Hace ${o} min`;const a=Math.floor(o/60);if(a<24)return`Hace ${a}h`;const e=Math.floor(a/24);return e<7?`Hace ${e}d`:window.helpers.formatearFecha(i)}catch{return""}}window.vistaNotificaciones={_desuscribir:null,async montar(i){if(!store.obtener("usuario")){router.navegar("/login");return}i.innerHTML=`
        <div class="o-contenedor o-contenedor--ancho" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="notif-centro__cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono" data-volver aria-label="Volver">${r("arrow-left")}</button>
              <div>
                <h1 class="notif-centro__titulo">${r("bell")} Notificaciones <button class="info-ayuda" data-guia="notificaciones" aria-label="Gu\xEDa de Notificaciones">i</button></h1>
              </div>
            </div>
            <div class="notif-centro__acciones vista-cabecera__acciones">
              <button class="btn-secundario u-fs-xs" id="btnMarcarTodas" title="Marcar todas como le\xEDdas">${r("check")} <span>Marcar le\xEDdas</span></button>
            </div>
          </div>
          <div class="notif-filtros" id="notifFiltros" role="tablist" aria-label="Filtrar notificaciones"></div>
          <div id="notifLista" aria-live="polite"></div>
        </div>`,window.Iconos&&window.Iconos.actualizar(),window.helpers.registrarGuias(i,{notificaciones:["Notificaciones","Aqu\xED aparecen los avisos de desaf\xEDos, clases, ex\xE1menes y actividad de estudio.","Puedes filtrar los avisos y marcarlos como le\xEDdos desde esta pantalla."]}),i.querySelector("[data-volver]").onclick=()=>router.irAtras();const o=i.querySelector("#btnMarcarTodas");o&&(o.onclick=async()=>{o.disabled=!0,window.notificationService&&await window.notificationService.marcarTodasVistas(),o.disabled=!1}),this._desuscribir=store.suscribir("notificaciones",()=>this._render(i)),this._render(i),window.notificationService&&window.notificationService.refrescar(),setTimeout(()=>this._marcarVisiblesVistas(i),600)},desmontar(){this._desuscribir&&(this._desuscribir(),this._desuscribir=null)},_estadoStore(){const i=store.obtener("notificaciones");return i&&i.items?i:{items:[],noLeidas:0,porCategoria:{},cargando:!1,error:null}},_filtrar(i){const t=(i||[]).filter(a=>a.estado!=="archivada"),o=this._filtro||"todas";return o==="todas"?t:o==="no_leidas"?t.filter(a=>a.estado==="nueva"):t.filter(a=>a.categoria===o)},_filtrosDisponibles(i){const t=new Set;return(i||[]).forEach(o=>{o.categoria&&o.estado!=="archivada"&&t.add(o.categoria)}),["todas","no_leidas",...Array.from(t)]},_render(i){this._renderFiltros(i),this._renderLista(i)},_renderFiltros(i){const t=i.querySelector("#notifFiltros");if(!t)return;const o=this._estadoStore(),a=l(),e=this._filtrosDisponibles(o.items),c=this._filtro||"todas",n=s=>s==="todas"?"Todas":s==="no_leidas"?"No le\xEDdas":a[s]&&a[s].etiqueta||s;t.innerHTML=e.map(s=>`<button class="notif-filtro${c===s?" notif-filtro--activo":""}" data-filtro="${d(s)}" role="tab" aria-selected="${c===s}">${d(n(s))}</button>`).join(""),t.querySelectorAll("[data-filtro]").forEach(s=>{s.onclick=()=>{this._filtro=s.dataset.filtro,this._renderFiltros(i),this._renderLista(i)}})},_renderLista(i){const t=i.querySelector("#notifLista");if(!t)return;const o=this._estadoStore();if(o.error){t.innerHTML=`<div class="empty-state">
          <div class="empty-state__icono">${r("alert-triangle")}</div>
          <h3 class="empty-state__titulo">No se pudieron cargar</h3>
          <p class="empty-state__descripcion">Revisa tu conexi\xF3n y vuelve a intentarlo.</p>
          <button class="btn-primario" id="btnReintentar" style="justify-content:center">Reintentar</button>
        </div>`;const e=t.querySelector("#btnReintentar");e&&(e.onclick=()=>window.notificationService&&window.notificationService.refrescar());return}const a=this._filtrar(o.items);if(!a.length){t.innerHTML=`<div class="empty-state">
          <div class="empty-state__icono">${r("bell")}</div>
          <h3 class="empty-state__titulo">Todo al d\xEDa</h3>
          <p class="empty-state__descripcion">No tienes notificaciones pendientes. Aqu\xED llegar\xE1n tus avisos de desaf\xEDos, ex\xE1menes, estudio y m\xE1s.</p>
        </div>`;return}t.innerHTML=a.map(e=>this._tarjeta(e)).join(""),this._conectar(i),window.Iconos&&window.Iconos.actualizar()},_tarjeta(i){const t=l(),o=t[i.categoria]||t.sistema,a=Array.isArray(i.acciones)?i.acciones.filter(n=>n&&n.id):[],e=i.estado==="completada"?[]:a,c=(i.contador||1)>1;return`
      <article class="notif-card notif-card--${i.estado||"vista"} notif-card--${i.categoria||"sistema"}" data-id="${i.id}">
        <div class="notif-card__icono">${r(o.icono)}</div>
        <div class="notif-card__cuerpo">
          <div class="notif-card__fila">
            <h4 class="notif-card__titulo">${d(i.titulo)}${c?` <span class="notif-card__contador" title="${i.contador} notificaciones">\xD7${i.contador}</span>`:""}</h4>
            <span class="notif-card__fecha">${d(f(i.creado_en))}</span>
          </div>
          ${i.cuerpo?`<p class="notif-card__desc">${d(i.cuerpo)}</p>`:""}
          ${e.length?`
            <div class="notif-card__acciones">
              ${e.map(n=>`<button class="notif-card__accion${n.id==="rechazar"?" notif-card__accion--peligro":""}" data-accion="${n.id}" data-id="${i.id}">${r(n.icono)} ${d(n.etiqueta)}</button>`).join("")}
            </div>`:""}
        </div>
        <div class="notif-card__marca"><span class="notif-card__punto"></span></div>
      </article>`},_conectar(i){i.querySelectorAll(".notif-card__cuerpo").forEach(t=>{t.onclick=o=>{if(o.target.closest("[data-accion]"))return;const a=t.closest(".notif-card"),e=this._porId(a.dataset.id);if(!e)return;const c=e.url||e.datos&&e.datos.url;c&&router.navegar(c),window.notificationService&&window.notificationService.marcarCompletada(e.id)}}),i.querySelectorAll("[data-accion]").forEach(t=>{t.onclick=async o=>{o.stopPropagation(),t.disabled=!0;const a=this._porId(t.dataset.id);window.notificationService&&a&&await window.notificationService.ejecutarAccion(a.id,t.dataset.accion,a)}})},_porId(i){return(this._estadoStore().items||[]).find(t=>t.id===i)||null},_marcarVisiblesVistas(i){const t=[];i.querySelectorAll(".notif-card--nueva").forEach(o=>{o.dataset.id&&t.push(o.dataset.id)}),t.length&&window.notificationService&&window.notificationService.marcarVistasEnCentro(t)}}})();
