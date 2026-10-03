// Each repository subpath owns its cache. A version switches the complete asset set together.
const PREFIX='stick-fight-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'3d-v3';
const FILES=['./','./index.html','./style.css','./game.js','./data.js','./simulation.js','./render3d.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
const URLS=new Set(FILES.map(p=>new URL(p,self.location.href).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(async k=>{if(k.startsWith(PREFIX)&&k!==CACHE)return caches.delete(k);if(['stick-fight-v1','stick-fight-3d-v2'].includes(k)){const urls=await (await caches.open(k)).keys();if(urls.length&&urls.every(r=>r.url.startsWith(self.registration.scope)))return caches.delete(k);}}))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);url.search='';if(e.request.method!=='GET'||!URLS.has(url.href))return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.href))||fetch(e.request)));});
