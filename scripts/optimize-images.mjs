// Generates web-ready images from /assets into /public.
//   - 1080×1920 WebP (q≈82) + JPG fallback for every scene
//   - small, pre-blurred + brightened backdrop for the letterbox fill
//   - 1200×630 og-image.jpg from the couple artwork (names centred)
//   - PNG icons from the SVG monogram
//   - copies assets/music.mp3 → public/audio/music.mp3
// Run with: npm run optimize
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const outImg = path.join(root, 'public', 'images');
const outAudio = path.join(root, 'public', 'audio');
fs.mkdirSync(outImg, { recursive: true });
fs.mkdirSync(outAudio, { recursive: true });

const W = 1080;
const H = 1920;

// Match files by their numeric prefix so the descriptive filenames can stay as delivered.
const SCENES = ['01-seal', '02-bow', '03-date', '04-countdown', '05-nikah', '06-dinner', '07-couple'];
const files = fs.readdirSync(assets);
const findAsset = (prefix) => files.find((f) => f.startsWith(prefix.slice(0, 3)) && /\.(png|jpe?g|webp)$/i.test(f));

for (const name of SCENES) {
  const file = findAsset(name);
  if (!file) {
    console.warn(`! missing asset for ${name}`);
    continue;
  }
  const src = path.join(assets, file);
  const base = sharp(src).rotate().resize(W, H, { fit: 'cover', kernel: 'lanczos3' });

  await base.clone().webp({ quality: 82, effort: 5 }).toFile(path.join(outImg, `${name}.webp`));
  await base.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(outImg, `${name}.jpg`));

  // Backdrop: tiny + blurred ≈ a 40px blur at full size, slightly brightened.
  await sharp(src)
    .resize(270, 480, { fit: 'cover' })
    .blur(10)
    .modulate({ brightness: 1.06, saturation: 0.95 })
    .webp({ quality: 70 })
    .toFile(path.join(outImg, `${name}-bg.webp`));

  console.log(`✓ ${name}  ←  ${file}`);
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
    console.log(`✓ audio/music.mp3  ←  ${mp3}`);
  } else {
    console.warn('! no .mp3 found in /assets — add assets/music.mp3 and re-run');
  }
}
