// Check route photos on Wikimedia Commons and add them to the site (James review B7).
// Usage: node scripts/fetch-route-photos.mjs [data/photo-picks-v3.1.json]
// For each pick: asks the Commons API for author, licence and a 1280 px copy; refuses anything that is not
// CC0, public domain, CC BY or CC BY-SA; saves docs/assets/optimized/cx-<route>.jpg; adds the record to
// data/photo-additions.json (existing records are kept). Prints the credit lines for outputs/IMAGE-CREDITS.md.
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const UA = 'PounamuAtlasPhotoCheck/1.0 (static travel guide; licence check)';
const strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const OK = /^(CC0|Public domain|PD|No restrictions|CC BY(-SA)? \d\.\d)/i;
const picks = JSON.parse(await readFile(join(root, process.argv[2] || 'data/photo-picks-v3.1.json'), 'utf8')).picks;
const addPath = join(root, 'data/photo-additions.json');
const additions = JSON.parse(await readFile(addPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const getJSON = async u => { for (let k = 0; ; k++) { const t = await (await fetch(u, {headers: {'user-agent': UA}})).text(); try { return JSON.parse(t); } catch { if (k > 4) throw new Error('Commons API kept refusing: ' + t.slice(0, 80)); await new Promise(r => setTimeout(r, 15000 * (k + 1))); } } };
const credits = [], refused = [];
for (const p of picks) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action: 'query', format: 'json', titles: 'File:' + p.file, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1280'}).forEach(([k, v]) => u.searchParams.set(k, v));
  const page = Object.values((await getJSON(u)).query.pages)[0], ii = page.imageinfo?.[0];
  if (!ii) { refused.push(`${p.route}: file not found`); continue; }
  const m = ii.extmetadata, licence = m.LicenseShortName?.value || '', licenceUrl = m.LicenseUrl?.value || ii.descriptionurl + '#Licensing';
  if (!OK.test(licence)) { refused.push(`${p.route}: licence “${licence}” not accepted`); continue; }
  let author = strip(m.Artist?.value) || strip(m.Credit?.value) || 'Unknown';
  author = author.replace(/ at English Wikipedia$/, ' (English Wikipedia)');
  const res = await fetch(ii.thumburl, {headers: {'user-agent': UA}});
  if (!res.ok) { refused.push(`${p.route}: download HTTP ${res.status}`); continue; }
  const id = 'cx-' + p.route, src = `assets/optimized/${id}.jpg`;
  await writeFile(join(root, 'docs', src), Buffer.from(await res.arrayBuffer()));
  additions[id] = {src, place: p.place, author, source: ii.descriptionurl, license: licence.replace(/^PD$/, 'Public domain'), licenseUrl: licenceUrl.replace(/^http:/, 'https:'), title: page.title.replace(/^File:/, ''), route: p.route, checkedAt: today};
  credits.push(`- **${p.place[0]} / ${p.place[1]}** — “${page.title.replace(/^File:/, '')}” by ${author}, [${licence}](${licenceUrl}). Source: ${ii.descriptionurl}. Published file: \`docs/${src}\` (${ii.thumbwidth} px wide). Used on route \`${p.route}\`. Why this photo: ${p.why}.`);
  await new Promise(r => setTimeout(r, 2500));
}
await writeFile(addPath, JSON.stringify(additions, null, 1) + '\n');
console.log(credits.join('\n'));
if (refused.length) console.log('\nRefused:\n' + refused.join('\n'));
