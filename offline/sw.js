const CACHE='holocron-local-v2';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/v1/'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(url.pathname.startsWith('/art/')&&cached)return cached;
  try{const response=await fetch(request);if(response.ok)return response;throw Error('Unavailable')}
  catch{return cached||(request.mode==='navigate'?await cache.match(new URL('./index.html',self.location.href)):null)||new Response('Holocron offline files are not ready. Reconnect and finish offline setup.',{status:503})}
 })());
});
