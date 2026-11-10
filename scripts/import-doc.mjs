// Import the Department of Conservation open data into data/doc-tracks.json (repeatable).
// Usage: node scripts/import-doc.mjs            (re-reads everything; link lookups are cached in data/cache/)
//        node scripts/import-doc.mjs --offline  (rebuild from data/cache/ only)
//
// Sources (both CC BY 4.0, Department of Conservation Te Papa Atawhai):
//  A. DOC Walking and Tramping Experiences: one record per DOC walk page. No longer maintained by DOC
//     (catalogue page marks it deprecated); known to omit Milford Track, Heaphy Track and others.
//  B. DOC Tracks: track assets by segment, still updated, with USER_STATUS (OPEN / CLSD).
// What this script will not do:
//  - It does not treat DOC's completionTime as a checked time. It is kept as timeRaw and shown as "to verify".
//  - It does not derive distance from line length (the line is a centre-line sketch). distance stays null.
//  - It does not translate names. zh stays null until a person fills it.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE = 'https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services';
const SRC = {
  experiences: {name: 'DOC Walking and Tramping Experiences – locations', rest: `${BASE}/DOC_Walking_Experiences/FeatureServer/0`, catalogue: 'https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-locations4'},
  experienceRoutes: {name: 'DOC Walking and Tramping Experiences – routes', rest: `${BASE}/DOC_Walking_Experiences/FeatureServer/1`, catalogue: 'https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-routes4'},
  tracks: {name: 'DOC Tracks', rest: `${BASE}/DOC_Tracks_Open_Data/FeatureServer/0`, catalogue: 'https://catalogue.data.govt.nz/dataset/doc-tracks8'}
};
const LICENCE = {name: 'Creative Commons Attribution 4.0 International', short: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Department of Conservation Te Papa Atawhai'};
const offline = process.argv.includes('--offline');
const cacheDir = join(root, 'data/cache'); await mkdir(cacheDir, {recursive: true});
const readCache = async name => JSON.parse(await readFile(join(cacheDir, name), 'utf8'));
const nzDate = d => new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland'}).format(d);
async function fetchAll(key, params) {
  const file = `arcgis-${key}.json`;
  if (offline) return readCache(file);
  const features = []; let offset = 0;
  for (;;) {
    const q = new URLSearchParams({where: '1=1', outSR: '4326', f: 'json', resultOffset: String(offset), resultRecordCount: '1000', orderByFields: 'OBJECTID', ...params});
    const res = await fetch(`${SRC[key].rest}/query?${q}`, {signal: AbortSignal.timeout(120000)});
    const data = await res.json();
    if (data.error) throw new Error(`${key}: ${JSON.stringify(data.error)}`);
    features.push(...data.features); offset += data.features.length;
    if (!data.exceededTransferLimit || !data.features.length) break;
  }
  const info = await (await fetch(`${SRC[key].rest}?f=json`)).json();
  const out = {readAt: new Date().toISOString(), dataLastEditDate: info.editingInfo?.dataLastEditDate || null, features};
  await writeFile(join(cacheDir, file), JSON.stringify(out));
  return out;
}
const exp = await fetchAll('experiences', {outFields: 'OBJECTID,name,introduction,difficulty,completionTime,walkingAndTrampingWebPage,dateLoadedToGIS'});
const expLines = await fetchAll('experienceRoutes', {outFields: 'OBJECTID,name,walkingAndTrampingWebPage', maxAllowableOffset: '0.0003', geometryPrecision: '5'});
const tracks = await fetchAll('tracks', {outFields: 'OBJECTID,TechObjectName,CharValue2,CharValue3,CharValue4,CharValue7', maxAllowableOffset: '0.0003', geometryPrecision: '5'});

// --- region: follow each DOC permalink once and read the region from the page address ---
const linkFile = join(cacheDir, 'doc-links.json');
const links = existsSync(linkFile) ? JSON.parse(await readFile(linkFile, 'utf8')) : {};
const guidOf = url => (url || '').match(/link\/([0-9a-f]{32})\.aspx/i)?.[1] || null;
if (!offline) {
  const todo = exp.features.map(f => f.attributes.walkingAndTrampingWebPage).filter(u => u && !links[u]);
  let done = 0;
  await Promise.all(Array.from({length: 6}, async () => {
    for (let url; (url = todo.pop());) {
      try { const res = await fetch(url, {method: 'HEAD', redirect: 'follow', headers: {'user-agent': 'Mozilla/5.0 (compatible; pounamu-atlas-import)'}, signal: AbortSignal.timeout(30000)}); links[url] = {final: res.url, status: res.status}; }
      catch (e) { links[url] = {final: null, status: 0}; }
      if (++done % 200 === 0) { console.log('links resolved', done); await writeFile(linkFile, JSON.stringify(links)); }
    }
  }));
  await writeFile(linkFile, JSON.stringify(links));
}
const REGION_NAME = {northland: 'Northland', auckland: 'Auckland', coromandel: 'Coromandel', waikato: 'Waikato', 'bay-of-plenty': 'Bay of Plenty', 'east-coast': 'East Coast', 'central-north-island': 'Central North Island', taranaki: 'Taranaki', 'manawatu-whanganui': 'Manawatū / Whanganui', 'hawkes-bay': "Hawke's Bay", wairarapa: 'Wairarapa', 'wellington-kapiti': 'Wellington / Kāpiti', 'nelson-tasman': 'Nelson / Tasman', marlborough: 'Marlborough', 'west-coast': 'West Coast', canterbury: 'Canterbury', otago: 'Otago', southland: 'Southland', fiordland: 'Fiordland', 'chatham-islands': 'Chatham Islands'};
const regionOf = final => { const m = (final || '').match(/places-to-go\/([^/]+)\//); return m ? m[1] : 'unknown'; };
// North/South split follows the review's coordinate rule; "other" = islands far from the two main islands.
const islandOf = (lon, lat) => (lon < 160 || lat > -33.5) ? 'other' : (lat > -40.4 || (lon >= 174.4 && lat > -41.7)) ? 'north' : 'south';
function bucketOf(t) {
  if (!t) return 'unknown';
  const s = t.toLowerCase();
  if (/day|night|overnight/.test(s)) return 'multi';
  const hr = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(?:hr|hour|h\b)/g)].map(m => +m[1]), min = [...s.matchAll(/(\d+)\s*min/g)].map(m => +m[1]);
  if (!hr.length && !min.length) return 'unknown';
  const hours = hr.length ? Math.max(...hr) + (min.length && hr.length === 1 ? Math.max(...min) / 60 : 0) : Math.max(...min) / 60;
  return hours < 1 ? 'short' : hours <= 4 ? 'half' : 'day';
}
// --- status: match DOC Tracks segments to each walk by location (the datasets share no key) ---
const CELL = 0.002;                                   // about 200 m
const cell = (x, y) => `${Math.round(x / CELL)}:${Math.round(y / CELL)}`;
const pathsOf = g => g?.paths || [];
const lineByUrl = new Map(expLines.features.map(f => [f.attributes.walkingAndTrampingWebPage, f]));
function densify(paths) {                             // points no more than half a cell apart
  const out = [];
  for (const p of paths) for (let i = 0; i < p.length; i++) {
    out.push(p[i]); if (i + 1 === p.length) break;
    const [x0, y0] = p[i], [x1, y1] = p[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (CELL / 2));
    for (let k = 1; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}
const segs = tracks.features.map(f => ({state: f.attributes.CharValue2, pts: densify(pathsOf(f.geometry))})).filter(s => s.pts.length);
const segIndex = new Map();
segs.forEach((s, i) => { for (const [x, y] of s.pts) { const k = cell(x, y); if (!segIndex.has(k)) segIndex.set(k, new Set()); segIndex.get(k).add(i); } });
function statusOf(lineFeature) {
  if (!lineFeature) return null;
  const pts = densify(pathsOf(lineFeature.geometry)); if (!pts.length) return null;
  const own = new Set(); for (const [x, y] of pts) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) own.add(`${Math.round(x / CELL) + dx}:${Math.round(y / CELL) + dy}`);
  const cand = new Set(); for (const k of own) for (const i of segIndex.get(k) || []) cand.add(i);
  let open = 0, closed = 0;
  for (const i of cand) { const s = segs[i]; const inside = s.pts.filter(([x, y]) => own.has(cell(x, y))).length / s.pts.length; if (inside >= 0.6) (s.state === 'CLSD' ? closed++ : s.state === 'OPEN' ? open++ : 0); }
  return open + closed ? {state: closed ? 'closed' : 'open', segments: open + closed, closed} : null;
}
// --- featured routes: link catalogue entries to DOC walks through the address the DOC page finally lands on ---
const catalogue = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
const strip = u => (u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').toLowerCase();
const featuredByUrl = new Map();
for (const r of catalogue) {
  const evFile = join(root, 'data/evidence', r.id + '.json');
  const urls = [r.url, ...(existsSync(evFile) ? JSON.parse(await readFile(evFile, 'utf8')).map(e => e.finalUrl) : [])];
  for (const u of urls) if (/doc\.govt\.nz/.test(u || '')) featuredByUrl.set(strip(u), r.id);
}
const readAt = nzDate(new Date(exp.readAt)), tracksReadAt = nzDate(new Date(tracks.readAt));
const out = [], routeLines = {}, routeStatus = {};
for (const f of exp.features) {
  const a = f.attributes, link = links[a.walkingAndTrampingWebPage] || {}, lon = +f.geometry.x.toFixed(5), lat = +f.geometry.y.toFixed(5);
  const region = regionOf(link.final), lineF = lineByUrl.get(a.walkingAndTrampingWebPage), status = statusOf(lineF), featured = featuredByUrl.get(strip(link.final)) || null;
  out.push({id: guidOf(a.walkingAndTrampingWebPage) || `objectid-${a.OBJECTID}`, objectId: a.OBJECTID, name: (a.name || '').trim(), zh: null, island: islandOf(lon, lat), region, regionName: REGION_NAME[region] || region,
    difficulty: a.difficulty || null, time: a.completionTime ? a.completionTime.trim() : null, bucket: bucketOf(a.completionTime), km: null,
    url: link.final || a.walkingAndTrampingWebPage, permalink: a.walkingAndTrampingWebPage, lat, lon, status, featured, verify: ['time', 'distance', 'zh']});
  if (featured && lineF) { routeLines[featured] = pathsOf(lineF.geometry).map(p => p.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])); if (status) routeStatus[featured] = {...status, readAt: tracksReadAt}; }
}
out.sort((x, y) => x.name.localeCompare(y.name, 'en'));
const count = k => out.filter(x => x.island === k).length;
const meta = {dataset: SRC.experiences.name, datasetUrl: SRC.experiences.catalogue, restUrl: SRC.experiences.rest, deprecatedBySource: true, readAt, dateLoadedToGIS: nzDate(new Date(exp.features[0].attributes.dateLoadedToGIS)),
  tracksDataset: SRC.tracks.name, tracksUrl: SRC.tracks.catalogue, tracksRestUrl: SRC.tracks.rest, tracksReadAt, tracksDataLastEdit: tracks.dataLastEditDate ? nzDate(new Date(tracks.dataLastEditDate)) : null,
  trackSegments: {total: tracks.features.length, open: tracks.features.filter(f => f.attributes.CharValue2 === 'OPEN').length, closed: tracks.features.filter(f => f.attributes.CharValue2 === 'CLSD').length},
  licence: LICENCE, attribution: `Sourced from the Department of Conservation Te Papa Atawhai, ${SRC.experiences.name} and ${SRC.tracks.name}, licensed for reuse under CC BY 4.0. Regrouped by Pounamu Atlas.`,
  count: out.length, byIsland: {north: count('north'), south: count('south'), other: count('other')}, withTime: out.filter(x => x.time).length, withStatus: out.filter(x => x.status).length, closedWalks: out.filter(x => x.status?.state === 'closed').length, featuredLinked: out.filter(x => x.featured).length,
  notes: ['time is the DOC dataset value (completionTime), not checked against the DOC page', 'km is null: the dataset has no distance and line length is not a walking distance', 'status is a location match against DOC Tracks segments (>=60% of a segment within about 200 m of the walk line); the live DOC notice takes precedence', 'island uses a coordinate rule: north if lat > -40.4, or lon >= 174.4 and lat > -41.7']};
const regions = Object.fromEntries([...new Set(out.map(x => x.region))].sort().map(k => [k, REGION_NAME[k] || k]));
const payload = JSON.stringify({meta, regions, tracks: out});
await writeFile(join(root, 'data/doc-tracks.json'), payload);
await writeFile(join(root, 'docs/data/doc-tracks.json'), payload);
await writeFile(join(root, 'data/route-lines.json'), JSON.stringify(routeLines));
await writeFile(join(root, 'docs/data/v3-route-data.js'), `/* generated by scripts/import-doc.mjs: DOC track lines and DOC Tracks status for featured routes (DOC, CC BY 4.0) */\nwindow.V3_ROUTE_LINES=${JSON.stringify(Object.fromEntries(Object.entries(routeLines).filter(([id]) => catalogue.find(r => r.id === id)?.addedIn === 'v3')))};\nwindow.V3_STATUS=${JSON.stringify(routeStatus)};\n`);
console.log(JSON.stringify({count: meta.count, byIsland: meta.byIsland, withTime: meta.withTime, withStatus: meta.withStatus, closedWalks: meta.closedWalks, featuredLinked: meta.featuredLinked, segments: meta.trackSegments, regions: Object.keys(regions).length, unknownRegion: out.filter(x => x.region === 'unknown').length}));
