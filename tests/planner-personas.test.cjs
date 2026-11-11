'use strict';
// Four visitors from the 2026-11-11 walk-through: each plan must reach the chosen departure city, avoid driving the
// same pass twice when a loop exists, and keep the headline sights when days are short.
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(place => place.type === 'town');
const planner = require('../docs/p10-planner.js');

const run = input => { const plan = planner.p10Plan(input); return { plan, view: planner.p10Present(plan) }; };
const retraced = days => {
  const seen = new Map();
  for (const d of days) for (const l of d.legs) { const k = [l.a, l.b].sort().join('|'); seen.set(k, (seen.get(k) || 0) + 1); }
  return [...seen].filter(([, n]) => n > 1).map(([k]) => k);
};

test('South Island couple, 10 days: ends in Queenstown and keeps Milford Sound', () => {
  const { view } = run({ start: 'christchurch', end: 'queenstown', days: 10, pace: 5, preference: 'walk', car: true, wishes: ['tekapo', 'aoraki', 'glaciers', 'wanaka', 'milford', 'queenstown'] });
  assert.equal(view.days.length, 10);
  assert.equal(view.days[9].at, 'queenstown');
  const done = new Set(view.days.flatMap(d => d.activities.map(a => a.wish.id)));
  assert.ok(done.has('milford'));
  assert.ok(done.has('aoraki'));
});

test('South Island couple, 16 days: loops by Arthur’s Pass instead of crossing the Haast Pass twice', () => {
  const { plan, view } = run({ start: 'christchurch', end: 'queenstown', days: 16, pace: 5, preference: 'walk', car: true, wishes: ['tekapo', 'aoraki', 'glaciers', 'wanaka', 'milford', 'queenstown'] });
  assert.ok(plan.minimum <= 16);
  assert.deepEqual(retraced(view.days).filter(k => /haast/.test(k)), []);
  assert.equal(view.days[view.days.length - 1].at, 'queenstown');
});

test('North Island family, 7 days at 3.5 h a day: back in Auckland with Hobbiton, Waitomo and Rotorua', () => {
  const { view } = run({ start: 'auckland', end: 'auckland', days: 7, pace: 3.5, preference: 'walk', car: true, wishes: ['hobbiton', 'waitomo', 'rotorua', 'taupo', 'coromandel'] });
  assert.equal(view.days.length, 7);
  assert.equal(view.days[6].at, 'auckland');
  const done = new Set(view.days.flatMap(d => d.activities.map(a => a.wish.id)));
  for (const id of ['hobbiton', 'waitomo', 'rotorua']) assert.ok(done.has(id), id);
  for (const d of view.days) assert.ok(d.legs.filter(l => l.mode === 'car').reduce((s, l) => s + l.h, 0) <= 3.5, 'day ' + d.n);
});

test('Backpacker, Auckland to Queenstown by bus, train and ferry in 14 days ends in Queenstown', () => {
  const { view } = run({ start: 'auckland', end: 'queenstown', days: 14, pace: 5, preference: 'transit', car: false, wishes: ['rotorua', 'tongariro', 'wellington', 'abel-tasman', 'glaciers', 'wanaka', 'milford', 'queenstown'] });
  assert.equal(view.days.length, 14);
  assert.equal(view.days[13].at, 'queenstown');
  assert.equal(view.unscheduled.some(item => item.id === 'queenstown'), false);
});

test('a ticked town that is the same place as a ticked sight is planned once', () => {
  const plan = planner.p10Plan({ start: 'christchurch', end: 'queenstown', days: 7, pace: 5, preference: 'walk', car: true, wishes: ['queenstown', 'si-zqn', 'si-tek'] });
  assert.equal(plan.order.filter(w => w.base === 'queenstown').length, 1);
  assert.ok(plan.order.some(w => w.id === 'si-tek' && w.base === 'tekapo'));
  assert.equal(plan.inaccessible.length, 0);
});

test('Stewart Island is reachable for drivers (park in Bluff, take the ferry)', () => {
  const plan = planner.p10Plan({ start: 'queenstown', end: 'queenstown', days: 8, pace: 5, preference: 'walk', car: true, wishes: ['stewart'] });
  assert.equal(plan.inaccessible.length, 0);
});
