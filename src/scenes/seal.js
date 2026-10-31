import { gsap } from 'gsap';

// Scene 1: the guest taps the wax seal and the envelope unfolds like the
// reference film — the top flap lifts back on its hinge, the side flaps swing
// open (the seal stays whole and rides away on the left flap) and the outer
// petals of the flower bloom outward, revealing the bow scene underneath.
//
// Every piece is a clipped copy of the same artwork, so nothing is redrawn.
// Geometry is in % of the artwork, measured from 01-seal.

const C = { x: 52.4, y: 51.9 }; // seal centre
const SEAL_R = 11.6; // seal radius, % of width

// Envelope outline (clockwise from the left shoulder).
const ENVELOPE = [
  [21.4, 32.9], [28, 28], [38, 24.5], [52.4, 22.6], [63, 25], [75, 29], [83, 32.9],
  [83.5, 40], [83, 48.8], [81.5, 55], [78.9, 60.6], [70, 66], [60, 72], [51.2, 76.5],
  [42, 72], [33, 67.5], [26.9, 63.2], [25, 57], [24.1, 51.4], [22.5, 42],
];

const FLAPS = {
  top: {
    poly: [[21.4, 32.9], [28, 28], [38, 24.5], [52.4, 22.6], [63, 25], [75, 29], [83, 32.9], [59.7, 42.1], [56, 40], [52.4, 39.6], [48, 40.3], [44.2, 42.1]],
    origin: '50% 29%',
    back: 'x', // back face is pre-mirrored on x, then flipped with rotateY
  },
  left: {
    poly: [[21.4, 32.9], [44.2, 42.1], [48, 44.2], [52.4, 46.4], [52.4, 59], [51.2, 76.5], [42, 72], [33, 67.5], [26.9, 63.2], [25, 57], [24.1, 51.4], [22.5, 42]],
    origin: '23% 52%',
    back: 'y',
  },
  right: {
    poly: [[83, 32.9], [59.7, 42.1], [55.1, 45.7], [52.4, 46.4], [52.4, 59], [51.2, 76.5], [60, 72], [70, 66], [78.9, 60.6], [81.5, 55], [83, 48.8], [83.5, 40]],
    origin: '83% 50%',
    back: 'y',
  },
};

const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',');
const mirror = (pts, axis) => pts.map(([x, y]) => (axis === 'x' ? [100 - x, y] : [x, 100 - y]));

function layer(src, cls, clip) {
  const d = document.createElement('div');
  d.className = cls;
  if (clip) d.style.clipPath = d.style.webkitClipPath = `polygon(${clip})`;
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    d.appendChild(img);
  }
  return d;
}

export function initSeal(scene, { reduced, onTap }) {
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const hit = scene.querySelector('.seal-hit');
  const ring = scene.querySelector('.seal-ring');
  const hint = scene.querySelector('.seal-hint');
  const glow = scene.querySelector('.seal-bloom');
  const box = scene.querySelector('.wedges');

  // Idle: slow breathing zoom.
  const idle = gsap.to(scene.querySelector('.intro'), { scale: 1.035, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });

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

      if (reduced) {
        await gsap.to(scene, { opacity: 0, duration: 1, ease: 'power1.inOut' });
        idle.kill();
        scene.style.display = 'none';
        return;
      }

      const src = img.currentSrc || img.src;

      // ── Build the pieces (only now, so they cost nothing while idle) ──
      // The flower around the envelope (envelope cut out, even-odd).
      const outer = layer(src, 'petals-outer', `evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${fmt(ENVELOPE)}, ${fmt([ENVELOPE[0]])}, 0% 0%`);
      // The envelope as printed, under the flaps — keeps the inner opening
      // dark until the flaps start to move.
      const inner = layer(src, 'env-inner', fmt(ENVELOPE));

      const flaps = {};
      for (const [name, f] of Object.entries(FLAPS)) {
        const flap = layer(null, `flap flap-${name}`);
        flap.style.transformOrigin = f.origin;
        const front = layer(src, 'face front', fmt(f.poly));
        const back = layer(src, `face back back-${f.back}`, fmt(mirror(f.poly, f.back)));
        flap.append(back, front);
        flaps[name] = flap;
      }
      // The right flap must not repeat the half of the seal it sits under.
      flaps.right.querySelector('.front').classList.add('seal-hole');
      // The seal stays whole and travels with the left flap.
      const seal = layer(src, 'face seal-piece', null);
      seal.style.clipPath = seal.style.webkitClipPath = `circle(${SEAL_R + 0.4}cqw at ${C.x}% ${C.y}%)`;
      flaps.left.appendChild(seal);

      // Flower and envelope base stay flat; only the flaps live in 3D, so they
      // always paint above the petals.
      box.before(outer, inner);
      // Each flap gets its own perspective layer, painted in order, so no
      // flap can ever be depth-sorted behind another.
      for (const name of ['right', 'left', 'top']) {
        const persp = layer(null, 'persp');
        persp.appendChild(flaps[name]);
        box.appendChild(persp);
      }
      box.style.display = 'block';
      plate.style.visibility = 'hidden';

      const origin = `${C.x}% ${C.y}%`;
      const tl = gsap.timeline();
      if (import.meta.env.DEV) window.__sealTl = tl;

      tl.to([ring, hint], { opacity: 0, duration: 0.4, ease: 'power1.out' }, 0)
        // A gentle press on the seal
        .fromTo(seal, { scale: 1, transformOrigin: origin }, { scale: 0.94, duration: 0.18, ease: 'power2.in' }, 0)
        .to(seal, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 0.18)
        .to(inner, { opacity: 0, duration: 0.5, ease: 'sine.inOut' }, 0.3)
        // Warm light escaping from inside
        .fromTo(glow, { opacity: 0, scale: 0.4 }, { opacity: 0.45, scale: 2.2, duration: 1.4, ease: 'sine.out' }, 0.5)
        .to(glow, { opacity: 0, duration: 1.0, ease: 'sine.in' }, 1.9)
        // Top flap lifts back over its hinge
        .to(flaps.top, { rotationX: 168, duration: 1.3, ease: 'power2.inOut' }, 0.25)
        // Side flaps swing open, one after the other, and settle on the petals
        .to(flaps.left, { rotationY: -166, duration: 1.35, ease: 'power2.inOut' }, 0.7)
        .to(flaps.right, { rotationY: 166, duration: 1.35, ease: 'power2.inOut' }, 0.85)
        // The flower opens wider around them
        .to(outer, { scale: 1.12, transformOrigin: origin, duration: 2.4, ease: 'power1.inOut' }, 0.6)
        // Then the camera moves into the opening, onto the bow scene
        .to([outer, inner, box], { scale: '+=1.2', transformOrigin: origin, duration: 1.2, ease: 'power2.in' }, 2.15)
        .to([outer, box], { opacity: 0, duration: 0.7, ease: 'power1.in' }, 2.6)
        .to(scene.querySelector('.scene-bg'), { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 0.9);

      await tl;
      idle.kill();
      scene.style.display = 'none';
      box.innerHTML = '';
      outer.remove();
      inner.remove();
    }
  });
}
