// v6 — iOS PWA safe: network-first for navigations, cache-first for assets
// Key fix: never respondWith() a redirected response — Safari/iOS rejects these
// with "response served by service worker has redirections" on PWA relaunch.
const CACHE = 'freshrss-pwa-v6';
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

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Fetch each precache asset explicitly with cache:'reload' so we never
      // store a redirect-tainted response (the root cause of the iOS bug).
      await Promise.allSettled(
        PRECACHE.map(async url => {
          try {
            const res = await fetch(url, { cache: 'reload', redirect: 'error' });
            if (res.ok) await cache.put(url, res);
          } catch (_) {
            // Asset unavailable at install time — skip silently, SW still installs.
          }
        })
      );
      await self.skipWaiting();
    })
  );
});

// ── Activate: prune old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // 1. Never intercept FreshRSS API calls or auth — always live.
  if (
    url.pathname.includes('/api/greader') ||
    url.pathname.includes('/accounts/ClientLogin')
  ) return;

  // 2. Never intercept cross-origin requests (images, fonts, YouTube CDN, etc.)
  //    Returning a redirect here is what triggers the iOS Safari error.
  if (url.origin !== self.location.origin) return;

  // 3. Navigation requests (the page itself) — NETWORK-FIRST with cache fallback.
  //    This is the critical iOS PWA fix:
  //    - Network-first ensures a fresh, non-redirected response on relaunch.
  //    - redirect:'error' means we NEVER hand Safari a redirected response.
  //    - Cache fallback keeps the app working offline.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          // Always try the network first for navigations.
          // redirect:'error' throws if the server redirects — preventing the iOS bug.
          const res = await fetch('./index.html', {
            cache: 'no-cache',
            redirect: 'error',
          });
          // Only cache clean 200 OK responses — never cache redirects.
          if (res.ok && res.status === 200) {
            await cache.put('./index.html', res.clone());
          }
          return res;
        } catch (_) {
          // Network failed or redirected — serve cached copy offline.
          const cached = await cache.match('./index.html');
          if (cached) return cached;
          // Last resort: plain offline message.
          return new Response(
            '<h1>Offline</h1><p>Please connect to the internet and try again.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  // 4. Same-origin static assets (icons, manifest) — cache-first, update in background.
  if (req.method !== 'GET') return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const networkPromise = fetch(req, { redirect: 'error' })
        .then(async res => {
          if (res.ok && res.status === 200) {
            const cache = await caches.open(CACHE);
            await cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      // Return cache immediately if available; revalidate in background.
      if (cached) {
        networkPromise.catch(() => {}); // fire-and-forget update
        return cached;
      }
      // Nothing cached — wait for network.
      const res = await networkPromise;
      return res || new Response('Offline', { status: 503 });
    })()
  );
});

// ── Message: respond to PING from index.html health-check ───────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'PING') {
    e.ports?.[0]?.postMessage({ type: 'PONG' });
  }
});
