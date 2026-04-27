const CACHE = "snake-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/script.js",
    "./favicon.svg",
    "./manifest.json"
];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);
    if (url.origin !== location.origin) return;
    if (e.request.method !== "GET") return;

    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
            if (!resp || resp.status !== 200 || resp.type !== "basic") return resp;
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return resp;
        }))
    );
});
