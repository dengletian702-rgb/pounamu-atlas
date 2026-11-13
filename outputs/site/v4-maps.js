/* Map surface. No key, a failed script, a timeout, or gm_authFailure all draw the schematic SVG.
   Directions is never called. */
(function () {
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
  function finite(s) {
    return s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon));
  }
  function schematicSvg(state) {
    const zh = state.lang !== 'en';
    const lineStops = (state.stops || []).filter(finite);
    let pool = (state.candidates && state.candidates.length ? state.candidates : state.stops || []).filter(finite);
    if (state.startId && !pool.some(p => p.id === state.startId)) {
      const extra = lineStops.find(s => s.id === state.startId);
      if (extra) pool = [extra, ...pool];
    }
    const pts = lineStops.map(s => ({ ...s, xy: project(Number(s.lat), Number(s.lon)) }));
    const endId = state.endId || (pts.length ? pts[pts.length - 1].id : '');
    const line = pts.length > 1 ? pts.map(p => p.xy.map(n => n.toFixed(1)).join(',')).join(' ') : '';
    const dots = pool.map(p => {
      const xy = project(Number(p.lat), Number(p.lon));
      const label = zh ? (p.name_zh || p.name_en || '') : (p.name_en || p.name_zh || '');
      const isStart = Boolean(state.startId) && p.id === state.startId;
      const isEnd = Boolean(endId) && p.id === endId;
      const tag = isStart && isEnd ? (zh ? '起终' : 'Start/end') : isStart ? (zh ? '起' : 'S') : isEnd ? (zh ? '终' : 'E') : '';
      const cls = [
        'v4-map-stop',
        p.selected ? 'is-on' : 'is-off',
        p.unscheduled ? 'is-unscheduled' : '',
      ].filter(Boolean).join(' ');
      return `<g class="${cls}" data-place="${esc(p.id)}" tabindex="0" role="button" aria-pressed="${p.selected ? 'true' : 'false'}" aria-label="${esc(label)}" transform="translate(${xy[0].toFixed(1)} ${xy[1].toFixed(1)})">
        <circle r="${p.selected ? 7 : 5}"><title>${esc(label)}</title></circle>
        ${tag ? `<text y="-10" text-anchor="middle">${esc(tag)}</text>` : ''}
        ${(p.selected || isStart || isEnd) && label ? `<text class="v4-map-name" y="16" text-anchor="middle">${esc(label)}</text>` : ''}
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
  function bindSvg(el, state) {
    el.querySelectorAll('[data-place]').forEach(node => {
      const toggle = () => { if (typeof state.onToggle === 'function') state.onToggle(node.dataset.place); };
      node.addEventListener('click', toggle);
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (typeof state.onToggle === 'function') state.onToggle(node.dataset.place, 'key');
        }
      });
    });
  }
  let sessionSvg = false;
  let mountSeq = 0;
  let errorHandler = null;
  function alive(el, token) {
    return Boolean(el && el.isConnected && el.dataset.mapToken === token);
  }
  function googleErrored(el) {
    return Boolean(el.querySelector('.gm-err-container, .gm-err-message, .gm-err-title, .dismissButton'));
  }
  let nativeObserver = null;
  let watchedObservers = [];
  function mapsScriptUrl(value) {
    return /maps\.(?:googleapis|gstatic|google)\.com/i.test(String(value || ''));
  }
  function eventFromMaps(event) {
    const file = String(event.filename || '');
    const stack = event.error && event.error.stack ? String(event.error.stack) : '';
    return mapsScriptUrl(file) || mapsScriptUrl(stack);
  }
  // While the Google script is still loading, a few messages mean it failed even if the URL is hidden.
  // After the SVG fallback, only a Maps script URL in the source or the stack is swallowed.
  function googleScriptError(event) {
    if (eventFromMaps(event)) return true;
    const msg = String(event.message || '');
    return /google maps|invalidkey|gm_auth|getRootNode|referernotallowed/i.test(msg);
  }
  let googleQuiet = null;
  function keepGoogleQuiet() {
    if (googleQuiet) return;
    googleQuiet = event => {
      // A cross-origin Maps script reports only "Script error." to the page. The detailed
      // message (setAttribute, getRootNode, …) is visible to the console unless this event is cancelled.
      const opaque = event.message === 'Script error.' && !event.filename
        && [...document.scripts].some(script => mapsScriptUrl(script.src));
      if (eventFromMaps(event) || opaque) event.preventDefault();
    };
    window.addEventListener('error', googleQuiet, true);
  }
  function stopMapHooks() {
    if (errorHandler) {
      window.removeEventListener('error', errorHandler, true);
      errorHandler = null;
    }
    for (const obs of watchedObservers) {
      try { obs.disconnect(); } catch { /* already disconnected */ }
    }
    watchedObservers = [];
    if (nativeObserver) {
      window.IntersectionObserver = nativeObserver;
      nativeObserver = null;
    }
  }
  function watchObservers() {
    if (nativeObserver || typeof window.IntersectionObserver !== 'function') return;
    nativeObserver = window.IntersectionObserver;
    const Native = nativeObserver;
    window.IntersectionObserver = function (callback, options) {
      const wrapped = (entries, observer) => {
        try { callback(entries, observer); }
        catch { /* a removed map node can make the old observer throw */ }
      };
      const obs = new Native(wrapped, options);
      watchedObservers.push(obs);
      return obs;
    };
    window.IntersectionObserver.prototype = Native.prototype;
  }
  function showSvg(el, state) {
    stopMapHooks();
    keepGoogleQuiet();
    el.dataset.mapKind = 'svg';
    el.innerHTML = schematicSvg(state);
    bindSvg(el, state);
    const svg = el.querySelector('svg');
    const fit = () => {
      if (!svg) return;
      const box = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal.width || 680;
      const scale = box.width > 0 ? box.width / vb : 0;
      if (!scale) return;
      svg.querySelectorAll('text').forEach(t => t.style.setProperty('font-size', (13 / scale).toFixed(2) + 'px', 'important'));
    };
    fit();
    requestAnimationFrame(fit);
    setTimeout(fit, 80);
    const names = [...el.querySelectorAll('.v4-map-name')].map(t => t.textContent.trim()).filter(Boolean);
    if (names.length && !el.querySelector('.v4-map-name-list')) {
      const list = document.createElement('ul');
      list.className = 'v4-map-name-list';
      list.innerHTML = names.map(name => `<li>${esc(name)}</li>`).join('');
      svg.after(list);
    }
    return { kind: 'svg' };
  }
  function loadGoogle(key) {
    if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      const timer = setTimeout(() => { s.remove(); resolve(false); }, 4000);
      s.async = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker`;
      s.onload = () => { clearTimeout(timer); resolve(Boolean(window.google && window.google.maps)); };
      s.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.appendChild(s);
    });
  }
  async function mount(el, state) {
    if (!el) return { kind: 'none' };
    stopMapHooks();
    const token = String(++mountSeq);
    el.dataset.mapToken = token;
    const key = keyFromWindow();
    if (!key || sessionSvg) return showSvg(el, state);
    watchObservers();
    let failed = false;
    const giveUp = () => {
      failed = true;
      sessionSvg = true;
      if (alive(el, token)) showSvg(el, state);
    };
    errorHandler = event => {
      if (googleScriptError(event)) {
        event.preventDefault();
        giveUp();
      }
    };
    window.addEventListener('error', errorHandler, true);
    window.gm_authFailure = () => giveUp();
    const watch = new MutationObserver(() => { if (googleErrored(el)) giveUp(); });
    watch.observe(el, { childList: true, subtree: true });
    watchedObservers.push(watch);
    const ok = await loadGoogle(key);
    if (!alive(el, token)) return { kind: 'stale' };
    if (ok && !failed) await new Promise(resolve => setTimeout(resolve, 800));
    if (!alive(el, token)) return { kind: 'stale' };
    if (failed || sessionSvg || googleErrored(el)) return showSvg(el, state);
    if (!ok || !window.google || !window.google.maps) { sessionSvg = true; return showSvg(el, state); }
    try {
      watchObservers();
      el.dataset.mapKind = 'google';
      const mapDiv = document.createElement('div');
      mapDiv.className = 'v4-google-map';
      el.replaceChildren(mapDiv);
      const map = new window.google.maps.Map(mapDiv, {
        center: { lat: -41.3, lng: 174.0 },
        zoom: 5,
        mapId: 'DEMO_MAP_ID',
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        mapTypeControlOptions: { mapTypeIds: ['roadmap', 'satellite', 'terrain'] },
        streetViewControl: false,
        fullscreenControl: false,
      });
      const bounds = new window.google.maps.LatLngBounds();
      const path = [];
      const Marker = window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement;
      const pool = (state.candidates && state.candidates.length ? state.candidates : state.stops || []).filter(finite);
      pool.forEach(s => {
        const pos = { lat: Number(s.lat), lng: Number(s.lon) };
        bounds.extend(pos);
        const title = (state.lang === 'en' ? (s.name_en || s.name_zh) : (s.name_zh || s.name_en)) || '';
        let marker;
        if (Marker) {
          const dot = document.createElement('div');
          dot.className = s.selected ? 'v4-g-dot is-on' : 'v4-g-dot';
          dot.textContent = state.startId && s.id === state.startId ? (state.lang === 'en' ? 'S' : '起') : '';
          marker = new Marker({ map, position: pos, title, content: dot });
          marker.addListener('click', () => { if (typeof state.onToggle === 'function') state.onToggle(s.id); });
        } else {
          marker = new window.google.maps.Marker({ map, position: pos, title });
          marker.addListener('click', () => { if (typeof state.onToggle === 'function') state.onToggle(s.id); });
        }
      });
      (state.stops || []).forEach(s => {
        if (!finite(s)) return;
        path.push({ lat: Number(s.lat), lng: Number(s.lon) });
      });
      if (path.length > 1) {
        new window.google.maps.Polyline({
          map, path, strokeColor: '#9e4a2e', strokeOpacity: 0.9, strokeWeight: 3, geodesic: false,
        });
      }
      if (path.length || pool.length) map.fitBounds(bounds, 48);
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (!alive(el, token)) return { kind: 'stale' };
      if (failed || sessionSvg || googleErrored(el)) { sessionSvg = true; return showSvg(el, state); }
      return { kind: 'google', map };
    } catch {
      sessionSvg = true;
      return showSvg(el, state);
    }
  }
  window.PounamuMaps = { mount, project, schematicSvg, hasKey: keyFromWindow, showSvg };
})();
