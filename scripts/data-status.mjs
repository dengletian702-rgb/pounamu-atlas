// Count what is verified and what is not, North and South separately. Writes outputs/DATA-STATUS.md.
// Usage: node scripts/data-status.mjs
// Method: read outputs/route-catalogue.json. Seven tracked facts per route: time, distance, level (grade), season
// (incl. closures), booking, access (transport), safety. A fact counts as verified only if the route has a
// fieldSources entry for it (source URL + check date + official wording found in data/evidence/). Everything else is
// in verify[] and counts as a gap. "Fully verified" = verify[] is empty.
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const routes = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
const doc = JSON.parse(await readFile(join(root, 'data/doc-tracks.json'), 'utf8'));
const F = ['time', 'distance', 'level', 'season', 'booking', 'access', 'safety'];
const ZH = {time: '时长', distance: '距离', level: '难度', season: '季节/封闭', booking: '预订', access: '交通', safety: '安全提示'};
const modes = ['walk', 'cycle', 'drive', 'transit', 'paddle'];
const part = k => routes.filter(r => k === 'all' || r.island === k);
const row = (label, list) => `| ${label} | ${list.length} | ${list.filter(r => !r.verify.length).length} | ${F.map(f => list.filter(r => r.verify.includes(f)).length).join(' | ')} | ${list.reduce((n, r) => n + r.verify.length, 0)} / ${list.length * 7} | ${list.filter(r => !r.photoId).length} | ${list.filter(r => r.pacing?.[0] && !r.pacing?.[1]).length} |`;
const head = `| 范围 | 路线数 | 全核（7/7） | ${F.map(f => '缺' + ZH[f]).join(' | ')} | 缺口合计 / 应核字段 | 缺实景照片 | 英文有而中文缺的节奏 |\n|---|---|---|${F.map(() => '---').join('|')}|---|---|---|`;
const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(new Date());
const md = [`结论：精选路线共 ${routes.length} 条（北岛 ${part('north').length}、南岛 ${part('south').length}），7 项字段全部核实的有 ${routes.filter(r => !r.verify.length).length} 条；应核字段 ${routes.length * 7} 个，已核 ${routes.reduce((n, r) => n + r.verifiedFields.length, 0)} 个，缺口 ${routes.reduce((n, r) => n + r.verify.length, 0)} 个。DOC 全量目录 ${doc.meta.count} 条（北 ${doc.meta.byIsland.north}、南 ${doc.meta.byIsland.south}、其他 ${doc.meta.byIsland.other}），用时为数据集原值、距离为空，全部标「待核实」。`,
  '', `# 数据状态 / Data status（生成于 ${date}，scripts/data-status.mjs）`, '',
  '## 计数方法', '',
  '- 数据文件：`outputs/route-catalogue.json`（与线上 `docs/app.js` 中的 `routes` 相同，由 `scripts/build-site.mjs` 写入）。',
  '- 每条路线核 7 项字段：时长 `time`、距离 `distance`、难度 `level`、季节与封闭 `season`、预订 `booking`、交通 `access`、安全提示 `safety`。',
  '- 一项字段算「已核」的条件：`fieldSources[字段]` 里有来源 URL、核查日期和官方原句，并且 `scripts/apply-facts.mjs` 在 `data/evidence/<id>.json`（当天抓回的官方页面摘录）中找到了这句原文。',
  '- 其余字段一律进 `verify[]`，页面显示「待核实 / To verify」，计为缺口。有编辑文字但没有官方原句的，也算缺口。',
  '- 「全核」= `verify[]` 为空（7/7）。',
  '- 南北岛按路线的 `island` 字段分；DOC 目录的南北岛按坐标规则分（见 `data/doc-tracks.json` 的 `meta.notes`）。',
  '- 复算：`node scripts/apply-facts.mjs && node scripts/data-status.mjs`。', '',
  '## 精选路线', '', head, row('全部', part('all')), row('北岛', part('north')), row('南岛', part('south')),
  ...['north', 'south'].flatMap(k => modes.map(m => row(`${k === 'north' ? '北岛' : '南岛'} · ${m}`, part(k).filter(r => r.mode === m)))), '',
  '## 逐条缺口', '', '| id | 岛 | 方式 | 已核 | 待核实字段 |', '|---|---|---|---|---|',
  ...routes.map(r => `| \`${r.id}\` | ${r.island === 'north' ? '北' : '南'} | ${r.mode} | ${r.verifiedFields.length}/7 | ${r.verify.map(f => ZH[f]).join('、') || '无'} |`), '',
  '## DOC 全量步道目录', '',
  `- 数据集：${doc.meta.dataset}（读取于 ${doc.meta.readAt}；DOC 已标停更，数据装载日期 ${doc.meta.dateLoadedToGIS}）。`,
  `- 条数：${doc.meta.count}（北岛 ${doc.meta.byIsland.north}、南岛 ${doc.meta.byIsland.south}、其他岛屿 ${doc.meta.byIsland.other}）。`,
  `- 有用时（数据集原值，未回页核对）：${doc.meta.withTime}；有距离：0（数据集不提供）；有中文名：0。三项都标「待核实」。`,
  `- 开闭状态：${doc.meta.withStatus} 条按位置匹配到 DOC Tracks 路段（读取于 ${doc.meta.tracksReadAt}，共 ${doc.meta.trackSegments.total} 段，其中关闭 ${doc.meta.trackSegments.closed} 段）；${doc.meta.closedWalks} 条含关闭路段。页面写明以 DOC 实时公告为准。`,
  `- 与精选路线对上的：${doc.meta.featuredLinked} 条。`, ''].join('\n');
await writeFile(join(root, 'outputs/DATA-STATUS.md'), md);
console.log(md.split('\n').slice(0, 1).join('\n')); console.log(md.split('\n').filter(l => l.startsWith('| 全部') || l.startsWith('| 北岛 |') || l.startsWith('| 南岛 |')).join('\n'));
