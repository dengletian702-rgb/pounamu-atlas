'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'docs/planner-adapter.js'), 'utf8');
assert.equal(source, fs.readFileSync(path.join(root, 'outputs/site/planner-adapter.js'), 'utf8'));
const placeholder = "const JEV_API_BASE = '';";
assert(source.includes(placeholder), 'the public Worker address must be empty until deployment');
function load(base, response) {
  const calls = [], window = {};
  const fetch = async (url, options) => { calls.push({url, options}); return response(url, options); };
  vm.runInNewContext(source.replace(placeholder, `const JEV_API_BASE = ${JSON.stringify(base)};`), {window, URL, fetch, Error, Boolean, JSON});
  return {planner:window.TripPlanner, calls};
}
(async()=>{
  const unused = () => { throw new Error('unexpected network call'); };
  for (const base of ['', 'http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/?x=1', 'not-a-url']) {
    const {planner,calls} = load(base,unused);assert.equal(planner.jevEnabled,false);
    await assert.rejects(planner.chooseWithJev({days:7,preference:'walk'}),/not_enabled/);assert.equal(calls.length,0);
  }
  const {planner,calls} = load('https://demo.example.invalid/', async url => ({ok:true,json:async()=>url.endsWith('/capabilities')?{version:2}:{routeId:'hooker'}}));
  assert.equal(planner.jevEnabled,true);
  assert.equal(await planner.chooseWithJev({days:7,preference:'walk',island:'south'}),'hooker');
  assert.equal(calls[0].url,'https://demo.example.invalid/api/capabilities');
  assert.equal(calls[1].url,'https://demo.example.invalid/api/jev/choice');
  assert.deepEqual(JSON.parse(calls[1].options.body),{days:7,preference:'walk',island:'south'});
  const bad = load('https://demo.example.invalid',async()=>({ok:false,json:async()=>({})}));
  await assert.rejects(bad.planner.chooseWithJev({days:7,preference:'walk'}),/service_update_required/);
  console.log('Planner adapter: empty/invalid URLs, opt-in endpoint and payload checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
