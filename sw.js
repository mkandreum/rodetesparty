const CACHE_NAME = 'rodetes-party-v16';
const urlsToCache = [
    './',
    './index.php',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('Opened cache');
                // Cache files individually to identify failures
                const cachePromises = urlsToCache.map(async (url) => {
                    try {
                        await cache.add(url);
                        console.log('✅ Cached:', url);
                    } catch (error) {
                        console.error('❌ Failed to cache:', url, error);
                    }
                });
                return Promise.all(cachePromises);
            })
    );
    self.skipWaiting();
});

// Fetch event - Network First Strategy (Prioritize fresh content)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Network success: return response and update cache
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Clone response for cache
                const responseToCache = networkResponse.clone();

                // Cache static assets, ignore API
                if (!event.request.url.includes('/api/')) {
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }

                return networkResponse;
            })
            .catch(() => {
                // Network failure: fallback to cache (Offline Mode)
                console.log('Network failed, serving from cache:', event.request.url);
                return caches.match(event.request);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});
