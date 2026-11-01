// Generates web-ready images from /assets into /public.
//   - 1080×1920 WebP (q≈82) + JPG fallback for every scene
//   - small, pre-blurred + brightened backdrop for the letterbox fill
//   - 1200×630 og-image.jpg from the couple artwork (names centred)
//   - PNG icons from the SVG monogram
//   - a taller copy of each painting with soft mirrored bands above/below,
//     so phones taller than 9:16 never show bars
//   - the bow cut into soft-edged pieces + the background rebuilt behind it
//   - copies assets/music.mp3 → src/assets/audio/music.mp3 (bundled with a
//     content hash, so phones never keep an old copy)
// Run with: npm run optimize
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOW_PARTS, PART_ORDER } from '../src/scenes/bowGeometry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const outImg = path.join(root, 'public', 'images');
const outAudio = path.join(root, 'src', 'assets', 'audio');
fs.mkdirSync(outImg, { recursive: true });
fs.mkdirSync(outAudio, { recursive: true });

const W = 1080;
const H = 1920;

// How far the printed date on 03-date is lifted (% of height) — see liftDateText.
const DATE_LIFT = 4.5;
const DATE_BOX = { x0: 24, x1: 89, y0: 48.4, y1: 61 };

// Match files by their numeric prefix so the descriptive filenames can stay as delivered.
const SCENES = ['01-seal', '02-bow', '02b-names', '03-date', '05-nikah', '06-dinner', '07-couple'];
const files = fs.readdirSync(assets);
const findAsset = (prefix) => files.find((f) => f.startsWith(prefix.slice(0, 3)) && /\.(png|jpe?g|webp)$/i.test(f));

for (const name of SCENES) {
  const file = findAsset(name);
  if (!file) {
    console.warn(`! missing asset for ${name}`);
    continue;
  }
  const src = path.join(assets, file);
  let base = sharp(src).rotate().resize(W, H, { fit: 'cover', kernel: 'lanczos3' });
  if (name === '03-date') base = await liftDateText(base);

  await base.clone().webp({ quality: 82, effort: 5 }).toFile(path.join(outImg, `${name}.webp`));
  await base.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(outImg, `${name}.jpg`));

  // Backdrop: tiny + blurred ≈ a 40px blur at full size, slightly brightened.
  await sharp(src)
    .resize(270, 480, { fit: 'cover' })
    .blur(10)
    .modulate({ brightness: 1.06, saturation: 0.95 })
    .webp({ quality: 70 })
    .toFile(path.join(outImg, `${name}-bg.webp`));

  await extendPainting(base.clone(), path.join(outImg, `${name}-bands.webp`));
  // The bow's soft "waiting" look, blurred here so the phone never has to.
  if (name === '02-bow') {
    await base.clone().blur(8).modulate({ brightness: 1.04 }).webp({ quality: 78 }).toFile(path.join(outImg, '02-bow-soft.webp'));
  }
  console.log(`✓ ${name}  ←  ${file}`);
}

// 03-date has a big gap between "Date!" and the printed date. This lifts the
// date line and إن شاء الله up by DATE_LIFT (% of height): the ink is lifted
// off the wall with its anti-aliasing, the wall behind it is rebuilt, and the
// ink is laid back down higher up. Overlay positions in scenes.css match.
async function liftDateText(pipeline) {
  const img = await pipeline.removeAlpha().raw().toBuffer();
  const lum = (i) => 0.299 * img[i * 3] + 0.587 * img[i * 3 + 1] + 0.114 * img[i * 3 + 2];
  const X0 = Math.round((W * DATE_BOX.x0) / 100), X1 = Math.round((W * DATE_BOX.x1) / 100);
  const Y0 = Math.round((H * DATE_BOX.y0) / 100), Y1 = Math.round((H * DATE_BOX.y1) / 100);
  // Ink = clearly darker than the wall; grown a few px so edges go too.
  const ink = new Uint8Array(W * H);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (lum(y * W + x) < 170) ink[y * W + x] = 1;
  const hole = Buffer.alloc(W * H);
  const R = 4;
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    if (!ink[y * W + x]) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) hole[(y + dy) * W + (x + dx)] = 255;
  }
  const clean = pushPullFill(img, hole, W, H);
  const out = Buffer.from(clean);
  const shift = Math.round((H * DATE_LIFT) / 100);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = y * W + x;
    if (!hole[i]) continue;
    const bg = 0.299 * clean[i * 3] + 0.587 * clean[i * 3 + 1] + 0.114 * clean[i * 3 + 2];
    const a = Math.max(0, Math.min(1, (bg - lum(i) - 6) / Math.max(1, bg - 95)));
    if (!a) continue;
    const j = (y - shift) * W + x;
    for (let c = 0; c < 3; c++) out[j * 3 + c] = Math.round(out[j * 3 + c] * (1 - a) + img[i * 3 + c] * a);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } });
}

// Phones are taller than 9:16. This makes the two 1080×360 bands that sit
// above and below a painting (stacked in one 1080×720 file): its own top and
// bottom edges mirrored, sharp at the seam and softening outward, so the
// painting simply continues.
async function extendPainting(pipeline, out) {
  const BAND = 360;
  const img = await pipeline.removeAlpha().raw().toBuffer();
  const strip = async (top) => {
    const raw = sharp(img, { raw: { width: W, height: H, channels: 3 } })
      .extract({ left: 0, top: top ? 0 : H - BAND, width: W, height: BAND })
      .flip();
    const near = await raw.clone().blur(3).raw().toBuffer();
    const far = await raw.clone().blur(26).modulate({ brightness: 1.04 }).raw().toBuffer();
    const outBuf = Buffer.alloc(W * BAND * 3);
    for (let y = 0; y < BAND; y++) {
      // t: 0 at the seam with the painting → 1 at the outer edge
      const t = Math.min(1, (top ? BAND - 1 - y : y) / (BAND * 0.75));
      const k = t * t * (3 - 2 * t);
      for (let x = 0; x < W; x++) {
        for (let c = 0; c < 3; c++) {
          const i = (y * W + x) * 3 + c;
          outBuf[i] = Math.round(near[i] * (1 - k) + far[i] * k);
        }
      }
    }
    return outBuf;
  };
  const raw = { raw: { width: W, height: BAND, channels: 3 } };
  await sharp({ create: { width: W, height: BAND * 2, channels: 3, background: '#f8f1e4' } })
    .composite([
      { input: await strip(true), ...raw, left: 0, top: 0 },
      { input: await strip(false), ...raw, left: 0, top: BAND },
    ])
    .webp({ quality: 80 })
    .toFile(out);
}

// The bow: cut each piece out (soft-edged, transparent WebP) and rebuild the
// background behind it, so the real bow can move.
{
  const src = path.join(assets, findAsset('02-bow'));
  const { data } = await sharp(src).resize(W, H, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const polySvg = (pts, extra = '') =>
    `<polygon points="${pts.map(([x, y]) => `${(x / 100) * W},${(y / 100) * H}`).join(' ')}" ${extra || 'fill="#fff"'}/>`;
  const maskOf = async (svgBody, blur, defs = '') => {
    let m = sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs><rect width="100%" height="100%" fill="#000"/>${svgBody}</svg>`)).greyscale();
    if (blur) m = m.blur(blur);
    return m.extractChannel(0).raw().toBuffer();
  };
  // The tails melt into the side curtains, so their outer ends fade out.
  const FADES = {
    tailL: '<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="21" y1="0" x2="216" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>',
    tailR: '<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="1075" y1="0" x2="880" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>',
  };

  // Each piece is trimmed to its own box (small GPU layers when it moves);
  // the boxes go to src/scenes/bowPieces.generated.js.
  const boxes = {};
  for (const name of PART_ORDER) {
    const alpha = await maskOf(polySvg(BOW_PARTS[name], FADES[name] ? 'fill="url(#f)"' : ''), 2.2, FADES[name] || '');
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 2) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
    const rgba = await sharp(data, { raw: { width: W, height: H, channels: 3 } })
      .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
      .raw()
      .toBuffer();
    await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
      .extract(box)
      .webp({ quality: 84, alphaQuality: 90, effort: 5 })
      .toFile(path.join(outImg, `02-bow-${name}.webp`));
    const pc = (v, of) => +((v / of) * 100).toFixed(3);
    boxes[name] = { x: pc(x0, W), y: pc(y0, H), w: pc(box.width, W), h: pc(box.height, H) };
  }
  fs.writeFileSync(
    path.join(root, 'src', 'scenes', 'bowPieces.generated.js'),
    `// Generated by scripts/optimize-images.mjs — where each bow piece sits, in %
// of the artwork. Do not edit by hand.
export const PIECES = ${JSON.stringify(boxes, null, 2)};
`
  );

  // Region to rebuild = every piece, grown a little so no lace edge survives.
  const hole = await maskOf(PART_ORDER.map((n) => polySvg(BOW_PARTS[n], 'fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"')).join(''), 0);
  const smooth = pushPullFill(data, hole, W, H);
  const vertical = columnFill(data, hole, W, H);
  // Mostly the column fill (keeps the hanging strands and columns), softened
  // by the smooth fill, then blended in through a feathered edge.
  const soft = await maskOf(PART_ORDER.map((n) => polySvg(BOW_PARTS[n], 'fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"')).join(''), 6);
  const vBlur = await sharp(vertical, { raw: { width: W, height: H, channels: 3 } }).blur(1.6).raw().toBuffer();
  const filled = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = soft[i] / 255;
    for (let c = 0; c < 3; c++) {
      const k = i * 3 + c;
      const fill = vBlur[k] * 0.72 + smooth[k] * 0.28;
      filled[k] = Math.round(data[k] * (1 - a) + fill * a);
    }
  }
  const clean = sharp(filled, { raw: { width: W, height: H, channels: 3 } });
  await clean.clone().webp({ quality: 82 }).toFile(path.join(outImg, '02-bow-clean.webp'));
  await clean.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outImg, '02-bow-clean.jpg'));
  console.log('✓ bow pieces + rebuilt background');
}

// Fills masked pixels per column, blending between the nearest known pixels
// above and below — the scene behind the bow is mostly vertical (hanging
// flowers, columns, archway), so this keeps its lines.
function columnFill(rgb, mask, w, h) {
  const out = Buffer.from(rgb);
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      if (mask[y * w + x] < 128) {
        y++;
        continue;
      }
      const top = y - 1;
      let end = y;
      while (end < h && mask[end * w + x] >= 128) end++;
      const bottom = end < h ? end : -1;
      for (let yy = y; yy < end; yy++) {
        const t = (yy - top) / (end - top);
        for (let c = 0; c < 3; c++) {
          const a = top >= 0 ? rgb[(top * w + x) * 3 + c] : rgb[(bottom * w + x) * 3 + c];
          const b = bottom >= 0 ? rgb[(bottom * w + x) * 3 + c] : a;
          out[(yy * w + x) * 3 + c] = Math.round(a * (1 - t) + b * t);
        }
      }
      y = end;
    }
  }
  return out;
}

// Fills masked pixels from their surroundings (push-pull pyramid): each level
// averages known pixels, then holes are filled from the coarser level. Gives
// a soft, colour-true backdrop wherever the bow used to be.
function pushPullFill(rgb, mask, w, h) {
  const levels = [];
  let cw = w;
  let ch = h;
  let col = new Float32Array(w * h * 3);
  let wt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const known = mask[i] < 128 ? 1 : 0;
    wt[i] = known;
    for (let c = 0; c < 3; c++) col[i * 3 + c] = rgb[i * 3 + c] * known;
  }
  levels.push({ w: cw, h: ch, col, wt });
  while (cw > 1 || ch > 1) {
    const nw = Math.max(1, cw >> 1);
    const nh = Math.max(1, ch >> 1);
    const ncol = new Float32Array(nw * nh * 3);
    const nwt = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let sw = 0;
        const s = [0, 0, 0];
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const sx = Math.min(cw - 1, x * 2 + dx);
            const sy = Math.min(ch - 1, y * 2 + dy);
            const j = sy * cw + sx;
            sw += wt[j];
            for (let c = 0; c < 3; c++) s[c] += col[j * 3 + c];
          }
        }
        const k = y * nw + x;
        nwt[k] = Math.min(1, sw);
        for (let c = 0; c < 3; c++) ncol[k * 3 + c] = sw > 0 ? (s[c] / sw) * nwt[k] : 0;
      }
    }
    cw = nw;
    ch = nh;
    col = ncol;
    wt = nwt;
    levels.push({ w: cw, h: ch, col, wt });
  }
  // Pull: fill from coarse to fine with bilinear upsampling.
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++) {
      for (let x = 0; x < fine.w; x++) {
        const i = y * fine.w + x;
        const a = fine.wt[i];
        if (a >= 1) continue;
        const fx = Math.min(coarse.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const fy = Math.min(coarse.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(coarse.w - 1, x0 + 1);
        const y1 = Math.min(coarse.h - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        for (let c = 0; c < 3; c++) {
          const v00 = coarse.col[(y0 * coarse.w + x0) * 3 + c];
          const v10 = coarse.col[(y0 * coarse.w + x1) * 3 + c];
          const v01 = coarse.col[(y1 * coarse.w + x0) * 3 + c];
          const v11 = coarse.col[(y1 * coarse.w + x1) * 3 + c];
          const up = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
          fine.col[i * 3 + c] = fine.col[i * 3 + c] + (1 - a) * up;
        }
        fine.wt[i] = 1;
      }
    }
  }
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h * 3; i++) out[i] = Math.max(0, Math.min(255, Math.round(levels[0].col[i])));
  return out;
}

// Open Graph card: 1200×630 crop centred on "Zainab & Mohammed" (x≈57%, y≈61%).
{
  const src = path.join(assets, findAsset('07-couple'));
  const full = await sharp(src).resize(W, H).toBuffer();
  const cropW = Math.round(W * 0.9);
  const cropH = Math.round((cropW * 630) / 1200);
  const cx = W * 0.57;
  const cy = H * 0.595;
  const left = Math.max(0, Math.min(W - cropW, Math.round(cx - cropW / 2)));
  const top = Math.max(0, Math.min(H - cropH, Math.round(cy - cropH / 2)));
  await sharp(full)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(1200, 630)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(root, 'public', 'og-image.jpg'));
  console.log('✓ og-image.jpg');
}

// Icons from the SVG monogram.
{
  const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'));
  await sharp(svg, { density: 600 }).resize(180, 180).png().toFile(path.join(root, 'public', 'apple-touch-icon.png'));
  await sharp(svg, { density: 300 }).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon-32.png'));
  console.log('✓ icons');
}

// Music.
{
  const mp3 = files.find((f) => /\.mp3$/i.test(f));
  if (mp3) {
    fs.copyFileSync(path.join(assets, mp3), path.join(outAudio, 'music.mp3'));
    console.log(`✓ src/assets/audio/music.mp3  ←  ${mp3}`);
  } else {
    console.warn('! no .mp3 found in /assets — add assets/music.mp3 and re-run');
  }
}
