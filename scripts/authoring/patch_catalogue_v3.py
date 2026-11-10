#!/usr/bin/env python3
"""One-off, idempotent corrections to outputs/route-catalogue.json for v3 (review items 1.6–1.9, 6.1, 9.1–9.4)."""
import json, os, re
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = f'{root}/outputs/route-catalogue.json'; R = json.load(open(p)); by = {r['id']: r for r in R}
D = 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/'
# 1.7 dead DOC PDFs -> the DOC route pages
by['hooker']['sources'] = [{'label': 'DOC — Hooker Valley Track', 'url': D + 'canterbury/places/aoraki-mount-cook-national-park/things-to-do/tracks/hooker-valley-track/'}]
by['hooker']['url'] = by['hooker']['sources'][0]['url']
by['ni-taranaki-falls']['sources'] = [s for s in by['ni-taranaki-falls']['sources'] if not s['url'].endswith('.pdf')]
# 1.9 dated Metlink PDFs -> line pages
for s in by['ni-kapitirail']['sources']:
    if 'KPL-Kapiti-Line' in s['url']: s.update(label='Metlink — Kāpiti Line (KPL)', url='https://www.metlink.org.nz/service/KPL')
    if '280-281-290' in s['url']: s.update(label='Metlink — Route 280', url='https://www.metlink.org.nz/service/280')
by['ni-kapitirail']['url'] = 'https://www.metlink.org.nz/service/KPL'
# cycle routes: the NZ Cycle Trail page is the primary source for distance, time and grade
N = 'https://www.nzcycletrail.com/find-your-ride/23-great-rides/'
for i, slug, label in [('otago', 'otago-central-rail-trail', 'Otago Central Rail Trail'), ('queenstowncycle', 'queenstown-trail', 'Queenstown Trail')]:
    if not any(s['url'] == N + slug for s in by[i]['sources']): by[i]['sources'].insert(0, {'label': 'Ngā Haerenga NZ Cycle Trails — ' + label, 'url': N + slug})
# SH94: the DOC Milford Road page replaces nothing, it is added as the first source
m = D + 'fiordland/places/fiordland-national-park/things-to-do/scenic-driving/milford-road/'
if not any(s['url'] == m for s in by['milford']['sources']): by['milford']['sources'].insert(0, {'label': 'DOC — Milford Road', 'url': m})
# 6.1 / 9.2 timeline minute marks existed in Chinese only and have no source: label both languages as estimates
EST = {'ni-rangitoto': [15, 60, 80, 120], 'ni-escarpment': [30, 90, 135, 240]}
for i, mins in EST.items():
    for step, mn in zip(by[i]['timeline'][1:], mins):
        h = f'{mn // 60} hr' + (f' {mn % 60} min' if mn % 60 else '') if mn >= 60 else f'{mn} min'
        zh = (f'{mn // 60} 小时' + (f' {mn % 60} 分钟' if mn % 60 else '')) if mn >= 60 else f'{mn} 分钟'
        step['at'] = [f'About {h} in (editorial estimate)', f'出发后约 {zh}（编辑估算）']
by['ni-thermalexplorer']['timeline'][4]['title'][1] = by['ni-thermalexplorer']['timeline'][4]['title'][1].replace('沿 SH5 南下', '南下')
for t in by['queenstowncycle']['tips']:
    if t['title'][1] == '穿越 SH6': t['title'][1] = '穿越公路'
# 9.4 Chinese pacing notes that were empty
PZ = {'ni-manaia': '这不是登山的目标配速。', 'ni-hauraki': '时刻是含休息的编辑建议日程，不是接驳车的发车时间。', 'ni-k2k': '行程是含湖湾停留的半日建议。',
      'ni-remutaka': '时刻是含隧道和历史点停留的编辑建议，不是公共交通的发车时间。', 'ni-twincoast': '只覆盖西段。', 'ni-forgottenworld': '按 Taumarunui 往 Stratford 方向走的全天自驾建议。',
      'ni-martinborough': '编辑建议的全天行程。', 'alps2ocean': '风、行李和骑行速度都会改变到达时间。', 'dunstan': '时刻描述的是编辑建议的全天节奏，不是固定的骑速或接驳车时刻。'}
for i in ['tongariro-crossing', 'abel-tasman', 'roys-peak', 'routeburn-track', 'milford-track']: PZ[i] = '出发前查看 DOC 公告、交通和天气。'
for i, z in PZ.items():
    if not by[i]['pacing'][1]: by[i]['pacing'][1] = z
# 1.6 / 9.1 every source gets a role and a Chinese label
PRIMARY = ['doc.govt.nz', 'nzcycletrail.com', 'nzta.govt.nz', 'newzealand.com', 'teararoa.org.nz', 'greatjourneysnz.com', 'intercity.co.nz', 'metlink.org.nz', 'at.govt.nz', 'ccc.govt.nz', 'kiwirail.co.nz', 'interislander.co.nz', 'bluebridge.co.nz', 'metroinfo.co.nz', 'orc.govt.nz', 'aucklandcouncil.govt.nz', 'fullers.co.nz']
ZH = [('Department of Conservation', '新西兰保护部（DOC）'), ('DOC', 'DOC（新西兰保护部）'), ('NZ Cycle Trail', '新西兰骑行道 Ngā Haerenga'), ('Ngā Haerenga', '新西兰骑行道 Ngā Haerenga'), ('NZ Transport Agency', '新西兰交通局（NZTA）'), ('NZTA', '新西兰交通局（NZTA）'), ('Waka Kotahi', '新西兰交通局（NZTA）'),
      ('InterCity', 'InterCity 长途巴士'), ('Great Journeys', 'Great Journeys 观光列车'), ('Metlink', 'Metlink 惠灵顿公交'), ('Auckland Transport', '奥克兰交通局（AT）'), ('Te Araroa', 'Te Araroa 步道信托'), ('Tourism New Zealand', '新西兰旅游局'), ('100% Pure', '新西兰旅游局'), ('newzealand.com', '新西兰旅游局'), ('Christchurch City Council', '基督城市议会')]
for r in R:
    for s in r['sources']:
        host = re.sub(r'^https?://(www\.)?', '', s['url']).split('/')[0]
        s['role'] = 'supplementary' if 'official-information' in s['url'] or '/oia' in s['url'].lower() or host.startswith('ourauckland') else ('primary' if any(host.endswith(d) for d in PRIMARY) else 'highlights')
        if 'labelZh' not in s:
            hit = next((z for k, z in ZH if k.lower() in s['label'].lower()), None)
            tail = s['label'].split(' — ', 1)[1] if ' — ' in s['label'] else ''
            s['labelZh'] = (hit + ('：' + tail if tail else '')) if hit else s['label']
json.dump(R, open(p, 'w'), ensure_ascii=False, indent=1); open(p, 'a').write('\n')
from collections import Counter
print(Counter(s['role'] for r in R for s in r['sources']))
print([ (r['id'], s['label']) for r in R for s in r['sources'] if s['role'] == 'supplementary'])
