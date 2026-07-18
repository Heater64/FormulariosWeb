(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  function rolBonito(rol) {
    const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
    return map[rol] || rol;
  }

  function tiempoRelativo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    return window.helpers.formatearFecha(iso);
  }

  function tiempoRelativoPreciso(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function filtrarAuditoria(auditoria, filtro) {
    const ahora = new Date();
    if (filtro === 'hoy') {
      const hoy = ahora.toISOString().slice(0, 10);
      return auditoria.filter(a => a.creado_en && a.creado_en.slice(0, 10) === hoy);
    }
    if (filtro === 'semana') {
      const hace7 = new Date(ahora.getTime() - 7 * 86400000);
      return auditoria.filter(a => a.creado_en && new Date(a.creado_en) >= hace7);
    }
    if (filtro === 'mes') {
      const hace30 = new Date(ahora.getTime() - 30 * 86400000);
      return auditoria.filter(a => a.creado_en && new Date(a.creado_en) >= hace30);
    }
    return auditoria;
  }

  const TABS = [
    { id: 'dashboard', icono: 'bar-chart-2', texto: 'Dashboard' },
    { id: 'grupos', icono: 'layout', texto: 'Grupos' },
    { id: 'auditoria', icono: 'clipboard-list', texto: 'Auditoría' },
    { id: 'salud', icono: 'heart', texto: 'Salud del sistema' },
    { id: 'config', icono: 'settings', texto: 'Configuración' }
  ];

  window.vistaOwner = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || usuario.rol !== 'owner') {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="router.navegar(\'/estudio\')">Volver</button></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel de propietario...</p></div>';
      try {
        const [stats, auditoria, grupos, examenes] = await Promise.all([
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes()
        ]);
        this._datos = { stats, auditoria, grupos, examenes, usuario };
        this._tabActivo = 'dashboard';
        this._filtroAuditoria = 'todos';
        this._busquedaAuditoria = '';
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      const { stats, auditoria, grupos, examenes, usuario } = this._datos;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I('shield')} Panel de Propietario</h2>
            <button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button>
          </div>
          <div class="admin-tabs">${TABS.map(t => `
            <button class="admin-tab${this._tabActivo === t.id ? ' admin-tab--activo' : ''}" data-tab="${t.id}">${I(t.icono)} ${t.texto}</button>`
          ).join('')}</div>
          <div id="ownerContenido">${this._renderTabContent(raiz)}</div>
        </div>`;
      this._bindTabs(raiz);
      this._bindTabContent(raiz);
    },
    _renderTabContent(raiz) {
      const { stats, auditoria, grupos, examenes, usuario } = this._datos;
      switch (this._tabActivo) {
        case 'dashboard': return this._renderDashboard(stats, grupos, examenes, auditoria);
        case 'grupos': return this._renderGrupos(grupos, examenes);
        case 'auditoria': return this._renderAuditoria(auditoria);
        case 'salud': return this._renderSalud(stats, grupos, examenes);
        case 'config': return this._renderConfig();
        default: return '';
      }
    },
    _renderDashboard(stats, grupos, examenes, auditoria) {
      const porRol = stats.porRol || {};
      const actHoy = filtrarAuditoria(auditoria, 'hoy').length;
      const actSemana = filtrarAuditoria(auditoria, 'semana').length;
      return `
        <div class="o-pila o-pila--lg">
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-xl u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Grupos</p><p class="u-texto-xl u-fw-700">${grupos.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-xl u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos</p><p class="u-texto-xl u-fw-700">${stats.lecturas}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Tarjetas</p><p class="u-texto-xl u-fw-700">${stats.tarjetas}</p></div>
          </div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Propietarios</p><p class="u-texto-lg u-fw-700">${porRol.owner || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Administradores</p><p class="u-texto-lg u-fw-700">${porRol.admin || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Profesores</p><p class="u-texto-lg u-fw-700">${porRol.editor || 0}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Alumnos</p><p class="u-texto-lg u-fw-700">${porRol.usuario || 0}</p></div>
          </div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Actividad hoy</p><p class="u-texto-xl u-fw-700">${actHoy}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Actividad esta semana</p><p class="u-texto-xl u-fw-700">${actSemana}</p></div>
          </div>
        </div>`;
    },
    _renderGrupos(grupos, examenes) {
      return `
        <div class="o-pila">
          <h3>${I('users')} Grupos (${grupos.length})</h3>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
            ${grupos.map(g => {
              const exCount = examenes.filter(ex => ex.grupo_id === g.id).length;
              return `
                <div class="admin-grupo-card btn-ver-grupo" data-gid="${g.id}">
                  <p class="admin-grupo-card__nombre">${E(g.nombre)}</p>
                  <div class="admin-grupo-card__stats">
                    <span class="admin-grupo-card__stat">${I('user')} Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</span>
                    <span class="admin-grupo-card__stat">${I('file-text')} ${exCount} examen${exCount !== 1 ? 'es' : ''}</span>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    },
    _renderAuditoria(auditoria) {
      const auditFiltrada = filtrarAuditoria(auditoria, this._filtroAuditoria);
      const auditBuscada = this._busquedaAuditoria
        ? auditFiltrada.filter(a => {
            const texto = ((a.accion || '') + ' ' + (a.detalle || '') + ' ' + (a.perfiles?.nombre_completo || '')).toLowerCase();
            return texto.includes(this._busquedaAuditoria.toLowerCase());
          })
        : auditFiltrada;
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3>${I('clipboard-list')} Auditoría</h3>
            <span class="u-fs-xs u-color-texto-terciario">${auditBuscada.length} registros</span>
          </div>
          <div class="owner-filtros">
            <button class="owner-filtros__btn ${this._filtroAuditoria === 'todos' ? 'owner-filtros__btn--activo' : ''}" data-filtro="todos">Todos</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria === 'hoy' ? 'owner-filtros__btn--activo' : ''}" data-filtro="hoy">Hoy</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria === 'semana' ? 'owner-filtros__btn--activo' : ''}" data-filtro="semana">Esta semana</button>
            <button class="owner-filtros__btn ${this._filtroAuditoria === 'mes' ? 'owner-filtros__btn--activo' : ''}" data-filtro="mes">Este mes</button>
            <button class="btn-secundario u-fs-xs" id="btnExportAuditoria" style="margin-left:auto">${I('download')} Exportar</button>
          </div>
          <div class="admin-buscar">
            <span class="admin-buscar__icono">${I('search')}</span>
            <input type="text" id="buscarAuditoria" placeholder="Buscar en auditoría..." value="${E(this._busquedaAuditoria)}">
          </div>
          <div class="o-pila" id="listaAuditoria" style="max-height:500px;overflow-y:auto">
            ${auditBuscada.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Sin registros para este filtro.</p>' : ''}
            ${auditBuscada.map(a => `
              <div class="owner-auditoria-item">
                <div class="owner-auditoria-item__cabecera">
                  <span class="owner-auditoria-item__accion">${E(a.accion)}</span>
                  <span class="owner-auditoria-item__tiempo" title="${tiempoRelativoPreciso(a.creado_en)}">${tiempoRelativo(a.creado_en)}</span>
                </div>
                <p class="owner-auditoria-item__detalle">${E(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p>
              </div>`).join('')}
          </div>
        </div>`;
    },
    _renderSalud(stats, grupos, examenes) {
      const sinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id)).length;
      return `
        <div class="o-pila">
          <h3>${I('heart')} Salud del sistema</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mb-2">Indicadores de estado general del sistema</p>
          <div class="owner-health-grid">
            <div class="owner-health-card">
              <span class="owner-health-card__label">Grupos sin exámenes</span>
              <div class="owner-health-card__status">
                <span class="owner-health-card__dot ${sinExamenes > 0 ? 'owner-health-card__dot--warn' : 'owner-health-card__dot--ok'}"></span>
                ${sinExamenes} grupo${sinExamenes !== 1 ? 's' : ''}
              </div>
            </div>
            <div class="owner-health-card">
              <span class="owner-health-card__label">Total usuarios</span>
              <div class="owner-health-card__status">
                <span class="owner-health-card__dot--ok"></span>
                ${stats.usuarios}
              </div>
            </div>
            <div class="owner-health-card">
              <span class="owner-health-card__label">Total exámenes</span>
              <div class="owner-health-card__status">
                <span class="owner-health-card__dot--ok"></span>
                ${stats.examenes}
              </div>
            </div>
          </div>
        </div>`;
    },
    _renderConfig() {
      return `
        <div class="o-pila">
          <h3>${I('settings')} Configuración global</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mb-2">Ajustes generales del sistema. Los cambios se aplican inmediatamente.</p>
          <div class="o-pila" id="configLista">
            <div class="admin-setting-row">
              <div>
                <div class="admin-setting-row__label">${I('download')} Exportar datos</div>
                <div class="admin-setting-row__desc">Descargar listado completo de usuarios en formato CSV</div>
              </div>
              <button class="btn-secundario u-fs-xs" id="btnExportCSV">${I('download')} Exportar CSV</button>
            </div>
            <div class="admin-setting-row">
              <div>
                <div class="admin-setting-row__label">${I('trash-2')} Limpiar auditoría</div>
                <div class="admin-setting-row__desc">Eliminar registros de auditoría con más de 90 días</div>
              </div>
              <button class="btn-secundario u-fs-xs" id="btnLimpiarAuditoria" style="color:var(--color-error)">Limpiar</button>
            </div>
            <div class="admin-setting-row">
              <div>
                <div class="admin-setting-row__label">${I('info')} Información del sistema</div>
                <div class="admin-setting-row__desc">Versión de la aplicación y estado de la base de datos</div>
              </div>
              <div class="u-fs-xs u-color-texto-terciario">v1.0 · Supabase</div>
            </div>
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
      this._bindAuditoria(raiz);
      this._bindGrupos(raiz);
      this._bindConfig(raiz);
    },
    _bindAuditoria(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      const { auditoria } = this._datos;

      r.querySelectorAll('[data-filtro]').forEach(btn => {
        btn.onclick = () => {
          this._filtroAuditoria = btn.dataset.filtro;
          this._renderizar(raiz);
        };
      });

      r.querySelector('#buscarAuditoria')?.addEventListener('input', (e) => {
        this._busquedaAuditoria = e.target.value;
        const q = this._busquedaAuditoria.toLowerCase();
        const filtrada = filtrarAuditoria(auditoria, this._filtroAuditoria);
        const buscada = q ? filtrada.filter(a => {
          const texto = ((a.accion || '') + ' ' + (a.detalle || '') + ' ' + (a.perfiles?.nombre_completo || '')).toLowerCase();
          return texto.includes(q);
        }) : filtrada;
        const lista = r.querySelector('#listaAuditoria');
        if (!lista) return;
        if (buscada.length === 0) { lista.innerHTML = '<p class="u-color-texto-terciario u-fs-sm">Sin registros para esta búsqueda.</p>'; return; }
        lista.innerHTML = buscada.map(a => `
          <div class="owner-auditoria-item">
            <div class="owner-auditoria-item__cabecera">
              <span class="owner-auditoria-item__accion">${E(a.accion)}</span>
              <span class="owner-auditoria-item__tiempo" title="${tiempoRelativoPreciso(a.creado_en)}">${tiempoRelativo(a.creado_en)}</span>
            </div>
            <p class="owner-auditoria-item__detalle">${E(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p>
          </div>`).join('');
        const counter = r.querySelector('.owner-filtros')?.parentElement?.querySelector('.u-fs-xs');
        if (counter) counter.textContent = buscada.length + ' registros';
      });

      r.querySelector('#btnExportAuditoria')?.addEventListener('click', () => {
        const q = this._busquedaAuditoria.toLowerCase();
        const filtrada = filtrarAuditoria(auditoria, this._filtroAuditoria);
        const items = q ? filtrada.filter(a => {
          const texto = ((a.accion || '') + ' ' + (a.detalle || '') + ' ' + (a.perfiles?.nombre_completo || '')).toLowerCase();
          return texto.includes(q);
        }) : filtrada;
        const cabeceras = 'Acción,Detalle,Actor,Fecha';
        const filas = items.map(a =>
          `"${a.accion || ''}","${(a.detalle || '').replace(/"/g, '""')}","${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}","${a.creado_en || ''}"`
        );
        const csv = cabeceras + '\n' + filas.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'auditoria.csv'; a.click();
        URL.revokeObjectURL(url);
      });
    },
    _bindGrupos(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      const { grupos } = this._datos;

      r.querySelectorAll('.btn-ver-grupo').forEach(el => {
        el.onclick = async () => {
          const gid = el.dataset.gid;
          const grupo = grupos.find(g => g.id === gid);
          if (!grupo) return;
          try {
            const { data: miembros } = await window.supabaseClient.from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', gid).order('nombre_completo');
            const admins = (miembros || []).filter(m => m.rol === 'admin');
            const editores = (miembros || []).filter(m => m.rol === 'editor');
            const alumnos = (miembros || []).filter(m => m.rol === 'usuario');
            const examenes = this._datos.examenes.filter(ex => ex.grupo_id === gid);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
              <div class="modal">
                <div class="o-pila" style="gap:var(--espaciado-md)">
                  <h3>${E(grupo.nombre)}</h3>
                  <div class="perfil-fila"><span class="perfil-fila__label">Total miembros</span><span class="perfil-fila__valor">${(miembros || []).length}</span></div>
                  <div class="o-pila">
                    <h4>Administradores (${admins.length})</h4>${admins.length ? admins.map(a => `
                      <div class="tarjeta-capitulo u-fs-sm o-flecha o-flecha--between" style="gap:var(--espaciado-xs)">
                        <span>${E(a.nombre_completo || a.username)}</span>
                        <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${a.id}">${I('edit-3')}</button>
                      </div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin administradores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Profesores (${editores.length})</h4>${editores.length ? editores.map(e => `
                      <div class="tarjeta-capitulo u-fs-sm o-flecha o-flecha--between" style="gap:var(--espaciado-xs)">
                        <span>${E(e.nombre_completo || e.username)}</span>
                        <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${e.id}">${I('edit-3')}</button>
                      </div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin profesores</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Alumnos (${alumnos.length})</h4>${alumnos.length ? alumnos.map(a => `
                      <div class="tarjeta-capitulo u-fs-sm o-flecha o-flecha--between" style="gap:var(--espaciado-xs)">
                        <span>${E(a.nombre_completo || a.username)}</span>
                        <button class="btn-secundario u-fs-xs btn-editar-usuario" data-id="${a.id}">${I('edit-3')}</button>
                      </div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin alumnos</p>'}
                  </div>
                  <div class="o-pila">
                    <h4>Exámenes (${examenes.length})</h4>${examenes.length ? examenes.map(ex => `<div class="tarjeta-capitulo u-fs-sm">${E(ex.titulo)} <span class="u-color-texto-terciario">(${ex.estado})</span></div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin exámenes</p>'}
                  </div>
                </div>
                <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
              </div>`;
            document.body.appendChild(overlay);
            window.Iconos?.actualizar();
            
            // Bind edit buttons in modal
            overlay.querySelectorAll('.btn-editar-usuario').forEach(btn => {
              btn.onclick = async () => {
                const uid = btn.dataset.id;
                // Fetch full user details first as we only have basic info from select
                const { data: u } = await window.supabaseClient.from('perfiles').select('*').eq('id', uid).single();
                if (!u) return;

                window.ProfileEditor.abrir(u, {
                  onGuardar: async (datos) => {
                    try {
                      await window.adminRepository.actualizarUsuario(u.id, {
                        nombre_completo: datos.nombre_completo.trim(),
                        username: datos.username.trim(),
                        password: datos.password || null
                      });
                      await window.adminRepository.registrarAuditoria('usuario:editar', `Usuario "${datos.nombre_completo}" editado`, this._datos.usuario.id);
                      window.helpers.mostrarAlerta('Usuario actualizado.', 'exito');
                      // Re-render modal list or close modal
                    } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
                  },
                  onEliminar: async () => {
                      const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${u.nombre_completo}"?`, { titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar' });
                      if (!ok) return;
                      try {
                        await window.adminRepository.eliminarUsuario(u.id);
                        await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${u.nombre_completo}" eliminado`, this._datos.usuario.id);
                        window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
                      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
                  }
                });
              };
            });
            
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    },
    _bindConfig(raiz) {
      const r = raiz.querySelector('#ownerContenido');
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

      r.querySelector('#btnLimpiarAuditoria')?.addEventListener('click', async () => {
        const ok = await window.helpers.confirmar('¿Eliminar registros de auditoría con más de 90 días?', { titulo: 'Limpiar auditoría', textoConfirmar: 'Limpiar' });
        if (!ok) return;
        try {
          const hace90 = new Date(Date.now() - 90 * 86400000).toISOString();
          await window.supabaseClient.from('auditoria').delete().lt('creado_en', hace90);
          await window.adminRepository.registrarAuditoria('config:limpiar', 'Auditoría antigua limpiada', this._datos.usuario.id);
          window.helpers.mostrarAlerta('Auditoría limpiada.', 'exito');
          const nueva = await window.adminRepository.obtenerAuditoria();
          this._datos.auditoria = nueva;
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });
    }
  };
})();
