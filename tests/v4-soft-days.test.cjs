'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const planner = require('../docs/p10-planner.js');

test('a 9-day request returns exactly 9 day cards and an unscheduled list', () => {
  const input = {
    start: 'christchurch',
    end: 'queenstown',
    days: 9,
    pace: 5,
    preference: 'drive',
    car: true,
    wishes: ['tekapo', 'aoraki', 'wanaka', 'queenstown', 'milford'],
  };
  const plan = planner.p10Plan(input);
  assert.ok(plan.minimum > 9);
  const view = planner.p10Present(plan);
  assert.equal(view.days.length, 9);
  assert.ok(view.unscheduled.length > 0);
  assert.ok(view.map.points.some(point => point.scheduled === false));
  const restored = planner.p10Present(planner.p10Plan({ ...input, days: plan.minimum }));
  assert.equal(restored.days.length, plan.minimum);
  assert.equal(restored.unscheduled.length, 0);
  assert.equal(view.days[8].at, 'queenstown');
  const removable = planner.p10Removable(plan, view);
  assert.deepEqual(removable.map(item => item.id), ['wanaka']);
  assert.equal(removable.some(item => /si-|ni-/.test(item.zh) || /si-|ni-/.test(item.en)), false);
});

test('a 5-day cap still ends in the departure city and lists what was left out', () => {
  const input = {
    start: 'christchurch',
    end: 'queenstown',
    days: 5,
    pace: 5,
    preference: 'drive',
    car: true,
    wishes: ['tekapo', 'aoraki', 'wanaka', 'queenstown', 'milford'],
  };
  const plan = planner.p10Plan(input);
  const view = planner.p10Present(plan);
  assert.equal(view.fitted, true);
  assert.equal(view.days.length, 5);
  assert.equal(view.days[4].at, 'queenstown');
  assert.equal(view.days[4].kind, 'depart');
  assert.equal(planner.p10ShortfallNote(plan, view, 'zh'), '');
  assert.ok(view.unscheduled.length > 0);
  assert.equal(view.unscheduled.some(item => item.id === 'tekapo'), false);
  assert.equal(view.unscheduled.some(item => /si-|ni-/.test(item.zh)), false);
  assert.ok(planner.p10DropChoices(plan).length > 0);
  const fitted = planner.p10Plan({
    start: 'christchurch', end: 'queenstown', days: 9, pace: 5, preference: 'drive', car: true,
    wishes: ['tekapo', 'aoraki', 'wanaka', 'queenstown'],
  });
  const fittedView = planner.p10Present(fitted);
  assert.equal(fittedView.unscheduled.length, 0);
  assert.equal(planner.p10StillTight(fitted, fittedView), false);
});

test('only a trip that cannot reach the departure city at all is cut short, with a note', () => {
  const plan = planner.p10Plan({ start: 'auckland', end: 'queenstown', days: 3, pace: 3.5, preference: 'drive', car: true, wishes: ['rotorua'] });
  const view = planner.p10Present(plan);
  assert.equal(view.fitted, false);
  assert.equal(view.days.length, 3);
  assert.match(planner.p10ShortfallNote(plan, view, 'zh'), /还没到皇后镇/);
});
