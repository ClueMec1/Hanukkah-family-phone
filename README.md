# Family Hub — File Structure

Each feature lives in its own file. Edit one, upload one.

---

## 📁 File Map

| File | What it controls | When to edit |
|---|---|---|
| `index.html` | Page layout, all HTML panels & modals | Adding new buttons, panels, or modals |
| `style.css` | All visual styling & colors | Changing colors, fonts, spacing, layout |
| `js/core.js` | Shared state, helper functions, global events | Rarely — core utilities |
| `js/auth.js` | Sign-in, saved accounts, presence tracking | Login screen changes |
| `js/cards.js` | Home cards, card editor, file uploads, section tabs | Card behavior, upload logic |
| `js/chat.js` | Family Chat (WhatsApp-style) | Chat features, groups, messages |
| `js/calendar.js` | Calendar view, events, Hebrew dates, birthdays | Calendar & events |
| `js/recipes.js` | Recipe grid, add/view/delete recipes | Recipe features |
| `js/poll.js` | Polls, voting | Poll features |
| `js/host.js` | Host login, settings, announcements, access requests, user management | Admin/host controls |
| `js/wheel.js` | Spin the wheel picker | Wheel feature |
| `js/search.js` | Search across all cards | Search feature |
| `js/video.js` | WhatsApp video call, YouTube/Streamable lightbox, Drive lightbox | Video & media playback |
| `js/init.js` | App boot sequence, session restore, feature tab switcher, window exports | App startup behavior |

---

## 🔧 How to deploy

Upload **all files** to GitHub Pages (or any static host) keeping this exact folder structure:

```
family-hub/
├── index.html
├── style.css
├── README.md
└── js/
    ├── core.js
    ├── auth.js
    ├── cards.js
    ├── chat.js
    ├── calendar.js
    ├── recipes.js
    ├── poll.js
    ├── host.js
    ├── wheel.js
    ├── search.js
    ├── video.js
    └── init.js
```

## 🛠 Fixing one feature at a time

1. Find the file for that feature in the table above
2. Edit just that file
3. Upload only that one file to GitHub — no need to re-upload everything

## 🎨 Changing colors

Open `style.css` and look for the `:root` block at the very top:

```css
:root {
    --accent: #5c6bc0;   /* main purple — change this to your color */
    --accent2: #26a69a;  /* teal accent */
    --bg: #f7f8fc;       /* page background */
    --text: #1a1d2e;     /* main text color */
}
```

Change those values to restyle the whole app instantly.

## 🔐 Changing the host PIN

Open `js/host.js` and find:
```js
if(pin==='2011'){
```
Change `2011` to whatever PIN you want.

## 🔐 Changing the family verification answer

Open `js/host.js` and find:
```js
const FAMILY_SECRET = '1027';
```
Change `1027` to your family's answer.
