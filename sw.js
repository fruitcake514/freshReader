// v4 — never cache HTML; only cache icons/manifest; always network-first for navigation
const CACHE = 'freshrss-pwa-v4';

// Only pre-cache true static assets — no HTML files
const PRECACHE = [
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

  // NEVER intercept:
  // 1. Navigation requests (HTML page loads) — always hit network to avoid redirect errors on iOS
  if (req.mode === 'navigate') return;

  // 2. FreshRSS API calls — always live
  if (url.pathname.includes('/api/greader') || url.pathname.includes('/accounts/ClientLogin')) return;

  // 3. Anything cross-origin (external images, fonts, video CDNs)
  if (url.origin !== self.location.origin) return;

  // 4. HTML files — never cache, always network
  if (req.destination === 'document' || url.pathname.endsWith('.html')) return;

  // Cache-first for same-origin static assets (icons, manifest, etc.)
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && res.status === 200 && req.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
