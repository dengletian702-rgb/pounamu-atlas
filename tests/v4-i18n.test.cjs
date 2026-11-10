'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('every new interface string has both zh and en', () => {
  const strings = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/data/v4-strings.json'), 'utf8'));
  const keys = Object.keys(strings);
  assert.ok(keys.length > 20);
  for (const key of keys) {
    const row = strings[key];
    assert.equal(typeof row.zh, 'string', key);
    assert.equal(typeof row.en, 'string', key);
    assert.ok(row.zh.trim(), key + ' zh');
    assert.ok(row.en.trim(), key + ' en');
  }
  const planner = fs.readFileSync(path.join(__dirname, '../docs/p10-planner.js'), 'utf8');
  for (const line of ['排不下的地点在「未安排」里', 'Places that do not fit are under Unscheduled', '减点或换点', 'Remove or swap a place', '把天数改成', 'Change to', '未安排', 'Unscheduled', '行程结束在', 'has not reached', '估算约']) {
    assert.ok(planner.includes(line), line);
  }
});
