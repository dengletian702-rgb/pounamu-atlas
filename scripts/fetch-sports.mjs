// Sports venues near cities and routes, from OpenStreetMap (ODbL). See docs/SPORTS-SPEC.md.
// Usage: node scripts/fetch-sports.mjs            fetch from Overpass, then build
//        node scripts/fetch-sports.mjs --offline  rebuild from data/sports/osm-nz-sports.json
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const offline = process.argv.includes('--offline');
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const UA = 'pounamu-atlas-sports-fetch/1.0 (static site data refresh; github.com/dengletian702-rgb/pounamu-atlas)';
const CITIES = [
  ['auckland', 'Auckland', '奥克兰', 'north', 10], ['wellington', 'Wellington', '惠灵顿', 'north', 10], ['christchurch', 'Christchurch', '基督城', 'south', 10],
  ['queenstown', 'Queenstown', '皇后镇', 'south', 8], ['dunedin', 'Dunedin', '但尼丁', 'south', 8], ['rotorua', 'Rotorua', '罗托鲁瓦', 'north', 8], ['taupo', 'Taupō', '陶波', 'north', 8], ['nelson', 'Nelson', '纳尔逊', 'south', 8],
  ['hamilton', 'Hamilton', '汉密尔顿', 'north', 8], ['tauranga', 'Tauranga', '陶朗加', 'north', 8], ['napier', 'Napier', '内皮尔', 'north', 8], ['new-plymouth', 'New Plymouth', '新普利茅斯', 'north', 8],
  ['palmerston-north', 'Palmerston North', '北帕默斯顿', 'north', 8], ['whangarei', 'Whangārei', '旺阿雷', 'north', 8], ['invercargill', 'Invercargill', '因弗卡吉尔', 'south', 8], ['wanaka', 'Wānaka', '瓦纳卡', 'south', 8]];
const BUFFER = {walk: 2, cycle: 3, drive: 5, transit: 5};
const QUERY = `[out:json][timeout:240];
area["ISO3166-1"="NZ"][admin_level=2]->.nz;
(
  nwr["leisure"="pitch"]["sport"~"tennis|basketball"](area.nz);
  nwr["leisure"="golf_course"](area.nz);
  nwr["leisure"="sports_centre"]["sport"~"tennis|basketball"](area.nz);
  nwr["club"="sport"]["sport"~"tennis|basketball"](area.nz);
  node["place"~"^(city|town)$"]["name"~"^(${CITIES.map(c => c[1]).join('|')})$"](area.nz);
);
out center tags;`;
async function overpass() {
  let last;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA}, body: 'data=' + encodeURIComponent(QUERY), signal: AbortSignal.timeout(300000)});
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return {endpoint: url, data: await res.json()};
    } catch (e) { last = e; console.error(String(e.message || e)); }
  }
  throw last;
}
const rawFile = join(root, 'data/sports/osm-nz-sports.json');
let raw;
if (offline) raw = JSON.parse(await readFile(rawFile, 'utf8'));
else { const r = await overpass(); raw = {fetchedAt: new Date().toISOString(), endpoint: r.endpoint, query: QUERY, osmBase: r.data.osm3s?.timestamp_osm_base || null, copyright: '© OpenStreetMap contributors, ODbL 1.0', elements: r.data.elements}; await writeFile(rawFile, JSON.stringify(raw)); }
const R = 6371, rad = d => d * Math.PI / 180;
const km = (a, b) => { const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const pos = e => e.type === 'node' ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null;
const dead = t => Object.keys(t).some(k => /^(disused|abandoned|proposed|demolished|razed|construction)(:|$)/.test(k));
const sports = t => (t.sport || '').split(/[;,]/).map(s => s.trim());
const addr = t => { const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '); return [street, t['addr:suburb'], t['addr:city']].filter(Boolean).join(', ') || null; };
const els = raw.elements.filter(e => e.tags && pos(e) && !dead(e.tags));
// --- city centres from OSM place nodes ---
const cities = CITIES.map(([id, name, zh, island, radiusKm]) => {
  const nodes = els.filter(e => e.type === 'node' && e.tags.place && e.tags.name === name);
  const pick = nodes.sort((a, b) => (+(b.tags.population || 0)) - (+(a.tags.population || 0)) || (a.tags.place === 'city' ? -1 : 1))[0];
  if (!pick) throw new Error('no OSM place node for ' + name);
  return {id, name, zh, island, radiusKm, centre: [pick.lat, pick.lon], centreSource: `node/${pick.id}`};
});
// --- venues ---
const venues = [];
for (const e of els.filter(e => e.tags.leisure === 'golf_course')) {
  const t = e.tags, p = pos(e);
  venues.push({osm: `${e.type}/${e.id}`, type: 'golf', name: t.name || null, lat: p[0], lon: p[1], addr: addr(t), access: t.access || null, lit: t.lit || null, holes: t.holes || (/^\d+$/.test(t['golf:course'] || '') ? t['golf:course'] : null) || null, surface: null, operator: t.operator || null, commons: t.wikimedia_commons || null, wikidata: t.wikidata || null});
}
const namers = els.filter(e => (e.tags.leisure === 'sports_centre' || e.tags.club === 'sport') && e.tags.name);
for (const sport of ['tennis', 'basketball']) {
  const pitches = els.filter(e => e.tags.leisure === 'pitch' && sports(e.tags).includes(sport)).map(e => ({e, p: pos(e)}));
  // single-link grouping at 120 m using a coarse grid
  const cellOf = p => `${Math.floor(p[0] / 0.002)}:${Math.floor(p[1] / 0.002)}`, grid = new Map();
  pitches.forEach((x, i) => { const k = cellOf(x.p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const parent = pitches.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  pitches.forEach((x, i) => { const [a, b] = cellOf(x.p).split(':').map(Number); for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) for (const j of grid.get(`${a + da}:${b + db}`) || []) if (j > i && km(x.p, pitches[j].p) <= 0.12) parent[find(j)] = find(i); });
  const groups = new Map(); pitches.forEach((x, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
  for (const members of groups.values()) {
    const lat = members.reduce((s, m) => s + m.p[0], 0) / members.length, lon = members.reduce((s, m) => s + m.p[1], 0) / members.length;
    const tagOf = k => members.map(m => m.e.tags[k]).find(Boolean) || null;
    let name = tagOf('name'), nameFrom = name ? 'pitch' : null;
    const near = namers.filter(n => sports(n.tags).includes(sport)).map(n => ({n, d: km([lat, lon], pos(n))})).filter(x => x.d <= 0.15).sort((a, b) => a.d - b.d)[0];
    if (!name && near) { name = near.n.tags.name; nameFrom = `${near.n.type}/${near.n.id}`; }
    const first = members.slice().sort((a, b) => a.e.id - b.e.id)[0].e, donor = near?.n.tags || {};
    venues.push({osm: `${first.type}/${first.id}`, type: sport, name, nameFrom, lat: +lat.toFixed(6), lon: +lon.toFixed(6), addr: members.map(m => addr(m.e.tags)).find(Boolean) || addr(donor), access: tagOf('access') || donor.access || null, lit: tagOf('lit'), courts: members.length, surface: tagOf('surface'), operator: tagOf('operator') || donor.operator || null, commons: tagOf('wikimedia_commons') || donor.wikimedia_commons || null, wikidata: tagOf('wikidata') || donor.wikidata || null});
  }
}
// --- photos: only when the OSM feature points at one ---
const imgCache = join(root, 'data/cache/sports-images.json');
const images = existsSync(imgCache) ? JSON.parse(await readFile(imgCache, 'utf8')) : {};
const strip = h => (h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const FREE = /^(CC0|Public domain|PD|CC BY(-SA)? \d(\.\d)?)/i;
async function commonsInfo(file) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&titles=${encodeURIComponent(file)}`;
  const page = Object.values((await (await fetch(api, {headers: {'user-agent': UA}})).json()).query.pages)[0];
  const ii = page.imageinfo?.[0]; if (!ii) return null;
  const m = ii.extmetadata || {};
  return {file: page.title, page: ii.descriptionurl, thumb: ii.thumburl, author: strip(m.Artist?.value) || 'Unknown', license: m.LicenseShortName?.value || '', licenseUrl: m.LicenseUrl?.value || ii.descriptionurl, title: strip(m.ObjectName?.value) || page.title};
}
const credits = [];
if (!offline) await mkdir(join(root, 'docs/assets/sports'), {recursive: true});
for (const v of venues) {
  let file = v.commons && /^File:/i.test(v.commons) ? v.commons : null;
  const key = file || (v.wikidata ? 'wd:' + v.wikidata : null);
  if (!key) continue;
  if (!(key in images) && !offline) {
    try {
      if (!file && v.wikidata) { const wd = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P18&entity=${v.wikidata}`, {headers: {'user-agent': UA}})).json(); const name = wd.claims?.P18?.[0]?.mainsnak?.datavalue?.value; file = name ? 'File:' + name : null; }
      const info = file ? await commonsInfo(file) : null;
      if (info && FREE.test(info.license) && info.thumb) {
        const local = `assets/sports/${v.osm.replace('/', '-')}.jpg`;
        await writeFile(join(root, 'docs', local), Buffer.from(await (await fetch(info.thumb, {headers: {'user-agent': UA}})).arrayBuffer()));
        images[key] = {...info, src: local};
      } else images[key] = null;
    } catch (e) { images[key] = null; }
    await new Promise(r => setTimeout(r, 150));
  }
  if (images[key]) { const i = images[key]; v.image = {src: i.src, page: i.page, author: i.author, license: i.license, licenseUrl: i.licenseUrl, title: i.title}; credits.push({venue: v.name || v.osm, osm: v.osm, ...i}); }
}
if (!offline) await writeFile(imgCache, JSON.stringify(images, null, 1));
for (const v of venues) { delete v.commons; delete v.wikidata; if (!v.image) v.image = null; }
// nearest first; venues tagged access=private go after the rest
const order = (a, b) => (a.access === 'private') - (b.access === 'private') || a.km - b.km;
// --- per city ---
const fetchedAt = raw.fetchedAt, attribution = '© OpenStreetMap contributors, Open Database Licence (ODbL) 1.0';
const index = {fetchedAt, osmBase: raw.osmBase, source: 'OpenStreetMap via Overpass API', licence: 'ODbL 1.0', licenceUrl: 'https://opendatacommons.org/licenses/odbl/', attribution, copyrightUrl: 'https://www.openstreetmap.org/copyright', national: {tennis: 0, golf: 0, basketball: 0}, cities: []};
for (const v of venues) index.national[v.type]++;
for (const c of cities) {
  const list = venues.map(v => ({...v, km: +km(c.centre, [v.lat, v.lon]).toFixed(2)})).filter(v => v.km <= c.radiusKm).sort(order);
  const counts = {}; list.forEach(v => counts[v.type] = (counts[v.type] || 0) + 1);
  await writeFile(join(root, 'docs/data/sports', c.id + '.json'), JSON.stringify({...c, fetchedAt, attribution, venues: list}));
  index.cities.push({...c, counts, total: list.length});
}
// --- per route ---
const sandbox = {}; vm.createContext(sandbox);
const mapSrc = await readFile(join(root, 'docs/route-maps.js'), 'utf8');
const start = mapSrc.indexOf('const routeMapData='), end = mapSrc.indexOf('\n', start);
vm.runInContext(mapSrc.slice(start, end).replace('const routeMapData=', 'routeMapData='), sandbox);
const docLines = existsSync(join(root, 'data/route-lines.json')) ? JSON.parse(await readFile(join(root, 'data/route-lines.json'), 'utf8')) : {};
const catalogue = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
function distToLine(p, line) {                       // km from point to polyline, equirectangular approximation
  let best = Infinity; const k = Math.cos(rad(p[0]));
  for (let i = 0; i + 1 < line.length; i++) {
    const ax = (line[i][1] - p[1]) * k, ay = line[i][0] - p[0], bx = (line[i + 1][1] - p[1]) * k, by = line[i + 1][0] - p[0];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy, t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  if (line.length === 1) best = Math.hypot((line[0][1] - p[1]) * k, line[0][0] - p[0]);
  return best * 111.195;
}
const routesNear = {};
for (const r of catalogue) {
  let lines = null, lineSource, lineSourceZh;
  const sketch = sandbox.routeMapData[r.id];
  if (docLines[r.id] && r.addedIn === 'v3') { lines = docLines[r.id].map(part => part.map(([lon, lat]) => [lat, lon])); lineSource = 'DOC track line, CC BY 4.0'; lineSourceZh = 'DOC 步道线，CC BY 4.0'; }
  else if (sketch) { const byId = Object.fromEntries(sketch.points.map(p => [p.id, [p.lat, p.lon]])); lines = sketch.legs.map(l => [byId[l.from], byId[l.to]]).filter(l => l[0] && l[1]); lineSource = 'straight lines between approximate sketch points'; lineSourceZh = '示意图各点之间的直线，位置为概略'; }
  if (!lines || !lines.length) continue;
  const bufferKm = BUFFER[r.mode];
  const list = venues.map(v => ({...v, km: +Math.min(...lines.map(l => distToLine([v.lat, v.lon], l))).toFixed(2)})).filter(v => v.km <= bufferKm).sort(order);
  routesNear[r.id] = {bufferKm, lineSource, lineSourceZh, total: list.length, venues: list.slice(0, 36)};
}
await writeFile(join(root, 'docs/data/sports/index.json'), JSON.stringify(index));
await writeFile(join(root, 'docs/data/sports/routes.json'), JSON.stringify(routesNear));
const md = ['# Sports venue photo credits', '', `Generated by scripts/fetch-sports.mjs on ${fetchedAt.slice(0, 10)}. A photo is used only when the OpenStreetMap feature links to it (wikimedia_commons tag or Wikidata P18) and its licence is CC0, public domain, CC BY or CC BY-SA. All other venues show an "Illustration only" placeholder.`, '', ...(credits.length ? credits.map(c => `- **${c.venue}** (OSM ${c.osm}): “${c.title}” by ${c.author}, ${c.license} (${c.licenseUrl}). Source: ${c.page}. Local file: docs/${c.src}. Change: resized to 640 px wide.`) : ['No venue in this extract links to a usable Wikimedia Commons photo, so every card uses a placeholder.']), ''];
await writeFile(join(root, 'outputs/SPORTS-IMAGE-CREDITS.md'), md.join('\n'));
const tag = k => venues.filter(v => v[k]).length;
console.log(JSON.stringify({elements: raw.elements.length, venues: venues.length, national: index.national, named: tag('name'), withAddr: tag('addr'), withAccess: tag('access'), withLit: tag('lit'), photos: credits.length, cities: index.cities.map(c => `${c.id}:${c.total}`).join(' '), routesWithVenues: Object.values(routesNear).filter(x => x.total).length + '/' + Object.keys(routesNear).length}));
