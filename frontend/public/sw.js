const CACHE_NAME = 'atter-v1';
const MAP_CACHE = 'atter-maps-v1';
const API_CACHE = 'atter-api-v1';

// Core app shell files to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
];

// Install - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ATTER Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Some shell files failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ATTER Service Worker');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== MAP_CACHE && key !== API_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch - smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Map tiles - cache first (tiles rarely change)
  if (url.hostname.includes('tile') || url.hostname.includes('carto') || url.hostname.includes('openstreetmap')) {
    event.respondWith(
      caches.open(MAP_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => new Response('', { status: 503 }));
        })
      )
    );
    return;
  }

  // API calls - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request.clone())
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) =>
            cache.match(event.request).then(
              (cached) =>
                cached ||
                new Response(
                  JSON.stringify({ offline: true, message: 'You are offline. Data will sync when connected.' }),
                  { headers: { 'Content-Type': 'application/json' }, status: 503 }
                )
            )
          )
        )
    );
    return;
  }

  // App shell - stale while revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Background sync for queued emergencies
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emergencies') {
    event.waitUntil(syncQueuedEmergencies());
  }
});

async function syncQueuedEmergencies() {
  try {
    const db = await openDB();
    const queue = await getAllFromDB(db, 'emergency_queue');
    for (const item of queue) {
      try {
        const response = await fetch('/api/emergency/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${item.token}` },
          body: JSON.stringify(item.data),
        });
        if (response.ok) {
          await deleteFromDB(db, 'emergency_queue', item.id);
          // Notify all clients
          const clients = await self.clients.matchAll();
          clients.forEach((client) =>
            client.postMessage({ type: 'EMERGENCY_SYNCED', data: await response.json() })
          );
        }
      } catch (err) {
        console.warn('[SW] Failed to sync emergency:', err);
      }
    }
  } catch (err) {
    console.warn('[SW] Sync failed:', err);
  }
}

// Simple IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('atter_offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('emergency_queue')) {
        db.createObjectStore('emergency_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('location_cache')) {
        db.createObjectStore('location_cache', { keyPath: 'userId' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

function getAllFromDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

function deleteFromDB(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}

// Push notifications for emergency alerts
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'ATTER Emergency Alert', {
      body: data.body || 'New emergency nearby',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'emergency',
      requireInteraction: true,
      actions: [
        { action: 'accept', title: '✅ Accept' },
        { action: 'dismiss', title: '❌ Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'accept') {
    event.waitUntil(clients.openWindow('/dashboard/helper'));
  }
});
