import { gsap } from 'gsap';

// Scene 4: live countdown to the Nikah, digits rolling as they change.

const UNITS = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
];

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function initCountdown(scene, { target, reduced }) {
  const box = scene.querySelector('.countdown');
  const end = new Date(target).getTime();
  const units = {};

  box.innerHTML = '';
  for (const [key, label] of UNITS) {
    const unit = document.createElement('div');
    unit.className = 'cd-unit';
    unit.innerHTML = `<div class="cd-num" aria-hidden="true"></div><div class="cd-label">${label}</div>`;
    box.appendChild(unit);
    units[key] = { el: unit, num: unit.querySelector('.cd-num'), digits: [] };
  }

  function setDigits(u, text, animate) {
    if (u.digits.length !== text.length) {
      u.num.innerHTML = '';
      u.digits = [...text].map((ch) => {
        const d = document.createElement('span');
        d.className = 'd';
        d.innerHTML = `<b>${ch}</b>`;
        u.num.appendChild(d);
        return { el: d, value: ch };
      });
      return;
    }
    [...text].forEach((ch, i) => {
      const d = u.digits[i];
      if (d.value === ch) return;
      d.value = ch;
      if (!animate) {
        gsap.killTweensOf(d.el.children);
        d.el.innerHTML = `<b>${ch}</b>`;
        return;
      }
      // Finish any roll still in flight, then roll the old digit up and the new one in.
      gsap.killTweensOf(d.el.children);
      while (d.el.children.length > 1) d.el.firstElementChild.remove();
      const cur = d.el.firstElementChild;
      gsap.set(cur, { clearProps: 'all' });
      cur.className = '';
      const next = document.createElement('b');
      next.className = 'next';
      next.textContent = ch;
      d.el.appendChild(next);
      gsap.to(cur, { yPercent: -100, opacity: 0, duration: 0.55, ease: 'power2.inOut', onComplete: () => cur.remove() });
      gsap.fromTo(
        next,
        { yPercent: 100, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power2.inOut', onComplete: () => next.classList.remove('next') }
      );
    });
  }

  let timer = 0;
  let finished = false;
  function render(animate = true) {
    const left = end - Date.now();
    if (left <= 0) {
      if (!finished) {
        finished = true;
        clearInterval(timer);
        box.innerHTML = '<p class="cd-done">Today is the day — Alhamdulillah</p>';
        box.setAttribute('aria-label', 'Today is the day — Alhamdulillah');
      }
      return;
    }
    const p = parts(left);
    for (const [key] of UNITS) {
      setDigits(units[key], String(p[key]).padStart(2, '0'), animate && !reduced && !document.hidden);
    }
    box.setAttribute('aria-label', `${p.days} days, ${p.hours} hours, ${p.minutes} minutes until the Nikah`);
  }

  render(false);
  timer = setInterval(render, 1000);

  return {
    /** Elements to stagger-fade up when the scene enters. */
    get items() {
      return finished ? [box.firstElementChild] : [...box.children];
    },
  };
}
