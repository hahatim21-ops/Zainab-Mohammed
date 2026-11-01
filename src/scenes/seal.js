import { gsap } from 'gsap';

// Scene 1: the guest taps the wax seal. The seal lifts off whole and fades;
// the flower then opens from the centre — the bow scene (layered above)
// shows through a soft, feathered, petal-shaped opening that grows while the
// outer petals drift outward and soften. No cut lines, no flaps, no zoom.
//
// Built for phones: the opening is the bow scene's own mask, sized directly
// (no oversized layers, no inherited style changes); the bow scene is laid
// out and painted before the tap; the softening is a pre-blurred copy of the
// flower that fades in.

const C = { x: 52.4, y: 51.9 }; // seal centre, % of the artwork
const SEAL_R = 11.6; // seal radius, % of width

// A soft rosette (eight rounded petals around a disc) used as the opening's
// shape. Drawn once, before the tap; the animation only resizes it. The
// shadow trick gives a feathered edge in every browser.
function rosette(size = 768) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2;
  const away = size * 3;
  const draw = (blur, alpha, grow) => {
    g.save();
    g.translate(cx - away, cx);
    g.beginPath();
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + 0.2;
      const r = size * 0.2 * grow * (1 + 0.06 * Math.sin(i * 2.3));
      g.ellipse(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.62, r * 0.4, a, 0, Math.PI * 2);
    }
    g.moveTo(size * 0.17 * grow, 0);
    g.arc(0, 0, size * 0.17 * grow, 0, Math.PI * 2);
    g.shadowColor = `rgba(0,0,0,${alpha})`;
    g.shadowBlur = blur;
    g.shadowOffsetX = away;
    g.fillStyle = '#000';
    g.fill('nonzero');
    g.restore();
  };
  draw(size * 0.06, 0.5, 1.12);
  draw(size * 0.035, 1, 1);
  return c.toDataURL('image/png');
}

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

const MASK_PROPS = ['maskImage', 'webkitMaskImage', 'maskSize', 'webkitMaskSize', 'maskPosition', 'webkitMaskPosition', 'maskRepeat', 'webkitMaskRepeat'];

export function initSeal(scene, { reduced, onTap, reveal }) {
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const hit = scene.querySelector('.seal-hit');
  const ring = scene.querySelector('.seal-ring');
  const hint = scene.querySelector('.seal-hint');
  const intro = scene.querySelector('.intro');
  const stage = scene.querySelector('.stage');
  const ms = reveal.style;

  // The opening, sized in px around the seal, set straight on the bow
  // scene's own mask (nothing inherits it, so nothing else restyles).
  const geo = {};
  const hole = { s: 0 };
  const setHole = () => {
    ms.maskSize = ms.webkitMaskSize = `${hole.s}px ${hole.s}px`;
    ms.maskPosition = ms.webkitMaskPosition = `${geo.cx - hole.s / 2}px ${geo.cy - hole.s / 2}px`;
  };
  const place = () => {
    const r = stage.getBoundingClientRect();
    geo.r = r;
    geo.cx = r.left + (r.width * C.x) / 100;
    geo.cy = r.top + (r.height * C.y) / 100;
    geo.max = Math.hypot(Math.max(geo.cx, innerWidth - geo.cx), Math.max(geo.cy, innerHeight - geo.cy)) * 2 * 1.9;
    setHole();
  };

  // Prepared before the tap:
  //  - the bow scene sits above, fully closed, so it is already painted
  //  - the seal that will lift away, in a twin stage over the artwork
  //  - a softened copy of the flower (blurred at build time) to fade in
  let liftStage, seal, soft;
  if (!reduced) {
    ms.maskImage = ms.webkitMaskImage = `url(${rosette()})`;
    ms.maskRepeat = ms.webkitMaskRepeat = 'no-repeat';
    place();
    window.addEventListener('resize', place);
    reveal.classList.remove('is-waiting');

    liftStage = document.createElement('div');
    liftStage.className = 'stage seal-lift';
    liftStage.style.visibility = 'hidden';
    seal = copyLayer(img.currentSrc || img.src, 'seal-piece');
    seal.style.clipPath = seal.style.webkitClipPath = `circle(${SEAL_R + 0.3}cqw at ${C.x}% ${C.y}%)`;
    liftStage.appendChild(seal);
    scene.after(liftStage);

    soft = document.createElement('img');
    soft.className = 'plate-soft';
    soft.src = '/images/01-seal-soft.webp';
    soft.alt = '';
    soft.setAttribute('aria-hidden', 'true');
    soft.style.opacity = '0';
    plate.after(soft);
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
        reveal.classList.remove('is-waiting');
        await gsap.to(scene, { opacity: 0, duration: 1, ease: 'power1.inOut' });
        scene.style.display = 'none';
        return;
      }

      // The seal copy covers the real one, then lifts away.
      liftStage.style.visibility = 'visible';
      gsap.set(seal, { scale: gsap.getProperty(intro, 'scale'), transformOrigin: origin });
      const { r } = geo;

      const tl = gsap.timeline();
      if (import.meta.env.DEV) window.__sealTl = tl;
      tl.to([ring, hint], { opacity: 0, duration: 0.5, ease: 'power1.out' }, 0)
        // The seal is pressed, then lifts away whole
        .to(seal, { scale: '-=0.05', duration: 0.18, ease: 'power2.in' }, 0)
        .to(seal, { scale: '+=0.2', y: -r.width * 0.06, duration: 1.3, ease: 'power2.out' }, 0.18)
        .to(seal, { opacity: 0, duration: 0.8, ease: 'power1.in' }, 0.95)
        // The flower opens from the centre
        // (first just wide enough to open the seal's spot as it lifts)
        .to(hole, { s: r.width * 0.42, duration: 0.45, ease: 'power2.out', onUpdate: setHole }, 0.12)
        .to(hole, { s: geo.max, duration: 2.1, ease: 'power2.in', onUpdate: setHole }, 0.57)
        // …while the outer petals drift outward and soften
        .to(intro, { scale: 1.22, duration: 2.4, ease: 'power1.in' }, 0.35)
        .to(soft, { opacity: 1, duration: 2.0, ease: 'power1.in' }, 0.5)
        .to(scene.querySelectorAll('.scene-bg, .bands'), { opacity: 0, duration: 1.4, ease: 'power1.in' }, 1.0);

      await tl;
      idle.kill();
      window.removeEventListener('resize', place);
      for (const k of MASK_PROPS) ms[k] = '';
      scene.style.display = 'none';
      liftStage.remove();
    }
  });
}
