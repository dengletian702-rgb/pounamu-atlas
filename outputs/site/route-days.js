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
      { stay: 'Luxmore Hut', zh: 'Luxmore Hut', kind: 'great-walk', hut: true, titleEn: 'Carpark → Brod Bay → Luxmore Hut', titleZh: '停车场 → Brod Bay → Luxmore Hut', noteEn: 'Brod Bay is on the way up. The Luxmore Cave side trip belongs to this day, not a day of its own. Night at Luxmore Hut.', noteZh: '途经 Brod Bay。Luxmore Cave 支线算在这一天，不另开一天。当晚住 Luxmore Hut。', query: 'Luxmore Hut' },
      { stay: 'Iris Burn Hut', zh: 'Iris Burn Hut', kind: 'great-walk', hut: true, titleEn: 'Luxmore Hut → Iris Burn Hut', titleZh: 'Luxmore Hut → Iris Burn Hut', noteEn: 'Along the tops to Iris Burn Hut.', noteZh: '沿山脊走到 Iris Burn Hut。', query: 'Iris Burn Hut Kepler Track' },
      { stay: 'Moturau Hut', zh: 'Moturau Hut', kind: 'great-walk', hut: true, titleEn: 'Iris Burn Hut → Moturau Hut', titleZh: 'Iris Burn Hut → Moturau Hut', noteEn: 'Down the Iris Burn to Moturau Hut.', noteZh: '沿 Iris Burn 下行，当晚住 Moturau Hut。', query: 'Moturau Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Rainbow Reach', titleZh: '到 Rainbow Reach 出山', noteEn: 'Walk out to Rainbow Reach or the Kepler carpark. No hut tonight.', noteZh: '走到 Rainbow Reach 或开普勒停车场出山，这一天不住。', query: 'Rainbow Reach Kepler Track' }
    ],
    'tongariro-northern-circuit': [
      { stay: 'Mangatepopo Hut', zh: 'Mangatepopo Hut', kind: 'great-walk', hut: true, titleEn: 'Whakapapa Village → Mangatepopo Hut', titleZh: 'Whakapapa Village → Mangatepopo Hut', noteEn: 'From Whakapapa Village to Mangatepopo Hut.', noteZh: '从 Whakapapa Village 到 Mangatepopo Hut。', query: 'Mangatepopo Hut' },
      { stay: 'Oturere Hut', zh: 'Oturere Hut', kind: 'great-walk', hut: true, titleEn: 'Mangatepopo Hut → Oturere Hut', titleZh: 'Mangatepopo Hut → Oturere Hut', noteEn: 'Emerald Lakes are on this day’s walk, not a separate day. Night at Oturere Hut.', noteZh: 'Emerald Lakes 写在这一天的路上，不单独成一天。当晚住 Oturere Hut。', query: 'Oturere Hut' },
      { stay: 'Waihohonu Hut', zh: 'Waihohonu Hut', kind: 'great-walk', hut: true, titleEn: 'Oturere Hut → Waihohonu Hut', titleZh: 'Oturere Hut → Waihohonu Hut', noteEn: 'On to Waihohonu Hut.', noteZh: '继续到 Waihohonu Hut。', query: 'Waihohonu Hut' },
      { noStay: true, kind: 'none', titleEn: 'Back to Whakapapa Village', titleZh: '回到 Whakapapa Village', noteEn: 'Walk back to Whakapapa Village. No hut tonight.', noteZh: '走回 Whakapapa Village，这一天不住。', query: 'Whakapapa Village' }
    ],
    'rakiura-track': [
      { stay: 'Port William Hut', zh: 'Port William Hut', kind: 'great-walk', hut: true, titleEn: 'Oban → Port William Hut', titleZh: 'Oban → Port William Hut', noteEn: 'From Oban and Lee Bay to Port William Hut.', noteZh: '从 Oban、Lee Bay 到 Port William Hut。', query: 'Port William Hut' },
      { stay: 'North Arm Hut', zh: 'North Arm Hut', kind: 'great-walk', hut: true, titleEn: 'Port William Hut → North Arm Hut', titleZh: 'Port William Hut → North Arm Hut', noteEn: 'Across to North Arm Hut.', noteZh: '走到 North Arm Hut。', query: 'North Arm Hut Rakiura' },
      { noStay: true, kind: 'none', titleEn: 'Back to Oban', titleZh: '回到 Oban', noteEn: 'Walk out to the Fern Gully road and back to Oban.', noteZh: '走到 Fern Gully，回到 Oban，这一天不住。', query: 'Oban Stewart Island' }
    ],
    'mueller-hut': [
      { stay: 'Mueller Hut', zh: 'Mueller Hut', kind: 'doc-hut', hut: true, titleEn: 'Village → Sealy Tarns → Mueller Hut', titleZh: '村庄 → Sealy Tarns → Mueller Hut', noteEn: 'Sealy Tarns is on the climb. Night at Mueller Hut.', noteZh: 'Sealy Tarns 在上山的路上。当晚住 Mueller Hut。', query: 'Mueller Hut' },
      { noStay: true, kind: 'none', titleEn: 'Back to Aoraki/Mount Cook Village', titleZh: '回到 Aoraki/Mount Cook Village', noteEn: 'Descend to Aoraki/Mount Cook Village.', noteZh: '下到 Aoraki/Mount Cook Village，这一天不住。', query: 'Aoraki Mount Cook Village' }
    ],
    'heaphy-track': [
      { stay: 'Perry Saddle Hut', zh: 'Perry Saddle Hut', kind: 'great-walk', hut: true, titleEn: 'Brown Hut → Perry Saddle Hut', titleZh: 'Brown Hut → Perry Saddle Hut', noteEn: 'From Brown Hut up to Perry Saddle Hut.', noteZh: '从 Brown Hut 上到 Perry Saddle Hut。', query: 'Perry Saddle Hut' },
      { stay: 'Gouland Downs Hut', zh: 'Gouland Downs Hut', kind: 'great-walk', hut: true, titleEn: 'Perry Saddle → Gouland Downs Hut', titleZh: 'Perry Saddle → Gouland Downs Hut', noteEn: 'Across the downs to Gouland Downs Hut.', noteZh: '穿过高地草甸，当晚住 Gouland Downs Hut。', query: 'Gouland Downs Hut' },
      { stay: 'Saxon Hut', zh: 'Saxon Hut', kind: 'great-walk', hut: true, titleEn: 'Gouland Downs Hut → Saxon Hut', titleZh: 'Gouland Downs Hut → Saxon Hut', noteEn: 'On to Saxon Hut.', noteZh: '继续到 Saxon Hut。', query: 'Saxon Hut Heaphy Track' },
      { stay: 'Heaphy Hut', zh: 'Heaphy Hut', kind: 'great-walk', hut: true, titleEn: 'Saxon Hut → Heaphy Hut', titleZh: 'Saxon Hut → Heaphy Hut', noteEn: 'Pass James Mackay Hut and Lewis Shelter on the way to Heaphy Hut. The night is Heaphy Hut.', noteZh: '途经 James Mackay Hut 和 Lewis Shelter，当晚住 Heaphy Hut。', query: 'Heaphy Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Kohaihai', titleZh: '到 Kohaihai 出山', noteEn: 'Walk out to the Kohaihai river mouth. No hut tonight.', noteZh: '走到 Kohaihai 河口出山，这一天不住。', query: 'Kohaihai Heaphy Track' }
    ],
    'queen-charlotte-track': [
      { stay: 'Resolution Bay Campsite', zh: 'Resolution Bay Campsite', kind: 'doc-camp', titleEn: 'Ship Cove → Resolution Bay', titleZh: 'Ship Cove → Resolution Bay', noteEn: 'DOC campsite at Resolution Bay. A lodge here would be a town stay, not this campsite price.', noteZh: '当晚是 Resolution Bay 的 DOC 营地。若改住客栈，按城里住宿另算。', query: 'Resolution Bay Campsite Queen Charlotte Track' },
      { stay: 'Schoolhouse Bay Campsite', zh: 'Schoolhouse Bay Campsite', kind: 'doc-camp', titleEn: 'Resolution Bay → Endeavour Inlet', titleZh: 'Resolution Bay → Endeavour Inlet', noteEn: 'DOC’s Schoolhouse Bay Campsite is at Endeavour Inlet.', noteZh: 'Endeavour Inlet 的 DOC 营地是 Schoolhouse Bay Campsite。', query: 'Schoolhouse Bay Campsite Queen Charlotte' },
      { stay: 'Camp Bay Campsite', zh: 'Camp Bay Campsite', kind: 'doc-camp', titleEn: 'Endeavour Inlet → Camp Bay', titleZh: 'Endeavour Inlet → Camp Bay', noteEn: 'DOC campsite at Camp Bay.', noteZh: '当晚住 Camp Bay 的 DOC 营地。', query: 'Camp Bay Campsite Queen Charlotte Track' },
      { noStay: true, kind: 'none', titleEn: 'Out to Anakiwa', titleZh: '到 Anakiwa 结束', noteEn: 'Walk out to Anakiwa. No overnight on this day.', noteZh: '走到 Anakiwa 结束，这一天不住。', query: 'Anakiwa' }
    ],
    'abel-tasman': [
      { stay: 'Anchorage Hut', zh: 'Anchorage Hut', kind: 'great-walk', hut: true, titleEn: 'Marahau → Anchorage', titleZh: 'Marahau → Anchorage', noteEn: 'Coastal forest to Anchorage Hut.', noteZh: '沿海岸林走到 Anchorage Hut。', query: 'Anchorage Hut Abel Tasman' },
      { stay: 'Bark Bay Hut', zh: 'Bark Bay Hut', kind: 'great-walk', hut: true, titleEn: 'Anchorage → Bark Bay', titleZh: 'Anchorage → Bark Bay', noteEn: 'On to Bark Bay Hut.', noteZh: '继续到 Bark Bay Hut。', query: 'Bark Bay Hut Abel Tasman' },
      { stay: 'Awaroa Hut', zh: 'Awaroa Hut', kind: 'great-walk', hut: true, titleEn: 'Bark Bay → Awaroa', titleZh: 'Bark Bay → Awaroa', noteEn: 'Check the tide for the Awaroa inlet. Night at Awaroa Hut.', noteZh: '过 Awaroa 湾口前先看潮汐。当晚住 Awaroa Hut。', query: 'Awaroa Hut Abel Tasman' },
      { noStay: true, kind: 'none', titleEn: 'Out to Wainui', titleZh: '到 Wainui 出山', noteEn: 'Walk out to Wainui. Tōtaranui is the other usual finish. No hut tonight.', noteZh: '走到 Wainui 出山。Tōtaranui 是另一个常用终点。这一天不住。', query: 'Wainui Abel Tasman' }
    ],
    'te-paki-coastal': [
      { stay: 'Pandora Campsite', zh: 'Pandora Campsite', kind: 'doc-camp', titleEn: 'Kapowairua → Pandora', titleZh: 'Kapowairua → Pandora', noteEn: 'First night at the Pandora DOC campsite.', noteZh: '第一晚住 Pandora 的 DOC 营地。', query: 'Pandora Campsite Te Paki' },
      { stay: 'Tapotupotu Campsite', zh: 'Tapotupotu Campsite', kind: 'doc-camp', titleEn: 'Pandora → Tapotupotu', titleZh: 'Pandora → Tapotupotu', noteEn: 'On to the Tapotupotu DOC campsite.', noteZh: '下一晚住 Tapotupotu 的 DOC 营地。', query: 'Tapotupotu Campsite' },
      { stay: 'Twilight Beach Campsite', zh: 'Twilight Beach Campsite', kind: 'doc-camp', titleEn: 'Cape Reinga → Twilight Beach', titleZh: 'Cape Reinga → Twilight Beach', noteEn: 'DOC campsite at Twilight Beach.', noteZh: '当晚住 Twilight Beach 的 DOC 营地。', query: 'Twilight Beach Campsite Te Paki' },
      { noStay: true, kind: 'none', titleEn: 'Out to Te Paki Stream', titleZh: '到 Te Paki Stream 结束', noteEn: 'Finish at Te Paki Stream. No camp booked for tonight.', noteZh: '在 Te Paki Stream 结束，这一天不扎营。', query: 'Te Paki Stream' }
    ],
    'ni-timber': [
      { stay: 'Piropiro Campsite', zh: 'Piropiro 营地', kind: 'doc-camp', titleEn: 'Pureora → Piropiro', titleZh: 'Pureora → Piropiro', noteEn: 'Ride the first day to the Piropiro campsite.', noteZh: '第一天骑到 Piropiro 营地。', query: 'Piropiro Campsite Timber Trail' },
      { noStay: true, kind: 'none', titleEn: 'Piropiro → Ongarue', titleZh: 'Piropiro → Ongarue', noteEn: 'Finish at Ongarue. No second camp on this day.', noteZh: '第二天骑到 Ongarue 结束，不再过夜。', query: 'Ongarue' }
    ],
    'ni-thermalexplorer': [
      { stay: 'Rotorua', zh: '罗托鲁瓦', kind: 'city', titleEn: 'Auckland → Rotorua', titleZh: '奥克兰 → 罗托鲁瓦', noteEn: 'Night in Rotorua. Wai-O-Tapu is a stop, not a place to stay.', noteZh: '当晚住罗托鲁瓦。Wai-O-Tapu 是停留点，不是住处。', query: 'Rotorua' },
      { stay: 'Taupō', zh: '陶波', kind: 'city', titleEn: 'Rotorua → Taupō', titleZh: '罗托鲁瓦 → 陶波', noteEn: 'Night in Taupō. Wai-O-Tapu is still only a stop on the way.', noteZh: '当晚住陶波。Wai-O-Tapu 仍然只是路上的停留。', query: 'Taupō' },
      { noStay: true, kind: 'none', titleEn: 'Taupō day', titleZh: '陶波这一天', noteEn: 'The route ends at Taupō. No further night is counted.', noteZh: '线路在陶波结束，不再加一晚。', query: 'Huka Falls' }
    ],
    'ni-twincoast-drive': [
      { stay: 'Omapere', zh: '奥马佩雷', kind: 'city', titleEn: 'Auckland → Hokianga', titleZh: '奥克兰 → 霍基昂加', noteEn: 'After Waipoua, the night is a Hokianga town. Omapere is the usual one; confirm the bed yourself.', noteZh: '过了 Waipoua，当晚住霍基昂加的镇。常见是奥马佩雷，床位请自己核对。', query: 'Omapere' },
      { stay: 'Paihia', zh: '派希亚', kind: 'city', titleEn: 'Hokianga → Bay of Islands', titleZh: '霍基昂加 → 岛屿湾', noteEn: 'Night in Paihia.', noteZh: '当晚住派希亚。', query: 'Paihia' },
      { stay: 'To verify', zh: '待核', kind: 'city', titleEn: 'Bay of Islands', titleZh: '岛屿湾', noteEn: 'The page names Waitangi and the water, not a second town. The night is to verify.', noteZh: '这一页写了怀唐伊和海边，没有写出第二个镇名，当晚待核。', query: 'Waitangi' },
      { noStay: true, kind: 'none', titleEn: 'Return via Whangārei', titleZh: '经旺阿雷返回', noteEn: 'Drive back through Whangārei. No extra night.', noteZh: '经旺阿雷返回，不再加一晚。', query: 'Whangārei' }
    ],
    'ni-coromandel': [
      { stay: 'Thames', zh: '泰晤士', kind: 'city', titleEn: 'Auckland → Thames', titleZh: '奥克兰 → 泰晤士', noteEn: 'Night in Thames.', noteZh: '当晚住泰晤士。', query: 'Thames Coromandel' },
      { stay: 'Whitianga', zh: '维蒂昂加', kind: 'city', titleEn: 'Thames coast → Mercury Bay', titleZh: '泰晤士海岸 → 水星湾', noteEn: 'Night in Whitianga. Hot Water Beach is a visit, not the stay.', noteZh: '当晚住维蒂昂加。热水海滩是去看的地方，不是住处。', query: 'Whitianga' },
      { noStay: true, kind: 'none', titleEn: 'Hahei, then back', titleZh: 'Hahei，然后返回', noteEn: 'Hahei in the morning, then the drive back. No extra night.', noteZh: '上午去 Hahei，然后开车返回，不再加一晚。', query: 'Hahei' }
    ],
    'ni-volcanicloop': [
      { stay: 'Ohakune', zh: '奥哈库内', kind: 'city', titleEn: 'Taupō → Whakapapa → Ohakune', titleZh: '陶波 → Whakapapa → 奥哈库内', noteEn: 'Night in Ohakune.', noteZh: '当晚住奥哈库内。', query: 'Ohakune' },
      { noStay: true, kind: 'none', titleEn: 'Back to Taupō', titleZh: '回到陶波', noteEn: 'Return across the Desert Road to Taupō.', noteZh: '经沙漠公路回到陶波，不再加一晚。', query: 'Taupō Desert Road' }
    ],
    catlins: [
      { stay: 'Owaka', zh: '奥瓦卡', kind: 'city', titleEn: 'Dunedin → the Catlins', titleZh: '但尼丁 → 卡特林斯', noteEn: 'Night in Owaka. Nugget Point is a stop, not the stay.', noteZh: '当晚住奥瓦卡。Nugget Point 是停留点，不是住处。', query: 'Owaka' },
      { noStay: true, kind: 'none', titleEn: 'On to Invercargill', titleZh: '继续到因弗卡吉尔', noteEn: 'Finish toward Invercargill. No second night on this page.', noteZh: '向因弗卡吉尔结束，这一页不再加一晚。', query: 'Invercargill' }
    ],
    aorakidrive: [
      { stay: 'Lake Tekapo', zh: '特卡波', kind: 'city', titleEn: 'Christchurch → Lake Tekapo', titleZh: '基督城 → 特卡波', noteEn: 'Night at Lake Tekapo.', noteZh: '当晚住特卡波。', query: 'Lake Tekapo' },
      { noStay: true, kind: 'none', titleEn: 'On to Aoraki/Mount Cook Village', titleZh: '继续到 Aoraki/Mount Cook Village', noteEn: 'The drive ends at the village. This page does not add another night.', noteZh: '车程在村庄结束，这一页不再加一晚。', query: 'Aoraki Mount Cook Village' }
    ],
    coastroad: [
      { stay: 'Kaikōura', zh: '凯库拉', kind: 'city', titleEn: 'Picton → Kaikōura', titleZh: '皮克顿 → 凯库拉', noteEn: 'Night in Kaikōura.', noteZh: '当晚住凯库拉。', query: 'Kaikōura' },
      { noStay: true, kind: 'none', titleEn: 'Kaikōura → Christchurch', titleZh: '凯库拉 → 基督城', noteEn: 'Drive on to Christchurch. No extra night.', noteZh: '继续开到基督城，不再加一晚。', query: 'Christchurch' }
    ],
    otago: [
      { stay: 'Ōmakau', zh: '奥马考', kind: 'city', titleEn: 'Clyde → Ōmakau', titleZh: 'Clyde → Ōmakau', noteEn: 'Night in Ōmakau.', noteZh: '当晚住 Ōmakau。', query: 'Omakau' },
      { stay: 'Ōtūrēhua', zh: '奥图雷华', kind: 'city', titleEn: 'Ōmakau → Ōtūrēhua', titleZh: 'Ōmakau → Ōtūrēhua', noteEn: 'Night in Ōtūrēhua.', noteZh: '当晚住 Ōtūrēhua。', query: 'Oturehua' },
      { stay: 'Ranfurly', zh: '兰弗利', kind: 'city', titleEn: 'Ōtūrēhua → Ranfurly', titleZh: 'Ōtūrēhua → Ranfurly', noteEn: 'Night in Ranfurly.', noteZh: '当晚住 Ranfurly。', query: 'Ranfurly' },
      { stay: 'Hyde', zh: '海德', kind: 'city', titleEn: 'Ranfurly → Hyde', titleZh: 'Ranfurly → Hyde', noteEn: 'Night in Hyde.', noteZh: '当晚住 Hyde。', query: 'Hyde Otago' },
      { noStay: true, kind: 'none', titleEn: 'Hyde → Middlemarch', titleZh: 'Hyde → Middlemarch', noteEn: 'Finish in Middlemarch.', noteZh: '在 Middlemarch 结束，不再加一晚。', query: 'Middlemarch' }
    ],
    'paparoa-track': [
      { stay: 'Moonlight Tops Hut', zh: 'Moonlight Tops Hut', kind: 'great-walk', hut: true, titleEn: 'Smoke-ho → Moonlight Tops Hut', titleZh: 'Smoke-ho → Moonlight Tops Hut', noteEn: 'Ces Clark Hut is on the way. The night on the usual 3-day booking is Moonlight Tops Hut. The Croesus Knob side trip is this day’s extra, not its own day.', noteZh: '途经 Ces Clark Hut。按常见的 3 天走法，当晚住 Moonlight Tops Hut。Croesus Knob 支线算在这一天。', query: 'Moonlight Tops Hut' },
      { stay: 'Pororari Hut', zh: 'Pororari Hut', kind: 'great-walk', hut: true, titleEn: 'Moonlight Tops Hut → Pororari Hut', titleZh: 'Moonlight Tops Hut → Pororari Hut', noteEn: 'Down to Pororari Hut.', noteZh: '下行到 Pororari Hut。', query: 'Pororari Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Punakaiki', titleZh: '到 Punakaiki 出山', noteEn: 'Walk out along the Pororari River to Punakaiki.', noteZh: '沿 Pororari 河走到 Punakaiki 出山。', query: 'Punakaiki' }
    ],
    'lake-waikaremoana': [
      { stay: 'Panekire Hut', zh: 'Panekire Hut', kind: 'great-walk', hut: true, titleEn: 'Onepoto → Panekire Hut', titleZh: 'Onepoto → Panekire Hut', noteEn: 'Up the Panekire bluff to Panekire Hut.', noteZh: '登上 Panekire 崖，当晚住 Panekire Hut。', query: 'Panekire Hut' },
      { stay: 'Waiopaoa Hut', zh: 'Waiopaoa Hut', kind: 'great-walk', hut: true, titleEn: 'Panekire Hut → Waiopaoa Hut', titleZh: 'Panekire Hut → Waiopaoa Hut', noteEn: 'Down to Waiopaoa Hut.', noteZh: '下行到 Waiopaoa Hut。', query: 'Waiopaoa Hut' },
      { stay: 'Waiharuru Hut', zh: 'Waiharuru Hut', kind: 'great-walk', hut: true, titleEn: 'Waiopaoa → Waiharuru Hut', titleZh: 'Waiopaoa → Waiharuru Hut', noteEn: 'Korokoro Falls is a side trip on the way, not its own day. Night at Waiharuru Hut.', noteZh: 'Korokoro 瀑布是路上的支线，不单独成一天。当晚住 Waiharuru Hut。', query: 'Waiharuru Hut' },
      { noStay: true, kind: 'none', titleEn: 'Out to Hopuruahine', titleZh: '到 Hopuruahine 出山', noteEn: 'Walk out to Hopuruahine Landing.', noteZh: '走到 Hopuruahine 码头出山。', query: 'Hopuruahine Landing' }
    ],
    'hump-ridge-track': [
      { stay: 'Okaka Lodge', zh: 'Okaka Lodge', kind: 'great-walk', hut: true, titleEn: 'Rarakau → Okaka Lodge', titleZh: 'Rarakau → Okaka Lodge', noteEn: 'First night of the Hump Ridge Great Walk is Okaka Lodge.', noteZh: 'Hump Ridge 大步道第一晚是 Okaka Lodge。', query: 'Okaka Lodge Hump Ridge' },
      { stay: 'Port Craig Lodge', zh: 'Port Craig Lodge', kind: 'great-walk', hut: true, titleEn: 'Okaka Lodge → Port Craig Lodge', titleZh: 'Okaka Lodge → Port Craig Lodge', noteEn: 'Second night is Port Craig Lodge.', noteZh: '第二晚是 Port Craig Lodge。', query: 'Port Craig Lodge' },
      { noStay: true, kind: 'none', titleEn: 'Back to Rarakau', titleZh: '回到 Rarakau', noteEn: 'Walk back to the Rarakau car park.', noteZh: '走回 Rarakau 停车场。', query: 'Rarakau car park' }
    ],
    'whanganui-journey': [
      { stay: 'Ohinepane Campsite', zh: 'Ohinepane Campsite', kind: 'great-walk', titleEn: 'Taumarunui → Ohinepane Campsite', titleZh: '陶马鲁努伊 → Ohinepane Campsite', noteEn: 'Great Walk campsite. The dollar figure is still to verify.', noteZh: '这是 Great Walk 营地，金额仍待核。', query: 'Ohinepane Campsite' },
      { stay: 'Whakahoro Campsite', zh: 'Whakahoro Campsite', kind: 'great-walk', titleEn: 'Ohinepane → Whakahoro', titleZh: 'Ohinepane → Whakahoro', noteEn: 'Night at Whakahoro. Great Walk price, still to verify.', noteZh: '当晚在 Whakahoro。Great Walk 价格仍待核。', query: 'Whakahoro Campsite' },
      { stay: 'John Coull Hut', zh: 'John Coull Hut', kind: 'great-walk', hut: true, titleEn: 'Whakahoro → John Coull Hut', titleZh: 'Whakahoro → John Coull Hut', noteEn: 'Night at John Coull Hut.', noteZh: '当晚住 John Coull Hut。', query: 'John Coull Hut' },
      { stay: 'Tīeke Kāinga', zh: 'Tīeke Kāinga', kind: 'city', titleEn: 'John Coull Hut → Tīeke Kāinga', titleZh: 'John Coull Hut → Tīeke Kāinga', noteEn: 'Tīeke Kāinga is a marae stay on the river, not a DOC hut fee.', noteZh: 'Tīeke Kāinga 是河边的马拉埃住处，不是 DOC 小屋价。', query: 'Tieke Kainga Whanganui' },
      { noStay: true, kind: 'none', titleEn: 'Out at Pipiriki', titleZh: '在 Pipiriki 起水', noteEn: 'Take out at Pipiriki.', noteZh: '在 Pipiriki 起水，这一天不再过夜。', query: 'Pipiriki' }
    ]
  };

  function endsQuery(route) {
    const ends = clean(pick(route.ends, true) || route.name);
    const parts = ends.split(/\s*(?:→|->)\s*/).map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || ends;
  }

  function fromPlan(route, plan) {
    return plan.map(day => ({
      noStay: !!day.noStay,
      stayEn: day.noStay ? '' : day.stay,
      stayZh: day.noStay ? '' : (day.zh || day.stay),
      titleEn: day.titleEn,
      titleZh: day.titleZh,
      textEn: day.noteEn,
      textZh: day.noteZh,
      query: day.query,
      stayKind: day.noStay ? 'none' : day.kind,
      hut: !!day.hut,
      moveEn: day.moveEn || 'To verify',
      moveZh: day.moveZh || '待核'
    }));
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
      return [{
        noStay: true, stayEn: '', stayZh: '',
        titleEn: route.name, titleZh: route.zh || route.name,
        textEn: stages.map(s => s.textEn).filter(Boolean).join(' '),
        textZh: stages.map(s => s.textZh).filter(Boolean).join(' '),
        query: endsQuery(route), stayKind: 'none', hut: false,
        moveEn: time[0] || 'To verify', moveZh: time[1] || '待核',
        dir: route.id === 'tranzalpine' ? { origin: 'Christchurch Railway Station', destination: 'Greymouth Railway Station', mode: 'transit' } : null
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
