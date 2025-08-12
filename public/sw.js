const CACHE_NAME = 'fitness-command-v2';
const STATIC_CACHE_NAME = 'fitness-static-v2';
const DYNAMIC_CACHE_NAME = 'fitness-dynamic-v2';
const API_CACHE_NAME = 'fitness-api-v2';

// Static resources to cache immediately
const STATIC_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints to cache with strategies
const API_ENDPOINTS = [
  { pattern: '/get-analytics', strategy: 'stale-while-revalidate', ttl: 300000 },
  { pattern: '/get-workouts', strategy: 'network-first', ttl: 60000 },
  { pattern: '/goals', strategy: 'network-first', ttl: 180000 },
  { pattern: '/get-weights', strategy: 'network-first', ttl: 300000 }
];

// Cache size limits
const CACHE_LIMITS = {
  [STATIC_CACHE_NAME]: 50,
  [DYNAMIC_CACHE_NAME]: 100,
  [API_CACHE_NAME]: 200
};

// Utility functions
const cleanupCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
};

const isStale = (timestamp, ttl) => {
  return Date.now() - timestamp > ttl;
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME)
        .then(cache => cache.addAll(STATIC_URLS)),
      self.skipWaiting()
    ]).catch(error => {
      console.error('Installation failed:', error);
    })
  );
});

// Advanced fetch strategies
const networkFirst = async (request, cacheName, ttl) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = response.clone();
      cache.put(request, responseClone);
      return response;
    }
  } catch (error) {
    console.warn('Network failed, trying cache:', error);
  }
  
  const cached = await caches.match(request);
  return cached || new Response('Offline', { status: 503 });
};

const staleWhileRevalidate = async (request, cacheName, ttl) => {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const responseClone = response.clone();
      caches.open(cacheName).then(cache => {
        cache.put(request, responseClone);
      });
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
};

// Main fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with specific strategies
  if (url.pathname.includes('/.netlify/functions/')) {
    const endpoint = API_ENDPOINTS.find(ep => url.pathname.includes(ep.pattern));
    
    if (endpoint) {
      if (endpoint.strategy === 'network-first') {
        event.respondWith(networkFirst(request, API_CACHE_NAME, endpoint.ttl));
      } else if (endpoint.strategy === 'stale-while-revalidate') {
        event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME, endpoint.ttl));
      }
      return;
    }
  }
  
  // Handle static assets
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(STATIC_CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // Handle images with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
              cleanupCache(DYNAMIC_CACHE_NAME, CACHE_LIMITS[DYNAMIC_CACHE_NAME]);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // Handle documents (HTML)
  if (request.destination === 'document') {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE_NAME)
        .catch(() => caches.match('/'))
    );
    return;
  }
  
  // Default: try cache first, then network
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
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
});

// Background sync for workout data when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // This would sync any offline workout data when connection is restored
  console.log('Background sync triggered');
  return Promise.resolve();
}

// Push notifications (for future goal reminders)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Time for your workout!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Fitness Command Center', options)
  );
});