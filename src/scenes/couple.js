import { createGlows } from '../effects/glows.js';
import { twinkleField } from '../effects/sparkles.js';

// Scene 7 (finale): chandelier candles flicker and the crystals twinkle.
// (The gold sheen across the names is handled with the other pages.)

// Candle flame tips measured from 07-couple (x/y in %).
const FLAMES = [
  [43.2, 13.1],
  [46.1, 12.4],
  [51.3, 12.6],
  [54.4, 7.8],
  [61.4, 7.1],
  [62.9, 12.3],
  [65.4, 11.0],
  [70.6, 12.6],
  [75.4, 14.0],
];

export function initCouple(scene, { reduced, onReplay }) {
  const glows = createGlows(
    scene.querySelector('.glows'),
    FLAMES.map(([x, y]) => ({ x, y: y + 0.4, s: 7.5, o: 0.8 }))
  );
  const replay = scene.querySelector('.replay');
  replay.addEventListener('click', onReplay);

  let started = false;
  function start() {
    if (started) return;
    started = true;
    glows.start(1.2);
    if (!reduced) twinkleField(scene.querySelector('.twinkles'), { x0: 40, x1: 76, y0: 15, y1: 27 }, 7, 2.4);
  }

  return { start, replay };
}
