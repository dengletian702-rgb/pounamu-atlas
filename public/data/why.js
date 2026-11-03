// Why each route and place is recommended — not just its name. Every reason is a checkable fact with a source, or an
// editorial pick that says plainly what it is for. Rules:
// - `tag` says what kind of reason it is (see WHY_TAGS); the first reason is the one shown on cards.
// - `src` is a key of SOURCES (routes.js) or { label, url }.
// - `verify: true` = not yet confirmed word-for-word on the linked page (shown as 待核实). Claims that sources disagree
//   on are dated or softened instead of repeated (e.g. Milford's TripAdvisor ranking is from 2008; Aoraki Mackenzie
//   was the largest dark-sky reserve when designated in 2012). Checked 2 Nov 2026; see docs/WHY-SOURCES.md.

export const WHY_TAGS = {
  heritage: { en: 'World Heritage', zh: '世界遗产' },
  official: { en: 'Official status', zh: '官方认证' },
  award: { en: 'Ranking', zh: '榜单' },
  film: { en: 'Film location', zh: '取景地' },
  record: { en: 'Record', zh: '之最' },
  history: { en: 'History', zh: '历史' },
  pick: { en: 'Editor’s reason', zh: '推荐理由' },
  practical: { en: 'Practical', zh: '实用' },
};

const S = {
  unesco551: { label: 'UNESCO — Te Wahipounamu – South West New Zealand', url: 'https://whc.unesco.org/en/list/551' },
  unesco421: { label: 'UNESCO — Tongariro National Park', url: 'https://whc.unesco.org/en/list/421' },
  baughan: { label: 'Te Ara — Blanche Baughan’s travel writing', url: 'https://teara.govt.nz/en/zoomify/43298/blanche-baughans-travel-writing' },
  ta2008: { label: 'Scoop (2008) — NZ tops Travellers’ Choice awards', url: 'https://www.scoop.co.nz/stories/CU0804/S00312/new-zealand-tops-travellers-choice-awards.htm' },
  darksky: { label: 'DarkSky International (2012 release)', url: 'https://darksky.org/app/uploads/2018/03/IDA-Aoraki-Mackenzie-PR-Final.pdf' },
  bungy: { label: 'NZ History — first commercial bungy', url: 'https://nzhistory.govt.nz/node/57335' },
  hobbiton: { label: 'Hobbiton Movie Set', url: 'https://www.hobbitontours.com/' },
  narnia: { label: 'IMDb — Prince Caspian filming locations', url: 'https://www.imdb.com/title/tt0499448/locations' },
  tepuia: { label: 'Te Puia', url: 'https://www.tepuia.com/' },
  zealandia: { label: 'Zealandia', url: 'https://visitzealandia.com' },
  bluespring: { label: 'South Waikato District Council — Te Waihou Walkway', url: 'https://www.southwaikato.govt.nz/our-district/sport-and-recreation/parks-and-reserves/te-waihou-walkway' },
  albatross: { label: 'DOC — Taiaroa Head Nature Reserve', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/otago-peninsula-area/taiaroa-head-nature-reserve/' },
  hectors: { label: 'DOC — Hector’s dolphin', url: 'https://www.doc.govt.nz/nature/native-animals/marine-mammals/dolphins/hectors-dolphin/' },
  whales: { label: 'Whale Watch Kaikōura', url: 'https://www.whalewatch.co.nz/' },
  penguins: { label: 'Oamaru Blue Penguin Colony', url: 'https://www.penguins.co.nz/' },
  tepapa: { label: 'Te Papa', url: 'https://www.tepapa.govt.nz/' },
  arrowtownChinese: { label: 'DOC — Arrowtown Chinese Settlement', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/arrowtown-chinese-settlement/' },
  middleEarth: { label: 'Tourism New Zealand — Middle-earth', url: 'https://www.newzealand.com/int/feature/middle-earth/' },
  tnzTac: { label: 'Tourism New Zealand — Tongariro Alpine Crossing', url: 'https://www.newzealand.com/int/feature/tongariro-alpine-crossing/' },
  paparoa: { label: 'DOC — Paparoa Track and Pike29 Memorial Track', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/paparoa-national-park/things-to-do/tracks/paparoa-track/' },
  waitangi: { label: 'Waitangi Treaty Grounds', url: 'https://www.waitangi.org.nz/' },
  napier: { label: 'Art Deco Trust, Napier', url: 'https://www.artdeconapier.com/' },
};

const GW = { tag: 'official', en: 'One of DOC’s Great Walks — New Zealand’s premier multi-day tracks', zh: '新西兰保护部（DOC）官方「十大步道 Great Walks」之一', src: 'docGreatWalks' };
const GR = { tag: 'official', en: 'One of the Great Rides of Ngā Haerenga, the official NZ Cycle Trail', zh: '新西兰官方骑行网络「Great Rides」精选骑行道之一', src: 'nzctList' };
const W551 = { tag: 'heritage', en: 'Inside Te Wāhipounamu – South West New Zealand, a UNESCO World Heritage Area', zh: '位于联合国教科文组织世界自然遗产「蒂瓦希普纳姆」范围内', src: S.unesco551 };
const W421 = { tag: 'heritage', en: 'Tongariro National Park: UNESCO World Heritage for both its nature and its Māori cultural meaning', zh: '汤加里罗国家公园：世界自然与文化「双遗产」', src: S.unesco421 };
const DARK = { tag: 'official', en: 'Aoraki Mackenzie International Dark Sky Reserve — first gold-tier reserve, the world’s largest when designated in 2012', zh: '奥拉基麦肯齐国际暗夜保护区：首个金级认证，2012 年设立时为全球最大', src: S.darksky };
const TA = { tag: 'award', en: 'Milford Sound topped TripAdvisor’s 2008 Travellers’ Choice destinations list', zh: '米尔福德峡湾曾登 TripAdvisor 2008 年「旅行者之选」全球目的地第一', src: S.ta2008 };
const CARFREE = (en, zh) => ({ tag: 'practical', en, zh });
const PICK = (en, zh, extra = {}) => ({ tag: 'pick', en, zh, ...extra });

export const WHY = {
  // ── South Island: walks ─────────────────────────────────────────────
  'milford-track': [
    { tag: 'award', en: 'Known since 1908 as “the finest walk in the world” (London Spectator, Blanche Baughan)', zh: '1908 年起被称为「世界上最美的步道」（伦敦《旁观者》杂志）', src: S.baughan },
    GW, W551,
  ],
  'routeburn-track': [GW, W551, PICK('Alpine views in 2–3 days, linking Fiordland and Mount Aspiring national parks', '两三天穿越峡湾与阿斯帕林山两座国家公园的高山景观')],
  'kepler-track': [GW, PICK('A loop that starts 5 km from Te Anau — no transport to arrange at either end', '起点距蒂阿瑙仅 5 公里的环线，不用安排两头接驳'), W551],
  'abel-tasman': [GW, { tag: 'record', en: 'Abel Tasman is New Zealand’s smallest national park — golden beaches, water taxis both ways', zh: '新西兰面积最小的国家公园：金色沙滩，可坐水上的士进出', src: 'docAbelTasman', verify: true }],
  'heaphy-track': [GW, PICK('From beech forest and tussock tops down to nīkau-palm beaches; open to bikes in winter', '从山毛榉林、高山草甸一路走到海边棕榈林；冬季还开放骑行')],
  'paparoa-track': [GW, { tag: 'history', en: 'The newest Great Walk (opened 2019), built in memory of the 29 men lost at Pike River', zh: '最新的 Great Walk（2019 年开放），为纪念派克河矿难 29 名遇难者而建', src: S.paparoa }],
  'rakiura-track': [GW, PICK('On Stewart Island, one of the few places to see kiwi in the wild', '在斯图尔特岛，少数有机会看到野生几维鸟的地方之一', { verify: true })],
  'hooker-valley': [
    { tag: 'record', en: 'Ends at a glacier lake under Aoraki/Mount Cook, New Zealand’s highest mountain (3,724 m)', zh: '终点是新西兰最高峰库克山（3724 米）脚下的冰川湖', src: 'docHooker' },
    W551, PICK('Flat, three hours return, three swing bridges — the easiest big-mountain walk in NZ', '平路往返约 3 小时、过 3 座吊桥，最容易走的雪山步道'),
  ],
  'roys-peak': [PICK('The classic panorama over Lake Wānaka seen on countless posts — a hard 16 km climb for it', '社交平台上最常见的瓦纳卡湖全景就在这里；代价是 16 公里陡坡'), CARFREE('Closed 1 Oct – 10 Nov for lambing; Isthmus Peak is the alternative', '每年 10 月 1 日至 11 月 10 日产羔季关闭，可改走 Isthmus Peak')],
  'avalanche-peak': [PICK('The summit day in Arthur’s Pass — kea, scree and a view over the main divide', '亚瑟山口最经典的登顶日：啄羊鹦鹉、碎石坡、南阿尔卑斯主脊全景')],
  'key-summit': [W551, PICK('The best short taste of the Routeburn: alpine tarns and Fiordland peaks in 3 hours', '3 小时尝到 Routeburn 的精华：高山小湖与峡湾群峰')],
  'lake-gunn': [W551, PICK('A 45-minute red-beech forest loop right off the Milford Road — a good leg-stretch', '米尔福德公路旁 45 分钟的红山毛榉林环线，适合半路下车走走')],
  'bridle-path': [{ tag: 'history', en: 'The track Canterbury’s first settlers walked over from Lyttelton in 1850', zh: '1850 年坎特伯雷第一批移民从利特尔顿港翻山走的就是这条路', verify: true }],
  'lake-matheson': [PICK('The “mirror lake”: on a still morning it reflects Aoraki and Mount Tasman', '「镜湖」：无风的清晨倒映库克山与塔斯曼山'), W551],
  'devils-punchbowl': [{ tag: 'record', en: 'A 131 m waterfall, an hour return from Arthur’s Pass village', zh: '131 米高的瀑布，从亚瑟山口村往返仅约 1 小时', verify: true }],

  // ── South Island: rides ─────────────────────────────────────────────
  'otago-rail-trail': [GR, { tag: 'history', en: 'The first of New Zealand’s rail trails (opened 2000), on an old gold-fields railway', zh: '新西兰第一条铁路改建骑行道（2000 年开放），沿着淘金时代的旧铁路', verify: true }, PICK('Gentle gradients and pub stops — the easiest multi-day ride', '坡度平缓、沿途有老酒馆，最容易的多日骑行')],
  'alps-2-ocean': [GR, { tag: 'record', en: 'From the foot of Aoraki/Mount Cook to the Pacific at Ōamaru — the longest continuous Great Ride', zh: '从库克山脚一路骑到奥马鲁海边，最长的连续 Great Ride', verify: true }],
  'west-coast-wilderness': [GR, PICK('Rainforest, gold-era water races and the wild Tasman coast', '雨林、淘金时代的引水渠和狂野的塔斯曼海岸')],
  'queenstown-trail': [GR, PICK('Links Arrowtown, the Kawarau bungy bridge and Gibbston wineries', '串起箭镇、卡瓦劳蹦极桥和吉布斯顿酒庄')],
  'around-the-mountains': [GR, PICK('Quiet farm roads from Walter Peak, reached by the TSS Earnslaw steamship', '乘百年蒸汽船 TSS Earnslaw 到 Walter Peak 出发，沿安静的牧场小路骑行')],
  'great-taste-trail': [GR, PICK('Food, wine and beaches around Nelson — the most relaxed Great Ride', '纳尔逊一带的美食、酒庄和海滩，最悠闲的 Great Ride')],
  'old-ghost-road': [GR, { tag: 'history', en: 'Follows a gold-miners’ road from the 1870s that was never finished', zh: '沿着 1870 年代没修完的淘金者道路', verify: true }],
  'queen-charlotte-bike': [GR, PICK('Ridge-top views over the Marlborough Sounds, with boats carrying your bags', '山脊俯瞰马尔堡峡湾，行李可由船送')],
  'lake-dunstan': [GR, { tag: 'record', en: 'Opened 2021, with a boardwalk bolted to the cliffs of the Cromwell Gorge', zh: '2021 年开通，有一段栈道直接挂在克伦威尔峡谷崖壁上', src: 'nzctLDT', verify: true }],
  'heaphy-bike': [GW, CARFREE('One of the few Great Walks open to mountain bikes — in winter only', '少数允许山地车的 Great Walk，仅限冬季')],

  // ── South Island: drives ────────────────────────────────────────────
  'milford-road': [W551, TA, PICK('Mirror Lakes, the Homer Tunnel and the Chasm on the only road into Milford Sound', '通往米尔福德峡湾的唯一公路：镜湖、荷马隧道、峡谷瀑布')],
  'mackenzie-route': [DARK, PICK('Lake Tekapo and Lake Pukaki’s glacier-blue water, with Aoraki ahead', '特卡波湖、普卡基湖的冰川牛奶蓝，库克山就在前方')],
  'haast-pass': [W551, PICK('Blue Pools and waterfalls on the link from Wānaka to the West Coast', '从瓦纳卡到西海岸，途经蓝池和一串瀑布')],
  'glacier-coast': [W551, PICK('Franz Josef and Fox glaciers come down almost to the rainforest', '弗朗茨约瑟夫和福克斯冰川几乎伸进雨林')],
  'arthurs-pass': [PICK('Crosses the Southern Alps over the Ōtira Viaduct; kea at the lookout', '经奥蒂拉高架桥翻越南阿尔卑斯山，观景台常有啄羊鹦鹉')],
  'kaikoura-coast': [{ tag: 'history', en: 'Rebuilt after the 2016 Kaikōura earthquake; seals beside the road', zh: '2016 年凯库拉大地震后重建的海岸公路，路边就能看到海豹', src: 'nztaConditions', verify: true }],
  'southern-scenic': [PICK('The Catlins: Nugget Point lighthouse, Curio Bay fossil forest, few crowds', '卡特林斯：纽盖特角灯塔、古里奥湾化石森林，游客少')],
  'crown-range': [{ tag: 'record', en: 'New Zealand’s highest main sealed road (about 1,076 m)', zh: '新西兰海拔最高的主干柏油公路（约 1076 米）', verify: true }],
  'akaroa-road': [{ tag: 'history', en: 'Akaroa: a harbour village founded by French settlers in 1840', zh: '阿卡罗阿：1840 年法国移民建立的海港小镇', verify: true }, { tag: 'record', en: 'Harbour cruises meet Hector’s dolphins, among the world’s smallest dolphins', zh: '港湾游船可见世界上体型最小的海豚之一，赫氏海豚', src: S.hectors }],
  'golden-bay': [PICK('Over marble Takaka Hill to Te Waikoropupū Springs, some of the clearest water ever measured', '翻过大理石山到 Te Waikoropupū 泉，水质透明度世界罕见', { verify: true })],

  // ── South Island: car-free ──────────────────────────────────────────
  tranzalpine: [{ tag: 'award', en: 'Often listed among the world’s great train journeys — coast to coast across the Southern Alps', zh: '常被列为世界最美火车线路之一：横穿南阿尔卑斯山，东西海岸一日往返', src: 'gjTranzAlpine', verify: true }, CARFREE('No car needed: Christchurch to Greymouth in about 5 hours', '不用开车：基督城到格雷茅斯约 5 小时')],
  'coastal-pacific': [PICK('Rides between snow-capped ranges and the sea past Kaikōura', '列车在雪山和大海之间穿过凯库拉'), CARFREE('Christchurch–Picton, linking to the ferry north', '基督城到皮克顿，衔接去北岛的渡轮')],
  'cook-strait': [CARFREE('The link between the islands; three hours, half of it through the Marlborough Sounds', '连接南北岛的唯一渡轮，3 小时，一半航程在马尔堡峡湾中')],
  'intercity-chch-qt': [CARFREE('The cheapest way between the two main South Island airports, via Tekapo', '南岛两大机场之间最省钱的走法，途经特卡波')],
  'milford-coach': [TA, W551, CARFREE('Coach and cruise from Queenstown — no 8-hour return drive for the driver', '皇后镇巴士+游船，司机不用自己开 8 小时往返')],
  'westcoast-coach': [CARFREE('The whole West Coast to the glaciers by scheduled coach', '乘定期巴士走完西海岸直到冰川')],
  'stewart-ferry': [CARFREE('The only scheduled passenger ferry to Rakiura/Stewart Island', '前往斯图尔特岛的唯一定期客运渡轮'), PICK('Starts from Bluff, the southern end of State Highway 1', '从一号国道最南端的布拉夫出发')],
  'orbus-queenstown': [CARFREE('Flat-fare buses to Arrowtown and Frankton — Queenstown without a car', '去箭镇、弗兰克顿的公交统一票价，在皇后镇不用车')],
  'metro-christchurch': [CARFREE('The Diamond Harbour ferry is part of the city bus network', '钻石港渡轮属于城市公交网络，一张卡就能坐')],
  'orbus-dunedin': [CARFREE('Bus out along the Otago Peninsula towards the albatross and penguins', '坐公交沿奥塔哥半岛去看信天翁和企鹅')],
  'picton-nelson-coach': [CARFREE('Ferry to Nelson without a car, via the Marlborough wine country', '下渡轮直接坐车去纳尔逊，途经马尔堡酒乡')],
  'queenstown-teanau-coach': [CARFREE('Te Anau is the base for Milford and the Kepler; this coach gets you there', '蒂阿瑙是去米尔福德和开普勒步道的大本营，坐这班车就能到')],
  'dunedin-christchurch-coach': [CARFREE('Down the coast past Ōamaru and the Moeraki Boulders', '沿海岸经奥马鲁和摩拉基大圆石')],

  // ── North Island ────────────────────────────────────────────────────
  'tongariro-crossing': [
    { tag: 'award', en: 'Widely rated New Zealand’s best one-day walk', zh: '公认「新西兰最佳一日徒步」', src: S.tnzTac, verify: true },
    W421,
    { tag: 'film', en: 'Mount Ngāuruhoe beside the track stood in for Mount Doom in The Lord of the Rings', zh: '步道旁的瑙鲁霍伊火山是《指环王》「末日火山」的取景原型', src: S.middleEarth, verify: true },
  ],
  'tongariro-northern-circuit': [GW, W421],
  'pouakai-crossing': [PICK('The tarn where Taranaki is reflected — one of the most photographed views in the North', '可拍到塔拉纳基山倒影的高山小湖，北岛最出片的地方之一')],
  waikaremoana: [GW, PICK('Lakeside forest in Te Urewera, the ancestral home of Ngāi Tūhoe', '泰乌雷韦拉的湖畔原始森林，图霍伊部落的祖地')],
  'timber-trail': [GR, { tag: 'record', en: 'Dozens of suspension bridges; the longest, Maramataha, spans 141 m', zh: '几十座吊桥，最长的 Maramataha 桥跨度 141 米', src: 'nzctTimber', verify: true }],
  'great-lake-trail': [GR, PICK('Along Lake Taupō, New Zealand’s largest lake', '沿新西兰最大的湖泊陶波湖骑行')],
  'hauraki-rail-trail': [GR, PICK('Flat almost all the way — the easiest Great Ride, through the Karangahake Gorge', '几乎全程平路，最容易的 Great Ride，穿过卡兰加哈克峡谷')],
  'mountains-to-sea': [GR, PICK('From Ruapehu to the Tasman, past the Bridge to Nowhere', '从鲁阿佩胡火山骑到塔斯曼海，途经「无路之桥」')],
  'desert-road': [W421, PICK('Three volcanoes from the road — Ruapehu, Ngāuruhoe, Tongariro', '车窗外就是三座火山：鲁阿佩胡、瑙鲁霍伊、汤加里罗')],
  'forgotten-world': [{ tag: 'history', en: 'Through Whangamōmona, a village that declared itself a “republic” in 1989', zh: '途经 1989 年自封「共和国」的小村旺阿莫莫纳', verify: true }, PICK('Gorges, a one-lane tunnel and 12 km of gravel — the North’s most remote drive', '峡谷、单车道隧道、12 公里碎石路，北岛最荒僻的公路')],
  'auckland-taupo': [PICK('The classic first-timer line: Hobbiton, Rotorua’s geysers, Huka Falls', '第一次去北岛的经典路线：霍比特人村、罗托鲁瓦地热、胡卡瀑布')],
  'northern-explorer': [{ tag: 'record', en: 'Climbs the Raurimu Spiral, a famous loop of railway engineering', zh: '经过著名的铁路工程奇观「劳里穆螺旋线」', src: 'gjNorthern', verify: true }, CARFREE('Auckland to Wellington in a day without driving', '一天之内从奥克兰到惠灵顿，不用开车')],
  rangitoto: [{ tag: 'record', en: 'Auckland’s youngest volcano, about 600 years old — a 25-minute ferry away', zh: '奥克兰最年轻的火山，约 600 岁，坐船 25 分钟就到', verify: true }],
  'taranaki-falls': [W421, PICK('A 20 m waterfall on a 2-hour loop from Whakapapa Village', '从 Whakapapa 村出发 2 小时环线看 20 米瀑布')],
  'huka-falls': [PICK('Free riverside path to Huka Falls, where the Waikato is squeezed into a narrow gorge', '免费河畔步道走到胡卡瀑布，看怀卡托河冲进窄峡')],
  'mount-manaia': [PICK('A short, steep climb to rock pinnacles above Whangārei Harbour', '短而陡，登上俯瞰旺阿雷港的岩峰')],
  rotopounamu: [W421, PICK('An easy forest lake loop — the gentle option if the Crossing is closed', '轻松的森林湖环线，汤加里罗穿越关闭时的好替代')],
  'escarpment-track': [PICK('Cliff-edge stairs and swing bridges above the sea and railway, near Wellington', '惠灵顿附近，悬崖边的台阶和吊桥，脚下是大海和铁路')],
  'remutaka-rail-trail': [GR, { tag: 'history', en: 'Rail tunnels from the 1870s Remutaka Incline railway', zh: '穿过 1870 年代雷穆塔卡坡道铁路留下的隧道', verify: true }],
  'twin-coast-trail': [GR, PICK('Coast to coast across Northland, from the Pacific side to the Hokianga', '横穿北部地区，从太平洋岸骑到霍基昂加港')],
  'motu-dunes': [GR, PICK('Flat coastal dune path out of Ōpōtiki — an easy family ride', '奥波蒂基出发的平坦沙丘海岸路，适合全家')],
  'northland-loop': [{ tag: 'history', en: 'Waitangi, where the Treaty of Waitangi was first signed in 1840', zh: '怀唐伊：1840 年《怀唐伊条约》首次签署地', src: S.waitangi }, PICK('Tāne Mahuta, the largest living kauri tree, on the west coast', '西海岸有现存最大的贝壳杉「森林之神」', { verify: true })],
  'coromandel-loop': [{ tag: 'film', en: 'Cathedral Cove was a filming location for The Chronicles of Narnia: Prince Caspian', zh: '教堂湾是《纳尼亚传奇：凯斯宾王子》的取景地', src: S.narnia }, PICK('Hot Water Beach: dig your own hot pool at low tide', '热水海滩：退潮时自己挖个温泉池')],
  'volcanic-loop': [W421, PICK('A full loop round the three volcanoes of the central plateau', '绕中央高原三座火山一整圈')],
  martinborough: [PICK('Wairarapa wine villages an hour over the hill from Wellington', '从惠灵顿翻山一小时就到怀拉拉帕酒乡')],
  'wellington-napier': [{ tag: 'history', en: 'Napier, rebuilt in Art Deco style after the 1931 earthquake', zh: '内皮尔：1931 年地震后整体重建的装饰艺术风格城市', src: S.napier }],
  'rotorua-taupo-coach': [CARFREE('Rotorua to Taupō in about an hour by coach', '罗托鲁瓦到陶波坐巴士约 1 小时')],
  'kapiti-rail': [CARFREE('Commuter trains up the Kāpiti Coast — beaches without a car', '坐通勤火车去卡皮蒂海岸，不开车也能看海')],
  'devonport-ferry': [CARFREE('A 12-minute ferry to a seaside village and two volcanic lookouts', '坐 12 分钟渡轮到海边小镇，登两座火山观景')],
  'auckland-paihia': [CARFREE('To the Bay of Islands and Waitangi by coach', '坐巴士去岛屿湾和怀唐伊')],
};

export const WHY_PLACE = {
  'sky-tower': [{ tag: 'record', en: 'At 328 m, the tallest freestanding structure in the Southern Hemisphere when it opened in 1997', zh: '高 328 米，1997 年建成时是南半球最高的独立建筑', verify: true }],
  'muriwai-gannets': [PICK('Thousands of gannets nest on the cliffs, a few metres from the viewing platforms', '数千只塘鹅在崖顶筑巢，离观景台只有几米')],
  hobbiton: [{ tag: 'film', en: 'The Shire set from The Lord of the Rings and The Hobbit trilogies', zh: '《指环王》《霍比特人》三部曲中「夏尔」的实景片场', src: S.hobbiton }],
  waitomo: [PICK('Boat ride under a ceiling of glowworms, a species found only in New Zealand', '坐船穿过满顶萤火虫的洞穴，这种萤火虫只在新西兰'), { tag: 'history', en: 'Tours have run since 1889', zh: '自 1889 年起开放游览', verify: true }],
  'blue-spring': [{ tag: 'record', en: 'Spring water so clear it supplies a large share of NZ’s bottled water (the council says about 70%)', zh: '泉水清澈见底，据当地政府介绍新西兰约七成瓶装水来自这一带', src: S.bluespring }],
  redwoods: [PICK('A treetop walk among 100-year-old Californian redwoods, lit with lanterns at night', '在百年加州红杉间的树顶栈道漫步，夜晚有灯笼')],
  'wai-o-tapu': [PICK('The orange-rimmed Champagne Pool and the morning Lady Knox Geyser', '橙边的香槟池和每天上午的诺克斯夫人间歇泉')],
  'te-puia': [{ tag: 'record', en: 'Home of Pōhutu, the largest active geyser in the Southern Hemisphere (up to ~30 m)', zh: '南半球最大的活跃间歇泉 Pōhutu 所在地（喷高约 30 米）', src: S.tepuia }, { tag: 'history', en: 'Māori arts and carving school on site', zh: '园内有毛利传统雕刻与编织学校', src: S.tepuia }],
  'polynesian-spa': [PICK('Hot mineral pools on the edge of Lake Rotorua', '罗托鲁瓦湖畔的矿物温泉')],
  'cathedral-cove': [{ tag: 'film', en: 'Filming location for The Chronicles of Narnia: Prince Caspian', zh: '《纳尼亚传奇：凯斯宾王子》取景地', src: S.narnia }],
  'hot-water-beach': [PICK('Dig your own hot pool in the sand within two hours of low tide', '退潮前后两小时，在沙滩上自己挖温泉')],
  huka: [PICK('The Waikato, New Zealand’s longest river, forced through a gorge 15 m wide', '新西兰最长的怀卡托河挤进 15 米宽的峡谷', { verify: true })],
  'three-sisters': [PICK('Sea stacks you can walk to only at low tide', '只有退潮时才能走近的海蚀柱')],
  'te-papa': [{ tag: 'official', en: 'New Zealand’s national museum — general entry is free', zh: '新西兰国家博物馆，常设展免费', src: S.tepapa }],
  'cable-car': [{ tag: 'history', en: 'Running since 1902, from Lambton Quay up to the Botanic Garden', zh: '1902 年运营至今，从市中心直达植物园', verify: true }],
  zealandia: [{ tag: 'record', en: 'Calls itself the world’s first fully fenced urban ecosanctuary (opened 1999)', zh: '自称全球第一个全围栏城市生态保护区（1999 年开放）', src: S.zealandia }],
  'chch-gardens': [PICK('Punting on the Avon past gardens founded in 1863', '在雅芳河撑篙游船，两岸是 1863 年建的植物园', { verify: true })],
  'akaroa-dolphins': [{ tag: 'record', en: 'Hector’s dolphins: among the smallest dolphins in the world, found only in NZ', zh: '赫氏海豚：世界上最小的海豚之一，只生活在新西兰', src: S.hectors }],
  'whale-watch': [{ tag: 'record', en: 'Sperm whales feed off Kaikōura through the year; the company is owned by local Māori (Ngāti Kurī)', zh: '凯库拉外海全年可见抹香鲸；观鲸公司由当地毛利部落经营', src: S.whales, verify: true }],
  'good-shepherd': [{ tag: 'history', en: 'A stone church from 1935 on the shore of Lake Tekapo', zh: '1935 年建在特卡波湖畔的石砌小教堂', verify: true }, DARK],
  'dark-sky': [DARK],
  'tasman-lake': [{ tag: 'record', en: 'Icebergs from the Tasman Glacier, New Zealand’s longest glacier', zh: '湖上漂着来自新西兰最长冰川，塔斯曼冰川的冰山', verify: true }, W551],
  'heli-glacier': [W551, PICK('Land on the snowfield above Franz Josef or Fox glacier', '直升机降落在弗朗茨约瑟夫或福克斯冰川上方的雪原')],
  'wanaka-tree': [PICK('#ThatWanakaTree — a lone willow in the lake, one of NZ’s most photographed trees', '「瓦纳卡孤独树」：长在湖里的柳树，新西兰最常被拍的树之一', { verify: true })],
  'skyline-qt': [PICK('The fastest way up to the classic view over Queenstown and The Remarkables', '最快登上能俯瞰皇后镇和卓越山的观景台')],
  'shotover-jet': [{ tag: 'history', en: 'Jet-boating the Shotover canyons since 1965', zh: '自 1965 年起在沙特奥沃峡谷开喷射快艇', verify: true }],
  'kawarau-bungy': [{ tag: 'record', en: 'Where commercial bungy jumping began, in 1988 (43 m)', zh: '1988 年商业蹦极从这里起步（43 米）', src: S.bungy, verify: true }],
  arrowtown: [{ tag: 'history', en: 'A gold-rush town with a restored Chinese miners’ settlement', zh: '淘金小镇，保存着当年华人矿工的聚居遗址', src: S.arrowtownChinese }, PICK('Best in April when the trees turn gold', '四月满街金黄秋色最美')],
  glenorchy: [{ tag: 'film', en: 'The valleys around Glenorchy appear in The Lord of the Rings', zh: '格林诺奇周边山谷是《指环王》多处取景地', src: S.middleEarth, verify: true }],
  'milford-cruise': [TA, W551],
  'te-anau-glowworms': [W551, PICK('Reached by boat across Lake Te Anau; glowworms in a living cave system', '乘船横渡蒂阿瑙湖进入仍在形成中的萤火虫洞')],
  'oamaru-penguins': [{ tag: 'record', en: 'Little penguins — the world’s smallest penguin — come ashore at dusk', zh: '世界上最小的企鹅，小蓝企鹅，每晚黄昏上岸', src: S.penguins }],
  moeraki: [PICK('Giant spherical boulders on the beach, millions of years in the making', '海滩上的巨型圆石，形成历时数百万年', { verify: true })],
  albatross: [{ tag: 'record', en: 'Taiaroa Head: the only mainland breeding colony of royal albatross in the world', zh: '泰阿罗阿角：全球唯一在大陆上繁殖的皇家信天翁群落', src: S.albatross }],
  'pancake-rocks': [PICK('Layered limestone stacks and blowholes in Paparoa National Park', '帕帕罗瓦国家公园的千层饼岩与喷水洞')],
  'hokitika-gorge': [PICK('Turquoise glacial water under a swing bridge — the colour is real', '吊桥下的蓝绿色冰川水，颜色是真的')],
  wharariki: [PICK('Dunes, seal pups and the Archway Islands at the north tip of the South Island', '南岛最北端：沙丘、小海豹和拱门群岛')],
  bluff: [PICK('The signpost at the southern end of State Highway 1', '一号国道最南端的路标')],
};
