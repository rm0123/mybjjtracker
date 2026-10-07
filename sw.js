const CACHE='mybjj-v4.5-blue-belt-hours';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=4',
  './techniques.js?v=4',
  './app.js?v=4.5',
  './manifest.webmanifest?v=4',
  './data/initial-data.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const request=e.request;
  if(request.method!=='GET') return;
  e.respondWith(
    fetch(request)
      .then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(request,copy));
        return resp;
      })
      .catch(async()=>{
        const cached=await caches.match(request);
        if(cached) return cached;
        if(request.mode==='navigate') return caches.match('./index.html');
        throw new Error('Offline resource unavailable');
      })
  );
});