'use strict';
// From the 2026-11-12 re-walk: round trips from Christchurch or Auckland, trips with nothing picked, and trims that
// keep the headline places. Every plan uses all its days, ends in the departure city and does not pile spare days
// up there while there are places on the way.
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../docs/data/v4-catalog.json');
globalThis.P10_CATALOG_TOWNS = catalog.places.filter(place => place.type === 'town');
const planner = require('../docs/p10-planner.js');

const trip = (start, end, days, wishes, extra = {}) => ({ start, end, days, pace: 5, preference: 'easy', car: true, wishes, ...extra });
const run = input => { const plan = planner.p10Plan(input); return { plan, view: planner.p10Present(plan) }; };
const visits = view => new Set(view.days.flatMap(d => d.activities.map(a => a.wish.id)));
const freeIn = (view, at) => view.days.filter(d => d.kind === 'free' && d.at === at).length;

test('Christchurch loop, 10 days, nothing picked: a real round trip with Queenstown and Milford Sound', () => {
  const { plan, view } = run(trip('christchurch', 'christchurch', 10, []));
  assert.ok(plan.suggested && plan.suggested.length >= 4, String(plan.suggested));
  for (const id of ['queenstown', 'milford']) assert.ok(plan.suggested.includes(id), id);
  assert.equal(view.days.length, 10);
  assert.equal(view.days[9].at, 'christchurch');
  assert.ok(new Set(view.days.map(d => d.at)).size >= 5);
  assert.equal(freeIn(view, 'christchurch'), 0);
});

test('Auckland loop, 10 days, nothing picked: Hobbiton and Rotorua, back in Auckland', () => {
  const { plan, view } = run(trip('auckland', 'auckland', 10, []));
  for (const id of ['hobbiton', 'rotorua']) assert.ok(plan.suggested.includes(id), id);
  assert.equal(view.days.length, 10);
  assert.equal(view.days[9].at, 'auckland');
  assert.equal(freeIn(view, 'auckland'), 0);
});

test('without a car, a suggested route only uses places reachable by bus, train or ferry', () => {
  const { plan, view } = run(trip('christchurch', 'christchurch', 10, [], { car: false }));
  assert.ok(plan.suggested.length >= 3);
  for (const id of plan.suggested) assert.notEqual(planner.WISHES.find(w => w.id === id).pt, false, id);
  assert.equal(view.days.length, 10);
});

test('Christchurch loop, 14 days, eight places: keeps Queenstown and Milford Sound, leaves out the detours', () => {
  const { view } = run(trip('christchurch', 'christchurch', 14, ['kaikoura', 'abel-tasman', 'glaciers', 'wanaka', 'queenstown', 'milford', 'aoraki', 'tekapo']));
  assert.equal(view.days.length, 14);
  assert.equal(view.days[13].at, 'christchurch');
  const done = visits(view);
  for (const id of ['queenstown', 'milford', 'aoraki', 'tekapo']) assert.ok(done.has(id), id);
  assert.ok(view.unscheduled.length >= 1);
  for (const item of view.unscheduled) assert.ok(['kaikoura', 'abel-tasman'].includes(item.id), item.id);
});

test('Christchurch loop, 16 days, eight places: only Abel Tasman is left out', () => {
  const { view } = run(trip('christchurch', 'christchurch', 16, ['kaikoura', 'abel-tasman', 'glaciers', 'wanaka', 'queenstown', 'milford', 'aoraki', 'tekapo']));
  assert.equal(view.days.length, 16);
  assert.deepEqual(view.unscheduled.map(item => item.id), ['abel-tasman']);
});

test('a two-day stay is shortened before a place is dropped', () => {
  const { view } = run(trip('christchurch', 'christchurch', 9, ['queenstown', 'milford', 'tekapo']));
  assert.equal(view.fitted, true);
  assert.equal(view.days.length, 9);
  assert.equal(view.unscheduled.length, 0);
  assert.deepEqual(view.shortened.map(w => [w.id, w.days, w.fullDays]), [['queenstown', 1, 2]]);
  const done = visits(view);
  for (const id of ['queenstown', 'milford', 'tekapo']) assert.ok(done.has(id), id);
});

test('spare days go to places on the way before the departure city', () => {
  const { view } = run(trip('christchurch', 'christchurch', 7, ['tekapo', 'aoraki', 'queenstown']));
  assert.equal(view.days.length, 7);
  assert.ok(view.days.some(d => d.kind === 'free' && d.at !== 'christchurch'));
  const only = run(trip('christchurch', 'christchurch', 10, ['tekapo'])).view;
  assert.equal(freeIn(only, 'tekapo'), 1);
});

test('with days to spare, the planner offers places that still fit', () => {
  const { plan } = run(trip('christchurch', 'christchurch', 10, ['tekapo']));
  const extras = planner.p10Extras(plan).map(w => w.id);
  assert.ok(extras.includes('queenstown'), String(extras));
  const { view } = run(trip('christchurch', 'christchurch', 10, ['tekapo', ...extras]));
  assert.equal(view.days.length, 10);
  assert.equal(view.unscheduled.length, 0);
  assert.equal(view.days[9].at, 'christchurch');
});

test('a short morning drive shares the day with a whole-day visit', () => {
  const { view } = run(trip('christchurch', 'queenstown', 8, ['tekapo', 'wanaka', 'queenstown', 'milford']));
  const day = view.days.find(d => d.activities.some(a => a.wish.id === 'wanaka'));
  assert.ok(day && day.legs.length > 0);
  assert.ok(day.legs.reduce((s, l) => s + l.h, 0) <= 2);
});

test('the picker lists a town that is the same place as a sight only once', () => {
  const town = id => catalog.places.find(p => p.place_id === id);
  for (const id of ['si-zqn', 'si-tea', 'si-mfd', 'si-fox', 'si-sti', 'ni-mtm', 'ni-cmd']) assert.equal(planner.p10TownIsSight(town(id)), true, id);
  for (const id of ['si-gle', 'si-twz', 'ni-whk']) assert.equal(planner.p10TownIsSight(town(id)), false, id);
});

test('a three-week suggestion is worked out quickly', () => {
  const t = Date.now();
  const { view } = run(trip('christchurch', 'christchurch', 21, []));
  assert.equal(view.days.length, 21);
  assert.ok(Date.now() - t < 5000, `${Date.now() - t} ms`);
});
