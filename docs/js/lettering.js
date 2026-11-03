// Display lettering for Chinese headings. The brush face ships as one small subset, so a heading is set in it only
// when every Chinese character in it is in the subset; otherwise it keeps the house sans rather than mixing faces.
import { DISPLAY_CHARS } from './lettering-chars.js';

const HAVE = new Set(DISPLAY_CHARS);
const CJK = /[　-鿿＀-￯]/;
export const fits = (text) => [...text].every((c) => !CJK.test(c) || HAVE.has(c) || /[　-〿＀-￯]/.test(c));

export function letter(nodes, lang) {
  for (const n of nodes) n.classList.toggle('display', lang === 'zh' && fits(n.textContent));
}
