// Libro Conti — service worker
// Salva l'app sul dispositivo così si apre anche senza internet.
// Per pubblicare una nuova versione basta cambiare il numero qui sotto.
var CACHE = "libro-conti-v1";
var FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf("libro-conti-") === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Prima la copia salvata (funziona offline e si apre subito),
// poi, se c'è internet, aggiorna la copia in background.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var isPage = req.mode === "navigate";
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var key = isPage ? "./index.html" : req;
      return cache.match(key, { ignoreSearch: true }).then(function (hit) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        }).catch(function () { return null; });

        if (hit) {
          event.waitUntil(network);
          return hit;
        }
        return network.then(function (res) {
          return res || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        });
      });
    })
  );
});
