/* Pounamu Atlas v7 behaviour layer (2026-11-15)
   - ground: stone + survey grid + drifting light planes (depth parallax)
   - push-pull (dolly) and rack-focus on photos while scrolling, hero focus pull
   - routes page: 3D route deck you page through, cards turn over
   - route / template pages: real Google Maps (keyless embed) replaces the sketch maps
   - notebook: add any route or itinerary card, give it a date and time, write notes, pin photos
   - every source / "to verify" mark leaves the reading text; sources.html holds all of it
   - budget system hidden for now; 城市运动 hidden by site-flags.js
   Loaded last (defer) on every page. Everything is local to this browser. */
(function () {
  'use strict';
  const d = document, html = d.documentElement, body = d.body;
  const page = body.dataset.page || '';
  const qs = new URLSearchParams(location.search);
  // guide.html strips ?template= from the address bar once it has opened the trip, so fall back to the
  // template the guide saved as its current draft.
  const guideTemplate = () => {
    if (qs.get('template')) return qs.get('template');
    try { const dr = JSON.parse(localStorage.getItem('pounamu-v4-draft') || 'null'); return (dr && /^[A-Z]{2}-\d/.test(dr.templateId || '') && dr.templateId) || ''; } catch (e) { return ''; }
  };
  const zh = () => !/^en/i.test(html.lang || 'zh');
  const L = (z, e) => (zh() ? z : e);
  const pick = v => (Array.isArray(v) ? (zh() ? (v[1] || v[0]) : v[0]) : (v || ''));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const langQ = () => (zh() ? 'zh' : 'en');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOn = () => !reduce.matches && !html.classList.contains('motion-off') && !body.classList.contains('motion-off');
  const G = name => { try { return Function('return typeof ' + name + '!=="undefined"?' + name + ':undefined')(); } catch (e) { return undefined; } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad2 = n => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>'
  };
  const MODE = { walk: ['Walk', '徒步'], cycle: ['Cycle', '骑行'], drive: ['Drive', '自驾'], transit: ['Public transport', '公共交通'], paddle: ['Paddle', '划船'] };
  const ISLAND = { north: ['North Island', '北岛'], south: ['South Island', '南岛'] };

  /* ------------------------------------------------------------------ store */
  const NB_KEY = 'pounamu-notebook-v1';
  const nb = {
    blank() { return { v: 1, title: '', start: '', items: [], notes: [] }; },
    read() {
      try {
        const s = JSON.parse(localStorage.getItem(NB_KEY) || 'null');
        if (s && Array.isArray(s.items)) return Object.assign(this.blank(), s, { notes: Array.isArray(s.notes) ? s.notes : [] });
      } catch (e) { /* fall through */ }
      return this.blank();
    },
    write(s) {
      try { localStorage.setItem(NB_KEY, JSON.stringify(s)); }
      catch (e) { toast(L('这台设备的浏览器存储满了，换张小一点的图试试。', 'Browser storage is full on this device. Try a smaller photo.')); }
      window.dispatchEvent(new CustomEvent('v7:nb'));
    },
    find(type, ref) { return this.read().items.find(i => i.type === type && i.ref === ref); }
  };
  window.addEventListener('storage', e => { if (e.key === NB_KEY) window.dispatchEvent(new CustomEvent('v7:nb')); });

  const idb = (() => {
    let opening = null;
    const open = () => opening || (opening = new Promise((res, rej) => {
      const r = indexedDB.open('pounamu-notebook', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
      const tx = db.transaction('img', mode);
      const req = fn(tx.objectStore('img'));
      tx.oncomplete = () => res(req && 'result' in req ? req.result : undefined);
      tx.onerror = () => rej(tx.error);
    }));
    return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)) };
  })();
  async function shrink(file, max) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, (max || 1600) / Math.max(bmp.width, bmp.height));
      const c = d.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.84));
    } catch (e) { return file; }
  }

  /* --------------------------------------------------------- route data */
  function routeById(id) { const R = G('routes'); return R ? R.find(r => r.id === id) : null; }
  function routeStops(id) {
    const md = (G('routeMapData') || {})[id];
    const out = [];
    const push = s => { const last = out[out.length - 1]; if (last && Math.abs(last.lat - s.lat) < 1e-4 && Math.abs(last.lng - s.lng) < 1e-4) return; if (out.some(o => o.id && o.id === s.id)) return; out.push(s); };
    if (md && Array.isArray(md.points)) md.points.forEach(p => { if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) push({ id: p.id, lat: p.lat, lng: p.lon, name: p.name, role: p.role }); });
    if (!out.length) {
      const at = (G('routeAtlasStarts') || {})[id];
      if (at && Array.isArray(at.line) && at.line.length) {
        const l = at.line;
        push({ id: 'a', lat: l[0][1], lng: l[0][0], name: ['Start', '起点'], role: 'start' });
        if (l.length > 2) { const m = l[Math.floor(l.length / 2)]; push({ id: 'm', lat: m[1], lng: m[0], name: ['Midway', '中段'], role: 'stage' }); }
        const e = l[l.length - 1]; push({ id: 'b', lat: e[1], lng: e[0], name: ['End', '终点'], role: 'finish' });
      }
    }
    return out;
  }
  function routeEntry(id) {
    const r = routeById(id); if (!r) return null;
    const ph = (G('routePhotos') || {})[id];
    return {
      type: 'route', ref: id,
      t: { en: r.name, zh: r.zh || r.name },
      place: { en: (r.region && r.region[0]) || '', zh: (r.region && (r.region[1] || r.region[0])) || '' },
      mode: r.mode, island: r.island,
      img: ph && ph.src ? ph.src : '',
      facts: { en: [r.time, r.distance].map(v => (v && v[0]) || '').filter(Boolean), zh: [r.time, r.distance].map(v => (v && (v[1] || v[0])) || '').filter(Boolean) },
      stops: routeStops(id).slice(0, 10).map(s => ({ lat: s.lat, lng: s.lng, name: s.name }))
    };
  }
  let catalogP = null;
  const catalog = () => catalogP || (catalogP = fetch('data/v4-catalog.json').then(r => r.json()).catch(() => null));
  async function templateStops(t) {
    const c = await catalog(); if (!c || !t) return [];
    const byId = new Map(c.places.map(p => [p.place_id, p]));
    const out = [];
    const add = p => { if (!p || !Number.isFinite(p.lat)) return; const last = out[out.length - 1]; if (last && last.id === p.place_id) return; out.push({ id: p.place_id, lat: p.lat, lng: p.lon, name: [p.name_en, p.name_zh || p.name_en] }); };
    const first = (t.days || [])[0];
    if (first) {
      const from = String(first.from || '').split(/[（(]/)[0].trim().toLowerCase();
      add(c.places.find(p => String(p.name_en || '').toLowerCase() === from || String(p.town || '').toLowerCase() === from));
    }
    (t.days || []).forEach(day => add(byId.get(day.place_id)));
    return out;
  }
  async function templateEntry(id) {
    const c = await catalog(); const t = c && c.templates.find(x => x.id === id); if (!t) return null;
    const stops = await templateStops(t);
    const m = MODE[t.activity] || MODE.drive;
    return {
      type: 'template', ref: id,
      t: { en: t.title_en, zh: t.title_zh },
      place: { en: t.day_count + ' days · ' + m[0], zh: t.day_count + ' 天 · ' + m[1] },
      mode: t.activity || 'drive', island: /^NI/.test(id) ? 'north' : 'south', days: t.day_count,
      img: '', facts: { en: [t.day_count + ' days'], zh: [t.day_count + ' 天'] },
      stops: stops.slice(0, 12).map(s => ({ lat: s.lat, lng: s.lng, name: s.name }))
    };
  }
  const entryHref = it => it.type === 'template' ? `guide.html?template=${encodeURIComponent(it.ref)}&lang=${langQ()}` : `route.html?id=${encodeURIComponent(it.ref)}&lang=${langQ()}`;

  /* ------------------------------------------------------- google maps */
  const ll = p => (+p.lat).toFixed(5) + ',' + (+p.lng).toFixed(5);
  function sample(list, n) {
    if (list.length <= n) return list.slice();
    const out = [];
    for (let i = 0; i < n; i++) out.push(list[Math.round(i * (list.length - 1) / (n - 1))]);
    return out;
  }
  function bounds(stops) {
    const lats = stops.map(s => +s.lat), lngs = stops.map(s => +s.lng);
    const n = Math.max(...lats), s = Math.min(...lats), e = Math.max(...lngs), w = Math.min(...lngs);
    const k = Math.cos(((n + s) / 2) * Math.PI / 180);
    const span = Math.max(n - s, (e - w) * k, 0.004);
    return { c: { lat: (n + s) / 2, lng: (e + w) / 2 }, z: clamp(Math.floor(Math.log2(700 / span)), 5, 15) };
  }
  function gmapSrc(o) {
    const hl = zh() ? 'zh-CN' : 'en';
    const t = o.type || 'm';
    const stops = o.stops || [];
    if (o.view === 'route' && stops.length >= 2) {
      const loop = stops[0].role === 'start-finish' && stops.length > 2 ? stops.concat([stops[0]]) : stops;
      const pts = sample(loop, 10);
      return `https://maps.google.com/maps?saddr=${ll(pts[0])}&daddr=${pts.slice(1).map(ll).join('+to:')}&dirflg=${o.flag || 'd'}&t=${t}&hl=${hl}&output=embed`;
    }
    if (typeof o.view === 'number' && stops[o.view]) return `https://maps.google.com/maps?q=${ll(stops[o.view])}&z=${o.zoom || 14}&t=${t}&hl=${hl}&output=embed`;
    if (stops.length) { const b = bounds(stops); return `https://maps.google.com/maps?ll=${ll(b.c)}&z=${b.z}&t=${t}&hl=${hl}&output=embed`; }
    return `https://maps.google.com/maps?q=${encodeURIComponent(o.query || 'New Zealand')}&z=${o.zoom || 9}&t=${t}&hl=${hl}&output=embed`;
  }
  function gmapOpenUrl(stops, mode, i) {
    const api = window.pounamuMapsUrl;
    if (typeof i === 'number' && stops[i]) return 'https://www.google.com/maps/search/?api=1&query=' + ll(stops[i]);
    if (api && stops.length >= 2) return api.routeSegments(stops.map(s => ({ lat: s.lat, lng: s.lng })), mode === 'walk' || mode === 'paddle' ? 'walking' : mode === 'transit' ? 'transit' : 'driving')[0];
    if (stops.length) return 'https://www.google.com/maps/search/?api=1&query=' + ll(stops[0]);
    return 'https://www.google.com/maps';
  }
  const fmtCoord = p => p ? `${p.lat < 0 ? 'S' : 'N'} ${Math.abs(p.lat).toFixed(3)}° · ${p.lng < 0 ? 'W' : 'E'} ${Math.abs(p.lng).toFixed(3)}°` : '';

  /* One map module: stop list + view switch + map type + Google iframe. */
  function mountGmap(host, o) {
    const stops = o.stops || [];
    const routeable = stops.length >= 2 && ['drive', 'cycle', 'transit'].includes(o.mode);
    const state = { view: routeable && o.mode === 'drive' ? 'route' : 'all', type: o.mode === 'walk' ? 'p' : 'm' };
    const roleName = { start: ['Start', '起点'], 'start-finish': ['Start & finish', '起终点'], finish: ['Finish', '终点'], overnight: ['Overnight', '过夜'], stop: ['Stop', '停留'], stage: ['Stage', '途经'], access: ['Access', '接驳'], turnaround: ['Turnaround', '折返点'] };
    host.innerHTML = `<div class="v7-gmap">
      <aside class="v7-gmap-side">
        <span class="v7-live"><i></i>GOOGLE MAPS · LIVE</span>
        <h3>${esc(o.title || L('线路地图', 'Route map'))}</h3>
        <div class="v7-seg" role="group" aria-label="${L('视图', 'View')}">
          ${routeable ? `<button type="button" data-v="route">${o.mode === 'drive' ? L('驾车路线', 'Driving route') : L('沿公路参考', 'Road reference')}</button>` : ''}
          <button type="button" data-v="all">${L('全景', 'Overview')}</button>
        </div>
        <div class="v7-seg" role="group" aria-label="${L('地图类型', 'Map type')}">
          <button type="button" data-t="m">${L('地图', 'Map')}</button><button type="button" data-t="p">${L('地形', 'Terrain')}</button><button type="button" data-t="k">${L('卫星', 'Satellite')}</button>
        </div>
        ${stops.length ? `<ol class="v7-stops">${stops.map((s, i) => `<li><button type="button" data-i="${i}"><b>${pad2(i + 1)}</b><span>${esc(pick(s.name) || L('地点', 'Place') + ' ' + (i + 1))}${s.role && roleName[s.role] ? `<small>${esc(pick(roleName[s.role]))}</small>` : ''}</span></button></li>`).join('')}</ol>` : `<p class="v7-mono" style="color:var(--v7-dmuted)">${L('暂无坐标，按名称搜索', 'No coordinates yet, searched by name')}</p>`}
        <div class="v7-gmap-foot">
          <a class="v7-btn glow" data-open href="#" target="_blank" rel="noopener" data-keep-link="1">${L('在 Google Maps 打开', 'Open in Google Maps')} ${ICON.ext}</a>
        </div>
      </aside>
      <div class="v7-gmap-frame v7-gmap-corners"><div class="v7-gmap-loading">LOADING MAP…</div><iframe title="${esc(L('谷歌地图', 'Google Maps'))}" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><div class="v7-gmap-hud"></div></div>
    </div>`;
    const frame = host.querySelector('iframe'), hud = host.querySelector('.v7-gmap-hud'), open = host.querySelector('[data-open]');
    frame.addEventListener('load', () => { if (frame.src) frame.classList.add('on'); });
    function paint(load) {
      host.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.view)));
      host.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === state.type)));
      host.querySelectorAll('[data-i]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === state.view)));
      const pt = typeof state.view === 'number' ? stops[state.view] : stops.length ? bounds(stops).c : null;
      hud.innerHTML = `${state.view === 'route' ? L('路线', 'ROUTE') : typeof state.view === 'number' ? pad2(state.view + 1) + ' · ' + esc(pick(stops[state.view].name) || '') : L('全景', 'OVERVIEW')}<br>${fmtCoord(pt)}`;
      open.href = gmapOpenUrl(stops, o.mode, typeof state.view === 'number' ? state.view : undefined);
      if (!stops.length) open.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.query || 'New Zealand');
      if (load !== false) {
        const src = gmapSrc({ stops, view: state.view, type: state.type, query: o.query });
        if (frame.dataset.src !== src) { frame.classList.remove('on'); frame.dataset.src = src; if (frame.dataset.armed) frame.src = src; }
      }
    }
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-v],[data-t],[data-i]'); if (!b) return;
      if (b.dataset.v) state.view = b.dataset.v;
      else if (b.dataset.t) state.type = b.dataset.t;
      else state.view = +b.dataset.i;
      paint();
    });
    paint();
    const arm = () => { if (frame.dataset.armed) return; frame.dataset.armed = '1'; frame.src = frame.dataset.src; window.removeEventListener('scroll', near); };
    const near = () => { const r = host.getBoundingClientRect(); if (r.top < innerHeight * 2 && r.bottom > -innerHeight) arm(); };
    near();
    if (!frame.dataset.armed) {
      window.addEventListener('scroll', near, { passive: true });
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); arm(); } }, { rootMargin: '300px' });
        io.observe(host);
      }
    }
  }

  /* ------------------------------------------------------- ui helpers */
  let toastTimer = 0;
  function toast(msg, link) {
    let t = d.querySelector('.v7-toast');
    if (!t) { t = d.createElement('div'); t.className = 'v7-toast'; t.setAttribute('role', 'status'); body.append(t); }
    t.innerHTML = esc(msg) + (link ? ` <a href="${esc(link.href)}" ${link.undo ? 'data-v7-undo' : ''}>${esc(link.label)}</a>` : '');
    t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3400);
  }
  function addBtn(type, ref, cls) {
    const on = !!nb.find(type, ref);
    return `<button type="button" class="v7-add ${cls || ''}" data-v7-add="${esc(type)}:${esc(ref)}" aria-pressed="${on}"><span class="v7-plus" aria-hidden="true"></span><span class="v7-add-l">${on ? L('已在笔记本', 'In notebook') : L('加入笔记本', 'Add to notebook')}</span></button>`;
  }
  function syncAddButtons() {
    const items = nb.read().items;
    d.querySelectorAll('[data-v7-add]').forEach(b => {
      const [type, ref] = b.dataset.v7Add.split(':');
      const on = items.some(i => i.type === type && i.ref === ref);
      b.setAttribute('aria-pressed', String(on));
      const l = b.querySelector('.v7-add-l'); if (l) l.textContent = on ? L('已在笔记本', 'In notebook') : L('加入笔记本', 'Add to notebook');
    });
    const n = items.length;
    d.querySelectorAll('.v7-nav-count').forEach(c => { c.textContent = n ? String(n) : ''; });
    const dock = ensureDock();
    if (dock) { dock.hidden = !n || page === 'notebook'; const b = dock.querySelector('b'); if (b) b.textContent = pad2(n); }
  }
  function ensureDock() {
    if (page === 'notebook') return null;
    let dock = d.querySelector('.v7-dock');
    if (!dock) {
      dock = d.createElement('a'); dock.className = 'v7-dock'; dock.hidden = true;
      body.append(dock);
    }
    dock.href = 'notebook.html?lang=' + langQ();
    if (!dock.dataset.lang || dock.dataset.lang !== langQ()) {
      dock.dataset.lang = langQ();
      dock.innerHTML = `<span class="v7-dock-ico">${ICON.book}</span><span class="v7-dock-label">${L('我的笔记本', 'My notebook')}</span><b>00</b>`;
      dock.setAttribute('aria-label', L('打开我的笔记本', 'Open my notebook'));
    }
    return dock;
  }
  function bump() {
    d.querySelectorAll('.v7-dock, .v7-nav-count').forEach(el => { el.classList.remove('v7-bump'); void el.offsetWidth; el.classList.add('v7-bump'); setTimeout(() => el.classList.remove('v7-bump'), 700); });
  }
  function fly(from) {
    const holder = from.closest('.route-card, .v7-card, .v4-card, .journey-hero, article, section');
    const img = holder && holder.querySelector('img');
    const dock = d.querySelector('.v7-dock:not([hidden])') || d.querySelector('.v7-nav-count');
    if (!img || !dock || !motionOn()) { bump(); return; }
    const r = img.getBoundingClientRect(); const t = dock.getBoundingClientRect();
    if (!r.width || !t.width) { bump(); return; }
    const w = Math.min(r.width, 260), h = w * (r.height / r.width);
    const c = d.createElement('img'); c.src = img.currentSrc || img.src; c.className = 'v7-fly'; c.alt = '';
    Object.assign(c.style, { left: (r.left + (r.width - w) / 2) + 'px', top: (r.top + (r.height - h) / 2) + 'px', width: w + 'px', height: h + 'px' });
    body.append(c);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
      c.style.transform = `translate(${dx}px, ${dy}px) scale(${36 / w})`; c.style.opacity = '.25'; c.style.borderRadius = '50%';
    }));
    const done = () => { c.remove(); bump(); };
    c.addEventListener('transitionend', done, { once: true });
    setTimeout(() => { if (c.isConnected) done(); }, 1100);
  }
  let lastRemoved = null;
  d.addEventListener('click', async e => {
    const undo = e.target.closest('[data-v7-undo]');
    if (undo) {
      e.preventDefault();
      if (lastRemoved) { const s = nb.read(); s.items.push(lastRemoved); nb.write(s); lastRemoved = null; toast(L('已恢复', 'Restored')); }
      return;
    }
    const b = e.target.closest('[data-v7-add]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const [type, ref] = b.dataset.v7Add.split(':');
    const s = nb.read();
    const at = s.items.findIndex(i => i.type === type && i.ref === ref);
    if (at >= 0) {
      lastRemoved = s.items.splice(at, 1)[0]; nb.write(s);
      toast(L('已从笔记本移除', 'Removed from notebook'), { href: '#', label: L('撤销', 'Undo'), undo: true });
      return;
    }
    b.disabled = true;
    const entry = type === 'template' ? await templateEntry(ref) : routeEntry(ref);
    b.disabled = false;
    if (!entry) { toast(L('暂时加不进去，刷新后再试', 'Could not add this one. Reload and try again.')); return; }
    const fresh = nb.read();
    fresh.items.push(Object.assign(entry, { uid: uid(), date: '', time: '', end: '', order: Date.now(), addedAt: Date.now() }));
    nb.write(fresh);
    syncAddButtons();
    fly(b);
    toast(L('已加入笔记本', 'Added to your notebook'), { href: 'notebook.html?lang=' + langQ(), label: L('去排时间 →', 'Plan it →') });
  }, true);
  window.addEventListener('v7:nb', () => syncAddButtons());

  /* -------------------------------------------- header, footer, ground */
  function ensureNav() {
    const nav = d.querySelector('.header .nav'); if (!nav) return;
    let a = nav.querySelector('a.v7-nav-nb');
    if (!a) { a = d.createElement('a'); a.className = 'v7-nav-nb'; nav.append(a); }
    a.href = 'notebook.html?lang=' + langQ();
    a.innerHTML = `${L('笔记本', 'Notebook')}<span class="v7-nav-count"></span>`;
    if (page === 'notebook') { nav.querySelectorAll('[aria-current]').forEach(x => x.removeAttribute('aria-current')); a.setAttribute('aria-current', 'page'); }
    if (page === 'sources') nav.querySelectorAll('[aria-current]').forEach(x => x.removeAttribute('aria-current'));
    const h = d.querySelector('.header'); if (h) html.style.setProperty('--v7-header-h', h.offsetHeight + 'px');
  }
  function ensureFooter() {
    d.querySelectorAll('.footer').forEach(f => {
      let box = f.querySelector('.v7-foot');
      if (!box) { box = d.createElement('div'); box.className = 'v7-foot'; f.append(box); f.style.flexWrap = 'wrap'; }
      box.innerHTML = `<a class="v7-foot-src" href="sources.html?lang=${langQ()}"><span class="v7-ico">${ICON.doc}</span><span><strong>${L('资料来源', 'Sources')}</strong><small>${L('官方来源 · 待核实清单 · 图片署名 · 许可', 'Official sources · to verify · photo credits · licences')}</small></span></a><span class="v7-foot-meta">POUNAMU ATLAS · S 34°–47° · E 166°–179°</span>`;
    });
  }
  function ground() {
    if (d.querySelector('.v7-ground')) return;
    const g = d.createElement('div'); g.className = 'v7-ground'; g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<i class="v7-orb a"></i><i class="v7-orb b"></i><i class="v7-orb c"></i>';
    body.prepend(g);
  }

  /* ------------------------------------- remove 待核实 + inline sources */
  const VERIFY_RE = /待核实|待核|尚未核实|暂无已核实|未核实|To verify|to be confirmed|not yet checked|No checked (value|information)|unverified/i;
  const SOURCE_RE = /^\s*(资料来源|参考来源|参考|来源|摄影|照片来源|Sources?|References?|Photo(graph)? by|Reference)\s*[:：]|访问日期|查阅日期|查阅\s*20\d\d|read 20\d\d-|官方页面\s*·\s*20|Official page\s*·\s*20|原页\s*·|accessed 20\d\d|retrieved 20\d\d|^\s*(已核|Checked)\s+20\d\d-|^[\s·]*(20\d\d-\d\d-\d\d[\s·]*)+$|^\s*(来源|Sources?)\s*$/i;
  // pointers to the paused stays-and-budget block
  const STAYS_RE = /每个目的地页都有「住宿与预算」|Every destination page has a Stays and budget section/;
  const PREFIX_RE = /^\s*(推荐理由（编辑推荐）：|推荐理由：|Why go \(editorial\):\s*)/;
  function dropRow(el) {
    if (!el.isConnected) return;
    const dd = el.closest('dd');
    if (dd && dd.textContent.trim() === el.textContent.trim()) {
      const dt = dd.previousElementSibling;
      const wrap = dd.parentElement;
      if (wrap && wrap.tagName === 'DIV' && wrap.children.length <= 2) { wrap.remove(); return; }
      if (dt && dt.tagName === 'DT') dt.remove();
      dd.remove(); return;
    }
    const td = el.closest('td');
    if (td && td.textContent.trim() === el.textContent.trim()) { const tr = td.closest('tr'); if (tr) { tr.remove(); return; } }
    if (el.classList.contains('v3-missing')) {
      const fact = el.closest('.journey-facts > div'); if (fact) { fact.remove(); return; }
    }
    el.remove();
  }
  function sweep() {
    const main = d.querySelector('main'); if (!main) return;
    const skip = el => el.closest('.v7-keep, .v7-sources-page, .v7-gmap, .v7-nb, .v7-deck, script, style, .header, form, label, select, option, input, textarea');
    main.querySelectorAll('.v3-missing').forEach(el => { if (!skip(el)) dropRow(el); });
    const list = [...main.querySelectorAll('p, li, span, small, dd, td, em, abbr, q, figcaption, strong, b, div')];
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i];
      if (!el.isConnected || skip(el)) continue;
      if (el.tagName === 'DIV' ? el.children.length : el.children.length > 3) continue;
      const tx = el.textContent.trim();
      if (!tx || tx.length > 280) continue;
      if (VERIFY_RE.test(tx) || SOURCE_RE.test(tx) || STAYS_RE.test(tx)) dropRow(el);
    }
    const walker = d.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const dead = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.parentElement || skip(n.parentElement)) continue;
      if (/^\s*(资料来源|参考来源|Sources?|References?)\s*[:：]/i.test(n.nodeValue)) { dead.push(n); continue; }
      // a "Checked 2026-11-10 · doc.govt.nz" stamp that was a link and is now plain text at the end of a sentence
      if (/(已核|Checked)\s+20\d\d-\d\d-\d\d/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\s*(已核|Checked)\s+20\d\d-\d\d-\d\d(\s*·\s*[\w.-]+)?\s*↗?/g, '');
      if (/·\s*20\d\d-\d\d-\d\d/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/(\s*·)+\s*20\d\d-\d\d-\d\d(\s*·)*/g, '');
    }
    dead.forEach(n => n.remove());
    main.querySelectorAll('.route-summary, .home-shortlist p').forEach(p => {
      const first = p.firstChild;
      if (first && first.nodeType === 3 && PREFIX_RE.test(first.nodeValue)) first.nodeValue = first.nodeValue.replace(PREFIX_RE, '');
    });
    // empty shells left behind
    main.querySelectorAll('.journey-facts > div, .gday-meta > div, .v4-actions + .v4-note').forEach(el => { if (!el.textContent.trim()) el.remove(); });
    main.querySelectorAll('section.v3-safety, section.journey-section').forEach(sec => {
      if (sec.id === 'route-map' || sec.querySelector('.v7-gmap')) return;
      const text = sec.textContent.replace(/\s+/g, '');
      const head = (sec.querySelector('h2, h3, .section-label') || {}).textContent || '';
      if (text.length && text.replace(head.replace(/\s+/g, ''), '').length < 4) sec.remove();
    });
    const cards = [...main.querySelectorAll('.prepare-card')];
    cards.forEach(card => {
      const body = [...card.children].filter(c => !/^(H2|H3)$/.test(c.tagName) && !(c.tagName === 'SPAN' && /^\d+$/.test(c.textContent.trim())));
      if (!body.some(c => c.textContent.trim().length > 3)) card.remove();
    });
    main.querySelectorAll('.prepare-card').forEach((card, i) => { const num = card.firstElementChild; if (num && num.tagName === 'SPAN' && /^\d+$/.test(num.textContent.trim())) num.textContent = String(i + 1).padStart(2, '0'); });
    // the planner's stay-price picker belongs to the budget system: v7.css hides the select and its own label only
  }

  /* ---------------------------------------------------- add buttons */
  function decorate() {
    d.querySelectorAll('.route-card').forEach(card => {
      if (card.closest('.v7-deck') || card.querySelector(':scope > .v7-add')) return;
      const a = card.querySelector('a[href*="route.html"]'); if (!a) return;
      let id = ''; try { id = new URL(a.getAttribute('href'), location.href).searchParams.get('id') || ''; } catch (e) { /* skip */ }
      if (id) card.insertAdjacentHTML('beforeend', addBtn('route', id));
    });
    d.querySelectorAll('.v4-card[data-template]').forEach(card => {
      if (card.querySelector('.v7-add')) return;
      const box = card.querySelector('.v4-actions') || card;
      box.insertAdjacentHTML('beforeend', addBtn('template', card.dataset.template, 'light'));
    });
    d.querySelectorAll('.v4-card[data-route]').forEach(card => {
      if (card.querySelector('.v7-add') || !routeById(card.dataset.route)) return;
      const box = card.querySelector('.v4-actions') || card;
      box.insertAdjacentHTML('beforeend', addBtn('route', card.dataset.route, 'light'));
    });
    if (page === 'route') {
      const id = qs.get('id');
      const hero = d.querySelector('.journey-hero-content');
      if (hero && id && routeById(id) && !hero.querySelector('.v7-add')) hero.insertAdjacentHTML('beforeend', addBtn('route', id, 'big'));
    }
    if (page === 'guide') {
      const id = guideTemplate();
      const h1 = d.querySelector('main h1');
      if (h1 && id && !d.querySelector('main .v7-add[data-v7-add^="template:"]')) h1.insertAdjacentHTML('afterend', `<p class="v7-guide-add">${addBtn('template', id, 'light big')}</p>`);
    }
  }

  /* ----------------------------------------- route & template maps */
  function routeMap() {
    if (page !== 'route') return;
    const id = qs.get('id'); const r = routeById(id);
    const old = d.getElementById('routeMap'); if (!r || !old) return;
    const sec = d.getElementById('route-map');
    if (sec && sec.querySelector('.v7-gmap')) return;
    const host = d.createElement('div'); host.className = 'v7-gmap-host';
    old.insertAdjacentElement('afterend', host);
    const stops = routeStops(id);
    mountGmap(host, { stops, mode: r.mode, title: pick([r.name, r.zh]), query: `${r.name} ${(r.region && r.region[0]) || ''} New Zealand` });
    host.insertAdjacentHTML('beforeend', `<p class="v7-gmap-note">${L('点左侧站点切换视角；地形与卫星视图便于判断海拔与路面。野外以官方地图和现场标识为准。', 'Pick a stop on the left to fly there. Terrain and satellite views help read the ground. In the backcountry, follow official maps and signs.')}</p>`);
  }
  // guide.html is a trip editor. The Google map takes the place of the day sketch (#gcoast, which v7.css hides
  // from the first paint) and follows the current draft as days are added, moved or removed. The clickable
  // place picker in the "Map" pane (#v4-map) stays as it is.
  async function guideMap() {
    if (page !== 'guide') return;
    const coast = d.getElementById('gcoast');
    if (!coast) return;
    const c = await catalog(); if (!c) return;
    let dr = null; try { dr = JSON.parse(localStorage.getItem('pounamu-v4-draft') || 'null'); } catch (e) { dr = null; }
    const t = c.templates.find(x => x.id === guideTemplate());
    let stops = [];
    if (dr && Array.isArray(dr.days) && dr.days.length) stops = await templateStops({ days: dr.days.map(x => ({ place_id: x.placeId, from: x.from })) });
    if (!stops.length && t) stops = await templateStops(t);
    if (!coast.isConnected) return;
    const sig = stops.map(s => s.id).join('>') + '|' + langQ();
    let host = coast.nextElementSibling && coast.nextElementSibling.classList.contains('v7-guide-gmap') ? coast.nextElementSibling : null;
    if (host && host.dataset.sig === sig) return;
    if (!host) {
      host = d.createElement('div');
      host.className = 'v7-gmap-host v7-guide-gmap';
      coast.after(host);
    }
    host.dataset.sig = sig;
    if (!stops.length) { host.innerHTML = `<p class="v7-guide-empty">${L('还没有地点。加一天，或在「挑地点」里选几个地方，路线会显示在这里的 Google 地图上。', 'No places yet. Add a day or pick a few places, and the route shows here on Google Maps.')}</p>`; return; }
    const title = (dr && dr.title) || (t ? (zh() ? t.title_zh : t.title_en) : '');
    mountGmap(host, { stops, mode: (t && t.activity) || 'drive', title });
  }

  /* ------------------------------------------------- the route deck */
  const deck = { el: null, ids: [], idx: 0, drag: 0 };
  function deckHTML() {
    return `<div class="v7-deck-bg" aria-hidden="true"><img alt=""><img alt=""></div>
      <div class="v7-deck-top">
        <div class="v7-deck-count"><span>ROUTE DECK · ${L('线路卡', 'ROUTE CARDS')}</span><strong><em>01</em> / 00</strong></div>
        <div class="v7-deck-tools"><div class="v7-viewtoggle" role="group" aria-label="${L('浏览方式', 'View')}"><button type="button" data-view="deck">${L('卡片翻页', 'Card deck')}</button><button type="button" data-view="grid">${L('全部平铺', 'All cards')}</button></div></div>
      </div>
      <div class="v7-deck-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${L('线路卡片，左右键翻页', 'Route cards, use arrow keys')}"></div>
      <div class="v7-deck-ctrl">
        <button type="button" class="v7-arrow" data-dir="-1" aria-label="${L('上一张', 'Previous')}">${ICON.left}</button>
        <div class="v7-scrub"><div class="v7-ticks"></div><input type="range" min="0" max="0" value="0" aria-label="${L('跳到第几张', 'Jump to card')}"></div>
        <button type="button" class="v7-arrow" data-dir="1" aria-label="${L('下一张', 'Next')}">${ICON.right}</button>
      </div>
      <p class="v7-deck-hint">${L('← → 翻页 · 拖动或滑动 · 点 ↻ 翻到卡片背面', '← → to page · drag or swipe · ↻ turns a card over')}</p>`;
  }
  function cardHTML(id, i, n) {
    const r = routeById(id); if (!r) return '';
    const ph = (G('routePhotos') || {})[id] || {};
    const m = MODE[r.mode] || [r.mode, r.mode];
    const facts = [r.time, r.distance].map(pick).filter(Boolean);
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
    const href = `route.html?id=${encodeURIComponent(id)}&lang=${langQ()}`;
    return `<article class="v7-card" data-i="${i}" data-id="${esc(id)}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n} · ${esc(pick([r.name, r.zh]))}">
      <div class="v7-card-in">
        <div class="v7-face v7-front">
          <div class="v7-ph"><img data-src="${esc(ph.src || 'assets/route-placeholder.svg')}" alt="${esc(pick(ph.place) || '')}" decoding="async"></div>
          <div class="v7-front-top"><span class="v7-chip"><i></i>${esc(pick(m))}</span><span class="v7-chip">${pad2(i + 1)} · ${esc(pick(ISLAND[r.island] || ['', '']))}</span></div>
          <div class="v7-front-body">
            <span class="v7-place">${esc(pick(r.region))}</span>
            <h3>${esc(pick([r.name, r.zh]))}</h3>
            <p>${esc(pick(r.summary))}</p>
            ${facts.length ? `<div class="v7-facts">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
            <div class="v7-front-actions"><a class="v7-btn glow" href="${href}">${L('查看详情', 'Open route')} ${ICON.right}</a>${addBtn('route', id)}<button type="button" class="v7-flipbtn" data-flip aria-label="${L('翻到背面', 'Turn over')}">${ICON.flip}</button></div>
          </div>
        </div>
        <div class="v7-face v7-back">
          <div class="v7-back-head"><span>NO. ${pad2(i + 1)} · ${esc(pick(m))}</span><button type="button" class="v7-flipbtn" data-flip aria-label="${L('翻回正面', 'Turn back')}">${ICON.flip}</button></div>
          <div class="v7-back-scroll">
            <h3>${esc(pick([r.name, r.zh]))}</h3>
            ${r.intro ? `<p>${esc(pick(r.intro))}</p>` : ''}
            <dl>${row(L('起终点', 'Ends'), pick(r.ends))}${row(L('季节', 'Season'), pick(r.season))}${row(L('难度', 'Grade'), pick(r.level))}${row(L('装备', 'Gear'), pick(r.gear))}</dl>
          </div>
          <div class="v7-back-actions"><a class="v7-btn dark" href="${href}">${L('完整行程', 'Full guide')} ${ICON.right}</a>${addBtn('route', id, 'light')}</div>
        </div>
      </div>
    </article>`;
  }
  function deckSet(i, dragOffset) {
    const n = deck.ids.length; if (!deck.el) return;
    deck.idx = clamp(i, 0, Math.max(0, n - 1));
    const off = dragOffset || 0;
    deck.el.querySelectorAll('.v7-card').forEach(c => {
      const k = +c.dataset.i; const o = k - deck.idx + off; const a = Math.abs(o);
      c.style.setProperty('--o', o.toFixed(3)); c.style.setProperty('--a', Math.min(a, 4).toFixed(3));
      c.classList.toggle('is-active', k === deck.idx && !off);
      if (a > 3.4) c.setAttribute('data-far', ''); else c.removeAttribute('data-far');
      if (k !== deck.idx) c.classList.remove('flipped');
      if (a < 4.5) { const img = c.querySelector('img[data-src]'); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); } }
      c.setAttribute('aria-hidden', String(k !== deck.idx));
      c.querySelectorAll('a,button').forEach(x => { x.tabIndex = k === deck.idx ? 0 : -1; });
    });
    if (off) return;
    const cnt = deck.el.querySelector('.v7-deck-count strong');
    cnt.innerHTML = `<em>${pad2(deck.idx + 1)}</em> / ${pad2(n)}`;
    const range = deck.el.querySelector('.v7-scrub input'); range.max = Math.max(0, n - 1); range.value = deck.idx;
    deck.el.querySelectorAll('.v7-ticks span').forEach((s, k) => s.classList.toggle('on', k === deck.idx));
    deck.el.querySelector('[data-dir="-1"]').disabled = deck.idx === 0;
    deck.el.querySelector('[data-dir="1"]').disabled = deck.idx >= n - 1;
    const active = deck.el.querySelector(`.v7-card[data-i="${deck.idx}"] img`);
    const imgs = deck.el.querySelectorAll('.v7-deck-bg img');
    if (active && imgs.length === 2) {
      const src = active.getAttribute('src') || active.dataset.src;
      const cur = deck.el.querySelector('.v7-deck-bg img.on');
      if (!cur || cur.getAttribute('src') !== src) {
        const next = cur === imgs[0] ? imgs[1] : imgs[0];
        next.onload = () => { next.classList.add('on'); if (cur) cur.classList.remove('on'); };
        next.src = src;
        if (next.complete && next.naturalWidth) next.onload();
      }
    }
    try { sessionStorage.setItem('v7-deck-id', deck.ids[deck.idx] || ''); } catch (e) { /* ignore */ }
  }
  function deckBuild() {
    const grid = d.getElementById('routeGrid'); if (!grid || !deck.el) return;
    const ids = [...grid.querySelectorAll('a[href*="route.html"]')].map(a => { try { return new URL(a.getAttribute('href'), location.href).searchParams.get('id'); } catch (e) { return null; } }).filter((v, i, arr) => v && arr.indexOf(v) === i);
    const keep = deck.ids[deck.idx] || (() => { try { return sessionStorage.getItem('v7-deck-id'); } catch (e) { return ''; } })();
    deck.ids = ids;
    const stage = deck.el.querySelector('.v7-deck-stage');
    stage.innerHTML = ids.length ? ids.map((id, i) => cardHTML(id, i, ids.length)).join('') : `<div class="v7-deck-empty">${L('没有符合筛选的线路', 'No routes match these filters')}</div>`;
    deck.el.querySelector('.v7-ticks').innerHTML = ids.map(() => '<span></span>').join('');
    const at = ids.indexOf(keep);
    deckSet(at >= 0 ? at : 0);
  }
  function setView(v) {
    body.dataset.v7View = v;
    try { localStorage.setItem('v7-routes-view', v); } catch (e) { /* ignore */ }
    if (deck.el) deck.el.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  }
  function initDeck() {
    if (page !== 'routes') return;
    const grid = d.getElementById('routeGrid'); if (!grid) return;
    if (!deck.el) {
      deck.el = d.createElement('section'); deck.el.className = 'v7-deck';
      grid.insertAdjacentElement('beforebegin', deck.el);
      let v = 'deck'; try { v = localStorage.getItem('v7-routes-view') || 'deck'; } catch (e) { /* ignore */ }
      bindDeck();
      new MutationObserver(() => { clearTimeout(deck.t); deck.t = setTimeout(deckBuild, 40); }).observe(grid, { childList: true });
      deck.el.innerHTML = deckHTML(); setView(v);
    } else {
      const v = body.dataset.v7View; deck.el.innerHTML = deckHTML(); setView(v);
    }
    deckBuild();
  }
  function bindDeck() {
    const el = deck.el;
    el.addEventListener('click', e => {
      const v = e.target.closest('[data-view]'); if (v) { setView(v.dataset.view); if (v.dataset.view === 'deck') deckSet(deck.idx); return; }
      const dir = e.target.closest('[data-dir]'); if (dir) { deckSet(deck.idx + +dir.dataset.dir); return; }
      if (deck.moved) { e.preventDefault(); return; }
      const flip = e.target.closest('[data-flip]'); if (flip) { flip.closest('.v7-card').classList.toggle('flipped'); return; }
      const card = e.target.closest('.v7-card'); if (!card) return;
      if (!card.classList.contains('is-active')) { e.preventDefault(); deckSet(+card.dataset.i); return; }
      if (!e.target.closest('a,button') && e.target.closest('.v7-ph, .v7-front-body h3, .v7-front-body p')) card.classList.toggle('flipped');
    });
    el.addEventListener('input', e => { if (e.target.matches('.v7-scrub input')) deckSet(+e.target.value); });
    const stage = () => el.querySelector('.v7-deck-stage');
    el.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); deckSet(deck.idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); deckSet(deck.idx - 1); }
      else if (e.key === 'Home') { e.preventDefault(); deckSet(0); }
      else if (e.key === 'End') { e.preventDefault(); deckSet(deck.ids.length - 1); }
    });
    let wheelLock = 0;
    el.addEventListener('wheel', e => {
      if (!e.target.closest('.v7-deck-stage') || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      const now = Date.now(); if (now - wheelLock < 420) return; wheelLock = now;
      deckSet(deck.idx + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    let x0 = null, w = 1, pid = null;
    el.addEventListener('pointerdown', e => {
      if (!e.target.closest('.v7-deck-stage') || e.button !== 0 || e.target.closest('.v7-back-scroll')) return;
      x0 = e.clientX; deck.moved = false; pid = e.pointerId;
      const card = el.querySelector('.v7-card.is-active'); w = card ? card.offsetWidth * 0.9 : 320;
    });
    el.addEventListener('pointermove', e => {
      if (x0 == null || e.pointerId !== pid) return;
      const dx = e.clientX - x0;
      if (!deck.moved && Math.abs(dx) > 8) { deck.moved = true; el.classList.add('dragging'); try { stage().setPointerCapture(pid); } catch (er) { /* ignore */ } }
      if (deck.moved) deckSet(deck.idx, clamp(dx / w, -1.4, 1.4));
    });
    const end = e => {
      if (x0 == null) return;
      const dx = (e.clientX || x0) - x0; x0 = null; el.classList.remove('dragging');
      if (deck.moved) { const steps = Math.abs(dx) > 50 ? -Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / w)) : 0; deckSet(deck.idx + steps); setTimeout(() => { deck.moved = false; }, 0); }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------- push-pull + focus pull */
  const dollies = new Set();
  let io = null, ticking = false;
  function watchDolly(img, strength) {
    if (!img || img.dataset.v7Dolly) return;
    img.dataset.v7Dolly = String(strength || 1);
    img.classList.add('v7-dolly');
    if (!io) io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) dollies.add(x.target); else dollies.delete(x.target); }), { rootMargin: '10% 0px' });
    io.observe(img);
  }
  function scanDolly() {
    d.querySelectorAll('.photo-band > img').forEach(img => watchDolly(img, 1));
    d.querySelectorAll('.journey-hero > img').forEach(img => watchDolly(img, .8));
    d.querySelectorAll('.v4-dest-photo img, .destination-hero img, .guide-hero img').forEach(img => watchDolly(img, .7));
    const hero = d.querySelector('.cinema-hero');
    if (hero && !hero.dataset.v7) {
      hero.dataset.v7 = '1';
      const frame = hero.querySelector('.cinema-frame');
      if (frame) frame.insertAdjacentHTML('beforeend', '<div class="v7-hero-grid" aria-hidden="true"></div><div class="v7-hero-scan" aria-hidden="true"></div>');
      hero.addEventListener('pointermove', e => {
        if (!motionOn() || e.pointerType !== 'mouse') return;
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--v7-px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        hero.style.setProperty('--v7-py', (((e.clientY - r.top) / Math.min(r.height, innerHeight)) * 2 - 1).toFixed(3));
      });
      hero.addEventListener('pointerleave', () => { hero.style.setProperty('--v7-px', 0); hero.style.setProperty('--v7-py', 0); });
    }
  }
  function frame() {
    ticking = false;
    const y = window.scrollY, vh = innerHeight;
    const g = d.querySelector('.v7-ground'); if (g) g.style.setProperty('--v7-scroll', Math.round(y));
    if (!motionOn()) return;
    const hero = d.querySelector('.cinema-hero');
    if (hero) {
      const p = clamp(y / Math.max(1, hero.offsetHeight - vh * 0.4), 0, 1);
      hero.style.setProperty('--v7-hero-s', (1 + p * 0.14).toFixed(4));
      hero.style.setProperty('--v7-hero-b', (p * p * 8).toFixed(2) + 'px');
      hero.style.setProperty('--v7-hero-sat', (1 - p * 0.3).toFixed(3));
    }
    dollies.forEach(img => {
      const box = (img.parentElement || img).getBoundingClientRect();
      const k = clamp((box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2), -1, 1);
      const a = Math.abs(k), s = +img.dataset.v7Dolly || 1;
      img.style.setProperty('--v7-ds', (1.05 + 0.15 * a * s).toFixed(4));
      img.style.setProperty('--v7-dy', (k * -6 * s).toFixed(2) + '%');
      img.style.setProperty('--v7-db', (a > 0.55 ? (a - 0.55) * 8 * s : 0).toFixed(2) + 'px');
      const band = img.closest('.photo-band'); if (band) band.style.setProperty('--v7-band', k.toFixed(3));
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ============================================================ notebook */
  const nbView = { tab: 'plan', draft: [], editing: null };
  const TAPES = ['rgba(87,213,173,.5)', 'rgba(143,210,230,.6)', 'rgba(229,85,58,.38)', 'rgba(190,206,198,.85)'];
  const seeded = (str, n) => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % n; };
  function itemTitle(it) { return (it.t && (zh() ? it.t.zh : it.t.en)) || it.ref; }
  function itemPlace(it) { return (it.place && (zh() ? it.place.zh : it.place.en)) || ''; }
  function fmtDate(iso, opts) {
    if (!iso) return '';
    const dt = new Date(iso + 'T12:00:00');
    if (isNaN(dt)) return iso;
    return dt.toLocaleDateString(zh() ? 'zh-CN' : 'en-NZ', opts || { month: 'short', day: 'numeric', weekday: 'short' });
  }
  function dayNumber(iso, s) {
    const base = s.start || s.items.map(i => i.date).filter(Boolean).sort()[0];
    if (!base || !iso) return null;
    return Math.round((new Date(iso + 'T12:00:00') - new Date(base + 'T12:00:00')) / 864e5) + 1;
  }
  function cover(it) {
    if (it.img) return `<img src="${esc(it.img)}" alt="" loading="lazy">`;
    return `<div class="v7-tcover"><span>${esc(it.ref)}</span><b>${esc(it.days || '')}</b><small>${it.days ? L('天', 'DAYS') : ''}</small></div>`;
  }
  function nbStats(s) {
    const days = new Set(s.items.map(i => i.date).filter(Boolean)).size;
    const imgs = s.notes.reduce((n, x) => n + (x.imgs || []).length, 0);
    return [[s.items.length, L('线路卡', 'Cards')], [days, L('已排天数', 'Days planned')], [s.notes.length, L('笔记', 'Notes')], [imgs, L('贴图', 'Photos')]];
  }
  function renderNotebook() {
    if (page !== 'notebook') return;
    const main = d.querySelector('main'); if (!main) return;
    document.title = L('我的笔记本', 'My notebook') + ' — 绿石之地 · Pounamu Atlas';
    const s = nb.read();
    const tabs = [['plan', L('行程安排', 'Itinerary'), pad2(s.items.length)], ['notes', L('笔记与贴图', 'Notes & photos'), pad2(s.notes.length)], ['budget', L('预算梳理', 'Budget'), 'SOON']];
    main.innerHTML = `<div class="v7-nb">
      <section class="v7-head">
        <p class="v7-mono">FIELD NOTEBOOK · ${L('我的行程本', 'MY TRIP BOOK')}</p>
        <div class="v7-nb-titlebox">
          <input class="v7-nb-title" id="v7NbTitle" value="${esc(s.title)}" placeholder="${esc(L('我的新西兰行程', 'My New Zealand trip'))}" aria-label="${esc(L('笔记本标题', 'Notebook title'))}" maxlength="60">
          <div class="v7-nb-start"><label for="v7NbStart">${L('出发日期', 'Start date')}</label><input class="v7-input" type="date" id="v7NbStart" value="${esc(s.start)}"></div>
        </div>
        <p class="lead" style="margin-top:18px">${L('把喜欢的线路卡和行程模板收进来，排好日期和时间，再写笔记、贴照片。内容只保存在这台设备的浏览器里，换设备不会同步。', 'Collect route cards and itineraries, give each a date and time, then write notes and pin photos. Everything stays in this browser on this device.')}</p>
        <div class="v7-head-stats">${nbStats(s).map(([n, l]) => `<div><strong>${pad2(n)}</strong><span>${esc(l)}</span></div>`).join('')}</div>
      </section>
      <nav class="v7-tabs" role="tablist" aria-label="${L('笔记本分区', 'Notebook sections')}">${tabs.map(([k, l, c]) => `<button type="button" role="tab" id="v7tab-${k}" aria-controls="v7panel-${k}" aria-selected="${nbView.tab === k}" data-tab="${k}">${esc(l)} <span>${esc(c)}</span></button>`).join('')}</nav>
      <section class="v7-panel" id="v7panel-plan" role="tabpanel" aria-labelledby="v7tab-plan" ${nbView.tab === 'plan' ? '' : 'hidden'}>${planPanel(s)}</section>
      <section class="v7-panel" id="v7panel-notes" role="tabpanel" aria-labelledby="v7tab-notes" ${nbView.tab === 'notes' ? '' : 'hidden'}>${notesPanel(s)}</section>
      <section class="v7-panel" id="v7panel-budget" role="tabpanel" aria-labelledby="v7tab-budget" ${nbView.tab === 'budget' ? '' : 'hidden'}>${budgetPanel()}</section>
    </div>`;
    hydrateNotes(main);
    mountOverview(main, s);
  }
  function emptyArt() {
    return `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 26c14-6 26-6 40 2 14-8 26-8 40-2v70c-14-6-26-6-40 2-14-8-26-8-40-2Z"/><path d="M60 28v70"/><path d="M30 50c6 6 12-2 18 4" stroke-dasharray="3 4"/><circle cx="30" cy="50" r="2.5" fill="currentColor"/><circle cx="48" cy="54" r="2.5" fill="currentColor"/><path d="M72 44h18M72 54h14M72 64h18"/></svg>`;
  }
  function planPanel(s) {
    if (!s.items.length) return `<div class="v7-empty v7-panel-in">${emptyArt()}<h3>${L('笔记本还是空的', 'Your notebook is empty')}</h3><p>${L('在挑线路或首页的行程卡上点「加入笔记本」，它就会出现在这里，等你排日期。', 'Tap “Add to notebook” on any route or itinerary card and it lands here, ready for a date.')}</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="v7-btn dark" href="routes.html?lang=${langQ()}">${L('去挑线路', 'Browse routes')} ${ICON.right}</a><a class="v7-btn" href="index.html?lang=${langQ()}#v4-search">${L('看行程模板', 'See itineraries')}</a></div></div>`;
    const dated = s.items.filter(i => i.date).sort((a, b) => (a.date + (a.time || '99') + String(a.order).padStart(15, '0')).localeCompare(b.date + (b.time || '99') + String(b.order).padStart(15, '0')));
    const loose = s.items.filter(i => !i.date).sort((a, b) => a.order - b.order);
    const groups = [];
    dated.forEach(it => { const g = groups[groups.length - 1]; if (g && g.date === it.date) g.items.push(it); else groups.push({ date: it.date, items: [it] }); });
    const dayBlock = g => {
      const n = dayNumber(g.date, s);
      return `<div class="v7-day"><div class="v7-day-mark"><b>${n != null && n > 0 ? 'D' + pad2(n) : '—'}</b><span>${esc(fmtDate(g.date))}</span><i></i></div><div class="v7-day-list">${g.items.map(itemCard).join('')}</div></div>`;
    };
    const looseBlock = loose.length ? `<div class="v7-day unscheduled"><div class="v7-day-mark"><b>${L('待安排', 'To plan')}</b><span>${pad2(loose.length)} ${L('张卡', 'cards')}</span><i></i></div><div class="v7-day-list">${loose.map(itemCard).join('')}</div></div>` : '';
    return `<div class="v7-nb-layout v7-panel-in"><div class="v7-nb-days">${groups.map(dayBlock).join('')}${looseBlock}</div>
      <aside class="v7-nb-aside">
        <div class="v7-card-d"><header><span class="v7-mono">GOOGLE MAPS · ${L('行程总览', 'TRIP OVERVIEW')}</span><span class="v7-live"><i></i>LIVE</span></header><div class="v7-mini-map" id="v7NbMap"><div class="v7-gmap-loading">LOADING…</div></div><footer><a class="v7-btn glow" id="v7NbOpen" href="#" target="_blank" rel="noopener" data-keep-link="1">${L('在 Google Maps 打开整条路线', 'Open the whole trip in Google Maps')} ${ICON.ext}</a><button type="button" class="v7-btn" data-nb-print>${L('打印 / 存为 PDF', 'Print / save as PDF')}</button></footer></div>
        <div class="v7-legend"><strong>${L('怎么用', 'How it works')}</strong>${L('给每张卡填日期和时间，就会自动按天排好；没填日期的放在「待安排」。地图按日期顺序串起各线路的起点。', 'Give each card a date and time and it files itself by day; cards without a date wait under “To plan”. The map links each route’s start in date order.')}</div>
      </aside></div>`;
  }
  function itemCard(it) {
    const s = nb.read();
    const notes = s.notes.filter(n => n.item === it.uid);
    const imgs = notes.reduce((k, n) => k + (n.imgs || []).length, 0);
    const m = MODE[it.mode] || ['', ''];
    const mapHref = it.stops && it.stops.length ? gmapOpenUrl(it.stops, it.mode) : '';
    return `<article class="v7-item" data-uid="${esc(it.uid)}">
      <div class="v7-item-ph">${cover(it)}<span class="v7-chip"><i></i>${esc(it.type === 'template' ? L('行程模板', 'Itinerary') : pick(m))}</span></div>
      <div class="v7-item-body">
        <div class="v7-item-top"><div><h3><a href="${entryHref(it)}">${esc(itemTitle(it))}</a></h3><div class="v7-item-place">${esc(itemPlace(it))}</div></div></div>
        <div class="v7-item-when">
          <label>${L('日期', 'Date')}<input class="v7-input" type="date" data-f="date" value="${esc(it.date || '')}"></label>
          <label>${L('开始', 'Start')}<input class="v7-input" type="time" data-f="time" value="${esc(it.time || '')}"></label>
          <label>${L('结束', 'End')}<input class="v7-input" type="time" data-f="end" value="${esc(it.end || '')}"></label>
        </div>
        ${notes.length ? `<div class="v7-item-notes"><span>${pad2(notes.length)} ${L('条笔记', 'notes')}${imgs ? ' · ' + imgs + ' ' + L('张图', 'photos') : ''}</span></div>` : ''}
        <div class="v7-item-tools">
          <button type="button" class="v7-pill-btn" data-nb-note="${esc(it.uid)}">${ICON.pen.replace('<svg', '<svg width="14" height="14"')} ${L('写笔记 / 贴图', 'Note / photo')}</button>
          ${mapHref ? `<a class="v7-pill-btn" href="${esc(mapHref)}" target="_blank" rel="noopener" data-keep-link="1">${ICON.pin.replace('<svg', '<svg width="14" height="14"')} Google Maps</a>` : ''}
          <span style="flex:1"></span>
          <button type="button" class="v7-icon-btn" data-nb-move="-1" aria-label="${L('上移', 'Move up')}">${ICON.up}</button>
          <button type="button" class="v7-icon-btn" data-nb-move="1" aria-label="${L('下移', 'Move down')}">${ICON.down}</button>
          <button type="button" class="v7-icon-btn danger" data-nb-del aria-label="${L('从笔记本删除', 'Remove from notebook')}">${ICON.trash}</button>
        </div>
      </div>
    </article>`;
  }
  function mountOverview(main, s) {
    const box = main.querySelector('#v7NbMap'); if (!box) return;
    const ordered = s.items.filter(i => i.date).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).concat(s.items.filter(i => !i.date));
    const pts = [];
    ordered.forEach(it => (it.stops || []).slice(0, it.type === 'template' ? 12 : 1).forEach(p => pts.push(p)));
    const open = main.querySelector('#v7NbOpen');
    if (!pts.length) { box.innerHTML = `<div class="v7-gmap-loading">${L('这些卡还没有坐标', 'No coordinates on these cards yet')}</div>`; if (open) open.hidden = true; return; }
    const src = pts.length >= 2 ? gmapSrc({ stops: pts, view: 'route' }) : gmapSrc({ stops: pts, view: 0, zoom: 10 });
    box.insertAdjacentHTML('beforeend', `<iframe title="${esc(L('行程总览地图', 'Trip overview map'))}" referrerpolicy="no-referrer-when-downgrade" src="${esc(src)}"></iframe>`);
    if (open) open.href = gmapOpenUrl(sample(pts, 10), 'drive');
  }
  function notesPanel(s) {
    const opts = s.items.map(it => `<option value="${esc(it.uid)}" ${nbView.link === it.uid ? 'selected' : ''}>${esc(itemTitle(it))}</option>`).join('');
    const compose = `<form class="v7-compose v7-panel-in" id="v7Compose">
      <textarea id="v7NoteText" placeholder="${esc(L('写点什么……比如：第 2 天早点出发，赶 8:30 的船；山顶风大，带件抓绒。', 'Write something… e.g. leave early on day 2 for the 8:30 ferry; it is windy on top, bring a fleece.'))}"></textarea>
      <div class="v7-compose-thumbs" id="v7Thumbs"></div>
      <div class="v7-compose-row">
        <select class="v7-input" id="v7NoteLink" aria-label="${esc(L('关联到哪张卡', 'Link to a card'))}"><option value="">${L('不关联线路卡', 'Not linked to a card')}</option>${opts}</select>
        <label class="v7-drop">${ICON.image} ${L('添加照片', 'Add photos')}<input type="file" accept="image/*" multiple hidden id="v7NoteFiles"></label>
        <button type="submit" class="v7-btn dark">${L('贴进笔记本', 'Pin to notebook')}</button>
      </div>
    </form>`;
    const notes = s.notes.slice().sort((a, b) => b.at - a.at);
    const byUid = new Map(s.items.map(i => [i.uid, i]));
    const board = notes.length ? `<div class="v7-board">${notes.map(n => {
      const it = byUid.get(n.item);
      const rot = (seeded(n.id, 7) - 3) * 0.6;
      return `<article class="v7-note" data-note="${esc(n.id)}" style="--rot:${rot}deg;--tape:${TAPES[seeded(n.id, TAPES.length)]}">
        <div class="v7-note-meta"><span>${esc(new Date(n.at).toLocaleDateString(zh() ? 'zh-CN' : 'en-NZ', { month: 'short', day: 'numeric' }))}${n.edited ? ' · ' + L('已编辑', 'edited') : ''}</span>${it ? `<a href="${entryHref(it)}">${esc(itemTitle(it))}</a>` : ''}</div>
        ${n.text ? `<p class="v7-note-text">${esc(n.text)}</p>` : ''}
        ${(n.imgs || []).length ? `<div class="v7-polaroids">${n.imgs.map((k, i) => `<figure style="--pr:${(seeded(k, 5) - 2) * 1.2}deg" data-img="${esc(k)}"><img alt="" data-idb="${esc(k)}"></figure>`).join('')}</div>` : ''}
        <div class="v7-note-tools"><button type="button" class="v7-icon-btn" data-note-edit aria-label="${L('编辑', 'Edit')}">${ICON.pen}</button><button type="button" class="v7-icon-btn danger" data-note-del aria-label="${L('删除笔记', 'Delete note')}">${ICON.trash}</button></div>
      </article>`;
    }).join('')}</div>` : `<div class="v7-empty">${emptyArt()}<h3>${L('还没有笔记', 'No notes yet')}</h3><p>${L('写下想法、贴上截图或现场照片，可以挂在某张线路卡上。', 'Jot ideas, pin screenshots or photos, and hang them on a route card if you like.')}</p></div>`;
    return compose + board;
  }
  function budgetPanel() {
    return `<div class="v7-budget-soon v7-panel-in">
      <div class="v7-budget-copy">
        <span class="v7-soon-badge">● ${L('设计中 · 即将上线', 'IN DESIGN · COMING SOON')}</span>
        <h2>${L('预算梳理', 'Budget')}</h2>
        <p>${L('这里会按笔记本里的行程，帮你把钱花在哪里理清楚。具体怎么做还在想，先占个位。', 'This will sort out where the money goes, based on the trip in your notebook. The design is still being worked out.')}</p>
        <ul><li>${L('按天、按类别归拢花费', 'Costs by day and by category')}</li><li>${L('多人分摊', 'Split between travellers')}</li><li>${L('纽币 / 人民币对照', 'NZD and CNY side by side')}</li></ul>
      </div>
      <div class="v7-budget-ghost" aria-hidden="true">${[78, 54, 66, 42, 70, 50].map(w => `<div><i style="width:${w}%"></i><i></i></div>`).join('')}</div>
    </div>`;
  }
  const objectUrls = [];
  function hydrateNotes(main) {
    objectUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
    main.querySelectorAll('img[data-idb]').forEach(img => {
      idb.get(img.dataset.idb).then(blob => { if (!blob) { img.closest('figure').remove(); return; } const u = URL.createObjectURL(blob); objectUrls.push(u); img.src = u; }).catch(() => {});
    });
    paintThumbs();
  }
  function paintThumbs() {
    const box = d.getElementById('v7Thumbs'); if (!box) return;
    box.innerHTML = nbView.draft.map((f, i) => `<figure><img alt="" src="${f.url}"><button type="button" data-thumb-del="${i}" aria-label="${L('移除', 'Remove')}">×</button></figure>`).join('');
  }
  async function addDraftFiles(files) {
    for (const f of files) {
      if (!/^image\//.test(f.type)) continue;
      const blob = await shrink(f, 1600);
      nbView.draft.push({ blob, url: URL.createObjectURL(blob) });
    }
    paintThumbs();
  }
  function bindNotebook() {
    if (page !== 'notebook') return;
    const main = d.querySelector('main');
    const save = fn => { const s = nb.read(); fn(s); nb.write(s); };
    main.addEventListener('click', async e => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { nbView.tab = tab.dataset.tab; history.replaceState(null, '', '#' + nbView.tab); renderNotebook(); return; }
      if (e.target.closest('[data-nb-print]')) { window.print(); return; }
      const noteFor = e.target.closest('[data-nb-note]');
      if (noteFor) { nbView.tab = 'notes'; nbView.link = noteFor.dataset.nbNote; history.replaceState(null, '', '#notes'); renderNotebook(); setTimeout(() => { const t = d.getElementById('v7NoteText'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 60); return; }
      const card = e.target.closest('.v7-item');
      if (card && e.target.closest('[data-nb-del]')) {
        const u = card.dataset.uid; let removed = null;
        save(s => { const i = s.items.findIndex(x => x.uid === u); if (i >= 0) removed = s.items.splice(i, 1)[0]; });
        lastRemoved = removed; renderNotebook();
        toast(L('已从笔记本移除', 'Removed from notebook'), { href: '#', label: L('撤销', 'Undo'), undo: true });
        return;
      }
      if (card && e.target.closest('[data-nb-move]')) {
        const dir = +e.target.closest('[data-nb-move]').dataset.nbMove;
        save(s => {
          const me = s.items.find(x => x.uid === card.dataset.uid); if (!me) return;
          const peers = s.items.filter(x => (x.date || '') === (me.date || '')).sort((a, b) => ((a.time || '') + String(a.order).padStart(15, '0')).localeCompare((b.time || '') + String(b.order).padStart(15, '0')));
          const i = peers.indexOf(me), j = i + dir; if (j < 0 || j >= peers.length) return;
          const other = peers[j];
          if ((me.time || '') !== (other.time || '')) { const t = me.time; me.time = other.time; other.time = t; }
          const o = me.order; me.order = other.order; other.order = o;
        });
        renderNotebook(); return;
      }
      const thumbDel = e.target.closest('[data-thumb-del]');
      if (thumbDel) { const i = +thumbDel.dataset.thumbDel; const [f] = nbView.draft.splice(i, 1); if (f) URL.revokeObjectURL(f.url); paintThumbs(); return; }
      const note = e.target.closest('.v7-note');
      if (note && e.target.closest('[data-note-del]')) {
        const id = note.dataset.note; let imgs = [];
        save(s => { const i = s.notes.findIndex(n => n.id === id); if (i >= 0) { imgs = s.notes[i].imgs || []; s.notes.splice(i, 1); } });
        imgs.forEach(k => idb.del(k).catch(() => {}));
        renderNotebook(); return;
      }
      if (note && e.target.closest('[data-note-edit]')) {
        let p = note.querySelector('.v7-note-text');
        if (!p) { p = d.createElement('p'); p.className = 'v7-note-text'; note.querySelector('.v7-note-meta').after(p); }
        if (p.isContentEditable) { p.blur(); return; }
        p.contentEditable = 'true'; p.focus();
        const done = () => { p.contentEditable = 'false'; const text = p.innerText.trim(); save(s => { const n = s.notes.find(x => x.id === note.dataset.note); if (n && n.text !== text) { n.text = text; n.edited = Date.now(); } }); };
        p.addEventListener('blur', done, { once: true });
        return;
      }
      const fig = e.target.closest('.v7-polaroids figure');
      if (fig) {
        const src = fig.querySelector('img').src; if (!src) return;
        const lb = d.createElement('div'); lb.className = 'v7-lightbox'; lb.innerHTML = `<img alt="" src="${src}">`; body.append(lb);
        requestAnimationFrame(() => lb.classList.add('on'));
        const close = () => { lb.classList.remove('on'); setTimeout(() => lb.remove(), 350); d.removeEventListener('keydown', key); };
        const key = ev => { if (ev.key === 'Escape') close(); };
        lb.addEventListener('click', close); d.addEventListener('keydown', key);
      }
    });
    main.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'v7NbStart') { save(s => { s.start = t.value; }); renderNotebook(); return; }
      if (t.id === 'v7NoteFiles') { addDraftFiles([...t.files]); t.value = ''; return; }
      if (t.id === 'v7NoteLink') { nbView.link = t.value; return; }
      const card = t.closest('.v7-item');
      if (card && t.dataset.f) {
        save(s => { const it = s.items.find(x => x.uid === card.dataset.uid); if (it) { it[t.dataset.f] = t.value; if (t.dataset.f === 'date') it.order = Date.now(); } });
        if (t.dataset.f === 'date') { renderNotebook(); const moved = d.querySelector(`.v7-item[data-uid="${card.dataset.uid}"]`); if (moved) { moved.classList.add('v7-new'); moved.scrollIntoView({ block: 'center', behavior: motionOn() ? 'smooth' : 'auto' }); } }
      }
    });
    main.addEventListener('input', e => {
      if (e.target.id === 'v7NbTitle') { const v = e.target.value; clearTimeout(bindNotebook.t); bindNotebook.t = setTimeout(() => { const s = nb.read(); s.title = v; try { localStorage.setItem(NB_KEY, JSON.stringify(s)); } catch (er) { /* ignore */ } }, 250); }
    });
    main.addEventListener('submit', async e => {
      if (e.target.id !== 'v7Compose') return;
      e.preventDefault();
      const text = (d.getElementById('v7NoteText').value || '').trim();
      if (!text && !nbView.draft.length) { toast(L('先写点字或加张图', 'Write something or add a photo first')); return; }
      const id = uid(); const keys = [];
      try {
        for (const f of nbView.draft) { const k = id + '-' + keys.length; await idb.put(k, f.blob); keys.push(k); }
      } catch (er) { toast(L('照片没存进去：这个浏览器不允许本地存储', 'Photos could not be saved in this browser')); }
      nbView.draft.forEach(f => URL.revokeObjectURL(f.url)); nbView.draft = [];
      const link = d.getElementById('v7NoteLink').value || null;
      save(s => { s.notes.push({ id, item: link, text, imgs: keys, at: Date.now() }); });
      renderNotebook();
      toast(L('已贴进笔记本', 'Pinned to your notebook'));
    });
    main.addEventListener('dragover', e => { const c = e.target.closest('#v7Compose'); if (c) { e.preventDefault(); c.classList.add('drag'); } });
    main.addEventListener('dragleave', e => { const c = e.target.closest('#v7Compose'); if (c) c.classList.remove('drag'); });
    main.addEventListener('drop', e => { const c = e.target.closest('#v7Compose'); if (!c) return; e.preventDefault(); c.classList.remove('drag'); addDraftFiles([...(e.dataTransfer.files || [])]); });
    main.addEventListener('paste', e => { if (!e.target.closest('#v7Compose')) return; const files = [...(e.clipboardData.files || [])].filter(f => /^image\//.test(f.type)); if (files.length) { e.preventDefault(); addDraftFiles(files); } });
    window.addEventListener('v7:nb', () => { if (!d.activeElement || !d.activeElement.closest('.v7-nb') || d.activeElement.id === 'v7NbTitle') return; });
    const h = (location.hash || '').slice(1); if (['plan', 'notes', 'budget'].includes(h)) nbView.tab = h;
  }

  /* ============================================================= sources */
  let srcData = null;
  async function renderSources() {
    if (page !== 'sources') return;
    const main = d.querySelector('main'); if (!main) return;
    document.title = L('资料来源', 'Sources') + ' — 绿石之地 · Pounamu Atlas';
    if (!srcData) {
      main.innerHTML = `<section class="v7-head"><p class="v7-mono">SOURCES</p><h1>${L('资料来源', 'Sources')}</h1><p class="lead">LOADING…</p></section>`;
      try { srcData = await fetch('data/v7-sources.json').then(r => r.json()); } catch (e) { main.querySelector('.lead').textContent = L('来源清单没能加载。', 'The source list did not load.'); return; }
    }
    const D = srcData;
    const tab = srcView.tab;
    const tabs = [['routes', L('线路来源', 'Route sources'), D.routes.length], ['verify', L('待核实清单', 'To verify'), D.counts.toVerify], ['templates', L('行程模板', 'Itineraries'), D.templates.length], ['photos', L('图片署名', 'Photo credits'), D.counts.photos], ['licence', L('数据与许可', 'Data & licences'), D.licences.length]];
    main.innerHTML = `<div class="v7-sources-page">
      <section class="v7-head">
        <p class="v7-mono">SOURCES · ${L('资料来源总表', 'ALL REFERENCES')}</p>
        <h1>${L('资料来源', 'Sources')}</h1>
        <p class="lead">${L('站内所有线路用到的官方来源、还没核实的字段、照片署名和数据许可，都集中在这一页。正文里不再逐条标注；出发前请以官方页面为准。', 'Every official source, every field still to verify, every photo credit and data licence used on this site lives on this one page. The reading pages no longer list them inline. Check the official page before you go.')}</p>
        <div class="v7-head-stats">${[[D.counts.routes, L('线路', 'Routes')], [D.counts.sources, L('官方来源', 'Sources')], [D.counts.toVerify, L('待核实字段', 'Fields to verify')], [D.counts.photos, L('图片', 'Photos')]].map(([n, l]) => `<div><strong>${n}</strong><span>${esc(l)}</span></div>`).join('')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:30px"><button type="button" class="v7-btn ghost-d" data-src-md>${L('下载为 Markdown 文档', 'Download as Markdown')} ${ICON.doc}</button><button type="button" class="v7-btn ghost-d" data-src-print>${L('打印 / 存 PDF', 'Print / PDF')}</button></div>
      </section>
      <nav class="v7-tabs" role="tablist">${tabs.map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-stab="${k}">${esc(l)} <span>${c}</span></button>`).join('')}</nav>
      <section class="v7-panel"><div class="v7-panel-in">${srcPanel(tab)}</div></section>
    </div>`;
    const q = main.querySelector('#v7SrcQ'); if (q && srcView.q) { q.value = srcView.q; filterSources(); }
  }
  const srcView = { tab: 'routes', q: '' };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  const extA = (u, label) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" data-keep-link="1">${esc(label || host(u))}</a>`;
  function srcPanel(tab) {
    const D = srcData;
    const roleName = { primary: L('一手来源', 'Primary'), highlights: L('仅用于看点', 'Highlights only'), supplementary: L('背景参考', 'Background') };
    if (tab === 'routes' || tab === 'verify') {
      const list = tab === 'verify' ? D.routes.filter(r => r.verify.length) : D.routes;
      const intro = tab === 'verify'
        ? `<p class="v7-src-intro">${L('下面这些字段还没有对照官方页面核实。页面里照常展示内容，但不再贴「待核实」标签；出发前请点开对应来源再确认一遍。', 'These fields have not been checked against an official page yet. The pages still show them, without a “to verify” tag. Open the source and check before you go.')}</p>`
        : `<p class="v7-src-intro">${L('按线路列出：官方来源（含用途）、待核实字段、照片署名。', 'By route: official sources (and what they were used for), fields to verify, photo credit.')}</p>`;
      return `${intro}<div class="v7-src-search"><input class="v7-input" id="v7SrcQ" type="search" placeholder="${esc(L('搜线路、地区或来源网站…', 'Search a route, region or source site…'))}" aria-label="${esc(L('搜索来源', 'Search sources'))}"><span class="v7-mono" id="v7SrcN" style="color:var(--v7-muted)">${list.length}</span></div>
        <div class="v7-src-list">${list.map(r => `<details class="v7-src-item" data-q="${esc((r.name.join(' ') + ' ' + (r.region || []).join(' ') + ' ' + r.sources.map(s => s.label.join(' ') + ' ' + host(s.url)).join(' ')).toLowerCase())}" ${tab === 'verify' ? 'open' : ''}>
          <summary><span class="v7-tag">${esc(pick(r.mode))}</span><strong>${esc(pick(r.name))} <span class="v7-mono v7-src-region">${esc(pick(r.region || ''))}</span></strong><em>${r.sources.length} ${L('个来源', 'sources')}${r.verify.length ? ' · ' + r.verify.length + ' ' + L('项待核', 'to verify') : ''}</em></summary>
          <div class="v7-src-body">
            ${tab === 'routes' ? `<div><h4>${L('官方来源', 'Official sources')}</h4><ul>${r.sources.map(s => `<li>${extA(s.url, pick(s.label))}<small>${esc(roleName[s.role] || roleName.primary)} · ${esc(host(s.url))}${r.checkedAt ? ' · ' + L('核对于', 'checked') + ' ' + esc(r.checkedAt) : ''}</small></li>`).join('') || `<li>—</li>`}</ul></div>` : ''}
            <div><h4>${L('待核实字段', 'Fields to verify')}</h4>${r.verify.length ? r.verify.map(v => `<span class="v7-verify-chip">${esc(pick(v.label))}</span>`).join('') : `<p class="v7-src-muted">${L('已全部对照官方来源', 'All checked against official sources')}</p>`}${tab === 'verify' && r.sources[0] ? `<p class="v7-src-small">${L('核对入口：', 'Check at: ')}${extA(r.sources[0].url, pick(r.sources[0].label))}</p>` : ''}</div>
            ${tab === 'routes' ? `<div><h4>${L('照片', 'Photo')}</h4>${r.photo ? `<ul><li>${r.photo.source ? extA(r.photo.source, r.photo.author) : esc(r.photo.author)}<small>${r.photo.licenseUrl ? extA(r.photo.licenseUrl, r.photo.license) : esc(r.photo.license)} · ${esc(pick(r.photo.place || ''))}</small></li></ul>` : `<p class="v7-src-muted">${L('示意图，无实景照片', 'Illustration, no photo')}</p>`}</div>` : ''}
          </div></details>`).join('')}</div>`;
    }
    if (tab === 'templates') {
      return `<p class="v7-src-intro">${L('首页的行程模板参考了 newzealand.com 的公开行程（只借思路，文字自写），车程用 OSRM 估算。', 'The itineraries on the home page borrow ideas from newzealand.com (our own words) and estimate drive times with OSRM.')}</p><div class="v7-src-grid">${D.templates.map(t => `<div class="v7-src-card"><small>${esc(t.id)}</small><strong>${esc(pick(t.name))}</strong>${t.sources.filter(s => s.kind === 'tnz').map(s => `${extA(s.url, 'newzealand.com')}<small>${L('访问于', 'read')} ${esc(s.date)}</small>`).join('')}${t.sources.some(s => s.kind === 'osrm') ? `<small>OSRM · ${t.sources.filter(s => s.kind === 'osrm').length} ${L('段车程估算', 'drive estimates')}</small>` : ''}${t.toVerify.length ? `<div>${t.toVerify.map(v => `<span class="v7-verify-chip">D${v.day} ${esc(String(v.to || '').split('（')[0])}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
    }
    if (tab === 'photos') {
      const rows = D.routes.filter(r => r.photo).map(r => ({ where: r.name, ...r.photo })).concat(D.bandPhotos);
      return `<p class="v7-src-intro">${L('照片按原许可使用，署名统一放在这里。', 'Photos are used under their own licences; credits are collected here.')}</p><div class="v7-src-grid">${rows.map(p => `<div class="v7-src-card"><small>${esc(pick(p.where))}</small><strong>${p.source ? extA(p.source, p.author) : esc(p.author)}</strong><small>${p.licenseUrl ? extA(p.licenseUrl, p.license) : esc(p.license)}${p.place ? ' · ' + esc(pick(p.place)) : ''}</small></div>`).join('')}</div>`;
    }
    return `<p class="v7-src-intro">${L('站点自己的许可，以及引用的数据。', 'Our own licence and the data we reuse.')}</p><div class="v7-src-grid">${D.licences.map(l => `<div class="v7-src-card"><strong>${esc(pick(l.label))}</strong><span>${esc(pick(l.text))}</span>${l.url ? extA(l.url) : ''}</div>`).join('')}</div>
      <h3 class="v7-src-h3">${L('排行程用到的路况与交通来源', 'Road and transport sources used by the planner')}</h3><div class="v7-src-grid">${D.planner.map(s => `<div class="v7-src-card"><strong>${esc(s.label)}</strong>${extA(s.url)}</div>`).join('')}</div>
      <h3 class="v7-src-h3">${L('预算参考（预算功能暂时下线，来源先存档）', 'Budget references (the budget tool is offline for now; kept on file)')}</h3><div class="v7-src-grid">${D.budget.map(s => `<div class="v7-src-card"><span>${esc(pick(s.label))}</span>${extA(s.url)}<small>${esc(s.date)}</small></div>`).join('')}</div>`;
  }
  function filterSources() {
    const q = d.getElementById('v7SrcQ'); if (!q) return;
    const v = q.value.trim().toLowerCase(); srcView.q = q.value;
    let n = 0;
    d.querySelectorAll('.v7-src-item').forEach(x => { const hit = !v || x.dataset.q.includes(v); x.hidden = !hit; if (hit) n++; });
    const c = d.getElementById('v7SrcN'); if (c) c.textContent = n;
  }
  function sourcesMarkdown() {
    const D = srcData; const lines = [];
    lines.push(`# ${L('绿石之地 · 资料来源', 'Pounamu Atlas · Sources')}`, '', `${L('生成日期', 'Built')}: ${D.builtAt}`, '');
    lines.push(`## ${L('线路来源', 'Route sources')}`, '');
    D.routes.forEach(r => {
      lines.push(`### ${pick(r.name)} (${pick(r.mode)})`);
      r.sources.forEach(s => lines.push(`- ${pick(s.label)}: ${s.url}`));
      if (r.verify.length) lines.push(`- ${L('待核实', 'To verify')}: ${r.verify.map(v => pick(v.label)).join(L('、', ', '))}`);
      if (r.photo) lines.push(`- ${L('照片', 'Photo')}: ${r.photo.author}, ${r.photo.license}${r.photo.source ? ', ' + r.photo.source : ''}`);
      lines.push('');
    });
    lines.push(`## ${L('行程模板', 'Itineraries')}`, '');
    D.templates.forEach(t => { lines.push(`- ${t.id} ${pick(t.name)}: ${t.sources.filter(s => s.kind === 'tnz').map(s => s.url).join(' ') || '—'}`); });
    lines.push('', `## ${L('数据与许可', 'Data & licences')}`, '');
    D.licences.forEach(l => lines.push(`- ${pick(l.label)}: ${pick(l.text)}${l.url ? ' ' + l.url : ''}`));
    D.planner.forEach(s => lines.push(`- ${s.label}: ${s.url}`));
    return lines.join('\n');
  }
  function bindSources() {
    if (page !== 'sources') return;
    const main = d.querySelector('main');
    main.addEventListener('click', e => {
      const t = e.target.closest('[data-stab]'); if (t) { srcView.tab = t.dataset.stab; srcView.q = ''; history.replaceState(null, '', '#' + srcView.tab); renderSources(); return; }
      if (e.target.closest('[data-src-print]')) { d.querySelectorAll('.v7-src-item').forEach(x => { x.open = true; }); window.print(); return; }
      if (e.target.closest('[data-src-md]') && srcData) {
        const blob = new Blob([sourcesMarkdown()], { type: 'text/markdown;charset=utf-8' });
        const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pounamu-atlas-sources.md'; body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }
    });
    main.addEventListener('input', e => { if (e.target.id === 'v7SrcQ') filterSources(); });
    const h = (location.hash || '').slice(1); if (['routes', 'verify', 'templates', 'photos', 'licence'].includes(h)) srcView.tab = h;
  }

  /* ================================================================ boot */
  let sweepT = 0;
  function pass() {
    ensureNav(); ensureFooter(); sweep(); decorate(); routeMap(); guideMap(); scanDolly(); syncAddButtons();
    html.dataset.v7Idle = '1'; // tests wait for this: the page has been swept since its last change
  }
  function relang() { pass(); if (page === 'routes') initDeck(); renderNotebook(); if (page === 'sources') renderSources(); }
  function boot() {
    ground();
    bindNotebook(); bindSources();
    pass();
    initDeck();
    renderNotebook();
    renderSources();
    frame();
    const main = d.querySelector('main');
    if (main) new MutationObserver(muts => {
      if (muts.every(m => [...m.addedNodes].every(n => n.nodeType !== 1 || (n.closest && n.closest('.v7-deck, .v7-nb, .v7-sources-page, .v7-gmap-host')) || (n.classList && (n.classList.contains('v7-add') || n.classList.contains('v7-gmap-host')))))) return;
      html.dataset.v7Idle = '0';
      clearTimeout(sweepT); sweepT = setTimeout(pass, 60);
    }).observe(main, { childList: true, subtree: true });
    const lang = d.getElementById('language');
    if (lang) lang.addEventListener('click', () => setTimeout(relang, 40));
    window.addEventListener('pageshow', e => { if (e.persisted) { syncAddButtons(); renderNotebook(); } });
    window.addEventListener('v7:nb', () => { if (page === 'notebook' && !(d.activeElement && d.activeElement.matches('input, textarea, [contenteditable="true"]'))) renderNotebook(); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
