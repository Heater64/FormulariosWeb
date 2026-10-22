import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(rootDir, 'package.json');
const versionCodePath = join(rootDir, 'android/version-code.properties');
const swPath = join(rootDir, 'public/sw.js');
const manifestPath = join(rootDir, 'version.json');
const kind = process.argv[2];
const increments = { patch: [0, 0, 1], minor: [0, 1, 0], major: [1, 0, 0] };

if (!increments[kind]) {
  console.error('Uso: npm run version:patch | version:minor | version:major');
  process.exit(1);
}

const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
const match = String(packageData.version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) throw new Error('package.json.version debe ser MAJOR.MINOR.PATCH.');
const versionCodeText = await readFile(versionCodePath, 'utf8');
const versionCodeMatch = versionCodeText.match(/^versionCode=(\d+)\s*$/m);
if (!versionCodeMatch || Number(versionCodeMatch[1]) < 1) {
  throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
}

const current = match.slice(1).map(Number);
const increment = increments[kind];
const next = current.map((value, index) => value + increment[index]);
if (kind === 'major') { next[1] = 0; next[2] = 0; }
if (kind === 'minor') next[2] = 0;

const previousVersion = packageData.version;
const nextVersionCode = Number(versionCodeMatch[1]) + 1;
packageData.version = next.join('.');
await writeFile(packagePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
await writeFile(versionCodePath, versionCodeText.replace(/^versionCode=\d+\s*$/m, `versionCode=${nextVersionCode}`), 'utf8');

// Mantener CACHE_VERSION en sw.js sincronizado con package.json
const swText = await readFile(swPath, 'utf8');
const newSwText = swText.replace(
  /const CACHE_VERSION = 'v[^']*'/,
  `const CACHE_VERSION = 'v${packageData.version}'`
);
if (newSwText !== swText) await writeFile(swPath, newSwText);

// El manifiesto público de versión es lo que ve el cliente: si no se actualiza
// aquí, la web seguiría anunciando la versión anterior.
let manifestActualizado = false;
if (existsSync(manifestPath)) {
  const manifiesto = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifiesto.version !== packageData.version) {
    manifiesto.version = packageData.version;
    await writeFile(manifestPath, `${JSON.stringify(manifiesto, null, 2)}\n`, 'utf8');
    manifestActualizado = true;
  }
}

console.log(`${previousVersion} → ${packageData.version} · Android versionCode ${nextVersionCode} · SW CACHE_VERSION actualizado${manifestActualizado ? ' · version.json sincronizado' : ''}`);
