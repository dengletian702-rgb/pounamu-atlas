// Minimal headless-Chrome driver over the DevTools protocol (no packages). Used for screenshots and page checks.
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function launch(port = 9347) {
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pa-shots-'))}`, '--hide-scrollbars', '--no-first-run', '--lang=zh-CN', 'about:blank'], {stdio: 'ignore'});
  let url;
  for (let i = 0; i < 60 && !url; i++) { try { url = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(200); }
  if (!url) throw new Error('Chrome did not start');
  const ws = new WebSocket(url); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const waiting = new Map(), errors = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || '')); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const evaluate = async expression => (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result?.result?.value;
  return {
    errors,
    async open(pageUrl, width, height = 900, wait = 1500) {
      await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 600});
      await send('Page.navigate', {url: pageUrl}); await sleep(wait);
      await evaluate(`document.fonts?.ready`);
    },
    evaluate,
    // Full-page capture down to the footer (v3.1 C13: no height cap). Pages taller than `tile` px are captured in
    // tiles and stitched with Python/Pillow, because a single GPU capture becomes unreliable past ~16k px.
    async shot(file, {fullPage = true, maxHeight = Infinity, tile = 8000} = {}) {
      const {writeFile} = await import('node:fs/promises');
      const size = await evaluate(`JSON.stringify({w:document.documentElement.clientWidth,h:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)})`).then(JSON.parse);
      const height = fullPage ? Math.min(size.h, maxHeight) : undefined;
      const grab = async (y, h) => Buffer.from((await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: fullPage, ...(fullPage ? {clip: {x: 0, y, width: size.w, height: h, scale: 1}} : {})})).result.data, 'base64');
      if (!fullPage || height <= tile) { await writeFile(file, await grab(0, height)); return size; }
      const parts = [], tmp = mkdtempSync(join(tmpdir(), 'pa-tiles-'));   // tiles stay in the OS temp folder
      for (let y = 0, i = 0; y < height; y += tile, i++) { const part = join(tmp, `part${i}.png`); await writeFile(part, await grab(y, Math.min(tile, height - y))); parts.push(part); }
      const {execFileSync} = await import('node:child_process');
      execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nims=[Image.open(p) for p in sys.argv[2:]]\nout=Image.new("RGB",(ims[0].width,sum(i.height for i in ims)),"white")\ny=0\nfor i in ims:\n  out.paste(i,(0,y)); y+=i.height\nout.save(sys.argv[1],optimize=True)', file, ...parts]);
      return size;
    },
    close() { ws.close(); chrome.kill(); }
  };
}
