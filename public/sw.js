const CACHE_NAME = 'pwababy-v3';
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

// Intercept HANYA request GET lokal http/https (Jangan cegat Supabase / Non-GET)
self.addEventListener('fetch', (event) => {
  // Abaikan non-GET dan non-HTTP (misal chrome-extension atau POST/PUT)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Abaikan request ke Supabase API / Websocket
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || (await caches.match('/')) || new Response('Offline');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
