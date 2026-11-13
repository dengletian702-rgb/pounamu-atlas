'use strict';
// UI v2 (2026-11-13): search and planner fixes from the ten-guest retest, plus the interaction layer staying out of the way.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

async function withPage(t, fn) {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try { await fn(page); } finally { await page.close(); }
}
const sub = [];
const results = 'document.querySelector("#v4-results") && document.querySelector("#v4-results").innerText';

test('every page loads the ui-v2 layer with a version tag', () => {
  for (const page of ['index.html', 'routes.html', 'route.html', 'prepare.html', 'plan.html', 'destination.html', 'guide.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', 'docs', page), 'utf8');
    assert.match(html, /href="ui-v2\.css\?v=[0-9a-f]{12}"/, page);
    assert.match(html, /src="ui-v2\.js\?v=[0-9a-f]{12}"/, page);
  }
});

sub.push(['search: 亲子 finds easy short walks, a typo offers the right town, North Island 7–10 days hands off to the planner', async page => {
  await page.go('index.html?q=' + encodeURIComponent('亲子') + '&lang=zh');
  await page.waitFor('document.querySelector(\'[data-topic="family"] li a\')');
  assert.ok(await page.ev('document.querySelectorAll(\'[data-topic="family"] li a[href*="route.html"]\').length') > 0);

  await page.go('index.html?q=' + encodeURIComponent('皇后真') + '&lang=zh');
  await page.waitFor('document.querySelector(".v4-did-you-mean button")');
  assert.ok((await page.ev('[...document.querySelectorAll(".v4-did-you-mean button")].map(b => b.textContent)')).includes('皇后镇'));
  await page.click('.v4-did-you-mean button[data-v4-q="皇后镇"]');
  await page.waitFor('!document.querySelector(".v4-did-you-mean")');
  assert.doesNotMatch(await page.ev(results), /没有找到/);

  await page.go('index.html?days=7-10&island=north&lang=zh');
  await page.waitFor('document.querySelector(".v4-primary-link")');
  assert.match(await page.ev('document.querySelector(".v4-primary-link").getAttribute("href")'), /plan\.html\?from=auckland&to=wellington&days=8/);
}]);

sub.push(['the unfiltered home list shows six templates and opens the rest on request', async page => {
  await page.go('index.html?lang=en');
  await page.waitFor('document.querySelector("[data-v4-more]")');
  const before = await page.ev('[...document.querySelectorAll("#v4-results .v4-card[data-template]")].filter(c => c.offsetParent).length');
  assert.equal(before, 6);
  await page.click('[data-v4-more]');
  const after = await page.ev('[...document.querySelectorAll("#v4-results .v4-card[data-template]")].filter(c => c.offsetParent).length');
  assert.ok(after > before);
}]);

sub.push(['planner: a restored trip says so, keeps only this island on request, and can be cleared', async page => {
  await page.go('plan.html?lang=zh');
  await page.ev(`localStorage.setItem('p10-road-plan', JSON.stringify({start:'christchurch',end:'queenstown',days:7,pace:3.5,preference:'easy',car:true,month:0,stay:'',wishes:['rotorua','tongariro','wanaka','queenstown','milford']}))`);
  await page.go('plan.html?lang=zh');
  await page.waitFor('document.querySelector(".p10-restored") && document.querySelector(".p10-keep-island")');
  await page.click('.p10-keep-island');
  await page.waitFor('!document.querySelector(".p10-restored")');
  const wishes = await page.ev('JSON.parse(localStorage.getItem("p10-road-plan")).wishes');
  assert.deepEqual(wishes.filter(id => id === 'rotorua' || id === 'tongariro'), []);
  assert.ok(wishes.includes('queenstown'));
  await page.ev(`localStorage.setItem('p10-road-plan', JSON.stringify({start:'christchurch',end:'queenstown',days:7,pace:3.5,preference:'easy',car:true,month:0,stay:'',wishes:['wanaka']}))`);
  await page.go('plan.html?lang=zh');
  await page.waitFor('document.querySelector("[data-p10-reset]")');
  await page.click('[data-p10-reset]');
  assert.equal(await page.ev('localStorage.getItem("p10-road-plan")'), null);
  assert.equal(await page.ev('document.querySelector("#planResult").innerHTML'), '');
}]);

sub.push(['planner: a July stay in Queenstown lists nearby ski areas, and its second day does not repeat the first', async page => {
  await page.go('plan.html?from=queenstown&to=queenstown&days=4&m=7&w=queenstown&lang=zh');
  await page.waitFor('document.querySelector(".p10-ski")', 12000);
  const ski = await page.ev('document.querySelector(".p10-ski").innerText');
  assert.match(ski, /雪季附近可滑雪/);
  const visits = await page.ev('[...document.querySelectorAll("#planResult .plan-day")].map(d => d.innerText).filter(x => /游览：皇后镇/.test(x))');
  assert.equal(visits.length, 2);
  assert.notEqual(visits[0].split('游览：')[1].slice(0, 40), visits[1].split('游览：')[1].slice(0, 40));
  assert.match(visits[1], /看皇后镇的景点与活动/);
}]);

sub.push(['English pages drop the Chinese brand from the tab title and the map shows English names only', async page => {
  await page.go('index.html?lang=en');
  await page.waitFor('document.documentElement.lang.startsWith("en") && !document.title.includes("绿石之地")');
  assert.equal(await page.ev('[...document.querySelectorAll(".nzmap-label-zh")].filter(e => getComputedStyle(e).display !== "none").length'), 0);
}]);

sub.push(['the ⌘K palette opens, finds a route and closes on Escape', async page => {
  await page.go('routes.html?lang=en');
  await page.waitFor('document.querySelector(".ui2-kbtn")');
  await page.click('.ui2-kbtn');
  await page.waitFor('document.querySelector(".ui2-palette.on") && document.querySelectorAll(".ui2-pal li").length > 3');
  await page.ev('(() => { const i = document.querySelector(".ui2-pal input"); i.value = "hooker"; i.dispatchEvent(new Event("input")); })()');
  assert.match(await page.ev('document.querySelector(".ui2-pal li a").getAttribute("href")'), /route\.html\?id=hooker/);
  await page.ev('document.querySelector(".ui2-pal input").dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}))');
  assert.equal(await page.ev('document.querySelector(".ui2-palette").classList.contains("on")'), false);
}]);

// One Chrome for all page checks keeps the suite's parallel browser load where it was.
test('ui-v2 pages', async t => withPage(t, async page => {
  for (const [name, fn] of sub) await t.test(name, () => fn(page));
}));
