// ============================================================
// js/core/install.js - Instalación PWA profesional
// ============================================================

(function () {
  'use strict';

  const KEY_VISTO = 'fb_install_banner_visto';

  class InstallManager {
    constructor() {
      this._deferred = null;
      this._banner = null;
    }

    init() {
      // Si ya está instalada (abierta en modo standalone), no mostrar nada
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      if (standalone) return;

      // Ya se mostró antes (solo una vez)
      if (localStorage.getItem(KEY_VISTO)) return;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferred = e;
        this._mostrarBanner();
      });

      window.addEventListener('appinstalled', () => {
        this._ocultarBanner();
        this._marcarVisto();
        this._deferred = null;
      });
    }

    _esStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    }

    _mostrarBanner() {
      if (this._banner || this._esStandalone() || localStorage.getItem(KEY_VISTO)) return;

      const banner = document.createElement('div');
      banner.id = 'installBanner';
      banner.className = 'install-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Instalar FormsBiblicos');
      banner.innerHTML = `
        <div class="install-banner__icono">${window.Iconos?.render('download') || '⬇️'}</div>
        <div class="install-banner__cuerpo">
          <p class="install-banner__titulo">Instala FormsBiblicos</p>
          <ul class="install-banner__beneficios">
            <li>${window.Iconos?.render('zap') || '⚡'} Accede más rápido</li>
            <li>${window.Iconos?.render('wifi-off') || '📡'} Funciona sin Internet</li>
            <li>${window.Iconos?.render('bell') || '🔔'} Recibe novedades</li>
          </ul>
        </div>
        <div class="install-banner__acciones">
          <button class="btn-secundario install-banner__cerrar" type="button" aria-label="Ahora no">Ahora no</button>
          <button class="btn-primario install-banner__instalar" type="button">Instalar</button>
        </div>`;
      document.body.appendChild(banner);
      if (window.Iconos?.actualizar) window.Iconos.actualizar();
      this._banner = banner;

      banner.querySelector('.install-banner__instalar').addEventListener('click', () => this._instalar());
      banner.querySelector('.install-banner__cerrar').addEventListener('click', () => {
        this._ocultarBanner();
        this._marcarVisto();
      });
    }

    async _instalar() {
      if (!this._deferred) {
        // Navegadores que no dan prompt (iOS): guiar manualmente
        this._mostrarAyuda();
        return;
      }
      this._deferred.prompt();
      try {
        const { outcome } = await this._deferred.userChoice;
        if (outcome === 'accepted') {
          this._ocultarBanner();
          this._marcarVisto();
        }
      } catch (e) {}
      this._deferred = null;
    }

    _mostrarAyuda() {
      const ayuda = document.createElement('div');
      ayuda.id = 'installHelp';
      ayuda.className = 'pwa-install-help';
      ayuda.innerHTML = `
        <div class="pwa-install-help__card" role="dialog" aria-modal="false" aria-labelledby="installHelpTitle">
          <button class="pwa-install-help__cerrar" type="button" aria-label="Cerrar">×</button>
          <h2 id="installHelpTitle">Instalar app</h2>
          <p>Abre el menú del navegador y toca "Instalar aplicación" o "Añadir a pantalla de inicio".</p>
          <button class="btn-secundario pwa-install-help__ok" type="button">Entendido</button>
        </div>`;
      document.body.appendChild(ayuda);
      const cerrar = () => ayuda.remove();
      ayuda.querySelector('.pwa-install-help__cerrar').addEventListener('click', cerrar);
      ayuda.querySelector('.pwa-install-help__ok').addEventListener('click', cerrar);
    }

    _ocultarBanner() {
      if (this._banner) { this._banner.remove(); this._banner = null; }
    }

    _marcarVisto() {
      try { localStorage.setItem(KEY_VISTO, '1'); } catch (e) {}
    }
  }

  const installManager = new InstallManager();
  document.addEventListener('DOMContentLoaded', () => installManager.init());
  window.installManager = installManager;
})();
