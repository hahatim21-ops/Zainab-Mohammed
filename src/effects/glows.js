import { gsap } from 'gsap';

/**
 * Warm flickering glows (radial gradients, screen-blended by the container).
 * @param {HTMLElement} parent `.glows` container inside a stage
 * @param {{x:number,y:number,s:number,o?:number}[]} spots x/y in %, s in cqw
 */
export function createGlows(parent, spots) {
  const els = spots.map(({ x, y, s }) => {
    const g = document.createElement('i');
    g.className = 'glow';
    g.style.setProperty('--x', `${x}%`);
    g.style.setProperty('--y', `${y}%`);
    g.style.setProperty('--s', `${s}cqw`);
    parent.appendChild(g);
    return g;
  });

  const loops = [];
  return {
    elements: els,
    /** Fade glows in, then keep them flickering like candle flames. */
    start(fadeIn = 1.2) {
      els.forEach((g, i) => {
        const base = spots[i].o ?? 0.85;
        gsap.fromTo(g, { opacity: 0, scale: 0.6 }, { opacity: base, scale: 1, duration: fadeIn, delay: i * 0.08, ease: 'sine.out' });
        const flicker = () => {
          loops[i] = gsap.to(g, {
            opacity: base * gsap.utils.random(0.62, 1),
            scale: gsap.utils.random(0.9, 1.08),
            duration: gsap.utils.random(0.08, 0.32),
            ease: 'sine.inOut',
            onComplete: flicker,
          });
        };
        gsap.delayedCall(fadeIn + i * 0.08, flicker);
      });
    },
    stop() {
      loops.forEach((t) => t && t.kill());
    },
  };
}
