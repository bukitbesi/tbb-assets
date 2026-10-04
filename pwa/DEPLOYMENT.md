# The Bukit Besi PWA — Deployment

## Status

The files in this package are production-ready and dependency-free. Static files may live at `assets.thebukitbesi.com`, but a Service Worker that controls `www.thebukitbesi.com` must be returned from the `www.thebukitbesi.com` origin. A cross-origin Service Worker cannot control Blogger pages.

## 1. Upload static assets

Publish the package contents under:

`https://assets.thebukitbesi.com/pwa/`

Keep these public paths unchanged:

- `/pwa/tbb-pwa.min.css`
- `/pwa/tbb-pwa.min.js`
- `/pwa/service-worker.js`
- `/pwa/manifest.webmanifest`
- `/pwa/offline.html`
- `/pwa/llms.txt`
- `/pwa/ai.txt`
- `/pwa/icons/*`

## 2. Provide same-origin root routes

Recommended: use a Cloudflare Worker attached only to these exact routes:

- `www.thebukitbesi.com/service-worker.js`
- `www.thebukitbesi.com/manifest.webmanifest`
- `www.thebukitbesi.com/offline/*`
- `www.thebukitbesi.com/llms.txt`
- `www.thebukitbesi.com/ai.txt`
- `www.thebukitbesi.com/pwa-icon-192.png`

Use `cloudflare-worker.js`. Do not attach it to the entire site unless a full reverse-proxy architecture has been tested.

Required response for `/service-worker.js`:

- `Content-Type: application/javascript; charset=utf-8`
- `Service-Worker-Allowed: /`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: no-cache`

## 3. Blogger theme

Back up the active theme. Insert the two blocks from `blogger-theme-snippet.xml` at the labelled locations. Remove the existing duplicate `theme-color` and `apple-touch-icon` entries before adding the replacement entries.

## 4. Push notifications

The Service Worker includes secure push-event and notification-click handling, but subscription delivery is intentionally inactive until a push backend and VAPID public key exist. Do not request notification permission on page load. Add the opt-in button only after the backend is configured.

## 5. Verification

1. `curl -I https://www.thebukitbesi.com/service-worker.js` returns 200 and JavaScript MIME.
2. `curl -I https://www.thebukitbesi.com/manifest.webmanifest` returns 200 and manifest MIME.
3. Chrome DevTools > Application shows the manifest and active Service Worker with scope `/`.
4. Workbox is not required. Confirm offline reload of one previously visited article.
5. Search, preview and feed URLs are never cached.
6. Test Add to Home Screen on Android Chrome.
7. Confirm TOC keyboard operation, reading progress, online/offline status and install button.
8. Re-run Lighthouse on representative homepage and post pages; compare like-for-like conditions.

## Runtime footprint

- No framework, jQuery, icon library or Workbox.
- CSS and JavaScript load deferred from the asset host.
- DOM work runs only after DOM ready.
- Reading UI runs only when `.post-body` exists.
- Prefetch respects Data Saver and excludes search/feed/admin/parameter URLs.
