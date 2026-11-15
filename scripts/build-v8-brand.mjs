// Build the v8 brand files: the brush wordmark 绿石之地 (outlines taken from Ma Shan Zheng, SIL OFL 1.1) and the
// pounamu stone mark. The wordmark is drawn as outlines, so the site never loads the 5 MB brush font.
//
// Usage: node scripts/build-v8-brand.mjs <path to MaShanZheng-Regular.ttf>
// Writes docs/assets/brand/wordmark-zh.svg, docs/assets/brand/mark.svg and docs/assets/brand/OFL-MaShanZheng.txt
// (when the licence file sits next to the font). Rerun only if the lettering or the mark changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/assets/brand');
const fontPath = process.argv[2];
if (!fontPath) { console.error('usage: node scripts/build-v8-brand.mjs <MaShanZheng-Regular.ttf>'); process.exit(1); }
const buf = fs.readFileSync(fontPath);

// ---- a small TrueType reader: cmap, loca, glyf, hmtx (enough for a few CJK glyphs) ----
const tables = {};
for (let i = 0, n = buf.readUInt16BE(4); i < n; i++) {
  const o = 12 + i * 16;
  tables[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) };
}
const head = tables.head.off;
const upm = buf.readUInt16BE(head + 18);
const longLoca = buf.readInt16BE(head + 50) === 1;
const numHMetrics = buf.readUInt16BE(tables.hhea.off + 34);

function glyphIndex(cp) {
  const c = tables.cmap.off;
  const n = buf.readUInt16BE(c + 2);
  let best = null;
  for (let i = 0; i < n; i++) {
    const pid = buf.readUInt16BE(c + 4 + i * 8), eid = buf.readUInt16BE(c + 6 + i * 8), off = buf.readUInt32BE(c + 8 + i * 8);
    const fmt = buf.readUInt16BE(c + off);
    if (pid === 3 && eid === 10 && fmt === 12) best = { fmt, at: c + off };
    else if (!best && pid === 3 && eid === 1 && fmt === 4) best = { fmt, at: c + off };
  }
  if (!best) throw new Error('no usable cmap');
  const t = best.at;
  if (best.fmt === 12) {
    const groups = buf.readUInt32BE(t + 12);
    for (let g = 0; g < groups; g++) {
      const o = t + 16 + g * 12, s = buf.readUInt32BE(o), e = buf.readUInt32BE(o + 4), id = buf.readUInt32BE(o + 8);
      if (cp >= s && cp <= e) return id + (cp - s);
    }
    return 0;
  }
  const segX2 = buf.readUInt16BE(t + 6), ends = t + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
  for (let s = 0; s < segX2 / 2; s++) {
    const end = buf.readUInt16BE(ends + s * 2), start = buf.readUInt16BE(starts + s * 2);
    if (cp < start || cp > end) continue;
    const delta = buf.readInt16BE(deltas + s * 2), ro = buf.readUInt16BE(ranges + s * 2);
    if (!ro) return (cp + delta) & 0xffff;
    const gi = buf.readUInt16BE(ranges + s * 2 + ro + (cp - start) * 2);
    return gi ? (gi + delta) & 0xffff : 0;
  }
  return 0;
}
const locaAt = i => longLoca ? buf.readUInt32BE(tables.loca.off + i * 4) : buf.readUInt16BE(tables.loca.off + i * 2) * 2;
const advance = i => buf.readUInt16BE(tables.hmtx.off + Math.min(i, numHMetrics - 1) * 4);

// Returns contours as arrays of {x, y, on}.
function contours(gi, depth = 0) {
  const start = locaAt(gi), end = locaAt(gi + 1);
  if (end <= start) return [];
  const g = tables.glyf.off + start;
  const nc = buf.readInt16BE(g);
  if (nc < 0) {
    if (depth > 4) return [];
    const all = [];
    let p = g + 10, flags;
    do {
      flags = buf.readUInt16BE(p); const child = buf.readUInt16BE(p + 2); p += 4;
      let dx, dy;
      if (flags & 1) { dx = buf.readInt16BE(p); dy = buf.readInt16BE(p + 2); p += 4; } else { dx = buf.readInt8(p); dy = buf.readInt8(p + 1); p += 2; }
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = o => buf.readInt16BE(o) / 16384;
      if (flags & 8) { a = d = f2(p); p += 2; } else if (flags & 0x40) { a = f2(p); d = f2(p + 2); p += 4; } else if (flags & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
      if (!(flags & 2)) { dx = 0; dy = 0; }
      for (const ct of contours(child, depth + 1)) all.push(ct.map(q => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
    } while (flags & 0x20);
    return all;
  }
  const endPts = []; for (let i = 0; i < nc; i++) endPts.push(buf.readUInt16BE(g + 10 + i * 2));
  const n = nc ? endPts[nc - 1] + 1 : 0;
  let p = g + 10 + nc * 2; p += 2 + buf.readUInt16BE(p);
  const fl = [];
  while (fl.length < n) { const f = buf[p++]; fl.push(f); if (f & 8) { let r = buf[p++]; while (r--) fl.push(f); } }
  const xs = [], ys = [];
  let v = 0;
  for (const f of fl) { if (f & 2) { const d = buf[p++]; v += (f & 16) ? d : -d; } else if (!(f & 16)) { v += buf.readInt16BE(p); p += 2; } xs.push(v); }
  v = 0;
  for (const f of fl) { if (f & 4) { const d = buf[p++]; v += (f & 32) ? d : -d; } else if (!(f & 32)) { v += buf.readInt16BE(p); p += 2; } ys.push(v); }
  const res = []; let s = 0;
  for (const e of endPts) { const c = []; for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(fl[i] & 1) }); res.push(c); s = e + 1; }
  return res;
}

// Quadratic TrueType contours to an SVG path, shifted by ox and flipped so y grows down from the baseline at by.
function toPath(cts, ox, by) {
  const P = q => `${Math.round(q.x + ox)} ${Math.round(by - q.y)}`;
  let d = '';
  for (const c of cts) {
    if (!c.length) continue;
    const pts = c.slice();
    let startIdx = pts.findIndex(q => q.on);
    let first;
    if (startIdx < 0) { first = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2, on: true }; startIdx = 0; pts.splice(1, 0, first); startIdx = 1; }
    const ring = pts.slice(startIdx).concat(pts.slice(0, startIdx));
    d += `M${P(ring[0])}`;
    for (let i = 1; i <= ring.length; i++) {
      const cur = ring[i % ring.length];
      if (cur.on) { d += `L${P(cur)}`; continue; }
      const next = ring[(i + 1) % ring.length];
      const end = next.on ? next : { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2, on: true };
      d += `Q${P(cur)} ${P(end)}`;
      if (next.on) i++;
    }
    d += 'Z';
  }
  return d.replace(/L(\S+ \S+)Z/g, 'Z');
}

// ---- wordmark ----
const text = '绿石之地';
const track = -150;                  // brush strokes overlap a little, so pull the characters together
let x = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const parts = [];
for (const ch of text) {
  const gi = glyphIndex(ch.codePointAt(0));
  if (!gi) throw new Error('glyph missing for ' + ch);
  const cts = contours(gi);
  for (const c of cts) for (const q of c) { minX = Math.min(minX, q.x + x); maxX = Math.max(maxX, q.x + x); minY = Math.min(minY, upm * .88 - q.y); maxY = Math.max(maxY, upm * .88 - q.y); }
  parts.push(toPath(cts, x, upm * .88));
  x += advance(gi) + track;
}
const pad = 6;
const vb = [Math.floor(minX - pad), Math.floor(minY - pad), Math.ceil(maxX - minX + pad * 2), Math.ceil(maxY - minY + pad * 2)];
fs.mkdirSync(out, { recursive: true });
const word = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" role="img" aria-label="绿石之地"><title>绿石之地</title><path fill="#0f1b16" d="${parts.join('')}"/></svg>\n`;
fs.writeFileSync(path.join(out, 'wordmark-zh.svg'), word);
fs.writeFileSync(path.join(out, 'wordmark-zh-light.svg'), word.replace('fill="#0f1b16"', 'fill="#eef3f0"'));

// ---- mark: a polished pounamu stone with a cord hole, the Southern Alps and a fiord line carved in ----
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="绿石之地"><title>绿石之地</title>
<defs><linearGradient id="g" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="#5bb293"/><stop offset=".5" stop-color="#1d6a53"/><stop offset="1" stop-color="#0a2b21"/></linearGradient>
<radialGradient id="h" cx=".36" cy=".3" r=".38"><stop offset="0" stop-color="#eafff6" stop-opacity=".6"/><stop offset="1" stop-color="#eafff6" stop-opacity="0"/></radialGradient></defs>
<g transform="rotate(-8 24 25)"><path fill="url(#g)" d="M24.6 3.2c5.7.2 10.2 5.6 13.6 12.3 4.3 8.6 5.2 16.6 1.6 22.6-3.6 6-10.1 8.4-16.2 8.1-7.4-.4-13.6-4.3-15.8-10.8-2.3-6.6-.3-14.4 4-20.8 3.5-5.3 7.6-11.6 12.8-11.4z"/><path fill="url(#h)" d="M24.6 3.2c5.7.2 10.2 5.6 13.6 12.3 4.3 8.6 5.2 16.6 1.6 22.6-3.6 6-10.1 8.4-16.2 8.1-7.4-.4-13.6-4.3-15.8-10.8-2.3-6.6-.3-14.4 4-20.8 3.5-5.3 7.6-11.6 12.8-11.4z"/>
<circle cx="24.4" cy="10.2" r="2.4" fill="#eef3f0"/>
<path d="M11.2 33.4l7.3-9.4 3.9 4.6 5.8-8.8 8.8 13.6" fill="none" stroke="#eef3f0" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.2 38.8c2.6-1.9 4.9-1.9 7.5 0s4.9 1.9 7.5 0 4.9-1.9 7.3 0" fill="none" stroke="#a6e6cb" stroke-width="2" stroke-linecap="round"/></g>
</svg>
`;
fs.writeFileSync(path.join(out, 'mark.svg'), mark);
const ofl = path.join(path.dirname(fontPath), 'MaShanZheng-OFL.txt');
if (fs.existsSync(ofl)) fs.copyFileSync(ofl, path.join(out, 'OFL-MaShanZheng.txt'));
console.log('wordmark', vb.join(' '), (word.length / 1024).toFixed(1) + ' KB', '| mark', mark.length, 'bytes');
