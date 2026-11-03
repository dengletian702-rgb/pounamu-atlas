// Main "writer" models — they turn the chosen plan into readable day-by-day text.
// Contract for every writer: write({ plan, profile }) → { en: Doc, zh: Doc }
// where Doc = { title, summary, days: [{ day, title, body }] }.
// The plan (which routes, which day, what transfers) is fixed BEFORE writing; the writer only words it,
// so a weaker or cheaper model cannot change the logistics that Jev validated.

const GEAR = {
  en: { pack: '40–60 L pack', sleep: 'warm sleeping bag', booking: 'booking confirmation', food: 'all food plus spare', rain: 'rain jacket', layers: 'warm layers', sandfly: 'insect repellent', sun: 'sunscreen', water: 'water', spikes: 'microspikes in winter', boots: 'sturdy boots', map: 'map', plb: 'PLB', snacks: 'snacks', helmet: 'helmet', repair: 'puncture kit', padded: 'padded shorts', headlamp: 'head torch', fuel: 'a full tank', chains: 'snow chains in winter', offline: 'offline maps', camera: 'camera', ticket: 'pre-booked ticket', jacket: 'windproof layer', seasick: 'motion-sickness tablets', card: 'Bee Card / Metrocard' },
  zh: { pack: '40–60升背包', sleep: '保暖睡袋', booking: '预订确认', food: '全程食物及余量', rain: '冲锋衣', layers: '保暖衣物', sandfly: '驱虫剂', sun: '防晒霜', water: '饮用水', spikes: '冬季冰爪', boots: '登山鞋', map: '地图', plb: '个人定位信标', snacks: '零食', helmet: '头盔', repair: '补胎工具', padded: '骑行垫裤', headlamp: '头灯', fuel: '加满油', chains: '冬季防滑链', offline: '离线地图', camera: '相机', ticket: '提前订票', jacket: '防风外套', seasick: '晕船药', card: '交通卡' },
};

const MODE = { en: { hike: 'walk', bike: 'ride', drive: 'drive', transit: 'journey' }, zh: { hike: '徒步', bike: '骑行', drive: '自驾', transit: '乘车船' } };

function mockDoc(plan, profile, lang) {
  const zh = lang === 'zh';
  const g = GEAR[lang];
  const days = plan.days.map((d) => {
    const parts = [];
    const titles = [];
    for (const it of d.items) {
      if (it.type === 'transfer') {
        titles.push(zh ? `前往${it.toName.zh}` : `To ${it.toName.en}`);
        parts.push(zh
          ? `${it.byCar ? '自驾' : '乘长途巴士或火车'}从${it.fromName.zh}前往${it.toName.zh}，路上约${it.hours}小时（估算）${it.partOf > 1 ? `，这是第${it.part}/${it.partOf}个赶路日，途中过夜` : ''}${it.ferry ? '，含库克海峡渡轮' : ''}。`
          : `${it.byCar ? 'Drive' : 'Take a coach or train'} from ${it.fromName.en} to ${it.toName.en} — roughly ${it.hours} h on the road (estimate)${it.partOf > 1 ? `; travel day ${it.part} of ${it.partOf}, with a night on the way` : ''}${it.ferry ? ', including the Cook Strait ferry' : ''}.`);
      } else if (it.type === 'route') {
        const r = it.route;
        const part = it.partOf > 1 ? (zh ? `（第${it.part}/${it.partOf}天）` : ` (day ${it.part} of ${it.partOf})`) : '';
        titles.push(r.name[lang] + part);
        const hl = r.highlights[lang];
        const pick = hl[(it.part - 1) % hl.length];
        if (it.part === 1) {
          parts.push(zh
            ? `${MODE.zh[r.mode]}「${r.name.zh}」：从${r.start.zh}出发，${r.duration.zh}。今天的亮点：${pick}。`
            : `${MODE.en[r.mode][0].toUpperCase() + MODE.en[r.mode].slice(1)} the ${r.name.en}, starting at ${r.start.en} (${r.duration.en}). Today’s highlight: ${pick}.`);
          const gear = r.gear.slice(0, 3).map((k) => g[k]).filter(Boolean).join(zh ? '、' : ', ');
          if (gear) parts.push(zh ? `记得带：${gear}。` : `Pack: ${gear}.`);
        } else {
          parts.push(zh ? `继续${MODE.zh[r.mode]}「${r.name.zh}」。${pick}。` : `Continue on the ${r.name.en}. ${pick}.`);
        }
        if (it.part === it.partOf && it.partOf > 1) parts.push(zh ? `终点：${r.end.zh}。` : `Finish at ${r.end.en}.`);
      } else if (it.type === 'buffer') {
        titles.push(zh ? '机动日' : 'Spare day');
        parts.push(zh
          ? `在${it.regionName.zh}留一天机动：新西兰山区天气多变，可用来补走因天气取消的路线，或者就好好休息。`
          : `A spare day in ${it.regionName.en}. Mountain weather in New Zealand changes fast — use it to catch up on anything the weather cancelled, or simply rest.`);
      }
    }
    return { day: d.day, title: titles.join(zh ? ' · ' : ' · '), body: parts.join(' ') };
  });
  const regionList = [...new Set(plan.days.map((d) => d.regionName[lang]))].join(zh ? '、' : ', ');
  return {
    title: zh ? `新西兰${profile.days}日 · ${plan.optionLabel.zh}` : `${profile.days} days in New Zealand · ${plan.optionLabel.en}`,
    summary: zh
      ? `从${plan.startName.zh}出发，经过${regionList}。共${plan.routeCount}条线路，${plan.transferDays}天在路上。数据来自 DOC、NZTA、NZ Cycle Trail 等官方来源，出发前请再次核实。`
      : `Starting in ${plan.startName.en} and travelling through ${regionList}. ${plan.routeCount} routes, ${plan.transferDays} days of transfers. Facts come from DOC, NZTA, NZ Cycle Trail and other official sources — re-check before you go.`,
    days,
  };
}

const mock = {
  name: 'mock',
  async write({ plan, profile }) {
    return { en: mockDoc(plan, profile, 'en'), zh: mockDoc(plan, profile, 'zh'), meta: { model: 'mock-writer-v1', usage: null, costUsd: 0 } };
  },
};

const SYSTEM_PROMPT = `You write New Zealand itineraries. You are given a FIXED plan as JSON.
Do not add, remove or reorder routes, days or transfers, and do not invent facts (prices, times, openings).
Only use facts present in the plan. Return strict JSON:
{"en":{"title":"","summary":"","days":[{"day":1,"title":"","body":""}]},"zh":{...same in Simplified Chinese...}}`;

function planForPrompt(plan) {
  return plan.days.map((d) => ({
    day: d.day,
    region: d.regionName.en,
    items: d.items.map((it) => it.type === 'route'
      ? { type: 'route', name: it.route.name.en, mode: it.route.mode, part: it.part, of: it.partOf, start: it.route.start.en, end: it.route.end.en, duration: it.route.duration.en, highlights: it.route.highlights.en, seasonNote: it.route.seasonNote.en }
      : it.type === 'transfer' ? { type: 'transfer', from: it.fromName.en, to: it.toName.en, hours: it.hours, byCar: it.byCar } : { type: 'spare day' }),
  }));
}

function parseJsonLoose(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}

function openaiCompatible(cfg) {
  return {
    name: 'openai-compatible',
    async write({ plan, profile, model }) {
      const key = process.env[cfg.apiKeyEnv];
      if (!key) throw Object.assign(new Error('writer_no_key'), { code: 'no_key' });
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || cfg.model,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ days: profile.days, plan: planForPrompt(plan) }) }],
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs || 60000),
      });
      if (!res.ok) throw Object.assign(new Error(`writer_http_${res.status}`), { code: `http_${res.status}` });
      const json = await res.json();
      const doc = parseJsonLoose(json.choices[0].message.content);
      return { ...doc, meta: { model: json.model, usage: json.usage, costUsd: null } };
    },
  };
}

function ollama(cfg) {
  return {
    name: 'ollama',
    async write({ plan, profile, model }) {
      const res = await fetch(`${cfg.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || cfg.model, stream: false, format: 'json',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ days: profile.days, plan: planForPrompt(plan) }) }],
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs || 120000),
      });
      if (!res.ok) throw Object.assign(new Error(`writer_http_${res.status}`), { code: `http_${res.status}` });
      const json = await res.json();
      return { ...parseJsonLoose(json.message.content), meta: { model: json.model, usage: null, costUsd: 0 } };
    },
  };
}

export function createWriter(name, providersCfg) {
  if (name === 'openai-compatible') return openaiCompatible(providersCfg['openai-compatible']);
  if (name === 'ollama') return ollama(providersCfg.ollama);
  return mock;
}
