/* The Bukit Besi PWA service worker — same-origin deployment required. */
'use strict';

const VERSION = 'tbb-pwa-v1.0.0';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const IMAGE_CACHE_LIMIT = 48;
const PAGE_CACHE_LIMIT = 24;
const OFFLINE_URL = '/offline/';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/pwa-icon-192.png'
];

const isCacheableResponse = response => response && (response.ok || response.type === 'opaque');

async function trim(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxItems)).map(key => cache.delete(key)));
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, PAGES, ASSETS]);
    await Promise.all((await caches.keys()).filter(key => !keep.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function shouldBypass(url) {
  return url.pathname.startsWith('/search') ||
    url.pathname.startsWith('/feeds/') ||
    url.pathname.startsWith('/b/') ||
    url.pathname.startsWith('/p/preview') ||
    url.searchParams.has('m') ||
    url.searchParams.has('updated-max') ||
    url.searchParams.has('preview');
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const fresh = await fetch(request);
    if (fresh.ok && fresh.headers.get('content-type')?.includes('text/html')) {
      cache.put(request, fresh.clone());
      trim(PAGES, PAGE_CACHE_LIMIT);
    }
    return fresh;
  } catch (_) {
    return (await cache.match(request)) || (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const update = fetch(request).then(response => {
    if (isCacheableResponse(response)) {
      cache.put(request, response.clone());
      trim(ASSETS, IMAGE_CACHE_LIMIT);
    }
    return response;
  }).catch(() => cached);
  return cached || update;
}

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    if (url.origin !== self.location.origin || shouldBypass(url)) return;
    event.respondWith(networkFirstPage(request));
    return;
  }

  const isTbbAsset = url.hostname === 'assets.thebukitbesi.com' && url.pathname.startsWith('/pwa/');
  const isBloggerImage = url.hostname === 'blogger.googleusercontent.com' && request.destination === 'image';
  if (isTbbAsset || isBloggerImage) event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch (_) { payload = {title: 'The Bukit Besi', body: event.data.text()}; }
  const title = String(payload.title || 'The Bukit Besi').slice(0, 80);
  const options = {
    body: String(payload.body || '').slice(0, 180),
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    data: {url: new URL(payload.url || '/', self.location.origin).href},
    tag: String(payload.tag || 'tbb-update').slice(0, 64),
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const current = windows.find(client => client.url === target);
    if (current) return current.focus();
    return self.clients.openWindow(target);
  })());
});
