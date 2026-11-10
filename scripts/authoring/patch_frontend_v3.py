#!/usr/bin/env python3
"""One-off, idempotent edits to docs/app.js and the HTML pages for v3 (asserts every anchor it relies on)."""
import os, re, glob
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = f'{root}/docs/app.js'; s = open(p, encoding='utf8').read()
def sub(old, new, count=1):
    global s
    if new in s and old not in s: return            # already applied
    assert old in s, 'anchor missing: ' + old[:70]
    s = s.replace(old, new, count)
# route count comes from the data, never from a typed number (review 1.8)
sub("const t=key=>messages[lang][key]||messages.en[key]||key;", "const t=key=>String(messages[lang][key]||messages.en[key]||key).replace(/\\{routes\\}/g,routes.length);")
lines = s.split('\n')
for n, l in enumerate(lines):
    if l.startswith('Object.assign(messages') or l.startswith('  en:{') or l.startswith('  zh:{'):
        l = re.sub(r'\b48(?= (ROUTES|routes|条|份))', '{routes}', l); l = re.sub(r'Forty-eight', '{routes}', l); l = re.sub(r'\b24(?= 份线路手记)', '{routes}', l)
        lines[n] = l
s = '\n'.join(lines)
# route page: every tracked fact is shown, with a "to verify" mark or its source and check date (review 1.1)
sub("${facts.filter(([,value])=>value).map(([label,value,key])=>`<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}", "${facts.map(f=>v3FactCell(r,...f)).join('')}")
sub("<dt>${t('season')}</dt><dd>${escapeHtml(pick(r.season))}</dd><dt>${t('gettingThere')}</dt><dd>${escapeHtml(pick(r.access))}</dd>", "${v3SideFact(r,'season')}${v3SideFact(r,'booking')}${v3SideFact(r,'access')}")
sub('<section class="journey-section" id="journey-sources">', '${v3SafetyPanel(r)}${v3VerifyPanel(r)}${v3SportsPanel(r)}<section class="journey-section" id="journey-sources">')
sub("function sourceLinks(r){return r.sources.map(s=>`<a href=\"${escapeHtml(s.url)}\" target=\"_blank\" rel=\"noopener noreferrer\"><span>${escapeHtml(s.label)}</span><span>↗</span></a>`).join('')}", "function sourceLinks(r){return v3SourceLinks(r)}")
sub("renderRouteMap(r);window.enhanceJourneyMap?.(r);", "renderRouteMap(r);v3RouteMapFallback(r);window.enhanceJourneyMap?.(r);v3AfterJourney(r);")
sub('<div class="route-readmore"><span>${t(\'readGuide\')}</span>', '${v3CardBadge(r)}<div class="route-readmore"><span>${t(\'readGuide\')}</span>')
sub("Object.values(photoLibrary).map(p=>", "Object.values(photoLibrary).filter(p=>!p.placeholder).map(p=>")
sub("window.renderP10Planner?.();if($('#plannerStatus')", "window.renderP10Planner?.();window.v3Render?.();if($('#plannerStatus')")
sub("const qs=new URLSearchParams(location.search),page=document.body.dataset.page;", "Object.assign(messages.en,window.V3_MESSAGES?.en);Object.assign(messages.zh,window.V3_MESSAGES?.zh);\nconst qs=new URLSearchParams(location.search),page=document.body.dataset.page;")
open(p, 'w', encoding='utf8').write(s)
# pages: load v3 assets, add the two new sections to the navigation, drop typed route counts from meta descriptions
for f in glob.glob(f'{root}/docs/*.html'):
    h = open(f, encoding='utf8').read()
    if 'v3.js' not in h:
        h = re.sub(r'(<script src="app\.js[^"]*"></script>)', r'<script src="v3.js"></script>\1', h)
        h = re.sub(r'(<link rel="stylesheet" href="styles\.css[^"]*">)', r'\1<link rel="stylesheet" href="v3.css">', h)
        h = h.replace('<a data-page="prepare" data-i18n="navPrepare" href="prepare.html">', '<a data-page="tracks" data-i18n="navTracks" href="tracks.html">DOC tracks</a><a data-page="cities" data-i18n="navCities" href="cities.html">Sports</a><a data-page="prepare" data-i18n="navPrepare" href="prepare.html">', 1)
    h = re.sub(r'content="53 detailed walking, cycling, driving and public transport guides across New Zealand\."', 'content="Walking, cycling, driving and public transport guides across New Zealand, with field-level sources."', h)
    open(f, 'w', encoding='utf8').write(h)
print('patched')
