/**
 * OpenBook Author — offline app shell service worker.
 * Caches the dashboard, editor shell, and static Next.js assets so the web
 * app loads without network. Book data lives in localStorage / .openbook files.
 */
const CACHE_NAME = "openbook-author-v1";
const SHELL_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isSkippableRequest(request) {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  return false;
}

function cacheResponse(cache, request, response) {
  if (!response.ok || response.type === "opaque") return;
  cache.put(request, response.clone());
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (isSkippableRequest(request)) return;

  const url = new URL(request.url);

  // AI and other API routes require network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Immutable Next.js build assets — cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => cacheResponse(cache, request, response));
            return response;
          })
      )
    );
    return;
  }

  // HTML navigations — network-first with shell fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => cacheResponse(cache, request, response));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Other static assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => cacheResponse(cache, request, response));
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
