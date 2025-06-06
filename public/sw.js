// sw.js - Service Worker con versión actualizada

const CACHE_NAME = 'pension-utm-v2.3'; // ← CAMBIAR VERSIÓN PARA FORZAR ACTUALIZACIÓN

// Archivos a cachear
const urlsToCache = [
    '/',
    '/index.html',
    '/calculadora.html', 
    '/pagos.html',
    '/historial.html',
    '/backup.html',
    '/configuracion.html',
    '/css/styles.css',
    '/css/mobile-nav.css',
    '/js/app.js',
    '/js/utm-api.js',        // ← Forzar recarga de este archivo
    '/js/backup-system.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Instalación del service worker
self.addEventListener('install', event => {
    console.log('📦 SW: Instalando versión v2.3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 SW: Cacheando archivos...');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('✅ SW: Archivos cacheados exitosamente');
                // Forzar activación inmediata
                return self.skipWaiting();
            })
    );
});

// Activación del service worker
self.addEventListener('activate', event => {
    console.log('🔄 SW: Activando versión v2.3...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Eliminar cachés antiguos
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ SW: Eliminando caché antiguo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ SW: Activación completada');
            // Tomar control inmediato de todas las páginas
            return self.clients.claim();
        })
    );
});

// Interceptar requests
self.addEventListener('fetch', event => {
    // Solo manejar requests GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Para utm-api.js, siempre intentar red primero durante las primeras horas
    if (event.request.url.includes('/js/utm-api.js')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        console.log('🌐 SW: utm-api.js desde red (actualizado)');
                        // Guardar en caché la nueva versión
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    }
                    throw new Error('Network response not ok');
                })
                .catch(() => {
                    console.log('📦 SW: utm-api.js desde caché (fallback)');
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para otros archivos, estrategia cache-first normal
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('📦 SW: Desde caché:', event.request.url);
                    return response;
                }

                console.log('🌐 SW: Desde red:', event.request.url);
                return fetch(event.request).then(response => {
                    // Solo cachear responses válidas
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                            console.log('💾 SW: Nuevo archivo cacheado:', event.request.url);
                        });

                    return response;
                });
            })
    );
});