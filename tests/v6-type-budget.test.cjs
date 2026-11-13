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
  assert.deepEqual(plan.routeImport.days.map(day => day.stayEn), ['Clinton Hut', 'Mintaro Hut', 'Dumpling Hut', 'Sandfly Point']);
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
  assert.equal(plan.routeImport.days.length, 1);
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
    for (const day of days) {
      if (day.noStay) continue;
      assert.doesNotMatch(day.stayEn, verb, route.id + ' stay ' + day.stayEn);
      assert.doesNotMatch(day.titleEn, verb, route.id + ' title ' + day.titleEn);
      assert.doesNotMatch(day.query || '', /Leave Routeburn|Climb through the high forest|Lunch in Marlborough/, route.id);
    }
  }
  const milford = routeDays(routes.find(route => route.id === 'milford-track'));
  assert.equal(milford[1].textEn.includes('usual second night'), false);
  assert.match(milford[3].moveEn, /Boat out the same day/);
  const wh = routeDays(routes.find(route => route.id === 'whanganui-journey'));
  assert.equal(wh[0].stayKind, 'great-walk');
  const train = routeDays(routes.find(route => route.id === 'tranzalpine'));
  assert.equal(train[0].dir.destination, 'Greymouth Railway Station');
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
            nowrap: cs.whiteSpace === 'nowrap',
            line: document.querySelector('.gday-sticky').innerText.replace(/\\s+/g, ' ')
          };
        })()`);
        assert.equal(hit.action, false, w + lang);
        assert.equal(hit.search, false, w + lang);
        assert.equal(hit.legend, false, w + lang);
        assert.equal(hit.nowrap, true, w + lang);
        assert.match(hit.line, lang === 'zh' ? /^合计/ : /^Total/);
      }
    }
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});
