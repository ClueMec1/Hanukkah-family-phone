// Family Hub Service Worker v5
// Full offline support + push notifications + Web Share Target + Firebase Cloud Messaging

// ── Firebase Cloud Messaging (required for FCM push notifications) ────────────
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDR2gPV7AqJP8_cBbEINinB9m8APdnjc8c",
  authDomain: "family-phone-game.firebaseapp.com",
  databaseURL: "https://family-phone-game-default-rtdb.firebaseio.com",
  projectId: "family-phone-game",
  storageBucket: "family-phone-game.firebasestorage.app",
  messagingSenderId: "933908338610",
  appId: "1:933908338610:web:family-hub"
});

const messagingFCM = firebase.messaging();

// Handle background FCM messages
messagingFCM.onBackgroundMessage(function(payload) {
  const { title = 'Family Hub', body = '', icon, tag } = payload.notification || payload.data || {};
  self.registration.showNotification(title, {
    body,
    icon: icon || '/Hanukkah-family-phone/icon-192.png',
    badge: '/Hanukkah-family-phone/icon-192.png',
    tag: tag || 'fh-fcm',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/Hanukkah-family-phone/' }
  });
});

const CACHE = 'family-hub-v5';
const SHARE_CACHE = 'family-hub-shared-v2';

const SHELL = [
  '/Hanukkah-family-phone/',
  '/Hanukkah-family-phone/index.html',
  '/Hanukkah-family-phone/icon-192.png',
  '/Hanukkah-family-phone/icon-512.png',
  '/Hanukkah-family-phone/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
const NETWORK_ONLY = [
  'firebaseio.com','firebasedatabase.app','googleapis.com','gstatic.com',
  'open-meteo.com','sunrise-sunset.org','hebcal.com','nager.at','appspot.com',
  'jokeapi.dev','wikimedia.org','quotable.io','catfact.ninja','dog.ceo',
  'pollinations.ai','fonts.googleapis.com','thumbsnap.com','api.puter.com',
  'cloudinary.com','firebasestorage.googleapis.com'
];

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Share Target: intercept POST to /?share-target
  if (e.request.method === 'POST' && url.searchParams.has('share-target')) {
    e.respondWith(handleShareTarget(e.request));
    return;
  }

  // Network-only for live APIs
  if (NETWORK_ONLY.some(d => url.hostname.includes(d))) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(r => {
        if (r && r.status === 200)
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

// ── Share Target handler ──────────────────────────────────────────────────────
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const files    = formData.getAll('media');
    const title    = formData.get('title') || '';
    const text     = formData.get('text')  || '';
    const shareUrl = formData.get('url')   || '';

    const cache   = await caches.open(SHARE_CACHE);
    const payload = { title, text, url: shareUrl, files: [], timestamp: Date.now() };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.size) continue;
      const key = 'shared-file-' + Date.now() + '-' + i;
      await cache.put(
        new Request('/__share__/' + key),
        new Response(file, { headers: { 'Content-Type': file.type, 'X-File-Name': file.name || 'shared' } })
      );
      payload.files.push(key);
    }

    await cache.put(
      new Request('/__share__/latest'),
      new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })
    );

    return Response.redirect('/Hanukkah-family-phone/?shared=1#share-target', 303);
  } catch (e) {
    console.error('Share target failed:', e);
    return Response.redirect('/Hanukkah-family-phone/', 303);
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'Family Hub', {
      body:     d.body || '',
      icon:     '/Hanukkah-family-phone/icon-192.png',
      badge:    '/Hanukkah-family-phone/icon-192.png',
      tag:      d.tag || 'fh',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: '/Hanukkah-family-phone/' }
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list)
        if (c.url.includes('Hanukkah') && 'focus' in c) return c.focus();
      return clients.openWindow('/Hanukkah-family-phone/');
    })
  );
});
