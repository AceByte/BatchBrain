/* ══════════════════════════════════════════════
   BATCHBRAIN — Service Worker
   Offline-First PWA with Cache Strategies
   ══════════════════════════════════════════════ */

const CACHE_NAME = 'batchbrain-v2.1.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/modules/cocktails.js',
    '/modules/inventory.js',
    '/modules/specsheet.js',
    '/modules/quick-count.js',
    '/modules/mobile.js',
    '/data.json',
    '/manifest.json'
];

const CDN_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Skip waiting');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Cache failed:', err);
            })
    );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch: Cache strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Strategy 1: Network First for API calls
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Strategy 2: Cache First for static assets
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Strategy 3: Stale While Revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
});

// Cache Strategies

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, falling back to cache');
        const cached = await caches.match(request);
        if (cached) return cached;

        // Return offline fallback for API
        if (request.url.includes('/api/data')) {
            return new Response(
                JSON.stringify({ offline: true, message: 'Working offline' }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                }
            );
        }

        throw error;
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        // Revalidate in background
        fetch(request).then((response) => {
            if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, response);
                });
            }
        }).catch(() => { });
        return cached;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
            });
        }
        return networkResponse;
    }).catch(() => cached);

    return cached || fetchPromise;
}

function isStaticAsset(url) {
    const staticExts = ['.js', '.css', '.html', '.json', '.png', '.jpg', '.svg', '.woff2'];
    return staticExts.some((ext) => url.pathname.endsWith(ext));
}

// Background Sync for offline mutations
self.addEventListener('sync', (event) => {
    if (event.tag === 'batchbrain-sync') {
        console.log('[SW] Background sync triggered');
        event.waitUntil(processSyncQueue());
    }
});

async function processSyncQueue() {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
        client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
    });
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'Batchbrain', {
            body: data.body || 'Low stock alert',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: data.tag || 'low-stock',
            requireInteraction: true,
            actions: [
                { action: 'view', title: 'View Inventory' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            self.clients.openWindow('/#section-inventory')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});