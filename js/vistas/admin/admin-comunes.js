(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  // Utilidades compartidas por vista-panel-admin.js y vista-owner.js
  window.adminComunes = {
    rolBonito(rol) {
      const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
      return map[rol] || rol;
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

    // Esqueleto común de los paneles: cabecera con título + "← Volver",
    // pestañas y contenedor de contenido.
    renderizarPanel(vista, raiz, { titulo, icono, contenedorId, tabs, nombreVista }) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I(icono)} ${titulo}</h2>
            <button class="btn-secundario" onclick="window.${nombreVista}._volver()">← Volver</button>
          </div>
          <div class="admin-tabs">${tabs.map(t => `
            <button class="admin-tab${vista._tabActivo === t.id ? ' admin-tab--activo' : ''}" data-tab="${t.id}">${I(t.icono)} ${t.texto}</button>`
          ).join('')}</div>
          <div id="${contenedorId}">${vista._renderTabContent(raiz)}</div>
        </div>`;
      window.adminComunes.bindTabs(vista, raiz);
      vista._bindTabContent(raiz);
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
        const { data: miembros } = await window.supabaseClient.from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', grupo.id).order('nombre_completo');
        const admins = (miembros || []).filter(m => m.rol === 'admin');
        const editores = (miembros || []).filter(m => m.rol === 'editor');
        const alumnos = (miembros || []).filter(m => m.rol === 'usuario');
        const filaMiembro = (m) => onEditarUsuario
          ? `<div class="tarjeta-capitulo u-fs-sm o-flecha o-flecha--between" style="gap:var(--espaciado-xs)">
              <span>${E(m.nombre_completo || m.username)}</span>
              <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${m.id}">${I('edit-3')}</button>
            </div>`
          : `<div class="tarjeta-capitulo u-fs-sm">${E(m.nombre_completo || m.username)}</div>`;
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
    }
  };
})();
