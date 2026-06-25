self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Just a pass-through to satisfy PWA requirements
  // without risking cache.addAll failures.
  event.respondWith(fetch(event.request).catch(() => new Response("Offline")));
});
