'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const planner = require('../docs/p10-planner.js');

test('a short day count still returns the day list and map points', () => {
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
  assert.ok(plan.minimum > input.days);
  const view = planner.p10Present(plan);
  assert.ok(view.days.length > 0);
  assert.ok(view.map && view.map.points.length > 1);
  assert.equal(view.warning.selected, 9);
  assert.ok(view.warning.minimum > 9);
  assert.ok(view.warning.suggestions.includes('add-days'));
  assert.ok(view.warning.suggestions.includes('switch-template'));
});
