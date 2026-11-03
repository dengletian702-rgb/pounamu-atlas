// Home-page additions from batch 2: "Which island first?", the tier list with its scoring rule in plain view, the
// month-by-month guide, the motion switch and links into the compare page. Language follows <html lang>, which
// app.js sets, so this module needs no hooks into app.js.
import { ROUTES } from '../data/routes.js';
import { WHY } from '../data/why.js';
import { ROUTE_PHOTO } from '../data/photos.js';
import { ITINERARIES } from '../data/itineraries.js';
import { MONTHS, MONTH_SOURCES } from '../data/months.js';
import { strings, pick } from './i18n.js';
import { V4 } from './i18n-v4.js';
import { MODE_COLOR } from './map.js';
import { letter } from './lettering.js';
import { whyLine } from './why-view.js';
import { esc, store, initMotion, setMotion, motionOff } from './page-common.js';

const $ = (s, r = document) => r.querySelector(s);
const curLang = () => (document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
let lang = curLang(), T = strings(lang), E = V4[lang];
const L = (o) => pick(o, lang);

// ── Tier list: a transparent score anyone can recompute from the data ──
const TAG_W = { heritage: 3, official: 3, award: 2, film: 2, record: 2, history: 2, pick: 1, practical: 0 };
export function tierScore(r) {
  const best = Math.max(0, ...(WHY[r.id] || []).map((y) => TAG_W[y.tag] ?? 0));
  return best + r.seasons.length + ({ yes: 2, partial: 1 }[r.carFree] || 0) + (ROUTE_PHOTO[r.id] ? 1 : 0);
}
const tierOf = (s) => (s >= 10 ? 'S' : s >= 9 ? 'A' : s >= 7 ? 'B' : 'C');
function renderTiers() {
  const by = { S: [], A: [], B: [], C: [] };
  for (const r of ROUTES) { const s = tierScore(r); by[tierOf(s)].push([r, s]); }
  $('#tiers-h').textContent = E.tierH;
  $('#tiers-lead').textContent = E.tierLead;
  $('#tiers-list').innerHTML = Object.entries(by).map(([k, list]) => `<div class="tier">
    <span class="tier-l" aria-label="${k} · ${esc(E.tierN(list.length))}">${k}</span>
    <ul>${list.sort((a, b) => b[1] - a[1] || L(a[0].name).localeCompare(L(b[0].name))).map(([r, s]) => `<li><a href="/pounamu-atlas/r/${r.id}"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(L(r.name))} <b>${s}</b></a></li>`).join('')}</ul>
  </div>`).join('');
  $('#tiers-crit').textContent = E.tierCrit;
}

// ── Month by month ──
function renderMonths() {
  const now = new Date().getMonth();
  const C = E.monthCols;
  $('#months-h').textContent = E.monthH;
  $('#months-lead').textContent = E.monthLead;
  $('#months-body').innerHTML = MONTHS.map((m, i) => `<tr${i === now ? ' class="now"' : ''}>
    <th scope="row">${esc(T.months[i])}<span class="mg-season">${esc(T.season[m.season])}</span></th>
    <td data-l="${esc(C.good)}">${esc(L(m.good))}</td>
    <td data-l="${esc(C.trade)}">${esc(L(m.trade))}${m.verify ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : ''}</td>
    <td data-l="${esc(C.light)}" class="mg-light">${lang === 'zh' ? `约 ${m.light} 小时` : `≈ ${m.light} h`}</td></tr>`).join('');
  $('#months-head').innerHTML = `<tr><th scope="col"></th><th scope="col">${esc(C.good)}</th><th scope="col">${esc(C.trade)}</th><th scope="col">${esc(C.light)}</th></tr>`;
  $('#months-src').innerHTML = MONTH_SOURCES.map((s) => `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label.split(' — ')[0])}</a>`).join(' · ');
}

// ── Which island first? Three answers → a recommendation and the reasons behind it ──
const isl = store.get('island', { days: 'mid', want: 'alps', drive: 'some' });
function islandAnswer({ days, want, drive }) {
  const W = E.islandWhy;
  const north = want !== 'alps';
  const pickI = days === 'long' ? (north ? 'bothN' : 'both') : north ? 'north' : 'south';
  const why = [days === 'short' ? W.short : days === 'long' ? W.long : null, W[want]];
  const carFree = (i) => ROUTES.filter((r) => r.island === i && r.carFree === 'yes').length;
  if (drive === 'no') why.push(W.car(carFree('south'), carFree('north')));
  if (drive !== 'no' && pickI !== 'north') why.push(W.drive);
  const fit = ITINERARIES.filter((t) => (pickI.startsWith('both') ? t.island === 'both' : t.island === pickI)
    && (drive !== 'no' || t.personas.includes('carfree') || t.island === 'north'))
    .sort((a, b) => Math.abs(a.days - ({ short: 6, mid: 9, long: 14 }[days])) - Math.abs(b.days - ({ short: 6, mid: 9, long: 14 }[days])))[0];
  const show = { south: ['milford-road', 'hooker-valley'], north: ['tongariro-crossing', 'huka-falls'] }[pickI.startsWith('both') ? (north ? 'north' : 'south') : pickI];
  return { pickI, why: why.filter(Boolean), fit, show };
}
function renderIsland() {
  const Q = E.islandQ;
  $('#island-h').textContent = E.islandH;
  $('#island-lead').textContent = E.islandLead;
  $('#island-form').innerHTML = Object.entries(Q).map(([k, q]) => `<fieldset><legend>${esc(q.q)}</legend><div class="chips">${Object.entries(q.a).map(([v, l]) => `<label class="chip"><input type="radio" name="${k}" value="${v}"${isl[k] === v ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>`).join('');
  const a = islandAnswer(isl);
  const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
  $('#island-out').innerHTML = `<h3>${esc(E.islandA[a.pickI])}</h3>
    <ul>${a.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    <ul>${a.show.filter((id) => byId[id]).map((id) => `<li><a href="/pounamu-atlas/r/${id}">${esc(L(byId[id].name))}</a> ${whyLine(id, lang)}</li>`).join('')}</ul>
    ${a.fit ? `<p style="margin-top:14px">${esc(E.islandWhy.trip)}: <a href="/pounamu-atlas/trip?tpl=${a.fit.id}">${esc(L(a.fit.title))}</a></p>` : ''}`;
}
$('#island-form')?.addEventListener('change', (e) => {
  isl[e.target.name] = e.target.value;
  store.set('island', isl);
  const { name, value } = e.target;
  renderIsland();
  $(`#island-form input[name="${name}"][value="${value}"]`)?.focus();
});

// ── Motion switch in the bar ──
function renderMotion() {
  const b = $('#motion');
  if (!b) return;
  b.textContent = motionOff() ? E.motionOn : E.motionOff;
  b.setAttribute('aria-pressed', String(motionOff()));
}
$('#motion')?.addEventListener('click', () => { setMotion(motionOff()); renderMotion(); });

// ── Compare entry ──
function renderCompare() {
  const a = $('#cmp-entry');
  if (a) a.textContent = `${E.cmpOpen} →`;
}

function renderAll() {
  lang = curLang(); T = strings(lang); E = V4[lang];
  if ($('#tiers')) renderTiers();
  if ($('#months')) renderMonths();
  if ($('#island')) renderIsland();
  renderMotion();
  renderCompare();
  letter(document.querySelectorAll('#tiers-h, #months-h, #island-h'), lang);
}
initMotion();
renderAll();
new MutationObserver(() => { if (curLang() !== lang) renderAll(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
