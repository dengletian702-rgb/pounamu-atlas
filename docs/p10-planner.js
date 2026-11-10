(function(){
// The road and transport network the trip finder plans on: towns, the roads between them, and the places people
// ask for. Driving hours were read segment by segment from NZTA Journey Planner on 2026-11-10 (one query each,
// with the traffic at that moment) and rounded to the nearest quarter hour; the raw reading for every segment is in
// EDGE_SOURCES below and in data/nzta/. NZTA shows no distance, so km is still a planning estimate (except
// Te Anau–Milford, 120 km from the DOC brochure). The page labels every leg "Estimate (NZTA query <date>)".
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
  'arthurs-pass': { at: [-42.94, 171.56], en: 'Arthur’s Pass', zh: '亚瑟通道' },
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
  napier: { at: [-39.49, 176.91], en: 'Napier', zh: '内皮尔' },
  'new-plymouth': { at: [-39.06, 174.08], en: 'New Plymouth', zh: '新普利茅斯' },
};

const R = (en, zh) => ({ en, zh });
// [from, to, hours, km, road, pt, ptH]
const EDGES = [
  ['christchurch', 'akaroa', 1.5, 82, R('SH75 over Banks Peninsula', 'SH75 翻越班克斯半岛'), 'shuttle'],
  ['christchurch', 'arthurs-pass', 2, 150, R('SH73 across the Canterbury Plains to Arthur’s Pass', 'SH73 穿过坎特伯雷平原上亚瑟通道'), 'train'],
  ['arthurs-pass', 'greymouth', 1.25, 98, R('SH73 down the Ōtira Viaduct to the West Coast', 'SH73 经奥蒂拉高架桥下到西海岸'), 'train'],
  ['greymouth', 'hokitika', 0.5, 40, R('SH6 along the coast', 'SH6 沿海岸'), 'coach'],
  ['greymouth', 'punakaiki', 0.75, 45, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['punakaiki', 'westport', 0.75, 57, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['westport', 'nelson', 3, 225, R('SH6 through the Buller Gorge', 'SH6 穿过布勒峡谷'), 'coach'],
  ['nelson', 'marahau', 1, 67, R('SH60 to the Abel Tasman', 'SH60 到亚伯塔斯曼'), 'shuttle'],
  ['nelson', 'picton', 2, 110, R('SH6 via Havelock (or Queen Charlotte Drive)', 'SH6 经哈夫洛克（或夏洛特皇后公路）'), 'coach'],
  ['picton', 'kaikoura', 2, 155, R('SH1 down the Kaikōura coast', 'SH1 沿凯库拉海岸南下'), 'train'],
  ['kaikoura', 'christchurch', 2.5, 180, R('SH1', 'SH1'), 'train'],
  ['hokitika', 'franz-josef', 2, 135, R('SH6 south through the rainforest', 'SH6 穿雨林南下'), 'coach'],
  ['franz-josef', 'fox', 0.5, 25, R('SH6', 'SH6'), 'coach'],
  ['fox', 'haast', 1.5, 120, R('SH6 along the glacier coast', 'SH6 沿冰川海岸'), 'coach'],
  ['haast', 'wanaka', 2, 140, R('SH6 over the Haast Pass', 'SH6 翻越哈斯特隘口'), 'coach'],
  ['wanaka', 'queenstown', 1.25, 67, R('Crown Range Road (coaches use SH6)', '皇冠山脉公路（大巴绕 SH6）'), 'coach', 1.5],
  ['wanaka', 'twizel', 1.75, 143, R('SH8 over the Lindis Pass', 'SH8 翻越林迪斯隘口'), 'coach'],
  ['queenstown', 'twizel', 2.5, 185, R('SH6 and SH8 via Cromwell and the Lindis Pass', 'SH6、SH8 经克伦威尔和林迪斯隘口'), 'coach'],
  ['twizel', 'tekapo', 0.75, 58, R('SH8 past Lake Pukaki', 'SH8 经普卡基湖'), 'coach'],
  ['twizel', 'aoraki', 0.75, 65, R('SH80 along Lake Pukaki to Aoraki/Mount Cook', 'SH80 沿普卡基湖到奥拉基／库克山'), 'shuttle'],
  ['christchurch', 'tekapo', 3, 226, R('SH1, SH79 and SH8 via Geraldine and Fairlie', 'SH1、SH79、SH8 经杰拉尔丁和费尔利'), 'coach'],
  ['queenstown', 'te-anau', 2.25, 170, R('SH6 and SH94', 'SH6、SH94'), 'coach'],
  ['te-anau', 'milford', 1.75, 120, R('SH94 Milford Road (check NZTA for avalanche closures)', 'SH94 米尔福德公路（冬季注意雪崩封路）'), 'coach'],
  ['te-anau', 'invercargill', 1.75, 150, R('SH94 and SH1', 'SH94、SH1'), 'coach'],
  ['invercargill', 'bluff', 0.25, 30, R('SH1', 'SH1'), 'shuttle'],
  ['bluff', 'oban', 1, 0, R('Foveaux Express ferry across Foveaux Strait', 'Foveaux Express 渡轮穿过福沃海峡'), 'ferry'],
  ['invercargill', 'owaka', 1.75, 150, R('Southern Scenic Route through the Catlins', '南部风景公路穿过卡特林斯'), null],
  ['owaka', 'dunedin', 1.5, 115, R('Southern Scenic Route and SH1', '南部风景公路、SH1'), null],
  ['invercargill', 'dunedin', 2.5, 205, R('SH1', 'SH1'), 'coach'],
  ['dunedin', 'queenstown', 3.5, 280, R('SH8 through Central Otago', 'SH8 穿过中奥塔哥'), 'coach'],
  ['dunedin', 'oamaru', 1.5, 113, R('SH1 past Moeraki', 'SH1 经莫埃拉基'), 'coach'],
  ['oamaru', 'christchurch', 3, 245, R('SH1', 'SH1'), 'coach'],
  ['oamaru', 'twizel', 1.75, 130, R('SH83 up the Waitaki Valley', 'SH83 沿怀塔基河谷'), null],
  ['picton', 'wellington', 3.5, 0, R('Cook Strait ferry (Interislander or Bluebridge)', '库克海峡渡轮（Interislander 或 Bluebridge）'), 'ferry'],
  // North Island
  ['auckland', 'paihia', 3, 230, R('SH1 north', 'SH1 北上'), 'coach'],
  ['auckland', 'hahei', 2.25, 175, R('SH2 and SH25 to the Coromandel', 'SH2、SH25 到科罗曼德'), null],
  ['auckland', 'hamilton', 1.25, 125, R('SH1 Waikato Expressway', 'SH1 怀卡托高速'), 'coach'],
  ['hamilton', 'matamata', 0.75, 60, R('SH26 and SH27', 'SH26、SH27'), 'coach'],
  ['hamilton', 'waitomo', 1, 75, R('SH39 and SH3', 'SH39、SH3'), 'coach'],
  ['hamilton', 'rotorua', 1.5, 110, R('SH1 and SH5 via Tīrau', 'SH1、SH5 经蒂劳'), 'coach'],
  ['hamilton', 'taupo', 2, 150, R('SH1 via Tokoroa', 'SH1 经托科罗阿'), 'coach'],
  ['auckland', 'matamata', 2, 160, R('SH1 and SH27', 'SH1、SH27'), 'coach'],
  ['matamata', 'rotorua', 1, 65, R('SH27 and SH5 via Tīrau', 'SH27、SH5 经蒂劳'), 'coach'],
  ['auckland', 'waitomo', 2.25, 195, R('SH1 and SH3', 'SH1、SH3'), 'coach'],
  ['waitomo', 'rotorua', 2, 150, R('SH3, SH39 and SH5', 'SH3、SH39、SH5'), null],
  ['hahei', 'rotorua', 3, 175, R('SH25 and SH2 via Tauranga', 'SH25、SH2 经陶朗加'), null],
  ['rotorua', 'taupo', 1, 80, R('SH5 past Wai-O-Tapu', 'SH5 经怀奥塔普'), 'coach'],
  ['taupo', 'national-park', 1.5, 105, R('SH1 and SH47 past Tūrangi', 'SH1、SH47 经图朗伊'), 'shuttle'],
  ['auckland', 'national-park', 4, 330, R('SH1 and SH4 (or the Northern Explorer train)', 'SH1、SH4（或北方探索者火车）'), 'train', 5.5],
  ['national-park', 'wellington', 3.75, 330, R('SH4 and SH1 (or the Northern Explorer train)', 'SH4、SH1（或北方探索者火车）'), 'train', 5.5],
  ['taupo', 'napier', 1.75, 140, R('SH5 over the Napier–Taupō Road', 'SH5 内皮尔—陶波公路'), 'coach'],
  ['napier', 'wellington', 3.75, 320, R('SH2 via the Wairarapa', 'SH2 经怀拉拉帕'), 'coach'],
  ['taupo', 'wellington', 4.75, 375, R('SH1 over the Desert Road', 'SH1 经沙漠公路'), 'coach'],
  ['national-park', 'new-plymouth', 3.5, 230, R('SH4 and SH3', 'SH4、SH3'), null],
  ['new-plymouth', 'wellington', 4.5, 350, R('SH3 and SH1', 'SH3、SH1'), 'coach'],
  ['auckland', 'new-plymouth', 4.5, 350, R('SH1 and SH3 via Te Kūiti', 'SH1、SH3 经蒂库伊蒂'), 'coach'],
];


// One source record per road segment (review items 1.2 and v3.1 B8). Written by
// scripts/authoring/apply-nzta-readings.mjs from data/nzta/readings-<date>.txt. 'nzta-time-read' = driving time read
// in NZTA Journey Planner on `checkedAt` (raw text in `nzta`, the planner's previous figure in `hoursBefore`); km not
// shown by NZTA. Ferry legs have no NZTA record and keep the default ('estimate').
const EDGE_SOURCE_DEFAULT = { status: 'estimate', check: 'NZTA Journey Planner', url: 'https://www.journeys.nzta.govt.nz/journey-planner', checkedAt: null };
const EDGE_SOURCES = {
  "christchurch|akaroa": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJAe3FY0gvMm0RRZl5hIbvAAU&b=ChIJE95FCQrMM20RoFp5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "基督城, 新西兰", to: "阿卡罗阿, 新西兰", route: "State Hwy 75", time: "1h 25m", minutes: 85, traffic: null, readAt: "2026-11-10T05:37:48.797Z" }, hoursBefore: 1.5 },
  "christchurch|arthurs-pass": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJAe3FY0gvMm0RRZl5hIbvAAU&b=ChIJdfshttlFLm0RF8W10-BJv7Q", checkedAt: "2026-11-10", nzta: { from: "基督城, 新西兰", to: "Arthur's Pass Village, 新西兰", route: "State Hwy 73", time: "2h 4m", minutes: 124, traffic: "1 min slower than normal", readAt: "2026-11-10T05:37:53.751Z" }, hoursBefore: 2 },
  "arthurs-pass|greymouth": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJdfshttlFLm0RF8W10-BJv7Q&b=ChIJUxDVTdk_L20RoHJ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Arthur's Pass Village, 新西兰", to: "格雷茅斯, 新西兰", route: "State Hwy 73", time: "1h 18m", minutes: 78, traffic: "5 min slower than normal", readAt: "2026-11-10T05:37:58.340Z" }, hoursBefore: 1.5 },
  "greymouth|hokitika": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJUxDVTdk_L20RoHJ5hIbvAAU&b=ChIJc79FEBc7L20RgHd5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "格雷茅斯, 新西兰", to: "霍基蒂卡, 新西兰", route: "State Hwy 6", time: "29 mins", minutes: 29, traffic: "1 min slower than normal", readAt: "2026-11-10T05:38:03.208Z" }, hoursBefore: 0.5 },
  "greymouth|punakaiki": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJUxDVTdk_L20RoHJ5hIbvAAU&b=ChIJr6gS1juFJW0RgKV5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "格雷茅斯, 新西兰", to: "普纳凯基, 新西兰", route: "State Hwy 6", time: "44 mins", minutes: 44, traffic: "4 min slower than normal", readAt: "2026-11-10T05:38:07.955Z" }, hoursBefore: 0.75 },
  "punakaiki|westport": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJr6gS1juFJW0RgKV5hIbvAAU&b=ChIJ9SsJQ8hsJW0R0MN5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "普纳凯基, 新西兰", to: "Westport, 新西兰", route: "State Hwy 6", time: "52 mins", minutes: 52, traffic: "5 min slower than normal", readAt: "2026-11-10T05:38:12.544Z" }, hoursBefore: 0.75 },
  "westport|nelson": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ9SsJQ8hsJW0R0MN5hIbvAAU&b=ChIJfS63kcTsO20RgKSW54jvAAo", checkedAt: "2026-11-10", nzta: { from: "Westport, 新西兰", to: "尼爾遜, 新西兰", route: "State Hwy 6", time: "3h 1m", minutes: 181, traffic: "7 min slower than normal", readAt: "2026-11-10T05:38:17.155Z" }, hoursBefore: 3.25 },
  "nelson|marahau": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJfS63kcTsO20RgKSW54jvAAo&b=ChIJDX3UOqx-PG0RcNB5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "尼爾遜, 新西兰", to: "Mārahau, 新西兰", route: "State Hwy 60", time: "59 mins", minutes: 59, traffic: "1 min slower than normal", readAt: "2026-11-10T05:38:22.013Z" }, hoursBefore: 1 },
  "nelson|picton": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJfS63kcTsO20RgKSW54jvAAo&b=ChIJBTjUpOomOW0RYKF5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "尼爾遜, 新西兰", to: "Picton, 新西兰", route: "State Hwy 6", time: "1h 56m", minutes: 116, traffic: "3 min slower than normal", readAt: "2026-11-10T05:39:04.696Z" }, hoursBefore: 2 },
  "picton|kaikoura": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJBTjUpOomOW0RYKF5hIbvAAU&b=ChIJdXyRNDogOm0RNpl5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Picton, 新西兰", to: "凯库拉, 新西兰", route: "SH 1", time: "2h 3m", minutes: 123, traffic: "5 min slower than normal", readAt: "2026-11-10T05:39:09.881Z" }, hoursBefore: 2 },
  "kaikoura|christchurch": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJdXyRNDogOm0RNpl5hIbvAAU&b=ChIJAe3FY0gvMm0RRZl5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "凯库拉, 新西兰", to: "基督城, 新西兰", route: "SH 1", time: "2h 26m", minutes: 146, traffic: null, readAt: "2026-11-10T05:39:14.819Z" }, hoursBefore: 2.5 },
  "hokitika|franz-josef": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJc79FEBc7L20RgHd5hIbvAAU&b=ChIJHWUmvV_RK20RaxSyBZVTB70", checkedAt: "2026-11-10", nzta: { from: "霍基蒂卡, 新西兰", to: "法兰士·约瑟夫冰川, West Coast Region 7886, 新西兰", route: "State Hwy 6", time: "1h 53m", minutes: 113, traffic: "5 min slower than normal", readAt: "2026-11-10T05:39:19.488Z" }, hoursBefore: 2 },
  "franz-josef|fox": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHWUmvV_RK20RaxSyBZVTB70&b=ChIJ_epAj4UvKm0RcG55hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "法兰士·约瑟夫冰川, West Coast Region 7886, 新西兰", to: "Fox Glacier, 新西兰", route: "State Hwy 6", time: "33 mins", minutes: 33, traffic: "2 min slower than normal", readAt: "2026-11-10T05:39:24.176Z" }, hoursBefore: 0.5 },
  "fox|haast": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ_epAj4UvKm0RcG55hIbvAAU&b=ChIJZ5vYbCWd1WwR0HJ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Fox Glacier, 新西兰", to: "Haast, 新西兰", route: "State Hwy 6", time: "1h 37m", minutes: 97, traffic: "6 min slower than normal", readAt: "2026-11-10T05:39:28.831Z" }, hoursBefore: 2 },
  "haast|wanaka": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJZ5vYbCWd1WwR0HJ5hIbvAAU&b=ChIJby3suR1G1akR4MF5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Haast, 新西兰", to: "瓦纳卡, 新西兰", route: "State Hwy 6", time: "2h 1m", minutes: 121, traffic: "1 min faster than normal", readAt: "2026-11-10T05:39:33.539Z" }, hoursBefore: 2.25 },
  "wanaka|queenstown": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJby3suR1G1akR4MF5hIbvAAU&b=ChIJX96o1_Ed1akRAKZ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "瓦纳卡, 新西兰", to: "皇后镇, 新西兰", route: "Cardrona Valley Rd和Crown Range Rd", time: "1h 10m", minutes: 70, traffic: "2 min slower than normal", readAt: "2026-11-10T05:39:38.427Z" }, hoursBefore: 1 },
  "wanaka|twizel": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJby3suR1G1akR4MF5hIbvAAU&b=ChIJv-27KHPgKm0RALt5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "瓦纳卡, 新西兰", to: "Twizel, 新西兰", route: "State Hwy 8", time: "1h 45m", minutes: 105, traffic: "2 min slower than normal", readAt: "2026-11-10T05:40:09.148Z" }, hoursBefore: 1.75 },
  "queenstown|twizel": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJX96o1_Ed1akRAKZ5hIbvAAU&b=ChIJv-27KHPgKm0RALt5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "皇后镇, 新西兰", to: "Twizel, 新西兰", route: "State Hwy 6和State Hwy 8", time: "2h 31m", minutes: 151, traffic: "1 min slower than normal", readAt: "2026-11-10T05:40:14.018Z" }, hoursBefore: 2.25 },
  "twizel|tekapo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJv-27KHPgKm0RALt5hIbvAAU&b=ChIJmawxwRqZK20RwIJ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Twizel, 新西兰", to: "Lake Tekapo, 新西兰", route: "State Hwy 8", time: "42 mins", minutes: 42, traffic: "1 min slower than normal", readAt: "2026-11-10T05:40:18.823Z" }, hoursBefore: 0.75 },
  "twizel|aoraki": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJv-27KHPgKm0RALt5hIbvAAU&b=ChIJFWw41lJLKm0R3YsgAVilIgA", checkedAt: "2026-11-10", nzta: { from: "Twizel, 新西兰", to: "Aoraki Mount Cook Village, Mount Cook National Park 7999, 新西兰", route: "State Hwy 80", time: "51 mins", minutes: 51, traffic: "2 min slower than normal", readAt: "2026-11-10T05:40:23.666Z" }, hoursBefore: 0.75 },
  "christchurch|tekapo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJAe3FY0gvMm0RRZl5hIbvAAU&b=ChIJmawxwRqZK20RwIJ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "基督城, 新西兰", to: "Lake Tekapo, 新西兰", route: "SH 1和State Hwy 79", time: "2h 53m", minutes: 173, traffic: "2 min faster than normal", readAt: "2026-11-10T05:40:28.286Z" }, hoursBefore: 3 },
  "queenstown|te-anau": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJX96o1_Ed1akRAKZ5hIbvAAU&b=ChIJa15mlSBt1KkRULR5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "皇后镇, 新西兰", to: "蒂阿瑙, 新西兰", route: "State Hwy 6和State Hwy 94", time: "2h 11m", minutes: 131, traffic: "4 min slower than normal", readAt: "2026-11-10T05:40:32.966Z" }, hoursBefore: 2 },
  "te-anau|milford": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJa15mlSBt1KkRULR5hIbvAAU&b=ChIJ4UlLuk3g1akRAN5kq4bvACo", checkedAt: "2026-11-10", nzta: { from: "蒂阿瑙, 新西兰", to: "米爾福德峽灣, 南地大區, 新西兰", route: "State Hwy 94", time: "1h 51m", minutes: 111, traffic: "8 min slower than normal", readAt: "2026-11-10T05:40:37.941Z" }, hoursBefore: 2, km: { status: 'checked', source: 'DOC — Te Anau–Milford Highway brochure (120 km)', url: 'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf', checkedAt: '2026-11-10' } },
  "te-anau|invercargill": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJa15mlSBt1KkRULR5hIbvAAU&b=ChIJ12kUrJTE0qkRIKSW54jvAAo", checkedAt: "2026-11-10", nzta: { from: "蒂阿瑙, 新西兰", to: "因弗卡吉尔, 新西兰", route: "State Hwy 94和State Hwy 6", time: "1h 50m", minutes: 110, traffic: "1 min faster than normal", readAt: "2026-11-10T05:40:42.673Z" }, hoursBefore: 2 },
  "invercargill|bluff": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ12kUrJTE0qkRIKSW54jvAAo&b=ChIJu0c6TmS40qkRkGF5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "因弗卡吉尔, 新西兰", to: "布拉夫, 新西兰", route: "SH 1", time: "20 mins", minutes: 20, traffic: "1 min faster than normal", readAt: "2026-11-10T05:41:12.652Z" }, hoursBefore: 0.5 },
  "invercargill|owaka": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ12kUrJTE0qkRIKSW54jvAAo&b=ChIJCZC19cOxLagRkJx5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "因弗卡吉尔, 新西兰", to: "Owaka, 新西兰", route: "SH 1、State Hwy 93和Owaka Valley Rd", time: "1h 38m", minutes: 98, traffic: "1 min faster than normal", readAt: "2026-11-10T05:41:17.307Z" }, hoursBefore: 2 },
  "owaka|dunedin": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJCZC19cOxLagRkJx5hIbvAAU&b=ChIJPVFfD-DkK6gRQZl5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Owaka, 新西兰", to: "但尼丁, 新西兰", route: "Southern Scenic Rte", time: "1h 27m", minutes: 87, traffic: "3 min slower than normal", readAt: "2026-11-10T05:41:22.287Z" }, hoursBefore: 1.5 },
  "invercargill|dunedin": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ12kUrJTE0qkRIKSW54jvAAo&b=ChIJPVFfD-DkK6gRQZl5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "因弗卡吉尔, 新西兰", to: "但尼丁, 新西兰", route: "SH 1和SH 1", time: "2h 35m", minutes: 155, traffic: "2 min slower than normal", readAt: "2026-11-10T05:41:27.323Z" }, hoursBefore: 2.75 },
  "dunedin|queenstown": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJPVFfD-DkK6gRQZl5hIbvAAU&b=ChIJX96o1_Ed1akRAKZ5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "但尼丁, 新西兰", to: "皇后镇, 新西兰", route: "State Hwy 8", time: "3h 37m", minutes: 217, traffic: "1 min slower than normal", readAt: "2026-11-10T05:41:31.969Z" }, hoursBefore: 3.5 },
  "dunedin|oamaru": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJPVFfD-DkK6gRQZl5hIbvAAU&b=ChIJeQZQVPd1KagR4O95hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "但尼丁, 新西兰", to: "Oamaru, 新西兰", route: "SH 1", time: "1h 28m", minutes: 88, traffic: "1 min slower than normal", readAt: "2026-11-10T05:41:36.983Z" }, hoursBefore: 1.25 },
  "oamaru|christchurch": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJeQZQVPd1KagR4O95hIbvAAU&b=ChIJAe3FY0gvMm0RRZl5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Oamaru, 新西兰", to: "基督城, 新西兰", route: "SH 1", time: "3h 6m", minutes: 186, traffic: "5 min faster than normal", readAt: "2026-11-10T05:41:41.668Z" }, hoursBefore: 3 },
  "oamaru|twizel": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJeQZQVPd1KagR4O95hIbvAAU&b=ChIJv-27KHPgKm0RALt5hIbvAAU", checkedAt: "2026-11-10", nzta: { from: "Oamaru, 新西兰", to: "Twizel, 新西兰", route: "State Hwy 83", time: "1h 46m", minutes: 106, traffic: "5 min slower than normal", readAt: "2026-11-10T05:41:46.644Z" }, hoursBefore: 1.75 },
  "auckland|paihia": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJTx6ROraiC20RgPOiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "派希亚, 新西兰", route: "SH 1和SH 1", time: "3h 1m", minutes: 181, traffic: "1 min slower than normal", readAt: "2026-11-10T05:43:47.658Z" }, hoursBefore: 3.25 },
  "auckland|hahei": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJb6g_wXVCcm0R8MiiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "Hahei, 新西兰", route: "SH 1和State Hwy 25", time: "2h 19m", minutes: 139, traffic: "1 min faster than normal", readAt: "2026-11-10T05:43:52.364Z" }, hoursBefore: 2.5 },
  "auckland|hamilton": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJITamh3QibW0RA5miQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "汉密尔顿, 新西兰", route: "SH 1", time: "1h 19m", minutes: 79, traffic: "2 min faster than normal", readAt: "2026-11-10T05:43:56.918Z" }, hoursBefore: 1.5 },
  "hamilton|matamata": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJITamh3QibW0RA5miQ2HvAAU&b=ChIJqRZ64SdObG0RsOGiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "汉密尔顿, 新西兰", to: "Matamata, 新西兰", route: "SH 1", time: "51 mins", minutes: 51, traffic: "3 min faster than normal", readAt: "2026-11-10T05:44:01.478Z" }, hoursBefore: 0.75 },
  "hamilton|waitomo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJITamh3QibW0RA5miQ2HvAAU&b=ChIJA5pCFbK3bG0RsBajQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "汉密尔顿, 新西兰", to: "怀托摩洞穴, 新西兰", route: "Pokuru Rd", time: "1h 4m", minutes: 64, traffic: null, readAt: "2026-11-10T05:44:06.182Z" }, hoursBefore: 1 },
  "hamilton|rotorua": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJITamh3QibW0RA5miQ2HvAAU&b=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "汉密尔顿, 新西兰", to: "罗托路亚, 新西兰", route: "SH 1和State Hwy 5", time: "1h 27m", minutes: 87, traffic: "3 min faster than normal", readAt: "2026-11-10T05:44:10.838Z" }, hoursBefore: 1.5 },
  "hamilton|taupo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJITamh3QibW0RA5miQ2HvAAU&b=ChIJWxZLFHfva20R4AmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "汉密尔顿, 新西兰", to: "陶波, 新西兰", route: "SH 1", time: "1h 55m", minutes: 115, traffic: "1 min faster than normal", readAt: "2026-11-10T05:44:15.643Z" }, hoursBefore: 2 },
  "auckland|matamata": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJqRZ64SdObG0RsOGiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "Matamata, 新西兰", route: "SH 1", time: "1h 54m", minutes: 114, traffic: "3 min faster than normal", readAt: "2026-11-10T05:44:20.304Z" }, hoursBefore: 2 },
  "matamata|rotorua": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJqRZ64SdObG0RsOGiQ2HvAAU&b=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "Matamata, 新西兰", to: "罗托路亚, 新西兰", route: "State Hwy 5", time: "55 mins", minutes: 55, traffic: null, readAt: "2026-11-10T05:44:48.741Z" }, hoursBefore: 1 },
  "auckland|waitomo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJA5pCFbK3bG0RsBajQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "怀托摩洞穴, 新西兰", route: "SH 1和SH 3", time: "2h 20m", minutes: 140, traffic: "1 min faster than normal", readAt: "2026-11-10T05:44:54.300Z" }, hoursBefore: 2.5 },
  "waitomo|rotorua": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJA5pCFbK3bG0RsBajQ2HvAAU&b=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "怀托摩洞穴, 新西兰", to: "罗托路亚, 新西兰", route: "State Hwy 5", time: "1h 56m", minutes: 116, traffic: "1 min faster than normal", readAt: "2026-11-10T05:44:59.128Z" }, hoursBefore: 2 },
  "hahei|rotorua": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJb6g_wXVCcm0R8MiiQ2HvAAU&b=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "Hahei, 新西兰", to: "罗托路亚, 新西兰", route: "State Hwy 5", time: "2h 58m", minutes: 178, traffic: "2 min slower than normal", readAt: "2026-11-10T05:45:03.871Z" }, hoursBefore: 2.5 },
  "rotorua|taupo": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU&b=ChIJWxZLFHfva20R4AmjQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "罗托路亚, 新西兰", to: "陶波, 新西兰", route: "State Hwy 5", time: "59 mins", minutes: 59, traffic: null, readAt: "2026-11-10T05:45:09.083Z" }, hoursBefore: 1 },
  "taupo|national-park": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJWxZLFHfva20R4AmjQ2HvAAU&b=ChIJHVFNwkYca20RkOiiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "陶波, 新西兰", to: "國家公園村, 新西兰", route: "SH 1和State Hwy 47", time: "1h 23m", minutes: 83, traffic: "1 min slower than normal", readAt: "2026-11-10T05:45:13.760Z" }, hoursBefore: 1.5 },
  "auckland|national-park": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJHVFNwkYca20RkOiiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "國家公園村, 新西兰", route: "SH 1和State Hwy 4", time: "3h 59m", minutes: 239, traffic: "4 min slower than normal", readAt: "2026-11-10T05:45:20.001Z" }, hoursBefore: 4.5 },
  "national-park|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHVFNwkYca20RkOiiQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-10", nzta: { from: "國家公園村, 新西兰", to: "惠灵顿, 新西兰", route: "SH 1和SH 1", time: "3h 50m", minutes: 230, traffic: null, readAt: "2026-11-10T05:45:25.251Z" }, hoursBefore: 4.75 },
  "taupo|napier": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJWxZLFHfva20R4AmjQ2HvAAU&b=ChIJmcqxT9bJaW0RUOiiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "陶波, 新西兰", to: "内皮尔, 新西兰", route: "State Hwy 5", time: "1h 51m", minutes: 111, traffic: "5 min faster than normal", readAt: "2026-11-10T05:45:49.330Z" }, hoursBefore: 2 },
  "napier|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJmcqxT9bJaW0RUOiiQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-10", nzta: { from: "内皮尔, 新西兰", to: "惠灵顿, 新西兰", route: "State Hwy 2和SH 1", time: "3h 52m", minutes: 232, traffic: "2 min faster than normal", readAt: "2026-11-10T05:45:54.361Z" }, hoursBefore: 4.25 },
  "taupo|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJWxZLFHfva20R4AmjQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-10", nzta: { from: "陶波, 新西兰", to: "惠灵顿, 新西兰", route: "SH 1和SH 1", time: "4h 41m", minutes: 281, traffic: "4 min slower than normal", readAt: "2026-11-10T05:45:59.008Z" }, hoursBefore: 4.5 },
  "national-park|new-plymouth": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHVFNwkYca20RkOiiQ2HvAAU&b=ChIJDc5kI-b5FG0RoOmiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "國家公園村, 新西兰", to: "新普利茅斯, 新西兰", route: "State Hwy 4和SH 3", time: "3h 25m", minutes: 205, traffic: "3 min slower than normal", readAt: "2026-11-10T05:46:03.659Z" }, hoursBefore: 3.5 },
  "new-plymouth|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJDc5kI-b5FG0RoOmiQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-10", nzta: { from: "新普利茅斯, 新西兰", to: "惠灵顿, 新西兰", route: "SH 3和SH 1", time: "4h 28m", minutes: 268, traffic: "1 min faster than normal", readAt: "2026-11-10T05:46:08.399Z" }, hoursBefore: 4.5 },
  "auckland|new-plymouth": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJDc5kI-b5FG0RoOmiQ2HvAAU", checkedAt: "2026-11-10", nzta: { from: "奥克兰, 新西兰", to: "新普利茅斯, 新西兰", route: "SH 1和SH 3", time: "4h 30m", minutes: 270, traffic: "2 min faster than normal", readAt: "2026-11-10T05:46:13.138Z" }, hoursBefore: 4.5 },
};
const P10_NZTA_DATE = Object.values(EDGE_SOURCES).map(s => s.checkedAt).sort().pop();
// The tag after each leg: car legs show the NZTA query date and the raw reading on hover; other modes are estimates.
function p10LegTag(l, zh) {
  const s = l.src || EDGE_SOURCE_DEFAULT, nz = l.mode === 'car' && s.nzta;
  // NZTA route names were read with a Chinese joiner (browser locale); show it in the reader's language.
  const road = nz ? (zh ? s.nzta.route : s.nzta.route.replace(/和/g, ' and ').replace(/、/g, ', ')) : '';
  const label = nz ? (zh ? `估算 · ${s.checkedAt} · 来源：NZTA Journey Planner` : `Estimate · ${s.checkedAt} · Source: NZTA Journey Planner`) : (s.checkedAt ? (zh ? `估算 · ${s.checkedAt} · 来源：规划估算` : `Estimate · ${s.checkedAt} · Source: planning estimate`) : (zh ? `估算 · 尚无逐段核验日期 · 来源：规划估算` : `Estimate · No per-leg check date yet · Source: planning estimate`));
  const title = nz
    ? (zh ? `NZTA Journey Planner ${s.checkedAt} 读数：${road}，${s.nzta.time}${s.nzta.traffic ? '（' + s.nzta.traffic + '）' : ''}；取整到 15 分钟。NZTA 不显示里程，里程为规划估算。`
          : `NZTA Journey Planner reading on ${s.checkedAt}: ${road}, ${s.nzta.time}${s.nzta.traffic ? ' (' + s.nzta.traffic + ')' : ''}; rounded to 15 minutes. NZTA shows no distance; km is a planning estimate.`)
    : (zh ? '规划用估算值；公共交通和渡轮以运营商时刻表为准。' : 'Planning estimate; for coaches, trains and ferries check the operator’s timetable.');
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<abbr class="v3-tv" title="${esc(title)}">${label}</abbr>`;
}
globalThis.P10_ROAD_SOURCES = ROAD_SOURCES;
globalThis.P10_EDGE_SOURCES = EDGES.map(e => ({ from: e[0], to: e[1], hours: e[2], km: e[3], ...(EDGE_SOURCES[e[0] + '|' + e[1]] || EDGE_SOURCE_DEFAULT) }));

// What people ask for. `base` is where they sleep; `days` the time it needs there (0.5 fits on a travel day);
// `routes` and `places` are what they do (each has its own reasons in why.js); `pt` false where the place itself
// needs a car or a tour even if a bus reaches the town.
const WISHES = [
  { id: 'christchurch', island: 'south', base: 'christchurch', days: 1, en: 'Christchurch', zh: '基督城', routes: ['bridle-path'], places: ['chch-gardens'] },
  { id: 'nelson', island: 'south', base: 'nelson', days: 1, en: 'Nelson', zh: '纳尔逊', routes: [], places: [] },
  { id: 'picton', island: 'south', base: 'picton', days: 1, en: 'Picton', zh: '皮克顿', routes: [], places: [] },
  { id: 'tekapo', island: 'south', base: 'tekapo', days: 0.5, en: 'Lake Tekapo and the dark-sky reserve', zh: '特卡波与暗夜星空', routes: ['mackenzie-route'], places: ['good-shepherd', 'dark-sky'] },
  { id: 'aoraki', island: 'south', base: 'aoraki', days: 1, en: 'Aoraki/Mount Cook', zh: '奥拉基／库克山', routes: ['hooker-valley'], places: ['tasman-lake'] },
  { id: 'wanaka', island: 'south', base: 'wanaka', days: 1, en: 'Wānaka', zh: '瓦纳卡', routes: ['roys-peak'], places: ['wanaka-tree'] },
  { id: 'queenstown', island: 'south', base: 'queenstown', days: 2, en: 'Queenstown', zh: '皇后镇', routes: ['queenstown-trail'], places: ['skyline-qt', 'shotover-jet', 'kawarau-bungy', 'arrowtown', 'glenorchy'] },
  { id: 'milford', island: 'south', base: 'te-anau', days: 1, en: 'Milford Sound', zh: '米尔福德峡湾', routes: ['milford-road'], ptRoutes: ['milford-coach'], places: ['milford-cruise'], weather: true },
  { id: 'te-anau', island: 'south', base: 'te-anau', days: 0.5, en: 'Te Anau glowworms and Fiordland walks', zh: '蒂阿瑙萤火虫洞与峡湾步道', routes: ['key-summit'], places: ['te-anau-glowworms'] },
  { id: 'glaciers', island: 'south', base: 'franz-josef', days: 1, en: 'The glaciers (Franz Josef and Fox)', zh: '冰川（弗朗茨约瑟夫与福克斯）', routes: ['lake-matheson', 'glacier-coast'], places: [], weather: true },
  { id: 'haast', island: 'south', base: 'haast', days: 0.5, en: 'Haast and the Haast Pass', zh: '哈斯特与哈斯特隘口', routes: ['haast-pass'], places: [] },
  { id: 'hokitika', island: 'south', base: 'hokitika', days: 0.5, en: 'Hokitika Gorge', zh: '霍基蒂卡峡谷', routes: [], places: ['hokitika-gorge'], pt: false },
  { id: 'punakaiki', island: 'south', base: 'punakaiki', days: 0.5, en: 'Punakaiki Pancake Rocks', zh: '普纳凯基千层岩', routes: ['paparoa-track'], places: ['pancake-rocks'] },
  { id: 'arthurs-pass', island: 'south', base: 'arthurs-pass', days: 0.5, en: 'Arthur’s Pass', zh: '亚瑟通道', routes: ['devils-punchbowl', 'arthurs-pass'], ptRoutes: ['tranzalpine', 'devils-punchbowl'], places: [] },
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
  { id: 'napier', island: 'north', base: 'napier', days: 1, en: 'Napier art deco', zh: '内皮尔装饰艺术小城', routes: [], places: [], whyFrom: 'wellington-napier' },
  { id: 'wellington', island: 'north', base: 'wellington', days: 1, en: 'Wellington', zh: '惠灵顿', routes: ['escarpment-track'], places: ['te-papa', 'zealandia', 'cable-car'] },
  { id: 'taranaki', island: 'north', base: 'new-plymouth', days: 1, en: 'Taranaki and the Pouākai Crossing', zh: '塔拉纳基与波阿凯穿越', routes: ['pouakai-crossing'], places: ['three-sisters'], weather: true },
];

// One plain line on what to do there, for places without a route guide and for the Milford day trip.
// Generated by scripts/check-wish-tips.mjs from data/wish-tips.json (v3.1 C12): `src` = official pages whose quotes
// were found; `verify` = no official source found yet, shown as 待核实 / To verify.
const P10_WISH_TIPS = {
  "milford": {"zh":"从蒂阿瑙到米尔福德峡湾的米尔福德公路（SH94）全程 120 km；2026-11-10 在 NZTA 查询车程约 1 小时 51 分（含当时路况）。","en":"The Milford Road (SH94) from Te Anau is a 120 km journey; NZTA Journey Planner gave 1 h 51 min on 2026-11-10 (traffic at the time).","src":[{"url":"https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf","checkedAt":"2026-11-10"},{"url":"https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJa15mlSBt1KkRULR5hIbvAAU&b=ChIJ4UlLuk3g1akRAN5kq4bvACo","checkedAt":"2026-11-10"}]},
  "rotorua": {"zh":"地热公园和毛利文化表演选一两处即可，多数需预订。","en":"Pick one or two geothermal parks or a Māori cultural evening; most need booking.","verify":true,"check":"https://www.rotoruanz.com/"},
  "hobbiton": {"zh":"霍比特村电影片场是全程导览的步行游览，约 2.5 小时，需凭预订号取票。","en":"The Hobbiton Movie Set tour is fully guided on foot and takes about 2.5 hours; bring your booking reference.","src":[{"url":"https://www.hobbitontours.com/experiences/hobbiton-movie-set-tour/","checkedAt":"2026-11-10"}]},
  "waitomo": {"zh":"怀托摩萤火虫洞游览约 45 分钟，官方建议提前预订。","en":"The Waitomo Glowworm Caves tour takes about 45 minutes; the operator recommends booking ahead.","src":[{"url":"https://www.waitomo.com/waitomo-glowworm-caves","checkedAt":"2026-11-10"}]},
  "tekapo": {"zh":"特卡波可看好牧羊人教堂、泡温泉，或参加观星团。","en":"In Tekapo, see the Church of the Good Shepherd, soak in the hot pools or join a stargazing tour.","src":[{"url":"https://www.mackenzienz.com/","checkedAt":"2026-11-10"}]},
  "kaikoura": {"zh":"观鲸船出海受海况影响，出发前查看运营商信息。","en":"Whale-watching trips depend on the sea; check with the operator before you go.","verify":true,"check":"https://www.whalewatch.co.nz/"},
  "stewart": {"zh":"奥本镇周边短步道和乌尔瓦岛观鸟，可按天气安排。","en":"Short walks around Oban and birdwatching on Ulva Island, arranged around the weather.","verify":true,"check":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/southland/places/stewart-island-rakiura/"},
  "catlins": {"zh":"沿南部风景公路看瀑布、灯塔和海岸，需要自驾。","en":"Waterfalls, lighthouses and coast along the Southern Scenic Route; you need a car.","verify":true,"check":"https://www.southernscenicroute.co.nz/"},
  "christchurch": {"zh":"可逛基督城植物园，或乘缆车看城市、利特尔顿港和太平洋的全景。","en":"Visit the Christchurch Botanic Gardens, or ride the gondola for views of the city, Lyttelton Harbour and the Pacific.","src":[{"url":"https://ccc.govt.nz/parks-and-gardens/christchurch-botanic-gardens","checkedAt":"2026-11-10"},{"url":"https://www.christchurchattractions.nz/christchurch-gondola/","checkedAt":"2026-11-10"}]},
  "nelson": {"zh":"可骑塔斯曼美味骑行步道的一段；这条环线可以只骑短程或一日骑行。","en":"Ride part of Tasman's Great Taste Trail; the loop can be done in short hops and day rides.","src":[{"url":"https://www.nzcycletrail.com/find-your-ride/23-great-rides/tasmans-great-taste-trail","checkedAt":"2026-11-10"}]},
  "picton": {"zh":"可走夏洛特皇后步道的一段；起点船湾（Meretoto/Ship Cove）没有公路，需要乘船前往。","en":"Walk part of the Queen Charlotte Track; there is no road to the start at Meretoto/Ship Cove, so you need a boat.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/marlborough/places/queen-charlotte-sound-totaranui-area/things-to-do/tracks/queen-charlotte-track/","checkedAt":"2026-11-10"}]},
  "aoraki": {"zh":"从库克山村出发，可走胡克谷步道到奥拉基／库克山脚下，或走塔斯曼冰川观景步道（往返约 30 分钟）。","en":"From Aoraki/Mount Cook Village, walk the Hooker Valley to the foot of the mountain, or take the Tasman Glacier View Track (30 min return).","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/things-to-do/tracks/hooker-valley-track/","checkedAt":"2026-11-10"},{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/things-to-do/tracks/tasman-glacier-view-track/","checkedAt":"2026-11-10"}]},
  "wanaka": {"zh":"罗伊峰步道每年 10 月 1 日至 11 月 10 日因产羔关闭；关闭期间 DOC 推荐伊斯穆斯峰步道。","en":"Roys Peak Track is closed for lambing from 1 October to 10 November each year; DOC suggests Isthmus Peak Track during the closure.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/wanaka-area/things-to-do/roys-peak-track/","checkedAt":"2026-11-10"}]},
  "queenstown": {"zh":"可沿瓦卡蒂普湖散步，或去附近的箭镇。","en":"Walk by Lake Whakatipu or visit nearby Arrowtown.","src":[{"url":"https://www.queenstownnz.co.nz/","checkedAt":"2026-11-10"}]},
  "te-anau": {"zh":"可参加萤火虫洞游览，或沿蒂阿瑙湖边散步。","en":"Visit the glowworm caves or walk along Lake Te Anau.","verify":true,"check":"https://www.realnz.com/"},
  "glaciers": {"zh":"可走短程雨林步道看弗朗茨约瑟夫冰川谷，或环马西森湖看雪山倒影。","en":"Take the short rainforest walk to view the Franz Josef Glacier valley, or loop Lake Matheson for its mountain reflections.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/westland-tai-poutini-national-park/things-to-do/tracks/franz-josef-glacierka--roimata-o-hine-hukatere-walk/","checkedAt":"2026-11-10"},{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/westland-tai-poutini-national-park/things-to-do/tracks/lake-matheson-te-ara-kairaumati-walk/","checkedAt":"2026-11-10"}]},
  "haast": {"zh":"哈斯特隘口公路沿途有多处值得停车的短步道，可看蓝池和瀑布；留意路况。","en":"The Haast Pass Highway has short walks worth stopping for, to blue pools and waterfalls; check road conditions.","src":[{"url":"https://westcoast.co.nz/visit/discover/highlights/haast-world-heritage-area/","checkedAt":"2026-11-10"}]},
  "hokitika": {"zh":"霍基蒂卡峡谷距镇上约 30 分钟车程，可看蓝绿色河水，有适合各种体力的步道。","en":"Hokitika Gorge is 30 min by car from Hokitika: turquoise water and walks for everyone.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/hokitika-gorge-scenic-reserve/things-to-do/tracks/hokitika-gorge-walk/","checkedAt":"2026-11-10"}]},
  "punakaiki": {"zh":"千层岩是一条铺装短步道；喷水洞在涨潮前后最壮观。","en":"The Pancake Rocks walk is short and paved; the blowholes are at their best around high tide.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/paparoa-national-park/things-to-do/tracks/pancake-rocks-and-blowholes-walk/","checkedAt":"2026-11-10"}]},
  "arthurs-pass": {"zh":"可走魔鬼酒碗瀑布步道，穿过山毛榉林到瀑布，往返约 1 小时。","en":"Walk to Devils Punchbowl Falls through beech forest, about 1 hr return.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/arthurs-pass-national-park/things-to-do/tracks/devils-punchbowl-walking-track/","checkedAt":"2026-11-10"}]},
  "abel-tasman": {"zh":"从马拉豪走海岸步道，可从托塔拉努伊乘水上出租船返回；预订前先核对接驳时间。","en":"Walk the coast track from Mārahau and take a water taxi back from Tōtaranui; check transport times before booking.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/nelson-tasman/places/abel-tasman-national-park/things-to-do/tracks/abel-tasman-coast-track/","checkedAt":"2026-11-10"}]},
  "akaroa": {"zh":"在海港村散步，或预订出海观赏赫氏海豚。","en":"Walk around the harbour village or book a cruise to see Hector’s dolphins.","verify":true,"check":"https://www.doc.govt.nz/nature/native-animals/marine-mammals/dolphins/hectors-dolphin/"},
  "dunedin": {"zh":"可逛市中心历史建筑，或去奥塔哥半岛看野生动物。","en":"Explore the city’s historic buildings or visit the Otago Peninsula for wildlife.","verify":true,"check":"https://www.dunedinnz.com/"},
  "oamaru": {"zh":"可到奥马鲁蓝企鹅栖息地参加傍晚观赏。","en":"Join the evening viewing at the Ōamaru Blue Penguin Colony.","src":[{"url":"https://www.penguins.co.nz/","checkedAt":"2026-11-10"}]},
  "auckland": {"zh":"可乘公共渡轮去朗伊托托岛步行登顶；岛上不能过夜，别错过回程渡轮。","en":"Take the public ferry to Rangitoto and walk to the summit; there is no overnight accommodation, so don't miss the ferry back.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/auckland/places/rangitoto-island/","checkedAt":"2026-11-10"}]},
  "bay-of-islands": {"zh":"可参观怀唐伊条约签署地。","en":"Visit the Waitangi Treaty Grounds.","src":[{"url":"https://www.waitangi.org.nz/","checkedAt":"2026-11-10"}]},
  "coromandel": {"zh":"教堂湾步道往返约 1 小时 30 分，终点是著名的岩石拱门。","en":"The Cathedral Cove walk is 1 hr 30 min return and ends at the famous rock archway.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/coromandel/places/hahei-area/tracks/mautohe-cathedral-cove-walk/","checkedAt":"2026-11-10"}]},
  "taupo": {"zh":"可从陶波沿怀卡托河步行到胡卡瀑布。","en":"Walk from Taupō along the Waikato River to Huka Falls.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/central-north-island/places/taupo-area/things-to-do/spa-park-to-huka-falls-walk/","checkedAt":"2026-11-10"}]},
  "tongariro": {"zh":"汤加里罗高山穿越单程 20.2 km；11–4 月约 7–8 小时，5–10 月约 9 小时，5–10 月必须具备高山技能。乘接驳车或跟团须先预订步道。天气不好时不要上山，用机动日改期。","en":"The Tongariro Alpine Crossing is 20.2 km one way: 7–8 hr from November to April, 9 hr from May to October, when alpine skills are essential. A track booking is needed to use a shuttle or guided walk. Don't go up in bad weather; use a buffer day.","src":[{"url":"https://www.doc.govt.nz/tongariroalpinecrossing","checkedAt":"2026-11-10"}]},
  "napier": {"zh":"1931 年霍克斯湾地震后，内皮尔按装饰艺术风格重建；可参加装饰艺术步行导览。","en":"Napier was rebuilt in Art Deco style after the 1931 Hawke’s Bay earthquake; join a guided Art Deco walking tour.","src":[{"url":"https://www.artdeconapier.com/","checkedAt":"2026-11-10"}]},
  "wellington": {"zh":"可参观蒂帕帕博物馆，或乘缆车上凯尔本，顺路去惠灵顿植物园。","en":"Visit Te Papa, or ride the cable car up to Kelburn for the Wellington Botanic Garden.","src":[{"url":"https://www.tepapa.govt.nz/visit","checkedAt":"2026-11-10"},{"url":"https://www.wellingtoncablecar.co.nz/","checkedAt":"2026-11-10"}]},
  "taranaki": {"zh":"塔拉纳基山天气多变，上山前查看天气预报；天气不好就选新普利茅斯海滨。","en":"Taranaki's weather is changeable; check the forecast before going up, and choose the New Plymouth waterfront if it turns.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/taranaki/places/te-papa-kura-o-taranaki/","checkedAt":"2026-11-10"}]},
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
  haast:['Haast Pass road','哈斯特隘口公路'], milford:['Milford Road','米尔福德公路'], arthurs:['Arthur’s Pass road','亚瑟通道公路'],
  aorakidrive:['Christchurch to Aoraki road','基督城至奥拉基／库克山公路'], coastroad:['Picton to Christchurch road','皮克顿至基督城公路'],
  'ni-volcanicloop':['Volcanic loop road','北岛火山环线'], 'ni-thermalexplorer':['Rotorua and Taupō road','罗托鲁瓦与陶波公路'],
  'ni-coromandel':['Coromandel loop road','科罗曼德环线'], 'ni-twincoast-drive':['Twin Coast road','北地双海岸公路'],
  'ni-martinborough':['Martinborough road','马丁堡公路'], catlins:['Catlins coastal road','卡特林斯海岸公路'],
  tranzalpine:['TranzAlpine train','高山观景列车'], coastal:['Coastal Pacific train','海岸太平洋列车'],
  pictonnelson:['Picton to Nelson coach','皮克顿至纳尔逊巴士'], teanaubus:['Queenstown to Te Anau coach','皇后镇至蒂阿瑙巴士'],
  dunedinbus:['Dunedin to Christchurch coach','但尼丁至基督城巴士'], 'ni-northernexplorer':['Northern Explorer train','北方探索者火车'],
  'ni-devonportferry':['Devonport ferry','德文波特渡轮'], 'ni-aucklandpaihia':['Auckland to Paihia coach','奥克兰至派希亚巴士'],
  'ni-rotoruataupo':['Rotorua to Taupō coach','罗托鲁瓦至陶波巴士'], 'ni-kapitirail':['Kāpiti train','卡皮蒂火车'],
  'ni-wellingtonnapier':['Wellington to Napier coach','惠灵顿至内皮尔巴士']
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
// Infer the Jev island from the selected destinations; a tie falls back to the start city.
function p10JevIsland(start,wishes){
  let north=0,south=0;
  for(const id of new Set(wishes||[])){const wish=WISHES.find(w=>w.id===id);if(wish?.island==='north')north++;else if(wish?.island==='south')south++;}
  if(north!==south)return north>south?'north':'south';
  return new Set(['auckland','wellington','rotorua']).has(start)?'north':'south';
}
// The recommendation must resolve against the same site data used to render route pages.
function p10JevRouteName(routeId,lang,routeData){
  const route=Array.isArray(routeData)?routeData.find(r=>r.id===routeId):null;
  return route && (lang==='zh'?route.zh:route.name) || '';
}
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
    const src = EDGE_SOURCES[a + '|' + b] || EDGE_SOURCE_DEFAULT;
    graph[a].push({a,b,h:time,km,road,mode,src}); graph[b].push({a:b,b:a,h:time,km,road,mode,src});
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
function p10Project(at){
  if(!at) return null;
  return [392.5+(at[1]-174.76)*38.05, 189.7+(-at[0]-36.85)*50.5];
}
function p10Present(plan){
  const full = plan && !plan.disconnected ? p10Timeline(plan) : [];
  const selected = plan && plan.input ? plan.input.days : full.length;
  const tight = Boolean(plan && plan.input && plan.minimum > selected);
  const days = tight ? full.slice(0, selected).map((d, i) => ({ ...d, n: i + 1 })) : full;
  const scheduled = new Set();
  for (const d of days) for (const a of d.activities || []) if (a.wish) scheduled.add(a.wish.id);
  const unscheduled = [];
  const seenWish = new Set();
  if (tight) {
    for (const d of full.slice(selected)) for (const a of d.activities || []) {
      if (!a.wish || scheduled.has(a.wish.id) || seenWish.has(a.wish.id)) continue;
      seenWish.add(a.wish.id);
      unscheduled.push({ id: a.wish.id, en: a.wish.en, zh: a.wish.zh, base: a.wish.base });
    }
  }
  const points = [];
  const seen = new Set();
  function addPoint(id, scheduledPoint) {
    if (!id || seen.has(id)) return;
    const at = NODES[id] && NODES[id].at;
    if (!at) return;
    seen.add(id);
    points.push({ id, at, xy: p10Project(at), scheduled: scheduledPoint });
  }
  for (const d of days) {
    const ids = d.legs && d.legs.length ? [d.legs[0].a, ...d.legs.map(l => l.b)] : [d.at];
    for (const id of ids) addPoint(id, true);
  }
  for (const w of unscheduled) addPoint(w.base, false);
  return {
    days,
    unscheduled,
    map: { points, schematic: true },
    warning: tight ? { minimum: plan.minimum, selected, suggestions: ['drop-or-swap', 'add-days', 'switch-template'] } : null,
  };
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
if (typeof module !== 'undefined' && module.exports) module.exports={p10Plan,p10Timeline,p10Present,p10AlongWay,p10Duration,p10DailyTime,p10BreakStops,p10Net,p10Suggestions,p10LegDescription,p10JevIsland,p10JevRouteName,P10_WISH_TIPS,P10_WISH_GUIDES,NODES,WISHES};
globalThis.P10_NODES = NODES;

  if (typeof window !== 'undefined') {
  let p10Result=null, p10Recommendation=null, p10View=null;
  window.p10Plan = p10Plan;
  window.p10Present = p10Present;
  window.p10Timeline = p10Timeline;
  const p10$=selector=>document.querySelector(selector);
  const p10Text=()=>document.documentElement.lang.startsWith('zh') ? {
    start:'从哪里出发',end:'从哪里离开',days:'旅行天数',pace:'每天自驾节奏',pace35:'最多 3.5 小时',pace5:'最多 5 小时',pace65:'最多 6.5 小时',places:'想去哪些地方？',choose:'选择多个目的地',transport:'城市之间怎么走',car:'自驾',public:'公共交通',preference:'偏好的活动',method:'是否使用 Jev 推荐',local:'本地规划',jev:'Jev 辅助推荐',submit:'生成行程',
    consent:'只有勾选同意，才会把所选岛屿、天数和活动方式发送给 TypeSafe，服务方也会收到请求 IP；地点和起终点不会发送。',statusConsent:'请先同意，再使用 Jev 推荐。',loading:'正在请求 Jev 推荐…',error:'Jev 推荐暂不可用，下面仍显示本地规划。',reco:'Jev 推荐',
    disclaimer:'出发前请查看 NZTA 路况和各线路链接的官方信息。',min:'至少需要',have:'你选择了',drop:'可增加天数或移除',unreachable:'以下地点目前无法按所选交通方式衔接，需另行安排',disconnected:'起点与终点之间缺少可用的交通连接，请改选交通方式或另行安排。',unknownNight:'',day:'第',dayEnd:'天',arrive:'抵达',depart:'离开',night:'住',check:'',activity:'安排时间游览',localTransport:'景点与步道起点的当地接驳不包含在行程中。',ferry:'渡轮',train:'火车',coach:'大巴',shuttle:'接驳车',road:'自驾',hour:'小时',dropNo:'请减少目的地或增加天数。',sources:'路况与交通来源'
  } : {
    start:'Start city',end:'Departure city',days:'Days available',pace:'Daily driving pace',pace35:'Up to 3.5 hours',pace5:'Up to 5 hours',pace65:'Up to 6.5 hours',places:'Where would you like to go?',choose:'Choose multiple destinations',transport:'Between towns',car:'Drive',public:'Public transport',preference:'Preferred activity',method:'Jev suggestions',local:'Local plan',jev:'Jev-assisted suggestion',submit:'Build itinerary',
    consent:'Only with your consent, the selected island, days and activity type are sent to TypeSafe, which also receives the request IP. Your selected places and start/end are not sent.',statusConsent:'Please consent before using Jev.',loading:'Requesting a Jev suggestion…',error:'Jev is unavailable; the local plan is shown below.',reco:'Jev recommendation',
    disclaimer:'Check NZTA road conditions and the linked official information before you go.',min:'Minimum days',have:'Days selected',drop:'Removing this destination may reduce the trip to',unreachable:'These places need separate transport with the selected mode',disconnected:'No available connection is modelled between the start and end. Choose another mode or arrange this separately.',unknownNight:'',day:'Day ',dayEnd:'',arrive:'Arrive in',depart:'Depart from',night:'Overnight',check:'',activity:'Allow time to explore',localTransport:'Check local transport to sights and trailheads and return separately.',ferry:'Ferry',train:'Train',coach:'Coach',shuttle:'Shuttle',road:'Drive',hour:'h',dropNo:'Remove a destination or add more days.',sources:'Road and transport sources'
  };
  const p10Esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p10Lang=()=>document.documentElement.lang.startsWith('zh')?'zh':'en';
  const p10Name=id=>NODES[id]?.[p10Lang()]||id;
  function p10Status(text){const s=p10$('#plannerStatus');if(s)s.textContent=text||'';}
  // Coastline is the same Natural Earth base used by the homepage; road segments are schematic town-to-town connections.
  const P10_COAST = "M335.6,93.1L336.2,95.4L338.3,93.8L339.9,91.2L342.4,88.5L342.1,92.8L343.4,93.7L351.8,96.7L353.5,99.2L355.3,99.9L356.3,98.5L357.5,97.7L360.6,99.3L367.4,103.6L368.0,105.1L367.7,107.3L368.0,109.7L368.9,111.5L371.2,112.0L374.3,109.2L375.7,108.9L377.7,112.8L378.5,115.0L378.1,114.9L379.4,117.1L381.2,119.3L384.2,125.8L383.7,128.1L382.9,130.1L385.6,136.1L383.8,136.5L378.4,135.5L378.6,136.7L381.7,141.0L384.4,147.2L386.5,151.0L394.0,162.5L392.9,166.6L393.1,169.4L392.1,171.7L394.7,177.8L393.1,179.7L392.0,186.0L390.9,187.1L391.0,189.4L394.0,190.0L395.9,191.0L397.4,192.8L398.4,190.6L399.8,190.0L403.4,193.0L410.9,196.0L413.0,197.1L414.0,199.5L414.8,205.3L416.3,207.9L419.1,208.3L422.3,207.6L423.2,205.4L422.6,199.7L420.4,190.6L420.4,187.7L420.7,184.7L420.2,181.7L419.0,178.9L417.8,176.8L416.3,175.0L416.8,172.2L419.1,170.9L420.5,173.3L421.7,176.2L427.6,184.6L431.0,184.0L431.3,187.5L433.7,191.1L435.0,195.3L436.7,207.7L439.3,219.5L444.1,224.6L444.6,227.0L441.7,225.8L440.8,226.5L441.1,227.7L443.8,230.0L447.0,231.1L449.0,230.9L450.8,231.7L463.1,239.4L469.0,242.3L484.0,247.2L488.3,247.6L490.6,247.4L495.1,245.7L499.1,242.7L502.5,238.2L505.5,233.0L508.8,230.5L512.5,228.6L514.3,226.7L516.3,225.4L526.3,226.0L529.7,228.6L534.1,230.7L536.4,232.4L535.6,235.7L533.0,240.5L530.9,245.9L529.2,258.0L527.9,270.3L526.1,275.7L522.8,279.9L519.2,282.9L515.0,284.4L513.3,291.3L512.5,299.5L512.7,301.6L514.1,303.2L514.6,305.6L512.4,310.5L511.2,309.8L509.4,305.7L507.8,304.0L502.8,302.7L497.7,302.1L493.3,302.5L489.1,304.2L482.7,307.8L480.7,309.6L479.0,311.9L476.1,317.0L475.4,323.2L475.5,326.4L476.5,329.0L482.0,332.4L476.6,344.4L471.8,356.9L469.1,360.4L465.9,363.7L463.0,371.2L457.9,377.7L454.4,382.6L451.7,387.7L449.3,393.2L444.2,400.9L442.0,405.9L439.0,410.2L433.6,415.6L427.8,420.2L418.6,426.6L416.1,428.7L413.4,430.2L410.0,428.4L409.4,426.4L408.6,422.1L407.9,420.5L403.6,419.2L398.0,421.3L397.1,420.8L396.8,419.8L396.8,413.5L397.8,411.7L396.5,410.7L395.2,411.1L394.7,412.7L395.5,414.1L392.3,415.8L389.0,415.9L388.0,415.2L387.7,414.0L388.5,412.1L389.6,410.4L395.8,402.4L402.2,391.7L407.8,380.3L409.2,374.4L411.3,363.5L409.6,359.0L407.5,354.7L401.9,346.5L394.5,341.8L389.7,341.2L385.1,339.5L380.8,335.5L376.9,330.9L369.1,327.1L361.0,324.1L356.3,319.9L355.2,317.4L354.5,314.5L354.6,311.8L355.1,309.1L356.1,307.0L357.5,305.4L366.2,300.0L375.3,296.9L377.0,297.0L378.7,296.5L380.9,294.7L385.0,290.4L386.2,287.5L387.0,278.5L388.4,269.5L390.7,259.3L394.3,252.9L395.5,249.0L394.0,242.6L395.4,240.3L397.0,238.9L398.8,238.0L395.7,232.0L392.0,222.9L391.3,220.1L391.8,217.3L392.7,214.5L390.4,213.8L389.1,211.2L385.8,202.3L386.7,200.9L388.6,201.9L391.5,208.3L391.9,205.0L394.1,203.0L396.4,201.9L398.9,201.7L393.3,194.6L391.4,194.8L388.9,196.0L386.4,196.7L383.9,196.1L381.6,194.5L380.4,191.5L378.9,185.7L378.0,183.6L370.7,171.8L372.8,171.4L378.8,177.3L379.9,175.4L380.8,172.7L380.5,169.7L379.1,167.4L377.0,165.9L376.9,163.2L378.5,160.7L378.4,159.0L375.0,155.5L373.7,155.1L373.1,156.8L374.0,159.2L373.1,159.5L364.9,153.1L362.3,147.9L360.2,142.3L360.0,144.6L360.3,147.8L363.6,154.3L368.9,161.5L369.8,163.4L369.0,165.9L367.2,166.6L365.6,165.1L363.1,158.9L361.4,155.8L341.1,123.8L343.7,119.6L347.7,116.0L348.6,114.4L349.2,112.5L347.5,112.2L346.0,113.1L344.3,114.7L342.7,116.6L340.7,120.7L339.7,121.7L337.3,118.8L336.4,117.0L336.5,114.9L335.8,113.6L334.1,113.1L331.5,108.9L329.8,106.8L332.6,102.6L332.6,97.2L329.8,91.5L326.5,86.3L320.0,77.8L314.1,68.9L320.5,67.8L327.0,67.6L324.0,72.9L325.3,76.0L327.4,78.6L331.9,86.7L332.3,89.0L334.5,91.3L335.6,93.1ZM422.3,161.0L422.6,163.8L419.7,162.8L418.5,160.7L415.3,158.5L414.8,157.9L414.4,153.7L416.1,151.7L416.4,150.8L417.2,150.5L418.5,152.7L421.1,155.8L422.3,161.0ZM329.8,413.5L334.2,413.8L338.2,410.1L342.4,407.0L346.8,404.6L353.5,398.8L355.2,398.0L359.6,396.9L361.5,395.6L363.6,395.2L361.7,398.6L359.3,399.8L358.9,401.0L360.2,402.9L358.1,405.7L358.2,409.1L355.8,413.1L359.5,411.5L360.9,408.9L360.2,407.4L361.9,404.4L364.4,403.0L363.4,400.8L363.4,399.1L366.5,399.7L368.1,399.6L369.3,398.9L371.5,398.7L372.0,400.6L375.0,400.4L373.9,402.9L371.6,405.7L371.1,407.5L367.4,410.4L364.9,411.6L368.7,411.9L374.3,408.1L377.6,404.6L377.5,408.9L374.8,412.7L372.5,415.2L369.9,415.9L367.4,417.9L366.1,421.1L366.2,423.2L367.0,424.9L369.6,427.8L366.7,433.3L369.9,432.6L371.7,433.6L374.3,436.8L372.7,440.5L371.7,442.3L365.3,450.1L362.5,454.0L359.2,456.5L359.2,460.6L357.4,463.6L347.8,473.8L346.1,476.1L338.6,492.4L333.8,499.2L331.0,501.5L328.1,503.4L321.1,506.7L318.0,510.4L314.6,513.5L311.0,514.2L311.1,515.5L313.4,516.3L315.2,518.3L313.9,520.6L311.3,522.0L308.7,522.4L307.3,523.9L313.7,522.8L315.5,524.0L315.8,526.5L316.5,528.8L318.0,531.8L323.3,533.7L328.1,534.5L329.1,535.9L329.8,540.7L328.9,543.0L327.9,544.6L326.2,545.1L322.3,545.4L318.4,544.3L315.8,541.5L308.4,542.4L306.4,543.0L305.4,542.5L309.5,539.5L307.3,537.7L305.6,537.1L303.6,538.1L302.3,539.7L301.9,542.3L300.6,543.8L298.5,544.2L295.7,542.1L292.8,539.0L288.6,535.8L289.2,537.8L292.5,542.5L294.1,545.6L290.3,548.2L286.4,550.1L283.1,551.3L279.9,553.0L276.3,555.8L274.2,556.8L268.9,556.9L266.0,557.8L265.0,561.4L263.0,563.8L258.3,564.2L260.0,565.0L261.1,566.1L257.9,577.2L257.3,581.8L256.7,589.7L254.7,597.0L249.1,596.9L250.0,598.2L254.2,600.3L253.4,603.4L248.8,609.0L246.8,612.3L244.9,620.3L242.1,627.6L237.7,636.0L237.7,637.5L239.2,639.6L241.1,641.4L241.2,644.0L240.6,645.4L238.5,645.7L236.7,646.6L227.0,648.9L223.8,651.5L221.2,656.1L218.1,660.0L207.9,668.8L201.9,676.1L200.7,678.2L199.1,679.8L186.0,683.2L176.7,683.7L171.6,682.9L166.7,681.1L164.0,680.5L158.9,681.6L156.6,682.8L152.6,681.6L149.4,682.5L148.4,681.6L147.2,679.5L147.9,676.6L147.0,674.5L144.9,673.0L143.6,671.4L142.0,670.2L137.7,669.7L131.0,670.5L128.8,670.4L124.2,663.4L122.7,661.6L117.2,659.4L115.4,659.7L112.5,663.5L110.7,664.1L100.5,664.5L90.2,663.3L86.4,661.9L85.7,658.7L93.5,649.7L91.2,650.9L86.4,654.6L83.3,654.0L86.3,650.0L86.5,648.3L85.9,646.3L81.9,649.6L77.4,650.1L76.8,647.0L77.2,643.4L78.1,642.4L90.4,640.5L94.9,639.3L96.8,637.4L89.4,636.7L89.0,634.0L90.0,631.8L96.3,628.3L91.7,629.2L86.5,628.8L86.9,625.1L88.2,622.1L93.6,622.0L91.9,620.0L91.7,617.1L93.2,616.9L98.7,620.8L102.6,622.2L101.0,619.3L101.2,617.5L102.2,616.6L105.4,616.1L104.6,615.6L101.5,614.8L97.9,612.6L97.5,610.3L97.7,607.6L101.6,604.0L103.9,606.2L106.6,605.6L104.5,603.8L103.2,601.3L104.1,599.6L112.3,592.7L114.4,599.3L114.9,597.1L115.1,595.0L114.1,593.2L114.2,591.4L115.2,589.9L118.7,588.3L123.3,583.3L126.7,580.9L129.4,582.4L131.3,584.5L131.0,582.5L129.7,580.8L129.3,576.2L135.5,569.0L142.3,562.2L148.8,555.0L152.2,552.4L159.6,549.5L164.3,550.7L165.5,550.5L172.5,545.3L175.4,544.0L178.1,545.8L179.7,546.5L178.1,541.8L179.4,539.6L185.2,535.8L192.5,531.9L198.1,530.3L202.2,527.6L204.7,527.5L204.3,525.5L204.7,523.6L206.9,523.7L207.5,523.0L205.6,521.9L211.7,518.0L215.0,513.8L216.7,512.9L218.2,511.6L220.2,508.7L222.5,507.7L224.6,508.2L226.1,509.6L225.3,507.2L222.6,505.8L225.5,503.7L228.5,502.3L231.4,503.4L234.3,505.0L231.4,502.5L231.0,500.9L234.5,499.0L236.4,498.4L239.0,501.9L238.7,499.2L239.3,496.7L243.0,492.8L248.0,486.2L249.6,488.5L249.8,491.2L249.6,494.6L250.6,493.4L250.9,490.4L250.2,485.1L256.4,475.2L257.6,474.1L258.9,473.4L261.1,473.1L260.4,471.6L258.7,470.2L260.4,465.2L261.4,459.4L262.9,453.9L265.2,448.5L267.7,439.5L269.6,437.7L274.7,437.0L277.0,435.7L280.8,432.5L285.3,426.6L287.7,421.9L290.8,409.6L292.6,396.7L297.6,387.2L305.1,380.3L311.7,375.1L314.3,374.0L318.9,373.6L323.2,375.1L315.2,376.4L314.3,379.5L314.1,382.6L315.0,385.4L316.5,388.0L320.4,390.3L324.9,391.7L327.0,397.1L327.3,403.4L328.0,408.8L329.8,413.5ZM360.2,392.5L355.1,395.4L355.3,393.4L356.3,389.0L358.6,386.7L359.8,386.6L362.1,384.9L361.9,388.6L360.2,392.5ZM87.0,634.5L86.8,637.0L86.4,638.2L85.0,638.3L83.1,638.0L81.1,636.8L79.9,637.2L78.8,636.7L80.2,633.9L84.7,632.5L86.4,633.7L87.0,634.5ZM95.9,610.5L97.5,616.5L94.1,615.4L92.6,613.5L95.3,610.5L95.9,610.5ZM140.3,695.4L140.3,697.5L136.4,696.7L136.4,699.0L139.6,700.2L140.7,701.8L144.0,701.3L144.7,703.8L144.0,705.9L141.8,707.5L135.4,708.3L131.2,711.5L127.6,711.0L126.6,711.3L122.5,714.7L117.8,715.7L116.6,715.5L117.2,712.5L120.7,709.6L120.7,706.8L121.6,704.6L124.9,703.1L125.0,700.2L127.2,697.7L125.8,692.2L126.6,687.2L133.1,687.0L140.3,695.4Z";
  window.P10_COAST_PATH = P10_COAST;
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
    const names=[...dots].map(([id,p])=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"><title>${p10Esc(p10Name(id))}</title></circle>`).join('')+(p10View&&p10View.unscheduled||[]).map(w=>{const p=p10MapPoint(w.base);if(!p||dots.has(w.base))return '';return `<circle class="p10-unscheduled-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6"><title>${p10Esc((zh?w.zh:w.en)||p10Name(w.base))}</title></circle>`;}).join('');
    const selectors=days.map(d=>`<button type="button" data-p10-map-day="${d.n}" aria-pressed="false" style="--day-color:${P10_DAY_COLORS[(d.n-1)%P10_DAY_COLORS.length]}">${zh?'第 '+d.n+' 天':'Day '+d.n}</button>`).join('');
    return `<section class="p10-map-panel" id="p10-trip-map" aria-label="${zh?'行程地图':'Itinerary map'}"><div class="p10-map-heading"><div><p>${zh?'逐日路线':'DAY BY DAY'}</p><h2>${zh?'行程地图':'Your trip map'}</h2></div><p>${zh?'选择某一天，查看当天经过的地点。':'Choose a day to focus on its stops.'}</p></div><div class="p10-map-day-list" aria-label="${zh?'选择日期':'Choose a day'}"><button type="button" data-p10-map-day="all" aria-pressed="true">${zh?'全部':'All days'}</button>${selectors}</div><p class="p10-map-selection" role="status" aria-live="polite">${zh?'显示全部行程地点':'Showing all itinerary stops'}</p><svg class="p10-trip-svg" viewBox="0 0 680 820" role="img" aria-label="${zh?'行程地点与每日路段示意图':'Schematic map of itinerary stops and daily connections'}"><rect width="680" height="820" fill="#e2ece8"/><path class="p10-coast" d="${P10_COAST}"/><g class="p10-map-lines">${lines}</g><g class="p10-map-dots">${names}</g></svg><p class="p10-map-note">${zh?'地点之间的连线为示意，不能用于导航。':'Connections between places are schematic, not for navigation.'} <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · ${zh?'海岸线包含取自':'Coastline contains data sourced from the'} <a href="https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/" target="_blank" rel="noopener noreferrer">LINZ Data Service</a> ${zh?'并按':'licensed for reuse under'} <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>${zh?' 许可再利用的数据':''}</p></section>`;
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
      const more=result.minimum<=21?`<button type="button" class="p10-add-stop" data-p10-days="${result.minimum}">${zh?`把天数改成 ${result.minimum}`:`Change to ${result.minimum} days`}</button>`:'';
      const trim=f&&f.dropped.length&&f.dropped.length<result.order.length?`<button type="button" class="p10-add-stop" data-p10-trim="1">${zh?`减点或换点（去掉${dropped}）`:`Remove or swap a place (drop ${dropped})`}</button>`:`<button type="button" class="p10-add-stop" data-p10-edit="1">${zh?'减点或换点':'Remove or swap a place'}</button>`;
      const tmpl=`<a class="p10-add-stop" href="guide.html?template=SI-09B&amp;lang=${p10Lang()}">${zh?'改选线路模板':'Switch route template'}</a>`;
      notices.push(`<div class="p10-tight" role="alert"><p class="p10-warning">${zh?`这些地方至少需要约 ${result.minimum} 天，你选了 ${result.input.days} 天。下面是这 ${result.input.days} 天，排不下的地点在「未安排」里，没有自动删点。`:`These places need about ${result.minimum} days; you chose ${result.input.days}. These ${result.input.days} days are shown below. Places that do not fit are under Unscheduled, and nothing was removed for you.`}</p><div class="p10-along">${trim} ${more} ${tmpl}</div></div>`);
    }
    if(result.inaccessible.length)notices.push(`<p class="p10-warning">${x.unreachable}：${result.inaccessible.map(w=>p10Esc(w[p10Lang()])).join('、')}。</p>`);
    const suggestions=p10AlongWay(result);
    if(suggestions.length)notices.push(`<div class="p10-along"><span>${zh?'还可以加入顺路地点：':'Add a stop along the way:'}</span> ${suggestions.map(w=>`<button type="button" class="p10-add-stop" data-p10-add="${p10Esc(w.id)}">＋ ${p10Esc(w[p10Lang()])}</button>`).join(' ')}</div>`);
    if(!p10View || p10View.token!==result){
      const present=p10Present(result);
      p10View={token:result,days:present.days.map(d=>({...d,legs:[...(d.legs||[])],activities:[...(d.activities||[])]})),unscheduled:present.unscheduled||[]};
    }
    const timeline=p10View.days;
    const p10DayTools=(index,total)=>{const zh=p10Lang()==='zh';return `<div class="p10-day-tools"><button type="button" draggable="true" data-p10-drag="${index}" aria-label="${zh?'拖动排序':'Drag to reorder'}">⋮⋮</button><button type="button" data-p10-up="${index}" ${index===0?'disabled':''}>${zh?'上移':'Move up'}</button><button type="button" data-p10-down="${index}" ${index===total-1?'disabled':''}>${zh?'下移':'Move down'}</button><button type="button" data-p10-moveto="${index}">${zh?'移到…':'Move to…'}</button></div>`;};
    const rows=timeline.map((d,i)=>{
      const number=d.n;
      if(d.kind==='weather'||d.kind==='free'){
        const title=d.kind==='weather'?(zh?`${p10Esc(p10Name(d.at))} · 天气机动日`:`${p10Esc(p10Name(d.at))} · weather buffer day`):(zh?`${p10Esc(p10Name(d.at))} · 自由活动日`:`${p10Esc(p10Name(d.at))} · free day`);
        const description=d.kind==='weather'?(zh?'天气不好时用来改期；天气适合时可自由活动。':'Use this day to reschedule if weather disrupts your plans; otherwise enjoy free time.'):(zh?'在离开城市自由活动。':'Enjoy free time in your departure city.');
        return `<article class="plan-day" tabindex="0" data-p10-index="${i}">${p10DayTools(i,timeline.length)}<button class="p10-day-focus" type="button" data-p10-focus="${number}">${x.day}${number}${x.dayEnd} <span aria-hidden="true">↗</span></button><span class="plan-day-title">${title}</span><p>${description}</p><p>${x.night}：${p10Esc(p10Name(d.at))}</p></article>`;
      }
      const heading=d.kind==='arrive'?`${x.arrive} ${p10Esc(p10Name(d.at))}`:d.kind==='depart'?`${x.depart} ${p10Esc(p10Name(d.at))}`:d.legs.length?`${p10Esc(p10Name(d.legs[0].a))} → ${p10Esc(p10Name(d.at))}`:`${x.activity} ${d.activities.map(a=>p10Esc(a.wish[p10Lang()])).join('、')}`;
      const legs=d.legs.map(l=>{const road=p10LegDescription(l,p10Lang());const mode=x[l.mode]||x.road;const duration=p10Duration(l.h,p10Lang());return `<li>${p10Esc(p10Name(l.a))} → ${p10Esc(p10Name(l.b))} · ${p10Esc(road)} · ${mode}${zh?'约':' about '}${duration}${l.km>0?` · ${l.km} km`:''} ${p10LegTag(l,zh)}</li>`;}).join('');
      const travel=d.legs.reduce((sum,l)=>sum+l.h,0),driving=d.legs.filter(l=>l.mode==='car').reduce((sum,l)=>sum+l.h,0),pace=Number(result.input.pace)||5;
      const total=travel>0?`<p class="p10-daily-total">${zh?'当天路上约':'Travel today: about '}${p10DailyTime(travel,p10Lang())}${zh?'（不含当地接驳）':' (local connections excluded)'}</p>`:'';
      const stops=p10BreakStops(d),names=stops.map(id=>p10Esc(p10Name(id))).join(zh?'或':' or ');
      const longDay=driving>pace?`<p class="p10-warning p10-long-day">${zh?'这天开车较长':'This is a long driving day'}${names?(zh?`，可以在${names}多住一晚并调整行程。`:`; consider an overnight stop in ${names} and adjust the itinerary.`):(zh?'，可以在途中多住一晚并调整行程。':'; consider an overnight stop and adjust the itinerary.')}</p>`:'';
      const activities=d.activities.map(a=>{const suggested=p10Suggestions(a.wish.id,result.input.preference);const guides=suggested.map(g=>`<a href="route.html?id=${encodeURIComponent(g.id)}&amp;lang=${p10Lang()}">${p10Esc(g[p10Lang()])}</a>`).join(' · ');const note=zh?'当天线路：':'Route for the day: ';const tipRec=P10_WISH_TIPS[a.wish.id],tip=tipRec?.[p10Lang()]||'',tipSrc=tipRec?(tipRec.src?` <span class="p10-tip-src">${zh?'来源：':'Source: '}${tipRec.src.map(s=>`<a href="${p10Esc(s.url)}" target="_blank" rel="noopener noreferrer">${p10Esc(new URL(s.url).hostname.replace(/^www\./,''))}</a>${s.checkedAt?(zh?`（${s.checkedAt} 核）`:` (checked ${s.checkedAt})`):''}`).join(zh?'；':'; ')}</span>`:` <abbr class="v3-tv" title="${zh?'这条提示尚未找到官方原文，出发前请自行核对。':'No official source found for this tip yet; check before you go.'}">${zh?'待核实':'To verify'}</abbr>`):'';return `<p>${x.activity}：${p10Esc(a.wish[p10Lang()])}${a.total>1?` (${a.part}/${a.total})`:''}。${tip?' '+p10Esc(tip)+tipSrc:''} ${x.localTransport}</p>${suggested.length?`<p class="p10-suggestions">${note}${guides}</p>`:''}`;}).join('');
      const arrivalTip=d.kind==='arrive'?(zh?'抵达后建议休息，避免落地当天长途驾驶。':'Rest after arrival and avoid a long drive on the first day.') : '';
      return `<article class="plan-day" tabindex="0" data-p10-index="${i}">${p10DayTools(i,timeline.length)}<button class="p10-day-focus" type="button" data-p10-focus="${number}">${x.day}${number}${x.dayEnd} <span aria-hidden="true">↗</span></button><span class="plan-day-title">${heading}</span>${arrivalTip?`<p>${arrivalTip}</p>`:''}${legs?`<ul class="p10-legs">${legs}</ul>`:''}${total}${longDay}${activities}${d.kind==='depart'?'':`<p>${x.night}：${p10Esc(p10Name(d.at))}</p>`}</article>`;
    }).join('');
    const recoName=p10JevRouteName(p10Recommendation,p10Lang(),typeof routes==='undefined'?[]:routes);
    const reco=recoName?`<p>${x.reco}：<a href="route.html?id=${encodeURIComponent(p10Recommendation)}&amp;lang=${p10Lang()}">${p10Esc(recoName)}</a></p>`:'';
    const uns=p10View.unscheduled||[];
    const unsHtml=uns.length?`<section class="p10-unscheduled"><h3>${zh?'未安排':'Unscheduled'}</h3><ul>${uns.map(w=>`<li>${p10Esc(zh?w.zh:w.en)}</li>`).join('')}</ul></section>`:'';
    el.innerHTML=`${notices.join('')}${unsHtml}${reco}${p10TripMap(timeline)}${rows}<p class="planner-small"><strong>${zh?'路段时间和里程都是估算值':'Segment times and distances are estimates'}</strong>${zh?`：自驾时间是 ${P10_NZTA_DATE} 在 NZTA Journey Planner 逐段查询的读数（含查询当时的路况），取整到 15 分钟，不含停留；NZTA 不显示里程，里程仍是规划估算。巴士、火车和渡轮时间是估算，以运营商时刻表为准。出发前请在下列官方来源核对。`:`: driving times are readings taken segment by segment in NZTA Journey Planner on ${P10_NZTA_DATE} (with the traffic at that moment), rounded to 15 minutes, without stops; NZTA shows no distances, so km are planning estimates. Coach, train and ferry times are estimates; check the operator's timetable. Check the official sources below before you go.`} ${x.sources}: ${(globalThis.P10_ROAD_SOURCES||[]).map(r=>`<a href="${r.url}" target="_blank" rel="noopener noreferrer">${p10Esc(r.label)}</a>`).join(' · ')}</p>`;
    p10FocusDay('all');
  }
  const P10_WISH_REGION={christchurch:'christchurch-canterbury',nelson:'nelson-tasman',picton:'marlborough',tekapo:'christchurch-canterbury',aoraki:'christchurch-canterbury',wanaka:'wanaka',queenstown:'queenstown',milford:'fiordland','te-anau':'fiordland',glaciers:'west-coast',haast:'west-coast',hokitika:'west-coast',punakaiki:'west-coast','arthurs-pass':'christchurch-canterbury',kaikoura:'christchurch-canterbury','abel-tasman':'nelson-tasman',akaroa:'christchurch-canterbury',dunedin:'dunedin',oamaru:'dunedin',catlins:'clutha',stewart:'southland',auckland:'auckland','bay-of-islands':'northland-bay-of-islands',coromandel:'coromandel',hobbiton:'hamilton-waikato',waitomo:'hamilton-waikato',rotorua:'rotorua',taupo:'taupo',tongariro:'ruapehu',napier:'hawkes-bay',wellington:'wellington',taranaki:'taranaki'};
  const P10_REGIONS=[{id:'northland-bay-of-islands',island:'north',zh:'北地与岛屿湾',en:'Northland & Bay of Islands'},{id:'auckland',island:'north',zh:'奥克兰',en:'Auckland'},{id:'coromandel',island:'north',zh:'科罗曼德',en:'The Coromandel'},{id:'hamilton-waikato',island:'north',zh:'汉密尔顿－怀卡托',en:'Hamilton - Waikato'},{id:'bay-of-plenty',island:'north',zh:'丰盛湾',en:'Bay of Plenty'},{id:'tairawhiti-gisborne',island:'north',zh:'泰拉维蒂／吉斯伯恩',en:'Tairāwhiti Gisborne'},{id:'rotorua',island:'north',zh:'罗托鲁瓦',en:'Rotorua'},{id:'taupo',island:'north',zh:'陶波',en:'Taupō'},{id:'ruapehu',island:'north',zh:'鲁阿佩胡',en:'Ruapehu'},{id:'hawkes-bay',island:'north',zh:'霍克斯湾',en:"Hawke's Bay"},{id:'taranaki',island:'north',zh:'塔拉纳基',en:'Taranaki'},{id:'whanganui',island:'north',zh:'旺格努伊',en:'Whanganui'},{id:'manawatu',island:'north',zh:'马纳瓦图',en:'Manawatū'},{id:'wairarapa',island:'north',zh:'怀拉拉帕',en:'Wairarapa'},{id:'wellington',island:'north',zh:'惠灵顿',en:'Wellington'},{id:'nelson-tasman',island:'south',zh:'纳尔逊－塔斯曼',en:'Nelson-Tasman'},{id:'marlborough',island:'south',zh:'马尔堡',en:'Marlborough'},{id:'christchurch-canterbury',island:'south',zh:'基督城－坎特伯雷',en:'Christchurch - Canterbury'},{id:'west-coast',island:'south',zh:'西海岸',en:'West Coast'},{id:'wanaka',island:'south',zh:'瓦纳卡',en:'Wānaka'},{id:'queenstown',island:'south',zh:'皇后镇',en:'Queenstown'},{id:'central-otago',island:'south',zh:'中奥塔哥',en:'Central Otago'},{id:'dunedin',island:'south',zh:'但尼丁',en:'Dunedin'},{id:'clutha',island:'south',zh:'克卢萨',en:'Clutha'},{id:'fiordland',island:'south',zh:'峡湾',en:'Fiordland'},{id:'southland',island:'south',zh:'南地',en:'Southland'}];
  function p10WishLabel(w){const lang=p10Lang();if(w.id==='tekapo'&&lang==='zh')return '特卡波与暗夜星空';return w[lang];}
  function p10RenderWishes(){
    const box=p10$('#p10-wishes');if(!box)return;
    const form=p10$('#plannerForm');if(!form)return;
    const zh=p10Lang()==='zh';
    const island=form.dataset.p10Island||'all';
    const region=form.dataset.p10Region||'all';
    const checked=new Set(Array.from(form.querySelectorAll('[name=p10-wish]:checked'),e=>e.value));
    const islandHost=document.getElementById('p10-island');
    if(islandHost){islandHost.innerHTML=[['all',zh?'全部':'All'],['north',zh?'北岛':'North Island'],['south',zh?'南岛':'South Island']].map(([id,label])=>`<button type="button" data-p10-island="${id}" aria-pressed="${island===id}">${label}</button>`).join('');}
    const regionHost=document.getElementById('p10-region');
    if(regionHost){const regs=P10_REGIONS.filter(r=>island==='all'||r.island===island);regionHost.innerHTML=`<button type="button" data-p10-region="all" aria-pressed="${region==='all'}">${zh?'全部地区':'All regions'}</button>`+regs.map(r=>{const n=WISHES.filter(w=>w.island===(island==='all'?w.island:island)&&P10_WISH_REGION[w.id]===r.id).length;return `<button type="button" data-p10-region="${r.id}" aria-pressed="${region===r.id}" ${n?'':'disabled'}>${zh?r.zh:r.en} (${n})${n?'':zh?' · 本目录暂无地点':' · No places in this directory yet'}</button>`;}).join('');}
    const list=WISHES.filter(w=>(island==='all'||w.island===island)&&(region==='all'||P10_WISH_REGION[w.id]===region||(region==='unmapped'&&!P10_WISH_REGION[w.id])));
    const groups=new Map();
    for(const w of list){const key=P10_WISH_REGION[w.id]||'unmapped';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w);}
    box.innerHTML=[...groups].map(([key,rows])=>{const meta=P10_REGIONS.find(r=>r.id===key);const heading=meta?(zh?meta.zh:meta.en):key;return `<section><h3>${p10Esc(heading)}</h3>${rows.map(w=>{const note=w.id==='oamaru'?(zh?' · 怀塔基区':' · Waitaki District'):'';return `<label data-p10-wish="${p10Esc(w.id)}"><input type="checkbox" name="p10-wish" value="${p10Esc(w.id)}" ${checked.has(w.id)?'checked':''}><span>${p10Esc(p10WishLabel(w)+note)}</span></label>`;}).join('')}</section>`;}).join('');
  }
  window.renderP10Planner=function(){
    if(!p10$('#plannerForm'))return;const x=p10Text(),lang=p10Lang();
    for(const [id,key] of [['p10-start-label','start'],['p10-end-label','end'],['p10-days-label','days'],['p10-pace-label','pace'],['p10-pace-35','pace35'],['p10-pace-5','pace5'],['p10-pace-65','pace65'],['p10-wishes-label','places'],['p10-choose','choose'],['p10-transport-label','transport'],['p10-car-label','car'],['p10-public-label','public'],['p10-preference-label','preference'],['p10-method-label','method'],['p10-local-label','local'],['p10-jev-label','jev'],['p10-submit','submit'],['p10-consent-text','consent']]){const el=document.getElementById(id);if(el)el.textContent=x[key];}
    for(const s of [p10$('#p10-start'),p10$('#p10-end')]) for(const o of s.options)o.textContent=NODES[o.value][lang];
    p10RenderWishes();
    p10Show(p10Result);
  };
  window.setupP10Planner=function(){
    const form=p10$('#plannerForm');if(!form||form.dataset.p10Ready)return;form.dataset.p10Ready='1';
    const hubs=Object.entries(NODES).filter(([,n])=>n.hub);
    for(const id of ['p10-start','p10-end'])p10$('#'+id).innerHTML=hubs.map(([key,n])=>`<option value="${key}">${p10Esc(n.zh)}</option>`).join('');
    p10$('#p10-start').value='christchurch';p10$('#p10-end').value='queenstown';
    p10$('#days').innerHTML=Array.from({length:19},(_,i)=>`<option value="${i+3}">${i+3}</option>`).join('');p10$('#days').value='7';
    p10RenderWishes();
    const method=p10$('#plannerMethod'), jevAvailable=false;
    const methodLabel=p10$('#p10-method-label'), jevOption=p10$('#p10-jev-label');
    method.hidden=!jevAvailable;if(methodLabel)methodLabel.hidden=!jevAvailable;if(jevOption)jevOption.disabled=!jevAvailable;
    if(!jevAvailable){method.value='local';p10$('#jevConsent').hidden=true;}
    method.addEventListener('change',()=>{p10$('#jevConsent').hidden=method.value!=='jev';p10$('#jevConsentCheck').checked=false;p10Status('');});
    try{const saved=JSON.parse(localStorage.getItem('p10-road-plan'));if(saved){for(const [selector,value] of [['#p10-start',saved.start],['#p10-end',saved.end],['#days',saved.days],['#p10-pace',saved.pace],['#preference',saved.preference],['#p10-transport',saved.car?'car':'public']])if(value!=null&&p10$(selector).querySelector(`option[value="${String(value)}"]`))p10$(selector).value=String(value);for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=(saved.wishes||[]).includes(box.value);}}catch{}
    form.addEventListener('click',event=>{
      const island=event.target.closest('[data-p10-island]');
      const region=event.target.closest('[data-p10-region]');
      if(island){form.dataset.p10Island=island.dataset.p10Island;const meta=P10_REGIONS.find(r=>r.id===form.dataset.p10Region);if(meta&&form.dataset.p10Island!=='all'&&meta.island!==form.dataset.p10Island)form.dataset.p10Region='all';p10RenderWishes();}
      if(region&&!region.disabled){form.dataset.p10Region=region.dataset.p10Region;p10RenderWishes();}
    });
    p10$('#planResult').addEventListener('keydown',event=>{
      const card=event.target.closest('[data-p10-index]');
      if(!card||!event.altKey||!p10View)return;
      const i=Number(card.dataset.p10Index);
      if(event.key==='ArrowUp'&&i>0){event.preventDefault();const days=p10View.days;const [item]=days.splice(i,1);days.splice(i-1,0,item);days.forEach((d,n)=>d.n=n+1);p10Show(p10Result);}
      if(event.key==='ArrowDown'&&i<p10View.days.length-1){event.preventDefault();const days=p10View.days;const [item]=days.splice(i,1);days.splice(i+1,0,item);days.forEach((d,n)=>d.n=n+1);p10Show(p10Result);}
    });
    p10$('#planResult').addEventListener('dragstart',event=>{const b=event.target.closest('[data-p10-drag]');if(!b)return;event.dataTransfer.setData('text/plain',b.dataset.p10Drag);});
    p10$('#planResult').addEventListener('dragover',event=>{if(event.target.closest('[data-p10-index]'))event.preventDefault();});
    p10$('#planResult').addEventListener('drop',event=>{const card=event.target.closest('[data-p10-index]');if(!card||!p10View)return;event.preventDefault();const from=Number(event.dataTransfer.getData('text/plain'));const to=Number(card.dataset.p10Index);if(!Number.isInteger(from)||from===to)return;const days=p10View.days;const [item]=days.splice(from,1);days.splice(to,0,item);days.forEach((d,n)=>d.n=n+1);p10Show(p10Result);});
    p10$('#planResult').addEventListener('click',event=>{
      const focus=event.target.closest('[data-p10-focus],[data-p10-map-day]');if(focus){const day=focus.dataset.p10Focus||focus.dataset.p10MapDay;p10FocusDay(day);if(focus.dataset.p10Focus)p10$('#p10-trip-map')?.scrollIntoView({behavior:'auto',block:'start'});return;}
      const edit=event.target.closest('[data-p10-edit]');
      if(edit){const choices=form.querySelector('.p10-choices');if(choices){choices.open=true;choices.querySelector('summary')?.focus({preventScroll:true});}document.getElementById('p10-wishes')?.scrollIntoView({behavior:'auto',block:'start'});return;}
      const up=event.target.closest('[data-p10-up]'),down=event.target.closest('[data-p10-down]'),moveto=event.target.closest('[data-p10-moveto]'),dest=event.target.closest('[data-p10-dest]');
      if((up||down||moveto||dest)&&p10View){
        const days=p10View.days;
        const from=Number((up||down||moveto||{dataset:{}}).dataset.p10Up||(down&&down.dataset.p10Down)||(moveto&&moveto.dataset.p10Moveto)||0);
        if(dest){const to=Number(dest.dataset.p10Dest);const item=days.splice(p10View.moveFrom,1)[0];days.splice(to,0,item);days.forEach((d,i)=>d.n=i+1);p10Show(p10Result);return;}
        if(up){const i=Number(up.dataset.p10Up);if(i>0){const [item]=days.splice(i,1);days.splice(i-1,0,item);days.forEach((d,n)=>d.n=n+1);p10Show(p10Result);}return;}
        if(down){const i=Number(down.dataset.p10Down);if(i<days.length-1){const [item]=days.splice(i,1);days.splice(i+1,0,item);days.forEach((d,n)=>d.n=n+1);p10Show(p10Result);}return;}
        if(moveto){p10View.moveFrom=Number(moveto.dataset.p10Moveto);const zh=p10Lang()==='zh';const panel=document.createElement('div');panel.className='v4-drawer';panel.innerHTML=days.map((_,i)=>`<button type="button" data-p10-dest="${i}">${zh?`移到第 ${i+1} 天`:`Move to day ${i+1}`}</button>`).join(' ');moveto.closest('.plan-day')?.prepend(panel);return;}
      }
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
        try{p10Recommendation=await window.TripPlanner.chooseWithJev({days,preference,island:p10JevIsland(start,wishes)});p10Status('');}catch{p10Status(x.error);}finally{button.disabled=false;}
      }
      try{p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));p10Show(p10Result);}catch{p10Status(p10Lang()==='zh'?'请检查出发地、终点和天数。':'Check the start, destination and days.');}
    });
    window.renderP10Planner();
  };
}

})();
