import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/scenes.css';
import './styles/ui.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { EVENT_DATETIME, MAP_URL, MUSIC_SRC, MUSIC_START, MUSIC_VOLUME } from './config.js';
import { Music } from './core/audio.js';
import { createScroll } from './core/scroll.js';
import { Petals } from './effects/petals.js';
import { runLoader } from './scenes/loader.js';
import { initSeal } from './scenes/seal.js';
import { initBow } from './scenes/bow.js';
import { initDate } from './scenes/date.js';
import { initCountdown } from './scenes/countdown.js';
import { initNikah } from './scenes/nikah.js';
import { initDinner } from './scenes/dinner.js';
import { initCouple } from './scenes/couple.js';
import { initPages } from './scenes/pages.js';
import { introDone } from './core/introGate.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const scenes = {
  seal: $('#s-seal'),
  bow: $('#s-bow'),
  names: $('#s-names'),
  date: $('#s-date'),
  nikah: $('#s-nikah'),
  dinner: $('#s-dinner'),
  couple: $('#s-couple'),
};

// ── Music toggle ───────────────────────────────────────────────
const music = new Music(MUSIC_SRC, MUSIC_VOLUME, MUSIC_START);
if (import.meta.env.DEV) window.__music = music;
const musicBtn = $('#music');
music.onChange((m) => {
  musicBtn.classList.toggle('is-playing', m.playing);
  musicBtn.setAttribute('aria-pressed', String(!m.playing));
  musicBtn.setAttribute('aria-label', m.playing ? 'Mute music' : 'Play music');
});
musicBtn.addEventListener('click', () => music.toggle());

async function start() {
  const quick = sessionStorage.getItem('zm-replay') === '1';
  sessionStorage.removeItem('zm-replay');

  const scroll = createScroll({ reduced });
  scroll.lock();
  scroll.toTop();

  const petals = new Petals($('#petals'), { reduced });

  const bow = initBow(scenes.bow, { reduced });
  const date = initDate(scenes.date, { reduced });
  const countdown = initCountdown(scenes.date, { target: EVENT_DATETIME, reduced });
  initNikah(scenes.nikah);
  const dinner = initDinner(scenes.dinner, { mapUrl: MAP_URL });
  const couple = initCouple(scenes.couple, { reduced, onReplay: replay });

  // Gentle Ken Burns on the bow (the pages get theirs while on screen).
  if (!reduced) gsap.fromTo(scenes.bow.querySelector('.kb'), { scale: 1 }, { scale: 1.04, duration: 17, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  initPages({
    pages: [scenes.names, scenes.date, scenes.nikah, scenes.dinner, scenes.couple],
    reduced,
    countdownItems: countdown.items,
    mapBtn: dinner.button,
    replayBtn: couple.replay,
    onCoupleEnter: couple.start,
  });

  await runLoader({ music, reduced, quick });

  // ── Scene 1: the seal lifts and the flower opens ──
  petals.setCount(5);
  petals.start();
  await initSeal(scenes.seal, {
    reduced,
    reveal: scenes.bow,
    onTap: () => {
      music.start();
      if (music.available) {
        musicBtn.hidden = false;
        requestAnimationFrame(() => musicBtn.classList.add('is-visible'));
      }
    },
  });

  // ── Scene 2: the bow forms, holds a moment, then opens by itself onto
  //    the names card — no tap needed ──
  await bow.tie();
  petals.setCount(14);
  await wait(reduced ? 0.4 : 0.95); // the finished bow holds a moment
  const namesIntro = scenes.names.querySelector('.intro');
  if (!reduced) gsap.fromTo(namesIntro, { scale: 1.1 }, { scale: 1, duration: 1.9, ease: 'power2.out' });
  introDone(); // the names card shows (and its effects start) as the curtains part
  await bow.untie();
  // Hide the finished opening now; remove it once the browser is idle.
  const introEl = $('#intro');
  introEl.style.display = 'none';
  (window.requestIdleCallback || setTimeout)(() => introEl.remove());

  // ── The pages: one continuous scroll ──
  scroll.unlock();
  // A clear "Scroll down" box on the names card; the small hint at the
  // bottom of the screen only returns if the guest pauses further down.
  const cta = scenes.names.querySelector('.scroll-cta');
  gsap.fromTo(cta, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.5, ease: 'power2.out', onComplete: () => cta.classList.add('is-live') });
  cta.addEventListener('click', () => scroll.lenis.scrollTo(scenes.date, { duration: 1.6 }));
  scroll.hint(true, false);

  // A tap anywhere on the date page reveals the date.
  scenes.date.addEventListener('click', (e) => {
    if (date.revealed) return;
    e.preventDefault();
    date.reveal();
  });
}

function replay() {
  gsap.to('#curtain', {
    opacity: 1,
    duration: 0.9,
    ease: 'power2.inOut',
    onComplete: () => {
      sessionStorage.setItem('zm-replay', '1');
      window.scrollTo(0, 0);
      window.location.reload();
    },
  });
}

start();
