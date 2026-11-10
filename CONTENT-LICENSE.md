# Content and data licences / 内容与数据许可

> 中文摘要：MIT 只管本项目自己写的代码。本站自己写的文字、路线数据和自绘图按 CC BY 4.0 发布。来自 DOC、LINZ、OpenStreetMap、Wikimedia Commons 等第三方的数据和素材，一律按它们原来的许可使用，下面逐项写明数据集名称、来源、许可链接和我们做了哪些改动。站主已于 2026-11-10 确认：自有文字和线路数据按 CC BY 4.0 发布，代码仍是 MIT。

Status: in force. On 2026-11-10 the site owner approved publishing our own text and route data under CC BY 4.0; code stays under MIT.

## 1. What each licence covers

| Material | Where | Licence |
|---|---|---|
| Code written for this project (JavaScript, CSS, HTML templates, scripts, worker) | `docs/*.js`, `docs/*.css`, `docs/*.html`, `scripts/`, `worker/`, `tests/` | [MIT](LICENSE) |
| Our own writing: route summaries, stage notes, tips, Chinese and English editorial text | `outputs/route-catalogue.json` (editorial fields), page text in `docs/app.js` and `docs/v3.js`, the `.md` documents | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credit “Pounamu Atlas / 绿石之地” |
| Our own compilation of route facts and their source records | `outputs/route-catalogue.json` (`fieldSources`, `verify`), `data/field-facts.json` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Short quotations from official pages are kept only as evidence for checking and remain the property of their publishers |
| Our own drawings: route sketches, decorative terrain strokes, placeholder illustrations | `docs/route-maps.js` (sketch geometry), `docs/assets/route-placeholder.svg`, `docs/assets/sports/placeholder-*.svg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| AI-generated opening image and paper texture | `docs/assets/optimized/hero-ai-alpine-v1.webp`, `mineral-paper-texture-v1.webp` | See `outputs/AI-ART-DIRECTION.md`. Labelled as AI-generated on the site |
| Fonts | `docs/assets/fonts/` | SIL Open Font License, `docs/assets/fonts/OFL.txt` |

MIT does **not** apply to text, data, photographs, map data or fonts.

## 2. Third-party data: used under the original licence

### Department of Conservation Te Papa Atawhai (DOC)

- Datasets: **DOC Walking and Tramping Experiences – locations** and **– routes** (https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-locations4 , https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-routes4 ); **DOC Tracks** (https://catalogue.data.govt.nz/dataset/doc-tracks8 ). Service: https://doc-deptconservation.opendata.arcgis.com/
- Also: facts read from DOC web pages (distances, times, track categories, season dates, booking rules), each linked from the route page. DOC website content is published under CC BY 4.0 except third-party copyright material: https://www.doc.govt.nz/footer-links/copyright/
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Attribution: “Sourced from the Department of Conservation Te Papa Atawhai and licensed for reuse under CC BY 4.0.”
- Our changes: regrouped by region and time band; track lines simplified and redrawn; DOC Tracks segments matched to walks by location; facts restated in our own words and translated into Chinese. DOC photographs and thumbnails are **not** used.
- Files: `data/doc-tracks.json`, `docs/data/doc-tracks.json`, `docs/data/v3-route-data.js`, `data/route-lines.json`.

### Toitū Te Whenua Land Information New Zealand (LINZ)

- Datasets: **NZ Coastlines and Islands Polygons (Topo 1:50k)** https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/ ; **NZ Lake Polygons (Topo 1:50k)** https://data.linz.govt.nz/layer/50293-nz-lake-polygons-topo-150k/ ; **NZ River Name Lines (Pilot)** https://data.linz.govt.nz/layer/103632-nz-river-name-lines-pilot/ ; **NZ River Name Polygons (Pilot)** https://data.linz.govt.nz/layer/103631-nz-river-name-polygons-pilot/ ; **NZ Place Names (NZGB)** https://data.linz.govt.nz/layer/51681-nz-place-names-nzgb/ ; **New Zealand Gazetteer** https://gazetteer.linz.govt.nz/
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Attribution, in LINZ's wording for adapted data (https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data ): “Contains data sourced from the LINZ Data Service licensed for reuse under CC BY 4.0.”
- Our changes: reprojected, filtered, simplified, clipped and restyled. Detail in `outputs/MAP-SOURCES.md` and `MAP-GEOGRAPHY-SOURCES.md`.
- The licence of the Gazetteer download was not read on the Gazetteer site itself (review item 8); LINZ states almost all its data is CC BY 4.0. To verify on the Gazetteer site.

### OpenStreetMap

- Data: sports venues and city centre points, read through the Overpass API. Files: `data/sports/osm-nz-sports.json`, `docs/data/sports/*.json`.
- Licence: [Open Database Licence (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/). These files are a derived extract and remain under ODbL.
- Attribution: “© OpenStreetMap contributors”, https://www.openstreetmap.org/copyright
- Open question (third-party terms, not our own licence): whether ODbL share-alike reaches any other part of the site. The venue files are kept separate from the route catalogue.

### Natural Earth

- 1:50m and 1:10m country and coastline data, public domain: https://www.naturalearthdata.com/about/terms-of-use/

### Photographs (Wikimedia Commons)

- Each photograph keeps its own licence (CC BY, CC BY-SA, CC0 or public domain). Author, title, source, licence and changes are listed one by one in `outputs/IMAGE-CREDITS.md` and, for sports venues, `outputs/SPORTS-IMAGE-CREDITS.md`.
- Adapted versions of CC BY-SA photographs (resized, compressed, cropped) stay under the same CC BY-SA licence.

## 3. Sources we link to but do not copy

Ngā Haerenga NZ Cycle Trails, NZTA, newzealand.com, MetService, Mountain Safety Council, transport operators, councils and regional tourism sites: we state individual facts in our own words with a link and, for checking, keep a short quotation in `data/evidence/`. newzealand.com is © Tourism New Zealand under its terms of use (checked 2026-11-11): no copying or adapting of its text, images or trade marks without written permission, so we only link and restate facts. The other sites' licences were not confirmed (review section 8). AllTrails, Tramper and similar third-party sites are not used as sources and no content is copied from them.

## 4. If you reuse this site's content

Credit “Pounamu Atlas / 绿石之地” with a link, keep the third-party attributions above for any DOC, LINZ or OpenStreetMap data you take with it, and do not present unverified facts (marked “To verify / 待核实”) as checked.

## 5. v4 places, route legs and maps (field by field)

Our own arrangement of the place and route tables, and the Chinese names we publish, stay under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). That licence does **not** cover the fields below.

| Field | Where | Licence |
|---|---|---|
| Coordinates whose notes say they come from OSM Nominatim, including town-centre approximations based on those coordinates | `inputs/atlas/places-v2.csv`, `docs/data/v4-catalog.json` | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). Not this site's CC BY 4.0 |
| Driving times and kilometres whose cell is marked OSRM | `inputs/meridian/routes-v2.csv` | OSRM is built on OpenStreetMap, so those readings stay under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). They are not an official NZTA or operator figure, and they are not a value checked by this site. Not CC BY 4.0 |
| DOC track rows and summaries written from DOC open-data fields | `docs/data/doc-tracks.json`, DOC-sourced place rows | DOC data: “Sourced from the Department of Conservation Te Papa Atawhai and licensed for reuse under CC BY 4.0.” |
| Day order referenced from newzealand.com | route template notes and `source_url` on each day | **Not licensed to us and not covered by our CC BY 4.0.** newzealand.com content is © Tourism New Zealand, all rights reserved ([terms of use](https://www.newzealand.com/int/utilities/terms-of-use/), last updated 14 August 2025). We use only facts — towns in day order, published drive times and road numbers — with a link and access date. No wording, photographs, logos or trade marks are copied. Shown on the site as “参考：newzealand.com 公开行程”. Example: [South Island alpine lakes](https://www.newzealand.com/int/feature/south-island-alpine-lakes-itinerary/), accessed 2026-11-11. |
| Wikimedia photographs | unchanged | Per-image credit in `outputs/IMAGE-CREDITS.md` and `outputs/SPORTS-IMAGE-CREDITS.md` |

Pages and maps that use OSM coordinates or OSRM times show “© OpenStreetMap contributors” and link to https://www.openstreetmap.org/copyright.

