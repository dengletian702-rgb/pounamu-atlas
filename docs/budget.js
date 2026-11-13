/* Estimate-only trip budget. Every figure is either a sourced range or marked to verify.
   The maths never invents a precise price: a missing assumption stays null and the line says 待核. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.pounamuBudget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SOURCES = {
    docCamp: {
      url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-stay/stay-at-a-campsite/facilities-and-fees/',
      checkedAt: '2026-11-12',
      en: 'DOC campsite fees: Standard adults $10–20 a night; Serviced unpowered sites $25. Some campsites differ.',
      zh: 'DOC 营地：标准营地成人每晚 $10–20，服务型不通电营位每晚 $25。个别营地不同。'
    },
    statsNz: {
      url: 'https://datainfoplus.stats.govt.nz/Item/nz.govt.stats/38574cd6-b696-41a5-b311-41bfa5611a99/121',
      checkedAt: '2026-11-12',
      en: 'Stats NZ Accommodation Survey does not collect nightly rates, so mid-range and high-end prices are to verify.',
      zh: '统计局住宿调查不采集每晚房价，中档和高端价格待核。'
    },
    nzta: {
      url: 'https://www.journeys.nzta.govt.nz/',
      checkedAt: '2026-11-12',
      en: 'Driving kilometres are planning estimates. NZTA Journey Planner does not publish a fuel price.',
      zh: '里程是规划估算。NZTA Journey Planner 不公布油价。'
    },
    ferry: {
      url: 'https://www.interislander.co.nz/',
      checkedAt: '2026-11-12',
      en: 'Interislander publishes the Cook Strait sailing as 3.5 hours. A vehicle fare was not copied here, so the fare is to verify.',
      zh: 'Interislander 写明库克海峡航行 3.5 小时。这里没有抄车辆票价，票价待核。'
    },
    bluebridge: {
      url: 'https://www.bluebridge.co.nz/',
      checkedAt: '2026-11-12',
      en: 'Bluebridge also sails Cook Strait. No fare was read into this estimate.',
      zh: 'Bluebridge 也走库克海峡。本估算没有写入它的票价。'
    },
    fuel: {
      url: 'https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring/',
      checkedAt: '2026-11-13',
      en: 'MBIE weekly fuel-price monitoring is the place to read a pump price. This page did not copy a litre price, so the default is to verify until you type one.',
      zh: '油价请看 MBIE 每周油价监测。本页没有抄入每升价格，所以默认待核，你可以自己填。'
    },
    docHut: {
      url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-stay/stay-in-a-hut/hut-categories/',
      checkedAt: '2026-11-13',
      en: 'DOC hut categories, read 2026-11-13: Standard hut adult $15 a night; Serviced hut adult $25. Great Walk huts are priced separately, with a different rate for international visitors. This page did not copy a Great Walk dollar figure.',
      zh: 'DOC 小屋分类页，2026-11-13 读到：标准小屋成人每晚 $15，服务型小屋成人每晚 $25。Great Walk 小屋另有价格，国际访客与本地不同。这一页没有抄入 Great Walk 的具体金额。'
    },
    cityStay: {
      url: 'https://datainfoplus.stats.govt.nz/Item/nz.govt.stats/38574cd6-b696-41a5-b311-41bfa5611a99/121',
      checkedAt: '2026-11-12',
      en: 'A night in town (hostel or holiday park) has no official nightly rate in Stats NZ’s Accommodation Survey. That line stays to verify.',
      zh: '城里住一晚（青旅或假日公园）没有统计局公布的每晚价格，这一项待核。'
    }
  };

  function num(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function blankAssumptions() {
    return {
      people: 2,
      tier: 'budget',
      showCny: false,
      nzdCny: null,
      nzdCnyDate: '',
      docLow: 10,
      docHigh: 20,
      midNightly: null,
      highNightly: null,
      fuelNzdPerL: null,
      litresPer100: null,
      mealNzd: null,
      mealsPerDay: 3,
      ferryVehicleNzd: null,
      parkingNzd: null,
      activityNzd: null,
      startDate: ''
    };
  }

  function normalise(raw) {
    const base = blankAssumptions();
    const src = raw || {};
    base.people = Math.max(1, Math.min(12, Math.round(num(src.people) || 2)));
    base.tier = src.tier === 'mid' || src.tier === 'high' ? src.tier : 'budget';
    base.showCny = Boolean(src.showCny);
    base.nzdCny = num(src.nzdCny);
    base.nzdCnyDate = String(src.nzdCnyDate || '').slice(0, 10);
    base.docLow = num(src.docLow) == null ? 10 : num(src.docLow);
    base.docHigh = num(src.docHigh) == null ? 20 : num(src.docHigh);
    if (base.docHigh < base.docLow) { const t = base.docLow; base.docLow = base.docHigh; base.docHigh = t; }
    for (const key of ['midNightly', 'highNightly', 'fuelNzdPerL', 'litresPer100', 'mealNzd', 'ferryVehicleNzd', 'parkingNzd', 'activityNzd']) base[key] = num(src[key]);
    base.mealsPerDay = Math.max(1, Math.min(5, Math.round(num(src.mealsPerDay) || 3)));
    base.startDate = /^\d{4}-\d{2}-\d{2}$/.test(src.startDate || '') ? src.startDate : '';
    return base;
  }

  function encodeState(raw) {
    return JSON.stringify(normalise(raw));
  }

  function decodeState(text) {
    if (!text) return blankAssumptions();
    let raw = String(text);
    for (let i = 0; i < 2; i++) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return normalise(parsed);
      } catch { /* try one more decode */ }
      try { raw = decodeURIComponent(raw); } catch { break; }
    }
    return blankAssumptions();
  }

  function addRange(total, part) {
    if (!part || part.empty) return total;
    const has = Number(part.min) > 0 || Number(part.max) > 0;
    if (has) { total.min += part.min || 0; total.max += part.max || 0; }
    if (part.verify) total.verify = true;
    return total;
  }

  function stayLine(night, tier, people, a, stayKind) {
    if (!night) return { min: 0, max: 0, verify: false, kind: 'stay', empty: true };
    const kind = stayKind || 'city';
    if (kind === 'doc-camp' && tier === 'budget') return { min: round(a.docLow * people), max: round(a.docHigh * people), verify: false, kind: 'stay', range: a.docLow !== a.docHigh, source: 'docCamp' };
    if (kind === 'doc-hut' && tier === 'budget') return { min: round(15 * people), max: round(25 * people), verify: false, kind: 'stay', range: true, source: 'docHut' };
    if (kind === 'great-walk') return { min: 0, max: 0, verify: true, kind: 'stay', source: 'greatWalk' };
    if (tier !== 'budget') {
      const rate = tier === 'high' ? a.highNightly : a.midNightly;
      if (rate == null) return { min: 0, max: 0, verify: true, kind: 'stay', source: 'city' };
      return { min: round(rate), max: round(rate), verify: false, kind: 'stay', source: 'city' };
    }
    return { min: 0, max: 0, verify: true, kind: 'stay', source: 'city' };
  }

  function round(n) { return Math.round(n * 100) / 100; }

  function fuelLine(km, a) {
    if (!(km > 0)) return { min: 0, max: 0, verify: false, kind: 'fuel', empty: true };
    if (a.fuelNzdPerL == null || a.litresPer100 == null) return { min: 0, max: 0, verify: true, kind: 'fuel' };
    const amount = round(km * (a.litresPer100 / 100) * a.fuelNzdPerL);
    return { min: amount, max: amount, verify: false, kind: 'fuel' };
  }

  function flatLine(amount, kind) {
    if (amount == null) return { min: 0, max: 0, verify: true, kind };
    return { min: round(amount), max: round(amount), verify: false, kind };
  }

  function dayInput(day) {
    const legs = day.legs || [];
    const km = legs.reduce((sum, leg) => sum + (Number(leg.km) > 0 ? Number(leg.km) : 0), 0);
    const kmUnknown = legs.some(leg => !(Number(leg.km) > 0) && leg.mode === 'car');
    const ferry = legs.some(leg => leg.mode === 'ferry');
    const night = day.kind !== 'depart';
    const activities = (day.activities || []).length;
    return { km, kmUnknown, ferry, night, activities, kind: day.kind || 'travel' };
  }

  function priceDay(day, assumptions) {
    const a = normalise(assumptions);
    const info = dayInput(day);
    const stay = day.noStay ? { min: 0, max: 0, verify: false, kind: 'stay', empty: true } : stayLine(info.night, a.tier, a.people, a, day.stayKind);
    const fuel = fuelLine(info.km, a);
    if (info.kmUnknown && !fuel.verify) fuel.verify = true;
    const food = info.kind === 'depart' && !info.activities
      ? flatLine(a.mealNzd == null ? null : a.mealNzd * a.people, 'food')
      : flatLine(a.mealNzd == null ? null : a.mealNzd * a.mealsPerDay * a.people, 'food');
    const activities = info.activities
      ? flatLine(a.activityNzd == null ? null : a.activityNzd * info.activities, 'activities')
      : { min: 0, max: 0, verify: false, kind: 'activities', empty: true };
    const ferry = info.ferry ? flatLine(a.ferryVehicleNzd, 'ferry') : { min: 0, max: 0, verify: false, kind: 'ferry', empty: true };
    const parking = info.night && (info.km > 0 || a.tier !== 'budget')
      ? flatLine(a.parkingNzd, 'parking')
      : { min: 0, max: 0, verify: false, kind: 'parking', empty: true };
    const lines = { stay, fuel, food, activities, ferry, parking };
    const subtotal = { min: 0, max: 0, verify: false };
    for (const line of Object.values(lines)) addRange(subtotal, line);
    subtotal.min = round(subtotal.min);
    subtotal.max = round(subtotal.max);
    return { lines, subtotal, info };
  }

  function priceTrip(days, assumptions) {
    const a = normalise(assumptions);
    const priced = (days || []).map(day => priceDay(day, a));
    const categories = { stay: { min: 0, max: 0, verify: false }, fuel: { min: 0, max: 0, verify: false }, food: { min: 0, max: 0, verify: false }, activities: { min: 0, max: 0, verify: false }, ferry: { min: 0, max: 0, verify: false }, parking: { min: 0, max: 0, verify: false } };
    const total = { min: 0, max: 0, verify: false };
    let runningMin = 0, runningMax = 0;
    priced.forEach(day => {
      runningMin = round(runningMin + day.subtotal.min);
      runningMax = round(runningMax + day.subtotal.max);
      day.running = { min: runningMin, max: runningMax, verify: day.subtotal.verify };
      addRange(total, day.subtotal);
      for (const key of Object.keys(categories)) addRange(categories[key], day.lines[key]);
    });
    total.min = round(total.min);
    total.max = round(total.max);
    const per = people => ({
      min: round(total.min / people),
      max: round(total.max / people),
      verify: total.verify
    });
    const cny = a.nzdCny == null ? { verify: true, min: 0, max: 0 } : {
      verify: total.verify,
      min: round(total.min * a.nzdCny),
      max: round(total.max * a.nzdCny)
    };
    return { days: priced, categories, total, perPerson: per(a.people), cny, assumptions: a };
  }

  function formatMoney(part, lang, prefix) {
    const cur = prefix || 'NZ$';
    const fmt = n => cur + Math.round(Number(n) || 0).toLocaleString('en-NZ');
    if (!part) return lang === 'zh' ? '待核' : 'To verify';
    if (part.empty) return '—';
    const has = Number(part.min) > 0 || Number(part.max) > 0;
    if (!has) return part.verify ? (lang === 'zh' ? '待核' : 'To verify') : '—';
    const body = part.min === part.max ? fmt(part.min) : fmt(part.min) + '–' + fmt(part.max);
    const mark = lang === 'zh' ? '估算 ' : 'est. ';
    return part.verify ? mark + body + (lang === 'zh' ? '＋待核' : ' + to verify') : mark + body;
  }

  return { SOURCES, blankAssumptions, normalise, encodeState, decodeState, priceDay, priceTrip, formatMoney, dayInput };
});
