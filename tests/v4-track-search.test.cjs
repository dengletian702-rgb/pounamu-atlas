'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { importPlaces, searchTracks } = require('../scripts/lib/v4-import.cjs');

test('皇后镇 and Queenstown both match at least one DOC track', () => {
  const root = path.resolve(__dirname, '..');
  const places = importPlaces(fs.readFileSync(path.join(root, 'inputs/atlas/places-v2.csv'), 'utf8'));
  const towns = places.rows.filter(row => row.type === 'town');
  const tracks = JSON.parse(fs.readFileSync(path.join(root, 'docs/data/doc-tracks.json'), 'utf8')).tracks;
  const zh = searchTracks(tracks, '皇后镇', towns);
  const en = searchTracks(tracks, 'Queenstown', towns);
  assert.ok(zh.length > 0, '皇后镇');
  assert.ok(en.length > 0, 'Queenstown');
});
