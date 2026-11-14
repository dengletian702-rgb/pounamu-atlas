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
        const midX = (box.left + box.right) / 2, midY = (box.top + box.bottom) / 2;
        const centerOwn = Math.hypot(midX - ox, midY - oy);
        let foreign = 1e9, foreignId = '', centerForeign = 1e9, centerId = '';
        for (const d of dots) {
          if (Math.hypot(d.x - ox, d.y - oy) <= 6) continue;
          const dist = pointDist(d.x, d.y, box);
          if (dist < foreign) { foreign = dist; foreignId = d.id; }
          const cd = Math.hypot(d.x - midX, d.y - midY);
          if (cd < centerForeign) { centerForeign = cd; centerId = d.id; }
        }
        return { name: (el.textContent || '').trim(), shown, own: Math.round(ownPoint * 10) / 10, foreign: Math.round(foreign * 10) / 10, foreignId, centerOwn: Math.round(centerOwn * 10) / 10, centerForeign: Math.round(centerForeign * 10) / 10, centerId };
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
          if (!tag.shown || !(tag.own <= 12) || !(tag.foreign > tag.own) || !(tag.centerForeign > tag.centerOwn)) problems.push(lang + ' ' + w + ' ' + JSON.stringify(tag));
        }
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('planner map switches columns within 300ms without overlapping names', { timeout: 180000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    const arm = `(() => {
      window.__switch = null;
      window.__bad = [];
      window.addEventListener('resize', () => {
        if (window.__switchArmed) return;
        window.__switchArmed = true;
        const t0 = performance.now();
        const tick = () => {
          const host = document.querySelector('#p10-pick-map');
          const svg = host && host.querySelector('.p10-pick-svg');
          const wide = matchMedia('(min-width:1001px)').matches;
          const mounted = !!(host && host.closest('.planner-explainer'));
          const laid = !!(svg && svg.classList.contains('is-laid'));
          const texts = svg ? [...svg.querySelectorAll('.p10-pick-label,.p10-pick-tag')].filter(el => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 1 && r.height > 1;
          }) : [];
          let hits = 0;
          for (let i = 0; i < texts.length; i++) {
            const a = texts[i].getBoundingClientRect();
            for (let j = i + 1; j < texts.length; j++) {
              const b = texts[j].getBoundingClientRect();
              if (a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5) hits++;
            }
          }
          if (hits) window.__bad.push(Math.round(performance.now() - t0));
          const at = svg ? parseFloat(svg.dataset.p10LaidAt || '0') : 0;
          if (mounted === wide && laid && texts.length && at >= t0) {
            window.__switch = { ms: at - t0, hits: window.__bad.slice() };
            return;
          }
          if (performance.now() - t0 < 800) requestAnimationFrame(tick);
          else window.__switch = { ms: performance.now() - t0, hits: window.__bad.slice(), late: true };
        };
        requestAnimationFrame(tick);
      });
    })()`;
    const idle = `new Promise(resolve => {
      const hits = [];
      let obs = null;
      try {
        obs = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) hits.push(Math.round(entry.duration));
        });
        obs.observe({ type: 'longtask', buffered: false });
      } catch (err) {
        resolve({ unsupported: String(err) });
        return;
      }
      setTimeout(() => { obs.disconnect(); resolve(hits); }, 5000);
    })`;
    for (const lang of ['zh', 'en']) {
      await page.view(900, 900, false);
      await page.go('plan.html?lang=' + lang);
      await page.waitFor('document.querySelector("#p10-next-1")', 20000);
      await page.click('#p10-next-1');
      await page.click('#p10-next-2');
      await page.ev('const d=document.querySelector("#p10-more"); if(d) d.open=true');
      await page.waitFor('document.querySelector(".p10-pick-svg.is-laid")', 20000);
      await page.ev('new Promise(r => setTimeout(r, 400))');
      await page.ev(arm);
      const pairs = [[900, 1100], [1100, 900], [990, 1010], [1010, 990], [1440, 820], [820, 1440]];
      for (const [from, to] of pairs) {
        await page.view(from, 900, false);
        await page.ev('new Promise(r => setTimeout(r, 350))');
        await page.waitFor('document.querySelector(".p10-pick-svg.is-laid")', 20000);
        await page.ev('window.__switchArmed = false; window.__switch = null; window.__bad = []');
        await page.view(to, 900, false);
        const result = await page.ev('new Promise(r => { const i = setInterval(() => { if (window.__switch) { clearInterval(i); r(window.__switch); } }, 16); })');
        if (result.hits.length || !(result.ms < 300)) problems.push(lang + ' ' + from + '->' + to + ' ' + JSON.stringify(result));
      }
      for (const w of [390, 900, 1440]) {
        await page.view(w, 900, w < 800);
        await page.waitFor('document.querySelector(".p10-pick-svg")', 20000);
        await page.ev('new Promise(r => (window.requestIdleCallback || (fn => setTimeout(fn, 1)))(() => r(), { timeout: 1500 }))');
        const tasks = await page.ev(idle);
        if (!Array.isArray(tasks)) problems.push(lang + ' idle ' + w + ' ' + JSON.stringify(tasks));
        else if (tasks.length) problems.push(lang + ' idle ' + w + ' longtask ' + JSON.stringify(tasks));
      }
    }
    assert.deepEqual(problems, []);
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

test('home way titles do not break a word between 751 and 1010', { timeout: 60000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.view(900, 900, false);
    await page.go('index.html?lang=en');
    await page.waitFor('document.querySelector("#homeWays h3")');
    const problems = [];
    const audit = `(() => {
      const broken = [];
      const root = document.querySelector('#homeWays');
      for (const el of root.querySelectorAll('h3, p')) {
        const chars = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const n = walk.currentNode;
          for (let i = 0; i < n.textContent.length; i++) {
            const range = document.createRange();
            range.setStart(n, i);
            range.setEnd(n, i + 1);
            const rect = range.getClientRects()[0];
            chars.push({ ch: n.textContent[i], top: rect ? rect.top : 0 });
          }
        }
        let word = '', tops = [];
        const flush = () => {
          if (word && new Set(tops.map(t => Math.round(t))).size > 1) broken.push(word);
          word = '';
          tops = [];
        };
        for (const item of chars) {
          if (item.ch.trim() === '') flush();
          else { word += item.ch; tops.push(item.top); }
        }
        flush();
      }
      return { broken, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`;
    for (let w = 751; w <= 1010; w += 20) {
      await page.view(w, 900, false);
      await page.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const result = await page.ev(audit);
      if (result.broken.length || result.over > 1) problems.push(w + ' ' + JSON.stringify(result));
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('narrow schematic 4 stays with its stop and D8 is attributable', { timeout: 90000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    const audit = `(() => {
      const svg = document.querySelector('#v4-map svg.v4-schematic');
      const el = [...svg.querySelectorAll('.v4-map-num')].find(t => (t.textContent || '').trim() === '4');
      const pd = (x, y, r) => Math.hypot(Math.max(r.left - x, x - r.right, 0), Math.max(r.top - y, y - r.bottom, 0));
      const gap = (a, b) => Math.hypot(Math.max(b.left - a.right, a.left - b.right, 0), Math.max(b.top - a.bottom, a.top - b.bottom, 0));
      const box = el.getBoundingClientRect();
      const own = el.parentNode.querySelector('circle').getBoundingClientRect();
      const ox = (own.left + own.right) / 2, oy = (own.top + own.bottom) / 2;
      let foreign = 1e9;
      svg.querySelectorAll('circle').forEach(c => {
        const r = c.getBoundingClientRect();
        const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
        if (Math.hypot(x - ox, y - oy) <= 2) return;
        foreign = Math.min(foreign, pd(x, y, box));
      });
      const ownGap = gap(box, own);
      const leader = [...svg.querySelectorAll('.v4-map-leader')].some(line => {
        const ctm = line.getScreenCTM();
        if (!ctm) return false;
        const pt = (x, y) => { const p = new DOMPoint(+x, +y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
        const a = pt(line.getAttribute('x1'), line.getAttribute('y1'));
        const b = pt(line.getAttribute('x2'), line.getAttribute('y2'));
        const rad = Math.min(own.width, own.height) / 2;
        const nearDot = Math.hypot(a.x - ox, a.y - oy) <= rad + 3 || Math.hypot(b.x - ox, b.y - oy) <= rad + 3;
        const nearText = pd(a.x, a.y, box) <= 3 || pd(b.x, b.y, box) <= 3;
        return nearDot && nearText;
      });
      return { ownGap, foreign, leader };
    })()`;
    for (const lang of ['zh', 'en']) {
      for (const w of [320, 360, 375]) {
        await page.view(w, 800, true);
        await page.go('guide.html?template=SI-09B&view=map&lang=' + lang);
        await page.waitFor('document.querySelector("#v4-map .v4-map-num")', 20000);
        await page.ev('document.querySelector("#v4-map").scrollIntoView()');
        await page.ev('new Promise(r => setTimeout(r, 500))');
        const four = await page.ev(audit);
        const owned = four.foreign > four.ownGap + 0.4;
        if (four.ownGap > 14 && !four.leader) problems.push(lang + ' ' + w + ' detached ' + JSON.stringify(four));
        if (!owned && !four.leader) problems.push(lang + ' ' + w + ' nearer other ' + JSON.stringify(four));
        if (lang === 'zh' && w === 320 && !(four.foreign >= 6)) problems.push('zh 320 clearance ' + JSON.stringify(four));
      }
    }
    assert.deepEqual(problems, []);
    await page.view(320, 800, true);
    await page.go('guide.html?template=SI-09B&lang=zh');
    await page.waitFor('document.querySelector("#gcoast .gday-num")', 20000);
    await page.ev('document.querySelector("#gcoast").scrollIntoView({block:"center"})');
    await page.ev('new Promise(r => setTimeout(r, 500))');
    const day = await page.ev(`(() => {
      const el = [...document.querySelectorAll('#gcoast .gday-num')].find(t => (t.textContent || '').includes('D8'));
      const pd = (x, y, r) => Math.hypot(Math.max(r.left - x, x - r.right, 0), Math.max(r.top - y, y - r.bottom, 0));
      const box = el.getBoundingClientRect();
      const ownC = el.parentNode.querySelector('circle').getBoundingClientRect();
      const ox = (ownC.left + ownC.right) / 2, oy = (ownC.top + ownC.bottom) / 2;
      const svg = el.ownerSVGElement;
      let foreign = 1e9;
      svg.querySelectorAll('circle').forEach(c => {
        if (!(c.parentNode && c.parentNode.querySelector('text'))) return;
        const r = c.getBoundingClientRect();
        const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
        if (Math.hypot(x - ox, y - oy) <= 2) return;
        foreign = Math.min(foreign, pd(x, y, box));
      });
      const leaders = [...svg.querySelectorAll('.gday-leader')].some(line => {
        const ctm = line.getScreenCTM();
        if (!ctm) return false;
        const pt = (x, y) => { const p = new DOMPoint(+x, +y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
        const a = pt(line.getAttribute('x1'), line.getAttribute('y1'));
        const b = pt(line.getAttribute('x2'), line.getAttribute('y2'));
        return Math.hypot(a.x - ox, a.y - oy) <= 8 && pd(b.x, b.y, box) <= 4;
      });
      return { own: pd(ox, oy, box), foreign, leaders };
    })()`);
    assert.ok(day.foreign > day.own + 0.4 || day.leaders, 'D8 ownership ' + JSON.stringify(day));
  } finally {
    await page.close();
  }
});

test('deselecting a town removes its name from the planner map', { timeout: 60000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.view(1100, 900, false);
    await page.go('plan.html?lang=zh');
    await page.waitFor('document.querySelector("#p10-next-1")', 20000);
    await page.click('#p10-next-1');
    await page.click('#p10-next-2');
    await page.ev('const d=document.querySelector("#p10-more"); if(d) d.open=true');
    await page.waitFor('document.querySelector("#p10-wishes input[name=p10-wish]")', 20000);
    const id = await page.ev(`(() => {
      const box = [...document.querySelectorAll('#p10-wishes input[name=p10-wish]')].find(input => {
        const label = document.querySelector('[data-p10-pick-label="' + CSS.escape(input.value) + '"]');
        return label && label.classList.contains('is-town');
      });
      return box ? box.value : '';
    })()`);
    assert.ok(id, 'no town checkbox');
    await page.ev(`document.querySelector('#p10-wishes input[value="${id}"]').click()`);
    await page.ev('new Promise(r => setTimeout(r, 300))');
    const on = await page.ev(`(() => {
      const label = document.querySelector('[data-p10-pick-label="${id}"]');
      const cs = getComputedStyle(label);
      const r = label.getBoundingClientRect();
      const chip = document.querySelector('[data-p10-unselect="${id}"]');
      return { shown: cs.display !== 'none' && r.width > 1, chip: !!chip, checked: document.querySelector('#p10-wishes input[value="${id}"]').checked };
    })()`);
    assert.equal(on.checked, true);
    assert.equal(on.chip, true);
    assert.equal(on.shown, true, 'selected town name is not on the map');
    await page.ev(`document.querySelector('[data-p10-unselect="${id}"]').click()`);
    await page.ev('new Promise(r => setTimeout(r, 300))');
    const off = await page.ev(`(() => {
      const label = document.querySelector('[data-p10-pick-label="${id}"]');
      const cs = getComputedStyle(label);
      const r = label.getBoundingClientRect();
      return { shown: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1, chip: !!document.querySelector('[data-p10-unselect="${id}"]'), checked: document.querySelector('#p10-wishes input[value="${id}"]').checked };
    })()`);
    assert.equal(off.checked, false);
    assert.equal(off.chip, false);
    assert.equal(off.shown, false, 'deselected town name stayed on the map ' + JSON.stringify(off));
  } finally {
    await page.close();
  }
});
