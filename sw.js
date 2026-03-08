const CACHE_NAME = 'zavhoz-pwa-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.webp'
];

// Установка Service Worker и кэширование статики
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Используем Promise.allSettled для кэширования, чтобы ошибка одного файла не ломала весь SW
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url, err)))
        );
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
