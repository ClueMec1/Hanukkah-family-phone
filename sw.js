// sw.js — deliberately minimal. It caches the app shell (index.html +
// manifest.json) so the app installs and opens instantly, but live data
// (chat, calendar, feed, recipes, AI) always comes fresh from Firestore
// — and the Gemini API — never the cache.

const CACHE = "fam-board-shell-v13";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never cache Firestore/Storage network calls — only the app shell.
  if (event.request.url.includes("firestore.googleapis.com")) return;
  if (event.request.url.includes("firebasestorage.googleapis.com")) return;
  if (event.request.url.includes("generativelanguage.googleapis.com")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
