'use strict';
// Ticket fix/ten-guest-v1: one test (or more) for each of items A–H. Page tests use tests/helpers/cdp-browser.cjs
// and are skipped only when no Chrome is installed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(place => place.type === 'town');
const planner = require('../docs/p10-planner.js');

async function withPage(t, fn) {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try { await fn(page); } finally { await page.close(); }
}
const freshPlanner = async (page, lang) => {
  await page.go('plan.html?lang=' + lang);
  await page.ev('localStorage.clear()');
  await page.go('plan.html?lang=' + lang);
  await page.waitFor('document.querySelector(\'#p10-region [data-p10-region="christchurch-canterbury"]\')');
};
const tickBox = (page, id) => page.click(`#p10-wishes input[name="p10-wish"][value="${id}"]`);
const tapDot = (page, id) => page.ev(`(()=>{const d=document.querySelector('#p10-pick-map [data-p10-pick="${id}"]');if(!d)return false;d.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`);

// A (P0-01): a place ticked under one region filter stays ticked after another filter click.
for (const lang of ['zh', 'en']) {
  test(`A: ticking places across two region filters keeps both (${lang})`, async t => withPage(t, async page => {
    await freshPlanner(page, lang);
    await page.click('#p10-island [data-p10-island="south"]');
    await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
    await tickBox(page, 'tekapo');
    await page.click('#p10-region [data-p10-region="queenstown"]');
    await tickBox(page, 'queenstown');
    const label = await page.ev('document.querySelector("#p10-selected .p10-selected-label").textContent');
    assert.match(label, lang === 'zh' ? /已选 2 处/ : /Selected \(2\)/);
    await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
    assert.equal(await page.ev('document.querySelector(\'#p10-wishes input[value="tekapo"]\').checked'), true);
    assert.equal(await page.ev('document.querySelector("#p10-island-label").textContent.trim()'), lang === 'zh' ? '这次去哪一座岛？' : 'Which island this time?');
    assert.deepEqual(page.errors, []);
  }));
}
test('A: on a phone, tapping map dots picks places after a region filter', async t => withPage(t, async page => {
  await page.view(390, 844, true);
  await freshPlanner(page, 'zh');
  await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
  assert.equal(await tapDot(page, 'tekapo'), true);
  // the map shows the filtered region only, so Queenstown's dot appears after its own region button
  await page.click('#p10-region [data-p10-region="queenstown"]');
  assert.equal(await tapDot(page, 'queenstown'), true);
  assert.match(await page.ev('document.querySelector("#p10-selected").textContent'), /已选 2 处/);
}));

// B (P1-01): the routes atlas opens without errors; routes with no sketch are drawn from DOC lines or listed.
for (const [lang, width] of [['zh', 1280], ['en', 390], ['zh', 390], ['en', 1280]]) {
  test(`B: the routes atlas opens with no console errors (${lang}, ${width})`, async t => withPage(t, async page => {
    await page.view(width, 900, width < 768);
    await page.go('routes.html?lang=' + lang);
    await page.click('#atlasToggle');
    await page.waitFor('document.querySelector("#routeAtlas svg")');
    assert.deepEqual(page.errors, []);
    const text = await page.ev('document.querySelector("#routeAtlas").innerText');
    assert.match(text, lang === 'zh' ? /条线路暂无地图数据/ : /routes? (has|have) no map data yet/);
    assert.ok(await page.ev('document.documentElement.scrollWidth <= innerWidth + 1'));
  }));
}

// C: Mount Maunganui is merged into Tauranga; the old id resolves everywhere.
test('C: ni-mau has no row of its own and resolves to ni-tga in the planner', () => {
  assert.equal(catalog.places.some(p => p.place_id === 'ni-mau'), false);
  assert.equal(catalog.aliases['ni-mau'], 'ni-tga');
  const tga = catalog.places.find(p => p.place_id === 'ni-tga');
  assert.match(tga.name_en, /Mount Maunganui/);
  assert.match(tga.name_zh, /芒格努伊山/);
  assert.equal(planner.p10AliasId('ni-mau'), 'ni-tga');
  const plan = planner.p10Plan({ start: 'auckland', end: 'wellington', days: 7, pace: 5, preference: 'drive', car: true, wishes: ['ni-mau', 'ni-tga'] });
  assert.deepEqual(plan.input.wishes, ['ni-tga']);
});
test('C: destination.html?id=ni-mau shows Tauranga and rewrites the address; one dot only', async t => withPage(t, async page => {
  await page.go('destination.html?id=ni-mau&lang=zh');
  await page.waitFor('document.querySelector("#v4-destination h1")');
  assert.match(await page.ev('document.querySelector("#v4-destination h1").textContent'), /陶朗加/);
  assert.match(await page.ev('location.search'), /id=ni-tga/);
  await page.go('plan.html?lang=zh&from=auckland&to=wellington&days=7&w=ni-mau');
  await page.waitFor('document.querySelector("#p10-pick-map [data-p10-pick]")');
  assert.equal(await page.ev('document.querySelectorAll(\'#p10-pick-map [data-p10-pick="ni-mau"]\').length'), 0);
  assert.equal(await page.ev('document.querySelectorAll(\'#p10-pick-map [data-p10-pick="ni-tga"]\').length'), 1);
  assert.equal(await page.ev('document.querySelector(\'#p10-wishes input[value="ni-tga"]\') ? document.querySelector(\'#p10-wishes input[value="ni-tga"]\').checked : "absent"'), true);
}));
