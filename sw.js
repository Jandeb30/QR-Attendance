// Service worker for QR Attendance — caches the app shell (this
// page + the html5-qrcode library) so it loads with no network,
// and enables "Add to Home Screen" / install as a standalone app.
//
// Bump this version string whenever you update qr-attendance-clean.html
// so returning devices pick up the new version instead of a stale
// cached copy.
const CACHE_NAME = "qr-attendance-v1";

const APP_SHELL = [
  "./qr-attendance-clean.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://unpkg.com/html5-qrcode"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Never cache calls to the Apps Script backend — attendance data
  // must always be live, never served stale from cache.
  if (url.includes("script.google.com")) {
    return;
  }

  // Cache-first for the app shell, falling back to network and
  // updating the cache when a fresher copy is fetched successfully.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached); // offline — fall back to whatever's cached

      return cached || networkFetch;
    })
  );
});