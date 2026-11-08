const CACHE='holocron-local-v2';
const MODE_URL=new URL('./connection-mode',self.location.href);
const LOOPBACK=['localhost','127.0.0.1','[::1]'].includes(self.location.hostname);
let currentMode=null;

async function mode(){
 if(currentMode)return currentMode;
 const cache=await caches.open(CACHE);
 const saved=await cache.match(MODE_URL);
 currentMode=saved&&await saved.text()==='home-sync'?'home-sync':'local-only';
 return currentMode;
}

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='HOLOCRON_CONNECTION_MODE'||!['local-only','home-sync'].includes(event.data.mode))return;
 currentMode=event.data.mode;
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.put(MODE_URL,new Response(currentMode));event.ports?.[0]?.postMessage({mode:currentMode})})());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/v1/')){
  event.respondWith((async()=>await mode()==='local-only'?new Response('Home sync is off.',{status:503}):fetch(request))());
  return;
 }
 if(request.method!=='GET')return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  const localOnly=await mode()==='local-only';
  if(cached&&((localOnly&&!LOOPBACK)||url.pathname.startsWith('/art/')))return cached;
  // Only a click on offline setup may download missing files in local-only mode.
  if(localOnly&&!LOOPBACK&&request.headers.get('X-Holocron-Install')!=='1')return request.mode==='navigate'?await cache.match(new URL('./index.html',self.location.href))||new Response('Holocron offline files are not ready. Open the app online and choose Prepare my cards.',{status:503}):new Response('Offline file not cached.',{status:503});
  try{const response=await fetch(request);if(response.ok)return response;throw Error('Unavailable')}
  catch{return cached||(request.mode==='navigate'?await cache.match(new URL('./index.html',self.location.href)):null)||new Response('Holocron offline files are not ready. Open the app online and choose Prepare my cards.',{status:503})}
 })());
});
