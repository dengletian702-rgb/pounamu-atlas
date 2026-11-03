// Ready-made trips: whole itineraries a visitor can follow as they are, play on the atlas, or load into the planner.
// Day shapes follow the routes and places in this site's data. Driving hours are rough (NZTA Journey Planner is the
// reference) and are marked to verify.
//
// Costs: ranges per person in CNY, excluding international flights, by travel style. They are built from
// traveller-reported totals in Chinese travel videos and their comments (Nov 2026, see docs/plan-validation.md),
// NOT from quotes, so every figure is shown "To verify / 待核实". 1 NZD ≈ 4.2–4.4 CNY at the time of writing (to verify).

export const STYLES = ['budget', 'comfort', 'tour'];

export const PERSONAS = ['first', 'repeat', 'family', 'elders', 'carfree', 'budget'];

export const ITINERARIES = [
  {
    id: 'south-7', start: 'christchurch', end: 'queenstown', days: 7, island: 'south', personas: ['first', 'budget'],
    title: { en: 'South Island classic, 7 days', zh: '南岛经典 7 天' },
    pitch: { en: 'Lakes, Aoraki and Milford in one week, starting in Christchurch and flying out of Queenstown.', zh: '一周拿下湖泊、库克山和米尔福德峡湾：基督城进，皇后镇出。' },
    cost: { budget: [7000, 10000], comfort: [15000, 22000], tour: [15000, 25000] },
    driveMax: 5, verify: ['cost', 'drive'],
    plan: [
      { title: { en: 'Arrive Christchurch', zh: '抵达基督城' }, routes: [], places: ['chch-gardens'], night: { en: 'Christchurch', zh: '基督城' }, drive: 0 },
      { title: { en: 'Across the plains to Lake Tekapo', zh: '穿过平原到特卡波湖' }, routes: ['mackenzie-route'], places: ['good-shepherd', 'dark-sky'], night: { en: 'Tekapo', zh: '特卡波' }, drive: 3 },
      { title: { en: 'Aoraki/Mount Cook: Hooker Valley', zh: '库克山：胡克谷步道' }, routes: ['hooker-valley'], places: ['tasman-lake'], night: { en: 'Aoraki/Mt Cook Village or Twizel', zh: '库克山村或特威泽尔' }, drive: 1.5 },
      { title: { en: 'To Wānaka, over the Crown Range to Queenstown', zh: '到瓦纳卡，翻皇冠山脉去皇后镇' }, routes: ['crown-range'], places: ['wanaka-tree', 'arrowtown'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 4 },
      { title: { en: 'Milford Sound day (coach & cruise)', zh: '米尔福德峡湾一日（巴士+游船）' }, routes: ['milford-coach'], places: ['milford-cruise'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Queenstown: Skyline, jet boat or a ride', zh: '皇后镇：天空缆车、喷射快艇或骑行' }, routes: ['queenstown-trail'], places: ['skyline-qt', 'shotover-jet'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Fly out of Queenstown', zh: '皇后镇离开' }, routes: [], places: [], night: null, drive: 0 },
    ],
  },
  {
    id: 'south9-north3', start: 'queenstown', end: 'auckland', days: 12, island: 'both', personas: ['first'],
    title: { en: 'South 9 + North 3: the classic loop', zh: '南岛 9 天 + 北岛 3 天 经典环线' },
    pitch: { en: 'The order most first-timers follow: Queenstown and Milford, Aoraki and Tekapo, whales at Kaikōura, then Hobbiton, glowworms and Rotorua.', zh: '多数人第一次的顺序：皇后镇和米尔福德、库克山和特卡波、凯库拉观鲸，再飞北岛看霍比特人村、萤火虫和罗托鲁瓦。' },
    cost: { budget: [12000, 17000], comfort: [25000, 38000], tour: [28000, 40000] },
    driveMax: 5, verify: ['cost', 'drive'],
    plan: [
      { title: { en: 'Arrive Queenstown', zh: '抵达皇后镇' }, routes: [], places: ['skyline-qt'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Milford Sound', zh: '米尔福德峡湾' }, routes: ['milford-coach'], places: ['milford-cruise'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Glenorchy and Arrowtown', zh: '格林诺奇与箭镇' }, routes: [], places: ['glenorchy', 'arrowtown', 'kawarau-bungy'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 2 },
      { title: { en: 'Crown Range to Wānaka', zh: '翻皇冠山脉到瓦纳卡' }, routes: ['crown-range', 'roys-peak'], places: ['wanaka-tree'], night: { en: 'Wānaka', zh: '瓦纳卡' }, drive: 1.5 },
      { title: { en: 'To Aoraki/Mount Cook', zh: '前往库克山' }, routes: ['hooker-valley'], places: ['tasman-lake', 'heli-glacier'], night: { en: 'Aoraki/Mt Cook Village', zh: '库克山村' }, drive: 3 },
      { title: { en: 'Lake Tekapo and the stars', zh: '特卡波湖与星空' }, routes: [], places: ['good-shepherd', 'dark-sky'], night: { en: 'Tekapo', zh: '特卡波' }, drive: 1.5 },
      { title: { en: 'Down to Christchurch', zh: '下到基督城' }, routes: ['mackenzie-route'], places: ['chch-gardens'], night: { en: 'Christchurch', zh: '基督城' }, drive: 3 },
      { title: { en: 'Kaikōura whales', zh: '凯库拉观鲸' }, routes: ['kaikoura-coast'], places: ['whale-watch'], night: { en: 'Kaikōura', zh: '凯库拉' }, drive: 2.5 },
      { title: { en: 'Akaroa and its dolphins', zh: '阿卡罗阿看海豚' }, routes: ['akaroa-road'], places: ['akaroa-dolphins'], night: { en: 'Christchurch', zh: '基督城' }, drive: 4 },
      { title: { en: 'Fly to Auckland; harbour evening', zh: '飞奥克兰，港湾夜景' }, routes: ['devonport-ferry'], places: ['sky-tower'], night: { en: 'Auckland', zh: '奥克兰' }, drive: 0 },
      { title: { en: 'Hobbiton and Waitomo', zh: '霍比特人村与怀托摩萤火虫洞' }, routes: [], places: ['hobbiton', 'waitomo'], night: { en: 'Rotorua', zh: '罗托鲁瓦' }, drive: 4 },
      { title: { en: 'Rotorua, then back to Auckland', zh: '罗托鲁瓦，返回奥克兰' }, routes: ['auckland-taupo'], places: ['te-puia', 'redwoods'], night: null, drive: 3 },
    ],
  },
  {
    id: 'north-8', start: 'auckland', end: 'auckland', days: 8, island: 'north', personas: ['repeat', 'family'],
    title: { en: 'North Island, 8 days beyond Queenstown', zh: '北岛 8 天：皇后镇以外的新西兰' },
    pitch: { en: 'Beaches of the Coromandel, Rotorua’s geothermal valleys, the Tongariro volcanoes and the Forgotten World Highway to Taranaki.', zh: '科罗曼德的海滩、罗托鲁瓦地热、汤加里罗火山，再走遗忘公路到塔拉纳基。' },
    cost: { budget: [8000, 12000], comfort: [16000, 24000], tour: [18000, 28000] },
    driveMax: 5, verify: ['cost', 'drive'],
    plan: [
      { title: { en: 'Auckland harbour and Devonport', zh: '奥克兰港与德文波特' }, routes: ['devonport-ferry'], places: ['sky-tower'], night: { en: 'Auckland', zh: '奥克兰' }, drive: 0 },
      { title: { en: 'Coromandel beaches', zh: '科罗曼德海滩' }, routes: ['coromandel-loop'], places: ['hot-water-beach', 'cathedral-cove'], night: { en: 'Whitianga or Hahei', zh: '惠蒂昂阿或哈黑' }, drive: 3 },
      { title: { en: 'To Rotorua via Blue Spring', zh: '经蓝泉到罗托鲁瓦' }, routes: [], places: ['blue-spring', 'redwoods', 'polynesian-spa'], night: { en: 'Rotorua', zh: '罗托鲁瓦' }, drive: 3.5 },
      { title: { en: 'Geothermal day to Taupō', zh: '地热一日，到陶波' }, routes: ['huka-falls'], places: ['wai-o-tapu', 'huka'], night: { en: 'Taupō', zh: '陶波' }, drive: 1.5 },
      { title: { en: 'Tongariro Alpine Crossing (or Taranaki Falls)', zh: '汤加里罗穿越（或改走塔拉纳基瀑布）' }, routes: ['tongariro-crossing'], places: [], night: { en: 'Tūrangi or National Park', zh: '图朗伊或 National Park' }, drive: 1 },
      { title: { en: 'Forgotten World Highway', zh: '遗忘世界公路' }, routes: ['forgotten-world'], places: [], night: { en: 'New Plymouth', zh: '新普利茅斯' }, drive: 4.5 },
      { title: { en: 'Taranaki coast and Three Sisters', zh: '塔拉纳基海岸与三姐妹岩' }, routes: [], places: ['three-sisters'], night: { en: 'New Plymouth', zh: '新普利茅斯' }, drive: 1.5 },
      { title: { en: 'Fly or drive back to Auckland; Muriwai gannets', zh: '飞回或开回奥克兰；穆里怀塘鹅' }, routes: [], places: ['muriwai-gannets'], night: null, drive: 0 },
    ],
  },
  {
    id: 'south-carfree-7', start: 'christchurch', end: 'queenstown', days: 7, island: 'south', personas: ['carfree', 'elders'],
    title: { en: 'South Island without a car, 7 days', zh: '不开车的南岛 7 天' },
    pitch: { en: 'Train over the Alps, coach through the Mackenzie, cruise Milford — all on public transport and booked tours.', zh: '坐火车翻越南阿尔卑斯山，乘巴士穿过麦肯齐盆地，再去米尔福德坐船，全程公共交通加跟团项目。' },
    cost: { budget: [8000, 11000], comfort: [14000, 20000], tour: [15000, 25000] },
    driveMax: 0, verify: ['cost'],
    plan: [
      { title: { en: 'Christchurch by bus and ferry', zh: '基督城：公交与渡轮' }, routes: ['metro-christchurch'], places: ['chch-gardens'], night: { en: 'Christchurch', zh: '基督城' }, drive: 0 },
      { title: { en: 'TranzAlpine train day', zh: '高山观景火车一日' }, routes: ['tranzalpine'], places: [], night: { en: 'Christchurch', zh: '基督城' }, drive: 0 },
      { title: { en: 'Coach to Queenstown via Tekapo', zh: '乘巴士经特卡波到皇后镇' }, routes: ['intercity-chch-qt'], places: ['good-shepherd'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Queenstown by Orbus: Arrowtown', zh: '乘 Orbus 去箭镇' }, routes: ['orbus-queenstown'], places: ['arrowtown', 'skyline-qt'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Milford Sound coach & cruise', zh: '米尔福德峡湾巴士+游船' }, routes: ['milford-coach'], places: ['milford-cruise'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Jet boat and lakefront', zh: '喷射快艇与湖滨' }, routes: [], places: ['shotover-jet'], night: { en: 'Queenstown', zh: '皇后镇' }, drive: 0 },
      { title: { en: 'Fly out of Queenstown', zh: '皇后镇离开' }, routes: [], places: [], night: null, drive: 0 },
    ],
  },
  {
    id: 'chch-3', start: 'christchurch', end: 'christchurch', days: 3, island: 'south', personas: ['family', 'elders'],
    title: { en: 'Christchurch, Akaroa and Kaikōura, 3 days', zh: '基督城周边 3 天：阿卡罗阿与凯库拉' },
    pitch: { en: 'A relaxed loop with wildlife close at hand: dolphins in a volcanic harbour and whales off a mountain coast.', zh: '轻松的小环线，野生动物近在眼前：火山口海港里的海豚，雪山海岸外的鲸鱼。' },
    cost: { budget: [3000, 4500], comfort: [6000, 9000], tour: [7000, 11000] },
    driveMax: 3, verify: ['cost', 'drive'],
    plan: [
      { title: { en: 'Christchurch, then over the hills to Akaroa', zh: '基督城，翻山到阿卡罗阿' }, routes: ['akaroa-road'], places: ['akaroa-dolphins'], night: { en: 'Akaroa', zh: '阿卡罗阿' }, drive: 1.5 },
      { title: { en: 'North to Kaikōura', zh: '北上凯库拉' }, routes: ['kaikoura-coast'], places: ['whale-watch'], night: { en: 'Kaikōura', zh: '凯库拉' }, drive: 3 },
      { title: { en: 'Back to Christchurch; Bridle Path if the legs allow', zh: '回基督城；体力好可走 Bridle Path' }, routes: ['bridle-path'], places: ['chch-gardens'], night: null, drive: 2.5 },
    ],
  },
];
