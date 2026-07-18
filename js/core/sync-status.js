// ============================================================
// js/core/sync-status.js - Estado de sincronización
// ============================================================

class SyncStatus {
  constructor() {
    this._lastSync = null;
    this._pending = 0;
    this._status = 'synced';
    this._element = null;
    
    this._init();
  }
  
  _init() {
    this._createElement();
    
    // Escuchar eventos de sincronización
    window.eventBus?.suscribir('sincronizacion:estado', (data) => {
      this._pending = data.pendientes || 0;
      this._status = this._pending > 0 ? 'pending' : 'synced';
      this._lastSync = Date.now();
      this._updateUI();
    });
    
    // Recuperar estado guardado
    const saved = localStorage.getItem('fb_sync_status');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this._lastSync = data.lastSync;
        this._pending = data.pending || 0;
        this._status = this._pending > 0 ? 'pending' : 'synced';
      } catch (e) {}
    }
    
    // Sincronizar cada 30 segundos si hay pendientes
    setInterval(() => {
      if (this._pending > 0 && navigator.onLine) {
        this._syncNow();
      }
    }, 30000);
    
    this._updateUI();
  }
  
  _createElement() {
    if (this._element) return;
    
    this._element = document.createElement('div');
    this._element.id = 'syncStatus';
    this._element.setAttribute('aria-live', 'polite');
    this._element.setAttribute('aria-atomic', 'true');
    
    this._element.style.cssText = `
      position: fixed;
      bottom: calc(76px + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      z-index: 60;
      padding: 4px 14px;
      border-radius: 999px;
      background: var(--color-fondo-tarjeta);
      border: 1px solid var(--color-borde);
      box-shadow: var(--sombra-md);
      font-size: var(--texto-xs);
      font-weight: 500;
      pointer-events: auto;
      cursor: pointer;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 0.7;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    `;
    
    // Click para sincronizar manualmente
    this._element.addEventListener('click', () => {
      this._syncNow();
    });
    
    document.body.appendChild(this._element);
  }
  
  _updateUI() {
    if (!this._element) return;
    
    const lastSyncText = this._lastSync 
      ? `Hace ${Math.round((Date.now() - this._lastSync) / 60000)} min`
      : 'Nunca';
    
    const statusIcon = this._status === 'synced' ? '🟢' : '🟠';
    const statusText = this._status === 'synced' ? 'Todo sincronizado' : `${this._pending} cambios pendientes`;
    const borderColor = this._status === 'synced' ? 'var(--color-exito)' : 'var(--color-aviso)';
    
    this._element.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${borderColor};flex-shrink:0"></span>
      <span>${statusText}</span>
      <span style="opacity:0.6;font-weight:400;font-size:10px">${lastSyncText}</span>
    `;
    
    this._element.style.borderColor = borderColor;
    this._element.style.opacity = this._pending > 0 ? '1' : '0.7';
    
    // Guardar estado
    try {
      localStorage.setItem('fb_sync_status', JSON.stringify({
        lastSync: this._lastSync,
        pending: this._pending
      }));
    } catch (e) {}
  }
  
  async _syncNow() {
    if (!navigator.onLine) {
      window.helpers?.mostrarAlerta('Sin conexión a internet', 'advertencia');
      return;
    }
    
    // Mostrar estado de sincronización
    this._element.style.opacity = '1';
    this._element.innerHTML = '⏳ Sincronizando...';
    
    try {
      // Forzar sincronización manual
      if (window.colaSync) {
        // Ejecutar sincronización
        await this._forceSync();
      }
      
      // Actualizar estado
      this._pending = 0;
      this._status = 'synced';
      this._lastSync = Date.now();
      this._updateUI();
      
      // Feedback háptico
      if (window.Haptics) {
        window.Haptics.success();
      }
      
    } catch (e) {
      console.warn('[SyncStatus] Error en sincronización:', e);
      window.helpers?.mostrarAlerta('Error al sincronizar', 'error', 2000);
      this._updateUI();
    }
  }
  
  async _forceSync() {
    // Método para forzar la sincronización desde colaSync
    return new Promise((resolve, reject) => {
      try {
        // Si existe el método _sync en colaSync
        if (window.colaSync && typeof window.colaSync._sync === 'function') {
          window.colaSync._sync();
          // Esperar un poco para que se complete
          setTimeout(resolve, 2000);
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    });
  }
  
  // Obtener estado actual
  getStatus() {
    return {
      online: navigator.onLine,
      pending: this._pending,
      synced: this._status === 'synced',
      lastSync: this._lastSync
    };
  }
}

// ============================================================
// Inicializar
// ============================================================

let syncStatusInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  syncStatusInstance = new SyncStatus();
  window.syncStatus = syncStatusInstance;
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncStatus };
}