const CACHE = "snake-v3";
const ASSETS = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/main.js",
    "./js/config.js",
    "./js/state.js",
    "./js/audio.js",
    "./js/render.js",
    "./js/game.js",
    "./js/input.js",
    "./js/ui.js",
    "./js/leaderboard.js",
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

    // Stale-while-revalidate: responde rapido pelo cache, mas sempre busca a
    // versao nova em segundo plano — assim novos deploys chegam aos usuarios
    // sem depender de trocar o nome do cache.
    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetchAndUpdate = fetch(e.request).then(resp => {
                if (resp && resp.status === 200 && resp.type === "basic") {
                    const clone = resp.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return resp;
            }).catch(() => cached);
            return cached || fetchAndUpdate;
        })
    );
});
