// Service Worker для Zavkhoz OS PWA
const CACHE_NAME = 'zavkhoz-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Установка Service Worker v5');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование статических ресурсов');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('[SW] Ошибка кэширования:', err);
          // Не прерываем установку если какой-то ресурс не загрузился
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Активация Service Worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - стратегия Network First для API, Cache First для статики
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к Google Apps Script API (всегда идем в сеть)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Для статических ресурсов используем Cache First
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          console.log('[SW] Возврат из кэша:', request.url);
          return response;
        }

        console.log('[SW] Загрузка из сети:', request.url);
        return fetch(request).then(response => {
          // Кэшируем успешные GET запросы
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          if (request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        });
      })
      .catch(err => {
        console.error('[SW] Ошибка fetch:', err);
        // Возвращаем офлайн страницу если есть
        return caches.match('/index.html');
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
