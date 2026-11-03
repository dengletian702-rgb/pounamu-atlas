// Keeps drawn routes on the drawn land. Route vertices were placed by hand against an older, rougher coast; a few now
// sit just offshore of the LINZ coastline. Each such vertex moves to the nearest land within ~9 km. Boat routes keep
// their water legs.
import { NORTH, SOUTH, STEWART } from '../data/coast.js';

const RINGS = [NORTH, SOUTH, STEWART];
const BOX = RINGS.map((r) => r.reduce((b, [a, o]) => [Math.min(b[0], a), Math.max(b[1], a), Math.min(b[2], o), Math.max(b[3], o)], [90, -90, 180, -180]));
const SEA_OK = new Set(['cook-strait', 'stewart-ferry', 'devonport-ferry', 'rangitoto', 'metro-christchurch', 'milford-coach', 'abel-tasman', 'queen-charlotte-bike', 'around-the-mountains', 'great-lake-trail']);

function inside([lat, lon], ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ai, oi] = ring[i], [aj, oj] = ring[j];
    if ((ai > lat) !== (aj > lat) && lon < ((oj - oi) * (lat - ai)) / (aj - ai) + oi) c = !c;
  }
  return c;
}
export const onLand = (p) => RINGS.some((r, k) => p[0] >= BOX[k][0] && p[0] <= BOX[k][1] && p[1] >= BOX[k][2] && p[1] <= BOX[k][3] && inside(p, r));

function nudge(p) {
  if (onLand(p)) return p;
  for (let d = 0.006; d <= 0.08; d += 0.006) {
    for (let a = 0; a < 16; a++) {
      const q = [p[0] + d * Math.sin((a / 16) * 2 * Math.PI), p[1] + (d / 0.75) * Math.cos((a / 16) * 2 * Math.PI)];
      if (onLand(q)) return q;
    }
  }
  return p;
}
export function landPath(r) {
  return SEA_OK.has(r.id) ? r.path : r.path.map(nudge);
}
