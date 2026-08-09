// ============================================================================
// scripts/generate-version-manifest.mjs — genera version.json para una release
// ============================================================================
// Lo ejecuta el workflow `Android Release` tras crear la GitHub Release:
//
//   node scripts/generate-version-manifest.mjs \
//     --repo owner/repo \
//     --sha256 <64 hex> \
//     --size <bytes> \
//     --notes release-notes.md
//
// Lee la versión de package.json, el versionCode de android/version-code.properties
// y conserva minimumVersion/minimumVersionCode/mandatory del version.json
// actualmente commiteado (el humano los ajusta entre releases). Las notas salen
// de release-notes.md (líneas no vacías, sin comentarios '#'; se quita un
// prefijo "- "/"* " opcional). Valida TODO contra el contrato de update-service
// antes de escribir; si algo no es válido, falla y no publica un manifiesto roto.
// ============================================================================
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_NOTES = 50;
const MAX_NOTE_LENGTH = 500;

export function parsearNotas(texto) {
  // Solo se aceptan líneas de lista ('- ' o '* '): la prosa y los comentarios
  // '#' se ignoran para que las instrucciones del archivo no acaben como
  // releaseNotes. Cada línea resultante es una novedad.
  return String(texto || '')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => /^[-*]\s+\S/.test(linea))
    .map((linea) => linea.replace(/^[-*]\s+/, '').trim());
}

export function construirManifest({ packageJson, versionCodeProperties, manifestActual, repo, sha256, sizeBytes, notasTexto }) {
  const version = String(packageJson?.version || '');
  if (!SEMVER_RE.test(version)) {
    throw new Error('package.json.version debe ser SemVer MAJOR.MINOR.PATCH.');
  }

  const codeMatch = String(versionCodeProperties || '').match(/^versionCode=(\d+)\s*$/m);
  const versionCode = codeMatch ? Number(codeMatch[1]) : NaN;
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
  }

  if (!REPO_RE.test(String(repo || ''))) {
    throw new Error('--repo debe ser "owner/repo" (p.ej. Heater64/FormulariosWeb).');
  }
  if (!SHA256_RE.test(String(sha256 || ''))) {
    throw new Error('--sha256 debe tener 64 caracteres hexadecimales.');
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1) {
    throw new Error('--size debe ser un entero positivo (bytes del APK).');
  }

  const releaseNotes = parsearNotas(notasTexto);
  if (releaseNotes.length === 0) {
    throw new Error('release-notes.md no contiene novedades (escribe una por línea empezando por "- " o "* "; los comentarios "#" se ignoran).');
  }
  if (releaseNotes.length > MAX_NOTES) {
    throw new Error(`release-notes.md tiene más de ${MAX_NOTES} novedades.`);
  }
  if (releaseNotes.some((nota) => nota.length > MAX_NOTE_LENGTH)) {
    throw new Error(`Cada novedad debe tener menos de ${MAX_NOTE_LENGTH} caracteres.`);
  }

  const actual = manifestActual && typeof manifestActual === 'object' && !Array.isArray(manifestActual) ? manifestActual : {};
  const minimumVersion = String(actual.minimumVersion || '');
  const minimumVersionCode = actual.minimumVersionCode;
  const mandatory = actual.mandatory;
  if (!SEMVER_RE.test(minimumVersion)) {
    throw new Error('version.json actual no tiene minimumVersion SemVer válida; edítalo antes de lanzar la release.');
  }
  if (!Number.isInteger(minimumVersionCode) || minimumVersionCode < 1) {
    throw new Error('version.json actual no tiene minimumVersionCode entero positivo; edítalo antes de lanzar la release.');
  }
  if (typeof mandatory !== 'boolean') {
    throw new Error('version.json actual no tiene mandatory booleano; edítalo antes de lanzar la release.');
  }

  return {
    schemaVersion: 1,
    version,
    versionCode,
    minimumVersion,
    minimumVersionCode,
    mandatory,
    apkUrl: `https://github.com/${repo}/releases/download/v${version}/formsbiblicos.apk`,
    releaseUrl: `https://github.com/${repo}/releases/tag/v${version}`,
    releaseNotes,
    sizeBytes,
    sha256: String(sha256).toLowerCase(),
    publishedAt: new Date().toISOString()
  };
}

async function main() {
  const args = process.argv.slice(2);
  const leer = (bandera) => {
    const indice = args.indexOf(bandera);
    return indice >= 0 && args[indice + 1] ? args[indice + 1] : null;
  };
  const repo = leer('--repo');
  const sha256 = leer('--sha256');
  const sizeRaw = leer('--size');
  const notesPath = leer('--notes') || 'release-notes.md';
  const sizeBytes = sizeRaw == null ? null : Number(sizeRaw);

  const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
  const versionCodeProperties = await readFile(join(rootDir, 'android/version-code.properties'), 'utf8');
  const manifestActual = JSON.parse(await readFile(join(rootDir, 'version.json'), 'utf8'));
  const notasTexto = await readFile(join(rootDir, notesPath), 'utf8');

  const manifiesto = construirManifest({
    packageJson,
    versionCodeProperties,
    manifestActual,
    repo,
    sha256,
    sizeBytes,
    notasTexto
  });

  await writeFile(join(rootDir, 'version.json'), `${JSON.stringify(manifiesto, null, 2)}\n`, 'utf8');
  console.log(`version.json generado: ${manifiesto.version} · versionCode ${manifiesto.versionCode} · sha256 ${manifiesto.sha256}`);
}

// Solo se ejecuta como CLI (node scripts/generate-version-manifest.mjs), no al
// importarlo desde los tests.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/generate-version-manifest.mjs')) {
  main().catch((error) => {
    console.error(`[generate-version-manifest] ${error.message}`);
    process.exit(1);
  });
}
