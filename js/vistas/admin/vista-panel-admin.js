(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  const rolBonito = (rol) => window.adminComunes.rolBonito(rol);
  const TR = (iso) => window.adminComunes.tiempoRelativo(iso);

  const TABS = [
    { id: 'centro', icono: 'command', texto: 'Centro de Administración' },
    { id: 'usuarios', icono: 'users', texto: 'Usuarios' },
    { id: 'grupos', icono: 'layout', texto: 'Grupos' },
    { id: 'examenes', icono: 'file-text', texto: 'Exámenes' },
    { id: 'memorizacion', icono: 'brain', texto: 'Memorización' }
  ];

  /* Tipos de tarjeta de memorización (juego) */
  const TIPOS_TARJETA = [
    { valor: 'versiculo', texto: 'Versículo', icono: 'book-open' },
    { valor: 'completar', texto: 'Completar palabras', icono: 'edit-3' },
    { valor: 'ordenar', texto: 'Ordenar palabras', icono: 'list-ordered' },
    { valor: 'elegir_versiculo', texto: 'Elegir el versículo', icono: 'check-circle' },
    { valor: 'verdadero_falso', texto: 'Verdadero o falso', icono: 'help-circle' },
    { valor: 'relacionar', texto: 'Relacionar', icono: 'link-2' },
    { valor: 'escrita', texto: 'Respuesta escrita', icono: 'pen-line' },
    { valor: 'libre', texto: 'Tarjeta libre (legacy)', icono: 'layers' }
  ];

  const COLORES_MAZO = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
  function colorMazo(color, idx) {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return COLORES_MAZO[(idx >= 0 ? idx : 0) % COLORES_MAZO.length];
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
    _volver() {
      // En la página standalone no hay rutas registradas: usar hook si existe, si no router.
      window.adminComunes.volver(this);
    },
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'owner'].includes((usuario.rol || '').toString().trim().toLowerCase())) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="window.vistaPanelAdmin._volver()">Volver</button></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel...</p></div>';
      this._inicioSesion = Date.now();
      try {
        const [usuarios, grupos, examenes, stats, auditoria, resumenExamenes, backups] = await Promise.all([
          window.adminRepository.listarUsuarios(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes(),
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.obtenerResumenExamenes(),
          window.adminRepository.listarBackups()
        ]);
        this._datos = { usuarios, grupos, examenes, stats, auditoria, resumenExamenes, backups, usuario };
        this._tabActivo = 'centro';
        this._pagUsuarios = 1;
        this._porPagina = 50;
        this._buscarUsuarios = '';
        this._filtroRol = 'todos';
        this._filtroGrupo = 'todos';
        this._filtroEstado = 'todos';
        this._ordenUsuarios = 'actividad';
        this._seleccion = new Set();
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz) {
      window.adminComunes.renderizarPanel(this, raiz, {
        titulo: 'Administración',
        subtitulo: 'Gestiona usuarios, grupos y exámenes de tu centro.',
        contenedorId: 'adminContenido',
        tabs: TABS,
        nombreVista: 'vistaPanelAdmin'
      });
    },
    _renderTabContent(raiz) {
      const { usuarios, grupos, examenes, stats, usuario } = this._datos;
      switch (this._tabActivo) {
        case 'centro': return this._renderCentro();
        case 'usuarios': return this._renderUsuarios(usuarios, usuario);
        case 'grupos': return this._renderGrupos(grupos, examenes, usuarios);
        case 'examenes': return this._renderExamenes(examenes);
        case 'memorizacion': return this._renderMemorizacion();
        default: return '';
      }
    },

    // ==================================================================
    // CENTRO DE ADMINISTRACIÓN — bloques funcionales
    // ==================================================================
    _renderCentro() {
      const { usuarios, grupos, examenes, stats, auditoria, backups, usuario } = this._datos;
      const { porRol } = stats;
      const resumenEx = this._datos.resumenExamenes || {};

      // ---- Alertas (solo lo que requiere atención) ----
      const inactivos = usuarios.filter(u => u.activo === false);
      const profesoresSinGrupo = usuarios.filter(u => u.rol === 'editor' && !u.grupo_id);
      const alumnosSinGrupo = usuarios.filter(u => u.rol === 'usuario' && !u.grupo_id);
      const sinPublicar = examenes.filter(e => e.estado !== 'publicado');
      const gruposSinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id));

      const alertas = [];
      const alerta = (tipo, icono, titulo, meta, accion) => ({
        tipo, icono, titulo, meta, accion
      });
      if (inactivos.length) alertas.push(alerta('aviso', 'user-x', `${inactivos.length} usuario${inactivos.length !== 1 ? 's' : ''} pendiente${inactivos.length !== 1 ? 's' : ''} de activar`, 'Usuarios sin acceso a la plataforma', { tab: 'usuarios', rol: 'todos', grupo: 'todos', estado: 'inactivos' }));
      if (profesoresSinGrupo.length) alertas.push(alerta('info', 'book-open', `${profesoresSinGrupo.length} profesor${profesoresSinGrupo.length !== 1 ? 'es' : ''} sin grupo`, 'Sin asignación a una clase', { tab: 'usuarios', rol: 'editor', grupo: 'sin-grupo', estado: 'todos' }));
      if (sinPublicar.length) alertas.push(alerta('info', 'file-text', `${sinPublicar.length} examen${sinPublicar.length !== 1 ? 'es' : ''} sin publicar`, 'Quedaron en borrador', { tab: 'examenes', estado: 'borrador' }));
      if (gruposSinExamenes.length) alertas.push(alerta('info', 'layout', `${gruposSinExamenes.length} grupo${gruposSinExamenes.length !== 1 ? 's' : ''} sin exámenes`, 'Clases aún sin evaluaciones', { tab: 'grupos' }));
      if (alumnosSinGrupo.length) alertas.push(alerta('aviso', 'user', `${alumnosSinGrupo.length} alumno${alumnosSinGrupo.length !== 1 ? 's' : ''} sin grupo`, 'Sin asignación a una clase', { tab: 'usuarios', rol: 'usuario', grupo: 'sin-grupo', estado: 'todos' }));
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

      // ---- Acciones rápidas ----
      const esOwner = (usuario.rol || '').toString().toLowerCase() === 'owner';
      const acciones = [
        { id: 'crear-usuario', icono: 'user-plus', texto: 'Crear usuario' },
        { id: 'crear-profesor', icono: 'book-open', texto: 'Crear profesor' },
        { id: 'crear-alumno', icono: 'graduation-cap', texto: 'Crear alumno' },
        { id: 'crear-grupo', icono: 'layout', texto: 'Crear grupo' },
        { id: 'crear-examen', icono: 'file-text', texto: 'Crear examen' },
        { id: 'importar-csv', icono: 'upload', texto: 'Importar CSV' },
        { id: 'exportar', icono: 'download', texto: 'Exportar datos' }
      ];
      if (esOwner) acciones.push({ id: 'crear-admin', icono: 'shield', texto: 'Crear admin' });
      if (esOwner) acciones.push({ id: 'backup', icono: 'database-backup', texto: 'Backup' });
      acciones.push({ id: 'config', icono: 'settings', texto: 'Configuración' });

      const accionesHtml = `
        <div class="admin-acciones">
          ${acciones.map(a => `<button class="admin-accion" data-accion="${a.id}">
            <span class="admin-accion__icono">${I(a.icono)}</span>
            <span class="admin-accion__texto">${a.texto}</span>
          </button>`).join('')}
        </div>`;

      // ---- Actividad reciente (timeline) ----
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

      // ---- Estado del sistema ----
      const ultimoBackup = (backups || [])[0];
      const sistemaHtml = `
        <div class="admin-sistema">
          ${window.adminComunes.sistemaFila('server', 'Servidor', 'Operativo', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('database', 'Base de datos', 'Conectada', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('cloud', 'Supabase', 'En línea', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('lock', 'Autenticación', 'Activa', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('database-backup', 'Último backup', ultimoBackup ? TR(ultimoBackup.creado_en) : 'Nunca', ultimoBackup ? 'admin-indicador--ok' : 'admin-indicador--aviso', ultimoBackup ? window.adminComunes.tiempoRelativoPreciso(ultimoBackup.creado_en) : '')}
          ${window.adminComunes.sistemaFila('tag', 'Versión', '1.0.1', 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('timer', 'Tiempo activo', this._tiempoActivo(), 'admin-indicador--ok')}
          ${window.adminComunes.sistemaFila('hard-drive', 'Espacio utilizado', `${Math.max(0, (usuarios.length + grupos.length + examenes.length))} registros`, 'admin-indicador--ok')}
        </div>`;

      // ---- Gestión pendiente ----
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

      // ---- Accesos rápidos ----
      const accesos = [
        { icono: 'users', texto: 'Usuarios', ruta: null, tab: 'usuarios' },
        { icono: 'layout', texto: 'Grupos', ruta: null, tab: 'grupos' },
        { icono: 'file-text', texto: 'Exámenes', ruta: null, tab: 'examenes' },
        { icono: 'clipboard-check', texto: 'Calificaciones', ruta: '/calificaciones' },
        { icono: 'brain', texto: 'Memoria', ruta: '/memorizacion' },
        { icono: 'file-text', texto: 'Notas', ruta: '/notas' },
        { icono: 'settings', texto: 'Configuración', ruta: '/perfil' }
      ];
      if (esOwner) accesos.push({ icono: 'shield', texto: 'Permisos', ruta: null, tab: 'owner-sistema' });

      const accesosHtml = `
        <div class="admin-accesos">
          ${accesos.map(a => `<button class="admin-acceso" ${a.tab ? `data-acceso-tab="${a.tab}"` : `data-acceso-ruta="${a.ruta}"`}>
            <span class="admin-acceso__icono">${I(a.icono)}</span>
            <span>${a.texto}</span>
          </button>`).join('')}
        </div>`;

      // ---- Resumen general (stats secundarias) ----
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

      // ---- Layout: 2 columnas en desktop ----
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
    // USUARIOS — tarjetas modernas
    // ==================================================================
    _usuariosFiltrados() {
      const { usuarios } = this._datos;
      const q = this._buscarUsuarios.toLowerCase().trim();
      let lista = usuarios;
      if (q) lista = lista.filter(u =>
        (u.nombre_completo || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.rol || '').toLowerCase().includes(q)
      );
      if (this._filtroRol !== 'todos') lista = lista.filter(u => u.rol === this._filtroRol);
      if (this._filtroGrupo === 'sin-grupo') lista = lista.filter(u => !u.grupo_id);
      else if (this._filtroGrupo !== 'todos') lista = lista.filter(u => u.grupo_id === this._filtroGrupo);
      if (this._filtroEstado === 'activos') lista = lista.filter(u => u.activo !== false);
      else if (this._filtroEstado === 'inactivos') lista = lista.filter(u => u.activo === false);
      switch (this._ordenUsuarios) {
        case 'nombre': lista = [...lista].sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || '')); break;
        case 'fecha': lista = [...lista].sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)); break;
        default: lista = [...lista].sort((a, b) => new Date(b.ultimo_acceso || b.creado_en || 0) - new Date(a.ultimo_acceso || a.creado_en || 0));
      }
      return lista;
    },

    _renderUsuarios(usuarios, usuario) {
      const filtrados = this._usuariosFiltrados();
      const totalPag = Math.max(1, Math.ceil(filtrados.length / this._porPagina));
      const pag = Math.min(this._pagUsuarios, totalPag);
      const inicio = (pag - 1) * this._porPagina;
      const pagina = filtrados.slice(inicio, inicio + this._porPagina);
      const selCount = this._seleccion.size;
      const { grupos } = this._datos;
      const opcionesGrupo = [{ valor: 'todos', texto: 'Todos los grupos' }, { valor: 'sin-grupo', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${I('users')} Usuarios <span class="u-fs-xs u-color-texto-terciario">(${usuarios.length})</span></h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              <button class="btn-secundario u-fs-xs" id="btnExportCSV">${I('download')} CSV</button>
              <button class="btn-secundario u-fs-xs" id="btnImportarCSV">${I('upload')} Importar</button>
              <button class="btn-primario u-fs-xs" id="btnCrearUsuario">${I('user-plus')} Crear</button>
            </div>
          </div>

          <div class="admin-filtros">
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${I('search')}</span>
              <input type="text" id="buscarUsuarios" placeholder="Buscar por nombre, username o rol..." value="${E(this._buscarUsuarios)}" aria-label="Buscar usuarios">
            </div>
            <select id="filtroRolUsuarios" aria-label="Filtrar por rol">
              <option value="todos">Todos los roles</option>
              ${this._opcionesRolPermitidas(usuario).map(o => `<option value="${o.valor}" ${this._filtroRol === o.valor ? 'selected' : ''}>${o.texto}</option>`).join('')}
            </select>
            <select id="filtroGrupoUsuarios" aria-label="Filtrar por grupo">
              ${opcionesGrupo.map(g => `<option value="${g.valor}" ${this._filtroGrupo === g.valor ? 'selected' : ''}>${g.texto}</option>`).join('')}
            </select>
            <select id="filtroEstadoUsuarios" aria-label="Filtrar por estado">
              <option value="todos" ${this._filtroEstado === 'todos' ? 'selected' : ''}>Todos los estados</option>
              <option value="activos" ${this._filtroEstado === 'activos' ? 'selected' : ''}>Activos</option>
              <option value="inactivos" ${this._filtroEstado === 'inactivos' ? 'selected' : ''}>Inactivos</option>
            </select>
            <select id="ordenUsuarios" aria-label="Ordenar usuarios">
              <option value="actividad" ${this._ordenUsuarios === 'actividad' ? 'selected' : ''}>Última actividad</option>
              <option value="nombre" ${this._ordenUsuarios === 'nombre' ? 'selected' : ''}>Nombre</option>
              <option value="fecha" ${this._ordenUsuarios === 'fecha' ? 'selected' : ''}>Fecha de alta</option>
            </select>
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

          ${pagina.length === 0
            ? window.adminComunes.vacio('users', 'Sin usuarios para mostrar', 'Ajusta la búsqueda o los filtros.')
            : `<div class="admin-grid-tarjetas">
                ${pagina.map(u => this._renderUsuarioCard(u, usuario)).join('')}
              </div>`}

          ${filtrados.length > this._porPagina ? this._renderPaginacion(pag, totalPag, 'pagUsuarios') : ''}
        </div>`;
    },

    _renderUsuarioCard(u, actor) {
      const inicial = (u.nombre_completo || u.username || '?').charAt(0).toUpperCase();
      const foto = u.foto_perfil;
      const activo = u.activo !== false;
      const puedeEditar = this._puedeEditar(actor, u);
      const puedeEliminar = this._puedeEliminar(actor, u);
      const sel = this._seleccion.has(u.id);
      const grupoNombre = u.grupo_id ? (this._datos.grupos.find(g => g.id === u.grupo_id)?.nombre || '') : '';
      const ultima = u.ultimo_acceso || u.creado_en;
      return `
        <article class="admin-usuario-card${!activo ? ' admin-usuario-card--inactivo' : ''}" data-id="${u.id}" data-nombre="${E(u.nombre_completo)}" data-username="${E(u.username)}" data-rol="${u.rol}">
          <div class="admin-usuario-card__cabecera">
            <label class="admin-select-all-wrap" style="margin-right:2px" aria-label="Seleccionar a ${E(u.nombre_completo)}">
              <input type="checkbox" class="admin-select-cb" data-sel-id="${u.id}" ${sel ? 'checked' : ''}>
            </label>
            <span class="admin-usuario-card__avatar" data-ver-detalle="${u.id}" style="cursor:pointer" title="Ver detalle">${foto ? `<img src="${foto}" alt="">` : inicial}</span>
            <div class="admin-usuario-card__info" data-ver-detalle="${u.id}" style="cursor:pointer">
              <p class="admin-usuario-card__nombre">${E(u.nombre_completo)}</p>
              <p class="admin-usuario-card__username">@${E(u.username)}</p>
            </div>
            <button class="btn-icono btn-ver-detalle" data-id="${u.id}" title="Detalle" aria-label="Detalle de ${E(u.nombre_completo)}">${I('info')}</button>
          </div>
          <div class="admin-usuario-card__chips">
            <span class="admin-tabla-badge admin-tabla-badge--rol">${rolBonito(u.rol)}</span>
            ${activo ? '<span class="admin-tabla-badge admin-tabla-badge--activo">Activo</span>' : '<span class="admin-tabla-badge admin-tabla-badge--inactivo">Inactivo</span>'}
          </div>
          <div class="admin-usuario-card__fila">
            <span class="admin-usuario-card__fila-label">${I('layout')} ${E(grupoNombre || 'Sin grupo')}</span>
            <span class="admin-usuario-card__fila-valor">${I('clock')} ${TR(ultima)}</span>
          </div>
          <div class="admin-usuario-card__acciones">
            ${puedeEditar ? `<button class="btn-icono btn-editar-usuario" data-id="${u.id}" title="Editar" aria-label="Editar a ${E(u.nombre_completo)}">${I('edit-3')}</button>` : ''}
            ${puedeEditar ? `<button class="btn-icono btn-cambiar-grupo" data-id="${u.id}" title="Cambiar grupo" aria-label="Cambiar grupo de ${E(u.nombre_completo)}">${I('layout')}</button>` : ''}
            ${puedeEditar ? `<button class="btn-icono btn-cambiar-rol" data-id="${u.id}" data-rol="${u.rol}" title="Cambiar rol" aria-label="Permisos de ${E(u.nombre_completo)}">${I('shield')}</button>` : ''}
            <button class="btn-icono btn-icono--suspender btn-toggle-activo" data-id="${u.id}" data-activo="${activo ? '1' : '0'}" title="${activo ? 'Suspender' : 'Reactivar'}" aria-label="${activo ? 'Suspender' : 'Reactivar'} a ${E(u.nombre_completo)}">${activo ? I('pause-circle') : I('play-circle')}</button>
            ${puedeEliminar ? `<button class="btn-icono btn-icono--peligro btn-eliminar-usuario" data-id="${u.id}" data-nombre="${E(u.nombre_completo)}" title="Eliminar" aria-label="Eliminar a ${E(u.nombre_completo)}">${I('trash-2')}</button>` : ''}
          </div>
        </article>`;
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

    // ==================================================================
    // GRUPOS — tarjetas
    // ==================================================================
    _renderGrupos(grupos, examenes, usuarios) {
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${I('layout')} Grupos <span class="u-fs-xs u-color-texto-terciario">(${grupos.length})</span></h3>
            <button class="btn-primario u-fs-xs" id="btnCrearGrupo">${I('plus')} Crear grupo</button>
          </div>
          ${grupos.length === 0
            ? window.adminComunes.vacio('layout', 'Sin grupos', 'Crea el primer grupo para organizar a tus usuarios.')
            : `<div class="admin-grid-tarjetas">
                ${grupos.map(g => this._renderGrupoCard(g, examenes, usuarios)).join('')}
              </div>`}
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
            <button class="admin-grupo-card__ver btn-ver-grupo-admin" data-gid="${g.id}">${I('eye')} Ver miembros</button>
          </div>
        </article>`;
    },

    // ==================================================================
    // EXÁMENES — tarjetas
    // ==================================================================
    _renderExamenes(examenes) {
      const resumen = this._datos.resumenExamenes || {};
      const publicado = examenes.filter(e => e.estado === 'publicado').length;
      const borrador = examenes.filter(e => e.estado === 'borrador').length;
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${I('file-text')} Exámenes <span class="u-fs-xs u-color-texto-terciario">(${examenes.length})</span></h3>
            <span class="u-fs-xs u-color-texto-terciario">${publicado} publicados · ${borrador} borradores</span>
          </div>
          ${examenes.length === 0
            ? window.adminComunes.vacio('file-text', 'Sin exámenes', 'Crea un examen desde el editor para empezar.')
            : `<div class="admin-grid-tarjetas">
                ${examenes.map(ex => this._renderExamenCard(ex, resumen[ex.id])).join('')}
              </div>`}
        </div>`;
    },

    _renderExamenCard(ex, r) {
      const numPreguntas = Array.isArray(ex.preguntas) ? ex.preguntas.length : 0;
      const tiempo = ex.config && (ex.config.temporizadorMinutos || ex.config.tiempoMinutos) ? (ex.config.temporizadorMinutos || ex.config.tiempoMinutos) : null;
      const respuestas = r ? r.intentos : 0;
      const pendientes = r ? r.pendientes : 0;
      const notaMedia = r && r.media != null ? r.media.toFixed(1) : '—';
      return `
        <article class="admin-examen-card" data-id="${ex.id}">
          <div class="admin-examen-card__cabecera">
            <span class="admin-examen-card__icono">${E(ex.icono || '') || I('file-text')}</span>
            <div class="admin-examen-card__info">
              <p class="admin-examen-card__titulo">${E(ex.titulo)}</p>
              <p class="admin-examen-card__meta">${I('user')} ${E(ex.perfiles?.nombre_completo || 'Autor desconocido')} · ${I('layout')} ${E(ex.grupos?.nombre || 'Sin grupo')}</p>
            </div>
            ${window.adminComunes.estadoBadge(ex.estado)}
          </div>
          <div class="admin-examen-card__stats">
            <div class="admin-examen-card__stat"><p class="admin-examen-card__stat-valor">${numPreguntas}</p><p class="admin-examen-card__stat-etiqueta">Preguntas</p></div>
            <div class="admin-examen-card__stat"><p class="admin-examen-card__stat-valor">${tiempo ? `${tiempo}'` : '—'}</p><p class="admin-examen-card__stat-etiqueta">Tiempo</p></div>
            <div class="admin-examen-card__stat"><p class="admin-examen-card__stat-valor">${window.helpers.formatearFecha(ex.creado_en) || '—'}</p><p class="admin-examen-card__stat-etiqueta">Fecha</p></div>
            <div class="admin-examen-card__stat"><p class="admin-examen-card__stat-valor">${respuestas}</p><p class="admin-examen-card__stat-etiqueta">Respuestas</p></div>
            <div class="admin-examen-card__stat"><p class="admin-examen-card__stat-valor">${notaMedia}</p><p class="admin-examen-card__stat-etiqueta">Nota media</p></div>
            <div class="admin-examen-card__stat admin-examen-card__stat--pendiente"><p class="admin-examen-card__stat-valor">${pendientes}</p><p class="admin-examen-card__stat-etiqueta">Pendientes</p></div>
          </div>
          <div class="admin-examen-card__acciones">
            <button class="btn-icono btn-editar-examen" data-id="${ex.id}" title="Editar" aria-label="Editar ${E(ex.titulo)}">${I('edit-3')}</button>
            <button class="btn-icono btn-duplicar-examen" data-id="${ex.id}" title="Duplicar" aria-label="Duplicar ${E(ex.titulo)}">${I('copy')}</button>
            ${ex.estado !== 'publicado' ? `<button class="btn-icono btn-icono--exito btn-publicar-examen" data-id="${ex.id}" title="Publicar" aria-label="Publicar ${E(ex.titulo)}">${I('send')}</button>` : ''}
            <button class="btn-icono btn-ver-resultados" data-id="${ex.id}" title="Ver resultados" aria-label="Ver resultados de ${E(ex.titulo)}">${I('bar-chart-2')}</button>
            <button class="btn-icono btn-icono--peligro btn-eliminar-examen" data-id="${ex.id}" data-titulo="${E(ex.titulo)}" title="Eliminar" aria-label="Eliminar ${E(ex.titulo)}">${I('trash-2')}</button>
          </div>
        </article>`;
    },

    // ==================================================================
    // BINDINGS
    // ==================================================================
    _bindTabs(raiz) {
      window.adminComunes.bindTabs(this, raiz);
    },
    _bindTabContent(raiz) {
      this._bindCentro(raiz);
      this._bindUsuarios(raiz);
      this._bindGrupos(raiz);
      this._bindExamenes(raiz);
      this._bindMemorizacion(raiz);
      this._bindComun(raiz);
    },

    // ==================================================================
    // MEMORIZACIÓN — gestión de mazos y tarjetas del juego
    // ==================================================================
    async _cargarMemorizacion() {
      const { usuario } = this._datos;
      const [mazos, tarjetas] = await Promise.all([
        window.memorizacionRepository.listarMazos(usuario.id),
        window.memorizacionRepository.listarTarjetas(usuario.id)
      ]);
      this._datos.mazosMem = mazos;
      this._datos.tarjetasMem = tarjetas;
      this._mazoMemActivo = null;
    },

    _renderMemorizacion() {
      const d = this._datos;
      if (this._mazoMemActivo) return this._renderMemorizacionMazo();
      const mazos = d.mazosMem || [];
      const tarjetas = d.tarjetasMem || [];
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3 style="margin:0">${I('brain')} Mazos de memorización <span class="u-fs-xs u-color-texto-terciario">(${mazos.length})</span></h3>
            <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap">
              <button class="btn-secundario u-fs-xs" id="btnSembrarMazos">${I('sparkles')} Sembrar contenido</button>
              <button class="btn-secundario u-fs-xs" id="btnImportarMazo">${I('upload')} Importar</button>
              <button class="btn-primario u-fs-xs" id="btnCrearMazo">${I('plus')} Crear mazo</button>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Los mazos globales se muestran a todos los usuarios en la sección Memorización. Crea el contenido aquí: cada tarjeta puede tener un tipo de ejercicio distinto.</p>
          ${mazos.length === 0
            ? window.adminComunes.vacio('brain', 'Sin mazos de memorización', 'Pulsa "Sembrar contenido" para crear mazos con datos bíblicos, o crea uno desde cero.')
            : `<div class="admin-grid-tarjetas">
                ${mazos.map((m, i) => this._renderMazoMemCard(m, i, tarjetas)).join('')}
              </div>`}
        </div>`;
    },

    _renderMazoMemCard(m, i, tarjetas) {
      const nTarjetas = tarjetas.filter(t => t.mazo_id === m.id).length;
      const color = colorMazo(m.color, i);
      return `
        <article class="admin-grupo-card" data-mazoid="${m.id}" style="border-top:4px solid ${color}">
          <div class="admin-grupo-card__cabecera">
            <span class="admin-grupo-card__icono" style="color:${color}">${I(m.icono || 'layers')}</span>
            <div class="admin-grupo-card__info">
              <p class="admin-grupo-card__nombre">${E(m.nombre)}</p>
              <p class="admin-grupo-card__admin">${m.es_global ? I('globe') + ' Global' : I('user') + ' Personal'} · ${nTarjetas} tarjetas</p>
            </div>
          </div>
          <p class="admin-grupo-card__actividad">${E(m.descripcion || 'Sin descripción')}</p>
          <div class="admin-grupo-card__acciones">
            <button class="btn-icono btn-mazo-ver" data-mazoid="${m.id}" title="Ver tarjetas" aria-label="Ver tarjetas de ${E(m.nombre)}">${I('eye')}</button>
            <button class="btn-icono btn-mazo-editar" data-mazoid="${m.id}" title="Editar" aria-label="Editar ${E(m.nombre)}">${I('edit-3')}</button>
            <button class="btn-icono btn-mazo-exportar" data-mazoid="${m.id}" title="Exportar JSON" aria-label="Exportar ${E(m.nombre)}">${I('download')}</button>
            <button class="btn-icono btn-icono--peligro btn-mazo-eliminar" data-mazoid="${m.id}" data-nombre="${E(m.nombre)}" title="Eliminar" aria-label="Eliminar ${E(m.nombre)}">${I('trash-2')}</button>
          </div>
        </article>`;
    },

    _renderMemorizacionMazo() {
      const d = this._datos;
      const mazo = d.mazosMem.find(m => m.id === this._mazoMemActivo);
      if (!mazo) { this._mazoMemActivo = null; return this._renderMemorizacion(); }
      const tarjetas = (d.tarjetasMem || []).filter(t => t.mazo_id === mazo.id);
      const color = colorMazo(mazo.color, d.mazosMem.indexOf(mazo));
      return `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario u-fs-xs" id="btnVolverMazosMem">${I('arrow-left')} Mazos</button>
            <h3 style="margin:0">${I(mazo.icono || 'layers')} ${E(mazo.nombre)} <span class="u-fs-xs u-color-texto-terciario">(${tarjetas.length})</span></h3>
            <button class="btn-primario u-fs-xs" id="btnCrearTarjetaMem">${I('plus')} Nueva tarjeta</button>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">${E(mazo.descripcion || '')} · Cada tarjeta tiene un tipo de ejercicio. Duplica o edita con los botones.</p>
          ${tarjetas.length === 0
            ? window.adminComunes.vacio('layers', 'Sin tarjetas', 'Añade la primera tarjeta para que los usuarios puedan practicar.')
            : `<div class="o-pila">${tarjetas.map((t, i) => this._renderTarjetaMemItem(t, i)).join('')}</div>`}
        </div>`;
    },

    _renderTarjetaMemItem(t, i) {
      const tipoInfo = TIPOS_TARJETA.find(x => x.valor === t.tipo) || { texto: t.tipo || 'versiculo', icono: 'layers' };
      const frente = t.pregunta || t.referencia || t.texto || '(sin contenido)';
      const corto = String(frente).substring(0, 100) + (String(frente).length > 100 ? '…' : '');
      return `
        <div class="tarjeta-capitulo" data-tid="${t.id}">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;flex:1;min-width:0">
              <span class="mem-tipo-badge" title="${E(tipoInfo.texto)}">${I(tipoInfo.icono)}</span>
              <span class="u-fw-600 u-fs-sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${E(corto)}</span>
            </div>
            <div class="o-flecha" style="gap:4px">
              <button class="btn-icono btn-tarjeta-duplicar" data-tid="${t.id}" title="Duplicar" aria-label="Duplicar tarjeta">${I('copy')}</button>
              <button class="btn-icono btn-tarjeta-editar" data-tid="${t.id}" title="Editar" aria-label="Editar tarjeta">${I('edit-3')}</button>
              <button class="btn-icono btn-icono--peligro btn-tarjeta-eliminar" data-tid="${t.id}" title="Eliminar" aria-label="Eliminar tarjeta">${I('trash-2')}</button>
            </div>
          </div>
        </div>`;
    },

    async _formMazoMem(mazoId, raiz) {
      const d = this._datos;
      const mazo = mazoId ? (d.mazosMem.find(m => m.id === mazoId) || null) : null;
      const iconos = ['layers', 'book-open', 'users', 'map-pin', 'calendar', 'zap', 'message-square', 'sparkles', 'archive', 'eye', 'heart', 'shield'];
      const datos = await window.helpers.formulario({
        titulo: mazo ? 'Editar mazo' : 'Crear mazo',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, valor: mazo ? mazo.nombre : '' },
          { nombre: 'descripcion', etiqueta: 'Descripción corta', valor: mazo ? (mazo.descripcion || '') : '' },
          { nombre: 'color', etiqueta: 'Color', tipo: 'select', valor: mazo ? colorMazo(mazo.color, 0) : COLORES_MAZO[0], opciones: COLORES_MAZO.map(c => ({ valor: c, texto: c })) },
          { nombre: 'icono', etiqueta: 'Icono', tipo: 'select', valor: mazo ? (mazo.icono || 'layers') : 'layers', opciones: iconos.map(ic => ({ valor: ic, texto: ic })) }
        ],
        textoConfirmar: mazo ? 'Guardar' : 'Crear'
      });
      if (!datos || !datos.nombre.trim()) return;
      const { usuario } = this._datos;
      try {
        if (mazo) {
          await window.memorizacionRepository.actualizarMazo(mazo.id, { nombre: datos.nombre.trim(), descripcion: datos.descripcion, color: datos.color, icono: datos.icono });
          window.helpers.mostrarAlerta('Mazo actualizado.', 'exito');
        } else {
          await window.memorizacionRepository.crearMazo(usuario.id, { nombre: datos.nombre.trim(), descripcion: datos.descripcion, color: datos.color, icono: datos.icono, es_global: true });
          window.helpers.mostrarAlerta('Mazo creado.', 'exito');
        }
        await window.adminRepository.registrarAuditoria('memorizacion:mazo', `${mazo ? 'Editado' : 'Creado'} mazo "${datos.nombre.trim()}"`, usuario.id).catch(() => {});
        await this._cargarMemorizacion();
        this._renderizar(raiz || document.querySelector('#app-root') || document.body);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _formTarjetaMem(tarjetaId, raiz) {
      const d = this._datos;
      const t = tarjetaId ? ((d.tarjetasMem || []).find(x => x.id === tarjetaId) || null) : null;
      const mazo = d.mazosMem.find(m => m.id === this._mazoMemActivo);
      const tipoInfo = t ? (TIPOS_TARJETA.find(x => x.valor === t.tipo) || TIPOS_TARJETA[0]) : TIPOS_TARJETA[0];
      const datos = await window.helpers.formulario({
        titulo: t ? 'Editar tarjeta' : 'Nueva tarjeta',
        mensaje: `Mazo: ${mazo ? mazo.nombre : ''}`,
        campos: [
          { nombre: 'tipo', etiqueta: 'Tipo de ejercicio', tipo: 'select', valor: t ? (t.tipo || 'versiculo') : 'versiculo', opciones: TIPOS_TARJETA.map(x => ({ valor: x.valor, texto: x.texto })) },
          { nombre: 'pregunta', etiqueta: 'Pregunta / Referencia', requerido: true, valor: t ? (t.pregunta || t.referencia || '') : '' },
          { nombre: 'respuesta', etiqueta: 'Respuesta / Texto', requerido: true, valor: t ? (t.respuesta || t.texto || '') : '' },
          { nombre: 'referencia', etiqueta: 'Referencia bíblica (opcional)', valor: t ? (t.referencia || '') : '' },
          { nombre: 'explicacion', etiqueta: 'Explicación breve (opcional)', valor: t ? (t.explicacion || '') : '' },
          { nombre: 'pista', etiqueta: 'Pista (opcional)', valor: t ? (t.pista || '') : '' }
        ],
        textoConfirmar: t ? 'Guardar' : 'Crear'
      });
      if (!datos || !datos.pregunta.trim() || !datos.respuesta.trim()) {
        if (datos) window.helpers.mostrarAlerta('Pregunta y respuesta son obligatorias.', 'advertencia');
        return;
      }
      const { usuario } = this._datos;
      try {
        if (t) {
          await window.memorizacionRepository.actualizarContenido(t.id, {
            tipo: datos.tipo, pregunta: datos.pregunta.trim(), respuesta: datos.respuesta.trim(),
            referencia: datos.referencia, explicacion: datos.explicacion, pista: datos.pista
          });
          window.helpers.mostrarAlerta('Tarjeta actualizada.', 'exito');
        } else {
          await window.memorizacionRepository.crearTarjetaGlobal({
            mazo_id: this._mazoMemActivo, tipo: datos.tipo, pregunta: datos.pregunta.trim(),
            respuesta: datos.respuesta.trim(), referencia: datos.referencia, explicacion: datos.explicacion,
            pista: datos.pista, creado_por: usuario.id
          });
          window.helpers.mostrarAlerta('Tarjeta creada.', 'exito');
        }
        await window.adminRepository.registrarAuditoria('memorizacion:tarjeta', `${t ? 'Editada' : 'Creada'} tarjeta en mazo`, usuario.id).catch(() => {});
        await this._cargarMemorizacion();
        this._renderizar(raiz || document.querySelector('#app-root') || document.body);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    _bindMemorizacion(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;
      const reRender = async () => {
        await this._cargarMemorizacion();
        this._renderizar(raiz);
      };

      // Solo cargar datos cuando la pestaña está activa
      if (this._tabActivo === 'memorizacion' && !this._datos.mazosMem) {
        this._cargarMemorizacion().then(() => this._renderizar(raiz));
      }

      r.querySelector('#btnCrearMazo')?.addEventListener('click', () => this._formMazoMem(null, raiz));
      r.querySelector('#btnVolverMazosMem')?.addEventListener('click', () => {
        this._mazoMemActivo = null;
        this._renderizar(raiz);
      });
      r.querySelector('#btnCrearTarjetaMem')?.addEventListener('click', () => this._formTarjetaMem(null, raiz));
      r.querySelector('#btnSembrarMazos')?.addEventListener('click', async () => {
        const ok = await window.helpers.confirmar('Se crearán mazos con contenido bíblico curado (Versículos, Personajes, Lugares, Cronología, Milagros, Parábolas, Curiosidades, Objetos, Profecías). Los mazos ya existentes no se duplicarán. ¿Continuar?', { titulo: 'Sembrar contenido', textoConfirmar: 'Sembrar' });
        if (!ok) return;
        try {
          const resumen = await window.memorizacionRepository.sembrarMazos(usuario.id);
          window.helpers.mostrarAlerta(`Sembrados ${resumen.mazos} mazos y ${resumen.tarjetas} tarjetas. ${resumen.omitidos.length ? 'Omitidos: ' + resumen.omitidos.join(', ') : ''}`, 'exito');
          await reRender();
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });
      r.querySelector('#btnImportarMazo')?.addEventListener('click', async () => {
        const archivo = await window.adminComunes.elegirArchivo('.json,application/json');
        if (!archivo) return;
        try {
          const res = await window.memorizacionRepository.importarMazo(usuario.id, archivo.texto);
          window.helpers.mostrarAlerta(`Mazo "${res.mazo.nombre}" importado con ${res.tarjetas} tarjetas.`, 'exito');
          await reRender();
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      r.querySelectorAll('.btn-mazo-ver').forEach(btn => {
        btn.onclick = () => { this._mazoMemActivo = btn.dataset.mazoid; this._renderizar(raiz); };
      });
      r.querySelectorAll('.btn-mazo-editar').forEach(btn => {
        btn.onclick = () => this._formMazoMem(btn.dataset.mazoid, raiz);
      });
      r.querySelectorAll('.btn-mazo-exportar').forEach(btn => {
        btn.onclick = async () => {
          try {
            const json = await window.memorizacionRepository.exportarMazo(btn.dataset.mazoid);
            window.adminComunes.descargarCSVTexto('mazo-memorizacion.json', json);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
      r.querySelectorAll('.btn-mazo-eliminar').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar el mazo "${btn.dataset.nombre}"? Las tarjetas se borrarán con él.`, { titulo: 'Eliminar mazo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.eliminarMazo(btn.dataset.mazoid);
            window.helpers.mostrarAlerta('Mazo eliminado.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-tarjeta-editar').forEach(btn => {
        btn.onclick = () => this._formTarjetaMem(btn.dataset.tid, raiz);
      });
      r.querySelectorAll('.btn-tarjeta-duplicar').forEach(btn => {
        btn.onclick = async () => {
          try {
            await window.memorizacionRepository.duplicarTarjeta(btn.dataset.tid);
            window.helpers.mostrarAlerta('Tarjeta duplicada.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
      r.querySelectorAll('.btn-tarjeta-eliminar').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Eliminar esta tarjeta?', { titulo: 'Eliminar tarjeta', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.desactivarTarjeta(btn.dataset.tid);
            window.helpers.mostrarAlerta('Tarjeta eliminada.', 'exito');
            await reRender();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    },
    _bindComun(raiz) {
      const { usuario } = this._datos;
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;

      r.querySelector('#btnExportCSV')?.addEventListener('click', async () => {
        try {
          const csv = await window.adminRepository.exportarUsuariosCSV();
          window.adminComunes.descargarCSVTexto('usuarios.csv', csv);
        } catch { window.helpers.mostrarAlerta('Error al exportar', 'error'); }
      });
      r.querySelector('#btnImportarCSV')?.addEventListener('click', async () => {
        const archivo = await window.adminComunes.elegirArchivo('.csv,text/csv');
        if (!archivo) return;
        const ok = await window.helpers.confirmar('Se crearán usuarios a partir del CSV (Nombre,Username,Contraseña,Rol,Grupo). ¿Continuar?', { titulo: 'Importar CSV', textoConfirmar: 'Importar' });
        if (!ok) return;
        try {
          const resultado = await window.adminRepository.importarUsuariosCSV(archivo.texto, usuario.id);
          const creados = (resultado.creados || []).length;
          const errores = (resultado.errores || []).length;
          if (errores) window.helpers.mostrarAlerta(`${creados} importados, ${errores} con error.`, creados ? 'advertencia' : 'error');
          else window.helpers.mostrarAlerta(`${creados} usuarios importados correctamente.`, 'exito');
          const nuevos = await window.adminRepository.listarUsuarios();
          this._datos.usuarios = nuevos;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });
    },

    _bindCentro(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;

      // Alertas y gestión pendiente → navegar con filtros
      const aplicarAccion = (accion) => {
        if (!accion) return;
        if (accion.tab === 'examenes') {
          this._tabActivo = 'examenes';
          this._renderizar(raiz);
          return;
        }
        if (accion.tab === 'grupos') {
          this._tabActivo = 'grupos';
          this._renderizar(raiz);
          return;
        }
        if (accion.tab === 'owner-sistema') {
          if ((usuario.rol || '').toString().toLowerCase() === 'owner') window.adminComunes.irPanel('owner');
          return;
        }
        // usuarios
        this._filtroRol = accion.rol || 'todos';
        this._filtroGrupo = accion.grupo || 'todos';
        this._filtroEstado = accion.estado || 'todos';
        this._buscarUsuarios = '';
        this._tabActivo = 'usuarios';
        this._renderizar(raiz);
      };

      r.querySelectorAll('[data-alerta-accion]').forEach(btn => {
        btn.onclick = () => aplicarAccion(JSON.parse(decodeURIComponent(btn.dataset.alertaAccion)));
      });
      r.querySelectorAll('[data-pendiente]').forEach(btn => {
        btn.onclick = () => aplicarAccion(JSON.parse(decodeURIComponent(btn.dataset.pendiente)));
      });

      // Accesos rápidos
      r.querySelectorAll('[data-acceso-ruta]').forEach(btn => {
        btn.onclick = () => window.adminComunes.irSpa(btn.dataset.accesoRuta);
      });
      r.querySelectorAll('[data-acceso-tab]').forEach(btn => {
        btn.onclick = () => {
          if (btn.dataset.accesoTab === 'owner-sistema') {
            if ((usuario.rol || '').toString().toLowerCase() === 'owner') window.location.href = 'panel-owner.html';
            else window.helpers.mostrarAlerta('No tienes permisos para esta sección.', 'error');
            return;
          }
          this._tabActivo = btn.dataset.accesoTab;
          this._renderizar(raiz);
        };
      });

      // Acciones rápidas
      r.querySelectorAll('[data-accion]').forEach(btn => {
        btn.onclick = async () => {
          const accion = btn.dataset.accion;
          if (accion === 'crear-usuario' || accion === 'crear-profesor' || accion === 'crear-alumno' || accion === 'crear-admin') {
            const rolPredef = accion === 'crear-profesor' ? 'editor' : accion === 'crear-alumno' ? 'usuario' : accion === 'crear-admin' ? 'admin' : null;
            await this._abrirCrearUsuario(rolPredef, raiz);
          } else if (accion === 'crear-grupo') {
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
          } else if (accion === 'crear-examen') {
            window.adminComunes.irSpa('/editor/nuevo');
          } else if (accion === 'importar-csv') {
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
          } else if (accion === 'exportar') {
            try {
              const csv = await window.adminRepository.exportarUsuariosCSV();
              window.adminComunes.descargarCSVTexto('usuarios.csv', csv);
            } catch { window.helpers.mostrarAlerta('Error al exportar', 'error'); }
          } else if (accion === 'backup') {
            if ((usuario.rol || '').toString().toLowerCase() !== 'owner') { window.helpers.mostrarAlerta('Solo el propietario puede crear copias.', 'error'); return; }
            const ok = await window.helpers.confirmar('Se creará una copia de seguridad completa de la base de datos. ¿Continuar?', { titulo: 'Crear backup', textoConfirmar: 'Crear copia' });
            if (!ok) return;
            try {
              await window.adminRepository.crearBackup(usuario.id);
              window.helpers.mostrarAlerta('Copia de seguridad creada.', 'exito');
              const backups = await window.adminRepository.listarBackups();
              this._datos.backups = backups;
              this._renderizar(raiz);
            } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          } else if (accion === 'config') {
            if ((usuario.rol || '').toString().toLowerCase() === 'owner') window.adminComunes.irPanel('owner');
            else window.adminComunes.irSpa('/perfil');
          }
        };
      });
    },

    async _abrirCrearUsuario(rolPredef, raiz) {
      const { usuario } = this._datos;
      const grupos = this._datos.grupos;
      const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
      const opcionesRol = this._opcionesRolPermitidas(usuario);
      const datos = await window.helpers.formulario({
        titulo: rolPredef === 'editor' ? 'Crear profesor' : rolPredef === 'usuario' ? 'Crear alumno' : rolPredef === 'admin' ? 'Crear administrador' : 'Crear usuario',
        campos: [
          { nombre: 'nombre_completo', etiqueta: 'Nombre completo', requerido: true },
          { nombre: 'username', etiqueta: 'Username (único)', requerido: true, placeholder: 'ej: ana.2024' },
          { nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
          { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', valor: rolPredef || 'usuario', opciones: opcionesRol },
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

    _bindUsuarios(raiz) {
      const { usuarios, usuario } = this._datos;
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;

      // Search en tiempo real
      const inpBuscar = r.querySelector('#buscarUsuarios');
      if (inpBuscar) {
        inpBuscar.addEventListener('input', (e) => {
          this._buscarUsuarios = e.target.value;
          this._pagUsuarios = 1;
          this._seleccion.clear();
          this._renderizar(raiz);
        });
      }

      // Filtros y orden
      r.querySelector('#filtroRolUsuarios')?.addEventListener('change', (e) => { this._filtroRol = e.target.value; this._pagUsuarios = 1; this._renderizar(raiz); });
      r.querySelector('#filtroGrupoUsuarios')?.addEventListener('change', (e) => { this._filtroGrupo = e.target.value; this._pagUsuarios = 1; this._renderizar(raiz); });
      r.querySelector('#filtroEstadoUsuarios')?.addEventListener('change', (e) => { this._filtroEstado = e.target.value; this._pagUsuarios = 1; this._renderizar(raiz); });
      r.querySelector('#ordenUsuarios')?.addEventListener('change', (e) => { this._ordenUsuarios = e.target.value; this._renderizar(raiz); });

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
        await this._abrirCrearUsuario(null, raiz);
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
                await window.adminRepository.eliminarUsuario(u.id, usuario.id);
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

      // Cambiar grupo
      r.querySelectorAll('.btn-cambiar-grupo').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          const opcionesGrupo = [{ valor: '', texto: 'Sin grupo' }].concat((this._datos.grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
          const datos = await window.helpers.formulario({
            titulo: 'Cambiar grupo',
            mensaje: `Selecciona el nuevo grupo para ${u.nombre_completo}.`,
            campos: [{ nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: u.grupo_id || '', opciones: opcionesGrupo }],
            textoConfirmar: 'Guardar'
          });
          if (!datos) return;
          try {
            await window.adminRepository.actualizarUsuario(u.id, { nombre_completo: u.nombre_completo, username: u.username, rol: u.rol, grupo_id: datos.grupo_id || null });
            await window.adminRepository.registrarAuditoria('usuario:grupo', `Grupo de "${u.nombre_completo}" actualizado`, usuario.id);
            window.helpers.mostrarAlerta('Grupo actualizado.', 'exito');
            const nuevos = await window.adminRepository.listarUsuarios();
            this._datos.usuarios = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
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

      // Suspender / reactivar
      r.querySelectorAll('.btn-toggle-activo').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          const nuevo = btn.dataset.activo === '1' ? false : true;
          const ok = await window.helpers.confirmar(nuevo ? `¿Reactivar a "${u.nombre_completo}"?` : `¿Suspender a "${u.nombre_completo}"? Dejará de poder acceder.`, {
            titulo: nuevo ? 'Reactivar usuario' : 'Suspender usuario', textoConfirmar: nuevo ? 'Reactivar' : 'Suspender'
          });
          if (!ok) return;
          try {
            await window.adminRepository.toggleActivo(u.id, nuevo);
            await window.adminRepository.registrarAuditoria(nuevo ? 'usuario:activar' : 'usuario:suspender', `Usuario "${u.nombre_completo}" ${nuevo ? 'reactivado' : 'suspendido'}`, usuario.id);
            window.helpers.mostrarAlerta(nuevo ? 'Usuario reactivado.' : 'Usuario suspendido.', 'exito');
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
            await window.adminRepository.eliminarUsuario(btn.dataset.id, usuario.id);
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
              <div class="perfil-fila"><span class="perfil-fila__label">Última conexión</span><span class="perfil-fila__valor u-fs-xs">${u.ultimo_acceso ? window.adminComunes.tiempoRelativoPreciso(u.ultimo_acceso) : '—'}</span></div>
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
      const { grupos, usuarios, usuario } = this._datos;

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

      const verGrupo = async (gid) => {
        const grupo = grupos.find(g => g.id === gid);
        if (!grupo) return;
        await window.adminComunes.abrirModalGrupo(grupo);
      };

      r.querySelectorAll('.btn-ver-grupo-admin, .btn-gestionar-grupo').forEach(el => {
        el.onclick = async (e) => {
          e.stopPropagation();
          await verGrupo(el.dataset.gid);
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

    _bindExamenes(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;
      const examenes = () => this._datos.examenes;

      r.querySelectorAll('.btn-editar-examen').forEach(btn => {
        btn.onclick = () => window.adminComunes.irSpa('/editor/' + btn.dataset.id);
      });

      r.querySelectorAll('.btn-duplicar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ex = examenes().find(x => x.id === btn.dataset.id);
          const ok = await window.helpers.confirmar(`¿Duplicar "${ex?.titulo}"? Se creará una copia en borrador.`, { titulo: 'Duplicar examen', textoConfirmar: 'Duplicar' });
          if (!ok) return;
          try {
            await window.adminRepository.duplicarExamen(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('examen:duplicar', `Examen "${ex?.titulo}" duplicado`, usuario.id);
            window.helpers.mostrarAlerta('Examen duplicado.', 'exito');
            const nuevos = await window.adminRepository.listarExamenes();
            this._datos.examenes = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-publicar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ex = examenes().find(x => x.id === btn.dataset.id);
          const ok = await window.helpers.confirmar(`¿Publicar "${ex?.titulo}"? Los alumnos del grupo podrán verlo.`, { titulo: 'Publicar examen', textoConfirmar: 'Publicar' });
          if (!ok) return;
          try {
            await window.adminRepository.publicarExamen(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('examen:publicar', `Examen "${ex?.titulo}" publicado`, usuario.id);
            window.helpers.mostrarAlerta('Examen publicado.', 'exito');
            const nuevos = await window.adminRepository.listarExamenes();
            this._datos.examenes = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      r.querySelectorAll('.btn-ver-resultados').forEach(btn => {
        btn.onclick = () => window.adminComunes.irSpa('/calificaciones');
      });

      r.querySelectorAll('.btn-eliminar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar el examen "${btn.dataset.titulo}"? Se borrarán también sus respuestas.`, { titulo: 'Eliminar examen', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.adminRepository.eliminarExamen(btn.dataset.id);
            await window.adminRepository.registrarAuditoria('examen:eliminar', `Examen "${btn.dataset.titulo}" eliminado`, usuario.id);
            window.helpers.mostrarAlerta('Examen eliminado.', 'exito');
            const nuevos = await window.adminRepository.listarExamenes();
            this._datos.examenes = nuevos;
            this._renderizar(raiz);
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
    }
  };
})();
