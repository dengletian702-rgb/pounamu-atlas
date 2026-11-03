// Deterministic fallback with the same interface as the Jev provider. Used when Jev is not configured,
// rate-capped or unreachable, and as a baseline to compare against.

const FIT = { easy: 2, moderate: 3, fit: 5 };

export function createHeuristic() {
  return {
    name: 'heuristic',

    async score({ profile, candidates }) {
      const scores = {};
      for (const c of candidates) {
        const r = c.route;
        let s = 1;
        const overlap = r.tags.filter((t) => profile.interests.includes(t)).length;
        s += Math.min(overlap, 2);
        if (r.difficulty <= FIT[profile.fitness] - 1) s += 0.5;
        if (profile.pace === 'relaxed' && r.days > 4) s -= 0.5;
        if (profile.pace === 'packed' && r.days <= 1) s += 0.3;
        if (r.rank <= 3) s += 0.5;
        scores[c.id] = { score: Math.max(0, Math.min(4, s)), confidence: null };
      }
      return { scores, meta: { model: 'heuristic-v1', usage: null, costUsd: 0 } };
    },

    async select({ options }) {
      const vals = options.map((o) => o.avgScore * 0.7 + o.coverage * 1.5 + (o.fill ?? 0.5) * 2.5 - o.transferDays * 0.3);
      const max = Math.max(...vals);
      const exps = vals.map((v) => Math.exp(v - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      const probabilities = Object.fromEntries(options.map((o, i) => [o.key, exps[i] / sum]));
      const best = options[vals.indexOf(max)];
      return { choice: best.key, confidence: probabilities[best.key], probabilities, meta: { model: 'heuristic-v1', usage: null, costUsd: 0 } };
    },

    async validate({ ruleChecks }) {
      const p = (ok) => (ok ? 0.9 : 0.2);
      return {
        checks: { time_enough: p(ruleChecks.time_enough), season_ok: p(ruleChecks.season_ok), transport_connects: p(ruleChecks.transport_connects) },
        meta: { model: 'heuristic-v1', usage: null, costUsd: 0 },
      };
    },
  };
}
