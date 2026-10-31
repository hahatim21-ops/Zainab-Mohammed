import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { twinkleField } from '../effects/sparkles.js';

// The pages (names card → date & countdown → Nikah → Dinner → couple) form
// one continuous scrolling column. As each painting comes up it softly lifts
// and brightens into place, and its details (countdown, location button,
// "Watch again") rise in.

const TWINKLE_ZONES = {
  's-names': { x0: 22, x1: 78, y0: 36, y1: 68 },
  's-nikah': { x0: 30, x1: 80, y0: 10, y1: 31 },
  's-dinner': { x0: 8, x1: 92, y0: 26, y1: 60 },
};

export function initPages({ pages, reduced, countdownItems, mapBtn, replayBtn, onCoupleEnter }) {
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));

  pages.forEach((page, i) => {
    const intro = page.querySelector('.intro');

    // Arrival: each painting lifts and fades gently into place.
    if (i > 0) {
      gsap.fromTo(
        intro,
        reduced ? { opacity: 0.3 } : { opacity: 0.3, yPercent: 5, scale: 1.04 },
        {
          opacity: 1,
          yPercent: 0,
          scale: 1,
          ease: 'power1.out',
          scrollTrigger: { trigger: page, start: 'top bottom', end: 'top 30%', scrub: true },
        }
      );
    }

    // Gold sheen across printed headings while the page is on screen.
    page.querySelectorAll('.sheen span').forEach((span) => {
      const sweep = gsap.fromTo(span, { xPercent: -110 }, { xPercent: 180, duration: 2.6, ease: 'sine.inOut', repeat: -1, repeatDelay: 3.6, paused: true });
      ScrollTrigger.create({
        trigger: page,
        start: 'top 70%',
        end: 'bottom 30%',
        onToggle: (self) => (self.isActive ? sweep.restart(true) : sweep.pause()),
      });
    });

    // Slow Ken Burns and twinkles run only while the page is on screen, so
    // pages further down cost nothing.
    if (!reduced) {
      const zone = TWINKLE_ZONES[page.id];
      const twinkles = zone ? twinkleField(page.querySelector('.twinkles'), zone, 6, 2.2) : null;
      const kb = gsap.fromTo(page.querySelector('.kb'), { scale: 1 }, { scale: 1.04, duration: 16 + i, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
      const run = (on) => {
        on ? kb.play() : kb.pause();
        if (twinkles) on ? twinkles.play() : twinkles.pause();
      };
      run(false);
      ScrollTrigger.create({ trigger: page, start: 'top bottom', end: 'bottom top', onToggle: (self) => run(self.isActive) });
    }
  });

  const reveal = (targets, trigger, start, vars = {}) =>
    gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out', ...vars, scrollTrigger: { trigger, start, toggleActions: 'play none none reverse' } }
    );

  // Countdown units rise one after another, under the date.
  reveal(countdownItems, byId['s-date'], 'top 35%', { stagger: 0.12 });
  // The dinner location button fades up once the details have settled.
  reveal(mapBtn, byId['s-dinner'], 'top 35%', { delay: 0.2 });
  // Finale: candles light, then "Watch again".
  ScrollTrigger.create({ trigger: byId['s-couple'], start: 'top 70%', once: true, onEnter: onCoupleEnter });
  reveal(replayBtn, byId['s-couple'], 'top 15%', { delay: 0.6 });
}
