// Network-first for pages, cache-first for hashed assets. Model files are cached by transformers.js itself.
const C = "audioweb-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const nav = r.mode === "navigate";
  e.respondWith((async () => {
    const c = await caches.open(C);
    if (!nav) { const hit = await c.match(r); if (hit) return hit; }
    try { const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }
    catch (err) { const hit = await c.match(r, { ignoreSearch: true }); if (hit) return hit; throw err; }
  })());
});
