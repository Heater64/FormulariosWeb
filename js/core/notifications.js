// ============================================================
// js/core/notifications.js - Sistema de notificaciones
// ============================================================

class NotificationManager {
  constructor() {
    this._permission = Notification.permission;
    this._toasts = [];
    this._init();
  }
  
  async _init() {
    // Solicitar permiso después de un tiempo
    if (Notification.permission === 'default') {
      setTimeout(async () => {
        try {
          const result = await Notification.requestPermission();
          this._permission = result;
        } catch (e) {
          console.warn('[Notifications] Error al solicitar permiso:', e);
        }
      }, 5000);
    } else {
      this._permission = Notification.permission;
    }
  }
  
  // ============================================================
  // Mostrar notificación
  // ============================================================
  async show(title, options = {}) {
    const { body, icon, tag, data, requireInteraction = false } = options;
    
    // Si estamos en una PWA y tenemos permiso
    if ('Notification' in window && this._permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body || '',
          icon: icon || './assets/iconos/192x192.png',
          badge: './assets/iconos/32x32.png',
          tag: tag || Date.now().toString(),
          requireInteraction: requireInteraction,
          data: data || {}
        });
        
        // Cerrar automáticamente después de 8 segundos
        setTimeout(() => {
          if (notification.close) notification.close();
        }, 8000);
        
        // Click en la notificación
        notification.onclick = () => {
          if (data?.url) {
            window.focus();
            router?.navegar(data.url);
          }
          notification.close();
        };
        
        return notification;
        
      } catch (e) {
        console.warn('[Notifications] Error mostrando notificación:', e);
        return this._showToast(title, body);
      }
    } else {
      // Fallback a toast
      return this._showToast(title, body);
    }
  }
  
  // ============================================================
  // Toast de respaldo (cuando no hay notificaciones)
  // ============================================================
  _showToast(title, body) {
    // Evitar duplicados
    const existing = document.querySelector(`.toast-notification[data-title="${title}"]`);
    if (existing) {
      // Actualizar el existente
      const bodyEl = existing.querySelector('.toast-notification__body');
      if (bodyEl && body) bodyEl.textContent = body;
      return existing;
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.dataset.title = title;
    toast.setAttribute('role', 'alert');
    
    toast.innerHTML = `
      <div class="toast-notification__icon">${window.Iconos?.render('bell') || '🔔'}</div>
      <div class="toast-notification__content">
        <strong class="toast-notification__title">${title}</strong>
        ${body ? `<p class="toast-notification__body">${body}</p>` : ''}
      </div>
      <button class="toast-notification__close" aria-label="Cerrar">${window.Iconos?.render('x') || '✕'}</button>
    `;
    
    // Estilos
    toast.style.cssText = `
      position: fixed;
      top: calc(80px + env(safe-area-inset-top));
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      padding: 12px 16px;
      background: var(--color-fondo-tarjeta);
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-lg);
      box-shadow: var(--sombra-lg);
      max-width: 360px;
      width: calc(100% - 32px);
      display: flex;
      gap: 12px;
      align-items: center;
      animation: slideDown 300ms var(--easing-apple);
      cursor: default;
    `;
    
    document.body.appendChild(toast);
    if (window.Iconos?.actualizar) window.Iconos.actualizar();
    
    // Cerrar al hacer click en la X
    toast.querySelector('.toast-notification__close').onclick = (e) => {
      e.stopPropagation();
      this._closeToast(toast);
    };
    
    // Cerrar después de 5 segundos
    const timeout = setTimeout(() => {
      this._closeToast(toast);
    }, 5000);
    
    // Guardar referencia
    toast._timeout = timeout;
    
    return toast;
  }
  
  _closeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    clearTimeout(toast._timeout);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    toast.style.transition = 'opacity 300ms ease, transform 300ms ease';
    
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }
  
  // ============================================================
  // Notificaciones específicas
  // ============================================================
  
  async notificarRepasos(cantidad) {
    if (cantidad > 0) {
      return this.show('Hoy tienes', {
        body: `${cantidad} versículo${cantidad === 1 ? '' : 's'} pendiente${cantidad === 1 ? '' : 's'}.`,
        tag: 'repaso',
        data: { url: '/memorizacion' }
      });
    }
  }
  
  async notificarExamen(nombre, examenId) {
    return this.show('Nuevo examen disponible', {
      body: `"${nombre}" está disponible para realizar.`,
      tag: `examen-${examenId}`,
      data: { url: `/tomar/${examenId}` }
    });
  }
  
  async notificarCalificacion(examen, nota) {
    const texto = nota != null ? `"${examen}" — Nota: ${nota}/10` : `"${examen}" ya está calificado.`;
    return this.show('El profesor corrigió tu examen', {
      body: texto,
      tag: `calificacion-${Date.now()}`,
      data: { url: '/examenes' }
    });
  }
  
  async notificarLogro(nombre, descripcion) {
    return this.show(`Logro desbloqueado: ${nombre}`, {
      body: descripcion,
      tag: `logro-${Date.now()}`
    });
  }
  
  async notificarActualizacion(version) {
    return this.show('Nueva versión disponible', {
      body: `Versión ${version} ya está disponible. Actualiza para disfrutar de las mejoras.`,
      tag: 'update',
      requireInteraction: true
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