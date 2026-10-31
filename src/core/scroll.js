import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Smooth, natural page scrolling (Lenis) wired into ScrollTrigger, plus the
// scroll lock used while the opening plays.

export function createScroll({ reduced }) {
  const hint = document.getElementById('scroll-hint');
  let hintEnabled = false;
  let idleTimer = 0;

  const lenis = new Lenis({
    duration: reduced ? 0.6 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.1,
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
      if (hintEnabled && !atEnd() && !lenis.isStopped) showHint(true);
    }, 3200);
  };
  lenis.on('scroll', () => {
    showHint(false);
    scheduleHint();
  });

  return {
    lenis,
    lock() {
      lenis.stop();
      document.body.classList.add('is-locked');
      showHint(false);
    },
    unlock() {
      document.body.classList.remove('is-locked');
      lenis.start();
      lenis.resize();
      ScrollTrigger.refresh();
    },
    /** Show the hint now and again whenever the guest pauses mid-way. */
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
