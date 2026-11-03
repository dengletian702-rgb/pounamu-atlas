// Rendering for recommendation reasons (data/why.js): a tag chip that says what kind of reason it is, the reason
// itself, and its source — so a name never appears without the "why".
import { WHY, WHY_PLACE, WHY_TAGS } from '../data/why.js';
import { SOURCES } from '../data/routes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = (y) => (typeof y.src === 'string' ? SOURCES[y.src] : y.src);

export const whyFor = (id) => WHY[id] || WHY_PLACE[id] || [];
export const chip = (y, lang) => `<span class="why-tag why-${y.tag}">${esc(WHY_TAGS[y.tag][lang] || WHY_TAGS[y.tag].en)}</span>`;

// One line for cards: the chip and the first reason.
export function whyLine(id, lang) {
  const y = whyFor(id)[0];
  return y ? `<span class="why-line">${chip(y, lang)}<span>${esc(y[lang] || y.en)}</span></span>` : '';
}

// The full list, with sources and verify marks.
export function whyList(list, lang, { verify, verifyTitle }) {
  if (!list.length) return '';
  return `<ul class="why-list">${list.map((y) => {
    const s = src(y);
    return `<li>${chip(y, lang)}<span>${esc(y[lang] || y.en)}${y.verify ? ` <abbr class="tv" title="${esc(verifyTitle)}">${esc(verify)}</abbr>` : ''}${s ? ` <a class="src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label.split(' — ')[0])}</a>` : ''}</span></li>`;
  }).join('')}</ul>`;
}

// For a whole trip: the strongest distinct reasons among its routes and places (heritage, film, rankings first).
const RANK = ['heritage', 'award', 'film', 'record', 'official', 'history', 'pick', 'practical'];
export function tripWhy(ids, n = 3) {
  const seen = new Set(), out = [];
  for (const y of ids.flatMap((id) => whyFor(id)).sort((a, b) => RANK.indexOf(a.tag) - RANK.indexOf(b.tag))) {
    if (seen.has(y.en)) continue;
    seen.add(y.en);
    out.push(y);
    if (out.length === n) break;
  }
  return out;
}
