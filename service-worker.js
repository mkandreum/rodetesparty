// Service Worker para Rodetes Party PWA
// IMPORTANTE: Incrementar VERSION cada vez que actualices la web
const VERSION = 'v1.0.1';
const CACHE_NAME = `rodetes-party-${VERSION}`;

// Recursos críticos para cachear (solo recursos propios, no CDN externos)
const CRITICAL_ASSETS = [
    '/',
    '/index.php',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Instalación: Cachear recursos críticos
self.addEventListener('install', (event) => {
    console.log(`[SW] Instalando Service Worker ${VERSION}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando recursos críticos');
                return cache.addAll(CRITICAL_ASSETS);
            })
            .then(() => self.skipWaiting()) // Activar inmediatamente
            .catch((error) => {
                console.error('[SW] Error al cachear recursos:', error);
            })
    );
});

// Activación: Limpiar cachés antiguos
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activando Service Worker ${VERSION}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('rodetes-party-') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log(`[SW] Eliminando caché antigua: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Tomar control inmediatamente
    );
});

// Fetch: Estrategia híbrida de caché
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // No cachear solicitudes POST (save.php, login.php, etc.)
    if (request.method !== 'GET') {
        return;
    }

    // Estrategia Network First para HTML y PHP (datos frescos)
    if (
        request.url.includes('.php') ||
        request.headers.get('accept')?.includes('text/html')
    ) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Guardar en caché si la respuesta es válida
                    if (response.ok) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback a caché si no hay red
                    return caches.match(request).then((cached) => {
                        if (cached) {
                            console.log(`[SW] Sirviendo desde caché (offline): ${url.pathname}`);
                            return cached;
                        }
                        // Si no hay caché, devolver página de error offline
                        return new Response(
                            '<h1 style="font-family:monospace;text-align:center;margin-top:20vh;">⚠️ Sin conexión</h1><p style="text-align:center;">Rodetes Party necesita conexión a internet para esta acción.</p>',
                            { headers: { 'Content-Type': 'text/html' } }
                        );
                    });
                })
        );
        return;
    }

    // Estrategia Cache First para assets estáticos (CSS, JS, imágenes)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                console.log(`[SW] Sirviendo desde caché: ${url.pathname}`);
                // Actualizar en background
                fetch(request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response);
                        });
                    }
                }).catch(() => { }); // Ignorar errores de actualización en background
                return cached;
            }

            // Si no está en caché, descargar de la red
            return fetch(request).then((response) => {
                if (response.ok) {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clonedResponse);
                    });
                }
                return response;
            });
        })
    );
});

// Manejo de mensajes (para forzar actualización si es necesario)
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
