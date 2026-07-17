// ============================================================
// sw.js - Service Worker para FormsBiblicos
// ============================================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `formsbiblicos-${CACHE_VERSION}`;

// Recursos a cachear en la instalación
const urlsToCache = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/iconos/icono.svg',
  './assets/iconos/16x16.png',
  './assets/iconos/32x32.png',
  './assets/iconos/180x180.png',
  './assets/iconos/192x192.png',
  './assets/iconos/512x512.png',
  './css/00-settings/_tokens.css',
  './css/00-settings/_colores.css',
  './css/00-settings/_tipografia.css',
  './css/00-settings/_espaciado.css',
  './css/01-tools/_funciones.css',
  './css/02-generic/_reset.css',
  './js/datos/cache-datos.js',
  './css/03-elements/_body.css',
  './css/03-elements/_heading.css',
  './css/03-elements/_paragraph.css',
  './css/03-elements/_button.css',
  './css/03-elements/_input.css',
  './css/03-elements/_link.css',
  './css/04-objects/_contenedor.css',
  './css/04-objects/_pila.css',
  './css/04-objects/_grid.css',
  './css/04-objects/_flecha.css',
  './css/05-componentes/_boton-primario.css',
  './css/05-componentes/_boton-secundario.css',
  './css/05-componentes/_barra-navegacion-inferior.css',
  './css/05-componentes/_tarjeta-capitulo.css',
  './css/05-componentes/_tarjeta-racha.css',
  './css/05-componentes/_tarjeta-porcentaje.css',
  './css/05-componentes/_celebracion.css',
  './css/05-componentes/_tarjeta-libro.css',
  './css/05-componentes/_barra-progreso.css',
  './css/05-componentes/_barra-accion.css',
  './css/05-componentes/_modal.css',
  './css/05-componentes/_pregunta-examen.css',
  './css/05-componentes/_tarjeta-pregunta.css',
  './css/05-componentes/_tarjeta-memorizacion.css',
  './css/05-componentes/_info-ayuda.css',
  './css/05-componentes/_versiculo.css',
  './css/05-componentes/_btn-calidad.css',
  './css/05-componentes/_seccion-admin.css',
  './css/05-componentes/_alerta.css',
  './css/05-componentes/_zona-peligro.css',
  './css/05-componentes/_tarjeta-crear.css',
  './css/05-componentes/_switch.css',
  './css/05-componentes/_instalar.css',
  './css/05-componentes/_loading.css',
  './css/05-componentes/_transiciones.css',
  './css/05-componentes/_editor-huecos.css',
  './css/05-componentes/_perfil.css',
  './css/05-componentes/_login.css',
  './css/05-componentes/_tarjeta-estadistica.css',
  './css/05-componentes/_boton-enlace.css',
  './css/05-componentes/_calificaciones.css',
  './css/05-componentes/_corregir-examen.css',
  './css/05-componentes/_editor-preguntas.css',
  './css/05-componentes/_examen-tomar.css',
  './css/05-componentes/_explorar.css',
  './css/06-utilidades/_utilidades.css',
  './css/06-utilidades/_colores.css',
  './css/06-utilidades/_accesibilidad.css',
  './js/vendor/lucide.min.js',
  './js/utilidades/dom-helpers.js',
  './js/utilidades/iconos.js',
  './js/utilidades/storage.js',
  './js/utilidades/preferencias.js',
  './js/core/store.js',
  './js/core/eventBus.js',
  './js/core/router.js',
  './js/datos/supabase-client.js',
  './js/datos/auth-repository.js',
  './js/datos/progreso-repository.js',
  './js/datos/examenes-repository.js',
  './js/datos/memorizacion-repository.js',
  './js/datos/notas-repository.js',
  './js/datos/admin-repository.js',
  './js/datos/sync-queue.js',
  './js/dominio/progreso-lectura.js',
  './js/dominio/repeticion-espaciada.js',
  './js/dominio/puntuacion-examen.js',
  './js/dominio/logros.js',
  './js/dominio/maquina-estudio.js',
  './js/componentes/editor-huecos.js',
  './js/vistas/vista-login.js',
  './js/vistas/vista-estudio.js',
  './js/vistas/vista-capitulos.js',
  './js/vistas/vista-sesion-estudio.js',
  './js/vistas/vista-mapa.js',
  './js/vistas/vista-examenes.js',
  './js/vistas/vista-examen-editor.js',
  './js/vistas/vista-examen-tomar.js',
  './js/vistas/vista-examen-corregir.js',
  './js/vistas/vista-calificaciones.js',
  './js/vistas/vista-memorizacion.js',
  './js/vistas/vista-notas.js',
  './js/vistas/vista-progreso.js',
  './js/vistas/vista-explorar.js',
  './js/vistas/vista-perfil.js',
  './js/vistas/admin/vista-panel-admin.js',
  './js/vistas/admin/vista-owner.js',
  './js/core/index.js'
];

// Datos estáticos (curiosidades, personajes, cronología, etc.) – se cachean para abrir al instante
const dataUrlsToCache = [
  './data/cronologia.json',
  './data/curiosidades.json',
  './data/genealogia.json',
  './data/lugares.json',
  './data/milagros.json',
  './data/objetos.json',
  './data/parabolas.json',
  './data/personajes.json',
  './data/profecias.json',
  './data/reyes.json'
];

// ============================================================
// INSTALL - Cachear recursos y activar inmediatamente
// ============================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return caches.open('formsbiblicos-data').then((cache) => cache.addAll(dataUrlsToCache));
      })
      .then(() => {
        console.log('[SW] Instalación completa, saltando espera...');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Error en instalación:', err);
      })
  );
});

// ============================================================
// ACTIVATE - Limpiar cachés antiguas y notificar al cliente
// ============================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguas
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('formsbiblicos-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Eliminando caché antigua:', name);
              return caches.delete(name);
            })
        );
      }),
      // Tomar control de todos los clientes
      self.clients.claim()
        .then(() => {
          console.log('[SW] Activado y controlando clientes');
          // Notificar a todos los clientes que hay una nueva versión
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATE_AVAILABLE',
              version: CACHE_VERSION,
              features: [
                '✅ Nuevo sistema de memorización',
                '✅ Mejoras en exámenes',
                '✅ Sincronización offline'
              ],
              fixes: [
                '🐛 Corrección de errores en el editor de huecos',
                '🐛 Mejora en la navegación móvil'
              ],
              performance: [
                '⚡ Carga más rápida',
                '⚡ Menos consumo de memoria'
              ]
            });
          });
        })
    ])
  );
});

// ============================================================
// MESSAGE - Escuchar mensajes del cliente
// ============================================================

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Saltando espera por solicitud del cliente');
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  // Precargar en segundo plano los recursos de la nueva versión (actualización silenciosa)
  if (event.data?.type === 'PRECACHE_UPDATE') {
    console.log('[SW] Precargando recursos de actualización en segundo plano...');
    _precacheUpdate();
  }
});

// Descargar en background todos los recursos estáticos para que al recargar sea instantáneo
function _precacheUpdate() {
  const todos = [...urlsToCache, ...dataUrlsToCache];
  caches.open(CACHE_NAME).then((cache) => {
    todos.forEach((url) => {
      fetch(url, { cache: 'no-store' })
        .then((res) => { if (res && res.ok) cache.put(url, res); })
        .catch(() => {});
    });
  }).catch(() => {});
}

// ============================================================
// FETCH - Estrategias de caché inteligentes
// ============================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ============================================================
  // 1. API DE SUPABASE - Network First con fallback a caché
  // ============================================================
  if (url.hostname.includes('supabase') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cachear respuestas exitosas
          if (response.ok) {
            const clone = response.clone();
            caches.open('formsbiblicos-api').then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] API desde caché:', url.pathname);
              return cached;
            }
            // Si no hay caché, devolver error 503
            return new Response(
              JSON.stringify({ error: 'offline', message: 'Sin conexión a internet' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // ============================================================
  // 2. ASSETS ESTÁTICOS (CSS, JS, imágenes) - Cache First
  // ============================================================
  if (request.url.match(/\.(css|js|json|png|svg|jpg|jpeg|webp|woff2|ttf)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Actualizar en segundo plano (stale-while-revalidate)
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open('formsbiblicos-assets').then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open('formsbiblicos-assets').then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // ============================================================
  // 2b. IMÁGENES (fotos de perfil, storage de Supabase) - Cache First
  // ============================================================
  if (request.destination === 'image' || url.pathname.includes('/storage/v1/object/')) {
    event.respondWith(
      caches.open('formsbiblicos-images').then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
        });
      })
    );
    return;
  }

  // ============================================================
  // 3. PÁGINAS HTML - Network First con fallback offline
  // ============================================================
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open('formsbiblicos-pages').then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] Página desde caché:', url.pathname);
              return cached;
            }
            return caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // ============================================================
  // 4. DATOS JSON - Network First con caché
  // ============================================================
  if (request.url.match(/\/data\/.*\.json$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open('formsbiblicos-data').then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // ============================================================
  // 5. DEFAULT - Network First
  // ============================================================
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});