// Shared by the compare and trip pages (and the home page's motion switch): storage, escaping, the motion
// preference and the offline cache. Everything stays in this browser.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const store = {
  get(k, d) { try { const v = localStorage.getItem(`mfn.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`mfn.${k}`, JSON.stringify(v)); } catch { /* ignore */ } },
};

// Motion: the visitor's own switch wins over the system setting; "off" stops the intro, journeys and the reel.
export const motionOff = () => document.documentElement.dataset.motion === 'off';
export function initMotion() {
  const saved = store.get('motion', null);
  const off = saved ? saved === 'off' : matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.dataset.motion = off ? 'off' : 'on';
}
export function setMotion(on) {
  store.set('motion', on ? 'on' : 'off');
  document.documentElement.dataset.motion = on ? 'on' : 'off';
}

// Offline: a service worker that keeps a copy of the site's own files. Registered only when the visitor asks.
export const offlineSupported = () => 'serviceWorker' in navigator && 'caches' in window;
export async function saveOffline() {
  if (!offlineSupported()) return false;
  const reg = await navigator.serviceWorker.register('/pounamu-atlas/sw.js');
  const sw = reg.installing || reg.waiting || reg.active;
  await new Promise((res) => {
    if (sw.state === 'activated') return res();
    sw.addEventListener('statechange', () => sw.state === 'activated' && res());
  });
  store.set('offline', true);
  return true;
}
