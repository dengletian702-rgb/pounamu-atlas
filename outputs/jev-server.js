'use strict';

// Local-only Jev bridge. It exposes only a narrowly scoped route-choice action.
// The key is taken from the server process environment and never returned or logged.
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const compressedCache = new Map();

// HTML is refreshed against the current asset bytes so an already-running local preview
// never serves an updated page with an old script or stylesheet URL.
const VERSION_ASSET = /\b(src|href)="(app\.js|route-maps\.js|p10-planner\.js|planner-adapter\.js|styles\.css|p10-planner\.css)(?:\?[^"#]*)?"/g;
function versionStaticHtml(data, readAsset = name => fs.readFileSync(path.join(SITE_DIR, name))) {
  const hashes = new Map();
  const html = data.toString('utf8').replace(VERSION_ASSET, (full, attribute, name) => {
    if (!hashes.has(name)) hashes.set(name, crypto.createHash('sha256').update(readAsset(name)).digest('hex').slice(0,12));
    return `${attribute}="${name}?v=${hashes.get(name)}"`;
  });
  return Buffer.from(html, 'utf8');
}
const fs = require('node:fs');
const path = require('node:path');

const SITE_DIR = path.join(__dirname, 'site');
const IMAGE_DIR = path.join(SITE_DIR, 'assets', 'optimized');
// Only regular, explicitly enumerated public WebP assets can be served.
const IMAGE_FILES = new Set(fs.readdirSync(IMAGE_DIR, {withFileTypes: true})
  .filter(entry => entry.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(entry.name))
  .map(entry => entry.name));
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/routes.html': ['routes.html', 'text/html; charset=utf-8'],
  '/route.html': ['route.html', 'text/html; charset=utf-8'],
  '/plan.html': ['plan.html', 'text/html; charset=utf-8'],
  '/prepare.html': ['prepare.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/planner-adapter.js': ['planner-adapter.js', 'text/javascript; charset=utf-8'],
  '/p10-planner.js': ['p10-planner.js', 'text/javascript; charset=utf-8'],
  '/p10-planner.css': ['p10-planner.css', 'text/css; charset=utf-8'],
  '/route-maps.js': ['route-maps.js', 'text/javascript; charset=utf-8'],
  '/assets/fonts/display-v1.woff2': ['assets/fonts/display-v1.woff2', 'font/woff2'],
  '/assets/fonts/OFL.txt': ['assets/fonts/OFL.txt', 'text/plain; charset=utf-8']
};
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'route-catalogue.json'), 'utf8'));
const OPTIONS = {south: {}, north: {}};
for (const island of ['north', 'south']) {
  for (const mode of ['walk', 'cycle', 'drive', 'transit']) {
    OPTIONS[island][mode] = Object.fromEntries(catalog.filter(r => (r.island || 'south') === island && r.mode === mode).map(r => [r.id,
      `${r.name}: ${r.summary[0]} Start/finish: ${r.ends[0]}. Time: ${r.time[0]}. Distance: ${r.distance[0]}. Difficulty: ${r.level[0]}.`]));
  }
}
function optionsFor(data) {
  const duration = Object.fromEntries(catalog.map(r => [r.id, r.planDays || 1]));
  return Object.fromEntries(Object.entries(OPTIONS[data.island || 'south'][data.preference]).filter(([id]) => duration[id] <= data.days).slice(0, 6));
}

function validInput(data) {
  return data && typeof data === 'object' && !Array.isArray(data) &&
    [2,3].includes(Object.keys(data).length) && Object.keys(data).every(k => ['days','preference','island'].includes(k)) &&
    (Number.isInteger(data.days) && data.days >= 3 && data.days <= 21) && (data.island === undefined || ['north','south'].includes(data.island)) &&
    ['walk','cycle','drive','transit'].includes(data.preference);
}
function makeRequest(data) {
  if (!validInput(data)) throw new Error('invalid_input');
  if (!Object.keys(optionsFor(data)).length) throw new Error('catalog_unavailable');
  return {model: 'jev-latest', state: {days: data.days, travel_mode: data.preference, island: data.island || 'south'},
    questions: {starting_route: {type: 'choice', instructions: 'Choose one starting route on the selected New Zealand island that fits the travel mode and available days. Consider the supplied duration, location and difficulty. Select only from the listed routes.', criteria: optionsFor(data)}}};
}
function validateAnswer(data, response) {
  const answer = response && response.answers && response.answers.starting_route;
  const choice = answer && answer.choice;
  if (!answer || answer.type !== 'choice' || typeof choice !== 'string' || !Object.hasOwn(optionsFor(data), choice)) throw new Error('invalid_upstream_response');
  return {routeId: choice};
}
function jevRequest(payload, key) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request('https://api.typesafe.ai/v1/systemone', {
      method: 'POST', headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Accept': 'application/json'}, timeout: 20000
    }, res => {
      let result = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { result += chunk; if (result.length > 1048576) req.destroy(); });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(Object.assign(new Error('upstream_error'), {status: res.statusCode}));
        try { resolve(JSON.parse(result)); } catch { reject(new Error('invalid_upstream_response')); }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => reject(new Error('upstream_unavailable')));
    req.end(body);
  });
}
function json(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  res.end(JSON.stringify(data));
}
function createServer({getKey, requestJev = jevRequest}) {
  return http.createServer((req, res) => {
    const host = req.headers.host || '';
    const address = req.socket.localAddress;
    const port = req.socket.localPort;
    if (address !== '127.0.0.1' || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) return json(res, 403, {error: 'local_only'});
    if (req.method === 'GET' && req.url === '/api/capabilities') return json(res, 200, {version: 2, islands: ['north','south'], routeCount: catalog.length});
    const staticPath = (req.url || '').split('?', 1)[0];
    const imageMatch = staticPath.match(/^\/assets\/optimized\/([a-z0-9]+(?:-[a-z0-9]+)*\.webp)$/);
    if (req.method === 'GET' && imageMatch && IMAGE_FILES.has(imageMatch[1])) {
      fs.open(path.join(IMAGE_DIR, imageMatch[1]), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW, (openError, fd) => {
        if (openError) return json(res, 404, {error: 'not_found'});
        fs.fstat(fd, (statError, stat) => {
          if (statError || !stat.isFile()) {
            fs.close(fd, () => json(res, 404, {error: 'not_found'}));
            return;
          }
          fs.readFile(fd, (readError, content) => {
            fs.close(fd, () => {
              if (readError) return json(res, 404, {error: 'not_found'});
              res.writeHead(200, {'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY'});
              res.end(content);
            });
          });
        });
      });
      return;
    }
    if (req.method === 'GET' && Object.hasOwn(FILES, staticPath)) {
      const [file, contentType] = FILES[staticPath];
      fs.readFile(path.join(SITE_DIR, file), (err, content) => {
        if (err) return json(res, 404, {error: 'not_found'});
        const headers = {'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY'};
        if (contentType.startsWith('text/html')) {
          try { content = versionStaticHtml(content); }
          catch { return json(res, 500, {error: 'asset_unavailable'}); }
          headers['Cache-Control'] = 'no-cache';
        }
        if (!contentType.startsWith('text/') || content.length < 1024) { res.writeHead(200, headers); res.end(content); return; }
        headers.Vary = 'Accept-Encoding';
        const encodings = String(req.headers['accept-encoding'] || '').split(',').map(x => x.trim().split(';'));
        const supported = name => encodings.some(([token, ...params]) => token === name && !params.some(p => /^q\s*=\s*0(?:\.0*)?\s*$/.test(p.trim())));
        const encoding = supported('br') ? 'br' : supported('gzip') ? 'gzip' : null;
        if (!encoding) { res.writeHead(200, headers); res.end(content); return; }
        const key = file + ':' + encoding + ':' + crypto.createHash('sha1').update(content).digest('hex'), cached = compressedCache.get(key);
        const send = bytes => { res.writeHead(200, {...headers, 'Content-Encoding': encoding}); res.end(bytes); };
        if (cached) { send(cached); return; }
        const compress = encoding === 'br' ? zlib.brotliCompress : zlib.gzip;
        compress(content, (error, bytes) => { if (error) { res.writeHead(200, headers); res.end(content); return; } compressedCache.set(key, bytes); send(bytes); });
      });
      return;
    }
    if (req.method !== 'POST' || req.url !== '/api/jev/choice') return json(res, 404, {error: 'not_found'});
    if (req.headers.origin !== `http://${host}` || (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return json(res, 403, {error: 'origin_denied'});
    let chunks = [], size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 1024) { chunks = []; req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', async () => {
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(res, 400, {error: 'invalid_input'}); }
      if (!validInput(data)) return json(res, 400, {error: 'invalid_input'});
      const key = getKey();
      if (!key || /[\r\n]/.test(key)) return json(res, 503, {error: 'key_unavailable'});
      try {
        const response = await requestJev(makeRequest(data), key);
        return json(res, 200, validateAnswer(data, response));
      } catch (err) {
        const status = Number(err && err.status);
        if ([401, 403, 429].includes(status)) return json(res, 502, {error: 'provider_error', status});
        if (status >= 400 && status <= 599) return json(res, 502, {error: 'provider_error', status});
        return json(res, 502, {error: err && err.message === 'invalid_upstream_response' ? 'invalid_response' : 'provider_unavailable'});
      }
    });
    req.on('error', () => {});
  });
}
if (require.main === module) {
  const server = createServer({getKey: () => process.env.TYPESAFE_API_KEY});
  const requestedPort = process.env.PORT || '';
  const port = /^\d+$/.test(requestedPort) && Number(requestedPort) > 0 && Number(requestedPort) <= 65535 && Number(requestedPort) !== 4870 ? Number(requestedPort) : 0;
  server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${server.address().port}/`));
  server.on('error', () => console.error('Local preview could not start.'));
}
module.exports = {createServer, validInput, makeRequest, validateAnswer, versionStaticHtml};
