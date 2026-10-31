import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { twinkleField } from '../effects/sparkles.js';

// Motion for the scrolling pages (date → couple). The pages really scroll;
// on top of that each painting drifts a little slower than the page
// (parallax), arrives with a soft lift-and-fade, and recedes as it leaves.

// Where little gold twinkles live on each page (% of the artwork).
const TWINKLE_ZONES = {
  's-nikah': { x0: 30, x1: 80, y0: 10, y1: 31 },
  's-dinner': { x0: 8, x1: 92, y0: 26, y1: 60 },
};

export function initPages({ pages, reduced, countdownItems, mapBtn, replayBtn, onCoupleEnter }) {
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));

  pages.forEach((page, i) => {
    const art = page.querySelector('.art');
    const intro = page.querySelector('.intro');
    const bg = page.querySelector('.scene-bg');

    if (reduced) {
      if (i > 0) {
        gsap.fromTo(intro, { opacity: 0.2 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: page, start: 'top 90%', end: 'top 35%', scrub: true } });
      }
      return;
    }

    // Parallax: painting and backdrop drift at different speeds to the page.
    const travel = { trigger: page, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo(art, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: travel });
    gsap.fromTo(bg, { yPercent: 7 }, { yPercent: -7, ease: 'none', scrollTrigger: { ...travel } });

    // Arrival: lifts and fades gently into place.
    if (i > 0) {
      gsap.fromTo(
        intro,
        { opacity: 0.2, scale: 1.07, yPercent: 6 },
        { opacity: 1, scale: 1, yPercent: 0, ease: 'power1.out', scrollTrigger: { trigger: page, start: 'top bottom', end: 'top 15%', scrub: true } }
      );
    }
    // Departure: recedes slightly as the next page takes over.
    gsap.to(art, { opacity: 0.45, scale: 0.94, ease: 'power1.in', scrollTrigger: { trigger: page, start: 'bottom 75%', end: 'bottom top', scrub: true } });

    // Gold sheen across printed headings while the page is on screen.
    page.querySelectorAll('.sheen span').forEach((span) => {
      const sweep = gsap.fromTo(span, { xPercent: -110 }, { xPercent: 180, duration: 2.6, ease: 'sine.inOut', repeat: -1, repeatDelay: 3.6, paused: true });
      ScrollTrigger.create({
        trigger: page,
        start: 'top 60%',
        end: 'bottom 30%',
        onToggle: (self) => (self.isActive ? sweep.restart(true) : sweep.pause()),
      });
    });

    const zone = TWINKLE_ZONES[page.id];
    if (zone) twinkleField(page.querySelector('.twinkles'), zone, 6, 2.2);
  });

  const reveal = (targets, trigger, start, vars = {}) =>
    gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out', ...vars, scrollTrigger: { trigger, start, toggleActions: 'play none none reverse' } }
    );

  // Countdown units rise one after another.
  reveal(countdownItems, byId['s-countdown'], 'top 45%', { stagger: 0.12 });
  // Location button fades up once the Nikah details have settled.
  reveal(mapBtn, byId['s-nikah'], 'top 30%', { delay: 0.2 });
  // Finale: candles light, then "Watch again".
  ScrollTrigger.create({ trigger: byId['s-couple'], start: 'top 70%', once: true, onEnter: onCoupleEnter });
  reveal(replayBtn, byId['s-couple'], 'top 10%', { delay: 0.6 });
}
