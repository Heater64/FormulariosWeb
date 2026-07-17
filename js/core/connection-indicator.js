// ============================================================
// js/core/connection-indicator.js - Indicador de conexión
// ============================================================

class ConnectionIndicator {
  constructor() {
    this._isOnline = navigator.onLine;
    this._element = null;
    this._timeout = null;
    
    this._init();
  }
  
  _init() {
    this._createElement();
    this._updateStatus();
    
    window.addEventListener('online', () => {
      this._isOnline = true;
      this._updateStatus();
      this._showTemporary('🟢 Conectado', 'var(--color-exito)');
      
      // Notificar a otros módulos
      window.eventBus?.publicar('connection:online');
    });
    
    window.addEventListener('offline', () => {
      this._isOnline = false;
      this._updateStatus();
      this._showTemporary('🔴 Sin conexión', 'var(--color-error)');
      
      // Notificar a otros módulos
      window.eventBus?.publicar('connection:offline');
    });
  }
  
  _createElement() {
    if (this._element) return;
    
    this._element = document.createElement('div');
    this._element.id = 'connectionIndicator';
    this._element.setAttribute('aria-live', 'polite');
    this._element.setAttribute('aria-atomic', 'true');
    
    // Estilos inline
    this._element.style.cssText = `
      position: fixed;
      top: calc(12px + env(safe-area-inset-top));
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      z-index: 2000;
      padding: 4px 14px;
      border-radius: 999px;
      background: var(--color-fondo-tarjeta);
      border: 1px solid var(--color-borde);
      box-shadow: var(--sombra-md);
      font-size: var(--texto-xs);
      font-weight: 600;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    `;
    
    document.body.appendChild(this._element);
  }
  
  _updateStatus() {
    if (!this._element) return;
    
    const dot = this._isOnline ? '🟢' : '🔴';
    const text = this._isOnline ? 'Conectado' : 'Sin conexión';
    const color = this._isOnline ? 'var(--color-exito)' : 'var(--color-error)';
    
    this._element.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
      ${text}
    `;
    
    this._element.style.borderColor = this._isOnline ? 'var(--color-exito)' : 'var(--color-error)';
    
    // Actualizar data attribute para CSS
    this._element.dataset.status = this._isOnline ? 'online' : 'offline';
  }
  
  _showTemporary(text, borderColor) {
    if (!this._element) return;
    
    this._element.textContent = text;
    this._element.style.opacity = '1';
    this._element.style.transform = 'translateX(-50%) translateY(0)';
    if (borderColor) {
      this._element.style.borderColor = borderColor;
    }
    
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._element.style.opacity = '0';
      this._element.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => {
        this._updateStatus();
        this._element.style.borderColor = '';
      }, 300);
    }, 3000);
  }
  
  // Mostrar indicador permanentemente
  show() {
    if (!this._element) return;
    this._element.style.opacity = '1';
    this._element.style.transform = 'translateX(-50%) translateY(0)';
  }
  
  // Ocultar indicador
  hide() {
    if (!this._element) return;
    this._element.style.opacity = '0';
    this._element.style.transform = 'translateX(-50%) translateY(-20px)';
  }
  
  // Obtener estado de conexión
  isOnline() {
    return this._isOnline;
  }
}

// ============================================================
// Inicializar
// ============================================================

let connectionIndicatorInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  connectionIndicatorInstance = new ConnectionIndicator();
  window.connectionIndicator = connectionIndicatorInstance;
  
  // Mostrar después de un momento
  setTimeout(() => {
    if (connectionIndicatorInstance) {
      connectionIndicatorInstance.show();
      // Ocultar después de 5 segundos si está online
      if (navigator.onLine) {
        setTimeout(() => {
          if (connectionIndicatorInstance) {
            connectionIndicatorInstance.hide();
          }
        }, 5000);
      }
    }
  }, 1000);
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConnectionIndicator };
}