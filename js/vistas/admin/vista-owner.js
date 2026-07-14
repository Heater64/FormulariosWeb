(function() {
  'use strict';
  window.vistaOwner = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || usuario.rol !== 'owner') {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="router.navegar(\'/estudio\')">Volver</button></div>'; return;
      }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel de propietario...</p></div>';
      try {
        const [stats, auditoria, grupos, examenes] = await Promise.all([
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes()
        ]);
        this._renderizar(raiz, { stats, auditoria, grupos, examenes, usuario });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, { stats, auditoria, grupos, examenes, usuario }) {
      const I = window.Iconos.render;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)"><h2>${I('building-2')} Panel de Propietario</h2><button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button></div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-xl u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-xl u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos</p><p class="u-texto-xl u-fw-700">${stats.lecturas}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Tarjetas</p><p class="u-texto-xl u-fw-700">${stats.tarjetas}</p></div>
          </div>
          <div class="o-pila"><h3>${I('users')} Grupos (${grupos.length})</h3>
            <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
              ${grupos.map(g => `<div class="tarjeta-capitulo btn-ver-grupo" data-gid="${g.id}" style="cursor:pointer"><span class="u-fw-600">${window.helpers.escapeHtml(g.nombre)}</span><p class="u-fs-xs u-color-texto-terciario">Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</p></div>`).join('')}
            </div>
          </div>
          <div class="o-pila"><h3>${I('file-text')} Todos los exámenes (${examenes.length})</h3>
            <div class="o-pila">${examenes.slice(0,20).map(ex => `<div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)"><span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span><span class="u-fs-xs">${ex.estado} · ${ex.grupos?.nombre || ''} · ${window.helpers.formatearFecha(ex.creado_en)}</span></div></div>`).join('')}</div>
          </div>
          <div class="o-pila"><h3>${I('clipboard-list')} Auditoría (últimas ${auditoria.length})</h3>
            <div style="max-height:400px;overflow-y:auto" class="o-pila">${auditoria.map(a => `<div class="tarjeta-capitulo" style="border-left:3px solid var(--color-acento)"><div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)"><span class="u-fs-sm u-fw-600">${a.accion}</span><span class="u-fs-xs u-color-texto-terciario">${window.helpers.formatearFecha(a.creado_en)}</span></div><p class="u-fs-xs u-color-texto-secundario">${window.helpers.escapeHtml(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p></div>`).join('')}</div>
          </div>
        </div>`;
      const gruposLocal = grupos, examenesLocal = examenes;
      raiz.querySelectorAll('.btn-ver-grupo').forEach(el => {
        el.onclick = async () => {
          const gid = el.dataset.gid;
          const grupo = gruposLocal.find(g => g.id === gid);
          if (!grupo) return;
          try {
            const { data: miembros } = await window.supabaseClient.from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', gid).order('nombre_completo');
            const admins = (miembros || []).filter(m => m.rol === 'admin');
            const editores = (miembros || []).filter(m => m.rol === 'editor');
            const alumnos = (miembros || []).filter(m => m.rol === 'usuario');
            const exGrupo = examenesLocal.filter(ex => ex.grupo_id === gid);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = '<div class="modal"><div class="o-pila"><h3>' + window.helpers.escapeHtml(grupo.nombre) + '</h3><div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Total miembros</span><p class="u-texto-xl u-fw-700">' + (miembros || []).length + '</p></div><div class="o-pila"><h4>Administradores (' + admins.length + ')</h4>' + (admins.length ? admins.map(a => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(a.nombre_completo || a.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>') + '</div><div class="o-pila"><h4>Editores (' + editores.length + ')</h4>' + (editores.length ? editores.map(e => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(e.nombre_completo || e.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin editores</p>') + '</div><div class="o-pila"><h4>Alumnos (' + alumnos.length + ')</h4>' + (alumnos.length ? alumnos.map(a => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(a.nombre_completo || a.username) + '</div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>') + '</div><div class="o-pila"><h4>Exámenes (' + exGrupo.length + ')</h4>' + (exGrupo.length ? exGrupo.map(ex => '<div class="tarjeta-capitulo u-fs-sm">' + window.helpers.escapeHtml(ex.titulo) + ' <span class="u-color-texto-terciario">(' + ex.estado + ')</span></div>').join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin exámenes</p>') + '</div></div><button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button></div>';
            document.body.appendChild(overlay);
            window.Iconos.actualizar();
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    }
  };
})();
