const buildVersion = new URL(self.location.href).searchParams.get("v") || "dev";
const staticCacheName = `trivia-showdown-static-${buildVersion}`;
const safeStaticAssets = [`/style.css?v=${buildVersion}`, "/manifest.json"];
const safeAssetPattern = /\.(?:css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$/i;
const livePathPrefixes = ["/socket.io/", "/api/", "/version", "/boards/"];
const liveFilePattern = /\.(?:html|js|json)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(staticCacheName)
      .then((cache) => cache.addAll(safeStaticAssets))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("trivia-showdown-static-") &&
                cacheName !== staticCacheName,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || shouldAlwaysUseNetwork(url)) {
    return;
  }

  if (!safeAssetPattern.test(url.pathname)) {
    return;
  }

  event.respondWith(cacheFirst(request));
});

function shouldAlwaysUseNetwork(url) {
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return true;
  }

  if (livePathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }

  return liveFilePattern.test(url.pathname);
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(staticCacheName);
    cache.put(request, response.clone());
  }

  return response;
}
