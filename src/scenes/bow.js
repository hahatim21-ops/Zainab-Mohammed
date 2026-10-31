import { gsap } from 'gsap';
import { createGlows } from '../effects/glows.js';
import { sparkleBurst } from '../effects/sparkles.js';
import { KNOT, PART_ORDER } from './bowGeometry.js';
import { PIECES } from './bowPieces.generated.js';

// Written out in full so the build can add a version to each URL.
const BOW_PART_URLS = {
  tailL: '/images/02-bow-tailL.webp',
  tailR: '/images/02-bow-tailR.webp',
  loopL: '/images/02-bow-loopL.webp',
  loopR: '/images/02-bow-loopR.webp',
  knot: '/images/02-bow-knot.webp',
};

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
const loosePose = (py) => ({
  tailL: { rotation: 4, y: py(2.2), scaleY: 1.03 },
  tailR: { rotation: -4, y: py(2.2), scaleY: 1.03 },
  loopL: { rotation: -13, y: py(2.8), scaleX: 1.1, scaleY: 0.9 },
  loopR: { rotation: 13, y: py(2.8), scaleX: 1.1, scaleY: 0.9 },
  knot: { y: py(2.6), scale: 1.14 },
});

// One side of the curtain for the opening: a box only as wide as its half,
// holding the full painting shifted into place (no clip-path, small layer).
const half = (src, side) => {
  const d = document.createElement('div');
  d.className = `half half-${side}`;
  const w = side === 'left' ? KNOT.x + 0.6 : 100 - KNOT.x + 0.6;
  d.style.cssText = side === 'left' ? `left:0;width:${w}%` : `right:0;width:${w}%`;
  const inner = document.createElement('div');
  inner.className = 'half-inner';
  inner.style.cssText = `width:${(100 / w) * 100}%;${side === 'left' ? 'left:0' : 'right:0'}`;
  inner.innerHTML = `<img src="${src}" alt="" draggable="false">`;
  d.appendChild(inner);
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

  // Moves are given in % of the painting's height; this turns them into px.
  const stage = scene.querySelector('.stage');
  const py = (v) => (stage.getBoundingClientRect().height * v) / 100;

  // The pieces, back to front, over the rebuilt background. Each image is
  // only as big as its piece (small GPU layers), placed by its recorded box
  // and turning around the knot.
  const parts = {};
  for (const name of PART_ORDER) {
    const b = PIECES[name];
    const p = document.createElement('img');
    p.className = `part part-${name} preload`;
    p.src = BOW_PART_URLS[name];
    p.alt = '';
    p.draggable = false;
    p.style.cssText = `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`;
    p.style.transformOrigin = `${((KNOT.x - b.x) / b.w) * 100}% ${((KNOT.y - b.y) / b.h) * 100}%`;
    partsBox.appendChild(p);
    parts[name] = p;
  }

  // Waiting state, seen through the opening flower: soft, close, bow loose.
  // The softness is a blurred copy laid over the background that simply
  // fades away (a fade costs nothing; an animated blur repaints every frame).
  // (It is the original painting, bow included, laid above the pieces.)
  const soft = document.createElement('img');
  soft.className = 'plate-soft';
  soft.src = '/images/02-bow.webp';
  soft.alt = '';
  soft.setAttribute('aria-hidden', 'true');
  partsBox.after(soft);
  gsap.set(intro, { scale: 1.08 });
  if (!reduced) for (const [name, pose] of Object.entries(loosePose(py))) gsap.set(parts[name], pose);

  // The two curtain halves used when the bow opens are built now (hidden),
  // so nothing is created in the middle of the animation.
  const halves = reduced
    ? null
    : (() => {
        const src = img.currentSrc || img.src;
        const left = half(src, 'left');
        const right = half(src, 'right');
        untieBox.append(left, right);
        return { left, right };
      })();

  /** The loose bow pulls tight and settles. */
  function tie() {
    const tl = gsap.timeline();
    tl.to(intro, { scale: 1, duration: 1.0, ease: 'power2.inOut' }, 0)
      .to(soft, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0.15);
    if (reduced) return tl.add(() => glows.start(0.8), 0.8).then();

    tl
      // Slack first: everything sags a touch, as if the ribbon is being gathered
      .to([parts.loopL, parts.loopR], { y: `+=${py(0.8)}`, duration: 0.2, ease: 'sine.inOut' }, 0.05)
      .to(parts.knot, { y: `+=${py(0.6)}`, duration: 0.2, ease: 'sine.inOut' }, 0.05)
      // The tug: tails pull, loops lift into shape, the knot cinches
      .to([parts.tailL, parts.tailR], { rotation: 0, y: 0, scaleY: 1, duration: 0.6, ease: 'power3.out' }, 0.25)
      .to([parts.loopL, parts.loopR], { rotation: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: 'back.out(1.7)' }, 0.28)
      .to(parts.knot, { y: 0, scaleX: 0.9, scaleY: 1.06, duration: 0.25, ease: 'power3.out' }, 0.28)
      .to(parts.knot, { scaleX: 1, scaleY: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 0.53)
      .add(() => {
        sparkleBurst(fx, KNOT.x, KNOT.y, 16);
        try {
          navigator.vibrate?.(15);
        } catch {}
      }, 0.35)
      .add(() => glows.start(0.8), 0.4)
      .to({}, { duration: 0.01 }, 1.1);

    return tl.then();
  }

  /** The bow unties and the curtains part onto the date page. */
  function untie() {
    if (reduced) return gsap.to(scene, { opacity: 0, duration: 0.9, ease: 'power1.inOut' }).then();

    const cqw = scene.querySelector('.stage').getBoundingClientRect().width / 100;
    const tl = gsap.timeline();

    // The knot loosens; the loops slip outward and the tails sag
    tl.to(parts.knot, { scale: 1.15, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .add(() => sparkleBurst(fx, KNOT.x, KNOT.y, 10), 0.1)
      .to(parts.loopL, { x: -3 * cqw, rotation: -10, y: py(1.4), duration: 0.55, ease: 'power2.inOut' }, 0.05)
      .to(parts.loopR, { x: 3 * cqw, rotation: 10, y: py(1.4), duration: 0.55, ease: 'power2.inOut' }, 0.07)
      .to(parts.tailL, { rotation: 3, y: py(1.5), duration: 0.55, ease: 'power2.inOut' }, 0.08)
      .to(parts.tailR, { rotation: -3, y: py(1.5), duration: 0.55, ease: 'power2.inOut' }, 0.1)
      .to(scene.querySelectorAll('.glows, .fx'), { opacity: 0, duration: 0.5 }, 0.3);

    // Then each side of the bow swings away with its curtain, and the camera
    // moves through onto the date.
    tl.add(() => {
      const { left, right } = halves;
      left.firstChild.append(parts.tailL, parts.loopL);
      right.firstChild.append(parts.tailR, parts.loopR);
      untieBox.style.display = 'block';
      plate.style.visibility = 'hidden';
      glows.stop();
      gsap
        .timeline()
        .to(left, { x: -66 * cqw, rotationY: 34, transformOrigin: '0% 50%', duration: 1.4, ease: 'power3.inOut' }, 0)
        .to(right, { x: 66 * cqw, rotationY: -34, transformOrigin: '100% 50%', duration: 1.4, ease: 'power3.inOut' }, 0)
        .to([parts.loopL, parts.loopR], { y: `+=${py(5)}`, duration: 1.3, ease: 'power2.in' }, 0)
        .to([parts.tailL, parts.tailR], { y: `+=${py(3)}`, duration: 1.3, ease: 'power2.in' }, 0)
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
