const CACHE_NAME = 'zavkhoz-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpg'
];

// Установка Service Worker и кэширование статики
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Активация и очистка старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Обязательный перехватчик fetch для работы WebAPK (Android PWA)
self.addEventListener('fetch', event => {
  // Пропускаем POST запросы (API), кэшируем только GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша, если есть, иначе делаем сетевой запрос
        return response || fetch(event.request).catch(() => {
          // Если сеть недоступна, пытаемся отдать index.html для навигации
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Обработка сообщений от клиента (принудительное обновление)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
