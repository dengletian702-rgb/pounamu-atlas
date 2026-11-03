import { ROUTES, REGIONS, HUBS, SOURCES } from '../data/routes.js';
import { PREPARE, FACTS, FAQ, RESERVED } from '../data/guide.js';
import { LANGS, strings, pick } from './i18n.js';
import { createMap, MODE_COLOR, routeThumb } from './map.js';
import { ART } from './art.js';
import { GEAR } from './gear.js';
import { V3 } from './i18n-v3.js';
import { V4 } from './i18n-v4.js';
import { initMotion, motionOff } from './page-common.js';
import { V5 } from './i18n-v5.js';
import { NODES } from '../data/roads.js';
import { letter } from './lettering.js';
import { ITINERARIES, PERSONAS, STYLES } from '../data/itineraries.js';
import { PLACES } from '../data/places.js';
import { playIntro } from './intro.js';
import { whyFor, whyLine, whyList, tripWhy } from './why-view.js';
import { figure, photoFor, img, credit, allPhotos } from './photo.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MODES = ['hike', 'bike', 'drive', 'transit'];
const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
// The visitor's motion switch (page-common.js) wins over the system setting.
const reduceMotion = () => motionOff();
initMotion();

// Two views of one page: home (the trip finder, ready-made trips, preparation) and /routes (every route and list).
const VIEW = location.pathname.startsWith('/pounamu-atlas/routes') ? 'routes' : 'home';
document.body.dataset.view = VIEW;

// Browser-only storage. Every access is guarded: private windows may refuse it, and the page must still work.
const store = {
  get(k, d) { try { const v = localStorage.getItem(`mfn.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`mfn.${k}`, JSON.stringify(v)); } catch { /* ignore */ } },
};

const urlLang = new URLSearchParams(location.search).get('lang');
const NO_FILTERS = { island: 'all', mode: 'all', region: 'all', difficulty: 'all', season: 'all', length: 'all' };
const state = {
  lang: LANGS[urlLang]?.ready ? urlLang : store.get('lang', (navigator.language || '').startsWith('zh') ? 'zh' : 'en'),
  mode: 'hike',
  island: 'south',
  filters: { ...NO_FILTERS },
  result: null,
};
let T = strings(state.lang);
const L = (o) => pick(o, state.lang);

function dayShort(d) {
  if (state.lang === 'zh') return d < 1 ? '半天' : `${d} 天`;
  return d < 1 ? 'half day' : d === 1 ? '1 day' : `${d} days`;
}
const verifyMark = (r, field) => (r.verify?.includes(field) ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : '');
const onIsland = (r, isl) => r.island === isl || r.island === 'both';

// ── The hero map: the whole country, with one route at a time drawn out across it ──────
const heroMap = createMap($('#hero-map'), { routes: ROUTES, uid: 'h', compact: true, onSelect: (id) => openRoute(id) });
const HERO_TOUR = ['milford-track', 'tongariro-crossing', 'otago-rail-trail', 'northern-explorer', 'milford-road', 'timber-trail', 'tranzalpine', 'abel-tasman', 'great-lake-trail', 'alps-2-ocean'];
let heroIdx = 0, heroTimer = 0, heroOn = false;
function heroTour() {
  clearTimeout(heroTimer);
  if (VIEW === 'home' || !heroOn || atlasOpen() || reduceMotion()) return;
  const id = HERO_TOUR[heroIdx++ % HERO_TOUR.length];
  heroMap.journey([{ id }], {
    camera: false, pace: 0.9,
    onDone: () => { heroMap.highlight(id); heroTimer = setTimeout(heroTour, 2600); },
  });
}
new IntersectionObserver(([e]) => {
  heroOn = e.isIntersecting;
  if (heroOn) heroTimer = setTimeout(heroTour, 1800); else clearTimeout(heroTimer);
}, { threshold: 0.3 }).observe($('#hero-map'));

// ── The atlas: the map opens only when a route, a trip or "Map" is chosen ───────────────
let map = null; // built on first open, so the hidden dialog never has to measure itself
let lastFocus = null;
let context = ROUTES.map((r) => r.id);
let current = null; // { kind: 'route', id } | { kind: 'trip' } | { kind: 'overview', ids }
const atlas = $('#atlas');
const atlasOpen = () => !atlas.hidden;
function openAtlas() {
  if (!atlasOpen()) {
    lastFocus = document.activeElement;
    atlas.hidden = false;
    document.body.classList.add('atlas-open');
    clearTimeout(heroTimer);
    heroMap.stop();
  }
  if (!map) {
    map = createMap($('#map'), { routes: ROUTES, uid: 'a', onSelect: (id) => openRoute(id) });
    map.setLang(state.lang, T);
  }
  requestAnimationFrame(() => atlas.classList.add('is-in'));
}
function closeAtlas() {
  if (!atlasOpen()) return;
  map?.stop();
  atlas.classList.remove('is-in');
  atlas.hidden = true;
  document.body.classList.remove('atlas-open');
  current = null;
  lastFocus?.focus?.({ preventScroll: true });
  if (heroOn) heroTimer = setTimeout(heroTour, 1200);
}
$('#atlas-close').addEventListener('click', closeAtlas);
document.addEventListener('keydown', (e) => {
  if (!atlasOpen()) return;
  if (e.key === 'Escape') closeAtlas();
  if (e.key === 'Tab') { // keep focus inside the dialog
    const f = [...atlas.querySelectorAll('button, a[href], [tabindex="0"]')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

function detail(r) {
  const seasons = ['spring', 'summer', 'autumn', 'winter'].map((s) => `<span class="season${r.seasons.includes(s) ? ' on' : ''}">${esc(T.season[s])}</span>`).join('');
  const gear = r.gear.map((g) => `<li>${esc(GEAR[state.lang]?.[g] || GEAR.en[g] || g)}</li>`).join('');
  const src = r.sources.map((k) => `<a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[k].label)}</a>`).join('');
  return `<div class="detail">
    <dl class="facts-grid">
      <div><dt>${T.f.difficulty}</dt><dd><span class="pips" role="img" aria-label="${esc(T.diff[r.difficulty])}">${'●'.repeat(r.difficulty)}${'○'.repeat(5 - r.difficulty)}</span> ${esc(L(r.grade))}${verifyMark(r, 'grade')}</dd></div>
      <div><dt>${T.f.time}</dt><dd>${esc(L(r.duration))}${verifyMark(r, 'duration')}</dd></div>
      <div><dt>${T.f.carFree}</dt><dd>${esc(T.carFree[r.carFree])}</dd></div>
      <div><dt>${T.f.gear}</dt><dd><ul class="gear">${gear}</ul></dd></div>
    </dl>
    <div class="d-block"><h4>${T.f.season}</h4><p class="seasons">${seasons}</p><p>${esc(L(r.seasonNote))}${verifyMark(r, 'seasonNote')}${verifyMark(r, 'seasons')}</p></div>
    <p class="d-src"><span>${T.f.sources}:</span> ${src}</p>
  </div>`;
}

function openRoute(id, list) {
  const r = byId[id];
  if (!r) return;
  if (list) context = list;
  if (!context.includes(id)) context = ROUTES.map((x) => x.id);
  openAtlas();
  current = { kind: 'route', id };
  const i = context.indexOf(id);
  const prev = context[(i - 1 + context.length) % context.length], next = context[(i + 1) % context.length];
  const days = Math.max(Math.ceil(r.days), 1);
  const hl = L(r.highlights);
  $('#atlas-card').innerHTML = `
    ${figure(r.id, state.lang, { sizes: '460px', cls: 'ac-photo' })}
    <p class="ac-kicker"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(T.mode[r.mode])} · ${esc(T.island[r.island])} · ${esc(L(REGIONS[r.from]))}</p>
    <h2 id="atlas-h">${esc(L(r.name))}</h2>
    <ol class="ac-ends">
      <li><span class="end-ico s" aria-hidden="true">◆</span><span><small>${T.f.start}</small>${esc(L(r.start))}${verifyMark(r, 'start')}</span></li>
      <li><span class="end-ico e" aria-hidden="true"></span><span><small>${T.f.end}</small>${esc(L(r.end))}${verifyMark(r, 'end')}</span></li>
    </ol>
    <div class="odo" aria-hidden="true">
      <div><b id="odo-km">${r.distanceKm == null ? '0%' : '0'}</b><span>${r.distanceKm == null ? '' : `/ ${esc(T.km(r.distanceKm))}`}</span></div>
      <div class="odo-day" id="odo-day">${esc(T.a.day(1, days))}</div>
    </div>
    <p class="vh">${esc(T.f.distance)}: ${esc(T.km(r.distanceKm))}${r.verify?.includes('distanceKm') ? ` (${esc(T.verify)})` : ''}</p>
    <div class="prog" style="--c:${MODE_COLOR[r.mode]}"><span class="prog-fill" id="prog"></span></div>
    ${r.verify?.includes('distanceKm') ? `<p class="note">${esc(T.f.distance)}${verifyMark(r, 'distanceKm')}</p>` : ''}
    <p class="ac-ctl"><a class="btn btn-small btn-jade" href="/pounamu-atlas/r/${r.id}">${esc(V3[state.lang].openGuide)} →</a>
      <span class="ac-nav"><button type="button" class="link-btn" data-go="${prev}">← ${esc(T.a.prev)}</button><button type="button" class="link-btn" data-go="${next}">${esc(T.a.next)} →</button></span></p>
    <h3 class="ac-h">${esc(V3[state.lang].whyH)}</h3>
    ${whyList(whyFor(r.id), state.lang, T)}
    <h3 class="ac-h">${esc(T.a.along)}${verifyMark(r, 'highlights')}</h3>
    <ol class="along">${hl.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
    ${detail(r)}
    <p class="note ac-illus">${esc(T.a.illus)}</p>`;
  bindCard();
  $('#atlas-card').scrollTop = 0;
  $('#atlas-close').focus({ preventScroll: true });
  playRoute(r);
}
function playRoute(r) {
  const days = Math.max(Math.ceil(r.days), 1);
  const stops = [...$('#atlas-card').querySelectorAll('.along li')];
  const km = $('#odo-km'), day = $('#odo-day'), bar = $('#prog');
  stops.forEach((s) => s.classList.remove('on'));
  map.journey([{ id: r.id }], {
    onTick: (_, p) => {
      km.textContent = r.distanceKm == null ? `${Math.round(p * 100)}%` : (r.distanceKm * p).toFixed(r.distanceKm < 100 ? 1 : 0);
      day.textContent = T.a.day(Math.min(Math.floor(p * days) + 1, days), days);
      bar.style.width = `${(p * 100).toFixed(1)}%`;
      stops.forEach((s, i) => s.classList.toggle('on', p >= (i + 1) / (stops.length + 1)));
    },
    onDone: () => stops.forEach((s) => s.classList.add('on')),
  });
}
function bindCard() {
  const card = $('#atlas-card');
  card.querySelector('#replay')?.addEventListener('click', () => {
    if (current?.kind === 'route') playRoute(byId[current.id]);
    if (current?.kind === 'trip') playTrip();
    if (current?.kind === 'template') playTemplate(ITINERARIES.find((t) => t.id === current.id));
  });
  letter([$('#atlas-h')], state.lang);
  card.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => openRoute(b.dataset.go)));
}

function openOverview(ids, heading) {
  openAtlas();
  current = { kind: 'overview', ids };
  context = ids;
  map.home(900);
  map.show(ids);
  const groups = MODES.map((m) => [m, ids.map((id) => byId[id]).filter((r) => r.mode === m)]).filter(([, l]) => l.length);
  $('#atlas-card').innerHTML = `
    <p class="ac-kicker">${esc(T.wordmark)}</p>
    <h2 id="atlas-h">${esc(heading || T.a.overview)}</h2>
    <p class="note">${esc(T.mapDesc)}</p>
    ${groups.map(([m, list]) => `<h3 class="ac-h"><span class="dot" style="background:${MODE_COLOR[m]}"></span>${esc(T.mode[m])}</h3>
      <ul class="ac-list">${list.map((r) => `<li><button type="button" class="ac-pick" data-go="${r.id}"><span>${esc(L(r.name))}</span><small>${esc(T.island[r.island])}</small></button></li>`).join('')}</ul>`).join('')}`;
  bindCard();
  $('#atlas-close').focus({ preventScroll: true });
}
$('#bar-map').addEventListener('click', () => openOverview(ROUTES.map((r) => r.id)));
$('#hero-open').addEventListener('click', () => openOverview(ROUTES.map((r) => r.id)));
$('#cell-map').addEventListener('click', () => openOverview(ROUTES.filter((r) => r.mode === state.mode).map((r) => r.id), T.modeTitle[state.mode]));

// A planned trip: every route in order, with the transfers between them drawn as dashed hops.
function tripLegs(result) {
  const legs = [];
  let prevEnd = null;
  for (const s of tripSteps(result)) {
    const ends = map.endpoints(s.id, s.reversed);
    if (!ends) continue;
    if (prevEnd && Math.hypot(prevEnd[0] - ends[0][0], prevEnd[1] - ends[0][1]) > 3) legs.push({ link: [prevEnd, ends[0]] });
    legs.push({ id: s.id, reversed: s.reversed });
    prevEnd = ends[1];
  }
  return legs;
}
function openTrip() {
  if (!state.result) return;
  openAtlas();
  current = { kind: 'trip' };
  const doc = state.result.text[state.lang] || state.result.text.en;
  const steps = tripSteps(state.result);
  $('#atlas-card').innerHTML = `
    <p class="ac-kicker">${esc(T.a.trip)} · ${esc(T.slipTotal(steps.length, state.result.profile.days))}</p>
    <h2 id="atlas-h">${esc(doc.title)}</h2>
    <p class="note">${esc(doc.summary)}</p>
    <div class="odo" aria-hidden="true"><div><b id="odo-km">1</b><span>/ ${steps.length}</span></div><div class="odo-day" id="odo-day"></div></div>
    <div class="prog"><span class="prog-fill" id="prog"></span></div>
    <ol class="along trip-steps">${steps.map((s) => { const r = byId[s.id]; return `<li data-id="${r.id}"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span><button type="button" class="link-btn" data-go="${r.id}">${esc(L(r.name))}</button><small>${esc(dayShort(r.days))}</small></li>`; }).join('')}</ol>
    <p class="note ac-illus">${esc(T.a.illus)}</p>`;
  bindCard();
  context = steps.map((s) => s.id);
  $('#atlas-close').focus({ preventScroll: true });
  playTrip();
}
function playTrip() {
  const legs = tripLegs(state.result);
  const routeLegs = legs.filter((l) => l.id);
  const items = [...$('#atlas-card').querySelectorAll('.trip-steps li')];
  const bar = $('#prog'), num = $('#odo-km'), lab = $('#odo-day');
  let done = 0;
  map.journey(legs, {
    onLeg: (i, b) => {
      if (b.id) {
        const k = routeLegs.findIndex((l) => l === legs[i]);
        done = k;
        items.forEach((n, j) => { n.classList.toggle('on', j < k); n.classList.toggle('now', j === k); });
        num.textContent = String(k + 1);
        lab.textContent = T.a.leg(k + 1, routeLegs.length);
      } else lab.textContent = T.a.transfer;
    },
    onTick: (i, p, b) => { bar.style.width = `${(((b.id ? done : done + 0.5) + (b.id ? p : 0)) / routeLegs.length * 100).toFixed(1)}%`; },
    onDone: () => { items.forEach((n) => { n.classList.add('on'); n.classList.remove('now'); }); bar.style.width = '100%'; },
  });
}

// ── Ready-made trips: whole itineraries, each one playable on the atlas ──
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));
let tripPersona = 'all';
const tplRoutes = (t) => [...new Set(t.plan.flatMap((d) => d.routes))].filter((id) => byId[id]);
const yuan = (n) => `¥${n.toLocaleString('en-US')}`;
function legsFor(ids) {
  const legs = [];
  let prevEnd = null;
  for (const id of ids) {
    const ends = map.endpoints(id, false);
    if (!ends) continue;
    if (prevEnd && Math.hypot(prevEnd[0] - ends[0][0], prevEnd[1] - ends[0][1]) > 3) legs.push({ link: [prevEnd, ends[0]] });
    legs.push({ id });
    prevEnd = ends[1];
  }
  return legs;
}
function tripDays(t) {
  const V = V3[state.lang];
  return `<ol class="tt-days">${t.plan.map((d, i) => `<li>
    <span class="tt-dn">${esc(V.day(i + 1))}</span>
    <div><b>${esc(L(d.title))}</b>
      ${d.routes.length ? `<p class="tt-r">${d.routes.filter((id) => byId[id]).map((id) => `<a href="/pounamu-atlas/r/${id}"><span class="dot" style="background:${MODE_COLOR[byId[id].mode]}"></span>${esc(L(byId[id].name))}</a>`).join('')}</p>` : ''}
      ${d.places.length ? `<p class="tt-p">${d.places.map((id) => esc(L(placeById[id]?.name || { en: id }))).join(' · ')}</p>` : ''}
      <p class="tt-m">${d.night ? `${esc(V.night)}：${esc(L(d.night))} · ` : ''}${esc(V.driveH(d.drive))}${d.drive ? verifyMarkT(t, 'drive') : ''}</p>
    </div></li>`).join('')}</ol>`;
}
const verifyMarkT = (t, f) => (t.verify?.includes(f) ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : '');
function openTemplate(tid) {
  const t = ITINERARIES.find((x) => x.id === tid);
  if (!t) return;
  openAtlas();
  current = { kind: 'template', id: tid };
  const V = V3[state.lang];
  $('#atlas-card').innerHTML = `
    <p class="ac-kicker">${esc(V.tripsH)} · ${esc(V.days(t.days))}</p>
    <h2 id="atlas-h">${esc(L(t.title))}</h2>
    <p class="note">${esc(L(t.pitch))}</p>
    <div class="prog"><span class="prog-fill" id="prog"></span></div>
    ${tripDays(t)}
    <p class="note ac-illus">${esc(T.a.illus)}</p>`;
  bindCard();
  context = tplRoutes(t);
  $('#atlas-close').focus({ preventScroll: true });
  playTemplate(t);
}
// A ready-made trip as planner input: its days, first hub, the modes its routes use and the interests they cover most.
function loadTemplate(tid) {
  const t = ITINERARIES.find((x) => x.id === tid);
  if (!t) return;
  const ids = tplRoutes(t);
  const count = {};
  for (const id of ids) for (const g of byId[id].tags || []) if (INTERESTS.includes(g)) count[g] = (count[g] || 0) + 1;
  const interests = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  planInput = { ...planInput, days: t.days, start: t.start || planInput.start, modes: [...new Set(ids.map((id) => byId[id].mode))], interests: interests.length ? interests : planInput.interests };
  store.set('planInput', planInput);
  renderPlanForm();
  $('#plan').scrollIntoView({ behavior: 'smooth' });
  $('#plan-lead').textContent = V4[state.lang].loaded;
  $('#pf-go').focus({ preventScroll: true });
}
function playTemplate(t) {
  const legs = legsFor(tplRoutes(t));
  const bar = $('#prog');
  map.journey(legs, {
    onTick: (i, p) => { bar.style.width = `${(((i + p) / legs.length) * 100).toFixed(1)}%`; },
    onDone: () => { bar.style.width = '100%'; },
  });
}
function renderTrips() {
  const V = V3[state.lang];
  $('#trips-h').textContent = V.tripsH;
  $('#trips-lead').textContent = V.tripsLead;
  $('#trips-filter').innerHTML = ['all', ...PERSONAS].map((k) => `<button type="button" aria-pressed="${tripPersona === k}" data-persona="${k}">${esc(k === 'all' ? T.filters.any : V.persona[k])}</button>`).join('');
  const list = ITINERARIES.filter((t) => tripPersona === 'all' || t.personas.includes(tripPersona));
  $('#trips-list').innerHTML = list.map((t) => `<li class="tt" data-trip="${t.id}">
    <p class="tt-k">${esc(V.days(t.days))} · ${esc(t.island === 'both' ? `${T.island.south} + ${T.island.north}` : T.island[t.island])}<span>${t.personas.map((p) => esc(V.persona[p])).join(' · ')}</span></p>
    <h3>${esc(L(t.title))}</h3>
    <p class="tt-from">${esc(V5[state.lang].tripFrom(L(NODES[t.start]), L(NODES[t.end])))}</p>
    <p class="tt-pitch">${esc(L(t.pitch))}</p>
    <div class="tt-why"><p class="tt-why-h">${esc(V.whyTrip)}</p>${whyList(tripWhy([...tplRoutes(t), ...t.plan.flatMap((d) => d.places)]), state.lang, T)}</div>
    <table class="tt-cost"><caption>${esc(V.costH)}${verifyMarkT(t, 'cost')}</caption>
      <tbody>${STYLES.map((st) => `<tr><th scope="row">${esc(V.style[st])}</th><td>${yuan(t.cost[st][0])} – ${yuan(t.cost[st][1])}</td></tr>`).join('')}</tbody></table>
    <p class="tt-act"><button type="button" class="btn btn-small" data-play="${t.id}">${esc(V.playTrip)}</button>
      <a class="btn btn-small btn-quiet" href="/pounamu-atlas/trip?tpl=${t.id}">${esc(V4[state.lang].tripPage)}</a>
      <button type="button" class="link-btn" data-load="${t.id}">${esc(V5[state.lang].tripEdit)}</button>
      <button type="button" class="link-btn" data-days="${t.id}" aria-expanded="false">${esc(V.showDays)}</button></p>
    <div class="tt-more" hidden>${tripDays(t)}</div>
  </li>`).join('');
  $('#trips-note').textContent = V.costNote;
}
$('#trips-filter').addEventListener('click', (e) => {
  const k = e.target.closest('[data-persona]')?.dataset.persona;
  if (k) { tripPersona = k; renderTrips(); }
});
$('#trips-list').addEventListener('click', (e) => {
  const play = e.target.closest('[data-play]');
  if (play) { openTemplate(play.dataset.play); return; }
  const load = e.target.closest('[data-load]');
  if (load) {
    const t = ITINERARIES.find((x) => x.id === load.dataset.load);
    document.dispatchEvent(new CustomEvent('finder:load', { detail: { start: t.start, end: t.end, days: t.days, car: !t.personas.includes('carfree'), routes: tplRoutes(t), places: t.plan.flatMap((d) => d.places) } }));
    return;
  }
  const b = e.target.closest('[data-days]');
  if (!b) return;
  const more = b.closest('.tt').querySelector('.tt-more');
  more.hidden = !more.hidden;
  b.setAttribute('aria-expanded', String(!more.hidden));
  b.textContent = more.hidden ? V3[state.lang].showDays : V3[state.lang].hideDays;
});

// ── The reel: ten routes, one at a time, photo and reasons side by side; the sides swap each turn ──
const REEL = ['tongariro-crossing', 'milford-road', 'hooker-valley', 'mackenzie-route', 'coromandel-loop', 'tranzalpine', 'abel-tasman', 'otago-rail-trail', 'lake-matheson', 'roys-peak'].filter((id) => byId[id] && photoFor(id));
let reelI = 0, reelTimer = 0, reelPaused = reduceMotion(), reelHold = false;
function renderReel() {
  const V = V3[state.lang], r = byId[REEL[reelI]], p = photoFor(r.id);
  $('#reel-h').textContent = V.reelH;
  $('#reel-prev .vh').textContent = V.reelPrev;
  $('#reel-next .vh').textContent = V.reelNext;
  $('#reel-pause').textContent = reelPaused ? `▶ ${V.reelPlay}` : `❚❚ ${V.reelPause}`;
  $('#reel-stage').innerHTML = `<article class="reel-slide${reelI % 2 ? ' flip' : ''}" aria-roledescription="slide" aria-label="${esc(V.slide(reelI + 1, REEL.length))}">
    <figure class="ph reel-ph">${img(p, state.lang, { sizes: '(max-width: 899px) 100vw, 55vw' })}<figcaption>${credit(p, state.lang)}</figcaption></figure>
    <div class="reel-text" style="--c:${MODE_COLOR[r.mode]}">
      <p class="ac-kicker"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(T.mode[r.mode])} · ${esc(T.island[r.island])} · ${esc(L(REGIONS[r.from]))}</p>
      <h3>${esc(L(r.name))}</h3>
      ${whyList(whyFor(r.id).slice(0, 3), state.lang, T)}
      <p class="reel-facts">${r.distanceKm == null ? '' : `${esc(T.km(r.distanceKm))} · `}${esc(dayShort(r.days))} · ${esc(T.diff[r.difficulty])}</p>
      <p class="reel-act"><a class="btn btn-small" href="/pounamu-atlas/r/${r.id}">${esc(V.openGuide)} →</a></p>
    </div></article>`;
  $('#reel-dots').innerHTML = REEL.map((id, i) => `<li><button type="button" aria-label="${esc(L(byId[id].name))}" aria-current="${i === reelI}" data-reel="${i}"></button></li>`).join('');
}
function reelGo(i) { reelI = (i + REEL.length) % REEL.length; renderReel(); reelArm(); }
function reelArm() {
  clearTimeout(reelTimer);
  if (!reelPaused && !reelHold) reelTimer = setTimeout(() => reelGo(reelI + 1), 7000);
}
$('#reel-prev').addEventListener('click', () => reelGo(reelI - 1));
$('#reel-next').addEventListener('click', () => reelGo(reelI + 1));
$('#reel-pause').addEventListener('click', () => { reelPaused = !reelPaused; renderReel(); reelArm(); });
$('#reel-dots').addEventListener('click', (e) => { const b = e.target.closest('[data-reel]'); if (b) reelGo(Number(b.dataset.reel)); });
$('#reel-stage').addEventListener('click', (e) => { const b = e.target.closest('[data-reel-map]'); if (b) openRoute(b.dataset.reelMap, REEL); });
// Hover, focus or touch holds the current slide; a swipe moves it.
const reelEl = $('#reel');
for (const [ev, on] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) reelEl.addEventListener(ev, () => { reelHold = on; reelArm(); });
let swipeX = null;
reelEl.addEventListener('touchstart', (e) => { swipeX = e.touches[0].clientX; reelHold = true; reelArm(); }, { passive: true });
reelEl.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - (swipeX ?? 0);
  swipeX = null;
  reelHold = false;
  if (Math.abs(dx) > 50) reelGo(reelI + (dx < 0 ? 1 : -1)); else reelArm();
});
new IntersectionObserver(([e]) => { if (e.isIntersecting) reelArm(); else clearTimeout(reelTimer); }, { threshold: 0.4 }).observe(reelEl);

// ── Route lists ──────────────────────────────────────────────────────────
function routeCard(r, n) {
  return `<li><a class="card" href="/pounamu-atlas/r/${r.id}" style="--c:${MODE_COLOR[r.mode]}">
    <span class="card-n" aria-hidden="true"></span>
    <span class="card-thumb">${routeThumb(r, 120, 80)}</span>
    <span class="card-body"><span class="card-name">${esc(L(r.name))}</span>
      ${whyLine(r.id, state.lang)}
      <span class="card-se">${esc(L(r.start).split(/[(（,，]/)[0].trim())} → ${esc(L(r.end).split(/[(（,，]/)[0].trim())}</span></span>
    <span class="card-v">${r.distanceKm == null ? '' : `<span>${esc(T.km(r.distanceKm))}</span>`}<span>${esc(dayShort(r.days))}</span></span>
  </a></li>`;
}
function routeRow(r) {
  return `<li><a class="row" href="/pounamu-atlas/r/${r.id}">
    <span class="row-l">${routeThumb(r, 44, 28)}<span class="row-name">${esc(L(r.name))}${whyLine(r.id, state.lang)}</span></span>
    <span class="row-v">${r.distanceKm == null ? '' : `${esc(T.km(r.distanceKm))} · `}${esc(dayShort(r.days))}</span>
  </a></li>`;
}
function renderWays() {
  $('#mode-tabs').innerHTML = MODES.map((m) => `<button type="button" role="tab" class="tab" id="tab-${m}" aria-selected="${m === state.mode}" aria-controls="ways-copy" tabindex="${m === state.mode ? 0 : -1}">${esc(T.mode[m])}</button>`).join('');
  $('#ways-plate').innerHTML = ART[state.mode](T.modeTitle[state.mode]);
  $('#ways-h').textContent = T.modeTitle[state.mode];
  $('#ways-desc').textContent = T.modeDesc[state.mode];
  $('#cell-top').textContent = T.seeTop;
  $('#cell-map').textContent = T.showMap;
  $('#mode-tabs').querySelectorAll('.tab').forEach((b, i) => {
    b.addEventListener('click', () => setMode(MODES[i]));
    b.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      const n = MODES[(i + k + MODES.length) % MODES.length];
      setMode(n);
      $(`#tab-${n}`).focus();
    });
  });
}
function setMode(m) { state.mode = m; renderWays(); renderTop(); }

function renderTop() {
  $('#top-h').textContent = state.island === 'south' ? T.topTitle[state.mode] : T.topNorth[state.mode];
  $('#top-note').textContent = T.topNote;
  $('#island-seg').innerHTML = ['south', 'north'].map((k) => `<button type="button" aria-pressed="${state.island === k}" data-island="${k}">${esc(T.island[k])}</button>`).join('');
  const list = ROUTES.filter((r) => r.mode === state.mode && r.island === state.island).sort((a, b) => a.rank - b.rank);
  $('#top-list').innerHTML = list.map((r, i) => routeCard(r, i + 1)).join('');
}
$('#island-seg').addEventListener('click', (e) => {
  const k = e.target.closest('[data-island]')?.dataset.island;
  if (k && k !== state.island) { state.island = k; renderTop(); }
});

function filtered() {
  const f = state.filters;
  return ROUTES.filter((r) => (f.island === 'all' || onIsland(r, f.island))
    && (f.mode === 'all' || r.mode === f.mode)
    && (f.region === 'all' || r.from === f.region || r.to === f.region)
    && (f.difficulty === 'all' || (f.difficulty === 'easy' ? r.difficulty <= 2 : f.difficulty === 'mid' ? r.difficulty === 3 : r.difficulty >= 4))
    && (f.season === 'all' || r.seasons.includes(f.season))
    && (f.length === 'all' || (f.length === 'short' ? r.days <= 1 : f.length === 'mid' ? r.days > 1 && r.days <= 3 : r.days > 3)));
}

function renderFilters() {
  const f = state.filters, F = T.filters;
  const sel = (name, label, opts) => `<label class="fl"><span>${label}</span><select name="${name}">
    <option value="all">${F.any}</option>${opts.map(([v, t]) => `<option value="${v}"${f[name] === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const regions = Object.entries(REGIONS).filter(([, v]) => f.island === 'all' || v.island === f.island);
  $('#filters').innerHTML = [
    sel('island', F.island, [['north', T.island.north], ['south', T.island.south]]),
    sel('mode', F.mode, MODES.map((m) => [m, T.mode[m]])),
    sel('region', F.region, regions.map(([k, v]) => [k, L(v)])),
    sel('difficulty', F.difficulty, [['easy', `${T.diff[1]} / ${T.diff[2]}`], ['mid', T.diff[3]], ['hard', `${T.diff[4]} / ${T.diff[5]}`]]),
    sel('season', F.season, ['spring', 'summer', 'autumn', 'winter'].map((s) => [s, `${T.season[s]} (${T.seasonMonths[s]})`])),
    sel('length', F.length, Object.entries(T.lengths)),
  ].join('') + `<button type="reset" class="link-btn">${F.reset}</button>`;
}

function renderAll() {
  renderFilters();
  $('#all-h').textContent = T.allTitle;
  const list = filtered();
  $('#all-count').textContent = T.count(list.length);
  const groups = {};
  for (const r of list) (groups[r.from] ||= []).push(r);
  const isl = (k) => `<p class="isl-h">${esc(T.island[k])}</p>`;
  let lastIsland = null;
  $('#all-list').innerHTML = list.length
    ? `<div class="groups">${Object.keys(REGIONS).filter((k) => groups[k]).map((k) => {
      const head = REGIONS[k].island !== lastIsland ? isl(REGIONS[k].island) : '';
      lastIsland = REGIONS[k].island;
      return `${head}<div class="group"><h3 class="group-h">${esc(L(REGIONS[k]))}</h3><ul class="rows">${groups[k].sort((a, b) => MODES.indexOf(a.mode) - MODES.indexOf(b.mode) || a.rank - b.rank).map((r) => routeRow(r)).join('')}</ul></div>`;
    }).join('')}</div>`
    : `<p class="empty">${T.none}</p>`;
}

$('#filters').addEventListener('change', (e) => {
  state.filters[e.target.name] = e.target.value;
  if (e.target.name === 'island') state.filters.region = 'all';
  renderAll();
});
$('#filters').addEventListener('reset', (e) => {
  e.preventDefault();
  state.filters = { ...NO_FILTERS };
  renderAll();
});

function applyStatic() {
  document.documentElement.lang = LANGS[state.lang].html;
  document.title = `${T.wordmark} — ${T.h1}`;
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = T[n.dataset.t]; });
  const F = V5[state.lang];
  document.querySelectorAll('[data-n]').forEach((n) => { n.textContent = F.nav[n.dataset.n] || F[n.dataset.n]; });
  if (VIEW === 'routes') {
    $('#h1').textContent = F.routesH;
    $('.hero .lead').textContent = F.routesLead;
    document.title = `${T.wordmark} — ${F.routesH}`;
  }
  const lb = $('#lang');
  lb.textContent = T.langSwitch;
  lb.lang = state.lang === 'zh' ? 'en' : 'zh-Hans';
  lb.setAttribute('aria-label', state.lang === 'zh' ? 'Switch to English' : '切换到中文');
  $('#stats').innerHTML = T.stats(ROUTES.length, Object.keys(SOURCES).length).map(([n, l]) => `<li><b>${n}</b> <span>${esc(l)}</span></li>`).join('');
  $('#legend').innerHTML = MODES.map((m) => `<li><span class="key key-${m}" style="--c:${MODE_COLOR[m]}"></span>${esc(T.legend[m])}</li>`).join('');
  $('#atlas-close-t').textContent = T.a.close;
  heroMap.setLang(state.lang, T);
  map?.setLang(state.lang, T);
  $('#foot-about').textContent = T.footAbout;
  $('#foot-privacy').textContent = `© 2026 · ${T.footPrivacy}`;
  $('#foot-src').textContent = T.srcTitle;
}

// ── Planner ──────────────────────────────────────────────────────────────
const INTERESTS = ['alpine', 'coast', 'lakes', 'forest', 'wildlife', 'history', 'food', 'stars', 'waterfalls', 'glaciers'];
const planDefaults = { days: 10, month: new Date().getMonth() + 1, start: 'christchurch', modes: ['hike', 'drive'], interests: ['alpine', 'lakes', 'wildlife'], fitness: 'moderate', pace: 'balanced', useJev: false };
let planInput = { ...planDefaults, ...store.get('planInput', {}) };

// Whether a Jev key exists on this machine (yes/no only), so the consent box can say what will really happen.
let caps = null;
Promise.reject(new Error('static site')).then((r) => r.json()).then((c) => { caps = c; renderPlanForm(); }).catch(() => {});

function renderPlanForm() {
  const p = T.p, v = planInput;
  const chips = (name, list, labels, sel) => list.map((k) => `<label class="chip"><input type="checkbox" name="${name}" value="${k}"${sel.includes(k) ? ' checked' : ''}><span>${esc(labels[k])}</span></label>`).join('');
  const radios = (name, list, labels, sel) => list.map((k) => `<label class="chip"><input type="radio" name="${name}" value="${k}"${sel === k ? ' checked' : ''}><span>${esc(labels[k])}</span></label>`).join('');
  $('#plan-h').textContent = V5[state.lang].pickH;
  $('#plan-lead').textContent = T.planLead;
  $('#plan-form').innerHTML = `
    <div class="pf-row pf-days"><label for="pf-days">${p.days}</label><input id="pf-days" name="days" type="range" min="2" max="21" value="${v.days}"><output id="pf-days-out" for="pf-days">${v.days}</output></div>
    <div class="pf-pair">
      <label class="fl"><span>${p.month}</span><select name="month">${T.months.map((m, i) => `<option value="${i + 1}"${v.month === i + 1 ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      <label class="fl"><span>${p.start}</span><select name="start">${Object.entries(HUBS).map(([k, h]) => `<option value="${k}"${v.start === k ? ' selected' : ''}>${esc(L(h))}</option>`).join('')}</select></label>
    </div>
    <fieldset><legend>${p.modes}</legend><div class="chips">${chips('modes', MODES, T.mode, v.modes)}</div></fieldset>
    <fieldset><legend>${p.interests}</legend><div class="chips">${chips('interests', INTERESTS, T.interests, v.interests)}</div></fieldset>
    <div class="pf-pair">
      <fieldset><legend>${p.fitness}</legend><div class="chips">${radios('fitness', ['easy', 'moderate', 'fit'], T.fitness, v.fitness)}</div></fieldset>
      <fieldset><legend>${p.pace}</legend><div class="chips">${radios('pace', ['relaxed', 'balanced', 'packed'], T.pace, v.pace)}</div></fieldset>
    </div>
    <fieldset class="pf-consent"><label class="consent"><input type="checkbox" name="useJev"${v.useJev ? ' checked' : ''}><span>${esc(V4[state.lang].jevLabel)}</span></label>
      <p class="note">${esc(V4[state.lang].jevHelp)}${caps && !caps.jev ? ` ${esc(V4[state.lang].jevNoKey)}` : ''}</p></fieldset>
    <button class="btn" type="submit" id="pf-go">${p.go}</button>`;
  $('#pf-days').addEventListener('input', (e) => { $('#pf-days-out').textContent = e.target.value; });
}

function readPlanForm() {
  const fd = new FormData($('#plan-form'));
  return {
    days: Number(fd.get('days')), month: Number(fd.get('month')), start: fd.get('start'),
    modes: fd.getAll('modes'), interests: fd.getAll('interests'), fitness: fd.get('fitness'), pace: fd.get('pace'),
    useJev: fd.get('useJev') === 'on',
  };
}

$('#plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  planInput = readPlanForm();
  store.set('planInput', planInput);
  const btn = $('#pf-go');
  btn.disabled = true;
  btn.textContent = T.p.working;
  $('#slip-wrap').classList.add('is-busy');
  try {
    const res = await fetch('/api/itinerary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(planInput) });
    if (!res.ok) throw new Error(String(res.status));
    const result = await res.json();
    state.result = result;
    renderSlip(result);
  } catch {
    $('#slip-wrap').innerHTML = `<p class="empty">${T.planError}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = T.p.go;
    $('#slip-wrap').classList.remove('is-busy');
  }
});

function tripSteps(result) {
  const seen = new Set();
  const steps = [];
  for (const d of result.plan.days) for (const it of d.items) {
    if (it.type === 'route' && !seen.has(it.id)) { seen.add(it.id); steps.push({ id: it.id, reversed: it.reversed }); }
  }
  return steps;
}

function itemLabel(it) {
  if (it.type === 'route') {
    const r = byId[it.id];
    const right = it.partOf > 1 ? `${it.part}/${it.partOf}` : dayShort(r.days);
    return [L(r.name), right, MODE_COLOR[r.mode]];
  }
  if (it.type === 'transfer') return [`${L(it.fromName)} → ${L(it.toName)}`, state.lang === 'zh' ? `约${it.hours}小时` : `≈ ${it.hours} h`, null];
  return [state.lang === 'zh' ? '机动日' : 'Spare day', '—', null];
}

function fbReasons(result) {
  const E = V4[state.lang];
  const why = [...new Set(result.trace.filter((t) => t.fallback && E.err[t.reason]).map((t) => t.reason))];
  return why.length ? `<p class="note fb-why"><b>${esc(E.errH)}:</b> ${why.map((k) => esc(E.err[k])).join(' ')}</p>` : '';
}

function renderSlip(result, { fromSaved = false } = {}) {
  const wrap = $('#slip-wrap');
  if (result.error) { wrap.innerHTML = `<p class="empty">${T.noCands}</p>`; return; }
  const doc = result.text[state.lang] || result.text.en;
  const days = result.plan.days.map((d, i) => {
    const txt = doc.days[i];
    const rows = d.items.map((it) => {
      const [l, r, c] = itemLabel(it);
      return `<li class="slip-row"><span class="sl">${c ? `<span class="dot" style="background:${c}"></span>` : ''}${esc(l)}</span><span class="lead-dots" aria-hidden="true"></span><span class="sr">${esc(r)}</span></li>`;
    }).join('');
    return `<div class="slip-day"><h3>${esc(T.slipDay(d.day))} · ${esc(L(d.regionName))}</h3><ul>${rows}</ul>${txt?.body ? `<p>${esc(txt.body)}</p>` : ''}</div>`;
  }).join('');
  const checks = Object.entries(result.checks).map(([k, c]) => `<li class="chk ${c.pass ? 'ok' : 'warn'}"><span>${esc(T.checks[k])}</span><span>${c.pass ? T.pass : T.warn}${c.model != null ? ` · ${Math.round(c.model * 100)}%` : ''}</span></li>`).join('');
  const trace = result.trace.map((t) => `<li class="row"><span class="row-l">${esc(T.steps[t.step] || t.step)}</span><span class="row-v">${esc(t.provider === 'jev' ? `Jev · ${t.model}` : t.model)}${t.fallback ? ' *' : ''}</span></li>`).join('');
  const fb = result.trace.some((t) => t.fallback && t.step !== 'write');
  const routeCount = tripSteps(result).length;
  wrap.innerHTML = `
    <article class="slip">
      <h3 class="slip-title">${esc(doc.title)}</h3>
      <p class="slip-sum">${esc(doc.summary)}</p>
      ${days}
      <p class="slip-total"><span>${esc(T.slipTotal(routeCount, result.profile.days))}</span><span>${esc(L(result.chosen.label))}</span></p>
    </article>
    <div class="slip-side">
      <div><h3>${T.checksTitle}</h3><ul class="checks">${checks}</ul></div>
      <div><h3>${T.howTitle}</h3><ul class="rows trace">${trace}</ul>
      <p class="note">${esc(T.cost(result.cost.usd, result.cost.jevCalls))}${fb ? `<br>* ${esc(T.fallbackNote)}` : ''}</p>
      ${fbReasons(result)}
      <p class="slip-actions">${fromSaved ? '' : `<button type="button" class="btn btn-quiet" id="save-trip">${T.save}</button>`}<button type="button" class="btn btn-quiet" id="trip-map">${T.a.tripBtn}</button></p></div>
    </div>`;
  $('#trip-map').addEventListener('click', openTrip);
  $('#save-trip')?.addEventListener('click', (e) => {
    const trips = store.get('trips', []);
    trips.unshift({ at: Date.now(), result });
    store.set('trips', trips.slice(0, 8));
    e.target.textContent = T.saved;
    e.target.disabled = true;
    renderSaved();
  });
}

function renderSaved() {
  const trips = store.get('trips', []);
  if (!trips.length) { $('#saved').innerHTML = ''; return; }
  $('#saved').innerHTML = `<h3>${T.savedTitle}</h3><ul class="rows">${trips.map((t, i) => {
    const doc = t.result.text[state.lang] || t.result.text.en;
    return `<li class="row"><span class="row-l">${esc(doc.title)}</span><span class="row-v"><button type="button" class="link-btn" data-open="${i}">${T.open}</button><a class="link-btn" href="/pounamu-atlas/trip?saved=${i}">${esc(V4[state.lang].tripPage)}</a><button type="button" class="link-btn" data-del="${i}">${T.remove}</button></span></li>`;
  }).join('')}</ul>`;
}
$('#saved').addEventListener('click', (e) => {
  const trips = store.get('trips', []);
  const o = e.target.dataset.open, d = e.target.dataset.del;
  if (o != null) { state.result = trips[o].result; renderSlip(state.result, { fromSaved: true }); $('#slip-wrap').scrollIntoView({ behavior: 'smooth' }); }
  if (d != null) { trips.splice(Number(d), 1); store.set('trips', trips); renderSaved(); }
});

// ── Full-width sections ──────────────────────────────────────────────────
function renderPrep() {
  $('#prep-h').textContent = T.prepTitle;
  const ticks = store.get('checks', {});
  $('#prep-blocks').innerHTML = PREPARE.map((b, i) => `
    <div class="prep-block${i % 2 ? ' flip' : ''}">
      <h3>${esc(L(b.title))}</h3>
      <div class="prep-pair">
        <div class="prep-art">${ART[b.art](L(b.title))}</div>
        <ul class="ticks">${b.items.map((it, j) => {
          const id = `${b.id}-${j}`;
          return `<li><label><input type="checkbox" data-tick="${id}"${ticks[id] ? ' checked' : ''}><span>${esc(L(it))}${it.verify ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : ''} <a class="src" href="${esc(SOURCES[it.src].url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[it.src].label.split(' — ')[0])}</a></span></label></li>`;
        }).join('')}</ul>
      </div>
    </div>`).join('');
}
$('#prep-blocks').addEventListener('change', (e) => {
  const id = e.target.dataset.tick;
  if (!id) return;
  const ticks = store.get('checks', {});
  ticks[id] = e.target.checked;
  store.set('checks', ticks);
});

function renderFaq() {
  $('#faq-h').textContent = T.faqTitle;
  $('#facts').innerHTML = FACTS.map((f) => `<li>${esc(L(f))}${f.verify ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : ''}</li>`).join('');
  $('#qs').innerHTML = FAQ.map((q) => `<details class="q"><summary>${esc(L(q.q))}</summary><p>${esc(L(q.a))}</p></details>`).join('');
  $('#faq-tall').innerHTML = ART.fiord(state.lang === 'zh' ? '米尔福德峡湾手绘插画' : 'Drawing of Milford Sound and Mitre Peak');
  $('#faq-square').innerHTML = ART.kea(state.lang === 'zh' ? '啄羊鹦鹉手绘插画' : 'Drawing of a kea');
}

function renderSources() {
  $('#src-h').textContent = T.srcTitle;
  $('#src-lead').textContent = T.srcLead;
  const groups = { 'DOC': [], 'NZ Cycle Trail': [], 'NZTA': [], [state.lang === 'zh' ? '交通运营方' : 'Transport operators']: [], [state.lang === 'zh' ? '其他官方' : 'Other official']: [] };
  const keys = Object.keys(groups);
  for (const s of Object.values(SOURCES)) {
    const g = s.url.includes('doc.govt') ? keys[0] : s.url.includes('cycletrail') ? keys[1] : s.url.includes('nzta') ? keys[2] : /greatjourneys|interislander|bluebridge|intercity|realnz|orc\.govt|metroinfo/.test(s.url) ? keys[3] : keys[4];
    groups[g].push(s);
  }
  $('#src-list').innerHTML = keys.map((g) => `<li class="src-group"><h3 class="group-h">${esc(g)}</h3><ul class="rows">${groups[g].map((s) => `<li class="row"><a class="row-l" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a><span class="row-v">${esc(new URL(s.url).hostname.replace('www.', ''))}</span></li>`).join('')}</ul></li>`).join('');
  $('#credits-h').textContent = V3[state.lang].creditsH;
  $('#credits').innerHTML = allPhotos().map((p) => `<li class="row"><span class="row-l">${credit(p, state.lang)}</span></li>`).join('');
}

function renderEnd() {
  $('#end-art').innerHTML = ART.panorama(state.lang === 'zh' ? '手绘插画：普卡基湖畔眺望库克山' : 'Drawing of Aoraki/Mount Cook above Lake Pukaki');
  $('#end-h').textContent = T.endTitle;
  $('#end-lead').textContent = T.endLead;
  // Reserved slots for later features. They render as plain text and carry data attributes for future wiring.
  $('#reserved').innerHTML = RESERVED.map((r) => `<li data-reserved="${r.id}"><span>${esc(L(r))}</span><span class="soon">${T.reserved}</span></li>`).join('');
}

// ── Language, motion ─────────────────────────────────────────────────────
function renderAllLang() {
  T = strings(state.lang);
  $('.lead').textContent = T.lead;
  applyStatic();
  renderWays();
  renderTop();
  renderReel();
  renderTrips();
  renderAll();
  renderPlanForm();
  if (state.result) renderSlip(state.result, { fromSaved: true });
  renderSaved();
  renderPrep();
  renderFaq();
  renderSources();
  renderEnd();
  letter(document.querySelectorAll('.hero h1, .hero .wordmark, .bar-mark span, main > section h2'), state.lang);
  observeRise();
  if (current?.kind === 'template') openTemplate(current.id);
  if (current?.kind === 'route') openRoute(current.id);
  else if (current?.kind === 'trip') openTrip();
  else if (current?.kind === 'overview') openOverview(current.ids);
}
$('#lang').addEventListener('click', () => {
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  store.set('lang', state.lang);
  renderAllLang();
});

// Section parts rise in one after another as they arrive. Content is visible without script.
const riseObs = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); riseObs.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' }) : null;
function observeRise() {
  if (!riseObs) return;
  document.querySelectorAll('section > h2, section > p, .top-head, .ways-plate, .ways-text, .cards > li, .group, .prep-block, .q, .facts li, .end-text > *, .plan-form, .slip, .slip-side').forEach((n, i) => {
    if (n.classList.contains('in') || n.closest('.hero')) return;
    n.classList.add('rise');
    n.style.setProperty('--d', `${(i % 6) * 70}ms`);
    riseObs.observe(n);
  });
}

// The bar is clear over the hero and turns solid once the page scrolls on.
const bar = $('#bar');
const onScroll = () => bar.classList.toggle('solid', window.scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// The closing panorama settles slowly once it is on screen.
new IntersectionObserver(([e]) => { if (e.isIntersecting) e.target.classList.add('in-view'); }, { threshold: 0.2 }).observe($('#end'));

renderAllLang();
// The routes draw themselves onto the hero map once the opening has handed its coastline over.
heroMap.show([], { animate: false });
// On home the map stays clear (coast, relief, towns) — the finder draws the visitor's own plan; /routes shows them all.
playIntro({ lang: state.lang, target: $('#hero-map') }).then(() => { if (VIEW === 'routes') heroMap.show(ROUTES.map((r) => r.id)); });
