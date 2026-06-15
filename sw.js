const CACHE_NAME = 'eisei-suite-v2';
const ASSETS = [
  './',
  './index.html',
  './drill.html',
  './quiz.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// ネットワーク優先で取得すべきもの（更新が起きるファイル）
// HTML と manifest は常に最新をネットから取り、失敗時のみキャッシュへフォールバック
function isNetworkFirst(request) {
  const url = new URL(request.url);
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.webmanifest')
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('eisei-suite-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isNetworkFirst(event.request)) {
    // network-first: まずネットから取得 → 成功したらキャッシュも更新
    //                失敗（オフライン）したらキャッシュを返す
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached => cached || caches.match('./index.html'))
        )
    );
  } else {
    // cache-first: 不変アセット（アイコン等）はキャッシュ優先で高速＆省通信
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached ||
        fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
      )
    );
  }
});
