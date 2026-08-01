(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

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

  function iconoAuditoria(accion) {
    const a = String(accion || '');
    if (a.startsWith('usuario')) return 'user';
    if (a.startsWith('grupo')) return 'layout';
    if (a.startsWith('batch')) return 'check-square';
    if (a.startsWith('config')) return 'settings';
    return 'clipboard-list';
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
    { id: 'sugerencias', icono: 'message-square', texto: 'Sugerencias' },
    { id: 'salud', icono: 'heart', texto: 'Salud del sistema' },
    { id: 'config', icono: 'settings', texto: 'Configuración' }
  ];

  window.vistaOwner = {
    _volver() {
      // En la página standalone no hay rutas registradas: usar hook si existe, si no router.
      window.adminComunes.volver(this);
    },
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || usuario.rol !== 'owner') {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="window.vistaOwner._volver()">Volver</button></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel de propietario...</p></div>';
      try {
        const [stats, auditoria, grupos, examenes, sugerencias] = await Promise.all([
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes(),
          window.sugerenciasRepository ? window.sugerenciasRepository.listarTodas() : Promise.resolve([])
        ]);
        this._datos = { stats, auditoria, grupos, examenes, sugerencias, usuario };
        this._tabActivo = 'dashboard';
        this._filtroAuditoria = 'todos';
        this._busquedaAuditoria = '';
        this._filtroSugerencias = 'todas';
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      window.adminComunes.renderizarPanel(this, raiz, {
        titulo: 'Panel de Propietario',
        icono: 'shield',
        contenedorId: 'ownerContenido',
        tabs: TABS,
        nombreVista: 'vistaOwner'
      });
    },
    _renderTabContent(raiz) {
      const { stats, auditoria, grupos, examenes, usuario } = this._datos;
      switch (this._tabActivo) {
        case 'dashboard': return this._renderDashboard(stats, grupos, examenes, auditoria);
        case 'grupos': return this._renderGrupos(grupos, examenes);
        case 'auditoria': return this._renderAuditoria(auditoria);
        case 'sugerencias': return this._renderSugerencias();
        case 'salud': return this._renderSalud(stats, grupos, examenes);
        case 'config': return this._renderConfig();
        default: return '';
      }
    },
    _renderDashboard(stats, grupos, examenes, auditoria) {
      const porRol = stats.porRol || {};
      const actHoy = filtrarAuditoria(auditoria, 'hoy').length;
      const actSemana = filtrarAuditoria(auditoria, 'semana').length;
      const statCard = (icono, valor, etiqueta) => `
        <div class="tarjeta-estadistica">
          <div class="tarjeta-estadistica__icono">${I(icono)}</div>
          <div class="tarjeta-estadistica__info">
            <p class="tarjeta-estadistica__valor">${valor}</p>
            <p class="tarjeta-estadistica__etiqueta">${etiqueta}</p>
          </div>
        </div>`;
      return `
        <div class="o-pila o-pila--lg">
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
            ${statCard('users', stats.usuarios, 'Usuarios')}
            ${statCard('layout', grupos.length, 'Grupos')}
            ${statCard('file-text', stats.examenes, 'Exámenes')}
            ${statCard('book-open', stats.lecturas, 'Capítulos')}
            ${statCard('brain', stats.tarjetas, 'Tarjetas')}
          </div>
          <h3 class="u-texto-sm u-color-texto-secundario">${I('users')} Usuarios por rol</h3>
          <div class="o-grid-tarjetas o-grid-tarjetas--estadisticas">
            ${statCard('crown', porRol.owner || 0, 'Propietarios')}
            ${statCard('shield', porRol.admin || 0, 'Administradores')}
            ${statCard('book-open', porRol.editor || 0, 'Profesores')}
            ${statCard('user', porRol.usuario || 0, 'Alumnos')}
          </div>
          <h3 class="u-texto-sm u-color-texto-secundario">${I('activity')} Actividad</h3>
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
          <div class="admin-tabla-wrapper">
            <table class="admin-tabla">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Administrador</th>
                  <th>Exámenes</th>
                </tr>
              </thead>
              <tbody>
                ${grupos.length === 0 ? '<tr><td colspan="3" class="u-color-texto-terciario u-fs-sm">Sin grupos.</td></tr>' : grupos.map(g => {
                  const exCount = examenes.filter(ex => ex.grupo_id === g.id).length;
                  return `
                <tr class="btn-ver-grupo" data-gid="${g.id}" style="cursor:pointer" title="Ver miembros de ${E(g.nombre)}">
                  <td class="admin-tabla__nombre">${E(g.nombre)}</td>
                  <td class="u-fs-xs">${g.perfiles?.nombre_completo || g.perfiles?.username || 'N/A'}</td>
                  <td class="u-fs-xs u-color-texto-terciario">${exCount} examen${exCount !== 1 ? 'es' : ''}</td>
                </tr>`;
                }).join('')}
              </tbody>
            </table>
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
            <span class="u-fs-xs u-color-texto-terciario" id="contadorAuditoria">${auditBuscada.length} registros</span>
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
          <div class="admin-tabla-wrapper" style="max-height:500px;overflow-y:auto">
            <table class="admin-tabla">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Detalle</th>
                  <th>Actor</th>
                  <th>Cuándo</th>
                </tr>
              </thead>
              <tbody id="listaAuditoria">
                ${auditBuscada.length === 0 ? '<tr><td colspan="4" class="u-color-texto-terciario u-fs-sm">Sin registros para este filtro.</td></tr>' : ''}
                ${auditBuscada.map(a => `
                <tr>
                  <td><span class="admin-tabla__accion">${I(iconoAuditoria(a.accion))} ${E(a.accion)}</span></td>
                  <td class="u-fs-xs">${E(a.detalle)}</td>
                  <td class="u-fs-xs u-color-texto-terciario">${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</td>
                  <td class="u-fs-xs u-color-texto-terciario" title="${tiempoRelativoPreciso(a.creado_en)}" style="white-space:nowrap">${tiempoRelativo(a.creado_en)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    },
    _renderSugerencias() {
      const sugerencias = this._datos.sugerencias || [];
      const porEstado = { enviada: 0, en_revision: 0, aceptada: 0, implementada: 0, rechazada: 0 };
      sugerencias.forEach(s => { if (porEstado[s.estado] !== undefined) porEstado[s.estado]++; });
      const filtradas = this._filtroSugerencias === 'todas'
        ? sugerencias
        : sugerencias.filter(s => s.estado === this._filtroSugerencias);
      const filtros = [
        ['todas', 'Todas'], ['enviada', 'Enviadas'], ['en_revision', 'En revisión'],
        ['aceptada', 'Aceptadas'], ['implementada', 'Implementadas'], ['rechazada', 'Rechazadas']
      ];
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3>${I('message-square')} Sugerencias (${sugerencias.length})</h3>
          </div>
          <div class="owner-sug-resumen">
            ${Object.entries(porEstado).map(([k, v]) => {
              const est = window.sugerenciasRepository ? window.sugerenciasRepository.estadoInfo(k) : { texto: k, clase: '' };
              return `<div class="owner-sug-resumen__card owner-sug-resumen__card--${k}"><div class="owner-sug-resumen__valor">${v}</div><div class="owner-sug-resumen__etiqueta">${est.texto}</div></div>`;
            }).join('')}
          </div>
          <div class="owner-filtros">
            ${filtros.map(f => `<button class="owner-filtros__btn ${this._filtroSugerencias === f[0] ? 'owner-filtros__btn--activo' : ''}" data-sug-filtro="${f[0]}">${f[1]}</button>`).join('')}
          </div>
          <div class="admin-tabla-wrapper">
            <table class="admin-tabla">
              <thead>
                <tr>
                  <th>Autor</th>
                  <th>Categoría</th>
                  <th>Sugerencia</th>
                  <th>Estado</th>
                  <th style="width:56px"></th>
                </tr>
              </thead>
              <tbody id="listaSugerenciasOwner">
                ${filtradas.length === 0 ? '<tr><td colspan="5" class="u-color-texto-terciario u-fs-sm">Sin sugerencias para este filtro.</td></tr>' : ''}
                ${filtradas.map(s => this._filaSugerenciaOwner(s)).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    },

    _filaSugerenciaOwner(s) {
      const repo = window.sugerenciasRepository;
      const est = repo ? repo.estadoInfo(s.estado) : { texto: s.estado, clase: '' };
      const cat = repo ? (repo.CATEGORIAS.find(c => c.valor === s.categoria) || repo.CATEGORIAS[repo.CATEGORIAS.length - 1]) : { texto: s.categoria };
      const opciones = repo ? repo.ESTADOS.map(e => `<option value="${e.valor}" ${e.valor === s.estado ? 'selected' : ''}>${e.texto}</option>`).join('') : '';
      const texto = (s.texto || '');
      const resumen = texto.length > 90 ? texto.slice(0, 90) + '…' : texto;
      return `
        <tr class="admin-tabla-sug-fila" data-sug="${s.id}" data-sug-fila="${s.id}" style="cursor:pointer" title="Gestionar sugerencia">
          <td>
            <span class="admin-tabla__nombre">${E(s.perfiles?.nombre_completo || s.perfiles?.username || 'Usuario')}</span><br>
            <span class="admin-tabla__meta">${window.helpers.formatearFecha(s.creado_en)}</span>
          </td>
          <td class="u-fs-xs">${cat.texto}</td>
          <td class="u-fs-xs" style="max-width:280px">${E(resumen)}</td>
          <td><span class="sug-estado ${est.clase}">${est.texto}</span></td>
          <td><button type="button" class="admin-tabla__expandir" data-sug-toggle="${s.id}" aria-expanded="false" aria-label="Gestionar sugerencia" title="Gestionar sugerencia">${I('chevron-down')}</button></td>
        </tr>
        <tr class="admin-tabla-detalle" data-sug-detalle="${s.id}" hidden>
          <td colspan="5">
            <div class="o-pila" style="gap:var(--espaciado-xs)">
              <p class="owner-sug-card__texto">${E(texto)}</p>
              <textarea class="owner-sug-card__respuesta" data-sug-respuesta="${s.id}" placeholder="Respuesta para el usuario (opcional)">${E(s.respuesta || '')}</textarea>
              <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
                <select data-sug-estado="${s.id}">${opciones}</select>
                <button class="btn-primario u-fs-xs btn-guardar-sug" data-id="${s.id}">${I('check')} Guardar</button>
                <button class="btn-peligro u-fs-xs btn-eliminar-sug" data-id="${s.id}" title="Eliminar sugerencia">${I('trash-2')}</button>
              </div>
            </div>
          </td>
        </tr>`;
    },

    _renderSalud(stats, grupos, examenes) {
      const sinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id)).length;
      const fila = (label, dotClase, valor) => `
        <tr>
          <td class="admin-tabla__nombre">${label}</td>
          <td><span class="admin-tabla-salud"><span class="admin-tabla-salud__dot ${dotClase}"></span>${valor}</span></td>
        </tr>`;
      return `
        <div class="o-pila">
          <h3>${I('heart')} Salud del sistema</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mb-2">Indicadores de estado general del sistema</p>
          <div class="admin-tabla-wrapper">
            <table class="admin-tabla admin-tabla--auto">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${fila('Grupos sin exámenes', sinExamenes > 0 ? 'admin-tabla-salud__dot--warn' : 'admin-tabla-salud__dot--ok', `${sinExamenes} grupo${sinExamenes !== 1 ? 's' : ''}`)}
                ${fila('Total usuarios', 'admin-tabla-salud__dot--ok', stats.usuarios)}
                ${fila('Total exámenes', 'admin-tabla-salud__dot--ok', stats.examenes)}
              </tbody>
            </table>
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
      window.adminComunes.bindTabs(this, raiz);
    },
    _bindTabContent(raiz) {
      this._bindAuditoria(raiz);
      this._bindGrupos(raiz);
      this._bindSugerencias(raiz);
      this._bindConfig(raiz);
    },
    _bindAuditoria(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      const { auditoria } = this._datos;

      window.adminComunes.bindFiltros(r, '[data-filtro]', (btn) => {
        this._filtroAuditoria = btn.dataset.filtro;
        this._renderizar(raiz);
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
        if (buscada.length === 0) { lista.innerHTML = '<tr><td colspan="4" class="u-color-texto-terciario u-fs-sm">Sin registros para esta búsqueda.</td></tr>'; return; }
        lista.innerHTML = buscada.map(a => `
          <tr>
            <td><span class="admin-tabla__accion">${I(iconoAuditoria(a.accion))} ${E(a.accion)}</span></td>
            <td class="u-fs-xs">${E(a.detalle)}</td>
            <td class="u-fs-xs u-color-texto-terciario">${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</td>
            <td class="u-fs-xs u-color-texto-terciario" title="${tiempoRelativoPreciso(a.creado_en)}" style="white-space:nowrap">${tiempoRelativo(a.creado_en)}</td>
          </tr>`).join('');
        const counter = r.querySelector('#contadorAuditoria');
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
        window.adminComunes.descargarCSVTexto('auditoria.csv', csv);
      });
    },
    _bindGrupos(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      const { grupos } = this._datos;

      r.querySelectorAll('.btn-ver-grupo').forEach(el => {
        el.onclick = async () => {
          const grupo = grupos.find(g => g.id === el.dataset.gid);
          if (!grupo) return;
          const examenes = this._datos.examenes.filter(ex => ex.grupo_id === grupo.id);
          await window.adminComunes.abrirModalGrupo(grupo, {
            examenes,
            mostrarExamenes: true,
            onEditarUsuario: async (uid) => {
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
                  } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
                },
                onEliminar: async () => {
                  const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${u.nombre_completo}"?`, { titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar' });
                  if (!ok) return;
                  try {
                    await window.adminRepository.eliminarUsuario(u.id, this._datos.usuario.id);
                    await window.adminRepository.registrarAuditoria('usuario:eliminar', `Usuario "${u.nombre_completo}" eliminado`, this._datos.usuario.id);
                    window.helpers.mostrarAlerta('Usuario eliminado.', 'exito');
                  } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
                }
              });
            }
          });
        };
      });
    },
    _bindSugerencias(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      if (!window.sugerenciasRepository) return;

      window.adminComunes.bindFiltros(r, '[data-sug-filtro]', (btn) => {
        this._filtroSugerencias = btn.dataset.sugFiltro;
        this._renderizar(raiz);
      });

      // Expandir/plegar la fila de detalle de cada sugerencia
      const alternarSug = (id) => {
        const fila = r.querySelector(`[data-sug-fila="${id}"]`);
        const detalle = r.querySelector(`[data-sug-detalle="${id}"]`);
        const toggle = r.querySelector(`[data-sug-toggle="${id}"]`);
        if (!fila || !detalle) return;
        const abierto = !detalle.hidden;
        detalle.hidden = abierto;
        fila.classList.toggle('admin-tabla-fila--expandida', !abierto);
        if (toggle) {
          toggle.classList.toggle('admin-tabla__expandir--abierto', !abierto);
          toggle.setAttribute('aria-expanded', String(!abierto));
        }
      };
      r.querySelectorAll('[data-sug-toggle]').forEach(el => {
        el.addEventListener('click', (e) => { e.stopPropagation(); alternarSug(el.dataset.sugToggle); });
      });
      r.querySelectorAll('[data-sug-fila]').forEach(fila => {
        fila.addEventListener('click', (e) => {
          if (e.target.closest('[data-sug-toggle]')) return;
          alternarSug(fila.dataset.sugFila);
        });
      });

      r.querySelectorAll('.btn-guardar-sug').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const estado = r.querySelector(`[data-sug-estado="${id}"]`)?.value;
          const respuesta = r.querySelector(`[data-sug-respuesta="${id}"]`)?.value || '';
          try {
            await window.sugerenciasRepository.actualizar(id, { estado, respuesta });
            window.helpers.mostrarAlerta('Sugerencia actualizada.', 'exito');
            const nuevas = await window.sugerenciasRepository.listarTodas();
            this._datos.sugerencias = nuevas;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-eliminar-sug').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Eliminar esta sugerencia? Esta acción no se puede deshacer.', { titulo: 'Eliminar sugerencia', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.sugerenciasRepository.eliminar(btn.dataset.id);
            window.helpers.mostrarAlerta('Sugerencia eliminada.', 'exito');
            const nuevas = await window.sugerenciasRepository.listarTodas();
            this._datos.sugerencias = nuevas;
            this._renderizar(raiz);
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
          window.adminComunes.descargarCSVTexto('usuarios.csv', csv);
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
