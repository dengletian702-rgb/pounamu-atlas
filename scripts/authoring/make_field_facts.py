#!/usr/bin/env python3
"""Authoring helper: writes data/field-facts.json.
Walk time/distance/grade are read from the DOC page overview block saved in data/evidence/.
Everything else is typed here by the editor together with the official sentence it rests on.
scripts/apply-facts.mjs refuses any entry whose quote is not found in the saved evidence."""
import json, re, os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
targets = json.load(open(f'{root}/data/evidence-targets.json'))
ev = lambda i: json.load(open(f'{root}/data/evidence/{i}.json'))
GRADES = {'Easy short walk': '简易短途步道', 'Short walk': '短途步道', 'Wheelchair accessible short walk': '无障碍短途步道',
          'Easy to intermediate walking track': '简易至中级步道', 'Walking track': '步道', 'Intermediate tramping track': '中级徒步道',
          'Advanced tramping track': '高级徒步道', 'Expert route': '专家级路线', 'Easiest': '最简易'}
def zh_dist(s):
    m = re.match(r'([\d.,]+)\s?(km|m)\b\s*(.*)', s); n, u, rest = m.group(1), m.group(2), m.group(3).lower()
    unit = '公里' if u == 'km' else '米'
    if 'one way, return' in rest: return f'单程 {n} {unit}，原路返回'
    if 'return' in rest: return f'往返 {n} {unit}'
    if 'loop' in rest: return f'环线 {n} {unit}'
    if 'one way' in rest: return f'单程 {n} {unit}'
    return f'{n} {unit}'
def en_dist(s):
    s = re.sub(r'\s+via same track', '', s); s = s.replace(', return', ', return the same way'); return re.sub(r'\s+total', '', s)
def zh_time(s):
    z = s.replace('-', '–').replace(' to ', '–')
    z = re.sub(r'\s*hr\b', ' 小时', z); z = re.sub(r'\s*min\b', ' 分钟', z); z = re.sub(r'\s*days?\b', ' 天', z); z = re.sub(r'\s*nights?\b', ' 晚', z)
    pre = ''
    if 'return' in z: pre = '往返 '; z = z.replace('return', '')
    elif 'one way' in z: pre = '单程 '; z = z.replace('one way', '')
    elif 'loop' in z: pre = '环线 '; z = z.replace('loop', '')
    return (pre + z).replace('  ', ' ').strip()
facts = {}
def put(i, field, en, zh, quote, url=None, note=None):
    d = {'en': en, 'zh': zh, 'quote': quote if isinstance(quote, list) else [quote], 'url': url or targets[i][0]}
    if note: d['note'] = note
    facts.setdefault(i, {})[field] = d
# ---- DOC walks: overview block ----
for i in targets:
    rec = ev(i)[0]; ov = rec.get('overview')
    if not ov or i in ('milford', 'arthurs', 'aorakidrive'): continue
    dist = next((l for l in ov if re.match(r'^\d[\d.,]*\s?\.?\s?\d*\s?(km|m)\b', l) and len(l) < 60), None)
    time = next((l for l in ov if re.search(r'\b(hr|min|days?)\b', l) and 'km' not in l and len(l) < 70 and not l.startswith('Book')), None)
    grades = [l for l in ov if l in GRADES]
    if dist:
        clean = dist.replace('17. 6', '17.6'); put(i, 'distance', en_dist(clean), zh_dist(clean), dist)
    if time: put(i, 'time', time.replace('-', '–').replace(' to ', '–'), zh_time(time), time)
    if grades: put(i, 'level', '; '.join(grades), '；'.join(GRADES[g] for g in grades) + '（DOC 分级）', grades)
# ---- hand corrections to the automatic walk values ----
F = facts
F['avalanche-peak']['distance'].update(en='2.5 km one way, 1,100 m vertical climb', zh='单程 2.5 公里，垂直爬升 1,100 米')
F['avalanche-peak']['time'].update(en='3–4 hr to the summit (several route options)', zh='登顶 3–4 小时（有多种走法）')
F['tongariro-crossing']['time'].update(en='Nov–Apr: 7–8 hr; May–Oct: 9 hr', zh='11–4 月 7–8 小时；5–10 月约 9 小时')
F['tongariro-crossing']['level'].update(en='Intermediate tramping track (late Oct–30 Apr); Expert route (May–Oct winter season)', zh='中级徒步道（10 月下旬至 4 月 30 日）；专家级路线（5–10 月冬季）（DOC 分级）',
    quote=['Intermediate tramping track', 'Expert route', 'Parking restrictions (4 hr maximum) are in place at the road-ends – we suggest you book a shuttle. Intermediate track category.', 'Expert route category.'])
F['ben-lomond']['time'].update(en='6–8 hr return to Ben Lomond summit from Queenstown', zh='从皇后镇往返本洛蒙德山顶 6–8 小时')
F['isthmus-peak']['time'].update(en='5–7 hr return from the Isthmus Peak Track car park', zh='从步道停车场往返 5–7 小时')
F['isthmus-peak']['level'].update(en='Advanced tramping track', zh='高级徒步道（DOC 分级）', quote=['Advanced tramping track'])
F['te-paki-coastal']['time'].update(en='4–5 days', zh='4–5 天')
F['tama-lakes']['time'].update(en='5–6 hr return to Lower Tama Lake', zh='往返下塔马湖 5–6 小时')
F['hump-ridge-track']['time'].update(en='3 days / 2 nights', zh='3 天 2 晚')
F['lake-waikaremoana']['time'].update(en='3–4 days', zh='3–4 天')
F['heaphy-track']['time'].update(en='4–6 days on foot', zh='步行 4–6 天')
F['queen-charlotte-track']['level'].update(en='Intermediate tramping track', zh='中级徒步道（DOC 分级）', quote=['Intermediate tramping track'])
for i in ('routeburn-track', 'milford-track', 'kepler-track'):
    F[i]['level'].update(en='Intermediate tramping track; Advanced tramping track (DOC lists both categories)', zh='中级徒步道；高级徒步道（DOC 页面同时列出两个等级）')
F['tongariro-northern-circuit']['level'].update(en='Intermediate tramping track in the Great Walks season; DOC also lists Advanced tramping track and Expert route', zh='大步道季为中级徒步道；DOC 页面另列高级徒步道和专家级路线',
    quote=['Intermediate tramping track', 'Advanced tramping track', 'Expert route', 'Bookings are required for huts and campsites. Intermediate track category.'])
F['keysummit']['time'].update(en='3 hr return', zh='往返 3 小时', note='DOC overview prints "3 hr" beside "3.4 km one way, return via same track".')
# ---- season / booking / access / safety: typed with the supporting sentence ----
NB = lambda i, name: put(i, 'booking', 'No booking is required for the walk.', '步道本身无需预订。', f'Bookings are not required for {name}.')
NB('ni-rangitoto', 'Rangitoto Summit Walk'); NB('matheson', 'Lake Matheson/Te Ara Kairaumati Walk'); NB('punchbowl', 'Devils Punchbowl Walking Track')
NB('tasman-glacier-view', 'Tasman Glacier View Track'); NB('hokitika-gorge', 'Hokitika Gorge Track'); NB('cathedral-cove', 'Mautohe Cathedral Cove Track')
put('ni-huka', 'safety', 'Parts of the track run beside a cliff edge: stay on the formed track and supervise children.', '部分路段紧邻崖边：请走在成形步道上，并看护好儿童。', 'Sections of the walking track run adjacent to a cliff edge. Stay on the formed track and away from the edge. Children should be supervised at all times.')
put('hooker', 'access', 'Start from White Horse Hill car park; DOC charges for parking there.', '从 White Horse Hill 停车场出发；DOC 在此收取停车费。', 'DOC charges fees for car parking at White Horse Hill.')
put('tongariro-crossing', 'booking', 'Booking is recommended for everyone and required if you use a shuttle or a guided walk.', '建议所有人预订；乘接驳车或参加向导团必须预订步道。', 'Bookings are recommended for all visitors using any part of the Tongariro Alpine Crossing track. A track booking is needed to use a shuttle or guided walk service.')
put('tongariro-crossing', 'season', 'Main season: Labour weekend (late October) to 30 April. May–October is the winter season, when the track is an expert route.', '主要季节：劳动节周末（10 月下旬）至 4 月 30 日。5–10 月为冬季，届时属专家级路线。', ['Labour weekend (late October) - 30 April', 'May - October (winter season)'])
put('tongariro-crossing', 'access', 'Road-end parking is limited to 4 hours; DOC suggests booking a shuttle.', '路口停车限 4 小时；DOC 建议预订接驳车。', 'Parking restrictions (4 hr maximum) are in place at the road-ends – we suggest you book a shuttle.')
put('tongariro-crossing', 'safety', 'In winter (May–October) expect snow and ice, avalanche risk and sub-zero temperatures; alpine skills are essential.', '冬季（5–10 月）有冰雪、雪崩风险和零下低温，必须具备高山技能。', ['Additional hazards are present including snow and ice, avalanche risk, and sub-zero temperatures.', "From May to October, alpine skills are essential for this track"])
put('abel-tasman', 'booking', 'The 4 huts and 18 campsites must be booked in advance all year round.', '沿途 4 间小屋和 18 处营地全年都须提前预订。', 'There are 4 huts and 18 campsites along the Abel Tasman Coast Track, which must be booked in advance all year round.')
put('abel-tasman', 'access', 'Water taxis run all year and must be booked in advance.', '水上出租车全年运营，须提前预订。', 'Water taxis operate year round and must be booked in advance.')
put('roys-peak', 'season', 'Closed for lambing from 1 October to 10 November every year; reopens 11 November.', '每年 10 月 1 日至 11 月 10 日因产羔封闭，11 月 11 日重新开放。', 'The track is closed for lambing from 1 October to 10 November each year. It reopens on 11 November.')
put('roys-peak', 'safety', 'Snow and ice in winter; the upper track is alpine, with avalanche terrain above 1,000 m.', '冬季有冰雪；上段属高山环境，海拔 1,000 米以上有雪崩地形。', ['Snow and ice are present during winter.', 'Roys Peak Track has challenging avalanche terrain above 1, 000 metres.'])
put('routeburn-track', 'season', 'Great Walks season: 1 November 2026 – 30 April 2027. Outside it (1 May – 31 October) only for people with alpine skills, equipment and experience.', '大步道季：2026 年 11 月 1 日至 2027 年 4 月 30 日。季外（5 月 1 日至 10 月 31 日）仅适合具备高山技能、装备和经验的人。', ['In the Great Walks season (1 November 2026 – 30 April 2027)', 'Walking the track outside the Great Walks season should only be attempted if you have alpine skills, equipment and experience.'])
put('routeburn-track', 'booking', 'Three huts and two campsites; all must be booked well in advance in the Great Walks season.', '沿途 3 间小屋、2 处营地，大步道季须尽早预订。', 'There are three huts and two campsites, which must be booked well in advance during the Great Walks season.')
put('routeburn-track', 'safety', 'Snow and ice can make the trip hazardous early and late in the season.', '季初和季末，冰雪可能使行程变得危险。', 'Snow and ice can sometimes make this trip hazardous early and late into the Great Walks season.')
put('milford-track', 'season', 'Great Walks season: 1 November 2026 – 30 April 2027 (last departure 28 April 2027).', '大步道季：2026 年 11 月 1 日至 2027 年 4 月 30 日（最后出发日 2027 年 4 月 28 日）。', 'In the Great Walks season (1 November 2026 – 30 April 2027 last departure 28 April 2027)')
put('milford-track', 'booking', 'Three huts, booked well in advance in the Great Walks season. Camping is not permitted.', '沿途 3 间小屋，大步道季须尽早预订。全程禁止露营。', 'There are three huts on the Milford Track, which must be booked well in advance during the Great Walks season. Camping is not permitted on the Milford Track.')
put('milford-track', 'access', 'Transport must be booked in advance; there is no vehicle or private access to either end.', '交通须提前预订；步道两端都没有车辆或私人通行方式。', 'Transport must be booked in advance. There is no vehicle or private access to the start/end of the track.')
put('milford-track', 'safety', 'Avalanche risk can extend into December.', '雪崩风险可能持续到 12 月。', 'The risk of avalanche can extend into December.')
put('kepler-track', 'season', 'Great Walks season: 27 October 2026 – 30 April 2027.', '大步道季：2026 年 10 月 27 日至 2027 年 4 月 30 日。', 'In the Great Walks season (27 October 2026 – 30 April 2027)')
put('kepler-track', 'booking', 'Three huts and two campsites; bookings are required.', '沿途 3 间小屋、2 处营地，须预订。', ['There are three huts and two campsites along the Kepler Track, which must be booked well in advance during the Great Walks season.', 'Bookings are required for huts and campsites.'])
put('heaphy-track', 'booking', 'Six huts and nine campsites, booked well in advance all year round.', '沿途 6 间小屋、9 处营地，全年都须尽早预订。', 'There are 6 huts and 9 campsites, which must be booked well in advance all year round.')
put('heaphy-track', 'season', 'Walkable all year with bookings; mountain bikes share the track from 1 May to 30 November.', '凭预订全年可走；5 月 1 日至 11 月 30 日与山地车共用步道。', ['All huts and campsites on the Heaphy Track must be booked in advance all year round.', 'Mountain bikes are allowed between 1 May and 30 November.'])
put('paparoa-track', 'booking', 'All three huts must be booked in advance; there are no campsites on the track.', '3 间小屋都须提前预订；步道上没有营地。', ['All three huts must be booked in advance.', 'There are no campsites on the track.'])
put('rakiura-track', 'booking', 'All huts and campsites must be booked in advance all year round.', '所有小屋和营地全年都须提前预订。', 'All huts and campsites on the Rakiura Track must be booked in advance all year round.')
put('rakiura-track', 'access', 'From Oban you can walk to the start, take a shuttle to Lee Bay, or use a water taxi to the huts.', '可从奥本步行到起点，也可乘接驳车到 Lee Bay，或乘水上出租车到小屋。', 'If you prefer not to walk from Oban, shuttles can be used for drop-offs at Lee Bay or water taxis can be used for access to Rakiura Track huts.')
put('hump-ridge-track', 'booking', 'Bookings are made through the Hump Ridge Trust, not the DOC booking system.', '通过 Hump Ridge Trust 网站预订，不走 DOC 预订系统。', 'Hump Ridge Track bookings are made through Hump Ridge Trust website')
put('queen-charlotte-track', 'booking', 'DOC campsites on the track must be booked at all times of year.', '步道上的 DOC 营地全年都须预订。', 'Queen Charlotte Track campsites need to be booked at all times of the year.')
put('queen-charlotte-track', 'access', 'There is no road to Meretoto / Ship Cove: arrange boat transport to start there.', 'Meretoto / Ship Cove 不通公路，须安排船只前往起点。', 'There is no road to Meretoto/Ship Cove so you will need to arrange boat transport to start your walk there.')
put('queen-charlotte-track', 'season', 'The track may close during extreme drought and high fire risk.', '极端干旱、火险高时步道可能关闭。', 'During periods of extreme drought and high fire risk, the track may be closed.')
put('mueller-hut', 'booking', 'Mueller Hut must be booked.', 'Mueller Hut 须预订。', 'Bookings are required for Mueller Hut.')
put('mueller-hut', 'safety', 'Snow and ice are possible from March to November; winter needs mountaineering experience. Register your intentions at the visitor centre.', '3–11 月可能有冰雪；冬季需要登山经验。出发当天须在游客中心登记行程。', ['There can be snow and ice from March to November.', 'Register your intentions at the Aoraki/Mount Cook National Park Visitor Centre on the day you start.'])
put('mueller-hut', 'access', 'Starts near White Horse Hill car park; DOC charges for parking ($2.50 per half hour or $25 a day).', '起点在 White Horse Hill 停车场附近；DOC 收取停车费（每半小时 2.5 纽币或每天 25 纽币）。', ['DOC charges fees for car parking at White Horse Hill.', 'The fees are $2.50 per half hour or $25 a day.'])
put('lake-marian', 'safety', 'Do not walk around the lake edge in the snow and avalanche season (winter and spring).', '冰雪和雪崩季节（冬春）不要沿湖边行走。', 'Do not walk around the lake edge during the snow/avalanche season (winter and spring).')
put('pancake-rocks', 'access', 'DOC charges for car parking at Punakaiki Pancake Rocks.', 'DOC 在普纳凯基千层岩收取停车费。', 'DOC charges fees for car parking at Punakaiki Pancake Rocks.')
put('ben-lomond', 'safety', 'In winter you must carry and know how to use alpine equipment (avalanche gear, ice axe, crampons).', '冬季须携带并会使用高山装备（雪崩装备、冰镐、冰爪）。', 'In winter you will need to carry and be able to use alpine equipment such as avalanche equipment, ice axe and crampons.')
put('isthmus-peak', 'season', 'Closed for fawning every year from 20 November to 20 December.', '每年 11 月 20 日至 12 月 20 日因产鹿季封闭。', 'Track annually closed for fawning between 20 November and 20 December.')
put('isthmus-peak', 'safety', 'March to May: safari hunting on Glen Dene Station; stay alert and visible.', '3–5 月 Glen Dene 牧场有狩猎活动，请保持警觉并穿着醒目。', 'Safari hunting takes place on Glen Dene Station. Be alert and stay visible, especially during the March to May roar hunting season.')
put('avalanche-peak', 'season', 'DOC gives summer and autumn as the best season.', 'DOC 标注的最佳季节为夏季和秋季。', 'Best season: Summer, autumn')
put('waikoropupu-springs', 'safety', 'Boardwalks and viewing platforms over the springs are unfenced; supervise children.', '泉水上方的木栈道和观景台没有护栏，请看护好儿童。', 'There are unfenced boardwalks and viewing platforms over the springs. Supervise children carefully.')
put('tongariro-northern-circuit', 'season', 'Great Walks season: 23 October 2026 – 30 April 2027. One section is closed after the 2025 Tongariro fire and will not be available this season.', '大步道季：2026 年 10 月 23 日至 2027 年 4 月 30 日。一段步道因 2025 年汤加里罗山火关闭，本季不开放。', ['In the Great Walks season (23 October 2026 – 30 April 2027)', 'This section of track is closed due to the 2025 Tongariro fire and will not be available for the 2026/27 Great Walk season.'])
put('tongariro-northern-circuit', 'booking', 'Huts and campsites must be booked year-round.', '小屋和营地全年都须预订。', 'Bookings are required for huts and campsites year-round.')
put('tongariro-northern-circuit', 'safety', 'Outside the season (May to late October) go only with alpine skills, equipment and experience.', '季外（5 月至 10 月下旬）仅适合具备高山技能、装备和经验的人。', 'Walking the track outside the Great Walks season should only be attempted if you have alpine skills, equipment and experience.')
put('lake-waikaremoana', 'booking', 'Four huts and five campsites; all must be booked in advance.', '4 间小屋、5 处营地，都须提前预订。', 'There are four huts and five campsites on Lake Waikaremoana. These must be booked in advance.')
put('pouakai-crossing', 'access', 'A one-way track: arrange transport at one end. Shuttles are booked directly with operators.', '单向步道，须安排一端的交通；接驳车直接向运营方预订。', 'This is a one-way track so you need to arrange transport to and from one end. Shuttle services are available – book directly with an operator.')
put('pouakai-crossing', 'safety', 'Sections can become impassable in winter because of snow and ice.', '冬季部分路段可能因冰雪无法通行。', 'Sections of this track can become impassable in winter conditions due to snow and ice.')
put('cathedral-cove', 'safety', 'Do not visit during or immediately after heavy rain: landslide risk is high.', '大雨期间和刚下过大雨后不要前往：滑坡风险高。', ['during or immediately after heavy rain', 'andslide risk is'])
put('tane-mahuta', 'season', 'Open 9 am to 4 pm daily.', '每天上午 9 点至下午 4 点开放。', 'It is open 9 am to 4 pm daily.')
put('tama-lakes', 'safety', 'The side trip to the Upper Tama Lake lookout needs winter alpine skills and equipment when there is snow and ice.', '有冰雪时，去上塔马湖观景点的支线需要冬季高山技能和装备。', 'Winter alpine skills and equipment needed for the side trip to the Upper Tama Lake lookout when snow and ice are present.')
put('te-paki-coastal', 'safety', 'Beaches along the track are dangerous for swimming (rough seas, strong currents); rescue is over an hour away.', '沿途海滩不宜游泳（浪大、流急）；救援站点在一小时以外。', ['Be aware that the beaches along the track and at campsites are challenging place for swimming and can be dangerous.', 'The nearest surf lifesaving and coastguard stations are over an hour away'])
# ---- non-DOC walks ----
put('ni-escarpment', 'distance', '9.5 km one way', '单程 9.5 公里', 'Paekakariki Escarpment Track - 9.5km')
put('ni-escarpment', 'time', '3–4 hours', '3–4 小时', '3 to 4 hours')
# ---- cycle trails (Ngā Haerenga NZ Cycle Trails pages) ----
def cyc(i, km, kmzh, hrs, hrszh, grade, gradezh, quote):
    put(i, 'distance', km, kmzh, quote); put(i, 'time', hrs, hrszh, quote); put(i, 'level', grade, gradezh, quote)
cyc('ni-hauraki', '34 km one way (includes the Thames–Kōpū spur)', '单程 34 公里（含 Thames–Kōpū 支线）', '3–4 hours', '3–4 小时', 'Grade 1 / easiest', '1 级：最简易（NZCT 分级）', ['34km, Grade 1/easiest, 3–4 hours', 'the total distance given above (34km) includes the spur section between Thames and Kopu'])
cyc('ni-k2k', '19.5 km one way', '单程 19.5 公里', '2.5–3.5 hours', '2.5–3.5 小时', 'Grade 3 / intermediate', '3 级：中级（NZCT 分级）', '19.5km, Grade 3/intermediate, 2.5–3.5 hours')
cyc('ni-timber', '85 km one way (40 km + 45 km over two days)', '单程 85 公里（两天分别 40、45 公里）', '8–14 hours of riding over two days', '两天共骑行 8–14 小时', 'Grade 3 / intermediate', '3 级：中级（NZCT 分级）', ['85km, intermediate, 8–14 hours', '40km, Grade 3 intermediate, 4–7 hours', '45km, Grade 3 intermediate, 4–7 hours'])
cyc('ni-remutaka', '25 km one way', '单程 25 公里', '3–4 hours', '3–4 小时', 'Grade 2–3 / easy–intermediate', '2–3 级：简易至中级（NZCT 分级）', '25km, Grade 2–3/easy–intermediate, 3–4 hours')
put('ni-remutaka', 'safety', 'Grade 3 hazards between Siberia Bridge and Western Lake Road: steep, narrow, two-way, loose gravel and drop-offs.', 'Siberia Bridge 至 Western Lake Road 一段为 3 级：坡陡、路窄、双向通行，有松散碎石和陡坎。', 'The trail is grade 3 between Siberia Bridge and Western Lake Rd – hazards include steep grade, narrow, two-way, loose gravel, drop-offs.')
cyc('ni-twincoast', '42 km one way', '单程 42 公里', '3–5 hours', '3–5 小时', 'Easy to intermediate', '简易至中级（NZCT）', '42km, easy-intermediate, 3-5 hours')
cyc('ni-motu-dunes', '20 km return', '往返 20 公里', '1.5–3 hours', '1.5–3 小时', 'Grade 2 / easy', '2 级：简易（NZCT 分级）', '20km return, Grade 2/easy, 1.5–3 hours')
put('otago', 'distance', '152 km one way', '单程 152 公里', '152km'); put('otago', 'time', '1–5 days', '1–5 天', '/ 1–5 days')
put('otago', 'level', 'Grade 1 / easiest', '1 级：最简易（NZCT 分级）', '25km, Grade 1/easiest, 2–2.5 hours')
cyc('wilderness', '31 km one way', '单程 31 公里', '2–4 hours', '2–4 小时', 'Grade 2 / easy', '2 级：简易（NZCT 分级）', '31km, Grade 2/easy, 2–4 hours')
cyc('greattaste', '16 km one way (32 km return)', '单程 16 公里（往返 32 公里）', '1–2 hours one way (2–3 hours return)', '单程 1–2 小时（往返 2–3 小时）', 'Grade 2 / easy', '2 级：简易（NZCT 分级）', ['16km, Grade 2/easy, 1–2 hours', '32km, easy, 2–3 hours'])
cyc('alps2ocean', '54 km one way', '单程 54 公里', '4–5 hours', '4–5 小时', 'Grade 2 / easy', '2 级：简易（NZCT 分级）', '54km, Grade 2/easy, 4–5 hours')
cyc('queenstowncycle', '9 km one way', '单程 9 公里', '2 hours', '2 小时', 'Grade 2 / easy', '2 级：简易（NZCT 分级）', '9km, Grade 2/easy, 2 hours')
QT = 'https://www.queenstowntrails.org.nz/trails/gibbston-river-trail'
put('queenstowncycle', 'safety', 'Steep drops beside the track in places, and two crossings of the 100 km/h Gibbston Highway: stop, give way and walk the bike across.', '部分路段旁有陡坎；两次横穿限速 100 公里的 Gibbston Highway，须停车让行，建议下车推行。', 'Steep drops beside the track in places. Two road crossings of Gibbston Highway (100km/hr) — stop and give way to traffic. We recommend dismounting to cross.', QT)
put('queenstowncycle', 'access', 'Main start: AJ Hackett Kawarau Bridge Bungy Centre, 23.3 km from Queenstown on SH6, with parking beside it.', '主要起点：AJ Hackett 卡瓦劳大桥蹦极中心，沿 SH6 距皇后镇 23.3 公里，旁边可停车。', 'Main starting point: AJ Hackett Kawarau Bridge Bungy Centre, 23.3km from Queenstown on SH6. Parking available next to the Bungy Centre.', QT)
put('dunstan', 'distance', '41 km one way', '单程 41 公里', 'the full, one-way journey from Cromwell to Clyde (41km)')
put('dunstan', 'level', 'Grade 2–3 / easy to intermediate; riders need to be confident on Grade 3 trails', '2–3 级：简易至中级；须能应付 3 级越野路段（NZCT 分级）', ['11.3km, Grade 2–3/easy–intermediate, 1–1.5 hours', 'be confident biking off-road on grade 3 (intermediate) trails'])
# ---- public transport (operator pages) ----
put('ni-wellingtonnapier', 'time', 'About 6 hours (InterCity also quotes 6 hr 15 min)', '约 6 小时（InterCity 另一处写 6 小时 15 分钟）', ['The journey from Wellington to Napier takes approximately 6 hours', 'in just 6 hours and 15 minutes'])
put('ni-wellingtonnapier', 'access', 'Departs from Platform 10 at Wellington Railway Station.', '在惠灵顿火车站 10 号站台发车。', 'Buses to Napier depart from Platform 10 of the Wellington Railway Station')
put('ni-rotoruataupo', 'time', 'About 1 hr 15 min', '约 1 小时 15 分钟', 'The bus journey from Rotorua to Taupo takes approximately one hour 15 minutes.')
put('ni-rotoruataupo', 'access', 'Departs Tourism Rotorua, 1167 Fenton St; arrives outside the Taupō i-SITE, 30 Tongariro St.', '从 Tourism Rotorua（1167 Fenton St）发车，到陶波 i-SITE（30 Tongariro St）门外。', ['Buses to Taupo depart from Tourism Rotorua, 1167 Fenton St,', 'and arrive in Taupo outside the i-SITE located at 30 Tongariro St.'])
put('ni-aucklandpaihia', 'time', 'About 4 hours', '约 4 小时', 'The bus journey takes approximately 4 hours')
put('ni-aucklandpaihia', 'access', "Daily from InterCity's SkyCity Terminal, 102 Hobson Street, Auckland, to the Paihia Maritime Building by the wharf.", '每天从奥克兰 Hobson Street 102 号的 InterCity SkyCity 车站发车，到派希亚码头旁的 Maritime Building。', "Buses depart daily from InterCity's SkyCity Terminal at 102 Hobson Street, Auckland City, and arrive at the Paihia Maritime Building right by the wharf.")
put('bus', 'time', 'About 8 hr 10 min', '约 8 小时 10 分钟', 'The journey takes approximately 8 hours and 10 minutes.')
put('bus', 'access', 'Leaves from the Christchurch Bus Exchange on Lichfield St; arrives at Athol Street, Queenstown.', '从基督城 Lichfield St 的 Bus Exchange 发车，到皇后镇 Athol Street。', 'Buses leave from the Christchurch Bus Exchange on Lichfield St and arrive in Queenstown at Athol Street')
put('pictonnelson', 'time', 'About 2 hr 20 min', '约 2 小时 20 分钟', 'The journey from Picton to Nelson takes approximately 2 hours and 20 minutes.')
put('pictonnelson', 'access', 'Departs from outside the Picton ferry terminal and connects with Interislander ferries from Wellington.', '在皮克顿渡轮码头外发车，可衔接从惠灵顿来的 Interislander 渡轮。', 'Buses depart from outside the Picton Ferry terminal and connect with Interislander ferry services from Wellington.')
put('teanaubus', 'time', 'About 2 hr 30 min', '约 2 小时 30 分钟', 'the journey will take approximately 2 hours and 30 minutes')
put('teanaubus', 'access', 'Departs from the Athol Street car park, Queenstown; arrives at Kiwi Country Cafe, 2 Miro Street, Te Anau.', '从皇后镇 Athol Street 停车场发车，到蒂阿瑙 Miro Street 2 号的 Kiwi Country Cafe。', 'Buses to Te Anau depart from the carpark in Athol Street, Queenstown and arrive at the Kiwi Country Cafe, 2 Miro Street, Te Anau.')
put('dunedinbus', 'time', 'About 6 hours', '约 6 小时', 'The bus journey takes approximately 6 hours')
put('coastal', 'season', 'Daily seasonal service from 1 September to 30 April; does not run on Christmas Day.', '季节性班次，9 月 1 日至 4 月 30 日每天开行；圣诞节当天停运。', 'It is a daily seasonal service from September 1st until April 30th. It does not run on Christmas Day.')
put('ni-northernexplorer', 'season', 'Southbound Monday, Thursday and Saturday; northbound Wednesday, Friday and Sunday. Check Great Journeys for non-operating dates.', '南下：周一、周四、周六；北上：周三、周五、周日。停运日期请查 Great Journeys。', ['trains depart southbound on Monday, Thursday and Saturday.', 'trains depart northbound on Friday, Sunday, and Wednesday.'])
# ---- drives (primary sources only) ----
put('aorakidrive', 'time', "About 4.5 hours' drive from Christchurch without stops (DOC)", '从基督城出发，不含停留约 4.5 小时车程（DOC）', 'It is a 3.5 hour drive from Queenstown and a 4.5 hour drive from Christchurch.')
put('aorakidrive', 'access', 'Reached by State Highway 8, then State Highway 80 to its end.', '走 8 号国道，再沿 80 号国道到尽头。', 'It is accessed off State Highway 8 at the end of State Highway 80.')
# ---- second pass: gaps on routes that were one or two facts short ----
put('abel-tasman', 'safety', 'Awaroa Inlet can only be crossed in daylight, from 1 hr 30 min before to 2 hr after low tide. Check the tide tables before you book.', 'Awaroa 河口只能在白天、低潮前 1 小时 30 分钟至低潮后 2 小时之间通过。预订前先查潮汐表。', 'You can only cross Awaroa Inlet in daylight, and within 1 hour 30 minutes before and 2 hours after low tide.')
put('roys-peak', 'access', 'From Wānaka, drive west on the Wānaka – Mount Aspiring Road for about 6 km to the Roys Peak car park on the left.', '从瓦纳卡沿 Wānaka – Mount Aspiring Road 向西约 6 公里，Roys Peak 停车场在左侧。', 'From Wānaka, drive west along the Wānaka – Mount Aspiring Road for about 6 km until you reach the large Roys Peak car park on your left.')
put('routeburn-track', 'access', 'Two ends: Routeburn Shelter (25 km from Glenorchy, partly unsealed road) and The Divide Shelter (85 km from Te Anau). They are 325 km apart by road, so transport is needed at each end.', '两端分别是 Routeburn Shelter（距格林诺奇 25 公里，部分为砂石路）和 The Divide Shelter（距蒂阿瑙 85 公里）。两端公路相距 325 公里，都需要安排交通。', ['Routeburn Track can be accessed from both ends: Routeburn Shelter, 25 km from Glenorchy along a partially unsealed road, and The Divide Shelter, 85 km from Te Anau.', 'The road distance between each end of the track is 325 km – transport is needed at each end.'])
put('kepler-track', 'access', 'Kepler Track car park is 5 km from Te Anau; Rainbow Reach car park is 12 km. In the Great Walks season shuttle buses run daily to both, and a boat serves Brod Bay.', 'Kepler Track 停车场距蒂阿瑙 5 公里，Rainbow Reach 停车场距蒂阿瑙 12 公里。大步道季每天有接驳巴士到这两处，另有船到 Brod Bay。', ['Kepler Track car park: 5 km from Te Anau.', 'Rainbow Reach car park: 12 km from Te Anau.', 'Shuttle buses provide a daily service to the entry and exit points on the track during the Great Walks season. A scheduled boat service also offers transport to Brod Bay.'])
put('kepler-track', 'safety', 'Avalanche risk can last into December; DOC may close the alpine section between Luxmore Hut and Iris Burn Hut.', '雪崩风险可能持续到 12 月；DOC 可能关闭 Luxmore Hut 至 Iris Burn Hut 的高山段。', 'The risk of avalanche can extend into December. During the Great Walks season, DOC manages avalanche risk and may close the alpine section between Luxmore Hut and Iris Burn Hut if there is avalanche hazard.')
put('heaphy-track', 'access', 'Brown Hut in Golden Bay is 156 km from Nelson; Kōhaihai on the West Coast is 110 km from Westport.', '黄金湾一端的 Brown Hut 距纳尔逊 156 公里；西海岸一端的 Kōhaihai 距韦斯特波特 110 公里。', ['Brown Hut in Golden Bay – 156 km from Nelson – at the end of Aorere Valley Rd, or', 'Kohaihai on the West Coast – 110 km from Westport – at the end of Kohaihai Rd.'])
put('heaphy-track', 'safety', 'The section between Saxon and James Mackay huts floods. Do not go on when the track is flooded: wait at Lewis Shelter or Heaphy Hut.', 'Saxon Hut 至 James Mackay Hut 一段容易淹水。步道被淹时不要前进，在 Lewis Shelter 或 Heaphy Hut 等候。', ['Flood prone area between Saxon and James Mackay huts', "It's not safe to proceed when the track is flooded – you should wait in either Lewis Shelter or Heaphy Hut."])
put('rakiura-track', 'safety', 'Muddy stretches up to 500 m long between Port William Hut and North Arm Hut. Carry emergency food in case weather delays you.', 'Port William Hut 至 North Arm Hut 之间有长达 500 米的泥泞路段。请带应急食物，以防天气耽搁行程。', ['This occurs between Port William Hut to North Arm Hut. The muddy areas can be up to 500 m long and also in smaller sections.', 'You will need to carry emergency food supplies in case you are delayed by weather.'])
put('queen-charlotte-track', 'safety', 'Treat, filter or boil all water for 3 minutes: giardia and other waterborne diseases may be present.', '所有饮水都要处理、过滤或煮沸 3 分钟：水中可能有贾第虫等病原体。', 'Giardia and other waterborne diseases may be present in the water at the campsites or in the streams. All water should be treated, filtered or boiled for 3 minutes to make it safe to drink.')
put('mueller-hut', 'season', 'Summer (December–February) suits people with moderate tramping experience. Winter and spring (April to mid November) bring considerable avalanche danger.', '夏季（12–2 月）适合有一定徒步经验的人。冬春季（4 月至 11 月中旬）雪崩危险相当大。', ['Summer (December–February): The route to Mueller Hut offers a mountain experience for anyone with moderate tramping experience – as long as care is taken.', 'There is considerable avalanche danger on the Mueller Hut Route during winter and spring (April to mid November).'])
put('isthmus-peak', 'access', 'The car park is off SH6, north of Lake Hāwea township, 30 minutes’ drive from Wānaka.', '停车场在 SH6 旁、哈威亚湖镇以北，距瓦纳卡 30 分钟车程。', 'Isthmus Peak Track car park is off SH6, north of Lake Hāwea township and 30 minutes drive from Wanaka.')
put('tongariro-northern-circuit', 'access', 'Parking at Mangatepopo car park is limited to 4 hours in the Great Walks season. DOC advises parking in Whakapapa Village and taking a shuttle.', '大步道季 Mangatepopo 停车场限停 4 小时。DOC 建议把车停在 Whakapapa Village，再乘接驳车。', "Parking at Mangatepopo Carpark is limited to 4 hours during the Great Walk season. It's best to park in Whakapapa Village and take a shuttle to the start or arrange a shuttle from a nearby town.")
put('cathedral-cove', 'access', 'Park at Hahei Visitor Car Park (1.2 km along Hahei Beach Road); it is a 30-minute walk from there to the track entrance.', '把车停在 Hahei Visitor Car Park（沿 Hahei Beach Road 走 1.2 公里），从那里步行 30 分钟到步道入口。', ['Turn right onto Hahei Beach Road and continue for 1.2 km. Hahei Visitor Car Park is signposted on your right.', 'It takes 30 min to walk from the car park to the track entrance.'])
put('milford', 'distance', '120 km each way', '单程 120 公里', '120 km journey into the heart of Fiordland National Park', 'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf', note='PDF brochure; sentence recorded by the Sentinel review, not machine-extracted.')
put('bridle', 'time', '1.5 hours one way', '单程 1.5 小时', '1.5 hours one way')
# ---- v3.1: Whanganui Journey (canoe), every value from the DOC page fetched 2026-11-10 ----
put('whanganui-journey', 'time', '3 days (Whakahoro to Pipiriki) or 5 days (Taumarunui to Pipiriki), DOC average canoe times', '3 天（Whakahoro 至 Pipiriki）或 5 天（Taumarunui 至 Pipiriki），为 DOC 给出的平均划行天数',
    ['3 or 5 days', 'The full Whanganui Journey is 145 km, from Taumarunui to Pipiriki. It takes an average of 5 days to canoe.', 'A popular shorter version is 88 km, from Whakahoro to Pipiriki. This is the most scenic section of the river and takes an average of 3 days to canoe.'])
put('whanganui-journey', 'distance', '88 km or 145 km one way', '单程 88 公里或 145 公里', '88 km or 145 km one way')
put('whanganui-journey', 'level', 'Suitable for people with good fitness and confidence with a canoe; be fit enough to paddle 6–7 hours a day (8+ in low river flows)', '适合体能好、能熟练驾驭独木舟的人；需能每天划 6–7 小时（河水低时 8 小时以上）',
    ['This trip is suitable for people with good fitness and confidence with a canoe.', 'be fit enough to paddle for 6 to 7 hours in a day (in low river flows this will be 8+ hours)'], note='DOC gives no track grade for a river journey; this is DOC\'s own fitness wording.')
put('whanganui-journey', 'season', 'Great Walks season 1 October – 30 April is the best time. From 1 May to 30 September go only if you are very experienced in canoeing remote New Zealand rivers in winter.', '大步道季 10 月 1 日至 4 月 30 日是最佳时间。5 月 1 日至 9 月 30 日只有在冬季划行新西兰偏远河流经验非常丰富的人才应前往。',
    ['In the Great Walks season (1 October – 30 April)', 'Best time to experience the trip. Bookings are required for huts and campsites.', 'Outside the Great Walks season (1 May – 30 September)', 'Only attempt the trip at this time if you are very experienced in canoeing remote New Zealand rivers in winter.'])
put('whanganui-journey', 'booking', 'In the Great Walks season huts and campsites must be booked in advance and paid at booking. Outside the season they cannot be booked: first come, first served.', '大步道季小屋和营地须提前预订，预订时付费。季外不能预订，先到先得。',
    ['In the Great Walks season huts and campsites must be booked in advance. Fees are paid at the time of booking.', 'Outside the Great Walks season huts and campsites cannot be booked and are first come, first served.'])
put('whanganui-journey', 'access', 'Start at Ohinepane Campsite (Whanganui River Road, SH43) or Whakahoro (about 43 km on rough, narrow Oio Road from SH4 near Ōwhango). Most trips end at Pipiriki: about 76 km from Whanganui by Whanganui River Road, or 27 km from Raetihi by Pipiriki Raetihi Road.', '起点可选 Ohinepane 营地（Whanganui River Road，SH43）或 Whakahoro（从 Ōwhango 附近的 SH4 转入 Oio Road，约 43 公里，路窄且颠簸）。终点通常是 Pipiriki：从旺格努伊沿 Whanganui River Road 约 76 公里，或从 Raetihi 走 Pipiriki Raetihi Road 约 27 公里。',
    ['Ohinepane Campsite, accessed from Whanganui River Road (State Highway 43).', 'Whakahoro, accessed from Oio Road. Turn off State Highway 4 near Ōwhango onto Oio Road. Follow Oio Road for around 43km to Whakahoro. This road is rough, narrow and winding – drive with care and plan plenty of time.', 'Pipiriki is the usual end of the Whanganui Journey. Access Pipiriki from Whanganui by following Whanganui River Road (around 76km), or from Raetihi on State Highway 4 by following the Pipiriki Raetihi Road (around 27km).'])
put('whanganui-journey', 'safety', 'Not an experienced canoeist, or travelling alone: book a guided trip. If you cannot swim or are not fit enough, do not paddle. If the river rises or floods, stay at your hut or campsite until it drops.', '没有独木舟经验或独自出行：请参加有向导的行程。不会游泳或体能不够，不要下水。河水上涨或发洪水时，留在小屋或营地等水位回落。',
    ["If you aren't an experienced canoe user or are travelling alone, book a guided trip instead. If you can't swim or aren't fit enough, don't risk paddling.", 'Keep an eye on the weather and the river. If the river starts rising or is in flood, stay at your campground or hut until the river levels drop.'])
json.dump(facts, open(f'{root}/data/field-facts.json', 'w'), ensure_ascii=False, indent=1)
print(len(facts), 'routes;', sum(len(v) for v in facts.values()), 'field entries')
