const CACHE_NAME = 'rodetes-party-v1.0.3'; // Incrementado
const urlsToCache = [
    './index.php',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Opened cache');
                // Cache files one by one to catch and log errors
                const cachePromises = urlsToCache.map(url => {
                    return cache.add(url).catch(err => {
                        console.error('[SW] Failed to cache file:', url, err);
                        // Optional: throw err if you want to abort the entire install on one failure
                        // throw err; 
                    });
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
    // Ignorar requests de chrome-extension, etc.
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Network success: return response and update cache
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Clone response for cache
                const responseToCache = networkResponse.clone();

                // Cache static assets (CSS, JS, Images), ignore API-like calls if needed
                // En este caso, cacheamos todo lo que sea exitoso del mismo origen
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return networkResponse;
            })
            .catch(() => {
                // Network failure: fallback to cache (Offline Mode)
                console.log('[SW] Network failed, serving from cache:', event.request.url);
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
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});
