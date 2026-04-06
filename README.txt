# Family Hub App Package

## Files included:
- index.html     — The full app
- sw.js          — Service worker (push notifications + offline)
- manifest.json  — App install configuration
- icon-192.png   — App icon (small)
- icon-512.png   — App icon (large)

---

## Option 1: WebIntoApp (recommended — supports real push notifications)
1. Go to https://www.webintoapp.com/html-to-app
2. Choose "Upload HTML Files (ZIP)"
3. Upload this entire ZIP file
4. Set app name: Family Hub
5. Upload icon-192.png as your icon
6. Enable Firebase (paste your google-services.json if prompted)
7. Download APK

## Option 2: AppsGeyser (simpler, no real push notifications)
1. Go to https://appsgeyser.com/html-to-app
2. Paste the contents of index.html
3. Name it "Family Hub"
4. Download APK

## Option 3: Install as PWA (best option — everything works perfectly)
1. Open Chrome on Android
2. Go to: https://cluemec1.github.io/Hanukkah-family-phone/
   (first upload all these files to your GitHub repo)
3. Tap ⋮ menu → "Add to Home screen"
4. Done — real app icon, everything works

## Push Notifications:
Push notifications only work with WebIntoApp or the PWA option.
AppsGeyser does NOT support real background push notifications.
