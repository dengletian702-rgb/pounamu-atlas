// One switch for each hidden section. Set a flag to true to show it again in
// navigation, search, town pages and its own URL.
window.POUNAMU_FLAGS = {
  sports: true,
  docDirectory: false
};

function pounamuFlag(name) {
  const flags = window.POUNAMU_FLAGS;
  if (!flags || !Object.prototype.hasOwnProperty.call(flags, name)) return true;
  return flags[name] !== false;
}

function pounamuHideFlaggedLinks() {
  const dropPages = [];
  const dropHref = [];
  if (!pounamuFlag('sports')) {
    dropPages.push('cities', 'city');
    dropHref.push(/(?:^|\/)city\.html/i, /(?:^|\/)cities\.html/i);
  }
  if (!pounamuFlag('docDirectory')) {
    dropPages.push('tracks');
    dropHref.push(/(?:^|\/)tracks\.html/i);
  }
  document.querySelectorAll('a[href]').forEach(a => {
    if (a.closest('.pounamu-paused')) return;
    const href = a.getAttribute('href') || '';
    if (dropPages.includes(a.dataset.page || '') || dropHref.some(re => re.test(href))) a.remove();
  });
}

// Move ordinary outbound links out of the reading text. Licence and photo
// credits stay as links. References are plain text, not anchors.
function pounamuSealContent() {
  const main = document.querySelector('main');
  if (!main) return;
  const keep = a => {
    const href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return true;
    if (a.closest('.page-references, .pounamu-paused, .v3-licence, .map-attribution, .photo-band-credit, .image-credits, figcaption, .v4-dest-photo')) return true;
    if (a.dataset.keepLink != null || a.classList.contains('v4-gmaps') || a.classList.contains('v4-source')) return true;
    if (/creativecommons\.org|openstreetmap\.org\/copyright|naturalearthdata\.com|data\.linz\.govt\.nz|linz\.govt\.nz/i.test(href)) return true;
    return false;
  };
  const found = [];
  main.querySelectorAll('a[href]').forEach(a => {
    if (keep(a)) return;
    let url = '';
    try { url = new URL(a.getAttribute('href'), location.href).href; } catch { url = a.getAttribute('href') || ''; }
    const name = (a.textContent || '').replace(/\s+/g, ' ').replace(/↗/g, '').trim() || url;
    if (url) found.push({ name, url });
    a.replaceWith(document.createTextNode(name));
  });
  if (!found.length && document.getElementById('page-references')) return;
  let section = document.getElementById('page-references');
  if (!section) {
    section = document.createElement('section');
    section.id = 'page-references';
    section.className = 'page-references';
    main.append(section);
  }
  const zh = document.documentElement.lang.startsWith('zh');
  const seen = new Set();
  const items = [];
  section.querySelectorAll('[data-ref-url]').forEach(li => {
    const url = li.getAttribute('data-ref-url');
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push(li.outerHTML);
  });
  found.forEach(item => {
    if (!item.url || seen.has(item.url)) return;
    seen.add(item.url);
    const name = item.name.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const url = item.url.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const date = zh ? '查阅日期待核' : 'access date to be confirmed';
    items.push(`<li data-ref-url="${url}">${name}. ${url}. ${date}.</li>`);
  });
  if (!items.length) { section.remove(); return; }
  section.innerHTML = `<h2>${zh ? '参考来源' : 'References'}</h2><ol>${items.join('')}</ol>`;
}

window.pounamuFlag = pounamuFlag;
window.pounamuHideFlaggedLinks = pounamuHideFlaggedLinks;
window.pounamuSealContent = pounamuSealContent;
