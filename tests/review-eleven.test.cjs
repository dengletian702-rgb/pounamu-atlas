'use strict';
// Follow-up fixes on fix/ten-guest-v1. Unit checks run without a browser; page checks use the CDP helper.
const test = require('node:test');
const assert = require('node:assert/strict');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(place => place.type === 'town');
const planner = require('../docs/p10-planner.js');
const ski = require('../docs/data/ski-fields.json');

async function withPage(t, fn) {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try { await fn(page); } finally { await page.close(); }
}

test('English road names keep up and down when the leg runs in the stored direction', () => {
  const up = planner.p10Net(true).path('oamaru', 'twizel')[0];
  const down = planner.p10Net(true).path('arthurs-pass', 'greymouth')[0];
  assert.equal(up.a, 'oamaru');
  assert.equal(down.a, 'arthurs-pass');
  assert.match(planner.p10LegDescription(up, 'en'), /\bup\b/);
  assert.match(planner.p10LegDescription(down, 'en'), /\bdown\b/);
  assert.equal(planner.p10LegDescription(up, 'en'), up.road.en);
  assert.equal(planner.p10LegDescription(down, 'en'), down.road.en);
  assert.equal(planner.p10LegDescription(up, 'zh'), up.road.zh);
  assert.match(planner.p10LegDescription(down, 'zh'), /下到西海岸/);
});

test('a reversed direction-word label uses the reverse text in English and Chinese', () => {
  const leg = (a, b) => planner.p10Net(true).path(a, b).find(item => item.a === a && item.b === b);
  const cases = [
    ['paihia', 'auckland', 'SH1 south', 'SH1 南下', /\bnorth\b|北上/],
    ['kaikoura', 'picton', 'SH1 up the Kaikōura coast', 'SH1 沿凯库拉海岸北上', /\bdown\b|南下/],
    ['franz-josef', 'hokitika', 'SH6 north through the rainforest', 'SH6 穿雨林北上', /\bsouth\b|南下/],
    ['tolaga-bay', 'gisborne', 'SH35 down the East Coast', 'SH35 沿东海岸南下', /\bup\b|北上/],
    ['twizel', 'oamaru', 'SH83 down the Waitaki Valley', 'SH83 沿怀塔基河谷而下', /\bup\b/],
    ['wellington', 'whanganui', 'SH3 and SH1 up the Kāpiti Coast', 'SH3、SH1 沿卡皮蒂海岸北上', /\bdown\b/],
    ['greymouth', 'arthurs-pass', 'SH73 up the Ōtira Viaduct', 'SH73 经奥蒂拉高架桥而上', /West Coast|西海岸/],
  ];
  for (const [a, b, en, zh, wrong] of cases) {
    const item = leg(a, b);
    assert.ok(item, a + '→' + b);
    assert.equal(planner.p10LegDescription(item, 'en'), en, a);
    assert.equal(planner.p10LegDescription(item, 'zh'), zh, a);
    assert.doesNotMatch(planner.p10LegDescription(item, 'en') + planner.p10LegDescription(item, 'zh'), wrong, a);
  }
});

test('a reversed destination label names the end you are actually driving toward', () => {
  const leg = (a, b) => planner.p10Net(true).path(a, b).find(item => item.a === a && item.b === b);
  const cases = [
    ['marahau', 'nelson', 'SH60 to Nelson', 'SH60 到纳尔逊', /Abel Tasman|亚伯塔斯曼/],
    ['hahei', 'auckland', 'SH25 and SH2 to Auckland', 'SH25、SH2 到奥克兰', /Coromandel|科罗曼德/],
    ['aoraki', 'twizel', 'SH80 along Lake Pukaki to Twizel', 'SH80 沿普卡基湖到特威泽尔', /Aoraki|库克山/],
    ['arthurs-pass', 'christchurch', 'SH73 across the Canterbury Plains to Christchurch', 'SH73 穿过坎特伯雷平原到基督城', /Arthur|亚瑟通道/],
  ];
  for (const [a, b, en, zh, wrong] of cases) {
    const item = leg(a, b);
    assert.ok(item, a + '→' + b);
    assert.equal(planner.p10LegDescription(item, 'en'), en, a);
    assert.equal(planner.p10LegDescription(item, 'zh'), zh, a);
    assert.doesNotMatch(en + zh, wrong, a);
  }
});

test('Palmerston North and Feilding are both kept, so the same town is visited twice', () => {
  const plan = planner.p10Plan({ start: 'wellington', end: 'auckland', days: 8, pace: 5, preference: 'drive', car: true, wishes: ['ni-pmn', 'ni-fld'] });
  assert.deepEqual(plan.order.map(w => w.id), ['ni-pmn', 'ni-fld']);
  assert.deepEqual(plan.order.map(w => w.base), ['feilding', 'feilding']);
  const visits = planner.p10Timeline(plan).flatMap(day => day.activities.map(a => a.wish.id));
  assert.deepEqual(visits, ['ni-pmn', 'ni-fld']);
});

test('the Pipiriki day title does not say via Pipiriki twice', () => {
  const plan = planner.p10Plan({ start: 'wellington', end: 'auckland', days: 6, pace: 5, preference: 'drive', car: true, wishes: ['ni-wag', 'ni-pip', 'tongariro'] });
  const day = planner.p10Timeline(plan)[2];
  const title = (lang) => `${planner.NODES[day.legs[0].a][lang]} → ${planner.NODES[day.at][lang]}${planner.p10WayTitle(day, lang)}`;
  const zh = title('zh');
  const en = title('en');
  assert.equal((zh.match(/途经皮皮里基/g) || []).length, 0);
  assert.equal((zh.match(/皮皮里基/g) || []).length, 1);
  assert.equal((en.match(/via Pipiriki/g) || []).length, 0);
  assert.match(en, /Pipiriki/);
});

test('SH36 is the same direction-neutral label both ways', () => {
  const forward = planner.p10Net(true).path('rotorua', 'tauranga')[0];
  const back = planner.p10Net(true).path('tauranga', 'rotorua')[0];
  assert.equal(planner.p10LegDescription(forward, 'en'), 'SH36');
  assert.equal(planner.p10LegDescription(back, 'en'), 'SH36');
  assert.equal(planner.p10LegDescription(forward, 'zh'), 'SH36');
  assert.equal(planner.p10LegDescription(back, 'zh'), planner.p10LegDescription(forward, 'zh'));
  assert.doesNotMatch(planner.p10LegDescription(back, 'en'), /Tauranga|Rotorua/);
});

test('National Park–Pipiriki is 61 km from the Visit Ruapehu map, and a 0 km leg is excluded from the total', () => {
  const leg = planner.p10Net(true).path('national-park', 'pipiriki')[0];
  assert.equal(leg.km, 61);
  assert.equal(leg.src.km.status, 'checked');
  assert.equal(leg.src.km.km, 61);
  assert.equal(leg.src.km.checkedAt, '2026-11-11');
  assert.match(leg.src.km.url, /^https:\/\/www\.visitruapehu\.com\//);
  assert.equal(planner.p10LegKm(leg), 61);
  assert.deepEqual(planner.p10KmSum([leg, { km: 0 }, { km: 10 }]), { km: 71, unknown: 1 });
  const note = planner.p10ShortfallNote(
    { input: { end: 'pipiriki', days: 1, car: true }, minimum: 3 },
    { days: [{ at: 'national-park', legs: [] }] },
    'en'
  );
  assert.match(note, /61 km/);
  assert.doesNotMatch(note, /not included/);
});

test('Mt Hutt season dates come from the official mountain page', () => {
  const field = ski.fields.find(item => item.id === 'mt-hutt');
  assert.equal(field.season_source, 'https://www.mthutt.co.nz/mountain-info');
  assert.equal(field.checkedAt, '2026-11-11');
  assert.match(field.season_en, /11 June/);
  assert.match(field.season_en, /10 October/);
  assert.match(field.season_zh, /6 月 11 日/);
  assert.match(field.season_zh, /10 月 10 日/);
  assert.doesNotMatch(field.season_en, /to be checked|待核/);
  assert.doesNotMatch(field.season_zh, /待核/);
});

test('winter pass warnings also apply to public transport', () => {
  const legs = planner.p10Net(false).path('christchurch', 'greymouth');
  assert.ok(legs.every(leg => leg.mode !== 'car'));
  const july = planner.p10RoadNotes(legs, 7, true).filter(note => note.kind === 'winter');
  assert.ok(july.length >= 1);
  assert.match(july[0].text, /亚瑟通道/);
  assert.ok(july[0].sources.some(source => /nzta\.govt\.nz/.test(source.url)));
  assert.equal(planner.p10RoadNotes(legs, 1, true).filter(note => note.kind === 'winter').length, 0);
  const driving = planner.p10RoadNotes(planner.p10Net(true).path('christchurch', 'greymouth'), 7, false).filter(note => note.kind === 'winter');
  assert.match(driving[0].text, /Arthur/);
});

test('plan and guide region counts use one definition', () => {
  const expect = { taranaki: 3, 'christchurch-canterbury': 7, 'west-coast': 5 };
  for (const [id, count] of Object.entries(expect)) {
    const entries = planner.p10RegionEntries(id, 'all');
    assert.equal(entries.wishes.length + entries.towns.length, count, id);
  }
});

test('the paddling atlas count matches the list under it', async t => withPage(t, async page => {
  for (const lang of ['en', 'zh']) {
    await page.go('routes.html?lang=' + lang + '&mode=paddle');
    await page.click('#atlasToggle');
    await page.waitFor('document.querySelector("#routeAtlas .atlas-directory a")');
    const info = await page.ev(`({
      header: document.querySelector('#routeAtlas .map-paper-header').innerText,
      listed: document.querySelectorAll('#routeAtlas .atlas-directory a').length,
      grid: document.querySelector('#routeGrid').children.length,
      count: document.querySelector('#routeCount').textContent.trim()
    })`);
    assert.equal(info.listed, info.grid);
    assert.match(info.header, new RegExp('(?:^|\\n)' + info.listed + ' '));
    assert.match(info.count, new RegExp('^' + info.grid + '\\b'));
    assert.ok(info.listed > 0);
  }
}));

test('English planner checkboxes are English only; Chinese keeps both names', async t => withPage(t, async page => {
  await page.go('plan.html?lang=en');
  await page.ev('localStorage.clear()');
  await page.go('plan.html?lang=en');
  await page.click('#p10-region [data-p10-region="northland-bay-of-islands"]');
  const en = await page.ev('document.querySelector(\'#p10-wishes label[data-p10-wish="ni-ktt"] .p10-wish-name\').textContent');
  assert.match(en, /Kaitaia/);
  assert.doesNotMatch(en, /凯塔亚/);
  await page.go('plan.html?lang=zh');
  await page.click('#p10-region [data-p10-region="northland-bay-of-islands"]');
  const zh = await page.ev('document.querySelector(\'#p10-wishes label[data-p10-wish="ni-ktt"] .p10-wish-name\').textContent');
  assert.match(zh, /凯塔亚/);
  assert.match(zh, /Kaitaia/);
}));

test('plan.html and guide.html show the same region counts', async t => withPage(t, async page => {
  const regions = ['taranaki', 'christchurch-canterbury', 'west-coast'];
  const read = async (url, attr) => {
    await page.go(url);
    await page.waitFor(`document.querySelector('[${attr}="taranaki"]')`);
    const out = {};
    for (const id of regions) {
      const text = await page.ev(`document.querySelector('[${attr}="${id}"]').textContent`);
      out[id] = Number((text.match(/(\d+)/) || [])[1]);
    }
    return out;
  };
  const plan = await read('plan.html?lang=en', 'data-p10-region');
  const guide = await read('guide.html?blank=1&view=pick&lang=en', 'data-region');
  assert.deepEqual(plan, { taranaki: 3, 'christchurch-canterbury': 7, 'west-coast': 5 });
  assert.deepEqual(guide, plan);
}));

test('an invalid map key on a destination page falls back to the SVG sketch', async t => withPage(t, async page => {
  const script = 'window.gm_authFailure&&window.gm_authFailure();window.google={maps:{Map:function(){},LatLngBounds:function(){this.extend=function(){}},Polyline:function(){}}};';
  await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'window.POUNAMU_GOOGLE_MAPS_KEY="not-a-real-maps-key";' });
  await page.cdp('Fetch.enable', { patterns: [{ urlPattern: '*maps.googleapis.com*', requestStage: 'Request' }] });
  page.on('Fetch.requestPaused', params => {
    page.cdp('Fetch.fulfillRequest', {
      requestId: params.requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
      body: Buffer.from(script).toString('base64'),
    }).catch(() => {});
  });
  await page.go('destination.html?id=si-zqn&lang=en');
  await page.waitFor('document.querySelector("#v4-dest-map .v4-schematic")', 12000);
  assert.equal(await page.ev('document.querySelector("#v4-dest-map").dataset.mapKind'), 'svg');
  assert.equal(await page.ev('document.querySelector("#v4-dest-map .v4-google-map")'), null);
  await page.cdp('Fetch.disable');
  await page.cdp('Network.enable');
  await page.cdp('Network.setBlockedURLs', { urls: ['*://maps.googleapis.com/*', '*://maps.gstatic.com/*'] });
  await page.go('destination.html?id=si-zqn&lang=zh');
  await page.waitFor('document.querySelector("#v4-dest-map .v4-schematic")', 12000);
  assert.equal(await page.ev('document.querySelector("#v4-dest-map").dataset.mapKind'), 'svg');
}));
