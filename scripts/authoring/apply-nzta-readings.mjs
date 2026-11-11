// v3.1 (review item B8): turn the raw NZTA Journey Planner readings into planner data.
// Input: data/nzta/readings-<date>.txt, one line per road segment, copied by hand from the NZTA results page
//   "<from>|<to> => <route> / <time> / <traffic line or other text> ... @ <ISO time of the reading>"
// and data/nzta/place-ids-<date>.txt (the place each town name resolved to in NZTA's own search box).
// Output: rewrites the hours in EDGES of docs/p10-planner.js to the NZTA time rounded to the nearest quarter hour,
// and writes EDGE_SOURCES with the raw reading. NZTA shows no distance, so km stays a planning estimate.
// Usage: node scripts/authoring/apply-nzta-readings.mjs [YYYY-MM-DD]
// Every readings-<date>.txt in data/nzta is read in date order; a later reading of the same segment replaces an
// earlier one. Readings from ESTIMATE_FROM on are labelled 估算 / estimate on the site (ticket D, 2026-11-12: these
// include local roads such as the Whanganui River Road, where NZTA only passes on Google's suggested time).
// The optional date argument is kept for the old command line; it must name one of the files.
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ESTIMATE_FROM = '2026-11-12';
const dates = (await readdir(join(root, 'data/nzta'))).map(f => (f.match(/^readings-(\d{4}-\d{2}-\d{2})\.txt$/) || [])[1]).filter(Boolean).sort();
if (process.argv[2] && !dates.includes(process.argv[2])) throw new Error('no readings file for ' + process.argv[2]);
const places = {};
for (const d of dates) for (const l of (await readFile(join(root, `data/nzta/place-ids-${d}.txt`), 'utf8')).trim().split('\n')) {
  const [id, pid, ...label] = l.split(' '); places[id] = {pid, label: label.join(' ')};
}
const minutes = t => { const m = t.match(/^(?:(\d+)h)?\s*(?:(\d+)\s*m(?:ins?)?)?$/); if (!m || (!m[1] && !m[2])) throw new Error('bad time ' + t); return (+m[1] || 0) * 60 + (+m[2] || 0); };
// km for segments added on 2026-11-12: OSRM route distance on OpenStreetMap data (0 in EDGES = not checked, 待核).
const KM = {};
for (const d of dates) {
  let osrm = null; try { osrm = JSON.parse(await readFile(join(root, `data/nzta/osrm-km-${d}.json`), 'utf8')); } catch { continue; }
  for (const [k, v] of Object.entries(osrm.km)) KM[k] = v ? {status: 'osrm', source: osrm.source, checkedAt: d} : {status: '待核', source: osrm.unchecked[k] || 'no reliable distance', checkedAt: d};
}
const readings = {};
for (const date of dates) for (const line of (await readFile(join(root, `data/nzta/readings-${date}.txt`), 'utf8')).trim().split('\n')) {
  const m = line.match(/^(\S+) => (.*) @ (\S+)$/); if (!m) throw new Error('bad line ' + line);
  const parts = m[2].split(' / ');
  const traffic = /than normal/.test(parts[2]) ? parts[2] : null;
  readings[m[1]] = {route: parts[0], time: parts[1], minutes: minutes(parts[1]), traffic, readAt: m[3], raw: line, date};
}
const file = join(root, 'docs/p10-planner.js');
let js = await readFile(file, 'utf8');
// hoursBefore is the planner's figure before a reading was first applied: keep it when the same reading is applied again.
const kept = {};
for (const m of js.matchAll(/^  "([\w-]+\|[\w-]+)": \{.*readAt: "([^"]+)" \}, hoursBefore: ([\d.]+)/gm)) kept[m[1]] = {readAt: m[2], hoursBefore: +m[3]};
const used = new Set(), changes = [];
js = js.replace(/^(  \['([\w-]+)', '([\w-]+)', )([\d.]+)(, \d+, R\(.*\), '?(\w+)'?.*\],)$/gm, (all, head, a, b, h, tail, pt) => {
  const r = readings[a + '|' + b]; if (!r) { if (pt !== 'ferry') throw new Error('no reading for road segment ' + a + '|' + b); return all; }
  used.add(a + '|' + b);
  const q = Math.max(0.25, Math.round(r.minutes / 15) / 4);
  r.hoursBefore = kept[a + '|' + b] && kept[a + '|' + b].readAt === r.readAt ? kept[a + '|' + b].hoursBefore : +h; r.hours = q; if (q !== +h) changes.push(`${a}|${b} ${h} → ${q}`);
  return head + q + tail;
});
const missing = Object.keys(readings).filter(k => !used.has(k)); if (missing.length) throw new Error('readings with no segment: ' + missing);
const q = s => JSON.stringify(s);
const sources = Object.entries(readings).map(([k, r]) => {
  const [a, b] = k.split('|');
  if (!places[a] || !places[b]) throw new Error('no NZTA place id for ' + k);
  const url = `https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=${places[a].pid}&b=${places[b].pid}`;
  const date = r.date, estimate = date >= ESTIMATE_FROM ? ', estimate: true' : '';
  const km = KM[k] ? `, km: { status: ${q(KM[k].status)}, source: ${q(KM[k].source)}, checkedAt: ${q(KM[k].checkedAt)} }` : '';
  const extra = k === 'te-anau|milford' ? `, km: { status: 'checked', source: 'DOC — Te Anau–Milford Highway brochure (120 km)', url: 'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf', checkedAt: '2026-11-10' }` : '';
  return `  ${q(k)}: { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: ${q(url)}, checkedAt: ${q(date)}, nzta: { from: ${q(places[a].label)}, to: ${q(places[b].label)}, route: ${q(r.route)}, time: ${q(r.time)}, minutes: ${r.minutes}, traffic: ${q(r.traffic)}, readAt: ${q(r.readAt)} }, hoursBefore: ${r.hoursBefore}${estimate}${extra || km} },`;
});
js = js.replace(/const EDGE_SOURCES = \{\n[\s\S]*?\n\};\n/, `const EDGE_SOURCES = {\n${sources.join('\n')}\n};\n`);
// NZTA's Google labels use some older Chinese place names (达尼丁); the site's own names apply (scripts/lib/v4-import.cjs aliasZh).
const {aliasZh} = createRequire(import.meta.url)('../lib/v4-import.cjs');
await writeFile(file, aliasZh(js));
console.log(`${used.size} road segments read from NZTA on ${dates.join(', ')}; ${changes.length} hour values changed:\n  ` + changes.join('\n  '));
