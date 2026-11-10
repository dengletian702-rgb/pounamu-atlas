// Delivery screenshots at 1440 and 390 px wide, full page down to the footer (v3.1 C13: no 7000 px cap).
// Needs the preview server: node scripts/serve.mjs
// Usage: node scripts/screenshots.mjs [outDir=screenshots/v3.1] [baseUrl]   -> <outDir>/<name>-<width>.png
import {launch} from './lib/chrome.mjs';
import {mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, process.argv[2] || 'screenshots/v3.1');
const base = process.argv[3] || 'http://127.0.0.1:4873/';
// The planner page is shot with a sample plan (Christchurch → Queenstown, 11 days) so the legs, NZTA labels and tip
// sources are visible.
const PLAN = `(async()=>{const f=document.querySelector('#plannerForm');if(!f)return;f.querySelector('#days').value='11';
  [...f.querySelectorAll('[name=p10-wish]')].forEach(c=>c.checked=['tekapo','aoraki','milford','dunedin'].includes(c.value));
  f.querySelector('button[type=submit]').click();await new Promise(r=>setTimeout(r,1500));})()`;
const PAGES = [
  ['home', 'index.html?lang=zh'], ['home-en', 'index.html?lang=en'],
  ['routes', 'routes.html?lang=zh'],
  ['route-roys-peak', 'route.html?id=roys-peak&lang=zh'], ['route-roys-peak-en', 'route.html?id=roys-peak&lang=en'],
  ['route-whanganui-journey', 'route.html?id=whanganui-journey&lang=zh'], ['route-whanganui-journey-en', 'route.html?id=whanganui-journey&lang=en'],
  ['doc-tracks', 'tracks.html?lang=zh'],
  ['city-auckland-sports', 'city.html?id=auckland&lang=zh'],
  ['planner', 'plan.html?lang=zh', PLAN], ['planner-en', 'plan.html?lang=en', PLAN],
];
await mkdir(out, {recursive: true});
const b = await launch();
await b.open(base + 'index.html', 1440, 900, 800);
await b.evaluate(`localStorage.setItem('nz-slowly-motion','off');localStorage.removeItem('p10-road-plan')`);   // still frames
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;   // e.g. ONLY=planner to retake some pages
for (const [name, path, prep] of PAGES.filter(p => !only || only.test(p[0]))) for (const width of [1440, 390]) {
  await b.open(base + path, width, width === 390 ? 844 : 900, 2600);
  if (prep) await b.evaluate(prep);
  // load every lazy image: switch to eager and scroll through the page once, then back to the top
  await b.evaluate(`(async()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);await new Promise(r=>setTimeout(r,900));})()`);
  const size = await b.shot(join(out, `${name}-${width}.png`));
  const check = JSON.parse(await b.evaluate(`JSON.stringify({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,footer:(()=>{const f=document.querySelector('.footer,footer');if(!f)return 'none';const r=f.getBoundingClientRect();return Math.round(r.bottom+scrollY)})()})`));
  console.log(`${name}-${width}.png`, `${size.w}x${size.h}`, `footer ends at ${check.footer}`, check.overflow ? `HORIZONTAL OVERFLOW ${check.overflow}px` : 'no overflow');
}
console.log('page errors:', b.errors.filter(e => !/workers\.dev/.test(e)));
b.close();
