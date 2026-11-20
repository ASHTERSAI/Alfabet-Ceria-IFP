const CACHE_NAME = 'alfabet-ceria-v5-offline';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/train.css',
  './js/data.js',
  './js/confetti.js',
  './js/audio.js',
  './js/train.js',
  './js/game.js',
  './assets/icon.svg',
  './assets/mascot.svg',
  './assets/sd_crying.svg',
  './assets/sd_happy.svg',
  './assets/train_p1.svg',
  './assets/train_p2.svg',
  './assets/items/a.svg',
  './assets/items/b.svg',
  './assets/items/c.svg',
  './assets/items/d.svg',
  './assets/items/e.svg',
  './assets/items/f.svg',
  './assets/items/g.svg',
  './assets/items/h.svg',
  './assets/items/i.svg',
  './assets/items/j.svg',
  './assets/items/k.svg',
  './assets/items/l.svg',
  './assets/items/m.svg',
  './assets/items/n.svg',
  './assets/items/o.svg',
  './assets/items/p.svg',
  './assets/items/q.svg',
  './assets/items/r.svg',
  './assets/items/s.svg',
  './assets/items/t.svg',
  './assets/items/u.svg',
  './assets/items/v.svg',
  './assets/items/w.svg',
  './assets/items/x.svg',
  './assets/items/y.svg',
  './assets/items/z.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
