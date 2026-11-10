// Narrow-screen audit: horizontal overflow, clipped text, elements sticking out of the viewport.
// Usage: node scripts/check-mobile.mjs [baseUrl]   (preview server must be running)
import {launch} from './lib/chrome.mjs';
const base = process.argv[2] || 'http://127.0.0.1:4873/';
const PAGES = ['index.html?lang=zh', 'index.html?lang=en', 'routes.html?lang=zh', 'routes.html?lang=en', 'route.html?id=roys-peak&lang=zh', 'route.html?id=roys-peak&lang=en', 'route.html?id=whanganui-journey&lang=zh', 'route.html?id=kepler-track&lang=zh', 'tracks.html?lang=zh', 'tracks.html?lang=en', 'cities.html?lang=zh', 'city.html?id=auckland&lang=zh', 'city.html?id=auckland&lang=en', 'plan.html?lang=zh', 'plan.html?lang=en', 'prepare.html?lang=zh'];
const AUDIT = `(() => { const vw = document.documentElement.clientWidth, out = [];
  const pageOverflow = document.documentElement.scrollWidth - vw;
  for (const el of document.querySelectorAll('a,button,span,p,h1,h2,h3,li,dd,dt,label,strong,em,abbr,td,th')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const text = (el.innerText || '').trim().slice(0, 24); if (!text) continue;
    let clippedBy = null;                                  // an ancestor that hides overflow and cuts this element
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(ps.overflowX)) { const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) { clippedBy = p.className || p.tagName; } break; } }
    const selfCut = /(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
    if (r.right > vw + 1 || r.left < -1 || clippedBy || selfCut) out.push((el.className || el.tagName) + ' «' + text + '»' + (clippedBy ? ' cut by ' + clippedBy : selfCut ? ' cuts its own text' : ' outside viewport'));
  }
  return JSON.stringify({pageOverflow, issues: [...new Set(out)].slice(0, 8)}); })()`;
const b = await launch(); let bad = 0;
await b.open(base + 'index.html', 390, 844, 600); await b.evaluate(`localStorage.setItem('nz-slowly-motion','off')`);
for (const width of [360, 375, 390]) for (const path of PAGES) {
  await b.open(base + path, width, 800, 1800);
  const res = JSON.parse(await b.evaluate(AUDIT));
  if (res.pageOverflow > 0 || res.issues.length) { bad++; console.log(width, path, JSON.stringify(res)); }
}
console.log(bad ? `${bad} page/width combinations with problems` : 'No overflow or clipped text at 360, 375 and 390.');
b.close(); process.exitCode = bad ? 1 : 0;
