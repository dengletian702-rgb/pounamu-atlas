'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const docs = path.join(__dirname, '..', 'docs');
const budget = require('../docs/budget.js');
const maps = require('../docs/maps-urls.js');
const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(p => p.type === 'town');
const planner = require('../docs/p10-planner.js');

function walk(dir, ext) {
  return fs.readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) return name === 'assets' || name === 'data' ? [] : walk(full, ext);
    return full.endsWith(ext) ? [full] : [];
  });
}

test('only type.css sets font-family', () => {
  const offenders = [];
  for (const file of [...walk(docs, '.css'), ...walk(docs, '.html'), ...walk(docs, '.js')]) {
    if (file.endsWith(path.join('docs', 'type.css'))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/font-family\s*:/.test(text) || /font-family\s*=/.test(text)) offenders.push(path.relative(docs, file));
  }
  assert.deepEqual(offenders, []);
});

test('type.css defines one body, one heading, one mono and a size scale', () => {
  const css = fs.readFileSync(path.join(docs, 'type.css'), 'utf8');
  for (const token of ['--type-body', '--type-heading', '--type-mono', '--type-display', '--type-xs', '--type-sm', '--type-md', '--type-lg', '--type-xl', '--type-2xl', '--type-3xl']) {
    assert.match(css, new RegExp(token + '\\s*:'));
  }
  assert.match(css, /html:lang\(zh\)/);
  assert.match(css, /html:lang\(en\)/);
  assert.match(css, /font-display:\s*swap/);
  assert.match(css, /assets\/fonts\/display-v1\.woff2/);
});

test('budget totals add up and a missing price stays to verify', () => {
  const days = [
    { kind: 'activity', stayKind: 'doc-camp', legs: [{ km: 100, mode: 'car' }], activities: [{}] },
    { kind: 'depart', legs: [{ km: 0, mode: 'ferry' }], activities: [] }
  ];
  const assumptions = budget.normalise({
    people: 2, tier: 'budget', docLow: 10, docHigh: 20,
    fuelNzdPerL: 3, litresPer100: 10, mealNzd: 20, mealsPerDay: 2,
    ferryVehicleNzd: 200, parkingNzd: 0, activityNzd: 50, nzdCny: 4, showCny: true, nzdCnyDate: '2026-11-13'
  });
  const trip = budget.priceTrip(days, assumptions);
  // night 1: stay 20–40, fuel 100*0.1*3=30, food 20*2*2=80, activity 50, parking 0
  assert.equal(trip.days[0].lines.fuel.min, 30);
  assert.equal(trip.days[0].lines.food.min, 80);
  assert.equal(trip.days[0].lines.stay.min, 20);
  assert.equal(trip.days[0].lines.stay.max, 40);
  assert.equal(trip.days[1].lines.ferry.min, 200);
  assert.equal(trip.days[1].lines.stay.min, 0);
  // Day 1 stay 20–40 + fuel 30 + food 80 + activity 50. Day 2 depart food 40 + ferry 200.
  assert.equal(trip.total.min, 420);
  assert.equal(trip.total.max, 440);
  assert.equal(trip.perPerson.min, trip.total.min / 2);
  assert.equal(trip.cny.min, trip.total.min * 4);
  const bare = budget.priceTrip(days, budget.blankAssumptions());
  assert.equal(bare.days[0].lines.fuel.verify, true);
  assert.match(budget.formatMoney(bare.days[0].lines.fuel, 'zh'), /待核/);
  const again = budget.decodeState(budget.encodeState(assumptions));
  assert.equal(again.fuelNzdPerL, 3);
  assert.equal(again.tier, 'budget');
  assert.equal(again.people, 2);
});

test('tier switch changes only the stay line', () => {
  const day = { kind: 'activity', legs: [], activities: [] };
  const mid = budget.priceDay(day, { tier: 'mid', people: 2, midNightly: 180 });
  const high = budget.priceDay(day, { tier: 'high', people: 2, highNightly: 400 });
  assert.equal(mid.lines.stay.min, 180);
  assert.equal(high.lines.stay.min, 400);
  assert.equal(budget.priceDay(day, { tier: 'mid', people: 2 }).lines.stay.verify, true);
});

test('same-city two-day plans list the city on both days', () => {
  for (const id of ['christchurch', 'auckland', 'queenstown', 'wellington']) {
    const plan = planner.p10Plan({ start: id, end: id, days: 2, pace: 5, preference: 'easy', car: true, wishes: [id] });
    const view = planner.p10Present(plan);
    assert.equal(view.unscheduled.length, 0, id);
    assert.equal(view.days.length, 2, id);
    for (const day of view.days) assert.ok(day.activities.some(a => a.wish.id === id), id);
  }
});

test('Google Maps URLs stay under the waypoint limit and need no key', () => {
  const stops = Array.from({ length: 14 }, (_, i) => ({ name: 'Stop ' + i, lat: -41 - i * 0.2, lng: 174 }));
  const urls = maps.routeSegments(stops, 'driving');
  assert.ok(urls.length >= 2);
  for (const url of urls) {
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
    assert.doesNotMatch(url, /key=/);
    const via = new URL(url).searchParams.get('waypoints');
    const count = via ? via.split('|').length : 0;
    assert.ok(count <= maps.WAYPOINT_LIMIT);
  }
  assert.match(maps.searchUrl({ lat: -36.8, lng: 174.7, name: 'Sky Tower' }), /query=-36\.8%2C174\.7/);
});

test('a route import keeps Milford stages and does not become a road trip', () => {
  const route = {
    id: 'milford-track', mode: 'walk', name: 'Milford Track', zh: '米尔福德步道', planDays: 4,
    ends: ['Glade Wharf → Sandfly Point', 'Glade Wharf → Sandfly Point'],
    timeline: [
      { at: ['Boat', '船'], title: ['Boat to Glade Wharf', '船到 Glade'], text: ['Transfer', '接驳'] },
      { at: ['Clinton', '克林顿'], title: ['Clinton Hut', '克林顿小屋'], text: ['Walk', '步行'] },
      { at: ['Pass', '山口'], title: ['Mackinnon Pass', '麦金农山口'], text: ['Walk', '步行'] }
    ]
  };
  const plan = planner.p10PlanFromRoute(route);
  assert.equal(plan.routeImport.planDays, 4);
  assert.equal(plan.routeImport.days.length, 4);
  assert.deepEqual(plan.routeImport.days.map(day => day.stayEn), ['Clinton Hut', 'Mintaro Hut', 'Dumpling Hut', '']);
  assert.equal(plan.routeImport.days[3].noStay, true);
  assert.equal(plan.routeImport.transfers.length, 0);
  assert.equal(plan.input.car, false);
});

test('Whanganui import stays a paddle with a separate land transfer', () => {
  const route = {
    id: 'whanganui-journey', mode: 'paddle', name: 'Whanganui Journey', zh: '旺格努伊', planDays: 5,
    ends: ['Taumarunui to Pipiriki', '陶马鲁努伊到皮皮里基'],
    timeline: [
      { at: ['Ohinepane', '奥希内帕内'], title: ['Taumarunui to Ohinepane', '陶马鲁努伊到奥希内帕内'], text: ['Paddle', '划'] }
    ]
  };
  const plan = planner.p10PlanFromRoute(route);
  assert.equal(plan.routeImport.days.length, 5);
  assert.equal(plan.routeImport.days[0].stayEn, 'Ohinepane Campsite');
  assert.equal(plan.routeImport.days[4].noStay, true);
  assert.match(plan.routeImport.transfers[0].titleEn, /Land transfer/);
  assert.equal(plan.input.start, 'taumarunui');
  assert.equal(plan.input.end, 'pipiriki');
});

test('a city night stays to verify while known amounts remain in the total', () => {
  const trip = budget.priceTrip(
    [{ kind: 'activity', legs: [{ km: 100, mode: 'car' }], activities: [] }],
    budget.normalise({ people: 2, tier: 'budget', fuelNzdPerL: 3, litresPer100: 10, mealNzd: 20, mealsPerDay: 2 })
  );
  assert.equal(trip.days[0].lines.stay.verify, true);
  assert.equal(trip.days[0].lines.stay.min, 0);
  assert.ok(trip.total.min >= 30);
  assert.equal(trip.total.verify, true);
  assert.match(budget.formatMoney(trip.total, 'zh'), /待核/);
  assert.match(budget.formatMoney({ min: 1200, max: 2400 }, 'en', 'CN¥'), /CN¥1,200–CN¥2,400/);
  const once = budget.encodeState({ people: 2, tier: 'mid' });
  assert.equal(once.includes('%'), false);
  assert.equal(budget.decodeState(encodeURIComponent(encodeURIComponent(once))).people, 2);
});

test('a two-day same-city trip visits that city even when it is not ticked', () => {
  const plan = planner.p10Plan({ start: 'christchurch', end: 'christchurch', days: 2, pace: 5, preference: 'easy', car: true, wishes: [] });
  const view = planner.p10Present(plan);
  assert.ok(view.days.some(day => day.activities.some(item => item.wish.id === 'christchurch')));
  const far = planner.p10SuggestPool(plan.input, new Set(['christchurch']));
  assert.ok(far.every(item => item.base === 'christchurch' || planner.p10Net(true).hours('christchurch', item.base) <= 1.5));
});

test('every route stay is a place, not a stage verb', () => {
  const { routeDays } = require('../docs/route-days.js');
  const source = fs.readFileSync(path.join(__dirname, '..', 'docs/app.js'), 'utf8');
  const start = source.indexOf('const routes=');
  const end = source.indexOf('];\n', start);
  const routes = eval(source.slice(start + 'const routes='.length, end + 1));
  const verb = /^(Leave|Climb|Lunch|Follow|Start|Pause|Ride|Walk|Cross|Check|Arrive|Return|Ease|Give|Make|Choose|Continue|Watch|Pass|Transfer|Settle|Finish|Side trip|Bridges|Decide)\b/;
  for (const route of routes) {
    const days = routeDays(route);
    const multi = Number(route.planDays) > 1;
    if (!multi) {
      assert.equal(days.length, 1, route.id);
      assert.equal(days[0].noStay, true, route.id);
    } else {
      assert.ok(days.length >= 1 && days.length <= Number(route.planDays), route.id + ' ' + days.length);
    }
    const last = days[days.length - 1];
    if (multi) assert.equal(last.noStay || (last.stayEn && last.stayEn !== 'To verify'), true, route.id + ' last day');
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.noStay) continue;
      assert.doesNotMatch(day.stayEn, verb, route.id + ' stay ' + day.stayEn);
      assert.doesNotMatch(day.titleEn, verb, route.id + ' title ' + day.titleEn);
      assert.doesNotMatch(day.query || '', /Leave Routeburn|Climb through the high forest|Lunch in Marlborough/, route.id);
      if (day.stayKind === 'city') assert.doesNotMatch(day.stayEn, /hut|campsite/i, route.id + ' ' + day.stayEn);
      const next = days[i + 1];
      if (next && !/续住/.test(next.stayZh || '')) assert.notEqual(day.stayEn + '|' + day.query, next.stayEn + '|' + next.query, route.id + ' day ' + (i + 1));
    }
  }
  const expectStay = {
    'routeburn-track': ['Routeburn Falls Hut', 'Lake Mackenzie Hut', ''],
    'kepler-track': ['Luxmore Hut', 'Iris Burn Hut', 'Moturau Hut', ''],
    'tongariro-northern-circuit': ['Mangatepopo Hut', 'Oturere Hut', 'Waihohonu Hut', ''],
    'rakiura-track': ['Port William Hut', 'North Arm Hut', ''],
    'mueller-hut': ['Mueller Hut', ''],
    'abel-tasman': ['Anchorage Hut', 'Bark Bay Hut', 'Awaroa Hut', ''],
    'ni-timber': ['Piropiro Campsite', '']
  };
  for (const [id, stays] of Object.entries(expectStay)) {
    const got = routeDays(routes.find(route => route.id === id)).map(day => day.stayEn);
    assert.deepEqual(got, stays, id);
  }
  const heaphy = routeDays(routes.find(route => route.id === 'heaphy-track'));
  assert.equal(heaphy.some(day => /via Lewis/i.test(day.stayEn)), false);
  assert.equal(heaphy[heaphy.length - 1].noStay, true);
  const milfordDays = routeDays(routes.find(route => route.id === 'milford-track'));
  assert.equal(milfordDays[0].textEn === milfordDays[1].textEn, false);
  const milford = routeDays(routes.find(route => route.id === 'milford-track'));
  assert.equal(milford[1].textEn.includes('usual second night'), false);
  assert.match(milford[3].moveEn, /Boat out the same day/);
  const wh = routeDays(routes.find(route => route.id === 'whanganui-journey'));
  assert.equal(wh[0].stayKind, 'great-walk');
  const train = routeDays(routes.find(route => route.id === 'tranzalpine'));
  assert.equal(train[0].dir.destination, 'Greymouth Railway Station');
  const queen = routeDays(routes.find(route => route.id === 'queen-charlotte-track'));
  assert.deepEqual(queen.map(day => day.stayEn), ['Schoolhouse Bay Campsite', 'Camp Bay Campsite', 'Cowshed Bay Campsite', '']);
  assert.equal(queen[0].titleEn, 'Ship Cove → Resolution Bay');
  const heaphyDays = routeDays(routes.find(route => route.id === 'heaphy-track'));
  assert.deepEqual(heaphyDays.map(day => day.stayEn), ['Perry Saddle Hut', 'Saxon Hut', 'James Mackay Hut', 'Heaphy Hut', '']);
  assert.match(heaphyDays[0].moveEn, /17\.5 km/);
  const tieke = routeDays(routes.find(route => route.id === 'whanganui-journey'))[3];
  assert.equal(tieke.stayKind, 'great-walk');
  assert.equal(tieke.hut, true);
  const mueller = routeDays(routes.find(route => route.id === 'mueller-hut'))[0];
  assert.equal(mueller.stayKind, 'alpine-hut');
  const alpine = budget.priceDay({ kind: 'activity', stayKind: 'alpine-hut' }, budget.normalise({ tier: 'budget', people: 1 }));
  assert.equal(alpine.lines.stay.min, 50);
  assert.equal(alpine.lines.stay.max, 62);
  const free = budget.priceDay({ kind: 'activity', stayKind: 'doc-free' }, budget.normalise({ tier: 'budget', people: 1 }));
  assert.equal(free.lines.stay.free, true);
  assert.match(budget.formatMoney(free.lines.stay, 'zh'), /DOC：免费/);
  assert.equal(routeDays(routes.find(route => route.id === 'ni-timber'))[0].stayKind, 'doc-free');
  const tePaki = routeDays(routes.find(route => route.id === 'te-paki-coastal'));
  assert.equal(tePaki[2].stayEn, 'Twilight Campsite');
  assert.equal(tePaki[0].stayZh, '已关闭（DOC 公告）');
  assert.equal(tePaki[1].stayZh, '已关闭（DOC 公告）');
  assert.equal(tePaki[0].stayKind, 'closed');
  assert.doesNotMatch(tePaki[0].textZh + tePaki[0].stayZh, /免费|free/i);
  assert.doesNotMatch(tePaki[1].textZh + tePaki[1].stayZh, /免费|free/i);
  assert.match(tePaki[2].textZh, /Tapotupotu 至 Cape Reinga 段关闭，从 Cape Reinga 出发/);
  const shut = budget.priceDay({ kind: 'activity', stayKind: 'closed' }, budget.normalise({ tier: 'budget', people: 1 }));
  assert.equal(budget.formatMoney(shut.lines.stay, 'zh'), '关闭');
  assert.doesNotMatch(budget.formatMoney(shut.lines.stay, 'en'), /free/i);
  const qct = budget.priceDay({ kind: 'activity', stayKind: 'doc-camp', campNzd: 10 }, budget.normalise({ tier: 'budget', people: 1, docLow: 10, docHigh: 20 }));
  assert.equal(qct.lines.stay.min, 10);
  assert.equal(qct.lines.stay.max, 10);
  assert.match(heaphyDays[0].moveZh, /步行 5 小时，山地车 2\.5–3\.5 小时；17\.5 公里（DOC）/);
  assert.match(heaphyDays[3].textEn, /Lewis Shelter/);
  assert.match(heaphyDays[3].moveEn, /20\.5 km/);
  for (const route of routes.filter(item => !(Number(item.planDays) > 1))) {
    const linked = routeDays(route)[0];
    if (linked.dir) assert.notEqual(linked.dir.origin, linked.dir.destination, route.id);
  }
  assert.equal(routeDays(routes.find(route => route.id === 'milford'))[0].dir.destination, 'Milford Sound');
  assert.equal(routeDays(routes.find(route => route.id === 'ni-martinborough'))[0].dir.destination, 'Martinborough');
  assert.equal(routeDays(routes.find(route => route.id === 'ni-kapitirail'))[0].dir.destination, 'Waikanae Station');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'docs/route-days.js'), 'utf8'), /不是住处|not the stay|No second night|不套 DOC/);
  assert.equal(routeDays(routes.find(route => route.id === 'hump-ridge-track'))[0].hut, false);
  assert.equal(routeDays(routes.find(route => route.id === 'hump-ridge-track'))[0].stayEn, 'Ōkaka Lodge');
  assert.equal(routeDays(routes.find(route => route.id === 'lake-waikaremoana'))[2].stayEn, 'Marauiti Hut');
  assert.equal(routeDays(routes.find(route => route.id === 'ni-thermalexplorer'))[2].query, 'Taupō');
  assert.match(routeDays(routes.find(route => route.id === 'ni-twincoast-drive'))[2].stayZh, /续住/);
  const bannedQuery = /\bsame\b|\breturn\b|\bloop\b|end of the trail/i;
  for (const route of routes.filter(item => !(Number(item.planDays) > 1))) {
    const day = routeDays(route)[0];
    const words = day.query || '';
    assert.doesNotMatch(words, bannedQuery, route.id + ' ' + words);
    assert.doesNotMatch(words, /^(car park|village)$/i, route.id);
    const start = String((route.ends && route.ends[0]) || '').split(/\s*(?:→|->)\s*/)[0];
    assert.ok(words.includes(route.name) || words.includes(start) || (day.dir && (day.dir.origin.includes(start) || start.includes(day.dir.origin))), route.id + ' ' + words);
  }
  assert.match(routeDays(routes.find(route => route.id === 'hooker'))[0].query, /White Horse Hill car park Hooker Valley Track/);
  assert.match(routeDays(routes.find(route => route.id === 'ni-rangitoto'))[0].query, /Rangitoto Wharf/);
  assert.equal(routeDays(routes.find(route => route.id === 'bus'))[0].dir.mode, 'transit');
});

test('literal font-size stays in the type scale file', () => {
  const files = [];
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'data' || name === 'assets') continue;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(css|html|js)$/.test(name) && name !== 'type.css') files.push(full);
    }
  };
  walk(path.join(__dirname, '..', 'docs'));
  const bad = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /font-size\s*:\s*([^;}{"']+)/g;
    let match;
    while ((match = re.exec(text))) {
      const value = match[1].trim();
      if (value.startsWith('var(') || value === 'inherit' || value === 'unset') continue;
      bad.push(path.relative(path.join(__dirname, '..'), file) + ' ' + value.slice(0, 40));
    }
  }
  assert.deepEqual(bad, []);
});

const { openBrowser } = require('./helpers/cdp-browser.cjs');

test('route day cards render on first load and the sticky line does not cover controls', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    for (const id of ['milford-track', 'whanganui-journey']) {
      await page.go('route.html?id=' + id + '&lang=zh');
      await page.waitFor('document.querySelectorAll(".gday").length > 0');
      const count = await page.ev('document.querySelectorAll(".gday").length');
      assert.ok(count > 0, id + ' ' + count);
      if (id === 'milford-track') assert.equal(count, 4);
      const small = await page.ev(`(() => {
        const hits = [];
        for (const el of document.querySelectorAll('body *')) {
          const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          if (!text) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const size = parseFloat(cs.fontSize);
          if (size < 12) hits.push((el.className || el.tagName) + ' ' + size);
          if (hits.length > 6) break;
        }
        return hits;
      })()`);
      assert.deepEqual(small, [], id);
    }
    for (const w of [390, 320]) {
      await page.view(w, 844, true);
      for (const lang of ['zh', 'en']) {
        await page.go('route.html?id=milford-track&lang=' + lang);
        await page.waitFor('document.querySelector(".gday-actions a") && document.querySelector(".gday-sticky") && document.querySelector(".ui2-kbtn")');
        const hit = await page.ev(`(() => {
          const overlaps = (a, b) => a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
          const sticky = document.querySelector('.gday-sticky').getBoundingClientRect();
          const action = document.querySelector('.gday-actions a').getBoundingClientRect();
          const search = document.querySelector('.ui2-kbtn').getBoundingClientRect();
          const legend = document.querySelector('.map-legend, .p10-map-day-list');
          const legendBox = legend ? legend.getBoundingClientRect() : null;
          const cs = getComputedStyle(document.querySelector('.gday-sticky'));
          return {
            action: overlaps(sticky, action),
            search: overlaps(sticky, search),
            legend: legendBox ? overlaps(sticky, legendBox) : false,
            sub: [...document.querySelectorAll('.gday-sub')].some(el => overlaps(sticky, el.getBoundingClientRect())),
            nowrap: cs.whiteSpace === 'nowrap',
            line: document.querySelector('.gday-sticky').innerText.replace(/\\s+/g, ' ')
          };
        })()`);
        assert.equal(hit.action, false, w + lang);
        assert.equal(hit.search, false, w + lang);
        assert.equal(hit.legend, false, w + lang);
        assert.equal(hit.sub, false, w + lang + ' running total');
        assert.equal(hit.nowrap, true, w + lang);
        assert.match(hit.line, lang === 'zh' ? /^合计/ : /^Total/);
      }
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

test('svg map text is at least 12px on screen', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  const measure = `(() => {
    const hits = [];
    for (const el of document.querySelectorAll('svg text')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const ctm = el.getScreenCTM();
      if (!ctm) continue;
      const screen = parseFloat(cs.fontSize) * Math.hypot(ctm.a, ctm.b);
      if (screen < 11.95) hits.push((el.textContent || '').trim().slice(0, 28) + ' ' + screen.toFixed(1));
      if (hits.length > 8) break;
    }
    return hits;
  })()`;
  try {
    for (const w of [320, 390, 1440]) {
      await page.view(w, w === 1440 ? 900 : 844, w < 800);
      await page.go('route.html?id=routeburn-track&lang=en');
      await page.waitFor('document.querySelector(".route-map-svg")');
      await page.ev('document.querySelector("#routeMap").scrollIntoView()');
      await page.ev('new Promise(r => setTimeout(r, 120))');
      const routeHits = await page.ev(measure);
      assert.deepEqual(routeHits, [], 'route ' + w + ' ' + JSON.stringify(routeHits));
      await page.go('plan.html?lang=en');
      await page.waitFor('document.readyState === "complete"', 20000);
      await page.click('#p10-next-1');
      await page.click('#p10-next-2');
      await page.click('button[type=submit]');
      await page.waitFor('document.querySelector(".p10-trip-svg text")', 15000);
      await page.ev('document.querySelector(".p10-trip-svg").scrollIntoView()');
      await page.ev('new Promise(r => setTimeout(r, 200))');
      const planHits = await page.ev(measure);
      assert.deepEqual(planHits, [], 'plan ' + w + ' ' + JSON.stringify(planHits));
      for (const [label, url, ready] of [
        ['home', 'index.html?lang=zh', 'document.querySelector(".nz-map text")'],
        ['destination', 'destination.html?id=ni-akl&lang=zh', 'document.querySelector("#v4-dest-map text")'],
        ['template', 'guide.html?template=SI-09B&lang=zh', 'document.querySelector("#gcoast text")']
      ]) {
        await page.go(url);
        await page.waitFor(ready, 20000);
        await page.ev(`document.querySelector("${label === 'home' ? '.nz-map' : label === 'destination' ? '#v4-dest-map' : '#gcoast'}").scrollIntoView()`);
        await page.ev('new Promise(r => setTimeout(r, 250))');
        const hits = await page.ev(measure);
        assert.deepEqual(hits, [], label + ' ' + w + ' ' + JSON.stringify(hits));
      }
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

test('te paki page states the east-section closure and does not call closed nights free', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    for (const lang of ['zh', 'en']) {
      await page.go('route.html?id=te-paki-coastal&lang=' + lang);
      await page.waitFor('document.querySelectorAll(".gday").length >= 4');
      const body = await page.ev(`(() => {
        const days = [...document.querySelectorAll('.gday')];
        return { page: document.body.innerText, d1: days[0].innerText, d2: days[1].innerText, d3: days[2].innerText };
      })()`);
      assert.match(body.page, lang === 'zh' ? /关闭/ : /closed/i);
      assert.match(body.page, lang === 'zh' ? /DOC 公告更新于 2026-09-16/ : /DOC alert last reviewed 16 September 2026/);
      assert.doesNotMatch(body.page, /复核/);
      assert.match(body.page, lang === 'zh' ? /Cape Reinga 至 Te Paki Stream/ : /Cape Reinga to Te Paki Stream/);
      assert.doesNotMatch(body.d1, /免费|free/i);
      assert.doesNotMatch(body.d2, /免费|free/i);
      if (lang === 'zh') assert.match(body.d3, /Tapotupotu 至 Cape Reinga 段关闭，从 Cape Reinga 出发/);
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

test('map labels do not overlap and stay inside the svg', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  const report = sel => `(() => {
    const svg = document.querySelector(${JSON.stringify(sel)});
    if (!svg) return { missing: true, hits: ['missing'], outside: [], small: [], marker: false, leaders: [] };
    const frame = svg.getBoundingClientRect();
    const shown = el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const texts = [...svg.querySelectorAll('text')].filter(shown);
    const hits = [];
    const outside = [];
    const small = [];
    for (let i = 0; i < texts.length; i++) {
      const a = texts[i].getBoundingClientRect();
      const cs = getComputedStyle(texts[i]);
      const ctm = texts[i].getScreenCTM();
      const screen = ctm ? parseFloat(cs.fontSize) * Math.hypot(ctm.a, ctm.b) : 0;
      if (!(screen >= 11.95)) small.push((texts[i].textContent || '').trim().slice(0, 18) + ' ' + screen.toFixed(1));
      if (a.left < frame.left - 1 || a.right > frame.right + 1 || a.top < frame.top - 1 || a.bottom > frame.bottom + 1) outside.push((texts[i].textContent || '').trim().slice(0, 24));
      for (let j = i + 1; j < texts.length; j++) {
        const b = texts[j].getBoundingClientRect();
        if (a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5) hits.push((texts[i].textContent || '').trim().slice(0, 18) + ' | ' + (texts[j].textContent || '').trim().slice(0, 18));
      }
    }
    const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum = rgb => { const m = String(rgb).match(/\\d+/g); if (!m) return 0; return 0.2126 * lin(m[0] / 255) + 0.7152 * lin(m[1] / 255) + 0.0722 * lin(m[2] / 255); };
    const bg = svg.querySelector('rect');
    const leaders = [...svg.querySelectorAll('.gday-leader')].map(line => {
      const cs = getComputedStyle(line);
      const w = parseFloat(cs.strokeWidth) || 0;
      const non = (line.getAttribute('vector-effect') || '') === 'non-scaling-stroke';
      const lctm = line.getScreenCTM();
      const rendered = non ? w : w * (lctm ? Math.hypot(lctm.a, lctm.b) : 1);
      const L1 = lum(cs.stroke), L2 = lum(bg ? getComputedStyle(bg).fill : 'rgb(226,236,232)');
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      return { rendered: Math.round(rendered * 100) / 100, ratio: Math.round(ratio * 100) / 100 };
    });
    const gap = (a, b) => Math.hypot(Math.max(b.left - a.right, a.left - b.right, 0), Math.max(b.top - a.bottom, a.top - b.bottom, 0));
    const pointDist = (x, y, box) => Math.hypot(Math.max(box.left - x, x - box.right, 0), Math.max(box.top - y, y - box.bottom, 0));
    const clipLen = (x1, y1, x2, y2, rect) => {
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
    };
    const endsOf = line => {
      const ctm = line.getScreenCTM();
      if (!ctm) return null;
      const pt = (x, y) => { const p = new DOMPoint(+x, +y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
      return [pt(line.getAttribute('x1'), line.getAttribute('y1')), pt(line.getAttribute('x2'), line.getAttribute('y2'))];
    };
    const watch = svg.classList.contains('v4-schematic') || svg.classList.contains('p10-pick-svg');
    const covers = [];
    const leaderThrough = [];
    const leaderThroughDot = [];
    const labelNextToOtherDot = [];
    const leaderLong = [];
    const detached = [];
    const segDist = (px, py, x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };
    if (watch) {
      const dots = [...svg.querySelectorAll('circle')].filter(c => !c.classList.contains('p10-pick-hit')).map(c => {
        const r = c.getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, rad: Math.min(r.width, r.height) / 2, el: c };
      }).filter(d => d.rad > 0.4);
      for (const el of texts) {
        const box = el.getBoundingClientRect();
        let circle = (el.classList.contains('v4-map-num') || el.classList.contains('v4-map-name') || el.classList.contains('v4-map-tag')) && el.parentNode ? el.parentNode.querySelector('circle') : null;
        const id = el.getAttribute('data-p10-pick-label');
        if (!circle && id) circle = svg.querySelector('[data-p10-pick="' + CSS.escape(id) + '"] .p10-pick-mark');
        if (!circle && el.hasAttribute('data-px')) {
          const px = parseFloat(el.getAttribute('data-px')), py = parseFloat(el.getAttribute('data-py'));
          let best = null, bestD = 1e9;
          svg.querySelectorAll('.p10-pick-mark').forEach(mark => {
            const d = Math.hypot(parseFloat(mark.getAttribute('cx')) - px, parseFloat(mark.getAttribute('cy')) - py);
            if (d < bestD) { bestD = d; best = mark; }
          });
          if (bestD < 3) circle = best;
        }
        if (!circle) continue;
        const dot = circle.getBoundingClientRect();
        const cx = (dot.left + dot.right) / 2, cy = (dot.top + dot.bottom) / 2;
        const name = (el.textContent || '').trim().slice(0, 22);
        for (const other of dots) {
          if (Math.hypot(other.x - cx, other.y - cy) <= 2) continue;
          if (other.x >= box.left && other.x <= box.right && other.y >= box.top && other.y <= box.bottom) covers.push(name);
          const nearPad = svg.classList.contains('v4-schematic') ? 2 : 5;
          if (pointDist(other.x, other.y, box) <= other.rad + nearPad) labelNextToOtherDot.push(name);
        }
        const dist = gap(box, dot);
        if (dist <= 14) continue;
        const rad = Math.min(dot.width, dot.height) / 2;
        const linked = [...svg.querySelectorAll('.v4-map-leader, .p10-pick-leader')].some(line => {
          const ends = endsOf(line);
          if (!ends) return false;
          const [a, b] = ends;
          const nearDot = Math.hypot(a.x - cx, a.y - cy) <= rad + 3 || Math.hypot(b.x - cx, b.y - cy) <= rad + 3;
          const nearText = pointDist(a.x, a.y, box) <= 3 || pointDist(b.x, b.y, box) <= 3;
          return nearDot && nearText;
        });
        if (!linked) detached.push(name + ' ' + dist.toFixed(1));
      }
      for (const line of svg.querySelectorAll('.v4-map-leader, .p10-pick-leader')) {
        const ends = endsOf(line);
        if (!ends) continue;
        const [a, b] = ends;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len > 48) leaderLong.push(len.toFixed(1));
        let ownDot = null, ownD = 1e9;
        for (const d of dots) {
          const dd = Math.hypot(d.x - a.x, d.y - a.y);
          if (dd < ownD) { ownD = dd; ownDot = d; }
        }
        for (const other of dots) {
          if (other === ownDot) continue;
          if (segDist(other.x, other.y, a.x, a.y, b.x, b.y) <= other.rad + 2) leaderThroughDot.push(len.toFixed(0));
        }
        const own = texts.find(t => pointDist(b.x, b.y, t.getBoundingClientRect()) <= 3 || pointDist(a.x, a.y, t.getBoundingClientRect()) <= 3);
        for (const el of texts) {
          if (el === own) continue;
          if (clipLen(a.x, a.y, b.x, b.y, el.getBoundingClientRect()) > 0.2) leaderThrough.push((own && own.textContent || '').trim().slice(0, 12) + ' > ' + (el.textContent || '').trim().slice(0, 12));
        }
      }
    }
    return { hits, outside, small, detached, covers, leaderThrough, leaderThroughDot, labelNextToOtherDot, leaderLong, marker: texts.some(t => /起终|Start\\/end/.test(t.textContent || '')), leaders, wide: frame.width > 20 };
  })()`;
  try {
    const found = [];
    for (const w of [320, 390, 1440]) {
      await page.view(w, w === 1440 ? 900 : 844, w < 800);
      for (const lang of ['zh', 'en']) {
        await page.go('index.html?lang=' + lang);
        await page.waitFor('document.querySelector(".nz-map text")');
        await page.ev('document.querySelector(".nz-map").scrollIntoView()');
        await page.ev('new Promise(r => setTimeout(r, 400))');
        const home = await page.ev(report('.nz-map'));
        if (home.hits.length || home.outside.length || home.small.length) found.push('home ' + lang + ' ' + w + ' ' + JSON.stringify(home));
      }
      await page.go('destination.html?id=ni-akl&lang=zh');
      await page.waitFor('document.querySelector("#v4-dest-map text")', 20000);
      await page.ev('document.querySelector("#v4-dest-map").scrollIntoView()');
      await page.ev('new Promise(r => setTimeout(r, 400))');
      const dest = await page.ev(report('#v4-dest-map svg'));
      if (dest.hits.length || dest.outside.length || dest.small.length) found.push('destination ' + w + ' ' + JSON.stringify(dest));
      await page.go('guide.html?template=SI-09B&lang=zh');
      await page.waitFor('document.querySelector("#gcoast text")', 20000);
      await page.ev('document.querySelector("#gcoast").scrollIntoView()');
      await page.ev('new Promise(r => setTimeout(r, 500))');
      const tpl = await page.ev(report('#gcoast svg'));
      const faint = (tpl.leaders || []).filter(line => line.rendered < 1 || line.ratio < 3);
      if (tpl.hits.length || tpl.outside.length || tpl.small.length || !tpl.leaders.length || faint.length) found.push('template ' + w + ' ' + JSON.stringify(tpl));
      for (const lang of ['zh', 'en']) {
        await page.go('guide.html?template=SI-09B&view=map&lang=' + lang);
        await page.waitFor('document.querySelector("#v4-map svg.v4-schematic text")', 20000);
        await page.ev('document.querySelector("#v4-map").scrollIntoView()');
        await page.ev('new Promise(r => setTimeout(r, 600))');
        const schematic = await page.ev(report('#v4-map svg.v4-schematic'));
        const legend = await page.ev(`(() => {
          const ul = document.querySelector('#v4-map .v4-map-name-list');
          if (!ul) return { missing: true };
          const item = ul.querySelector('li');
          return { display: getComputedStyle(ul).display, n: ul.querySelectorAll('li').length, fs: item ? parseFloat(getComputedStyle(item).fontSize) : 0, text: ul.innerText };
        })()`);
        const legendMarks = await page.ev(`(() => {
          const shown = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1; };
          const svg = document.querySelector('#v4-map svg.v4-schematic');
          const texts = [...svg.querySelectorAll('text')].filter(shown).map(t => (t.textContent || '').trim());
          const items = [...document.querySelectorAll('#v4-map .v4-map-name-list li')].map(li => li.textContent.trim());
          const missing = items.filter(item => {
            const badge = item.split(' ')[0];
            const rest = item.slice(badge.length).trim();
            return !texts.some(m => m === badge || m === item || (rest && m === rest));
          });
          return { missing, n: items.length, texts };
        })()`);
        const badMap = !schematic.wide || !schematic.marker || schematic.hits.length || schematic.outside.length || schematic.small.length || (schematic.detached || []).length || (schematic.covers || []).length || (schematic.leaderThrough || []).length || (schematic.leaderThroughDot || []).length || (schematic.labelNextToOtherDot || []).length || (schematic.leaderLong || []).length;
        if (badMap || legend.missing || legend.display === 'none' || legend.n < 2 || !(legend.fs >= 11.95) || !/\d/.test(legend.text) || legendMarks.missing.length || legendMarks.n < 2) found.push('schematic ' + lang + ' ' + w + ' ' + JSON.stringify({ schematic, legend, legendMarks }));
        await page.go('plan.html?lang=' + lang);
        await page.waitFor('document.querySelector("#p10-next-1")', 20000);
        await page.click('#p10-next-1');
        await page.click('#p10-next-2');
        await page.ev('const details = document.querySelector("#p10-more"); if (details) details.open = true');
        await page.waitFor('document.querySelector("#p10-pick-map svg.p10-pick-svg")', 20000);
        await page.ev('document.querySelector("#p10-pick-map").scrollIntoView()');
        await page.ev('new Promise(r => setTimeout(r, 600))');
        const pick = await page.ev(report('#p10-pick-map svg.p10-pick-svg'));
        const spill = await page.ev(`(() => {
          const hidden = [...document.querySelectorAll('#p10-pick-map .is-unplaced')].map(t => (t.textContent || '').trim()).filter(Boolean);
          const ul = document.querySelector('#p10-pick-map .p10-pick-name-list');
          const items = ul ? [...ul.querySelectorAll('li')].map(li => li.textContent.trim()) : [];
          const item = ul && ul.querySelector('li');
          return { hidden, shown: Boolean(ul && getComputedStyle(ul).display !== 'none'), absent: hidden.filter(name => !items.includes(name)), fs: item ? parseFloat(getComputedStyle(item).fontSize) : 0 };
        })()`);
        const badPick = !pick.wide || pick.hits.length || pick.outside.length || pick.small.length || (pick.detached || []).length || (pick.covers || []).length || (pick.leaderThrough || []).length || (pick.leaderThroughDot || []).length || (pick.labelNextToOtherDot || []).length || (pick.leaderLong || []).length || (spill.hidden.length && (!spill.shown || spill.absent.length || !(spill.fs >= 11.95)));
        if (badPick) found.push('planner ' + lang + ' ' + w + ' ' + JSON.stringify({ pick, spill }));
        if (w === 1440) {
          const overflow = await page.ev(`(() => {
            const ul = document.querySelector('#p10-pick-map .p10-pick-name-list');
            return { open: Boolean(ul && ul.classList.contains('is-open')), missed: [...document.querySelectorAll('#p10-pick-map .is-unplaced')].map(t => (t.textContent || '').trim()) };
          })()`);
          if (overflow.open || overflow.missed.length) found.push('planner overflow ' + lang + ' ' + JSON.stringify(overflow));
        }
        if (w <= 420) {
          const list = await page.ev(`(() => {
            const ul = document.querySelector('#p10-pick-map .p10-pick-name-list');
            if (!ul) return { missing: true };
            const item = ul.querySelector('li');
            const fs = item ? parseFloat(getComputedStyle(item).fontSize) : 0;
            return { display: getComputedStyle(ul).display, n: ul.querySelectorAll('li').length, fs };
          })()`);
          if (list.missing || list.display === 'none' || !list.n || !(list.fs >= 11.95)) found.push('planner list ' + lang + ' ' + w + ' ' + JSON.stringify(list));
        }
      }
    }
    for (const w of [360, 375, 414]) {
      await page.view(w, 844, true);
      for (const lang of ['zh', 'en']) {
        await page.go('guide.html?template=SI-09B&view=map&lang=' + lang);
        await page.waitFor('document.querySelector("#v4-map svg.v4-schematic text")', 20000);
        await page.ev('document.querySelector("#v4-map").scrollIntoView()');
        await page.ev('new Promise(r => setTimeout(r, 600))');
        const schematic = await page.ev(report('#v4-map svg.v4-schematic'));
        const legendMarks = await page.ev(`(() => {
          const shown = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1; };
          const svg = document.querySelector('#v4-map svg.v4-schematic');
          const texts = [...svg.querySelectorAll('text')].filter(shown).map(t => (t.textContent || '').trim());
          const items = [...document.querySelectorAll('#v4-map .v4-map-name-list li')].map(li => li.textContent.trim());
          const missing = items.filter(item => {
            const badge = item.split(' ')[0];
            const rest = item.slice(badge.length).trim();
            return !texts.some(m => m === badge || m === item || (rest && m === rest));
          });
          return { missing, n: items.length, texts };
        })()`);
        const badMap = !schematic.wide || !schematic.marker || schematic.hits.length || schematic.outside.length || schematic.small.length || (schematic.detached || []).length || (schematic.covers || []).length || (schematic.leaderThrough || []).length || (schematic.leaderThroughDot || []).length || (schematic.labelNextToOtherDot || []).length || (schematic.leaderLong || []).length;
        if (badMap || legendMarks.missing.length || legendMarks.n < 2) found.push('schematic ' + lang + ' ' + w + ' ' + JSON.stringify({ schematic, legendMarks }));
      }
    }
    assert.deepEqual(found, []);
  } finally {
    await page.close();
  }
});

test('copy share link shows 已复制 at 390', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    await page.view(390, 844, true);
    await page.go('plan.html?lang=zh');
    await page.waitFor('document.readyState === "complete"', 20000);
    await page.click('#p10-next-1');
    await page.click('#p10-next-2');
    await page.click('button[type=submit]');
    await page.waitFor('document.querySelector("[data-p10-share]")', 15000);
    await page.ev('document.querySelector("[data-p10-share]").scrollIntoView({block:"center"})');
    const cover = await page.ev(`(() => {
      const b = document.querySelector('[data-p10-share]');
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(20, r.height / 2));
      return { covered: !(top === b || b.contains(top)), who: top ? (top.getAttribute('data-p10-share') || top.className || top.tagName) : '' };
    })()`);
    assert.equal(cover.covered, false, JSON.stringify(cover));
    await page.grant(['clipboardReadWrite', 'clipboardSanitizedWrite']);
    await page.cdp('Page.bringToFront');
    await page.ev(`new Promise(resolve => {
      const b = document.querySelector('[data-p10-share]');
      let prev = '', steady = 0;
      const step = () => {
        const r = b.getBoundingClientRect();
        const key = r.left.toFixed(1) + ',' + r.top.toFixed(1);
        steady = key === prev ? steady + 1 : 0;
        prev = key;
        if (steady >= 3) resolve(true);
        else requestAnimationFrame(step);
      };
      step();
    })`);
    const box = await page.ev(`(() => {
      const b = document.querySelector('[data-p10-share]');
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await page.waitFor('document.querySelector(".p10-share-status") && /已复制/.test(document.querySelector(".p10-share-status").textContent)', 5000);
  } finally {
    await page.close();
  }
});

test('schematic stop numbers stay apart from day numbers', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    for (const w of [320, 390, 419, 768, 1440]) {
      await page.view(w, w >= 800 ? 1100 : 900, w < 800);
      for (const lang of ['zh', 'en']) {
        await page.go('guide.html?template=SI-09B&view=map&lang=' + lang);
        await page.waitFor('document.querySelector("#v4-map .v4-map-num") && document.querySelector("#gcoast .gday-num")', 20000);
        await page.ev('new Promise(r => setTimeout(r, 500))');
        const report = await page.ev(`(() => {
          const shown = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && r.width > 1 && r.height > 1; };
          const gap = (a, b) => Math.hypot(Math.max(b.left - a.right, a.left - b.right, 0), Math.max(b.top - a.bottom, a.top - b.bottom, 0));
          const stops = [...document.querySelectorAll('#v4-map .v4-map-num')].filter(shown);
          let min = 1e9, pair = '';
          for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) {
            const g = gap(stops[i].getBoundingClientRect(), stops[j].getBoundingClientRect());
            if (g < min) { min = g; pair = (stops[i].textContent || '').trim() + '/' + (stops[j].textContent || '').trim(); }
          }
          const dayText = [...document.querySelectorAll('#gcoast .gday-num')].map(el => (el.textContent || '').trim());
          const stopText = [...document.querySelectorAll('#v4-map .v4-map-num')].map(el => (el.textContent || '').trim());
          const dayLegend = (document.querySelector('.gcoast-legend') || {}).textContent || '';
          const stopLegend = (document.querySelector('.v4-map-legend-note') || {}).textContent || '';
          return { min, pair, n: stops.length, dayText, stopText, dayLegend, stopLegend };
        })()`);
        const dayParts = report.dayText.flatMap(label => label.split('·'));
        const dayOk = dayParts.filter(label => /^D\d+$/.test(label)).length >= 9 && [1, 2, 3, 4, 5, 6, 7, 8, 9].every(n => dayParts.includes('D' + n));
        const stopOk = report.stopText.some(label => /^\d+$/.test(label)) && report.stopText.every(label => !/^D/.test(label));
        const legends = lang === 'zh'
          ? /天数/.test(report.dayLegend) && /站点顺序/.test(report.stopLegend)
          : /by day/i.test(report.dayLegend) && /stop order/i.test(report.stopLegend);
        if (!(report.min >= 6) || !dayOk || !stopOk || !legends || report.n < 2) problems.push(lang + ' ' + w + ' ' + JSON.stringify(report));
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('day numbers stay clear of other dots and planner labels survive a resize', async (t) => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const problems = [];
    const dayAudit = `(() => {
      const svg = document.querySelector('#gcoast svg');
      if (!svg || svg.getBoundingClientRect().width < 20) return { hidden: true };
      const shown = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && r.width > 1 && r.height > 1; };
      const pd = (x, y, box) => Math.hypot(Math.max(box.left - x, x - box.right, 0), Math.max(box.top - y, y - box.bottom, 0));
      const seg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; if (l2 < 1e-6) return Math.hypot(px - x1, py - y1); const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
      const clip = (x1, y1, x2, y2, rect) => { let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1; const p = [-dx, dx, -dy, dy]; const q = [x1 - rect.left, rect.right - x1, y1 - rect.top, rect.bottom - y1]; for (let i = 0; i < 4; i++) { if (Math.abs(p[i]) < 1e-6) { if (q[i] < 0) return 0; continue; } const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return 0; if (t > t0) t0 = t; } else { if (t < t0) return 0; if (t < t1) t1 = t; } } return t1 > t0 ? Math.hypot(dx, dy) * (t1 - t0) : 0; };
      const texts = [...svg.querySelectorAll('.gday-num')].filter(shown);
      const dots = [...svg.querySelectorAll('.gday-stop circle')].map(c => { const r = c.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, rad: Math.min(r.width, r.height) / 2, el: c }; }).filter(d => d.rad > 0.4);
      const frame = svg.getBoundingClientRect();
      const covers = [], near = [], outside = [];
      for (const el of texts) {
        const box = el.getBoundingClientRect();
        const own = el.parentNode.querySelector('circle');
        const o = own.getBoundingClientRect();
        const cx = (o.left + o.right) / 2, cy = (o.top + o.bottom) / 2;
        if (box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1) outside.push((el.textContent || '').trim());
        for (const d of dots) {
          if (Math.hypot(d.x - cx, d.y - cy) <= 2) continue;
          if (d.x >= box.left && d.x <= box.right && d.y >= box.top && d.y <= box.bottom) covers.push((el.textContent || '').trim());
          if (pd(d.x, d.y, box) <= d.rad + 2) near.push((el.textContent || '').trim());
        }
      }
      const through = [], throughDot = [], long = [];
      for (const line of svg.querySelectorAll('.gday-leader')) {
        const ctm = line.getScreenCTM(); if (!ctm) continue;
        const P = (x, y) => { const p = new DOMPoint(+x, +y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
        const a = P(line.getAttribute('x1'), line.getAttribute('y1')), b = P(line.getAttribute('x2'), line.getAttribute('y2'));
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len > 48) long.push(len.toFixed(1));
        let own = null, ownD = 1e9;
        for (const d of dots) { const dd = Math.hypot(d.x - a.x, d.y - a.y); if (dd < ownD) { ownD = dd; own = d; } }
        for (const d of dots) if (d !== own && seg(d.x, d.y, a.x, a.y, b.x, b.y) <= d.rad + 2) throughDot.push(len.toFixed(0));
        const ownText = texts.find(t => pd(b.x, b.y, t.getBoundingClientRect()) <= 3);
        for (const el of texts) if (el !== ownText && clip(a.x, a.y, b.x, b.y, el.getBoundingClientRect()) > 0.2) through.push((ownText && ownText.textContent || '').trim());
      }
      return { n: texts.length, covers, near, outside, through, throughDot, long };
    })()`;
    for (const w of [320, 390, 419, 768, 1440]) {
      await page.view(w, w >= 800 ? 1100 : 900, w < 800);
      for (const lang of ['zh', 'en']) {
        await page.go('guide.html?template=SI-09B&lang=' + lang);
        await page.waitFor('document.querySelector("#gcoast .gday-num")', 20000);
        await page.ev('document.querySelector("#gcoast").scrollIntoView({block:"center"})');
        await page.ev('new Promise(r => setTimeout(r, 700))');
        const day = await page.ev(dayAudit);
        if (day.hidden || !day.n || day.covers.length || day.near.length || day.outside.length || day.through.length || day.throughDot.length || day.long.length) problems.push('day ' + lang + ' ' + w + ' ' + JSON.stringify(day));
      }
    }
    const pickAudit = `(() => {
      const host = document.querySelector('#p10-pick-map');
      const svg = host && host.querySelector('svg');
      const box = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
      if (!svg || box.width < 20 || box.height < 20) return { hidden: true, w: box.width, h: box.height };
      const shown = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && r.width > 1 && r.height > 1; };
      const texts = [...svg.querySelectorAll('.p10-pick-label,.p10-pick-tag')].filter(shown);
      const frame = svg.getBoundingClientRect();
      const hits = [], covers = [], outside = [], small = [];
      const dots = [...svg.querySelectorAll('.p10-pick-mark')].map(c => { const r = c.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; }).filter(d => d.x || d.y);
      for (let i = 0; i < texts.length; i++) {
        const a = texts[i].getBoundingClientRect();
        const cs = getComputedStyle(texts[i]);
        const ctm = texts[i].getScreenCTM();
        const screen = ctm ? parseFloat(cs.fontSize) * Math.hypot(ctm.a, ctm.b) : parseFloat(cs.fontSize);
        if (!(screen >= 11.95)) small.push((texts[i].textContent || '').trim().slice(0, 12) + ' ' + screen.toFixed(1));
        if (a.left < frame.left - 1 || a.right > frame.right + 1 || a.top < frame.top - 1 || a.bottom > frame.bottom + 1) outside.push((texts[i].textContent || '').trim().slice(0, 18));
        for (let j = i + 1; j < texts.length; j++) {
          const b = texts[j].getBoundingClientRect();
          if (a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5) hits.push((texts[i].textContent || '').trim().slice(0, 12));
        }
        for (const d of dots) if (d.x >= a.left && d.x <= a.right && d.y >= a.top && d.y <= a.bottom) covers.push((texts[i].textContent || '').trim().slice(0, 12));
      }
      const ul = host.querySelector('.p10-pick-name-list');
      const listShown = Boolean(ul && getComputedStyle(ul).display !== 'none');
      const listN = listShown ? ul.querySelectorAll('li').length : 0;
      const total = [...svg.querySelectorAll('.p10-pick-label,.p10-pick-tag')].filter(t => !t.classList.contains('is-off') || t.classList.contains('is-unplaced')).length;
      return { n: texts.length, total, listN, listShown, hits, covers, outside, small, w: box.width, h: box.height };
    })()`;
    const openPlan = async () => {
      await page.waitFor('document.querySelector("#p10-next-1")', 20000);
      await page.click('#p10-next-1');
      await page.click('#p10-next-2');
      await page.ev('const d=document.querySelector("#p10-more"); if(d) d.open=true');
      await page.waitFor('document.querySelector("#p10-pick-map svg")', 20000);
      await page.ev('new Promise(r => setTimeout(r, 600))');
    };
    for (const w of [768, 900, 1000]) {
      await page.view(w, 900, false);
      await page.go('plan.html?lang=zh');
      await openPlan();
      const first = await page.ev(pickAudit);
      await page.view(w, 960, false);
      await page.ev('new Promise(r => setTimeout(r, 600))');
      const after = await page.ev(pickAudit);
      const bad = audit => audit.hidden || audit.n < 25 || audit.hits.length || audit.covers.length || audit.outside.length || audit.small.length || audit.n < audit.total - audit.listN || (audit.listN > 0 && !audit.listShown);
      if (bad(first) || bad(after)) problems.push('planner ' + w + ' ' + JSON.stringify({ first, after }));
    }
    await page.view(1180, 900, false);
    await page.go('plan.html?lang=zh');
    await openPlan();
    await page.view(820, 900, false);
    await page.ev('new Promise(r => setTimeout(r, 600))');
    const narrow = await page.ev(pickAudit);
    if (narrow.hidden || !(narrow.w > 20) || !(narrow.h > 20)) problems.push('1180->820 ' + JSON.stringify(narrow));
    await page.view(1440, 900, false);
    await page.ev('new Promise(r => setTimeout(r, 400))');
    await page.view(390, 844, true);
    await page.ev('new Promise(r => setTimeout(r, 600))');
    const phone = await page.ev(`(() => { const svg=document.querySelector('#p10-pick-map svg'); const b=svg?svg.getBoundingClientRect():{width:0,height:0}; return {w:b.width,h:b.height}; })()`);
    if (!(phone.w > 20) || !(phone.h > 20)) problems.push('1440->390 ' + JSON.stringify(phone));
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});
