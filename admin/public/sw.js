/* ICDRRMO Operation Center PWA · v2026-05-21-smart-v3 — bump to force clients off stale SW */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/") || event.request.url.includes("socket.io")) {
    return;
  }
  event.respondWith(fetch(event.request));
});

/** Push / notification deep-link into ops incidents (payload: incidentId or url). */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path =
    typeof data.url === "string" && data.url.startsWith("/")
      ? data.url
      : data.incidentId
        ? `/ops/incidents?focus=${encodeURIComponent(String(data.incidentId))}`
        : "/ops/incidents";
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.openWindow
      ? self.clients.openWindow(targetUrl).catch(() => undefined)
      : Promise.resolve(),
  );
});
