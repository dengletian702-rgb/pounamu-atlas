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

test('sports and the DOC directory are switched off in the site flag', () => {
  const flags = fs.readFileSync(path.join(root, 'docs/site-flags.js'), 'utf8');
  assert.match(flags, /sports:\s*false/);
  assert.match(flags, /docDirectory:\s*false/);
  for (const file of ['docs/index.html', 'docs/plan.html', 'docs/prepare.html', 'docs/routes.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /site-flags\.js/, file);
  }
});

test('preparation copy has no outbound anchors in the renderer', () => {
  const app = fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8');
  const start = app.indexOf('function renderPrepare()');
  const end = app.indexOf('function render()', start);
  const body = app.slice(start, end);
  assert.equal(body.includes('target="_blank"'), false);
  assert.equal(body.includes('href="http'), false);
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
      assert.equal(nav.hrefs.some(href => /cities\.html|city\.html|tracks\.html/.test(href)), false, lang);
      assert.equal(nav.overflow, false, lang);
      await page.go('prepare.html?lang=' + lang);
      await page.waitFor('document.querySelector("#page-references")');
      const prep = await page.ev(`(() => {
        const main = document.querySelector('main');
        const links = [...main.querySelectorAll('a[href]')].map(a => a.href).filter(href => { try { return new URL(href).host !== location.host; } catch { return false; } });
        const refs = document.querySelector('#page-references');
        return {
          links,
          refs: Boolean(refs),
          text: main.innerText,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      })()`);
      assert.deepEqual(prep.links, []);
      assert.equal(prep.refs, true);
      assert.match(prep.text, lang === 'zh' ? /参考来源/ : /References/);
      assert.match(prep.text, /NZeTA|电子旅行/);
      assert.equal(prep.overflow, false);
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});
