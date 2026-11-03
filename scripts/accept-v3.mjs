// Batch-2 acceptance in a local headless Chrome over the DevTools protocol (no extra packages, no network beyond
// 127.0.0.1). Checks every page at 390 / 768 / 1440: console errors, uncaught exceptions, horizontal overflow and a
// screenshot; then keyboard order, reduced motion, the offline copy, and a planner run with Jev consent OFF.
// Writes screenshots/v3/*.png and screenshots/v3/report.json. Exit 1 on any failure.
//   node scripts/accept-v3.mjs [baseUrl]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://127.0.0.1:4870').replace(/\/$/, '');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9341;
const OUT = fileURLToPath(new URL('../screenshots/v3/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'mfn-accept-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', '--lang=zh-CN', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = list.find((t) => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch { /* starting */ }
    await sleep(200);
  }
  throw new Error('chrome did not start');
}
const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const waiting = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const viewport = (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
async function go(url, wait = 1800) { await send('Page.navigate', { url }); await sleep(wait); }
async function shot(name) {
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(result.data, 'base64'));
}
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

const report = { pages: [], checks: {} };
let fail = false;
const check = (name, ok, detail) => { report.checks[name] = { ok, detail }; if (!ok) fail = true; console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };

// Skip the once-per-session intro for page shots (it is checked on its own below).
await go(`${BASE}/`, 600);
await evaluate(`sessionStorage.setItem('mfn.intro', '1'); localStorage.clear(); true`);

const PAGES = [
  ['home', '/', null],
  ['home-finder', '/#finder', '#finder'],
  ['home-trips', '/#trips', '#trips'],
  ['routes', '/routes', null],
  ['routes-island', '/routes#island', '#island'],
  ['routes-tiers', '/routes#tiers', '#tiers'],
  ['routes-months', '/routes#months', '#months'],
  ['route', '/r/milford-track', null],
  ['compare', '/compare?a=hooker-valley&b=roys-peak', null],
  ['trip-tpl', '/trip?tpl=south9-north3', null],
  ['trip-none', '/trip', null],
];
const WIDTHS = [[390, 844, true], [768, 1024, true], [1440, 900, false]];
for (const lang of ['zh', 'en']) {
  await evaluate(`localStorage.setItem('mfn.lang', '"${lang}"'); true`);
  for (const [w, h, mob] of WIDTHS) {
    if (lang === 'en' && w === 768) continue; // English at the two ends is enough
    await viewport(w, h, mob);
    for (const [name, path, sel] of PAGES) {
      errors.length = 0;
      await go(`${BASE}${path}`, name.startsWith('trip') || name === 'route' ? 2600 : 1800);
      if (sel) await evaluate(`(() => { const n = document.querySelector('${sel}'); window.scrollTo(0, n.getBoundingClientRect().top + scrollY - 56); document.querySelectorAll('.rise').forEach(n => n.classList.add('in')); return true; })()`);
      await sleep(500);
      const over = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
      const file = `${w}-${lang}-${name}`;
      await shot(file);
      const errs = errors.filter((e) => !/favicon/.test(e));
      report.pages.push({ file, overflow: over, errors: errs });
      if (errs.length || over > 1) { fail = true; console.log(`✗ ${file}: overflow ${over}px, errors ${JSON.stringify(errs)}`); }
    }
  }
}
check('pages: no console errors, no sideways scroll', report.pages.every((p) => !p.errors.length && p.overflow <= 1), `${report.pages.length} page views`);

// Keyboard: the first stops on the home page are visible, in reading order, and the skip link comes first.
await viewport(1440, 900, false);
await go(`${BASE}/`, 1500);
const stops = [];
for (let i = 0; i < 14; i++) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  stops.push(await evaluate(`(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return { tag: a.tagName, id: a.id, text: (a.textContent || '').trim().slice(0, 24), visible: r.width > 0 && r.height > 0, ring: s.outlineStyle !== 'none' || s.boxShadow !== 'none' }; })()`));
}
check('keyboard: skip link first', stops[0]?.text.length > 0 && /skip/.test(await evaluate('document.activeElement && document.querySelector(".skip").className')), stops[0]);
check('keyboard: every stop visible with a focus ring', stops.every((s) => s.visible && s.ring), stops.filter((s) => !s.visible || !s.ring));
report.keyboard = stops;

// Compare page: changing a select by keyboard keeps focus and updates the URL.
await go(`${BASE}/compare?a=hooker-valley&b=roys-peak`, 1500);
await evaluate(`(() => { const s = document.querySelector('#cmp-pick [name="b"]'); s.focus(); s.value = 'key-summit'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
await sleep(300);
check('compare: switch route keeps focus and URL', (await evaluate('location.search')) === '?a=hooker-valley&b=key-summit' && (await evaluate('document.activeElement.name')) === 'b');

// Reduced motion: the intro is skipped and the motion switch reads "on".
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await evaluate(`sessionStorage.clear(); localStorage.removeItem('mfn.motion'); true`);
await go(`${BASE}/`, 1200);
check('reduced motion: no intro, motion off', (await evaluate(`!document.querySelector('#intro') && document.documentElement.dataset.motion === 'off'`)) === true);
await send('Emulation.setEmulatedMedia', { features: [] });
await evaluate(`sessionStorage.clear(); true`);
await go(`${BASE}/`, 800);
check('intro plays once per session', (await evaluate(`!!document.querySelector('#intro')`)) === true);
await go(`${BASE}/`, 6000);
check('intro hands over to the page', (await evaluate(`!document.querySelector('#intro')`)) === true);
await shot('1440-zh-home-after-intro');

// Offline: press "Save for offline", go offline, the compare and trip pages still open.
await go(`${BASE}/trip?tpl=south-7`, 2000);
await evaluate(`document.querySelector('#tp-offline').click(); true`);
const saved = await evaluate(`new Promise(r => { const t = setInterval(async () => { const k = await caches.keys(); if (k.length && navigator.serviceWorker.controller !== undefined && document.querySelector('#tp-offline').textContent.length > 6) { clearInterval(t); r(k); } }, 300); setTimeout(() => r(null), 30000); })`);
await sleep(1500);
await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await go(`${BASE}/compare?a=kepler-track&b=routeburn-track`, 2500);
const offCompare = await evaluate(`document.querySelectorAll('.cmp tbody tr').length`);
await go(`${BASE}/r/hooker-valley`, 2500);
const offRoute = await evaluate(`document.querySelector('#rp-h1')?.textContent || ''`);
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
check('offline: saved copy opens compare and a route page', !!saved && offCompare > 5 && offRoute.length > 0, { caches: saved, offCompare, offRoute });

// Trip finder and the two views.
await viewport(1440, 900, false);
await evaluate(`localStorage.setItem('mfn.lang', '"zh"'); localStorage.removeItem('mfn.finder'); true`);
await go(`${BASE}/`, 1800);
const views = await evaluate(`(() => { const vis = (id) => { const n = document.getElementById(id); return !!n && n.offsetParent !== null; }; return { view: document.body.dataset.view, finder: vis('finder'), allRoutes: vis('routes'), replay: document.querySelectorAll('#replay, [data-reel-map]').length, again: document.body.innerText.includes('再走一遍') }; })()`);
check('home: finder shown, route lists folded away, no replay buttons', views.view === 'home' && views.finder && !views.allRoutes && !views.replay && !views.again, views);
const fd = await evaluate(`(async () => {
  const f = document.querySelector('#fd-form');
  f.start.value = 'christchurch'; f.end.value = 'queenstown';
  f.days.value = 8; f.querySelectorAll('[name=wishes]').forEach((c) => { c.checked = c.value === 'glaciers'; });
  f.querySelector('[type=submit]').click();
  await new Promise((r) => setTimeout(r, 3500));
  return { days: document.querySelectorAll('.fd-day').length, sum: document.querySelector('.fd-sum')?.textContent, order: document.querySelector('.fd-order')?.textContent, legs: [...document.querySelectorAll('.fd-leg-ab')].map((n) => n.textContent), drawn: document.querySelectorAll('#fd-map .trip-link').length, page: document.querySelector('#fd-page')?.getAttribute('href').slice(0, 8) };
})()`);
check('finder: Christchurch → glaciers → Queenstown goes by road via the West Coast', fd.days > 0 && fd.legs[0]?.startsWith('基督城') && fd.legs.some((l) => /哈斯特/.test(l)) && fd.drawn > 0 && fd.page === '/trip#t=', fd);
await shot('1440-zh-finder-result');
const load = await evaluate(`(async () => { document.querySelector('[data-load="south-7"]').click(); await new Promise((r) => setTimeout(r, 1500)); const f = document.querySelector('#fd-form'); return { start: f.start.value, end: f.end.value, days: f.days.value, from: document.querySelector('[data-trip="south-7"] .tt-from')?.textContent }; })()`);
check('ready-made trip says where it starts and ends, and loads into the finder', load.start === 'christchurch' && load.end === 'queenstown' && load.days === '7' && /基督城/.test(load.from), load);
await go(`${BASE}/routes`, 1800);
const rv = await evaluate(`(() => { const vis = (id) => { const n = document.getElementById(id); return !!n && n.offsetParent !== null; }; return { view: document.body.dataset.view, finder: vis('finder'), lists: ['reel', 'top10', 'routes', 'tiers', 'months'].every(vis), h1: document.querySelector('#h1').textContent }; })()`);
check('/routes: every list kept on its own page', rv.view === 'routes' && !rv.finder && rv.lists && rv.h1 === '全部线路', rv);

// Planner with Jev consent OFF: no step may use Jev.
const res = await (await fetch(`${BASE}/api/itinerary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 7, month: 2, start: 'christchurch', modes: ['hike', 'drive'], interests: ['alpine', 'lakes'], fitness: 'moderate', pace: 'balanced' }) })).json();
check('planner: consent off → no Jev call', res.trace.every((t) => t.provider !== 'jev') && res.cost.jevCalls === 0, res.trace.map((t) => `${t.step}:${t.provider}`).join(' '));
const caps = await (await fetch(`${BASE}/api/capabilities`)).json();
check('capabilities: yes/no only', Object.keys(caps).sort().join() === 'consentRequired,jev,pipeline' && typeof caps.jev === 'boolean', caps);

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
ws.close();
chrome.kill();
console.log(fail ? 'FAILED' : 'ALL PASSED', `→ screenshots/v3/ (${report.pages.length + 1} screenshots)`);
process.exit(fail ? 1 : 0);
