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
          try {
            listener = await UpdateInstallerPlugin.addListener('downloadProgress', onProgress);
          } catch (error) {
            // El progreso es opcional: que la suscripción falle no debe
            // bloquear la descarga (si no, se ve como un error genérico).
            listener = null;
          }
        }
        return await UpdateInstallerPlugin.downloadAndInstall(options);
      } catch (error) {
        // Normaliza el error para que el diálogo siempre pueda mostrar un
        // código (algunos fallos del puente pueden llegar sin .code).
        if (error && typeof error === 'object' && !error.code) {
          error.code = error.data?.code || 'NATIVE_ERROR';
        }
        throw error;
      } finally {
        if (listener) {
          try { await listener.remove(); } catch (error) {}
        }
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
    },

    // Versión REAL de la app instalada en el sistema (la lee el plugin nativo
    // de PackageManager). Fuente de verdad para updateService: evita que un
    // build obsoleto (con __FB_APP_VERSION__ desfasado) ofrezca actualizaciones
    // fantasma o entre en bucle. Devuelve null fuera de Android o si el plugin
    // no está disponible; el llamador usa entonces el valor del build.
    async obtenerVersionInstalada() {
      const UpdateInstallerPlugin = plugin();
      if (this.disponible() && UpdateInstallerPlugin.getInstalledVersion) {
        try {
          const result = await UpdateInstallerPlugin.getInstalledVersion();
          if (result && typeof result.versionName === 'string' && Number.isInteger(result.versionCode)) {
            return { version: result.versionName, versionCode: result.versionCode };
          }
        } catch (error) {
          return null;
        }
      }
      return null;
    }
  };

  root.updateInstaller = updateInstaller;
})(typeof window !== 'undefined' ? window : globalThis);
