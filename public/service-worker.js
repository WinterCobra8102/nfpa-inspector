// Configuración de Caché para Mapas Offline
const CACHE_NAME = 'tletl-map-cache-v1';
const MAP_URLS = [
  'https://a.tile.openstreetmap.org/',
  'https://b.tile.openstreetmap.org/',
  'https://c.tile.openstreetmap.org/'
];

self.addEventListener('fetch', (event) => {
  // ==============================================================
  // EXCEPCIÓN CRÍTICA: Dejar pasar los PDFs directamente a la red
  // ==============================================================
  if (event.request.url.includes('/docs/')) {
    // Al usar "return" aquí, el Service Worker ignora la petición 
    // y el navegador la descarga de forma normal y nativa.
    return; 
  }

  // Lógica original para guardar los mapas de OpenStreetMap
  if (MAP_URLS.some(url => event.request.url.startsWith(url))) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Retorna la imagen cacheada o búscala en la red y guárdala
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});