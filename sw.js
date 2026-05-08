/**
 * ClearTalk Service Worker
 * 提供离线支持和资源缓存
 */

const CACHE_NAME = 'cleartalk-v2';
const BASE_PATH = new URL('./', self.location).pathname;
const STATIC_ASSETS = [
    BASE_PATH,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}styles.css`,
    `${BASE_PATH}app.js`,
    `${BASE_PATH}manifest.json`
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] 缓存静态资源');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] 安装完成');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] 缓存失败:', err);
            })
    );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] 删除旧缓存:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] 激活完成');
                return self.clients.claim();
            })
    );
});

// 拦截请求：优先网络，离线时回退到缓存
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 跳过非 GET 请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 跳过后端 API 请求
    if (url.pathname.startsWith('/api/') || url.port === '3000') {
        return;
    }

    // 跳过 Vite dev client 虚拟模块，避免缓存导致的 __DEFINES__ 报错
    if (url.pathname.startsWith('/@vite/')) {
        return;
    }
    
    // 跳过 chrome-extension 等浏览器扩展请求
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        fetch(request)
            .then((response) => {
                // 成功获取，更新缓存
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // 网络失败，尝试从缓存获取
                console.log('[SW] 网络失败，尝试缓存:', url.pathname);
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // 缓存也没有，返回离线页面
                        if (request.mode === 'navigate') {
                            return caches.match(`${BASE_PATH}index.html`);
                        }
                        return new Response('离线中，请检查网络连接', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// 后台同步（可选：用于离线时提交的数据）
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-feedback') {
        event.waitUntil(syncFeedbackData());
    }
});

// 推送通知（可选）
self.addEventListener('push', (event) => {
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png'
        })
    );
});

// 辅助函数：同步反馈数据
async function syncFeedbackData() {
    // 这里可以实现离线反馈的同步逻辑
    console.log('[SW] 同步反馈数据');
}
