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
  const removable = planner.p10Removable(plan, view);
  assert.deepEqual(removable.map(item => item.id), ['milford']);
  assert.equal(removable.some(item => /si-|ni-/.test(item.zh) || /si-|ni-/.test(item.en)), false);
});

test('a 5-day cap ends before the departure city and keeps reached places off the unscheduled list', () => {
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
  assert.equal(view.days.length, 5);
  assert.equal(view.days[4].at, 'wanaka');
  assert.equal(view.unscheduled.some(item => item.id === 'wanaka' || item.base === 'wanaka'), false);
  assert.equal(view.unscheduled.some(item => /si-|ni-/.test(item.zh)), false);
  const note = planner.p10ShortfallNote(plan, view, 'zh');
  assert.match(note, /行程结束在瓦纳卡，还没到皇后镇/);
  assert.match(note, /估算/);
  const removable = planner.p10Removable(plan, view).map(item => item.id);
  assert.deepEqual(removable, ['milford']);
  assert.equal(planner.p10ShortfallNote(plan, view, 'en').includes('Wānaka'), true);
  const fitted = planner.p10Plan({
    start: 'christchurch', end: 'queenstown', days: 9, pace: 5, preference: 'drive', car: true,
    wishes: ['tekapo', 'aoraki', 'wanaka', 'queenstown'],
  });
  const fittedView = planner.p10Present(fitted);
  assert.equal(fittedView.unscheduled.length, 0);
  assert.equal(planner.p10StillTight(fitted, fittedView), false);
});
