(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  function rolBonito(rol) {
    const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
    return map[rol] || rol;
  }

  const TABS = [
    { id: 'dashboard', icono: 'bar-chart-2', texto: 'Dashboard' },
    { id: 'usuarios', icono: 'users', texto: 'Usuarios' },
    { id: 'grupos', icono: 'layout', texto: 'Grupos' },
    { id: 'examenes', icono: 'file-text', texto: 'Exámenes' }
  ];

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
        this._tabActivo = 'dashboard';
        this._pagUsuarios = 1;
        this._porPagina = 50;
        this._buscarUsuarios = '';
        this._seleccion = new Set();
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    async _renderizar(raiz) {
      const { usuarios, grupos, examenes, stats, usuario } = this._datos;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I('settings')} Administración</h2>
            <button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button>
          </div>
          <div class="admin-tabs">${TABS.map(t => `
            <button class="admin-tab${this._tabActivo === t.id ? ' admin-tab--activo' : ''}" data-tab="${t.id}">${I(t.icono)} ${t.texto}</button>`
          ).join('')}</div>
          <div id="adminContenido">${this._renderTabContent(raiz)}</div>
        </div>`;
      this._bindTabs(raiz);
      this._bindTabContent(raiz);
    },
    _renderTabContent(raiz) {
      const { usuarios, grupos, examenes, stats, usuario } = this._datos;
      switch (this._tabActivo) {
        case 'dashboard': return this._renderDashboard(stats, grupos, examenes);
        case 'usuarios': return this._renderUsuarios(usuarios, usuario);
        case 'grupos': return this._renderGrupos(grupos);
        case 'examenes': return this._renderExamenes(examenes);
        default: return '';
      }
    },
    _renderDashboard(stats, grupos, examenes) {
      const porRol = stats.porRol || {};
      return `
        <div class="o-pila o-pila--lg">
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
            <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('users')}</div><div><p class="tarjeta-estadistica__valor">${stats.usuarios}</p><p class="tarjeta-estadistica__etiqueta">Usuarios</p></div></div>
            <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('layout')}</div><div><p class="tarjeta-estadistica__valor">${grupos.length}</p><p class="tarjeta-estadistica__etiqueta">Grupos</p></div></div>
            <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('file-text')}</div><div><p class="tarjeta-estadistica__valor">${stats.examenes}</p><p class="tarjeta-estadistica__etiqueta">Exámenes</p></div></div>
            <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('book-open')}</div><div><p class="tarjeta-estadistica__valor">${stats.lecturas}</p><p class="tarjeta-estadistica__etiqueta">Capítulos leídos</p></div></div>
            <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('brain')}</div><div><p class="tarjeta-estadistica__valor">${stats.tarjetas}</p><p class="tarjeta-estadistica__etiqueta">Tarjetas memoria</p></div></div>
          </div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Propietarios</p><p class="u-texto-lg u-fw-700">${porRol.owner || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Administradores</p><p class="u-texto-lg u-fw-700">${porRol.admin || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Profesores</p><p class="u-texto-lg u-fw-700">${porRol.editor || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Alumnos</p><p class="u-texto-lg u-fw-700">${porRol.usuario || 0}</p></div>
          </div>
          <!-- Jerarquía de permisos -->
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
        </div>`;
    },
    _renderUsuarios(usuarios, usuario) {
      const q = this._buscarUsuarios.toLowerCase().trim();
      const filtrados = q ? usuarios.filter(u =>
        (u.nombre_completo || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.rol || '').toLowerCase().includes(q)
      ) : usuarios;
      const totalPag = Math.max(1, Math.ceil(filtrados.length / this._porPagina));
      const pag = Math.min(this._pagUsuarios, totalPag);
      const inicio = (pag - 1) * this._porPagina;
      const pagina = filtrados.slice(inicio, inicio + this._porPagina);
      const selCount = this._seleccion.size;
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3>${I('users')} Usuarios (${usuarios.length})</h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              <button class="btn-secundario u-fs-xs" id="btnExportCSV">${I('download')} CSV</button>
              <button class="btn-primario u-fs-xs" id="btnCrearUsuario">+ Crear</button>
            </div>
          </div>
          <div class="admin-buscar">
            <span class="admin-buscar__icono">${I('search')}</span>
            <input type="text" id="buscarUsuarios" placeholder="Buscar por nombre, username o rol..." value="${E(this._buscarUsuarios)}">
          </div>
          ${selCount > 0 ? `
          <div class="admin-batch-bar">
            <span>${selCount} seleccionado${selCount !== 1 ? 's' : ''}</span>
            <select id="batchRol"><option value="">Cambiar rol…</option>
              ${this._opcionesRolPermitidas(usuario).map(o => `<option value="${o.valor}">${o.texto}</option>`).join('')}
            </select>
            <button class="btn-primario" id="btnBatchRol">Aplicar rol</button>
            <button class="btn-secundario" id="btnBatchLimpiar">Limpiar</button>
          </div>` : ''}
          ${filtrados.length > this._porPagina ? this._renderPaginacion(pag, totalPag, 'pagUsuarios') : ''}
          <div class="o-pila" id="listaUsuarios">
            ${pagina.map(u => this._renderizarUsuarioCard(u, usuario)).join('')}
          </div>
          ${filtrados.length > this._porPagina ? this._renderPaginacion(pag, totalPag, 'pagUsuarios') : ''}
        </div>`;
    },
    _renderPaginacion(pag, total, idPrefijo) {
      const paginas = [];
      for (let i = Math.max(1, pag - 2); i <= Math.min(total, pag + 2); i++) paginas.push(i);
      return `<div class="admin-paginacion">
        <button class="admin-paginacion__btn" data-pag="${idPrefijo}" data-val="${Math.max(1, pag - 1)}" ${pag <= 1 ? 'disabled style="opacity:0.4"' : ''}>${I('chevron-left')}</button>
        ${paginas.map(p => `<button class="admin-paginacion__btn${p === pag ? ' admin-paginacion__btn--activo' : ''}" data-pag="${idPrefijo}" data-val="${p}">${p}</button>`).join('')}
        <span class="admin-paginacion__info">${pag} / ${total}</span>
        <button class="admin-paginacion__btn" data-pag="${idPrefijo}" data-val="${Math.min(total, pag + 1)}" ${pag >= total ? 'disabled style="opacity:0.4"' : ''}>${I('chevron-right')}</button>
      </div>`;
    },
    _renderGrupos(grupos) {
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between">
            <h3>${I('layout')} Grupos (${grupos.length})</h3>
          </div>
          <div class="o-flecha u-mb-2" style="gap:var(--espaciado-sm);flex-wrap:wrap">
            <input type="text" id="nuevoGrupoNombre" placeholder="Nombre del grupo" style="min-width:160px;flex:1">
            <button class="btn-primario" id="btnCrearGrupo">Crear grupo</button>
          </div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
            ${grupos.map(g => `<div class="admin-grupo-card btn-ver-grupo-admin" data-gid="${g.id}">
              <div class="o-flecha o-flecha--between">
                <p class="admin-grupo-card__nombre">${E(g.nombre)}</p>
                <button class="btn-eliminar-grupo" data-id="${g.id}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex;font-size:var(--texto-xs)">${I('x')}</button>
              </div>
              <div class="admin-grupo-card__stats">
                <span class="admin-grupo-card__stat">${I('user')} Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</span>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
    },
    _renderExamenes(examenes) {
      return `
        <div class="o-pila">
          <h3>${I('file-text')} Exámenes (${examenes.length})</h3>
          <div class="o-pila">${examenes.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Sin exámenes</p>' : examenes.map(ex => `
            <div class="tarjeta-capitulo">
              <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
                <span class="u-fw-600">${E(ex.titulo)}</span>
                <span class="u-fs-xs u-color-texto-terciario">${ex.estado} · ${ex.grupos?.nombre || ''} · ${ex.perfiles?.nombre_completo || ''}</span>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
    },
    _renderizarUsuarioCard(u, actor) {
      const inicial = (u.nombre_completo || u.username || '?').charAt(0).toUpperCase();
      const foto = u.foto_perfil;
      const activo = u.activo !== false;
      const puedeEditar = this._puedeEditar(actor, u);
      const puedeEliminar = this._puedeEliminar(actor, u);
      const sel = this._seleccion.has(u.id);
      return `
        <div class="admin-usuario-card${sel ? ' admin-usuario-card--selected' : ''}" data-id="${u.id}" data-inactivo="${!activo}" data-nombre="${E(u.nombre_completo)}" data-username="${E(u.username)}" data-rol="${u.rol}">
          <div class="admin-usuario-card__cabecera">
            <input type="checkbox" class="admin-select-cb" data-sel-id="${u.id}" ${sel ? 'checked' : ''}>
            <div class="admin-usuario-card__avatar">${foto ? `<img src="${foto}" alt="">` : inicial}</div>
            <div class="admin-usuario-card__info" style="cursor:pointer" data-ver-detalle="${u.id}">
              <p class="admin-usuario-card__nombre">${E(u.nombre_completo)}</p>
              <p class="admin-usuario-card__meta">@${E(u.username)} · ${rolBonito(u.rol)}${u.grupo_id ? ' · ' + (this._datos.grupos.find(g => g.id === u.grupo_id)?.nombre || '') : ''}</p>
            </div>
            <span class="admin-usuario-card__badge ${activo ? 'admin-usuario-card__badge--activo' : 'admin-usuario-card__badge--inactivo'}">${activo ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div class="admin-usuario-card__acciones">
            ${puedeEditar ? `<button class="admin-btn-editar btn-editar-usuario" data-id="${u.id}">${I('edit-3')} Editar</button>` : ''}
            ${puedeEditar ? `<button class="admin-btn-permisos btn-cambiar-rol" data-id="${u.id}" data-rol="${u.rol}">${I('shield')} Permisos</button>` : ''}
            ${puedeEliminar ? `<button class="admin-btn-eliminar btn-eliminar-usuario" data-id="${u.id}" data-nombre="${E(u.nombre_completo)}">${I('trash-2')} Eliminar</button>` : ''}
            <button class="admin-btn-editar btn-ver-detalle" data-id="${u.id}">${I('info')} Detalle</button>
          </div>
        </div>`;
    },
    _bindTabs(raiz) {
      raiz.querySelectorAll('.admin-tab').forEach(btn => {
        btn.onclick = () => {
          this._tabActivo = btn.dataset.tab;
          this._renderizar(raiz);
        };
      });
    },
    _bindTabContent(raiz) {
      this._bindUsuarios(raiz);
      this._bindGrupos(raiz);
      this._bindComun(raiz);
    },
    _bindComun(raiz) {
      const { usuario } = this._datos;
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;

      r.querySelector('#btnExportCSV')?.addEventListener('click', async () => {
        try {
          const csv = await window.adminRepository.exportarUsuariosCSV();
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'usuarios.csv'; a.click();
          URL.revokeObjectURL(url);
        } catch { window.helpers.mostrarAlerta('Error al exportar', 'error'); }
      });
    },
    _bindUsuarios(raiz) {
      const { usuarios, usuario } = this._datos;
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;

      // Search
      const inpBuscar = r.querySelector('#buscarUsuarios');
      if (inpBuscar) {
        inpBuscar.addEventListener('input', (e) => {
          this._buscarUsuarios = e.target.value;
          this._pagUsuarios = 1;
          this._seleccion.clear();
          this._renderizar(raiz);
        });
      }

      // Pagination
      r.querySelectorAll('[data-pag="pagUsuarios"]').forEach(btn => {
        btn.onclick = () => {
          this._pagUsuarios = parseInt(btn.dataset.val, 10);
          this._renderizar(raiz);
        };
      });

      // Selection checkboxes
      r.querySelectorAll('.admin-select-cb').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) this._seleccion.add(cb.dataset.selId);
          else this._seleccion.delete(cb.dataset.selId);
          this._renderizar(raiz);
        };
      });

      // Batch actions
      r.querySelector('#btnBatchRol')?.addEventListener('click', async () => {
        const rol = r.querySelector('#batchRol')?.value;
        if (!rol || this._seleccion.size === 0) return;
        const ok = await window.helpers.confirmar(`¿Cambiar rol a ${this._seleccion.size} usuario${this._seleccion.size !== 1 ? 's' : ''}?`, { titulo: 'Cambio masivo', textoConfirmar: 'Aplicar' });
        if (!ok) return;
        try {
          await window.adminRepository.batchCambiarRol([...this._seleccion], rol);
          await window.adminRepository.registrarAuditoria('batch:rol', `Rol cambiado a "${rol}" para ${this._seleccion.size} usuarios`, usuario.id);
          window.helpers.mostrarAlerta(`Rol aplicado a ${this._seleccion.size} usuarios.`, 'exito');
          this._seleccion.clear();
          const nuevos = await window.adminRepository.listarUsuarios();
          this._datos.usuarios = nuevos;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelector('#btnBatchLimpiar')?.addEventListener('click', () => {
        this._seleccion.clear();
        this._renderizar(raiz);
      });

      // Create user
      r.querySelector('#btnCrearUsuario')?.addEventListener('click', async () => {
        const grupos = this._datos.grupos;
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
          await window.adminRepository.registrarAuditoria('usuario:crear', `Usuario "${datos.nombre_completo}" creado`, usuario.id);
          window.helpers.mostrarAlerta('Usuario creado correctamente.', 'exito');
          const nuevos = await window.adminRepository.listarUsuarios();
          this._datos.usuarios = nuevos;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      // Edit user
      r.querySelectorAll('.btn-editar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          if (!this._puedeEditar(usuario, u)) { window.helpers.mostrarAlerta('No tienes permiso para editar a este usuario.', 'error'); return; }
          
          window.ProfileEditor.abrir(u, {
            onGuardar: async (datos) => {
              try {
                await window.adminRepository.actualizarUsuario(u.id, {
                  nombre_completo: datos.nombre_completo.trim(),
                  username: datos.username.trim(),
                  password: datos.password || null
                });
                await window.adminRepository.registrarAuditoria('usuario:editar', `Usuario "${datos.nombre_completo}" editado`, usuario.id);
                window.helpers.mostrarAlerta('Usuario actualizado.', 'exito');
                const nuevos = await window.adminRepository.listarUsuarios();
                this._datos.usuarios = nuevos;
                this._renderizar(raiz);
              } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
            },
            onEliminar: async () => {
                const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${u.nombre_completo}"? Esta acción no se puede deshacer.`, {
                  titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar'
                });
                if (!ok) return;
                try {
                  await window.adminRepository.eliminarUsuario(u.id);
                  await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${u.nombre_completo}" eliminado`, usuario.id);
                  window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
                  const nuevos = await window.adminRepository.listarUsuarios();
                  this._datos.usuarios = nuevos.filter(x => x.id !== u.id);
                  this._seleccion.delete(u.id);
                  this._renderizar(raiz);
                } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
            }
          });
        };
      });

      // Change role
      r.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          const opciones = this._opcionesRolPermitidas(usuario);
          const datos = await window.helpers.formulario({
            titulo: 'Cambiar permisos',
            mensaje: `Selecciona el nuevo rol para ${u.nombre_completo}.`,
            campos: [{ nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: u.rol, opciones }],
            textoConfirmar: 'Guardar'
          });
          if (!datos || datos.rol === u.rol) return;
          try {
            await window.adminRepository.cambiarRol(u.id, datos.rol);
            await window.adminRepository.registrarAuditoria('usuario:rol', `Rol de "${u.nombre_completo}" cambiado a "${datos.rol}"`, usuario.id);
            window.helpers.mostrarAlerta('Rol actualizado.', 'exito');
            const nuevos = await window.adminRepository.listarUsuarios();
            this._datos.usuarios = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // Delete user
      r.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${btn.dataset.nombre}"? Esta acción no se puede deshacer.`, {
            titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar'
          });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarUsuario(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${btn.dataset.nombre}" eliminado`, usuario.id);
            window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
            const nuevos = await window.adminRepository.listarUsuarios();
            this._datos.usuarios = nuevos.filter(x => x.id !== btn.dataset.id);
            this._seleccion.delete(btn.dataset.id);
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // View user detail (sidebar)
      const mostrarDetalle = async (userId) => {
        const u = usuarios.find(x => x.id === userId);
        if (!u) return;
        try {
          const act = await window.adminRepository.obtenerActividadUsuario(userId);
          const backdrop = document.createElement('div');
          backdrop.className = 'admin-user-detail__backdrop';
          const panel = document.createElement('div');
          panel.className = 'admin-user-detail';
          const inicial = (u.nombre_completo || u.username || '?').charAt(0).toUpperCase();
          panel.innerHTML = `
            <div class="admin-user-detail__header">
              <div class="admin-user-detail__avatar">${u.foto_perfil ? `<img src="${u.foto_perfil}" alt="">` : inicial}</div>
              <div class="admin-user-detail__info">
                <p class="admin-user-detail__nombre">${E(u.nombre_completo)}</p>
                <p class="admin-user-detail__meta">@${E(u.username)} · ${rolBonito(u.rol)}</p>
              </div>
              <button class="admin-user-detail__close" id="btnCerrarDetalle">${I('x')}</button>
            </div>
            <div class="admin-user-detail__section">
              <h4>Actividad</h4>
              <div class="o-grid-tarjetas" style="grid-template-columns:repeat(3,1fr);gap:var(--espaciado-xs)">
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${act.examenes || 0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Exámenes</p>
                </div>
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${act.lecturas || 0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Lecturas</p>
                </div>
                <div class="tarjeta-capitulo" style="padding:var(--espaciado-sm);text-align:center">
                  <p class="u-fw-700 u-texto-sm">${act.repasos || 0}</p>
                  <p class="u-fs-xs u-color-texto-terciario">Repasos</p>
                </div>
              </div>
            </div>
            <div class="admin-user-detail__section">
              <h4>Información</h4>
              <div class="perfil-fila"><span class="perfil-fila__label">ID</span><span class="perfil-fila__valor u-fs-xs">${u.id}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Rol</span><span class="perfil-fila__valor">${rolBonito(u.rol)}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Estado</span><span class="perfil-fila__valor">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Grupo</span><span class="perfil-fila__valor">${this._datos.grupos.find(g => g.id === u.grupo_id)?.nombre || 'Sin grupo'}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Creado</span><span class="perfil-fila__valor u-fs-xs">${u.creado_en ? new Date(u.creado_en).toLocaleDateString() : '—'}</span></div>
            </div>`;
          document.body.appendChild(backdrop);
          document.body.appendChild(panel);
          window.Iconos?.actualizar();
          const cerrar = () => { panel.remove(); backdrop.remove(); };
          panel.querySelector('#btnCerrarDetalle').onclick = cerrar;
          backdrop.onclick = cerrar;
        } catch { window.helpers.mostrarAlerta('Error al cargar detalle', 'error'); }
      };

      r.querySelectorAll('[data-ver-detalle]').forEach(el => {
        el.onclick = () => mostrarDetalle(el.dataset.verDetalle);
      });
      r.querySelectorAll('.btn-ver-detalle').forEach(btn => {
        btn.onclick = () => mostrarDetalle(btn.dataset.id);
      });
    },
    _bindGrupos(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { grupos, usuario } = this._datos;

      r.querySelector('#btnCrearGrupo')?.addEventListener('click', async () => {
        const nombre = r.querySelector('#nuevoGrupoNombre')?.value.trim();
        if (!nombre) return;
        try {
          await window.adminRepository.crearGrupo(nombre, usuario.id);
          await window.adminRepository.registrarAuditoria('grupo:crear', `Grupo "${nombre}"`, usuario.id);
          const nuevos = await window.adminRepository.listarGrupos();
          this._datos.grupos = nuevos;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar('¿Eliminar este grupo?', { titulo: 'Eliminar grupo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarGrupo(btn.dataset.id);
            const nuevos = await window.adminRepository.listarGrupos();
            this._datos.grupos = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-ver-grupo-admin').forEach(el => {
        el.onclick = async (e) => {
          if (e.target.closest('.btn-eliminar-grupo')) return;
          const gid = el.dataset.gid;
          const grupo = grupos.find(g => g.id === gid);
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
                  <h3>${E(grupo.nombre)}</h3>
                  <div class="perfil-fila"><span class="perfil-fila__label">Total miembros</span><span class="perfil-fila__valor">${(miembros || []).length}</span></div>
                  <div class="o-pila">
                    <h4>Administradores (${admins.length})</h4>${admins.length ? admins.map(a => `<div class="tarjeta-capitulo u-fs-sm">${E(a.nombre_completo || a.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Profesores (${editores.length})</h4>${editores.length ? editores.map(e => `<div class="tarjeta-capitulo u-fs-sm">${E(e.nombre_completo || e.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin profesores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Alumnos (${alumnos.length})</h4>${alumnos.length ? alumnos.map(a => `<div class="tarjeta-capitulo u-fs-sm">${E(a.nombre_completo || a.username)}</div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>'}
                  </div>
                </div>
                <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
              </div>`;
            document.body.appendChild(overlay);
            window.Iconos?.actualizar();
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.remove(); });
          } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
        };
      });
    }
  };
})();
