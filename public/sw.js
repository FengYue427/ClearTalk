/**
 * ClearTalk Service Worker
 * 提供离线缓存支持
 */

const CACHE_NAME = 'cleartalk-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/main.js'
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // 静默失败，不影响应用运行
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 网络优先，失败时回退缓存
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求和Chrome扩展请求
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // API请求不走缓存
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功响应，更新缓存
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试缓存
        return caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // 缓存也没有，返回离线页面
          if (event.request.mode === 'navigate') {
            return new Response(
              '<h1>离线模式</h1><p>请连接网络后重试</p>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
          throw new Error('Network and cache both failed');
        });
      })
  );
});
