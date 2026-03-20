// v5 — cache index.html for offline; stale-while-revalidate for the app shell
const CACHE = 'freshrss-pwa-v5';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-120.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Never intercept FreshRSS API calls — always live, fall through on failure
  if (url.pathname.includes('/api/greader') || url.pathname.includes('/accounts/ClientLogin')) return;

  // Never intercept cross-origin requests (images, fonts, video CDNs)
  if (url.origin !== self.location.origin) return;

  // For navigation (page load) and HTML files: stale-while-revalidate.
  // Serve from cache immediately so the app opens offline, update in background.
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match('./index.html').then(cached => {
          const networkFetch = fetch(req).then(res => {
            if (res.ok && res.status === 200) cache.put('./index.html', res.clone());
            return res;
          }).catch(() => cached); // network failed — cached already returned
          // Return cache immediately; update in background
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Cache-first for all other same-origin static assets (icons, manifest)
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && res.status === 200 && req.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
