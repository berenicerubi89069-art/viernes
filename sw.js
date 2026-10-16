// ==============================================================================
// SERVICE WORKER - VIERNES PWA
// ==============================================================================
const CACHE_NAME = 'viernes-shell-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './jarvis.ico'
];

// 1. Instalación: cachear el cascarón estático de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar cachés obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Fetch:
// - Peticiones a Gemini API o Puente local: SIEMPRE directas a la Red (sin pasar por caché).
// - Recursos de la interfaz: Cache-First con respaldo de red.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar API de Google y puertos locales del puente
  if (url.hostname.includes('googleapis.com') || url.hostname === '127.0.0.1' || url.port === '18820') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cachear solo recursos estáticos exitosos del propio origen
        if (networkResponse.ok && event.request.method === 'GET' && url.origin === location.origin) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    }).catch(() => {
      // Si falla la red y está pidiendo navegación, devolver index.html
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
