/* Map surface for the guide. Google Maps is optional and local.
   With no key, an invalid key, or a failed script, draw the schematic SVG.
   Directions is never called. */
(function () {
  const COAST_ID = 'p10-coast-path';
  function project(lat, lon) {
    return [392.5 + (lon - 174.76) * 38.05, 189.7 + (-lat - 36.85) * 50.5];
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function keyFromWindow() {
    const key = String(window.POUNAMU_GOOGLE_MAPS_KEY || '').trim();
    if (!key || /^(your_key|replace-me|placeholder|todo)$/i.test(key)) return '';
    return key;
  }
  function coastPath() {
    return window.P10_COAST_PATH || '';
  }
  function schematicSvg(state) {
    const zh = state.lang !== 'en';
    const stops = (state.stops || []).filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon));
    const pts = stops.map(s => ({ ...s, xy: project(s.lat, s.lon) }));
    const start = pts[0];
    const end = pts[pts.length - 1];
    const line = pts.length > 1 ? pts.map(p => p.xy.map(n => n.toFixed(1)).join(',')).join(' ') : '';
    const dots = pts.map((p, i) => {
      const label = zh ? (p.name_zh || p.name_en || p.id) : (p.name_en || p.name_zh || p.id);
      const isStart = i === 0;
      const isEnd = i === pts.length - 1;
      const tag = isStart && isEnd ? (zh ? '起终' : 'Start/end') : isStart ? (zh ? '起' : 'S') : isEnd ? (zh ? '终' : 'E') : '';
      return `<g class="v4-map-stop" data-place="${esc(p.id)}" transform="translate(${p.xy[0].toFixed(1)} ${p.xy[1].toFixed(1)})">
        <circle r="${p.selected ? 6 : 4}" class="${p.selected ? 'is-on' : ''}"><title>${esc(label)}</title></circle>
        ${tag ? `<text y="-8" text-anchor="middle">${esc(tag)}</text>` : ''}
      </g>`;
    }).join('');
    const coast = coastPath();
    return `<svg class="v4-schematic" viewBox="0 0 680 820" role="img" aria-label="${zh ? '行程示意图' : 'Schematic itinerary map'}">
      <rect width="680" height="820" fill="#e2ece8"></rect>
      ${coast ? `<path class="v4-coast" d="${coast}"></path>` : ''}
      ${line ? `<polyline class="v4-leg" points="${line}" fill="none"></polyline>` : ''}
      ${dots}
    </svg>`;
  }
  function loadGoogle(key) {
    if (window.google && window.google.maps) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      const timer = setTimeout(() => resolve(false), 8000);
      s.async = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      s.onload = () => { clearTimeout(timer); resolve(Boolean(window.google && window.google.maps)); };
      s.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.appendChild(s);
    });
  }
  async function mount(el, state) {
    if (!el) return { kind: 'none' };
    const key = keyFromWindow();
    el.replaceChildren();
    if (!key) {
      el.dataset.mapKind = 'svg';
      el.innerHTML = schematicSvg(state);
      return { kind: 'svg' };
    }
    const ok = await loadGoogle(key);
    if (!ok || !window.google || !window.google.maps) {
      el.dataset.mapKind = 'svg';
      el.innerHTML = schematicSvg(state);
      return { kind: 'svg' };
    }
    el.dataset.mapKind = 'google';
    const mapDiv = document.createElement('div');
    mapDiv.className = 'v4-google-map';
    el.appendChild(mapDiv);
    const map = new window.google.maps.Map(mapDiv, {
      center: { lat: -41.3, lng: 174.0 },
      zoom: 5,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      mapTypeControlOptions: { mapTypeIds: ['roadmap', 'satellite', 'terrain'] },
      streetViewControl: false,
      fullscreenControl: false,
    });
    const bounds = new window.google.maps.LatLngBounds();
    const path = [];
    (state.stops || []).forEach((s, i) => {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) return;
      const pos = { lat: s.lat, lng: s.lon };
      bounds.extend(pos);
      path.push(pos);
      const isStart = i === 0;
      const isEnd = i === state.stops.length - 1;
      const marker = new window.google.maps.Marker({
        map,
        position: pos,
        title: (state.lang === 'en' ? s.name_en : s.name_zh) || s.id,
        label: isStart ? 'S' : isEnd ? 'E' : undefined,
      });
      marker.addListener('click', () => { if (typeof state.onToggle === 'function') state.onToggle(s.id); });
    });
    if (path.length > 1) {
      new window.google.maps.Polyline({
        map,
        path,
        strokeColor: '#9e4a2e',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        geodesic: false,
      });
    }
    if (path.length) map.fitBounds(bounds, 48);
    return { kind: 'google', map };
  }
  window.PounamuMaps = { mount, project, schematicSvg, hasKey: keyFromWindow };
})();
