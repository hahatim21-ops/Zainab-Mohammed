import { gsap } from 'gsap';

function makeSpark(parent, x, y, size) {
  const s = document.createElement('i');
  s.className = 'spark';
  s.style.left = `${x}%`;
  s.style.top = `${y}%`;
  if (size) s.style.setProperty('--sz', `${size}cqw`);
  parent.appendChild(s);
  return s;
}

/** One-shot radial sparkle burst at (x%, y%) of the stage. */
export function sparkleBurst(parent, x, y, count = 14) {
  const cqw = parent.getBoundingClientRect().width / 100;
  for (let i = 0; i < count; i++) {
    const s = makeSpark(parent, x, y, gsap.utils.random(2, 4.5));
    const a = (i / count) * Math.PI * 2 + gsap.utils.random(-0.3, 0.3);
    const r = gsap.utils.random(6, 18) * cqw;
    gsap.fromTo(
      s,
      { scale: 0, opacity: 1, rotation: 0 },
      {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        scale: gsap.utils.random(0.6, 1.2),
        rotation: gsap.utils.random(-90, 90),
        duration: gsap.utils.random(0.8, 1.3),
        ease: 'expo.out',
      }
    );
    gsap.to(s, {
      opacity: 0,
      scale: 0,
      duration: 0.6,
      delay: gsap.utils.random(0.5, 0.9),
      ease: 'power2.in',
      onComplete: () => s.remove(),
    });
  }
}

/**
 * Endless gentle twinkles scattered inside a rect (all in % of the stage).
 * Returns { stop, elements }.
 */
export function twinkleField(parent, { x0, x1, y0, y1 }, count = 10, size = 2.4) {
  const els = [];
  const tweens = [];
  for (let i = 0; i < count; i++) {
    const s = makeSpark(parent, 0, 0, size * gsap.utils.random(0.6, 1.2));
    els.push(s);
    const cycle = () => {
      s.style.left = `${gsap.utils.random(x0, x1)}%`;
      s.style.top = `${gsap.utils.random(y0, y1)}%`;
    };
    cycle();
    const tw = gsap.timeline({ repeat: -1, delay: gsap.utils.random(0, 3), repeatDelay: gsap.utils.random(0.6, 2.8), onRepeat: cycle });
    tw.fromTo(s, { opacity: 0, scale: 0.2, rotation: 0 }, { opacity: 1, scale: 1, rotation: 45, duration: 0.55, ease: 'sine.out' }).to(s, {
      opacity: 0,
      scale: 0.2,
      rotation: 90,
      duration: 0.7,
      ease: 'sine.in',
    });
    tweens.push(tw);
  }
  return {
    elements: els,
    stop: () => tweens.forEach((t) => t.kill()),
    pause: () => tweens.forEach((t) => t.pause()),
    play: () => tweens.forEach((t) => t.play()),
  };
}
