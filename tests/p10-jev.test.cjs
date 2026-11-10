'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const plannerPath = path.join(root, 'docs/p10-planner.js');
const planner = require(plannerPath);
const routes = JSON.parse(fs.readFileSync(path.join(root, 'outputs/route-catalogue.json'), 'utf8'));
test('Jev island counts selected destinations and uses the start for ties', () => {
  assert.equal(planner.p10JevIsland('christchurch',['rotorua']), 'north');
  assert.equal(planner.p10JevIsland('auckland',['glaciers','aoraki']), 'south');
  assert.equal(planner.p10JevIsland('christchurch',['rotorua','napier','glaciers']), 'north');
  assert.equal(planner.p10JevIsland('christchurch',['rotorua','glaciers']), 'south');
  assert.equal(planner.p10JevIsland('wellington',['rotorua','glaciers']), 'north');
  assert.equal(planner.p10JevIsland('auckland',[]), 'north');
  assert.equal(planner.p10JevIsland('christchurch',[]), 'south');
  assert.equal(planner.p10JevIsland('christchurch',['rotorua','rotorua','glaciers']), 'south');
});
test('Jev recommendation names come from site route data and unknown IDs are omitted', () => {
  assert.equal(planner.p10JevRouteName('hooker','zh',routes),'胡克谷步道');
  assert.equal(planner.p10JevRouteName('hooker','en',routes),'Hooker Valley Track');
  assert.equal(planner.p10JevRouteName('not-a-route','zh',routes),'');
  for (const route of routes) {
    assert.equal(planner.p10JevRouteName(route.id,'zh',routes),route.zh);
    assert.equal(planner.p10JevRouteName(route.id,'en',routes),route.name);
  }
});
test('every selectable destination has bilingual tips', () => {
  for (const wish of planner.WISHES) {
    assert.ok(planner.P10_WISH_TIPS[wish.id]?.zh, `${wish.id} Chinese`);
    assert.ok(planner.P10_WISH_TIPS[wish.id]?.en, `${wish.id} English`);
    // v3.1 C12: each tip carries official sources or is flagged to verify
    const tip=planner.P10_WISH_TIPS[wish.id];
    assert.ok((Array.isArray(tip.src)&&tip.src.length&&tip.src.every(x=>/^https:\/\//.test(x.url)&&x.checkedAt))||tip.verify===true, `${wish.id} source or to-verify`);
  }
});
test('Auckland to Wellington plan includes Tongariro and Napier activity days', () => {
  const plan=planner.p10Plan({start:'auckland',end:'wellington',days:10,pace:5,preference:'drive',car:true,wishes:['tongariro','rotorua','napier']});
  assert.ok(plan.minimum <= 10);
  const ids=planner.p10Timeline(plan).flatMap(day=>day.activities.map(a=>a.wish.id));
  assert.ok(ids.includes('tongariro'));
  assert.ok(ids.includes('napier'));
  assert.match(planner.P10_WISH_TIPS.tongariro.zh,/20\.2 km.*接驳车.*天气/);
  assert.match(planner.P10_WISH_TIPS.napier.zh,/1931/);
});
test('deployed source copy and editable source are identical', () => {
  assert.equal(fs.readFileSync(plannerPath,'utf8'),fs.readFileSync(path.join(root,'outputs/site/p10-planner.js'),'utf8'));
});
