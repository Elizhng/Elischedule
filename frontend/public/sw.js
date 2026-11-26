const CACHE_NAME = 'elischedule-shell-v4';

function scopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', (event) => {
  const coreAssets = [
    scopeUrl('./'),
    scopeUrl('./index.html'),
    scopeUrl('./manifest.webmanifest'),
    scopeUrl('./icon.svg'),
  ];
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(coreAssets))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(scopeUrl('./index.html'), clone));
          return response;
        })
        .catch(() => caches.match(scopeUrl('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
