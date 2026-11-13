/* Group a route's stages into day cards.
   A stay is a hut, campsite or town named in the stage itself.
   A stage title that starts with a verb is never a stay.
   One-day routes are a single card with no overnight row. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.pounamuRouteDays = api.routeDays;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pick(pair, en) { return Array.isArray(pair) ? (en ? pair[0] : pair[1]) || '' : ''; }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  const VERB = /^(leave|climb|lunch|follow|start|pause|ride|walk|cross|check|arrive|return|ease|give|make|choose|continue|watch|pass|transfer|settle|go|finish|side|bridges|old|use|book|reach|meet|enter|descend|take|complete|find|set|breakfast|dinner|stretch|let|pack|have|art|across|toward|one|decide|shuttle|depart|ease)\b/i;

  function placeTail(title) {
    const t = clean(title).replace(/\.$/, '');
    if (!t || /^side trip/i.test(t)) return '';
    const parts = t.split(/\s*(?:→|->|\bto\b)\s*/i);
    if (parts.length < 2) {
      if (VERB.test(t)) return '';
      if (/\b(hut|campsite|camp|kāinga|kainga)\b/i.test(t) && t.split(' ').length <= 6) return t;
      return '';
    }
    const tail = parts[parts.length - 1].replace(/\([^)]*\)/g, '').replace(/\.$/, '').trim();
    if (!tail || VERB.test(tail) || tail.split(/\s+/).length > 7) return '';
    return tail;
  }

  function endsQuery(route) {
    return clean(pick(route.ends, true) || route.name).replace(/\s*(?:→|->)\s*/g, ' ');
  }

  function stayKind(name, route) {
    if (!name) return 'verify';
    const id = (route.id || '') + ' ' + (route.name || '');
    const great = /milford|whanganui|routeburn|kepler|heaphy|abel-tasman|paparoa|rakiura|waikaremoana|tongariro-northern|hump-ridge|queen-charlotte/i.test(id);
    if (/camp/i.test(name)) return great ? 'great-walk' : 'doc-camp';
    if (/hut|kāinga|kainga/i.test(name)) return great ? 'great-walk' : 'doc-hut';
    if (/sandfly point|the divide|kohaihai|rainbow reach/i.test(name)) return 'none';
    return 'city';
  }

  function isSide(stage) {
    return /^side trip/i.test(stage.titleEn) || /^side trip/i.test(stage.atEn);
  }

  function dayNo(stage) {
    const m = String(stage.atEn || '').match(/day\s*(\d+)/i);
    return m ? Number(m[1]) : 0;
  }

  function cardTitle(group, stay) {
    const first = group.stages[0] && group.stages[0].titleEn;
    const from = first ? clean(first.split(/\s*(?:→|->|\bto\b)\s*/i)[0]) : '';
    if (from && !VERB.test(from) && from.toLowerCase() !== String(stay).toLowerCase()) return from + ' → ' + stay;
    return stay;
  }

  function milford(stages) {
    const bit = (i, en) => ((stages[i] || {})[en ? 'textEn' : 'textZh']) || '';
    const row = (stay, titleEn, titleZh, textEn, textZh, moveEn, moveZh, kind, hut) => ({
      noStay: false, stayEn: stay, stayZh: stay, titleEn, titleZh, textEn, textZh,
      query: stay + ' Milford Track', stayKind: kind, hut, moveEn, moveZh
    });
    return [
      row('Clinton Hut', 'Glade Wharf → Clinton Hut', 'Glade Wharf → Clinton Hut', bit(0, true) + ' ' + bit(1, true), bit(0, false) + ' ' + bit(1, false), 'To verify', '待核', 'great-walk', true),
      row('Mintaro Hut', 'Clinton Hut → Mintaro Hut', 'Clinton Hut → Mintaro Hut', bit(1, true), bit(1, false), 'To verify', '待核', 'great-walk', true),
      row('Dumpling Hut', 'Mackinnon Pass → Dumpling Hut', '翻 Mackinnon Pass → Dumpling Hut', bit(2, true), bit(2, false), 'To verify', '待核', 'great-walk', true),
      row('Sandfly Point', 'To Sandfly Point, then the boat', '到 Sandfly Point，再乘船', bit(3, true) + ' ' + bit(4, true), bit(3, false) + ' ' + bit(4, false), 'Boat out the same day', '当天乘船离开', 'none', false)
    ];
  }

  function routeDays(route) {
    if (!route) return [];
    const stages = (route.timeline || []).map(s => ({
      titleEn: pick(s.title, true), titleZh: pick(s.title, false),
      textEn: pick(s.text, true), textZh: pick(s.text, false), atEn: pick(s.at, true)
    }));
    const time = Array.isArray(route.time) ? route.time : ['', ''];
    const planDays = Math.max(1, Number(route.planDays) || 1);
    if (route.id === 'milford-track') return milford(stages);
    if (planDays <= 1) {
      return [{
        noStay: true, stayEn: '', stayZh: '',
        titleEn: route.name, titleZh: route.zh || route.name,
        textEn: stages.map(s => s.textEn).filter(Boolean).join(' '),
        textZh: stages.map(s => s.textZh).filter(Boolean).join(' '),
        query: endsQuery(route), stayKind: 'none', hut: false,
        moveEn: time[0] || 'To verify', moveZh: time[1] || '待核',
        dir: route.id === 'tranzalpine' ? { origin: 'Christchurch Railway Station', destination: 'Greymouth Railway Station', mode: 'transit' } : null
      }];
    }
    const buckets = new Map();
    let last = 0;
    stages.forEach(s => {
      if (isSide(s)) {
        const key = last || 0;
        if (!buckets.has(key)) buckets.set(key, { stages: [], notes: [] });
        buckets.get(key).notes.push(s);
        return;
      }
      const n = dayNo(s) || 0;
      const key = n || 0;
      if (!buckets.has(key)) buckets.set(key, { stages: [], notes: [] });
      buckets.get(key).stages.push(s);
      if (n) last = n;
    });
    let groups;
    if ([...buckets.keys()].some(k => k > 0)) {
      groups = [...buckets.entries()].filter(([k]) => k > 0).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
      const loose = buckets.get(0);
      if (loose && groups.length) {
        groups[groups.length - 1].stages.push(...loose.stages);
        groups[groups.length - 1].notes.push(...loose.notes);
      }
    } else {
      groups = [];
      stages.forEach(s => {
        if (isSide(s)) {
          if (groups.length) groups[groups.length - 1].notes.push(s);
          return;
        }
        groups.push({ stages: [s], notes: [] });
      });
      while (groups.length > planDays) {
        const extra = groups.pop();
        groups[groups.length - 1].stages.push(...extra.stages);
        groups[groups.length - 1].notes.push(...extra.notes);
      }
    }
    groups = groups.slice(0, planDays);
    const ends = endsQuery(route);
    return groups.map(g => {
      let stay = '';
      let hutStay = '';
      for (let i = g.stages.length - 1; i >= 0; i--) {
        const found = placeTail(g.stages[i].titleEn);
        if (!found) continue;
        if (!stay) stay = found;
        if (/hut|camp|kāinga|kainga/i.test(found)) { hutStay = found; break; }
      }
      stay = hutStay || stay;
      const bits = [...g.stages, ...g.notes];
      return {
        noStay: false,
        stayEn: stay || 'To verify',
        stayZh: stay || '待核',
        titleEn: stay ? cardTitle(g, stay) : (route.name || 'To verify'),
        titleZh: stay || (route.zh || route.name || '待核'),
        textEn: bits.map(s => s.textEn).filter(Boolean).join(' '),
        textZh: bits.map(s => s.textZh).filter(Boolean).join(' '),
        query: stay || ends,
        stayKind: stay ? stayKind(stay, route) : 'verify',
        hut: !!(stay && /hut|kāinga|kainga/i.test(stay)),
        moveEn: 'To verify',
        moveZh: '待核'
      };
    });
  }

  return { routeDays, placeTail, VERB };
});
