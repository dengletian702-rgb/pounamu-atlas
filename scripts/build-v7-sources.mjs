// v7: gather every source, photo credit, licence and "to verify" item on the site into one file,
// docs/data/v7-sources.json, which sources.html reads. Pages no longer print these inline.
// Usage: node scripts/build-v7-sources.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docs = join(root, 'docs');
const require = createRequire(import.meta.url);

const app = await readFile(join(docs, 'app.js'), 'utf8');
const lineOf = prefix => {
  const line = app.split('\n').find(l => l.startsWith(prefix));
  if (!line) throw new Error('missing line in app.js: ' + prefix);
  return JSON.parse(line.slice(prefix.length).replace(/;\s*$/, ''));
};
const routes = lineOf('const routes=');
const photos = lineOf('const photoLibrary=');
const routePhotoIds = Object.fromEntries(routes.map(r => [r.id, r.photoId || 'v3-placeholder']));

const FIELD = {
  time: ['Time', '用时'], distance: ['Distance', '路程'], level: ['Grade', '难度'], season: ['Season', '季节'],
  booking: ['Booking', '预订'], access: ['Getting there', '交通'], safety: ['Safety', '安全'], food: ['Food and water', '吃饭与补水'],
  gear: ['Gear', '装备'], ends: ['Start and finish', '起终点'], pacing: ['Pacing', '节奏'], timeline: ['Suggested day', '建议行程']
};
const MODE = {walk: ['Walk', '徒步'], cycle: ['Cycle', '骑行'], drive: ['Drive', '自驾'], transit: ['Public transport', '公共交通'], paddle: ['Paddle', '划船']};

const routeEntries = routes.map(r => {
  const photo = photos[routePhotoIds[r.id]];
  return {
    id: r.id,
    name: [r.name, r.zh || r.name],
    island: r.island,
    mode: MODE[r.mode] || [r.mode, r.mode],
    region: r.region,
    checkedAt: r.checkedAt || null,
    sources: (r.sources || []).map(s => ({label: [s.label, s.labelZh || s.label], url: s.url, role: s.role || ''})),
    verify: (r.verify || []).map(k => ({key: k, label: FIELD[k] || [k, k]})),
    photo: photo && !photo.placeholder ? {author: photo.author, license: photo.license, licenseUrl: photo.licenseUrl, source: photo.source, place: photo.place} : null
  };
});

const catalog = JSON.parse(await readFile(join(docs, 'data/v4-catalog.json'), 'utf8'));
const templates = (catalog.templates || []).map(t => {
  const urls = new Map();
  const toVerify = [];
  for (const d of t.days || []) {
    if (d.source_url && !urls.has(d.source_url)) urls.set(d.source_url, d.est_date || '');
    if (d.rowVerify || d.nameVerify) toVerify.push({day: d.day, from: d.from, to: d.to});
  }
  return {
    id: t.id,
    name: [t.title_en, t.title_zh],
    sources: [...urls].map(([url, date]) => ({url, date, kind: /osrm/i.test(url) ? 'osrm' : /newzealand\.com/i.test(url) ? 'tnz' : 'other'})),
    toVerify
  };
});

const budget = require(join(docs, 'budget.js'));
const budgetSources = Object.values(budget.SOURCES || {}).map(s => ({label: [s.en, s.zh], url: s.url, date: s.checkedAt}));

const planner = await readFile(join(docs, 'p10-planner.js'), 'utf8');
const roadMatch = planner.match(/const ROAD_SOURCES = (\[[\s\S]*?\]);/);
const roadSources = roadMatch ? Function('return ' + roadMatch[1])() : [];

const bandPhotos = [
  {where: ['Home · Lake Wānaka band', '首页 · 瓦纳卡湖横幅'], author: 'Sky_xe', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Wanaka,_New_Zealand,_view_2.jpg'},
  {where: ['Home · Lake Taupō band', '首页 · 陶波湖横幅'], author: 'David Broad', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://commons.wikimedia.org/wiki/File:Lake_Taupo_from_Kinloch.jpg'},
  {where: ['Home · hero', '首页 · 首屏'], author: 'AI-generated image of the Southern Alps, not a real place', license: 'Pounamu Atlas', licenseUrl: '', source: ''}
];

const licences = [
  {label: ['Code', '代码'], text: ['MIT licence.', 'MIT 许可。']},
  {label: ['Our text and route notes', '本站自写文字与线路说明'], text: ['© Pounamu Atlas, CC BY 4.0, unless marked otherwise.', '除另有标注外 © 绿石之地，CC BY 4.0。'], url: 'https://creativecommons.org/licenses/by/4.0/'},
  {label: ['OpenStreetMap coordinates and OSRM drive times', 'OpenStreetMap 坐标与 OSRM 车程'], text: ['© OpenStreetMap contributors, ODbL.', '© OpenStreetMap 贡献者，ODbL。'], url: 'https://www.openstreetmap.org/copyright'},
  {label: ['DOC track information', '新西兰保护部步道信息'], text: ['Department of Conservation (NZ), CC BY 4.0.', 'Department of Conservation (NZ)，CC BY 4.0。'], url: 'https://www.doc.govt.nz/about-us/our-policies-and-profile/copyright-and-disclaimer/'},
  {label: ['LINZ data', 'LINZ 数据'], text: ['LINZ Data Service, reused under CC BY 4.0.', 'LINZ Data Service，按 CC BY 4.0 再利用。'], url: 'https://data.linz.govt.nz/'},
  {label: ['Natural Earth', 'Natural Earth'], text: ['Coastline and island shapes, public domain.', '海岸线与岛屿轮廓，公有领域。'], url: 'https://www.naturalearthdata.com/'},
  {label: ['newzealand.com itineraries', 'newzealand.com 行程'], text: ['© Tourism New Zealand. Ideas only, linked not copied.', '© Tourism New Zealand。只参考思路并链接，不转载。'], url: 'https://www.newzealand.com/'},
  {label: ['Google Maps', '谷歌地图'], text: ['Embedded maps and directions © Google. Not for live navigation in the backcountry.', '嵌入的地图与路线 © Google。野外请勿当作实时导航。'], url: 'https://www.google.com/intl/en/help/terms_maps/'}
];

const out = {
  about: 'Built by scripts/build-v7-sources.mjs from docs/app.js, docs/data/v4-catalog.json, docs/budget.js and docs/p10-planner.js.',
  builtAt: new Date().toISOString().slice(0, 10),
  counts: {
    routes: routeEntries.length,
    sources: routeEntries.reduce((n, r) => n + r.sources.length, 0),
    toVerify: routeEntries.reduce((n, r) => n + r.verify.length, 0),
    photos: routeEntries.filter(r => r.photo).length + bandPhotos.length
  },
  routes: routeEntries,
  templates,
  planner: roadSources,
  budget: budgetSources,
  bandPhotos,
  licences
};
await writeFile(join(docs, 'data/v7-sources.json'), JSON.stringify(out));
console.log(`v7 sources: ${out.counts.routes} routes, ${out.counts.sources} sources, ${out.counts.toVerify} to-verify fields, ${templates.length} templates.`);
