// ============================================================================
// scripts/lib/build-identity.mjs — identidad de build (versión + cache-busting)
// ============================================================================
// Fuente única de la identidad de un build:
//
//   version     SemVer de package.json (la "release" que numera una persona)
//   versionCode entero de android/version-code.properties
//   buildId     identificador ÚNICO de cada build: <commit>-<AAAAMMDD>-<HHMMSS>-<rand>
//   buildCorto  forma corta para la interfaz: <commit>-<HHMM>
//   versionFull version + '+' + buildId  (SemVer con metadatos de build)
//   builtAt     ISO 8601 del build
//   commit      SHA corto del commit (o 'local')
//
// Por qué existe: el Service Worker guarda todo en una caché cuyo nombre es
// `formsbiblicos-${CACHE_VERSION}`. Si esa cadena no cambia entre
// despliegues, los clientes siguen sirviendo el bundle anterior desde Cache
// Storage (stale-while-revalidate) y la web "se queda cacheada" aunque se
// haya subido código nuevo. Con buildId, cada build genera un nombre de
// caché distinto y el `activate` del SW borra los anteriores.
//
// Reglas:
//   · Todo lo que sale de aquí acaba en el navegador: solo claves públicas.
//   · La identidad se calcula UNA vez por build y se propaga a los sub-builds
//     por variables de entorno (FB_BUILD_ID, FB_BUILD_VERSION, FB_BUILT_AT,
//     FB_COMMIT) para que todos los artefactos de un despliegue coincidan.
//   · `npm run version:patch/minor/major` sigue siendo la forma de subir la
//     versión de release; el buildId es lo que cambia en cada subida.
// ============================================================================
import { execFileSync } from 'node:child_process';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const BUILD_ID_RE = /^[0-9A-Za-z.-]{1,64}$/;

/** Lee el versionCode de android/version-code.properties. */
export function leerVersionCode(texto) {
  const match = String(texto || '').match(/^versionCode=(\d+)\s*$/m);
  if (!match) {
    throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
  }
  const code = Number(match[1]);
  if (!Number.isInteger(code) || code < 1) {
    throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
  }
  return code;
}

/** SHA corto del commit que se está construyendo (o 'local' si no hay git). */
export function commitActual(env = process.env) {
  const candidatos = [env.FB_COMMIT, env.GITHUB_SHA, env.VERCEL_GIT_COMMIT_SHA, env.CF_PAGES_COMMIT_SHA];
  for (const candidato of candidatos) {
    const valor = String(candidato || '').trim();
    if (valor) return valor.replace(/[^0-9A-Za-z]/g, '').slice(0, 7) || 'local';
  }
  try {
    const salida = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return salida.trim() || 'local';
  } catch {
    return 'local';
  }
}

/** Identificador único de build: commit + fecha + sufijo aleatorio. */
export function crearBuildId({ commit = 'local', fecha = new Date(), aleatorio = Math.random() } = {}) {
  const iso = fecha.toISOString();
  const dia = iso.slice(0, 10).replace(/-/g, '');
  const hora = iso.slice(11, 19).replace(/:/g, '');
  const sufijo = Math.floor(aleatorio * 0x10000).toString(16).padStart(4, '0');
  const base = `${String(commit).replace(/[^0-9A-Za-z]/g, '') || 'local'}-${dia}-${hora}-${sufijo}`;
  return base.slice(0, 64);
}

/** Forma corta para mostrar en la interfaz: <commit>-<HHMM>. */
export function buildIdCorto(buildId) {
  const partes = String(buildId || '').split('-');
  // <commit>-<AAAAMMDD>-<HHMMSS>-<aleatorio>
  if (partes.length < 4) return String(buildId || 'local');
  return `${partes[0]}-${partes[2].slice(0, 4)}`;
}

/** SemVer con metadatos de build: 1.0.12+2224c13-20261022-114612-a3f9. */
export function versionFull(version, buildId) {
  return `${version}+${buildId}`;
}

/** Etiqueta legible en la interfaz: "1.0.12 · 2224c13-1146". */
export function etiquetaVersion(version, buildId) {
  return `${version} · ${buildIdCorto(buildId)}`;
}

/**
 * Calcula la identidad de un build.
 * Si el entorno trae FB_BUILD_ID (builds compuestos: build:public, build de
 * Sites), se respeta esa identidad para que todos los artefactos coincidan.
 */
export function calcularIdentidad({ packageJson, versionCode, env = process.env, fecha = new Date() } = {}) {
  const version = String(packageJson?.version || '');
  if (!SEMVER_RE.test(version)) {
    throw new Error('package.json.version debe ser MAJOR.MINOR.PATCH.');
  }
  const commit = commitActual(env);
  const buildId = env.FB_BUILD_ID ? String(env.FB_BUILD_ID).trim() : crearBuildId({ commit, fecha });
  if (!BUILD_ID_RE.test(buildId)) {
    throw new Error(`El buildId "${buildId}" no es válido (solo letras, números, punto y guion).`);
  }
  const builtAt = env.FB_BUILT_AT && !Number.isNaN(Date.parse(env.FB_BUILT_AT))
    ? new Date(env.FB_BUILT_AT).toISOString()
    : fecha.toISOString();

  return {
    version,
    versionCode,
    buildId,
    buildCorto: buildIdCorto(buildId),
    versionFull: versionFull(version, buildId),
    label: etiquetaVersion(version, buildId),
    builtAt,
    commit: env.FB_COMMIT ? String(env.FB_COMMIT).trim() : commit
  };
}

/** Variables de entorno que propagan la identidad a los sub-builds. */
export function entornoIdentidad(identidad, env = process.env) {
  return {
    ...env,
    FB_BUILD_ID: identidad.buildId,
    FB_BUILD_VERSION: identidad.version,
    FB_BUILT_AT: identidad.builtAt,
    FB_COMMIT: identidad.commit
  };
}

/**
 * Sustituye la CACHE_VERSION del service worker por la del build.
 * Idempotente: aplicarlo dos veces deja el mismo resultado.
 */
export function estamparServiceWorker(texto, identidad) {
  const patron = /const CACHE_VERSION = 'v[^']*'/;
  if (!patron.test(texto)) {
    throw new Error('El service worker no declara "const CACHE_VERSION = \'...\'": no se puede estampar.');
  }
  return texto.replace(patron, `const CACHE_VERSION = 'v${identidad.versionFull}'`);
}

/** Añade la identidad del build al manifiesto público de versión. */
export function estamparManifiesto(manifiesto, identidad) {
  const base = manifiesto && typeof manifiesto === 'object' && !Array.isArray(manifiesto) ? manifiesto : {};
  return {
    ...base,
    schemaVersion: base.schemaVersion || 1,
    version: identidad.version,
    buildId: identidad.buildId,
    builtAt: identidad.builtAt,
    commit: identidad.commit,
    // publishedAt es la fecha de la RELEASE: no se pisa en cada build (la
    // fecha de este build va en builtAt).
    publishedAt: base.publishedAt || identidad.builtAt
  };
}

/** Contenido de js/core/version.js (externo: la CSP de producción no permite inline). */
export function contenidoVersionJs(identidad, extra = {}) {
  const datos = {
    version: identidad.version,
    versionCode: identidad.versionCode,
    buildId: identidad.buildId,
    builtAt: identidad.builtAt,
    commit: identidad.commit,
    label: etiquetaVersion(identidad.version, identidad.buildId)
  };
  const partes = [`window.__FB_APP_VERSION__=${JSON.stringify(datos)}`];
  for (const [clave, valor] of Object.entries(extra)) {
    partes.push(`window.${clave}=${JSON.stringify(valor)}`);
  }
  return `${partes.join(';')};`;
}
