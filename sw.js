// Service Worker - Estrategia Cache First
// Autor: Juan José Díaz Barroso

const NOMBRE_CACHE = 'inspeccion-pwa-v1';

const RECURSOS_PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación: precachear los recursos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(RECURSOS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: eliminar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave !== NOMBRE_CACHE)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Cache First, con respaldo a la red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((respuestaCache) => {
        if (respuestaCache) {
          return respuestaCache;
        }
        return fetch(event.request)
          .then((respuestaRed) => {
            if (respuestaRed && respuestaRed.ok && respuestaRed.type === 'basic') {
              const copia = respuestaRed.clone();
              caches.open(NOMBRE_CACHE).then((cache) => cache.put(event.request, copia));
            }
            return respuestaRed;
          });
      })
      .catch(() => caches.match('./index.html'))
  );
});
