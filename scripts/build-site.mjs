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
await writeFile(appPath, lines.join('\n'));
// route sketches: their `sources` are always copied from the catalogue, so the two can never drift apart (James review 1-2)
const mapPath = join(root, 'docs/route-maps.js');
const mapLines = (await readFile(mapPath, 'utf8')).split('\n');
const mi = mapLines.findIndex(l => l.startsWith('const routeMapData='));
if (mi < 0) throw new Error('missing routeMapData line');
const mapData = JSON.parse(mapLines[mi].slice('const routeMapData='.length).replace(/;\s*$/, ''));
for (const [id, d] of Object.entries(mapData)) { const r = routes.find(x => x.id === id); if (!r) throw new Error('sketch without a catalogue route: ' + id); d.sources = r.sources.map(({label, url}) => ({label, url})); }
mapLines[mi] = 'const routeMapData=' + JSON.stringify(mapData) + ';';
await writeFile(mapPath, mapLines.join('\n'));
// the footer links to the licence page inside the site; keep that copy identical to the root file
await cp(join(root, 'CONTENT-LICENSE.md'), join(root, 'docs/CONTENT-LICENSE.md'));
await cp(join(root, 'docs'), join(root, 'outputs/site'), {recursive: true, filter: src => !src.endsWith('.nojekyll') && !src.endsWith('SPORTS-SPEC.md')});
execFileSync('node', [join(root, 'scripts/version-assets.mjs')], {stdio: 'inherit'});
console.log(`Built ${routes.length} routes into docs/app.js; ${routes.filter(r => !r.photoId).length} use the placeholder image.`);
