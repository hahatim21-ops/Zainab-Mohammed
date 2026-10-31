import { gsap } from 'gsap';
import { createGlows } from '../effects/glows.js';
import { sparkleBurst } from '../effects/sparkles.js';

// Scene 2: a wide satin ribbon sweeps across the screen in curling loops; the
// sharp photo — bow already tied — is left behind wherever it passes. The bow
// holds for a moment, then unties: the two halves of the curtain part like a
// camera moving through, revealing the date page.

const KNOT = { x: 50.7, y: 39 }; // %, measured from 02-bow

// Ribbon route in artwork pixels (1080×1920): enters top-right, loops through
// the knot area and leaves bottom-left.
const ROUTE =
  'M1320 60 C900 -60 360 110 290 420 C220 700 640 830 790 620 C930 430 650 300 520 520 ' +
  'C400 740 640 1000 900 1120 C1180 1250 1010 1600 600 1650 C260 1690 60 1820 -260 2060';

// Lantern and candle glows (x/y in %, size in cqw).
const GLOWS = [
  { x: 27.6, y: 82.6, s: 15, o: 0.9 }, // candle lantern, left of the steps
  { x: 76.4, y: 83.2, s: 15, o: 0.9 }, // candle lantern, right of the steps
  { x: 54.8, y: 54.2, s: 13, o: 0.8 }, // hanging lantern in the archway
  { x: 38.8, y: 26.2, s: 9, o: 0.45 }, // far arch lights
  { x: 67.4, y: 26.2, s: 9, o: 0.45 },
];

function sweepMarkup(src) {
  const rb = (stroke, w, extra = '') =>
    `<path class="rb" d="${ROUTE}" pathLength="1" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="0.42 2" stroke-dashoffset="0.42" ${extra}/>`;
  return `
    <defs>
      <linearGradient id="sw-satin" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1080" y2="1920">
        <stop offset="0" stop-color="#fbf4e8" />
        <stop offset=".12" stop-color="#efe0c6" />
        <stop offset=".24" stop-color="#fffaf1" />
        <stop offset=".38" stop-color="#ead9bb" />
        <stop offset=".5" stop-color="#fdf7ec" />
        <stop offset=".64" stop-color="#e8d4b2" />
        <stop offset=".78" stop-color="#fff9ef" />
        <stop offset=".9" stop-color="#ecdcbf" />
        <stop offset="1" stop-color="#f9f1e3" />
      </linearGradient>
      <filter id="sw-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16" /></filter>
      <filter id="sw-sheen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
      <mask id="sw-trail" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1880" height="2720">
        <path class="trail" d="${ROUTE}" pathLength="1" fill="none" stroke="#fff" stroke-width="600" stroke-linecap="round" stroke-dasharray="1 2" stroke-dashoffset="1" filter="url(#sw-soft)" />
        <rect class="trail-fill" x="-400" y="-400" width="1880" height="2720" fill="#fff" opacity="0" />
      </mask>
    </defs>
    <image class="sharp" href="${src}" x="0" y="0" width="1080" height="1920" preserveAspectRatio="none" mask="url(#sw-trail)" />
    <g class="ribbon-flow">
      ${rb('rgba(90,70,40,.3)', 226, 'filter="url(#sw-soft)" transform="translate(10 30)"')}
      ${rb('#dcc7a2', 214)}
      ${rb('url(#sw-satin)', 198)}
      ${rb('rgba(255,255,255,.8)', 44, 'filter="url(#sw-sheen)"')}
    </g>`;
}

function half(src, side) {
  const d = document.createElement('div');
  d.className = `half half-${side}`;
  const clip = side === 'left' ? `polygon(0 0, ${KNOT.x + 0.2}% 0, ${KNOT.x + 0.2}% 100%, 0 100%)` : `polygon(${KNOT.x - 0.2}% 0, 100% 0, 100% 100%, ${KNOT.x - 0.2}% 100%)`;
  d.style.clipPath = d.style.webkitClipPath = clip;
  d.innerHTML = `<img src="${src}" alt="" draggable="false">`;
  return d;
}

export function initBow(scene, { reduced }) {
  const intro = scene.querySelector('.intro');
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const svg = scene.querySelector('.ribbon');
  const fx = scene.querySelector('.fx');
  const untieBox = scene.querySelector('.untie');
  const glows = createGlows(scene.querySelector('.glows'), GLOWS);

  // Waiting state, seen through the opening petals: soft and slightly close.
  gsap.set(intro, { scale: 1.08 });
  gsap.set(img, { filter: 'blur(9px) brightness(1.06)' });

  /** Ribbon sweeps in and the bow photo is revealed behind it. */
  function tie() {
    if (reduced) {
      return gsap
        .timeline()
        .to(intro, { scale: 1, duration: 1.2, ease: 'power2.out' }, 0)
        .to(img, { filter: 'blur(0px) brightness(1)', duration: 1.2, ease: 'power2.out' }, 0)
        .add(() => glows.start(0.8), 0.6)
        .then();
    }

    svg.innerHTML = sweepMarkup(img.currentSrc || img.src);
    const ribbon = svg.querySelectorAll('.rb');
    const trail = svg.querySelector('.trail');
    const fill = svg.querySelector('.trail-fill');
    const LEN = 0.42;
    const flow = { d: LEN };

    const tl = gsap.timeline();
    tl.set(svg, { opacity: 1 }, 0)
      .to(
        flow,
        {
          d: -1,
          duration: 2.8,
          ease: 'power1.inOut',
          onUpdate: () => {
            ribbon.forEach((p) => p.setAttribute('stroke-dashoffset', flow.d));
            const head = Math.min(1, Math.max(0, LEN - flow.d));
            trail.setAttribute('stroke-dashoffset', 1 - head);
          },
        },
        0
      )
      // Ribbon lifts slightly as it flows (a hint of depth)
      .fromTo(svg.querySelector('.ribbon-flow'), { scale: 1.04, svgOrigin: '540 960' }, { scale: 1, svgOrigin: '540 960', duration: 2.8, ease: 'sine.inOut' }, 0)
      .to(fill, { attr: { opacity: 1 }, duration: 0.9, ease: 'sine.inOut' }, 1.9)
      .to(intro, { scale: 1, duration: 2.6, ease: 'power2.inOut' }, 0.2)
      .add(() => sparkleBurst(fx, KNOT.x, KNOT.y, 18), 2.1)
      .add(() => glows.start(1.4), 2.3);

    return tl.then(() => {
      gsap.set(img, { filter: 'none' });
      svg.style.display = 'none';
      svg.innerHTML = '';
    });
  }

  /** The bow unties: curtain halves part and the camera moves through. */
  function untie() {
    if (reduced) return gsap.to(scene, { opacity: 0, duration: 0.9, ease: 'power1.inOut' }).then();

    const src = img.currentSrc || img.src;
    const left = half(src, 'left');
    const right = half(src, 'right');
    untieBox.append(left, right);
    untieBox.style.display = 'block';
    plate.style.visibility = 'hidden';
    glows.stop();
    const cqw = scene.querySelector('.stage').getBoundingClientRect().width / 100;

    const tl = gsap.timeline();
    tl.add(() => sparkleBurst(fx, KNOT.x, KNOT.y, 14), 0)
      .to(scene.querySelectorAll('.glows, .fx'), { opacity: 0, duration: 0.5 }, 0)
      // A tiny tug on the knot before it lets go
      .to([left, right], { scale: 0.985, transformOrigin: `${KNOT.x}% ${KNOT.y}%`, duration: 0.25, ease: 'power2.in' }, 0)
      .to(left, { x: -62 * cqw, rotationY: 38, transformOrigin: '0% 50%', scale: 1.08, duration: 1.7, ease: 'power3.inOut' }, 0.25)
      .to(right, { x: 62 * cqw, rotationY: -38, transformOrigin: '100% 50%', scale: 1.08, duration: 1.7, ease: 'power3.inOut' }, 0.25)
      .to(intro, { scale: 1.12, duration: 1.9, ease: 'power2.inOut' }, 0.2)
      .to([left, right], { opacity: 0, duration: 0.7, ease: 'power1.in' }, 1.2)
      .to(scene.querySelector('.scene-bg'), { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 0.4);

    return tl.then(() => {
      scene.style.display = 'none';
      untieBox.innerHTML = '';
    });
  }

  return { tie, untie };
}
