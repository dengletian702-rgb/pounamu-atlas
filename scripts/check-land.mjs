// Checks that every route vertex (except ferry/boat legs) and every place sits on land in coast.js.
//   node scripts/check-land.mjs
import { NORTH, SOUTH, STEWART } from '../public/data/coast.js';
import { ROUTES } from '../public/data/routes.js';
import { PLACES } from '../public/data/places.js';
const inside = ([lat, lon], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ai, oi] = ring[i], [aj, oj] = ring[j];
    if ((ai > lat) !== (aj > lat) && lon < ((oj - oi) * (lat - ai)) / (aj - ai) + oi) c = !c;
  }
  return c;
};
const onLand = (p) => [NORTH, SOUTH, STEWART].some((r) => inside(p, r));
const SEA_OK = new Set(['cook-strait', 'stewart-ferry', 'devonport-ferry', 'rangitoto', 'metro-christchurch', 'milford-coach', 'abel-tasman', 'queen-charlotte-bike', 'around-the-mountains', 'great-lake-trail']);
let bad = 0;
for (const r of ROUTES) {
  if (SEA_OK.has(r.id)) continue;
  const off = r.path.filter((p) => !onLand(p));
  if (off.length) { bad++; console.log(`${r.id}: ${off.length}/${r.path.length} off land`, JSON.stringify(off)); }
}
for (const p of PLACES) if (!onLand(p.at)) { bad++; console.log(`place ${p.id} off land`, p.at); }
console.log(bad ? `${bad} items to fix` : 'all on land');
