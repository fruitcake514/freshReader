// v8 — Cloudflare Pages + iOS-safe PWA SW
const CACHE = 'freshrss-pwa-v8';

// Canonical app shell URL for Pages
const SHELL_URL = new URL('/', self.location.origin).toString();

const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-120.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-167.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Precache only the canonical root shell
    try {
      const shellRes = await fetch(SHELL_URL, {
        cache: 'no-store',
        redirect: 'follow',
      });

      // iOS-safe: only cache a clean non-redirect 200 response
      if (shellRes.ok && shellRes.status === 200 && !shellRes.redirected) {
        await cache.put(SHELL_URL, shellRes.clone());
      }
    } catch (_) {}

    // Precache static assets
    await cache.addAll(STATIC_ASSETS);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only GET
  if (req.method !== 'GET') return;

  // Skip FreshRSS API / auth
  if (
    url.pathname.includes('/api/greader') ||
    url.pathname.includes('/accounts/ClientLogin')
  ) {
    return;
  }

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.headers.get('accept')?.includes('text/html');

  // ----------------------------
  // HTML / APP NAVIGATION
  // ----------------------------
  if (isNavigation) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);

      try {
        const res = await fetch(req, {
          cache: 'no-store',
          redirect: 'follow',
        });

        // Never return redirects for document navigations on iOS
        if (
          !res ||
          res.redirected ||
          (res.status >= 300 && res.status < 400)
        ) {
          const shell = await cache.match(SHELL_URL);
          if (shell && !shell.redirected) return shell;
          return new Response('Offline', { status: 503 });
        }

        return res;
      } catch (_) {
        const shell = await cache.match(SHELL_URL);
        if (shell && !shell.redirected) return shell;

        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })());
    return;
  }

  // ----------------------------
  // STATIC ASSETS ONLY
  // ----------------------------
  const isStaticAsset =
    req.destination === 'script' ||
    req.destination === 'style' ||
    req.destination === 'image' ||
    req.destination === 'font' ||
    req.destination === 'manifest';

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);

        if (res.ok && res.status === 200 && !res.redirected) {
          const clone = res.clone();
          const cache = await caches.open(CACHE);
          cache.put(req, clone);
        }

        return res;
      } catch (_) {
        return new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
});
