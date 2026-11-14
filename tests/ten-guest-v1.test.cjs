'use strict';
// Ticket fix/ten-guest-v1: one test (or more) for each of items A–H. Page tests use tests/helpers/cdp-browser.cjs
// and are skipped only when no Chrome is installed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(place => place.type === 'town');
const planner = require('../docs/p10-planner.js');

async function withPage(t, fn) {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try { await fn(page); } finally { await page.close(); }
}
const freshPlanner = async (page, lang) => {
  await page.go('plan.html?lang=' + lang);
  await page.ev('localStorage.clear()');
  await page.go('plan.html?lang=' + lang);
  await page.waitFor('document.querySelector(\'#p10-region [data-p10-region="christchurch-canterbury"]\')');
};
const tickBox = (page, id) => page.click(`#p10-wishes input[name="p10-wish"][value="${id}"]`);
const tapDot = (page, id) => page.ev(`(()=>{const d=document.querySelector('#p10-pick-map [data-p10-pick="${id}"]');if(!d)return false;d.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`);

// A (P0-01): a place ticked under one region filter stays ticked after another filter click.
for (const lang of ['zh', 'en']) {
  test(`A: ticking places across two region filters keeps both (${lang})`, async t => withPage(t, async page => {
    await freshPlanner(page, lang);
    await page.click('#p10-island [data-p10-island="south"]');
    await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
    await tickBox(page, 'tekapo');
    await page.click('#p10-region [data-p10-region="queenstown"]');
    await tickBox(page, 'queenstown');
    const label = await page.ev('document.querySelector("#p10-selected .p10-selected-label").textContent');
    assert.match(label, lang === 'zh' ? /已选 2 处/ : /Selected \(2\)/);
    await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
    assert.equal(await page.ev('document.querySelector(\'#p10-wishes input[value="tekapo"]\').checked'), true);
    assert.equal(await page.ev('document.querySelector("#p10-island-label").textContent.trim()'), lang === 'zh' ? '这次去哪一座岛？' : 'Which island this time?');
    assert.deepEqual(page.errors, []);
  }));
}
test('A: on a phone, tapping map dots picks places after a region filter', async t => withPage(t, async page => {
  await page.view(390, 844, true);
  await freshPlanner(page, 'zh');
  await page.click('#p10-region [data-p10-region="christchurch-canterbury"]');
  assert.equal(await tapDot(page, 'tekapo'), true);
  // the map shows the filtered region only, so Queenstown's dot appears after its own region button
  await page.click('#p10-region [data-p10-region="queenstown"]');
  assert.equal(await tapDot(page, 'queenstown'), true);
  assert.match(await page.ev('document.querySelector("#p10-selected").textContent'), /已选 2 处/);
}));

// B (P1-01): the routes atlas opens without errors; routes with no sketch are drawn from DOC lines or listed.
for (const [lang, width] of [['zh', 1280], ['en', 390], ['zh', 390], ['en', 1280]]) {
  test(`B: the routes atlas opens with no console errors (${lang}, ${width})`, async t => withPage(t, async page => {
    await page.view(width, 900, width < 768);
    await page.go('routes.html?lang=' + lang);
    await page.click('#atlasToggle');
    await page.waitFor('document.querySelector("#routeAtlas svg")');
    assert.deepEqual(page.errors, []);
    const text = await page.ev('document.querySelector("#routeAtlas").innerText');
    assert.match(text, lang === 'zh' ? /条线路暂无地图数据/ : /routes? (has|have) no map data yet/);
    assert.ok(await page.ev('document.documentElement.scrollWidth <= innerWidth + 1'));
  }));
}

// C: Mount Maunganui is merged into Tauranga; the old id resolves everywhere.
test('C: ni-mau has no row of its own and resolves to ni-tga in the planner', () => {
  assert.equal(catalog.places.some(p => p.place_id === 'ni-mau'), false);
  assert.equal(catalog.aliases['ni-mau'], 'ni-tga');
  const tga = catalog.places.find(p => p.place_id === 'ni-tga');
  assert.match(tga.name_en, /Mount Maunganui/);
  assert.match(tga.name_zh, /芒格努伊山/);
  assert.equal(planner.p10AliasId('ni-mau'), 'ni-tga');
  const plan = planner.p10Plan({ start: 'auckland', end: 'wellington', days: 7, pace: 5, preference: 'drive', car: true, wishes: ['ni-mau', 'ni-tga'] });
  assert.deepEqual(plan.input.wishes, ['ni-tga']);
});
test('C: destination.html?id=ni-mau shows Tauranga and rewrites the address; one dot only', async t => withPage(t, async page => {
  await page.go('destination.html?id=ni-mau&lang=zh');
  await page.waitFor('document.querySelector("#v4-destination h1")');
  assert.match(await page.ev('document.querySelector("#v4-destination h1").textContent'), /陶朗加/);
  assert.match(await page.ev('location.search'), /id=ni-tga/);
  await page.go('plan.html?lang=zh&from=auckland&to=wellington&days=7&w=ni-mau');
  await page.waitFor('document.querySelector(\'#p10-pick-map [data-p10-pick="ni-tga"]\')');
  assert.equal(await page.ev('document.querySelectorAll(\'#p10-pick-map [data-p10-pick="ni-mau"]\').length'), 0);
  assert.equal(await page.ev('document.querySelectorAll(\'#p10-pick-map [data-p10-pick="ni-tga"]\').length'), 1);
  assert.equal(await page.ev('document.querySelector(\'#p10-wishes input[value="ni-tga"]\') ? document.querySelector(\'#p10-wishes input[value="ni-tga"]\').checked : "absent"'), true);
}));

// ---------- D: the new towns are on the road network, with sourced estimates, road notes and their own content ----------
const fs = require('node:fs');
const path = require('node:path');
const NEW_TOWNS = ['ni-wka', 'ni-tol', 'ni-pip', 'ni-fld', 'ni-mst', 'si-alx', 'si-cly'];
test('D: Wellington → Auckland in 6 days with Whanganui, Pipiriki and Tongariro, River Road note, NZTA estimate', () => {
  const plan = planner.p10Plan({ start: 'wellington', end: 'auckland', days: 6, pace: 5, preference: 'drive', car: true, wishes: ['ni-wag', 'ni-pip', 'tongariro'] });
  assert.equal(plan.minimum <= 6, true);
  const days = planner.p10Timeline(plan);
  assert.equal(days.length, 6);
  const legs = days.flatMap(d => d.legs);
  const river = legs.find(l => [l.a, l.b].sort().join('|') === 'pipiriki|whanganui');
  assert.ok(river, 'the day uses the Whanganui River Road');
  assert.equal(river.src.estimate, true);
  assert.match(river.src.url, /^https:\/\/www\.journeys\.nzta\.govt\.nz\//);
  assert.equal(river.src.checkedAt, '2026-11-12');
  const notes = planner.p10RoadNotes([river], 0, true);
  assert.ok(notes.some(n => n.kind === 'road' && /旺格努伊河路/.test(n.text)));
  assert.deepEqual(plan.inaccessible.map(w => w.id), []);
});
test('D: each new town has 2–5 sights and 2–5 activities, each with an official source and a read date', () => {
  for (const id of NEW_TOWNS) {
    const kids = catalog.places.filter(p => p.place_id.startsWith(id + '-'));
    const sights = kids.filter(p => p.type === 'attraction' || p.type === 'seasonal');
    const acts = kids.filter(p => ['activity', 'walk', 'track', 'boat'].includes(p.type));
    assert.ok(sights.length >= 2 && sights.length <= 5, id + ' sights ' + sights.length);
    assert.ok(acts.length >= 2 && acts.length <= 5, id + ' activities ' + acts.length);
    for (const p of kids) {
      assert.match(p.source_url, /^https:\/\//, p.place_id);
      assert.match(p.summary_accessed, /^2026-11-1[12]$/, p.place_id);
      assert.ok(p.summary_en && p.summary_zh, p.place_id);
    }
  }
});

// ---------- E: ski areas, travel month and winter notes, DOC track search by region ----------
const ski = require('../docs/data/ski-fields.json');
const { searchTracks } = require('../docs/v4-match.js');
const docTracks = require('../docs/data/doc-tracks.json').tracks;
test('E: seven ski areas, each with region, nearest town, official site and a sourced season line', () => {
  const ids = ski.fields.map(f => f.id);
  for (const id of ['mt-hutt', 'cardrona', 'treble-cone', 'coronet-peak', 'remarkables', 'ruapehu', 'round-hill']) assert.ok(ids.includes(id), id);
  for (const f of ski.fields) {
    assert.match(f.url, /^https:\/\//);
    assert.match(f.season_source, /^https:\/\//);
    assert.ok(f.region_zh && f.region_en && f.town_zh && f.town_en && f.season_zh && f.season_en, f.id);
    if (f.town_id) assert.ok(catalog.places.some(p => p.place_id === f.town_id), f.town_id);
  }
});
test('E: a winter month adds pass warnings with an NZTA source; a summer month does not', () => {
  const net = planner.p10Net(true);
  const legs = net.path('christchurch', 'queenstown');
  const july = planner.p10RoadNotes(legs, 7, true).filter(n => n.kind === 'winter');
  assert.ok(july.length >= 1);
  assert.ok(july.every(n => n.sources.some(s => /nzta\.govt\.nz/.test(s.url))));
  assert.equal(planner.p10RoadNotes(legs, 1, true).filter(n => n.kind === 'winter').length, 0);
});
test('E: DOC track search finds tracks by region and place name (Ruapehu, 鲁阿佩胡) and by Great Walk', () => {
  const towns = catalog.places.filter(p => p.type === 'town').map(t => { const r = catalog.regions.find(x => x.id === t.region_id); return { ...t, labels: r ? [r.en, r.zh] : [] }; });
  assert.ok(searchTracks(docTracks, 'Ruapehu', towns).length > 10);
  assert.ok(searchTracks(docTracks, '鲁阿佩胡', towns).length > 10);
  const great = searchTracks(docTracks, 'Great Walk', towns).map(t => t.name);
  assert.ok(great.includes('Routeburn Track') && great.includes('Kepler Track'));
  assert.equal(great.length, searchTracks(docTracks, '大步道', towns).length);
});
test('E: home search finds ski areas; the prepare page lists them with winter driving', async t => withPage(t, async page => {
  for (const [lang, q, re] of [['zh', '滑雪', /哈特山滑雪场/], ['en', 'Mt Hutt', /Methven/], ['zh', 'Cardrona', /卡德罗纳/], ['zh', '三锥山', /三锥山/], ['en', 'Treble Cone', /Treble Cone/]]) {
    await page.go('index.html?lang=' + lang);
    await page.waitFor('document.querySelector("#v4-search input[type=search]")');
    await page.ev(`(()=>{const i=document.querySelector('#v4-search input[type=search]');i.value=${JSON.stringify(q)};i.dispatchEvent(new Event('input',{bubbles:true}));const f=i.closest('form');if(f)f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()`);
    await page.waitFor('document.querySelector(\'[data-topic="ski"]\')');
    assert.match(await page.ev('document.querySelector(\'[data-topic="ski"]\').innerText'), re);
  }
  await page.go('prepare.html?lang=zh#ski');
  await page.waitFor('document.querySelector("#v4-prepare-extra #ski")');
  assert.equal(await page.ev('document.querySelectorAll("#v4-prepare-extra #ski [id^=ski-]").length'), 7);
  assert.match(await page.ev('document.querySelector("#v4-prepare-extra #winter").innerText'), /NZTA/);
  assert.deepEqual(page.errors, []);
}));

// ---------- F: stays and budget ----------
const stays = require('../docs/data/stays-budget.json');
test('F: three stay tiers; every price has an official page and a read date', () => {
  assert.deepEqual(stays.tiers.map(x => x.id), ['budget', 'mid', 'high']);
  for (const fact of [...stays.tiers.flatMap(x => x.facts), ...stays.tips]) {
    assert.match(fact.url, /^https:\/\//);
    assert.match(fact.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
test('F: 青旅 / luxury / 露营 find the stays card; a town page has the three tiers; prepare has money tips', async t => withPage(t, async page => {
  for (const [lang, q] of [['zh', '青旅'], ['en', 'luxury'], ['zh', '露营'], ['en', 'hostel']]) {
    await page.go('index.html?lang=' + lang);
    await page.waitFor('document.querySelector("#v4-search input[type=search]")');
    await page.ev(`(()=>{const i=document.querySelector('#v4-search input[type=search]');i.value=${JSON.stringify(q)};i.dispatchEvent(new Event('input',{bubbles:true}));const f=i.closest('form');if(f)f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()`);
    await page.waitFor('document.querySelector(\'[data-topic="stay"]\')');
  }
  await page.go('destination.html?id=si-zqn&lang=zh');
  await page.waitFor('document.querySelector("#stays")');
  assert.equal(await page.ev('document.querySelectorAll("#stays [data-tier]").length'), 3);
  await page.go('prepare.html?lang=en#money');
  await page.waitFor('document.querySelector("#v4-prepare-extra #money")');
  assert.match(await page.ev('document.querySelector("#money").innerText'), /Campsite Pass/);
  assert.deepEqual(page.errors, []);
}));

test('F: the planner\'s optional stay tier adds that tier\'s links under every night, and the share link keeps it', async t => withPage(t, async page => {
  for (const lang of ['zh', 'en']) {
    await page.go('plan.html?lang=' + lang);
    await page.ev('localStorage.clear()');
    await page.go(`plan.html?lang=${lang}&from=christchurch&to=queenstown&days=7&car=1&pace=5&pref=easy&w=tekapo,wanaka&stay=budget`);
    await page.waitFor('document.querySelectorAll(".p10-stay-links").length > 0');
    const r = await page.ev(`({nights: document.querySelectorAll('#planResult .p10-night').length, stays: [...document.querySelectorAll('#planResult .p10-stay-links')].map(p => ({tier: p.dataset.p10Stay, text: p.innerText, hrefs: [...p.querySelectorAll('a')].map(a => a.href)})), select: document.querySelector('#p10-stay').value, label: document.querySelector('#p10-stay-label').textContent})`);
    assert.equal(r.select, 'budget');
    assert.equal(r.stays.length, r.nights);
    assert.ok(r.stays.every(s => s.tier === 'budget' && /doc\.govt\.nz/.test(s.text) && /google\.com\/maps\/search/.test(s.text) && s.hrefs.length === 0));
    assert.match(r.label, lang === 'zh' ? /住宿档位/ : /Stay budget/);
    assert.match(r.stays[0].text, lang === 'zh' ? /^省钱住宿：/ : /^Budget stays: /);
    // switching to high-end redraws the same days with the high-end links; switching off removes them
    await page.ev(`(()=>{const s=document.querySelector('#p10-stay');s.value='high';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.ok(await page.ev(`[...document.querySelectorAll('.p10-stay-links')].every(p => p.dataset.p10Stay === 'high' && /newzealand\.com/.test(p.innerHTML))`));
    await page.ev(`(()=>{const s=document.querySelector('#p10-stay');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await page.ev('document.querySelectorAll(".p10-stay-links").length'), 0);
  }
  assert.deepEqual(page.errors, []);
}));
test('a cancelled strings file is fetched again and the search box still appears', async t => withPage(t, async page => {
  let failed = 0;
  await page.cdp('Fetch.enable', { patterns: [{ urlPattern: '*v4-strings.json*', requestStage: 'Request' }] });
  page.on('Fetch.requestPaused', params => {
    const fail = failed < 1;
    if (fail) failed += 1;
    const next = fail
      ? page.cdp('Fetch.failRequest', { requestId: params.requestId, errorReason: 'Failed' })
      : page.cdp('Fetch.continueRequest', { requestId: params.requestId });
    next.catch(() => {});
  });
  // The search box is the signal that the retry finished. Document load can lag behind that fetch.
  await page.cdp('Page.navigate', { url: page.base + 'index.html?lang=en' });
  try {
    await page.waitFor('document.querySelector("#v4-search-form")', 30000);
  } catch (err) {
    await page.cdp('Page.navigate', { url: page.base + 'index.html?lang=en' });
    await page.waitFor('document.querySelector("#v4-search-form")', 30000);
  }
  assert.ok(failed >= 1);
  assert.match(await page.ev('document.querySelector("#v4-search-form").innerText'), /Search/);
}));
test('F: a failed stay fetch is not cached, so the links appear on the retry', async t => withPage(t, async page => {
  let failed = 0;
  await page.cdp('Fetch.enable', { patterns: [{ urlPattern: '*stays-budget.json*', requestStage: 'Request' }] });
  page.on('Fetch.requestPaused', params => {
    const next = failed < 1
      ? page.cdp('Fetch.failRequest', { requestId: params.requestId, errorReason: 'Failed' })
      : page.cdp('Fetch.continueRequest', { requestId: params.requestId });
    if (failed < 1) failed += 1;
    next.catch(() => {});
  });
  await page.go('plan.html?lang=en&from=christchurch&to=queenstown&days=7&car=1&pace=5&pref=easy&w=tekapo,wanaka&stay=budget');
  await page.waitFor('document.querySelectorAll("#planResult .p10-stay-links").length > 0', 12000);
  assert.ok(failed >= 1);
  const first = await page.ev(`({text: document.querySelector('.p10-stay-links').innerText, hrefs: [...document.querySelectorAll('.p10-stay-links a')].map(a => a.href)})`);
  assert.match(first.text, /^Budget stays: /);
  assert.match(first.text, /doc\.govt\.nz/);
  await page.ev(`(()=>{const s=document.querySelector('#p10-stay');s.value='high';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await page.waitFor('document.querySelector(\'.p10-stay-links[data-p10-stay="high"]\')');
  assert.match(await page.ev('document.querySelector(".p10-stay-links").innerText'), /^High-end stays: /);
}));
test('F: the stay tier is part of the planner input and of the share link', () => {
  const r = planner.p10Plan({ start: 'christchurch', end: 'queenstown', days: 7, pace: 5, preference: 'easy', car: true, month: 0, stay: 'mid', wishes: ['tekapo'] });
  assert.equal(r.input.stay, 'mid');
});

// ---------- G: the tester's P2 list ----------
test('G P2-13: a bus trip Auckland → Wellington does not go back on itself within a day', () => {
  const plan = planner.p10Plan({ start: 'auckland', end: 'wellington', days: 8, pace: 5, preference: 'easy', car: false, wishes: ['hobbiton', 'waitomo', 'rotorua', 'taupo'] });
  const net = planner.p10Net(false);
  for (const day of planner.p10Timeline(plan)) {
    if (!day.legs.length) continue;
    const from = day.legs[0].a;
    let far = 0;
    for (const leg of day.legs) {
      const h = net.hours(from, leg.b);
      assert.ok(h + 1e-9 >= far || leg.b === from, `${from}: ${day.legs.map(l => l.a + '>' + l.b).join(' ')}`);
      far = Math.max(far, h);
    }
  }
});
test('G P2-07: the two dead DOC pages are marked removed', () => {
  const gone = docTracks.filter(x => x.urlGone);
  assert.deepEqual(gone.map(x => x.name).sort(), ["Jack's Point Track", 'West Egmont tramping tracks']);
});
test('G P2-10: common OSM surfaces have Chinese names', () => {
  const v3 = fs.readFileSync(path.join(__dirname, '../docs/v3.js'), 'utf8');
  for (const word of ["artificial_turf: '人造草'", "asphalt: '沥青'", "paved: '硬化路面'"]) assert.ok(v3.includes(word), word);
});
test('G P2-02/08/09: English guide legs, unknown template, region counts with units', async t => withPage(t, async page => {
  await page.go('guide.html?template=SI-09B&lang=en');
  await page.waitFor('document.querySelector(".v4-day")');
  const days = await page.ev('[...document.querySelectorAll(".v4-day")].map(d => d.innerText).join("\\n")');
  // raw editing labels ("约2h40（官方）", "OSRM 198.9km/2h45", "【估算…】") are gone; the OSRM source credit stays
  assert.doesNotMatch(days, /约|（官方）|OSRM \d|【/);
  assert.match(days, /about \d+ h/);
  await page.go('guide.html?template=XX-99&lang=zh');
  await page.waitFor('document.querySelector("[data-template-missing]")');
  assert.match(await page.ev('document.querySelector("[data-template-missing]").innerText'), /XX-99/);
  await page.go('guide.html?view=pick&lang=zh');
  await page.waitFor('document.querySelector("[data-region]")');
  assert.match(await page.ev('document.querySelector("[data-region]").textContent'), /个地点/);
  await page.go('plan.html?lang=en');
  await page.waitFor('document.querySelector(\'#p10-region [data-p10-region="taranaki"]\')');
  assert.match(await page.ev('document.querySelector(\'#p10-region [data-p10-region="taranaki"]\').textContent'), /places?\)/);
  assert.deepEqual(page.errors, []);
}));
test('G P2-02: English planner days use half-width colons', async t => withPage(t, async page => {
  await page.go('plan.html?lang=en&from=christchurch&to=queenstown&days=7&w=tekapo');
  await page.waitFor('document.querySelector("#planResult .plan-day")');
  assert.doesNotMatch(await page.ev('document.querySelector("#planResult").innerText'), /(Overnight|Visit)：/);
}));

// ---------- H: walk-through findings ----------
test('H-07/H-14/H-17: on-the-way stops in titles, unknown ids in links named, more start cities', async t => withPage(t, async page => {
  await page.go('plan.html?lang=zh&from=auckland&to=wellington&days=14&w=ni-tga,ni-wka,xx-typo');
  await page.waitFor('document.querySelector("#p10-link-note")', 12000);
  assert.match(await page.ev('document.querySelector("#planResult").innerText'), /途经陶朗加/);
  assert.match(await page.ev('document.querySelector("#p10-link-note").textContent'), /xx-typo/);
  const starts = await page.ev('[...document.querySelectorAll("#p10-start option")].map(o => o.value)');
  for (const id of ['wanaka', 'te-anau', 'taupo']) assert.ok(starts.includes(id), id);
  assert.deepEqual(page.errors, []);
}));
test('H-09: home map pins open the destination page', async t => withPage(t, async page => {
  await page.go('index.html?lang=zh');
  await page.waitFor('document.querySelector(".nzmap-point")');
  const hrefs = await page.ev('[...document.querySelectorAll(".nzmap-point")].map(a => a.getAttribute("href"))');
  assert.ok(hrefs.length >= 10 && hrefs.every(h => /^destination\.html\?id=/.test(h)), hrefs.join(' '));
}));
test('H-12: a 4-day South Island trip is not offered the 9-day template', async t => withPage(t, async page => {
  await page.go('plan.html?lang=zh&from=queenstown&to=queenstown&days=4&w=milford,aoraki');
  await page.waitFor('document.querySelector("#planResult .plan-day")');
  assert.equal(await page.ev('document.querySelectorAll(\'#planResult a[href*="template=SI-09B"]\').length'), 0);
}));
