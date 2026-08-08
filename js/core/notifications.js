// ============================================================
// js/core/notifications.js - Capa de presentación de bajo nivel
// ------------------------------------------------------------
// NOTA DE ARQUITECTURA: este módulo NO decide qué notificar ni a
// quién. Solo SABE CÓMO mostrarlo (notificación nativa del
// navegador, toast interno, vibración). La orquestación (qué
// evento, persistencia, preferencias por categoría, agrupación)
// vive en js/core/notification-service.js.
// ============================================================

class NotificationManager {
  constructor() {
    this._permission = ('Notification' in window) ? Notification.permission : 'unsupported';
    this._init();
  }

  async _init() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') {
      this._permission = Notification.permission;
      return;
    }
    // Solicitar permiso tras un tiempo prudencial (app ya cargada)
    setTimeout(() => this._solicitarPermisoSilencioso(), 8000);
    // También tras la primera interacción del usuario
    document.addEventListener('click', () => this._solicitarPermisoSilencioso(), { once: true });
  }

  async _solicitarPermisoSilencioso() {
    if (this._permission !== 'default') return;
    try {
      const result = await Notification.requestPermission();
      this._permission = result;
    } catch (e) {
      console.warn('[Notifications] Error al solicitar permiso:', e);
    }
  }

  /** Método público para actualizar el permiso desde la UI (perfil). */
  setPermiso(permiso) {
    this._permission = permiso;
  }

  // Preferencia individual (clave antigua o nueva). Por defecto activada.
  _habilitada(clave, clavesAntiguas = []) {
    try {
      const u = window.store && window.store.obtener ? window.store.obtener('usuario') : null;
      let p = (u && u.preferencias) || {};
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = {}; } }
      if (p[clave] === false) return false;
      for (const antigua of clavesAntiguas) {
        if (p[antigua] === false) return false;
      }
      return true;
    } catch (e) { return true; }
  }

  // Vibra si la vibración está activada (por defecto sí).
  // Respeta la clave legacy `notif_sonidos` (antes vibración y sonido
  // eran lo mismo) y la nueva `notif_vibracion`.
  vibrar() {
    if (!this._habilitada('notif_vibracion', ['notif_sonidos'])) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
  }

  // ============================================================
  // Método genérico: notificación nativa o toast, según permiso y
  // preferencia `notif_nativas` (activada por defecto).
  // ============================================================
  async notificar({ titulo, cuerpo, icono, categoria, tag, url, requireInteraction = false, datos }) {
    if (!titulo) return null;
    const nativas = this._habilitada('notif_nativas');
    const usarNativas = nativas && 'Notification' in window && this._permission === 'granted';

    if (usarNativas) {
      try {
        // El proyecto renderiza iconos con un sprite inline (Iconos.render);
        // no existen SVGs por categoría en assets/iconos, así que la
        // notificación nativa usa el icono genérico de la aplicación.
        const notification = new Notification(titulo, {
          body: cuerpo || '',
          icon: './assets/iconos/icono.svg',
          badge: './assets/iconos/32x32.png',
          tag: tag || Date.now().toString(),
          requireInteraction: requireInteraction,
          data: datos || {}
        });

        // Cerrar automáticamente después de 8 segundos
        setTimeout(() => { if (notification.close) notification.close(); }, 8000);

        // Click en la notificación → navegar
        notification.onclick = () => {
          if (url) {
            window.focus();
            router?.navegar(url);
          }
          notification.close();
        };
        return notification;
      } catch (e) {
        console.warn('[Notifications] Error mostrando notificación:', e);
        return this._showToast(titulo, cuerpo, { icono, categoria });
      }
    }
    // Fallback: toast interno
    return this._showToast(titulo, cuerpo, { icono, categoria });
  }

  /** Muestra un toast directamente (usado por el servicio para avisos ligeros). */
  mostrarToast(titulo, cuerpo, { icono, categoria } = {}) {
    return this._showToast(titulo, cuerpo, { icono, categoria });
  }

  // ============================================================
  // Toast interno (clases del sistema de diseño, ver _notificaciones.css)
  // ============================================================
  _showToast(titulo, cuerpo, { icono, categoria } = {}) {
    // Evitar duplicados
    const tituloEsc = (window.CSS && CSS.escape) ? CSS.escape(titulo) : String(titulo).replace(/"/g, '\\"');
    const existing = document.querySelector(`.notif-toast[data-title="${tituloEsc}"]`);
    if (existing) {
      const bodyEl = existing.querySelector('.notif-toast__cuerpo');
      if (bodyEl && cuerpo) bodyEl.textContent = cuerpo;
      return existing;
    }

    const catColor = categoria && window.notificationService
      ? (window.notificationService.CATEGORIAS[categoria] ? window.notificationService.CATEGORIAS[categoria].color : '')
      : '';
    const catIcono = icono || (categoria && window.notificationService
      ? (window.notificationService.CATEGORIAS[categoria] ? window.notificationService.CATEGORIAS[categoria].icono : '')
      : '') || 'bell';

    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.dataset.title = titulo;
    toast.setAttribute('role', 'alert');
    if (categoria) toast.classList.add('notif-toast--' + categoria);

    toast.innerHTML = `
      <span class="notif-toast__icono" ${catColor ? `style="color:${catColor}"` : ''}>${window.Iconos?.render(catIcono) || '🔔'}</span>
      <div class="notif-toast__contenido">
        <strong class="notif-toast__titulo"></strong>
        ${cuerpo ? `<p class="notif-toast__cuerpo"></p>` : ''}
      </div>
      <button class="notif-toast__cerrar" aria-label="Cerrar">${window.Iconos?.render('x') || '✕'}</button>
    `;
    toast.querySelector('.notif-toast__titulo').textContent = titulo;
    if (cuerpo) toast.querySelector('.notif-toast__cuerpo').textContent = cuerpo;

    document.body.appendChild(toast);
    if (window.Iconos?.actualizar) window.Iconos.actualizar();

    toast.querySelector('.notif-toast__cerrar').onclick = (e) => {
      e.stopPropagation();
      this._closeToast(toast);
    };

    const timeout = setTimeout(() => this._closeToast(toast), 5000);
    toast._timeout = timeout;

    return toast;
  }

  _closeToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timeout);
    toast.classList.add('notif-toast--saliendo');
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }

  // ============================================================
  // Wrappers de compatibilidad (API antigua).
  // Todos delegan en `notificar()` para mantener un único camino.
  // El orquestador real es notification-service.
  // ============================================================
  async notificarRepasos(cantidad) {
    if (!this._habilitada('notif_recordatorios', ['notif_repasos'])) return;
    this.vibrar();
    return this.notificar({
      titulo: 'Hoy tienes',
      cuerpo: `${cantidad} versículo${cantidad === 1 ? '' : 's'} pendiente${cantidad === 1 ? '' : 's'}.`,
      categoria: 'estudio', icono: 'brain', tag: 'repaso', url: '/memorizacion'
    });
  }

  async notificarExamen(nombre, examenId) {
    if (!this._habilitada('notif_examenes')) return;
    this.vibrar();
    return this.notificar({
      titulo: 'Nuevo examen disponible',
      cuerpo: `"${nombre}" está disponible para realizar.`,
      categoria: 'examenes', icono: 'clipboard-check', tag: `examen-${examenId}`, url: `/tomar/${examenId}`
    });
  }

  async notificarCalificacion(examen, nota) {
    if (!this._habilitada('notif_calificaciones')) return;
    this.vibrar();
    const texto = nota != null ? `"${examen}" — Nota: ${nota}/10` : `"${examen}" ya está calificado.`;
    return this.notificar({
      titulo: 'El profesor corrigió tu examen',
      cuerpo: texto,
      categoria: 'examenes', icono: 'check-circle', tag: `calificacion-${Date.now()}`, url: '/examenes'
    });
  }

  async notificarLogro(nombre, descripcion) {
    if (!this._habilitada('notif_desafios', ['notif_logros'])) return;
    this.vibrar();
    return this.notificar({
      titulo: `Logro desbloqueado: ${nombre}`,
      cuerpo: descripcion,
      categoria: 'logros', icono: 'trophy', tag: `logro-${Date.now()}`
    });
  }

  async notificarActualizacion(version) {
    if (!this._habilitada('notif_actualizaciones')) return;
    this.vibrar();
    return this.notificar({
      titulo: 'Nueva versión disponible',
      cuerpo: `Versión ${version} ya está disponible. Actualiza para disfrutar de las mejoras.`,
      categoria: 'sistema', icono: 'download-cloud', tag: 'update', requireInteraction: true
    });
  }

  async notificarDesafio(creador, mazo, desafioId) {
    if (!this._habilitada('notif_desafios', ['notif_logros'])) return;
    this.vibrar();
    return this.notificar({
      titulo: '¡Te han desafiado!',
      cuerpo: `${creador} te ha desafiado al mazo «${mazo}».`,
      categoria: 'desafios', icono: 'sword', tag: `desafio-${desafioId}`, url: `/desafio/${desafioId}`, requireInteraction: true
    });
  }

  async notificarCapituloCompletado(libro, capitulo) {
    if (!this._habilitada('notif_estudio', ['notif_recordatorios'])) return;
    this.vibrar();
    return this.notificar({
      titulo: '¡Capítulo completado!',
      cuerpo: `Has completado el estudio de ${libro} ${capitulo}.`,
      categoria: 'estudio', icono: 'book-open', tag: `capitulo-${libro}-${capitulo}`, url: '/estudio'
    });
  }

  async notificarMazoNuevo(nombre, mazoId) {
    if (!this._habilitada('notif_desafios', ['notif_logros'])) return;
    this.vibrar();
    return this.notificar({
      titulo: 'Nuevo mazo disponible',
      cuerpo: `«${nombre}» ha sido añadido. ¡Practica y reta a tus amigos!`,
      categoria: 'estudio', icono: 'layers', tag: `mazo-${mazoId}`, url: '/memorizacion'
    });
  }

  async notificarExamenEntregado(alumno, examen, examenId, alumnoId) {
    if (!this._habilitada('notif_examenes')) return;
    this.vibrar();
    return this.notificar({
      titulo: 'Examen entregado',
      cuerpo: `${alumno} ha entregado "${examen}". Está listo para corregir.`,
      categoria: 'examenes', icono: 'send', tag: `entrega-${examenId}-${alumnoId}`, url: `/corregir/${examenId}`
    });
  }

  async notificarAnuncio(titulo, cuerpo) {
    // Los anuncios del owner siempre se muestran, sin preferencia
    this.vibrar();
    return this.notificar({
      titulo, cuerpo,
      categoria: 'anuncios', icono: 'megaphone', tag: `anuncio-${Date.now()}`, requireInteraction: true
    });
  }
}

// ============================================================
// Inicializar
// ============================================================

let notificationInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  notificationInstance = new NotificationManager();
  window.notifications = notificationInstance;
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationManager };
}
