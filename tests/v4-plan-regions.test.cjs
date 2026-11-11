'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const catalog = require('../docs/data/v4-catalog.json');
const towns = catalog.places.filter(place => place.type === 'town');
const eight = ['ni-mau', 'ni-wka', 'ni-tol', 'ni-pip', 'ni-fld', 'ni-mst', 'si-alx', 'si-cly'];
globalThis.P10_CATALOG_TOWNS = towns;
const planner = require('../docs/p10-planner.js');

test('catalog towns stay in a generated plan without a new drive time', () => {
  const before = planner.p10Net(true).hours('auckland', 'wellington');
  const plan = planner.p10Plan({
    start: 'auckland', end: 'wellington', days: 7, pace: 5, preference: 'drive', car: true,
    wishes: ['auckland', ...eight, 'ni-tga']
  });
  assert.equal(planner.p10Net(true).hours('auckland', 'wellington'), before);
  assert.ok(plan.order.some(wish => wish.id === 'auckland'));
  for (const id of [...eight, 'ni-tga']) {
    assert.ok(plan.input.wishes.includes(id));
    assert.ok(plan.inaccessible.some(wish => wish.id === id));
    assert.equal(planner.p10Net(true).hours('auckland', id), Infinity);
  }
  const separate = planner.p10Plan({
    start: 'auckland', end: 'wellington', days: 7, pace: 5, preference: 'drive', car: true,
    wishes: ['ni-tga', 'ni-mau']
  });
  assert.deepEqual(separate.inaccessible.map(wish => wish.id).sort(), ['ni-mau', 'ni-tga']);
  assert.notEqual(separate.inaccessible[0].base, separate.inaccessible[1].base);
});

function loadChromium() {
  for (const id of ['playwright-core', '/tmp/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch { /* try the next location */ }
  }
  return null;
}

function startDocsServer() {
  const site = path.resolve(__dirname, '../docs');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(site, rel));
    if (file !== site && !file.startsWith(site + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('every catalog town is a checkbox on plan.html and the new towns stay on the sketch', async (t) => {
  const chromium = loadChromium();
  if (!chromium || !fs.existsSync('/usr/bin/google-chrome')) {
    t.skip('browser driver is not available in this environment');
    return;
  }
  const server = await startDocsServer();
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.clear());
    const base = 'http://127.0.0.1:' + server.address().port;
    await page.goto(base + '/plan.html?lang=zh', { waitUntil: 'networkidle' });
    await page.waitForSelector('#p10-wishes input[value="ni-mau"]');
    const regionIds = await page.locator('#p10-region [data-p10-region]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-p10-region')).filter(id => id && id !== 'all'));
    assert.ok(regionIds.length >= catalog.regions.length);
    for (const regionId of regionIds) {
      await page.locator(`#p10-region [data-p10-region="${regionId}"]`).click();
      const values = await page.locator('#p10-wishes input[name="p10-wish"]').evaluateAll(nodes => nodes.map(node => node.value));
      const expected = towns.filter(town => town.region_id === regionId).map(town => town.place_id);
      assert.ok(expected.length > 0, regionId);
      for (const placeId of expected) assert.ok(values.includes(placeId), regionId + ' ' + placeId);
      if (regionId === 'bay-of-plenty') assert.ok(values.includes('ni-tga') && values.includes('ni-mau'));
    }
    await page.locator('#p10-region [data-p10-region="all"]').click();
    for (const id of eight) await page.locator(`#p10-wishes input[name="p10-wish"][value="${id}"]`).check();
    await page.locator('#plannerForm button[type=submit]').click();
    await page.waitForSelector('#planResult [data-p10-stop="ni-mau"]');
    const resultText = await page.locator('#planResult').innerText();
    const stops = await page.locator('#planResult [data-p10-stop]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-p10-stop')));
    for (const id of eight) {
      const town = towns.find(item => item.place_id === id);
      assert.ok(resultText.includes(town.name_zh), town.name_zh);
      assert.ok(stops.includes(id), id);
      assert.equal(await page.locator(`#p10-wishes input[name="p10-wish"][value="${id}"]`).isChecked(), true);
    }
    await page.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
