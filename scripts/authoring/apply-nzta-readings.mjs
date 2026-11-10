// v3.1 (review item B8): turn the raw NZTA Journey Planner readings into planner data.
// Input: data/nzta/readings-<date>.txt, one line per road segment, copied by hand from the NZTA results page
//   "<from>|<to> => <route> / <time> / <traffic line or other text> ... @ <ISO time of the reading>"
// and data/nzta/place-ids-<date>.txt (the place each town name resolved to in NZTA's own search box).
// Output: rewrites the hours in EDGES of docs/p10-planner.js to the NZTA time rounded to the nearest quarter hour,
// and writes EDGE_SOURCES with the raw reading. NZTA shows no distance, so km stays a planning estimate.
// Usage: node scripts/authoring/apply-nzta-readings.mjs 2026-11-10
import {readFile, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('usage: apply-nzta-readings.mjs YYYY-MM-DD');
const places = Object.fromEntries((await readFile(join(root, `data/nzta/place-ids-${date}.txt`), 'utf8')).trim().split('\n')
  .map(l => { const [id, pid, ...label] = l.split(' '); return [id, {pid, label: label.join(' ')}]; }));
const minutes = t => { const m = t.match(/^(?:(\d+)h)?\s*(?:(\d+)\s*m(?:ins?)?)?$/); if (!m || (!m[1] && !m[2])) throw new Error('bad time ' + t); return (+m[1] || 0) * 60 + (+m[2] || 0); };
const readings = {};
for (const line of (await readFile(join(root, `data/nzta/readings-${date}.txt`), 'utf8')).trim().split('\n')) {
  const m = line.match(/^(\S+) => (.*) @ (\S+)$/); if (!m) throw new Error('bad line ' + line);
  const parts = m[2].split(' / ');
  const traffic = /than normal/.test(parts[2]) ? parts[2] : null;
  readings[m[1]] = {route: parts[0], time: parts[1], minutes: minutes(parts[1]), traffic, readAt: m[3], raw: line};
}
const file = join(root, 'docs/p10-planner.js');
let js = await readFile(file, 'utf8');
const used = new Set(), changes = [];
js = js.replace(/^(  \['([\w-]+)', '([\w-]+)', )([\d.]+)(, \d+, R\(.*\), '?(\w+)'?.*\],)$/gm, (all, head, a, b, h, tail, pt) => {
  const r = readings[a + '|' + b]; if (!r) { if (pt !== 'ferry') throw new Error('no reading for road segment ' + a + '|' + b); return all; }
  used.add(a + '|' + b);
  const q = Math.max(0.25, Math.round(r.minutes / 15) / 4);
  r.hoursBefore = +h; r.hours = q; if (q !== +h) changes.push(`${a}|${b} ${h} → ${q}`);
  return head + q + tail;
});
const missing = Object.keys(readings).filter(k => !used.has(k)); if (missing.length) throw new Error('readings with no segment: ' + missing);
const q = s => JSON.stringify(s);
const sources = Object.entries(readings).map(([k, r]) => {
  const [a, b] = k.split('|');
  const url = `https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=${places[a].pid}&b=${places[b].pid}`;
  const extra = k === 'te-anau|milford' ? `, km: { status: 'checked', source: 'DOC — Te Anau–Milford Highway brochure (120 km)', url: 'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf', checkedAt: '2026-11-10' }` : '';
  return `  ${q(k)}: { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: ${q(url)}, checkedAt: ${q(date)}, nzta: { from: ${q(places[a].label)}, to: ${q(places[b].label)}, route: ${q(r.route)}, time: ${q(r.time)}, minutes: ${r.minutes}, traffic: ${q(r.traffic)}, readAt: ${q(r.readAt)} }, hoursBefore: ${r.hoursBefore}${extra} },`;
});
js = js.replace(/const EDGE_SOURCES = \{\n[\s\S]*?\n\};\n/, `const EDGE_SOURCES = {\n${sources.join('\n')}\n};\n`);
await writeFile(file, js);
console.log(`${used.size} road segments read from NZTA on ${date}; ${changes.length} hour values changed:\n  ` + changes.join('\n  '));
