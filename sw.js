const CACHE_VERSION = 'v7';
const STATIC_CACHE = `fb-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fb-dynamic-${CACHE_VERSION}`;
const BASE_URL = self.location.href.replace(/sw\.js$/, '');
const toAbs = (path) => new URL(path, BASE_URL).toString();

const PRECACHE_URLS = [
  'index.html',
  'offline.html',
  'manifest.json',
  'assets/iconos/16x16.png',
  'assets/iconos/32x32.png',
  'assets/iconos/180x180.png',
  'assets/iconos/192x192.png',
  'assets/iconos/512x512.png',
  'assets/iconos/icono.svg',
  'js/vendor/lucide.min.js',
  'js/utilidades/dom-helpers.js',
  'js/utilidades/iconos.js',
  'js/utilidades/storage.js',
  'js/utilidades/preferencias.js',
  'js/core/store.js',
  'js/core/eventBus.js',
  'js/core/router.js',
  'js/datos/supabase-client.js',
  'js/datos/auth-repository.js',
  'js/datos/progreso-repository.js',
  'js/datos/examenes-repository.js',
  'js/datos/memorizacion-repository.js',
  'js/datos/notas-repository.js',
  'js/datos/admin-repository.js',
  'js/datos/sync-queue.js',
  'js/dominio/progreso-lectura.js',
  'js/dominio/repeticion-espaciada.js',
  'js/dominio/puntuacion-examen.js',
  'js/dominio/logros.js',
  'js/dominio/maquina-estudio.js',
  'js/componentes/editor-huecos.js',
  'js/vistas/vista-login.js',
  'js/vistas/vista-estudio.js',
  'js/vistas/vista-capitulos.js',
  'js/vistas/vista-sesion-estudio.js',
  'js/vistas/vista-mapa.js',
  'js/vistas/vista-examenes.js',
  'js/vistas/vista-examen-editor.js',
  'js/vistas/vista-examen-tomar.js',
  'js/vistas/vista-examen-corregir.js',
  'js/vistas/vista-calificaciones.js',
  'js/vistas/vista-memorizacion.js',
  'js/vistas/vista-notas.js',
  'js/vistas/vista-progreso.js',
  'js/vistas/vista-explorar.js',
  'js/vistas/vista-perfil.js',
  'js/vistas/admin/vista-panel-admin.js',
  'js/vistas/admin/vista-owner.js',
  'js/core/index.js',
  'css/00-settings/_tokens.css',
  'css/00-settings/_colores.css',
  'css/00-settings/_tipografia.css',
  'css/00-settings/_espaciado.css',
  'css/01-tools/_funciones.css',
  'css/02-generic/_reset.css',
  'css/03-elements/_body.css',
  'css/03-elements/_heading.css',
  'css/03-elements/_paragraph.css',
  'css/03-elements/_button.css',
  'css/03-elements/_input.css',
  'css/03-elements/_link.css',
  'css/04-objects/_contenedor.css',
  'css/04-objects/_pila.css',
  'css/04-objects/_grid.css',
  'css/04-objects/_flecha.css',
  'css/05-componentes/_boton-primario.css',
  'css/05-componentes/_boton-secundario.css',
  'css/05-componentes/_barra-navegacion-inferior.css',
  'css/05-componentes/_tarjeta-capitulo.css',
  'css/05-componentes/_tarjeta-racha.css',
  'css/05-componentes/_tarjeta-porcentaje.css',
  'css/05-componentes/_celebracion.css',
  'css/05-componentes/_tarjeta-libro.css',
  'css/05-componentes/_barra-progreso.css',
  'css/05-componentes/_barra-accion.css',
  'css/05-componentes/_modal.css',
  'css/05-componentes/_pregunta-examen.css',
  'css/05-componentes/_tarjeta-pregunta.css',
  'css/05-componentes/_tarjeta-memorizacion.css',
  'css/05-componentes/_versiculo.css',
  'css/05-componentes/_btn-calidad.css',
  'css/05-componentes/_seccion-admin.css',
  'css/05-componentes/_alerta.css',
  'css/05-componentes/_zona-peligro.css',
  'css/05-componentes/_tarjeta-crear.css',
  'css/05-componentes/_switch.css',
  'css/05-componentes/_instalar.css',
  'css/05-componentes/_info-ayuda.css',
  'css/05-componentes/_perfil.css',
  'css/05-componentes/_login.css',
  'css/05-componentes/_tarjeta-estadistica.css',
  'css/05-componentes/_boton-enlace.css',
  'css/05-componentes/_calificaciones.css',
  'css/05-componentes/_corregir-examen.css',
  'css/05-componentes/_editor-preguntas.css',
  'css/05-componentes/_examen-tomar.css',
  'css/05-componentes/_explorar.css',
  'css/05-componentes/_loading.css',
  'css/05-componentes/_transiciones.css',
  'css/05-componentes/_editor-huecos.css',
  'css/06-utilidades/_utilidades.css',
  'css/06-utilidades/_colores.css',
  'css/06-utilidades/_accesibilidad.css'
].map(toAbs);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

function esNavegacion(url) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.replace(/\/+$/, '');
    return pathname === '' || pathname === '/' || pathname.endsWith('/index.html');
  } catch (e) {
    return false;
  }
}

function esActivo(url) {
  try {
    const ext = new URL(url).pathname.split('.').pop();
    return ['css', 'js', 'svg', 'png', 'jpg', 'woff2', 'json'].includes(ext);
  } catch (e) { return false; }
}

function esApi(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes('supabase') || u.hostname.includes('cdn.jsdelivr.net');
  } catch (e) { return false; }
}

function fetchConTimeout(url, ms = 5000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    fetch(url, { signal: controller.signal }).then(r => {
      clearTimeout(id);
      resolve(r);
    }).catch(e => {
      clearTimeout(id);
      reject(e);
    });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (!url.startsWith('http')) return;
  if (esApi(url)) return;

  /* En desarrollo (localhost/Vite), no interceptar */
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') return;

  if (esNavegacion(url)) {
    event.respondWith(
      fetchConTimeout(url, 4000)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(toAbs('index.html'), clone));
          return response;
        })
        .catch(() => caches.match(toAbs('index.html')).then(cached => cached || caches.match(toAbs('offline.html'))))
    );
    return;
  }

  if (esActivo(url)) {
    event.respondWith(
      caches.match(url).then((cached) => {
        if (cached) {
          fetch(url).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(url, clone));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(url).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(url, clone));
          }
          return response;
        }).catch(() => caches.match(toAbs('offline.html')));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(url).then((cached) => {
      const fetchPromise = fetch(url).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(url, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
