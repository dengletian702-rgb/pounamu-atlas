# 绿石之地 · Pounamu Atlas

> **中文摘要（v3.1，2026-11-10，本地分支 `data-sources-v3`，尚未上线）**
>
> - 这是一个中英双语的新西兰旅行线路指南：不要账号，不收集用户数据，不放广告。
> - 精选路线 79 条（北岛 34、南岛 45），五种出行方式：徒步、骑行、自驾、公共交通、划船（v3.1 新增 Whanganui Journey）。每条核 7 项事实：时长、距离、难度、季节与封闭、预订、交通、安全提示。已核的事实带来源链接、核查日期和官方原句；没核的在页面上显示「待核实 / To verify」。
> - **数据还没有全核**：7 项全核的有 9 条，553 个应核字段里已核 253 个，缺口 300 个。规划器 56 段里 54 段公路的自驾时间已于 2026-11-10 在 NZTA Journey Planner 逐段查询并记下原始读数，页面仍标「估算值（NZTA 查询 2026-11-10）」；NZTA 不显示里程，里程仍是估算；另 2 段是渡轮。逐条缺口和计数方法见 [数据状态](outputs/DATA-STATUS.md)，公路读数见 [规划器公路来源](outputs/PLANNER-ROAD-SOURCES.md)。
> - DOC 步道目录 1,349 条（DOC 开放数据，CC BY 4.0），用时为数据集原值、距离为空，都标「待核实」；开闭状态以 DOC 实时公告为准。
> - 运动板块：16 座城市和各条路线附近的网球场、高尔夫球场、篮球场，数据来自 OpenStreetMap（© OpenStreetMap contributors，ODbL），预先抓成静态文件。
> - 季节性封闭（Roys Peak、Isthmus Peak、Tongariro Northern Circuit 部分路段）按 DOC 原句显示在路线页顶部，按新西兰当天日期判断是否「当前封闭中」。规划器 32 条地点提示里 25 条附官方出处，7 条标「待核实」。
> - 本地运行：`node scripts/serve.mjs`，打开 http://127.0.0.1:4873/ 。
> - 这一版改了什么：[CHANGES-v3.md](CHANGES-v3.md)。许可与署名：[CONTENT-LICENSE.md](CONTENT-LICENSE.md)（自有文字与线路数据 CC BY 4.0，代码 MIT）。

新西兰旅行线路与行程指南，提供中英文浏览、路线攻略和本机行程规划。A bilingual New Zealand travel guide and local itinerary planner.

## 在线浏览 / Live website

[打开绿石之地](https://dengletian702-rgb.github.io/pounamu-atlas/)：无需安装，支持线路浏览和本地行程规划。Jev Worker 已部署并接入网站；访客选择 Jev 并勾选同意后，才会发送岛屿、天数和活动方式。重新部署说明见 [Worker 指南](worker/README.md)。

## 本地运行 / Run locally

需要 Node.js 20 或更新版本，无须安装依赖。Requires Node.js 20 or newer; no package installation is needed.

```sh
node scripts/serve.mjs        # 静态预览，http://127.0.0.1:4873/ ，不需要任何密钥
node outputs/jev-server.js    # 带 Jev 代理的预览，端口随机，需要服务端环境变量
```

打开终端打印的本机地址。默认规划使用本地规则、不需要账号。Jev 推荐是可选功能，线上已接入 Worker；访客勾选同意后才会发送岛屿、天数和活动方式。密钥只放在服务端 secret 中，不要提交到仓库。The optional Jev service requires a server-side environment variable; never commit credentials.

## 使用与数据 / Usage and data

行程时间与距离使用项目内置道路数据，地图连线是示意，不能用于导航。出发前请查看 NZTA 路况和各线路链接的官方信息。Map connections are schematic and travel times come from the bundled data; check official information before travelling.

首页开场图片是 AI 生成的南阿尔卑斯意境图，并非特定地点的实景。网站包含实拍照片，各自的作者、来源、许可和改动说明见 [图片署名](outputs/IMAGE-CREDITS.md)。地图数据来源见 [地图来源](outputs/MAP-SOURCES.md)，路线资料见 [线路来源](outputs/ROUTE-SOURCES.md)。字体许可在 [OFL.txt](outputs/site/assets/fonts/OFL.txt)。

## 中文地名对照

页面显示用这一张别名表，不改 CSV 原文件：

| 页面统一用 | 同时覆盖这些写法 |
|---|---|
| 特卡波 | 特卡波湖、蒂卡普湖、蒂卡普 |
| 但尼丁 | 达尼丁 |
| 罗托鲁瓦 | 罗托鲁阿 |
| 内皮尔 | 纳皮尔（依据 [newzealand.com/cn/napier](https://www.newzealand.com/cn/napier/) 的官方中文名） |

怀塔基区的 Ōamaru 及同区条目归在「但尼丁」地区下，城镇旁注明「怀塔基区 / Waitaki District」。

## 本地地图配置

公开页面不加载地图密钥。若要在本机试 Google 地图，把 `docs/local-config.example.js` 复制为 `docs/local-config.js`（该文件已被忽略，不会入库），在里面设置 `POUNAMU_GOOGLE_MAPS_KEY`，并只在你自己的浏览器里于 `v4-maps.js` 之前加入 `<script src="local-config.js"></script>`。线上站点不注入这个值；没有密钥时使用示意图。

## 许可 / Licence

本项目自有代码以 [MIT License](LICENSE) 发布；文字、数据和第三方素材的许可见 [CONTENT-LICENSE.md](CONTENT-LICENSE.md)。第三方照片、地图数据和字体不适用 MIT：它们按各自的许可和署名要求使用，详见上述文件。The MIT licence applies to project-owned code only; third-party photographs, map data and fonts retain their own licences and attribution requirements.

## 已知限制 / Known limitations

缺少完整道路与湖泊轮廓数据和可靠海拔剖面；规划地图是连接地点的示意。部分图片仍偏阴；尚未完成所有照片叠字和动态状态的完整 WCAG AA 审计。The map is schematic, detailed road/lake shapes and elevation profiles are not included, and a full accessibility audit remains outstanding.

修改数据、JavaScript 或 CSS 后，运行 `node scripts/build-site.mjs`（它会把路线目录写入网站、同步两份副本并更新资源版本），再用 `node scripts/version-assets.mjs --check` 检查。
