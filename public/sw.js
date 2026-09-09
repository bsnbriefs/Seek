const CACHE = 'seek-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png', '/pwa-192.png', '/pwa-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Seek', body: 'You have a new Seek update.', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Seek', {
      body: payload.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
