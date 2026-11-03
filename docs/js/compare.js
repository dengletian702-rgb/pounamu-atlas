// /compare?a=<id>&b=<id>: two routes side by side. Every row says which one is easier, shorter or open longer,
// and the first row is always the reasons, so a name never appears without why it is worth going.
import { ROUTES, REGIONS, SOURCES } from '../data/routes.js';
import { LANGS, strings, pick } from './i18n.js';
import { V3 } from './i18n-v3.js';
import { V4 } from './i18n-v4.js';
import { MODE_COLOR, routeThumb } from './map.js';
import { letter } from './lettering.js';
import { whyFor, whyList } from './why-view.js';
import { figure } from './photo.js';
import { store, esc, initMotion } from './page-common.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const q = new URLSearchParams(location.search);
let a = byId[q.get('a')] ? q.get('a') : 'hooker-valley';
let b = byId[q.get('b')] && q.get('b') !== a ? q.get('b') : (a === 'roys-peak' ? 'hooker-valley' : 'roys-peak');

const urlLang = q.get('lang');
let lang = LANGS[urlLang]?.ready ? urlLang : store.get('lang', (navigator.language || '').startsWith('zh') ? 'zh' : 'en');
let T, V, E;
const L = (o) => pick(o, lang);
const tv = (r, f) => (r.verify?.includes(f) ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : '');
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const CAR = { yes: 2, partial: 1, no: 0 };

// Which side wins a row: -1 a, 1 b, 0 neither (ties and missing values never win).
const win = (x, y, lower = true) => (x == null || y == null || x === y ? 0 : (x < y) === lower ? -1 : 1);

function options(sel) {
  const groups = ['south', 'north'].map((isl) => `<optgroup label="${esc(T.island[isl])}">${ROUTES.filter((r) => r.island === isl)
    .sort((x, y) => L(x.name).localeCompare(L(y.name), lang === 'zh' ? 'zh' : 'en'))
    .map((r) => `<option value="${r.id}"${r.id === sel ? ' selected' : ''}>${esc(L(r.name))}</option>`).join('')}</optgroup>`);
  return groups.join('');
}

function render() {
  T = strings(lang); V = V3[lang]; E = V4[lang];
  document.documentElement.lang = LANGS[lang].html;
  document.title = `${E.cmpH} — ${T.wordmark}`;
  $('#pg-wordmark').textContent = T.wordmark;
  $('#pg-back').textContent = V.back;
  $('#lang').textContent = lang === 'zh' ? 'English' : '中文';
  $('#lang').lang = lang === 'zh' ? 'en' : 'zh-Hans';
  const A = byId[a], B = byId[b];
  const tag = (w, side, label) => (w === side ? ` <span class="cmp-win">${esc(label)}</span>` : '');
  const R = E.cmpRows;
  const row = (label, fa, fb, w = 0, wl = '') => `<tr><th scope="row">${esc(label)}</th><td>${fa}${tag(w, -1, wl)}</td><td>${fb}${tag(w, 1, wl)}</td></tr>`;
  const seasons = (r) => SEASONS.filter((s) => r.seasons.includes(s)).map((s) => T.season[s]).join(' · ') + tv(r, 'seasons');
  const level = (r) => `<span class="pips" aria-hidden="true">${'●'.repeat(r.difficulty)}${'○'.repeat(5 - r.difficulty)}</span> ${esc(T.diff[r.difficulty])}${tv(r, 'grade')}`;
  const srcs = (r) => r.sources.filter((k) => SOURCES[k]).map((k) => `<a class="src" href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[k].label.split(' — ')[0])}</a>`).join(' ');
  const head = (r) => `<a class="cmp-name" href="/pounamu-atlas/r/${r.id}"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(L(r.name))}</a><span class="cmp-sub">${esc(T.mode[r.mode])} · ${esc(T.island[r.island])}</span>`;
  $('#pg').innerHTML = `
    <header class="pg-head">
      <h1 id="pg-h1">${esc(E.cmpH)}</h1>
      <p class="pg-lead">${esc(E.cmpLead)}</p>
      <form class="cmp-pick" id="cmp-pick">
        <label class="fl"><span>${esc(E.cmpA)}</span><select name="a">${options(a)}</select></label>
        <button type="button" class="btn btn-quiet btn-small" id="cmp-flip" aria-label="⇄"><span aria-hidden="true">⇄</span></button>
        <label class="fl"><span>${esc(E.cmpB)}</span><select name="b">${options(b)}</select></label>
      </form>
    </header>
    <div class="cmp-wrap">
    <table class="cmp">
      <caption class="vh">${esc(E.cmpH)}</caption>
      <thead><tr><td></td><th scope="col">${head(A)}</th><th scope="col">${head(B)}</th></tr></thead>
      <tbody>
        <tr class="cmp-ph"><td></td>${[A, B].map((r) => `<td>${figure(r.id, lang, { sizes: '(max-width: 899px) 50vw, 40vw' }) || `<div class="cmp-shape">${routeThumb(r, 240, 150)}</div>`}<a class="cmp-ph-name" href="/pounamu-atlas/r/${r.id}">${esc(L(r.name))}</a></td>`).join('')}</tr>
        ${row(R.why, whyList(whyFor(a).slice(0, 3), lang, T), whyList(whyFor(b).slice(0, 3), lang, T))}
        ${row(R.time, esc(L(A.duration)) + tv(A, 'duration'), esc(L(B.duration)) + tv(B, 'duration'), win(A.days, B.days), E.shorter)}
        ${row(R.distance, esc(A.distanceNote ? L(A.distanceNote) : T.km(A.distanceKm)), esc(B.distanceNote ? L(B.distanceNote) : T.km(B.distanceKm)), win(A.distanceKm, B.distanceKm), E.shorter)}
        ${row(R.level, `${level(A)}<small>${esc(L(A.grade))}</small>`, `${level(B)}<small>${esc(L(B.grade))}</small>`, win(A.difficulty, B.difficulty), E.easier)}
        ${row(R.season, seasons(A), seasons(B), win(A.seasons.length, B.seasons.length, false), E.moreSeasons)}
        ${row(R.carFree, esc(T.carFree[A.carFree]), esc(T.carFree[B.carFree]), win(CAR[A.carFree], CAR[B.carFree], false), E.easier)}
        ${row(R.region, esc(L(REGIONS[A.from])), esc(L(REGIONS[B.from])))}
        ${row(R.shape, `<span class="cmp-shape">${routeThumb(A, 160, 100)}</span>`, `<span class="cmp-shape">${routeThumb(B, 160, 100)}</span>`)}
        ${row(R.sources, srcs(A), srcs(B))}
        ${row(R.guide, `<a href="/pounamu-atlas/r/${a}">${esc(V.openGuide)} →</a>`, `<a href="/pounamu-atlas/r/${b}">${esc(V.openGuide)} →</a>`)}
      </tbody>
    </table>
    </div>`;
  letter(document.querySelectorAll('#pg-h1, #pg-wordmark'), lang);
}

function go(na, nb) {
  if (na === nb) return;
  a = na; b = nb;
  history.replaceState(null, '', `/pounamu-atlas/compare?a=${a}&b=${b}`);
  render();
}
$('#pg').addEventListener('change', (e) => {
  const f = e.target.closest('#cmp-pick');
  if (!f) return;
  const fd = new FormData(f);
  const na = fd.get('a'), nb = fd.get('b');
  if (na === nb) { e.target.value = e.target.name === 'a' ? a : b; return; }
  go(na, nb);
  $(`#cmp-pick [name="${e.target.name}"]`).focus();
});
$('#pg').addEventListener('click', (e) => { if (e.target.closest('#cmp-flip')) { go(b, a); $('#cmp-flip').focus(); } });
$('#lang').addEventListener('click', () => { lang = lang === 'zh' ? 'en' : 'zh'; store.set('lang', lang); render(); });

initMotion();
render();
