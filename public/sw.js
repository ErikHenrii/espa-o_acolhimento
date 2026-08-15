// ============================================================
// Service Worker — Espaço de Acolhimento PWA
// ============================================================

const CACHE_NAME = "acolhimento-v2";
const STATIC_ASSETS = [
  '/',
  '/acesso.html',
  '/paciente.html',
  '/terapeuta.html',
  '/manifest.json',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/apple-touch-icon.png',
  '/img/favicon.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ============================================================
// INSTALL: cache static assets
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets first (these will always succeed)
      const localAssets = STATIC_ASSETS.filter(a => !a.startsWith('http'));
      return cache.addAll(localAssets).catch(err => {
        console.warn('Some local assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATE: clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// FETCH: network-first for API, cache-first for static assets
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST, PUT, etc.) — always go to network
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests to API — always network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline and API call fails, return a generic offline response
        return new Response(
          JSON.stringify({ error: 'offline', message: 'Sem conexão. Verifique sua internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For static assets: cache-first, then network (with fallback)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached immediately, but also update cache in background
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cached;
      }

      // Not in cache — try network, cache if successful
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline and not in cache — return the acesso.html as fallback
        return caches.match('/acesso.html');
      });
    })
  );
});

// ============================================================
// PUSH: handle push notifications (future use)
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Espaço de Acolhimento', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/acesso.html')
  );
});
