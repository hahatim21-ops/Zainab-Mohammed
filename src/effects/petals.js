// Ambient falling petals on a single canvas. Sprites are pre-rendered once,
// so each frame is just a handful of drawImage calls.

const rand = (a, b) => a + Math.random() * (b - a);

function makeSprite(size, tint) {
  const c = document.createElement('canvas');
  const s = Math.ceil(size);
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  g.translate(s / 2, s / 2);
  // Petal: rounded teardrop with a soft notch at the tip.
  const w = s * 0.32;
  const h = s * 0.46;
  g.beginPath();
  g.moveTo(0, h);
  g.bezierCurveTo(w * 1.5, h * 0.4, w * 1.1, -h * 0.85, w * 0.15, -h);
  g.quadraticCurveTo(0, -h * 0.86, -w * 0.15, -h);
  g.bezierCurveTo(-w * 1.1, -h * 0.85, -w * 1.5, h * 0.4, 0, h);
  g.closePath();
  const grad = g.createLinearGradient(0, -h, 0, h);
  grad.addColorStop(0, tint[0]);
  grad.addColorStop(0.6, tint[1]);
  grad.addColorStop(1, tint[2]);
  g.fillStyle = grad;
  g.shadowColor = 'rgba(123, 91, 59, 0.18)';
  g.shadowBlur = s * 0.06;
  g.shadowOffsetY = s * 0.03;
  g.fill();
  // Midrib
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(201, 169, 110, 0.22)';
  g.lineWidth = Math.max(1, s * 0.012);
  g.beginPath();
  g.moveTo(0, h * 0.85);
  g.quadraticCurveTo(w * 0.15, 0, 0, -h * 0.7);
  g.stroke();
  return c;
}

const TINTS = [
  ['#fffaf0', '#f6ecda', '#e9d9b8'],
  ['#fffdf7', '#f8f1e4', '#efe3cc'],
  ['#fbf3e6', '#f1e2c8', '#e2cda5'],
];

export class Petals {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = reduced;
    this.items = [];
    this.target = 0;
    this.running = false;
    this.last = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.sprites = TINTS.map((t) => makeSprite(64 * this.dpr, t));
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.wanted) this.start();
    });
    this.resize();
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.unit = Math.min(this.w, (this.h * 9) / 16);
  }

  spawn(initial) {
    const size = rand(0.045, 0.085) * this.unit + 10;
    return {
      x: rand(-0.05, 1.05) * this.w,
      y: initial ? rand(-0.1, 1) * this.h : rand(-0.25, -0.05) * this.h,
      size,
      vy: rand(16, 34) * (size / 30),
      vx: rand(-6, 10),
      sway: rand(10, 28),
      swayF: rand(0.25, 0.6),
      phase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.6, 0.6),
      flip: rand(0.4, 1.1),
      alpha: rand(0.65, 0.95),
      sprite: this.sprites[(Math.random() * this.sprites.length) | 0],
      t: 0,
    };
  }

  /** Smoothly change how many petals drift (12–20 on mobile is the sweet spot). */
  setCount(n) {
    if (this.reduced) return;
    const desktop = window.innerWidth >= 900;
    this.target = desktop ? Math.round(n * 1.25) : n;
    while (this.items.length < this.target && this.items.length < n / 2) this.items.push(this.spawn(true));
  }

  start() {
    if (this.reduced) return;
    this.wanted = true;
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  pause() {
    this.running = false;
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.items.length < this.target && Math.random() < dt * 2.5) this.items.push(this.spawn(false));

    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.t += dt;
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(p.t * p.swayF * Math.PI * 2 + p.phase) * p.sway) * dt;
      p.rot += p.vr * dt;
      if (p.y > this.h + p.size) {
        if (this.items.length > this.target) {
          this.items.splice(i, 1);
          continue;
        }
        Object.assign(p, this.spawn(false));
      }
      const sx = Math.cos(p.t * p.flip + p.phase);
      ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
      ctx.rotate(p.rot);
      ctx.scale(0.35 + 0.65 * Math.abs(sx), 1);
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(this.frame);
  }
}
