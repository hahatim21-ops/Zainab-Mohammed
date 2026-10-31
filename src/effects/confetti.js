import confetti from 'canvas-confetti';

const COLORS = ['#F8F1E4', '#E9D9B8', '#C9A96E', '#9AA07A', '#6E6245'];

let shapes = null;
function getShapes() {
  if (shapes) return shapes;
  shapes = ['square', 'circle'];
  try {
    const petal = confetti.shapeFromPath({ path: 'M6 0C9.5 3.5 10 8 6 13C2 8 2.5 3.5 6 0Z' });
    shapes.push(petal, petal);
  } catch {
    /* older browsers: squares and circles only */
  }
  return shapes;
}

/** Two cannons at the left/right edges, 2–3 bursts over ~1.5s. */
export function fireCannons({ reduced = false } = {}) {
  const shapes = getShapes();
  const base = {
    colors: COLORS,
    shapes,
    ticks: 260,
    gravity: 0.9,
    decay: 0.92,
    scalar: 1.05,
    disableForReducedMotion: false,
    zIndex: 120,
  };

  if (reduced) {
    confetti({ ...base, particleCount: 24, angle: 60, spread: 50, startVelocity: 40, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 24, angle: 120, spread: 50, startVelocity: 40, origin: { x: 1, y: 0.65 } });
    return;
  }

  const bursts = [
    { at: 0, count: 70, velocity: 58 },
    { at: 550, count: 50, velocity: 50 },
    { at: 1150, count: 40, velocity: 44 },
  ];
  bursts.forEach(({ at, count, velocity }) => {
    setTimeout(() => {
      confetti({ ...base, particleCount: count, angle: 60, spread: 58, startVelocity: velocity, origin: { x: 0, y: 0.65 } });
      confetti({ ...base, particleCount: count, angle: 120, spread: 58, startVelocity: velocity, origin: { x: 1, y: 0.65 } });
    }, at);
  });
}
