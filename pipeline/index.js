// Itinerary pipeline: five steps, each with its own swappable provider/model (see pipeline/config.json).
//
//   1 candidates  rules      filter routes by mode, month, fitness, length          (no model)
//   2 score       Jev score  how well each candidate fits the traveller             (1 request)
//   3 select      Jev choice which pre-built feasible combination is best           (1 request)
//   4 write       writer LLM turn the fixed plan into day-by-day text (EN + 中文)   (mock for now)
//   5 validate    rules + Jev noul  time / season / transport sanity checks          (1 request)
//                 → if a check fails, step 3's next-best option is re-planned once.
//
// Nothing about the traveller is stored: the request lives only for the duration of this call.

import { readFileSync } from 'node:fs';
import { ROUTES, REGIONS, HUBS } from '../public/data/routes.js';
import { createJev } from './providers/jev.js';
import { createHeuristic } from './providers/heuristic.js';
import { createWriter } from './providers/writers.js';

const CONFIG = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function seasonOf(month) {
  if ([12, 1, 2].includes(month)) return 'summer';
  if ([3, 4, 5].includes(month)) return 'autumn';
  if ([6, 7, 8].includes(month)) return 'winter';
  return 'spring';
}

// Month windows stricter than the season tags, taken from the cited season notes
// (DOC Great Walks seasons 2026/27; DOC Heaphy bike window; reported Roys Peak lambing closure).
const MONTH_WINDOWS = {
  'milford-track': [11, 12, 1, 2, 3, 4],
  'routeburn-track': [11, 12, 1, 2, 3, 4],
  'kepler-track': [11, 12, 1, 2, 3, 4],
  'heaphy-bike': [5, 6, 7, 8, 9, 10, 11],
  'roys-peak': [12, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'tongariro-northern-circuit': [10, 11, 12, 1, 2, 3, 4],
  'tongariro-crossing': [11, 12, 1, 2, 3, 4],
};
// Routes that cover the same ground — keep at most one per group in a plan.
const SAME_GROUP = {
  'heaphy-track': 'heaphy', 'heaphy-bike': 'heaphy',
  'milford-road': 'milford-sound', 'milford-coach': 'milford-sound',
  'tranzalpine': 'chch-grey', 'arthurs-pass': 'chch-grey',
  'kaikoura-coast': 'kaikoura', 'coastal-pacific': 'kaikoura',
  'tongariro-crossing': 'tongariro', 'tongariro-northern-circuit': 'tongariro',
  'desert-road': 'desert-road', 'northern-explorer': 'desert-road',
};
const PLANNER_SKIP = new Set(['cook-strait']);
const FITNESS_MAX = { easy: 2, moderate: 3, fit: 5 };
const MODES = ['hike', 'bike', 'drive', 'transit'];
const INTERESTS = ['alpine', 'coast', 'lakes', 'forest', 'wildlife', 'history', 'food', 'stars', 'waterfalls', 'glaciers'];

function stepCfg(step) {
  const base = CONFIG.steps[step];
  const env = process.env;
  const key = step.toUpperCase();
  return {
    ...base,
    provider: env[`PIPELINE_${key}_PROVIDER`] || base.provider,
    model: env[`PIPELINE_${key}_MODEL`] || base.model,
  };
}

function judge(name) {
  if (name === 'jev') return createJev(CONFIG.providers.jev);
  return createHeuristic();
}

// ── Input ────────────────────────────────────────────────────────────────
export function normalizeProfile(input) {
  const p = input && typeof input === 'object' ? input : {};
  const days = Math.max(2, Math.min(21, Math.round(Number(p.days) || 7)));
  const modes = (Array.isArray(p.modes) ? p.modes : []).filter((m) => MODES.includes(m));
  const interests = (Array.isArray(p.interests) ? p.interests : []).filter((m) => INTERESTS.includes(m)).slice(0, 6);
  const month = Math.max(1, Math.min(12, Math.round(Number(p.month) || 1)));
  return {
    days,
    modes: modes.length ? modes : ['hike', 'drive'],
    interests,
    fitness: ['easy', 'moderate', 'fit'].includes(p.fitness) ? p.fitness : 'moderate',
    pace: ['relaxed', 'balanced', 'packed'].includes(p.pace) ? p.pace : 'balanced',
    month,
    season: seasonOf(month),
    start: HUBS[p.start] ? p.start : 'christchurch',
    // Jev runs only when the traveller ticks the consent box; otherwise every step stays on this machine.
    useJev: p.useJev === true,
  };
}

function hasCar(profile) { return profile.modes.includes('drive'); }

function profileText(pr) {
  return `Traveller: ${pr.days} days in New Zealand in ${MONTH_NAMES[pr.month - 1]} (${pr.season} in NZ). `
    + `Wants to travel by: ${pr.modes.join(', ')}. Interests: ${pr.interests.join(', ') || 'open to anything'}. `
    + `Fitness: ${pr.fitness}. Preferred pace: ${pr.pace}. Starts in ${HUBS[pr.start].en}. `
    + `Has a car: ${hasCar(pr) ? 'yes' : 'no — public transport, trains, ferries and shuttles only'}.`;
}

function routeCard(r) {
  return `${r.name.en} — ${r.mode} in ${REGIONS[r.from].en}. ${r.distanceKm} km, ${r.duration.en}. `
    + `Difficulty ${r.difficulty}/5 (${r.grade.en}). Themes: ${r.tags.join(', ')}. `
    + `Highlights: ${r.highlights.en.join('; ')}. Season: ${r.seasonNote.en}`;
}

// ── Geography helpers (editorial road-time estimates between region hubs, in hours by car) ──
// Straight-line distance is useless here (the Southern Alps sit between the coasts), so transfers
// run over a small road graph. Public transport is assumed ~25% slower. All values are estimates.
const ROAD_EDGES = [
  ['nelson', 'marlborough', 2], ['nelson', 'buller', 3], ['buller', 'westcoast', 1.5], ['buller', 'canterbury', 4.5],
  ['westcoast', 'glaciers', 2.5], ['westcoast', 'canterbury', 3.5], ['glaciers', 'lakes', 4.5],
  ['marlborough', 'kaikoura', 2], ['kaikoura', 'canterbury', 2.5], ['canterbury', 'mackenzie', 3],
  ['canterbury', 'otago', 4.5], ['mackenzie', 'lakes', 2.5], ['mackenzie', 'otago', 2.5],
  ['lakes', 'fiordland', 2], ['lakes', 'otago', 3], ['lakes', 'southland', 2.5],
  ['fiordland', 'southland', 2], ['southland', 'otago', 3],
  // North Island, and the Cook Strait ferry (sailing plus check-in) joining the two islands.
  ['auckland', 'hauraki', 1.5], ['auckland', 'rotorua', 3], ['hauraki', 'rotorua', 2], ['auckland', 'ruapehu', 4.5],
  ['rotorua', 'ruapehu', 2], ['rotorua', 'urewera', 3.5], ['ruapehu', 'taranaki', 3], ['ruapehu', 'wellington', 4.5],
  ['taranaki', 'wellington', 4.5], ['wellington', 'marlborough', 4.5],
  // Added with the v3 North Island routes (approximate driving hours).
  ['auckland', 'northland', 3], ['rotorua', 'bayofplenty', 2], ['urewera', 'bayofplenty', 2.5],
  ['rotorua', 'hawkesbay', 3], ['hawkesbay', 'wellington', 4.5], ['hawkesbay', 'urewera', 2.5],
];
const ROAD = (() => {
  const keys = Object.keys(REGIONS);
  const dist = Object.fromEntries(keys.map((a) => [a, Object.fromEntries(keys.map((b) => [b, a === b ? 0 : Infinity]))]));
  for (const [a, b, h] of ROAD_EDGES) { dist[a][b] = h; dist[b][a] = h; }
  for (const k of keys) for (const i of keys) for (const j of keys) {
    if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  }
  return dist;
})();
function transferHours(a, b, car) {
  if (a === b) return 0;
  return Math.round(ROAD[a][b] * (car ? 1 : 1.25) * 2) / 2;
}
function transferUnits(hours) { // half-day units
  if (hours <= 1.5) return 0;
  if (hours <= 4) return 1;
  if (hours <= 7.5) return 2;
  return 3;
}
// Linear routes may be done in reverse, except where the source says one direction only.
const ONE_WAY = new Set(['milford-track', 'old-ghost-road']);
function reversed(r) {
  return { ...r, from: r.to, to: r.from, start: r.end, end: r.start, reversed: true };
}
const regionName = (k) => ({ en: REGIONS[k].en, zh: REGIONS[k].zh });

// ── Step 1: candidates ───────────────────────────────────────────────────
function stepCandidates(profile) {
  const maxD = FITNESS_MAX[profile.fitness];
  const list = ROUTES.filter((r) => !PLANNER_SKIP.has(r.id)
    && profile.modes.includes(r.mode)
    && r.seasons.includes(profile.season)
    && (!MONTH_WINDOWS[r.id] || MONTH_WINDOWS[r.id].includes(profile.month))
    && r.difficulty <= maxD
    && r.days <= profile.days - 1
    && (hasCar(profile) || r.carFree !== 'no'));
  // Cheap pre-rank so the Jev prompt stays small: interest overlap, then editorial rank.
  const pre = (r) => r.tags.filter((t) => profile.interests.includes(t)).length * 2 - r.rank * 0.2;
  return list.sort((a, b) => pre(b) - pre(a)).slice(0, CONFIG.planner.maxCandidates)
    .map((r) => ({ id: r.id, nameEn: r.name.en, card: routeCard(r), route: r }));
}

// ── Plan layout ──────────────────────────────────────────────────────────
function orderRoutes(routes, startRegion, car) {
  const left = [...routes];
  const out = [];
  let at = startRegion;
  while (left.length) {
    let best = null;
    for (let i = 0; i < left.length; i++) {
      const r = left[i];
      const opts = r.from !== r.to && !ONE_WAY.has(r.id) ? [r, reversed(r)] : [r];
      for (const o of opts) {
        const cost = transferHours(at, o.from, car) + transferHours(o.to, startRegion, car) * 0.05;
        if (!best || cost < best.cost) best = { cost, i, o };
      }
    }
    left.splice(best.i, 1);
    out.push(best.o);
    at = best.o.to;
  }
  return out;
}

function layout(routes, profile) {
  const car = hasCar(profile);
  const startRegion = HUBS[profile.start].region;
  const ordered = orderRoutes(routes, startRegion, car);
  const days = [];
  let cursor = 0; // half-days used
  let at = startRegion;
  let transferHalfDays = 0;
  const dayAt = (c) => {
    const i = Math.floor(c / 2);
    while (days.length <= i) days.push({ day: days.length + 1, items: [], region: at });
    return days[i];
  };
  for (const r of ordered) {
    const h = transferHours(at, r.from, car);
    if (h > 7.5) {
      // A long haul (e.g. across Cook Strait) is split into full travel days with a night on the way.
      if (cursor % 2) cursor += 1;
      const n = Math.ceil(h / 7);
      for (let k = 1; k <= n; k++) {
        dayAt(cursor).items.push({ type: 'transfer', from: at, to: r.from, fromName: regionName(at), toName: regionName(r.from), hours: Math.round((h / n) * 2) / 2, byCar: car, part: k, partOf: n, ferry: (REGIONS[at].island || 'south') !== (REGIONS[r.from].island || 'south') });
        if (k === n) at = r.from;
        dayAt(cursor).region = at;
        cursor += 2;
        transferHalfDays += 2;
      }
    } else if (h > 0) {
      const u = transferUnits(h);
      dayAt(cursor).items.push({ type: 'transfer', from: at, to: r.from, fromName: regionName(at), toName: regionName(r.from), hours: h, byCar: car });
      at = r.from;
      dayAt(cursor).region = at;
      cursor += u;
      transferHalfDays += u;
    }
    if (r.days < 1) {
      const d = dayAt(cursor);
      d.items.push({ type: 'route', id: r.id, route: r, part: 1, partOf: 1, reversed: !!r.reversed });
      d.region = r.to;
      cursor += 1;
    } else {
      if (cursor % 2) cursor += 1;
      const n = Math.ceil(r.days);
      for (let k = 1; k <= n; k++) {
        const d = dayAt(cursor);
        d.items.push({ type: 'route', id: r.id, route: r, part: k, partOf: n, reversed: !!r.reversed });
        d.region = k === n ? r.to : r.from;
        cursor += 2;
      }
    }
    at = r.to;
  }
  const usedDays = Math.ceil(cursor / 2);
  return { days, usedDays, transferDays: transferHalfDays / 2, endRegion: at, ordered };
}

function usableDays(profile) {
  const d = profile.days;
  if (profile.pace === 'relaxed') return d - Math.floor(d / 4);
  if (profile.pace === 'balanced') return d - Math.floor(d / 7);
  return d;
}

function finalizePlan(option, profile) {
  const L = layout(option.routes, profile);
  const days = L.days.slice(0, profile.days);
  while (days.length < profile.days) {
    const last = days[days.length - 1];
    const region = last ? last.region : HUBS[profile.start].region;
    days.push({ day: days.length + 1, items: [{ type: 'buffer', regionName: regionName(region) }], region });
  }
  return {
    optionKey: option.key,
    optionLabel: option.label,
    startName: { en: HUBS[profile.start].en, zh: HUBS[profile.start].zh },
    routeCount: option.routes.length,
    transferDays: L.transferDays,
    usedDays: L.usedDays,
    days: days.map((d) => ({ ...d, regionName: regionName(d.region) })),
  };
}

// ── Step 3 helper: build feasible combinations ───────────────────────────
const OPTION_LABELS = {
  A: { en: 'Best matches', zh: '最佳匹配' },
  B: { en: 'Fewer transfers', zh: '少折腾' },
  C: { en: 'Mixed modes', zh: '多种玩法' },
  D: { en: 'Easy-going', zh: '轻松版' },
};

function greedy(priority, profile, budget, maxDifficulty = 5) {
  const picked = [];
  const groups = new Set();
  for (const c of priority) {
    const r = c.route;
    if (r.difficulty > maxDifficulty) continue;
    const g = SAME_GROUP[r.id];
    if (g && groups.has(g)) continue;
    const trial = [...picked, r];
    if (layout(trial, profile).usedDays <= budget) {
      picked.push(r);
      if (g) groups.add(g);
    }
  }
  return picked;
}

function buildOptions(cands, scores, profile) {
  const budget = usableDays(profile);
  const s = (c) => scores[c.id]?.score ?? 0;
  const byScore = [...cands].sort((a, b) => s(b) - s(a));
  const startRegion = HUBS[profile.start].region;
  const car = hasCar(profile);
  const compact = [...cands].sort((a, b) => (s(b) - transferHours(startRegion, b.route.from, car) * 0.25) - (s(a) - transferHours(startRegion, a.route.from, car) * 0.25));
  const byMode = {};
  for (const c of byScore) (byMode[c.route.mode] ||= []).push(c);
  const mixed = [];
  for (let i = 0; mixed.length < byScore.length; i++) {
    let added = false;
    for (const m of Object.keys(byMode)) if (byMode[m][i]) { mixed.push(byMode[m][i]); added = true; }
    if (!added) break;
  }
  const raw = {
    A: greedy(byScore, profile, budget),
    B: greedy(compact, profile, budget),
    C: greedy(mixed, profile, budget),
    D: greedy(byScore, profile, Math.max(2, Math.floor(budget * 0.8)), 3),
  };
  const seen = new Set();
  const options = [];
  for (const [key, routes] of Object.entries(raw)) {
    if (!routes.length) continue;
    const sig = routes.map((r) => r.id).sort().join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    const L = layout(routes, profile);
    const avgScore = routes.reduce((a, r) => a + (scores[r.id]?.score ?? 0), 0) / routes.length;
    const tags = new Set(routes.flatMap((r) => r.tags));
    const coverage = profile.interests.length ? profile.interests.filter((t) => tags.has(t)).length / profile.interests.length : 1;
    const spare = profile.days - L.usedDays;
    const summary = `Routes in order: ${L.ordered.map((r) => `${r.name.en} (${r.mode}, ${r.days} d, fit ${(scores[r.id]?.score ?? 0).toFixed(1)}/4)`).join('; ')}. `
      + `Transfers ≈ ${L.transferDays} days. Spare days: ${spare}. Interests covered: ${Math.round(coverage * 100)}%.`;
    options.push({ key, label: OPTION_LABELS[key], routes, avgScore, coverage, transferDays: L.transferDays, fill: L.usedDays / profile.days, summary });
    if (options.length >= CONFIG.planner.maxOptions) break;
  }
  return options;
}

// ── Step 5 helpers ───────────────────────────────────────────────────────
function ruleChecks(plan, profile) {
  const routes = plan.days.flatMap((d) => d.items.filter((i) => i.type === 'route').map((i) => i.route));
  return {
    time_enough: plan.usedDays <= profile.days,
    season_ok: routes.every((r) => r.seasons.includes(profile.season) && (!MONTH_WINDOWS[r.id] || MONTH_WINDOWS[r.id].includes(profile.month))),
    transport_connects: hasCar(profile) || routes.every((r) => r.carFree !== 'no'),
  };
}

function itineraryText(plan, profile) {
  const car = hasCar(profile);
  const lines = [
    `Travel month: ${MONTH_NAMES[profile.month - 1]} (${profile.season} in New Zealand). Trip length: ${profile.days} days.`,
    `Transport: ${car ? 'own car (self-drive) for all transfers' : 'no car — coaches, trains, ferries and track shuttles only'}. Starts in ${HUBS[profile.start].en}.`,
    'Planner assumptions: transfers under 1.5 h are folded into the same day; trailhead shuttles and boats are booked separately; multi-day walks and rides sleep in huts or towns along the route; transfer times are estimates.',
  ];
  const described = new Set();
  for (const d of plan.days) {
    let hours = 0;
    const bits = d.items.map((it) => {
      if (it.type === 'transfer') {
        hours += it.hours;
        return `Transfer ${it.fromName.en} → ${it.toName.en} by ${it.byCar ? 'car' : 'public transport'} (about ${it.hours} h${it.partOf > 1 ? `, travel day ${it.part} of ${it.partOf}, overnight on the way` : ''}${it.ferry ? ', including the Cook Strait ferry' : ''}).`;
      }
      if (it.type === 'buffer') return 'Spare day (no plans).';
      const r = it.route;
      hours += r.days < 1 ? 3.5 : 6;
      if (described.has(r.id)) return `${r.name.en}: day ${it.part} of ${it.partOf} (continuing).`;
      described.add(r.id);
      const access = car ? '' : ` Car-free access: ${r.carFree}.`;
      return `${r.name.en} (${r.mode}), day ${it.part} of ${it.partOf}: ${r.start.en} → ${r.end.en}; ${r.duration.en}.${access} Season: ${r.seasonNote.en}`;
    });
    lines.push(`Day ${d.day} (≈${hours} h of travel and activity): ${bits.join(' ')}`);
  }
  return lines.join('\n');
}

// ── Orchestrator ─────────────────────────────────────────────────────────
// Typed errors the page can explain in both languages.
export function errorKind(err) {
  const c = err?.code || '';
  if (c === 'no_key') return 'key_unavailable';
  if (c === 'rate_capped' || c === 'http_429') return 'rate_limited';
  if (/^http_/.test(c) || err?.name === 'AbortError' || /fetch|network|timeout/i.test(err?.message || '')) return 'provider_error';
  return 'invalid_response';
}
async function withFallback(step, fn, { allowJev = false } = {}) {
  const base = stepCfg(step);
  const cfg = !allowJev && base.provider === 'jev' ? { ...base, provider: 'heuristic', model: 'heuristic-v1', consentOff: true } : base;
  const t0 = Date.now();
  try {
    const out = await fn(judge(cfg.provider), cfg.model);
    return { out, trace: { step, provider: cfg.provider, model: out.meta?.model || cfg.model, ms: Date.now() - t0, usage: out.meta?.usage || null, costUsd: out.meta?.costUsd ?? 0, fallback: false, ...(cfg.consentOff ? { note: 'consent off' } : {}) } };
  } catch (err) {
    const fb = cfg.fallback || 'heuristic';
    const out = await fn(judge(fb), 'heuristic-v1');
    return { out, trace: { step, provider: fb, model: 'heuristic-v1', ms: Date.now() - t0, usage: null, costUsd: 0, fallback: true, reason: errorKind(err) } };
  }
}

export async function runPipeline(input) {
  const profile = normalizeProfile(input);
  const trace = [];
  const pText = profileText(profile);

  // 1 candidates
  const t1 = Date.now();
  const cands = stepCandidates(profile);
  trace.push({ step: 'candidates', provider: 'rules', model: 'deterministic-filter', ms: Date.now() - t1, note: `${cands.length} routes` });
  if (!cands.length) return { profile, error: 'no_candidates', trace };

  // 2 score
  const sc = await withFallback('score', (p, model) => p.score({ model, profile, profileText: pText, candidates: cands }), { allowJev: profile.useJev });
  trace.push(sc.trace);
  const scores = sc.out.scores;

  // 3 select
  const options = buildOptions(cands, scores, profile);
  if (!options.length) return { profile, error: 'no_options', trace };
  const sel = await withFallback('select', (p, model) => p.select({ model, profileText: pText, options }), { allowJev: profile.useJev });
  trace.push({ ...sel.trace, note: `${options.length} options` });
  const ranked = [...options].sort((a, b) => (sel.out.probabilities?.[b.key] ?? 0) - (sel.out.probabilities?.[a.key] ?? 0));
  let chosen = options.find((o) => o.key === sel.out.choice) || ranked[0];

  // 4 write + 5 validate (with one re-plan if validation fails)
  let plan, doc, checks, attempts = 0;
  const tried = new Set();
  while (true) {
    tried.add(chosen.key);
    plan = finalizePlan(chosen, profile);

    const wcfg = stepCfg('write');
    const tw = Date.now();
    try {
      doc = await createWriter(wcfg.provider, CONFIG.providers).write({ plan, profile, model: wcfg.model });
      trace.push({ step: 'write', provider: wcfg.provider, model: doc.meta?.model || wcfg.model, ms: Date.now() - tw, usage: doc.meta?.usage || null, costUsd: doc.meta?.costUsd ?? 0, fallback: false });
    } catch (err) {
      doc = await createWriter('mock', CONFIG.providers).write({ plan, profile });
      trace.push({ step: 'write', provider: 'mock', model: 'mock-writer-v1', ms: Date.now() - tw, fallback: true, reason: err.code || err.message });
    }

    const rules = ruleChecks(plan, profile);
    const v = await withFallback('validate', (p, model) => p.validate({ model, itineraryText: itineraryText(plan, profile), ruleChecks: rules }), { allowJev: profile.useJev });
    trace.push(v.trace);
    const th = CONFIG.planner.validationThreshold;
    checks = Object.fromEntries(Object.entries(v.out.checks).map(([k, p]) => [k, { model: p, rule: rules[k], pass: rules[k] && (p == null || p >= th) }]));
    const allPass = Object.values(checks).every((c) => c.pass);
    if (allPass || attempts >= CONFIG.planner.maxRetries) break;
    const next = ranked.find((o) => !tried.has(o.key));
    if (!next) break;
    attempts++;
    trace.push({ step: 'replan', provider: 'rules', model: 'next-best-option', ms: 0, note: `validation failed → option ${next.key}` });
    chosen = next;
  }

  const costUsd = trace.reduce((a, t) => a + (t.costUsd || 0), 0);
  const jevCalls = trace.filter((t) => t.provider === 'jev' && !t.fallback).length;
  return {
    profile,
    chosen: { key: chosen.key, label: chosen.label },
    options: options.map((o) => ({ key: o.key, label: o.label, routes: o.routes.map((r) => r.id), probability: sel.out.probabilities?.[o.key] ?? null })),
    scores: Object.fromEntries(cands.map((c) => [c.id, scores[c.id]?.score ?? null])),
    plan: { ...plan, days: plan.days.map((d) => ({ day: d.day, regionName: d.regionName, items: d.items.map((it) => (it.type === 'route' ? { type: 'route', id: it.id, part: it.part, partOf: it.partOf, reversed: it.reversed } : { ...it })) })) },
    text: { en: doc.en, zh: doc.zh },
    checks,
    trace,
    cost: { usd: costUsd, jevCalls },
  };
}

export function pipelineInfo() {
  return Object.fromEntries(Object.keys(CONFIG.steps).map((k) => [k, (({ provider, model, fallback }) => ({ provider, model, fallback }))(stepCfg(k))]));
}
