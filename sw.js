var V='nabi-v16',CORE=['./','index.html','style.css','theme.css','modern.css','app.js','patch.js','pwa.js','admin.js','packages.js','packages.css','polish.css','emoji-fallback.js','firebase-config.js','logo-n.png','favicon.png','icon-192.png','manifest.json'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==V}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);
 if(u.origin!==location.origin){ /* font/ikon CDN: cache-first */
  if(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|^www\.gstatic\.com$/.test(u.host)){e.respondWith(caches.match(r).then(function(h){return h||fetch(r).then(function(n){var c=n.clone();caches.open(V).then(function(x){x.put(r,c)});return n})}))}
  return;}
 e.respondWith(fetch(r).then(function(n){var c=n.clone();caches.open(V).then(function(x){x.put(r,c)});return n}).catch(function(){return caches.match(r).then(function(h){return h||caches.match('index.html')})}));});
