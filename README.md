# Bearing — deployment guide

This is a static site: no build step, no server, no database. Every file
in this folder just needs to be hosted somewhere that serves plain files
over HTTPS. GitHub Pages is the easiest free option and is what similar
apps (like the Rise example we looked at) use.

## Files in this folder

- `index.html` — the app shell (loads Tailwind, React, and app.js from CDN)
- `app.js` — the compiled app (originally written as JSX, precompiled to
  plain JavaScript so no build tool is needed to run it)
- `manifest.json` — tells the browser this is installable, sets the name/icons
- `sw.js` — service worker; caches the app shell so it loads offline after
  the first visit, and is one of the requirements browsers check before
  offering to install a PWA
- `icons/` — app icons at the sizes iOS/Android/manifest expect

## Deploy via GitHub Pages (recommended)

1. Create a new GitHub repository (public repos get free Pages hosting).
2. Upload every file in this folder to the repo, **keeping the folder
   structure** (the `icons/` folder needs to stay a subfolder, not get
   flattened).
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source: Deploy from a branch**,
   branch: `main`, folder: `/ (root)`. Save.
5. GitHub gives you a URL like `https://yourusername.github.io/bearing/`
   — that's the live link. It can take a minute or two to go live the
   first time.

## Installing it on a phone

1. Open the GitHub Pages URL in Safari (iOS) or Chrome (Android).
2. **iOS**: tap the Share icon → **Add to Home Screen**.
   **Android/Chrome**: you should see an **Install** button in the app's
   own header (top right) — tap it. If it doesn't appear, use the
   browser's menu → **Add to Home Screen** / **Install app**.
3. It now behaves like a normal installed app: its own icon, opens full
   screen with no browser address bar, works offline after the first load.

## What's different from the Claude-artifact version

- **Storage**: uses the browser's own `localStorage` instead of Claude's
  artifact storage API. This means data is tied to *that specific
  browser on that specific device* — no account, no sync between
  devices, and no way for you to see someone else's data (or vice versa)
  even if you're both using the exact same hosted URL. Each person who
  installs it gets a fully independent copy of their own data.
- **No COROS/AI sync**: that feature depended on Claude's API and your
  MCP connector, neither of which exist outside Claude. Manual entry only
  here — this was already true of the Claude-artifact version by the time
  we got here, so nothing changed on this front.
- **Charts**: rebuilt as plain SVG instead of the Recharts library, since
  Recharts' CDN bundle has a documented history of failing depending on
  version/load order, and there's no way to test that reliably without a
  live server. The hand-rolled version has no external dependency at all.
- **First run**: shows a proper onboarding screen (maxes, VDOT, rep
  capacities, day-1, theme) before ever showing the tabbed app — matches
  the "Setup" flow pattern from Rise. Reachable again anytime from
  Setup → "Run setup again."

## If something breaks

The riskiest external dependency here is the Tailwind CDN script (used
only for layout/spacing utilities — all of Bearing's actual colors come
from its own theme system, not Tailwind's palette). If layout looks
broken but colors/data are fine, that's the first thing to check — it
requires being online to load, so it won't work fully offline on a first
visit before the service worker has cached things.
