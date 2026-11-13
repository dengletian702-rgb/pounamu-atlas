/* Day cards for a route. Overnight stays come from the table below,
   not from guessing at a stage title. The last day of a multi-day
   route is the walk-out or the drive home: no stay row. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.pounamuRouteDays = api.routeDays;
  root.pounamuRouteStays = api.STAYS;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pick(pair, en) { return Array.isArray(pair) ? (en ? pair[0] : pair[1]) || '' : ''; }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

  /* kind: great-walk | doc-hut | doc-camp | city | none
     noStay days have no overnight row. query is what Google should search. */
  const STAYS = {
    'routeburn-track': [
      { stay: 'Routeburn Falls Hut', zh: 'Routeburn Falls Hut', kind: 'great-walk', hut: true, titleEn: 'Routeburn Shelter → Flats → Falls', titleZh: 'Routeburn Shelter → Flats → Falls', noteEn: 'From Routeburn Shelter, through Routeburn Flats, to Routeburn Falls Hut.', noteZh: '从 Routeburn Shelter 经 Routeburn Flats，当晚住 Routeburn Falls Hut。', query: 'Routeburn Falls Hut' },
      { stay: 'Lake Mackenzie Hut', zh: 'Lake Mackenzie Hut', kind: 'great-walk', hut: true, titleEn: 'Harris Saddle → Lake Mackenzie', titleZh: 'Harris Saddle → Lake Mackenzie', noteEn: 'Cross Harris Saddle and stay at Lake Mackenzie Hut.', noteZh: '翻过 Harris Saddle，当晚住 Lake Mackenzie Hut。', query: 'Lake Mackenzie Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to The Divide', titleZh: '到 The Divide 出山', noteEn: 'Walk out to The Divide. This day has no hut.', noteZh: '走到 The Divide 出山，这一天不住。', query: 'The Divide Routeburn Track' }
    ],
    'kepler-track': [
      { stay: 'Luxmore Hut', zh: 'Luxmore Hut', kind: 'great-walk', hut: true, titleEn: 'Carpark → Brod Bay → Luxmore Hut', titleZh: '停车场 → Brod Bay → Luxmore Hut', noteEn: 'Brod Bay is on the way up, and the Luxmore Cave side trip is part of this walk. Night at Luxmore Hut.', noteZh: '途经 Brod Bay，Luxmore Cave 支线也在这一天。当晚住 Luxmore Hut。', query: 'Luxmore Hut' },
      { stay: 'Iris Burn Hut', zh: 'Iris Burn Hut', kind: 'great-walk', hut: true, titleEn: 'Luxmore Hut → Iris Burn Hut', titleZh: 'Luxmore Hut → Iris Burn Hut', noteEn: 'Along the tops to Iris Burn Hut.', noteZh: '沿山脊走到 Iris Burn Hut。', query: 'Iris Burn Hut Kepler Track' },
      { stay: 'Moturau Hut', zh: 'Moturau Hut', kind: 'great-walk', hut: true, titleEn: 'Iris Burn Hut → Moturau Hut', titleZh: 'Iris Burn Hut → Moturau Hut', noteEn: 'Down the Iris Burn to Moturau Hut.', noteZh: '沿 Iris Burn 下行，当晚住 Moturau Hut。', query: 'Moturau Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Rainbow Reach', titleZh: '到 Rainbow Reach 出山', noteEn: 'Walk out to Rainbow Reach or the Kepler carpark. No hut tonight.', noteZh: '走到 Rainbow Reach 或开普勒停车场出山，这一天不住。', query: 'Rainbow Reach Kepler Track' }
    ],
    'tongariro-northern-circuit': [
      { stay: 'Mangatepopo Hut', zh: 'Mangatepopo Hut', kind: 'great-walk', hut: true, titleEn: 'Whakapapa Village → Mangatepopo Hut', titleZh: 'Whakapapa Village → Mangatepopo Hut', noteEn: 'From Whakapapa Village to Mangatepopo Hut.', noteZh: '从 Whakapapa Village 到 Mangatepopo Hut。', query: 'Mangatepopo Hut' },
      { stay: 'Oturere Hut', zh: 'Oturere Hut', kind: 'great-walk', hut: true, titleEn: 'Mangatepopo Hut → Oturere Hut', titleZh: 'Mangatepopo Hut → Oturere Hut', noteEn: 'The walk passes Emerald Lakes. Night at Oturere Hut.', noteZh: '这一天经过 Emerald Lakes。当晚住 Oturere Hut。', query: 'Oturere Hut' },
      { stay: 'Waihohonu Hut', zh: 'Waihohonu Hut', kind: 'great-walk', hut: true, titleEn: 'Oturere Hut → Waihohonu Hut', titleZh: 'Oturere Hut → Waihohonu Hut', noteEn: 'On to Waihohonu Hut.', noteZh: '继续到 Waihohonu Hut。', query: 'Waihohonu Hut' },
      { noStay: true, kind: 'none', titleEn: 'Back to Whakapapa Village', titleZh: '回到 Whakapapa Village', noteEn: 'Walk back to Whakapapa Village. No hut tonight.', noteZh: '走回 Whakapapa Village，这一天不住。', query: 'Whakapapa Village' }
    ],
    'rakiura-track': [
      { stay: 'Port William Hut', zh: 'Port William Hut', kind: 'great-walk', hut: true, titleEn: 'Oban → Port William Hut', titleZh: 'Oban → Port William Hut', noteEn: 'From Oban and Lee Bay to Port William Hut.', noteZh: '从 Oban、Lee Bay 到 Port William Hut。', query: 'Port William Hut' },
      { stay: 'North Arm Hut', zh: 'North Arm Hut', kind: 'great-walk', hut: true, titleEn: 'Port William Hut → North Arm Hut', titleZh: 'Port William Hut → North Arm Hut', noteEn: 'Across to North Arm Hut.', noteZh: '走到 North Arm Hut。', query: 'North Arm Hut Rakiura' },
      { noStay: true, kind: 'none', titleEn: 'Back to Oban', titleZh: '回到 Oban', noteEn: 'Walk out to the Fern Gully road and back to Oban.', noteZh: '走到 Fern Gully，回到 Oban，这一天不住。', query: 'Oban Stewart Island' }
    ],
    'mueller-hut': [
      { stay: 'Mueller Hut', zh: 'Mueller Hut', kind: 'alpine-hut', hut: false, titleEn: 'Village → Sealy Tarns → Mueller Hut', titleZh: '村庄 → Sealy Tarns → Mueller Hut', noteEn: 'Sealy Tarns is on the climb. Night at Mueller Hut. DOC adult rates: $50 (May–Sep), $55/$57 (Oct–Apr weekday/weekend), $60/$62 (Dec–Feb weekday/weekend).', noteZh: 'Sealy Tarns 在上山的路上。当晚住 Mueller Hut。DOC 成人价：5–9 月每晚 $50，10–4 月平日/周末 $55/$57，12–2 月平日/周末 $60/$62。', query: 'Mueller Hut', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/things-to-do/huts/mueller-hut/', officialLabelEn: 'DOC Mueller Hut fees', officialLabelZh: 'DOC Mueller Hut 费用' },
      { noStay: true, kind: 'none', titleEn: 'Back to Aoraki/Mount Cook Village', titleZh: '回到 Aoraki/Mount Cook Village', noteEn: 'Descend to Aoraki/Mount Cook Village.', noteZh: '下到 Aoraki/Mount Cook Village，这一天不住。', query: 'Aoraki Mount Cook Village' }
    ],
    'heaphy-track': [
      { stay: 'Perry Saddle Hut', zh: 'Perry Saddle Hut', kind: 'great-walk', hut: true, ix: [0], titleEn: 'Brown Hut → Perry Saddle Hut', titleZh: 'Brown Hut → Perry Saddle Hut', query: 'Perry Saddle Hut', moveEn: '5 hr, 17.5 km (DOC)', moveZh: '5 小时，17.5 公里（DOC）' },
      { stay: 'Saxon Hut', zh: 'Saxon Hut', kind: 'great-walk', hut: true, ix: [1, 2], titleEn: 'Perry Saddle → Gouland Downs → Saxon Hut', titleZh: 'Perry Saddle → Gouland Downs → Saxon Hut', query: 'Saxon Hut Heaphy Track', moveEn: '2 hr + 1 hr 30 min, 7 km + 5.4 km (DOC)', moveZh: '2 小时 + 1 小时 30 分，7 公里 + 5.4 公里（DOC）' },
      { stay: 'James Mackay Hut', zh: 'James Mackay Hut', kind: 'great-walk', hut: true, ix: [3], titleEn: 'Saxon Hut → James Mackay Hut', titleZh: 'Saxon Hut → James Mackay Hut', query: 'James Mackay Hut', moveEn: '3 hr, 11.8 km (DOC)', moveZh: '3 小时，11.8 公里（DOC）' },
      { stay: 'Heaphy Hut', zh: 'Heaphy Hut', kind: 'great-walk', hut: true, ix: [4], titleEn: 'James Mackay Hut → Heaphy Hut via Lewis Shelter', titleZh: 'James Mackay Hut → 经 Lewis Shelter → Heaphy Hut', query: 'Heaphy Hut', moveEn: '6 hr, 20.5 km (DOC)', moveZh: '6 小时，20.5 公里（DOC）' },
      { noStay: true, kind: 'none', ix: [5], titleEn: 'Out to Kohaihai', titleZh: '到 Kohaihai 出山', query: 'Kohaihai Heaphy Track', moveEn: '5 hr, 16.2 km (DOC)', moveZh: '5 小时，16.2 公里（DOC）' }
    ],
    'queen-charlotte-track': [
      { stay: 'Schoolhouse Bay Campsite', zh: 'Schoolhouse Bay Campsite', kind: 'doc-camp', titleEn: 'Ship Cove → Resolution Bay', titleZh: 'Ship Cove → Resolution Bay', noteEn: 'Night at Schoolhouse Bay Campsite, in Resolution Bay.', noteZh: '当晚住 Resolution Bay 的 Schoolhouse Bay Campsite。', query: 'Schoolhouse Bay Campsite Queen Charlotte Track' },
      { stay: 'Camp Bay Campsite', zh: 'Camp Bay Campsite', kind: 'doc-camp', titleEn: 'Resolution Bay → Endeavour Inlet → Camp Bay', titleZh: 'Resolution Bay → Endeavour Inlet → Camp Bay', noteEn: 'Night at Camp Bay Campsite.', noteZh: '当晚住 Camp Bay Campsite。', query: 'Camp Bay Campsite Queen Charlotte Track' },
      { stay: 'Cowshed Bay Campsite', zh: 'Cowshed Bay Campsite', kind: 'doc-camp', titleEn: 'Camp Bay → Torea Saddle', titleZh: 'Camp Bay → Torea Saddle', noteEn: 'Night at Cowshed Bay Campsite, near Torea Saddle and Portage.', noteZh: '当晚住 Torea Saddle / Portage 附近的 Cowshed Bay Campsite。', query: 'Cowshed Bay Campsite Queen Charlotte Track' },
      { noStay: true, kind: 'none', titleEn: 'Out to Anakiwa', titleZh: '到 Anakiwa 结束', noteEn: 'Walk out to Anakiwa.', noteZh: '走到 Anakiwa 结束。', query: 'Anakiwa' }
    ],
    'abel-tasman': [
      { stay: 'Anchorage Hut', zh: 'Anchorage Hut', kind: 'great-walk', hut: true, titleEn: 'Marahau → Anchorage', titleZh: 'Marahau → Anchorage', noteEn: 'Coastal forest to Anchorage Hut.', noteZh: '沿海岸林走到 Anchorage Hut。', query: 'Anchorage Hut Abel Tasman' },
      { stay: 'Bark Bay Hut', zh: 'Bark Bay Hut', kind: 'great-walk', hut: true, titleEn: 'Anchorage → Bark Bay', titleZh: 'Anchorage → Bark Bay', noteEn: 'On to Bark Bay Hut.', noteZh: '继续到 Bark Bay Hut。', query: 'Bark Bay Hut Abel Tasman' },
      { stay: 'Awaroa Hut', zh: 'Awaroa Hut', kind: 'great-walk', hut: true, titleEn: 'Bark Bay → Awaroa', titleZh: 'Bark Bay → Awaroa', noteEn: 'Check the tide for the Awaroa inlet. Night at Awaroa Hut.', noteZh: '过 Awaroa 湾口前先看潮汐。当晚住 Awaroa Hut。', query: 'Awaroa Hut Abel Tasman' },
      { noStay: true, kind: 'none', titleEn: 'Out to Wainui', titleZh: '到 Wainui 出山', noteEn: 'Walk out to Wainui. Tōtaranui is the other usual finish. No hut tonight.', noteZh: '走到 Wainui 出山。Tōtaranui 是另一个常用终点。这一天不住。', query: 'Wainui Abel Tasman' }
    ],
    'te-paki-coastal': [
      { stay: 'Pandora Campsite', zh: 'Pandora Campsite', kind: 'doc-free', unconfirmed: true, titleEn: 'Kapowairua → Pandora', titleZh: 'Kapowairua → Pandora', noteEn: 'DOC lists Pandora Campsite as free. DOC alert on the Te Paki Recreation Reserve page (last reviewed 16 September 2026, read 13 November 2026): Kapowairua (Spirits Bay) to Pandora is closed after storm damage, and Pandora Campsite is closed. This night is to verify.', noteZh: 'DOC 写明 Pandora 营地免费。DOC 在 Te Paki Recreation Reserve 页的公告（最近复核 2026-09-16，本页查阅 2026-11-13）：Kapowairua（Spirits Bay）至 Pandora 因风暴损坏关闭，Pandora 营地关闭。这一晚待核。', query: 'Pandora Campsite Te Paki', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/northland/places/te-paki-recreation-reserve/things-to-do/campsites/pandora-campsite/', officialLabelEn: 'DOC Pandora Campsite', officialLabelZh: 'DOC Pandora 营地' },
      { stay: 'Tapotupotu Campsite', zh: 'Tapotupotu Campsite', kind: 'doc-camp', unconfirmed: true, titleEn: 'Pandora → Tapotupotu', titleZh: 'Pandora → Tapotupotu', noteEn: 'DOC alert on the same page (read 13 November 2026): Pandora to Tapotupotu Bay is closed, and DOC is not taking bookings for Tapotupotu Campsite. This night is to verify. The open section runs from Cape Reinga to Te Paki Stream.', noteZh: 'DOC 公告（同一页，查阅 2026-11-13）：Pandora 至 Tapotupotu Bay 关闭，Tapotupotu 营地目前不接受预订。这一晚待核。开放段从 Cape Reinga 到 Te Paki Stream。', query: 'Tapotupotu Campsite' },
      { stay: 'Twilight Campsite', zh: 'Twilight Campsite', kind: 'doc-camp', titleEn: 'Cape Reinga → Twilight Beach', titleZh: 'Cape Reinga → Twilight Beach', noteEn: 'Night at Twilight Campsite.', noteZh: '当晚住 Twilight Campsite。', query: 'Twilight Campsite Te Paki' },
      { noStay: true, kind: 'none', titleEn: 'Out to Te Paki Stream', titleZh: '到 Te Paki Stream 结束', noteEn: 'Finish at Te Paki Stream. No camp booked for tonight.', noteZh: '在 Te Paki Stream 结束，这一天不扎营。', query: 'Te Paki Stream' }
    ],
    'ni-timber': [
      { stay: 'Piropiro Campsite', zh: 'Piropiro 营地', kind: 'doc-free', titleEn: 'Pureora → Piropiro', titleZh: 'Pureora → Piropiro', noteEn: 'DOC lists Piropiro Campsite as free.', noteZh: 'DOC 写明 Piropiro 营地免费。', query: 'Piropiro Campsite Timber Trail', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/waikato/places/pureora-forest-park/things-to-do/piropiro-campsite/', officialLabelEn: 'DOC Piropiro Campsite', officialLabelZh: 'DOC Piropiro 营地' },
      { noStay: true, kind: 'none', titleEn: 'Piropiro → Ongarue', titleZh: 'Piropiro → Ongarue', noteEn: 'Finish at Ongarue. No second camp on this day.', noteZh: '第二天骑到 Ongarue 结束，不再过夜。', query: 'Ongarue' }
    ],
    'ni-thermalexplorer': [
      { stay: 'Rotorua', zh: '罗托鲁瓦', kind: 'city', titleEn: 'Auckland → Rotorua', titleZh: '奥克兰 → 罗托鲁瓦', noteEn: 'Night in Rotorua.', noteZh: '当晚住罗托鲁瓦。', query: 'Rotorua' },
      { stay: 'Rotorua', zh: '罗托鲁瓦（续住）', kind: 'city', titleEn: 'Te Puia and the Redwoods', titleZh: 'Te Puia 和红木森林', noteEn: 'Second night in Rotorua. The day is Te Puia and the Redwoods.', noteZh: '罗托鲁瓦续住。当天去 Te Puia 和红木森林。', query: 'Rotorua Te Puia' },
      { noStay: true, kind: 'none', titleEn: 'Wai-O-Tapu and Huka Falls to Taupō', titleZh: '经 Wai-O-Tapu、Huka Falls 到陶波', noteEn: 'Via Wai-O-Tapu and Huka Falls, finish in Taupō.', noteZh: '经 Wai-O-Tapu 和 Huka Falls，到陶波结束。', query: 'Taupō' }
    ],
    'ni-twincoast-drive': [
      { stay: 'Omapere', zh: '奥马佩雷', kind: 'city', titleEn: 'Auckland → Hokianga', titleZh: '奥克兰 → 霍基昂加', noteEn: 'After Waipoua, the night is a Hokianga town. Omapere is the usual one; confirm the bed yourself.', noteZh: '过了 Waipoua，当晚住霍基昂加的镇。常见是奥马佩雷，床位请自己核对。', query: 'Omapere' },
      { stay: 'Paihia', zh: '派希亚', kind: 'city', titleEn: 'Hokianga → Bay of Islands', titleZh: '霍基昂加 → 岛屿湾', noteEn: 'Night in Paihia.', noteZh: '当晚住派希亚。', query: 'Paihia' },
      { stay: 'Paihia', zh: '派希亚（续住）', kind: 'city', titleEn: 'Bay of Islands', titleZh: '岛屿湾', noteEn: 'Another night in Paihia. Waitangi is the day’s outing.', noteZh: '派希亚续住。当天去怀唐伊。', query: 'Waitangi Bay of Islands' },
      { noStay: true, kind: 'none', titleEn: 'Return via Whangārei', titleZh: '经旺阿雷返回', noteEn: 'Drive back through Whangārei. No extra night.', noteZh: '经旺阿雷开回去。', query: 'Whangārei' }
    ],
    'ni-coromandel': [
      { stay: 'Coromandel', zh: '科罗曼德镇', kind: 'city', titleEn: 'Auckland → Coromandel town', titleZh: '奥克兰 → 科罗曼德镇', noteEn: 'The afternoon follows the Thames coast toward Coromandel town.', noteZh: '下午沿泰晤士海岸开往科罗曼德镇。', query: 'Coromandel' },
      { stay: 'Whitianga', zh: '维蒂昂加', kind: 'city', titleEn: 'Thames coast → Mercury Bay', titleZh: '泰晤士海岸 → 水星湾', noteEn: 'Night in Whitianga. Hot Water Beach is a visit, not the stay.', noteZh: '当晚住维蒂昂加。热水海滩是去看的地方，不是住处。', query: 'Whitianga' },
      { noStay: true, kind: 'none', titleEn: 'Hahei, then back', titleZh: 'Hahei，然后返回', noteEn: 'Hahei in the morning, then the drive back. No extra night.', noteZh: '上午去 Hahei，然后开车返回。', query: 'Hahei' }
    ],
    'ni-volcanicloop': [
      { stay: 'Ohakune', zh: '奥哈库内', kind: 'city', titleEn: 'Taupō → Whakapapa → Ohakune', titleZh: '陶波 → Whakapapa → 奥哈库内', noteEn: 'Night in Ohakune.', noteZh: '当晚住奥哈库内。', query: 'Ohakune' },
      { noStay: true, kind: 'none', titleEn: 'Back to Taupō', titleZh: '回到陶波', noteEn: 'Return across the Desert Road to Taupō.', noteZh: '经沙漠公路回到陶波。', query: 'Taupō Desert Road' }
    ],
    catlins: [
      { stay: 'Owaka', zh: '奥瓦卡', kind: 'city', titleEn: 'Dunedin → the Catlins', titleZh: '但尼丁 → 卡特林斯', noteEn: 'Night in Owaka. Nugget Point is a stop, not the stay.', noteZh: '当晚住奥瓦卡。Nugget Point 是停留点，不是住处。', query: 'Owaka' },
      { noStay: true, kind: 'none', titleEn: 'On to Invercargill', titleZh: '继续到因弗卡吉尔', noteEn: 'Finish toward Invercargill. No second night on this page.', noteZh: '向因弗卡吉尔结束。', query: 'Invercargill' }
    ],
    aorakidrive: [
      { stay: 'Lake Tekapo', zh: '特卡波', kind: 'city', titleEn: 'Christchurch → Lake Tekapo', titleZh: '基督城 → 特卡波', noteEn: 'Night at Lake Tekapo.', noteZh: '当晚住特卡波。', query: 'Lake Tekapo' },
      { noStay: true, kind: 'none', titleEn: 'On to Aoraki/Mount Cook Village', titleZh: '继续到 Aoraki/Mount Cook Village', noteEn: 'The drive ends at the village.', noteZh: '车程在村庄结束。', query: 'Aoraki Mount Cook Village' }
    ],
    coastroad: [
      { stay: 'Kaikōura', zh: '凯库拉', kind: 'city', titleEn: 'Picton → Kaikōura', titleZh: '皮克顿 → 凯库拉', noteEn: 'Night in Kaikōura.', noteZh: '当晚住凯库拉。', query: 'Kaikōura' },
      { noStay: true, kind: 'none', titleEn: 'Kaikōura → Christchurch', titleZh: '凯库拉 → 基督城', noteEn: 'Drive on to Christchurch. No extra night.', noteZh: '继续开到基督城。', query: 'Christchurch' }
    ],
    otago: [
      { stay: 'Ōmakau', zh: '奥马考', kind: 'city', titleEn: 'Clyde → Ōmakau', titleZh: 'Clyde → Ōmakau', noteEn: 'Night in Ōmakau.', noteZh: '当晚住 Ōmakau。', query: 'Omakau' },
      { stay: 'Ōtūrēhua', zh: '奥图雷华', kind: 'city', titleEn: 'Ōmakau → Ōtūrēhua', titleZh: 'Ōmakau → Ōtūrēhua', noteEn: 'Night in Ōtūrēhua.', noteZh: '当晚住 Ōtūrēhua。', query: 'Oturehua' },
      { stay: 'Ranfurly', zh: '兰弗利', kind: 'city', titleEn: 'Ōtūrēhua → Ranfurly', titleZh: 'Ōtūrēhua → Ranfurly', noteEn: 'Night in Ranfurly.', noteZh: '当晚住 Ranfurly。', query: 'Ranfurly' },
      { stay: 'Hyde', zh: '海德', kind: 'city', titleEn: 'Ranfurly → Hyde', titleZh: 'Ranfurly → Hyde', noteEn: 'Night in Hyde.', noteZh: '当晚住 Hyde。', query: 'Hyde Otago' },
      { noStay: true, kind: 'none', titleEn: 'Hyde → Middlemarch', titleZh: 'Hyde → Middlemarch', noteEn: 'Finish in Middlemarch.', noteZh: '在 Middlemarch 结束。', query: 'Middlemarch' }
    ],
    'paparoa-track': [
      { stay: 'Moonlight Tops Hut', zh: 'Moonlight Tops Hut', kind: 'great-walk', hut: true, titleEn: 'Smoke-ho → Moonlight Tops Hut', titleZh: 'Smoke-ho → Moonlight Tops Hut', noteEn: 'Ces Clark Hut is on the way. The night on the usual 3-day booking is Moonlight Tops Hut. The Croesus Knob side trip is this day’s extra, not its own day.', noteZh: '途经 Ces Clark Hut。按常见的 3 天走法，当晚住 Moonlight Tops Hut。Croesus Knob 支线算在这一天。', query: 'Moonlight Tops Hut' },
      { stay: 'Pororari Hut', zh: 'Pororari Hut', kind: 'great-walk', hut: true, titleEn: 'Moonlight Tops Hut → Pororari Hut', titleZh: 'Moonlight Tops Hut → Pororari Hut', noteEn: 'Down to Pororari Hut.', noteZh: '下行到 Pororari Hut。', query: 'Pororari Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Punakaiki', titleZh: '到 Punakaiki 出山', noteEn: 'Walk out along the Pororari River to Punakaiki.', noteZh: '沿 Pororari 河走到 Punakaiki 出山。', query: 'Punakaiki' }
    ],
    'lake-waikaremoana': [
      { stay: 'Panekire Hut', zh: 'Panekire Hut', kind: 'great-walk', hut: true, titleEn: 'Onepoto → Panekire Hut', titleZh: 'Onepoto → Panekire Hut', noteEn: 'Up the Panekire bluff to Panekire Hut.', noteZh: '登上 Panekire 崖，当晚住 Panekire Hut。', query: 'Panekire Hut' },
      { stay: 'Waiopaoa Hut', zh: 'Waiopaoa Hut', kind: 'great-walk', hut: true, titleEn: 'Panekire Hut → Waiopaoa Hut', titleZh: 'Panekire Hut → Waiopaoa Hut', noteEn: 'Down to Waiopaoa Hut.', noteZh: '下行到 Waiopaoa Hut。', query: 'Waiopaoa Hut' },
      { stay: 'Marauiti Hut', zh: 'Marauiti Hut', kind: 'great-walk', hut: true, titleEn: 'Waiopaoa → Marauiti Hut', titleZh: 'Waiopaoa → Marauiti Hut', noteEn: 'DOC’s three-night walk uses Marauiti Hut for this night.', noteZh: '按 DOC 的三晚走法，这一晚住 Marauiti Hut。', query: 'Marauiti Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Hopuruahine', titleZh: '到 Hopuruahine 出山', noteEn: 'Walk out to Hopuruahine Landing.', noteZh: '走到 Hopuruahine 码头出山。', query: 'Hopuruahine Landing' }
    ],
    'hump-ridge-track': [
      { stay: 'Ōkaka Lodge', zh: 'Ōkaka Lodge', kind: 'trust', hut: false, titleEn: 'Rarakau → Ōkaka Lodge', titleZh: 'Rarakau → Ōkaka Lodge', noteEn: 'The Hump Ridge Trust sets this price. It is not a DOC Great Walk hut fee.', noteZh: '房价由 Hump Ridge Trust 定，不套 DOC 大步道小屋价。金额待核。', query: 'Okaka Lodge Hump Ridge', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/fiordland/places/fiordland-national-park/things-to-do/tracks/hump-ridge-track/', officialLabelEn: 'DOC Hump Ridge Track', officialLabelZh: 'DOC Hump Ridge 步道' },
      { stay: 'Port Craig Lodge', zh: 'Port Craig Lodge', kind: 'trust', hut: false, titleEn: 'Ōkaka Lodge → Port Craig Lodge', titleZh: 'Ōkaka Lodge → Port Craig Lodge', noteEn: 'The Hump Ridge Trust sets this price. Amount to verify.', noteZh: '房价由 Hump Ridge Trust 定。金额待核。', query: 'Port Craig Lodge', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/fiordland/places/fiordland-national-park/things-to-do/tracks/hump-ridge-track/', officialLabelEn: 'DOC Hump Ridge Track', officialLabelZh: 'DOC Hump Ridge 步道' },
      { noStay: true, kind: 'none', titleEn: 'Back to Rarakau', titleZh: '回到 Rarakau', noteEn: 'Walk back to the Rarakau car park.', noteZh: '走回 Rarakau 停车场。', query: 'Rarakau car park' }
    ],
    'whanganui-journey': [
      { stay: 'Ohinepane Campsite', zh: 'Ohinepane Campsite', kind: 'great-walk', titleEn: 'Taumarunui → Ohinepane Campsite', titleZh: '陶马鲁努伊 → Ohinepane Campsite', noteEn: 'Great Walk campsite. The dollar figure is still to verify.', noteZh: '这是 Great Walk 营地，金额仍待核。', query: 'Ohinepane Campsite' },
      { stay: 'Whakahoro Campsite', zh: 'Whakahoro Campsite', kind: 'great-walk', titleEn: 'Ohinepane → Whakahoro', titleZh: 'Ohinepane → Whakahoro', noteEn: 'Night at Whakahoro. Great Walk price, still to verify.', noteZh: '当晚在 Whakahoro。Great Walk 价格仍待核。', query: 'Whakahoro Campsite' },
      { stay: 'John Coull Hut', zh: 'John Coull Hut', kind: 'great-walk', hut: true, titleEn: 'Whakahoro → John Coull Hut', titleZh: 'Whakahoro → John Coull Hut', noteEn: 'Night at John Coull Hut.', noteZh: '当晚住 John Coull Hut。', query: 'John Coull Hut' },
      { stay: 'Tīeke Kāinga', zh: 'Tīeke Kāinga', kind: 'great-walk', hut: true, titleEn: 'John Coull Hut → Tīeke Kāinga', titleZh: 'John Coull Hut → Tīeke Kāinga', noteEn: 'In the Great Walk season (1 October–30 April) book it as a Great Walk hut.', noteZh: '大步道季（10 月 1 日至 4 月 30 日）按 Great Walk 小屋预订。', query: 'Tieke Kainga Whanganui', officialUrl: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/manawatu-whanganui/places/whanganui-national-park/things-to-do/huts/tieke-kainga/', officialLabelEn: 'DOC Tīeke Kāinga', officialLabelZh: 'DOC Tīeke Kāinga' },
      { noStay: true, kind: 'none', titleEn: 'Out at Pipiriki', titleZh: '在 Pipiriki 起水', noteEn: 'Take out at Pipiriki.', noteZh: '在 Pipiriki 起水，这一天不再过夜。', query: 'Pipiriki' }
    ]
  };

  function endsQuery(route) {
    const ends = clean(pick(route.ends, true) || route.name);
    const parts = ends.split(/\s*(?:→|->)\s*/).map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || ends;
  }

  function stageBits(route) {
    return (route.timeline || []).map(s => ({
      titleEn: pick(s.title, true), titleZh: pick(s.title, false),
      textEn: pick(s.text, true), textZh: pick(s.text, false)
    }));
  }
  function fromPlan(route, plan) {
    const stages = stageBits(route);
    return plan.map(day => {
      const picked = (day.ix || []).map(i => stages[i]).filter(Boolean);
      const textEn = picked.length ? picked.map(s => s.titleEn + '. ' + s.textEn).join(' ') : (day.noteEn || '');
      const textZh = picked.length ? picked.map(s => s.titleZh + '。' + s.textZh).join(' ') : (day.noteZh || '');
      return {
        noStay: !!day.noStay,
        stayEn: day.noStay ? '' : day.stay,
        stayZh: day.noStay ? '' : (day.zh || day.stay),
        titleEn: day.titleEn,
        titleZh: day.titleZh,
        textEn, textZh,
        query: day.query,
        stayKind: day.noStay ? 'none' : day.kind,
        unconfirmed: !!day.unconfirmed,
        hut: !!day.hut,
        officialUrl: day.officialUrl || '',
        officialLabelEn: day.officialLabelEn || '',
        officialLabelZh: day.officialLabelZh || '',
        moveEn: day.moveEn || 'To verify',
        moveZh: day.moveZh || '待核'
      };
    });
  }
  function oneDayLink(route) {
    const ends = clean(pick(route.ends, true) || route.name);
    const parts = ends.split(/\s*(?:→|->)\s*/).map(s => s.trim()).filter(Boolean);
    const junk = /^(same|return|loop|car park|village|end of the trail)\b/i;
    const real = parts.filter(p => !junk.test(p) && !/\b(same|return|loop)\b/i.test(p) && !/end of the trail/i.test(p));
    const tidy = value => clean(String(value || '').replace(/\b(same|return|loop)\b/gi, ' ').replace(/end of the trail/gi, ' '));
    const start = tidy(real[0] || parts[0] || route.name);
    const finish = tidy(real.length > 1 ? real[real.length - 1] : start);
    const transport = route.mode === 'transit' || route.mode === 'drive';
    if (transport && start && finish) {
      return { dir: { origin: start, destination: finish, mode: route.mode === 'transit' ? 'transit' : 'driving' }, query: tidy(start + ' ' + finish) };
    }
    const query = tidy(start + ' ' + (route.name || '')) || route.name;
    return { query };
  }

  function milford(stages) {
    const bit = (i, en) => ((stages[i] || {})[en ? 'textEn' : 'textZh']) || '';
    return [
      { noStay: false, stayEn: 'Clinton Hut', stayZh: 'Clinton Hut', titleEn: 'Glade Wharf → Clinton Hut', titleZh: 'Glade Wharf → Clinton Hut', textEn: bit(0, true), textZh: bit(0, false), query: 'Clinton Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: 'To verify', moveZh: '待核' },
      { noStay: false, stayEn: 'Mintaro Hut', stayZh: 'Mintaro Hut', titleEn: 'Clinton Hut → Mintaro Hut', titleZh: 'Clinton Hut → Mintaro Hut', textEn: bit(1, true), textZh: bit(1, false), query: 'Mintaro Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: 'To verify', moveZh: '待核' },
      { noStay: false, stayEn: 'Dumpling Hut', stayZh: 'Dumpling Hut', titleEn: 'Mackinnon Pass → Dumpling Hut', titleZh: '翻 Mackinnon Pass → Dumpling Hut', textEn: bit(2, true), textZh: bit(2, false), query: 'Dumpling Hut Milford Track', stayKind: 'great-walk', hut: true, moveEn: 'To verify', moveZh: '待核' },
      { noStay: true, stayEn: '', stayZh: '', titleEn: 'To Sandfly Point, then the boat', titleZh: '到 Sandfly Point，再乘船', textEn: bit(3, true) + ' ' + bit(4, true), textZh: bit(3, false) + ' ' + bit(4, false), query: 'Sandfly Point Milford Track', stayKind: 'none', hut: false, moveEn: 'Boat out the same day', moveZh: '当天乘船离开' }
    ];
  }

  function routeDays(route) {
    if (!route) return [];
    const stages = (route.timeline || []).map(s => ({
      titleEn: pick(s.title, true), titleZh: pick(s.title, false),
      textEn: pick(s.text, true), textZh: pick(s.text, false)
    }));
    const time = Array.isArray(route.time) ? route.time : ['', ''];
    const planDays = Math.max(1, Number(route.planDays) || 1);
    if (route.id === 'milford-track') return milford(stages);
    if (STAYS[route.id]) return fromPlan(route, STAYS[route.id]);
    if (planDays <= 1) {
      const link = route.id === 'tranzalpine'
        ? { dir: { origin: 'Christchurch Railway Station', destination: 'Greymouth Railway Station', mode: 'transit' }, query: 'Christchurch Railway Station Greymouth Railway Station' }
        : oneDayLink(route);
      return [{
        noStay: true, stayEn: '', stayZh: '',
        titleEn: route.name, titleZh: route.zh || route.name,
        textEn: stages.map(s => s.textEn).filter(Boolean).join(' '),
        textZh: stages.map(s => s.textZh).filter(Boolean).join(' '),
        query: link.query, stayKind: 'none', hut: false,
        moveEn: time[0] || 'To verify', moveZh: time[1] || '待核',
        dir: link.dir || null
      }];
    }
    return [{
      noStay: true, stayEn: '', stayZh: '',
      titleEn: route.name, titleZh: route.zh || route.name,
      textEn: 'To verify', textZh: '待核',
      query: endsQuery(route), stayKind: 'none', hut: false,
      moveEn: 'To verify', moveZh: '待核'
    }];
  }

  return { routeDays, STAYS };
});
