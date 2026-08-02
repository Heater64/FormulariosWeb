(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  const TR = (iso) => window.adminComunes.tiempoRelativo(iso);
  const TRP = (iso) => window.adminComunes.tiempoRelativoPreciso(iso);

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
    { id: 'centro', icono: 'command', texto: 'Centro de Administración' },
    { id: 'grupos', icono: 'layout', texto: 'Grupos' },
    { id: 'auditoria', icono: 'clipboard-list', texto: 'Auditoría' },
    { id: 'sugerencias', icono: 'message-square', texto: 'Sugerencias' },
    { id: 'salud', icono: 'heart', texto: 'Salud del sistema' },
    { id: 'config', icono: 'settings', texto: 'Configuración' },
    { id: 'sistema', icono: 'database', texto: 'Sistema' }
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
      this._inicioSesion = Date.now();
      try {
        const [stats, auditoria, grupos, examenes, usuarios, sugerencias, resumenExamenes, backups, config] = await Promise.all([
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes(),
          window.adminRepository.listarUsuarios(),
          window.sugerenciasRepository ? window.sugerenciasRepository.listarTodas() : Promise.resolve([]),
          window.adminRepository.obtenerResumenExamenes(),
          window.adminRepository.listarBackups(),
          window.adminRepository.listarConfiguracion()
        ]);
        this._datos = { stats, auditoria, grupos, examenes, usuarios, sugerencias, resumenExamenes, backups, config, usuario };
        this._tabActivo = 'centro';
        this._filtroAuditoria = 'todos';
        this._busquedaAuditoria = '';
        this._filtroSugerencias = 'todas';
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      window.adminComunes.renderizarPanel(this, raiz, {
        titulo: 'Panel de Propietario',
        subtitulo: 'Control total de la plataforma, incluidas herramientas de sistema.',
        contenedorId: 'ownerContenido',
        tabs: TABS,
        nombreVista: 'vistaOwner'
      });
    },
    _renderTabContent(raiz) {
      const { stats, auditoria, grupos, examenes, usuario } = this._datos;
      switch (this._tabActivo) {
        case 'centro': return this._renderCentro();
        case 'grupos': return this._renderGrupos(grupos, examenes);
        case 'auditoria': return this._renderAuditoria(auditoria);
        case 'sugerencias': return this._renderSugerencias();
        case 'salud': return this._renderSalud(stats, grupos, examenes);
        case 'config': return this._renderConfig();
        case 'sistema': return this._renderSistema();
        default: return '';
      }
    },

    // ==================================================================
    // CENTRO DE ADMINISTRACIÓN
    // ==================================================================
    _renderCentro() {
      const { usuarios, grupos, examenes, stats, auditoria, backups, usuario } = this._datos;
      const { porRol } = stats;
      const resumenEx = this._datos.resumenExamenes || {};

      const inactivos = usuarios.filter(u => u.activo === false);
      const profesoresSinGrupo = usuarios.filter(u => u.rol === 'editor' && !u.grupo_id);
      const alumnosSinGrupo = usuarios.filter(u => u.rol === 'usuario' && !u.grupo_id);
      const sinPublicar = examenes.filter(e => e.estado !== 'publicado');
      const gruposSinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id));

      const alertas = [];
      if (inactivos.length) alertas.push({ tipo: 'aviso', icono: 'user-x', titulo: `${inactivos.length} usuario${inactivos.length !== 1 ? 's' : ''} pendiente${inactivos.length !== 1 ? 's' : ''} de activar`, meta: 'Usuarios sin acceso a la plataforma', accion: { tab: 'usuarios', rol: 'todos', grupo: 'todos', estado: 'inactivos' } });
      if (profesoresSinGrupo.length) alertas.push({ tipo: 'info', icono: 'book-open', titulo: `${profesoresSinGrupo.length} profesor${profesoresSinGrupo.length !== 1 ? 'es' : ''} sin grupo`, meta: 'Sin asignación a una clase', accion: { tab: 'usuarios', rol: 'editor', grupo: 'sin-grupo', estado: 'todos' } });
      if (sinPublicar.length) alertas.push({ tipo: 'info', icono: 'file-text', titulo: `${sinPublicar.length} examen${sinPublicar.length !== 1 ? 'es' : ''} sin publicar`, meta: 'Quedaron en borrador', accion: { tab: 'examenes', estado: 'borrador' } });
      if (gruposSinExamenes.length) alertas.push({ tipo: 'info', icono: 'layout', titulo: `${gruposSinExamenes.length} grupo${gruposSinExamenes.length !== 1 ? 's' : ''} sin exámenes`, meta: 'Clases aún sin evaluaciones', accion: { tab: 'grupos' } });
      if (alumnosSinGrupo.length) alertas.push({ tipo: 'aviso', icono: 'user', titulo: `${alumnosSinGrupo.length} alumno${alumnosSinGrupo.length !== 1 ? 's' : ''} sin grupo`, meta: 'Sin asignación a una clase', accion: { tab: 'usuarios', rol: 'usuario', grupo: 'sin-grupo', estado: 'todos' } });

      const alertasHtml = alertas.length === 0
        ? `<button class="admin-alerta admin-alerta--ok" disabled><span class="admin-alerta__icono">${I('check')}</span><span class="admin-alerta__texto"><p class="admin-alerta__titulo">Todo funciona correctamente.</p><p class="admin-alerta__meta">No hay nada que requiera tu atención</p></span></button>`
        : alertas.map(a => `
            <button class="admin-alerta admin-alerta--${a.tipo}" data-alerta-accion="${encodeURIComponent(JSON.stringify(a.accion))}">
              <span class="admin-alerta__icono">${I(a.icono)}</span>
              <span class="admin-alerta__texto">
                <p class="admin-alerta__titulo">${E(a.titulo)}</p>
                <p class="admin-alerta__meta">${E(a.meta)}</p>
              </span>
              <span class="admin-alerta__flecha">${I('chevron-right')}</span>
            </button>`).join('');

      const acciones = [
        { id: 'crear-usuario', icono: 'user-plus', texto: 'Crear usuario' },
        { id: 'crear-profesor', icono: 'book-open', texto: 'Crear profesor' },
        { id: 'crear-alumno', icono: 'graduation-cap', texto: 'Crear alumno' },
        { id: 'crear-admin', icono: 'shield', texto: 'Crear admin' },
        { id: 'crear-grupo', icono: 'layout', texto: 'Crear grupo' },
        { id: 'crear-examen', icono: 'file-text', texto: 'Crear examen' },
        { id: 'importar-csv', icono: 'upload', texto: 'Importar CSV' },
        { id: 'exportar', icono: 'download', texto: 'Exportar datos' },
        { id: 'backup', icono: 'database-backup', texto: 'Backup' },
        { id: 'sistema', icono: 'database', texto: 'Sistema' },
        { id: 'config', icono: 'settings', texto: 'Configuración' }
      ];
      const accionesHtml = `
        <div class="admin-acciones">
          ${acciones.map(a => `<button class="admin-accion" data-accion="${a.id}">
            <span class="admin-accion__icono">${I(a.icono)}</span>
            <span class="admin-accion__texto">${a.texto}</span>
          </button>`).join('')}
        </div>`;

      const recientes = (auditoria || []).slice(0, 6);
      const actividadHtml = recientes.length === 0
        ? window.adminComunes.vacio('activity', 'Sin actividad todavía', 'Los cambios aparecerán aquí cuando ocurran.')
        : `<div class="admin-timeline">${recientes.map(a => {
            const clase = a.accion?.startsWith('usuario') ? '--acento' : a.accion?.startsWith('config') ? '--aviso' : '--exito';
            return `
            <div class="admin-timeline__item">
              <span class="admin-timeline__icono ${clase}">${I(window.adminComunes.iconoAuditoria(a.accion))}</span>
              <div class="admin-timeline__cuerpo">
                <p class="admin-timeline__texto">${E(a.detalle || a.accion)}</p>
                <p class="admin-timeline__tiempo">${TR(a.creado_en)} · ${E(a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema')}</p>
              </div>
            </div>`;
          }).join('')}</div>`;

      const ultimoBackup = (backups || [])[0];
      const modoMant = this._datos.config['modo_mantenimiento'] === '1';
      const sistemaHtml = `
        <div class="admin-sistema">
          ${window.adminComunes.sistemaFila('server', 'Servidor', 'Operativo', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('database', 'Base de datos', 'Conectada', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('cloud', 'Supabase', 'En línea', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('lock', 'Autenticación', 'Activa', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('database-backup', 'Último backup', ultimoBackup ? TR(ultimoBackup.creado_en) : 'Nunca', ultimoBackup ? 'admin-indicador--ok' : 'admin-indicador--aviso', ultimoBackup ? TRP(ultimoBackup.creado_en) : '')}
          ${window.adminComunes.sistemaFila('tag', 'Versión', '1.0.1', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('timer', 'Tiempo activo', this._tiempoActivo(), 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('wrench', 'Modo mantenimiento', modoMant ? 'Activo' : 'Desactivado', modoMant ? 'admin-indicador--aviso' : 'admin-indicador--ok')}
        </div>`;

      const pendientes = [];
      if (alumnosSinGrupo.length) pendientes.push({ icono: 'user', titulo: `${alumnosSinGrupo.length} alumno${alumnosSinGrupo.length !== 1 ? 's' : ''} sin grupo`, meta: 'Asigna una clase para que puedan ver sus exámenes', accion: { tab: 'usuarios', rol: 'usuario', grupo: 'sin-grupo', estado: 'todos' } });
      if (inactivos.length) pendientes.push({ icono: 'user-x', titulo: `${inactivos.length} usuario${inactivos.length !== 1 ? 's' : ''} pendiente${inactivos.length !== 1 ? 's' : ''} de activar`, meta: 'Actívalos para que puedan acceder', accion: { tab: 'usuarios', rol: 'todos', grupo: 'todos', estado: 'inactivos' } });
      if (sinPublicar.length) pendientes.push({ icono: 'file-text', titulo: `${sinPublicar.length} examen${sinPublicar.length !== 1 ? 'es' : ''} sin publicar`, meta: 'Publícalos para que los alumnos los vean', accion: { tab: 'examenes', estado: 'borrador' } });
      if (profesoresSinGrupo.length) pendientes.push({ icono: 'book-open', titulo: `${profesoresSinGrupo.length} profesor${profesoresSinGrupo.length !== 1 ? 'es' : ''} sin permisos`, meta: 'Asigna un grupo para que pueda crear exámenes', accion: { tab: 'usuarios', rol: 'editor', grupo: 'sin-grupo', estado: 'todos' } });
      const pendientesHtml = pendientes.length === 0
        ? window.adminComunes.vacio('check-circle', 'Nada pendiente', 'No hay tareas que resolver.')
        : `<div class="admin-pendiente">${pendientes.map(p => `
            <div class="admin-pendiente__item">
              <span class="admin-pendiente__icono">${I(p.icono)}</span>
              <div class="admin-pendiente__info">
                <p class="admin-pendiente__titulo">${E(p.titulo)}</p>
                <p class="admin-pendiente__meta">${E(p.meta)}</p>
              </div>
              <button class="btn-secundario u-fs-xs admin-pendiente__btn" data-pendiente="${encodeURIComponent(JSON.stringify(p.accion))}">${I('check')} Resolver</button>
            </div>`).join('')}</div>`;

      const accesos = [
        { icono: 'users', texto: 'Usuarios', ruta: null, tab: 'usuarios' },
        { icono: 'layout', texto: 'Grupos', ruta: null, tab: 'grupos' },
        { icono: 'file-text', texto: 'Exámenes', ruta: null, tab: 'examenes' },
        { icono: 'clipboard-check', texto: 'Calificaciones', ruta: '/calificaciones' },
        { icono: 'brain', texto: 'Memoria', ruta: '/memorizacion' },
        { icono: 'file-text', texto: 'Notas', ruta: '/notas' },
        { icono: 'settings', texto: 'Configuración', ruta: null, tab: 'config' },
        { icono: 'shield', texto: 'Permisos', ruta: null, tab: 'sistema' }
      ];
      const accesosHtml = `
        <div class="admin-accesos">
          ${accesos.map(a => `<button class="admin-acceso" ${a.tab ? `data-acceso-tab="${a.tab}"` : `data-acceso-ruta="${a.ruta}"`}>
            <span class="admin-acceso__icono">${I(a.icono)}</span>
            <span>${a.texto}</span>
          </button>`).join('')}
        </div>`;

      const mediaGlobal = this._mediaGlobal();
      const totalPendientesEx = Object.values(resumenEx).reduce((a, r) => a + (r.pendientes || 0), 0);
      const resumenHtml = `
        <div class="admin-resumen">
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('user-check')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${usuarios.filter(u => u.activo !== false).length}</p><p class="tarjeta-estadistica__etiqueta">Activos</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('user-x')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${inactivos.length}</p><p class="tarjeta-estadistica__etiqueta">Bloqueados</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('book-open')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${porRol.editor || 0}</p><p class="tarjeta-estadistica__etiqueta">Profesores</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('graduation-cap')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${porRol.usuario || 0}</p><p class="tarjeta-estadistica__etiqueta">Alumnos</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('layout')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${grupos.length}</p><p class="tarjeta-estadistica__etiqueta">Grupos</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('check-circle')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${examenes.filter(e => e.estado === 'publicado').length}</p><p class="tarjeta-estadistica__etiqueta">Publicados</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('edit-3')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${examenes.filter(e => e.estado === 'borrador').length}</p><p class="tarjeta-estadistica__etiqueta">Borradores</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('clipboard-check')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${mediaGlobal !== null ? mediaGlobal.toFixed(1) : '—'}</p><p class="tarjeta-estadistica__etiqueta">Nota media</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('clock')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${totalPendientesEx}</p><p class="tarjeta-estadistica__etiqueta">Por corregir</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('book-open')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${stats.lecturas}</p><p class="tarjeta-estadistica__etiqueta">Cap. leídos</p></div></div>
          <div class="tarjeta-estadistica"><div class="tarjeta-estadistica__icono">${I('brain')}</div><div class="tarjeta-estadistica__info"><p class="tarjeta-estadistica__valor">${stats.tarjetas}</p><p class="tarjeta-estadistica__etiqueta">Tarjetas</p></div></div>
        </div>`;

      return `
        <div class="admin-centro o-pila o-pila--lg">
          <div class="o-pila o-pila--lg">
            ${window.adminComunes.seccion({ icono: 'alert-triangle', iconoClase: alertas.length ? 'admin-seccion__icono--aviso' : 'admin-seccion__icono--exito', titulo: 'Alertas', desc: 'Solo lo que requiere atención', contador: alertas.length ? String(alertas.length) : '', contenido: alertasHtml })}
            ${window.adminComunes.seccion({ icono: 'zap', iconoClase: 'admin-seccion__icono--acento', titulo: 'Acciones rápidas', desc: 'Las tareas más comunes a un clic', contenido: accionesHtml })}
            ${window.adminComunes.seccion({ icono: 'activity', titulo: 'Actividad reciente', desc: 'Últimos cambios en la plataforma', contenido: actividadHtml })}
          </div>
          <div class="o-pila o-pila--lg">
            ${window.adminComunes.seccion({ icono: 'server', iconoClase: 'admin-seccion__icono--exito', titulo: 'Estado del sistema', desc: 'Indicadores generales', contenido: sistemaHtml })}
            ${window.adminComunes.seccion({ icono: 'list-todo', iconoClase: 'admin-seccion__icono--aviso', titulo: 'Gestión pendiente', desc: 'Acciones necesarias', contenido: pendientesHtml })}
            ${window.adminComunes.seccion({ icono: 'navigation', titulo: 'Accesos rápidos', desc: 'Navega a cualquier sección', contenido: accesosHtml })}
          </div>
          ${window.adminComunes.seccion({ icono: 'bar-chart-2', titulo: 'Resumen general', desc: 'Estadísticas útiles de tu centro', anchoCompleto: true, contenido: resumenHtml })}
        </div>`;
    },

    _tiempoActivo() { return window.adminComunes.tiempoActivo(this._inicioSesion); },

    _mediaGlobal() { return window.adminComunes.mediaGlobal(this._datos.resumenExamenes); },

    // ==================================================================
    // GRUPOS — tarjetas
    // ==================================================================
    _renderGrupos(grupos, examenes) {
      const { usuarios } = this._datos;
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${I('layout')} Grupos (${grupos.length})</h3>
            <button class="btn-primario u-fs-xs" id="btnCrearGrupo">${I('plus')} Crear grupo</button>
          </div>
          <div class="admin-grid-tarjetas">
            ${grupos.length === 0 ? window.adminComunes.vacio('layout', 'Sin grupos', 'Crea el primer grupo para organizar a tus usuarios.') : grupos.map(g => this._renderGrupoCard(g, examenes, usuarios)).join('')}
          </div>
        </div>`;
    },

    _renderGrupoCard(g, examenes, usuarios) {
      const miembros = usuarios.filter(u => u.grupo_id === g.id);
      const alumnos = miembros.filter(m => m.rol === 'usuario').length;
      const profesores = miembros.filter(m => m.rol === 'editor').length;
      const exGrupo = (examenes || []).filter(ex => ex.grupo_id === g.id);
      const exPublicados = exGrupo.filter(ex => ex.estado === 'publicado').length;
      return `
        <article class="admin-grupo-card" data-gid="${g.id}">
          <div class="admin-grupo-card__cabecera">
            <span class="admin-grupo-card__icono">${I('layout')}</span>
            <div class="admin-grupo-card__info">
              <p class="admin-grupo-card__nombre">${E(g.nombre)}</p>
              <p class="admin-grupo-card__admin">${I('user')} ${E(g.perfiles?.nombre_completo || g.perfiles?.username || 'Sin admin')}</p>
            </div>
          </div>
          <div class="admin-grupo-card__stats">
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${alumnos}</p><p class="admin-grupo-card__stat-etiqueta">Alumnos</p></div>
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${profesores}</p><p class="admin-grupo-card__stat-etiqueta">Profesores</p></div>
            <div class="admin-grupo-card__stat"><p class="admin-grupo-card__stat-valor">${exPublicados}</p><p class="admin-grupo-card__stat-etiqueta">Publicados</p></div>
          </div>
          <p class="admin-grupo-card__actividad">${I('activity')} ${exGrupo.length} examen${exGrupo.length !== 1 ? 'es' : ''} en total · creado ${TR(g.creado_en)}</p>
          <div class="admin-grupo-card__acciones">
            <button class="btn-icono btn-gestionar-grupo" data-gid="${g.id}" title="Gestionar miembros" aria-label="Gestionar miembros de ${E(g.nombre)}">${I('users')}</button>
            <button class="btn-icono btn-ver-examenes-grupo" data-gid="${g.id}" title="Ver exámenes" aria-label="Ver exámenes de ${E(g.nombre)}">${I('file-text')}</button>
            <button class="btn-icono btn-icono--peligro btn-eliminar-grupo" data-id="${g.id}" title="Eliminar grupo" aria-label="Eliminar grupo ${E(g.nombre)}">${I('trash-2')}</button>
            <button class="admin-grupo-card__ver btn-ver-grupo" data-gid="${g.id}">${I('eye')} Ver miembros</button>
          </div>
        </article>`;
    },

    // ==================================================================
    // AUDITORÍA — items modernos
    // ==================================================================
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
            <h3 style="margin:0">${I('clipboard-list')} Auditoría</h3>
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
          ${auditBuscada.length === 0
            ? window.adminComunes.vacio('clipboard-list', 'Sin registros', 'No hay auditoría para este filtro.')
            : `<div class="owner-auditoria" id="listaAuditoria">
                ${auditBuscada.map(a => this._itemAuditoria(a)).join('')}
              </div>`}
        </div>`;
    },

    _itemAuditoria(a) {
      return `
        <article class="owner-auditoria-item" data-audit-id="${a.id}">
          <span class="owner-auditoria-item__icono">${I(window.adminComunes.iconoAuditoria(a.accion))}</span>
          <div class="owner-auditoria-item__cuerpo">
            <p class="owner-auditoria-item__accion">${E(a.accion)}</p>
            <p class="owner-auditoria-item__detalle">${E(a.detalle)}</p>
            <p class="owner-auditoria-item__meta">${I('user')} ${E(a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema')} · ${TR(a.creado_en)} <span title="${TRP(a.creado_en)}">(${TRP(a.creado_en)})</span></p>
          </div>
        </article>`;
    },

    // ==================================================================
    // SUGERENCIAS (se mantiene)
    // ==================================================================
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
          <h3 style="margin:0">${I('message-square')} Sugerencias (${sugerencias.length})</h3>
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

    // ==================================================================
    // SALUD DEL SISTEMA
    // ==================================================================
    _renderSalud(stats, grupos, examenes) {
      const sinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id)).length;
      const fila = (label, dotClase, valor) => `
        <tr>
          <td class="admin-tabla__nombre">${label}</td>
          <td><span class="admin-tabla-salud"><span class="admin-tabla-salud__dot ${dotClase}"></span>${valor}</span></td>
        </tr>`;
      return `
        <div class="o-pila">
          <h3 style="margin:0">${I('heart')} Salud del sistema</h3>
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

    // ==================================================================
    // CONFIGURACIÓN
    // ==================================================================
    _renderConfig() {
      return `
        <div class="o-pila">
          <h3 style="margin:0">${I('settings')} Configuración global</h3>
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

    // ==================================================================
    // SISTEMA — herramientas exclusivas del Owner
    // ==================================================================
    _renderSistema() {
      const { backups } = this._datos;
      const modoMant = this._datos.config['modo_mantenimiento'] === '1';
      const backupItems = (backups || []).slice(0, 8);
      return `
        <div class="owner-sistema">
          <h3 style="margin:0">${I('database')} Sistema</h3>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-top:-12px">Herramientas exclusivas del propietario.</p>

          ${window.adminComunes.seccion({
            icono: 'cloud', iconoClase: 'admin-seccion__icono--exito', titulo: 'Estado de Supabase', desc: 'Infraestructura en tiempo real',
            contenido: `
              <div class="admin-sistema">
                ${window.adminComunes.sistemaFila('server', 'Servidor', 'Operativo', 'admin-indicador--ok')}
                ${window.adminComunes.sistemaFila('database', 'Base de datos', 'Conectada', 'admin-indicador--ok')}
                ${window.adminComunes.sistemaFila('lock', 'Autenticación', 'Activa', 'admin-indicador--ok')}
                ${window.adminComunes.sistemaFila('tag', 'Versión', '1.0.1', 'admin-indicador--ok')}
                ${window.adminComunes.sistemaFila('hard-drive', 'Variables del sistema', 'v1.0.1 · Supabase', 'admin-indicador--ok')}
              </div>` })}

          ${window.adminComunes.seccion({
            icono: 'database-backup', titulo: 'Copias de seguridad', desc: 'Snapshots completos de la base de datos',
            contenido: `
              <div class="o-pila" style="gap:var(--espaciado-sm)">
                <div class="owner-sistema__grid">
                  <button class="owner-tool" data-herramienta="backup-crear">
                    <span class="owner-tool__icono">${I('database-backup')}</span>
                    <span class="owner-tool__info"><span class="owner-tool__titulo">Crear backup</span><span class="owner-tool__desc">Snapshot completo ahora</span></span>
                    <span class="owner-tool__flecha">${I('chevron-right')}</span>
                  </button>
                  <button class="owner-tool owner-tool--peligro" data-herramienta="backup-restaurar">
                    <span class="owner-tool__icono">${I('rotate-ccw')}</span>
                    <span class="owner-tool__info"><span class="owner-tool__titulo">Restaurar copia</span><span class="owner-tool__desc">Recuperar desde un backup</span></span>
                    <span class="owner-tool__flecha">${I('chevron-right')}</span>
                  </button>
                </div>
                ${backupItems.length ? `<div class="o-pila" style="gap:var(--espaciado-xs)">
                  ${backupItems.map(b => `
                    <div class="admin-backup-item" data-backup-id="${b.id}">
                      <span class="admin-backup-item__icono">${I('database-backup')}</span>
                      <div class="admin-backup-item__info">
                        <p class="admin-backup-item__nombre">${E(b.nombre)}</p>
                        <p class="admin-backup-item__meta">${Math.round((b.tamano_bytes || 0) / 1024)} KB · ${TR(b.creado_en)}</p>
                      </div>
                      <button class="btn-icono btn-restaurar-backup" data-id="${b.id}" title="Restaurar" aria-label="Restaurar ${E(b.nombre)}">${I('rotate-ccw')}</button>
                      <button class="btn-icono btn-icono--peligro btn-eliminar-backup" data-id="${b.id}" title="Eliminar" aria-label="Eliminar ${E(b.nombre)}">${I('trash-2')}</button>
                    </div>`).join('')}
                </div>` : `<div class="admin-panel-aviso">${I('info')} Aún no hay copias de seguridad. Crea la primera con "Crear backup".</div>`}
              </div>` })}

          ${window.adminComunes.seccion({
            icono: 'settings', titulo: 'Configuración global y mantenimiento', desc: 'Opciones de plataforma',
            contenido: `
              <div class="o-pila" style="gap:var(--espaciado-sm)">
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${I('wrench')} Modo mantenimiento</div>
                    <div class="admin-setting-row__desc">Bloquea temporalmente los accesos mientras trabajas en la plataforma</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnModoMantenimiento" data-activo="${modoMant ? '1' : '0'}" style="${modoMant ? 'color:var(--color-aviso)' : ''}">${modoMant ? 'Desactivar' : 'Activar'}</button>
                </div>
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${I('shield')} Permisos</div>
                    <div class="admin-setting-row__desc">Jerarquía de roles: Propietario → Administrador → Profesor → Alumno</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnVerPermisos">${I('shield')} Ver jerarquía</button>
                </div>
                <div class="admin-setting-row">
                  <div>
                    <div class="admin-setting-row__label">${I('database')} Base de datos</div>
                    <div class="admin-setting-row__desc">Acciones sobre datos de producción</div>
                  </div>
                  <button class="btn-secundario u-fs-xs" id="btnExportarJSON">${I('download')} Exportar JSON</button>
                </div>
              </div>` })}

          ${window.adminComunes.seccion({
            icono: 'trash-2', iconoClase: 'admin-seccion__icono--error', titulo: 'Zona de limpieza', desc: 'Acciones destructivas, requieren confirmación',
            contenido: `
              <div class="owner-sistema__grid">
                <button class="owner-tool owner-tool--peligro" data-herramienta="limpiar-auditoria">
                  <span class="owner-tool__icono">${I('trash-2')}</span>
                  <span class="owner-tool__info"><span class="owner-tool__titulo">Limpiar auditoría vieja</span><span class="owner-tool__desc">Registros con más de 90 días</span></span>
                </button>
                <button class="owner-tool owner-tool--peligro" data-herramienta="limpiar-sugerencias">
                  <span class="owner-tool__icono">${I('message-square')}</span>
                  <span class="owner-tool__info"><span class="owner-tool__titulo">Sugerencias rechazadas</span><span class="owner-tool__desc">Elimina las sugerencias rechazadas</span></span>
                </button>
                <button class="owner-tool owner-tool--peligro" data-herramienta="limpiar-intentos">
                  <span class="owner-tool__icono">${I('clipboard-list')}</span>
                  <span class="owner-tool__info"><span class="owner-tool__titulo">Intentos viejos</span><span class="owner-tool__desc">Exámenes pendientes de hace +90 días</span></span>
                </button>
              </div>` })}
        </div>`;
    },

    // ==================================================================
    // BINDINGS
    // ==================================================================
    _bindTabs(raiz) {
      window.adminComunes.bindTabs(this, raiz);
    },
    _bindTabContent(raiz) {
      this._bindCentro(raiz);
      this._bindAuditoria(raiz);
      this._bindGrupos(raiz);
      this._bindSugerencias(raiz);
      this._bindConfig(raiz);
      this._bindSistema(raiz);
    },

    _bindCentro(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;

      const aplicarAccion = (accion) => {
        if (!accion) return;
        // Usuarios y exámenes viven en el panel de administración
        if (accion.tab === 'usuarios' || accion.tab === 'examenes') {
          window.adminComunes.irPanel('admin');
          return;
        }
        if (accion.tab === 'grupos') { this._tabActivo = 'grupos'; this._renderizar(raiz); return; }
        if (accion.tab === 'config') { this._tabActivo = 'config'; this._renderizar(raiz); return; }
        if (accion.tab === 'sistema') { this._tabActivo = 'sistema'; this._renderizar(raiz); return; }
      };

      r.querySelectorAll('[data-alerta-accion]').forEach(btn => {
        btn.onclick = () => aplicarAccion(JSON.parse(decodeURIComponent(btn.dataset.alertaAccion)));
      });
      r.querySelectorAll('[data-pendiente]').forEach(btn => {
        btn.onclick = () => aplicarAccion(JSON.parse(decodeURIComponent(btn.dataset.pendiente)));
      });
      r.querySelectorAll('[data-acceso-ruta]').forEach(btn => {
        btn.onclick = () => window.adminComunes.irSpa(btn.dataset.accesoRuta);
      });
      r.querySelectorAll('[data-acceso-tab]').forEach(btn => {
        btn.onclick = () => {
          const tab = btn.dataset.accesoTab;
          // Usuarios y Exámenes viven en el panel de administración, no en el Owner
          if (tab === 'usuarios' || tab === 'examenes') {
            window.adminComunes.irPanel('admin');
            return;
          }
          this._tabActivo = tab;
          this._renderizar(raiz);
        };
      });

      r.querySelectorAll('[data-accion]').forEach(btn => {
        btn.onclick = async () => {
          const accion = btn.dataset.accion;
          if (accion === 'crear-usuario' || accion === 'crear-profesor' || accion === 'crear-alumno' || accion === 'crear-admin') {
            const rolPredef = accion === 'crear-profesor' ? 'editor' : accion === 'crear-alumno' ? 'usuario' : accion === 'crear-admin' ? 'admin' : null;
            await this._abrirCrearUsuario(rolPredef, raiz);
          } else if (accion === 'crear-grupo') {
            this._tabActivo = 'grupos';
            this._renderizar(raiz);
          } else if (accion === 'crear-examen') {
            window.adminComunes.irSpa('/editor/nuevo');
          } else if (accion === 'importar-csv') {
            await this._importarCSV(raiz);
          } else if (accion === 'exportar') {
            try {
              const csv = await window.adminRepository.exportarUsuariosCSV();
              window.adminComunes.descargarCSVTexto('usuarios.csv', csv);
            } catch { window.helpers.mostrarAlerta('Error al exportar', 'error'); }
          } else if (accion === 'backup') {
            await this._crearBackup(raiz);
          } else if (accion === 'sistema') {
            this._tabActivo = 'sistema';
            this._renderizar(raiz);
          } else if (accion === 'config') {
            this._tabActivo = 'config';
            this._renderizar(raiz);
          }
        };
      });
    },

    async _abrirCrearUsuario(rolPredef, raiz) {
      const { usuario } = this._datos;
      const grupos = this._datos.grupos;
      const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
      const datos = await window.helpers.formulario({
        titulo: rolPredef === 'editor' ? 'Crear profesor' : rolPredef === 'usuario' ? 'Crear alumno' : rolPredef === 'admin' ? 'Crear administrador' : 'Crear usuario',
        campos: [
          { nombre: 'nombre_completo', etiqueta: 'Nombre completo', requerido: true },
          { nombre: 'username', etiqueta: 'Username (único)', requerido: true, placeholder: 'ej: ana.2024' },
          { nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
          { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: rolPredef || 'usuario', opciones: [
            { valor: 'usuario', texto: 'Alumno' },
            { valor: 'editor', texto: 'Profesor (editor)' },
            { valor: 'admin', texto: 'Administrador' },
            { valor: 'owner', texto: 'Propietario' }
          ] },
          { nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: '', opciones: opcionesGrupo }
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
    },

    async _importarCSV(raiz) {
      const { usuario } = this._datos;
      const archivo = await window.adminComunes.elegirArchivo('.csv,text/csv');
      if (!archivo) return;
      const ok = await window.helpers.confirmar('Se crearán usuarios a partir del CSV (Nombre,Username,Contraseña,Rol,Grupo). ¿Continuar?', { titulo: 'Importar CSV', textoConfirmar: 'Importar' });
      if (!ok) return;
      try {
        const resultado = await window.adminRepository.importarUsuariosCSV(archivo.texto, usuario.id);
        const n = (resultado.creados || []).length;
        const errs = (resultado.errores || []).length;
        if (errs) window.helpers.mostrarAlerta(`${n} importados, ${errs} con error.`, n ? 'advertencia' : 'error');
        else window.helpers.mostrarAlerta(`${n} usuarios importados.`, 'exito');
        const nuevos = await window.adminRepository.listarUsuarios();
        this._datos.usuarios = nuevos;
        this._renderizar(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _crearBackup(raiz) {
      const { usuario } = this._datos;
      const ok = await window.helpers.confirmar('Se creará una copia de seguridad completa de la base de datos. ¿Continuar?', { titulo: 'Crear backup', textoConfirmar: 'Crear copia' });
      if (!ok) return;
      try {
        await window.adminRepository.crearBackup(usuario.id);
        window.helpers.mostrarAlerta('Copia de seguridad creada.', 'exito');
        const backups = await window.adminRepository.listarBackups();
        this._datos.backups = backups;
        this._renderizar(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
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
        if (buscada.length === 0) { lista.innerHTML = window.adminComunes.vacio('clipboard-list', 'Sin registros', 'No hay auditoría para esta búsqueda.'); return; }
        lista.innerHTML = buscada.map(a => this._itemAuditoria(a)).join('');
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
      const { grupos, usuario } = this._datos;

      r.querySelector('#btnCrearGrupo')?.addEventListener('click', async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Crear grupo',
          campos: [{ nombre: 'nombre', etiqueta: 'Nombre del grupo', requerido: true, placeholder: 'Ej: Clase 1º ESO A' }],
          textoConfirmar: 'Crear'
        });
        if (!datos || !datos.nombre.trim()) return;
        try {
          await window.adminRepository.crearGrupo(datos.nombre.trim(), usuario.id);
          await window.adminRepository.registrarAuditoria('grupo:crear', `Grupo "${datos.nombre.trim()}" creado`, usuario.id);
          window.helpers.mostrarAlerta('Grupo creado.', 'exito');
          const nuevos = await window.adminRepository.listarGrupos();
          this._datos.grupos = nuevos;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelectorAll('.btn-ver-grupo, .btn-gestionar-grupo').forEach(el => {
        el.onclick = async (e) => {
          e.stopPropagation();
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

      r.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar('¿Eliminar este grupo? Los usuarios quedarán sin grupo.', { titulo: 'Eliminar grupo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarGrupo(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('grupo:eliminar', 'Grupo eliminado', usuario.id);
            const nuevos = await window.adminRepository.listarGrupos();
            this._datos.grupos = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-ver-examenes-grupo').forEach(el => {
        el.onclick = async (e) => {
          e.stopPropagation();
          const grupo = grupos.find(g => g.id === el.dataset.gid);
          if (!grupo) return;
          const exGrupo = this._datos.examenes.filter(ex => ex.grupo_id === grupo.id);
          window.adminComunes.abrirModal({
            titulo: `Exámenes de ${grupo.nombre}`,
            icono: 'file-text',
            ancho: '520px',
            contenido: exGrupo.length
              ? `<div class="o-pila">${exGrupo.map(ex => `<div class="admin-grupo-card__actividad" style="justify-content:space-between"><span>${E(ex.titulo)}</span>${window.adminComunes.estadoBadge(ex.estado)}</div>`).join('')}</div>`
              : window.adminComunes.vacio('file-text', 'Sin exámenes', 'Este grupo aún no tiene exámenes.')
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
    },

    _bindSistema(raiz) {
      const r = raiz.querySelector('#ownerContenido');
      if (!r) return;
      const { usuario } = this._datos;

      r.querySelector('#btnModoMantenimiento')?.addEventListener('click', async () => {
        const btn = r.querySelector('#btnModoMantenimiento');
        const activo = btn.dataset.activo !== '1';
        const ok = await window.helpers.confirmar(activo ? '¿Activar el modo mantenimiento? Los usuarios no podrán acceder.' : '¿Desactivar el modo mantenimiento?', {
          titulo: 'Modo mantenimiento', textoConfirmar: activo ? 'Activar' : 'Desactivar'
        });
        if (!ok) return;
        try {
          await window.adminRepository.establecerModoMantenimiento(activo, usuario.id);
          window.helpers.mostrarAlerta(activo ? 'Modo mantenimiento activado.' : 'Modo mantenimiento desactivado.', 'exito');
          const config = await window.adminRepository.listarConfiguracion();
          this._datos.config = config;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelector('#btnVerPermisos')?.addEventListener('click', () => {
        window.adminComunes.abrirModal({
          titulo: 'Jerarquía de permisos',
          icono: 'shield',
          contenido: `
            <div class="admin-jerarquia">
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--owner">${I('crown')} Propietario — Control total del sistema</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--admin">${I('settings')} Administrador — Gestiona usuarios y grupos</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--editor">${I('book-open')} Profesor — Crea exámenes y corrige</div>
              <div class="admin-jerarquia__nivel admin-jerarquia__nivel--usuario">${I('user')} Alumno — Lee, estudia y responde</div>
            </div>
            <p class="u-fs-xs u-color-texto-terciario u-mt-2">Cada rol solo puede gestionar usuarios de rango inferior.</p>`
        });
      });

      r.querySelector('#btnExportarJSON')?.addEventListener('click', async () => {
        try {
          const datos = await window.adminRepository.exportarDatosJSON();
          window.adminComunes.descargarJSON('formsbiblicos-export-' + new Date().toISOString().slice(0, 10) + '.json', datos);
          window.helpers.mostrarAlerta('Exportación descargada.', 'exito');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelectorAll('[data-herramienta]').forEach(btn => {
        btn.onclick = async () => {
          const herramienta = btn.dataset.herramienta;
          if (herramienta === 'backup-crear') { await this._crearBackup(raiz); return; }
          if (herramienta === 'backup-restaurar') {
            const archivo = await window.adminComunes.elegirArchivo('.json,application/json');
            if (!archivo) return;
            try {
              const datos = JSON.parse(archivo.texto);
              const ok = await window.helpers.confirmar('Se restaurarán los datos del archivo seleccionado. Esta acción puede sobrescribir datos existentes. ¿Continuar?', { titulo: 'Restaurar copia', textoConfirmar: 'Restaurar' });
              if (!ok) return;
              // Insertar como nuevo backup y restaurar
              const snapshot = {
                app: 'FormsBiblicos',
                version: '1.0.1',
                creado_en: new Date().toISOString(),
                perfiles: datos.perfiles || [],
                grupos: datos.grupos || [],
                examenes: datos.examenes || [],
                configuracion: datos.configuracion || [],
                sugerencias: datos.sugerencias || []
              };
              const nombre = 'restaurar-' + new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
              const { data: b } = await window.supabaseClient.from('backups').insert({
                creado_por: usuario.id, nombre, tamano_bytes: new Blob([JSON.stringify(snapshot)]).size, snapshot, estado: 'ok'
              }).select().single();
              if (!b) throw new Error('No se pudo guardar la copia temporal');
              await window.adminRepository.restaurarBackup(b.id, usuario.id);
              window.helpers.mostrarAlerta('Datos restaurados correctamente.', 'exito');
              const backups = await window.adminRepository.listarBackups();
              this._datos.backups = backups;
              this._renderizar(raiz);
            } catch (e) { window.helpers.mostrarAlerta('Archivo inválido o error: ' + e.message, 'error'); }
            return;
          }
          if (herramienta === 'limpiar-auditoria') {
            const ok = await window.helpers.confirmar('¿Eliminar TODOS los registros de auditoría? Esta acción no se puede deshacer.', { titulo: 'Limpiar auditoría', textoConfirmar: 'Limpiar todo' });
            if (!ok) return;
            try {
              await window.adminRepository.limpiarAuditoriaCompleta(usuario.id);
              window.helpers.mostrarAlerta('Auditoría vaciada.', 'exito');
              const nueva = await window.adminRepository.obtenerAuditoria();
              this._datos.auditoria = nueva;
              this._renderizar(raiz);
            } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
            return;
          }
          if (herramienta === 'limpiar-sugerencias') {
            const ok = await window.helpers.confirmar('¿Eliminar todas las sugerencias rechazadas?', { titulo: 'Limpiar sugerencias', textoConfirmar: 'Limpiar' });
            if (!ok) return;
            try {
              const n = await window.adminRepository.limpiarSugerenciasRechazadas(usuario.id);
              window.helpers.mostrarAlerta(`${n} sugerencias eliminadas.`, 'exito');
              const nuevas = await window.sugerenciasRepository.listarTodas();
              this._datos.sugerencias = nuevas;
            } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
            return;
          }
          if (herramienta === 'limpiar-intentos') {
            const ok = await window.helpers.confirmar('¿Eliminar intentos de examen pendientes con más de 90 días?', { titulo: 'Limpiar intentos', textoConfirmar: 'Limpiar' });
            if (!ok) return;
            try {
              const n = await window.adminRepository.limpiarIntentosViejos(usuario.id);
              window.helpers.mostrarAlerta(`${n} intentos eliminados.`, 'exito');
            } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
            return;
          }
        };
      });

      r.querySelectorAll('.btn-restaurar-backup').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Restaurar esta copia? Sobrescribirá los datos actuales con los del backup.', { titulo: 'Restaurar copia', textoConfirmar: 'Restaurar' });
          if (!ok) return;
          try {
            await window.adminRepository.restaurarBackup(btn.dataset.id, usuario.id);
            window.helpers.mostrarAlerta('Copia restaurada.', 'exito');
            window.helpers.mostrarAlerta('Recarga los datos para ver los cambios.', 'advertencia', 6000);
            const backups = await window.adminRepository.listarBackups();
            this._datos.backups = backups;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-eliminar-backup').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Eliminar esta copia de seguridad?', { titulo: 'Eliminar backup', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarBackup(btn.dataset.id, usuario.id);
            window.helpers.mostrarAlerta('Copia eliminada.', 'exito');
            const backups = await window.adminRepository.listarBackups();
            this._datos.backups = backups;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    }
  };
})();
