(function(){"use strict";const d=t=>window.helpers.escapeHtml(t),s=t=>window.Iconos.render(t),w=(t,a)=>t.querySelector(a),h=(t,a)=>t.querySelectorAll(a),p=[{id:"blanco",nombre:"Blanco",css:"var(--color-fondo-tarjeta)"},{id:"crema",nombre:"Crema",css:"#FFF8E1"},{id:"amarillo",nombre:"Amarillo",css:"#FFF9C4"},{id:"verde",nombre:"Verde",css:"#E8F5E9"},{id:"azul",nombre:"Azul",css:"#E3F2FD"},{id:"rosa",nombre:"Rosa",css:"#FCE4EC"},{id:"morado",nombre:"Morado",css:"#F3E5F5"},{id:"gris",nombre:"Gris",css:"#ECEFF1"}];function f(t){if(!t)return"";const a=new Date(t),i=Date.now()-a.getTime(),o=Math.floor(i/6e4);if(o<1)return"Ahora mismo";if(o<60)return`Hace ${o} ${o===1?"minuto":"minutos"}`;const n=Math.floor(o/60);if(n<24)return`Hace ${n} ${n===1?"hora":"horas"}`;const e=Math.floor(n/24);return e===1?"Ayer":e<7?`Hace ${e} d\xEDas`:new Date(t).toLocaleDateString("es-ES",{day:"numeric",month:"short"})}function b(t){if(!t)return"";const a=document.createElement("div");return a.innerHTML=t,(a.textContent||"").split(`
`).map(n=>n.trim()).filter(Boolean).slice(0,2).join(" ").slice(0,140)}function v(t){if(!t)return null;const a=document.createElement("div");a.innerHTML=t;const i=a.querySelector("img");return i&&i.getAttribute("src")||null}function m(t){if(!t)return"";const a=document.createElement("div");return a.innerHTML=t,(a.textContent||"").trim()}window.vistaNotas={_conectarGestoVolver(t,a){if(this._gestoDestruir&&(this._gestoDestruir(),this._gestoDestruir=null),!window.gestosNavegacion)return;const i=t.firstElementChild||t;this._gestoDestruir=window.gestosNavegacion.initGestosNavegacion(i,{onDerecha:()=>{typeof a=="function"&&a()}})},async montar(t){const a=store.obtener("usuario");if(!a){router.navegar("/login");return}this._raiz=t,this._usuario=a,this._limpiarEditor(),t.innerHTML=window.skeleton?window.skeleton.notas():'<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';try{const i=await window.notasRepository.listarPersonales(a.id);this._pintarHome(t,i)}catch{t.innerHTML='<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar notas</p></div>'}},desmontar(){if(this._sucia&&this._notaActual&&this._guardarAhora(),this._limpiarEditor(),this._gestoDestruir&&(this._gestoDestruir(),this._gestoDestruir=null),this._navOculta){const t=document.getElementById("barra-navegacion");t&&(t.style.display=""),this._navOculta=!1}this._raiz=null},_limpiarEditor(){if(this._tiptapEditor){try{window.editorTiptap.destruir(this._tiptapEditor)}catch{}this._tiptapEditor=null}this._autosaveTimer&&(clearTimeout(this._autosaveTimer),this._autosaveTimer=null)},async _pintarHome(t,a){if(this._limpiarEditor(),this._notas=a||[],this._navOculta){const e=document.getElementById("barra-navegacion");e&&(e.style.display=""),this._navOculta=!1}const i=e=>e.fijada?`<span class="nota-item__pin" title="Nota fijada">${s("pin")}</span>`:"";t.innerHTML=`
        <div class="notas-home">
          <header class="notas-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <h1 class="notas-cabecera__titulo">${s("file-text")} Notas <button class="info-ayuda" data-guia="notas" aria-label="Gu\xEDa de Notas">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
              <button class="btn-icono notas-cabecera__papelera" id="btnPapelera" aria-label="Papelera" title="Papelera">${s("trash-2")}</button>
            </div>
          </header>

          <div class="notas-buscar">
            <span class="notas-buscar__icono">${s("search")}</span>
            <input type="text" id="buscarNotas" placeholder="Buscar notas\u2026" autocomplete="off" aria-label="Buscar notas">
            <button class="notas-buscar__limpiar" id="btnLimpiarBusqueda" aria-label="Limpiar b\xFAsqueda" style="display:none">\xD7</button>
          </div>

          <div class="notas-lista" id="listaNotas">
            ${this._renderizarLista(this._notas,"")}
          </div>

          <div class="notas-fab" id="btnNueva" role="button" tabindex="0" aria-label="Nueva nota" title="Nueva nota">${s("plus")}</div>
        </div>`,window.Iconos.actualizar(),window.campanaNotificaciones&&window.campanaNotificaciones.conectar(t),window.helpers.registrarGuias(t,{notas:["Notas","Conserva tus reflexiones y apuntes personales vinculados a tu estudio b\xEDblico.","Crea una nota desde el bot\xF3n + y usa la papelera para recuperar notas eliminadas."]}),t.querySelector("#btnPapelera").onclick=()=>this._pintarPapelera(t),t.querySelector("#btnNueva").onclick=()=>this._nuevaNota(t),t.querySelector("#btnNueva").addEventListener("keydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this._nuevaNota(t))});const o=t.querySelector("#buscarNotas"),n=t.querySelector("#btnLimpiarBusqueda");o.addEventListener("input",()=>{const e=o.value.toLowerCase().trim();n.style.display=e?"":"none";const r=t.querySelector("#listaNotas");r.innerHTML=this._renderizarLista(this._notas,e),this._engancharLista(t,r),e&&r.querySelectorAll(".nota-item").length===0&&(r.innerHTML=`<div class="notas-vacio">
            <span class="notas-vacio__icono">${s("search")}</span>
            <p>Sin resultados para \xAB${d(e)}\xBB</p>
            <span class="notas-vacio__sub">Prueba con otras palabras.</span>
          </div>`,window.Iconos.actualizar()),window.Iconos.actualizar()}),n.onclick=()=>{o.value="",n.style.display="none",o.dispatchEvent(new Event("input")),o.focus()},this._engancharLista(t,t.querySelector("#listaNotas")),this._conectarGestoVolver(t,()=>{this._papeleraActiva&&this._pintarHome(t,this._notas)})},_renderizarLista(t,a){const i=this._filtrar(t,a);return i.length===0&&!a?`<div class="notas-vacio">
          <span class="notas-vacio__icono">${s("file-text")}</span>
          <p class="notas-vacio__titulo">A\xFAn no tienes notas</p>
          <span class="notas-vacio__sub">Pulsa + para crear tu primera nota.</span>
        </div>`:i.map(o=>this._itemNota(o)).join("")},_filtrar(t,a){return a?t.filter(i=>{const o=(i.titulo||"").toLowerCase().includes(a),n=(m(i.contenido)||"").toLowerCase().includes(a);return o||n}):t},_itemNota(t){const a=v(t.contenido),i=p.find(o=>o.id===t.color_fondo)||p[0];return`
        <button class="nota-item" data-id="${t.id}" data-color="${d(t.color_fondo||"blanco")}" style="--nota-color:${i.css}" aria-label="Abrir ${d(t.titulo||"nota")}">
          ${a?`<span class="nota-item__miniatura"><img src="${a}" alt="" width="52" height="52" loading="lazy" decoding="async"></span>`:`<span class="nota-item__icono">${s("file-text")}</span>`}
          <span class="nota-item__cuerpo">
            <span class="nota-item__fila">
              <span class="nota-item__titulo">${d(t.titulo||"Sin t\xEDtulo")}</span>
              ${t.fijada?`<span class="nota-item__pin" title="Nota fijada">${s("pin")}</span>`:""}
            </span>
            ${t.contenido?`<span class="nota-item__preview">${d(b(t.contenido))}</span>`:""}
            <span class="nota-item__fecha">${f(t.actualizado_en||t.creado_en)}</span>
          </span>
        </button>`},_engancharLista(t,a){h(a,".nota-item").forEach(i=>{i.onclick=()=>{const o=this._notas.find(n=>n.id===i.dataset.id);o&&this._pintarEditor(t,o)}})},async _pintarPapelera(t){this._papeleraActiva=!0,this._limpiarEditor(),t.innerHTML=`
        <div class="notas-home">
          <header class="notas-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono" id="btnVolverPapelera" aria-label="Volver a notas" title="Volver">${s("chevron-left")}</button>
              <div>
                <h1 class="notas-cabecera__titulo">${s("trash-2")} Papelera <button class="info-ayuda" data-guia="notas" aria-label="Gu\xEDa de la Papelera">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones?window.campanaNotificaciones.renderCampana():""}
            </div>
          </header>
          <div class="notas-lista" id="listaPapelera">
            <div class="o-pila u-mt-3" style="align-items:center;gap:var(--espaciado-sm)"><span class="u-color-texto-terciario">Cargando\u2026</span></div>
          </div>
        </div>`;const a=async()=>{this._papeleraActiva=!1;try{this._notas=await window.notasRepository.listarPersonales(this._usuario.id)}catch{}this._pintarHome(t,this._notas)};window.campanaNotificaciones&&window.campanaNotificaciones.conectar(t),window.helpers.registrarGuias(t,{notas:["Papelera","Recupera o elimina definitivamente las notas que ya no necesitas.","Usa recuperar para devolver una nota a tu lista principal o eliminar para borrarla definitivamente."]}),t.querySelector("#btnVolverPapelera").onclick=a,this._conectarGestoVolver(t,a);let i=[];try{i=await window.notasRepository.listarPapelera(this._usuario.id)}catch{i=[]}const o=t.querySelector("#listaPapelera");if(i.length===0){o.innerHTML=`<div class="notas-vacio">
          <span class="notas-vacio__icono">${s("trash-2")}</span>
          <p class="notas-vacio__titulo">La papelera est\xE1 vac\xEDa</p>
          <span class="notas-vacio__sub">Las notas que elimines aparecer\xE1n aqu\xED.</span>
        </div>`,window.Iconos.actualizar();return}o.innerHTML=i.map(n=>`
        <div class="nota-item nota-item--papelera" data-id="${n.id}">
          <span class="nota-item__icono">${s("file-text")}</span>
          <span class="nota-item__cuerpo">
            <span class="nota-item__fila">
              <span class="nota-item__titulo">${d(n.titulo||"Sin t\xEDtulo")}</span>
            </span>
            <span class="nota-item__fecha">${f(n.eliminada_en||n.actualizado_en)}</span>
          </span>
          <span class="nota-item__acciones">
            <button class="btn-icono" data-restaurar="${n.id}" aria-label="Restaurar nota" title="Restaurar">${s("rotate-ccw")}</button>
            <button class="btn-icono btn-icono--peligro" data-eliminar="${n.id}" aria-label="Eliminar definitivamente" title="Eliminar definitivamente">${s("trash-2")}</button>
          </span>
        </div>`).join(""),window.Iconos.actualizar(),h(o,"[data-restaurar]").forEach(n=>{n.onclick=async()=>{try{await window.notasRepository.restaurarPersonal(n.dataset.restaurar,this._usuario.id),this._notas=await window.notasRepository.listarPersonales(this._usuario.id),window.helpers.mostrarAlerta("Nota restaurada.","exito"),this._pintarPapelera(t)}catch{window.helpers.mostrarAlerta("Error al restaurar.","error")}}}),h(o,"[data-eliminar]").forEach(n=>{n.onclick=async()=>{if(await window.helpers.confirmar("Esta nota se eliminar\xE1 para siempre. Esta acci\xF3n no se puede deshacer.",{titulo:"Eliminar definitivamente",textoConfirmar:"Eliminar"}))try{await window.notasRepository.eliminarDefinitivo(n.dataset.eliminar,this._usuario.id),window.helpers.mostrarAlerta("Nota eliminada.","exito"),this._pintarPapelera(t)}catch{window.helpers.mostrarAlerta("Error al eliminar.","error")}}})},_nuevaNota(t){this._pintarEditor(t,null)},async _pintarEditor(t,a){this._limpiarEditor(),this._papeleraActiva=!1;const i=document.getElementById("barra-navegacion");i&&(i.style.display="none",this._navOculta=!0);const o=!a,n=o?{id:null,titulo:"",contenido:"",color_fondo:"blanco",fijada:!1,creado_en:null}:{...a};this._notaActual=n,this._esNueva=o,this._sucia=!1,this._guardando=!1;const e=p.find(c=>c.id===n.color_fondo)||p[0];t.innerHTML=`
        <div class="notas-editor" data-color="${d(n.color_fondo)}" style="--nota-color:${e.css}">
          <header class="notas-editor__cabecera">
            <button class="btn-icono notas-editor__btn" id="btnVolver" aria-label="Volver a notas" title="Volver">${s("chevron-left")}</button>
            <span class="notas-editor__estado" id="estadoGuardado" aria-live="polite"></span>
            <span class="notas-editor__acciones">
              <button class="btn-icono notas-editor__btn" id="btnUndo" aria-label="Deshacer" title="Deshacer" disabled>${s("undo-2")}</button>
              <button class="btn-icono notas-editor__btn" id="btnRedo" aria-label="Rehacer" title="Rehacer" disabled>${s("redo-2")}</button>
              <button class="btn-icono notas-editor__btn" id="btnMenu" aria-label="M\xE1s opciones" title="M\xE1s opciones">${s("more-vertical")}</button>
            </span>
          </header>

          <div class="notas-editor__cuerpo" id="cuerpoEditor">
            <input type="text" class="notas-editor__titulo" id="tituloNota" placeholder="T\xEDtulo" value="${d(n.titulo||"")}" autocomplete="off" aria-label="T\xEDtulo de la nota">
            <p class="notas-editor__fecha" id="fechaNota">${n.actualizado_en?this._fechaCompleta(n.actualizado_en):"Nueva nota"}</p>
            <div class="tiptap-editor notas-editor__texto" id="editorContenido"></div>
          </div>

          <div class="notas-editor__barra" id="barraFormato" role="toolbar" aria-label="Formato de texto">
            <button type="button" class="notas-editor__fmt" data-cmd="bold" title="Negrita" aria-label="Negrita">${s("bold")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="italic" title="Cursiva" aria-label="Cursiva">${s("italic")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="underline" title="Subrayado" aria-label="Subrayado">${s("underline")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="strike" title="Tachado" aria-label="Tachado">${s("strikethrough")}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="h1" title="T\xEDtulo 1" aria-label="T\xEDtulo 1">${s("heading-1")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="h2" title="T\xEDtulo 2" aria-label="T\xEDtulo 2">${s("heading-2")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="h3" title="T\xEDtulo 3" aria-label="T\xEDtulo 3">${s("heading-3")}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="bulletList" title="Lista" aria-label="Lista de vi\xF1etas">${s("list")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="orderedList" title="Lista numerada" aria-label="Lista numerada">${s("list-ordered")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="taskList" title="Casillas" aria-label="Lista de tareas">${s("list-checks")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="blockquote" title="Cita" aria-label="Cita">${s("quote")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="hr" title="Separador" aria-label="Separador">${s("minus")}</button>
            <span class="notas-editor__sep"></span>
            <button type="button" class="notas-editor__fmt" data-cmd="image" title="Insertar imagen" aria-label="Insertar imagen">${s("image")}</button>
            <button type="button" class="notas-editor__fmt" data-cmd="draw" title="Dibujar" aria-label="Dibujar a mano">${s("pen-tool")}</button>
          </div>
        </div>`,window.Iconos.actualizar();const r=(c,u)=>{this._tiptapEditor&&this._tiptapEditor.chain().focus()[c](u).run()};h(t,".notas-editor__fmt").forEach(c=>{c.onclick=()=>{const u=c.dataset.cmd;if(u==="image"){this._insertarImagen();return}if(u==="draw"){this._insertarDibujo();return}if(u==="h1")return r("toggleHeading",{level:1});if(u==="h2")return r("toggleHeading",{level:2});if(u==="h3")return r("toggleHeading",{level:3});if(u==="hr")return r("setHorizontalRule");r("toggle"+u.charAt(0).toUpperCase()+u.slice(1))}}),t.querySelector("#btnVolver").onclick=()=>this._volverDeEditor(t),this._conectarGestoVolver(t,()=>this._volverDeEditor(t)),t.querySelector("#btnUndo").onclick=()=>r("undo"),t.querySelector("#btnRedo").onclick=()=>r("redo"),t.querySelector("#btnMenu").onclick=()=>this._menuOpciones(t);const l=t.querySelector("#tituloNota");l.addEventListener("input",()=>{this._notaActual.titulo=l.value,this._marcarSucia(),this._programarAutosave()});const _=t.querySelector("#editorContenido");window.editorTiptap.crear(_,n.contenido||"",{ariaLabel:"Editor de la nota",placeholder:"Escribe tu nota\u2026",onUpdate:c=>{this._notaActual.contenido=c,this._marcarSucia(),this._programarAutosave(),this._actualizarEstadosFormato()}}).then(c=>{this._tiptapEditor=c,this._actualizarEstadosFormato(),c.on("selectionUpdate",()=>this._actualizarEstadosFormato()),c.on("transaction",()=>this._actualizarUndoRedo()),this._actualizarUndoRedo(),l.focus()})},_marcarSucia(){if(!this._sucia){this._sucia=!0;const t=this._raiz&&this._raiz.querySelector("#estadoGuardado");t&&(t.textContent="Guardando\u2026")}},_programarAutosave(){this._autosaveTimer&&clearTimeout(this._autosaveTimer),this._autosaveTimer=setTimeout(()=>this._guardarAhora(),900)},async _guardarAhora(){if(this._guardando)return;const t=this._notaActual;if(!t)return;const a=!(t.contenido||"").trim()||t.contenido==="<p></p>",i=!(t.titulo||"").trim();if(this._esNueva&&a&&i){const n=this._raiz&&this._raiz.querySelector("#estadoGuardado");n&&(n.textContent=""),this._sucia=!1;return}this._guardando=!0;const o=this._raiz&&this._raiz.querySelector("#estadoGuardado");o&&(o.textContent="Guardando\u2026");try{const n=window.notasRepository;let e;this._esNueva?(e=await n.crearPersonal(this._usuario.id,{titulo:t.titulo,contenido:t.contenido,color_fondo:t.color_fondo}),this._esNueva=!1,this._notaActual.id=e.id,this._notaActual.creado_en=e.creado_en):(await n.actualizarPersonal(t.id,{titulo:t.titulo,contenido:t.contenido,color_fondo:t.color_fondo},this._usuario.id),this._notaActual.actualizado_en=new Date().toISOString()),this._sucia=!1,this._recargarListaSilenciosa(),o&&(o.textContent="Guardado",setTimeout(()=>{o&&o.textContent==="Guardado"&&(o.textContent="")},1800))}catch{o&&(o.textContent="Error al guardar")}finally{this._guardando=!1}},async _recargarListaSilenciosa(){try{const t=await window.notasRepository.listarPersonales(this._usuario.id);this._notas=t}catch{}},_volverDeEditor(t){(async()=>{this._sucia&&await this._guardarAhora(),this._limpiarEditor();try{const i=await window.notasRepository.listarPersonales(this._usuario.id);this._notas=i}catch{}this._raiz&&this._pintarHome(t,this._notas)})()},_fechaCompleta(t){return new Date(t).toLocaleString("es-ES",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})},_actualizarEstadosFormato(){const t=this._tiptapEditor;if(!t||!this._raiz)return;const a=i=>t?i==="bold"?t.isActive("bold"):i==="italic"?t.isActive("italic"):i==="underline"?t.isActive("underline"):i==="strike"?t.isActive("strike"):i==="h1"?t.isActive("heading",{level:1}):i==="h2"?t.isActive("heading",{level:2}):i==="h3"?t.isActive("heading",{level:3}):i==="bulletList"?t.isActive("bulletList"):i==="orderedList"?t.isActive("orderedList"):i==="taskList"?t.isActive("taskList"):i==="blockquote"?t.isActive("blockquote"):!1:!1;h(this._raiz,".notas-editor__fmt").forEach(i=>{i.classList.toggle("notas-editor__fmt--activo",a(i.dataset.cmd))})},_actualizarUndoRedo(){const t=this._tiptapEditor;if(!t||!this._raiz)return;const a=this._raiz.querySelector("#btnUndo"),i=this._raiz.querySelector("#btnRedo");a&&(a.disabled=!t.can().undo()),i&&(i.disabled=!t.can().redo())},_insertarImagen(){const t=document.createElement("input");t.type="file",t.accept="image/*",t.onchange=()=>{const a=t.files&&t.files[0];if(!a)return;const i=new FileReader;i.onload=async()=>{const o=await this._comprimirImagen(i.result,a.type);this._tiptapEditor&&this._tiptapEditor.chain().focus().setImage({src:o}).run()},i.readAsDataURL(a)},t.click()},_comprimirImagen(t,a){return new Promise(i=>{const o=new Image;o.onload=()=>{const e=document.createElement("canvas");let r=1;o.width>1200&&(r=1200/o.width),e.width=Math.max(1,Math.round(o.width*r)),e.height=Math.max(1,Math.round(o.height*r));const l=e.getContext("2d");try{l.drawImage(o,0,0,e.width,e.height);const _=(a||"").includes("jpeg")||(a||"").includes("jpg");i(e.toDataURL(_?"image/jpeg":"image/png",.82))}catch{i(t)}},o.onerror=()=>i(t),o.src=t})},_insertarDibujo(){if(!window.editorDibujo){window.helpers.mostrarAlerta("El dibujo no est\xE1 disponible.","advertencia");return}window.editorDibujo.abrir({onConfirm:t=>{this._tiptapEditor&&this._tiptapEditor.chain().focus().setImage({src:t}).run()}})},async _menuOpciones(t){const a=this._notaActual;if(!a)return;const i=this._esNueva,o=document.createElement("div");o.className="notas-menu-overlay",o.innerHTML=`
        <div class="notas-menu" role="dialog" aria-modal="true" aria-label="Opciones de la nota">
          <p class="notas-menu__titulo">Opciones</p>
          <div class="notas-menu__colores" role="group" aria-label="Color de fondo">
            <span class="notas-menu__etiqueta">Color</span>
            <div class="notas-menu__paleta">
              ${p.map(e=>`
                <button type="button" class="notas-menu__color${e.id===a.color_fondo?" notas-menu__color--activo":""}"
                  data-color="${e.id}" style="--c:${e.css}" aria-label="${e.nombre}" title="${e.nombre}"></button>`).join("")}
            </div>
          </div>
          <div class="notas-menu__opciones">
            <button type="button" data-accion="fijar">${s("pin")} ${a.fijada?"Quitar fijaci\xF3n":"Fijar nota"}</button>
            <button type="button" data-accion="duplicar">${s("copy")} Duplicar</button>
            <button type="button" data-accion="compartir">${s("share-2")} Compartir</button>
            <button type="button" data-accion="pdf">${s("file-down")} Exportar PDF</button>
            <button type="button" data-accion="txt">${s("file-text")} Exportar TXT</button>
            <button type="button" data-accion="eliminar" class="notas-menu__peligro">${s("trash-2")} Eliminar nota</button>
          </div>
          <button type="button" class="notas-menu__cancelar" data-cerrar>Cancelar</button>
        </div>`,document.body.appendChild(o),window.Iconos.actualizar();const n=()=>o.remove();o.addEventListener("click",e=>{e.target===o&&n()}),o.querySelector("[data-cerrar]").onclick=n,h(o,".notas-menu__color").forEach(e=>{e.onclick=async()=>{const r=e.dataset.color;a.color_fondo=r;const l=t.querySelector(".notas-editor");if(l){l.dataset.color=r;const _=p.find(c=>c.id===r)||p[0];l.style.setProperty("--nota-color",_.css)}h(o,".notas-menu__color").forEach(_=>_.classList.toggle("notas-menu__color--activo",_.dataset.color===r)),this._marcarSucia(),this._programarAutosave(),a.id&&await window.notasRepository.actualizarPersonal(a.id,{color_fondo:r},this._usuario.id).catch(()=>{})}}),o.querySelector('[data-accion="fijar"]').onclick=async()=>{if(n(),i&&!a.id&&(this._sucia&&await this._guardarAhora(),!a.id)){window.helpers.mostrarAlerta("Escribe algo primero para fijar.","advertencia");return}const e=!a.fijada;await window.notasRepository.fijarPersonal(a.id,e,this._usuario.id).catch(()=>{}),a.fijada=e,window.helpers.mostrarAlerta(e?"Nota fijada.":"Fijaci\xF3n quitada.","exito")},o.querySelector('[data-accion="duplicar"]').onclick=async()=>{n();try{this._sucia&&await this._guardarAhora();const e=this._notaActual;await window.notasRepository.duplicarPersonal(this._usuario.id,e),window.helpers.mostrarAlerta("Nota duplicada.","exito");const r=await window.notasRepository.listarPersonales(this._usuario.id);this._notas=r}catch{window.helpers.mostrarAlerta("Error al duplicar.","error")}},o.querySelector('[data-accion="compartir"]').onclick=async()=>{n(),this._sucia&&await this._guardarAhora();const e=(a.titulo?a.titulo+`

`:"")+m(a.contenido);if(navigator.share)try{await navigator.share({title:a.titulo||"Nota",text:e});return}catch{}try{await navigator.clipboard.writeText(e),window.helpers.mostrarAlerta("Nota copiada al portapapeles.","exito")}catch{window.helpers.mostrarAlerta("No se pudo compartir.","error")}},o.querySelector('[data-accion="pdf"]').onclick=async()=>{n(),this._sucia&&await this._guardarAhora(),this._exportarPDF(a)},o.querySelector('[data-accion="txt"]').onclick=async()=>{n(),this._sucia&&await this._guardarAhora();const e=(a.titulo||"nota").replace(/[^\w\dáéíóúñÑü -]/gi,"").trim()||"nota";window.helpers.descargarTexto(e,(a.titulo?a.titulo+`

`:"")+m(a.contenido))},o.querySelector('[data-accion="eliminar"]').onclick=async()=>{if(n(),!!await window.helpers.confirmar("La nota se mover\xE1 a la papelera. Podr\xE1s restaurarla desde all\xED.",{titulo:"Eliminar nota",textoConfirmar:"Mover a papelera"}))try{if(i&&!a.id){this._limpiarEditor();const l=await window.notasRepository.listarPersonales(this._usuario.id);this._raiz&&this._pintarHome(this._raiz,l),window.helpers.mostrarAlerta("Nota descartada.","exito");return}this._sucia&&(this._sucia=!1),await window.notasRepository.moverAPapelera(a.id,this._usuario.id),window.helpers.mostrarAlerta("Nota movida a la papelera.","exito");const r=await window.notasRepository.listarPersonales(this._usuario.id);this._notas=r,this._limpiarEditor(),this._raiz&&this._pintarHome(this._raiz,r)}catch{window.helpers.mostrarAlerta("Error al eliminar.","error")}}},_exportarPDF(t){const a=window.open("","_blank","width=800,height=900");if(!a){window.helpers.mostrarAlerta("Permite ventanas emergentes para exportar.","advertencia");return}const i=p.find(o=>o.id===t.color_fondo)||p[0];a.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${d(t.titulo||"Nota")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #0F172A; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .fecha { color: #64748B; font-size: 13px; margin-bottom: 28px; }
  .contenido { line-height: 1.75; font-size: 15px; }
  .contenido h1 { font-size: 24px; } .contenido h2 { font-size: 20px; } .contenido h3 { font-size: 17px; }
  .contenido ul, .contenido ol { padding-left: 24px; }
  .contenido blockquote { border-left: 3px solid #3B82F6; margin: 12px 0; padding: 4px 16px; color: #334155; }
  .contenido hr { border: none; border-top: 1px solid #CBD5E1; margin: 20px 0; }
  .contenido img { max-width: 100%; border-radius: 8px; }
  .contenido ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  .contenido ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: baseline; }
  @media print { body { margin: 24px; } }
</style>
</head>
<body>
  <h1>${d(t.titulo||"Sin t\xEDtulo")}</h1>
  <div class="fecha">${t.actualizado_en?new Date(t.actualizado_en).toLocaleString("es-ES"):""}</div>
  <div class="contenido">${window.sanitizacion?window.sanitizacion.sanitizarHtml(t.contenido||""):t.contenido||""}</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 300); }<\/script>
</body>
</html>`),a.document.close()}}})();
