(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  const rolBonito = (rol) => window.adminComunes.rolBonito(rol);
  const TR = (iso) => window.adminComunes.tiempoRelativo(iso);
  const TRP = (iso) => window.adminComunes.tiempoRelativoPreciso(iso);

  /* El admin responsable solo gestiona su clase. */
  const TABS_ADMIN = [
    { id: 'centro', icono: 'command', texto: 'Mi clase' },
    { id: 'usuarios', icono: 'users', texto: 'Usuarios' },
    { id: 'examenes', icono: 'file-text', texto: 'Exámenes' }
  ];

  /* El owner concentra toda la administración global, incluida la gestión
     que no debe exponerse a responsables de clase. */
  const TABS_OWNER = [
    { id: 'centro', icono: 'command', texto: 'Centro' },
    { id: 'usuarios', icono: 'users', texto: 'Usuarios' },
    { id: 'grupos', icono: 'layout', texto: 'Grupos' },
    { id: 'examenes', icono: 'file-text', texto: 'Exámenes' },
    { id: 'memorizacion', icono: 'brain', texto: 'Memorización' },
    { id: 'sugerencias', icono: 'message-square', texto: 'Sugerencias' },
    { id: 'auditoria', icono: 'clipboard-list', texto: 'Auditoría' },
    { id: 'admins', icono: 'shield', texto: 'Administradores' },
    { id: 'marca', icono: 'palette', texto: 'Marca' },
    { id: 'notificaciones', icono: 'bell', texto: 'Notificaciones' },
    { id: 'sistema', icono: 'database', texto: 'Sistema' }
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

  /* Filtro temporal de auditoría (hoy / semana / mes / todos) */
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

  window.vistaPanelAdmin = {
    _rangoRol(rol) {
      switch ((rol || '').toString().trim().toLowerCase()) {
        case 'owner': return 4;
        case 'admin': return 3;
        case 'editor': return 2;
        default: return 1;
      }
    },
    _esOwnerActor(actor) {
      return ((actor && actor.rol) || '').toString().trim().toLowerCase() === 'owner';
    },
    _puedeEliminar(actor, objetivo) {
      if (!actor || !objetivo) return false;
      if (actor.id === objetivo.id) return false;
      if (this._rangoRol(actor.rol) <= this._rangoRol(objetivo.rol)) return false;
      // Admin solo puede eliminar usuarios de su grupo
      if (!this._esOwnerActor(actor) && actor.grupo_id && objetivo.grupo_id !== actor.grupo_id) return false;
      return true;
    },
    _puedeEditar(actor, objetivo) {
      if (!actor || !objetivo) return false;
      if (this._rangoRol(actor.rol) <= this._rangoRol(objetivo.rol)) return false;
      // Admin solo puede editar usuarios de su grupo
      if (!this._esOwnerActor(actor) && actor.grupo_id && objetivo.grupo_id !== actor.grupo_id) return false;
      return true;
    },
    _opcionesRolPermitidas(actor) {
      return [
        { valor: 'usuario', texto: 'Alumno' },
        { valor: 'editor', texto: 'Profesor (editor)' },
        { valor: 'admin', texto: 'Administrador' },
        { valor: 'owner', texto: 'Propietario' }
      ].filter(o => this._rangoRol(o.valor) < this._rangoRol(actor.rol));
    },
    _esOwner() {
      return ((this._datos && this._datos.usuario && this._datos.usuario.rol) || '').toString().toLowerCase() === 'owner';
    },
    _volver() {
      // En la página standalone no hay rutas registradas: usar hook si existe, si no router.
      window.adminComunes.volver(this);
    },
    async montar(raiz, contextoVista) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'owner'].includes((usuario.rol || '').toString().trim().toLowerCase())) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="window.vistaPanelAdmin._volver()">Volver</button></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(8, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel...</p></div>';
      this._inicioSesion = Date.now();
      try {
        const esOwner = ((usuario.rol || '').toString().trim().toLowerCase()) === 'owner';
        const [usuariosRaw, gruposRaw, examenesRaw, stats, auditoria, resumenExamenes, backups, config, sugerencias] = await Promise.all(
          esOwner
            ? [
                window.adminRepository.listarUsuarios(usuario),
                window.adminRepository.listarGrupos(usuario),
                window.adminRepository.listarExamenes(usuario),
                window.adminRepository.statsGenerales(usuario),
                window.adminRepository.obtenerAuditoria(),
                window.adminRepository.obtenerResumenExamenes(),
                window.adminRepository.listarBackups(),
                window.adminRepository.listarConfiguracion(),
                window.sugerenciasRepository ? window.sugerenciasRepository.listarTodas() : Promise.resolve([])
              ]
            : [
                window.adminRepository.listarUsuarios(usuario),
                window.adminRepository.listarGrupos(usuario),
                window.adminRepository.listarExamenes(usuario),
                window.adminRepository.statsGenerales(usuario),
                Promise.resolve([]),
                window.adminRepository.obtenerResumenExamenes(),
                Promise.resolve([]),
                Promise.resolve({}),
                Promise.resolve([])
              ]
        );

        // Admins solo ven datos de su grupo. El owner ve todo.
        let usuarios = usuariosRaw, grupos = gruposRaw, examenes = examenesRaw;
        if (!esOwner) {
          if (usuario.grupo_id) {
            const gid = usuario.grupo_id;
            usuarios = usuariosRaw.filter(u => u.id === usuario.id || u.grupo_id === gid);
            grupos = gruposRaw.filter(g => g.id === gid);
            examenes = examenesRaw.filter(ex => ex.grupo_id === gid);
          } else {
            // Admin sin grupo asignado: no ve nada hasta que se le asigne uno
            usuarios = [];
            grupos = [];
            examenes = [];
          }
        }
        this._datos = { usuarios, grupos, examenes, stats, auditoria, resumenExamenes, backups, config, sugerencias, usuario };
        this._nivelActivo = esOwner ? 'owner' : 'admin';
        this._tabActivo = 'centro';
        // Deep link desde Memorización: /admin?tab=memorizacion&mazo=ID abre la gestión del mazo
        const q = contextoVista && contextoVista.query;
        const qVal = (k) => (q && typeof q.get === 'function') ? q.get(k) : (q ? q[k] : null);
        const tabQ = qVal('tab');
        if (tabQ) {
          this._tabActivo = tabQ;
          if (esOwner) this._nivelActivo = 'owner';
          const mazoQ = qVal('mazo');
          if (mazoQ && this._tabActivo === 'memorizacion' && esOwner) this._mazoDeepLink = mazoQ;
        }
        this._pagUsuarios = 1;
        this._porPagina = 50;
        this._buscarUsuarios = '';
        this._filtroRol = 'todos';
        this._filtroGrupo = 'todos';
        this._filtroEstado = 'todos';
        this._ordenUsuarios = 'actividad';
        this._buscarExamenes = '';
        this._filtroExamenEstado = 'todos';
        this._filtroExamenGrupo = 'todos';
        this._filtroAuditoria = 'todos';
        this._busquedaAuditoria = '';
        this._filtroSugerencias = 'todas';
        this._seleccion = new Set();
        this._logoPendiente = null;
        // Aplicar la marca configurada (nombre del centro)
        if (config && config.marca_nombre) document.title = config.marca_nombre;
        this._renderizar(raiz);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    _renderNivelSwitch() {
      const niveles = [
        { id: 'owner', icono: 'globe', texto: 'Administración general', rol: 'Owner' },
        { id: 'admin', icono: 'layout', texto: 'Gestión del centro', rol: 'Admin' }
      ];
      return `
        <div class="admin-nivel" role="tablist" aria-label="Nivel de administración">
          ${niveles.map(n => `
            <button class="admin-nivel__btn${this._nivelActivo === n.id ? ' admin-nivel__btn--activo' : ''}" data-nivel="${n.id}" role="tab" aria-selected="${this._nivelActivo === n.id}">
              ${I(n.icono)} ${n.texto} <span class="admin-nivel__rol">${n.rol}</span>
            </button>`).join('')}
        </div>`;
    },

    _renderizar(raiz) {
      const esOwner = this._esOwner();
      const tabs = this._nivelActivo === 'owner' ? TABS_OWNER : TABS_ADMIN;
      if (!tabs.some(t => t.id === this._tabActivo)) this._tabActivo = 'centro';
      const config = this._datos.config || {};
      const marca = { nombre: config.marca_nombre || '', logo: config.marca_logo || '' };
      const descripcionPanel = esOwner
        ? 'Gestiona toda la plataforma: usuarios, clases, exámenes, contenido y sistema.'
        : 'Gestiona únicamente los usuarios y exámenes de tu clase.';
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg admin-panel" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${window.adminComunes.cabeceraPanel('Centro de Administración', descripcionPanel, 'vistaPanelAdmin', marca)}
          ${esOwner ? this._renderNivelSwitch() : ''}
          <div class="admin-tabs" role="tablist" aria-label="Secciones">${tabs.map(t => `
            <button class="admin-tab${this._tabActivo === t.id ? ' admin-tab--activo' : ''}" data-tab="${t.id}" role="tab" aria-selected="${this._tabActivo === t.id}">${I(t.icono)} ${t.texto}</button>`
          ).join('')}</div>
          <div id="adminContenido">${this._renderTabContent(raiz)}</div>
        </div>`;
      window.adminComunes.bindTabs(this, raiz);
      raiz.querySelectorAll('[data-nivel]').forEach(btn => {
        btn.onclick = () => {
          this._nivelActivo = btn.dataset.nivel;
          this._tabActivo = 'centro';
          this._renderizar(raiz);
        };
      });
      this._bindTabContent(raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    _renderTabContent(raiz) {
      const { usuarios, grupos, examenes, usuario } = this._datos;      if (this._nivelActivo === 'owner') {
        switch (this._tabActivo) {
          case 'centro': return this._renderCentro();
          case 'usuarios': return this._renderUsuarios(usuarios, usuario);
          case 'grupos': return this._renderGrupos(grupos, examenes, usuarios);
          case 'examenes': return this._renderExamenes(examenes);
          case 'memorizacion': return this._renderMemorizacion();
          case 'sugerencias': return this._renderSugerencias();
          case 'auditoria': return this._renderAuditoria();
          case 'admins': return this._renderAdmins(usuarios, usuario);
          case 'marca': return this._renderMarca();
          case 'notificaciones': return this._renderNotificaciones();
          case 'sistema': return this._renderSistema();
          default: return '';
        }
      }
      switch (this._tabActivo) {
        case 'centro': return this._renderCentro();
        case 'usuarios': return this._renderUsuarios(usuarios, usuario);
        case 'examenes': return this._renderExamenes(examenes);
        default: return '';
      }
    },

    // ==================================================================
    // CENTRO — Dashboard rediseñado (Vista General + Tareas + Herramientas)
    // ==================================================================
    _renderCentro() {
      const { usuarios, grupos, examenes, stats } = this._datos;
      const esOwner = this._esOwner();
      const { porRol } = stats;
      const resumenEx = this._datos.resumenExamenes || {};

      const activos = usuarios.filter(u => u.activo !== false).length;
      const bloqueados = usuarios.filter(u => u.activo === false).length;
      const online = usuarios.filter(u => u.activo !== false && u.ultimo_acceso && (Date.now() - new Date(u.ultimo_acceso).getTime()) < 300000).length;
      const alumnos = porRol.usuario || 0;
      const profesores = porRol.editor || 0;
      const publicados = examenes.filter(e => e.estado === 'publicado').length;
      const borradores = examenes.filter(e => e.estado === 'borrador').length;
      const mediaGlobal = this._mediaGlobal();
      const totalPendientesEx = Object.values(resumenEx).reduce((a, r) => a + (r.pendientes || 0), 0);
      const donutTotal = activos + bloqueados;
      const pctActivos = donutTotal ? Math.round(activos * 100 / donutTotal) : 0;

      // ---- Tareas pendientes (fusión de Alertas + Gestión pendiente) ----
      const inactivos = usuarios.filter(u => u.activo === false);
      const profesoresSinGrupo = usuarios.filter(u => u.rol === 'editor' && !u.grupo_id);
      const alumnosSinGrupo = usuarios.filter(u => u.rol === 'usuario' && !u.grupo_id);
      const sinPublicar = examenes.filter(e => e.estado !== 'publicado');
      const gruposSinExamenes = grupos.filter(g => !examenes.some(ex => ex.grupo_id === g.id));

      const pendientes = [];
      const tarea = (tipo, icono, titulo, meta, accion) => ({ tipo, icono, titulo, meta, accion });
      if (inactivos.length) pendientes.push(tarea('aviso', 'user-x', `${inactivos.length} usuario${inactivos.length !== 1 ? 's' : ''} pendiente${inactivos.length !== 1 ? 's' : ''} de activar`, 'Usuarios sin acceso a la plataforma', { tab: 'usuarios', rol: 'todos', grupo: 'todos', estado: 'inactivos' }));
      if (profesoresSinGrupo.length) pendientes.push(tarea('info', 'book-open', `${profesoresSinGrupo.length} profesor${profesoresSinGrupo.length !== 1 ? 'es' : ''} sin grupo`, 'Sin asignación a una clase', { tab: 'usuarios', rol: 'editor', grupo: 'sin-grupo', estado: 'todos' }));
      if (sinPublicar.length) pendientes.push(tarea('info', 'file-text', `${sinPublicar.length} examen${sinPublicar.length !== 1 ? 'es' : ''} sin publicar`, 'Quedaron en borrador', { tab: 'examenes', estado: 'borrador' }));
      if (this._esOwner() && gruposSinExamenes.length) pendientes.push(tarea('info', 'layout', `${gruposSinExamenes.length} grupo${gruposSinExamenes.length !== 1 ? 's' : ''} sin exámenes`, 'Clases aún sin evaluaciones', { tab: 'grupos' }));
      if (alumnosSinGrupo.length) pendientes.push(tarea('aviso', 'user', `${alumnosSinGrupo.length} alumno${alumnosSinGrupo.length !== 1 ? 's' : ''} sin grupo`, 'Sin asignación a una clase', { tab: 'usuarios', rol: 'usuario', grupo: 'sin-grupo', estado: 'todos' }));

      const tareasHtml = pendientes.length === 0
        ? `<div class="admin-todo-al-dia">
            <span class="admin-todo-al-dia__icono">${I('check-circle')}</span>
            <div>
              <p class="admin-todo-al-dia__titulo">Todo al día</p>
              <p class="admin-todo-al-dia__meta">No hay alertas ni tareas que requieran tu atención</p>
            </div>
          </div>`
        : `<div class="admin-pendiente">${pendientes.map(p => `
            <div class="admin-pendiente__item">
              <span class="admin-pendiente__icono admin-pendiente__icono--${p.tipo}">${I(p.icono)}</span>
              <div class="admin-pendiente__info">
                <p class="admin-pendiente__titulo">${E(p.titulo)}</p>
                <p class="admin-pendiente__meta">${E(p.meta)}</p>
              </div>
              <button class="btn-secundario u-fs-xs admin-pendiente__btn" data-pendiente="${encodeURIComponent(JSON.stringify(p.accion))}">${I('check')} Resolver</button>
            </div>`).join('')}</div>`;

      // ---- Vista General del Centro (stats + gráfico alumnos) ----
      const stat = (icono, valor, etiqueta, claseIcono = '') => `
        <div class="tarjeta-estadistica">
          <div class="tarjeta-estadistica__icono ${claseIcono}">${I(icono)}</div>
          <div class="tarjeta-estadistica__info">
            <p class="tarjeta-estadistica__valor">${valor}</p>
            <p class="tarjeta-estadistica__etiqueta">${etiqueta}</p>
          </div>
        </div>`;
      const vistaGeneralHtml = `
        <div class="admin-vista-general">
          <div class="admin-vista-general__stats">
            ${stat('user-check', activos, 'Usuarios activos', 'admin-stat--ok')}
            ${stat('wifi', online, 'En línea ahora', 'admin-stat--ok')}
            ${stat('user-x', bloqueados, 'Bloqueados', 'admin-stat--error')}
            ${stat('layout', grupos.length, esOwner ? 'Grupos' : 'Clase')}
            ${stat('check-circle', publicados, 'Exámenes publicados', 'admin-stat--ok')}
            ${stat('graduation-cap', alumnos, 'Alumnos')}
            ${stat('book-open', profesores, 'Profesores')}
            ${stat('clipboard-check', mediaGlobal !== null ? mediaGlobal.toFixed(1) : '—', 'Nota media')}
            ${stat('clock', totalPendientesEx, 'Por corregir', 'admin-stat--aviso')}
          </div>
          <div class="admin-vista-general__chart">
            <div class="admin-donut" style="background:conic-gradient(var(--color-exito) 0% ${pctActivos}%, var(--color-error) ${pctActivos}% 100%)" role="img" aria-label="Estado de los alumnos: ${activos} activos, ${bloqueados} bloqueados">
              <div class="admin-donut__centro">
                <span class="admin-donut__valor">${donutTotal}</span>
                <span class="admin-donut__etiqueta">alumnos</span>
              </div>
            </div>
            <div class="admin-donut-leyenda">
              <p class="admin-donut-leyenda__titulo">Estado de los alumnos</p>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--ok"></span>Activos · ${activos}</span>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--error"></span>Bloqueados · ${bloqueados}</span>
              <span class="admin-donut-leyenda__item"><span class="admin-dot admin-dot--neutro"></span>Borradores · ${borradores}</span>
            </div>
          </div>
        </div>`;

      // ---- Acceso a Herramientas (4 tarjetas grandes con mini-acciones) ----
      const herramientas = [
        { id: 'usuarios', icono: 'users', color: 'azul', titulo: 'Usuarios', sub: `${usuarios.length} registrados`, mini: [
            { id: 'crear-alumno', icono: 'user-plus', texto: 'Crear alumno' },
            { id: 'crear-profesor', icono: 'book-open', texto: 'Crear profesor' },
            { id: 'importar-csv', icono: 'upload', texto: 'Importar CSV' }
        ]},
        { id: 'grupos', icono: 'layout', color: 'verde', titulo: 'Grupos', sub: `${grupos.length} clases`, mini: [
            { id: 'crear-grupo', icono: 'plus', texto: 'Crear grupo' },
            { id: 'ver-grupos', icono: 'eye', texto: 'Ver todos' },
            { id: 'ver-examenes', icono: 'file-text', texto: 'Ver exámenes' }
        ]},
        { id: 'examenes', icono: 'file-text', color: 'violeta', titulo: 'Exámenes', sub: `${publicados} publicados`, mini: [
            { id: 'crear-examen', icono: 'plus', texto: 'Crear examen' },
            { id: 'ver-publicados', icono: 'check-circle', texto: 'Publicados' },
            { id: 'ver-borradores', icono: 'edit-3', texto: 'Borradores' }
        ]},
        { id: 'memorizacion', icono: 'brain', color: 'naranja', titulo: 'Memorización', sub: 'Mazos y tarjetas', mini: [
            { id: 'crear-mazo', icono: 'plus', texto: 'Crear mazo' },
            { id: 'sembrar-mazos', icono: 'sparkles', texto: 'Sembrar contenido' },
            { id: 'importar-mazo', icono: 'upload', texto: 'Importar mazo' }
        ]}
      ];
      const herramientasVisibles = this._esOwner()
        ? herramientas
        : herramientas.filter(h => h.id === 'usuarios' || h.id === 'examenes');
      const herramientasHtml = `
        <div class="admin-herramientas">
          ${herramientasVisibles.map(h => `
            <div class="admin-herramienta admin-herramienta--${h.color}" data-herramienta-tab="${h.id}" role="button" tabindex="0" aria-label="Abrir ${h.titulo}">
              <div class="admin-herramienta__cabecera">
                <span class="admin-herramienta__icono">${I(h.icono)}</span>
                <div class="admin-herramienta__info">
                  <p class="admin-herramienta__titulo">${h.titulo}</p>
                  <p class="admin-herramienta__sub">${h.sub}</p>
                </div>
                <span class="admin-herramienta__flecha">${I('chevron-right')}</span>
              </div>
              <div class="admin-herramienta__mini">
                ${h.mini.map(m => `<button class="admin-herramienta__mini-btn" data-mini="${m.id}">${I(m.icono)} ${m.texto}</button>`).join('')}
              </div>
            </div>`).join('')}
        </div>`;

      return `
        <div class="admin-centro">
          ${window.adminComunes.seccion({ icono: 'bar-chart-2', iconoClase: 'admin-seccion__icono--acento', titulo: esOwner ? 'Vista General del Centro' : 'Vista General de tu Clase', desc: esOwner ? 'Estado actual de toda la plataforma' : 'Estado actual de tu clase', contenido: vistaGeneralHtml })}
          ${window.adminComunes.seccion({ icono: 'list-todo', iconoClase: pendientes.length ? 'admin-seccion__icono--aviso' : 'admin-seccion__icono--exito', titulo: 'Tareas Pendientes', desc: 'Alertas y acciones que requieren tu atención', contador: pendientes.length ? String(pendientes.length) : '', contenido: tareasHtml })}
          ${window.adminComunes.seccion({ icono: 'zap', iconoClase: 'admin-seccion__icono--acento', titulo: 'Acceso a Herramientas', desc: 'Toca una tarjeta para abrir su lista completa', contenido: herramientasHtml })}
        </div>`;
    },

    _tiempoActivo() { return window.adminComunes.tiempoActivo(this._inicioSesion); },
    _mediaGlobal() { return window.adminComunes.mediaGlobal(this._datos.resumenExamenes); },

    // ==================================================================
    // USUARIOS — lista rediseñada (cabecera sticky + filtros pill + fichas)
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
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${I('users')} Usuarios <span class="admin-lista-cabecera__contador">(${usuarios.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-secundario u-fs-xs" id="btnImportarCSV">${I('upload')} Importar</button>
              <button class="btn-secundario u-fs-xs" id="btnExportCSV">${I('download')} CSV</button>
              <button class="btn-primario u-fs-xs" id="btnCrearUsuario">${I('user-plus')} Crear usuario</button>
            </div>
          </div>

          <div class="admin-filtros-pill">
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${I('search')}</span>
              <input type="text" id="buscarUsuarios" placeholder="Buscar por nombre, username o rol..." value="${E(this._buscarUsuarios)}" aria-label="Buscar usuarios">
            </div>
            <select class="admin-filtro-pill" id="filtroRolUsuarios" aria-label="Filtrar por rol">
              <option value="todos">Todos los roles</option>
              ${this._opcionesRolPermitidas(usuario).map(o => `<option value="${o.valor}" ${this._filtroRol === o.valor ? 'selected' : ''}>${o.texto}</option>`).join('')}
            </select>
            <select class="admin-filtro-pill" id="filtroGrupoUsuarios" aria-label="Filtrar por grupo">
              ${opcionesGrupo.map(g => `<option value="${g.valor}" ${this._filtroGrupo === g.valor ? 'selected' : ''}>${g.texto}</option>`).join('')}
            </select>
            <select class="admin-filtro-pill" id="filtroEstadoUsuarios" aria-label="Filtrar por estado">
              <option value="todos" ${this._filtroEstado === 'todos' ? 'selected' : ''}>Estado: todos</option>
              <option value="activos" ${this._filtroEstado === 'activos' ? 'selected' : ''}>Activos</option>
              <option value="inactivos" ${this._filtroEstado === 'inactivos' ? 'selected' : ''}>Bloqueados</option>
            </select>
            <select class="admin-filtro-pill" id="ordenUsuarios" aria-label="Ordenar usuarios">
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
                ${pagina.map(u => this._renderUsuarioFicha(u, usuario)).join('')}
              </div>`}

          ${filtrados.length > this._porPagina ? this._renderPaginacion(pag, totalPag, 'pagUsuarios') : ''}
        </div>`;
    },

    // Ficha unificada: fila 1 avatar/nombre/badge + menú ⋯, fila 2 info, fila 3 acciones
    _renderUsuarioFicha(u, actor) {
      const inicial = (u.nombre_completo || u.username || '?').charAt(0).toUpperCase();
      const foto = u.foto_perfil;
      const activo = u.activo !== false;
      const puedeEditar = this._puedeEditar(actor, u);
      const puedeEliminar = this._puedeEliminar(actor, u);
      const sel = this._seleccion.has(u.id);
      const grupoNombre = u.grupo_id ? (this._datos.grupos.find(g => g.id === u.grupo_id)?.nombre || '') : '';
      const ultima = u.ultimo_acceso || u.creado_en;
      // ¿En línea? ultimo_acceso en los últimos 5 minutos
      const online = u.ultimo_acceso && (Date.now() - new Date(u.ultimo_acceso).getTime()) < 300000;
      const estadoHtml = !activo
        ? '<span class="admin-tabla-badge admin-tabla-badge--inactivo">Bloqueado</span>'
        : online
          ? '<span class="admin-tabla-badge admin-tabla-badge--online">En línea</span>'
          : '<span class="admin-tabla-badge admin-tabla-badge--offline">Desconectado</span>';
      return `
        <article class="admin-ficha${!activo ? ' admin-ficha--inactiva' : ''}" data-id="${u.id}" data-nombre="${E(u.nombre_completo)}" data-username="${E(u.username)}" data-rol="${u.rol}">
          <div class="admin-ficha__cabecera">
            <label class="admin-select-all-wrap" style="margin-right:2px" aria-label="Seleccionar a ${E(u.nombre_completo)}">
              <input type="checkbox" class="admin-select-cb" data-sel-id="${u.id}" ${sel ? 'checked' : ''}>
            </label>
            <span class="admin-ficha__avatar" data-ver-detalle="${u.id}" title="Ver detalle">${foto ? `<img src="${E(foto)}" alt="">` : inicial}</span>
            <div class="admin-ficha__info" data-ver-detalle="${u.id}">
              <p class="admin-ficha__nombre">${E(u.nombre_completo)}</p>
              <p class="admin-ficha__username">@${E(u.username)} · ${rolBonito(u.rol)}</p>
            </div>
            ${estadoHtml}
            <div class="admin-ficha__menu">
              <button class="btn-icono btn-ficha-menu" data-menu="${u.id}" aria-label="Más opciones de ${E(u.nombre_completo)}" aria-expanded="false">${I('more-horizontal')}</button>
              <div class="admin-ficha__menu-pop" data-menupop="${u.id}" hidden>
                ${puedeEditar ? `<button class="admin-ficha__menu-item btn-cambiar-rol" data-id="${u.id}" data-rol="${u.rol}">${I('shield')} Cambiar rol</button>` : ''}
                ${puedeEditar ? `<button class="admin-ficha__menu-item btn-cambiar-grupo" data-id="${u.id}">${I('layout')} Cambiar grupo</button>` : ''}
                <button class="admin-ficha__menu-item btn-toggle-activo" data-id="${u.id}" data-activo="${activo ? '1' : '0'}">${activo ? I('pause-circle') + ' Suspender' : I('play-circle') + ' Reactivar'}</button>
              </div>
            </div>
          </div>
          <div class="admin-ficha__fila">
            <span class="admin-ficha__fila-item">${I('layout')} ${E(grupoNombre || 'Sin grupo')}</span>
            <span class="admin-ficha__fila-item">${I('clock')} Últ. conexión: ${TR(ultima)}</span>
          </div>
          <div class="admin-ficha__acciones">
            ${puedeEditar ? `<button class="btn-primario u-fs-xs btn-editar-usuario" data-id="${u.id}">${I('edit-3')} Editar</button>` : ''}
            <button class="btn-secundario u-fs-xs btn-ver-detalle" data-id="${u.id}">${I('eye')} Ver detalles</button>
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
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${I('layout')} Grupos <span class="admin-lista-cabecera__contador">(${grupos.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-primario u-fs-xs" id="btnCrearGrupo">${I('plus')} Crear grupo</button>
            </div>
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
    // EXÁMENES — tarjetas con métrica en una fila
    // ==================================================================
    _examenesFiltrados() {
      const { examenes, grupos } = this._datos;
      const q = this._buscarExamenes.toLowerCase().trim();
      let lista = examenes;
      if (q) lista = lista.filter(ex => (ex.titulo || '').toLowerCase().includes(q) || (ex.materia || '').toLowerCase().includes(q));
      if (this._filtroExamenEstado !== 'todos') lista = lista.filter(ex => ex.estado === this._filtroExamenEstado);
      if (this._filtroExamenGrupo !== 'todos') lista = lista.filter(ex => ex.grupo_id === this._filtroExamenGrupo);
      return lista;
    },

    _renderExamenes(examenes) {
      const resumen = this._datos.resumenExamenes || {};
      const { grupos } = this._datos;
      const filtrados = this._examenesFiltrados();
      const publicado = examenes.filter(e => e.estado === 'publicado').length;
      const borrador = examenes.filter(e => e.estado === 'borrador').length;
      const opcionesGrupo = [{ valor: 'todos', texto: 'Todos los grupos' }].concat((grupos || []).map(g => ({ valor: g.id, texto: g.nombre })));
      return `
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${I('file-text')} Exámenes <span class="admin-lista-cabecera__contador">(${examenes.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <span class="u-fs-xs u-color-texto-terciario">${publicado} publicados · ${borrador} borradores</span>
              <button class="btn-primario u-fs-xs" id="btnCrearExamen">${I('plus')} Crear examen</button>
            </div>
          </div>

          <div class="admin-filtros-pill">
            <div class="admin-buscar">
              <span class="admin-buscar__icono">${I('search')}</span>
              <input type="text" id="buscarExamenes" placeholder="Buscar por título o materia..." value="${E(this._buscarExamenes)}" aria-label="Buscar exámenes">
            </div>
            <select class="admin-filtro-pill" id="filtroExamenEstado" aria-label="Filtrar por estado">
              <option value="todos" ${this._filtroExamenEstado === 'todos' ? 'selected' : ''}>Estado: todos</option>
              <option value="publicado" ${this._filtroExamenEstado === 'publicado' ? 'selected' : ''}>Publicados</option>
              <option value="borrador" ${this._filtroExamenEstado === 'borrador' ? 'selected' : ''}>Borradores</option>
            </select>
            <select class="admin-filtro-pill" id="filtroExamenGrupo" aria-label="Filtrar por grupo">
              ${opcionesGrupo.map(g => `<option value="${g.valor}" ${this._filtroExamenGrupo === g.valor ? 'selected' : ''}>${g.texto}</option>`).join('')}
            </select>
          </div>

          ${filtrados.length === 0
            ? window.adminComunes.vacio('file-text', 'Sin exámenes para mostrar', 'Crea un examen desde el editor o ajusta los filtros.')
            : `<div class="admin-grid-tarjetas">
                ${filtrados.map(ex => this._renderExamenFicha(ex, resumen[ex.id])).join('')}
              </div>`}
        </div>`;
    },

    _renderExamenFicha(ex, r) {
      const autor = ex.perfiles?.nombre_completo
        || this._datos.usuarios.find(u => u.id === ex.creado_por)?.nombre_completo
        || 'Autor desconocido';
      const grupo = ex.grupos?.nombre
        || this._datos.grupos.find(g => g.id === ex.grupo_id)?.nombre
        || 'Sin grupo';
      const numPreguntas = Array.isArray(ex.preguntas) ? ex.preguntas.length : 0;
      const notaMedia = r && r.media != null ? r.media.toFixed(1) : '—';
      const pendientes = r ? r.pendientes : 0;
      const fecha = window.helpers.formatearFecha(ex.creado_en) || '—';
      return `
        <article class="admin-examen-card" data-id="${ex.id}">
          <div class="admin-examen-card__cabecera">
            <div class="admin-examen-card__info">
              <p class="admin-examen-card__titulo">${E(ex.icono || '') || I('file-text')} ${E(ex.titulo)}</p>
              <p class="admin-examen-card__meta">${I('user')} ${E(autor)} · ${I('layout')} ${E(grupo)}</p>
            </div>
            ${window.adminComunes.estadoBadge(ex.estado)}
          </div>
          <div class="admin-examen-card__metrica">
            <span>${I('edit-3')} ${numPreguntas} pregunta${numPreguntas !== 1 ? 's' : ''}</span>
            <span>${I('bar-chart-2')} Nota media: ${notaMedia}</span>
            <span>${I('calendar')} ${fecha}</span>
            ${pendientes > 0 ? `<span class="admin-examen-card__pendientes">${I('clock')} ${pendientes} por corregir</span>` : ''}
          </div>
          <div class="admin-examen-card__acciones">
            <button class="btn-primario u-fs-xs btn-ver-resultados" data-id="${ex.id}">${I('eye')} Ver respuestas</button>
            <button class="btn-icono btn-editar-examen" data-id="${ex.id}" title="Editar" aria-label="Editar ${E(ex.titulo)}">${I('edit-3')}</button>
            <button class="btn-icono btn-duplicar-examen" data-id="${ex.id}" title="Duplicar" aria-label="Duplicar ${E(ex.titulo)}">${I('copy')}</button>
            ${ex.estado !== 'publicado' ? `<button class="btn-icono btn-icono--exito btn-publicar-examen" data-id="${ex.id}" title="Publicar" aria-label="Publicar ${E(ex.titulo)}">${I('send')}</button>` : ''}
            <button class="btn-icono btn-icono--peligro btn-eliminar-examen" data-id="${ex.id}" data-titulo="${E(ex.titulo)}" title="Eliminar" aria-label="Eliminar ${E(ex.titulo)}">${I('trash-2')}</button>
          </div>
        </article>`;
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
      if (this._mazoDeepLink) {
        // Deep link desde Memorización: abrir la gestión de ese mazo concreto
        this._mazoMemActivo = this._mazoDeepLink;
        this._mazoDeepLink = null;
      } else {
        this._mazoMemActivo = null;
      }
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

    // ==================================================================
    // SUGERENCIAS (Owner) — resumen + gestión
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
    // AUDITORÍA (Owner)
    // ==================================================================
    _renderAuditoria() {
      const auditoria = this._datos.auditoria || [];
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
    // ADMINISTRADORES (Owner) — gestión de otros administradores
    // ==================================================================
    _renderAdmins(usuarios, usuario) {
      const admins = usuarios.filter(u => u.rol === 'admin');
      return `
        <div class="admin-lista">
          <div class="admin-lista-cabecera">
            <h3 class="admin-lista-cabecera__titulo">${I('shield')} Administradores <span class="admin-lista-cabecera__contador">(${admins.length})</span></h3>
            <div class="admin-lista-cabecera__acciones">
              <button class="btn-primario u-fs-xs" id="btnCrearAdmin">${I('user-plus')} Crear administrador</button>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Los administradores pueden gestionar usuarios, grupos y exámenes del centro. Puedes cambiarlos de rol o suspenderlos desde aquí.</p>
          ${admins.length === 0
            ? window.adminComunes.vacio('shield', 'Sin administradores', 'Crea un administrador para ayudarte a gestionar el centro.')
            : `<div class="admin-grid-tarjetas">${admins.map(a => this._renderUsuarioFicha(a, usuario)).join('')}</div>`}
        </div>`;
    },

    // ==================================================================
    // MARCA (Owner) — nombre del centro y logotipo
    // ==================================================================
    _renderMarca() {
      const c = this._datos.config || {};
      const nombre = c.marca_nombre || '';
      const logo = c.marca_logo || '';
      return `
        <div class="o-pila">
          <h3 style="margin:0">${I('palette')} Marca del centro</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Personaliza el nombre y el logotipo que se muestran en la aplicación (título y cabecera del panel).</p>
          <div class="admin-setting-row">
            <div>
              <div class="admin-setting-row__label">${I('tag')} Nombre del centro</div>
              <div class="admin-setting-row__desc">Aparece como título de la aplicación</div>
            </div>
          </div>
          <input type="text" id="marcaNombre" value="${E(nombre)}" placeholder="Ej: FormsBiblicos" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md)">
          <div class="admin-setting-row u-mt-2">
            <div>
              <div class="admin-setting-row__label">${I('image')} Logotipo</div>
              <div class="admin-setting-row__desc">Imagen cuadrada que se muestra en la cabecera del panel</div>
            </div>
          </div>
          <div class="admin-marca__logo">
            <img id="marcaLogoPreview" src="${logo}" alt="Logotipo actual" ${logo ? '' : 'hidden'}>
            <button class="btn-secundario u-fs-xs" id="btnSubirLogo">${I('upload')} ${logo ? 'Cambiar logo' : 'Subir logo'}</button>
            ${logo ? `<button class="btn-secundario u-fs-xs" id="btnQuitarLogo" style="color:var(--color-error)">${I('trash-2')} Quitar</button>` : ''}
          </div>
          <button class="btn-primario u-mt-2" id="btnGuardarMarca" style="justify-content:center">${I('check')} Guardar marca</button>
        </div>`;
    },

    // ==================================================================
    // NOTIFICACIONES (Owner) — enviar anuncios push a todos los usuarios
    // ==================================================================
    _renderNotificaciones() {
      return `
        <div class="o-pila">
          <h3 style="margin:0">${I('bell')} Notificaciones personalizadas</h3>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1">Envía un anuncio a todos los usuarios de la plataforma. Recibirán una notificación nativa en sus dispositivos.</p>
          <div class="admin-seccion">
            <div class="admin-form o-pila" style="gap:var(--espaciado-sm)">
              <div>
                <label class="u-fs-xs u-fw-600" for="anuncioTitulo">${I('edit-3')} Título del anuncio</label>
                <input type="text" id="anuncioTitulo" class="admin-input-full" placeholder="Ej: ¡Nuevo contenido disponible!" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md);margin-top:4px;border:1px solid var(--color-borde);border-radius:var(--radio-md)">
              </div>
              <div>
                <label class="u-fs-xs u-fw-600" for="anuncioCuerpo">${I('message-square')} Mensaje</label>
                <textarea id="anuncioCuerpo" class="admin-input-full" placeholder="Escribe el mensaje que verán todos los usuarios..." rows="4" style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md);margin-top:4px;border:1px solid var(--color-borde);border-radius:var(--radio-md);resize:vertical"></textarea>
              </div>
              <div class="o-flecha" style="gap:var(--espaciado-xs);flex-wrap:wrap;align-items:center">
                <button class="btn-primario" id="btnEnviarAnuncio" style="justify-content:center">${I('send')} Enviar a todos los usuarios</button>
                <span class="u-fs-xxs u-color-texto-terciario" id="anuncioEstado"></span>
              </div>
            </div>
          </div>
          <div class="admin-setting-row u-mt-2">
            <div>
              <div class="admin-setting-row__label">${I('info')} ¿Cómo funciona?</div>
              <div class="admin-setting-row__desc">El anuncio se inserta en la tabla de notificaciones de cada usuario. Cuando abran la app (o estén en cualquier sección), el poller lo detecta y dispara una notificación nativa con sonido y vibración. El anuncio aparece aunque el usuario tenga las notificaciones silenciadas.</div>
            </div>
          </div>
        </div>`;
    },

    // ==================================================================
    // SISTEMA (Owner) — backups, mantenimiento y limpieza
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
                ${window.adminComunes.sistemaFila('tag', 'Versión', window.__FB_APP_VERSION__?.version || '—', 'admin-indicador--ok')}
                ${window.adminComunes.sistemaFila('hard-drive', 'Variables del sistema', 'v' + (window.__FB_APP_VERSION__?.version || '—') + ' · Supabase', 'admin-indicador--ok')}
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
    _bindTabContent(raiz) {
      this._bindCentro(raiz);
      this._bindUsuarios(raiz);
      this._bindAdmins(raiz);
      this._bindGrupos(raiz);
      this._bindExamenes(raiz);
      this._bindMemorizacion(raiz);
      this._bindComun(raiz);
      this._bindSugerencias(raiz);
      this._bindAuditoria(raiz);
      this._bindMarca(raiz);
      this._bindNotificaciones(raiz);
      this._bindSistema(raiz);
    },

    _bindCentro(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;

      // Tareas pendientes y alertas → navegar con filtros
      const aplicarAccion = (accion) => {
        if (!accion) return;
        this._nivelActivo = this._esOwner() ? 'owner' : 'admin';
        if (accion.tab === 'examenes') {
          this._filtroExamenEstado = accion.estado || 'todos';
          this._tabActivo = 'examenes';
        } else if (accion.tab === 'grupos') {
          this._tabActivo = 'grupos';
        } else {
          this._filtroRol = accion.rol || 'todos';
          this._filtroGrupo = accion.grupo || 'todos';
          this._filtroEstado = accion.estado || 'todos';
          this._buscarUsuarios = '';
          this._tabActivo = 'usuarios';
        }
        this._renderizar(raiz);
      };
      r.querySelectorAll('[data-pendiente]').forEach(btn => {
        btn.onclick = () => {
          // El valor se escribe con encodeURIComponent (línea ~281), así que
          // dataset.pendiente llega URL-encoded: hay que decodificarlo UNA vez.
          // El try/catch evita que una secuencia % inválida o JSON corrupto
          // (truncado, editado) reviente el click sin avisar.
          let pendiente = null;
          try {
            const json = decodeURIComponent(btn.dataset.pendiente || '');
            pendiente = JSON.parse(json);
          } catch (e) {
            window.helpers.mostrarAlerta('No se pudo procesar esta acción (datos corruptos).', 'error');
            return;
          }
          aplicarAccion(pendiente);
        };
      });

      // Tarjetas grandes de herramientas → abrir su lista
      r.querySelectorAll('[data-herramienta-tab]').forEach(card => {
        const abrir = () => { this._nivelActivo = 'admin'; this._tabActivo = card.dataset.herramientaTab; this._renderizar(raiz); };
        card.addEventListener('click', (e) => {
          if (e.target.closest('.admin-herramienta__mini-btn')) return;
          abrir();
        });
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
      });

      // Mini-acciones de las tarjetas de herramientas
      r.querySelectorAll('[data-mini]').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const accion = btn.dataset.mini;
          if (accion === 'crear-alumno' || accion === 'crear-profesor') {
            await this._abrirCrearUsuario(accion === 'crear-profesor' ? 'editor' : 'usuario', raiz);
          } else if (accion === 'importar-csv') {
            await this._importarCSV(raiz);
          } else if (accion === 'crear-grupo') {
            await this._crearGrupoForm(raiz);
          } else if (accion === 'ver-grupos') {
            this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'grupos'; this._renderizar(raiz);
          } else if (accion === 'ver-examenes') {
            this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'examenes'; this._filtroExamenEstado = 'todos'; this._renderizar(raiz);
          } else if (accion === 'crear-examen') {
            window.adminComunes.irSpa('/editor/nuevo');
          } else if (accion === 'ver-publicados' || accion === 'ver-borradores') {
            this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'examenes';
            this._filtroExamenEstado = accion === 'ver-publicados' ? 'publicado' : 'borrador';
            this._renderizar(raiz);
          } else if (accion === 'crear-mazo') {
            await this._cargarMemorizacion();
            this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'memorizacion';
            this._renderizar(raiz);
            await this._formMazoMem(null, raiz);
          } else if (accion === 'sembrar-mazos') {
            await this._cargarMemorizacion();
            await this._sembrarMazos(raiz);
          } else if (accion === 'importar-mazo') {
            await this._cargarMemorizacion();
            await this._importarMazo(raiz);
          }
        };
      });
    },

    async _crearGrupoForm(raiz) {
      const { usuario } = this._datos;
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

    // ---- USUARIOS (también reutilizado por la pestaña Administradores) ----
    _bindUsuarios(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuarios, usuario } = this._datos;

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
        btn.onclick = () => { this._pagUsuarios = parseInt(btn.dataset.val, 10); this._renderizar(raiz); };
      });

      // Selection checkboxes
      r.querySelectorAll('.admin-select-cb').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) this._seleccion.add(cb.dataset.selId);
          else this._seleccion.delete(cb.dataset.selId);
          this._renderizar(raiz);
        };
      });

      // Menú "⋯" de la ficha (cierra al pulsar fuera, una sola vez)
      const cerrarMenus = () => r.querySelectorAll('[data-menupop]').forEach(p => { p.hidden = true; });
      r.querySelectorAll('.btn-ficha-menu').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const pop = r.querySelector(`[data-menupop="${btn.dataset.menu}"]`);
          const abierto = pop && !pop.hidden;
          cerrarMenus();
          if (pop) pop.hidden = abierto;
          btn.setAttribute('aria-expanded', String(!abierto));
        };
      });
      if (!window.__adminMenuListener) {
        window.__adminMenuListener = true;
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.admin-ficha__menu')) {
            document.querySelectorAll('[data-menupop]').forEach(p => { p.hidden = true; });
          }
        });
      }

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
      r.querySelector('#btnBatchLimpiar')?.addEventListener('click', () => { this._seleccion.clear(); this._renderizar(raiz); });

      r.querySelector('#btnCrearUsuario')?.addEventListener('click', async () => { await this._abrirCrearUsuario(null, raiz); });

      // Editar usuario (ProfileEditor)
      r.querySelectorAll('.btn-editar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const u = usuarios.find(x => x.id === btn.dataset.id);
          if (!u) return;
          if (!this._puedeEditar(usuario, u)) { window.helpers.mostrarAlerta('No tienes permiso para editar a este usuario.', 'error'); return; }
          window.ProfileEditor.abrir(u, {
            onGuardar: async (datos) => {
              try {
                // Contrato 028: admin_actualizar_usuario exige enviar SIEMPRE el
                // grupo_id actual (o null) y el rol; si no, los interpreta como
                // desasignación del grupo / cambio de rol.
                await window.adminRepository.actualizarUsuario(u.id, {
                  nombre_completo: datos.nombre_completo.trim(),
                  username: datos.username.trim(),
                  rol: u.rol,
                  grupo_id: u.grupo_id || null,
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
              const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${u.nombre_completo}"? Esta acción no se puede deshacer.`, { titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar' });
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

      // Cambiar rol
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

      // Eliminar usuario
      r.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`¿Eliminar al usuario "${btn.dataset.nombre}"? Esta acción no se puede deshacer.`, { titulo: 'Eliminar usuario', textoConfirmar: 'Eliminar' });
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

      // Ver detalle (panel lateral)
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
              <div class="admin-user-detail__avatar">${u.foto_perfil ? `<img src="${E(u.foto_perfil)}" alt="">` : inicial}</div>
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
              <div class="perfil-fila"><span class="perfil-fila__label">Última conexión</span><span class="perfil-fila__valor u-fs-xs">${u.ultimo_acceso ? TRP(u.ultimo_acceso) : '—'}</span></div>
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
      r.querySelectorAll('[data-ver-detalle]').forEach(el => { el.onclick = () => mostrarDetalle(el.dataset.verDetalle); });
      r.querySelectorAll('.btn-ver-detalle').forEach(btn => { btn.onclick = () => mostrarDetalle(btn.dataset.id); });
    },

    _bindAdmins(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      r.querySelector('#btnCrearAdmin')?.addEventListener('click', async () => { await this._abrirCrearUsuario('admin', raiz); });
    },

    // ---- GRUPOS ----
    _bindGrupos(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { grupos, usuario } = this._datos;

      r.querySelector('#btnCrearGrupo')?.addEventListener('click', () => this._crearGrupoForm(raiz));

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
        el.onclick = async (e) => { e.stopPropagation(); await verGrupo(el.dataset.gid); };
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

    // ---- EXÁMENES ----
    _bindExamenes(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;
      const examenes = () => this._datos.examenes;

      r.querySelector('#btnCrearExamen')?.addEventListener('click', () => window.adminComunes.irSpa('/editor/nuevo'));

      const inpBuscar = r.querySelector('#buscarExamenes');
      if (inpBuscar) inpBuscar.addEventListener('input', (e) => { this._buscarExamenes = e.target.value; this._renderizar(raiz); });
      r.querySelector('#filtroExamenEstado')?.addEventListener('change', (e) => { this._filtroExamenEstado = e.target.value; this._renderizar(raiz); });
      r.querySelector('#filtroExamenGrupo')?.addEventListener('change', (e) => { this._filtroExamenGrupo = e.target.value; this._renderizar(raiz); });

      r.querySelectorAll('.btn-editar-examen').forEach(btn => { btn.onclick = () => window.adminComunes.irSpa('/editor/' + btn.dataset.id); });

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

      r.querySelectorAll('.btn-ver-resultados').forEach(btn => { btn.onclick = () => window.adminComunes.irSpa('/calificaciones'); });

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
    },

    // ---- COMÚN (exportar/importar CSV de la lista de usuarios) ----
    _bindComun(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;

      r.querySelector('#btnExportCSV')?.addEventListener('click', async () => {
        try {
          const csv = await window.adminRepository.exportarUsuariosCSV(usuario);
          window.adminComunes.descargarCSVTexto('usuarios.csv', csv);
        } catch { window.helpers.mostrarAlerta('Error al exportar', 'error'); }
      });
      r.querySelector('#btnImportarCSV')?.addEventListener('click', () => this._importarCSV(raiz));
    },

    // ---- MEMORIZACIÓN ----
    async _sembrarMazos(raiz) {
      const { usuario } = this._datos;
      const ok = await window.helpers.confirmar('Se crearán mazos con contenido bíblico curado (Versículos, Personajes, Lugares, Cronología, Milagros, Parábolas, Curiosidades, Objetos, Profecías). Los mazos ya existentes no se duplicarán. ¿Continuar?', { titulo: 'Sembrar contenido', textoConfirmar: 'Sembrar' });
      if (!ok) return;
      try {
        const resumen = await window.memorizacionRepository.sembrarMazos(usuario.id);
        window.helpers.mostrarAlerta(`Sembrados ${resumen.mazos} mazos y ${resumen.tarjetas} tarjetas. ${resumen.omitidos.length ? 'Omitidos: ' + resumen.omitidos.join(', ') : ''}`, 'exito');
        await this._cargarMemorizacion();
        this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'memorizacion';
        this._renderizar(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _importarMazo(raiz) {
      const { usuario } = this._datos;
      const archivo = await window.adminComunes.elegirArchivo('.json,application/json');
      if (!archivo) return;
      try {
        const res = await window.memorizacionRepository.importarMazo(usuario.id, archivo.texto);
        window.helpers.mostrarAlerta(`Mazo "${res.mazo.nombre}" importado con ${res.tarjetas} tarjetas.`, 'exito');
        await this._cargarMemorizacion();
        this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'memorizacion';
        this._renderizar(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
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
        this._nivelActivo = this._esOwner() ? 'owner' : 'admin'; this._tabActivo = 'memorizacion';
        this._renderizar(raiz || document.querySelector('#app-root') || document.body);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _formTarjetaMem(tarjetaId, raiz) {
      const d = this._datos;
      const t = tarjetaId ? ((d.tarjetasMem || []).find(x => x.id === tarjetaId) || null) : null;
      const mazo = d.mazosMem.find(m => m.id === this._mazoMemActivo);
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

      if (this._tabActivo === 'memorizacion' && !this._datos.mazosMem) {
        this._cargarMemorizacion().then(() => this._renderizar(raiz));
      }

      r.querySelector('#btnCrearMazo')?.addEventListener('click', () => this._formMazoMem(null, raiz));
      r.querySelector('#btnVolverMazosMem')?.addEventListener('click', () => { this._mazoMemActivo = null; this._renderizar(raiz); });
      r.querySelector('#btnCrearTarjetaMem')?.addEventListener('click', () => this._formTarjetaMem(null, raiz));
      r.querySelector('#btnSembrarMazos')?.addEventListener('click', () => this._sembrarMazos(raiz));
      r.querySelector('#btnImportarMazo')?.addEventListener('click', () => this._importarMazo(raiz));

      r.querySelectorAll('.btn-mazo-ver').forEach(btn => { btn.onclick = () => { this._mazoMemActivo = btn.dataset.mazoid; this._renderizar(raiz); }; });
      r.querySelectorAll('.btn-mazo-editar').forEach(btn => { btn.onclick = () => this._formMazoMem(btn.dataset.mazoid, raiz); });
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

      r.querySelectorAll('.btn-tarjeta-editar').forEach(btn => { btn.onclick = () => this._formTarjetaMem(btn.dataset.tid, raiz); });
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

    // ---- SUGERENCIAS (Owner) ----
    _bindSugerencias(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      if (!window.sugerenciasRepository) return;

      window.adminComunes.bindFiltros(r, '[data-sug-filtro]', (btn) => {
        this._filtroSugerencias = btn.dataset.sugFiltro;
        this._renderizar(raiz);
      });

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
        fila.addEventListener('click', (e) => { if (e.target.closest('[data-sug-toggle]')) return; alternarSug(fila.dataset.sugFila); });
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

    // ---- AUDITORÍA (Owner) ----
    _bindAuditoria(raiz) {
      const r = raiz.querySelector('#adminContenido');
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

    // ---- MARCA (Owner) ----
    _bindMarca(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;
      const preview = r.querySelector('#marcaLogoPreview');

      const subirLogo = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = () => {
              // Redimensionar a 128px máx. (logo compacto, evita blobs gigantes)
              const size = Math.min(128, img.width, img.height);
              const canvas = document.createElement('canvas');
              canvas.width = size; canvas.height = size;
              const ctx = canvas.getContext('2d');
              const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
              ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
              const dataUrl = canvas.toDataURL('image/png');
              this._logoPendiente = dataUrl;
              if (preview) { preview.src = dataUrl; preview.hidden = false; }
              const btnSubir = r.querySelector('#btnSubirLogo');
              if (btnSubir) btnSubir.textContent = 'Cambiar logo';
              const btnQuitar = r.querySelector('#btnQuitarLogo');
              if (!btnQuitar && r.querySelector('.admin-marca__logo')) {
                const b = document.createElement('button');
                b.className = 'btn-secundario u-fs-xs';
                b.id = 'btnQuitarLogo';
                b.style.color = 'var(--color-error)';
                b.innerHTML = `${I('trash-2')} Quitar`;
                r.querySelector('.admin-marca__logo').appendChild(b);
                b.onclick = () => {
                  this._logoPendiente = '';
                  if (preview) { preview.hidden = true; preview.src = ''; }
                  b.remove();
                };
              }
            };
          };
          reader.readAsDataURL(file);
        };
        input.click();
      };
      r.querySelector('#btnSubirLogo')?.addEventListener('click', subirLogo);
      r.querySelector('#btnQuitarLogo')?.addEventListener('click', () => {
        this._logoPendiente = '';
        if (preview) { preview.hidden = true; preview.src = ''; }
      });

      r.querySelector('#btnGuardarMarca')?.addEventListener('click', async () => {
        const nombre = (r.querySelector('#marcaNombre')?.value || '').trim();
        const logo = this._logoPendiente !== null ? this._logoPendiente : (preview && !preview.hidden ? preview.src : '');
        try {
          await window.adminRepository.guardarConfiguracion('marca_nombre', nombre);
          await window.adminRepository.guardarConfiguracion('marca_logo', logo);
          await window.adminRepository.registrarAuditoria('config:marca', `Marca actualizada: ${nombre || 'FormsBiblicos'}`, usuario.id).catch(() => {});
          document.title = nombre || 'FormsBiblicos';
          this._logoPendiente = null;
          window.helpers.mostrarAlerta('Marca guardada.', 'exito');
          const config = await window.adminRepository.listarConfiguracion();
          this._datos.config = config;
          this._renderizar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });
    },

    // ---- SISTEMA (Owner) ----
    _bindSistema(raiz) {
      const r = raiz.querySelector('#adminContenido');
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
              const snapshot = {
                app: 'FormsBiblicos',
                version: window.__FB_APP_VERSION__?.version || '—',
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
    },

    // ---- NOTIFICACIONES (Owner) ----
    _bindNotificaciones(raiz) {
      const r = raiz.querySelector('#adminContenido');
      if (!r) return;
      const { usuario } = this._datos;

      r.querySelector('#btnEnviarAnuncio')?.addEventListener('click', async () => {
        const btn = r.querySelector('#btnEnviarAnuncio');
        const estado = r.querySelector('#anuncioEstado');
        const titulo = r.querySelector('#anuncioTitulo')?.value?.trim() || '';
        const cuerpo = r.querySelector('#anuncioCuerpo')?.value?.trim() || '';

        if (!titulo && !cuerpo) {
          window.helpers.mostrarAlerta('Escribe al menos un título o un mensaje.', 'error');
          return;
        }

        const ok = await window.helpers.confirmar(
          `¿Enviar el anuncio a todos los usuarios?\n\n"${titulo || 'Sin título'}"\n\nRecibirán una notificación nativa en sus dispositivos.`,
          { titulo: 'Enviar anuncio', textoConfirmar: 'Enviar' }
        );
        if (!ok) return;

        btn.disabled = true;
        if (estado) estado.textContent = 'Enviando...';
        try {
          const resultado = await window.adminRepository.enviarAnuncioGlobal({ titulo, cuerpo }, usuario.id);
          if (estado) estado.textContent = `Enviado a ${resultado.enviados} usuarios.`;
          window.helpers.mostrarAlerta(`Anuncio enviado a ${resultado.enviados} usuarios.`, 'exito');
          // Limpiar campos
          const inpTitulo = r.querySelector('#anuncioTitulo');
          const inpCuerpo = r.querySelector('#anuncioCuerpo');
          if (inpTitulo) inpTitulo.value = '';
          if (inpCuerpo) inpCuerpo.value = '';
        } catch (e) {
          window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
          if (estado) estado.textContent = 'Error al enviar.';
        } finally {
          btn.disabled = false;
        }
      });
    }
  };
})();
