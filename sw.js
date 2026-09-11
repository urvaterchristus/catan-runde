// Bump VERSION whenever an application file changes, so the complete shell updates together.
const VERSION='v0.2.1';
const SCOPE=new URL(self.registration.scope);
const PREFIX=`catan-runde-${SCOPE.pathname}-`;
const CACHE=PREFIX+VERSION;
const FILES=['./','./index.html','./styles.css','./app.js','./model.js','./pwa.js','./touch.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const URLS=FILES.map(file=>new URL(file,SCOPE).href);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
  // Only known application files are cached; game data stays in the browser's local store.
  if(!URLS.includes(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(event.request);
    return saved||fetch(event.request);
  })());
});
