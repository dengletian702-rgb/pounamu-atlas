// Practical "before you go" content. Every line cites a key from SOURCES (routes.js); `verify: true` marks
// lines whose official page could not be confirmed on 31 Oct 2026.

export const PREPARE = [
  {
    id: 'china', art: 'booking',
    title: { en: 'Travelling from China', zh: '从中国出发' },
    items: [
      { en: 'With a Chinese passport you normally need a New Zealand visitor visa, applied for online. Allow several weeks.', zh: '持中国护照通常需要办理新西兰访客签证（网上申请），建议预留数周。', src: 'inzVisitor' },
      { en: 'Coming from Australia on an eligible Australian visa? From 3 Nov 2025 a 12-month trial let Chinese passport holders use an NZeTA instead; check whether it is still running.', zh: '持有效澳洲签证、从澳洲出发？2025年11月3日起的12个月试行期内，中国护照可改用 NZeTA，出发前确认试行是否仍在进行。', src: 'inzChinaTrial', verify: true },
      { en: 'Driving: carry your Chinese licence plus an accurate English translation from an NZTA-approved translator. Holders of a Chinese provisional licence may be refused by rental companies.', zh: '自驾：随身携带中国驾照原件和 NZTA 认可译者出具的英文翻译件。中国实习期驾照可能被租车公司拒租。', src: 'nztaTranslators' },
      { en: 'New Zealand drives on the left; roads are narrow and winding, and travel times run longer than maps suggest.', zh: '新西兰靠左行驶，道路窄且多弯，实际用时常比地图估算更长。', src: 'drivesafe' },
      { en: 'Complete the New Zealand Traveller Declaration before you fly.', zh: '登机前填写新西兰旅客申报（NZTD）。', src: 'nztd' },
      { en: 'Biosecurity is strict: declare all food, and clean hiking boots and camping gear before you pack them.', zh: '生物安全检查严格：所有食品都要申报，登山鞋和露营装备打包前要清洗干净。', src: 'mpi' },
    ],
  },
  {
    id: 'weather', art: 'weather',
    title: { en: 'Weather', zh: '天气' },
    items: [
      { en: 'Check the MetService mountains & parks forecast the night before any alpine walk.', zh: '走高山步道前一晚，查看 MetService 山区与国家公园预报。', src: 'metservice' },
      { en: 'Great Walks season: 1 Nov 2026 – 30 Apr 2027 for Milford and Routeburn; Kepler opens 27 Oct 2026.', zh: '大步道季：米尔福德、路特本 2026年11月1日–2027年4月30日；开普勒 2026年10月27日开放。', src: 'docMilford' },
      { en: 'Avalanche risk on the Milford, Routeburn and Kepler tracks can extend into December.', zh: '米尔福德、路特本、开普勒步道的雪崩风险可能延续到12月。', src: 'docRouteburn' },
      { en: 'Hooker Valley gets icy and very slippery in shaded spots in winter.', zh: '冬季胡克谷背阴处结冰、非常滑。', src: 'docHooker' },
      { en: 'Tongariro Alpine Crossing: on hazardous days DOC applies a “Not Recommended Today” advisory based on the Red Crater forecast.', zh: '汤加里罗高山穿越：天气危险时，DOC 会根据红火山口预报发布“今日不建议”提示。', src: 'docTAC' },
      { en: 'Expect wasps and sandflies on Fiordland tracks; carry repellent.', zh: '峡湾地区步道有黄蜂和沙蝇，记得带驱虫剂。', src: 'docRouteburn' },
    ],
  },
  {
    id: 'gear', art: 'gear',
    title: { en: 'Gear', zh: '装备' },
    items: [
      { en: '40–60 litre pack and a 3–4 season sleeping bag for multi-day tracks.', zh: '多日步道：40–60升背包，三到四季睡袋。', src: 'docMilford' },
      { en: 'Two sets of clothes: one to walk in, one dry set for the hut.', zh: '两套衣服：一套走路穿，一套干衣服到小屋换。', src: 'docMilford' },
      { en: 'All your food plus at least two extra days; you cannot buy food on the track.', zh: '全程食物另加至少两天余量，步道上买不到食物。', src: 'docMilford' },
      { en: 'Booking confirmation and ID in a waterproof bag.', zh: '预订确认和证件，装在防水袋里。', src: 'docMilford' },
      { en: 'Microspikes and poles for winter day walks in Aoraki/Mount Cook.', zh: '冬季在库克山走一日步道，带冰爪和登山杖。', src: 'docHooker' },
    ],
  },
  {
    id: 'transport', art: 'transport',
    title: { en: 'Getting around', zh: '交通' },
    items: [
      { en: 'Most visa-waiver visitors need an NZeTA: from NZD $17, allow 72 hours, valid for 2 years.', zh: '多数免签旅客需要 NZeTA：17纽币起，预留72小时，有效期2年。', src: 'nzeta' },
      { en: 'The International Visitor Conservation and Tourism Levy (IVL) is paid with it; check the current amount.', zh: '同时需缴纳国际游客保护与旅游税（IVL），金额以官方为准。', src: 'nzeta', verify: true },
      { en: 'Check road closures, roadworks and cameras on the NZTA Journey Planner before every drive.', zh: '每次自驾前，在 NZTA Journey Planner 查看封路、施工和路况摄像头。', src: 'nztaConditions' },
      { en: 'Interislander’s Wellington–Picton sailing takes 3.5 hours.', zh: 'Interislander 惠灵顿–皮克顿航程3.5小时。', src: 'interislander' },
      { en: 'From Christchurch Airport, Metro routes 3, 8 and 29 run to the city and beyond.', zh: '基督城机场有 Metro 3、8、29 路公交进城及往外。', src: 'metro' },
    ],
  },
  {
    id: 'booking', art: 'booking',
    title: { en: 'Booking', zh: '预订' },
    items: [
      { en: 'DOC Great Walks bookings are open for stays to 30 June 2027.', zh: 'DOC 大步道已开放预订，可订至2027年6月30日的住宿。', src: 'docGreatWalks' },
      { en: 'No valid hut booking can mean a penalty, or being turned away if the hut is full.', zh: '没有有效的小屋预订，可能被罚款；小屋满员时会被拒绝入住。', src: 'docMilford' },
      { en: 'Abel Tasman and Heaphy huts and campsites must be booked all year round.', zh: '亚伯塔斯曼和希菲步道的小屋、营地全年都要预订。', src: 'docAbelTasman' },
      { en: 'Tongariro Alpine Crossing: booking is free and recommended for everyone; it is required to use a shuttle.', zh: '汤加里罗高山穿越：预订免费，建议所有人预订；乘接驳车必须预订。', src: 'docTAC' },
      { en: 'Tongariro Northern Circuit huts and campsites must be booked year-round.', zh: '汤加里罗北环线的小屋和营地全年都须预订。', src: 'docTNC' },
      { en: 'Milford Track transport must be booked ahead; there is no private access to either end.', zh: '米尔福德步道的交通必须提前预订，两端都没有私家车通道。', src: 'docMilford' },
      { en: 'White Horse Hill parking (Hooker Valley): $2.50 per half hour or $25 per day.', zh: 'White Horse Hill 停车（胡克谷）：每半小时2.5纽币或每天25纽币。', src: 'docHooker' },
    ],
  },
];

export const FACTS = [
  { en: 'Emergency: dial 111', zh: '紧急电话：111', src: 'adventuresmart', verify: true },
  { en: 'Tell someone your plans before you head out', zh: '出发前把行程告诉别人', src: 'adventuresmart', verify: true },
  { en: 'Turn back if the weather turns; the track will still be there', zh: '天气变坏就折返，步道不会跑', src: 'docAvalanche' },
];

export const FAQ = [
  {
    q: { en: 'Can I see New Zealand without a car?', zh: '不开车能玩新西兰吗？' },
    a: { en: 'Yes. The Northern Explorer, TranzAlpine and Coastal Pacific trains, InterCity coaches, ferries and track shuttles cover the main hubs. Pick “Car-free” in the planner and it only uses routes reachable that way.', zh: '可以。Northern Explorer、TranzAlpine、Coastal Pacific 火车、InterCity 长途巴士、渡轮和步道接驳覆盖主要枢纽。在行程规划里选「公共交通」，就只会安排能这样到达的线路。' },
  },
  {
    q: { en: 'When can I walk the Great Walks?', zh: '大步道什么时候能走？' },
    a: { en: 'The 2026/27 Great Walks season runs 1 Nov 2026 – 30 Apr 2027 on the Milford and Routeburn (Kepler from 27 Oct). Outside it, these tracks need alpine skills. Abel Tasman, Heaphy and Paparoa are booked year-round.', zh: '2026/27 大步道季：米尔福德、路特本为2026年11月1日–2027年4月30日（开普勒10月27日起）。季外需要高山技能。亚伯塔斯曼、希菲、帕帕罗瓦全年可订。' },
  },
  {
    q: { en: 'Can I walk the Milford Track in either direction?', zh: '米尔福德步道能反着走吗？' },
    a: { en: 'No. DOC says it can only be walked in one direction, over 3 nights and 4 days, from Glade Wharf to Sandfly Point.', zh: '不能。DOC 规定只能单向走，3晚4天，从 Glade 码头到 Sandfly Point。' },
  },
  {
    q: { en: 'How is the trip planner made?', zh: '行程规划是怎么生成的？' },
    a: { en: 'Rules pick routes that fit your month, fitness and modes. A small judging model (Jev by TypeSafe) scores each route against your interests, chooses the best of several feasible plans, and checks the result for time, season and transport. A writer then words it. Treat it as a draft and confirm bookings with the official sources.', zh: '先用规则筛出符合月份、体能和出行方式的线路；再由判断模型 Jev（TypeSafe）给每条线路打分、从几套可行方案中选出最佳，并检查时间、季节和交通是否合理；最后由写作模型成文。请把它当草稿，预订前以官方来源为准。' },
  },
  {
    q: { en: 'Do you keep my data?', zh: '你们会保存我的数据吗？' },
    a: { en: 'No. There are no accounts, cookies or analytics. Saved trips and ticked checklists live only in your own browser; the planner request is processed and forgotten.', zh: '不会。没有账号、Cookie 或统计追踪。保存的行程和勾选的清单只存在你自己的浏览器里；规划请求处理完即丢弃。' },
  },
  {
    q: { en: 'What does “To verify” mean?', zh: '「待核实」是什么意思？' },
    a: { en: 'We only publish facts we could confirm on an official page. Where we could not (on 31 Oct 2026), the value is shown with a “To verify” mark; check the linked source before relying on it.', zh: '我们只发布在官方页面上确认过的信息。2026年10月31日未能确认的数值会标「待核实」，使用前请先查看所附来源。' },
  },
];

export const RESERVED = [
  { id: 'stories', en: 'Traveller stories and corrections', zh: '旅行者投稿与纠错' },
  { id: 'bookings', en: 'Book stays, rental cars and activities', zh: '预订住宿、租车和活动' },
  { id: 'tailored', en: 'Tailor-made trips and local guides', zh: '定制行程与本地向导' },
];
