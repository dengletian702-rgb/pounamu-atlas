'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, importPlaces, importRoutes } = require('../scripts/lib/v4-import.cjs');

test('imported v2 rows match the delivered CSV data rows', () => {
  const root = path.resolve(__dirname, '..');
  const placesText = fs.readFileSync(path.join(root, 'inputs/atlas/places-v2.csv'), 'utf8');
  const routesText = fs.readFileSync(path.join(root, 'inputs/meridian/routes-v2.csv'), 'utf8');
  assert.equal(placesText.charCodeAt(0), 0xfeff);
  assert.equal(routesText.charCodeAt(0), 0xfeff);
  const placeRows = parseCsv(placesText);
  const routeRows = parseCsv(routesText);
  assert.equal(placeRows.length, 471);
  assert.equal(routeRows.length, 78);
  assert.equal(placeRows[0].place_id.startsWith('\ufeff'), false);
  assert.equal(routeRows[0].route_id.startsWith('\ufeff'), false);
  const places = importPlaces(placesText);
  const byId = new Map(places.rows.map(row => [row.place_id, row]));
  const routes = importRoutes(routesText, byId);
  assert.equal(places.count, placeRows.length);
  assert.equal(routes.count, routeRows.length);
  assert.equal(routes.missing.length, 0);
  const byRegion = {};
  for (const region of require('../scripts/lib/v4-import.cjs').TNZ_REGIONS) byRegion[region.id] = 0;
  for (const row of places.rows) if (row.type === 'town' && row.region_id) byRegion[row.region_id] += 1;
  for (const [id, count] of Object.entries(byRegion)) assert.ok(count > 0, id);
  for (const id of ['bay-of-plenty', 'tairawhiti-gisborne', 'whanganui', 'manawatu', 'wairarapa', 'central-otago']) {
    assert.ok(byRegion[id] >= 2, id + ' ' + byRegion[id]);
  }
  const catalogPath = path.join(root, 'docs/data/v4-catalog.json');
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.equal(catalog.placeCount, placeRows.length);
    assert.equal(catalog.routeRowCount, routeRows.length);
  }
});
