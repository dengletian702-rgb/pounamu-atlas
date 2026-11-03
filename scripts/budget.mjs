// Page-weight budget: what each page loads on first view, raw and as sent (the local server Brotli-compresses text;
// images and fonts are sent as they are). Follows the module import graph from each page's entry script and adds the
// one eager photo. The gate is the plan's (rectification-plan-v3 §7): first load under 700 KB on a phone and
// 1.2 MB on desktop, as sent; display font under 350 KB. Fails (exit 1) if a page is over.
//   node scripts/budget.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as Z } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const CSS = ['css/style.css', 'css/v3.css', 'css/v4.css'];
const FONT = 'fonts/pounamu-display.woff2';
const PAGES = {
  home: { html: 'index.html', entry: ['js/app.js', 'js/extras.js', 'js/finder.js'], photo: null },
  route: { html: 'route.html', entry: ['js/route.js'], photo: 'img/routes/milford-sound-1280.jpg' },
  compare: { html: 'compare.html', entry: ['js/compare.js'], photo: 'img/routes/hooker-valley-640.jpg' },
  trip: { html: 'trip.html', entry: ['js/trip.js'], photo: null },
};
const PHONE_KB = 700, DESK_KB = 1200, FONT_KB = 350;

function graph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = readFileSync(join(ROOT, entry), 'utf8');
  for (const [, spec] of src.matchAll(/import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/g)) graph(relative(ROOT, join(ROOT, dirname(entry), spec)), seen);
  return seen;
}
const raw = (f) => statSync(join(ROOT, f)).size;
const sent = (f) => (/\.(js|css|html|svg)$/.test(f) ? brotliCompressSync(readFileSync(join(ROOT, f)), { params: { [Z.BROTLI_PARAM_QUALITY]: 9 } }).length : raw(f));
const kb = (n) => (n / 1024).toFixed(0);

let fail = false;
for (const [name, p] of Object.entries(PAGES)) {
  const files = [p.html, ...CSS, ...new Set(p.entry.flatMap((e) => [...graph(e)])), ...(p.photo ? [p.photo] : [])];
  const r = files.reduce((s, f) => s + raw(f), 0), s = files.reduce((t, f) => t + sent(f), 0);
  const zh = s + raw(FONT);
  const over = zh > PHONE_KB * 1024;
  fail ||= over || zh > DESK_KB * 1024;
  console.log(`${over ? '✗' : '✓'} ${name.padEnd(7)} sent ${kb(s)} KB (+ font ${kb(raw(FONT))} KB in Chinese = ${kb(zh)} KB) / ${PHONE_KB} KB · raw ${kb(r)} KB · ${files.length} files`);
}
const f = raw(FONT) / 1024;
if (f > FONT_KB) fail = true;
console.log(`${f > FONT_KB ? '✗' : '✓'} font    ${f.toFixed(0)} KB / ${FONT_KB} KB`);
process.exit(fail ? 1 : 0);
