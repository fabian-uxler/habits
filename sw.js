const CACHE = "habits-v4";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("habits-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Aus dem Cache antworten, im Hintergrund aktualisieren (auch die Schriften).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Manifest immer frisch vom Server holen, damit Änderungen (z. B. die ID) sofort ankommen.
  if (new URL(e.request.url).pathname.endsWith("manifest.webmanifest")) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" })
        .then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const net = fetch(e.request)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => hit || (e.request.mode === "navigate" ? cache.match("./index.html") : undefined));
        return hit || net;
      })
    )
  );
});
