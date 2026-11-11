'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('../docs/data/v4-catalog.json');
const towns = catalog.places.filter(place => place.type === 'town');
// The eight towns added in v4 (Mount Maunganui is now part of Tauranga, ticket C). Ticket D gave them road segments.
const eight = ['ni-tga', 'ni-wka', 'ni-tol', 'ni-pip', 'ni-fld', 'ni-mst', 'si-alx', 'si-cly'];
// Catalogue towns that still have no road segment of their own.
const offNetwork = ['ni-whk', 'ni-mtb', 'ni-str'];
globalThis.P10_CATALOG_TOWNS = towns;
const planner = require('../docs/p10-planner.js');

test('the v4 towns are on the road network and other catalogue towns still stay in a plan without a drive time', () => {
  const net = planner.p10Net(true);
  for (const id of eight) {
    const base = planner.p10CatalogBase(towns.find(t => t.place_id === id));
    assert.ok(base, id + ' has a road node');
    assert.ok(Number.isFinite(net.hours(id.startsWith('si-') ? 'queenstown' : 'auckland', base)), id + ' is reachable');
  }
  const north = eight.filter(id => id.startsWith('ni-'));
  const plan = planner.p10Plan({ start: 'auckland', end: 'wellington', days: 14, pace: 5, preference: 'drive', car: true, wishes: north });
  for (const id of north) assert.equal(plan.inaccessible.some(w => w.id === id), false, id);
  const before = net.hours('auckland', 'wellington');
  const separate = planner.p10Plan({ start: 'auckland', end: 'wellington', days: 7, pace: 5, preference: 'drive', car: true, wishes: ['auckland', ...offNetwork] });
  assert.equal(planner.p10Net(true).hours('auckland', 'wellington'), before);
  assert.ok(separate.order.some(wish => wish.id === 'auckland'));
  for (const id of offNetwork) {
    assert.ok(separate.input.wishes.includes(id));
    assert.ok(separate.inaccessible.some(wish => wish.id === id), id);
    assert.equal(planner.p10Net(true).hours('auckland', id), Infinity);
  }
});

const { openBrowser } = require('./helpers/cdp-browser.cjs');

test('every catalog town is a checkbox on plan.html and the new towns stay on the sketch', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.go('plan.html?lang=zh');
    await page.ev('localStorage.clear()');
    await page.go('plan.html?lang=zh');
    await page.waitFor('document.querySelector(\'#p10-wishes input[value="ni-tga"]\')');
    const regionIds = await page.ev(`[...document.querySelectorAll('#p10-region [data-p10-region]')].map(n => n.getAttribute('data-p10-region')).filter(id => id && id !== 'all')`);
    assert.ok(regionIds.length >= catalog.regions.length);
    for (const regionId of regionIds) {
      await page.click(`#p10-region [data-p10-region="${regionId}"]`);
      const values = await page.ev(`[...document.querySelectorAll('#p10-wishes input[name="p10-wish"]')].map(n => n.value)`);
      // a town that is the same place as a sight (Paihia for the Bay of Islands) is listed once, as the sight (PR #5)
      const expected = towns.filter(town => town.region_id === regionId && !planner.p10TownIsSight(town)).map(town => town.place_id);
      assert.ok(values.length > 0, regionId);
      for (const placeId of expected) assert.ok(values.includes(placeId), regionId + ' ' + placeId);
      if (regionId === 'bay-of-plenty') assert.ok(values.includes('ni-tga') && !values.includes('ni-mau'));
    }
    await page.click('#p10-region [data-p10-region="all"]');
    // a North Island trip long enough for the six North Island towns (ticket D gave them road segments)
    const north = eight.filter(id => id.startsWith('ni-'));
    await page.ev(`(() => { const f = (s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; f('#p10-start', 'auckland'); f('#p10-end', 'wellington'); f('#days', '14'); })()`);
    for (const id of north) await page.click(`#p10-wishes input[name="p10-wish"][value="${id}"]`);
    await page.click('#plannerForm button[type=submit]');
    await page.waitFor('document.querySelector(\'#planResult .plan-day\')');
    const resultText = await page.ev('document.querySelector("#planResult").innerText');
    for (const id of north) {
      const town = towns.find(item => item.place_id === id);
      assert.ok(resultText.includes(town.name_zh), town.name_zh);
      assert.equal(await page.ev(`document.querySelector('#p10-wishes input[name="p10-wish"][value="${id}"]').checked`), true);
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});
