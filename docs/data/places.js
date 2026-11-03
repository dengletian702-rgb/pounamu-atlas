// Places and experiences: the spots travellers search for by name, shown as a layer on the atlas and used by the
// itinerary templates. Chosen from what Chinese-language travel videos and their comments ask about most (Nov 2026,
// see docs/plan-validation.md), cross-checked against the operator or managing agency.
// Rules: `price` is a band only ('free' | 'paid' | 'tour'); exact prices change and are never stated. `weather` is how
// much the experience depends on the day ('high' = may be cancelled or much worse in bad weather). Anything not yet
// confirmed on the linked page is listed in `verify`. Coordinates are approximate, for the illustrated map only.

export const PLACE_KINDS = ['nature', 'wildlife', 'culture', 'thrill', 'city'];

export const PLACES = [
  // ── North Island ──────────────────────────────────────────────────────────
  {
    id: 'sky-tower', kind: 'city', island: 'north', at: [-36.848, 174.762], price: 'paid', booking: false, weather: 'mid', hours: 1.5,
    name: { en: 'Sky Tower, Auckland', zh: '奥克兰天空塔' },
    note: { en: 'City and harbour views from the observation decks; best on a clear evening.', zh: '观景台俯瞰城市与港湾，晴朗傍晚最好。' },
    src: { label: 'SkyCity — Sky Tower', url: 'https://www.skycityauckland.co.nz/sky-tower/' }, verify: ['hours'],
  },
  {
    id: 'muriwai-gannets', kind: 'wildlife', island: 'north', at: [-36.83, 174.425], price: 'free', booking: false, weather: 'mid', hours: 2,
    name: { en: 'Muriwai gannet colony', zh: '穆里怀塘鹅栖息地' },
    note: { en: 'Takapu/gannets nest on the clifftops beside a black-sand beach, about an hour west of Auckland. Most active in the warmer months.', zh: '奥克兰以西约一小时，黑沙滩旁的崖顶是塘鹅繁殖地，温暖月份最热闹。' },
    src: { label: 'Auckland Council — Regional parks', url: 'https://www.aucklandcouncil.govt.nz/parks-recreation/' }, verify: ['note'],
  },
  {
    id: 'hobbiton', kind: 'culture', island: 'north', at: [-37.858, 175.68], price: 'tour', booking: true, weather: 'low', hours: 2.5,
    name: { en: 'Hobbiton Movie Set, Matamata', zh: '霍比特人村（玛塔玛塔）' },
    note: { en: 'Guided tours only, so book ahead. Travellers split on it: a highlight for film fans, “just small houses” for others.', zh: '只能跟导览参观，需提前预订。评价两极：影迷必去，非影迷觉得“就是几个小房子”。' },
    src: { label: 'Hobbiton Movie Set Tours', url: 'https://www.hobbitontours.com/' }, verify: [],
  },
  {
    id: 'waitomo', kind: 'nature', island: 'north', at: [-38.261, 175.104], price: 'tour', booking: true, weather: 'low', hours: 2,
    name: { en: 'Waitomo Glowworm Caves', zh: '怀托摩萤火虫洞' },
    note: { en: 'Boat ride under glowworms in the dark. A good bad-weather choice. Photography rules inside are strict.', zh: '在黑暗中乘船看萤火虫，雨天也能去；洞内拍照限制严格。' },
    src: { label: 'Waitomo Glowworm Caves', url: 'https://www.waitomo.com/' }, verify: ['note'],
  },
  {
    id: 'blue-spring', kind: 'nature', island: 'north', at: [-38.0, 175.82], price: 'free', booking: false, weather: 'high', hours: 1.5,
    name: { en: 'Te Waihou Walkway & Blue Spring', zh: '蓝泉（Te Waihou 步道）' },
    note: { en: 'Clear blue spring water along a riverside walk. Go on a bright day — under cloud the colour is much duller. Swimming is not allowed.', zh: '沿河步道，泉水清澈湛蓝。要挑晴天去，阴天颜色差很多。禁止下水。' },
    src: { label: 'South Waikato District Council', url: 'https://www.southwaikato.govt.nz/' }, verify: ['note'],
  },
  {
    id: 'redwoods', kind: 'nature', island: 'north', at: [-38.157, 176.275], price: 'paid', booking: false, weather: 'low', hours: 1.5,
    name: { en: 'Redwoods Treewalk, Rotorua', zh: '罗托鲁瓦红木森林树冠步道' },
    note: { en: 'Suspended bridges between giant redwoods; lit with lanterns after dark. The forest walks around it are free.', zh: '巨杉之间的吊桥步道，夜间有灯笼照明；周边森林步道免费。' },
    src: { label: 'Redwoods Treewalk', url: 'https://www.treewalk.co.nz/' }, verify: [],
  },
  {
    id: 'wai-o-tapu', kind: 'nature', island: 'north', at: [-38.358, 176.369], price: 'paid', booking: false, weather: 'low', hours: 2,
    name: { en: 'Wai-O-Tapu Thermal Wonderland', zh: '怀奥塔普地热公园' },
    note: { en: 'Coloured pools such as the Champagne Pool, between Rotorua and Taupō. Lady Knox Geyser is triggered once each morning.', zh: '罗托鲁瓦与陶波之间，香槟池等彩色地热池；诺克斯夫人间歇泉每天早上定时喷发一次。' },
    src: { label: 'Wai-O-Tapu Thermal Wonderland', url: 'https://www.waiotapu.co.nz/' }, verify: [],
  },
  {
    id: 'te-puia', kind: 'culture', island: 'north', at: [-38.163, 176.25], price: 'tour', booking: true, weather: 'low', hours: 2.5,
    name: { en: 'Te Puia, Rotorua', zh: '蒂普亚（罗托鲁瓦毛利文化村）' },
    note: { en: 'Māori arts and crafts institute, the Pōhutu geyser and cultural performances.', zh: '毛利艺术与工艺学院、波胡图间歇泉与文化表演。' },
    src: { label: 'Te Puia', url: 'https://www.tepuia.com/' }, verify: [],
  },
  {
    id: 'polynesian-spa', kind: 'culture', island: 'north', at: [-38.137, 176.258], price: 'paid', booking: false, weather: 'low', hours: 1.5,
    name: { en: 'Polynesian Spa, Rotorua', zh: '罗托鲁瓦波利尼西亚温泉' },
    note: { en: 'Geothermal pools on the lakefront; an easy evening after a day on the road.', zh: '湖畔地热温泉，自驾一天后晚上去放松。' },
    src: { label: 'Polynesian Spa', url: 'https://www.polynesianspa.co.nz/' }, verify: [],
  },
  {
    id: 'cathedral-cove', kind: 'nature', island: 'north', at: [-36.828, 175.79], price: 'free', booking: false, weather: 'high', hours: 2.5,
    name: { en: 'Cathedral Cove / Mautohe', zh: '教堂湾' },
    note: { en: 'Rock arch and beach in a marine reserve on the Coromandel. Land access has had storm closures — check DOC before you go; boat and kayak trips also reach it.', zh: '科罗曼德半岛海洋保护区里的岩石拱门和沙滩。陆路步道曾因风暴封闭，出发前查 DOC；也可乘船或划皮划艇前往。' },
    src: { label: 'DOC — Coromandel', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/coromandel/' }, verify: ['note'],
  },
  {
    id: 'hot-water-beach', kind: 'nature', island: 'north', at: [-36.888, 175.823], price: 'free', booking: false, weather: 'mid', hours: 1.5,
    name: { en: 'Hot Water Beach', zh: '热水海滩' },
    note: { en: 'Dig your own hot pool in the sand, about two hours either side of low tide. Strong rips: do not swim here.', zh: '低潮前后约两小时，在沙滩上自己挖温泉坑。离岸流很强，不要下海游泳。' },
    src: { label: 'Thames-Coromandel District Council', url: 'https://www.tcdc.govt.nz/' }, verify: ['note'],
  },
  {
    id: 'huka', kind: 'nature', island: 'north', at: [-38.649, 176.09], price: 'free', booking: false, weather: 'low', hours: 0.5,
    name: { en: 'Huka Falls', zh: '胡卡瀑布' },
    note: { en: 'The Waikato River forced through a narrow gorge; short walk from the car park, jet boats run below.', zh: '怀卡托河挤过狭窄峡谷形成的急流瀑布，停车场步行即到；下游有喷射快艇。' },
    src: { label: 'DOC — Spa Park to Huka Falls', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/central-north-island/places/taupo-area/things-to-do/spa-park-to-huka-falls-walk/' }, verify: [],
  },
  {
    id: 'three-sisters', kind: 'nature', island: 'north', at: [-38.82, 174.6], price: 'free', booking: false, weather: 'high', hours: 1.5,
    name: { en: 'Three Sisters & Elephant Rock, Tongapōrutu', zh: '三姐妹岩（Tongapōrutu）' },
    note: { en: 'Sea stacks reached along the beach at low tide only — check tide times first.', zh: '只能在低潮时沿沙滩走到海蚀柱，先查潮汐表。' },
    src: { label: 'Visit Taranaki', url: 'https://www.taranaki.co.nz/' }, verify: ['note'],
  },
  {
    id: 'te-papa', kind: 'city', island: 'north', at: [-41.29, 174.782], price: 'free', booking: false, weather: 'low', hours: 3,
    name: { en: 'Te Papa Tongarewa, Wellington', zh: '新西兰国家博物馆 Te Papa（惠灵顿）' },
    note: { en: 'The national museum on the waterfront. General entry is free; some exhibitions charge.', zh: '海滨的国家博物馆，常设展免费，部分特展收费。' },
    src: { label: 'Te Papa', url: 'https://www.tepapa.govt.nz/' }, verify: [],
  },
  {
    id: 'cable-car', kind: 'city', island: 'north', at: [-41.285, 174.776], price: 'paid', booking: false, weather: 'low', hours: 1.5,
    name: { en: 'Wellington Cable Car & Botanic Garden', zh: '惠灵顿缆车与植物园' },
    note: { en: 'Ride up from Lambton Quay, then walk down through the Botanic Garden to the city.', zh: '从 Lambton Quay 坐缆车上山，再穿过植物园走回市区。' },
    src: { label: 'Wellington Cable Car', url: 'https://www.wellingtoncablecar.co.nz/' }, verify: [],
  },
  {
    id: 'zealandia', kind: 'wildlife', island: 'north', at: [-41.29, 174.753], price: 'paid', booking: false, weather: 'mid', hours: 2.5,
    name: { en: 'Zealandia Te Māra a Tāne', zh: '西兰蒂亚生态保护区' },
    note: { en: 'Fenced urban sanctuary with native birds; night tours can find kiwi.', zh: '城市里的围栏生态保护区，可见本土鸟类；夜间导览有机会看到几维鸟。' },
    src: { label: 'Zealandia', url: 'https://www.visitzealandia.com/' }, verify: [],
  },

  // ── South Island ──────────────────────────────────────────────────────────
  {
    id: 'chch-gardens', kind: 'city', island: 'south', at: [-43.53, 172.62], price: 'free', booking: false, weather: 'low', hours: 1.5,
    name: { en: 'Christchurch Botanic Gardens & Avon River', zh: '基督城植物园与雅芳河' },
    note: { en: 'Free gardens beside the river; punting on the Avon is a paid extra.', zh: '河畔植物园免费；雅芳河撑篙游船另付费。' },
    src: { label: 'Christchurch City Council — Botanic Gardens', url: 'https://ccc.govt.nz/parks-and-gardens/christchurch-botanic-gardens' }, verify: [],
  },
  {
    id: 'akaroa-dolphins', kind: 'wildlife', island: 'south', at: [-43.83, 172.97], price: 'tour', booking: true, weather: 'high', hours: 2.5,
    name: { en: 'Akaroa Harbour cruise (Hector’s dolphins)', zh: '阿卡罗阿港游船（赫氏海豚）' },
    note: { en: 'Harbour cruises often see Hector’s dolphins, among the world’s smallest. Sailings depend on sea conditions.', zh: '港内游船常能看到世界上体型最小的海豚之一，赫氏海豚。是否开船取决于海况。' },
    src: { label: 'Black Cat Cruises', url: 'https://www.blackcat.co.nz/' }, verify: ['note'],
  },
  {
    id: 'whale-watch', kind: 'wildlife', island: 'south', at: [-42.41, 173.69], price: 'tour', booking: true, weather: 'high', hours: 3.5,
    name: { en: 'Whale Watch Kaikōura', zh: '凯库拉出海观鲸' },
    note: { en: 'Boat trips to see sperm whales over the deep Kaikōura Canyon. Trips are cancelled in rough seas — keep a spare half-day. Seasick-prone travellers should prepare.', zh: '出海到凯库拉深海峡谷看抹香鲸。海况差会取消，最好留出半天机动；易晕船的提前准备。' },
    src: { label: 'Whale Watch Kaikōura', url: 'https://www.whalewatch.co.nz/' }, verify: [],
  },
  {
    id: 'good-shepherd', kind: 'culture', island: 'south', at: [-44.004, 170.48], price: 'free', booking: false, weather: 'mid', hours: 0.5,
    name: { en: 'Church of the Good Shepherd, Lake Tekapo', zh: '特卡波好牧羊人教堂' },
    note: { en: 'Small stone church on the lakeshore. It is a working church: quiet inside, no photos during services. Lupins flower nearby in late Nov–Dec.', zh: '湖边的小石头教堂，仍在使用：室内保持安静，礼拜时勿拍照。11月下旬至12月附近有鲁冰花。' },
    src: { label: 'Mackenzie Region tourism', url: 'https://www.mackenzienz.com/' }, verify: ['note'],
  },
  {
    id: 'dark-sky', kind: 'nature', island: 'south', at: [-44.0, 170.47], price: 'tour', booking: true, weather: 'high', hours: 2,
    name: { en: 'Stargazing, Aoraki Mackenzie Dark Sky Reserve', zh: '特卡波观星（奥拉基麦肯齐暗夜保护区）' },
    note: { en: 'Guided night tours in one of the world’s darkest skies. Cloud cancels them; summer nights get dark late.', zh: '在全球最暗的星空之一参加夜间导览。阴天会取消；夏季天黑得很晚。' },
    src: { label: 'Dark Sky Project', url: 'https://www.darkskyproject.co.nz/' }, verify: [],
  },
  {
    id: 'tasman-lake', kind: 'nature', island: 'south', at: [-43.69, 170.19], price: 'free', booking: false, weather: 'mid', hours: 1,
    name: { en: 'Tasman Glacier View & lake', zh: '塔斯曼冰川观景点与冰湖' },
    note: { en: 'Short steep climb to a view of the Tasman Glacier lake and icebergs; boat trips on the lake run in season.', zh: '短而陡的爬升，俯瞰塔斯曼冰川湖与浮冰；季节内有冰湖游船。' },
    src: { label: 'DOC — Aoraki/Mount Cook', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/' }, verify: [],
  },
  {
    id: 'heli-glacier', kind: 'thrill', island: 'south', at: [-43.66, 170.25], price: 'tour', booking: true, weather: 'high', hours: 1.5,
    name: { en: 'Scenic flight with glacier landing', zh: '直升机/小飞机冰川降落' },
    note: { en: 'Flights from Aoraki/Mount Cook, Franz Josef and Fox. Weather cancellations are common — book early in your stay so you can move it. Travellers report mixed value for short flights.', zh: '库克山、弗朗茨约瑟夫、福克斯都有。天气取消很常见，安排在停留期前段以便改期；短航线的性价比评价不一。' },
    src: { label: 'DOC — Aoraki/Mount Cook', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/' }, verify: ['note'],
  },
  {
    id: 'wanaka-tree', kind: 'nature', island: 'south', at: [-44.697, 169.13], price: 'free', booking: false, weather: 'mid', hours: 0.5,
    name: { en: 'That Wānaka Tree', zh: '瓦纳卡孤独的树' },
    note: { en: 'A willow growing in the lake by the town. Please stay off it — it has been damaged before. Water levels change through the year.', zh: '镇边长在湖水里的柳树。请勿攀爬，曾被破坏过。湖水位随季节变化。' },
    src: { label: 'Lake Wānaka Tourism', url: 'https://www.lakewanaka.co.nz/' }, verify: [],
  },
  {
    id: 'skyline-qt', kind: 'thrill', island: 'south', at: [-45.03, 168.65], price: 'paid', booking: false, weather: 'mid', hours: 2,
    name: { en: 'Skyline Gondola & Luge, Queenstown', zh: '皇后镇天空缆车与滑板车' },
    note: { en: 'Gondola to Bob’s Peak above the town; the luge is a gentle thrill for most ages. Sunset is popular.', zh: '缆车上鲍勃峰俯瞰小镇；滑板车刺激但温和，老少皆宜，日落时段最热门。' },
    src: { label: 'Skyline Queenstown', url: 'https://www.skyline.co.nz/en/queenstown/' }, verify: [],
  },
  {
    id: 'shotover-jet', kind: 'thrill', island: 'south', at: [-44.99, 168.7], price: 'tour', booking: true, weather: 'low', hours: 1,
    name: { en: 'Shotover Jet', zh: '沙特沃河喷射快艇' },
    note: { en: 'Jet boat through narrow canyon walls: thrilling but not extreme, suits non-adrenaline travellers too.', zh: '在狭窄峡谷中高速穿行，刺激但不极限，不爱冒险的人也能玩。' },
    src: { label: 'Shotover Jet', url: 'https://www.shotoverjet.com/' }, verify: [],
  },
  {
    id: 'kawarau-bungy', kind: 'thrill', island: 'south', at: [-45.01, 168.89], price: 'tour', booking: true, weather: 'low', hours: 1.5,
    name: { en: 'Kawarau Bridge Bungy', zh: '卡瓦劳大桥蹦极' },
    note: { en: 'The 1988 site of the first commercial bungy; watching from the viewing deck is free.', zh: '1988年第一个商业蹦极点；在观景台观看免费。' },
    src: { label: 'AJ Hackett Bungy', url: 'https://www.bungy.co.nz/' }, verify: [],
  },
  {
    id: 'arrowtown', kind: 'culture', island: 'south', at: [-44.94, 168.83], price: 'free', booking: false, weather: 'low', hours: 2,
    name: { en: 'Arrowtown', zh: '箭镇' },
    note: { en: 'Gold-rush main street and the restored Chinese Settlement, about 20 minutes from Queenstown. Best in autumn colour (Apr–May).', zh: '淘金时代老街与修复的华人定居点遗址，距皇后镇约20分钟。秋叶季（4–5月）最美。' },
    src: { label: 'Arrowtown Promotion & Business Association', url: 'https://www.arrowtown.com/' }, verify: [],
  },
  {
    id: 'glenorchy', kind: 'nature', island: 'south', at: [-44.85, 168.39], price: 'free', booking: false, weather: 'mid', hours: 3,
    name: { en: 'Glenorchy & the lakeside road', zh: '格林诺奇与湖畔公路' },
    note: { en: 'A 45-minute drive along Lake Wakatipu to mountain valleys used in film locations; base for the Routeburn.', zh: '沿瓦卡蒂普湖开约45分钟，进入多部电影的取景山谷；也是路特本步道的出发地。' },
    src: { label: 'Destination Queenstown', url: 'https://www.queenstownnz.co.nz/' }, verify: [],
  },
  {
    id: 'milford-cruise', kind: 'nature', island: 'south', at: [-44.64, 167.9], price: 'tour', booking: true, weather: 'mid', hours: 2,
    name: { en: 'Milford Sound / Piopiotahi cruise', zh: '米尔福德峡湾游船' },
    note: { en: 'Many travellers say rain makes it better: hundreds of temporary waterfalls. The road can close for avalanche risk or weather.', zh: '不少人说下雨反而更好看：会出现上百条临时瀑布。公路可能因雪崩风险或天气封闭。' },
    src: { label: 'DOC — Fiordland National Park', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/fiordland/places/fiordland-national-park/' }, verify: [],
  },
  {
    id: 'te-anau-glowworms', kind: 'nature', island: 'south', at: [-45.42, 167.66], price: 'tour', booking: true, weather: 'low', hours: 2.5,
    name: { en: 'Te Anau Glowworm Caves', zh: '蒂阿瑙萤火虫洞' },
    note: { en: 'Boat across Lake Te Anau, then into a young limestone cave with glowworms. A good rainy-day plan in Fiordland.', zh: '乘船横渡蒂阿瑙湖，进入年轻的石灰岩洞看萤火虫，峡湾雨天的好选择。' },
    src: { label: 'RealNZ — Te Anau Glowworm Caves', url: 'https://www.realnz.com/en/experiences/cruises/te-anau-glowworm-caves/' }, verify: [],
  },
  {
    id: 'oamaru-penguins', kind: 'wildlife', island: 'south', at: [-45.11, 170.98], price: 'paid', booking: true, weather: 'low', hours: 1.5,
    name: { en: 'Oamaru Blue Penguin Colony', zh: '奥马鲁小蓝企鹅' },
    note: { en: 'Little penguins come ashore at dusk. Viewing is from stands; flash photography is not allowed.', zh: '小蓝企鹅黄昏上岸，在看台观看，禁止闪光灯。' },
    src: { label: 'Oamaru Blue Penguin Colony', url: 'https://www.penguins.co.nz/' }, verify: [],
  },
  {
    id: 'moeraki', kind: 'nature', island: 'south', at: [-45.345, 170.83], price: 'free', booking: false, weather: 'low', hours: 0.5,
    name: { en: 'Moeraki Boulders', zh: '摩拉基大圆石' },
    note: { en: 'Spherical boulders on the beach; easiest to see around low tide.', zh: '海滩上的巨大圆石，低潮前后最好看。' },
    src: { label: 'Waitaki tourism', url: 'https://www.waitakinz.com/' }, verify: [],
  },
  {
    id: 'albatross', kind: 'wildlife', island: 'south', at: [-45.775, 170.73], price: 'tour', booking: true, weather: 'mid', hours: 1.5,
    name: { en: 'Royal Albatross Centre, Otago Peninsula', zh: '奥塔哥半岛皇家信天翁中心' },
    note: { en: 'The only mainland breeding colony of royal albatross; guided viewing.', zh: '皇家信天翁唯一的本岛繁殖地，跟导览观看。' },
    src: { label: 'Royal Albatross Centre', url: 'https://albatross.org.nz/' }, verify: [],
  },
  {
    id: 'pancake-rocks', kind: 'nature', island: 'south', at: [-42.115, 171.33], price: 'free', booking: false, weather: 'low', hours: 0.5,
    name: { en: 'Pancake Rocks & blowholes, Punakaiki', zh: '普纳凯基千层饼岩与喷水洞' },
    note: { en: 'Layered limestone on the West Coast; blowholes are best around high tide with a swell.', zh: '西海岸层叠的石灰岩，涨潮且有涌浪时喷水洞最壮观。' },
    src: { label: 'DOC — Paparoa National Park', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/paparoa-national-park/' }, verify: [],
  },
  {
    id: 'hokitika-gorge', kind: 'nature', island: 'south', at: [-42.95, 171.17], price: 'free', booking: false, weather: 'mid', hours: 1,
    name: { en: 'Hokitika Gorge', zh: '霍基蒂卡峡谷' },
    note: { en: 'Milky turquoise river under a swing bridge; brightest after dry, sunny spells.', zh: '吊桥下的乳蓝色河水，连续晴天后颜色最亮。' },
    src: { label: 'DOC — Hokitika Gorge', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/hokitika-gorge-scenic-reserve/' }, verify: ['src'],
  },
  {
    id: 'wharariki', kind: 'nature', island: 'south', at: [-40.5, 172.68], price: 'free', booking: false, weather: 'mid', hours: 2,
    name: { en: 'Wharariki Beach', zh: '华拉里基海滩' },
    note: { en: 'Wild beach with the Archway Islands at the top of the South Island, a 20-minute walk over farmland. Dangerous for swimming.', zh: '南岛最北端的荒野海滩，有拱门群岛，从牧场步行约20分钟。不宜游泳。' },
    src: { label: 'DOC — Golden Bay', url: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/nelson-tasman/' }, verify: ['note'],
  },
  {
    id: 'bluff', kind: 'culture', island: 'south', at: [-46.615, 168.36], price: 'free', booking: false, weather: 'mid', hours: 1,
    name: { en: 'Stirling Point, Bluff', zh: '布拉夫斯特灵角' },
    note: { en: 'The signpost at the bottom of the South Island; ferries to Rakiura/Stewart Island leave from Bluff.', zh: '南岛最南端的路标；去斯图尔特岛的渡轮从布拉夫出发。' },
    src: { label: 'Southland NZ', url: 'https://southlandnz.com/' }, verify: [],
  },
];
