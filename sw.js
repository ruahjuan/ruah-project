// ============================================================
//  RUAH Cancionero — Service Worker
//  Estrategia: Cache First para assets estáticos
//               Network First para songs_data.js
// ============================================================

const CACHE_VERSION = 'ruah-v2';

// Assets que se cachean en la instalación (shell de la app)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/banner-coordinator.js',
  '/js/darkmode.js',
  '/js/editor.js',
  '/js/migrator.js',
  '/js/misc.js',
  '/js/mobile.js',
  '/js/parser.js',
  '/js/prayers.js',
  '/js/renderer.js',
  '/js/state.js',
  '/js/transposer.js',
  '/js/update.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Assets que se actualizan desde la red si hay conexión
const NETWORK_FIRST = [
  '/js/songs_data.js',
];


// ── INSTALL ─────────────────────────────────────────────────
// Se ejecuta una sola vez cuando el SW se registra.
// Precachea todos los assets estáticos.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[RUAH SW] Precacheando assets...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // NOTA: ya no llamamos a self.skipWaiting() acá.
  // El SW nuevo queda "esperando" hasta que el usuario confirme
  // la actualización desde el banner (ver listener de 'message' abajo).
});


// ── ACTIVATE ────────────────────────────────────────────────
// Limpia caches viejas cuando hay una versión nueva del SW.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log('[RUAH SW] Eliminando cache vieja:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Toma control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});


// ── MENSAJE DESDE LA PÁGINA ─────────────────────────────────
// El usuario apretó "Actualizar" en el banner → activamos el SW nuevo.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no sean GET o que sean externos (ej: YouTube)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const isNetworkFirst = NETWORK_FIRST.some((path) =>
    url.pathname.includes(path)
  );

  if (isNetworkFirst) {
    // Network First: intenta red, cae a cache si falla
    event.respondWith(networkFirst(request));
  } else {
    // Cache First: sirve desde cache, actualiza en background
    event.respondWith(cacheFirst(request));
  }
});


// ── ESTRATEGIAS ─────────────────────────────────────────────

/**
 * Cache First con actualización en background (Stale While Revalidate).
 * Ideal para assets estáticos: CSS, JS, íconos.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Sirve desde cache y actualiza en background
    fetchAndUpdate(request);
    return cached;
  }
  // Si no está en cache, busca en red y guarda
  return fetchAndUpdate(request);
}

/**
 * Network First con fallback a cache.
 * Ideal para songs_data.js: siempre intenta tener la versión más nueva.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    console.log('[RUAH SW] Sin red, sirviendo songs_data.js desde cache');
    const cached = await caches.match(request);
    return cached || new Response('/* offline */', {
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
}

/**
 * Hace el fetch, guarda en cache y devuelve la respuesta.
 */
async function fetchAndUpdate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Si falla y no hay cache, devuelve página offline básica
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    return new Response('', { status: 408 });
  }
}
