// Service worker for the GFG IKGPTU chapter site.
//
// Goal: make the site installable and usable offline for pages it has
// already seen, WITHOUT changing how it behaves online. Every strategy
// below is chosen so that, as long as there's a network connection, the
// site works exactly as it did before this file existed.
//
// Strategy:
//  - Anything that isn't a same-origin GET request (logins, form
//    submissions, admin writes, member/admin API calls, etc.) is never
//    touched — it's left to the browser exactly as before.
//  - `/api/**` is never cached, for the same reason: session-, member-,
//    and admin-scoped data must always come from the network.
//  - Hashed Next.js build assets (`/_next/static/**`) are cache-first —
//    safe because their filenames change whenever their content does.
//  - Page navigations are network-first: the network is always tried
//    first, and only a cached copy (or /offline.html as a last resort)
//    is used if the network request fails outright.
//  - Everything else same-origin (images, fonts, icons) is also
//    network-first with a cache fallback, so the site degrades
//    gracefully offline without ever preferring stale content while
//    online.

const CACHE_VERSION = "v1";
const CACHE_NAME = `gfg-ikgptu-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/brand/logo-mark.png",
  "/brand/logo-mark-dark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Don't let a single missing asset block installation.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** Cache successful, basic (same-origin) responses only. */
function putInCache(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET requests — form posts, logins, admin/member
  // mutations must always go straight to the network, untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests; let cross-origin (fonts CDN, etc.)
  // pass through to the network exactly as before.
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — always fresh, always from the network.
  if (isApiRequest(url)) return;

  // Hashed Next.js build assets: cache-first, since a new deploy always
  // ships new filenames for changed content.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => putInCache(request, response));
      })
    );
    return;
  }

  // Page navigations: network-first, falling back to a cached copy of
  // the same page, and finally to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Everything else same-origin (images, static public assets, fonts):
  // network-first with a cache fallback for offline use.
  event.respondWith(
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => caches.match(request))
  );
});
