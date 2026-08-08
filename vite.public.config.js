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
    name: 'copy-public-version-manifest',
    closeBundle() {
      const source = join(rootDir, 'version.json');
      if (!existsSync(source)) return;
      mkdirSync(outputDir, { recursive: true });
      copyFileSync(source, join(outputDir, 'version.json'));
    }
  }]
});
