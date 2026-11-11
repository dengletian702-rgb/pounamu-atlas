'use strict';
// A small headless-Chrome driver over the DevTools protocol, with no dependencies (Node 22+ has WebSocket built in).
// It serves docs/ on a free local port and finds Chrome at CHROME_PATH, /usr/bin/google-chrome or the macOS app,
// so the page tests run both on the Linux test machine and on a Mac. Returns null when no Chrome is installed.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];

function chromePath() {
  if (typeof WebSocket !== 'function') return null;
  return CANDIDATES.find(p => p && fs.existsSync(p)) || null;
}

function serveDocs() {
  const site = path.resolve(__dirname, '../../docs');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(site, rel));
    if (file !== site && !file.startsWith(site + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server)); });
}

async function openBrowser() {
  const exe = chromePath();
  if (!exe) return null;
  const server = await serveDocs();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pounamu-cdp-'));
  const chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch { /* not ready */ }
  }
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not ready */ }
    if (!target) await sleep(100);
  }
  if (!target) { chrome.kill(); server.close(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
    const p = msg.params || {};
    if (msg.method === 'Runtime.exceptionThrown') errors.push('exception ' + String((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text).split('\n')[0]);
    else if (msg.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push('console.error ' + p.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise(resolve => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw new Error('page error: ' + ((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text));
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  const page = {
    base, errors, ev,
    async view(width, height, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); },
    async go(rel) {
      errors.length = 0;
      await send('Page.navigate', { url: base + rel });
      await page.waitFor('document.readyState === "complete"');
      await sleep(300);
    },
    async waitFor(expr, timeout = 8000) {
      const until = Date.now() + timeout;
      while (Date.now() < until) {
        try { if (await ev(`Boolean(${expr})`)) return true; } catch { /* page still loading */ }
        await sleep(100);
      }
      throw new Error('timed out waiting for ' + expr);
    },
    async click(selector) {
      const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return 'missing';e.scrollIntoView({block:'center'});e.click();return 'ok'})()`);
      if (r !== 'ok') throw new Error('no element ' + selector);
      await sleep(150);
    },
    async close() {
      try { ws.close(); } catch { /* closed */ }
      chrome.kill();
      await new Promise(resolve => server.close(resolve));
      await sleep(200);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* left for the OS to clear */ }
    }
  };
  await page.view(1280, 900);
  return page;
}

module.exports = { openBrowser, chromePath };
