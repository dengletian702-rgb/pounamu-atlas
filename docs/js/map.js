// The hand-drawn map of Aotearoa New Zealand: both islands, drawn from lat/lon so routes, towns and doodles share one
// projection. Since v3 the coastline is LINZ data (CC BY 4.0, see data/coast.js); lakes, ranges and towns stay hand-placed.
// The v2 hand-traced coast is in _old/v2. The wobble comes from an SVG turbulence filter; coastline "ripples" are wide, faint copies of the coast.
// The map has a camera (its viewBox) that glides to a route, and a traveller that walks, rides or drives the route.

import { NORTH as NI_LAND, SOUTH as SI_LAND, STEWART as RAKIURA } from '../data/coast.js';
import { landPath } from './land.js';

const NS = 'http://www.w3.org/2000/svg';
export const W = 920, H = 1335;
export const project = ([lat, lon]) => [(lon - 166.2) * 72 + 10, (-34.2 - lat) * 100 + 10];

// ── South Island, Te Waipounamu ─────────────────────────────────────────
const LAKES = [
  [[-44.98, 167.95], [-45.15, 167.86], [-45.3, 167.78], [-45.42, 167.73], [-45.37, 167.67], [-45.2, 167.71], [-45.05, 167.82]],
  [[-45.48, 167.52], [-45.52, 167.7], [-45.58, 167.63], [-45.55, 167.45]],
  [[-44.85, 168.4], [-45.0, 168.56], [-45.03, 168.76], [-45.1, 168.76], [-45.33, 168.73], [-45.33, 168.68], [-45.1, 168.69], [-45.05, 168.55], [-44.9, 168.36]],
  [[-44.45, 169.05], [-44.65, 169.08], [-44.73, 169.16], [-44.7, 169.21], [-44.55, 169.12], [-44.42, 169.1]],
  [[-44.4, 169.28], [-44.55, 169.31], [-44.62, 169.26], [-44.5, 169.22]],
  [[-43.8, 170.55], [-43.95, 170.5], [-44.03, 170.48], [-43.95, 170.57], [-43.85, 170.61]],
  [[-43.85, 170.15], [-44.05, 170.12], [-44.15, 170.16], [-44.05, 170.23], [-43.9, 170.21]],
  [[-44.12, 169.84], [-44.29, 169.87], [-44.25, 169.81]],
];
const SPINE = [[-41.75, 172.75], [-42.3, 172.2], [-42.95, 171.6], [-43.35, 170.75], [-43.6, 170.2], [-44.0, 169.5], [-44.45, 168.85], [-44.9, 168.1], [-45.35, 167.45]];
const SI_TOWNS = [
  ['nelson', [-41.27, 173.28], 'Nelson', '纳尔逊', 1], ['picton', [-41.29, 174.0], 'Picton', '皮克顿', 1],
  ['kaikoura', [-42.4, 173.68], 'Kaikōura', '凯库拉', 1], ['christchurch', [-43.53, 172.63], 'Christchurch', '基督城', 1],
  ['akaroa', [-43.8, 172.97], 'Akaroa', '阿卡罗阿', 0], ['arthurs', [-42.94, 171.56], 'Arthur’s Pass', '亚瑟隘口', 0],
  ['greymouth', [-42.45, 171.21], 'Greymouth', '格雷茅斯', 1], ['hokitika', [-42.72, 170.97], 'Hokitika', '霍基蒂卡', 0],
  ['franz', [-43.39, 170.18], 'Franz Josef', '弗朗茨约瑟夫', 0], ['haast', [-43.88, 169.04], 'Haast', '哈斯特', 0],
  ['wanaka', [-44.7, 169.13], 'Wānaka', '瓦纳卡', 1], ['queenstown', [-45.03, 168.66], 'Queenstown', '皇后镇', 1],
  ['teanau', [-45.41, 167.72], 'Te Anau', '蒂阿瑙', 1], ['milford', [-44.67, 167.93], 'Milford Sound', '米尔福德峡湾', 0],
  ['tekapo', [-44.0, 170.48], 'Tekapo', '特卡波', 0], ['cook', [-43.73, 170.1], 'Aoraki', '库克山', 1],
  ['oamaru', [-45.1, 170.97], 'Oamaru', '奥马鲁', 0], ['dunedin', [-45.87, 170.5], 'Dunedin', '但尼丁', 1],
  ['invercargill', [-46.41, 168.35], 'Invercargill', '因弗卡吉尔', 1], ['oban', [-46.9, 168.13], 'Oban', '奥本', 0],
  ['westport', [-41.75, 171.6], 'Westport', '西港', 0], ['takaka', [-40.85, 172.81], 'Takaka', '塔卡卡', 0],
];


// ── North Island, Te Ika-a-Māui ─────────────────────────────────────────
const NI_LAKES = [
  [[-38.68, 175.9], [-38.7, 176.05], [-38.8, 176.08], [-38.92, 176.0], [-39.0, 175.86], [-38.93, 175.78], [-38.8, 175.76]], // Taupō
  [[-38.03, 176.22], [-38.04, 176.3], [-38.11, 176.31], [-38.13, 176.23], [-38.08, 176.19]], // Rotorua
  [[-38.73, 177.02], [-38.74, 177.13], [-38.79, 177.13], [-38.8, 177.04]], // Waikaremoana
];
const NI_SPINE = [[-41.15, 175.3], [-40.75, 175.55], [-40.25, 175.95], [-39.8, 176.15], [-39.4, 176.35], [-39.0, 176.55], [-38.6, 176.95], [-38.25, 177.45], [-37.95, 177.95]];
const VOLCANOES = [[-39.28, 175.57, 1.25], [-39.157, 175.632, 0.85], [-39.12, 175.69, 0.6], [-39.3, 174.06, 1.35]];
const NI_TOWNS = [
  ['auckland', [-36.85, 174.76], 'Auckland', '奥克兰', 1], ['hamilton', [-37.79, 175.28], 'Hamilton', '汉密尔顿', 0],
  ['rotorua', [-38.14, 176.25], 'Rotorua', '罗托鲁瓦', 1], ['taupo', [-38.69, 176.07], 'Taupō', '陶波', 1],
  ['turangi', [-38.99, 175.81], 'Tūrangi', '图朗伊', 0], ['ohakune', [-39.42, 175.4], 'Ohakune', '奥哈库尼', 0],
  ['newplymouth', [-39.06, 174.08], 'New Plymouth', '新普利茅斯', 1], ['whanganui', [-39.93, 175.05], 'Whanganui', '旺格努伊', 0],
  ['napier', [-39.49, 176.92], 'Napier', '纳皮尔', 1], ['gisborne', [-38.66, 178.02], 'Gisborne', '吉斯伯恩', 0],
  ['wellington', [-41.29, 174.78], 'Wellington', '惠灵顿', 1], ['thames', [-37.14, 175.54], 'Thames', '泰晤士', 0],
  ['paihia', [-35.28, 174.09], 'Paihia', '派希亚', 0], ['taumarunui', [-38.88, 175.26], 'Taumarunui', '陶马鲁努伊', 0],
];

export const MODE_COLOR = { hike: '#1f5c47', bike: '#b7790c', drive: '#2b5d8c', transit: '#a3313d' };
const TOWNS = [...SI_TOWNS, ...NI_TOWNS];
// Labels that sit to the left of their dot (coast on the right, or a neighbour in the way).
const LEFT = new Set(['picton', 'kaikoura', 'akaroa', 'christchurch', 'dunedin', 'oamaru', 'nelson', 'milford', 'auckland', 'napier', 'gisborne', 'thames', 'paihia', 'taupo', 'turangi']);

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
// A point on the map whose drawing keeps its size on screen while the camera zooms (k-l), or grows only a little (k-a).
function anchor(parent, x, y, kind = 'l', cls = '') {
  const o = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, class: cls }, parent);
  return [o, el('g', { class: `k-${kind}` }, o)];
}

// Catmull-Rom → cubic Bézier, so hand-placed points read as a drawn line.
function smoothPts(p, closed = false, t = 0.5) {
  if (p.length < 2) return '';
  const pts = closed ? [p[p.length - 1], ...p, p[0], p[1]] : [p[0], ...p, p[p.length - 1]];
  let d = `M${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * t * 2, p1[1] + ((p2[1] - p0[1]) / 6) * t * 2];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * t * 2, p2[1] - ((p3[1] - p1[1]) / 6) * t * 2];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? `${d} Z` : d;
}
const smooth = (points, closed) => smoothPts(points.map(project), closed);
// Dense surveyed outlines are drawn as polylines; the wobble filter gives them the hand-drawn edge.
const poly = (points) => `M${points.map((q) => project(q).map((v) => v.toFixed(1)).join(',')).join('L')}Z`;

// A tiny drawing of a route's shape, for list rows.
export function routeThumb(r, w = 72, h = 44) {
  const p = r.path.map(project);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((w - 12) / Math.max(x1 - x0, 1), (h - 12) / Math.max(y1 - y0, 1));
  const q = p.map(([x, y]) => [6 + (x - x0) * s + ((w - 12) - (x1 - x0) * s) / 2, 6 + (y - y0) * s + ((h - 12) - (y1 - y0) * s) / 2]);
  const d = smoothPts(q);
  const [sx, sy] = q[0], [ex, ey] = q[q.length - 1];
  return `<svg class="thumb thumb-${r.mode}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <path d="${d}" class="th-line" stroke="${MODE_COLOR[r.mode]}"/><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3.4" fill="${MODE_COLOR[r.mode]}"/>
    <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3" class="th-end" stroke="${MODE_COLOR[r.mode]}"/></svg>`;
}

// Small seeded random so the doodles land in the same place on every visit.
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function mountainRow(g, spine, seed, size = 1) {
  const rand = rng(seed);
  const pts = spine.map(project);
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (13 * size));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      const x = a[0] + (b[0] - a[0]) * f + (rand() - 0.5) * 16 * size;
      const y = a[1] + (b[1] - a[1]) * f + (rand() - 0.5) * 12 * size;
      const h = (9 + rand() * 9) * size, w = (7 + rand() * 5) * size;
      const [, m] = anchor(g, x, y, 'a');
      el('path', { d: `M${-w},0 L0,${-h} L${w},0`, class: 'mtn' }, m);
      el('path', { d: `M0,${-h} L${w * 0.45},${-h * 0.45} L${w * 0.1},${-h * 0.5}`, class: 'mtn-shade' }, m);
    }
  }
}
function bigPeak(g, at, s = 1, snowy = true) {
  const [x, y] = project(at);
  const [, m] = anchor(g, x, y, 'a');
  el('path', { d: `M${-17 * s},4 L${-2 * s},${-27 * s} L${3 * s},${-20 * s} L${17 * s},4`, class: 'mtn mtn-big' }, m);
  if (snowy) el('path', { d: `M${-8 * s},${-11 * s} L${-2 * s},${-27 * s} L${3 * s},${-20 * s} L${7 * s},${-12 * s} L${2 * s},${-14 * s} L${-3 * s},${-9 * s} Z`, class: 'snow' }, m);
}
function cone(g, [lat, lon, s]) {
  const [x, y] = project([lat, lon]);
  const [, m] = anchor(g, x, y, 'a');
  el('path', { d: `M${-20 * s},4 Q${-9 * s},${-6 * s} ${-4 * s},${-24 * s} L${4 * s},${-24 * s} Q${9 * s},${-6 * s} ${20 * s},4`, class: 'mtn mtn-big' }, m);
  el('path', { d: `M${-7.5 * s},${-15 * s} L${-4 * s},${-24 * s} L${4 * s},${-24 * s} L${7.5 * s},${-15 * s} L${3 * s},${-17 * s} L0,${-14 * s} L${-3 * s},${-17 * s} Z`, class: 'snow' }, m);
}

function drawRelief(g) {
  mountainRow(g, SPINE, 7);
  mountainRow(g, NI_SPINE, 11, 0.7);
  bigPeak(g, [-43.6, 170.14]); // Aoraki
  for (const v of VOLCANOES) cone(g, v);
}

function star(g, x, y, r) {
  el('path', { d: `M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z`, class: 'star' }, g);
}

function drawDoodles(g) {
  // Compass rose in the Tasman Sea
  const [cx, cy] = project([-35.7, 168.4]);
  const [, c] = anchor(g, cx, cy, 'a', 'doodle compass');
  el('circle', { r: 26, class: 'doodle-line' }, c);
  el('path', { d: 'M0,-38 L6,-6 L0,0 L-6,-6 Z', class: 'doodle-fill' }, c);
  el('path', { d: 'M0,38 L6,6 L0,0 L-6,6 Z', class: 'doodle-line' }, c);
  el('path', { d: 'M-38,0 L-6,-5 L0,0 L-6,5 Z M38,0 L6,-5 L0,0 L6,5 Z', class: 'doodle-line' }, c);
  el('text', { y: -44, class: 'doodle-text', 'text-anchor': 'middle' }, c).textContent = 'N';
  // Whale off Kaikōura
  const [wx, wy] = project([-42.75, 174.1]);
  const [, wo] = anchor(g, wx, wy, 'a', 'doodle');
  const w = el('g', { class: 'whale' }, wo);
  el('path', { d: 'M-22,6 Q-20,-10 2,-9 Q16,-8 20,2 Q12,8 -4,8 Q-14,9 -22,6 Z', class: 'doodle-fill' }, w);
  el('path', { d: 'M20,2 Q26,-6 30,-12 M20,2 Q28,0 34,-4', class: 'doodle-line' }, w);
  el('path', { d: 'M-6,-12 Q-8,-20 -12,-22 M-6,-12 Q-4,-20 0,-23', class: 'doodle-line' }, w);
  // Ferry in Cook Strait
  const [fx, fy] = project([-41.12, 174.42]);
  const [, f] = anchor(g, fx, fy, 'a', 'doodle ferry');
  el('path', { d: 'M-14,0 L14,0 L10,7 L-10,7 Z', class: 'doodle-fill' }, f);
  el('path', { d: 'M-7,0 L-7,-6 L6,-6 L6,0 M-2,-6 L-2,-11', class: 'doodle-line' }, f);
  // Stars over the Mackenzie
  const [sx, sy] = project([-43.62, 171.0]);
  for (const [dx, dy, r] of [[0, 0, 4], [14, -8, 3], [26, 4, 2.5], [8, 14, 2]]) star(g, sx + dx, sy + dy, r);
  // Penguin near Oamaru
  const [px, py] = project([-45.25, 171.35]);
  const [, p] = anchor(g, px, py, 'a', 'doodle');
  el('ellipse', { cx: 0, cy: 0, rx: 6, ry: 10, class: 'doodle-fill' }, p);
  el('ellipse', { cx: 1.5, cy: 2, rx: 3.5, ry: 7, class: 'belly' }, p);
  el('path', { d: 'M5,-6 L10,-5 L5,-3', class: 'doodle-line' }, p);
  // Albatross over the Southern Ocean
  const [bx, by] = project([-46.9, 170.4]);
  el('path', { d: `M${bx - 26},${by} Q${bx - 12},${by - 10} ${bx},${by} Q${bx + 12},${by - 10} ${bx + 26},${by}`, class: 'doodle-line bird' }, g);
  // Steam rising at Rotorua
  const [rx, ry] = project([-38.24, 176.42]);
  const [, st] = anchor(g, rx, ry, 'a', 'doodle steam');
  el('path', { d: 'M-6,0 q-5,-6 0,-11 t0,-11 M2,-2 q-5,-6 0,-11 t0,-11 M10,0 q-5,-6 0,-10 t0,-9', class: 'doodle-line' }, st);
  // Kiwi in the Northland forest
  const [kx, ky] = project([-35.62, 173.72]);
  const [, k] = anchor(g, kx, ky, 'a', 'doodle kiwi');
  el('path', { d: 'M-9,2 Q-10,-8 0,-8 Q7,-8 8,-3 L17,3 L8,0 Q6,6 -2,6 Q-8,6 -9,2 Z', class: 'kiwi-body' }, k);
  el('path', { d: 'M-3,6 L-4,11 M2,6 L3,11', class: 'kiwi-leg' }, k);
  // Waves
  const rand = rng(3);
  for (const [lat, lon] of [[-41.6, 167.6], [-43.0, 167.4], [-42.2, 168.9], [-44.6, 172.6], [-45.6, 172.2], [-43.9, 174.0], [-46.4, 166.9], [-47.0, 169.4], [-41.9, 170.2],
    [-36.2, 172.4], [-38.4, 172.9], [-36.9, 177.0], [-40.6, 177.5], [-35.3, 175.6], [-39.9, 172.4], [-42.6, 176.3]]) {
    const [x, y] = project([lat, lon]);
    const s = 0.8 + rand() * 0.5;
    const [, wv] = anchor(g, x, y, 'a');
    el('path', { d: `M${-14 * s},0 q${3.5 * s},-${5 * s} ${7 * s},0 t${7 * s},0 t${7 * s},0 t${7 * s},0`, class: 'wave' }, wv);
  }
}

// Little pictograms that travel along a route.
const ICON = {
  hike: (g) => { el('circle', { cx: 0.6, cy: -4.6, r: 1.7, class: 'ic-fill' }, g); el('path', { d: 'M0.2,-2.6 L-0.6,1.6 L-3,5.4 M-0.6,1.6 L2.4,5.4 M-3.2,-0.6 L-0.2,-2.4 L3,-0.2', class: 'ic' }, g); },
  bike: (g) => { el('circle', { cx: -3.4, cy: 2, r: 2.7, class: 'ic' }, g); el('circle', { cx: 3.4, cy: 2, r: 2.7, class: 'ic' }, g); el('path', { d: 'M-3.4,2 L-1,-2.4 L2.2,-2.4 L3.4,2 M-1,-2.4 L0.4,2 L2.2,-2.4 M-1.8,-4 L0,-4', class: 'ic' }, g); },
  drive: (g) => { el('path', { d: 'M-5.4,2 L-5.4,-0.6 L-3.4,-3.6 L3.4,-3.6 L5.4,-0.6 L5.4,2 Z', class: 'ic-fill' }, g); el('circle', { cx: -3, cy: 2.6, r: 1.6, class: 'ic-dark' }, g); el('circle', { cx: 3, cy: 2.6, r: 1.6, class: 'ic-dark' }, g); },
  transit: (g) => { el('rect', { x: -3.8, y: -5.2, width: 7.6, height: 9, rx: 1.6, class: 'ic-fill' }, g); el('path', { d: 'M-2.4,-3 L2.4,-3 L2.4,-0.6 L-2.4,-0.6 Z', class: 'ic-dark' }, g); el('path', { d: 'M-2.6,3.8 L-4,6 M2.6,3.8 L4,6', class: 'ic' }, g); },
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const raf = (fn) => requestAnimationFrame(fn);

export function createMap(container, { routes, onSelect, uid = 'm', compact = false }) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', class: `nz-map${compact ? ' compact' : ''}`, 'aria-labelledby': `${uid}-title ${uid}-desc`, preserveAspectRatio: 'xMidYMid meet' });
  const title = el('title', { id: `${uid}-title` }, svg);
  const desc = el('desc', { id: `${uid}-desc` }, svg);
  const defs = el('defs', {}, svg);
  const filt = el('filter', { id: `${uid}-wobble`, x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
  const turb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: '4', result: 'n' }, filt);
  const disp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '3.2', xChannelSelector: 'R', yChannelSelector: 'G' }, filt);
  const wob = `url(#${uid}-wobble)`;

  const sea = el('g', { class: 'sea', filter: wob }, svg);
  const shapes = [poly(SI_LAND), poly(RAKIURA), poly(NI_LAND)];
  for (const r of ['r1', 'r2', 'r3']) for (const d of shapes) el('path', { d, class: `ripple ${r}` }, sea);
  const land = el('g', { class: 'land', filter: wob }, svg);
  for (const d of shapes) { el('path', { d, class: 'land-fill' }, land); el('path', { d, class: 'coast' }, land); }
  for (const lk of [...LAKES, ...NI_LAKES]) el('path', { d: smooth(lk, true), class: 'lake' }, land);
  drawRelief(el('g', { class: 'relief', filter: wob }, svg));
  drawDoodles(el('g', { class: 'doodles', filter: wob }, svg));

  const labelsSea = el('g', { class: 'sea-labels' }, svg);
  const seaText = (at, rot, cls) => {
    const [x, y] = project(at);
    const [o, a] = anchor(labelsSea, x, y, 'a');
    o.setAttribute('class', `sea-label ${cls}`);
    return el('text', { transform: `rotate(${rot})`, 'text-anchor': 'middle' }, a);
  };
  const tasman = seaText([-40.2, 169.0], -64, 'tasman');
  const pacific = seaText([-43.6, 176.4], -50, 'pacific');
  const southName = seaText([-47.05, 171.4], 0, 'island-name');
  const northName = seaText([-37.7, 172.3], -58, 'island-name');

  const trip = el('g', { class: 'trip' }, svg);
  const routeLayer = el('g', { class: 'routes' }, svg);
  const steps = el('g', { class: 'footsteps' }, svg);
  const townLayer = el('g', { class: 'towns' }, svg);
  const pins = el('g', { class: 'pins' }, svg);
  const [walker, walkerIn] = anchor(svg, 0, 0, 'l', 'traveller');
  walker.style.display = 'none';
  const tagO = el('g', { class: 'route-tag', opacity: 0 }, svg);
  const tag = el('g', { class: 'k-l' }, tagO);
  const tagBg = el('rect', { height: 26, class: 'tag-bg' }, tag);
  const tagText = el('text', { x: 9, y: 17.5, class: 'tag-text' }, tag);

  const townEls = TOWNS.map(([id, at, en, zh, major]) => {
    const [x, y] = project(at);
    const [, g] = anchor(townLayer, x, y, 'l', `town${major ? ' major' : ''}`);
    el('circle', { r: major ? 3.2 : 2.3, class: 'town-dot' }, g);
    const right = !LEFT.has(id);
    const t = el('text', { x: right ? 6 : -6, y: id === 'arthurs' ? -6 : 4, 'text-anchor': right ? 'start' : 'end', class: 'town-label' }, g);
    return { t, en, zh };
  });

  const rEls = new Map();
  for (const r of routes) {
    const d = smooth(landPath(r), false);
    const g = el('g', { class: `route mode-${r.mode}`, 'data-id': r.id }, routeLayer);
    el('path', { d, class: 'route-hit' }, g);
    if (r.mode === 'drive') el('path', { d, class: 'route-casing' }, g);
    if (r.mode === 'transit') el('path', { d, class: 'route-ties', stroke: MODE_COLOR.transit }, g);
    const line = el('path', { d, class: 'route-line', stroke: MODE_COLOR[r.mode] }, g);
    const [sx, sy] = project(landPath(r)[0]);
    const [, sp] = anchor(g, sx, sy, 'l');
    el('circle', { r: 4.2, class: 'route-start', fill: MODE_COLOR[r.mode] }, sp);
    if (onSelect) g.addEventListener('click', () => onSelect(r.id));
    g.addEventListener('mouseenter', () => { if (!svg.classList.contains('journeying')) api.highlight(r.id); });
    g.addEventListener('mouseleave', () => { if (!svg.classList.contains('journeying')) api.highlight(null); });
    rEls.set(r.id, { g, line, route: r });
  }
  container.appendChild(svg);
  // Each route is revealed through a mask whose stroke "draws" along the path, so dotted and dashed styles still
  // appear to be drawn by hand.
  const maskFor = (id, d) => {
    const m = el('mask', { id: `${uid}-m-${id}`, maskUnits: 'userSpaceOnUse', x: -W, y: -H, width: W * 3, height: H * 3 }, defs);
    const p = el('path', { d, fill: 'none', stroke: '#fff', class: 'mask-stroke', 'stroke-linecap': 'round' }, m);
    return p;
  };
  for (const [id, rec] of rEls) {
    rec.len = Math.ceil(rec.line.getTotalLength()) + 2;
    rec.mask = maskFor(id, rec.line.getAttribute('d'));
    rec.mask.style.strokeDasharray = `${rec.len} ${rec.len}`;
    rec.mask.style.strokeDashoffset = '0';
    rec.g.setAttribute('mask', `url(#${uid}-m-${id})`);
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Camera: the viewBox, kept to the holder's shape. Labels, pins and strokes are counter-scaled in CSS
  // through --iz (1/zoom) and --az (a gentler factor for drawings), so zooming in reads as a closer map, not a blow-up.
  let home = { x: 0, y: 0, w: W, h: H };
  let cam = { ...home };
  let target = null;
  function aspect() { const r = container.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r.width / r.height : W / H; }
  function fit(b, pad = 0.18, minW = 70) {
    const a = aspect();
    let w = Math.max(b.x1 - b.x0, minW), h = Math.max(b.y1 - b.y0, minW / a);
    w *= 1 + pad * 2; h *= 1 + pad * 2;
    if (w / h > a) h = w / a; else w = h * a;
    return { x: (b.x0 + b.x1) / 2 - w / 2, y: (b.y0 + b.y1) / 2 - h / 2, w, h };
  }
  function computeHome() { home = fit({ x0: 12, y0: 8, x1: W - 12, y1: H - 8 }, compact ? 0.0 : 0.01, 10); }
  function setCam(c) {
    cam = c;
    svg.setAttribute('viewBox', `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`);
    const z = Math.max(home.w / c.w, 1);
    svg.style.setProperty('--iz', (1 / z).toFixed(4));
    svg.style.setProperty('--az', (z ** -0.72).toFixed(4));
    disp.setAttribute('scale', (3.2 * z ** -0.85).toFixed(3));
    turb.setAttribute('baseFrequency', (0.035 * z ** 0.85).toFixed(4));
  }
  let camAnim = 0;
  function moveCam(to, dur = 1100) {
    target = to;
    cancelAnimationFrame(camAnim);
    if (reduce || dur === 0) { setCam(to); return Promise.resolve(); }
    const from = { ...cam }, t0 = performance.now();
    return new Promise((res) => {
      const tick = (now) => {
        const k = ease(Math.min((now - t0) / dur, 1));
        // Zoom in log space so the move feels like one steady glide.
        const w = Math.exp(Math.log(from.w) + (Math.log(to.w) - Math.log(from.w)) * k);
        const h = w * (to.h / to.w);
        const cx = from.x + from.w / 2 + ((to.x + to.w / 2) - (from.x + from.w / 2)) * k;
        const cy = from.y + from.h / 2 + ((to.y + to.h / 2) - (from.y + from.h / 2)) * k;
        setCam({ x: cx - w / 2, y: cy - h / 2, w, h });
        if (k < 1) camAnim = raf(tick); else res();
      };
      camAnim = raf(tick);
    });
  }
  const bboxOf = (pts) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };
  computeHome();
  setCam(home);
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      computeHome();
      if (target?.__b) { target = { ...fit(target.__b, target.__pad, target.__min), __b: target.__b, __pad: target.__pad, __min: target.__min }; setCam(target); } else setCam(home);
    }).observe(container);
  }

  // ── Journeys: one or more legs drawn one after another, with a traveller and (on foot) footprints.
  let run = 0;
  function stopJourney() {
    run++;
    walker.style.display = 'none';
    svg.classList.remove('journeying');
  }
  function placeWalker(x, y, mode) {
    walker.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    if (walker.dataset.mode !== mode) {
      walkerIn.replaceChildren();
      el('circle', { r: 10.5, class: 'tr-bg', fill: MODE_COLOR[mode] || '#15302b' }, walkerIn);
      ICON[mode]?.(walkerIn);
      walker.dataset.mode = mode;
    }
  }
  function footprint(x, y, ang, side) {
    const [o, g] = anchor(steps, x, y, 'l', 'print');
    o.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(ang * 180) / Math.PI + 90})`);
    el('ellipse', { cx: side * 2.4, cy: 0, rx: 1.7, ry: 2.8, class: 'print-sole' }, g);
    el('circle', { cx: side * 2.4, cy: -3.7, r: 1.15, class: 'print-sole' }, g);
  }
  function pinAt([x, y], kind, text) {
    const [o, g] = anchor(pins, x, y, 'l', `pin pin-${kind}`);
    if (kind === 'end') {
      el('path', { d: 'M0,0 L0,-19', class: 'flag-pole' }, g);
      el('path', { d: 'M0,-19 L12,-15 L0,-11 Z', class: 'flag' }, g);
      el('circle', { r: 3, class: 'pin-dot' }, g);
    } else {
      el('circle', { r: 10, class: 'pin-bg' }, g);
      el('text', { y: 4, 'text-anchor': 'middle', class: 'pin-text' }, g).textContent = text;
    }
    return o;
  }

  // legs: [{ id, reversed } | { link: [[x,y],[x,y]] }]
  // stops: fractions (0–1) along a single route where the traveller pauses; each shows a numbered marker.
  // Returns a controller: pause / resume / toggle / seek(p) / setRate(r) / cancel.
  function journey(legs, { onTick, onLeg, onDone, onStop, camera = true, pace = 1, stops = [], hold = 850, startAt = 0, minFrame = 24 } = {}) {
    stopJourney();
    const my = run;
    steps.replaceChildren();
    pins.replaceChildren();
    trip.replaceChildren();
    tagO.setAttribute('opacity', 0);
    const ids = legs.filter((l) => l.id).map((l) => l.id);
    for (const [rid, rec] of rEls) {
      const on = ids.includes(rid);
      rec.g.classList.toggle('is-focus', on);
      rec.g.classList.toggle('is-hidden', false);
      if (on) { rec.mask.style.transition = 'none'; rec.mask.style.strokeDashoffset = String(rec.len); }
    }
    svg.classList.add('has-focus', 'journeying');
    // Build every leg up front so the camera can frame them all.
    const built = legs.map((l, i) => {
      if (l.id) {
        const rec = rEls.get(l.id);
        return rec && { ...l, rec, mode: rec.route.mode, len: rec.len, line: rec.line, mask: rec.mask };
      }
      const [a, b] = l.link;
      const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.15, my2 = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.15;
      const d = `M${a[0]},${a[1]} Q${mx},${my2} ${b[0]},${b[1]}`;
      const g = el('g', { mask: `url(#${uid}-m-link${i})` }, trip);
      const line = el('path', { d, class: 'trip-link' }, g);
      const len = Math.ceil(line.getTotalLength()) + 2;
      const mask = maskFor(`link${i}`, d);
      mask.style.strokeDasharray = `${len} ${len}`;
      mask.style.strokeDashoffset = String(len);
      return { ...l, mode: 'link', len, line, mask };
    }).filter(Boolean);
    const pts = [];
    for (const b of built) for (let s = 0; s <= 12; s++) { const p = b.line.getPointAtLength((b.len - 2) * (s / 12)); pts.push([p.x, p.y]); }
    const box = bboxOf(pts);
    const pad = built.length > 1 ? 0.1 : 0.3, minW = built.length > 1 ? 160 : minFrame;
    const startCam = camera ? moveCam({ ...fit(box, pad, minW), __b: box, __pad: pad, __min: minW }) : Promise.resolve();
    const routeLegs = built.filter((b) => b.id);
    const pointAt = (b, p) => b.line.getPointAtLength(b.reversed ? (b.len - 2) * (1 - p) : (b.len - 2) * p);
    const firstP = routeLegs[0] && pointAt(routeLegs[0], 0);
    if (firstP) pinAt([firstP.x, firstP.y], 'start', routeLegs.length > 1 ? '1' : '◆');
    // Numbered stops along a single route, faint until the traveller reaches them.
    const stopEls = built.length === 1 && built[0].id ? stops.map((sp, i) => {
      const q = pointAt(built[0], sp);
      const o = pinAt([q.x, q.y], 'stop', String(i + 1).padStart(2, '0'));
      o.dataset.i = i;
      return o;
    }) : [];

    const pxPerUnit = () => container.getBoundingClientRect().width / cam.w || 1;
    const ctl = { paused: false, rate: 1, done: false, leg: null };
    let legIndex = -1;
    const finish = () => {
      walker.style.display = 'none';
      svg.classList.remove('journeying');
      const last = built[built.length - 1];
      if (last) { const p = pointAt(last, 1); pinAt([p.x, p.y], 'end'); }
      ctl.done = true;
      onDone?.();
    };
    const nextLeg = () => {
      if (my !== run) return;
      legIndex++;
      const b = built[legIndex];
      if (!b) { finish(); return; }
      onLeg?.(legIndex, b);
      const L = b.len - 2;
      const screen = L * pxPerUnit();
      const speed = b.mode === 'hike' ? 95 : b.mode === 'bike' ? 150 : b.mode === 'link' ? 260 : 210; // px per second
      const base = legs.length > 1 ? 0.55 : 1;
      const dur = reduce ? 0 : Math.min(Math.max((screen / speed) * 1000 * base * pace, legs.length > 1 ? 900 : 5200), legs.length > 1 ? 4200 : 10000);
      const stride = Math.max(5.2 / pxPerUnit(), 0.0001) * 1.3; // footprint spacing in map units (≈ 7 screen px)
      const strides = Math.max(Math.round(L / stride), 1);
      const legStops = built.length === 1 ? stops : [];
      const leg = { t: 0, placed: 0, holdLeft: 0, nextStop: 0 };
      ctl.leg = leg;
      if (b.id && b.mode === 'hike') b.rec.g.classList.add('as-steps');
      walker.style.display = '';
      // On foot the pace rises and falls with each stride; wheels and rails glide.
      const shape = (t) => (b.mode === 'hike' ? Math.min(t + Math.sin(2 * Math.PI * t * strides / 2) / (2 * Math.PI * strides / 2) * 0.45, 1) : b.mode === 'link' ? ease(t) : t);
      const draw = (p) => {
        b.mask.style.transition = 'none';
        b.mask.style.strokeDashoffset = String(b.reversed ? -b.len * (1 - p) : b.len * (1 - p));
        const pt = pointAt(b, p);
        placeWalker(pt.x, pt.y, b.mode === 'link' ? (routeLegs[0]?.mode || 'drive') : b.mode);
        if (b.mode === 'hike') {
          const want = Math.floor(p * strides);
          while (leg.placed < want) {
            leg.placed++;
            const f = leg.placed / strides;
            const q1 = pointAt(b, Math.max(f - 0.3 / L, 0)), q2 = pointAt(b, Math.min(f + 0.3 / L, 1));
            const q = pointAt(b, f);
            footprint(q.x, q.y, Math.atan2(q2.y - q1.y, q2.x - q1.x), leg.placed % 2 ? 1 : -1);
          }
        }
        stopEls.forEach((s, i) => s.classList.toggle('reached', p >= legStops[i] - 1e-6));
        onTick?.(legIndex, p, b);
      };
      leg.seek = (p) => {
        leg.t = Math.min(Math.max(p, 0), 1);
        leg.holdLeft = 0;
        leg.nextStop = legStops.findIndex((s) => s > leg.t + 1e-6);
        if (leg.nextStop < 0) leg.nextStop = legStops.length;
        steps.replaceChildren();
        leg.placed = 0;
        draw(leg.t);
      };
      if (legIndex === 0 && startAt > 0) leg.seek(startAt);
      let last = performance.now();
      const frame = (now) => {
        if (my !== run || ctl.leg !== leg) return;
        const dt = Math.min(now - last, 100) * ctl.rate;
        last = now;
        if (ctl.paused) { raf(frame); return; }
        if (leg.holdLeft > 0) { leg.holdLeft -= dt; raf(frame); return; }
        let t = dur ? Math.min(leg.t + dt / dur, 1) : 1;
        let p = shape(t);
        // Arriving at a stop: land exactly on it and pause there for a moment.
        if (!reduce && leg.nextStop < legStops.length && p >= legStops[leg.nextStop]) {
          const i = leg.nextStop++;
          t = legStops[i]; p = legStops[i];
          leg.holdLeft = hold;
          onStop?.(i);
        }
        leg.t = t;
        draw(p);
        if (t < 1) raf(frame); else nextLeg();
      };
      raf(frame);
    };
    startCam.then(() => { if (my === run) setTimeout(nextLeg, reduce ? 0 : 180); });
    return {
      cancel: stopJourney,
      pause() { ctl.paused = true; },
      resume() { ctl.paused = false; },
      toggle() { ctl.paused = !ctl.paused; return ctl.paused; },
      isPaused: () => ctl.paused,
      isDone: () => ctl.done,
      setRate(r) { ctl.rate = r; },
      // Jump to a fraction of a single-route journey (used by the timeline). Stops before it count as reached.
      seek(p) { if (ctl.leg?.seek && !ctl.done) ctl.leg.seek(p); },
    };
  }

  // ── Free camera: zoom buttons and drag to pan (not on the compact hero map).
  function zoomBy(f) {
    const w = Math.min(Math.max(cam.w * f, 20), home.w), h = w * (cam.h / cam.w);
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    target = null;
    return moveCam({ x: cx - w / 2, y: cy - h / 2, w, h }, 380);
  }
  if (!compact) {
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || cam.w >= home.w - 1) return;
      drag = { x: e.clientX, y: e.clientY, cam: { ...cam }, moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = cam.w / (container.getBoundingClientRect().width || 1);
      const dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
      if (!drag.moved && Math.hypot(dx / k, dy / k) < 4) return;
      drag.moved = true;
      svg.classList.add('panning');
      target = null;
      setCam({ ...drag.cam, x: drag.cam.x - dx, y: drag.cam.y - dy });
    });
    addEventListener('pointerup', () => {
      if (drag?.moved) svg.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
      drag = null;
      svg.classList.remove('panning');
    });
  }

  // ── Places: small diamonds for the spots people search for by name, shown on demand.
  const placeLayer = el('g', { class: 'places' }, svg);
  svg.insertBefore(placeLayer, townLayer.nextSibling);
  let placeEls = [];
  function setPlaces(list, onPick) {
    placeLayer.replaceChildren();
    placeEls = list.map((pl) => {
      const [x, y] = project(pl.at);
      const [o, g] = anchor(placeLayer, x, y, 'l', `place kind-${pl.kind}`);
      o.dataset.id = pl.id;
      el('path', { d: 'M0,-5 L5,0 L0,5 L-5,0 Z', class: 'place-dot' }, g);
      const t = el('text', { x: 8, y: 4, class: 'place-label' }, g);
      if (onPick) { o.addEventListener('click', (e) => { e.stopPropagation(); onPick(pl.id); }); o.style.cursor = 'pointer'; }
      return { t, pl };
    });
    for (const p of placeEls) p.t.textContent = p.pl.name[lang] || p.pl.name.en;
  }

  let lang = 'en';
  let visible = new Set(routes.map((r) => r.id));
  const api = {
    svg,
    setLang(l, t) {
      lang = l;
      title.textContent = t.mapTitle;
      desc.textContent = t.mapDesc;
      tasman.textContent = t.tasman;
      pacific.textContent = t.pacific;
      southName.textContent = t.southName;
      northName.textContent = t.northName;
      for (const te of townEls) te.t.textContent = l === 'zh' ? te.zh : te.en;
      for (const p of placeEls) p.t.textContent = p.pl.name[l] || p.pl.name.en;
      svg.classList.toggle('lang-zh', l === 'zh');
    },
    // Show a set of routes, drawn in one after another.
    show(ids, { animate = true } = {}) {
      stopJourney();
      steps.replaceChildren();
      pins.replaceChildren();
      trip.replaceChildren();
      visible = new Set(ids);
      let i = 0;
      for (const [id, rec] of rEls) {
        const on = visible.has(id);
        rec.g.classList.toggle('is-hidden', !on);
        rec.g.classList.remove('is-focus', 'as-steps');
        if (!on || !animate || reduce) { rec.mask.style.transition = 'none'; rec.mask.style.strokeDashoffset = '0'; continue; }
        const delay = Math.min(i++ * 60, 1400);
        rec.mask.style.transition = 'none';
        rec.mask.style.strokeDashoffset = String(rec.len);
        rec.mask.getBoundingClientRect();
        rec.mask.style.transition = `stroke-dashoffset 1.6s cubic-bezier(.4,.1,.2,1) ${delay}ms`;
        rec.mask.style.strokeDashoffset = '0';
      }
      svg.classList.remove('has-focus');
    },
    highlight(id) {
      for (const [rid, { g }] of rEls) g.classList.toggle('is-focus', rid === id);
      if (!id || !rEls.has(id) || !visible.has(id)) { svg.classList.remove('has-focus'); tagO.setAttribute('opacity', 0); return; }
      svg.classList.add('has-focus');
      const r = rEls.get(id).route;
      const mid = project(r.path[Math.floor(r.path.length / 2)]);
      tagText.textContent = r.name[lang] || r.name.en;
      const tw = tagText.getComputedTextLength() + 18;
      tagBg.setAttribute('width', tw);
      const iz = cam.w / home.w;
      const x = Math.min(Math.max(mid[0] + 10 * iz, cam.x + 6 * iz), cam.x + cam.w - (tw + 6) * iz);
      const y = Math.max(mid[1] - 36 * iz, cam.y + 8 * iz);
      tagO.setAttribute('transform', `translate(${x} ${y})`);
      tagO.setAttribute('opacity', 1);
    },
    journey,
    stop: stopJourney,
    zoomBy,
    setPlaces,
    showPlaces(on) { svg.classList.toggle('show-places', on); },
    focusPlace(id) {
      const pl = placeEls.find((p) => p.pl.id === id);
      if (!pl) return;
      const [x, y] = project(pl.pl.at);
      for (const p of placeEls) p.t.parentNode.parentNode.classList.toggle('is-on', p === pl);
      svg.classList.add('show-places');
      const b = { x0: x - 1, y0: y - 1, x1: x + 1, y1: y + 1 };
      return moveCam({ ...fit(b, 0.3, 60), __b: b, __pad: 0.3, __min: 60 }, 900);
    },
    home(dur = 1000) { target = null; return moveCam(home, dur); },
    // Frame one route the way a journey does, without replaying it.
    frame(id, dur = 700, minW = 24) {
      const rec = rEls.get(id);
      if (!rec) return Promise.resolve();
      const pts = [];
      for (let s = 0; s <= 24; s++) { const p = rec.line.getPointAtLength((rec.len - 2) * (s / 24)); pts.push([p.x, p.y]); }
      const b = bboxOf(pts);
      return moveCam({ ...fit(b, 0.3, minW), __b: b, __pad: 0.3, __min: minW }, dur);
    },
    endpoints(id, reversed) {
      const rec = rEls.get(id);
      if (!rec) return null;
      const a = rec.line.getPointAtLength(0), b = rec.line.getPointAtLength(rec.len - 2);
      return reversed ? [[b.x, b.y], [a.x, a.y]] : [[a.x, a.y], [b.x, b.y]];
    },
  };
  return api;
}
