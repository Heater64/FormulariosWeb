// ============================================================
// Bridge clásico para el plugin Capacitor nativo.
// El proyecto usa scripts clásicos; el runtime UMD de Capacitor se
// carga durante el build para evitar imports bare sin bundlear.
// ============================================================
(function (root) {
  'use strict';

  const capacitor = root.Capacitor;
  const UpdateInstallerPlugin = capacitor?.registerPlugin
    ? capacitor.registerPlugin('UpdateInstaller')
    : null;

  const updateInstaller = {
    disponible() {
      try {
        return !!(UpdateInstallerPlugin && capacitor?.isNativePlatform?.() && capacitor.isPluginAvailable?.('UpdateInstaller'));
      } catch (error) {
        return false;
      }
    },

    async descargarEInstalar(options, onProgress) {
      if (!this.disponible()) {
        const error = new Error('La instalación de APK solo está disponible en Android.');
        error.code = 'NATIVE_UNAVAILABLE';
        throw error;
      }

      let listener = null;
      try {
        if (onProgress && UpdateInstallerPlugin.addListener) {
          listener = await UpdateInstallerPlugin.addListener('downloadProgress', onProgress);
        }
        return await UpdateInstallerPlugin.downloadAndInstall(options);
      } finally {
        if (listener) await listener.remove();
      }
    },

    async cancelar() {
      if (this.disponible() && UpdateInstallerPlugin.cancelDownload) {
        return UpdateInstallerPlugin.cancelDownload();
      }
      return { status: 'cancelled' };
    },

    async abrirAjustesInstalacion() {
      if (this.disponible() && UpdateInstallerPlugin.openInstallSettings) {
        return UpdateInstallerPlugin.openInstallSettings();
      }
      return { status: 'unsupported' };
    }
  };

  root.updateInstaller = updateInstaller;
})(typeof window !== 'undefined' ? window : globalThis);
