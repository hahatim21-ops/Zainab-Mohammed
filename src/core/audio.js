// Background music. Routed through Web Audio so the 0 → 0.6 fade also works
// on iOS (where HTMLMediaElement.volume is read-only).

export class Music {
  constructor(src, volume = 0.6) {
    this.src = src;
    this.volume = volume;
    this.el = new Audio();
    this.el.loop = true;
    this.el.preload = 'auto';
    this.el.setAttribute('playsinline', '');
    this.available = false;
    this.started = false;
    this.muted = false;
    this.resumeOnShow = false;
    this.listeners = new Set();

    document.addEventListener('visibilitychange', () => {
      if (!this.started || this.muted) return;
      if (document.hidden) {
        this.resumeOnShow = !this.el.paused;
        this.el.pause();
      } else if (this.resumeOnShow) {
        this.ctx?.resume();
        this.el.play().catch(() => {});
      }
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
  }
  emit() {
    this.listeners.forEach((fn) => fn(this));
  }

  /** Download the track fully (so it is ready on tap). Resolves either way. */
  async preload(onProgress = () => {}) {
    try {
      const res = await fetch(this.src);
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !/audio|octet-stream/.test(type)) throw new Error('no audio');
      const total = Number(res.headers.get('content-length')) || 0;
      let blob;
      if (res.body && total) {
        const reader = res.body.getReader();
        const chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          got += value.length;
          onProgress(got / total);
        }
        blob = new Blob(chunks, { type: type || 'audio/mpeg' });
      } else {
        blob = await res.blob();
      }
      this.el.src = URL.createObjectURL(blob);
      this.available = true;
    } catch {
      this.available = false;
    }
    onProgress(1);
    return this.available;
  }

  /** Must be called synchronously inside a user gesture (the seal tap). */
  start() {
    if (!this.available || this.started) return;
    this.started = true;
    try {
      // Let Web Audio play even with the iPhone silent switch on (Safari 16.4+).
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0;
        this.ctx.createMediaElementSource(this.el).connect(this.gain).connect(this.ctx.destination);
        this.ctx.resume();
      } catch {
        this.ctx = null;
      }
    }
    this.el.volume = this.ctx ? 1 : 0;
    const p = this.el.play();
    if (p) p.catch(() => {});
    this.fadeTo(this.volume, 3);
    this.emit();
  }

  fadeTo(v, seconds) {
    if (this.ctx && this.gain) {
      const t = this.ctx.currentTime;
      const g = this.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(v, t + seconds);
      return;
    }
    // Fallback: step the element volume (no-op on iOS, which is fine).
    const from = this.el.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      this.el.volume = from + (v - from) * k;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  toggle() {
    if (!this.started) return;
    this.muted = !this.muted;
    if (this.muted) {
      this.fadeTo(0, 0.35);
      clearTimeout(this.pauseTimer);
      this.pauseTimer = setTimeout(() => this.muted && this.el.pause(), 400);
    } else {
      clearTimeout(this.pauseTimer);
      this.ctx?.resume();
      this.el.play().catch(() => {});
      this.fadeTo(this.volume, 0.8);
    }
    this.emit();
  }

  get playing() {
    return this.started && !this.muted;
  }
}
