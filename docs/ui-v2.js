/* Pounamu Atlas — UI v2 interaction layer (2026-11-13).
   Enhances what the page scripts render: it adds no content of its own except navigation (the ⌘K palette) and
   generated decoration (contour art, particles). Everything stops under prefers-reduced-motion or the 动效 toggle. */
(function () {
  'use strict';
  const doc = document, root = doc.documentElement;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('motion-off');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isEn = () => (root.lang || '').toLowerCase().startsWith('en');
  const $$ = (sel, el) => Array.from((el || doc).querySelectorAll(sel));
  const raf = fn => requestAnimationFrame(fn);

  /* ---------- 1. Generated contour art (periodic value noise + marching squares), tileable 900×900 ---------- */
  function contourSvg(seed, stroke) {
    const S = 900, step = 12, n = S / step;
    let s = seed;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const grid = p => Array.from({ length: p }, () => Array.from({ length: p }, rnd));
    const octaves = [[5, grid(5), 1], [10, grid(10), .45], [20, grid(20), .2]];
    const smooth = t => t * t * (3 - 2 * t);
    function noise(x, y) {
      let v = 0;
      for (const [p, g, a] of octaves) {
        const fx = x / S * p, fy = y / S * p, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
        const at = (i, j) => g[((j % p) + p) % p][((i % p) + p) % p];
        const a0 = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, a1 = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        v += (a0 + (a1 - a0) * ty) * a;
      }
      return v / 1.65;
    }
    const val = [];
    for (let j = 0; j <= n; j++) { val[j] = []; for (let i = 0; i <= n; i++) val[j][i] = noise(i * step, j * step); }
    let d = '';
    const levels = 14;
    for (let k = 1; k < levels; k++) {
      const L = k / levels;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = val[j][i], b = val[j][i + 1], c = val[j + 1][i + 1], e = val[j + 1][i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (e > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * step, y = j * step, lerp = (p, q) => (L - p) / (q - p || 1e-6);
        const T = [x + step * lerp(a, b), y], R = [x + step, y + step * lerp(b, c)], B = [x + step * lerp(e, c), y + step], Lf = [x, y + step * lerp(a, e)];
        const seg = { 1: [Lf, B], 2: [B, R], 3: [Lf, R], 4: [T, R], 5: [Lf, T, B, R], 6: [T, B], 7: [Lf, T], 8: [Lf, T], 9: [T, B], 10: [T, R, Lf, B], 11: [T, R], 12: [Lf, R], 13: [B, R], 14: [Lf, B] }[idx];
        for (let q = 0; q < seg.length; q += 2) d += `M${seg[q][0].toFixed(0)} ${seg[q][1].toFixed(0)}L${seg[q + 1][0].toFixed(0)} ${seg[q + 1][1].toFixed(0)}`;
      }
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${S}' height='${S}' viewBox='0 0 ${S} ${S}'><path d='${d}' fill='none' stroke='${stroke}' stroke-width='1' stroke-linecap='round'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function installContours() {
    let light, dark;
    try { light = sessionStorage.getItem('ui2-contour-l'); dark = sessionStorage.getItem('ui2-contour-d'); } catch (e) {}
    if (!light || !dark) {
      light = contourSvg(20261113, 'rgba(198,236,218,0.16)');
      dark = contourSvg(4219, 'rgba(20,53,43,0.13)');
      try { sessionStorage.setItem('ui2-contour-l', light); sessionStorage.setItem('ui2-contour-d', dark); } catch (e) {}
    }
    root.style.setProperty('--ui2-contour-light', light);
    root.style.setProperty('--ui2-contour-dark', dark);
  }

  /* ---------- 2. Particle network on dark bands (pauses off screen) ---------- */
  function particles(host) {
    if (host.querySelector('.ui2-particles')) return;
    const c = doc.createElement('canvas'); c.className = 'ui2-particles'; c.setAttribute('aria-hidden', 'true');
    host.prepend(c);
    const ctx = c.getContext('2d');
    let w = 0, h = 0, pts = [], on = false, mouse = null, dpr = Math.min(2, devicePixelRatio || 1);
    function size() {
      const r = host.getBoundingClientRect(); w = r.width; h = r.height; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(46, w * h / 22000));
      pts = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 }));
    }
    let last = 0;
    function frame(now) {
      if (!on || reduced() || doc.hidden) { on = false; return; }
      if (now - last < 33) { raf(frame); return; }
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, dd = dx * dx + dy * dy;
          if (dd < 13000) { ctx.strokeStyle = `rgba(150,220,190,${(1 - dd / 13000) * .22})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        if (mouse) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y, dd = dx * dx + dy * dy;
          if (dd < 30000) { ctx.strokeStyle = `rgba(92,200,160,${(1 - dd / 30000) * .55})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(190,240,215,.55)'; ctx.beginPath(); ctx.arc(a.x, a.y, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      raf(frame);
    }
    size();
    new ResizeObserver(() => size()).observe(host);
    new IntersectionObserver(([e]) => { const want = e.isIntersecting && !reduced(); if (want && !on) { on = true; raf(frame); } else if (!want) on = false; }).observe(host);
    host.addEventListener('pointermove', ev => { const r = host.getBoundingClientRect(); mouse = { x: ev.clientX - r.left, y: ev.clientY - r.top }; });
    host.addEventListener('pointerleave', () => { mouse = null; });
  }

  /* ---------- 3. Hero HUD: live NZ time, latitude span, frame, spotlight and parallax ---------- */
  function hero() {
    const h = doc.querySelector('.cinema-hero');
    if (h && !h.querySelector('.ui2-hud')) {
      const hud = doc.createElement('div'); hud.className = 'ui2-hud'; hud.setAttribute('aria-hidden', 'true');
      const frame = doc.createElement('div'); frame.className = 'ui2-hud-frame'; frame.setAttribute('aria-hidden', 'true');
      const spot = doc.createElement('div'); spot.className = 'ui2-spot'; spot.setAttribute('aria-hidden', 'true');
      h.append(spot, frame, hud);
      const tick = () => {
        let time = '';
        try { time = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' }).format(new Date()); } catch (e) {}
        hud.innerHTML = `${isEn() ? 'AOTEAROA · NEW ZEALAND' : 'AOTEAROA · 新西兰'}<br>S 34°–47° · E 166°–179°<br>${isEn() ? 'LOCAL TIME' : '当地时间'} <b>${time}</b><span class="ui2-caret"></span>`;
      };
      tick(); let clock = 0; const run = () => { if (!clock) clock = setInterval(() => { if (!doc.hidden) tick(); }, 1000); }; addEventListener('pointermove', run, { once: true, passive: true }); addEventListener('scroll', run, { once: true, passive: true }); addEventListener('touchstart', run, { once: true, passive: true });
      lightAndParallax(h, h.querySelector('.cinema-stage img, .cinema-stage picture, .cinema-stage'));
    }
    const jh = doc.querySelector('.journey-hero');
    if (jh && !jh.dataset.ui2) {
      jh.dataset.ui2 = '1';
      const spot = doc.createElement('div'); spot.className = 'ui2-spot'; spot.setAttribute('aria-hidden', 'true'); jh.append(spot);
      lightAndParallax(jh, null);
    }
  }
  function lightAndParallax(host, img) {
    if (!finePointer) return;
    host.addEventListener('pointermove', ev => {
      if (reduced()) return;
      const r = host.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      host.style.setProperty('--ui2-sx', (x * 100).toFixed(1) + '%'); host.style.setProperty('--ui2-sy', (y * 100).toFixed(1) + '%');
      host.style.setProperty('--ui2-hx', ((.5 - x) * 18).toFixed(1) + 'px'); host.style.setProperty('--ui2-hy', ((.5 - y) * 12).toFixed(1) + 'px');
    });
    host.addEventListener('pointerleave', () => { host.style.setProperty('--ui2-hx', '0px'); host.style.setProperty('--ui2-hy', '0px'); });
  }

  /* ---------- 4. Cards: 3D tilt with glare; magnetic primary buttons ---------- */
  function tilt(card) {
    if (!finePointer || card.dataset.ui2Tilt) return;
    card.dataset.ui2Tilt = '1'; card.classList.add('ui2-tilt');
    card.addEventListener('pointermove', ev => {
      if (reduced()) return;
      const r = card.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--ui2-ry', ((x - .5) * 6).toFixed(2) + 'deg');
      card.style.setProperty('--ui2-rx', ((.5 - y) * 5).toFixed(2) + 'deg');
      card.style.setProperty('--ui2-ty', '-4px');
      card.style.setProperty('--ui2-mx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--ui2-my', (y * 100).toFixed(1) + '%');
      card.style.setProperty('--ui2-glare', '1');
    });
    card.addEventListener('pointerleave', () => { for (const k of ['--ui2-ry', '--ui2-rx', '--ui2-ty']) card.style.removeProperty(k); card.style.setProperty('--ui2-glare', '0'); });
  }
  function magnetic(btn) {
    if (!finePointer || btn.dataset.ui2Mag) return;
    btn.dataset.ui2Mag = '1'; btn.classList.add('ui2-magnetic');
    btn.addEventListener('pointermove', ev => {
      if (reduced()) return;
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${((ev.clientX - r.left - r.width / 2) * .18).toFixed(1)}px,${((ev.clientY - r.top - r.height / 2) * .25).toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  }

  /* ---------- 5. Images: blur-up once loaded ---------- */
  function blurUp(img) {
    if (img.dataset.ui2Img || img.closest('.ui2-pal, .nzmap, svg, .journey-hero, .cinema-hero, .photo-band')) return;
    img.dataset.ui2Img = '1';
    const wrap = img.closest('.route-visual, .v4-dest-photo, .p10-day-photo, .walk-thumb');
    const done = () => { img.classList.add('ui2-in'); if (wrap) wrap.classList.add('ui2-loaded-wrap'); };
    if (img.complete && img.naturalWidth) { done(); return; }
    img.classList.add('ui2-img');
    img.addEventListener('load', () => raf(done), { once: true });
    img.addEventListener('error', done, { once: true });
  }

  /* ---------- 6. Facts: verified pill and tabular numbers (counts are never rewritten) ---------- */
  function facts() {
    for (const cell of $$('.journey-facts > div')) {
      if (cell.dataset.ui2) continue; cell.dataset.ui2 = '1';
      for (const node of Array.from(cell.childNodes)) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const pill = doc.createElement('span'); pill.className = 'ui2-verified'; pill.innerHTML = '<i aria-hidden="true"></i>';
        pill.append(doc.createTextNode(node.textContent.trim())); node.replaceWith(pill);
      }
    }
    for (const el of $$('.route-quick-facts, .journey-facts strong')) {
      if (el.dataset.ui2Num) continue; el.dataset.ui2Num = '1';
      const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const t of nodes) {
        if (!/\d/.test(t.textContent) || t.parentElement.closest('a, .ui2-num')) continue;
        const span = doc.createElement('span');
        span.innerHTML = t.textContent.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])).replace(/(\d+(?:[.,–-]\d+)?)/g, '<data class="ui2-num">$1</data>');
        t.replaceWith(...span.childNodes);
      }
    }
  }

  /* ---------- 7. Maps: lines draw on in view; crosshair and nearest-place readout on the home map ---------- */
  const drawIO = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { $$('.ui2-draw', e.target).forEach((p, i) => setTimeout(() => p.classList.add('ui2-drawn'), i * 120)); drawIO.unobserve(e.target); }
  }, { threshold: .25 }) : null;
  function drawLines() {
    const paths = $$('.map-line, #p10-trip-map path[fill="none"], #p10-trip-map polyline').filter(p => !p.dataset.ui2Draw);
    const svgs = new Set();
    for (const p of paths) {
      p.dataset.ui2Draw = '1';
      if (reduced() || !p.getTotalLength) continue;
      let len = 0; try { len = p.getTotalLength(); } catch (e) {}
      if (!len) continue;
      p.style.setProperty('--ui2-len', Math.ceil(len)); p.classList.add('ui2-draw');
      const svg = p.ownerSVGElement; if (svg) svgs.add(svg);
    }
    for (const svg of svgs) { if (drawIO) drawIO.observe(svg); else $$('.ui2-draw', svg).forEach(p => p.classList.add('ui2-drawn')); }
  }
  function mapReadout() {
    const svg = doc.querySelector('svg .nzmap-point') && doc.querySelector('svg .nzmap-point').ownerSVGElement;
    if (!svg || !finePointer) return;
    const host = svg.parentElement; if (host.dataset.ui2Map) return;
    host.dataset.ui2Map = '1'; host.classList.add('ui2-maphost');
    const cross = doc.createElement('div'); cross.className = 'ui2-cross'; cross.setAttribute('aria-hidden', 'true'); cross.innerHTML = '<i class="x"></i><i class="y"></i>';
    const out = doc.createElement('div'); out.className = 'ui2-readout'; out.setAttribute('aria-hidden', 'true');
    out.textContent = isEn() ? 'Move over the map' : '把鼠标移到地图上';
    host.append(cross, out);
    host.addEventListener('pointermove', ev => {
      const r = host.getBoundingClientRect();
      host.style.setProperty('--ui2-cx', (ev.clientX - r.left) + 'px'); host.style.setProperty('--ui2-cy', (ev.clientY - r.top) + 'px');
      let best = null, bd = Infinity;
      for (const pt of $$('.nzmap-point', svg)) {
        const dot = pt.querySelector('.nzmap-dot') || pt; const b = dot.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - ev.clientX, b.top + b.height / 2 - ev.clientY);
        if (d < bd) { bd = d; best = pt; }
      }
      if (!best) return;
      const en = best.querySelector('[data-map-label-en]'), zh = best.querySelector('[data-map-label-zh]');
      const name = isEn() ? (en && en.textContent) : `${zh ? zh.textContent : ''} ${en ? en.textContent : ''}`;
      out.innerHTML = `${isEn() ? 'NEAREST' : '最近'} · <b>${(name || '').trim()}</b> · ${Math.round(bd)} px`;
      $$('.nzmap-point.ui2-near', svg).forEach(p => p !== best && p.classList.remove('ui2-near')); best.classList.add('ui2-near');
    });
  }

  /* ---------- 8. Command palette (⌘K / Ctrl+K / "/") across pages, routes and towns ---------- */
  let palette = null, items = null, sel = 0, shown = [];
  const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
  async function loadItems() {
    if (items) return items;
    const en = isEn(), lang = en ? 'en' : 'zh';
    const list = [
      { k: en ? 'Page' : '页面', t: en ? 'Home' : '首页', h: `index.html?lang=${lang}` },
      { k: en ? 'Page' : '页面', t: en ? 'All routes' : '全部线路', h: `routes.html?lang=${lang}` },
      { k: en ? 'Page' : '页面', t: en ? 'Make a plan' : '排行程', h: `plan.html?lang=${lang}` },
      { k: en ? 'Page' : '页面', t: en ? 'Before you go' : '出发准备', h: `prepare.html?lang=${lang}` },
      { k: en ? 'Page' : '页面', t: en ? 'Ski areas and winter driving' : '滑雪场与冬季山路', h: `prepare.html?lang=${lang}#ski` },
    ];
    try {
      if (typeof routes !== 'undefined' && Array.isArray(routes)) for (const r of routes) list.push({ k: en ? 'Route' : '线路', t: en ? r.name : (r.zh || r.name), s: en ? r.zh : r.name, h: `route.html?id=${encodeURIComponent(r.id)}&lang=${lang}` });
    } catch (e) {}
    try {
      const cat = await fetch('data/v4-catalog.json').then(r => r.ok ? r.json() : null);
      for (const p of (cat && cat.places) || []) {
        if (p.type === 'town') list.push({ k: en ? 'Place' : '目的地', t: en ? p.name_en : p.name_zh, s: en ? p.name_zh : p.name_en, h: `destination.html?id=${encodeURIComponent(p.place_id)}&lang=${lang}` });
        else if (/hot pool|温泉|hot spring/i.test(`${p.name_en} ${p.name_zh}`)) list.push({ k: en ? 'Activity' : '活动', t: en ? p.name_en : p.name_zh, s: 'hot pools 温泉', h: `destination.html?id=${encodeURIComponent(p.place_id)}&lang=${lang}#p-${encodeURIComponent(p.place_id)}` });
      }
    } catch (e) {}
    try {
      const ski = await fetch('data/ski-fields.json').then(r => r.ok ? r.json() : null);
      for (const f of (ski && ski.fields) || []) list.push({ k: en ? 'Ski' : '滑雪', t: en ? f.name_en : f.name_zh, s: (f.aliases || []).join(' '), aliases: f.aliases || [], h: `prepare.html?lang=${lang}#ski-${encodeURIComponent(f.id)}` });
    } catch (e) {}
    list.push(
      { k: en ? 'Page' : '页面', t: en ? 'Safety and 111' : '安全与 111', s: 'safety emergency 紧急 安全', h: `prepare.html?lang=${lang}#safety` },
      { k: en ? 'Page' : '页面', t: en ? 'Keep left, overseas licence' : '靠左行驶与驾照翻译', s: 'driving licence keep left 驾照翻译 左行', h: `prepare.html?lang=${lang}#driving` },
      { k: en ? 'Page' : '页面', t: en ? 'Campervan' : '房车', s: 'campervan 房车 freedom camping', h: `prepare.html?lang=${lang}#campervan` },
      { k: en ? 'Route' : '线路', t: en ? 'Great Walks' : '大步道', s: 'great walks milford 米尔福德', h: `route.html?id=milford-track&lang=${lang}` },
      { k: en ? 'Activity' : '活动', t: en ? 'Short, easy walks' : '少走路的短途', s: '少走路 easy walk low walking', h: `routes.html?mode=walk&lang=${lang}` },
      { k: en ? 'Sport' : '运动', t: en ? 'Tennis, golf and basketball' : '网球、高尔夫、篮球', s: 'tennis golf basketball 网球 高尔夫 篮球', h: `destination.html?id=ni-akl&lang=${lang}#sports` }
    );
    items = list.map(x => Object.assign(x, { f: fold(`${x.t} ${x.s || ''} ${(x.aliases || []).join(' ')}`) }));
    return items;
  }
  function score(item, q) {
    if (!q) return 1;
    if (item.f === q || item.aliases && item.aliases.some(a => fold(a) === q)) return 240;
    if (item.f.startsWith(q)) return 200;
    const i = item.f.indexOf(q); if (i >= 0) return 140 - Math.min(i, 30);
    let pos = 0, gaps = 0;
    for (const ch of q) { const at = item.f.indexOf(ch, pos); if (at < 0) return 0; gaps += at - pos; pos = at + 1; }
    if (gaps > q.length * 2) return 0;
    return Math.max(1, 30 - gaps);
  }
  function render(q) {
    const f = fold(q);
    shown = (items || []).map(x => [score(x, f), x]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, x]) => x);
    sel = 0;
    const ul = palette.querySelector('ul');
    ul.innerHTML = shown.length ? shown.map((x, i) => `<li role="option" id="ui2-opt-${i}" aria-selected="${i === sel}"><a href="${x.h}"><small>${x.k}</small><span>${x.t.replace(/[&<>]/g, '')}</span>${x.s ? `<em>${String(x.s).replace(/[&<>]/g, '')}</em>` : ''}</a></li>`).join('')
      : `<li><a href="index.html?q=${encodeURIComponent(q)}&lang=${isEn() ? 'en' : 'zh'}#v4-search"><small>${isEn() ? 'Search' : '搜索'}</small><span>${isEn() ? 'Search the site for' : '在站内搜索'} “${q.replace(/[&<>]/g, '')}”</span></a></li>`;
    palette.querySelector('input').setAttribute('aria-activedescendant', shown.length ? 'ui2-opt-0' : '');
  }
  function move(d) {
    const lis = $$('li[role="option"]', palette); if (!lis.length) return;
    lis[sel].setAttribute('aria-selected', 'false'); sel = (sel + d + lis.length) % lis.length; lis[sel].setAttribute('aria-selected', 'true');
    lis[sel].scrollIntoView({ block: 'nearest' }); palette.querySelector('input').setAttribute('aria-activedescendant', lis[sel].id);
  }
  async function openPalette() {
    if (!palette) {
      palette = doc.createElement('div'); palette.className = 'ui2-palette'; palette.setAttribute('role', 'dialog'); palette.setAttribute('aria-modal', 'true');
      palette.setAttribute('aria-label', isEn() ? 'Quick search' : '快速搜索');
      palette.innerHTML = `<div class="ui2-pal"><input type="search" role="combobox" aria-expanded="true" aria-controls="ui2-list" autocomplete="off" placeholder="${isEn() ? 'Search routes, places and pages…' : '搜线路、目的地、页面……'}"><ul id="ui2-list" role="listbox"></ul><footer><span>↑↓ ${isEn() ? 'move' : '选择'}</span><span>↵ ${isEn() ? 'open' : '打开'}</span><span>esc ${isEn() ? 'close' : '关闭'}</span></footer></div>`;
      doc.body.append(palette);
      const input = palette.querySelector('input');
      input.addEventListener('input', () => render(input.value));
      input.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
        else if (ev.key === 'Enter') { ev.preventDefault(); const a = palette.querySelector('li[aria-selected="true"] a') || palette.querySelector('li a'); if (a) location.href = a.href; }
        else if (ev.key === 'Escape') closePalette();
      });
      palette.addEventListener('click', ev => { if (ev.target === palette) closePalette(); });
    }
    palette.classList.add('on'); palette.dataset.prev = '';
    const input = palette.querySelector('input'); input.value = ''; setTimeout(() => input.focus(), 20);
    await loadItems(); render(input.value);
  }
  function closePalette() { if (palette) palette.classList.remove('on'); const b = doc.querySelector('.ui2-kbtn'); if (b) b.focus(); }
  function paletteButton() {
    const nav = doc.querySelector('.header .nav'); if (!nav || doc.querySelector('.ui2-kbtn')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'ui2-kbtn';
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    b.innerHTML = `${isEn() ? 'Search' : '搜索'} <kbd>${mac ? '⌘' : 'Ctrl'} K</kbd>`;
    b.setAttribute('aria-label', isEn() ? 'Quick search' : '快速搜索');
    b.addEventListener('click', openPalette);
    // The phone rule positions this button with position:fixed. A backdrop-filter
    // on .header (the glass bar) would become its containing block and pin it over
    // the language control, so on that layout the button hangs off body instead.
    const phone = matchMedia('(max-width: 760px)');
    const place = () => {
      if (phone.matches) { if (b.parentElement !== doc.body) doc.body.append(b); }
      else if (b.previousElementSibling !== nav) nav.after(b);
    };
    place();
    if (phone.addEventListener) phone.addEventListener('change', place);
    else phone.addListener(place);
    addEventListener('resize', place);
  }
  doc.addEventListener('keydown', ev => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '') || (ev.target && ev.target.isContentEditable);
    if ((ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); openPalette(); }
    else if (ev.key === '/' && !typing) { ev.preventDefault(); openPalette(); }
    else if (ev.key === 'Escape' && palette && palette.classList.contains('on')) closePalette();
  });

  /* ---------- 9. Scroll state and progress ---------- */
  function scroll() {
    const bar = doc.createElement('div'); bar.className = 'ui2-progress'; bar.setAttribute('aria-hidden', 'true'); doc.body.append(bar);
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = root.scrollHeight - innerHeight, y = scrollY;
      bar.style.setProperty('--ui2-p', max > 0 ? (y / max).toFixed(4) : 0);
      doc.body.classList.toggle('ui2-scrolled', y > 90);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    update();
  }

  /* ---------- 10. English titles drop the Chinese brand ---------- */
  function titles() {
    const fix = () => { if (isEn() && doc.title.includes('绿石之地 · ')) doc.title = doc.title.replace('绿石之地 · ', ''); };
    fix();
    const t = doc.querySelector('title'); if (t) new MutationObserver(fix).observe(t, { childList: true, characterData: true, subtree: true });
    new MutationObserver(fix).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }

  /* ---------- run, and again whenever the page scripts render more ---------- */
  function enhance() {
    $$('main img, .plan-result img').forEach(blurUp);
    $$('.route-card, .v4-results .v4-card, .walk-recommendation').forEach(tilt);
    $$('.cinema-copy .button, .v4-primary, .planner-button, .p10-step-nav .button').forEach(magnetic);
    if (woke) $$('.home-ways, .page-planner').forEach(particles);
    facts(); drawLines(); mapReadout(); hero();
  }
  let woke = false;
  function wake() {
    if (woke) return; woke = true;
    for (const ev of ['pointermove', 'scroll', 'touchstart', 'keydown']) removeEventListener(ev, wake);
    $$('.home-ways, .page-planner').forEach(particles);
  }
  function start() {
    for (const ev of ['pointermove', 'scroll', 'touchstart', 'keydown']) addEventListener(ev, wake, { passive: true });
    scroll(); titles(); paletteButton(); enhance();
    // The contour art is decoration: draw it when the browser is idle, and only on pages that use it.
    if (doc.querySelector('.home-ways, .page-planner, .page-intro, .v4-guide-top, .ui2-contour')) (window.requestIdleCallback || (fn => setTimeout(fn, 400)))(installContours, { timeout: 2500 });
    let timer = 0;
    const own = n => { const el = n.nodeType === 1 ? n : n.parentElement; return !!(el && el.closest && el.closest('.ui2-hud, .ui2-readout, .ui2-palette, .ui2-particles, .ui2-progress')); };
    new MutationObserver(muts => { if (muts.every(m => own(m.target))) return; clearTimeout(timer); timer = setTimeout(enhance, 120); }).observe(doc.body, { childList: true, subtree: true });
  }
  function skipFocus() {
    const main = doc.querySelector('main');
    if (main) main.tabIndex = -1;
    doc.querySelectorAll('a.skip-link').forEach(a => {
      if (a.dataset.skipBound) return;
      a.dataset.skipBound = '1';
      a.addEventListener('click', ev => {
        const target = doc.querySelector(a.getAttribute('href'));
        if (!target) return;
        ev.preventDefault();
        target.tabIndex = -1;
        target.focus();
      });
    });
  }
  new MutationObserver(() => { items = null; if (palette && palette.classList.contains('on')) { const q = palette.querySelector('input').value; loadItems().then(() => render(q)); } }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => { skipFocus(); start(); }); else { skipFocus(); start(); }
})();
