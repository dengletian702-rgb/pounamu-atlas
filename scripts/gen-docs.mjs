// Writes the source and credit documents from the site's own data, so they can never drift from what is shown:
//   docs/ROUTE-SOURCES-v3.md  every route (all 78), its sources and the fields still marked To verify / 待核实
//   docs/WHY-SOURCES.md       every recommendation reason with its tag and source, plus the palette rationale
//   docs/IMAGE-CREDITS.md     every photo: place, photographer, licence, Commons page, routes it is used for
//   docs/MAP-SOURCES.md       coastline and map data
//   node scripts/gen-docs.mjs
import { writeFileSync, readFileSync } from 'node:fs';

const D = (f) => import(`../public/data/${f}`);
const { ROUTES, SOURCES } = await D('routes.js');
const { WHY, WHY_PLACE, WHY_TAGS } = await D('why.js');
const { PLACES } = await D('places.js');
const { PHOTOS } = await D('photos.js');
const { MONTH_SOURCES } = await D('months.js');
const out = (f, s) => { writeFileSync(new URL(`../docs/${f}`, import.meta.url), s); console.log(`docs/${f}`); };
const link = (s) => (s ? `[${s.label}](${s.url})` : '—');
const src = (y) => (typeof y.src === 'string' ? SOURCES[y.src] : y.src);
const today = new Date().toLocaleDateString('en-CA'); // local date (NZ/China are ahead of UTC)
const cell = (s) => String(s).replace(/\|/g, '\\|');

// Route sources
out('ROUTE-SOURCES-v3.md', `# Route sources (v3) · 线路来源

> 中文摘要：全部 ${ROUTES.length} 条线路的官方来源，以及仍标为「待核实」的字段。本文件由 \`scripts/gen-docs.mjs\` 从网站数据生成（${today}），与页面显示一致。

Generated from \`public/data/routes*.js\` on ${today}. The older hand-written \`route-sources.md\` covers the first batch only and is kept as history.

| Island | Mode | Route | Source(s) | To verify / 待核实 |
|---|---|---|---|---|
${ROUTES.map((r) => `| ${r.island} | ${r.mode} | [${cell(r.name.en)} / ${cell(r.name.zh)}](/r/${r.id}) | ${r.sources.map((k) => link(SOURCES[k])).join('<br>')} | ${r.verify?.length ? r.verify.join(', ') : '—'} |`).join('\n')}
`);

// Why sources
const whyRows = (map, names) => Object.entries(map).flatMap(([id, list]) => list.map((y, i) =>
  `| ${i === 0 ? cell(names[id] || id) : ''} | ${WHY_TAGS[y.tag].en} | ${cell(y.en)}<br>${cell(y.zh)} | ${link(src(y))} | ${y.verify ? '待核实' : ''} |`));
const routeNames = Object.fromEntries(ROUTES.map((r) => [r.id, `${r.name.en} / ${r.name.zh}`]));
const placeNames = Object.fromEntries(PLACES.map((p) => [p.id, `${p.name.en} / ${p.name.zh}`]));
const palette = readFileSync(new URL('../public/css/stone.css', import.meta.url), 'utf8').match(/^\/\* GENERATED[^\n]*\n([\s\S]*?)\*\//)[1]
  .split('\n').map((l) => l.trim()).join(' ').trim();
out('WHY-SOURCES.md', `# Why each recommendation · 推荐理由与来源

> 中文摘要：网站上每一条线路和地点都写明「为什么推荐」（世界遗产、官方身份、榜单、取景地、之最、历史、编辑理由、实用），每条理由都附来源；未逐字核对的标「待核实」。下面也写明了背景配色的理由。

Generated from \`public/data/why.js\` on ${today}. Tags: ${Object.values(WHY_TAGS).map((t) => `${t.en} / ${t.zh}`).join(' · ')}.

Rules: the first reason is the one shown on cards. Rankings are dated (Milford's TripAdvisor #1 is from 2008); "largest" or "first" claims carry the year or are marked to verify; an editor's reason says plainly that it is one.

## Background colour and texture · 背景配色的理由

${palette}

## Routes (${Object.keys(WHY).length})

| Route | Tag | Reason | Source | |
|---|---|---|---|---|
${whyRows(WHY, routeNames).join('\n')}

## Places (${Object.keys(WHY_PLACE).length})

| Place | Tag | Reason | Source | |
|---|---|---|---|---|
${whyRows(WHY_PLACE, placeNames).join('\n')}

## Month guide sources

${MONTH_SOURCES.map((s) => `- ${link(s)}`).join('\n')}
`);

// Image credits
const covered = new Set(Object.values(PHOTOS).flatMap((p) => p.routes));
out('IMAGE-CREDITS.md', `# Image credits · 图片来源

> 中文摘要：网站使用的 ${Object.keys(PHOTOS).length} 张风景照片全部来自 Wikimedia Commons：其中 ${Object.keys(PHOTOS).filter((k) => k.startsWith('cx-')).length} 张是 2026-11-02 经项目负责人批准后从 Commons 下载的 1280 像素版本，其余来自 Codex 版本已有的文件。逐张写明地点、作者、许可和原始页面；CC BY-SA 照片的缩小版沿用同一许可。每张照片的说明文字写的是真实拍摄地点。

Generated from \`public/data/photos.js\` on ${today}. Files: \`public/img/routes/<id>-{640,1280}.jpg\`, resized with macOS \`sips\`. Ids starting \`cx-\` were downloaded from Commons by \`scripts/fetch-commons.mjs\` (credits in \`scripts/commons-photos.json\`, downloads kept in \`_src/commons/\`).

| Photo | Place | Photographer | Licence | Used for |
|---|---|---|---|---|
${Object.entries(PHOTOS).map(([id, p]) => `| [${cell(p.title)}](${p.source}) | ${cell(p.place.en)} / ${cell(p.place.zh)} | ${cell(p.by)} | [${p.licence}](${p.licenceUrl}) | ${p.routes.join(', ')} |`).join('\n')}

## Routes without a photo yet (${ROUTES.length - covered.size})

${ROUTES.filter((r) => !covered.has(r.id)).map((r) => `- ${r.name.en} / ${r.name.zh} (\`${r.id}\`)`).join('\n')}

${ROUTES.length - covered.size ? "These show the route's shape on the map instead. Adding photos means downloading new files, which needs the site owner's go-ahead." : 'Every route has a photo.'}
`);

// Map sources
out('MAP-SOURCES.md', `# Map sources · 地图来源

> 中文摘要：海岸线来自新西兰土地信息局 LINZ（CC BY 4.0），斯图尔特岛部分来自 Natural Earth（公有领域）。线路走向是手工标注的近似位置，只用于示意，不能用来导航。

- **Coastline:** LINZ NZ Coastlines and Islands Polygons (Topo 1:50k), CC BY 4.0 — "Contains data sourced from the LINZ Data Service". Simplified by \`scripts/build-coast.mjs\` into \`public/data/coast.js\`.
- **Stewart Island / Rakiura:** Natural Earth 1:10m (public domain) where not in the LINZ file.
- **Route lines:** hand-placed approximate coordinates in \`public/data/routes*.js\`, for the illustrated map only — not for navigation. Each route links to its official page (see ROUTE-SOURCES-v3.md).
- **Place pins:** approximate, from each place's official site (\`public/data/places.js\`).
- **Projection:** a simple equirectangular fit to the page (\`public/js/map.js\`, \`project()\`); distances on the map are not to scale.
- The credit line is shown under every map on the site.
`);
