// ============================================================
// sw.js — Service Worker de FormsBiblicos (PWA)
// ============================================================
// Estrategia pensada para una app online-first (Supabase):
//   • Navegaciones: red primero; si no hay conexión, sirve el shell cacheado.
//   • Recursos estáticos del mismo origen: stale-while-revalidate.
//   • Las peticiones a Supabase/CDN (otro origen) se pasan por alto.
//
// Al subir la versión de la app (npm run version:*), actualiza también
// CACHE_VERSION para que los clientes limpien la caché antigua al activar.
// ============================================================

const CACHE_VERSION = 'v1.0.12';
const CACHE_NAME = `formsbiblicos-${CACHE_VERSION}`;

// Shell mínimo para que la app abra sin conexión. El resto se cachea
// dinámicamente conforme el usuario navega (stale-while-revalidate).
const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/iconos/icono.svg',
  './assets/iconos/16x16.png',
  './assets/iconos/32x32.png',
  './assets/iconos/180x180.png',
  './assets/iconos/192x192.png',
  './assets/iconos/512x512.png'
];

// ============================================================
// INSTALL — precache del shell y activación inmediata
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — limpiar cachés antiguas y tomar el control
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((name) => name.startsWith('formsbiblicos-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — solo GET del mismo origen
// ============================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/CDN sin tocar

  // Navegaciones: red primero, fallback al shell cacheado (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match('./index.html')
            .then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // Estáticos: servir caché si existe y refrescar en segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
