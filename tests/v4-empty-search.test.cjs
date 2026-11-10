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

test('the South Island 7–10 day button clears the query and lists only those templates', async (t) => {
  const chromium = loadChromium();
  if (!chromium || !fs.existsSync('/usr/bin/google-chrome')) {
    t.skip('browser driver is not available in this environment');
    return;
  }
  const server = await startDocsServer();
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const base = 'http://127.0.0.1:' + server.address().port;
    await page.goto(base + '/index.html?lang=zh', { waitUntil: 'networkidle' });
    await page.fill('#v4-q', 'zzqx不存在的词');
    await page.click('#v4-search-form button[type=submit]');
    await page.waitForSelector('[data-v4-south]');
    const suggestions = await page.locator('#v4-results [data-template]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-template')));
    assert.ok(suggestions.length > 0);
    assert.equal(suggestions.some(id => String(id).startsWith('NI')), false);
    await page.locator('[data-v4-south]').click();
    await page.waitForFunction(() => !new URL(location.href).searchParams.get('q'));
    const params = new URL(page.url()).searchParams;
    assert.equal(params.get('q'), null);
    assert.equal(params.get('island'), 'south');
    assert.equal(params.get('days'), '7-10');
    const ids = await page.locator('#v4-results [data-template]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-template')));
    assert.deepEqual(ids, ['SI-09B', 'SI-09A', 'SI-07A', 'SI-07B']);
    await page.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
