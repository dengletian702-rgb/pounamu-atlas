import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import worker, { PerIpRateLimiter, validInput, makeRequest, validateAnswer } from './index.js';
const require = createRequire(import.meta.url);
const local = require('../outputs/jev-server.js');
const origin = 'https://dengletian702-rgb.github.io';
const endpoint = 'https://worker.example/api/jev/choice';
const networkFetch = globalThis.fetch;

class MemoryStorage {
  constructor() { this.values = new Map(); this.serial = Promise.resolve(); }
  transaction(fn) {
    const job = this.serial.then(() => fn({get: async k => this.values.get(k), put: async (k, v) => this.values.set(k, v)}));
    this.serial = job.catch(() => {});
    return job;
  }
}
function namespace() {
  const instances = new Map();
  return {
    instances,
    idFromName: ip => ip,
    get: id => {
      if (!instances.has(id)) instances.set(id, new PerIpRateLimiter({storage: new MemoryStorage()}));
      return instances.get(id);
    }
  };
}
const env = () => ({ RATE_LIMITER: namespace(), TYPESAFE_API_KEY: 'dummy-for-local-test' });
function req(path, method = 'GET', options = {}) {
  return new Request('https://worker.example' + path, {method, headers: { Origin: options.origin === undefined ? origin : options.origin, 'CF-Connecting-IP': options.ip || '198.51.100.1', ...(options.headers || {}) }, ...(options.body === undefined ? {} : { body: options.body }) });
}
const post = data => req('/api/jev/choice','POST',{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const input = {days:7, preference:'walk', island:'south'};

test('input and allowed routes match the local bridge for every supported mode and island', () => {
  for (const island of ['north','south']) for (const preference of ['walk','cycle','drive','transit']) for (const days of [3,7,21]) {
    const value = {days, preference, island};
    assert.equal(validInput(value), local.validInput(value));
    assert.deepEqual(makeRequest(value), local.makeRequest(value));
  }
  for (const value of [{...input,extra:1}, {...input,days:2}, {...input,island:'west'}, {...input,preference:'fly'}, [], null]) assert.equal(validInput(value),false);
});

test('CORS permits the exact origin and rejects missing or different origins', async () => {
  const good = await worker.fetch(req('/api/capabilities'),env());
  assert.equal(good.status,200);assert.equal(good.headers.get('Access-Control-Allow-Origin'),origin);assert.equal((await good.json()).version,2);
  for (const other of ['https://evil.example','null','https://dengletian702-rgb.github.io.evil.example']) {
    const result = await worker.fetch(req('/api/capabilities','GET',{origin:other}),env());assert.equal(result.status,403);assert.equal(result.headers.get('Access-Control-Allow-Origin'),null);
  }
  const noOrigin = new Request('https://worker.example/api/capabilities',{headers:{'CF-Connecting-IP':'198.51.100.9'}});
  assert.equal((await worker.fetch(noOrigin,env())).status,403);
  const cors = await worker.fetch(req('/api/jev/choice','OPTIONS',{headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}),env());
  assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(cors.headers.get('Access-Control-Allow-Credentials'),null);
  const badPreflight = await worker.fetch(req('/api/jev/choice','OPTIONS',{headers:{'Access-Control-Request-Method':'DELETE'}}),env());assert.equal(badPreflight.status,403);
});

test('preflights and capabilities do not consume the ten POST allowance', async () => {
  const configuration = env();
  const options = () => req('/api/jev/choice', 'OPTIONS', {headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  globalThis.fetch = async (url, init) => {
    const choice = Object.keys(JSON.parse(init.body).questions.starting_route.criteria)[0];
    return new Response(JSON.stringify({answers:{starting_route:{type:'choice',choice}}}), {status:200});
  };
  try {
    for (let i = 0; i < 15; i++) {
      assert.equal((await worker.fetch(options(), configuration)).status, 204);
      assert.equal((await worker.fetch(req('/api/capabilities'), configuration)).status, 200);
    }
    assert.equal(configuration.RATE_LIMITER.instances.size, 0);
    for (let i = 0; i < 10; i++) assert.equal((await worker.fetch(post(input), configuration)).status, 200);
    assert.equal((await worker.fetch(post(input), configuration)).status, 429);
    assert.equal((await worker.fetch(options(), configuration)).status, 204);
    assert.equal((await worker.fetch(req('/api/capabilities'), configuration)).status, 200);
    assert.equal((await worker.fetch(req('/api/capabilities', 'GET', {origin:'https://evil.example'}), configuration)).status, 403);
    assert.equal((await worker.fetch(req('/api/jev/choice', 'OPTIONS', {origin:'https://evil.example', headers:{'Access-Control-Request-Method':'POST'}}), configuration)).status, 403);
    const otherIp = req('/api/jev/choice', 'POST', {ip:'198.51.100.2', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input)});
    assert.equal((await worker.fetch(otherIp, configuration)).status, 200);
    const limiter = configuration.RATE_LIMITER.instances.get('198.51.100.1');
    limiter.state.storage.values.set('requests', Array(10).fill(Date.now() - 60_001));
    assert.equal((await worker.fetch(post(input), configuration)).status, 200);
  } finally { globalThis.fetch = networkFetch; }
});

test('concurrent POST requests cannot exceed the ten-request limit', async () => {
  const configuration = env();
  globalThis.fetch = async (url, init) => {
    const choice = Object.keys(JSON.parse(init.body).questions.starting_route.criteria)[0];
    return new Response(JSON.stringify({answers:{starting_route:{type:'choice',choice}}}));
  };
  try {
    const results = await Promise.all(Array.from({length:20}, () => worker.fetch(post(input), configuration)));
    assert.equal(results.filter(r => r.status === 200).length, 10);
    assert.equal(results.filter(r => r.status === 429).length, 10);
  } finally { globalThis.fetch = networkFetch; }
});

test('unavailable or missing rate limiting fails closed for POST only', async () => {
  const missingIp = new Request(endpoint, {method:'POST', headers:{Origin:origin,'Content-Type':'application/json'}, body:JSON.stringify(input)});
  assert.equal((await worker.fetch(missingIp, env())).status, 429);
  const broken = {RATE_LIMITER:{idFromName(){throw Error('unavailable')}}};
  assert.equal((await worker.fetch(post(input), broken)).status, 503);
  assert.equal((await worker.fetch(req('/api/capabilities'), broken)).status, 200);
});

test('body schema, content type and length are enforced', async () => {
  const configuration=env();
  assert.equal((await worker.fetch(req('/api/jev/choice','POST',{body:'{}'}),configuration)).status,403);
  assert.equal((await worker.fetch(post({...input,extra:'no'}),configuration)).status,400);
  assert.equal((await worker.fetch(req('/api/jev/choice','POST',{headers:{'Content-Type':'application/json'},body:'x'.repeat(1025)}),configuration)).status,413);
  assert.equal((await worker.fetch(req('/api/jev/choice','POST',{headers:{'Content-Type':'application/json'},body:'{'}),configuration)).status,400);
  assert.equal((await worker.fetch(post(input),{RATE_LIMITER:namespace()})).status,503);
});

test('Jev uses the same choice request and returns only a listed route', async () => {
  const configuration=env();
  globalThis.fetch=async (url, init) => {
    assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(init.redirect,'manual');assert.deepEqual(JSON.parse(init.body),local.makeRequest(input));
    const choice=Object.keys(JSON.parse(init.body).questions.starting_route.criteria)[0];
    return new Response(JSON.stringify({answers:{starting_route:{type:'choice',choice}},private:'discard'}),{status:200});
  };
  try {
    const response=await worker.fetch(post(input),configuration);assert.equal(response.status,200);const result=await response.json();assert.deepEqual(Object.keys(result),['routeId']);assert.doesNotThrow(()=>validateAnswer(input,{answers:{starting_route:{type:'choice',choice:result.routeId}}}));
  } finally {globalThis.fetch=networkFetch;}
});

test('invalid and failed upstream results never disclose the secret or upstream body', async () => {
  const key='dummy-for-local-test';
  const configuration=env();
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({answers:{starting_route:{type:'choice',choice:'not-in-catalog'}},secret:key}));
    let response=await worker.fetch(post(input),configuration);assert.equal(response.status,502);let body=await response.text();assert(!body.includes(key));assert.equal(JSON.parse(body).error,'invalid_response');
    globalThis.fetch=async()=>new Response('sensitive upstream detail '+key,{status:401});
    response=await worker.fetch(post(input),configuration);body=await response.text();assert.equal(response.status,502);assert(!body.includes(key));assert.deepEqual(JSON.parse(body),{error:'provider_error',status:401});
    globalThis.fetch=async()=>{throw Error(key)};response=await worker.fetch(post(input),configuration);body=await response.text();assert.equal(response.status,502);assert(!body.includes(key));
  } finally {globalThis.fetch=networkFetch;}
});
