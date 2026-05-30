// =====================================================
// CANCHA — Service Worker
// Estrategia: Cache-First para assets, Network-First para datos
// =====================================================

const CACHE_NAME = 'cancha-v5';
const DATA_CACHE = 'cancha-data-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/home.html',
  '/pages/canchas.html',
  '/pages/reserva.html',
  '/pages/equipo.html',
  '/pages/perfil.html',
  '/css/main.css',
  '/css/components.css',
  '/js/app.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/notificaciones.js',
  '/js/camara.js',
  '/js/geolocalizacion.js',
  '/js/sincronizacion.js',
  '/js/verificacion.js',
  '/manifest.json'
];

// ─── Instalación: cachear assets estáticos ──────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando CanCha...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activación: limpiar cachés viejos ──────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activando CanCha...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: Cache-First para assets, Network-First para API ─
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Datos dinámicos (Firebase / JSONbin) → Network-First
  if (url.hostname.includes('firebaseio') || url.hostname.includes('jsonbin')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets estáticos → Cache-First
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('<h1>Sin conexión</h1><p>CanCha funciona offline. Revisá tus reservas guardadas.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Sin conexión', offline: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ─── Notificaciones Push ─────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const titulo = data.titulo || 'CanCha';
  const opciones = {
    body: data.mensaje || 'Tenés una actualización.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/pages/home.html' },
    actions: [
      { action: 'ver', title: 'Ver' },
      { action: 'cerrar', title: 'Cerrar' }
    ]
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'ver' || !event.action) {
    const url = event.notification.data?.url || '/pages/home.html';
    event.waitUntil(clients.openWindow(url));
  }
});

// ─── Background Sync ─────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reservas') {
    event.waitUntil(sincronizarReservasPendientes());
  }
});

async function sincronizarReservasPendientes() {
  // Delega la sincronización a cualquier cliente abierto (app.js escucha el mensaje)
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length > 0) {
    clients[0].postMessage({ tipo: 'sync-pendientes' });
    console.log('[SW] Mensaje sync-pendientes enviado al cliente.');
  } else {
    console.log('[SW] Sin clientes abiertos para sincronizar.');
  }
}
