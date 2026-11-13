'use strict';
// Mobile P1: the quick-search button must not cover the header, and both languages stay on one row.
const test = require('node:test');
const assert = require('node:assert/strict');
const { openBrowser } = require('./helpers/cdp-browser.cjs');

const LAYOUT = `(() => {
  const box = el => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, btm: b.bottom };
  };
  const hitOf = (el, ratio) => {
    const b = el.getBoundingClientRect();
    const x = b.left + b.width * ratio;
    const y = b.top + b.height * 0.5;
    const hit = document.elementFromPoint(x, y);
    return { x, y, own: !!(hit && (hit === el || el.contains(hit))), id: hit && hit.id || '', cls: hit && String(hit.className || '') };
  };
  const shown = el => {
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 2 && el.getBoundingClientRect().height > 2;
  };
  const overlap = (a, b) => a && b && a.x < b.r - 0.5 && a.r > b.x + 0.5 && a.y < b.btm - 0.5 && a.btm > b.y + 0.5;
  const header = document.querySelector('.header');
  const k = document.querySelector('.ui2-kbtn');
  const hb = box(header);
  const kb = box(k);
  const specs = [['.brand', '.brand'], ['.v4-nav-toggle', '.v4-nav-toggle'], ['.motion-toggle', '.motion-toggle'], ['#language', '#language']];
  const rows = specs.map(([sel]) => document.querySelector(sel)).filter(shown).map(el => {
    const b = box(el);
    return { t: (el.innerText || '').trim().slice(0, 24), ...b, mid: b.y + b.h / 2 };
  });
  const mids = rows.map(r => r.mid);
  const links = [...document.querySelectorAll('.header .nav a')].filter(shown).map(a => {
    const b = box(a);
    return { t: (a.innerText || '').trim().slice(0, 24), ...b, own: hitOf(a, 0.5).own, overK: overlap(b, kb) };
  });
  return {
    vw: innerWidth, vh: innerHeight, sy: scrollY,
    headerH: hb.h, headerBottom: hb.btm,
    filter: getComputedStyle(header).backdropFilter || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows, links,
    same: mids.length ? Math.max(...mids) - Math.min(...mids) : 99,
    kParent: k.parentElement === document.body ? 'BODY' : (k.closest('header') ? 'HEADER' : 'OTHER'),
    kPos: getComputedStyle(k).position,
    kb, overHeader: overlap(kb, hb), overChrome: rows.some(r => overlap(kb, r)),
    langHit: hitOf(document.querySelector('#language'), 0.8),
    langMid: hitOf(document.querySelector('#language'), 0.5),
    motionHit: shown(document.querySelector('.motion-toggle')) ? hitOf(document.querySelector('.motion-toggle'), 0.5) : null,
    menuHit: shown(document.querySelector('.v4-nav-toggle')) ? hitOf(document.querySelector('.v4-nav-toggle'), 0.5) : null,
    brandHit: hitOf(document.querySelector('.brand'), 0.5),
    kHit: hitOf(k, 0.5),
    lang: document.documentElement.lang,
    brand: document.querySelector('.brand').textContent.trim(),
    languageLabel: document.querySelector('#language').textContent.trim(),
    motionLabel: document.querySelector('.motion-toggle').textContent.trim(),
    navOpen: document.querySelector('.nav').classList.contains('is-open')
  };
})()`;

function assertChrome(m, { mobile, closed, glass }) {
  const where = mobile ? `mobile ${m.vw} ${m.lang} scroll ${Math.round(m.sy)}` : `desktop ${m.lang}`;
  assert.ok(m.same < 8, where + ' controls are not on one row ' + JSON.stringify(m.rows));
  if (closed && mobile) assert.ok(m.headerH >= 44 && m.headerH <= 80, where + ' header height ' + m.headerH);
  if (!mobile) assert.ok(m.headerH >= 60 && m.headerH <= 120, where + ' header height ' + m.headerH);
  assert.ok(m.overflow <= 1, where + ' horizontal overflow ' + m.overflow);
  for (const row of m.rows) {
    assert.ok(row.x >= -1 && row.r <= m.vw + 1, where + ' control outside the viewport ' + JSON.stringify(row));
  }
  const ordered = [...m.rows].sort((a, b) => a.x - b.x);
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i - 1].r <= ordered[i].x + 0.5, where + ' controls overlap ' + JSON.stringify(ordered));
  }
  assert.equal(m.kParent, mobile ? 'BODY' : 'HEADER', where + ' search parent');
  assert.equal(m.kPos, mobile ? 'fixed' : 'static', where + ' search position');
  assert.equal(m.overChrome, false, where + ' search covers a header control ' + JSON.stringify({ kb: m.kb, rows: m.rows }));
  assert.equal(m.langHit.own, true, where + ' language hit ' + JSON.stringify(m.langHit));
  assert.equal(m.langMid.own, true, where + ' language center hit ' + JSON.stringify(m.langMid));
  assert.equal(m.brandHit.own, true, where + ' brand hit');
  assert.equal(m.kHit.own, true, where + ' search hit ' + JSON.stringify(m.kHit));
  if (m.motionHit) assert.equal(m.motionHit.own, true, where + ' motion hit ' + JSON.stringify(m.motionHit));
  if (m.menuHit) assert.equal(m.menuHit.own, true, where + ' menu hit ' + JSON.stringify(m.menuHit));
  if (glass) assert.match(m.filter, /blur/, where + ' glass header');
  if (mobile) {
    assert.equal(m.overHeader, false, where + ' search still inside the header box');
    assert.ok(m.kb.y + 1 >= m.headerBottom, where + ' search top ' + m.kb.y + ' header bottom ' + m.headerBottom);
    assert.ok(Math.abs(m.kb.r - (m.vw - 16)) < 2, where + ' search right ' + m.kb.r);
    assert.ok(Math.abs(m.kb.btm - (m.vh - 20)) < 2, where + ' search bottom ' + m.kb.btm);
    assert.ok(Math.abs(m.kb.w - 52) < 2 && Math.abs(m.kb.h - 52) < 2, where + ' search size');
  }
  for (const link of m.links) {
    assert.equal(link.own, true, where + ' nav hit ' + JSON.stringify(link));
    assert.equal(link.overK, false, where + ' search covers nav ' + link.t);
    assert.ok(link.btm <= m.vh + 1, where + ' nav link below the viewport ' + link.t);
  }
}

async function clickAt(page, x, y) {
  await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function ready(page, lang, mobile) {
  const brand = lang === 'zh' ? '绿石之地' : 'Pounamu Atlas';
  const menu = mobile
    ? 'document.querySelector(".v4-nav-toggle") && document.querySelector(".v4-nav-toggle").getBoundingClientRect().width > 2'
    : 'document.querySelector(".nav a")';
  await page.waitFor(`document.querySelector(".ui2-kbtn") && document.querySelector(".brand") && document.querySelector(".brand").textContent.includes(${JSON.stringify(brand)}) && ${menu}`);
  await page.ev('document.fonts.ready.then(() => true)');
}

async function home(page, lang) {
  await page.go('index.html?lang=' + lang);
  await ready(page, lang, true);
}

test('mobile header P1: one row, search button clear of the bar', { timeout: 180000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const metrics = [];
    for (const w of [320, 375, 390, 430]) {
      await page.view(w, 844, true);
      for (const lang of ['zh', 'en']) {
        await home(page, lang);
        const m = await page.ev(LAYOUT);
        assertChrome(m, { mobile: true, closed: true, glass: true });
        assert.equal(m.brand, lang === 'zh' ? '绿石之地' : 'Pounamu Atlas');
        assert.equal(m.languageLabel, lang === 'zh' ? 'EN ↗' : '中文 ↗');
        assert.equal(m.links.length, 0, 'closed menu should hide nav links');
        metrics.push({ w, lang, phase: 'closed', headerH: Math.round(m.headerH), same: Math.round(m.same), kY: Math.round(m.kb.y), kParent: m.kParent });

        await clickAt(page, m.menuHit.x, m.menuHit.y);
        await page.waitFor('document.querySelector(".nav.is-open")');
        const opened = await page.ev(LAYOUT);
        assert.ok(opened.links.length >= 3, lang + ' open nav links ' + opened.links.length);
        assertChrome(opened, { mobile: true, closed: false, glass: true });
        const closeHit = opened.menuHit;
        await clickAt(page, closeHit.x, closeHit.y);
        await page.waitFor('!document.querySelector(".nav.is-open")');
        assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: true });

        if (w === 390) {
          const before = await page.ev(LAYOUT);
          await clickAt(page, before.motionHit.x, before.motionHit.y);
          await page.waitFor(`document.querySelector(".motion-toggle").textContent.includes(${JSON.stringify(lang === 'zh' ? '动效关' : 'Motion off')})`);
          assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: true });
          const mid = await page.ev(LAYOUT);
          await clickAt(page, mid.motionHit.x, mid.motionHit.y);
          await page.waitFor(`document.querySelector(".motion-toggle").textContent.includes(${JSON.stringify(lang === 'zh' ? '动效开' : 'Motion on')})`);

          await clickAt(page, before.kHit.x, before.kHit.y);
          await page.waitFor('document.querySelector(".ui2-palette.on") && document.activeElement && document.activeElement.matches(".ui2-pal input")');
          await page.ev('document.querySelector(".ui2-pal input").dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", bubbles:true}))');
          await page.waitFor('document.querySelector(".ui2-palette") && !document.querySelector(".ui2-palette").classList.contains("on") && document.activeElement.classList.contains("ui2-kbtn")');
          assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: true });

          await page.ev('scrollTo(0, 700)');
          await page.waitFor('document.body.classList.contains("ui2-scrolled")');
          const scrolled = await page.ev(LAYOUT);
          assertChrome(scrolled, { mobile: true, closed: true, glass: true });
          assert.ok(scrolled.sy > 90, 'scrolled');
          metrics.push({ w, lang, phase: 'scrolled', headerH: Math.round(scrolled.headerH), kY: Math.round(scrolled.kb.y) });
          await page.ev('scrollTo(0, 0)');
          await page.waitFor('!document.body.classList.contains("ui2-scrolled")');

          const back = await page.ev(LAYOUT);
          await clickAt(page, back.langHit.x, back.langHit.y);
          const other = lang === 'zh' ? 'en' : 'zh';
          await page.waitFor(`document.documentElement.lang.toLowerCase().startsWith(${JSON.stringify(other)})`);
          const flipped = await page.ev(LAYOUT);
          assertChrome(flipped, { mobile: true, closed: true, glass: true });
          assert.equal(flipped.languageLabel, lang === 'zh' ? '中文 ↗' : 'EN ↗');
          await clickAt(page, flipped.langHit.x, flipped.langHit.y);
          await page.waitFor(`document.documentElement.lang.toLowerCase().startsWith(${JSON.stringify(lang === 'zh' ? 'zh' : 'en')})`);
          assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: true });
        }
      }
    }

    await page.view(1280, 900, false);
    for (const lang of ['zh', 'en']) {
      await page.go('index.html?lang=' + lang);
      await ready(page, lang, false);
      const m = await page.ev(LAYOUT);
      assertChrome(m, { mobile: false, closed: true, glass: true });
      assert.ok(m.links.length >= 3, 'desktop nav');
      assert.equal(m.languageLabel, lang === 'zh' ? 'EN ↗' : '中文 ↗');
      if (lang === 'en') {
        await clickAt(page, m.kHit.x, m.kHit.y);
        await page.waitFor('document.querySelector(".ui2-palette.on")');
        await page.ev('document.querySelector(".ui2-pal input").dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", bubbles:true}))');
        await page.waitFor('!document.querySelector(".ui2-palette.on")');
      }
    }

    await page.view(390, 844, true);
    await home(page, 'zh');
    assert.equal((await page.ev(LAYOUT)).kParent, 'BODY');
    await page.view(1280, 900, false);
    await page.waitFor('document.querySelector(".ui2-kbtn").parentElement.tagName === "HEADER"');
    const wide = await page.ev(LAYOUT);
    assertChrome(wide, { mobile: false, closed: true, glass: true });
    await page.view(390, 844, true);
    await page.waitFor('document.querySelector(".ui2-kbtn").parentElement === document.body');
    assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: true });

    for (const w of [390, 1280]) {
      await page.view(w, w === 1280 ? 900 : 844, w < 800);
      for (const lang of ['zh', 'en']) {
        await page.go('prepare.html?lang=' + lang);
        await page.waitFor('document.querySelector("#page-references") && document.querySelector(".ui2-kbtn")');
        await page.ev('document.fonts.ready');
        const prep = await page.ev(`(() => {
          const main = document.querySelector("main");
          const outside = [...main.querySelectorAll("a[href]")].map(a => a.href).filter(href => { try { return new URL(href).host !== location.host && !/nzta\\.govt\\.nz|interislander\\.co\\.nz|doc\\.govt\\.nz|metservice\\.com|intercity\\.co\\.nz|bluebridge\\.co\\.nz|fullers\\.co\\.nz|immigration\\.govt\\.nz|mountainsafety\\.org\\.nz|stats\\.govt\\.nz/.test(href); } catch { return false; } });
          return { text: main.innerText, outside, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()`);
        assert.deepEqual(prep.outside, [], lang + ' prepare outbound links');
        assert.match(prep.text, /111/);
        assert.match(prep.text, /Mountain Safety Council/);
        assert.match(prep.text, /NZTA/);
        assert.match(prep.text, /mountainsafety\.org\.nz/);
        assert.ok(prep.overflow <= 1, 'prepare overflow');
        const bar = await page.ev(LAYOUT);
        assertChrome(bar, { mobile: w < 800, closed: true, glass: false });
        if (w < 800) {
          await page.ev('scrollTo(0, 400)');
          await page.waitFor('document.body.classList.contains("ui2-scrolled")');
          const scrolled = await page.ev(LAYOUT);
          assertChrome(scrolled, { mobile: true, closed: true, glass: true });
        }
      }
    }

    await page.view(390, 844, true);
    await page.go('cities.html?lang=en');
    await page.waitFor('document.querySelector("main")');
    const citiesOn = await page.ev('document.querySelector("main").innerText');
    assert.match(citiesOn, /Tennis courts/);
    assert.doesNotMatch(citiesOn, /This section is being updated/);
    for (const [file, gone] of [['tracks.html', /全量目录|Every DOC walk|待核实/]]) {
      for (const lang of ['zh', 'en']) {
        await page.go(file + '?lang=' + lang);
        await page.waitFor('document.querySelector("main .pounamu-paused")');
        const hidden = await page.ev(`(() => {
          const main = document.querySelector("main");
          const intro = document.querySelector("main .page-intro:not(.pounamu-paused)");
          const paused = document.querySelector("main .pounamu-paused");
          return {
            text: main.innerText,
            introHidden: !intro || intro.hidden || intro.textContent.trim() === "",
            pick: !!(paused && paused.querySelector('a[href*="guide.html"][href*="view=pick"]'))
          };
        })()`);
        assert.equal(hidden.introHidden, true, file + lang);
        assert.equal(hidden.pick, true, file + lang);
        assert.match(hidden.text, lang === 'zh' ? /本栏目更新中/ : /This section is being updated/);
        assert.doesNotMatch(hidden.text, gone, file + lang);
        await page.waitFor('document.querySelector(".ui2-kbtn")');
        assertChrome(await page.ev(LAYOUT), { mobile: true, closed: true, glass: false });
      }
    }
    assert.deepEqual(page.errors, []);
    console.log('mobile-header metrics ' + JSON.stringify(metrics));
  } finally {
    await page.close();
  }
});

const KEPT_DRAFT = JSON.stringify({
  edited: true, title: 'HITKEEP', requestedDays: 3,
  days: [{ uid: 'a', placeId: 'si-zqn', label_zh: '皇后镇', label_en: 'Queenstown', from: '', to: '', via: '', parts: [], notes: '', ferry: false, source_url: '', est_date: '', nameVerify: false, km: '', rawTime: '' }],
  unscheduled: [], chosen: ['si-zqn'], island: 'all', regions: [], hideVerify: false, view: 'edit', minimum: 0, templateId: ''
});

// Fixed controls other than the search button: every hit point on each button or link must land on that control.
const FIXED_HITS = `(() => {
  const k = document.querySelector('.ui2-kbtn');
  const point = (el, ratio) => {
    const b = el.getBoundingClientRect();
    const x = b.left + b.width * ratio;
    const y = b.top + b.height * 0.5;
    const hit = document.elementFromPoint(x, y);
    return { ratio, x, y, own: !!(hit && (hit === el || el.contains(hit))), cls: hit ? String(hit.className || hit.id || hit.tagName).slice(0, 40) : '' };
  };
  const controls = [...document.querySelectorAll('button, a, input')].filter(el => {
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return false;
    if (k && (el === k || k.contains(el))) return false;
    let n = el;
    while (n && n !== document.body) {
      if (getComputedStyle(n).position === 'fixed') return true;
      n = n.parentElement;
    }
    return false;
  });
  return controls.map(el => {
    const b = el.getBoundingClientRect();
    const hits = [0.15, 0.5, 0.85].map(ratio => point(el, ratio));
    return { t: (el.innerText || el.id || '').trim().slice(0, 32), x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, hits, covered: hits.some(h => !h.own) };
  });
})()`;

test('phone toast Undo is not covered by the search button', { timeout: 120000 }, async t => {
  const page = await openBrowser();
  if (!page) { t.skip('Chrome is not installed here'); return; }
  try {
    const report = [];
    for (const w of [320, 390, 430]) {
      await page.view(w, 844, true);
      for (const lang of ['zh', 'en']) {
        await page.go('guide.html?lang=' + lang);
        await page.waitFor('document.querySelector(".ui2-kbtn")');
        await page.ev('localStorage.setItem("pounamu-v4-draft", ' + JSON.stringify(KEPT_DRAFT) + ')');
        await page.go('guide.html?template=SI-07A&lang=' + lang);
        await page.waitFor('document.querySelector("[data-do-replace]")');
        const modal = await page.ev(FIXED_HITS);
        assert.equal(modal.filter(c => c.covered).length, 0, w + ' ' + lang + ' modal covered ' + JSON.stringify(modal.filter(c => c.covered)));
        await page.click('[data-do-replace]');
        await page.waitFor('document.querySelector("#v4-toast [data-v4-undo]")');
        await page.ev('document.querySelector("#v4-toast [data-v4-undo]").scrollIntoView({block:"center"})');
        let hits = await page.ev(FIXED_HITS);
        for (let attempt = 0; attempt < 3; attempt++) {
          const probe = hits.find(c => c.t === (lang === 'zh' ? '撤销' : 'Undo'));
          if (probe && !probe.covered) break;
          await page.ev('document.querySelector("#v4-toast [data-v4-undo]").scrollIntoView({block:"center"})');
          hits = await page.ev(FIXED_HITS);
        }
        const undo = hits.find(c => c.t === (lang === 'zh' ? '撤销' : 'Undo'));
        assert.ok(undo, w + ' ' + lang + ' missing undo ' + JSON.stringify(hits.map(c => c.t)));
        assert.equal(undo.covered, false, w + ' ' + lang + ' undo covered ' + JSON.stringify(undo));
        const k = await page.ev(`(() => { const b = document.querySelector('.ui2-kbtn').getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right }; })()`);
        assert.ok(undo.r <= k.x - 8, w + ' ' + lang + ' undo still reaches the search button ' + JSON.stringify({ undo, k }));
        report.push({ w, lang, undo: { x: Math.round(undo.x), y: Math.round(undo.y), w: Math.round(undo.w), h: Math.round(undo.h) }, hits: undo.hits.map(h => ({ ratio: h.ratio, own: h.own, cls: h.cls })), kLeft: Math.round(k.x) });
        if (w === 390) {
          const mid = undo.hits.find(h => h.ratio === 0.5);
          await clickAt(page, mid.x, mid.y);
          await page.waitFor('document.querySelector("#v4-app h1") && document.querySelector("#v4-app h1").textContent.includes("HITKEEP")');
        }
      }
    }
    await page.view(390, 844, true);
    for (const file of ['index.html?lang=en', 'plan.html?lang=zh', 'prepare.html?lang=en']) {
      await page.go(file);
      await page.waitFor('document.querySelector(".ui2-kbtn")');
      const hits = await page.ev(FIXED_HITS);
      assert.equal(hits.filter(c => c.covered).length, 0, file + ' fixed control covered ' + JSON.stringify(hits.filter(c => c.covered)));
    }
    console.log('toast-undo hits ' + JSON.stringify(report));
  } finally {
    await page.close();
  }
});
