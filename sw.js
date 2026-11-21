// Bump CACHE_NAME on every release. The browser byte-compares this file to
// decide whether a new service worker exists at all, so changing this string
// is what tells already-installed copies of the app to update.
const CACHE_NAME = 'bearing-v13';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=13',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Don't wait for every old tab/window to close -- take over right away.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Start controlling already-open pages immediately; index.html listens for
  // this takeover and reloads once so the new version actually runs.
  self.clients.claim();
});

// Network-first for same-origin requests, falling back to the cache only when
// offline. `cache: 'no-cache'` makes the browser revalidate with the server
// instead of trusting its own HTTP cache -- GitHub Pages marks files as
// cacheable for ~10 minutes, which otherwise could hand back a stale app.js
// right after an update. Cross-origin CDN requests (Tailwind/React) go
// straight to the network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
