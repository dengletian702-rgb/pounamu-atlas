// Credited route photos (data/photos.js). Every photo is shown with its real place, photographer and licence.
import { PHOTOS, ROUTE_PHOTO } from '../data/photos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const photoFor = (routeId) => (ROUTE_PHOTO[routeId] ? { id: ROUTE_PHOTO[routeId], ...PHOTOS[ROUTE_PHOTO[routeId]] } : null);

export function credit(p, lang) {
  return `${esc(p.place[lang] || p.place.en)} · ${lang === 'zh' ? '摄影' : 'Photo'}: ${esc(p.by)} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, <a href="${esc(p.licenceUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.licence)}</a>`;
}

// <img> with both sizes; `eager` for the one picture that is the first thing on screen.
export function img(p, lang, { eager = false, sizes = '(max-width: 899px) 100vw, 50vw', cls = '' } = {}) {
  const [w, h] = p.sizes[1280];
  return `<img class="${cls}" src="/pounamu-atlas/img/routes/${p.id}-640.jpg" srcset="/pounamu-atlas/img/routes/${p.id}-640.jpg 640w, /pounamu-atlas/img/routes/${p.id}-1280.jpg 1280w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(p.place[lang] || p.place.en)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export function figure(routeId, lang, opts = {}) {
  const p = photoFor(routeId);
  return p ? `<figure class="ph ${opts.cls || ''}">${img(p, lang, opts)}<figcaption>${credit(p, lang)}</figcaption></figure>` : '';
}

export const allPhotos = () => Object.entries(PHOTOS).map(([id, p]) => ({ id, ...p }));
