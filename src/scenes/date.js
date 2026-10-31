import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { twinkleField } from '../effects/sparkles.js';
import { fireCannons } from '../effects/confetti.js';

// Scene 3: the printed date sits under a feathered golden veil. One tap
// anywhere melts the veil away from left to right — the date sharpens as the
// wipe passes, a gold glint rides its edge — then إن شاء الله fades up and the
// confetti cannons fire.

export function initDate(scene, { reduced }) {
  const veil = scene.querySelector('.veil-date');
  const veilAr = scene.querySelector('.veil-ar');
  const glint = scene.querySelector('.date-glint');
  const tap = scene.querySelector('.date-tap');
  const bloom = scene.querySelector('.date-bloom');
  const sparkles = reduced ? null : twinkleField(scene.querySelector('.veil-sparkles'), { x0: 12, x1: 88, y0: 20, y1: 80 }, 10, 2.2);

  let revealed = false;

  // Veil sparkles twinkle only while the date page is on screen.
  if (sparkles) {
    sparkles.pause();
    ScrollTrigger.create({ trigger: scene, start: 'top bottom', end: 'bottom top', onToggle: (self) => !revealed && (self.isActive ? sparkles.play() : sparkles.pause()) });
  }


  function reveal() {
    if (revealed) return Promise.resolve();
    revealed = true;
    try {
      navigator.vibrate?.(40);
    } catch {}

    if (reduced) {
      gsap.to([veil, veilAr, tap], { opacity: 0, duration: 0.8 });
      fireCannons({ reduced });
      return new Promise((r) => setTimeout(r, 900));
    }

    sparkles?.stop();
    const wipe = { v: -16 };
    const tl = gsap.timeline();

    tl.to(tap, { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power2.in' }, 0)
      .add(() => tap.remove(), 0.4)
      .to(scene.querySelectorAll('.veil-sparkles .spark'), { opacity: 0, duration: 0.3 }, 0)
      // The wipe: veil melts left → right, glint rides the edge
      .set(glint, { opacity: 1 }, 0.15)
      .to(
        wipe,
        {
          v: 100,
          duration: 1.6,
          ease: 'power1.inOut',
          onUpdate: () => {
            veil.style.setProperty('--wipe', wipe.v);
            // edge sits where the veil is half-transparent
            const edge = 12 + (88 * Math.min(100, Math.max(0, wipe.v + 8))) / 100;
            glint.style.left = `${edge}%`;
          },
        },
        0.15
      )
      .fromTo(glint, { scaleY: 0.6 }, { scaleY: 1.15, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.15)
      .to(glint, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.5)
      // Warm bloom behind the date as it settles
      .fromTo(bloom, { opacity: 0, scale: 0.8 }, { opacity: 0.9, scale: 1, duration: 1.1, ease: 'sine.out' }, 0.7)
      .to(bloom, { opacity: 0.3, duration: 1.6, ease: 'sine.inOut' }, 1.9)
      // إن شاء الله fades up softly
      .to(veilAr, { opacity: 0, y: -6, filter: 'blur(6px)', duration: 1.1, ease: 'sine.inOut' }, 1.35)
      .add(() => fireCannons({ reduced }), 1.45);

    return tl.then(() => {
      veil.style.display = veilAr.style.display = 'none';
      glint.remove();
    });
  }

  return {
    reveal,
    get revealed() {
      return revealed;
    },
    tap,
  };
}
