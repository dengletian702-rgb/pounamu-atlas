'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

const docs = path.join(__dirname, '..', 'docs');
const routeIds = [...fs.readFileSync(path.join(docs, 'app.js'), 'utf8').matchAll(/\{"id":"([^"]+)"/g)].map(m => m[1]);
const catalog = JSON.parse(fs.readFileSync(path.join(docs, 'data/v4-catalog.json'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(path.join(docs, 'data/sports/index.json'), 'utf8')).cities.map(c => c.id);

function pages() {
  const urls = ['index.html', 'routes.html', 'plan.html', 'prepare.html', 'tracks.html', 'cities.html'];
  for (const id of routeIds) urls.push('route.html?id=' + id);
  for (const id of cities) urls.push('city.html?id=' + id);
  for (const row of catalog.templates || []) urls.push('guide.html?template=' + row.id);
  return urls;
}

const overflowOf = `document.documentElement.scrollWidth - document.documentElement.clientWidth`;

test('start and end marks stay with their own city', { timeout: 180000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    const audit = `(() => {
      const svg = document.querySelector('#p10-pick-map svg');
      if (!svg || svg.getBoundingClientRect().width < 20) return { hidden: true };
      const pointDist = (x, y, r) => Math.hypot(Math.max(r.left - x, x - r.right, 0), Math.max(r.top - y, y - r.bottom, 0));
      const dots = [...svg.querySelectorAll('.p10-pick-mark')].map(c => {
        const r = c.getBoundingClientRect();
        return { id: c.closest('.p10-pick-dot').dataset.p10Pick, x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
      });
      return [...svg.querySelectorAll('.p10-pick-tag')].map(el => {
        const box = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && box.width > 1;
        const px = parseFloat(el.getAttribute('data-px')), py = parseFloat(el.getAttribute('data-py'));
        let own = null, ownD = 1e9;
        svg.querySelectorAll('.p10-pick-mark').forEach(c => {
          const d = Math.hypot((parseFloat(c.getAttribute('cx')) || 0) - px, (parseFloat(c.getAttribute('cy')) || 0) - py);
          if (d < ownD) { ownD = d; own = c; }
        });
        if (!own) return { name: (el.textContent || '').trim(), shown, missing: true };
        const o = own.getBoundingClientRect();
        const ox = (o.left + o.right) / 2, oy = (o.top + o.bottom) / 2;
        const ownPoint = pointDist(ox, oy, box);
        let foreign = 1e9, foreignId = '';
        for (const d of dots) {
          if (Math.hypot(d.x - ox, d.y - oy) <= 6) continue;
          const dist = pointDist(d.x, d.y, box);
          if (dist < foreign) { foreign = dist; foreignId = d.id; }
        }
        return { name: (el.textContent || '').trim(), shown, own: Math.round(ownPoint * 10) / 10, foreign: Math.round(foreign * 10) / 10, foreignId };
      });
    })()`;
    for (const lang of ['zh', 'en']) {
      for (const w of [600, 768, 820, 900, 1000, 1024, 1180, 1280, 1440]) {
        await page.view(w, 900, false);
        await page.go('plan.html?lang=' + lang);
        await page.waitFor('document.querySelector("#p10-next-1")', 20000);
        await page.click('#p10-next-1');
        await page.click('#p10-next-2');
        await page.ev('const d=document.querySelector("#p10-more"); if(d) d.open=true');
        await page.waitFor('document.querySelector(".p10-pick-svg.is-laid")', 20000);
        await page.ev('new Promise(r => setTimeout(r, 250))');
        const tags = await page.ev(audit);
        for (const tag of tags) {
          if (!tag.shown || !(tag.own <= 12) || !(tag.foreign > tag.own)) problems.push(lang + ' ' + w + ' ' + JSON.stringify(tag));
        }
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('planner map switches columns within 300ms without showing unplaced names', { timeout: 60000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.view(900, 900, false);
    await page.go('plan.html?lang=zh');
    await page.waitFor('document.querySelector("#p10-next-1")', 20000);
    await page.click('#p10-next-1');
    await page.click('#p10-next-2');
    await page.ev('const d=document.querySelector("#p10-more"); if(d) d.open=true');
    await page.waitFor('document.querySelector(".p10-pick-svg.is-laid")', 20000);
    await page.ev(`(() => {
      window.__switch = null;
      window.__flash = false;
      window.addEventListener('resize', () => {
        const t0 = performance.now();
        const tick = () => {
          const host = document.querySelector('#p10-pick-map');
          const svg = host && host.querySelector('.p10-pick-svg');
          const wide = matchMedia('(min-width:1001px)').matches;
          const mounted = !!(host && host.closest('.planner-explainer'));
          const laid = !!(svg && svg.classList.contains('is-laid'));
          const visible = svg ? [...svg.querySelectorAll('.p10-pick-label,.p10-pick-tag')].filter(el => {
            const cs = getComputedStyle(el);
            return cs.visibility !== 'hidden' && cs.display !== 'none' && el.getBoundingClientRect().width > 1;
          }).length : 0;
          if (!laid && visible) window.__flash = true;
          if (mounted === wide && laid && visible) window.__switch = performance.now() - t0;
          else if (performance.now() - t0 < 800) requestAnimationFrame(tick);
          else window.__switch = performance.now() - t0;
        };
        requestAnimationFrame(tick);
      });
    })()`);
    await page.view(1100, 900, false);
    const wide = await page.ev('new Promise(r => { const i = setInterval(() => { if (window.__switch != null) { clearInterval(i); r({ ms: window.__switch, flash: window.__flash }); } }, 16); })');
    assert.equal(wide.flash, false, 'unplaced names were visible while widening');
    assert.ok(wide.ms < 300, 'widen took ' + wide.ms + 'ms');
    await page.ev('window.__switch = null; window.__flash = false');
    await page.view(820, 900, false);
    const narrow = await page.ev('new Promise(r => { const i = setInterval(() => { if (window.__switch != null) { clearInterval(i); r({ ms: window.__switch, flash: window.__flash }); } }, 16); })');
    assert.equal(narrow.flash, false, 'unplaced names were visible while narrowing');
    assert.ok(narrow.ms < 300, 'narrow took ' + narrow.ms + 'ms');
  } finally {
    await page.close();
  }
});

test('route pages do not scroll sideways at tablet widths', { timeout: 300000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    for (const lang of ['zh', 'en']) {
      for (const id of routeIds) {
        await page.go('route.html?id=' + id + '&lang=' + lang);
        await page.waitFor('document.querySelector(".journey-facts strong")', 20000);
        for (const w of [768, 820, 834, 1024]) {
          await page.view(w, 900, false);
          await page.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
          const over = await page.ev(overflowOf);
          if (over > 1) problems.push(lang + ' ' + id + ' ' + w + ' +' + over);
        }
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('site pages do not scroll sideways', { timeout: 300000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    const urls = pages().filter(url => !url.startsWith('route.html'));
    for (const lang of ['zh', 'en']) {
      for (const url of urls) {
        const join = url.includes('?') ? '&' : '?';
        await page.go(url + join + 'lang=' + lang);
        await page.waitFor('document.querySelector("main")', 20000);
        for (const w of [390, 820, 834, 1440]) {
          await page.view(w, w === 1440 ? 900 : 844, w < 800);
          await page.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
          const over = await page.ev(overflowOf);
          if (over > 1) problems.push(lang + ' ' + url + ' ' + w + ' +' + over);
        }
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});
