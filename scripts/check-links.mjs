// Check every source link in the catalogue and the pages (review item 5.1). Writes outputs/LINK-CHECK.md.
// Usage: node scripts/check-links.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const routes = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
const urls = new Map();
const add = (u, where) => { if (!/^https?:/.test(u || '')) return; if (!urls.has(u)) urls.set(u, new Set()); urls.get(u).add(where); };
for (const r of routes) { r.sources.forEach(s => add(s.url, r.id)); Object.values(r.fieldSources || {}).forEach(s => add(s.url, r.id)); }
for (const f of ['docs/v3.js', 'docs/p10-planner.js']) for (const m of (await readFile(join(root, f), 'utf8')).matchAll(/https?:\/\/[^\s'"`<>)\\]+/g)) if (!/\$\{/.test(m[0]) && !/w3\.org/.test(m[0])) add(m[0], f);
// Internal (relative) links: checked against the files in docs/, not fetched (v3.1 C13: the licence link is now
// the relative CONTENT-LICENSE.md and must not be recorded as a 404 on GitHub).
const {readdir, access} = await import('node:fs/promises');
const internal = new Map();
for (const f of (await readdir(join(root, 'docs'))).filter(f => /\.(html|js)$/.test(f))) {
  const src = await readFile(join(root, 'docs', f), 'utf8');
  for (const m of src.matchAll(/(?:href|src)="([^"#:${}]+?)(?:[?#][^"]*)?"|v3Link\('([^'#:${}]+?)(?:[?#][^']*)?'/g)) {
    const u = m[1] || m[2]; if (!u || /^(data|mailto|tel|javascript)/.test(u) || u.startsWith('//')) continue;
    if (!internal.has(u)) internal.set(u, new Set()); internal.get(u).add('docs/' + f);
  }
}
const internalBad = [];
for (const u of internal.keys()) { try { await access(join(root, 'docs', decodeURI(u))); } catch { internalBad.push(u); } }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const list = [...urls.keys()], results = [];
await Promise.all(Array.from({length: 8}, async () => { for (let u; (u = list.pop());) { let status; try { const res = await fetch(u, {headers: {'user-agent': UA}, redirect: 'follow', signal: AbortSignal.timeout(25000)}); status = res.status; await res.body?.cancel(); } catch (e) { status = 'error: ' + (e.name || 'fetch failed'); } results.push([u, status]); } }));
results.sort((a, b) => String(a[1]).localeCompare(String(b[1])) || a[0].localeCompare(b[0]));
const bad = results.filter(r => r[1] !== 200), date = new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(new Date());
const tally = {}; results.forEach(r => tally[r[1]] = (tally[r[1]] || 0) + 1);
await writeFile(join(root, 'outputs/LINK-CHECK.md'), [`# Link check ${date}`, '', `> 中文摘要：${date} 检查了 ${results.length} 个出处链接。结果：${Object.entries(tally).map(([k, v]) => `${k} ×${v}`).join('，')}。403 多为站点拒绝脚本访问，需用浏览器人工确认；404 需要替换。`, '', '| Status | URL | Used by |', '|---|---|---|', ...bad.map(([u, s]) => `| ${s} | ${u} | ${[...urls.get(u)].slice(0, 4).join(', ')} |`), '', `${results.length - bad.length} links returned 200 and are not listed.`, '', '## Internal links', '', `${internal.size} relative links in docs/*.html and docs/*.js were checked against the files in docs/ (not fetched): ${internalBad.length ? internalBad.length + ' missing.' : 'all present.'} This includes the footer licence link \`CONTENT-LICENSE.md\`, which is a relative link inside the site since v3.1.`, ...internalBad.map(u => `- MISSING ${u} (${[...internal.get(u)].join(', ')})`), ''].join('\n'));
console.log(JSON.stringify(tally), `internal ${internal.size} checked, ${internalBad.length} missing`, internalBad);
