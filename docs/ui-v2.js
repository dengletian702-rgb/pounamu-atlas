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
  function contourState(seed) {
    const S = 900, step = 12, n = S / step;
    let s = seed;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const grid = p => Array.from({ length: p }, () => Array.from({ length: p }, rnd));
    const octaves = [[5, grid(5), 1], [10, grid(10), .45], [20, grid(20), .2]];
    const smooth = t => t * t * (3 - 2 * t);
    const noise = (x, y) => {
      let v = 0;
      for (const [p, g, a] of octaves) {
        const fx = x / S * p, fy = y / S * p, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
        const at = (i, j) => g[((j % p) + p) % p][((i % p) + p) % p];
        const a0 = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, a1 = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        v += (a0 + (a1 - a0) * ty) * a;
      }
      return v / 1.65;
    };
    return { S, step, n, val: [], noise, levels: 14, k: 1, j: 0, d: '', gridRow: 0 };
  }
  function contourSlice(st, rows) {
    const { step, n, val, levels } = st;
    let left = rows;
    while (st.gridRow <= n && left > 0) {
      const j = st.gridRow;
      val[j] = [];
      for (let i = 0; i <= n; i++) val[j][i] = st.noise(i * step, j * step);
      st.gridRow += 1;
      left -= 1;
    }
    if (st.gridRow <= n) return false;
    while (st.k < levels && left > 0) {
      const L = st.k / levels, j = st.j;
      for (let i = 0; i < n; i++) {
        const a = val[j][i], b = val[j][i + 1], c = val[j + 1][i + 1], e = val[j + 1][i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (e > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * step, y = j * step, lerp = (p, q) => (L - p) / (q - p || 1e-6);
        const T = [x + step * lerp(a, b), y], R = [x + step, y + step * lerp(b, c)], B = [x + step * lerp(e, c), y + step], Lf = [x, y + step * lerp(a, e)];
        const seg = { 1: [Lf, B], 2: [B, R], 3: [Lf, R], 4: [T, R], 5: [Lf, T, B, R], 6: [T, B], 7: [Lf, T], 8: [Lf, T], 9: [T, B], 10: [T, R, Lf, B], 11: [T, R], 12: [Lf, R], 13: [B, R], 14: [Lf, B] }[idx];
        for (let q = 0; q < seg.length; q += 2) st.d += `M${seg[q][0].toFixed(0)} ${seg[q][1].toFixed(0)}L${seg[q + 1][0].toFixed(0)} ${seg[q + 1][1].toFixed(0)}`;
      }
      st.j += 1;
      left -= 1;
      if (st.j >= n) { st.j = 0; st.k += 1; }
    }
    return st.k >= levels;
  }
  function contourUrl(st, stroke) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${st.S}' height='${st.S}' viewBox='0 0 ${st.S} ${st.S}'><path d='${st.d}' fill='none' stroke='${stroke}' stroke-width='1' stroke-linecap='round'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function installContours() {
    let light, dark;
    try { light = sessionStorage.getItem('ui2-contour-l'); dark = sessionStorage.getItem('ui2-contour-d'); } catch (e) {}
    if (light && dark) {
      root.style.setProperty('--ui2-contour-light', light);
      root.style.setProperty('--ui2-contour-dark', dark);
      return;
    }
    const jobs = [
      { seed: 20261113, stroke: 'rgba(198,236,218,0.16)', prop: '--ui2-contour-light', store: 'ui2-contour-l' },
      { seed: 4219, stroke: 'rgba(20,53,43,0.13)', prop: '--ui2-contour-dark', store: 'ui2-contour-d' }
    ];
    const later = fn => (window.requestIdleCallback || (cb => setTimeout(cb, 16)))(fn, { timeout: 400 });
    const step = () => {
      const job = jobs[0];
      if (!job) return;
      if (!job.state) job.state = contourState(job.seed);
      if (!contourSlice(job.state, 6)) { later(step); return; }
      const url = contourUrl(job.state, job.stroke);
      root.style.setProperty(job.prop, url);
      try { sessionStorage.setItem(job.store, url); } catch (e) {}
      jobs.shift();
      if (jobs.length) later(step);
    };
    later(step);
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
        if (p.type === 'town') list.push({ k: en ? 'Place' : '目的地', t: en ? p.name_en : p.name_zh, s: en ? p.name_zh : p.name_en, sub: en ? p.name_zh : p.name_en, h: `destination.html?id=${encodeURIComponent(p.place_id)}&lang=${lang}` });
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
      { k: en ? 'Route' : '线路', t: en ? 'Milford Track' : '米尔福德步道', s: 'great walk great walks 大步道', h: `route.html?id=milford-track&lang=${lang}` },
      { k: en ? 'Route' : '线路', t: en ? 'Routeburn Track' : '路特本步道', s: 'great walk great walks 大步道', h: `route.html?id=routeburn-track&lang=${lang}` },
      { k: en ? 'Route' : '线路', t: en ? 'Kepler Track' : '开普勒步道', s: 'great walk great walks 大步道', h: `route.html?id=kepler-track&lang=${lang}` },
      { k: en ? 'Route' : '线路', t: en ? 'Abel Tasman Coast Track' : '亚伯塔斯曼海岸步道', s: 'great walk great walks 大步道', h: `route.html?id=abel-tasman&lang=${lang}` },
      { k: en ? 'Route' : '线路', t: en ? 'Whanganui Journey' : '旺格努伊河之旅', s: 'great walk great walks 大步道', h: `route.html?id=whanganui-journey&lang=${lang}` },
      { k: en ? 'Activity' : '活动', t: en ? 'Short, easy walks' : '少走路的短途', s: '少走路 easy walk low walking', h: `routes.html?mode=walk&lang=${lang}` },
      ...(typeof pounamuFlag === 'function' && !pounamuFlag('sports') ? [] : [['auckland','Auckland','奥克兰'],['wellington','Wellington','惠灵顿'],['christchurch','Christchurch','基督城'],['queenstown','Queenstown','皇后镇'],['dunedin','Dunedin','但尼丁'],['rotorua','Rotorua','罗托鲁瓦'],['taupo','Taupō','陶波'],['nelson','Nelson','纳尔逊'],['hamilton','Hamilton','汉密尔顿'],['tauranga','Tauranga','陶朗加'],['napier','Napier','内皮尔'],['wanaka','Wānaka','瓦纳卡']].map(([id, enName, zhName]) => ({ k: en ? 'Sport' : '运动', t: en ? enName : zhName, s: 'tennis golf basketball 网球 高尔夫 篮球', h: `city.html?id=${id}&lang=${lang}` })))
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
    ul.innerHTML = shown.length ? shown.map((x, i) => `<li role="option" id="ui2-opt-${i}" aria-selected="${i === sel}"><a href="${x.h}"><small>${x.k}</small><span>${x.t.replace(/[&<>]/g, '')}</span>${x.sub ? `<em>${String(x.sub).replace(/[&<>]/g, '')}</em>` : ''}</a></li>`).join('')
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
  function fitSvgText(svg) {
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const vbW = (vb && vb.width) || 0;
    const vbH = (vb && vb.height) || 0;
    let scale = box.width > 0 && vbW ? box.width / vbW : 0;
    if (box.height > 0 && vbH) {
      const byH = box.height / vbH;
      if (byH > 0) scale = scale > 0 ? Math.min(scale, byH) : byH;
    }
    const sample = svg.querySelector('text, circle, path');
    const ctm = sample && sample.getScreenCTM && sample.getScreenCTM();
    if (ctm) {
      const drawn = Math.hypot(ctm.a, ctm.b);
      if (drawn > 0) scale = drawn;
    }
    if (!scale) return;
    if (svg.classList.contains('p10-pick-svg')) {
      if (!svg.classList.contains('is-laid') && box.width > 2 && box.height > 2 && vbH) {
        const sc = Math.min(box.width / vbW, box.height / vbH);
        if (sc > 0) {
          svg.querySelectorAll('text').forEach(node => node.style.setProperty('font-size', (13 / sc).toFixed(2) + 'px', 'important'));
          settleMapLabels(svg, sc);
        }
      }
      return;
    }
    svg.querySelectorAll('text, tspan').forEach(node => {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const ctm = node.getScreenCTM && node.getScreenCTM();
      const sc = ctm ? Math.hypot(ctm.a, ctm.b) : scale;
      if (!(sc > 0)) return;
      if (parseFloat(cs.fontSize) * sc < 12) node.style.setProperty('font-size', (13 / sc).toFixed(2) + 'px', 'important');
    });
    layoutNzMap(svg, scale);
    settleMapLabels(svg, scale);
  }
  function textShown(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }
  function overlaps(a, b) {
    return a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5;
  }
  function shiftText(t, dx, dy) {
    if (!dx && !dy) return;
    const x = (parseFloat(t.getAttribute('x')) || 0) + dx;
    const y = (parseFloat(t.getAttribute('y')) || 0) + dy;
    t.setAttribute('x', x.toFixed(1));
    t.setAttribute('y', y.toFixed(1));
    t.querySelectorAll('tspan').forEach(s => {
      if (s.hasAttribute('x')) s.setAttribute('x', ((parseFloat(s.getAttribute('x')) || 0) + dx).toFixed(1));
    });
  }
  function layoutNzMap(svg, scale) {
    if (!svg.classList.contains('nz-map')) return;
    const narrow = window.matchMedia('(max-width:760px)').matches;
    const en = (doc.documentElement.lang || '').toLowerCase().startsWith('en');
    svg.querySelectorAll('.nzmap-label-zh').forEach(el => {
      if (en || narrow) el.style.setProperty('display', 'none', 'important');
      else {
        el.style.removeProperty('display');
        el.setAttribute('dy', Math.max(18, 18 / scale).toFixed(1));
      }
    });
    const shortName = { 'NORTH ISLAND': ['北岛', 'North Island'], 'SOUTH ISLAND': ['南岛', 'South Island'], 'TASMAN SEA': ['塔斯曼海', 'Tasman Sea'], 'PACIFIC OCEAN': ['太平洋', 'Pacific'], 'RAKIURA / STEWART ISLAND': ['拉奇乌拉', 'Rakiura'] };
    svg.querySelectorAll('.nzmap-island-label, .nzmap-water, .nzmap-label').forEach(el => {
      if (el.hasAttribute('data-i18n')) return;
      if (!el.dataset.bilingual) el.dataset.bilingual = el.innerHTML;
      if (!narrow) { if (el.innerHTML !== el.dataset.bilingual) el.innerHTML = el.dataset.bilingual; return; }
      const hold = doc.createElement('div');
      hold.innerHTML = el.dataset.bilingual;
      const sub = hold.querySelector('tspan');
      const english = hold.childNodes[0] && hold.childNodes[0].nodeType === 3 ? hold.childNodes[0].textContent.trim() : (hold.querySelector('[data-map-label-en]') || {}).textContent || '';
      const pair = shortName[english];
      if (!pair) return;
      el.textContent = en ? pair[1] : pair[0];
    });
    svg.querySelectorAll('text').forEach(t => {
      if (!t.dataset.ox) {
        t.dataset.ox = t.getAttribute('x') || '0';
        t.dataset.oy = t.getAttribute('y') || '0';
        t.querySelectorAll('tspan').forEach(s => { if (s.hasAttribute('x')) s.dataset.ox = s.getAttribute('x'); });
      }
      t.setAttribute('x', t.dataset.ox);
      t.setAttribute('y', t.dataset.oy);
      t.querySelectorAll('tspan').forEach(s => { if (s.dataset.ox) s.setAttribute('x', s.dataset.ox); });
    });
    const frame = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].filter(textShown);
    const clamp = t => {
      const r = t.getBoundingClientRect();
      let dxs = 0, dys = 0;
      if (r.left < frame.left + 1) dxs = frame.left + 1 - r.left;
      else if (r.right > frame.right - 1) dxs = frame.right - 1 - r.right;
      if (r.top < frame.top + 1) dys = frame.top + 1 - r.top;
      else if (r.bottom > frame.bottom - 1) dys = frame.bottom - 1 - r.bottom;
      if (dxs || dys) shiftText(t, dxs / scale, dys / scale);
    };
    texts.forEach(clamp);
    for (let pass = 0; pass < 24; pass++) {
      let moved = false;
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i].getBoundingClientRect();
          const b = texts[j].getBoundingClientRect();
          if (!overlaps(a, b)) continue;
          const options = [[0, a.bottom - b.top + 4], [0, a.top - b.bottom - 4], [a.right - b.left + 4, 0], [a.left - b.right - 4, 0]];
          for (const [dxs, dys] of options) {
            shiftText(texts[j], dxs / scale, dys / scale);
            const r = texts[j].getBoundingClientRect();
            const inside = r.left >= frame.left - 0.5 && r.right <= frame.right + 0.5 && r.top >= frame.top - 0.5 && r.bottom <= frame.bottom + 0.5;
            if (inside && !overlaps(texts[i].getBoundingClientRect(), r)) { moved = true; break; }
            shiftText(texts[j], -dxs / scale, -dys / scale);
          }
        }
      }
      if (!moved) break;
    }
  }
  function spreadDayNumbers(svg, scale) {
    if (!svg.classList.contains('gcoast')) return;
    const texts = [...svg.querySelectorAll('.gday-stop text')];
    texts.forEach(t => {
      if (!t.dataset.ox) { t.dataset.ox = t.getAttribute('x'); t.dataset.oy = t.getAttribute('y'); }
      t.setAttribute('x', t.dataset.ox);
      t.setAttribute('y', t.dataset.oy);
    });
    const live = texts.filter(textShown);
    const frame = svg.getBoundingClientRect();
    for (let pass = 0; pass < 20; pass++) {
      let moved = false;
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i].getBoundingClientRect();
          const b = live[j].getBoundingClientRect();
          if (!overlaps(a, b)) continue;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.bottom);
          const side = (j % 2 === 0 ? 1 : -1);
          shiftText(live[j], side * (ox + 4) / scale, (oy + 4) / scale * (j % 3 === 0 ? -1 : 1) * 0.35);
          moved = true;
        }
      }
      for (const t of live) {
        const r = t.getBoundingClientRect();
        let dxs = 0, dys = 0;
        if (r.left < frame.left + 1) dxs = frame.left + 1 - r.left;
        else if (r.right > frame.right - 1) dxs = frame.right - 1 - r.right;
        if (r.top < frame.top + 1) dys = frame.top + 1 - r.top;
        else if (r.bottom > frame.bottom - 1) dys = frame.bottom - 1 - r.bottom;
        if (dxs || dys) { shiftText(t, dxs / scale, dys / scale); moved = true; }
      }
      if (!moved) break;
    }
    const ns = 'http://www.w3.org/2000/svg';
    for (const t of live) {
      const g = t.parentNode;
      const circle = g && g.querySelector('circle');
      if (!circle) continue;
      const far = Math.hypot(parseFloat(t.getAttribute('x')) - parseFloat(t.dataset.ox), parseFloat(t.getAttribute('y')) - parseFloat(t.dataset.oy)) > 8;
      let line = g.querySelector('.gday-leader');
      if (!far) { if (line) line.remove(); continue; }
      if (!line) { line = doc.createElementNS(ns, 'line'); line.setAttribute('class', 'gday-leader'); g.insertBefore(line, t); }
      line.setAttribute('stroke', '#163528');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      line.setAttribute('x1', circle.getAttribute('cx'));
      line.setAttribute('y1', circle.getAttribute('cy'));
      line.setAttribute('x2', t.getAttribute('x'));
      line.setAttribute('y2', t.getAttribute('y'));
    }
  }
  function boxGap(a, b) {
    const dx = Math.max(b.left - a.right, a.left - b.right, 0);
    const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
    return Math.hypot(dx, dy);
  }
  function labelDot(svg, text) {
    const g = text.parentNode;
    if (text.classList.contains('gday-num') || text.classList.contains('v4-map-name') || text.classList.contains('v4-map-tag') || text.classList.contains('v4-map-num')) {
      const circle = g && g.querySelector && g.querySelector('circle');
      if (circle) return circle;
    }
    const id = text.getAttribute('data-p10-pick-label');
    if (id) {
      const mark = svg.querySelector('[data-p10-pick="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] .p10-pick-mark');
      if (mark) return mark;
    }
    const px = parseFloat(text.getAttribute('data-px'));
    const py = parseFloat(text.getAttribute('data-py'));
    if (!Number.isFinite(px)) return null;
    let best = null, bestD = Infinity;
    svg.querySelectorAll('circle').forEach(circle => {
      if (circle.classList.contains('p10-pick-hit')) return;
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      if (!Number.isFinite(cx)) return;
      const d = Math.hypot(cx - px, cy - py);
      if (d < bestD) { bestD = d; best = circle; }
    });
    return bestD < 3 ? best : null;
  }
  function coversPoint(box, x, y) {
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }
  function pointBoxDist(x, y, box) {
    return Math.hypot(Math.max(box.left - x, x - box.right, 0), Math.max(box.top - y, y - box.bottom, 0));
  }
  function distPointSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function clipLength(x1, y1, x2, y2, rect) {
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - rect.left, rect.right - x1, y1 - rect.top, rect.bottom - y1];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-6) { if (q[i] < 0) return 0; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return 0; if (t > t0) t0 = t; }
      else { if (t < t0) return 0; if (t < t1) t1 = t; }
    }
    if (t1 - t0 <= 0) return 0;
    return Math.hypot(dx, dy) * (t1 - t0);
  }
  const layoutMemo = new WeakMap();
  function settleMapLabels(svg, scale) {
    const coast = svg.classList.contains('gcoast');
    if (!svg || (!svg.classList.contains('v4-schematic') && !svg.classList.contains('p10-pick-svg') && !coast)) return;
    const frame = svg.getBoundingClientRect();
    if (!(frame.width > 2) || !(scale > 0)) return;
    const schematic = svg.classList.contains('v4-schematic') || coast;
    svg.querySelectorAll('.is-unplaced').forEach(node => {
      node.classList.remove('is-unplaced', 'is-off');
      node.style.removeProperty('display');
    });
    const placeable = el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const texts = [...svg.querySelectorAll(coast ? '.gday-num' : (svg.classList.contains('v4-schematic') ? '.v4-map-num, .v4-map-name, .v4-map-tag' : '.p10-pick-label, .p10-pick-tag'))].filter(placeable);
    svg.querySelectorAll('.v4-map-leader, .p10-pick-leader, .gday-leader').forEach(line => line.remove());
    if (!texts.length) { syncPickList(svg); return; }
    const ns = 'http://www.w3.org/2000/svg';
    const inside = r => r.left >= frame.left - 0.5 && r.right <= frame.right + 0.5 && r.top >= frame.top - 0.5 && r.bottom <= frame.bottom + 0.5;
    const makeDirs = steps => {
      const out = [];
      for (let i = 0; i < steps; i++) {
        const ang = -Math.PI / 2 + i * (Math.PI * 2 / steps);
        const dx = Math.cos(ang), dy = Math.sin(ang);
        out.push([dx, dy, Math.abs(dx) < 0.35 ? 'middle' : (dx < 0 ? 'end' : 'start')]);
      }
      return out;
    };
    let dirs = makeDirs(schematic ? 24 : 16);
    let thorough = !schematic;
    let sx = scale, sy = scale;
    const probe = texts[0];
    if (probe) {
      const keepA = probe.getAttribute('text-anchor') || 'start';
      const keepX = probe.getAttribute('x'), keepY = probe.getAttribute('y');
      probe.setAttribute('x', '0');
      probe.setAttribute('y', '0');
      const origin = probe.getBoundingClientRect();
      probe.setAttribute('x', '40');
      probe.setAttribute('y', '40');
      const moved = probe.getBoundingClientRect();
      const dx = (moved.left - origin.left) / 40, dy = (moved.top - origin.top) / 40;
      if (Math.abs(dx) > 0.01) sx = dx;
      if (Math.abs(dy) > 0.01) sy = dy;
      probe.setAttribute('text-anchor', keepA);
      if (keepX != null) probe.setAttribute('x', keepX);
      if (keepY != null) probe.setAttribute('y', keepY);
    }
    const measured = new Map();
    const metrics = (text, anchor) => {
      let by = measured.get(text);
      if (!by) { by = new Map(); measured.set(text, by); }
      if (by.has(anchor)) return by.get(anchor);
      text.setAttribute('text-anchor', anchor);
      text.setAttribute('x', '0');
      text.setAttribute('y', '0');
      const r0 = text.getBoundingClientRect();
      const m = { w: r0.width, h: r0.height, cx: (r0.left + r0.right) / 2, cy: (r0.top + r0.bottom) / 2 };
      by.set(anchor, m);
      return m;
    };
    const quant = n => Math.round(n * 10) / 10;
    const boxAt = (m, userX, userY) => {
      const cx = m.cx + userX * sx, cy = m.cy + userY * sy;
      return { left: cx - m.w / 2, right: cx + m.w / 2, top: cy - m.h / 2, bottom: cy + m.h / 2, width: m.w, height: m.h };
    };
    const memoKey = () => {
      const box = svg.getBoundingClientRect();
      return Math.round(box.width) + 'x' + Math.round(box.height) + ':' + texts.map(t => (t.getAttribute('data-p10-pick-label') || t.textContent || '') + ':' + (t.classList.contains('p10-pick-tag') ? 't' : 'n')).join('|');
    };
    if (!schematic) {
      const key = memoKey();
      const saved = layoutMemo.get(svg);
      if (saved && saved.key === key) {
        saved.items.forEach(item => {
          item.text.setAttribute('text-anchor', item.anchor);
          item.text.setAttribute('x', item.x);
          item.text.setAttribute('y', item.y);
          item.text.classList.toggle('is-off', item.off);
          item.text.classList.toggle('is-unplaced', item.off);
          if (item.display) item.text.style.setProperty('display', item.display, 'important');
          else item.text.style.removeProperty('display');
        });
        const host = svg.querySelector('.p10-pick-labels') || svg;
        saved.leaders.forEach(L => {
          const line = doc.createElementNS(ns, 'line');
          line.setAttribute('class', 'p10-pick-leader');
          line.setAttribute('stroke', '#163528');
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('vector-effect', 'non-scaling-stroke');
          line.setAttribute('x1', L.x1); line.setAttribute('y1', L.y1);
          line.setAttribute('x2', L.x2); line.setAttribute('y2', L.y2);
          host.insertBefore(line, host.firstChild);
        });
        syncPickList(svg);
        return;
      }
    }
    const placed = [];
    let cachedDots = null;
    const dotCenters = () => {
      if (cachedDots) return cachedDots;
      cachedDots = [...svg.querySelectorAll('circle')].filter(c => !c.classList.contains('p10-pick-hit')).map(c => {
        const r = c.getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, r, el: c };
      }).filter(d => d.r.width > 0.5);
      return cachedDots;
    };
    const tagCity = new Set();
    for (const tag of texts) {
      if (!tag.classList.contains('p10-pick-tag')) continue;
      const mark = labelDot(svg, tag);
      const id = mark && mark.closest && mark.closest('[data-p10-pick]') && mark.closest('[data-p10-pick]').dataset.p10Pick;
      if (id) tagCity.add(id);
    }
    const pin = el => {
      if (el.classList.contains('v4-map-num') || el.classList.contains('gday-num')) return 0;
      if (tagCity.has(el.getAttribute('data-p10-pick-label'))) return 1;
      if (el.classList.contains('p10-pick-tag')) return 2;
      return 3;
    };
    const orderOf = shortFirst => texts.slice().sort((a, b) => {
      const pa = pin(a), pb = pin(b);
      if (pa !== pb) return pa - pb;
      const al = (a.textContent || '').length, bl = (b.textContent || '').length;
      return shortFirst || schematic ? al - bl : bl - al;
    });
    const leaderEnds = (circle, rect) => {
      const c = circle.getBoundingClientRect();
      const cx = (c.left + c.right) / 2, cy = (c.top + c.bottom) / 2;
      const x = Math.max(rect.left, Math.min(cx, rect.right));
      const y = Math.max(rect.top, Math.min(cy, rect.bottom));
      const dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return { x1: cx, y1: cy, x2: x - dx / len * 1.5, y2: y - dy / len * 1.5, len: len - 1.5 };
    };
    const clearOf = (rect, ends) => {
      const pad = schematic ? 2 : 5;
      for (const d of dotCenters()) {
        if (Math.hypot(d.x - ends.ownX, d.y - ends.ownY) <= (ends.cluster || 2)) continue;
        const rad = Math.min(d.r.width, d.r.height) / 2;
        const away = pointBoxDist(d.x, d.y, rect);
        if (away <= rad + pad || away < (ends.minAway || 0)) return false;
        if (ends.draw && distPointSeg(d.x, d.y, ends.x1, ends.y1, ends.x2, ends.y2) <= rad + 2) return false;
      }
      if (!ends.draw) return true;
      if (ends.len > 48) return false;
      return !placed.some(p => clipLength(ends.x1, ends.y1, ends.x2, ends.y2, p.rect) > 0.2);
    };
    const paint = (text, circle, ends) => {
      if (!ends.draw) return;
      const line = doc.createElementNS(ns, 'line');
      line.setAttribute('class', coast ? 'gday-leader' : (svg.classList.contains('v4-schematic') ? 'v4-map-leader' : 'p10-pick-leader'));
      line.setAttribute('stroke', '#163528');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      const c = circle.getBoundingClientRect();
      const ccx = (c.left + c.right) / 2, ccy = (c.top + c.bottom) / 2;
      if (coast) {
        const cx0 = parseFloat(circle.getAttribute('cx')) || 0;
        const cy0 = parseFloat(circle.getAttribute('cy')) || 0;
        line.setAttribute('x1', String(cx0));
        line.setAttribute('y1', String(cy0));
        line.setAttribute('x2', (cx0 + (ends.x2 - ccx) / scale).toFixed(1));
        line.setAttribute('y2', (cy0 + (ends.y2 - ccy) / scale).toFixed(1));
        text.parentNode.insertBefore(line, text);
      } else if (svg.classList.contains('v4-schematic')) {
        line.setAttribute('x1', circle.getAttribute('cx') || '0');
        line.setAttribute('y1', circle.getAttribute('cy') || '0');
        line.setAttribute('x2', ((ends.x2 - ccx) / scale).toFixed(1));
        line.setAttribute('y2', ((ends.y2 - ccy) / scale).toFixed(1));
        text.parentNode.insertBefore(line, text);
      } else {
        const box = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const sy = box.height / vb.height || scale;
        const xOf = sx => vb.x + (sx - box.left) / scale;
        const yOf = syv => vb.y + (syv - box.top) / sy;
        line.setAttribute('x1', xOf(ends.x1).toFixed(1));
        line.setAttribute('y1', yOf(ends.y1).toFixed(1));
        line.setAttribute('x2', xOf(ends.x2).toFixed(1));
        line.setAttribute('y2', yOf(ends.y2).toFixed(1));
        const host = svg.querySelector('.p10-pick-labels') || text.parentNode;
        host.insertBefore(line, host.firstChild);
      }
    };
    const sit = (text, circle, gapScreen, rank) => {
      const c = circle.getBoundingClientRect();
      const ccx = (c.left + c.right) / 2, ccy = (c.top + c.bottom) / 2;
      const rad = Math.min(c.width, c.height) / 2;
      let best = null;
      const numeralSlide = text.classList.contains('v4-map-num') || text.classList.contains('gday-num');
      const slides = numeralSlide ? [0, -8, 8, -16, 16, -24, 24] : (text.classList.contains('p10-pick-tag') ? [0, -12, 12] : (schematic ? [0] : [0, -18, 18, -36, 36]));
      for (const [dx, dy, anchor] of dirs) {
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const m = metrics(text, anchor);
        if (!(m.w > 1)) continue;
        for (const slide of slides) {
        const half = Math.abs(ux) * m.w / 2 + Math.abs(uy) * m.h / 2;
        const dist = rad + gapScreen + half;
        const targetX = ccx + ux * dist - uy * slide;
        const targetY = ccy + uy * dist + ux * slide;
        let userX = quant((targetX - m.cx) / sx);
        let userY = quant((targetY - m.cy) / sy);
        let r = boxAt(m, userX, userY);
        let gap = boxGap(r, c);
        for (let pull = 0; pull < 3 && gap > gapScreen + 1; pull++) {
          const mx = (r.left + r.right) / 2, my = (r.top + r.bottom) / 2;
          const d = Math.hypot(mx - ccx, my - ccy) || 1;
          userX = quant(userX + (ccx - mx) / d * (gap - gapScreen) / sx);
          userY = quant(userY + (ccy - my) / d * (gap - gapScreen) / sy);
          r = boxAt(m, userX, userY);
          gap = boxGap(r, c);
        }
        if (gap < 2) {
          userX = quant(userX + ux * (3 - gap) / sx);
          userY = quant(userY + uy * (3 - gap) / sy);
          r = boxAt(m, userX, userY);
          gap = boxGap(r, c);
        }
        const ends = leaderEnds(circle, r);
        ends.ownX = ccx;
        ends.ownY = ccy;
        ends.cluster = text.classList.contains('p10-pick-tag') ? 6 : 2;
        ends.minAway = 0;
        ends.draw = coast ? gap > 3 : gap > 14;
        const maxGap = gapScreen + 1.5;
        const crowded = placed.some(o => schematic ? boxGap(r, o.rect) < 6 : overlaps(r, o.rect));
        if (!(inside(r) && gap >= 2 && gap <= maxGap && !crowded && clearOf(r, ends))) continue;
        let clear = Infinity;
        let foreignPoint = Infinity;
        let centerForeign = Infinity;
        const midX = (r.left + r.right) / 2, midY = (r.top + r.bottom) / 2;
        const centerOwn = Math.hypot(midX - ccx, midY - ccy);
        for (const d of dotCenters()) {
          if (Math.hypot(d.x - ccx, d.y - ccy) <= (text.classList.contains('p10-pick-tag') ? 6 : 2)) continue;
          if (text.classList.contains('gday-num') && !(d.el.parentNode && d.el.parentNode.querySelector('text'))) continue;
          const pd = pointBoxDist(d.x, d.y, r);
          foreignPoint = Math.min(foreignPoint, pd);
          centerForeign = Math.min(centerForeign, Math.hypot(d.x - midX, d.y - midY));
          clear = Math.min(clear, pd - Math.min(d.r.width, d.r.height) / 2);
        }
        const ownPoint = pointBoxDist(ccx, ccy, r);
        let apart = Infinity;
        for (const o of placed) apart = Math.min(apart, boxGap(r, o.rect));
        const score = schematic ? clear : apart + clear;
        const cand = { score, x: userX.toFixed(1), y: userY.toFixed(1), anchor, r, ends, ownPoint, foreignPoint, centerOwn, centerForeign };
        const ranked = rank ? rank(cand) : score;
        if (ranked == null) continue;
        if (!best || ranked > best.ranked) best = { ...cand, ranked };
        }
      }
      if (!best) return null;
      text.setAttribute('text-anchor', best.anchor);
      text.setAttribute('x', best.x);
      text.setAttribute('y', best.y);
      const real = text.getBoundingClientRect();
      const ends = leaderEnds(circle, real);
      ends.ownX = ccx;
      ends.ownY = ccy;
      ends.cluster = text.classList.contains('p10-pick-tag') ? 6 : 2;
      ends.minAway = 0;
      ends.draw = best.ends.draw;
      const realGap = boxGap(real, c);
      const maxGap = schematic ? gapScreen + 1.5 : Math.min(14, gapScreen + 1.5);
      const crowded = placed.some(o => schematic ? boxGap(real, o.rect) < 6 : overlaps(real, o.rect));
      if (!(inside(real) && realGap >= 2 && realGap <= maxGap + 1.5 && !crowded && clearOf(real, ends))) return null;
      const ownPoint = pointBoxDist(ccx, ccy, real);
      return { r: real, ends, x: best.x, y: best.y, anchor: best.anchor, ownPoint, foreignPoint: best.foreignPoint, ranked: best.ranked };
    };
    const placeOne = text => {
      text.classList.remove('is-unplaced');
      const circle = labelDot(svg, text);
      if (!circle) return true;
      let fit = null;
      const tag = text.classList.contains('p10-pick-tag');
      const numeral = text.classList.contains('v4-map-num') || text.classList.contains('gday-num');
      if (tag || numeral) {
        // Start, end and stop numbers must sit nearer their own dot than any other city's dot.
        const rank = cand => {
          const owns = cand.foreignPoint > cand.ownPoint + 0.4 && cand.centerForeign > cand.centerOwn + 0.4;
          if (tag && !(cand.ownPoint <= 12 && owns)) return null;
          if (numeral && !owns && cand.ownPoint <= 14) return null;
          const clear6 = cand.foreignPoint >= 6 ? 200 : 0;
          if (numeral && cand.ownPoint > 14) return (owns ? 2000 : 0) + clear6 - cand.ownPoint * 8;
          return (owns ? 5000 : 0) + clear6 - cand.ownPoint * 8;
        };
        let best = null;
        for (const gap of tag ? [3, 4, 6, 8, 10, 12] : [4, 8, 12, 14, 18, 22, 26, 30]) {
          const got = sit(text, circle, gap, rank);
          if (got && (!best || got.ranked > best.ranked)) best = got;
        }
        if (best) {
          text.setAttribute('text-anchor', best.anchor);
          text.setAttribute('x', best.x);
          text.setAttribute('y', best.y);
          if (numeral && (best.ownPoint > 14 || !(best.foreignPoint > best.ownPoint + 0.4))) best.ends.draw = true;
          fit = best;
        }
      }
      if (!fit && !tag) {
      for (const gap of thorough ? [4, 6, 8, 10, 12, 14] : [4, 8, 12, 14]) {
        fit = sit(text, circle, gap);
        if (fit) break;
      }
      }
      if (!fit && !schematic && !tag) {
        for (const gap of [18, 22, 26, 32, 40]) {
          fit = sit(text, circle, gap);
          if (fit) break;
        }
      }
      if (!fit && schematic && !tag) {
        for (const gap of [18, 22, 26, 30, 34, 38, 42, 46]) {
          fit = sit(text, circle, gap);
          if (fit) break;
        }
      }
      if (!fit) {
        if (schematic) return false;
        text.classList.add('is-off', 'is-unplaced');
        text.style.setProperty('display', 'none', 'important');
        return false;
      }
      text.classList.remove('is-off');
      text.style.removeProperty('display');
      placed.push({ rect: fit.r, text, ends: fit.ends, circle });
      return true;
    };
    const lay = list => {
      placed.length = 0;
      texts.forEach(text => {
        text.classList.remove('is-unplaced', 'is-off');
        text.style.removeProperty('display');
      });
      list.forEach(placeOne);
      if (!schematic) {
        for (const tag of texts.filter(text => text.classList.contains('p10-pick-tag') && text.classList.contains('is-unplaced'))) {
          const mark = labelDot(svg, tag);
          const id = mark && mark.closest && mark.closest('[data-p10-pick]') && mark.closest('[data-p10-pick]').dataset.p10Pick;
          const name = id && texts.find(text => text.getAttribute('data-p10-pick-label') === id);
          if (name && !name.classList.contains('is-unplaced')) {
            for (let i = placed.length - 1; i >= 0; i--) if (placed[i].text === name) placed.splice(i, 1);
            name.classList.add('is-off', 'is-unplaced');
            name.style.setProperty('display', 'none', 'important');
          }
          tag.classList.remove('is-off', 'is-unplaced');
          tag.style.removeProperty('display');
          placeOne(tag);
          if (name) {
            name.classList.remove('is-off', 'is-unplaced');
            name.style.removeProperty('display');
            placeOne(name);
          }
        }
      }
    };
    const placedCount = () => texts.filter(text => !text.classList.contains('is-unplaced')).length;
    const snap = () => texts.map(text => ({
      text,
      x: text.getAttribute('x') || '0',
      y: text.getAttribute('y') || '0',
      anchor: text.getAttribute('text-anchor') || 'start',
      off: text.classList.contains('is-unplaced')
    }));
    lay(orderOf(false));
    if (!schematic && texts.some(text => text.classList.contains('is-unplaced'))) {
      const longCount = placedCount();
      const longItems = placed.map(item => ({ ...item }));
      const longSnap = snap();
      lay(orderOf(true));
      if (placedCount() < longCount) {
        placed.length = 0;
        longItems.forEach(item => placed.push(item));
        longSnap.forEach(item => {
          item.text.setAttribute('x', item.x);
          item.text.setAttribute('y', item.y);
          item.text.setAttribute('text-anchor', item.anchor);
          item.text.classList.toggle('is-off', item.off);
          item.text.classList.toggle('is-unplaced', item.off);
          if (item.off) item.text.style.setProperty('display', 'none', 'important');
          else item.text.style.removeProperty('display');
        });
      }
    }
    placed.forEach(item => paint(item.text, item.circle, item.ends));
    for (const line of [...svg.querySelectorAll('.v4-map-leader, .p10-pick-leader, .gday-leader')]) {
      const ctm = line.getScreenCTM();
      if (!ctm) { line.remove(); continue; }
      const pt = (x, y) => { const p = new DOMPoint(+x, +y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
      const a = pt(line.getAttribute('x1'), line.getAttribute('y1'));
      const b = pt(line.getAttribute('x2'), line.getAttribute('y2'));
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const live = [...svg.querySelectorAll('text')].filter(placeable);
      const own = live.find(t => pointBoxDist(b.x, b.y, t.getBoundingClientRect()) <= 3);
      const crosses = live.some(t => t !== own && clipLength(a.x, a.y, b.x, b.y, t.getBoundingClientRect()) > 0.2);
      const throughDot = dotCenters().some(d => {
        if (Math.hypot(d.x - a.x, d.y - a.y) <= 2) return false;
        const rad = Math.min(d.r.width, d.r.height) / 2;
        return distPointSeg(d.x, d.y, a.x, a.y, b.x, b.y) <= rad + 2;
      });
      if (len > 48 || crosses || throughDot) {
        line.remove();
        if (own && !schematic) { own.classList.add('is-off', 'is-unplaced'); own.style.setProperty('display', 'none', 'important'); }
      }
    }
    if (!schematic) {
      layoutMemo.set(svg, {
        key: memoKey(),
        items: texts.map(text => ({
          text,
          x: text.getAttribute('x') || '0',
          y: text.getAttribute('y') || '0',
          anchor: text.getAttribute('text-anchor') || 'start',
          off: text.classList.contains('is-off'),
          display: text.style.getPropertyValue('display')
        })),
        leaders: [...svg.querySelectorAll('.p10-pick-leader')].map(line => ({
          x1: line.getAttribute('x1'), y1: line.getAttribute('y1'),
          x2: line.getAttribute('x2'), y2: line.getAttribute('y2')
        }))
      });
    }
    syncPickList(svg);
  }
  function syncPickList(svg) {
    if (!svg || !svg.classList.contains('p10-pick-svg')) return;
    const ul = svg.parentElement && svg.parentElement.querySelector('.p10-pick-name-list');
    if (!ul) return;
    if (!ul.dataset.full) ul.dataset.full = ul.innerHTML;
    const narrow = window.matchMedia('(max-width:420px)').matches;
    const missed = [...svg.querySelectorAll('.is-unplaced')].map(t => (t.textContent || '').trim()).filter(Boolean);
    const signature = (!narrow && missed.length) ? missed.join('\n') : 'full';
    if (ul.dataset.shown === signature) return;
    ul.dataset.shown = signature;
    if (!narrow && missed.length) {
      ul.replaceChildren(...missed.map(name => { const li = doc.createElement('li'); li.textContent = name; return li; }));
      ul.classList.add('is-open');
    } else {
      ul.innerHTML = ul.dataset.full;
      ul.classList.remove('is-open');
    }
  }
  window.pounamuSettleLabels = settleMapLabels;
  function fitMaps() { $$('svg').forEach(fitSvgText); }
  function enhance() {
    fitMaps();
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
    const own = n => { const el = n.nodeType === 1 ? n : n.parentElement; return !!(el && el.closest && el.closest('.ui2-hud, .ui2-readout, .ui2-palette, .ui2-particles, .ui2-progress, #p10-pick-map')); };
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
  function paletteChrome() {
    if (!palette) return;
    const foot = palette.querySelector('footer');
    if (foot) foot.innerHTML = `<span>↑↓ ${isEn() ? 'move' : '选择'}</span><span>↵ ${isEn() ? 'open' : '打开'}</span><span>esc ${isEn() ? 'close' : '关闭'}</span>`;
    const input = palette.querySelector('input');
    if (input) input.placeholder = isEn() ? 'Search routes, places and pages…' : '搜线路、目的地、页面……';
    palette.setAttribute('aria-label', isEn() ? 'Quick search' : '快速搜索');
  }
  new MutationObserver(() => { items = null; paletteChrome(); if (palette && palette.classList.contains('on')) { const q = palette.querySelector('input').value; loadItems().then(() => render(q)); } }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => { skipFocus(); start(); }); else { skipFocus(); start(); }
})();
