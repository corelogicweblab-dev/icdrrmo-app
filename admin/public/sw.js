/* ICDRRMO Operation Center PWA · v2026-05-09 — bump comment to force SW update checks */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/") || event.request.url.includes("socket.io")) {
    return;
  }
  event.respondWith(fetch(event.request));
});
