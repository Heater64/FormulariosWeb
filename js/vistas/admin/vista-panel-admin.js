(function() {
  'use strict';
  window.vistaPanelAdmin = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'owner'].includes(usuario.rol)) {
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
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
          <div class="o-flecha o-flecha--between"><h2>⚙️ Administración</h2><button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button></div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(4,1fr)">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-lg u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Grupos</p><p class="u-texto-lg u-fw-700">${grupos.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-lg u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Lecturas</p><p class="u-texto-lg u-fw-700">${stats.lecturas}</p></div>
          </div>
          <div class="o-pila" id="adminSecciones">
            <div class="seccion-admin">
              <h3>👥 Usuarios (${usuarios.length})</h3>
              <div class="o-pila">${usuarios.map(u => `<div class="tarjeta-capitulo" style="border-left:3px solid ${u.activo ? 'var(--color-exito)' : 'var(--color-error)'}"><div class="o-flecha o-flecha--between"><div><span class="u-fw-600">${window.helpers.escapeHtml(u.nombre_completo)}</span><span class="u-fs-xs u-color-texto-secundario"> @${u.username} · ${u.rol}</span></div><div class="o-flecha" style="gap:4px">${u.rol !== 'owner' ? `<button class="btn-toggle-activo" data-id="${u.id}" data-activo="${!u.activo}" style="font-size:var(--texto-xs);background:none;border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px">${u.activo ? '🔴 Desactivar' : '🟢 Activar'}</button>` : ''}</div></div><div class="o-flecha u-mt-1" style="gap:var(--espaciado-xs);flex-wrap:wrap">${['usuario','editor','admin'].filter(r => r !== u.rol).map(r => `<button class="btn-cambiar-rol" data-id="${u.id}" data-rol="${r}" style="font-size:var(--texto-xs);background:var(--color-fondo);border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;padding:2px 6px">Hacer ${r}</button>`).join('')}</div></div>`).join('')}</div>
            </div>
            <div class="seccion-admin u-mt-3">
              <h3>👥 Grupos (${grupos.length})</h3>
              <div class="o-flecha u-mb-2" style="gap:var(--espaciado-sm)"><input type="text" id="nuevoGrupoNombre" placeholder="Nombre del grupo"><button class="btn-primario" id="btnCrearGrupo">Crear</button></div>
              <div class="o-pila">${grupos.map(g => `<div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(g.nombre)}</span><button class="btn-eliminar-grupo" data-id="${g.id}" style="background:none;border:none;color:var(--color-error);cursor:pointer">✕ Eliminar</button></div><p class="u-fs-xs u-color-texto-terciario">Admin: ${g.perfiles?.nombre_completo || 'N/A'}</p></div>`).join('')}</div>
            </div>
            <div class="seccion-admin u-mt-3">
              <h3>📝 Exámenes (${examenes.length})</h3>
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
    }
  };
})();
