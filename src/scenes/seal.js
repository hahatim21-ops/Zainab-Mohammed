import { gsap } from 'gsap';
import { SEAL, FLAPS, PETAL_PIECES, RING_SPLIT, envelopeRadius } from './sealGeometry.js';
import { PIECES } from './sealPieces.generated.js';

// Scene 1: the guest taps the wax seal and the flower really opens.
// The petals are soft-edged pieces cut from the artwork at build time:
//   1. the seal is pressed; the top envelope petal lifts back on its hinge
//   2. the side petals fold outward (the seal rides away on the left one)
//   3. the flower blooms — the inner ring of petals tilts open, then the
//      outer ring — as the camera drifts into the opening, onto the bow.

const AR = 1920 / 1080;
const deg = (d) => (d * Math.PI) / 180;

/** A trimmed piece, placed by its recorded box, inside its own 3D layer. */
function piece(name, hingeX, hingeY) {
  const b = PIECES[name];
  const persp = document.createElement('div');
  persp.className = 'persp';
  const el = document.createElement('div');
  el.className = 'piece';
  el.style.cssText = `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`;
  // Hinge given in % of the artwork → % of this piece's own box.
  el.style.transformOrigin = `${((hingeX - b.x) / b.w) * 100}% ${((hingeY - b.y) / b.h) * 100}%`;
  el.innerHTML = `<img class="face" src="/images/01-seal-${name}.webp" alt="" draggable="false">`;
  persp.appendChild(el);
  return { persp, el };
}

export function initSeal(scene, { reduced, onTap }) {
  const plate = scene.querySelector('.plate');
  const hit = scene.querySelector('.seal-hit');
  const ring = scene.querySelector('.seal-ring');
  const hint = scene.querySelector('.seal-hint');
  const intro = scene.querySelector('.intro');
  const glow = scene.querySelector('.seal-bloom');
  const box = scene.querySelector('.wedges');
  const origin = `${SEAL.x}% ${SEAL.y}%`;

  // Warm the cache so the pieces are ready the instant the seal is tapped.
  if (!reduced) {
    for (const name of Object.keys(PIECES)) new Image().src = `/images/01-seal-${name}.webp`;
  }

  // Idle: slow breathing zoom.
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

      const cqw = scene.querySelector('.stage').getBoundingClientRect().width / 100;

      // ── Flower petals (built first, so they sit beneath the envelope) ──
      const petals = PETAL_PIECES.map((p) => {
        const mid = (p.a0 + p.a1) / 2;
        // Hinge on the piece's inner edge, along its middle (in % of width).
        const r = (envelopeRadius(mid) * (p.ring === 'inner' ? 0.96 : RING_SPLIT)) / 10.8;
        const hx = SEAL.x + Math.cos(deg(mid)) * r;
        const hy = SEAL.y + (Math.sin(deg(mid)) * r) / AR;
        return { ...piece(`petal-${p.name}`, hx, hy), mid, ring: p.ring };
      });
      const outer = petals.filter((p) => p.ring === 'outer');
      const inner = petals.filter((p) => p.ring === 'inner');

      // ── Envelope petals, each with a softer underside ──
      const flaps = {};
      for (const [name, f] of Object.entries(FLAPS)) {
        const [hx, hy] = f.hinge.split(' ').map(parseFloat);
        const pc = piece(`flap-${name}`, hx, hy);
        pc.el.classList.add('flap');
        const back = document.createElement('img');
        back.className = 'face back';
        back.src = `/images/01-seal-flap-${name}.webp`;
        back.alt = '';
        pc.el.prepend(back);
        flaps[name] = pc;
      }
      // The wax seal stays whole and rides on the left petal.
      const wb = PIECES.wax;
      const fb = PIECES['flap-left'];
      const wax = document.createElement('img');
      wax.className = 'face wax';
      wax.src = '/images/01-seal-wax.webp';
      wax.alt = '';
      wax.style.cssText = `left:${((wb.x - fb.x) / fb.w) * 100}%;top:${((wb.y - fb.y) / fb.h) * 100}%;width:${(wb.w / fb.w) * 100}%;height:${(wb.h / fb.h) * 100}%`;
      flaps.left.el.appendChild(wax);

      for (const p of [...outer, ...inner, flaps.right, flaps.left, flaps.top]) box.appendChild(p.persp);
      box.style.display = 'block';

      const tl = gsap.timeline();
      if (import.meta.env.DEV) window.__sealTl = tl;

      tl.to([ring, hint], { opacity: 0, duration: 0.45, ease: 'power1.out' }, 0)
        // The seal is pressed
        .fromTo(wax, { scale: 1 }, { scale: 0.94, duration: 0.16, ease: 'power2.in' }, 0)
        .to(wax, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 0.16)
        // The printed artwork hands over to the pieces (identical at rest)
        .to(plate, { opacity: 0, duration: 0.3, ease: 'none' }, 0.22)
        .to(scene.querySelector('.scene-bg'), { opacity: 0, duration: 0.4, ease: 'none' }, 0.22)
        .to(scene.querySelector('.bands'), { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 1.6)
        // Warm light from inside the envelope
        .fromTo(glow, { opacity: 0, scale: 0.5 }, { opacity: 0.32, scale: 2.2, duration: 1.4, ease: 'sine.out' }, 0.35)
        .to(glow, { opacity: 0, duration: 1.0, ease: 'sine.in' }, 1.8)
        // 1 · The top petal lifts back over its hinge
        .to(flaps.top.el, { rotationX: 168, duration: 1.3, ease: 'power2.inOut' }, 0.25)
        // 2 · The side petals fold outward, one after the other
        .to(flaps.left.el, { rotationY: -166, duration: 1.35, ease: 'power2.inOut' }, 0.6)
        .to(flaps.right.el, { rotationY: 166, duration: 1.35, ease: 'power2.inOut' }, 0.75)
        // Camera drifts into the opening
        .to(intro, { scale: 1.14, duration: 2.6, ease: 'power1.inOut' }, 0.5);

      // 3 · The flower blooms: each petal tilts back on its inner edge and
      //     eases outward — inner ring first, then the outer ring.
      const bloom = (list, start, tilt, push) =>
        list.forEach((p, i) => {
          const dx = Math.cos(deg(p.mid));
          const dy = Math.sin(deg(p.mid));
          tl.to(
            p.el,
            {
              rotationX: -dy * tilt,
              rotationY: dx * tilt,
              x: dx * push * cqw,
              y: dy * push * cqw,
              scale: 1.04,
              duration: 1.7,
              ease: 'power2.inOut',
            },
            start + (i % 3) * 0.07
          );
        });
      bloom(inner, 0.95, 60, 7);
      bloom(outer, 1.2, 50, 12);

      // Everything softens away as the bow scene takes over
      tl.to(Object.values(flaps).map((f) => f.el), { opacity: 0, duration: 0.7, ease: 'power1.in' }, 1.95)
        .to(inner.map((p) => p.el), { opacity: 0, duration: 0.8, ease: 'power1.in' }, 2.05)
        .to(outer.map((p) => p.el), { opacity: 0, duration: 0.9, ease: 'power1.in' }, 1.95);

      await tl;
      idle.kill();
      scene.style.display = 'none';
      box.innerHTML = '';
    }
  });
}
