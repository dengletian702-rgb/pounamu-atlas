# Map sources · 地图来源

> 中文摘要：海岸线来自新西兰土地信息局 LINZ（CC BY 4.0），斯图尔特岛部分来自 Natural Earth（公有领域）。线路走向是手工标注的近似位置，只用于示意，不能用来导航。

- **Coastline:** LINZ NZ Coastlines and Islands Polygons (Topo 1:50k), CC BY 4.0 — "Contains data sourced from the LINZ Data Service". Simplified by `scripts/build-coast.mjs` into `public/data/coast.js`.
- **Stewart Island / Rakiura:** Natural Earth 1:10m (public domain) where not in the LINZ file.
- **Route lines:** hand-placed approximate coordinates in `public/data/routes*.js`, for the illustrated map only — not for navigation. Each route links to its official page (see ROUTE-SOURCES-v3.md).
- **Place pins:** approximate, from each place's official site (`public/data/places.js`).
- **Projection:** a simple equirectangular fit to the page (`public/js/map.js`, `project()`); distances on the map are not to scale.
- The credit line is shown under every map on the site.
