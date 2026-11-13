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
  wanaka: { at: [-44.7, 169.13], en: 'Wānaka', zh: '瓦纳卡', hub: true },
  'te-anau': { at: [-45.41, 167.72], en: 'Te Anau', zh: '蒂阿瑙', hub: true },
  milford: { at: [-44.67, 167.93], en: 'Milford Sound', zh: '米尔福德峡湾' },
  tekapo: { at: [-44.0, 170.48], en: 'Lake Tekapo', zh: '特卡波' },
  twizel: { at: [-44.26, 170.1], en: 'Twizel', zh: '特威泽尔' },
  aoraki: { at: [-43.73, 170.1], en: 'Aoraki/Mount Cook Village', zh: '库克山村' },
  oamaru: { at: [-45.1, 170.97], en: 'Ōamaru', zh: '奥马鲁' },
  owaka: { at: [-46.45, 169.66], en: 'Owaka (the Catlins)', zh: '奥瓦卡（卡特林斯）' },
  invercargill: { at: [-46.41, 168.35], en: 'Invercargill', zh: '因弗卡吉尔', hub: true },
  bluff: { at: [-46.6, 168.33], en: 'Bluff', zh: '布拉夫' },
  oban: { at: [-46.9, 168.13], en: 'Oban, Stewart Island', zh: '斯图尔特岛奥本' },
  // North Island
  auckland: { at: [-36.85, 174.76], en: 'Auckland', zh: '奥克兰', hub: true },
  wellington: { at: [-41.29, 174.78], en: 'Wellington', zh: '惠灵顿', hub: true },
  paihia: { at: [-35.28, 174.09], en: 'Paihia (Bay of Islands)', zh: '派希亚（岛屿湾）' },
  hahei: { at: [-36.84, 175.8], en: 'Hahei (Coromandel)', zh: '哈黑（科罗曼德）' },
  hamilton: { at: [-37.79, 175.28], en: 'Hamilton', zh: '汉密尔顿', hub: true },
  matamata: { at: [-37.81, 175.77], en: 'Matamata', zh: '玛塔玛塔' },
  waitomo: { at: [-38.26, 175.1], en: 'Waitomo', zh: '怀托摩' },
  rotorua: { at: [-38.14, 176.25], en: 'Rotorua', zh: '罗托鲁瓦', hub: true },
  taupo: { at: [-38.69, 176.07], en: 'Taupō', zh: '陶波', hub: true },
  'national-park': { at: [-39.18, 175.4], en: 'National Park Village (Tongariro)', zh: '国家公园村（汤加里罗）' },
  napier: { at: [-39.49, 176.91], en: 'Napier', zh: '内皮尔', hub: true },
  'new-plymouth': { at: [-39.06, 174.08], en: 'New Plymouth', zh: '新普利茅斯', hub: true },
  // Added for ticket D (2026-11-12); coordinates are the catalogue's OSM Nominatim points, rounded.
  whanganui: { at: [-39.93, 175.05], en: 'Whanganui', zh: '旺格努伊' },
  pipiriki: { at: [-39.48, 175.04], en: 'Pipiriki', zh: '皮皮里基' },
  taumarunui: { at: [-38.88, 175.26], en: 'Taumarunui', zh: '陶马鲁努依' },
  tauranga: { at: [-37.68, 176.17], en: 'Tauranga', zh: '陶朗加' },
  whakatane: { at: [-37.95, 176.99], en: 'Whakatāne', zh: '瓦卡塔尼' },
  gisborne: { at: [-38.66, 178.02], en: 'Gisborne', zh: '吉斯伯恩' },
  'tolaga-bay': { at: [-38.37, 178.3], en: 'Tolaga Bay', zh: '托拉加湾' },
  feilding: { at: [-40.23, 175.56], en: 'Feilding', zh: '费尔丁' },
  masterton: { at: [-40.95, 175.66], en: 'Masterton', zh: '马斯特顿' },
  // South Island, added for ticket D
  alexandra: { at: [-45.26, 169.39], en: 'Alexandra', zh: '亚历山德拉' },
  // Catalogue towns that were off the network. Coordinates are the catalogue's own points.
  glenorchy: { at: [-44.84975, 168.38520], en: 'Glenorchy', zh: '格林诺奇' },
  blenheim: { at: [-41.51187, 173.95459], en: 'Blenheim', zh: '布伦海姆' },
  waiheke: { at: [-36.78192, 175.00981], en: 'Waiheke Island', zh: '怀希基岛' },
  cromwell: { at: [-45.03713, 169.19729], en: 'Cromwell', zh: '克伦威尔' },
  coromandel: { at: [-36.76016, 175.49727], en: 'Coromandel Town', zh: '科罗曼德镇' },
  kaitaia: { at: [-35.11413, 173.264], en: 'Kaitaia', zh: '凯塔亚' },
  opononi: { at: [-35.51167, 173.39173], en: 'Opononi', zh: '奥波诺尼' },
  whangarei: { at: [-35.72753, 174.31942], en: 'Whangārei', zh: '旺格雷' },
  whangamata: { at: [-37.20633, 175.87197], en: 'Whangamatā', zh: '旺格玛塔' },
  stratford: { at: [-39.33969, 174.28409], en: 'Stratford', zh: '斯特拉福德' },
  whangamomona: { at: [-39.14466, 174.73563], en: 'Whangamōmona', zh: '旺格摩摩纳' },
  martinborough: { at: [-41.21833, 175.45949], en: 'Martinborough', zh: '马丁堡' },
};

// en/zh are the label when travelling from→to as stored. enRev/zhRev are the label in the other direction.
// A segment with no reverse pair is the same text both ways (the road name does not point at one end).
const R = (en, zh, enRev, zhRev) => ({ en, zh, enRev: enRev == null ? en : enRev, zhRev: zhRev == null ? zh : zhRev });
// [from, to, hours, km, road, pt, ptH]
const EDGES = [
  ['christchurch', 'akaroa', 1.5, 82, R('SH75 over Banks Peninsula', 'SH75 翻越班克斯半岛'), 'shuttle'],
  ['christchurch', 'arthurs-pass', 2, 150, R('SH73 across the Canterbury Plains to Arthur’s Pass', 'SH73 穿过坎特伯雷平原上亚瑟通道', 'SH73 across the Canterbury Plains to Christchurch', 'SH73 穿过坎特伯雷平原到基督城'), 'train'],
  ['arthurs-pass', 'greymouth', 1.25, 98, R('SH73 down the Ōtira Viaduct to the West Coast', 'SH73 经奥蒂拉高架桥下到西海岸', 'SH73 up the Ōtira Viaduct', 'SH73 经奥蒂拉高架桥而上'), 'train'],
  ['greymouth', 'hokitika', 0.5, 40, R('SH6 along the coast', 'SH6 沿海岸'), 'coach'],
  ['greymouth', 'punakaiki', 0.75, 45, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['punakaiki', 'westport', 0.75, 57, R('SH6 Great Coast Road', 'SH6 大海岸公路'), 'coach'],
  ['westport', 'nelson', 3, 225, R('SH6 through the Buller Gorge', 'SH6 穿过布勒峡谷'), 'coach'],
  ['nelson', 'marahau', 1, 67, R('SH60 to the Abel Tasman', 'SH60 到亚伯塔斯曼', 'SH60 to Nelson', 'SH60 到纳尔逊'), 'shuttle'],
  ['nelson', 'picton', 2, 110, R('SH6 via Havelock (or Queen Charlotte Drive)', 'SH6 经哈夫洛克（或夏洛特皇后公路）'), 'coach'],
  ['picton', 'kaikoura', 2, 155, R('SH1 down the Kaikōura coast', 'SH1 沿凯库拉海岸南下', 'SH1 up the Kaikōura coast', 'SH1 沿凯库拉海岸北上'), 'train'],
  ['kaikoura', 'christchurch', 2.5, 180, R('SH1', 'SH1'), 'train'],
  ['hokitika', 'franz-josef', 2, 135, R('SH6 south through the rainforest', 'SH6 穿雨林南下', 'SH6 north through the rainforest', 'SH6 穿雨林北上'), 'coach'],
  ['franz-josef', 'fox', 0.5, 25, R('SH6', 'SH6'), 'coach'],
  ['fox', 'haast', 1.5, 120, R('SH6 along the glacier coast', 'SH6 沿冰川海岸'), 'coach'],
  ['haast', 'wanaka', 2, 140, R('SH6 over the Haast Pass', 'SH6 翻越哈斯特隘口'), 'coach'],
  ['wanaka', 'queenstown', 1.25, 67, R('Crown Range Road (coaches use SH6)', '皇冠山脉公路（大巴绕 SH6）'), 'coach', 1.5],
  ['wanaka', 'twizel', 1.75, 143, R('SH8 over the Lindis Pass', 'SH8 翻越林迪斯隘口'), 'coach'],
  ['queenstown', 'twizel', 2.5, 185, R('SH6 and SH8 via Cromwell and the Lindis Pass', 'SH6、SH8 经克伦威尔和林迪斯隘口'), 'coach'],
  ['twizel', 'tekapo', 0.75, 58, R('SH8 past Lake Pukaki', 'SH8 经普卡基湖'), 'coach'],
  ['twizel', 'aoraki', 0.75, 65, R('SH80 along Lake Pukaki to Aoraki/Mount Cook', 'SH80 沿普卡基湖到奥拉基／库克山', 'SH80 along Lake Pukaki to Twizel', 'SH80 沿普卡基湖到特威泽尔'), 'shuttle'],
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
  ['oamaru', 'twizel', 1.75, 130, R('SH83 up the Waitaki Valley', 'SH83 沿怀塔基河谷', 'SH83 down the Waitaki Valley', 'SH83 沿怀塔基河谷而下'), null],
  ['picton', 'wellington', 3.5, 0, R('Cook Strait ferry (Interislander or Bluebridge)', '库克海峡渡轮（Interislander 或 Bluebridge）'), 'ferry'],
  // North Island
  ['auckland', 'paihia', 3, 230, R('SH1 north', 'SH1 北上', 'SH1 south', 'SH1 南下'), 'coach'],
  ['auckland', 'hahei', 2.25, 175, R('SH2 and SH25 to the Coromandel', 'SH2、SH25 到科罗曼德', 'SH25 and SH2 to Auckland', 'SH25、SH2 到奥克兰'), null],
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
  // Ticket D (2026-11-12): hours from data/nzta/readings-2026-11-12.txt; km from an OSRM route on OpenStreetMap data
  // (data/nzta/osrm-km-2026-11-12.json; 0 = not checked). No public transport is listed on these legs (null) until a timetable is sourced.
  ['rotorua', 'tauranga', 1, 64, R('SH36', 'SH36'), null],
  ['hamilton', 'tauranga', 1.5, 105, R('SH1 and SH29 over the Kaimai Range', 'SH1、SH29 翻越凯麦山脉'), null],
  ['auckland', 'tauranga', 2.75, 225, R('SH1 and SH2', 'SH1、SH2'), null],
  ['tauranga', 'whakatane', 1, 89, R('SH2 along the Bay of Plenty', 'SH2 沿丰盛湾'), null],
  ['rotorua', 'whakatane', 1.25, 105, R('SH30 past the Rotorua lakes', 'SH30 经罗托鲁瓦湖区'), null],
  ['whakatane', 'gisborne', 2.75, 185, R('SH2 via Ōpōtiki and the Waioeka Gorge', 'SH2 经奥波蒂基和怀奥伊卡峡谷'), null],
  ['napier', 'gisborne', 3.25, 217, R('SH2 via Wairoa', 'SH2 经怀罗阿'), null],
  ['gisborne', 'tolaga-bay', 0.75, 55, R('SH35 up the East Coast', 'SH35 沿东海岸北上', 'SH35 down the East Coast', 'SH35 沿东海岸南下'), null],
  ['whanganui', 'pipiriki', 1.5, 76, R('Whanganui River Road (narrow and winding)', '旺格努伊河路（路窄弯多）'), null],
  // 61 km is 35 km Raetihi–National Park plus 26 km Raetihi–Pipiriki on the Visit Ruapehu Raetihi map (read 2026-11-11).
  ['national-park', 'pipiriki', 1, 61, R('SH4 and the Pipiriki–Raetihi Road', 'SH4、皮皮里基—莱蒂希公路'), null],
  ['national-park', 'whanganui', 1.75, 121, R('SH4 through the Parapara', 'SH4 经帕拉帕拉'), null],
  ['whanganui', 'wellington', 2.25, 193, R('SH3 and SH1 down the Kāpiti Coast', 'SH3、SH1 沿卡皮蒂海岸', 'SH3 and SH1 up the Kāpiti Coast', 'SH3、SH1 沿卡皮蒂海岸北上'), null],
  ['new-plymouth', 'whanganui', 2, 158, R('SH3 round South Taranaki', 'SH3 绕南塔拉纳基'), null],
  ['whanganui', 'feilding', 0.75, 64, R('SH3 and SH54', 'SH3、SH54'), null],
  ['feilding', 'wellington', 2, 158, R('SH54 and SH1', 'SH54、SH1'), null],
  ['napier', 'feilding', 2.25, 186, R('SH50 and SH2, then SH3', 'SH50、SH2，再走 SH3'), null],
  ['wellington', 'masterton', 1.5, 99, R('SH2 over the Remutaka Hill', 'SH2 翻越雷穆塔卡山'), null],
  ['napier', 'masterton', 2.75, 231, R('SH50 and SH2', 'SH50、SH2'), null],
  ['queenstown', 'alexandra', 1.25, 94, R('SH6 and SH8 via Cromwell', 'SH6、SH8 经克伦威尔'), null],
  ['dunedin', 'alexandra', 2.25, 180, R('SH1 and SH8', 'SH1、SH8'), null],
  ['national-park', 'taumarunui', 0.5, 43, R('SH4', 'SH4'), null],
  // Spur links for the 12 catalogue towns (2026-11-12). Each driving spur touches only one town already on the
  // network, so it does not shorten an existing highway. Hours are the OSRM duration rounded to 15 minutes; km is the
  // OSRM distance. Road names are not invented. Waiheke is the Fullers360 ferry, not a drive.
  ['queenstown', 'glenorchy', 0.75, 46, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['picton', 'blenheim', 0.5, 28, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['queenstown', 'cromwell', 0.75, 61, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['hahei', 'coromandel', 1, 54, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['paihia', 'kaitaia', 1.5, 102, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['paihia', 'opononi', 1.25, 86, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['auckland', 'whangarei', 2.25, 156, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['hahei', 'whangamata', 0.75, 61, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['new-plymouth', 'stratford', 0.5, 40, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['stratford', 'whangamomona', 0.75, 62, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['masterton', 'martinborough', 0.75, 43, R('OSRM driving route, town centre to town centre', 'OSRM 驾车路线，镇中心到镇中心'), null],
  ['auckland', 'waiheke', 0.75, 0, R('Fullers360 ferry, Downtown Auckland to Matiatia (about 40–45 minutes)', 'Fullers360 渡轮，奥克兰市区码头到马蒂亚蒂亚（约 40–45 分钟）'), 'ferry'],
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
  "rotorua|tauranga": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU&b=ChIJ5WTUe-d2bm0RJpmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "罗托路亚, 新西兰", to: "陶朗加, 新西兰", route: "State Hwy 36", time: "56 mins", minutes: 56, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:24.207Z" }, hoursBefore: 1, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "hamilton|tauranga": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJITamh3QibW0RA5miQ2HvAAU&b=ChIJ5WTUe-d2bm0RJpmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "汉密尔顿, 新西兰", to: "陶朗加, 新西兰", route: "SH 1和State Hwy 29", time: "1h 30m", minutes: 90, traffic: null, readAt: "2026-11-11T15:02:28.963Z" }, hoursBefore: 1.5, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "auckland|tauranga": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ--acWvtHDW0RF5miQ2HvAAU&b=ChIJ5WTUe-d2bm0RJpmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "奥克兰, 新西兰", to: "陶朗加, 新西兰", route: "SH 1", time: "2h 40m", minutes: 160, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:34.285Z" }, hoursBefore: 2.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "tauranga|whakatane": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJ5WTUe-d2bm0RJpmjQ2HvAAU&b=ChIJdwngI04Ab20RYBqjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "陶朗加, 新西兰", to: "華卡塔尼, 新西兰", route: "State Hwy 2和State Hwy 2", time: "1h 5m", minutes: 65, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:37.692Z" }, hoursBefore: 1, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "rotorua|whakatane": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJK7L2gj2Ybm0RMZmjQ2HvAAU&b=ChIJdwngI04Ab20RYBqjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "罗托路亚, 新西兰", to: "華卡塔尼, 新西兰", route: "State Hwy 30", time: "1h 14m", minutes: 74, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:40.955Z" }, hoursBefore: 1.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "whakatane|gisborne": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJdwngI04Ab20RYBqjQ2HvAAU&b=ChIJl6ywQZzAZW0RB5miQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "華卡塔尼, 新西兰", to: "吉斯伯恩, 新西兰", route: "State Hwy 2", time: "2h 45m", minutes: 165, traffic: "8 min slower than normal", readAt: "2026-11-11T15:02:44.526Z" }, hoursBefore: 2.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "napier|gisborne": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJmcqxT9bJaW0RUOiiQ2HvAAU&b=ChIJl6ywQZzAZW0RB5miQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "内皮尔, 新西兰", to: "吉斯伯恩, 新西兰", route: "State Hwy 2", time: "3h 16m", minutes: 196, traffic: "7 min slower than normal", readAt: "2026-11-11T15:02:48.574Z" }, hoursBefore: 3.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "gisborne|tolaga-bay": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJl6ywQZzAZW0RB5miQ2HvAAU&b=ChIJl69hhXM3ZG0RkA-jQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "吉斯伯恩, 新西兰", to: "Tolaga Bay, 新西兰", route: "State Hwy 35", time: "45 mins", minutes: 45, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:52.124Z" }, hoursBefore: 0.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "whanganui|pipiriki": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJS2N2fnS4am0RMpmjQ2HvAAU&b=ChIJf7mVjNjIam0RoPaiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "Whanganui, 新西兰", to: "Pipiriki, 新西兰", route: "Whanganui River Rd", time: "1h 27m", minutes: 87, traffic: "1 min faster than normal", readAt: "2026-11-11T15:02:56.026Z" }, hoursBefore: 1.5, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "national-park|pipiriki": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHVFNwkYca20RkOiiQ2HvAAU&b=ChIJf7mVjNjIam0RoPaiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "國家公園村, 新西兰", to: "Pipiriki, 新西兰", route: "State Hwy 4和Pipiriki Raetihi Rd", time: "1h 0m", minutes: 60, traffic: null, readAt: "2026-11-11T15:03:01.859Z" }, hoursBefore: 1, estimate: true, km: { status: "checked", km: 61, source: "Visit Ruapehu Raetihi town map: 35 km from Raetihi to National Park Village plus 26 km from Raetihi to Pipiriki, the SH4 and Pipiriki–Raetihi Road route", url: "https://www.visitruapehu.com/media/PDF/Raetihi%20map%2014%20BACK_compressed.pdf", checkedAt: "2026-11-11" } },
  "national-park|whanganui": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHVFNwkYca20RkOiiQ2HvAAU&b=ChIJS2N2fnS4am0RMpmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "國家公園村, 新西兰", to: "Whanganui, 新西兰", route: "State Hwy 4", time: "1h 43m", minutes: 103, traffic: null, readAt: "2026-11-11T15:03:07.753Z" }, hoursBefore: 1.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "whanganui|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJS2N2fnS4am0RMpmjQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-12", nzta: { from: "Whanganui, 新西兰", to: "惠灵顿, 新西兰", route: "SH 1", time: "2h 19m", minutes: 139, traffic: "2 min faster than normal", readAt: "2026-11-11T15:03:11.944Z" }, hoursBefore: 2.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "new-plymouth|whanganui": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJDc5kI-b5FG0RoOmiQ2HvAAU&b=ChIJS2N2fnS4am0RMpmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "新普利茅斯, 新西兰", to: "Whanganui, 新西兰", route: "SH 3", time: "2h 4m", minutes: 124, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:14.780Z" }, hoursBefore: 2, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "whanganui|feilding": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJS2N2fnS4am0RMpmjQ2HvAAU&b=ChIJRebZWno1QG0RMMOiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "Whanganui, 新西兰", to: "Feilding, 新西兰", route: "SH 3", time: "50 mins", minutes: 50, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:17.706Z" }, hoursBefore: 0.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "feilding|wellington": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJRebZWno1QG0RMMOiQ2HvAAU&b=ChIJy3TpSfyxOG0RcLQTomPvAAo", checkedAt: "2026-11-12", nzta: { from: "Feilding, 新西兰", to: "惠灵顿, 新西兰", route: "SH 1", time: "1h 53m", minutes: 113, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:21.341Z" }, hoursBefore: 2, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "napier|feilding": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJmcqxT9bJaW0RUOiiQ2HvAAU&b=ChIJRebZWno1QG0RMMOiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "内皮尔, 新西兰", to: "Feilding, 新西兰", route: "State Hwy 50和State Hwy 2", time: "2h 22m", minutes: 142, traffic: "1 min slower than normal", readAt: "2026-11-11T15:03:24.977Z" }, hoursBefore: 2.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "wellington|masterton": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJy3TpSfyxOG0RcLQTomPvAAo&b=ChIJk57H2MI-QW0RFpmiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "惠灵顿, 新西兰", to: "马斯特顿, 新西兰", route: "State Hwy 2", time: "1h 32m", minutes: 92, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:28.979Z" }, hoursBefore: 1.5, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "napier|masterton": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJmcqxT9bJaW0RUOiiQ2HvAAU&b=ChIJk57H2MI-QW0RFpmiQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "内皮尔, 新西兰", to: "马斯特顿, 新西兰", route: "State Hwy 50和State Hwy 2", time: "2h 50m", minutes: 170, traffic: "1 min slower than normal", readAt: "2026-11-11T15:03:32.430Z" }, hoursBefore: 2.75, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "queenstown|alexandra": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJX96o1_Ed1akRAKZ5hIbvAAU&b=ChIJaYcwd_UlK6gRAKeW54jvAAo", checkedAt: "2026-11-12", nzta: { from: "皇后镇, 新西兰", to: "Alexandra, 新西兰", route: "State Hwy 6和State Hwy 8", time: "1h 11m", minutes: 71, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:35.614Z" }, hoursBefore: 1.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "dunedin|alexandra": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJPVFfD-DkK6gRQZl5hIbvAAU&b=ChIJaYcwd_UlK6gRAKeW54jvAAo", checkedAt: "2026-11-12", nzta: { from: "但尼丁, 新西兰", to: "Alexandra, 新西兰", route: "SH 1和State Hwy 8", time: "2h 22m", minutes: 142, traffic: "1 min faster than normal", readAt: "2026-11-11T15:03:38.751Z" }, hoursBefore: 2.25, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "national-park|taumarunui": { status: 'nzta-time-read', check: 'NZTA Journey Planner', url: "https://www.journeys.nzta.govt.nz/journey-planner/commute/0?a=ChIJHVFNwkYca20RkOiiQ2HvAAU&b=ChIJCySntd1Ga20RwAmjQ2HvAAU", checkedAt: "2026-11-12", nzta: { from: "國家公園村, 新西兰", to: "陶马鲁努伊, 新西兰", route: "State Hwy 4", time: "32 mins", minutes: 32, traffic: "1 min slower than normal", readAt: "2026-11-11T15:03:42.588Z" }, hoursBefore: 0.5, estimate: true, km: { status: "osrm", source: "OSRM demo route (router.project-osrm.org) on OpenStreetMap data, town centre to town centre", checkedAt: "2026-11-12" } },
  "queenstown|glenorchy": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 39, km: 46 }, km: { status: 'osrm', km: 46, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "picton|blenheim": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 25, km: 28 }, km: { status: 'osrm', km: 28, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "queenstown|cromwell": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 52, km: 61 }, km: { status: 'osrm', km: 61, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "hahei|coromandel": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 59, km: 54 }, km: { status: 'osrm', km: 54, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "paihia|kaitaia": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 84, km: 102 }, km: { status: 'osrm', km: 102, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "paihia|opononi": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 74, km: 86 }, km: { status: 'osrm', km: 86, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "auckland|whangarei": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 129, km: 156 }, km: { status: 'osrm', km: 156, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "hahei|whangamata": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 52, km: 61 }, km: { status: 'osrm', km: 61, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "new-plymouth|stratford": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 36, km: 40 }, km: { status: 'osrm', km: 40, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "stratford|whangamomona": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 48, km: 62 }, km: { status: 'osrm', km: 62, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "masterton|martinborough": { status: 'osrm', check: 'OSRM', url: 'https://router.project-osrm.org/', checkedAt: '2026-11-12', osrm: { minutes: 37, km: 43 }, km: { status: 'osrm', km: 43, source: 'OSRM demo route (router.project-osrm.org) on OpenStreetMap, town centre to town centre', checkedAt: '2026-11-12' } },
  "auckland|waiheke": { status: 'operator', check: 'Fullers360', url: 'https://www.fullers.co.nz/destinations-and-experiences/destinations/waiheke-island', checkedAt: '2026-11-12', km: { status: '待核', source: 'Fullers360 states about 40 to 45 minutes and does not give a distance used here', checkedAt: '2026-11-12' } },
};
const P10_NZTA_DATE = Object.values(EDGE_SOURCES).map(s => s.checkedAt).sort().pop();
// Day-card notes for roads that need care (tickets D and E); each names its public source and the date it was read.
const P10_ROAD_NOTES = {
  'whanganui|pipiriki': { zh: '旺格努伊河路比主干公路窄、沿河弯道多，要比平时开得慢。', en: 'The Whanganui River Road is narrower than the main highway and winds along the river, so drive more slowly than usual.', source: 'Discover Whanganui: Explore the River Road', url: 'https://discoverwhanganui.nz/guides/whanganui-river-road/', checkedAt: '2026-11-12' },
};
// Alpine passes on the network. From June to October (the travel month on the form) their day cards get a winter warning.
const P10_WINTER_MONTHS = [6, 7, 8, 9, 10];
const P10_WINTER_EDGES = {
  'christchurch|arthurs-pass': { zh: '亚瑟通道（SH73）', en: 'Arthur’s Pass (SH73)' },
  'arthurs-pass|greymouth': { zh: '亚瑟通道（SH73）', en: 'Arthur’s Pass (SH73)' },
  'wanaka|twizel': { zh: '林迪斯隘口（SH8）', en: 'the Lindis Pass (SH8)' },
  'queenstown|twizel': { zh: '林迪斯隘口（SH8）', en: 'the Lindis Pass (SH8)' },
  'haast|wanaka': { zh: '哈斯特隘口（SH6）', en: 'the Haast Pass (SH6)' },
  'wanaka|queenstown': { zh: '皇冠山脉公路', en: 'the Crown Range Road' },
  'te-anau|milford': { zh: '米尔福德公路（SH94）', en: 'the Milford Road (SH94)' },
  'christchurch|tekapo': { zh: '伯克斯隘口（SH8）', en: 'Burkes Pass (SH8)' },
  'taupo|wellington': { zh: '沙漠公路（SH1）', en: 'the Desert Road (SH1)' },
};
const P10_WINTER_SOURCES = [
  { label: 'NZTA: Winter driving', url: 'https://www.nzta.govt.nz/driving-skills/safe-driving-habits/driving-to-the-conditions/winter-driving', checkedAt: '2026-11-12' },
  { label: 'NZTA Journey Planner', url: 'https://www.journeys.nzta.govt.nz/journey-planner', checkedAt: '2026-11-12' },
  { label: 'Mt Hutt FAQs (rental cars, alpine roads and chains)', url: 'https://www.mthutt.co.nz/faqs', checkedAt: '2026-11-12' },
];
function p10EdgeKey(a,b,table){return table[a+'|'+b]?a+'|'+b:table[b+'|'+a]?b+'|'+a:null;}
// The road and winter notes for one day's legs, as list items (empty when none apply).
function p10RoadNotes(legs,month,zh){
  const out=[],seen=new Set();
  // Coaches, trains and shuttles use the same alpine roads, so a winter closure applies to them too.
  const onRoad=new Set(['car','coach','train','shuttle']);
  for(const l of legs||[]){
    if(l.mode==='car'){
      const rk=p10EdgeKey(l.a,l.b,P10_ROAD_NOTES);
      if(rk&&!seen.has(rk)){seen.add(rk);const n=P10_ROAD_NOTES[rk];out.push({kind:'road',text:zh?n.zh:n.en,sources:[{label:n.source,url:n.url,checkedAt:n.checkedAt}]});}
    }
    if(!onRoad.has(l.mode))continue;
    const wk=P10_WINTER_MONTHS.includes(Number(month))?p10EdgeKey(l.a,l.b,P10_WINTER_EDGES):null;
    // One warning per pass per day: Christchurch–Arthur's Pass and Arthur's Pass–Greymouth are the same pass.
    const passId=wk?P10_WINTER_EDGES[wk].en:'';
    if(wk&&!seen.has('w:'+passId)){seen.add('w:'+passId);const pass=P10_WINTER_EDGES[wk][zh?'zh':'en'];
      const text=l.mode==='car'
        ?(zh?`冬季山路：${pass} 在 6–10 月可能结冰、下雪或临时封路。出发当天先查 NZTA 路况，封闭的道路不能走；冰雪路面放慢车速，车上备保暖衣物、水和食物，油箱至少留半箱。是否需要防滑链以当天路况为准，租车在高山路段和使用防滑链不一定在保险范围内，先问租车公司。`
          :`Winter road: ${pass} can have ice, snow or temporary closures from June to October. Check NZTA road conditions on the day and never drive a closed road; slow down on ice and snow, carry warm clothes, water and food, and keep at least half a tank of fuel. Whether chains are needed depends on the day; rental cover may exclude alpine roads and chains, so ask your rental company first.`)
        :(zh?`冬季山路：${pass} 在 6–10 月可能结冰、下雪或临时封路，大巴和火车也可能停开或改线。出发当天先查 NZTA 路况和运营商公告，封闭的道路不要走。`
          :`Winter road: ${pass} can have ice, snow or temporary closures from June to October, and coaches and trains may be cancelled or rerouted. Check NZTA road conditions and the operator on the day, and do not travel a closed road.`);
      out.push({kind:'winter',text,sources:P10_WINTER_SOURCES});}
  }
  return out;
}
// Every NZTA query date in use (the first network was read on one day, later segments on another).
const P10_NZTA_DATES = [...new Set(Object.values(EDGE_SOURCES).map(s => s.checkedAt).filter(Boolean))].sort();
// The tag after each leg: car legs show the NZTA query date and the raw reading on hover; other modes are estimates.
function p10LegTag(l, zh) {
  const s = l.src || EDGE_SOURCE_DEFAULT, nz = l.mode === 'car' && s.nzta;
  // NZTA route names were read with a Chinese joiner (browser locale); show it in the reader's language.
  const road = nz ? (zh ? s.nzta.route : s.nzta.route.replace(/和/g, ' and ').replace(/、/g, ', ')) : '';
  // A quiet note, not a warning badge: the full reading is in the tooltip and the method is explained once below the plan.
  // Segments added later (ticket D) are labelled as estimates: NZTA shows Google's suggested time, also on local roads.
  const label = nz ? (s.estimate ? (zh ? `NZTA ${s.checkedAt} 估算` : `NZTA estimate ${s.checkedAt}`) : (zh ? `NZTA ${s.checkedAt} 读数` : `NZTA reading ${s.checkedAt}`)) : s.status === 'osrm' ? (zh ? `OSRM ${s.checkedAt} 估算` : `OSRM estimate ${s.checkedAt}`) : (zh ? '时刻表为准' : 'check timetable');
  const kmNote = s.km && s.km.status === 'checked'
    ? (zh ? `里程 ${s.km.km} km：${s.km.source}（查阅 ${s.km.checkedAt}）。` : `Distance ${s.km.km} km: ${s.km.source} (read ${s.km.checkedAt}).`)
    : s.km && s.km.status === 'osrm'
      ? (zh ? `里程 ${s.km.km} km：${s.km.source}（查阅 ${s.km.checkedAt}）。` : `Distance ${s.km.km} km: ${s.km.source} (read ${s.km.checkedAt}).`)
      : s.km && s.km.status === '待核'
      ? (zh ? '这一段里程待核，不计入合计。' : 'This segment’s distance is still to be verified and is not included in the total.')
      : (zh ? 'NZTA 不显示里程，里程为规划估算。' : 'NZTA shows no distance; km is a planning estimate.');
  const title = nz
    ? (zh ? `NZTA Journey Planner ${s.checkedAt} 读数：${road}，${s.nzta.time}${s.nzta.traffic ? '（' + s.nzta.traffic + '）' : ''}；取整到 15 分钟。${kmNote}`
          : `NZTA Journey Planner reading on ${s.checkedAt}: ${road}, ${s.nzta.time}${s.nzta.traffic ? ' (' + s.nzta.traffic + ')' : ''}; rounded to 15 minutes. ${kmNote}`)
    : s.status === 'osrm'
      ? (zh ? `OSRM（OpenStreetMap）2026-11-12 估算，取整到 15 分钟。${kmNote}` : `OSRM estimate on OpenStreetMap data, 2026-11-12, rounded to 15 minutes. ${kmNote}`)
    : (zh ? '规划用估算值；公共交通和渡轮以运营商时刻表为准。' : 'Planning estimate; for coaches, trains and ferries check the operator’s timetable.');
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<abbr class="p10-src" title="${esc(title)}">${label}</abbr>`;
}
globalThis.P10_ROAD_SOURCES = ROAD_SOURCES;
globalThis.P10_EDGE_SOURCES = EDGES.map(e => ({ from: e[0], to: e[1], hours: e[2], km: e[3], ...(EDGE_SOURCES[e[0] + '|' + e[1]] || EDGE_SOURCE_DEFAULT) }));

// What people ask for. `base` is where they sleep; `days` the time it needs there (0.5 fits on a travel day);
// `routes` and `places` are what they do (each has its own reasons in why.js); `pt` false where the place itself
// needs a car or a tour even if a bus reaches the town.
// Merged catalogue ids (old -> new), copied from inputs/atlas/merged-place-ids.csv by scripts/build-site.mjs.
const P10_PLACE_ALIASES={"ni-mau":"ni-tga"};
function p10AliasId(id){return Object.prototype.hasOwnProperty.call(P10_PLACE_ALIASES,id)?P10_PLACE_ALIASES[id]:id;}
const WISHES = [
  { id: 'christchurch', island: 'south', base: 'christchurch', days: 1, en: 'Christchurch', zh: '基督城', routes: ['bridle-path'], places: ['chch-gardens'] },
  { id: 'nelson', island: 'south', base: 'nelson', days: 1, en: 'Nelson', zh: '纳尔逊', routes: [], places: [] },
  { id: 'picton', island: 'south', base: 'picton', days: 1, en: 'Picton', zh: '皮克顿', routes: [], places: [] },
  { id: 'tekapo', island: 'south', base: 'tekapo', days: 0.5, evening: true, en: 'Lake Tekapo and the dark-sky reserve', zh: '特卡波与暗夜星空', routes: ['mackenzie-route'], places: ['good-shepherd', 'dark-sky'] },
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
  "glaciers": {"zh":"可走短程雨林步道看弗朗茨约瑟夫冰川谷，或环马瑟森湖看雪山倒影。","en":"Take the short rainforest walk to view the Franz Josef Glacier valley, or loop Lake Matheson for its mountain reflections.","src":[{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/westland-tai-poutini-national-park/things-to-do/tracks/franz-josef-glacierka--roimata-o-hine-hukatere-walk/","checkedAt":"2026-11-10"},{"url":"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/westland-tai-poutini-national-park/things-to-do/tracks/lake-matheson-te-ara-kairaumati-walk/","checkedAt":"2026-11-10"}]},
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
  // Stored from→to text when this leg runs that way; the reverse pair when it runs the other way.
  const road = leg.road || {};
  const forward = leg.roadFrom == null || leg.a === leg.roadFrom;
  if (lang === 'zh') return (forward ? road.zh : (road.zhRev || road.zh)) || '';
  return (forward ? road.en : (road.enRev || road.en)) || '';
}

/* Pounamu Atlas local road planner. Travel weights are internal to route planning. */
// The network and its shortest paths are built once per travel mode: the trade-off search below builds many trial
// plans, and each used to rebuild the graph and rerun Dijkstra.
const P10_NETS = {};
function p10Net(car) {
  const mode0 = car ? 'car' : 'pt';
  if (P10_NETS[mode0]) return P10_NETS[mode0];
  const graph = Object.fromEntries(Object.keys(NODES).map(id => [id, []]));
  for (const [a,b,h,km,road,pt,ptH] of EDGES) {
    // Drivers park in Bluff and take the Foveaux Express like everyone else, so Stewart Island stays reachable.
    if (!car && !pt) continue;
    const mode = pt === 'ferry' ? 'ferry' : car ? 'car' : pt;
    const time = mode === 'ferry' && (a === 'picton' || b === 'picton') ? h + 1 : car ? h : ptH ?? Math.round(h * 1.3 * 4) / 4;
    const src = EDGE_SOURCES[a + '|' + b] || EDGE_SOURCE_DEFAULT;
    graph[a].push({a,b,h:time,km,road,roadFrom:a,mode,src}); graph[b].push({a:b,b:a,h:time,km,road,roadFrom:a,mode,src});
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
  const paths = {};
  return P10_NETS[mode0] = {
    degree: id => (graph[id] || []).length,
    hours: (a,b) => a === b ? 0 : shortest(a).dist[b] ?? Infinity,
    path(a,b) { if (a === b) return []; const key=a+'>'+b; if (key in paths) return paths[key]; const {dist,prev}=shortest(a); if (dist[b] == null) return paths[key]=null; const legs=[]; for (let n=b;n!==a;n=prev[n].a) legs.unshift(prev[n]); return paths[key]=legs; }
  };
}
// Retracing the same road (out over the Haast Pass and back again, say) costs extra in the ordering, so a loop wins
// over an out-and-back when the hours are close. Dead-end spurs (Aoraki/Mount Cook, Milford, Akaroa…) have no other
// way out, so going back along them is never penalised.
const P10_RETRACE_PENALTY = 0.6;
function p10Order(net,start,end,stops) {
  const legsOf=(a,b)=>net.path(a,b)||[];
  const key=l=>l.a<l.b?l.a+'|'+l.b:l.b+'|'+l.a;
  const spur=l=>net.degree(l.a)<=1||net.degree(l.b)<=1;
  function cost(order){
    const used=new Map();let total=0,at=start;
    for(const base of [...order.map(w=>w.base),end]){for(const l of legsOf(at,base)){const k=key(l),n=used.get(k)||0;total+=l.h+(n&&!spur(l)?l.h*P10_RETRACE_PENALTY:0);used.set(k,n+1);}at=base;}
    return total;
  }
  if (stops.length <= 8) {
    // Every order is tried. Legs are numbered up front so a trial is plain array work (the fitting search builds
    // many trial plans). Two stops in the same town are taken in list order, since swapping them changes nothing.
    const n=stops.length, bases=[start,...stops.map(w=>w.base),end], ids=new Map(), legH=[], legSpur=[];
    const hop=bases.map(a=>bases.map(b=>legsOf(a,b).map(l=>{const k=key(l);let id=ids.get(k);if(id===undefined){id=legH.length;ids.set(k,id);legH.push(l.h);legSpur.push(spur(l));}return id;})));
    const used=new Int32Array(legH.length), taken=new Uint8Array(n), cur=[];
    const twin=stops.map((w,i)=>stops.findIndex((x,j)=>j<i&&x.base===w.base));
    let best=[], bestCost=Infinity;
    const add=(a,b)=>{let s=0;for(const id of hop[a][b]){s+=legH[id]+(used[id]&&!legSpur[id]?legH[id]*P10_RETRACE_PENALTY:0);used[id]++;}return s;};
    const drop=(a,b)=>{for(const id of hop[a][b])used[id]--;};
    function dfs(at,depth,soFar){
      if (soFar >= bestCost) return;
      if (depth===n) { const total=soFar+add(at,n+1); drop(at,n+1); if (total<bestCost) {bestCost=total;best=cur.map(i=>stops[i]);} return; }
      for(let i=0;i<n;i++){
        if(taken[i]||(twin[i]>=0&&!taken[twin[i]]))continue;
        taken[i]=1;cur.push(i);const s=add(at,i+1);dfs(i+1,depth+1,soFar+s);drop(at,i+1);cur.pop();taken[i]=0;
      }
    }
    dfs(0,0,0); return best;
  }
  let at=start, left=[...stops], order=[];
  while(left.length){left.sort((a,b)=>net.hours(at,a.base)-net.hours(at,b.base)); const next=left.shift(); order.push(next); at=next.base;}
  for(let changed=true;changed;){changed=false;for(let i=0;i<order.length-1;i++)for(let j=i+1;j<order.length;j++){const candidate=[...order.slice(0,i),...order.slice(i,j+1).reverse(),...order.slice(j+1)];if(cost(candidate)+1e-8<cost(order)){order=candidate;changed=true;}}}
  return order;
}
// A day has about 9.5 usable hours. Driving is capped by the chosen pace (6.5 h of buses and trains without a car);
// a half-day visit takes about 3.5 h on top of the road time, so a short drive and a visit share one day.
const P10_DAY_HOURS = 9.5, P10_HALF_DAY = 3.5, P10_LAST_DAY_DRIVE = 2.5, P10_SHORT_DRIVE = 2;
function p10Build(input, wanted) {
  const net=p10Net(input.car), reachable=wanted.filter(w=>net.hours(input.start,w.base)<Infinity && net.hours(w.base,input.end)<Infinity && (input.car || w.pt!==false));
  const inaccessible=wanted.filter(w=>!reachable.includes(w));
  if (net.hours(input.start,input.end)===Infinity) return {days:[],order:[],inaccessible,disconnected:true};
  const order=p10Order(net,input.start,input.end,reachable), stream=[]; let at=input.start;
  for(const w of order){const hop=net.path(at,w.base);hop.forEach((leg,i)=>stream.push({type:'leg',leg,hop:i?0:hop.reduce((s,l)=>s+l.h,0)}));stream.push({type:'activity',wish:w});at=w.base;}
  {const hop=net.path(at,input.end);hop.forEach((leg,i)=>stream.push({type:'leg',leg,hop:i?0:hop.reduce((s,l)=>s+l.h,0)}));}
  const cap=input.car?(Number(input.pace)||5):6.5;
  // Two packings: one that may stop for the night in a transit town halfway to the next place, one that stays where
  // the visit was and leaves next morning. The second wins unless it needs more days.
  // A third packing (noBack) also ends the day at a visit when the next leg would head back toward where the day
  // began on the way somewhere else (Auckland → Waitomo → back up to Hamilton → Matamata, ticket P2-13); a plain
  // return trip (Te Anau → Milford Sound → Te Anau) is not a detour. It is used only when it fits the days asked for.
  const pack=(stayPut,noBack)=>{
  const fresh=(kind,at)=>({kind,at,from:at,legs:[],activities:[],used:0,drive:0,act:0});
  const days=[fresh('arrive',input.start)]; let day=days[0];
  function open(){day=fresh('travel',days[days.length-1].at); days.push(day);return day;}
  let departHalf=null;
  for(const item of stream){
    if(item.type==='leg'){
      const h=item.leg.h;
      if(noBack&&item.hop&&day.act&&day.legs.length&&item.leg.b!==day.from&&net.hours(day.from,item.leg.b)+1e-9<net.hours(day.from,day.at))open();
      if(stayPut&&item.hop&&day.act&&(day.drive+item.hop>cap||day.drive+day.act+item.hop>P10_DAY_HOURS))open();
      if(day.kind==='arrive'||day.kind==='activity'||(day.drive&&day.drive+h>cap)||(day.drive+day.act&&day.drive+day.act+h>P10_DAY_HOURS))open();
      day.legs.push(item.leg);day.drive+=h;day.used=day.drive;day.at=item.leg.b;
    }else if(item.wish.days<1){
      // A half-day in the city you just landed in can share the arrival day.
      const landed=day.kind==='arrive'&&day.at===item.wish.base&&day.drive+day.act+P10_HALF_DAY<=P10_DAY_HOURS;
      if(!landed&&(day.kind==='arrive'||day.kind==='activity'||day.drive+day.act+P10_HALF_DAY>P10_DAY_HOURS))open();
      day.activities.push({wish:item.wish,part:1,total:1,before:!day.legs.length,slot:item.wish.evening?'evening':'half'});
      day.act+=P10_HALF_DAY;
      if(item.wish.evening)day.evening=true;
    }else{
      // Same-city round trip: the arrival afternoon and the departure morning are the two half-days, not an extra empty day in between.
      const round=input.start===input.end&&item.wish.base===input.start&&day.kind==='arrive'&&day.at===item.wish.base&&!day.legs.length&&!day.activities.length;
      if(round){
        day.activities.push({wish:item.wish,part:1,total:2,before:false,slot:'half'});
        day.act+=P10_HALF_DAY;
        departHalf={wish:item.wish,part:2,total:2,slot:'half'};
        continue;
      }
      const total=Math.ceil(item.wish.days);
      for(let n=1;n<=total;n++){
        // A short morning drive (Twizel to Aoraki/Mount Cook) shares the first day of a whole-day visit.
        if(n===1&&day.kind==='travel'&&!day.activities.length&&day.drive<=P10_SHORT_DRIVE&&day.at===item.wish.base&&day.legs.every(l=>l.mode!=='ferry')){day.kind='activity';day.activities.push({wish:item.wish,part:1,total,before:false});day.act=P10_DAY_HOURS;continue;}
        day={...fresh('activity',item.wish.base),activities:[{wish:item.wish,part:n,total}]};days.push(day);
      }
    }
  }
  // A short last transfer into the departure city can share the departure day (fly out in the afternoon).
  const last=days[days.length-1];
  if(days.length>1&&last.kind==='travel'&&!last.activities.length&&last.at===input.end&&last.drive<=P10_LAST_DAY_DRIVE&&last.legs.every(l=>l.mode!=='ferry')){last.kind='depart';last.lateDeparture=true;}
  else days.push(fresh('depart',input.end));
  if(departHalf){const dep=days[days.length-1];dep.activities.push(departHalf);dep.act=(dep.act||0)+P10_HALF_DAY;}
  return days;
  };
  const loose=pack(false), settled=pack(true), clean=pack(true,true);
  const chosen=settled.length<=loose.length?settled:loose;
  return {days:clean.length<=Math.max(chosen.length,Number(input.days)||0)?clean:chosen,order,inaccessible,disconnected:false};
}
// Catalogue towns: one that is the same place as a road-network town (within 15 km, or Stewart Island's Oban) plans
// as that town. A town off the network gets no invented drive time; it stays under "arrange separately".
function p10Km(a,b){const r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]);const h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*6371*Math.asin(Math.sqrt(h));}
const P10_NO_ALIAS = new Set(); // Waiheke has its own ferry node, so it no longer needs to be kept off Auckland
function p10CatalogBase(town){
  const lat=Number(town.lat),lon=Number(town.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  if(town.place_id==='si-sti')return 'oban';
  if(P10_NO_ALIAS.has(town.place_id))return null;
  let best=null;
  for(const [id,n] of Object.entries(NODES)){if(n.catalog)continue;const k=p10Km([lat,lon],n.at);if(!best||k<best.km)best={id,km:k};}
  return best&&best.km<=15?best.id:null;
}
// The picker shows a catalogue town that is the same place as a sight (Queenstown the town and Queenstown the stay,
// Te Anau for Milford Sound, Fox Glacier for the glaciers) only once, as the sight.
const P10_SAME_PLACE = { fox: 'franz-josef' };
function p10TownIsSight(town){const b=p10CatalogBase(town),base=P10_SAME_PLACE[b]||b;return Boolean(base&&WISHES.some(w=>w.base===base||w.id===base));}
function p10WishById(id) {
  const known = WISHES.find(w => w.id === id);
  if (known) return known;
  const towns = globalThis.P10_CATALOG_TOWNS;
  if (!Array.isArray(towns)) return null;
  const town = towns.find(t => t && t.place_id === id && t.type !== 'attraction');
  if (!town) return null;
  const lat = Number(town.lat), lon = Number(town.lon);
  let base = p10CatalogBase(town);
  if (!base) {
    base = id;
    if (Number.isFinite(lat) && Number.isFinite(lon) && !NODES[id]) {
      NODES[id] = { at: [lat, lon], en: town.name_en || id, zh: town.name_zh || town.name_en || id, catalog: true };
    }
  }
  return {
    id,
    island: town.island === 'north' ? 'north' : 'south',
    base,
    days: 0.5,
    en: town.name_en || id,
    zh: town.name_zh || town.name_en || id,
    routes: [],
    places: [],
    catalog: true
  };
}
// How much a place is worth keeping when the days run short (1 = ordinary). The headline sights weigh most, so a
// short loop keeps Milford Sound and Queenstown and leaves out a detour such as Kaikōura or Abel Tasman.
const P10_WISH_WEIGHT = { milford: 4, queenstown: 4, aoraki: 3, tekapo: 2.5, glaciers: 2, wanaka: 2, kaikoura: 1.5, 'abel-tasman': 1.5, dunedin: 1.2, punakaiki: 0.8, 'arthurs-pass': 0.8, 'te-anau': 0.8, oamaru: 0.7, picton: 0.6, hokitika: 0.6, haast: 0.5, rotorua: 4, hobbiton: 3, waitomo: 2.5, tongariro: 2, 'bay-of-islands': 2, coromandel: 1.8, taupo: 1.5, auckland: 1.2, wellington: 1.2 };
// What each way of travelling should float to the top of the recommended list. Used only when the planner is
// suggesting places, so a visitor's own ticks keep their previous weights.
const P10_PREF_FOCUS = {
  walk: new Set(['tongariro', 'abel-tasman', 'aoraki', 'wanaka', 'punakaiki', 'te-anau', 'auckland']),
  cycle: new Set(['queenstown', 'wellington', 'christchurch']),
  drive: new Set(['tekapo', 'haast', 'kaikoura', 'arthurs-pass', 'milford', 'catlins', 'akaroa', 'oamaru']),
  easy: new Set(['rotorua', 'hobbiton', 'waitomo', 'taupo', 'queenstown', 'tekapo', 'dunedin', 'napier', 'wellington', 'oamaru', 'picton'])
};
function p10PrefFactor(w, preference) {
  const pref = preference === 'transit' ? 'drive' : (preference || 'easy');
  const focus = P10_PREF_FOCUS[pref] || P10_PREF_FOCUS.easy;
  if (focus.has(w.id)) return pref === 'easy' ? 2.4 : 2.8;
  if (pref === 'easy' && (w.id === 'tongariro' || w.id === 'abel-tasman' || w.id === 'stewart')) return 0.35;
  if (pref === 'walk' && (w.id === 'hobbiton' || w.id === 'dunedin' || w.id === 'napier')) return 0.55;
  if (pref === 'cycle' && w.id !== 'queenstown') return 0.85;
  if (pref === 'drive' && (w.id === 'tongariro' || w.id === 'abel-tasman')) return 0.6;
  return 1;
}
// A stay one day shorter than planned (Queenstown for one day instead of two) keeps most of its worth.
const P10_SHORT_WORTH = 0.7, P10_ROAD_COST = 0.25;
function p10Island(id){const a=NODES[id]&&NODES[id].at;if(!a)return null;return a[0]>-40.4||(a[0]>-41.7&&a[1]>174.4)?'north':'south';}
function p10Worth(input,w,suggest){
  const base=P10_WISH_WEIGHT[w.id]||(w.catalog?0.8:1);
  const v=suggest?base*p10PrefFactor(w,input.preference):base;
  return !suggest&&(w.base===input.start||w.base===input.end)?v*3:v;
}
function p10Rank(input){
  const taken=new Set(input.wishes||[]);
  const pool=p10SuggestPool(input, taken);
  return pool.map(w=>({id:w.id,en:w.en,zh:w.zh,worth:+p10Worth(input,w,true).toFixed(2)})).sort((a,b)=>b.worth-a.worth||a.id.localeCompare(b.id));
}
// Choose how long to stay at each place so the trip fits the days and keeps the most worthwhile stays. Each place is
// a full stay (level 2), one day shorter (1, for stays of two days or more) or left out (0). A greedy pass trims the
// visitor's places (or, when suggesting, adds places); then swaps of up to two places in and two out are tried for as
// long as they raise the total worth and the trip still fits. The first `fixed` places in the pool always stay full.
function p10Choose(input,pool,{suggest=false,fixed=0}={}){
  const shortOf=new Map();
  const variant=(w,l)=>l===2?w:l===1?(shortOf.get(w.id)||shortOf.set(w.id,{...w,days:w.days-1,shortened:true,fullDays:w.days}).get(w.id)):null;
  const list=lv=>pool.map((w,i)=>variant(w,lv[i])).filter(Boolean);
  const memo=new Map();
  const built=lv=>{const k=lv.join('');let r=memo.get(k);if(!r){const days=p10Build(input,list(lv)).days;r={days:days.length,hours:days.reduce((t,d)=>t+d.legs.reduce((u,l)=>u+l.h,0),0)};memo.set(k,r);}return r;};
  const need=lv=>built(lv).days;
  const worth=pool.map(w=>p10Worth(input,w,suggest));
  const at=(i,l)=>l===2?worth[i]:l===1?worth[i]*P10_SHORT_WORTH:0;
  const multi=i=>pool[i].days>=2;
  const lower=(i,l)=>i<fixed?[]:l===2&&multi(i)?[1,0]:l>0?[0]:[];
  const higher=(i,l)=>l===0&&multi(i)?[1,2]:l<2?[2]:[];
  // Worth of the stays, less a little for every hour on the road, so a detour that costs no extra day (out to
  // Arthur's Pass and back on the last morning) is not taken just because it fits.
  const value=lv=>lv.reduce((t,l,i)=>t+at(i,l),0)-P10_ROAD_COST*built(lv).hours;
  function improve(lv){
    for(let round=0;round<12&&memo.size<600;round++){
      const cur=need(lv),ups=[],downs=[];
      for(let i=0;i<pool.length;i++){
        for(const l of higher(i,lv[i])){const n=[...lv];n[i]=l;ups.push({i,l,g:at(i,l)-at(i,lv[i]),d:need(n)-cur});}
        for(const l of lower(i,lv[i])){const n=[...lv];n[i]=l;downs.push({i,l,g:at(i,lv[i])-at(i,l),d:cur-need(n)});}
      }
      const upSets=[],downSets=[[]];
      ups.forEach((u,a)=>{upSets.push([u]);for(let b=a+1;b<ups.length;b++)if(ups[b].i!==u.i)upSets.push([u,ups[b]]);});
      downs.forEach((x,a)=>{downSets.push([x]);for(let b=a+1;b<downs.length;b++)if(downs[b].i!==x.i)downSets.push([x,downs[b]]);});
      const tries=[];
      for(const U of upSets)for(const D of downSets){
        if(D.some(x=>U.some(u=>u.i===x.i)))continue;
        const gain=U.reduce((t,u)=>t+u.g,0)-D.reduce((t,x)=>t+x.g,0);if(gain<=1e-9)continue;
        // Days add up only roughly (two stops on one road share the drive), so near misses are tested too.
        const est=cur+U.reduce((t,u)=>t+u.d,0)-D.reduce((t,x)=>t+x.d,0);if(est>input.days+2)continue;
        tries.push({U,D,gain,est});
      }
      tries.sort((x,y)=>y.gain-x.gain||x.est-y.est);
      let moved=false;
      const now=value(lv);
      for(const t of tries.slice(0,60)){const n=[...lv];for(const u of t.U)n[u.i]=u.l;for(const x of t.D)n[x.i]=x.l;if(need(n)<=input.days&&value(n)>now+1e-9){lv=n;moved=true;break;}}
      if(!moved)break;
    }
    return lv;
  }
  const result=lv=>({lv,list:list(lv),days:need(lv),ok:need(lv)<=input.days});
  if(suggest){
    // Two starts, each then improved: add the place worth most per extra day, or simply the place worth most,
    // until nothing more fits. A loop needs the second (Milford Sound is a long way, but worth it).
    const empty=pool.map((w,i)=>i<fixed?2:0);
    let byRate=[...empty];
    for(;;){
      const cur=need(byRate),hours=built(byRate).hours;let best=null;
      for(let i=fixed;i<pool.length;i++){if(byRate[i])continue;for(const l of higher(i,0)){const n=[...byRate];n[i]=l;const d=need(n);if(d>input.days)continue;const g=at(i,l)-P10_ROAD_COST*(built(n).hours-hours);if(g<=0)continue;const r=g/(Math.max(0,d-cur)+0.5);if(!best||r>best.r)best={n,r};}}
      if(!best)break;byRate=best.n;
    }
    let byWorth=[...empty];
    if(need(byWorth)<=input.days)for(const i of pool.map((w,i)=>i).filter(i=>i>=fixed).sort((x,y)=>worth[y]-worth[x]))for(const l of higher(i,0).reverse()){const n=[...byWorth];n[i]=l;if(need(n)<=input.days&&value(n)>value(byWorth)){byWorth=n;break;}}
    const x=improve(byRate),y=improve(byWorth);
    return result(value(y)>value(x)+1e-9?y:x);
  }
  let lv=pool.map(()=>2);
  // Trim: a change that alone closes the gap and costs least, else the one that saves most days per worth lost.
  while(need(lv)>input.days){
    const cur=need(lv),gap=cur-input.days,moves=[];
    for(let i=0;i<pool.length;i++){const l=lower(i,lv[i])[0];if(l===undefined)continue;const n=[...lv];n[i]=l;const saves=cur-need(n);if(saves>0)moves.push({n,saves,loss:at(i,lv[i])-at(i,l)});}
    let pick=null;
    if(moves.length){const enough=moves.filter(m=>m.saves>=gap);pick=enough.length?enough.sort((x,y)=>x.loss-y.loss||y.saves-x.saves)[0]:moves.sort((x,y)=>y.saves/y.loss-x.saves/x.loss||x.loss-y.loss)[0];}
    else{let j=-1;for(let i=fixed;i<pool.length;i++)if(lv[i]&&(j<0||at(i,lv[i])<at(j,lv[j])))j=i;if(j<0)break;pick={n:lv.map((l,i)=>i===j?0:l)};}
    lv=pick.n;
  }
  if(need(lv)>input.days)return result(lv);
  return result(improve(lv));
}
// Places offered when the visitor has picked none (or has days to spare): the sights on the islands the trip
// touches, both when it crosses Cook Strait. A plain city stay at the start or end is left out, since the trip spends
// a night there anyway.
function p10SuggestPool(input,taken){
  const islands=new Set([p10Island(input.start),p10Island(input.end)]),net=p10Net(input.car);
  const pool=WISHES.filter(w=>islands.has(w.island)&&!taken.has(w.id)&&!taken.has(w.base)&&(input.car||w.pt!==false)&&net.hours(input.start,w.base)<Infinity&&net.hours(w.base,input.end)<Infinity&&!((w.base===input.start||w.base===input.end)&&(P10_WISH_WEIGHT[w.id]||1)<2));
  if(input.start===input.end&&input.days<=2)return pool.filter(w=>w.base===input.start||net.hours(input.start,w.base)<=1.5);
  return pool;
}
function p10DropOptions(input, keep) {
  const pinned = new Set([input.start, input.end]);
  const base = p10Build(input, keep).days.length, need = base - input.days;
  const weight = o => P10_WISH_WEIGHT[o.wish.id] || 1;
  const all = keep.map(w => ({ wish: w, days: p10Build(input, keep.filter(x => x !== w)).days.length }))
    .map(o => ({ ...o, saves: base - o.days, pinned: pinned.has(o.wish.base) }))
    .filter(o => o.saves > 0);
  // If one place alone closes the gap, drop the least important of those; otherwise the most days saved per weight.
  const enough = o => need > 0 && o.saves >= need;
  const score = o => o.saves / weight(o);
  return all.sort((a, b) => (a.pinned - b.pinned) || (enough(b) - enough(a)) || (enough(a) ? weight(a) - weight(b) || a.saves - b.saves : score(b) - score(a)) || (a.days - b.days));
}
function p10Plan(input) {
  if (!NODES[input.start]?.hub || !NODES[input.end]?.hub || !Number.isInteger(input.days)||input.days<1||input.days>30 || !Array.isArray(input.wishes)) throw new Error('invalid_input');
  // An old shared link or saved trip may still name a merged place (Mount Maunganui -> Tauranga): use the new id.
  input={...input,wishes:[...new Set(input.wishes.map(p10AliasId))]};
  // A ticked town that is the same place as a ticked sight (Queenstown the town, Queenstown the stay) counts once.
  const all=[...new Set(input.wishes)].map(p10WishById).filter(Boolean);
  const sightBases=new Set(all.filter(w=>!w.catalog).flatMap(w=>[w.base,w.id])), townBases=new Set();
  // Two different towns can share a road node (Alexandra and Clyde). Keep both. A town that is the same
  // place as a ticked sight is still listed once, as the sight.
  const wanted=all.filter(w=>!w.catalog||(!sightBases.has(w.base)&&!(P10_SAME_PLACE[w.base]&&sightBases.has(P10_SAME_PLACE[w.base]))&&!townBases.has(w.id)&&townBases.add(w.id)));
  // Nothing picked: suggest a route that fills the days with the places most worth seeing.
  let suggested=null;
  if(!wanted.length && input.start===input.end && input.days<=2){
    const home=WISHES.find(w=>w.id===input.start||w.base===input.start);
    if(home)wanted.push(home);
  }
  if(!wanted.length){
    const pick=p10Choose(input,p10SuggestPool(input,new Set()),{suggest:true});
    if(pick.ok&&pick.list.length){wanted.push(...pick.list);suggested=pick.list.map(w=>w.id);}
  }
  const plan=p10Build(input,wanted), minimum=plan.days.length;
  let suggestion=null, options=[];
  if(minimum>input.days){
    options=p10DropOptions(input,plan.order).slice(0,3).map(o=>({wish:o.wish,days:o.days,saves:o.saves}));
    suggestion=options[0]||null;
  }
  let fits=null;
  if(minimum>input.days){
    const pick=p10Choose(input,plan.order), keep=pick.list, kept=new Set(keep.map(w=>w.id));
    fits={keep:keep.map(w=>w.id),list:keep,dropped:plan.order.filter(w=>!kept.has(w.id)),shortened:keep.filter(w=>w.shortened),days:pick.days,ok:pick.ok};
  }
  return {...plan,minimum,spare:Math.max(0,input.days-minimum),suggestion,options,fits,suggested,input};
}
// With days to spare, the places that would fill them best; the visitor's own places stay as they are.
function p10Extras(plan){
  if(!plan||plan.disconnected||plan.suggested||!plan.input||!plan.input.wishes.length||plan.minimum>=plan.input.days)return [];
  const taken=new Set([...plan.order,...plan.inaccessible].flatMap(w=>[w.id,w.base]));
  const pool=[...plan.order,...p10SuggestPool(plan.input,taken)];
  const pick=p10Choose(plan.input,pool,{suggest:true,fixed:plan.order.length});
  return pick.ok?pick.list.filter(w=>!taken.has(w.id)).map(w=>WISHES.find(x=>x.id===w.id)).filter(Boolean):[];
}
function p10Timeline(plan) {
  if (plan.disconnected || !plan.days.length) return [];
  let days=plan.days.map(d=>({...d,legs:[...d.legs],activities:[...d.activities]}));
  let spare=Math.max(0,plan.input.days-days.length);
  // With a day to spare, the last drive gets its own day again and the departure day stays free.
  const tail=days[days.length-1];
  if(spare&&tail.kind==='depart'&&tail.legs.length){days[days.length-1]={...tail,kind:'travel',lateDeparture:false};days.push({kind:'depart',at:plan.input.end,legs:[],activities:[],used:0,drive:0,act:0});spare--;}
  const weather=new Map(), free=new Map(), seen=new Set(), stays=[];
  days.slice(0,-1).forEach((day,i)=>{
    for(const a of day.activities){
      if(day.at!==a.wish.base||a.part!==a.total)continue;
      if(spare && a.wish.weather && !seen.has(a.wish.id)){(weather.get(i)||weather.set(i,[]).get(i)).push(a.wish);seen.add(a.wish.id);spare--;}
      if(a.wish.base!==plan.input.end&&!stays.some(s=>s.at===day.at))stays.push({i,at:day.at,worth:P10_WISH_WEIGHT[a.wish.id]||1});
    }
  });
  // Days left over go to the best places on the way, one extra day each, then to the departure city.
  stays.sort((x,y)=>y.worth-x.worth);
  for(const s of stays)if(spare>0){free.set(s.i,1);spare--;}
  const staged=[];
  days.slice(0,-1).forEach((day,i)=>{
    staged.push(day);
    for(const w of weather.get(i)||[])staged.push({kind:'weather',at:day.at,weatherWish:w,legs:[],activities:[],used:0});
    for(let k=0;k<(free.get(i)||0);k++)staged.push({kind:'free',at:day.at,legs:[],activities:[],used:0});
  });
  for(let i=0;i<spare;i++) staged.push({kind:'free',at:plan.input.end,legs:[],activities:[],used:0});
  staged.push(days[days.length-1]);
  return staged.map((d,i)=>({...d,n:i+1}));
}
function p10Project(at){
  if(!at) return null;
  return [392.5+(at[1]-174.76)*38.05, 189.7+(-at[0]-36.85)*50.5];
}
// When the days run short, show a complete trip that still ends in the departure city: the places that do not fit
// move to "Unscheduled" (the visitor's ticks stay as they are). Only when even the bare drive from start to end
// needs more days is the trip cut off, with a note on how far the departure city still is.
function p10Fitted(plan){
  if(!plan||!plan.fits||!plan.fits.ok||!plan.input)return null;
  const keep=plan.fits.list||plan.order.filter(w=>plan.fits.keep.includes(w.id));
  const built=p10Build(plan.input,keep);
  return {...built,input:plan.input,minimum:built.days.length};
}
// Travel-day titles: a stop on the way reads "· 途经霍比特村", a visit at the day's end "· 游览…" (walk-through H-07).
// A place already named as this day's start or overnight stop is not repeated as "via".
function p10WayTitle(d,lang){
  const zh=lang==='zh',esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const start=d.legs&&d.legs[0]?d.legs[0].a:'';
  const unique=list=>{const seen=new Set();return list.filter(a=>{const id=a.wish&&(a.wish.id||a.wish[lang]);if(!id||seen.has(id))return false;seen.add(id);return true;});};
  const names=list=>list.map(a=>esc(a.wish[lang])).join(zh?'、':', ');
  const way=unique((d.activities||[]).filter(a=>a.wish&&a.wish.base!==d.at&&a.wish.base!==start));
  const end=unique((d.activities||[]).filter(a=>a.wish&&a.wish.base===d.at));
  return (way.length?` · ${zh?'途经':'via '}${names(way)}`:'')+(end.length?` · ${zh?'游览':'explore '}${names(end)}`:'');
}
function p10Present(plan){
  const selected = plan && plan.input ? plan.input.days : 0;
  const tight = Boolean(plan && plan.input && plan.minimum > selected);
  const fitted = tight ? p10Fitted(plan) : null;
  const full = plan && !plan.disconnected ? p10Timeline(plan) : [];
  const days = fitted ? p10Timeline(fitted) : tight ? full.slice(0, selected).map((d, i) => ({ ...d, n: i + 1 })) : full;
  const scheduled = new Set();
  const visited = new Set();
  for (const d of days) {
    if (d.at) visited.add(d.at);
    for (const leg of d.legs || []) { visited.add(leg.a); visited.add(leg.b); }
    for (const a of d.activities || []) if (a.wish) scheduled.add(a.wish.id);
  }
  const unscheduled = [];
  const seenWish = new Set();
  if (fitted) {
    // Every place left out is listed, also one the road passes through without time to stop.
    for (const w of plan.fits.dropped) unscheduled.push({ id: w.id, en: w.en, zh: w.zh, base: w.base, passThrough: visited.has(w.base) });
  } else if (tight) {
    for (const d of full) for (const a of d.activities || []) {
      if (!a.wish || seenWish.has(a.wish.id)) continue;
      if (scheduled.has(a.wish.id) || visited.has(a.wish.base)) { scheduled.add(a.wish.id); continue; }
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
    fitted: Boolean(fitted),
    shortened: fitted ? plan.fits.shortened.map(w => ({ id: w.id, en: w.en, zh: w.zh, days: w.days, fullDays: w.fullDays })) : [],
    map: { points, schematic: true },
    warning: tight ? { minimum: plan.minimum, selected, suggestions: ['drop-or-swap', 'add-days', 'switch-template'] } : null,
  };
}
function p10Removable(plan, present) {
  const end = plan && plan.input && plan.input.end;
  return (present && present.unscheduled || []).filter(w => w && w.id !== end && w.base !== end);
}
// "Drop X (saves n days)" buttons: the cheapest swaps first, never the departure city itself.
function p10DropChoices(plan) {
  const end = plan && plan.input && plan.input.end;
  return (plan && plan.options || []).filter(o => o.wish.base !== end).map(o => ({ id: o.wish.id, en: o.wish.en, zh: o.wish.zh, saves: o.saves, days: o.days }));
}
function p10ShortfallNote(plan, present, lang) {
  const days = present && present.days || [];
  const last = days[days.length - 1];
  const end = plan && plan.input && plan.input.end;
  if (!last || !end || last.at === end || !(plan.minimum > plan.input.days)) return '';
  const here = NODES[last.at], goal = NODES[end];
  if (!here || !goal) return '';
  const zh = lang !== 'en';
  const net = p10Net(plan.input.car !== false);
  const legs = net.path(last.at, end);
  let extra = '';
  if (legs && legs.length) {
    const hours = legs.reduce((sum, leg) => sum + leg.h, 0);
    const sum = p10KmSum(legs);
    const unknown = sum.unknown
      ? (zh ? `，另有 ${sum.unknown} 段里程待核，未计入` : `; ${sum.unknown} segment${sum.unknown > 1 ? 's' : ''} with no checked distance, not included in the total`)
      : '';
    extra = zh
      ? `（估算约 ${p10Duration(hours, 'zh')}${sum.km ? '，' + sum.km + ' km' : ''}${unknown}）`
      : ` (estimate, about ${p10Duration(hours, 'en')}${sum.km ? ', ' + sum.km + ' km' : ''}${unknown})`;
  }
  return zh
    ? `行程结束在${here.zh}，还没到${goal.zh}${extra}。`
    : `The trip ends in ${here.en} and has not reached ${goal.en}${extra}.`;
}
function p10StillTight(plan, present) {
  if (!(plan && plan.input && plan.minimum > plan.input.days)) return false;
  if (present && (present.unscheduled || []).length) return true;
  return Boolean(p10ShortfallNote(plan, present, 'zh'));
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
const P10_WISH_REGION={christchurch:'christchurch-canterbury',nelson:'nelson-tasman',picton:'marlborough',tekapo:'christchurch-canterbury',aoraki:'christchurch-canterbury',wanaka:'wanaka',queenstown:'queenstown',milford:'fiordland','te-anau':'fiordland',glaciers:'west-coast',haast:'west-coast',hokitika:'west-coast',punakaiki:'west-coast','arthurs-pass':'christchurch-canterbury',kaikoura:'christchurch-canterbury','abel-tasman':'nelson-tasman',akaroa:'christchurch-canterbury',dunedin:'dunedin',oamaru:'dunedin',catlins:'clutha',stewart:'southland',auckland:'auckland','bay-of-islands':'northland-bay-of-islands',coromandel:'coromandel',hobbiton:'hamilton-waikato',waitomo:'hamilton-waikato',rotorua:'rotorua',taupo:'taupo',tongariro:'ruapehu',napier:'hawkes-bay',wellington:'wellington',taranaki:'taranaki'};

function p10RegionEntries(regionId, island) {
  const onIsland = value => !island || island === 'all' || value === island;
  const wishes = WISHES.filter(w => onIsland(w.island) && P10_WISH_REGION[w.id] === regionId);
  const towns = (Array.isArray(globalThis.P10_CATALOG_TOWNS) ? globalThis.P10_CATALOG_TOWNS : []).filter(t => t && t.type !== 'attraction' && t.region_id === regionId && onIsland(t.island) && !p10TownIsSight(t));
  return { wishes, towns };
}
function p10LegKm(leg) {
  const n = Number(leg && leg.km);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function p10KmSum(legs) {
  let km = 0, unknown = 0;
  for (const leg of legs || []) {
    const n = p10LegKm(leg);
    if (n == null) unknown += 1;
    else km += n;
  }
  return { km, unknown };
}

function p10RouteDays(route){
  let fn = globalThis.pounamuRouteDays;
  if (typeof fn !== 'function' && typeof require === 'function') {
    try { fn = require('./route-days.js').routeDays; globalThis.pounamuRouteDays = fn; } catch (e) { fn = null; }
  }
  return typeof fn === 'function' ? fn(route) : [];
}
if (typeof window !== 'undefined') window.p10RouteDays = p10RouteDays;
function p10PlanFromRoute(route){
  if(!route||!Array.isArray(route.timeline))return null;
  const days=p10RouteDays(route);
  const paddle=route.mode==='paddle';
  const hubs=route.id==='whanganui-journey'?{start:'taumarunui',end:'pipiriki'}:route.id==='milford-track'?{start:'te-anau',end:'milford'}:route.mode==='transit'?{start:'christchurch',end:'greymouth'}:{start:'christchurch',end:'queenstown'};
  const planDays=route.id==='milford-track'?4:(Number(route.planDays)||days.length||1);
  const note=paddle?[{titleEn:'Land transfer is separate from the paddle',titleZh:'陆路接驳不计入划行',textEn:'Get yourself to the put-in and away from the take-out. Those drives are not this river trip.',textZh:'自己到下水点，并离开起水点。那段公路不是这次河上的行程。'}]:[];
  return {routeImport:{id:route.id,mode:route.mode,name:route.name,zh:route.zh||route.name,planDays,ends:route.ends||[],days:days.slice(0, planDays>days.length?days.length:days.length),transfers:note},disconnected:false,days:[],order:[],inaccessible:[],minimum:planDays,input:{start:hubs.start,end:hubs.end,days:planDays,pace:5,preference:paddle?'easy':'walk',car:route.mode==='drive',wishes:[],route:route.id,month:0,stay:''}};
}
if (typeof module !== 'undefined' && module.exports) module.exports={p10RoadNotes,P10_ROAD_NOTES,P10_WINTER_EDGES,p10AliasId,P10_PLACE_ALIASES,p10Plan,p10Extras,p10CatalogBase,p10TownIsSight,p10Choose,p10Island,P10_WISH_WEIGHT,p10Rank,p10Timeline,p10Present,p10Fitted,p10DropChoices,p10Build,p10Removable,p10ShortfallNote,p10StillTight,p10AlongWay,p10Duration,p10DailyTime,p10BreakStops,p10Net,p10Suggestions,p10LegDescription,p10JevIsland,p10JevRouteName,P10_WISH_TIPS,P10_WISH_GUIDES,NODES,WISHES,p10WayTitle,p10RegionEntries,p10LegKm,p10KmSum,P10_WISH_REGION,p10PlanFromRoute,p10SuggestPool,p10RouteDays};
globalThis.P10_NODES = NODES;

  if (typeof window !== 'undefined') {
  let p10Result=null, p10Recommendation=null, p10View=null;
  const p10Selected=new Set();let p10Restored=false;
  window.p10Plan = p10Plan;
  window.p10Present = p10Present;
  window.p10Timeline = p10Timeline;
  window.p10RegionEntries = p10RegionEntries;
  window.P10_WISHES = WISHES;
  const p10$=selector=>document.querySelector(selector);
  const p10Text=()=>document.documentElement.lang.startsWith('zh') ? {
    start:'从哪里出发',end:'从哪里离开',days:'旅行天数（1–30）',month:'出行月份（选 6–10 月会提示冬季山路）',monthUnknown:'还没定',stay:'住宿档位（可选）',stayNone:'不显示',stayBudget:'省钱',stayMid:'中档',stayHigh:'高端',pace:'每天在路上的节奏',pace35:'慢一点，最多 3.5 小时',pace5:'普通，最多 5 小时',pace65:'赶一点，最多 6.5 小时',places:'想去哪些地方？（不选也会按天数推荐）',island:'这次去哪一座岛？',region:'地区',choose:'选择多个目的地',transport:'城市之间怎么走',car:'自驾',public:'巴士和渡轮',preference:'想怎么玩（会改变推荐顺序）',prefEasy:'轻松观光，不排长步道',prefWalk:'徒步',prefCycle:'骑行',prefDrive:'风景公路与火车',method:'是否使用 Jev 推荐',local:'本地规划',jev:'Jev 辅助推荐',submit:'生成这一天一天的行程',step1:'几天、什么季节',step2:'去哪、怎么走',step3:'看行程',next:'下一步',back:'上一步',more:'更多选项（城市、地点、住宿、玩法）',area:'大致去哪',areaSouth:'南岛：基督城出发，皇后镇离开',areaLoop:'南岛环线：从基督城回到基督城',areaNorth:'北岛：奥克兰出发，惠灵顿离开',areaNorthLoop:'北岛环线：从奥克兰回到奥克兰',areaBoth:'两岛都去：奥克兰出发，皇后镇离开',rankLive:'换一种玩法，下面的推荐顺序会跟着变',editor:'把这几日放进编辑器细调',
    consent:'只有勾选同意，才会把所选岛屿、天数和活动方式发送给 TypeSafe，服务方也会收到请求 IP；地点和起终点不会发送。',statusConsent:'请先同意，再使用 Jev 推荐。',loading:'正在请求 Jev 推荐…',error:'Jev 推荐暂不可用，下面仍显示本地规划。',reco:'Jev 推荐',
    disclaimer:'出发前请查看 NZTA 路况和各线路链接的官方信息。',min:'至少需要',have:'你选择了',drop:'可增加天数或移除',unreachable:'以下地点目前无法按所选交通方式衔接，需另行安排',disconnected:'起点与终点之间缺少可用的交通连接，请改选交通方式或另行安排。',unknownNight:'',day:'第',dayEnd:'天',arrive:'抵达',depart:'离开',night:'住',check:'',activity:'安排时间游览',localTransport:'景点与步道起点的当地接驳不包含在行程中。',ferry:'渡轮',train:'火车',coach:'大巴',shuttle:'接驳车',road:'自驾',hour:'小时',dropNo:'请减少目的地或增加天数。',sources:'路况与交通来源'
  } : {
    start:'Start city',end:'Departure city',days:'Days (1–30)',month:'Travel month (June–October adds winter road notes)',monthUnknown:'Not sure yet',stay:'Stay budget (optional)',stayNone:'Not shown',stayBudget:'Budget',stayMid:'Mid-range',stayHigh:'High-end',pace:'Time on the road each day',pace35:'Slow, up to 3.5 hours',pace5:'Steady, up to 5 hours',pace65:'Longer, up to 6.5 hours',places:'Anywhere in particular? (Leave this blank and we suggest a route.)',island:'Which island this time?',region:'Region',choose:'Choose multiple destinations',transport:'Between towns',car:'Rental car',public:'Bus and ferry',preference:'How do you like to travel? (This changes the recommended order.)',prefEasy:'Easy sightseeing, no long hikes',prefWalk:'Walking',prefCycle:'Cycling',prefDrive:'Scenic roads and trains',method:'Jev suggestions',local:'Local plan',jev:'Jev-assisted suggestion',submit:'Build the day-by-day plan',step1:'How long, and when',step2:'Where, and how you travel',step3:'Your plan',next:'Next',back:'Back',more:'More options (cities, places, stays, style)',area:'Roughly where',areaSouth:'South Island: Christchurch to Queenstown',areaLoop:'South Island loop: back to Christchurch',areaNorth:'North Island: Auckland to Wellington',areaNorthLoop:'North Island loop: back to Auckland',areaBoth:'Both islands: Auckland to Queenstown',rankLive:'Change the style and this recommended order changes',editor:'Adjust these days in the editor',
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
  let p10CoastD='';
  function p10LoadCoast(){if(p10CoastD||p10LoadCoast.busy)return;p10LoadCoast.busy=true;fetch('data/nz-coast.json').then(r=>r.ok?r.json():null).then(data=>{if(data&&data.d){p10CoastD=data.d;document.querySelectorAll('path.p10-coast').forEach(p=>{p.setAttribute('d',p10CoastD);p.dataset.coast='natural-earth';});}}).catch(()=>{});}
  const P10_DAY_COLORS=['#b44e2d','#225a4b','#9b5c1d','#4d5c8a','#8c3862','#446e28','#8b501b','#315d71','#944c40','#605292','#46695e','#a13e2e'];
  const p10MapPoint=id=>{const at=NODES[id]?.at;if(!at)return null;return [392.5+(at[1]-174.76)*38.05,189.7+(-at[0]-36.85)*50.5]};
  const P10_NORTH_HUBS=new Set(['auckland','hamilton','rotorua','taupo','napier','new-plymouth','wellington']);
  // Pictures for a visit day come from the licensed route photos already on the site (credit shown under each one).
  const P10_WISH_PHOTO={christchurch:'bridle',nelson:'greattaste',picton:'pictonnelson',aoraki:'hooker',queenstown:'queenstowncycle',milford:'milford','te-anau':'teanaubus',glaciers:'matheson',haast:'haast','arthurs-pass':'arthurs',kaikoura:'coastroad','abel-tasman':'abel-tasman',catlins:'catlins',auckland:'ni-rangitoto','bay-of-islands':'ni-aucklandpaihia',coromandel:'ni-coromandel',rotorua:'ni-thermalexplorer',taupo:'ni-huka',tongariro:'tongariro-crossing',napier:'ni-wellingtonnapier'};
  function p10WishPhoto(id){
    const routeId=P10_WISH_PHOTO[id];
    const lib=typeof routePhotos!=='undefined'?routePhotos:null;
    const p=routeId&&lib?lib[routeId]:null;
    return p&&p.src&&!p.placeholder?p:null;
  }
  function p10TripMap(days, startId, endId, extraStops){
    const zh=p10Lang()==='zh', dots=new Map();
    const lines=days.map(d=>{const ids=d.legs.length?[d.legs[0].a,...d.legs.map(l=>l.b)]:[d.at],coords=ids.map(p10MapPoint).filter(Boolean),color=P10_DAY_COLORS[(d.n-1)%P10_DAY_COLORS.length];
      ids.forEach(id=>{if(!dots.has(id)&&p10MapPoint(id))dots.set(id,p10MapPoint(id))});
      if(!coords.length)return '';const points=coords.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ');
      const attrs=`data-p10-map-line="${d.n}" data-points="${points}" data-places="${p10Esc(ids.map(p10Name).join(' → '))}"`;
      return coords.length>1?`<polyline ${attrs} points="${points}" stroke="${color}"/>`:`<circle ${attrs} cx="${coords[0][0]}" cy="${coords[0][1]}" r="3" fill="${color}"/>`;
    }).join('');
    const placeAt=new Map();
    for(const d of days)for(const a of d.activities||[])if(a.wish){const node=a.wish.base||d.at;if(!placeAt.has(node))placeAt.set(node,[]);if(!placeAt.get(node).some(w=>w.id===a.wish.id))placeAt.get(node).push(a.wish);}
    const marker=(id,p,cls,r,label)=>`<circle class="${cls}" data-p10-stop="${p10Esc(id)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}"><title>${p10Esc(label||p10Name(id))}</title></circle>`;
    const names=[...dots].map(([id,p])=>marker(id,p,'',2.5)+(placeAt.get(id)||[]).filter(w=>w.id!==id).map(w=>marker(w.id,p,'p10-place-stop',2.5,zh?w.zh:w.en)).join('')).join('')+(p10View&&p10View.unscheduled||[]).map(w=>{const p=p10MapPoint(w.base);if(!p||dots.has(w.base))return '';return `<circle class="p10-unscheduled-dot" data-p10-stop="${p10Esc(w.id||w.base)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6"><title>${p10Esc((zh?w.zh:w.en)||p10Name(w.base))}</title></circle>`;}).join('')+(extraStops||[]).map(w=>{const id=w&&(w.base||w.id);const p=p10MapPoint(id);if(!p||dots.has(id))return '';return `<circle class="p10-catalog-stop" data-p10-stop="${p10Esc(w.id||id)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"><title>${p10Esc((zh?w.zh:w.en)||p10Name(id))}</title></circle>`;}).join('');
    // Town names: every overnight stop, plus the places left out (in rust, marked as unscheduled).
    const stays=[];for(const d of days)if(d.at&&!stays.includes(d.at))stays.push(d.at);
    const label=(id,text,cls)=>{const p=p10MapPoint(id);return p?`<text class="p10-map-label${cls?' '+cls:''}" data-px="${p[0].toFixed(1)}" data-py="${p[1].toFixed(1)}" x="${(p[0]+7).toFixed(1)}" y="${(p[1]+4).toFixed(1)}">${p10Esc(text)}</text>`:'';};
    const labels=stays.map(id=>label(id,p10Name(id))).join('')+(p10View&&p10View.unscheduled||[]).filter(w=>!dots.has(w.base)).map(w=>label(w.base,(zh?w.zh:w.en)+(zh?'（未安排）':' (unscheduled)'),'p10-map-label-off')).join('');
    const tag=(id,text)=>{const p=p10MapPoint(id);return p?`<text class="p10-map-tag" x="${p[0].toFixed(1)}" y="${(p[1]-9).toFixed(1)}" text-anchor="middle">${text}</text>`:'';};
    const tags=startId===endId?tag(startId,zh?'起 / 终':'Start / end'):tag(startId,zh?'起':'Start')+tag(endId,zh?'终':'End');
    const selectors=days.map(d=>`<button type="button" data-p10-map-day="${d.n}" aria-pressed="false" style="--day-color:${P10_DAY_COLORS[(d.n-1)%P10_DAY_COLORS.length]}">${zh?'第 '+d.n+' 天':'Day '+d.n}</button>`).join('');
    return `<section class="p10-map-panel" id="p10-trip-map" aria-label="${zh?'行程地图':'Itinerary map'}"><div class="p10-map-heading"><div><p>${zh?'逐日路线':'DAY BY DAY'}</p><h2>${zh?'行程地图':'Your trip map'}</h2></div><p>${zh?'选择某一天，查看当天经过的地点。':'Choose a day to focus on its stops.'}</p></div><div class="p10-map-day-list" aria-label="${zh?'选择日期':'Choose a day'}"><button type="button" data-p10-map-day="all" aria-pressed="true">${zh?'全部':'All days'}</button>${selectors}</div><p class="p10-map-selection" role="status" aria-live="polite">${zh?'显示全部行程地点':'Showing all itinerary stops'}</p><svg class="p10-trip-svg" viewBox="0 0 680 820" role="img" aria-label="${zh?'新西兰海岸与行程地点':'New Zealand coastline and itinerary stops'}"><rect x="-2000" y="-2000" width="5000" height="5000" fill="#e2ece8"/><path class="p10-coast" data-coast="${p10CoastD?'natural-earth':'schematic'}" d="${p10CoastD||P10_COAST}"/><g class="p10-map-lines">${lines}</g><g class="p10-map-dots">${names}</g><g class="p10-map-labels">${labels}${tags}</g></svg><p class="p10-map-note">${zh?'地点之间的连线为示意，不能用于导航。':'Connections between places are schematic, not for navigation.'} <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a>${zh?'（公有领域）':' (public domain)'}</p></section>`;
  }
  function p10FocusDay(day){
    const panel=p10$('#p10-trip-map'),svg=panel?.querySelector('.p10-trip-svg');if(!svg)return;
    panel.querySelectorAll('[data-p10-map-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p10MapDay===day)));
    const lines=[...panel.querySelectorAll('[data-p10-map-line]')];lines.forEach(l=>l.classList.toggle('p10-muted-line',day!=='all'&&l.dataset.p10MapLine!==day));
    const status=panel.querySelector('.p10-map-selection');
    const current=day==='all'?null:lines.find(l=>l.dataset.p10MapLine===day);if(day!=='all'&&!current)return;
    status.textContent=day==='all'?(p10Lang()==='zh'?'显示全部行程地点':'Showing all itinerary stops'):(p10Lang()==='zh'?`第 ${day} 天：`:`Day ${day}: `)+current.dataset.places;
    const extra=day==='all'?[...panel.querySelectorAll('.p10-unscheduled-dot')].map(c=>[Number(c.getAttribute('cx')),Number(c.getAttribute('cy'))]):[];
    const points=(current?[current]:lines).flatMap(line=>line.dataset.points.split(' ').map(p=>p.split(',').map(Number))).concat(extra);if(!points.length)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const cx=(Math.min(...xs)+Math.max(...xs))/2+20,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const h=Math.min(820,Math.max(260,(Math.max(...ys)-Math.min(...ys))*1.6+90,((Math.max(...xs)-Math.min(...xs))*1.6+160)*820/680)),w=h*680/820;
    svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);
    // Size the names for the map as it is drawn on screen: about 12px on a wide map, 10.5px on a phone.
    const box=svg.getBoundingClientRect(),scale=box.width&&box.height?Math.min(box.width/w,box.height/h):0,narrow=box.width>0&&box.width<420;
    svg.classList.toggle('p10-map-narrow',narrow);
    const fitLabels=()=>{const b=svg.getBoundingClientRect();const sc=b.width&&b.height?Math.min(b.width/w,b.height/h):0;if(!sc)return;const layout=1/sc;svg.style.setProperty('--k',layout.toFixed(3));svg.querySelectorAll('.p10-map-label,.p10-map-tag').forEach(t=>t.style.setProperty('font-size',(12/sc).toFixed(2)+'px','important'));p10PlaceLabels(svg,Math.max(layout,0.8));};
    fitLabels();requestAnimationFrame(fitLabels);setTimeout(fitLabels,80);
    let nameList=panel.querySelector('.p10-map-name-list');
    if(!nameList){nameList=document.createElement('ul');nameList.className='p10-map-name-list';svg.after(nameList);}
    nameList.innerHTML=[...svg.querySelectorAll('.p10-map-label,.p10-map-tag')].map(t=>`<li>${t.textContent}</li>`).join('');
  }
  // Keep town names from sitting on top of each other (Picton and Wellington, Queenstown and Te Anau):
  // try right of the dot, then left, then just below or above.
  function p10PlaceLabels(svg,k){
    const boxes=[...svg.querySelectorAll('.p10-map-tag')].map(t=>{try{return t.getBBox();}catch{return null;}}).filter(b=>b&&b.width);
    const vb=svg.viewBox.baseVal;
    const inside=b=>b&&b.width&&(!vb.width||(b.x>=vb.x-1&&b.y>=vb.y-4&&b.x+b.width<=vb.x+vb.width-4&&b.y+b.height<=vb.y+vb.height+12));
    const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
    for(const t of svg.querySelectorAll('.p10-map-label')){
      const px=Number(t.dataset.px),py=Number(t.dataset.py);if(!Number.isFinite(px))continue;
      const gap=7*Math.max(k,0.6),line=13*k;
      const tries=[[px-gap,py+4*k,'end'],[px+gap,py+4*k,'start'],[px-gap,py+4*k+line,'end'],[px-gap,py+4*k-line,'end'],[px+gap,py+4*k+line,'start'],[px,py+4*k+line,'middle']];
      const put=([x,y,anchor])=>{t.setAttribute('x',x.toFixed(1));t.setAttribute('y',y.toFixed(1));t.setAttribute('text-anchor',anchor);try{return t.getBBox();}catch{return null;}};
      let box=null,free=false;
      for(const spot of tries){box=put(spot);if(box&&inside(box)&&!boxes.some(b=>hit(box,b))){free=true;break;}}
      if(!free)box=put([px-gap,py+4*k,'end']);
      if(box&&box.width)boxes.push(box);
    }
  }
  const p10Reduced=()=>document.documentElement.classList.contains('motion-off')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const P10_ORDER_KEY='p10-road-plan-order';
  function p10SaveOrder(){
    if(!p10View||!p10Result)return;
    try{localStorage.setItem(P10_ORDER_KEY,JSON.stringify({input:JSON.stringify(p10Result.input),order:p10View.days.map(d=>d.orig)}));}catch{}
  }
  function p10RestoreOrder(days,input){
    try{
      const saved=JSON.parse(localStorage.getItem(P10_ORDER_KEY)||'null');
      if(!saved||saved.input!==JSON.stringify(input)||!Array.isArray(saved.order)||saved.order.length!==days.length)return days;
      const byOrig=new Map(days.map(d=>[d.orig,d]));
      if(!saved.order.every(n=>byOrig.has(n))||new Set(saved.order).size!==days.length)return days;
      return saved.order.map((n,i)=>({...byOrig.get(n),n:i+1}));
    }catch{return days;}
  }
  function p10ShareUrl(input){
    const u=new URL(location.href);u.search='';u.hash='';const q=u.searchParams;
    q.set('lang',p10Lang());q.set('from',input.start);q.set('to',input.end);q.set('days',String(input.days));q.set('car',input.car?'1':'0');
    if(input.car)q.set('pace',String(input.pace));q.set('pref',input.preference);if(input.wishes.length)q.set('w',input.wishes.join(','));if(input.month)q.set('m',String(input.month));if(input.stay)q.set('stay',input.stay);
    if(input.route)q.set('route',input.route);
    if(globalThis.pounamuBudget&&p10BudgetState)q.set('budget',globalThis.pounamuBudget.encodeState(p10BudgetState));
    return u.toString();
  }
  let p10BudgetState=null;
  const P10_SIGHTS={'chch-gardens':['Christchurch Botanic Gardens','基督城植物园'],'bridle-path':['Bridle Path','Bridle Path 步道'],'sky-tower':['Sky Tower','天空塔'],rangitoto:['Rangitoto Summit Track','朗伊托托登顶步道'],'devonport-ferry':['Devonport ferry','德文波特渡轮'],'skyline-qt':['Skyline Queenstown','天际缆车与斜坡滑车'],'shotover-jet':['Shotover Jet','沙特欧瓦喷射快艇'],'kawarau-bungy':['Kawarau Bridge Bungy','卡瓦劳大桥蹦极'],arrowtown:['Arrowtown','箭镇'],glenorchy:['Glenorchy','格林诺奇'],'queenstown-trail':['Queenstown trail','皇后镇河谷骑行'],'te-papa':['Te Papa Tongarewa','蒂帕帕国家博物馆'],zealandia:['Zealandia','西兰蒂亚生态保护区'],'cable-car':['Wellington Cable Car','惠灵顿缆车'],'escarpment-track':['Escarpment Track','海崖步道'],'good-shepherd':['Church of the Good Shepherd','好牧羊人教堂'],'dark-sky':['Aoraki Mackenzie Dark Sky Reserve','星空观测（暗夜保护区）']};
  function p10SightNames(wish,zh){return [...(wish.places||[]),...(wish.routes||[])].map(id=>P10_SIGHTS[id]?P10_SIGHTS[id][zh?1:0]:'').filter(Boolean);}
  function p10Geo(id){const n=NODES[id];return n?{name:n.en,town:n.en,lat:n.at[0],lng:n.at[1]}:{name:id};}
  function p10DateBlock(n,zh){const start=p10BudgetState&&p10BudgetState.startDate;const label='DAY '+String(n).padStart(2,'0');if(!start)return `<div class="gday-date" data-p10-focus="${n}" role="button" tabindex="0" aria-label="${zh?'在地图上看第 '+n+' 天':'Show day '+n+' on the map'}"><b>${label}</b><span>${zh?'日期待核':'Date to verify'}</span></div>`;const d=new Date(start+'T12:00:00');d.setDate(d.getDate()+n-1);const loc=zh?'zh-CN':'en-NZ';return `<div class="gday-date" data-p10-focus="${n}" role="button" tabindex="0" aria-label="${zh?'在地图上看第 '+n+' 天':'Show day '+n+' on the map'}"><b>${label}</b><span>${p10Esc(d.toLocaleDateString(loc,{month:'short',day:'numeric'}))}</span><span>${p10Esc(d.toLocaleDateString(loc,{weekday:'short'}))}</span></div>`;}
  function p10DayMapLinks(d,input,zh){const api=globalThis.pounamuMapsUrl;if(!api)return '';const jump=`<button type="button" class="gday-jumpmap" data-p10-focus="${d.n}">${zh?'在地图中查看 ↑':'Show on the map ↑'}</button>`;if((d.activities||[]).some(a=>a.wish&&a.wish.id==='milford')){const href=api.dirUrl({origin:api.pointLabel(p10Geo('te-anau')),destination:api.pointLabel(p10Geo('milford')),mode:'driving'});return `<p class="gday-actions"><a class="v4-gmaps v4-gmaps-dir" href="${p10Esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${zh?'Google Maps 当天路线：蒂阿瑙 → 米尔福德':'Google Maps for this day: Te Anau → Milford'} ↗</a> ${jump}</p>`;}if(!d.legs.length){const node=NODES[d.at];const name=(d.activities[0]&&p10SightNames(d.activities[0].wish,zh)[0])||p10Name(d.at);const href=api.searchUrl(node?{lat:node.at[0],lng:node.at[1],name:name}:{name:name,town:p10Name(d.at)});return `<p class="gday-actions"><a class="v4-gmaps" href="${p10Esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${zh?'在谷歌地图打开':'Open in Google Maps'}</a> ${jump}</p>`;}const ids=[d.legs[0].a,...d.legs.map(l=>l.b)].filter((id,i,a)=>i===0||id!==a[i-1]);const ferryDay=d.legs.some(l=>l.mode==='ferry');const mode=ferryDay?'transit':input.car?(d.legs.every(l=>l.mode==='walk')?'walking':'driving'):'transit';const urls=api.routeSegments(ids.map(p10Geo),mode);const links=urls.map((href,i)=>`<a class="v4-gmaps v4-gmaps-dir" href="${p10Esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${zh?'Google Maps 当天路线':'Google Maps for this day'}${urls.length>1?' '+(i+1)+'/'+urls.length:''} ↗</a>`).join(' ');return `<p class="gday-actions">${links} ${jump}</p>`;}
  function p10WholeRouteLinks(days,input,zh){const api=globalThis.pounamuMapsUrl;if(!api)return '';const ids=[];for(const d of days){const seq=d.legs.length?[d.legs[0].a,...d.legs.map(l=>l.b)]:[d.at];for(const id of seq)if(ids[ids.length-1]!==id)ids.push(id);}if(ids.length<2)return '';const mode=input.car?'driving':'transit';const urls=api.routeSegments(ids.map(p10Geo),mode);return urls.map((href,i)=>`<a class="v4-gmaps v4-gmaps-dir" href="${p10Esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${zh?'整条路线':'Whole route'}${urls.length>1?' '+(i+1)+'/'+urls.length:''} ↗</a>`).join(' ');}
  function p10OfficialLinks(d,zh){const links=[{href:'https://www.journeys.nzta.govt.nz/',label:zh?'NZTA Journey Planner（路况）':'NZTA Journey Planner',date:'2026-11-12'}];const blob=(d.activities||[]).map(a=>a.wish&&a.wish.id).join(' ')+' '+(d.legs||[]).map(l=>l.a+' '+l.b).join(' ');if(/milford|te-anau/.test(blob))links.push({href:'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf',label:zh?'DOC 米尔福德公路手册':'DOC Milford Road brochure',date:'2026-11-10'});if(/milford/.test(blob))links.push({href:'https://www.doc.govt.nz/milfordtrack',label:zh?'DOC 米尔福德步道（本线路列出的官网）':'DOC Milford Track (listed on this guide)',date:''});return `<p class="gday-official">${links.map(l=>`<a href="${p10Esc(l.href)}" target="_blank" rel="noopener" data-keep-link="1">${p10Esc(l.label)}</a>${l.date?` <span class="v4-note">${zh?'查阅':'read'} ${p10Esc(l.date)}</span>`:''}`).join(' · ')}</p>`;}
  function p10BudgetPanel(zh){const a=p10BudgetState;const field=(key,label,step)=>`<label>${p10Esc(label)} <input data-budget="${key}" type="number" min="0" step="${step||'1'}" value="${a[key]==null?'':a[key]}"></label>`;return `<section class="p10-budget" id="p10-budget"><h2>${zh?'预算':'Trip budget'}</h2><p class="v4-note">${zh?'填入油价、餐费后显示总价。没有来源的格子是待核或 —。':'Type a fuel price and a meal cost to see a total. A cell with no source stays to verify, or —.'}</p><div class="p10-budget-controls"><label>${zh?'档位':'Tier'} <select data-budget="tier"><option value="budget"${a.tier==='budget'?' selected':''}>${zh?'经济':'Budget'}</option><option value="mid"${a.tier==='mid'?' selected':''}>${zh?'舒适':'Comfort'}</option><option value="high"${a.tier==='high'?' selected':''}>${zh?'高端':'High-end'}</option></select></label><label>${zh?'人数':'People'} <input data-budget="people" type="number" min="1" max="12" step="1" value="${a.people}"></label><label>${zh?'出发日期（可选）':'Start date (optional)'} <input data-budget="startDate" type="date" value="${p10Esc(a.startDate||'')}"></label><label><input data-budget="showCny" type="checkbox"${a.showCny?' checked':''}> ${zh?'显示人民币':'Show CNY'}</label>${field('nzdCny',zh?'1 NZD 兑人民币（自填）':'NZD to CNY (you type it)','0.01')}<label>${zh?'汇率填写日':'Rate typed on'} <input data-budget="nzdCnyDate" type="date" value="${p10Esc(a.nzdCnyDate||'')}"></label></div><div id="p10-budget-summary"></div><details class="p10-assumptions" open><summary>${zh?'估算假设（可改）':'Assumptions (editable)'}</summary><div class="p10-budget-controls">${field('docLow',zh?'DOC 标准营地成人每晚下限 NZD':'DOC standard campsite, adult low NZD')}${field('docHigh',zh?'DOC 标准营地成人每晚上限 NZD':'DOC standard campsite, adult high NZD')}${field('midNightly',zh?'舒适档每晚（整间，待核）':'Comfort nightly, per room, to verify')}${field('highNightly',zh?'高端每晚（整间，待核）':'High-end nightly, per room, to verify')}${field('fuelNzdPerL',zh?'油价 NZD/升（待核，见 MBIE）':'Fuel NZD/L (to verify, see MBIE)','0.01')}${field('litresPer100',zh?'油耗 L/100km（待核）':'Fuel use L/100km (to verify)','0.1')}${field('mealNzd',zh?'每餐 NZD（待核）':'Meal NZD (to verify)')}${field('mealsPerDay',zh?'每天几餐':'Meals a day')}${field('ferryVehicleNzd',zh?'渡轮车辆票（待核）':'Ferry vehicle fare (to verify)')}${field('parkingNzd',zh?'停车每晚（待核）':'Parking a night (to verify)')}${field('activityNzd',zh?'每项付费活动（待核）':'Each paid activity (to verify)')}</div><ul class="p10-budget-sources"></ul></details><p><a href="#p10-days">${zh?'回到每日行程 ↑':'Back to the days ↑'}</a></p></section><div class="gday-sticky" id="p10-budget-sticky"></div>`;}
  function p10ReadBudgetForm(){const root=p10$('#p10-budget');if(!root||!globalThis.pounamuBudget)return;const next={...p10BudgetState};root.querySelectorAll('[data-budget]').forEach(el=>{const key=el.dataset.budget;if(el.type==='checkbox')next[key]=el.checked;else next[key]=el.value;});p10BudgetState=globalThis.pounamuBudget.normalise(next);}
  function p10PaintBudget(){const api=globalThis.pounamuBudget;if(!api||!p10View)return;const zh=p10Lang()==='zh';const trip=api.priceTrip(p10View.days,p10BudgetState);const names={stay:zh?'住宿':'Stay',fuel:zh?'燃油或交通':'Fuel or transport',food:zh?'餐饮':'Food',activities:zh?'付费活动':'Paid activities',ferry:zh?'渡轮':'Ferry',parking:zh?'停车':'Parking'};p10View.days.forEach((d,i)=>{const host=document.querySelector(`[data-gday-budget="${i}"]`);if(!host)return;const day=trip.days[i];const bits=Object.entries(day.lines).filter(([,line])=>!line.empty).map(([key,line])=>`<span><b>${names[key]}</b> ${p10Esc(api.formatMoney(line,zh?'zh':'en'))}</span>`).join('');host.innerHTML=`<div class="gday-cost">${bits}</div><p class="gday-sub"><b>${zh?'当天小计':'Day subtotal'}</b> ${p10Esc(api.formatMoney(day.subtotal,zh?'zh':'en'))} · <b>${zh?'累计':'Running'}</b> ${p10Esc(api.formatMoney(day.running,zh?'zh':'en'))}</p>`;});const box=p10$('#p10-budget-summary');if(box){const cat=Object.entries(trip.categories).map(([key,line])=>`<li><span>${names[key]}</span><span>${p10Esc(api.formatMoney(line,zh?'zh':'en'))}</span></li>`).join('');const byDay=trip.days.map((day,i)=>`<li><span>${zh?'第':'Day '}${i+1}${zh?'天':''}</span><span>${p10Esc(api.formatMoney(day.subtotal,zh?'zh':'en'))}</span></li>`).join('');const cny=p10BudgetState.showCny?`<p>${zh?'人民币':'CNY'} ${p10BudgetState.nzdCny==null?(zh?'待核（先填汇率）':'To verify (type a rate)'):p10Esc(api.formatMoney(trip.cny,zh?'zh':'en','CN¥'))}${p10BudgetState.nzdCnyDate?` · ${p10Esc(p10BudgetState.nzdCnyDate)}`:''}</p>`:'';box.innerHTML=`<p class="p10-budget-total"><b>${zh?'行程合计':'Trip total'}</b> ${p10Esc(api.formatMoney(trip.total,zh?'zh':'en'))}</p><p><b>${zh?'每人':'Per person'}</b> ${p10Esc(api.formatMoney(trip.perPerson,zh?'zh':'en'))} · ${p10BudgetState.people} ${zh?'人':'people'}</p>${cny}<h3>${zh?'按类别':'By category'}</h3><ul class="p10-budget-split">${cat}</ul><h3>${zh?'按天':'By day'}</h3><ul class="p10-budget-split">${byDay}</ul>`;}const sticky=p10$('#p10-budget-sticky');if(sticky){const amount=`${p10Esc(api.formatMoney(trip.total,zh?'zh':'en'))} · ${zh?'每人':'each'} ${p10Esc(api.formatMoney(trip.perPerson,zh?'zh':'en'))}`;sticky.innerHTML=`<button type="button" class="gday-sum">${zh?'合计':'Total'}</button><span class="gday-sum-amt" hidden>${amount}</span>`;if(!sticky.dataset.sum){sticky.dataset.sum='1';sticky.addEventListener('click',ev=>{if(!ev.target.closest('.gday-sum'))return;const amt=sticky.querySelector('.gday-sum-amt');if(amt)amt.hidden=!amt.hidden;});}}const src=p10$('#p10-budget .p10-budget-sources');if(src&&!src.childElementCount)src.innerHTML=Object.values(api.SOURCES).map(s=>`<li><a href="${p10Esc(s.url)}" target="_blank" rel="noopener" data-keep-link="1">${p10Esc(zh?s.zh:s.en)}</a> <span class="v4-note">${p10Esc(s.checkedAt)}</span></li>`).join('');}
  function p10EnsureBudget(){const api=globalThis.pounamuBudget;if(!api)return;if(!p10BudgetState){let from='';try{from=new URLSearchParams(location.search).get('budget')||'';}catch{}p10BudgetState=from?api.decodeState(from):api.blankAssumptions();}}
  // Planner nodes and their destination pages (catalogue town ids), so a later stay day can link to the town page.
  const P10_NODE_PLACE={christchurch:'si-chc',queenstown:'si-zqn',dunedin:'si-dud',nelson:'si-nsn',picton:'si-pic',akaroa:'si-aka',greymouth:'si-gmn',hokitika:'si-hok',marahau:'si-mrh',kaikoura:'si-kai','franz-josef':'si-frj',fox:'si-fox',wanaka:'si-wan','te-anau':'si-tea',milford:'si-mfd',tekapo:'si-tek',twizel:'si-twz',aoraki:'si-mtc',oamaru:'si-oam',owaka:'si-owk',invercargill:'si-ivc',oban:'si-sti',auckland:'ni-akl',wellington:'ni-wlg',paihia:'ni-boi',hahei:'ni-cmd',matamata:'ni-mtm',waitomo:'ni-wtm',rotorua:'ni-rot',taupo:'ni-tpo','national-park':'ni-ton',napier:'ni-npe',whanganui:'ni-wag',pipiriki:'ni-pip',taumarunui:'ni-tmr',tauranga:'ni-tga',whakatane:'ni-wka',gisborne:'ni-gis','tolaga-bay':'ni-tol',feilding:'ni-fld',masterton:'ni-mst',alexandra:'si-alx',glenorchy:'si-gle',blenheim:'si-bhe',waiheke:'ni-whk',cromwell:'si-crm',coromandel:'ni-cor',kaitaia:'ni-ktt',opononi:'ni-opo',whangarei:'ni-whg',whangamata:'ni-wmt',stratford:'ni-str',whangamomona:'ni-wmo',martinborough:'ni-mtb'};
  function p10WishIsland(id){const w=WISHES.find(x=>x.id===id);if(w&&w.island)return w.island;return /^ni-/.test(id)?'north':/^si-/.test(id)?'south':'';}
  // Ski areas near a stay town (data/ski-fields.json, each season line from the operator); shown on winter-month trips.
  let p10Ski=null,p10SkiLoading=false;
  function p10LoadSki(){
    if(p10Ski||p10SkiLoading)return;p10SkiLoading=true;
    fetch('data/ski-fields.json').then(r=>{if(!r.ok)throw new Error('ski '+r.status);return r.json();}).then(d=>{p10Ski=(d&&d.fields)||[];p10SkiLoading=false;if(p10Result&&P10_WINTER_MONTHS.includes(Number(p10Result.input.month)))p10Show(p10Result);}).catch(()=>{p10Ski=null;p10SkiLoading=false;});
  }
  function p10SkiNote(node,month,zh){
    if(!P10_WINTER_MONTHS.includes(Number(month)))return '';
    const pid=P10_NODE_PLACE[node];if(!pid)return '';
    if(!p10Ski){p10LoadSki();return '';}
    const near=p10Ski.filter(f=>f.town_id===pid);if(!near.length)return '';
    const rows=near.map(f=>`<a href="${p10Esc(f.url)}" target="_blank" rel="noopener noreferrer">${p10Esc(zh?f.name_zh:f.name_en)} ↗</a>`).join(zh?'、':', ');
    return `<p class="p10-ski" data-p10-ski="${p10Esc(pid)}">${zh?'雪季附近可滑雪：':'Ski areas nearby in season: '}${rows}${zh?'。雪季和开放日期以滑雪场官网为准。':'. Check each ski area for season and opening dates.'} <a href="prepare.html?lang=${zh?'zh':'en'}#ski">${zh?'冬季出行准备':'Winter preparation'}</a></p>`;
  }
  function p10PartLabel(a,zh){return a.total>1?(zh?`（第 ${a.part} 天，共 ${a.total} 天）`:` (day ${a.part} of ${a.total})`):'';}
  // Optional stay tier (ticket F): each night lists that tier's official links and a map search in the overnight town.
  // A failed fetch is not cached: p10Stays stays null so the next night render tries again, and one retry runs on its own.
  let p10Stays=null,p10StaysLoading=false;
  function p10LoadStays(retry){
    if(p10Stays||p10StaysLoading)return;
    p10StaysLoading=true;
    fetch('data/stays-budget.json').then(r=>{if(!r.ok)throw new Error('stays '+r.status);return r.json();}).then(d=>{
      if(!d||!Array.isArray(d.tiers))throw new Error('stays');
      p10Stays=d.tiers;p10StaysLoading=false;
      if(p10Result&&p10Result.input.stay)p10Show(p10Result);
    }).catch(()=>{
      p10Stays=null;p10StaysLoading=false;
      if(!retry&&p10Result&&p10Result.input.stay)setTimeout(()=>p10LoadStays(true),250);
    });
  }
  function p10StayLinks(tierId,at,zh){
    if(!tierId)return '';if(!p10Stays){p10LoadStays();return '';}
    const tier=p10Stays.find(t=>t.id===tierId);if(!tier)return '';const town=NODES[at]?.en||at;
    const links=tier.links.map(l=>{const href=l.kind==='maps'?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.query+' '+town+' New Zealand')}`:l.url;return `${zh?l.label_zh:l.label_en} ${href}`;}).join(' · ');
    return `<p class="p10-stay-links" data-p10-stay="${p10Esc(tier.id)}">${p10Esc(zh?`${tier.zh}住宿：`:`${tier.en} stays: `)}${p10Esc(links)}</p>`;
  }
  function p10ShowImported(result){
    const el=p10$('#planResult');if(!el)return;const zh=p10Lang()==='zh',pack=result.routeImport,api=globalThis.pounamuMapsUrl;
    const moveLabel=pack.mode==='paddle'?(zh?'划多久':'PADDLE'):pack.mode==='walk'?(zh?'走多久':'WALK'):pack.mode==='transit'?(zh?'车上多久':'TRANSIT'):(zh?'开车多久':'DRIVE');
    const cards=pack.days.map((s,i)=>{
      const title=zh?s.titleZh:s.titleEn, text=zh?s.textZh:s.textEn, stay=zh?s.stayZh:s.stayEn;
      const href=s.dir&&api?api.dirUrl({origin:s.dir.origin,destination:s.dir.destination,mode:s.dir.mode||'transit'}):(api?api.searchUrl({name:s.query||stay||title}):'');
      const link=href?`<a class="v4-gmaps" href="${p10Esc(href)}" target="_blank" rel="noopener" data-keep-link="1">${s.dir?(zh?'Google Maps 当天路线':'Google Maps for this day'):(zh?'在谷歌地图打开':'Open in Google Maps')}</a>`:'';
      const hut=s.officialUrl?`<p class="gday-official"><a href="${p10Esc(s.officialUrl)}" target="_blank" rel="noopener" data-keep-link="1">${p10Esc(zh?(s.officialLabelZh||'DOC'):(s.officialLabelEn||'DOC'))}</a> · 2026-11-13</p>`:(s.hut?`<p class="gday-official"><a href="https://www.doc.govt.nz/parks-and-recreation/places-to-stay/stay-in-a-hut/hut-categories/" target="_blank" rel="noopener" data-keep-link="1">${zh?'DOC 小屋分类与费用':'DOC hut categories and fees'}</a> · 2026-11-13</p>`:'');
      const stayRow=s.noStay?'':`<div><dt>${zh?'住哪里':'STAY'}</dt><dd>${p10Esc(stay||(zh?'待核':'To verify'))}</dd></div>`;
      return `<article class="plan-day gday" id="day-${i+1}" data-gday="${i+1}"><div class="gday-date"><b>DAY ${String(i+1).padStart(2,'0')}</b><span>${zh?'日期待核':'Date to verify'}</span></div><h3 class="plan-day-title">${p10Esc(title)}</h3><dl class="gday-meta">${stayRow}<div><dt>${moveLabel}</dt><dd>${p10Esc(zh?s.moveZh:s.moveEn)}</dd></div></dl><div class="gday-budget" data-gday-budget="${i}"></div><p>${p10Esc(text)}</p><p class="gday-actions">${link}</p>${hut}</article>`;
    }).join('');
    const transfers=pack.transfers.length?`<section class="p10-transfers"><h3>${zh?'接驳（并入当天，不另开一天）':'Transfers (folded into the day, not a separate day)'}</h3><ul>${pack.transfers.map(s=>`<li><strong>${p10Esc(zh?s.titleZh:s.titleEn)}</strong> ${p10Esc(zh?s.textZh:s.textEn)}</li>`).join('')}</ul></section>`:'';
    p10EnsureBudget();
    const budget=globalThis.pounamuGuide?globalThis.pounamuGuide.budgetShell(zh?'zh':'en'):'';
    el.innerHTML=`<h2 class="p10-result-title" tabindex="-1">${p10Esc(zh?pack.zh:pack.name)} · ${pack.planDays} ${zh?'天':'days'}</h2><p class="v4-note">${zh?'下面按这条线路自己的天数排，没有改成城际自驾。':'These days follow this route. They are not a driving tour.'}</p>${transfers}<div class="p10-days" id="p10-days">${cards}</div>${budget}`;
    const priced=pack.days.map(s=>({kind:s.noStay||s.stayKind==='none'?'depart':'activity',stayKind:s.stayKind==='verify'?'city':s.stayKind,noStay:!!s.noStay,unconfirmed:!!s.unconfirmed,campNzd:s.campNzd,legs:[],activities:[{}]}));
    delete el.dataset.budgetBound;if(globalThis.pounamuGuide) globalThis.pounamuGuide.bindBudget(el, priced);
    else if(globalThis.pounamuBudget){p10View={days:priced,token:result};p10PaintBudget();}
  }
  function p10Show(result){
    const el=p10$('#planResult');if(!el)return;if(!result){el.innerHTML='';return;}const x=p10Text(),zh=p10Lang()==='zh',lang=p10Lang();
    if(result.routeImport){p10ShowImported(result);return;}
    if(result.disconnected){el.innerHTML=`<p class="p10-warning">${x.disconnected}</p>`;return;}
    const notices=[];
    if(p10Restored)notices.push(`<div class="p10-restored" role="status"><p>${zh?'这是你上次在这台设备上排的行程，已自动恢复。':'This is the trip you last planned on this device, restored automatically.'}</p><button type="button" class="p10-add-stop" data-p10-reset="1">${zh?'清空，重新开始':'Clear and start again'}</button></div>`);
    const early=p10Present(result);
    const startName=p10Esc(p10Name(result.input.start)),endName=p10Esc(p10Name(result.input.end));
    if(p10StillTight(result, early)){
      // When the trip was fitted, offer to drop only places that were left out; the kept ones are the trip shown.
      const choices=p10DropChoices(result).filter(c=>!(early.fitted&&result.fits&&result.fits.keep.includes(c.id)));
      const drops=choices.map(c=>`<button type="button" class="p10-add-stop" data-p10-trim="1" data-p10-drop="${p10Esc(c.id)}">${zh?`去掉${p10Esc(c.zh)}（省 ${c.saves} 天）`:`Drop ${p10Esc(c.en)} (saves ${c.saves} day${c.saves>1?'s':''})`}</button>`).join(' ');
      const more=result.minimum<=30?`<button type="button" class="p10-add-stop" data-p10-days="${result.minimum}">${zh?`把天数改成 ${result.minimum}`:`Change to ${result.minimum} days`}</button>`:'';
      const southTrip=!P10_NORTH_HUBS.has(result.input.start)&&!P10_NORTH_HUBS.has(result.input.end)&&result.order.every(w=>w.island!=='north');
      const tmpl=southTrip&&result.input.days>=7?`<a class="p10-add-stop" href="guide.html?template=SI-09B&amp;lang=${lang}">${zh?'看 9 天南岛线路模板':'See the 9-day South Island template'}</a>`:'';
      const direct=p10Build(result.input,[]).days.length;
      const startNorth=P10_NORTH_HUBS.has(result.input.start),homeIsland=startNorth===P10_NORTH_HUBS.has(result.input.end)?(startNorth?'north':'south'):'';
      const away=homeIsland?result.input.wishes.filter(id=>{const isl=p10WishIsland(id);return isl&&isl!==homeIsland;}):[];
      const islandBtn=away.length?`<button type="button" class="p10-add-stop p10-keep-island" data-p10-trim="1" data-p10-drop="${p10Esc(away.join(','))}">${zh?`只保留${homeIsland==='north'?'北岛':'南岛'}的地点（去掉另一岛的 ${away.length} 个）`:`Keep only ${homeIsland==='north'?'North':'South'} Island places (drop ${away.length} on the other island)`}</button>`:'';
      const msg=early.fitted
        ?(zh?`你选的地方全部排进去约需 ${result.minimum} 天，你选了 ${result.input.days} 天。下面这 ${result.input.days} 天会按时把你带到${endName}；排不下的地点在「未安排」里，你的勾选没有删除。`:`All your places need about ${result.minimum} days; you chose ${result.input.days}. The ${result.input.days} days below still get you to ${endName}. Places that do not fit are under Unscheduled; your ticks are kept.`)
        :(zh?`光是从${startName}到${endName}的路程就要约 ${direct} 天，你选了 ${result.input.days} 天。下面先列出前 ${result.input.days} 天，请增加天数或换一个离开城市。`:`The journey from ${startName} to ${endName} alone takes about ${direct} days; you chose ${result.input.days}. The first ${result.input.days} days are shown; add days or choose another departure city.`);
      const short=(early.shortened||[]).map(w=>zh?`${p10Esc(w.zh)}从 ${w.fullDays} 天缩短为 ${w.days} 天`:`${p10Esc(w.en)} is shortened from ${w.fullDays} to ${w.days} day${w.days>1?'s':''}`).join(zh?'；':'; ');
      const shortMsg=short?`<p class="p10-note">${zh?`为了排下更多地点，${short}。`:`To fit more places in, ${short}.`}</p>`:'';
      notices.push(`<div class="p10-tight" role="status"><p class="p10-warning">${msg}</p>${shortMsg}<div class="p10-along">${islandBtn}${drops?`<span>${zh?'减点或换点：':'Remove or swap a place: '}</span>${drops}`:''} ${more} ${tmpl}</div></div>`);
    }
    if(result.suggested&&result.suggested.length){
      const names=result.order.map(w=>`${p10Esc(p10WishLabel(WISHES.find(x=>x.id===w.id)||w))}${w.shortened?(zh?`（${w.days} 天）`:` (${w.days} day${w.days>1?'s':''})`):''}`).join(zh?'、':', ');
      notices.push(`<div class="p10-suggested" role="status"><p><strong>${zh?`你还没选地点，这是按 ${result.input.days} 天推荐的路线，可以增删。`:`You have not picked any places yet, so this is a suggested ${result.input.days}-day route. Add or remove places as you like.`}</strong></p><p>${zh?'推荐地点：':'Suggested places: '}${names}</p><div class="p10-along"><button type="button" class="p10-add-stop" data-p10-adopt="1">${zh?'把这些地点加入我的勾选':'Make these my picks'}</button><button type="button" class="p10-add-stop" data-p10-edit="1">${zh?'去地图和列表里增删':'Change places on the map or list'}</button></div></div>`);
    }
    const prefName={easy:zh?'轻松观光':'easy sightseeing',walk:zh?'徒步':'walking',cycle:zh?'骑行':'cycling',drive:zh?'风景公路':'scenic roads'}[result.input.preference]||result.input.preference;
    const ranked=p10Rank(result.input).slice(0,5);
    if(ranked.length)notices.push(`<div class="p10-rank-box" data-p10-rank="${p10Esc(result.input.preference)}"><p><strong>${zh?`按「${prefName}」，推荐顺序是：`:`For ${prefName}, the recommended order is:`}</strong></p><ol class="p10-rank">${ranked.map(w=>`<li>${p10Esc(zh?w.zh:w.en)}</li>`).join('')}</ol><button type="button" class="p10-add-stop" data-p10-editor="1">${p10Esc(x.editor)}</button></div>`);
    const offNetwork=result.inaccessible.filter(w=>w.catalog&&w.base===w.id),noService=result.inaccessible.filter(w=>!offNetwork.includes(w));
    if(noService.length)notices.push(`<p class="p10-warning">${x.unreachable}：${noService.map(w=>p10Esc(w[lang])).join(zh?'、':', ')}。</p>`);
    if(offNetwork.length)notices.push(`<p class="p10-warning">${zh?'这些城镇还没有核实过的道路时间，没有排进每日行程，请自行安排：':'These towns have no checked road times yet, so they are not in the daily plan; arrange them separately: '}${offNetwork.map(w=>p10Esc(w[lang])).join(zh?'、':', ')}${zh?'。':'.'}</p>`);
    const extras=p10Extras(result),spareDays=result.input.days-result.minimum;
    if(extras.length)notices.push(`<div class="p10-along"><span>${zh?`还有 ${spareDays} 天空闲，按天数还能加上：`:`You have ${spareDays} spare day${spareDays>1?'s':''}. These places still fit:`}</span> ${extras.map(w=>`<button type="button" class="p10-add-stop" data-p10-add="${p10Esc(w.id)}">＋ ${p10Esc(p10WishLabel(w))}</button>`).join(' ')}${extras.length>1?` <button type="button" class="p10-add-stop" data-p10-add="${p10Esc(extras.map(w=>w.id).join(','))}">${zh?'全部加入':'Add them all'}</button>`:''}</div>`);
    const suggestions=extras.length?[]:p10AlongWay(result);
    if(suggestions.length)notices.push(`<div class="p10-along"><span>${zh?'还可以加入顺路地点：':'Add a stop along the way:'}</span> ${suggestions.map(w=>`<button type="button" class="p10-add-stop" data-p10-add="${p10Esc(w.id)}">＋ ${p10Esc(w[lang])}</button>`).join(' ')}</div>`);
    if(!p10View || p10View.token!==result){
      const present=p10Present(result);
      const days=present.days.map((d,i)=>({...d,orig:i,legs:[...(d.legs||[])],activities:[...(d.activities||[])]}));
      p10View={token:result,days:p10RestoreOrder(days,result.input),unscheduled:present.unscheduled||[]};
    }
    const timeline=p10View.days;
    const pref=result.input.preference==='drive'&&!result.input.car?'transit':result.input.preference;
    const p10DayTools=(index,total)=>`<div class="p10-day-tools" role="group" aria-label="${zh?'调整这一天的顺序':'Reorder this day'}"><button type="button" class="p10-drag" draggable="true" data-p10-drag="${index}" aria-label="${zh?'拖动排序':'Drag to reorder'}">⋮⋮</button><button type="button" data-p10-up="${index}" aria-label="${zh?'上移一天':'Move up a day'}" ${index===0?'disabled':''}>↑</button><button type="button" data-p10-down="${index}" aria-label="${zh?'下移一天':'Move down a day'}" ${index===total-1?'disabled':''}>↓</button><button type="button" data-p10-moveto="${index}">${zh?'移到…':'Move to…'}</button></div>`;
    const head=(d,i,title)=>`<div class="p10-day-head">${p10DateBlock(d.n,zh)}<h3 class="plan-day-title">${title}</h3>${p10DayTools(i,timeline.length)}</div>`;
    const shownPhotos=new Set();
    const activityHtml=a=>{
      const w=a.wish,name=p10Esc(w[lang]);
      const tipRec=P10_WISH_TIPS[w.id],tip=tipRec&&!tipRec.verify?tipRec[lang]||'':'';
      const src=tip&&tipRec.src?` <span class="p10-tip-src">${zh?'来源：':'Source: '}${tipRec.src.map(s=>`<a href="${p10Esc(s.url)}" target="_blank" rel="noopener noreferrer">${p10Esc(new URL(s.url).hostname.replace(/^www\./,''))}</a>${s.checkedAt?(zh?`（${s.checkedAt} 核）`:` (checked ${s.checkedAt})`):''}`).join(zh?'；':'; ')}</span>`:'';
      // A tip without an official source is not shown as advice; the visitor gets the official site instead.
      const official=tipRec&&tipRec.verify&&tipRec.check?` <span class="p10-tip-src">${zh?'怎么玩、要不要预订，请看官方网站：':'What to do and what to book: see the official site '}<a href="${p10Esc(tipRec.check)}" target="_blank" rel="noopener noreferrer">${p10Esc(new URL(tipRec.check).hostname.replace(/^www\./,''))} ↗</a></span>`:'';
      const guides=p10Suggestions(w.id,pref).map(g=>`<a href="route.html?id=${encodeURIComponent(g.id)}&amp;lang=${lang}">${p10Esc(g[lang])}</a>`).join(' · ');
      const ski=a.part===1?p10SkiNote(w.base||w.id,result.input.month,zh):'';
      if(a.part>1){
        const pid=P10_NODE_PLACE[w.base]||P10_NODE_PLACE[w.id];
        const dest=pid?` <a href="destination.html?id=${pid}&amp;lang=${lang}">${zh?`看${p10Esc(p10Name(w.base)||w.zh)}的景点与活动 ↗`:`Sights and activities in ${p10Esc(p10Name(w.base)||w.en)} ↗`}</a>`:'';
        return `<p><strong>${zh?'游览：':'Visit: '}${name}${p10PartLabel(a,zh)}</strong>${zh?'。前一天没去成的可以接着安排，也可以换一条线路，或者留半天休息。':'. Pick up what you missed the day before, try another route, or keep half the day to rest.'}${dest}</p>${guides?`<p class="p10-suggestions">${zh?'当天可走的线路：':'Route for the day: '}${guides}</p>`:''}`;
      }
      const photo=a.part===1&&!shownPhotos.has(w.id)?p10WishPhoto(w.id):null;if(photo)shownPhotos.add(w.id);
      const figure=photo?`<figure class="p10-day-photo"><img src="${p10Esc(photo.src)}" alt="${p10Esc(Array.isArray(photo.place)?photo.place[zh?1:0]:name)}" loading="lazy" decoding="async" width="640" height="360"><figcaption>${p10Esc(Array.isArray(photo.place)?photo.place[zh?1:0]:'')} · <a href="${p10Esc(photo.source)}" target="_blank" rel="noopener noreferrer">${p10Esc(photo.author)}</a> · <a href="${p10Esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${p10Esc(photo.license)}</a></figcaption></figure>`:'';
      return `${figure}<p><strong>${zh?'游览：':'Visit: '}${name}${p10PartLabel(a,zh)}</strong>${tip?(zh?'。':'. ')+p10Esc(tip)+src:''}${official}</p>${ski}${guides?`<p class="p10-suggestions">${zh?'当天可走的线路：':'Route for the day: '}${guides}</p>`:''}`;
    };
    const rows=timeline.map((d,i)=>{
      const number=d.n;
      if(d.kind==='weather'||d.kind==='free'){
        const title=d.kind==='weather'?(zh?`${p10Esc(p10Name(d.at))} · 天气机动日`:`${p10Esc(p10Name(d.at))} · weather buffer day`):(zh?`${p10Esc(p10Name(d.at))} · 自由活动日`:`${p10Esc(p10Name(d.at))} · free day`);
        const description=d.kind==='weather'?(zh?'天气不好时用来改期；天气适合时可自由活动。':'Use this day to reschedule if weather disrupts your plans; otherwise enjoy free time.'):(zh?`多出来的一天：在${p10Esc(p10Name(d.at))}自由活动或休息。`:`A spare day: free time or rest in ${p10Esc(p10Name(d.at))}.`);
        return `<article class="plan-day gday" id="day-${d.n}" tabindex="0" data-p10-index="${i}">${head(d,i,title)}<dl class="gday-meta"><div><dt>${zh?'住哪里':'STAY'}</dt><dd>${p10Esc(p10Name(d.at))}</dd></div><div><dt>${zh?'开车多久':'DRIVE'}</dt><dd>${zh?'当天不赶路':'No driving today'}</dd></div></dl><div class="gday-budget" data-gday-budget="${i}"></div><p>${description}</p><p class="p10-night">${x.night}${zh?'：':': '}${p10Esc(p10Name(d.at))}</p>${p10StayLinks(result.input.stay,d.at,zh)}${p10DayMapLinks(d,result.input,zh)}</article>`;
      }
      const acts=d.activities.map(a=>p10Esc(a.wish[lang])).join(zh?'、':', ');
      const from=d.legs.length?p10Esc(p10Name(d.legs[0].a)):'';
      const title=d.kind==='arrive'?`${x.arrive} ${p10Esc(p10Name(d.at))}`
        :d.kind==='depart'?(d.legs.length?`${from} → ${p10Esc(p10Name(d.at))} · ${zh?'离开':'depart'}`:`${x.depart} ${p10Esc(p10Name(d.at))}`)
        :d.legs.length?`${from} → ${p10Esc(p10Name(d.at))}${d.kind==='activity'&&acts?` · ${zh?'游览':'explore '}${acts}${p10PartLabel(d.activities[0],zh)}`:d.activities.length?p10WayTitle(d,lang):''}`
        :`${acts}${zh?' · 游览':' · explore'}${d.activities[0]?p10PartLabel(d.activities[0],zh):''}`;
      const legs=d.legs.map(l=>{const road=p10LegDescription(l,lang);const mode=x[l.mode]||x.road;const cook=l.mode==='ferry'&&(l.a==='picton'||l.b==='picton');const duration=cook?(zh?`航行约 ${p10Duration(Math.max(0,l.h-1),lang)}，车辆检票另计 60 分钟`:`sailing about ${p10Duration(Math.max(0,l.h-1),lang)}, plus 60 min vehicle check-in`):p10Duration(l.h,lang);const km=p10LegKm(l);const kmText=km!=null?` · ${km} km`:(l.km===0||l.src&&l.src.km&&l.src.km.status==='待核'?` · ${zh?'里程待核':'distance to be verified'}`:'');return `<li>${p10Esc(p10Name(l.a))} → ${p10Esc(p10Name(l.b))} · ${p10Esc(road)} · ${mode}${zh?'约':' about '}${duration}${kmText} ${p10LegTag(l,zh)}</li>`;}).join('');
      const travel=d.legs.reduce((sum,l)=>sum+l.h,0),driving=d.legs.filter(l=>l.mode==='car').reduce((sum,l)=>sum+l.h,0),pace=Number(result.input.pace)||5;
      const total=travel>0?`<p class="p10-daily-total">${zh?'当天路上约':'Travel today: about '}${p10DailyTime(travel,lang)}</p>`:'';
      const stops=p10BreakStops(d),names=stops.map(id=>p10Esc(p10Name(id))).join(zh?'或':' or ');
      const longDay=result.input.car&&driving>pace?`<p class="p10-warning p10-long-day">${zh?'这天开车较长':'This is a long driving day'}${names?(zh?`，可以在${names}多住一晚并调整行程。`:`; consider an overnight stop in ${names} and adjust the itinerary.`):(zh?'，可以在途中多住一晚并调整行程。':'; consider an overnight stop and adjust the itinerary.')}</p>`:'';
      const before=d.activities.filter(a=>a.before).map(activityHtml).join(''),after=d.activities.filter(a=>!a.before).map(activityHtml).join('');
      const roadNotes=p10RoadNotes(d.legs,result.input.month,zh).map(n=>`<p class="p10-warning p10-road-note p10-${n.kind}-note">${p10Esc(n.text)} <span class="p10-note-src">${n.sources.map(src=>`<a href="${p10Esc(src.url)}" target="_blank" rel="noopener noreferrer">${p10Esc(src.label)}</a>`).join(' · ')}${zh?'（查阅 ':' (read '}${p10Esc(n.sources[0].checkedAt)}${zh?'）':')'}</span></p>`).join('');
      const arrivalTip=d.kind==='arrive'?`<p>${result.input.car?(zh?'落地后先休息，避免当天长途驾驶。':'Rest after landing and avoid a long drive on the first day.'):(zh?'落地后先休息，第一天别排长途大巴。':'Rest after landing and avoid a long bus ride on the first day.')}</p>`:'';
      const lateTip=d.kind==='depart'&&d.legs.length?`<p class="p10-note">${zh?'离开当天还要赶一段路，航班请订在下午或傍晚以后。':'You still travel on your departure day, so book an afternoon or evening flight.'}</p>`:'';
      const sights=[...new Set(d.activities.flatMap(a=>p10SightNames(a.wish,zh)))];
      const sightLine=sights.length?`<p class="gday-sights"><strong>${zh?'可安排：':'You can include: '}</strong>${sights.map(p10Esc).join(zh?'、':', ')}</p>`:'';
      const driveH=d.legs.reduce((s,l)=>s+l.h,0),driveKm=d.legs.reduce((s,l)=>s+(Number(l.km)>0?Number(l.km):0),0);
      const meta=`<dl class="gday-meta"><div><dt>${zh?'住哪里':'STAY'}</dt><dd>${d.kind==='depart'?(zh?'当天离开，不住':'Depart today, no overnight'):p10Esc(p10Name(d.at))}</dd></div><div><dt>${zh?'开车多久':'DRIVE'}</dt><dd>${driveH?`${zh?'估算':'est.'} ${p10DailyTime(driveH,lang)}${driveKm?` · ${Math.round(driveKm)} km`:''}`:(zh?'当天没有城际路段':'No inter-town leg today')}</dd></div></dl>`;
      const dark=d.activities.some(a=>a.slot==='evening'&&a.wish&&a.wish.base!==d.at)?`<p class="p10-warning p10-dark-sky">${zh?`暗夜星空要在入夜后看。这一晚写在${p10Esc(p10Name(d.at))}，不是特卡波。请加一晚住在特卡波，否则只能路过。`:`The dark sky is an evening activity. This night is in ${p10Esc(p10Name(d.at))}, not Tekapo. Add a night in Tekapo, or treat it as a pass-through.`}</p>`:(d.activities.some(a=>a.slot==='evening')?`<p class="gday-tip">${zh?'观星安排在入夜后，当晚住在特卡波。':'Stargazing is timed for the evening, with the night in Tekapo.'}</p>`:'');
      return `<article class="plan-day gday" id="day-${d.n}" tabindex="0" data-p10-index="${i}">${head(d,i,title)}${meta}<div class="gday-budget" data-gday-budget="${i}"></div>${arrivalTip}${before}${sightLine}${legs?`<ul class="p10-legs">${legs}</ul>`:''}${roadNotes}${total}${longDay}${dark}${lateTip}${after}${d.kind==='depart'?'':`<p class="p10-night">${x.night}${zh?'：':': '}${p10Esc(p10Name(d.at))}</p>${p10StayLinks(result.input.stay,d.at,zh)}`}${p10DayMapLinks(d,result.input,zh)}${p10OfficialLinks(d,zh)}</article>`;
    }).join('');
    const recoName=p10JevRouteName(p10Recommendation,lang,typeof routes==='undefined'?[]:routes);
    const reco=recoName?`<p>${x.reco}${zh?'：':': '}<a href="route.html?id=${encodeURIComponent(p10Recommendation)}&amp;lang=${lang}">${p10Esc(recoName)}</a></p>`:'';
    const uns=p10View.unscheduled||[];
    const unsHtml=uns.length?`<section class="p10-unscheduled"><h3>${zh?'未安排':'Unscheduled'}</h3><ul>${uns.map(w=>{const eve=w.id==='tekapo'?(zh?'暗夜星空需要当晚住在特卡波附近，否则只能路过。':'The dark sky needs a night near Tekapo; otherwise it is only a pass-through.'):'';return `<li>${p10Esc(zh?w.zh:w.en)}${w.passThrough?(zh?'（会路过，但没留游览时间）':' (you pass through, without time to stop)'):''}${eve?` ${p10Esc(eve)}`:''}</li>`;}).join('')}</ul></section>`:'';
    const shortfall=p10ShortfallNote(result, {days: timeline}, lang);
    const titleText=zh?`你的 ${timeline.length} 天行程：${startName} → ${endName}`:`Your ${timeline.length}-day trip: ${startName} → ${endName}`;
    const tools=`<div class="p10-result-tools"><button type="button" class="p10-add-stop" data-p10-share="1">${zh?'复制分享链接':'Copy share link'}</button><button type="button" class="p10-add-stop" data-p10-print="1">${zh?'打印或存为 PDF':'Print or save as PDF'}</button><span class="p10-share-status" role="status" aria-live="polite"></span></div>`;
    p10EnsureBudget();
    const jump=`<nav class="gday-jump" aria-label="${zh?'行程段落':'Itinerary sections'}"><a href="#p10-trip-map">${zh?'地图':'Map'}</a><a href="#p10-days">${zh?'每日':'Days'}</a><a href="#p10-budget">${zh?'预算':'Budget'}</a></nav>`;
    el.innerHTML=`<h2 class="p10-result-title" tabindex="-1">${titleText}</h2>${jump}${tools}${notices.join('')}${unsHtml}${reco}<p class="gday-route-links">${p10WholeRouteLinks(timeline, result.input, zh)}</p>${p10TripMap(timeline, result.input.start, result.input.end, result.inaccessible)}<div class="p10-days" id="p10-days">${rows}</div>${p10BudgetPanel(zh)}${shortfall?`<p class="p10-warning p10-shortfall">${p10Esc(shortfall)}</p>`:''}<p class="planner-small"><strong>${zh?'路段时间和里程都是估算值':'Segment times and distances are estimates'}</strong>${zh?`：自驾时间是 ${P10_NZTA_DATES.join('、')} 在 NZTA Journey Planner 逐段查询的读数（含查询当时的路况），取整到 15 分钟，不含停留；鼠标移到每段后面的小字上可看原始读数。NZTA 不显示里程，里程仍是规划估算。巴士、火车和渡轮时间是估算，以运营商时刻表为准。景点与步道起点的当地接驳不包含在行程中。出发前请在下列官方来源核对。`:`: driving times are readings taken segment by segment in NZTA Journey Planner on ${P10_NZTA_DATES.join(' and ')} (with the traffic at that moment), rounded to 15 minutes, without stops; hover the small note after each leg for the raw reading. NZTA shows no distances, so km are planning estimates. Coach, train and ferry times are estimates; check the operator's timetable. Local transport to sights and trailheads is not included. Check the official sources below before you go.`} ${x.sources}: ${(globalThis.P10_ROAD_SOURCES||[]).map(r=>`<a href="${r.url}" target="_blank" rel="noopener noreferrer">${p10Esc(r.label)}</a>`).join(' · ')}</p>`;
    p10FocusDay('all');
    p10PaintBudget();
    p10LoadCoast();
  }
  const P10_REGIONS=[{id:'northland-bay-of-islands',island:'north',zh:'北地与岛屿湾',en:'Northland & Bay of Islands'},{id:'auckland',island:'north',zh:'奥克兰',en:'Auckland'},{id:'coromandel',island:'north',zh:'科罗曼德',en:'The Coromandel'},{id:'hamilton-waikato',island:'north',zh:'汉密尔顿－怀卡托',en:'Hamilton - Waikato'},{id:'bay-of-plenty',island:'north',zh:'丰盛湾',en:'Bay of Plenty'},{id:'tairawhiti-gisborne',island:'north',zh:'泰拉维蒂／吉斯伯恩',en:'Tairāwhiti Gisborne'},{id:'rotorua',island:'north',zh:'罗托鲁瓦',en:'Rotorua'},{id:'taupo',island:'north',zh:'陶波',en:'Taupō'},{id:'ruapehu',island:'north',zh:'鲁阿佩胡',en:'Ruapehu'},{id:'hawkes-bay',island:'north',zh:'霍克斯湾',en:"Hawke's Bay"},{id:'taranaki',island:'north',zh:'塔拉纳基',en:'Taranaki'},{id:'whanganui',island:'north',zh:'旺格努伊',en:'Whanganui'},{id:'manawatu',island:'north',zh:'马纳瓦图',en:'Manawatū'},{id:'wairarapa',island:'north',zh:'怀拉拉帕',en:'Wairarapa'},{id:'wellington',island:'north',zh:'惠灵顿',en:'Wellington'},{id:'nelson-tasman',island:'south',zh:'纳尔逊－塔斯曼',en:'Nelson-Tasman'},{id:'marlborough',island:'south',zh:'马尔堡',en:'Marlborough'},{id:'christchurch-canterbury',island:'south',zh:'基督城－坎特伯雷',en:'Christchurch - Canterbury'},{id:'west-coast',island:'south',zh:'西海岸',en:'West Coast'},{id:'wanaka',island:'south',zh:'瓦纳卡',en:'Wānaka'},{id:'queenstown',island:'south',zh:'皇后镇',en:'Queenstown'},{id:'central-otago',island:'south',zh:'中奥塔哥',en:'Central Otago'},{id:'dunedin',island:'south',zh:'但尼丁',en:'Dunedin'},{id:'clutha',island:'south',zh:'克卢萨',en:'Clutha'},{id:'fiordland',island:'south',zh:'峡湾',en:'Fiordland'},{id:'southland',island:'south',zh:'南地',en:'Southland'}];
  function p10WishLabel(w){const lang=p10Lang();if(w.id==='tekapo'&&lang==='zh')return '特卡波与暗夜星空';return w[lang];}
  function p10CatalogTowns(regionId, island){
    const all=globalThis.P10_CATALOG_TOWNS;
    if(!Array.isArray(all)) return null;
    return all.filter(t=>(!regionId || regionId==='all' || t.region_id===regionId) && (island==='all' || t.island===island) && t.type!=='attraction');
  }
  function p10RegionCount(regionId, island){
    const entries=p10RegionEntries(regionId, island);
    return entries.wishes.length+entries.towns.length;
  }
  function p10WishDays(days,zh){return days<1?(zh?'半天':'half a day'):zh?`${days} 天`:days===1?'1 day':`${days} days`;}
  function p10PlaceLabel(id){
    const zh=p10Lang()==='zh',w=WISHES.find(x=>x.id===id);if(w)return p10WishLabel(w);
    const t=(globalThis.P10_CATALOG_TOWNS||[]).find(x=>x.place_id===id);
    return t?(zh?(t.name_zh||t.name_en):(t.name_en||t.name_zh)):null;
  }
  // Ticked places live in one set, so filtering by island or region never hides or loses a choice. The filter is
  // kept here, not as a data-attribute on the form: an attribute there made every click inside the form look like a
  // filter click, which redrew the list and undid the tick (P0-01).
  const p10Filter={island:'all',region:'all'};
  function p10RenderSelected(){
    const host=p10$('#p10-selected');if(!host)return;const zh=p10Lang()==='zh';
    const items=[...p10Selected].map(id=>({id,label:p10PlaceLabel(id)})).filter(i=>i.label);
    host.innerHTML=items.length
      ?`<span class="p10-selected-label">${zh?`已选 ${items.length} 处：`:`Selected (${items.length}):`}</span>${items.map(i=>`<button type="button" class="p10-chip" data-p10-unselect="${p10Esc(i.id)}" aria-label="${zh?'取消 ':'Remove '}${p10Esc(i.label)}">${p10Esc(i.label)} <span aria-hidden="true">×</span></button>`).join('')}`
      :`<span class="p10-selected-label">${zh?'还没选地点。不选也可以：会按你的天数推荐一条路线，排好后还能增删。':'No places yet. You can leave it empty: you get a suggested route for your days, and can change it afterwards.'}</span>`;
    p10PickRefresh();
  }
  function p10RenderWishes(){
    const box=p10$('#p10-wishes');if(!box)return;
    const form=p10$('#plannerForm');if(!form)return;
    const zh=p10Lang()==='zh';
    const {island,region}=p10Filter;
    const islandHost=document.getElementById('p10-island');
    if(islandHost){islandHost.innerHTML=[['all',zh?'全部':'All'],['north',zh?'北岛':'North Island'],['south',zh?'南岛':'South Island']].map(([id,label])=>`<button type="button" data-p10-island="${id}" aria-pressed="${island===id}">${label}</button>`).join('');}
    const regionHost=document.getElementById('p10-region');
    if(regionHost){const regs=P10_REGIONS.filter(r=>island==='all'||r.island===island);regionHost.innerHTML=`<button type="button" data-p10-region="all" aria-pressed="${region==='all'}">${zh?'全部地区':'All regions'}</button>`+regs.map(r=>{const n=p10RegionCount(r.id, island);return `<button type="button" data-p10-region="${r.id}" aria-pressed="${region===r.id}" ${n?'':'disabled'}>${zh?`${r.zh}（${n} 个地点）`:`${r.en} (${n} ${n===1?'place':'places'})`}${n?'':zh?' · 本目录暂无地点':' · No places in this directory yet'}</button>`;}).join('');}
    const list=WISHES.filter(w=>(island==='all'||w.island===island)&&(region==='all'||P10_WISH_REGION[w.id]===region||(region==='unmapped'&&!P10_WISH_REGION[w.id])));
    const groups=new Map();
    for(const w of list){const key=P10_WISH_REGION[w.id]||'unmapped';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w);}
    const towns=(p10CatalogTowns(region, island)||[]).filter(t=>!p10TownIsSight(t));
    const townGroups=new Map();
    for(const t of towns){const key=t.region_id||'unmapped';if(!townGroups.has(key))townGroups.set(key,[]);townGroups.get(key).push(t);}
    const order=P10_REGIONS.filter(r=>(island==='all'||r.island===island)&&(region==='all'||r.id===region)).map(r=>r.id);
    if(region==='all'||region==='unmapped') order.push('unmapped');
    const row=(id,name,days,stay)=>`<label data-p10-wish="${p10Esc(id)}"><input type="checkbox" name="p10-wish" value="${p10Esc(id)}" ${p10Selected.has(id)?'checked':''}><span class="p10-wish-name">${p10Esc(name)}${stay?`<span class="p10-wish-stay">${p10Esc(stay)}</span>`:''}</span><span class="p10-wish-days">${p10WishDays(days,zh)}</span></label>`;
    // Where the night is spent, when the name does not say it (Milford Sound: stay in Te Anau).
    const stayAt=w=>{const n=NODES[w.base];if(!n)return '';const label=p10WishLabel(w);let town=(zh?n.zh:n.en).split(/[（(]/)[0].replace(/,.*$/,'').trim();if(zh&&town.startsWith(label))town=town.slice(label.length).trim();return !town||label.includes(town)?'':(zh?`住${town}`:`stay in ${town}`);};
    const mapItems=[];
    box.innerHTML=order.map(key=>{
      // The chip count and these rows both come from p10RegionEntries (unmapped stays on the leftover groups).
      const entries=P10_REGIONS.some(r=>r.id===key)?p10RegionEntries(key, island):null;
      const rows=entries?entries.wishes:(groups.get(key)||[]);
      const townRows=entries?entries.towns:(townGroups.get(key)||[]);
      if(!rows.length&&!townRows.length) return '';
      const meta=P10_REGIONS.find(r=>r.id===key);
      const heading=meta?(zh?meta.zh:meta.en):key;
      for(const w of rows)mapItems.push({id:w.id,kind:'sight',name:p10WishLabel(w),short:p10PickShort(w),xy:p10MapPoint(NODES[w.id]?w.id:w.base),worth:P10_WISH_WEIGHT[w.id]||1});
      for(const t of townRows){const primary=zh?(t.name_zh||t.name_en):(t.name_en||t.name_zh);mapItems.push({id:t.place_id,kind:'town',name:primary,short:primary.split(/[（(]/)[0],xy:p10Project([Number(t.lat),Number(t.lon)]),worth:0});}
      const wishHtml=rows.map(w=>row(w.id,p10WishLabel(w)+(w.id==='oamaru'?(zh?' · 怀塔基区':' · Waitaki District'):''),w.days,stayAt(w))).join('');
      const townHtml=townRows.map(t=>{const primary=zh?(t.name_zh||t.name_en):(t.name_en||t.name_zh);const other=zh?t.name_en:'';return row(t.place_id,other&&other!==primary?`${primary} ${other}`:primary,0.5);}).join('');
      return `<section><h3>${p10Esc(heading)}</h3>${wishHtml?`<p class="p10-group-label">${zh?'景点与体验':'Sights and experiences'}</p><div class="p10-group">${wishHtml}</div>`:''}${townHtml?`<p class="p10-group-label">${zh?'城镇（停留半天或住一晚）':'Towns (half a day or a night)'}</p><div class="p10-group">${townHtml}</div>`:''}</section>`;
    }).join('');
    p10RenderPickMap(mapItems.filter(i=>i.xy&&i.xy.every(Number.isFinite)));
    p10RenderSelected();
  }
  // The listed places on a map: every place in the list is a dot, filled once ticked, and clicking a dot ticks or
  // unticks it, so a visitor who does not know the names can pick by where they are. On a wide screen the map sits
  // beside the form and stays in view while the list scrolls; on a narrow one it sits above the list.
  let p10PickItems=[];
  const p10Wide=()=>Boolean(window.matchMedia&&window.matchMedia('(min-width:1001px)').matches);
  function p10PickShort(w){const name=p10WishLabel(w);if(p10Lang()==='zh'){const s=name.split(/[与（(]/)[0];return s.includes('／')?s.split('／').pop():s;}return name.split(/ and | \(|\//)[0];}
  function p10PickHost(){
    let host=document.getElementById('p10-pick-map');
    if(!host){host=document.createElement('div');host.id='p10-pick-map';host.className='p10-pick-map';}
    const aside=document.querySelector('.planner-explainer'),anchor=document.getElementById('p10-selected');
    if(p10Wide()&&aside){if(host.parentElement!==aside)aside.append(host);aside.classList.add('p10-has-map');}
    else if(anchor){if(host.nextElementSibling!==anchor)anchor.before(host);aside?.classList.remove('p10-has-map');}
    return host;
  }
  function p10RenderPickMap(items){
    p10PickItems=items||[];
    const host=p10PickHost(),zh=p10Lang()==='zh';
    if(!p10PickItems.length){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    const xs=p10PickItems.map(i=>i.xy[0]),ys=p10PickItems.map(i=>i.xy[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const w=Math.max(x1-x0+130,220),h=Math.max(y1-y0+70,220),vb=[(x0+x1)/2+15-w/2,(y0+y1)/2-h/2,w,h];
    const start=p10$('#p10-start')?.value,end=p10$('#p10-end')?.value;
    // Labels are placed in this order, so ticked places and the best-known sights keep theirs when space runs out.
    const order=[...p10PickItems].sort((a,b)=>(p10Selected.has(b.id)-p10Selected.has(a.id))||((b.kind==='sight')-(a.kind==='sight'))||(b.worth-a.worth));
    const f=n=>n.toFixed(1);
    const dot=i=>`<g class="p10-pick-dot ${i.kind==='town'?'is-town':'is-sight'}${p10Selected.has(i.id)?' is-on':''}" data-p10-pick="${p10Esc(i.id)}"><circle class="p10-pick-hit" cx="${f(i.xy[0])}" cy="${f(i.xy[1])}" r="8"/><circle class="p10-pick-mark" cx="${f(i.xy[0])}" cy="${f(i.xy[1])}" r="4"/><title>${p10Esc(i.name)}</title></g>`;
    const label=i=>`<text class="p10-pick-label${i.kind==='town'?' is-town':''}" data-p10-pick-label="${p10Esc(i.id)}" data-px="${f(i.xy[0])}" data-py="${f(i.xy[1])}" x="${f(i.xy[0]+7)}" y="${f(i.xy[1]+4)}">${p10Esc(i.short)}</text>`;
    const tag=(id,text)=>{const p=p10MapPoint(id);return p?`<text class="p10-map-tag p10-pick-tag" data-px="${f(p[0])}" data-py="${f(p[1])}" x="${f(p[0])}" y="${f(p[1]-9)}" text-anchor="middle">${text}</text>`:'';};
    const tags=start===end?tag(start,zh?'起 / 终':'Start / end'):tag(start,zh?'起':'Start')+tag(end,zh?'终':'End');
    const names=p10PickItems.map(i=>`<li>${p10Esc(i.short)}</li>`).join('');
    host.innerHTML=`<div class="p10-pick-head"><strong>${zh?'在地图上选地点':'Pick places on the map'}</strong><span>${zh?'点圆点加入或取消，和列表同步。大圆点是景点，小圆点是城镇，深色是已选。':'Click a dot to add or remove a place; the list stays in step. Large dots are sights, small dots towns, dark ones are picked.'}</span></div><svg class="p10-pick-svg" viewBox="${vb.map(f).join(' ')}" aria-hidden="true"><rect class="p10-pick-sea" x="-2000" y="-2000" width="5000" height="5000"/><path class="p10-pick-land" d="${P10_COAST}"/><g class="p10-pick-dots">${[...order].reverse().map(dot).join('')}</g><g class="p10-pick-labels">${tags}${order.map(label).join('')}</g></svg><ul class="p10-pick-name-list">${names}</ul><p class="p10-pick-status" aria-live="polite"></p>`;
    p10PickLayout();
  }
  // Dots, names and start/end tags are sized for the map as drawn on screen; a name that would sit on another one is
  // left off (it still shows when the place is pointed at or ticked).
  function p10PickLayout(){
    const svg=document.querySelector('#p10-pick-map .p10-pick-svg');if(!svg)return;
    const vb=svg.viewBox.baseVal,box=svg.getBoundingClientRect();
    const k=box.width&&box.height?Math.max(vb.width/box.width,vb.height/box.height):vb.width/360;
    const fitPick=()=>{const b=svg.getBoundingClientRect();if(!b.width||!vb.width)return;const sc=b.width/vb.width;svg.querySelectorAll('text').forEach(t=>t.style.setProperty('font-size',(13/sc).toFixed(2)+'px','important'));if(window.pounamuSettleLabels)window.pounamuSettleLabels(svg,sc);};
    fitPick();requestAnimationFrame(fitPick);setTimeout(fitPick,120);
    svg.style.setProperty('--k',k.toFixed(3));
    for(const g of svg.querySelectorAll('.p10-pick-dot')){const town=g.classList.contains('is-town');g.querySelector('.p10-pick-mark').setAttribute('r',((town?3.5:5.5)*k).toFixed(2));g.querySelector('.p10-pick-hit').setAttribute('r',(11*k).toFixed(2));}
    const tags=[...svg.querySelectorAll('.p10-pick-tag')];
    for(const t of tags)t.setAttribute('y',(Number(t.dataset.py)-10*k).toFixed(1));
    const boxes=tags.map(t=>{try{return t.getBBox();}catch{return null;}}).filter(b=>b&&b.width);
    const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
    for(const t of svg.querySelectorAll('.p10-pick-label')){
      const id=t.dataset.p10PickLabel,on=p10Selected.has(id),px=Number(t.dataset.px),py=Number(t.dataset.py);
      t.classList.remove('is-off');
      if(t.classList.contains('is-town')&&!on){t.classList.add('is-off');continue;}
      const gap=8*k,line=13*k;
      const tries=[];
      for(const dy of [4*k,-gap,-line,line*2,-line*2,line*3,-line*3,line*4,-line*4,line*5,-line*5]){
        tries.push([px+gap,py+dy,'start'],[px-gap,py+dy,'end'],[px,py+dy,'middle']);
      }
      const put=([x,y,anchor])=>{t.setAttribute('x',x.toFixed(1));t.setAttribute('y',y.toFixed(1));t.setAttribute('text-anchor',anchor);try{return t.getBBox();}catch{return null;}};
      let spot=null;
      const inside=b=>b.x>=vb.x&&b.y>=vb.y&&b.x+b.width<=vb.x+vb.width&&b.y+b.height<=vb.y+vb.height;
      for(const s of tries){const b=put(s);if(!b||!b.width){spot=b;break;}if(inside(b)&&!boxes.some(o=>hit(b,o))){spot=b;break;}}
      if(!spot){if(on||!t.classList.contains('is-town'))spot=put(tries[0]);else{put(tries[0]);t.classList.add('is-off');continue;}}
      if(spot&&spot.width)boxes.push(spot);
    }
  }
  // After a tick or untick: fill or empty the dots and redo the names (a ticked place always gets its name).
  function p10PickRefresh(){
    const svg=document.querySelector('#p10-pick-map .p10-pick-svg');if(!svg)return;
    for(const g of svg.querySelectorAll('.p10-pick-dot'))g.classList.toggle('is-on',p10Selected.has(g.dataset.p10Pick));
    p10PickLayout();
  }
  function p10PickHot(id,on){
    const host=p10$('#p10-pick-map');if(!host)return;
    for(const el of host.querySelectorAll('.is-hot'))el.classList.remove('is-hot');
    for(const el of document.querySelectorAll('#p10-wishes label.is-hot'))el.classList.remove('is-hot');
    const status=host.querySelector('.p10-pick-status');
    if(!on||!id){if(status)status.textContent='';return;}
    const sel=`[data-p10-pick="${CSS.escape(id)}"]`,lab=`[data-p10-pick-label="${CSS.escape(id)}"]`;
    host.querySelector(sel)?.classList.add('is-hot');host.querySelector(lab)?.classList.add('is-hot');
    document.querySelector(`#p10-wishes label[data-p10-wish="${CSS.escape(id)}"]`)?.classList.add('is-hot');
    const item=p10PickItems.find(i=>i.id===id),zh=p10Lang()==='zh';
    if(status&&item)status.textContent=`${item.name}${p10Selected.has(id)?(zh?' · 已选，点圆点可取消':' · picked; click the dot to remove'):(zh?' · 点圆点加入':' · click the dot to add')}`;
  }
  function p10Month(){return Number(p10$('#p10-month')?.value)||0;}
  function p10Stay(){const v=p10$('#p10-stay')?.value||'';return ['budget','mid','high'].includes(v)?v:'';}
  function p10SyncTransport(){const car=p10$('#p10-transport')?.value!=='public';const field=p10$('#p10-pace-field');if(field)field.hidden=!car;}
  function p10Step(n){
    document.querySelectorAll('[data-p10-panel]').forEach(p=>{p.hidden=String(p.dataset.p10Panel)!==String(n);});
    document.querySelectorAll('[data-p10-step]').forEach(b=>b.setAttribute('aria-current',b.dataset.p10Step===String(n)?'step':'false'));
  }
  function p10FillRank(){
    const host=p10$('#p10-rank-live'); if(!host||!p10$('#p10-start'))return;
    const zh=p10Lang()==='zh';
    const input={start:p10$('#p10-start').value,end:p10$('#p10-end').value,days:Number(p10$('#days').value)||7,pace:Number(p10$('#p10-pace').value)||5,preference:p10$('#preference')?.value||'easy',car:p10$('#p10-transport')?.value!=='public',wishes:[]};
    let ranked=[]; try{ranked=p10Rank(input).slice(0,5);}catch{ranked=[];}
    host.innerHTML=ranked.map(w=>`<li>${p10Esc(zh?w.zh:w.en)}</li>`).join('');
  }
  function p10SyncAreaPressed(){
    const start=p10$('#p10-start')?.value, end=p10$('#p10-end')?.value, zh=p10Lang()==='zh';
    let matched=false;
    document.querySelectorAll('[data-p10-area]').forEach(b=>{
      const pair=P10_AREAS[b.dataset.p10Area];
      const on=Boolean(pair && pair[0]===start && pair[1]===end);
      if(on)matched=true;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    let note=document.getElementById('p10-custom-route');
    if(!note){const host=document.querySelector('.p10-area');if(host){note=document.createElement('p');note.id='p10-custom-route';note.className='p10-custom-route';host.after(note);}}
    if(note){
      if(!start||!end||matched){note.hidden=true;note.textContent='';note.setAttribute('aria-pressed','false');}
      else{note.hidden=false;note.setAttribute('aria-pressed','true');note.textContent=zh?`自定义路线：${p10Name(start)} → ${p10Name(end)}`:`Custom route: ${p10Name(start)} → ${p10Name(end)}`;}
    }
    const regions=new Set([P10_WISH_REGION[start],P10_WISH_REGION[end]].filter(Boolean));
    document.querySelectorAll('#p10-region [data-p10-region]').forEach(b=>{
      const on=regions.has(b.dataset.p10Region);
      b.classList.toggle('is-route',on);
      b.dataset.onRoute=on?'true':'false';
    });
  }
  const P10_AREAS={south:['christchurch','queenstown'],'south-loop':['christchurch','christchurch'],north:['auckland','wellington'],'north-loop':['auckland','auckland'],both:['auckland','queenstown']};
  let p10LinkWishes=null;
  function p10LinkNote(lang){
    if(!p10LinkWishes||!Array.isArray(globalThis.P10_CATALOG_TOWNS))return;
    const unknown=p10LinkWishes.map(p10AliasId).filter(id=>!p10WishById(id));const host=p10$('#planResult');if(!host)return;
    let note=p10$('#p10-link-note');if(!unknown.length){if(note)note.remove();return;}
    if(!note){note=document.createElement('p');note.id='p10-link-note';note.className='p10-link-note';note.setAttribute('role','status');host.before(note);}
    note.textContent=lang==='zh'?`链接里有 ${unknown.length} 个地点编号没有找到：${unknown.join('、')}。可能是旧链接或打错了，下面的行程没有包含它们。`:`${unknown.length} place id${unknown.length>1?'s':''} in this link ${unknown.length>1?'were':'was'} not found: ${unknown.join(', ')}. The link may be old or mistyped; the trip below leaves ${unknown.length>1?'them':'it'} out.`;
  }
  window.renderP10Planner=function(){
    if(!p10$('#plannerForm'))return;const x=p10Text(),lang=p10Lang(),zh=lang==='zh';
    for(const [id,key] of [['p10-start-label','start'],['p10-end-label','end'],['p10-days-label','days'],['p10-month-label','month'],['p10-stay-label','stay'],['p10-stay-none','stayNone'],['p10-stay-budget','stayBudget'],['p10-stay-mid','stayMid'],['p10-stay-high','stayHigh'],['p10-pace-label','pace'],['p10-pace-35','pace35'],['p10-pace-5','pace5'],['p10-pace-65','pace65'],['p10-wishes-label','places'],['p10-island-label','island'],['p10-region-label','region'],['p10-choose','choose'],['p10-transport-label','transport'],['p10-car-label','car'],['p10-public-label','public'],['p10-preference-label','preference'],['p10-pref-easy','prefEasy'],['p10-pref-walk','prefWalk'],['p10-pref-cycle','prefCycle'],['p10-pref-drive','prefDrive'],['p10-method-label','method'],['p10-local-label','local'],['p10-jev-label','jev'],['p10-submit','submit'],['p10-consent-text','consent']]){const el=document.getElementById(id);if(el)el.textContent=x[key];}
    const monthSel=p10$('#p10-month');if(monthSel)for(const o of monthSel.options)o.textContent=o.value==='0'?x.monthUnknown:(zh?`${o.value} 月`:new Date(2026,Number(o.value)-1,1).toLocaleString('en-NZ',{month:'long'}));
    for(const s of [p10$('#p10-start'),p10$('#p10-end')]){for(const o of s.options)o.textContent=NODES[o.value][lang];for(const g of s.querySelectorAll('optgroup'))g.label=g.dataset.p10Group==='north'?(zh?'北岛':'North Island'):(zh?'南岛':'South Island');}
    // Catalogue towns load after the page: re-plan a restored or shared trip once they can be resolved.
    if(p10Result&&!p10Result.p10Towns&&Array.isArray(globalThis.P10_CATALOG_TOWNS)&&p10Result.input.wishes.some(id=>!WISHES.some(w=>w.id===id))){try{p10Result=p10Plan(p10Result.input);p10Result.p10Towns=true;}catch{}}
    p10RenderWishes();
    p10SyncTransport();
    p10Show(p10Result);
    p10LinkNote(lang);
    for(const [id,key] of [['p10-step1-label','step1'],['p10-step2-label','step2'],['p10-step3-label','step3'],['p10-next-1','next'],['p10-next-2','next'],['p10-back-2','back'],['p10-back-3','back'],['p10-more-label','more'],['p10-area-label','area'],['p10-area-south','areaSouth'],['p10-area-loop','areaLoop'],['p10-area-north','areaNorth'],['p10-area-north-loop','areaNorthLoop'],['p10-area-both','areaBoth'],['p10-rank-label','rankLive']]){const el=document.getElementById(id);if(el)el.textContent=x[key];}
    p10FillRank();
    p10SyncAreaPressed();
    const lead=document.getElementById('p10-step-lead');
    if(lead)lead.textContent=zh?'下面直接生成逐日行程。地点、住宿和玩法都有默认值，想改再打开更多选项。':'This builds the day-by-day plan. Cities, stays and style already have defaults. Open more options only if you want to change them.';
  };
  window.setupP10Planner=function(){
    const form=p10$('#plannerForm');if(!form||form.dataset.p10Ready)return;form.dataset.p10Ready='1';
    const hubs=Object.entries(NODES).filter(([,n])=>n.hub);
    const options=north=>hubs.filter(([id])=>P10_NORTH_HUBS.has(id)===north).map(([key,n])=>`<option value="${key}">${p10Esc(n.zh)}</option>`).join('');
    for(const id of ['p10-start','p10-end'])p10$('#'+id).innerHTML=`<optgroup data-p10-group="south" label="南岛">${options(false)}</optgroup><optgroup data-p10-group="north" label="北岛">${options(true)}</optgroup>`;
    p10$('#p10-start').value='christchurch';p10$('#p10-end').value='queenstown';
    p10$('#days').innerHTML=Array.from({length:30},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');p10$('#days').value='7';
    const method=p10$('#plannerMethod'), jevAvailable=false;
    const methodLabel=p10$('#p10-method-label'), jevOption=p10$('#p10-jev-label');
    method.hidden=!jevAvailable;if(methodLabel)methodLabel.hidden=!jevAvailable;if(jevOption)jevOption.disabled=!jevAvailable;
    if(!jevAvailable){method.value='local';p10$('#jevConsent').hidden=true;}
    method.addEventListener('change',()=>{p10$('#jevConsent').hidden=method.value!=='jev';p10$('#jevConsentCheck').checked=false;p10Status('');});
    // A shared link (?from=…&to=…) wins over the trip saved in this browser.
    let saved=null;const q=new URLSearchParams(location.search);
    if(q.get('from')&&q.get('to'))p10LinkWishes=(q.get('w')||'').split(',').filter(Boolean);
    const routeId=q.get('route');
    if(routeId&&typeof routes!=='undefined'){const found=routes.find(r=>r.id===routeId);if(found){try{p10Result=p10PlanFromRoute(found);}catch{p10Result=null;}}}
    else if(q.get('from')&&q.get('to'))saved={start:q.get('from'),end:q.get('to'),days:Number(q.get('days'))||7,pace:Number(q.get('pace'))||5,preference:q.get('pref')||'easy',car:q.get('car')!=='0',month:Number(q.get('m'))||0,stay:q.get('stay')||'',wishes:(q.get('w')||'').split(',').filter(Boolean)};
    else try{saved=JSON.parse(localStorage.getItem('p10-road-plan'));p10Restored=Boolean(saved&&saved.wishes&&saved.wishes.length);}catch{}
    if(saved){
      for(const [selector,value] of [['#p10-stay',saved.stay||''],['#p10-month',saved.month||0],['#p10-start',saved.start],['#p10-end',saved.end],['#days',saved.days],['#p10-pace',saved.pace],['#preference',saved.preference],['#p10-transport',saved.car?'car':'public']])if(value!=null&&p10$(selector).querySelector(`option[value="${String(value)}"]`))p10$(selector).value=String(value);
      for(const id of saved.wishes||[])p10Selected.add(p10AliasId(id));
      try{p10Result=p10Plan({start:p10$('#p10-start').value,end:p10$('#p10-end').value,days:Number(p10$('#days').value),pace:Number(p10$('#p10-pace').value),preference:p10$('#preference').value,car:p10$('#p10-transport').value==='car',month:p10Month(),stay:p10Stay(),wishes:[...p10Selected]});}catch{p10Result=null;}
    }
    form.addEventListener('change',event=>{
      const t=event.target;
      if(t.name==='p10-wish'){if(t.checked)p10Selected.add(t.value);else p10Selected.delete(t.value);p10RenderSelected();}
      if(t.id==='p10-transport')p10SyncTransport();
      if(t.id==='preference'||t.id==='p10-start'||t.id==='p10-end'||t.id==='days'||t.id==='p10-pace')p10FillRank();
      if(t.id==='p10-stay'&&p10Result){p10Result.input={...p10Result.input,stay:p10Stay()};try{localStorage.setItem('p10-road-plan',JSON.stringify(p10Result.input));}catch{}p10Show(p10Result);}
      if(t.id==='p10-start'||t.id==='p10-end'){p10SyncAreaPressed();p10RenderPickMap(p10PickItems);}
    });
    // The map lives outside the form on a wide screen, so its clicks and hovers are handled on the document.
    document.addEventListener('click',event=>{
      const dot=event.target.closest&&event.target.closest('#p10-pick-map [data-p10-pick]');if(!dot)return;
      const id=dot.dataset.p10Pick;if(p10Selected.has(id))p10Selected.delete(id);else p10Selected.add(id);
      for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=p10Selected.has(box.value);
      p10RenderSelected();p10PickHot(id,true);
    });
    document.addEventListener('mouseover',event=>{
      const el=event.target.closest&&event.target.closest('#p10-pick-map [data-p10-pick],#p10-wishes label[data-p10-wish]');
      if(el)p10PickHot(el.dataset.p10Pick||el.dataset.p10Wish,true);
      else if(event.target.closest&&!event.target.closest('#p10-pick-map,#p10-wishes'))p10PickHot(null,false);
    });
    form.addEventListener('focusin',event=>{const el=event.target.closest('#p10-wishes label[data-p10-wish]');if(el)p10PickHot(el.dataset.p10Wish,true);});
    form.addEventListener('click',event=>{
      // Only the island and region buttons themselves filter the list (ticking a place must never redraw it).
      const island=event.target.closest('#p10-island button[data-p10-island]');
      const region=event.target.closest('#p10-region button[data-p10-region]');
      const unselect=event.target.closest('[data-p10-unselect]');
      if(unselect){const id=unselect.dataset.p10Unselect;p10Selected.delete(id);const box=[...form.querySelectorAll('[name=p10-wish]')].find(b=>b.value===id);if(box)box.checked=false;p10RenderSelected();return;}
      if(island){p10Filter.island=island.dataset.p10Island;const meta=P10_REGIONS.find(r=>r.id===p10Filter.region);if(meta&&p10Filter.island!=='all'&&meta.island!==p10Filter.island)p10Filter.region='all';p10RenderWishes();}
      if(region&&!region.disabled){p10Filter.region=region.dataset.p10Region;p10RenderWishes();}
    });
    const move=(from,to)=>{const days=p10View.days;const [item]=days.splice(from,1);days.splice(to,0,item);days.forEach((d,n)=>d.n=n+1);p10SaveOrder();p10Show(p10Result);};
    p10$('#planResult').addEventListener('keydown',event=>{
      const card=event.target.closest('[data-p10-index]');
      if(!card||!event.altKey||!p10View)return;
      const i=Number(card.dataset.p10Index);
      if(event.key==='ArrowUp'&&i>0){event.preventDefault();move(i,i-1);}
      if(event.key==='ArrowDown'&&i<p10View.days.length-1){event.preventDefault();move(i,i+1);}
    });
    let p10ResizeTimer=0;
    window.addEventListener('resize',()=>{clearTimeout(p10ResizeTimer);p10ResizeTimer=setTimeout(()=>{const on=p10$('#p10-trip-map [data-p10-map-day][aria-pressed="true"]');if(on)p10FocusDay(on.dataset.p10MapDay);const host=p10$('#p10-pick-map');if(host&&p10PickItems.length){if(Boolean(host.closest('.planner-explainer'))!==p10Wide())p10RenderPickMap(p10PickItems);else p10PickLayout();}},150);});
    p10$('#planResult').addEventListener('dragstart',event=>{const b=event.target.closest('[data-p10-drag]');if(!b)return;event.dataTransfer.setData('text/plain',b.dataset.p10Drag);});
    p10$('#planResult').addEventListener('dragover',event=>{if(event.target.closest('[data-p10-index]'))event.preventDefault();});
    p10$('#planResult').addEventListener('drop',event=>{const card=event.target.closest('[data-p10-index]');if(!card||!p10View)return;event.preventDefault();const from=Number(event.dataTransfer.getData('text/plain'));const to=Number(card.dataset.p10Index);if(!Number.isInteger(from)||from===to)return;move(from,to);});
    const replan=(input,message)=>{p10Restored=false;try{p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));p10Show(p10Result);p10Status(message||'');}catch{p10Status(p10Lang()==='zh'?'请检查出发地、终点和天数。':'Check the start, destination and days.');}};
    p10$('#planResult').addEventListener('click',async event=>{
      const zh=p10Lang()==='zh';
      const focus=event.target.closest('[data-p10-focus],[data-p10-map-day]');if(focus){const day=focus.dataset.p10Focus||focus.dataset.p10MapDay;p10FocusDay(day);if(focus.dataset.p10Focus)p10$('#p10-trip-map')?.scrollIntoView({behavior:'auto',block:'start'});return;}
      if(event.target.closest('[data-p10-editor]')&&p10Result){
        try{sessionStorage.setItem('pounamu-plan-handoff',JSON.stringify({input:p10Result.input}));}catch{}
        location.href=`guide.html?fromPlan=1&lang=${p10Lang()}`;
        return;
      }
      if(event.target.closest('[data-p10-print]')){window.print();return;}
      if(event.target.closest('[data-p10-reset]')){
        try{localStorage.removeItem('p10-road-plan');localStorage.removeItem(P10_ORDER_KEY);}catch{}
        p10Restored=false;p10Selected.clear();for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=false;p10RenderSelected();
        p10$('#p10-start').value='christchurch';p10$('#p10-end').value='queenstown';p10$('#days').value='7';
        p10Result=null;p10View=null;p10Show(null);p10Step(1);p10Status(zh?'已清空，可以重新选择。':'Cleared. Start again.');
        document.getElementById('plannerForm')?.scrollIntoView({behavior:'smooth',block:'start'});return;
      }
      if(event.target.closest('[data-p10-share]')&&p10Result){
        const url=p10ShareUrl(p10Result.input),status=p10$('.p10-share-status');
        let copied=false;
        try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(url);copied=true;}}catch{copied=false;}
        if(!copied){
          const area=document.createElement('textarea');
          area.value=url;area.setAttribute('readonly','');area.style.position='fixed';area.style.left='0';area.style.top='0';area.style.opacity='0';
          document.body.appendChild(area);area.focus();area.select();
          try{copied=document.execCommand('copy');}catch{copied=false;}
          area.remove();
        }
        if(status){
          status.textContent=copied?(zh?'已复制':'Copied'):(zh?'请选中链接再复制':'Select the link, then copy');
          if(!copied){const input=document.createElement('input');input.className='p10-share-url';input.readOnly=true;input.value=url;status.appendChild(input);input.focus();input.select();}
        }
        return;
      }
      const edit=event.target.closest('[data-p10-edit]');
      if(edit){p10Step(3);const more=document.getElementById('p10-more');if(more)more.open=true;document.getElementById('p10-wishes-label')?.scrollIntoView({behavior:'auto',block:'start'});return;}
      if(event.target.closest('[data-p10-adopt]')&&p10Result&&p10Result.suggested){
        for(const id of p10Result.suggested)p10Selected.add(id);
        for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=p10Selected.has(box.value);p10RenderSelected();
        replan({...p10Result.input,wishes:[...p10Selected]},zh?'已把推荐地点加入你的勾选，可以在地点列表或地图上增删。':'The suggested places are now your picks; change them in the list or on the map.');
        return;
      }
      const up=event.target.closest('[data-p10-up]'),down=event.target.closest('[data-p10-down]'),moveto=event.target.closest('[data-p10-moveto]'),dest=event.target.closest('[data-p10-dest]');
      if((up||down||moveto||dest)&&p10View){
        const days=p10View.days;
        if(dest){move(p10View.moveFrom,Number(dest.dataset.p10Dest));return;}
        if(up){const i=Number(up.dataset.p10Up);if(i>0)move(i,i-1);return;}
        if(down){const i=Number(down.dataset.p10Down);if(i<days.length-1)move(i,i+1);return;}
        if(moveto){p10View.moveFrom=Number(moveto.dataset.p10Moveto);const card=moveto.closest('.plan-day');card?.querySelector('.v4-drawer')?.remove();const panel=document.createElement('div');panel.className='v4-drawer';panel.innerHTML=days.map((_,i)=>`<button type="button" data-p10-dest="${i}">${zh?`移到第 ${i+1} 天`:`Move to day ${i+1}`}</button>`).join(' ');card?.querySelector('.p10-day-head')?.after(panel);return;}
      }
      const more=event.target.closest('[data-p10-days]'),trim=event.target.closest('[data-p10-trim]');
      if((more||trim)&&p10Result){
        const drop=new Set(trim?(trim.dataset.p10Drop||'').split(',').filter(Boolean):[]);
        const input=more?{...p10Result.input,days:Number(more.dataset.p10Days)}:{...p10Result.input,wishes:p10Result.input.wishes.filter(id=>!drop.has(id))};
        if(more)p10$('#days').value=String(input.days);
        if(trim){for(const id of drop)p10Selected.delete(id);for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=p10Selected.has(box.value);p10RenderSelected();}
        replan(input);
        return;
      }
      const add=event.target.closest('[data-p10-add]');if(!add||!p10Result)return;
      const ids=add.dataset.p10Add.split(',').filter(Boolean);for(const id of ids)p10Selected.add(id);
      for(const box of form.querySelectorAll('[name=p10-wish]'))box.checked=p10Selected.has(box.value);p10RenderSelected();
      replan({...p10Result.input,wishes:[...new Set([...p10Result.input.wishes,...ids])]},zh?'已加入目的地并重新排行程。':'Stop added; the itinerary has been updated.');
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();const x=p10Text(),methodValue=method.value;
      if(methodValue==='jev'&&!p10$('#jevConsentCheck').checked){p10Status(x.statusConsent);return;}
      const start=p10$('#p10-start').value,end=p10$('#p10-end').value,days=Number(p10$('#days').value),pace=Number(p10$('#p10-pace').value),preference=p10$('#preference').value,car=p10$('#p10-transport').value==='car',wishes=[...p10Selected];
      const input={start,end,days,pace,preference,car,month:p10Month(),stay:p10Stay(),wishes};p10Restored=false;p10Recommendation=null;p10Status('');
      if(methodValue==='jev'){
        const button=form.querySelector('button[type=submit]');button.disabled=true;p10Status(x.loading);
        try{p10Recommendation=await window.TripPlanner.chooseWithJev({days,preference:preference==='easy'?'walk':preference,island:p10JevIsland(start,wishes)});p10Status('');}catch{p10Status(x.error);}finally{button.disabled=false;}
      }
      try{
        p10Result=p10Plan(input);localStorage.setItem('p10-road-plan',JSON.stringify(input));try{localStorage.removeItem(P10_ORDER_KEY);}catch{}
        p10View=null;p10Show(p10Result);
        // Take the visitor to the result they asked for, and put keyboard focus on its heading.
        const result=p10$('#planResult');result?.scrollIntoView({behavior:p10Reduced()?'auto':'smooth',block:'start'});result?.querySelector('.p10-result-title')?.focus({preventScroll:true});
      }catch{p10Status(p10Lang()==='zh'?'请检查出发地、终点和天数。':'Check the start, destination and days.');}
    });
    window.renderP10Planner();
    p10$('#planResult').addEventListener('input', event => { if (!event.target.closest('[data-budget]')) return; p10ReadBudgetForm(); p10PaintBudget(); });
    p10$('#planResult').addEventListener('change', event => {
      if (!event.target.closest('[data-budget]')) return;
      p10ReadBudgetForm(); p10PaintBudget();
      const zh = p10Lang() === 'zh';
      document.querySelectorAll('#planResult .plan-day').forEach((card, i) => { const slot = card.querySelector('.gday-date'); const d = p10View && p10View.days[i]; if (slot && d) slot.outerHTML = p10DateBlock(d.n, zh); });
      try { const u = new URL(location.href); if (globalThis.pounamuBudget && p10BudgetState) { u.searchParams.set('budget', globalThis.pounamuBudget.encodeState(p10BudgetState)); history.replaceState(null, '', u); } } catch { /* keep the page url */ }
    });
    form.addEventListener('click',event=>{
      const step=event.target.closest('[data-p10-step],[data-p10-goto]');
      if(step){event.preventDefault();p10Step(step.dataset.p10Step||step.dataset.p10Goto);return;}
      const area=event.target.closest('[data-p10-area]');
      if(!area)return;
      const pair=P10_AREAS[area.dataset.p10Area]; if(!pair)return;
      p10$('#p10-start').value=pair[0]; p10$('#p10-end').value=pair[1];
      form.querySelectorAll('[data-p10-area]').forEach(b=>b.setAttribute('aria-pressed',b===area?'true':'false'));
      p10FillRank();
    });
    p10Step(saved?3:1);
  };
}

})();
