const CACHE_NAME = 'mjfood-cache-v5.3';
const rutaBase = '/';

const ASSETS_TO_CACHE = [
  rutaBase,
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://back.vinapp.co//store/1000x500245093-2025-08-06-16-47-12.webp',
  'https://back.vinapp.co//store/200x117240923-2025-08-06-16-47-12.webp',
  'https://back.vinapp.co//store/1000x500259933-2025-08-06-16-48-37.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Algunos recursos no se pudieron cachear proactivamente:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  
  if (
    url.pathname.startsWith('/admin') || 
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/api/') ||
    url.pathname === '/logout'
  ) {
    return;
  }
  
  if (url.pathname === '/' || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request, { ignoreSearch: true });
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match(rutaBase);
        }
        return null;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'MJFOOD', body: event.data.text() };
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/assets/icon/144.png',
    image: data.image || null,
    badge: data.image || null,
    data: data.data || { url: rutaBase }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MJFOOD', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || rutaBase)
  );
});