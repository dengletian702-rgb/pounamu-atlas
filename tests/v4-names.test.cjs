'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { importPlaces, TNZ_REGIONS } = require('../scripts/lib/v4-import.cjs');

const banned = ['达尼丁', '特卡波湖', '蒂卡普', '罗托鲁阿', '纳皮尔'];

test('generated pages and data do not keep the old Chinese names', () => {
  const root = path.resolve(__dirname, '..');
  const files = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (name === 'assets' || name === 'data' && dir.endsWith('docs')) {
          if (name === 'assets') continue;
        }
        if (name === 'assets') continue;
        walk(full);
      } else if (/\.(html|js|json|css)$/.test(name) && !name.endsWith('doc-tracks.json')) files.push(full);
    }
  }
  walk(path.join(root, 'docs'));
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const word of banned) if (text.includes(word)) hits.push(path.relative(root, file) + ' ' + word);
  }
  assert.deepEqual(hits, []);
});

test('every town Chinese overview avoids Latin region names', () => {
  const places = importPlaces(fs.readFileSync(path.join(__dirname, '../inputs/atlas/places-v2.csv'), 'utf8'));
  const towns = places.rows.filter(row => row.type === 'town');
  assert.equal(towns.length, 49);
  for (const town of towns) {
    const region = TNZ_REGIONS.find(item => item.id === town.region_id);
    assert.ok(region, town.place_id);
    const island = town.island === 'north' ? '北岛' : '南岛';
    const stay = town.suggested_stay ? `；建议停留约 ${town.suggested_stay} 天（编辑估算）` : '';
    const overview = `${island}${region.zh}一带的落脚城镇，本表收录周边 1 个地点${stay}。`;
    assert.equal(/[A-Za-z]/.test(overview), false, town.place_id + ' ' + overview);
    if (town.atlas_region === 'Waitaki') assert.equal(town.region_id, 'dunedin');
  }
});
