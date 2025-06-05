// sw.js - Service Worker optimizado para archivos específicos

const CACHE_NAME = 'pension-app-v2.1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/utm-api.js',
  '/calculadora.html',
  '/pagos.html',
  '/historial.html',
  '/manifest.json',
  // Íconos que SÍ existen
  '/icons/icon-48x48.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('💾 SW: Instalando versión 2.0...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('💾 SW: Cacheando archivos específicos...');
        
        // Cachear archivos uno por uno con mejor manejo de errores
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url)
              .then(() => {
                console.log(`✅ SW: Cacheado exitosamente: ${url}`);
              })
              .catch(error => {
                console.warn(`⚠️ SW: No se pudo cachear: ${url}`, error.message);
              });
          })
        );
      })
      .then(() => {
        console.log('✅ SW: Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SW: Error en instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('🔄 SW: Activando versión 2.0...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguos
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ SW: Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las páginas
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ SW: Activación completada');
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', function(event) {
  // Solo manejar peticiones GET de nuestro dominio
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          console.log('📦 SW: Desde caché:', event.request.url);
          return cachedResponse;
        }
        
        // Si no está en caché, intentar obtener de la red
        console.log('🌐 SW: Desde red:', event.request.url);
        
        return fetch(event.request)
          .then(function(networkResponse) {
            // Verificar que la respuesta sea válida
            if (!networkResponse || networkResponse.status !== 200) {
              console.warn(`⚠️ SW: Respuesta inválida para: ${event.request.url} (${networkResponse?.status})`);
              return networkResponse;
            }
            
            // Solo cachear si es un recurso importante y la respuesta es exitosa
            if (shouldCache(event.request.url) && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                  console.log(`💾 SW: Nuevo archivo cacheado: ${event.request.url}`);
                })
                .catch(function(error) {
                  console.warn(`⚠️ SW: Error cacheando: ${event.request.url}`, error.message);
                });
            }
            
            return networkResponse;
          })
          .catch(function(error) {
            console.error(`❌ SW: Error de red para: ${event.request.url}`, error.message);
            
            // Para páginas HTML, mostrar página offline
            if (event.request.destination === 'document') {
              return caches.match('/')
                .then(response => {
                  return response || createOfflinePage();
                });
            }
            
            // Para otros recursos, devolver respuesta vacía
            return new Response('', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// Función para decidir qué cachear
function shouldCache(url) {
  const cacheableExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.svg'];
  const cacheablePaths = ['/icons/', '/css/', '/js/'];
  
  return cacheableExtensions.some(ext => url.includes(ext)) ||
         cacheablePaths.some(path => url.includes(path));
}

// Crear página offline simple
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sin conexión - Pensión UTM</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                min-height: 100vh; 
                margin: 0; 
            }
            .container { 
                background: rgba(255,255,255,0.1); 
                padding: 40px; 
                border-radius: 20px; 
                backdrop-filter: blur(10px); 
                display: inline-block; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔌 Sin conexión</h1>
            <p>No hay conexión a internet, pero la app funciona offline.</p>
            <button onclick="window.location.reload()">🔄 Reintentar</button>
        </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Manejo de mensajes
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 SW: Forzando actualización...');
    self.skipWaiting();
  }
});

console.log('📱 Service Worker v2.0 cargado - Optimizado para archivos específicos');