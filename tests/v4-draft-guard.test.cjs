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

test('an edited trip survives refresh, appends a place, and confirms a template change', async (t) => {
  const chromium = loadChromium();
  if (!chromium || !fs.existsSync('/usr/bin/google-chrome')) {
    t.skip('browser driver is not available in this environment');
    return;
  }
  const server = await startDocsServer();
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const lang of ['zh', 'en']) {
      for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 844 } });
        const page = await context.newPage();
        const base = `http://127.0.0.1:${port}`;
        await page.goto(`${base}/guide.html?template=SI-09B&lang=${lang}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('article.v4-day h3');
        assert.equal(new URL(page.url()).searchParams.get('template'), null);
        const placeOf = text => text.split('·').slice(1).join('·').trim();
        const first = placeOf(await page.locator('article.v4-day h3').nth(0).innerText());
        const second = placeOf(await page.locator('article.v4-day h3').nth(1).innerText());
        await page.locator('[data-up="1"]').click();
        await page.waitForFunction(text => {
          const heading = document.querySelector('article.v4-day h3');
          return heading && heading.textContent.includes(text);
        }, second);
        await page.reload({ waitUntil: 'networkidle' });
        const kept = placeOf(await page.locator('article.v4-day h3').nth(0).innerText());
        assert.equal(kept, second);
        assert.notEqual(kept, first);
        const daysBefore = await page.locator('article.v4-day').count();
        assert.ok(daysBefore >= 9);
        await page.goto(`${base}/destination.html?id=si-zqn&lang=${lang}`, { waitUntil: 'networkidle' });
        await page.getByRole('link', { name: lang === 'zh' ? '加入行程' : 'Add to itinerary' }).click();
        await page.waitForSelector('article.v4-day');
        assert.ok(await page.locator('article.v4-day').count() >= 9);
        const trip = await page.locator('#v4-app').innerText();
        assert.match(trip, /皇后镇|Queenstown/);
        assert.match(await page.locator('#v4-toast').innerText(), lang === 'zh' ? /已经在行程里/ : /already in the itinerary/i);
        await page.goto(`${base}/guide.html?template=SI-07A&lang=${lang}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-keep]');
        await page.locator('[data-keep]').click();
        assert.match(await page.locator('#v4-app h1').innerText(), lang === 'zh' ? /9 天/ : /9-day/);
        assert.equal(placeOf(await page.locator('article.v4-day h3').nth(0).innerText()), second);
        await page.goto(`${base}/guide.html?template=SI-07A&lang=${lang}`, { waitUntil: 'networkidle' });
        await page.locator('[data-do-replace]').click();
        await page.waitForSelector('#v4-toast [data-v4-undo]');
        assert.match(await page.locator('#v4-app h1').innerText(), lang === 'zh' ? /7 天/ : /7-day/);
        await page.locator('#v4-toast [data-v4-undo]').click();
        assert.match(await page.locator('#v4-app h1').innerText(), lang === 'zh' ? /9 天/ : /9-day/);
        assert.equal(placeOf(await page.locator('article.v4-day h3').nth(0).innerText()), second);
        if (width === 1280) {
          const place = page.locator('#v4-map g[data-place]').first();
          const id = await place.getAttribute('data-place');
          await place.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(value => document.activeElement && document.activeElement.getAttribute('data-place') === value, id);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
