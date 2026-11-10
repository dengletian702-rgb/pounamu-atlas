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
});
