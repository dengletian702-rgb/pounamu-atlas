// TypeSafe Jev (System One) client. Jev only answers choice / score / noul questions — it never writes text.
// Docs: https://docs.typesafe.ai/api/system-one.md . The API key is read from the env var named in config
// and is never logged or returned.

const callLog = [];

export function createJev(cfg) {
  const endpoint = cfg.endpoint;
  const keyName = cfg.apiKeyEnv || 'TYPESAFE_API_KEY';

  function rateCheck() {
    const now = Date.now();
    while (callLog.length && now - callLog[0] > 60_000) callLog.shift();
    if (callLog.length >= (cfg.maxCallsPerMinute || 12)) {
      const err = new Error('jev_rate_capped');
      err.code = 'rate_capped';
      throw err;
    }
    callLog.push(now);
  }

  async function ask({ model, state, questions }) {
    const key = process.env[keyName];
    if (!key) {
      const err = new Error('jev_no_key');
      err.code = 'no_key';
      throw err;
    }
    rateCheck();
    const body = JSON.stringify({ model, state, questions });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(cfg.timeoutMs || 20000),
      });
      if (res.ok) {
        const json = await res.json();
        const inputTokens = json.usage?.input_tokens ?? 0;
        return {
          model: json.model,
          answers: json.answers,
          usage: json.usage,
          costUsd: (inputTokens * (cfg.usdPerMillionInputTokens ?? 0.042)) / 1e6,
        };
      }
      if ((res.status === 429 || res.status === 529) && attempt === 0) {
        const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 1500, 5000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      let detail = '';
      try { detail = JSON.stringify((await res.json()).detail).slice(0, 300); } catch { /* ignore */ }
      const err = new Error(`jev_http_${res.status}`);
      err.code = `http_${res.status}`;
      err.detail = detail;
      throw err;
    }
    throw new Error('jev_unreachable');
  }

  const FIT_LEVELS = [
    'Poor fit: conflicts with the traveller’s interests, fitness or travel style',
    'Weak fit: little overlap with what the traveller wants',
    'Decent fit: matches some interests and is doable',
    'Strong fit: matches several interests and suits their fitness and pace',
    'Perfect fit: a highlight this traveller should not miss',
  ];

  return {
    name: 'jev',

    // Step 2 — one request, one score question per candidate route.
    async score({ model, profileText, candidates }) {
      const routes = Object.fromEntries(candidates.map((c) => [c.id, c.card]));
      const questions = {};
      for (const c of candidates) {
        questions[`fit__${c.id}`] = {
          type: 'score',
          instructions: `How well does the route "${c.nameEn}" (id: ${c.id}) suit this traveller?`,
          criteria: FIT_LEVELS,
        };
      }
      const r = await ask({ model, state: { traveller: profileText, routes }, questions });
      const scores = {};
      for (const c of candidates) {
        const a = r.answers[`fit__${c.id}`];
        scores[c.id] = { score: a?.score ?? 0, confidence: a?.confidence ?? null };
      }
      return { scores, meta: r };
    },

    // Step 3 — pick the best option among pre-built feasible combinations.
    async select({ model, profileText, options }) {
      const criteria = Object.fromEntries(options.map((o) => [o.key, o.summary]));
      const r = await ask({
        model,
        state: { traveller: profileText },
        questions: {
          best_option: {
            type: 'choice',
            instructions: 'Which itinerary option is best overall for this traveller? Weigh how well the routes fit their interests, variety, a realistic pace, and how much time is lost to transfers.',
            criteria,
          },
        },
      });
      const a = r.answers.best_option;
      return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities, meta: r };
    },

    // Step 5 — true/false sanity checks on the finished itinerary.
    async validate({ model, itineraryText }) {
      const r = await ask({
        model,
        state: itineraryText,
        questions: {
          time_enough: {
            type: 'noul',
            instructions: 'Is there enough time for every activity and transfer on each day, with no day needing much more than about 8 hours of combined travel and activity?',
            criteria: { true: 'The time budget is realistic', false: 'At least one day is overloaded or the trip is too short' },
          },
          season_ok: {
            type: 'noul',
            instructions: 'Given the travel month and each route’s season notes, is every route open and sensible to do in that month?',
            criteria: { true: 'All routes suit the travel month', false: 'Some route is closed, out of season or unsafe in that month' },
          },
          transport_connects: {
            type: 'noul',
            instructions: 'Can the traveller realistically get to the start of each route and between stops with the transport stated (own car only if they drive; otherwise coaches, trains, ferries and shuttles)?',
            criteria: { true: 'All legs connect with the stated transport', false: 'At least one leg cannot be made with the stated transport' },
          },
        },
      });
      const p = (k) => r.answers[k]?.noul ?? null;
      return { checks: { time_enough: p('time_enough'), season_ok: p('season_ok'), transport_connects: p('transport_connects') }, meta: r };
    },
  };
}
