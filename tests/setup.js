global.window = global;

const { readFileSync } = await import('fs');
const { dirname, join } = await import('path');
const { fileURLToPath } = await import('url');

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');
