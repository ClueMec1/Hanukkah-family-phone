# Neumify

A family-only PWA: an open, categorized photo/video/music feed, a
WhatsApp-style chat, a shared calendar, voice-guided recipes, a
private AI assistant per person, and host approvals — all in **one
file**, `index.html`.

## Why one file right now (and what changes later)

This app used to be split into a separate HTML file per screen. It's
temporarily consolidated back into a single `index.html` — a proper
single-page app with client-side routing (no full page reloads between
screens) instead of one-file-per-screen. This is a deliberate,
temporary trade-off:

- **Right now**, at roughly 1,200 lines, one file is easy to work
  with and easy to hand to an AI assistant to keep extending.
- **Later**, once this file is pushing toward ~6,000 lines (from
  adding the dual calendar, recipes, the AI assistant, etc.), it's
  worth splitting again — at that point, ask for it to be split into
  two, before it approaches the ~10k-line range that gets genuinely
  hard to work with in one sitting.

Until then, resist the urge to split things off piece by piece —
that's exactly the in-between state that's hardest to reason about.
One file, deliberately, until it's time for the next split.

## What's inside `index.html`

It's one long file with clearly labeled sections, in this order:
1. **Auth screens** — Gate (family question), Register (name+phone),
   Waiting (pending approval), Blocked (kicked)
2. **App shell** — top bar, the six views, and a single nav element
   that's a floating bottom pill on phones and becomes a left sidebar
   on tablets/desktop (one `@media (min-width: 860px)` block — same
   buttons, same JS, just repositioned)
3. One `<script type="module">` at the bottom, itself split into
   commented sections: CONFIG, ICONS, SHARED HELPERS, STATE/SCREEN
   SWITCHING, BOOT, ROUTING, then one section per view (FEED, CHAT
   LIST, ROOM, CALENDAR, RECIPES, COOK MODE, AI, HOST)

**Routing:** there's no page navigation anymore — switching "screens"
just hides/shows a `<div class="view">` and updates `location.hash`
(`#/feed`, `#/chat`, `#/room/<chatId>`, `#/calendar`, `#/recipes`,
`#/ai`, `#/host`), so the back button and reloading both still make
sense. Firestore listeners for each view only start the first time
you visit it (`startXIfNeeded()` guards), except the chat *room*
thread, which tears down and resubscribes every time you open a
different conversation — that one's per-conversation, not
per-app-lifetime.

manifest.json / sw.js / icons/ stay as separate files — a PWA manifest
and service worker have to be, that's not part of this trade-off.

## File map

```
index.html   the whole app — see structure above
manifest.json    PWA metadata (name, icons, colors)
sw.js            minimal service worker — caches the app shell only, never live data
icons/           put icon-192.png and icon-512.png here
```

## What's in the Feed

The standalone "Media" page is gone — its idea (pasting a link that
auto-embeds) lives inside the Feed now, organized into four
categories: **Video, Music, Pictures, Memories**. Only the host can
post (tap a category, add a title and paste a link — YouTube, Spotify,
Vimeo auto-embed; anything else shows as a plain link; a Picture URL
renders as an image if it loads, falls back to a link if it doesn't).
Everyone can browse and filter by category with the pills at the top.

**Why URLs instead of uploads:** this app doesn't use Firebase
Storage at all anymore. Storage now requires the paid Blaze plan just
to provision a bucket, even though usage within the free quota costs
nothing — Google added that requirement for new projects. Since the
whole point here is staying on the free Spark plan, everything media
goes through a pasted link instead of a direct upload. See "Free
storage, for later" below for what to do if you outgrow that.

## Recipes — AI-organized once, then read aloud while cooking

Paste in the raw ingredients and raw steps for a recipe — copied from
anywhere, in whatever order they came in. The AI reads through it
**once, when you save it**, and restructures it into a clean, guided
sequence:

- If the recipe has genuinely separable components (three cake
  batters, a filling plus a topping), it splits into labeled parts —
  first the full ingredient list, then "Now let's start with the
  white one," with that part's own ingredients and steps, then on to
  the next part.
- Adds a **timer** to any step with a duration ("bake for 25
  minutes"), a **tip** where genuinely useful, and a **temperature
  conversion** when a step names one (°F ↔ °C).
- If no Gemini key is configured yet, or the AI call fails, the
  recipe still saves — it just falls back to one step per pasted
  line, no smart restructuring. Nothing is ever blocked on the AI.

**This only happens once**, at save time — the result is stored, so
cooking it later never calls the AI again; it just plays back what
was already organized.

Cook Mode itself is **Back/Next buttons only, no voice input** — each
screen (ingredients, part intros, individual steps) is read aloud
automatically via `speechSynthesis` (broad browser support) the
moment it appears, and a step with a timer shows a **Start timer**
button with a live countdown.

## Family AI — a private assistant per person, with a 3-tier fallback

Each family member gets their **own private conversation** with the
AI. Two different kinds of "memory," deliberately:

- **The conversation itself** lives only in that browser tab's memory
  for as long as you're on the AI tab — it remembers everything you've
  said in the current visit, so follow-up questions work naturally.
  Leave the tab (or reload) and it starts over blank. Nothing about
  what any individual person asks the AI is stored anywhere, or
  visible to anyone else.
- **Family facts** (below) are the opposite: permanent, shared, and
  known to the AI from the very first message of every new
  conversation, for everyone.

### Three providers, tried in order — every AI feature uses this chain

Both the Family AI chat and Recipes' auto-organizing call the same
chain: **Gemini → Groq → Puter**, first success wins. If Gemini's
free-tier usage runs out for the day, it quietly moves to Groq;
if that's also unavailable, it falls through to Puter — which needs
no host-managed key at all, so there's always something that works.

1. **Gemini** (tried first) — **[Google AI Studio](https://aistudio.google.com/apikey)**,
   sign in with any Google account, click **Create API key**. No
   payment info needed.
2. **Groq** (tried second) — **[console.groq.com](https://console.groq.com)**,
   free signup, generate an API key. Groq runs open models on custom
   chips and is extremely fast, though generally a notch behind
   Gemini's answer quality.
3. **Puter** (last resort, always on) — needs **nothing from the
   host**. It's built into the app already (a script tag, nothing to
   configure). The trade-off: each family member does a quick, free,
   one-time sign-in with their own Puter account **the first time
   Puter actually gets used** (only when both Gemini and Groq have
   failed or aren't configured) — Puter calls this the "User-Pays"
   model, so nobody manages a shared key for it, but there's a small
   individual step instead.

**One-time host setup:** open the **AI** tab → **Manage facts & API
key** (host-only) → paste the Gemini key, the Groq key, or both (or
neither, and let Puter carry everything) → **Save keys**.

The same screen lets the host add **facts** ("Grandma's birthday is
June 3rd," "we're vegetarian on Fridays," whatever's useful) — every
conversation, for every person, includes the current fact list from
its very first message regardless of which of the three providers
answered it, and the host can remove a fact any time to correct it.

**Worth knowing:** both keys are stored in Firestore under the same
trust model as everything else in this app (any approved family
member's device can read them, since that's also what lets their
browser call Gemini/Groq directly) — consistent with the rest of the
app, not a new kind of exposure. Both free tiers have real rate
limits (a handful of requests per minute); that's exactly what the
fallback chain is for — if one's momentarily exhausted, the next
tier picks it up automatically.

## Integrations — two separate upload providers, on purpose

The Host tab's **Integrations** section has two cards, kept
deliberately separate rather than sharing one provider:

- **FEED (Cloudinary)** — up to **4 Cloudinary accounts**, tried in
  order as a fallback chain: if account #1 fails (free quota hit,
  misconfigured, network hiccup), it automatically tries #2, then #3,
  then #4, before giving up. Powers "Upload a file" on Feed posts.
  Reserved for the Feed specifically because it's host-only and
  comfortably handles long videos on the free plan — running multiple
  free Cloudinary accounts as backups is also a legitimate way to
  stretch further past any single account's free-tier limits.
- **CHAT (Supabase Storage)** — Project URL, API key, and a bucket
  name. Powers the photo, video, and tap-to-record voice-message
  buttons in every conversation. Kept separate so everyday chat
  traffic — which *everyone* generates, not just the host — never
  eats into the Cloudinary accounts set aside for long Feed videos.

**The automatic handoff:** until Supabase is set up, Chat quietly
uses the Cloudinary chain as a fallback so those buttons still work
from day one. The moment the host adds Supabase's details, Chat
switches to it automatically — no other change needed. Feed always
uses the Cloudinary chain regardless; that part never changes.

Nothing breaks if neither is set up — the buttons still show, but
tapping them explains that the host needs to add one first, rather
than failing silently.

### Setting up Supabase for Chat — two steps are easy to miss

1. **Settings → API** in the Supabase dashboard → copy the **Project
   URL** and the **anon** key (or the newer **publishable** key —
   Supabase is migrating to `sb_publishable_...`/`sb_secret_...` keys
   through the rest of 2026, but the classic anon key still works
   today and either one goes in the same field). **Never** use the
   `service_role` / secret key here — that one must only ever live on
   a server, and this app has no server.
2. **Storage → New bucket** → name it (e.g. `family-board`) → mark it
   **Public**.
3. **Easy-to-miss part #1:** marking a bucket "Public" only makes
   files *readable* — it does **not** allow uploads. Supabase Storage
   uses Postgres Row Level Security, and by default no uploads are
   allowed at all until you add a policy. Open the bucket →
   **Policies** → **New policy** → pick the template for **INSERT** →
   allow it for the **anon** role → Save. Skip this and uploads will
   fail with a "row-level security policy" error — same shape of
   mistake as forgetting to publish Firestore rules earlier in this
   README, just Supabase's version of it.
4. **Easy-to-miss part #2 (new):** the 1:1 chat space-saving feature
   below also needs a **DELETE** policy on the same bucket, for the
   same **anon** role — otherwise it'll just silently fail to free up
   space (harmlessly; nothing breaks, you just won't get the storage
   savings). Same Policies screen, same steps, template for DELETE
   instead of INSERT.
5. Paste the Project URL, key, and bucket name into the Host tab.

**Why these specific fields, not a raw API key everywhere:**
Cloudinary's real API key needs a matching secret to "sign" each
upload, and that secret can only safely live on a server — never in
browser code anyone can inspect. An **unsigned upload preset**
sidesteps that: a preset configured once in the dashboard that's
allowed to accept uploads and nothing else. Supabase's anon/publishable
key is meant to be used directly from browser code by design — Row
Level Security policies (step 3 above) are what actually decide what
that key is allowed to do, rather than the key itself being secret.
Both are the standard way to do uploads without a backend server, not
a shortcut.

Voice messages use the browser's built-in `MediaRecorder` API (tap to
start, tap again to stop) — supported in Chrome, Edge, and Safari.
Where it isn't available, the button explains that plainly rather
than doing nothing.

**If you want to swap either provider out later** — each one is a
single function, `uploadToCloudinary()` or `uploadToSupabase()`, so
swapping means changing that one function, not touching Feed or Chat.

## Chat retention & space-saving — what actually happens, honestly

Three separate rules, all "lazy" (checked whenever someone opens a
chat, since there's no server to run them on a schedule):

- **All text messages, everywhere, delete after 30 days.** No
  exceptions, no placeholder — the message is just gone.
- **Media in Family Chat and any custom group** (not 1:1s) turns into
  a text placeholder ("📷 Photo (expired after 5 days)") after 5 days,
  whether or not anyone downloaded it.
- **Media in genuine 1:1 chats** works differently, closer to how
  WhatsApp actually behaves: the first time the recipient's device
  loads a photo, video, or voice message, it downloads and caches the
  actual file in the browser's local storage (IndexedDB) — future
  views of that same message use the local copy, no re-downloading.
  Once it's safely cached, the app tries to delete the file from
  cloud storage to free up space.

**The honest limit, worth understanding:** that last point — actually
freeing up storage — only works when the file was uploaded to
**Supabase**. Deleting a file from Cloudinary for real (not just the
10-minute client-side delete token Cloudinary offers, which is far
too short a window for this) requires an API secret that must live on
a server, and this app doesn't have one — putting that secret in
browser code would let anyone inspecting the page delete your entire
Cloudinary account's files, not just one. So: for chat media that
went through Supabase (the default, once it's set up), the file
really is removed from cloud storage after download. For chat media
that fell back to Cloudinary (Supabase not yet configured), the
message still turns into a placeholder on schedule, and the local
device that downloaded it keeps working fine — the file just isn't
actually erased from Cloudinary's storage in that case.

**One real trade-off to know about:** once a 1:1 photo/video is freed
from cloud storage, it only exists on whichever devices already
cached it locally. If the recipient later reinstalls, clears their
browser data, or opens the chat on a different device, they'll see
"Only saved on the device that first opened it" instead of the media.
This mirrors how real WhatsApp media works, not a bug — it's the
direct trade-off of actually freeing up storage rather than keeping
everything forever.

## Firebase setup

### Firestore
- **Firestore Database → Create database** → production mode.
- **Firestore → Rules** → paste, then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
- **Authentication → Sign-in method → enable Anonymous.** Every
  device signs in anonymously behind the scenes just so it's allowed
  to talk to Firestore — it has nothing to do with who the person
  says they are (that's the separate name/phone/PIN system below).
  **This is the single most common cause of sign-in hanging on
  "Loading…"** — if it's off, you'll now get a clear error message
  instead, telling you exactly this.

This app no longer uses Firebase Storage at all — Firestore alone is
enough for everything, and Firestore's free Spark-plan quota is
generous for a family's worth of chat/calendar/feed/recipes/AI-chat
traffic.

### Good to know: this is trust-based, not lockdown-secure
The rule above lets any signed-in device read and write anything —
approval, host status, and who-can-delete-what are enforced by the
app's own screens, not the database. That's the right trade-off for a
real family who has the passcode, but someone opening their browser's
dev console could, in principle, edit their own Firestore record
directly. Stricter server-side rules are possible later if that ever
matters for your family.

## Emergency Chat — a break-glass fallback, independent of Firebase

If Firestore or Firebase Auth itself ever breaks, the entire normal
sign-in flow breaks with it — so a real fallback can't live inside
the normal app. **Emergency Chat** is a separate, minimal channel with
zero Firebase dependency: it talks directly to a Google Sheet via a
Google Apps Script Web App.

**What it is, honestly:** one shared text-only room, no photos/video,
no multiple conversations, no real-time push (it polls every 8
seconds since Sheets can't do live updates). It's meant purely so the
family can still say "the app's down, here's what's going on" during
an outage — not a replacement for the real Chat.

**Where to find it:** a small "Can't sign in? Emergency Chat" link on
the gate screen (for when Firebase itself is unreachable and you
can't even sign in), and a small warning-triangle icon in the top bar
once you're in the app (for when something breaks mid-session).

### Setup (one-time, ~3 minutes)

1. Open `emergency-chat-apps-script.gs` (included alongside this
   README) — it has full setup steps in its own comments.
2. Short version: open a Google Sheet → Extensions → Apps Script →
   paste that file's contents in → Deploy → New deployment → Web app →
   Execute as **Me**, access **Anyone** → Deploy → copy the URL it
   gives you.
3. In `index.html`, find `const EMERGENCY_SHEETS_URL = "";` near the
   top of the `<script>` block and paste the URL between the quotes.

**Why this lives in the code, not Firestore:** every other integration
in this app (Cloudinary, Supabase, Gemini) stores its settings in
Firestore, editable from the Host tab without touching code. Emergency
Chat is the one deliberate exception — its whole purpose is working
when Firestore doesn't, so its config has to live somewhere that
doesn't depend on Firestore being up.

**On identity:** Emergency Chat only asks for a name, no approval
queue — intentionally more relaxed than the rest of the app, since
during a real outage the priority is "family can talk to each other,"
not access control. Anyone with the app URL and the family passcode
context could theoretically use it, which is an acceptable trade-off
for a break-glass channel, not a normal one.

## Signing in as host

Two independent ways — both work, on purpose:

1. **Phone match.** In `index.html`'s `<script>`, near the top, set
   `HOST_PHONE` to your own number. Whoever registers with that
   number becomes host automatically, no approval needed.
2. **PIN fast-track (for the host's own first sign-in).** On the gate
   screen there's a small, low-opacity key icon in the bottom-right
   corner — easy to miss on purpose. Tapping it and entering the PIN
   (`1239`, set as `HOST_PIN` near the top of the same script) skips
   the family question *and* the approval queue entirely and signs
   that device in as host right away. If you're not registered on
   that device yet, it'll ask for your name (and optionally phone)
   once.

## If sign-in gets stuck on "Loading…" or shows an error

Every screen shows a real error message with a **Try again** button
now instead of hanging. Common causes, in the order you'll likely hit
them on a brand-new Firebase project:

- **"Authentication hasn't been turned on..." (`auth/configuration-not-found`)**
  — Authentication was never initialized for this project at all. Go
  to **Authentication** in the Firebase Console and click **Get
  started** once, then enable **Anonymous** under Sign-in method.
- **"Anonymous sign-in isn't turned on..." (`auth/operation-not-allowed`)**
  — Authentication is set up, but the Anonymous provider specifically
  is off. **Authentication → Sign-in method → Anonymous → enable**.
- **A message about security rules** — make sure the relevant rules
  (Firestore and/or Storage, below) are pasted in **and published** —
  there's a Publish button; pasting alone isn't enough.

## Deploying to GitHub Pages

1. Create a new GitHub repo, push this whole folder to it.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** →
   branch `main`, folder `/ (root)`. Save.
3. GitHub gives you a URL like `https://yourname.github.io/repo-name/`.
   Open it — you'll land on the family passcode question.
4. On a phone, open that URL and use **"Add to Home Screen"** — it
   installs like an app using `manifest.json`.

## Notes on the two Firebase projects you set up

`index.html`'s `firebaseConfig` currently points at `fam-pwa` (your
primary project). Your `fam-pwa-2` config is your backup — the two
projects have **separate Firestore databases**, so switching means
switching to an empty chat/calendar/feed unless you export and
re-import the data.
