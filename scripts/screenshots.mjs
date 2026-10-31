// QA helper: walks the whole invitation in headless Chromium and saves
// screenshots of every stage. Needs `npm run dev` running. Usage:
//   node scripts/screenshots.mjs <out-dir> 390x844,1440x900
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'screenshots';
const sizes = (process.argv[3] || '390x844').split(',');
const url = process.argv[4] || 'http://localhost:5173/';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900, isMobile: w < 900 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  let n = 0;
  const shot = (name) => page.screenshot({ path: `${out}/${size}-${String(++n).padStart(2, '0')}-${name}.png` });
  const wait = (s) => page.waitForTimeout(s * 1000);

  await page.goto(url);
  await wait(6);
  await shot('seal');
  await page.click('.seal-hit');
  for (const t of [0.5, 0.5, 0.5, 0.6]) { await wait(t); await shot('opening'); }
  await wait(1.0);
  for (const t of [0.7, 0.7, 0.7, 0.8]) { await wait(t); await shot('ribbon'); }
  await wait(1.4);
  await shot('bow-hold');
  for (const t of [0.6, 0.6]) { await wait(t); await shot('untie'); }
  await wait(1.6);
  await shot('date-veiled');
  await page.mouse.click(w / 2, h / 2);
  for (const t of [0.5, 0.5, 0.6, 1.4]) { await wait(t); await shot('date-reveal'); }
  await wait(0.5);
  const H = await page.evaluate(() => innerHeight);
  for (const u of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]) {
    await page.evaluate((y) => window.scrollTo(0, y), u * H);
    await wait(1.6);
    await shot(`scroll-${u}`);
  }
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(size, 'hscroll:', hscroll, 'errors:', errors);
  await ctx.close();
}
await browser.close();
