// Family Hub Service Worker - handles push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyByh09evolR8lCvwWZ160zLUJdGXIzPXIk",
    authDomain: "family-phone-game.firebaseapp.com",
    projectId: "family-phone-game",
    storageBucket: "family-phone-game.firebasestorage.app",
    messagingSenderId: "933908338610",
    appId: "1:933908338610:web:ca5ce26b24118b833bb6ab"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage(payload => {
    const { title, body, icon } = payload.notification || {};
    self.registration.showNotification(title || 'Family Hub 🏠', {
        body: body || '',
        icon: icon || './icon-192.png',
        badge: './icon-192.png',
        tag: 'family-hub-' + Date.now(),
        renotify: true,
        vibrate: [200, 100, 200],
    });
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow('/'));
});

// Cache app shell for offline use
const CACHE = 'family-hub-v1';
const SHELL = ['./index.html'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    // Network-only for external APIs and Firebase
    if (!e.request.url.startsWith(self.location.origin)) {
        e.respondWith(fetch(e.request));
        return;
    }
    // Cache-first for app shell
    e.respondWith(
        caches.match(e.request).then(cached =>
            cached || fetch(e.request).then(res => {
                if (res.status === 200) {
                    caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                }
                return res;
            })
        )
    );
});
