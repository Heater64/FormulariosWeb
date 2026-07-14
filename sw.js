const CACHE_VERSION = 'v5';
const STATIC_CACHE = `fb-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fb-dynamic-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/iconos/icon-192.svg',
  '/assets/iconos/icon-512.svg',
  '/assets/iconos/icon-maskable-192.svg',
  '/assets/iconos/icon-maskable-512.svg',
  '/assets/iconos/sprite.svg',
  '/js/vendor/lucide.min.js',
  '/css/00-settings/_tokens.css',
  '/css/00-settings/_colores.css',
  '/css/00-settings/_tipografia.css',
  '/css/00-settings/_espaciado.css',
  '/css/01-tools/_funciones.css',
  '/css/02-generic/_reset.css',
  '/css/03-elements/_body.css',
  '/css/03-elements/_heading.css',
  '/css/03-elements/_paragraph.css',
  '/css/03-elements/_button.css',
  '/css/03-elements/_input.css',
  '/css/03-elements/_link.css',
  '/css/04-objects/_contenedor.css',
  '/css/04-objects/_pila.css',
  '/css/04-objects/_grid.css',
  '/css/04-objects/_flecha.css',
  '/css/05-componentes/_boton-primario.css',
  '/css/05-componentes/_boton-secundario.css',
  '/css/05-componentes/_barra-navegacion-inferior.css',
  '/css/05-componentes/_tarjeta-capitulo.css',
  '/css/05-componentes/_tarjeta-racha.css',
  '/css/05-componentes/_tarjeta-porcentaje.css',
  '/css/05-componentes/_celebracion.css',
  '/css/05-componentes/_tarjeta-libro.css',
  '/css/05-componentes/_barra-progreso.css',
  '/css/05-componentes/_barra-accion.css',
  '/css/05-componentes/_modal.css',
  '/css/05-componentes/_pregunta-examen.css',
  '/css/05-componentes/_tarjeta-pregunta.css',
  '/css/05-componentes/_tarjeta-memorizacion.css',
  '/css/05-componentes/_versiculo.css',
  '/css/05-componentes/_btn-calidad.css',
  '/css/05-componentes/_seccion-admin.css',
  '/css/05-componentes/_alerta.css',
  '/css/05-componentes/_zona-peligro.css',
  '/css/05-componentes/_tarjeta-crear.css',
  '/css/05-componentes/_switch.css',
  '/css/05-componentes/_instalar.css',
  '/css/06-utilidades/_utilidades.css',
  '/css/06-utilidades/_colores.css',
  '/css/06-utilidades/_accesibilidad.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
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
  try { const u = new URL(url); return u.pathname === '/' || u.pathname === '/index.html'; } catch (e) { return false; }
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

  if (esNavegacion(url)) {
    event.respondWith(
      fetchConTimeout(url, 4000)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('index.html', clone));
          return response;
        })
        .catch(() => caches.match('index.html').then(cached => cached || caches.match('/offline.html')))
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
        }).catch(() => caches.match('/offline.html'));
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
