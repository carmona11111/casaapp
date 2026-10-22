const CACHE='casa-shell-v9';
const ART=['/mickey.png','/cenicienta.png','/ratatouille.png','/tio-gilito.png','/casa.png','/castillo/01_cimientos.png','/castillo/02_paredes.png','/castillo/03_tejados.png','/castillo/04_iluminacion.png'];
const MEMES=['01_primera_victoria.png','02_semana_resuelta.png','03_primer_ladrillo.png','04_modo_cooperativo.png','05_casa_bajo_control.png','06_viaje_preparado.png'].map(file=>`/stickers/memes/${file}`);
const SCENES=['S01','S02','S04','S05','S07','S09','S12','S13','S14','S16'].map(scene=>`/new-look/${scene}.png`);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest',...ART])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('casa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}return response;}).catch(()=>caches.match('/')));return;}
 if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/avatars/')||['/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest',...ART,...SCENES,...MEMES].includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;})));
});
