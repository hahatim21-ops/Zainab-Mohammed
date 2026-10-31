# Zainab & Mohammed Nikah Invite: Claude Code Build Prompt

## Goal

Build a mobile-first, single-page wedding invitation website that plays like a short interactive film.

The guest taps the wax seal and the petals open. A ribbon then ties itself into a bow. One tap reveals the date with confetti. After that the guest scrolls through the countdown, the Nikah details, the Dinner details and the couple. Every scene blends into the next while scrolling.

Mood: slow, elegant, luxurious. Palette: ivory, champagne gold, sage green, olive-brown.

Do NOT set up GitHub or Vercel yet. I will provide those later, but build it Vercel-ready.

## Assets

All files are in the `assets` folder. Open every image first and confirm it matches the description before building. All images are 9:16 portrait.

| File | Scene | What it shows |
| --- | --- | --- |
| 01-seal | 1 | Cream petal envelope with a sage wax seal "Z&M" |
| 02-bow | 2 | Lace curtains, a large ivory lace bow, steps, lanterns |
| 03-date | 3 | "Tap to reveal the Date!", "14 NOVEMBER 2026" and Arabic إن شاء الله |
| 04-countdown | 4 | Same background as 03, with "Countdown … until the big day!" |
| 05-nikah | 5 | Mosque sketch; "Nikah, After Namaz-e-Asar, 4:00 PM, At Jama Masjid, Nallasopara West" |
| 06-dinner | 6 | "Followed by Dinner, 9:00 PM onwards, at our residence" |
| 07-couple | 7 (finale) | Chandelier; "Memon's & Chunawala's, Zainab & Mohammed, 14 November 2026" |
| music.mp3 | All | Background music |

## Tech stack and project structure

Use Vite with vanilla JS (no framework), plus GSAP with ScrollTrigger, Lenis for smooth scroll, and canvas-confetti.

- `npm run build` outputs a static `dist/` folder that Vercel can deploy as-is.
- Add `scripts/optimize-images.mjs` using sharp. It generates WebP at 1080×1920 (quality about 82) plus a JPG fallback, served with `<picture>`. Copy the music to `public/audio/`.
- Put all editable details in `src/config.js`: couple names, event datetime `2026-11-14T16:00:00+05:30`, `MAP_URL`, music path, and a site URL placeholder.
- Folder layout: `index.html`, `src/main.js`, `src/scenes/` (one file per scene), `src/effects/` (petals, sparkles, confetti, glows), `src/styles/`, `src/config.js`, `public/images/`, `public/audio/`.
- Write a README covering how to run it, how to edit the config, and a placeholder for deployment steps.

## Layout system (critical for alignment)

Every overlay must stay locked to the artwork on every screen size.

- Each image sits in a "stage" locked to the image's aspect ratio and sized to fit fully inside the viewport (contain). Never crop the artwork, because some text sits near the edges.
- Fill the leftover space with a blurred (about 40px), slightly brightened copy of the same image covering the viewport, so it looks seamless. This covers top and bottom on tall phones and the sides on desktop.
- Position all overlays (tap targets, veil, countdown, button, glows) absolutely inside the stage, using percentages of the image.
- The coordinates in this document are estimates. Verify them against the actual images and fine-tune.
- Use `100svh`/`100dvh` and safe-area insets. No horizontal scroll.
- Desktop shows the same experience, centred.

## Scenes 0–2: loader, seal, bow

### Scene 0: Loader

Show an ivory screen with a "Z & M" monogram drawn in with a gold stroke animation and a thin progress line. Preload all images and the audio, then fade into Scene 1.

### Scene 1: Wax seal and petals opening (TAP on the seal)

- Scroll is locked. Seal centre is at about (50%, 54%), with a diameter of about 18% of the image width.
- Add a soft pulsing gold glow ring around the seal. Below the envelope (about y 88%), show "Tap the seal to open" in an italic serif, gently breathing.
- Make the hit area at least 1.5× the size of the seal.
- Idle motion: a very slow zoom and a few drifting petals.
- On tap:
  1. Start the music, fading volume from 0 to 0.6 over 3 seconds. Call `navigator.vibrate(30)` where supported.
  2. The seal presses in (scale 0.92), then cracks into two halves using clip-path on a copy of the seal region. The halves rotate apart and fall away with a few wax crumbs.
  3. The petals open. Make layered copies of the image, each clipped to a petal-shaped wedge radiating from the seal (about 6–8 wedges following the real fold lines in the image). With CSS 3D perspective, each wedge rotates outward and back (hinged near the centre), scales up and fades. Stagger from the inner folds to the outer petals, like a flower blooming open.
  4. At the same time, 25–40 ivory SVG petals burst out from the centre and float down. A warm light bloom from the centre reveals Scene 2 underneath.
- Total time about 2.5 seconds, with expo or power2 easing.

### Scene 2: Ribbon ties into a bow (AUTOMATIC, right after the petals)

- 02-bow starts slightly zoomed (scale 1.08) and soft (blur about 8px, slightly brighter), so the photo's bow is muted.
- An SVG overlay draws two satin ribbon strands: ivory-to-champagne gradient, a subtle lace-scallop edge and a soft shadow.
- The strands slide in along the lace tails in the image, from the lower left (about 14%, 62%) and lower right (about 88%, 66%), to the knot at about (50%, 39%).
- Using stroke-dashoffset path drawing and/or morphing, they cross and form two loops (spanning about 31–70% x and 34–44% y). Then the knot cinches with a small elastic tighten.
- As it cinches, the image sharpens (blur to 0, scale to 1) and the drawn ribbon dissolves into the real bow in the photo. Add a sparkle burst at the knot, and let the tails sway once.
- Ambient afterwards: flickering warm glows (radial gradients, `mix-blend-mode: screen`) on the candle lanterns by the steps and the hanging lanterns in the archway. Find their positions in the image. Add slow drifting petals.
- Then show a "Scroll" hint (animated chevron and small text) and unlock scrolling.
- Total tie time about 3–3.5 seconds.

## Scenes 3–4: date reveal and countdown

### Scene 3: Date reveal (ONE TAP anywhere, with confetti)

- Transition from the bow: on scroll, the camera pushes forward through the archway (scale up toward about (50%, 45%) with a slight blur) and dissolves into 03-date.
- The date and إن شاء الله are printed in the image, at about x 22–90% and y 47–62%. Hide them under a golden veil:
  - a feathered-edge panel (use mask-image so it is never a hard box)
  - backdrop blur with an ivory/champagne gradient
  - a slow shimmer sweep and tiny twinkling gold sparkles
- "Tap to reveal the Date!" above the veil must stay visible. Pulse a small tap icon.
- Scroll stays locked until the tap. One tap anywhere on the screen triggers:
  1. The veil dissolves (blur and opacity to 0, sparkles scatter) and the date gets a soft glow bloom.
  2. Confetti fires from both sides: two canvas-confetti cannons at the left and right edges (origin x 0 and 1, y about 0.65, angles about 60° and 120°), with 2–3 bursts over about 1.5 seconds. Colours: #F8F1E4, #E9D9B8, #C9A96E, #9AA07A, #6E6245. Mix squares, circles and petal shapes. Call `navigator.vibrate(40)`.
  3. After about 1.5 seconds, the scroll hint returns and scrolling unlocks.

### Scene 4: Countdown

- 04-countdown has the same background as 03-date. Use a plain crossfade with the camera still, so it looks like only the text changes.
- Show a live countdown to 14 November 2026, 4:00 PM IST (from config) in the empty space between "Countdown" and "until the big day!".
- Centre it at about (55%, 47%), with a maximum width of about 64% of the image (x about 24–88%). The image text sits slightly right of centre because of the curtain, so align with that text.
- Units: Days · Hours · Minutes · Seconds.
  - Numbers in Cormorant Garamond 600 with tabular figures.
  - Labels in small, letter-spaced Cinzel caps.
  - Colour #6E6245 to match the artwork, with thin gold hairline separators.
- Digits change with a soft flip or roll animation. The units stagger-fade up when the scene enters.
- When the countdown reaches zero, or the date has passed, replace it with "Today is the day — Alhamdulillah" in script.

## Scenes 5–7: Nikah, Dinner, couple

### Scene 5: Nikah

- Transition: a watercolour-style bloom. The image is revealed through an expanding, soft, organic radial mask from the centre, with a slight scale settle.
- Add a map button below the venue text, at about (50%, 80%):
  - a pill with a thin gold border and a translucent ivory fill
  - a map-pin icon and "VIEW LOCATION" in Cinzel
  - opens `MAP_URL` in a new tab
  - fades up once the scene settles
- Default `MAP_URL`: https://www.google.com/maps/search/?api=1&query=Jama+Masjid+Nallasopara+West (I may replace it with an exact pin later).
- Ambient: slow zoom and drifting petals.

### Scene 6: Dinner

- Transition: the Nikah image drifts up with parallax while the Dinner image rises and fades in from below. It should feel like turning a page of the same watercolour painting.
- No buttons. Ambient: slow zoom and drifting petals.

### Scene 7: Couple (finale)

- Transition: a warm golden light-leak dissolve.
- The chandelier sits at about (58%, 15%). Add flickering glows on each candle flame (tune the positions) and occasional sparkle twinkles on the crystals.
- Every few seconds, a slow gold shimmer sweeps across "Zainab & Mohammed" (band at about y 58–65%, centred at x about 58%). Use a gradient overlay masked to that band, with blend mode soft-light or overlay.
- Petals keep drifting.
- At the very end, add a subtle "↺ Watch again" link that returns to the top and replays from the seal.

## Global motion and polish

- Scroll engine: use stacked fixed scene layers driven by scrubbed GSAP ScrollTrigger timelines, not images stacked vertically. Give each scene about 1–1.5 screens of scroll so transitions feel cinematic. Use Lenis smooth scroll, and stop/start it for the scroll locks on Scenes 1 and 3.
- Floating petals on a canvas layer (12–20 on mobile), paused when the tab is hidden.
- Gentle Ken Burns on every scene (scale 1 to 1.04).
- Animate only transform, opacity and filter. Keep it at 60fps on mid-range Android. Use backdrop-filter only on the veil.
- Fonts (Google Fonts): Cormorant Garamond, Cinzel and Pinyon Script, to match the artwork.
- Palette tokens: ivory #F8F1E4, cream #EFE3CC, champagne #C9A96E, sage #9AA07A, olive-brown #6E6245, warm brown #7B5B3B.
- Music toggle: a small fixed circle at the top right (gold outline, ivory glass) with animated equalizer bars while playing. Tapping it mutes and unmutes. Loop the track. Pause when the tab is hidden and resume on return if it was playing.
- Respect `prefers-reduced-motion`: use simple fades instead of 3D and particles, and reduce the confetti.
- Accessibility: alt text on each image containing its event details, aria-labels on buttons, and visible focus styles.
- Prevent double-tap zoom and long-press image saving on the interactive scenes (`touch-action: manipulation`, `-webkit-touch-callout: none`, `user-select: none`) without breaking scrolling.
- Leave the "@bespokedesigns.\_" credit in the artwork untouched.

## WhatsApp sharing preview

The link will mostly be shared on WhatsApp, so the preview card matters.

- Page title: "Zainab & Mohammed · Nikah · 14 November 2026".
- Description: "You're invited to the Nikah of Zainab & Mohammed — 14 November 2026, Jama Masjid, Nallasopara West".
- Add Open Graph and Twitter tags, with a 1200×630 `og-image.jpg` generated from the couple image (names centred).
- Keep the absolute `og:url` and `og:image` as placeholders in config, to fill in after the Vercel link exists.
- Add a Z&M monogram favicon and `theme-color` #F8F1E4.

## Build and test process

1. View all 7 images, confirm the file-to-scene mapping, and measure the overlay coordinates.
2. Give me a short plan, then build scene by scene.
3. Run `npm run dev` and test at 360×640, 390×844, 430×932 and 1440×900 (take Playwright screenshots if available). Check that:
   - every overlay lines up with the artwork
   - the seal tap and the date tap work
   - audio starts on the seal tap, including on iOS Safari
   - there is no horizontal scroll
4. `npm run build` must succeed with no console errors.
5. Stop there. Do not set up GitHub or Vercel yet; I will provide those next.
