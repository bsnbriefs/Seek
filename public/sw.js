const CACHE = 'seek-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/']).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'SEEK', body: 'You have a new SEEK update.', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SEEK', {
      body: payload.body || '',
      icon: '/seek-logo.png',
      badge: '/seek-logo.png',
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
