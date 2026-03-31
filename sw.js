// ============================================================
//  sw.js  —  Firebase Cloud Messaging Service Worker
//  Project  : Family Hub
//  Sender ID: 933908338610
// ============================================================
//  DEPLOY: place this file at the ROOT of your website,
//  same folder as index.html  →  /sw.js
// ============================================================

// ── Guard: importScripts may fail in some WebView environments ──
// In Median APKs the service worker runs in a restricted context.
// We wrap the Firebase import so the SW still loads even if FCM
// scripts are blocked (e.g. no network on first install).
let firebaseLoaded = false;
try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
    firebaseLoaded = true;
} catch (e) {
    console.warn('[sw.js] Firebase scripts failed to load — FCM background messages disabled.', e);
}

// ── Initialise Firebase only if scripts loaded successfully ──
if (firebaseLoaded) {
    try {
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
                icon:     icon  || '/icon-192.png',
                badge:    badge || '/icon-96.png',
                data:     { url: '/', ...data },
                vibrate:  [200, 100, 200],
                tag:      'family-hub',
                renotify: true,
                actions: [
                    { action: 'open',    title: '📲 Open App' },
                    { action: 'dismiss', title: '✕ Dismiss'  }
                ]
            });
        });

    } catch (e) {
        console.warn('[sw.js] Firebase init failed:', e);
    }
}

// ── Handle messages sent from the main page (index.html) ──
// This is used by showNotification() in the app when the SW
// is active but Firebase FCM isn't the delivery mechanism.
self.addEventListener('message', event => {
    if (!event.data) return;

    if (event.data.type === 'SHOW_NOTIF') {
        const { title, body, tag, icon, url } = event.data;
        event.waitUntil(
            self.registration.showNotification(title || '🏠 Family Hub', {
                body:     body  || '',
                icon:     icon  || '/icon-192.png',
                badge:    '/icon-96.png',
                tag:      tag   || 'fh-' + Date.now(),
                renotify: true,
                vibrate:  [180, 80, 180],
                data:     { url: url || '/' }
            })
        );
    }

    // Allow the page to ping the SW to keep it alive
    if (event.data.type === 'PING') {
        event.ports && event.ports[0] && event.ports[0].postMessage({ type: 'PONG' });
    }
});

// ── Handle notification tap ───────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();

    // Dismiss action — do nothing
    if (event.action === 'dismiss') return;

    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            // If the app is already open, focus it
            for (const client of list) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ── Handle notification close (dismissed by user) ─────────
self.addEventListener('notificationclose', event => {
    console.log('[sw.js] Notification dismissed:', event.notification.tag);
});

// ── Service worker install & activate ─────────────────────
// Skip waiting so the new SW activates immediately on update
self.addEventListener('install', event => {
    console.log('[sw.js] Installing…');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[sw.js] Activated.');
    // Take control of all open clients immediately
    event.waitUntil(clients.claim());
});

// ── Normalise FCM payload (notification key vs data-only) ──
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
