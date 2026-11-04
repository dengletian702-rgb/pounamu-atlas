/* Configure the deployed Worker URL here; leave empty until it is deployed.
 * This is a public endpoint, never an API key. Only HTTPS endpoints are accepted. */
const JEV_API_BASE = 'https://pounamu-atlas-jev.dengletian702.workers.dev';
const jevEndpoint = (() => {
  if (!JEV_API_BASE.trim()) return '';
  try {
    const url = new URL(JEV_API_BASE.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return '';
    return url.href.replace(/\/+$/, '');
  } catch { return ''; }
})();
window.TripPlanner = {
  jevEnabled: Boolean(jevEndpoint),
  createPlan({days, preference, island='south'}) { return {days, preference, island}; },
  async chooseWithJev({days, preference, island='south'}) {
    if (!jevEndpoint) throw new Error('not_enabled');
    let response;
    try {
      const capabilities = await fetch(`${jevEndpoint}/api/capabilities`, {cache:'no-store'});
      if (!capabilities.ok || (await capabilities.json()).version < 2) throw new Error('service_update_required');
    } catch (error) {
      if (error.message === 'service_update_required') throw error;
      throw new Error('local_service_unavailable');
    }
    try {
      response = await fetch(`${jevEndpoint}/api/jev/choice`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({days, preference, island})
      });
    } catch { throw new Error('local_service_unavailable'); }
    let result;
    try { result = await response.json(); } catch { throw new Error('invalid_response'); }
    if (!response.ok) {
      const known = ['key_unavailable', 'provider_unavailable', 'provider_error', 'invalid_response', 'origin_denied'];
      const code = known.includes(result.error) ? result.error : 'local_service_unavailable';
      const error = new Error(code);
      if (code === 'provider_error' && [401,403,429].includes(result.status)) error.providerStatus = result.status;
      throw error;
    }
    if (!result || typeof result.routeId !== 'string') throw new Error('invalid_response');
    return result.routeId;
  }
};
