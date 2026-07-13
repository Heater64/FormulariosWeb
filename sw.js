const CACHE_VERSION = 'v1';
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
  '/assets/iconos/sprite.svg'
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

function isAsset(url) {
  const ext = new URL(url).pathname.split('.').pop();
  return ['css', 'js', 'svg', 'png', 'jpg', 'woff2', 'json'].includes(ext);
}

function isApiRequest(url) {
  const u = new URL(url);
  return u.hostname.includes('supabase') || u.hostname.includes('cdn.jsdelivr.net');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
