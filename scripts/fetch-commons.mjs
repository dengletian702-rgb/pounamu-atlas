// Downloads the Commons photos listed in scripts/commons-photos.json (the 1280 px versions Commons serves, never the
// originals) into _src/commons/, skipping files already there. Approved by the site owner on 2 Nov 2026 (14 files, ~5 MB).
// Run scripts/import-photos.mjs afterwards to resize them into public/ with their credits.
//   node scripts/fetch-commons.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIST = JSON.parse(readFileSync(new URL('./commons-photos.json', import.meta.url), 'utf8'));
const DIR = fileURLToPath(new URL('../_src/commons/', import.meta.url));
mkdirSync(DIR, { recursive: true });
const H = { headers: { 'User-Agent': 'PounamuAtlas-local/1.0 (one-off download of credited photos)' } };
let n = 0, bytes = 0;
for (const p of LIST) {
  const file = `${DIR}${p.id}.jpg`;
  if (existsSync(file)) continue;
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(p.thumb)) throw new Error(`not a Commons upload URL: ${p.thumb}`);
  await new Promise((r) => setTimeout(r, 1500));
  const res = await fetch(p.thumb, H);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/jpeg')) throw new Error(`${p.id}: HTTP ${res.status} ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`${p.id}: not a JPEG`);
  writeFileSync(file, buf);
  n++; bytes += buf.length;
  console.log(`${p.id}  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log(`${n} downloaded, ${(bytes / 1048576).toFixed(1)} MB → _src/commons/`);
