import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Smooth, natural page scrolling (Lenis) wired into ScrollTrigger, plus the
// scroll lock used while the opening plays.
//
// The lock never touches `overflow`: Android Chrome does not re-enable touch
// scrolling when overflow on <html>/<body> is switched back after a lock.
// Instead, scroll gestures are simply swallowed while locked.

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

export function createScroll({ reduced }) {
  const hint = document.getElementById('scroll-hint');
  let hintEnabled = false;
  let idleTimer = 0;
  let locked = false;

  // Registered before Lenis so they run first and can stop it seeing input.
  const block = (e) => {
    if (!locked) return;
    if (e.type === 'keydown' && !SCROLL_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const opts = { passive: false, capture: true };
  window.addEventListener('wheel', block, opts);
  window.addEventListener('touchmove', block, opts);
  window.addEventListener('keydown', block, opts);

  const lenis = new Lenis({
    duration: reduced ? 0.6 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false, // touch scrolling stays fully native on phones
    autoRaf: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const atEnd = () => window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 8;
  const showHint = (on) => hint.classList.toggle('is-visible', on);
  const scheduleHint = () => {
    clearTimeout(idleTimer);
    if (!hintEnabled) return;
    idleTimer = setTimeout(() => {
      // (not on the names card, which has its own "Scroll down" box)
      if (hintEnabled && !atEnd() && !locked && window.scrollY > window.innerHeight * 0.6) showHint(true);
    }, 3200);
  };
  lenis.on('scroll', () => {
    showHint(false);
    scheduleHint();
  });

  return {
    lenis,
    lock() {
      locked = true;
      showHint(false);
    },
    unlock() {
      // The page's size never changes when unlocking, so nothing to re-measure.
      locked = false;
    },
    /** Show the hint now and again whenever the guest pauses mid-way. */
    hint(on = true, now = true) {
      hintEnabled = on;
      showHint(on && now);
      if (on) scheduleHint();
    },
    toTop() {
      lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    },
  };
}
