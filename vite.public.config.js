import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const outputDir = join(rootDir, 'dist-public');

export default defineConfig({
  root: join(rootDir, 'public-site'),
  base: '/',
  publicDir: false,
  build: {
    outDir: outputDir,
    emptyOutDir: true
  },
  plugins: [{
    name: 'copy-public-static',
    closeBundle() {
      mkdirSync(outputDir, { recursive: true });
      const source = join(rootDir, 'version.json');
      if (existsSync(source)) copyFileSync(source, join(outputDir, 'version.json'));
      // Imagen Open Graph: también se copia a dist/ por publicDir en el build
      // de la app (vite.config.js), así que existe en la raíz y en /app/.
      const og = join(rootDir, 'public', 'og-1200x630.png');
      if (existsSync(og)) copyFileSync(og, join(outputDir, 'og-1200x630.png'));
    }
  }]
});
