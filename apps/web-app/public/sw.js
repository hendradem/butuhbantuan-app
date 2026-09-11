// ButuhBantuan Service Worker
// - Handles Web Push notifications for ticket updates.
// - Persists map tiles with a cache-first strategy so zoom-out doesn't
//   re-download tiles the user has already seen this session (or previous).

const TILE_CACHE = "bb-map-tiles-v1";
const TILE_CACHE_MAX_ENTRIES = 800; // ~800 tiles ≈ 20–40 MB depending on style
const TILE_HOST_RE = /(^https:\/\/[a-d]?\.?basemaps\.cartocdn\.com\/)|(^https:\/\/[a-c]?\.?tile\.openstreetmap\.org\/)/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop stale caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== TILE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function trimTileCache() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  const overflow = keys.length - TILE_CACHE_MAX_ENTRIES;
  if (overflow <= 0) return;
  // FIFO trim — first N entries dropped.
  await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)));
}

async function tileCacheFirst(request) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone()).then(trimTileCache).catch(() => {});
    }
    return res;
  } catch {
    // Offline & no cache — let the browser show its default failure.
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!TILE_HOST_RE.test(req.url)) return;
  event.respondWith(tileCacheFirst(req));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "ButuhBantuan", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ButuhBantuan", {
      body: data.body || "Status tiket kamu diperbarui.",
      icon: "/ambulance-logo.jpg",
      badge: "/ambulance-logo.jpg",
      tag: "ticket-update",
      renotify: true,
      data: { url: self.location.origin },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
