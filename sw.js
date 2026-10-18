const VERSION='marie-v1';
const ASSETS=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./icons/icon.svg','./icons/maskable.svg',...['map','hero','sprite','cockpit','garden','kitchen','lounge','bedroom','workshop','cargo','observatory','engine','corridor','nebula','gold','ice'].map(x=>'./assets/'+x+(x==='sprite'?'.svg':'.webp'))];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('marie-')&&x!==VERSION).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).catch(()=>caches.match('./index.html'))))});
