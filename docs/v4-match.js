/* Shared place/track matching for the site and for node:test. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.v4Match = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function fold(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/†/g, '').replace(/\s+/g, ' ').trim();
  }
  function haversineKm(lat1, lon1, lat2, lon2) {
    const r = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  // DOC Great Walks (https://www.doc.govt.nz/parks-and-recreation/things-to-do/walking-and-tramping/great-walks/, read
  // 2026-11-12). The Whanganui Journey is a river trip, and the Milford and Heaphy tracks are missing from the DOC dataset.
  const GREAT_WALKS = ['lake waikaremoana track', 'tongariro northern circuit', 'abel tasman coast track', 'heaphy track', 'paparoa track', 'routeburn track', 'milford track', 'kepler track', 'rakiura track', 'hump ridge track'];
  const GREAT_WALK_WORDS = ['great walk', '大步道', '九大步道', '十大步道', '十一大步道', '经典步道'];
  function isGreatWalkQuery(query) {
    const q = fold(query);
    return !!q && GREAT_WALK_WORDS.some(w => q.includes(fold(w)));
  }
  function isGreatWalk(name) { return GREAT_WALKS.includes(fold(name)); }
  // tracks match on their own name, DOC region (and its labels in opts.regionLabels), or by lying within 45 km of a
  // town whose name, region or extra labels match the query (ticket E: "Ruapehu" and "鲁阿佩胡" find the Tongariro walks)
  function searchTracks(tracks, query, towns, opts) {
    const q = fold(query);
    if (!q) return tracks.slice();
    if (isGreatWalkQuery(q)) return tracks.filter(tr => isGreatWalk(tr.name));
    const regionLabels = (opts && opts.regionLabels) || {};
    const matchedTowns = (towns || []).filter(t => {
      const names = [t.name_en, t.name_zh, t.town, t.name, t.atlas_region, ...(Array.isArray(t.labels) ? t.labels : [])].map(fold).filter(Boolean);
      return names.some(n => n.includes(q) || (n.length > 1 && q.includes(n)));
    });
    return tracks.filter(tr => {
      const blob = fold([tr.name, tr.zh, tr.region, tr.regionName, ...(regionLabels[tr.region] || []), tr.url].filter(Boolean).join(' '));
      if (blob.includes(q)) return true;
      for (const town of matchedTowns) {
        const en = fold(town.name_en || town.town || '');
        if (en && en.length > 2 && blob.includes(en)) return true;
        const lat = Number(town.lat);
        const lon = Number(town.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(Number(tr.lat)) && Number.isFinite(Number(tr.lon))) {
          if (haversineKm(lat, lon, Number(tr.lat), Number(tr.lon)) <= 45) return true;
        }
      }
      return false;
    });
  }
  return { fold, haversineKm, searchTracks, isGreatWalkQuery, isGreatWalk, GREAT_WALKS };
});
