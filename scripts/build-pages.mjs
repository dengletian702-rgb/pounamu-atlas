// Builds a static copy of the site for GitHub Pages, served under a sub-path such as /pounamu-atlas/.
// The local server (server.js) maps clean URLs (/routes, /r/<id>, /compare, /trip) to pages and answers /api/*;
// Pages can do neither, so this script writes one folder per clean URL, prefixes every root-relative path with the
// base path, and turns off the call to the local Jev service.
// Usage: node scripts/build-pages.mjs <out-dir> [base]   (base defaults to /pounamu-atlas)
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public');
const OUT = process.argv[2];
const BASE = (process.argv[3] || '/pounamu-atlas').replace(/\/$/, '');
if (!OUT) { console.error('usage: node scripts/build-pages.mjs <out-dir> [base]'); process.exit(1); }
if (existsSync(OUT) && readdirSync(OUT).length) { console.error(`${OUT} is not empty`); process.exit(1); }

mkdirSync(OUT, { recursive: true });
cpSync(SRC, OUT, { recursive: true });

// Root-relative references this site uses: its folders, its pages and clean URLs, and "/" itself.
const TOP = '(?:css|js|data|img|fonts|r|routes|compare|trip|favicon\\.svg|sw\\.js|index\\.html|route\\.html|trip\\.html|compare\\.html)\\b';
const QUOTED = new RegExp(`(["'\`(])\\/(?=${TOP}|#|["'\`)?])`, 'g');
const SRCSET = /(,\s*)\/(?=img\/)/g;

function walk(dir) { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
function swap(text, from, to, file) {
  if (!text.includes(from)) throw new Error(`${file}: expected "${from}"`);
  return text.split(from).join(to);
}

for (const file of walk(OUT)) {
  if (!['.html', '.js', '.css', '.svg'].includes(extname(file))) continue;
  let text = readFileSync(file, 'utf8');
  const rel = file.slice(OUT.length).replace(/^\/+/, '');
  text = text.replace(QUOTED, `$1${BASE}/`).replace(SRCSET, `$1${BASE}/`);
  if (rel === 'js/route.js') text = swap(text, 'location.pathname.replace(/^\\/r\\//, \'\')', 'location.pathname.replace(/^.*\\/r\\//, \'\')', rel);
  if (rel === 'js/app.js') text = swap(text, "fetch('/api/capabilities')", "Promise.reject(new Error('static site'))", rel);
  if (rel === 'sw.js') {
    // Pages serves the clean URLs as folders, so they end in a slash; the fallback page is matched below the base.
    text = text.replace(new RegExp(`"${BASE}/(compare|trip)"`, 'g'), `"${BASE}/$1/"`);
    text = swap(text, 'const PAGE = (p) => (', `const PAGE = (p) => (p = p.slice(${JSON.stringify(BASE)}.length) || '/', `, rel);
    text = swap(text, `p.replace(/\\/$/, '') : null)`, `'${BASE}' + p.replace(/\\/?$/, '/') : null)`, rel);
  }
  writeFileSync(file, text);
}

// One folder per clean URL.
const { ROUTES } = await import(join(SRC, 'data/routes.js'));
const page = (name) => readFileSync(join(OUT, name), 'utf8');
const put = (path, html) => { mkdirSync(join(OUT, path), { recursive: true }); writeFileSync(join(OUT, path, 'index.html'), html); };
put('routes', page('index.html'));
put('compare', page('compare.html'));
put('trip', page('trip.html'));
for (const r of ROUTES) put(join('r', r.id), page('route.html'));
writeFileSync(join(OUT, '404.html'), page('index.html'));
writeFileSync(join(OUT, '.nojekyll'), '');

// Anything still pointing at the server root (other than /api, which is never called) is a bug.
const left = walk(OUT).filter((f) => ['.html', '.js', '.css'].includes(extname(f)))
  .flatMap((f) => (readFileSync(f, 'utf8').match(/["'`(]\/(?!\/)[a-z#][^"'`)\s]*/g) || []).filter((m) => !m.slice(1).startsWith(BASE + '/') && m.slice(1) !== BASE &&!m.includes('/api/')).map((m) => `${f.slice(OUT.length)}: ${m}`));
console.log(`built ${OUT} for ${BASE}: ${ROUTES.length} route pages`);
if (left.length) { console.log('unprefixed paths:\n' + [...new Set(left)].slice(0, 30).join('\n')); process.exitCode = 1; }
