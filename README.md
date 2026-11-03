# 绿石之地 · Pounamu Atlas

新西兰旅行线路与行程指南，提供中英文浏览、路线攻略和本机行程规划。A bilingual New Zealand travel guide and local itinerary planner.

## 本地运行 / Run locally

需要 Node.js 20 或更新版本，无须安装依赖。Requires Node.js 20 or newer; no package installation is needed.

```sh
node outputs/jev-server.js
```

打开终端打印的本机地址。默认规划使用本地规则、不需要账号。Jev 推荐是可选功能，仅在访客明确选择并同意后使用；该服务需要在服务端环境中配置 `TYPESAFE_API_KEY`，不要把密钥写进网页或提交到仓库。The optional Jev service requires a server-side environment variable; never commit credentials.

## 使用与数据 / Usage and data

行程时间与距离使用项目内置道路数据，地图连线是示意，不能用于导航。出发前请查看 NZTA 路况和各线路链接的官方信息。Map connections are schematic and travel times come from the bundled data; check official information before travelling.

首页开场图片是 AI 生成的南阿尔卑斯意境图，并非特定地点的实景。网站包含实拍照片，各自的作者、来源、许可和改动说明见 [图片署名](outputs/IMAGE-CREDITS.md)。地图数据来源见 [地图来源](outputs/MAP-SOURCES.md)，路线资料见 [线路来源](outputs/ROUTE-SOURCES.md)。字体许可在 [OFL.txt](outputs/site/assets/fonts/OFL.txt)。

## 许可 / Licence

本项目自有代码以 [MIT License](LICENSE) 发布。第三方照片、地图数据和字体不适用 MIT：它们按各自的许可和署名要求使用，详见上述文件。The MIT licence applies to project-owned code only; third-party photographs, map data and fonts retain their own licences and attribution requirements.

## 已知限制 / Known limitations

缺少完整道路与湖泊轮廓数据和可靠海拔剖面；规划地图是连接地点的示意。部分图片仍偏阴；尚未完成所有照片叠字和动态状态的完整 WCAG AA 审计。The map is schematic, detailed road/lake shapes and elevation profiles are not included, and a full accessibility audit remains outstanding.
