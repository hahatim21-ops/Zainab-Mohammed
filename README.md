# Zainab & Mohammed — Nikah Invite

A mobile-first, single-page invitation that plays like a short film:
wax seal lifts → the flower opens softly onto the bow → the real lace bow pulls
tight, holds, then unties as the curtains part → tap to reveal the date (golden
wipe + confetti) → then one continuous, scrolling painting: countdown → Nikah →
Dinner → the couple.

Built with Vite (vanilla JS), GSAP + ScrollTrigger, Lenis and canvas-confetti.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, for testing on a phone)
npm run build      # static site in dist/
npm run preview    # serve the built dist/ locally
```

> The scripts call `node node_modules/vite/bin/vite.js …` directly instead of
> `vite …` because the `&` in this folder's name breaks npm's Windows shims.

## Images and music

Source artwork lives in `assets/`. After replacing any of it, run:

```bash
npm run optimize
```

This regenerates `public/images/` (1080×1920 WebP q82 + JPG fallback, plus a small
pre-blurred backdrop per scene), `public/og-image.jpg` (1200×630, names centred), the
PNG icons, and copies the music.

**Music:** put the track at `assets/music.mp3` and run `npm run optimize`
(it lands in `public/audio/music.mp3`). Until it exists the site works silently and the
music button stays hidden.

## Edit the details — `src/config.js`

| Setting | What it does |
| --- | --- |
| `COUPLE` | Names / families |
| `EVENT_DATETIME` | Countdown target (`2026-11-14T16:00:00+05:30`) |
| `MAP_URL` | "View location" button on the Nikah scene |
| `MUSIC_SRC`, `MUSIC_VOLUME` | Track path and final volume (fades 0 → 0.6 over 3 s) |
| `SITE_URL`, `OG_IMAGE_URL` | **Fill in after deploying** — absolute URLs for the WhatsApp preview |
| `META` | Page title, description, theme colour |

The text of each scene is printed in the artwork itself; the code only adds overlays.

## How it's put together

```
index.html            all scenes as fixed, stacked layers (+ share meta tags)
src/main.js           orchestration: loader → seal → bow → scroll film
src/config.js         editable details
src/core/             audio (Web Audio fade, iOS-safe), scroll (Lenis + locks)
src/scenes/           one file per scene, pages.js (scroll), bowGeometry.js (bow outlines)
src/effects/          petals canvas, sparkles, glows, confetti
src/styles/           base (layout system), scenes (overlay positions), ui
scripts/              optimize-images.mjs, screenshots.mjs (QA)
public/images|audio   generated assets
```

**Layout system.** Each artwork sits in a `.stage` locked to 9:16 and fitted inside the
viewport (never cropped). A blurred copy fills the leftover space. Every overlay is
positioned in % of the artwork and sized in `cqw`, so it stays aligned at every
screen size. To nudge an overlay, edit its % in `src/styles/scenes.css` (or the
coordinate constants at the top of `seal.js`, `bow.js`, `couple.js`).

**Opening.** The seal and bow scenes are fixed layers above the pages (`#intro`).
The seal lifts away and the bow scene shows through a growing, feathered rosette
(`seal.js`). The bow is the real one from `02-bow`: `npm run optimize` cuts it into
pieces (tails, loops, knot) using the outlines in `src/scenes/bowGeometry.js` and
rebuilds the background behind it (`02-bow-clean`), so `bow.js` can move the pieces.

**Scroll.** After the date is tapped, every scroll moves the paintings: each new
page slides up with your finger, its top edge a long soft feather that melts over
the page before it, while that page drifts up more slowly and fades. One screen of
scroll = one page change. Timings live in `src/scenes/pages.js`.

## QA screenshots

With `npm run dev` running:

```bash
node scripts/screenshots.mjs screenshots 360x640,390x844,430x932,1440x900
```

(First time only: `node node_modules/playwright/cli.js install chromium`.)

## Deploy

- Live: https://zainab-mohammed.vercel.app
- Repo: https://github.com/hahatim21-ops/Zainab-Mohammed

The Vercel project is connected to the repo, so every push to `main` deploys
automatically. `vercel.json` sets the build command, output folder and caching.
To deploy by hand instead: `vercel --prod`.

After changing the share text or image, re-scrape the link in the Facebook Sharing
Debugger so WhatsApp picks up the new preview.
