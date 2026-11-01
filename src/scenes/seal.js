import { gsap } from 'gsap';

// Scene 1: the guest taps the wax seal. The seal lifts off whole and fades,
// a soft opening appears where it sat, and the camera glides into the flower
// through that opening onto the bow scene underneath.
//
// Built for phones: the opening is a fixed soft mask on the seal layer and
// grows only because the whole layer zooms (one GPU transform + a fade), so
// nothing is redrawn while it plays.

const C = { x: 52.4, y: 51.9 }; // seal centre, % of the artwork
const SEAL_R = 11.6; // seal radius, % of width

function copyLayer(src, cls) {
  const d = document.createElement('div');
  d.className = cls;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.draggable = false;
  d.appendChild(img);
  return d;
}

export function initSeal(scene, { reduced, onTap }) {
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const hit = scene.querySelector('.seal-hit');
  const ring = scene.querySelector('.seal-ring');
  const hint = scene.querySelector('.seal-hint');
  const intro = scene.querySelector('.intro');
  const stage = scene.querySelector('.stage');

  // Prepared before the tap: the seal that will lift away, in a twin stage
  // with the same size and position as the artwork.
  let liftStage, seal;
  if (!reduced) {
    scene.style.willChange = 'transform, opacity';
    liftStage = document.createElement('div');
    liftStage.className = 'stage seal-lift';
    liftStage.style.visibility = 'hidden';
    seal = copyLayer(img.currentSrc || img.src, 'seal-piece');
    seal.style.clipPath = seal.style.webkitClipPath = `circle(${SEAL_R + 0.3}cqw at ${C.x}% ${C.y}%)`;
    liftStage.appendChild(seal);
    scene.after(liftStage);
  }

  // Idle: slow breathing zoom.
  const origin = `${C.x}% ${C.y}%`;
  const idle = gsap.to(intro, { scale: 1.03, transformOrigin: origin, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  return new Promise((resolve) => {
    let fired = false;
    hit.addEventListener('click', (e) => {
      if (fired) return;
      fired = true;
      e.preventDefault();
      onTap?.(); // music — must stay synchronous inside the gesture
      try {
        navigator.vibrate?.(30);
      } catch {}
      hit.remove();
      open().then(resolve);
    });

    async function open() {
      gsap.killTweensOf([ring, hint]);
      ring.style.animation = hint.style.animation = 'none';
      idle.pause();

      if (reduced) {
        await gsap.to(scene, { opacity: 0, duration: 1, ease: 'power1.inOut' });
        scene.style.display = 'none';
        return;
      }

      // The seal copy covers the real one, then lifts away.
      liftStage.style.visibility = 'visible';
      gsap.set(seal, { scale: gsap.getProperty(intro, 'scale'), transformOrigin: origin });

      // A soft opening where the seal sits (hidden under the seal copy at
      // first), fixed in size — the zoom below is what makes it grow.
      const r = stage.getBoundingClientRect();
      const k = gsap.getProperty(intro, 'scale');
      const cx = r.left + (r.width * C.x) / 100;
      const cy = r.top + (r.height * C.y) / 100;
      const sealPx = ((r.width * SEAL_R) / 100) * k;
      const hole = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${sealPx * 0.7}px, #000 ${sealPx * 1.9}px)`;
      scene.style.maskImage = scene.style.webkitMaskImage = hole;
      gsap.set(scene, { transformOrigin: `${cx}px ${cy}px` });

      const tl = gsap.timeline();
      if (import.meta.env.DEV) window.__sealTl = tl;
      tl.to([ring, hint], { opacity: 0, duration: 0.5, ease: 'power1.out' }, 0)
        // The seal is pressed, then lifts away whole
        .to(seal, { scale: '-=0.05', duration: 0.18, ease: 'power2.in' }, 0)
        .to(seal, { scale: '+=0.2', y: -r.width * 0.06, duration: 1.3, ease: 'power2.out' }, 0.18)
        .to(seal, { opacity: 0, duration: 0.8, ease: 'power1.in' }, 0.95)
        // The flower opens a little where the seal was…
        .to(scene, { scale: 1.25, duration: 0.8, ease: 'power1.out' }, 0.15)
        // …then the camera glides in through the opening onto the bow
        .to(scene, { scale: 9, duration: 1.75, ease: 'power2.in' }, 0.95)
        .to(scene, { opacity: 0, duration: 0.8, ease: 'power1.in' }, 1.9);

      await tl;
      idle.kill();
      scene.style.display = 'none';
      liftStage.remove();
    }
  });
}
