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
  function searchTracks(tracks, query, towns) {
    const q = fold(query);
    if (!q) return tracks.slice();
    const matchedTowns = (towns || []).filter(t => {
      const names = [t.name_en, t.name_zh, t.town, t.name].map(fold).filter(Boolean);
      return names.some(n => n.includes(q) || q.includes(n));
    });
    return tracks.filter(tr => {
      const blob = fold([tr.name, tr.zh, tr.region, tr.regionName, tr.url].filter(Boolean).join(' '));
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
  return { fold, haversineKm, searchTracks };
});
