// ============================================================
// Bridge clásico para el plugin Capacitor nativo.
// El proyecto usa scripts clásicos; el runtime UMD de Capacitor se
// carga durante el build para evitar imports bare sin bundlear.
//
// Capacitor se resuelve de forma PERZOSA (no al cargar el script):
// los scripts defer se ejecutan en orden de aparición, y si este
// archivo corre antes que el runtime, root.Capacitor todavía no
// tiene registerPlugin. Al resolverlo bajo demanda (primer uso),
// el runtime ya está cargado y la detección funciona siempre.
// ============================================================
(function (root) {
  'use strict';

  let cachedPlugin = null;

  function capacitorRuntime() {
    return root.Capacitor || (root.capacitorExports && root.capacitorExports.Capacitor) || null;
  }

  function plugin() {
    if (cachedPlugin) return cachedPlugin;
    const capacitor = capacitorRuntime();
    if (!capacitor || typeof capacitor.registerPlugin !== 'function') return null;
    try {
      cachedPlugin = capacitor.registerPlugin('UpdateInstaller');
    } catch (error) {
      cachedPlugin = null;
    }
    return cachedPlugin;
  }

  const updateInstaller = {
    disponible() {
      try {
        const capacitor = capacitorRuntime();
        return !!(capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform() && plugin());
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

      const UpdateInstallerPlugin = plugin();
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
      const UpdateInstallerPlugin = plugin();
      if (this.disponible() && UpdateInstallerPlugin.cancelDownload) {
        return UpdateInstallerPlugin.cancelDownload();
      }
      return { status: 'cancelled' };
    },

    async abrirAjustesInstalacion() {
      const UpdateInstallerPlugin = plugin();
      if (this.disponible() && UpdateInstallerPlugin.openInstallSettings) {
        return UpdateInstallerPlugin.openInstallSettings();
      }
      return { status: 'unsupported' };
    }
  };

  root.updateInstaller = updateInstaller;
})(typeof window !== 'undefined' ? window : globalThis);
