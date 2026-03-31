// ============================================================
//  sw.js  —  Firebase Cloud Messaging Service Worker
//  Project  : Family Phone Game
//  Sender ID: 933908338610
// ============================================================
//  DEPLOY: place this file at the ROOT of your website,
//  same folder as index.html  →  /sw.js
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey:            "AIzaSyByh09evolR8lCvwWZ160zLUJdGXIzPXIk",
    authDomain:        "family-phone-game.firebaseapp.com",
    databaseURL:       "https://family-phone-game-default-rtdb.firebaseio.com",
    projectId:         "family-phone-game",
    storageBucket:     "family-phone-game.firebasestorage.app",
    messagingSenderId: "933908338610",
    appId:             "1:933908338610:web:ca5ce26b24118b833bb6ab",
    measurementId:     "G-DRVXJM4THP"
});

const messaging = firebase.messaging();

// Fires when app is in background or closed
messaging.onBackgroundMessage(payload => {
    console.log('[sw.js] Background message received:', payload);
    const { title, body, icon, badge, data } = extractNotifFields(payload);
    return self.registration.showNotification(title || '🏠 Family Hub', {
        body,
        icon:    icon  || '/icon-192.png',
        badge:   badge || '/icon-96.png',
        data:    data  || {},
        vibrate: [200, 100, 200],
        tag:     'family-hub',
        renotify: true,
        actions: [
            { action: 'open',    title: '📲 Open App' },
            { action: 'dismiss', title: '✕ Dismiss'  }
        ]
    });
});

// Handle notification tap
self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes(self.location.origin) && 'focus' in client)
                    return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});

// Normalise FCM payload (notification key vs data-only)
function extractNotifFields(payload) {
    const n = payload.notification || {};
    const d = payload.data         || {};
    return {
        title: n.title || d.title || '🏠 Family Hub',
        body:  n.body  || d.body  || 'You have a new message!',
        icon:  n.icon  || d.icon,
        badge: n.badge || d.badge,
        data:  d
    };
}
