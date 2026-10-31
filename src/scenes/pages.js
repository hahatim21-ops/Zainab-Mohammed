import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { twinkleField } from '../effects/sparkles.js';

// The pages (date → couple) read as one continuous painting. Scrolling never
// stops anything moving: each new page slides up with the finger, its
// leading edge a long soft feather that melts over the page before it,
// while that page drifts up more slowly behind it and softens.
//
// One scroll "screen" = one page change, so the motion matches the finger.

export const TOTAL = 4.2; // screens of scroll after the date (4 changes + a short rest)

const TWINKLE_ZONES = {
  's-nikah': { x0: 30, x1: 80, y0: 10, y1: 31 },
  's-dinner': { x0: 8, x1: 92, y0: 26, y1: 60 },
};

export function initPages({ pages, reduced, countdownItems, mapBtn, replayBtn, onCoupleEnter, scroll }) {
  const [date, countdown, nikah, dinner, couple] = pages;
  const art = (p) => p.querySelector('.art');

  gsap.set(pages.slice(1), { yPercent: 100, '--fe': '0%' });
  gsap.set(countdownItems, { autoAlpha: 0, y: 16 });
  gsap.set([mapBtn, replayBtn], { autoAlpha: 0, y: 12 });

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

  for (let k = 1; k < pages.length; k++) {
    const incoming = pages[k];
    const outgoing = pages[k - 1];
    const at = k - 1;
    if (reduced) {
      tl.fromTo(incoming, { yPercent: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, at);
      continue;
    }
    // Arriving page: rides up with the finger, soft leading edge closing up
    tl.fromTo(incoming, { yPercent: 100, '--fe': '34%' }, { yPercent: 0, '--fe': '0%', duration: 1 }, at)
      // …its painting settles from a slight zoom
      .fromTo(art(incoming), { scale: 1.08 }, { scale: 1, duration: 1, ease: 'power1.out' }, at)
      // Leaving page: drifts up at a slower pace and softens behind it
      .to(outgoing, { yPercent: -42, duration: 1 }, at)
      .to(art(outgoing), { scale: 0.96, opacity: 0.3, duration: 1, ease: 'power1.out' }, at);
  }

  // Details that rise in as their page settles.
  tl.to(countdownItems, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.06, ease: 'power2.out' }, 0.6)
    .to(mapBtn, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 1.72)
    .to(replayBtn, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 3.95)
    .to({}, { duration: 0.01 }, TOTAL - 0.01);

  // Gold sheens loop only on the page that is on screen.
  const sheens = pages.map((p) =>
    [...p.querySelectorAll('.sheen span')].map((span) =>
      gsap.fromTo(span, { xPercent: -110 }, { xPercent: 180, duration: 2.6, ease: 'sine.inOut', repeat: -1, repeatDelay: 3.6, paused: true })
    )
  );
  let current = -1;
  const onUpdate = () => {
    const idx = Math.min(pages.length - 1, Math.round(tl.time()));
    if (idx !== current) {
      sheens.forEach((list, i) => list.forEach((s) => (i === idx ? s.restart(true) : s.pause())));
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      current = idx;
    }
    if (tl.time() > 3.5) onCoupleEnter();
  };
  tl.eventCallback('onUpdate', onUpdate);

  if (!reduced) {
    for (const p of [nikah, dinner]) twinkleField(p.querySelector('.twinkles'), TWINKLE_ZONES[p.id], 6, 2.2);
  }

  ScrollTrigger.create({
    start: 0,
    end: () => TOTAL * scroll.unit,
    scrub: true,
    animation: tl,
  });
  onUpdate();

  return { tl, date, countdown, couple };
}
