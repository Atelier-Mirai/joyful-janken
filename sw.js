/*=========================================================================
  オフラインでも使えるよう、キャッシュを取得し、レスポンスする。
  =========================================================================*/
const CACHE_NAME = 'janken-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/game.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/apple-touch-icon-180x180.png',
  '/images/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('[Service Worker] インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] キャッシュにアセットを追加中...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] アクティベート中...');
  // 古いキャッシュを削除
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 古いキャッシュを削除中:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  // キャッシュしないリクエストを除外
  if (
    !event.request.url.startsWith(self.location.origin) ||
    event.request.method !== 'GET' ||
    event.request.url.includes('/sockjs-node/') ||
    event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // キャッシュがある場合はそれを返す
      if (cachedResponse) {
        return cachedResponse;
      }

      // キャッシュがなければネットワークから取得
      return fetch(event.request)
        .then((response) => {
          // レスポンスが有効でない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.error('[Service Worker] フェッチに失敗しました:', error);
          // オフラインページを返すなどのフォールバック処理をここに追加可能
        });
    })
  );
});

// メッセージイベントの処理（必要に応じて更新をチェック）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
