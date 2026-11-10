// Fetch official pages and keep short text excerpts as field-level evidence.
// Usage: node scripts/fetch-evidence.mjs [id ...]      (no ids = all targets)
// Reads  data/evidence-targets.json  {id: [url, ...]}
// Writes data/evidence/<id>.json     [{url, finalUrl, status, fetchedAt, title, overview[], lines[]}]
// Nothing here marks a field as verified: a person (or the reviewed apply step) compares
// the excerpt with the catalogue value. Excerpts are short quotations kept for checking only.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const targets = JSON.parse(await readFile(join(root, 'data/evidence-targets.json'), 'utf8'));
const only = process.argv.slice(2);
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const toLines = h => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').replace(/<\/(p|div|li|h\d|tr|section|dd|dt|span)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const KEY = /\b(\d+(\.\d+)?\s?km|\d+\s?(hr|hours?|min|minutes|days?|nights?)\b|grade\s?\d|book|closed|closure|reopen|season|fee|huts?\b|campsite|not permitted|lambing|avalanche|tide|easiest|easy|intermediate|advanced|expert|alert|timetable|departs?|duration)/i;
await mkdir(join(root, 'data/evidence'), {recursive: true});
for (const [id, urls] of Object.entries(targets)) {
  if (only.length && !only.includes(id)) continue;
  const out = [];
  for (const url of urls) {
    const rec = {url, fetchedAt: new Date().toISOString()};
    try {
      const res = await fetch(url, {headers: {'user-agent': UA, 'accept-language': 'en-NZ,en'}, redirect: 'follow', signal: AbortSignal.timeout(30000)});
      rec.status = res.status; rec.finalUrl = res.url;
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('html')) {
        const html = await res.text();
        rec.title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
        const i = html.indexOf('doc-standard-overview group');
        if (i > -1) {
          const end = html.indexOf('Image gallery', i);
          rec.overview = toLines(html.slice(i + 60, end > -1 && end - i < 12000 ? end : i + 6000)).filter(l => l.length > 2).slice(0, 14);
        }
        if (/doc\.govt\.nz/.test(url)) {
          // track description: each <h3>/<h4> stage heading with the Time / Distance printed under it
          const marked = toLines(html.replace(/<(h[3-4])[^>]*>([\s\S]*?)<\/\1>/g, (_, h, inner) => `\n@@${inner.replace(/<[^>]+>/g, '')}\n`));
          rec.stages = []; let cur = null;
          for (let n = 0; n < marked.length; n++) {
            const l = marked[n];
            if (l.startsWith('@@')) { cur = {heading: l.slice(2).trim()}; continue; }
            const m = l.match(/^(Time|Distance):?\s*(.*)$/);
            if (cur && m) { const v = (m[2] || marked[n + 1] || '').trim(); if (v && v.length < 80) { cur[m[1].toLowerCase()] = v; if (!rec.stages.includes(cur)) rec.stages.push(cur); } }
          }
        }
        if (/nzcycletrail\.com/.test(url)) {
          // pair each "NNkm, Grade N, N hours" stats line with the section heading printed just above it
          const all = toLines(html); rec.sections = [];
          all.forEach((l, n) => { if (/^\d+(\.\d+)?\s?km\b.{0,160}(hours?|minutes|stops)/i.test(l) && l.length < 200) rec.sections.push((all[n - 1] || '').slice(0, 120) + ' :: ' + l); });
        }
        const seen = new Set();
        rec.lines = toLines(html).filter(l => l.length > 4 && l.length < 420 && KEY.test(l) && !seen.has(l) && seen.add(l)).slice(0, 90);
      } else rec.note = type;
    } catch (e) { rec.error = String(e.message || e); }
    out.push(rec);
    await new Promise(r => setTimeout(r, 400));
  }
  // records typed by a person (manual: true) survive a refetch
  try { out.push(...JSON.parse(await readFile(join(root, 'data/evidence', id + '.json'), 'utf8')).filter(r => r.manual)); } catch {}
  await writeFile(join(root, 'data/evidence', id + '.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(id, out.map(r => r.status || r.error).join(' '));
}
