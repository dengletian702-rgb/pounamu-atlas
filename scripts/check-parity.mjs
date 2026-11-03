// Every English string has a Chinese one and vice versa (UI strings), and every bilingual data field has both
// languages filled (routes, places, reasons, trips, months, photos).
//   node scripts/check-parity.mjs
const issues = [];
const keys = (o, p = '') => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => [`${p}${k}`, ...keys(v, `${p}${k}.`)]) : []);
const cmp = (name, en, zh) => {
  const a = new Set(keys(en)), b = new Set(keys(zh));
  for (const k of a) if (!b.has(k)) issues.push(`${name}: zh missing ${k}`);
  for (const k of b) if (!a.has(k)) issues.push(`${name}: en missing ${k}`);
};
const { V3 } = await import('../public/js/i18n-v3.js');
const { V4 } = await import('../public/js/i18n-v4.js');
cmp('i18n-v3', V3.en, V3.zh);
cmp('i18n-v4', V4.en, V4.zh);
const { V5 } = await import('../public/js/i18n-v5.js');
cmp('i18n-v5', V5.en, V5.zh);

// Data: any object with an `en` key must have a non-empty `zh` (and the reverse).
let pairs = 0;
function walk(name, v, path) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(name, x, `${path}[${i}]`));
  if (!v || typeof v !== 'object') return;
  if ('en' in v || 'zh' in v) {
    pairs++;
    const bad = (x) => x == null || (typeof x === 'string' && !x.trim()) || (Array.isArray(x) && !x.length);
    if (bad(v.en) || bad(v.zh)) issues.push(`${name}${path}: ${bad(v.en) ? 'en' : 'zh'} empty`);
    if (Array.isArray(v.en) && Array.isArray(v.zh) && v.en.length !== v.zh.length) issues.push(`${name}${path}: ${v.en.length} en vs ${v.zh.length} zh items`);
  }
  for (const [k, x] of Object.entries(v)) if (k !== 'en' && k !== 'zh') walk(name, x, `${path}.${k}`);
}
for (const [f, names] of Object.entries({ 'routes.js': ['ROUTES', 'REGIONS'], 'places.js': ['PLACES'], 'why.js': ['WHY', 'WHY_PLACE', 'WHY_TAGS'], 'itineraries.js': ['ITINERARIES'], 'months.js': ['MONTHS'], 'photos.js': ['PHOTOS'], 'guides.js': ['GUIDES'], 'guide.js': ['PREPARE', 'FAQ'], 'roads.js': ['NODES', 'EDGES', 'WISHES'] })) {
  const m = await import(`../public/data/${f}`);
  for (const n of names) walk(n, m[n], '');
}
console.log(issues.length ? issues.join('\n') : `✓ zh/en parity: UI keys match; ${pairs} bilingual data fields all filled`);
process.exit(issues.length ? 1 : 0);
