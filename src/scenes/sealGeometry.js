// The petal envelope in 01-seal, traced in % of the artwork (1080×1920).
// Shared by scripts/optimize-images.mjs (which cuts the pieces with soft
// edges) and src/scenes/seal.js (which opens them).

export const SEAL = { x: 52.4, y: 51.9, r: 11.6 }; // centre (%), radius (% of width)

// Envelope outline, clockwise from the left shoulder.
export const ENVELOPE = [
  [21.4, 32.9], [28, 28], [38, 24.5], [52.4, 22.6], [63, 25], [75, 29], [83, 32.9],
  [83.5, 40], [83, 48.8], [81.5, 55], [78.9, 60.6], [70, 66], [60, 72], [51.2, 76.5],
  [42, 72], [33, 67.5], [26.9, 63.2], [25, 57], [24.1, 51.4], [22.5, 42],
];

// The three envelope petals and the hinge each folds back on.
export const FLAPS = {
  top: {
    poly: [[21.4, 32.9], [28, 28], [38, 24.5], [52.4, 22.6], [63, 25], [75, 29], [83, 32.9], [59.7, 42.1], [56, 40], [52.4, 39.6], [48, 40.3], [44.2, 42.1]],
    hinge: '50% 29%',
  },
  left: {
    poly: [[21.4, 32.9], [44.2, 42.1], [48, 44.2], [52.4, 46.4], [52.4, 59], [51.2, 76.5], [42, 72], [33, 67.5], [26.9, 63.2], [25, 57], [24.1, 51.4], [22.5, 42]],
    hinge: '23% 52%',
  },
  right: {
    poly: [[83, 32.9], [59.7, 42.1], [55.1, 45.7], [52.4, 46.4], [52.4, 59], [51.2, 76.5], [60, 72], [70, 66], [78.9, 60.6], [81.5, 55], [83, 48.8], [83.5, 40]],
    hinge: '83% 50%',
  },
};

// The flower around the envelope is cut into two rings of petals; each ring
// is split into sectors (outer ring offset by half a sector, like real
// petals). Seams are feathered so a piece never shows a straight edge.
export const RING_SPLIT = 1.55; // inner ring = up to 1.55× the envelope's radius
export const SECTORS = 6;
export const OUTER_OFFSET = 30; // degrees
export const FIRST_ANGLE = -120; // degrees, 0 = right, 90 = down

export const PETAL_PIECES = [];
for (const ring of ['inner', 'outer']) {
  for (let i = 0; i < SECTORS; i++) {
    const a0 = FIRST_ANGLE + (ring === 'outer' ? OUTER_OFFSET : 0) + (360 / SECTORS) * i;
    PETAL_PIECES.push({ name: `${ring}${i}`, ring, a0, a1: a0 + 360 / SECTORS });
  }
}

// Distance from the seal centre to the envelope outline along an angle, in
// artwork pixels (1080-wide).
export function envelopeRadius(deg, W = 1080, H = 1920) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = (SEAL.x / 100) * W;
  const cy = (SEAL.y / 100) * H;
  let best = Infinity;
  for (let i = 0; i < ENVELOPE.length; i++) {
    const [x1, y1] = ENVELOPE[i];
    const [x2, y2] = ENVELOPE[(i + 1) % ENVELOPE.length];
    const px = (x1 / 100) * W - cx;
    const py = (y1 / 100) * H - cy;
    const ex = ((x2 - x1) / 100) * W;
    const ey = ((y2 - y1) / 100) * H;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (px * ey - py * ex) / den;
    const u = (px * dy - py * dx) / den;
    if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best;
}
