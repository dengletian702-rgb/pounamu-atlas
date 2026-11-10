#!/usr/bin/env python3
"""Authoring helper: writes data/featured-additions.json (25 featured DOC walks added in v3, plus the
Whanganui Journey canoe trip added in v3.1 as the first "paddle" route).
Stage titles, times and distances are copied from the DOC page (data/evidence/<id>.json "stages").
Summaries, Chinese names and the route line are editor-written. Time, distance, grade, season,
booking, access and safety are NOT set here: scripts/apply-facts.mjs fills them from field-facts.json
or leaves them marked "to verify"."""
import json, re, os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.load(open(f'{root}/data/evidence-targets.json'))
def zh_t(s):
    z = s.replace(' - ', '–').replace('-', '–').replace(' – ', '–').replace(' to ', '–')
    z = re.sub(r'\s*(hours?|hrs?)\b', ' 小时', z); z = re.sub(r'\s*(minutes|mins?)\b', ' 分钟', z); z = re.sub(r'\s*days?\b', ' 天', z)
    z = z.replace('walking', '步行').replace('mountain biking', '山地车').replace('return', '往返').replace('one way', '单程').replace('(', '（').replace(')', '）').replace(', weather dependent', '，视天气而定').replace('from', '自')
    return re.sub(r'\s+', ' ', z).strip()
def zh_d(s): return re.sub(r'\s+', ' ', s.replace('km', ' 公里').replace('one way', '单程').replace('return', '往返').replace('(tidal)', '（受潮汐影响）').replace(' to ', ' 至 ').replace('walking', '步行').replace('mountain biking', '山地车')).strip()
GEAR = {'day': ["Sturdy footwear, warm and waterproof layers, water, food and sun protection. DOC's day hikes gear list has the full set.", '结实的鞋、保暖和防雨衣物、饮水、食物和防晒用品。完整清单见 DOC 一日徒步装备清单。'],
        'short': ['Comfortable walking shoes, a rain layer and water.', '舒适的步行鞋、防雨外套和饮水。'],
        'multi': ["Multi-day pack, sleeping bag, cooker and food for every day plus a spare, warm and waterproof layers. Follow DOC's gear list for this track.", '多日背包、睡袋、炉具、每天的食物外加一天备用、保暖和防雨衣物。请按 DOC 给这条步道的装备清单准备。'],
        'alpine': ["Full alpine day kit: boots with good grip, warm layers, waterproof shell, hat and gloves, food, water, head torch. Winter needs alpine equipment and the skills to use it.", '完整的高山一日装备：抓地好的登山鞋、保暖层、防水外壳、帽子手套、食物、饮水、头灯。冬季需要高山装备，并且会用。']}
PACING = ["Times are DOC's figures. Leave extra for rests, photos and a change in the weather.", '用时取自 DOC。休息、拍照和天气变化请另留余量。']
FOOD = {'day': ['Carry all the food and water you need for the day.', '带足当天所需的食物和饮水。'], 'multi': ['Carry food for every day plus a spare day; check the DOC page for hut cooking facilities and water.', '带足每天的食物，另备一天余量；小屋炊事设施和饮水情况见 DOC 页面。']}
TIPS = [{'title': ['Check conditions', '查看路况与天气'], 'text': ['Read the DOC alerts for this track and the MetService forecast on the day you go.', '出发当天查看这条步道的 DOC 公告和 MetService 天气预报。']},
        {'title': ['Leave your plans', '留下行程'], 'text': ['Tell a trusted contact where you are going and when you will be back. In an emergency call 111.', '把去向和返回时间告诉可靠的联系人。紧急情况拨 111。']}]
ALT = ['If the weather or the time does not suit, choose a shorter walk nearby from the DOC page.', '天气或时间不合适时，可在 DOC 页面上另选附近的短途步道。']
R = []
def add(i, island, zh, region, summary, ends, kind, days, photo=None, name=None, mode='walk', gear=None):
    e = json.load(open(f'{root}/data/evidence/{i}.json'))[0]
    nm = name or re.split(r'[:,]', e['title'])[0].strip()
    stages = [s for s in e.get('stages', []) if s.get('time') or s.get('distance')]
    stages = [s for s in stages if s['heading'] not in ('Brochures', 'When to go')]
    if i == 'paparoa-track': stages = stages[:4]          # second block on the page is the mountain-bike timing
    if i == 'avalanche-peak': stages = stages[:2]
    tl = []
    for n, s in enumerate(stages, 1):
        side = s['heading'].lower().startswith('side trip')
        en = '; '.join(x for x in [('Time: ' + s['time']) if s.get('time') else '', ('Distance: ' + s['distance'].lstrip(': ')) if s.get('distance') else ''] if x) + ' (DOC).'
        zhs = '；'.join(x for x in [('用时：' + zh_t(s['time'])) if s.get('time') else '', ('距离：' + zh_d(s['distance'].lstrip(': '))) if s.get('distance') else ''] if x) + '（DOC）。'
        head = s['heading']; zhead = re.sub(r'^Side trip\s*[:–-]\s*', '支线：', head).replace(' to ', ' → ').replace('Day ', '第 ').replace(' – ', ' 天：', 1) if head.startswith('Day ') else re.sub(r'^Side trip\s*[:–-]\s*', '支线：', head).replace(' to ', ' → ')
        tl.append({'at': ['Side trip' if side else f'Stage {n}', '支线' if side else f'第 {n} 段'], 'title': [head, zhead], 'text': [en, zhs]})
    if not tl:
        tl = [{'at': ['Before', '出发前'], 'title': ['Check the track status', '确认步道状态'], 'text': ['Open the DOC page for alerts and closures, and check the forecast.', '打开 DOC 页面查看公告和封闭信息，并查看天气预报。']},
              {'at': ['On the track', '途中'], 'title': [ends[0], ends[1]], 'text': ['Follow the marked track. DOC does not publish stage times for this walk; use the total time above.', '沿有标记的步道行走。DOC 没有给出这条步道的分段用时，请以上面的总用时为准。']},
              {'at': ['After', '返回后'], 'title': ['Let your contact know you are back', '告诉联系人你已返回'], 'text': ['Close the loop with whoever holds your plans.', '向掌握你行程的人报个平安。']}]
    g = 'multi' if kind == 'multi' else kind
    R.append({'id': i, 'island': island, 'mode': mode, 'name': nm, 'zh': zh, 'region': region, 'summary': summary, 'ends': ends,
              'time': ['', ''], 'distance': ['', ''], 'level': ['', ''], 'season': ['Check the DOC page for the current season, alerts and closures.', '当前季节、公告和封闭信息请查 DOC 页面。'],
              'gear': gear or GEAR[g], 'intro': summary, 'planTitle': ['Stages from the DOC track description', 'DOC 步道说明中的分段'] if stages else ['How the walk goes', '怎么走'],
              'timeline': tl, 'pacing': PACING, 'access': ['How to reach the start: see the DOC page.', '前往起点的方式见 DOC 页面。'], 'food': FOOD['multi' if kind == 'multi' else 'day'],
              'tips': TIPS, 'alternatives': ALT, 'addedIn': 'v3.1' if mode == 'paddle' else 'v3', 'sources': [{'label': 'Department of Conservation (DOC)', 'labelZh': '新西兰保护部（DOC）', 'url': T[i][0]}],
              'photoId': photo, 'url': T[i][0], 'planDays': days})
S, N = 'south', 'north'
add('kepler-track', S, '凯普勒步道', ['Fiordland', '峡湾地区'], ['A loop Great Walk from Te Anau: beech-forest lakeshore, then tussock ridgelines above Lake Te Anau and Lake Manapōuri.', '从蒂阿瑙出发的环线大步道：先走山毛榉林间的湖岸，再登上俯瞰蒂阿瑙湖和马纳普里湖的草丛山脊。'], ['Kepler Track car park → Luxmore Hut → Iris Burn Hut → Moturau Hut → car park (loop)', 'Kepler Track 停车场 → Luxmore Hut → Iris Burn Hut → Moturau Hut → 停车场（环线）'], 'multi', 4, 'te-anau-lake')
add('heaphy-track', S, '希菲步道', ['Kahurangi National Park, Nelson / West Coast', '卡胡朗伊国家公园，纳尔逊／西海岸'], ['The longest Great Walk: tussock downs, forest and nīkau palms, ending on the wild West Coast.', '最长的大步道：穿过草丛高地、森林和尼考棕榈，终点在西海岸的海边。'], ['Brown Hut → Perry Saddle → James Mackay Hut → Heaphy Hut → Kōhaihai', 'Brown Hut → Perry Saddle → James Mackay Hut → Heaphy Hut → Kōhaihai'], 'multi', 5)
add('paparoa-track', S, '帕帕罗瓦步道', ['Paparoa National Park, West Coast', '帕帕罗瓦国家公园，西海岸'], ['Across the Paparoa Range from Blackball to Punakaiki: alpine tops, limestone karst and rainforest.', '从 Blackball 翻越帕帕罗瓦山脉到普纳凯基：高山山顶、石灰岩喀斯特和雨林。'], ['Smoke-ho car park → Ces Clark Hut → Moonlight Tops Hut → Pororari Hut → Pororari River car park', 'Smoke-ho 停车场 → Ces Clark Hut → Moonlight Tops Hut → Pororari Hut → Pororari River 停车场'], 'multi', 3)
add('rakiura-track', S, '拉奇乌拉步道', ['Rakiura / Stewart Island', '拉奇乌拉／斯图尔特岛'], ['A three-day island loop from Oban through bush, bird life and quiet beaches.', '从奥本出发的三天海岛环线，一路是丛林、鸟鸣和安静的海滩。'], ['Oban → Lee Bay → Port William Hut → North Arm Hut → Fern Gully car park', 'Oban → Lee Bay → Port William Hut → North Arm Hut → Fern Gully 停车场'], 'multi', 3)
add('hump-ridge-track', S, '驼峰岭步道', ['Southern Fiordland', '峡湾地区南部'], ['A three-day loop over sub-alpine tops and along rugged coast; it became the 11th Great Walk in October 2024.', '三天环线，翻越亚高山山顶，再沿崎岖海岸返回；2024 年 10 月成为第 11 条大步道。'], ['Loop in southern Fiordland (start point: see DOC and the Hump Ridge Trust)', '峡湾地区南部环线（起点见 DOC 和 Hump Ridge Trust）'], 'multi', 3)
add('queen-charlotte-track', S, '夏洛特女王步道', ['Marlborough Sounds', '马尔堡峡湾'], ['73.5 km through the Marlborough Sounds from Meretoto / Ship Cove to Anakiwa, on foot or by bike.', '从 Meretoto / Ship Cove 到 Anakiwa，全长 73.5 公里，穿过马尔堡峡湾，可徒步也可骑行。'], ['Meretoto / Ship Cove → Endeavour Inlet → Camp Bay → Torea Saddle → Anakiwa', 'Meretoto / Ship Cove → Endeavour Inlet → Camp Bay → Torea Saddle → Anakiwa'], 'multi', 4, 'picton-harbour')
add('mueller-hut', S, '穆勒小屋路线', ['Aoraki / Mount Cook National Park', '奥拉基／库克山国家公园'], ['A steep alpine route to a hut with a full circle of glaciers, ice cliffs and the highest peaks in the country.', '一条陡峭的高山路线，通往一间被冰川、冰崖和全国最高群峰环抱的小屋。'], ['Aoraki / Mount Cook Village → Sealy Tarns → Mueller Hut', 'Aoraki / Mount Cook Village → Sealy Tarns → Mueller Hut'], 'alpine', 2, 'hooker-valley')
add('tasman-glacier-view', S, '塔斯曼冰川观景步道', ['Aoraki / Mount Cook National Park', '奥拉基／库克山国家公园'], ['A short, steep climb to look over Tasman Lake and Haupapa / Tasman Glacier, the longest glacier in New Zealand.', '一段短而陡的上坡，俯瞰塔斯曼湖和新西兰最长的冰川 Haupapa / 塔斯曼冰川。'], ['Return walk to the Tasman Glacier viewpoint', '往返塔斯曼冰川观景点'], 'short', 1)
add('lake-marian', S, '玛丽安湖步道', ['Fiordland National Park', '峡湾国家公园'], ['From Hollyford Road past a run of waterfalls to an alpine lake in a hanging valley.', '从 Hollyford Road 出发，经过一连串瀑布，走到悬谷里的高山湖。'], ['Lake Marian car park, Hollyford Road → waterfalls → Lake Marian → return', 'Hollyford Road 的 Lake Marian 停车场 → 瀑布 → Lake Marian → 原路返回'], 'alpine', 1)
add('franz-josef-glacier-walk', S, '弗朗兹·约瑟夫冰川步道', ['Westland Tai Poutini National Park, West Coast', '西部泰普提尼国家公园，西海岸'], ['A short rainforest walk to a viewing area over the Franz Josef Glacier valley.', '穿过雨林的短途步道，走到观景点眺望弗朗兹·约瑟夫冰川谷。'], ['Return walk to the glacier valley viewing area', '往返冰川谷观景点'], 'short', 1)
add('pancake-rocks', S, '普纳凯基千层岩与喷水洞步道', ['Paparoa National Park, West Coast', '帕帕罗瓦国家公园，西海岸'], ['A paved loop around layered limestone stacks, blowholes and surge pools; good for children.', '铺装环线，绕行层叠的石灰岩、喷水洞和涌浪池，适合带孩子。'], ['Loop walk at Punakaiki', '普纳凯基环线'], 'short', 1)
add('hokitika-gorge', S, '霍基蒂卡峡谷步道', ['Hokitika Gorge Scenic Reserve, West Coast', '霍基蒂卡峡谷风景保护区，西海岸'], ['Turquoise water under rainforest, with walking options for most abilities.', '雨林之下的蓝绿色河水，有适合多数人的走法。'], ['Loop walk in Hokitika Gorge Scenic Reserve', '霍基蒂卡峡谷风景保护区环线'], 'short', 1)
add('ben-lomond', S, '本洛蒙德步道', ['Queenstown, Otago', '皇后镇，奥塔哥'], ['A demanding full-day climb from Queenstown, with 1,438 m of elevation gain and a wide summit panorama.', '从皇后镇出发的全天硬爬，爬升 1,438 米，山顶视野开阔。'], ['Queenstown (Tiki Trail) → Ben Lomond Saddle → summit → return', '皇后镇（Tiki Trail）→ Ben Lomond Saddle → 山顶 → 原路返回'], 'alpine', 1)
add('isthmus-peak', S, '地峡峰步道', ['Wānaka / Lake Hāwea, Otago', '瓦纳卡／哈威亚湖，奥塔哥'], ['Steep and steady between Lake Wānaka and Lake Hāwea, with both lakes and the Southern Alps in view.', '在瓦纳卡湖和哈威亚湖之间一路陡升，两座湖和南阿尔卑斯山尽收眼底。'], ['Isthmus Peak Track car park → Isthmus Peak → return', 'Isthmus Peak Track 停车场 → Isthmus Peak → 原路返回'], 'alpine', 1)
add('avalanche-peak', S, '雪崩峰路线', ["Arthur's Pass National Park, Canterbury", '亚瑟通道国家公园，坎特伯雷'], ["The only peak at Arthur's Pass with a poled route to the top: 1,100 m straight up from the village.", '亚瑟通道唯一有标杆路线通顶的山峰：从村子直上 1,100 米。'], ["Arthur's Pass village → Avalanche Peak (up Avalanche Peak Track or Scotts Track)", '亚瑟通道村 → Avalanche Peak（走 Avalanche Peak Track 或 Scotts Track 上山）'], 'alpine', 1, 'arthurs-pass')
add('waikoropupu-springs', S, '蒂怀科罗普普泉步道', ['Tākaka, Golden Bay', '塔卡卡，黄金湾'], ['A short accessible loop to the largest freshwater springs in New Zealand, with some of the clearest water measured anywhere.', '无障碍短环线，通往新西兰最大的淡水泉，水质清澈度居世界前列。'], ['Loop walk to the springs viewing platform', '环线，至泉水观景台'], 'short', 1)
add('mount-robert-circuit', S, '罗伯特山环线', ['Nelson Lakes National Park', '纳尔逊湖国家公园'], ['A loop on the northern face of Pourangahau / Mount Robert, looking down on Lake Rotoiti.', '绕行 Pourangahau / 罗伯特山北坡的环线，俯瞰罗托伊蒂湖。'], ['Loop on Pourangahau / Mount Robert above Lake Rotoiti', 'Pourangahau / 罗伯特山环线，罗托伊蒂湖上方'], 'alpine', 1)
add('tongariro-northern-circuit', N, '汤加里罗北环线', ['Tongariro National Park', '汤加里罗国家公园'], ['A Great Walk around the volcanic heart of Tongariro National Park. One section is closed after the 2025 fire, so the walk is currently 35.5 km.', '环绕汤加里罗国家公园火山核心地带的大步道。2025 年山火后有一段关闭，目前全程 35.5 公里。'], ['Whakapapa Village → Mangatepopo Hut → Oturere Hut → Waihohonu Hut → Whakapapa Village', 'Whakapapa Village → Mangatepopo Hut → Oturere Hut → Waihohonu Hut → Whakapapa Village'], 'multi', 4, 'ni-tongariro')
add('lake-waikaremoana', N, '怀卡雷莫阿纳湖大步道', ['Te Urewera', '蒂乌雷韦拉'], ['A backcountry Great Walk along the lake in Te Urewera, the homeland of Ngāi Tūhoe.', '沿湖而行的偏远大步道，位于 Ngāi Tūhoe 的家园蒂乌雷韦拉。'], ['Onepoto → Panekire Hut → Waiopaoa Hut → Marauiti Hut → Hopuruahine Landing', 'Onepoto → Panekire Hut → Waiopaoa Hut → Marauiti Hut → Hopuruahine Landing'], 'multi', 4, name='Lake Waikaremoana Great Walk')
add('pouakai-crossing', N, '波阿凯穿越', ['Te Papa-Kura-o-Taranaki, Taranaki', 'Te Papa-Kura-o-Taranaki，塔拉纳基'], ['A long day across the lower slopes of Taranaki Maunga: cliffs, a big waterfall, a moss swamp and the Pouākai tarns.', '在塔拉纳基山低坡上走一整天：悬崖、大瀑布、苔藓沼泽和 Pouākai 小湖。'], ['North Taranaki Visitor Centre → Holly Hut → Pouākai tarns → Pouākai Hut → Mangorei Road end', 'North Taranaki Visitor Centre → Holly Hut → Pouākai tarns → Pouākai Hut → Mangorei Road 尽头'], 'alpine', 1, name='Pouākai Crossing')
add('cathedral-cove', N, '教堂湾步道', ['Hahei, Coromandel', '哈黑，科罗曼德'], ['A coastal walk above Te Whanganui-o-Hei Marine Reserve to the rock archway at Mautohe Cathedral Cove.', '沿 Te Whanganui-o-Hei 海洋保护区上方的海岸步行，走到 Mautohe 教堂湾的岩石拱门。'], ['Return walk to Mautohe Cathedral Cove', '往返 Mautohe 教堂湾'], 'day', 1)
add('tane-mahuta', N, 'Tāne Mahuta 步道', ['Waipoua Forest, Northland', '怀波瓦森林，北地'], ['A few minutes on a boardwalk to Tāne Mahuta, the largest known living kauri tree.', '沿木栈道走几分钟，到已知最大的在世贝壳杉 Tāne Mahuta 跟前。'], ['Short walk to Tāne Mahuta, Waipoua Forest', '怀波瓦森林内，短途步行至 Tāne Mahuta'], 'short', 1)
add('pinnacles-kauaeranga', N, '考埃兰加贝壳杉步道（Pinnacles）', ['Coromandel Forest Park', '科罗曼德森林公园'], ['The classic Coromandel climb to Pinnacles Hut and the summit, as a day or an overnight walk.', '科罗曼德的经典上山路线，到 Pinnacles Hut 再登顶，可当天往返，也可住一晚。'], ['Kauaeranga Road end → Pinnacles Hut → the Pinnacles', 'Kauaeranga Road 尽头 → Pinnacles Hut → Pinnacles'], 'day', 1, name='Kauaeranga Kauri Trail (Pinnacles Walk)')
add('tama-lakes', N, '塔马湖步道', ['Tongariro National Park', '汤加里罗国家公园'], ['A day walk past Taranaki Falls to Lower Tama Lake, with Ruapehu and Ngāuruhoe on either side.', '一日步道，经过 Taranaki 瀑布到下塔马湖，鲁阿佩胡和瑙鲁霍伊两座火山分列两侧。'], ['Return walk to Lower Tama Lake, passing Taranaki Falls', '往返下塔马湖，途经 Taranaki 瀑布'], 'alpine', 1, 'ni-taranaki-falls')
add('te-paki-coastal', N, '蒂帕基海岸步道', ['Te Paki, Northland', '蒂帕基，北地'], ['Several days along the far-north coast past Cape Reinga / Te Rerenga Wairua, over headlands, beaches and dunes.', '沿最北端海岸走上几天，经过雷因加角 / Te Rerenga Wairua，翻岬角、走海滩、过沙丘。'], ['Kapowairua (Spirits Bay) → Cape Reinga / Te Rerenga Wairua → Te Paki Stream', 'Kapowairua（Spirits Bay）→ 雷因加角 / Te Rerenga Wairua → Te Paki Stream'], 'multi', 4)
# ---- v3.1: first paddling route (James review B6). Facts are set in make_field_facts.py from the DOC page. ----
add('whanganui-journey', 'north', '旺格努伊河之旅', ['Whanganui National Park', '旺格努伊国家公园'],
    ['A Great Walk done by canoe: down the Whanganui River through remote hills and bush-clad valleys, with nights in riverside huts, campsites and a marae.',
     '用独木舟完成的大步道：沿旺格努伊河顺流而下，穿过偏远的山丘和林木覆盖的河谷，夜宿河边小屋、营地和一处毛利会堂（marae）。'],
    ['Taumarunui or Whakahoro → John Coull Hut → Tīeke Kāinga → Pipiriki (downstream by canoe)', 'Taumarunui 或 Whakahoro → John Coull Hut → Tīeke Kāinga → Pipiriki（乘独木舟顺流而下）'],
    'multi', 5, mode='paddle', name='Whanganui Journey',
    gear=["Canoe, paddles and waterproof barrels (usually from a hire operator), a 3–4 season sleeping bag, cooking gear, a way to treat water, toilet paper and emergency food. Follow DOC's gear list for this trip.",
          '独木舟、桨和防水桶（一般向租船商租用）、3–4 季睡袋、炊具、净水手段、厕纸和应急食物。请按 DOC 给这条线路的装备清单准备。'])
json.dump(R, open(f'{root}/data/featured-additions.json', 'w'), ensure_ascii=False, indent=1)
print(len(R), [ (r['id'], len(r['timeline'])) for r in R][:6])
