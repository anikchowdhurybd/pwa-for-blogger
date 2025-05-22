// sw.js - Service Worker File Content
const CACHE_NAME = 'schemamarkupgenerator-cache-v1'; // Updated cache name
const urlsToCache = [
  '/', // Your homepage
  // Create an 'offline.html' page in Blogger.
  // Get its URL (e.g., /p/offline.html or /offline.html if it's a root page) and put it here.
  '/p/offline.html', // Example: Replace with your actual offline page URL on schemamarkupgenerator.net
  // Add other essential assets if needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Opened cache');
        // Ensure requests are made with 'reload' to bypass HTTP cache during install
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('Service Worker: App shell cached successfully');
        return self.skipWaiting(); // Activate new SW immediately
      })
      .catch(err => console.error('Service Worker: Cache addAll failed during install:', err))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim(); // Take control of all clients
    })
  );
});

self.addEventListener('fetch', event => {
  // Let browser handle non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response; // Serve from cache
        }
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Optional: Cache new successful GET requests dynamically
            // Be careful what you cache here to avoid filling up storage.
            // Example: if (networkResponse && networkResponse.status === 200 && !event.request.url.includes('google-analytics')) {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            // }
            return networkResponse;
          })
          .catch(() => {
            // If fetch fails (offline) and it's a navigation request, show offline page
            if (event.request.mode === 'navigate') {
              console.log('Service Worker: Serving offline page for navigation failure.');
              return caches.match('/p/offline.html'); // Must match your offline page URL
            }
          });
      })
  );
});
