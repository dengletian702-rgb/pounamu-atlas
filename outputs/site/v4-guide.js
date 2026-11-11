/* v4 search, place picker, day editor, destination pages.
   New visible copy comes from docs/data/v4-strings.json (zh and en). */
(function () {
  const state = {
    strings: null,
    catalog: null,
    tracks: null,
    sports: null,
    lang: 'zh',
    draft: null,
    undo: [],
    redo: [],
    toastTimer: null,
    moveFor: null,
  };
  const DRAFT_KEY = 'pounamu-v4-draft';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fold(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/†/g, '').replace(/\s+/g, ' ').trim();
  }
  function haversineKm(lat1, lon1, lat2, lon2) {
    const r = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function t(key, vars) {
    const row = state.strings && state.strings[key];
    let text = row ? (state.lang === 'en' ? row.en : row.zh) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll('{' + k + '}', String(v));
    return text;
  }
  function pageLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') return q;
    return document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function aliasId(id) {
    const aliases = (state.catalog && state.catalog.aliases) || {};
    return Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : id;
  }
  function byId(id) {
    id = aliasId(id);
    return (state.catalog && state.catalog.places || []).find(p => p.place_id === id) || null;
  }
  function towns() {
    return (state.catalog && state.catalog.places || []).filter(p => p.type === 'town');
  }
  function nameOf(p) {
    if (!p) return '';
    return state.lang === 'en' ? (p.name_en || p.name_zh) : (p.name_zh || p.name_en);
  }
  function regionMeta(id) {
    return (state.catalog && state.catalog.regions || []).find(r => r.id === id) || null;
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(url);
    return res.json();
  }
  async function ensureData() {
    if (!state.strings) state.strings = await loadJson('data/v4-strings.json');
    if (!state.catalog) state.catalog = await loadJson('data/v4-catalog.json');
    window.P10_CATALOG_TOWNS = (state.catalog.places || []).filter(p => p.type === 'town');
    if (typeof window.renderP10Planner === 'function') window.renderP10Planner();
  }

  function mountNav() {
    const header = document.querySelector('.header');
    const nav = header && header.querySelector('.nav');
    if (!nav || header.querySelector('.v4-nav-toggle')) return;
    if (!nav.querySelector('.v4-nav-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'v4-nav-toggle';
      btn.setAttribute('aria-expanded', 'false');
      const label = () => { btn.textContent = nav.classList.contains('is-open') ? t('closeMenu') : t('menu'); };
      label();
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        label();
      });
      nav.before(btn);
    }
  }

  function readSearch() {
    const q = new URLSearchParams(location.search);
    return {
      q: q.get('q') || '',
      scope: q.get('scope') || 'all',
      days: q.get('days') || 'any',
      exact: q.get('exact') || '',
      activity: q.get('activity') || 'all',
      island: q.get('island') || 'all',
    };
  }
  function writeSearch(next, replace) {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === '' || v === 'all' || v === 'any') q.delete(k);
      else q.set(k, v);
    }
    q.set('lang', state.lang);
    const url = location.pathname + '?' + q.toString() + location.hash;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
  }
  function daysOk(n, bucket, exact) {
    if (exact) return Number(n) === Number(exact);
    if (!bucket || bucket === 'any') return true;
    if (bucket === '1-3') return n >= 1 && n <= 3;
    if (bucket === '4-6') return n >= 4 && n <= 6;
    if (bucket === '7-10') return n >= 7 && n <= 10;
    if (bucket === '11-14') return n >= 11 && n <= 14;
    if (bucket === '15+') return n >= 15;
    const num = Number(bucket);
    return Number.isFinite(num) ? n === num : true;
  }
  function matchNine(query) {
    const f = fold(query).replace(/-/g, ' ');
    return /9\s*天.*环南岛|环南岛.*9/.test(query || '') || f.includes('9 day south island self drive');
  }
  function matchSeven(query) {
    return /7\s*天|7\s*-?\s*day/i.test(query || '') && /南岛|south island/i.test(query || '');
  }
  function templateHits(filters) {
    const list = (state.catalog.templates || []).filter(item => {
      if (filters.activity !== 'all' && item.activity !== filters.activity) return false;
      if (!daysOk(item.stated_days || item.day_count, filters.days, filters.exact)) return false;
      if (filters.island === 'south' && !String(item.id).startsWith('SI')) return false;
      if (filters.island === 'north' && !String(item.id).startsWith('NI')) return false;
      const q = fold(filters.q);
      if (!q) return true;
      if (matchNine(filters.q) && (item.id === 'SI-09B' || item.id === 'SI-09A')) return true;
      if (matchSeven(filters.q) && (item.id === 'SI-07A' || item.id === 'SI-07B')) return true;
      const blob = fold([item.id, item.title_zh, item.title_en, item.blurb_zh, item.blurb_en, ...(item.aliases || [])].join(' '));
      return blob.includes(q);
    });
    list.sort((a, b) => {
      const rank = id => id === 'SI-09B' ? 0 : id === 'SI-09A' ? 1 : id === 'SI-07A' ? 2 : id === 'SI-07B' ? 3 : 9;
      if (matchNine(filters.q)) return rank(a.id) - rank(b.id);
      if (matchSeven(filters.q)) return (a.id === 'SI-07A' ? 0 : 1) - (b.id === 'SI-07A' ? 0 : 1);
      return String(a.id).localeCompare(String(b.id));
    });
    return list;
  }
  function placeHits(filters) {
    const q = fold(filters.q);
    if (filters.scope === 'itineraries') return [];
    return towns().filter(p => {
      if (filters.island !== 'all' && p.island !== filters.island) return false;
      if (!q) return false;
      const blob = fold([p.name_en, p.name_zh, p.town, p.atlas_region, p.place_id].join(' '));
      return blob.includes(q);
    }).slice(0, 8);
  }
  function routeHits(filters) {
    if (typeof routes === 'undefined' || filters.scope === 'destinations') return [];
    if (filters.days !== 'any' || filters.exact) return [];
    const q = fold(filters.q);
    return routes.filter(r => {
      if (filters.activity !== 'all' && r.mode !== filters.activity) return false;
      if (filters.island !== 'all' && r.island !== filters.island) return false;
      if (!q) return false;
      const region = Array.isArray(r.region) ? r.region.join(' ') : '';
      return fold([r.name, r.zh, r.id, region].join(' ')).includes(q);
    }).slice(0, 6);
  }

  function chip(name, value, label, pressed) {
    return `<button type="button" data-${name}="${esc(value)}" aria-pressed="${pressed ? 'true' : 'false'}">${esc(label)}</button>`;
  }
  function renderSearch() {
    const host = document.querySelector('#v4-search');
    if (!host || !state.catalog) return;
    const f = readSearch();
    const nine = matchNine(f.q);
    const templates = f.scope === 'destinations' ? [] : templateHits(f);
    const places = placeHits(f);
    const guides = routeHits(f);
    const empty = Boolean(f.q) && !templates.length && !places.length && !guides.length;
    const daysChips = [['any', 'daysAny'], ['1-3', 'days1'], ['4-6', 'days4'], ['7-10', 'days7'], ['11-14', 'days11'], ['15+', 'days15']];
    const acts = [['all', 'scopeAll'], ['walk', 'actWalk'], ['cycle', 'actCycle'], ['drive', 'actDrive'], ['transit', 'actTransit'], ['paddle', 'actPaddle']];
    host.innerHTML = `<h2>${esc(t('searchKicker'))}</h2><p class="v4-search-lead">${esc(t('searchLead'))}</p>
      <form id="v4-search-form">
        <label class="v4-field">${esc(t('searchLabel'))}<input id="v4-q" type="search" name="q" value="${esc(f.q)}" placeholder="${esc(t('searchPlaceholder'))}" autocomplete="off"></label>
        <div id="v4-suggest" class="v4-suggest" hidden></div>
        <div class="v4-field"><span>${esc(t('scopeLabel'))}</span><div class="v4-chips" role="group">${chip('scope', 'all', t('scopeAll'), f.scope === 'all')}${chip('scope', 'destinations', t('scopeDest'), f.scope === 'destinations')}${chip('scope', 'itineraries', t('scopeRoutes'), f.scope === 'itineraries')}</div></div>
        <div class="v4-field"><span>${esc(t('daysLabel'))}</span><div class="v4-chips" role="group">${daysChips.map(([v, k]) => chip('days', v, t(k), f.days === v && !f.exact)).join('')}</div>
          <label>${esc(t('daysExact'))} <input id="v4-exact" type="number" min="1" max="30" value="${esc(f.exact)}" inputmode="numeric"></label></div>
        <div class="v4-field"><span>${esc(t('activityLabel'))}</span><div class="v4-chips" role="group">${acts.map(([v, k]) => chip('activity', v, t(k), f.activity === v)).join('')}</div></div>
        <div class="v4-field"><span id="v4-island-label">${esc(t('islandLabel'))}</span><div class="v4-chips" role="group" aria-labelledby="v4-island-label">${chip('island', 'all', t('islandAll'), f.island === 'all')}${chip('island', 'north', t('islandNorth'), f.island === 'north')}${chip('island', 'south', t('islandSouth'), f.island === 'south')}</div></div>
        <button class="v4-primary" type="submit">${esc(t('searchSubmit'))}</button>
      </form>
      <div id="v4-results" class="v4-results">${renderResultCards(templates, places, guides, nine, empty, f)}</div>`;
    const form = host.querySelector('#v4-search-form');
    form.addEventListener('click', event => {
      const b = event.target.closest('button[data-scope],button[data-days],button[data-activity],button[data-island]');
      if (!b) return;
      const key = b.dataset.scope != null ? 'scope' : b.dataset.days != null ? 'days' : b.dataset.activity != null ? 'activity' : 'island';
      const value = b.dataset[key];
      const next = Object.assign(readSearch(), { [key]: value });
      if (key === 'days') next.exact = '';
      writeSearch(next, true);
      renderSearch();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const next = readSearch();
      next.q = host.querySelector('#v4-q').value.trim();
      next.exact = host.querySelector('#v4-exact').value.trim();
      if (next.exact) next.days = 'any';
      writeSearch(next, false);
      renderSearch();
    });
    host.querySelector('#v4-q').addEventListener('input', event => suggest(event.target.value));
    host.querySelector('#v4-results').addEventListener('click', event => {
      const clear = event.target.closest('[data-v4-clear]');
      if (clear) { writeSearch({ q: readSearch().q, scope: 'all', days: 'any', exact: '', activity: 'all' }, true); renderSearch(); }
      const south = event.target.closest('[data-v4-south]');
      if (south) { writeSearch({ q: '', island: 'south', days: '7-10', activity: 'drive', scope: 'itineraries', exact: '' }, true); renderSearch(); }
    });
  }
  // Empty-search suggestions are the same two primary templates for every island.
  // Island, day and activity filters remove a card; they never add a different one.
  // NI-01 is not a primary, so a North Island filter does not surface it.
  function suggestionTemplates(filters) {
    const pool = state.catalog.templates || [];
    return ['SI-09B', 'SI-07A'].map(id => pool.find(item => item.id === id)).filter(item => {
      if (!item) return false;
      if (filters.island === 'north') return false;
      if (filters.activity !== 'all' && item.activity !== filters.activity) return false;
      return daysOk(item.stated_days || item.day_count, filters.days, filters.exact);
    });
  }
  function renderResultCards(templates, places, guides, nine, empty, filters) {
    if (empty) {
      const unrelated = suggestionTemplates(filters);
      const suggested = unrelated.length ? `<p class="v4-note">${esc(t('unrelated'))}</p>${unrelated.map(cardTemplate).join('')}` : '';
      return `<div class="v4-alert"><h3>${esc(t('noResults', { q: filters.q }))}</h3><p>${esc(t('noResultsWhy'))}</p>
        <div class="v4-actions"><button type="button" data-v4-clear>${esc(t('clearFilters'))}</button>
        <button type="button" data-v4-south>${esc(t('seeSouth'))}</button>
        <a href="guide.html?blank=1&amp;lang=${state.lang}">${esc(t('blankTrip'))}</a>
        <a class="v4-alt" href="guide.html?view=pick&amp;lang=${state.lang}">${esc(t('browseDest'))}</a></div></div>
        ${suggested}`;
    }
    const cards = [];
    if (!filters.q && filters.scope !== 'destinations') {
      const pool = (state.catalog.templates || []).filter(item => daysOk(item.stated_days || item.day_count, filters.days, filters.exact) && (filters.activity === 'all' || item.activity === filters.activity) && (filters.island === 'all' || (filters.island === 'south' ? String(item.id).startsWith('SI') : String(item.id).startsWith('NI'))));
      pool.sort((a, b) => {
        if (filters.island === 'south' && filters.days === '7-10') {
          const rank = id => id === 'SI-09B' ? 0 : id === 'SI-09A' ? 1 : id === 'SI-07A' ? 2 : id === 'SI-07B' ? 3 : 9;
          return rank(a.id) - rank(b.id) || String(a.id).localeCompare(String(b.id));
        }
        return String(a.id).localeCompare(String(b.id));
      });
      cards.push(...pool.map(item => cardTemplate(item)));
    } else cards.push(...templates.map(item => cardTemplate(item, nine && item.id === 'SI-09A')));
    cards.push(...places.map(cardPlace));
    cards.push(...guides.map(cardGuide));
    return cards.join('') || `<p class="v4-note">${esc(t('browseDest'))}</p>`;
  }
  function cardTemplate(item, asAlt) {
    const title = state.lang === 'en' ? item.title_en : item.title_zh;
    const blurb = state.lang === 'en' ? item.blurb_en : item.blurb_zh;
    const badge = item.role === 'primary-9' || item.role === 'primary-7' ? t('primaryBadge') : (item.role === 'alternate-9' || item.role === 'alternate-7' || asAlt ? t('altBadge') : '');
    return `<article class="v4-card" data-template="${esc(item.id)}"><p>${badge ? `<span class="v4-badge">${esc(badge)}</span>` : ''}<span class="v4-badge">${esc(item.id)}</span> ${esc(String(item.stated_days || item.day_count))} · ${esc(t('actDrive'))}</p><h3>${esc(title)}</h3><p>${esc(blurb)}</p>${item.oneWay ? `<p>${esc(t('oneWayNote'))}</p>` : ''}${nzCredit(item)}<div class="v4-actions"><a href="guide.html?template=${esc(item.id)}&amp;lang=${state.lang}">${esc(t('openEdit'))}</a></div></article>`;
  }
  function nzCredit(item) {
    const listed = item && Array.isArray(item.nz_sources) && item.nz_sources.length
      ? item.nz_sources
      : (item && item.nz_source_url ? [{ url: item.nz_source_url, accessed: item.nz_accessed || '' }] : []);
    const links = listed.filter(row => row && /^https?:\/\//i.test(row.url) && /newzealand\.com/i.test(row.url));
    if (!links.length) return '';
    const rows = links.map(row => `<li><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">${esc(t('nzPage'))}</a>${row.accessed ? ' · ' + esc(t('accessedOn')) + ' ' + esc(row.accessed) : ''}</li>`).join('');
    return `<p class="v4-note">${esc(t('adaptedFrom'))}</p><ul class="v4-nz-sources">${rows}</ul>`;
  }
  function cardPlace(p) {
    return `<article class="v4-card"><h3>${esc(nameOf(p))} ${esc(state.lang === 'en' ? p.name_zh : p.name_en)}</h3><p>${esc(p.island === 'north' ? t('islandNorth') : t('islandSouth'))} · ${esc(p.atlas_region)}</p><div class="v4-actions"><a href="destination.html?id=${esc(p.place_id)}&amp;lang=${state.lang}">${esc(t('viewDest'))}</a><a class="v4-alt" href="guide.html?add=${esc(p.place_id)}&amp;lang=${state.lang}">${esc(t('addToTrip'))}</a></div></article>`;
  }
  function cardGuide(r) {
    const title = state.lang === 'en' ? r.name : (r.zh || r.name);
    return `<article class="v4-card"><h3>${esc(title)}</h3><div class="v4-actions"><a href="route.html?id=${esc(r.id)}&amp;lang=${state.lang}">${esc(t('readGuide'))}</a></div></article>`;
  }
  function suggest(raw) {
    const box = document.querySelector('#v4-suggest');
    if (!box) return;
    const q = fold(raw);
    if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    const filters = Object.assign(readSearch(), { q: raw, scope: 'all', days: 'any', exact: '', activity: 'all' });
    const dest = placeHits(filters).slice(0, 4);
    const its = templateHits(filters).slice(0, 4);
    const tracks = state.tracks ? state.tracks.tracks.filter(tr => window.v4TrackMatches(tr, raw)).slice(0, 4) : [];
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { draft = null; }
    const parts = [];
    if (dest.length) parts.push(`<section><h3>${esc(t('suggestDest'))}</h3>${dest.map(p => `<button type="button" data-go="destination.html?id=${esc(p.place_id)}&lang=${state.lang}">${esc(nameOf(p))}</button>`).join('')}</section>`);
    if (its.length) parts.push(`<section><h3>${esc(t('suggestRoutes'))}</h3>${its.map(item => `<button type="button" data-go="guide.html?template=${esc(item.id)}&lang=${state.lang}">${esc(state.lang === 'en' ? item.title_en : item.title_zh)}</button>`).join('')}</section>`);
    if (tracks.length) parts.push(`<section><h3>${esc(t('suggestTracks'))}</h3>${tracks.map(tr => `<button type="button" data-go="tracks.html?q=${encodeURIComponent(raw)}&lang=${state.lang}">${esc(tr.zh || tr.name)}</button>`).join('')}</section>`);
    if (draft && draft.templateId) parts.push(`<section><h3>${esc(t('suggestDrafts'))}</h3><button type="button" data-go="guide.html?draft=1&lang=${state.lang}">${esc(draft.templateId)}</button></section>`);
    box.hidden = !parts.length;
    box.innerHTML = parts.join('');
    box.onclick = event => {
      const go = event.target.closest('[data-go]');
      if (go) location.href = go.dataset.go;
    };
  }

  function blankDraft() {
    return { templateId: '', title: '', requestedDays: 3, days: [], unscheduled: [], chosen: [], island: 'all', regions: [], hideVerify: false, view: 'pick', minimum: 0, edited: false };
  }
  function dayFromRoute(row) {
    return {
      uid: uid(),
      placeId: row.place_id,
      from: row.from,
      to: row.to,
      via: row.via,
      parts: row.parts || [],
      notes: row.notes || '',
      ferry: Boolean(row.ferry),
      source_url: row.source_url || '',
      est_date: row.est_date || '',
      nameVerify: Boolean(row.nameVerify),
      km: row.km || '',
      rawTime: row.drive_time_est || '',
    };
  }
  function draftFromTemplate(id) {
    const item = (state.catalog.templates || []).find(t => t.id === id);
    if (!item) return blankDraft();
    const chosen = [];
    for (const row of item.days) if (row.place_id && !chosen.includes(row.place_id)) chosen.push(row.place_id);
    return {
      templateId: item.id,
      title: state.lang === 'en' ? item.title_en : item.title_zh,
      requestedDays: item.stated_days || item.day_count,
      days: item.days.map(dayFromRoute),
      unscheduled: [],
      chosen,
      island: String(item.id).startsWith('NI') ? 'north' : 'south',
      regions: [],
      hideVerify: false,
      view: 'edit',
      minimum: item.stated_days || item.day_count,
      oneWay: Boolean(item.oneWay),
      nz_source_url: item.nz_source_url || '',
      nz_accessed: item.nz_accessed || '',
      nz_sources: Array.isArray(item.nz_sources) ? item.nz_sources : [],
    };
  }
  function draftFromTight() {
    if (typeof window.p10Plan !== 'function' || typeof window.p10Present !== 'function') return draftFromTemplate('SI-09B');
    const input = { start: 'christchurch', end: 'queenstown', days: 9, pace: 5, preference: 'drive', car: true, wishes: ['tekapo', 'aoraki', 'wanaka', 'queenstown', 'milford'] };
    const plan = window.p10Plan(input);
    const present = window.p10Present(plan);
    const nodes = window.P10_NODES || {};
    const days = present.days.map(d => dayFromNode(d));
    const unscheduled = (present.unscheduled || []).map(w => {
      const node = nodes[w.base] || {};
      const place = towns().find(p => fold(p.name_zh) === fold(w.zh) || fold(p.name_en) === fold(w.en));
      return { placeId: place ? place.place_id : w.base, label_zh: w.zh, label_en: w.en, lat: node.at && node.at[0], lon: node.at && node.at[1] };
    });
    return { templateId: 'p10-tight', title: '', requestedDays: 9, days, unscheduled, chosen: days.map(d => d.placeId).filter(Boolean), island: 'south', regions: [], hideVerify: false, view: 'edit', minimum: plan.minimum, oneWay: false, p10Input: input };
  }
  function placeForNode(node) {
    if (!node) return null;
    const zh = fold(node.zh);
    const en = fold(node.en);
    const list = towns();
    return list.find(p => fold(p.name_zh) === zh || fold(p.name_en) === en)
      || list.find(p => zh && fold(p.name_zh).startsWith(zh))
      || list.find(p => en && fold(p.name_en).startsWith(en))
      || null;
  }
  function dayFromNode(d) {
    const nodes = window.P10_NODES || {};
    const node = nodes[d.at] || {};
    const place = placeForNode(node);
    const legs = (d.legs || []).map(l => {
      const src = l.src || {};
      const date = src.checkedAt || '';
      const kind = src.nzta || src.status === 'nzta-time-read' ? 'nzta' : 'planning';
      const text = (l.h ? String(l.h) : '') + (l.km ? ' · ' + l.km + ' km' : '');
      return { text: text || (state.lang === 'en' ? 'planning estimate' : '规划估算'), kind, hasAbout: false, date };
    });
    return { uid: uid(), placeId: place ? place.place_id : '', nodeId: d.at, from: '', to: '', label_zh: (place && place.name_zh) || node.zh || '', label_en: (place && place.name_en) || node.en || '', via: '', parts: legs, notes: '', ferry: false, source_url: '', est_date: '', nameVerify: false, km: '', rawTime: '' };
  }
  function savedDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved && Array.isArray(saved.days)) return saved;
    } catch { /* keep going */ }
    return null;
  }
  function stripEntryParams() {
    const q = new URLSearchParams(location.search);
    let changed = false;
    for (const key of ['template', 'add', 'blank', 'demo']) {
      if (q.has(key)) { q.delete(key); changed = true; }
    }
    if (!changed) return;
    const next = q.toString();
    history.replaceState(null, '', location.pathname + (next ? '?' + next : ''));
  }
  function dayForPlace(p) {
    return { uid: uid(), placeId: p.place_id, from: '', to: '', label_zh: p.name_zh || '', label_en: p.name_en || '', via: '', parts: [], notes: '', ferry: false, source_url: p.source_url || '', est_date: '', nameVerify: Boolean(p.verify), km: '', rawTime: '' };
  }
  function appendPlace(base, id) {
    const draft = base && Array.isArray(base.days) ? base : blankDraft();
    const p = byId(id);
    if (!p) return draft;
    const already = (draft.chosen || []).includes(p.place_id) || draft.days.some(d => d.placeId === p.place_id);
    draft.pendingToast = already ? 'alreadyIn' : 'added';
    if (already) return draft;
    draft.edited = true;
    draft.chosen = [...(draft.chosen || []), p.place_id];
    draft.days = [...draft.days, dayForPlace(p)];
    return draft;
  }
  function applyEntry() {
    const q = new URLSearchParams(location.search);
    const template = q.get('template');
    const add = q.get('add');
    const saved = savedDraft();
    state.pendingAction = null;
    if (template || q.get('blank') === '1' || q.get('demo') === 'tight') {
      const action = template
        ? { kind: 'template', id: template, view: q.get('view') || '' }
        : q.get('blank') === '1'
          ? { kind: 'blank', view: q.get('view') || '' }
          : { kind: 'tight' };
      if (saved && saved.edited) {
        state.draft = saved;
        state.pendingAction = action;
        stripEntryParams();
        return;
      }
      applyAction(action);
      stripEntryParams();
      return;
    }
    if (add) {
      state.draft = appendPlace(saved, add);
      stripEntryParams();
      return;
    }
    state.draft = saved || draftFromTemplate('SI-09B');
  }
  function persist() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft)); } catch { /* private mode */ }
  }
  function pushUndo() {
    if (state.draft) state.draft.edited = true;
    state.undo.push(JSON.stringify(state.draft));
    if (state.undo.length > 20) state.undo.shift();
    state.redo = [];
  }
  function toast(message) {
    let el = document.querySelector('#v4-toast');
    if (!el) { el = document.createElement('div'); el.id = 'v4-toast'; el.className = 'v4-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(message)}</span><button type="button" data-v4-undo>${esc(t('undo'))}</button>`;
    el.onclick = event => { if (event.target.closest('[data-v4-undo]')) undo(); };
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { if (el.isConnected) el.remove(); }, 7000);
  }
  function undo() {
    if (!state.undo.length) return;
    state.redo.push(JSON.stringify(state.draft));
    state.draft = JSON.parse(state.undo.pop());
    persist();
    renderGuide();
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(JSON.stringify(state.draft));
    state.draft = JSON.parse(state.redo.pop());
    persist();
    renderGuide();
  }

  function legHtml(day) {
    const bits = (day.parts && day.parts.length ? day.parts : [{ text: day.rawTime || '', kind: 'planning', hasAbout: /约|about/i.test(day.rawTime || ''), date: day.est_date || '' }]);
    if (!bits.some(b => b.text)) return `<p>${esc(t('legZero'))} · ${esc(t('estimate'))} · ${day.est_date ? esc(day.est_date) : esc(t('noLegDate'))}</p>`;
    return bits.map(part => {
      const about = part.hasAbout ? '' : (t('about') + ' ');
      const date = part.date ? part.date : t('noLegDate');
      const source = part.kind === 'osrm' ? t('sourceOsrm') : part.kind === 'nzta' ? t('sourceNzta') : part.kind === 'official' ? t('sourceOfficial') : t('sourcePlanning');
      const mark = /†|待核/.test(part.text || '') ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : '';
      return `<p>${esc(about)}${esc(part.text)}${mark}<br><span class="v4-note">${esc(t('estimate'))} · ${esc(date)} · ${esc(source)}</span></p>`;
    }).join('');
  }
  function filteredTowns() {
    const d = state.draft;
    return towns().filter(p => {
      if (d.island !== 'all' && p.island !== d.island) return false;
      if (d.regions && d.regions.length && p.region_id && !d.regions.includes(p.region_id)) return false;
      if (d.regions && d.regions.length && !p.region_id && !d.regions.includes('unmapped')) return false;
      return true;
    });
  }
  function regionButtons() {
    const island = state.draft.island;
    const regions = (state.catalog.regions || []).filter(r => island === 'all' || r.island === island);
    return regions.map(r => {
      const count = towns().filter(p => p.region_id === r.id && (island === 'all' || p.island === island)).length;
      const on = (state.draft.regions || []).includes(r.id);
      const label = (state.lang === 'en' ? r.en : r.zh) + ' (' + count + ')';
      const empty = count === 0 ? ' · ' + t('noPlacesInRegion') : '';
      return `<button type="button" data-region="${esc(r.id)}" aria-pressed="${on ? 'true' : 'false'}" ${count === 0 ? 'data-empty="1"' : ''}>${esc(label + empty)}</button>`;
    }).join('');
  }
  function placeList() {
    const list = filteredTowns();
    const groups = new Map();
    for (const p of list) {
      const key = p.region_id || 'unmapped';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    if ((state.draft.regions || []).includes('unmapped') === false && state.draft.regions && state.draft.regions.length && !state.draft.regions.some(id => groups.has(id) || id === 'unmapped')) {
      /* filters already applied */
    }
    let html = '';
    for (const [key, rows] of groups) {
      const meta = regionMeta(key);
      const heading = meta ? (state.lang === 'en' ? meta.en : meta.zh) : key;
      html += `<section class="v4-group"><h3>${esc(heading)}</h3>`;
      if (!rows.length) html += `<p>${esc(t('noPlacesInRegion'))}</p>`;
      for (const p of rows) {
        if (state.draft.hideVerify && p.verify) continue;
        const on = state.draft.chosen.includes(p.place_id);
        const verify = p.verify ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : '';
        const coord = p.lat == null || p.lon == null ? ` <span class="v4-note">${esc(t('missingCoords'))}</span>` : '';
        const district = p.district_zh ? ` <span class="v4-note">${esc(state.lang === 'en' ? p.district_en : p.district_zh)}</span>` : '';
        html += `<label class="v4-place"><input type="checkbox" data-place="${esc(p.place_id)}" ${on ? 'checked' : ''}><span><strong>${esc(nameOf(p))}</strong> ${esc(state.lang === 'en' ? p.name_zh : p.name_en)}${district}${verify}${coord}</span></label>`;
      }
      html += '</section>';
    }
    const hidden = state.draft.chosen.filter(id => !list.some(p => p.place_id === id));
    if (hidden.length) {
      html = `<p class="v4-note">${esc(t('hiddenChosen'))}: ${hidden.map(id => esc(nameOf(byId(id)) || id)).join(', ')}</p>` + html;
    }
    return html || `<p>${esc(t('noPlacesInRegion'))}</p>`;
  }
  function placeFromLabel(label) {
    const text = fold(label);
    if (!text) return null;
    const hits = towns().filter(p => {
      const zh = fold(p.name_zh);
      const en = fold(p.name_en);
      return (zh && text.includes(zh)) || (en && text.includes(en));
    });
    hits.sort((a, b) => Math.max(fold(b.name_zh).length, fold(b.name_en).length) - Math.max(fold(a.name_zh).length, fold(a.name_en).length));
    return hits[0] || null;
  }
  function mapPoint(p) {
    if (!p || p.lat == null || p.lon == null) return null;
    return { id: p.place_id, lat: p.lat, lon: p.lon, name_zh: p.name_zh, name_en: p.name_en, selected: true };
  }
  function mapStops() {
    const stops = [];
    const origin = placeFromLabel(state.draft.days[0] && state.draft.days[0].from);
    const originPoint = mapPoint(origin);
    if (originPoint) stops.push(originPoint);
    for (const day of state.draft.days) {
      const p = byId(day.placeId);
      const point = mapPoint(p);
      if (point && !(stops.length === 1 && stops[0].id === point.id)) stops.push(point);
      else if (day.nodeId && window.P10_NODES && window.P10_NODES[day.nodeId] && window.P10_NODES[day.nodeId].at) {
        const at = window.P10_NODES[day.nodeId].at;
        const node = window.P10_NODES[day.nodeId];
        stops.push({ id: day.nodeId, lat: at[0], lon: at[1], name_zh: node.zh || '', name_en: node.en || '', selected: true });
      }
    }
    return stops;
  }
  function mapCandidates() {
    const chosen = new Set(state.draft.chosen || []);
    const uns = new Set((state.draft.unscheduled || []).map(item => item.placeId || item));
    const list = filteredTowns().filter(p => p.lat != null && p.lon != null).map(p => ({
      id: p.place_id, lat: p.lat, lon: p.lon, name_zh: p.name_zh, name_en: p.name_en,
      selected: chosen.has(p.place_id) || state.draft.days.some(d => d.placeId === p.place_id),
      unscheduled: uns.has(p.place_id),
    }));
    for (const item of state.draft.unscheduled || []) {
      if (item.lat == null || list.some(p => p.id === item.placeId)) {
        const hit = list.find(p => p.id === item.placeId);
        if (hit) hit.unscheduled = true;
        continue;
      }
      list.push({ id: item.placeId, lat: item.lat, lon: item.lon, name_zh: item.label_zh, name_en: item.label_en, selected: false, unscheduled: true });
    }
    return list;
  }
  function dayCards() {
    const days = state.draft.days;
    return days.map((day, i) => {
      const p = byId(day.placeId);
      const title = state.lang === 'en'
        ? (day.label_en || (p && p.name_en) || '')
        : (day.label_zh || (p && p.name_zh) || '');
      const verify = (day.nameVerify || (p && p.verify)) && !state.draft.hideVerify ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : '';
      const via = day.via ? `<p>${esc(day.via)}${/†|待核/.test(day.via) ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : ''}</p>` : '';
      const pace = /超过\s*5|接近\/超过5|≥\s*5|4–5h|5h/.test(`${day.notes} ${day.rawTime}`) ? `<p class="v4-alert">${esc(t('paceAlert'))}</p>` : '';
      const ferry = day.ferry ? `<p>${esc(t('ferryNote'))}</p>` : '';
      return `<article class="v4-day" tabindex="0" data-index="${i}" draggable="true">
        <div class="v4-day-tools"><button type="button" data-drag="${i}" aria-label="${esc(t('dragHandle'))}">⋮⋮</button>
        <button type="button" data-up="${i}" ${i === 0 ? 'disabled' : ''}>${esc(t('moveUp'))}</button>
        <button type="button" data-down="${i}" ${i === days.length - 1 ? 'disabled' : ''}>${esc(t('moveDown'))}</button>
        <button type="button" data-moveto="${i}">${esc(t('moveTo'))}</button>
        <button type="button" data-add-after="${i}">${esc(t('addDayAfter'))}</button>
        <button type="button" data-del="${i}">${esc(t('deleteDay'))}</button></div>
        <h3>${esc(t('dayN', { n: i + 1 }))} · ${esc(title)}${verify}</h3>
        ${p ? `<p><a href="destination.html?id=${esc(p.place_id)}&amp;lang=${state.lang}">${esc(t('viewDest'))}</a></p>` : ''}
        ${via}${legHtml(day)}${ferry}${pace}
        ${day.notes && !state.draft.hideVerify ? `<p class="v4-note">${esc(day.notes)}</p>` : ''}
      </article>`;
    }).join('') + unscheduledHtml();
  }
  function unscheduledRecord(day) {
    const id = day && (day.placeId || (typeof day === 'string' ? day : ''));
    const p = id ? byId(id) : null;
    const label_zh = (day && day.label_zh) || (p && p.name_zh) || '';
    const label_en = (day && day.label_en) || (p && p.name_en) || '';
    if (!label_zh && !label_en) return null;
    return { placeId: id || '', label_zh, label_en, lat: p ? p.lat : day.lat, lon: p ? p.lon : day.lon };
  }
  function unscheduledHtml() {
    const onTrip = new Set((state.draft.days || []).map(day => day.placeId).filter(Boolean));
    const items = (state.draft.unscheduled || []).map(unscheduledRecord).filter(item => item && item.placeId && !onTrip.has(item.placeId));
    if (!items.length) return '';
    return `<section class="v4-unscheduled"><h3>${esc(t('unscheduled'))}</h3><ul>${items.map(item => `<li>${esc(state.lang === 'en' ? (item.label_en || item.label_zh) : (item.label_zh || item.label_en))}</li>`).join('')}</ul></section>`;
  }
  function tightBlock() {
    const min = Number(state.draft.minimum) || state.draft.days.length;
    const have = Number(state.draft.requestedDays) || min;
    if (!(min > have)) return '';
    return `<div class="v4-alert" role="alert"><p>${esc(t('tightTitle', { min, have }))}</p>
      <div class="v4-actions"><button type="button" data-tight="drop">${esc(t('tightDrop'))}</button>
      <button type="button" data-tight="add">${esc(t('tightAdd', { min }))}</button>
      <a class="v4-alt" href="index.html?q=${encodeURIComponent(state.lang === 'en' ? '9-day South Island self-drive' : '9 天自驾环南岛')}&amp;scope=itineraries&amp;lang=${state.lang}">${esc(t('tightTemplate'))}</a></div></div>`;
  }
  async function renderGuide() {
    const host = document.querySelector('#v4-app');
    if (!host) return;
    const d = state.draft;
    const view = d.view || 'edit';
    host.classList.remove('v4-show-days', 'v4-show-pick', 'v4-show-map', 'v4-show-chosen');
    host.classList.add('v4-show-' + (view === 'edit' ? 'days' : view));
    const count = filteredTowns().length;
    host.innerHTML = `<p class="v4-note">${esc(t('draftNote'))}</p>
      <div class="v4-guide-top"><h1>${esc(d.title || t('blankTrip'))}</h1>
        <div class="v4-actions"><button type="button" data-undo>${esc(t('undo'))}</button><button type="button" data-redo>${esc(t('redo'))}</button>
        <button type="button" data-add-end>${esc(t('addDayEnd'))}</button><button type="button" data-export>${esc(t('exportJson'))}</button>
        <label class="v4-text-btn">${esc(t('importJson'))}<input id="v4-import" type="file" accept="application/json" hidden></label>
        <button type="button" data-print>${esc(t('printPdf'))}</button><button type="button" data-clear>${esc(t('clearTrip'))}</button></div></div>
      <p class="v4-note">${esc(t('keysHint'))} ${esc(t('saveState'))}</p>
      ${d.oneWay ? `<p class="v4-alert">${esc(t('oneWayNote'))}</p>` : ''}
      ${nzCredit(d)}
      <label>${esc(t('daysLabel'))} <input id="v4-days" type="number" min="1" max="30" value="${esc(d.requestedDays)}"></label>
      <div class="v4-seg" role="group">${['pick', 'edit', 'map', 'chosen'].map(v => `<button type="button" data-view="${v}" aria-pressed="${(v === 'edit' ? view === 'edit' : view === v) ? 'true' : 'false'}">${esc(t(v === 'pick' ? 'viewPick' : v === 'edit' ? 'viewEdit' : v === 'map' ? 'viewMap' : 'viewChosen'))}</button>`).join('')}</div>
      ${tightBlock()}
      <div class="v4-layout">
        <div>
          <section class="v4-pane-days"><h2>${esc(t('viewEdit'))}</h2><div id="v4-move"></div>${dayCards()}</section>
          <section class="v4-pane-pick"><h2>${esc(t('listHeading'))}</h2>
            <div class="v4-field"><span>${esc(t('islandLabel'))}</span><div class="v4-chips">${chip('gisland', 'all', t('islandAll'), d.island === 'all')}${chip('gisland', 'north', t('islandNorth'), d.island === 'north')}${chip('gisland', 'south', t('islandSouth'), d.island === 'south')}</div></div>
            <div class="v4-field"><span>${esc(t('regionLabel'))}</span><div class="v4-chips">${regionButtons()}</div>
              <button type="button" data-clear-regions>${esc(t('clearRegions'))}</button> <button type="button" data-clear-filters>${esc(t('clearAllFilters'))}</button></div>
            <p>${esc(t('placeCount', { n: count }))} · ${esc(t('chosenCount', { n: d.chosen.length }))}</p>
            <button type="button" data-hide-verify>${esc(d.hideVerify ? t('showVerify') : t('hideVerify'))}</button>
            <div id="v4-places">${placeList()}</div>
            <p><button type="button" class="v4-primary" data-view="edit">${esc(t('donePicking'))}</button></p>
          </section>
          <section class="v4-pane-chosen"><h2>${esc(t('viewChosen'))}</h2><ul>${d.chosen.map(id => `<li>${esc(nameOf(byId(id)) || id)}</li>`).join('')}</ul></section>
        </div>
        <aside class="v4-map-card v4-pane-map"><h2>${esc(t('viewMap'))}</h2><div id="v4-map"></div>
          <p class="v4-note">${esc(t('noKeyNote'))}</p>
          <p class="v4-note"><a href="https://www.openstreetmap.org/copyright">${esc(t('osmCredit'))}</a></p>
          <p class="v4-note"><a href="https://www.openstreetmap.org/copyright">${esc(t('osmCredit'))}</a> · ODbL</p>
        </aside>
      </div>`;
    const mapEl = host.querySelector('#v4-map');
    const stops = mapStops();
    const last = state.draft.days[state.draft.days.length - 1];
    if (window.PounamuMaps) window.PounamuMaps.mount(mapEl, {
      lang: state.lang,
      stops,
      candidates: mapCandidates(),
      startId: stops[0] && stops[0].id,
      endId: last && last.placeId,
      onToggle: (id, how) => { if (how === 'key') state.focusPlace = id; togglePlace(id); },
    });
    bindGuide(host);
    if (state.focusDay != null) {
      const card = host.querySelector(`.v4-day[data-index="${state.focusDay}"]`);
      if (card) card.focus();
      state.focusDay = null;
    }
    if (state.focusPlace) {
      const node = host.querySelector(`[data-place="${CSS.escape(state.focusPlace)}"]`);
      if (node) node.focus();
      state.focusPlace = '';
    }
  }
  function togglePlace(id) {
    pushUndo();
    const i = state.draft.chosen.indexOf(id);
    if (i >= 0) state.draft.chosen.splice(i, 1);
    else state.draft.chosen.push(id);
    if (i < 0 && !state.draft.days.some(d => d.placeId === id)) {
      const p = byId(id);
      state.draft.days.push({ uid: uid(), placeId: id, from: '', to: p ? p.name_en : id, via: '', parts: [], notes: '', ferry: false, source_url: p ? p.source_url : '', est_date: '', nameVerify: Boolean(p && p.verify), km: '', rawTime: '' });
    }
    persist();
    renderGuide();
  }
  function moveDay(from, to) {
    const days = state.draft.days;
    if (to < 0 || to >= days.length || from === to) return;
    pushUndo();
    const [item] = days.splice(from, 1);
    days.splice(to, 0, item);
    persist();
    toast(t('toastMoved'));
    state.focusDay = to;
    renderGuide();
  }
  function bindGuide(host) {
    host.onclick = event => {
      const view = event.target.closest('[data-view]');
      if (view && event.target.id !== 'v4-lang') { state.draft.view = view.dataset.view === 'edit' ? 'edit' : view.dataset.view; persist(); renderGuide(); return; }
      if (event.target.closest('[data-undo]')) { undo(); return; }
      if (event.target.closest('[data-redo]')) { redo(); return; }
      if (event.target.closest('#v4-lang')) { switchLang(); return; }
      if (event.target.closest('[data-print]')) { window.print(); return; }
      if (event.target.closest('[data-export]')) { exportJson(); return; }
      if (event.target.closest('[data-key-help]')) { const n = host.querySelector('#v4-key-help'); if (n) n.hidden = !n.hidden; return; }
      if (event.target.closest('[data-hide-verify]')) { state.draft.hideVerify = !state.draft.hideVerify; persist(); renderGuide(); return; }
      if (event.target.closest('[data-clear-regions]')) { pushUndo(); state.draft.regions = []; persist(); renderGuide(); return; }
      if (event.target.closest('[data-clear-filters]')) { pushUndo(); state.draft.regions = []; state.draft.island = 'all'; persist(); renderGuide(); return; }
      if (event.target.closest('[data-add-end]')) { pushUndo(); state.draft.days.push({ uid: uid(), placeId: '', from: '', to: '', via: '', parts: [], notes: '', ferry: false, source_url: '', est_date: '', nameVerify: false, km: '', rawTime: '' }); persist(); toast(t('toastAdded')); renderGuide(); return; }
      if (event.target.closest('[data-clear]')) { openClear(); return; }
      const island = event.target.closest('[data-gisland]');
      if (island) { pushUndo(); state.draft.island = island.dataset.gisland; state.draft.regions = []; persist(); renderGuide(); return; }
      const region = event.target.closest('[data-region]');
      if (region) {
        pushUndo();
        const id = region.dataset.region;
        const set = new Set(state.draft.regions || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        state.draft.regions = [...set];
        persist(); renderGuide(); return;
      }
      const up = event.target.closest('[data-up]');
      if (up) { moveDay(Number(up.dataset.up), Number(up.dataset.up) - 1); return; }
      const down = event.target.closest('[data-down]');
      if (down) { moveDay(Number(down.dataset.down), Number(down.dataset.down) + 1); return; }
      const moveto = event.target.closest('[data-moveto]');
      if (moveto) { openMove(Number(moveto.dataset.moveto)); return; }
      const addAfter = event.target.closest('[data-add-after]');
      if (addAfter) {
        pushUndo();
        const i = Number(addAfter.dataset.addAfter);
        state.draft.days.splice(i + 1, 0, { uid: uid(), placeId: '', from: '', to: '', via: '', parts: [], notes: '', ferry: false, source_url: '', est_date: '', nameVerify: false, km: '', rawTime: '' });
        persist(); toast(t('toastAdded')); renderGuide(); return;
      }
      const del = event.target.closest('[data-del]');
      if (del) {
        pushUndo();
        const i = Number(del.dataset.del);
        const [gone] = state.draft.days.splice(i, 1);
        const record = gone && unscheduledRecord(gone);
        if (record && !state.draft.days.some(day => day.placeId === record.placeId)) {
          state.draft.unscheduled = [...(state.draft.unscheduled || []), record];
        }
        persist(); toast(t('toastDeleted')); renderGuide(); return;
      }
      const dest = event.target.closest('[data-dest-day]');
      if (dest) { moveDay(state.moveFor, Number(dest.dataset.destDay)); return; }
      const tight = event.target.closest('[data-tight]');
      if (tight && tight.dataset.tight === 'add') {
        if (state.draft.templateId === 'p10-tight' && state.draft.p10Input && window.p10Plan) {
          const input = { ...state.draft.p10Input, days: state.draft.minimum };
          const present = window.p10Present(window.p10Plan(input));
          state.draft.requestedDays = input.days;
          state.draft.days = present.days.map(dayFromNode);
          state.draft.unscheduled = [];
          state.draft.minimum = input.days;
          state.draft.p10Input = input;
        } else state.draft.requestedDays = Number(state.draft.minimum) || state.draft.requestedDays;
        persist(); renderGuide(); return;
      }
      if (tight && tight.dataset.tight === 'drop') { state.draft.view = 'pick'; persist(); renderGuide(); return; }
    };
    host.onchange = event => {
      if (event.target.id === 'v4-days') {
        pushUndo();
        state.draft.requestedDays = Number(event.target.value) || state.draft.requestedDays;
        persist(); renderGuide(); return;
      }
      if (event.target.id === 'v4-import') { importJson(event.target.files && event.target.files[0]); return; }
      const box = event.target.closest('input[data-place]');
      if (box) togglePlace(box.dataset.place);
    };
    host.onkeydown = event => {
      const card = event.target.closest('.v4-day');
      if (!card) return;
      if (!event.altKey) return;
      const index = Number(card.dataset.index);
      if (event.key === 'ArrowUp') { event.preventDefault(); moveDay(index, index - 1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); moveDay(index, index + 1); }
    };
    let dragFrom = null;
    host.ondragstart = event => {
      const card = event.target.closest('.v4-day');
      if (!card) return;
      dragFrom = Number(card.dataset.index);
      event.dataTransfer.effectAllowed = 'move';
    };
    host.ondragover = event => { if (event.target.closest('.v4-day')) event.preventDefault(); };
    host.ondrop = event => {
      const card = event.target.closest('.v4-day');
      if (!card || dragFrom == null) return;
      event.preventDefault();
      moveDay(dragFrom, Number(card.dataset.index));
      dragFrom = null;
    };
  }
  function openMove(index) {
    state.moveFor = index;
    const box = document.querySelector('#v4-move');
    if (!box) return;
    box.className = 'v4-drawer';
    box.innerHTML = state.draft.days.map((_, i) => `<button type="button" data-dest-day="${i}">${esc(t('moveToDay', { n: i + 1 }))}</button>`).join(' ');
  }
  function openClear() {
    const modal = document.createElement('div');
    modal.className = 'v4-modal';
    modal.innerHTML = `<article role="dialog" aria-modal="true"><h2>${esc(t('clearTitle'))}</h2><p>${esc(t('clearBody'))}</p><div class="v4-actions"><button type="button" data-do-clear>${esc(t('clearTrip'))}</button><button type="button" data-cancel>${esc(t('keepEditing'))}</button></div></article>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
      if (event.target.closest('[data-cancel]')) modal.remove();
      if (event.target.closest('[data-do-clear]')) {
        state.draft = blankDraft();
        state.undo = []; state.redo = [];
        persist(); modal.remove(); renderGuide();
      }
    });
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(state.draft, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pounamu-itinerary.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.days)) return;
        pushUndo();
        state.draft = Object.assign(blankDraft(), data);
        persist(); renderGuide();
      } catch { /* ignore bad files */ }
    };
    reader.readAsText(file);
  }
  function switchLang() {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    const q = new URLSearchParams(location.search);
    q.set('lang', state.lang);
    history.replaceState(null, '', location.pathname + '?' + q.toString());
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
    if (state.draft && state.draft.templateId && state.draft.templateId !== 'p10-tight') {
      const item = (state.catalog.templates || []).find(item => item.id === state.draft.templateId);
      if (item) state.draft.title = state.lang === 'en' ? item.title_en : item.title_zh;
    }
    persist();
    boot();
  }

  function safeHttp(url) {
    return /^https?:\/\//i.test(url || '') ? url : '';
  }
  function sourceHtml(url, date) {
    if (!url) return date ? `<p>${esc(date)}</p>` : '';
    if (!safeHttp(url)) return `<p>${esc(t('sourceToVerify'))}</p>`;
    return `<p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t('sourceLink'))}</a>${date ? ' ' + esc(date) : ''}</p>`;
  }
  function townOverviewZh(town, kids) {
    const region = regionMeta(town.region_id);
    const regionName = region ? region.zh : '';
    const island = town.island === 'north' ? '北岛' : '南岛';
    const stay = town.suggested_stay ? `；建议停留约 ${town.suggested_stay} 天（编辑估算）` : '';
    return `${island}${regionName}一带的落脚城镇，本表收录周边 ${kids.length} 个地点${stay}。`;
  }
  function childrenOf(town) {
    return (state.catalog.places || []).filter(p => p.type !== 'town' && p.town === town.town && p.island === town.island);
  }
  async function renderDestination() {
    const host = document.querySelector('#v4-destination');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id');
    const town = byId(id);
    // destination.html?id=<merged id> moves to the place it was merged into (ni-mau -> ni-tga).
    if (town && id && town.place_id !== id) {
      const q = new URLSearchParams(location.search);
      q.set('id', town.place_id);
      history.replaceState(null, '', location.pathname + '?' + q.toString());
    }
    if (!town || town.type !== 'town') {
      host.innerHTML = `<h1>${esc(t('noResults', { q: id || '' }))}</h1>`;
      return;
    }
    if (!state.tracks) { try { state.tracks = await loadJson('data/doc-tracks.json'); } catch { state.tracks = { tracks: [] }; } }
    if (!state.sports) { try { state.sports = await loadJson('data/sports/index.json'); } catch { state.sports = { cities: [] }; } }
    const kids = childrenOf(town);
    const hide = new URLSearchParams(location.search).get('hideVerify') === '1';
    const visible = hide ? kids.filter(k => !k.verify) : kids;
    const sights = visible.filter(k => k.type === 'attraction' || k.type === 'seasonal');
    const acts = visible.filter(k => k.type === 'activity' || k.type === 'walk' || k.type === 'track' || k.type === 'boat');
    const boats = visible.filter(k => k.type === 'boat');
    const summary = state.lang === 'en' ? (town.summary_en || '') : townOverviewZh(town, kids);
    const summaryUrl = safeHttp(town.summary_source_url);
    const summaryDate = town.summary_accessed || '';
    const reg = regionMeta(town.region_id);
    const regionLabel = town.region_id && reg ? (state.lang === 'en' ? reg.en : reg.zh) : (state.lang === 'en' ? town.atlas_region : '');
    const townLabel = nameOf(town);
    const crumbRegion = regionLabel && regionLabel !== townLabel ? ` / ${esc(regionLabel)}` : '';
    const nearTracks = (state.tracks.tracks || []).filter(tr => window.v4TrackMatches(tr, state.lang === 'en' ? town.name_en : town.name_zh)).slice(0, 8);
    const sport = (state.sports.cities || []).find(c => fold(c.name) === fold(town.name_en) || fold(c.zh) === fold(town.name_zh));
    const fact = (label, value) => value ? `<p><strong>${esc(label)}</strong> ${value}</p>` : '';
    const row = k => {
      const sum = state.lang === 'en' ? k.summary_en : k.summary_zh;
      const verify = k.verify ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : '';
      const date = k.summary_accessed ? `${esc(t('checked'))}: ${esc(k.summary_accessed)}` : '';
      return `<article class="v4-place"><h3>${esc(nameOf(k))}${verify}</h3>${sum ? `<p>${esc(sum)}</p>` : `<p class="v4-note">${esc(t('summaryEmpty'))}</p>`}${sourceHtml(k.source_url, k.summary_accessed)}</article>`;
    };
    host.innerHTML = `<p class="v4-note"><a href="index.html?lang=${state.lang}">${esc(t('homeCrumb'))}</a> / ${esc(town.island === 'north' ? t('islandNorth') : t('islandSouth'))}${crumbRegion} / ${esc(townLabel)}</p>
      <div class="v4-guide-top"><h1>${esc(townLabel)} <span class="v4-en-name">${esc(state.lang === 'en' ? town.name_zh : town.name_en)}</span></h1></div>
      <div class="v4-photo-ph">${esc(t('photoPlaceholder'))}</div>
      <p>${esc(town.island === 'north' ? t('islandNorth') : t('islandSouth'))} · ${esc(regionLabel)}${town.region_uncertain ? ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>` : ''}</p>
      ${town.suggested_stay ? `<p>${esc(t('suggestedStay', { n: town.suggested_stay }))}</p>` : ''}
      <div class="v4-actions"><a href="guide.html?add=${esc(town.place_id)}&amp;lang=${state.lang}">${esc(t('addToTrip'))}</a><a class="v4-alt" href="guide.html?view=pick&amp;lang=${state.lang}#v4-map">${esc(t('onMap'))}</a>
        <a class="v4-alt" href="destination.html?id=${esc(town.place_id)}&amp;lang=${state.lang}&amp;hideVerify=${hide ? '0' : '1'}">${esc(hide ? t('showVerify') : t('hideVerify'))}</a></div>
      <nav class="v4-dest-nav"><a href="#overview">${esc(t('overview'))}</a><a href="#sights">${esc(t('sights'))}</a><a href="#activities">${esc(t('activities'))}</a><a href="#doc">${esc(t('docTracks'))}</a><a href="#sports">${esc(t('paddleSports'))}</a><a href="#links">${esc(t('officialLinks'))}</a></nav>
      <section class="v4-block" id="overview"><h2>${esc(t('overview'))}</h2>${summary ? `<p>${esc(summary)}</p>` : `<p>${esc(t('summaryEmpty'))}</p>`}${summaryUrl ? `<p><a href="${esc(summaryUrl)}" target="_blank" rel="noopener noreferrer">${esc(t('sourceLink'))}</a>${summaryDate ? ' · ' + esc(t('accessed')) + ' ' + esc(summaryDate) : ''}</p>` : ''}</section>
      <section class="v4-block" id="sights"><h2>${esc(t('sights'))}</h2>${sights.length ? sights.map(row).join('') : `<p>${esc(kids.length ? t('emptySights') : t('noListings'))}</p>`}</section>
      <section class="v4-block" id="activities"><h2>${esc(t('activities'))}</h2>${acts.length ? acts.map(row).join('') : `<p>${esc(t('noListings'))}</p>`}</section>
      <section class="v4-block" id="doc"><h2>${esc(t('docTracks'))}</h2><p>${esc(t('docLive'))}</p>${nearTracks.map(tr => `<article class="v4-place"><h3>${esc(tr.name)}${tr.zh ? '' : ` <span class="v4-badge">${esc(t('verifyBadge'))}</span>`}</h3><p><a href="${esc(tr.url)}" target="_blank" rel="noopener noreferrer">DOC</a></p></article>`).join('') || `<p><a href="tracks.html?q=${encodeURIComponent(town.name_en)}&amp;lang=${state.lang}">${esc(t('openTracks'))}</a></p>`}</section>
      <section class="v4-block" id="sports"><h2>${esc(t('paddleSports'))}</h2>
        <h3>${esc(t('paddleBlock'))}</h3>${boats.map(row).join('') || `<p><a href="route.html?id=whanganui-journey&amp;lang=${state.lang}">${esc(t('openPaddle'))}</a></p>`}
        <h3>${esc(t('sportsBlock'))}</h3>${sport ? `<p><a href="city.html?id=${esc(sport.id)}&amp;lang=${state.lang}">${esc(t('openSports'))}</a></p>` : `<p><a href="cities.html?lang=${state.lang}">${esc(t('openSports'))}</a></p>`}
        <h3>${esc(t('routeBlock'))}</h3><p><a href="routes.html?island=${town.island}&amp;lang=${state.lang}">${esc(t('readGuide'))}</a></p>
      </section>
      <section class="v4-block" id="links"><h2>${esc(t('officialLinks'))}</h2>${[town, ...visible].filter(k => k.source_url).slice(0, 12).map(k => safeHttp(k.source_url) ? `<p><a href="${esc(k.source_url)}" target="_blank" rel="noopener noreferrer">${esc(nameOf(k))}</a>${k.summary_accessed ? ' · ' + esc(k.summary_accessed) : ''}</p>` : `<p>${esc(nameOf(k))} · ${esc(t('sourceToVerify'))}</p>`).join('')}</section>
      ${town.lat != null && town.lon != null ? `<section class="v4-block" id="place-map"><h2>${esc(t('viewMap'))}</h2><div id="v4-dest-map"></div><p class="v4-note">${esc(t('noKeyNote'))}</p><p class="v4-note"><a href="https://www.openstreetmap.org/copyright">${esc(t('osmCredit'))}</a> · ODbL</p></section>` : ''}`;
    document.title = nameOf(town) + ' — 绿石之地 · Pounamu Atlas';
    const mapEl = host.querySelector('#v4-dest-map');
    if (mapEl && window.PounamuMaps) {
      window.PounamuMaps.mount(mapEl, {
        lang: state.lang,
        stops: [{ id: town.place_id, lat: town.lat, lon: town.lon, name_zh: town.name_zh, name_en: town.name_en, selected: true }],
        candidates: [],
      });
    }
  }
  function applyAction(action) {
    if (!action) return;
    if (action.kind === 'template') {
      state.draft = draftFromTemplate(action.id);
      state.draft.edited = false;
      if (action.view) state.draft.view = action.view;
      return;
    }
    if (action.kind === 'tight') {
      state.draft = draftFromTight();
      state.draft.edited = false;
      return;
    }
    state.draft = blankDraft();
    if (action.view) state.draft.view = action.view;
  }
  function openReplace(action) {
    const name = action.kind === 'template'
      ? ((state.catalog.templates || []).find(row => row.id === action.id) || {})[state.lang === 'en' ? 'title_en' : 'title_zh'] || action.id
      : action.kind === 'tight' ? t('tightSample') : t('blankTrip');
    const modal = document.createElement('div');
    modal.className = 'v4-modal';
    modal.innerHTML = `<article role="dialog" aria-modal="true"><h2>${esc(t('replaceTitle'))}</h2><p>${esc(t('replaceBody', { name }))}</p><div class="v4-actions"><button type="button" data-do-replace>${esc(t('replaceYes'))}</button><button type="button" data-keep>${esc(t('replaceNo'))}</button></div></article>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-keep]').focus();
    modal.addEventListener('click', event => {
      if (event.target.closest('[data-keep]')) { modal.remove(); return; }
      if (!event.target.closest('[data-do-replace]')) return;
      pushUndo();
      applyAction(action);
      persist();
      modal.remove();
      renderGuide();
      toast(t('replacedTrip'));
    });
  }

  window.v4TrackMatches = function (track, query) {
    const api = globalThis.v4Match;
    if (!api) return false;
    return api.searchTracks([track], query, towns()).length > 0;
  };

  async function boot() {
    state.lang = pageLang();
    try { await ensureData(); } catch (err) { console.warn('v4 data', err && err.message); return; }
    mountNav();
    const headerLang = document.getElementById('v4-lang-header');
    if (headerLang && !headerLang.dataset.bound) {
      headerLang.dataset.bound = '1';
      headerLang.addEventListener('click', () => switchLang());
    }
    if (headerLang) headerLang.textContent = t('switchLang');
    if (document.querySelector('#v4-search')) renderSearch();
    if (document.querySelector('#v4-app')) {
      if (!state.draft) applyEntry();
      persist();
      await renderGuide();
      if (state.draft && state.draft.pendingToast) {
        toast(state.draft.pendingToast === 'alreadyIn' ? t('alreadyInTrip') : t('toastAdded'));
        delete state.draft.pendingToast;
        persist();
      }
      if (state.pendingAction) {
        const action = state.pendingAction;
        state.pendingAction = null;
        openReplace(action);
      }
    }
    if (document.querySelector('#v4-destination')) await renderDestination();
    if (document.body.dataset.page === 'tracks') {
      try { state.tracks = state.tracks || await loadJson('data/doc-tracks.json'); } catch { /* tracks page loads its own copy */ }
      if (typeof window.v3RenderTracks === 'function') window.v3RenderTracks();
    }
    const toastUndo = document.querySelector('#v4-toast');
    if (toastUndo) toastUndo.onclick = event => { if (event.target.closest('[data-v4-undo]')) undo(); };
  }
  window.v4AfterRender = function () {
    state.lang = pageLang();
    mountNav();
    if (state.catalog && document.querySelector('#v4-search')) renderSearch();
    if (state.catalog && document.querySelector('#v4-app') && state.draft) renderGuide();
    if (state.catalog && document.querySelector('#v4-destination')) renderDestination();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
