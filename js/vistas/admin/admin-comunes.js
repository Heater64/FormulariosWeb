(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  // Utilidades compartidas por las vistas del Centro de Administración
  window.adminComunes = {
    rolBonito(rol) {
      const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
      return map[rol] || rol;
    },

    // Tiempo relativo en español ("Hace 2 minutos")
    tiempoRelativo(iso) {
      if (!iso) return '—';
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 0) return 'Ahora mismo';
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Ahora mismo';
      if (mins < 60) return `Hace ${mins} min${mins !== 1 ? 's' : ''}`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Hace ${hrs}h`;
      const dias = Math.floor(hrs / 24);
      if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
      return window.helpers.formatearFecha(iso);
    },

    tiempoRelativoPreciso(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Icono de Lucide por tipo de acción de auditoría
    iconoAuditoria(accion) {
      const a = String(accion || '');
      if (a.startsWith('usuario')) return 'user';
      if (a.startsWith('grupo')) return 'layout';
      if (a.startsWith('batch')) return 'check-square';
      if (a.startsWith('config')) return 'settings';
      if (a.startsWith('backup')) return 'database';
      if (a.startsWith('examen')) return 'file-text';
      return 'clipboard-list';
    },

    // Navegar a una ruta del SPA. En las páginas standalone (paginas/admin/*.html)
    // el router no está registrado, así que se redirige al SPA con hash.
    irSpa(ruta) {
      if (window.location.pathname.includes('/paginas/admin/')) {
        window.location.href = '../../index.html#!/' + ruta.replace(/^\//, '');
        return;
      }
      window.router.navegar(ruta);
    },

    // Tiempo activo de la sesión actual
    tiempoActivo(inicioSesion) {
      const mins = Math.floor((Date.now() - (inicioSesion || Date.now())) / 60000);
      if (mins < 1) return 'Menos de 1 min';
      if (mins < 60) return mins + ' min';
      const h = Math.floor(mins / 60);
      return h + 'h ' + (mins % 60) + 'm';
    },

    // Media global de notas de exámenes (null si no hay datos)
    mediaGlobal(resumenExamenes) {
      const resumen = resumenExamenes || {};
      const valores = [];
      Object.values(resumen).forEach(r => { if (r.media != null) valores.push(r.media); });
      if (!valores.length) return null;
      return valores.reduce((a, b) => a + b, 0) / valores.length;
    },

    // Volver al perfil: en la página standalone no hay rutas registradas,
    // así que se usa el hook _volverAlSpa si existe, si no el router.
    volver(vista) {
      if (vista._volverAlSpa) { vista._volverAlSpa(); return; }
      router.navegar('/perfil');
    },

    bindTabs(vista, raiz) {
      raiz.querySelectorAll('.admin-tab').forEach(btn => {
        btn.onclick = () => {
          vista._tabActivo = btn.dataset.tab;
          vista._renderizar(raiz);
        };
      });
    },

    // Cabecera moderna del panel: marca (logo + nombre) + título + botón volver
    cabeceraPanel(titulo, subtitulo, nombreVista, marca) {
      const tieneMarca = marca && (marca.nombre || marca.logo);
      const tituloFinal = (tieneMarca && marca.nombre) ? marca.nombre : titulo;
      return `
        <header class="admin-panel-cabecera">
          <div class="admin-panel-cabecera__brand">
            ${marca && marca.logo ? `<img class="admin-panel-cabecera__logo" src="${marca.logo}" alt="Logotipo del centro">` : `<span class="admin-panel-cabecera__logo-fallback">${I('command')}</span>`}
            <div>
              <h1 class="admin-panel-cabecera__titulo">${E(tituloFinal)}</h1>
              <p class="admin-panel-cabecera__subtitulo">${subtitulo}</p>
            </div>
          </div>
          <button class="btn-secundario admin-panel-cabecera__volver" onclick="window.${nombreVista}._volver()">${I('arrow-left')} Volver</button>
        </header>`;
    },

    // Badge de estado de examen
    estadoBadge(estado) {
      const map = {
        'publicado': ['admin-tabla-badge--publicado', 'Publicado'],
        'borrador': ['admin-tabla-badge--borrador', 'Borrador'],
        'archivado': ['admin-tabla-badge--archivado', 'Archivado'],
        'cerrado': ['admin-tabla-badge--archivado', 'Cerrado']
      };
      const [clase, texto] = map[estado] || ['admin-tabla-badge--borrador', estado || '—'];
      return `<span class="admin-tabla-badge ${clase}">${E(texto)}</span>`;
    },

    // Badge de estado de usuario
    estadoUsuario(activo) {
      return activo === false
        ? '<span class="admin-tabla-badge admin-tabla-badge--inactivo">Inactivo</span>'
        : '<span class="admin-tabla-badge admin-tabla-badge--activo">Activo</span>';
    },

    // Modal genérico reutilizable (nuevo diseño)
    abrirModal({ titulo, icono = 'info', contenido, ancho = '480px' }) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:${ancho}">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${I(icono)} ${E(titulo)}</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${I('x')}</button>
            </div>
            <div class="modal-contenido">${contenido}</div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      window.Iconos?.actualizar();
      const cerrar = () => overlay.remove();
      overlay.querySelector('[data-cerrar]').onclick = cerrar;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', onKey); }
      });
      return { overlay, cerrar };
    },

    // Enlaza botones de filtro que re-renderizan al pulsarse.
    bindFiltros(raiz, selector, alCambiar) {
      raiz.querySelectorAll(selector).forEach(btn => {
        btn.onclick = () => alCambiar(btn);
      });
    },

    // Modal de detalle de grupo (miembros por rol, opcionalmente exámenes
    // y botones de edición vía onEditarUsuario).
    async abrirModalGrupo(grupo, opciones = {}) {
      const { examenes = [], mostrarExamenes = false, onEditarUsuario = null } = opciones;
      try {
        const { data: miembros } = await window.supabaseClient.from('perfiles').select('id, nombre_completo, username, rol, foto_perfil').eq('grupo_id', grupo.id).order('nombre_completo');
        const admins = (miembros || []).filter(m => m.rol === 'admin');
        const editores = (miembros || []).filter(m => m.rol === 'editor');
        const alumnos = (miembros || []).filter(m => m.rol === 'usuario');
        const avatarMiembro = (m) => {
          const inicial = (m.nombre_completo || m.username || '?').charAt(0).toUpperCase();
          if (m.foto_perfil) return `<img src="${E(m.foto_perfil)}" alt="" class="admin-miembro__foto">`;
          return `<span class="admin-miembro__inicial">${inicial}</span>`;
        };
        const filaMiembro = (m) => {
          const nombre = E(m.nombre_completo || m.username);
          const username = E(m.username || '');
          const contenido = `
            <div class="admin-miembro">
              <div class="admin-miembro__avatar">${avatarMiembro(m)}</div>
              <div class="admin-miembro__info">
                <span class="admin-miembro__nombre">${nombre}</span>
                ${username && username !== m.nombre_completo ? `<span class="admin-miembro__username">@${username}</span>` : ''}
              </div>`;
          if (onEditarUsuario) {
            return contenido + `
              <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${m.id}">${I('edit-3')} Editar</button>
            </div>`;
          }
          return contenido + `</div>`;
        };
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
          <div class="modal">
            <div class="o-pila" style="gap:var(--espaciado-md)">
              <h3>${E(grupo.nombre)}</h3>
              <div class="perfil-fila"><span class="perfil-fila__label">Total miembros</span><span class="perfil-fila__valor">${(miembros || []).length}</span></div>
              <div class="o-pila">
                <h4>Administradores (${admins.length})</h4>${admins.length ? admins.map(filaMiembro).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>'}
              </div>
              <div class="o-pila">
                <h4>Profesores (${editores.length})</h4>${editores.length ? editores.map(filaMiembro).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin profesores</p>'}
              </div>
              <div class="o-pila">
                <h4>Alumnos (${alumnos.length})</h4>${alumnos.length ? alumnos.map(filaMiembro).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>'}
              </div>
              ${mostrarExamenes ? `<div class="o-pila">
                <h4>Exámenes (${examenes.length})</h4>${examenes.length ? examenes.map(ex => `<div class="tarjeta-capitulo u-fs-sm">${E(ex.titulo)} <span class="u-color-texto-terciario">(${ex.estado})</span></div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin exámenes</p>'}
              </div>` : ''}
            </div>
            <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
          </div>`;
        document.body.appendChild(overlay);
        window.Iconos?.actualizar();

        if (onEditarUsuario) {
          overlay.querySelectorAll('.btn-editar-usuario').forEach(btn => {
            btn.onclick = async () => onEditarUsuario(btn.dataset.id);
          });
        }

        overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    descargarCSVTexto(nombre, texto) {
      const blob = new Blob([texto], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre.endsWith('.csv') ? nombre : nombre + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    },

    descargarJSON(nombre, objeto) {
      const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre.endsWith('.json') ? nombre : nombre + '.json';
      a.click();
      URL.revokeObjectURL(url);
    },

    // Input oculto de archivo reutilizable (CSV/JSON). Se limpia solo:
    // si el usuario cancela el diálogo, el input se retira con un timeout.
    elegirArchivo(aceptar = '.csv,text/csv') {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = aceptar;
        input.style.display = 'none';
        document.body.appendChild(input);
        const limpiar = () => { input.remove(); window.removeEventListener('focus', limpiar, true); };
        input.onchange = () => {
          limpiar();
          const file = input.files && input.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve({ nombre: file.name, texto: String(reader.result || '') });
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        // Si el diálogo se cierra sin seleccionar (cancel), el input pierde el foco
        // y no se dispara onchange: limpiar al recuperar el foco.
        window.addEventListener('focus', limpiar, true);
        input.click();
      });
    },

    // Estado del sistema (indicadores)
    sistemaFila(icono, label, valor, dotClase = 'admin-indicador--ok', preciso = '') {
      return `
        <div class="admin-sistema__fila" ${preciso ? `title="${E(preciso)}"` : ''}>
          <span class="admin-sistema__label">${I(icono)} ${E(label)}</span>
          <span class="admin-sistema__valor"><span class="admin-indicador ${dotClase}"></span>${E(valor)}</span>
        </div>`;
    },

    // Sección funcional del Centro de Administración
    seccion({ icono, iconoClase = '', titulo, desc = '', contador = '', contenido, anchoCompleto = false }) {
      return `
        <section class="admin-seccion${anchoCompleto ? ' admin-seccion--ancho-completo' : ''}">
          <div class="admin-seccion__cabecera">
            <div class="admin-seccion__icono ${iconoClase}">${I(icono)}</div>
            <div class="admin-seccion__info">
              <h2 class="admin-seccion__titulo">${E(titulo)}</h2>
              ${desc ? `<p class="admin-seccion__desc">${E(desc)}</p>` : ''}
            </div>
            ${contador ? `<span class="admin-seccion__contador">${contador}</span>` : ''}
          </div>
          ${contenido}
        </section>`;
    },

    // Estado vacío bien diseñado
    vacio(icono, titulo, descripcion = '') {
      return `
        <div class="empty-state empty-state--compacto">
          <div class="empty-state__icono">${I(icono)}</div>
          <h3 class="empty-state__titulo">${E(titulo)}</h3>
          ${descripcion ? `<p class="empty-state__descripcion">${E(descripcion)}</p>` : ''}
        </div>`;
    }
  };
})();
