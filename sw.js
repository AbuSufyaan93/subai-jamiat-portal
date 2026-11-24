
const CACHE_NAME = 'sjahm-ilmi-pwa-v12';
const PRECACHE_ASSETS = [
  './',
  './search/',
  './api/global-search-index.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first with seamless offline scholarly fallback cache
  event.respondWith(
    fetch(event.request)
      .then(networkRes => {
        if (networkRes && networkRes.status === 200 && (url.pathname.includes('/search') || url.pathname.includes('/ilmi-muawin') || url.pathname.endsWith('.json') || url.pathname.endsWith('.ttf') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.css'))) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return networkRes;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./search/')))
  );
});
