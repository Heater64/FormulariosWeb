import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageData = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
const androidBuild = join(rootDir, 'android/app/build.gradle');
const versionCodePath = join(rootDir, 'android/version-code.properties');
const versionCodeText = await readFile(versionCodePath, 'utf8');
const versionCodeMatch = versionCodeText.match(/^versionCode=(\d+)\s*$/m);

if (!versionCodeMatch || Number(versionCodeMatch[1]) < 1) {
  throw new Error('android/version-code.properties debe contener un versionCode entero positivo.');
}
if (!/^\d+\.\d+\.\d+$/.test(packageData.version || '')) {
  throw new Error('package.json.version debe ser MAJOR.MINOR.PATCH.');
}

try {
  await access(androidBuild);
} catch {
  console.log(`Android todavía no está generado. Fuentes preparadas: ${packageData.version} (versionCode ${versionCodeMatch[1]}).`);
  process.exit(0);
}

const contents = await readFile(androidBuild, 'utf8');
if (!contents.includes('package.json') || !contents.includes('version-code.properties') || !contents.includes('versionName') || !contents.includes('versionCode')) {
  throw new Error('android/app/build.gradle no parece leer las fuentes separadas de versionName/versionCode.');
}
console.log(`Android sincronizado: versionName ${packageData.version} · versionCode ${versionCodeMatch[1]}.`);
