/**
 * Optional same-origin delivery layer for Blogger PWA root files.
 * Attach only to exact routes listed in DEPLOYMENT.md.
 */
const ASSET_ORIGIN = 'https://assets.thebukitbesi.com/pwa';
const ROUTES = new Map([
  ['/service-worker.js', ['service-worker.js', 'application/javascript; charset=utf-8', 'no-cache']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json; charset=utf-8', 'public, max-age=3600']],
  ['/offline/', ['offline.html', 'text/html; charset=utf-8', 'public, max-age=86400']],
  ['/llms.txt', ['llms.txt', 'text/plain; charset=utf-8', 'public, max-age=86400']],
  ['/ai.txt', ['ai.txt', 'text/plain; charset=utf-8', 'public, max-age=86400']],
  ['/pwa-icon-192.png', ['icons/tbb-icon-192.png', 'image/png', 'public, max-age=31536000, immutable']]
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const route = ROUTES.get(url.pathname);
    if (!route) return fetch(request);
    const [file, type, cacheControl] = route;
    const upstream = await fetch(`${ASSET_ORIGIN}/${file}`, {cf: {cacheEverything: true, cacheTtl: 3600}});
    if (!upstream.ok) return new Response('PWA asset unavailable', {status: 503});
    const headers = new Headers(upstream.headers);
    headers.set('Content-Type', type);
    headers.set('Cache-Control', cacheControl);
    headers.set('X-Content-Type-Options', 'nosniff');
    if (url.pathname === '/service-worker.js') headers.set('Service-Worker-Allowed', '/');
    return new Response(upstream.body, {status: upstream.status, headers});
  }
};
