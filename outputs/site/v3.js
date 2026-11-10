/* v3: field-level verification marks, official safety links, DOC track directory, sports near cities and routes.
   Loaded before app.js; everything here runs only when app.js calls it, so it can use lang, t, pick, escapeHtml. */
const V3_FIELDS = ['time', 'distance', 'level', 'season', 'booking', 'access', 'safety'];
const V3_LABEL = {time: ['Time', '用时'], distance: ['Distance', '距离'], level: ['Grade', '难度'], season: ['Season and closures', '季节与封闭'], booking: ['Booking', '预订'], access: ['Getting there', '交通'], safety: ['Safety notes', '安全提示']};
const v3L = (en, zh) => lang === 'zh' ? zh : en;
const v3Host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const v3Link = (url, text, cls = '') => `<a ${cls ? `class="${cls}" ` : ''}href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
window.V3_MESSAGES = {en: {paddle: 'Paddling', paddleDesc: 'River journeys by canoe or kayak.', navTracks: 'DOC tracks', navCities: 'Sports nearby', tracksLabel: 'DOC TRACK DIRECTORY', tracksTitle: 'Every DOC walk<br><em>we can list.</em>', tracksDescription: 'A plain directory beside the featured guides: name, region, time, grade and the DOC page for each walk. Filter by island, region and length.', citiesLabel: 'SPORTS NEARBY', citiesTitle: 'A court or a course<br><em>near where you stay.</em>', citiesDescription: 'Tennis courts, golf courses and basketball courts around the main cities, from OpenStreetMap. No account, no tracking, no adverts.'}, zh: {paddle: '划船', paddleDesc: '乘独木舟或皮划艇的河上线路。', navTracks: 'DOC 步道', navCities: '城市运动', tracksLabel: 'DOC 步道目录', tracksTitle: 'DOC 步道<br><em>全量目录</em>', tracksDescription: '精选攻略之外的一份目录：每条步道的名称、地区、用时、难度和 DOC 页面。可按岛屿、地区和用时筛选。', citiesLabel: '城市运动', citiesTitle: '住处附近的<br><em>球场与球道</em>', citiesDescription: '主要城市周边的网球场、高尔夫球场和篮球场，数据来自 OpenStreetMap。不需要账号，不追踪，没有广告。'}};

/* ---------- verification marks ---------- */
function v3Badge(r, key) {
  if (!key || !V3_FIELDS.includes(key)) return '';
  const src = r.fieldSources?.[key];
  if (!src || r.verify?.includes(key)) return `<abbr class="v3-tv" title="${v3L('Not yet checked against an official source. Use the official page before you rely on it.', '尚未对照官方来源核实，出行前请以官方页面为准。')}">${v3L('To verify', '待核实')}</abbr>`;
  return v3Link(src.url, `${v3L('Checked', '已核')} ${src.checkedAt} · ${escapeHtml(v3Host(src.url))} ↗`, 'v3-ok');
}
function v3FactCell(r, label, value, key) {
  const shown = value ? escapeHtml(value) : `<span class="v3-missing">${v3L('No checked value yet', '暂无已核实的数值')}</span>`;
  return `<div><span>${label}</span><strong>${shown}</strong>${key ? v3Badge(r, key) : ''}</div>`;
}
function v3SideFact(r, key) {
  const value = pick(r[key]);
  return `<dt>${v3L(...V3_LABEL[key])}</dt><dd>${value ? escapeHtml(value) : `<span class="v3-missing">${v3L('No checked information yet', '暂无已核实的信息')}</span>`} ${v3Badge(r, key)}</dd>`;
}
function v3CardBadge(r) {
  const open = (r.verify || []).length, shut = v3ActiveClosure(r);
  return (shut ? `<p class="v3-card-closure">${shut.scope === 'section' ? v3L('Section closed now', '部分路段当前封闭中') : v3L('Closed now', '当前封闭中')} · ${escapeHtml(v3ClosureWhen(shut))}</p>` : '') + (open ? `<p class="v3-card-note"><span class="v3-tv">${v3L('To verify', '待核实')}</span> ${v3L(`${open} of 7 facts not yet checked`, `7 项事实中有 ${open} 项尚未核实`)}</p>` : `<p class="v3-card-note"><span class="v3-ok">${v3L('All 7 facts checked', '7 项事实已全部核实')}</span></p>`);
}
function v3VerifyPanel(r) {
  const rows = V3_FIELDS.map(key => {
    const src = r.fieldSources?.[key], value = pick(r[key]);
    const quote = src ? `<details><summary>${v3L('Official wording', '官方原文')}</summary>${src.quote.map(q => `<q>${escapeHtml(q)}</q>`).join('')}${src.note ? `<p>${escapeHtml(src.note)}</p>` : ''}</details>` : '';
    return `<tr><th scope="row">${v3L(...V3_LABEL[key])}</th><td>${value ? escapeHtml(value) : `<span class="v3-missing">—</span>`}${quote}</td><td>${v3Badge(r, key)}</td></tr>`;
  }).join('');
  const done = V3_FIELDS.length - (r.verify || []).length;
  return `<section class="journey-section v3-verify" id="journey-verify"><p class="section-label">${v3L('FIELD CHECKS', '字段核查')}</p><h2>${v3L(`${done} of 7 facts checked against an official source`, `7 项事实中 ${done} 项已对照官方来源`)}</h2><p class="v3-lead">${v3L('Each checked fact links to the page it came from and shows the date we read it. Facts marked “To verify” are editorial notes or still empty: do not rely on them.', '已核实的事实都链接到出处，并注明读取日期。标「待核实」的是编辑文字或尚无数值，请不要据此出行。')}</p><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>${v3L('Fact', '事实')}</th><th>${v3L('What we show', '本站内容')}</th><th>${v3L('Status and source', '状态与来源')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/* ---------- official closures (data/closures.json, quotes checked at build time) ---------- */
const V3_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function v3TodayNZ() { try { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } }
function v3ClosureActive(c, today = v3TodayNZ()) {
  if (c.kind === 'annual') { const md = today.slice(5); return c.from <= c.to ? md >= c.from && md <= c.to : md >= c.from || md <= c.to; }
  return today >= c.from && today <= c.to;
}
function v3Day(d) { const p = d.split('-').map(Number), [y, m, dd] = p.length === 3 ? p : [null, ...p]; return lang === 'zh' ? `${y ? y + ' 年 ' : ''}${m} 月 ${dd} 日` : `${dd} ${V3_MONTHS[m - 1]}${y ? ' ' + y : ''}`; }
function v3ClosureWhen(c) { return c.kind === 'annual' ? v3L(`every year from ${v3Day(c.from)} to ${v3Day(c.to)}`, `每年 ${v3Day(c.from)}至 ${v3Day(c.to)}`) : v3L(`${v3Day(c.from)} to ${v3Day(c.to)}`, `${v3Day(c.from)}至 ${v3Day(c.to)}`); }
function v3ClosureSentence(c) {
  const what = c.scope === 'section' ? v3L(`The section ${c.section.en} is closed`, `${c.section.zh}封闭`) : v3L('The whole track is closed', '整条步道封闭');
  return `${what}${v3L(', ', '，')}${v3ClosureWhen(c)}${v3L(`, for ${c.reason.en}.`, `（原因：${c.reason.zh}）。`)}`;
}
const v3ActiveClosure = r => (r?.closures || []).find(c => v3ClosureActive(c));
function v3ClosureBanner(r) {
  if (!r.closures?.length) return '';
  return r.closures.map(c => {
    const on = v3ClosureActive(c);
    const head = on ? (c.scope === 'section' ? v3L('Section closed now', '部分路段当前封闭中') : v3L('Closed now', '当前封闭中')) : v3L('Seasonal closure', '季节性封闭');
    return `<aside class="v3-closure section${on ? ' v3-closure-on' : ''}" role="${on ? 'alert' : 'note'}"><p><strong class="v3-closure-head">${head}</strong> ${escapeHtml(v3ClosureSentence(c))}${c.dateNote ? ' ' + escapeHtml(v3L(c.dateNote.en, c.dateNote.zh)) : ''}</p><p class="v3-closure-src">${v3L('Official wording: ', 'DOC 原文：')}“${escapeHtml(c.quote)}” — ${v3Link(c.url, 'DOC ↗')} · ${v3L('checked', '核对于')} ${c.checkedAt} · ${v3L(`judged on today’s New Zealand date (${v3TodayNZ()}).`, `按新西兰当天日期判断（${v3TodayNZ()}）。`)} ${v3L('DOC Tracks open data can lag; follow the DOC notice.', 'DOC Tracks 开放数据可能滞后，以 DOC 公告为准。')}</p></aside>`;
  }).join('');
}

/* ---------- official safety links ---------- */
function v3SafetyPanel(r) {
  const links = [];
  const official = r.sources.find(s => s.role === 'primary') || r.sources[0];
  if (official) links.push([official.url, v3L('Official page for this route', '这条线路的官方页面') + ' · ' + escapeHtml(v3Host(official.url))]);
  if (r.mode === 'walk') links.push(['https://www.doc.govt.nz/parks-and-recreation/know-before-you-go/alerts/', v3L('DOC alerts: closures and track changes', 'DOC 公告：封闭与改道')]);
  if (r.mode === 'cycle') links.push(['https://www.nzcycletrail.com/find-your-ride/23-great-rides', v3L('Ngā Haerenga NZ Cycle Trails: trail alerts on each ride page', 'Ngā Haerenga 新西兰骑行道：各路线页的 Trail Alerts')]);
  if (r.mode === 'drive') links.push(['https://www.journeys.nzta.govt.nz/highway-conditions/traffic-and-travel-list-view', v3L('NZTA: road closures and conditions', 'NZTA：封路与路况')]);
  links.push(['https://www.mountainsafety.org.nz/', v3L('NZ Mountain Safety Council', '新西兰山地安全委员会（Mountain Safety Council）')]);
  links.push(['https://www.metservice.com/warnings/home', v3L('MetService: weather warnings', 'MetService：天气预警')]);
  const status = window.V3_STATUS?.[r.id];
  const statusLine = r.closures?.length ? `<p class="v3-status">${v3L('DOC Tracks open data may lag behind; follow the DOC notice.', 'DOC Tracks 开放数据可能滞后，以 DOC 公告为准。')} ${escapeHtml(r.closures.map(v3ClosureSentence).join(' '))}</p>` : status ? `<p class="v3-status v3-status-${status.state}">${v3L('DOC Tracks open data', 'DOC Tracks 开放数据')}: ${status.state === 'closed' ? v3L(`${status.closed} of ${status.segments} matched track segments marked closed`, `匹配到的 ${status.segments} 段步道中有 ${status.closed} 段标为关闭`) : v3L(`all ${status.segments} matched track segments marked open`, `匹配到的 ${status.segments} 段步道均标为开放`)} (${v3L('data read', '数据读取于')} ${status.readAt}). ${v3L('The live DOC notice always takes precedence.', '以 DOC 实时公告为准。')}</p>` : (r.mode === 'walk' ? `<p class="v3-status">${v3L('Open or closed: follow the live DOC notice for this track.', '开放或关闭：以 DOC 对这条步道的实时公告为准。')}</p>` : '');
  const note = pick(r.safety);
  return `<section class="journey-section v3-safety" id="journey-safety"><p class="section-label">${v3L('SAFETY', '安全')}</p><h2>${v3L('In an emergency call 111', '紧急情况拨 111')}</h2>${note ? `<p class="v3-lead">${escapeHtml(note)} ${v3Badge(r, 'safety')}</p>` : `<p class="v3-lead">${v3L('We have no checked safety note for this route yet.', '这条线路暂无已核实的安全提示。')} ${v3Badge(r, 'safety')}</p>`}${statusLine}<div class="journey-source-list">${links.map(([url, text]) => v3Link(url, `<span>${text}</span><span>↗</span>`)).join('')}</div></section>`;
}
function v3SourceLinks(r) {
  const role = {primary: ['Primary source', '一手来源'], highlights: ['Used for highlights only', '仅用于看点'], supplementary: ['Background only', '仅作背景']};
  return r.sources.map(s => v3Link(s.url, `<span>${escapeHtml(lang === 'zh' ? (s.labelZh || s.label) : s.label)} <em class="v3-role">${v3L(...(role[s.role] || role.primary))}</em></span><span>↗</span>`)).join('');
}

/* ---------- route map fallback for routes that have no hand-drawn sketch yet ---------- */
function v3RouteMapFallback(r) {
  const box = document.querySelector('#routeMap');
  if (!box || box.innerHTML.trim()) return;
  const line = window.V3_ROUTE_LINES?.[r.id];
  if (!line) { box.innerHTML = `<p class="v3-map-note">${v3L('No route sketch yet. Use the map on the official page.', '暂无线路示意图，请使用官方页面上的地图。')}</p>`; return; }
  const W = 900, H = 420, pad = 40, pts = line.flat();
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const k = Math.cos((Math.min(...lats) + Math.max(...lats)) / 2 * Math.PI / 180);
  const x0 = Math.min(...lons) * k, x1 = Math.max(...lons) * k, y0 = Math.min(...lats), y1 = Math.max(...lats);
  const scale = Math.min((W - 2 * pad) / Math.max(x1 - x0, 1e-4), (H - 2 * pad) / Math.max(y1 - y0, 1e-4));
  const ox = (W - (x1 - x0) * scale) / 2, oy = (H - (y1 - y0) * scale) / 2;
  const d = line.map(part => part.map((p, i) => `${i ? 'L' : 'M'}${(ox + (p[0] * k - x0) * scale).toFixed(1)} ${(H - oy - (p[1] - y0) * scale).toFixed(1)}`).join('')).join('');
  box.innerHTML = `<figure class="v3-line-map"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(routeTitle(r))}"><path d="${d}" fill="none" stroke="#9b4e2d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg><figcaption>${v3L('Track line: DOC Walking and Tramping Experiences (routes), Department of Conservation, CC BY 4.0. Simplified and redrawn; not for navigation.', '步道线：DOC Walking and Tramping Experiences（routes），新西兰保护部，CC BY 4.0。经简化重绘，不可用于导航。')}</figcaption></figure>`;
}
function v3AfterJourney(r) { v3LoadSports().then(() => { const el = document.querySelector('#journey-sports'); if (el) el.outerHTML = v3SportsPanel(r); }); }

/* ---------- sports (OpenStreetMap, pre-fetched) ---------- */
const V3_SPORT = {tennis: ['Tennis', '网球'], golf: ['Golf', '高尔夫'], basketball: ['Basketball', '篮球']};
let v3Sports = null, v3SportsPromise = null, v3SportFilter = 'all';
function v3LoadSports() {
  v3SportsPromise ||= Promise.all([fetch('data/sports/index.json').then(x => x.json()), fetch('data/sports/routes.json').then(x => x.json())]).then(([index, routesNear]) => { v3Sports = {index, routesNear}; }).catch(() => { v3Sports = {index: null, routesNear: {}}; });
  return v3SportsPromise;
}
function v3VenueCard(v, fromLabel) {
  const type = v3L(...V3_SPORT[v.type]);
  const facts = [];
  if (v.access) facts.push(v3L({yes: 'Public access', public: 'Public access', permissive: 'Open by permission of the owner', customers: 'Customers only', members: 'Members only', private: 'Private'}[v.access] || 'Access: ' + v.access, {yes: '公共开放', public: '公共开放', permissive: '经业主许可开放', customers: '仅限顾客', members: '仅限会员', private: '私人'}[v.access] || '开放情况：' + v.access));
  if (v.lit) facts.push(v.lit === 'yes' ? v3L('Lit', '有灯光') : v.lit === 'no' ? v3L('Not lit', '无灯光') : '');
  if (v.courts) facts.push(v3L(`${v.courts} courts`, `${v.courts} 片场地`));
  if (v.holes) facts.push(v3L(`${v.holes} holes`, `${v.holes} 洞`));
  if (v.surface) facts.push(v3L('Surface: ', '地面：') + escapeHtml(v.surface.replace(/_/g, ' ')));
  const img = v.image ? `<img src="${escapeHtml(v.image.src)}" alt="${escapeHtml(v.name || type)}" loading="lazy">` : `<img src="assets/sports/placeholder-${v.type}.svg" alt="" loading="lazy">`;
  const credit = v.image ? `<p class="v3-credit">${v3L('Photo', '照片')}: ${v3Link(v.image.page, escapeHtml(v.image.author))} · ${v3Link(v.image.licenseUrl, escapeHtml(v.image.license))} · Wikimedia Commons</p>` : `<p class="v3-credit">${v3L('Illustration only. No licensed photo of this venue was found.', '仅为示意图，未找到这处场地可授权使用的照片。')}</p>`;
  return `<article class="v3-venue" data-sport="${v.type}"><div class="v3-venue-art">${img}<span class="v3-kind">${type}</span></div><div class="v3-venue-body"><h3>${v.name ? escapeHtml(v.name) : `<span class="v3-missing">${v3L('Unnamed in OpenStreetMap', 'OpenStreetMap 中未命名')}</span>`}</h3><p class="v3-venue-where">${escapeHtml(v.addr || `${v.lat.toFixed(4)}, ${v.lon.toFixed(4)}`)}</p><p class="v3-venue-dist">${v.km < 1 ? Math.round(v.km * 1000) + ' m' : v.km.toFixed(1) + ' km'} ${fromLabel}</p>${facts.filter(Boolean).length ? `<p class="v3-venue-facts">${facts.filter(Boolean).map(f => `<span>${f}</span>`).join('')}</p>` : ''}${credit}${v3Link(`https://www.openstreetmap.org/${v.osm}`, v3L('View on OpenStreetMap ↗', '在 OpenStreetMap 查看 ↗'), 'text-link')}</div></article>`;
}
function v3SportFilters(counts) {
  return `<div class="filters v3-sport-filters" role="group" aria-label="${v3L('Sport', '运动类型')}">${['all', 'tennis', 'golf', 'basketball'].map(k => `<button type="button" class="filter${v3SportFilter === k ? ' active' : ''}" data-sport-filter="${k}" aria-pressed="${v3SportFilter === k}">${k === 'all' ? v3L('All', '全部') : v3L(...V3_SPORT[k])} (${k === 'all' ? counts.all : counts[k] || 0})</button>`).join('')}</div>`;
}
const v3OsmCredit = () => `<p class="v3-attribution">${v3L('Venue data', '场地数据')} ${v3Link('https://www.openstreetmap.org/copyright', '© OpenStreetMap contributors')}, ${v3Link('https://opendatacommons.org/licenses/odbl/', 'ODbL 1.0')}. ${v3L(`Fetched ${v3Sports?.index?.fetchedAt?.slice(0, 10) || ''} and stored with the site; nothing is requested from OpenStreetMap while you browse. Details may be out of date: check with the venue.`, `于 ${v3Sports?.index?.fetchedAt?.slice(0, 10) || ''} 抓取后随站点保存，浏览时不会向 OpenStreetMap 发请求。信息可能过期，请向场地确认。`)}</p>`;
function v3SportsPanel(r) {
  const head = `<section class="journey-section v3-sports" id="journey-sports"><p class="section-label">${v3L('SPORTS NEARBY', '沿线运动场地')}</p><h2>${v3L('Tennis, golf and basketball near this route', '这条线路附近的网球、高尔夫和篮球场地')}</h2>`;
  if (!v3Sports) return head + `<p class="v3-lead">${v3L('Loading…', '加载中……')}</p></section>`;
  const near = v3Sports.routesNear[r.id];
  if (!near) return head + `<p class="v3-lead">${v3L('No route line is available for this route, so nearby venues cannot be worked out yet.', '这条线路暂无可用的线路坐标，无法计算沿线场地。')}</p></section>`;
  const list = near.venues.filter(v => v3SportFilter === 'all' || v.type === v3SportFilter);
  const counts = {all: near.venues.length}; near.venues.forEach(v => counts[v.type] = (counts[v.type] || 0) + 1);
  return head + `<p class="v3-lead">${v3L(`Within ${near.bufferKm} km of the route line (${near.lineSource}).`, `线路两侧 ${near.bufferKm} 公里以内（线路坐标：${near.lineSourceZh}）。`)}</p>${v3SportFilters(counts)}${list.length ? `<div class="v3-venue-grid">${list.slice(0, 12).map(v => v3VenueCard(v, v3L('from the route', '距线路'))).join('')}</div>${list.length > 12 ? `<p class="v3-lead">${v3L(`Showing the nearest 12 of ${list.length}.`, `共 ${list.length} 处，显示最近的 12 处。`)}</p>` : ''}` : `<p class="v3-lead">${v3L('OpenStreetMap lists no venue of this kind inside the buffer.', 'OpenStreetMap 在这个范围内没有收录这类场地。')}</p>`}${v3OsmCredit()}</section>`;
}

/* ---------- pages added in v3 ---------- */
const V3_REGION_ZH = {northland: '北地', auckland: '奥克兰', coromandel: '科罗曼德', waikato: '怀卡托', 'bay-of-plenty': '丰盛湾', 'east-coast': '东海岸', 'central-north-island': '北岛中部', taranaki: '塔拉纳基', 'manawatu-whanganui': '马纳瓦图／旺格努伊', 'hawkes-bay': '霍克斯湾', wairarapa: '怀拉拉帕', 'wellington-kapiti': '惠灵顿／卡皮蒂', 'nelson-tasman': '纳尔逊／塔斯曼', marlborough: '马尔堡', 'west-coast': '西海岸', canterbury: '坎特伯雷', otago: '奥塔哥', southland: '南地', fiordland: '峡湾地区', 'chatham-islands': '查塔姆群岛', unknown: '未归类'};
const v3Region = k => lang === 'zh' ? (V3_REGION_ZH[k] || k) : (v3Tracks?.regions[k] || k);
let v3Tracks = null, v3TrackState = {island: 'all', region: 'all', time: 'all', q: '', shown: 60};
const V3_BUCKET = {short: ['Under 1 hour', '1 小时以内'], half: ['1–4 hours', '1–4 小时'], day: ['Over 4 hours, same day', '4 小时以上（当天）'], multi: ['Overnight or longer', '过夜或多日'], unknown: ['Time not stated', '未注明用时']};
function v3RenderTracks() {
  const host = document.querySelector('#trackDirectory'); if (!host) return;
  if (!v3Tracks) { host.innerHTML = `<p class="v3-lead">${v3L('Loading the DOC track directory…', '正在加载 DOC 步道目录……')}</p>`; fetch('data/doc-tracks.json').then(x => x.json()).then(d => { v3Tracks = d; v3RenderTracks(); }).catch(() => { host.innerHTML = `<p class="v3-lead">${v3L('The directory file could not be loaded.', '目录文件加载失败。')}</p>`; }); return; }
  const m = v3Tracks.meta, S = v3TrackState;
  const regions = [...new Set(v3Tracks.tracks.filter(x => S.island === 'all' || x.island === S.island).map(x => x.region))].sort();
  if (S.region !== 'all' && !regions.includes(S.region)) S.region = 'all';
  const q = S.q.trim().toLowerCase();
  if (!v3TrackState.urlReady) { v3TrackState.urlReady = true; const initial = new URLSearchParams(location.search).get('q'); if (initial != null) { v3TrackState.q = initial; } }
  const query = v3TrackState.q.trim();
  const list = v3Tracks.tracks.filter(x => (S.island === 'all' || x.island === S.island) && (S.region === 'all' || x.region === S.region) && (S.time === 'all' || x.bucket === S.time) && (!query || (window.v4TrackMatches ? window.v4TrackMatches(x, query) : x.name.toLowerCase().includes(query.toLowerCase()))));
  const btn = (group, key, label) => `<button type="button" class="filter${S[group] === key ? ' active' : ''}" data-track-${group}="${key}" aria-pressed="${S[group] === key}">${label}</button>`;
  const row = x => {
    const official = routes.find(r => r.id === x.featured || (r.closures || []).some(c => c.url === x.url))?.closures?.filter(c => c.url === x.url || c.scope === 'whole') || [];
    const on = official.find(c => v3ClosureActive(c));
    const st = x.status, part = st && st.state === 'closed' && st.closed < st.segments;
    const status = on ? `<span class="v3-status-pill v3-status-closed">${on.scope === 'section' ? v3L('Section closed now (DOC notice)', '部分路段当前封闭中（DOC 公告）') : v3L('Closed now (DOC notice)', '当前封闭中（DOC 公告）')}</span>`
      : official.length ? `<span class="v3-status-pill">${v3L('Seasonal closure: ', '季节性封闭：')}${escapeHtml(official.map(v3ClosureWhen).join('; '))}</span>`
      : st ? `<span class="v3-status-pill v3-status-${st.state}">${st.state !== 'closed' ? v3L('Open', '开放') : part ? v3L(`Some segments closed (${st.closed} of ${st.segments})`, `有关闭路段（${st.closed}/${st.segments} 段）`) : v3L(`Closed (all ${st.segments} segments)`, `关闭（全部 ${st.segments} 段）`)}</span>`
      : `<span class="v3-status-pill">${v3L('No status data', '无状态数据')}</span>`;
    const titleBits = x.zh ? `${escapeHtml(x.zh)} <span>${escapeHtml(x.name)}</span>` : `${escapeHtml(x.name)} <abbr class="v3-tv" title="${v3L('No Chinese name is published here.','这里不编造中文名。')}">${v3L('To verify','待核')}</abbr>`;
    const heading = x.featured ? `<a href="${routeUrl(x.featured)}">${titleBits}</a> <a href="${routeUrl(x.featured)}"><em class="v3-role">${v3L('Featured guide', '有精选攻略')}</em></a>` : titleBits;
    return `<article class="v3-track"><div><h3>${heading}</h3><p class="v3-track-region">${v3L(x.island === 'north' ? 'North Island' : x.island === 'south' ? 'South Island' : 'Other islands', x.island === 'north' ? '北岛' : x.island === 'south' ? '南岛' : '其他岛屿')} · ${escapeHtml(v3Region(x.region))}</p></div><dl><div><dt>${v3L('Time (DOC dataset)', '用时（DOC 数据集）')}</dt><dd>${x.time ? escapeHtml(x.time) : `<span class="v3-missing">—</span>`} <abbr class="v3-tv" title="${v3L('Copied from the DOC dataset, which is no longer maintained and has known errors. Check the DOC page.', '取自 DOC 数据集，该数据集已停更且有已知错值，请以 DOC 页面为准。')}">${v3L('To verify', '待核实')}</abbr></dd></div><div><dt>${v3L('Distance', '距离')}</dt><dd>${x.km ? escapeHtml(x.km) : `<span class="v3-missing">${v3L('Not in the dataset', '数据集未提供')}</span> <abbr class="v3-tv">${v3L('To verify', '待核实')}</abbr>`}</dd></div><div><dt>${v3L('Grade (DOC dataset)', '难度（DOC 数据集）')}</dt><dd>${x.difficulty ? escapeHtml(x.difficulty) : '—'}</dd></div><div><dt>${v3L('Status', '状态')}</dt><dd>${status}</dd></div></dl>${v3Link(x.url, v3L('DOC page ↗', 'DOC 页面 ↗'), 'text-link')}</article>`;
  };
  host.innerHTML = `<div class="v3-notice"><p><strong>${v3L('Open or closed: the live DOC notice always takes precedence.', '开放或关闭：以 DOC 实时公告为准。')}</strong> ${v3L(`Status comes from DOC Tracks open data read on ${m.tracksReadAt} and matched to each walk by location, so it can be wrong or out of date.`, `状态取自 ${m.tracksReadAt} 读取的 DOC Tracks 开放数据，按位置匹配到各步道，可能有误或已过期。`)} ${v3Link('https://www.doc.govt.nz/parks-and-recreation/know-before-you-go/alerts/', v3L('DOC alerts ↗', 'DOC 公告页 ↗'))}</p><p>${v3L(`${m.count} walks from the DOC dataset “${m.dataset}” (read ${m.readAt}). DOC has stopped maintaining it and it omits some tracks, including the Milford and Heaphy tracks; those are in our featured routes. Times are the dataset's own values and have not been checked page by page. The dataset gives no distance.`, `共 ${m.count} 条，取自 DOC 数据集「${m.dataset}」（读取于 ${m.readAt}）。DOC 已停止维护该数据集，其中缺少米尔福德步道、希菲步道等，这些已收在本站精选线路里。用时为数据集原值，未逐条回 DOC 页面核对；数据集不提供距离。`)}</p></div>
  <div class="catalogue-filters v3-track-filters"><div class="island-filter" role="group" aria-label="${v3L('Island', '岛屿')}">${btn('island', 'all', v3L('All New Zealand', '全国'))}${btn('island', 'north', v3L('North Island', '北岛'))}${btn('island', 'south', v3L('South Island', '南岛'))}</div><div class="filters" role="group" aria-label="${v3L('Time', '用时')}">${btn('time', 'all', v3L('Any length', '不限用时'))}${Object.entries(V3_BUCKET).map(([k, l]) => btn('time', k, v3L(...l))).join('')}</div><div class="v3-track-controls"><label>${v3L('Region', '地区')} <select id="trackRegion"><option value="all">${v3L('All regions', '全部地区')}</option>${regions.map(k => `<option value="${k}"${S.region === k ? ' selected' : ''}>${escapeHtml(v3Region(k))}</option>`).join('')}</select></label><label>${v3L('Name', '名称')} <input id="trackSearch" type="search" value="${escapeHtml(S.q)}" placeholder="${v3L('Search by name', '按名称搜索')}"></label><span class="route-count" role="status" aria-live="polite">${list.length} ${v3L('walks', '条步道')}</span></div></div>
  <div class="v3-track-list">${list.slice(0, S.shown).map(row).join('') || `<p class="v3-lead">${v3L('No walk matches these filters.', '没有符合条件的步道。')}</p>`}</div>${list.length > S.shown ? `<button type="button" class="outline-button" id="trackMore">${v3L(`Show 60 more (${list.length - S.shown} left)`, `再显示 60 条（还有 ${list.length - S.shown} 条）`)}</button>` : ''}
  <p class="v3-attribution">${v3L('Source', '数据来源')}: ${v3Link(m.datasetUrl, escapeHtml(m.dataset))} ${v3L('and', '与')} ${v3Link(m.tracksUrl, 'DOC Tracks')}, ${v3L('Department of Conservation Te Papa Atawhai, licensed for reuse under', '新西兰保护部 Te Papa Atawhai，许可：')} ${v3Link('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}. ${v3L('Regrouped by region and time band by Pounamu Atlas.', '由绿石之地按地区和用时重新归类。')}</p>`;
  const search = document.querySelector('#trackSearch');
  search?.addEventListener('input', e => { S.q = e.target.value; S.shown = 60; clearTimeout(v3RenderTracks.timer); v3RenderTracks.timer = setTimeout(() => { v3RenderTracks(); const el = document.querySelector('#trackSearch'); el?.focus(); el?.setSelectionRange(S.q.length, S.q.length); }, 250); });
  document.querySelector('#trackRegion')?.addEventListener('change', e => { S.region = e.target.value; S.shown = 60; v3RenderTracks(); });
  document.querySelector('#trackMore')?.addEventListener('click', () => { S.shown += 60; v3RenderTracks(); });
}
function v3RenderCities() {
  const host = document.querySelector('#cityList'); if (!host) return;
  if (!v3Sports) { host.innerHTML = `<p class="v3-lead">${v3L('Loading…', '加载中……')}</p>`; v3LoadSports().then(v3RenderCities); return; }
  if (!v3Sports.index) { host.innerHTML = `<p class="v3-lead">${v3L('The sports data file could not be loaded.', '运动场地数据加载失败。')}</p>`; return; }
  host.innerHTML = `<div class="v3-city-grid">${v3Sports.index.cities.map(c => `<a class="v3-city" href="${pageUrl('city', {id: c.id})}"><p class="route-place">${v3L(c.island === 'north' ? 'North Island' : 'South Island', c.island === 'north' ? '北岛' : '南岛')}</p><h3>${escapeHtml(v3L(c.name, c.zh))}</h3><p class="v3-city-counts">${Object.keys(V3_SPORT).map(k => `<span>${v3L(...V3_SPORT[k])} ${c.counts[k] || 0}</span>`).join('')}</p><p class="v3-venue-dist">${v3L(`within ${c.radiusKm} km of the centre`, `市中心 ${c.radiusKm} 公里内`)} ↗</p></a>`).join('')}</div>${v3OsmCredit()}`;
}
let v3City = null;
function v3RenderCity() {
  const host = document.querySelector('#cityDetail'); if (!host) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!v3Sports) { v3LoadSports().then(v3RenderCity); return; }
  const meta = v3Sports.index?.cities.find(c => c.id === id);
  if (!meta) { host.innerHTML = `<section class="page-intro section"><h1>${v3L('City not found', '没有找到这座城市')}</h1><a class="text-link" href="${pageUrl('cities')}">${v3L('All cities ↗', '全部城市 ↗')}</a></section>`; return; }
  if (!v3City || v3City.id !== id) { fetch(`data/sports/${id}.json`).then(x => x.json()).then(d => { v3City = d; v3RenderCity(); }); host.innerHTML = `<section class="page-intro section"><p class="v3-lead">${v3L('Loading…', '加载中……')}</p></section>`; return; }
  const all = v3City.venues, list = all.filter(v => v3SportFilter === 'all' || v.type === v3SportFilter);
  const counts = {all: all.length}; all.forEach(v => counts[v.type] = (counts[v.type] || 0) + 1);
  document.title = v3L(meta.name, meta.zh) + ' — 绿石之地 · Pounamu Atlas';
  host.innerHTML = `<section class="page-intro section"><p class="section-label">${v3L('SPORTS NEARBY', '城市运动')} / ${v3L(meta.island === 'north' ? 'North Island' : 'South Island', meta.island === 'north' ? '北岛' : '南岛')}</p><h1>${escapeHtml(v3L(meta.name, meta.zh))}</h1><div class="page-intro-bottom"><p>${v3L(`Tennis courts, golf courses and basketball courts within ${meta.radiusKm} km of the city centre, nearest first.`, `市中心 ${meta.radiusKm} 公里内的网球场、高尔夫球场和篮球场，由近到远。`)}</p><a class="outline-button" href="${pageUrl('cities')}">${v3L('All cities', '全部城市')}</a></div></section><section class="catalogue section">${v3SportFilters(counts)}<div class="v3-venue-grid">${list.slice(0, v3City.shown || 24).map(v => v3VenueCard(v, v3L('from the centre', '距市中心'))).join('') || `<p class="v3-lead">${v3L('OpenStreetMap lists no venue of this kind here.', 'OpenStreetMap 在这里没有收录这类场地。')}</p>`}</div>${list.length > (v3City.shown || 24) ? `<button type="button" class="outline-button" id="venueMore">${v3L(`Show 24 more (${list.length - (v3City.shown || 24)} left)`, `再显示 24 处（还有 ${list.length - (v3City.shown || 24)} 处）`)}</button>` : ''}${v3OsmCredit()}<p class="v3-attribution">${v3L(`Centre point: OpenStreetMap place node “${meta.name}”.`, `市中心坐标：OpenStreetMap 地点节点「${meta.name}」。`)}</p></section>`;
  document.querySelector('#venueMore')?.addEventListener('click', () => { v3City.shown = (v3City.shown || 24) + 24; v3RenderCity(); });
}
function v3Footer() {
  document.querySelectorAll('.footer').forEach(f => {
    let p = f.querySelector('.v3-licence'); if (!p) { p = document.createElement('p'); p.className = 'v3-licence'; f.append(p); }
    p.innerHTML = v3L(`Code: MIT. Unless marked otherwise, our own text and route notes © Pounamu Atlas, CC BY 4.0. Not covered by that licence: coordinates and OSRM drive times from OpenStreetMap (${v3Link('https://www.openstreetmap.org/copyright', '© OpenStreetMap contributors')}, ODbL); track information sourced from the Department of Conservation (NZ), CC BY 4.0; data sourced from the LINZ Data Service licensed for reuse under CC BY 4.0; itinerary ideas referenced from newzealand.com (© Tourism New Zealand, linked only). Photos carry their own licences. `, `代码：MIT。除另有标注外，本站自写的文字与线路说明 © 绿石之地，CC BY 4.0。以下内容不在此许可内：取自 OpenStreetMap 的坐标与 OSRM 车程（${v3Link('https://www.openstreetmap.org/copyright', '© OpenStreetMap 贡献者')}，ODbL）；来源于新西兰保护部 Department of Conservation (NZ) 的步道信息（CC BY 4.0）；取自 LINZ Data Service 并按 CC BY 4.0 许可再利用的数据；参考 newzealand.com 的行程思路（© Tourism New Zealand，只链接）。照片各按原许可。`) + v3Link('CONTENT-LICENSE.md', v3L('Licences and attribution ↗', '许可与署名 ↗'));
  });
}
function v3PrepareExtras() {
  const grid = document.querySelector('#prepareGrid'); if (!grid || document.querySelector('.v3-prepare')) return;
  grid.insertAdjacentHTML('afterend', `<div class="v3-prepare v3-notice"></div>`);
}
function v3Render() {
  v3Footer(); v3PrepareExtras();
  const prep = document.querySelector('.v3-prepare');
  if (prep) prep.innerHTML = `<p><strong>${v3L('In an emergency call 111.', '紧急情况拨 111。')}</strong> ${v3L('Official safety information:', '官方安全信息：')} ${v3Link('https://www.mountainsafety.org.nz/', 'NZ Mountain Safety Council ↗')} · ${v3Link('https://www.doc.govt.nz/parks-and-recreation/know-before-you-go/alerts/', v3L('DOC alerts ↗', 'DOC 公告 ↗'))} · ${v3Link('https://www.metservice.com/warnings/home', v3L('MetService warnings ↗', 'MetService 天气预警 ↗'))} · ${v3Link('https://www.journeys.nzta.govt.nz/highway-conditions/traffic-and-travel-list-view', v3L('NZTA road conditions ↗', 'NZTA 路况 ↗'))}</p>`;
  v3RenderTracks(); v3RenderCities(); v3RenderCity();
}
document.addEventListener('click', e => {
  const sport = e.target.closest?.('[data-sport-filter]');
  if (sport) { v3SportFilter = sport.dataset.sportFilter; if (v3City) v3City.shown = 24; if (page === 'route') { const r = routes.find(x => x.id === qs.get('id')); const el = document.querySelector('#journey-sports'); if (r && el) el.outerHTML = v3SportsPanel(r); } else v3RenderCity(); return; }
  const tb = e.target.closest?.('[data-track-island],[data-track-time]');
  if (tb) { if (tb.dataset.trackIsland) v3TrackState.island = tb.dataset.trackIsland; if (tb.dataset.trackTime) v3TrackState.time = tb.dataset.trackTime; v3TrackState.shown = 60; v3RenderTracks(); }
});
window.v3Render = v3Render;
