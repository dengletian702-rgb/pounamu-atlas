// Offline self-test: runs the pipeline with the heuristic judge (no network) unless JEV_LIVE=1.
import { runPipeline } from './index.js';

if (process.env.JEV_LIVE !== '1') {
  for (const s of ['SCORE', 'SELECT', 'VALIDATE']) process.env[`PIPELINE_${s}_PROVIDER`] = 'heuristic';
}
const cases = [
  { days: 10, modes: ['hike', 'drive'], interests: ['alpine', 'lakes'], fitness: 'moderate', pace: 'balanced', month: 1, start: 'queenstown' },
  { days: 7, modes: ['transit', 'bike'], interests: ['food', 'history'], fitness: 'easy', pace: 'relaxed', month: 7, start: 'christchurch' },
];
for (const c of (process.env.JEV_LIVE === '1' ? cases.slice(0, 1) : cases)) {
  const r = await runPipeline(c);
  if (r.error) { console.log('ERROR', r.error); continue; }
  console.log('\n#', r.text.en.title, '| option', r.chosen.key, '| jev calls', r.cost.jevCalls, '| $', r.cost.usd.toFixed(6));
  for (const t of r.trace) console.log('  ', t.step.padEnd(10), t.provider.padEnd(10), t.model, `${t.ms}ms`, t.fallback ? `FALLBACK(${t.reason})` : '', t.note || '', t.usage ? `in=${t.usage.input_tokens}` : '');
  for (const d of r.text.en.days) console.log(`   D${d.day}: ${d.title}`);
  console.log('   checks', JSON.stringify(r.checks));
}
