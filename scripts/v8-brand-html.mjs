// Put the v8 logo (stone mark + brush wordmark) into every page's header brand link and use the mark as the
// favicon. The brand's text stays in a visually hidden span, so screen readers, search and the language switch
// still read "绿石之地" / "Pounamu Atlas". Safe to run again: pages already done are left as they are.
// Usage: node scripts/v8-brand-html.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs');
const inner = '<img class="v8-mark" src="assets/brand/mark.svg" alt="" width="40" height="40"><span class="v8-word"><img class="v8-wordmark" src="assets/brand/wordmark-zh.svg" alt="" width="108" height="27"></span><span class="v8-sr" data-i18n="brandName">绿石之地</span>';
const favicon = '<link rel="icon" href="assets/brand/mark.svg" type="image/svg+xml">';
let changed = 0;
for (const file of fs.readdirSync(docs).filter(f => f.endsWith('.html'))) {
  const p = path.join(docs, file);
  const before = fs.readFileSync(p, 'utf8');
  let html = before.replace(/<a class="brand"([^>]*)><span data-i18n="brandName">[^<]*<\/span><\/a>/g, (m, attrs) => `<a class="brand v8-brand"${attrs}>${inner}</a>`);
  html = html.replace(/<link rel="icon" href="data:image\/svg\+xml[^"]*" type="image\/svg\+xml">/, favicon);
  if (html !== before) { fs.writeFileSync(p, html); changed++; console.log('brand →', file); }
}
console.log(changed + ' page(s) updated');
