// Local server: static files + one stateless API endpoint for the itinerary pipeline.
// Binds to 127.0.0.1 only. Request bodies are never logged or stored.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync, constants as Z } from 'node:zlib';
import { runPipeline, pipelineInfo } from './pipeline/index.js';

const PORT = Number(process.env.PORT) || 4870;
const HOST = '127.0.0.1';
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};
const SECURITY = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
};

function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, ...SECURITY, ...extra });
  res.end(body);
}

// Text files go out Brotli- or gzip-compressed (cached by content hash, so edits show at once); images and fonts are
// already compressed and go as they are.
const packed = new Map();
function sendStatic(req, res, buf, type, extra = {}) {
  const ae = req.headers['accept-encoding'] || '';
  const enc = !/^(text\/|application\/(json|manifest)|image\/svg)/.test(type) || buf.length < 1024 ? null : /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : null;
  if (!enc) return send(res, 200, buf, type, { Vary: 'Accept-Encoding', ...extra });
  const key = `${enc}:${createHash('sha1').update(buf).digest('base64')}`;
  let body = packed.get(key);
  if (!body) {
    body = enc === 'br' ? brotliCompressSync(buf, { params: { [Z.BROTLI_PARAM_QUALITY]: 9 } }) : gzipSync(buf, { level: 9 });
    packed.set(key, body);
  }
  send(res, 200, body, type, { 'Content-Encoding': enc, Vary: 'Accept-Encoding', ...extra });
}

async function readBody(req, limit = 8192) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('too_large'), { status: 413 });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  try {
    if (url.pathname === '/api/itinerary' && req.method === 'POST') {
      const input = await readBody(req);
      const t0 = Date.now();
      const result = await runPipeline(input);
      // Log only timing and providers — never the traveller's input.
      console.log(`[itinerary] ${Date.now() - t0}ms ${result.trace.map((t) => `${t.step}:${t.provider}${t.fallback ? '(fb)' : ''}`).join(' ')}`);
      return send(res, 200, JSON.stringify(result), undefined, { 'Cache-Control': 'no-store' });
    }
    if (url.pathname === '/api/pipeline' && req.method === 'GET') {
      return send(res, 200, JSON.stringify({ steps: pipelineInfo(), jevConfigured: Boolean(process.env.TYPESAFE_API_KEY) }));
    }
    if (url.pathname === '/api/capabilities' && req.method === 'GET') {
      // Yes/no only: never the key, its length or where it came from.
      return send(res, 200, JSON.stringify({ jev: Boolean(process.env.TYPESAFE_API_KEY), pipeline: 'v3', consentRequired: true }));
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, '{"error":"not_found"}');

    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) {
      // /r/<id> is a route's own page, /compare and /trip have their own; every other unknown path gets the home page.
      const html = await readFile(join(ROOT, /^\/r\/[a-z0-9-]+\/?$/.test(url.pathname) ? 'route.html' : /^\/(compare|trip)\/?$/.test(url.pathname) ? `${url.pathname.replace(/\//g, '')}.html` : 'index.html'));
      return sendStatic(req, res, html, TYPES['.html']);
    }
    sendStatic(req, res, await readFile(file), TYPES[extname(file)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
  } catch (err) {
    send(res, err.status || 500, JSON.stringify({ error: err.status === 413 ? 'too_large' : 'server_error' }));
    if (!err.status) console.error('[error]', err.message);
  }
});

server.listen(PORT, HOST, () => console.log(`Mainland Field Notes → http://${HOST}:${PORT}`));
