(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);

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
        this._filtroActual = 'todos';
        this._busqueda = '';
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      const { stats, auditoria, grupos, examenes, usuario } = this._datos;
      const auditFiltrada = filtrarAuditoria(auditoria, this._filtroActual);
      const auditBuscada = this._busqueda
        ? auditFiltrada.filter(a => {
            const texto = ((a.accion || '') + ' ' + (a.detalle || '') + ' ' + (a.perfiles?.nombre_completo || '')).toLowerCase();
            return texto.includes(this._busqueda.toLowerCase());
          })
        : auditFiltrada;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h2>${I('shield')} Panel de Propietario</h2>
            <button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button>
          </div>

          <!-- DASHBOARD -->
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-xl u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Grupos</p><p class="u-texto-xl u-fw-700">${grupos.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-xl u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos</p><p class="u-texto-xl u-fw-700">${stats.lecturas}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Tarjetas</p><p class="u-texto-xl u-fw-700">${stats.tarjetas}</p></div>
          </div>

          <!-- GRUPOS -->
          <div class="o-pila">
            <h3>${I('users')} Grupos (${grupos.length})</h3>
            <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
              ${grupos.map(g => `
                <div class="admin-grupo-card btn-ver-grupo" data-gid="${g.id}">
                  <p class="admin-grupo-card__nombre">${window.helpers.escapeHtml(g.nombre)}</p>
                  <div class="admin-grupo-card__stats">
                    <span class="admin-grupo-card__stat">${I('user')} Admin: ${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</span>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- EXÁMENES -->
          <div class="o-pila">
            <h3>${I('file-text')} Exámenes recientes (${examenes.length})</h3>
            <div class="o-pila">${examenes.slice(0, 20).map(ex => `
              <div class="tarjeta-capitulo">
                <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
                  <span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span>
                  <span class="u-fs-xs u-color-texto-terciario">${ex.estado} · ${ex.grupos?.nombre || ''} · ${window.helpers.formatearFecha(ex.creado_en)}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>

          <!-- AUDITORÍA -->
          <div class="o-pila">
            <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
              <h3>${I('clipboard-list')} Auditoría</h3>
              <span class="u-fs-xs u-color-texto-terciario">${auditBuscada.length} registros</span>
            </div>

            <!-- FILTROS -->
            <div class="o-flecha" style="gap:var(--espaciado-xxs);flex-wrap:wrap">
              <div class="owner-filtros">
                <button class="owner-filtros__btn ${this._filtroActual === 'todos' ? 'owner-filtros__btn--activo' : ''}" data-filtro="todos">Todos</button>
                <button class="owner-filtros__btn ${this._filtroActual === 'hoy' ? 'owner-filtros__btn--activo' : ''}" data-filtro="hoy">Hoy</button>
                <button class="owner-filtros__btn ${this._filtroActual === 'semana' ? 'owner-filtros__btn--activo' : ''}" data-filtro="semana">Esta semana</button>
                <button class="owner-filtros__btn ${this._filtroActual === 'mes' ? 'owner-filtros__btn--activo' : ''}" data-filtro="mes">Este mes</button>
              </div>
            </div>

            <!-- BÚSQUEDA -->
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${I('search')}</span>
              <input type="text" id="buscarAuditoria" placeholder="Buscar en auditoría..." value="${this._busqueda}">
            </div>

            <!-- LISTA -->
            <div class="o-pila" id="listaAuditoria" style="max-height:500px;overflow-y:auto">
              ${auditBuscada.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Sin registros para este filtro.</p>' : ''}
              ${auditBuscada.map(a => `
                <div class="owner-auditoria-item">
                  <div class="owner-auditoria-item__cabecera">
                    <span class="owner-auditoria-item__accion">${window.helpers.escapeHtml(a.accion)}</span>
                    <span class="owner-auditoria-item__tiempo">${tiempoRelativo(a.creado_en)}</span>
                  </div>
                  <p class="owner-auditoria-item__detalle">${window.helpers.escapeHtml(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p>
                </div>`).join('')}
            </div>
          </div>
        </div>`;

      this._bindEvents(raiz);
    },

    _bindEvents(raiz) {
      const { grupos, examenes } = this._datos;

      raiz.querySelectorAll('[data-filtro]').forEach(btn => {
        btn.onclick = () => {
          this._filtroActual = btn.dataset.filtro;
          this._renderizar(raiz);
        };
      });

      raiz.querySelector('#buscarAuditoria')?.addEventListener('input', (e) => {
        this._busqueda = e.target.value;
        const q = this._busqueda.toLowerCase();
        const auditFiltrada = filtrarAuditoria(this._datos.auditoria, this._filtroActual);
        const auditBuscada = q
          ? auditFiltrada.filter(a => {
              const texto = ((a.accion || '') + ' ' + (a.detalle || '') + ' ' + (a.perfiles?.nombre_completo || '')).toLowerCase();
              return texto.includes(q);
            })
          : auditFiltrada;
        const lista = raiz.querySelector('#listaAuditoria');
        if (!lista) return;
        if (auditBuscada.length === 0) {
          lista.innerHTML = '<p class="u-color-texto-terciario u-fs-sm">Sin registros para esta búsqueda.</p>';
          return;
        }
        lista.innerHTML = auditBuscada.map(a => `
          <div class="owner-auditoria-item">
            <div class="owner-auditoria-item__cabecera">
              <span class="owner-auditoria-item__accion">${window.helpers.escapeHtml(a.accion)}</span>
              <span class="owner-auditoria-item__tiempo">${tiempoRelativo(a.creado_en)}</span>
            </div>
            <p class="owner-auditoria-item__detalle">${window.helpers.escapeHtml(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p>
          </div>`).join('');
        const counter = raiz.querySelector('.owner-filtros')?.closest('.o-pila')?.querySelector('.u-fs-xs');
        if (counter) counter.textContent = auditBuscada.length + ' registros';
      });

      const gruposLocal = grupos;
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
            const exGrupo = examenes.filter(ex => ex.grupo_id === gid);
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
                  <div class="o-pila">
                    <h4>Exámenes (${exGrupo.length})</h4>
                    ${exGrupo.length ? exGrupo.map(ex => `<div class="tarjeta-capitulo u-fs-sm">${window.helpers.escapeHtml(ex.titulo)} <span class="u-color-texto-terciario">(${ex.estado})</span></div>`).join('') : '<p class="u-fs-sm u-color-texto-terciario">Sin exámenes</p>'}
                  </div>
                </div>
                <button class="btn-primario u-mt-2" id="btnCerrarDetalle" style="width:100%;justify-content:center">Cerrar</button>
              </div>`;
            document.body.appendChild(overlay);
            if (window.Iconos) window.Iconos.actualizar();
            overlay.querySelector('#btnCerrarDetalle').onclick = () => overlay.remove();
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    }
  };
})();
