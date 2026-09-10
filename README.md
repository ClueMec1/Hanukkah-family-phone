# Family Board

A family-only PWA: an open photo/video/audio feed, WhatsApp-style chat,
a shared calendar, a host-curated media board, and host approvals —
all in **one file**, `index.html`.

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

## Recipes — hands-free, voice-guided cooking

Anyone can add a recipe: title, a list of ingredients, a list of
steps. Tap a recipe to expand it, then **Start cooking** for a
full-screen, read-aloud mode:
- Each step is spoken aloud automatically (`speechSynthesis` — broad
  browser support).
- Say **"okay"** (or "next") to move to the next step, **"ingredients"**
  to have them read back to you, **"repeat"** to hear the current step
  again, or **"back"** to go to the previous one. This uses
  `SpeechRecognition`, which is Chrome/Edge/Safari-only — Firefox
  doesn't support it. When it's unavailable (or the microphone is
  denied), the same on-screen buttons (Back / Ingredients / Repeat /
  Next) always work, so cook mode never *requires* voice.

## Family AI — a shared assistant with real family memory

One shared conversation everyone in the family can talk to, using
**Google's Gemini API** — genuinely free, no billing/credit card
required for the free tier.

**One-time host setup:**
1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)**
   and sign in with any Google account.
2. Click **Create API key** — no payment info needed for the free
   tier.
3. In the app, open the **AI** tab → **Manage facts & API key**
   (only visible to the host) → paste the key → **Save key**.

The same screen lets the host add **facts** ("Grandma's birthday is
June 3rd," "we're vegetarian on Fridays," whatever's useful) — every
message sent to the AI includes the current fact list, so it can
actually use them, and remove a fact any time to correct it.

**Worth knowing:** the API key is stored in Firestore under the same
trust model as everything else in this app (any approved family
member's device can read it, since that's also what lets their
browser call Gemini directly) — consistent with the rest of the app,
not a new kind of exposure. The free tier has real rate limits (a
handful of requests per minute); if the family AI ever replies with a
rate-limit error, wait a minute and try again.

## Integrations — two separate upload providers, on purpose

The Host tab's **Integrations** section has two cards, kept
deliberately separate rather than sharing one provider:

- **FEED (Cloudinary)** — the host's cloud name + unsigned upload
  preset. Powers "Upload a file" on Feed posts. Reserved for the Feed
  specifically because it's host-only and comfortably handles long
  videos on the free plan.
- **CHAT (Supabase Storage)** — Project URL, API key, and a bucket
  name. Powers the photo, video, and tap-to-record voice-message
  buttons in every conversation. Kept separate so everyday chat
  traffic — which *everyone* generates, not just the host — never
  eats into the Cloudinary quota set aside for long Feed videos.

**The automatic handoff:** until Supabase is set up, Chat quietly
uses Cloudinary as a fallback so those buttons still work from day
one. The moment the host adds Supabase's details, Chat switches to it
automatically — no other change needed. Feed always uses Cloudinary
regardless; that part never changes.

Nothing breaks if neither is set up — the buttons still show, but
tapping them explains that the host needs to add one first, rather
than failing silently.

### Setting up Supabase for Chat — one step is easy to miss

1. **Settings → API** in the Supabase dashboard → copy the **Project
   URL** and the **anon** key (or the newer **publishable** key —
   Supabase is migrating to `sb_publishable_...`/`sb_secret_...` keys
   through the rest of 2026, but the classic anon key still works
   today and either one goes in the same field). **Never** use the
   `service_role` / secret key here — that one must only ever live on
   a server, and this app has no server.
2. **Storage → New bucket** → name it (e.g. `family-board`) → mark it
   **Public**.
3. **The easy-to-miss part:** marking a bucket "Public" only makes
   files *readable* — it does **not** allow uploads. Supabase Storage
   uses Postgres Row Level Security, and by default no uploads are
   allowed at all until you add a policy. Open the bucket →
   **Policies** → **New policy** → pick the template for **INSERT** →
   allow it for the **anon** role → Save. Skip this and uploads will
   fail with a "row-level security policy" error — same shape of
   mistake as forgetting to publish Firestore rules earlier in this
   README, just Supabase's version of it.
4. Paste the Project URL, key, and bucket name into the Host tab.

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
