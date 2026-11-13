/* Shared day cards, place cards, coastline map and budget block.
   Used by the planner, templates, destination pages, route pages and prepare.html.
   Wording is original. Prices stay estimates or 待核. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.pounamuGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function maps() { return globalThis.pounamuMapsUrl || null; }
  function budgetApi() { return globalThis.pounamuBudget || null; }

  function searchLink(opts, lang) {
    const api = maps();
    if (!api) return '';
    const href = api.searchUrl(opts);
    const label = lang === 'en' ? 'Open in Google Maps' : '在谷歌地图打开';
    return `<a class="v4-gmaps" href="${esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${label}</a>`;
  }
  function dirLinks(stops, mode, lang) {
    const api = maps();
    if (!api || !stops || stops.length < 2) return '';
    const urls = api.routeSegments(stops, mode || 'driving');
    return urls.map((href, i) => `<a class="v4-gmaps v4-gmaps-dir" href="${esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${lang === 'en' ? 'Google Maps for this day' : 'Google Maps 当天路线'}${urls.length > 1 ? ' ' + (i + 1) + '/' + urls.length : ''} ↗</a>`).join(' ');
  }

  function dayCard(o) {
    const lang = o.lang === 'en' ? 'en' : 'zh';
    const n = o.n || 1;
    const when = o.dateLabel || (lang === 'en' ? 'Date to verify' : '日期待核');
    const must = o.must ? `<span class="gday-must">${lang === 'en' ? 'Must-do' : '必去'}</span>` : '';
    const move = o.moveLabel || (lang === 'en' ? 'DRIVE' : '开车多久');
    const actions = `${o.mapsHtml || ''}${o.onMap ? `<button type="button" class="gday-jumpmap" data-gday-focus="${n}">${lang === 'en' ? 'Show on the map ↑' : '在地图中查看 ↑'}</button>` : ''}`;
    return `<article class="gday ${esc(o.className || '')}" id="${esc(o.id || 'day-' + n)}" data-gday="${n}">
      <div class="gday-date"><b>DAY ${String(n).padStart(2, '0')}</b><span>${esc(when)}</span></div>
      <h3 class="plan-day-title">${esc(o.title || '')} ${must}</h3>
      <dl class="gday-meta"><div><dt>${lang === 'en' ? 'STAY' : '住哪里'}</dt><dd>${esc(o.stay || (lang === 'en' ? 'To verify' : '待核'))}</dd></div>
      <div><dt>${esc(move)}</dt><dd>${esc(o.move || (lang === 'en' ? 'Estimate to verify' : '估算，待核'))}</dd></div></dl>
      <div class="gday-budget" data-gday-budget="${n - 1}">${o.budgetHtml || ''}</div>
      ${o.body ? `<div class="gday-body">${o.body}</div>` : ''}
      ${o.tip ? `<p class="gday-tip">${o.tip}</p>` : ''}
      ${actions ? `<p class="gday-actions">${actions}</p>` : ''}
      ${o.official || ''}
    </article>`;
  }

  function placeCard(o) {
    const lang = o.lang === 'en' ? 'en' : 'zh';
    const cost = o.cost || (lang === 'en' ? 'To verify' : '待核');
    const time = o.time || (lang === 'en' ? 'Time to verify' : '用时待核');
    const source = o.sourceUrl
      ? `<a class="v4-source" href="${esc(o.sourceUrl)}" target="_blank" rel="noopener" data-keep-link="1">${esc(o.sourceLabel || (lang === 'en' ? 'Source' : '来源'))}</a>${o.checked ? ' · ' + esc(o.checked) : ''}`
      : (lang === 'en' ? 'Source to verify' : '来源待核');
    const add = o.addHref ? `<a href="${esc(o.addHref)}">${lang === 'en' ? 'Add to trip' : '加入行程'}</a>` : '';
    return `<article class="v4-place gplace" id="${esc(o.id || '')}"><h3>${esc(o.title || '')}</h3>
      <p>${esc(o.text || '')}</p>
      <p><strong>${lang === 'en' ? 'Time' : '用时'}</strong> ${esc(time)} · <strong>${lang === 'en' ? 'Cost' : '花费'}</strong> ${esc(cost)}</p>
      <p class="v4-note">${source}</p>
      <p class="gday-actions">${searchLink({ name: o.query || o.title, town: o.town, lat: o.lat, lng: o.lng }, lang)} ${add}</p>
    </article>`;
  }

  function glance(o) {
    const lang = o.lang === 'en' ? 'en' : 'zh';
    const mapsLink = searchLink({ name: o.place, town: o.place, lat: o.lat, lng: o.lng }, lang);
    return `<section class="gglance" aria-label="${lang === 'en' ? 'At a glance' : '一览'}"><h2>${lang === 'en' ? 'At a glance' : '一览'}</h2>
      <dl class="gday-meta">
        <div><dt>${lang === 'en' ? 'Days' : '几天'}</dt><dd>${esc(o.days || (lang === 'en' ? 'To verify' : '待核'))}</dd></div>
        <div><dt>${lang === 'en' ? 'Season' : '季节'}</dt><dd>${esc(o.season || (lang === 'en' ? 'To verify' : '待核'))}</dd></div>
        <div><dt>${lang === 'en' ? 'Getting there' : '怎么到'}</dt><dd>${esc(o.access || (lang === 'en' ? 'See the map link' : '看地图链接'))} ${mapsLink}</dd></div>
        <div><dt>${lang === 'en' ? 'A night, estimate' : '住一晚，估算'}</dt><dd>${esc(o.cost || (lang === 'en' ? 'A night in town (hostel or holiday park) is to verify. Stats NZ does not publish a nightly rate (read 2026-11-12).' : '城里住一晚（青旅或假日公园）待核。统计局不公布每晚房价（查阅 2026-11-12）。'))}</dd></div>
      </dl>
      <p class="v4-note"><a href="https://datainfoplus.stats.govt.nz/Item/nz.govt.stats/38574cd6-b696-41a5-b311-41bfa5611a99/121" target="_blank" rel="noopener" data-keep-link="1">${lang === 'en' ? 'Stats NZ Accommodation Survey' : '统计局住宿调查'}</a> · 2026-11-12</p>
    </section>`;
  }

  function budgetShell(lang) {
    const api = budgetApi();
    if (!api) return '';
    const zh = lang !== 'en';
    const a = api.blankAssumptions();
    const field = (key, label) => `<label>${esc(label)} <input data-budget="${key}" type="number" min="0" step="1" value="${a[key] == null ? '' : a[key]}"></label>`;
    return `<section class="p10-budget" id="p10-budget"><h2>${zh ? '预算 / Trip budget' : '预算 / Trip budget'}</h2>
      <p class="v4-note">${zh ? '数字都是估算。没有来源的标待核。' : 'Figures are estimates. Anything without a source is marked to verify.'}</p>
      <div class="p10-budget-controls"><label>${zh ? '档位' : 'Tier'} <select data-budget="tier"><option value="budget">${zh ? '经济' : 'Budget'}</option><option value="mid">${zh ? '舒适' : 'Comfort'}</option><option value="high">${zh ? '高端' : 'High-end'}</option></select></label>
      <label>${zh ? '人数' : 'People'} <input data-budget="people" type="number" min="1" max="12" value="2"></label>
      <label><input data-budget="showCny" type="checkbox"> ${zh ? '显示人民币' : 'Show CNY'}</label>
      ${field('nzdCny', zh ? '1 NZD 兑人民币（自填）' : 'NZD to CNY (you type it)')}
      <label>${zh ? '汇率填写日' : 'Rate typed on'} <input data-budget="nzdCnyDate" type="date"></label></div>
      <div id="p10-budget-summary"></div>
      <details class="p10-assumptions" open><summary>${zh ? '估算假设（可改）' : 'Assumptions (editable)'}</summary>
      <div class="p10-budget-controls">${field('docLow', zh ? 'DOC 营地下限' : 'DOC campsite low')}${field('docHigh', zh ? 'DOC 营地上限' : 'DOC campsite high')}${field('midNightly', zh ? '舒适每晚（待核）' : 'Comfort nightly (to verify)')}${field('highNightly', zh ? '高端每晚（待核）' : 'High-end nightly (to verify)')}${field('fuelNzdPerL', zh ? '油价 NZD/升（待核）' : 'Fuel NZD/L (to verify)')}${field('litresPer100', zh ? '油耗 L/100km（待核）' : 'L/100km (to verify)')}${field('mealNzd', zh ? '每餐（待核）' : 'Meal (to verify)')}${field('ferryVehicleNzd', zh ? '渡轮车辆票（待核）' : 'Ferry vehicle fare (to verify)')}${field('parkingNzd', zh ? '停车（待核）' : 'Parking (to verify)')}${field('activityNzd', zh ? '付费活动（待核）' : 'Paid activity (to verify)')}</div>
      <ul class="p10-budget-sources">${Object.values(api.SOURCES).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener" data-keep-link="1">${esc(zh ? s.zh : s.en)}</a> · ${esc(s.checkedAt)}</li>`).join('')}</ul></details></section>
      <div class="gday-sticky" id="p10-budget-sticky"></div>`;
  }

  function readForm(root, state) {
    const api = budgetApi();
    if (!api) return state;
    const next = { ...(state || api.blankAssumptions()) };
    root.querySelectorAll('[data-budget]').forEach(el => { next[el.dataset.budget] = el.type === 'checkbox' ? el.checked : el.value; });
    return api.normalise(next);
  }

  function placeSticky(sticky) {
    if (!sticky || typeof document === 'undefined') return;
    sticky.hidden = false;
    const box = sticky.getBoundingClientRect();
    const targets = document.querySelectorAll('.gday-actions, .gday-meta, .gday-jumpmap, .map-legend, .p10-map-day-list, .journey-facts, .ui2-kbtn, #p10-budget');
    let hit = false;
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.bottom < 0 || r.top > window.innerHeight) continue;
      if (!(box.right < r.left || box.left > r.right || box.bottom < r.top || box.top > r.bottom)) { hit = true; break; }
    }
    sticky.hidden = hit;
    if (!placeSticky.bound) {
      placeSticky.bound = true;
      const again = () => { const chip = document.querySelector('.gday-sticky'); if (chip) placeSticky(chip); };
      window.addEventListener('scroll', again, { passive: true });
      window.addEventListener('resize', again);
    }
  }

  function paint(root, days, state) {
    const api = budgetApi();
    if (!api || !root) return state;
    const lang = root.closest('[lang]') ? '' : '';
    const zh = (document.documentElement.lang || '').startsWith('zh');
    const trip = api.priceTrip(days, state);
    const names = { stay: zh ? '住宿' : 'Stay', fuel: zh ? '燃油或交通' : 'Fuel or transport', food: zh ? '餐饮' : 'Food', activities: zh ? '付费活动' : 'Paid activities', ferry: zh ? '渡轮' : 'Ferry', parking: zh ? '停车' : 'Parking' };
    root.querySelectorAll('[data-gday-budget]').forEach(host => {
      const i = Number(host.getAttribute('data-gday-budget'));
      const day = trip.days[i];
      if (!day) return;
      const bits = Object.entries(day.lines).filter(([, line]) => !line.empty).map(([key, line]) => `<span><b>${names[key]}</b> ${esc(api.formatMoney(line, zh ? 'zh' : 'en'))}</span>`).join('');
      host.innerHTML = `<div class="gday-cost">${bits}</div><p class="gday-sub"><b>${zh ? '当天小计' : 'Day subtotal'}</b> ${esc(api.formatMoney(day.subtotal, zh ? 'zh' : 'en'))} · <b>${zh ? '累计' : 'Running'}</b> ${esc(api.formatMoney(day.running, zh ? 'zh' : 'en'))}</p>`;
    });
    const box = root.querySelector('#p10-budget-summary');
    if (box) {
      const cat = Object.entries(trip.categories).map(([key, line]) => `<li><span>${names[key]}</span><span>${esc(api.formatMoney(line, zh ? 'zh' : 'en'))}</span></li>`).join('');
      const byDay = trip.days.map((day, i) => `<li><span>${zh ? '第' : 'Day '}${i + 1}${zh ? '天' : ''}</span><span>${esc(api.formatMoney(day.subtotal, zh ? 'zh' : 'en'))}</span></li>`).join('');
      const rate = state.nzdCny;
      const cny = state.showCny ? `<p>${zh ? '人民币' : 'CNY'} ${rate == null ? (zh ? '待核（先填汇率）' : 'To verify (type a rate)') : esc(api.formatMoney(trip.cny, zh ? 'zh' : 'en', 'CN¥'))}${state.nzdCnyDate ? ' · ' + esc(state.nzdCnyDate) : ''}</p>` : '';
      box.innerHTML = `<p class="p10-budget-total"><b>${zh ? '行程合计' : 'Trip total'}</b> ${esc(api.formatMoney(trip.total, zh ? 'zh' : 'en'))}</p><p><b>${zh ? '每人' : 'Per person'}</b> ${esc(api.formatMoney(trip.perPerson, zh ? 'zh' : 'en'))}</p>${cny}<h3>${zh ? '按类别' : 'By category'}</h3><ul class="p10-budget-split">${cat}</ul><h3>${zh ? '按天' : 'By day'}</h3><ul class="p10-budget-split">${byDay}</ul>`;
    }
    const sticky = root.querySelector('#p10-budget-sticky');
    if (sticky) {
      sticky.innerHTML = `<a href="#p10-budget">${zh ? '合计' : 'Total'} ${esc(api.formatMoney(trip.total, zh ? 'zh' : 'en'))}</a>`;
      placeSticky(sticky);
    }
    return state;
  }

  function bindBudget(root, days) {
    const api = budgetApi();
    if (!api || !root || root.dataset.budgetBound) return;
    root.dataset.budgetBound = '1';
    let state = api.blankAssumptions();
    try { const q = new URLSearchParams(location.search).get('budget'); if (q) state = api.decodeState(q); } catch { /* keep defaults */ }
    const sync = () => { state = readForm(root, state); paint(root, days, state); try { const u = new URL(location.href); u.searchParams.set('budget', api.encodeState(state)); history.replaceState(null, '', u); } catch { /* ignore */ } };
    root.addEventListener('input', ev => { if (ev.target.closest('[data-budget]')) sync(); });
    root.addEventListener('change', ev => { if (ev.target.closest('[data-budget]')) sync(); });
    paint(root, days, state);
  }

  let coastD = '';
  function project(lat, lon) { return [392.5 + (lon - 174.76) * 38.05, 189.7 + (-lat - 36.85) * 50.5]; }
  async function coastMap(host, stops, lang) {
    if (!host) return;
    const zh = lang !== 'en';
    if (!coastD) { try { const data = await fetch('data/nz-coast.json').then(r => r.ok ? r.json() : null); coastD = data && data.d || ''; } catch { coastD = ''; } }
    const fallback = globalThis.P10_COAST_PATH || '';
    const d = coastD || fallback;
    const dots = (stops || []).map((s, i) => {
      if (!Number.isFinite(Number(s.lat)) || !Number.isFinite(Number(s.lng))) return '';
      const [x, y] = project(Number(s.lat), Number(s.lng));
      return `<g class="gday-stop" data-gday-stop="${i + 1}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/><text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle">${i + 1}</text></g>`;
    }).join('');
    const line = (stops || []).filter(s => Number.isFinite(Number(s.lat))).map(s => project(Number(s.lat), Number(s.lng)).map(n => n.toFixed(1)).join(',')).join(' ');
    host.innerHTML = `<div class="p10-map-day-list">${(stops || []).map((s, i) => `<button type="button" data-gday-focus="${i + 1}">${zh ? '第 ' + (i + 1) + ' 天' : 'Day ' + (i + 1)}</button>`).join('')}</div>
      <svg class="p10-trip-svg gcoast" viewBox="0 0 680 820" role="img" aria-label="${zh ? '新西兰海岸与停留点' : 'New Zealand coastline and stops'}"><rect width="680" height="820" fill="#e2ece8"/><path class="p10-coast" data-coast="${coastD ? 'natural-earth' : 'schematic'}" d="${d}"/><polyline points="${line}" fill="none" stroke="#244c39" stroke-width="3"/>${dots}</svg>
      <p class="v4-note">${zh ? '海岸线来自 Natural Earth（公有领域），连线是示意，不能导航。' : 'Coastline: Natural Earth (public domain). The line is a sketch, not for navigation.'} <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener" data-keep-link="1">Natural Earth</a></p>`;
    host.addEventListener('click', ev => {
      const b = ev.target.closest('[data-gday-focus]');
      if (!b) return;
      host.querySelectorAll('[data-gday-stop]').forEach(g => g.classList.toggle('is-hot', g.getAttribute('data-gday-stop') === b.getAttribute('data-gday-focus')));
      const card = document.getElementById('day-' + b.getAttribute('data-gday-focus'));
      if (card) card.scrollIntoView({ block: 'nearest' });
    });
  }

  function asBudgetDays(n) {
    return Array.from({ length: n }, () => ({ kind: 'activity', legs: [], activities: [{}] }));
  }

  function routeDayPlan(route) {
    if (typeof globalThis.p10RouteDays === 'function') return globalThis.p10RouteDays(route);
    const pick = (pair, en) => Array.isArray(pair) ? pair[en ? 0 : 1] : '';
    const stages = (route.timeline || []).map(s => ({ titleEn: pick(s.title, true), titleZh: pick(s.title, false), textEn: pick(s.text, true), textZh: pick(s.text, false) }));
    const time = Array.isArray(route.time) ? route.time : ['', ''];
    if (route.id === 'milford-track') {
      return [
        { stayEn: 'Clinton Hut', stayZh: 'Clinton Hut', titleEn: 'Glade Wharf to Clinton Hut', titleZh: 'Glade Wharf → Clinton Hut', textEn: (stages[0] && stages[0].textEn) + ' ' + (stages[1] && stages[1].textEn), textZh: (stages[0] && stages[0].textZh) + ' ' + (stages[1] && stages[1].textZh), query: 'Clinton Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: time[0], moveZh: time[1] },
        { stayEn: 'Mintaro Hut', stayZh: 'Mintaro Hut', titleEn: 'On to Mintaro Hut', titleZh: '前往 Mintaro Hut', textEn: 'DOC’s usual second night on the 4-day Milford Track booking is Mintaro Hut.', textZh: '米尔福德步道 4 天预订通常第二晚住 Mintaro Hut。', query: 'Mintaro Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: time[0], moveZh: time[1] },
        { stayEn: 'Dumpling Hut', stayZh: 'Dumpling Hut', titleEn: 'Over Mackinnon Pass to Dumpling Hut', titleZh: '翻 Mackinnon Pass → Dumpling Hut', textEn: stages[2] && stages[2].textEn, textZh: stages[2] && stages[2].textZh, query: 'Dumpling Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: time[0], moveZh: time[1] },
        { stayEn: 'Sandfly Point', stayZh: 'Sandfly Point', titleEn: 'To Sandfly Point, then the boat', titleZh: '到 Sandfly Point，再乘船', textEn: (stages[3] && stages[3].textEn) + ' ' + (stages[4] && stages[4].textEn), textZh: (stages[3] && stages[3].textZh) + ' ' + (stages[4] && stages[4].textZh), query: 'Sandfly Point Milford Track', stayKind: 'none', hut: false, moveEn: time[0], moveZh: time[1] }
      ];
    }
    const planDays = Math.max(1, Number(route.planDays) || 1);
    if (planDays <= 1) {
      return [{ stayEn: 'To verify', stayZh: '待核', titleEn: route.name, titleZh: route.zh || route.name, textEn: stages.map(s => s.textEn).join(' '), textZh: stages.map(s => s.textZh).join(' '), query: route.name, stayKind: 'city', hut: false, moveEn: time[0], moveZh: time[1] }];
    }
    return stages.slice(0, planDays).map(s => {
      const name = (s.titleEn || '').split(/\s*(?:→|->| to )\s*/i).pop();
      const hut = /hut/i.test(name);
      const camp = /camp/i.test(name);
      return { stayEn: name || 'To verify', stayZh: (s.titleZh || '').split(/→/).pop().trim() || name || '待核', titleEn: s.titleEn, titleZh: s.titleZh, textEn: s.textEn, textZh: s.textZh, query: name || route.name, hut, stayKind: hut ? 'great-walk' : camp ? 'doc-camp' : 'city', moveEn: time[0], moveZh: time[1] };
    });
  }

  function renderRoutePage(route, lang) {
    if (!route || typeof document === 'undefined') return;
    const box = document.querySelector('#journey-timeline');
    if (!box) return;
    const zh = (lang || document.documentElement.lang || '').startsWith('zh') || lang === 'zh';
    const L = zh ? 'zh' : 'en';
    const days = routeDayPlan(route);
    const moveLabel = route.mode === 'paddle' ? (zh ? '划多久' : 'PADDLE') : route.mode === 'walk' ? (zh ? '走多久' : 'WALK') : route.mode === 'cycle' ? (zh ? '骑多久' : 'RIDE') : route.mode === 'transit' ? (zh ? '车上多久' : 'TRANSIT') : (zh ? '开车多久' : 'DRIVE');
    const cards = days.map((s, i) => dayCard({
      lang: L, n: i + 1, title: zh ? s.titleZh : s.titleEn, stay: zh ? s.stayZh : s.stayEn,
      moveLabel, move: zh ? s.moveZh : s.moveEn, must: false,
      body: `<p>${esc(zh ? s.textZh : s.textEn)}</p>`,
      mapsHtml: searchLink({ name: s.query || s.stayEn }, L),
      official: s.hut ? `<p class="gday-official"><a href="https://www.doc.govt.nz/parks-and-recreation/places-to-stay/stay-in-a-hut/hut-categories/" target="_blank" rel="noopener" data-keep-link="1">${zh ? 'DOC 小屋分类与费用' : 'DOC hut categories and fees'}</a> · 2026-11-13</p>` : ''
    })).join('');
    const old = box.querySelector('.journey-timeline');
    const host = old || box;
    host.outerHTML = `<div class="p10-days" id="p10-days">${cards}</div>`;
    const safety = [];
    if (route.safety) safety.push(`<article class="gplace"><h3>${zh ? '安全' : 'Safety'}</h3><p>${esc(Array.isArray(route.safety) ? route.safety[zh ? 1 : 0] : route.safety)}</p></article>`);
    if (route.booking) safety.push(`<article class="gplace"><h3>${zh ? '预订' : 'Booking'}</h3><p>${esc(Array.isArray(route.booking) ? route.booking[zh ? 1 : 0] : route.booking)}</p></article>`);
    const intro = document.querySelector('#journey-overview .journey-intro');
    if (intro) intro.outerHTML = `<article class="gplace"><h3>${zh ? '这段路' : 'This route'}</h3><p>${esc(Array.isArray(route.summary) ? route.summary[zh ? 1 : 0] : '')}</p></article>${safety.join('')}`;
    const tips = document.querySelector('#journey-notes .journey-tip-grid');
    if (tips && Array.isArray(route.tips)) tips.innerHTML = route.tips.map(tip => `<article class="gplace"><h3>${esc(Array.isArray(tip.title) ? tip.title[zh ? 1 : 0] : '')}</h3><p>${esc(Array.isArray(tip.text) ? tip.text[zh ? 1 : 0] : '')}</p></article>`).join('');
    if (!box.querySelector('#p10-budget') && !document.querySelector('#journey-timeline #p10-budget')) {
      box.insertAdjacentHTML('beforeend', budgetShell(L));
    }
    const priced = days.map(s => ({ kind: s.stayKind === 'none' ? 'depart' : 'activity', stayKind: s.stayKind, legs: [], activities: [{}] }));
    bindBudget(box, priced);
  }

  return { esc, dayCard, placeCard, glance, budgetShell, paint, bindBudget, coastMap, searchLink, dirLinks, asBudgetDays, renderRoutePage, routeDayPlan };
});
