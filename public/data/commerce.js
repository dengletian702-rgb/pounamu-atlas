// Commerce, designed now and switched off (plan §9.4). Nothing here is turned on without the site owner's decision.
// - Every booking link comes from ONE function, bookingUrl(), so a partner URL can later replace it in one place.
// - The partner slot stays hidden while `partnerSlot` is false; when shown it is always labelled "Partner / 合作",
//   and a partner never changes a reason, a verify mark or a source.
import { SOURCES } from './routes.js';

export const COMMERCE = {
  partnerSlot: false,
  partners: {}, // routeId → { name, url } — empty on purpose
};

// The official operator or DOC page where this route or place is booked, or null if it needs no booking.
export function bookingUrl(item) {
  if (item.bookingUrl) return item.bookingUrl;
  if (item.gear && (item.gear.includes('booking') || item.gear.includes('ticket'))) {
    const s = SOURCES[item.sources?.[0]];
    return s ? { url: s.url, label: s.label.split(' — ')[0] } : null;
  }
  if (item.booking && item.src) return { url: item.src.url, label: item.src.label.split(' — ')[0] };
  return null;
}
