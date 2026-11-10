结论：精选路线共 79 条（北岛 34、南岛 45），7 项字段全部核实的有 9 条；应核字段 553 个，已核 253 个，缺口 300 个。DOC 全量目录 1349 条（北 597、南 748、其他 4），用时为数据集原值、距离为空，全部标「待核实」。

# 数据状态 / Data status（生成于 2026-11-10，scripts/data-status.mjs）

## 计数方法

- 数据文件：`outputs/route-catalogue.json`（与线上 `docs/app.js` 中的 `routes` 相同，由 `scripts/build-site.mjs` 写入）。
- 每条路线核 7 项字段：时长 `time`、距离 `distance`、难度 `level`、季节与封闭 `season`、预订 `booking`、交通 `access`、安全提示 `safety`。
- 一项字段算「已核」的条件：`fieldSources[字段]` 里有来源 URL、核查日期和官方原句，并且 `scripts/apply-facts.mjs` 在 `data/evidence/<id>.json`（当天抓回的官方页面摘录）中找到了这句原文。
- 其余字段一律进 `verify[]`，页面显示「待核实 / To verify」，计为缺口。有编辑文字但没有官方原句的，也算缺口。
- 「全核」= `verify[]` 为空（7/7）。
- 南北岛按路线的 `island` 字段分；DOC 目录的南北岛按坐标规则分（见 `data/doc-tracks.json` 的 `meta.notes`）。
- 复算：`node scripts/apply-facts.mjs && node scripts/data-status.mjs`。

## 精选路线

| 范围 | 路线数 | 全核（7/7） | 缺时长 | 缺距离 | 缺难度 | 缺季节/封闭 | 缺预订 | 缺交通 | 缺安全提示 | 缺口合计 / 应核字段 | 缺实景照片 | 英文有而中文缺的节奏 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 全部 | 79 | 9 | 17 | 24 | 26 | 64 | 59 | 54 | 56 | 300 / 553 | 0 | 0 |
| 北岛 | 34 | 3 | 9 | 12 | 13 | 29 | 28 | 26 | 25 | 142 / 238 | 0 | 0 |
| 南岛 | 45 | 6 | 8 | 12 | 13 | 35 | 31 | 28 | 31 | 158 / 315 | 0 | 0 |
| 北岛 · walk | 15 | 2 | 0 | 0 | 1 | 12 | 10 | 11 | 8 | 42 / 105 | 0 | 0 |
| 北岛 · cycle | 6 | 0 | 0 | 0 | 0 | 6 | 6 | 6 | 5 | 23 / 42 | 0 | 0 |
| 北岛 · drive | 6 | 0 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 42 / 42 | 0 | 0 |
| 北岛 · transit | 6 | 0 | 3 | 6 | 6 | 5 | 6 | 3 | 6 | 35 / 42 | 0 | 0 |
| 北岛 · paddle | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 7 | 0 | 0 |
| 南岛 · walk | 27 | 6 | 0 | 1 | 1 | 18 | 13 | 15 | 14 | 62 / 189 | 0 | 0 |
| 南岛 · cycle | 6 | 0 | 1 | 0 | 0 | 6 | 6 | 5 | 5 | 23 / 42 | 0 | 0 |
| 南岛 · drive | 6 | 0 | 5 | 5 | 6 | 6 | 6 | 5 | 6 | 39 / 42 | 0 | 0 |
| 南岛 · transit | 6 | 0 | 2 | 6 | 6 | 5 | 6 | 3 | 6 | 34 / 42 | 0 | 0 |
| 南岛 · paddle | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 | 0 |

## 逐条缺口

| id | 岛 | 方式 | 已核 | 待核实字段 |
|---|---|---|---|---|
| `ni-rangitoto` | 北 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `ni-taranaki-falls` | 北 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-huka` | 北 | walk | 4/7 | 季节/封闭、预订、交通 |
| `ni-manaia` | 北 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-rotopounamu` | 北 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-escarpment` | 北 | walk | 2/7 | 难度、季节/封闭、预订、交通、安全提示 |
| `ni-hauraki` | 北 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-k2k` | 北 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-timber` | 北 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-remutaka` | 北 | cycle | 4/7 | 季节/封闭、预订、交通 |
| `ni-twincoast` | 北 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-motu-dunes` | 北 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `ni-twincoast-drive` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-coromandel` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-thermalexplorer` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-forgottenworld` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-volcanicloop` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-martinborough` | 北 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-northernexplorer` | 北 | transit | 1/7 | 时长、距离、难度、预订、交通、安全提示 |
| `ni-wellingtonnapier` | 北 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `ni-rotoruataupo` | 北 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `ni-kapitirail` | 北 | transit | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-devonportferry` | 北 | transit | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `ni-aucklandpaihia` | 北 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `hooker` | 南 | walk | 4/7 | 季节/封闭、预订、安全提示 |
| `keysummit` | 南 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `gunn` | 南 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `bridle` | 南 | walk | 1/7 | 距离、难度、季节/封闭、预订、交通、安全提示 |
| `matheson` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `punchbowl` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `otago` | 南 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `wilderness` | 南 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `greattaste` | 南 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `alps2ocean` | 南 | cycle | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `queenstowncycle` | 南 | cycle | 5/7 | 季节/封闭、预订 |
| `dunstan` | 南 | cycle | 2/7 | 时长、季节/封闭、预订、交通、安全提示 |
| `milford` | 南 | drive | 1/7 | 时长、难度、季节/封闭、预订、交通、安全提示 |
| `arthurs` | 南 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `coastroad` | 南 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `catlins` | 南 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `haast` | 南 | drive | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `aorakidrive` | 南 | drive | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `tranzalpine` | 南 | transit | 0/7 | 时长、距离、难度、季节/封闭、预订、交通、安全提示 |
| `coastal` | 南 | transit | 1/7 | 时长、距离、难度、预订、交通、安全提示 |
| `bus` | 南 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `pictonnelson` | 南 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `teanaubus` | 南 | transit | 2/7 | 距离、难度、季节/封闭、预订、安全提示 |
| `dunedinbus` | 南 | transit | 1/7 | 距离、难度、季节/封闭、预订、交通、安全提示 |
| `tongariro-crossing` | 北 | walk | 7/7 | 无 |
| `abel-tasman` | 南 | walk | 6/7 | 季节/封闭 |
| `roys-peak` | 南 | walk | 6/7 | 预订 |
| `routeburn-track` | 南 | walk | 7/7 | 无 |
| `milford-track` | 南 | walk | 7/7 | 无 |
| `kepler-track` | 南 | walk | 7/7 | 无 |
| `heaphy-track` | 南 | walk | 7/7 | 无 |
| `paparoa-track` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `rakiura-track` | 南 | walk | 6/7 | 季节/封闭 |
| `hump-ridge-track` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `queen-charlotte-track` | 南 | walk | 7/7 | 无 |
| `mueller-hut` | 南 | walk | 7/7 | 无 |
| `tasman-glacier-view` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `lake-marian` | 南 | walk | 4/7 | 季节/封闭、预订、交通 |
| `franz-josef-glacier-walk` | 南 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `pancake-rocks` | 南 | walk | 4/7 | 季节/封闭、预订、安全提示 |
| `hokitika-gorge` | 南 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `ben-lomond` | 南 | walk | 4/7 | 季节/封闭、预订、交通 |
| `isthmus-peak` | 南 | walk | 6/7 | 预订 |
| `avalanche-peak` | 南 | walk | 4/7 | 预订、交通、安全提示 |
| `waikoropupu-springs` | 南 | walk | 4/7 | 季节/封闭、预订、交通 |
| `mount-robert-circuit` | 南 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `tongariro-northern-circuit` | 北 | walk | 7/7 | 无 |
| `lake-waikaremoana` | 北 | walk | 4/7 | 季节/封闭、交通、安全提示 |
| `pouakai-crossing` | 北 | walk | 5/7 | 季节/封闭、预订 |
| `cathedral-cove` | 北 | walk | 6/7 | 季节/封闭 |
| `tane-mahuta` | 北 | walk | 4/7 | 预订、交通、安全提示 |
| `pinnacles-kauaeranga` | 北 | walk | 3/7 | 季节/封闭、预订、交通、安全提示 |
| `tama-lakes` | 北 | walk | 4/7 | 季节/封闭、预订、交通 |
| `te-paki-coastal` | 北 | walk | 4/7 | 季节/封闭、预订、交通 |
| `whanganui-journey` | 北 | paddle | 7/7 | 无 |

## DOC 全量步道目录

- 数据集：DOC Walking and Tramping Experiences – locations（读取于 2026-11-10；DOC 已标停更，数据装载日期 2025-12-02）。
- 条数：1349（北岛 597、南岛 748、其他岛屿 4）。
- 有用时（数据集原值，未回页核对）：1299；有距离：0（数据集不提供）；有中文名：0。三项都标「待核实」。
- 开闭状态：1346 条按位置匹配到 DOC Tracks 路段（读取于 2026-11-10，共 3265 段，其中关闭 138 段）；69 条含关闭路段。页面写明以 DOC 实时公告为准。
- 与精选路线对上的：36 条。
