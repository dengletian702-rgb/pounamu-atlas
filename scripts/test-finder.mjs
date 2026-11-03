// Trip-finder checks: the plan always starts where the traveller starts, reaches every place it can, never drives
// more than the pace allows on one leg-group, and says so when the days are not enough.
//   node scripts/test-finder.mjs
import { planTrip, NODES } from '../public/js/finder-engine.js';
let fail = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${info ? ` — ${info}` : ''}`); if (!cond) fail++; };
const show = (p) => p.days.map((d) => `${d.n}:${d.kind}@${d.at}${d.legs.length ? `[${d.legs.map((l) => `${l.a}>${l.b}`).join(',')}]` : ''}${d.acts.length ? `{${d.acts.map((a) => a.w.id).join(',')}}` : ''}`).join(' ');
const base = { car: true, fly: true, pace: 'balanced', month: 2 };

// The owner's example: start in Christchurch, wants the glaciers.
let p = planTrip({ ...base, start: 'christchurch', end: 'queenstown', days: 7, wishes: ['glaciers', 'queenstown'] });
console.log(show(p));
ok('starts in Christchurch', p.days[0].kind === 'arrive' && p.days[0].at === 'christchurch');
const path = p.days.flatMap((d) => d.legs.map((l) => l.b));
ok('drives Christchurch → glaciers → Haast → Queenstown', path.indexOf('franz-josef') > -1 && path.indexOf('haast') > path.indexOf('franz-josef') && path[path.length - 1] === 'queenstown', path.join('→'));
ok('ends in Queenstown', p.days[p.days.length - 1].kind === 'depart' && p.days[p.days.length - 1].at === 'queenstown');
ok('fills exactly 7 days', p.days.length === 7, `${p.days.length}`);

p = planTrip({ ...base, start: 'christchurch', end: 'christchurch', days: 10, wishes: ['milford', 'aoraki', 'tekapo', 'queenstown', 'glaciers', 'wanaka'] });
console.log(show(p));
ok('loop returns to Christchurch', p.days[p.days.length - 1].at === 'christchurch');
ok('every wish appears', ['milford', 'aoraki', 'tekapo', 'queenstown', 'glaciers', 'wanaka'].every((id) => p.days.some((d) => d.acts.some((a) => a.w.id === id))));
ok('no day over pace (balanced 5 h + stops)', p.days.every((d) => d.long || d.legs.reduce((s, l) => s + l.h, 0) <= 6.5), p.days.map((d) => d.legs.reduce((s, l) => s + l.h, 0)).join(','));

p = planTrip({ ...base, start: 'auckland', end: 'auckland', days: 4, wishes: ['milford', 'rotorua', 'tongariro', 'stewart'] });
ok('too few days is flagged with a suggestion', p.warnings.some((w) => w.type === 'short' && w.need > 4), JSON.stringify(p.warnings.find((w) => w.type === 'short')?.need));

p = planTrip({ ...base, car: false, start: 'christchurch', end: 'queenstown', days: 8, wishes: ['catlins', 'milford', 'arthurs-pass'] });
ok('no car: the Catlins flagged unreachable', p.warnings.some((w) => w.type === 'unreachable' && w.list.some((x) => x.id === 'catlins')));
ok('no car: Arthur’s Pass by train', p.days.flatMap((d) => d.legs).some((l) => l.pt === 'train'));

p = planTrip({ ...base, start: 'auckland', end: 'queenstown', days: 12, wishes: ['rotorua', 'tongariro', 'queenstown', 'milford'] });
console.log(show(p));
ok('Auckland start crosses to the South Island', p.days.flatMap((d) => d.legs).some((l) => l.pt === 'flight' || l.pt === 'ferry'));

p = planTrip({ ...base, month: 7, start: 'queenstown', end: 'queenstown', days: 6, wishes: ['milford'] });
ok('winter passes warned', p.warnings.some((w) => w.type === 'winter'));
for (const k of Object.keys(NODES)) if (!NODES[k].at) ok(`node ${k} has coordinates`, false);
console.log(fail ? `${fail} FAILED` : 'ALL PASSED');
process.exit(fail ? 1 : 0);
