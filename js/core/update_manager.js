// ============================================================
// js/core/update-manager.js - Gestión de actualizaciones
// ============================================================

class UpdateManager {
  constructor() {
    this._currentVersion = '1.0.0';
    this._updateCard = null;
    this._pendingUpdate = null;
    this._isChecking = false;
    
    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
          console.log('[UpdateManager] Nueva versión detectada por SW:', event.data.version);
          this._pendingUpdate = event.data;
          this._showUpdateCard(event.data);
        }
      });
    }
    
    // Iniciar verificación periódica
    this._startPeriodicCheck();
  }

  // ============================================================
  // Inicializar tras DOM listo (lee versión real y muestra novedades)
  // ============================================================
  async init() {
    try {
      const res = await fetch('./version.json', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        this._currentVersion = data.version || this._currentVersion;
        this._versionData = data;
      }
    } catch (e) { /* offline */ }

    this._maybeShowWhatsNew();
  }

  // ============================================================
  // Verificar actualizaciones manualmente
  // ============================================================
  async checkForUpdates() {
    if (this._isChecking) return;
    this._isChecking = true;
    
    try {
      const response = await fetch('./version.json', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        this._isChecking = false;
        return;
      }
      
      const data = await response.json();
      
      // Comparar versiones (simple - en producción usar semver)
      if (data.version !== this._currentVersion) {
        console.log('[UpdateManager] Nueva versión detectada:', data.version);
        this._pendingUpdate = data;
        this._showUpdateCard(data);
      }
      
    } catch (e) {
      // Fallar silenciosamente - modo offline
      console.log('[UpdateManager] No se pudo verificar actualizaciones:', e.message);
    }
    
    this._isChecking = false;
  }

  // ============================================================
  // Mostrar tarjeta de actualización
  // ============================================================
  _showUpdateCard(updateData) {
    // No mostrar si ya existe una
    if (document.getElementById('updateCard')) return;
    
    const card = document.createElement('div');
    card.id = 'updateCard';
    card.className = 'update-card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'updateTitle');
    
    const icon = window.Iconos?.render('download-cloud') || '⬇️';
    const features = updateData.features || ['Mejoras generales'];
    const fixes = updateData.fixes || [];
    const perf = updateData.performance || [];
    
    // Mostrar versión
    const versionText = updateData.version ? `Versión ${updateData.version}` : '';
    
    card.innerHTML = `
      <div class="update-card__content">
        <div class="update-card__icon">${icon}</div>
        <h2 class="update-card__title" id="updateTitle">Nueva versión disponible</h2>
        ${versionText ? `<p class="update-card__subtitle">${versionText}</p>` : ''}
        <ul class="update-card__list">
          ${features.map(f => `<li>${window.Iconos?.render('check') || '✅'} ${f}</li>`).join('')}
          ${fixes.map(f => `<li>${window.Iconos?.render('bug') || '🐛'} ${f}</li>`).join('')}
          ${perf.map(f => `<li>${window.Iconos?.render('zap') || '⚡'} ${f}</li>`).join('')}
        </ul>
        <button class="btn-primario update-card__btn" id="updateNowBtn">
          ${window.Iconos?.render('download') || '⬇️'} Actualizar ahora
        </button>
      </div>
    `;
    
    document.body.appendChild(card);
    
    // Actualizar iconos
    if (window.Iconos?.actualizar) {
      window.Iconos.actualizar();
    }
    
    // Evento del botón
    card.querySelector('#updateNowBtn').onclick = () => {
      this._applyUpdate();
    };
    
    // Cerrar al hacer click fuera (solo si no es forzoso)
    card.addEventListener('click', (e) => {
      if (e.target === card) {
        // No cerrar - es una actualización importante
      }
    });

    // Actualización silenciosa: ir descargando los recursos en segundo plano
    this._precacheUpdate();
  }

  // ============================================================
  // Pedir al SW que precargue la nueva versión en background
  // ============================================================
  _precacheUpdate() {
    if (!('serviceWorker' in navigator)) return;
    const enviar = (reg) => {
      const destino = reg && reg.waiting ? reg.waiting : navigator.serviceWorker.controller;
      if (destino && destino.postMessage) {
        try { destino.postMessage({ type: 'PRECACHE_UPDATE' }); } catch (e) {}
      }
    };
    navigator.serviceWorker.getRegistration().then(enviar).catch(() => {});
  }

  // ============================================================
  // Aplicar actualización
  // ============================================================
  async _applyUpdate() {
    const card = document.getElementById('updateCard');
    if (card) {
      card.classList.add('update-card--hiding');
    }
    
    // Guardar sesión antes de actualizar
    const usuario = store?.obtener('usuario');
    if (usuario) {
      try {
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
      } catch (e) {}
    }

    // Marcar que se aplicó una actualización para mostrar novedades tras recargar
    try {
      const v = (this._pendingUpdate && this._pendingUpdate.version) || this._currentVersion;
      localStorage.setItem('fb_pending_whatsnew', v);
    } catch (e) {}
    
    // Esperar un momento para que se vea la animación
    await new Promise(r => setTimeout(r, 300));
    
    // Forzar actualización del Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          // Decirle al SW que salte la espera
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Esperar a que el nuevo SW tome control
          await new Promise((resolve) => {
            const checkController = () => {
              if (navigator.serviceWorker.controller) {
                resolve();
              } else {
                setTimeout(checkController, 100);
              }
            };
            checkController();
          });
          
          // Recargar la página
          window.location.reload();
        } else {
          // Si no hay SW esperando, recargar directamente
          window.location.reload();
        }
      } catch (e) {
        console.warn('[UpdateManager] Error al actualizar SW:', e);
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  }

  // ============================================================
  // Banner de novedades (solo una vez por versión, tras actualizar)
  // ============================================================
  _maybeShowWhatsNew() {
    const pendiente = localStorage.getItem('fb_pending_whatsnew');
    if (!pendiente) return;
    const version = this._currentVersion;
    if (pendiente !== version) {
      // La versión pendiente no coincide con la cargada; limpiar por seguridad
      localStorage.removeItem('fb_pending_whatsnew');
      return;
    }
    const keyMostrado = `fb_whatsnew_shown_${version}`;
    if (localStorage.getItem(keyMostrado)) {
      localStorage.removeItem('fb_pending_whatsnew');
      return;
    }
    localStorage.removeItem('fb_pending_whatsnew');
    this._mostrarBannerNovedades(version, this._versionData || this._pendingUpdate || {});
  }

  _mostrarBannerNovedades(version, data) {
    const keyMostrado = `fb_whatsnew_shown_${version}`;
    if (localStorage.getItem(keyMostrado)) return;

    // Construir lista con formato: ✓ Item
    const items = [];
    (data.features || []).forEach(f => items.push(f.replace(/^✅\s*/, '✓ ')));
    (data.fixes || []).forEach(f => items.push(f.replace(/^🐛\s*/, '✓ ')));
    (data.performance || []).forEach(f => items.push(f.replace(/^⚡\s*/, '✓ ')));
    if (items.length === 0) items.push('✓ Mejoras generales');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay whatsnew-overlay';
    overlay.innerHTML = `
      <div class="modal whatsnew-modal" role="dialog" aria-modal="true" aria-labelledby="whatsnewTitle">
        <div class="o-pila" style="gap:var(--espaciado-md)">
          <h3 id="whatsnewTitle">${window.Iconos?.render('sparkles') || '✨'} Novedades</h3>
          <ul class="whatsnew-lista">
            ${items.map(t => `<li>${window.helpers?.escapeHtml ? window.helpers.escapeHtml(t) : t}</li>`).join('')}
          </ul>
          <button class="btn-primario" id="btnWhatsNewOk" style="width:100%;justify-content:center">
            ${window.Iconos?.render('check') || '✓'} Entendido
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    if (window.Iconos?.actualizar) window.Iconos.actualizar();

    const cerrar = () => {
      overlay.remove();
      localStorage.setItem(keyMostrado, 'true');
    };
    overlay.querySelector('#btnWhatsNewOk').onclick = cerrar;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  }


  // ============================================================
  // Verificación periódica (cada 5 minutos)
  // ============================================================
  _startPeriodicCheck() {
    // Verificar al inicio
    setTimeout(() => this.checkForUpdates(), 3000);
    
    // Verificar cada 5 minutos
    setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
    
    // Verificar cuando la página recupera el foco
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
    
    // Verificar cuando vuelve la conexión (y precargar actualización en background)
    window.addEventListener('online', () => {
      this.checkForUpdates();
      this._precacheUpdate();
    });
  }

  // ============================================================
  // Obtener versión actual
  // ============================================================
  getCurrentVersion() {
    return this._currentVersion;
  }
}

// ============================================================
// Inicializar
// ============================================================

let updateManagerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  updateManagerInstance = new UpdateManager();
  window.updateManager = updateManagerInstance;
  updateManagerInstance.init();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateManager };
}