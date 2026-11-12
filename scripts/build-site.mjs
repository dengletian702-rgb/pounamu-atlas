// Rebuild the published site data from the catalogue, then sync the second copy and asset versions.
// Usage: node scripts/build-site.mjs
import {createRequire} from 'node:module';
import {readFile, writeFile, cp} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const v4 = require('./lib/v4-import.cjs');
const v4data = v4.writeSiteData(root);
console.log(`Imported v4 places ${v4data.placeCount}, route rows ${v4data.routeRowCount}, missing place ids ${v4data.missingPlaceIds.length}.`);
const routes = JSON.parse(await readFile(join(root, 'outputs/route-catalogue.json'), 'utf8'));
const appPath = join(root, 'docs/app.js');
const lines = (await readFile(appPath, 'utf8')).split('\n');
const at = prefix => { const i = lines.findIndex(l => l.startsWith(prefix)); if (i < 0) throw new Error('missing line: ' + prefix); return i; };
// official closures (data/closures.json): each quote must be in the fetched evidence, or the build stops (James review 4)
const {closures} = JSON.parse(await readFile(join(root, 'data/closures.json'), 'utf8'));
for (const c of closures) {
  const r = routes.find(x => x.id === c.route); if (!r) throw new Error('closure for unknown route: ' + c.route);
  const ev = await readFile(join(root, 'data/evidence', c.route + '.json'), 'utf8');
  if (!ev.includes(JSON.stringify(c.quote).slice(1, -1))) throw new Error('closure quote not found in evidence: ' + c.route);
  const {route, ...rest} = c; (r.closures ||= []).push(rest);
}
lines[at('const routes=[')] = 'const routes=' + JSON.stringify(routes) + ';';
// photo library: add the neutral placeholder used when a route has no licensed photo yet
const libLine = at('const photoLibrary=');
const library = JSON.parse(lines[libLine].slice('const photoLibrary='.length).replace(/;\s*$/, ''));
const additions = JSON.parse(await readFile(join(root, 'data/photo-additions.json'), 'utf8'));
for (const [id, p] of Object.entries(additions)) { const {route, title, checkedAt, ...photo} = p; library[id] = photo; const r = routes.find(x => x.id === route); if (r && !r.photoId) r.photoId = id; }
library['v3-placeholder'] = {src: 'assets/route-placeholder.svg', place: ['Illustration only: no licensed photo of this route yet', '仅为示意图：这条线路暂无可授权使用的照片'], author: 'Pounamu Atlas', source: 'CONTENT-LICENSE.md', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', placeholder: true};
for (const p of Object.values(library)) if (/^http:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0/.test(p.licenseUrl)) p.licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
lines[libLine] = 'const photoLibrary=' + JSON.stringify(library) + ';';
const missing = routes.filter(r => r.photoId && !library[r.photoId]).map(r => r.id);
if (missing.length) throw new Error('unknown photoId on: ' + missing.join(', '));
lines[at('const routePhotos=')] = 'const routePhotos=Object.fromEntries(Object.entries(' + JSON.stringify(Object.fromEntries(routes.map(r => [r.id, r.photoId || 'v3-placeholder']))) + ').map(([id,p])=>[id,photoLibrary[p]]));';
await writeFile(appPath, v4.aliasZh(lines.join('\n')));
// route sketches: their `sources` are always copied from the catalogue, so the two can never drift apart (James review 1-2)
const mapPath = join(root, 'docs/route-maps.js');
const mapLines = (await readFile(mapPath, 'utf8')).split('\n');
const mi = mapLines.findIndex(l => l.startsWith('const routeMapData='));
if (mi < 0) throw new Error('missing routeMapData line');
const mapData = JSON.parse(mapLines[mi].slice('const routeMapData='.length).replace(/;\s*$/, ''));
for (const [id, d] of Object.entries(mapData)) { const r = routes.find(x => x.id === id); if (!r) throw new Error('sketch without a catalogue route: ' + id); d.sources = r.sources.map(({label, url}) => ({label, url})); }
mapLines[mi] = 'const routeMapData=' + JSON.stringify(mapData) + ';';
// routes with no sketch: the national atlas draws them from their DOC track line (data/route-lines.json, DOC open
// data, CC BY 4.0), its longest section thinned to at most 30 points; a route with neither is listed under the atlas as "no map data" (P1-01)
const docLines = JSON.parse(await readFile(join(root, 'data/route-lines.json'), 'utf8'));
const atlasStarts = {};
for (const r of routes) {
  if (mapData[r.id] || !Array.isArray(docLines[r.id]) || !docLines[r.id].length) continue;
  const longest = docLines[r.id].filter(Array.isArray).sort((a, b) => b.length - a.length)[0] || [];
  const pts = longest.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!pts.length) continue;
  const step = Math.max(1, Math.ceil(pts.length / 30));
  const line = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]);
  atlasStarts[r.id] = {start: line[0], line, source: 'DOC tracks open data (CC BY 4.0)'};
}
const ai = mapLines.findIndex(l => l.startsWith('const routeAtlasStarts='));
const atlasLine = 'const routeAtlasStarts=' + JSON.stringify(atlasStarts) + ';';
if (ai >= 0) mapLines[ai] = atlasLine; else mapLines.splice(mi + 1, 0, atlasLine);
await writeFile(mapPath, v4.aliasZh(mapLines.join('\n')));
// destination pages (walk-through H-03, ticket P2-05): each town reuses the licensed photo of the nearest route that
// passes within 15 km of it, and lists paddling routes that pass within 60 km. Distances use the sketch points.
{
  const km = (a, b, c, d) => { const r = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * r * Math.asin(Math.min(1, Math.sqrt(h))); };
  const near = (town, r) => {
    const pts = (mapData[r.id] && mapData[r.id].points) || [];
    const extra = atlasStarts[r.id] ? atlasStarts[r.id].line.map(([lon, lat]) => ({lat, lon})) : [];
    return Math.min(Infinity, ...[...pts, ...extra].filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map(p => km(+town.lat, +town.lon, p.lat, p.lon)));
  };
  const out = {};
  for (const town of v4data.places.filter(p => p.type === 'town' && Number.isFinite(+p.lat) && Number.isFinite(+p.lon))) {
    const ranked = routes.filter(r => r.island === town.island).map(r => ({r, d: near(town, r)})).filter(x => Number.isFinite(x.d)).sort((a, b) => a.d - b.d);
    // the photo must show this place: its caption names the town (so Wellington never gets a Martinborough vineyard)
    const names = [town.name_en, town.town, town.name_zh, ...String(town.name_en).split(/[\/(),&]+/)].map(n => String(n || '').trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')).filter(n => n.length > 3);
    const shows = p => (p.place || []).some(c => { const f = String(c).toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''); return names.some(n => f.includes(n)); });
    const withPhoto = ranked.find(x => x.d <= 15 && x.r.photoId && library[x.r.photoId] && !library[x.r.photoId].placeholder && shows(library[x.r.photoId]));
    const paddle = ranked.filter(x => x.r.mode === 'paddle' && x.d <= 60).map(x => ({id: x.r.id, km: Math.round(x.d)}));
    if (!withPhoto && !paddle.length) continue;
    out[town.place_id] = {};
    if (withPhoto) { const p = library[withPhoto.r.photoId]; out[town.place_id].photo = {route: withPhoto.r.id, route_en: withPhoto.r.name, route_zh: withPhoto.r.zh || withPhoto.r.name, km: Math.round(withPhoto.d), src: p.src, place: p.place, author: p.author, source: p.source, license: p.license, licenseUrl: p.licenseUrl}; }
    if (paddle.length) out[town.place_id].paddle = paddle;
  }
  await writeFile(join(root, 'docs/data/destination-extras.json'), JSON.stringify({about: 'Built by scripts/build-site.mjs: a licensed route photo within 15 km of each town, and paddling routes within 60 km.', towns: out}));
  console.log(`Destination extras: ${Object.values(out).filter(x => x.photo).length} towns with a nearby route photo, ${Object.values(out).filter(x => x.paddle).length} with a paddling route nearby.`);
}
// merged place ids (inputs/atlas/merged-place-ids.csv): the planner resolves old ids in shared links and saved trips (ticket C)
const plannerPath = join(root, 'docs/p10-planner.js');
const plannerLines = (await readFile(plannerPath, 'utf8')).split('\n');
const pa = plannerLines.findIndex(l => l.startsWith('const P10_PLACE_ALIASES='));
if (pa < 0) throw new Error('missing P10_PLACE_ALIASES line');
plannerLines[pa] = 'const P10_PLACE_ALIASES=' + JSON.stringify(v4data.aliases || {}) + ';';
await writeFile(plannerPath, plannerLines.join('\n'));
// the footer links to the licence page inside the site; keep that copy identical to the root file
await cp(join(root, 'CONTENT-LICENSE.md'), join(root, 'docs/CONTENT-LICENSE.md'));
await cp(join(root, 'docs'), join(root, 'outputs/site'), {recursive: true, filter: src => !src.endsWith('.nojekyll') && !src.endsWith('SPORTS-SPEC.md')});
execFileSync('node', [join(root, 'scripts/version-assets.mjs')], {stdio: 'inherit'});
console.log(`Built ${routes.length} routes into docs/app.js; ${routes.filter(r => !r.photoId).length} use the placeholder image.`);
