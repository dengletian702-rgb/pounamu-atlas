// Builds public/fonts/pounamu-display.woff2: a subset of Ma Shan Zheng (SIL OFL 1.1) holding only the Chinese
// characters the site sets as display lettering — the wordmark, headings, route and trip names. No dependencies:
// TrueType glyf subsetting by hand, WOFF2 with null transforms, Brotli from node:zlib.
// The source TTF is read from the Codex folder (read-only). Re-run after adding headings or routes:
//   node scripts/build-lettering.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SRC = process.env.LETTERING_TTF || join(homedir(), 'Documents/Codex/2026-10-31/mac-jev-typesafe-api-key-typesafe/outputs/site/assets/fonts/MaShanZheng-Regular.ttf');
const OUT = new URL('../public/fonts/pounamu-display.woff2', import.meta.url);
const CHARS_OUT = new URL('../public/js/lettering-chars.js', import.meta.url);

// ── The text to cover: every zh string the pages may set in the display face ──
// Interface text: strings() hands out a Proxy, so the Chinese in the two string files is read as source text.
const ui = ['i18n.js', 'i18n-v3.js', 'i18n-v4.js', 'i18n-v5.js'].map((f) => readFileSync(new URL(`../public/js/${f}`, import.meta.url), 'utf8')).join('');
const { ROUTES, REGIONS } = await import('../public/data/routes.js');
const { ITINERARIES } = await import('../public/data/itineraries.js');
const text = [
  ui,
  ...ROUTES.map((r) => r.name.zh), ...Object.values(REGIONS).map((r) => r.zh),
  ...ITINERARIES.map((t) => t.title.zh),
].join('');
const CJK = /[　-〿一-鿿＀-￯]/;
const want = [...new Set([...text].filter((c) => CJK.test(c)))].sort();

// ── Read the source font ──
const b = readFileSync(SRC);
const tables = {};
for (let i = 0, n = b.readUInt16BE(4); i < n; i++) {
  const o = 12 + i * 16;
  tables[b.toString('latin1', o, o + 4)] = b.subarray(b.readUInt32BE(o + 8), b.readUInt32BE(o + 8) + b.readUInt32BE(o + 12));
}
const { head, hhea, maxp, hmtx, loca, glyf, cmap } = tables;
const longLoca = head.readInt16BE(50) === 1;
const numGlyphs = maxp.readUInt16BE(4);
const glyphAt = (g) => (longLoca ? [loca.readUInt32BE(g * 4), loca.readUInt32BE(g * 4 + 4)] : [loca.readUInt16BE(g * 2) * 2, loca.readUInt16BE(g * 2 + 2) * 2]);

// cmap format 4 (Windows Unicode BMP)
function readCmap() {
  const map = new Map();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const pid = cmap.readUInt16BE(4 + i * 8), eid = cmap.readUInt16BE(6 + i * 8), off = cmap.readUInt32BE(8 + i * 8);
    if (!(pid === 3 && eid === 1) || cmap.readUInt16BE(off) !== 4) continue;
    const seg = cmap.readUInt16BE(off + 6) / 2;
    const ends = off + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
    for (let s = 0; s < seg; s++) {
      const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
      const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g;
        if (ro === 0) g = (c + delta) & 0xffff;
        else { g = cmap.readUInt16BE(ranges + s * 2 + ro + (c - start) * 2); if (g) g = (g + delta) & 0xffff; }
        if (g) map.set(c, g);
      }
    }
  }
  return map;
}
const uni = readCmap();
const covered = want.filter((c) => uni.has(c.codePointAt(0)));
const lost = want.filter((c) => !uni.has(c.codePointAt(0)));

// ── Glyph closure (composite glyphs pull in their components) ──
const keep = new Set([0]);
const components = (g) => {
  const [s, e] = glyphAt(g);
  if (e <= s || glyf.readInt16BE(s) >= 0) return [];
  const out = [];
  let p = s + 10, flags;
  do {
    flags = glyf.readUInt16BE(p);
    out.push({ at: p + 2, g: glyf.readUInt16BE(p + 2) });
    p += 4 + (flags & 1 ? 4 : 2) + (flags & 8 ? 2 : flags & 0x40 ? 4 : flags & 0x80 ? 8 : 0);
  } while (flags & 0x20);
  return out;
};
const add = (g) => { if (keep.has(g)) return; keep.add(g); components(g).forEach((c) => add(c.g)); };
covered.forEach((c) => add(uni.get(c.codePointAt(0))));
const order = [...keep].sort((x, y) => x - y);
const newId = new Map(order.map((g, i) => [g, i]));

// ── New tables ──
const pad4 = (buf) => (buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf);
const glyphs = order.map((g) => {
  const [s, e] = glyphAt(g);
  const data = Buffer.from(glyf.subarray(s, e));
  for (const c of components(g)) data.writeUInt16BE(newId.get(c.g), c.at - s);
  return pad4(data);
});
const newGlyf = Buffer.concat(glyphs);
const newLoca = Buffer.alloc((order.length + 1) * 4);
let acc = 0;
glyphs.forEach((d, i) => { newLoca.writeUInt32BE(acc, i * 4); acc += d.length; });
newLoca.writeUInt32BE(acc, order.length * 4);

const nH = hhea.readUInt16BE(34);
const newHmtx = Buffer.alloc(order.length * 4);
order.forEach((g, i) => {
  const adv = hmtx.readUInt16BE(Math.min(g, nH - 1) * 4);
  const lsb = g < nH ? hmtx.readInt16BE(g * 4 + 2) : hmtx.readInt16BE(nH * 4 + (g - nH) * 2);
  newHmtx.writeUInt16BE(adv, i * 4); newHmtx.writeInt16BE(lsb, i * 4 + 2);
});
const newHhea = Buffer.from(hhea); newHhea.writeUInt16BE(order.length, 34);
const newMaxp = Buffer.from(maxp); newMaxp.writeUInt16BE(order.length, 4);
const newHead = Buffer.from(head); newHead.writeUInt32BE(0, 8); newHead.writeInt16BE(1, 50);
const newPost = Buffer.alloc(32); tables.post.copy(newPost, 0, 0, 32); newPost.writeUInt32BE(0x00030000, 0);

// cmap: one format-4 subtable, one segment per character, plus the closing 0xFFFF segment.
const codes = covered.map((c) => c.codePointAt(0)).sort((x, y) => x - y);
const seg = codes.length + 1;
const sub = Buffer.alloc(16 + seg * 8);
sub.writeUInt16BE(4, 0); sub.writeUInt16BE(sub.length, 2); sub.writeUInt16BE(seg * 2, 6);
const sr = 2 ** Math.floor(Math.log2(seg)) * 2;
sub.writeUInt16BE(sr, 8); sub.writeUInt16BE(Math.log2(sr / 2), 10); sub.writeUInt16BE(seg * 2 - sr, 12);
const E = 14, S = E + seg * 2 + 2, D = S + seg * 2, R = D + seg * 2;
[...codes, 0xffff].forEach((c, i) => {
  sub.writeUInt16BE(c, E + i * 2); sub.writeUInt16BE(c, S + i * 2);
  sub.writeUInt16BE(c === 0xffff ? 1 : (newId.get(uni.get(c)) - c) & 0xffff, D + i * 2);
});
const newCmap = Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 3, 0, 1, 0, 0, 0, 12]), sub]);

const out = { cmap: newCmap, head: newHead, hhea: newHhea, hmtx: newHmtx, maxp: newMaxp, name: tables.name, 'OS/2': tables['OS/2'], post: newPost, glyf: newGlyf, loca: newLoca };
if (tables.gasp) out.gasp = tables.gasp;
if (tables.prep) out.prep = tables.prep;

// ── WOFF2: every table stored as-is (glyf/loca with the null transform, version 3), one Brotli stream ──
const tags = [...Object.keys(out).filter((t) => t !== 'glyf' && t !== 'loca'), 'glyf', 'loca']; // loca must follow glyf
const base128 = (n) => { const bytes = []; do { bytes.unshift(n & 0x7f); n >>>= 7; } while (n); return Buffer.from(bytes.map((x, i) => (i < bytes.length - 1 ? x | 0x80 : x))); };
const dir = Buffer.concat(tags.map((t) => Buffer.concat([
  Buffer.from([63 | ((t === 'glyf' || t === 'loca') ? 0xc0 : 0)]), Buffer.from(t.padEnd(4), 'latin1'), base128(out[t].length),
])));
const stream = brotliCompressSync(Buffer.concat(tags.map((t) => out[t])), { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_FONT } });
const sfntSize = 12 + 16 * tags.length + tags.reduce((s, t) => s + Math.ceil(out[t].length / 4) * 4, 0);
const header = Buffer.alloc(48);
header.write('wOF2', 0, 'latin1'); header.writeUInt32BE(0x00010000, 4);
header.writeUInt16BE(tags.length, 12); header.writeUInt32BE(sfntSize, 16); header.writeUInt32BE(stream.length, 20);
header.writeUInt16BE(1, 24);
const body = pad4(Buffer.concat([header, dir, stream]));
body.writeUInt32BE(body.length, 8);
writeFileSync(OUT, body);
writeFileSync(CHARS_OUT, `// GENERATED by scripts/build-lettering.mjs — the characters public/fonts/pounamu-display.woff2 can draw.\nexport const DISPLAY_CHARS = '${covered.join('')}';\n`);
console.log(`${covered.length} characters, ${order.length} glyphs → ${(body.length / 1024).toFixed(0)} KB${lost.length ? `; not in the font: ${lost.join('')}` : ''}`);
