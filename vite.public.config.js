import { defineConfig } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
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
    name: 'servir-js-raiz-dev',
    // En producción, build:public copia js/ → dist-public/js/ y la landing
    // funciona (sus <script src="../js/..."> resuelven a /js/...). En el dev
    // server (root = public-site) esa carpeta no existe y el login se rompe
    // con "El servicio de inicio de sesión aún no está disponible". Este
    // middleware sirve /js/* desde la raíz del proyecto en desarrollo.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/js/')) {
          const file = join(rootDir, req.url.replace(/^\//, ''));
          if (existsSync(file) && file.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.end(readFileSync(file));
            return;
          }
        }
        // En producción build:public copia assets/ → dist-public/assets/.
        // En desarrollo se sirven igual desde la raíz del proyecto.
        if (req.url && req.url.startsWith('/assets/')) {
          const file = join(rootDir, req.url.replace(/^\//, ''));
          if (existsSync(file)) {
            const ext = file.split('.').pop();
            const tipos = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', ico: 'image/x-icon' };
            res.setHeader('Content-Type', tipos[ext] || 'application/octet-stream');
            res.end(readFileSync(file));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      mkdirSync(outputDir, { recursive: true });
      const source = join(rootDir, 'version.json');
      if (existsSync(source)) copyFileSync(source, join(outputDir, 'version.json'));
      for (const file of ['theme.js', 'login.js', 'contacto.js', 'legal.js', 'recuperar.js', 'registro.js', 'onboarding.js']) {
        const publicSource = join(rootDir, 'public-site', file);
        if (existsSync(publicSource)) copyFileSync(publicSource, join(outputDir, file));
      }
      // SEO + 404: robots, sitemap y página de error personalizada (Vercel
      // sirve 404.html del directorio de salida para rutas no encontradas).
      for (const file of ['404.html', 'robots.txt', 'sitemap.xml']) {
        const publicSource = join(rootDir, 'public-site', file);
        if (existsSync(publicSource)) copyFileSync(publicSource, join(outputDir, file));
      }
      // Imagen Open Graph: también se copia a dist/ por publicDir en el build
      // de la app (vite.config.js), así que existe en la raíz y en /app/.
      const og = join(rootDir, 'public', 'og-1200x630.png');
      if (existsSync(og)) copyFileSync(og, join(outputDir, 'og-1200x630.png'));
    }
  }]
});
