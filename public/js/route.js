// One route, its own page: /r/<id>. The map plays the day out stop by stop while the guide's timeline follows it;
// either side can sit on the left (⇄ or "S"), and on a phone the two are swiped panes. Nothing leaves the browser.
import { ROUTES, REGIONS, SOURCES } from '../data/routes.js';
import { GUIDES } from '../data/guides.js';
import { PLACES } from '../data/places.js';
import { COAST_CREDIT } from '../data/coast.js';
import { LANGS, strings, pick } from './i18n.js';
import { V3 } from './i18n-v3.js';
import { GEAR } from './gear.js';
import { createMap, MODE_COLOR } from './map.js';
import { letter } from './lettering.js';
import { whyFor, whyList } from './why-view.js';
import { figure } from './photo.js';
import { V4 } from './i18n-v4.js';
import { COMMERCE, bookingUrl } from '../data/commerce.js';
import { initMotion, motionOff } from './page-common.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(`mfn.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`mfn.${k}`, JSON.stringify(v)); } catch { /* ignore */ } },
};

const id = decodeURIComponent(location.pathname.replace(/^\/r\//, '').replace(/\/$/, ''));
const route = ROUTES.find((r) => r.id === id);
if (!route) location.replace('/#routes');

const urlLang = new URLSearchParams(location.search).get('lang');
let lang = LANGS[urlLang]?.ready ? urlLang : store.get('lang', (navigator.language || '').startsWith('zh') ? 'zh' : 'en');
let T = strings(lang), V = V3[lang];
const L = (o) => pick(o, lang);
const both = (f) => ({ en: f(V3.en), zh: f(V3.zh) });
const dayCount = (r) => Math.max(Math.ceil(r.days), 1);
const tv = (on) => (on ? ` <abbr class="tv" title="${esc(T.verifyTitle)}">${esc(T.verify)}</abbr>` : '');
const verifyMark = (r, f) => tv(r.verify?.includes(f));
const short = (s) => s.split(/[(（,，]/)[0].trim();
const deg = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.73);

// Routes without an imported guide get one built from what the route record already says: start, the official
// highlights in order, the finish. No clock times are invented; multi-day routes are labelled by day.
function autoGuide(r) {
  const n = r.highlights.en.length + 2;
  const at = (i) => {
    const p = i / (n - 1);
    if (r.days > 1) { const d = Math.min(Math.floor(p * r.days) + 1, dayCount(r)); return both((v) => v.day(d)); }
    return both((v) => (i === 0 ? v.start : i === n - 1 ? v.finish : v.along));
  };
  const stages = [
    { title: r.start, text: null },
    ...r.highlights.en.map((h, i) => ({ title: { en: h, zh: r.highlights.zh?.[i] || h }, text: null })),
    { title: r.end, text: null },
  ].map((s, i) => ({ ...s, at: at(i), p: i / (n - 1) }));
  return { origin: 'auto', verify: r.verify?.includes('highlights'), stages, sources: r.sources };
}
const guide = route && (GUIDES[route.id] || autoGuide(route));
const stops = guide ? guide.stages.map((s) => Math.min(Math.max(s.p, 0), 1)) : [];

// Neighbours: places within ~40 km of the line, and other routes that share a region.
const nearPlaces = route ? PLACES.map((pl) => [pl, Math.min(...route.path.map((q) => deg(q, pl.at)))]).filter(([, d]) => d < 0.4).sort((a, b) => a[1] - b[1]).slice(0, 6).map(([pl]) => pl) : [];
const nearRoutes = route ? ROUTES.filter((r) => r.id !== route.id && (r.from === route.from || r.to === route.from || r.from === route.to)).sort((a, b) => deg(a.path[0], route.path[0]) - deg(b.path[0], route.path[0])).slice(0, 6) : [];
const siblings = route ? ROUTES.filter((r) => r.mode === route.mode && r.island === route.island).sort((a, b) => a.rank - b.rank) : [];

// ── Layout: left/right swap and phone panes ─────────────────────────────
const rp = $('#rp');
let swapped = store.get('rpSwap', false);
const phone = matchMedia('(max-width: 899px)');
function applySwap() { rp.classList.toggle('swapped', swapped); }
function toggleSwap() {
  if (phone.matches) { showPane(pane === 'guide' ? 'map' : 'guide'); return; }
  swapped = !swapped;
  store.set('rpSwap', swapped);
  applySwap();
}
let pane = 'guide';
function showPane(which, smooth = true) {
  pane = which;
  const el = which === 'map' ? $('#rp-map') : $('#rp-guide');
  rp.scrollTo({ left: el.offsetLeft, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  syncTabs();
}
function syncTabs() {
  $('#tab-guide').setAttribute('aria-selected', String(pane === 'guide'));
  $('#tab-map').setAttribute('aria-selected', String(pane === 'map'));
}
rp.addEventListener('scroll', () => {
  if (!phone.matches) return;
  const now = rp.scrollLeft > rp.clientWidth / 2 === !swapped ? 'map' : 'guide';
  if (now !== pane) { pane = now; syncTabs(); }
}, { passive: true });
$('#tab-guide').addEventListener('click', () => showPane('guide'));
$('#tab-map').addEventListener('click', () => showPane('map'));
$('#rp-swap').addEventListener('click', toggleSwap);
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 's' || e.metaKey || e.ctrlKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  toggleSwap();
});

// ── The map and its player ──────────────────────────────────────────────
let map = null, ctl = null, rate = 1, placesOn = true;
const RATES = [1, 2, 0.5];
// Closest zoom: day walks get near enough to read the trail; longer routes stay wide enough to keep the coast in view.
const FRAME = route && route.days <= 1 ? 28 : 60;
function play({ startAt = 0 } = {}) {
  const items = [...document.querySelectorAll('.tl > li')];
  const km = $('#pl-km'), day = $('#pl-day'), bar = $('#prog');
  const days = dayCount(route);
  ctl = map.journey([{ id: route.id }], {
    stops, startAt, hold: 1100, minFrame: FRAME,
    onTick: (_, p) => {
      km.textContent = route.distanceKm == null ? `${Math.round(p * 100)}%` : (route.distanceKm * p).toFixed(route.distanceKm < 100 ? 1 : 0);
      day.textContent = days > 1 ? T.a.day(Math.min(Math.floor(p * days) + 1, days), days) : '';
      bar.style.width = `${(p * 100).toFixed(1)}%`;
      let cur = -1;
      items.forEach((n, i) => { const on = p >= stops[i] - 1e-6; n.classList.toggle('on', on); if (on) cur = i; });
      items.forEach((n, i) => n.classList.toggle('now', i === cur && p < 1));
    },
    onStop: (i) => {
      // Follow along only while the reader is looking at the timeline; never pull them away from elsewhere.
      const n = items[i], box = $('#rp-guide').getBoundingClientRect(), tl = $('.tl')?.getBoundingClientRect();
      if (n && i > 0 && !phone.matches && tl && tl.top < box.bottom && tl.bottom > box.top) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    onDone: () => { items.forEach((n) => { n.classList.add('on'); n.classList.remove('now'); }); syncPlay(); },
  });
  ctl.setRate(rate);
  syncPlay();
}
function syncPlay() {
  const b = $('#pl-play');
  const label = !ctl || ctl.isDone() ? V.replay : ctl.isPaused() ? V.resume : V.pause;
  b.textContent = '';
  b.insertAdjacentHTML('beforeend', `<span aria-hidden="true">${!ctl || ctl.isDone() ? '↻' : ctl.isPaused() ? '▶' : '❚❚'}</span><span class="pl-label">${esc(label)}</span>`);
  b.setAttribute('aria-label', label);
}
$('#pl-play').addEventListener('click', () => {
  if (!ctl || ctl.isDone()) play();
  else ctl.toggle();
  syncPlay();
});
$('#pl-rate').addEventListener('click', () => {
  rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
  ctl?.setRate(rate);
  syncControls();
});
$('#pl-in').addEventListener('click', () => map.zoomBy(0.66));
$('#pl-out').addEventListener('click', () => map.zoomBy(1.5));
$('#pl-home').addEventListener('click', () => map.frame(route.id, 700, FRAME));
$('#pl-places').addEventListener('click', () => {
  placesOn = !placesOn;
  map.showPlaces(placesOn);
  syncControls();
});
function seekTo(i) {
  const p = stops[i];
  if (ctl && !ctl.isDone()) { ctl.seek(p); ctl.resume(); }
  else play({ startAt: p });
  syncPlay();
  if (phone.matches) showPane('map');
}

// ── The guide ───────────────────────────────────────────────────────────
function bookBlock(r) {
  const b = bookingUrl(r), E = V4[lang], p = COMMERCE.partnerSlot && COMMERCE.partners[r.id];
  if (!b && !p) return '';
  return `<aside class="rp-book"><h2>${esc(E.bookH)}</h2>
    ${b ? `<p><a class="btn btn-small" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(E.bookOn(b.label))} ↗</a></p>` : ''}
    ${p ? `<p class="rp-partner"><span class="why-tag">Partner / 合作</span> <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer sponsored">${esc(p.name)}</a></p>` : ''}
    <p class="note">${esc(E.bookNote)}</p></aside>`;
}
function factsStrip(r) {
  const seasons = ['spring', 'summer', 'autumn', 'winter'].filter((s) => r.seasons.includes(s)).map((s) => T.season[s]).join(' · ');
  const f = V.facts;
  return `<dl class="rp-facts">
    <div><dt>${esc(f.time)}</dt><dd>${esc(L(r.duration))}${verifyMark(r, 'duration')}</dd></div>
    <div><dt>${esc(f.distance)}</dt><dd>${esc(r.distanceNote ? L(r.distanceNote) : T.km(r.distanceKm))}${verifyMark(r, 'distanceKm')}</dd></div>
    <div><dt>${esc(f.level)}</dt><dd><span class="pips" aria-hidden="true">${'●'.repeat(r.difficulty)}${'○'.repeat(5 - r.difficulty)}</span> ${esc(T.diff[r.difficulty])}<small>${esc(L(r.grade))}${verifyMark(r, 'grade')}</small></dd></div>
    <div><dt>${esc(f.season)}</dt><dd>${esc(seasons)}${verifyMark(r, 'seasons')}</dd></div>
    <div><dt>${esc(f.carFree)}</dt><dd>${esc(T.carFree[r.carFree])}</dd></div>
  </dl>`;
}
function timeline(g) {
  return `<ol class="tl">${g.stages.map((s, i) => `<li>
    <button type="button" class="tl-go" data-stop="${i}" aria-label="${esc(V.stop(i + 1))}: ${esc(L(s.title))}">
      <span class="tl-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <span class="tl-body"><span class="tl-at">${esc(L(s.at))}</span><span class="tl-title">${esc(L(s.title))}</span></span>
    </button>
    ${s.text ? `<p class="tl-text">${esc(L(s.text))}</p>` : ''}
  </li>`).join('')}</ol>`;
}
function checklist(r, g) {
  const ticks = store.get('rcheck', {})[r.id] || {};
  const rows = [];
  const add = (key, head, body) => body && rows.push([key, head, body]);
  add('access', V.access, g.access ? L(g.access) : L(r.start));
  add('supplies', V.supplies, g.supplies && L(g.supplies));
  add('gear', V.gear, g.gear ? L(g.gear) : r.gear.map((k) => GEAR[lang]?.[k] || GEAR.en[k] || k).join(lang === 'zh' ? '、' : ', '));
  add('season', V.season, g.season ? L(g.season) : L(r.seasonNote));
  if (r.gear.includes('booking') || r.gear.includes('ticket')) add('bookings', V.bookings, L(r.seasonNote));
  return `<ul class="rp-check">${rows.map(([k, h, b]) => `<li><label><input type="checkbox" data-tick="${k}"${ticks[k] ? ' checked' : ''}>
    <span><b>${esc(h)}</b>${esc(b)}</span></label></li>`).join('')}</ul>`;
}
const routeLink = (r) => `<li><a class="row" href="/r/${r.id}"><span class="row-l"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span><span class="row-name">${esc(L(r.name))}</span></span><span class="row-v">${esc(T.mode[r.mode])}</span></a></li>`;
function placeCard(pl) {
  return `<li class="pc" id="pl-${pl.id}"><button type="button" class="pc-go" data-place="${pl.id}">
    <span class="pc-k">${esc(V.kind[pl.kind])}</span><span class="pc-name">${esc(L(pl.name))}</span></button>
    ${whyList(whyFor(pl.id).slice(0, 2), lang, T)}
    <p>${esc(L(pl.note))}${tv(pl.verify?.includes('note'))}</p>
    <p class="pc-meta"><span>${esc(V.price[pl.price])}</span>${pl.booking ? `<span>${esc(V.booking)}</span>` : ''}<span>${esc(V.weather[pl.weather])}</span><span>${esc(V.hours(pl.hours))}${tv(pl.verify?.includes('hours'))}</span>
      <a href="${esc(pl.src.url)}" target="_blank" rel="noopener noreferrer">${esc(pl.src.label.split(' — ')[0])}</a></p></li>`;
}

function render() {
  T = strings(lang); V = V3[lang];
  const r = route, g = guide;
  document.documentElement.lang = LANGS[lang].html;
  document.title = `${L(r.name)} — ${T.wordmark}`;
  $('#rp-wordmark').textContent = T.wordmark;
  $('#rp-back').textContent = `← ${V.back}`;
  $('#rp-swap-t').textContent = V.swap;
  $('#rp-swap').title = `${V.swap} (S)`;
  $('#tab-guide').textContent = V.paneGuide;
  $('#tab-map').textContent = V.paneMap;
  $('#rp-map').setAttribute('aria-label', V.paneMap);
  const lb = $('#lang');
  lb.textContent = T.langSwitch;
  lb.lang = lang === 'zh' ? 'en' : 'zh-Hans';
  lb.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
  $('#rp-credit').textContent = `${V.illus} ${COAST_CREDIT}`;

  const i = siblings.findIndex((x) => x.id === r.id);
  const prev = siblings[(i - 1 + siblings.length) % siblings.length], next = siblings[(i + 1) % siblings.length];
  const multi = r.days > 1;
  const srcKeys = [...new Set([...(g.sources || []), ...r.sources])].filter((k) => SOURCES[k]);
  $('#rp-guide').innerHTML = `
    ${figure(r.id, lang, { eager: true, sizes: '(max-width: 899px) 100vw, 45vw', cls: 'rp-photo' })}
    <header class="rp-head" style="--c:${MODE_COLOR[r.mode]}">
      <p class="ac-kicker"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(T.mode[r.mode])} · ${esc(T.island[r.island])} · ${esc(L(REGIONS[r.from]))}</p>
      <h1 id="rp-h1">${esc(L(r.name))}</h1>
      <p class="rp-lead">${esc(g.intro ? L(g.intro) : V.lead(L(r.name)))}</p>
      <ol class="ac-ends">
        <li><span class="end-ico s" aria-hidden="true">◆</span><span><small>${esc(T.f.start)}</small>${esc(L(r.start))}${verifyMark(r, 'start')}</span></li>
        <li><span class="end-ico e" aria-hidden="true"></span><span><small>${esc(T.f.end)}</small>${esc(L(r.end))}${verifyMark(r, 'end')}</span></li>
      </ol>
    </header>
    <section class="rp-why" aria-labelledby="h-why"><h2 id="h-why">${esc(V.whyH)}</h2>${whyList(whyFor(r.id), lang, T)}</section>
    ${factsStrip(r)}
    ${bookBlock(r)}
    <a class="cmp-link" href="/compare?a=${r.id}&b=${(nearRoutes.find((x) => x.mode === r.mode) || next).id}">${esc(V4[lang].cmpLink)} →</a>
    ${g.verify ? `<p class="rp-draft">${esc(V.draft)}</p>` : ''}

    <section class="rp-sec" aria-labelledby="h-day">
      <h2 id="h-day">${esc(multi ? V.dayHMulti : V.dayH)}${g.plan ? `<small>${esc(L(g.plan))}</small>` : ''}</h2>
      ${g.pacing ? `<p class="note">${esc(L(g.pacing))}</p>` : g.origin === 'auto' ? `<p class="note">${esc(V.autoNote)}${verifyMark(r, 'highlights')}</p>` : ''}
      ${timeline(g)}
    </section>

    <section class="rp-sec" aria-labelledby="h-check">
      <h2 id="h-check">${esc(V.checkH)}</h2>
      ${checklist(r, g)}
    </section>

    ${g.tips?.length ? `<section class="rp-sec" aria-labelledby="h-tips"><h2 id="h-tips">${esc(V.tipsH)}</h2>
      <ul class="rp-tips">${g.tips.map((t) => `<li><b>${esc(L(t.title))}</b><p>${esc(L(t.text))}</p></li>`).join('')}</ul></section>` : ''}

    <section class="rp-sec" aria-labelledby="h-alt">
      <h2 id="h-alt">${esc(g.alternatives ? V.altH : V.altSame)}</h2>
      ${g.alternatives ? `<p>${esc(L(g.alternatives))}</p>` : ''}
      ${nearRoutes.length ? `<ul class="rows rp-near">${nearRoutes.map(routeLink).join('')}</ul>` : ''}
    </section>

    ${nearPlaces.length ? `<section class="rp-sec" aria-labelledby="h-places"><h2 id="h-places">${esc(V.nearH)}</h2>
      <ul class="pcs">${nearPlaces.map(placeCard).join('')}</ul></section>` : ''}

    <section class="rp-sec" aria-labelledby="h-src">
      <h2 id="h-src">${esc(V.srcH)}</h2>
      <ul class="rows">${srcKeys.map((k) => `<li><a class="row" href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer"><span class="row-l">${esc(SOURCES[k].label)}</span><span class="row-v">${esc(new URL(SOURCES[k].url).hostname.replace('www.', ''))}</span></a></li>`).join('')}</ul>
    </section>

    <nav class="rp-pn" aria-label="${esc(V.prev)} / ${esc(V.next)}">
      <a href="/r/${prev.id}"><small>← ${esc(V.prev)}</small>${esc(L(prev.name))}</a>
      <a href="/r/${next.id}"><small>${esc(V.next)} →</small>${esc(L(next.name))}</a>
    </nav>
    <p class="note rp-foot">${esc(T.footPrivacy)}</p>`;

  letter(document.querySelectorAll('#rp-h1, .rp-sec > h2, #rp-wordmark'), lang);
  syncControls();
  syncPlay();
  map?.setLang(lang, T);
}
function syncControls() {
  $('#pl-rate').textContent = `${rate}×`;
  $('#pl-rate').setAttribute('aria-label', `${V.speed} ${rate}×`);
  $('#pl-in .vh').textContent = V.zoomIn;
  $('#pl-out .vh').textContent = V.zoomOut;
  $('#pl-home .vh').textContent = V.zoomHome;
  $('#pl-places').textContent = V.places;
  $('#pl-places').setAttribute('aria-pressed', String(placesOn));
  $('#pl-of').textContent = route.distanceKm == null ? '' : ` / ${T.km(route.distanceKm)}`;
}

$('#rp-guide').addEventListener('click', (e) => {
  const s = e.target.closest('[data-stop]');
  if (s) { seekTo(Number(s.dataset.stop)); return; }
  const pl = e.target.closest('[data-place]');
  if (pl && map) { if (phone.matches) showPane('map'); ctl?.pause(); syncPlay(); map.focusPlace(pl.dataset.place); }
});
$('#rp-guide').addEventListener('change', (e) => {
  const k = e.target.dataset.tick;
  if (!k) return;
  const all = store.get('rcheck', {});
  (all[route.id] ||= {})[k] = e.target.checked;
  store.set('rcheck', all);
});
$('#lang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  store.set('lang', lang);
  render();
});

initMotion();
if (route) {
  applySwap();
  render();
  map = createMap($('#map'), { routes: ROUTES, uid: 'r', onSelect: (rid) => { if (rid !== route.id) location.href = `/r/${rid}`; } });
  map.setLang(lang, T);
  map.setPlaces(nearPlaces, (pid) => {
    const n = document.getElementById(`pl-${pid}`);
    if (!n) return;
    if (phone.matches) showPane('guide');
    n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    n.classList.add('flash');
    setTimeout(() => n.classList.remove('flash'), 1400);
  });
  map.showPlaces(placesOn);
  map.show([route.id, ...nearRoutes.map((r) => r.id)], { animate: false });
  if (motionOff()) syncPlay(); else play();
}
