(function(){
// The road and transport network the trip finder plans on: towns, the roads between them, and the places people
// ask for. Hours and km are typical summer driving times without stops, rounded, from NZTA Journey Planner-style
// values are used by the planning model; road conditions vary.
// `pt`: how to do the leg without a car — coach (InterCity), train (KiwiRail Great Journeys), ferry, shuttle, or
// null where there is no regular public service.
// `ptH`: hours by that service where it differs a lot from driving.

const ROAD_SOURCES = [
  { label: 'NZTA — Journey Planner', url: 'https://www.journeys.nzta.govt.nz/' },
  { label: 'InterCity — routes and timetables', url: 'https://www.intercity.co.nz/' },
  { label: 'KiwiRail Great Journeys of New Zealand', url: 'https://www.greatjourneysnz.com/' },
  { label: 'Interislander / Bluebridge Cook Strait ferries', url: 'https://www.interislander.co.nz/' },
  { label: 'Stewart Island Experience — Foveaux Express', url: 'https://www.stewartislandexperience.co.nz/' },
];

// Towns: [lat, lon], name, and whether a trip can sensibly start or end there (an airport or ferry terminal).
const NODES = {
  // South Island
  christchurch: { at: [-43.53, 172.63], en: 'Christchurch', zh: '基督城', hub: true },
  queenstown: { at: [-45.03, 168.66], en: 'Queenstown', zh: '皇后镇', hub: true },
  dunedin: { at: [-45.87, 170.5], en: 'Dunedin', zh: '但尼丁', hub: true },
  nelson: { at: [-41.27, 173.28], en: 'Nelson', zh: '纳尔逊', hub: true },
  picton: { at: [-41.29, 174.0], en: 'Picton', zh: '皮克顿', hub: true },
  akaroa: { at: [-43.8, 172.97], en: 'Akaroa', zh: '阿卡罗阿' },
  'arthurs-pass': { at: [-42.94, 171.56], en: 'Arthur’s Pass', zh: '亚瑟隘口' },
  greymouth: { at: [-42.45, 171.21], en: 'Greymouth', zh: '格雷茅斯' },
  hokitika: { at: [-42.72, 170.97], en: 'Hokitika', zh: '霍基蒂卡' },
  punakaiki: { at: [-42.11, 171.33], en: 'Punakaiki', zh: '普纳凯基' },
  westport: { at: [-41.75, 171.6], en: 'Westport', zh: '西港' },
  marahau: { at: [-41.0, 173.01], en: 'Marahau (Abel Tasman)', zh: '马拉豪（亚伯塔斯曼）' },
  kaikoura: { at: [-42.4, 173.68], en: 'Kaikōura', zh: '凯库拉' },
  'franz-josef': { at: [-43.39, 170.18], en: 'Franz Josef', zh: '弗朗茨约瑟夫' },
  fox: { at: [-43.46, 170.02], en: 'Fox Glacier', zh: '福克斯冰川镇' },
  haast: { at: [-43.88, 169.04], en: 'Haast', zh: '哈斯特' },
  wanaka: { at: [-44.7, 169.13], en: 'Wānaka', zh: '瓦纳卡' },
  'te-anau': { at: [-45.41, 167.72], en: 'Te Anau', zh: '蒂阿瑙' },
  milford: { at: [-44.67, 167.93], en: 'Milford Sound', zh: '米尔福德峡湾' },
  tekapo: { at: [-44.0, 170.48], en: 'Lake Tekapo', zh: '特卡波' },
  twizel: { at: [-44.26, 170.1], en: 'Twizel', zh: '特威泽尔' },
  aoraki: { at: [-43.73, 170.1], en: 'Aoraki/Mount Cook Village', zh: '库克山村' },
  oamaru: { at: [-45.1, 170.97], en: 'Ōamaru', zh: '奥马鲁' },
  owaka: { at: [-46.45, 169.66], en: 'Owaka (the Catlins)', zh: '奥瓦卡（卡特林斯）' },
  invercargill: { at: [-46.41, 168.35], en: 'Invercargill', zh: '因弗卡吉尔' },
  bluff: { at: [-46.6, 168.33], en: 'Bluff', zh: '布拉夫' },
  oban: { at: [-46.9, 168.13], en: 'Oban, Stewart Island', zh: '斯图尔特岛奥本' },
  // North Island
  auckland: { at: [-36.85, 174.76], en: 'Auckland', zh: '奥克兰', hub: true },
  wellington: { at: [-41.29, 174.78], en: 'Wellington', zh: '惠灵顿', hub: true },
  paihia: { at: [-35.28, 174.09], en: 'Paihia (Bay of Islands)', zh: '派希亚（岛屿湾）' },
  hahei: { at: [-36.84, 175.8], en: 'Hahei (Coromandel)', zh: '哈黑（科罗曼德）' },
  hamilton: { at: [-37.79, 175.28], en: 'Hamilton', zh: '汉密尔顿' },
  matamata: { at: [-37.81, 175.77], en: 'Matamata', zh: '玛塔玛塔' },
  waitomo: { at: [-38.26, 175.1], en: 'Waitomo', zh: '怀托摩' },
  rotorua: { at: [-38.14, 176.25], en: 'Rotorua', zh: '罗托鲁瓦', hub: true },
  taupo: { at: [-38.69, 176.07], en: 'Taupō', zh: '陶波' },
  'national-park': { at: [-39.18, 175.4], en: 'National Park Village (Tongariro)', zh: '国家公园村（汤加里罗）' },
  napier: { at: [-39.49, 176.91], en: 'Napier', zh: '纳皮尔' },
  'new-plymouth': { at: [-39.06, 174.08], en: 'New Plymouth', zh: '新普利茅斯' },
};

const R = (en, zh) => ({ en, zh });
// [from, to, hours, km, road, pt, ptH]
const EDGES = [
  ['christchurch', 'akaroa', 1.5, 82, R('SH75 over Banks Peninsula', 'SH75 翻越班克斯半岛'), 'shuttle'],
  ['christchurch', 'arthurs-pass', 2, 150, R('SH73 across the Canterbury Plains to Arthur’s Pass', 'SH73 穿过坎特伯雷平原上亚瑟隘口'), 'train'],
  ['arthurs-pass', 'greymouth', 1.5, 98, R('SH73 down the Ōtira Viaduct to the West Coast', 'SH73 经奥蒂拉高架桥下到西海岸'), 'train'],
  ['greymouth', 'hokitika', 0.5, 40, R('SH6 along the coast', 'SH6 沿海岸'), 'coach'],
  ['greymouth', 'punakaiki', 0.75, 45, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['punakaiki', 'westport', 0.75, 57, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['westport', 'nelson', 3.25, 225, R('SH6 through the Buller Gorge', 'SH6 穿过布勒峡谷'), 'coach'],
  ['nelson', 'marahau', 1, 67, R('SH60 to the Abel Tasman', 'SH60 到亚伯塔斯曼'), 'shuttle'],
  ['nelson', 'picton', 2, 110, R('SH6 via Havelock (or Queen Charlotte Drive)', 'SH6 经哈夫洛克（或夏洛特皇后公路）'), 'coach'],
  ['picton', 'kaikoura', 2, 155, R('SH1 down the Kaikōura coast', 'SH1 沿凯库拉海岸南下'), 'train'],
  ['kaikoura', 'christchurch', 2.5, 180, R('SH1', 'SH1'), 'train'],
  ['hokitika', 'franz-josef', 2, 135, R('SH6 south through the rainforest', 'SH6 穿雨林南下'), 'coach'],
  ['franz-josef', 'fox', 0.5, 25, R('SH6', 'SH6'), 'coach'],
  ['fox', 'haast', 2, 120, R('SH6 along the glacier coast', 'SH6 沿冰川海岸'), 'coach'],
  ['haast', 'wanaka', 2.25, 140, R('SH6 over the Haast Pass', 'SH6 翻越哈斯特隘口'), 'coach'],
  ['wanaka', 'queenstown', 1, 67, R('Crown Range Road (coaches use SH6)', '皇冠山脉公路（大巴绕 SH6）'), 'coach', 1.5],
  ['wanaka', 'twizel', 1.75, 143, R('SH8 over the Lindis Pass', 'SH8 翻越林迪斯隘口'), 'coach'],
  ['queenstown', 'twizel', 2.25, 185, R('SH6 and SH8 via Cromwell and the Lindis Pass', 'SH6、SH8 经克伦威尔和林迪斯隘口'), 'coach'],
  ['twizel', 'tekapo', 0.75, 58, R('SH8 past Lake Pukaki', 'SH8 经普卡基湖'), 'coach'],
  ['twizel', 'aoraki', 0.75, 65, R('SH80 along Lake Pukaki to Aoraki/Mount Cook', 'SH80 沿普卡基湖到库克山'), 'shuttle'],
  ['christchurch', 'tekapo', 3, 226, R('SH1, SH79 and SH8 via Geraldine and Fairlie', 'SH1、SH79、SH8 经杰拉尔丁和费尔利'), 'coach'],
  ['queenstown', 'te-anau', 2, 170, R('SH6 and SH94', 'SH6、SH94'), 'coach'],
  ['te-anau', 'milford', 2, 118, R('SH94 Milford Road (check NZTA for avalanche closures)', 'SH94 米尔福德公路（冬季注意雪崩封路）'), 'coach'],
  ['te-anau', 'invercargill', 2, 150, R('SH94 and SH1', 'SH94、SH1'), 'coach'],
  ['invercargill', 'bluff', 0.5, 30, R('SH1', 'SH1'), 'shuttle'],
  ['bluff', 'oban', 1, 0, R('Foveaux Express ferry across Foveaux Strait', 'Foveaux Express 渡轮穿过福沃海峡'), 'ferry'],
  ['invercargill', 'owaka', 2, 150, R('Southern Scenic Route through the Catlins', '南部风景公路穿过卡特林斯'), null],
  ['owaka', 'dunedin', 1.5, 115, R('Southern Scenic Route and SH1', '南部风景公路、SH1'), null],
  ['invercargill', 'dunedin', 2.75, 205, R('SH1', 'SH1'), 'coach'],
  ['dunedin', 'queenstown', 3.5, 280, R('SH8 through Central Otago', 'SH8 穿过中奥塔哥'), 'coach'],
  ['dunedin', 'oamaru', 1.25, 113, R('SH1 past Moeraki', 'SH1 经莫埃拉基'), 'coach'],
  ['oamaru', 'christchurch', 3, 245, R('SH1', 'SH1'), 'coach'],
  ['oamaru', 'twizel', 1.75, 130, R('SH83 up the Waitaki Valley', 'SH83 沿怀塔基河谷'), null],
  ['picton', 'wellington', 3.5, 0, R('Cook Strait ferry (Interislander or Bluebridge)', '库克海峡渡轮（Interislander 或 Bluebridge）'), 'ferry'],
  // North Island
  ['auckland', 'paihia', 3.25, 230, R('SH1 north', 'SH1 北上'), 'coach'],
  ['auckland', 'hahei', 2.5, 175, R('SH2 and SH25 to the Coromandel', 'SH2、SH25 到科罗曼德'), null],
  ['auckland', 'hamilton', 1.5, 125, R('SH1 Waikato Expressway', 'SH1 怀卡托高速'), 'coach'],
  ['hamilton', 'matamata', 0.75, 60, R('SH26 and SH27', 'SH26、SH27'), 'coach'],
  ['hamilton', 'waitomo', 1, 75, R('SH39 and SH3', 'SH39、SH3'), 'coach'],
  ['hamilton', 'rotorua', 1.5, 110, R('SH1 and SH5 via Tīrau', 'SH1、SH5 经蒂劳'), 'coach'],
  ['hamilton', 'taupo', 2, 150, R('SH1 via Tokoroa', 'SH1 经托科罗阿'), 'coach'],
  ['auckland', 'matamata', 2, 160, R('SH1 and SH27', 'SH1、SH27'), 'coach'],
  ['matamata', 'rotorua', 1, 65, R('SH27 and SH5 via Tīrau', 'SH27、SH5 经蒂劳'), 'coach'],
  ['auckland', 'waitomo', 2.5, 195, R('SH1 and SH3', 'SH1、SH3'), 'coach'],
  ['waitomo', 'rotorua', 2, 150, R('SH3, SH39 and SH5', 'SH3、SH39、SH5'), null],
  ['hahei', 'rotorua', 2.5, 175, R('SH25 and SH2 via Tauranga', 'SH25、SH2 经陶朗加'), null],
  ['rotorua', 'taupo', 1, 80, R('SH5 past Wai-O-Tapu', 'SH5 经怀奥塔普'), 'coach'],
  ['taupo', 'national-park', 1.5, 105, R('SH1 and SH47 past Tūrangi', 'SH1、SH47 经图朗伊'), 'shuttle'],
  ['auckland', 'national-park', 4.5, 330, R('SH1 and SH4 (or the Northern Explorer train)', 'SH1、SH4（或北方探索者火车）'), 'train', 5.5],
  ['national-park', 'wellington', 4.75, 330, R('SH4 and SH1 (or the Northern Explorer train)', 'SH4、SH1（或北方探索者火车）'), 'train', 5.5],
  ['taupo', 'napier', 2, 140, R('SH5 over the Napier–Taupō Road', 'SH5 纳皮尔—陶波公路'), 'coach'],
  ['napier', 'wellington', 4.25, 320, R('SH2 via the Wairarapa', 'SH2 经怀拉拉帕'), 'coach'],
  ['taupo', 'wellington', 4.5, 375, R('SH1 over the Desert Road', 'SH1 经沙漠公路'), 'coach'],
  ['national-park', 'new-plymouth', 3.5, 230, R('SH4 and SH3', 'SH4、SH3'), null],
  ['new-plymouth', 'wellington', 4.5, 350, R('SH3 and SH1', 'SH3、SH1'), 'coach'],
  ['auckland', 'new-plymouth', 4.5, 350, R('SH1 and SH3 via Te Kūiti', 'SH1、SH3 经蒂库伊蒂'), 'coach'],
];

// What people ask for. `base` is where they sleep; `days` the time it needs there (0.5 fits on a travel day);
// `routes` and `places` are what they do (each has its own reasons in why.js); `pt` false where the place itself
// needs a car or a tour even if a bus reaches the town.
const WISHES = [
  { id: 'christchurch', island: 'south', base: 'christchurch', days: 1, en: 'Christchurch', zh: '基督城', routes: ['bridle-path'], places: ['chch-gardens'] },
  { id: 'nelson', island: 'south', base: 'nelson', days: 1, en: 'Nelson', zh: '纳尔逊', routes: [], places: [] },
  { id: 'picton', island: 'south', base: 'picton', days: 1, en: 'Picton', zh: '皮克顿', routes: [], places: [] },
  { id: 'tekapo', island: 'south', base: 'tekapo', days: 0.5, en: 'Lake Tekapo and the dark-sky reserve', zh: '特卡波湖与暗夜星空', routes: ['mackenzie-route'], places: ['good-shepherd', 'dark-sky'] },
  { id: 'aoraki', island: 'south', base: 'aoraki', days: 1, en: 'Aoraki/Mount Cook', zh: '库克山', routes: ['hooker-valley'], places: ['tasman-lake'] },
  { id: 'wanaka', island: 'south', base: 'wanaka', days: 1, en: 'Wānaka', zh: '瓦纳卡', routes: ['roys-peak'], places: ['wanaka-tree'] },
  { id: 'queenstown', island: 'south', base: 'queenstown', days: 2, en: 'Queenstown', zh: '皇后镇', routes: ['queenstown-trail'], places: ['skyline-qt', 'shotover-jet', 'kawarau-bungy', 'arrowtown', 'glenorchy'] },
  { id: 'milford', island: 'south', base: 'te-anau', days: 1, en: 'Milford Sound', zh: '米尔福德峡湾', routes: ['milford-road'], ptRoutes: ['milford-coach'], places: ['milford-cruise'], weather: true },
  { id: 'te-anau', island: 'south', base: 'te-anau', days: 0.5, en: 'Te Anau glowworms and Fiordland walks', zh: '蒂阿瑙萤火虫洞与峡湾步道', routes: ['key-summit'], places: ['te-anau-glowworms'] },
  { id: 'glaciers', island: 'south', base: 'franz-josef', days: 1, en: 'The glaciers (Franz Josef and Fox)', zh: '冰川（弗朗茨约瑟夫与福克斯）', routes: ['lake-matheson', 'glacier-coast'], places: [], weather: true },
  { id: 'haast', island: 'south', base: 'haast', days: 0.5, en: 'Haast and the Haast Pass', zh: '哈斯特与哈斯特隘口', routes: ['haast-pass'], places: [] },
  { id: 'hokitika', island: 'south', base: 'hokitika', days: 0.5, en: 'Hokitika Gorge', zh: '霍基蒂卡峡谷', routes: [], places: ['hokitika-gorge'], pt: false },
  { id: 'punakaiki', island: 'south', base: 'punakaiki', days: 0.5, en: 'Punakaiki Pancake Rocks', zh: '普纳凯基千层岩', routes: ['paparoa-track'], places: ['pancake-rocks'] },
  { id: 'arthurs-pass', island: 'south', base: 'arthurs-pass', days: 0.5, en: 'Arthur’s Pass', zh: '亚瑟隘口', routes: ['devils-punchbowl', 'arthurs-pass'], ptRoutes: ['tranzalpine', 'devils-punchbowl'], places: [] },
  { id: 'kaikoura', island: 'south', base: 'kaikoura', days: 1, en: 'Kaikōura whales', zh: '凯库拉看鲸', routes: ['kaikoura-coast'], ptRoutes: ['coastal-pacific'], places: ['whale-watch'] },
  { id: 'abel-tasman', island: 'south', base: 'marahau', days: 1, en: 'Abel Tasman coast', zh: '亚伯塔斯曼海岸', routes: ['abel-tasman'], places: [] },
  { id: 'akaroa', island: 'south', base: 'akaroa', days: 1, en: 'Akaroa and Hector’s dolphins', zh: '阿卡罗阿与赫氏海豚', routes: ['akaroa-road'], places: ['akaroa-dolphins'] },
  { id: 'dunedin', island: 'south', base: 'dunedin', days: 1, en: 'Dunedin and the Otago Peninsula', zh: '但尼丁与奥塔哥半岛', routes: ['orbus-dunedin'], places: ['albatross'] },
  { id: 'oamaru', island: 'south', base: 'oamaru', days: 0.5, en: 'Ōamaru penguins and Moeraki Boulders', zh: '奥马鲁企鹅与莫埃拉基圆石', routes: [], places: ['oamaru-penguins', 'moeraki'] },
  { id: 'catlins', island: 'south', base: 'owaka', days: 1, en: 'The Catlins', zh: '卡特林斯', routes: ['southern-scenic'], places: [], pt: false },
  { id: 'stewart', island: 'south', base: 'oban', days: 2, en: 'Stewart Island/Rakiura', zh: '斯图尔特岛', routes: ['stewart-ferry', 'rakiura-track'], places: ['bluff'] },
  { id: 'auckland', island: 'north', base: 'auckland', days: 1, en: 'Auckland', zh: '奥克兰', routes: ['rangitoto', 'devonport-ferry'], places: ['sky-tower'] },
  { id: 'bay-of-islands', island: 'north', base: 'paihia', days: 1, en: 'Bay of Islands and Waitangi', zh: '岛屿湾与怀唐伊', routes: ['auckland-paihia'], places: [] },
  { id: 'coromandel', island: 'north', base: 'hahei', days: 1, en: 'Cathedral Cove and Hot Water Beach', zh: '教堂湾与热水海滩', routes: ['coromandel-loop'], places: ['cathedral-cove', 'hot-water-beach'], pt: false },
  { id: 'hobbiton', island: 'north', base: 'matamata', days: 0.5, en: 'Hobbiton', zh: '霍比特村', routes: [], places: ['hobbiton'] },
  { id: 'waitomo', island: 'north', base: 'waitomo', days: 0.5, en: 'Waitomo glowworm caves', zh: '怀托摩萤火虫洞', routes: [], places: ['waitomo'] },
  { id: 'rotorua', island: 'north', base: 'rotorua', days: 1, en: 'Rotorua geothermal and Māori culture', zh: '罗托鲁瓦地热与毛利文化', routes: [], places: ['te-puia', 'wai-o-tapu', 'redwoods', 'polynesian-spa'] },
  { id: 'taupo', island: 'north', base: 'taupo', days: 0.5, en: 'Lake Taupō and Huka Falls', zh: '陶波湖与胡卡瀑布', routes: ['huka-falls'], places: ['huka'] },
  { id: 'tongariro', island: 'north', base: 'national-park', days: 1, en: 'Tongariro Alpine Crossing', zh: '汤加里罗高山穿越', routes: ['tongariro-crossing', 'taranaki-falls'], places: [], weather: true },
  { id: 'napier', island: 'north', base: 'napier', days: 1, en: 'Napier art deco', zh: '纳皮尔装饰艺术小城', routes: [], places: [], whyFrom: 'wellington-napier' },
  { id: 'wellington', island: 'north', base: 'wellington', days: 1, en: 'Wellington', zh: '惠灵顿', routes: ['escarpment-track'], places: ['te-papa', 'zealandia', 'cable-car'] },
  { id: 'taranaki', island: 'north', base: 'new-plymouth', days: 1, en: 'Taranaki and the Pouākai Crossing', zh: '塔拉纳基与波阿凯穿越', routes: ['pouakai-crossing'], places: ['three-sisters'], weather: true },
];

// One plain line on what to do there, for places without a route guide and for the Milford day trip.
const P10_WISH_TIPS = {
  milford:{zh:'米尔福德住宿极少，通常住蒂阿瑙，当天往返（SH94 单程约 2 小时，118 km），游船需预订。',en:'There are very few beds at Milford Sound; most visitors stay in Te Anau and go out and back (SH94, about 2 h, 118 km each way). Book the cruise ahead.'},
  rotorua:{zh:'地热公园和毛利文化表演选一两处即可，多数需预订。',en:'Pick one or two geothermal parks or a Māori cultural evening; most need booking.'},
  hobbiton:{zh:'霍比特村只能跟团参观，约 2 小时，需提前预订。',en:'Hobbiton is by guided tour only, about 2 hours; book ahead.'},
  waitomo:{zh:'萤火虫洞游览约 45 分钟，需预订。',en:'The glowworm cave tour takes about 45 minutes; book ahead.'},
  tekapo:{zh:'傍晚去好牧羊人教堂，晚上看星空（观星团需预订）。',en:'Visit the Church of the Good Shepherd at dusk and stay for the stars (stargazing tours need booking).'},
  kaikoura:{zh:'观鲸船约 3 小时，受海况影响，建议安排在上午。',en:'Whale-watching boats take about 3 hours and depend on the sea; go in the morning.'},
  stewart:{zh:'奥本镇周边步道和乌尔瓦岛观鸟，可按天气安排。',en:'Short walks around Oban and birdwatching on Ulva Island, arranged around the weather.'},
  catlins:{zh:'沿南部风景公路看瀑布、灯塔和海岸，需要自驾。',en:'Waterfalls, lighthouses and coast along the Southern Scenic Route; you need a car.'},
};

// Suggestions link to existing guides. These are ideas for independent planning, not scheduled activities.
const P10_GUIDES = {
  bridle:['Bridle Path','Bridle Path 步道'], punchbowl:['Devil’s Punchbowl Walk','魔鬼瀑布步道'],
  hooker:['Hooker Valley Track','胡克谷步道'], matheson:['Lake Matheson Walk','马瑟森湖环线'],
  'roys-peak':['Roys Peak Track','罗伊峰步道'], 'abel-tasman':['Abel Tasman Coast Track','亚伯塔斯曼海岸步道'],
  'tongariro-crossing':['Tongariro Alpine Crossing','汤加里罗高山穿越'], keysummit:['Key Summit Track','Key Summit 高山步道'],
  'milford-track':['Milford Track','米尔福德步道'], 'routeburn-track':['Routeburn Track','路特本步道'],
  'ni-huka':['Spa Park to Huka Falls','Spa Park 至胡卡瀑布步道'], 'ni-rangitoto':['Rangitoto Summit Track','朗伊托托登顶步道'],
  'ni-manaia':['Mount Manaia Track','马奈亚山步道'], 'ni-escarpment':['Escarpment Track','海崖步道'],
  greattaste:['Great Taste Trail','塔斯曼美味骑行'], alps2ocean:['Alps 2 Ocean','Alps 2 Ocean 骑行'],
  queenstowncycle:['Queenstown cycling route','皇后镇河谷骑行'], wilderness:['West Coast Wilderness Trail','西海岸荒野骑行'],
  'ni-k2k':['Great Lake Trail K2K','陶波大湖骑行道 K2K'], 'ni-hauraki':['Hauraki Rail Trail','豪拉基铁路骑行道'],
  haast:['Haast Pass road','哈斯特隘口公路'], milford:['Milford Road','米尔福德公路'], arthurs:['Arthur’s Pass road','亚瑟隘口公路'],
  aorakidrive:['Christchurch to Aoraki road','基督城至库克山公路'], coastroad:['Picton to Christchurch road','皮克顿至基督城公路'],
  'ni-volcanicloop':['Volcanic loop road','北岛火山环线'], 'ni-thermalexplorer':['Rotorua and Taupō road','罗托鲁瓦与陶波公路'],
  'ni-coromandel':['Coromandel loop road','科罗曼德环线'], 'ni-twincoast-drive':['Twin Coast road','北地双海岸公路'],
  'ni-martinborough':['Martinborough road','马丁堡公路'], catlins:['Catlins coastal road','卡特林斯海岸公路'],
  tranzalpine:['TranzAlpine train','高山观景列车'], coastal:['Coastal Pacific train','海岸太平洋列车'],
  pictonnelson:['Picton to Nelson coach','皮克顿至纳尔逊巴士'], teanaubus:['Queenstown to Te Anau coach','皇后镇至蒂阿瑙巴士'],
  dunedinbus:['Dunedin to Christchurch coach','但尼丁至基督城巴士'], 'ni-northernexplorer':['Northern Explorer train','北方探索者火车'],
  'ni-devonportferry':['Devonport ferry','德文波特渡轮'], 'ni-aucklandpaihia':['Auckland to Paihia coach','奥克兰至派希亚巴士'],
  'ni-rotoruataupo':['Rotorua to Taupō coach','罗托鲁瓦至陶波巴士'], 'ni-kapitirail':['Kāpiti train','卡皮蒂火车'],
  'ni-wellingtonnapier':['Wellington to Napier coach','惠灵顿至纳皮尔巴士']
};
const P10_WISH_GUIDES = {
  christchurch:{walk:['bridle'],transit:['tranzalpine']}, nelson:{cycle:['greattaste'],transit:['pictonnelson']},
  picton:{drive:['coastroad'],transit:['coastal','pictonnelson']}, tekapo:{cycle:['alps2ocean'],drive:['aorakidrive']},
  aoraki:{walk:['hooker'],drive:['aorakidrive']}, wanaka:{walk:['roys-peak'],drive:['haast']},
  queenstown:{walk:['routeburn-track'],cycle:['queenstowncycle'],transit:['teanaubus']},
  milford:{walk:['keysummit'],drive:['milford']}, 'te-anau':{walk:['keysummit'],drive:['milford'],transit:['teanaubus']},
  glaciers:{walk:['matheson']}, haast:{drive:['haast']}, hokitika:{cycle:['wilderness']},
  'arthurs-pass':{walk:['punchbowl'],drive:['arthurs'],transit:['tranzalpine']}, kaikoura:{drive:['coastroad'],transit:['coastal']},
  'abel-tasman':{walk:['abel-tasman'],cycle:['greattaste']}, dunedin:{transit:['dunedinbus']}, catlins:{drive:['catlins']},
  auckland:{walk:['ni-rangitoto'],transit:['ni-devonportferry','ni-aucklandpaihia']},
  'bay-of-islands':{drive:['ni-twincoast-drive'],transit:['ni-aucklandpaihia']}, coromandel:{drive:['ni-coromandel'],cycle:['ni-hauraki']},
  rotorua:{drive:['ni-thermalexplorer'],transit:['ni-rotoruataupo']}, taupo:{walk:['ni-huka'],cycle:['ni-k2k'],drive:['ni-volcanicloop']},
  tongariro:{walk:['tongariro-crossing'],drive:['ni-volcanicloop'],transit:['ni-northernexplorer']},
  napier:{transit:['ni-wellingtonnapier']}, wellington:{walk:['ni-escarpment'],drive:['ni-martinborough'],transit:['ni-kapitirail','ni-northernexplorer']}
};
function p10Suggestions(wishId,preference){
  return (P10_WISH_GUIDES[wishId]?.[preference]||[]).filter(id=>P10_GUIDES[id]).map(id=>({id,en:P10_GUIDES[id][0],zh:P10_GUIDES[id][1]}));
}
function p10LegDescription(leg,lang){
  if(leg.mode==='train'){
    const pair=new Set([leg.a,leg.b]);
    if((pair.has('arthurs-pass')||pair.has('greymouth'))&&(pair.has('christchurch')||pair.has('arthurs-pass'))) return lang==='zh'?'高山观景列车 TranzAlpine':'TranzAlpine train';
    if(pair.has('national-park'))return lang==='zh'?'北方探索者列车':'Northern Explorer train';
    if(pair.has('kaikoura'))return lang==='zh'?'海岸太平洋列车':'Coastal Pacific train';
    return lang==='zh'?'火车':'Train';
  }
  return (leg.road[lang]||'').replace(/南下|北上/g,'').replace(/\b(north|south|down|up)\b/gi,'');
}

/* Pounamu Atlas local road planner. Travel weights are internal to route planning. */
function p10Net(car) {
  const graph = Object.fromEntries(Object.keys(NODES).map(id => [id, []]));
  for (const [a,b,h,km,road,pt,ptH] of EDGES) {
    if ((!car && !pt) || (car && (a === 'oban' || b === 'oban'))) continue;
    const mode = pt === 'ferry' ? 'ferry' : car ? 'car' : pt;
    const time = mode === 'ferry' && (a === 'picton' || b === 'picton') ? h + 1 : car ? h : ptH ?? Math.round(h * 1.3 * 4) / 4;
    graph[a].push({a,b,h:time,km,road,mode}); graph[b].push({a:b,b:a,h:time,km,road,mode});
  }
  const memo = {};
  function shortest(start) {
    if (memo[start]) return memo[start];
    const dist = {[start]:0}, prev = {}, remaining = new Set(Object.keys(graph));
    while (remaining.size) {
      let u = null;
      for (const k of remaining) if (dist[k] != null && (u === null || dist[k] < dist[u])) u = k;
      if (u === null) break;
      remaining.delete(u);
      for (const e of graph[u]) if (dist[e.b] == null || dist[u] + e.h < dist[e.b]) { dist[e.b] = dist[u] + e.h; prev[e.b] = e; }
    }
    return memo[start] = {dist,prev};
  }
  return {
    hours: (a,b) => a === b ? 0 : shortest(a).dist[b] ?? Infinity,
    path(a,b) { if (a === b) return []; const {dist,prev}=shortest(a); if (dist[b] == null) return null; const legs=[]; for (let n=b;n!==a;n=prev[n].a) legs.unshift(prev[n]); return legs; }
  };
}
function p10Order(net,start,end,stops) {
  const cost = order => order.reduce((sum,w,i)=>sum+net.hours(i?order[i-1].base:start,w.base),0)+net.hours(order.length?order[order.length-1].base:start,end);
  if (stops.length <= 8) {
    let best = [], bestCost = Infinity;
    function perm(rest,order,soFar) {
      if (soFar >= bestCost) return;
      if (!rest.length) { const total=soFar+net.hours(order.length?order[order.length-1].base:start,end); if (total<bestCost) {bestCost=total;best=order;} return; }
      const at=order.length?order[order.length-1].base:start;
      rest.forEach((w,i)=>perm([...rest.slice(0,i),...rest.slice(i+1)],[...order,w],soFar+net.hours(at,w.base)));
    }
    perm(stops,[],0); return best;
  }
  let at=start, left=[...stops], order=[];
  while(left.length){left.sort((a,b)=>net.hours(at,a.base)-net.hours(at,b.base)); const next=left.shift(); order.push(next); at=next.base;}
  for(let changed=true;changed;){changed=false;for(let i=0;i<order.length-1;i++)for(let j=i+1;j<order.length;j++){const candidate=[...order.slice(0,i),...order.slice(i,j+1).reverse(),...order.slice(j+1)];if(cost(candidate)+1e-8<cost(order)){order=candidate;changed=true;}}}
  return order;
}
function p10Build(input, wanted) {
  const net=p10Net(input.car), reachable=wanted.filter(w=>net.hours(input.start,w.base)<Infinity && net.hours(w.base,input.end)<Infinity && (input.car || w.pt!==false));
  const inaccessible=wanted.filter(w=>!reachable.includes(w));
  if (net.hours(input.start,input.end)===Infinity) return {days:[],order:[],inaccessible,disconnected:true};
  const order=p10Order(net,input.start,input.end,reachable), stream=[]; let at=input.start;
  for(const w of order){for(const leg of net.path(at,w.base))stream.push({type:'leg',leg});stream.push({type:'activity',wish:w});at=w.base;}
  for(const leg of net.path(at,input.end))stream.push({type:'leg',leg});
  const cap=input.car?(Number(input.pace)||5):6.5;
  const days=[{kind:'arrive',at:input.start,legs:[],activities:[],used:0}]; let day=days[0];
  function open(){day={kind:'travel',at:days[days.length-1].at,legs:[],activities:[],used:0}; days.push(day);return day;}
  for(const item of stream){
    if(item.type==='leg'){
      if(day.kind==='arrive'||day.kind==='activity'||(day.used+item.leg.h>cap&&day.used))open();
      day.legs.push(item.leg);day.used+=item.leg.h;day.at=item.leg.b;
    }else if(item.wish.days<1){
      if(day.kind==='arrive'||day.kind==='activity'||day.used+3>cap)open();
      day.activities.push({wish:item.wish,part:1,total:1});day.used+=3;
    }else{
      for(let n=1;n<=Math.ceil(item.wish.days);n++){day={kind:'activity',at:item.wish.base,legs:[],activities:[{wish:item.wish,part:n,total:Math.ceil(item.wish.days)}],used:0};days.push(day);}
    }
  }
  days.push({kind:'depart',at:input.end,legs:[],activities:[],used:0});
  return {days,order,inaccessible,disconnected:false};
}
function p10Plan(input) {
  if (!NODES[input.start]?.hub || !NODES[input.end]?.hub || !Number.isInteger(input.days)||input.days<3||input.days>21 || !Array.isArray(input.wishes)) throw new Error('invalid_input');
  const wanted=[...new Set(input.wishes)].map(id=>WISHES.find(w=>w.id===id)).filter(Boolean);
  const plan=p10Build(input,wanted), minimum=plan.days.length;
  let suggestion=null;
  if(minimum>input.days){
    const candidates=plan.order.map(w=>({wish:w,days:p10Build(input,plan.order.filter(x=>x!==w)).days.length})).sort((a,b)=>a.days-b.days);
    if(candidates[0]&&candidates[0].days<minimum)suggestion=candidates[0];
  }
  let fits=null;
  if(minimum>input.days){
    let keep=[...plan.order];
    while(keep.length&&p10Build(input,keep).days.length>input.days){
      const next=keep.map(w=>({w,days:p10Build(input,keep.filter(x=>x!==w)).days.length})).sort((a,b)=>a.days-b.days)[0];
      keep=keep.filter(x=>x!==next.w);
    }
    fits={keep:keep.map(w=>w.id),dropped:plan.order.filter(w=>!keep.includes(w)),days:p10Build(input,keep).days.length};
  }
  return {...plan,minimum,spare:Math.max(0,input.days-minimum),suggestion,fits,input};
}
function p10Timeline(plan) {
  if (plan.disconnected || !plan.days.length) return [];
  let days=plan.days.map(d=>({...d,legs:[...d.legs],activities:[...d.activities]}));
  let spare=Math.max(0,plan.input.days-days.length);
  const staged=[], seen=new Set();
  for(const day of days.slice(0,-1)){
    staged.push(day);
    for(const a of day.activities){
      if(spare && a.wish.weather && day.at===a.wish.base && a.part===a.total && !seen.has(a.wish.id)){
        staged.push({kind:'weather',at:day.at,weatherWish:a.wish,legs:[],activities:[],used:0});seen.add(a.wish.id);spare--;
      }
    }
  }
  for(let i=0;i<spare;i++) staged.push({kind:'free',at:plan.input.end,legs:[],activities:[],used:0});
  staged.push(days[days.length-1]);
  return staged.map((d,i)=>({...d,n:i+1}));
}
function p10AlongWay(plan){
  if(plan.disconnected || plan.minimum>plan.input.days || !plan.spare) return [];
  const routeNodes=new Set(plan.days.flatMap(d=>d.legs.flatMap(l=>[l.a,l.b])));
  const selected=new Set(plan.input.wishes),priority=['wanaka','aoraki','arthurs-pass','haast','hokitika'];
  return WISHES.filter(w=>routeNodes.has(w.base) && w.base!==plan.input.start && w.base!==plan.input.end && !selected.has(w.id) && !plan.inaccessible.some(i=>i.id===w.id) && (plan.input.car||w.pt!==false))
    .filter(w=>p10Build(plan.input,[...plan.order,w]).days.length<=plan.input.days)
    .sort((a,b)=>{const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);return (ai<0?100:ai)-(bi<0?100:bi);}).slice(0,2);
}
function p10Duration(hours,lang){
  const minutes=Math.round(hours*60),h=Math.floor(minutes/60),m=minutes%60;
  if(lang==='zh') return (h?`${h}小时`:'')+(m?`${m}分钟`:h?'':'0分钟');
  return (h?`${h}h`:'')+(m?`${h?' ':''}${m}min`:h?'':'0 min');
}
function p10DailyTime(hours,lang){
  return p10Duration(hours,lang);
}
function p10BreakStops(day){
  const stops=day.legs.slice(0,-1).map(l=>l.b).filter((x,i,a)=>a.indexOf(x)===i);
  const priority=['haast','wanaka','arthurs-pass','hokitika'];
  return [...stops].sort((a,b)=>{const ai=priority.indexOf(a),bi=priority.indexOf(b);return (ai<0?100:ai)-(bi<0?100:bi);}).slice(0,2);
}
if (typeof module !== 'undefined' && module.exports) module.exports={p10Plan,p10Timeline,p10AlongWay,p10Duration,p10DailyTime,p10BreakStops,p10Net,p10Suggestions,p10LegDescription,P10_WISH_GUIDES,NODES,WISHES};

if (typeof window !== 'undefined') {
  let p10Result=null, p10Recommendation=null;
  const p10$=selector=>document.querySelector(selector);
  const p10Text=()=>document.documentElement.lang.startsWith('zh') ? {
    start:'从哪里出发',end:'从哪里离开',days:'旅行天数',pace:'每天自驾节奏',pace35:'最多 3.5 小时',pace5:'最多 5 小时',pace65:'最多 6.5 小时',places:'想去哪些地方？',choose:'选择多个目的地',transport:'城市之间怎么走',car:'自驾',public:'公共交通',preference:'偏好的活动',method:'是否使用 Jev 推荐',local:'本地规划',jev:'Jev 辅助推荐',submit:'生成行程',
    consent:'只有勾选同意，才会把所选岛屿、天数和活动方式发送给 TypeSafe，服务方也会收到请求 IP；地点和起终点不会发送。',statusConsent:'请先同意，再使用 Jev 推荐。',loading:'正在请求 Jev 推荐…',error:'Jev 推荐暂不可用，下面仍显示本地规划。',reco:'Jev 建议另行了解',
    disclaimer:'出发前请查看 NZTA 路况和各线路链接的官方信息。',min:'至少需要',have:'你选择了',drop:'可增加天数或移除',unreachable:'以下地点目前无法按所选交通方式衔接，需另行安排',disconnected:'起点与终点之间缺少可用的交通连接，请改选交通方式或另行安排。',unknownNight:'',day:'第',dayEnd:'天',arrive:'抵达',depart:'离开',night:'住',check:'',activity:'安排时间游览',localTransport:'景点与步道起点的当地接驳不包含在行程中。',ferry:'渡轮',train:'火车',coach:'大巴',shuttle:'接驳车',road:'自驾',hour:'小时',dropNo:'请减少目的地或增加天数。',sources:'路况与交通来源'
  } : {
    start:'Start city',end:'Departure city',days:'Days available',pace:'Daily driving pace',pace35:'Up to 3.5 hours',pace5:'Up to 5 hours',pace65:'Up to 6.5 hours',places:'Where would you like to go?',choose:'Choose multiple destinations',transport:'Between towns',car:'Drive',public:'Public transport',preference:'Preferred activity',method:'Jev suggestions',local:'Local plan',jev:'Jev-assisted suggestion',submit:'Build itinerary',
    consent:'Only with your consent, the selected island, days and activity type are sent to TypeSafe, which also receives the request IP. Your selected places and start/end are not sent.',statusConsent:'Please consent before using Jev.',loading:'Requesting a Jev suggestion…',error:'Jev is unavailable; the local plan is shown below.',reco:'Additional Jev suggestion',
    disclaimer:'Check NZTA road conditions and the linked official information before you go.',min:'Minimum days',have:'Days selected',drop:'Removing this destination may reduce the trip to',unreachable:'These places need separate transport with the selected mode',disconnected:'No available connection is modelled between the start and end. Choose another mode or arrange this separately.',unknownNight:'',day:'Day ',dayEnd:'',arrive:'Arrive in',depart:'Depart from',night:'Overnight',check:'',activity:'Allow time to explore',localTransport:'Check local transport to sights and trailheads and return separately.',ferry:'Ferry',train:'Train',coach:'Coach',shuttle:'Shuttle',road:'Drive',hour:'h',dropNo:'Remove a destination or add more days.',sources:'Road and transport sources'
  };
  const p10Esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p10Lang=()=>document.documentElement.lang.startsWith('zh')?'zh':'en';
  const p10Name=id=>NODES[id]?.[p10Lang()]||id;
  function p10Status(text){const s=p10$('#plannerStatus');if(s)s.textContent=text||'';}
  // Coastline is the same Natural Earth base used by the homepage; road segments are schematic town-to-town connections.
  const P10_COAST = "M335.6,93.1L336.2,95.4L338.3,93.8L339.9,91.2L342.4,88.5L342.1,92.8L343.4,93.7L351.8,96.7L353.5,99.2L355.3,99.9L356.3,98.5L357.5,97.7L360.6,99.3L367.4,103.6L368.0,105.1L367.7,107.3L368.0,109.7L368.9,111.5L371.2,112.0L374.3,109.2L375.7,108.9L377.7,112.8L378.5,115.0L378.1,114.9L379.4,117.1L381.2,119.3L384.2,125.8L383.7,128.1L382.9,130.1L385.6,136.1L383.8,136.5L378.4,135.5L378.6,136.7L381.7,141.0L384.4,147.2L386.5,151.0L394.0,162.5L392.9,166.6L393.1,169.4L392.1,171.7L394.7,177.8L393.1,179.7L392.0,186.0L390.9,187.1L391.0,189.4L394.0,190.0L395.9,191.0L397.4,192.8L398.4,190.6L399.8,190.0L403.4,193.0L410.9,196.0L413.0,197.1L414.0,199.5L414.8,205.3L416.3,207.9L419.1,208.3L422.3,207.6L423.2,205.4L422.6,199.7L420.4,190.6L420.4,187.7L420.7,184.7L420.2,181.7L419.0,178.9L417.8,176.8L416.3,175.0L416.8,172.2L419.1,170.9L420.5,173.3L421.7,176.2L427.6,184.6L431.0,184.0L431.3,187.5L433.7,191.1L435.0,195.3L436.7,207.7L439.3,219.5L444.1,224.6L444.6,227.0L441.7,225.8L440.8,226.5L441.1,227.7L443.8,230.0L447.0,231.1L449.0,230.9L450.8,231.7L463.1,239.4L469.0,242.3L484.0,247.2L488.3,247.6L490.6,247.4L495.1,245.7L499.1,242.7L502.5,238.2L505.5,233.0L508.8,230.5L512.5,228.6L514.3,226.7L516.3,225.4L526.3,226.0L529.7,228.6L534.1,230.7L536.4,232.4L535.6,235.7L533.0,240.5L530.9,245.9L529.2,258.0L527.9,270.3L526.1,275.7L522.8,279.9L519.2,282.9L515.0,284.4L513.3,291.3L512.5,299.5L512.7,301.6L514.1,303.2L514.6,305.6L512.4,310.5L511.2,309.8L509.4,305.7L507.8,304.0L502.8,302.7L497.7,302.1L493.3,302.5L489.1,304.2L482.7,307.8L480.7,309.6L479.0,311.9L476.1,317.0L475.4,323.2L475.5,326.4L476.5,329.0L482.0,332.4L476.6,344.4L471.8,356.9L469.1,360.4L465.9,363.7L463.0,371.2L457.9,377.7L454.4,382.6L451.7,387.7L449.3,393.2L444.2,400.9L442.0,405.9L439.0,410.2L433.6,415.6L427.8,420.2L418.6,426.6L416.1,428.7L413.4,430.2L410.0,428.4L409.4,426.4L408.6,422.1L407.9,420.5L403.6,419.2L398.0,421.3L397.1,420.8L396.8,419.8L396.8,413.5L397.8,411.7L396.5,410.7L395.2,411.1L394.7,412.7L395.5,414.1L392.3,415.8L389.0,415.9L388.0,415.2L387.7,414.0L388.5,412.1L389.6,410.4L395.8,402.4L402.2,391.7L407.8,380.3L409.2,374.4L411.3,363.5L409.6,359.0L407.5,354.7L401.9,346.5L394.5,341.8L389.7,341.2L385.1,339.5L380.8,335.5L376.9,330.9L369.1,327.1L361.0,324.1L356.3,319.9L355.2,317.4L354.5,314.5L354.6,311.8L355.1,309.1L356.1,307.0L357.5,305.4L366.2,300.0L375.3,296.9L377.0,297.0L378.7,296.5L380.9,294.7L385.0,290.4L386.2,287.5L387.0,278.5L388.4,269.5L390.7,259.3L394.3,252.9L395.5,249.0L394.0,242.6L395.4,240.3L397.0,238.9L398.8,238.0L395.7,232.0L392.0,222.9L391.3,220.1L391.8,217.3L392.7,214.5L390.4,213.8L389.1,211.2L385.8,202.3L386.7,200.9L388.6,201.9L391.5,208.3L391.9,205.0L394.1,203.0L396.4,201.9L398.9,201.7L393.3,194.6L391.4,194.8L388.9,196.0L386.4,196.7L383.9,196.1L381.6,194.5L380.4,191.5L378.9,185.7L378.0,183.6L370.7,171.8L372.8,171.4L378.8,177.3L379.9,175.4L380.8,172.7L380.5,169.7L379.1,167.4L377.0,165.9L376.9,163.2L378.5,160.7L378.4,159.0L375.0,155.5L373.7,155.1L373.1,156.8L374.0,159.2L373.1,159.5L364.9,153.1L362.3,147.9L360.2,142.3L360.0,144.6L360.3,147.8L363.6,154.3L368.9,161.5L369.8,163.4L369.0,165.9L367.2,166.6L365.6,165.1L363.1,158.9L361.4,155.8L341.1,123.8L343.7,119.6L347.7,116.0L348.6,114.4L349.2,112.5L347.5,112.2L346.0,113.1L344.3,114.7L342.7,116.6L340.7,120.7L339.7,121.7L337.3,118.8L336.4,117.0L336.5,114.9L335.8,113.6L334.1,113.1L331.5,108.9L329.8,106.8L332.6,102.6L332.6,97.2L329.8,91.5L326.5,86.3L320.0,77.8L314.1,68.9L320.5,67.8L327.0,67.6L324.0,72.9L325.3,76.0L327.4,78.6L331.9,86.7L332.3,89.0L334.5,91.3L335.6,93.1ZM422.3,161.0L422.6,163.8L419.7,162.8L418.5,160.7L415.3,158.5L414.8,157.9L414.4,153.7L416.1,151.7L416.4,150.8L417.2,150.5L418.5,152.7L421.1,155.8L422.3,161.0ZM329.8,413.5L334.2,413.8L338.2,410.1L342.4,407.0L346.8,404.6L353.5,398.8L355.2,398.0L359.6,396.9L361.5,395.6L363.6,395.2L361.7,398.6L359.3,399.8L358.9,401.0L360.2,402.9L358.1,405.7L358.2,409.1L355.8,413.1L359.5,411.5L360.9,408.9L360.2,407.4L361.9,404.4L364.4,403.0L363.4,400.8L363.4,399.1L366.5,399.7L368.1,399.6L369.3,398.9L371.5,398.7L372.0,400.6L375.0,400.4L373.9,402.9L371.6,405.7L371.1,407.5L367.4,410.4L364.9,411.6L368.7,411.9L374.3,408.1L377.6,404.6L377.5,408.9L374.8,412.7L372.5,415.2L369.9,415.9L367.4,417.9L366.1,421.1L366.2,423.2L367.0,424.9L369.6,427.8L366.7,433.3L369.9,432.6L371.7,433.6L374.3,436.8L372.7,440.5L371.7,442.3L365.3,450.1L362.5,454.0L359.2,456.5L359.2,460.6L357.4,463.6L347.8,473.8L346.1,476.1L338.6,492.4L333.8,499.2L331.0,501.5L328.1,503.4L321.1,506.7L318.0,510.4L314.6,513.5L311.0,514.2L311.1,515.5L313.4,516.3L315.2,518.3L313.9,520.6L311.3,522.0L308.7,522.4L307.3,523.9L313.7,522.8L315.5,524.0L315.8,526.5L316.5,528.8L318.0,531.8L323.3,533.7L328.1,534.5L329.1,535.9L329.8,540.7L328.9,543.0L327.9,544.6L326.2,545.1L322.3,545.4L318.4,544.3L315.8,541.5L308.4,542.4L306.4,543.0L305.4,542.5L309.5,539.5L307.3,537.7L305.6,537.1L303.6,538.1L302.3,539.7L301.9,542.3L300.6,543.8L298.5,544.2L295.7,542.1L292.8,539.0L288.6,535.8L289.2,537.8L292.5,542.5L294.1,545.6L290.3,548.2L286.4,550.1L283.1,551.3L279.9,553.0L276.3,555.8L274.2,556.8L268.9,556.9L266.0,557.8L265.0,561.4L263.0,563.8L258.3,564.2L260.0,565.0L261.1,566.1L257.9,577.2L257.3,581.8L256.7,589.7L254.7,597.0L249.1,596.9L250.0,598.2L254.2,600.3L253.4,603.4L248.8,609.0L246.8,612.3L244.9,620.3L242.1,627.6L237.7,636.0L237.7,637.5L239.2,639.6L241.1,641.4L241.2,644.0L240.6,645.4L238.5,645.7L236.7,646.6L227.0,648.9L223.8,651.5L221.2,656.1L218.1,660.0L207.9,668.8L201.9,676.1L200.7,678.2L199.1,679.8L186.0,683.2L176.7,683.7L171.6,682.9L166.7,681.1L164.0,680.5L158.9,681.6L156.6,682.8L152.6,681.6L149.4,682.5L148.4,681.6L147.2,679.5L147.9,676.6L147.0,674.5L144.9,673.0L143.6,671.4L142.0,670.2L137.7,669.7L131.0,670.5L128.8,670.4L124.2,663.4L122.7,661.6L117.2,659.4L115.4,659.7L112.5,663.5L110.7,664.1L100.5,664.5L90.2,663.3L86.4,661.9L85.7,658.7L93.5,649.7L91.2,650.9L86.4,654.6L83.3,654.0L86.3,650.0L86.5,648.3L85.9,646.3L81.9,649.6L77.4,650.1L76.8,647.0L77.2,643.4L78.1,642.4L90.4,640.5L94.9,639.3L96.8,637.4L89.4,636.7L89.0,634.0L90.0,631.8L96.3,628.3L91.7,629.2L86.5,628.8L86.9,625.1L88.2,622.1L93.6,622.0L91.9,620.0L91.7,617.1L93.2,616.9L98.7,620.8L102.6,622.2L101.0,619.3L101.2,617.5L102.2,616.6L105.4,616.1L104.6,615.6L101.5,614.8L97.9,612.6L97.5,610.3L97.7,607.6L101.6,604.0L103.9,606.2L106.6,605.6L104.5,603.8L103.2,601.3L104.1,599.6L112.3,592.7L114.4,599.3L114.9,597.1L115.1,595.0L114.1,593.2L114.2,591.4L115.2,589.9L118.7,588.3L123.3,583.3L126.7,580.9L129.4,582.4L131.3,584.5L131.0,582.5L129.7,580.8L129.3,576.2L135.5,569.0L142.3,562.2L148.8,555.0L152.2,552.4L159.6,549.5L164.3,550.7L165.5,550.5L172.5,545.3L175.4,544.0L178.1,545.8L179.7,546.5L178.1,541.8L179.4,539.6L185.2,535.8L192.5,531.9L198.1,530.3L202.2,527.6L204.7,527.5L204.3,525.5L204.7,523.6L206.9,523.7L207.5,523.0L205.6,521.9L211.7,518.0L215.0,513.8L216.7,512.9L218.2,511.6L220.2,508.7L222.5,507.7L224.6,508.2L226.1,509.6L225.3,507.2L222.6,505.8L225.5,503.7L228.5,502.3L231.4,503.4L234.3,505.0L231.4,502.5L231.0,500.9L234.5,499.0L236.4,498.4L239.0,501.9L238.7,499.2L239.3,496.7L243.0,492.8L248.0,486.2L249.6,488.5L249.8,491.2L249.6,494.6L250.6,493.4L250.9,490.4L250.2,485.1L256.4,475.2L257.6,474.1L258.9,473.4L261.1,473.1L260.4,471.6L258.7,470.2L260.4,465.2L261.4,459.4L262.9,453.9L265.2,448.5L267.7,439.5L269.6,437.7L274.7,437.0L277.0,435.7L280.8,432.5L285.3,426.6L287.7,421.9L290.8,409.6L292.6,396.7L297.6,387.2L305.1,380.3L311.7,375.1L314.3,374.0L318.9,373.6L323.2,375.1L315.2,376.4L314.3,379.5L314.1,382.6L315.0,385.4L316.5,388.0L320.4,390.3L324.9,391.7L327.0,397.1L327.3,403.4L328.0,408.8L329.8,413.5ZM360.2,392.5L355.1,395.4L355.3,393.4L356.3,389.0L358.6,386.7L359.8,386.6L362.1,384.9L361.9,388.6L360.2,392.5ZM87.0,634.5L86.8,637.0L86.4,638.2L85.0,638.3L83.1,638.0L81.1,636.8L79.9,637.2L78.8,636.7L80.2,633.9L84.7,632.5L86.4,633.7L87.0,634.5ZM95.9,610.5L97.5,616.5L94.1,615.4L92.6,613.5L95.3,610.5L95.9,610.5ZM140.3,695.4L140.3,697.5L136.4,696.7L136.4,699.0L139.6,700.2L140.7,701.8L144.0,701.3L144.7,703.8L144.0,705.9L141.8,707.5L135.4,708.3L131.2,711.5L127.6,711.0L126.6,711.3L122.5,714.7L117.8,715.7L116.6,715.5L117.2,712.5L120.7,709.6L120.7,706.8L121.6,704.6L124.9,703.1L125.0,700.2L127.2,697.7L125.8,692.2L126.6,687.2L133.1,687.0L140.3,695.4Z";
  const P10_DAY_COLORS=['#b44e2d','#225a4b','#9b5c1d','#4d5c8a','#8c3862','#446e28','#8b501b','#315d71','#944c40','#605292','#46695e','#a13e2e'];
  const p10MapPoint=id=>{const at=NODES[id]?.at;if(!at)return null;return [392.5+(at[1]-174.76)*38.05,189.7+(-at[0]-36.85)*50.5]};
  function p10TripMap(days){
    const zh=p10Lang()==='zh', dots=new Map();
    const lines=days.map(d=>{const ids=d.legs.length?[d.legs[0].a,...d.legs.map(l=>l.b)]:[d.at],coords=ids.map(p10MapPoint).filter(Boolean),color=P10_DAY_COLORS[(d.n-1)%P10_DAY_COLORS.length];
      ids.forEach(id=>{if(!dots.has(id)&&p10MapPoint(id))dots.set(id,p10MapPoint(id))});
      if(!coords.length)return '';const points=coords.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ');
      const attrs=`data-p10-map-line="${d.n}" data-points="${points}" data-places="${p10Esc(ids.map(p10Name).join(' → '))}"`;
      return coords.length>1?`<polyline ${attrs} points="${points}" stroke="${color}"/>`:`<circle ${attrs} cx="${coords[0][0]}" cy="${coords[0][1]}" r="3" fill="${color}"/>`;
    }).join('');
    const names=[...dots].map(([id,p])=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"><title>${p10Esc(p10Name(id))}</title></circle>`).join('');
    const selectors=days.map(d=>`<button type="button" data-p10-map-day="${d.n}" aria-pressed="false" style="--day-color:${P10_DAY_COLORS[(d.n-1)%P10_DAY_COLORS.length]}">${zh?'第 '+d.n+' 天':'Day '+d.n}</button>`).join('');
    return `<section class="p10-map-panel" id="p10-trip-map" aria-label="${zh?'行程地图':'Itinerary map'}"><div class="p10-map-heading"><div><p>${zh?'逐日路线':'DAY BY DAY'}</p><h2>${zh?'行程地图':'Your trip map'}</h2></div><p>${zh?'选择某一天，查看当天经过的地点。':'Choose a day to focus on its stops.'}</p></div><div class="p10-map-day-list" aria-label="${zh?'选择日期':'Choose a day'}"><button type="button" data-p10-map-day="all" aria-pressed="true">${zh?'全部':'All days'}</button>${selectors}</div><p class="p10-map-selection" role="status" aria-live="polite">${zh?'显示全部行程地点':'Showing all itinerary stops'}</p><svg class="p10-trip-svg" viewBox="0 0 680 820" role="img" aria-label="${zh?'行程地点与每日路段示意图':'Schematic map of itinerary stops and daily connections'}"><rect width="680" height="820" fill="#e2ece8"/><path class="p10-coast" d="${P10_COAST}"/><g class="p10-map-lines">${lines}</g><g class="p10-map-dots">${names}</g></svg><p class="p10-map-note">${zh?'地点之间的连线为示意，不能用于导航。':'Connections between places are schematic, not for navigation.'} <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · <a href="https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/" target="_blank" rel="noopener noreferrer">LINZ</a> / <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p></section>`;
  }
  function p10FocusDay(day){
    const panel=p10$('#p10-trip-map'),svg=panel?.querySelector('.p10-trip-svg');if(!svg)return;
    panel.querySelectorAll('[data-p10-map-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p10MapDay===day)));
    const lines=[...panel.querySelectorAll('[data-p10-map-line]')];lines.forEach(l=>l.classList.toggle('p10-muted-line',day!=='all'&&l.dataset.p10MapLine!==day));
    const status=panel.querySelector('.p10-map-selection');
    const current=day==='all'?null:lines.find(l=>l.dataset.p10MapLine===day);if(day!=='all'&&!current)return;
    status.textContent=day==='all'?(p10Lang()==='zh'?'显示全部行程地点':'Showing all itinerary stops'):(p10Lang()==='zh'?`第 ${day} 天：`:`Day ${day}: `)+current.dataset.places;
    const points=(current?[current]:lines).flatMap(line=>line.dataset.points.split(' ').map(p=>p.split(',').map(Number)));if(!points.length)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const h=Math.min(820,Math.max(220,(Math.max(...ys)-Math.min(...ys))*2.1,(Math.max(...xs)-Math.min(...xs))*2.1*820/680)),w=h*680/820;
    svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);
  }
  function p10Show(result){
    const el=p10$('#planResult');if(!el||!result)return;const x=p10Text(),zh=p10Lang()==='zh';
    if(result.disconnected){el.innerHTML=`<p class="p10-warning">${x.disconnected}</p>`;return;}
    const notices=[];
    if(result.minimum>result.input.days){
      const f=result.fits,dropped=f?f.dropped.map(w=>p10Esc(w[p10Lang()])).join(zh?'、':', '):'';
      const more=result.minimum<=21?`<button type="button" class="p10-add-stop" data-p10-days="${result.minimum}">${zh?`改成 ${result.minimum} 天`:`Change to ${result.minimum} days`}</button>`:'';
      const trim=f&&f.dropped.length&&f.dropped.length<result.order.length?`<button type="button" class="p10-add-stop" data-p10-trim="1">${zh?`只保留排得下的地方（去掉${dropped}）`:`Keep what fits (drop ${dropped})`}</button>`:`<button type="button" class="p10-add-stop" data-p10-edit="1">${zh?'调整目的地':'Choose different places'}</button>`;
      el.innerHTML=`<p class="p10-warning">${zh?`这些地方至少需要 ${result.minimum} 天，你选了 ${result.input.days} 天。`:`These places need at least ${result.minimum} days; you chose ${result.input.days}.`}</p><div class="p10-along">${more} ${trim}</div>`;
      return;
    }
    if(result.inaccessible.length)notices.push(`<p class="p10-warning">${x.unreachable}：${result.inaccessible.map(w=>p10Esc(w[p10Lang()])).join('、')}。</p>`);
    const suggestions=p10AlongWay(result);
    if(suggestions.length)notices.push(`<div class="p10-along"><span>${zh?'还可以加入顺路地点：':'Add a stop along the way:'}</span> ${suggestions.map(w=>`<button type="button" class="p10-add-stop" data-p10-add="${p10Esc(w.id)}">＋ ${p10Esc(w[p10Lang()])}</button>`).join(' ')}</div>`);
    const timeline=p10Timeline(result);
    const rows=timeline.map(d=>{
      const number=d.n;
      if(d.kind==='weather'||d.kind==='free'){
        const title=d.kind==='weather'?(zh?`${p10Esc(p10Name(d.at))} · 天气机动日`:`${p10Esc(p10Name(d.at))} · weather buffer day`):(zh?`${p10Esc(p10Name(d.at))} · 自由活动日`:`${p10Esc(p10Name(d.at))} · free day`);
        const description=d.kind==='weather'?(zh?'天气不好时用来改期；天气适合时可自由活动。':'Use this day to reschedule if weather disrupts your plans; otherwise enjoy free time.'):(zh?'在离开城市自由活动。':'Enjoy free time in your departure city.');
        return `<article class="plan-day"><button class="p10-day-focus" type="button" data-p10-focus="${number}">${x.day}${number}${x.dayEnd} <span aria-hidden="true">↗</span></button><span class="plan-day-title">${title}</span><p>${description}</p><p>${x.night}：${p10Esc(p10Name(d.at))}</p></article>`;
      }
      const heading=d.kind==='arrive'?`${x.arrive} ${p10Esc(p10Name(d.at))}`:d.kind==='depart'?`${x.depart} ${p10Esc(p10Name(d.at))}`:d.legs.length?`${p10Esc(p10Name(d.legs[0].a))} → ${p10Esc(p10Name(d.at))}`:`${x.activity} ${d.activities.map(a=>p10Esc(a.wish[p10Lang()])).join('、')}`;
      const legs=d.legs.map(l=>{const road=p10LegDescription(l,p10Lang());const mode=x[l.mode]||x.road;const duration=p10Duration(l.h,p10Lang());return `<li>${p10Esc(p10Name(l.a))} → ${p10Esc(p10Name(l.b))} · ${p10Esc(road)} · ${mode}${zh?'约':' about '}${duration}${l.km>0?` · ${l.km} km`:''}</li>`;}).join('');
      const travel=d.legs.reduce((sum,l)=>sum+l.h,0),driving=d.legs.filter(l=>l.mode==='car').reduce((sum,l)=>sum+l.h,0),pace=Number(result.input.pace)||5;
      const total=travel>0?`<p class="p10-daily-total">${zh?'当天路上约':'Travel today: about '}${p10DailyTime(travel,p10Lang())}${zh?'（不含当地接驳）':' (local connections excluded)'}</p>`:'';
      const stops=p10BreakStops(d),names=stops.map(id=>p10Esc(p10Name(id))).join(zh?'或':' or ');
      const longDay=driving>pace?`<p class="p10-warning p10-long-day">${zh?'这天开车较长':'This is a long driving day'}${names?(zh?`，可以在${names}多住一晚并调整行程。`:`; consider an overnight stop in ${names} and adjust the itinerary.`):(zh?'，可以在途中多住一晚并调整行程。':'; consider an overnight stop and adjust the itinerary.')}</p>`:'';
      const activities=d.activities.map(a=>{const suggested=p10Suggestions(a.wish.id,result.input.preference);const guides=suggested.map(g=>`<a href="route.html?id=${encodeURIComponent(g.id)}&amp;lang=${p10Lang()}">${p10Esc(g[p10Lang()])}</a>`).join(' · ');const note=zh?'当天线路：':'Route for the day: ';const tip=P10_WISH_TIPS[a.wish.id]?.[p10Lang()]||'';return `<p>${x.activity}：${p10Esc(a.wish[p10Lang()])}${a.total>1?` (${a.part}/${a.total})`:''}。${tip?' '+p10Esc(tip):''} ${x.localTransport}</p>${suggested.length?`<p class="p10-suggestions">${note}${guides}</p>`:''}`;}).join('');
      const arrivalTip=d.kind==='arrive'?(zh?'抵达后建议休息，避免落地当天长途驾驶。':'Rest after arrival and avoid a long drive on the first day.') : '';
      return `<article class="plan-day"><button class="p10-day-focus" type="button" data-p10-focus="${number}">${x.day}${number}${x.dayEnd} <span aria-hidden="true">↗</span></button><span class="plan-day-title">${heading}</span>${arrivalTip?`<p>${arrivalTip}</p>`:''}${legs?`<ul class="p10-legs">${legs}</ul>`:''}${total}${longDay}${activities}${d.kind==='depart'?'':`<p>${x.night}：${p10Esc(p10Name(d.at))}</p>`}</article>`;
    }).join('');
    const reco=p10Recommendation?`<p>${x.reco}：<a href="route.html?id=${encodeURIComponent(p10Recommendation)}&amp;lang=${p10Lang()}">${p10Esc(p10Recommendation)}</a></p>`:'';
    el.innerHTML=`${notices.join('')}${reco}${p10TripMap(timeline)}${rows}<p class="planner-small">${x.sources}: <a href="https://www.journeys.nzta.govt.nz/" target="_blank" rel="noopener noreferrer">NZTA</a> · <a href="https://www.intercity.co.nz/" target="_blank" rel="noopener noreferrer">InterCity</a> · <a href="https://www.greatjourneysnz.com/" target="_blank" rel="noopener noreferrer">KiwiRail</a></p>`;
    p10FocusDay('all');
  }
  window.renderP10Planner=function(){
    if(!p10$('#plannerForm'))return;const x=p10Text(),lang=p10Lang();
    for(const [id,key] of [['p10-start-label','start'],['p10-end-label','end'],['p10-days-label','days'],['p10-pace-label','pace'],['p10-pace-35','pace35'],['p10-pace-5','pace5'],['p10-pace-65','pace65'],['p10-wishes-label','places'],['p10-choose','choose'],['p10-transport-label','transport'],['p10-car-label','car'],['p10-public-label','public'],['p10-preference-label','preference'],['p10-method-label','method'],['p10-local-label','local'],['p10-jev-label','jev'],['p10-submit','submit'],['p10-consent-text','consent']]){const el=document.getElementById(id);if(el)el.textContent=x[key];}
    for(const s of [p10$('#p10-start'),p10$('#p10-end')]) for(const o of s.options)o.textContent=NODES[o.value][lang];
    for(const label of document.querySelectorAll('[data-p10-wish]')){const w=WISHES.find(item=>item.id===label.dataset.p10Wish);label.querySelector('span').textContent=w[lang];}
    p10Show(p10Result);
  };
  window.setupP10Planner=function(){
    const form=p10$('#plannerForm');if(!form||form.dataset.p10Ready)return;form.dataset.p10Ready='1';
    const hubs=Object.entries(NODES).filter(([,n])=>n.hub);
    for(const id of ['p10-start','p10-end'])p10$('#'+id).innerHTML=hubs.map(([key,n])=>`<option value="${key}">${p10Esc(n.zh)}</option>`).join('');
    p10$('#p10-start').value='christchurch';p10$('#p10-end').value='queenstown';
    p10$('#days').innerHTML=Array.from({length:19},(_,i)=>`<option value="${i+3}">${i+3}</option>`).join('');p10$('#days').value='7';
    p10$('#p10-wishes').innerHTML=WISHES.map(w=>`<label data-p10-wish="${p10Esc(w.id)}"><input type="checkbox" name="p10-wish" value="${p10Esc(w.id)}"><span>${p10Esc(w.zh)}</span></label>`).join('');
    const method=p10$('#plannerMethod'), jevAvailable=Boolean(window.TripPlanner?.jevEnabled);
    const methodLabel=p10$('#p10-method-label'), jevOption=p10$('#p10-jev-label');
    method.hidden=!jevAvailable;if(methodLabel)methodLabel.hidden=!jevAvailable;if(jevOption)jevOption.disabled=!jevAvailable;
    if(!jevAvailable){method.value='local';p10$('#jevConsent').hidden=true;}
    method.addEventListener('change',()=>{p10$('#jevConsent').hidden=method.value!=='jev';p10$('#jevConsentCheck').checked=false;p10Status('');});
    try{const saved=JSON.parse(localStorage.getItem('p10-road-plan'));if(saved){for(const [selector,value] of [['#p10-start',saved.start],['#p10-end',saved.end],['#days',saved.days],['#p10-pace',saved.pace],['#preference',saved.preference],['#p10-transport',saved.car?'car':'public']])if(value!=null&&p10$(selector).querySelector(`option[value="${String(value)}"]`))p10$(selector).value=String(value);for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=(saved.wishes||[]).includes(box.value);}}catch{}
    p10$('#planResult').addEventListener('click',event=>{
      const focus=event.target.closest('[data-p10-focus],[data-p10-map-day]');if(focus){const day=focus.dataset.p10Focus||focus.dataset.p10MapDay;p10FocusDay(day);if(focus.dataset.p10Focus)p10$('#p10-trip-map')?.scrollIntoView({behavior:'auto',block:'start'});return;}
      const edit=event.target.closest('[data-p10-edit]');
      if(edit){const choices=form.querySelector('.p10-choices');choices.open=true;choices.scrollIntoView({behavior:'auto',block:'start'});choices.querySelector('summary')?.focus({preventScroll:true});return;}
      const more=event.target.closest('[data-p10-days]'),trim=event.target.closest('[data-p10-trim]');
      if((more||trim)&&p10Result){
        const input=more?{...p10Result.input,days:Number(more.dataset.p10Days)}:{...p10Result.input,wishes:p10Result.fits.keep};
        if(more)p10$('#days').value=String(input.days);
        if(trim)for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=input.wishes.includes(box.value);
        try{p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));p10Show(p10Result);p10Status('');}catch{p10Status(p10Lang()==='zh'?'请检查出发地、终点和天数。':'Check the start, destination and days.');}
        return;
      }
      const add=event.target.closest('[data-p10-add]');if(!add||!p10Result)return;
      const id=add.dataset.p10Add, checkbox=[...form.querySelectorAll('[name=p10-wish]')].find(box=>box.value===id);
      if(!checkbox)return;checkbox.checked=true;
      const input={...p10Result.input,wishes:[...new Set([...p10Result.input.wishes,id])]};
      try{p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));p10Show(p10Result);p10Status(p10Lang()==='zh'?'已加入目的地并重新排行程。':'Stop added; the itinerary has been updated.');}catch{p10Status(p10Lang()==='zh'?'暂时无法加入这个地点。':'Could not add this stop.');}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();const x=p10Text(),methodValue=method.value;
      if(methodValue==='jev'&&!p10$('#jevConsentCheck').checked){p10Status(x.statusConsent);return;}
      const start=p10$('#p10-start').value,end=p10$('#p10-end').value,days=Number(p10$('#days').value),pace=Number(p10$('#p10-pace').value),preference=p10$('#preference').value,car=p10$('#p10-transport').value==='car',wishes=Array.from(form.querySelectorAll('[name=p10-wish]:checked'),e=>e.value);
      const input={start,end,days,pace,preference,car,wishes};p10Recommendation=null;p10Status('');
      if(methodValue==='jev'){
        const button=form.querySelector('button[type=submit]');button.disabled=true;p10Status(x.loading);
        try{const northern=new Set(['auckland','wellington','rotorua']);p10Recommendation=await window.TripPlanner.chooseWithJev({days,preference,island:northern.has(start)?'north':'south'});p10Status('');}catch{p10Status(x.error);}finally{button.disabled=false;}
      }
      try{p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));p10Show(p10Result);}catch{p10Status(p10Lang()==='zh'?'请检查出发地、终点和天数。':'Check the start, destination and days.');}
    });
    window.renderP10Planner();
  };
}

})();
