// Family Hub Service Worker v3
// Full offline support + push notifications

const CACHE = 'family-hub-v3';

const SHELL = [
  '/Hanukkah-family-phone/',
  '/Hanukkah-family-phone/index.html',
  '/Hanukkah-family-phone/icon-192.png',
  '/Hanukkah-family-phone/icon-512.png',
  '/Hanukkah-family-phone/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const networkOnly = ['firebaseio.com','firebasedatabase.app','googleapis.com',
    'gstatic.com','open-meteo.com','sunrise-sunset.org','hebcal.com','nager.at',
    'appspot.com','jokeapi.dev','wikimedia.org','quotable.io','catfact.ninja',
    'dog.ceo','pollinations.ai','fonts.googleapis.com'];
  if (networkOnly.some(d => url.hostname.includes(d))) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline',{status:503})));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(r => {
        if(r && r.status===200) caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
        return r;
      }).catch(()=>cached);
      return cached || net;
    })
  );
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title||'Family Hub',{
    body:d.body||'',icon:'/Hanukkah-family-phone/icon-192.png',
    badge:'/Hanukkah-family-phone/icon-192.png',
    tag:d.tag||'fh',renotify:true,vibrate:[200,100,200],
    data:{url:'/Hanukkah-family-phone/'}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
    for(const c of list) if(c.url.includes('Hanukkah') && 'focus' in c) return c.focus();
    return clients.openWindow('/Hanukkah-family-phone/');
  }));
});
