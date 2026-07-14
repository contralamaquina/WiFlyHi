// Service worker de WiflyHi.
// Objetivo único: dejar la app instalable y disponible offline para abrirla,
// SIN tocar el test de velocidad (que necesita red real, no caché).
const CACHE_NAME = 'panel-senal-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo maneja pedidos GET del mismo origen (el cascarón de la app).
  // Todo lo demás (test de velocidad a speed.cloudflare.com, Google Fonts, etc.)
  // pasa directo a la red, sin caché, para no distorsionar ninguna medición.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => cached);
      // Cache-first para que abra instantáneo; se actualiza en segundo plano.
      return cached || network;
    })
  );
});
