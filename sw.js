const CACHE_NAME = 'ultimate-decision-maker-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './decision-maker.html',
  './manifest.json',
  './favicon.svg',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// Install Event - Caching the app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first fallback to Cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/safe domains
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip browser extensions or Firebase live sockets (if any)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('identitytoolkit')) {
    // Let firestore SDK handle its own offline capabilities
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid network response, clone it and put it in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network failure
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page is requested, fallback to offline index/shell
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
