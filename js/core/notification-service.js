// ============================================================
// js/core/notification-service.js
// Notification Service — centro de comunicaciones de FormsBíblicos.
//
// Todo módulo de la app que quiera notificar DEBE emitir un evento:
//
//   window.notificationService.emitir('desafio.creado', { ... });
//
// El servicio decide: persistir (BD), agrupar, respetar preferencias,
// reproducir sonido/vibración, mostrar banner/toast/notificación
// nativa, actualizar el centro y preparar futuros canales (Web Push,
// correo, etc.). Los módulos nunca deciden cómo se muestra un aviso.
//
// Mecanismos de entrega (orden de preferencia):
//   1. Supabase Realtime  → inmediato (cuando está disponible)
//   2. Polling (6s)       → respaldo, mismo comportamiento que antes
// ============================================================

// ------------------------------------------------------------
// Metadatos de categorías: icono + color (tokens del sistema de
// diseño) + clave de preferencia asociada. Fuente única de verdad
// para la iconografía de cada categoría en toda la app.
// ------------------------------------------------------------
const CATEGORIAS = {
  desafios: { etiqueta: 'Desafíos',  icono: 'sword',          color: 'var(--color-naranja)',      soft: 'var(--color-naranja-100)',  pref: 'notif_desafios', legacy: ['notif_logros'] },
  examenes: { etiqueta: 'Exámenes',  icono: 'clipboard-check',color: 'var(--color-info)',         soft: 'var(--color-info-soft)',    pref: 'notif_examenes' },
  estudio:  { etiqueta: 'Estudio',   icono: 'book-open',      color: 'var(--color-exito)',        soft: 'var(--color-exito-soft)',   pref: 'notif_estudio',  legacy: ['notif_recordatorios'] },
  grupos:   { etiqueta: 'Grupos',    icono: 'users',          color: 'var(--color-aviso)',        soft: 'var(--color-aviso-soft)',   pref: 'notif_grupos',   legacy: ['notif_invitaciones'] },
  logros:   { etiqueta: 'Logros',    icono: 'trophy',         color: 'var(--color-amarillo-500)', soft: 'var(--color-amarillo-100)', pref: 'notif_logros' },
  sistema:  { etiqueta: 'Sistema',   icono: 'settings',       color: 'var(--color-gris-500)',     soft: 'var(--color-gris-100)',     pref: 'notif_sistema' },
  anuncios: { etiqueta: 'Anuncios',  icono: 'megaphone',      color: 'var(--color-acento)',       soft: 'var(--color-acento-soft)',  pref: 'notif_anuncios' }
};

const PRIORIDADES = { critica: 0, alta: 1, media: 2, baja: 3 };
const ESTADOS = ['nueva', 'vista', 'completada', 'archivada'];

// Catálogo de acciones rápidas (icono + etiqueta) usadas por el
// centro de notificaciones y los banners interactivos.
const ACCIONES = {
  aceptar:  { etiqueta: 'Aceptar',         icono: 'check' },
  rechazar: { etiqueta: 'Rechazar',        icono: 'x' },
  ver:      { etiqueta: 'Ver',             icono: 'eye' },
  resolver: { etiqueta: 'Resolver',        icono: 'play' },
  corregir: { etiqueta: 'Corregir',        icono: 'check-square' },
  verNota:  { etiqueta: 'Ver nota',        icono: 'eye' },
  estudiar: { etiqueta: 'Comenzar estudio',icono: 'book-open' }
};

class NotificationService {
  constructor() {
    this._configs = {};
    this._presentadas = new Set();   // dedupe de filas ya mostradas (sesión)
    this._pollTimer = null;
    this._reminderTimer = null;
    this._canal = null;
    this._iniciado = false;
    this._usuarioId = null;
    // Metadatos expuestos a las vistas (iconografía única en toda la app)
    this.CATEGORIAS = CATEGORIAS;
    this.PRIORIDADES = PRIORIDADES;
    this.ESTADOS = ESTADOS;
    this.ACCIONES = ACCIONES;
    this._registrarEventos();
  }

  // ============================================================
  // Registro de eventos (ampliar aquí para nuevos tipos)
  // ============================================================
  _registrarEventos() {
    const r = (nombre, cfg) => { this._configs[nombre] = { ...cfg, nombre }; };

    // ── Desafíos ────────────────────────────────────────────
    r('desafio.creado', {
      categoria: 'desafios', prioridad: 'alta',
      titulo: (p) => `${p.creador || 'Alguien'} te ha desafiado`,
      cuerpo: (p) => `Mazo: ${p.mazo || 'Memorización'}`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'sword',
      banner: true, nativo: true, toast: false, sonido: true,
      acciones: ['aceptar', 'rechazar', 'ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.aceptado', {
      categoria: 'desafios', prioridad: 'media',
      titulo: (p) => `${p.jugador || 'Alguien'} aceptó tu desafío`,
      tituloAgrupado: (p, n) => n === '{n}'
        ? '{n} jugadores aceptaron tu desafío'
        : (n > 1 ? `${n} jugadores aceptaron tu desafío` : `${p.jugador || 'Alguien'} aceptó tu desafío`),
      cuerpo: (p) => `«${p.mazo || 'Memorización'}» — se acerca el comienzo`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'users',
      nativo: false, toast: true, sonido: true,
      acciones: ['ver'],
      agrupacionClave: (p) => `desafio:aceptados:${p.desafioId}`,
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.rechazado', {
      categoria: 'desafios', prioridad: 'baja',
      titulo: () => 'Desafío rechazado',
      cuerpo: (p) => `${p.jugador || 'Un participante'} rechazó el desafío de «${p.mazo || 'memorización'}».`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'x',
      nativo: false, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.iniciado', {
      categoria: 'desafios', prioridad: 'alta',
      titulo: () => '¡El desafío ha comenzado!',
      cuerpo: (p) => `El desafío «${p.mazo || 'Memorización'}» está en marcha. ¡Mucha suerte!`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'sword',
      nativo: true, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.abandonado', {
      categoria: 'desafios', prioridad: 'baja',
      titulo: (p) => `${p.jugador || 'Un participante'} abandonó el desafío`,
      cuerpo: (p) => `«${p.mazo || 'Memorización'}» — se retiró a mitad de partida.`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'log-out',
      nativo: false, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.finalizado', {
      categoria: 'desafios', prioridad: 'media',
      titulo: () => 'Desafío finalizado',
      cuerpo: (p) => `Consulta los resultados del desafío «${p.mazo || 'Memorización'}».`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'trophy',
      nativo: false, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('desafio.cancelado', {
      categoria: 'desafios', prioridad: 'baja',
      titulo: () => 'Desafío cerrado',
      cuerpo: (p) => `El desafío «${p.mazo || 'Memorización'}» se cerró sin resultados.`,
      url: (p) => `/desafio/${p.desafioId}`,
      icono: 'x-circle',
      nativo: false, toast: false, sonido: false,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });

    // ── Exámenes ────────────────────────────────────────────
    r('examen.publicado', {
      categoria: 'examenes', prioridad: 'alta',
      titulo: () => 'Nuevo examen disponible',
      cuerpo: (p) => `«${p.titulo || 'Examen'}» está disponible para realizar.`,
      url: (p) => `/tomar/${p.examenId}`,
      icono: 'clipboard-check',
      nativo: true, toast: true, sonido: true,
      acciones: ['resolver'],
      destinatarios: async (p) => {
        const sb = window.supabaseClient;
        if (!sb || !p.grupoId) return [];
        try {
          const { data } = await sb.from('perfiles').select('id').eq('grupo_id', p.grupoId).eq('rol', 'usuario');
          return (data || []).map(m => m.id);
        } catch (e) { return []; }
      }
    });
    r('examen.entregado', {
      categoria: 'examenes', prioridad: 'alta',
      titulo: () => 'Examen entregado',
      cuerpo: (p) => `${p.alumno || 'Un alumno'} ha entregado «${p.titulo || ''}». Está listo para corregir.`,
      url: (p) => `/corregir/${p.examenId}`,
      icono: 'send',
      nativo: true, toast: true, sonido: true,
      acciones: ['corregir'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('examen.corregido', {
      categoria: 'examenes', prioridad: 'alta',
      titulo: () => 'Tu examen ha sido corregido',
      cuerpo: (p) => p.nota != null ? `«${p.titulo || 'Examen'}» — Nota: ${p.nota}/10` : `«${p.titulo || 'Examen'}» ya está calificado.`,
      url: (p) => `/tomar/${p.examenId}`,
      icono: 'check-circle',
      nativo: true, toast: true, sonido: true,
      acciones: ['verNota'],
      destinatarios: (p) => p.destinatarios || null
    });

    // ── Estudio ─────────────────────────────────────────────
    r('estudio.completado', {
      categoria: 'estudio', prioridad: 'media',
      titulo: () => '¡Capítulo completado!',
      cuerpo: (p) => `Has completado el estudio de ${p.libro || ''} ${p.capitulo || ''}.`,
      url: () => '/estudio',
      icono: 'book-open',
      nativo: true, toast: false, sonido: true,
      acciones: []
    });
    r('mazo.nuevo', {
      categoria: 'estudio', prioridad: 'media',
      titulo: () => 'Nuevo mazo de memorización',
      cuerpo: (p) => `«${p.nombre || 'Memorización'}» ha sido añadido. ¡Practica y reta a tus amigos!`,
      url: () => '/memorizacion',
      icono: 'layers',
      nativo: true, toast: true, sonido: true,
      acciones: ['estudiar'],
      destinatarios: async (p) => {
        const sb = window.supabaseClient;
        if (!sb || !p.adminId) return [];
        try {
          const ids = new Set();
          const { data: admin } = await sb.from('perfiles').select('grupo_id').eq('id', p.adminId).limit(1);
          const grupoId = admin && admin[0] && admin[0].grupo_id;
          if (grupoId) {
            const { data } = await sb.from('perfiles').select('id').eq('grupo_id', grupoId);
            (data || []).forEach(m => ids.add(m.id));
          }
          // El admin/owner también recibe el aviso (antes quedaba excluido y
          // "no le llegaban" las notificaciones de mazo nuevo como al resto).
          ids.add(p.adminId);
          return [...ids];
        } catch (e) { return [p.adminId]; }
      }
    });
    r('recordatorio.corregir', {
      categoria: 'examenes', prioridad: 'media',
      titulo: () => 'Exámenes por corregir',
      cuerpo: (p) => `${p.cantidad || 0} entrega${p.cantidad === 1 ? '' : 's'} espera${p.cantidad === 1 ? '' : 'n'} tu corrección.`,
      url: () => '/calificaciones',
      icono: 'check-square',
      nativo: false, toast: true, sonido: true,
      acciones: ['ver']
    });

    // ── Grupos ──────────────────────────────────────────────
    r('grupo.invitacion', {
      categoria: 'grupos', prioridad: 'alta',
      titulo: (p) => `Invitación a ${p.grupo || 'un grupo'}`,
      cuerpo: (p) => `${p.quien || 'Un administrador'} te ha invitado a unirte.`,
      url: () => '/grupos',
      icono: 'user-plus',
      nativo: true, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('grupo.unido', {
      categoria: 'grupos', prioridad: 'baja',
      titulo: (p) => `${p.usuario || 'Alguien'} se unió a tu grupo`,
      cuerpo: () => '¡Bienvenido a la comunidad de estudio!',
      url: () => '/grupos',
      icono: 'users',
      nativo: false, toast: false, sonido: false,
      acciones: [],
      destinatarios: (p) => p.destinatarios || null
    });
    r('grupo.solicitud', {
      categoria: 'grupos', prioridad: 'alta',
      titulo: (p) => `Solicitud de ${p.usuario || 'un alumno'}`,
      cuerpo: (p) => `Quiere unirse a «${p.grupo || 'tu clase'}». Revisa las solicitudes.`,
      url: (p) => `/grupos/${p.grupoId}`,
      icono: 'user-plus',
      nativo: true, toast: true, sonido: true,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });
    r('grupo.aviso', {
      categoria: 'grupos', prioridad: 'media',
      titulo: (p) => `Nuevo aviso en ${p.grupo || 'tu clase'}`,
      cuerpo: (p) => (p.autor ? `${p.autor}: ` : '') + (p.contenido || ''),
      url: (p) => `/grupos/${p.grupoId}`,
      icono: 'megaphone',
      nativo: false, toast: true, sonido: false,
      acciones: ['ver'],
      destinatarios: (p) => p.destinatarios || null
    });

    // ── Logros y sistema ────────────────────────────────────
    r('logro.desbloqueado', {
      categoria: 'logros', prioridad: 'media',
      titulo: (p) => `Logro desbloqueado: ${p.nombre || ''}`,
      cuerpo: (p) => p.descripcion || '',
      url: () => '/progreso',
      icono: 'trophy',
      nativo: true, toast: false, sonido: true,
      acciones: []
    });
    r('sistema.actualizado', {
      categoria: 'sistema', prioridad: 'baja',
      titulo: () => 'Nueva versión disponible',
      cuerpo: (p) => `Versión ${p.version || ''} ya está disponible.`,
      url: null,
      icono: 'download-cloud',
      nativo: false, toast: true, sonido: false,
      acciones: []
    });

    // ── Anuncios (owner) ────────────────────────────────────
    // Los anuncios ignoran las preferencias del usuario: siempre
    // se entregan (requisito de administración).
    r('anuncio.creado', {
      categoria: 'anuncios', prioridad: 'critica',
      titulo: (p) => p.titulo || 'Anuncio',
      cuerpo: (p) => p.cuerpo || '',
      url: null,
      icono: 'megaphone',
      respetarPrefs: false,
      nativo: true, toast: true, sonido: true, requireInteraction: true,
      acciones: [],
      destinatarios: (p) => p.destinatarios || null
    });
  }

  // ============================================================
  // API pública
  // ============================================================

  /** Registra un evento nuevo en tiempo de ejecución (extensible). */
  registrar(nombre, cfg) {
    if (!nombre || !cfg) return;
    this._configs[nombre] = { ...cfg, nombre };
  }

  /** Fuerza la recarga del centro (badge + lista) desde la BD. */
  async refrescar() {
    await this._refrescarCentro();
  }

  /**
   * Punto único de entrada para notificar. Los módulos emiten eventos
   * y el servicio se encarga de TODO lo demás.
   */
  async emitir(nombre, payload = {}, opciones = {}) {
    const cfg = this._configs[nombre];
    if (!cfg) { console.warn(`[NotifService] Evento sin registrar: ${nombre}`); return null; }
    const usuario = this._usuario();
    if (!usuario || !usuario.id) return null;

    // Preferencias: si la categoría está desactivada, no persistir ni mostrar.
    if (cfg.respetarPrefs !== false && !this._categoriaHabilitada(cfg.categoria)) return null;

    // 1. Construir contenido
    const titulo = cfg.titulo ? cfg.titulo(payload) : (payload.titulo || nombre);
    const cuerpo = cfg.cuerpo ? cfg.cuerpo(payload) : (payload.cuerpo || '');
    const url = cfg.url ? cfg.url(payload) : (payload.url || null);
    const icono = cfg.icono || (CATEGORIAS[cfg.categoria] && CATEGORIAS[cfg.categoria].icono);
    const datos = { ...(payload.datos || {}), ...(payload._datos || {}) };
    const agrupacionClave = cfg.agrupacionClave ? cfg.agrupacionClave(payload) : (payload.agrupacionClave || null);

    // 2. Destinatarios (quién recibe la fila persistida)
    let destinatarios = null;
    if (cfg.destinatarios) {
      try { destinatarios = await cfg.destinatarios(payload, usuario); } catch (e) { destinatarios = null; }
      if (!destinatarios || !destinatarios.length) return null; // sin destinatarios → no-op
    } else {
      destinatarios = [usuario.id];
    }

    // 3. Persistir (historial permanente; se archiva, nunca desaparece)
    let filaGuardada = null;
    let resultado = null;
    if (cfg.persistir !== false && window.notificacionesRepository) {
      try {
        const filas = destinatarios.map(uid => ({
          usuario_id: uid,
          tipo: nombre,
          categoria: cfg.categoria,
          prioridad: cfg.prioridad || 'media',
          estado: 'nueva',
          titulo,
          cuerpo,
          datos: { ...datos, url },
          agrupacion_clave: agrupacionClave,
          contador: 1,
          acciones: (cfg.acciones || []).map(a => ({ id: a, ...(ACCIONES[a] || {}) })),
          emisor_id: payload.emisorId || usuario.id,
          // Para agrupación: plantilla con marcador {n} que el repositorio
          // sustituye por el contador real al fusionar filas.
          tituloAgrupado: cfg.tituloAgrupado ? cfg.tituloAgrupado(payload, '{n}') : null
        }));
        resultado = await window.notificacionesRepository.insertarFilas(filas);
        filaGuardada = (resultado || []).find(f => f && f.usuario_id === usuario.id) || null;
        // Evitar doble presentación: la fila recién mostrada no debe volver a
        // emitirse por el poller/realtime (que solo leen estado='nueva').
        if (filaGuardada && filaGuardada.id) {
          this._presentadas.add(filaGuardada.id);
          this._persistirPresentadas();
        }
      } catch (e) { console.warn('[NotifService] persistir:', e); }

      // 3b. Push nativo a destinatarios AJENOS (solo Capacitor/Android): las
      // mismas filas del historial se entregan como notificación nativa vía
      // FCM (Edge Function enviar-push). Los eventos propios se omiten porque
      // el dispositivo ya los muestra la capa in-app (realtime/polling).
      if (window.pushNotificationService && window.pushNotificationService.enviarPush) {
        const ajenas = (resultado || []).filter((f) => f && f.usuario_id && f.usuario_id !== usuario.id);
        if (ajenas.length) window.pushNotificationService.enviarPush(ajenas);
      }
    }

    // 4. Presentar al usuario actual si es destinatario
    const soyDestinatario = destinatarios.includes(usuario.id);
    if (soyDestinatario && !cfg.silencioso && !opciones.silencioso) {
      this._presentar({
        cfg, nombre,
        // Si la fila fue agrupada, el repositorio ya devolvió el título
        // agregado correcto ("4 jugadores aceptaron...") — usarlo sobre el
        // título singular local.
        titulo: (filaGuardada && filaGuardada.titulo) || titulo,
        cuerpo, url, icono,
        datos,
        fila: filaGuardada,
        payload
      });
    }

    // 5. Sincronizar estado central (badge + centro)
    await this._refrescarCentro();
    return filaGuardada;
  }

  /** Ejecuta una acción rápida de una notificación (banner o centro). */
  async ejecutarAccion(notifId, accionId, fila) {
    const usuario = this._usuario();
    if (!usuario) return false;
    const f = fila || {};
    const datos = (f.datos && typeof f.datos === 'object') ? f.datos : {};
    const url = f.url || datos.url || null;
    let ok = true;

    try {
      if (accionId === 'aceptar') {
        const r = await window.desafiosRepository.responderInvitacion(datos.desafio_id, usuario.id, true);
        if (r && r.empezado) router.navegar('/desafio/' + datos.desafio_id);
        else { window.helpers.mostrarAlerta('Has aceptado. Esperando a los demás...', 'exito'); router.navegar('/desafio/' + datos.desafio_id); }
      } else if (accionId === 'rechazar') {
        await window.desafiosRepository.responderInvitacion(datos.desafio_id, usuario.id, false);
        window.helpers.mostrarAlerta('Has rechazado el desafío.', 'info');
      } else if (url) {
        router.navegar(url);
      }
    } catch (e) {
      ok = false;
      window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
    }

    if (notifId) {
      await this.marcarCompletada(notifId);
    }
    await this._refrescarCentro();
    return ok;
  }

  // ---- Ciclo de vida desde el centro ----

  async marcarVistasEnCentro(ids) {
    if (!ids || !ids.length) return;
    if (window.notificacionesRepository) await window.notificacionesRepository.marcarVistas(ids);
    await this._refrescarCentro();
  }

  async marcarTodasVistas() {
    const u = this._usuario();
    if (!u || !window.notificacionesRepository) return;
    await window.notificacionesRepository.marcarTodasVistas(u.id);
    await this._refrescarCentro();
  }

  async marcarCompletada(id) {
    if (!id || !window.notificacionesRepository) return;
    await window.notificacionesRepository.actualizarEstado(id, 'completada');
    await this._refrescarCentro();
  }

  // Marca una fila como vista sin refrescar el centro (evita un ciclo
  // extra de render por cada cierre de banner).
  async _marcarVista(id) {
    if (!id || !window.notificacionesRepository) return;
    try {
      await window.notificacionesRepository.actualizarEstado(id, 'vista');
      await this._refrescarCentro();
    } catch (e) { /* silencioso */ }
  }

  async archivar(id) {
    if (!id || !window.notificacionesRepository) return;
    await window.notificacionesRepository.actualizarEstado(id, 'archivada');
    await this._refrescarCentro();
  }

  async eliminar(id) {
    if (!id || !window.notificacionesRepository) return;
    await window.notificacionesRepository.eliminar(id);
    await this._refrescarCentro();
  }

  // ---- Arranque / parada ----

  /** Inicia poller + realtime + recordatorios para el usuario actual. */
  async iniciar() {
    const usuario = this._usuario();
    if (!usuario || !usuario.id || this._iniciado) return;
    this._iniciado = true;
    this._usuarioId = usuario.id;
    this._cargarPresentadas();

    // Realtime (inmediato) + polling (respaldo)
    if (window.notificacionesRepository) {
      this._canal = window.notificacionesRepository.suscribirRealtime(usuario.id, (t, f) => this._onRealtime(t, f));
    }
    this._iniciarPoller();

    // Recordatorios inteligentes (inicio + cada 6h)
    this.generarRecordatorios();
    this._reminderTimer = setInterval(() => this.generarRecordatorios(), 6 * 3600 * 1000);

    await this._refrescarCentro();
  }

  detener() {
    this._iniciado = false;
    this._usuarioId = null;
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    if (this._reminderTimer) { clearInterval(this._reminderTimer); this._reminderTimer = null; }
    if (window.notificacionesRepository) window.notificacionesRepository.cancelarRealtime(this._canal);
    this._canal = null;
    this._presentadas.clear();
    const banner = document.getElementById('notif-banner');
    if (banner) banner.remove();
    const campana = document.getElementById('notif-barra');
    if (campana) campana.remove();
  }

  // ============================================================
  // Internos
  // ============================================================

  _usuario() {
    try {
      return window.store && window.store.obtener ? window.store.obtener('usuario') : null;
    } catch (e) { return null; }
  }

  _categoriaHabilitada(categoria) {
    const meta = CATEGORIAS[categoria];
    if (!meta) return true;
    try {
      const u = this._usuario();
      let p = (u && u.preferencias) || {};
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = {}; } }
      if (p[meta.pref] === false) return false;
      for (const leg of meta.legacy || []) if (p[leg] === false) return false;
      return true;
    } catch (e) { return true; }
  }

  // ---- Polling (respaldo) ----

  _iniciarPoller() {
    this._pollTimer = setInterval(() => this._poll(), 6000);
    setTimeout(() => this._poll(), 1500);
  }

  async _poll() {
    const usuario = this._usuario();
    if (!usuario || !window.notificacionesRepository) return;
    // Barrido de desafíos vencidos (~1/min, fire-and-forget): ningún desafío
    // queda abierto con el reloj contando infinito aunque nadie abra su vista
    // (la RPC global de la migración 038 cierra invitaciones expiradas,
    // vencidos por límite de tiempo y sin-límite abiertos hace >24h).
    if (!this._ultimoSweep || Date.now() - this._ultimoSweep > 60000) {
      this._ultimoSweep = Date.now();
      const repo = window.desafiosRepository;
      if (repo && typeof repo.sweepVencidos === 'function') {
        repo.sweepVencidos().catch(() => {});
      }
    }
    try {
      const filas = await window.notificacionesRepository.listar(usuario.id, { soloNuevas: true, limite: 15 });
      for (const f of filas) {
        if (this._presentadas.has(f.id)) continue;
        const cfg = this._configs[f.tipo] || this._configLegacy(f);
        if (!cfg) continue;
        this._presentadas.add(f.id);
        this._persistirPresentadas();
        if (this._categoriaHabilitada(cfg.categoria)) {
          this._presentar({
            cfg, nombre: f.tipo,
            titulo: f.titulo, cuerpo: f.cuerpo,
            url: this._urlDe(f), icono: cfg.icono,
            datos: f.datos || {}, fila: f
          });
        }
      }
      await this._refrescarCentro();
    } catch (e) { /* silencioso */ }
  }

  // Config sintética para filas legacy (insertadas por código antiguo).
  _configLegacy(f) {
    const mapa = (window.notificacionesRepository && window.notificacionesRepository.MAPA_TIPO) || {};
    const meta = mapa[f.tipo] || {};
    const cfg = {
      categoria: meta.categoria || 'sistema',
      prioridad: meta.prioridad || 'media',
      icono: (CATEGORIAS[meta.categoria] && CATEGORIAS[meta.categoria].icono) || 'bell',
      nativo: true, toast: true, sonido: true, banner: false, acciones: []
    };
    if (f.tipo === 'desafio') {
      cfg.banner = true;
      cfg.acciones = ['aceptar', 'rechazar', 'ver'].map(a => ({ id: a, ...(ACCIONES[a] || {}) }));
    } else if (f.tipo === 'anuncio') {
      cfg.respetarPrefs = false;
      cfg.prioridad = 'critica';
      cfg.requireInteraction = true;
    } else if (f.tipo === 'solicitud_clase') {
      cfg.respetarPrefs = false;
      cfg.prioridad = 'alta';
      cfg.acciones = ['ver'].map(a => ({ id: a, ...(ACCIONES[a] || {}) }));
    } else if (f.tipo === 'grupo' && f.datos && f.datos.grupo_id) {
      cfg.acciones = ['ver'].map(a => ({ id: a, ...(ACCIONES[a] || {}) }));
    }
    return cfg;
  }

  _urlDe(f) {
    const d = (f && f.datos) || {};
    if (f.tipo === 'desafio' && d.desafio_id) return '/desafio/' + d.desafio_id;
    if ((f.tipo === 'examen_publicado' || f.tipo === 'examen_corregido') && d.examen_id) return '/tomar/' + d.examen_id;
    if (f.tipo === 'examen_entregado' && d.examen_id) return '/corregir/' + d.examen_id;
    if ((f.tipo === 'solicitud_clase' || f.tipo === 'grupo') && d.grupo_id) return '/grupos/' + d.grupo_id;
    if (f.tipo === 'mazo_nuevo' && d.mazo_id) return '/memorizacion';
    if (f.tipo === 'recordatorio') return '/memorizacion';
    return d.url || null;
  }

  // ---- Realtime ----

  _onRealtime(tipo, fila) {
    if (tipo === 'insert' && fila && fila.usuario_id === this._usuarioId) {
      if (this._presentadas.has(fila.id)) return;
      const cfg = this._configs[fila.tipo] || this._configLegacy(fila);
      if (cfg) {
        this._presentadas.add(fila.id);
        this._persistirPresentadas();
        if (this._categoriaHabilitada(cfg.categoria)) {
          this._presentar({
            cfg, nombre: fila.tipo,
            titulo: fila.titulo, cuerpo: fila.cuerpo,
            url: this._urlDe(fila), icono: cfg.icono,
            datos: fila.datos || {}, fila
          });
        }
      }
    }
    this._refrescarCentro();
  }

  // ---- Presentación ----

  /**
   * Reglas de presentación:
   *   • DESAFÍOS → se presentan DENTRO de la app en primer plano (banner
   *     interactivo con Aceptar/Rechazar, o toast). En segundo plano o con la
   *     app cerrada los muestra el sistema Android vía FCM. Nunca se duplica
   *     aquí con la bandeja.
   *   • RESTO DE CATEGORÍAS → en Android (Capacitor) la notificación va a la
   *     BANDEJA del sistema (nativa, LocalNotifications). En web se mantiene
   *     el comportamiento actual (notificación del navegador o toast).
   */
  _presentar({ cfg, nombre, titulo, cuerpo, url, icono, datos, fila }) {
    if (!this._categoriaHabilitada(cfg.categoria)) return;

    // Sonido / vibración (respeta preferencias de sonido y vibración)
    if (cfg.sonido !== false && window.notifications) window.notifications.vibrar();

    const push = window.pushNotificationService;
    const enAndroid = !!(push && typeof push.esCapacitor === 'function' && push.esCapacitor());
    const tag = `${nombre}-${(fila && fila.id) || Date.now()}`;
    const iconoCategoria = icono || (CATEGORIAS[cfg.categoria] && CATEGORIAS[cfg.categoria].icono);
    const requireInteraction = cfg.requireInteraction || cfg.prioridad === 'critica';

    if (cfg.categoria === 'desafios') {
      if (cfg.banner) {
        this._mostrarBanner({ cfg, titulo, cuerpo, url, datos, fila, icono });
      } else if (cfg.nativo !== false && window.notifications) {
        window.notifications.notificar({ titulo, cuerpo, categoria: cfg.categoria, icono: iconoCategoria, tag, url, requireInteraction });
      } else if (cfg.toast && window.notifications) {
        // Flujo del desafío (aceptado/rechazado/finalizado): aviso ligero
        // in-app para que el avance se VEA (antes era silencioso y solo
        // subía el badge, que quedaba "pegado" con no leídas fantasma).
        window.notifications.mostrarToast(titulo, cuerpo, { icono: iconoCategoria, categoria: cfg.categoria });
        // El toast ya se vio: marcar vista para que el badge no se quede
        // clavado en 'nueva' para siempre (la fila sigue en el centro).
        if (fila && fila.id) this._marcarVista(fila.id);
      }
      return;
    }

    // Android: notificación nativa en la bandeja del sistema (no toasts
    // dentro de la app). El tap lo gestiona pushNotificationService
    // (localNotificationActionPerformed → navegar).
    if (enAndroid) {
      if (cfg.nativo !== false && push.presentarNativa) {
        push.presentarNativa({ titulo, cuerpo, categoria: cfg.categoria, url, datos: datos || {}, id: fila ? fila.id : null });
      }
      return;
    }

    // Web: comportamiento actual (notificación del navegador o toast).
    if (cfg.nativo !== false && window.notifications) {
      window.notifications.notificar({ titulo, cuerpo, categoria: cfg.categoria, icono: iconoCategoria, tag, url, requireInteraction });
    }
  }

  _mostrarBanner({ cfg, titulo, cuerpo, url, datos, fila, icono }) {
    if (document.getElementById('notif-banner')) {
      // Ya hay un banner activo: no descartar el aviso — mostrarlo como toast
      // ligero (antes el segundo desafío se perdía silenciosamente y quedaba
      // 'nueva' para siempre).
      if (window.notifications) window.notifications.mostrarToast(titulo, cuerpo, { icono, categoria: cfg.categoria });
      if (fila && fila.id) this._marcarVista(fila.id);
      return;
    }
    // No mostrar el banner si el usuario ya está viendo ese desafío
    try {
      if (datos && datos.desafio_id && window.router && router.pathActual() === '/desafio/' + datos.desafio_id) return;
    } catch (e) {}
    const I = (n) => window.Iconos ? window.Iconos.render(n) : '';
    const esc = (t) => window.helpers ? window.helpers.escapeHtml(t) : t;
    const meta = CATEGORIAS[cfg.categoria];
    // Las acciones de la CONFIG son ids ('aceptar', 'rechazar', 'ver'): se
    // mapean al catálogo ACCIONES para obtener icono+etiqueta (igual que al
    // persistir). Sin esto los botones del banner salían con data-accion
    // "undefined" y sin texto — imposible aceptar/rechazar desde el banner.
    const accs = (cfg.acciones || []).slice(0, 3).map(a =>
      (typeof a === 'string') ? { id: a, ...(ACCIONES[a] || {}) } : a
    ).filter(a => a && a.id);

    const b = document.createElement('div');
    b.id = 'notif-banner';
    b.className = 'desafio-banner notif-banner';
    b.style.setProperty('--notif-color', meta ? meta.color : 'var(--color-acento)');
    b.innerHTML = `
      <span class="desafio-banner__icono">${I(icono || (meta && meta.icono) || 'bell')}</span>
      <div class="desafio-banner__cuerpo">
        <p class="desafio-banner__titulo">${esc(titulo)}</p>
        <p class="desafio-banner__texto">${esc(cuerpo || '')}</p>
      </div>
      <div class="desafio-banner__acciones">
        ${accs.map(a => `<button class="btn-primario u-fs-xs" data-notif-accion="${a.id}">${I(a.icono)} ${esc(a.etiqueta)}</button>`).join('')}
      </div>
      <button class="desafio-banner__cerrar" data-notif-accion="cerrar" aria-label="Cerrar">×</button>
    `;
    document.body.appendChild(b);
    if (window.Iconos) window.Iconos.actualizar();

    const cerrar = () => { if (b.parentNode) b.remove(); };
    const filaSintetica = fila || { datos, url };

    // Cerrar manualmente = solo vista (la acción no se ejecutó)
    b.querySelector('.desafio-banner__cerrar').onclick = () => {
      cerrar();
      if (fila && fila.id) this._marcarVista(fila.id);
    };

    b.querySelectorAll('[data-notif-accion]').forEach(btn => {
      if (btn.dataset.notifAccion === 'cerrar') return;
      btn.onclick = async () => {
        btn.disabled = true;
        await this.ejecutarAccion(fila ? fila.id : null, btn.dataset.notifAccion, filaSintetica);
        cerrar();
      };
    });

    // Clic en el cuerpo = acción de ver: navega y se completa
    b.querySelector('.desafio-banner__cuerpo').onclick = () => {
      if (url) router.navegar(url);
      cerrar();
      if (fila && fila.id) this.marcarCompletada(fila.id);
    };

    // Auto-dismiss (30s) sin interacción: solo vista
    setTimeout(() => {
      if (b.parentNode) {
        cerrar();
        if (fila && fila.id) this._marcarVista(fila.id);
      }
    }, 30000);
  }

  // ---- Centro / estado ----

  // Comparación barata: mismo nº de no leídas y misma firma (id+estado+contador)
  // de los ítems visibles → no hay cambios que renderizar.
  _mismoEstado(a, b) {
    if (!a || a.error !== b.error || a.noLeidas !== b.noLeidas) return false;
    const ia = (a.items || []);
    const ib = (b.items || []);
    if (ia.length !== ib.length) return false;
    for (let i = 0; i < ia.length; i++) {
      if (ia[i].id !== ib[i].id || ia[i].estado !== ib[i].estado || (ia[i].contador || 1) !== (ib[i].contador || 1)) return false;
    }
    return true;
  }

  async _refrescarCentro() {
    const usuario = this._usuario();
    if (!usuario || !window.notificacionesRepository) return;
    try {
      const [items, noLeidas, porCategoria] = await Promise.all([
        window.notificacionesRepository.listar(usuario.id, { limite: 100 }),
        window.notificacionesRepository.noLeidas(usuario.id),
        window.notificacionesRepository.contarPorCategoria(usuario.id)
      ]);
      const estado = { items, noLeidas, porCategoria, cargando: false, error: null };
      // Evitar re-render del centro cuando nada cambió (el poller corre cada
      // 6s; comparar es más barato que re-renderizar ~100 tarjetas).
      if (window.store && window.store.obtener && window.store.actualizar) {
        const prev = window.store.obtener('notificaciones');
        if (!this._mismoEstado(prev, estado)) {
          window.store.actualizar('notificaciones', estado);
        }
      }
      if (window.eventBus && window.eventBus.publicar) window.eventBus.publicar('notificaciones:actualizadas', estado);
      // El badge se lee del store recién actualizado (evita consultas extra)
      this.actualizarBadge();
    } catch (e) {
      if (window.store && window.store.actualizar) window.store.actualizar('notificaciones', { items: [], noLeidas: 0, porCategoria: {}, cargando: false, error: true });
    }
  }  /** Actualiza el badge de la campana de notificaciones de la cabecera de
   *   sección (llamado también desde el shell y el componente). */
  actualizarBadge() {
    const st = (window.store && window.store.obtener) ? window.store.obtener('notificaciones') : null;
    const n = (st && st.noLeidas) || 0;
    // Guard para entornos sin DOM (tests node) — el badge es puramente visual.
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('notifBarraBadge');
    if (!badge) return;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.hidden = n === 0;
    if (n > 0) {
      badge.classList.remove('notif-barra__badge--pop');
      void badge.offsetWidth;
      badge.classList.add('notif-barra__badge--pop');
    }
  }

  // ---- Recordatorios inteligentes ----

  /**
   * Genera recordatorios con datos REALES del usuario (una vez al día):
   * entregas por corregir, etc. No son genéricos. Los repasos de
   * memorización NO generan aviso (solo notifican eventos reales:
   * exámenes, desafíos, grupos, logros…).
   */
  async generarRecordatorios() {
    const usuario = this._usuario();
    if (!usuario) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const clave = (k) => `fb_rec_${k}_${usuario.id}_${hoy}`;
    try {
      // Entregas de examen sin corregir (solo profesores con grupo)
      const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      if (!localStorage.getItem(clave('corregir')) && esProfesor && usuario.grupo_id && window.examenesRepository) {
        const intentos = await window.examenesRepository.obtenerIntentosGrupo(usuario.grupo_id);
        const pendCorregir = (intentos || []).filter(i => i.estado === 'completado' && !i.corregido).length;
        if (pendCorregir > 0) {
          localStorage.setItem(clave('corregir'), '1');
          this.emitir('recordatorio.corregir', { cantidad: pendCorregir });
        }
      }
    } catch (e) { /* silencioso */ }
  }

  // ---- Dedupe persistido por sesión ----

  _cargarPresentadas() {
    try {
      const raw = localStorage.getItem('fb_notif_presentadas_' + this._usuarioId);
      const arr = raw ? JSON.parse(raw) : [];
      this._presentadas = new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { this._presentadas = new Set(); }
  }

  _persistirPresentadas() {
    try {
      const arr = Array.from(this._presentadas).slice(-400);
      localStorage.setItem('fb_notif_presentadas_' + this._usuarioId, JSON.stringify(arr));
    } catch (e) { /* silencioso */ }
  }

  // ============================================================
  // Preparación para futuros canales de entrega (correo u otros canales)
  // ============================================================

  /**
   * FUTURO canal remoto: aquí se registrará la suscripción del dispositivo
   * y se guardará en una tabla `suscripciones_push`. Mientras tanto es no-op.
   */
  async prepararWebPush() {
    // TODO: suscripción + persistencia + envío cuando se implemente
    // un canal remoto para dispositivos Android.
    return null;
  }
}

window.notificationService = new NotificationService();

// Exposición para tests unitarios (entorno node)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationService, CATEGORIAS, PRIORIDADES, ESTADOS, ACCIONES };
}
