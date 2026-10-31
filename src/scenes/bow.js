import { gsap } from 'gsap';
import { createGlows } from '../effects/glows.js';
import { sparkleBurst } from '../effects/sparkles.js';
import { KNOT, PART_ORDER } from './bowGeometry.js';

// Scene 2: the lace bow is the real one from the photo, cut into its pieces
// (tails, loops, knot) over a rebuilt background. It starts loose — loops
// low and wide, tails slack — pulls up into place with a soft tug, holds,
// then unties by itself: the loops slip apart, the tails fall away and the curtains
// part onto the date page.

// Lantern and candle glows (x/y in %, size in cqw).
const GLOWS = [
  { x: 27.6, y: 82.6, s: 15, o: 0.9 }, // candle lantern, left of the steps
  { x: 76.4, y: 83.2, s: 15, o: 0.9 }, // candle lantern, right of the steps
  { x: 54.8, y: 54.2, s: 13, o: 0.8 }, // hanging lantern in the archway
  { x: 38.8, y: 26.2, s: 9, o: 0.45 }, // far arch lights
  { x: 67.4, y: 26.2, s: 9, o: 0.45 },
];

// The loose starting pose of each piece (rotation around the knot).
const LOOSE = {
  tailL: { rotation: 4, yPercent: 2.2, scaleY: 1.03 },
  tailR: { rotation: -4, yPercent: 2.2, scaleY: 1.03 },
  loopL: { rotation: -13, yPercent: 2.8, scaleX: 1.1, scaleY: 0.9 },
  loopR: { rotation: 13, yPercent: 2.8, scaleX: 1.1, scaleY: 0.9 },
  knot: { yPercent: 2.6, scale: 1.14 },
};

const half = (src, side) => {
  const d = document.createElement('div');
  d.className = `half half-${side}`;
  const cut = side === 'left' ? `0 0, ${KNOT.x + 0.2}% 0, ${KNOT.x + 0.2}% 100%, 0 100%` : `${KNOT.x - 0.2}% 0, 100% 0, 100% 100%, ${KNOT.x - 0.2}% 100%`;
  d.style.clipPath = d.style.webkitClipPath = `polygon(${cut})`;
  d.innerHTML = `<img src="${src}" alt="" draggable="false">`;
  return d;
};

export function initBow(scene, { reduced }) {
  const intro = scene.querySelector('.intro');
  const kb = scene.querySelector('.kb');
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const partsBox = scene.querySelector('.bow-parts');
  const fx = scene.querySelector('.fx');
  const untieBox = scene.querySelector('.untie');
  const glows = createGlows(scene.querySelector('.glows'), GLOWS);
  const origin = `${KNOT.x}% ${KNOT.y}%`;

  // The pieces, back to front, over the rebuilt background.
  const parts = {};
  for (const name of PART_ORDER) {
    const p = document.createElement('img');
    p.className = `part part-${name} preload`;
    p.src = `/images/02-bow-${name}.webp`;
    p.alt = '';
    p.draggable = false;
    partsBox.appendChild(p);
    parts[name] = p;
  }
  gsap.set(Object.values(parts), { transformOrigin: origin });

  // Waiting state, seen through the opening flower: soft, close, bow loose.
  gsap.set(intro, { scale: 1.08 });
  gsap.set(kb, { filter: 'blur(3px) brightness(1.04)' });
  if (!reduced) for (const [name, pose] of Object.entries(LOOSE)) gsap.set(parts[name], pose);

  /** The loose bow pulls tight and settles. */
  function tie() {
    const tl = gsap.timeline();
    tl.to(intro, { scale: 1, duration: 1.0, ease: 'power2.inOut' }, 0)
      .to(kb, { filter: 'blur(0px) brightness(1)', duration: 0.4, ease: 'power1.out' }, 0);
    if (reduced) return tl.add(() => glows.start(0.8), 0.8).then(() => gsap.set(kb, { clearProps: 'filter' }));

    tl
      // Slack first: everything sags a touch, as if the ribbon is being gathered
      .to([parts.loopL, parts.loopR], { yPercent: '+=0.8', duration: 0.2, ease: 'sine.inOut' }, 0.05)
      .to(parts.knot, { yPercent: '+=0.6', duration: 0.2, ease: 'sine.inOut' }, 0.05)
      // The tug: tails pull, loops lift into shape, the knot cinches
      .to([parts.tailL, parts.tailR], { rotation: 0, yPercent: 0, scaleY: 1, duration: 0.6, ease: 'power3.out' }, 0.25)
      .to([parts.loopL, parts.loopR], { rotation: 0, yPercent: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: 'back.out(1.7)' }, 0.28)
      .to(parts.knot, { yPercent: 0, scaleX: 0.9, scaleY: 1.06, duration: 0.25, ease: 'power3.out' }, 0.28)
      .to(parts.knot, { scaleX: 1, scaleY: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 0.53)
      .add(() => {
        sparkleBurst(fx, KNOT.x, KNOT.y, 16);
        try {
          navigator.vibrate?.(15);
        } catch {}
      }, 0.35)
      .add(() => glows.start(0.8), 0.4)
      .to({}, { duration: 0.01 }, 1.1);

    return tl.then(() => gsap.set(kb, { clearProps: 'filter' }));
  }

  /** The bow unties and the curtains part onto the date page. */
  function untie() {
    if (reduced) return gsap.to(scene, { opacity: 0, duration: 0.9, ease: 'power1.inOut' }).then();

    const cqw = scene.querySelector('.stage').getBoundingClientRect().width / 100;
    const tl = gsap.timeline();

    // The knot loosens; the loops slip outward and the tails sag
    tl.to(parts.knot, { scale: 1.15, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .add(() => sparkleBurst(fx, KNOT.x, KNOT.y, 10), 0.1)
      .to(parts.loopL, { x: -3 * cqw, rotation: -10, yPercent: 1.4, duration: 0.55, ease: 'power2.inOut' }, 0.05)
      .to(parts.loopR, { x: 3 * cqw, rotation: 10, yPercent: 1.4, duration: 0.55, ease: 'power2.inOut' }, 0.07)
      .to(parts.tailL, { rotation: 3, yPercent: 1.5, duration: 0.55, ease: 'power2.inOut' }, 0.08)
      .to(parts.tailR, { rotation: -3, yPercent: 1.5, duration: 0.55, ease: 'power2.inOut' }, 0.1)
      .to(scene.querySelectorAll('.glows, .fx'), { opacity: 0, duration: 0.5 }, 0.3);

    // Then each side of the bow swings away with its curtain, and the camera
    // moves through onto the date.
    tl.add(() => {
      const src = img.currentSrc || img.src;
      const left = half(src, 'left');
      const right = half(src, 'right');
      left.append(parts.tailL, parts.loopL);
      right.append(parts.tailR, parts.loopR);
      untieBox.append(left, right);
      untieBox.style.display = 'block';
      plate.style.visibility = 'hidden';
      glows.stop();
      gsap
        .timeline()
        .to(left, { x: -66 * cqw, rotationY: 34, transformOrigin: '0% 50%', duration: 1.4, ease: 'power3.inOut' }, 0)
        .to(right, { x: 66 * cqw, rotationY: -34, transformOrigin: '100% 50%', duration: 1.4, ease: 'power3.inOut' }, 0)
        .to([parts.loopL, parts.loopR], { yPercent: '+=5', duration: 1.3, ease: 'power2.in' }, 0)
        .to([parts.tailL, parts.tailR], { yPercent: '+=3', duration: 1.3, ease: 'power2.in' }, 0)
        .to([left, right], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 0.8);
    }, 0.45)
      .to(intro, { scale: 1.1, duration: 1.5, ease: 'power2.inOut' }, 0.45)
      .to(scene.querySelectorAll('.scene-bg, .bands'), { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 0.6)
      .to({}, { duration: 0.01 }, 1.9);

    return tl.then(() => {
      scene.style.display = 'none';
      untieBox.innerHTML = '';
    });
  }

  return { tie, untie };
}
