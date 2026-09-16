// Shopka Admin Service Worker
// Sirf admin routes cache karta hai — customer site untouched

const CACHE = "shopka-admin-v1";

const PRECACHE = [
  "/admin",
  "/admin/orders",
  "/admin/products",
  "/offline.html",
];

// Install — pre-cache shell pages
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache for admin routes
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Only handle /admin routes + same origin
  if (!url.pathname.startsWith("/admin") || url.origin !== self.location.origin) return;

  // API calls — network only, never cache
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache fresh page responses
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(
          (cached) => cached || caches.match("/offline.html")
        )
      )
  );
});
