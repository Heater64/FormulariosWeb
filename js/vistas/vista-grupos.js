(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);
  const J = () => window.ejerciciosMemorizacion;

  function avatarHtml(m, grande = false) {
    if (m && m.foto_perfil) return `<img src="${E(m.foto_perfil)}" alt="" loading="lazy">`;
    const letra = ((m && (m.nombre_completo || m.username)) || '?').charAt(0).toUpperCase();
    return `<span class="${grande ? 'grupos-avatar__letra--lg' : ''}">${E(letra)}</span>`;
  }

  function rolBonito(rol) {
    return (window.adminComunes && window.adminComunes.rolBonito) ? window.adminComunes.rolBonito(rol) : rol;
  }

  function fechaCorta(iso) {
    if (!iso) return '—';
    return window.helpers.formatearFecha(iso);
  }

  // Gradiente estable por id de clase (para las tarjetas del home).
  const GRADIENTES = [
    'linear-gradient(135deg, var(--color-azul-700) 0%, var(--color-acento-fuerte) 60%, #172554 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
    'linear-gradient(135deg, #0D9488 0%, #134E4A 100%)',
    'linear-gradient(135deg, #DB2777 0%, #831843 100%)',
    'linear-gradient(135deg, #D97706 0%, #78350F 100%)',
    'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)'
  ];
  function gradienteDe(id) {
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return GRADIENTES[h % GRADIENTES.length];
  }

  window.vistaGrupos = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      this._usuario = usuario;
      this._seleccion = new Set();
      if (params && params.id) return this._montarGrupo(raiz, params.id);
      return this._montarDirectorio(raiz);
    },

    desmontar() { this._seleccion = null; this._usuario = null; this._miembros = null; this._grupo = null; },

    /* ══════════════════════════════════════════════════════════
       HOME — MIS CLASES (estilo Classroom)
       ══════════════════════════════════════════════════════════ */
    async _montarDirectorio(raiz) {
      const usuario = this._usuario;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono grupos-cabecera__volver" id="btnVolverGrupos" aria-label="Volver al perfil">${I('arrow-left')}</button>
              <div class="grupos-cabecera__texto">
                <h1 class="grupos-cabecera__titulo">${I('users')} Mis clases <button class="info-ayuda" data-guia="grupos" aria-label="Guía de Mis clases">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </div>
          <div class="grupos-acciones">
            <button class="btn-primario grupos-acciones__unir" id="btnUnirseCodigo">${I('key')} Unirme con código</button>
            ${['admin', 'owner', 'editor'].includes(usuario.rol) ? `
            <button class="btn-secundario" id="btnCrearGrupo">${I('plus')} Nueva clase</button>` : ''}
            ${['admin', 'owner'].includes(usuario.rol) ? `
            <button class="btn-secundario" id="btnCrearInstitucion">${I('building')} Nueva institución</button>` : ''}
          </div>
          <div id="gruposContenido">
            <div class="skeleton-stack" aria-hidden="true">
              <div class="skel" style="height:150px;border-radius:var(--card-radius)"></div>
              <div class="skel" style="height:150px;border-radius:var(--card-radius)"></div>
            </div>
          </div>
        </div>`;
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.helpers.registrarGuias(raiz, {
        grupos: ['Mis clases', 'Aquí puedes unirte a tus clases, consultar invitaciones y participar en desafíos de memorización con tu grupo.', 'Pide el código a tu profesor para unirte a una clase.']
      });
      raiz.querySelector('#btnVolverGrupos').onclick = () => router.navegar('/perfil');

      // Unirse con código
      raiz.querySelector('#btnUnirseCodigo').onclick = () => this._modalUnirseCodigo(raiz);

      // Nueva clase (admin/owner/editor)
      const btnCrear = raiz.querySelector('#btnCrearGrupo');
      if (btnCrear) btnCrear.onclick = () => this._modalNuevaClase(raiz);

      // Nueva institución (admin/owner)
      const btnInst = raiz.querySelector('#btnCrearInstitucion');
      if (btnInst) btnInst.onclick = () => this._modalNuevaInstitucion(raiz);

      const [clases, invitaciones, instituciones, misSolicitudes] = await Promise.all([
        window.gruposRepository.listarMisClases(usuario.id),
        window.desafiosRepository.misInvitaciones(usuario.id),
        window.gruposRepository.listarInstituciones(usuario.id),
        window.gruposRepository.misSolicitudes(usuario.id)
      ]);
      const cont = raiz.querySelector('#gruposContenido');
      if (!cont) return;

      const invitacionesHtml = invitaciones.length ? `
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${I('sword')}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Invitaciones a desafíos</h3>
              <p class="grupos-seccion__desc">Acepta y empieza cuando todos estén listos</p>
            </div>
            <span class="grupos-otros__contador">${invitaciones.length}</span>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${invitaciones.map(d => this._tarjetaInvitacion(d)).join('')}
          </div>
        </section>` : '';

      // Agrupar mis clases por institución
      const porInstitucion = new Map(); // id -> { institucion, clases }
      const sinInstitucion = [];
      (clases || []).forEach(g => {
        const inst = (g.instituciones && g.instituciones.id) ? g.instituciones : null;
        if (inst) {
          if (!porInstitucion.has(inst.id)) porInstitucion.set(inst.id, { institucion: inst, clases: [] });
          porInstitucion.get(inst.id).clases.push(g);
        } else {
          sinInstitucion.push(g);
        }
      });

      const seccionInstitucion = ([, grupo]) => `
        <section class="grupos-institucion">
          <div class="grupos-institucion__cabecera">
            <span class="grupos-institucion__icono">${I('building')}</span>
            <div class="grupos-institucion__info">
              <h3 class="grupos-institucion__nombre">${E(grupo.institucion.nombre)}</h3>
              <p class="grupos-institucion__desc">${E((grupo.institucion.descripcion || '').slice(0, 80)) || 'Institución'}</p>
            </div>
            <span class="grupos-institucion__contador">${grupo.clases.length} clase${grupo.clases.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="grupos-directorio">
            ${grupo.clases.map(g => this._tarjetaClase(g, usuario)).join('')}
          </div>
        </section>`;

      const clasesSinInst = sinInstitucion.length ? `
        <section class="grupos-institucion">
          <div class="grupos-institucion__cabecera">
            <span class="grupos-institucion__icono">${I('layers')}</span>
            <div class="grupos-institucion__info">
              <h3 class="grupos-institucion__nombre">Mis clases</h3>
              <p class="grupos-institucion__desc">Clases sin institución asignada</p>
            </div>
          </div>
          <div class="grupos-directorio">
            ${sinInstitucion.map(g => this._tarjetaClase(g, usuario)).join('')}
          </div>
        </section>` : '';

      // Sugerencia de instituciones del centro (solo admin/owner)
      const otrasInstituciones = (['admin', 'owner'].includes(usuario.rol) && instituciones.length)
        ? `
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${I('building')}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Instituciones del centro</h3>
              <p class="grupos-seccion__desc">Crea clases dentro de cada institución</p>
            </div>
          </div>
          <div class="grupos-instituciones-lista">
            ${instituciones.map(i => `
              <div class="grupos-instituciones-item">
                <span class="grupos-instituciones-item__icono">${I('building')}</span>
                <div class="grupos-instituciones-item__info">
                  <p class="grupos-instituciones-item__nombre">${E(i.nombre)}</p>
                  <p class="grupos-instituciones-item__desc">${E((i.descripcion || '').slice(0, 60)) || 'Administrada por ti'}</p>
                </div>
              </div>`).join('')}
          </div>
        </section>` : '';

      const pendientes = (misSolicitudes || []).filter(s => s.estado === 'pendiente');
      const solicitudesHtml = pendientes.length ? `
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${I('clock')}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Tus solicitudes de ingreso</h3>
              <p class="grupos-seccion__desc">Estás esperando aprobación en ${pendientes.length} clase${pendientes.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${pendientes.map(s => `
              <div class="grupos-solicitud">
                <div class="grupos-solicitud__info">
                  <p class="grupos-solicitud__nombre">${E((s.grupos && s.grupos.nombre) || 'Clase')}</p>
                  <p class="grupos-solicitud__username">Pendiente de aprobación</p>
                </div>
                <span class="grupos-solicitud__estado">${I('clock')} En espera</span>
              </div>`).join('')}
          </div>
        </section>` : '';

      const sinClases = (clases || []).length === 0 && !invitaciones.length;
      const contenidoClases = (porInstitucion.size || sinInstitucion.length)
        ? `${[...porInstitucion.entries()].map(seccionInstitucion).join('')}${clasesSinInst}`
        : (sinClases
            ? `<div class="empty-state"><div class="empty-state__icono">${I('key')}</div>
                <h3 class="empty-state__titulo">Aún no estás en ninguna clase</h3>
                <p class="empty-state__descripcion">Pide el código de tu clase a tu profesor y únete con el botón «Unirme con código».</p></div>`
            : '');

      cont.innerHTML = `
        ${solicitudesHtml}
        ${invitacionesHtml}
        ${contenidoClases}
        ${otrasInstituciones}`;
      if (window.Iconos) window.Iconos.actualizar();

      // Invitaciones a desafíos
      cont.querySelectorAll('[data-invitacion]').forEach(btn => {
        btn.onclick = async () => {
          const d = invitaciones.find(x => x.id === btn.dataset.invitacion);
          if (!d) return;
          btn.disabled = true;
          if (btn.dataset.accion === 'aceptar') {
            try {
              const r = await window.desafiosRepository.responderInvitacion(d.id, usuario.id, true);
              if (d._notifId && window.notificationService) {
                window.notificationService.marcarCompletada(d._notifId).catch(() => {});
              } else {
                await window.desafiosRepository.marcarNotificacionLeida(d._notifId || null);
              }
              if (r.empezado) { router.navegar('/desafio/' + d.id); }
              else { window.helpers.mostrarAlerta('Has aceptado. Esperando a los demás...', 'exito'); this._montarDirectorio(raiz); }
            } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          } else {
            try {
              await window.desafiosRepository.responderInvitacion(d.id, usuario.id, false);
              window.helpers.mostrarAlerta('Has rechazado el desafío.', 'info');
              this._montarDirectorio(raiz);
            } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          }
        };
      });

      // Abrir clase
      cont.querySelectorAll('[data-grupo]').forEach(btn => {
        btn.onclick = () => router.navegar('/grupos/' + btn.dataset.grupo);
      });
    },

    _tarjetaInvitacion(d) {
      const creador = (d.perfiles && d.perfiles[0]) || (d.perfiles) || {};
      return `
        <div class="grupos-invitacion">
          <div class="grupos-invitacion__avatar">${avatarHtml(creador)}</div>
          <div class="grupos-invitacion__info">
            <p class="grupos-invitacion__titulo">${E(creador.nombre_completo || creador.username || 'Alguien')} te ha desafiado</p>
            <p class="grupos-invitacion__desc">${I('layers')} ${E(d.mazo_nombre || 'Mazo de memorización')}</p>
          </div>
          <div class="grupos-invitacion__acciones">
            <button class="btn-primario u-fs-xs" data-invitacion="${d.id}" data-accion="aceptar">${I('check')} Aceptar</button>
            <button class="btn-secundario u-fs-xs" data-invitacion="${d.id}" data-accion="rechazar">${I('x')} Rechazar</button>
          </div>
        </div>`;
    },

    // Tarjeta de clase estilo Classroom: banda de color + nombre + meta
    _tarjetaClase(g, usuario) {
      const esProfesor = g.rol_en_grupo === 'admin' || g.rol_en_grupo === 'editor';
      const gradiente = g.instituciones && g.instituciones.id ? gradienteDe(g.instituciones.id) : gradienteDe(g.id);
      const admin = g.admin_id === usuario.id;
      return `
        <article class="grupos-clase-card" data-grupo="${g.id}">
          <div class="grupos-clase-card__portada" style="background:${gradiente}">
            <div class="grupos-clase-card__portada-icono">${I('book-open')}</div>
            <div class="grupos-clase-card__portada-info">
              <h3 class="grupos-clase-card__nombre">${E(g.nombre)}</h3>
              ${g.instituciones && g.instituciones.nombre ? `<p class="grupos-clase-card__inst">${E(g.instituciones.nombre)}</p>` : ''}
            </div>
          </div>
          <div class="grupos-clase-card__cuerpo">
            <div class="grupos-clase-card__meta">
              <span>${I('users')} ${g.num_miembros}</span>
              ${esProfesor ? `<span class="grupos-clase-card__rol">${I('graduation-cap')} Profesor</span>` : ''}
            </div>
            ${admin && g.codigo ? `
            <div class="grupos-clase-card__codigo">
              <span>Código:</span>
              <strong>${E(g.codigo)}</strong>
            </div>` : ''}
            <button class="btn-primario grupos-clase-card__btn" data-grupo="${g.id}">
              ${I('eye')} Ver clase
            </button>
          </div>
        </article>`;
    },

    /* ══════════════════════════════════════════════════════════
       MODALES: unirse con código / nueva clase / institución
       ══════════════════════════════════════════════════════════ */
    _modalUnirseCodigo(raiz) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal grupos-modal">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${I('key')} Unirme con código</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${I('x')}</button>
            </div>
            <p class="u-fs-xs u-color-texto-terciario">Introduce el código que te ha compartido tu profesor. Si la clase existe, entrarás directamente.</p>
            <label class="grupos-codigo-label" for="codigoClase">Código de la clase</label>
            <input class="grupos-codigo-input" id="codigoClase" maxlength="6" placeholder="ABC123"
                   autocomplete="off" autocapitalize="characters" spellcheck="false"
                   aria-describedby="ayudaCodigo">
            <p class="u-fs-xxs u-color-texto-terciario" id="ayudaCodigo">6 caracteres (letras y números). No hace falta distinguir mayúsculas.</p>
            <button class="btn-primario grupos-modal__confirmar" data-unirse>${I('log-in')} Unirme</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();
      const cerrar = () => overlay.remove();
      overlay.querySelector('[data-cerrar]').onclick = cerrar;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

      const input = overlay.querySelector('#codigoClase');
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      const unir = async () => {
        const codigo = input.value.trim();
        if (codigo.length < 4) { window.helpers.mostrarAlerta('Escribe el código de la clase.', 'advertencia'); return; }
        const btn = overlay.querySelector('[data-unirse]');
        btn.disabled = true;
        btn.textContent = 'Uniéndote…';
        try {
          const grupoId = await window.gruposRepository.unirseConCodigo(codigo);
          cerrar();
          window.helpers.mostrarAlerta('¡Bienvenido a tu nueva clase!', 'exito');
          router.navegar('/grupos/' + grupoId);
        } catch (e) {
          btn.disabled = false;
          btn.innerHTML = `${I('log-in')} Unirme`;
          const msg = (e && e.message) || '';
          window.helpers.mostrarAlerta(/c[oó]digo/i.test(msg) ? 'No existe ninguna clase con ese código.' : 'Error: ' + msg, 'error');
        }
      };
      overlay.querySelector('[data-unirse]').onclick = unir;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') unir(); });
      setTimeout(() => input.focus(), 50);
    },

    async _modalNuevaClase(raiz) {
      const usuario = this._usuario;
      // Instituciones donde el usuario es admin (para asignar la clase)
      let instituciones = [];
      try {
        const todas = await window.gruposRepository.listarInstituciones(usuario.id);
        instituciones = todas.filter(i => i.admin_id === usuario.id);
      } catch (e) {}
      const opciones = [{ valor: '', texto: 'Sin institución' }]
        .concat(instituciones.map(i => ({ valor: i.id, texto: i.nombre })));

      const datos = await window.helpers.formulario({
        titulo: 'Nueva clase',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre de la clase', requerido: true, placeholder: 'Ej: Clase 1º ESO A' },
          { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: false, placeholder: '¿Qué se estudia en esta clase?' },
          { nombre: 'institucion_id', etiqueta: 'Institución', tipo: 'select', valor: '', opciones }
        ],
        textoConfirmar: 'Crear clase'
      });
      if (!datos || !datos.nombre.trim()) return;
      try {
        const g = await window.gruposRepository.crearGrupo(datos.nombre.trim(), usuario.id, datos.institucion_id || null);
        try { await window.adminRepository.registrarAuditoria('grupo:crear', `Clase "${datos.nombre.trim()}" creada (código ${g.codigo})`, usuario.id); } catch (e) {}
        window.helpers.mostrarAlerta(`Clase creada. Comparte el código ${g.codigo} para que se unan.`, 'exito');
        this._montarDirectorio(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    async _modalNuevaInstitucion(raiz) {
      const usuario = this._usuario;
      const datos = await window.helpers.formulario({
        titulo: 'Nueva institución',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre de la institución', requerido: true, placeholder: 'Ej: Iglesia Central, Colegio Bet-el…' },
          { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: false, placeholder: 'Breve descripción de la institución' }
        ],
        textoConfirmar: 'Crear institución'
      });
      if (!datos || !datos.nombre.trim()) return;
      try {
        await window.gruposRepository.crearInstitucion(datos.nombre.trim(), usuario.id, (datos.descripcion || '').trim());
        window.helpers.mostrarAlerta('Institución creada. Ya puedes crear clases dentro de ella.', 'exito');
        this._montarDirectorio(raiz);
      } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    },

    /* ══════════════════════════════════════════════════════════
       DETALLE DE CLASE — banner + código + miembros por rol
       ══════════════════════════════════════════════════════════ */
    async _montarGrupo(raiz, grupoId) {
      const usuario = this._usuario;
      raiz.innerHTML = `<div class="o-contenedor u-mt-3"><div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:150px;border-radius:var(--card-radius)"></div><div class="skel" style="height:200px;border-radius:var(--card-radius)"></div></div></div>`;
      // Migración 040 sin aplicar: la relación instituciones no existe aún y
      // PostgREST devuelve { data: null, error } sin lanzar. Reintentar sin
      // el join para que el detalle funcione igualmente.
      const consultarGrupo = async (conInst) => {
        const cols = conInst ? '*, instituciones(id, nombre, descripcion)' : '*';
        return window.supabaseClient.from('grupos').select(cols).eq('id', grupoId).limit(1);
      };
      let grupoRes = await consultarGrupo(true);
      if (grupoRes.error && /instituciones/i.test(grupoRes.error.message || '')) {
        grupoRes = await consultarGrupo(false);
      }
      const [miembros, instituciones] = await Promise.all([
        window.gruposRepository.obtenerMiembrosDe(grupoId),
        window.gruposRepository.listarInstituciones(usuario.id)
      ]);
      const grupo = grupoRes.data && grupoRes.data[0];
      if (!grupo) { raiz.innerHTML = window.adminComunes.vacio('key', 'Clase no encontrada', 'Pide el código de la clase a tu profesor y únete desde Mis clases.'); return; }

      const soyMiembro = miembros.some(m => m.id === usuario.id);
      const soyProfesor = soyMiembro && ['admin', 'editor'].includes(miembros.find(m => m.id === usuario.id)?.rol_en_grupo);
      const esOwner = usuario.rol === 'owner';
      this._miembros = miembros;
      this._grupo = grupo;
      this._esOwner = esOwner;

      const gradiente = grupo.instituciones && grupo.instituciones.id ? gradienteDe(grupo.instituciones.id) : gradienteDe(grupo.id);
      const instNombre = (grupo.instituciones && grupo.instituciones.nombre) || 'Sin institución';

      const esResponsable = soyProfesor || ['admin', 'owner'].includes(usuario.rol);

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(110px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono grupos-cabecera__volver" id="btnVolverDirectorio" aria-label="Volver a mis clases">${I('arrow-left')}</button>
              <div class="grupos-cabecera__texto">
                <h1 class="grupos-cabecera__titulo">${I('users')} ${E(grupo.nombre)} <button class="info-ayuda" data-guia="clase" aria-label="Guía de esta clase">i</button></h1>
              </div>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </div>

          <div class="grupos-clase-banner" style="background:${gradiente}">
            <div class="grupos-clase-banner__icono">${I('book-open')}</div>
            <div class="grupos-clase-banner__info">
              <h2 class="grupos-clase-banner__nombre">${E(grupo.nombre)}</h2>
              <p class="grupos-clase-banner__inst">${E(instNombre)}${grupo.descripcion ? ` · ${E(grupo.descripcion.slice(0, 70))}` : ''}</p>
            </div>
            ${esResponsable && grupo.codigo ? `
            <button class="grupos-clase-banner__codigo" id="btnCopiarCodigo" aria-label="Copiar código de la clase" title="Copiar código">
              <span>Código</span>
              <strong>${E(grupo.codigo)}</strong>
              ${I('copy')}
            </button>` : ''}
            ${soyMiembro ? `
            <button class="grupos-clase-banner__compartir" id="btnCompartirClase" aria-label="Compartir esta clase" title="Compartir enlace de la clase">
              ${I('share-2')}<span>Compartir</span>
            </button>` : ''}
          </div>

          ${!soyMiembro ? `
          <div class="grupos-entrar">
            <p>${I('key')} Aún no formas parte de esta clase.</p>
            <button class="btn-primario" id="btnIrCodigo" style="justify-content:center">${I('key')} Unirme con código</button>
            <button class="btn-secundario" id="btnSolicitarIngreso" style="justify-content:center">${I('user-plus')} Solicitar ingreso</button>
          </div>` : ''}

          ${soyMiembro ? `
          <nav class="grupos-tabs" role="tablist" aria-label="Secciones de la clase">
            <button class="grupos-tabs__tab is-activo" role="tab" aria-selected="true" data-tab="personas">${I('users')} Personas</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="avisos">${I('megaphone')} Avisos</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="trabajo">${I('clipboard-check')} Trabajo</button>
            <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="stats">${I('bar-chart-3')} Estadísticas</button>
          </nav>
          <div id="gruposTabContenido"></div>` : ''}

          ${soyMiembro && miembros.length > 1 ? `
          <div class="grupos-desafio-clase">
            <button class="btn-secundario" id="btnDesafiarClase">${I('sword')} Desafiar a toda la clase</button>
          </div>` : ''}
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.helpers.registrarGuias(raiz, {
        clase: ['Clase', 'Consulta las personas, avisos, trabajo y estadísticas de esta clase desde las pestañas.', 'En Trabajo encontrarás los exámenes y actividades publicados por tu profesor.']
      });

      raiz.querySelector('#btnVolverDirectorio').onclick = () => router.navegar('/grupos');

      // Copiar código de la clase
      const btnCodigo = raiz.querySelector('#btnCopiarCodigo');
      if (btnCodigo) btnCodigo.onclick = async () => {
        try {
          await navigator.clipboard.writeText(grupo.codigo);
          window.helpers.mostrarAlerta(`Código ${grupo.codigo} copiado.`, 'exito');
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo copiar: ' + grupo.codigo, 'info');
        }
      };

      // No-miembro: ir a unirse con código
      const btnIrCodigo = raiz.querySelector('#btnIrCodigo');
      if (btnIrCodigo) btnIrCodigo.onclick = () => this._modalUnirseCodigo(raiz);

      // Compartir la clase: enlace con tarjeta Open Graph (/o/grupo/:id)
      const btnCompartir = raiz.querySelector('#btnCompartirClase');
      if (btnCompartir) btnCompartir.onclick = async () => {
        const url = window.location.origin + '/o/grupo/' + encodeURIComponent(grupo.id) + '?t=' + encodeURIComponent(grupo.nombre || 'Clase');
        const mensaje = '🏫 ' + (grupo.nombre || 'Clase') + '\n\nÚnete a esta clase en FormsBiblicos:\n' + url;
        try {
          if (navigator.share) {
            await navigator.share({ title: grupo.nombre || 'Clase', text: mensaje, url });
            return;
          }
        } catch (e) { /* usuario canceló */ }
        const waUrl = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            window.helpers.mostrarAlerta('Enlace copiado. Se abre WhatsApp.', 'info');
            window.open(waUrl, '_blank');
          }).catch(() => { window.open(waUrl, '_blank'); });
        } else {
          window.open(waUrl, '_blank');
        }
      };

      // No-miembro: solicitar ingreso (lo aprueba el admin de la clase en Personas)
      const btnSolicitar = raiz.querySelector('#btnSolicitarIngreso');
      if (btnSolicitar) btnSolicitar.onclick = async () => {
        btnSolicitar.disabled = true;
        try {
          const res = await window.gruposRepository.solicitarIngreso(grupo.id);
          const resultado = res && res.resultado;
          if (resultado === 'unido') {
            window.helpers.mostrarAlerta('¡Bienvenido a tu nueva clase!', 'exito');
            this._montarGrupo(raiz, grupo.id);
          } else {
            window.helpers.mostrarAlerta('Solicitud enviada. Espera a que un responsable la apruebe.', 'exito');
            btnSolicitar.textContent = 'Solicitud enviada';
          }
        } catch (e) {
          btnSolicitar.disabled = false;
          const msg = (e && e.message) || '';
          window.helpers.mostrarAlerta(/ya eres miembro/i.test(msg) ? 'Ya formas parte de esta clase.' : 'Error: ' + msg, 'error');
          if (/ya eres miembro/i.test(msg)) this._montarGrupo(raiz, grupo.id);
        }
      };

      // Pestañas: Personas · Avisos · Estadísticas
      raiz.querySelectorAll('.grupos-tabs__tab').forEach(btn => {
        btn.onclick = () => {
          raiz.querySelectorAll('.grupos-tabs__tab').forEach(b => {
            b.classList.toggle('is-activo', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          this._renderTab(raiz, grupo, usuario, btn.dataset.tab);
        };
      });
      if (soyMiembro) this._renderTab(raiz, grupo, usuario, 'personas');

      // Desafiar a toda la clase
      const btnDesafiarClase = raiz.querySelector('#btnDesafiarClase');
      if (btnDesafiarClase) btnDesafiarClase.onclick = async () => {
        const otros = miembros.filter(m => m.id !== usuario.id);
        if (!otros.length) { window.helpers.mostrarAlerta('No hay otros miembros en la clase.', 'info'); return; }
        btnDesafiarClase.disabled = true;
        try { await this._flujoDesafio(otros); }
        catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        finally { btnDesafiarClase.disabled = false; }
      };

      this._miembrosActuales = miembros;
    },

    _fichaMiembro(m, usuario, esOwner) {
      const esYo = m.id === usuario.id;
      const online = m.ultimo_acceso && (Date.now() - new Date(m.ultimo_acceso).getTime()) < 300000;
      const badge = m.rol_en_grupo === 'admin'
        ? '<span class="grupos-miembro__badge grupos-miembro__badge--admin">Administrador</span>'
        : m.rol_en_grupo === 'editor'
          ? '<span class="grupos-miembro__badge grupos-miembro__badge--editor">Profesor</span>'
          : '';
      // El owner puede editar a los ALUMNOS (cambiar de grupo, eliminar del
      // grupo, dejar sin grupo). Nunca a sí mismo ni a profesores/admins del
      // grupo (esos se gestionan desde el panel de administración).
      const esAlumno = m.rol_en_grupo === 'miembro' || (!m.rol_en_grupo && m.rol === 'usuario');
      const editar = esOwner && !esYo && esAlumno
        ? `<button class="grupos-miembro__editar" data-editar-miembro="${m.id}" aria-label="Editar a ${E(m.nombre_completo || m.username)}" title="Editar alumno">${I('settings')}</button>`
        : '';
      return `
        <div class="grupos-miembro" data-miembro="${m.id}" role="button" tabindex="0" aria-label="Ver perfil de ${E(m.nombre_completo || m.username)}">
          <div class="grupos-miembro__avatar">${avatarHtml(m)}</div>
          <div class="grupos-miembro__info">
            <p class="grupos-miembro__nombre">${E(m.nombre_completo || m.username)}${esYo ? ' <span class="grupos-miembro__tu">(tú)</span>' : ''}</p>
            <p class="grupos-miembro__username">@${E(m.username)}</p>
          </div>
          ${badge}
          ${editar}
          ${online ? `<span class="grupos-miembro__online" title="En línea"></span>` : ''}
        </div>`;
    },

    /* ══════════════════════════════════════════════════════════
       PESTAÑAS DEL DETALLE: Personas · Avisos · Estadísticas
       ══════════════════════════════════════════════════════════ */
    _renderTab(raiz, grupo, usuario, nombre) {
      const cont = raiz.querySelector('#gruposTabContenido');
      if (!cont) return;
      cont.innerHTML = '<div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:90px;border-radius:var(--card-radius)"></div></div>';
      if (nombre === 'personas') this._tabPersonas(cont, grupo, usuario);
      else if (nombre === 'avisos') this._tabAvisos(cont, grupo, usuario);
      else if (nombre === 'trabajo') this._tabTrabajo(cont, grupo, usuario);
      else if (nombre === 'stats') this._tabEstadisticas(cont, grupo, usuario);
    },

    async _tabPersonas(cont, grupo, usuario) {
      // Las solicitudes SOLO las aprueba el admin de la clase (o el owner)
      const esAdmin = usuario.rol === 'owner'
        || (this._miembros || []).some(m => m.id === usuario.id && m.rol_en_grupo === 'admin');
      const [miembros, solicitudes] = await Promise.all([
        window.gruposRepository.obtenerMiembrosDe(grupo.id),
        esAdmin ? window.gruposRepository.solicitudesDeClase(grupo.id) : []
      ]);
      const profesores = miembros.filter(m => ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
      const alumnos = miembros.filter(m => !['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
      const grupoRol = (titulo, lista, icono) => lista.length ? `
        <div class="grupos-rolgrupo">
          <h4 class="grupos-rolgrupo__titulo">${I(icono)} ${titulo} <span>${lista.length}</span></h4>
          <div class="grupos-miembros">${lista.map(m => this._fichaMiembro(m, usuario, this._esOwner)).join('')}</div>
        </div>` : '';

      const solicitudesHtml = solicitudes.length ? `
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${I('user-plus')}</div>
            <div><h3 class="grupos-seccion__titulo">Solicitudes de ingreso</h3>
            <p class="grupos-seccion__desc">${solicitudes.length} espera${solicitudes.length !== 1 ? 'n' : ''} tu aprobación</p></div>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${solicitudes.map(s => `
              <div class="grupos-solicitud" data-solicitud="${s.id}">
                <div class="grupos-miembro__avatar">${avatarHtml(s.perfiles)}</div>
                <div class="grupos-solicitud__info">
                  <p class="grupos-solicitud__nombre">${E(s.perfiles.nombre_completo || s.perfiles.username)}</p>
                  <p class="grupos-solicitud__username">@${E(s.perfiles.username)} · quiere unirse</p>
                </div>
                <div class="grupos-solicitud__acciones">
                  <button class="btn-primario u-fs-xs" data-solicitud-accion="aceptar">${I('check')} Aprobar</button>
                  <button class="btn-secundario u-fs-xs" data-solicitud-accion="rechazar">${I('x')} Rechazar</button>
                </div>
              </div>`).join('')}
          </div>
        </section>` : '';

      cont.innerHTML = `
        ${solicitudesHtml}
        ${grupoRol('Profesores', profesores, 'graduation-cap')}
        ${grupoRol('Alumnos', alumnos, 'users')}
        ${miembros.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Todavía no hay miembros. Comparte el código de la clase para que se unan.</p>' : ''}`;
      if (window.Iconos) window.Iconos.actualizar();

      cont.querySelectorAll('[data-solicitud-accion]').forEach(btn => {
        btn.onclick = async () => {
          const card = btn.closest('[data-solicitud]');
          const s = solicitudes.find(x => x.id === card.dataset.solicitud);
          if (!s) return;
          btn.disabled = true;
          try {
            await window.gruposRepository.resolverSolicitud(s.id, btn.dataset.solicitudAccion === 'aceptar');
            window.helpers.mostrarAlerta(btn.dataset.solicitudAccion === 'aceptar'
              ? `${s.perfiles.nombre_completo || s.perfiles.username} ahora es miembro.` : 'Solicitud rechazada.', 'exito');
            this._tabPersonas(cont, grupo, usuario);
          } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // Perfil rápido de cada miembro
      cont.querySelectorAll('[data-miembro]').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.grupos-miembro__editar')) return;
          const m = miembros.find(x => x.id === el.dataset.miembro);
          if (m) this._perfilRapido(m);
        };
      });
      // Owner: editar alumno (cambiar de grupo / eliminar / dejar sin grupo)
      cont.querySelectorAll('[data-editar-miembro]').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const m = miembros.find(x => x.id === btn.dataset.editarMiembro);
          if (m) this._gestionarAlumno(m, grupo, document.getElementById('app-root'));
        };
      });
    },

    async _tabAvisos(cont, grupo, usuario) {
      const esResponsable = ['admin', 'editor', 'owner'].includes(usuario.rol)
        || (this._miembros || []).some(m => m.id === usuario.id && ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
      const avisos = await window.gruposRepository.listarAvisos(grupo.id);
      cont.innerHTML = `
        ${esResponsable ? `
        <form class="grupos-aviso-form" id="avisoForm">
          <div class="grupos-aviso-form__avatar">${avatarHtml(usuario)}</div>
          <div class="grupos-aviso-form__caja">
            <textarea id="avisoTexto" rows="2" maxlength="2000" placeholder="Anuncia algo a la clase…" aria-label="Contenido del aviso"></textarea>
            <div class="grupos-aviso-form__pie">
              <span class="u-fs-xxs u-color-texto-terciario" id="avisoContador">0/2000</span>
              <button class="btn-primario u-fs-xs" type="submit" id="avisoEnviar">${I('send')} Publicar</button>
            </div>
          </div>
        </form>` : ''}
        <div class="o-pila" style="gap:var(--espaciado-sm)" id="avisosLista">
          ${avisos.length ? avisos.map(a => this._tarjetaAviso(a, usuario, esResponsable)).join('') : '<p class="u-color-texto-terciario u-fs-sm">Aún no hay avisos en esta clase.</p>'}
        </div>`;
      if (window.Iconos) window.Iconos.actualizar();

      const form = cont.querySelector('#avisoForm');
      if (form) {
        const texto = cont.querySelector('#avisoTexto');
        const contador = cont.querySelector('#avisoContador');
        texto.addEventListener('input', () => { if (contador) contador.textContent = `${texto.value.length}/2000`; });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const contenido = texto.value.trim();
          if (!contenido) { window.helpers.mostrarAlerta('Escribe el contenido del aviso.', 'advertencia'); return; }
          const btn = cont.querySelector('#avisoEnviar');
          btn.disabled = true;
          try {
            await window.gruposRepository.crearAviso(grupo.id, contenido);
            window.helpers.mostrarAlerta('Aviso publicado.', 'exito');
            this._tabAvisos(cont, grupo, usuario);
          } catch (err) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
        });
      }

      cont.querySelectorAll('[data-eliminar-aviso]').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Eliminar este aviso?', { titulo: 'Eliminar aviso', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.gruposRepository.eliminarAviso(btn.dataset.eliminarAviso);
            this._tabAvisos(cont, grupo, usuario);
          } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
        };
      });
    },

    _tarjetaAviso(a, usuario, esResponsable) {
      const autor = (a.perfiles && a.perfiles[0]) || a.perfiles || {};
      const puedeBorrar = esResponsable || autor.id === usuario.id;
      return `
        <article class="grupos-aviso">
          <div class="grupos-miembro__avatar">${avatarHtml(autor)}</div>
          <div class="grupos-aviso__cuerpo">
            <div class="grupos-aviso__meta">
              <strong>${E(autor.nombre_completo || autor.username)}</strong>
              <span>${E(window.helpers.formatearFecha(a.creado_en))}</span>
              ${puedeBorrar ? `<button class="grupos-aviso__borrar" data-eliminar-aviso="${a.id}" aria-label="Eliminar aviso">${I('trash-2')}</button>` : ''}
            </div>
            <p class="grupos-aviso__contenido">${E(a.contenido)}</p>
          </div>
        </article>`;
    },

    async _tabTrabajo(cont, grupo, usuario) {
      const esResponsable = ['admin', 'editor', 'owner'].includes(usuario.rol)
        || (this._miembros || []).some(m => m.id === usuario.id && ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
      const [sueltos, evaluaciones] = await Promise.all([
        window.examenesRepository.listarExamenesSueltos(grupo.id).catch(() => []),
        window.examenesRepository.listarEvaluaciones(grupo.id).catch(() => [])
      ]);
      const exs = [...sueltos, ...evaluaciones.flatMap(ev => (ev.examenes || []))].filter(Boolean);
      cont.innerHTML = exs.length ? `
        <div class="o-pila" style="gap:var(--espaciado-xs)">
          ${exs.map(x => `
            <div class="grupos-trabajo-item">
              <span class="grupos-trabajo-item__icono">${I('clipboard-check')}</span>
              <div class="grupos-trabajo-item__info">
                <p class="grupos-trabajo-item__titulo">${E(x.titulo || 'Examen')}</p>
                <p class="grupos-trabajo-item__sub">${E(x.asignatura || '')}${esResponsable ? ` · ${x.intentos || 0} entrega${x.intentos === 1 ? '' : 's'}` : ''}</p>
              </div>
              <a class="btn-secundario u-fs-xs" href="#!/tomar/${encodeURIComponent(x.id)}">${I('eye')} Ver</a>
            </div>`).join('')}
        </div>` : `<p class="u-color-texto-terciario u-fs-sm">Aún no hay exámenes en esta clase.</p>`;
      if (window.Iconos) window.Iconos.actualizar();
    },

    async _tabEstadisticas(cont, grupo, usuario) {
      const [stats, progreso, actividad] = await Promise.all([
        window.gruposRepository.estadisticasClase(grupo.id),
        window.gruposRepository.progresoMiembros(grupo.id),
        window.gruposRepository.actividadClase(grupo.id, 15)
      ]);
      const s = stats || {};
      const tarjeta = (icono, etiqueta, valor) => `
        <div class="grupos-stats-card">
          <span class="grupos-stats-card__icono">${I(icono)}</span>
          <p class="grupos-stats-card__valor">${valor}</p>
          <p class="grupos-stats-card__etiqueta">${etiqueta}</p>
        </div>`;
      const progresoHtml = progreso.length ? `
        <div class="grupos-stats-seccion">
          <h4 class="grupos-rolgrupo__titulo">${I('book-open')} Progreso de estudio</h4>
          <div class="grupos-progreso-lista">
            ${progreso.map(p => `
              <div class="grupos-progreso-item">
                <span class="grupos-miembro__avatar">${avatarHtml(p)}</span>
                <div class="grupos-progreso-item__info">
                  <p class="grupos-progreso-item__nombre">${E(p.nombre_completo || p.username)}</p>
                  <div class="grupos-progreso-item__barra"><span style="width:${Math.min(100, Math.round((p.capitulos_estudiados || 0) / 50 * 100))}%"></span></div>
                </div>
                <strong class="grupos-progreso-item__num">${p.capitulos_estudiados || 0}</strong>
              </div>`).join('')}
          </div>
        </div>` : '';
      const actividadHtml = actividad.length ? `
        <div class="grupos-stats-seccion">
          <h4 class="grupos-rolgrupo__titulo">${I('activity')} Actividad reciente</h4>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${actividad.map(a => `
              <div class="grupos-actividad">
                <span class="grupos-actividad__icono">${I(this._iconoActividad(a.tipo))}</span>
                <p class="grupos-actividad__texto">${E(this._textoActividad(a))}</p>
                <span class="grupos-actividad__fecha">${E(window.helpers.formatearFecha(a.creado_en))}</span>
              </div>`).join('')}
          </div>
        </div>` : '';
      cont.innerHTML = `
        <div class="grupos-stats-grid">
          ${tarjeta('users', 'Miembros', s.miembros ?? '—')}
          ${tarjeta('graduation-cap', 'Profesores', s.profesores ?? '—')}
          ${tarjeta('clipboard-check', 'Exámenes', s.examenes ?? '—')}
          ${tarjeta('megaphone', 'Avisos', s.avisos ?? '—')}
          ${tarjeta('user-plus', 'Solicitudes pendientes', s.solicitudes_pendientes ?? '—')}
          ${tarjeta('zap', 'Activos (7 días)', s.activos_7d ?? '—')}
        </div>
        ${progresoHtml}
        ${actividadHtml}`;
      if (window.Iconos) window.Iconos.actualizar();
    },

    _iconoActividad(tipo) {
      if (tipo === 'solicitud_ingreso') return 'user-plus';
      if (tipo === 'solicitud_aceptada') return 'user-check';
      if (tipo === 'solicitud_rechazada') return 'user-x';
      if (tipo === 'aviso_creado') return 'megaphone';
      if (tipo === 'ingreso_codigo') return 'log-in';
      return 'activity';
    },

    _textoActividad(a) {
      const p = (a.perfiles && a.perfiles[0]) || a.perfiles || {};
      const actor = (p.nombre_completo || p.username) || 'Alguien';
      if (a.tipo === 'solicitud_ingreso') return `${actor} solicitó unirse a la clase`;
      if (a.tipo === 'solicitud_aceptada') return `Solicitud de ${actor} aprobada`;
      if (a.tipo === 'solicitud_rechazada') return `Solicitud de ${actor} rechazada`;
      if (a.tipo === 'aviso_creado') return `${actor} publicó un aviso`;
      if (a.tipo === 'ingreso_codigo') return `${actor} se unió con el código`;
      return `${actor} · ${a.tipo}`;
    },

    /* ══════════════════════════════════════════════════════════
       PERFIL RÁPIDO + FLUJO DESAFIAR (sin cambios)
       ══════════════════════════════════════════════════════════ */
    async _perfilRapido(m) {
      let p = m;
      try {
        const res = await window.supabaseClient.from('perfiles')
          .select('id, nombre_completo, username, rol, foto_perfil, biografia, creado_en')
          .eq('id', m.id).limit(1);
        if (!res.error && res.data && res.data[0]) p = res.data[0];
      } catch (e) { /* sin biografia: usar datos de la lista */ }
      const esYo = p.id === this._usuario.id;

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal grupos-perfil">
          <div class="grupos-perfil__avatar">${avatarHtml(p, true)}</div>
          <h3 class="grupos-perfil__nombre">${E(p.nombre_completo || p.username)}</h3>
          <p class="grupos-perfil__username">@${E(p.username)}</p>
          <span class="perfil-rol-badge">${rolBonito(p.rol)}</span>
          <div class="grupos-perfil__meta">
            <span>${I('calendar')} Miembro desde ${E(fechaCorta(p.creado_en))}</span>
          </div>
          ${p.biografia ? `<p class="grupos-perfil__bio">${E(p.biografia)}</p>` : ''}
          <div class="grupos-perfil__acciones">
            ${esYo ? '' : `<button class="btn-primario grupos-perfil__desafiar" data-perfil-desafio="${p.id}">${I('sword')} Desafiar</button>`}
            <button class="btn-secundario grupos-perfil__cerrar">${I('x')} Cerrar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();

      const cerrar = () => overlay.remove();
      overlay.querySelector('.grupos-perfil__cerrar').onclick = cerrar;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

      const btnDesafiar = overlay.querySelector('[data-perfil-desafio]');
      if (btnDesafiar) btnDesafiar.onclick = async () => {
        btnDesafiar.disabled = true;
        try { await this._flujoDesafio([p]); cerrar(); }
        catch (e) { btnDesafiar.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
    },

    /* ══════════════════════════════════════════════════════════
       OWNER: GESTIÓN DE ALUMNOS (cambiar de grupo / eliminar / sin grupo)
       ══════════════════════════════════════════════════════════ */
    async _gestionarAlumno(m, grupo, raiz) {
      const usuario = this._usuario;
      const nombre = m.nombre_completo || m.username || 'el alumno';
      const volverAMontar = () => { if (raiz && raiz.isConnected) this._montarGrupo(raiz, grupo.id); };

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal grupos-gestion">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${I('settings')} Editar alumno</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${I('x')}</button>
            </div>
            <div class="grupos-gestion__usuario">
              <div class="grupos-gestion__avatar">${avatarHtml(m)}</div>
              <div>
                <p class="grupos-gestion__nombre">${E(nombre)}</p>
                <p class="grupos-gestion__username">@${E(m.username)} · ${E(grupo.nombre)}</p>
              </div>
            </div>
            <div class="grupos-gestion__acciones">
              <button class="grupos-gestion__accion" data-accion="cambiar">
                <span class="grupos-gestion__accion-icono">${I('arrow-left-right')}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Cambiar de grupo</span>
                  <span class="grupos-gestion__accion-desc">Asignar ${E(nombre)} a otra clase</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${I('chevron-right')}</span>
              </button>
              <button class="grupos-gestion__accion" data-accion="eliminar">
                <span class="grupos-gestion__accion-icono">${I('user-minus')}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Eliminar de este grupo</span>
                  <span class="grupos-gestion__accion-desc">Sacar a ${E(nombre)} de «${E(grupo.nombre)}»</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${I('chevron-right')}</span>
              </button>
              <button class="grupos-gestion__accion" data-accion="sinsgrupo">
                <span class="grupos-gestion__accion-icono">${I('user-x')}</span>
                <span>
                  <span class="grupos-gestion__accion-titulo">Dejar sin grupo</span>
                  <span class="grupos-gestion__accion-desc">Quitar la clase principal a ${E(nombre)}</span>
                </span>
                <span class="grupos-gestion__accion-flecha">${I('chevron-right')}</span>
              </button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();
      const cerrar = () => overlay.remove();
      overlay.querySelector('[data-cerrar]').onclick = cerrar;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

      overlay.querySelectorAll('[data-accion]').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          const accion = btn.dataset.accion;
          try {
            if (accion === 'cambiar') {
              cerrar();
              await this._cambiarGrupoAlumno(m, grupo, raiz);
            } else if (accion === 'eliminar') {
              const ok = await window.helpers.confirmar(
                `¿Eliminar a ${E(nombre)} de «${E(grupo.nombre)}»? Podrás volver a añadirlo con el código de la clase.`,
                { titulo: 'Eliminar del grupo', textoConfirmar: 'Eliminar' }
              );
              if (!ok) { cerrar(); return; }
              await window.gruposRepository.salirDeGrupo(grupo.id, m.id);
              // Si la clase actual era su clase principal, se la quitamos también
              if (m.grupo_id === grupo.id) {
                await window.adminRepository.actualizarUsuario(m.id, {
                  nombre_completo: m.nombre_completo, username: m.username, rol: m.rol, grupo_id: null
                });
              }
              await window.adminRepository.registrarAuditoria('usuario:grupo', `${E(nombre)} eliminado de «${E(grupo.nombre)}»`, usuario.id);
              window.helpers.mostrarAlerta(`${E(nombre)} ya no está en «${E(grupo.nombre)}».`, 'exito');
              volverAMontar();
            } else if (accion === 'sinsgrupo') {
              const ok = await window.helpers.confirmar(
                `¿Dejar a ${E(nombre)} sin grupo? Se le quitará su clase principal y podrás asignarle otra después.`,
                { titulo: 'Dejar sin grupo', textoConfirmar: 'Dejar sin grupo' }
              );
              if (!ok) { cerrar(); return; }
              await window.adminRepository.actualizarUsuario(m.id, {
                nombre_completo: m.nombre_completo, username: m.username, rol: m.rol, grupo_id: null
              });
              // Si además tenía membresía manual en este grupo, se la quitamos
              await window.gruposRepository.salirDeGrupo(grupo.id, m.id);
              await window.adminRepository.registrarAuditoria('usuario:grupo', `${E(nombre)} dejado sin grupo`, usuario.id);
              window.helpers.mostrarAlerta(`${E(nombre)} quedó sin grupo.`, 'exito');
              volverAMontar();
            }
          } catch (e) {
            btn.disabled = false;
            window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
          }
        };
      });
    },

    // Owner: asignar al alumno a otra clase (actualiza la clase principal
    // vía RPC admin_actualizar_usuario, igual que el panel de administración).
    async _cambiarGrupoAlumno(m, grupo, raiz) {
      const usuario = this._usuario;
      const grupos = await window.adminRepository.listarGrupos();
      const opciones = (grupos || []).map(g => ({ valor: g.id, texto: g.nombre }));
      const datos = await window.helpers.formulario({
        titulo: 'Cambiar de grupo',
        mensaje: `Selecciona la nueva clase para ${E(m.nombre_completo || m.username)}.`,
        campos: [{ nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select', valor: m.grupo_id || grupo.id || '', opciones }],
        textoConfirmar: 'Guardar'
      });
      if (!datos) return;
      const nuevoId = datos.grupo_id || null;
      if (nuevoId === (m.grupo_id || null) && nuevoId !== null) {
        window.helpers.mostrarAlerta('Ya está en ese grupo.', 'info');
        return;
      }
      try {
        await window.adminRepository.actualizarUsuario(m.id, {
          nombre_completo: m.nombre_completo, username: m.username, rol: m.rol, grupo_id: nuevoId
        });
        // Si el alumno estaba en la clase actual por membresía manual, la
        // quitamos para que no aparezca en dos sitios.
        if (nuevoId !== grupo.id) {
          await window.gruposRepository.salirDeGrupo(grupo.id, m.id);
        }
        await window.adminRepository.registrarAuditoria('usuario:grupo', `${E(m.nombre_completo || m.username)} movido a ${nuevoId ? 'nuevo grupo' : 'sin grupo'}`, usuario.id);
        const destino = nuevoId ? (grupos.find(g => g.id === nuevoId)?.nombre || 'nuevo grupo') : 'sin grupo';
        window.helpers.mostrarAlerta(`${E(m.nombre_completo || m.username)} ahora está en ${destino}.`, 'exito');
        if (raiz && raiz.isConnected) this._montarGrupo(raiz, grupo.id);
      } catch (e) {
        window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
      }
    },

    // Paso común: elegir mazo → construir sesión idéntica → crear desafío
    async _flujoDesafio(participantes) {
      if (this._flujoEnCurso) return;
      this._flujoEnCurso = true;
      const terminarFlujo = () => { this._flujoEnCurso = false; };
      const usuario = this._usuario;
      const mazos = await window.desafiosRepository.listarMazosDesafio();
      if (!mazos.length) {
        window.helpers.mostrarAlerta('Aún no hay mazos de memorización para desafiar.', 'info');
        terminarFlujo();
        return;
      }
      const tarjetasTodas = await window.memorizacionRepository.listarTarjetas(null);
      const contar = (mazoId) => (tarjetasTodas || []).filter(t => t.mazo_id === mazoId).length;

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${I('sword')} Elegir mazo</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${I('x')}</button>
            </div>
            <p class="u-fs-xs u-color-texto-terciario">Desafiarás a ${participantes.length} participante${participantes.length !== 1 ? 's' : ''}. Todos responderéis las mismas preguntas.</p>
            <div class="grupos-tiempo">
              <p class="grupos-tiempo__titulo">Tiempo por desafío</p>
              <div class="grupos-tiempo__opciones" role="radiogroup" aria-label="Tiempo del desafío">
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="limitado" checked>
                  <span>Con tiempo</span>
                </label>
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="ilimitado">
                  <span>Sin límite</span>
                </label>
                <label class="grupos-tiempo__opcion">
                  <input type="radio" name="tiempoDesafio" value="carrera">
                  <span>El primero que acabe</span>
                </label>
              </div>
              <div class="grupos-tiempo__minutos" id="gruposTiempoMinutos">
                <label class="grupos-tiempo__campo">
                  <span>Minutos</span>
                  <input type="number" id="tiempoMinutos" min="1" step="1" value="2" inputmode="numeric">
                </label>
                <p class="grupos-tiempo__ayuda">Mínimo 1 minuto</p>
              </div>
            </div>
            <div class="grupos-mazos">
              ${mazos.length === 0
                ? '<p class="u-color-texto-terciario u-fs-sm">Sin mazos disponibles.</p>'
                : mazos.map(m => `
                  <button class="grupos-mazo" data-mazo="${m.id}" data-nombre="${E(m.nombre)}">
                    <span class="grupos-mazo__icono">${I(m.icono || 'layers')}</span>
                    <span class="grupos-mazo__info">
                      <span class="grupos-mazo__nombre">${E(m.nombre)}</span>
                      <span class="grupos-mazo__desc">${E(m.descripcion || 'Mazo de memorización')} · ${contar(m.id)} tarjetas</span>
                    </span>
                    <span class="grupos-mazo__flecha">${I('chevron-right')}</span>
                  </button>`).join('')}
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();
      let resolver = null;
      const cerrarModal = () => { overlay.remove(); if (resolver) resolver(null); terminarFlujo(); };
      overlay.querySelector('[data-cerrar]').onclick = cerrarModal;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });
      // "Sin límite" y "El primero que acabe" ocultan el campo de minutos
      const minutosBox = overlay.querySelector('#gruposTiempoMinutos');
      const alternarMinutos = () => {
        const sel = overlay.querySelector('input[name="tiempoDesafio"]:checked');
        if (minutosBox && sel) minutosBox.hidden = sel.value !== 'limitado';
      };
      overlay.querySelectorAll('input[name="tiempoDesafio"]').forEach(r => r.addEventListener('change', alternarMinutos));

      return new Promise((resolve) => {
        resolver = resolve;
        overlay.querySelectorAll('[data-mazo]').forEach(btn => {
          btn.onclick = async () => {
            const mazo = mazos.find(m => m.id === btn.dataset.mazo);
            if (!mazo) return;
            const tarjetas = (tarjetasTodas || []).filter(t => t.mazo_id === mazo.id);
            if (!tarjetas.length) { window.helpers.mostrarAlerta('Ese mazo no tiene tarjetas todavía.', 'advertencia'); return; }
            const selTiempo = overlay.querySelector('input[name="tiempoDesafio"]:checked');
            const ilimitado = selTiempo && selTiempo.value === 'ilimitado';
            const esCarrera = selTiempo && selTiempo.value === 'carrera';
            const minutos = Math.max(1, parseInt(overlay.querySelector('#tiempoMinutos')?.value, 10) || 2);
            const sesion = J().construirSesion(tarjetas, tarjetasTodas || [], { maxTarjetas: 10 });
            overlay.remove();
            btn.disabled = true;
            try {
              const desafio = await window.desafiosRepository.crearDesafio({
                creador: usuario,
                participantes,
                mazo,
                sesion,
                tiempoLimiteSeg: (ilimitado || esCarrera) ? null : minutos * 60,
                finalizaPrimerTerminado: esCarrera
              });
              window.helpers.mostrarAlerta(`Desafío enviado a ${participantes.length} participante${participantes.length !== 1 ? 's' : ''}.`, 'exito');
              resolve(desafio);
              terminarFlujo();
              router.navegar('/desafio/' + desafio.id);
            } catch (e) {
              btn.disabled = false;
              const msg = (e && e.message) || '';
              if (/finaliza_primer_terminado.*does not exist/i.test(msg)) {
                window.helpers.mostrarAlerta('El modo "El primero que acabe" requiere aplicar la migración 036 en la base de datos.', 'advertencia');
              } else {
                window.helpers.mostrarAlerta('Error: ' + msg, 'error');
              }
              resolve(null);
              terminarFlujo();
            }
          };
        });
      });
    }
  };
})();
