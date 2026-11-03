// Trip finder: from the town a traveller starts in, to the places they want, and back to where they leave from.
// Plain rules, no model: shortest roads between towns (Dijkstra), the best order to visit the places (exhaustive up
// to eight stops, otherwise nearest-first then 2-opt), then the days packed so no day drives more than the pace
// allows. Nothing is invented: every leg names its road and time, every stop its reasons (why.js).
import { NODES, EDGES, WISHES } from '../data/roads.js';
import { ROUTES } from '../data/routes.js';

const byRoute = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
export const wishById = Object.fromEntries(WISHES.map((w) => [w.id, w]));
export const PACE = { relaxed: 3.5, balanced: 5, packed: 6.5 }; // most hours on the road in a day
const PT_SLOW = 1.3; // coach and shuttle vs driving yourself (trains and ferries use their own times)
const HALF = 3; // a half-day stop counts as three hours of the day
// Domestic flights between airports: hours in the air, plus 2½ h for getting to the airport, security and bags.
const FLIGHTS = [['auckland', 'christchurch', 1.5], ['auckland', 'queenstown', 1.75], ['auckland', 'dunedin', 1.75], ['auckland', 'nelson', 1.25],
  ['wellington', 'christchurch', 1], ['wellington', 'queenstown', 1.5], ['wellington', 'nelson', 0.5], ['wellington', 'dunedin', 1.25],
  ['christchurch', 'queenstown', 1], ['auckland', 'wellington', 1], ['rotorua', 'christchurch', 1.5], ['auckland', 'rotorua', 0.75]];
const FLY_EXTRA = 2.5;
const NORTH = new Set(['auckland', 'wellington', 'paihia', 'hahei', 'matamata', 'waitomo', 'rotorua', 'taupo', 'national-park', 'napier', 'new-plymouth']);

function graph(car, fly) {
  const adj = Object.fromEntries(Object.keys(NODES).map((k) => [k, []]));
  for (const [a, b, h, km, road, pt, ptH] of EDGES) {
    if (!car && !pt) continue;
    const t = car ? h : ptH ?? (pt === 'train' || pt === 'ferry' ? h : Math.round(h * PT_SLOW * 4) / 4);
    const e = { h: t, km, road, pt: car && pt !== 'ferry' ? 'car' : pt };
    adj[a].push({ ...e, a, b }); adj[b].push({ ...e, a: b, b: a });
  }
  // With a rental car, fly only between the islands (the car stays on its island); without one, any flight helps.
  if (fly) for (const [a, b, h] of FLIGHTS.filter(([a, b]) => !car || NORTH.has(a) !== NORTH.has(b))) {
    const e = { h: h + FLY_EXTRA, km: 0, road: { en: 'Domestic flight', zh: '国内航班' }, pt: 'flight', air: h };
    adj[a].push({ ...e, a, b }); adj[b].push({ ...e, a: b, b: a });
  }
  return adj;
}

function dijkstra(adj, src) {
  const dist = { [src]: 0 }, prev = {}, todo = new Set(Object.keys(adj));
  while (todo.size) {
    let u = null;
    for (const k of todo) if (dist[k] != null && (u == null || dist[k] < dist[u])) u = k;
    if (u == null) break;
    todo.delete(u);
    for (const e of adj[u]) if (dist[e.b] == null || dist[u] + e.h < dist[e.b]) { dist[e.b] = dist[u] + e.h; prev[e.b] = e; }
  }
  return { dist, prev };
}

function makeNet(car, fly) {
  const adj = graph(car, fly), memo = {};
  const from = (s) => (memo[s] ||= dijkstra(adj, s));
  return {
    hours: (a, b) => (a === b ? 0 : from(a).dist[b] ?? Infinity),
    path: (a, b) => {
      const { prev } = from(a), legs = [];
      for (let n = b; n !== a; n = prev[n].a) legs.unshift(prev[n]);
      return legs;
    },
  };
}

function bestOrder(net, start, end, stops) {
  const cost = (order) => order.reduce((s, x, i) => s + net.hours(i ? order[i - 1].base : start, x.base), 0) + net.hours(order.length ? order[order.length - 1].base : start, end);
  if (stops.length <= 8) {
    let best = null, bestC = Infinity;
    const perm = (rest, acc, c) => {
      if (c >= bestC) return;
      if (!rest.length) { const t = c + net.hours(acc.length ? acc[acc.length - 1].base : start, end); if (t < bestC) { bestC = t; best = acc; } return; }
      const at = acc.length ? acc[acc.length - 1].base : start;
      rest.forEach((x, i) => perm([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x], c + net.hours(at, x.base)));
    };
    perm(stops, [], 0);
    return { order: best || [], hours: bestC };
  }
  // Nearest first, then 2-opt.
  let at = start, rest = [...stops], order = [];
  while (rest.length) { rest.sort((x, y) => net.hours(at, x.base) - net.hours(at, y.base)); order.push(rest.shift()); at = order[order.length - 1].base; }
  for (let improved = true; improved;) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) for (let j = i + 1; j < order.length; j++) {
      const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
      if (cost(cand) + 1e-9 < cost(order)) { order = cand; improved = true; }
    }
  }
  return { order, hours: cost(order) };
}

const SEASON = (m) => (m === 12 || m <= 2 ? 'summer' : m <= 5 ? 'autumn' : m <= 8 ? 'winter' : 'spring');
const ALPINE = new Set(['arthurs-pass|greymouth', 'christchurch|arthurs-pass', 'haast|wanaka', 'te-anau|milford', 'wanaka|twizel', 'queenstown|twizel', 'wanaka|queenstown', 'taupo|wellington']);
const ALPINE_WISH = new Set(['milford', 'arthurs-pass', 'haast', 'tongariro']);
const alpine = (l) => ALPINE.has(`${l.a}|${l.b}`) || ALPINE.has(`${l.b}|${l.a}`);

function build(input, wishes) {
  const { start, end, car, fly, pace } = input;
  const net = makeNet(car, fly);
  const cap = PACE[pace] || PACE.balanced;
  const reach = wishes.filter((w) => net.hours(start, w.base) < Infinity && net.hours(w.base, end) < Infinity && (car || w.pt !== false));
  const unreachable = wishes.filter((w) => !reach.includes(w));
  const { order, hours } = bestOrder(net, start, end, reach);

  // A stream of things to do, then packed into days.
  const stream = [];
  let at = start;
  for (const w of order) {
    for (const l of net.path(at, w.base)) stream.push({ t: 'leg', l });
    stream.push(w.days < 1 ? { t: 'half', w } : { t: 'full', w, n: Math.round(w.days) });
    at = w.base;
  }
  for (const l of net.path(at, end)) stream.push({ t: 'leg', l });

  const days = [{ kind: 'arrive', at: start, legs: [], acts: [], used: 0, limit: 0 }]; // landing day: no driving
  const open = () => { const d = { kind: 'go', at: days[days.length - 1].at, legs: [], acts: [], used: 0, limit: cap + 1.5 }; days.push(d); return d; };
  let day = days[0];
  for (const s of stream) {
    if (s.t === 'full') {
      for (let k = 0; k < s.n; k++) days.push({ kind: 'stay', at: s.w.base, legs: [], acts: [{ w: s.w, part: k, of: s.n }], used: 0, limit: 0 });
      day = days[days.length - 1];
      continue;
    }
    const cost = s.t === 'leg' ? (s.l.pt === 'flight' ? s.l.h + 1 : s.l.h) : HALF;
    if (day.used + cost > day.limit && (day.used > 0 || day.kind !== 'go')) day = open();
    if (s.t === 'leg') { day.legs.push(s.l); day.at = s.l.b; } else day.acts.push({ w: s.w, part: 0, of: 1 });
    day.used += cost;
    if (s.t === 'leg' && s.l.h > cap + 1.5) day.long = true;
  }
  days.push({ kind: 'depart', at: end, legs: [], acts: [], used: 0 });

  const legs = days.flatMap((d) => d.legs);
  return {
    days, order, unreachable,
    totals: { days: days.length, hours: Math.round(legs.filter((l) => l.pt !== 'flight').reduce((s, l) => s + l.h, 0) * 2) / 2, km: legs.reduce((s, l) => s + (l.km || 0), 0), flights: legs.filter((l) => l.pt === 'flight').length },
    roadHours: hours,
    naiveHours: reach.reduce((s, w, i) => s + net.hours(i ? reach[i - 1].base : start, w.base), 0) + net.hours(reach.length ? reach[reach.length - 1].base : start, end),
  };
}

// Extra days go first where weather decides the day (fiords, glaciers, alpine crossings), then where there is most to do.
function addSpare(plan, spare) {
  const prefer = [...plan.order.filter((w) => w.weather), ...[...plan.order].sort((a, b) => (b.routes.length + b.places.length) - (a.routes.length + a.places.length))];
  const seen = new Set();
  const queue = prefer.filter((w) => !seen.has(w.id) && seen.add(w.id));
  let i = 0;
  while (spare > 0 && queue.length) {
    const w = queue[i % queue.length];
    const idx = plan.days.map((d) => d.at === w.base && (d.kind === 'stay' || d.acts.some((a) => a.w === w))).lastIndexOf(true);
    plan.days.splice(idx + 1, 0, { kind: 'spare', at: w.base, legs: [], acts: [], weather: !!w.weather, w });
    spare--; i++;
  }
  if (spare > 0) for (; spare > 0; spare--) plan.days.splice(plan.days.length - 1, 0, { kind: 'spare', at: plan.days[plan.days.length - 1].at, legs: [], acts: [] });
  plan.totals.days = plan.days.length;
}

export function planTrip(input) {
  const wishes = input.wishes.map((id) => wishById[id]).filter(Boolean);
  const plan = build(input, wishes);
  const warnings = [];
  const over = plan.totals.days - input.days;
  if (over > 0) {
    // Which single place, if dropped, saves the most days?
    const tries = plan.order.map((w) => ({ w, d: build(input, plan.order.filter((x) => x !== w)).totals.days })).sort((a, b) => a.d - b.d);
    const faster = input.pace !== 'packed' ? build({ ...input, pace: 'packed' }, plan.order).totals.days : Infinity;
    warnings.push({ type: 'short', need: plan.totals.days, have: input.days, drop: tries[0] && tries[0].d < plan.totals.days ? { w: tries[0].w, days: tries[0].d } : null, packed: faster <= input.days ? faster : null });
  } else if (over < 0) addSpare(plan, -over);
  if (plan.unreachable.length) warnings.push({ type: 'unreachable', list: plan.unreachable, car: input.car });

  const season = SEASON(input.month);
  const closed = [];
  for (const w of plan.order) for (const id of (input.car ? w.routes : w.ptRoutes || w.routes)) {
    const r = byRoute[id];
    if (r && !r.seasons.includes(season)) closed.push(r);
  }
  if (closed.length) warnings.push({ type: 'season', season, routes: closed });
  const legs = plan.days.flatMap((d) => d.legs);
  const passWishes = plan.order.filter((w) => ALPINE_WISH.has(w.id));
  if (season === 'winter' && input.car && (legs.some(alpine) || passWishes.length)) warnings.push({ type: 'winter', legs: legs.filter(alpine), wishes: passWishes });
  if (input.car && legs.some((l) => l.pt === 'flight')) warnings.push({ type: 'carflight' });
  if (legs.some((l) => l.pt === 'ferry' && l.km === 0 && (l.a === 'picton' || l.b === 'picton'))) warnings.push({ type: 'ferry' });
  if (plan.days.some((d) => d.long)) warnings.push({ type: 'long' });
  if (plan.naiveHours > plan.roadHours + 1) warnings.push({ type: 'order', saved: Math.round((plan.naiveHours - plan.roadHours) * 2) / 2 });

  plan.days.forEach((d, i) => { d.n = i + 1; });
  return { ...plan, warnings, input };
}

// Routes and places to do at a stop, by car or without one.
export const actsFor = (w, car) => ({ routes: (car ? w.routes : w.ptRoutes || w.routes).filter((id) => byRoute[id]), places: w.places });
export { NODES, WISHES };
