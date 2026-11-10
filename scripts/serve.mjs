// Static preview of docs/ (the published site). No API keys, no Jev proxy: the planner runs on local rules.
// Usage: node scripts/serve.mjs            -> http://127.0.0.1:4873/
//        PORT=5000 node scripts/serve.mjs
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname, join, normalize, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const site = join(dirname(dirname(fileURLToPath(import.meta.url))), 'docs');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'};
const port = Number(process.env.PORT) || 4873;
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(site, path));
  if (!file.startsWith(site)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, {'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'}).end(body); }
  catch { res.writeHead(404, {'content-type': 'text/plain'}).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Pounamu Atlas preview: http://127.0.0.1:${port}/`));
