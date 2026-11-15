// Create the v8 footer pages (About, Privacy, Terms, Safety, Settings) from the sources page shell.
// Their content is rendered by docs/v8-pages.js in Chinese or English. Pages that already exist are left alone.
// Usage: node scripts/build-v8-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs');
const shell = fs.readFileSync(path.join(docs, 'sources.html'), 'utf8');
const pages = [
  ['about', '关于我们', 'About us', 'What Pounamu Atlas is, where its route facts come from, and what it does not do.'],
  ['privacy', '隐私政策', 'Privacy policy', 'What Pounamu Atlas keeps in your browser, when your browser contacts third parties, and how to clear it.'],
  ['terms', '使用条款', 'Terms of use', 'Terms for using Pounamu Atlas: what it provides, accuracy, your responsibilities and content licences.'],
  ['safety', '安全须知', 'Safety', 'Outdoor, driving and natural-hazard safety for travelling New Zealand, and the 111 emergency number.'],
  ['settings', '隐私与安全设置', 'Privacy and security settings', 'Manage Google Maps, local data, motion and external-link warnings for Pounamu Atlas on this device.']
];
for (const [id, zh, en, desc] of pages) {
  const file = path.join(docs, id + '.html');
  if (fs.existsSync(file)) { console.log('exists, kept:', id + '.html'); continue; }
  let html = shell
    .replace('<body data-page="sources">', `<body data-page="${id}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${zh} — 绿石之地 · Pounamu Atlas</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`)
    .replace(/<script src="v7\.js[^"]*" defer><\/script>/, m => `<script src="v8-pages.js" defer></script>${m}`);
  if (!html.includes('v8-pages.js')) throw new Error('v7.js script tag not found in sources.html');
  fs.writeFileSync(file, html);
  console.log('created', id + '.html', '·', en);
}
