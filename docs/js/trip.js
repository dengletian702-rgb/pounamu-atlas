// /trip — one whole trip on its own page: a ready-made trip (?tpl=id), a trip saved from the planner (?saved=i),
// or a shared trip carried inside the link (#t=…). Day panels with each route's reason, the map playing the
// whole trip, print, calendar file, share link and a plain summary for a travel adviser. Nothing leaves the browser.
import { ROUTES, SOURCES } from '../data/routes.js';
import { PLACES } from '../data/places.js';
import { ITINERARIES } from '../data/itineraries.js';
import { LANGS, strings, pick } from './i18n.js';
import { V3 } from './i18n-v3.js';
import { V4 } from './i18n-v4.js';
import { createMap, MODE_COLOR } from './map.js';
import { letter } from './lettering.js';
import { whyLine, whyList, tripWhy } from './why-view.js';
import { figure } from './photo.js';
import { store, esc, initMotion, motionOff, offlineSupported, saveOffline } from './page-common.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const q = new URLSearchParams(location.search);
let lang = LANGS[q.get('lang')]?.ready ? q.get('lang') : store.get('lang', (navigator.language || '').startsWith('zh') ? 'zh' : 'en');
let T, V, E;
const L = (o) => pick(o, lang);

// ── One shape for every source ───────────────────────────────────────────
// { key, from: 'tpl'|'planner', title, pitch?, days: [{ title?, routes, places, night?, body?, moves? }] }
function fromTemplate(t) {
  return { key: `tpl-${t.id}`, from: 'tpl', tpl: t.id, title: t.title, pitch: t.pitch, days: t.plan.map((d) => ({ title: d.title, routes: d.routes.filter((id) => byId[id]), places: d.places, night: d.night })) };
}
function fromPlanner(res) {
  const tx = (k, i) => ({ en: res.text.en?.days?.[i]?.[k] || '', zh: res.text.zh?.days?.[i]?.[k] || res.text.en?.days?.[i]?.[k] || '' });
  return {
    key: `plan-${res.plan.days.length}-${res.chosen?.label?.en || ''}`, from: 'planner',
    title: { en: res.text.en?.title || 'Trip', zh: res.text.zh?.title || res.text.en?.title || '行程' },
    pitch: { en: res.text.en?.summary || '', zh: res.text.zh?.summary || '' },
    days: res.plan.days.map((d, i) => ({
      title: d.regionName, body: tx('body', i),
      routes: [...new Set(d.items.filter((it) => it.type === 'route' && byId[it.id]).map((it) => it.id))],
      moves: d.items.filter((it) => it.type === 'transfer').map((it) => ({ a: it.fromName, b: it.toName, h: it.hours })),
      places: [], night: null,
    })),
  };
}
// Share links: the trip itself, as base64url JSON in the hash, so no server ever stores it.
const b64 = { enc: (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/pounamu-atlas/')), (c) => c.charCodeAt(0))) };
function fromShare(h) {
  try {
    const t = JSON.parse(b64.dec(h));
    if (!Array.isArray(t.days) || t.days.length > 40) return null;
    t.days = t.days.map((d) => ({ ...d, routes: (d.routes || []).filter((id) => byId[id]), places: (d.places || []).filter((id) => placeById[id]) }));
    return { ...t, from: t.from === 'tpl' ? 'tpl' : 'planner', key: 'shared' };
  } catch { return null; }
}
function loadTrip() {
  const hash = location.hash.match(/^#t=([\w-]+)$/);
  if (hash) return fromShare(hash[1]);
  const t = ITINERARIES.find((x) => x.id === q.get('tpl'));
  if (t) return fromTemplate(t);
  const saved = store.get('trips', [])[Number(q.get('saved'))];
  return saved ? fromPlanner(saved.result) : null;
}
const trip = loadTrip();
const allRoutes = trip ? [...new Set(trip.days.flatMap((d) => d.routes))] : [];

// ── Map ──────────────────────────────────────────────────────────────────
let map = null, ctl = null;
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
const dayOfRoute = (id) => trip.days.findIndex((d) => d.routes.includes(id));
function markDay(i) {
  document.querySelectorAll('.td').forEach((n, k) => n.classList.toggle('now', k === i));
}
function playAll() {
  if (!map || !allRoutes.length) return;
  const legs = legsFor(allRoutes);
  const bar = $('#prog');
  ctl = map.journey(legs, {
    pace: motionOff() ? 6 : 1,
    onTick: (i, p) => { bar.style.width = `${(((i + p) / legs.length) * 100).toFixed(1)}%`; },
    onLeg: (i) => { if (legs[i]?.id) markDay(dayOfRoute(legs[i].id)); },
    onDone: () => { bar.style.width = '100%'; markDay(-1); syncPlay(); },
  });
  syncPlay();
}
function syncPlay() {
  const on = ctl && !ctl.isDone() && !ctl.isPaused();
  $('#tp-play').textContent = on ? E.pause : E.playAll;
}

// ── Calendar, share, adviser summary ─────────────────────────────────────
const dayTitle = (d, i) => `${E.dayN(i + 1)}${d.title ? ` · ${L(d.title)}` : ''}`;
const routeNames = (d) => d.routes.map((id) => L(byId[id].name));
function icsFile(start) {
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  const escI = (s) => String(s).replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = trip.days.map((d, i) => {
    const a = new Date(start); a.setDate(a.getDate() + i);
    const b = new Date(a); b.setDate(b.getDate() + 1);
    const desc = [...routeNames(d), ...(d.night ? [`${V.night}: ${L(d.night)}`] : []), ...d.routes.map((id) => `${location.origin}/r/${id}`)].join('\n');
    return ['BEGIN:VEVENT', `UID:${trip.key}-${i + 1}-${ymd(start)}@pounamu-atlas.local`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(a)}`, `DTEND;VALUE=DATE:${ymd(b)}`,
      `SUMMARY:${escI(`${dayTitle(d, i)} — ${L(trip.title)}`)}`, `DESCRIPTION:${escI(desc)}`, 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pounamu Atlas//Trip//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
function shareLink() {
  const slim = { from: trip.from, title: trip.title, pitch: trip.pitch, days: trip.days.map(({ title, routes, places, night, moves }) => ({ title, routes, places, night, moves })) };
  return trip.from === 'tpl' && trip.tpl ? `${location.origin}/trip?tpl=${trip.tpl}` : `${location.origin}/trip#t=${b64.enc(JSON.stringify(slim))}`;
}
function adviserText() {
  const lines = [`${L(trip.title)} (${trip.days.length} ${lang === 'zh' ? '天' : 'days'})`, ''];
  trip.days.forEach((d, i) => {
    lines.push(dayTitle(d, i));
    for (const m of d.moves || []) lines.push(`  ${L(m.a)} → ${L(m.b)} ≈ ${m.h} h`);
    for (const id of d.routes) lines.push(`  - ${L(byId[id].name)} (${L(byId[id].duration)})`);
    if (d.places.length) lines.push(`  ${d.places.map((p) => L(placeById[p]?.name || { en: p })).join(', ')}`);
    if (d.night) lines.push(`  ${V.night}: ${L(d.night)}`);
  });
  lines.push('', shareLink());
  return lines.join('\n');
}
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  const was = btn.textContent;
  btn.textContent = E.copied;
  setTimeout(() => { btn.textContent = was; }, 1600);
}

// ── Render ───────────────────────────────────────────────────────────────
function dayPanel(d, i) {
  const routes = d.routes.map((id) => {
    const r = byId[id];
    return `<li class="td-r">
      ${figure(id, lang, { sizes: '(max-width: 899px) 100vw, 320px', cls: 'td-ph' })}
      <div><a class="td-name" href="/pounamu-atlas/r/${id}"><span class="dot" style="background:${MODE_COLOR[r.mode]}"></span>${esc(L(r.name))}</a>
      <p class="td-meta">${esc(T.mode[r.mode])} · ${esc(L(r.duration))} · ${esc(T.diff[r.difficulty])}</p>
      ${whyLine(id, lang)}</div></li>`;
  }).join('');
  const places = d.places.filter((p) => placeById[p]).map((p) => `<li>${esc(L(placeById[p].name))}${whyLine(p, lang)}</li>`).join('');
  const moves = (d.moves || []).map((m) => `<p class="td-move">${esc(L(m.a))} → ${esc(L(m.b))} · ${esc(lang === 'zh' ? `约${m.h}小时` : `≈ ${m.h} h`)}</p>`).join('');
  return `<li class="td" id="day-${i + 1}">
    <h2 class="td-h"><span class="td-n">${esc(E.dayN(i + 1))}</span>${d.title ? esc(L(d.title)) : ''}</h2>
    ${moves}
    ${routes ? `<ul class="td-routes">${routes}</ul>` : ''}
    ${places ? `<ul class="td-places">${places}</ul>` : ''}
    ${d.body && L(d.body) ? `<p class="td-body">${esc(L(d.body))}</p>` : ''}
    ${!routes && !places && !moves && !(d.body && L(d.body)) ? `<p class="td-body">${esc(E.spare)}</p>` : ''}
    ${d.night ? `<p class="td-night">${esc(V.night)}${lang === 'zh' ? '：' : ': '}${esc(L(d.night))}</p>` : ''}
  </li>`;
}
function feedback() {
  const k = trip.key, votes = store.get('votes', {});
  const v = votes[k];
  return `<div class="fb" id="fb"><span>${esc(v ? E.thanks : E.helpful)}</span>${v ? '' : `<button type="button" class="link-btn" data-vote="up">👍 ${esc(E.yes)}</button><button type="button" class="link-btn" data-vote="down">👎 ${esc(E.no)}</button>`}</div>`;
}
function render() {
  T = strings(lang); V = V3[lang]; E = V4[lang];
  document.documentElement.lang = LANGS[lang].html;
  $('#pg-wordmark').textContent = T.wordmark;
  $('#pg-back').textContent = V.back;
  $('#pg-back').href = '/pounamu-atlas/#trips';
  $('#lang').textContent = lang === 'zh' ? 'English' : '中文';
  $('#lang').lang = lang === 'zh' ? 'en' : 'zh-Hans';
  if (!trip) {
    document.title = `${E.tripH} — ${T.wordmark}`;
    $('#pg').innerHTML = `<header class="pg-head"><h1 id="pg-h1">${esc(E.tripH)}</h1><p class="pg-lead">${esc(E.tripNone)}</p><p><a class="btn" href="/pounamu-atlas/#trips">${esc(V.tripsH)}</a></p></header>`;
    return;
  }
  document.title = `${L(trip.title)} — ${T.wordmark}`;
  const start = store.get('tripStart', '') || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  $('#pg').innerHTML = `
    <div class="tp">
      <section class="tp-map" aria-label="Map">
        <div class="map-holder" id="map"></div>
        <div class="tp-ctl"><button type="button" class="btn btn-small" id="tp-play">${esc(E.playAll)}</button><div class="prog"><span class="prog-fill" id="prog"></span></div></div>
        <p class="rp-credit">${esc(V.credit)} · ${esc(T.a.illus)}</p>
      </section>
      <article class="tp-guide">
        <header class="pg-head">
          <p class="ac-kicker">${esc(trip.from === 'tpl' ? E.from : E.fromPlanner)} · ${esc(V.days(trip.days.length))}</p>
          <h1 id="pg-h1">${esc(L(trip.title))}</h1>
          ${trip.pitch && L(trip.pitch) ? `<p class="pg-lead">${esc(L(trip.pitch))}</p>` : ''}
        </header>
        <section class="rp-why"><h2>${esc(V.whyTrip)}</h2>${whyList(tripWhy([...allRoutes, ...trip.days.flatMap((d) => d.places)], 4), lang, T)}</section>
        <div class="tp-tools">
          <button type="button" class="btn btn-quiet btn-small" id="tp-print">${esc(E.print)}</button>
          <span class="tp-ics"><label class="fl"><span>${esc(E.startDate)}</span><input type="date" id="tp-start" value="${esc(start)}"></label><button type="button" class="btn btn-quiet btn-small" id="tp-ics">${esc(E.ics)}</button></span>
          <button type="button" class="btn btn-quiet btn-small" id="tp-share">${esc(E.share)}</button>
          <button type="button" class="btn btn-quiet btn-small" id="tp-adviser">${esc(E.adviser)}</button>
          ${offlineSupported() ? `<button type="button" class="btn btn-quiet btn-small" id="tp-offline"${store.get('offline', false) ? ' disabled' : ''}>${esc(store.get('offline', false) ? E.offlineDone : E.offline)}</button>` : ''}
        </div>
        <p class="note">${esc(E.storeNote)}</p>
        <ol class="tdays">${trip.days.map(dayPanel).join('')}</ol>
        ${feedback()}
        <p class="note">${[...new Set(allRoutes.flatMap((id) => byId[id].sources))].filter((k) => SOURCES[k]).map((k) => `<a class="src" href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[k].label.split(' — ')[0])}</a>`).join(' ')}</p>
      </article>
    </div>`;
  letter(document.querySelectorAll('#pg-h1, #pg-wordmark, .rp-why > h2'), lang);
  map = createMap($('#map'), { routes: ROUTES, uid: 't', onSelect: (rid) => { location.href = `/pounamu-atlas/r/${rid}`; } });
  map.setLang(lang, T);
  map.show(allRoutes, { animate: false });
  if (!motionOff()) playAll();
}

$('#pg').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.id === 'tp-play') { if (!ctl || ctl.isDone()) playAll(); else { ctl.toggle(); syncPlay(); } }
  if (t.id === 'tp-print') window.print();
  if (t.id === 'tp-share') copy(shareLink(), t);
  if (t.id === 'tp-adviser') copy(adviserText(), t);
  if (t.id === 'tp-ics') {
    const v = $('#tp-start').value;
    store.set('tripStart', v);
    const [y, m, d] = v.split('-').map(Number);
    const url = URL.createObjectURL(new Blob([icsFile(new Date(y, m - 1, d))], { type: 'text/calendar' }));
    Object.assign(document.createElement('a'), { href: url, download: 'pounamu-trip.ics' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  if (t.id === 'tp-offline') {
    t.disabled = true;
    const ok = await saveOffline().catch(() => false);
    t.textContent = ok ? E.offlineDone : E.offlineNo;
  }
  if (t.dataset.vote) {
    const votes = store.get('votes', {});
    votes[trip.key] = t.dataset.vote;
    store.set('votes', votes);
    $('#fb').outerHTML = feedback();
  }
});
$('#lang').addEventListener('click', () => { lang = lang === 'zh' ? 'en' : 'zh'; store.set('lang', lang); ctl?.cancel(); render(); });

initMotion();
render();
