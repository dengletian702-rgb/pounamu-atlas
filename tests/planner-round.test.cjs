'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = require('../docs/data/v4-catalog.json');
const towns = catalog.places.filter(place => place.type === 'town');
globalThis.P10_CATALOG_TOWNS = towns;
const planner = require('../docs/p10-planner.js');

const linked = ['si-gle', 'si-bhe', 'ni-whk', 'si-crm', 'ni-cor', 'ni-ktt', 'ni-opo', 'ni-whg', 'ni-wmt', 'ni-str', 'ni-wmo', 'ni-mtb'];

test('sports is on and the DOC directory stays off', () => {
  const flags = fs.readFileSync(path.join(root, 'docs/site-flags.js'), 'utf8');
  assert.match(flags, /sports:\s*true/);
  assert.match(flags, /docDirectory:\s*false/);
  for (const file of ['docs/index.html', 'docs/plan.html', 'docs/prepare.html', 'docs/routes.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /site-flags\.js/, file);
  }
});

test('prepare copy names 111, the Mountain Safety Council and NZTA', () => {
  const app = fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8');
  const start = app.indexOf('function renderPrepare()');
  const end = app.indexOf('function render()', start);
  const body = app.slice(start, end);
  assert.match(body, /111/);
  assert.match(body, /Mountain Safety Council/);
  assert.match(body, /NZTA/);
  assert.match(body, /https:\/\/www\.mountainsafety\.org\.nz\//);
  assert.match(body, /https:\/\/www\.journeys\.nzta\.govt\.nz\/highway-conditions/);
  assert.match(body, /rel="noopener"/);
  assert.match(body, /nzta\.govt\.nz\/travelling-on-our-roads/);
});

test('preparation copy links the official driving, ferry and campsite pages', () => {
  const app = fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8');
  const start = app.indexOf('function renderPrepare()');
  const end = app.indexOf('function render()', start);
  const body = app.slice(start, end);
  assert.match(body, /rel="noopener"/);
  assert.match(body, /interislander\.co\.nz\/plan\/dangerous-goods/);
  assert.match(body, /doc\.govt\.nz\/parks-and-recreation\/places-to-stay\/stay-at-a-campsite/);
  assert.match(body, /page-references/);
  assert.match(body, /NZeTA/);
  assert.match(body, /Interislander/);
});

test('the planner accepts 1 day and 30 days and rejects the old outside edges', () => {
  const one = planner.p10Plan({ start: 'queenstown', end: 'queenstown', days: 1, pace: 5, preference: 'easy', car: true, wishes: [] });
  assert.ok(one.days);
  const month = planner.p10Plan({ start: 'christchurch', end: 'queenstown', days: 30, pace: 5, preference: 'easy', car: true, wishes: [] });
  assert.ok(month.days.length >= 1);
  assert.throws(() => planner.p10Plan({ start: 'christchurch', end: 'queenstown', days: 0, pace: 5, preference: 'easy', car: true, wishes: [] }), /invalid_input/);
  assert.throws(() => planner.p10Plan({ start: 'christchurch', end: 'queenstown', days: 31, pace: 5, preference: 'easy', car: true, wishes: [] }), /invalid_input/);
});

test('a preference changes the recommended ranking', () => {
  const base = { start: 'christchurch', end: 'queenstown', days: 9, pace: 5, car: true, wishes: [] };
  const walk = planner.p10Rank({ ...base, preference: 'walk' });
  const easy = planner.p10Rank({ ...base, preference: 'easy' });
  assert.ok(walk.length > 2 && easy.length > 2);
  assert.notEqual(walk[0].id, easy[0].id);
  assert.ok(walk[0].worth !== easy.find(item => item.id === walk[0].id).worth);
});

test('the twelve catalogue towns now sit on the planner network', () => {
  for (const id of linked) {
    const town = towns.find(item => item.place_id === id);
    const base = planner.p10CatalogBase(town);
    assert.ok(base, id);
    const hub = id.startsWith('si-') ? 'queenstown' : 'auckland';
    assert.ok(Number.isFinite(planner.p10Net(true).hours(hub, base)), id + ' via ' + base);
  }
  const plan = planner.p10Plan({ start: 'queenstown', end: 'queenstown', days: 4, pace: 5, preference: 'drive', car: true, wishes: ['si-gle', 'si-crm'] });
  assert.equal(plan.inaccessible.some(wish => wish.id === 'si-gle' || wish.id === 'si-crm'), false);
});

const { openBrowser } = require('./helpers/cdp-browser.cjs');

test('navigation hides sports and the DOC directory, and preparation has no outbound body links', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    for (const lang of ['zh', 'en']) {
      await page.go('index.html?lang=' + lang);
      const nav = await page.ev(`(() => {
        const hrefs = [...document.querySelectorAll('nav a')].map(a => a.getAttribute('href') || '');
        return { hrefs, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
      })()`);
      assert.equal(nav.hrefs.some(href => /tracks\.html/.test(href)), false, lang);
      assert.equal(nav.hrefs.some(href => /cities\.html/.test(href)), true, lang);
      assert.equal(nav.overflow, false, lang);
      await page.go('prepare.html?lang=' + lang);
      await page.waitFor('document.querySelector("#page-references")');
      const prep = await page.ev(`(() => {
        const main = document.querySelector('main');
        const links = [...main.querySelectorAll('a[href]')].map(a => a.href).filter(href => { try { return new URL(href).host !== location.host; } catch { return false; } });
        const refs = document.querySelector('#page-references');
        return {
          links: links.filter(href => !/nzta\\.govt\\.nz|interislander\\.co\\.nz|doc\\.govt\\.nz|metservice\\.com|intercity\\.co\\.nz|bluebridge\\.co\\.nz|fullers\\.co\\.nz|immigration\\.govt\\.nz|mountainsafety\\.org\\.nz|stats\\.govt\\.nz/.test(href)),
          refs: Boolean(refs),
          text: main.innerText,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      })()`);
      assert.deepEqual(prep.links, []);
      assert.equal(prep.refs, true);
      assert.match(prep.text, lang === 'zh' ? /参考来源/ : /References/);
      assert.match(prep.text, /NZeTA|电子旅行/);
      assert.match(prep.text, /111/);
      assert.match(prep.text, /Mountain Safety Council/);
      assert.match(prep.text, /NZTA/);
      assert.match(prep.text, lang === 'zh' ? /mountainsafety\.org\.nz/ : /mountainsafety\.org\.nz/);
      assert.equal(prep.overflow, false);
    }
    await page.go('cities.html?lang=zh');
    const cities = await page.ev(`document.querySelector('main').innerText`);
    assert.match(cities, /网球场|Tennis/);
    assert.doesNotMatch(cities, /本栏目更新中/);
    for (const [file, gone] of [['tracks.html', /全量目录|Every DOC walk|待核实/]]) {
      await page.go(file + '?lang=zh');
      const hidden = await page.ev(`(() => {
        const main = document.querySelector('main');
        const intro = document.querySelector('main .page-intro:not(.pounamu-paused)');
        return {
          text: main.innerText,
          introHidden: !intro || intro.hidden || intro.textContent.trim() === '',
          flags: /site-flags/.test(main.innerText),
          doc: !!main.querySelector('a[href*="doc.govt.nz"]'),
          cities: !!main.querySelector('a[href*="guide.html"]')
        };
      })()`);
      assert.equal(hidden.introHidden, true, file);
      assert.equal(hidden.flags, false, file);
      assert.match(hidden.text, /本栏目更新中/);
      assert.equal(hidden.doc, true, file);
      assert.equal(hidden.cities, true, file);
      assert.doesNotMatch(hidden.text, gone);
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

test('the hidden-section notice opens the place picker, not the editor', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.go('tracks.html?lang=en');
    await page.waitFor('document.querySelector(".pounamu-paused a[href*=\\"guide.html\\"]")');
    const notice = await page.ev(`(() => {
      const a = document.querySelector('.pounamu-paused a[href*="guide.html"]');
      const cs = getComputedStyle(a);
      return { href: a.getAttribute('href'), text: a.textContent, underline: cs.textDecorationLine, color: cs.color };
    })()`);
    assert.match(notice.href, /view=pick/);
    assert.match(notice.text, /Plan a trip and pick places/);
    assert.equal(notice.underline, 'underline');
    await page.ev(`localStorage.setItem('pounamu-v4-draft', JSON.stringify({days:[{uid:'kept',placeId:'',label_en:'Kept',label_zh:'保留'}],view:'edit',edited:true,chosen:[],requestedDays:7}))`);
    await page.go(notice.href);
    await page.waitFor('document.querySelector("#v4-app.v4-show-pick")', 15000);
    const view = await page.ev(`document.querySelector('[data-view="pick"]').getAttribute('aria-pressed')`);
    assert.equal(view, 'true');
    await page.go('destination.html?id=si-zqn&lang=zh');
    await page.waitFor('document.querySelector("#sports")');
    await page.waitFor('document.querySelector("#sports-venues article, #sports-venues .v4-note")', 8000);
    const town = await page.ev('document.querySelector("#sports").innerText');
    assert.match(town, /OpenStreetMap|网球|高尔夫|Tennis|Golf/);
    assert.doesNotMatch(town, /运动场地已暂时收起|site-flags/);
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

test('changing the start or end city updates which area button is pressed', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.go('plan.html?lang=en');
    await page.waitFor('document.querySelector("[data-p10-area=south]")');
    await page.ev(`(() => { const set = (id, value) => { const el = document.querySelector(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }; set('#p10-start', 'auckland'); set('#p10-end', 'wellington'); })()`);
    const north = await page.ev(`document.querySelector('[data-p10-area="north"]').getAttribute('aria-pressed')`);
    const south = await page.ev(`document.querySelector('[data-p10-area="south"]').getAttribute('aria-pressed')`);
    assert.equal(north, 'true');
    assert.equal(south, 'false');
    await page.ev(`(() => { const el = document.querySelector('#p10-end'); el.value = 'christchurch'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const none = await page.ev(`[...document.querySelectorAll('[data-p10-area]')].every(b => b.getAttribute('aria-pressed') === 'false')`);
    assert.equal(none, true);
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});
