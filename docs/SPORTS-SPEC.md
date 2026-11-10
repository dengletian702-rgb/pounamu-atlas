# 运动板块规格 / Sports section spec (v1)

> 中文摘要：城市页和路线页显示附近的网球场、高尔夫球场和篮球场。数据只来自 OpenStreetMap，用脚本预先抓成静态 JSON，浏览时不向任何第三方发请求；不接 Google Maps，不要账号，不收集用户数据，不放广告。照片只用 Wikimedia Commons 上可授权的，找不到就用统一的示意图。

Status: written before implementation, 2026-11-10. Owner: site lead (CC). Reviewers: James, Vector.

## 1. Scope

- Three venue types: tennis courts, golf courses, basketball courts.
- Two places they appear:
  - City page (`city.html?id=<city>`): venues within a radius of the city centre, nearest first; venues tagged `access=private` are listed after the rest.
  - Route page (`route.html?id=<route>`): venues inside a buffer along the route line.
- A filter by sport on both.
- First release covers 16 cities across both islands. Required: Auckland, Wellington, Christchurch, Queenstown, Dunedin, Rotorua, Taupō, Nelson. Added: Hamilton, Tauranga, Napier, New Plymouth, Palmerston North, Whangārei (North); Invercargill, Wānaka (South).

Out of scope for v1: opening hours, prices, booking, live availability, reviews, other sports.

## 2. Data source and licence

- Source: OpenStreetMap, read through the Overpass API by `scripts/fetch-sports.mjs`.
- Licence: Open Database Licence (ODbL) 1.0. Every page that shows venues prints “© OpenStreetMap contributors” with links to https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/ .
- The stored JSON files are a derived extract of OpenStreetMap and stay under ODbL (see `CONTENT-LICENSE.md`). Whether the share-alike terms reach anything else on the site is a legal question for Lex.
- No Google Maps, no Google Places, no commercial venue directory. AllTrails, Tramper and similar sites are not used.

### Overpass selection

Inside the New Zealand country area (`ISO3166-1=NZ`):

| Type | OSM tags |
|---|---|
| Tennis | `leisure=pitch` with `sport` containing `tennis`; `leisure=sports_centre` or `club=sport` with `sport` containing `tennis` (used for the venue name) |
| Basketball | `leisure=pitch` with `sport` containing `basketball`; `leisure=sports_centre` with `sport` containing `basketball` |
| Golf | `leisure=golf_course` |

Not selected: `golf=driving_range`, miniature golf, disused or proposed features (`disused:*`, `proposed:*`, `abandoned:*`).

City centre points come from OpenStreetMap place nodes (`place=city|town` with the city name), fetched by the same script. No coordinate is taken from Google Maps or mapcarta.

## 3. Processing

1. One national Overpass request, `out center tags`, saved to `data/sports/osm-nz-sports.json` with the fetch time.
2. Court polygons are grouped into venues: courts of the same sport whose centres are within 120 m of each other form one venue. The number of grouped court polygons becomes `courts` (shown as “N courts mapped”). A `leisure=sports_centre` or club with the same sport within 150 m supplies the name when the courts have none.
3. Fields kept per venue: OSM type and id, sport, name, coordinates, `addr:*` if present, `access`, `lit`, `surface`, `operator`, `golf:course` / `holes`, `website` is **not** shown in v1 (no outbound commercial links).
4. If a venue has no `addr:*` tags, the card shows its coordinates. No address is guessed.
5. Distances are great-circle distances from the city centre node, or from the nearest point of the route line.
6. Route line: the route sketch points in `docs/route-maps.js` for the original guides (hand-placed, approximate), or the DOC track line for guides added in v3. The page says which. Buffers: walking 2 km, cycling 3 km, driving and public transport 5 km.
7. City radius: 10 km for Auckland, Wellington and Christchurch; 8 km for the others.

## 4. Photos

- A photo is used only when the OSM feature itself points to one: a `wikimedia_commons=File:…` tag, or a `wikidata` item with an image (P18). The script then asks the Wikimedia Commons API for the author, licence and file page.
- Accepted licences: CC0, public domain, CC BY, CC BY-SA. Anything else is skipped.
- Each used photo is downloaded once at 640 px to `docs/assets/sports/` and listed in `outputs/SPORTS-IMAGE-CREDITS.md` with title, author, licence, licence link and file page. The card prints the author and licence.
- No photo found: the card shows one of three plain illustrations (`placeholder-tennis.svg`, `placeholder-golf.svg`, `placeholder-basketball.svg`) and says “Illustration only”. AI-generated images are never presented as a real venue.

## 5. Card

Shown only when OpenStreetMap has the value:

- Name (or “Unnamed in OpenStreetMap”)
- Type
- Address, else coordinates
- Public or not (`access`)
- Lighting (`lit`)
- Number of courts mapped, or holes for golf
- Surface
- Distance from the city centre or from the route
- Link to the OpenStreetMap object
- Photo credit, or the “Illustration only” line

## 6. Files

| File | Content |
|---|---|
| `scripts/fetch-sports.mjs` | Fetch, group, measure, write. `--offline` rebuilds from the saved national file |
| `data/sports/osm-nz-sports.json` | National extract as fetched |
| `docs/data/sports/index.json` | Cities, counts, fetch time |
| `docs/data/sports/<city>.json` | Venues for one city |
| `docs/data/sports/routes.json` | Venues near each route |
| `docs/assets/sports/` | Placeholders and any Commons photos |
| `outputs/SPORTS-IMAGE-CREDITS.md` | Photo credits |

## 7. Updating

- Run `node scripts/fetch-sports.mjs` then `node scripts/build-site.mjs`. Suggested: every three months, and before any public launch.
- The browser never calls Overpass or OpenStreetMap. The fetch date is printed under every list.

## 8. Privacy

No account, no cookies for this section, no analytics, no adverts, no location request. Filtering happens in the page.

## 9. Known limits

- OpenStreetMap coverage is uneven: many courts have no name, address, access or lighting tags. Missing values are left out, not guessed.
- “Public” reflects the `access` tag only. School courts are often mapped without it.
- Route buffers for the original guides follow straight lines between approximate sketch points, so the list can include or miss venues near the real road or track.
- Court counts are the number of mapped polygons, which can differ from reality.
