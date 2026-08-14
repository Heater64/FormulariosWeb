(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  window.ProfileEditor = {
    abrir(usuario, opciones = {}) {
      const { onGuardar, onEliminar } = opciones;
      // Drawer lateral: usa su propio backdrop (z-index 99). El modal-overlay
      // global (z-index 200) taparía el panel (z-index 100) e interceptaría
      // todos los clics, haciendo que el editor parezca "no responder".
      const backdrop = document.createElement('div');
      backdrop.className = 'admin-user-detail__backdrop';
      
      const panel = document.createElement('div');
      panel.className = 'admin-user-detail';
      
      let tabActiva = 'general';
      const TABS = [
        { id: 'general', texto: 'General', icono: 'user' },
        { id: 'seguridad', texto: 'Seguridad', icono: 'lock' }
      ];

      function render() {
        panel.innerHTML = `
          <div class="admin-user-detail__header">
            <h3>Editar Usuario</h3>
            <button class="admin-user-detail__close" id="btnCloseEditor">${I('x')}</button>
          </div>
          <div class="admin-tabs">
            ${TABS.map(t => `<button class="admin-tab${tabActiva === t.id ? ' admin-tab--activo' : ''}" data-tab="${t.id}">${I(t.icono)} ${t.texto}</button>`).join('')}
          </div>
          <div class="admin-user-detail__content" id="editorContent">
            ${tabActiva === 'general' ? renderGeneral() : renderSeguridad()}
          </div>
          <div class="admin-user-detail__footer">
            <button class="btn-secundario" id="btnDeleteUser">${I('trash-2')} Eliminar</button>
            <button class="btn-primario" id="btnSaveUser">Guardar Cambios</button>
          </div>
        `;
        bind();
      }

      function renderGeneral() {
        return `
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label>Nombre Completo</label>
            <input type="text" id="editNombre" value="${E(usuario.nombre_completo || '')}">
            <label>Username</label>
            <input type="text" id="editUsername" value="${E(usuario.username || '')}">
          </div>
        `;
      }

      function renderSeguridad() {
        return `
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label>Nueva Contraseña</label>
            <input type="password" id="editPassword" placeholder="Dejar vacío para mantener">
          </div>
        `;
      }

      function bind() {
        panel.querySelectorAll('.admin-tab').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            tabActiva = btn.dataset.tab;
            render();
          };
        });
        panel.querySelector('#btnCloseEditor').onclick = (e) => { e.stopPropagation(); cerrar(); };
        panel.querySelector('#btnSaveUser').onclick = async (e) => {
          e.stopPropagation();
          const passInput = panel.querySelector('#editPassword');
          const datos = {
            nombre_completo: panel.querySelector('#editNombre').value,
            username: panel.querySelector('#editUsername').value,
            // La pestaña General no tiene campo de contraseña: tolerarlo.
            password: passInput ? passInput.value : ''
          };
          if (onGuardar) await onGuardar(datos);
          cerrar();
        };
        panel.querySelector('#btnDeleteUser').onclick = async (e) => {
          e.stopPropagation();
          if (onEliminar) await onEliminar();
          cerrar();
        };
        // Prevenir que clics dentro del modal cierren el modal si hay overlay
        panel.onclick = (e) => e.stopPropagation();
      }

      function cerrar() { panel.remove(); backdrop.remove(); }

      document.body.appendChild(backdrop);
      document.body.appendChild(panel);
      
      // Cerrar al hacer clic en el fondo
      backdrop.onclick = cerrar;
      
      render();
    }
  };
})();
