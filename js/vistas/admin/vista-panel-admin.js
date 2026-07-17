(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);

  function rolBonito(rol) {
    const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
    return map[rol] || rol;
  }

  window.vistaPanelAdmin = {
    _rangoRol(rol) {
      switch ((rol || '').toString().trim().toLowerCase()) {
        case 'owner': return 4;
        case 'admin': return 3;
        case 'editor': return 2;
        default: return 1;
      }
    },
    _puedeEliminar(actor, objetivo) {
      if (!actor || !objetivo) return false;
      if (actor.id === objetivo.id) return false;
      return this._rangoRol(actor.rol) >= this._rangoRol(objetivo.rol);
    },
    _puedeEditar(actor, objetivo) {
      if (!actor || !objetivo) return false;
      return this._rangoRol(actor.rol) >= this._rangoRol(objetivo.rol);
    },
    _opcionesRolPermitidas(actor) {
      return [
        { valor: 'usuario', texto: 'Alumno' },
        { valor: 'editor', texto: 'Profesor (editor)' },
        { valor: 'admin', texto: 'Administrador' },
        { valor: 'owner', texto: 'Propietario' }
      ].filter(o => this._rangoRol(o.valor) <= this._rangoRol(actor.rol));
    },
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'owner'].includes((usuario.rol || '').toString().trim().toLowerCase())) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="router.navegar(\'/estudio\')">Volver</button></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel...</p></div>';
      try {
        const [usuarios, grupos, examenes, stats] = await Promise.all([
          window.adminRepository.listarUsuarios(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes(),
          window.adminRepository.statsGenerales()
        ]);
        this._datos = { usuarios, grupos, examenes, stats, usuario };
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      const { usuarios, grupos, examenes, stats, usuario } = this._datos;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I('settings')} Administración</h2>
            <button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button>
          </div>

          <!-- DASHBOARD -->
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-xl u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Grupos</p><p class="u-texto-xl u-fw-700">${grupos.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-xl u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos leídos</p><p class="u-texto-xl u-fw-700">${stats.lecturas}</p></div>
          </div>

          <!-- USUARIOS -->
          <div class="o-pila">
            <div class="o-flecha o-flecha--between">
              <h3>${I('users')} Usuarios (${usuarios.length})</h3>
              <button class="btn-primario u-fs-xs" id="btnCrearUsuario">+ Crear usuario</button>
            </div>
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${I('search')}</span>
              <input type="text" id="buscarUsuarios" placeholder="Buscar por nombre, username o rol...">
            </div>
            <div class="o-pila" id="listaUsuarios"></div>
          </div>

          <!-- JERARQUÍA DE PERMISOS -->
          <div class="perfil-seccion">
            <div class="perfil-seccion__cabecera">
              <div class="perfil-seccion__icono">${I('shield')}</div>
              <div>
                <h4 class="perfil-seccion__titulo">Jerarquía de permisos</h4>
                <p class="perfil-seccion__desc">Cada rol solo puede gestionar usuarios de rango inferior</p>
              </div>
            </div>
            <div class="admin-jerarquia">
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--owner">${I('crown')} Owner — Control total del sistema</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--admin">${I('settings')} Administrador — Gestiona usuarios y grupos</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--editor">${I('book-open')} Profesor — Crea exámenes y corrige</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--usuario">${I('user')} Alumno — Lee, estudia y responde</div>
            </div>
          </div>

          <!-- GRUPOS -->
          <div class="o-pila">
            <div class="o-flecha o-flecha--between">
              <h3>${I('users')} Grupos (${grupos.length})</h3>
            </div>
            <div class="o-flecha u-mb-2" style="gap:var(--espaciado-sm);flex-wrap:wrap">
              <input type="text" id="nuevoGrupoNombre" placeholder="Nombre del grupo" style="min-width:160px;flex:1">
              <button class="btn-primario" id="btnCrearGrupo">Crear</button>
            </div>
            <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
              ${grupos.map(g => `<div class="admin-grupo-card btn-ver-grupo-admin" data-gid="${g.id}">
                <div class="o-flecha o-flecha--between">
                  <p class="admin-grupo-card__nombre">${window.helpers.escapeHtml(g.nombre)}</p>
                  <button class="btn-eliminar-grupo" data-id="${g.id}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex;font-size:var(--texto-xs)">${I('x')}</button>
                </div>
                <div class="admin-grupo-card__stats">
                  <span class="admin-grupo-card__stat">${I('user')} Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>

          <!-- EXÁMENES -->
          <div class="o-pila">
            <h3>${I('file-text')} Exámenes (${examenes.length})</h3>
            <div class="o-pila">${examenes.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Sin exámenes</p>' : examenes.slice(0, 10).map(ex => `
              <div class="tarjeta-capitulo">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span>
                  <span class="u-fs-xs u-color-texto-terciario">${ex.estado} · ${ex.grupos?.nombre || ''}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>`;

      this._bindEvents(raiz);

      // Render por lotes de la lista de usuarios (optimización de memoria / listas enormes)
      const listaU = raiz.querySelector('#listaUsuarios');
      if (listaU && window.memoria && usuarios.length > 50) {
        const gestor = window.memoria.seguir(this);
        window.memoria.renderPorLotesHtml(listaU, usuarios, (u) => this._renderizarUsuarioCard(u, usuario), 30, gestor);
      } else if (listaU) {
        listaU.innerHTML = usuarios.map(u => this._renderizarUsuarioCard(u, usuario)).join('');
      }
    },

    _renderizarUsuarioCard(u, actor) {
      const inicial = (u.nombre_completo || u.username || '?').charAt(0).toUpperCase();
      const foto = u.foto_perfil;
      const activo = u.activo !== false;
      const puedeEditar = this._puedeEditar(actor, u);
      const puedeEliminar = this._puedeEliminar(actor, u);
      return `
        <div class="admin-usuario-card" data-inactivo="${!activo}" data-nombre="${window.helpers.escapeHtml(u.nombre_completo)}" data-username="${window.helpers.escapeHtml(u.username)}" data-rol="${u.rol}">
          <div class="admin-usuario-card__cabecera">
            <div class="admin-usuario-card__avatar">${foto ? `<img src="${foto}" alt="">` : inicial}</div>
            <div class="admin-usuario-card__info">
              <p class="admin-usuario-card__nombre">${window.helpers.escapeHtml(u.nombre_completo)}</p>
              <p class="admin-usuario-card__meta">@${window.helpers.escapeHtml(u.username)} · ${rolBonito(u.rol)}</p>
            </div>
            <span class="admin-usuario-card__badge ${activo ? 'admin-usuario-card__badge--activo' : 'admin-usuario-card__badge--inactivo'}">${activo ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div class="admin-usuario-card__acciones">
            ${puedeEditar ? `<button class="admin-btn-editar btn-editar-usuario" data-id="${u.id}">${I('edit-3')} Editar</button>` : ''}
            ${puedeEditar ? `<button class="admin-btn-permisos btn-cambiar-rol" data-id="${u.id}" data-rol="${u.rol}">${I('shield')} Permisos</button>` : ''}
            ${puedeEliminar ? `<button class="admin-btn-eliminar btn-eliminar-usuario" data-id="${u.id}" data-nombre="${window.helpers.escapeHtml(u.nombre_completo)}">${I('trash-2')} Eliminar</button>` : ''}
          </div>
        </div>`;
    },

    _bindEvents(raiz) {
      const { usuarios, grupos, examenes, stats, usuario } = this._datos;

      raiz.querySelector('#buscarUsuarios')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        raiz.querySelectorAll('.admin-usuario-card').forEach(card => {
          const nombre = (card.dataset.nombre || '').toLowerCase();
          const username = (card.dataset.username || '').toLowerCase();
          const rol = (card.dataset.rol || '').toLowerCase();
          const visible = !q || nombre.includes(q) || username.includes(q) || rol.includes(q);
          card.style.display = visible ? '' : 'none';
        });
      });

      raiz.querySelector('#btnCrearGrupo')?.addEventListener('click', async () => {
        const nombre = raiz.querySelector('#nuevoGrupoNombre')?.value.trim();
        if (!nombre) return;
        await window.adminRepository.crearGrupo(nombre, usuario.id);
        await window.adminRepository.registrarAuditoria('grupo:crear', `Grupo "${nombre}"`, usuario.id);
        router.navegar('/admin');
      });

      raiz.querySelector('#btnCrearUsuario')?.addEventListener('click', async () => {
        const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
        const datos = await window.helpers.formulario({
          titulo: 'Crear usuario',
          campos: [
            { nombre: 'nombre_completo', etiqueta: 'Nombre completo', requerido: true },
            { nombre: 'username', etiqueta: 'Username (único)', requerido: true, placeholder: 'ej: ana.2024' },
            { nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
            { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: 'usuario', opciones: [
              { valor: 'usuario', texto: 'Alumno' },
              { valor: 'editor', texto: 'Profesor (editor)' },
              { valor: 'admin', texto: 'Administrador' }
            ] },
            { nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: usuario.grupo_id || '', opciones: opcionesGrupo }
          ],
          textoConfirmar: 'Crear'
        });
        if (!datos) return;
        if (!datos.username.trim() || !datos.password) { window.helpers.mostrarAlerta('Usuario y contraseña son obligatorios.', 'advertencia'); return; }
        try {
          await window.adminRepository.crearUsuario({
            nombre_completo: datos.nombre_completo.trim(),
            username: datos.username.trim(),
            password: datos.password,
            rol: datos.rol,
            grupo_id: datos.grupo_id || null
          });
          window.helpers.mostrarAlerta('Usuario creado correctamente.', 'exito');
          router.navegar('/admin');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      raiz.querySelectorAll('.btn-editar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          if (!this._puedeEditar(usuario, u)) { window.helpers.mostrarAlerta('No tienes permiso para editar a este usuario.', 'error'); return; }
          const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
          const datos = await window.helpers.formulario({
            titulo: 'Editar usuario',
            mensaje: 'Si no modifies la contraseña, se mantendrá la actual.',
            campos: [
              { nombre: 'nombre_completo', etiqueta: 'Nombre completo', valor: u.nombre_completo || '', requerido: true },
              { nombre: 'username', etiqueta: 'Username (único)', valor: u.username || '', requerido: true },
              { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: u.rol, opciones: this._opcionesRolPermitidas(usuario) },
              { nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: u.grupo_id || '', opciones: opcionesGrupo },
              { nombre: 'password', etiqueta: 'Contraseña (dejar vacío para mantener)', tipo: 'password', valor: '' }
            ],
            textoConfirmar: 'Guardar'
          });
          if (!datos) return;
          if (!datos.username.trim()) { window.helpers.mostrarAlerta('El username es obligatorio.', 'advertencia'); return; }
          try {
            await window.adminRepository.actualizarUsuario(u.id, {
              nombre_completo: datos.nombre_completo.trim(),
              username: datos.username.trim(),
              rol: datos.rol,
              grupo_id: datos.grupo_id || null,
              password: datos.password
            });
            window.helpers.mostrarAlerta('Usuario actualizado.', 'exito');
            router.navegar('/admin');
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      raiz.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          const opciones = this._opcionesRolPermitidas(usuario);
          const datos = await window.helpers.formulario({
            titulo: 'Cambiar permisos',
            mensaje: `Selecciona el nuevo rol para ${u.nombre_completo}.`,
            campos: [
              { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: u.rol, opciones }
            ],
            textoConfirmar: 'Guardar'
          });
          if (!datos || datos.rol === u.rol) return;
          try {
            await window.adminRepository.cambiarRol(u.id, datos.rol);
            window.helpers.mostrarAlerta('Rol actualizado.', 'exito');
            router.navegar('/admin');
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      raiz.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${btn.dataset.nombre}"? Esta acción no se puede deshacer.`, {
            titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar'
          });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarUsuario(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${btn.dataset.nombre}"`, usuario.id);
            window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
            router.navegar('/admin');
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      raiz.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar('¿Eliminar este grupo?', { titulo: 'Eliminar grupo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarGrupo(btn.dataset.id);
            router.navegar('/admin');
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      const gruposLocal = grupos;
      raiz.querySelectorAll('.btn-ver-grupo-admin').forEach(el => {
        el.onclick = async (e) => {
          if (e.target.closest('.btn-eliminar-grupo')) return;
          const gid = el.dataset.gid;
          const grupo = gruposLocal.find(g => g.id === gid);
          if (!grupo) return;
          try {
            const { data: miembros } = await window.supabaseClient.from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', gid).order('nombre_completo');
            const admins = (miembros || []).filter(m => m.rol === 'admin');
            const editores = (miembros || []).filter(m => m.rol === 'editor');
            const alumnos = (miembros || []).filter(m => m.rol === 'usuario');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
              <div class="modal">
                <div class="o-pila" style="gap:var(--espaciado-md)">
                  <h3>${window.helpers.escapeHtml(grupo.nombre)}</h3>
                  <div class="perfil-fila"><span class="perfil-fila__label">Total miembros</span><span class="perfil-fila__valor">${(miembros || []).length}</span></div>
                  <div class="o-pila">
                    <h4>Administradores (${admins.length})</h4>
                    ${admins.length ? admins.map(a => `<div class="tarjeta-capitulo u-fs-sm">${window.helpers.escapeHtml(a.nombre_completo || a.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Profesores (${editores.length})</h4>
                    ${editores.length ? editores.map(e => `<div class="tarjeta-capitulo u-fs-sm">${window.helpers.escapeHtml(e.nombre_completo || e.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin profesores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Alumnos (${alumnos.length})</h4>
                    ${alumnos.length ? alumnos.map(a => `<div class="tarjeta-capitulo u-fs-sm">${window.helpers.escapeHtml(a.nombre_completo || a.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>'}
                  </div>
                </div>
                <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
              </div>`;
            document.body.appendChild(overlay);
            if (window.Iconos) window.Iconos.actualizar();
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.remove(); });
          } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
        };
      });
    }
  };
})();
