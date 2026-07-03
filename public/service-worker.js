const BUILD_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
// Keep this name in sync with deploys by registering the worker with ?v=BUILD_VERSION.
const CACHE_NAME = `trivia-showdown-${BUILD_VERSION}`;
const CACHE_PREFIX = "trivia-showdown-";
const APP_SHELL_ASSETS = [
  "/",
  `/style.css?v=${BUILD_VERSION}`,
  `/app.js?v=${BUILD_VERSION}`,
  `/discord-sdk.js?v=${BUILD_VERSION}`,
  "/manifest.json",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png"
];
const STATIC_ASSET_PATTERN = /\.(?:css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$/i;
const IGNORED_PATH_PREFIXES = ["/socket.io/", "/api/", "/auth/", "/boards/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

function shouldAlwaysUseNetwork(url) {
  if (url.pathname === "/version") {
    return true;
  }

  return IGNORED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
}

function isCacheableStaticAsset(url) {
  return url.pathname === "/manifest.json" || STATIC_ASSET_PATTERN.test(url.pathname);
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return (await caches.match("/offline.html")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}
