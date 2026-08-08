// ============================================================
// js/componentes/update-dialog.js
// UX de actualización Android sin alert() genérico.
// ============================================================

(function (root) {
  'use strict';

  const STATUS_TEXT = {
    checking: 'Comprobando actualizaciones…',
    available: 'Nueva versión disponible',
    downloading: 'Descargando actualización…',
    downloaded: 'Descarga completada',
    preparing: 'Preparando instalación…',
    up_to_date: 'Ya tienes la última versión',
    error: 'No se pudo completar la actualización',
    unknown_sources: 'Se necesita autorización de Android'
  };

  function escapeHtml(value) {
    if (root.helpers?.escapeHtml) return root.helpers.escapeHtml(String(value ?? ''));
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  class UpdateDialog {
    constructor(service = root.updateService, installer = root.updateInstaller) {
      this.service = service;
      this.installer = installer;
      this._overlay = null;
      this._state = null;
      this._checking = false;
      this._onKeyDown = (event) => this._handleKeyDown(event);
    }

    async comprobar({ manual = false } = {}) {
      if (this._checking || !this.service) return null;
      this._checking = true;
      if (manual) this._render({ status: 'checking' });

      try {
        const result = await this.service.checkForUpdate();
        // Una actualización disponible siempre se muestra, también al
        // entrar a la app: el usuario no tiene que buscarla manualmente.
        if (result.status === 'available') {
          this._render(result);
        } else if (manual && (result.status === 'up_to_date' || result.status === 'error')) {
          this._render(result);
        }
        return result;
      } catch (diagnosticError) {
        // El diagnóstico también va a consola para depuración remota
        try { root.console?.info?.('[update] diagnóstico:', this._diagnostico()); } catch (e) {}
        throw diagnosticError;
      } finally {
        this._checking = false;
      }
    }

    // Resumen del estado real del bridge/entorno, para diagnosticar por qué
    // falla la actualización sin depender de suposiciones (p.ej. "detecta PC").
    _diagnostico() {
      const cap = root.Capacitor;
      const ver = root.__FB_APP_VERSION__;
      const lineas = [
        `App: ${ver ? ver.version + ' (versionCode ' + ver.versionCode + ')' : 'desconocida'}`,
        `Capacitor: ${cap ? (cap.getPlatform ? cap.getPlatform() : 'presente') : 'NO detectado'}`,
        `isNativePlatform: ${cap && typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : 'n/a'}`,
        `updateInstaller.disponible: ${this.installer ? this.installer.disponible() : 'no cargado'}`,
        `Manifiesto: ${root.__FB_UPDATE_MANIFEST_URL__ || root.entorno?.updateManifestUrl || 'NO CONFIGURADO'}`,
        `UA: ${(root.navigator && root.navigator.userAgent) || '?'}`
      ];
      return lineas.join('\n');
    }

    cerrar() {
      if (!this._overlay) return;
      document.removeEventListener('keydown', this._onKeyDown);
      this._overlay.remove();
      this._overlay = null;
      this._state = null;
    }

    _render(state) {
      this._state = state;
      if (!this._overlay) {
        this._overlay = document.createElement('div');
        this._overlay.className = 'modal-overlay update-dialog-overlay';
        this._overlay.addEventListener('click', (event) => {
          if (event.target === this._overlay && !state.mandatory) this.cerrar();
        });
        document.body.appendChild(this._overlay);
        document.addEventListener('keydown', this._onKeyDown);
      }

      const isAvailable = state.status === 'available';
      const isChecking = state.status === 'checking';
      const isDownloading = state.status === 'downloading';
      const isDownloaded = state.status === 'downloaded';
      const isPreparing = state.status === 'preparing';
      const isError = state.status === 'error' || state.status === 'unknown_sources';
      const isDone = state.status === 'up_to_date';
      const mandatory = !!state.mandatory;
      const progress = Math.max(0, Math.min(100, Number(state.progress || 0)));
      const notes = (state.releaseNotes || []).map((note) => `<li>${escapeHtml(note)}</li>`).join('');
      const size = state.sizeBytes ? this.service.formatBytes(state.sizeBytes) : null;
      const closeButton = (!mandatory || isError || isDone) && !isChecking
        ? `<button class="update-dialog__close" type="button" data-close aria-label="Cerrar">×</button>`
        : '';

      let body = '';
      if (isChecking) {
        body = `<div class="update-dialog__loading" role="status" aria-live="polite"><span class="update-dialog__spinner" aria-hidden="true"></span><p>Estamos comprobando si hay una versión nueva.</p></div>`;
      } else if (isAvailable) {
        body = `
          <div class="update-dialog__versions" aria-label="Versiones">
            <span>Actual ${escapeHtml(state.currentVersion)}</span>
            <span aria-hidden="true">→</span>
            <strong>Nueva ${escapeHtml(state.latestVersion)}</strong>
          </div>
          ${mandatory ? '<p class="update-dialog__mandatory">Esta actualización es necesaria para seguir usando una versión compatible y segura.</p>' : ''}
          ${notes ? `<div class="update-dialog__notes"><h4>Novedades</h4><ul>${notes}</ul></div>` : ''}
          ${size ? `<p class="update-dialog__size">Tamaño aproximado: ${escapeHtml(size)}</p>` : ''}
          <div class="update-dialog__actions">
            ${mandatory ? '' : '<button class="btn-secundario" type="button" data-later>Más tarde</button>'}
            <button class="btn-primario" type="button" data-update>Actualizar</button>
          </div>`;
      } else if (isDownloading) {
        body = `
          <div class="update-dialog__progress" role="status" aria-live="polite">
            <progress max="100" value="${progress}">${progress}%</progress>
            <strong>${progress}%</strong>
            <p>${escapeHtml(state.progressText || 'Descargando de forma segura…')}</p>
          </div>
          <div class="update-dialog__actions"><button class="btn-secundario" type="button" data-cancel>Cancelar</button></div>`;
      } else if (isDownloaded || isPreparing) {
        body = `<div class="update-dialog__loading" role="status" aria-live="polite"><span class="update-dialog__check" aria-hidden="true">✓</span><p>${escapeHtml(STATUS_TEXT[state.status])}</p></div>`;
      } else if (isDone) {
        body = `<div class="update-dialog__message" role="status"><p>No hay ninguna actualización disponible para este dispositivo.</p></div><div class="update-dialog__actions"><button class="btn-primario" type="button" data-close>Entendido</button></div>`;
      } else if (isError) {
        const unknownSources = state.status === 'unknown_sources';
        const diag = this._diagnostico().replace(/\n/g, '\n');
        body = `
          <div class="update-dialog__message update-dialog__message--error" role="alert">
            <p>${escapeHtml(unknownSources ? 'Android necesita permiso para instalar aplicaciones descargadas desde fuera de Google Play.' : (state.error?.message || 'La aplicación seguirá funcionando con normalidad.'))}</p>
          </div>
          <div class="update-dialog__actions">
            <button class="btn-secundario" type="button" data-manual>Descargar manualmente</button>
            ${unknownSources ? '<button class="btn-secundario" type="button" data-settings>Abrir ajustes</button>' : ''}
            <button class="btn-primario" type="button" data-retry>Reintentar</button>
          </div>
          <details class="update-dialog__diag">
            <summary>Diagnóstico técnico</summary>
            <pre>${escapeHtml(diag)}</pre>
          </details>`;
      }

      this._overlay.innerHTML = `
        <section class="modal update-dialog" role="dialog" aria-modal="true" aria-labelledby="updateDialogTitle">
          ${closeButton}
          <div class="update-dialog__icon" aria-hidden="true">${isError ? '!' : isDone ? '✓' : '↓'}</div>
          <h2 class="modal__titulo" id="updateDialogTitle">${escapeHtml(STATUS_TEXT[state.status] || STATUS_TEXT.error)}</h2>
          ${state.latestVersion && !isAvailable && !isChecking ? `<p class="update-dialog__subtitle">Versión ${escapeHtml(state.latestVersion)}</p>` : ''}
          ${body}
        </section>`;

      root.Iconos?.actualizar?.();
      this._bindActions();
      this._focusFirstAction();
    }

    _bindActions() {
      this._overlay.querySelector('[data-close]')?.addEventListener('click', () => this.cerrar());
      this._overlay.querySelector('[data-later]')?.addEventListener('click', () => this.cerrar());
      this._overlay.querySelector('[data-retry]')?.addEventListener('click', () => this.comprobar({ manual: true }));
      this._overlay.querySelector('[data-settings]')?.addEventListener('click', async () => {
        try { await this.installer?.abrirAjustesInstalacion(); } catch (error) {}
      });
      this._overlay.querySelector('[data-cancel]')?.addEventListener('click', async () => {
        try { await this.installer?.cancelar(); } catch (error) {}
        this.cerrar();
      });
      this._overlay.querySelector('[data-manual]')?.addEventListener('click', async () => {
        const url = this._state?.apkUrl || this._state?.releaseUrl;
        if (!url) return;
        try {
          const win = root.open ? root.open(url, '_blank') : null;
          if (!win) throw new Error('popup-bloqueado');
        } catch (error) {
          try { if (root.navigator?.clipboard) await root.navigator.clipboard.writeText(url); } catch (e) {}
          root.helpers?.mostrarAlerta?.('Copia el enlace y ábrelo en tu navegador: ' + url, 'info');
        }
      });
      this._overlay.querySelector('[data-update]')?.addEventListener('click', () => this._descargar());
    }

    async _descargar() {
      const state = this._state;
      if (!state?.apkUrl) return;
      if (!this.installer?.disponible?.()) {
        this._render({
          status: 'error',
          mandatory: false,
          error: { message: 'La instalación de APK está disponible en la aplicación Android, no en el navegador.' }
        });
        return;
      }

      this._render({ ...state, status: 'downloading', progress: 0 });
      try {
        const result = await this.installer.descargarEInstalar({
          apkUrl: state.apkUrl,
          sha256: state.sha256 || null,
          expectedVersion: state.latestVersion,
          expectedVersionCode: state.latestVersionCode,
          sizeBytes: state.sizeBytes || null
        }, (event) => {
          const progress = Number(event?.percent ?? event?.progress ?? 0);
          this._render({ ...this._state, status: 'downloading', progress, progressText: this._progressText(event) });
        });

        if (result?.status === 'unknown_sources_required') {
          this._render({ ...state, status: 'unknown_sources' });
          return;
        }
        this._render({ ...state, status: 'downloaded', progress: 100 });
        setTimeout(() => {
          if (this._overlay) this._render({ ...state, status: 'preparing' });
        }, 500);
      } catch (error) {
        this._render({ ...state, status: 'error', error: { message: this._friendlyDownloadError(error) } });
      }
    }

    _progressText(event) {
      const downloaded = event?.downloadedBytes;
      const total = event?.totalBytes;
      if (downloaded && total) return `${this.service.formatBytes(downloaded)} de ${this.service.formatBytes(total)}`;
      if (downloaded) return `${this.service.formatBytes(downloaded)} descargados`;
      return 'Descargando de forma segura…';
    }

    _friendlyDownloadError(error) {
      if (error?.code === 'CHECKSUM_MISMATCH') return 'La verificación de integridad falló. La descarga se eliminó y no se instalará.';
      if (error?.code === 'SIGNATURE_MISMATCH') return 'Esta copia de FormsBiblicos no es la oficial (firma distinta). Desinstálala e instala la versión desde la web: https://formsbiblicos.com';
      if (error?.code === 'OLD_DOWNLOAD') return 'El archivo descargado es más antiguo que la app instalada (probablemente caché del navegador). Borra la APK de Descargas y descárgala de nuevo desde la web.';
      if (error?.code === 'DOWNLOAD_CANCELLED') return 'Descarga cancelada.';
      if (error?.code === 'INSUFFICIENT_STORAGE') return 'No hay espacio suficiente para descargar la actualización.';
      if (error?.code === 'NETWORK_ERROR') return 'Se perdió la conexión durante la descarga.';
      return 'No se pudo descargar o preparar la APK. La aplicación actual seguirá funcionando.';
    }

    _focusFirstAction() {
      setTimeout(() => this._overlay?.querySelector('button:not([data-close])')?.focus(), 0);
    }

    _handleKeyDown(event) {
      if (!this._overlay) return;
      if (event.key === 'Escape' && !this._state?.mandatory) {
        event.preventDefault();
        this.cerrar();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = [...this._overlay.querySelectorAll('button:not([disabled])')];
      if (buttons.length < 2) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  root.UpdateDialog = UpdateDialog;
  root.updateDialog = null;

  document.addEventListener('DOMContentLoaded', () => {
    root.updateDialog = new UpdateDialog();
    // La comprobación automática solo aplica en la app nativa (APK): la versión
    // web (Vercel /app) no debe molestar con diálogos de actualización de APK.
    const nativo = !!(root.Capacitor && typeof root.Capacitor.isNativePlatform === 'function' && root.Capacitor.isNativePlatform());
    if (nativo) {
      // Diferida para no bloquear el arranque, pero muestra el diálogo
      // automáticamente si hay una versión nueva.
      setTimeout(() => root.updateDialog.comprobar(), 1500);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
