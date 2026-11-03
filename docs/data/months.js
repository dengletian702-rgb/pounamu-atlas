// Month by month: what each month is good for and what it costs you. There is deliberately no "best month".
// Daylight is sunrise-to-sunset hours for Queenstown (about 45°S), rounded; Auckland (37°S) swings about 2 h less
// across the year. Event dates move each year, so every dated item is marked to verify (`verify: true`).
// Sources: DOC Great Walks season, NZ school-term dates (education.govt.nz), Te Ara on seasons, route data on this site.

export const MONTH_SOURCES = [
  { label: 'DOC — Great Walks season dates', url: 'https://www.doc.govt.nz/parks-and-recreation/things-to-do/walking-and-tramping/great-walks/' },
  { label: 'Ministry of Education — school term dates', url: 'https://www.education.govt.nz/school/school-terms-and-holidays/' },
  { label: 'Te Ara — Climate', url: 'https://teara.govt.nz/en/climate' },
];

export const MONTHS = [
  { season: 'summer', light: 15.5, verify: true,
    good: { en: 'Long days, warm lakes, every Great Walk and alpine road open; cherries and stone fruit in Central Otago.', zh: '白天最长、湖水最暖，大步道和高山公路全部开放；中奥塔哥樱桃和核果季。' },
    trade: { en: 'Peak prices and crowds: NZ summer school holidays and often Chinese New Year; book beds and Great Walk huts months ahead.', zh: '最贵最挤：新西兰暑假，常赶上春节；住宿和大步道小屋要提前几个月订。' } },
  { season: 'summer', light: 14, verify: true,
    good: { en: 'Settled weather, schools back after early Feb so roads quieten; warm enough to swim.', zh: '天气稳定，二月初开学后路上车少；还能下水。' },
    trade: { en: 'Still high season prices; Waitangi Day (6 Feb) and Chinese New Year can fill towns.', zh: '仍是旺季价；怀唐伊日（2月6日）和春节期间小镇可能满房。' } },
  { season: 'autumn', light: 12.5,
    good: { en: 'Many locals’ favourite: calm days, fewer people, vineyards harvesting; Great Walks still open.', zh: '很多本地人最爱的月份：风小人少，酒庄采收；大步道仍开放。' },
    trade: { en: 'Nights turn cold inland; daylight shrinking fast; Easter can fall late this month.', zh: '内陆夜里开始冷；白天变短得快；复活节可能在月底。' } },
  { season: 'autumn', light: 11, verify: true,
    good: { en: 'Autumn colour in Arrowtown, Wānaka and the Mackenzie; clear skies for stargazing.', zh: '箭镇、瓦纳卡和麦肯齐的秋色；晴夜适合观星。' },
    trade: { en: 'Two-week school holidays and Easter; Great Walk hut season ends at the end of the month.', zh: '有两周学校假期和复活节；大步道小屋季月底结束。' } },
  { season: 'autumn', light: 9.8,
    good: { en: 'Cheapest beds and car hire of the year; quiet Milford; first snow on the peaks.', zh: '全年住宿和租车最便宜；米尔福德人少；山顶初雪。' },
    trade: { en: 'Short, often wet days; alpine tracks can close with snow; some small operators pause.', zh: '白天短、常下雨；高山步道可能因雪关闭；部分小商家停业。' } },
  { season: 'winter', light: 9, verify: true,
    good: { en: 'Ski season usually opens mid-month; longest nights for the Dark Sky Reserve; Matariki public holiday (June or July).', zh: '滑雪季通常在月中开始；夜最长，适合暗夜保护区观星；毛利新年 Matariki 公共假期（六月或七月）。' },
    trade: { en: 'Snow chains and black ice on mountain passes; Milford Road can close for avalanche risk.', zh: '山口需要防滑链、路面暗冰；米尔福德公路可能因雪崩风险封路。' } },
  { season: 'winter', light: 9.2, verify: true,
    good: { en: 'Best snow; crisp clear days in Central Otago and the Mackenzie; hot pools feel right.', zh: '雪最好；中奥塔哥和麦肯齐晴朗干冷；正适合泡温泉。' },
    trade: { en: 'School holidays fill ski towns; driving needs winter skills; many walks only to low level.', zh: '学校假期滑雪小镇满房；需要冬季驾驶经验；很多步道只能走低海拔段。' } },
  { season: 'winter', light: 10.3,
    good: { en: 'Late-season snow with longer days; quiet everywhere off the ski fields; lambs start appearing.', zh: '雪季后段白天变长；雪场以外到处都安静；开始看到小羊。' },
    trade: { en: 'Changeable: four seasons in a day is common; alpine roads still need chains.', zh: '天气多变，「一天四季」常见；高山公路仍要带防滑链。' } },
  { season: 'spring', light: 11.8, verify: true,
    good: { en: 'Lambs, blossom, waterfalls at full flow; fewer visitors before the summer rush.', zh: '小羊、花开、瀑布水量最大；暑期人潮之前游客少。' },
    trade: { en: 'Windy and showery; snow can still fall inland; school holidays late in the month.', zh: '风大多阵雨；内陆仍可能下雪；月底有学校假期。' } },
  { season: 'spring', light: 13.3, verify: true,
    good: { en: 'Great Walk season begins late in the month (dates vary by track); green valleys, full rivers.', zh: '大步道季在月底开始（各步道日期不同）；山谷翠绿、河流丰沛。' },
    trade: { en: 'Roys Peak closed every year 1 Oct – 10 Nov for lambing; early-season huts can still have snow.', zh: '罗伊峰每年10月1日至11月10日因产羔封闭；季初小屋周边可能仍有雪。' } },
  { season: 'spring', light: 14.7, verify: true,
    good: { en: 'Lupins along Lake Tekapo and the Mackenzie roads (late Nov – Dec); long evenings, prices below summer.', zh: '特卡波湖和麦肯齐沿路的鲁冰花（11月下旬至12月）；傍晚长，价格低于暑期。' },
    trade: { en: 'Weather still unsettled; popular Great Walk dates already booked out.', zh: '天气还不稳定；热门大步道日期早已订满。' } },
  { season: 'summer', light: 15.6, verify: true,
    good: { en: 'Longest days of the year; Christmas and New Year events; everything open.', zh: '一年中白天最长；圣诞和跨年活动；全部开放。' },
    trade: { en: 'From mid-month the busiest and dearest weeks of the year; some businesses close 25–26 Dec and 1–2 Jan.', zh: '月中起是全年最忙最贵的几周；部分商家在12月25–26日和1月1–2日休息。' } },
];
