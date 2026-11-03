// The opening: the real coastline is traced by hand, the name is written in, and the drawing then settles into the
// hero map's place. About three seconds, once per browser session; any click or key skips it; reduced motion skips it.
// Without script the overlay fades out on its own (CSS), so the page is never blocked.
import { NORTH, SOUTH, STEWART } from '../data/coast.js';
import { project, W, H } from './map.js';

const intro = document.getElementById('intro');
const seen = () => { try { return sessionStorage.getItem('mfn.intro') === '1'; } catch { return false; } };
const remember = () => { try { sessionStorage.setItem('mfn.intro', '1'); } catch { /* ignore */ } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function playIntro({ lang, target }) {
  if (!intro) return Promise.resolve();
  if (seen() || document.documentElement.dataset.motion === 'off') { intro.remove(); return Promise.resolve(); }
  remember();
  intro.style.animation = 'none'; // script is running: it, not the CSS fallback, decides when to leave
  document.documentElement.classList.add('intro-on');

  const svg = intro.querySelector('.intro-map');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const NS = 'http://www.w3.org/2000/svg';
  const paths = [SOUTH, NORTH, STEWART].map((ring, i) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${ring.map((q) => project(q).map((v) => v.toFixed(1)).join(',')).join('L')}Z`);
    p.setAttribute('class', 'intro-coast');
    p.style.setProperty('--i', i);
    svg.appendChild(p);
    return p;
  });
  for (const p of paths) {
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = String(len);
  }
  const main = intro.querySelector('.iw-main'), sub = intro.querySelector('.iw-sub');
  main.textContent = lang === 'zh' ? '绿石之地' : 'Pounamu Atlas';
  sub.textContent = lang === 'zh' ? 'Pounamu Atlas · 新西兰手绘地图' : '绿石之地 · New Zealand, drawn by hand';
  main.classList.toggle('display', lang === 'zh');
  // The brush face is local and small; give it a moment so the name is written in it, not swapped mid-stroke.
  const font = lang === 'zh' && document.fonts ? Promise.race([document.fonts.load('1em "Pounamu Display"', '绿石之地'), wait(700)]) : Promise.resolve();

  let skip;
  const skipped = new Promise((r) => { skip = r; });
  const onSkip = () => skip();
  addEventListener('keydown', onSkip, { once: true });
  intro.addEventListener('pointerdown', onSkip, { once: true });

  const run = (async () => {
    await wait(60);
    requestAnimationFrame(() => intro.classList.add('tracing'));
    await wait(1200);
    await font;
    intro.classList.add('writing');
    await wait(1500);
  })();

  return Promise.race([run, skipped]).then(async () => {
    removeEventListener('keydown', onSkip);
    // Hand the drawing over to the hero map: move it onto the spot the hero's coastline is drawn in.
    const from = svg.getBoundingClientRect(), to = target?.getBoundingClientRect();
    if (to && to.width && to.bottom > 0 && to.top < innerHeight) {
      const box = (r) => { const k = Math.min(r.width / W, r.height / H); return { x: r.left + (r.width - W * k) / 2, y: r.top + (r.height - H * k) / 2, k }; };
      const a = box(from), b = box(to);
      svg.style.transformOrigin = '0 0';
      svg.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${b.k / a.k})`;
    }
    intro.classList.add('leaving');
    document.documentElement.classList.remove('intro-on');
    await wait(900);
    intro.remove();
  });
}
