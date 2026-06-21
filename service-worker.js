const CACHE_NAME = "uapl-lms-v1";

const urlsToCache = [
  "/UAPL-LMS/",
  "/UAPL-LMS/index.html",
  "/UAPL-LMS/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
