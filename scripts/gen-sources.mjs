// Regenerate the source lists from the data, so they cannot drift from the site (review item 1.8).
// Usage: node scripts/gen-sources.mjs   -> outputs/ROUTE-SOURCES.md, outputs/PLANNER-ROAD-SOURCES.md
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const routes = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
const F = {time: 'Time', distance: 'Distance', level: 'Grade', season: 'Season and closures', booking: 'Booking', access: 'Getting there', safety: 'Safety'};
const ROLE = {primary: 'primary source', highlights: 'highlights only', supplementary: 'background only'};
const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(new Date());
const out = [`# Route sources / 线路来源`, '',
  `> 中文摘要：本文件由 \`scripts/gen-sources.mjs\` 从 \`outputs/route-catalogue.json\` 生成（${date}），共 ${routes.length} 条路线，一条不漏。每条列出全部来源链接及其用途；7 项事实逐项列出来源 URL、核查日期和官方原句，没有核实的写明 To verify（待核实）。`, '',
  `Generated ${date} from \`outputs/route-catalogue.json\`: ${routes.length} routes (${routes.filter(r => r.island === 'north').length} North Island, ${routes.filter(r => r.island === 'south').length} South Island). Do not edit by hand.`, '',
  'Rules: distance, time and opening rules rest on primary sources only (DOC, Ngā Haerenga NZ Cycle Trails, NZTA, newzealand.com, or the operator or council that runs the service or track). Regional tourism and commercial attraction pages are marked “highlights only” and support descriptive text, not facts. A fact is “checked” when the quoted official wording was found in the page excerpt saved in `data/evidence/` on the date shown.', ''];
for (const island of ['north', 'south']) {
  out.push(`## ${island === 'north' ? 'North Island / 北岛' : 'South Island / 南岛'}`, '');
  for (const mode of ['walk', 'cycle', 'drive', 'transit']) {
    const list = routes.filter(r => r.island === island && r.mode === mode); if (!list.length) continue;
    out.push(`### ${mode} (${list.length})`, '');
    for (const r of list) {
      out.push(`#### ${r.name} / ${r.zh} (\`${r.id}\`)`, '', `Checked facts: ${r.verifiedFields.length}/7${r.checkedAt ? `, last check ${r.checkedAt}` : ''}.`, '', 'Sources:', ...r.sources.map(s => `- [${s.label}](${s.url}) — ${ROLE[s.role] || s.role}`), '', '| Fact | Value shown | Status | Source | Official wording |', '|---|---|---|---|---|',
        ...Object.keys(F).map(k => { const s = r.fieldSources[k]; const v = (r[k]?.[0] || '—').replace(/\|/g, '/'); return s ? `| ${F[k]} | ${v} | Checked ${s.checkedAt} | ${s.url} | ${s.quote.map(q => '“' + q.replace(/\|/g, '/') + '”').join(' ')}${s.note ? ' Note: ' + s.note : ''}${s.via && s.via !== 'direct fetch' ? ' (' + s.via + ')' : ''} |` : `| ${F[k]} | ${v} | To verify | — | — |`; }), '');
    }
  }
}
await writeFile(join(root, 'outputs/ROUTE-SOURCES.md'), out.join('\n'));
// planner road segments
const require = createRequire(import.meta.url);
delete globalThis.P10_EDGE_SOURCES; require(join(root, 'docs/p10-planner.js'));
const edges = globalThis.P10_EDGE_SOURCES;
const read = edges.filter(e => e.nzta), nztaDate = read.map(e => e.checkedAt).sort().pop();
const cell = v => String(v ?? '—').replace(/\|/g, '/');
const p = ['# Planner road segments / 规划器公路路段来源', '',
  `> 中文摘要：规划器共 ${edges.length} 段，其中 ${read.length} 段公路的自驾时间已于 ${nztaDate} 在 NZTA Journey Planner 逐段查询，下表记下每段的原始读数（路线、时长、当时路况、查询时间）。页面用的小时数是读数取整到 15 分钟，仍标「估算值（NZTA 查询 ${nztaDate}）」。NZTA 不显示里程，所以里程仍是规划估算（Te Anau–Milford 的 120 km 来自 DOC 手册）。${edges.length - read.length} 段是渡轮，不在 NZTA 范围内，保持估算。查询过程中没有遇到登录、验证码或付费，也没有调用其内部接口：每段都是在浏览器里打开 NZTA 自己的结果页手动读取。`, '',
  `Generated ${date} by \`scripts/gen-sources.mjs\` from \`docs/p10-planner.js\` (EDGES and EDGE_SOURCES). The raw lines are kept in \`data/nzta/readings-${nztaDate}.txt\` and the place each town resolved to in NZTA's own search box in \`data/nzta/place-ids-${nztaDate}.txt\`; \`scripts/authoring/apply-nzta-readings.mjs\` turns them into EDGE_SOURCES.`, '',
  '## Method', '',
  `- One query per segment in the NZTA Journey Planner web page (journeys.nzta.govt.nz), car mode, departing now, on ${nztaDate} between about 18:37 and 18:46 NZDT (05:37–05:46 UTC). Each segment's result page URL is linked in the table.`,
  '- The reading is the first route NZTA lists under "Routes by car": its name, its time, and the traffic line if NZTA showed one. Route names appear with a Chinese joiner (和, 、) because the browser locale was Chinese; they are copied as shown.',
  '- NZTA gives a time with live traffic and no distance, including on the Details view. So: hours on the page = NZTA time rounded to the nearest 15 minutes; km = planning estimate, unchanged.',
  '- Reverse direction is assumed to take the same time (one query per pair).',
  '- No login, captcha or payment was met. No internal API was called.', '',
  '| # | From | To | NZTA route (raw) | NZTA time (raw) | Traffic at query | Read at (UTC) | Hours used | Hours before | km (estimate) | Result page |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...edges.map((e, i) => e.nzta
    ? `| ${i + 1} | ${e.from} | ${e.to} | ${cell(e.nzta.route)} | ${e.nzta.time} | ${cell(e.nzta.traffic)} | ${e.nzta.readAt} | ${e.hours} | ${e.hoursBefore} | ${e.km}${e.from === 'te-anau' && e.to === 'milford' ? ' (DOC brochure)' : ''} | [NZTA](${e.url}) |`
    : `| ${i + 1} | ${e.from} | ${e.to} | — (ferry, not a road segment) | — | — | — | ${e.hours} | ${e.hours} | — | operator timetable |`), '',
  'Network sources shown on the planner page:', ...globalThis.P10_ROAD_SOURCES.map(s => `- [${s.label}](${s.url})`), ''];
await writeFile(join(root, 'outputs/PLANNER-ROAD-SOURCES.md'), p.join('\n'));
console.log(`ROUTE-SOURCES.md: ${routes.length} routes; PLANNER-ROAD-SOURCES.md: ${edges.length} segments (${read.length} NZTA readings, ${edges.length - read.length} ferries).`);
