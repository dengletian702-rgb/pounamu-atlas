/* Google Maps URLs (no key, no Maps JavaScript API) and a local NZ coastline drawing.
   Docs: https://developers.google.com/maps/documentation/urls/get-started
   Directions accept at most 9 waypoints between origin and destination. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.pounamuMapsUrl = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const WAYPOINT_LIMIT = 9;
  const MODE = { car: 'driving', drive: 'driving', road: 'driving', driving: 'driving', transit: 'transit', ferry: 'transit', train: 'transit', coach: 'transit', shuttle: 'transit', public: 'transit', walk: 'walking', walking: 'walking', cycle: 'driving', paddle: 'walking' };

  function pointLabel(stop) {
    if (!stop) return '';
    if (Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng))) return Number(stop.lat) + ',' + Number(stop.lng);
    const name = [stop.name, stop.town, 'New Zealand'].filter(Boolean).join(' ');
    return name.trim();
  }

  function searchUrl(opts) {
    const o = opts || {};
    let query;
    if (Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lng))) query = Number(o.lat) + ',' + Number(o.lng);
    else {
      const name = [o.name, o.town].filter(Boolean).join(' ').replace(/\s+New Zealand\s*$/i, '').trim();
      query = name ? name + ' New Zealand' : 'New Zealand';
    }
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function dirUrl(opts) {
    const o = opts || {};
    const mode = MODE[o.mode] || 'driving';
    const params = new URLSearchParams();
    params.set('api', '1');
    params.set('origin', o.origin || '');
    params.set('destination', o.destination || '');
    params.set('travelmode', mode);
    const via = (o.waypoints || []).filter(Boolean);
    if (via.length) params.set('waypoints', via.join('|'));
    return 'https://www.google.com/maps/dir/?' + params.toString();
  }

  // Split a stop list into directions URLs that stay inside Google's waypoint limit.
  function routeSegments(stops, mode) {
    const list = (stops || []).filter(s => pointLabel(s));
    if (list.length < 2) return [];
    const span = WAYPOINT_LIMIT + 2;
    const urls = [];
    for (let i = 0; i < list.length - 1;) {
      const end = Math.min(list.length - 1, i + span - 1);
      const slice = list.slice(i, end + 1);
      urls.push(dirUrl({
        origin: pointLabel(slice[0]),
        destination: pointLabel(slice[slice.length - 1]),
        waypoints: slice.slice(1, -1).map(pointLabel),
        mode
      }));
      if (end >= list.length - 1) break;
      i = end;
    }
    return urls;
  }

  function anchor(href, label, extraClass) {
    const cls = 'v4-gmaps' + (extraClass ? ' ' + extraClass : '');
    const safe = String(href).replace(/"/g, '%22');
    const text = String(label).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return `<a class="${cls}" href="${safe}" target="_blank" rel="noopener" data-keep-link="1">${text}</a>`;
  }

  function searchLink(opts, lang) {
    const label = lang === 'en' ? 'Open in Google Maps' : '在谷歌地图打开';
    return anchor(searchUrl(opts), label, 'v4-gmaps-search');
  }

  function dirLink(opts, lang) {
    const label = lang === 'en' ? 'Open in Google Maps' : '在谷歌地图导航';
    return anchor(dirUrl(opts), label, 'v4-gmaps-dir');
  }

  // Equirectangular drawing of bundled Natural Earth rings. Returns an SVG path d, or '' if the data is unusable.
  function coastPaths(data, width, height, pad) {
    const rings = data && Array.isArray(data.rings) ? data.rings : [];
    if (!rings.length) return '';
    const w = width || 680, h = height || 820, p = pad == null ? 28 : pad;
    const minLon = 166, maxLon = 179, minLat = -47.6, maxLat = -34.2;
    const xOf = lon => p + (lon - minLon) / (maxLon - minLon) * (w - p * 2);
    const yOf = lat => p + (maxLat - lat) / (maxLat - minLat) * (h - p * 2);
    return rings.map(ring => ring.map((pt, i) => {
      const cmd = i ? 'L' : 'M';
      return cmd + xOf(pt[0]).toFixed(1) + ' ' + yOf(pt[1]).toFixed(1);
    }).join('') + 'Z').join('');
  }

  function project(lat, lon, width, height, pad) {
    const w = width || 680, h = height || 820, p = pad == null ? 28 : pad;
    const minLon = 166, maxLon = 179, minLat = -47.6, maxLat = -34.2;
    return [
      p + (lon - minLon) / (maxLon - minLon) * (w - p * 2),
      p + (maxLat - lat) / (maxLat - minLat) * (h - p * 2)
    ];
  }

  return { WAYPOINT_LIMIT, searchUrl, dirUrl, routeSegments, searchLink, dirLink, anchor, coastPaths, project, pointLabel };
});
