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
  // Opening, bow forming, bow opening by itself
  for (let i = 0; i < 16; i++) { await wait(0.5); await shot(`intro-${(i + 1) * 0.5}s`); }
  await wait(1);
  await shot('names');
  // Scroll the continuous page; tap the date when it is on screen
  const H = await page.evaluate(() => innerHeight);
  const dateTop = await page.evaluate(() => document.querySelector('#s-date').offsetTop);
  await page.evaluate((y) => window.scrollTo(0, y), dateTop);
  await wait(1.6);
  await shot('date-veiled');
  await page.mouse.click(w / 2, h / 2);
  await wait(2.2);
  await shot('date-revealed');
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = dateTop + H * 0.5, i = 0; y <= total + H * 0.5; y += H * 0.5, i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.min(y, total));
    await wait(1.2);
    await shot(`scroll-${String(i).padStart(2, '0')}`);
  }
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(size, 'hscroll:', hscroll, 'errors:', errors);
  await ctx.close();
}
await browser.close();
