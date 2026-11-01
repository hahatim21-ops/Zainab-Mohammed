// While the seal and bow play on top, the pages underneath are hidden and
// nothing on them should run. Effects ask for on/off through `gated`; their
// wishes are held until main.js announces the intro is done.

const playing = () => document.body.classList.contains('intro-playing');

/** Wraps an on/off switch so it only turns on once the intro is over. */
export function gated(apply) {
  let want = false;
  window.addEventListener('intro:done', () => apply(want), { once: true });
  return (on) => {
    want = on;
    apply(on && !playing());
  };
}

export function introDone() {
  document.body.classList.remove('intro-playing');
  window.dispatchEvent(new Event('intro:done'));
}
