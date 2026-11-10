结论：v3 把「字段级出处 + 待核实徽标」做成了机制，复核报告点出的错误都已改，但数据远没有全核：78 条精选路线里 7 项字段全核的只有 8 条（应核 546 个字段，已核 246 个，缺口 300 个），规划器 56 段公路里 55 段仍是估算值。本版只在本地分支 `data-sources-v3`，没有 push，没有部署，不能对外说「已全部核实」。

---

# CHANGES v3（2026-11-10，站点负责人 CC）

- 底稿：GitHub 公开版 main `0413887`，克隆到 `~/Documents/James-Projects/pounamu-atlas-v3/`，分支 `data-sources-v3`。
- 依据：`~/Documents/James-Projects/pounamu-review/SENTINEL-SOURCES-REVIEW-v1.md`。下面的编号就是报告里的问题编号。
- 启动：`node scripts/serve.mjs`，打开 http://127.0.0.1:4873/ （只读静态预览，不读任何密钥；Jev 推荐在这个预览里不可用，规划器走本地规则）。
- 数据状态统计：`outputs/DATA-STATUS.md`（含计数方法，南北岛分开）。
- 截图：`screenshots/v3/`，9 个页面 × 1440 和 390 两种宽度，共 18 张。

## 一、这一版怎么保证「不编造」

1. `scripts/fetch-evidence.mjs` 把每条路线的官方页面抓回来，存成短摘录（`data/evidence/<id>.json`，带抓取时间）。
2. `data/field-facts.json` 里每个值都配官方原句和来源 URL。
3. `scripts/apply-facts.mjs` 逐条检查：原句必须能在当天抓回的那个页面摘录里找到，否则这个字段不算已核，进 `verify[]`。本版 246 个字段全部通过这一步。
4. 没有官方原句的字段，即使有编辑文字，也一律显示「待核实 / To verify」。

例外一处，已在数据里注明：SH94 的 120 km 出自 DOC 小册子 PDF，本机读不出 PDF 文字，原句用的是 Sentinel 报告第 6 节记录的那一句（`data/evidence/milford.json` 里标 `manual: true`）。

## 二、逐条对应复核报告

### 第 1 节：来源

| 编号 | 问题 | 怎么改的 | 状态 |
|---|---|---|---|
| 1.1 | 字段没有出处，未核字段被隐藏 | 每条路线 7 项字段（时长、距离、难度、季节与封闭、预订、交通、安全提示）都有 `fieldSources`（URL、核查日期、官方原句）或进 `verify[]`。路线页：顶部事实栏、侧栏、「字段核查」表都显示「已核 日期 · 来源」或「待核实」，空值不再隐藏；卡片上写「7 项中有 N 项尚未核实」。`verifiedFields` 由脚本生成，和 `verify[]` 互补 | 机制完成；数据缺口 300 个 |
| 1.2 | 规划器 56 段公路无逐段出处，`ROAD_SOURCES` 没被引用 | 每段在 `EDGE_SOURCES` 里有一条来源记录，页面每段后面标「估算值」，结果下方写明「路段时间和里程都是估算值」并列出 `ROAD_SOURCES` 的 5 个来源（现在真正被引用）。逐段清单见 `outputs/PLANNER-ROAD-SOURCES.md` | **未完成**：55 段没有在 NZTA Journey Planner 逐段读数，核查日期留空。原因见第四节 |
| 1.3 | 坐标参照 mapcarta 和 Google Maps | 三处参照全部去掉。Taranaki Falls、Kawakawa Bay（陶波）改用 NZGB 地名录坐标（name ID 41646、24833），标 `gazetteer`。Orakau 停车场不是公告地名，LINZ 和 DOC 都查不到坐标，保留手工位置并注明待核实 | 完成 |
| 1.4 | 安全提示无出处，没有 111 和官方安全源 | 每条路线新增「安全」一节：紧急情况拨 111、该线路官方页面、DOC 公告（步行）/ NZCT（骑行）/ NZTA 路况（自驾）、Mountain Safety Council、MetService 预警。「出发准备」页也加了同一组链接。安全提示本身作为第 7 项字段核实，有 22 条配了官方原句 | 链接全部到位；56 条的安全提示文字仍待核实。AdventureSmart 仍 403，没有收 |
| 1.5 | 毛利语名称无出处，无文化审阅 | 没有做。只在 `outputs/ZH-PLACE-NAMES.md` 记下待办 | **未做**，需文化顾问，转 Lex |
| 1.6 | 部分出处不是一手来源 | 135 个来源链接逐个标了用途：一手来源 105、仅用于看点 28、仅作背景 2（NZTA OIA 回函、OurAuckland 新闻稿），页面和 `ROUTE-SOURCES.md` 上都显示。已核的距离、时长、开放规则只取自 DOC、NZCT、DOC/议会/运营方自己的页面。区域旅游局页面上的里程（如 Haast 142 km）没有采用，对应字段留「待核实」 | 完成 |
| 1.7 | 两个 DOC PDF 404 | Hooker、Taranaki Falls 的 PDF 出处已删，改用 DOC 路线页 | 完成 |
| 1.8 | 来源清单不全，路线数量矛盾 | `outputs/ROUTE-SOURCES.md` 改由 `scripts/gen-sources.mjs` 从数据生成，78 条一条不漏（原先漏的 5 条已在内）。页面文案里的 48、Forty-eight、「24 份线路手记」都改成从数据读取的 `{routes}`；HTML 的 meta 描述去掉了写死的 53；`MAP-SOURCES.md` 的 48 已更正 | 完成 |
| 1.9 | Metlink 旧 PDF | 两个固定日期的 PDF 换成线路页 `metlink.org.nz/service/KPL` 和 `/service/280` | 完成 |

### 第 2 节：会过期的信息

| 编号 | 怎么改的 | 状态 |
|---|---|---|
| 2.1 | 大步道季节日期和预订规则写进了 `season` / `booking`，都带官方原句：Milford、Routeburn（2026-11-01 至 2027-04-30）、Kepler（10-27 起）、Tongariro Northern Circuit（10-23 起）。价格没有写进站内 | 完成；价格仍未收 |
| 2.2 | Roys Peak 写明每年 10 月 1 日至 11 月 10 日产羔封闭、11 月 11 日重开，附 DOC 链接。同样写清的季节性封闭：Isthmus Peak（11 月 20 日至 12 月 20 日）、Tongariro Northern Circuit（山火后一段关闭）、Queen Charlotte（极端干旱可能关闭）、Tāne Mahuta（每天 9–16 点）、Coastal Pacific（9 月 1 日至 4 月 30 日）。另从 DOC Tracks 拉了开闭状态，页面写明以 DOC 实时公告为准 | 完成。注意：DOC Tracks 把 Roys Peak 标为开放，和季节性封闭不一致，所以状态只能作参考 |
| 2.3 | 12 条骑行道的距离、时长、分级都按 NZCT 路线页核了（Lake Dunstan 的时长除外，官方只有分段值） | 基本完成 |
| 2.4 | 北岛 6 条自驾的距离和时长仍然全空，标「待核实」 | **未完成** |
| 2.5 | Northern Explorer 的季节改成能核实的发车日；原来写的「12 月 25 日至 1 月 11 日停运」在官方页找不到，已删掉，改为提示去查 Great Journeys | 部分完成 |
| 2.6 | Hooker 和 Mueller Hut 的停车收费、Tongariro 的接驳预订都带官方原句 | 完成 |
| 2.7–2.9 | 没有改动 | — |

### 第 3 节：数据状态

| 编号 | 怎么改的 |
|---|---|
| 3.1 | 对外口径以本仓库为准：`outputs/DATA-STATUS.md`，README 顶部同步。不再引用「52 条 / 13 条全核」 |
| 3.2 | 报告缺口表里的时长、距离缺口：步行和骑行类已按官方值补齐；自驾和公交类大多仍缺。逐条缺口见 `DATA-STATUS.md` |

当前数字（`node scripts/data-status.mjs`）：

| 范围 | 路线数 | 全核 | 缺时长 | 缺距离 | 缺难度 | 缺季节 | 缺预订 | 缺交通 | 缺安全 | 缺口 / 应核 |
|---|---|---|---|---|---|---|---|---|---|---|
| 全部 | 78 | 8 | 17 | 24 | 26 | 64 | 59 | 54 | 56 | 300 / 546 |
| 北岛 | 33 | 2 | 9 | 12 | 13 | 29 | 28 | 26 | 25 | 142 / 231 |
| 南岛 | 45 | 6 | 8 | 12 | 13 | 35 | 31 | 28 | 31 | 158 / 315 |

全核的 8 条：Tongariro Alpine Crossing、Tongariro Northern Circuit（北）；Routeburn、Milford、Kepler、Heaphy、Queen Charlotte、Mueller Hut（南）。

### 第 4 节：图片和地图授权

| 编号 | 怎么改的 | 状态 |
|---|---|---|
| 4.2 | 没有改页面署名格式（是否要显示原作品标题） | 待 Lex |
| 4.3 | `hero-south.webp` 查到来源了：和 `hero-south-source.webp` 是同一张照片（Lake Pukaki & Aoraki Mount Cook 01.jpg，Krzysztof Golik，CC BY-SA 4.0），两图比对一致，许可用 Commons API 核过，已补进 `IMAGE-CREDITS.md`。文件没有被任何页面引用，没有删 | 完成 |
| 4.4 | `IMAGE-CREDITS.md` 里 41 处不存在的 `site/assets/*.jpg` 改成实际的 webp 路径；`AI-ART-DIRECTION.md` 注明 AI 原图不在仓库 | 完成 |
| 4.5 | 路线地图和规划器地图的 LINZ 署名改成 LINZ 推荐的完整句式，并列出数据集名称 | 完成，措辞待 Lex |
| 4.6 | 海岸线仍是 Environment Canterbury 的再分发快照，没有改从 LDS 直接下载 | 未做 |
| 4.9 | 新增 `CONTENT-LICENSE.md`：MIT 只管代码；自有文字、数据、自绘图按 CC BY 4.0；DOC、LINZ、OSM、Commons 素材按原许可，逐项写数据集名称、来源、许可链接和改动。每页页脚加了一句许可和署名，链接到站内的许可页 | 完成，**CC BY 4.0 是我的草拟，需乐天和 Lex 确认** |
| 附录 B | CC0 许可链接从报 500 的 http 地址改成 https 地址 | 完成 |

### 第 5 节：更新流程

| 编号 | 怎么改的 |
|---|---|
| 5.1 | 新增可重复运行的脚本：`fetch-evidence`（抓官方页）、`apply-facts`（校验并合并）、`import-doc`（DOC 开放数据）、`fetch-sports`（OSM）、`gen-sources`（来源清单）、`data-status`（统计）、`check-links`（链接检查）、`build-site`（写入站点并同步副本）。每个已核字段都有 `checkedAt`。本次链接检查：145 个链接，200 ×130、403 ×11、超时 ×3（thecoromandel.nz）、404 ×1（许可页链接，已改成站内相对链接）。见 `outputs/LINK-CHECK.md` |

### 第 6 节：抽查出的错误

| 问题 | 怎么改的 |
|---|---|
| Routeburn 33.1 km（错） | 改为 33 km，带 DOC 原句 |
| SH94 118 km（错） | 路线和规划器都改为 120 km |
| 两个出处失效 | 见 1.7 |
| Hooker 核实标记缺失 | 时长、距离、难度、交通已核 |
| 20 处遗漏 | 报告表里的官方值全部补入并带原句：Rangitoto、Taranaki Falls、Huka、Manaia、Rotopounamu、Key Summit、Lake Gunn、Matheson、Punchbowl 的距离和时长；Tongariro 的难度；Abel Tasman 的 4 间小屋 18 处营地；Roys Peak 的封闭和难度；Routeburn、Milford 的小屋、季节日期和禁止露营；Remutaka、K2K、Timber、Alps 2 Ocean、Otago 的距离、时长、分级。**没补上的一处**：Northland 自驾的 695 km / 10 小时 15 分，newzealand.com 对脚本返回 403，没能取到原句，仍标待核实 |
| 6.1 中文时间轴的分钟数无出处 | Rangitoto、Escarpment 共 8 处，中英两边都改成「出发后约 X（编辑估算）」 |
| 6.2 `P10_WISH_TIPS` 无出处 | 没有改，仍无出处 |

### 第 7 节：DOC 全量导入

| 项 | 做了什么 |
|---|---|
| 导入脚本 | `scripts/import-doc.mjs`，输出 `data/doc-tracks.json`（站点用同一份 `docs/data/doc-tracks.json`）。保留 DOC 的 GUID 和 OBJECTID、DOC 页面 URL、许可、读取日期 |
| 条数 | 1,349 条：北岛 597、南岛 748、其他岛屿 4（报告是 594 / 748 / 7，差别来自我把远岛的界线定得更窄） |
| 用时 | 保留 DOC 数据集原值，页面逐条标「待核实」，没有当成我们的时长 |
| 距离、中文名 | 都是空，标「待核实」。数据集没有距离，线长不是步行距离；1,349 个中文名没有翻 |
| 地区 | 数据集没有地区字段。脚本逐条跟随 DOC 永久链接，从最终网址里读出 DOC 自己的地区，20 个地区，1 条归不了类 |
| 开闭状态 | 取自 DOC Tracks（3,265 段，关闭 138 段），按位置匹配：1,346 条匹配上，69 条含关闭路段。页面顶部写明「以 DOC 实时公告为准」 |
| 目录页 | `tracks.html`：按岛屿、地区、用时筛选，按名称搜索；每条有名称、地区、用时或距离（标注来源）、难度、状态、DOC 链接 |
| 精选路线 | 按报告 7.5 补了 25 条（南岛 17、北岛 8），含北岛的 Tongariro Northern Circuit 和 Lake Waikaremoana。分段的时间和距离直接取自 DOC 页面。北岛步行类从 7 条增到 15 条，南岛从 10 条增到 27 条 |

没做的：**Whanganui Journey** 是划船线路，现有四种出行方式放不下，没有收，等乐天决定要不要加「划船」类别。25 条新路线里有 14 条没有可授权的实景照片，用了统一的示意图；另 11 条里 5 条从 v2 搬来照片（署名用 Commons API 重核过），6 条用同一地点或同一国家公园的已有照片。

### 第 8 节：数据源

距离、时长、开放规则只用 DOC、NZCT、DOC 小册子、运营方和议会自己的页面。AllTrails、Tramper 没有使用，也没有拷贝任何内容。OpenStreetMap 只用于运动板块，数据文件单独存放。

### 第 9 节：中文

| 编号 | 怎么改的 | 状态 |
|---|---|---|
| 9.1 | 每个出处都加了中文标签 `labelZh`，中文页面显示中文标签 | 完成 |
| 9.2 | 11 处中英数字不一致：8 处时间轴见 6.1；`102 Hobson Street` 中文已补；「沿 SH5」「穿越 SH6」两处多写的道路编号已从中文里去掉。逐字段比对后，剩下的差异都是月份和「三间」这类中文数字写法造成的 | 完成 |
| 9.3 | 7 组译名统一，共替换 86 处：内皮尔、蒂卡普（湖）、亚瑟通道、奥拉基／库克山、罗托鲁瓦、夏洛特女王湾、塔斯曼美味骑行。前 4 组有官方依据；后 3 组官方中文查不到，沿用站内多数写法，标待核实。译名表：`outputs/ZH-PLACE-NAMES.md` | 完成，3 组待核实 |
| 9.4 | 14 条只有英文的「节奏」已补中文。现在没有「英文有、中文缺」的字段 | 完成 |
| 9.5 | 写了译名依据。25 条新路线的中文名是编辑译名，没有逐一对照官方中文站 | 部分完成 |

## 三、运动板块（新增）

- 规格先写：`docs/SPORTS-SPEC.md`。
- 数据：`scripts/fetch-sports.mjs` 一次 Overpass 请求抓全国，存成静态 JSON，前端不实时请求。全国 4,545 处场地（网球 2,914、高尔夫 417、篮球 1,214）。OSM 数据时间戳 2026-11-10。
- 城市页：16 座城市（要求的 8 座 + Hamilton、Tauranga、Napier、New Plymouth、Palmerston North、Whangārei、Invercargill、Wānaka），按半径查，可按运动类型筛选。市中心坐标取自 OSM 地点节点。
- 路线页：77 条路线有沿线缓冲区结果（步行 2 km、骑行 3 km、自驾和公交 5 km）；Heaphy Track 没有可用的线路坐标，页面如实说明。
- 卡片：名称、类型、地址或坐标、是否公共、灯光、场地数或洞数、地面、距离、OSM 链接。有数据才显示。
- 署名：每个列表下方写「© OpenStreetMap contributors」和 ODbL 链接。
- 照片：只在 OSM 条目自己链接了 Commons 照片时才用，全国只有 4 处高尔夫球场符合，逐张署名见 `outputs/SPORTS-IMAGE-CREDITS.md`；其余全部用统一的示意图并写明「仅为示意图」。没有用 AI 图。
- 数据质量的实情：4,545 处里只有 553 处有名称、53 处有地址、974 处有开放情况。多数卡片只能显示「OpenStreetMap 中未命名」和坐标。

## 四、没做完的和需要决定的

**Blocker**

1. 规划器 55 段公路没有逐段核。NZTA Journey Planner 的路线计算走的是带 NZTA 自己密钥的 Google 接口，不适合用脚本批量取数。要么人工逐段读，要么乐天同意我用浏览器一段一段手动查并记日期。
2. 自驾类 12 条路线的距离和时长基本都缺。newzealand.com 对脚本返回 403，区域旅游局的数字按规则不能用。
3. v2 那 13 条全核路线：11 条在本版有对应路线，我没有直接搬 v2 的数值，而是按今天的官方页重新核；逐字段对比后距离、时长、难度没有一处冲突。另 2 条（`heaphy-bike` 冬季骑行、`metro-christchurch` 基督城公交）公开版里没有对应路线，没有搬。v2 里一些细节（如 Queen Charlotte 的 QCTLC 通行证、Hooker 的具体停车费）今天没有重新取到原句，没有带过来。

**Decision needed（乐天）**

1. 自有文字和数据按 CC BY 4.0 发布，是否同意？措辞转 Lex。
2. Whanganui Journey 要不要加「划船」类别收进来？
3. 14 条新路线没有实景照片，是继续用示意图，还是下一轮去 Commons 逐张找？
4. 规划器 55 段公路用哪种方式核（见 Blocker 1）？

**其他已知问题**

- `plan.html` 一打开就会向 Jev Worker 请求 `/api/capabilities`，这是公开版原有的行为，本版没有改。它不带用户数据，但对方能看到访客 IP。
- 运动板块对原有 53 条路线用的是示意图各点之间的直线做缓冲，长途自驾线会多收或漏收场地。
- DOC 目录的 1,349 个英文名没有中文。
- 页面我在 1440 和 390 两种宽度下看过首页、路线详情、DOC 目录、奥克兰运动页的截图；规划器和其余页面只确认了能打开、无报错、无横向溢出。

## 五、复现

```sh
node scripts/fetch-evidence.mjs      # 重抓官方页面（约 3 分钟）
node scripts/apply-facts.mjs         # 校验原句并写入路线目录
node scripts/import-doc.mjs          # DOC 开放数据（约 3 分钟）
node scripts/fetch-sports.mjs        # OpenStreetMap 运动场地
node scripts/build-site.mjs          # 写入 docs/ 并同步 outputs/site
node scripts/gen-sources.mjs && node scripts/data-status.mjs && node scripts/check-links.mjs
node scripts/serve.mjs               # http://127.0.0.1:4873/
node scripts/screenshots.mjs         # 需要先启动上一行
```

---

# v3.1（2026-11-10，按 JAMES-REVIEW-v3 的 13 条修改）

结论：13 条全部做完并在本地验证。规划器 54 段公路的自驾时间已在 NZTA Journey Planner 逐段查询，原始读数入库，但 NZTA 不显示里程，所以里程仍是估算。规划器 32 条地点提示里 7 条找不到官方原文，标「待核实」。数据仍未全核：79 条路线里 7 项全核 9 条，553 个应核字段已核 253 个。全部只在本地分支 `data-sources-v3`，没有 push，没有部署，没有改 main 和线上网站。

- 依据：`~/Documents/James-Projects/pounamu-review/JAMES-REVIEW-v3.md`。下面 1–13 对应该报告的编号（A1–A4、B5–B8、C9–C13）。
- 截图：`screenshots/v3.1/`，11 个页面 × 1440 和 390 两种宽度，共 22 张，每张都截到页脚（`screenshots/` 在 `.gitignore` 里，和 v3 一样不进提交，只在本机）。
- 复跑：`node scripts/check-wish-tips.mjs --offline && node scripts/build-site.mjs && node scripts/gen-sources.mjs && node scripts/data-status.mjs && node scripts/check-links.mjs && node scripts/check-mobile.mjs && node scripts/screenshots.mjs`；测试 `node tests/p10-jev.test.cjs && node tests/planner-adapter.test.cjs`，两份都通过。

## A. 必须先修

**1. 路线示意图的 DOC PDF 和单一来源。** Hooker Valley 和 Taranaki Falls 两份已 404 的 DOC PDF 换成各自的 DOC 路线页。`scripts/build-site.mjs` 现在每次构建都把 `docs/route-maps.js` 里每条示意图的 `sources` 从 `outputs/route-catalogue.json` 复制过去；示意图里出现目录中没有的路线时构建直接报错。两边从此只有一个来源，不会再不同步。

**2. Metlink 和 KPL 时刻表 PDF。** 280-281-290 的 2024 年 6 月 PDF 换成 https://www.metlink.org.nz/service/280 ，KPL 的固定日期时刻表 PDF 换成 https://www.metlink.org.nz/service/KPL 。全仓库 `rg` 复查：时刻表 PDF 一个不剩。仍有的 PDF 链接都是地图或手册（DOC Fiordland 手册、Milford 公路手册、Great Taste Trail 地图、Wānaka 访客地图、Southern Scenic Route 手册、两份 NZTA 文件），不是时刻表；`scripts/authoring/patch_catalogue_v3.py` 里还留着匹配旧 PDF 的字符串，那是替换脚本自身的匹配规则，不是页面链接。

**3. 手机宽度。** 导航在手机上改成两行三列，「排行程」不再截字；卡片的「查看完整行程」加了不换行、不压缩的保护（复核里说的切字我在 360/375/390 都没复现，仍然加了保护）。新增 `scripts/check-mobile.mjs`：16 个页面 × 360、375、390 三种宽度，检查横向溢出和被裁切的文字。结果：无溢出、无截字。

**4. 季节性封闭。** 新增 `data/closures.json`，每条封闭都带 DOC 原句，构建时原句必须能在当天抓回的 DOC 页面里找到，否则构建失败。目前 3 条：Roys Peak（每年 10/1–11/10 产羔期）、Isthmus Peak（每年 11/20–12/20 产仔期）、Tongariro Northern Circuit（Whakapapa Village 至 Mangatepopo Hut 段，2025 年火灾后封闭至 2027-04-30）。路线页顶部、面包屑下面加了警示条，手机首屏就能看到；按新西兰当天日期判断，封闭期内显示「当前封闭中」（部分路段为「部分路段当前封闭中」）。路线卡片也有封闭标签。这些路线不再显示「DOC Tracks 标为开放」，改为「DOC Tracks 开放数据可能滞后，以 DOC 公告为准」。今天（2026-11-10）Roys Peak 显示「当前封闭中」，见截图。

## B. 乐天定的四件事

**5. 授权。** `CONTENT-LICENSE.md` 和页脚去掉了「草拟、待确认」：自有文字和线路数据按 CC BY 4.0 发布（2026-11-10 站主确认），代码仍是 MIT。页脚的「许可与署名」链接改成站内相对链接 `CONTENT-LICENSE.md`，构建时把根目录那份复制进 `docs/`。

**6. 划船 / Paddling。** 新增第五种出行方式：路线列表筛选按钮、首页出行方式区（桌面五列）、卡片和路线页图标（独木舟图形）、中英文案都已支持。收进 Whanganui Journey（DOC Great Walk，`whanganui-journey`）：7 项字段都用 DOC 页面原句核过，7/7 全核。首页和列表里所有「四种出行方式 / Four ways」改为五种。

**7. 实景照片。** 原来用示意图的 14 条新路线，加上 Whanganui Journey，共 15 条，都在 Wikimedia Commons 找到了拍这条路线本身或其上明确地点的照片。许可逐张用 Commons API 核实（只收 CC0、公有领域、CC BY、CC BY-SA），署名写进 `outputs/IMAGE-CREDITS.md` 的 v3.1 一节，选图理由在 `data/photo-picks-v3.1.json`，脚本 `scripts/fetch-route-photos.mjs`。现在 0 条路线用示意图；以后新路线找不到照片时，仍显示示意图并标「仅为示意图」。

**8. 规划器公路。** 在浏览器里打开 NZTA Journey Planner（journeys.nzta.govt.nz），54 段公路逐段手动查询（2026-11-10，新西兰时间约 18:37–18:46）。全程没有遇到登录、验证码或付费，也没有调用其内部接口，每段都是打开 NZTA 自己的结果页读取。
- **NZTA 不显示里程**，结果页和 Details 页都只有用时（含当时路况）。所以里程仍是规划估算（Te Anau–Milford 的 120 km 来自 DOC 手册）。
- 每段的原始读数（NZTA 路线名、用时、当时路况、读取时间、结果页链接）写进 `docs/p10-planner.js` 的 `EDGE_SOURCES`，也写进 `outputs/PLANNER-ROAD-SOURCES.md`。原始文本行存于 `data/nzta/readings-2026-11-10.txt`，各城镇在 NZTA 搜索框里对应的地点存于 `data/nzta/place-ids-2026-11-10.txt`，转换脚本是 `scripts/authoring/apply-nzta-readings.mjs`。
- 规划用的小时数改为 NZTA 读数取整到 15 分钟，23 段因此变了。例如 National Park–Wellington 4.75 → 3.75，Napier–Wellington 4.25 → 3.75，Hahei–Rotorua 2.5 → 3。旧值保留在 `hoursBefore`。
- 页面上每段自驾都标「估算值（NZTA 查询 2026-11-10）」，鼠标悬停可看原始读数。巴士、火车和渡轮仍标「估算值」。
- 复核说的是 55 段，实际是 56 段：其中 2 段是渡轮（Bluff–Oban、Picton–Wellington），不属于 NZTA 公路，保持估算。

## C. 顺手改

**9. DOC 目录状态。** 只有部分路段关闭的步道统一写「有关闭路段（N/M 段）」，全部关闭的写「关闭（全部 N 段）」。有官方封闭的（Roys Peak 等）以 DOC 公告为准，不再显示开放数据的「开放」。

**10. SH94 原句。** 补全为 PDF 原文 "120 km journey into the heart of Fiordland National Park"。`outputs/route-catalogue.json`（经 `scripts/authoring/make_field_facts.py` 和 `apply-facts.mjs`）和 `data/evidence/milford.json` 都已改。PDF 用 macOS PDFKit 读取。

**11. 旧文案。** 删掉 `docs/app.js` 里已不用的「Twenty-four route guides / 24 份路线手记」和「24 ROUTE GUIDES / FOUR WAYS TO GO」。还在用的「48 ROUTE GUIDES」改为按实际数字显示（`{routes}`），各处「四种 / Four ways」改为五种。

**12. 规划器地点提示。** 32 条提示移到 `data/wish-tips.json`，每条都配官方出处，由新脚本 `scripts/check-wish-tips.mjs` 逐条核对原句，抓取记录存于 `data/wish-tip-evidence.json`，再写回 `P10_WISH_TIPS`。
- **25 条已核**：原句来自 DOC 页面（已存证据）或运营方、地方政府、官方旅游机构页面。页面显示「来源：域名（日期 核）」。
- **7 条标「待核实」**：Rotorua、Dunedin（站点拒绝脚本访问，403）；Stewart Island、Te Anau（试的页面 404）；Kaikōura、Akaroa、Catlins（页面文字里没有对应原句）。
- 核对中改掉的错误：Hobbiton 由「约 2 小时」改为官方的「2.5 HOURS」。去掉了找不到出处的说法，例如 Napier 的 Marine Parade、Hot Water Beach、Tongariro「冬季接驳车通常停运」。测试同步改为检查每条提示「有出处或标待核实」。

**13. 链接检查和截图脚本。** `scripts/check-links.mjs` 新增站内相对链接检查，按 `docs/` 里的文件核对，不去抓取。许可页现在是站内相对链接，不再记成 GitHub 404。本次结果：外部 219 个链接中 200 ×206、403 ×13（站点拒绝脚本，需人工浏览器确认），404 为 0；站内 19 个链接全部存在。截图方面，`scripts/lib/chrome.mjs` 取消了 7000/9000 px 的高度上限，超过 8000 px 的长页分块截取后用 Pillow 拼接（分块文件放系统临时目录，不删除）。`scripts/screenshots.mjs` 改为 v3.1 页面清单，每张都截到页脚，并记录页脚位置和横向溢出。最长的一张是路线列表 390 宽，54,112 px。

## 数字（`node scripts/data-status.mjs`）

| 项目 | v3 | v3.1 |
|---|---|---|
| 精选路线 | 78（北 33、南 45） | 79（北 34、南 45） |
| 7 项全核 | 8 | 9 |
| 已核字段 / 应核字段 | 246 / 546 | 253 / 553 |
| 用示意图的路线 | 14 | 0 |
| 规划器公路有 NZTA 读数 | 0 / 55 | 54 / 54（另 2 段渡轮） |
| 规划器提示有官方出处 | — | 25 / 32（7 条待核实） |
| 外部链接 404 | 1 | 0 |

## 仍需决定 / 已知问题

1. NZTA 的用时是 2026-11-10 傍晚一次查询的实时值（含当时路况），每段只查了一个方向。要更稳，可以以后在不同时段再查一轮取中位数。
2. 里程仍是估算：NZTA Journey Planner 不提供里程。如需核里程，要另找来源（例如 NZTA 的 state highway 位置参考数据或各段官方手册），这一版没做。
3. 7 条「待核实」的地点提示需要人工用浏览器打开官方站点核对，或者删掉。
4. `plan.html` 打开时仍会请求 Jev Worker 的 `/api/capabilities`（公开版原有行为，未改）。
