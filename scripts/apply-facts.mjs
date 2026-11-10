// Merge checked facts into the route catalogue and record what is still unverified.
// Usage: node scripts/apply-facts.mjs
//   data/field-facts.json        value + official sentence(s) + source URL, per route and field
//   data/evidence/<id>.json      page excerpts saved by scripts/fetch-evidence.mjs (gives the check date)
//   data/featured-additions.json routes added in v3 (appended if missing)
// A fact is accepted only when every quoted sentence is found in the saved excerpt of that URL.
// Result per route: fieldSources{field:{url,checkedAt,quote[]}}, verify[] (tracked fields with no accepted
// fact: shown on the page as "待核实 / To verify"), verifiedFields[] (the rest), checkedAt.
import {readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const J = async p => JSON.parse(await readFile(join(root, p), 'utf8'));
export const TRACKED = ['time', 'distance', 'level', 'season', 'booking', 'access', 'safety'];
const cataloguePath = 'outputs/route-catalogue.json';
const routes = await J(cataloguePath), facts = await J('data/field-facts.json'), additions = await J('data/featured-additions.json');
for (const a of additions) if (!routes.some(r => r.id === a.id)) routes.push(a);
const photos = await J('data/photo-additions.json');
for (const [pid, p] of Object.entries(photos)) { const r = routes.find(x => x.id === p.route); if (r && !r.photoId) r.photoId = pid; }
const norm = s => s.replace(/\s+/g, ' ').trim();
const nzDate = iso => new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(new Date(iso));
const errors = []; let accepted = 0;
for (const r of routes) {
  const ev = existsSync(join(root, 'data/evidence', r.id + '.json')) ? await J(`data/evidence/${r.id}.json`) : [];
  r.fieldSources = {}; r.verify = [];
  for (const f of TRACKED) {
    const fact = facts[r.id]?.[f];
    if (!Array.isArray(r[f])) r[f] = ['', ''];
    if (!fact) { r.verify.push(f); continue; }
    const rec = ev.find(e => e.url === fact.url);
    const hay = rec ? norm([...(rec.overview || []), ...(rec.lines || []), ...(rec.sections || []), ...(rec.stages || []).map(s => Object.values(s).join(' '))].join(' \n ')) : '';
    const missing = fact.quote.filter(q => !hay.includes(norm(q)));
    if (!rec || rec.status !== 200 || missing.length) { errors.push(`${r.id}.${f}: quote not in evidence for ${fact.url}: ${missing.join(' | ') || 'no evidence record'}`); r.verify.push(f); continue; }
    r[f] = [fact.en, fact.zh];
    r.fieldSources[f] = {url: fact.url, checkedAt: nzDate(rec.fetchedAt), quote: fact.quote, via: rec.via || 'direct fetch', ...(fact.note ? {note: fact.note} : {})};
    accepted++;
  }
  r.verifiedFields = TRACKED.filter(f => !r.verify.includes(f));
  r.checkedAt = Object.values(r.fieldSources).map(s => s.checkedAt).sort().pop() || null;
}
for (const id of Object.keys(facts)) if (!routes.some(r => r.id === id)) errors.push(`${id}: facts for an unknown route`);
await writeFile(join(root, cataloguePath), JSON.stringify(routes, null, 1) + '\n');
console.log(`${routes.length} routes; ${accepted} field facts accepted; ${routes.filter(r => !r.verify.length).length} routes fully verified.`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
