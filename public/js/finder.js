// The trip finder on the home page: where you start and leave, how many days, what you want to see → a day-by-day
// plan on real roads (finder-engine.js), drawn on its own map. The map starts with no routes on it; only the plan
// is drawn. Plans can open as a trip page (the trip travels inside the link) or be saved in this browser.
import { ROUTES } from '../data/routes.js';
import { PLACES } from '../data/places.js';
import { ROAD_SOURCES } from '../data/roads.js';
import { strings, pick } from './i18n.js';
import { V5 } from './i18n-v5.js';
import { createMap, project } from './map.js';
import { letter } from './lettering.js';
import { whyLine } from './why-view.js';
import { planTrip, actsFor, NODES, WISHES, PACE } from './finder-engine.js';
import { esc, store, motionOff } from './page-common.js';

const $ = (s, r = document) => r.querySelector(s);
const byRoute = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const byPlace = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const HUBS = Object.keys(NODES).filter((k) => NODES[k].hub);
const curLang = () => (document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
let lang = curLang(), T = strings(lang), F = V5[lang];
const L = (o) => pick(o, lang);
const N = (k) => L(NODES[k]);

const DEFAULT = { start: 'christchurch', end: 'queenstown', days: 12, month: new Date().getMonth() + 1, wishes: ['tekapo', 'aoraki', 'queenstown', 'milford'], car: true, pace: 'balanced', fly: true };
let input = { ...DEFAULT, ...store.get('finder', {}) };
let plan = null, map = null;

function form() {
  const opt = (k, sel) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(N(k))}</option>`;
  const chips = (isl) => WISHES.filter((w) => w.island === isl).map((w) => `<label class="chip"><input type="checkbox" name="wishes" value="${w.id}"${input.wishes.includes(w.id) ? ' checked' : ''}><span>${esc(L(w))}</span></label>`).join('');
  const radio = (name, v, label) => `<label class="chip"><input type="radio" name="${name}" value="${v}"${String(input[name]) === String(v) ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  return `
    <div class="pf-pair">
      <label class="fl"><span>${esc(F.start)}</span><select name="start">${HUBS.map((k) => opt(k, input.start)).join('')}</select></label>
      <label class="fl"><span>${esc(F.end)}</span><select name="end"><option value="same"${input.end === 'same' ? ' selected' : ''}>${esc(F.sameEnd)}</option>${HUBS.map((k) => opt(k, input.end)).join('')}</select></label>
    </div>
    <div class="pf-pair">
      <div class="pf-row pf-days"><label for="fd-days">${esc(F.days)}</label><input id="fd-days" name="days" type="range" min="3" max="28" value="${input.days}"><output id="fd-days-out" for="fd-days">${input.days}</output></div>
      <label class="fl"><span>${esc(F.month)}</span><select name="month">${T.months.map((m, i) => `<option value="${i + 1}"${input.month === i + 1 ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
    </div>
    <fieldset><legend>${esc(F.wish)} · ${esc(F.south)}</legend><div class="chips">${chips('south')}</div></fieldset>
    <fieldset><legend>${esc(F.wish)} · ${esc(F.north)}</legend><div class="chips">${chips('north')}</div></fieldset>
    <div class="pf-pair">
      <fieldset><legend>${esc(F.how)}</legend><div class="chips">${radio('car', true, F.car)}${radio('car', false, F.noCar)}</div></fieldset>
      <fieldset><legend>${esc(F.pace)}</legend><div class="chips">${Object.keys(PACE).map((k) => radio('pace', k, F.paces[k])).join('')}</div></fieldset>
    </div>
    <label class="consent"><input type="checkbox" name="fly"${input.fly ? ' checked' : ''}><span>${esc(F.fly)}</span></label>
    <p class="fd-go"><button class="btn" type="submit">${esc(F.go)}</button><span class="fd-err" id="fd-err" role="alert"></span></p>`;
}

function read() {
  const fd = new FormData($('#fd-form'));
  return { start: fd.get('start'), end: fd.get('end'), days: Number(fd.get('days')), month: Number(fd.get('month')), wishes: fd.getAll('wishes'), car: fd.get('car') === 'true', pace: fd.get('pace'), fly: fd.get('fly') === 'on' };
}

// ── Result ──
const verify = () => ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>`;
function legRow(l) {
  const mode = l.pt || 'car';
  const t = l.pt === 'flight' ? F.hours(l.air) : F.hours(l.h);
  return `<li class="fd-leg fd-${mode}"><span class="fd-leg-ab">${esc(N(l.a))} → ${esc(N(l.b))}</span><span class="fd-leg-road">${esc(L(l.road))}</span><span class="fd-leg-t">${esc(F.mode[mode])} · ${esc(t)}${l.km ? ` · ${l.km} km` : ''}</span></li>`;
}
function actBlock(a) {
  const { routes, places } = actsFor(a.w, plan.input.car);
  const pick = (list) => (a.of > 1 ? list.filter((_, i) => i % a.of === a.part) : list);
  const rs = pick(routes), ps = pick(places);
  const firstWhy = rs[0] || ps[0] || a.w.whyFrom;
  return `<div class="fd-act"><p class="fd-act-h">${esc(L(a.w))}${a.of > 1 ? ` <small>${esc(F.part(a.part + 1, a.of))}</small>` : ''}</p>
    ${firstWhy ? whyLine(firstWhy, lang) : ''}
    <ul class="fd-do">${rs.map((id) => `<li><a href="/r/${id}">${esc(L(byRoute[id].name))}</a></li>`).join('')}${ps.map((id) => `<li>${esc(L(byPlace[id].name))}</li>`).join('')}</ul></div>`;
}
function dayTitle(d, l = lang) {
  const K = V5[l].kind, n = (k) => pick(NODES[k], l);
  if (d.kind === 'arrive') return K.arrive(n(d.at));
  if (d.kind === 'depart') return K.depart(n(d.at));
  if (d.kind === 'spare') return d.weather ? K.weather(n(d.at)) : K.spare(n(d.at));
  if (d.kind === 'stay') return K.stay(n(d.at));
  return d.legs.length ? K.go(n(d.legs[0].a), n(d.at)) : K.stay(n(d.at));
}
function warnings() {
  const W = F.warn, out = [];
  for (const w of plan.warnings) {
    if (w.type === 'short') out.push(`${W.short(w.need, w.have)}${w.drop ? ` ${W.drop(L(w.drop.w), w.drop.days)}` : ''}${w.packed ? ` ${W.packed(w.packed)}` : ''}`);
    if (w.type === 'unreachable') out.push(W.unreachable(w.list.map((x) => L(x)), w.car));
    if (w.type === 'season') out.push(W.season(T.season[w.season], [...new Set(w.routes.map((r) => L(r.name)))]));
    if (w.type === 'winter') out.push(W.winter);
    if (w.type === 'ferry') out.push(W.ferry);
    if (w.type === 'carflight') out.push(W.carflight);
    if (w.type === 'long') out.push(W.long);
  }
  const ord = plan.warnings.find((w) => w.type === 'order');
  return { bad: out, good: ord ? F.warn.order(ord.saved) : '' };
}
function render() {
  const out = $('#fd-out');
  if (!plan) { out.innerHTML = `<p class="note">${esc(F.empty)}</p>`; return; }
  const { bad, good } = warnings();
  const end = plan.input.end;
  const stops = [plan.input.start, ...plan.order.map((w) => w.base), end].filter((k, i, a) => k !== a[i - 1]);
  out.innerHTML = `
    <p class="fd-sum">${esc(F.sum(N(plan.input.start), N(end), plan.totals.days, plan.totals.hours, plan.totals.km, plan.totals.flights))}</p>
    ${bad.length ? `<ul class="fd-warn">${bad.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <p class="fd-order"><b>${esc(F.order)}</b> ${stops.map((k) => `<span>${esc(N(k))}</span>`).join('<span aria-hidden="true"> → </span>')}${good ? `<br><small>${esc(good)}</small>` : ''}</p>
    <ol class="fd-days">${plan.days.map((d) => `<li class="fd-day fd-k-${d.kind}">
      <h3><span class="td-n">${lang === 'zh' ? `第 ${d.n} 天` : `Day ${d.n}`}</span>${esc(dayTitle(d))}</h3>
      ${d.legs.length ? `<ul class="fd-legs">${d.legs.map(legRow).join('')}</ul>` : ''}
      ${d.acts.map(actBlock).join('')}
      ${d.kind === 'arrive' ? `<p class="note">${esc(F.arriveNote(plan.input.car))}</p>` : ''}
      ${d.kind === 'spare' ? `<p class="note">${esc(d.weather ? F.weatherNote : F.spareNote)}</p>` : ''}
      ${d.kind !== 'depart' ? `<p class="fd-sleep">${esc(F.sleep)} ${esc(N(d.at))}</p>` : ''}
    </li>`).join('')}</ol>
    <p class="fd-actions"><button type="button" class="btn btn-small" id="fd-show">${esc(F.show)}</button><a class="btn btn-small btn-quiet" id="fd-page" href="${esc(shareHref())}">${esc(F.page)}</a><button type="button" class="btn btn-small btn-quiet" id="fd-save">${esc(F.save)}</button></p>
    <p class="note">${esc(F.verifyNote)}${verify()} ${ROAD_SOURCES.map((s) => `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label.split(' — ')[0])}</a>`).join(' ')}</p>`;
}

// The plan as a trip-page link (same format as trip.js share links).
function shareHref() {
  const both = (f) => ({ en: f('en'), zh: f('zh') });
  const nm = (k) => ({ en: NODES[k].en, zh: NODES[k].zh });
  const t = {
    from: 'planner',
    title: both((l) => `${pick(NODES[plan.input.start], l)} → ${pick(NODES[plan.input.end], l)} · ${l === 'zh' ? `${plan.days.length} 天` : `${plan.days.length} days`}`),
    pitch: both((l) => plan.order.map((w) => pick(w, l)).join(l === 'zh' ? '、' : ', ')),
    days: plan.days.map((d) => {
      const acts = d.acts.map((a) => actsFor(a.w, plan.input.car));
      return {
        title: both((l) => dayTitle(d, l)),
        routes: [...new Set(acts.flatMap((a) => a.routes))],
        places: [...new Set(acts.flatMap((a) => a.places))],
        night: d.kind === 'depart' ? null : nm(d.at),
        moves: d.legs.map((l) => ({ a: nm(l.a), b: nm(l.b), h: l.pt === 'flight' ? l.air : l.h })),
      };
    }),
  };
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(t)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `/trip#t=${b64}`;
}

// fast: the whole plan appears in about a second (after Plan it); otherwise it is travelled leg by leg.
function draw(fast) {
  if (!map || !plan) return;
  const routes = [...new Set(plan.days.flatMap((d) => d.acts.flatMap((a) => actsFor(a.w, plan.input.car).routes)))].filter((id) => byRoute[id]);
  map.show(routes, { animate: false });
  const P = (k) => project(NODES[k].at);
  const legs = [];
  for (const d of plan.days) {
    for (const l of d.legs) legs.push({ link: [P(l.a), P(l.b)] });
    for (const a of d.acts) for (const id of actsFor(a.w, plan.input.car).routes.slice(0, 1)) if (byRoute[id]) legs.push({ id });
  }
  if (!legs.length) return;
  const j = map.journey(legs, { pace: 1.2 });
  if (fast || motionOff()) j.setRate(25);
}

function run(scroll) {
  input = read();
  store.set('finder', input);
  if (!input.wishes.length) { $('#fd-err').textContent = F.pickOne; return; }
  $('#fd-err').textContent = '';
  plan = planTrip({ ...input, end: input.end === 'same' ? input.start : input.end });
  render();
  draw(true);
  if (scroll) $('#fd-out').scrollIntoView({ behavior: motionOff() ? 'auto' : 'smooth', block: 'start' });
}

function renderAll() {
  lang = curLang(); T = strings(lang); F = V5[lang];
  $('#finder-h').textContent = F.findH;
  $('#finder-lead').textContent = F.findLead;
  $('#fd-form').innerHTML = form();
  $('#fd-days').addEventListener('input', (e) => { $('#fd-days-out').textContent = e.target.value; });
  render();
  map?.setLang(lang, T);
  letter(document.querySelectorAll('#finder-h'), lang);
}

if ($('#finder')) {
  map = createMap($('#fd-map'), { routes: ROUTES, uid: 'f', compact: true, onSelect: (id) => { location.href = `/r/${id}`; } });
  map.show([], { animate: false });
  renderAll();
  if (store.get('finder', null)) run(false);
  $('#fd-form').addEventListener('submit', (e) => { e.preventDefault(); run(true); });
  $('#fd-out').addEventListener('click', (e) => {
    if (e.target.id === 'fd-show') { $('#fd-map').scrollIntoView({ behavior: motionOff() ? 'auto' : 'smooth', block: 'center' }); draw(); }
    if (e.target.id === 'fd-save') {
      const list = store.get('finderTrips', []);
      list.unshift({ at: Date.now(), href: shareHref(), title: { en: `${NODES[plan.input.start].en} → ${NODES[plan.input.end].en}, ${plan.days.length} days`, zh: `${NODES[plan.input.start].zh} → ${NODES[plan.input.end].zh}，${plan.days.length} 天` } });
      store.set('finderTrips', list.slice(0, 8));
      e.target.textContent = F.saved; e.target.disabled = true;
    }
  });
  // A ready-made trip loaded from its card (app.js): same start, end and days; the wishes are the ones its routes
  // and places belong to.
  document.addEventListener('finder:load', ({ detail: t }) => {
    const wishes = WISHES.filter((w) => w.routes.some((id) => t.routes.includes(id)) || w.places.some((id) => t.places.includes(id))).map((w) => w.id);
    input = { ...input, start: t.start, end: t.end === t.start ? 'same' : t.end, days: t.days, car: t.car, wishes: wishes.length ? wishes : input.wishes };
    store.set('finder', input);
    $('#fd-form').innerHTML = form();
    $('#fd-days').addEventListener('input', (e) => { $('#fd-days-out').textContent = e.target.value; });
    run(false);
    $('#finder').scrollIntoView({ behavior: motionOff() ? 'auto' : 'smooth', block: 'start' });
  });
  new MutationObserver(() => { if (curLang() !== lang) { renderAll(); if (plan) render(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}
