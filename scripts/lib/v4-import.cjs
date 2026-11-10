'use strict';
// Import routes-v2.csv and places-v2.csv (UTF-8 BOM). Join days to towns by place_id only.
const fs = require('node:fs');
const path = require('node:path');

const TNZ_REGIONS = [
  { id: 'northland-bay-of-islands', island: 'north', en: 'Northland & Bay of Islands', zh: '北地与岛屿湾' },
  { id: 'auckland', island: 'north', en: 'Auckland', zh: '奥克兰' },
  { id: 'coromandel', island: 'north', en: 'The Coromandel', zh: '科罗曼德' },
  { id: 'hamilton-waikato', island: 'north', en: 'Hamilton - Waikato', zh: '汉密尔顿－怀卡托' },
  { id: 'bay-of-plenty', island: 'north', en: 'Bay of Plenty', zh: '丰盛湾' },
  { id: 'tairawhiti-gisborne', island: 'north', en: 'Tairāwhiti Gisborne', zh: '泰拉维蒂／吉斯伯恩' },
  { id: 'rotorua', island: 'north', en: 'Rotorua', zh: '罗托鲁瓦' },
  { id: 'taupo', island: 'north', en: 'Taupō', zh: '陶波' },
  { id: 'ruapehu', island: 'north', en: 'Ruapehu', zh: '鲁阿佩胡' },
  { id: 'hawkes-bay', island: 'north', en: "Hawke's Bay", zh: '霍克斯湾' },
  { id: 'taranaki', island: 'north', en: 'Taranaki', zh: '塔拉纳基' },
  { id: 'whanganui', island: 'north', en: 'Whanganui', zh: '旺格努伊' },
  { id: 'manawatu', island: 'north', en: 'Manawatū', zh: '马纳瓦图' },
  { id: 'wairarapa', island: 'north', en: 'Wairarapa', zh: '怀拉拉帕' },
  { id: 'wellington', island: 'north', en: 'Wellington', zh: '惠灵顿' },
  { id: 'nelson-tasman', island: 'south', en: 'Nelson-Tasman', zh: '纳尔逊－塔斯曼' },
  { id: 'marlborough', island: 'south', en: 'Marlborough', zh: '马尔堡' },
  { id: 'christchurch-canterbury', island: 'south', en: 'Christchurch - Canterbury', zh: '基督城－坎特伯雷' },
  { id: 'west-coast', island: 'south', en: 'West Coast', zh: '西海岸' },
  { id: 'wanaka', island: 'south', en: 'Wānaka', zh: '瓦纳卡' },
  { id: 'queenstown', island: 'south', en: 'Queenstown', zh: '皇后镇' },
  { id: 'central-otago', island: 'south', en: 'Central Otago', zh: '中奥塔哥' },
  { id: 'dunedin', island: 'south', en: 'Dunedin', zh: '但尼丁' },
  { id: 'clutha', island: 'south', en: 'Clutha', zh: '克卢萨' },
  { id: 'fiordland', island: 'south', en: 'Fiordland', zh: '峡湾' },
  { id: 'southland', island: 'south', en: 'Southland', zh: '南地' },
];

// Atlas `region` string → TNZ region_id. Waitaki is intentionally unmapped.
const REGION_MAP = {
  Northland: { id: 'northland-bay-of-islands', basis: 'UI-IA: Northland & Bay of Islands' },
  Auckland: { id: 'auckland', basis: 'UI-IA Auckland' },
  Coromandel: { id: 'coromandel', basis: 'UI-IA The Coromandel' },
  Waikato: { id: 'hamilton-waikato', basis: 'UI-IA Hamilton - Waikato is the TNZ region for this area' },
  'Bay of Plenty': { id: 'bay-of-plenty', basis: 'UI-IA Bay of Plenty' },
  'Gisborne (Tairāwhiti)': { id: 'tairawhiti-gisborne', basis: 'UI-IA Tairāwhiti Gisborne' },
  Rotorua: { id: 'rotorua', basis: 'UI-IA Rotorua' },
  'Lake Taupō': { id: 'taupo', basis: 'UI-IA Taupō; Atlas names Lake Taupō' },
  Ruapehu: { id: 'ruapehu', basis: 'UI-IA Ruapehu' },
  "Hawke's Bay": { id: 'hawkes-bay', basis: "UI-IA Hawke's Bay" },
  Taranaki: { id: 'taranaki', basis: 'UI-IA Taranaki' },
  Whanganui: { id: 'whanganui', basis: 'UI-IA Whanganui' },
  'Manawatū': { id: 'manawatu', basis: 'UI-IA Manawatū' },
  Wairarapa: { id: 'wairarapa', basis: 'UI-IA Wairarapa' },
  Wellington: { id: 'wellington', basis: 'UI-IA Wellington' },
  'Nelson Tasman': { id: 'nelson-tasman', basis: 'UI-IA Nelson-Tasman' },
  Marlborough: { id: 'marlborough', basis: 'UI-IA Marlborough' },
  'Christchurch & Canterbury': { id: 'christchurch-canterbury', basis: 'UI-IA Christchurch - Canterbury' },
  'Kaikōura': { id: 'christchurch-canterbury', basis: '团队定：凯库拉挂在基督城－坎特伯雷下' },
  'West Coast': { id: 'west-coast', basis: 'UI-IA West Coast' },
  'Lake Wānaka': { id: 'wanaka', basis: 'UI-IA region_id wanaka; TNZ lists Wānaka apart from Queenstown' },
  Queenstown: { id: 'queenstown', basis: 'UI-IA Queenstown' },
  'Central Otago': { id: 'central-otago', basis: 'UI-IA Central Otago' },
  Dunedin: { id: 'dunedin', basis: 'UI-IA Dunedin' },
  Clutha: { id: 'clutha', basis: 'UI-IA Clutha' },
  Fiordland: { id: 'fiordland', basis: 'UI-IA Fiordland' },
  Southland: { id: 'southland', basis: 'UI-IA Southland; 团队定 Stewart Island stays in Southland' },
  Mackenzie: { id: 'christchurch-canterbury', basis: '团队定：麦肯齐与奥拉基挂在基督城－坎特伯雷下。Atlas 写法 Mackenzie 不是 TNZ region_id。' },
  // Ōamaru and the other Waitaki rows sit under Dunedin. The town row keeps a district note.
  Waitaki: { id: 'dunedin', basis: 'Follow-up: file Waitaki places under Dunedin and label the district.', district: 'waitaki' },
};

const ZH_ALIASES = [
  ['特卡波湖', '特卡波'],
  ['蒂卡普湖', '特卡波'],
  ['蒂卡普', '特卡波'],
  ['达尼丁', '但尼丁'],
  ['罗托鲁阿', '罗托鲁瓦'],
  ['纳皮尔', '内皮尔'],
];

function aliasZh(value) {
  let text = String(value ?? '');
  for (const [from, to] of ZH_ALIASES) text = text.split(from).join(to);
  return text;
}

// 乐天 11/11 04:34 定（经 Keystone 转）: SI-09B primary, SI-09A alternate, SI-07A primary. Jev stays hidden.
const TEMPLATE_META = {
  'SI-09B': {
    role: 'primary-9',
    activity: 'drive',
    oneWay: false,
    title_zh: '9 天自驾环南岛',
    title_en: '9-day South Island self-drive',
    blurb_zh: '9 天自驾。过夜顺序：基督城、格雷茅斯、福克斯冰川、瓦纳卡、皇后镇、米尔福德峡湾，再经库克山村回到基督城。特卡波在返回基督城那天经过。',
    blurb_en: 'A 9-day drive. Overnights: Christchurch, Greymouth, Fox Glacier, Wānaka, Queenstown, Milford Sound, then Aoraki/Mount Cook Village and back to Christchurch. Tekapo is passed on the return day.',
    aliases: ['9 天自驾环南岛', '9天自驾环南岛', '环南岛9天', '环南岛 9 天', '9-day south island self-drive', '9 day south island self-drive', 'south island self-drive'],
  },
  'SI-09A': {
    role: 'alternate-9',
    activity: 'drive',
    oneWay: false,
    title_zh: '9 天南岛东线（含斯图尔特岛渡轮）',
    title_en: '9-day South Island east route (with Stewart Island ferry)',
    blurb_zh: '9 天。过夜点含奥马鲁、但尼丁、因弗卡吉尔、斯图尔特岛、蒂阿瑙、皇后镇和库克山村。去斯图尔特岛那天含渡轮，渡轮时间不记成驾车。',
    blurb_en: '9 days. Overnights include Ōamaru, Dunedin, Invercargill, Stewart Island, Te Anau, Queenstown and Aoraki/Mount Cook Village. The Stewart Island day includes a ferry, which is not counted as driving.',
    aliases: ['9天东线', 'stewart island 9', '斯图尔特岛 9'],
  },
  'SI-07A': {
    role: 'primary-7',
    activity: 'drive',
    oneWay: true,
    title_zh: '7 天南岛自驾（基督城至皇后镇）',
    title_en: '7-day South Island drive (Christchurch to Queenstown)',
    blurb_zh: '7 天，从基督城开到皇后镇，可能要在另一座城镇还车。',
    blurb_en: '7 days from Christchurch to Queenstown. You may return the car in a different town.',
    aliases: ['7 天南岛', '7-day south island', 'christchurch to queenstown'],
  },
  'SI-07B': {
    role: 'alternate-7',
    activity: 'drive',
    oneWay: false,
    title_zh: '7 天南岛往返（皇后镇方向）',
    title_en: '7-day South Island out-and-back (Queenstown)',
    blurb_zh: '7 天备选。从皇后镇一带往返蒂阿瑙、瓦纳卡、库克山和特卡波。',
    blurb_en: 'Alternate 7-day route, out and back through Te Anau, Wānaka, Aoraki/Mount Cook and Tekapo.',
    aliases: ['7天备选', '7-day alternate'],
  },
  'SI-14A': {
    role: 'template',
    activity: 'drive',
    oneWay: false,
    title_zh: '14 天南岛西线',
    title_en: '14-day South Island west route',
    blurb_zh: '14 天，沿西海岸一侧过夜。',
    blurb_en: '14 days of overnights along the west side of the South Island.',
    aliases: ['14 天南岛', '14-day south'],
  },
  'SI-14B': {
    role: 'template',
    activity: 'drive',
    oneWay: false,
    title_zh: '14 天南岛东线往返',
    title_en: '14-day South Island east loop',
    blurb_zh: '14 天，沿东侧往返。',
    blurb_en: '14 days out and back along the east side of the South Island.',
    aliases: ['14天东线'],
  },
  'NI-01': {
    role: 'template',
    activity: 'drive',
    oneWay: true,
    title_zh: '5 天北岛中轴',
    title_en: '5-day North Island spine',
    blurb_zh: '5 天，经怀托摩、罗托鲁瓦、陶波、北帕默斯顿到惠灵顿。',
    blurb_en: '5 days through Waitomo, Rotorua, Taupō and Palmerston North to Wellington.',
    aliases: ['北岛中轴', 'north island spine', 'auckland rotorua'],
  },
  'NI-02': {
    role: 'template',
    activity: 'drive',
    oneWay: true,
    title_zh: '6 天北地',
    title_en: '6-day Northland',
    blurb_zh: '6 天，经奥波诺尼、凯塔亚、派希亚、旺格雷到奥克兰。',
    blurb_en: '6 days through Opononi, Kaitaia, Paihia and Whangārei to Auckland.',
    aliases: ['北地', 'northland drive'],
  },
  'NI-03': {
    role: 'template',
    activity: 'drive',
    oneWay: false,
    title_zh: '4 天科罗曼德',
    title_en: '4-day Coromandel',
    blurb_zh: '4 天，经科罗曼德镇、惠蒂昂格、旺格玛塔回到奥克兰。',
    blurb_en: '4 days through Coromandel Town, Whitianga and Whangamatā, back to Auckland.',
    aliases: ['科罗曼德', 'coromandel'],
  },
  'NI-04': {
    role: 'template',
    activity: 'drive',
    oneWay: true,
    title_zh: '3 天忘却世界公路',
    title_en: '3-day Forgotten World Highway',
    blurb_zh: '3 天，经陶马鲁努依、旺格摩摩纳到斯特拉福德。',
    blurb_en: '3 days through Taumarunui and Whangamōmona to Stratford.',
    aliases: ['忘却世界', 'forgotten world'],
  },
};

function stripBom(text) {
  return String(text).replace(/^\uFEFF/, '');
}

function parseCsv(text) {
  const src = stripBom(text);
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      cell += c; i += 1; continue;
    }
    if (c === '"') { inQuotes = true; i += 1; continue; }
    if (c === ',') { row.push(cell); cell = ''; i += 1; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = []; i += 1; continue;
    }
    cell += c; i += 1;
  }
  if (cell.length || row.length) { row.push(cell); if (row.some(v => v !== '')) rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx] == null ? '' : r[idx]; });
    return obj;
  });
}

function num(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRegion(name) {
  if (Object.prototype.hasOwnProperty.call(REGION_MAP, name)) return REGION_MAP[name];
  return { id: null, basis: 'Atlas region 不在对照表中，不猜测。', uncertain: true, unknown: true };
}

function importPlaces(text) {
  const rows = parseCsv(text);
  const places = rows.map(r => {
    const mapped = mapRegion(r.region);
    return {
      place_id: r.place_id,
      island: r.island === 'north' || r.island === 'south' ? r.island : '',
      atlas_region: r.region,
      region_id: mapped.id,
      region_basis: mapped.basis,
      region_uncertain: Boolean(mapped.uncertain || mapped.unknown),
      district_zh: mapped.district === 'waitaki' ? '怀塔基区' : '',
      district_en: mapped.district === 'waitaki' ? 'Waitaki District' : '',
      town: r.town,
      name_en: r.name_en,
      name_zh: aliasZh(r.name_zh),
      type: r.type,
      lat: num(r.lat),
      lon: num(r.lon),
      suggested_stay: r.suggested_stay,
      season: r.season,
      source_url: r.source_url,
      notes: aliasZh(r.notes),
      summary_en: r.summary_en,
      summary_zh: aliasZh(r.summary_zh),
      summary_source_url: r.summary_source_url,
      summary_accessed: r.summary_accessed,
      verify: /待核|待核实/.test(r.notes || '') || /†/.test(`${r.name_en}${r.name_zh}${r.notes}`),
    };
  });
  return { rows: places, count: places.length };
}

function labelDrive(cell, date) {
  const parts = String(cell || '').split('；').map(s => s.trim()).filter(Boolean);
  const used = parts.length ? parts : [String(cell || '').trim()].filter(Boolean);
  return used.map(text => {
    let kind = 'planning';
    if (/OSRM/i.test(text)) kind = 'osrm';
    else if (/NZTA/i.test(text)) kind = 'nzta';
    else if (/官方/.test(text)) kind = 'official';
    return { text, kind, hasAbout: /约|about/i.test(text), date: date || '' };
  });
}

function importRoutes(text, placesById) {
  const rows = parseCsv(text);
  const groups = new Map();
  const missing = [];
  for (const r of rows) {
    if (!groups.has(r.route_id)) groups.set(r.route_id, []);
    const place = placesById ? placesById.get(r.place_id) : null;
    if (placesById && !place) missing.push({ route_id: r.route_id, day: r.day, place_id: r.place_id });
    groups.get(r.route_id).push({
      route_id: r.route_id,
      island: r.island,
      days: Number(r.days),
      day: Number(r.day),
      from: aliasZh(r.from),
      to: aliasZh(r.to),
      via: aliasZh(r.via),
      km: r.km,
      drive_time_est: r.drive_time_est,
      est_date: r.est_date,
      source_url: r.source_url,
      notes: aliasZh(r.notes),
      place_id: r.place_id,
      parts: labelDrive(r.drive_time_est, r.est_date),
      ferry: /渡轮|ferry/i.test(`${r.notes} ${r.drive_time_est}`),
      nameVerify: /†/.test(`${r.from}${r.to}${r.via}`),
      rowVerify: /待核/.test(r.notes || ''),
    });
  }
  const templates = [];
  for (const [id, days] of groups) {
    days.sort((a, b) => a.day - b.day);
    const meta = TEMPLATE_META[id] || {
      role: 'template', activity: 'drive', oneWay: false,
      title_zh: id, title_en: id,
      blurb_zh: '按表中的过夜顺序排列。',
      blurb_en: 'Overnights follow the order in the route table.',
      aliases: [],
    };
    const nzSources = [];
    const seenNz = new Set();
    for (const day of days) {
      const url = day.source_url || '';
      if (!/newzealand\.com/i.test(url) || seenNz.has(url)) continue;
      seenNz.add(url);
      nzSources.push({ url, accessed: day.est_date || '' });
    }
    const nz = nzSources[0] ? nzSources[0].url : '';
    const accessed = nzSources[0] ? nzSources[0].accessed : '';
    templates.push({ id, ...meta, day_count: days.length, stated_days: days[0] ? days[0].days : days.length, days, nz_source_url: nz, nz_accessed: accessed, nz_sources: nzSources });
  }
  templates.sort((a, b) => a.id.localeCompare(b.id));
  return { rows, count: rows.length, templates, missing };
}

function fold(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/†/g, '').replace(/\s+/g, ' ').trim();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

function searchTracks(tracks, query, towns) {
  return require('../../docs/v4-match.js').searchTracks(tracks, query, towns);
}

function daysBucket(days, bucket) {
  if (!bucket || bucket === 'any') return true;
  const n = Number(days);
  if (!Number.isFinite(n)) return false;
  if (bucket === '1-3') return n >= 1 && n <= 3;
  if (bucket === '4-6') return n >= 4 && n <= 6;
  if (bucket === '7-10') return n >= 7 && n <= 10;
  if (bucket === '11-14') return n >= 11 && n <= 14;
  if (bucket === '15+') return n >= 15;
  const exact = Number(bucket);
  if (Number.isFinite(exact) && String(bucket).trim() !== '') return n === exact;
  return true;
}

function searchTemplates(templates, query, filters) {
  const q = fold(query);
  const normalized = fold(query).replace(/-/g, ' ');
  const nine = /9\s*天.*环南岛|环南岛.*9/.test(query || '') || normalized.includes('9 day south island self drive');
  const seven = /7\s*天|7\s*-?\s*day/.test(query || '') && /南岛|south island/i.test(query || '');
  return templates.filter(t => {
    if (filters && filters.activity && filters.activity !== 'all' && t.activity !== filters.activity) return false;
    if (filters && filters.days && !daysBucket(t.stated_days || t.day_count, filters.days)) return false;
    if (filters && filters.island && filters.island !== 'all') {
      const south = (t.id || '').startsWith('SI');
      if (filters.island === 'south' && !south) return false;
      if (filters.island === 'north' && south) return false;
    }
    if (!q) return true;
    if (nine && (t.id === 'SI-09B' || t.id === 'SI-09A')) return true;
    if (seven && (t.id === 'SI-07A' || t.id === 'SI-07B')) return true;
    const blob = fold([t.id, t.title_zh, t.title_en, t.blurb_zh, t.blurb_en, ...(t.aliases || [])].join(' '));
    return blob.includes(q);
  }).sort((a, b) => {
    const rank = id => (id === 'SI-09B' ? 0 : id === 'SI-09A' ? 1 : id === 'SI-07A' ? 2 : id === 'SI-07B' ? 3 : 9);
    if (nine) return rank(a.id) - rank(b.id);
    if (seven) return (a.id === 'SI-07A' ? 0 : 1) - (b.id === 'SI-07A' ? 0 : 1);
    return String(a.id).localeCompare(String(b.id));
  });
}

function writeSiteData(root) {
  const placesText = fs.readFileSync(path.join(root, 'inputs/atlas/places-v2.csv'), 'utf8');
  const routesText = fs.readFileSync(path.join(root, 'inputs/meridian/routes-v2.csv'), 'utf8');
  const places = importPlaces(placesText);
  const byId = new Map(places.rows.map(p => [p.place_id, p]));
  const routes = importRoutes(routesText, byId);
  const outDir = path.join(root, 'docs/data');
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    generatedFrom: ['inputs/atlas/places-v2.csv', 'inputs/meridian/routes-v2.csv'],
    placeCount: places.count,
    routeRowCount: routes.count,
    templateCount: routes.templates.length,
    missingPlaceIds: routes.missing,
    regions: TNZ_REGIONS,
    places: places.rows,
    templates: routes.templates,
  };
  fs.writeFileSync(path.join(outDir, 'v4-catalog.json'), JSON.stringify(payload));
  return payload;
}

module.exports = {
  TNZ_REGIONS, REGION_MAP, TEMPLATE_META,
  stripBom, parseCsv, importPlaces, importRoutes, labelDrive,
  searchTracks, searchTemplates, daysBucket, fold, haversineKm,
  writeSiteData, mapRegion, aliasZh, ZH_ALIASES,
};
