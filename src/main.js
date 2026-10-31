import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/scenes.css';
import './styles/ui.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { EVENT_DATETIME, MAP_URL, MUSIC_SRC, MUSIC_VOLUME } from './config.js';
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
import { initPages, TOTAL } from './scenes/pages.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const scenes = {
  seal: $('#s-seal'),
  bow: $('#s-bow'),
  date: $('#s-date'),
  countdown: $('#s-countdown'),
  nikah: $('#s-nikah'),
  dinner: $('#s-dinner'),
  couple: $('#s-couple'),
};

// ── Music toggle ───────────────────────────────────────────────
const music = new Music(MUSIC_SRC, MUSIC_VOLUME);
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
  const countdown = initCountdown(scenes.countdown, { target: EVENT_DATETIME, reduced });
  const nikah = initNikah(scenes.nikah, { mapUrl: MAP_URL });
  initDinner(scenes.dinner);
  const couple = initCouple(scenes.couple, { reduced, onReplay: replay });

  // Gentle Ken Burns on every painting (1 → 1.04).
  if (!reduced) {
    Object.values(scenes).forEach((s, i) => {
      if (s === scenes.seal) return;
      gsap.fromTo(s.querySelector('.kb'), { scale: 1 }, { scale: 1.04, duration: 16 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  }

  initPages({
    pages: [scenes.date, scenes.countdown, scenes.nikah, scenes.dinner, scenes.couple],
    reduced,
    countdownItems: countdown.items,
    mapBtn: nikah.button,
    replayBtn: couple.replay,
    onCoupleEnter: couple.start,
    scroll,
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

  // ── Scene 2: the bow pulls tight, holds, then unties onto the date ──
  await bow.tie();
  petals.setCount(14);
  await wait(reduced ? 0.8 : 1.4);
  const dateIntro = scenes.date.querySelector('.intro');
  if (!reduced) gsap.fromTo(dateIntro, { scale: 1.1 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
  await bow.untie();
  $('#intro').remove();

  // ── Scene 3: one tap anywhere reveals the date, then the pages scroll ──
  const onDateTap = async (e) => {
    if (date.revealed || e.target.closest?.('#music')) return;
    e.preventDefault();
    document.removeEventListener('click', onDateTap, true);
    await date.reveal();
    scroll.allow(TOTAL);
    scroll.unlock();
    scroll.hint(true);
  };
  document.addEventListener('click', onDateTap, true);
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
