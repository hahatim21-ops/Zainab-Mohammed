import { gsap } from 'gsap';

// Scene 0: ivory screen, gold "Z & M" drawn in, thin progress line.
// Waits for every scene image, the background blur fills, fonts and music.

const waitImg = (img) =>
  img.complete && img.naturalWidth
    ? img.decode?.().catch(() => {}) ?? Promise.resolve()
    : new Promise((res) => {
        img.addEventListener('load', () => (img.decode?.().catch(() => {}) ?? Promise.resolve()).then(res), { once: true });
        img.addEventListener('error', res, { once: true });
      });

const loadUrl = (url) =>
  new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = res;
    i.src = url;
  });

export async function runLoader({ music, reduced, quick }) {
  const loader = document.getElementById('loader');
  const bar = loader.querySelector('.loader-line span');

  const imgs = [...document.querySelectorAll('.plate img')];
  imgs.forEach((img) => (img.loading = 'eager'));
  const bgs = [...document.querySelectorAll('.scene-bg')]
    .map((el) => el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1])
    .filter(Boolean);

  let done = 0;
  let audioP = 0;
  const total = imgs.length + bgs.length + 1;
  const update = () => {
    const p = Math.min(1, (done + audioP) / (total + 1));
    bar.style.transform = `scaleX(${p})`;
  };
  const tick = (p) => p.then(() => {
    done++;
    update();
  });

  const minTime = new Promise((r) => setTimeout(r, quick || reduced ? 500 : 2600));
  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
  const audio = music.preload((p) => {
    audioP = p;
    update();
  });

  await Promise.all([
    ...imgs.map((i) => tick(waitImg(i))),
    ...bgs.map((u) => tick(loadUrl(u))),
    tick(fonts),
    audio,
    minTime,
  ]);

  bar.style.transform = 'scaleX(1)';
  await gsap.to(loader, { opacity: 0, duration: reduced ? 0.4 : 1.1, ease: 'power2.inOut', delay: 0.25 });
  loader.remove();
}
