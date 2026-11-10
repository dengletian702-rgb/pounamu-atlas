'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { searchTracks } = require('../docs/v4-match.js');
const { importPlaces } = require('../scripts/lib/v4-import.cjs');

test('皇后镇 and Queenstown both match at least one DOC track', () => {
  const root = path.resolve(__dirname, '..');
  const places = importPlaces(fs.readFileSync(path.join(root, 'inputs/atlas/places-v2.csv'), 'utf8'));
  const towns = places.rows.filter(row => row.type === 'town');
  const tracks = JSON.parse(fs.readFileSync(path.join(root, 'docs/data/doc-tracks.json'), 'utf8')).tracks;
  assert.equal(searchTracks, require('../docs/v4-match.js').searchTracks);
  assert.ok(searchTracks(tracks, '皇后镇', towns).length > 0);
  assert.ok(searchTracks(tracks, 'Queenstown', towns).length > 0);
  const page = fs.readFileSync(path.join(root, 'docs/v4-guide.js'), 'utf8');
  assert.match(page, /v4Match/);
  assert.match(page, /searchTracks/);
});
