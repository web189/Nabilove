/* Nabillove — Service Worker V.13
   • Offline-first: seluruh aplikasi (HTML, CSS, JS, font, ikon, SDK) disimpan di perangkat saat kunjungan pertama.
   • Auto-update: begitu internet tersambung, versi terbaru diambil di latar belakang dan langsung dipakai.
   Setiap rilis: naikkan angka VERSION di bawah ini (cukup itu, daftar file dibaca otomatis dari index.html). */
var VERSION = '13';
var SHELL = 'nb-shell-v' + VERSION;
var RUNTIME = 'nb-runtime-v' + VERSION;
var EXTRA = [
  'manifest.json', 'logo-n.png', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'og-nabilove.jpg', 'firebase-config.js', 'nb-system.css'
];

function abs(u) { return new URL(u, self.registration.scope).href; }
function sameOrigin(u) { return new URL(u).origin === self.location.origin; }

/* baca index.html → daftar semua css/js/gambar (termasuk CDN) yang dipakai halaman */
function assetsFrom(html) {
  var out = [], re = /<(link|script|img)\b[^>]*>/gi, m;
  while ((m = re.exec(html))) {
    var tag = m[0], a = /\b(?:href|src)\s*=\s*["']([^"'#]+)["']/i.exec(tag);
    if (!a) continue;
    var rel = (/\brel\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1] || '';
    if (m[1].toLowerCase() === 'link' && !/stylesheet|icon|manifest|preload/i.test(rel)) continue;
    if (/^(data:|mailto:|tel:|javascript:)/i.test(a[1])) continue;
    try { out.push(abs(a[1])); } catch (e) {}
  }
  return out;
}
/* font (woff2) yang disebut di dalam CSS CDN, supaya ikon & huruf tetap tampil offline */
function fontsFrom(css, base) {
  var out = [], re = /url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/gi, m;
  while ((m = re.exec(css))) { try { out.push(new URL(m[1], base).href); } catch (e) {} }
  return out;
}
function put(cache, url) {
  return fetch(url, { cache: 'reload' }).then(function (r) { if (r && (r.ok || r.type === 'opaque')) return cache.put(url, r); }).catch(function () {});
}

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var shell = await caches.open(SHELL), run = await caches.open(RUNTIME);
    var html = '';
    try {
      var r = await fetch(abs('index.html'), { cache: 'reload' });
      html = await r.clone().text();
      await shell.put(abs('index.html'), r.clone());
      await shell.put(abs('./'), r);
    } catch (err) { /* offline saat install: lanjut dengan yang ada */ }
    var urls = assetsFrom(html).concat(EXTRA.map(abs));
    urls = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
    await Promise.all(urls.map(function (u) { return put(sameOrigin(u) ? shell : run, u); }));
    // font dari CSS CDN
    var cdnCss = urls.filter(function (u) { return !sameOrigin(u) && /\.css|fonts\.googleapis/i.test(u); });
    await Promise.all(cdnCss.map(async function (u) {
      try { var t = await (await fetch(u)).text(); await Promise.all(fontsFrom(t, u).map(function (f) { return put(run, f); })); } catch (err) {}
    }));
    await self.skipWaiting();                       // versi baru langsung aktif
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== SHELL && k !== RUNTIME; }).map(function (k) { return caches.delete(k); }));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (err) {} }
    await self.clients.claim();
    var all = await self.clients.matchAll({ type: 'window' });
    all.forEach(function (c) { c.postMessage({ type: 'NB_ACTIVATED', version: VERSION }); });
  })());
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
  if (e.data && e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'NB_VERSION', version: VERSION });
});

/* halaman: jaringan dulu (3,5 dtk) → jika gagal/offline pakai salinan tersimpan */
async function navigate(e) {
  var req = e.request, shell = await caches.open(SHELL);
  try {
    var pre = e.preloadResponse ? await e.preloadResponse : null;
    var res = pre || await Promise.race([
      fetch(req),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 3500); })
    ]);
    if (res && res.ok) { shell.put(abs('index.html'), res.clone()); shell.put(abs('./'), res.clone()); }
    return res;
  } catch (err) {
    return (await shell.match(abs('index.html'))) || (await shell.match(abs('./'))) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

/* file statis: tampilkan cepat dari cache, perbarui diam-diam di belakang */
async function staleWhileRevalidate(e, cacheName) {
  var cache = await caches.open(cacheName), req = e.request;
  var hit = await cache.match(req);
  var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(function () { return null; });
  if (hit) { e.waitUntil(net); return hit; }
  var r = await net;
  if (r) return r;
  var loose = await cache.match(req, { ignoreSearch: true }) || await (await caches.open(SHELL)).match(req, { ignoreSearch: true });
  return loose || new Response('', { status: 504 });
}
/* CDN (font, ikon, SDK): cache-first, tidak pernah berubah untuk URL yang sama */
async function cacheFirst(e) {
  var cache = await caches.open(RUNTIME), hit = await cache.match(e.request);
  if (hit) return hit;
  try { var r = await fetch(e.request); if (r && (r.ok || r.type === 'opaque')) cache.put(e.request, r.clone()); return r; }
  catch (err) { return new Response('', { status: 504 }); }
}

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (req.headers.has('range')) return;                                  // streaming audio: biarkan browser
  if (req.mode === 'navigate') { e.respondWith(navigate(e)); return; }
  if (u.origin === self.location.origin) {
    if (u.pathname.endsWith('/sw.js')) return;
    e.respondWith(staleWhileRevalidate(e, SHELL)); return;
  }
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname)) {
    e.respondWith(cacheFirst(e));
  }
  // Firebase Realtime Database / Auth: tidak dicegat (data offline ditangani cache snapshot di halaman)
});
