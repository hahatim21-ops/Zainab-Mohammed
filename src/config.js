// ─────────────────────────────────────────────────────────────
//  Everything you might want to change lives here.
// ─────────────────────────────────────────────────────────────

export const COUPLE = {
  bride: 'Zainab',
  groom: 'Mohammed',
  families: "Memon's & Chunawala's",
};

// Nikah start, in IST. The countdown runs to this moment.
export const EVENT_DATETIME = '2026-11-14T16:00:00+05:30';

// "View location" button on the Dinner page (the residence).
export const MAP_URL = 'https://maps.app.goo.gl/mvNkSHeDNPXRAaBk7?g_st=iw';

// Background music. Bundled by Vite with a content hash in its filename,
// so every new track gets a fresh URL that no phone has cached.
export const MUSIC_SRC = new URL('./assets/audio/music.mp3', import.meta.url).href;
export const MUSIC_VOLUME = 0.6;
// Where the track starts (seconds); it also loops back to this point.
// (music.mp3 is already cut to begin at 0:24 of "Companion of Life".)
export const MUSIC_START = 0;

// Fill these in once the Vercel URL exists — they become the absolute
// og:url / og:image that WhatsApp uses for the link preview.
export const SITE_URL = 'https://zainab-mohammed.vercel.app';
export const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

export const META = {
  title: 'Zainab & Mohammed · Nikah · 14 November 2026',
  description:
    "You're invited to the Nikah of Zainab & Mohammed — 14 November 2026, Jama Masjid, Nallasopara West",
  themeColor: '#F8F1E4',
};
