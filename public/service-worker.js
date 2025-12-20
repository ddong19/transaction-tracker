// Update this version whenever you want to force a cache refresh
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `spending-tracker-${CACHE_VERSION}`;

// Install event - skip caching on install, we'll cache on fetch instead
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          // Delete all caches that don't match current version
          return cacheName.startsWith('spending-tracker-') && cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first, fallback to cache (better for dynamic apps)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and non-GET requests
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls - always fetch fresh
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();

        // Cache static assets (JS, CSS, images, fonts, manifest)
        if (
          request.url.includes('/assets/') ||
          request.url.includes('/icons/') ||
          request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|json)$/) ||
          request.url.endsWith('/manifest.json') ||
          request.url.endsWith('/index.html') ||
          request.url === url.origin + '/'
        ) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If requesting a page, return the cached index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }

          // No cached version available
          return new Response('Offline - content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
