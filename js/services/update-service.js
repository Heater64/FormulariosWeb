// ============================================================
// js/services/update-service.js
// Servicio de actualización manual de APK para Capacitor Android.
// ============================================================

(function (root) {
  'use strict';

  const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const SHA256_RE = /^[a-fA-F0-9]{64}$/;
  const DEFAULT_TIMEOUT_MS = 8000;
  const GITHUB_RELEASE_PREFIX = '/heater64/formulariosweb/releases/';
  const MAX_NOTES = 50;
  const MAX_NOTE_LENGTH = 500;

  function parseVersion(input) {
    if (typeof input !== 'string') return null;
    const match = input.trim().match(VERSION_RE);
    if (!match) return null;
    return {
      raw: input.trim(),
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      prerelease: match[4] ? match[4].split('.') : [],
      build: match[5] || ''
    };
  }

  function comparePrerelease(left, right) {
    if (!left.length && !right.length) return 0;
    if (!left.length) return 1;
    if (!right.length) return -1;

    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const a = left[index];
      const b = right[index];
      if (a === undefined) return -1;
      if (b === undefined) return 1;
      if (a === b) continue;

      const aNumeric = /^\d+$/.test(a);
      const bNumeric = /^\d+$/.test(b);
      if (aNumeric && bNumeric) return Number(a) - Number(b);
      if (aNumeric) return -1;
      if (bNumeric) return 1;
      return a < b ? -1 : 1;
    }
    return 0;
  }

  function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) throw new Error('Las versiones deben usar SemVer MAJOR.MINOR.PATCH.');
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    return comparePrerelease(a.prerelease, b.prerelease);
  }

  function releaseUrlIsSafe(raw, kind) {
    if (raw == null && kind === 'apk') return true;
    if (typeof raw !== 'string' || !raw.trim()) return false;

    let url;
    try { url = new URL(raw); } catch (error) { return false; }
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') return false;

    const path = url.pathname.toLowerCase();
    if (kind === 'apk') {
      return path.startsWith(`${GITHUB_RELEASE_PREFIX}download/`) && path.endsWith('.apk');
    }
    return path.startsWith(GITHUB_RELEASE_PREFIX) || path === GITHUB_RELEASE_PREFIX.slice(0, -1);
  }

  function invalid(message, field) {
    return { ok: false, error: { code: 'INVALID_MANIFEST', message, field: field || null } };
  }

  function validateManifest(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return invalid('La respuesta de versión no es un objeto JSON.');
    }

    const version = parseVersion(input.version);
    if (!version) return invalid('La versión remota no es SemVer válida.', 'version');
    if (!Number.isInteger(input.versionCode) || input.versionCode < 1) {
      return invalid('versionCode debe ser un entero positivo.', 'versionCode');
    }

    const minimumVersion = parseVersion(input.minimumVersion);
    if (!minimumVersion) return invalid('minimumVersion no es SemVer válida.', 'minimumVersion');
    if (!Number.isInteger(input.minimumVersionCode) || input.minimumVersionCode < 1) {
      return invalid('minimumVersionCode debe ser un entero positivo.', 'minimumVersionCode');
    }
    if (typeof input.mandatory !== 'boolean') return invalid('mandatory debe ser booleano.', 'mandatory');
    if (!releaseUrlIsSafe(input.apkUrl, 'apk')) return invalid('apkUrl debe ser una URL HTTPS de un asset APK de GitHub Releases.', 'apkUrl');
    if (!releaseUrlIsSafe(input.releaseUrl, 'release')) return invalid('releaseUrl debe ser una URL HTTPS de GitHub Releases.', 'releaseUrl');

    if (!Array.isArray(input.releaseNotes) || input.releaseNotes.length > MAX_NOTES) {
      return invalid(`releaseNotes debe ser un array de hasta ${MAX_NOTES} elementos.`, 'releaseNotes');
    }
    if (input.releaseNotes.some((note) => typeof note !== 'string' || !note.trim() || note.length > MAX_NOTE_LENGTH)) {
      return invalid('Cada novedad debe ser texto no vacío y de longitud limitada.', 'releaseNotes');
    }

    if (input.sizeBytes != null && (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1)) {
      return invalid('sizeBytes debe ser un entero positivo o null.', 'sizeBytes');
    }
    if (input.sha256 != null && (typeof input.sha256 !== 'string' || !SHA256_RE.test(input.sha256))) {
      return invalid('sha256 debe contener 64 caracteres hexadecimales o ser null.', 'sha256');
    }
    if (typeof input.publishedAt !== 'string' || Number.isNaN(Date.parse(input.publishedAt))) {
      return invalid('publishedAt debe ser una fecha ISO válida.', 'publishedAt');
    }
    if (input.schemaVersion != null && input.schemaVersion !== 1) {
      return invalid('schemaVersion no soportada.', 'schemaVersion');
    }

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        version: version.raw,
        versionCode: input.versionCode,
        minimumVersion: minimumVersion.raw,
        minimumVersionCode: input.minimumVersionCode,
        mandatory: input.mandatory,
        apkUrl: input.apkUrl,
        releaseUrl: input.releaseUrl,
        releaseNotes: input.releaseNotes.map((note) => note.trim()),
        sizeBytes: input.sizeBytes == null ? null : input.sizeBytes,
        sha256: input.sha256 == null ? null : input.sha256.toLowerCase(),
        publishedAt: new Date(input.publishedAt).toISOString()
      }
    };
  }

  function currentVersion(options) {
    return options.currentVersion || root.__FB_APP_VERSION__?.version || root.entorno?.appVersion || '0.0.0';
  }

  function currentVersionCode(options) {
    const value = options.currentVersionCode ?? root.__FB_APP_VERSION__?.versionCode ?? root.entorno?.appVersionCode ?? 0;
    return Number.isInteger(value) ? value : 0;
  }

  function isNativeRuntime() {
    try {
      return !!(root.Capacitor && typeof root.Capacitor.isNativePlatform === 'function' && root.Capacitor.isNativePlatform());
    } catch (error) {
      return false;
    }
  }

  function resolveManifestUrl(options) {
    if (options.manifestUrl) return options.manifestUrl;
    const configured = root.__FB_UPDATE_MANIFEST_URL__ || root.entorno?.updateManifestUrl || root.ENV?.UPDATE_MANIFEST_URL;
    if (configured) {
      if (isNativeRuntime()) {
        try {
          if (new URL(configured).protocol !== 'https:') return null;
        } catch (error) { return null; }
      }
      return configured;
    }
    if (isNativeRuntime()) return null;
    if (root.location?.href) return new URL('./version.json', root.location.href).href;
    return null;
  }

  function errorResult(version, versionCode, code, message) {
    return {
      status: 'error',
      updateAvailable: false,
      mandatory: false,
      currentVersion: version,
      currentVersionCode: versionCode,
      latestVersion: null,
      latestVersionCode: null,
      error: { code, message }
    };
  }

  async function fetchWithTimeout(fetchImpl, url, timeoutMs, parentSignal) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timer = null;
    let removeParentListener = null;

    if (controller) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
      if (parentSignal) {
        const abortParent = () => controller.abort();
        if (parentSignal.aborted) controller.abort();
        else {
          parentSignal.addEventListener('abort', abortParent, { once: true });
          removeParentListener = () => parentSignal.removeEventListener('abort', abortParent);
        }
      }
    }

    try {
      return await fetchImpl(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : parentSignal
      });
    } finally {
      if (timer) clearTimeout(timer);
      if (removeParentListener) removeParentListener();
    }
  }

  async function checkForUpdate(options = {}) {
    const installed = currentVersion(options);
    const installedCode = currentVersionCode(options);
    const url = resolveManifestUrl(options);
    if (!url) return errorResult(installed, installedCode, 'NOT_CONFIGURED', 'No se ha configurado el endpoint de actualizaciones de producción.');

    const fetchImpl = options.fetchImpl || root.fetch;
    if (typeof fetchImpl !== 'function') return errorResult(installed, installedCode, 'FETCH_UNAVAILABLE', 'El navegador no permite comprobar actualizaciones.');

    let response;
    try {
      response = await fetchWithTimeout(fetchImpl, url, options.timeoutMs || DEFAULT_TIMEOUT_MS, options.signal);
    } catch (error) {
      const code = error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      return errorResult(installed, installedCode, code, 'No se pudo comprobar la actualización. La aplicación seguirá funcionando.');
    }
    if (!response || !response.ok) {
      return errorResult(installed, installedCode, 'HTTP_ERROR', `El servidor de actualizaciones respondió ${response?.status || 'sin estado'}.`);
    }

    let raw;
    try { raw = await response.json(); }
    catch (error) { return errorResult(installed, installedCode, 'INVALID_JSON', 'El documento de versión está corrupto.'); }

    const validation = validateManifest(raw);
    if (!validation.ok) return errorResult(installed, installedCode, validation.error.code, validation.error.message);
    const remote = validation.value;

    let versionComparison;
    try { versionComparison = compareVersions(remote.version, installed); }
    catch (error) { return errorResult(installed, installedCode, 'INVALID_CURRENT_VERSION', 'La versión instalada no es válida.'); }

    const updateAvailable = versionComparison > 0 || (versionComparison === 0 && remote.versionCode > installedCode);
    const belowMinimum = compareVersions(installed, remote.minimumVersion) < 0 || installedCode < remote.minimumVersionCode;
    if (!updateAvailable) {
      return {
        status: 'up_to_date',
        updateAvailable: false,
        mandatory: false,
        currentVersion: installed,
        currentVersionCode: installedCode,
        latestVersion: remote.version,
        latestVersionCode: remote.versionCode,
        releaseNotes: remote.releaseNotes
      };
    }

    if (!remote.apkUrl) {
      return errorResult(installed, installedCode, 'MISSING_APK_URL', 'La release anuncia una actualización pero todavía no tiene APK publicada.');
    }

    return {
      status: 'available',
      updateAvailable: true,
      mandatory: remote.mandatory || belowMinimum,
      currentVersion: installed,
      currentVersionCode: installedCode,
      latestVersion: remote.version,
      latestVersionCode: remote.versionCode,
      minimumVersion: remote.minimumVersion,
      minimumVersionCode: remote.minimumVersionCode,
      apkUrl: remote.apkUrl,
      releaseUrl: remote.releaseUrl,
      releaseNotes: remote.releaseNotes,
      sizeBytes: remote.sizeBytes,
      sha256: remote.sha256,
      publishedAt: remote.publishedAt
    };
  }

  async function verifySha256(data, expected) {
    if (!expected || !SHA256_RE.test(expected)) return false;
    if (!root.crypto?.subtle || !root.TextEncoder) return false;
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const digest = await root.crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return actual === expected.toLowerCase();
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 1) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
  }

  root.updateService = {
    compareVersions,
    parseVersion,
    validateManifest,
    checkForUpdate,
    verifySha256,
    formatBytes,
    isNativeRuntime,
    resolveManifestUrl
  };
})(typeof window !== 'undefined' ? window : globalThis);
