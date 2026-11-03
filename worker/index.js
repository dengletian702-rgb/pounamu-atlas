// A small Cloudflare Worker bridge for the optional Jev recommendation.
// The catalogue is bundled from the same file used by the local bridge.
import catalog from '../outputs/route-catalogue.json' with { type: 'json' };

const ALLOWED_ORIGIN = 'https://dengletian702-rgb.github.io';
const MAX_BODY_BYTES = 1024;
const MAX_UPSTREAM_BYTES = 1024 * 1024;
const UPSTREAM_URL = 'https://api.typesafe.ai/v1/systemone';
const MODES = ['walk', 'cycle', 'drive', 'transit'];
const ISLANDS = ['north', 'south'];
const OPTIONS = { south: {}, north: {} };
for (const island of ISLANDS) {
  for (const mode of MODES) {
    OPTIONS[island][mode] = Object.fromEntries(catalog.filter(r => (r.island || 'south') === island && r.mode === mode).map(r => [r.id,
      `${r.name}: ${r.summary[0]} Start/finish: ${r.ends[0]}. Time: ${r.time[0]}. Distance: ${r.distance[0]}. Difficulty: ${r.level[0]}.`]));
  }
}
const duration = Object.fromEntries(catalog.map(r => [r.id, r.planDays || 1]));
function optionsFor(data) {
  return Object.fromEntries(Object.entries(OPTIONS[data.island || 'south'][data.preference]).filter(([id]) => duration[id] <= data.days).slice(0, 6));
}
function validInput(data) {
  return Boolean(data && typeof data === 'object' && !Array.isArray(data) &&
    [2, 3].includes(Object.keys(data).length) && Object.keys(data).every(k => ['days', 'preference', 'island'].includes(k)) &&
    Number.isInteger(data.days) && data.days >= 3 && data.days <= 21 &&
    (data.island === undefined || ISLANDS.includes(data.island)) && MODES.includes(data.preference));
}
function makeRequest(data) {
  if (!validInput(data)) throw new Error('invalid_input');
  const criteria = optionsFor(data);
  if (!Object.keys(criteria).length) throw new Error('catalog_unavailable');
  return { model: 'jev-latest', state: { days: data.days, travel_mode: data.preference, island: data.island || 'south' },
    questions: { starting_route: { type: 'choice', instructions: 'Choose one starting route on the selected New Zealand island that fits the travel mode and available days. Consider the supplied duration, location and difficulty. Select only from the listed routes.', criteria } } };
}
function validateAnswer(data, response) {
  const answer = response?.answers?.starting_route;
  const choice = answer?.choice;
  if (!answer || answer.type !== 'choice' || typeof choice !== 'string' || !Object.hasOwn(optionsFor(data), choice)) throw new Error('invalid_upstream_response');
  return { routeId: choice };
}
function responseHeaders(origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (origin === ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  return headers;
}
function json(status, body, origin) { return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) }); }
async function readBounded(stream, limit) {
  if (!stream) return '';
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let length = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('body_too_large'); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

// One Durable Object per IP makes this rolling-window limit global across edges.
// Storage transactions serialize concurrent requests and preserve the window across restarts.
export class PerIpRateLimiter {
  constructor(state) { this.state = state; }
  async fetch() {
    const now = Date.now();
    const allowed = await this.state.storage.transaction(async txn => {
      const saved = await txn.get('requests');
      const recent = (Array.isArray(saved) ? saved : []).filter(t => Number.isFinite(t) && t > now - 60_000);
      if (recent.length >= 10) return false;
      recent.push(now);
      await txn.put('requests', recent);
      return true;
    });
    return new Response(null, { status: allowed ? 204 : 429 });
  }
}
async function underLimit(request, env) {
  // Cloudflare populates this header from the connecting client. Fail closed when missing.
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !/^[0-9a-f:.]{3,45}$/i.test(ip) || !env.RATE_LIMITER) return false;
  const id = env.RATE_LIMITER.idFromName(ip);
  const limiter = env.RATE_LIMITER.get(id);
  const result = await limiter.fetch('https://rate-limiter.invalid/');
  return result.status === 204;
}
async function handle(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== ALLOWED_ORIGIN) return json(403, { error: 'origin_denied' }, null);
  let allowed = false;
  try { allowed = await underLimit(request, env); } catch { return json(503, { error: 'limiter_unavailable' }, origin); }
  if (!allowed) return json(429, { error: 'rate_limited' }, origin);
  const path = new URL(request.url).pathname;
  if (!['/api/capabilities', '/api/jev/choice'].includes(path)) return json(404, { error: 'not_found' }, origin);
  if (request.method === 'OPTIONS') {
    const expected = path === '/api/capabilities' ? 'GET' : 'POST';
    if (request.headers.get('Access-Control-Request-Method') !== expected) return json(403, { error: 'origin_denied' }, origin);
    const requested = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    if (requested.some(x => x !== 'content-type')) return json(403, { error: 'origin_denied' }, origin);
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': expected, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers' } });
  }
  if (request.method === 'GET' && path === '/api/capabilities') return json(200, { version: 2, islands: ISLANDS, routeCount: catalog.length }, origin);
  if (request.method !== 'POST' || path !== '/api/jev/choice') return json(405, { error: 'method_not_allowed' }, origin);
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') return json(403, { error: 'origin_denied' }, origin);
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) return json(413, { error: 'body_too_large' }, origin);
  let data;
  try { data = JSON.parse(await readBounded(request.body, MAX_BODY_BYTES)); }
  catch (error) { return json(error.message === 'body_too_large' ? 413 : 400, { error: error.message === 'body_too_large' ? 'body_too_large' : 'invalid_input' }, origin); }
  if (!validInput(data)) return json(400, { error: 'invalid_input' }, origin);
  const key = env.TYPESAFE_API_KEY;
  if (typeof key !== 'string' || !key || /[\r\n]/.test(key)) return json(503, { error: 'key_unavailable' }, origin);
  try {
    const payload = makeRequest(data);
    const upstream = await fetch(UPSTREAM_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    if (upstream.status !== 200) return json(502, { error: 'provider_error', status: upstream.status }, origin);
    let answer;
    try { answer = JSON.parse(await readBounded(upstream.body, MAX_UPSTREAM_BYTES)); }
    catch { return json(502, { error: 'invalid_response' }, origin); }
    return json(200, validateAnswer(data, answer), origin);
  } catch (error) {
    return json(502, { error: error.message === 'invalid_upstream_response' ? 'invalid_response' : 'provider_unavailable' }, origin);
  }
}
export { validInput, optionsFor, makeRequest, validateAnswer, readBounded, handle };
export default { fetch: handle };
