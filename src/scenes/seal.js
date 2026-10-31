import { gsap } from 'gsap';

// Scene 1: the guest taps the wax seal. The seal lifts off whole and fades;
// the flower then opens from the centre — the bow scene (layered above, with
// `reveal`) shows through a soft, feathered, petal-shaped opening that grows
// while the outer petals drift outward and soften. No cut lines, no flaps.

const C = { x: 52.4, y: 51.9 }; // seal centre, % of the artwork
const SEAL_R = 11.6; // seal radius, % of width

// A soft rosette (eight rounded petals around a disc) used as the opening's
// shape. Drawn once; the animation only grows it. The shadow trick gives a
// feathered edge in every browser.
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

export function initSeal(scene, { reduced, onTap, reveal }) {
  const plate = scene.querySelector('.plate');
  const img = plate.querySelector('img');
  const hit = scene.querySelector('.seal-hit');
  const ring = scene.querySelector('.seal-ring');
  const hint = scene.querySelector('.seal-hint');
  const intro = scene.querySelector('.intro');
  const stage = scene.querySelector('.stage');

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

      // The seal travels above everything, in a twin stage with the same
      // size and position as the artwork.
      const liftStage = document.createElement('div');
      liftStage.className = 'stage seal-lift';
      const seal = copyLayer(img.currentSrc || img.src, 'seal-piece');
      seal.style.clipPath = seal.style.webkitClipPath = `circle(${SEAL_R + 0.3}cqw at ${C.x}% ${C.y}%)`;
      liftStage.appendChild(seal);
      scene.after(liftStage);
      gsap.set(seal, { scale: gsap.getProperty(intro, 'scale'), transformOrigin: origin });

      // Opening: the next scene shows through a growing rosette.
      const r = stage.getBoundingClientRect();
      const cx = r.left + (r.width * C.x) / 100;
      const cy = r.top + (r.height * C.y) / 100;
      const maxSize = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) * 2 * 1.9;
      const hole = { s: 0 };
      reveal.style.setProperty('--rosette', `url(${rosette()})`);
      const setHole = () => {
        const s = Math.max(2, hole.s);
        reveal.style.setProperty('--hole-size', `${s}px`);
        reveal.style.setProperty('--hole-pos', `${cx - s / 2}px ${cy - s / 2}px`);
      };
      setHole();
      reveal.classList.add('is-revealing');
      reveal.classList.remove('is-waiting');

      const tl = gsap.timeline();
      if (import.meta.env.DEV) window.__sealTl = tl;
      tl.to([ring, hint], { opacity: 0, duration: 0.5, ease: 'power1.out' }, 0)
        // The seal is pressed, then lifts away whole
        .to(seal, { scale: '-=0.05', duration: 0.18, ease: 'power2.in' }, 0)
        .to(seal, { scale: '+=0.2', y: -r.width * 0.06, duration: 1.3, ease: 'power2.out' }, 0.18)
        .fromTo(seal, { filter: 'drop-shadow(0 0 0 rgba(80,70,50,0))' }, { filter: 'drop-shadow(0 18px 18px rgba(80,70,50,.28))', duration: 0.8, ease: 'sine.out' }, 0.18)
        .to(seal, { opacity: 0, duration: 0.8, ease: 'power1.in' }, 0.95)
        // The flower opens from the centre
        // (first just wide enough to open the seal's spot as it lifts)
        .to(hole, { s: r.width * 0.42, duration: 0.45, ease: 'power2.out', onUpdate: setHole }, 0.12)
        .to(hole, { s: maxSize, duration: 2.1, ease: 'power2.in', onUpdate: setHole }, 0.57)
        // …while the outer petals drift outward and soften
        .to(intro, { scale: 1.22, duration: 2.4, ease: 'power1.in' }, 0.35)
        .fromTo(plate, { filter: 'blur(0px) brightness(1)' }, { filter: 'blur(5px) brightness(1.06)', duration: 2.2, ease: 'power1.in' }, 0.5)
        .to(scene.querySelectorAll('.scene-bg, .bands'), { opacity: 0, duration: 1.4, ease: 'power1.in' }, 1.0);

      await tl;
      idle.kill();
      reveal.classList.remove('is-revealing', 'is-waiting');
      scene.style.display = 'none';
      liftStage.remove();
    }
  });
}
