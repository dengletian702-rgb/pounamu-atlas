// v3.1 review item C12: every planner tip needs an official source, or it is shown as 待核实 / To verify.
// Reads data/wish-tips.json. For each source: `evidence` quotes must be in data/evidence/<id>.json, `fetch` quotes
// must be on the live page (fetched here; the matched quotes and fetch status go to data/wish-tip-evidence.json),
// `edge` must be an NZTA reading in EDGE_SOURCES. A tip whose quotes are not all found is written as to-verify.
// Then rewrites the P10_WISH_TIPS block in docs/p10-planner.js.
// Usage: node scripts/check-wish-tips.mjs [--offline]   (--offline re-uses data/wish-tip-evidence.json)
import {readFile, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const offline = process.argv.includes('--offline');
const {tips} = JSON.parse(await readFile(join(root, 'data/wish-tips.json'), 'utf8'));
const evPath = join(root, 'data/wish-tip-evidence.json');
const saved = offline ? JSON.parse(await readFile(evPath, 'utf8')) : {};
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const text = h => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').replace(/<\/(p|div|li|h\d|tr|section|dd|dt|span|a)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
const nzDate = iso => new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(new Date(iso));
const require = createRequire(import.meta.url);
delete globalThis.P10_EDGE_SOURCES; require(join(root, 'docs/p10-planner.js'));
const edges = globalThis.P10_EDGE_SOURCES;
const evidence = {...saved}, pages = {};
async function page(url) {
  if (pages[url]) return pages[url];
  const res = await fetch(url, {headers: {'user-agent': UA, 'accept-language': 'en-NZ,en'}, redirect: 'follow', signal: AbortSignal.timeout(30000)});
  return (pages[url] = {status: res.status, finalUrl: res.url, fetchedAt: new Date().toISOString(), body: res.ok ? text(await res.text()) : ''});
}
const out = {}, report = [];
for (const [id, t] of Object.entries(tips)) {
  if (t.status === 'to-verify') { out[id] = {zh: t.zh, en: t.en, verify: true, check: t.check}; report.push(`${id}: to verify (${t.why})`); continue; }
  const src = [], missing = [];
  for (const s of t.sources) {
    const quotes = [].concat(s.quote || []);
    if (s.evidence) {
      const raw = await readFile(join(root, 'data/evidence', s.evidence + '.json'), 'utf8'), recs = JSON.parse(raw);
      for (const q of quotes) if (!raw.includes(JSON.stringify(q).slice(1, -1))) missing.push(q);
      const rec = recs.find(r => JSON.stringify(r).includes(JSON.stringify(quotes[0]).slice(1, -1))) || recs[0];
      src.push({url: rec.finalUrl || rec.url, checkedAt: nzDate(rec.fetchedAt)});
    } else if (s.fetch) {
      let rec;
      if (offline) rec = saved[s.fetch] || {status: 0, found: []};
      else { const p = await page(s.fetch); rec = {status: p.status, finalUrl: p.finalUrl, fetchedAt: p.fetchedAt, found: quotes.filter(q => p.body.includes(q))}; }
      evidence[s.fetch] = rec;
      for (const q of quotes) if (!rec.found.includes(q)) missing.push(q);
      src.push({url: rec.finalUrl || s.fetch, checkedAt: rec.fetchedAt ? nzDate(rec.fetchedAt) : null});
    } else if (s.edge) {
      const e = edges.find(x => x.from + '|' + x.to === s.edge && x.nzta);
      if (!e) missing.push('NZTA reading for ' + s.edge); else src.push({url: e.url, checkedAt: e.checkedAt});
    }
  }
  if (missing.length) { out[id] = {zh: t.zh, en: t.en, verify: true, check: src[0]?.url}; report.push(`${id}: TO VERIFY, quote not found: ${missing.join(' | ')}`); }
  else { out[id] = {zh: t.zh, en: t.en, src}; report.push(`${id}: checked (${src.length} source${src.length > 1 ? 's' : ''})`); }
}
if (!offline) await writeFile(evPath, JSON.stringify(evidence, null, 1) + '\n');
const file = join(root, 'docs/p10-planner.js');
const js = await readFile(file, 'utf8');
const block = `const P10_WISH_TIPS = {\n${Object.entries(out).map(([id, v]) => `  ${JSON.stringify(id)}: ${JSON.stringify(v)},`).join('\n')}\n};\n`;
const next = js.replace(/const P10_WISH_TIPS = \{\n[\s\S]*?\n\};\n/, block);
if (next === js && !js.includes(block)) throw new Error('P10_WISH_TIPS block not found');
await writeFile(file, next);
console.log(report.join('\n'));
console.log(`${Object.values(out).filter(v => v.src).length} tips checked against official sources, ${Object.values(out).filter(v => v.verify).length} to verify.`);
