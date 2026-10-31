import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Smooth scrolling (Lenis) wired into ScrollTrigger. The pages are fixed
// layers; #track only gives the document its height, and `allow(screens)`
// sets how far the guest may scroll (0 while the opening plays and until
// the date is revealed).

export function createScroll({ reduced }) {
  const track = document.getElementById('track');
  const hint = document.getElementById('scroll-hint');
  let unit = window.innerHeight; // a stable "screen" that ignores URL-bar resizes
  let lastW = window.innerWidth;
  let allowed = 0;
  let hintEnabled = false;
  let idleTimer = 0;

  const lenis = new Lenis({
    duration: reduced ? 0.6 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: true, // touch follows the finger, then glides
    syncTouchLerp: 0.085,
    touchInertiaExponent: 1.6,
    autoRaf: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const applyHeight = () => {
    track.style.height = `${Math.round(window.innerHeight + allowed * unit)}px`;
  };
  const atEnd = () => window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 8;
  const showHint = (on) => hint.classList.toggle('is-visible', on);
  const scheduleHint = () => {
    clearTimeout(idleTimer);
    if (!hintEnabled) return;
    idleTimer = setTimeout(() => {
      if (hintEnabled && !atEnd() && !lenis.isStopped) showHint(true);
    }, 3000);
  };
  lenis.on('scroll', () => {
    showHint(false);
    scheduleHint();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastW || Math.abs(window.innerHeight - unit) > 160) {
      lastW = window.innerWidth;
      unit = window.innerHeight;
      applyHeight();
      ScrollTrigger.refresh();
    }
  });

  return {
    lenis,
    get unit() {
      return unit;
    },
    lock() {
      lenis.stop();
      document.body.classList.add('is-locked');
      showHint(false);
    },
    unlock() {
      document.body.classList.remove('is-locked');
      lenis.start();
    },
    allow(screens) {
      allowed = screens;
      applyHeight();
      lenis.resize();
      ScrollTrigger.refresh();
    },
    hint(on = true) {
      hintEnabled = on;
      showHint(on);
      if (on) scheduleHint();
    },
    toTop() {
      lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    },
  };
}
