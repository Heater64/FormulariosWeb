import { defineConfig } from 'vite';
import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

function copyStaticFiles() {
  const files = ['sw.js', 'offline.html', 'manifest.json'];
  const dirs = ['js', 'css', 'data', 'assets/iconos'];

  return {
    name: 'copy-static-files',
    closeBundle() {
      for (const dir of dirs) {
        const from = join(process.cwd(), dir);
        const to = join(process.cwd(), 'dist', dir);
        if (!existsSync(from)) continue;
        rmSync(to, { recursive: true, force: true });
        cpSync(from, to, { recursive: true });
      }

      for (const file of files) {
        const from = join(process.cwd(), file);
        const to = join(process.cwd(), 'dist', file);
        if (!existsSync(from)) continue;
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 3000,
  },
  plugins: [copyStaticFiles()],
});
