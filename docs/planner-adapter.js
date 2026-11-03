/* Jev runs only after the visitor opts in. The API key is held by the
 * local server, never by this browser code. */
const JEV_CONNECTION_ENABLED = false;
window.TripPlanner = {
  createPlan({days, preference, island='south'}) { return {days, preference, island}; },
  async chooseWithJev({days, preference, island='south'}) {
    if (!JEV_CONNECTION_ENABLED) throw new Error('not_enabled');
    let response;
    try {
      const capabilities = await fetch('/api/capabilities', {cache:'no-store'});
      if (!capabilities.ok || (await capabilities.json()).version < 2) throw new Error('service_update_required');
    } catch (error) {
      if (error.message === 'service_update_required') throw error;
      throw new Error('local_service_unavailable');
    }
    try {
      response = await fetch('/api/jev/choice', {
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
