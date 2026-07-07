/* ============================== Pesitas — Service Worker ==============================
   IMPORTANTE PARA FUTUROS DEPLOYS:
   Sube el número de CACHE_NAME ("pesitas-v2", "pesitas-v3", ...) cada vez que
   estilos.css o app.js cambien de forma significativa. Si no lo subes, los usuarios
   con la app instalada seguirán viendo la versión vieja indefinidamente, porque el
   app shell se sirve cache-first. No hay build tools: solo edita esta constante.
======================================================================================= */

const CACHE_NAME = "pesitas-v4";

// App shell propio (mismo origen). "./" cubre la navegación a la raíz de la app.
const APP_SHELL = [
  "./",
  "index.html",
  "estilos.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith("pesitas-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin === self.location.origin) {
    // Assets propios: cache-first (rápido y funciona offline).
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        }).catch(() =>
          // Navegación offline a una ruta no cacheada: entrega el shell.
          e.request.mode === "navigate" ? caches.match("./") : Response.error()
        )
      )
    );
  } else {
    // Otros orígenes (Chart.js CDN, Google Fonts): network-first con fallback a cache.
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(e.request).then((hit) => hit || Response.error())
      )
    );
  }
});
