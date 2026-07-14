(function() {
  'use strict';
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
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel...</p></div>';
      try {
        const [usuarios, grupos, examenes, stats] = await Promise.all([
          window.adminRepository.listarUsuarios(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes(),
          window.adminRepository.statsGenerales()
        ]);
        this._renderizar(raiz, { usuarios, grupos, examenes, stats, usuario });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, { usuarios, grupos, examenes, stats, usuario }) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between"><h2>${window.Iconos.render('settings')} Administración</h2><button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button></div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-xl u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Grupos</p><p class="u-texto-xl u-fw-700">${grupos.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-xl u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos leídos</p><p class="u-texto-xl u-fw-700">${stats.lecturas}</p></div>
          </div>
          <div class="o-pila" id="adminSecciones">
            <div class="seccion-admin">
              <div class="o-flecha o-flecha--between">
                <h3>${window.Iconos.render('users')} Usuarios (${usuarios.length})</h3>
                <button class="btn-primario u-fs-xs" id="btnCrearUsuario">+ Crear usuario</button>
              </div>
               <div class="o-pila">${usuarios.map(u => `<div class="tarjeta-capitulo" style="border-left:3px solid ${u.activo ? 'var(--color-exito)' : 'var(--color-error)'}"><div class="o-flecha o-flecha--between"><div><span class="u-fw-600">${window.helpers.escapeHtml(u.nombre_completo)}</span><span class="u-fs-xs u-color-texto-secundario"> @${u.username} · ${u.rol}</span></div><div class="o-flecha" style="gap:4px">${window.vistaPanelAdmin._puedeEditar(usuario, u) ? `<button class="btn-editar-usuario" data-id="${u.id}" data-nombre="${window.helpers.escapeHtml(u.nombre_completo)}" style="font-size:var(--texto-xs);background:none;border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px;display:inline-flex;align-items:center;gap:4px">${window.Iconos.render('edit-3')} Editar</button>` : ''}${window.vistaPanelAdmin._puedeEliminar(usuario, u) ? `<button class="btn-eliminar-usuario" data-id="${u.id}" data-nombre="${window.helpers.escapeHtml(u.nombre_completo)}" style="font-size:var(--texto-xs);background:none;border:1px solid var(--color-error);color:var(--color-error);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px;display:inline-flex;align-items:center;gap:4px">${window.Iconos.render('trash-2')} Eliminar</button>` : ''}</div></div><div class="o-flecha u-mt-1" style="gap:var(--espaciado-xs);flex-wrap:wrap">${['usuario','editor','admin'].filter(r => r !== u.rol && window.vistaPanelAdmin._rangoRol(r) <= window.vistaPanelAdmin._rangoRol(usuario.rol)).map(r => `<button class="btn-cambiar-rol" data-id="${u.id}" data-rol="${r}" style="font-size:var(--texto-xs);background:var(--color-fondo);border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px">Hacer ${r}</button>`).join('')}</div></div>`).join('')}</div>
            </div>
            <div class="seccion-admin u-mt-3">
              <h3>${window.Iconos.render('users')} Grupos (${grupos.length})</h3>
              <div class="o-flecha u-mb-2" style="gap:var(--espaciado-sm);flex-wrap:wrap"><input type="text" id="nuevoGrupoNombre" placeholder="Nombre del grupo" style="min-width:160px;flex:1"><button class="btn-primario" id="btnCrearGrupo">Crear</button></div>
              <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${grupos.map(g => `<div class="tarjeta-capitulo btn-ver-grupo-admin" data-gid="${g.id}" style="cursor:pointer"><div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(g.nombre)}</span><button class="btn-eliminar-grupo" data-id="${g.id}" style="background:none;border:none;color:var(--color-error);cursor:pointer;display:inline-flex;font-size:var(--texto-xs)">${window.Iconos.render('x')}</button></div><p class="u-fs-xs u-color-texto-terciario">Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</p></div>`).join('')}</div>
            </div>
            <div class="seccion-admin u-mt-3">
              <h3>${window.Iconos.render('file-text')} Exámenes (${examenes.length})</h3>
              <div class="o-pila">${examenes.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Sin exámenes</p>' : examenes.slice(0,10).map(ex => `<div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span><span class="u-fs-xs u-color-texto-terciario">${ex.estado} · ${ex.grupos?.nombre || ''}</span></div></div>`).join('')}
              </div>
            </div>
          </div>
        </div>`;
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
          mensaje: 'El nombre de usuario debe ser único. La contraseña se guarda tal cual.',
          campos: [
            { nombre: 'nombre_completo', etiqueta: 'Nombre completo', requerido: true },
            { nombre: 'username', etiqueta: 'Nombre de usuario (único)', requerido: true, placeholder: 'ej: ana.2024' },
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
        } catch (e) { window.helpers.mostrarAlerta('Error al crear el usuario: ' + e.message, 'error'); }
      });
      raiz.querySelectorAll('.btn-toggle-activo').forEach(btn => {
        btn.onclick = async () => {
          await window.adminRepository.toggleActivo(btn.dataset.id, btn.dataset.activo === 'true');
          router.navegar('/admin');
        };
      });
      raiz.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.onclick = async () => {
          if (confirm(`¿Cambiar rol a ${btn.dataset.rol}?`)) {
            await window.adminRepository.cambiarRol(btn.dataset.id, btn.dataset.rol);
            router.navegar('/admin');
          }
        };
      });
      raiz.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('¿Eliminar este grupo?')) {
            await window.adminRepository.eliminarGrupo(btn.dataset.id);
            router.navegar('/admin');
          }
        };
      });
      raiz.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${btn.dataset.nombre}"? Esta acción no se puede deshacer.`, {
            titulo: 'Eliminar usuario',
            textoConfirmar: 'Eliminar',
            textoCancelar: 'Cancelar'
          });
          if (!ok) return;
          if (!this._puedeEliminar(usuario, { id: btn.dataset.id, rol: (usuarios.find(x => x.id === btn.dataset.id) || {}).rol })) {
            window.helpers.mostrarAlerta('No tienes permiso para eliminar a un usuario de rango superior o igual al tuyo.', 'error');
            return;
          }
          try {
            await window.adminRepository.eliminarUsuario(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${btn.dataset.nombre}"`, usuario.id);
            window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
            router.navegar('/admin');
          } catch (e) { window.helpers.mostrarAlerta('Error al eliminar el usuario: ' + e.message, 'error'); }
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
            overlay.innerHTML = '<div class="modal"><div class="o-pila"><h3>' + window.helpers.escapeHtml(grupo.nombre) + '</h3><div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Total miembros</span><p class="u-texto-xl u-fw-700">' + (miembros || []).length + '</p></div><div class="o-pila"><h4>Administradores (' + admins.length + ')</h4>' + (admins.length ? admins.map(a => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(a.nombre_completo || a.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>') + '</div><div class="o-pila"><h4>Editores (' + editores.length + ')</h4>' + (editores.length ? editores.map(e => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(e.nombre_completo || e.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin editores</p>') + '</div><div class="o-pila"><h4>Alumnos (' + alumnos.length + ')</h4>' + (alumnos.length ? alumnos.map(a => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(a.nombre_completo || a.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>') + '</div></div><button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button></div>';
            document.body.appendChild(overlay);
            window.Iconos.actualizar();
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.remove(); });
          } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
        };
      });
      raiz.querySelectorAll('.btn-editar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          if (!this._puedeEditar(usuario, u)) {
            window.helpers.mostrarAlerta('No tienes permiso para editar a un usuario de rango superior al tuyo.', 'error');
            return;
          }
          const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
          const datos = await window.helpers.formulario({
            titulo: 'Editar usuario',
            mensaje: 'La contraseña se muestra en texto claro. Déjala como está para no cambiarla.',
            campos: [
              { nombre: 'nombre_completo', etiqueta: 'Nombre completo', valor: u.nombre_completo || '', requerido: true },
              { nombre: 'username', etiqueta: 'Nombre de usuario (único)', valor: u.username || '', requerido: true },
              { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: u.rol, opciones: this._opcionesRolPermitidas(usuario) },
              { nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: u.grupo_id || '', opciones: opcionesGrupo },
              { nombre: 'password', etiqueta: 'Contraseña (visible)', valor: u.password || '' }
            ],
            textoConfirmar: 'Guardar'
          });
          if (!datos) return;
          if (!datos.username.trim()) { window.helpers.mostrarAlerta('El nombre de usuario es obligatorio.', 'advertencia'); return; }
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
          } catch (e) { window.helpers.mostrarAlerta('Error al actualizar el usuario: ' + e.message, 'error'); }
        };
      });
    }
  };
})();
