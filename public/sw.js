const CACHE_NAME = "seek-shell-v3";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("seek-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Keep navigations fresh so authenticated pages and SPA routes are not
  // trapped in an old cached HTML response.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedRoot = await caches.match("/");
        return cachedRoot || Response.error();
      })
    );
    return;
  }

  // Cache only static same-origin assets; never cache API/auth/payment data.
  if (/\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || network;
      })
    );
  }
});
