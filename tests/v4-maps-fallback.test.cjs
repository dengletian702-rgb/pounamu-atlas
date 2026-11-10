'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

function loadChromium() {
  for (const id of ['playwright-core', '/tmp/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch { /* try the next location */ }
  }
  return null;
}

test('an invalid map key falls back to the schematic', async (t) => {
  const chromium = loadChromium();
  if (!chromium || !fs.existsSync('/usr/bin/google-chrome')) {
    t.skip('browser driver is not available in this environment');
    return;
  }
  const cfg = path.join(__dirname, '../docs/local-config.js');
  const fake = 'not-a-real-maps-key-' + Date.now();
  fs.writeFileSync(cfg, 'window.POUNAMU_GOOGLE_MAPS_KEY = ' + JSON.stringify(fake) + ';\n');
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    async function open(setup) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await setup(page);
      await page.goto('http://127.0.0.1:4873/guide.html?view=pick&blank=1&lang=zh', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.v4-schematic');
      const kind = await page.locator('#v4-map').getAttribute('data-map-kind');
      await page.close();
      return { errors, kind };
    }
    const blocked = await open(async page => {
      await page.addInitScript(value => { window.POUNAMU_GOOGLE_MAPS_KEY = value; }, fake);
      await page.route('**://maps.googleapis.com/**', route => route.abort());
    });
    assert.equal(blocked.kind, 'svg');
    assert.equal(blocked.errors.length, 0);
    const auth = await open(async page => {
      await page.addInitScript(value => { window.POUNAMU_GOOGLE_MAPS_KEY = value; }, fake);
      await page.route('**://maps.googleapis.com/**', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'window.gm_authFailure && window.gm_authFailure(); window.google={maps:{Map:function(){}}};',
      }));
    });
    assert.equal(auth.kind, 'svg');
    assert.equal(auth.errors.length, 0);
  } finally {
    await browser.close();
    fs.rmSync(cfg, { force: true });
  }
});
