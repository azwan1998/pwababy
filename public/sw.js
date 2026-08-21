const CACHE_NAME = 'pwababy-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network First Strategy untuk JS & API agar selalu memuat kode terbaru dari Vercel
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || event.request.url.includes('_next') || event.request.url.includes('.js')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) || caches.match('/'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});
